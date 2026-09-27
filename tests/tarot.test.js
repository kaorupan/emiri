// タロットの自動テスト：node --test tests/
// 乱数の結果そのもの（「このカードが出る」）ではなく、ロジックの性質を検証する。
const test = require("node:test");
const assert = require("node:assert/strict");
const t = require("../assets/js/engines/tarot.js");
const deck = require("../assets/js/content/tarot-deck.js");
const readings = require("../assets/js/content/tarot-readings.js");
const text = require("../assets/js/content/tarot-text.js");

// 再現できる疑似乱数（mulberry32）
function seeded(seed) {
  let a = seed >>> 0;
  return function () {
    a = (a + 0x6d2b79f5) >>> 0;
    let x = Math.imul(a ^ (a >>> 15), 1 | a);
    x = (x + Math.imul(x ^ (x >>> 7), 61 | x)) ^ x;
    return ((x ^ (x >>> 14)) >>> 0) / 4294967296;
  };
}

function memoryStore(initial) {
  let data = initial === undefined ? null : JSON.parse(JSON.stringify(initial));
  const saved = [];
  return {
    load: () => (data ? JSON.parse(JSON.stringify(data)) : null),
    save: (v) => { data = JSON.parse(JSON.stringify(v)); saved.push(v); return true; },
    raw: () => data,
    saved
  };
}

const THEMES = text.THEMES.map((x) => x.id);
const DATE = "2026-09-27";

test("カードは22枚、IDは0〜21", () => {
  assert.equal(t.CARD_COUNT, 22);
  assert.equal(deck.CARDS.length, 22);
  deck.CARDS.forEach((c, i) => assert.equal(c.id, i));
});

test("Fisher–Yates：元の配列を変えず、並べ替えただけ（要素の欠け・重複なし）", () => {
  const src = t.allCardIds();
  for (let s = 1; s <= 200; s++) {
    const out = t.shuffle(src, seeded(s));
    assert.deepEqual(src, t.allCardIds());
    assert.deepEqual([...out].sort((a, b) => a - b), src);
  }
});

test("Fisher–Yates：偏りがない（各カードが各位置に来る回数がほぼ均等）", () => {
  const N = 44000; const counts = Array.from({ length: 22 }, () => new Array(22).fill(0));
  const rnd = seeded(12345);
  for (let i = 0; i < N; i++) t.shuffle(t.allCardIds(), rnd).forEach((card, pos) => counts[card][pos]++);
  const expected = N / 22; // 2000
  for (const row of counts) for (const c of row) assert.ok(Math.abs(c - expected) < expected * 0.12, `count ${c}`);
});

test("乱数が1を返すなど不正でも範囲外にならない", () => {
  const out = t.shuffle(t.allCardIds(), () => 1);
  assert.deepEqual([...out].sort((a, b) => a - b), t.allCardIds());
});

test("3枚引ける・重複なし・過去／現在／未来の順", () => {
  for (let s = 1; s <= 500; s++) {
    const r = t.drawTarot({ theme: "love", date: DATE, random: seeded(s) });
    assert.equal(r.cards.length, 3);
    assert.deepEqual(r.cards.map((c) => c.position), ["past", "present", "future"]);
    assert.equal(new Set(r.cards.map((c) => c.cardId)).size, 3);
    assert.ok(t.isValidCards(r.cards));
    assert.equal(r.theme, "love");
    assert.equal(r.date, DATE);
  }
});

