// 生年月日の共通仕様テスト：node --test tests/
const test = require("node:test");
const assert = require("node:assert/strict");
const d = require("../assets/js/core/date.js");

function v(y, m, day) {
  return d.validateBirthDate({ year: y, month: m, day: day });
}

test("有効：0001-01-01 / 9999-12-31 / 2024-02-29 / 2000-02-29", () => {
  assert.deepEqual(v("0001", "1", "1"), { ok: true, value: { year: 1, month: 1, day: 1 } });
  assert.equal(v("9999", "12", "31").ok, true);
  assert.equal(v("2024", "2", "29").ok, true);
  assert.equal(v("2000", "2", "29").ok, true);
});

test("無効：2023-02-29 は存在しない日付", () => {
  const r = v("2023", "2", "29");
  assert.equal(r.ok, false);
  assert.match(r.errors.day, /存在しない日付/);
});

test("無効：1900-02-29（100で割り切れて400で割り切れない年）", () => {
  assert.equal(v("1900", "2", "29").ok, false);
});

test("無効：4月31日・11月31日", () => {
  assert.equal(v("2024", "4", "31").ok, false);
  assert.equal(v("2024", "11", "31").ok, false);
});

test("無効：10000年（5桁）", () => {
  const r = v("10000", "1", "1");
  assert.equal(r.ok, false);
  assert.match(r.errors.year, /4桁/);
});

test("無効：0000年、3桁、文字", () => {
  assert.match(v("0000", "1", "1").errors.year, /0001〜9999/);
  assert.match(v("992", "1", "1").errors.year, /4桁/);
  assert.equal(v("abcd", "1", "1").ok, false);
  assert.equal(v("19.2", "1", "1").ok, false);
});

test("無効：空欄（すべて空・一部空）", () => {
  const all = v("", "", "");
  assert.equal(all.ok, false);
  assert.match(all.message, /生年月日を入力/);
  assert.equal(v("1992", "", "21").ok, false);
  assert.equal(v("1992", "1", "").ok, false);
  assert.equal(d.validateBirthDate(undefined).ok, false);
});

test("全角数字も受け付ける", () => {
  assert.deepEqual(v("１９９２", "1", "21").value, { year: 1992, month: 1, day: 21 });
});

test("うるう年のルール", () => {
  assert.equal(d.isLeapYear(4), true);
  assert.equal(d.isLeapYear(100), false);
  assert.equal(d.isLeapYear(400), true);
  assert.equal(d.daysInMonth(2023, 2), 28);
  assert.equal(d.daysInMonth(2024, 2), 29);
});

test("日本時間の今日：UTC 2026-12-31 15:00 は日本では 2027-01-01", () => {
  assert.deepEqual(d.todayInJapan(new Date(Date.UTC(2026, 11, 31, 15, 0))), { year: 2027, month: 1, day: 1 });
  assert.deepEqual(d.todayInJapan(new Date(Date.UTC(2026, 11, 31, 14, 59))), { year: 2026, month: 12, day: 31 });
});

test("表示用の整形", () => {
  assert.equal(d.formatJa({ year: 1, month: 1, day: 1 }), "0001年1月1日");
  assert.equal(d.toIso({ year: 1, month: 1, day: 1 }), "0001-01-01");
});
