/*
 * 夢占い辞典：yume/<語>/index.html と yume/index.html を作る
 *
 *   node tools/yume/generate.mjs
 *
 * 文章は tools/yume/data/*.mjs（えみりのオリジナル）。カテゴリを増やすときは CATS に足す。
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
// カテゴリの並び順。data/<id>.mjs がカテゴリ本体。
// data/*-more.mjs は既存カテゴリへの追加（addTo）と、既存の語への追記（upgrade：心理・恋愛・仕事・場面の追加）。
const CATS = ["animal", "insect", "people", "emotion", "action", "body", "nature", "place", "vehicle", "thing", "food", "fashion", "hobby", "event", "supernatural"];
const MORE = fs.readdirSync(path.join(ROOT, "tools/yume/data")).filter((f) => /-more\.mjs$/.test(f)).sort();
const LUCK = { good: "吉夢", mixed: "状況しだい", caution: "注意のサイン" };
const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

const cats = [];
for (const c of CATS) cats.push((await import(path.join(ROOT, "tools/yume/data", c + ".mjs"))).default);
// take：ほかのカテゴリから語を移す（URLは変わらない）
for (const c of cats) for (const slug of c.take || []) {
  const from = cats.find((x) => x !== c && x.entries.some((e) => e.slug === slug));
  if (!from) throw new Error(`${c.id}: take の ${slug} がない`);
  const i = from.entries.findIndex((e) => e.slug === slug);
  c.entries.push(from.entries.splice(i, 1)[0]);
}
for (const f of MORE) {
  const m = (await import(path.join(ROOT, "tools/yume/data", f))).default;
  if (m.addTo) {
    const cat = cats.find((c) => c.id === m.addTo);
    if (!cat) throw new Error(`${f}: カテゴリ ${m.addTo} がない`);
    cat.entries.push(...m.entries);
  }
  for (const [slug, up] of Object.entries(m.upgrade || {})) {
    const e = cats.flatMap((c) => c.entries).find((x) => x.slug === slug);
    if (!e) throw new Error(`${f}: upgrade の ${slug} がない`);
    for (const k of ["psych", "love", "work", "meaning", "summary", "advice"]) if (up[k]) e[k] = up[k];
    if (up.variants) e.variants = e.variants.concat(up.variants);
    if (up.related) e.related = [...new Set(e.related.concat(up.related))];
  }
}
const all = [];
cats.forEach((c) => c.entries.forEach((e) => all.push({ ...e, cat: c })));
// 「噛まれる」「走る」など動きの言葉は「噛まれる夢」、「蛇」「海」などは「蛇の夢」にする
const yumeName = (w) => (/[るうくすつぬむぶぐ]$/.test(w) ? `${w}夢` : `${w}の夢`);
const bySlug = new Map(all.map((e) => [e.slug, e]));
if (bySlug.size !== all.length) throw new Error("slug が重複している");
for (const e of all) {
  if (e.parent && !bySlug.has(e.parent)) throw new Error(`${e.slug}: parent ${e.parent} がない`);
  for (const r of e.related) if (!bySlug.has(r)) throw new Error(`${e.slug}: related ${r} がない`);
}
const childrenOf = (slug) => all.filter((x) => x.parent === slug);

const TEMPLATE = fs.readFileSync(path.join(ROOT, "learn/suhijutsu/index.html"), "utf8");
function head(rel, title, desc, ogTitle, ogDesc, depth) {
  let h = TEMPLATE.slice(0, TEMPLATE.indexOf("<main"))
    .replace(/<title>.*?<\/title>/, `<title>${esc(title)}</title>`)
    .replace(/<meta name="description" content=".*?">/, `<meta name="description" content="${esc(desc)}">`)
    .replace(/https:\/\/emiri-uranai\.com\/learn\/suhijutsu\//g, `https://emiri-uranai.com/${rel}`)
    .replace(/<meta property="og:title" content=".*?">/, `<meta property="og:title" content="${esc(ogTitle)}">`)
    .replace(/<meta property="og:description" content=".*?">/, `<meta property="og:description" content="${esc(ogDesc)}">`)
    .replace('<li><a href="../../learn/" aria-current="page">占いを知る</a></li>', '<li><a href="../../learn/">占いを知る</a></li>')
    .replace('<link rel="stylesheet" href="../../assets/css/common.css">', '<link rel="stylesheet" href="../../assets/css/common.css">\n<link rel="stylesheet" href="../../assets/css/yume.css">');
  if (depth === 1) h = h.replace(/"\.\.\/\.\.\//g, '"../');
  return h;
}
const FOOT = TEMPLATE.slice(TEMPLATE.indexOf("<footer"));
const foot = (depth) => (depth === 1 ? FOOT.replace(/"\.\.\/\.\.\//g, '"../') : FOOT);

function entryPage(e) {
  const rel = `yume/${e.slug}/`;
  const word = e.word;
  const title = `【夢占い】${yumeName(word)}の意味｜${e.variants.slice(0, 2).map((v) => v[0]).join("・")}など｜えみり`;
  const desc = `${yumeName(word)}の意味を夢占いで解説。${e.summary}${e.variants.map((v) => v[0]).slice(0, 3).join("、")}など、${e.variants.length}の場面ごとの意味とアドバイスを紹介します。`;
  const related = e.related.map((s) => bySlug.get(s)).filter((r) => r && r.slug !== e.parent);
  const parent = e.parent ? bySlug.get(e.parent) : null;
  const children = childrenOf(e.slug);
  const toc = e.variants.length >= 4;
  const sameCat = e.cat.entries.filter((x) => x.slug !== e.slug && !e.related.includes(x.slug)).slice(0, 6);
  const body = `<main id="main" class="wrap-narrow">
  <nav class="breadcrumb" aria-label="パンくずリスト">
    <ol>
      <li><a href="../../">えみり</a></li>
      <li><a href="../">夢占い辞典</a></li>
      <li><a href="../#yume-${e.cat.id}">${esc(e.cat.name)}</a></li>
${parent ? `      <li><a href="../${parent.slug}/">${esc(parent.word)}</a></li>\n` : ""}      <li aria-current="page">${esc(word)}</li>
    </ol>
  </nav>

  <section class="hero">
    <p class="eyebrow">DREAM DICTIONARY</p>
    <h1>${esc(yumeName(word))}の意味</h1>
    <p class="yume-reading">${esc(e.reading)}</p>
    <p><span class="yume-luck yume-luck-${e.luck}">${LUCK[e.luck]}</span></p>
    <p>${esc(e.summary)}</p>
  </section>

  <section class="card prose" aria-labelledby="yume-meaning-title">
    <p class="eyebrow">MEANING</p>
    <h2 id="yume-meaning-title">${esc(yumeName(word))}が表すもの</h2>
    <p>${esc(e.meaning)}</p>
  </section>

${toc ? `  <nav class="card yume-toc" aria-labelledby="yume-toc-title">
    <p class="eyebrow">CONTENTS</p>
    <h2 id="yume-toc-title">${esc(yumeName(word))}　場面から探す</h2>
    <ol>
${e.variants.map((v, i) => `      <li><a href="#s${i + 1}">${esc(v[0])}</a></li>`).join("\n")}
    </ol>
  </nav>

` : ""}${children.length ? `  <section class="card" aria-labelledby="yume-kids-title">
    <p class="eyebrow">TYPES</p>
    <h2 id="yume-kids-title">種類別の${esc(yumeName(word))}</h2>
    <ul class="yume-tags">
${children.map((c) => `      <li><a href="../${c.slug}/">${esc(yumeName(c.word))}</a></li>`).join("\n")}
    </ul>
  </section>

` : ""}${e.psych ? `  <section class="card prose" aria-labelledby="yume-psych-title">
    <p class="eyebrow">MIND</p>
    <h2 id="yume-psych-title">${esc(yumeName(word))}を見るときの心理</h2>
    <p>${esc(e.psych)}</p>
  </section>

` : ""}  <section class="card prose" aria-labelledby="yume-variants-title">
    <p class="eyebrow">SITUATIONS</p>
    <h2 id="yume-variants-title">場面別の意味</h2>
${e.variants.map((v, i) => `    <h3 id="s${i + 1}">${esc(v[0])}</h3>\n    <p>${esc(v[1])}</p>`).join("\n")}
  </section>

${e.love || e.work ? `  <section class="card prose" aria-labelledby="yume-life-title">
    <p class="eyebrow">LOVE &amp; WORK</p>
    <h2 id="yume-life-title">恋愛・仕事での意味</h2>
${e.love ? `    <h3>恋愛</h3>\n    <p>${esc(e.love)}</p>` : ""}
${e.work ? `    <h3>仕事・人間関係</h3>\n    <p>${esc(e.work)}</p>` : ""}
  </section>
` : ""}${parent ? `
  <p class="yume-parent"><a href="../${parent.slug}/">← ${esc(yumeName(parent.word))} 全体の意味を見る</a></p>
` : ""}

  <section class="card prose" aria-labelledby="yume-advice-title">
    <p class="eyebrow">ADVICE</p>
    <h2 id="yume-advice-title">この夢を見たあなたへ</h2>
    <p>${esc(e.advice)}</p>
    <p class="kyusei-meta">夢占いは、夢を手がかりに心の状態を見つめ直すためのものです。未来を決めつけるものではありません。</p>
  </section>

${related.length ? `  <section class="card" aria-labelledby="yume-related-title">
    <p class="eyebrow">RELATED</p>
    <h2 id="yume-related-title">関連する夢</h2>
    <ul class="yume-tags">
${related.map((r) => `      <li><a href="../${r.slug}/">${esc(yumeName(r.word))}</a></li>`).join("\n")}
    </ul>
  </section>
` : ""}
  <section class="card" aria-labelledby="yume-cat-title">
    <p class="eyebrow">${esc(e.cat.id.toUpperCase())}</p>
    <h2 id="yume-cat-title">${esc(e.cat.name)}のほかの夢</h2>
    <ul class="yume-tags">
${sameCat.map((r) => `      <li><a href="../${r.slug}/">${esc(yumeName(r.word))}</a></li>`).join("\n")}
      <li><a href="../#yume-${e.cat.id}">${esc(e.cat.name)}の一覧 →</a></li>
    </ul>
  </section>

  <section class="feature-box" aria-labelledby="yume-more-title">
    <p class="eyebrow">MORE</p>
    <h2 id="yume-more-title">今日のあなたの運勢も</h2>
    <p>夢で気になったことがあれば、今日の運勢や、生年月日で見る占いも参考にしてみてください。</p>
    <p class="learn-actions"><a class="btn" href="../../unsei/" style="max-width:300px">今日の運勢を見る</a>
    <a class="btn btn-ghost" href="../../#uranau" style="max-width:300px">無料占いを選ぶ</a></p>
  </section>
</main>

`;
  const dir = path.join(ROOT, "yume", e.slug);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, "index.html"), head(rel, title, desc, `${yumeName(word)}の意味｜夢占い｜えみり`, e.summary, 2) + body + foot(2));
}

function indexPage() {
  const sections = cats.map((c) => `  <section class="card" id="yume-${c.id}" aria-labelledby="yume-${c.id}-title">
    <h2 id="yume-${c.id}-title">${esc(c.name)}</h2>
    <p class="lead">${esc(c.lead)}</p>
    <ul class="yume-list">
${c.entries.map((e) => `      <li data-words="${esc(e.word + " " + e.reading + " " + e.variants.map((v) => v[0]).join(" "))}"><a href="${e.slug}/"><b>${esc(e.word)}</b><small>${esc(e.summary)}</small></a></li>`).join("\n")}
    </ul>
  </section>`).join("\n\n");
  const body = `<main id="main" class="wrap-narrow">
  <nav class="breadcrumb" aria-label="パンくずリスト">
    <ol>
      <li><a href="../">えみり</a></li>
      <li aria-current="page">夢占い辞典</li>
    </ol>
  </nav>

  <section class="hero">
    <p class="eyebrow">DREAM DICTIONARY</p>
    <h1>夢占い辞典</h1>
    <p>見た夢のキーワードから、夢が伝えるメッセージを読み解きます。${cats.map((c) => c.name.replace(/の夢$/, "")).join("・")}の${all.length}のキーワードを、${all.reduce((t, e) => t + e.variants.length, 0)}の場面別の意味とアドバイスつきで解説しています。</p>
  </section>

  <form class="card yume-search" role="search" onsubmit="return false">
    <label for="yume-q">夢のキーワードで探す</label>
    <input id="yume-q" type="search" placeholder="例：蛇、歯が抜ける、追いかけられる" autocomplete="off">
    <p id="yume-count" class="kyusei-meta" aria-live="polite"></p>
  </form>

  <nav class="card yume-cats" aria-label="カテゴリ">
    <ul class="yume-tags">
${cats.map((c) => `      <li><a href="#yume-${c.id}">${esc(c.name)}（${c.entries.length}）</a></li>`).join("\n")}
    </ul>
  </nav>

${sections}

  <p class="notice">夢占いは、夢を手がかりに心の状態を見つめ直すためのものです。未来を決めつけるものではありません。体調や心の不調が続くときは、専門家に相談してください。</p>
</main>
<script src="../assets/js/pages/yume-index.js" defer></script>

`;
  fs.writeFileSync(path.join(ROOT, "yume/index.html"),
    head("yume/", "夢占い辞典｜夢の意味をキーワードで検索｜えみり",
      `夢占い辞典。蛇・歯が抜ける・追いかけられる・元恋人・お金・空を飛ぶなど、よく見る夢${all.length}のキーワードの意味を、場面別の解釈とアドバイスつきで解説します。無料。`,
      "夢占い辞典｜えみり", "見た夢のキーワードから、夢が伝えるメッセージを読み解きます。", 1) + body + foot(1));
}

fs.mkdirSync(path.join(ROOT, "yume"), { recursive: true });
for (const e of all) entryPage(e);
indexPage();
console.log(`作成：yume/ と ${all.length} 語のページ`);
