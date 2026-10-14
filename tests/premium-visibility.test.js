"use strict";
// 本格占いの導線の表示／非表示（tools/premium/visibility.mjs）
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const ROOT = path.join(__dirname, "..");
const load = () => import(path.join(ROOT, "tools/premium/visibility.mjs"));

const PAGE = `<head>
<meta name="viewport" content="width=device-width">
</head><body>
<nav class="mode-switch" aria-label="x"><a href="premium/">本格占い</a></nav>
<ul><li><a href="../../premium/">本格占い</a></li><li><a href="../../learn/">占いを知る</a></li></ul>
<section class="card premium-upsell" aria-labelledby="t"><h2 id="t">もっと</h2><p><a href="../../premium/">本格占いを見る</a> -- x</p></section>
<section class="card"><p>ふつう</p></section>
</body>`;

test("隠す→戻すで完全に元どおり。何度実行しても同じ", async () => {
  const { apply } = await load();
  const hidden = apply(PAGE, "kyusei/aisho/index.html", false);
  assert.ok(!/href="[^"]*premium\//.test(hidden), "本格占いへのリンクが残らない");
  assert.ok(hidden.includes("占いを知る") && hidden.includes("ふつう"));
  assert.equal(apply(hidden, "kyusei/aisho/index.html", false), hidden);
  assert.equal(apply(hidden, "kyusei/aisho/index.html", true), PAGE);
  const p = apply(PAGE, "premium/index.html", false);
  assert.ok(p.includes('<meta name="robots" content="noindex">'));
  assert.equal(apply(p, "premium/index.html", true), PAGE);
});

test("今のサイトの状態が設定と一致している", async () => {
  const { isVisible } = await load();
  const visible = isVisible(ROOT);
  const walk = (d) => fs.readdirSync(d, { withFileTypes: true }).flatMap((e) => e.isDirectory() ? (["tests", "tools", "node_modules", ".git", "worker", "assets"].includes(e.name) ? [] : walk(path.join(d, e.name))) : e.name.endsWith(".html") ? [path.join(d, e.name)] : []);
  const sitemap = fs.readFileSync(path.join(ROOT, "sitemap.xml"), "utf8");
  for (const f of walk(ROOT)) {
    const rel = path.relative(ROOT, f).split(path.sep).join("/");
    const html = fs.readFileSync(f, "utf8");
    if (!visible) {
      assert.ok(!/href="(\.\.\/)*premium\/"/.test(html) || rel.startsWith("premium/") && !/<li><a href="(\.\.\/)*premium\/"/.test(html), rel);
    } else {
      assert.ok(!html.includes("premium-hidden"), rel);
    }
  }
  assert.equal(sitemap.includes("/premium/"), visible);
});
