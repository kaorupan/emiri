#!/usr/bin/env node
// SEO の仕上げ：node tools/seo/seo.mjs
//  - 全ページの canonical と og:url を、site.config.json の baseUrl ＋ ページの場所から作った正式URLにそろえる
//  - 全ページの <head> に RSS（feed.xml）の案内を入れる
//  - TOP に WebSite の構造化データを入れる（運勢の記事の構造化データは tools/daily/generate.mjs が書く）
//  - sitemap.xml・feed.xml・robots.txt を作る
//  - OGP画像（assets/img/ogp/。python3 tools/seo/ogp.py で作る）と twitter:card を全ページに入れる
//  - パンくず（nav.breadcrumb）から BreadcrumbList の構造化データを作る
//  - 「次はこの占いも」の関連リンク（tools/seo/sections.json）を本文の最後に入れる
//  - sitemap.xml の lastmod：ページの中身が変わった日（tools/seo/lastmod.json に記録）
// 何度実行しても同じ結果になる。独自ドメインに移るときは site.config.json の baseUrl を変えて実行するだけ。
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import crypto from "node:crypto";
import { execSync } from "node:child_process";

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const SKIP = new Set([".git", ".github", "node_modules", "tests", "tools", "_site", "worker"]);
const DAILY_RE = /^unsei\/(\d{4}-\d{2}-\d{2})\/index\.html$/;

export function loadConfig(root = ROOT) {
  const c = JSON.parse(fs.readFileSync(path.join(root, "site.config.json"), "utf8"));
  return { ...c, baseUrl: c.baseUrl.replace(/\/+$/, "") };
}

const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

export const SECTIONS = JSON.parse(fs.readFileSync(path.join(ROOT, "tools", "seo", "sections.json"), "utf8"));

// ページに使うOGP画像（サイト内の場所）。タイプ別の画像 → 占いごとの画像 → 共通の画像
export function ogpImageOf(rel, root = ROOT) {
  const parts = rel.split("/");
  const cands = [];
  if (parts.length === 3) cands.push(`assets/img/ogp/${parts[0]}-${parts[1]}.jpg`);
  if (parts.length > 1) cands.push(`assets/img/ogp/${parts[0]}.jpg`);
  cands.push("assets/img/ogp/default.jpg");
  return cands.find((c) => fs.existsSync(path.join(root, c))) || null;
}

const stripTags = (s) => s.replace(/<[^>]*>/g, "").replace(/&amp;/g, "&").replace(/&quot;/g, '"').trim();

// パンくず（<nav class="breadcrumb">）→ BreadcrumbList
export function breadcrumbLd(html, pageUrl) {
  const nav = html.match(/<nav class="breadcrumb"[^>]*>\s*<ol>([\s\S]*?)<\/ol>/);
  if (!nav) return null;
  const items = [...nav[1].matchAll(/<li([^>]*)>([\s\S]*?)<\/li>/g)].map((m) => {
    const a = m[2].match(/<a href="([^"]*)"[^>]*>([\s\S]*?)<\/a>/);
    return a ? { name: stripTags(a[2]), item: new URL(a[1], pageUrl).href } : { name: stripTags(m[2]), item: pageUrl };
  });
  if (items.length < 2) return null;
  return { "@context": "https://schema.org", "@type": "BreadcrumbList",
    itemListElement: items.map((x, i) => ({ "@type": "ListItem", position: i + 1, name: x.name, item: x.item })) };
}

// 「次はこの占いも」：同じ占いの中のページには、その占いの関連先を4つ
const RELATED_RE = /\n?<!--related-->[\s\S]*?<!--\/related-->\n?/;
export function applyRelated(html, rel) {
  let out = html.replace(RELATED_RE, "\n");
  const top = rel.split("/")[0];
  const sec = SECTIONS.sections[top];
  if (rel === "index.html" || !sec || /<meta name="robots" content="noindex">/.test(out)) return out;
  const up = "../".repeat(rel.split("/").length - 1);
  const items = sec.related.map((k) => {
    const r = SECTIONS.sections[k];
    return `      <li><a href="${up}${k}/" data-track="related_click" data-target="${k}" data-position="related"><span>${r.emoji} ${esc(r.name)}<br><small class="lead">${esc(r.lead)}</small></span><span class="arrow" aria-hidden="true">→</span></a></li>`;
  }).join("\n");
  const block = `<!--related-->
  <section class="section related-next" aria-labelledby="related-next-title">
    <h2 id="related-next-title">次はこの占いも</h2>
    <ul class="link-list">
${items}
    </ul>
  </section>
<!--/related-->`;
  for (const anchor of ["<!--aff-->", "<!--line-cta-->", "</main>"]) {
    const i = out.indexOf(anchor);
    if (i >= 0) return out.slice(0, i) + block + "\n" + out.slice(i);
  }
  return out;
}

