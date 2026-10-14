/*
 * 本格占いの「注文ページ」と「鑑定書ページ（購入者専用）」を作る
 *
 *   node tools/premium/generate.mjs
 *
 * site.config.json
 *   salesApiUrl  支払い確認API（worker/）のURL。例 https://emiri-api.xxxx.workers.dev
 *   salesOpen    true で販売開始。false の間は注文ボタンを押せない（準備中の表示）
 *
 * 販売開始にするときは salesOpen を true にしてこのスクリプトを実行する。
 * 本格占いのページ（premium/ と premium/sample/）の「準備中」も、注文ページへのボタンに切り替わる。
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const config = JSON.parse(fs.readFileSync(path.join(ROOT, "site.config.json"), "utf8"));
const API = String(config.salesApiUrl || "").trim().replace(/\/+$/, "");
const OPEN = config.salesOpen === true && Boolean(API);
const PRICE = "1,980円（税込）";
const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

const TEMPLATE = fs.readFileSync(path.join(ROOT, "learn/suhijutsu/index.html"), "utf8");
function head(rel, title, desc, extra, noindex) {
  let out = TEMPLATE.slice(0, TEMPLATE.indexOf("<main"))
    .replace(/<title>.*?<\/title>/, `<title>${esc(title)}</title>`)
    .replace(/<meta name="description" content=".*?">/, `<meta name="description" content="${esc(desc)}">` + (noindex ? `\n<meta name="robots" content="noindex">` : ""))
    .replace(/https:\/\/emiri-uranai\.com\/learn\/suhijutsu\//g, `https://emiri-uranai.com/${rel}`)
    .replace(/<meta property="og:title" content=".*?">/, `<meta property="og:title" content="${esc(title)}">`)
    .replace(/<meta property="og:description" content=".*?">/, `<meta property="og:description" content="${esc(desc)}">`)
    .replace('<li><a href="../../learn/" aria-current="page">占いを知る</a></li>', '<li><a href="../../learn/">占いを知る</a></li>')
    .replace('<li><a href="../../premium/">本格占い</a></li>', '<li><a href="../../premium/" aria-current="page">本格占い</a></li>');
  return out.replace('<link rel="stylesheet" href="../../assets/css/common.css">', '<link rel="stylesheet" href="../../assets/css/common.css">\n' + extra);
}
const FOOT = TEMPLATE.slice(TEMPLATE.indexOf("<footer"));
const crumb = (name) => `  <nav class="breadcrumb" aria-label="パンくずリスト">
    <ol>
      <li><a href="../../">えみり</a></li>
      <li><a href="../">本格占い</a></li>
      <li aria-current="page">${esc(name)}</li>
    </ol>
  </nav>
`;
function write(rel, html) {
  const file = path.join(ROOT, rel, "index.html");
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, html);
}

// ---------- 注文ページ ----------
const orderScripts = ["core/date.js", "core/dom.js", "core/birthdate-field.js", "pages/order-page.js"]
  .map((s) => `<script defer src="../../assets/js/${s}"></script>`).join("\n");
const nameFields = (p, legend, note) => `      <fieldset class="order-names">
        <legend class="bd-legend">${legend}</legend>
        <div class="order-row">
          <div class="order-cell order-cell-wide"><label for="${p}-name">呼び名<span class="order-req">必須</span></label><input id="${p}-name" class="bd-input" type="text" maxlength="20" autocomplete="off" placeholder="例 あかり"></div>
        </div>
        <div class="order-row">
          <div class="order-cell"><label for="${p}-sei">姓（任意）</label><input id="${p}-sei" class="bd-input" type="text" maxlength="10" autocomplete="off" placeholder="例 星川"></div>
          <div class="order-cell"><label for="${p}-mei">名（任意）</label><input id="${p}-mei" class="bd-input" type="text" maxlength="10" autocomplete="off" placeholder="例 あかり"></div>
        </div>
        <p class="bd-hint">${note}</p>
      </fieldset>`;
const timeField = (p) => `      <div class="order-row">
        <div class="order-cell"><label for="${p}-time">出生時刻（任意）</label><input id="${p}-time" class="bd-input" type="time"></div>
      </div>`;

const orderBody = `${crumb("総合鑑定書のお申し込み")}
  <section class="hero hero-compact">
    <p class="eyebrow">ORDER</p>
    <h1>総合鑑定書のお申し込み</h1>
    <p>生年月日などを入力し、お支払いに進みます。お支払いが終わると、すぐにあなたの鑑定書のページが開きます。</p>
  </section>

  ${OPEN ? "" : `<p class="notice"><span class="soon-badge">準備中</span> 現在、販売の開始に向けて準備しています。お申し込みはまだできません。</p>`}

  <form id="order-form" class="card order-form" novalidate data-api="${esc(API)}"${OPEN ? "" : " data-closed"}>
    <h2 class="order-h">あなたについて</h2>
${nameFields("order-self", "お名前", "鑑定書の中で「〇〇さん」とお呼びする名前です。姓と名の両方を入れると「名前が持つ力」（姓名判断）の章が加わります。")}
    <div data-birthdate="order-self"></div>
${timeField("order-self")}
    <p class="bd-hint">出生時刻がわかると紫微斗数の章が加わり、西洋占星術・インド占星術もより正確になります。わからなければ空けたままで大丈夫です。</p>

    <details class="order-partner" id="order-partner">
      <summary>相性のお相手を1人設定する（任意・料金に含まれます）</summary>
${nameFields("order-partner", "お相手のお名前", "姓と名の両方を入れると、名前の相性も読み解きます。")}
      <div data-birthdate="order-partner"></div>
${timeField("order-partner")}
    </details>

    <section class="order-confirm" id="order-confirm" hidden aria-labelledby="order-confirm-title" tabindex="-1">
      <h2 id="order-confirm-title" class="order-h">入力内容の確認</h2>
      <p>お支払いのあとは、入力内容を変更できません。もう一度ご確認ください。</p>
      <dl class="kantei-facts" id="order-summary"></dl>
    </section>

    <p class="order-price">総合鑑定書 ${PRICE}</p>
    <label class="order-agree"><input type="checkbox" id="order-agree"> <span><a href="../../tokushoho/" target="_blank" rel="noopener">特定商取引法に基づく表記</a>（デジタルコンテンツのため、お支払い後の返品・キャンセルはできません）と、<a href="../../privacy/" target="_blank" rel="noopener">プライバシーポリシー</a>を確認しました</span></label>
    <p class="bd-error" id="order-error" role="alert" hidden></p>
    <button type="submit" class="btn" id="order-submit"${OPEN ? "" : " disabled"}>${OPEN ? "入力内容を確認する" : "準備中"}</button>
    <p class="kyusei-meta">お支払いは決済サービスの Stripe（ストライプ）の画面で行います。カード番号を当サイトが受け取ることはありません。</p>
  </form>

  <section class="card prose" id="order-history" hidden aria-labelledby="order-history-title">
    <h2 id="order-history-title">この端末で購入した鑑定書</h2>
    <ul class="link-list" id="order-history-list"></ul>
  </section>

  <section class="card prose" aria-labelledby="order-faq">
    <h2 id="order-faq">よくあるご質問</h2>
    <h3>鑑定書はどこで読めますか？</h3>
    <p>お支払いが終わると、あなた専用の鑑定書のページが開きます。そのページのURLが、あとから読み返すための鍵になります。ブックマークするか、「PDFで保存・印刷」から保存してください。この端末で開いた鑑定書は、このページの下にも一覧で表示されます。</p>
    <h3>URLをなくしてしまいました</h3>
    <p><a href="../../contact/">お問い合わせ</a>から、お支払いに使ったメールアドレスとお支払いの日時をお知らせください。確認のうえ、鑑定書のURLをお送りします。</p>
    <h3>どんな内容が届きますか？</h3>
    <p><a href="../sample/">見本の鑑定書</a>で、構成と雰囲気をご覧いただけます。</p>
  </section>
`;
write("premium/order", head("premium/order/", "総合鑑定書のお申し込み｜えみり", "えみりの本格占い「総合鑑定書」（" + PRICE + "）のお申し込みページです。生年月日を入力してお支払いに進むと、すぐに鑑定書が読めます。",
  `<link rel="stylesheet" href="../../assets/css/kantei.css">\n<link rel="stylesheet" href="../../assets/css/order.css">\n${orderScripts}`) + `<main id="main" class="wrap-narrow">\n${orderBody}</main>\n\n` + FOOT);

// ---------- 鑑定書ページ（購入者専用・検索に出さない） ----------
const sample = fs.readFileSync(path.join(ROOT, "premium/sample/index.html"), "utf8");
const engineScripts = (sample.match(/<script defer src="[^"]+"><\/script>/g) || [])
  .filter((s) => !s.includes("pages/kantei-page.js"));
const kanteiScripts = [...engineScripts, '<script defer src="../../assets/js/pages/kantei-page.js"></script>', '<script defer src="../../assets/js/pages/kantei-view.js"></script>'].join("\n");
const kanteiBody = `${crumb("あなたの総合鑑定書")}
  <section class="hero hero-compact kantei-intro kantei-noprint">
    <p class="eyebrow">YOUR READING</p>
    <h1>あなたの総合鑑定書</h1>
    <p>このページのURLが、鑑定書を読み返すための鍵です。ブックマークするか、PDFで保存してください。URLはほかの人に教えないでください。</p>
    <p><button type="button" class="btn" id="kantei-print" hidden>PDFで保存・印刷</button></p>
  </section>

  <div id="kantei-root" data-api="${esc(API)}">
    <p class="notice kantei-noprint">鑑定書を読み込んでいます。表示されない場合は、JavaScriptを有効にしてください。</p>
  </div>
`;
write("premium/kantei", head("premium/kantei/", "あなたの総合鑑定書｜えみり", "えみりの本格占い「総合鑑定書」をご購入いただいた方の専用ページです。お支払い後に開いたURLから、あなたの鑑定書をいつでも読み返し、PDFで保存できます。", `<link rel="stylesheet" href="../../assets/css/kantei.css">\n${kanteiScripts}`, true)
  + `<main id="main" class="wrap">\n${kanteiBody}</main>\n\n` + FOOT);

// ---------- 本格占いのページの「準備中」⇔「申し込む」 ----------
function swap(rel, open, closed) {
  const file = path.join(ROOT, rel);
  const html = fs.readFileSync(file, "utf8");
  const re = /<!--buy-->[\s\S]*?<!--\/buy-->/;
  if (!re.test(html)) throw new Error(rel + " に <!--buy--> がありません");
  fs.writeFileSync(file, html.replace(re, `<!--buy-->${OPEN ? open : closed}<!--/buy-->`));
}
swap("premium/index.html",
  `<p><a class="btn premium-btn" href="order/">総合鑑定書を申し込む</a></p>`,
  `<p class="premium-soon"><span class="soon-badge">準備中</span></p>`);
swap("premium/sample/index.html",
  `<p><a class="btn premium-btn" href="../order/">総合鑑定書を申し込む</a></p>`,
  `<p><span class="soon-badge">準備中</span> 販売開始までもう少しお待ちください。</p>`);

console.log(`premium/order・premium/kantei を作成（販売：${OPEN ? "受付中" : "準備中"}）`);
