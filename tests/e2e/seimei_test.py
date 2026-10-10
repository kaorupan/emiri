"""姓名判断のブラウザ動作確認（Playwright / Chromium）

使い方（リポジトリのルートで）:
    python3 tests/e2e/seimei_test.py            # 結果だけ表示
    python3 tests/e2e/seimei_test.py --shots DIR # スクリーンショットも保存
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
ORDER = ["さんの姓名判断", "五格の一覧", "人格：", "総格：", "地格：", "外格：", "天格：", "三才配置：", "名前からのメッセージ", "次にできること"]
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


async def name(page, prefix, sei, mei, form):
    await page.fill(f"#nm-{prefix}-sei", sei)
    await page.fill(f"#nm-{prefix}-mei", mei)


async def run(browser, base, label, viewport, mobile):
    print(f"== {label}")
    ctx = await browser.new_context(viewport=viewport, is_mobile=mobile, has_touch=mobile)
    page = await ctx.new_page()
    errors = []
    page.on("console", lambda m: m.type == "error" and errors.append(m.text))
    page.on("pageerror", lambda e: errors.append(str(e)))
    await page.goto(base + "seimei/")

    await page.click("#seimei-form button[type=submit]")
    err = await page.inner_text("#nm-self-error")
    check("空欄のエラー", "姓（名字）を入力" in err, err)

    await name(page, "self", "山田", "Anna", None)
    await page.click("#seimei-form button[type=submit]")
    err = await page.inner_text("#nm-self-error")
    check("画数のわからない字のエラー", "「A」" in err, err)

    await name(page, "self", "山田", "花子", None)
    await page.click("#seimei-form button[type=submit]")
    await page.wait_for_selector("#seimei-result:not([hidden])")
    text = await page.inner_text("#seimei-result")
    pos = [text.find(s) for s in ORDER]
    check("見出しの順番", all(p >= 0 for p in pos) and pos == sorted(pos), pos)
    rows = await page.eval_on_selector_all(".seimei-table tbody tr", "rs => rs.map(r => r.dataset.kaku + ':' + r.querySelector('.seimei-num').firstChild.textContent)")
    check("山田花子の五格", rows == ["jin:12", "sou:18", "chi:10", "gai:6", "ten:8"], rows)
    check("三才 金・木・水", "三才配置：金・木・水" in text)
    href = await page.get_attribute("#seimei-jin a[href*='kakusu']", "href")
    check("人格から12画のページへのリンク", href == "kakusu/12/", href)
    if SHOTS:
        await page.screenshot(path=os.path.join(SHOTS, f"seimei-{label}.png"), full_page=True)

    await name(page, "self", "林", "学", None)
    await page.click("#seimei-form button[type=submit]")
    await page.wait_for_function("() => document.querySelector('#seimei-result').innerText.includes('林 学')")
    text = await page.inner_text("#seimei-result")
    check("1字姓・1字名の霊数の案内", "霊数1を足しています" in text)

    await name(page, "self", "𠮷田", "ゆうこ", None)
    await page.click("#seimei-form button[type=submit]")
    await page.wait_for_function("() => document.querySelector('#seimei-result').innerText.includes('𠮷田')")
    chars = await page.eval_on_selector_all(".seimei-char-n", "es => es.map(e => e.textContent)")
    check("𠮷田ゆうこ の画数", chars == ["6画", "5画", "2画", "2画", "2画"], chars)

    overflow = await page.evaluate("() => document.documentElement.scrollWidth - window.innerWidth")
    check("横スクロールなし（鑑定）", overflow <= 0, overflow)

    await page.goto(base + "seimei/aisho/")
    await name(page, "self", "山田", "花子", None)
    await name(page, "partner", "鈴木", "一郎", None)
    await page.click("#seimei-aisho-form button[type=submit]")
    await page.wait_for_selector("#seimei-aisho-result:not([hidden])")
    text = await page.inner_text("#seimei-aisho-result")
    check("相性の結果", "ふたりの相性" in text and "性格の相性（人格どうし" in text and "人生の方向性（総格どうし" in text, text[:200])
    if SHOTS:
        await page.screenshot(path=os.path.join(SHOTS, f"seimei-aisho-{label}.png"), full_page=True)
    overflow = await page.evaluate("() => document.documentElement.scrollWidth - window.innerWidth")
    check("横スクロールなし（相性）", overflow <= 0, overflow)

    await page.goto(base + "seimei/kakusu/24/")
    h1 = await page.inner_text("h1")
    check("24画のページ", h1 == "姓名判断 24画の意味", h1)
    overflow = await page.evaluate("() => document.documentElement.scrollWidth - window.innerWidth")
    check("横スクロールなし（画数）", overflow <= 0, overflow)
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
