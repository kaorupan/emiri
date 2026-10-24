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

test("ページの種類：恋愛は love、相性占いは aisho、適職占いは career、運営・本格占いには出さない", async () => {
  const { themeOf } = await load();
  assert.equal(themeOf("aisho/index.html"), "aisho");
  assert.equal(themeOf("kyusei/aisho/index.html"), "aisho");
  assert.equal(themeOf("uchuban/index.html"), "aisho");
  assert.equal(themeOf("tekishoku/index.html"), "career");
  assert.equal(themeOf("yume/koibito/index.html"), "love");
  assert.equal(themeOf("tesou/renai/index.html"), "love");
  assert.equal(themeOf("yume/hebi/index.html"), "general");
  assert.equal(themeOf("index.html"), "general");
  for (const r of ["about/index.html", "privacy/index.html", "contact/index.html", "tokushoho/index.html", "premium/index.html", "premium/kantei/index.html"]) assert.equal(themeOf(r), null, r);
});

test("枠：PR表示・nofollow sponsored・テーマで絞り込み・何度実行しても同じ", async () => {
  const { apply } = await load();
  const love = apply(PAGE, "yume/koibito/index.html", PROGRAMS);
  assert.ok(love.includes('<p class="aff-pr">PR・広告</p>'));
  assert.ok(love.includes("この枠は広告です") && love.includes("紹介料"));
  assert.ok(love.includes("公式サイトで料金・特典条件を確認する"));
  assert.ok(!love.includes("初回の特典あり"), "確認できていない紹介文（lead）は出さない");
  assert.ok(love.includes('rel="nofollow sponsored noopener"'));
  assert.ok(love.includes("電話占いA") && !love.includes("チャット占いB"));
  assert.ok(love.includes('href="../../privacy/#affiliate"'));
  assert.ok(love.indexOf("<!--aff-->") < love.indexOf("</main>"));
  assert.equal(apply(love, "yume/koibito/index.html", PROGRAMS), love, "2回目で変わらない");
  assert.equal(apply(love, "yume/koibito/index.html", []), PAGE, "案件がなくなれば枠も消える");
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

test("並び順：rank の小さい順。テーマごとに変えられる", async () => {
  const { apply } = await load();
  const P = [
    { name: "A", url: "https://a.example/", themes: ["love", "general"], rank: { love: 2, general: 1 } },
    { name: "B", url: "https://b.example/", themes: ["love", "general"], rank: { love: 1, general: 2 } },
    { name: "C", url: "https://c.example/", themes: ["love", "general"] }
  ];
  const names = (h) => [...h.matchAll(/<p class="consult-name">([^<]+)<\/p>/g)].map((m) => m[1]);
  assert.deepEqual(names(apply(PAGE, "yume/koibito/index.html", P)), ["B", "A", "C"]);
  assert.deepEqual(names(apply(PAGE, "yume/hebi/index.html", P)), ["A", "B", "C"]);
});

test("相談の案内：確認日のある情報だけを出す・LINEの案内の前に入れる・計測の印", async () => {
  const { apply } = await load();
  const P = [{ name: "電話占いA", id: "a", format: "phone", url: "https://px.a8.net/svt/ejp?a8mat=TEST", themes: ["general"],
    verified: { checkedOn: "", price: "1分100円" } }];
  const noDate = apply(PAGE, "yume/hebi/index.html", P);
  assert.ok(!noDate.includes("1分100円"), "確認日がなければ料金は出さない");
  assert.ok(noDate.includes("電話で相談") && noDate.includes("向いている人"));
  assert.ok(noDate.includes('data-track="aff_click" data-service="a"'));
  assert.ok(noDate.includes('href="https://px.a8.net/svt/ejp?a8mat=TEST"'), "広告リンクはそのまま");
  P[0].verified.checkedOn = "2026-10-15";
  const dated = apply(PAGE, "yume/hebi/index.html", P);
  assert.ok(dated.includes("1分100円") && dated.includes("情報の確認日"));
  const withLine = "<main>\n  <p>x</p>\n<!--line-cta-->\n  <aside>LINE</aside>\n<!--/line-cta-->\n</main>";
  const o = apply(withLine, "yume/hebi/index.html", P);
  assert.ok(o.indexOf("<!--aff-->") < o.indexOf("<!--line-cta-->"));
  assert.equal(apply(o, "yume/hebi/index.html", P), o);
  assert.equal(apply(PAGE, "line/index.html", P), PAGE, "LINEの中で開くページには出さない");
});

test("今のサイト：表示中の広告リンク（a8mat）が設定と一致し、確認日のない料金・特典は出ていない", async () => {
  const { loadPrograms } = await load();
  const top = fs.readFileSync(path.join(ROOT, "suhijutsu/index.html"), "utf8");
  // 各ページに出すのは rank の小さい順に3件まで
  const r = (p) => (p.rank && Number.isFinite(p.rank.general) ? p.rank.general : 99);
  const shown = loadPrograms(ROOT).filter((x) => x.themes.includes("general")).sort((a, b) => r(a) - r(b)).slice(0, 3);
  for (const p of shown) assert.ok(top.includes(p.url.replace(/&/g, "&amp;")), p.name);
  assert.ok(!top.includes("3,000円"));
});

test("パワーストーンのページ：ショップの案件があればショップの案内、なければふだんの相談の案内", async () => {
  const { apply, themeOf } = await load();
  assert.equal(themeOf("powerstone/amethyst/index.html"), "stone");
  const consult = [{ name: "電話占いA", id: "a", format: "phone", url: "https://px.a8.net/svt/ejp?a8mat=A", themes: ["general"] }];
  const shop = [{ name: "天然石ショップB", id: "b", format: "shop", url: "https://px.a8.net/svt/ejp?a8mat=B", themes: ["stone"] }];
  const noShop = apply(PAGE, "powerstone/amethyst/index.html", consult);
  assert.ok(noShop.includes("電話占いA") && noShop.includes('data-theme="general"'));
  const withShop = apply(PAGE, "powerstone/amethyst/index.html", consult.concat(shop));
  assert.ok(withShop.includes("天然石ショップB") && !withShop.includes("電話占いA"));
  assert.ok(withShop.includes("公式ショップで商品と条件を見る") && withShop.includes("天然石のショップ"));
  assert.ok(!apply(PAGE, "yume/hebi/index.html", consult.concat(shop)).includes("天然石ショップB"), "ほかのページにはショップを出さない");
});

test("風水のページ：開運グッズのショップ（案件がなければ相談の案内）", async () => {
  const { apply, themeOf } = await load();
  assert.equal(themeOf("fusui/genkan/index.html"), "fusui");
  const consult = [{ name: "電話占いA", id: "a", format: "phone", url: "https://px.a8.net/svt/ejp?a8mat=A", themes: ["general"] }];
  const goods = [{ name: "開運グッズC", id: "c", format: "goods", url: "https://px.a8.net/svt/ejp?a8mat=C", themes: ["fusui"] }];
  assert.ok(apply(PAGE, "fusui/genkan/index.html", consult).includes("電話占いA"));
  const g = apply(PAGE, "fusui/genkan/index.html", consult.concat(goods));
  assert.ok(g.includes("開運グッズC") && g.includes("開運グッズのショップ") && !g.includes("電話占いA"));
});

test("今のサイト：ショップの広告リンクは、えみりで提携したもの（4BEH5E）をそのまま使う", async () => {
  const { loadPrograms } = await load();
  for (const p of loadPrograms(ROOT).filter((x) => ["shop", "goods"].includes(x.format))) {
    assert.match(p.url, /^https:\/\/px\.a8\.net\/svt\/ejp\?a8mat=4BEH5E\+/, p.name);
    assert.ok(p.pixel.endsWith(p.url.split("a8mat=")[1]), `${p.name} の計測画像`);
  }
});

test("広告の表示：広告枠のあるページは、ページの最初にも「広告（PR）を含みます」を出す。枠がなければ出さない", async () => {
  const { apply } = await load();
  const o = apply(PAGE, "yume/hebi/index.html", PROGRAMS);
  assert.ok(o.indexOf("<!--pr-notice-->") > o.indexOf("<main") && o.indexOf("<!--pr-notice-->") < o.indexOf("<p>結果</p>"));
  assert.ok(o.includes('href="../../privacy/#affiliate"'));
  assert.equal(apply(o, "yume/hebi/index.html", PROGRAMS), o, "2回目で変わらない");
  assert.equal(apply(o, "yume/hebi/index.html", []), PAGE);
  assert.ok(!apply(PAGE, "about/index.html", PROGRAMS).includes("pr-notice"));
});

test("適職占い・相性占い：テーマに合う案件だけを出し、ボタンの文言も合わせる", async () => {
  const { apply } = await load();
  const P = [
    { name: "電話占いA", id: "a", format: "phone", url: "https://a.example/", themes: ["love", "general", "aisho"] },
    { name: "転職B", id: "b", format: "agent", url: "https://b.example/", themes: ["career"], about: "20代向けの転職支援" },
    { name: "マッチングC", id: "c", format: "matching", url: "https://c.example/", themes: ["aisho"] }
  ];
  const career = apply(PAGE, "tekishoku/index.html", P);
  assert.ok(career.includes("転職B") && !career.includes("電話占いA") && !career.includes("マッチングC"));
  assert.ok(career.includes("転職エージェント") && career.includes("サービスの特徴") && career.includes("公式サイトでサービス内容と条件を確認する"));
  assert.ok(career.includes('data-theme="career"'));
  const aisho = apply(PAGE, "kyusei/aisho/index.html", P);
  assert.ok(aisho.includes("電話占いA") && aisho.includes("マッチングC") && !aisho.includes("転職B"));
  assert.ok(aisho.includes("ふたりの関係を進めたいときは"));
  assert.ok(!apply(PAGE, "yume/hebi/index.html", P).includes("転職B"), "ほかのページには転職の案件を出さない");
});
