"use strict";
// 吉方位（年盤）と干支
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const ROOT = path.join(__dirname, "..");
const H = require("../assets/js/engines/houi.js");
const E = require("../assets/js/engines/eto.js");

const label = (p) => Object.fromEntries(p.dirs.map((d) => [d.name, d.best ? "最大吉方" : d.good ? "吉方" : d.bad.length ? d.bad.slice().sort().join("、") : "吉凶なし"]));
const norm = (o) => Object.fromEntries(Object.entries(o).map(([k, v]) => [k, v.split("、").sort().join("、")]));

test("年盤：2026年（一白中宮）の配置と共通の凶方位", () => {
  const c = H.yearChart(2026);
  assert.equal(c.center, 1);
  assert.deepEqual(c.stars, { n: 6, ne: 4, e: 8, se: 9, s: 5, sw: 7, w: 3, nw: 2 });
  assert.equal(c.gooh, "s"); assert.equal(c.anken, "n"); assert.equal(c.saiha, "n");
  assert.deepEqual(c.teii, ["w"]);
  assert.equal(c.eto.stem + c.eto.branch, "丙午");
  const c27 = H.yearChart(2027);
  assert.equal(c27.center, 9); assert.equal(c27.gooh, "n"); assert.equal(c27.anken, "s"); assert.equal(c27.saiha, "ne");
  const c25 = H.yearChart(2025);  // 二黒中宮・巳年
  assert.equal(c25.center, 2); assert.equal(c25.saiha, "nw");
  const c23 = H.yearChart(2023);  // 四緑中宮：五黄は北西
  assert.equal(c23.gooh, "nw"); assert.equal(c23.anken, "se");
});

test("本命星・月命星別：公開されている2026年の年盤表示と一致", () => {
  // 出典：八雲院「2026年の年盤」本命星×月命星のページ（方位ごとの表示）
  const cases = [
    [9, 1, { 北: "暗剣殺、歳破", 北東: "最大吉方", 東: "吉方", 南東: "本命殺", 南: "五黄殺", 南西: "吉凶なし", 西: "定位対冲", 北西: "本命的殺" }],
    [1, 1, { 北: "暗剣殺、歳破", 北東: "最大吉方", 東: "吉凶なし", 南東: "吉凶なし", 南: "五黄殺", 南西: "最大吉方", 西: "定位対冲", 北西: "吉凶なし" }],
    [1, 5, { 北: "暗剣殺、歳破、月命的殺", 北東: "吉方", 東: "吉凶なし", 南東: "吉凶なし", 南: "五黄殺、月命殺", 南西: "最大吉方", 西: "定位対冲", 北西: "吉凶なし" }],
    [1, 8, { 北: "暗剣殺、歳破", 北東: "吉方", 東: "月命殺", 南東: "吉凶なし", 南: "五黄殺", 南西: "最大吉方", 西: "定位対冲、月命的殺", 北西: "吉凶なし" }]
  ];
  for (const [h, g, want] of cases) assert.deepEqual(label(H.forPerson(2026, h, g)), norm(want), `${h}/${g}`);
});

test("吉方位：五黄のいる方位・凶方位は吉にならない／本命星が中宮なら本命殺なし", () => {
  for (let y = 2000; y <= 2040; y++) for (let h = 1; h <= 9; h++) {
    const p = H.forPerson(y, h);
    for (const d of p.dirs) {
      if (d.good) { assert.equal(d.bad.length, 0); assert.notEqual(d.star, 5); }
    }
    if (p.chart.center === h) assert.ok(p.honmeiCenter && !p.dirs.some((d) => d.bad.includes("本命殺")));
  }
});

test("干支：年と十二支の関係", () => {
  assert.equal(E.etoOfYear(2026).name, "丙午");
  assert.equal(E.etoOfYear(1984).name, "甲子");
  assert.equal(E.etoOfYear(2024).name, "甲辰");
  assert.equal(E.etoOfYear(1990).reading, "かのえうま");
  assert.equal(E.relation(0, 0), "same");
  assert.equal(E.relation(0, 6), "chuu");
  assert.equal(E.relation(0, 4), "sangou");
  assert.equal(E.relation(0, 1), "shigou");
  assert.equal(E.relation(0, 7), "gai");
  assert.equal(E.relation(0, 2), "none");
  assert.deepEqual(E.yearsOf(6, 1990, 2030), [1990, 2002, 2014, 2026]);
});

test("ページ：吉方位（年×本命星）と干支（十二支）がそろい、TOPからリンクされている", () => {
  const html = (p) => fs.readFileSync(path.join(ROOT, p), "utf8");
  const idx = html("kippoui/index.html");
  const years = idx.match(/data-years="([\d,]+)"/)[1].split(",").map(Number);
  assert.equal(years.length, 2);
  for (const y of years) {
    assert.ok(idx.includes(`href="${y}/"`));
    const yp = html(`kippoui/${y}/index.html`);
    for (let s = 1; s <= 9; s++) {
      assert.ok(yp.includes(`href="${s}/"`));
      const sp = html(`kippoui/${y}/${s}/index.html`);
      assert.ok(!/undefined|NaN/.test(sp), `${y}/${s}`);
      assert.ok(sp.includes("月命星別の最大吉方"));
      assert.equal((sp.match(/class="kp-cell/g) || []).length, 9);
    }
  }
  for (const slug of ["ne", "ushi", "tora", "u", "tatsu", "mi", "uma", "hitsuji", "saru", "tori", "inu", "i"]) {
    const p = html(`eto/${slug}/index.html`);
    assert.ok(!/undefined|NaN/.test(p), slug);
    assert.ok(p.includes("相性の良い干支"));
  }
  const top = html("index.html");
  assert.ok(top.includes('href="kippoui/"') && top.includes('href="eto/"'));
});
