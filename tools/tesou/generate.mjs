/*
 * 手相：tesou/index.html（手相の見方）、線ごとのページ tesou/<線>/、しるし tesou/shirushi/、丘 tesou/oka/ を作る
 *
 *   node tools/tesou/generate.mjs
 *
 * 図は tools/tesou/svg.mjs（えみりのオリジナルの手の図・SVG）。文章は tools/tesou/data.mjs（えみりのオリジナル）。
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { figure, mark, LINES, COLORS } from "./svg.mjs";
import { GROUPS, ENTRIES, MARKS, MOUNDS } from "./data.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const bySlug = new Map(ENTRIES.map((e) => [e.slug, e]));
const SPECIAL = { oka: { name: "手のひらの丘" }, shirushi: { name: "手相のしるし" }, renai: { name: "恋愛・結婚の手相" }, kinun: { name: "金運の手相" } };
const nameOf = (s) => (bySlug.get(s) || SPECIAL[s]).name;
for (const e of ENTRIES) for (const r of e.related) if (!bySlug.has(r) && !SPECIAL[r]) throw new Error(`${e.slug}: related ${r} がない`);

const TEMPLATE = fs.readFileSync(path.join(ROOT, "learn/suhijutsu/index.html"), "utf8");
function head(rel, title, desc, ogTitle, ogDesc, depth) {
  let h = TEMPLATE.slice(0, TEMPLATE.indexOf("<main"))
    .replace(/<title>.*?<\/title>/, `<title>${esc(title)}</title>`)
    .replace(/<meta name="description" content=".*?">/, `<meta name="description" content="${esc(desc)}">`)
    .replace(/https:\/\/emiri-uranai\.com\/learn\/suhijutsu\//g, `https://emiri-uranai.com/${rel}`)
    .replace(/<meta property="og:title" content=".*?">/, `<meta property="og:title" content="${esc(ogTitle)}">`)
    .replace(/<meta property="og:description" content=".*?">/, `<meta property="og:description" content="${esc(ogDesc)}">`)
    .replace('<li><a href="../../learn/" aria-current="page">占いを知る</a></li>', '<li><a href="../../learn/">占いを知る</a></li>')
    .replace('<link rel="stylesheet" href="../../assets/css/common.css">', '<link rel="stylesheet" href="../../assets/css/common.css">\n<link rel="stylesheet" href="../../assets/css/tesou.css">');
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

function mainFig(e) {
  if (e.fig) return figure({ ...e.fig, hl: (e.fig.hl || []).concat(e.fig.extra || []), title: `${e.name}の位置` });
  return figure({ hl: [LINES[e.key]], title: `${e.name}の位置` });
}

function linePage(e) {
  const rel = `tesou/${e.slug}/`;
  const group = GROUPS.find((g) => g.id === e.group);
  const sameGroup = ENTRIES.filter((x) => x.group === e.group && x.slug !== e.slug);
  const withFig = e.variants.some((v) => v.fig);
  const variants = e.variants.map((v, i) => `    <div class="th-variant" id="v${i + 1}">
${v.fig ? `      ${figure({ ...v.fig, size: "sm", title: v.title })}\n` : ""}      <div>
        <h3>${esc(v.title)}</h3>
        <p>${esc(v.text)}</p>
      </div>
    </div>`).join("\n");
  const body = `<main id="main" class="wrap-narrow">
  <nav class="breadcrumb" aria-label="パンくずリスト">
    <ol>
      <li><a href="../../">えみり</a></li>
      <li><a href="../">手相</a></li>
      <li aria-current="page">${esc(e.name)}</li>
    </ol>
  </nav>

  <section class="hero">
    <p class="eyebrow">PALMISTRY · ${esc(group.name)}</p>
    <h1>手相の${esc(e.name)}とは？意味と見方</h1>
    <p class="th-reading">${esc(e.reading)}</p>
    <p>${esc(e.summary)}</p>
  </section>

  <section class="card th-where" aria-labelledby="th-where-title">
    <p class="eyebrow">WHERE</p>
    <h2 id="th-where-title">${esc(e.name)}の位置</h2>
    <div class="th-where-body">
      ${mainFig(e)}
      <p>${esc(e.where)}</p>
    </div>
    <p class="kyusei-meta">図は、右手の手のひらを自分に向けたところです（親指が右側）。</p>
  </section>

  <section class="card prose" aria-labelledby="th-meaning-title">
    <p class="eyebrow">MEANING</p>
    <h2 id="th-meaning-title">${esc(e.name)}が表すもの</h2>
    <p>${esc(e.meaning)}</p>
  </section>

  <section class="card" aria-labelledby="th-types-title">
    <p class="eyebrow">TYPES</p>
    <h2 id="th-types-title">${esc(e.name)}の形と意味${withFig ? "（図つき）" : ""}</h2>
${variants}
  </section>

  <section class="card prose" aria-labelledby="th-life-title">
    <p class="eyebrow">LOVE &amp; WORK</p>
    <h2 id="th-life-title">恋愛・仕事での見方</h2>
    <h3>恋愛</h3>
    <p>${esc(e.love)}</p>
    <h3>仕事</h3>
    <p>${esc(e.work)}</p>
    <h3>ひとこと</h3>
    <p>${esc(e.advice)}</p>
  </section>

  <section class="card" aria-labelledby="th-rel-title">
    <p class="eyebrow">RELATED</p>
    <h2 id="th-rel-title">あわせて見たい線</h2>
    <ul class="yume-tags th-tags">
${e.related.map((r) => `      <li><a href="../${r}/">${esc(nameOf(r))}</a></li>`).join("\n")}
    </ul>
    <h3 class="th-subhead">${esc(group.name)}</h3>
    <ul class="yume-tags th-tags">
${sameGroup.map((x) => `      <li><a href="../${x.slug}/">${esc(x.name)}</a></li>`).join("\n")}
      <li><a href="../">手相の見方トップ</a></li>
    </ul>
  </section>

  <p class="notice">手相は、今の自分を見つめ直すヒントとして楽しむものです。線は生活や気持ちで変わると言われます。体調についての判断は、医療機関に相談してください。</p>
</main>

`;
  write(rel, head(rel, `手相の${e.name}の意味と見方【図解】｜${e.variants.slice(0, 3).map((v) => v.title.replace(new RegExp(`${e.name}$`), "")).join("・")}｜えみり`,
    `手相の${e.name}（${e.reading}）の意味と見方を図で解説。${e.summary}${e.variants.slice(0, 3).map((v) => v.title).join("、")}など、形ごとの意味と恋愛・仕事での見方も紹介します。`,
    `手相の${e.name}の意味と見方｜えみり`, e.summary, 2) + body + foot(2));
}

function marksPage() {
  const rel = "tesou/shirushi/";
  const icon = (t) => `<svg class="th-icon" viewBox="0 0 40 40" role="img" aria-hidden="true">${mark(t, 20, 20, t === "chain" ? 5 : 11).replace(/th-mark/g, "th-mark th-mark-lg")}</svg>`;
  const body = `<main id="main" class="wrap-narrow">
  <nav class="breadcrumb" aria-label="パンくずリスト">
    <ol>
      <li><a href="../../">えみり</a></li>
      <li><a href="../">手相</a></li>
      <li aria-current="page">手相のしるし</li>
    </ol>
  </nav>

  <section class="hero">
    <p class="eyebrow">PALMISTRY · MARKS</p>
    <h1>手相のしるし（スター・十字・島など）の意味</h1>
    <p>線のほかに、手のひらには星や十字、三角などの「しるし」が現れることがあります。しるしは、現れた場所（どの線の上か、どの丘か）によって意味が変わります。</p>
  </section>

  <section class="card" aria-labelledby="th-marks-title">
    <h2 id="th-marks-title">しるしの種類</h2>
${MARKS.map((m) => `    <div class="th-variant" id="${m.id}">
      ${icon(m.type)}
      <div>
        <h3>${esc(m.name)}</h3>
        <p>${esc(m.text)}</p>
      </div>
    </div>`).join("\n")}
  </section>

  <section class="card prose" aria-labelledby="th-marks-how">
    <h2 id="th-marks-how">しるしの見方のコツ</h2>
    <p>しるしは、はっきり刻まれているものだけを見ます。偶然できたしわや、一時的な線を気にしすぎないようにしましょう。場所の意味は<a href="../oka/">手のひらの丘</a>のページも参考にしてください。</p>
  </section>
</main>

`;
  write(rel, head(rel, "手相のしるしの意味【図解】｜スター・十字・三角・四角・島・鎖・格子｜えみり",
    "手相に現れるしるし（スター・十字・三角・四角・島・鎖・格子・点）の意味を図で解説。現れた場所による意味の違いも紹介します。",
    "手相のしるしの意味｜えみり", "スター・十字・三角・島など、手相のしるしの意味。", 2) + body + foot(2));
}

function moundsPage() {
  const rel = "tesou/oka/";
  const labels = MOUNDS.map((m) => [m.name, m.x, m.y]);
  const fig = figure({ base: Object.keys(LINES), labels, title: "手のひらの丘の位置" }).replace('class="th-fig"', 'class="th-fig th-fig-oka"');
  const body = `<main id="main" class="wrap-narrow">
  <nav class="breadcrumb" aria-label="パンくずリスト">
    <ol>
      <li><a href="../../">えみり</a></li>
      <li><a href="../">手相</a></li>
      <li aria-current="page">手のひらの丘</li>
    </ol>
  </nav>

  <section class="hero">
    <p class="eyebrow">PALMISTRY · MOUNTS</p>
    <h1>手のひらの丘の意味と位置【図解】</h1>
    <p>手のひらのふくらんだ部分を「丘」と呼びます。それぞれの丘には星の名前がついていて、ふっくらしているほど、その丘が表す力が強いとされます。</p>
  </section>

  <section class="card th-where" aria-labelledby="th-oka-map">
    <h2 id="th-oka-map">丘の位置</h2>
    ${fig}
    <p class="kyusei-meta">図は、右手の手のひらを自分に向けたところです（親指が右側）。</p>
  </section>

  <section class="card prose" aria-labelledby="th-oka-list">
    <h2 id="th-oka-list">それぞれの丘の意味</h2>
${MOUNDS.map((m) => `    <h3 id="${m.id}">${esc(m.name)}（${esc(m.reading)}）</h3>\n    <p><strong>場所</strong>：${esc(m.where)}。${esc(m.text)}</p>`).join("\n")}
  </section>
</main>

`;
  write(rel, head(rel, "手のひらの丘の意味と位置【図解】｜金星丘・月丘・木星丘など｜えみり",
    "手相の丘（木星丘・土星丘・太陽丘・水星丘・第一火星丘・第二火星丘・金星丘・月丘・火星平原）の位置と意味を図で解説します。",
    "手のひらの丘の意味と位置｜えみり", "金星丘・月丘など、手のひらの丘の意味。", 2) + body + foot(2));
}


function hubPage(id, title, h1, lead, desc, points) {
  const rel = `tesou/${id}/`;
  const ORDER = id === "renai"
    ? ["kanjousen", "kekkonsen", "eikyousen", "tamanokoshisen", "nijuukanjousen", "kinseitai", "kodomosen", "ninkisen"]
    : ["zaiunsen", "taiyousen", "fish", "kinunsankaku", "tekubisen", "masukakesen", "unmeisen", "koujousen", "tamanokoshisen", "ninkisen"];
  const list = ENTRIES.filter((e) => (e.tags || []).includes(id === "renai" ? "love" : "money"))
    .sort((a, b) => (ORDER.indexOf(a.slug) + 1 || 99) - (ORDER.indexOf(b.slug) + 1 || 99));
  const body = `<main id="main" class="wrap-narrow">
  <nav class="breadcrumb" aria-label="パンくずリスト">
    <ol>
      <li><a href="../../">えみり</a></li>
      <li><a href="../">手相</a></li>
      <li aria-current="page">${esc(h1)}</li>
    </ol>
  </nav>

  <section class="hero">
    <p class="eyebrow">PALMISTRY · ${id === "renai" ? "LOVE" : "MONEY"}</p>
    <h1>${esc(h1)}【図解】</h1>
    <p>${esc(lead)}</p>
  </section>

  <section class="card prose" aria-labelledby="th-hub-points">
    <h2 id="th-hub-points">チェックするポイント</h2>
    <ol>
${points.map((p) => `      <li>${esc(p)}</li>`).join("\n")}
    </ol>
  </section>

  <section class="card" aria-labelledby="th-hub-list">
    <h2 id="th-hub-list">${esc(h1)}一覧（${list.length}）</h2>
${list.map((e) => `    <div class="th-variant">
      ${mainFig(e).replace('class="th-fig"', 'class="th-fig th-sm"')}
      <div>
        <h3><a href="../${e.slug}/">${esc(e.name)}</a></h3>
        <p>${esc(e.summary)}</p>
        <p class="kyusei-meta">${esc(id === "renai" ? e.love : e.work)}</p>
      </div>
    </div>`).join("\n")}
  </section>

  <section class="card" aria-labelledby="th-hub-more">
    <h2 id="th-hub-more">あわせて見たい</h2>
    <ul class="th-tags">
      <li><a href="../${id === "renai" ? "kinun" : "renai"}/">${id === "renai" ? "金運の手相" : "恋愛・結婚の手相"}</a></li>
      <li><a href="../shirushi/">手相のしるし</a></li>
      <li><a href="../oka/">手のひらの丘</a></li>
      <li><a href="../">手相の見方トップ</a></li>
    </ul>
  </section>

  <p class="notice">手相は、今の自分を見つめ直すヒントとして楽しむものです。線は生活や気持ちで変わると言われます。</p>
</main>

`;
  write(rel, head(rel, title, desc, `${h1}｜えみり`, lead, 2) + body + foot(2));
}

function indexPage() {
  const names = { seimei: "生命線", zunou: "頭脳線", kanjou: "感情線", unmei: "運命線", taiyou: "太陽線", zaiun: "財運線", kekkon: "結婚線", kenkou: "健康線" };
  const slugs = { seimei: "seimeisen", zunou: "zunousen", kanjou: "kanjousen", unmei: "unmeisen", taiyou: "taiyousen", zaiun: "zaiunsen", kekkon: "kekkonsen", kenkou: "kenkousen" };
  const overview = figure({ base: [], colored: Object.keys(LINES).map((k) => [k]), title: "手相の基本の8本の線" });
  const legend = Object.keys(LINES).map((k) => `      <li><a href="${slugs[k]}/"><span class="th-swatch" style="background:${COLORS[k]}"></span>${names[k]}</a></li>`).join("\n");
  const groups = GROUPS.map((g) => `  <section class="card" aria-labelledby="th-g-${g.id}">
    <h2 id="th-g-${g.id}">${esc(g.name)}</h2>
    <p class="lead">${esc(g.lead)}</p>
    <ul class="th-list">
${ENTRIES.filter((e) => e.group === g.id).map((e) => `      <li><a href="${e.slug}/">${mainFig(e).replace('class="th-fig"', 'class="th-fig th-thumb"')}<span><b>${esc(e.name)}</b><small>${esc(e.summary)}</small></span></a></li>`).join("\n")}
    </ul>
  </section>`).join("\n\n");
  const body = `<main id="main" class="wrap-narrow">
  <nav class="breadcrumb" aria-label="パンくずリスト">
    <ol>
      <li><a href="../">えみり</a></li>
      <li aria-current="page">手相</li>
    </ol>
  </nav>

  <section class="hero">
    <p class="eyebrow">PALMISTRY</p>
    <h1>手相の見方【図解】</h1>
    <p>自分の手のひらを見ながら、線の意味を図で確かめられる手相の入門ページです。基本の8本の線から、ますかけ線・仏眼などの珍しい線、しるしや丘まで、${ENTRIES.length}の線としるしを紹介します。</p>
  </section>

  <section class="card th-where" aria-labelledby="th-basic-map">
    <p class="eyebrow">BASIC LINES</p>
    <h2 id="th-basic-map">基本の8本の線</h2>
    <div class="th-where-body">
      ${overview}
      <ul class="th-legend">
${legend}
      </ul>
    </div>
    <p class="kyusei-meta">図は、右手の手のひらを自分に向けたところです（親指が右側）。線の名前を押すと、くわしい意味と形ごとの図が見られます。</p>
  </section>

  <section class="card prose" aria-labelledby="th-how-title">
    <h2 id="th-how-title">手相を見るときのポイント</h2>
    <h3>右手と左手、どちらを見る？</h3>
    <p>一般的には、利き手は「自分で切りひらいてきた今と未来」、反対の手は「生まれ持った性質」を表すとされます。両手を見比べると、生まれ持ったものがどう変わってきたかがわかります。</p>
    <h3>明るい場所で、手を軽く曲げて</h3>
    <p>手を少しすぼめると、線がはっきり見えます。細かいしわより、深くはっきり刻まれた線を中心に見ましょう。</p>
    <h3>手相は変わる</h3>
    <p>手相は、生活や気持ちの変化とともに少しずつ変わると言われます。気になる線があっても、それは「今の状態」を知るヒント。良い習慣を続けることで、線も変わっていきます。</p>
  </section>

${groups}

  <section class="card" aria-labelledby="th-more-title">
    <h2 id="th-more-title">テーマ別のまとめ・しるし・丘</h2>
    <ul class="link-list">
      <li><a href="renai/"><span>恋愛・結婚の手相<br><small class="lead">感情線・結婚線・影響線・玉の輿線など、恋愛に関わる線のまとめ</small></span><span class="arrow" aria-hidden="true">→</span></a></li>
      <li><a href="kinun/"><span>金運の手相<br><small class="lead">財運線・太陽線・フィッシュ・手首線など、お金に関わる線のまとめ</small></span><span class="arrow" aria-hidden="true">→</span></a></li>
      <li><a href="shirushi/"><span>手相のしるし<br><small class="lead">スター・十字・三角・四角・島・鎖・格子の意味</small></span><span class="arrow" aria-hidden="true">→</span></a></li>
      <li><a href="oka/"><span>手のひらの丘<br><small class="lead">金星丘・月丘・木星丘など9つのふくらみの意味</small></span><span class="arrow" aria-hidden="true">→</span></a></li>
    </ul>
  </section>

  <p class="notice">手相は、今の自分を見つめ直すヒントとして楽しむものです。体調についての判断は、医療機関に相談してください。</p>
</main>

`;
  write("tesou/", head("tesou/", "手相の見方【図解】｜生命線・頭脳線・感情線・運命線・ますかけ線の意味｜えみり",
    `手相の見方を図でわかりやすく解説。生命線・頭脳線・感情線・運命線・太陽線・財運線・結婚線・健康線の基本の8本と、ますかけ線・仏眼・神秘十字などの珍しい線、しるし、丘の意味を紹介します。`,
    "手相の見方【図解】｜えみり", "基本の8本の線から珍しい線まで、図で見る手相入門。", 1) + body + foot(1));
}

for (const e of ENTRIES) linePage(e);
hubPage("renai", "恋愛・結婚の手相【図解】｜結婚線・感情線・影響線・玉の輿線の見方｜えみり", "恋愛・結婚の手相",
  "恋のタイプ、出会いの時期、結婚のご縁は、手のひらのどこに表れるのでしょう。恋愛と結婚に関わる線を、図でまとめて紹介します。",
  "恋愛・結婚運がわかる手相を図で解説。感情線・結婚線・金星帯・影響線・玉の輿線・二重感情線・子供線など、恋愛と結婚に関わる線の見方を紹介します。",
  ["感情線で、恋愛のタイプ（尽くす派・自分のペース派）を見る", "結婚線の長さと向きで、今の恋愛の状態を見る", "運命線に合流する影響線で、出会いの時期の目安を見る", "金星帯や人気線で、異性を惹きつける魅力を見る", "利き手と反対の手を比べて、生まれ持った恋愛観と今の変化を見る"]);
hubPage("kinun", "金運の手相【図解】｜財運線・太陽線・フィッシュ・手首線の見方｜えみり", "金運の手相",
  "お金を稼ぐ力、ためる力、思いがけない幸運。金運に関わる線としるしを、図でまとめて紹介します。",
  "金運・財運がわかる手相を図で解説。財運線・太陽線・運命線・ますかけ線・フィッシュ・手首線・金運の三角など、お金に関わる線としるしの見方を紹介します。",
  ["小指の下の財運線で、お金を稼ぐ力と管理する力を見る", "薬指の下の太陽線で、才能が成功と収入につながる力を見る", "運命線で、仕事の安定と流れを見る", "フィッシュや金運の三角など、珍しいしるしがないか探す", "手首線で、財産を築く土台（健康と生活の安定）を見る"]);
marksPage();
moundsPage();
indexPage();
console.log(`tesou: ${ENTRIES.length}の線＋しるし・丘＋トップ`);
