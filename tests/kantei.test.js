// 本格占い「総合鑑定書」の自動テスト
const test = require("node:test");
const assert = require("node:assert/strict");
const kantei = require("../assets/js/content/kantei-text.js");
const daily = require("../assets/js/engines/daily.js");

const TODAY = { year: 2026, month: 10, day: 10 };
const textOf = (r) => JSON.stringify(r.chapters);

test("見本（1992年1月21日）：章立てと、あなたの軸＝表現・もうひとつの柱＝探究", () => {
  const r = kantei.buildKantei({ name: "サンプル", year: 1992, month: 1, day: 21 }, TODAY);
  assert.deepEqual(r.chapters.map((c) => c.id), ["intro", "karute", "axis", "synthesis", "personality", "shichusuimei", "maya", "shukuyo", "horoscope", "jyotish", "strength", "work", "love", "relations", "money", "years", "kippoui", "eto", "luck", "closing"]);
  assert.equal(r.axis.mainName, "表現");
  assert.equal(r.axis.subName, "探究");
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
    // 十二運の「死」は四柱推命の用語なので除く
    const t = textOf(kantei.buildKantei({ year: y, month: m, day: d }, TODAY)).replace(/十二運[ ：]死/g, "");
    for (const ng of ["必ず不幸", "絶対に", "最悪", "死", "セックス"]) assert.ok(!t.includes(ng), `${y}-${m}-${d} ${ng}`);
  }
});

test("年の宮の文章が9宮すべてそろっている", () => {
  for (const id of daily.FLIGHT_ORDER) assert.ok(kantei.YEAR_PALACE[id] && kantei.YEAR_PALACE[id].text, id);
  for (let i = 1; i <= 9; i++) assert.ok(kantei.NUM_AXIS[i] && kantei.STAR_AXIS[i], i);
});

test("相性の相手を1人設定すると「〇〇さんとの相性」の章が「おわりに」の前に入る", () => {
  const r = kantei.buildKantei({ name: "サンプル", year: 1990, month: 1, day: 1 }, TODAY, { name: "ミライ", year: 1992, month: 5, day: 15 });
  const ids = r.chapters.map((c) => c.id);
  assert.deepEqual(ids.slice(-2), ["aisho", "closing"]);
  const a = r.chapters.find((c) => c.id === "aisho");
  assert.equal(a.title, "ミライさんとの相性");
  assert.equal(r.partnerName, "ミライさん");
  const t = JSON.stringify(a.blocks);
  for (const h of ["ふたりの全体像", "恋愛の相性", "価値観と会話", "暮らしと結婚", "すれ違いやすいポイントと仲直り", "親密さと距離感", "ふたりのタイミング", "長続きのコツ"]) assert.ok(t.includes(h), h);
  assert.ok(!/undefined|null|NaN/.test(t));
  assert.ok(r.upsell && r.upsell.title);
  assert.equal(r.upsell.price, "お相手1人につき 980円（税込）");
  // 名前なしのお相手は「お相手」
  const r2 = kantei.buildKantei({ year: 1990, month: 1, day: 1 }, TODAY, { year: 1985, month: 7, day: 7 });
  assert.equal(r2.chapters.find((c) => c.id === "aisho").title, "お相手との相性");
  // お相手なしなら章は入らない
  assert.ok(!kantei.buildKantei({ year: 1990, month: 1, day: 1 }, TODAY).chapters.some((c) => c.id === "aisho"));
});

test("相性の章：幅広いお相手の生年月日で欠けずに組み立てられる", () => {
  for (let i = 0; i < 120; i++) {
    const y = 1940 + (i * 7) % 70, m = 1 + (i * 5) % 12, d = 1 + (i * 11) % 28;
    const r = kantei.buildKantei({ year: 1990, month: 1, day: 1 }, TODAY, { year: y, month: m, day: d, time: i % 3 === 0 ? "12:00" : null });
    const t = JSON.stringify(r.chapters.find((c) => c.id === "aisho"));
    assert.ok(!/undefined|NaN/.test(t), `${y}-${m}-${d}`);
  }
});

test("姓名・出生時刻を入れると「名前が持つ力」と紫微斗数の章が加わり、相性に名前の相性と他の占術が入る", () => {
  const r = kantei.buildKantei({ name: "あかり", sei: "星川", mei: "あかり", year: 1990, month: 1, day: 1, time: "10:30" }, TODAY,
    { name: "ミライ", sei: "月島", mei: "ミライ", year: 1992, month: 5, day: 15 });
  const ids = r.chapters.map((c) => c.id);
  for (const id of ["synthesis", "shichusuimei", "maya", "shukuyo", "horoscope", "jyotish", "shibi", "seimei", "kippoui", "eto", "aisho"]) assert.ok(ids.includes(id), id);
  assert.ok(ids.indexOf("seimei") < ids.indexOf("strength"));
  const name = JSON.stringify(r.chapters.find((c) => c.id === "seimei"));
  assert.ok(name.includes("生年月日 × 名前の重ね読み") && name.includes("星川 あかり"));
  const syn = JSON.stringify(r.chapters.find((c) => c.id === "synthesis"));
  assert.ok(syn.includes("生まれ持ったものと、名前で育つもの"));
  const a = JSON.stringify(r.chapters.find((c) => c.id === "aisho"));
  for (const h of ["四柱推命：", "マヤ暦：", "宿曜占星術：", "西洋占星術：", "インド占星術：", "名前の相性"]) assert.ok(a.includes(h), h);
  const years = r.chapters.find((c) => c.id === "years").blocks.find((b) => b.type === "years").items;
  assert.ok(years[0].rows.length >= 6);
  const all = JSON.stringify(r.chapters);
  assert.ok(!/undefined|NaN/.test(all));
  assert.ok(all.length > 25000, String(all.length));
  // 姓名なし・時刻なしなら、その章は入らない
  const r2 = kantei.buildKantei({ year: 1990, month: 1, day: 1 }, TODAY);
  assert.ok(!r2.chapters.some((c) => c.id === "seimei" || c.id === "shibi"));
  // 画数のわからない字の名前でも、鑑定書は作れる（名前の章を省く）
  const r3 = kantei.buildKantei({ sei: "Smith", mei: "Ann", year: 1990, month: 1, day: 1 }, TODAY);
  assert.ok(!r3.chapters.some((c) => c.id === "seimei"));
});
