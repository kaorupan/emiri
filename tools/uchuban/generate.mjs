#!/usr/bin/env node
/*
 * 宇宙盤（算命学）：uchuban/index.html を作る
 *
 *   node tools/uchuban/generate.mjs
 *
 * 計算と文章の組み合わせは assets/js/content/uchuban.js（干支は四柱推命のエンジンで出す）。
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const TEMPLATE = fs.readFileSync(path.join(ROOT, "learn/suhijutsu/index.html"), "utf8");
const rel = "uchuban/";
const title = "宇宙盤（算命学）｜生年月日で行動領域と相性を無料で診断｜えみり";
const desc = "算命学の宇宙盤を、生年月日だけで無料で作れます。年・月・日の干支を60干支の円に置いて結んだ形（行動領域）から、あなたの行動範囲と得意な世界を読み、お相手の生年月日を入れるとふたりの形を重ねて相性もわかります。";
const scripts = ["core/date.js", "core/dom.js", "core/profile.js", "core/birthdate-field.js", "core/astro.js", "content/kyusei-data.js", "engines/kyusei.js",
  "engines/shichusuimei.js", "content/uchuban.js", "pages/uchuban-page.js"]
  .map((s) => `<script defer src="../assets/js/${s}"></script>`).join("\n");
let head = TEMPLATE.slice(0, TEMPLATE.indexOf("<main"))
  .replace(/<title>.*?<\/title>/, `<title>${esc(title)}</title>`)
  .replace(/<meta name="description" content=".*?">/, `<meta name="description" content="${esc(desc)}">`)
  .replace(/https:\/\/emiri-uranai\.com\/learn\/suhijutsu\//g, `https://emiri-uranai.com/${rel}`)
  .replace(/<meta property="og:title" content="宇宙盤（算命学）｜行動領域と相性を無料で診断｜えみり">/, `<meta property="og:title" content="ギャンブル運占い｜今日の勝負運と生まれ持った勝負のスタイル｜えみり">`)
  .replace(/<meta property="og:description" content="生年月日から算命学の宇宙盤を描いて、行動領域とふたりの相性を読みます。">/, `<meta property="og:description" content="生年月日から、今日のギャンブル運と、生まれ持った勝負のスタイルを占います。">`)
  .replace('<li><a href="../../learn/" aria-current="page">占いを知る</a></li>', '<li><a href="../../learn/">占いを知る</a></li>')
  .replace('<link rel="stylesheet" href="../../assets/css/common.css">', `<link rel="stylesheet" href="../../assets/css/common.css">\n<link rel="stylesheet" href="../../assets/css/uchuban.css">\n${scripts.replace(/\.\.\/assets/g, "../../assets")}`)
  .replace(/"\.\.\/\.\.\//g, '"../');
const foot = TEMPLATE.slice(TEMPLATE.indexOf("<footer")).replace(/"\.\.\/\.\.\//g, '"../');
const body = `<main id="main" class="wrap-narrow">
  <nav class="breadcrumb" aria-label="パンくずリスト">
    <ol>
      <li><a href="../">えみり</a></li>
      <li aria-current="page">宇宙盤（算命学）</li>
    </ol>
  </nav>

  <section class="hero">
    <p class="eyebrow">SANMEIGAKU</p>
    <h1>宇宙盤（算命学）｜行動領域と、ふたりの相性</h1>
    <p>算命学の宇宙盤は、生まれた年・月・日の干支を60干支の円の上に置き、3つの点を結んだ形で「行動領域」を見る占いです。生年月日を入れると盤を描いて、あなたの行動範囲と得意な世界を読みます。お相手の生年月日も入れると、ふたりの形を重ねて相性がわかります。</p>
    <ul class="badges" aria-label="特徴">
      <li class="badge">完全無料</li>
      <li class="badge">生年月日だけ</li>
      <li class="badge">相性もわかる</li>
    </ul>
  </section>

  <form id="uchuban-form" class="card" novalidate>
    <div data-birthdate="self"></div>
    <div data-birthdate="partner"></div>
    <p class="ub-form-note">相性を見るときは、お相手の生年月日も入れてください。空のままなら、あなたの宇宙盤だけを描きます。</p>
    <button type="submit" class="btn">宇宙盤を描く</button>
  </form>

  <div id="uchuban-result" class="ub-result" hidden></div>

  <section class="card prose" aria-labelledby="ub-how">
    <p class="eyebrow">HOW IT WORKS</p>
    <h2 id="ub-how">宇宙盤のしくみと見方</h2>
    <h3>宇宙盤の作り方</h3>
    <p>算命学では、生まれた年・月・日の干支（陰占）を使います。甲子から癸亥までの60の干支を円の上に順番に並べ、自分の3つの干支の位置を線で結ぶと、三角形ができます。この形を「行動領域」と呼び、ふだん動き回る範囲や、自然と足が向く世界を表すとされます。年と月は、立春や節入り（二十四節気）で区切って出しています。</p>
    <p>えみりの盤は、甲子を真上に置き、時計回りに並べています。盤の向きや4つの区分の呼び方は流派によってちがうため、ここではわかりやすい言葉で「守りと安定」「自由と自立」「挑戦と行動」「知性と戦略」の4つの世界に分けて読んでいます。</p>
    <h3>形の大きさで見る行動範囲</h3>
    <ul>
      <li><strong>広い三角形</strong>：いろいろな世界に顔を出す、行動範囲の広いタイプ。</li>
      <li><strong>小さい三角形</strong>：得意な世界をしぼって深く掘り下げる、専門家タイプ。</li>
      <li><strong>線や点</strong>：2つ以上の干支が同じ組み合わせ。こだわりと集中力がとても強いタイプ。</li>
    </ul>
    <h3>相性の見方</h3>
    <p>ふたりの宇宙盤を重ねて、同じ世界（区分）にいくつ入っているかで関係のタイプを読みます。共通の世界が多いほど話が合いやすく、少ないほどお互いに自立した関係になりやすいとされます。どちらがよい悪いではなく、ちょうどよい距離感を知るための見方です。</p>
    <p>同じ干支を使う占いには<a href="../shichusuimei/">四柱推命</a>があり、命式の星や天中殺もくわしく見られます。ほかの相性占いは<a href="../aisho/">相性占いの一覧</a>からどうぞ。</p>
  </section>
</main>

`;
fs.mkdirSync(path.join(ROOT, rel), { recursive: true });
fs.writeFileSync(path.join(ROOT, rel, "index.html"), head + body + foot);
console.log("uchuban/ を作成");