// サイト内の場所（"suhijutsu/index.html"）→ 正式URL
export function urlOf(config, rel) {
  const dir = rel.replace(/(^|\/)index\.html$/, "$1");
  return `${config.baseUrl}/${dir}`;
}

function setOrInsertAfter(html, re, tag, anchorRe) {
  if (re.test(html)) return html.replace(re, tag);
  return html.replace(anchorRe, (m) => `${m}\n${tag}`);
}

// 1ページ分の <head> を整える（運勢の生成でも同じ関数を通す）
export function applyHead(html, config, rel) {
  const url = urlOf(config, rel);
  const depth = rel.split("/").length - 1;
  const feedHref = `${"../".repeat(depth)}feed.xml`;
  let out = html.replace(/<link rel="canonical" href="[^"]*">/, `<link rel="canonical" href="${esc(url)}">`);
  out = setOrInsertAfter(out, /<meta property="og:url" content="[^"]*">/, `<meta property="og:url" content="${esc(url)}">`, /<link rel="canonical" href="[^"]*">/);
  out = setOrInsertAfter(out, /<link rel="alternate" type="application\/rss\+xml"[^>]*>/,
    `<link rel="alternate" type="application/rss+xml" title="${esc(config.siteName)}｜今日の運勢" href="${feedHref}">`, /<meta property="og:url" content="[^"]*">/);
  // Search Console の所有権確認（site.config.json の googleSiteVerification。TOPだけ）
  const gsv = (config.googleSiteVerification || "").trim();
  if (rel === "index.html" && gsv) {
    out = setOrInsertAfter(out, /<meta name="google-site-verification" content="[^"]*">/, `<meta name="google-site-verification" content="${esc(gsv)}">`, /<meta name="viewport"[^>]*>/);
  }
  // Google アドセンス（site.config.json の adsenseClient＝ca-pub-…。全ページ）
  const ads = (config.adsenseClient || "").trim();
  // LINE の鑑定書まわり（URL に入力内容が入る）には広告を出さない
  if (/^line\//.test(rel)) out = out.replace(/\n?<script async src="https:\/\/pagead2\.googlesyndication\.com\/pagead\/js\/adsbygoogle\.js\?client=[^"]*" crossorigin="anonymous"><\/script>/, "");
  else if (ads) {
    out = setOrInsertAfter(out, /<script async src="https:\/\/pagead2\.googlesyndication\.com\/pagead\/js\/adsbygoogle\.js\?client=[^"]*" crossorigin="anonymous"><\/script>/,
      `<script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${esc(ads)}" crossorigin="anonymous"></script>`, /<link rel="alternate" type="application\/rss\+xml"[^>]*>/);
  }
  // OGP画像と twitter:card
  const img = ogpImageOf(rel);
  if (img) {
    out = setOrInsertAfter(out, /<meta property="og:image" content="[^"]*">/, `<meta property="og:image" content="${esc(config.baseUrl + "/" + img)}">`, /<meta property="og:url" content="[^"]*">/);
    out = setOrInsertAfter(out, /<meta property="og:image:width" content="[^"]*">\n<meta property="og:image:height" content="[^"]*">/,
      `<meta property="og:image:width" content="1200">\n<meta property="og:image:height" content="630">`, /<meta property="og:image" content="[^"]*">/);
    out = setOrInsertAfter(out, /<meta name="twitter:card" content="[^"]*">/, `<meta name="twitter:card" content="summary_large_image">`, /<meta property="og:image:height" content="[^"]*">/);
  }
  // パンくずの構造化データ（自前で BreadcrumbList を書いているページはそのまま）
  const LD_BC = /\n?<script type="application\/ld\+json" id="ld-breadcrumb">[\s\S]*?<\/script>/;
  const withoutBc = out.replace(LD_BC, "");
  const bc = /BreadcrumbList/.test(withoutBc) ? null : breadcrumbLd(out, url);
  if (bc) out = setOrInsertAfter(out, /<script type="application\/ld\+json" id="ld-breadcrumb">[\s\S]*?<\/script>/,
    `<script type="application/ld+json" id="ld-breadcrumb">${JSON.stringify(bc)}</script>`, /<link rel="alternate" type="application\/rss\+xml"[^>]*>/);
  else out = withoutBc;
  // サイト共通のスクリプト（計測・結果へのフォーカス）
  const siteJs = `<script defer src="${"../".repeat(depth)}assets/js/core/site.js" id="site-js"></script>`;
  out = setOrInsertAfter(out, /<script defer src="[^"]*assets\/js\/core\/site\.js" id="site-js"><\/script>/, siteJs, /<link rel="alternate" type="application\/rss\+xml"[^>]*>/);
  // アクセス解析（GA4）：site.config.json の ga4MeasurementId（G-…）があるときだけ。
  // URLのクエリ（鑑定書の ?d= など、個人の情報が入りうる）は送らないよう、page_location と page_referrer を上書きする。
  const GA_RE = /\n?<!--ga4-->[\s\S]*?<!--\/ga4-->/;
  const ga = (config.ga4MeasurementId || "").trim();
  out = out.replace(GA_RE, "");
  // LINE の鑑定書まわり（URL に入力内容が入る）には、アクセス解析も入れない
  if (/^G-[A-Z0-9]+$/.test(ga) && !/^line\//.test(rel)) {
    const tag = `<!--ga4--><script async src="https://www.googletagmanager.com/gtag/js?id=${ga}"></script>
<script>window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag("js",new Date());gtag("config","${ga}",{page_location:location.origin+location.pathname,page_referrer:document.referrer.replace(/[?#].*$/,"")});</script><!--/ga4-->`;
    out = out.replace(/(<script defer src="[^"]*assets\/js\/core\/site\.js" id="site-js"><\/script>)/, `${tag}\n$1`);
  }
  if (rel === "index.html") {
    const ld = `<script type="application/ld+json" id="ld-website">${JSON.stringify({
      "@context": "https://schema.org", "@type": "WebSite", name: config.siteName, url: `${config.baseUrl}/`,
      description: config.description, inLanguage: "ja"
    })}</script>`;
    out = setOrInsertAfter(out, /<script type="application\/ld\+json" id="ld-website">[\s\S]*?<\/script>/, ld, /<link rel="alternate" type="application\/rss\+xml"[^>]*>/);
  }
  return out;
}

function walk(dir, root, out = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (e.isDirectory()) { if (!SKIP.has(e.name)) walk(path.join(dir, e.name), root, out); }
    else if (e.name.endsWith(".html")) out.push(path.relative(root, path.join(dir, e.name)).split(path.sep).join("/"));
  }
  return out;
}

