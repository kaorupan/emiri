/*
 * 吉方位：kippoui/index.html（調べるページ）と、年ごとのページ kippoui/YYYY/・本命星別 kippoui/YYYY/N/ を作る
 *
 *   node tools/kippoui/generate.mjs
 *
 * 年は「今日の気学上の年」と「その翌年」。毎日の自動更新（daily）でも実行し、立春で自動的に翌年分が増える。
 * 前の年のページは残す（リンクは一覧から外れるが、URLは生き続ける）。
 */
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const require = createRequire(import.meta.url);
const H = require(path.join(ROOT, "assets/js/engines/houi.js"));
const K = require(path.join(ROOT, "assets/js/engines/kyusei.js"));
const T = require(path.join(ROOT, "assets/js/content/houi-text.js"));
const D = require(path.join(ROOT, "assets/js/content/kyusei-data.js"));
const astro = require(path.join(ROOT, "assets/js/core/astro.js"));

const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const STAR = (n) => D.STARS[n];
const GRID = [["nw", "n", "ne"], ["w", "c", "e"], ["sw", "s", "se"]];

function todayJst() {
  const t = new Date(Date.now() + 9 * 3600e3);
  return { year: t.getUTCFullYear(), month: t.getUTCMonth() + 1, day: t.getUTCDate() };
}
const NOW_YEAR = K.calculateKyusei(process.env.KIPPOUI_TODAY ? JSON.parse(process.env.KIPPOUI_TODAY) : todayJst()).kigakuYear;
const YEARS = [NOW_YEAR, NOW_YEAR + 1];

function risshun(year) {
  const t = astro.jstDateTimeFromJulianDay(astro.solarLongitudeTime(year, 315) + 30 / 86400);
  return t;
}
function period(year) {
  const a = risshun(year), b = risshun(year + 1);
  const end = new Date(Date.UTC(b.year, b.month - 1, b.day - 1));
  return `${a.year}年${a.month}月${a.day}日（立春）〜${end.getUTCFullYear()}年${end.getUTCMonth() + 1}月${end.getUTCDate()}日`;
}

