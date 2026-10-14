"use strict";
// 本格占いの販売：支払い確認API（worker/）と、注文ページ・鑑定書ページ
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const ROOT = path.join(__dirname, "..");
const load = () => import(path.join(ROOT, "worker/src/index.js"));

const ENV = { STRIPE_SECRET_KEY: "sk_test_dummy", SITE_ORIGIN: "https://emiri-uranai.com", PRICE_JPY: "1980" };
const req = (method, url, body) => new Request(url, { method, headers: { "Content-Type": "application/json", Origin: "https://emiri-uranai.com" }, body: body ? JSON.stringify(body) : undefined });

function mockFetch(handler) {
  const calls = [];
  const orig = global.fetch;
  global.fetch = async (url, init) => { calls.push({ url, init }); return handler(url, init); };
  return { calls, restore: () => { global.fetch = orig; } };
}

test("入力の検査：呼び名と実在する生年月日が必須、時刻と姓名は任意", async () => {
  const { normalizePerson, normalizeOrder } = await load();
  assert.deepEqual(normalizePerson({ name: "あかり", year: 1990, month: 1, day: 1 }, { requireName: true }), { year: 1990, month: 1, day: 1, name: "あかり" });
  assert.equal(normalizePerson({ name: "あかり", year: 1990, month: 2, day: 30 }, { requireName: true }), null);
  assert.equal(normalizePerson({ year: 1990, month: 1, day: 1 }, { requireName: true }), null);
  assert.equal(normalizePerson({ name: "a", year: 1990, month: 1, day: 1, time: "25:00" }), null);
  const p = normalizePerson({ name: " <b>あかり</b> ", sei: "星川", mei: "", year: "1990", month: "1", day: "1", time: "10:30" });
  assert.equal(p.name, "bあかり/b");
  assert.equal(p.sei, undefined, "姓だけでは姓名判断に使わない");
  assert.equal(p.time, "10:30");
  assert.ok(normalizeOrder({ person: { name: "a", year: 1990, month: 1, day: 1 } }).error, "同意がないと受け付けない");
  assert.ok(normalizeOrder({ agree: true, person: { name: "a", year: 1990, month: 1, day: 1 }, partner: { year: 1990, month: 1, day: 1 } }).error);
  const ok = normalizeOrder({ agree: true, person: { name: "a", year: 1990, month: 1, day: 1 }, partner: { name: "b", year: 1992, month: 5, day: 15 } });
  assert.equal(ok.partner.name, "b");
});

test("Stripe へのフォーム形式（入れ子）", async () => {
  const { form } = await load();
  assert.equal(form({ a: 1, b: { 0: { c: "x y" } }, n: null }), "a=1&b%5B0%5D%5Bc%5D=x%20y");
});

test("checkout：1,980円の支払いページを作り、入力内容を注文情報に入れる", async () => {
  const worker = (await load()).default;
  const m = mockFetch(async () => new Response(JSON.stringify({ id: "cs_test_abc", url: "https://checkout.stripe.com/c/pay/cs_test_abc" }), { status: 200 }));
  try {
    const res = await worker.fetch(req("POST", "https://api.example/api/checkout", { agree: true, person: { name: "あかり", sei: "星川", mei: "あかり", year: 1990, month: 1, day: 1, time: "10:30" } }), ENV);
    assert.equal(res.status, 200);
    assert.equal((await res.json()).url, "https://checkout.stripe.com/c/pay/cs_test_abc");
    assert.equal(res.headers.get("Access-Control-Allow-Origin"), "https://emiri-uranai.com");
    const body = decodeURIComponent(m.calls[0].init.body);
    assert.match(m.calls[0].url, /\/v1\/checkout\/sessions$/);
    assert.equal(m.calls[0].init.headers.Authorization, "Bearer sk_test_dummy");
    assert.ok(body.includes("line_items[0][price_data][unit_amount]=1980"));
    assert.ok(body.includes("line_items[0][price_data][currency]=jpy"));
    assert.ok(body.includes("success_url=https://emiri-uranai.com/premium/kantei/?sid={CHECKOUT_SESSION_ID}"));
    assert.ok(body.includes('metadata[p]={"year":1990,"month":1,"day":1,"name":"あかり","sei":"星川","mei":"あかり","time":"10:30"}'));
    assert.ok(!body.includes("metadata[q]"));
  } finally { m.restore(); }
  const bad = await worker.fetch(req("POST", "https://api.example/api/checkout", { agree: true, person: { name: "", year: 1990, month: 1, day: 1 } }), ENV);
  assert.equal(bad.status, 400);
});