function writeIfChanged(file, content) {
  if (fs.existsSync(file) && fs.readFileSync(file, "utf8") === content) return false;
  fs.writeFileSync(file, content);
  return true;
}

const meta = (html, re) => ((html.match(re) || [])[1] || "").replace(/&quot;/g, '"').replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&amp;/g, "&");

export function sitemap(config, pages, lastmod = {}) {
  const rows = pages.map((rel) => {
    const m = DAILY_RE.exec(rel);
    const d = m ? m[1] : lastmod[rel];
    return `  <url><loc>${esc(urlOf(config, rel))}</loc>${d ? `<lastmod>${d}</lastmod>` : ""}</url>`;
  });
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${rows.join("\n")}\n</urlset>\n`;
}

export function feed(config, root, pages, limit = 30) {
  const posts = pages.filter((p) => DAILY_RE.test(p)).sort().reverse().slice(0, limit);
  const items = posts.map((rel) => {
    const html = fs.readFileSync(path.join(root, rel), "utf8");
    const date = DAILY_RE.exec(rel)[1];
    const pub = new Date(`${date}T00:00:00+09:00`).toUTCString();
    return `    <item>
      <title>${esc(meta(html, /<meta property="og:title" content="([^"]*)">/))}</title>
      <link>${esc(urlOf(config, rel))}</link>
      <guid isPermaLink="true">${esc(urlOf(config, rel))}</guid>
      <pubDate>${pub}</pubDate>
      <description>${esc(meta(html, /<meta name="description" content="([^"]*)">/))}</description>
    </item>`;
  });
  const last = posts[0] ? new Date(`${DAILY_RE.exec(posts[0])[1]}T00:00:00+09:00`).toUTCString() : "";
  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>${esc(config.siteName)}｜今日の運勢</title>
    <link>${esc(config.baseUrl)}/unsei/</link>
    <description>${esc(config.description)}</description>
    <language>ja</language>
${last ? `    <lastBuildDate>${last}</lastBuildDate>\n` : ""}${items.join("\n")}
  </channel>
</rss>
`;
}

// ページの中身が変わった日を記録する（tools/seo/lastmod.json：{ 場所: [中身のハッシュ, 日付] }）
const todayJst = () => new Date(Date.now() + 9 * 3600e3).toISOString().slice(0, 10);
function gitDates(root) {
  const dates = {};
  try {
    const log = execSync("git log --format=@%cs --name-only -- '*.html'", { cwd: root, encoding: "utf8", maxBuffer: 256 * 1024 * 1024, stdio: ["ignore", "pipe", "ignore"] });
    let d = null;
    for (const line of log.split("\n")) {
      if (line.startsWith("@")) d = line.slice(1);
      else if (line && d && !dates[line]) dates[line] = d;
    }
  } catch { /* git がなければ今日の日付 */ }
  return dates;
}
export function updateLastmod(root, pages) {
  const file = path.join(root, "tools", "seo", "lastmod.json");
  const old = fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, "utf8")) : {};
  const today = todayJst();
  let git = null;
  const next = {};
  for (const rel of pages) {
    const hash = crypto.createHash("sha1").update(fs.readFileSync(path.join(root, rel))).digest("hex").slice(0, 12);
    if (old[rel] && old[rel][0] === hash) next[rel] = old[rel];
    else if (old[rel]) next[rel] = [hash, today];
    else { git = git || gitDates(root); next[rel] = [hash, git[rel] || today]; }
  }
  const body = JSON.stringify(next, null, 0).replace(/\],"/g, '],\n"') + "\n";
  const changed = writeIfChanged(file, body);
  return { dates: Object.fromEntries(Object.entries(next).map(([k, v]) => [k, v[1]])), changed };
}

