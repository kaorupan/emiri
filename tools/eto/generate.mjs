/*
 * 干支：eto/index.html（干支を調べるページ・今年の干支・早見表）と、十二支ごとのページ eto/<支>/ を作る
 *
 *   node tools/eto/generate.mjs
 *
 * 「今年」は実行した日の日本時間の西暦（干支の年の区切りは1月1日）。毎日の自動更新（daily）でも実行する。
 */
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const require = createRequire(import.meta.url);
const E = require(path.join(ROOT, "assets/js/engines/eto.js"));
const T = require(path.join(ROOT, "assets/js/content/eto-text.js"));

const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const NOW = process.env.ETO_YEAR ? Number(process.env.ETO_YEAR) : new Date(Date.now() + 9 * 3600e3).getUTCFullYear();
const YEARS = [NOW, NOW + 1];
const FROM = 1924, TO = 2035;

const TEMPLATE = fs.readFileSync(path.join(ROOT, "learn/suhijutsu/index.html"), "utf8");
function head(rel, title, desc, ogTitle, ogDesc, depth, extraHead = "") {
  let h = TEMPLATE.slice(0, TEMPLATE.indexOf("<main"))
    .replace(/<title>.*?<\/title>/, `<title>${esc(title)}</title>`)
    .replace(/<meta name="description" content=".*?">/, `<meta name="description" content="${esc(desc)}">`)
    .replace(/https:\/\/emiri-uranai\.com\/learn\/suhijutsu\//g, `https://emiri-uranai.com/${rel}`)
    .replace(/<meta property="og:title" content=".*?">/, `<meta property="og:title" content="${esc(ogTitle)}">`)
    .replace(/<meta property="og:description" content=".*?">/, `<meta property="og:description" content="${esc(ogDesc)}">`)
    .replace('<li><a href="../../learn/" aria-current="page">占いを知る</a></li>', '<li><a href="../../learn/">占いを知る</a></li>')
    .replace('<link rel="stylesheet" href="../../assets/css/common.css">', '<link rel="stylesheet" href="../../assets/css/common.css">\n<link rel="stylesheet" href="../../assets/css/kyusei.css">\n<link rel="stylesheet" href="../../assets/css/kippoui.css">' + extraHead);
  if (depth === 1) h = h.replace(/"\.\.\/\.\.\//g, '"../');
  return h;
}
const FOOT = TEMPLATE.slice(TEMPLATE.indexOf("<footer"));
const foot = (depth) => (depth === 1 ? FOOT.replace(/"\.\.\/\.\.\//g, '"../') : FOOT);
function write(rel, html) {
  const dir = path.join(ROOT, rel);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, "index.html"), html);
}

function yearIntro(y) {
  const e = E.etoOfYear(y), st = T.STEMS[e.stemIndex], br = T.BRANCHES[e.branchIndex];
  let t = `${y}年の干支は「${e.name}（${e.reading}）」です。十干の「${e.stem}（${st[2]}）」は${st[3]}、十二支の「${e.branch}（${br.animal}）」は${br.keyword}を表します。`;
  if (e.name === "丙午") t += "丙午は「火の気が重なる、情熱と勢いのある年」とされます。丙午の年に生まれた女性についての古い言い伝えがありますが、根拠のない迷信です。";
  return t;
}

function branchPage(i) {
  const b = T.BRANCHES[i];
  const rel = `eto/${b.slug}/`;
  const years = E.yearsOf(i, FROM, TO);
  const rows = years.map((y) => `${y}年（${E.etoOfYear(y).name}）`).join("、");
  const rels = YEARS.map((y) => {
    const e = E.etoOfYear(y), r = T.RELATION[E.relation(i, e.branchIndex)];
    return `    <h3>${y}年（${e.name}年）：${r.label}</h3>\n    <p>${esc(r.text)}</p>`;
  }).join("\n");
  const good = [], hard = [];
  for (let j = 0; j < 12; j++) {
    if (j === i) continue;
    const r = E.relation(i, j);
    if (r === "sangou" || r === "shigou") good.push(j);
    if (r === "chuu") hard.push(j);
  }
  const link = (j) => `<a href="../${T.BRANCHES[j].slug}/">${T.BRANCHES[j].kanji}年（${T.BRANCHES[j].animal}）</a>`;
  const others = T.BRANCHES.map((x, j) => (j === i ? "" : `      <li><a href="../${x.slug}/"><b>${x.kanji}</b>${x.animal}年</a></li>`)).filter(Boolean).join("\n");
  const body = `<main id="main" class="wrap-narrow">
  <nav class="breadcrumb" aria-label="パンくずリスト">
    <ol>
      <li><a href="../../">えみり</a></li>
      <li><a href="../">干支</a></li>
      <li aria-current="page">${b.kanji}年</li>
    </ol>
  </nav>

  <section class="hero">
    <p class="eyebrow">ETO · ${b.kanji}</p>
    <h1>${b.kanji}年（${b.animal}年）生まれの性格と運勢</h1>
    <div class="eto-badge"><b>${b.kanji}</b><span>${b.reading}・${b.animal}・五行の${b.element}</span></div>
    <p>キーワードは「${esc(b.keyword)}」。${b.kanji}年生まれの人の性格・恋愛・仕事と、相性の良い干支、${YEARS[0]}年・${YEARS[1]}年の運気の流れを紹介します。</p>
  </section>

  <section class="card prose" aria-labelledby="eto-char-title">
    <p class="eyebrow">CHARACTER</p>
    <h2 id="eto-char-title">${b.kanji}年生まれの性格</h2>
    <p>${esc(b.character)}</p>
    <h3>恋愛</h3>
    <p>${esc(b.love)}</p>
    <h3>仕事</h3>
    <p>${esc(b.work)}</p>
    <h3>開運のヒント</h3>
    <p>${esc(b.luck)}</p>
  </section>

  <section class="card prose" aria-labelledby="eto-compat-title">
    <p class="eyebrow">COMPATIBILITY</p>
    <h2 id="eto-compat-title">${b.kanji}年生まれと相性の良い干支</h2>
    <p><strong>相性が良い</strong>：${good.map(link).join("、")}。三合・支合と呼ばれる、力を合わせやすい組み合わせです。</p>
    <p><strong>刺激し合う</strong>：${hard.map(link).join("、")}。冲（ちゅう）と呼ばれる正反対の組み合わせで、違いから学び合える関係です。</p>
    <p class="kyusei-meta">干支の相性は、生まれ年の十二支どうしの関係（三合・支合・冲）で見る一般的な見方です。</p>
  </section>

  <section class="card prose" aria-labelledby="eto-year-title">
    <p class="eyebrow">THIS YEAR</p>
    <h2 id="eto-year-title">${b.kanji}年生まれの${YEARS[0]}年・${YEARS[1]}年</h2>
${rels}
  </section>

  <section class="card prose" aria-labelledby="eto-years-title">
    <p class="eyebrow">YEARS</p>
    <h2 id="eto-years-title">${b.kanji}年生まれの年（${FROM}〜${TO}年）</h2>
    <p class="eto-years">${rows}</p>
    <p class="kyusei-meta">「〇〇年生まれ」の干支は、ふだんは1月1日で区切ります。四柱推命や九星気学では立春（2月4日ごろ）で区切るため、1月1日〜立春の前に生まれた人は前の年の干支になります。</p>
  </section>

  <section class="card" aria-labelledby="eto-others-title">
    <h2 id="eto-others-title">ほかの干支</h2>
    <ul class="eto-grid">
${others}
    </ul>
    <p class="learn-actions"><a class="btn btn-ghost" href="../../kippoui/" style="max-width:320px">今年の吉方位も調べる</a></p>
  </section>
</main>

`;
  write(rel, head(rel, `${b.kanji}年（${b.animal}年）生まれの性格・相性・運勢｜何年生まれ？｜えみり`,
    `${b.kanji}年（${b.animal}年）生まれの人の性格・恋愛・仕事、相性の良い干支、${YEARS[0]}年・${YEARS[1]}年の運気を紹介。${b.kanji}年生まれの年（${years.filter((y) => y >= 1960 && y <= 2030).join("・")}年など）の一覧も。`,
    `${b.kanji}年生まれの性格と運勢｜えみり`, `キーワードは「${b.keyword}」。`, 2) + body + foot(2));
}

function indexPage() {
  const extra = `
<script defer src="../assets/js/core/dom.js"></script>
<script defer src="../assets/js/engines/eto.js"></script>
<script defer src="../assets/js/content/eto-text.js"></script>
<script defer src="../assets/js/pages/eto-page.js"></script>`;
  const options = [];
  for (let y = TO; y >= FROM; y--) options.push(`<option value="${y}"${y === 1990 ? " selected" : ""}>${y}年</option>`);
  const table = [];
  for (let y = FROM; y <= TO; y++) {
    const e = E.etoOfYear(y);
    table.push(`<tr><td>${y}年</td><td>${e.name}（${e.reading}）</td><td><a href="${T.BRANCHES[e.branchIndex].slug}/">${e.branch}・${T.BRANCHES[e.branchIndex].animal}</a></td></tr>`);
  }
  const yearCards = YEARS.map((y) => {
    const e = E.etoOfYear(y);
    return `  <section class="card prose" aria-labelledby="eto-y${y}">
    <p class="eyebrow">${y}</p>
    <h2 id="eto-y${y}">${y}年の干支は「${e.name}」</h2>
    <div class="eto-badge"><b>${e.name}</b><span>${e.reading}</span></div>
    <p>${esc(yearIntro(y))}</p>
  </section>`;
  }).join("\n\n");
  const body = `<main id="main" class="wrap-narrow">
  <nav class="breadcrumb" aria-label="パンくずリスト">
    <ol>
      <li><a href="../">えみり</a></li>
      <li aria-current="page">干支</li>
    </ol>
  </nav>

  <section class="hero">
    <p class="eyebrow">ETO</p>
    <h1>干支（えと）を調べる</h1>
    <p>生まれ年の干支と、十二支ごとの性格・相性・運勢を紹介します。${YEARS[0]}年・${YEARS[1]}年の干支や、${FROM}年〜${TO}年の干支の早見表も。</p>
  </section>

  <form id="eto-form" class="card kyusei-form" novalidate onsubmit="return false">
    <div class="eto-form-row">
      <div class="bd-cell"><label for="eto-year">生まれた年（西暦）</label><select id="eto-year" class="bd-input">${options.join("")}</select></div>
      <button type="submit" class="btn">調べる</button>
    </div>
    <div id="eto-result" aria-live="polite"></div>
  </form>

${yearCards}

  <section class="card" aria-labelledby="eto-list-title">
    <h2 id="eto-list-title">十二支ごとの性格と運勢</h2>
    <ul class="eto-grid">
${T.BRANCHES.map((x) => `      <li><a href="${x.slug}/"><b>${x.kanji}</b>${x.animal}年<small>${esc(x.keyword)}</small></a></li>`).join("\n")}
    </ul>
  </section>

  <section class="card prose" aria-labelledby="eto-about-title">
    <h2 id="eto-about-title">干支とは？</h2>
    <p>干支は、10種類の「十干（じっかん）」と、12種類の「十二支（じゅうにし）」を組み合わせたものです。甲子（きのえね）から始まり、60通りで一巡します。60歳を「還暦」と呼ぶのは、生まれた年の干支に還るからです。</p>
    <h3>十干</h3>
    <p>${T.STEMS.map((s) => `${s[0]}（${s[1]}・${s[2]}）`).join("、")}。五行（木・火・土・金・水）をそれぞれ「兄（え）」と「弟（と）」に分けたもので、「えと」という呼び名はここから来ています。</p>
    <h3>十二支</h3>
    <p>${T.BRANCHES.map((b) => `${b.kanji}（${b.reading}）`).join("、")}。もとは年・月・時刻・方角を表す記号で、のちに動物が当てられました。</p>
    <p class="kyusei-meta">「〇〇年生まれ」の干支は、ふだんは1月1日で区切ります。四柱推命や九星気学では立春（2月4日ごろ）で区切るため、えみりの四柱推命・九星気学の結果とは、1月1日〜立春の前に生まれた人で年がずれることがあります。</p>
  </section>

  <section class="card" aria-labelledby="eto-table-title">
    <h2 id="eto-table-title">干支の早見表（${FROM}〜${TO}年）</h2>
    <div class="kp-table-wrap"><table class="kp-table">
      <thead><tr><th scope="col">生まれ年</th><th scope="col">干支</th><th scope="col">十二支</th></tr></thead>
      <tbody>
${table.join("\n")}
      </tbody>
    </table></div>
  </section>
</main>

`;
  write("eto/", head("eto/", `干支（えと）早見表｜${YEARS[0]}年は${E.etoOfYear(YEARS[0]).name}｜十二支別の性格と相性｜えみり`,
    `生まれ年の干支がわかる早見表（${FROM}〜${TO}年）。${YEARS[0]}年の干支「${E.etoOfYear(YEARS[0]).name}」、${YEARS[1]}年の干支「${E.etoOfYear(YEARS[1]).name}」の意味と、十二支ごとの性格・恋愛・仕事・相性を紹介します。`,
    "干支（えと）を調べる｜えみり", `${YEARS[0]}年は${E.etoOfYear(YEARS[0]).name}。十二支別の性格と相性も。`, 1, extra) + body + foot(1));
}

for (let i = 0; i < 12; i++) branchPage(i);
indexPage();
console.log(`eto: 十二支12ページ＋一覧（今年＝${NOW}年 ${E.etoOfYear(NOW).name}）`);
