/*
 * ほくろ占い：hokuro/index.html（位置の一覧と見方）、場所ごとのページ hokuro/<場所>/、テーマ別 hokuro/<テーマ>/ を作る
 *
 *   node tools/hokuro/generate.mjs
 *
 * 図は tools/hokuro/svg.mjs、文章は tools/hokuro/data.mjs（どちらも、えみりのオリジナル）。
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { figure } from "./svg.mjs";
import { AREAS, SPOTS, HUBS } from "./data.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const bySlug = new Map(SPOTS.map((s) => [s.slug, s]));
const hubById = new Map(HUBS.map((h) => [h.id, h]));
for (const s of SPOTS) {
  for (const r of s.related) if (!bySlug.has(r)) throw new Error(`${s.slug}: related ${r} がない`);
  for (const t of s.themes) if (!hubById.has(t)) throw new Error(`${s.slug}: theme ${t} がない`);
  if (hubById.has(s.slug)) throw new Error(`${s.slug} がテーマと重なる`);
}
const num = new Map(SPOTS.map((s, i) => [s.slug, i + 1]));

const TEMPLATE = fs.readFileSync(path.join(ROOT, "learn/suhijutsu/index.html"), "utf8");
function head(rel, title, desc, ogTitle, ogDesc, depth) {
  let h = TEMPLATE.slice(0, TEMPLATE.indexOf("<main"))
    .replace(/<title>.*?<\/title>/, `<title>${esc(title)}</title>`)
    .replace(/<meta name="description" content=".*?">/, `<meta name="description" content="${esc(desc)}">`)
    .replace(/https:\/\/emiri-uranai\.com\/learn\/suhijutsu\//g, `https://emiri-uranai.com/${rel}`)
    .replace(/<meta property="og:title" content=".*?">/, `<meta property="og:title" content="${esc(ogTitle)}">`)
    .replace(/<meta property="og:description" content=".*?">/, `<meta property="og:description" content="${esc(ogDesc)}">`)
    .replace('<li><a href="../../learn/" aria-current="page">占いを知る</a></li>', '<li><a href="../../learn/">占いを知る</a></li>')
    .replace('<link rel="stylesheet" href="../../assets/css/common.css">', '<link rel="stylesheet" href="../../assets/css/common.css">\n<link rel="stylesheet" href="../../assets/css/hokuro.css">');
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
const crumb = (items) => `  <nav class="breadcrumb" aria-label="パンくずリスト">
    <ol>
${items.map(([t, h]) => (h ? `      <li><a href="${h}">${esc(t)}</a></li>` : `      <li aria-current="page">${esc(t)}</li>`)).join("\n")}
    </ol>
  </nav>`;
const HEALTH = `<p class="notice">ほくろ占いは、自分を見つめ直すヒントとして楽しむものです。ほくろが急に大きくなる、形や色が変わる、にじんだように広がる、出血するなどの変化があるときは、占いではなく皮膚科で相談してください。</p>`;
const LR = "顔のほくろは、一般に「本人から見て左側は内面や家庭・身近な人との縁」「右側は社会や仕事・外の世界との縁」が強く出るといわれます。図は向かって見た位置なので、鏡で見るときと左右が同じになります。";

function spotPage(s) {
  const rel = `hokuro/${s.slug}/`;
  const area = AREAS.find((a) => a.id === s.area);
  const same = SPOTS.filter((x) => x.area === s.area && x.slug !== s.slug);
  const body = `<main id="main" class="wrap-narrow">
${crumb([["えみり", "../../"], ["ほくろ占い", "../"], [`${s.name}のほくろ`]])}

  <section class="hero">
    <p class="eyebrow">MOLE READING · ${esc(area.name)}</p>
    <h1>${esc(s.name)}のほくろの意味</h1>
    <p class="hk-keyword">${esc(s.keyword)}</p>
    <p>${esc(s.summary)}</p>
  </section>

  <section class="card hk-where" aria-labelledby="hk-where-title">
    <p class="eyebrow">WHERE</p>
    <h2 id="hk-where-title">${esc(s.name)}のほくろの位置</h2>
    <div class="hk-where-body">
      ${figure({ area: s.area, hl: [{ x: s.x, y: s.y }], title: `${s.name}のほくろの位置` })}
      <p>${esc(s.meaning)}</p>
    </div>
    <p class="kyusei-meta">図は、向かって見た位置です（鏡で見たときと同じ向き）。左右どちらにあっても、基本の意味は同じです。</p>
  </section>

  <section class="card prose" aria-labelledby="hk-life-title">
    <p class="eyebrow">LOVE &amp; MONEY</p>
    <h2 id="hk-life-title">恋愛・仕事・金運での意味</h2>
    <h3>恋愛</h3>
    <p>${esc(s.love)}</p>
    <h3>仕事・金運</h3>
    <p>${esc(s.money)}</p>
    <h3>ひとこと</h3>
    <p>${esc(s.advice)}</p>
${s.area === "face" ? `    <h3>右と左で違う？</h3>\n    <p>${esc(LR)}</p>\n` : ""}  </section>

  <section class="card" aria-labelledby="hk-rel-title">
    <p class="eyebrow">RELATED</p>
    <h2 id="hk-rel-title">あわせて見たいほくろ</h2>
    <ul class="yume-tags hk-tags">
${s.related.map((r) => `      <li><a href="../${r}/">${esc(bySlug.get(r).name)}のほくろ</a></li>`).join("\n")}
    </ul>
    <h3 class="hk-subhead">このほくろが出てくるテーマ</h3>
    <ul class="hk-tags">
${s.themes.map((t) => `      <li><a href="../${t}/">${esc(hubById.get(t).h1)}</a></li>`).join("\n")}
    </ul>
    <h3 class="hk-subhead">${esc(area.name)}</h3>
    <ul class="yume-tags hk-tags">
${same.map((x) => `      <li><a href="../${x.slug}/">${esc(x.name)}</a></li>`).join("\n")}
      <li><a href="../">ほくろ占いトップ</a></li>
    </ul>
  </section>

  ${HEALTH}
</main>

`;
  write(rel, head(rel, `${s.name}のほくろの意味【図解】｜${s.keyword}｜えみり`,
    `${s.name}のほくろの意味を図で解説。${s.summary}恋愛・仕事・金運での意味と、運を生かすヒントも紹介します。`,
    `${s.name}のほくろの意味｜えみり`, s.summary, 2) + body + foot(2));
}

function hubPage(h) {
  const rel = `hokuro/${h.id}/`;
  const list = SPOTS.filter((s) => s.themes.includes(h.id));
  const others = HUBS.filter((x) => x.id !== h.id);
  const body = `<main id="main" class="wrap-narrow">
${crumb([["えみり", "../../"], ["ほくろ占い", "../"], [h.h1]])}

  <section class="hero">
    <p class="eyebrow">MOLE READING · ${esc(h.name)}</p>
    <h1>${esc(h.h1)}</h1>
    <p>${esc(h.lead)}全部で${list.length}か所。気になる場所をタップすると、くわしい意味が読めます。</p>
  </section>

${AREAS.map((a) => {
    const items = list.filter((s) => s.area === a.id);
    if (!items.length) return "";
    return `  <section class="card" aria-labelledby="hk-${a.id}-title">
    <h2 id="hk-${a.id}-title">${esc(a.name)}</h2>
    ${figure({ area: a.id, dots: items.map((s) => ({ x: s.x, y: s.y, href: `../${s.slug}/`, label: `${s.name}のほくろ`, n: num.get(s.slug) })), title: `${h.name}の${a.name}の位置` })}
    <ul class="hk-list">
${items.map((s) => `      <li><a href="../${s.slug}/"><span class="hk-n">${num.get(s.slug)}</span><span><b>${esc(s.name)}</b><small>${esc(s.keyword)}</small></span><span class="arrow" aria-hidden="true">→</span></a></li>`).join("\n")}
    </ul>
  </section>
`;
  }).join("\n")}
  <section class="card" aria-labelledby="hk-other-title">
    <h2 id="hk-other-title">ほかのテーマ</h2>
    <ul class="hk-tags">
${others.map((x) => `      <li><a href="../${x.id}/">${esc(x.h1)}</a></li>`).join("\n")}
      <li><a href="../">ほくろ占いトップ</a></li>
    </ul>
  </section>

  ${HEALTH}
</main>

`;
  write(rel, head(rel, `${h.h1}【図解】｜ほくろ占い｜えみり`, `${h.h1}を図で解説。${h.lead}`, `${h.h1}｜えみり`, h.lead, 2) + body + foot(2));
}

function indexPage() {
  const rel = "hokuro/";
  const areaSection = (a) => {
    const items = SPOTS.filter((s) => s.area === a.id);
    return `  <section class="card" aria-labelledby="hk-${a.id}-title">
    <p class="eyebrow">${a.id === "face" ? "FACE" : "BODY"}</p>
    <h2 id="hk-${a.id}-title">${esc(a.name)}の位置と意味</h2>
    <p>図の番号をタップすると、その場所のほくろの意味が読めます。</p>
    ${figure({ area: a.id, dots: items.map((s) => ({ x: s.x, y: s.y, href: `${s.slug}/`, label: `${s.name}のほくろ`, n: num.get(s.slug) })), title: `${a.name}の位置` })}
    <ul class="hk-list">
${items.map((s) => `      <li><a href="${s.slug}/"><span class="hk-n">${num.get(s.slug)}</span><span><b>${esc(s.name)}</b><small>${esc(s.keyword)}</small></span><span class="arrow" aria-hidden="true">→</span></a></li>`).join("\n")}
    </ul>
  </section>
`;
  };
  const body = `<main id="main" class="wrap-narrow">
${crumb([["えみり", "../"], ["ほくろ占い"]])}

  <section class="hero">
    <p class="eyebrow">MOLE READING</p>
    <h1>ほくろ占い【図解】顔と体のほくろの位置と意味</h1>
    <p>ほくろの位置には、その人の性格や運の傾向が表れるといわれます。顔と体の${SPOTS.length}か所のほくろの意味を、図とあわせて解説します。鏡を見ながら、自分のほくろと見比べてみてください。</p>
    <ul class="badges" aria-label="特徴">
      <li class="badge">入力なし</li>
      <li class="badge">図で探せる</li>
      <li class="badge">恋愛・金運・仕事</li>
    </ul>
  </section>

  <section class="card" aria-labelledby="hk-theme-title">
    <h2 id="hk-theme-title">テーマから探す</h2>
    <ul class="hk-tags hk-tags-lg">
${HUBS.map((h) => `      <li><a href="${h.id}/">${esc(h.h1)}</a></li>`).join("\n")}
    </ul>
  </section>

${AREAS.map(areaSection).join("\n")}
  <section class="card prose" aria-labelledby="hk-basic-title">
    <p class="eyebrow">BASICS</p>
    <h2 id="hk-basic-title">ほくろ占いの見方</h2>
    <h3>生きぼくろと死にぼくろ</h3>
    <p>ほくろ占いでは、ほくろの「質」も大切にされます。黒くつやがあり、ふっくらと形の整ったほくろは「生きぼくろ」と呼ばれ、その場所の意味が良い方向に強く表れるといわれます。反対に、色がぼやけてつやのないほくろは「死にぼくろ」と呼ばれ、その場所の課題に気をつけるサインと読みます。どちらも決めつけるものではなく、自分を見つめ直すきっかけとして楽しんでください。</p>
    <h3>右と左の違い</h3>
    <p>${esc(LR)}</p>
    <h3>見えるほくろ、隠れたほくろ</h3>
    <p>顔や手など人から見える場所のほくろは、人との関わりの中で表れる性質を、眉の中や背中、足の裏など見えにくい場所のほくろは、内に秘めた力や、気づかないところで受けている支えを表すとされます。</p>
    <h3>ほくろが増えた・消えたときは</h3>
    <p>ほくろは年齢とともに増えたり、薄くなったりします。占いでは「運の流れが変わるサイン」と読むこともありますが、急に大きくなる、形や色が変わる、出血するなどの変化は、占いではなく皮膚科で相談してください。</p>
    <p>手のひらの線の意味は<a href="../tesou/">手相の見方</a>で、見た夢の意味は<a href="../yume/">夢占い辞典</a>で調べられます。</p>
  </section>

  ${HEALTH}
</main>

`;
  write(rel, head(rel, "ほくろ占い【図解】顔・体のほくろの位置と意味｜恋愛運・金運｜えみり",
    `ほくろ占いで、顔と体の${SPOTS.length}か所のほくろの意味を図で解説。目尻・涙ぼくろ・口元・あご・首・手のひら・足の裏など、恋愛運・金運・仕事運・性格への意味がわかります。`,
    "ほくろ占い【図解】顔・体のほくろの意味｜えみり", "顔と体のほくろの位置から、恋愛運・金運・性格を読み解きます。", 1) + body + foot(1));
}

for (const s of SPOTS) spotPage(s);
for (const h of HUBS) hubPage(h);
indexPage();
console.log(`hokuro：場所 ${SPOTS.length}・テーマ ${HUBS.length}`);
