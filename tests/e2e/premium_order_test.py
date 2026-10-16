import re
"""本格占いの注文ページ・鑑定書ページのブラウザ動作確認（Playwright / Chromium）

支払い確認API（worker/）と Stripe はテスト内の偽物に置き換える（本物の決済は行わない）。
販売前（salesOpen=false）でも、ページの HTML を書き換えて「販売中」の動きを確かめる。

使い方（リポジトリのルートで）:
    python3 tests/e2e/premium_order_test.py
    python3 tests/e2e/premium_order_test.py --shots DIR
"""
import asyncio
import functools
import http.server
import json
import os
import socketserver
import sys
import threading

from playwright.async_api import async_playwright

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
SHOTS = sys.argv[sys.argv.index("--shots") + 1] if "--shots" in sys.argv else None
API = "https://api.emiri.test"
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


def opened(path):
    html = open(os.path.join(ROOT, path), encoding="utf-8").read()
    html = html.replace(' data-closed', '').replace('id="order-submit" disabled>準備中', 'id="order-submit">入力内容を確認する')
    return html.replace('data-api=""', f'data-api="{API}"')


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
    sent = []

    async def api(route):
        req = route.request
        cors = {"Access-Control-Allow-Origin": "*", "Content-Type": "application/json"}
        if req.method == "POST" and req.url.endswith("/api/checkout"):
            sent.append(json.loads(req.post_data))
            await route.fulfill(status=200, headers=cors, body=json.dumps({"url": base + "premium/kantei/?sid=cs_test_abcdefghijkl"}))
        elif "/api/kantei" in req.url:
            body = sent[-1] if sent else {"person": {"name": "x", "year": 2000, "month": 1, "day": 1}}
            await route.fulfill(status=200, headers=cors, body=json.dumps({"person": body["person"], "partner": body.get("partner"), "made": {"year": 2026, "month": 10, "day": 14}}))
        else:
            await route.fulfill(status=204, headers=cors)

    await page.route(API + "/**", api)
    await page.route("**/premium/order/", lambda r: r.fulfill(status=200, content_type="text/html", body=opened("premium/order/index.html")))
    await page.route("**/premium/kantei/?sid=*", lambda r: r.fulfill(status=200, content_type="text/html", body=opened("premium/kantei/index.html")))

    # 販売前の本物のページ：ボタンは押せない
    real = open(os.path.join(ROOT, "premium/order/index.html"), encoding="utf-8").read()
    check("販売前は申し込みボタンが無効", 'id="order-submit" disabled' in real or "data-closed" not in real)

    await page.goto(base + "premium/order/")
    await page.click("#order-submit")
    err = await page.inner_text("#order-error")
    check("未入力ならエラー", "呼び名" in err, err)
    await page.fill("#order-self-name", "あかり")
    await page.fill("#order-self-sei", "星川")
    await page.fill("#order-self-mei", "あかり")
    await page.fill("#bd-order-self-year", "1990")
    await page.select_option("#bd-order-self-month", "1")
    await page.select_option("#bd-order-self-day", "1")
    await page.fill("#order-self-time", "10:30")
    await page.click("#order-partner summary")
    await page.fill("#order-partner-name", "ミライ")
    await page.fill("#bd-order-partner-year", "1992")
    await page.select_option("#bd-order-partner-month", "5")
    await page.select_option("#bd-order-partner-day", "15")
    await page.click("#order-submit")
    summary = await page.inner_text("#order-summary")
    check("確認欄に入力内容", "1990年1月1日" in summary and "星川 あかり" in summary and "1992年5月15日" in summary, summary)
    check("ボタンが「お支払いへ進む」に", "お支払いへ進む" in await page.inner_text("#order-submit"))
    await page.click("#order-submit")
    check("同意なしでは進めない", "チェック" in await page.inner_text("#order-error") and not sent)
    if SHOTS:
        await page.screenshot(path=os.path.join(SHOTS, f"order-{label}.png"), full_page=True)
    overflow = await page.evaluate("() => document.documentElement.scrollWidth - window.innerWidth")
    check("横スクロールなし（注文）", overflow <= 0, overflow)
    await page.check("#order-agree")
    async with page.expect_navigation():
        await page.click("#order-submit")
    check("APIに送った内容", sent and sent[-1]["person"]["time"] == "10:30" and sent[-1]["partner"]["name"] == "ミライ" and sent[-1]["agree"] is True, sent)
    await page.wait_for_selector("#kantei-aisho", timeout=20000)
    chapters = await page.locator(".kantei-chapter").count()
    text = await page.inner_text("#kantei-root")
    check("鑑定書が全文表示（ぼかしなし）", chapters >= 18 and await page.locator(".kantei-mask").count() == 0, chapters)
    check("名前の章と相性の章", "名前が持つ力" in text and "ミライさん" in text)
    check("作成日は購入日", "2026年10月14日" in text)
    check("PDFボタンが出る", await page.is_visible("#kantei-print"))
    hist = await page.evaluate("() => localStorage.getItem('emiri.kantei.history')")
    check("この端末の購入履歴に残る", hist and "cs_test_abcdefghijkl" in hist, hist)
    overflow = await page.evaluate("() => document.documentElement.scrollWidth - window.innerWidth")
    check("横スクロールなし（鑑定書）", overflow <= 0, overflow)
    if SHOTS:
        await page.screenshot(path=os.path.join(SHOTS, f"kantei-{label}.png"), full_page=False)

    await page.goto(base + "premium/order/")
    check("注文ページに購入履歴のリンク", "あかりさんの総合鑑定書" in await page.inner_text("#order-history"))
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
