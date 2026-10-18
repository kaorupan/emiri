#!/usr/bin/env node
// 今日の運勢ページの自動生成：node tools/daily/generate.mjs [--date 2026-10-10] [--days 1] [--all]
//
//  - unsei/<日付>/index.html   その日の運勢（九星・12星座ランキング、暦、今日誕生日の人）
//  - unsei/index.html          運勢の一覧（最新日＋過去の日付）
//  - index.html                TOPの「今日の運勢」欄（<!-- daily:start --> 〜 <!-- daily:end --> の間だけを書き換える）
//  - 前日のページ               「次の日」へのリンクを付けるため作り直す
//
// 日付を省略すると日本時間の今日。同じ日付で何度実行しても同じ結果になる（外部サービス・AIは使わない）。
// ヘッダー・フッターは TOP（index.html）のものをそのまま使い、リンクの深さだけ合わせる。
// 最後に tools/seo/seo.mjs を実行して、正式URL・sitemap.xml・feed.xml・robots.txt を更新する。
// 運勢の記事には構造化データ（BlogPosting・BreadcrumbList）を入れる。
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const daily = require(path.join(ROOT, "assets/js/engines/daily.js"));
const { applyHead, applyRelated, loadConfig, urlOf, run: runSeo } = await import(path.join(ROOT, "tools/seo/seo.mjs"));
const config = loadConfig(ROOT);
const text = require(path.join(ROOT, "assets/js/content/daily-text.js"));
const kyureki = require(path.join(ROOT, "assets/js/core/kyureki.js"));
const shukuyo = require(path.join(ROOT, "assets/js/engines/shukuyo.js"));

// 今日の運勢の計算に、旧暦・六曜・日の宿（宿曜）を加える
function calculate(date) {
  const r = daily.calculateDaily(date);
  r.kyureki = kyureki.fromGregorian(date.year, date.month, date.day);
  r.shuku = shukuyo.shukuOfDate(date.year, date.month, date.day).shuku;
  return r;
}

const UNSEI = path.join(ROOT, "unsei");
const ISO_RE = /^(\d{4})-(\d{2})-(\d{2})$/;

// ---------- 引数 ----------
function arg(name) {
  const i = process.argv.indexOf(name);
  return i === -1 ? null : process.argv[i + 1];
}

function todayJst() {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Tokyo", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
  return parseIso(parts);
}

function parseIso(s) {
  const m = ISO_RE.exec(s || "");
  if (!m) throw new Error(`日付は YYYY-MM-DD で指定してください：${s}`);
  return { year: Number(m[1]), month: Number(m[2]), day: Number(m[3]) };
}

const pad2 = (n) => String(n).padStart(2, "0");
const iso = (d) => `${d.year}-${pad2(d.month)}-${pad2(d.day)}`;

// ---------- HTML ----------
const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

const topHtmlPath = path.join(ROOT, "index.html");

// TOP のヘッダー・フッターを、深さ prefix のページ用に書き換える
function chrome(prefix, current) {
  const top = fs.readFileSync(topHtmlPath, "utf8");
  const pick = (re) => (top.match(re) || [""])[0];
  const fix = (html) => html.replace(/href="([^"]*)"/g, (all, h) => {
    if (/^(https?:|mailto:|#)/.test(h)) return all;
    if (h === "./") return `href="${prefix || "./"}"`;
    if (h.startsWith("./#")) return `href="${prefix || "./"}${h.slice(2)}"`;
    return `href="${prefix}${h}"`;
  });
  let header = fix(pick(/<header class="site-header">[\s\S]*?<\/header>/));
  header = header.replace(/ aria-current="page"/g, "");
  if (current) header = header.replace(`href="${prefix}${current}">`, `href="${prefix}${current}" aria-current="page">`);
  return { header, footer: fix(pick(/<footer class="site-footer">[\s\S]*?<\/footer>/)) };
}

function ldScript(objects) {
  return objects.map((o) => `<script type="application/ld+json">${JSON.stringify(o).replace(/</g, "\\u003c")}</script>`).join("\n");
}

