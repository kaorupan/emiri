// 宇宙盤（算命学）：assets/js/content/uchuban.js、アティチュードナンバーのページ
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const U = require("../assets/js/content/uchuban.js");
const E = { shichu: require("../assets/js/engines/shichusuimei.js") };

test("盤の向き：甲子が真上、15番目（己卯）が右、30番目（甲午）が真下、時計回り", () => {
  const near = (a, b) => Math.abs(a - b) < 1e-9;
  let p = U.point(0); assert.ok(near(p.x, 0) && near(p.y, -1));
  p = U.point(15); assert.ok(near(p.x, 1) && near(p.y, 0));
  p = U.point(30); assert.ok(near(p.x, 0) && near(p.y, 1));
  assert.equal(U.nameOf(0), "甲子"); assert.equal(U.nameOf(15), "己卯"); assert.equal(U.nameOf(30), "甲午"); assert.equal(U.nameOf(59), "癸亥");
  assert.equal(U.areaOf(U.point(7)), 0); assert.equal(U.areaOf(U.point(22)), 1); assert.equal(U.areaOf(U.point(37)), 2); assert.equal(U.areaOf(U.point(52)), 3);
});

test("干支は四柱推命の命式と同じ（年・月・日）", () => {
  const b = { year: 1980, month: 5, day: 3 };
  const c = U.chart(b, E), sh = E.shichu.calculateShichusuimei(b);
  assert.deepEqual(c.dots.map((d) => d.name), [sh.byKey.year.name, sh.byKey.month.name, sh.byKey.day.name]);
});

test("形：三角形の大きさで広い・ふつう・せまい、同じ干支があれば線か点", () => {
  const seen = new Set();
  for (let y = 1950; y <= 2005; y++) for (const md of [[1, 3], [4, 17], [7, 28], [10, 9]]) {
    const c = U.chart({ year: y, month: md[0], day: md[1] }, E);
    seen.add(c.shape);
    assert.ok(U.SIZE[c.shape]);
    const distinct = new Set(c.dots.map((d) => d.index)).size;
    assert.equal(c.shape === "line", distinct === 2);
    if (distinct === 3) assert.ok(c.ratio > 0 && c.ratio <= 1.0001);
    assert.ok(c.areas.length >= 1 && c.areas.length <= 4);
    if (c.center) assert.equal(c.areas.length, 4, "中心をふくむ形は4つの世界すべてを通る");
  }
  for (const k of ["wide", "middle", "narrow", "line"]) assert.ok(seen.has(k), k);
});

test("相性：共通の世界の数でタイプが決まり、重なりは0〜100%", () => {
  const a = U.chart({ year: 1980, month: 5, day: 3 }, E), b = U.chart({ year: 1983, month: 9, day: 6 }, E);
  const m = U.compat(a, b);
  assert.equal(m.typeKey, Math.min(3, m.shared.length));
  assert.ok(m.overlapPercent >= 0 && m.overlapPercent <= 100);
  const same = U.compat(a, a);
  assert.equal(same.overlapPercent, 100, "同じ形どうしは全部重なる");
  assert.equal(same.typeKey, Math.min(3, a.areas.length));
});

test("ページ：宇宙盤とアティチュードナンバーのページがあり、入口からリンクしている", () => {
  const ub = fs.readFileSync(path.join(__dirname, "../uchuban/index.html"), "utf8");
  assert.match(ub, /id="uchuban-form"/); assert.match(ub, /data-birthdate="partner"/);
  assert.ok(fs.readFileSync(path.join(__dirname, "../aisho/index.html"), "utf8").includes('href="../uchuban/"'));
  const at = fs.readFileSync(path.join(__dirname, "../suhijutsu/attitude/index.html"), "utf8");
  for (const n of [1, 2, 3, 4, 5, 6, 7, 8, 9, 11]) assert.match(at, new RegExp(`id="at-${n}"`));
  assert.ok(fs.readFileSync(path.join(__dirname, "../suhijutsu/index.html"), "utf8").includes('href="attitude/"'));
});