const TEMPLATE = fs.readFileSync(path.join(ROOT, "learn/suhijutsu/index.html"), "utf8");
function head(rel, title, desc, ogTitle, ogDesc, depth, extraHead = "") {
  let h = TEMPLATE.slice(0, TEMPLATE.indexOf("<main"))
    .replace(/<title>.*?<\/title>/, `<title>${esc(title)}</title>`)
    .replace(/<meta name="description" content=".*?">/, `<meta name="description" content="${esc(desc)}">`)
    .replace(/https:\/\/emiri-uranai\.com\/learn\/suhijutsu\//g, `https://emiri-uranai.com/${rel}`)
    .replace(/<meta property="og:title" content=".*?">/, `<meta property="og:title" content="${esc(ogTitle)}">`)
    .replace(/<meta property="og:description" content=".*?">/, `<meta property="og:description" content="${esc(ogDesc)}">`)
    .replace('<li><a href="../../learn/" aria-current="page">占いを知る</a></li>', '<li><a href="../../learn/">占いを知る</a></li>')
    .replace('<link rel="stylesheet" href="../../assets/css/common.css">', '<link rel="stylesheet" href="../../assets/css/common.css">\n<link rel="stylesheet" href="../../assets/css/kyusei.css">\n<link rel="stylesheet" href="../../assets/css/kippoui.css">' + extraHead);
  if (depth === 1) h = h.replace(/"\.\.\/\.\.\//g, '"../');
  if (depth === 3) h = h.replace(/"\.\.\/\.\.\//g, '"../../../');
  return h;
}
const FOOT = TEMPLATE.slice(TEMPLATE.indexOf("<footer"));
const foot = (depth) => (depth === 1 ? FOOT.replace(/"\.\.\/\.\.\//g, '"../') : depth === 3 ? FOOT.replace(/"\.\.\/\.\.\//g, '"../../../') : FOOT);
const up = (depth) => "../".repeat(depth);

// 年盤の図（北が上）。cell(key) → { cls, mark, note }
function grid(chart, cell, caption) {
  const rows = GRID.map((row) => row.map((k) => {
    if (k === "c") return `<div class="kp-cell kp-center"><span class="kp-dir">中宮</span><b>${STAR(chart.center).short}</b></div>`;
    const c = cell(k);
    return `<div class="kp-cell ${c.cls}"><span class="kp-dir">${H.NAME[k]}</span><b>${STAR(chart.stars[k]).short}</b>${c.mark ? `<span class="kp-mark">${esc(c.mark)}</span>` : ""}</div>`;
  }).join("")).join("");
  return `<figure class="kp-chart"><div class="kp-grid" role="img" aria-label="${esc(caption)}">${rows}</div><figcaption>${esc(caption)}（地図と同じく、北を上にしています）</figcaption></figure>`;
}

function commonCell(chart) {
  return (k) => {
    const bad = [];
    if (k === chart.gooh) bad.push("五黄殺");
    if (k === chart.anken) bad.push("暗剣殺");
    if (k === chart.saiha) bad.push("歳破");
    if (chart.teii.includes(k)) bad.push("定位対冲");
    return { cls: bad.length ? "is-bad" : "", mark: bad.join("・") };
  };
}
function personCell(p) {
  return (k) => {
    const d = p.dirs.find((x) => x.key === k);
    if (d.best) return { cls: "is-best", mark: "最大吉方" };
    if (d.good) return { cls: "is-good", mark: "吉方位" };
    if (d.bad.length) return { cls: "is-bad", mark: d.bad.join("・") };
    return { cls: "", mark: "" };
  };
}
const dirList = (keys) => (keys.length ? keys.map((k) => H.NAME[k]).join("・") : "なし");

function yearPage(year) {
  const c = H.yearChart(year);
  const rel = `kippoui/${year}/`;
  const rows = [];
  for (let s = 1; s <= 9; s++) {
    const p = H.forPerson(year, s);
    rows.push(`<tr><th scope="row"><a href="${s}/">${STAR(s).name}</a></th><td>${p.good.length ? dirList(p.good) : "なし"}</td><td>${p.honmeiCenter ? "（中宮・八方塞がり）" : dirList(p.dirs.filter((d) => d.bad.includes("本命殺") || d.bad.includes("本命的殺")).map((d) => d.key))}</td></tr>`);
  }
  const body = `<main id="main" class="wrap-narrow">
  <nav class="breadcrumb" aria-label="パンくずリスト">
    <ol>
      <li><a href="../../">えみり</a></li>
      <li><a href="../">吉方位</a></li>
      <li aria-current="page">${year}年</li>
    </ol>
  </nav>

  <section class="hero">
    <p class="eyebrow">LUCKY DIRECTIONS ${year}</p>
    <h1>${year}年の吉方位・凶方位</h1>
    <p>${year}年（${c.eto.stem}${c.eto.branch}年）は、${STAR(c.center).name}が中宮に入る年です。期間は${period(year)}。九星気学の年盤から、みんなに共通の凶方位と、本命星ごとの吉方位をまとめました。</p>
  </section>

  <section class="card" aria-labelledby="kp-chart-title">
    <p class="eyebrow">YEAR CHART</p>
    <h2 id="kp-chart-title">${year}年の年盤</h2>
    ${grid(c, commonCell(c), `${year}年の年盤`)}
    <ul class="kp-legend">
      <li><b>五黄殺</b>：${c.gooh ? H.NAME[c.gooh] : "なし（五黄土星が中宮）"}</li>
      <li><b>暗剣殺</b>：${c.anken ? H.NAME[c.anken] : "なし"}</li>
      <li><b>歳破</b>：${H.NAME[c.saiha]}（${c.eto.branch}の反対）</li>
      <li><b>定位対冲</b>：${dirList(c.teii)}</li>
    </ul>
    <p class="kyusei-meta">この4つは、本命星に関係なく、すべての人に共通の凶方位です。</p>
  </section>

  <section class="card" aria-labelledby="kp-table-title">
    <p class="eyebrow">BY STAR</p>
    <h2 id="kp-table-title">本命星別の吉方位（${year}年）</h2>
    <div class="kp-table-wrap"><table class="kp-table">
      <thead><tr><th scope="col">本命星</th><th scope="col">吉方位</th><th scope="col">本命殺・本命的殺</th></tr></thead>
      <tbody>
${rows.join("\n")}
      </tbody>
    </table></div>
    <p class="kyusei-meta">本命星の吉方位から、月命星の凶方位を除いて絞り込んだものが「最大吉方」です。生年月日を入れると、あなたの最大吉方がわかります。</p>
    <p class="learn-actions"><a class="btn" href="../" style="max-width:320px">生年月日で吉方位を調べる</a></p>
  </section>

  <section class="card prose" aria-labelledby="kp-bad-title">
    <p class="eyebrow">CAUTION</p>
    <h2 id="kp-bad-title">凶方位の意味</h2>
    <ul>
${["五黄殺", "暗剣殺", "歳破", "本命殺", "本命的殺", "定位対冲"].map((b) => `      <li><strong>${b}</strong>：${esc(T.BAD[b])}</li>`).join("\n")}
    </ul>
  </section>
</main>

`;
  write(rel, head(rel, `${year}年の吉方位・凶方位｜九星別の年盤一覧｜えみり`,
    `${year}年（${c.eto.stem}${c.eto.branch}・${STAR(c.center).name}中宮）の吉方位と凶方位を九星気学の年盤で解説。五黄殺・暗剣殺・歳破の方位と、一白水星〜九紫火星の本命星別の吉方位がひと目でわかります。`,
    `${year}年の吉方位・凶方位｜えみり`, `${STAR(c.center).name}中宮の年盤と、本命星別の吉方位。`, 2) + body + foot(2));
}

function starPage(year, s) {
  const p = H.forPerson(year, s), c = p.chart, rel = `kippoui/${year}/${s}/`;
  const goodDirs = p.dirs.filter((d) => d.good);
  const badDirs = p.dirs.filter((d) => d.bad.length);
  const g9 = [];
  for (let g = 1; g <= 9; g++) {
    const q = H.forPerson(year, s, g);
    g9.push(`<tr><th scope="row">${STAR(g).name}</th><td>${dirList(q.best)}</td><td>${dirList(q.good.filter((k) => !q.best.includes(k)))}</td></tr>`);
  }
  const others = [];
  for (let t = 1; t <= 9; t++) if (t !== s) others.push(`<li><a href="../${t}/">${STAR(t).name}</a></li>`);
  const name = STAR(s).name;
  const body = `<main id="main" class="wrap-narrow">
  <nav class="breadcrumb" aria-label="パンくずリスト">
    <ol>
      <li><a href="../../../">えみり</a></li>
      <li><a href="../../">吉方位</a></li>
      <li><a href="../">${year}年</a></li>
      <li aria-current="page">${name}</li>
    </ol>
  </nav>

  <section class="hero">
    <p class="eyebrow">${year} · ${STAR(s).short}</p>
    <h1>${name}の${year}年の吉方位</h1>
    <p>${name}の人の、${year}年（${period(year)}）の吉方位は<strong>${goodDirs.length ? goodDirs.map((d) => d.name).join("・") : "ありません"}</strong>です。${p.honmeiCenter ? `${year}年は${name}が中宮に入る「八方塞がり」の年とされ、引っ越しなど大きな移動は慎重に考えたい年です。` : ""}</p>
  </section>

  <section class="card" aria-labelledby="kp-chart-title">
    <p class="eyebrow">YEAR CHART</p>
    <h2 id="kp-chart-title">${name}から見た${year}年の年盤</h2>
    ${grid(c, personCell(p), `${name}の${year}年の吉方位と凶方位`)}
  </section>

  <section class="card prose" aria-labelledby="kp-good-title">
    <p class="eyebrow">LUCKY</p>
    <h2 id="kp-good-title">${year}年の吉方位と、受け取れる運気</h2>
${goodDirs.length ? goodDirs.map((d) => `    <h3>${d.name}（${STAR(d.star).name}）：${T.STAR_EFFECT[d.star].title}</h3>\n    <p>${esc(T.STAR_EFFECT[d.star].text)}</p>`).join("\n") : `    <p>${year}年の年盤では、${name}の吉方位はありません。月盤で吉方位が巡る月を選ぶか、無理に遠出をせず、身近な場所で過ごすのがおすすめです。</p>`}
  </section>

  <section class="card" aria-labelledby="kp-best-title">
    <p class="eyebrow">BEST</p>
    <h2 id="kp-best-title">月命星別の最大吉方</h2>
    <p>本命星と月命星の両方にとって良い方位が「最大吉方」です。月命星は生まれた月で決まります。</p>
    <div class="kp-table-wrap"><table class="kp-table">
      <thead><tr><th scope="col">月命星</th><th scope="col">最大吉方</th><th scope="col">吉方位</th></tr></thead>
      <tbody>
${g9.join("\n")}
      </tbody>
    </table></div>
    <p class="learn-actions"><a class="btn" href="../../" style="max-width:320px">生年月日で月命星と最大吉方を調べる</a></p>
  </section>

  <section class="card prose" aria-labelledby="kp-bad-title">
    <p class="eyebrow">CAUTION</p>
    <h2 id="kp-bad-title">${year}年の凶方位</h2>
    <ul>
${badDirs.map((d) => `      <li><strong>${d.name}</strong>：${d.bad.map((b) => esc(b)).join("・")}　${esc(T.BAD[d.bad[0]])}</li>`).join("\n")}
    </ul>
  </section>

  <section class="card prose" aria-labelledby="kp-how-title">
    <p class="eyebrow">HOW TO</p>
    <h2 id="kp-how-title">吉方位の使い方</h2>
${T.HOW_TO.map((t) => `    <p>${esc(t)}</p>`).join("\n")}
  </section>

  <section class="card" aria-labelledby="kp-others-title">
    <h2 id="kp-others-title">ほかの本命星の${year}年の吉方位</h2>
    <ul class="yume-tags kp-tags">
${others.join("\n")}
      <li><a href="../">${year}年の年盤と一覧</a></li>
    </ul>
    <p class="kyusei-meta"><a href="../../../kyusei/">本命星がわからない方は、九星気学のカルテで調べられます →</a></p>
  </section>
</main>

`;
  const gd = goodDirs.map((d) => d.name).join("・") || "なし";
  write(rel, head(rel, `${name} ${year}年の吉方位・凶方位｜最大吉方も｜えみり`,
    `${name}の${year}年の吉方位は${gd}。九星気学の年盤から、吉方位で受け取れる運気、月命星別の最大吉方、五黄殺・暗剣殺・本命殺などの凶方位を解説します。`,
    `${name}の${year}年の吉方位｜えみり`, `吉方位：${gd}`, 3) + body + foot(3));
}

function indexPage() {
  const extra = `
<script defer src="../assets/js/core/date.js"></script>
<script defer src="../assets/js/core/dom.js"></script>
<script defer src="../assets/js/core/profile.js"></script>
<script defer src="../assets/js/core/birthdate-field.js"></script>
<script defer src="../assets/js/core/astro.js"></script>
<script defer src="../assets/js/content/kyusei-data.js"></script>
<script defer src="../assets/js/engines/kyusei.js"></script>
<script defer src="../assets/js/engines/houi.js"></script>
<script defer src="../assets/js/content/houi-text.js"></script>
<script defer src="../assets/js/pages/kippoui-page.js"></script>`;
  const yearLinks = YEARS.map((y) => {
    const c = H.yearChart(y);
    return `      <li><a href="${y}/"><span>${y}年（${c.eto.stem}${c.eto.branch}・${STAR(c.center).short}中宮）の吉方位と年盤<br><small class="lead">${period(y)}</small></span><span class="arrow" aria-hidden="true">→</span></a></li>`;
  }).join("\n");
  const body = `<main id="main" class="wrap-narrow">
  <nav class="breadcrumb" aria-label="パンくずリスト">
    <ol>
      <li><a href="../">えみり</a></li>
      <li aria-current="page">吉方位</li>
    </ol>
  </nav>

  <section class="hero">
    <p class="eyebrow">LUCKY DIRECTIONS</p>
    <h1>吉方位を調べる</h1>
    <p>生年月日から本命星と月命星を出し、九星気学の年盤で、今年と来年のあなたの吉方位・最大吉方・凶方位を調べます。旅行や引っ越し、お参りの方角選びに。</p>
    <ul class="badges" aria-label="特徴">
      <li class="badge">完全無料</li>
      <li class="badge">生年月日だけでOK</li>
      <li class="badge">今年と来年の2年分</li>
    </ul>
  </section>

  <form id="kippoui-form" class="card kyusei-form" novalidate data-years="${YEARS.join(",")}">
    <div data-birthdate="self"></div>
    <button type="submit" class="btn">吉方位を調べる</button>
  </form>

  <div id="kippoui-result" class="kyusei-result" hidden>
    <div id="kippoui-result-body"></div>
  </div>

  <section class="card" aria-labelledby="kp-years-title">
    <h2 id="kp-years-title">年ごとの吉方位</h2>
    <ul class="link-list">
${yearLinks}
    </ul>
  </section>

  <section class="card prose" aria-labelledby="kp-about-title">
    <h2 id="kp-about-title">吉方位とは？</h2>
    <p>吉方位は、九星気学で「その方位へ出かけると良い運気を受け取れる」とされる方角です。毎年、九つの星が方位盤の上を巡り、その年の星の配置（年盤）と、あなたの本命星・月命星との相性で吉方位が決まります。</p>
    <h3>えみりの計算方法</h3>
    <ul>
      <li>年の区切りは立春。本命星・月命星は、九星気学のカルテと同じく節入りの時刻で計算します。</li>
      <li>凶方位は、五黄殺・暗剣殺・歳破・本命殺・本命的殺・月命殺・月命的殺・定位対冲。</li>
      <li>吉方位は、凶方位以外で、本命星と相生・比和の星がいる方位。月命星とも相生・比和なら「最大吉方」です。</li>
      <li>年盤（1年単位）で見ています。月盤・日盤、方位の角度（30度・60度）は流派によって扱いが異なるため、ここでは扱いません。</li>
    </ul>
${T.HOW_TO.map((t) => `    <p>${esc(t)}</p>`).join("\n")}
  </section>
</main>

`;
  write("kippoui/", head("kippoui/", "吉方位を調べる｜生年月日で今年と来年の吉方位・最大吉方を無料計算｜えみり",
    "生年月日を入れるだけで、九星気学の本命星・月命星から、今年と来年の吉方位・最大吉方・凶方位（五黄殺・暗剣殺・歳破・本命殺など）を無料で計算します。旅行や引っ越しの方角選びに。",
    "吉方位を調べる｜えみり", "生年月日から、今年と来年のあなたの吉方位と最大吉方を調べます。", 1, extra) + body + foot(1));
}

function write(rel, html) {
  const dir = path.join(ROOT, rel);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, "index.html"), html);
}

for (const y of YEARS) { yearPage(y); for (let s = 1; s <= 9; s++) starPage(y, s); }
indexPage();
console.log(`kippoui: ${YEARS.join("・")}年（${YEARS.length * 10}ページ）＋調べるページ`);
