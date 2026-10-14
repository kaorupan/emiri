"use strict";
// 星のわんにゃん占い
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const W = require("../assets/js/engines/wannyan.js");
const S = require("../assets/js/engines/seiju.js");
const ROOT = path.join(__dirname, "..");

test("96タイプ：犬48・猫48、名前と文章がそろい、重なりがない", () => {
  assert.equal(W.TYPES.length, 96);
  assert.equal(W.TYPES.filter((t) => t.kind === "dog").length, 48);
  assert.equal(new Set(W.TYPES.map((t) => t.slug)).size, 96);
  assert.equal(new Set(W.TYPES.map((t) => t.breed)).size, 96);
  for (const t of W.TYPES) {
    assert.match(t.slug, /^[a-z-]+$/);
    assert.ok(t.persona.length >= 60, `${t.slug}.persona`);
    // 恋愛・仕事は、タイプの一文に「時期」「月の形」の文が加わって表示される
    for (const k of ["love", "work"]) assert.ok(t[k].length >= 20 && t.period[k] && t.moon[k], `${t.slug}.${k}`);
    for (const k of ["motto", "strength", "weakness"]) assert.ok(t[k].length >= 8, `${t.slug}.${k}`);
    // 星獣の季節・月のリズムと、時期・月の形が食い違わない
    assert.equal(S.BEAST_GRID[t.period.season][t.moon.rhythm], t.beastId, t.slug);
    // 月の形の前半2つ＝犬、後半2つ＝猫
    assert.equal(t.kind, t.moon.n % 4 < 2 ? "dog" : "cat", t.slug);
  }
});

test("判定：星獣カルテの判定と必ず一致し、96タイプすべてに当たる生年月日がある", () => {
  const hit = new Set();
  for (let y = 1960; y <= 2005; y++) for (let m = 1; m <= 12; m++) for (let d = 1; d <= 28; d += 2) {
    const r = W.calculateWannyan({ year: y, month: m, day: d });
    assert.equal(r.type.beastId, S.calculateSeiju({ year: y, month: m, day: d }).beast, `${y}-${m}-${d}`);
    hit.add(r.type.slug);
  }
  assert.equal(hit.size, 96);
});

test("元素：日干の五行（2000年1月1日は戊＝土）", () => {
  const r = W.calculateWannyan({ year: 2000, month: 1, day: 1 });
  assert.deepEqual(r.element, { stem: "戊", name: "土" });
});

test("ページ：TOPと96ページ、リンク切れなし、TOPからリンク", () => {
  const idx = fs.readFileSync(path.join(ROOT, "wannyan/index.html"), "utf8");
  assert.ok(idx.includes('id="wannyan-form"') && idx.includes("engines/wannyan.js"));
  for (const t of W.TYPES) {
    assert.ok(idx.includes(`href="${t.slug}/"`), t.slug);
    const html = fs.readFileSync(path.join(ROOT, "wannyan", t.slug, "index.html"), "utf8");
    assert.ok(html.includes(`<h1>${t.name}タイプ</h1>`));
    for (const [, r] of html.matchAll(/href="\.\.\/([a-z-]+)\/"/g)) assert.ok(fs.existsSync(path.join(ROOT, "wannyan", r, "index.html")) || fs.existsSync(path.join(ROOT, r, "index.html")), `${t.slug} → ${r}`);
  }
  assert.ok(fs.readFileSync(path.join(ROOT, "index.html"), "utf8").includes('href="wannyan/"'));
});

const aisho = require("../assets/js/content/wannyan-aisho.js");
const seijuTypes = require("../assets/js/content/seiju-types.js");
test("わんにゃん相性：組み合わせごとに読み解きがそろう", () => {
  const W = require("../assets/js/engines/wannyan.js");
  const pairs = [["1991", "8", "20", "1983", "9", "6"], ["2000", "1", "1", "2000", "1", "1"], ["1985", "3", "10", "1990", "12", "25"], ["1970", "6", "1", "2010", "11", "30"]];
  for (const [y1, m1, d1, y2, m2, d2] of pairs) {
    const r1 = W.calculateWannyan({ year: y1, month: m1, day: d1 });
    const r2 = W.calculateWannyan({ year: y2, month: m2, day: d2 });
    const a = aisho.build(r1, r2, seijuTypes.PERIODS);
    for (const k of ["kind", "moon", "period", "element"]) {
      assert.ok(a[k] && a[k].label && a[k].text && a[k].text.length >= 30, k);
      assert.ok(!/undefined|NaN/.test(a[k].text), k + " text");
    }
  }
  const same = W.calculateWannyan({ year: 2000, month: 1, day: 1 });
  assert.equal(aisho.build(same, same, seijuTypes.PERIODS).notes.length, 1);
  for (let s = 0; s <= 6; s++) assert.ok(aisho.moonRelation({ n: 0 }, { n: s }));
});
test("わんにゃん相性ページがある", () => {
  const html = require("node:fs").readFileSync(require("node:path").join(__dirname, "../wannyan/aisho/index.html"), "utf8");
  assert.match(html, /id="wannyan-aisho-form"/);
  assert.match(html, /wannyan-aisho-page\.js/);
});
