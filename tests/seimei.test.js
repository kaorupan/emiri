"use strict";
// 姓名判断
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const ROOT = path.join(__dirname, "..");
const E = require("../assets/js/engines/seimei.js");
const S = require("../assets/js/content/seimei-strokes.js");
const N = require("../assets/js/content/seimei-numbers.js");
const T = require("../assets/js/content/seimei-text.js");

test("画数表：日本の字形で数える（中国の字形と違う字・互換漢字・サロゲートペア）", () => {
  const want = { 骨: 10, 海: 9, 陽: 12, 郎: 9, 都: 11, 以: 5, 印: 6, 延: 8, 建: 9, 器: 15, 臭: 9, 鬼: 10, 象: 12, 免: 8, 芽: 8,
    中: 4, 道: 12, 渡: 12, 邊: 19, 邉: 17, 辺: 5, 齋: 17, 斎: 11, 藤: 18, 髙: 11, 高: 10, 﨑: 12, 崎: 11, "𠮷": 6, 吉: 6,
    澤: 16, 沢: 7, 濱: 17, 浜: 10, 翔: 12, 優: 17, 愛: 13, 鈴: 13, 木: 4, 一: 1, 子: 3, 花: 7, 佐: 7, 田: 5, 山: 3 };
  for (const [ch, n] of Object.entries(want)) assert.equal(S.strokesOf(ch), n, ch);
  assert.equal(S.strokesOf("神"), 10, "互換漢字の神（示）");
  assert.equal(S.strokesOf("神"), 9);
  assert.equal(S.strokesOf("a"), null);
  assert.ok(S.count > 13000);
});

test("かな：清音・濁点＋2・半濁点＋1・小字・長音", () => {
  const strokes = (s) => E.charStrokes(s).map((x) => x.strokes);
  assert.deepEqual(strokes("あいうえお"), [3, 2, 2, 2, 3]);
  assert.deepEqual(strokes("かきくけこ"), [3, 4, 1, 3, 2]);
  assert.deepEqual(strokes("なにぬねの"), [4, 3, 2, 2, 1]);
  assert.deepEqual(strokes("はひふへほ"), [3, 1, 4, 1, 4]);
  assert.deepEqual(strokes("がぱ"), [5, 4]);
  assert.deepEqual(strokes("ゃっ"), [3, 1]);
  assert.deepEqual(strokes("アイウエオ"), [2, 2, 3, 3, 3]);
  assert.deepEqual(strokes("ネホノー"), [4, 4, 1, 1]);
  assert.deepEqual(strokes("ヴ"), [5]);
  const hira = "あいうえおかきくけこさしすせそたちつてとなにぬねのはひふへほまみむめもやゆよらりるれろわをん";
  const kata = "アイウエオカキクケコサシスセソタチツテトナニヌネノハヒフヘホマミムメモヤユヨラリルレロワヲン";
  for (const c of hira + kata) assert.ok(E.KANA[c] >= 1 && E.KANA[c] <= 4, c);
});

test("々などの繰り返し記号は直前の字と同じ画数", () => {
  const r = E.charStrokes("佐々木");
  assert.deepEqual(r.map((x) => x.strokes), [7, 7, 4]);
  assert.equal(r[1].kind, "repeat");
  assert.deepEqual(E.charStrokes("すゞ").map((x) => x.strokes), [2, 4]);
});

test("五格：一般的な例と霊数", () => {
  const r = E.calculateSeimei({ sei: "山田", mei: "花子" });
  assert.deepEqual([r.ten.value, r.jin.value, r.chi.value, r.gai.value, r.sou.value], [8, 12, 10, 6, 18]);
  const one = E.calculateSeimei({ sei: "林", mei: "学" }); // 1字姓・1字名：霊数を天格・地格・外格に
  assert.deepEqual([one.ten.value, one.jin.value, one.chi.value, one.gai.value, one.sou.value], [9, 16, 9, 2, 16]);
  assert.ok(one.ten.rei && one.chi.rei && one.gai.rei && !one.sou.rei);
  const three = E.calculateSeimei({ sei: "佐々木", mei: "由美子" });
  // 佐7 々7 木4 / 由5 美9 子3
  assert.deepEqual([three.ten.value, three.jin.value, three.chi.value, three.gai.value, three.sou.value], [18, 9, 17, 26, 35]);
  const sp = E.calculateSeimei({ sei: " 𠮷田 ", mei: "　優" }); // 空白は無視、𠮷は1字
  assert.equal(sp.ok, true);
  assert.equal(sp.sei.length, 2);
  assert.deepEqual([sp.ten.value, sp.jin.value, sp.chi.value, sp.sou.value], [11, 22, 18, 28]);
});

