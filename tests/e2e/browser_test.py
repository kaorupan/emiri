"""ブラウザでの動作確認（Playwright / Chromium）

使い方（リポジトリのルートで）:
    python3 tests/e2e/browser_test.py            # 結果だけ表示
    python3 tests/e2e/browser_test.py --shots DIR # スクリーンショットも保存

確認内容:
  - 数秘術の個人鑑定：1992-01-21 → LP7、0001-01-01、9999-12-31、2024-02-29 は結果が出る
  - 2023-02-29 / 10000-01-01 / 空欄 は入力欄の近くにエラー（alert は出ない）
  - 結果の表示順（要約→LP→BD→AT→PY→詳細→12ヶ月→次にできること）
  - 相性：1人目→2人目→総合→詳細→親密さ の順
  - 端末内保存：チェックしたときだけ保存、消すと消える、お相手は保存しない
  - PC(1280px) と スマホ(375px)：横はみ出しなし
  - 全ページ：consoleエラー0、実行後のDOMで重複ID 0、リンク先が HTTP 200
"""
import asyncio
import functools
import http.server
import os
import socketserver
import sys
import threading
from urllib.parse import urljoin, urlparse

from playwright.async_api import async_playwright

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
PAGES = ["", "premium/", "suhijutsu/", "suhijutsu/aisho/", "aisho/", "learn/", "learn/suhijutsu/", "unsei/"]
# 今日の運勢：生成済みの日付ページのうち最新のもの
_UNSEI = sorted(d for d in os.listdir(os.path.join(ROOT, "unsei")) if len(d) == 10 and d[4] == "-") if os.path.isdir(os.path.join(ROOT, "unsei")) else []
PAGES += [f"unsei/{d}/" for d in _UNSEI[-1:]]
_KOYOMI = sorted(d for d in os.listdir(os.path.join(ROOT, "koyomi")) if len(d) == 7 and d[4] == "-") if os.path.isdir(os.path.join(ROOT, "koyomi")) else []
PAGES += ["koyomi/"] + [f"koyomi/{d}/" for d in _KOYOMI[:1]]
SHOTS = sys.argv[sys.argv.index("--shots") + 1] if "--shots" in sys.argv else None

results = []


def check(name, ok, detail=""):
    results.append((name, bool(ok), detail))
    print(("  OK  " if ok else "  NG  ") + name + (f"  [{detail}]" if detail and not ok else ""))


def serve():
    class QuietHandler(http.server.SimpleHTTPRequestHandler):
        def log_message(self, *args):
            pass

    handler = functools.partial(QuietHandler, directory=ROOT)
    httpd = socketserver.TCPServer(("127.0.0.1", 0), handler)
    threading.Thread(target=httpd.serve_forever, daemon=True).start()
    return httpd, f"http://127.0.0.1:{httpd.server_address[1]}/"


DUP_IDS_JS = """() => { const c = {}; document.querySelectorAll('[id]').forEach(e => c[e.id] = (c[e.id]||0)+1);
  return Object.entries(c).filter(([k,v]) => v>1).map(([k]) => k); }"""
OVERFLOW_JS = "() => document.documentElement.scrollWidth - window.innerWidth"


async def fill_birth(page, prefix, y, m, d):
    await page.fill(f"#bd-{prefix}-year", y)
    await page.select_option(f"#bd-{prefix}-month", m)
    await page.select_option(f"#bd-{prefix}-day", d)


