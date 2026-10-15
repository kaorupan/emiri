#!/usr/bin/env node
/*
 * 風水：fusui/（本命卦の診断と、八宅風水のしくみ）、fusui/<卦>/（8つの本命卦）、fusui/<部屋>/（部屋別の風水）を作る
 *
 *   node tools/fusui/generate.mjs
 *
 * 計算：assets/js/engines/fusui.js（本命卦・方位の吉凶）
 * 文章：assets/js/content/fusui-text.js（卦・方位）と tools/fusui/rooms.mjs（部屋別）。どちらも、えみりのオリジナル。
 */
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import { ROOMS } from "./rooms.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const require = createRequire(import.meta.url);
const F = require(path.join(ROOT, "assets/js/engines/fusui.js"));
const T = require(path.join(ROOT, "assets/js/content/fusui-text.js"));
const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

const TEMPLATE = fs.readFileSync(path.join(ROOT, "learn/suhijutsu/index.html"), "utf8");
function head(rel, title, desc, ogTitle, ogDesc, depth, scripts = "") {
  let h = TEMPLATE.slice(0, TEMPLATE.indexOf("<main"))
    .replace(/<title>.*?<\/title>/, `<title>${esc(title)}</title>`)
    .replace(/<meta name="description" content=".*?">/, `<meta name="description" content="${esc(desc)}">`)
    .replace(/https:\/\/emiri-uranai\.com\/learn\/suhijutsu\//g, `https://emiri-uranai.com/${rel}`)
    .replace(/<meta property="og:title" content=".*?">/, `<meta property="og:title" content="${esc(ogTitle)}">`)
    .replace(/<meta property="og:description" content=".*?">/, `<meta property="og:description" content="${esc(ogDesc)}">`)
    .replace('<li><a href="../../learn/" aria-current="page">占いを知る</a></li>', '<li><a href="../../learn/">占いを知る</a></li>')
    .replace('<link rel="stylesheet" href="../../assets/css/common.css">', '<link rel="stylesheet" href="../../assets/css/common.css">\n<link rel="stylesheet" href="../../assets/css/fusui.css">' + (scripts ? "\n" + scripts : ""));
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
const NOTE = `<p class="notice">風水は、昔から伝わる暮らしの知恵や考え方です。住まいを整えるヒントとして楽しみ、家の工事や大きな買い物などは、ご自身の状況に合わせて判断してください。</p>`;

const GRID = [["nw", "n", "ne"], ["w", "c", "e"], ["sw", "s", "se"]];
function chart(g) {
  const cells = GRID.flat().map((k) => {
    if (k === "c") return `<div class="fs-cell fs-center"><b>${g.name}</b><span>${g.groupName}</span></div>`;
    const d = g.dirs.find((x) => x.key === k);
    return `<div class="fs-cell ${d.star.good ? "is-good" : "is-bad"}${d.star.key === "seiki" ? " is-best" : ""}"><span class="fs-dir">${d.name}</span><b>${d.star.name}</b><span class="fs-mark">${d.star.good ? "吉" : "凶"}</span></div>`;
  }).join("");
  const label = `${g.name}の人の方位盤。吉方位は${g.good.map((x) => `${x.name}（${x.star.name}）`).join("、")}。凶方位は${g.bad.map((x) => `${x.name}（${x.star.name}）`).join("、")}`;
  return `<figure class="fs-chart"><div class="fs-grid" role="img" aria-label="${esc(label)}">${cells}</div><figcaption>地図と同じく、北を上にしています。家の中心から見た方位です。</figcaption></figure>`;
}
const starItems = (list) => `<ul class="fs-stars">
${list.map((x) => { const t = T.STAR[x.star.key]; return `      <li class="${x.star.good ? "is-good" : "is-bad"}"><p class="fs-star-head"><b>${x.name}</b>　${x.star.name}（${x.star.reading}）：${esc(t.short)}</p><p>${esc(t.text + t.use)}</p></li>`; }).join("\n")}
    </ul>`;

// 本命卦が○○になる生まれ年（1950〜2030年。立春より前の生まれは前の年として数える）
function yearsOf(n) {
  const out = { m: [], f: [] };
  for (let y = 1950; y <= 2030; y++) {
    const honmei = (() => { let s = (11 - (y % 9)) % 9; return s === 0 ? 9 : s; })();
    if (F.guaNumber(honmei, "m") === n) out.m.push(y);
    if (F.guaNumber(honmei, "f") === n) out.f.push(y);
  }
  return out;
}

const roomLinks = (up) => `<ul class="link-list">
${ROOMS.map((r) => `      <li><a href="${up}${r.slug}/"><span>${r.icon} ${esc(r.name)}の風水<br><small class="lead">${esc(r.theme)}</small></span><span class="arrow" aria-hidden="true">→</span></a></li>`).join("\n")}
    </ul>`;

function guaPage(n) {
  const g = F.guaInfo(n), t = T.GUA[n], ys = yearsOf(n);
  const rel = `fusui/${g.slug}/`;
  const others = F.ORDER.filter((x) => x !== n).map((x) => F.GUA[x]);
  const same = others.filter((x) => x.group === g.group);
  const body = `<main id="main" class="wrap-narrow">
${crumb([["えみり", "../../"], ["風水", "../"], [`本命卦「${g.name}」`]])}

  <section class="hero">
    <p class="eyebrow">FENG SHUI · ${g.groupName}</p>
    <h1>本命卦「${g.name}（${g.reading}）」の人の吉方位と性格</h1>
    <p>${esc(t.nature)}八宅風水で${g.name}の人は${g.groupName}。吉方位は${g.good.map((x) => x.name).join("・")}で、いちばんの吉方位（生気）は${g.good[0].name}です。</p>
  </section>

  <section class="card prose" aria-labelledby="fs-g-chart">
    <p class="eyebrow">DIRECTIONS</p>
    <h2 id="fs-g-chart">${g.name}の人の方位盤</h2>
    ${chart(g)}
    <dl class="result-points">
      <div><dt>吉方位</dt><dd>${g.good.map((x) => `${x.name}（${x.star.name}）`).join("・")}</dd></div>
      <div><dt>凶方位</dt><dd>${g.bad.map((x) => `${x.name}（${x.star.name}）`).join("・")}</dd></div>
      <div><dt>寝るときの頭の向き</dt><dd>${g.good[1].name}（天医：健康）か${g.good[2].name}（延年：人間関係・恋愛）</dd></div>
      <div><dt>机で向く方位</dt><dd>${g.good[0].name}（生気：発展・やる気）</dd></div>
      <div><dt>五行・ラッキーカラー</dt><dd>${g.element}・${t.colors.join("・")}　<a href="../../powerstone/#ps-color">この色のパワーストーン</a></dd></div>
    </dl>
  </section>

  <section class="card prose" aria-labelledby="fs-g-good">
    <h2 id="fs-g-good">吉方位の使い方</h2>
    ${starItems(g.good)}
    <h2>凶方位との付き合い方</h2>
    ${starItems(g.bad)}
  </section>

  <section class="card prose" aria-labelledby="fs-g-person">
    <p class="eyebrow">PERSONALITY</p>
    <h2 id="fs-g-person">${g.name}の人の性格・恋愛・仕事</h2>
    <p>${esc(`${g.name}の象（しょう）は${t.image}。`)}</p>
    <h3>性格</h3><p>${esc(t.personality)}</p>
    <h3>恋愛</h3><p>${esc(t.love)}</p>
    <h3>仕事</h3><p>${esc(t.work)}</p>
    <h3>相性のよい本命卦</h3>
    <p>${esc(`同じ${g.groupName}の${same.map((x) => x.name).join("・")}の人とは、吉方位がそろうため、一緒に暮らすときに部屋づくりで迷いにくいとされます。`)}</p>
  </section>

  <section class="card prose" aria-labelledby="fs-g-years">
    <h2 id="fs-g-years">本命卦が「${g.name}」になる生まれ年</h2>
    <p>1950〜2030年生まれの場合です。1月1日〜立春（2月4日ごろ）の前日に生まれた人は、前の年として数えます。正確には<a href="../">本命卦の診断</a>で調べられます。</p>
    <dl class="learn-dl">
      <div><dt>男性の出し方</dt><dd>${ys.m.length ? ys.m.join("・") + "年" : "該当なし"}</dd></div>
      <div><dt>女性の出し方</dt><dd>${ys.f.length ? ys.f.join("・") + "年" : "該当なし"}</dd></div>
    </dl>
  </section>

  <section class="card" aria-labelledby="fs-g-rooms">
    <h2 id="fs-g-rooms">部屋別の風水で、吉方位を生かす</h2>
    ${roomLinks("../")}
    <p class="fs-other">ほかの本命卦：${others.map((x) => `<a href="../${x.slug}/">${x.name}</a>`).join("・")}</p>
  </section>

  ${NOTE}
</main>

`;
  write(rel, head(rel, `本命卦「${g.name}」の吉方位・凶方位と性格｜八宅風水｜えみり`,
    `八宅風水の本命卦「${g.name}（${g.reading}）」の人の吉方位（${g.good.map((x) => x.name).join("・")}）と凶方位、寝る向き・机の向き、性格・恋愛・仕事、ラッキーカラーを方位盤つきで解説します。`,
    `本命卦「${g.name}」の吉方位と性格｜えみり`, `${g.groupName}・吉方位は${g.good.map((x) => x.name).join("・")}。`, 2) + body + foot(2));
}

function roomPage(r) {
  const rel = `fusui/${r.slug}/`;
  const others = ROOMS.filter((x) => x !== r);
  const body = `<main id="main" class="wrap-narrow">
${crumb([["えみり", "../../"], ["風水", "../"], [`${r.name}の風水`]])}

  <section class="hero">
    <p class="eyebrow">FENG SHUI · ROOM</p>
    <h1>${esc(r.title.split("｜")[0])}｜${esc(r.title.split("｜")[1])}</h1>
    <p>${esc(r.lead)}</p>
  </section>

  <section class="card prose" aria-labelledby="fs-r-basic">
    <h2 id="fs-r-basic">${esc(r.name)}は「${esc(r.theme)}」の場所</h2>
    <p>${esc(r.basics)}</p>
  </section>

  <section class="card prose" aria-labelledby="fs-r-do">
    <p class="eyebrow">DO</p>
    <h2 id="fs-r-do">${esc(r.name)}の風水でやりたいこと</h2>
    <ol class="fs-do">
${r.dos.map(([a, b]) => `      <li><b>${esc(a)}</b><br>${esc(b)}</li>`).join("\n")}
    </ol>
  </section>

  <section class="card prose" aria-labelledby="fs-r-dont">
    <p class="eyebrow">DON'T</p>
    <h2 id="fs-r-dont">${esc(r.name)}で避けたいこと</h2>
    <ul>
${r.donts.map((x) => `      <li>${esc(x)}</li>`).join("\n")}
    </ul>
  </section>

  <section class="card prose" aria-labelledby="fs-r-gua">
    <h2 id="fs-r-gua">あなたの本命卦と合わせて</h2>
    <p>${esc(r.withGua)}</p>
    <p><a class="btn" href="../#fusui-form" data-track="start_click" data-target="fusui" data-position="room">本命卦を調べる（無料）</a></p>
  </section>

  <section class="card" aria-labelledby="fs-r-more">
    <h2 id="fs-r-more">ほかの部屋の風水</h2>
    <ul class="link-list">
${others.map((x) => `      <li><a href="../${x.slug}/"><span>${x.icon} ${esc(x.name)}の風水<br><small class="lead">${esc(x.theme)}</small></span><span class="arrow" aria-hidden="true">→</span></a></li>`).join("\n")}
    </ul>
  </section>

  ${NOTE}
</main>

`;
  write(rel, head(rel, `${r.title}｜えみり`, `${r.lead.slice(0, 70)}${r.name}の風水でやりたいこと・避けたいことと、本命卦（吉方位）との合わせ方を解説します。`,
    `${r.name}の風水｜えみり`, r.lead.slice(0, 60), 2) + body + foot(2));
}

function indexPage() {
  const rel = "fusui/";
  const scripts = ["core/date.js", "core/dom.js", "core/profile.js", "core/birthdate-field.js", "core/astro.js", "content/kyusei-data.js", "engines/kyusei.js", "engines/fusui.js", "content/fusui-text.js", "pages/fusui-page.js"]
    .map((s) => `<script defer src="../assets/js/${s}"></script>`).join("\n");
  const body = `<main id="main" class="wrap-narrow">
${crumb([["えみり", "../"], ["風水"]])}

  <section class="hero">
    <p class="eyebrow">FENG SHUI</p>
    <h1>風水｜本命卦で調べる、あなたの吉方位と部屋づくり</h1>
    <p>八宅（はったく）風水では、生まれた年から「本命卦（ほんめいか）」を出し、人それぞれの吉方位・凶方位を読みます。寝るときの頭の向きや、机で向く方位、部屋づくりのヒントがわかります。</p>
    <ul class="badges" aria-label="特徴">
      <li class="badge">完全無料</li>
      <li class="badge">生年月日だけ</li>
      <li class="badge">方位盤つき</li>
    </ul>
  </section>

  <form id="fusui-form" class="card" novalidate>
    <div data-birthdate="self"></div>
    <fieldset class="fs-sex">
      <legend class="bd-legend">本命卦の出し方</legend>
      <p class="bd-hint">伝統的な八宅風水では、男性と女性で出し方が変わります。答えたくない場合は、両方の結果を並べて表示します。</p>
      <div class="fs-sex-options">
        <label><input type="radio" name="fusui-sex" value="f"> 女性</label>
        <label><input type="radio" name="fusui-sex" value="m"> 男性</label>
        <label><input type="radio" name="fusui-sex" value="x"> 答えない</label>
      </div>
      <p class="bd-error" id="fusui-sex-error" role="alert" hidden></p>
    </fieldset>
    <button type="submit" class="btn">本命卦と吉方位を調べる</button>
  </form>

  <div id="fusui-result" class="fs-result" hidden></div>

  <section class="card" aria-labelledby="fs-gua-list">
    <p class="eyebrow">8 GUA</p>
    <h2 id="fs-gua-list">8つの本命卦</h2>
    <ul class="fs-gua-list">
${F.ORDER.map((n) => { const g = F.guaInfo(n); return `      <li><a href="${g.slug}/"><b>${g.name}</b><span>${g.reading}・${T.GUA[n].symbol}</span><small>${g.groupName}／吉方位 ${g.good.map((x) => x.name).join("・")}</small></a></li>`; }).join("\n")}
    </ul>
  </section>

  <section class="card" aria-labelledby="fs-room-list">
    <p class="eyebrow">ROOMS</p>
    <h2 id="fs-room-list">部屋別の風水</h2>
    ${roomLinks("")}
  </section>

  <section class="card prose" aria-labelledby="fs-how">
    <p class="eyebrow">HOW IT WORKS</p>
    <h2 id="fs-how">八宅風水のしくみ</h2>
    <h3>本命卦と、東四命・西四命</h3>
    <p>八宅風水では、易の8つの卦（坎・坤・震・巽・乾・兌・艮・離）のどれかを、生まれた年から本命卦として出します。年の区切りは立春（2月4日ごろ）です。8つの卦は、吉方位が北・東・南東・南にある「東四命」と、南西・北西・西・北東にある「西四命」の2つのグループに分かれます。</p>
    <h3>8つの方位の吉凶</h3>
    <dl class="learn-dl">
${F.STARS.map((s) => `      <div><dt>${s.name}（${s.reading}）${s.good ? "・吉" : "・凶"}</dt><dd>${esc(T.STAR[s.key].text)}</dd></div>`).join("\n")}
    </dl>
    <h3>方位の測り方</h3>
    <p>家の間取り図の中心に立ったつもりで、北を確かめます。スマホの方位磁石アプリで測った北（磁北）は、日本では地図の北より数度西にずれるので、地図アプリの北に合わせると正確です。</p>
    <h3>九星気学の吉方位との違い</h3>
    <p>八宅風水の吉方位は、生まれた年で決まり、毎年は変わりません。家の中の向きや配置に使います。旅行や引っ越しなど、その年・その月に動く方角を選ぶときは、<a href="../kippoui/">九星気学の吉方位</a>で調べます。</p>
  </section>

  ${NOTE}
</main>

`;
  write(rel, head(rel, "風水｜本命卦で調べる吉方位・凶方位と部屋づくり（八宅風水）｜えみり",
    "八宅風水の本命卦を生年月日から無料で診断。あなたの吉方位・凶方位を方位盤で表示し、寝る向き・机の向き、玄関・寝室・キッチンなど部屋別の風水のポイントも解説します。",
    "風水｜本命卦で調べる吉方位｜えみり", "生年月日から本命卦を出し、吉方位と部屋づくりのヒントを読み解きます。", 1, scripts) + body + foot(1));
}

for (const n of F.ORDER) guaPage(n);
for (const r of ROOMS) roomPage(r);
indexPage();
console.log(`fusui：本命卦 ${F.ORDER.length}・部屋 ${ROOMS.length}`);
