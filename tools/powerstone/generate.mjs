#!/usr/bin/env node
/*
 * パワーストーン：powerstone/（守護石の診断・願い／色／誕生月から選ぶ・石の一覧）、
 *   powerstone/<石>/（石ごとの意味）、powerstone/<願い>/（願い別のおすすめ）を作る
 *
 *   node tools/powerstone/generate.mjs
 *
 * データ：assets/js/content/stones.js（えみりのまとめ。意味は言い伝えとして書き、効果を言い切らない）
 */
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const require = createRequire(import.meta.url);
const S = require(path.join(ROOT, "assets/js/content/stones.js"));
const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
for (const w of S.WISHES) if (S.bySlug[w.id]) throw new Error(`願い ${w.id} が石と同じ名前`);

const TEMPLATE = fs.readFileSync(path.join(ROOT, "learn/suhijutsu/index.html"), "utf8");
function head(rel, title, desc, ogTitle, ogDesc, depth, scripts = "") {
  let h = TEMPLATE.slice(0, TEMPLATE.indexOf("<main"))
    .replace(/<title>.*?<\/title>/, `<title>${esc(title)}</title>`)
    .replace(/<meta name="description" content=".*?">/, `<meta name="description" content="${esc(desc)}">`)
    .replace(/https:\/\/emiri-uranai\.com\/learn\/suhijutsu\//g, `https://emiri-uranai.com/${rel}`)
    .replace(/<meta property="og:title" content=".*?">/, `<meta property="og:title" content="${esc(ogTitle)}">`)
    .replace(/<meta property="og:description" content=".*?">/, `<meta property="og:description" content="${esc(ogDesc)}">`)
    .replace('<li><a href="../../learn/" aria-current="page">占いを知る</a></li>', '<li><a href="../../learn/">占いを知る</a></li>')
    .replace('<link rel="stylesheet" href="../../assets/css/common.css">', '<link rel="stylesheet" href="../../assets/css/common.css">\n<link rel="stylesheet" href="../../assets/css/powerstone.css">' + (scripts ? "\n" + scripts : ""));
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
const NOTE = `<p class="notice">パワーストーンの意味や力は、昔からの言い伝えや考え方によるものです。体調や悩みごとは石だけに頼らず、必要に応じて専門家に相談してください。</p>`;
const COLOR = Object.fromEntries(S.COLORS.map((c) => [c.id, c]));
const WISH = Object.fromEntries(S.WISHES.map((w) => [w.id, w]));
const CARE = {
  sun: "日光に長く当てると、色があせやすい石です。保管は直射日光の当たらない場所で。",
  water: "水や汗に弱い石です。身につけたあとは、乾いたやわらかい布で拭いてから保管しましょう。"
};
const stoneItem = (s, up = "") => `      <li><a href="${up}${s.slug}/"><span class="ps-dot ps-${s.color}" aria-hidden="true"></span><span class="ps-card-body"><b>${esc(s.name)}</b><small>${esc(s.words)}</small></span><span class="arrow" aria-hidden="true">→</span></a></li>`;
const monthsOf = (s) => Object.entries(S.BIRTHSTONES).filter(([, v]) => v.includes(s.slug)).map(([m]) => `${m}月`);

function stonePage(s) {
  const rel = `powerstone/${s.slug}/`;
  const months = monthsOf(s);
  const pairs = s.pair.map((p) => S.bySlug[p]);
  const sameColor = S.STONES.filter((x) => x.color === s.color && x !== s).slice(0, 4);
  const care = [`モース硬度は${s.hardness}${Number(String(s.hardness).split("〜")[0]) < 5.5 ? "で、やわらかく傷つきやすい石です。ほかの石やアクセサリーとぶつからないよう、別々に保管しましょう。" : "。"}`]
    .concat(s.care.map((c) => CARE[c]));
  const body = `<main id="main" class="wrap-narrow">
${crumb([["えみり", "../../"], ["パワーストーン", "../"], [s.name]])}

  <section class="hero">
    <p class="eyebrow">POWER STONE · ${esc(s.en.toUpperCase())}</p>
    <h1>${esc(s.name)}の意味と効果｜石言葉・相性のよい石</h1>
    <p>${esc(s.meaning)}</p>
  </section>

  <section class="card prose" aria-labelledby="ps-s-profile">
    <p class="eyebrow">PROFILE</p>
    <h2 id="ps-s-profile">${esc(s.name)}のプロフィール</h2>
    <dl class="learn-dl">
      <div><dt>読み・英名</dt><dd>${esc(s.kana)}・${esc(s.en)}</dd></div>
      <div><dt>石言葉</dt><dd>${esc(s.words)}</dd></div>
      <div><dt>色</dt><dd>${esc(COLOR[s.color].name)}（五行では「${COLOR[s.color].element}」）</dd></div>
      <div><dt>鉱物の仲間</dt><dd>${esc(s.group)}</dd></div>
      <div><dt>硬さ（モース硬度）</dt><dd>${esc(s.hardness)}</dd></div>
      ${months.length ? `<div><dt>誕生石</dt><dd>${months.join("・")}の誕生石</dd></div>` : ""}
      <div><dt>願い</dt><dd>${s.wishes.map((w) => `<a href="../${w}/">${esc(WISH[w].name)}</a>`).join("・")}</dd></div>
    </dl>
  </section>

  <section class="card prose" aria-labelledby="ps-s-story">
    <h2 id="ps-s-story">${esc(s.name)}の由来と言い伝え</h2>
    <p>${esc(s.story)}</p>
    <h3>こんな人・こんなときに</h3>
    <p>${esc(`${s.wishes.map((w) => WISH[w].lead.replace(/ときに$/, "とき")).join("、")}に、${s.name}を選ぶ人が多い石です。`)}</p>
  </section>

  <section class="card prose" aria-labelledby="ps-s-pair">
    <h2 id="ps-s-pair">相性のよい石</h2>
    <p>${esc(`${s.name}は、${pairs.map((p) => p.name).join("・")}と組み合わせると、お互いのよさを引き立て合うといわれます。`)}</p>
    <ul class="ps-cards">
${pairs.map((p) => stoneItem(p, "../")).join("\n")}
    </ul>
  </section>

  <section class="card prose" aria-labelledby="ps-s-care">
    <h2 id="ps-s-care">お手入れと保管</h2>
    <ul>
${care.map((c) => `      <li>${esc(c)}</li>`).join("\n")}
      <li>身につけたあとは、やわらかい布で軽く拭いてから、ほかの石とぶつからないように保管しましょう。</li>
    </ul>
  </section>

  ${sameColor.length ? `<section class="card" aria-labelledby="ps-s-color">
    <h2 id="ps-s-color">${esc(COLOR[s.color].name)}の石</h2>
    <ul class="ps-cards">
${sameColor.map((p) => stoneItem(p, "../")).join("\n")}
    </ul>
    <p><a class="btn btn-ghost" href="../#powerstone-form" data-track="start_click" data-target="powerstone" data-position="stone">生年月日で、あなたの守護石を調べる</a></p>
  </section>` : ""}

  ${NOTE}
</main>

`;
  write(rel, head(rel, `${s.name}の意味と効果｜石言葉・相性・お手入れ｜パワーストーン｜えみり`,
    `パワーストーン「${s.name}」の意味・石言葉（${s.words}）・由来、相性のよい石（${pairs.map((p) => p.name).join("・")}）、お手入れと保管の方法を解説します。${months.length ? months.join("・") + "の誕生石。" : ""}`,
    `${s.name}の意味と石言葉｜えみり`, s.meaning.slice(0, 60), 2) + body + foot(2));
}

function wishPage(w) {
  const rel = `powerstone/${w.id}/`;
  const list = S.STONES.filter((s) => s.wishes.includes(w.id));
  const body = `<main id="main" class="wrap-narrow">
${crumb([["えみり", "../../"], ["パワーストーン", "../"], [`${w.name}の石`]])}

  <section class="hero">
    <p class="eyebrow">POWER STONE · WISH</p>
    <h1>${esc(w.name)}のパワーストーン${list.length}選｜意味と選び方</h1>
    <p>${esc(`${w.lead}選ばれることが多いパワーストーンを、意味・石言葉とあわせて紹介します。気になる石から、ひとつ選んでみてください。`)}</p>
  </section>

  <section class="card" aria-labelledby="ps-w-list">
    <h2 id="ps-w-list">${esc(w.name)}の石</h2>
    <ul class="ps-wish-list">
${list.map((s) => `      <li>
        <h3><span class="ps-dot ps-${s.color}" aria-hidden="true"></span><a href="../${s.slug}/">${esc(s.name)}</a></h3>
        <p class="ps-words">石言葉：${esc(s.words)}</p>
        <p>${esc(s.meaning)}</p>
      </li>`).join("\n")}
    </ul>
  </section>

  <section class="card prose" aria-labelledby="ps-w-how">
    <h2 id="ps-w-how">選び方のヒント</h2>
    <ul>
      <li>見たときに「きれい」「気になる」と感じた石は、今のあなたに合っているといわれます。直感を大切に。</li>
      <li>迷ったら、どんな石とも組み合わせやすい<a href="../suisho/">水晶</a>を1つ加えるのもおすすめです。</li>
      <li>生年月日から選ぶなら、<a href="../#powerstone-form">守護石の診断</a>で、誕生石・五行の石・ライフパスの石がわかります。</li>
    </ul>
    <p class="ps-other">ほかの願い：${S.WISHES.filter((x) => x !== w).map((x) => `<a href="../${x.id}/">${esc(x.name)}</a>`).join("・")}</p>
  </section>

  ${NOTE}
</main>

`;
  write(rel, head(rel, `${w.name}のパワーストーン${list.length}選｜意味・石言葉と選び方｜えみり`,
    `${w.name}のお守りに選ばれるパワーストーン${list.length}種（${list.slice(0, 4).map((s) => s.name).join("・")}など）の意味・石言葉と、選び方のヒントを紹介します。`,
    `${w.name}のパワーストーン｜えみり`, w.lead, 2) + body + foot(2));
}

function indexPage() {
  const rel = "powerstone/";
  const scripts = ["core/date.js", "core/dom.js", "core/profile.js", "core/birthdate-field.js", "core/astro.js", "content/kyusei-data.js", "engines/kyusei.js", "engines/numerology.js", "content/stones.js", "pages/powerstone-page.js"]
    .map((s) => `<script defer src="../assets/js/${s}"></script>`).join("\n");
  const monthRow = (m) => {
    const v = S.BIRTHSTONES[m];
    return `      <div><dt>${m}月</dt><dd>${v.map((x) => (S.bySlug[x] ? `<a href="${x}/">${esc(S.bySlug[x].name)}</a>` : esc(x))).join("・")}</dd></div>`;
  };
  const body = `<main id="main" class="wrap-narrow">
${crumb([["えみり", "../"], ["パワーストーン"]])}

  <section class="hero">
    <p class="eyebrow">POWER STONE</p>
    <h1>パワーストーンの意味一覧と、生年月日でわかる守護石</h1>
    <p>生年月日から、あなたの誕生石・五行の石・ライフパスナンバーの石を診断します。願いや色からも、${S.STONES.length}種類のパワーストーンの意味と石言葉を探せます。</p>
    <ul class="badges" aria-label="特徴">
      <li class="badge">完全無料</li>
      <li class="badge">生年月日だけ</li>
      <li class="badge">${S.STONES.length}種類の意味</li>
    </ul>
  </section>

  <form id="powerstone-form" class="card" novalidate>
    <div data-birthdate="self"></div>
    <button type="submit" class="btn">あなたの守護石を調べる</button>
  </form>

  <div id="powerstone-result" class="ps-result" hidden></div>

  <section class="card" aria-labelledby="ps-wish">
    <p class="eyebrow">BY WISH</p>
    <h2 id="ps-wish">願いから選ぶ</h2>
    <ul class="link-list">
${S.WISHES.map((w) => `      <li><a href="${w.id}/"><span>${w.icon} ${esc(w.name)}の石<br><small class="lead">${esc(w.lead)}</small></span><span class="arrow" aria-hidden="true">→</span></a></li>`).join("\n")}
    </ul>
  </section>

  <section class="card" aria-labelledby="ps-color">
    <p class="eyebrow">BY COLOR</p>
    <h2 id="ps-color">色から選ぶ</h2>
${S.COLORS.map((c) => { const list = S.STONES.filter((s) => s.color === c.id); return list.length ? `    <h3 class="ps-color-h"><span class="ps-dot ps-${c.id}" aria-hidden="true"></span>${esc(c.name)}</h3>
    <ul class="ps-cards">
${list.map((s) => stoneItem(s)).join("\n")}
    </ul>` : ""; }).join("\n")}
  </section>

  <section class="card prose" aria-labelledby="ps-month">
    <p class="eyebrow">BIRTHSTONES</p>
    <h2 id="ps-month">誕生月から選ぶ（誕生石）</h2>
    <p>全国宝石卸商協同組合が2021年に改訂した誕生石です。リンクのある石は、意味を解説しています。</p>
    <dl class="learn-dl">
${Array.from({ length: 12 }, (_, i) => monthRow(i + 1)).join("\n")}
    </dl>
  </section>

  <section class="card prose" aria-labelledby="ps-how">
    <h2 id="ps-how">パワーストーンの選び方と付き合い方</h2>
    <h3>直感で選んでいい</h3>
    <p>パワーストーンは、見たときに心がひかれた石を選ぶのがいちばんといわれます。意味から選ぶのも、色から選ぶのも、どちらも正解です。</p>
    <h3>浄化（リフレッシュ）のしかた</h3>
    <p>月の光に当てる、水晶のそばに置く、セージの煙をくぐらせるなど、さまざまな方法が伝えられています。日光や水に弱い石もあるので、石ごとのページの「お手入れと保管」も確かめてください。</p>
    <h3>組み合わせ</h3>
    <p>ブレスレットなどで複数の石を組み合わせるときは、願いを1つか2つにしぼると選びやすくなります。迷ったら、どの石とも合わせやすい水晶を加えましょう。</p>
    <p>部屋の気を整えたいときは<a href="../fusui/">風水（本命卦）</a>もあわせてどうぞ。</p>
  </section>

  ${NOTE}
</main>

`;
  write(rel, head(rel, "パワーストーンの意味一覧｜生年月日でわかる守護石・誕生石｜えみり",
    `パワーストーン${S.STONES.length}種類の意味・石言葉を、願い（恋愛・金運・仕事・癒やし・人間関係・お守り）や色、誕生月から探せます。生年月日からあなたの守護石も無料で診断。`,
    "パワーストーンの意味と守護石診断｜えみり", "生年月日から、あなたの誕生石・五行の石・ライフパスの石を診断します。", 1, scripts) + body + foot(1));
}

for (const s of S.STONES) stonePage(s);
for (const w of S.WISHES) wishPage(w);
indexPage();
console.log(`powerstone：石 ${S.STONES.length}・願い ${S.WISHES.length}`);