async def personal_tests(page, base, label):
    await page.goto(base + "suhijutsu/")
    await page.evaluate("() => localStorage.clear()")
    await page.reload()

    cases = [("1992", "1", "21", "7"), ("0001", "1", "1", "3"), ("9999", "12", "31", "7"), ("2024", "2", "29", "3")]
    for y, m, d, lp in cases:
        await fill_birth(page, "self", y, m, d)
        await page.click("#suhijutsu-form button[type=submit]")
        await page.wait_for_selector("#suhijutsu-result:not([hidden])")
        got = (await page.text_content("#num-lifepath .num-big")).strip()
        check(f"[{label}] 個人鑑定 {y}-{m}-{d} → ライフパス{lp}", got == lp, f"got {got}")

    order = await page.evaluate("""() => [...document.querySelectorAll('#suhijutsu-result section h2')].map(h => h.textContent.trim())""")
    expected_prefix = ["あなたの数秘カルテ", "ライフパスナンバー", "バースデーナンバー", "アティチュードナンバー"]
    ok = order[:4] == expected_prefix and "パーソナルイヤー" in order[4] and order[5] == "詳細鑑定" and "12ヶ月の流れ" in order[6] and order[7] == "次にできること"
    check(f"[{label}] 個人鑑定の表示順（要約→LP→BD→AT→PY→詳細→12ヶ月→次）", ok, " / ".join(order))
    months = await page.locator("#num-months .num-month").count()
    check(f"[{label}] 12ヶ月の流れが12件", months == 12, str(months))
    body = await page.text_content("#suhijutsu-result")
    check(f"[{label}] 月の文章に「年。」が出ない（B6）", "年。" not in "".join(await page.locator(".num-month-text").all_text_contents()))
    check(f"[{label}] 「。という」の文崩れがない（B7）", "。という" not in body)
    if SHOTS:
        await page.screenshot(path=os.path.join(SHOTS, f"{label}-suhijutsu-result.png"), full_page=True)

    # エラー系：結果を消すためページを開き直す
    for y, m, d, word in [("2023", "2", "29", "存在しない日付"), ("10000", "1", "1", "4桁"), ("", "", "", "生年月日を入力")]:
        await page.goto(base + "suhijutsu/")
        await fill_birth(page, "self", y, m, d)
        await page.click("#suhijutsu-form button[type=submit]")
        err = page.locator("#bd-self-error")
        visible = await err.is_visible()
        text = (await err.text_content()) or ""
        hidden = await page.get_attribute("#suhijutsu-result", "hidden") is not None
        # エラー表示が入力欄の近く（同じフォームの中）にあること
        inside = await page.evaluate("() => !!document.querySelector('#suhijutsu-form #bd-self-error')")
        check(f"[{label}] {y or '空欄'}-{m}-{d} → 入力欄の下にエラー表示・結果は出ない", visible and word in text and hidden and inside, text)
        if SHOTS and y == "2023":
            await page.screenshot(path=os.path.join(SHOTS, f"{label}-suhijutsu-error.png"))


async def profile_tests(page, base, label):
    await page.goto(base + "suhijutsu/")
    await page.evaluate("() => localStorage.clear()")
    await page.reload()
    await fill_birth(page, "self", "1992", "1", "21")
    await page.click("#suhijutsu-form button[type=submit]")
    stored = await page.evaluate("() => Object.keys(localStorage).length")
    check(f"[{label}] 保存を選ばなければ何も保存しない", stored == 0, str(stored))

    await page.check("#bd-self-save")
    await page.click("#suhijutsu-form button[type=submit]")
    raw = await page.evaluate("() => localStorage.getItem('uranai-karute:profile')")
    check(f"[{label}] 保存を選ぶと生年月日だけ保存", raw is not None and "1992" in raw and "time" not in raw and "place" not in raw, raw or "")

    await page.goto(base + "suhijutsu/aisho/")
    prefilled = await page.input_value("#bd-self-year")
    partner = await page.input_value("#bd-partner-year")
    check(f"[{label}] 別ページ（相性）で自分の生年月日が入っている・お相手は空", prefilled == "1992" and partner == "", f"{prefilled}/{partner}")
    await fill_birth(page, "partner", "1991", "8", "20")
    await page.click("#aisho-form button[type=submit]")
    raw2 = await page.evaluate("() => localStorage.getItem('uranai-karute:profile')")
    check(f"[{label}] お相手の生年月日は保存しない", raw2 is not None and "1991" not in raw2, raw2 or "")

    await page.goto(base + "suhijutsu/")
    await page.click(".profile-saved .link-button")
    raw3 = await page.evaluate("() => localStorage.getItem('uranai-karute:profile')")
    cleared = await page.input_value("#bd-self-year")
    check(f"[{label}] 「保存した生年月日を消す」で端末から消え、入力欄も空になる", raw3 is None and cleared == "", f"{raw3}/{cleared}")