test("入力エラー：空欄・長すぎ・画数のわからない字", () => {
  assert.deepEqual(E.calculateSeimei({ sei: "", mei: "花子" }).errors[0], { field: "sei", code: "empty" });
  assert.equal(E.calculateSeimei({ sei: "山田", mei: "あいうえおかきくけ" }).errors[0].code, "long");
  const u = E.calculateSeimei({ sei: "山田", mei: "Ann" });
  assert.equal(u.ok, false);
  assert.deepEqual(u.unknown, ["A", "n", "n"]);
});

test("81数：吉凶表がエンジンと文章で一致し、82以上は80を引く", () => {
  for (let n = 1; n <= 81; n++) {
    const e = N.number(n);
    assert.equal(e.n, n);
    assert.equal(E.luckOf(n), e.luck, String(n));
    assert.ok(e.keyword && e.text.length > 50 && e.love && e.work && e.advice, String(n));
  }
  assert.equal(N.number(82).n, 2);
  assert.equal(N.number(161).n, 81);
  assert.equal(N.number(162).n, 2);
  assert.equal(E.wrap(85), 5);
  assert.deepEqual([1, 3, 5, 6, 11, 13, 15, 16, 21, 23, 24, 31, 32, 33, 39, 41, 45, 47, 81].every((n) => N.number(n).luck === "大吉"), true);
});

test("三才配置と五行", () => {
  assert.deepEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(E.elementOf).join(""), "木木火火土土金金水水");
  assert.equal(E.relation("木", "火").dir, "give");
  assert.equal(E.relation("火", "木").dir, "receive");
  assert.equal(E.relation("木", "土").dir, "press");
  assert.equal(E.relation("土", "木").dir, "pressed");
  assert.equal(E.relation("金", "金").type, "比和");
  const r = E.calculateSeimei({ sei: "山田", mei: "花子" }); // 天8金 人12木 地10水
  assert.deepEqual([r.sansai.ten, r.sansai.jin, r.sansai.chi], ["金", "木", "水"]);
  assert.equal(r.sansai.tenJin.type, "相剋");
  assert.equal(r.sansai.jinChi.type, "相生");
  assert.equal(r.sansai.level, "mixed");
});

test("鑑定文と相性の組み立て", () => {
  const a = E.calculateSeimei({ sei: "山田", mei: "花子" });
  const b = E.calculateSeimei({ sei: "鈴木", mei: "一郎" });
  const v = T.buildSeimeiView(a);
  assert.equal(v.kakus.length, 5);
  assert.equal(v.kakus[0].key, "jin");
  assert.ok(v.score >= 0 && v.score <= 100);
  assert.ok(!/undefined|NaN/.test(JSON.stringify(v)));
  const c = T.buildSeimeiCompatibilityView(E.calculateSeimeiCompatibility(a, b));
  assert.ok(c.score >= 0 && c.score <= 100);
  assert.ok(c.jin.text && c.sou.text);
  assert.ok(!/undefined|NaN/.test(JSON.stringify(c)));
  const one = T.buildSeimeiView(E.calculateSeimei({ sei: "林", mei: "学" }));
  assert.equal(one.rei.length, 2);
});

test("画数の意味ページ：81ページと一覧がそろい、リンクが切れていない", () => {
  const idx = fs.readFileSync(path.join(ROOT, "seimei/kakusu/index.html"), "utf8");
  const titles = new Set();
  for (let n = 1; n <= 81; n++) {
    const d = n < 10 ? "0" + n : String(n);
    assert.ok(idx.includes(`href="${d}/"`), d);
    const html = fs.readFileSync(path.join(ROOT, "seimei/kakusu", d, "index.html"), "utf8");
    assert.ok(!/undefined|NaN/.test(html), d);
    assert.ok(html.includes(`<h1>姓名判断 ${n}画の意味</h1>`), d);
    assert.ok(html.includes(`https://emiri-uranai.com/seimei/kakusu/${d}/`), d);
    titles.add(html.match(/<title>(.*?)<\/title>/)[1]);
    for (const [, r] of html.matchAll(/href="\.\.\/(\d\d)\/"/g)) assert.ok(Number(r) >= 1 && Number(r) <= 81, `${d} → ${r}`);
  }
  assert.equal(titles.size, 81);
  const top = fs.readFileSync(path.join(ROOT, "index.html"), "utf8");
  assert.ok(top.includes('href="seimei/"') && top.includes('href="seimei/aisho/"'));
  assert.ok(fs.readFileSync(path.join(ROOT, "aisho/index.html"), "utf8").includes("../seimei/aisho/"));
});