function breadcrumb(items) {
  return {
    "@context": "https://schema.org", "@type": "BreadcrumbList",
    itemListElement: items.map(([name, rel], i) => ({ "@type": "ListItem", position: i + 1, name, item: urlOf(config, rel) }))
  };
}

function page({ prefix, rel, title, description, ogTitle, body, css = [], ld = [] }) {
  const { header, footer } = chrome(prefix, "unsei/");
  return applyHead(applyRelated(`<!doctype html>
<html lang="ja">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)}</title>
<meta name="description" content="${esc(description)}">
<link rel="canonical" href="${esc(urlOf(config, rel))}">
<meta property="og:site_name" content="えみり">
<meta property="og:type" content="article">
<meta property="og:locale" content="ja_JP">
<meta property="og:title" content="${esc(ogTitle)}">
<meta property="og:description" content="${esc(description)}">
<link rel="stylesheet" href="${prefix}assets/css/common.css">
${css.map((c) => `<link rel="stylesheet" href="${prefix}assets/css/${c}">`).join("\n")}
${ldScript(ld)}
</head>
<body>
<a class="skip-link" href="#main">本文へスキップ</a>
${header}

<main id="main" class="wrap-narrow">
${body}
</main>

${footer}
</body>
</html>
`, rel), config, rel);
}

function rankList(items, listId, labelOf) {
  return `<ol class="daily-rank" id="${listId}">
${items.map((it) => `    <li class="daily-rank-item${it.rank <= 3 ? " is-top" : ""}" id="${listId}-${it.id}">
      <p class="daily-rank-no"><span>${it.rank}</span>位</p>
      <div class="daily-rank-body">
        <h3>${esc(it.name)} <span class="daily-rank-key">${esc(labelOf(it))}</span></h3>
        <p>${esc(it.text)}</p>
        <p class="daily-advice"><b>ひとこと</b>${esc(it.advice)}</p>
      </div>
    </li>`).join("\n")}
  </ol>`;
}

