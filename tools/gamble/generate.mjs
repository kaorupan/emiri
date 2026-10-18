#!/usr/bin/env node
/*
 * ギャンブル運占い：gamble/index.html を作る
 *
 *   node tools/gamble/generate.mjs
 *
 * 計算と文章の組み合わせは assets/js/content/gamble.js（四柱推命・数秘術の既存のエンジンを使う）。
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const TEMPLATE = fs.readFileSync(path.join(ROOT, "learn/suhijutsu/index.html"), "utf8");
const rel = "gamble/";
const title = "ギャンブル運占い｜今日のギャンブル運と生まれ持った勝負運を生年月日で無料診断｜えみり";
const desc = "生年月日から、今日のギャンブル運（ラッキーナンバー・色・ツキのある時間）と、これから7日間の流れ、生まれ持った勝負のスタイルを四柱推命と数秘術で占う無料のギャンブル運占いです。";
const scripts = ["core/date.js", "core/dom.js", "core/profile.js", "core/birthdate-field.js", "core/astro.js", "content/kyusei-data.js", "engines/kyusei.js",
  "engines/numerology.js", "engines/shichusuimei.js", "content/gamble.js", "pages/gamble-page.js"]
  .map((s) => `<script defer src="../assets/js/${s}"></script>`).join("\n");
let head = TEMPLATE.slice(0, TEMPLATE.indexOf("<main"))
  .replace(/<title>.*?<\/title>/, `<title>${esc(title)}</title>`)
  .replace(/<meta name="description" content=".*?">/, `<meta name="description" content="${esc(desc)}">`)
  .replace(/https:\/\/emiri-uranai\.com\/learn\/suhijutsu\//g, `https://emiri-uranai.com/${rel}`)
  .replace(/<meta property="og:title" content=".*?">/, `<meta property="og:title" content="ギャンブル運占い｜今日の勝負運と生まれ持った勝負のスタイル｜えみり">`)
  .replace(/<meta property="og:description" content=".*?">/, `<meta property="og:description" content="生年月日から、今日のギャンブル運と、生まれ持った勝負のスタイルを占います。">`)
  .replace('<li><a href="../../learn/" aria-current="page">占いを知る</a></li>', '<li><a href="../../learn/">占いを知る</a></li>')
  .replace('<link rel="stylesheet" href="../../assets/css/common.css">', `<link rel="stylesheet" href="../../assets/css/common.css">\n<link rel="stylesheet" href="../../assets/css/tekishoku.css">\n<link rel="stylesheet" href="../../assets/css/gamble.css">\n${scripts.replace(/\.\.\/assets/g, "../../assets")}`)
  .replace(/"\.\.\/\.\.\//g, '"../');
const foot = TEMPLATE.slice(TEMPLATE.indexOf("<footer")).replace(/"\.\.\/\.\.\//g, '"../');
const body = `<main id="main" class="wrap-narrow">
  <nav class="breadcrumb" aria-label="パンくずリスト">
    <ol>
      <li><a href="../">えみり</a></li>
      <li aria-current="page">ギャンブル運占い</li>
    </ol>
  </nav>

  <section class="hero">
    <p class="eyebrow">GAMBLING LUCK</p>
    <h1>ギャンブル運占い｜今日のギャンブル運と、生まれ持った勝負運</h1>
    <p>生年月日から、今日のギャンブル運とラッキーナンバー・色・ツキのある時間、これから7日間の流れを占います。四柱推命の命式から、生まれ持った勝負のスタイルと「引き際の強さ」もわかります。</p>
    <ul class="badges" aria-label="特徴">
      <li class="badge">完全無料</li>
      <li class="badge">生年月日だけ</li>
      <li class="badge">毎日変わる</li>
    </ul>
  </section>

  <form id="gamble-form" class="card" novalidate>
    <div data-birthdate="self"></div>
    <button type="submit" class="btn">ギャンブル運を占う</button>
  </form>

  <div id="gamble-result" class="gb-result" hidden></div>

  <section class="card prose gb-care" aria-labelledby="gb-care">
    <h2 id="gb-care">運を味方にする、楽しみ方の約束</h2>
    <ul>
      <li>はじめに<strong>使う金額と時間の上限</strong>を決めて、その中で楽しむ。</li>
      <li>負けを<strong>取り返そうとしない</strong>。「見送り」の日は、遊ばないのがいちばんの開運です。</li>
      <li>生活費や借りたお金は使わない。</li>
      <li>競馬・競輪・競艇・オートレースの投票券は、20歳未満は買えません。</li>
    </ul>
    <p>やめたくてもやめられない、お金や時間の使いかたが気になる、というときは、ひとりで抱えずに相談できます。全国の<a href="https://www.zmhwc.jp/centerlist.html" target="_blank" rel="noopener">精神保健福祉センター</a>や、<a href="https://www.ncasa-japan.jp/you-do/treatment/treatment-map/" target="_blank" rel="noopener">依存症対策全国センターの相談・治療先の一覧</a>から、近くの窓口を探せます。家族やまわりの人からの相談もできます。</p>
  </section>

  <section class="card prose" aria-labelledby="gb-how">
    <p class="eyebrow">HOW IT WORKS</p>
    <h2 id="gb-how">ギャンブル運占いのしくみ</h2>
    <h3>今日のギャンブル運</h3>
    <p>四柱推命で、あなたの生まれた日の干（日干）から見た、今日の日の干支の星（通変星）と十二運で読みます。思いがけないお金に縁がある「偏財」の日や、楽しむ心が運を呼ぶ「食神」の日は運気が高く、お金が出ていきやすい「劫財」の日は見送りの日とします。あなたの天中殺にあたる日は、大きな勝負を控える日として扱います。</p>
    <p>ツキのある時間は、今日の時間ごとの干支から、偏財・食神・正財の星が出る時間を探しています。ラッキーナンバーは数秘術の「その日の数」、ラッキーカラーはあなたの日干から見て「財」にあたる五行の色です。</p>
    <h3>生まれ持ったギャンブル運</h3>
    <p>四柱推命の命式（年・月・日）に出ている星から、「直感・ひらめき」「読み・分析力」「くじ運・臨時収入」「勝負度胸」「引き際・自制心」の5つの力を出し、いちばん強い力から勝負のスタイルを決めています。数秘術のライフパスナンバーで、勝負のくせも添えています。</p>
    <p>どれも遊びを楽しむための目安で、勝ちや当選を約束するものではありません。それぞれの占術は<a href="../shichusuimei/">四柱推命</a>・<a href="../suhijutsu/">数秘術</a>のページでくわしく見られます。金運を後押しする石は<a href="../powerstone/kinun/">金運・豊かさのパワーストーン</a>で紹介しています。</p>
  </section>
</main>

`;
fs.mkdirSync(path.join(ROOT, rel), { recursive: true });
fs.writeFileSync(path.join(ROOT, rel, "index.html"), head + body + foot);
console.log("gamble/ を作成");
