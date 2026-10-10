"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const shibi = require("../assets/js/engines/shibi.js");
const text = require("../assets/js/content/shibi-text.js");
const fixture = require("./fixtures/shibi-iztro.json");

function chartFromYin(r) {
  return r.palaces.slice(2).concat(r.palaces.slice(0, 2)).map((p) => p.name + ":" + p.stem + p.branch + ":" + p.major.map((s) => s.name + (s.sika || "")).join("/") + ":" + p.minor.map((s) => s.name + (s.sika || "")).sort().join("/")).join(" ");
}

test("命盤：iztro（独立した実装）と一致する", () => {
  assert.ok(fixture.cases.length >= 100);
  for (const c of fixture.cases) {
    const r = shibi.calculateShibi(c.birth);
    assert.equal(r.kyoku.name, c.kyoku, JSON.stringify(c.birth));
    assert.equal(r.mei.stem + r.mei.branch, c.mei, JSON.stringify(c.birth));
    assert.equal(chartFromYin(r), c.chart, JSON.stringify(c.birth));
  }
});

test("1990年1月1日 6:30：命宮 甲戌（太陽）、身宮 辰、火六局、紫微は丑", () => {
  const r = shibi.calculateShibi({ year: 1990, month: 1, day: 1, time: "6:30" });
  assert.equal(r.mei.stem + r.mei.branch, "甲戌");
  assert.deepEqual(r.mei.major.map((s) => s.name), ["太陽"]);
  assert.equal(r.shin.branch, "辰");
  assert.equal(r.kyoku.name, "火六局");
  assert.equal(r.starPositions["紫微"], 1);
  assert.equal(r.year.name, "己巳");
  assert.deepEqual(r.sika.map((s) => s.star), ["武曲", "貪狼", "天梁", "文曲"]);
});

test("紫微星の位置：水二局の1日は丑、木三局の1日は辰", () => {
  assert.equal(shibi.shibiPosition(2, 1), 1);
  assert.equal(shibi.shibiPosition(3, 1), 4);
  assert.equal(shibi.shibiPosition(6, 1), 9);
});

test("時刻は必須、23時台は翌日の子の刻", () => {
  assert.throws(() => shibi.calculateShibi({ year: 1990, month: 1, day: 1 }));
  const late = shibi.calculateShibi({ year: 1990, month: 1, day: 1, time: "23:30" });
  const next = shibi.calculateShibi({ year: 1990, month: 1, day: 2, time: "0:30" });
  assert.equal(late.mei.branch, next.mei.branch);
  assert.equal(late.hour.name, "子の刻");
});

test("鑑定文：14主星すべて、表示用データと相性", () => {
  for (const s of shibi.MAJOR) for (const f of ["mei", "love", "money", "work"]) assert.ok(text.STAR[s][f], s + f);
  for (let i = 0; i < 100; i++) {
    const r = shibi.calculateShibi({ year: 1940 + i % 70, month: 1 + i % 12, day: 1 + (i * 3) % 28, time: (i % 24) + ":10" });
    const v = text.buildShibiView(r);
    assert.equal(v.grid.length, 12);
    assert.ok(v.mei.texts.length >= 1, "命宮の星（空宮は対宮）");
    assert.ok(!/undefined/.test(JSON.stringify(v)));
    const c = text.buildShibiCompatibilityView(shibi.calculateShibiCompatibility(r, { year: 1985, month: 7, day: 7, time: "12:00" }));
    assert.ok(c.kyoku.text);
    assert.ok(!/undefined/.test(JSON.stringify(c)));
  }
});
