"use strict";
// LINE で受け取る無料の総合鑑定書：リンクの作り方と、ページ
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const link = require("../assets/js/core/kantei-link.js");
const kantei = require("../assets/js/content/kantei-text.js");
const ROOT = path.join(__dirname, "..");

test("入力 → リンク → 入力 に戻る（日本語の名前・お相手・時刻）", () => {
  const d = link.encode({ p: { name: "あかり", sei: "星川", mei: "あかり", year: 1990, month: 1, day: 1, time: "10:30" }, q: { name: "ミライ", year: 1992, month: 5, day: 15 }, m: [2026, 10, 14] });
  assert.match(d, /^[A-Za-z0-9_-]+$/, "URLにそのまま入れられる文字だけ");
  const r = link.decode(d);
  assert.deepEqual(r.p, { name: "あかり", year: 1990, month: 1, day: 1, sei: "星川", mei: "あかり", time: "10:30" });
  assert.equal(r.q.name, "ミライ");
  assert.deepEqual(r.made, { year: 2026, month: 10, day: 14 });
  const report = kantei.buildKantei(r.p, r.made, r.q);
  assert.ok(report.chapters.some((c) => c.id === "aisho") && report.chapters.some((c) => c.id === "seimei"));
});

test("壊れたリンク・ありえない日付・名前なしは受け付けない", () => {
  assert.equal(link.decode("abc"), null);
  assert.equal(link.decode(""), null);
  assert.throws(() => link.encode({ p: { name: "", year: 1990, month: 1, day: 1 }, m: [2026, 1, 1] }));
  assert.throws(() => link.encode({ p: { name: "a", year: 1990, month: 2, day: 30 }, m: [2026, 1, 1] }));
  const d = link.encode({ p: { name: "<b>x</b>", year: 1990, month: 1, day: 1, time: "99:99" }, m: [2026, 1, 1] });
  const r = link.decode(d);
  assert.equal(r.p.name, "bx/b");
  assert.equal(r.p.time, undefined);
});

test("ページ：検索に出さない・サイトマップに入れない・LIFF未設定なら準備中", () => {
  const config = JSON.parse(fs.readFileSync(path.join(ROOT, "site.config.json"), "utf8"));
  const form = fs.readFileSync(path.join(ROOT, "line/index.html"), "utf8");
  const view = fs.readFileSync(path.join(ROOT, "line/kantei/index.html"), "utf8");
  const sitemap = fs.readFileSync(path.join(ROOT, "sitemap.xml"), "utf8");
  for (const h of [form, view]) assert.ok(h.includes('<meta name="robots" content="noindex">'));
  assert.ok(!sitemap.includes("/line/"));
  assert.ok(form.includes("core/kantei-link.js") && view.includes("core/kantei-link.js") && view.includes("content/kantei-text.js"));
  if (config.liffId) assert.ok(form.includes(`data-liff="${config.liffId}"`) && form.includes("static.line-scdn.net/liff/edge/2/sdk.js") && !form.includes("data-closed"));
  else assert.ok(form.includes("data-closed") && !form.includes("liff/edge"));
  const privacy = fs.readFileSync(path.join(ROOT, "privacy/index.html"), "utf8");
  assert.ok(privacy.includes('id="line"') && privacy.includes("保存したり"));
});

test("LINEの案内：TOPは紹介の下・ほかは本文の最後（紹介枠の上）、運営・本格占い・LINEのページには出さない、何度でも同じ", async () => {
  const { apply } = await import(path.join(ROOT, "tools/line/cta.mjs"));
  const page = "<main>\n  <p>x</p>\n<!--aff-->\n  <aside>PR</aside>\n<!--/aff-->\n</main>";
  const a = apply(page, "yume/hebi/index.html", "2012021804-poeicnay");
  assert.ok(a.indexOf("<!--line-cta-->") < a.indexOf("<!--aff-->"));
  assert.ok(a.includes('href="https://liff.line.me/2012021804-poeicnay"') && a.includes('src="../../assets/img/line-qr.svg"'));
  assert.equal(apply(a, "yume/hebi/index.html", "2012021804-poeicnay"), a);
  assert.equal(apply(a, "yume/hebi/index.html", ""), page);
  for (const r of ["about/index.html", "privacy/index.html", "premium/index.html", "line/index.html", "tokushoho/index.html"]) assert.equal(apply(page, r, "2012021804-poeicnay"), page, r);
  const top = '<main>\n  <section class="hero">h</section>\n\n  <section>s</section>\n</main>';
  const t = apply(top, "index.html", "2012021804-poeicnay");
  assert.ok(t.indexOf("line-cta") > t.indexOf("hero") && t.indexOf("line-cta") < t.indexOf("<section>s"));
  assert.equal(apply(t, "index.html", ""), top);
  // 今のサイトの状態が設定と一致
  const config = JSON.parse(fs.readFileSync(path.join(ROOT, "site.config.json"), "utf8"));
  const real = fs.readFileSync(path.join(ROOT, "index.html"), "utf8");
  assert.equal(real.includes("<!--line-cta-->"), Boolean(config.liffId));
  assert.ok(fs.existsSync(path.join(ROOT, "assets/img/line-qr.svg")));
});
