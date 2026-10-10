"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const horo = require("../assets/js/engines/horoscope.js");
const text = require("../assets/js/content/horoscope-text.js");
const astro = require("../assets/js/core/astro.js");
const ingress = require("./fixtures/horoscope-ingress-2025.json");

function signAt(body, ms) {
  const d = new Date(ms + 9 * 3600e3);
  return Math.floor(horo.longitudeAt(body, d.getUTCFullYear(), d.getUTCMonth() + 1, d.getUTCDate(), d.getUTCHours(), d.getUTCMinutes()) / 30);
}

test("星座入りの時刻：公開されている2025年の星の動きと一致（許容範囲内）", () => {
  for (const c of ingress.cases) {
    const [date, time] = c.jst.split("T");
    const [y, m, d] = date.split("-").map(Number), [hh, mm] = time.split(":").map(Number);
    const t = Date.UTC(y, m - 1, d, hh, mm) - 9 * 3600e3;
    const tol = c.toleranceMin * 60e3;
    assert.notEqual(signAt(c.body, t - tol), c.sign, `${c.body} ${c.jst} の${c.toleranceMin}分前はまだ前の星座`);
    assert.equal(signAt(c.body, t + tol), c.sign, `${c.body} ${c.jst} の${c.toleranceMin}分後は新しい星座`);
  }
});

test("太陽・月：サイトの天文計算（Meeus）と0.02°以内で一致", () => {
  for (let i = 0; i < 60; i++) {
    const y = 1910 + i * 3, m = 1 + (i * 5) % 12, d = 1 + (i * 7) % 28;
    const jd = astro.julianDayJst(y, m, d, 12);
    const sun = horo.longitudeAt("Sun", y, m, d, 12, 0), moon = horo.longitudeAt("Moon", y, m, d, 12, 0);
    const diff = (a, b) => Math.abs(((a - b + 540) % 360) - 180);
    assert.ok(diff(sun, astro.apparentSunLongitudeUt(jd)) < 0.02, `sun ${y}-${m}-${d}`);
    assert.ok(diff(moon, astro.moonLongitude(jd)) < 0.02, `moon ${y}-${m}-${d}`);
  }
});

test("1990年1月1日の天体（正午）", () => {
  const r = horo.calculateHoroscope({ year: 1990, month: 1, day: 1 });
  const s = Object.fromEntries(r.planets.map((p) => [p.key, p.sign]));
  assert.deepEqual(s, { sun: "山羊座", moon: "水瓶座", mercury: "山羊座", venus: "水瓶座", mars: "射手座", jupiter: "蟹座", saturn: "山羊座", uranus: "山羊座", neptune: "山羊座", pluto: "蠍座" });
  assert.equal(r.byKey.venus.retrograde, true); // 1989年12月29日から金星は逆行
  assert.equal(r.byKey.jupiter.retrograde, true);
  assert.equal(r.byKey.sun.retrograde, false);
  assert.equal(Object.values(r.elements).reduce((a, b) => a + b, 0), 9);
});

test("時刻なしで月の星座が変わる日は、変わる可能性を返す。時刻ありなら確定", () => {
  // 1990年1月2日：月が水瓶座から魚座へ移る日を探して確認
  let found = null;
  for (let d = 1; d <= 28 && !found; d++) {
    const r = horo.calculateHoroscope({ year: 1990, month: 2, day: d });
    if (r.byKey.moon.mayChange) found = d;
  }
  assert.ok(found);
  const t = horo.calculateHoroscope({ year: 1990, month: 2, day: found, time: "23:00" });
  assert.equal(t.mayChange.length, 0);
});

test("アスペクトの判定（オーブ）", () => {
  assert.equal(horo.aspectBetween(10, 130).key, "trine");
  assert.equal(horo.aspectBetween(10, 107).key, "square");
  assert.equal(horo.aspectBetween(10, 195).key, "opposition");
  assert.equal(horo.aspectBetween(10, 72).key, "sextile");
  assert.equal(horo.aspectBetween(10, 40), null);
  assert.equal(horo.aspectBetween(355, 3).key, "conjunction");
});

test("鑑定文：12星座ぶんの文章、表示用データ、相性", () => {
  for (const s of horo.SIGNS) {
    for (const t of [text.SUN, text.MOON, text.MERCURY, text.VENUS, text.MARS, text.JUPITER, text.SATURN, text.OUTER_SIGN]) assert.ok(t[s.name], s.name);
  }
  assert.equal(text.JUPITER_HOUSE.length, 12);
  assert.equal(text.SATURN_HOUSE.length, 12);
  const r = horo.calculateHoroscope({ year: 1990, month: 1, day: 1, time: "6:30" });
  const v = text.buildHoroscopeView(r, horo.transits({ year: 2026, month: 10, day: 10 }));
  assert.equal(v.planets.length, 10);
  assert.equal(v.year.length, 2);
  assert.ok(!/undefined/.test(JSON.stringify(v)));
  const c = text.buildHoroscopeCompatibilityView(horo.calculateHoroscopeCompatibility({ year: 1990, month: 1, day: 1 }, { year: 1992, month: 5, day: 15 }));
  assert.ok(c.lead && c.sun.text && c.moon.text);
  assert.ok(!/undefined/.test(JSON.stringify(c)));
  for (let i = 0; i < 80; i++) {
    const x = horo.calculateHoroscopeCompatibility({ year: 1950 + i, month: 1 + i % 12, day: 1 + i % 28 }, { year: 1960 + i % 40, month: 1 + (i * 5) % 12, day: 1 + (i * 3) % 28 });
    assert.ok(!/undefined/.test(JSON.stringify(text.buildHoroscopeCompatibilityView(x))));
  }
});
