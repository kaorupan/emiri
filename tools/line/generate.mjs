/*
 * LINE で受け取る無料の総合鑑定書
 *   line/          入力フォーム（LINE の LIFF で開く）
 *   line/kantei/   鑑定書の表示（URL の ?d= に入力内容を入れて渡す。検索に出さない）
 *
 *   node tools/line/generate.mjs
 *
 * site.config.json の liffId（LINE Developers の LIFF ID。公開される値）が空の間は、フォームは「準備中」になる。
 *   line/guide/    登録の前に読む案内（見本・受け取り方・入力項目・配信・情報の扱い）
 * 入力内容はえみりのサーバー（データベース）には送らない。フォームの中で鑑定書の URL を作り、LINE のトークに送って開く。
 * そのため URL（入力内容を含む）は LINE のトークに残り、運営者も LINE 公式アカウントの管理画面で見られる。案内ではそのとおりに書く。
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
${nameFields("line-partner", "お相手のお名前", "姓と名の両方を入れると、名前の相性も読み解きます。お相手の情報は鑑定書を作るためだけに使い、配信やご案内には使いません。")}
      <div data-birthdate="line-partner"></div>
${timeField("line-partner")}
    </details>

    <label class="order-agree"><input type="checkbox" id="line-agree"> <span><a href="../privacy/#line" target="_blank" rel="noopener">プライバシーポリシー</a>を確認しました</span></label>
    <p class="bd-error" id="line-error" role="alert" hidden></p>
    <button type="submit" class="btn" id="line-submit"${LIFF ? "" : " disabled"}>${LIFF ? "鑑定書を受け取る（無料）" : "準備中"}</button>
    <p class="kyusei-meta">入力内容は、鑑定書のリンクの中に入れて、あなたのLINEのトークに送られます（えみりのサイトのデータベースには保存しません）。このトークは、えみりの運営者もLINE公式アカウントの管理画面で見ることができます。<a href="guide/#data">くわしく</a></p>
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

// ---------- 登録の前に読む案内 ----------
const kl = (await import(path.join(ROOT, "assets/js/core/kantei-link.js"))).default;
const SAMPLE = { p: { name: "見本はなこ", sei: "見本", mei: "はなこ", year: 1995, month: 4, day: 12 }, m: [2026, 10, 1] };
const sampleHref = `../kantei/?d=${kl.encode(SAMPLE)}&sample=1`;
const guideBody = `  <nav class="breadcrumb" aria-label="パンくずリスト">
    <ol>
      <li><a href="../../">えみり</a></li>
      <li aria-current="page">LINEで受け取る鑑定書</li>
    </ol>
  </nav>

  <section class="hero hero-compact">
    <p class="eyebrow">FREE READING · LINE</p>
    <h1>LINEで受け取る、無料の総合鑑定書</h1>
    <p>数秘術・九星気学・四柱推命・西洋占星術など12の占術で、性格・仕事・恋愛・お金・これから3年の流れを1冊にまとめた鑑定書です。友だち追加の前に、内容と受け取り方を確認できます。</p>
  </section>

  <section class="card prose" aria-labelledby="g-sample">
    <h2 id="g-sample">鑑定書の見本</h2>
    <p>架空の人物「見本はなこ」さん（1995年4月12日生まれ）の情報で作った見本です。実際の鑑定書と同じ形で表示されます。</p>
    <p><a class="btn btn-ghost" href="${sampleHref}" data-track="related_click" data-target="line-sample" data-position="line-guide">見本の鑑定書を見る</a></p>
  </section>

  <section class="card prose" aria-labelledby="g-steps">
    <h2 id="g-steps">受け取り方</h2>
    <ol>
      <li>下のボタンから、えみりのLINE公式アカウントを友だち追加します。</li>
      <li>LINEの中で入力フォームが開くので、呼び名と生年月日を入れます。</li>
      <li>「鑑定書を受け取る」を押すと、鑑定書のリンクがあなたのLINEのトークに届き、そのまま鑑定書が開きます。</li>
      <li>あとから読み返すときは、トークのリンクを開きます。いつものブラウザで開けば、PDFで保存や印刷もできます。</li>
    </ol>
    <p><strong>所要時間の目安：</strong>入力は1〜2分ほどです（任意の項目を入れる場合は少し長くなります）。</p>
  </section>

  <section class="card prose" aria-labelledby="g-fields">
    <h2 id="g-fields">入力する項目</h2>
    <ul>
      <li><strong>必須：</strong>呼び名、生年月日</li>
      <li><strong>任意：</strong>姓と名（入れると姓名判断の章が加わります）、出生時刻（入れると紫微斗数の章が加わります）</li>
      <li><strong>任意：</strong>相性を見たいお相手1人の呼び名・生年月日（姓名・出生時刻も任意）</li>
    </ul>
  </section>

  <section class="card prose" aria-labelledby="g-msg">
    <h2 id="g-msg">LINEで届くもの</h2>
    <ul>
      <li>鑑定書のリンク（入力したときに1回）</li>
      <li>友だち追加のあいさつと、えみりの占いの情報や、おすすめのサービスのご案内をお送りすることがあります。</li>
    </ul>
    <p>配信が不要になったときは、LINEでブロックすれば届かなくなります。</p>
  </section>

  <section class="card prose" aria-labelledby="data">
    <h2 id="data">入力した情報の扱い</h2>
    <h3>えみりのサイトで占うとき</h3>
    <p>サイトの無料占いは、生年月日をあなたの端末（スマホやパソコン）の中で計算します。生年月日をえみりのサーバーに送る仕組みはありません。</p>
    <h3>LINEで鑑定書を受け取るとき</h3>
    <ul>
      <li>入力した内容は、鑑定書のリンクの中に入れて、あなたのLINEのトークに、あなたから送られたメッセージとして届きます。</li>
      <li>このトークはLINEのサービス上に残り、えみりの運営者もLINE公式アカウントの管理画面で見ることができます。</li>
      <li>えみりのサイトに、入力内容を保存するデータベースはありません。鑑定書は、リンクの中の情報からあなたの端末で作られます。</li>
      <li>リンクには入力内容が含まれるため、ほかの人には共有しないでください。</li>
      <li>お相手の情報は鑑定書を作るためだけに使い、配信やご案内には使いません。</li>
    </ul>
    <p>くわしくは<a href="../../privacy/#line">プライバシーポリシー</a>をご覧ください。</p>
  </section>

  <section class="card line-guide-start" aria-labelledby="g-start">
    <h2 id="g-start">受け取る</h2>
    <p><a class="btn line-cta-btn" href="https://liff.line.me/${esc(LIFF)}" target="_blank" rel="noopener" data-track="line_click" data-target="liff" data-position="line-guide">LINEで友だち追加して受け取る</a></p>
    <p class="kyusei-meta">パソコンで見ている方は、スマホのカメラで読み取ってください。</p>
    <p><img src="../../assets/img/line-qr.svg" width="132" height="132" alt="LINEで鑑定書を受け取るQRコード" loading="lazy" class="line-guide-qr"></p>
  </section>
`;
if (LIFF) write("line/guide", head("line/guide/", 2, "LINEで受け取る無料の総合鑑定書｜見本と受け取り方｜えみり",
  "えみりの無料の総合鑑定書を、LINEで受け取る前に。見本、受け取り方、所要時間、入力する項目、届くメッセージ、入力した情報の扱いをまとめました。", "") + `<main id="main" class="wrap-narrow">\n${guideBody}</main>\n\n` + foot(2));

console.log(`line/・line/kantei/ を作成（LIFF：${LIFF ? LIFF : "未設定＝準備中"}）`);
