#!/usr/bin/env node
/*
 * 復縁占い（fukuen/）・片思い占い（kataomoi/）を作る
 *
 *   node tools/renai/generate.mjs
 *
 * 計算と文章は assets/js/content/renai.js（相性は content/sougou-aisho.js の8つの占術）。
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const TEMPLATE = fs.readFileSync(path.join(ROOT, "learn/suhijutsu/index.html"), "utf8");
const SCRIPTS = ["core/date.js", "core/dom.js", "core/profile.js", "core/birthdate-field.js", "core/astro.js", "core/kyureki.js", "vendor/astronomy-engine-2.1.19.min.js",
  "content/kyusei-data.js", "engines/kyusei.js", "engines/shichusuimei.js", "engines/numerology.js", "engines/horoscope.js", "engines/jyotish.js", "engines/maya.js", "engines/shukuyo.js",
  "content/uchuban.js", "content/sougou-aisho.js", "content/renai.js", "pages/renai-page.js"];

const radios = (name, legend, items) => `    <fieldset class="sg-relation rn-q">
      <legend>${legend}</legend>
${items.map(([v, t], i) => `      <label><input type="radio" name="${name}" value="${v}"${i === 0 ? " checked" : ""}> ${t}</label>`).join("\n")}
    </fieldset>`;

const PAGES = {
  fukuen: {
    title: "復縁占い（無料）｜生年月日で見る復縁の可能性と、動きやすい時期｜えみり",
    desc: "生年月日だけでわかる無料の復縁占い。8つの占術で見るふたりの縁と、これからの6か月で歩み寄りやすい月、別れてからの期間や連絡の状況に合わせたアドバイスを占います。登録なし。",
    ogTitle: "復縁占い｜ふたりの縁と、動きやすい時期｜えみり",
    eyebrow: "REUNION", h1: "復縁占い｜ふたりの縁と、歩み寄りやすい時期",
    lead: "あなたの生年月日と、わかればお相手の生年月日、今の状況を選んでください。8つの占術で見るふたりの縁と、これからの6か月で歩み寄りやすい月、今の状況に合わせたアドバイスを占います。",
    qs: [
      radios("period", "別れてからの期間", [["m1", "1か月以内"], ["m6", "半年以内"], ["y1", "1年以内"], ["over", "1年以上"]]),
      radios("contact", "今の連絡の状況", [["now", "今も連絡を取っている"], ["some", "ときどき連絡がある"], ["none", "連絡していない"], ["blocked", "ブロック・連絡を断られている"]]),
      radios("reason", "別れたきっかけ", [["natural", "自然消滅"], ["fight", "けんか・すれ違い"], ["them", "相手から"], ["me", "自分から"], ["distance", "距離・環境"]])
    ],
    button: "復縁を占う",
    how: `<p>ふたりの縁は、数秘術・九星気学・四柱推命・星座・宿曜・マヤ暦・インド占星術・宇宙盤の8つの占術の相性をまとめた総合点で見ています（お相手の生年月日を入れたときだけ）。動きやすい月は、あなたの数秘術のパーソナルマンス（月ごとのテーマ）から、「仲直り・歩み寄り」「再会のきっかけ」「気持ちを伝え直す」に向く月を選んでいます。</p>
    <p>アドバイスは、選んでいただいた今の状況に合わせた文章です。復縁は、ふたりの気持ちがそろってはじめて叶うもの。相手が距離を置きたいと伝えているときは、連絡を控えることをおすすめしています。</p>`,
    more: `<p>片思いの相手との今後は<a href="../kataomoi/">片思い占い</a>で、ふたりの相性をくわしく見るなら<a href="../aisho/">相性占い（8つの占術の総合診断）</a>で占えます。元恋人の夢を見たときは<a href="../yume/motokare/">元彼・元カノの夢の意味</a>もどうぞ。</p>`
  },
  kataomoi: {
    title: "片思い占い（無料）｜生年月日で見る相手との縁と、気持ちを伝える時期｜えみり",
    desc: "生年月日だけでわかる無料の片思い占い。8つの占術で見る相手との縁と、これからの6か月で気持ちを伝えやすい月、ふたりの関係や連絡の状況に合わせたアドバイスを占います。登録なし。",
    ogTitle: "片思い占い｜相手との縁と、気持ちを伝える時期｜えみり",
    eyebrow: "CRUSH", h1: "片思い占い｜相手との縁と、気持ちを伝える時期",
    lead: "あなたの生年月日と、わかれば相手の生年月日、今の関係を選んでください。8つの占術で見る相手との縁と、これからの6か月で気持ちを伝えやすい月、今の状況に合わせたアドバイスを占います。",
    qs: [
      radios("relation", "相手との関係", [["new", "知り合ったばかり"], ["friend", "友達"], ["work", "職場・学校"], ["online", "SNS・アプリ"]]),
      radios("contact", "話す・連絡する頻度", [["often", "よく話す"], ["some", "ときどき"], ["rare", "ほとんどない"]]),
      radios("feeling", "相手の反応の手応え", [["good", "手応えあり"], ["unsure", "よくわからない"], ["low", "脈なしかも"]])
    ],
    button: "片思いを占う",
    how: `<p>相手との縁は、数秘術・九星気学・四柱推命・星座・宿曜・マヤ暦・インド占星術・宇宙盤の8つの占術の相性をまとめた総合点で見ています（相手の生年月日を入れたときだけ）。気持ちを伝えやすい月は、あなたの数秘術のパーソナルマンス（月ごとのテーマ）から、「新しい一歩」「距離が縮まる」「愛情が深まる」に向く月を選んでいます。</p>
    <p>アドバイスは、選んでいただいた今の関係に合わせた文章です。恋は相手のペースも大切。占いは、あなたが一歩を踏み出すための目安として使ってください。</p>`,
    more: `<p>別れた相手とのことは<a href="../fukuen/">復縁占い</a>で、ふたりの相性をくわしく見るなら<a href="../aisho/">相性占い（8つの占術の総合診断）</a>で、名前だけで見るなら<a href="../suhijutsu/namae/">名前の相性</a>で占えます。好きな人の夢を見たときは<a href="../yume/sukinahito/">好きな人の夢の意味</a>もどうぞ。</p>`
  }
};

for (const [slug, p] of Object.entries(PAGES)) {
  const rel = `${slug}/`;
  const head = TEMPLATE.slice(0, TEMPLATE.indexOf("<main"))
    .replace(/<title>.*?<\/title>/, `<title>${esc(p.title)}</title>`)
    .replace(/<meta name="description" content=".*?">/, `<meta name="description" content="${esc(p.desc)}">`)
    .replace(/https:\/\/emiri-uranai\.com\/learn\/suhijutsu\//g, `https://emiri-uranai.com/${rel}`)
    .replace(/<meta property="og:title" content=".*?">/, `<meta property="og:title" content="${esc(p.ogTitle)}">`)
    .replace(/<meta property="og:description" content=".*?">/, `<meta property="og:description" content="${esc(p.lead.slice(0, 60))}">`)
    .replace('<li><a href="../../learn/" aria-current="page">占いを知る</a></li>', '<li><a href="../../learn/">占いを知る</a></li>')
    .replace('<link rel="stylesheet" href="../../assets/css/common.css">', `<link rel="stylesheet" href="../../assets/css/common.css">\n<link rel="stylesheet" href="../../assets/css/tekishoku.css">\n<link rel="stylesheet" href="../../assets/css/sougou-aisho.css">\n${SCRIPTS.map((s) => `<script defer src="../../assets/js/${s}"></script>`).join("\n")}`)
    .replace(/"\.\.\/\.\.\//g, '"../');
  const foot = TEMPLATE.slice(TEMPLATE.indexOf("<footer")).replace(/"\.\.\/\.\.\//g, '"../');
  const body = `<main id="main" class="wrap-narrow">
  <nav class="breadcrumb" aria-label="パンくずリスト">
    <ol>
      <li><a href="../">えみり</a></li>
      <li aria-current="page">${slug === "fukuen" ? "復縁占い" : "片思い占い"}</li>
    </ol>
  </nav>

  <section class="hero">
    <p class="eyebrow">${p.eyebrow}</p>
    <h1>${esc(p.h1)}</h1>
    <p>${esc(p.lead)}</p>
    <ul class="badges" aria-label="特徴">
      <li class="badge">完全無料</li>
      <li class="badge">登録なし</li>
      <li class="badge">8つの占術</li>
    </ul>
  </section>

  <form id="renai-form" class="card" novalidate data-kind="${slug}">
    <div data-birthdate="self"></div>
    <div data-birthdate="partner"></div>
    <p class="ub-form-note">お相手の生年月日がわからなければ、空けたままで大丈夫です（ふたりの縁の点数だけ出ません）。</p>
${p.qs.join("\n")}
    <button type="submit" class="btn">${p.button}</button>
  </form>

  <div id="renai-result" class="sg-result" hidden></div>

  <section class="card prose" aria-labelledby="rn-how">
    <h2 id="rn-how">${slug === "fukuen" ? "復縁占い" : "片思い占い"}のしくみ</h2>
    ${p.how}
    ${p.more}
  </section>
</main>

`;
  fs.mkdirSync(path.join(ROOT, rel), { recursive: true });
  fs.writeFileSync(path.join(ROOT, rel, "index.html"), head + body + foot);
}
console.log("fukuen/・kataomoi/ を作成");
