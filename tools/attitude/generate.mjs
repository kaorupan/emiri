#!/usr/bin/env node
/*
 * 数秘術のアティチュードナンバー：suhijutsu/attitude/index.html を作る
 *
 *   node tools/attitude/generate.mjs
 *
 * 数字ごとの文章は content/numerology-text.js の「第一印象（アティチュード）」の読みを使う（各数字の代表の誕生日から作る）。
 */
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const require = createRequire(import.meta.url);
const num = require(path.join(ROOT, "assets/js/engines/numerology.js"));
const text = require(path.join(ROOT, "assets/js/content/numerology-text.js"));
const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const TEMPLATE = fs.readFileSync(path.join(ROOT, "learn/suhijutsu/index.html"), "utf8");
const rel = "suhijutsu/attitude/";

// 数字ごとの読み（代表の誕生日から）と、その数字になる誕生日の例
const byNum = new Map();
for (let m = 1; m <= 12; m++) for (let d = 1; d <= 31; d++) {
  if (d > new Date(Date.UTC(2000, m, 0)).getUTCDate()) continue;
  const at = num.attitudeNumber(m, d);
  if (!byNum.has(at)) {
    const r = num.calculateNumerology({ year: 2000, month: m, day: d }, { targetYear: 2026 });
    byNum.set(at, { at, view: text.buildPersonal(r).attitude, examples: [] });
  }
  const e = byNum.get(at);
  if (e.examples.length < 4) e.examples.push(`${m}月${d}日`);
}
const nums = [...byNum.keys()].sort((a, b) => a - b);

const title = "アティチュードナンバーとは？出し方と1〜9・11の意味｜数秘術で見る第一印象｜えみり";
const desc = "数秘術のアティチュードナンバー（第一印象の数字）を誕生日から計算できます。出し方と、1〜9・11それぞれの意味、まわりからどう見えやすいか、ライフパスナンバーとのちがいをわかりやすく解説します。";
const scripts = ["core/dom.js", "engines/numerology.js", "pages/attitude-page.js"].map((s) => `<script defer src="../../assets/js/${s}"></script>`).join("\n");
const head = TEMPLATE.slice(0, TEMPLATE.indexOf("<main"))
  .replace(/<title>.*?<\/title>/, `<title>${esc(title)}</title>`)
  .replace(/<meta name="description" content=".*?">/, `<meta name="description" content="${esc(desc)}">`)
  .replace(/https:\/\/emiri-uranai\.com\/learn\/suhijutsu\//g, `https://emiri-uranai.com/${rel}`)
  .replace(/<meta property="og:title" content=".*?">/, `<meta property="og:title" content="アティチュードナンバーとは？出し方と意味｜えみり">`)
  .replace(/<meta property="og:description" content=".*?">/, `<meta property="og:description" content="誕生日から、数秘術で見る第一印象の数字を出せます。">`)
  .replace('<li><a href="../../learn/" aria-current="page">占いを知る</a></li>', '<li><a href="../../learn/">占いを知る</a></li>')
  .replace('<link rel="stylesheet" href="../../assets/css/common.css">', `<link rel="stylesheet" href="../../assets/css/common.css">\n${scripts}`);
const foot = TEMPLATE.slice(TEMPLATE.indexOf("<footer"));
const opt = (n, unit) => Array.from({ length: n }, (_, i) => `<option value="${i + 1}">${i + 1}${unit}</option>`).join("");

const body = `<main id="main" class="wrap-narrow">
  <nav class="breadcrumb" aria-label="パンくずリスト">
    <ol>
      <li><a href="../../">えみり</a></li>
      <li><a href="../">数秘術</a></li>
      <li aria-current="page">アティチュードナンバー</li>
    </ol>
  </nav>

  <section class="hero">
    <p class="eyebrow">ATTITUDE NUMBER</p>
    <h1>アティチュードナンバーとは？出し方と、数字ごとの意味</h1>
    <p>アティチュードナンバーは、数秘術で「第一印象」や「まわりから最初に見えやすい性質」を表す数字です。生まれた月と日だけで出せます。下で誕生日を選ぶと、あなたの数字と意味がわかります。</p>
  </section>

  <form id="attitude-form" class="card" novalidate>
    <fieldset class="at-fields">
      <legend>あなたの誕生日</legend>
      <label for="at-month">月</label>
      <select id="at-month" name="month" required><option value="">--</option>${opt(12, "月")}</select>
      <label for="at-day">日</label>
      <select id="at-day" name="day" required><option value="">--</option>${opt(31, "日")}</select>
    </fieldset>
    <p id="at-error" class="form-error" role="alert" hidden></p>
    <button type="submit" class="btn">アティチュードナンバーを出す</button>
    <div id="attitude-result" class="at-result" aria-live="polite" hidden></div>
  </form>

  <section class="card prose" aria-labelledby="at-how">
    <h2 id="at-how">アティチュードナンバーの出し方</h2>
    <p>生まれた月と日の数字を、1けたずつすべて足します。答えが2けたなら、さらに1けたずつ足して、1〜9になるまでくり返します。とちゅうで11になったときは、マスターナンバーとしてそのまま残します。</p>
    <ul>
      <li>2月15日生まれ：2＋1＋5＝<strong>8</strong></li>
      <li>11月29日生まれ：1＋1＋2＋9＝13 → 1＋3＝<strong>4</strong></li>
      <li>9月2日生まれ：9＋2＝<strong>11</strong>（マスターナンバー）</li>
    </ul>
    <p>月と日だけで出すため、同じ誕生日の人はみんな同じ数字になります。生まれ年まで使うライフパスナンバーが「本質」を表すのに対して、アティチュードナンバーは「外から見えるあなた」を表すとされます。ふたつの数字がちがう人は、「最初の印象と、仲よくなってからの印象がちがう」と言われやすいでしょう。</p>
  </section>

  <section class="card prose" aria-labelledby="at-list">
    <h2 id="at-list">数字ごとの意味</h2>
${nums.map((n) => { const e = byNum.get(n); const v = e.view; return `    <h3 id="at-${n}">アティチュードナンバー${n}${n === 11 ? "（マスターナンバー）" : ""}</h3>
    <p>${esc(v.text)}</p>
    <ul>
      <li><strong>まわりに伝わる強み</strong>：${esc(v.gift)}</li>
      <li><strong>大切にしたいこと</strong>：${esc(v.need)}</li>
      <li><strong>気をつけたいこと</strong>：${esc(v.risk)}</li>
      <li><strong>この数字になる誕生日の例</strong>：${esc(e.examples.join("・"))}など</li>
    </ul>`; }).join("\n")}
  </section>

  <section class="card prose" aria-labelledby="at-more">
    <h2 id="at-more">ほかの数字もあわせて見る</h2>
    <p>数秘術では、生年月日すべてから出すライフパスナンバー（本質）、生まれた日から出すバースデーナンバー（才能）、そしてアティチュードナンバー（第一印象）を組み合わせて読みます。生まれ年まで入れると、すべての数字をまとめて占えます。</p>
    <p><a class="btn" href="../">数秘術ですべての数字を占う</a></p>
    <p>数秘術のしくみは<a href="../../learn/suhijutsu/">数秘術とは？</a>で、誕生日ごとの性格は<a href="../../tanjobi/">誕生日占い</a>で見られます。</p>
  </section>
</main>

`;
fs.mkdirSync(path.join(ROOT, rel), { recursive: true });
fs.writeFileSync(path.join(ROOT, rel, "index.html"), head + body + foot);
console.log(`suhijutsu/attitude/ を作成（${nums.join("・")}）`);
