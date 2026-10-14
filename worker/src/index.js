/*
 * えみり 本格占いの支払い確認API（Cloudflare Workers）
 *
 *   POST /api/checkout   入力内容を受け取り、Stripe Checkout の支払いページを作って URL を返す
 *   GET  /api/kantei?sid= 支払いが完了していれば、鑑定書の作成に使う入力内容を返す
 *
 * 鑑定書の文章はサイト側（ブラウザ）で作る。ここは「お金を払ったか」の確認と、入力内容の受け渡しだけ。
 * 入力内容は Stripe の注文情報（metadata）に保存する。当方のサーバーにはデータベースを置かない。
 *
 * 必要な設定（Cloudflare の管理画面 → Workers → emiri-api → 設定 → 変数とシークレット）
 *   STRIPE_SECRET_KEY  シークレット。Stripe の「シークレットキー」（sk_test_… / sk_live_…）。運営者本人が入力する
 *   SITE_ORIGIN        wrangler.toml の vars。https://emiri-uranai.com
 *   PRICE_JPY          wrangler.toml の vars。1980
 */

const PRODUCT_NAME = "えみり 本格占い 総合鑑定書";
const STRIPE = "https://api.stripe.com/v1";

const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;
const SID_RE = /^cs_(test|live)_[A-Za-z0-9]{10,200}$/;

function clean(s, max) {
  // 制御文字・山括弧を除き、前後の空白を落として長さを制限する
  return String(s == null ? "" : s).replace(/[\u0000-\u001f\u007f<>]/g, "").trim().slice(0, max);
}

// 1人分の入力を検査する。正しくなければ null
export function normalizePerson(p, { requireName } = {}) {
  if (!p || typeof p !== "object") return null;
  const year = Number(p.year), month = Number(p.month), day = Number(p.day);
  if (!Number.isInteger(year) || !Number.isInteger(month) || !Number.isInteger(day)) return null;
  if (year < 1900 || year > 2100 || month < 1 || month > 12 || day < 1 || day > 31) return null;
  const dt = new Date(Date.UTC(year, month - 1, day));
  if (dt.getUTCMonth() !== month - 1) return null;
  const out = { year, month, day };
  const name = clean(p.name, 20), sei = clean(p.sei, 10), mei = clean(p.mei, 10);
  if (requireName && !name) return null;
  if (name) out.name = name;
  if (sei && mei) { out.sei = sei; out.mei = mei; }
  const time = clean(p.time, 5);
  if (time) { if (!TIME_RE.test(time)) return null; out.time = time; }
  return out;
}

export function normalizeOrder(body) {
  if (!body || typeof body !== "object") return { error: "入力内容が読み取れません" };
  if (body.agree !== true) return { error: "特定商取引法に基づく表記と返品についての確認が必要です" };
  const person = normalizePerson(body.person, { requireName: true });
  if (!person) return { error: "お名前（呼び名）と生年月日を正しく入力してください" };
  let partner = null;
  if (body.partner) {
    partner = normalizePerson(body.partner, { requireName: true });
    if (!partner) return { error: "相性のお相手の呼び名と生年月日を正しく入力してください" };
  }
  return { person, partner };
}

// Stripe の API は application/x-www-form-urlencoded（入れ子は a[b][c]=…）
export function form(obj, prefix, out = []) {
  for (const [k, v] of Object.entries(obj)) {
    if (v == null) continue;
    const key = prefix ? `${prefix}[${k}]` : k;
    if (typeof v === "object") form(v, key, out);
    else out.push(encodeURIComponent(key) + "=" + encodeURIComponent(String(v)));
  }
  return out.join("&");
}

async function stripe(env, method, pathname, params) {
  const res = await fetch(STRIPE + pathname, {
    method,
    headers: {
      Authorization: "Bearer " + env.STRIPE_SECRET_KEY,
      "Content-Type": "application/x-www-form-urlencoded",
      "Stripe-Version": "2024-06-20"
    },
    body: params ? form(params) : undefined
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((data.error && data.error.message) || "Stripe error " + res.status);
  return data;
}

function cors(env, req) {
  const origin = req.headers.get("Origin") || "";
  const allowed = [env.SITE_ORIGIN, "http://localhost:8000", "http://127.0.0.1:8000"];
  return {
    "Access-Control-Allow-Origin": allowed.includes(origin) ? origin : env.SITE_ORIGIN,
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Vary": "Origin"
  };
}

function json(env, req, status, data) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store", ...cors(env, req) }
  });
}

export async function checkout(env, req) {
  let body;
  try { body = await req.json(); } catch (e) { return json(env, req, 400, { error: "入力内容が読み取れません" }); }
  const order = normalizeOrder(body);
  if (order.error) return json(env, req, 400, { error: order.error });
  const site = env.SITE_ORIGIN;
  const price = Number(env.PRICE_JPY || 1980);
  const metadata = { kind: "kantei", v: "1", p: JSON.stringify(order.person) };
  if (order.partner) metadata.q = JSON.stringify(order.partner);
  const session = await stripe(env, "POST", "/checkout/sessions", {
    mode: "payment",
    locale: "ja",
    success_url: site + "/premium/kantei/?sid={CHECKOUT_SESSION_ID}",
    cancel_url: site + "/premium/order/?canceled=1",
    line_items: { 0: { quantity: 1, price_data: { currency: "jpy", unit_amount: price, product_data: { name: PRODUCT_NAME } } } },
    metadata,
    payment_intent_data: { metadata, description: PRODUCT_NAME },
    customer_creation: "if_required",
    custom_text: { submit: { message: "お支払い後すぐに鑑定書のページが開きます。そのページのURLが、あとから読み返すための鍵になります。" } }
  });
  return json(env, req, 200, { url: session.url });
}

export async function kantei(env, req, url) {
  const sid = url.searchParams.get("sid") || "";
  if (!SID_RE.test(sid)) return json(env, req, 400, { error: "鑑定書の番号が正しくありません" });
  let s;
  try { s = await stripe(env, "GET", "/checkout/sessions/" + encodeURIComponent(sid)); }
  catch (e) { return json(env, req, 404, { error: "鑑定書が見つかりません" }); }
  if (!s.metadata || s.metadata.kind !== "kantei") return json(env, req, 404, { error: "鑑定書が見つかりません" });
  if (s.payment_status !== "paid") return json(env, req, 402, { error: "お支払いがまだ確認できません" });
  let person, partner = null;
  try { person = JSON.parse(s.metadata.p); if (s.metadata.q) partner = JSON.parse(s.metadata.q); }
  catch (e) { return json(env, req, 500, { error: "鑑定書の情報が読み取れません" }); }
  // 作成日は「購入した日」（日本時間）。いつ開いても同じ内容になる
  const d = new Date((s.created || 0) * 1000 + 9 * 3600 * 1000);
  const made = { year: d.getUTCFullYear(), month: d.getUTCMonth() + 1, day: d.getUTCDate() };
  return json(env, req, 200, { person, partner, made });
}

export default {
  async fetch(req, env) {
    const url = new URL(req.url);
    if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: cors(env, req) });
    try {
      if (url.pathname === "/api/checkout" && req.method === "POST") return await checkout(env, req);
      if (url.pathname === "/api/kantei" && req.method === "GET") return await kantei(env, req, url);
      if (url.pathname === "/" || url.pathname === "/api/health") return json(env, req, 200, { ok: true, ready: Boolean(env.STRIPE_SECRET_KEY) });
      return json(env, req, 404, { error: "not found" });
    } catch (e) {
      return json(env, req, 502, { error: "決済サービスとの通信に失敗しました。時間をおいてお試しください" });
    }
  }
};
