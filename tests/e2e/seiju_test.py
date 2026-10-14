import re
"""星獣カルテのブラウザ動作確認（Playwright / Chromium）

使い方（リポジトリのルートで）:
    python3 tests/e2e/seiju_test.py            # 結果だけ表示
    python3 tests/e2e/seiju_test.py --shots DIR # スクリーンショットも保存
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
SHOTS = sys.argv[sys.argv.index("--shots") + 1] if "--shots" in sys.argv else None
PAGES = ["", "suhijutsu/", "suhijutsu/aisho/", "tarot/", "seiju/", "seiju/aisho/", "aisho/", "learn/", "learn/suhijutsu/"]
PERSONAL_ORDER = ["あなたの星獣カルテ", "あなたの星獣「", "季節属性：", "月のリズム：", "になった理由", "基本性格", "強み",
                  "隠れた一面", "苦手になりやすいこと", "仕事・才能", "恋愛", "人間関係", "成長のヒント", "次にできること"]
COMPAT_ORDER = ["1:あなたの星獣", "2:お相手の星獣", "3:ふたりの総合相性", "4:詳細な相性", "5:親密さ・スキンシップの相性"]

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


async def run(browser, base, label, viewport, mobile):
    print(f"== {label}")
    ctx = await browser.new_context(viewport=viewport, is_mobile=mobile, has_touch=mobile)
    await ctx.route("https://pagead2.googlesyndication.com/**", lambda r: r.fulfill(status=200, content_type="application/javascript", body=""))  # 広告は読み込まない
    await ctx.route(re.compile(r"^https://[^/]*a8\.net/"), lambda r: r.fulfill(status=200, content_type="image/gif", body=b"GIF89a\x01\x00\x01\x00\x80\x00\x00\x00\x00\x00\xff\xff\xff!\xf9\x04\x01\x00\x00\x00\x00,\x00\x00\x00\x00\x01\x00\x01\x00\x00\x02\x02D\x01\x00;"))  # アフィリエイトの画像も読み込まない
    page = await ctx.new_page()
    errors, dialogs = [], []
    page.on("console", lambda m: m.type == "error" and errors.append(m.text))
    page.on("pageerror", lambda e: errors.append(str(e)))
    page.on("dialog", lambda d: (dialogs.append(d.message), asyncio.ensure_future(d.dismiss())))

    await page.goto(base + "seiju/")
    await page.evaluate("() => localStorage.clear()")
    await page.reload()

    # ---- 個人鑑定 ----
    await fill(page, "self", "1992", "1", "21")
    await page.click("#seiju-form button[type=submit]")
    await page.wait_for_selector("#seiju-result:not([hidden])")
    name = await page.text_content("#seiju-summary .seiju-name")
    check(f"[{label}] 1992-01-21 → 月影の猫（静けさの季節 × 満ちた月）", name == "月影の猫", name)
    titles = await page.evaluate("() => [...document.querySelectorAll('#seiju-result section h2')].map(h => h.textContent.trim())")
    ok = len(titles) == len(PERSONAL_ORDER) and all(t.startswith(p) or p in t for t, p in zip(titles, PERSONAL_ORDER))
    check(f"[{label}] 個人鑑定の表示順（要約→星獣→季節→月→理由→性格…→成長→次）", ok, " / ".join(titles))
    reason = await page.text_content("#seiju-reason")
    check(f"[{label}] 「なった理由」に季節・月のリズム・月齢・星獣名が入る", all(w in reason for w in ["静けさの季節", "満ちた月", "月齢", "月影の猫", "になりました"]) or ("約" in reason and "日目" in reason and "月影の猫" in reason), reason[:80])
    current = await page.evaluate("() => [...document.querySelectorAll('#seiju-reason .seiju-map td.is-current small')].map(e => e.textContent)")
    check(f"[{label}] 12星獣の地図で自分の星獣だけが強調される", current == ["月影の猫"], str(current))
    hidden = await page.text_content("#seiju-hidden")
    weak = await page.text_content("#seiju-weakness")
    check(f"[{label}] 隠れた一面と苦手なことが別の項目", "情が深い" in hidden and "気分" in weak, f"{hidden[:30]} / {weak[:30]}")
    no_estimated = await page.locator("#seiju-summary .seiju-badge-estimated").count() == 0
    check(f"[{label}] 1992年は「推定」表示なし", no_estimated)
    if SHOTS:
        await page.screenshot(path=os.path.join(SHOTS, f"{label}-seiju-result.png"), full_page=True)

    # リロードしても同じ星獣（保存なしで再入力）
    await page.reload()
    await fill(page, "self", "1992", "1", "21")
    await page.click("#seiju-form button[type=submit]")
    await page.wait_for_selector("#seiju-result:not([hidden])")
    check(f"[{label}] リロード後も同じ星獣", await page.text_content("#seiju-summary .seiju-name") == name)

    for y, m, d in [("0001", "1", "1"), ("9999", "12", "31")]:
        await page.goto(base + "seiju/")
        await fill(page, "self", y, m, d)
        await page.click("#seiju-form button[type=submit]")
        await page.wait_for_selector("#seiju-result:not([hidden])")
        badge = await page.locator("#seiju-summary .seiju-badge-estimated").count()
        note = await page.text_content("#seiju-reason")
        check(f"[{label}] {y}-{m}-{d} → 結果が出て「推定」と明記（正確とは表示しない）", badge == 1 and "推定" in note)

    await page.goto(base + "seiju/")
    await fill(page, "self", "2024", "2", "29")
    await page.click("#seiju-form button[type=submit]")
    await page.wait_for_selector("#seiju-result:not([hidden])")
    check(f"[{label}] 2024-02-29 → 結果が出る", bool(await page.text_content("#seiju-summary .seiju-name")))

    for y, m, d, word in [("2023", "2", "29", "存在しない日付"), ("10000", "1", "1", "4桁"), ("", "", "", "生年月日を入力")]:
        await page.goto(base + "seiju/")
        await fill(page, "self", y, m, d)
        await page.click("#seiju-form button[type=submit]")
        err = page.locator("#bd-self-error")
        text = (await err.text_content()) or ""
        hidden = await page.get_attribute("#seiju-result", "hidden") is not None
        check(f"[{label}] {y or '空欄'}-{m}-{d} → 入力欄の下にエラー・結果は出ない", await err.is_visible() and word in text and hidden, text)

    # ---- 保存（共通プロフィール） ----
    await page.goto(base + "seiju/")
    await page.evaluate("() => localStorage.clear()")
    await page.reload()
    await fill(page, "self", "1992", "1", "21")
    await page.click("#seiju-form button[type=submit]")
    check(f"[{label}] 保存を選ばなければ何も保存しない", await page.evaluate("() => localStorage.length") == 0)
    await page.check("#bd-self-save")
    await page.click("#seiju-form button[type=submit]")
    raw = await page.evaluate("() => localStorage.getItem('uranai-karute:profile')")
    check(f"[{label}] 保存を選ぶと共通プロフィール（生年月日だけ）に保存", raw is not None and "1992" in raw, raw or "")

    # ---- 相性 ----
    await page.goto(base + "seiju/aisho/")
    pre = await page.input_value("#bd-self-year")
    check(f"[{label}] 相性ページで自分の生年月日が入っている（数秘術と共通のプロフィール）", pre == "1992", pre)
    await page.click("#seiju-aisho-form button[type=submit]")
    check(f"[{label}] 相性：お相手が空欄ならエラー", await page.locator("#bd-partner-error").is_visible())
    await fill(page, "partner", "1991", "8", "20")
    await page.click("#seiju-aisho-form button[type=submit]")
    await page.wait_for_selector("#seiju-aisho-result:not([hidden])")
    order = await page.evaluate("() => [...document.querySelectorAll('#seiju-aisho-result-body > section')].map(s => s.dataset.order + ':' + s.querySelector('h2').textContent.trim())")
    check(f"[{label}] 相性の表示順 1人目→2人目→総合→詳細→親密さ（最後）", order == COMPAT_ORDER, " / ".join(order))
    label_text = await page.text_content("#seiju-aisho-total .seiju-category-label")
    check(f"[{label}] 総合相性は言葉で表示（共鳴しやすい／補い合いやすい／刺激を与え合う／ペース調整が必要）", label_text in ["共鳴しやすい", "補い合いやすい", "刺激を与え合う", "ペース調整が必要"], label_text)
    body = await page.text_content("#seiju-aisho-result")
    check(f"[{label}] 直接的な表現・点数を使わない", "セックス" not in body and not re.search(r"\d+\s*点|/\s*100", body), "")
    check(f"[{label}] 独自のエンターテインメント占いと明記", "独自のエンターテインメント占い" in body)
    raw2 = await page.evaluate("() => localStorage.getItem('uranai-karute:profile')")
    check(f"[{label}] お相手の生年月日は保存しない", "1991" not in (raw2 or ""), raw2 or "")
    if SHOTS:
        await page.screenshot(path=os.path.join(SHOTS, f"{label}-seiju-aisho.png"), full_page=True)

    # ---- 画面の健全性 ----
    for p in ["seiju/", "seiju/aisho/"]:
        await page.goto(base + p)
        check(f"[{label}] /{p} H1 が1つ", await page.locator("h1").count() == 1)
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
    check(f"[{label}] 全9ページ：リンク切れ・禁止表現 0", not broken, "; ".join(broken))
    check(f"[{label}] 全9ページ：横はみ出しなし", not overflow_pages, str(overflow_pages))

    await page.goto(base)
    hrefs = await page.evaluate("() => [...document.querySelectorAll('#uranau a')].map(a => a.getAttribute('href'))")
    check(f"[{label}] TOPから星獣カルテ・星獣の相性へリンク", "seiju/" in hrefs and "seiju/aisho/" in hrefs, str(hrefs))
    await page.goto(base + "aisho/")
    check(f"[{label}] 相性TOPから星獣カルテの相性へリンク", await page.locator("a[href='../seiju/aisho/']").count() == 1)

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
