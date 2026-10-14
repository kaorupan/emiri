"""紫微斗数（個人・相性）のブラウザ動作確認（Playwright / Chromium）

使い方（リポジトリのルートで）:
    python3 tests/e2e/shibi_test.py            # 結果だけ表示
    python3 tests/e2e/shibi_test.py --shots DIR # スクリーンショットも保存
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
ORDER = ["あなたの命盤", "命宮：", "五行局と身宮", "恋愛・お金・仕事", "四化（生まれ年の星の変化）", "次にできること"]
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
    await page.click("#shibi-form button[type=submit]")
    await page.wait_for_selector("#shibi-result:not([hidden])")


async def run(browser, base, label, viewport, mobile):
    print(f"== {label}")
    ctx = await browser.new_context(viewport=viewport, is_mobile=mobile, has_touch=mobile)
    await ctx.route("https://pagead2.googlesyndication.com/**", lambda r: r.fulfill(status=200, content_type="application/javascript", body=""))  # 広告は読み込まない
    page = await ctx.new_page()
    errors = []
    page.on("console", lambda m: m.type == "error" and errors.append(m.text))
    page.on("pageerror", lambda e: errors.append(str(e)))
    await page.goto(base + "shibi/")
    await page.evaluate("() => localStorage.clear()")
    await page.reload()

    # 時刻なしは止める
    await page.fill("#bd-self-year", "1990")
    await page.select_option("#bd-self-month", "1")
    await page.select_option("#bd-self-day", "1")
    await page.click("#shibi-form button[type=submit]")
    check("時刻なしはお知らせを出して止める", await page.is_visible("#shibi-time-required") and await page.is_hidden("#shibi-result"))

    await fill(page, "1990", "1", "1", "6", "30")
    text = await page.inner_text("#shibi-result")
    pos = [text.find(s) for s in ORDER]
    check("見出しの順番", all(p >= 0 for p in pos) and pos == sorted(pos), pos)
    check("命盤12宮", await page.locator(".shibi-cell").count() == 12)
    check("命宮 太陽・火六局", "命宮：太陽" in text and "火六局" in text)
    check("四化", "化禄：武曲星" in text and "化忌：文曲星" in text)
    overflow = await page.evaluate("() => document.documentElement.scrollWidth - window.innerWidth")
    check("横スクロールなし", overflow <= 0, overflow)
    if SHOTS:
        await page.screenshot(path=os.path.join(SHOTS, f"shibi-{label}.png"), full_page=True)

    # 相性
    await page.goto(base + "shibi/aisho/")
    for who, (y, m, d) in (("self", ("1990", "1", "1")), ("partner", ("1992", "5", "15"))):
        await page.fill(f"#bd-{who}-year", y)
        await page.select_option(f"#bd-{who}-month", m)
        await page.select_option(f"#bd-{who}-day", d)
    await page.click("#shibi-aisho-form button[type=submit]")
    await page.wait_for_selector("#shibi-aisho-result:not([hidden])")
    check("相性：時刻なしのお知らせ", "ふたりとも生まれた時刻が必要" in await page.inner_text("#shibi-aisho-result"))
    for who, hh in (("self", "6"), ("partner", "14")):
        await page.evaluate(f"() => document.querySelector('#kt-{who}').open = true")
        await page.select_option(f"#kt-{who}-hour", hh)
        await page.select_option(f"#kt-{who}-minute", "30")
    await page.click("#shibi-aisho-form button[type=submit]")
    text = await page.inner_text("#shibi-aisho-result")
    order = ["あなたの命宮", "お相手の命宮", "ふたりの命盤の縁", "ふたりの四化", "ふたりの相性を、もっとくわしく"]
    pos = [text.find(s) for s in order]
    check("相性：見出しの順番", all(p >= 0 for p in pos) and pos == sorted(pos), pos)
    check("相性：化禄の飛び先", "お相手の化禄" in text and "あなたの化禄" in text)
    overflow = await page.evaluate("() => document.documentElement.scrollWidth - window.innerWidth")
    check("相性：横スクロールなし", overflow <= 0, overflow)
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
