import re
"""タロットのブラウザ動作確認（Playwright / Chromium）

使い方（リポジトリのルートで）:
    python3 tests/e2e/tarot_test.py            # 結果だけ表示
    python3 tests/e2e/tarot_test.py --shots DIR # スクリーンショットも保存

ブラウザの時計を固定し、端末のタイムゾーンを米国（America/Los_Angeles）にして、
日付の切り替えが端末ではなく日本時間0時で起きることを確認する。
"""
import asyncio
import functools
import http.server
import json
import os
import socketserver
import sys
import threading
from datetime import datetime, timezone
from urllib.parse import urljoin, urlparse

from playwright.async_api import async_playwright

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
SHOTS = sys.argv[sys.argv.index("--shots") + 1] if "--shots" in sys.argv else None
PAGES = ["", "suhijutsu/", "suhijutsu/aisho/", "tarot/", "aisho/", "learn/", "learn/suhijutsu/"]
KEY = "uranai-karute:tarot"
XSS = '<img src=x onerror="window.__xss=1"><b>太字</b>&amp; 相談'

# 2026-09-27 23:00 日本時間（米国西海岸では 9/27 07:00）
DAY1 = datetime(2026, 9, 27, 14, 0, tzinfo=timezone.utc)
# 2026-09-27 23:59 日本時間
DAY1_LATE = datetime(2026, 9, 27, 14, 59, tzinfo=timezone.utc)
# 2026-09-28 00:30 日本時間（米国西海岸ではまだ 9/27 08:30）
DAY2 = datetime(2026, 9, 27, 15, 30, tzinfo=timezone.utc)

EXPECTED_ORDER = ["今回のテーマ", "今回の相談内容", "あなたが引いた3枚", "過去｜今につながる背景",
                  "現在｜いま中心にあること", "未来｜このまま進んだ先にある可能性", "3枚からのメッセージ",
                  "気をつけたいこと", "次にできること"]

results = []


def check(name, ok, detail=""):
    results.append((name, bool(ok)))
    print(("  OK  " if ok else "  NG  ") + name + (f"  [{detail}]" if detail and not ok else ""))


def serve():
    class QuietHandler(http.server.SimpleHTTPRequestHandler):
        def log_message(self, *args):
            pass

    httpd = socketserver.TCPServer(("127.0.0.1", 0), functools.partial(QuietHandler, directory=ROOT))
    threading.Thread(target=httpd.serve_forever, daemon=True).start()
    return httpd, f"http://127.0.0.1:{httpd.server_address[1]}/"


async def result_cards(page):
    return await page.evaluate("() => [...document.querySelectorAll('#tarot-cards .tarot-card')].map(c => c.querySelector('h3').textContent + '/' + c.querySelector('.tarot-orient').textContent)")


async def result_titles(page):
    return await page.evaluate("() => [...document.querySelectorAll('#tarot-result-body > section h2')].map(h => h.textContent.trim())")


async def pick_three_by_mouse(page):
    await page.wait_for_selector("#tarot-pick:not([hidden])")
    buttons = page.locator("#tarot-deck button")
    for i in (4, 11, 20):
        await buttons.nth(i).click()
    await page.wait_for_selector("#tarot-result:not([hidden])")


async def choose_theme(page, value):
    await page.check(f"input[name='tarot-theme'][value='{value}']")