function dayPage(view, neighbors) {
  const prefix = "../../";
  const nav = `<nav class="daily-pager" aria-label="前後の日の運勢">
    ${neighbors.prev ? `<a href="../${neighbors.prev}/">← 前の日</a>` : `<span></span>`}
    <a href="../">運勢の一覧</a>
    ${neighbors.next ? `<a href="../${neighbors.next}/">次の日 →</a>` : `<span></span>`}
  </nav>`;
  const body = `  <nav class="breadcrumb" aria-label="パンくずリスト">
    <ol>
      <li><a href="${prefix}">えみり</a></li>
      <li><a href="../">今日の運勢</a></li>
      <li aria-current="page">${esc(view.dateText)}</li>
    </ol>
  </nav>

  <section class="hero hero-compact">
    <p class="eyebrow">DAILY FORTUNE</p>
    <h1>${esc(view.title)}</h1>
    <p>${esc(view.lead)}</p>
  </section>

  <section class="card daily-calendar" aria-labelledby="daily-koyomi-title">
    <h2 id="daily-koyomi-title">今日の暦</h2>
    <dl class="daily-koyomi">
${view.calendar.map((c) => `      <div><dt>${esc(c.label)}</dt><dd>${esc(c.value)}</dd></div>`).join("\n")}
    </dl>
${view.events.length ? `    <ul class="daily-events">${view.events.map((e) => `<li>${esc(e)}</li>`).join("")}</ul>\n` : ""}    <p>${esc(view.dayStar.text)}${esc(view.moonMood)}</p>
  </section>
${view.kichijitsu.length ? `
  <section class="section" aria-labelledby="daily-kichi-title">
    <p class="eyebrow">LUCKY DAY</p>
    <h2 id="daily-kichi-title">今日の吉日：${esc(view.kichijitsu.map((k) => k.name).join("・"))}</h2>
    <div class="daily-kichi-list">
${view.kichijitsu.map((k) => `      <article class="daily-kichi" id="daily-kichi-${k.id}">
        <h3>${esc(k.name)}<small>（${esc(k.reading)}）</small></h3>
        <p>${esc(k.text)}</p>
        <p class="daily-kichi-actions"><b>この日にしたいこと</b>${k.actions.map((a) => esc(a)).join("／")}</p>
      </article>`).join("\n")}
    </div>
  </section>
` : ""}
  <div class="daily-twin">
    <section class="card daily-season${view.season.featured ? " is-featured" : ""}" aria-labelledby="daily-season-title">
      <p class="eyebrow">SEASON</p>
      <h2 id="daily-season-title">${esc(view.season.title)}</h2>
      <p>${esc(view.season.text)}</p>
    </section>
    <section class="card daily-moon${view.moonFeature.featured ? " is-featured" : ""}" aria-labelledby="daily-moon-title">
      <p class="eyebrow">MOON</p>
      <h2 id="daily-moon-title">${esc(view.moonFeature.title)}</h2>
      <p>${esc(view.moonFeature.text)}</p>
${view.moonFeature.tip ? `      <p class="daily-advice"><b>ひとこと</b>${esc(view.moonFeature.tip)}</p>\n` : ""}    </section>
  </div>
  <p class="daily-month-link"><a href="../../koyomi/${view.monthIso}/">${Number(view.monthIso.slice(5))}月の吉日カレンダー（一粒万倍日・天赦日・寅の日・巳の日）を見る →</a></p>

  <section class="section" aria-labelledby="daily-kyusei-title">
    <p class="eyebrow">NINE STAR KI</p>
    <h2 id="daily-kyusei-title">九星気学 今日の運勢ランキング</h2>
    <p class="lead">あなたの本命星（生まれ年の星）で見てください。本命星は<a href="${prefix}kyusei/">九星気学のカルテ</a>で調べられます。</p>
  ${rankList(view.kyusei, "daily-kyusei", (it) => `${it.palace}・${it.keyword}`)}
  </section>

  <section class="section" aria-labelledby="daily-zodiac-title">
    <p class="eyebrow">ZODIAC</p>
    <h2 id="daily-zodiac-title">12星座 今日の運勢ランキング</h2>
    <p class="lead">生まれたときの太陽の星座（いわゆる「星座占い」の星座）で見てください。</p>
  ${rankList(view.zodiac, "daily-zodiac", (it) => `第${it.house}ハウス・${it.keyword}`)}
  </section>

  <section class="card" aria-labelledby="daily-birthday-title">
    <p class="eyebrow">BIRTHDAY</p>
    <h2 id="daily-birthday-title">${esc(view.birthday.title)}</h2>
    <p class="daily-birthday-sign">太陽星座：${esc(view.birthday.sign)}</p>
    <p>${esc(view.birthday.text)}</p>
    <p><a href="${prefix}tanjobi/${view.iso.slice(5)}/">${Number(view.iso.slice(5, 7))}月${Number(view.iso.slice(8))}日生まれの性格・恋愛・相性をくわしく見る →</a></p>
    <p><a href="${prefix}suhijutsu/">生年月日で、数秘術のカルテを見る →</a></p>
  </section>

  <section class="feature-box premium-teaser" aria-labelledby="daily-premium-title">
    <p class="eyebrow">PREMIUM READING</p>
    <h2 id="daily-premium-title">あなただけの鑑定書</h2>
    <p>今日の運勢は、生まれ年や星座ごとの大まかな流れです。生年月日から精密に読み解く本格占いを準備しています。</p>
    <p><a class="btn btn-ghost premium-btn" href="${prefix}premium/">本格占いについて見る</a></p>
  </section>

  ${nav}

  <section class="card prose daily-method" aria-labelledby="daily-method-title">
    <h2 id="daily-method-title">このページの占い方</h2>
    <ul>
      <li>九星気学：その日の盤（日盤）で、あなたの本命星がどの宮に入るかから読みます。日の九星は、冬至・夏至に最も近い甲子の日を起点とする日本の暦で一般的な方式で求めています。</li>
      <li>12星座：日本時間の正午に月がある星座が、あなたの星座から数えて何番目（ハウス）にあたるかから読みます。</li>
      <li>順位は、それぞれの宮・ハウスの伝統的な意味をもとにした、えみりの読み方です。占いの結果は、自己理解やエンターテインメントとしてお楽しみください。</li>
    </ul>
  </section>`;
  const rel = `unsei/${view.iso}/index.html`;
  const published = `${view.iso}T00:00:00+09:00`;
  const org = { "@type": "Organization", name: config.siteName, url: `${config.baseUrl}/` };
  return page({
    prefix,
    rel,
    ld: [{
      "@context": "https://schema.org", "@type": "BlogPosting",
      headline: view.title, description: view.lead, datePublished: published, dateModified: published,
      inLanguage: "ja", articleSection: "今日の運勢", url: urlOf(config, rel), mainEntityOfPage: urlOf(config, rel),
      author: org, publisher: org
    }, breadcrumb([[config.siteName, "index.html"], ["今日の運勢", "unsei/index.html"], [view.dateText, rel]])],
    title: `${view.dateText}の運勢｜12星座ランキング・九星気学｜えみり`,
    description: `${view.dateText}の運勢。${view.lead}`,
    ogTitle: `${view.title}｜えみり`,
    body,
    css: ["daily.css"]
  });
}

