"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const kyureki = require("../assets/js/core/kyureki.js");
const shukuyo = require("../assets/js/engines/shukuyo.js");
const text = require("../assets/js/content/shukuyo-text.js");
const fixture = require("./fixtures/kyureki-astronomy-engine.json");

test("旧暦：astronomy-engine から別に組み立てた旧暦と一致する", () => {
  assert.ok(fixture.cases.length >= 400);
  for (const [y, m, d, lm, ld] of fixture.cases) {
    const k = kyureki.fromGregorian(y, m, d);
    assert.deepEqual([k.leap ? -k.month : k.month, k.day], [lm, ld], `${y}-${m}-${d}`);
  }
});

test("旧暦：よく知られた旧正月・閏月", () => {
  const first = { 2023: [1, 22], 2024: [2, 10], 2025: [1, 29], 2026: [2, 17] };
  for (const y of Object.keys(first)) {
    const k = kyureki.fromGregorian(Number(y), ...first[y]);
    assert.deepEqual([k.year, k.month, k.day, k.leap], [Number(y), 1, 1, false], y);
  }
  const leap = kyureki.fromGregorian(2023, 3, 22);
  assert.deepEqual([leap.month, leap.day, leap.leap], [2, 1, true]);
  // 2033年問題：閏11月
  const l33 = kyureki.fromGregorian(2033, 12, 22);
  assert.deepEqual([l33.month, l33.day, l33.leap], [11, 1, true]);
});

test("六曜：旧暦の月＋日から（旧正月は先勝、2024年元日は赤口）", () => {
  assert.equal(kyureki.fromGregorian(2024, 2, 10).rokuyo, "先勝");
  assert.equal(kyureki.fromGregorian(2024, 1, 1).rokuyo, "赤口");
});

test("各月1日の宿（国立天文台 暦Wiki の表）と、8月15日＝婁", () => {
  const starts = ["室", "奎", "胃", "畢", "参", "鬼", "張", "角", "氐", "心", "斗", "虚"];
  starts.forEach((s, i) => assert.equal(shukuyo.SHUKU[shukuyo.shukuIndex(i + 1, 1)], s));
  assert.equal(shukuyo.SHUKU[shukuyo.shukuIndex(8, 15)], "婁");
  assert.equal(shukuyo.SHUKU[shukuyo.shukuIndex(9, 13)], "婁");
});

test("本命宿：觜宿の有名人として紹介されている人の生年月日", () => {
  const people = [[1994, 7, 5], [1983, 8, 30], [1973, 4, 6], [1982, 11, 2], [1982, 12, 26], [1949, 9, 14], [1982, 10, 5], [1940, 9, 20], [1995, 3, 6], [1992, 8, 20], [1992, 6, 27], [1968, 4, 1]];
  for (const [y, m, d] of people) assert.equal(shukuyo.calculateShukuyo({ year: y, month: m, day: d }).honmei.name, "觜宿", `${y}-${m}-${d}`);
});

test("三九の秘法：関係と距離、お互いの対応", () => {
  // 昴宿から：畢＝近距離の栄、女＝中距離の栄、軫＝遠距離の栄、胃＝近距離の親、張＝中距離の親、箕＝遠距離の親
  const S = shukuyo.SHUKU;
  const r = (a, b) => shukuyo.relation(S.indexOf(a), S.indexOf(b));
  assert.deepEqual([r("昴", "畢").type, r("昴", "畢").distance], ["栄", "近"]);
  assert.deepEqual([r("昴", "女").type, r("昴", "女").distance], ["栄", "中"]);
  assert.deepEqual([r("昴", "軫").type, r("昴", "軫").distance], ["栄", "遠"]);
  assert.deepEqual([r("昴", "胃").type, r("昴", "胃").distance], ["親", "近"]);
  assert.deepEqual([r("昴", "張").type, r("昴", "張").distance], ["親", "中"]);
  assert.deepEqual([r("昴", "箕").type, r("昴", "箕").distance], ["親", "遠"]);
  const opposite = { "命": "命", "業": "胎", "胎": "業", "栄": "親", "親": "栄", "友": "衰", "衰": "友", "安": "壊", "壊": "安", "危": "成", "成": "危" };
  for (let a = 0; a < 27; a++) for (let b = 0; b < 27; b++) {
    const x = shukuyo.relation(a, b), y = shukuyo.relation(b, a);
    assert.equal(y.type, opposite[x.type]);
    assert.equal(y.distance, x.distance);
  }
  // 1つの宿から見て：命1・業1・胎1、ほかは各3つ
  const counts = {};
  shukuyo.calculateShukuyo({ year: 1990, month: 1, day: 1 }).relations.forEach((x) => { counts[x.type] = (counts[x.type] || 0) + 1; });
  assert.deepEqual(counts, { "命": 1, "栄": 3, "衰": 3, "安": 3, "危": 3, "成": 3, "壊": 3, "友": 3, "親": 3, "業": 1, "胎": 1 });
});

test("鑑定文：27宿・相性・日運", () => {
  for (const s of shukuyo.SHUKU) assert.ok(text.SHUKU[s + "宿"] && text.SHUKU[s + "宿"].body.length > 60, s);
  for (const t of ["命", "業", "胎", ...shukuyo.RELATIONS]) assert.ok(text.DAY[t], t);
  const v = text.buildShukuyoView(shukuyo.calculateShukuyo({ year: 1990, month: 1, day: 1 }), { year: 2026, month: 10, day: 10 });
  assert.equal(v.honmei.name, "奎宿");
  assert.equal(v.lunarLabel, "旧暦 1989年12月5日");
  assert.equal(v.groups.length, 6);
  assert.equal(v.today.lunarLabel, "旧暦 2026年8月30日");
  assert.ok(v.today.text);
});

test("六曜：2026年10月がベストカレンダーの表と一致", () => {
  const expected = "仏滅 大安 赤口 先勝 友引 先負 仏滅 大安 赤口 先勝 先負 仏滅 大安 赤口 先勝 友引 先負 仏滅 大安 赤口 先勝 友引 先負 仏滅 大安 赤口 先勝 友引 先負 仏滅 大安".split(" ");
  expected.forEach((r, i) => assert.equal(kyureki.fromGregorian(2026, 10, i + 1).rokuyo, r, `10/${i + 1}`));
});