test("正位置／逆位置：定数 REVERSED_PROBABILITY で判定し、選んだ後も変わらない", () => {
  assert.equal(t.REVERSED_PROBABILITY, 0.35);
  // 乱数が常に 0（しきい値未満）なら全部逆位置、0.99 なら全部正位置
  assert.ok(t.shuffleDeck({ random: () => 0 }).every((c) => c.orientation === "reversed"));
  assert.ok(t.shuffleDeck({ random: () => 0.99 }).every((c) => c.orientation === "upright"));
  // 境界：ちょうど 0.35 は正位置
  const r = t.shuffleDeck({ random: () => 0.35 });
  assert.ok(r.every((c) => c.orientation === "upright"));
  // 山から選んだカードの向きがそのまま結果に入る
  const d = t.shuffleDeck({ random: seeded(9) });
  const reading = t.readingFromDeck("work", DATE, d, [5, 0, 21]);
  assert.deepEqual(reading.cards.map((c) => [c.cardId, c.orientation]), [5, 0, 21].map((i) => [d[i].cardId, d[i].orientation]));
});

test("逆位置の割合はおよそ35%", () => {
  const rnd = seeded(777); let rev = 0; let total = 0;
  for (let i = 0; i < 3000; i++) { t.shuffleDeck({ random: rnd }).forEach((c) => { total++; if (c.orientation === "reversed") rev++; }); }
  const ratio = rev / total;
  assert.ok(ratio > 0.33 && ratio < 0.37, String(ratio));
});

test("選んだ順：同じカードを2回選べない・3枚以外はエラー", () => {
  const d = t.shuffleDeck({ random: seeded(1) });
  assert.throws(() => t.readingFromDeck("love", DATE, d, [1, 1, 2]), RangeError);
  assert.throws(() => t.readingFromDeck("love", DATE, d, [1, 2]), RangeError);
  assert.throws(() => t.readingFromDeck("love", DATE, d, [1, 2, 22]), RangeError);
  assert.throws(() => t.readingFromDeck("love", "2026/09/27", d, [0, 1, 2]), TypeError);
  assert.throws(() => t.readingFromDeck("<b>", DATE, d, [0, 1, 2]), TypeError);
});

test("1日1回：同じ日＋同じテーマは、乱数が違っても保存済みの結果を返す", () => {
  const store = memoryStore();
  const first = t.drawTarot({ theme: "love", date: DATE, random: seeded(1) });
  assert.equal(t.saveDailyReading({ reading: first, store }), true);
  const again = t.getDailyReading({ theme: "love", date: DATE, store });
  assert.deepEqual(again.cards, first.cards);
  // 別の結果で上書きしようとしても、先に保存した結果を正とする
  const second = t.drawTarot({ theme: "love", date: DATE, random: seeded(999) });
  t.saveDailyReading({ reading: second, store });
  assert.deepEqual(t.getDailyReading({ theme: "love", date: DATE, store }).cards, first.cards);
});

test("1日1回：同じ日＋別テーマは別の結果を持てる", () => {
  const store = memoryStore();
  const love = t.drawTarot({ theme: "love", date: DATE, random: seeded(1) });
  const work = t.drawTarot({ theme: "work", date: DATE, random: seeded(2) });
  t.saveDailyReading({ reading: love, store });
  assert.equal(t.getDailyReading({ theme: "work", date: DATE, store }), null);
  t.saveDailyReading({ reading: work, store });
  assert.deepEqual(t.getDailyReading({ theme: "love", date: DATE, store }).cards, love.cards);
  assert.deepEqual(t.getDailyReading({ theme: "work", date: DATE, store }).cards, work.cards);
  assert.deepEqual(t.todaysThemes({ store, date: DATE }).sort(), ["love", "work"]);
});

test("1日1回：翌日は新しく引ける。前日の結果は保存時に消える", () => {
  const store = memoryStore();
  t.saveDailyReading({ reading: t.drawTarot({ theme: "love", date: DATE, random: seeded(1) }), store });
  assert.equal(t.getDailyReading({ theme: "love", date: "2026-09-28", store }), null);
  assert.deepEqual(t.todaysThemes({ store, date: "2026-09-28" }), []);
  const next = t.drawTarot({ theme: "love", date: "2026-09-28", random: seeded(3) });
  t.saveDailyReading({ reading: next, store });
  assert.equal(store.raw().date, "2026-09-28");
  assert.deepEqual(Object.keys(store.raw().readings), ["love"]);
});

