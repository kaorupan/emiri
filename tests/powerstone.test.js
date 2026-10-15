// パワーストーン：assets/js/content/stones.js と生成したページ
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const S = require("../assets/js/content/stones.js");
const ROOT = path.join(__dirname, "..");

test("データ：参照先（相性の石・願い・誕生石・ライフパス）がすべて実在する", () => {
  assert.equal(new Set(S.STONES.map((s) => s.slug)).size, S.STONES.length);
  const wishes = new Set(S.WISHES.map((w) => w.id)), colors = new Set(S.COLORS.map((c) => c.id));
  for (const s of S.STONES) {
    assert.ok(colors.has(s.color), s.slug);
    for (const w of s.wishes) assert.ok(wishes.has(w), `${s.slug} ${w}`);
    for (const p of s.pair) assert.ok(S.bySlug[p] && p !== s.slug, `${s.slug} ${p}`);
    assert.ok(s.meaning.length >= 40 && s.story.length >= 20, s.slug);
    if (s.month) assert.ok(S.BIRTHSTONES[s.month].includes(s.slug), `${s.slug} の誕生月`);
  }
  for (const m of Object.keys(S.BIRTHSTONES)) for (const v of S.BIRTHSTONES[m]) if (/^[a-z]+$/.test(v)) assert.ok(S.bySlug[v], v);
  for (const n of [1, 2, 3, 4, 5, 6, 7, 8, 9, 11, 22, 33]) assert.ok(S.bySlug[S.LIFEPATH[n][0]], String(n));
  for (const el of ["木", "火", "土", "金", "水"]) assert.ok(S.STONES.some((s) => S.ELEMENT_COLORS[el].includes(s.color)), el);
});

test("言い切らない：効果を断定する表現を使わない", () => {
  const all = JSON.stringify(S.STONES);
  for (const w of ["必ず", "絶対", "治る", "治す", "確実に"]) assert.ok(!all.includes(w), w);
});

test("ページ：トップ・石30・願い6があり、トップからリンクしている", () => {
  const top = fs.readFileSync(path.join(ROOT, "powerstone/index.html"), "utf8");
  assert.match(top, /id="powerstone-form"/);
  for (const s of S.STONES) { assert.ok(fs.existsSync(path.join(ROOT, "powerstone", s.slug, "index.html")), s.slug); assert.ok(top.includes(`href="${s.slug}/"`), s.slug); }
  for (const w of S.WISHES) { assert.ok(fs.existsSync(path.join(ROOT, "powerstone", w.id, "index.html")), w.id); assert.ok(top.includes(`href="${w.id}/"`), w.id); }
});
