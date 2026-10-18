#!/usr/bin/env node
/*
 * 名前の数秘術と相性（ひらがな・カタカナ・ローマ字）：suhijutsu/namae/index.html を作る
 *
 *   node tools/namae/generate.mjs
 *
 * 計算は assets/js/content/namae-suhi.js、数字ごとの性質は content/numerology-text.js の TRAITS。
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const TEMPLATE = fs.readFileSync(path.join(ROOT, "learn/suhijutsu/index.html"), "utf8");
const rel = "suhijutsu/namae/";
const title = "名前の相性占い（無料）｜ひらがな・ローマ字で数秘術の相性診断｜母音のソウルナンバー｜えみり";
const desc = "ふたりの名前をひらがな・カタカナ・ローマ字で入れるだけの無料の名前相性占い。名前の文字を数秘術で数字にして、母音から出すソウルナンバー（心）と、名前全体のディスティニーナンバー（役割）で相性を診断します。ニックネームや下の名前だけでもOK。";
const scripts = ["core/dom.js", "content/numerology-text.js", "content/namae-suhi.js", "pages/namae-page.js"].map((s) => `<script defer src="../../assets/js/${s}"></script>`).join("\n");
const head = TEMPLATE.slice(0, TEMPLATE.indexOf("<main"))
  .replace(/<title>.*?<\/title>/, `<title>${esc(title)}</title>`)
  .replace(/<meta name="description" content=".*?">/, `<meta name="description" content="${esc(desc)}">`)
  .replace(/https:\/\/emiri-uranai\.com\/learn\/suhijutsu\//g, `https://emiri-uranai.com/${rel}`)
  .replace(/<meta property="og:title" content=".*?">/, `<meta property="og:title" content="名前の相性占い｜ひらがな・ローマ字で数秘術の相性診断｜えみり">`)
  .replace(/<meta property="og:description" content=".*?">/, `<meta property="og:description" content="ふたりの名前から、数秘術で相性を診断します。">`)
  .replace('<li><a href="../../learn/" aria-current="page">占いを知る</a></li>', '<li><a href="../../learn/">占いを知る</a></li>')
  .replace('<link rel="stylesheet" href="../../assets/css/common.css">', `<link rel="stylesheet" href="../../assets/css/common.css">\n<link rel="stylesheet" href="../../assets/css/sougou-aisho.css">\n${scripts}`);
const foot = TEMPLATE.slice(TEMPLATE.indexOf("<footer"));
const table = [["1", "A J S"], ["2", "B K T"], ["3", "C L U"], ["4", "D M V"], ["5", "E N W"], ["6", "F O X"], ["7", "G P Y"], ["8", "H Q Z"], ["9", "I R"]];

const body = `<main id="main" class="wrap-narrow">
  <nav class="breadcrumb" aria-label="パンくずリスト">
    <ol>
      <li><a href="../../">えみり</a></li>
      <li><a href="../../aisho/">相性占い</a></li>
      <li aria-current="page">名前の相性</li>
    </ol>
  </nav>

  <section class="hero">
    <p class="eyebrow">NAME NUMEROLOGY</p>
    <h1>名前の相性占い｜ひらがな・ローマ字で数秘術の相性診断</h1>
    <p>ふたりの名前を、ひらがな・カタカナ・ローマ字のどれかで入れてください。名前の文字を数秘術で数字にして、母音から出す「ソウルナンバー（心）」と、名前全体の「ディスティニーナンバー（役割）」で相性を見ます。下の名前だけ、ニックネームでも占えます。</p>
    <ul class="badges" aria-label="特徴">
      <li class="badge">完全無料</li>
      <li class="badge">名前だけ</li>
      <li class="badge">生年月日なし</li>
    </ul>
  </section>

  <form id="namae-form" class="card" novalidate>
    <div class="nm-field">
      <label for="nm-a">あなたの名前（ひらがな・カタカナ・ローマ字）</label>
      <input id="nm-a" name="a" type="text" autocomplete="off" maxlength="30" placeholder="例：たなか はなこ／hanako" required>
    </div>
    <div class="nm-field">
      <label for="nm-b">お相手の名前（相性を見るときだけ）</label>
      <input id="nm-b" name="b" type="text" autocomplete="off" maxlength="30" placeholder="例：さとう たろう">
    </div>
    <p id="nm-error" class="form-error" role="alert" hidden></p>
    <button type="submit" class="btn">名前で占う</button>
  </form>

  <div id="namae-result" class="sg-result" hidden></div>

  <section class="card prose" aria-labelledby="nm-how">
    <h2 id="nm-how">名前の数字の出し方</h2>
    <p>名前をローマ字（ヘボン式）にして、アルファベットを下の表で数字にします。数字を足していき、1けたになるまでくり返します（11・22・33はマスターナンバーとしてそのまま残します）。漢字は読み方がひとつに決まらないため、ひらがなかローマ字で入れてください。</p>
    <table class="nm-table">
      <caption>アルファベットと数字の表（ピタゴラス式）</caption>
      <thead><tr><th scope="col">数字</th><th scope="col">文字</th></tr></thead>
      <tbody>
${table.map(([n, l]) => `        <tr><td>${n}</td><td>${l}</td></tr>`).join("\n")}
      </tbody>
    </table>
    <ul>
      <li><strong>ソウルナンバー</strong>：母音（A・I・U・E・O）だけを足した数字。心の奥にある願いや、本当に大切にしたいことを表します。</li>
      <li><strong>パーソナリティナンバー</strong>：子音だけを足した数字。まわりに見せている顔や、第一印象を表します。</li>
      <li><strong>ディスティニーナンバー</strong>：すべての文字を足した数字。名前が持つ役割や、人生で発揮しやすい力を表します。</li>
    </ul>
    <h3>相性の見方</h3>
    <p>ふたりのソウルナンバー（心の相性）とディスティニーナンバー（役割の相性）をくらべます。同じ数字どうしはとても通じ合いやすく、1・5・7、2・4・8、3・6・9のように同じグループの数字どうしは歩調が合いやすいと見ます。ちがうグループどうしは、お互いにないものを補い合う関係です。</p>
    <p>例：「はなこ」は HANAKO → 母音 A・A・O＝1＋1＋6＝8 がソウルナンバーです。</p>
    <p>生年月日がわかるときは、<a href="../../aisho/">8つの占術で見る総合相性</a>や<a href="../aisho/">数秘術の相性（生年月日）</a>もあわせてどうぞ。漢字の画数で見るなら<a href="../../seimei/aisho/">姓名判断の相性</a>があります。</p>
  </section>
</main>

`;
fs.mkdirSync(path.join(ROOT, rel), { recursive: true });
fs.writeFileSync(path.join(ROOT, rel, "index.html"), head + body + foot);
console.log("suhijutsu/namae/ を作成");
