"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const maya = require("../assets/js/engines/maya.js");
const text = require("../assets/js/content/maya-text.js");
const ref = require("./fixtures/maya-reference.json");

test("KIN：公開されている早見表・年別一覧と一致する", () => {
  for (const [y, m, d, kin] of ref.dates) assert.equal(maya.kinOfDate(y, m, d), kin, `${y}-${m}-${d}`);
});

test("紋章・ウェイブスペル・銀河の音・黒KIN", () => {
  for (const c of ref.kins) {
    const i = maya.kinInfo(c.kin);
    assert.equal(i.seal.name, c.seal, "KIN" + c.kin);
    assert.equal(i.wavespell.name, c.wavespell, "KIN" + c.kin);
    assert.equal(i.tone.number, c.tone, "KIN" + c.kin);
    assert.equal(i.black, c.black, "KIN" + c.kin);
  }
});

test("1日進むとKINが1進み、260日で一巡する（2月29日は数えない）", () => {
  assert.equal(maya.kinOfDate(2024, 2, 29), maya.kinOfDate(2024, 2, 28));
  assert.equal(maya.kinOfDate(2024, 3, 1), maya.kinOfDate(2024, 2, 28) + 1);
  assert.equal(maya.kinOfDate(2023, 12, 31) % 260 + 1, maya.kinOfDate(2024, 1, 1));
  // 365日後は105進む
  assert.equal((maya.kinOfDate(1990, 1, 1) + 105 - 1) % 260 + 1, maya.kinOfDate(1991, 1, 1));
});

test("2月29日生まれは2月28日のKINで、3月1日側も返す", () => {
  const r = maya.calculateMaya({ year: 2024, month: 2, day: 29 });
  assert.equal(r.kin, 131);
  assert.equal(r.leapDay.alternative.kin, 132);
  assert.equal(maya.calculateMaya({ year: 2024, month: 3, day: 1 }).leapDay, null);
});

test("ガイド・類似・反対・神秘KIN", () => {
  // 1990年1月1日 KIN143 青い夜・音13
  const r = maya.relations(143);
  assert.deepEqual([r.guide.kin, r.guide.seal.name, r.guide.tone.number], [247, "青い手", 13]);
  assert.equal(r.analog.seal.name, "黄色い戦士");
  assert.equal(r.antipode.seal.name, "赤い空歩く人");
  assert.equal(r.antipode.kin, 13);
  assert.equal(r.occult.kin, 118);
  // KIN109 赤い月・音5 → ガイドは赤い地球、類似は白い犬
  const q = maya.relations(109);
  assert.equal(q.guide.seal.name, "赤い地球");
  assert.equal(q.analog.seal.name, "白い犬");
  // 音ごとのガイドの紋章（赤い龍・黄色い太陽で確認）
  const g = (seal, tone) => maya.relations(maya.kinFrom(seal, tone)).guide.seal.name;
  assert.equal(g(0, 1), "赤い龍");
  assert.equal(g(0, 2), "赤い空歩く人");
  assert.equal(g(0, 3), "赤い蛇");
  assert.equal(g(19, 8), "黄色い種");
  assert.equal(g(0, 4), "赤い地球");
  assert.equal(g(18, 9), "青い鷲");
  assert.equal(g(0, 5), "赤い月");
  assert.equal(g(19, 10), "黄色い星");
  // すべてのKINで：関係KINは同じ音（神秘は14−音）、ガイドは同じ色
  for (let k = 1; k <= 260; k++) {
    const x = maya.relations(k), me = maya.kinInfo(k);
    assert.equal(x.guide.tone.number, me.tone.number);
    assert.equal(x.analog.tone.number, me.tone.number);
    assert.equal(x.antipode.tone.number, me.tone.number);
    assert.equal(x.occult.tone.number, 14 - me.tone.number);
    assert.equal(x.guide.seal.color, me.seal.color);
    assert.equal((x.analog.seal.number + me.seal.number) % 20, 19);
  }
});

test("黒KINは52個で、表の上下左右に対称", () => {
  assert.equal(maya.BLACK_KIN.length, 52);
  for (const k of maya.BLACK_KIN) assert.ok(maya.BLACK_KIN.includes(261 - k));
});

test("年回り：誕生日で切り替わり、音が1つずつ進む", () => {
  const r = maya.calculateMaya({ year: 1990, month: 1, day: 1 });
  const list = maya.yearCycles(r, { year: 2026, month: 10, day: 10 }, 3);
  assert.deepEqual(list.map((y) => y.year), [2026, 2027, 2028]);
  assert.equal(list[0].kin, maya.kinOfDate(2026, 1, 1));
  assert.equal(list[1].tone.number, list[0].tone.number % 13 + 1);
  const before = maya.yearCycles(maya.calculateMaya({ year: 1990, month: 12, day: 24 }), { year: 2026, month: 10, day: 10 }, 1);
  assert.equal(before[0].year, 2025);
});

test("鑑定文：20の紋章・13の音・年回りに文章がある", () => {
  for (const s of maya.SEALS) assert.ok(text.SEAL[s.name] && text.SEAL[s.name].body.length > 40, s.name);
  for (let t = 1; t <= 13; t++) { assert.ok(text.TONE[t].body.length > 20); assert.ok(text.YEAR_TONE[t].length > 20); }
  const v = text.buildMayaView(maya.calculateMaya({ year: 1990, month: 1, day: 1 }), { year: 2026, month: 10, day: 10 });
  assert.equal(v.kin, 143);
  assert.equal(v.relations.length, 4);
  assert.equal(v.years.length, 3);
  assert.equal(v.black, null);
  assert.equal(v.leapDay, null);
  const b = text.buildMayaView(maya.calculateMaya({ year: 1951, month: 8, day: 17 }), { year: 2026, month: 10, day: 10 });
  assert.ok(b.black);
});