async def compat_tests(page, base, label):
    await page.goto(base + "suhijutsu/aisho/")
    await page.evaluate("() => localStorage.clear()")
    await page.reload()
    # 片方だけ空欄 → エラー
    await fill_birth(page, "self", "1992", "1", "21")
    await page.click("#aisho-form button[type=submit]")
    check(f"[{label}] 相性：お相手が空欄ならエラー", await page.locator("#bd-partner-error").is_visible())

    await fill_birth(page, "partner", "1991", "8", "20")
    await page.click("#aisho-form button[type=submit]")
    await page.wait_for_selector("#aisho-result:not([hidden])")
    titles = await page.evaluate("""() => [...document.querySelectorAll('#aisho-result-body > section')].map(s => s.dataset.order + ':' + s.querySelector('h2').textContent.trim())""")
    expected = ["1:あなたの数秘術", "2:お相手の数秘術", "3:ふたりの総合相性", "4:詳細な相性", "5:親密さ・スキンシップの相性"]
    check(f"[{label}] 相性の表示順 1人目→2人目→総合→詳細→親密さ（最後）", titles == expected, " / ".join(titles))
    total = (await page.text_content("#aisho-total .num-score")).strip()
    check(f"[{label}] 総合相性が旧統合版と同じ値（82 / 100）", total.startswith("82"), total)
    text = await page.text_content("body")
    check(f"[{label}] 直接的な表現（セックス等）を使わない", "セックス" not in text and "身体の相性" not in text)
    check(f"[{label}] 「えみり独自の相性分析」と明記", "独自の相性分析" in text)
    if SHOTS:
        await page.screenshot(path=os.path.join(SHOTS, f"{label}-aisho-result.png"), full_page=True)


async def all_pages(page, base, label, console_errors):
    for p in PAGES:
        await page.goto(base + p)
        dup = await page.evaluate(DUP_IDS_JS)
        check(f"[{label}] /{p} 重複ID 0", not dup, ",".join(dup))
        overflow = await page.evaluate(OVERFLOW_JS)
        check(f"[{label}] /{p} 横はみ出しなし", overflow <= 0, f"{overflow}px")
        h1 = await page.locator("h1").count()
        check(f"[{label}] /{p} H1 が1つ", h1 == 1, str(h1))
        if SHOTS:
            await page.screenshot(path=os.path.join(SHOTS, f"{label}-page-{p.strip('/').replace('/', '_') or 'top'}.png"), full_page=True)
        hrefs = await page.evaluate("() => [...document.querySelectorAll('a[href]')].map(a => a.getAttribute('href'))")
        for h in hrefs:
            url = urljoin(base + p, h)
            if urlparse(url).netloc != urlparse(base).netloc:
                continue
            res = await page.request.get(url.split("#")[0])
            if res.status != 200:
                check(f"[{label}] /{p} リンク {h}", False, str(res.status))
    check(f"[{label}] ページ・操作全体で console error 0", not console_errors, " | ".join(console_errors[:3]))


async def main():
    httpd, base = serve()
    async with async_playwright() as pw:
        browser = await pw.chromium.launch()
        for label, opts in [("PC", {"viewport": {"width": 1280, "height": 900}}),
                            ("SP375", {"viewport": {"width": 375, "height": 740}, "is_mobile": True, "has_touch": True})]:
            print(f"== {label}")
            ctx = await browser.new_context(**opts)
            page = await ctx.new_page()
            console_errors = []
            page.on("console", lambda m: m.type == "error" and console_errors.append(m.text))
            page.on("pageerror", lambda e: console_errors.append(str(e)))
            dialogs = []
            page.on("dialog", lambda d: (dialogs.append(d.message), asyncio.ensure_future(d.dismiss())))

            await personal_tests(page, base, label)
            await profile_tests(page, base, label)
            await compat_tests(page, base, label)
            await all_pages(page, base, label, console_errors)
            check(f"[{label}] alert() が一度も出ない", not dialogs, " | ".join(dialogs))
            await ctx.close()
        await browser.close()
    httpd.shutdown()

    ng = [r for r in results if not r[1]]
    print(f"\n{len(results) - len(ng)} / {len(results)} 件 OK")
    sys.exit(1 if ng else 0)


if __name__ == "__main__":
    if SHOTS:
        os.makedirs(SHOTS, exist_ok=True)
    asyncio.run(main())
