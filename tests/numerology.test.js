// 数秘術エンジンの自動テスト：node --test tests/
const test = require("node:test");
const assert = require("node:assert/strict");
const n = require("../assets/js/engines/numerology.js");
const content = require("../assets/js/content/numerology-text.js");

const Y = { targetYear: 2026 };

test("ライフパス：1992-01-21 は 7（監査で確認した既知例）", () => {
  // 1+9+9+2+1+2+1 = 25 → 7
  assert.equal(n.calculateNumerology({ year: 1992, month: 1, day: 21 }, Y).lifePath, 7);
});

test("ライフパス：1991-08-20 は 3（解説ページの例）", () => {
  assert.equal(n.lifePath(1991, 8, 20), 3);
});

test("ライフパス：マスターナンバー 11 / 22 / 33 を残す", () => {
  assert.equal(n.lifePath(2000, 1, 8), 11);   // 2+1+8 = 11
  assert.equal(n.lifePath(1978, 11, 29), 11); // 38 → 11（途中で11になったら止める）
  assert.equal(n.lifePath(2003, 9, 8), 22);   // 2+3+9+8 = 22
  assert.equal(n.lifePath(1966, 9, 2), 33);   // 1+9+6+6+9+2 = 33
});

test("ライフパス：境界の年 0001 と 9999", () => {
  assert.equal(n.lifePath(1, 1, 1), 3);        // 1+1+1
  assert.equal(n.lifePath(9999, 12, 31), 7);   // 9+9+9+9+1+2+3+1 = 43 → 7
});

test("バースデー：11・22 は残し、それ以外は1桁に", () => {
  assert.equal(n.birthdayNumber(29), 11);
  assert.equal(n.birthdayNumber(22), 22);
  assert.equal(n.birthdayNumber(30), 3);
  assert.equal(n.birthdayNumber(9), 9);
});

test("アティチュード：月＋日の各桁", () => {
  assert.equal(n.attitudeNumber(11, 29), 4);  // 1+1+2+9 = 13 → 4
  assert.equal(n.attitudeNumber(1, 21), 4);   // 1+2+1 = 4
  assert.equal(n.attitudeNumber(9, 2), 11);   // 9+2 = 11（マスター）
});

test("パーソナルイヤー・マンス：マスターナンバーは残さない", () => {
  assert.equal(n.personalYear(1, 21, 2026), 5);  // 1+2+1+2+0+2+6 = 14 → 5
  assert.equal(n.personalYear(2, 7, 2000), 2);   // 2+7+2 = 11 → 2（11で止めない）
  assert.equal(n.personalMonth(5, 9), 5);        // 14 → 5
  assert.equal(n.personalMonth(5, 12), 8);       // 17 → 8
  assert.equal(n.personalMonth(2, 9), 2);        // 11 → 2
});

test("calculateNumerology：返り値の形と12ヶ月", () => {
  const r = n.calculateNumerology({ year: 1992, month: 1, day: 21 }, Y);
  assert.deepEqual(
    [r.lifePath, r.birthday, r.attitude, r.personalYear],
    [7, 3, 4, 5]
  );
  assert.equal(r.personalMonths.length, 12);
  assert.deepEqual(r.personalMonths.map((m) => m.month), [1,2,3,4,5,6,7,8,9,10,11,12]);
  assert.equal(r.personalMonths[8].personalMonth, 5);
  assert.equal(r.targetYear, 2026);
});

test("calculateNumerology：不正な入力は例外（画面側で先に検証する前提）", () => {
  assert.throws(() => n.calculateNumerology({ year: 10000, month: 1, day: 1 }, Y), RangeError);
  assert.throws(() => n.calculateNumerology({ year: 1990, month: 13, day: 1 }, Y), RangeError);
  assert.throws(() => n.calculateNumerology({ year: 1990, month: 1, day: 1 }, {}), TypeError);
});

