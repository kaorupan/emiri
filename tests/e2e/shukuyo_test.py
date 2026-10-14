import re
"""宿曜占星術のブラウザ動作確認（Playwright / Chromium）

使い方（リポジトリのルートで）:
    python3 tests/e2e/shukuyo_test.py            # 結果だけ表示
    python3 tests/e2e/shukuyo_test.py --shots DIR # スクリーンショットも保存
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
ORDER = ["あなたの本命宿", "の性格", "恋愛と仕事", "今日のあなた", "27宿との相性", "次にできること"]
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
    await page.click("#shuku-form button[type=submit]")
    await page.wait_for_selector("#shuku-result:not([hidden])")


async def run(browser, base, label, viewport, mobile):
    print(f"== {label}")
    ctx = await browser.new_context(viewport=viewport, is_mobile=mobile, has_touch=mobile)
    await ctx.route("https://pagead2.googlesyndication.com/**", lambda r: r.fulfill(status=200, content_type="application/javascript", body=""))  # 広告は読み込まない
    await ctx.route(re.compile(r"^https://[^/]*a8\.net/"), lambda r: r.fulfill(status=200, content_type="image/gif", body=b"GIF89a\x01\x00\x01\x00\x80\x00\x00\x00\x00\x00\xff\xff\xff!\xf9\x04\x01\x00\x00\x00\x00,\x00\x00\x00\x00\x01\x00\x01\x00\x00\x02\x02D\x01\x00;"))  # アフィリエイトの画像も読み込まない
    page = await ctx.new_page()
    errors = []
    page.on("console", lambda m: m.type == "error" and errors.append(m.text))
    page.on("pageerror", lambda e: errors.append(str(e)))
    await page.goto(base + "shukuyo/")
    await page.evaluate("() => localStorage.clear()")
    await page.reload()

    await fill(page, "1990", "1", "1")
    text = await page.inner_text("#shuku-result")
    pos = [text.find(s) for s in ORDER]
    check("見出しの順番", all(p >= 0 for p in pos) and pos == sorted(pos), pos)
    check("1990/1/1 → 奎宿", (await page.inner_text(".shuku-name")) == "奎宿")
    check("旧暦の表示", "旧暦 1989年12月5日" in text)
    check("相性6グループ", await page.locator(".shuku-group").count() == 6)
    chips = await page.locator(".shuku-chip").count()
    check("27宿すべて表示", chips == 27, chips)
    check("今日の六曜", any(r in text for r in ["大安", "赤口", "先勝", "友引", "先負", "仏滅"]))
    if SHOTS:
        await page.screenshot(path=os.path.join(SHOTS, f"shukuyo-{label}.png"), full_page=True)

    await fill(page, "1994", "7", "5")
    check("1994/7/5 → 觜宿", (await page.inner_text(".shuku-name")) == "觜宿")

    await fill(page, "2023", "3", "22")
    text = await page.inner_text("#shuku-result")
    check("閏月の案内", "閏月のお生まれです" in text and "閏2月1日" in text)

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
