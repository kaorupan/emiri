"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const ssm = require("../assets/js/engines/shichusuimei.js");
const text = require("../assets/js/content/shichusuimei-text.js");
const fixture = require("./fixtures/shichusuimei-lunar.json");

test("命式：lunar-javascript（独立した実装）と一致する", () => {
  assert.ok(fixture.cases.length >= 100);
  for (const c of fixture.cases) {
    const r = ssm.calculateShichusuimei(c.birth);
    const label = JSON.stringify(c.birth);
    assert.deepEqual(r.pillars.map((p) => p.name), c.pillars, label + " 四柱");
    assert.deepEqual([r.byKey.year, r.byKey.month, r.byKey.hour].map((p) => p.stemTsuhen.name), c.stemTsuhen, label + " 天干の通変星");
    assert.deepEqual(r.pillars.map((p) => p.branchTsuhen.name), c.branchTsuhen, label + " 蔵干の通変星");
    assert.deepEqual(r.pillars.map((p) => p.juniun.name), c.juniun, label + " 十二運");
    assert.equal(r.kuubou.name, c.kuubou + "天中殺", label + " 天中殺");
  }
});

test("よく知られた日付の干支", () => {
  assert.equal(ssm.pillarName(ssm.dayIndex(2000, 1, 1)), "戊午");
  assert.equal(ssm.pillarName(ssm.dayIndex(1990, 1, 1)), "丙寅");
  const r = ssm.calculateShichusuimei({ year: 1990, month: 1, day: 1 });
  assert.deepEqual(r.pillars.map((p) => p.name), ["己巳", "丙子", "丙寅"]);
  assert.equal(r.hasTime, false);
  assert.equal(r.dayMaster.name, "丙");
  assert.equal(r.chushin.name, "正官");
});

test("立春の時刻で年柱・月柱が切り替わる（2024年2月4日 17:27ごろ）", () => {
  const before = ssm.calculateShichusuimei({ year: 2024, month: 2, day: 4, time: "17:20" });
  const after = ssm.calculateShichusuimei({ year: 2024, month: 2, day: 4, time: "17:35" });
  assert.deepEqual(before.pillars.slice(0, 2).map((p) => p.name), ["癸卯", "乙丑"]);
  assert.deepEqual(after.pillars.slice(0, 2).map((p) => p.name), ["甲辰", "丙寅"]);
  const dateOnly = ssm.calculateShichusuimei({ year: 2024, month: 2, day: 4 });
  assert.deepEqual(dateOnly.pillars.slice(0, 2).map((p) => p.name), ["甲辰", "丙寅"]);
  assert.ok(dateOnly.alternative);
  assert.equal(dateOnly.alternative.year.name, "癸卯");
  assert.equal(dateOnly.alternative.month.name, "乙丑");
});

test("時柱：23時台は日柱そのまま、時干は翌日の日干から（夜の子の刻）", () => {
  const late = ssm.calculateShichusuimei({ year: 2023, month: 12, day: 31, time: "23:30" });
  const next = ssm.calculateShichusuimei({ year: 2024, month: 1, day: 1, time: "0:30" });
  assert.equal(late.byKey.day.name, ssm.pillarName(ssm.dayIndex(2023, 12, 31)));
  assert.equal(late.byKey.hour.name, next.byKey.hour.name);
  assert.equal(late.byKey.hour.branch.name, "子");
});

test("五虎遁・五鼠遁・十二運・通変星の基本表", () => {
  // 甲年の寅月は丙寅、乙年は戊寅
  assert.equal(ssm.pillarName(ssm.monthIndexOf(0, 0)), "丙寅");
  assert.equal(ssm.pillarName(ssm.monthIndexOf(1, 0)), "戊寅");
  // 甲日の子の刻は甲子、乙日は丙子
  assert.equal(ssm.pillarName(ssm.hourIndexOf(0, 0)), "甲子");
  assert.equal(ssm.pillarName(ssm.hourIndexOf(1, 0)), "丙子");
  // 甲の長生は亥、乙の長生は午
  assert.equal(ssm.JUNIUN[ssm.juniunIndex(0, 11)], "長生");
  assert.equal(ssm.JUNIUN[ssm.juniunIndex(1, 6)], "長生");
  assert.equal(ssm.JUNIUN[ssm.juniunIndex(0, 2)], "建禄");
  // 甲から見て：甲＝比肩、乙＝劫財、丙＝食神、己＝正財、庚＝偏官、癸＝印綬
  assert.equal(ssm.TSUHEN[ssm.tsuhenIndex(0, 0)], "比肩");
  assert.equal(ssm.TSUHEN[ssm.tsuhenIndex(0, 1)], "劫財");
  assert.equal(ssm.TSUHEN[ssm.tsuhenIndex(0, 2)], "食神");
  assert.equal(ssm.TSUHEN[ssm.tsuhenIndex(0, 5)], "正財");
  assert.equal(ssm.TSUHEN[ssm.tsuhenIndex(0, 6)], "偏官");
  assert.equal(ssm.TSUHEN[ssm.tsuhenIndex(0, 9)], "印綬");
});

test("五行のバランスは柱の数×2", () => {
  const a = ssm.calculateShichusuimei({ year: 1985, month: 7, day: 20 });
  const b = ssm.calculateShichusuimei({ year: 1985, month: 7, day: 20, time: "8:15" });
  assert.equal(a.elements.reduce((s, e) => s + e.count, 0), 6);
  assert.equal(b.elements.reduce((s, e) => s + e.count, 0), 8);
});

test("年運：立春で区切った年から3年分", () => {
  const r = ssm.calculateShichusuimei({ year: 1990, month: 1, day: 1 });
  const list = ssm.yearFortunes(r, { year: 2026, month: 10, day: 10 }, 3);
  assert.deepEqual(list.map((f) => f.name), ["丙午", "丁未", "戊申"]);
  assert.deepEqual(list.map((f) => f.tsuhen.name), ["比肩", "劫財", "食神"]);
  const jan = ssm.yearFortunes(r, { year: 2026, month: 1, day: 10 }, 1);
  assert.equal(jan[0].name, "乙巳");
});

test("鑑定文：すべての日干・通変星・十二運・五行に文章がある", () => {
  for (const s of ssm.STEMS) assert.ok(text.DAY_MASTER[s] && text.DAY_MASTER[s].body.length > 40, s);
  for (const t of ssm.TSUHEN) assert.ok(text.TSUHEN[t] && text.TSUHEN[t].body.length > 40, t);
  for (const j of ssm.JUNIUN) assert.ok(text.JUNIUN[j] && text.JUNIUN[j].length > 20, j);
  for (const e of ssm.ELEMENTS) assert.ok(text.ELEMENT[e] && text.ELEMENT[e].many && text.ELEMENT[e].none, e);
  for (const t of ssm.TSUHEN) assert.ok(text.YEAR_TSUHEN[t], t);
  for (const k of Object.keys(text.KUUBOU)) assert.ok(text.KUUBOU[k].length > 20, k);
  assert.equal(Object.keys(text.KUUBOU).length, 6);
});

test("鑑定文の組み立て", () => {
  const r = ssm.calculateShichusuimei({ year: 1990, month: 1, day: 1, time: "6:30" });
  const v = text.buildShichusuimeiView(r, { year: 2026, month: 10, day: 10 });
  assert.equal(v.dayMaster.name, "丙");
  assert.equal(v.chushin.name, "正官");
  assert.equal(v.years.length, 3);
  assert.ok(v.elements.summary.length > 10);
  assert.ok(v.kuubou.body.length > 20);
  assert.equal(v.table.length, 4);
});
