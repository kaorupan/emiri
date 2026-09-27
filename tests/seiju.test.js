// 星獣カルテ・天文計算の自動テスト：node --test tests/
const test = require("node:test");
const assert = require("node:assert/strict");
const astro = require("../assets/js/core/astro.js");
const s = require("../assets/js/engines/seiju.js");
const data = require("../assets/js/content/seiju-data.js");
const text = require("../assets/js/content/seiju-text.js");

const ut = (y, m, d, h, mi) => astro.julianDay(y, m, d + (h + mi / 60) / 24);
function nearest(fn, jd) {
  const k = Math.round((jd - 2451550.09766) / 29.530588861);
  return [-1, 0, 1].map((x) => fn(k + x)).sort((a, b) => Math.abs(a - jd) - Math.abs(b - jd))[0];
}

// ---------- 天文計算 ----------

test("Meeus 例題 49.a：1977年2月の新月（JDE 2443192.65118）と2分以内", () => {
  assert.ok(Math.abs(astro.newMoonJd(-283) - 2443192.65118) < 2 / 1440);
});

test("新月：日食の日時と15分以内（1919〜2024年）", () => {
  const eclipses = [
    [1919, 5, 29, 13, 8], [1999, 8, 11, 11, 8], [2009, 7, 22, 2, 35], [2012, 5, 20, 23, 47],
    [2017, 8, 21, 18, 30], [2024, 4, 8, 18, 21]
  ];
  for (const e of eclipses) {
    const jd = ut(...e);
    assert.ok(Math.abs(nearest(astro.newMoonJd, jd) - jd) * 1440 < 15, e.join("-"));
  }
});

test("満月：月食の日時と15分以内（2000〜2025年）", () => {
  const eclipses = [[2000, 1, 21, 4, 40], [2015, 9, 28, 2, 50], [2018, 1, 31, 13, 27], [2022, 11, 8, 11, 2], [2025, 3, 14, 6, 55]];
  for (const e of eclipses) {
    const jd = ut(...e);
    assert.ok(Math.abs(nearest(astro.fullMoonJd, jd) - jd) * 1440 < 15, e.join("-"));
  }
});

test("太陽黄経：2024年の春分・夏至・秋分・冬至・立春で 0.01°以内", () => {
  const cases = [[[2024, 3, 20, 3, 6], 0], [[2024, 6, 20, 20, 51], 90], [[2024, 9, 22, 12, 44], 180], [[2024, 12, 21, 9, 21], 270], [[2024, 2, 4, 8, 27], 315], [[2021, 2, 3, 14, 59], 315]];
  for (const [t, lon] of cases) {
    let d = astro.sunLongitude(ut(...t)) - lon;
    if (d > 180) d -= 360; if (d < -180) d += 360;
    assert.ok(Math.abs(d) < 0.01, `${t.join("-")} ${d}`);
  }
});

test("朔望月：どの時刻も直前の新月と次の新月のあいだに入る", () => {
  for (let y = 1800; y <= 2100; y += 7) {
    for (const m of [1, 4, 7, 10]) {
      const jd = astro.julianDayJst(y, m, 15, 12);
      const l = astro.lunation(jd);
      assert.ok(l.previousNewMoon <= jd && jd < l.nextNewMoon);
      assert.ok(l.length > 29.2 && l.length < 29.9, String(l.length));
      assert.ok(l.fraction >= 0 && l.fraction < 1);
    }
  }
});

test("ユリウス日と日本時間の日付の往復（0001〜9999年）", () => {
  for (const [y, m, d] of [[1, 1, 1], [1582, 10, 4], [1582, 10, 15], [1900, 2, 28], [2000, 2, 29], [2024, 12, 31], [9999, 12, 31]]) {
    assert.deepEqual(astro.jstDateFromJulianDay(astro.julianDayJst(y, m, d, 12)), { year: y, month: m, day: d });
  }
});

// ---------- 季節・月のリズム ----------

