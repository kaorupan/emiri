#!/usr/bin/env node
/*
 * 12星座の相性一覧：horoscope/seiza-aisho/index.html を作る
 *
 *   node tools/seiza-aisho/generate.mjs
 *
 * 星座どうしの角度（アスペクト）で相性を読む。0°同じ星座／30°／60°セクスタイル／90°スクエア／120°トライン／150°／180°オポジション。
 * 誕生日（月日）だけで占えるフォームつき（星座の境目の日は年によって変わるため、ページに注意書き）。
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const TEMPLATE = fs.readFileSync(path.join(ROOT, "learn/suhijutsu/index.html"), "utf8");
const rel = "horoscope/seiza-aisho/";

export const SIGNS = ["牡羊座", "牡牛座", "双子座", "蟹座", "獅子座", "乙女座", "天秤座", "蠍座", "射手座", "山羊座", "水瓶座", "魚座"];
const ELEMENT = ["火", "地", "風", "水"];
const RANGE = ["3/21〜4/19", "4/20〜5/20", "5/21〜6/21", "6/22〜7/22", "7/23〜8/22", "8/23〜9/22", "9/23〜10/23", "10/24〜11/22", "11/23〜12/21", "12/22〜1/19", "1/20〜2/18", "2/19〜3/20"];
export const REL = {
  4: { score: 95, mark: "◎", name: "最高の相性（トライン）", text: "同じエレメントの星座どうし。価値観や感じ方が近く、一緒にいて自然体でいられる相性です。" },
  2: { score: 88, mark: "◎", name: "高め合う相性（セクスタイル）", text: "補い合うエレメントの星座どうし。会話が弾みやすく、お互いのよさを引き出し合えます。" },
  6: { score: 82, mark: "○", name: "惹かれ合う相性（オポジション）", text: "正反対の星座どうし。自分にないものを持つ相手に強く惹かれます。ちがいを認め合えると、最高のパートナーに。" },
  0: { score: 80, mark: "○", name: "似た者同士（同じ星座）", text: "同じ星座どうし。共感しやすく話が早い一方、苦手なところも似ているので、ときどき役割を分けて。" },
  1: { score: 70, mark: "△", name: "ゆっくり育つ相性（となりの星座）", text: "となりどうしの星座。性格のタイプはちがいますが、時間をかけるほど理解し合えます。" },
  5: { score: 66, mark: "△", name: "歩み寄りが鍵の相性（150°）", text: "見ている方向がちがう星座どうし。相手のペースに合わせる工夫が、関係を育てます。" },
  3: { score: 62, mark: "△", name: "刺激し合う相性（スクエア）", text: "ぶつかりやすい角度の星座どうし。意見のちがいはありますが、そのぶんお互いを成長させる関係です。" }
};
export function relation(a, b) { const d = Math.abs(a - b) % 12; return Math.min(d, 12 - d) === 6 ? 6 : Math.min(d, 12 - d) === 5 ? 5 : Math.min(d, 12 - d) === 4 ? 4 : Math.min(d, 12 - d) === 3 ? 3 : Math.min(d, 12 - d) === 2 ? 2 : Math.min(d, 12 - d); }

const title = "12星座の相性ランキングと早見表｜誕生日だけでわかる星座の相性占い（無料）｜えみり";
const desc = "12星座どうしの相性を、早見表と星座別ランキングで紹介します。誕生日（月と日）を選ぶだけで、ふたりの星座の相性を無料で占えます。恋愛・友達・夫婦の相性の目安に。";
const head = TEMPLATE.slice(0, TEMPLATE.indexOf("<main"))
  .replace(/<title>.*?<\/title>/, `<title>${esc(title)}</title>`)
  .replace(/<meta name="description" content=".*?">/, `<meta name="description" content="${esc(desc)}">`)
  .replace(/https:\/\/emiri-uranai\.com\/learn\/suhijutsu\//g, `https://emiri-uranai.com/${rel}`)
  .replace(/<meta property="og:title" content=".*?">/, `<meta property="og:title" content="12星座の相性ランキングと早見表｜えみり">`)
  .replace(/<meta property="og:description" content=".*?">/, `<meta property="og:description" content="誕生日だけで、ふたりの星座の相性がわかります。">`)
  .replace('<li><a href="../../learn/" aria-current="page">占いを知る</a></li>', '<li><a href="../../learn/">占いを知る</a></li>')
  .replace('<link rel="stylesheet" href="../../assets/css/common.css">', `<link rel="stylesheet" href="../../assets/css/common.css">\n<link rel="stylesheet" href="../../assets/css/sougou-aisho.css">\n<script defer src="../../assets/js/pages/seiza-aisho-page.js"></script>`);
const foot = TEMPLATE.slice(TEMPLATE.indexOf("<footer"));
const opt = (n, unit) => Array.from({ length: n }, (_, i) => `<option value="${i + 1}">${i + 1}${unit}</option>`).join("");
const dateSel = (p, legend) => `<fieldset class="at-fields">
      <legend>${legend}</legend>
      <label for="sz-${p}-m">月</label><select id="sz-${p}-m" required><option value="">--</option>${opt(12, "月")}</select>
      <label for="sz-${p}-d">日</label><select id="sz-${p}-d" required><option value="">--</option>${opt(31, "日")}</select>
    </fieldset>`;

const matrix = `<div class="sz-table-wrap" tabindex="0" role="region" aria-label="12星座の相性早見表（横にスクロールできます）">
    <table class="sz-table">
      <caption>12星座の相性早見表（◎とてもよい ○よい △育てる相性）</caption>
      <thead><tr><th scope="col">星座</th>${SIGNS.map((s) => `<th scope="col">${s.replace("座", "")}</th>`).join("")}</tr></thead>
      <tbody>
${SIGNS.map((s, i) => `        <tr><th scope="row">${s}</th>${SIGNS.map((_, j) => `<td class="sz-m${REL[relation(i, j)].mark === "◎" ? 1 : REL[relation(i, j)].mark === "○" ? 2 : 3}">${REL[relation(i, j)].mark}</td>`).join("")}</tr>`).join("\n")}
      </tbody>
    </table>
  </div>`;

const perSign = SIGNS.map((s, i) => {
  const order = SIGNS.map((t, j) => ({ t, j, r: REL[relation(i, j)] })).sort((a, b) => b.r.score - a.r.score || a.j - b.j);
  return `  <section class="card prose sz-sign" id="sz-${i}" aria-labelledby="sz-${i}-t">
    <h2 id="sz-${i}-t">${s}の相性ランキング</h2>
    <p class="sg-note">${s}（${RANGE[i]}ごろ生まれ・${ELEMENT[i % 4]}のエレメント）と、12星座の相性です。</p>
    <ol class="sz-rank">
${order.map((o, k) => `      <li><b>${k + 1}位 ${o.t}</b>：${esc(o.r.name)}</li>`).join("\n")}
    </ol>
    <p>${esc(`${s}がいちばん自然体でいられるのは、同じ${ELEMENT[i % 4]}のエレメントの${SIGNS.filter((_, j) => j !== i && relation(i, j) === 4).join("と")}。正反対の${SIGNS[(i + 6) % 12]}とは、強く惹かれ合う関係です。`)}</p>
  </section>`;
}).join("\n\n");

const body = `<main id="main" class="wrap-narrow">
  <nav class="breadcrumb" aria-label="パンくずリスト">
    <ol>
      <li><a href="../../">えみり</a></li>
      <li><a href="../../aisho/">相性占い</a></li>
      <li aria-current="page">12星座の相性</li>
    </ol>
  </nav>

  <section class="hero">
    <p class="eyebrow">ZODIAC COMPATIBILITY</p>
    <h1>12星座の相性ランキングと早見表</h1>
    <p>ふたりの誕生日（月と日）を選ぶだけで、星座の相性がわかります。12星座どうしの相性の早見表と、星座別のランキングも紹介します。生まれ年がわからない相手とも占えます。</p>
  </section>

  <form id="seiza-form" class="card" novalidate>
    ${dateSel("a", "あなたの誕生日")}
    ${dateSel("b", "お相手の誕生日")}
    <p id="sz-error" class="form-error" role="alert" hidden></p>
    <button type="submit" class="btn">星座の相性を見る</button>
    <div id="seiza-result" class="at-result" aria-live="polite" hidden></div>
  </form>

  <section class="card" aria-labelledby="sz-matrix-title">
    <h2 id="sz-matrix-title">12星座の相性早見表</h2>
    ${matrix}
    <ul class="sz-legend">
${[4, 2, 6, 0, 1, 5, 3].map((k) => `      <li><b>${REL[k].mark} ${esc(REL[k].name)}</b>：${esc(REL[k].text)}</li>`).join("\n")}
    </ul>
  </section>

${perSign}

  <section class="card prose" aria-labelledby="sz-how">
    <h2 id="sz-how">星座の相性の見方</h2>
    <p>12星座は、黄道（太陽の通り道）を30°ずつに分けたものです。ふたりの星座が黄道の上で何度はなれているか（アスペクト）で、相性を読みます。120°（同じエレメント）と60°（補い合うエレメント）は調和しやすい角度、90°は刺激し合う角度、180°は正反対で惹かれ合う角度とされます。</p>
    <p>星座の境目の日（3月20日・21日ごろなど）は、生まれた年によって星座が変わることがあります。生年月日がわかるときは、月の星座や金星・火星まで見る<a href="../aisho/">ホロスコープの相性</a>や、8つの占術で見る<a href="../../aisho/">総合相性</a>がおすすめです。それぞれの誕生日の星座は<a href="../../tanjobi/">誕生日占い</a>で確かめられます。</p>
  </section>
</main>

`;
fs.mkdirSync(path.join(ROOT, rel), { recursive: true });
fs.writeFileSync(path.join(ROOT, rel, "index.html"), head + body + foot);
console.log("horoscope/seiza-aisho/ を作成");