async def run_viewport(browser, base, label, viewport, mobile):
    print(f"== {label}")
    ctx = await browser.new_context(viewport=viewport, is_mobile=mobile, has_touch=mobile, timezone_id="America/Los_Angeles")
    await ctx.route("https://pagead2.googlesyndication.com/**", lambda r: r.fulfill(status=200, content_type="application/javascript", body=""))  # 広告は読み込まない
    await ctx.route(re.compile(r"^https://[^/]*a8\.net/"), lambda r: r.fulfill(status=200, content_type="image/gif", body=b"GIF89a\x01\x00\x01\x00\x80\x00\x00\x00\x00\x00\xff\xff\xff!\xf9\x04\x01\x00\x00\x00\x00,\x00\x00\x00\x00\x01\x00\x01\x00\x00\x02\x02D\x01\x00;"))  # アフィリエイトの画像も読み込まない
    page = await ctx.new_page()
    errors, dialogs = [], []
    page.on("console", lambda m: m.type == "error" and errors.append(m.text))
    page.on("pageerror", lambda e: errors.append(str(e)))
    page.on("dialog", lambda d: (dialogs.append(d.message), asyncio.ensure_future(d.dismiss())))

    await page.clock.set_fixed_time(DAY1)
    await page.goto(base + "tarot/")
    await page.evaluate("() => localStorage.clear()")
    await page.reload()

    # ---- 恋愛・質問文あり・キーボードで3枚選ぶ ----
    await choose_theme(page, "love")
    await page.fill("#tarot-question", XSS)
    await page.focus("#tarot-form button[type=submit]")
    await page.keyboard.press("Enter")
    await page.wait_for_selector("#tarot-pick:not([hidden])")
    status = await page.text_content("#tarot-pick-status")
    check(f"[{label}] シャッフル後の案内は「1枚目（過去）」", "1枚目（過去）" in status, status)
    focused = await page.evaluate("() => document.activeElement && document.activeElement.classList.contains('tarot-back')")
    check(f"[{label}] 伏せたカードは button 要素で、最初のカードにフォーカス", focused)
    count = await page.locator("#tarot-deck button.tarot-back").count()
    check(f"[{label}] 伏せたカードが22枚", count == 22, str(count))

    await page.keyboard.press("Enter")          # 1枚目：Enter
    s2 = await page.text_content("#tarot-pick-status")
    await page.keyboard.press("Tab")            # 次のカードへ
    await page.keyboard.press("Space")          # 2枚目：Space
    s3 = await page.text_content("#tarot-pick-status")
    await page.keyboard.press("Enter")          # 3枚目：Enter（フォーカスは次の選べるカードに移っている）
    pressed = await page.locator("#tarot-deck button[aria-pressed='true']").count()
    check(f"[{label}] キーボード（Enter・Tab・Space）で3枚選べる", pressed == 3 and "2枚目（現在）" in s2 and "3枚目（未来）" in s3, f"{pressed} {s2} {s3}")
    await page.wait_for_selector("#tarot-result:not([hidden])")
    check(f"[{label}] 3枚そろうと選ぶ画面が閉じる", await page.get_attribute("#tarot-pick", "hidden") is not None)

    titles = await result_titles(page)
    check(f"[{label}] 結果の表示順（テーマ→相談→3枚→過去→現在→未来→メッセージ→注意→次）", titles == EXPECTED_ORDER, " / ".join(titles))
    love_cards = await result_cards(page)
    check(f"[{label}] 3枚とも違うカード", len(set(c.split("/")[0] for c in love_cards)) == 3, str(love_cards))
    theme_title = await page.text_content("#tarot-theme-result .tarot-theme-title")
    check(f"[{label}] テーマ「恋愛」が表示される", theme_title == "恋愛", theme_title)

    quote_text = await page.text_content("#tarot-question-result .tarot-quote")
    has_elements = await page.evaluate("() => document.querySelector('#tarot-question-result .tarot-quote').children.length")
    xss = await page.evaluate("() => window.__xss")
    check(f"[{label}] 質問文のHTMLは実行されず文字として表示", quote_text == XSS and has_elements == 0 and xss is None, f"{quote_text} {has_elements} {xss}")

    raw = await page.evaluate(f"() => localStorage.getItem('{KEY}')")
    keys = await page.evaluate("() => Object.keys(localStorage)")
    data = json.loads(raw) if raw else {}
    check(f"[{label}] 保存は tarot のキーだけ・質問文は保存されない", keys == [KEY] and "相談" not in raw and "img" not in raw, f"{keys} {raw}")
    check(f"[{label}] 保存内容は日付（日本時間）・テーマ・カード・向きだけ",
          data.get("date") == "2026-09-27" and list(data.get("readings", {}).keys()) == ["love"]
          and all(sorted(c.keys()) == ["cardId", "orientation", "position"] for c in data["readings"]["love"]["cards"]), raw)
    if SHOTS:
        await page.screenshot(path=os.path.join(SHOTS, f"{label}-tarot-result.png"), full_page=True)

    # ---- リロード後も同じ日・同じテーマは同じ結果（23:59 日本時間） ----
    await page.clock.set_fixed_time(DAY1_LATE)
    await page.reload()
    await choose_theme(page, "love")
    btn = await page.text_content("#tarot-form button[type=submit]")
    check(f"[{label}] 占い済みテーマではボタンが「今日の結果をもう一度見る」", "もう一度見る" in btn, btn)
    today = await page.text_content("#tarot-today-status")
    check(f"[{label}] 今日占ったテーマの案内が出る", "恋愛" in today and "9月27日" in today, today)
    await page.click("#tarot-form button[type=submit]")
    await page.wait_for_selector("#tarot-result:not([hidden])")
    pick_hidden = await page.get_attribute("#tarot-pick", "hidden") is not None
    again = await result_cards(page)
    note = await page.text_content("#tarot-theme-result")
    check(f"[{label}] リロード後・同じ日（23:59）・同じテーマ → 同じ結果、カードを選ぶ画面は出ない", again == love_cards and pick_hidden and "すでに占っています" in note, f"{again} vs {love_cards}")
    check(f"[{label}] 質問文なしでも正常（相談内容の欄は出ない）", "今回の相談内容" not in await result_titles(page))

    # ---- 同じ日・別テーマ → 新しく引ける ----
    await choose_theme(page, "work")
    await page.click("#tarot-form button[type=submit]")
    await pick_three_by_mouse(page)
    work_title = await page.text_content("#tarot-theme-result .tarot-theme-title")
    data = json.loads(await page.evaluate(f"() => localStorage.getItem('{KEY}')"))
    check(f"[{label}] 同じ日・別テーマ（仕事）は新しく引け、恋愛と両方保存される", work_title == "仕事" and sorted(data["readings"].keys()) == ["love", "work"], str(data["readings"].keys()))
    # 画面の「過去」の文が、引いたカードの「仕事」用の文章そのものであること（恋愛用ではない）
    shown = await page.evaluate("""() => {
      const sec = document.getElementById('tarot-past');
      const lead = sec.querySelector('.tarot-reading-lead').textContent;
      const text = sec.querySelector('.tarot-reading-lead').nextElementSibling.textContent;
      const name = lead.match(/「(.+?)」/)[1];
      const ori = lead.includes('逆位置') ? 'reversed' : 'upright';
      const card = KaruteContent.tarotDeck.CARDS.find(c => c.name === name);
      const R = KaruteContent.tarotReadings;
      return { text, work: R.getReading(card.id, 'work', ori), love: R.getReading(card.id, 'love', ori) };
    }""")
    check(f"[{label}] 仕事テーマでは仕事用の鑑定文が出る（恋愛用とは別の文）", shown["text"] == shown["work"] and shown["work"] != shown["love"], str(shown))

    # 「今日占った結果をもう一度見る」から恋愛へ戻れる
    await page.click("#tarot-next .tarot-today button:has-text('恋愛')")
    await page.wait_for_selector("#tarot-theme-result .tarot-theme-title:has-text('恋愛')")
    check(f"[{label}] 「今日の恋愛」ボタンで恋愛の結果をもう一度見られる", await result_cards(page) == love_cards)

    # ---- 状態リセット（監査B14） ----
    await choose_theme(page, "general")
    await page.click("#tarot-form button[type=submit]")
    await page.wait_for_selector("#tarot-pick:not([hidden])")
    await page.locator("#tarot-deck button").nth(0).click()
    mid = await page.text_content("#tarot-pick-status")
    await choose_theme(page, "relationships")  # 選んでいる途中でテーマを変える
    reset_hidden = await page.get_attribute("#tarot-pick", "hidden") is not None
    await page.click("#tarot-form button[type=submit]")
    await page.wait_for_selector("#tarot-pick:not([hidden])")
    fresh = await page.text_content("#tarot-pick-status")
    pressed = await page.locator("#tarot-deck button[aria-pressed='true']").count()
    check(f"[{label}] 途中でテーマを変えると選択は破棄され、案内は「1枚目」に戻る（B14）",
          "2枚目" in mid and reset_hidden and "1枚目（過去）" in fresh and pressed == 0, f"{mid} / {fresh} / {pressed}")
    await pick_three_by_mouse(page)
    await choose_theme(page, "money")
    await page.click("#tarot-form button[type=submit]")
    await page.wait_for_selector("#tarot-pick:not([hidden])")
    after_result = await page.text_content("#tarot-pick-status")
    check(f"[{label}] 結果のあとに別テーマを引くと案内は「1枚目」から（「3枚選びました」が残らない）", "1枚目（過去）" in after_result and "そろいました" not in after_result, after_result)

    # ---- 日本時間0時で切り替わる（端末は米国時間でまだ9/27） ----
    await page.clock.set_fixed_time(DAY2)
    await page.reload()
    today_hidden = await page.get_attribute("#tarot-today-status", "hidden") is not None
    await choose_theme(page, "love")
    btn2 = await page.text_content("#tarot-form button[type=submit]")
    await page.click("#tarot-form button[type=submit]")
    await page.wait_for_selector("#tarot-pick:not([hidden])")
    check(f"[{label}] 日本時間の翌日（端末は前日のまま）→ 恋愛を新しく引ける", today_hidden and "シャッフル" in btn2, btn2)
    await pick_three_by_mouse(page)
    data = json.loads(await page.evaluate(f"() => localStorage.getItem('{KEY}')"))
    meta = await page.text_content("#tarot-theme-result .tarot-meta")
    check(f"[{label}] 翌日の結果は 2026-09-28 として保存され、前日分は残らない", data["date"] == "2026-09-28" and list(data["readings"].keys()) == ["love"] and "9月28日" in meta, json.dumps(data)[:120])

    # ---- 画面の健全性 ----
    dup = await page.evaluate("() => { const c={}; document.querySelectorAll('[id]').forEach(e=>c[e.id]=(c[e.id]||0)+1); return Object.keys(c).filter(k=>c[k]>1); }")
    check(f"[{label}] 結果表示後も重複ID 0", not dup, str(dup))
    overflow = await page.evaluate("() => document.documentElement.scrollWidth - window.innerWidth")
    check(f"[{label}] 横はみ出しなし", overflow <= 0, f"{overflow}px")
    h1 = await page.locator("h1").count()
    check(f"[{label}] H1 が1つ", h1 == 1)
    body = await page.text_content("body")
    check(f"[{label}] 開発者向けの文言がない", not any(w in body for w in ["PROTOTYPE", "本番版", "次段階", "動作確認", "V1"]))
    if SHOTS:
        await page.goto(base + "tarot/")
        await page.screenshot(path=os.path.join(SHOTS, f"{label}-tarot-top.png"), full_page=True)
        await page.click("#tarot-form button[type=submit]")
        await page.wait_for_selector("#tarot-pick:not([hidden])")
        await page.locator("#tarot-deck button").nth(3).click()
        await page.screenshot(path=os.path.join(SHOTS, f"{label}-tarot-pick.png"), full_page=False)

    # ---- 全ページのリンク ----
    broken = []
    for p in PAGES:
        await page.goto(base + p)
        for h in await page.evaluate("() => [...document.querySelectorAll('a[href]')].map(a => a.getAttribute('href'))"):
            url = urljoin(base + p, h)
            if urlparse(url).netloc == urlparse(base).netloc:
                res = await page.request.get(url.split("#")[0])
                if res.status != 200:
                    broken.append(f"{p} → {h} ({res.status})")
    check(f"[{label}] 全ページのリンク切れ 0", not broken, "; ".join(broken))
    top_link = await page.evaluate("() => null")
    await page.goto(base)
    href = await page.get_attribute("#uranau a:has-text('タロットで占う')", "href")
    check(f"[{label}] TOPのタロットカードが /tarot/ へリンク", href == "tarot/", str(href))

    check(f"[{label}] console error 0", not errors, " | ".join(errors[:3]))
    check(f"[{label}] alert() が出ない", not dialogs, " | ".join(dialogs))
    await ctx.close()


