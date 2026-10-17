#!/usr/bin/env node
/*
 * 適職占い：tekishoku/index.html を作る
 *
 *   node tools/tekishoku/generate.mjs
 *
 * 計算と文章の組み合わせは assets/js/content/tekishoku.js（数秘術・九星気学・四柱推命の既存のエンジンと文章を使う）。
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const TEMPLATE = fs.readFileSync(path.join(ROOT, "learn/suhijutsu/index.html"), "utf8");
const rel = "tekishoku/";
const title = "適職占い｜生年月日でわかる向いている仕事と、転職に動きやすい時期｜えみり";
const desc = "生年月日から、数秘術・九星気学・四柱推命の3つの占術で、あなたに向いている仕事と働き方を読み解きます。これからの3年と12か月で、転職に動きやすい時期の目安もわかる無料の適職診断です。";
const scripts = ["core/date.js", "core/dom.js", "core/profile.js", "core/birthdate-field.js", "core/astro.js", "content/kyusei-data.js", "engines/kyusei.js", "content/kyusei-text.js",
  "engines/numerology.js", "content/numerology-text.js", "engines/shichusuimei.js", "content/shichusuimei-text.js", "content/tekishoku.js", "pages/tekishoku-page.js"]
  .map((s) => `<script defer src="../assets/js/${s}"></script>`).join("\n");
let head = TEMPLATE.slice(0, TEMPLATE.indexOf("<main"))
  .replace(/<title>.*?<\/title>/, `<title>${esc(title)}</title>`)
  .replace(/<meta name="description" content=".*?">/, `<meta name="description" content="${esc(desc)}">`)
  .replace(/https:\/\/emiri-uranai\.com\/learn\/suhijutsu\//g, `https://emiri-uranai.com/${rel}`)
  .replace(/<meta property="og:title" content=".*?">/, `<meta property="og:title" content="適職占い｜向いている仕事と転職の時期｜えみり">`)
  .replace(/<meta property="og:description" content=".*?">/, `<meta property="og:description" content="生年月日から、向いている仕事と、転職に動きやすい時期を読み解きます。">`)
  .replace('<li><a href="../../learn/" aria-current="page">占いを知る</a></li>', '<li><a href="../../learn/">占いを知る</a></li>')
  .replace('<link rel="stylesheet" href="../../assets/css/common.css">', `<link rel="stylesheet" href="../../assets/css/common.css">\n<link rel="stylesheet" href="../../assets/css/tekishoku.css">\n${scripts.replace(/\.\.\/assets/g, "../../assets")}`)
  .replace(/"\.\.\/\.\.\//g, '"../');
const foot = TEMPLATE.slice(TEMPLATE.indexOf("<footer")).replace(/"\.\.\/\.\.\//g, '"../');
const body = `<main id="main" class="wrap-narrow">
  <nav class="breadcrumb" aria-label="パンくずリスト">
    <ol>
      <li><a href="../">えみり</a></li>
      <li aria-current="page">適職占い</li>
    </ol>
  </nav>

  <section class="hero">
    <p class="eyebrow">CAREER FORTUNE</p>
    <h1>適職占い｜向いている仕事と、転職に動きやすい時期</h1>
    <p>生年月日から、数秘術・九星気学・四柱推命の3つの占術で、あなたの強みが生きる仕事と働き方を読み解きます。これからの3年と12か月で、転職に動きやすい時期の目安もわかります。</p>
    <ul class="badges" aria-label="特徴">
      <li class="badge">完全無料</li>
      <li class="badge">生年月日だけ</li>
      <li class="badge">3つの占術</li>
    </ul>
  </section>

  <form id="tekishoku-form" class="card" novalidate>
    <div data-birthdate="self"></div>
    <button type="submit" class="btn">向いている仕事と時期を占う</button>
  </form>

  <div id="tekishoku-result" class="tk-result" hidden></div>

  <section class="card prose" aria-labelledby="tk-how">
    <p class="eyebrow">HOW IT WORKS</p>
    <h2 id="tk-how">適職占いのしくみ</h2>
    <h3>3つの占術で、向き不向きを立体的に</h3>
    <ul>
      <li><strong>数秘術</strong>：生年月日の数字から出すライフパスナンバーで、生き方の中心にある才能と、力が出る働き方を見ます。</li>
      <li><strong>九星気学</strong>：生まれた年の本命星で、外に出る性質と、周りから頼られやすい役割を見ます。</li>
      <li><strong>四柱推命</strong>：生まれた日の干（日干）で、あなたの本質と、伸びやすい仕事の分野を見ます。</li>
    </ul>
    <h3>転職の時期の見方</h3>
    <p>数秘術のパーソナルイヤー（1〜9年で一巡するその年のテーマ）と、四柱推命のその年の通変星を組み合わせ、「転職に動きやすい年」「準備を整えて動く年」「力を蓄える年」の3つで表します。四柱推命で天中殺にあたる年は、大きく動くより準備や見直しに向く年として扱います。12か月の流れは、数秘術のパーソナルマンスから見ています。</p>
    <p>どれも占いとしての目安です。実際の転職は、仕事の条件や暮らしとあわせて考えてください。</p>
    <p>それぞれの占術は<a href="../suhijutsu/">数秘術</a>・<a href="../kyusei/">九星気学</a>・<a href="../shichusuimei/">四柱推命</a>のページでくわしく見られます。</p>
  </section>
</main>

`;
fs.mkdirSync(path.join(ROOT, rel), { recursive: true });
fs.writeFileSync(path.join(ROOT, rel, "index.html"), head + body + foot);
console.log("tekishoku/ を作成");
