"""四柱推命・マヤ暦・宿曜の相性ページのブラウザ動作確認（Playwright / Chromium）

使い方（リポジトリのルートで）:
    python3 tests/e2e/compat_test.py            # 結果だけ表示
    python3 tests/e2e/compat_test.py --shots DIR # スクリーンショットも保存
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


async def fill(page, prefix, a, b):
    for who, (y, m, d) in (("self", a), ("partner", b)):
        await page.fill(f"#bd-{who}-year", y)
        await page.select_option(f"#bd-{who}-month", m)
        await page.select_option(f"#bd-{who}-day", d)
    await page.click(f"#{prefix}-form button[type=submit]")
    await page.wait_for_selector(f"#{prefix}-result:not([hidden])")


CASES = [
    ("shichusuimei/aisho/", "ssm-aisho", ["あなたの四柱推命", "お相手の四柱推命", "日干の相性", "ふたりの星（通変星）", "暮らしの相性と五行", "ふたりの相性を、もっとくわしく"], ["干合（引き合う組み合わせ）", "お相手は、あなたにとって「正財」"]),
    ("maya/aisho/", "maya-aisho", ["あなたのKIN", "お相手のKIN", "ふたりの縁", "ふたりのKIN", "ふたりの相性を、もっとくわしく"], ["KIN110", "同じ色の紋章"]),
    ("horoscope/aisho/", "horo-aisho", ["あなたのホロスコープ", "お相手のホロスコープ", "ふたりの星の相性", "ふたりの天体どうしの角度", "ふたりの相性を、もっとくわしく"], ["太陽どうし", "月どうし", "山羊座", "牡牛座"]),
    ("shukuyo/aisho/", "shuku-aisho", ["あなたの本命宿", "お相手の本命宿", "ふたりの関係：", "恋愛・仕事の相性", "ふたりの相性を、もっとくわしく"], ["友・衰（ゆう・すい）", "奎宿", "氐宿"]),
]


async def run(browser, base, label, viewport, mobile):
    print(f"== {label}")
    ctx = await browser.new_context(viewport=viewport, is_mobile=mobile, has_touch=mobile)
    page = await ctx.new_page()
    errors = []
    page.on("console", lambda m: m.type == "error" and errors.append(m.text))
    page.on("pageerror", lambda e: errors.append(str(e)))
    for path, prefix, order, musts in CASES:
        await page.goto(base + path)
        await page.evaluate("() => localStorage.clear()")
        await page.reload()
        await fill(page, prefix, ("1990", "1", "1"), ("1992", "5", "15"))
        text = await page.inner_text(f"#{prefix}-result")
        pos = [text.find(s) for s in order]
        check(f"{path} 見出しの順番", all(p >= 0 for p in pos) and pos == sorted(pos), pos)
        for m in musts:
            check(f"{path} 「{m}」", m in text)
        overflow = await page.evaluate("() => document.documentElement.scrollWidth - window.innerWidth")
        check(f"{path} 横スクロールなし", overflow <= 0, overflow)
        if SHOTS:
            await page.screenshot(path=os.path.join(SHOTS, f"compat-{prefix}-{label}.png"), full_page=True)
    await page.goto(base + "aisho/")
    links = await page.evaluate("() => [...document.querySelectorAll('a')].map(a => a.getAttribute('href'))")
    check("相性ハブから3つの相性ページへ", all(f"../{x}/aisho/" in links for x in ["shichusuimei", "maya", "shukuyo", "horoscope", "shibi"]))
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
