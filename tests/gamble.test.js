// ギャンブル運占い：assets/js/content/gamble.js
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const G = require("../assets/js/content/gamble.js");
const E = { shichu: require("../assets/js/engines/shichusuimei.js"), numerology: require("../assets/js/engines/numerology.js") };
const TODAY = { year: 2026, month: 10, day: 18 };

test("生まれ持ったギャンブル運：5つのタイプのどれかになり、5つの力は1〜5", () => {
  const seen = new Set();
  for (let y = 1950; y <= 2005; y += 1) for (const md of [[1, 3], [6, 17], [11, 28]]) {
    const v = G.build({ year: y, month: md[0], day: md[1] }, TODAY, E);
    const n = v.natal;
    assert.ok(G.TYPES[n.typeKey], `${y}`);
    seen.add(n.typeKey);
    assert.equal(n.powers.length, 5);
    for (const p of n.powers) assert.ok(p.level >= 1 && p.level <= 5);
    assert.ok(n.lpText && n.luckyColor && n.luckyNumber >= 1 && n.luckyNumber <= 9);
    assert.ok(!/undefined|NaN/.test(JSON.stringify(v)));
  }
  assert.equal(seen.size, 5, "どのタイプも出る");
});

test("今日のギャンブル運：★1〜5、7日分が今日から順に並ぶ、天中殺の日は★2以下", () => {
  for (let y = 1955; y <= 2005; y += 5) {
    const v = G.build({ year: y, month: 3, day: 9 }, TODAY, E);
    assert.deepEqual(v.week[0].date, TODAY);
    assert.deepEqual(v.week[6].date, { year: 2026, month: 10, day: 24 });
    assert.equal(v.today.score, v.week[0].score);
    for (const d of v.week) {
      assert.ok(d.score >= 1 && d.score <= 5 && G.LEVELS[d.score]);
      if (d.kuubou) assert.ok(d.score <= 2);
      if (d.tsuhen === "劫財") assert.ok(d.score <= 2, "劫財の日は控えめ");
    }
    assert.ok(v.today.luckyNumber >= 1 && v.today.luckyNumber <= 9);
    for (const d of v.week) assert.ok(d.luckyColor && d.luckyItem, "毎日のラッキーカラーとアイテム");
    assert.equal(v.natal.luckyItems.length, 3);
    assert.ok(fs.existsSync(path.join(__dirname, "..", v.natal.luckyStone.url.replace("../", ""), "index.html")), "金運の石のページがある");
  }
});

test("ラッキーカラー・アイテムは日によって変わる", () => {
  const v = G.build({ year: 1980, month: 5, day: 3 }, TODAY, E);
  assert.ok(new Set(v.week.map((d) => d.luckyItem)).size >= 3);
  assert.ok(new Set(v.week.map((d) => d.luckyColor)).size >= 3);
});

test("同じ人・同じ日なら結果は同じ（毎回変わらない）", () => {
  const b = { year: 1980, month: 5, day: 3 };
  assert.deepEqual(G.build(b, TODAY, E), G.build(b, TODAY, E));
});

test("日付の足し算は月と年をまたぐ", () => {
  assert.deepEqual(G.addDays({ year: 2026, month: 12, day: 29 }, 5), { year: 2027, month: 1, day: 3 });
  assert.deepEqual(G.addDays({ year: 2028, month: 2, day: 27 }, 2), { year: 2028, month: 2, day: 29 });
});

test("ページ：フォームと結果の置き場所、楽しみ方の約束と相談先があり、TOPからリンクしている", () => {
  const html = fs.readFileSync(path.join(__dirname, "../gamble/index.html"), "utf8");
  assert.match(html, /id="gamble-form"/);
  assert.match(html, /content\/gamble\.js/);
  assert.match(html, /20歳未満/);
  assert.match(html, /精神保健福祉センター/);
  assert.ok(fs.readFileSync(path.join(__dirname, "../index.html"), "utf8").includes('href="gamble/"'));
});
