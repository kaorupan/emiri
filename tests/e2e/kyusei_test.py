"""九星気学のブラウザ動作確認（Playwright / Chromium）

使い方（リポジトリのルートで）:
    python3 tests/e2e/kyusei_test.py            # 結果だけ表示
    python3 tests/e2e/kyusei_test.py --shots DIR # スクリーンショットも保存
"""
import asyncio
import functools
import http.server
import os
import re
import socketserver
import sys
import threading
from urllib.parse import urljoin, urlparse

from playwright.async_api import async_playwright

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
SHOTS = sys.argv[sys.argv.index("--shots") + 1] if "--shots" in sys.argv else None
PAGES = ["", "suhijutsu/", "suhijutsu/aisho/", "tarot/", "seiju/", "seiju/aisho/", "kyusei/", "kyusei/aisho/",
         "aisho/", "learn/", "learn/suhijutsu/"]
PERSONAL_ORDER = ["あなたの九星気学カルテ", "本命星：", "月命星：", "本命星の基本性格", "月命星が表す内面",
                  "本命星 × 月命星の組み合わせ", "強み", "苦手になりやすいこと", "仕事・才能", "恋愛", "人間関係",
                  "成長のヒント", "次にできること"]
COMPAT_ORDER = ["1:あなたの九星気学", "2:お相手の九星気学", "3:ふたりの総合相性", "4:詳細な相性", "5:親密さ・スキンシップの相性"]
WARN = "生まれた時刻によって結果が変わる可能性があります"

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


async def fill(page, prefix, y, m, d):
    await page.fill(f"#bd-{prefix}-year", y)
    await page.select_option(f"#bd-{prefix}-month", m)
    await page.select_option(f"#bd-{prefix}-day", d)


async def set_time(page, prefix, hour, minute):
    await page.select_option(f"#kt-{prefix}-hour", hour)
    await page.select_option(f"#kt-{prefix}-minute", minute)


async def submit(page):
    await page.click("#kyusei-form button[type=submit]")
    await page.wait_for_selector("#kyusei-result:not([hidden])")


async def stars(page, root="#kyusei-summary"):
    return await page.evaluate(f"() => [...document.querySelectorAll('{root} .kyusei-star')].map(s => s.querySelector('.kyusei-star-name').textContent + '/' + s.querySelector('.kyusei-star-element').textContent)")