test("保存内容は最低限（テーマ・日付・カード・向き）だけ", () => {
  const store = memoryStore();
  const r = t.drawTarot({ theme: "love", date: DATE, random: seeded(4) });
  r.question = "秘密の相談"; // 余計なプロパティを付けても保存されない
  t.saveDailyReading({ reading: r, store });
  const raw = JSON.stringify(store.raw());
  assert.ok(!raw.includes("秘密"));
  assert.deepEqual(Object.keys(store.raw()).sort(), ["date", "readings", "version"]);
  for (const c of store.raw().readings.love.cards) assert.deepEqual(Object.keys(c).sort(), ["cardId", "orientation", "position"]);
});

test("壊れた保存データは使わず、新しく引ける", () => {
  const broken = [
    "文字列", { version: 99, date: DATE, readings: {} },
    { version: 1, date: DATE, readings: { love: { cards: [{ position: "past", cardId: 3, orientation: "upright" }] } } },
    { version: 1, date: DATE, readings: { love: { cards: [
      { position: "past", cardId: 3, orientation: "upright" }, { position: "present", cardId: 3, orientation: "upright" }, { position: "future", cardId: 4, orientation: "upright" }] } } },
    { version: 1, date: DATE, readings: { love: { cards: [
      { position: "past", cardId: 30, orientation: "upright" }, { position: "present", cardId: 1, orientation: "x" }, { position: "future", cardId: 4, orientation: "upright" }] } } }
  ];
  for (const b of broken) {
    const store = memoryStore(b);
    assert.equal(t.getDailyReading({ theme: "love", date: DATE, store }), null);
    const r = t.drawTarot({ theme: "love", date: DATE, random: seeded(5) });
    assert.equal(t.saveDailyReading({ reading: r, store }), true);
    assert.deepEqual(t.getDailyReading({ theme: "love", date: DATE, store }).cards, r.cards);
  }
});

test("保存先が使えない（例外を投げる・保存に失敗する）場合もクラッシュしない", () => {
  const throwing = { load() { throw new Error("denied"); }, save() { throw new Error("denied"); } };
  const r = t.drawTarot({ theme: "love", date: DATE, random: seeded(6) });
  assert.equal(t.getDailyReading({ theme: "love", date: DATE, store: throwing }), null);
  assert.equal(t.saveDailyReading({ reading: r, store: throwing }), false);
  assert.equal(t.saveDailyReading({ reading: r, store: { load: () => null, save: () => false } }), false);
  assert.equal(t.saveDailyReading({ reading: r, store: null }), false);
  assert.deepEqual(t.todaysThemes({ store: throwing, date: DATE }), []);
});

test("カードデータ：番号・名前・キーワード・正位置／逆位置の意味・逆位置の表れ方", () => {
  for (const c of deck.CARDS) {
    assert.ok(c.numeral && c.nameEn && c.name, `card ${c.id}`);
    assert.equal(c.keywords.length, 3);
    assert.equal(c.reversedKeywords.length, 3);
    assert.ok(c.upright.length > 10 && c.reversed.length > 10);
    assert.ok(deck.ASPECTS[c.reversedAspect], `aspect ${c.reversedAspect}`);
    assert.ok(["light", "shadow"].includes(c.tone.upright) && ["light", "shadow"].includes(c.tone.reversed));
    assert.equal(c.image, null);
  }
});

test("テーマ別の読み：全22枚×全テーマ×正逆がそろい、テーマごとに文章が違う", () => {
  assert.deepEqual(THEMES, ["general", "love", "work", "relationships", "money"]);
  for (const c of deck.CARDS) {
    for (const ori of ["upright", "reversed"]) {
      const texts = THEMES.map((th) => readings.getReading(c.id, th, ori));
      texts.forEach((x, i) => assert.ok(x && x.length > 15, `card ${c.id} ${THEMES[i]} ${ori}`));
      assert.equal(new Set(texts).size, THEMES.length, `card ${c.id} ${ori}: テーマ間で同じ文章がある`);
    }
    for (const th of THEMES) {
      assert.notEqual(readings.getReading(c.id, th, "upright"), readings.getReading(c.id, th, "reversed"));
    }
  }
});

