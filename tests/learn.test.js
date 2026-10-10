"use strict";
// 「占いを知る」の解説ページ：生成し直した内容が鑑定の文章データとそろっているか
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const ROOT = path.join(__dirname, "..");
const read = (slug) => fs.readFileSync(path.join(ROOT, "learn", slug, "index.html"), "utf8");
const count = (html) => (html.match(/<div><dt>/g) || []).length;

test("すべての解説ページがあり、「準備中」が残っていない", () => {
  const index = fs.readFileSync(path.join(ROOT, "learn/index.html"), "utf8");
  assert.ok(!index.includes("準備中"));
  for (const slug of ["suhijutsu", "tarot", "kyusei", "shichusuimei", "maya", "shukuyo", "horoscope", "shibi", "jyotish", "seiju", "koyomi"]) {
    assert.ok(index.includes(`href="${slug}/"`), slug);
    const html = read(slug);
    assert.ok(!/undefined|NaN/.test(html), slug);
  }
});

test("用語の一覧の数", () => {
  assert.equal(count(read("tarot")), 22);
  assert.equal(count(read("kyusei")), 9);
  assert.equal(count(read("shichusuimei")), 10 + 10 + 12 + 6);
  assert.equal(count(read("maya")), 20 + 13 + 4 + 4);
  assert.equal(count(read("shukuyo")), 27 + 6 + 11);
  assert.equal(count(read("horoscope")), 12 + 4 + 3);
  assert.equal(count(read("shibi")), 12 + 14 + 4 + 5);
  assert.equal(count(read("jyotish")), 12 + 27 + 9 + 8);
  assert.equal(count(read("seiju")), 4 + 3 + 12);
  assert.equal(count(read("koyomi")), 3 + 5 + 24 + 6);
});

test("鑑定の文章データと同じ内容（例：タロットの愚者、宿曜の觜宿）", () => {
  const deck = require("../assets/js/content/tarot-deck.js");
  assert.ok(read("tarot").includes(deck.CARDS[0].upright));
  const sk = require("../assets/js/content/shukuyo-text.js");
  assert.ok(read("shukuyo").includes(sk.SHUKU["觜宿"].keyword));
});