test("季節は立春の日から春（2021年は2月3日が立春）", () => {
  assert.equal(s.calculateSeiju({ year: 2021, month: 2, day: 2 }).season, "winter");
  const r = s.calculateSeiju({ year: 2021, month: 2, day: 3 });
  assert.equal(r.season, "spring");
  assert.equal(r.seasonDetail.isStartDay, true);
  assert.equal(s.calculateSeiju({ year: 2024, month: 2, day: 3 }).season, "winter");
  assert.equal(s.calculateSeiju({ year: 2024, month: 2, day: 4 }).season, "spring");
});

test("季節：立夏・立秋・立冬の日（2024年 5/5・8/7・11/7）で切り替わる", () => {
  const seq = [[5, 4, "spring"], [5, 5, "summer"], [8, 6, "summer"], [8, 7, "autumn"], [11, 6, "autumn"], [11, 7, "winter"]];
  for (const [m, d, want] of seq) assert.equal(s.calculateSeiju({ year: 2024, month: m, day: d }).season, want, `${m}/${d}`);
});

test("月のリズム：新月・満月付近の既知の日付で正しいグループになる", () => {
  // 2024-04-08 18:21 UT 新月 → 4/8 正午（日本時間）は新月の直前（欠けゆく月）、4/10 は満ちゆく月
  assert.equal(s.calculateSeiju({ year: 2024, month: 4, day: 8 }).moonPhase, "waning");
  assert.equal(s.calculateSeiju({ year: 2024, month: 4, day: 10 }).moonPhase, "waxing");
  // 満月（月食）の日は満ちた月
  for (const [y, m, d] of [[2000, 1, 21], [2015, 9, 28], [2018, 1, 31], [2022, 11, 8], [2025, 3, 14]]) {
    const r = s.calculateSeiju({ year: y, month: m, day: d });
    assert.equal(r.moonPhase, "full", `${y}-${m}-${d}`);
    assert.ok(Math.abs(r.moonDetail.fraction - 0.5) < 0.06);
  }
  // 日食（新月）の日は、正午が新月の前なら欠けゆく月、後なら満ちゆく月のどちらか
  for (const [y, m, d] of [[1999, 8, 11], [2009, 7, 22], [2017, 8, 21], [2012, 5, 20]]) {
    const r = s.calculateSeiju({ year: y, month: m, day: d });
    assert.ok(r.moonPhase === "waxing" || r.moonPhase === "waning");
    assert.ok(r.moonDetail.age < 1.1 || r.moonDetail.age > 28.4, `${y}-${m}-${d} age ${r.moonDetail.age}`);
    assert.equal(r.moonDetail.nearBoundary, r.moonDetail.hoursToBoundary < 12);
  }
});

test("月のリズムの境目は 1/3・2/3（満月はほぼ中央）", () => {
  assert.equal(s.moonPhaseFromFraction(0), "waxing");
  assert.equal(s.moonPhaseFromFraction(0.3333), "waxing");
  assert.equal(s.moonPhaseFromFraction(1 / 3), "full");
  assert.equal(s.moonPhaseFromFraction(0.5), "full");
  assert.equal(s.moonPhaseFromFraction(2 / 3), "waning");
  assert.equal(s.moonPhaseFromFraction(0.999), "waning");
  assert.equal(s.seasonFromLongitude(315), "spring");
  assert.equal(s.seasonFromLongitude(44.99), "spring");
  assert.equal(s.seasonFromLongitude(45), "summer");
  assert.equal(s.seasonFromLongitude(224.99), "autumn");
  assert.equal(s.seasonFromLongitude(225), "winter");
});

// ---------- 星獣 ----------

test("決定性：同じ生年月日は常に同じ星獣・同じ判定内容", () => {
  for (const b of [{ year: 1992, month: 1, day: 21 }, { year: 1, month: 1, day: 1 }, { year: 9999, month: 12, day: 31 }]) {
    assert.deepEqual(s.calculateSeiju(b), s.calculateSeiju({ ...b }));
  }
});

test("12星獣すべてに到達できる（2000〜2001年の毎日）・どれも極端に少なくない", () => {
  const count = {};
  for (let y = 2000; y <= 2001; y++) for (let m = 1; m <= 12; m++) for (let d = 1; d <= 28; d++) {
    const r = s.calculateSeiju({ year: y, month: m, day: d });
    count[r.beast] = (count[r.beast] || 0) + 1;
  }
  assert.deepEqual(Object.keys(count).sort(), data.BEASTS.map((b) => b.id).sort());
  const total = Object.values(count).reduce((a, b) => a + b, 0);
  for (const [k, v] of Object.entries(count)) assert.ok(v / total > 0.04, `${k} ${v}`);
});

