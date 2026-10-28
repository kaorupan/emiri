#!/usr/bin/env node
/*
 * TOP と「占いを探す」まわりのページを、共通データ assets/js/content/catalog.js から作る
 *
 *   node tools/home/generate.mjs
 *
 *   index.html          TOP（紹介＋検索、占い一覧／悩みのタブ、今日の占い、おすすめ、新着。PCは左にサイドメニュー）
 *                       ※ <!-- daily:start --> 〜 <!-- daily:end -->（今日の運勢）は tools/daily/generate.mjs が書くので、そのまま残す
 *   ichiran/            すべての占い（分類ごと＋新着順）
 *   nayami/<id>/        悩みカテゴリごとの一覧
 *   kensaku/            キーワード検索（assets/js/pages/search-page.js）
 *   soudan/             占い師への相談のしかた（相談サービスの案内はアフィリエイトの仕組みが入れる）
 *   assets/data/search.json   検索用の索引（占いの一覧＋サイト内の全ページのタイトルと説明）
 *
 * 新しい占いは catalog.js に足して、このファイルを実行する（一覧・検索・新着に反映される）。
 * このあと、ふだんどおり line/cta → affiliate/inject → premium/visibility → seo/seo を実行する。
 */
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const require = createRequire(import.meta.url);
const C = require(path.join(ROOT, "assets/js/content/catalog.js"));
const SECTIONS = JSON.parse(fs.readFileSync(path.join(ROOT, "tools/seo/sections.json"), "utf8")).sections;
const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

// 参照の確認（存在しないページや分類を出さない）
for (const x of C.ITEMS) {
  if (!fs.existsSync(path.join(ROOT, x.url, "index.html"))) throw new Error(`catalog: ${x.id} のページ ${x.url} がない`);
  if (!C.GROUPS.some((g) => g.id === x.group)) throw new Error(`catalog: ${x.id} の分類 ${x.group}`);
  for (const n of x.nayami) if (!C.NAYAMI.some((g) => g.id === n)) throw new Error(`catalog: ${x.id} の悩み ${n}`);
}
for (const id of C.TOP_ORDER) if (!C.byId[id]) throw new Error(`TOP_ORDER: ${id}`);
for (const [nid, ts] of Object.entries(C.THEMES)) for (const t of ts) {
  if (t.id && !C.byId[t.id]) throw new Error(`THEMES ${nid}: ${t.id}`);
  if (t.url && !fs.existsSync(path.join(ROOT, t.url, "index.html"))) throw new Error(`THEMES ${nid}: ${t.url} がない`);
}

const icon = (name, up) => `<svg aria-hidden="true"><use href="${up}assets/img/icons.svg#${name}"/></svg>`;
const byPubDesc = (a, b) => (a.pub < b.pub ? 1 : a.pub > b.pub ? -1 : C.TOP_ORDER.indexOf(a.id) - C.TOP_ORDER.indexOf(b.id));
const order = (a, b) => {
  const ia = C.TOP_ORDER.indexOf(a.id), ib = C.TOP_ORDER.indexOf(b.id);
  return (ia < 0 ? 99 : ia) - (ib < 0 ? 99 : ib);
};
const fmtDate = (d) => { const [y, m, dd] = d.split("-").map(Number); return `${y}年${m}月${dd}日`; };
const nayamiItems = (id) => C.ITEMS.filter((x) => x.nayami.includes(id)).sort(order);
// カテゴリの件数（テーマの欄にだけある占いのページもふくめる）
const nayamiCount = (id) => nayamiItems(id).length + (C.THEMES[id] || []).filter((t) => !t.id).length;

