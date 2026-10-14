#!/usr/bin/env node
// SEO の仕上げ：node tools/seo/seo.mjs
//  - 全ページの canonical と og:url を、site.config.json の baseUrl ＋ ページの場所から作った正式URLにそろえる
//  - 全ページの <head> に RSS（feed.xml）の案内を入れる
//  - TOP に WebSite の構造化データを入れる（運勢の記事の構造化データは tools/daily/generate.mjs が書く）
//  - sitemap.xml・feed.xml・robots.txt を作る
// 何度実行しても同じ結果になる。独自ドメインに移るときは site.config.json の baseUrl を変えて実行するだけ。
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const SKIP = new Set([".git", ".github", "node_modules", "tests", "tools", "_site", "worker"]);
const DAILY_RE = /^unsei\/(\d{4}-\d{2}-\d{2})\/index\.html$/;

export function loadConfig(root = ROOT) {
  const c = JSON.parse(fs.readFileSync(path.join(root, "site.config.json"), "utf8"));
  return { ...c, baseUrl: c.baseUrl.replace(/\/+$/, "") };
}

const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

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
  if (ads) {
    out = setOrInsertAfter(out, /<script async src="https:\/\/pagead2\.googlesyndication\.com\/pagead\/js\/adsbygoogle\.js\?client=[^"]*" crossorigin="anonymous"><\/script>/,
      `<script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${esc(ads)}" crossorigin="anonymous"></script>`, /<link rel="alternate" type="application\/rss\+xml"[^>]*>/);
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

export function sitemap(config, pages) {
  const rows = pages.map((rel) => {
    const m = DAILY_RE.exec(rel);
    return `  <url><loc>${esc(urlOf(config, rel))}</loc>${m ? `<lastmod>${m[1]}</lastmod>` : ""}</url>`;
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

export function run(root = ROOT) {
  const config = loadConfig(root);
  const pages = walk(root, root).sort((a, b) => (a === "index.html" ? -1 : b === "index.html" ? 1 : a.localeCompare(b)));
  const changed = [];
  for (const rel of pages) {
    const file = path.join(root, rel);
    if (writeIfChanged(file, applyHead(fs.readFileSync(file, "utf8"), config, rel))) changed.push(rel);
  }
  // 検索に出さないページ（<meta name="robots" content="noindex">。購入者専用の鑑定書ページなど）はサイトマップに入れない
  const indexable = pages.filter((rel) => !/<meta name="robots" content="noindex">/.test(fs.readFileSync(path.join(root, rel), "utf8")));
  if (writeIfChanged(path.join(root, "sitemap.xml"), sitemap(config, indexable))) changed.push("sitemap.xml");
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