test("一貫性：星獣は必ず「季節×月のリズム」の表どおりで、データの属性とも一致", () => {
  for (let y = 1900; y <= 2030; y += 3) for (const m of [1, 3, 5, 7, 9, 11]) for (const d of [2, 13, 25]) {
    const r = s.calculateSeiju({ year: y, month: m, day: d });
    assert.equal(r.beast, s.beastFor(r.season, r.moonPhase));
    const b = data.getBeast(r.beast);
    assert.equal(b.season, r.season);
    assert.equal(b.moon, r.moonPhase);
  }
  // 表の12マスがすべて別の星獣
  const ids = Object.values(s.BEAST_GRID).flatMap((row) => Object.values(row));
  assert.equal(new Set(ids).size, 12);
});

test("対応範囲：1800〜2100年は verified、それ以外は estimated（計算方法は同じ）", () => {
  assert.equal(s.calculateSeiju({ year: 1800, month: 1, day: 1 }).precision, "verified");
  assert.equal(s.calculateSeiju({ year: 2100, month: 12, day: 31 }).precision, "verified");
  assert.equal(s.calculateSeiju({ year: 1799, month: 12, day: 31 }).precision, "estimated");
  assert.equal(s.calculateSeiju({ year: 2101, month: 1, day: 1 }).precision, "estimated");
  for (const b of [{ year: 1, month: 1, day: 1 }, { year: 9999, month: 12, day: 31 }, { year: 2024, month: 2, day: 29 }]) {
    const r = s.calculateSeiju(b);
    assert.ok(data.getBeast(r.beast));
  }
  const v = text.buildSeijuView(s.calculateSeiju({ year: 1, month: 1, day: 1 }));
  assert.ok(v.notes.some((n) => n.includes("推定")));
  const v2 = text.buildSeijuView(s.calculateSeiju({ year: 1992, month: 1, day: 21 }));
  assert.ok(!v2.notes.some((n) => n.includes("推定")));
});

test("不正な入力は例外（画面側で先に検証する前提）", () => {
  assert.throws(() => s.calculateSeiju({ year: 10000, month: 1, day: 1 }), RangeError);
  assert.throws(() => s.calculateSeiju({ year: 0, month: 1, day: 1 }), RangeError);
  assert.throws(() => s.calculateSeiju({ year: 2020, month: "1", day: 1 }), TypeError);
  assert.throws(() => s.calculateSeiju(null), TypeError);
});

test("データ：12星獣それぞれに名前・紋章・全項目。紋章は重複しない", () => {
  assert.equal(data.BEASTS.length, 12);
  const keys = ["catch", "reason", "personality", "strength", "hidden", "weakness", "weakShort", "work", "love", "relationships", "growth", "offers", "seeks"];
  for (const b of data.BEASTS) for (const k of keys) assert.ok(typeof b[k] === "string" && b[k].length > 3, `${b.id}.${k}`);
  assert.equal(new Set(data.BEASTS.map((b) => b.sigil)).size, 12);
  assert.deepEqual(data.BEASTS.map((b) => b.name).sort(), [
    "暁の狼", "月影の猫", "蒼天の鷹", "森護の熊", "雷光の虎", "星海のイルカ", "白銀の狐", "炎翼の隼", "大地の鹿", "深海の梟", "黄金の獅子", "夢渡りの兎"
  ].sort());
});

test("隠れた一面と苦手なことは別の文章", () => {
  for (const b of data.BEASTS) assert.notEqual(b.hidden, b.weakness);
});

test("個人鑑定の表示データ：理由に季節・月のリズム・星獣名が入り、14項目の素材がそろう", () => {
  const v = text.buildSeijuView(s.calculateSeiju({ year: 1992, month: 1, day: 21 }));
  const reason = v.reason.join("");
  assert.ok(reason.includes(v.season.name) && reason.includes(v.moon.name) && reason.includes(v.beast.name));
  assert.deepEqual(v.sections.map((x) => x.title), ["基本性格", "強み", "隠れた一面", "苦手になりやすいこと", "仕事・才能", "恋愛", "人間関係", "成長のヒント"]);
  assert.equal(v.grid.rows.flat().filter((c) => c.current).length, 1);
  assert.ok(!JSON.stringify(v).includes("undefined"));
});