test("代理販売（Managed Payments）：有効化・税コード・税込、通常決済用の項目は付けない", async () => {
  const worker = (await load()).default;
  const m = mockFetch(async () => new Response(JSON.stringify({ url: "https://checkout.stripe.com/x" }), { status: 200 }));
  try {
    const env = { ...ENV, MANAGED_PAYMENTS: "true" };
    await worker.fetch(req("POST", "https://api.example/api/checkout", { agree: true, person: { name: "あかり", year: 1990, month: 1, day: 1 } }), env);
    let body = decodeURIComponent(m.calls[0].init.body);
    assert.equal(m.calls[0].init.headers["Stripe-Version"], "2025-03-31.basil");
    assert.ok(body.includes("managed_payments[enabled]=true"));
    assert.ok(body.includes("line_items[0][price_data][product_data][tax_code]=txcd_10503004"));
    assert.ok(body.includes("line_items[0][price_data][tax_behavior]=inclusive"));
    assert.ok(!body.includes("payment_intent_data") && !body.includes("customer_creation"));
    await worker.fetch(req("POST", "https://api.example/api/checkout", { agree: true, person: { name: "あかり", year: 1990, month: 1, day: 1 } }), { ...env, PRICE_ID: "price_123" });
    body = decodeURIComponent(m.calls[1].init.body);
    assert.ok(body.includes("line_items[0][price]=price_123") && !body.includes("price_data"));
  } finally { m.restore(); }
  const toml = fs.readFileSync(path.join(ROOT, "worker/wrangler.toml"), "utf8");
  assert.match(toml, /MANAGED_PAYMENTS = "true"/);
});

test("kantei：支払い済みのときだけ入力内容を返す。作成日は購入日（日本時間）", async () => {
  const worker = (await load()).default;
  const session = (status, kind = "kantei") => ({
    id: "cs_test_abcdefghij", payment_status: status, created: Date.UTC(2026, 9, 14, 16, 0) / 1000,
    metadata: { kind, p: JSON.stringify({ name: "あかり", year: 1990, month: 1, day: 1 }), q: JSON.stringify({ name: "ミライ", year: 1992, month: 5, day: 15 }) }
  });
  let current = session("paid");
  const m = mockFetch(async () => new Response(JSON.stringify(current), { status: 200 }));
  try {
    const ok = await worker.fetch(req("GET", "https://api.example/api/kantei?sid=cs_test_abcdefghij"), ENV);
    assert.equal(ok.status, 200);
    const d = await ok.json();
    assert.equal(d.person.name, "あかり");
    assert.equal(d.partner.name, "ミライ");
    assert.deepEqual(d.made, { year: 2026, month: 10, day: 15 }, "UTC 16時は日本時間の翌日");
    current = session("unpaid");
    assert.equal((await worker.fetch(req("GET", "https://api.example/api/kantei?sid=cs_test_abcdefghij"), ENV)).status, 402);
    current = session("paid", "other");
    assert.equal((await worker.fetch(req("GET", "https://api.example/api/kantei?sid=cs_test_abcdefghij"), ENV)).status, 404);
    assert.equal((await worker.fetch(req("GET", "https://api.example/api/kantei?sid=../../v1/customers"), ENV)).status, 400);
  } finally { m.restore(); }
});

test("注文ページと鑑定書ページ：販売前は申し込めない／鑑定書ページは検索に出さない", () => {
  const config = JSON.parse(fs.readFileSync(path.join(ROOT, "site.config.json"), "utf8"));
  const order = fs.readFileSync(path.join(ROOT, "premium/order/index.html"), "utf8");
  const kantei = fs.readFileSync(path.join(ROOT, "premium/kantei/index.html"), "utf8");
  const sitemap = fs.readFileSync(path.join(ROOT, "sitemap.xml"), "utf8");
  assert.ok(kantei.includes('<meta name="robots" content="noindex">'));
  assert.ok(!sitemap.includes("/premium/kantei/"));
  for (const s of ["engines/seimei.js", "content/kantei-text.js", "pages/kantei-page.js", "pages/kantei-view.js"]) assert.ok(kantei.includes(s), s);
  assert.ok(order.includes("tokushoho/") && order.includes("1,980円（税込）"));
  const premium = fs.readFileSync(path.join(ROOT, "premium/index.html"), "utf8");
  if (config.salesOpen === true && config.salesApiUrl) {
    assert.ok(!order.includes("data-closed"));
    assert.ok(premium.includes('href="order/"'));
  } else {
    assert.ok(order.includes("data-closed") && order.includes(" disabled"));
    assert.ok(!premium.includes('href="order/"'));
  }
  // 公開リポジトリにシークレットを書かない
  for (const f of ["worker/wrangler.toml", "worker/src/index.js", "site.config.json"]) {
    assert.ok(!/sk_(live|test)_[A-Za-z0-9]{8,}/.test(fs.readFileSync(path.join(ROOT, f), "utf8")), f);
  }
});