async def run(browser, base, label, viewport, mobile):
    print(f"== {label}")
    ctx = await browser.new_context(viewport=viewport, is_mobile=mobile, has_touch=mobile)
    page = await ctx.new_page()
    errors, dialogs = [], []
    page.on("console", lambda m: m.type == "error" and errors.append(m.text))
    page.on("pageerror", lambda e: errors.append(str(e)))
    page.on("dialog", lambda d: (dialogs.append(d.message), asyncio.ensure_future(d.dismiss())))

    await page.goto(base + "kyusei/")
    await page.evaluate("() => localStorage.clear()")
    await page.reload()

    # ---- 通常の日 ----
    await fill(page, "self", "1991", "3", "20")
    await submit(page)
    s = await stars(page)
    check(f"[{label}] 1991-03-20 → 本命星 九紫火星（火）・月命星 四緑木星（木）", s == ["九紫火星/火", "四緑木星/木"], str(s))
    titles = await page.evaluate("() => [...document.querySelectorAll('#kyusei-result section h2')].map(h => h.textContent.trim())")
    ok = len(titles) == len(PERSONAL_ORDER) and all(t.startswith(p) for t, p in zip(titles, PERSONAL_ORDER))
    check(f"[{label}] 個人鑑定の表示順（要約→本命星→月命星→…→成長→次）", ok, " / ".join(titles))
    check(f"[{label}] 通常の日は境界のお知らせなし", await page.locator("#kyusei-result .kyusei-boundary").count() == 0)
    trad = await page.locator("#kyusei-combination .kyusei-tradition").count()
    own = await page.locator("#kyusei-combination .kyusei-source", has_text="占いのカルテの読み解き").count()
    check(f"[{label}] 組み合わせ：伝統的な位置づけとサイトの読み解きを分けて表示", trad == 1 and own == 1)
    mine = await page.evaluate("() => [...document.querySelectorAll('#kyusei-honmei .kyusei-nine-item.is-mine .kyusei-nine-name')].map(e => e.textContent)")
    check(f"[{label}] 九星と五行の一覧で本命星・月命星に印", mine == ["四緑木星", "九紫火星"], str(mine))
    if SHOTS:
        await page.screenshot(path=os.path.join(SHOTS, f"{label}-kyusei-result.png"), full_page=True)

    # ---- 立春前・立春当日・時刻で切り替え ----
    await page.goto(base + "kyusei/")
    await fill(page, "self", "2024", "2", "3")
    await submit(page)
    s = await stars(page)
    check(f"[{label}] 2024-02-03（立春前）→ 前年の四緑木星", s[0] == "四緑木星/木", str(s))
    check(f"[{label}] 2024-02-03 は境界のお知らせなし", await page.locator("#kyusei-result .kyusei-boundary").count() == 0)

    await fill(page, "self", "2024", "2", "4")
    await submit(page)
    s = await stars(page)
    warn = await page.text_content("#kyusei-summary .kyusei-boundary")
    check(f"[{label}] 2024-02-04（立春当日・時刻なし）→ 三碧木星＋「{WARN}」", s[0] == "三碧木星/木" and WARN in warn, warn[:60])
    check(f"[{label}] 立春当日：節入り時刻（17:27 日本時間）と、前に生まれた場合の星を表示", "17:27" in warn and "日本時間" in warn and "四緑木星" in warn, warn)
    await page.click("#kyusei-summary .kyusei-use-time")
    focused = await page.evaluate("() => document.activeElement && document.activeElement.id")
    check(f"[{label}] 「生まれた時刻を入力して確かめる」で時刻の入力欄へ移動", focused == "kt-self-hour", str(focused))

    await set_time(page, "self", "17", "20")
    await submit(page)
    s = await stars(page)
    box = await page.text_content("#kyusei-summary .kyusei-boundary")
    check(f"[{label}] 同じ日 17:20（立春前）→ 四緑木星・六白金星、時刻で確定のお知らせ", s == ["四緑木星/木", "六白金星/金"] and "確定" in box, f"{s} {box[:40]}")
    await set_time(page, "self", "17", "35")
    await submit(page)
    s = await stars(page)
    check(f"[{label}] 同じ日 17:35（立春後）→ 三碧木星・五黄土星", s == ["三碧木星/木", "五黄土星/土"], str(s))
    await set_time(page, "self", "17", "27")
    await submit(page)
    box = await page.text_content("#kyusei-summary .kyusei-boundary")
    check(f"[{label}] 17:27（節入りとほぼ同時刻）→ 誤差の範囲で入れ替わる可能性を表示", "ほぼ同じ時刻" in box, box[:40])

    # 月の節入り（啓蟄 2024-03-05 11:23）
    await page.select_option("#kt-self-hour", "")
    await page.select_option("#kt-self-minute", "")
    await fill(page, "self", "2024", "3", "5")
    await submit(page)
    warn = await page.text_content("#kyusei-summary .kyusei-boundary")
    check(f"[{label}] 啓蟄の当日（時刻なし）→ 月命星が変わる可能性を表示", WARN in warn and "啓蟄" in warn and "月命星" in warn, warn[:60])
    await set_time(page, "self", "11", "15")
    await submit(page)
    before = (await stars(page))[1]
    await set_time(page, "self", "11", "31")
    await submit(page)
    after = (await stars(page))[1]
    check(f"[{label}] 啓蟄 11:15 → 五黄土星、11:31 → 四緑木星（月命星が切り替わる）", before == "五黄土星/土" and after == "四緑木星/木", f"{before} {after}")

    # 時刻の入力エラー
    await page.select_option("#kt-self-minute", "")
    await page.click("#kyusei-form button[type=submit]")
    err = page.locator("#kt-self-error")
    check(f"[{label}] 時だけ選んで分が未入力 → 入力欄の下にエラー", await err.is_visible() and "両方" in (await err.text_content()))
    await page.select_option("#kt-self-hour", "")

    # ---- 年代・日付のエラー ----
    for y, m, d in [("0001", "1", "1"), ("9999", "12", "31")]:
        await page.goto(base + "kyusei/")
        await fill(page, "self", y, m, d)
        await submit(page)
        badge = await page.locator("#kyusei-summary .kyusei-badge-estimated").count()
        note = await page.text_content("#kyusei-summary")
        check(f"[{label}] {y}-{m}-{d} → 結果が出て「推定」と明記", badge == 1 and "推定" in note)

    for y, m, d, word in [("2023", "2", "29", "存在しない日付"), ("10000", "1", "1", "4桁"), ("", "", "", "生年月日を入力")]:
        await page.goto(base + "kyusei/")
        await fill(page, "self", y, m, d)
        await page.click("#kyusei-form button[type=submit]")
        err = page.locator("#bd-self-error")
        text = (await err.text_content()) or ""
        hidden = await page.get_attribute("#kyusei-result", "hidden") is not None
        check(f"[{label}] {y or '空欄'}-{m}-{d} → 入力欄の下にエラー・結果は出ない", await err.is_visible() and word in text and hidden, text)

    # ---- 保存（共通プロフィール：生年月日だけ） ----
    await page.goto(base + "kyusei/")
    await page.evaluate("() => localStorage.clear()")
    await page.reload()
    await fill(page, "self", "1992", "1", "21")
    await set_time(page, "self", "9", "45")
    await submit(page)
    check(f"[{label}] 保存を選ばなければ何も保存しない", await page.evaluate("() => localStorage.length") == 0)
    await page.check("#bd-self-save")
    await submit(page)
    raw = await page.evaluate("() => JSON.stringify(Object.assign({}, localStorage))")
    check(f"[{label}] 保存を選ぶと生年月日だけを共通プロフィールに保存（時刻は保存しない）",
          "1992" in raw and "birthDate" in raw and "45" not in raw and "time" not in raw and "uranai-karute:profile" in raw, raw)

    # ---- 相性 ----
    await page.goto(base + "kyusei/aisho/")
    pre = await page.input_value("#bd-self-year")
    check(f"[{label}] 相性ページで自分の生年月日が入っている（共通プロフィール）", pre == "1992", pre)
    await page.click("#kyusei-aisho-form button[type=submit]")
    check(f"[{label}] 相性：お相手が空欄ならエラー", await page.locator("#bd-partner-error").is_visible())
    await fill(page, "partner", "2025", "2", "3")
    await page.click("#kyusei-aisho-form button[type=submit]")
    await page.wait_for_selector("#kyusei-aisho-result:not([hidden])")
    order = await page.evaluate("() => [...document.querySelectorAll('#kyusei-aisho-result-body > section')].map(s => s.dataset.order + ':' + s.querySelector('h2').textContent.trim())")
    check(f"[{label}] 相性の表示順 あなた→お相手→総合→詳細→親密さ（最後）", order == COMPAT_ORDER, " / ".join(order))
    you = await stars(page, "#kyusei-aisho-you")
    partner = await stars(page, "#kyusei-aisho-partner")
    check(f"[{label}] 相性：ふたりの本命星・月命星と五行を表示", you == ["九紫火星/火", "三碧木星/木"] and partner[0] == "二黒土星/土", f"{you} {partner}")
    pwarn = await page.locator("#kyusei-aisho-partner .kyusei-boundary").count()
    check(f"[{label}] お相手が立春当日（2025-02-03）→ お相手の欄に時刻の注意", pwarn == 1)
    await page.click("#kyusei-aisho-partner .kyusei-use-time")
    focused = await page.evaluate("() => document.activeElement && document.activeElement.id")
    check(f"[{label}] 相性：お相手の時刻の入力欄が開いて移動", focused == "kt-partner-hour", str(focused))
    await set_time(page, "partner", "22", "0")
    await page.click("#kyusei-aisho-form button[type=submit]")
    await page.wait_for_selector("#kyusei-aisho-result:not([hidden])")
    partner = await stars(page, "#kyusei-aisho-partner")
    check(f"[{label}] お相手 22:00（立春 23:10 の前）→ 前年の三碧木星に切り替わる", partner[0] == "三碧木星/木", str(partner))
    label_text = await page.text_content("#kyusei-aisho-total .kyusei-category-label")
    check(f"[{label}] 総合相性は関係の言葉で表示", label_text in ["感覚を共有しやすい", "力を渡しやすい", "刺激と調整が生まれやすい"], label_text)
    body = await page.text_content("#kyusei-aisho-result")
    check(f"[{label}] 直接的な表現・点数・断定を使わない", not re.search(r"セックス|\d+\s*点|/\s*100|最悪|別れるべき|必ず|絶対", body))
    rel_count = await page.locator("#kyusei-aisho-detail .kyusei-factor").count()
    check(f"[{label}] 詳細：五行の関係を4組（本命・月命・交差2つ）表示", rel_count == 4, str(rel_count))
    raw2 = await page.evaluate("() => JSON.stringify(Object.assign({}, localStorage))")
    check(f"[{label}] お相手の生年月日・時刻は保存しない", "2025" not in raw2 and "22" not in raw2.replace("uranai-karute", ""), raw2)
    if SHOTS:
        await page.screenshot(path=os.path.join(SHOTS, f"{label}-kyusei-aisho.png"), full_page=True)

    # ---- 画面の健全性 ----
    for p in ["kyusei/", "kyusei/aisho/"]:
        await page.goto(base + p)
        check(f"[{label}] /{p} H1 が1つ・canonical あり", await page.locator("h1").count() == 1 and await page.locator("link[rel=canonical]").count() == 1)
        txt = await page.text_content("body")
        check(f"[{label}] /{p} 傾斜宮・吉方位・運勢スコアを出さない", "傾斜" not in txt and "吉方位" not in txt and "今後追加" not in txt)
    dup = await page.evaluate("() => { const c={}; document.querySelectorAll('[id]').forEach(e=>c[e.id]=(c[e.id]||0)+1); return Object.keys(c).filter(k=>c[k]>1); }")
    check(f"[{label}] 重複ID 0", not dup, str(dup))

    broken, overflow_pages = [], []
    for p in PAGES:
        await page.goto(base + p)
        if await page.evaluate("() => document.documentElement.scrollWidth - window.innerWidth") > 0:
            overflow_pages.append(p)
        for h in await page.evaluate("() => [...document.querySelectorAll('a[href]')].map(a => a.getAttribute('href'))"):
            url = urljoin(base + p, h)
            if urlparse(url).netloc == urlparse(base).netloc:
                res = await page.request.get(url.split("#")[0])
                if res.status != 200:
                    broken.append(f"{p} → {h}")
        text = await page.text_content("body")
        for w in ["PROTOTYPE", "本番版", "次段階", "動作確認", "V1", "証明", "必ず当たる"]:
            if w in text:
                broken.append(f"{p}: 表現「{w}」")
    check(f"[{label}] 全{len(PAGES)}ページ：リンク切れ・禁止表現 0", not broken, "; ".join(broken))
    check(f"[{label}] 全{len(PAGES)}ページ：横はみ出しなし", not overflow_pages, str(overflow_pages))

    # 結果表示後の横はみ出し（スマホ幅）
    await page.goto(base + "kyusei/")
    await fill(page, "self", "2024", "2", "4")
    await submit(page)
    check(f"[{label}] 結果表示後も横はみ出しなし", await page.evaluate("() => document.documentElement.scrollWidth - window.innerWidth") <= 0)

    await page.goto(base)
    hrefs = await page.evaluate("() => [...document.querySelectorAll('#uranau a')].map(a => a.getAttribute('href'))")
    check(f"[{label}] TOPから九星気学・九星気学の相性へリンク", "kyusei/" in hrefs and "kyusei/aisho/" in hrefs, str(hrefs))
    soon = await page.evaluate("() => [...document.querySelectorAll('#uranau .tool.is-soon h3')].map(h => h.textContent)")
    check(f"[{label}] TOP：九星気学は準備中から外れ、四柱推命などは準備中のまま", "九星気学のカルテ" not in soon and "四柱推命のカルテ" in soon, str(soon))
    await page.goto(base + "aisho/")
    check(f"[{label}] 相性TOPから九星気学の相性へリンク", await page.locator("a[href='../kyusei/aisho/']").count() == 1)
    await page.goto(base + "learn/")
    check(f"[{label}] 占いを知るTOPから九星気学の説明へリンク", await page.locator("a[href='../kyusei/#kyusei-about']").count() == 1)

    check(f"[{label}] console error 0", not errors, " | ".join(errors[:3]))
    check(f"[{label}] alert() が出ない", not dialogs, " | ".join(dialogs))
    await ctx.close()


async def main():
    httpd, base = serve()
    async with async_playwright() as pw:
        browser = await pw.chromium.launch()
        await run(browser, base, "PC", {"width": 1280, "height": 900}, False)
        await run(browser, base, "SP375", {"width": 375, "height": 740}, True)
        await browser.close()
    httpd.shutdown()
    ng = [r for r in results if not r[1]]
    print(f"\n{len(results) - len(ng)} / {len(results)} 件 OK")
    sys.exit(1 if ng else 0)


if __name__ == "__main__":
    if SHOTS:
        os.makedirs(SHOTS, exist_ok=True)
    asyncio.run(main())
