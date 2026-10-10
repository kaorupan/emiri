"use strict";
// 誕生日占い（366ページ）
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const ROOT = path.join(__dirname, "..");
const DAYS = [31, 29, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
const pad = (n) => (n < 10 ? "0" : "") + n;
const read = (k) => fs.readFileSync(path.join(ROOT, "tanjobi", k, "index.html"), "utf8");

test("366日すべてのページがあり、タイトルと説明が日ごとに違う", () => {
  const titles = new Set(), descs = new Set();
  let n = 0;
  for (let m = 1; m <= 12; m++) for (let d = 1; d <= DAYS[m - 1]; d++) {
    const html = read(`${pad(m)}-${pad(d)}`);
    n++;
    assert.ok(html.includes(`<h1>${m}月${d}日生まれの性格と運勢</h1>`), `${m}/${d}`);
    assert.ok(!/undefined|NaN/.test(html), `${m}/${d}`);
    titles.add(html.match(/<title>(.*?)<\/title>/)[1]);
    descs.add(html.match(/<meta name="description" content="(.*?)">/)[1]);
    // リンク先の誕生日ページが存在する
    for (const [, k] of html.matchAll(/href="\.\.\/(\d\d-\d\d)\/"/g)) assert.ok(fs.existsSync(path.join(ROOT, "tanjobi", k, "index.html")), k);
  }
  assert.equal(n, 366);
  assert.equal(titles.size, 366);
  assert.equal(descs.size, 366);
});

test("代表的な日の中身", () => {
  const a = read("03-15");
  assert.ok(a.includes("<dt>太陽星座</dt><dd>魚座</dd>"));
  assert.ok(a.includes("バースデーナンバー</dt><dd>6"));
  assert.ok(a.includes("アクアマリン"));
  const b = read("03-21"); // 春分のころ：年によって星座が変わる
  assert.ok(b.includes("生まれた年によって"));
  const c = read("02-29");
  assert.ok(c.includes("4年に一度だけめぐってくる日"));
  assert.ok(c.includes("バースデーナンバー</dt><dd>11"));
  const idx = fs.readFileSync(path.join(ROOT, "tanjobi/index.html"), "utf8");
  assert.equal((idx.match(/<li><a href="\d\d-\d\d\/">/g) || []).length, 366);
});
