import re
"""マヤ暦のブラウザ動作確認（Playwright / Chromium）

使い方（リポジトリのルートで）:
    python3 tests/e2e/maya_test.py            # 結果だけ表示
    python3 tests/e2e/maya_test.py --shots DIR # スクリーンショットも保存
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
ORDER = ["あなたのKIN", "太陽の紋章：", "銀河の音：", "ウェイブスペル：", "あなたと縁の深い4つのKIN", "これから3年の年回り", "次にできること"]
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


async def fill(page, y, m, d):
    await page.fill("#bd-self-year", y)
    await page.select_option("#bd-self-month", m)
    await page.select_option("#bd-self-day", d)
    await page.click("#maya-form button[type=submit]")
    await page.wait_for_selector("#maya-result:not([hidden])")


async def run(browser, base, label, viewport, mobile):
    print(f"== {label}")
    ctx = await browser.new_context(viewport=viewport, is_mobile=mobile, has_touch=mobile)
    await ctx.route("https://pagead2.googlesyndication.com/**", lambda r: r.fulfill(status=200, content_type="application/javascript", body=""))  # 広告は読み込まない
    await ctx.route("https://www.googletagmanager.com/**", lambda r: r.fulfill(status=200, content_type="application/javascript", body=""))  # アクセス解析も読み込まない
    await ctx.route(re.compile(r"^https://[^/]*a8\.net/"), lambda r: r.fulfill(status=200, content_type="image/gif", body=b"GIF89a\x01\x00\x01\x00\x80\x00\x00\x00\x00\x00\xff\xff\xff!\xf9\x04\x01\x00\x00\x00\x00,\x00\x00\x00\x00\x01\x00\x01\x00\x00\x02\x02D\x01\x00;"))  # アフィリエイトの画像も読み込まない
    page = await ctx.new_page()
    errors = []
    page.on("console", lambda m: m.type == "error" and errors.append(m.text))
    page.on("pageerror", lambda e: errors.append(str(e)))
    await page.goto(base + "maya/")
    await page.evaluate("() => localStorage.clear()")
    await page.reload()

    await fill(page, "1990", "1", "1")
    text = await page.inner_text("#maya-result")
    pos = [text.find(s) for s in ORDER]
    check("見出しの順番", all(p >= 0 for p in pos) and pos == sorted(pos), pos)
    num = await page.inner_text(".maya-kin-num")
    check("1990/1/1 → KIN143", num.replace("KIN", "").strip() == "143", num)
    check("紋章・音・WS", "太陽の紋章：青い夜" in text and "銀河の音：13" in text and "ウェイブスペル：青い猿" in text)
    check("ガイドKIN 247", "KIN247" in text)
    check("神秘KIN 118", "KIN118" in text)
    check("黒KINでない", "あなたは黒KINです" not in text)
    if SHOTS:
        await page.screenshot(path=os.path.join(SHOTS, f"maya-{label}.png"), full_page=True)

    await fill(page, "1951", "8", "17")
    text = await page.inner_text("#maya-result")
    check("1951/8/17 → KIN176 黒KIN", "176" in await page.inner_text(".maya-kin-num") and "あなたは黒KINです" in text)

    await fill(page, "2024", "2", "29")
    text = await page.inner_text("#maya-result")
    check("2月29日の案内", "フナブ・ク" in text and "KIN131" in text and "KIN132" in text)

    overflow = await page.evaluate("() => document.documentElement.scrollWidth - window.innerWidth")
    check("横スクロールなし", overflow <= 0, overflow)
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
