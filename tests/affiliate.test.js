"use strict";
// アフィリエイト（紹介）枠：tools/affiliate/inject.mjs
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const ROOT = path.join(__dirname, "..");
const load = () => import(path.join(ROOT, "tools/affiliate/inject.mjs"));

const PROGRAMS = [
  { name: "電話占いA", url: "https://px.a8.net/svt/ejp?a8mat=TEST", pixel: "https://www10.a8.net/0.gif?a8mat=TEST", lead: "初回の特典あり", themes: ["love", "general"] },
  { name: "チャット占いB", url: "https://example.com/b", themes: ["general"] }
];
const PAGE = "<html><body><main id=\"main\">\n  <p>結果</p>\n</main>\n<footer></footer></body></html>";

test("ページの種類：恋愛・相性は love、運営・本格占いには出さない", async () => {
  const { themeOf } = await load();
  assert.equal(themeOf("aisho/index.html"), "love");
  assert.equal(themeOf("kyusei/aisho/index.html"), "love");
  assert.equal(themeOf("yume/koibito/index.html"), "love");
  assert.equal(themeOf("tesou/renai/index.html"), "love");
  assert.equal(themeOf("yume/hebi/index.html"), "general");
  assert.equal(themeOf("index.html"), "general");
  for (const r of ["about/index.html", "privacy/index.html", "contact/index.html", "tokushoho/index.html", "premium/index.html", "premium/kantei/index.html"]) assert.equal(themeOf(r), null, r);
});

test("枠：PR表示・nofollow sponsored・テーマで絞り込み・何度実行しても同じ", async () => {
  const { apply } = await load();
  const love = apply(PAGE, "kyusei/aisho/index.html", PROGRAMS);
  assert.ok(love.includes('<p class="aff-pr">PR</p>'));
  assert.ok(love.includes('rel="nofollow sponsored noopener"'));
  assert.ok(love.includes("電話占いA") && !love.includes("チャット占いB"));
  assert.ok(love.includes('href="../../privacy/#affiliate"'));
  assert.ok(love.indexOf("<!--aff-->") < love.indexOf("</main>"));
  assert.equal(apply(love, "kyusei/aisho/index.html", PROGRAMS), love, "2回目で変わらない");
  assert.equal(apply(love, "kyusei/aisho/index.html", []), PAGE, "案件がなくなれば枠も消える");
  const gen = apply(PAGE, "index.html", PROGRAMS);
  assert.ok(gen.includes("チャット占いB") && gen.includes('href="privacy/#affiliate"'));
  assert.equal(apply(PAGE, "premium/index.html", PROGRAMS), PAGE);
  const evil = apply(PAGE, "index.html", [{ name: "<script>x</script>", url: "https://e.com/?a=1&b=\"2\"" }]);
  assert.ok(!evil.includes("<script>x") && evil.includes("&amp;b=&quot;2&quot;"));
});

test("今のサイト：案件の設定と枠の状態が一致し、プライバシーポリシーに説明がある", async () => {
  const { loadPrograms } = await load();
  const n = loadPrograms(ROOT).length;
  const top = fs.readFileSync(path.join(ROOT, "index.html"), "utf8");
  assert.equal(top.includes("<!--aff-->"), n > 0);
  for (const p of loadPrograms(ROOT)) assert.match(p.url, /^https:\/\//);
  const privacy = fs.readFileSync(path.join(ROOT, "privacy/index.html"), "utf8");
  assert.ok(privacy.includes('id="affiliate"') && privacy.includes("PR"));
});
