// 適職占い：assets/js/content/tekishoku.js
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const T = require("../assets/js/content/tekishoku.js");
const E = {
  numerology: require("../assets/js/engines/numerology.js"), numText: require("../assets/js/content/numerology-text.js"),
  kyusei: require("../assets/js/engines/kyusei.js"), kyText: require("../assets/js/content/kyusei-text.js"),
  shichu: require("../assets/js/engines/shichusuimei.js"), shText: require("../assets/js/content/shichusuimei-text.js")
};
const TODAY = { year: 2026, month: 10, day: 17 };

test("適職：3つの占術の読みがそろい、空の文章がない", () => {
  for (const b of [{ year: 1991, month: 8, day: 20 }, { year: 1983, month: 9, day: 6 }, { year: 2000, month: 2, day: 29 }, { year: 1960, month: 1, day: 1 }]) {
    const v = T.build(b, TODAY, E);
    assert.equal(v.views.length, 3);
    for (const x of v.views) assert.ok(x.text.length >= 20 && !/undefined|NaN/.test(x.text), `${b.year} ${x.method}`);
    assert.ok(v.summary.strength && v.summary.workStyle && v.summary.avoid);
    assert.ok(!/(.+)・\1/.test(v.summary.workStyle), "同じ言葉をくり返さない");
  }
});

test("転職の時期：3年・12か月が今から順に並び、目安の区分は3つのどれか", () => {
  const v = T.build({ year: 1991, month: 8, day: 20 }, TODAY, E);
  assert.deepEqual(v.years.map((y) => y.year), [2026, 2027, 2028]);
  assert.equal(v.months.length, 12);
  assert.deepEqual([v.months[0].year, v.months[0].month], [2026, 10]);
  assert.deepEqual([v.months[11].year, v.months[11].month], [2027, 9]);
  for (const y of v.years) { assert.ok(["go", "ready", "stay"].includes(y.level.key)); assert.ok(y.personalYear >= 1 && y.personalYear <= 9); assert.ok(T.TSUHEN[y.tsuhen]); }
  for (const m of v.months) assert.ok(m.pm >= 1 && m.pm <= 9 && m.label);
  // パーソナルイヤーは数秘術のエンジンと一致（1991-08-20 の2026年は 2）
  assert.equal(v.years[0].personalYear, 2);
});

test("天中殺の年は「転職に動きやすい年」にしない", () => {
  for (let y = 1950; y <= 2005; y += 3) {
    const v = T.build({ year: y, month: 5, day: 15 }, TODAY, E);
    for (const x of v.years) if (x.kuubou) assert.notEqual(x.level.key, "go", `${y} ${x.year}`);
  }
});

test("ページ：フォームと結果の置き場所があり、TOPからリンクしている", () => {
  const html = fs.readFileSync(path.join(__dirname, "../tekishoku/index.html"), "utf8");
  assert.match(html, /id="tekishoku-form"/);
  assert.match(html, /content\/tekishoku\.js/);
  assert.ok(fs.readFileSync(path.join(__dirname, "../index.html"), "utf8").includes('href="tekishoku/"'));
});
