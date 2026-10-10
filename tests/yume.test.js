"use strict";
// 夢占い辞典
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const ROOT = path.join(__dirname, "..");

test("夢占い：一覧の語数とページがそろい、関連リンクが切れていない", () => {
  const idx = fs.readFileSync(path.join(ROOT, "yume/index.html"), "utf8");
  const slugs = [...idx.matchAll(/<li data-words="[^"]*"><a href="([a-z]+)\/">/g)].map((m) => m[1]);
  assert.ok(slugs.length >= 100);
  assert.equal(new Set(slugs).size, slugs.length);
  const titles = new Set();
  for (const s of slugs) {
    const html = fs.readFileSync(path.join(ROOT, "yume", s, "index.html"), "utf8");
    assert.ok(!/undefined|NaN/.test(html), s);
    assert.ok(/<h1>.+の夢の意味<\/h1>/.test(html), s);
    assert.ok((html.match(/<h3[ >]/g) || []).length >= 2, s + " 場面別の意味");
    titles.add(html.match(/<title>(.*?)<\/title>/)[1]);
    for (const [, r] of html.matchAll(/href="\.\.\/([a-z]+)\/"/g)) assert.ok(slugs.includes(r), `${s} → ${r}`);
  }
  assert.equal(titles.size, slugs.length);
});

test("夢占い：場面の目次・種類別ページ（親子）・場面の重複なし", () => {
  const idx = fs.readFileSync(path.join(ROOT, "yume/index.html"), "utf8");
  const slugs = [...idx.matchAll(/<li data-words="[^"]*"><a href="([a-z]+)\/">/g)].map((m) => m[1]);
  assert.ok(slugs.length >= 150);
  for (const s of slugs) {
    const html = fs.readFileSync(path.join(ROOT, "yume", s, "index.html"), "utf8");
    const heads = [...html.matchAll(/<h3 id="(s\d+)">(.*?)<\/h3>/g)];
    assert.equal(new Set(heads.map((h) => h[2])).size, heads.length, s + " 場面の見出しが重複");
    if (heads.length >= 4) {
      for (const [, id] of heads) assert.ok(html.includes(`href="#${id}"`), `${s} 目次 #${id}`);
    }
  }
  const mushi = fs.readFileSync(path.join(ROOT, "yume/mushi/index.html"), "utf8");
  for (const k of ["gokiburi", "hachi", "mukade", "ari", "ka", "kemushi", "hae", "kumo", "chou"]) assert.ok(mushi.includes(`href="../${k}/"`), "虫 → " + k);
  const g = fs.readFileSync(path.join(ROOT, "yume/gokiburi/index.html"), "utf8");
  assert.ok(g.includes('<li><a href="../mushi/">虫</a></li>'), "パンくずに親");
  assert.ok((g.match(/<h3 id="s/g) || []).length >= 10);
  assert.ok(g.includes("ゴキブリの夢を見るときの心理") && g.includes("恋愛・仕事での意味"));
});