const tile = (x, up, pos) => `<li><a class="tile" href="${up}${x.url}" data-track="start_click" data-target="${x.id}" data-position="${pos}"><span class="tile-icon">${icon(x.icon, up)}</span><span class="tile-name">${esc(x.title)}${x.hint ? `<small>${esc(x.hint)}</small>` : ""}</span></a></li>`;
const row = (x, up, pos, extra = "") => `<li><a class="row" href="${up}${x.url}" data-track="start_click" data-target="${x.id}" data-position="${pos}"><span class="row-icon">${icon(x.icon, up)}</span><span class="row-body"><b>${esc(x.title)}${extra}</b><small>${esc(x.desc)}</small></span><span class="row-arrow" aria-hidden="true">›</span></a></li>`;
const nayamiTile = (n, up) => `<li><a class="tile tile-nayami" href="${up}nayami/${n.id}/" data-track="start_click" data-target="nayami-${n.id}" data-position="top-nayami"><span class="tile-icon">${icon(n.icon, up)}</span><span class="tile-name">${esc(n.name)}<small>${nayamiCount(n.id)}件</small></span></a></li>`;
const searchForm = (up, id, value = "") => `<form class="search" action="${up}kensaku/" method="get" role="search">
      <label for="${id}" class="search-label">占い・悩みを検索</label>
      <div class="search-row">
        <input id="${id}" class="search-input" type="search" name="q" value="${esc(value)}" placeholder="例：相性、仕事、猫、夢 蛇" autocomplete="off" enterkeyhint="search">
        <button type="submit" class="search-btn"><svg aria-hidden="true" viewBox="0 0 24 24"><circle cx="11" cy="11" r="6.5" fill="none" stroke="currentColor" stroke-width="2"/><path d="M16 16l4.5 4.5" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg><span class="visually-hidden">検索する</span></button>
      </div>
    </form>`;