export function run(root = ROOT) {
  const config = loadConfig(root);
  const pages = walk(root, root).sort((a, b) => (a === "index.html" ? -1 : b === "index.html" ? 1 : a.localeCompare(b)));
  const changed = [];
  for (const rel of pages) {
    const file = path.join(root, rel);
    if (writeIfChanged(file, applyHead(applyRelated(fs.readFileSync(file, "utf8"), rel), config, rel))) changed.push(rel);
  }
  // 検索に出さないページ（<meta name="robots" content="noindex">。購入者専用の鑑定書ページなど）はサイトマップに入れない
  const indexable = pages.filter((rel) => !/<meta name="robots" content="noindex">/.test(fs.readFileSync(path.join(root, rel), "utf8")));
  const lm = updateLastmod(root, indexable);
  if (lm.changed) changed.push("tools/seo/lastmod.json");
  if (writeIfChanged(path.join(root, "sitemap.xml"), sitemap(config, indexable, lm.dates))) changed.push("sitemap.xml");
  if (writeIfChanged(path.join(root, "feed.xml"), feed(config, root, pages))) changed.push("feed.xml");
  const robots = `User-agent: *\nAllow: /\n\nSitemap: ${config.baseUrl}/sitemap.xml\n`;
  const ads = (config.adsenseClient || "").trim();
  if (ads && writeIfChanged(path.join(root, "ads.txt"), `google.com, ${ads.replace(/^ca-/, "")}, DIRECT, f08c47fec0942fa0\n`)) changed.push("ads.txt");
  if (writeIfChanged(path.join(root, "robots.txt"), robots)) changed.push("robots.txt");
  return changed;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const changed = run();
  console.log(changed.length ? `更新：${changed.join(", ")}` : "変更なし");
}