// ---------- 吉日カレンダー（月ごと） ----------
const KOYOMI = path.join(ROOT, "koyomi");
const MONTH_RE = /^(\d{4})-(\d{2})$/;

function monthPage(ym) {
  const [y, m] = ym.split("-").map(Number);
  const prefix = "../../";
  const last = new Date(Date.UTC(y, m, 0)).getUTCDate();
  const days = [];
  for (let d = 1; d <= last; d++) {
    const r = calculate({ year: y, month: m, day: d });
    days.push({ d, r, v: text.buildDaily(r) });
  }
  const groups = ["tensha", "ichiryu", "tsuchinotomi", "tora", "mi"].map((id) => ({
    id, name: text.KICHIJITSU[id].name, reading: text.KICHIJITSU[id].reading, text: text.KICHIJITSU[id].text,
    // 己巳の日も巳の日のひとつなので、月のまとめでは巳の日にも含める
    days: days.filter((x) => x.r.koyomi.kichijitsu.includes(id) || (id === "mi" && x.r.koyomi.kichijitsu.includes("tsuchinotomi")))
  }));
  const wd = (x) => daily.WEEKDAYS.charAt(x.r.date.weekday);
  const dayLink = (x, label) => {
    const iso = `${ym}-${pad2(x.d)}`;
    return fs.existsSync(path.join(UNSEI, iso, "index.html")) ? `<a href="../../unsei/${iso}/">${label}</a>` : label;
  };
  const summary = groups.map((g) => `      <div><dt>${esc(g.name)}</dt><dd>${g.days.length ? g.days.map((x) => `${m}/${x.d}（${wd(x)}）`).join("・") : "なし"}</dd></div>`).join("\n");
  const both = days.filter((x) => x.r.koyomi.kichijitsu.includes("tensha") && x.r.koyomi.kichijitsu.includes("ichiryu"));
  const terms = days.filter((x) => x.r.koyomi.term.today).map((x) => `${m}月${x.d}日が${x.r.koyomi.term.today}`);
  const moons = days.flatMap((x) => x.r.moon.events.map((e) => `${m}月${x.d}日が${daily.SIGNS[e.sign].name}の${e.kind === "new" ? "新月" : "満月"}`));
  const counts = groups.filter((g) => g.days.length).map((g) => `${g.name}${g.days.length}日`).join("、");
  const lead = `${y}年${m}月の吉日は、${counts}。${both.length ? `${both.map((x) => `${m}月${x.d}日`).join("・")}は天赦日と一粒万倍日が重なる、とくに縁起のよい日です。` : ""}二十四節気は${terms.join("・")}、月は${moons.join("・")}です。`;
  const rows = days.map((x) => {
    const k = x.r.koyomi.kichijitsu.map((id) => text.KICHIJITSU[id].name).join("・");
    const extra = [x.r.koyomi.term.today, ...x.r.moon.events.map((e) => (e.kind === "new" ? "新月" : "満月"))].filter(Boolean).join("・");
    return `      <tr${k ? ' class="has-kichi"' : ""}><th scope="row">${dayLink(x, `${m}/${x.d}（${wd(x)}）`)}</th><td>${esc(x.r.kyureki.rokuyo)}</td><td>${esc(x.r.sexagenary.name)}</td><td>${esc(k || "—")}</td><td>${esc(extra || "—")}</td></tr>`;
  }).join("\n");
  const prevYm = m === 1 ? `${y - 1}-12` : `${y}-${pad2(m - 1)}`;
  const nextYm = m === 12 ? `${y + 1}-01` : `${y}-${pad2(m + 1)}`;
  const exists = (k) => fs.existsSync(path.join(KOYOMI, k, "index.html")) || monthTargets.includes(k);
  const body = `  <nav class="breadcrumb" aria-label="パンくずリスト">
    <ol>
      <li><a href="${prefix}">えみり</a></li>
      <li><a href="../">吉日カレンダー</a></li>
      <li aria-current="page">${y}年${m}月</li>
    </ol>
  </nav>

  <section class="hero hero-compact">
    <p class="eyebrow">LUCKY DAYS CALENDAR</p>
    <h1>${y}年${m}月の吉日カレンダー</h1>
    <p>${esc(lead)}</p>
  </section>

  <section class="card daily-calendar" aria-labelledby="koyomi-summary-title">
    <h2 id="koyomi-summary-title">${m}月の吉日まとめ</h2>
    <dl class="koyomi-summary">
${summary}
    </dl>
  </section>

  <section class="section" aria-labelledby="koyomi-table-title">
    <h2 id="koyomi-table-title">${m}月の毎日の暦</h2>
    <div class="koyomi-table-wrap">
    <table class="koyomi-table">
      <thead><tr><th scope="col">日付</th><th scope="col">六曜</th><th scope="col">干支</th><th scope="col">吉日</th><th scope="col">節気・月</th></tr></thead>
      <tbody>
${rows}
      </tbody>
    </table>
    </div>
  </section>

  <section class="section" aria-labelledby="koyomi-about-title">
    <h2 id="koyomi-about-title">それぞれの吉日について</h2>
    <div class="daily-kichi-list">
${groups.map((g) => `      <article class="daily-kichi" id="koyomi-${g.id}">
        <h3>${esc(g.name)}<small>（${esc(g.reading)}）</small></h3>
        <p>${esc(g.text)}</p>
      </article>`).join("\n")}
    </div>
  </section>

  <nav class="daily-pager" aria-label="前後の月の吉日カレンダー">
    ${exists(prevYm) ? `<a href="../${prevYm}/">← ${Number(prevYm.slice(5))}月</a>` : "<span></span>"}
    <a href="../">吉日カレンダーの一覧</a>
    ${exists(nextYm) ? `<a href="../${nextYm}/">${Number(nextYm.slice(5))}月 →</a>` : "<span></span>"}
  </nav>

  <section class="card prose daily-method" aria-labelledby="koyomi-method-title">
    <h2 id="koyomi-method-title">このカレンダーの求め方</h2>
    <ul>
      <li>日付は日本時間です。月の区切り（節月）は、二十四節気の節入りの日から新しい月として数えています。</li>
      <li>一粒万倍日は節月と日の十二支から、天赦日は季節（立春・立夏・立秋・立冬で区切る）と日の干支から求めています。節入りの日の扱いなどにより、暦によっては1〜2日ずれることがあります。</li>
      <li>二十四節気と新月・満月は、国立天文台の値とほぼ同じ（±1分）になる天文計算で求めています。</li>
    </ul>
  </section>`;
  const rel = `koyomi/${ym}/index.html`;
  return page({
    prefix,
    rel,
    title: `${y}年${m}月の吉日カレンダー｜一粒万倍日・天赦日・寅の日・巳の日｜えみり`,
    description: lead.slice(0, 160),
    ogTitle: `${y}年${m}月の吉日カレンダー｜えみり`,
    body,
    css: ["daily.css"],
    ld: [breadcrumb([[config.siteName, "index.html"], ["吉日カレンダー", "koyomi/index.html"], [`${y}年${m}月`, rel]])]
  });
}

