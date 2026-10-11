"""吉方位・干支のブラウザ動作確認（Playwright / Chromium）

使い方（リポジトリのルートで）:
    python3 tests/e2e/kippoui_test.py            # 結果だけ表示
    python3 tests/e2e/kippoui_test.py --shots DIR # スクリーンショットも保存
"""
import asyncio
import functools
import http.server
import os
import socketserver
import sys
import threading

from playwright.async_api import async_playwright

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
SHOTS = sys.argv[sys.argv.index("--shots") + 1] if "--shots" in sys.argv else None
ORDER = []
results = []


def check(name, ok, detail=""):
    results.append((name, bool(ok)))
    print(("  OK  " if ok else "  NG  ") + name + (f"  [{detail}]" if detail and not ok else ""))


def serve():
    class Q(http.server.SimpleHTTPRequestHandler):
        def log_message(self, *a):
            pass
    httpd = socketserver.TCPServer(("127.0.0.1", 0), functools.partial(Q, directory=ROOT))
    threading.Thread(target=httpd.serve_forever, daemon=True).start()
    return httpd, f"http://127.0.0.1:{httpd.server_address[1]}/"


async def run(browser, base, label, viewport, mobile):
    print(f"== {label}")
    ctx = await browser.new_context(viewport=viewport, is_mobile=mobile, has_touch=mobile)
    page = await ctx.new_page()
    errors = []
    page.on("console", lambda m: m.type == "error" and errors.append(m.text))
    page.on("pageerror", lambda e: errors.append(str(e)))
    await page.goto(base + "kippoui/")
    await page.evaluate("() => localStorage.clear()")
    await page.reload()
    years = (await page.get_attribute("#kippoui-form", "data-years")).split(",")
    await page.fill("#bd-self-year", "1990")
    await page.select_option("#bd-self-month", "5")
    await page.select_option("#bd-self-day", "15")
    await page.click("#kippoui-form button[type=submit]")
    await page.wait_for_selector("#kippoui-result:not([hidden])")
    text = await page.inner_text("#kippoui-result")
    check("本命星・月命星（1990/5/15 → 一白・五黄）", "本命星 一白水星・月命星 五黄土星" in text, text[:120])
    check("2年分の年盤", all(f"{y}年の吉方位" in text for y in years), years)
    cells = await page.eval_on_selector_all("#kp-y2026 .kp-cell", "es => es.map(e => e.innerText.replace(/\\s+/g, ' '))") if "2026" in years else []
    if cells:
        check("2026年 一白×五黄：南西＝最大吉方・北東＝吉方位", any(c.startswith("南西") and "最大吉方" in c for c in cells) and any(c.startswith("北東") and "吉方位" in c for c in cells), cells)
        check("2026年 南＝五黄殺・月命殺", any(c.startswith("南 ") and "五黄殺" in c and "月命殺" in c for c in cells), cells)
    if SHOTS:
        await page.screenshot(path=os.path.join(SHOTS, f"kippoui-{label}.png"), full_page=True)
    overflow = await page.evaluate("() => document.documentElement.scrollWidth - window.innerWidth")
    check("横スクロールなし（吉方位）", overflow <= 0, overflow)

    await page.goto(base + f"kippoui/{years[0]}/1/")
    check("本命星ページ", "月命星別の最大吉方" in await page.inner_text("main"))
    overflow = await page.evaluate("() => document.documentElement.scrollWidth - window.innerWidth")
    check("横スクロールなし（本命星ページ）", overflow <= 0, overflow)

    await page.goto(base + "eto/")
    await page.select_option("#eto-year", "1990")
    await page.click("#eto-form button[type=submit]")
    t = await page.inner_text("#eto-result")
    check("干支：1990 → 庚午", "庚午" in t and "午年生まれ" in t, t)
    overflow = await page.evaluate("() => document.documentElement.scrollWidth - window.innerWidth")
    check("横スクロールなし（干支）", overflow <= 0, overflow)
    if SHOTS:
        await page.screenshot(path=os.path.join(SHOTS, f"eto-{label}.png"), full_page=False)
    check("コンソールエラーなし", not errors, errors)
    await ctx.close()


async def main():
    httpd, base = serve()
    async with async_playwright() as p:
        browser = await p.chromium.launch()
        await run(browser, base, "desktop", {"width": 1280, "height": 900}, False)
        await run(browser, base, "mobile", {"width": 375, "height": 740}, True)
        await browser.close()
    httpd.shutdown()
    ng = [n for n, ok in results if not ok]
    print(f"\n{len(results) - len(ng)}/{len(results)} OK")
    sys.exit(1 if ng else 0)


asyncio.run(main())
