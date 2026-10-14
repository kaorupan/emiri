"use strict";
// 運営者情報・プライバシーポリシー・お問い合わせ・特商法
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const ROOT = path.join(__dirname, "..");

test("4つのページがあり、全ページのフッターからリンクされている", () => {
  for (const s of ["about", "privacy", "contact", "tokushoho"]) assert.ok(fs.existsSync(path.join(ROOT, s, "index.html")), s);
  const p = fs.readFileSync(path.join(ROOT, "privacy/index.html"), "utf8");
  for (const w of ["Google アドセンス", "Cookie", "adssettings.google.com", "サーバーには送信しません"]) assert.ok(p.includes(w), w);
  const t = fs.readFileSync(path.join(ROOT, "tokushoho/index.html"), "utf8");
  for (const w of ["1,980円（税込）", "980円（税込）", "遅滞なく開示", "返品・キャンセル"]) assert.ok(t.includes(w), w);
  const walk = (d) => fs.readdirSync(d, { withFileTypes: true }).flatMap((e) => e.isDirectory() ? (["tests", "tools", "node_modules", ".git"].includes(e.name) ? [] : walk(path.join(d, e.name))) : e.name.endsWith(".html") ? [path.join(d, e.name)] : []);
  for (const f of walk(ROOT)) {
    const foot = (fs.readFileSync(f, "utf8").match(/<footer class="site-footer">[\s\S]*?<\/footer>/) || [""])[0];
    for (const s of ["about/", "privacy/", "contact/", "tokushoho/"]) assert.ok(foot.includes(s + '"'), `${path.relative(ROOT, f)} ${s}`);
  }
});