function listMonths() {
  if (!fs.existsSync(KOYOMI)) return [];
  return fs.readdirSync(KOYOMI, { withFileTypes: true }).filter((e) => e.isDirectory() && MONTH_RE.test(e.name)).map((e) => e.name).sort();
}

function koyomiIndex(months) {
  const prefix = "../";
  const byYear = new Map();
  for (const ym of [...months].reverse()) {
    const y = ym.slice(0, 4);
    if (!byYear.has(y)) byYear.set(y, []);
    byYear.get(y).push(ym);
  }
  const list = [...byYear.entries()].map(([y, ms]) => `    <h3>${y}年</h3>
    <ul class="daily-archive">${ms.map((ym) => `<li><a href="${ym}/">${Number(ym.slice(5))}月</a></li>`).join("")}</ul>`).join("\n");
  const body = `  <nav class="breadcrumb" aria-label="パンくずリスト">
    <ol>
      <li><a href="${prefix}">えみり</a></li>
      <li aria-current="page">吉日カレンダー</li>
    </ol>
  </nav>

  <section class="hero hero-compact">
    <p class="eyebrow">LUCKY DAYS CALENDAR</p>
    <h1>吉日カレンダー</h1>
    <p>一粒万倍日・天赦日・己巳の日・寅の日・巳の日などの吉日と、二十四節気・新月・満月を、月ごとにまとめています。</p>
  </section>

  <section class="section" aria-labelledby="koyomi-list-title">
    <h2 id="koyomi-list-title">月ごとの吉日カレンダー</h2>
${list}
  </section>`;
  return page({
    prefix,
    rel: "koyomi/index.html",
    title: "吉日カレンダー｜一粒万倍日・天赦日・寅の日・巳の日｜えみり",
    description: "一粒万倍日・天赦日・己巳の日・寅の日・巳の日などの吉日と、二十四節気・新月・満月を月ごとにまとめた吉日カレンダーです。",
    ogTitle: "吉日カレンダー｜えみり",
    body,
    css: ["daily.css"],
    ld: [breadcrumb([[config.siteName, "index.html"], ["吉日カレンダー", "koyomi/index.html"]])]
  });
}

