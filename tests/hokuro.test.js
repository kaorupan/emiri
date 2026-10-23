"use strict";
// ほくろ占い（tools/hokuro/）
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const ROOT = path.join(__dirname, "..");

test("場所ごとのページ・テーマ別ページ・TOPがそろい、リンクが切れていない", async () => {
  const { SPOTS, HUBS } = await import(path.join(ROOT, "tools/hokuro/data.mjs"));
  assert.ok(SPOTS.length >= 25);
  assert.equal(new Set(SPOTS.map((s) => s.slug)).size, SPOTS.length);
  const idx = fs.readFileSync(path.join(ROOT, "hokuro/index.html"), "utf8");
  for (const s of SPOTS) {
    for (const k of ["summary", "meaning", "love", "money", "advice"]) assert.ok(s[k] && s[k].length >= 40, `${s.slug}.${k}`);
    assert.ok(idx.includes(`href="${s.slug}/"`), `TOP → ${s.slug}`);
    const html = fs.readFileSync(path.join(ROOT, "hokuro", s.slug, "index.html"), "utf8");
    assert.match(html, /<h1>[^<]*のほくろの意味[^<]*<\/h1>/);
    assert.ok(html.includes('class="hk-mole"'), `${s.slug} の図に位置の印`);
    assert.ok(html.includes("皮膚科"), `${s.slug} に受診の案内`);
    for (const [, r] of html.matchAll(/href="\.\.\/([a-z]+)\/"/g)) assert.ok(fs.existsSync(path.join(ROOT, "hokuro", r, "index.html")), `${s.slug} → ${r}`);
  }
  for (const h of HUBS) {
    const html = fs.readFileSync(path.join(ROOT, "hokuro", h.id, "index.html"), "utf8");
    const n = SPOTS.filter((s) => s.themes.includes(h.id)).length;
    assert.ok(n >= 4, `${h.id} は4か所以上`);
    assert.equal([...html.matchAll(/class="hk-n"/g)].length, n);
  }
  assert.ok(fs.readFileSync(path.join(ROOT, "index.html"), "utf8").includes('href="hokuro/"'));
  assert.ok(fs.readFileSync(path.join(ROOT, "learn/index.html"), "utf8").includes('href="../hokuro/"'));
  assert.ok(fs.readFileSync(path.join(ROOT, "sitemap.xml"), "utf8").includes("/hokuro/mejiri/"));
});
