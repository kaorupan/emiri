"use strict";
// 手相のページ
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const ROOT = path.join(__dirname, "..");

test("手相：一覧・線ごとのページ・しるし・丘がそろい、図とリンクが切れていない", () => {
  const idx = fs.readFileSync(path.join(ROOT, "tesou/index.html"), "utf8");
  const slugs = [...new Set([...idx.matchAll(/<li><a href="([a-z]+)\/">/g)].map((m) => m[1]))];
  assert.ok(slugs.length >= 25, String(slugs.length));
  for (const s of slugs.concat(["oka", "shirushi", "renai", "kinun", "shigoto", "kenkou", "seikaku"])) {
    const html = fs.readFileSync(path.join(ROOT, "tesou", s, "index.html"), "utf8");
    assert.ok(!/undefined|NaN/.test(html), s);
    assert.ok(/<svg class="th-(fig|icon)/.test(html), s + " 図");
    for (const [, r] of html.matchAll(/href="\.\.\/([a-z]+)\/"/g)) assert.ok(fs.existsSync(path.join(ROOT, "tesou", r, "index.html")), `${s} → ${r}`);
  }
  for (const s of ["seimeisen", "zunousen", "kanjousen", "unmeisen", "taiyousen", "zaiunsen", "kekkonsen", "kenkousen"]) {
    const html = fs.readFileSync(path.join(ROOT, "tesou", s, "index.html"), "utf8");
    assert.ok((html.match(/class="th-fig th-sm"/g) || []).length >= 4, s + " 形ごとの図");
  }
  assert.ok(fs.readFileSync(path.join(ROOT, "index.html"), "utf8").includes('href="tesou/"'));
});
