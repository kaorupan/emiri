// SEO の自動テスト：正式URL・sitemap.xml・feed.xml・robots.txt・構造化データ
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const ROOT = path.join(__dirname, "..");
const config = JSON.parse(fs.readFileSync(path.join(ROOT, "site.config.json"), "utf8"));
const base = config.baseUrl.replace(/\/+$/, "");
const SKIP = new Set([".git", ".github", "node_modules", "tests", "tools", "_site"]);

function pages(dir = ROOT, out = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (e.isDirectory()) { if (!SKIP.has(e.name)) pages(path.join(dir, e.name), out); }
    else if (e.name.endsWith(".html")) out.push(path.relative(ROOT, path.join(dir, e.name)).split(path.sep).join("/"));
  }
  return out;
}
const urlOf = (rel) => `${base}/${rel.replace(/(^|\/)index\.html$/, "$1")}`;
const read = (rel) => fs.readFileSync(path.join(ROOT, rel), "utf8");

test("全ページ：canonical と og:url が baseUrl＋ページの場所、RSS の案内がある", () => {
  for (const rel of pages()) {
    const html = read(rel);
    assert.ok(html.includes(`<link rel="canonical" href="${urlOf(rel)}">`), `${rel} canonical`);
    assert.ok(html.includes(`<meta property="og:url" content="${urlOf(rel)}">`), `${rel} og:url`);
    assert.match(html, /<link rel="alternate" type="application\/rss\+xml"[^>]*href="(\.\.\/)*feed\.xml">/, rel);
  }
});

test("sitemap.xml：検索に出す全ページを1回ずつ載せ、運勢の記事には lastmod", () => {
  const xml = read("sitemap.xml");
  const locs = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
  const indexable = pages().filter((rel) => !read(rel).includes('<meta name="robots" content="noindex">'));
  assert.deepEqual([...locs].sort(), indexable.map(urlOf).sort());
  assert.equal(new Set(locs).size, locs.length);
  for (const m of xml.matchAll(/<loc>[^<]*unsei\/(\d{4}-\d{2}-\d{2})\/<\/loc><lastmod>(\d{4}-\d{2}-\d{2})<\/lastmod>/g)) assert.equal(m[1], m[2]);
});

test("feed.xml：運勢の記事が新しい順、リンクは正式URL", () => {
  const xml = read("feed.xml");
  const links = [...xml.matchAll(/<item>[\s\S]*?<link>([^<]+)<\/link>/g)].map((m) => m[1]);
  assert.ok(links.length >= 1 && links.length <= 30);
  assert.deepEqual(links, [...links].sort().reverse());
  for (const l of links) assert.match(l, new RegExp(`^${base.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}/unsei/\\d{4}-\\d{2}-\\d{2}/$`));
});

test("robots.txt：sitemap の場所を書く", () => {
  assert.ok(read("robots.txt").includes(`Sitemap: ${base}/sitemap.xml`));
});

test("構造化データ：TOP は WebSite、運勢の記事は BlogPosting と BreadcrumbList（JSONとして読める）", () => {
  const ld = (html) => [...html.matchAll(/<script type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/g)].map((m) => JSON.parse(m[1]));
  assert.equal(ld(read("index.html"))[0]["@type"], "WebSite");
  const days = pages().filter((p) => /^unsei\/\d{4}-\d{2}-\d{2}\//.test(p));
  assert.ok(days.length >= 1);
  for (const rel of days) {
    const [post, crumbs] = ld(read(rel));
    const date = rel.slice(6, 16);
    assert.equal(post["@type"], "BlogPosting");
    assert.equal(post.datePublished, `${date}T00:00:00+09:00`);
    assert.equal(post.url, urlOf(rel));
    assert.equal(crumbs["@type"], "BreadcrumbList");
    assert.equal(crumbs.itemListElement.at(-1).item, urlOf(rel));
  }
});

test("OGP画像：全ページに og:image（実在する画像）と twitter:card", () => {
  for (const rel of pages()) {
    const html = read(rel);
    const m = html.match(/<meta property="og:image" content="([^"]+)">/);
    assert.ok(m, `${rel} og:image`);
    assert.ok(m[1].startsWith(`${base}/assets/img/ogp/`), rel);
    assert.ok(fs.existsSync(path.join(ROOT, m[1].slice(base.length + 1))), `${rel} の画像がある`);
    assert.ok(html.includes('<meta name="twitter:card" content="summary_large_image">'), rel);
  }
});

test("パンくずの構造化データ：パンくずのあるページは BreadcrumbList がちょうど1つ、最後はそのページ", () => {
  for (const rel of pages()) {
    const html = read(rel);
    if (!html.includes('<nav class="breadcrumb"')) continue;
    const lds = [...html.matchAll(/<script type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/g)].map((m) => JSON.parse(m[1]));
    const bcs = lds.filter((x) => x["@type"] === "BreadcrumbList");
    assert.equal(bcs.length, 1, rel);
    assert.equal(bcs[0].itemListElement[0].item, `${base}/`, rel);
    assert.equal(bcs[0].itemListElement.at(-1).item, urlOf(rel), rel);
  }
});

test("「次はこの占いも」：占いのページに関連リンクが4つ、行き先は実在する", () => {
  const S = JSON.parse(read("tools/seo/sections.json"));
  for (const [k, s] of Object.entries(S.sections)) {
    assert.ok(fs.existsSync(path.join(ROOT, k, "index.html")), k);
    assert.equal(s.related.length, 4, k);
    assert.ok(!s.related.includes(k), k);
    for (const r of s.related) assert.ok(S.sections[r], `${k}→${r}`);
  }
  for (const rel of pages()) {
    const html = read(rel);
    const want = rel !== "index.html" && S.sections[rel.split("/")[0]] && !html.includes('<meta name="robots" content="noindex">');
    const block = html.match(/<!--related-->([\s\S]*?)<!--\/related-->/);
    assert.equal(Boolean(block), Boolean(want), rel);
    if (block) assert.equal((block[1].match(/<li>/g) || []).length, 4, rel);
  }
});

test("sitemap.xml：すべてのURLに lastmod（日付の形）", () => {
  const xml = read("sitemap.xml");
  const urls = xml.match(/<url>.*<\/url>/g);
  for (const u of urls) assert.match(u, /<lastmod>\d{4}-\d{2}-\d{2}<\/lastmod>/, u);
});

test("アクセス解析（GA4）：設定したIDで全ページに1回だけ。LINEのページには入れず、URLのクエリは送らない", () => {
  const id = (config.ga4MeasurementId || "").trim();
  if (!id) return;
  for (const rel of pages()) {
    const html = read(rel);
    const n = (html.match(new RegExp(`gtag/js\\?id=${id}`, "g")) || []).length;
    assert.equal(n, rel.startsWith("line/") ? 0 : 1, rel);
    if (n) assert.ok(html.includes("page_location:location.origin+location.pathname"), rel);
  }
});
