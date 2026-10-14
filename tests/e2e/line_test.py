import re
"""LINE で受け取る無料の総合鑑定書のブラウザ動作確認（Playwright / Chromium）

LINE の LIFF は偽物に置き換える（本物の LINE には接続しない）。
LIFF ID が未設定でも、ページの HTML を書き換えて「受付中」の動きを確かめる。

使い方（リポジトリのルートで）:
    python3 tests/e2e/line_test.py
    python3 tests/e2e/line_test.py --shots DIR
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
results = []
STUB = """<script>
window.__sent = null;
window.liff = { init: function () { return Promise.resolve(); }, isInClient: function () { return true; }, isLoggedIn: function () { return true; },
  login: function () {}, sendMessages: function (m) { window.__sent = m; try { sessionStorage.setItem('sent', JSON.stringify(m)); } catch (e) {} return Promise.resolve(); } };
</script>"""


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


def opened():
    html = open(os.path.join(ROOT, "line/index.html"), encoding="utf-8").read()
    html = html.replace(" data-closed", "").replace('data-liff=""', 'data-liff="1234567890-AbCdEfGh"')
    html = html.replace('id="line-submit" disabled>準備中', 'id="line-submit">鑑定書を受け取る（無料）')
    html = html.replace('<script src="https://static.line-scdn.net/liff/edge/2/sdk.js" charset="utf-8"></script>', "")
    return html.replace("</head>", STUB + "</head>")


async def run(browser, base, label, viewport, mobile):
    print(f"== {label}")
    ctx = await browser.new_context(viewport=viewport, is_mobile=mobile, has_touch=mobile)
    await ctx.route("https://pagead2.googlesyndication.com/**", lambda r: r.fulfill(status=200, content_type="application/javascript", body=""))  # 広告は読み込まない
    await ctx.route(re.compile(r"^https://[^/]*a8\.net/"), lambda r: r.fulfill(status=200, content_type="image/gif", body=b"GIF89a\x01\x00\x01\x00\x80\x00\x00\x00\x00\x00\xff\xff\xff!\xf9\x04\x01\x00\x00\x00\x00,\x00\x00\x00\x00\x01\x00\x01\x00\x00\x02\x02D\x01\x00;"))  # アフィリエイトの画像も読み込まない
    page = await ctx.new_page()
    errors = []
    page.on("console", lambda m: m.type == "error" and errors.append(m.text))
    page.on("pageerror", lambda e: errors.append(str(e)))
    await page.route("**/line/", lambda r: r.fulfill(status=200, content_type="text/html", body=opened()))

    real = open(os.path.join(ROOT, "line/index.html"), encoding="utf-8").read()
    cfg = json.load(open(os.path.join(ROOT, "site.config.json"), encoding="utf-8"))
    check("LIFF未設定なら準備中・設定済みなら受付中", ("data-closed" in real) == (not cfg.get("liffId")))

    await page.goto(base + "line/")
    await page.click("#line-submit")
    check("未入力ならエラー", "呼び名" in await page.inner_text("#line-error"))
    await page.fill("#line-self-name", "あかり")
    await page.fill("#line-self-sei", "星川")
    await page.fill("#line-self-mei", "あかり")
    await page.fill("#bd-line-self-year", "1990")
    await page.select_option("#bd-line-self-month", "1")
    await page.select_option("#bd-line-self-day", "1")
    await page.click("#line-partner summary")
    await page.fill("#line-partner-name", "ミライ")
    await page.fill("#bd-line-partner-year", "1992")
    await page.select_option("#bd-line-partner-month", "5")
    await page.select_option("#bd-line-partner-day", "15")
    await page.click("#line-submit")
    check("同意なしでは進めない", "プライバシーポリシー" in await page.inner_text("#line-error"))
    overflow = await page.evaluate("() => document.documentElement.scrollWidth - window.innerWidth")
    check("横スクロールなし（フォーム）", overflow <= 0, overflow)
    if SHOTS:
        await page.screenshot(path=os.path.join(SHOTS, f"line-form-{label}.png"), full_page=True)
    await page.check("#line-agree")
    async with page.expect_navigation():
        await page.click("#line-submit")
    check("鑑定書のページへ移動", "/line/kantei/?d=" in page.url, page.url)
    sent = json.loads(await page.evaluate("() => sessionStorage.getItem('sent') || 'null'") or "null")
    check("LINEのトークに鑑定書のリンクを送る（いつものブラウザで開く指定つき）", sent and "あかりさんの総合鑑定書" in sent[0]["text"] and "/line/kantei/?d=" in sent[0]["text"] and sent[0]["text"].endswith("&openExternalBrowser=1"), sent)
    await page.wait_for_selector("#kantei-aisho", timeout=20000)
    text = await page.inner_text("#kantei-root")
    check("鑑定書が全文表示（名前の章・相性の章）", "名前が持つ力" in text and "ミライさん" in text and await page.locator(".kantei-mask").count() == 0)
    check("有料の追加相性の案内は出さない", "980円" not in text)
    check("PDFボタンが出る", await page.is_visible("#kantei-print"))
    overflow = await page.evaluate("() => document.documentElement.scrollWidth - window.innerWidth")
    check("横スクロールなし（鑑定書）", overflow <= 0, overflow)
    if SHOTS:
        await page.screenshot(path=os.path.join(SHOTS, f"line-kantei-{label}.png"), full_page=False)
    await page.goto(base + "line/kantei/?d=broken")
    check("壊れたリンクは案内を出す", "鑑定書が見つかりません" in await page.inner_text("#kantei-root"))
    check("コンソールエラーなし", not errors, errors)
    await ctx.close()


async def run_in_line(browser, base):
    print("== LINEの中のブラウザ")
    ua = "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 Safari Line/14.16.0 LIFF"
    ctx = await browser.new_context(viewport={"width": 375, "height": 740}, is_mobile=True, has_touch=True, user_agent=ua)
    await ctx.route("https://pagead2.googlesyndication.com/**", lambda r: r.fulfill(status=200, content_type="application/javascript", body=""))
    await ctx.route(re.compile(r"^https://[^/]*a8\.net/"), lambda r: r.fulfill(status=200, content_type="image/gif", body=b"GIF89a\x01\x00\x01\x00\x80\x00\x00\x00\x00\x00\xff\xff\xff!\xf9\x04\x01\x00\x00\x00\x00,\x00\x00\x00\x00\x01\x00\x01\x00\x00\x02\x02D\x01\x00;"))  # アフィリエイトの画像も読み込まない
    page = await ctx.new_page()
    import subprocess
    d = subprocess.run(["node", "-e", "const l=require('./assets/js/core/kantei-link.js');process.stdout.write(l.encode({p:{name:'あかり',year:1990,month:1,day:1},m:[2026,10,14]}))"], capture_output=True, text=True, cwd=ROOT).stdout
    await page.goto(base + "line/kantei/?d=" + d)
    await page.wait_for_selector("#kantei-open-browser", timeout=20000)
    href = await page.get_attribute("#kantei-open-browser", "href")
    check("LINEの中では「ブラウザで開いてPDF保存」に切り替わる", href.endswith("&openExternalBrowser=1") and "d=" + d in href, href)
    await page.goto(href)
    await page.wait_for_selector("#kantei-open-browser", timeout=20000)
    check("開き直しても鑑定書が表示され、指定は重ならない", (await page.get_attribute("#kantei-open-browser", "href")).count("openExternalBrowser") == 1 and "総合鑑定書" in await page.inner_text("body"))
    await ctx.close()


async def main():
    httpd, base = serve()
    async with async_playwright() as p:
        browser = await p.chromium.launch()
        await run(browser, base, "desktop", {"width": 1280, "height": 900}, False)
        await run(browser, base, "mobile", {"width": 375, "height": 740}, True)
        await run_in_line(browser, base)
        await browser.close()
    httpd.shutdown()
    ng = [n for n, ok in results if not ok]
    print(f"\n{len(results) - len(ng)}/{len(results)} OK")
    sys.exit(1 if ng else 0)


asyncio.run(main())
