#!/usr/bin/env node
/*
 * 電話番号占い：denwa/index.html を作る
 *
 *   node tools/denwa/generate.mjs
 *
 * 計算は assets/js/content/denwa.js、81数の意味は content/seimei-numbers.js（姓名判断と共通）。
 * 1〜80の吉凶一覧は、ページを作るときに 81数のデータから書き出す。
 */
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const require = createRequire(import.meta.url);
const NUM = require(path.join(ROOT, "assets/js/content/seimei-numbers.js"));
const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const TEMPLATE = fs.readFileSync(path.join(ROOT, "learn/suhijutsu/index.html"), "utf8");
const rel = "denwa/";
const title = "電話番号占い（無料）｜携帯の下4桁で吉凶を診断｜吉数一覧と選び方｜えみり";
const desc = "電話番号の下4桁を80で割った余りで吉凶を見る、無料の電話番号占いです。携帯・固定電話・お店の番号もOK。1〜80の吉凶一覧と、新しい番号を選ぶときの吉数の探し方、数秘術で見る番号の雰囲気も紹介します。番号は保存・送信しません。";
const scripts = ["core/dom.js", "content/seimei-numbers.js", "content/numerology-text.js", "content/denwa.js", "pages/denwa-page.js"]
  .map((s) => `<script defer src="../assets/js/${s}"></script>`).join("\n");
