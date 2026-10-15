// 風水（八宅風水の本命卦）：assets/js/engines/fusui.js と生成したページ
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const F = require("../assets/js/engines/fusui.js");
const T = require("../assets/js/content/fusui-text.js");
const ROOT = path.join(__dirname, "..");

test("本命卦：よく知られた生まれ年（男性・女性）", () => {
  const cases = [[1990, "m", "坎"], [1990, "f", "艮"], [1991, "m", "離"], [1991, "f", "乾"], [1986, "m", "坤"], [1986, "f", "坎"], [2000, "m", "離"], [2000, "f", "乾"], [1977, "m", "坤"], [1977, "f", "坎"]];
  for (const [y, s, name] of cases) assert.equal(F.calculateHonmeika({ year: y, month: 6, day: 1 }, s).gua.name, name, `${y} ${s}`);
});

test("本命卦：立春より前の生まれは前の年として数える", () => {
  assert.equal(F.calculateHonmeika({ year: 1991, month: 1, day: 20 }, "m").gua.name, "坎"); // 1990年として
  assert.equal(F.calculateHonmeika({ year: 1991, month: 2, day: 10 }, "m").gua.name, "離");
});

test("方位の表：8方位がそろい、東四命・西四命の吉方位と、卦どうしの対応が正しい", () => {
  const EAST = new Set(["n", "e", "se", "s"]), WEST = new Set(["sw", "nw", "w", "ne"]);
  for (const n of F.ORDER) {
    const t = F.TABLE[n];
    assert.equal(new Set(t).size, 8, String(n));
    const good = new Set(t.slice(0, 4));
    assert.deepEqual(good, F.GUA[n].group === "east" ? EAST : WEST, String(n));
    assert.equal(t[3], F.GUA[n].home, `${n} の伏位は自分の方位`);
  }
  // 吉凶の関係はお互いさま（Aから見てBの方位が延年なら、Bから見てAの方位も延年）
  const numAt = (dir) => F.ORDER.find((n) => F.GUA[n].home === dir);
  for (const a of F.ORDER) F.TABLE[a].forEach((dir, i) => {
    if (i === 3) return;
    const b = numAt(dir);
    assert.equal(F.TABLE[b][i], F.GUA[a].home, `${a}→${b} ${F.STARS[i].name}`);
  });
});

test("文章：8つの卦と8つの吉凶すべてにある", () => {
  for (const n of F.ORDER) for (const k of ["nature", "personality", "love", "work"]) assert.ok(T.GUA[n][k].length >= 40, `${n} ${k}`);
  for (const s of F.STARS) assert.ok(T.STAR[s.key] && T.STAR[s.key].use, s.key);
});

test("ページ：トップ・8つの卦・6つの部屋があり、トップからリンクしている", () => {
  const top = fs.readFileSync(path.join(ROOT, "fusui/index.html"), "utf8");
  assert.match(top, /id="fusui-form"/);
  for (const n of F.ORDER) {
    const slug = F.GUA[n].slug;
    assert.ok(fs.existsSync(path.join(ROOT, "fusui", slug, "index.html")), slug);
    assert.ok(top.includes(`href="${slug}/"`), slug);
  }
  for (const r of ["genkan", "living", "shinshitsu", "kitchen", "toilet", "desk"]) assert.ok(top.includes(`href="${r}/"`), r);
  assert.ok(fs.readFileSync(path.join(ROOT, "index.html"), "utf8").includes('href="fusui/"'));
});
