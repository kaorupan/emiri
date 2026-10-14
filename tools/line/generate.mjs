/*
 * LINE で受け取る無料の総合鑑定書
 *   line/          入力フォーム（LINE の LIFF で開く）
 *   line/kantei/   鑑定書の表示（URL の ?d= に入力内容を入れて渡す。検索に出さない）
 *
 *   node tools/line/generate.mjs
 *
 * site.config.json の liffId（LINE Developers の LIFF ID。公開される値）が空の間は、フォームは「準備中」になる。
 * 入力内容はサーバーに送らない。フォームの中で鑑定書の URL を作り、LINE のトークに送って開く。
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const config = JSON.parse(fs.readFileSync(path.join(ROOT, "site.config.json"), "utf8"));
const LIFF = String(config.liffId || "").trim();
if (LIFF && !/^\d{6,12}-[A-Za-z0-9]{6,16}$/.test(LIFF)) throw new Error("liffId の形式が正しくありません: " + LIFF);
const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

const TEMPLATE = fs.readFileSync(path.join(ROOT, "learn/suhijutsu/index.html"), "utf8");
function head(rel, depth, title, desc, extra) {
  const up = "../".repeat(depth);
  let out = TEMPLATE.slice(0, TEMPLATE.indexOf("<main"))
    .replace(/<title>.*?<\/title>/, `<title>${esc(title)}</title>`)
    .replace(/<meta name="description" content=".*?">/, `<meta name="description" content="${esc(desc)}">\n<meta name="robots" content="noindex">`)
    .replace(/https:\/\/emiri-uranai\.com\/learn\/suhijutsu\//g, `https://emiri-uranai.com/${rel}`)
    .replace(/<meta property="og:title" content=".*?">/, `<meta property="og:title" content="${esc(title)}">`)
    .replace(/<meta property="og:description" content=".*?">/, `<meta property="og:description" content="${esc(desc)}">`)
    .replace('<li><a href="../../learn/" aria-current="page">占いを知る</a></li>', '<li><a href="../../learn/">占いを知る</a></li>');
  out = out.replace('<link rel="stylesheet" href="../../assets/css/common.css">', '<link rel="stylesheet" href="../../assets/css/common.css">\n' + extra);
  return depth === 2 ? out : out.replace(/"\.\.\/\.\.\//g, `"${up}`);
}
const foot = (depth) => {
  const f = TEMPLATE.slice(TEMPLATE.indexOf("<footer"));
  return depth === 2 ? f : f.replace(/"\.\.\/\.\.\//g, `"${"../".repeat(depth)}`);
};
function write(rel, html) {
  const file = path.join(ROOT, rel, "index.html");
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, html);
}

// ---------- 入力フォーム ----------
const formScripts = (LIFF ? ['<script src="https://static.line-scdn.net/liff/edge/2/sdk.js" charset="utf-8"></script>'] : [])
  .concat(["core/date.js", "core/dom.js", "core/birthdate-field.js", "core/kantei-link.js", "pages/line-form.js"].map((s) => `<script defer src="../assets/js/${s}"></script>`)).join("\n");
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

const formBody = `  <section class="hero hero-compact">
    <p class="eyebrow">FREE READING</p>
    <h1>あなただけの鑑定書</h1>
    <p>数秘術・九星気学・四柱推命・西洋占星術など12の占術で、あなたを一冊に読み解く総合鑑定書を、LINEで無料でお届けします。</p>
  </section>

  ${LIFF ? "" : `<p class="notice"><span class="soon-badge">準備中</span> LINEでのお届けは、まもなく始まります。</p>`}

  <form id="line-form" class="card order-form" novalidate data-liff="${esc(LIFF)}"${LIFF ? "" : " data-closed"}>
    <h2 class="order-h">あなたについて</h2>
${nameFields("line-self", "お名前", "鑑定書の中で「〇〇さん」とお呼びする名前です。姓と名の両方を入れると「名前が持つ力」（姓名判断）の章が加わります。")}
    <div data-birthdate="line-self"></div>
${timeField("line-self")}
    <p class="bd-hint">出生時刻がわかると紫微斗数の章が加わり、西洋占星術・インド占星術もより正確になります。わからなければ空けたままで大丈夫です。</p>

    <details class="order-partner" id="line-partner">
      <summary>相性を見たいお相手を1人追加する（任意）</summary>
${nameFields("line-partner", "お相手のお名前", "姓と名の両方を入れると、名前の相性も読み解きます。お相手の情報は鑑定書を作るためだけに使い、保存しません。")}
      <div data-birthdate="line-partner"></div>
${timeField("line-partner")}
    </details>

    <label class="order-agree"><input type="checkbox" id="line-agree"> <span><a href="../privacy/#line" target="_blank" rel="noopener">プライバシーポリシー</a>を確認しました</span></label>
    <p class="bd-error" id="line-error" role="alert" hidden></p>
    <button type="submit" class="btn" id="line-submit"${LIFF ? "" : " disabled"}>${LIFF ? "鑑定書を受け取る（無料）" : "準備中"}</button>
    <p class="kyusei-meta">入力内容は当サイトのサーバーには送りません。鑑定書は、あなたのLINEのトークに届くリンクから、いつでも読み返せます。</p>
  </form>
`;
write("line", head("line/", 1, "LINEで受け取る無料の総合鑑定書｜えみり",
  "えみりの総合鑑定書をLINEで無料でお届けします。12の占術であなたを一冊に読み解き、お名前や相性のお相手を入れると章が増えます。",
  `<link rel="stylesheet" href="../assets/css/order.css">\n${formScripts}`) + `<main id="main" class="wrap-narrow">\n${formBody}</main>\n\n` + foot(1));

// ---------- 鑑定書の表示 ----------
const sample = fs.readFileSync(path.join(ROOT, "premium/sample/index.html"), "utf8");
const engineScripts = (sample.match(/<script defer src="[^"]+"><\/script>/g) || []).filter((s) => !s.includes("pages/kantei-page.js"));
const kanteiScripts = [...engineScripts, '<script defer src="../../assets/js/core/kantei-link.js"></script>', '<script defer src="../../assets/js/pages/kantei-page.js"></script>', '<script defer src="../../assets/js/pages/line-kantei.js"></script>'].join("\n");
const kanteiBody = `  <section class="hero hero-compact kantei-intro kantei-noprint">
    <p class="eyebrow">YOUR READING</p>
    <h1>あなたの総合鑑定書</h1>
    <p>このページは、LINEのトークに届いたリンクからいつでも開けます。「PDFで保存・印刷」から保存もできます。</p>
    <p><button type="button" class="btn" id="kantei-print" hidden>PDFで保存・印刷</button></p>
  </section>

  <div id="kantei-root" data-line>
    <p class="notice kantei-noprint">鑑定書を読み込んでいます。表示されない場合は、JavaScriptを有効にしてください。</p>
  </div>
`;
write("line/kantei", head("line/kantei/", 2, "あなたの総合鑑定書｜えみり",
  "えみりの総合鑑定書をLINEで受け取った方のためのページです。12の占術で読み解いたあなたの鑑定書を、いつでも読み返し、PDFで保存できます。",
  `<link rel="stylesheet" href="../../assets/css/kantei.css">\n${kanteiScripts}`) + `<main id="main" class="wrap">\n${kanteiBody}</main>\n\n` + foot(2));

console.log(`line/・line/kantei/ を作成（LIFF：${LIFF ? LIFF : "未設定＝準備中"}）`);
