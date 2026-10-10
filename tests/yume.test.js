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
    assert.ok((html.match(/<h3>/g) || []).length >= 2, s + " 場面別の意味");
    titles.add(html.match(/<title>(.*?)<\/title>/)[1]);
    for (const [, r] of html.matchAll(/href="\.\.\/([a-z]+)\/"/g)) assert.ok(slugs.includes(r), `${s} → ${r}`);
  }
  assert.equal(titles.size, slugs.length);
});