let monthTargets = [];

function listDates() {
  if (!fs.existsSync(UNSEI)) return [];
  return fs.readdirSync(UNSEI, { withFileTypes: true })
    .filter((e) => e.isDirectory() && ISO_RE.test(e.name) && fs.existsSync(path.join(UNSEI, e.name, "index.html")))
    .map((e) => e.name).sort();
}

function indexPage(latestView, dates) {
  const prefix = "../";
  const byMonth = new Map();
  for (const d of [...dates].reverse()) {
    const key = d.slice(0, 7);
    if (!byMonth.has(key)) byMonth.set(key, []);
    byMonth.get(key).push(d);
  }
  const archive = [...byMonth.entries()].map(([ym, ds]) => {
    const [y, m] = ym.split("-").map(Number);
    return `    <h3>${y}年${m}月</h3>
    <ul class="daily-archive">${ds.map((d) => {
      const [, , dd] = d.split("-").map(Number);
      return `<li><a href="${d}/">${m}月${dd}日</a></li>`;
    }).join("")}</ul>`;
  }).join("\n");
  const top3 = (items) => items.slice(0, 3).map((it) => `<li><span>${it.rank}位</span>${esc(it.name)}</li>`).join("");
  const body = `  <nav class="breadcrumb" aria-label="パンくずリスト">
    <ol>
      <li><a href="${prefix}">えみり</a></li>
      <li aria-current="page">今日の運勢</li>
    </ol>
  </nav>

  <section class="hero hero-compact">
    <p class="eyebrow">DAILY FORTUNE</p>
    <h1>今日の運勢</h1>
    <p>九星気学と12星座の今日の運勢ランキングを、毎日お届けします。日の九星や月の位置、一粒万倍日などの吉日、二十四節気も、毎日計算して載せています。</p>
    <p><a href="../koyomi/">一粒万倍日・天赦日などの吉日カレンダーを見る →</a></p>
  </section>

  <section class="card daily-latest" aria-labelledby="daily-latest-title">
    <p class="eyebrow">LATEST</p>
    <h2 id="daily-latest-title">${esc(latestView.title)}</h2>
    <p>${esc(latestView.lead)}</p>
    <div class="daily-top3">
      <div><h3>九星気学 TOP3</h3><ol>${top3(latestView.kyusei)}</ol></div>
      <div><h3>12星座 TOP3</h3><ol>${top3(latestView.zodiac)}</ol></div>
    </div>
    <p><a class="btn" href="${latestView.iso}/">${esc(latestView.dateText)}の運勢を見る</a></p>
  </section>

  <section class="section" aria-labelledby="daily-archive-title">
    <h2 id="daily-archive-title">過去の運勢</h2>
${archive}
  </section>`;
  return page({
    prefix,
    rel: "unsei/index.html",
    ld: [breadcrumb([[config.siteName, "index.html"], ["今日の運勢", "unsei/index.html"]])],
    title: "今日の運勢｜12星座ランキング・九星気学｜えみり",
    description: "九星気学と12星座の今日の運勢ランキングを毎日更新。日の九星・干支・月齢・月の星座などの暦と、今日誕生日の人の性格もあわせて紹介します。",
    ogTitle: "今日の運勢｜えみり",
    body,
    css: ["daily.css"]
  });
}