// ---------- 共通の <head> とフッター（learn/suhijutsu を型に） ----------
const TEMPLATE = fs.readFileSync(path.join(ROOT, "learn/suhijutsu/index.html"), "utf8");
function page(rel, depth, title, desc, body, extraHead = "") {
  const up = "../".repeat(depth);
  let h = TEMPLATE.slice(0, TEMPLATE.indexOf("<main"))
    .replace(/<title>.*?<\/title>/, `<title>${esc(title)}</title>`)
    .replace(/<meta name="description" content=".*?">/, `<meta name="description" content="${esc(desc)}">`)
    .replace(/https:\/\/emiri-uranai\.com\/learn\/suhijutsu\//g, `https://emiri-uranai.com/${rel}`)
    .replace(/<meta property="og:title" content=".*?">/, `<meta property="og:title" content="${esc(title)}">`)
    .replace(/<meta property="og:description" content=".*?">/, `<meta property="og:description" content="${esc(desc)}">`)
    .replace('<li><a href="../../learn/" aria-current="page">占いを知る</a></li>', '<li><a href="../../learn/">占いを知る</a></li>')
    .replace('<link rel="stylesheet" href="../../assets/css/common.css">', '<link rel="stylesheet" href="../../assets/css/common.css">\n<link rel="stylesheet" href="../../assets/css/home.css">' + (extraHead ? "\n" + extraHead : ""))
    .replace("<body>", '<body class="home">');
  let f = TEMPLATE.slice(TEMPLATE.indexOf("<footer"));
  if (depth !== 2) { h = h.replace(/"\.\.\/\.\.\//g, `"${up}`); f = f.replace(/"\.\.\/\.\.\//g, `"${up}`); }
  const file = path.join(ROOT, rel, "index.html");
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, h + body + f);
}
const crumb = (up, label) => `  <nav class="breadcrumb" aria-label="パンくずリスト">
    <ol>
      <li><a href="${up}">えみり</a></li>
      <li aria-current="page">${esc(label)}</li>
    </ol>
  </nav>`;
const crumb2 = (up, mid, midHref, label) => `  <nav class="breadcrumb" aria-label="パンくずリスト">
    <ol>
      <li><a href="${up}">えみり</a></li>
      <li><a href="${midHref}">${esc(mid)}</a></li>
      <li aria-current="page">${esc(label)}</li>
    </ol>
  </nav>`;

// ---------- サイドメニュー（PC） ----------
function side(up) {
  const top = C.TOP_ORDER.map((id) => C.byId[id]);
  const aisho = C.ITEMS.filter((x) => x.group === "aisho" && x.id !== "aisho");
  return `<aside class="home-side" aria-label="占いのメニュー">
      <nav aria-labelledby="side-senjutsu"><h2 id="side-senjutsu" class="side-title">占い一覧</h2>
        <ul class="side-list">
${top.map((x) => `          <li><a href="${up}${x.url}">${esc(x.title)}</a></li>`).join("\n")}
        </ul>
      </nav>
      <nav aria-labelledby="side-nayami"><h2 id="side-nayami" class="side-title">悩みから探す</h2>
        <ul class="side-list">
${C.NAYAMI.map((n) => `          <li><a href="${up}nayami/${n.id}/">${esc(n.name)}</a></li>`).join("\n")}
        </ul>
      </nav>
      <nav aria-labelledby="side-aisho"><h2 id="side-aisho" class="side-title">相性占い</h2>
        <ul class="side-list">
${aisho.map((x) => `          <li><a href="${up}${x.url}">${esc(x.title)}</a></li>`).join("\n")}
        </ul>
      </nav>
      <nav aria-labelledby="side-learn"><h2 id="side-learn" class="side-title">解説・用語集</h2>
        <ul class="side-list">
          <li><a href="${up}learn/">占いを知る（しくみと用語）</a></li>
          <li><a href="${up}ichiran/">すべての占い（${C.ITEMS.filter((x) => x.top).length}）</a></li>
        </ul>
      </nav>
    </aside>`;
}

// ---------- TOP ----------
function home() {
  const file = path.join(ROOT, "index.html");
  const html = fs.readFileSync(file, "utf8");
  const daily = html.match(/<!-- daily:start -->[\s\S]*?<!-- daily:end -->/)[0];
  const head = html.slice(0, html.indexOf("<main"))
    .replace(/<body[^>]*>/, '<body class="home">')
    .replace(/\n<link rel="stylesheet" href="assets\/css\/home\.css">/, "")
    .replace('<link rel="stylesheet" href="assets/css/common.css">', '<link rel="stylesheet" href="assets/css/common.css">\n<link rel="stylesheet" href="assets/css/home.css">');
  const foot = html.slice(html.indexOf("<footer"));
  const top = C.TOP_ORDER.map((id) => C.byId[id]);
  const SHOW = 16;
  const all = C.ITEMS.filter((x) => x.top);
  const recs = C.ITEMS.filter((x) => x.rec).sort(byPubDesc).slice(0, 4);
  const news = C.ITEMS.filter((x) => x.top && x.group !== "aisho").sort(byPubDesc).slice(0, 5);
  const latest = news[0].pub;
  const main = `<main id="main" class="home-main">
  <section class="home-intro" aria-labelledby="home-title">
    <div class="wrap">
      <h1 id="home-title">無料占い えみり</h1>
      <p class="home-lead">恋愛・相性・性格・今日の運勢を、登録なしで気軽に占えます。<span class="home-tagline">あなたを、ひとつの占いで決めつけない。</span></p>
    ${searchForm("", "home-q")}
    </div>
  </section>

  <div class="home-layout wrap">
    ${side("")}

    <div class="home-content">
      <section class="home-block" id="uranau" aria-labelledby="uranau-title">
        <h2 id="uranau-title" class="block-title">占いを探す</h2>
        <div class="tabs" data-tabs>
          <div class="tab-list" role="tablist" aria-label="占いの探し方">
            <button type="button" class="tab" role="tab" id="tab-senjutsu" aria-controls="senjutsu" aria-selected="true">占い一覧</button>
            <button type="button" class="tab" role="tab" id="tab-nayami" aria-controls="nayami" aria-selected="false">悩みから探す</button>
          </div>
          <div class="tab-panel" role="tabpanel" id="senjutsu" aria-labelledby="tab-senjutsu">
            <ul class="tiles">
${top.slice(0, SHOW).map((x) => "              " + tile(x, "", "top-senjutsu")).join("\n")}
            </ul>
            <p class="more"><a href="ichiran/">すべての占いを見る（${all.length}）</a></p>
          </div>
          <div class="tab-panel" role="tabpanel" id="nayami" aria-labelledby="tab-nayami">
            <ul class="tiles tiles-nayami">
${C.NAYAMI.map((n) => "              " + nayamiTile(n, "")).join("\n")}
            </ul>
          </div>
        </div>
      </section>

      <section class="home-block home-today" aria-label="今日の占い">
  ${daily}
      </section>

      <section class="home-block" aria-labelledby="rec-title">
        <h2 id="rec-title" class="block-title">おすすめの占い</h2>
        <p class="block-note">えみりだけのオリジナル占いと、新しく加わった占いです。</p>
        <ul class="rows">
${recs.map((x) => "          " + row(x, "", "top-rec")).join("\n")}
        </ul>
      </section>

      <section class="home-block" aria-labelledby="new-title">
        <h2 id="new-title" class="block-title">新着の占い</h2>
        <ul class="rows">
${news.map((x) => "          " + row(x, "", "top-new", x.pub === latest ? '<span class="badge-new">NEW</span>' : "").replace("</small>", `｜${fmtDate(x.pub)}</small>`)).join("\n")}
        </ul>
        <p class="more"><a href="ichiran/#new">新着をもっと見る</a></p>
      </section>
    </div>
  </div>
</main>

`;
  fs.writeFileSync(file, head + main + foot);
}

// ---------- すべての占い ----------
function ichiran() {
  const groups = C.GROUPS.map((g) => {
    const list = C.ITEMS.filter((x) => x.group === g.id).sort(order);
    return `    <section class="home-block" aria-labelledby="g-${g.id}">
      <h2 id="g-${g.id}" class="block-title">${esc(g.name)}（${list.length}）</h2>
      <ul class="rows">
${list.map((x) => "        " + row(x, "../", "ichiran")).join("\n")}
      </ul>
    </section>`;
  }).join("\n\n");
  const news = C.ITEMS.filter((x) => x.group !== "aisho" || x.id === "aisho").sort(byPubDesc);
  const body = `<main id="main" class="home-main wrap-narrow">
${crumb("../", "すべての占い")}
  <section class="home-intro home-intro-sub">
    <h1>すべての占い</h1>
    <p class="home-lead">えみりの無料占いを、分類ごとと新しい順にまとめました。どれも登録不要で何度でも占えます。</p>
    ${searchForm("../", "ichiran-q")}
  </section>

${groups}

    <section class="home-block" id="new" aria-labelledby="new-title">
      <h2 id="new-title" class="block-title">新着順</h2>
      <ul class="rows">
${news.map((x) => "        " + row(x, "../", "ichiran-new").replace("</small>", `｜${fmtDate(x.pub)}</small>`)).join("\n")}
      </ul>
    </section>
</main>

`;
  page("ichiran/", 1, "すべての占い一覧｜無料占い えみり", `えみりの無料占い${C.ITEMS.length}種類を、生年月日・カード・夢や手相・開運・相性の分類ごとと、新しい順にまとめた一覧です。どれも登録不要で占えます。`, body);
}

// ---------- 悩みカテゴリ ----------
function nayamiPage(n) {
  const themes = (C.THEMES[n.id] || []).map((t) => {
    const x = t.id ? C.byId[t.id] : null;
    return { id: t.id || t.track, title: t.title, desc: t.desc, url: x ? x.url : t.url, icon: t.icon || (x && x.icon) || n.icon };
  });
  const used = new Set(themes.map((t) => t.id));
  const list = nayamiItems(n.id).filter((x) => !used.has(x.id));
  const others = C.NAYAMI.filter((x) => x !== n);
  const themeBlock = themes.length ? `  <section class="home-block" aria-labelledby="theme-title">
    <h2 id="theme-title" class="block-title">${esc(n.name)}の悩みから選ぶ</h2>
    <ul class="rows rows-theme">
${themes.map((x) => "      " + row(x, "../../", `nayami-${n.id}-theme`)).join("\n")}
    </ul>
  </section>
<!--aff-inline-->

` : "";
  const total = list.length + themes.length;
  const body = `<main id="main" class="home-main wrap-narrow">
${crumb2("../../", "悩みから探す", "../../#nayami", n.name)}
  <section class="home-intro home-intro-sub">
    <h1>${esc(n.name)}の占い</h1>
    <p class="home-lead">${esc(n.lead)}${total}種類の無料占いから選べます。</p>
  </section>

${themeBlock}  <section class="home-block" aria-labelledby="list-title">
    <h2 id="list-title" class="block-title">${themes.length ? `占術を選んで${esc(n.name)}を占う（${list.length}）` : `${esc(n.name)}を占う（${list.length}）`}</h2>
    <ul class="rows">
${list.map((x) => "      " + row(x, "../../", `nayami-${n.id}`)).join("\n")}
    </ul>
  </section>
${themes.length ? "" : "<!--aff-inline-->\n"}
  <section class="home-block" aria-labelledby="other-title">
    <h2 id="other-title" class="block-title">ほかの悩みから探す</h2>
    <ul class="tiles tiles-nayami">
${others.map((x) => "      " + nayamiTile(x, "../../")).join("\n")}
    </ul>
  </section>
</main>

`;
  page(`nayami/${n.id}/`, 2, `${n.name}の占い｜無料で占える${total}種類｜えみり`, `${n.name}の悩みに合う無料占いの一覧です。${n.lead}${themes.map((x) => x.title).concat(list.map((x) => x.title)).slice(0, 4).join("・")}など、登録不要で占えます。`, body);
}

// ---------- 検索 ----------
function kensaku() {
  const scripts = ["core/dom.js", "core/search-core.js", "pages/search-page.js"].map((s) => `<script defer src="../assets/js/${s}"></script>`).join("\n");
  const body = `<main id="main" class="home-main wrap-narrow">
${crumb("../", "検索")}
  <section class="home-intro home-intro-sub">
    <h1>占い・悩みを検索</h1>
    ${searchForm("../", "kensaku-q")}
  </section>
  <section class="home-block" aria-live="polite" aria-labelledby="result-title">
    <h2 id="result-title" class="block-title" tabindex="-1">検索結果</h2>
    <div id="search-result" data-index="../assets/data/search.json"><p class="block-note">キーワードを入れて検索してください。</p></div>
  </section>
  <section class="home-block" aria-labelledby="cat-title">
    <h2 id="cat-title" class="block-title">悩みから探す</h2>
    <ul class="tiles tiles-nayami">
${C.NAYAMI.map((x) => "      " + nayamiTile(x, "../")).join("\n")}
    </ul>
    <p class="more"><a href="../ichiran/">すべての占いを見る</a></p>
  </section>
</main>

`;
  page("kensaku/", 1, "占い・悩みを検索｜えみり", "えみりの無料占いや、夢占い・手相・ほくろ・パワーストーンなどの解説ページを、キーワードで検索できます。", body, scripts.replace(/\.\.\/assets/g, "../../assets"));
}

// ---------- 相談のしかた（相談サービスの案内はアフィリエイトの仕組みが入れる） ----------
function soudan() {
  const body = `<main id="main" class="home-main wrap-narrow">
${crumb("../", "占い師への相談のしかた")}
  <section class="home-intro home-intro-sub">
    <h1>占い師に相談する方法と選び方</h1>
    <p class="home-lead">えみりの無料占いは、生年月日などから計算した結果を読むものです。自分の状況を話して、その人に合わせて読んでほしいときは、占い師に直接相談できるサービスがあります。</p>
  </section>
  <section class="home-block prose" aria-labelledby="how-title">
    <h2 id="how-title" class="block-title">相談のしかたは3つ</h2>
    <dl class="soudan-dl">
      <div><dt>電話で相談</dt><dd>声で話しながら、その場で質問を重ねられます。料金は時間（分）ごとのことが多いので、通話時間の目安を決めておくと安心です。</dd></div>
      <div><dt>チャットで相談</dt><dd>文字で落ち着いて話せます。声を出せない場所からでも相談できます。料金が時間ごとか、文字数・回数ごとかを確かめましょう。</dd></div>
      <div><dt>メッセージで相談</dt><dd>時間を気にせず、文章でじっくり相談できます。返事が届くまでの目安と、1回あたりの料金を確かめましょう。</dd></div>
    </dl>
    <h3>相談する前に確かめること</h3>
    <ul>
      <li>料金のしくみと、初回の特典の条件（公式サイトで最新の情報を確認）</li>
      <li>相談したいことを、短いメモにまとめておく</li>
      <li>占いの結果は判断のヒント。大切な決断は、自分の気持ちと暮らしを大事にして</li>
    </ul>
  </section>
</main>

`;
  page("soudan/", 1, "占い師に相談する方法と選び方｜電話・チャット・メッセージ｜えみり", "占い師に相談できるサービスを、電話・チャット・メッセージの相談のしかたの違いで紹介します。料金のしくみや、相談する前に確かめることもまとめました。", body);
}

// ---------- 検索の索引 ----------
function walk(dir, out = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (e.isDirectory()) { if (![".git", ".github", "node_modules", "tests", "tools", "worker", "assets", "premium", "line", "kensaku"].includes(e.name)) walk(path.join(dir, e.name), out); }
    else if (e.name === "index.html") out.push(path.relative(ROOT, path.join(dir, e.name)).split(path.sep).join("/"));
  }
  return out;
}
function searchIndex() {
  const catUrls = new Set(C.ITEMS.map((x) => x.url));
  const entries = C.ITEMS.map((x) => ({ t: x.title, d: x.desc, u: x.url, c: (C.GROUPS.find((g) => g.id === x.group) || {}).name, k: [x.kw].concat(x.nayami.map((n) => C.NAYAMI.find((g) => g.id === n).name)).join(" "), p: 1 }));
  for (const n of C.NAYAMI) entries.push({ t: `${n.name}の占い`, d: n.lead, u: `nayami/${n.id}/`, c: "悩みから探す", k: n.name, p: 1 });
  for (const rel of walk(ROOT)) {
    const url = rel.replace(/index\.html$/, "");
    if (!url || catUrls.has(url) || /^(about|privacy|contact|tokushoho|ichiran|nayami|soudan)\//.test(url) || /^unsei\/\d/.test(url)) continue;
    const html = fs.readFileSync(path.join(ROOT, rel), "utf8");
    if (html.includes('<meta name="robots" content="noindex">')) continue;
    const t = (html.match(/<title>([^<]*)<\/title>/) || [])[1] || "";
    const d = (html.match(/<meta name="description" content="([^"]*)"/) || [])[1] || "";
    const sec = SECTIONS[url.split("/")[0]];
    entries.push({ t: t.replace(/｜えみり$/, "").replace(/&amp;/g, "&"), d: d.replace(/&amp;/g, "&").slice(0, 70), u: url, c: sec ? sec.name : "", k: "", p: 0 });
  }
  fs.mkdirSync(path.join(ROOT, "assets/data"), { recursive: true });
  fs.writeFileSync(path.join(ROOT, "assets/data/search.json"), JSON.stringify(entries));
  return entries.length;
}

home();
ichiran();
for (const n of C.NAYAMI) nayamiPage(n);
kensaku();
soudan();
const n = searchIndex();
console.log(`home：TOP・すべての占い・悩み ${C.NAYAMI.length}・検索（索引 ${n} 件）・相談のしかた`);
