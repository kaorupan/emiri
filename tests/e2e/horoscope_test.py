import re
"""ホロスコープのブラウザ動作確認（Playwright / Chromium）

使い方（リポジトリのルートで）:
    python3 tests/e2e/horoscope_test.py            # 結果だけ表示
    python3 tests/e2e/horoscope_test.py --shots DIR # スクリーンショットも保存
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
ORDER = ["あなたの天体の配置", "太陽：", "月：", "考え方・愛し方・行動力", "幸運の星と試練の星", "世代の星", "エレメントとクオリティ", "天体どうしの角度", "今年の木星と土星", "次にできること"]
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
    await page.click("#horo-form button[type=submit]")
    await page.wait_for_selector("#horo-result:not([hidden])")


async def run(browser, base, label, viewport, mobile):
    print(f"== {label}")
    ctx = await browser.new_context(viewport=viewport, is_mobile=mobile, has_touch=mobile)
    await ctx.route("https://pagead2.googlesyndication.com/**", lambda r: r.fulfill(status=200, content_type="application/javascript", body=""))  # 広告は読み込まない
    await ctx.route(re.compile(r"^https://[^/]*a8\.net/"), lambda r: r.fulfill(status=200, content_type="image/gif", body=b"GIF89a\x01\x00\x01\x00\x80\x00\x00\x00\x00\x00\xff\xff\xff!\xf9\x04\x01\x00\x00\x00\x00,\x00\x00\x00\x00\x01\x00\x01\x00\x00\x02\x02D\x01\x00;"))  # アフィリエイトの画像も読み込まない
    page = await ctx.new_page()
    errors = []
    page.on("console", lambda m: m.type == "error" and errors.append(m.text))
    page.on("pageerror", lambda e: errors.append(str(e)))
    await page.goto(base + "horoscope/")
    await page.evaluate("() => localStorage.clear()")
    await page.reload()

    await fill(page, "1990", "1", "1")
    text = await page.inner_text("#horo-result")
    pos = [text.find(s) for s in ORDER]
    check("見出しの順番", all(p >= 0 for p in pos) and pos == sorted(pos), pos)
    rows = await page.evaluate("() => [...document.querySelectorAll('.horo-table tbody tr')].map(r => r.innerText)")
    check("10天体", len(rows) == 10, rows)
    check("太陽 山羊座・月 水瓶座", "太陽：山羊座" in text and "月：水瓶座" in text)
    check("金星の逆行表示", any("金星" in r and "逆行" in r for r in rows), rows)
    if SHOTS:
        await page.screenshot(path=os.path.join(SHOTS, f"horoscope-{label}.png"), full_page=True)

    await fill(page, "2024", "2", "29")
    text = await page.inner_text("#horo-result")
    check("時刻なしで月が星座を移る日のお知らせ", ("この日のうちに" in text) == ("※" in text))

    await fill(page, "1990", "1", "1", "6", "30")
    text = await page.inner_text("#horo-result")
    check("時刻ありの表示", "6:30" in text)

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
