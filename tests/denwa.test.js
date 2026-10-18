// 電話番号占い：assets/js/content/denwa.js
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const D = require("../assets/js/content/denwa.js");
const N = require("../assets/js/content/seimei-numbers.js");

test("下4桁を80で割った余り（0は80）", () => {
  assert.equal(D.remainderOf("5678"), 78);
  assert.equal(D.remainderOf("0080"), 80);
  assert.equal(D.remainderOf("0000"), 80);
  assert.equal(D.remainderOf("0001"), 1);
  assert.equal(D.remainderOf("9999"), 79);
});

test("ハイフン・空白・全角数字でも同じ結果、短すぎる番号はエラー", () => {
  const a = D.read("090-1234-5678", N), b = D.read("０９０ １２３４ ５６７８", N), c = D.read("5678", N);
  assert.equal(a.remainder, 78); assert.equal(b.remainder, 78); assert.equal(c.remainder, 78);
  assert.equal(a.sum, 0 + 9 + 0 + 1 + 2 + 3 + 4 + 5 + 6 + 7 + 8);
  assert.equal(a.numerology, 9);
  assert.ok(a.meaning.luck && a.meaning.text);
  assert.equal(D.read("123", N).ok, false);
});

test("1〜80のどの余りにも意味があり、大吉の数が見つかる", () => {
  for (let r = 1; r <= 80; r++) assert.ok(N.LUCKS.includes(N.number(r).luck));
  assert.ok(D.remaindersBy("大吉", N).includes(1));
});

test("ページ：番号を保存・送信しない旨があり、TOPからリンク", () => {
  const html = fs.readFileSync(path.join(__dirname, "../denwa/index.html"), "utf8");
  assert.match(html, /id="denwa-form"/);
  assert.match(html, /保存したり、どこかへ送ったりすることはありません/);
  assert.equal((html.match(/<tr class="dw-r-/g) || []).length, 80);
  assert.ok(fs.readFileSync(path.join(__dirname, "../index.html"), "utf8").includes('href="denwa/"'));
});
