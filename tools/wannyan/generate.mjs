/*
 * 星のわんにゃん占い：wannyan/（診断と96タイプの一覧）、wannyan/<タイプ>/（96ページ）を作る
 *
 *   node tools/wannyan/generate.mjs
 *
 * 判定は assets/js/engines/wannyan.js、文章は assets/js/content/wannyan-data.js と seiju-types.js（えみりのオリジナル）。
 * 画像：assets/img/wannyan/<slug>.webp があれば使い、なければ絵文字のカードを出す（あとから画像を置いて実行し直すだけで差し替わる）。
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const W = require(path.join(ROOT, "assets/js/engines/wannyan.js"));
const T = require(path.join(ROOT, "assets/js/content/seiju-types.js"));
const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const NAME = "星のわんにゃん占い";
const IMG_DIR = path.join(ROOT, "assets/img/wannyan");
const hasImg = (slug) => fs.existsSync(path.join(IMG_DIR, `${slug}.webp`));
const emoji = (t) => (t.kind === "dog" ? "🐶" : "🐱");

const TEMPLATE = fs.readFileSync(path.join(ROOT, "learn/suhijutsu/index.html"), "utf8");
function head(rel, title, desc, ogTitle, ogDesc, depth, scripts = "") {
  let h = TEMPLATE.slice(0, TEMPLATE.indexOf("<main"))
    .replace(/<title>.*?<\/title>/, `<title>${esc(title)}</title>`)
    .replace(/<meta name="description" content=".*?">/, `<meta name="description" content="${esc(desc)}">`)
    .replace(/https:\/\/emiri-uranai\.com\/learn\/suhijutsu\//g, `https://emiri-uranai.com/${rel}`)
    .replace(/<meta property="og:title" content=".*?">/, `<meta property="og:title" content="${esc(ogTitle)}">`)
    .replace(/<meta property="og:description" content=".*?">/, `<meta property="og:description" content="${esc(ogDesc)}">`)
    .replace('<li><a href="../../learn/" aria-current="page">占いを知る</a></li>', '<li><a href="../../learn/">占いを知る</a></li>')
    .replace('<link rel="stylesheet" href="../../assets/css/common.css">', '<link rel="stylesheet" href="../../assets/css/common.css">\n<link rel="stylesheet" href="../../assets/css/wannyan.css">' + (scripts ? "\n" + scripts : ""));
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

export function picture(t, up, size = "lg") {
  if (hasImg(t.slug)) return `<img class="wn-photo wn-${size}" src="${up}assets/img/wannyan/${t.slug}.webp" width="480" height="480" alt="${esc(t.name)}のイメージ" loading="${size === "lg" ? "eager" : "lazy"}">`;
  return `<span class="wn-photo wn-${size} wn-ph wn-ph-${t.kind}" role="img" aria-label="${esc(t.name)}"><span class="wn-ph-emoji" aria-hidden="true">${emoji(t)}</span>${size === "lg" ? `<span class="wn-ph-name">${esc(t.breed)}</span>` : ""}</span>`;
}

const birthText = (t) => `${t.period.name}（${t.period.range}）に、${t.moon.name}（${t.moon.age}）のころ生まれた人`;

function typePage(t) {
  const rel = `wannyan/${t.slug}/`;
  const mates = W.TYPES.filter((x) => x.beastId === t.beastId && x !== t);
  const same = W.TYPES.filter((x) => x.kind === t.kind && x.beastId !== t.beastId && (x.moon.id === t.moon.id || x.period.id === t.period.id)).slice(0, 6);
  const body = `<main id="main" class="wrap-narrow">
  <nav class="breadcrumb" aria-label="パンくずリスト">
    <ol>
      <li><a href="../../">えみり</a></li>
      <li><a href="../">${NAME}</a></li>
      <li aria-current="page">${esc(t.name)}</li>
    </ol>
  </nav>

  <section class="hero wn-hero">
    ${picture(t, "../../")}
    <div>
      <p class="eyebrow">${t.kind === "dog" ? "DOG" : "CAT"} · No.${String(t.index + 1).padStart(2, "0")}</p>
      <h1>${esc(t.name)}タイプ</h1>
      <p class="wn-motto">「${esc(t.motto)}」</p>
      <p class="wn-team">${esc(t.group.name)}（${esc(t.beastName)}のなかま）</p>
    </div>
  </section>

  <section class="card prose" aria-labelledby="wn-persona-title">
    <p class="eyebrow">PERSONALITY</p>
    <h2 id="wn-persona-title">${esc(t.name)}タイプの性格</h2>
    <p>${esc(t.persona)}</p>
    <h3>強み</h3>
    <p>${esc(t.strength)}</p>
    <h3>弱点</h3>
    <p>${esc(t.weakness)}</p>
  </section>

  <section class="card prose" aria-labelledby="wn-life-title">
    <p class="eyebrow">LOVE &amp; WORK</p>
    <h2 id="wn-life-title">恋愛と仕事</h2>
    <h3>恋愛</h3>
    <p>${esc(t.love)} ${esc(t.period.love)} ${esc(t.moon.love)}</p>
    <h3>仕事</h3>
    <p>${esc(t.work)} ${esc(t.period.work)} ${esc(t.moon.work)}</p>
  </section>

  <section class="card prose" aria-labelledby="wn-birth-title">
    <p class="eyebrow">BIRTH</p>
    <h2 id="wn-birth-title">このタイプになる人</h2>
    <p>${esc(birthText(t))}が、${esc(t.name)}タイプです。生まれた日の太陽と月の位置から決まるので、同じ誕生日でも生まれた年によってタイプが変わります。</p>
    <h3>生まれた時期：${esc(t.period.name)}</h3>
    <p>${esc(t.period.trait)}</p>
    <h3>月の形：${esc(t.moon.name)}（${esc(t.moon.reading)}）</h3>
    <p>${esc(t.moon.trait)}</p>
    <p class="wn-cta"><a class="btn" href="../">自分のタイプを生年月日で調べる</a></p>
    <p><a href="../aisho/">気になる人との相性を占う →</a></p>
  </section>

  <section class="card" aria-labelledby="wn-team-title">
    <p class="eyebrow">TEAM</p>
    <h2 id="wn-team-title">${esc(t.group.name)}のなかま</h2>
    <p>${esc(t.group.desc)}同じチームの8タイプは、えみりのオリジナル占い「<a href="../../seiju/">星獣カルテ</a>」では「${esc(t.beastName)}」にあたります。</p>
    <ul class="wn-grid">
${mates.map((x) => `      <li><a href="../${x.slug}/">${picture(x, "../../", "sm")}<span>${esc(x.name)}</span></a></li>`).join("\n")}
    </ul>
${same.length ? `    <h3 class="wn-subhead">同じ時期・同じ月の形の${t.kind === "dog" ? "わんこ" : "にゃんこ"}</h3>
    <ul class="wn-grid">
${same.map((x) => `      <li><a href="../${x.slug}/">${picture(x, "../../", "sm")}<span>${esc(x.name)}</span></a></li>`).join("\n")}
    </ul>
` : ""}    <p><a href="../#wn-all">96タイプの一覧を見る</a></p>
  </section>

  <p class="notice">${NAME}は、えみりのオリジナル占いです。犬種・猫種のイメージを借りて性格を表したもので、その種類の犬や猫の実際の性格を決めつけるものではありません。</p>
</main>

`;
  write(rel, head(rel, `${t.name}タイプの性格・恋愛・仕事｜${NAME}｜えみり`,
    `${NAME}の「${t.name}」タイプ。${t.persona.slice(0, 60)}…性格・強み・恋愛・仕事と、このタイプになる生まれ方を紹介します。`,
    `${t.name}タイプ｜${NAME}`, `「${t.motto}」${t.name}タイプの性格と恋愛・仕事。`, 2) + body + foot(2));
}

function indexPage() {
  const rel = "wannyan/";
  const scripts = ["core/date.js", "core/dom.js", "core/profile.js", "core/birthdate-field.js", "core/astro.js", "engines/seiju.js", "content/seiju-data.js", "content/seiju-types.js", "content/wannyan-data.js", "engines/wannyan.js", "pages/wannyan-page.js"]
    .map((s) => `<script defer src="../assets/js/${s}"></script>`).join("\n");
  const teams = [];
  for (const t of W.TYPES) { const last = teams[teams.length - 1]; if (!last || last.id !== t.beastId) teams.push({ id: t.beastId, group: t.group, beast: t.beastName, list: [t] }); else last.list.push(t); }
  const images = W.TYPES.filter((t) => hasImg(t.slug)).map((t) => t.slug).join(",");
  const body = `<main id="main" class="wrap-narrow">
  <nav class="breadcrumb" aria-label="パンくずリスト">
    <ol>
      <li><a href="../">えみり</a></li>
      <li aria-current="page">${NAME}</li>
    </ol>
  </nav>

  <section class="hero">
    <p class="eyebrow">STAR PETS</p>
    <h1>${NAME}｜あなたは96タイプのどの子？</h1>
    <p>生まれた日の太陽と月の位置から、あなたを「甘えん坊のゴールデンレトリバー」「プライドの高いペルシャ猫」など、犬48・猫48の96タイプに分けて、性格・恋愛・仕事を読み解く、えみりのオリジナル占いです。</p>
    <ul class="badges" aria-label="特徴">
      <li class="badge">完全無料</li>
      <li class="badge">生年月日だけ</li>
      <li class="badge">犬48・猫48</li>
    </ul>
  </section>

  <form id="wannyan-form" class="card" novalidate>
    <div data-birthdate="wannyan"></div>
    <button type="submit" class="btn">わたしのタイプを見る</button>
  </form>
  <p class="wn-aisho-link"><a href="aisho/">ふたりの相性を占う（わんこ×にゃんこ相性）→</a></p>

  <div id="wannyan-result" class="wn-result" hidden data-images="${esc(images)}"></div>

  <section class="card prose" aria-labelledby="wn-how-title">
    <p class="eyebrow">HOW IT WORKS</p>
    <h2 id="wn-how-title">96タイプの決まり方</h2>
    <p>${NAME}は、生まれた日の空から、あなたのタイプを決めます。</p>
    <ul>
      <li><strong>生まれた時期（8つ）</strong>：太陽の位置で、季節を前半と後半に分けます。${T.PERIODS.map((p) => p.name).join("・")}。</li>
      <li><strong>月の形（12）</strong>：新月から次の新月までを12に分け、昔からの月の呼び名をつけました。${T.MOONS.map((m) => m.name).join("・")}。</li>
      <li><strong>わんこか、にゃんこか</strong>：月のリズム（満ちゆく月・満ちた月・欠けゆく月）の中で、前半の月の形に生まれた人はわんこ、後半の月の形に生まれた人はにゃんこになります。</li>
      <li><strong>チーム（12）</strong>：季節と月のリズムが同じ8タイプは、同じチームのなかま。えみりの「<a href="../seiju/">星獣カルテ</a>」の12星獣にあたります。</li>
    </ul>
    <p>結果では、生まれた日の「元素」（木・火・土・金・水）も添えて、あなただけの読み解きをお届けします。</p>
  </section>

  <section class="card" id="wn-all" aria-labelledby="wn-all-title">
    <p class="eyebrow">ALL 96 TYPES</p>
    <h2 id="wn-all-title">96タイプの一覧</h2>
${teams.map((tm) => `    <h3 class="wn-team-head">${esc(tm.group.name)} <small>${esc(tm.beast)}のなかま</small></h3>
    <p class="wn-team-desc">${esc(tm.group.desc)}</p>
    <ul class="wn-grid">
${tm.list.map((x) => `      <li><a href="${x.slug}/">${picture(x, "../", "sm")}<span>${esc(x.name)}</span></a></li>`).join("\n")}
    </ul>`).join("\n")}
  </section>

  <p class="notice">${NAME}は、えみりのオリジナル占いです。犬種・猫種のイメージを借りて性格を表したもので、その種類の犬や猫の実際の性格を決めつけるものではありません。入力した生年月日はサーバーに送信しません。</p>
</main>

`;
  write(rel, head(rel, `${NAME}｜生年月日で96タイプの犬・猫に診断【無料】｜えみり`,
    `${NAME}は、生年月日から「甘えん坊のゴールデンレトリバー」「プライドの高いペルシャ猫」など犬48・猫48の96タイプに診断する、えみりのオリジナル占い。性格・恋愛・仕事がわかります。無料・登録不要。`,
    `${NAME}｜あなたは96タイプのどの子？`, "生年月日から、犬48・猫48の96タイプに診断。性格・恋愛・仕事がわかります。", 1, scripts) + body + foot(1));
}

// 画像の指示書（別の生成AIに渡す用。サイトには出さない）
function promptsFile() {
  const lines = [`# ${NAME}：イメージ画像の指示書（96枚）`, "",
    "## 共通の指示（毎回これを先に入れてください）", "",
    "```",
    "占いサイトのキャラクター用に、犬または猫の写真風の画像を作ってください。",
    "・正方形（1024×1024）、写真のようにリアルで、やさしく上品な雰囲気",
    "・動物が画面の中央に、胸から上〜全身が入る構図。目にキャッチライトが入り、表情がわかること",
    "・背景：深い紫〜夜空の紺（#1C1427〜#07050C）のグラデーションに、金色（#E7C568）の小さな星のボケを少し",
    "・96枚すべて同じ背景・同じ光のトーンでそろえる",
    "・文字、ロゴ、人間、首輪のブランド名、実在の有名な犬猫に似せた表現は入れない",
    "```", "",
    "## 1枚ずつの指示（共通の指示のあとに、1行ずつ入れてください）", "",
    "ファイル名は左の英字のとおりに保存してください（例：golden-retriever.png）。", ""];
  for (const t of W.TYPES) lines.push(`- \`${t.slug}\`：${t.breed}。「${t.adj}」雰囲気で（${t.motto}）`);
  fs.writeFileSync(path.join(ROOT, "tools/wannyan/image-prompts.md"), lines.join("\n") + "\n");
}

function aishoPage() {
  const rel = "wannyan/aisho/";
  const scripts = ["core/date.js", "core/dom.js", "core/profile.js", "core/birthdate-field.js", "core/astro.js", "engines/seiju.js", "content/seiju-data.js", "content/seiju-text.js", "content/seiju-types.js", "content/wannyan-data.js", "engines/wannyan.js", "content/wannyan-aisho.js", "pages/wannyan-aisho-page.js"]
    .map((s) => `<script defer src="../../assets/js/${s}"></script>`).join("\n");
  const images = W.TYPES.filter((t) => hasImg(t.slug)).map((t) => t.slug).join(",");
  const body = `<main id="main" class="wrap-narrow">
  <nav class="breadcrumb" aria-label="パンくずリスト">
    <ol>
      <li><a href="../../">えみり</a></li>
      <li><a href="../">${NAME}</a></li>
      <li aria-current="page">相性</li>
    </ol>
  </nav>

  <section class="hero">
    <p class="eyebrow">STAR PETS · COMPATIBILITY</p>
    <h1>${NAME}の相性｜わんこ×にゃんこで見るふたりの関係</h1>
    <p>ふたりの生年月日から、それぞれの犬・猫タイプを出して、「わんこ×にゃんこの組み合わせ」「月の形」「生まれた時期」「元素」「チームどうし」の5つで相性を読み解きます。恋人・友だち・家族・職場の人、誰とでも占えます。</p>
    <ul class="badges" aria-label="特徴">
      <li class="badge">完全無料</li>
      <li class="badge">生年月日だけ</li>
      <li class="badge">誰とでも</li>
    </ul>
  </section>

  <form id="wannyan-aisho-form" class="card" novalidate>
    <div data-birthdate="wn-self"></div>
    <div data-birthdate="wn-partner" class="wn-partner-field"></div>
    <button type="submit" class="btn">ふたりの相性を見る</button>
  </form>

  <div id="wannyan-aisho-result" class="wn-result" hidden data-images="${esc(images)}"></div>

  <section class="card prose" aria-labelledby="wn-ah-how">
    <h2 id="wn-ah-how">相性の見方</h2>
    <ul>
      <li><strong>わんこ×にゃんこ</strong>：わんこどうし、にゃんこどうし、わんことにゃんこ。3つの組み合わせで、ふたりの距離感がわかります。</li>
      <li><strong>月の形</strong>：12の月の形がどれだけ離れているか。同じ月、となりの月、向かい合う月など。</li>
      <li><strong>生まれた時期</strong>：8つの時期の関係。同じ季節の前と後、向かい合う季節など。</li>
      <li><strong>元素</strong>：木・火・土・金・水の、育て合う関係（相生）と引き締め合う関係（相剋）。</li>
      <li><strong>チームどうし</strong>：えみりの「<a href="../../seiju/aisho/">星獣カルテの相性</a>」で、恋愛・会話・仕事・すれ違いやすいポイントまで。</li>
    </ul>
    <p><a href="../">自分ひとりのタイプを見る</a>・<a href="../#wn-all">96タイプの一覧</a></p>
  </section>

  <p class="notice">${NAME}は、えみりのオリジナル占いです。入力した生年月日はサーバーに送信しません。</p>
</main>

`;
  write(rel, head(rel, `${NAME}の相性｜生年月日でわかる、わんこ×にゃんこの相性診断【無料】｜えみり`,
    `${NAME}の相性診断。ふたりの生年月日から犬・猫タイプを出して、わんこ×にゃんこの組み合わせ・月の形・生まれた時期・元素・チームどうしの5つで相性を読み解きます。無料・登録不要。`,
    `${NAME}の相性｜えみり`, "ふたりの生年月日から、わんこ×にゃんこで相性を読み解きます。", 2, scripts) + body + foot(2));
}

for (const t of W.TYPES) typePage(t);
aishoPage();
indexPage();
promptsFile();
console.log(`wannyan：96タイプ（画像あり ${W.TYPES.filter((t) => hasImg(t.slug)).length}）`);