function topSection(view) {
  const chips = (items) => items.slice(0, 3).map((it) => `<li><span>${it.rank}位</span>${esc(it.name)}</li>`).join("");
  return `<!-- daily:start -->
  <section class="today" id="today" aria-labelledby="today-title">
    <div class="today-head">
      <p class="eyebrow">TODAY</p>
      <h2 id="today-title">今日の運勢 <small class="today-date">${esc(view.dateText)}</small></h2>
      <p class="lead">${esc(view.lead)}</p>
      <div class="today-top3">
        <div><h3>九星気学</h3><ol>${chips(view.kyusei)}</ol></div>
        <div><h3>12星座</h3><ol>${chips(view.zodiac)}</ol></div>
      </div>
    </div>
    <ul class="today-links">
      <li><a href="unsei/${view.iso}/"><span class="today-icon" aria-hidden="true">🌙</span><span><b>今日の運勢ランキングを見る</b><small>九星・12星座の全順位と、今日の暦</small></span></a></li>
      <li><a href="tarot/"><span class="today-icon" aria-hidden="true">🃏</span><span><b>今日のタロット</b><small>テーマを選んで3枚引き。同じテーマは1日1回</small></span></a></li>
      <li><a href="gamble/"><span class="today-icon" aria-hidden="true">🎲</span><span><b>今日のギャンブル運</b><small>勝負運・ラッキーナンバー・ツキのある時間</small></span></a></li>
    </ul>
  </section>
  <!-- daily:end -->`;
}

// ---------- 実行 ----------
function viewOf(dateStr) {
  return text.buildDaily(calculate(parseIso(dateStr)));
}

function writeIfChanged(file, content) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  if (fs.existsSync(file) && fs.readFileSync(file, "utf8") === content) return false;
  fs.writeFileSync(file, content);
  return true;
}

