"""インド占星術のブラウザ動作確認（Playwright / Chromium）

使い方（リポジトリのルートで）:
    python3 tests/e2e/jyotish_test.py            # 結果だけ表示
    python3 tests/e2e/jyotish_test.py --shots DIR # スクリーンショットも保存
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
ORDER = ["あなたの9つの星", "月の星座：", "ナクシャトラ：", "いまのあなたの時期（ダシャー）", "次にできること"]
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


async def fill(page, y, m, d, hour="", minute=""):
    await page.fill("#bd-self-year", y)
    await page.select_option("#bd-self-month", m)
    await page.select_option("#bd-self-day", d)
    await page.select_option("#kt-self-hour", hour)
    await page.select_option("#kt-self-minute", minute)
    await page.click("#jyo-form button[type=submit]")
    await page.wait_for_selector("#jyo-result:not([hidden])")


async def run(browser, base, label, viewport, mobile):
    print(f"== {label}")
    ctx = await browser.new_context(viewport=viewport, is_mobile=mobile, has_touch=mobile)
    await ctx.route("https://pagead2.googlesyndication.com/**", lambda r: r.fulfill(status=200, content_type="application/javascript", body=""))  # 広告は読み込まない
    page = await ctx.new_page()
    errors = []
    page.on("console", lambda m: m.type == "error" and errors.append(m.text))
    page.on("pageerror", lambda e: errors.append(str(e)))
    await page.goto(base + "jyotish/")
    await page.evaluate("() => localStorage.clear()")
    await page.reload()
    await fill(page, "1990", "1", "1", "6", "30")
    text = await page.inner_text("#jyo-result")
    pos = [text.find(s) for s in ORDER]
    check("見出しの順番", all(p >= 0 for p in pos) and pos == sorted(pos), pos)
    rows = await page.locator(".horo-table tbody tr").count()
    check("9つの星", rows == 9, rows)
    check("ダシャーの表示", "マハーダシャー" in text and "アンタルダシャー" in text)
    check("宿曜との対応", "宿曜の二十七宿では" in text)
    overflow = await page.evaluate("() => document.documentElement.scrollWidth - window.innerWidth")
    check("横スクロールなし", overflow <= 0, overflow)
    if SHOTS:
        await page.screenshot(path=os.path.join(SHOTS, f"jyotish-{label}.png"), full_page=True)
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
