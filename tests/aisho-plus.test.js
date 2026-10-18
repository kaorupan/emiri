// 総合相性・名前の数秘術・12星座の相性
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
global.self = global;
require("../assets/js/vendor/astronomy-engine-2.1.19.min.js");
const S = require("../assets/js/content/sougou-aisho.js");
const N = require("../assets/js/content/namae-suhi.js");
const E = {
  numerology: require("../assets/js/engines/numerology.js"), kyusei: require("../assets/js/engines/kyusei.js"),
  shichu: require("../assets/js/engines/shichusuimei.js"), horoscope: require("../assets/js/engines/horoscope.js"),
  shukuyo: require("../assets/js/engines/shukuyo.js"), maya: require("../assets/js/engines/maya.js"),
  jyotish: require("../assets/js/engines/jyotish.js"), uchuban: require("../assets/js/content/uchuban.js")
};
const TODAY = { year: 2026, month: 10, day: 18 };

test("総合相性：8つの占術がそろい、点数は範囲内、関係ごとにことばが変わる", () => {
  const a = { year: 1980, month: 5, day: 3 }, b = { year: 1983, month: 9, day: 6 };
  const tips = new Set();
  for (const rel of Object.keys(S.RELATIONS)) {
    const v = S.build(a, b, rel, TODAY, E);
    assert.equal(v.items.length, 8);
    for (const x of v.items) assert.ok(x.score >= 40 && x.score <= 98 && x.reason && !/undefined|NaN/.test(x.reason), x.method);
    assert.ok(v.total >= 50 && v.total <= 98);
    tips.add(v.tip);
  }
  assert.equal(tips.size, 5);
});

test("総合相性：いろいろな組み合わせでエラーにならず、点数に幅がある", () => {
  const totals = new Set();
  for (let y = 1960; y <= 2004; y += 4) for (let y2 = 1965; y2 <= 2004; y2 += 7) {
    const v = S.build({ year: y, month: (y % 12) + 1, day: (y % 27) + 1 }, { year: y2, month: (y2 * 7 % 12) + 1, day: (y2 % 25) + 2 }, "love", TODAY, E);
    totals.add(Math.floor(v.total / 5));
  }
  assert.ok(totals.size >= 4, "総合点が4つ以上の帯に分かれる");
});

test("名前：ひらがな・カタカナ・ローマ字・半角カナを同じローマ字にする", () => {
  assert.equal(N.romanize("はなこ").romaji, "hanako");
  assert.equal(N.romanize("ハナコ").romaji, "hanako");
  assert.equal(N.romanize("Hanako").romaji, "hanako");
  assert.equal(N.romanize("ﾊﾅｺ").romaji, "hanako");
  assert.equal(N.romanize("きょうこ").romaji, "kyouko");
  assert.equal(N.romanize("しゅんすけ").romaji, "shunsuke");
  assert.equal(N.romanize("まっちゃ").romaji, "matcha");
  assert.equal(N.romanize("ゆーき").romaji, "yuuki");
  assert.equal(N.romanize("山田").ok, false);
});

test("名前：はなこ（HANAKO）のソウルナンバーは 1+1+6=8、相性は同じ名前で最高", () => {
  const r = N.numbers("はなこ");
  assert.equal(r.soul, 8);
  const same = N.compat("はなこ", "ハナコ");
  assert.equal(same.score, 92);
});

test("ページ：総合相性のフォーム、名前と12星座の相性ページがあり、相性占いからリンク", () => {
  const hub = fs.readFileSync(path.join(__dirname, "../aisho/index.html"), "utf8");
  assert.match(hub, /id="sougou-form"/);
  assert.ok(hub.includes('href="../suhijutsu/namae/"') && hub.includes('href="../horoscope/seiza-aisho/"'));
  const sz = fs.readFileSync(path.join(__dirname, "../horoscope/seiza-aisho/index.html"), "utf8");
  for (let i = 0; i < 12; i++) assert.match(sz, new RegExp(`id="sz-${i}"`));
  assert.match(fs.readFileSync(path.join(__dirname, "../suhijutsu/namae/index.html"), "utf8"), /id="namae-form"/);
});
