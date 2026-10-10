"""四柱推命のブラウザ動作確認（Playwright / Chromium）

使い方（リポジトリのルートで）:
    python3 tests/e2e/shichusuimei_test.py            # 結果だけ表示
    python3 tests/e2e/shichusuimei_test.py --shots DIR # スクリーンショットも保存
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
ORDER = ["あなたの命式", "日干：", "中心星：", "日柱の十二運：", "五行のバランス", "天中殺：", "これから3年の流れ", "仕事と恋愛のヒント", "次にできること"]
WARN = "生まれた時刻によって結果が変わる可能性があります"
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
    await page.click("#ssm-form button[type=submit]")
    await page.wait_for_selector("#ssm-result:not([hidden])")


ROWS_JS = """() => [...document.querySelectorAll('.ssm-table tbody tr')].map(tr => [...tr.querySelectorAll('td')].map(td => (td.querySelector('.ssm-kanji')||td).textContent.trim()))"""


async def run(browser, base, label, viewport, mobile):
    print(f"== {label}")
    ctx = await browser.new_context(viewport=viewport, is_mobile=mobile, has_touch=mobile)
    page = await ctx.new_page()
    errors = []
    page.on("console", lambda m: m.type == "error" and errors.append(m.text))
    page.on("pageerror", lambda e: errors.append(str(e)))
    await page.goto(base + "shichusuimei/")
    await page.evaluate("() => localStorage.clear()")
    await page.reload()

    # 1990-01-01（時刻なし）：己巳・丙子・丙寅
    await fill(page, "1990", "1", "1")
    rows = await page.evaluate(ROWS_JS)
    check("1990/1/1 天干", rows[0][:3] == ["己", "丙", "丙"], rows[0])
    check("1990/1/1 地支", rows[1][:3] == ["巳", "子", "寅"], rows[1])
    check("時刻なしは時柱が空", rows[0][3] == "時刻なし", rows[0])
    text = await page.inner_text("#ssm-result")
    pos = [text.find(s) for s in ORDER]
    check("見出しの順番", all(p >= 0 for p in pos) and pos == sorted(pos), pos)
    check("日干・中心星", "日干：丙（太陽）" in text and "中心星：正官" in text)
    check("天中殺", "天中殺：戌亥天中殺" in text)
    check("境界のお知らせなし", WARN not in text)
    if SHOTS:
        await page.screenshot(path=os.path.join(SHOTS, f"ssm-{label}.png"), full_page=True)

    # 時刻あり：時柱が入る（1990-01-01 6:30 → 辛卯）
    await fill(page, "1990", "1", "1", "6", "30")
    rows = await page.evaluate(ROWS_JS)
    check("時柱 6:30 → 辛卯", rows[0][3] == "辛" and rows[1][3] == "卯", [rows[0], rows[1]])

    # 立春の当日（2024-02-04）時刻なし → 警告、時刻ありで確定
    await fill(page, "2024", "2", "4")
    text = await page.inner_text("#ssm-result")
    rows = await page.evaluate(ROWS_JS)
    check("立春当日：警告", WARN in text)
    check("立春当日：甲辰・丙寅", rows[0][:2] == ["甲", "丙"] and rows[1][:2] == ["辰", "寅"], rows)
    check("立春当日：別の命式を表示", "癸卯" in text and "乙丑" in text)
    await fill(page, "2024", "2", "4", "17", "0")
    text = await page.inner_text("#ssm-result")
    rows = await page.evaluate(ROWS_JS)
    check("立春前の時刻：癸卯・乙丑", rows[0][:2] == ["癸", "乙"] and rows[1][:2] == ["卯", "丑"], rows)
    check("時刻で確定のお知らせ", "生まれた時刻で判定しました" in text)

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
