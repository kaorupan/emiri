#!/usr/bin/env node
/*
 * アフィリエイト（電話占い・チャット占いなどの紹介）枠を各ページに入れる
 *
 *   node tools/affiliate/inject.mjs
 *
 * 紹介する案件は tools/affiliate/programs.json に書く（ASP の管理画面でもらったリンクをそのまま使う）。
 *   { "programs": [ {
 *       "name": "表示名", "url": "https://px.a8.net/…（広告リンク）",
 *       "pixel": "https://www…a8.net/0.gif?…（あれば。表示計測用の1×1画像）",
 *       "lead": "ひとことの紹介文（事実だけ。誇張しない）",
 *       "themes": ["love", "general"],      // love＝恋愛・相性のページ、general＝そのほかの占いページ、stone＝パワーストーンのページ（ショップ用。format は "shop"）
 *       "rank": { "love": 1, "general": 2 },  // 並び順（小さいほど上。なければ書いた順の後ろ）
 *       "active": true
 *   } ] }
 * 案件が1つもなければ、枠は出さない（何度実行しても同じ結果になる）。
 *
 * 枠は LINE の案内（<!--line-cta-->）の前、なければ </main> の直前に <!--aff-->…<!--/aff--> で入れる。「PR」を必ず表示する（ステルスマーケティング規制）。
 * 運営者情報・規約・本格占いのページ（有料の鑑定書）には入れない。
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const SKIP_DIRS = new Set([".git", ".github", "node_modules", "tests", "tools", "worker", "assets"]);
const NO_ADS = /^(about|privacy|contact|tokushoho|premium|line)\//;  // line/ は LINE の中で開くフォーム（LINE内の広告掲載は案件ごとの条件を確認してから）
const LOVE = /^(fukuen|kataomoi)\/|(^|\/)aisho\/|^tesou\/(renai|kekkonsen|tamanokoshisen|ninkisen)\/|^yume\/(koi|koibito|sukinahito|motokare|kisu|uwaki|kekkon|kokuhaku|shitto)\/|^hokuro\/(renai|mejiri|namida|kuchibiru)\//;

const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const MARK = /\n?<!--aff-->[\s\S]*?<!--\/aff-->\n?/;
// ページの最初（ファーストビュー）に出す広告の表示（ステマ規制・ASPの掲載ルール）
const PR_MARK = /\n?<!--pr-notice-->[\s\S]*?<!--\/pr-notice-->/;
const prNotice = (depth) => `\n<!--pr-notice--><p class="pr-notice">このページには広告（PR）を含みます。<a href="${"../".repeat(depth)}privacy/#affiliate">広告について</a></p><!--/pr-notice-->`;

export function loadPrograms(root = ROOT) {
  const file = path.join(root, "tools/affiliate/programs.json");
  if (!fs.existsSync(file)) return [];
  const data = JSON.parse(fs.readFileSync(file, "utf8"));
  return (data.programs || []).filter((p) => p && p.active !== false && /^https:\/\//.test(p.url || "") && p.name);
}

const STONE = /^powerstone\//;
const FUSUI = /^fusui\//;
const GAMBLE = /^gamble\//;
// 適職占い：転職・キャリアの相談
const CAREER = /^tekishoku\//;
// 相性占いのページ：占い師への相談と、出会い・婚活のサービス
const AISHO = /(^|\/)aisho\/|^uchuban\/|^suhijutsu\/namae\/|^horoscope\/seiza-aisho\//;
const SHOP_THEMES = ["stone", "fusui"];

export function themeOf(rel) {
  if (NO_ADS.test(rel)) return null;
  if (STONE.test(rel) || GAMBLE.test(rel)) return "stone";
  if (CAREER.test(rel)) return "career";
  if (AISHO.test(rel)) return "aisho";
  if (FUSUI.test(rel)) return "fusui";
  return LOVE.test(rel) ? "love" : "general";
}

const HEAD = {
  love: { title: "恋の悩みを、占い師に相談するなら", text: "相性や気持ちのすれ違いなど、ひとりで抱えている悩みは、占い師に直接相談することもできます。話しやすい相談のしかたで選んでください。" },
  fusui: { title: "風水グッズを探すなら｜ショップの選び方", text: "部屋づくりに鏡や置き物などをとり入れたいときは、開運グッズを扱うショップで探せます。大きさや置き場所、返品の条件も確かめてから選びましょう。" },
  stone: { title: "パワーストーンを選ぶなら｜ショップの選び方", text: "気になる石が見つかったら、天然石を扱うショップで実物の写真やサイズを見て選べます。選ぶときは、石の名前だけでなく、表記や返品の条件も確かめましょう。" },
  career: { title: "転職やキャリアを相談したいときは", text: "占いで見えた「向いている仕事」や「動きやすい時期」を、実際の一歩につなげたいときは、転職やキャリアの相談ができるサービスがあります。自分に合う相談のしかたで選んでください。" },
  aisho: { title: "ふたりの関係を進めたいときは", text: "相性占いの結果をもとに、気持ちのすれ違いを占い師に相談したり、これからの出会いを探したりできるサービスがあります。いまの状況に合うものを選んでください。" },
  general: { title: "結果をもっと詳しく聞きたいときは", text: "えみりの無料占いは、生年月日などから計算した結果を読むものです。自分の状況を話して読んでほしいときは、占い師に相談できるサービスもあります。相談のしかたで選べます。" }
};

// 相談の形式ごとの説明（サービスの優劣ではなく、形式の違い）
const FORMAT = {
  phone: { label: "電話で相談", fit: "声で話しながら、その場で質問を重ねたい人", check: "料金が時間（分）ごとかどうかと、通話時間の目安" },
  chat: { label: "チャットで相談", fit: "文字のほうが落ち着いて話せる人、声を出せない場所から相談したい人", check: "料金が時間ごとか、文字数・回数ごとか" },
  goods: { label: "開運グッズのショップ", fit: "部屋に置く鏡や置き物を、写真や大きさを見比べて選びたい人", check: "大きさ・素材が置き場所に合うか、返品・交換の条件" },
  shop: { label: "天然石のショップ", fit: "実物の写真やサイズを見比べて、自分に合う石を選びたい人", check: "天然石であることの表記、腕回りのサイズの選び方、返品・交換の条件" },
  agent: { label: "転職エージェント", fit: "求人の紹介から、応募書類や面接の準備まで手伝ってほしい人", check: "対象の年齢・経歴と、相談できる地域や方法（オンラインかどうか）" },
  coaching: { label: "キャリア相談（コーチング）", fit: "転職するかどうかも含めて、やりたいことから整理したい人", check: "料金がかかるかどうかと、相談の回数・期間" },
  matching: { label: "マッチング・紹介サービス", fit: "自分のペースで、新しい出会いを探したい人", check: "料金のしくみ（男女や会員の種類でちがうか）と、本人確認のしかた" },
  compare: { label: "結婚相談所の比較", fit: "どの結婚相談所がいいか、いくつか比べてから決めたい人", check: "紹介される相談所と、資料請求のあとの連絡のしかた" },
  agency: { label: "結婚相談所", fit: "結婚を前提に、相談しながら真剣に相手を探したい人", check: "入会金・月会費などの費用と、無料の相談や来店があるか" },
  message: { label: "メッセージで相談", fit: "時間を気にせず、文章でじっくり相談したい人", check: "返事が届くまでの目安と、1回あたりの料金" }
};

// 公式サイトと提携条件で確認できた情報だけ（確認日つき）
function verifiedRows(p) {
  const v = p.verified || {};
  if (!v.checkedOn) return [];
  const shop = p.format === "shop" || p.format === "goods";
  return [[shop ? "価格の目安" : "通常料金", v.price], [shop ? "商品の例" : "料金の例", v.priceExample], [shop ? "キャンペーン" : "初回特典", v.firstOffer], [shop ? "条件" : "特典の条件", v.offerConditions], ["情報の確認日", v.checkedOn]].filter((r) => r[1]);
}

export function box(theme, programs, depth) {
  // パワーストーンのページ：ショップの案件がまだなければ、ふだんの相談の案内を出す
  // ショップ用のテーマ（パワーストーン・風水）：案件がまだなければ、ふだんの相談の案内を出す
  if (SHOP_THEMES.includes(theme) && !programs.some((p) => p.themes && p.themes.includes(theme))) theme = "general";
  const rank = (p) => (p.rank && Number.isFinite(p.rank[theme]) ? p.rank[theme] : 99);
  const list = programs.filter((p) => !p.themes || p.themes.includes(theme))
    .map((p, i) => [p, i]).sort((a, b) => rank(a[0]) - rank(b[0]) || a[1] - b[1]).map((x) => x[0]).slice(0, theme === "aisho" ? 4 : 3);
  if (!list.length) return "";
  const items = list.map((p) => {
    const f = FORMAT[p.format] || null;
    const rows = (p.about ? [[p.format === "shop" || p.format === "goods" ? "ショップの特徴" : "サービスの特徴", p.about]] : []).concat(f ? [["向いている人", f.fit], ["利用前に確認", f.check]] : []).concat(verifiedRows(p));
    return `      <li class="consult-item">
        ${f ? `<p class="consult-format">${f.label}</p>` : ""}
        <p class="consult-name">${esc(p.name)}</p>
        ${rows.length ? `<dl class="consult-facts">${rows.map((r) => `<div class="consult-fact"><dt>${esc(r[0])}</dt><dd>${esc(r[1])}</dd></div>`).join("")}</dl>` : ""}
        <a class="btn btn-ghost consult-btn" href="${esc(p.url)}" target="_blank" rel="nofollow sponsored noopener" data-track="aff_click" data-service="${esc(p.id || "")}" data-position="page-end" data-theme="${theme}">${p.format === "shop" || p.format === "goods" ? "公式ショップで商品と条件を見る" : theme === "career" || ["matching", "agency", "compare"].includes(p.format) ? "公式サイトでサービス内容と条件を確認する" : "公式サイトで料金・特典条件を確認する"}</a>${p.pixel ? `<img class="aff-pixel" src="${esc(p.pixel)}" width="1" height="1" alt="" loading="lazy">` : ""}
      </li>`;
  }).join("\n");
  const h = HEAD[theme];
  return `<!--aff-->
  <aside class="card aff-box consult" id="consult" aria-labelledby="consult-title">
    <p class="aff-pr">PR・広告</p>
    <h2 class="aff-title" id="consult-title">${h.title}</h2>
    <p class="aff-text">${h.text}</p>
    <ul class="consult-list">
${items}
    </ul>
    <p class="aff-note">${SHOP_THEMES.includes(theme)
      ? "価格やキャンペーンは変わることがあるため、確認できていないものは載せていません。購入する前に、公式ショップで最新の価格と条件を確かめてください。ここでの説明はショップの選び方をまとめたもので、優劣を示すものではありません。"
      : theme === "career" || theme === "aisho"
        ? "料金や特典、キャンペーンは変わることがあるため、確認できていないものは載せていません。申し込む前に、公式サイトで最新の内容と条件を確かめてください。ここでの説明はサービスの種類の違いをまとめたもので、優劣を示すものではありません。占いの結果は、転職や交際を決めるものではありません。"
        : "料金や初回特典は変わることがあるため、確認できていないものは載せていません。申し込む前に、公式サイトで最新の料金と条件を確かめてください。ここでの説明は相談の形式の違いをまとめたもので、サービスの優劣を示すものではありません。"}</p>
    <p class="aff-note aff-disclosure">この枠は広告です。リンク先のサービスを利用されると、えみりに紹介料が支払われることがあります。<a href="${"../".repeat(depth)}privacy/#affiliate">広告と紹介料について</a></p>
  </aside>
<!--/aff-->`;
}

// TOP：相談サービスの短い案内（くわしい比較は soudan/ へ）
export function compactBox(programs) {
  const list = programs.filter((p) => !p.themes || p.themes.includes("general"))
    .map((p, i) => [p, i]).sort((a, b) => ((a[0].rank && a[0].rank.general) || 99) - ((b[0].rank && b[0].rank.general) || 99) || a[1] - b[1]).map((x) => x[0]).slice(0, 3);
  if (!list.length) return "";
  return `<!--aff-->
  <aside class="card aff-box aff-compact" id="consult" aria-labelledby="consult-title">
    <p class="aff-pr">PR・広告</p>
    <h2 class="aff-title" id="consult-title">占い師に相談したいときは</h2>
    <p class="aff-text">電話・チャット・メッセージで、占い師に直接相談できるサービスがあります。</p>
    <ul class="aff-compact-list">
${list.map((p) => `      <li><a href="${esc(p.url)}" target="_blank" rel="nofollow sponsored noopener" data-track="aff_click" data-service="${esc(p.id || "")}" data-position="top" data-theme="general">${esc(p.name)}</a><span>${(FORMAT[p.format] || {}).label || ""}</span>${p.pixel ? `<img class="aff-pixel" src="${esc(p.pixel)}" width="1" height="1" alt="" loading="lazy">` : ""}</li>`).join("\n")}
    </ul>
    <p><a href="soudan/">相談のしかたの違いと選び方を見る ›</a></p>
    <p class="aff-note aff-disclosure">この枠は広告です。リンク先のサービスを利用されると、えみりに紹介料が支払われることがあります。<a href="privacy/#affiliate">広告と紹介料について</a></p>
  </aside>
<!--/aff-->`;
}

export function apply(html, rel, programs) {
  let out = html.replace(MARK, "\n").replace(PR_MARK, "");
  const theme = themeOf(rel);
  if (!theme) return out;
  const depth = rel.split("/").length - 1;
  const b = rel === "index.html" ? compactBox(programs) : box(theme, programs, depth);
  if (!b || !out.includes("</main>")) return out;
  out = out.replace(/(<main[^>]*>)/, `$1${prNotice(depth)}`);
  // LINE の案内（<!--line-cta-->）があれば、その前に入れる（相談の案内 → LINE の順）
  const i = out.indexOf("<!--line-cta-->");
  if (i >= 0) return out.slice(0, i) + b + "\n" + out.slice(i);
  return out.replace("\n</main>", "\n" + b + "\n</main>");
}

function walk(dir, root, out = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (e.isDirectory()) { if (!SKIP_DIRS.has(e.name)) walk(path.join(dir, e.name), root, out); }
    else if (e.name.endsWith(".html")) out.push(path.relative(root, path.join(dir, e.name)).split(path.sep).join("/"));
  }
  return out;
}

export function run(root = ROOT) {
  const programs = loadPrograms(root);
  let changed = 0;
  for (const rel of walk(root, root)) {
    const file = path.join(root, rel);
    const before = fs.readFileSync(file, "utf8");
    const after = apply(before, rel, programs);
    if (after !== before) { fs.writeFileSync(file, after); changed++; }
  }
  return { programs: programs.length, changed };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const r = run();
  console.log(`アフィリエイト：案件 ${r.programs} 件、更新したページ ${r.changed}`);
}