test("テーマを変えると、同じカードでも鑑定文が変わる（テーマ名の置き換えだけではない）", () => {
  const cards = [{ position: "past", cardId: 0, orientation: "upright" }, { position: "present", cardId: 6, orientation: "reversed" }, { position: "future", cardId: 19, orientation: "upright" }];
  const views = THEMES.map((theme) => text.buildTarotView({ theme, date: DATE, cards }));
  const strip = (v) => v.cards.map((c) => c.reading.text).join("");
  assert.equal(new Set(views.map(strip)).size, THEMES.length);
  assert.equal(new Set(views.map((v) => v.message[3])).size, THEMES.length);
  assert.equal(new Set(views.map((v) => v.cautions[2])).size, THEMES.length);
});

test("総合メッセージ：過去→現在、現在→未来の流れが正逆・カードの明暗で変わる", () => {
  const mk = (a, b, c) => ({ theme: "general", date: DATE, cards: [
    { position: "past", cardId: a[0], orientation: a[1] }, { position: "present", cardId: b[0], orientation: b[1] }, { position: "future", cardId: c[0], orientation: c[1] }] });
  const combos = [];
  for (const o1 of ["upright", "reversed"]) for (const o2 of ["upright", "reversed"]) for (const o3 of ["upright", "reversed"]) {
    combos.push(text.buildTarotView(mk([1, o1], [7, o2], [17, o3])).message.slice(0, 2).join("|"));
  }
  assert.equal(new Set(combos).size, 8);
  // 悪魔の正位置（試練）が未来に来たとき、明るい未来として書かない
  const devil = text.buildTarotView(mk([19, "upright"], [21, "upright"], [15, "upright"]));
  assert.match(devil.message[1], /課題/);
  assert.doesNotMatch(devil.message[1], /待っています|開けていきます/);
});

test("逆位置を「悪い結果」と断定しない", () => {
  const rev = { theme: "love", date: DATE, cards: [
    { position: "past", cardId: 2, orientation: "reversed" }, { position: "present", cardId: 9, orientation: "reversed" }, { position: "future", cardId: 21, orientation: "reversed" }] };
  const v = text.buildTarotView(rev);
  const all = JSON.stringify(v);
  assert.match(v.message[2], /悪い結果という意味ではなく/);
  assert.match(v.cautions[1], /結果が悪いという意味ではありません/);
  assert.doesNotMatch(all, /最悪|不幸|凶/);
});

test("質問文：なし→null、あり→そのまま（HTMLは文字として扱う前提で加工しない）、保存データには入らない", () => {
  const r = t.drawTarot({ theme: "work", date: DATE, random: seeded(8) });
  assert.equal(text.buildTarotView(r).question, null);
  assert.equal(text.buildTarotView(r, { question: "   " }).question, null);
  const tag = '<img src=x onerror="alert(1)">';
  assert.equal(text.buildTarotView(r, { question: tag }).question, tag);
});

test("鑑定文に undefined が混ざらない（全カード×全テーマ×正逆×全位置）", () => {
  const rnd = seeded(2024);
  for (const theme of THEMES) {
    for (let i = 0; i < 300; i++) {
      const v = text.buildTarotView(t.drawTarot({ theme, date: DATE, random: rnd }), { question: "q" });
      const s = JSON.stringify(v);
      assert.ok(!s.includes("undefined") && !s.includes("null,\"text\""), s.slice(0, 200));
      assert.equal(v.cards.length, 3);
      assert.equal(v.message.length, 4);
      assert.equal(v.cautions.length, 3);
    }
  }
});