// ---------- 相性 ----------

const A = { year: 1992, month: 1, day: 21 };
const B = { year: 1991, month: 8, day: 20 };

test("相性：同じ2人は常に同じ結果", () => {
  assert.deepEqual(s.calculateSeijuCompatibility(A, B), s.calculateSeijuCompatibility(A, B));
});

test("相性：A×B と B×A で対称な項目は一致し、方向のある項目は入れ替わる", () => {
  const dates = [];
  for (let y = 1980; y <= 2005; y += 5) for (const m of [1, 4, 7, 10]) for (const d of [3, 17]) dates.push({ year: y, month: m, day: d });
  for (let i = 0; i < dates.length; i++) for (let j = i + 1; j < dates.length; j += 3) {
    const ab = s.calculateSeijuCompatibility(dates[i], dates[j]);
    const ba = s.calculateSeijuCompatibility(dates[j], dates[i]);
    assert.equal(ab.category, ba.category);
    assert.equal(ab.seasonRelation.type, ba.seasonRelation.type);
    assert.equal(ab.moonRelation.type, ba.moonRelation.type);
    assert.equal(ab.sameBeast, ba.sameBeast);
    if (ab.seasonRelation.type === "adjacent") assert.notEqual(ab.seasonRelation.earlier, ba.seasonRelation.earlier);
    if (ab.moonRelation.type === "bridge") assert.notEqual(ab.moonRelation.fullSide, ba.moonRelation.fullSide);
    assert.equal(ab.intimacy.pace.person1, ba.intimacy.pace.person2);
    assert.equal(ab.intimacy.expression.person1, ba.intimacy.expression.person2);
  }
});

test("相性：分類は季節と月のリズムの関係だけで決まる（配列順や乱数に依存しない）", () => {
  // 全144通りの組み合わせで、分類が CATEGORY_TABLE と一致すること
  const reps = {};
  for (let y = 2000; y <= 2002; y++) for (let m = 1; m <= 12; m++) for (let d = 1; d <= 28; d += 2) {
    const r = s.calculateSeiju({ year: y, month: m, day: d });
    if (!reps[r.beast]) reps[r.beast] = { year: y, month: m, day: d };
  }
  const ids = Object.keys(reps);
  assert.equal(ids.length, 12);
  const seen = new Set();
  for (const a of ids) for (const b of ids) {
    const c = s.calculateSeijuCompatibility(reps[a], reps[b]);
    assert.equal(c.category, s.CATEGORY_TABLE[c.seasonRelation.type][c.moonRelation.type]);
    seen.add(c.category);
    if (a === b) { assert.equal(c.sameBeast, true); assert.equal(c.category, "resonance"); }
  }
  assert.deepEqual([...seen].sort(), ["complement", "pace", "resonance", "stimulus"]);
});

test("相性の表示データ：点数を出さず、占いのカルテ独自と明記、直接的な表現を使わない", () => {
  const v = text.buildSeijuCompatibilityView(s.calculateSeijuCompatibility(A, B));
  const all = JSON.stringify(v);
  assert.ok(v.total.method.includes("独自"));
  assert.ok(!/セックス|性的|身体の相性/.test(all));
  assert.ok(!/\d+点/.test(all));
  assert.equal(v.total.factors.length, 3);
  assert.ok(!all.includes("undefined"));
  // 視点：「あなたから見たお相手」と「お相手から見たあなた」は入れ替えると入れ替わる
  const r = text.buildSeijuCompatibilityView(s.calculateSeijuCompatibility(B, A));
  assert.equal(v.total.label, r.total.label);
  assert.notEqual(v.details[1].text, r.details[1].text);
});

test("誇張表現を使わない（科学的・統計的に証明、必ず当たる）", () => {
  const all = JSON.stringify(data) + JSON.stringify(text.buildSeijuView(s.calculateSeiju(A)));
  assert.ok(!/証明|必ず当たる|的中率/.test(all));
});