function writeDay(dateStr, dates) {
  const i = dates.indexOf(dateStr);
  const neighbors = { prev: i > 0 ? dates[i - 1] : null, next: i >= 0 && i < dates.length - 1 ? dates[i + 1] : null };
  return writeIfChanged(path.join(UNSEI, dateStr, "index.html"), dayPage(viewOf(dateStr), neighbors));
}

function main() {
  const start = arg("--date") ? parseIso(arg("--date")) : todayJst();
  const days = Number(arg("--days") || 1);
  if (!Number.isInteger(days) || days < 1 || days > 400) throw new Error("--days は1〜400で指定してください");

  const targets = [];
  for (let k = 0; k < days; k++) targets.push(iso(daily.addDays(start, k)));
  // --all：生成済みの全日付を作り直す（文章や正式URLを変えたあとに使う）
  if (process.argv.includes("--all")) for (const d of listDates()) if (!targets.includes(d)) targets.push(d);
  targets.sort();

  // 一覧に載せる日付（既存＋今回）。前後リンクはこの並びで決める
  const dates = [...new Set([...listDates(), ...targets])].sort();
  const changed = [];
  for (const d of targets) if (writeDay(d, dates)) changed.push(`unsei/${d}/`);
  // 今回の範囲の前後のページも、リンクを付け直す
  const first = dates.indexOf(targets[0]), last = dates.indexOf(targets.at(-1));
  for (const j of [first - 1, last + 1]) {
    if (j >= 0 && j < dates.length && !targets.includes(dates[j]) && writeDay(dates[j], dates)) changed.push(`unsei/${dates[j]}/`);
  }

  // 吉日カレンダー：対象の日付の月と、その翌月（先に公開しておくと検索に載りやすい）
  const ymOf = (d) => d.slice(0, 7);
  const months = new Set(targets.map(ymOf));
  for (const d of targets) {
    const [yy, mm] = d.split("-").map(Number);
    months.add(mm === 12 ? `${yy + 1}-01` : `${yy}-${pad2(mm + 1)}`);
  }
  if (process.argv.includes("--all")) for (const ym of listMonths()) months.add(ym);
  monthTargets = [...months].sort();
  for (const ym of monthTargets) {
    if (writeIfChanged(path.join(KOYOMI, ym, "index.html"), monthPage(ym))) changed.push(`koyomi/${ym}/`);
  }
  // 前後リンクのため、隣の月も作り直す
  const allMonths = [...new Set([...listMonths(), ...monthTargets])].sort();
  for (const ym of allMonths) {
    if (monthTargets.includes(ym)) continue;
    const i = allMonths.indexOf(ym);
    if (monthTargets.includes(allMonths[i - 1]) || monthTargets.includes(allMonths[i + 1])) {
      if (writeIfChanged(path.join(KOYOMI, ym, "index.html"), monthPage(ym))) changed.push(`koyomi/${ym}/`);
    }
  }
  if (writeIfChanged(path.join(KOYOMI, "index.html"), koyomiIndex(allMonths))) changed.push("koyomi/");

  // 一覧とTOPは「今日」（範囲の最後ではなく、今日以前で最も新しい日）を表示する
  const today = iso(todayJst());
  const shown = [...dates].reverse().find((d) => d <= today) || targets[0];
  const latest = viewOf(shown);
  if (writeIfChanged(path.join(UNSEI, "index.html"), indexPage(latest, dates.filter((d) => d <= today || targets.includes(d))))) changed.push("unsei/");

  const top = fs.readFileSync(topHtmlPath, "utf8");
  const re = /<!-- daily:start -->[\s\S]*?<!-- daily:end -->/;
  if (!re.test(top)) throw new Error("index.html に <!-- daily:start --> 〜 <!-- daily:end --> が見つかりません");
  if (writeIfChanged(topHtmlPath, top.replace(re, topSection(latest)))) changed.push("index.html");

  for (const f of runSeo(ROOT)) if (!changed.includes(f)) changed.push(f);
  console.log(changed.length ? `更新：${changed.join(", ")}` : "変更なし");
}

main();