async def run_blocked_storage(browser, base):
    print("== localStorage が使えない環境")
    ctx = await browser.new_context(viewport={"width": 375, "height": 740}, is_mobile=True)
    await ctx.route("https://pagead2.googlesyndication.com/**", lambda r: r.fulfill(status=200, content_type="application/javascript", body=""))  # 広告は読み込まない
    await ctx.route(re.compile(r"^https://[^/]*a8\.net/"), lambda r: r.fulfill(status=200, content_type="image/gif", body=b"GIF89a\x01\x00\x01\x00\x80\x00\x00\x00\x00\x00\xff\xff\xff!\xf9\x04\x01\x00\x00\x00\x00,\x00\x00\x00\x00\x01\x00\x01\x00\x00\x02\x02D\x01\x00;"))  # アフィリエイトの画像も読み込まない
    await ctx.add_init_script("""Object.defineProperty(window, 'localStorage', { configurable: true, get() { throw new DOMException('denied', 'SecurityError'); } });""")
    page = await ctx.new_page()
    errors = []
    page.on("pageerror", lambda e: errors.append(str(e)))
    page.on("console", lambda m: m.type == "error" and errors.append(m.text))
    await page.goto(base + "tarot/")
    note_visible = await page.locator("#tarot-storage-note").is_visible()
    check("[保存不可] ページが壊れず、1日1回が使えない旨の案内が出る", note_visible)
    await choose_theme(page, "love")
    await page.click("#tarot-form button[type=submit]")
    await pick_three_by_mouse(page)
    first = await result_cards(page)
    notice = await page.text_content("#tarot-theme-result")
    check("[保存不可] 3枚引けて結果が出る（保存できない旨も表示）", len(first) == 3 and "保存できない" in notice, notice[:80])
    await page.click("#tarot-form button[type=submit]")
    await page.wait_for_selector("#tarot-theme-result")
    check("[保存不可] ページを開いている間は同じテーマで同じ結果", await result_cards(page) == first)
    check("[保存不可] console error 0", not errors, " | ".join(errors[:3]))
    await ctx.close()


async def main():
    httpd, base = serve()
    async with async_playwright() as pw:
        browser = await pw.chromium.launch()
        await run_viewport(browser, base, "PC", {"width": 1280, "height": 900}, False)
        await run_viewport(browser, base, "SP375", {"width": 375, "height": 740}, True)
        await run_blocked_storage(browser, base)
        await browser.close()
    httpd.shutdown()
    ng = [r for r in results if not r[1]]
    print(f"\n{len(results) - len(ng)} / {len(results)} 件 OK")
    sys.exit(1 if ng else 0)


if __name__ == "__main__":
    if SHOTS:
        os.makedirs(SHOTS, exist_ok=True)
    asyncio.run(main())
