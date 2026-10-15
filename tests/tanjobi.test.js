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

test("七十二候とデーカン：すべての日にあり、72候・36区切りをすべて使い、二十四節気と食い違わない", async () => {
  const { KOU, DECAN } = await import(require("node:path").join(__dirname, "../tools/tanjobi/data.mjs"));
  const fs = require("node:fs"), path = require("node:path");
  assert.equal(KOU.length, 72);
  assert.equal(Object.keys(DECAN).length, 12);
  const usedKou = new Set(), usedDec = new Set();
  const TERM_OF_KOU = ["立春","雨水","啓蟄","春分","清明","穀雨","立夏","小満","芒種","夏至","小暑","大暑","立秋","処暑","白露","秋分","寒露","霜降","立冬","小雪","大雪","冬至","小寒","大寒"];
  for (const dir of fs.readdirSync(path.join(__dirname, "../tanjobi")).filter((x) => /^\d\d-\d\d$/.test(x))) {
    const html = fs.readFileSync(path.join(__dirname, "../tanjobi", dir, "index.html"), "utf8");
    const k = html.match(/<dt>七十二候<\/dt><dd>「([^（]+)（/);
    const dc = html.match(/<dt>星座の中の区切り<\/dt><dd>([^（]+)/);
    const term = html.match(/二十四節気の「([^（]+)（/);
    assert.ok(k && dc && term, dir);
    const i = KOU.findIndex((x) => x[0] === k[1]);
    assert.ok(i >= 0, dir);
    assert.equal(TERM_OF_KOU[Math.floor(i / 3)], term[1], `${dir}：節気と七十二候が食い違う`);
    usedKou.add(i); usedDec.add(dc[1]);
  }
  assert.equal(usedKou.size, 72);
  assert.equal(usedDec.size, 36);
});

test("誕生日ページ：よく知られた日付の七十二候", () => {
  const fs = require("node:fs"), path = require("node:path");
  const kouOf = (d) => fs.readFileSync(path.join(__dirname, "../tanjobi", d, "index.html"), "utf8").match(/<dt>七十二候<\/dt><dd>「([^（]+)（/)[1];
  assert.equal(kouOf("04-10"), "鴻雁北");
  assert.equal(kouOf("07-02"), "半夏生");
  assert.equal(kouOf("12-22"), "乃東生");
  assert.equal(kouOf("10-10"), "鴻雁来");
});
