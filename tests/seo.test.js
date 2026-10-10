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

test("sitemap.xml：全ページを1回ずつ載せ、運勢の記事には lastmod", () => {
  const xml = read("sitemap.xml");
  const locs = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
  assert.deepEqual([...locs].sort(), pages().map(urlOf).sort());
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
