// 本格占い「総合鑑定書」の自動テスト
const test = require("node:test");
const assert = require("node:assert/strict");
const kantei = require("../assets/js/content/kantei-text.js");
const daily = require("../assets/js/engines/daily.js");

const TODAY = { year: 2026, month: 10, day: 10 };
const textOf = (r) => JSON.stringify(r.chapters);

test("見本（1992年1月21日）：章立てと、あなたの軸＝探究・もうひとつの柱＝表現", () => {
  const r = kantei.buildKantei({ name: "サンプル", year: 1992, month: 1, day: 21 }, TODAY);
  assert.deepEqual(r.chapters.map((c) => c.id), ["intro", "karute", "axis", "personality", "strength", "work", "love", "relations", "money", "years", "luck", "closing"]);
  assert.equal(r.axis.mainName, "探究");
  assert.equal(r.axis.subName, "表現");
  assert.equal(r.who, "サンプルさん");
  const years = r.chapters.find((c) => c.id === "years").blocks.find((b) => b.type === "years").items;
  assert.deepEqual(years.map((y) => y.year), [2026, 2027, 2028]);
  // 2026年は一白水星の年。本命星 九紫火星は巽宮に入る
  assert.match(years[0].rows[1][1], /年の星 一白水星、本命星は巽宮/);
  assert.match(years[0].rows[0][1], /パーソナルイヤー 5/);
});

test("同じ入力からは同じ鑑定書（AI・乱数を使わない）", () => {
  const a = kantei.buildKantei({ name: "A", year: 1985, month: 7, day: 7 }, TODAY);
  const b = kantei.buildKantei({ name: "A", year: 1985, month: 7, day: 7 }, TODAY);
  assert.equal(JSON.stringify(a), JSON.stringify(b));
});

test("1940〜2010年の幅広い生年月日で、文章が欠けずに組み立てられる", () => {
  let n = 0;
  const axes = new Set();
  for (let y = 1940; y <= 2010; y += 3) {
    for (let m = 1; m <= 12; m++) {
      const d = ((y * 7 + m * 3) % 28) + 1;
      const r = kantei.buildKantei({ year: y, month: m, day: d }, TODAY);
      const t = textOf(r);
      assert.ok(!/undefined|null|NaN/.test(t.replace(/"type":"[a-z0-9]+"/g, "")), `${y}-${m}-${d}`);
      assert.ok(t.length > 6000, `${y}-${m}-${d} ${t.length}`);
      assert.equal(r.who, "あなた");
      axes.add(r.axis.main);
      n++;
    }
  }
  assert.ok(n > 250);
  assert.equal(axes.size, 6, "6つの軸がどれも出る");
});

test("使わない表現（断定・不安をあおる言葉、直接的な表現）を含まない", () => {
  for (const [y, m, d] of [[1992, 1, 21], [1975, 3, 21], [2001, 11, 30], [1960, 2, 4]]) {
    const t = textOf(kantei.buildKantei({ year: y, month: m, day: d }, TODAY));
    for (const ng of ["必ず不幸", "絶対に", "最悪", "死", "セックス"]) assert.ok(!t.includes(ng), `${y}-${m}-${d} ${ng}`);
  }
});

test("年の宮の文章が9宮すべてそろっている", () => {
  for (const id of daily.FLIGHT_ORDER) assert.ok(kantei.YEAR_PALACE[id] && kantei.YEAR_PALACE[id].text, id);
  for (let i = 1; i <= 9; i++) assert.ok(kantei.NUM_AXIS[i] && kantei.STAR_AXIS[i], i);
});