const head = TEMPLATE.slice(0, TEMPLATE.indexOf("<main"))
  .replace(/<title>.*?<\/title>/, `<title>${esc(title)}</title>`)
  .replace(/<meta name="description" content=".*?">/, `<meta name="description" content="${esc(desc)}">`)
  .replace(/https:\/\/emiri-uranai\.com\/learn\/suhijutsu\//g, `https://emiri-uranai.com/${rel}`)
  .replace(/<meta property="og:title" content=".*?">/, `<meta property="og:title" content="電話番号占い｜携帯の下4桁で吉凶診断｜えみり">`)
  .replace(/<meta property="og:description" content=".*?">/, `<meta property="og:description" content="電話番号の下4桁から、番号の吉凶と意味を占います。">`)
  .replace('<li><a href="../../learn/" aria-current="page">占いを知る</a></li>', '<li><a href="../../learn/">占いを知る</a></li>')
  .replace('<link rel="stylesheet" href="../../assets/css/common.css">', `<link rel="stylesheet" href="../../assets/css/common.css">\n<link rel="stylesheet" href="../../assets/css/sougou-aisho.css">\n${scripts.replace(/\.\.\/assets/g, "../../assets")}`)
  .replace(/"\.\.\/\.\.\//g, '"../');
const foot = TEMPLATE.slice(TEMPLATE.indexOf("<footer")).replace(/"\.\.\/\.\.\//g, '"../');

const rows = [];
for (let r = 1; r <= 80; r++) { const m = NUM.number(r); rows.push(`        <tr class="dw-r-${NUM.LUCKS.indexOf(m.luck) + 1}"><td>${r}</td><td>${esc(m.luck)}</td><td>${esc(m.keyword)}</td></tr>`); }
const great = []; for (let r = 1; r <= 80; r++) if (NUM.number(r).luck === "大吉") great.push(r);
const examples = [1, 15, 24, 32].map((r) => `${r}：下4桁が ${[r, r + 80, r + 160, r + 240].map((x) => String(x).padStart(4, "0")).join("・")} …`);

const body = `<main id="main" class="wrap-narrow">
  <nav class="breadcrumb" aria-label="パンくずリスト">
    <ol>
      <li><a href="../">えみり</a></li>
      <li aria-current="page">電話番号占い</li>
    </ol>
  </nav>

  <section class="hero">
    <p class="eyebrow">PHONE NUMBER</p>
    <h1>電話番号占い｜携帯の下4桁でわかる番号の吉凶</h1>
    <p>電話番号の下4桁を80で割った余りから、その番号の吉凶と意味を占います。携帯電話・固定電話・お店や会社の番号でも占えます。新しい番号を選ぶときの吉数の一覧もあります。</p>
    <ul class="badges" aria-label="特徴">
      <li class="badge">完全無料</li>
      <li class="badge">下4桁だけでもOK</li>
      <li class="badge">番号は保存しません</li>
    </ul>
  </section>

  <form id="denwa-form" class="card" novalidate>
    <div class="nm-field">
      <label for="dw-phone">電話番号（下4桁だけでもOK）</label>
      <input id="dw-phone" name="phone" type="tel" inputmode="numeric" autocomplete="off" maxlength="20" placeholder="例：090-1234-5678／5678" required>
    </div>
    <p class="sg-note">入力した番号は、この画面の中だけで計算します。保存したり、どこかへ送ったりすることはありません。</p>
    <p id="dw-error" class="form-error" role="alert" hidden></p>
    <button type="submit" class="btn">番号を占う</button>
  </form>

  <div id="denwa-result" class="sg-result" hidden></div>

  <section class="card prose" aria-labelledby="dw-how">
    <h2 id="dw-how">電話番号占いのやり方</h2>
    <ol>
      <li>電話番号の<strong>下4桁</strong>を、ひとつの数として見ます（例：090-1234-<strong>5678</strong> → 5678）。</li>
      <li>その数を<strong>80で割り</strong>、<strong>余り</strong>を出します（5678 ÷ 80 ＝ 70 あまり <strong>78</strong>）。余りが0のときは80として読みます。</li>
      <li>余りの数（1〜80）を、姓名判断と同じ<strong>81数の吉凶</strong>で読みます。</li>
    </ol>
    <p>80で割るのは、81数が「80でひと回りして1に戻る」と考えるためです。いちばん使われる下4桁で見るのが一般的ですが、番号全体の数字を足して1けたにする数秘術の見方もあわせて表示しています。</p>
  </section>

  <section class="card prose" aria-labelledby="dw-choose">
    <h2 id="dw-choose">吉数の番号を選ぶには</h2>
    <p>新しく携帯の番号やお店の番号を選べるときは、下4桁を80で割った余りが「大吉」の数になる番号を選ぶのがおすすめです。大吉の余りは次の${great.length}個です。</p>
    <p class="dw-great">${great.join("・")}</p>
    <p>余りが同じになる下4桁は、80ずつ足していくと見つかります。</p>
    <ul>
${examples.map((x) => `      <li>${esc(x)}</li>`).join("\n")}
    </ul>
    <p>いまの番号に凶の数が出ても、番号を変えなければいけないわけではありません。待ち受け画面や連絡先の登録名など、身近なところで吉の数をとり入れて、気持ちを整える目安にしてください。</p>
  </section>

  <section class="card" aria-labelledby="dw-list">
    <h2 id="dw-list">1〜80の吉凶一覧</h2>
    <div class="sz-table-wrap" tabindex="0" role="region" aria-label="1〜80の吉凶一覧">
    <table class="nm-table dw-table">
      <caption>下4桁を80で割った余りと、吉凶・キーワード</caption>
      <thead><tr><th scope="col">余り</th><th scope="col">吉凶</th><th scope="col">キーワード</th></tr></thead>
      <tbody>
${rows.join("\n")}
      </tbody>
    </table>
    </div>
    <p class="sg-note">吉凶の区分は、姓名判断で一般的な81数の区分にそろえています（流派によって一部の数の扱いが異なります）。それぞれの数のくわしい意味は、<a href="../seimei/">姓名判断</a>でも見られます。</p>
  </section>

  <section class="card prose" aria-labelledby="dw-more">
    <h2 id="dw-more">数字の占いをもっと</h2>
    <p>生年月日の数字で読む<a href="../suhijutsu/">数秘術</a>、名前を数字にして相性を見る<a href="../suhijutsu/namae/">名前の相性</a>、名前の画数で見る<a href="../seimei/">姓名判断</a>もあわせてどうぞ。</p>
  </section>
</main>

`;
fs.mkdirSync(path.join(ROOT, rel), { recursive: true });
fs.writeFileSync(path.join(ROOT, rel, "index.html"), head + body + foot);
console.log("denwa/ を作成");
