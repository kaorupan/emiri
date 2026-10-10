/*
 * 姓名判断：画数の意味のページ seimei/kakusu/NN/index.html（1〜81）と seimei/kakusu/index.html を作る
 *
 *   node tools/seimei/generate.mjs
 *
 * 文章は assets/js/content/seimei-numbers.js・seimei-text.js（えみりのオリジナル）。
 * /seimei/ と /seimei/aisho/ は手書きのページなので、このスクリプトでは触らない。
 */
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const require = createRequire(import.meta.url);
const numbers = require(path.join(ROOT, "assets/js/content/seimei-numbers.js"));
const content = require(path.join(ROOT, "assets/js/content/seimei-text.js"));
const engine = require(path.join(ROOT, "assets/js/engines/seimei.js"));

const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const pad = (n) => (n < 10 ? "0" + n : String(n));
const LUCK_CLASS = { "大吉": "dai", "吉": "kichi", "半吉": "han", "凶": "kyo" };
const badge = (l) => `<span class="seimei-luck seimei-luck-${LUCK_CLASS[l]}">${l}</span>`;
const EL = content.EL_TEXT;

const TEMPLATE = fs.readFileSync(path.join(ROOT, "learn/suhijutsu/index.html"), "utf8");
function head(rel, title, desc, ogTitle, ogDesc, depth) {
  let h = TEMPLATE.slice(0, TEMPLATE.indexOf("<main"))
    .replace(/<title>.*?<\/title>/, `<title>${esc(title)}</title>`)
    .replace(/<meta name="description" content=".*?">/, `<meta name="description" content="${esc(desc)}">`)
    .replace(/https:\/\/emiri-uranai\.com\/learn\/suhijutsu\//g, `https://emiri-uranai.com/${rel}`)
    .replace(/<meta property="og:title" content=".*?">/, `<meta property="og:title" content="${esc(ogTitle)}">`)
    .replace(/<meta property="og:description" content=".*?">/, `<meta property="og:description" content="${esc(ogDesc)}">`)
    .replace('<li><a href="../../learn/" aria-current="page">占いを知る</a></li>', '<li><a href="../../learn/">占いを知る</a></li>')
    .replace('<link rel="stylesheet" href="../../assets/css/common.css">', '<link rel="stylesheet" href="../../assets/css/common.css">\n<link rel="stylesheet" href="../../assets/css/kyusei.css">\n<link rel="stylesheet" href="../../assets/css/seimei.css">');
  if (depth === 3) h = h.replace(/"\.\.\/\.\.\//g, '"../../../');
  return h;
}
const FOOT = TEMPLATE.slice(TEMPLATE.indexOf("<footer"));
const foot = (depth) => (depth === 3 ? FOOT.replace(/"\.\.\/\.\.\//g, '"../../../') : FOOT);

const ROLE_LINE = {
  jin: (n, k) => `人格が${n}画の人は、性格の中心に「${k}」の性質を持っています。働き盛りの時期に、この数の力が強く表れるとされます。`,
  sou: (n, k) => `総格が${n}画の人は、人生全体を通して「${k}」がテーマになります。年齢を重ねるほど、この数の性質がはっきりしてくるでしょう。`,
  chi: (n, k) => `地格が${n}画の人は、子どものころから「${k}」の個性が表れやすく、それが人生の土台になります。`,
  gai: (n, k) => `外格が${n}画の人は、職場や友人など、人との関わりの中で「${k}」の面が出やすくなります。`
};

const all = [];
for (let n = 1; n <= 81; n++) all.push(numbers.number(n));

function numberPage(e) {
  const n = e.n, rel = `seimei/kakusu/${pad(n)}/`;
  const el = engine.elementOf(n);
  const title = `姓名判断 ${n}画の意味｜${e.luck}・${e.keyword}｜えみり`;
  const desc = `姓名判断で${n}画は「${e.luck}」。${e.keyword}を表す数です。人格・総格・地格・外格が${n}画のときの意味、恋愛・仕事の傾向とアドバイスを解説します。`;
  const sameLuck = all.filter((x) => x.luck === e.luck && x.n !== n);
  const near = sameLuck.sort((a, b) => Math.abs(a.n - n) - Math.abs(b.n - n)).slice(0, 8).sort((a, b) => a.n - b.n);
  const prev = n > 1 ? all[n - 2] : null, next = n < 81 ? all[n] : null;
  const body = `<main id="main" class="wrap-narrow">
  <nav class="breadcrumb" aria-label="パンくずリスト">
    <ol>
      <li><a href="../../../">えみり</a></li>
      <li><a href="../../">姓名判断</a></li>
      <li><a href="../">画数の意味</a></li>
      <li aria-current="page">${n}画</li>
    </ol>
  </nav>

  <section class="hero">
    <p class="eyebrow">STROKE NUMBER ${n}</p>
    <h1>姓名判断 ${n}画の意味</h1>
    <p>${badge(e.luck)}　<span class="seimei-lead">${esc(e.keyword)}</span></p>
    <p>${esc(e.text)}</p>
  </section>

  <section class="card prose" aria-labelledby="kk-traits-title">
    <p class="eyebrow">LOVE &amp; WORK</p>
    <h2 id="kk-traits-title">${n}画の人の恋愛と仕事</h2>
    <h3>恋愛・人間関係</h3>
    <p>${esc(e.love)}</p>
    <h3>仕事・お金</h3>
    <p>${esc(e.work)}</p>
    <h3>${n}画のあなたへ</h3>
    <p>${esc(e.advice)}</p>
  </section>

  <section class="card prose" aria-labelledby="kk-kaku-title">
    <p class="eyebrow">FIVE GRIDS</p>
    <h2 id="kk-kaku-title">${n}画がどの格にあるかで変わる意味</h2>
${["jin", "sou", "chi", "gai"].map((k) => {
    const K = content.KAKU.find((x) => x.key === k);
    return `    <h3>${K.name}が${n}画のとき</h3>\n    <p>${esc(ROLE_LINE[k](n, e.keyword))}</p>`;
  }).join("\n")}
    <p class="kyusei-meta">天格（姓の画数の合計）は家系から受け継ぐ格で、個人の吉凶にはあまり影響しないとされます。</p>
  </section>

  <section class="card prose" aria-labelledby="kk-data-title">
    <p class="eyebrow">DATA</p>
    <h2 id="kk-data-title">${n}画のデータ</h2>
    <ul>
      <li>吉凶：${e.luck}</li>
      <li>五行（三才配置での当てはめ）：${esc(EL[el])}</li>
      <li>${n + 80}画も、81で一巡して${n}画と同じ意味として読みます。</li>
    </ul>
    <p class="kyusei-meta">吉凶の区分は、熊崎式の流れをくむ一般的な81数の区分にそろえています。流派によって、一部の数の扱いが異なることがあります。</p>
  </section>

  <section class="feature-box" aria-labelledby="kk-try-title">
    <p class="eyebrow">TRY</p>
    <h2 id="kk-try-title">あなたの名前は何画？</h2>
    <p>名前を入力するだけで、人格・総格など五格の画数と吉凶、三才配置がわかります。</p>
    <p class="learn-actions"><a class="btn" href="../../" style="max-width:300px">姓名判断をする（無料）</a>
    <a class="btn btn-ghost" href="../../aisho/" style="max-width:300px">名前の相性を見る</a></p>
  </section>

  <section class="card" aria-labelledby="kk-same-title">
    <p class="eyebrow">${e.luck}</p>
    <h2 id="kk-same-title">ほかの${e.luck}の数</h2>
    <ul class="seimei-grid">
${near.map((x) => `      <li><a href="../${pad(x.n)}/"><b>${x.n}画</b>${badge(x.luck)}<small>${esc(x.keyword)}</small></a></li>`).join("\n")}
    </ul>
    <nav class="seimei-pager" aria-label="前後の数">
      ${prev ? `<a href="../${pad(prev.n)}/">← ${prev.n}画</a>` : "<span></span>"}
      <a href="../">1〜81画の一覧</a>
      ${next ? `<a href="../${pad(next.n)}/">${next.n}画 →</a>` : "<span></span>"}
    </nav>
  </section>
</main>

`;
  const dir = path.join(ROOT, "seimei", "kakusu", pad(n));
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, "index.html"), head(rel, title, desc, `姓名判断 ${n}画の意味｜えみり`, `${e.luck}・${e.keyword}`, 3) + body + foot(3));
}

function indexPage() {
  const groups = ["大吉", "吉", "半吉", "凶"];
  const body = `<main id="main" class="wrap-narrow">
  <nav class="breadcrumb" aria-label="パンくずリスト">
    <ol>
      <li><a href="../../">えみり</a></li>
      <li><a href="../">姓名判断</a></li>
      <li aria-current="page">画数の意味</li>
    </ol>
  </nav>

  <section class="hero">
    <p class="eyebrow">STROKE NUMBERS</p>
    <h1>姓名判断 画数の意味一覧（1〜81画）</h1>
    <p>姓名判断で使う1〜81画、それぞれの数の吉凶と意味の一覧です。気になる数を選ぶと、恋愛・仕事の傾向や、人格・総格など五格にあるときの意味を読めます。</p>
  </section>

  <section class="card" aria-labelledby="kk-all-title">
    <h2 id="kk-all-title">1〜81画の一覧</h2>
    <ul class="seimei-grid">
${all.map((x) => `      <li><a href="${pad(x.n)}/"><b>${x.n}画</b>${badge(x.luck)}<small>${esc(x.keyword)}</small></a></li>`).join("\n")}
    </ul>
  </section>

${groups.map((g) => `  <section class="card" aria-labelledby="kk-${LUCK_CLASS[g]}-title">
    <h2 id="kk-${LUCK_CLASS[g]}-title">${g}の数</h2>
    <p>${all.filter((x) => x.luck === g).map((x) => `<a href="${pad(x.n)}/">${x.n}</a>`).join("・")}</p>
  </section>`).join("\n\n")}

  <section class="card prose" aria-labelledby="kk-kaku-title">
    <h2 id="kk-kaku-title">五格とは</h2>
    <p>姓名判断では、名前の画数から5つの格（五格）を出し、それぞれの数の吉凶を見ます。</p>
    <ul>
${content.KAKU.map((k) => `      <li><strong>${k.name}（${k.alias}）</strong>：${esc(k.how)}。${esc(k.short)}。</li>`).join("\n")}
    </ul>
    <p>姓や名が1字のときは、霊数1を足して天格・地格・外格を出します。81を超える数は、80を引いた数として読みます。</p>
    <p class="kyusei-meta">吉凶の区分は、熊崎式の流れをくむ一般的な81数の区分にそろえています。数の意味の文章はえみりのオリジナルです。</p>
  </section>

  <section class="feature-box" aria-labelledby="kk-try-title">
    <p class="eyebrow">TRY</p>
    <h2 id="kk-try-title">あなたの名前を姓名判断</h2>
    <p>名前を入力するだけで、五格の画数と吉凶、三才配置を無料で鑑定します。</p>
    <p class="learn-actions"><a class="btn" href="../" style="max-width:300px">姓名判断をする（無料）</a></p>
  </section>
</main>

`;
  const dir = path.join(ROOT, "seimei", "kakusu");
  fs.mkdirSync(dir, { recursive: true });
  const h = head("seimei/kakusu/", "姓名判断 画数の意味一覧（1〜81画）｜吉数・大吉の数｜えみり",
    "姓名判断の1〜81画の吉凶と意味を一覧で紹介。大吉・吉・半吉・凶の数がひと目でわかります。人格・総格など五格にあるときの意味や、恋愛・仕事の傾向も解説。",
    "姓名判断 画数の意味一覧｜えみり", "1〜81画の吉凶と意味の一覧です。", 2);
  fs.writeFileSync(path.join(dir, "index.html"), h + body + foot(2));
}

all.forEach(numberPage);
indexPage();
console.log(`seimei: kakusu ${all.length} pages + index`);
