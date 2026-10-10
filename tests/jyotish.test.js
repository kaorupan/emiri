"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const J = require("../assets/js/engines/jyotish.js");
const text = require("../assets/js/content/jyotish-text.js");
const fx = require("./fixtures/jyotish-swisseph.json");

const diff = (a, b) => Math.abs(((a - b) % 360 + 540) % 360 - 180);

test("サイデリアル黄経：スイス・エフェメリス（ラヒリ）と一致（月0.03°・太陽0.01°・ラーフ0.001°以内）", () => {
  assert.ok(fx.cases.length >= 150);
  for (const c of fx.cases) {
    const r = J.calculateJyotish(c.birth);
    const label = JSON.stringify(c.birth);
    assert.ok(diff(r.byKey.moon.longitude, c.moon) < 0.03, "moon " + label);
    assert.ok(diff(r.byKey.sun.longitude, c.sun) < 0.01, "sun " + label);
    assert.ok(diff(r.byKey.rahu.longitude, c.rahu) < 0.001, "rahu " + label);
    assert.equal(r.nakshatra.index, Math.floor(c.moon / (360 / 27)), "nakshatra " + label);
  }
});

test("アヤナムシャ（ラヒリ）：2000年1月1日正午（世界時）で約23.857°", () => {
  const a = J.ayanamsaAt(2000, 1, 1, 21, 0);
  assert.ok(Math.abs(a - 23.857) < 0.01, a);
});

test("ヴィムショッタリ・ダシャー：120年で9つの星が一巡し、順番どおり", () => {
  const r = J.calculateJyotish({ year: 1990, month: 1, day: 1, time: "6:30" });
  const first = r.dashas[0];
  assert.equal(first.lord, r.nakshatra.lord);
  const nine = r.dashas.slice(0, 9).reduce((s, d) => s + d.years, 0);
  assert.equal(nine, 120);
  for (let i = 1; i < 9; i++) {
    assert.equal(r.dashas[i].lord, J.DASHA_ORDER[(J.DASHA_ORDER.indexOf(first.lord) + i) % 9]);
    assert.equal(r.dashas[i].start, r.dashas[i - 1].end);
  }
  // 生まれたときは最初のダシャーの途中
  assert.ok(first.start <= r.birthMs && r.birthMs < first.end);
  const cur = J.currentDasha(r, Date.UTC(2026, 9, 10));
  assert.ok(cur && cur.maha && cur.antar);
});

test("アシュタクータ：各項目の範囲と36点満点、表の対称性", () => {
  const fake = (lon) => ({ moonRashi: { index: Math.floor(lon / 30) }, nakshatra: { index: Math.floor(lon / (360 / 27)) }, moonDegree: lon % 30 });
  for (let i = 0; i < 108; i += 5) for (let j = 0; j < 108; j += 7) {
    const k = J.ashtakoota(fake((i + 0.5) * 360 / 108), fake((j + 0.5) * 360 / 108));
    assert.equal(k.items.length, 8);
    assert.equal(k.items.reduce((s, x) => s + x.max, 0), 36);
    k.items.forEach((x) => assert.ok(x.score >= 0 && x.score <= x.max, x.key));
  }
  // 同じナクシャトラ・同じ星座：ナーディは同じなので0点、ヨーニ・ガナ・マイトリ・バクートは満点
  const same = J.ashtakoota(fake(10), fake(10));
  const by = Object.fromEntries(same.items.map((x) => [x.key, x.score]));
  assert.equal(by.nadi, 0);
  assert.equal(by.yoni, 4);
  assert.equal(by.gana, 6);
  assert.equal(by.maitri, 5);
  assert.equal(by.bhakoot, 7);
  // 天敵どうし（馬と水牛）：ヨーニ0点
  assert.equal(J.ashtakoota(fake(5), fake(12 * 360 / 27 + 5)).items.find((x) => x.key === "yoni").score, 0);
});

test("鑑定文と表示用データ", () => {
  for (const r of J.RASHI) assert.ok(text.RASHI[r.name], r.name);
  for (const n of J.NAKSHATRA) assert.ok(text.NAKSHATRA[n], n);
  for (const l of J.DASHA_ORDER) assert.ok(text.DASHA[l], l);
  for (let i = 0; i < 60; i++) {
    const r = J.calculateJyotish({ year: 1940 + i, month: 1 + i % 12, day: 1 + (i * 7) % 28 });
    const v = text.buildJyotishView(r, J.currentDasha(r, Date.UTC(2026, 9, 10)));
    assert.ok(!/undefined/.test(JSON.stringify(v)));
    const c = text.buildJyotishCompatibilityView(J.calculateJyotishCompatibility(r, { year: 1985, month: 7, day: 7 }));
    assert.ok(!/undefined/.test(JSON.stringify(c)));
    assert.ok(c.youAsGroom.total >= 0 && c.youAsGroom.total <= 36);
  }
});
