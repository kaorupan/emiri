// 復縁占い・片思い占い：assets/js/content/renai.js
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
global.self = global;
require("../assets/js/vendor/astronomy-engine-2.1.19.min.js");
const R = require("../assets/js/content/renai.js");
const E = {
  numerology: require("../assets/js/engines/numerology.js"), kyusei: require("../assets/js/engines/kyusei.js"),
  shichu: require("../assets/js/engines/shichusuimei.js"), horoscope: require("../assets/js/engines/horoscope.js"),
  shukuyo: require("../assets/js/engines/shukuyo.js"), maya: require("../assets/js/engines/maya.js"),
  jyotish: require("../assets/js/engines/jyotish.js"), uchuban: require("../assets/js/content/uchuban.js"),
  sougou: require("../assets/js/content/sougou-aisho.js")
};
const TODAY = { year: 2026, month: 11, day: 5 };

test("6か月の流れ：今月から順に並び、年をまたぐ", () => {
  const v = R.build("kataomoi", { year: 1995, month: 2, day: 15 }, null, {}, TODAY, E);
  assert.deepEqual(v.months.map((m) => [m.year, m.month]), [[2026, 11], [2026, 12], [2027, 1], [2027, 2], [2027, 3], [2027, 4]]);
  for (const m of v.months) assert.ok(m.pm >= 1 && m.pm <= 9 && m.label);
  assert.equal(v.en, null, "相手の生年月日がなければ縁の点数は出さない");
});

test("相手の生年月日があれば、8つの占術の総合相性で縁を出す", () => {
  const v = R.build("fukuen", { year: 1990, month: 5, day: 3 }, { year: 1988, month: 11, day: 20 }, {}, TODAY, E);
  assert.ok(v.en && v.en.total >= 50 && v.en.total <= 98 && v.en.items.length === 8);
});

test("状況のアドバイス：選んだ項目ぶんの文章が出る。選んでいない項目は出さない", () => {
  const v = R.build("fukuen", { year: 1990, month: 5, day: 3 }, null, { period: "m6", contact: "some", reason: "fight" }, TODAY, E);
  assert.equal(v.advice.length, 3);
  const k = R.build("kataomoi", { year: 1990, month: 5, day: 3 }, null, { relation: "friend" }, TODAY, E);
  assert.equal(k.advice.length, 1);
});

test("ブロックされているときは連絡をすすめない", () => {
  const v = R.build("fukuen", { year: 1990, month: 5, day: 3 }, null, { contact: "blocked" }, TODAY, E);
  assert.ok(v.blocked);
  assert.ok(v.steps.every((s) => !/連絡してみる/.test(s)));
  assert.match(v.advice.map((a) => a.text).join(""), /やめましょう/);
});

test("ページ：フォーム・質問・広告の枠（恋愛）があり、TOPと相性占いからリンク", () => {
  for (const slug of ["fukuen", "kataomoi"]) {
    const html = fs.readFileSync(path.join(__dirname, `../${slug}/index.html`), "utf8");
    assert.match(html, new RegExp(`data-kind="${slug}"`));
    assert.match(html, /type="radio"/);
    assert.match(html, /恋の悩みを、占い師に相談するなら/);
    assert.ok(fs.readFileSync(path.join(__dirname, "../aisho/index.html"), "utf8").includes(`href="../${slug}/"`));
  }
  assert.ok(fs.readFileSync(path.join(__dirname, "../index.html"), "utf8").includes('href="fukuen/"'));
});