test("相性：同じ入力なら同じ結果、並び順を入れ替えても総合点は同じ", () => {
  const a = { year: 1992, month: 1, day: 21 };
  const b = { year: 1991, month: 8, day: 20 };
  const ab = n.calculateCompatibility(a, b, Y);
  const ab2 = n.calculateCompatibility(a, b, Y);
  const ba = n.calculateCompatibility(b, a, Y);
  assert.deepEqual(ab.scores, ab2.scores);
  assert.equal(ab.scores.total, ba.scores.total);
  assert.equal(ab.method, "karute-original");
});

test("相性：旧 compatibilityEngine と同じ値（1992-01-21 × 1991-08-20, 2026年）", () => {
  // 統合版 latest-4systems-fixed.html の compatibilityEngine で算出した値
  const r = n.calculateCompatibility({ year: 1992, month: 1, day: 21 }, { year: 1991, month: 8, day: 20 }, Y);
  assert.equal(r.scores.total, 82);
});

test("相性：全スコアが 60〜99 に収まる（網羅チェック）", () => {
  const keys = ["love", "marriage", "values", "work", "intimacy", "total"];
  for (let m1 = 1; m1 <= 12; m1 += 1) {
    for (let d1 = 1; d1 <= 28; d1 += 3) {
      const r = n.calculateCompatibility({ year: 1980 + m1, month: m1, day: d1 }, { year: 1999, month: 13 - m1, day: 29 - d1 }, Y);
      for (const k of keys) {
        assert.ok(r.scores[k] >= 60 && r.scores[k] <= 99, `${k}=${r.scores[k]}`);
      }
      assert.equal(r.bestMonths.length, 3);
    }
  }
});

test("文章：全ライフパス（1〜9・11・22・33）で個人鑑定文が組み立てられる", () => {
  const samples = [
    [2000, 1, 1], [2000, 1, 2], [2000, 1, 3], [2000, 1, 4], [2000, 1, 5],
    [2000, 1, 6], [2000, 1, 7], [2000, 1, 9], [2000, 9, 9], [2000, 1, 8], [2003, 9, 8], [1966, 9, 2]
  ];
  const seen = new Set();
  for (const [y, m, d] of samples) {
    const r = n.calculateNumerology({ year: y, month: m, day: d }, Y);
    seen.add(r.lifePath);
    const v = content.buildPersonal(r);
    assert.ok(v.lifePath.tag, `LP${r.lifePath} tag`);
    assert.equal(v.months.length, 12);
    const all = JSON.stringify(v);
    assert.ok(!all.includes("undefined"), `LP${r.lifePath} に undefined が混ざっている`);
  }
  assert.deepEqual([...seen].sort((a, b) => a - b), [1, 2, 3, 4, 5, 6, 7, 8, 9, 11, 22, 33]);
});

test("文章：月の文章に「年」表記が混ざらない（監査B6）", () => {
  for (const k of Object.keys(content.PERSONAL_MONTH)) {
    assert.ok(!/年。$/.test(content.PERSONAL_MONTH[k].text), `PM${k}`);
  }
});

test("文章：「。という」の文崩れがない（監査B7）", () => {
  for (let py = 1; py <= 9; py += 1) {
    const r = n.calculateNumerology({ year: 1990, month: 1, day: 1 }, { targetYear: 2026 });
    r.personalYear = py;
    const v = content.buildPersonal(r);
    assert.ok(!JSON.stringify(v).includes("。という"));
  }
});

test("文章：相性の表現に直接的な性的表現を使わない", () => {
  const r = n.calculateCompatibility({ year: 1992, month: 1, day: 21 }, { year: 1991, month: 8, day: 20 }, Y);
  const v = content.buildCompatibility(r);
  const all = JSON.stringify(v);
  assert.ok(!/セックス|性的|身体の相性/.test(all));
  assert.ok(v.total.method.includes("独自"));
});
