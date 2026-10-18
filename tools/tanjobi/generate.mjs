/*
 * 誕生日占い：366日ぶんのページを作る（tanjobi/MM-DD/index.html と tanjobi/index.html）
 *
 *   node tools/tanjobi/generate.mjs
 *
 * 生まれた年によらず「月日」だけで決まるものから組み立てる。
 *   - 太陽星座（1950〜2025年の各年の正午で判定。年によって変わる日は両方を示す：engines/daily.js と同じ）
 *   - 数秘術のバースデーナンバー・アティチュードナンバー（engines/numerology.js）
 *   - 季節と二十四節気（七十二候と同じく、1960〜2030年でいちばん多い節気。年によって1日ほど前後するため「ごろ」と書く）
 *   - 誕生石（全国宝石卸商協同組合の2021年改訂版）
 *   - 相性のよい誕生日（太陽星座のエレメントが同じか補い合い、バースデーナンバーが同じ日）
 *   - 七十二候（約5日ごとの季節）と、太陽星座の中の区切り（デーカン：約10日ごと）。tools/tanjobi/data.mjs
 *     どちらも 1960〜2030年の各年の正午の太陽の位置で求め、いちばん多い答えを使う（年によって1日ほど前後するため「ごろ」と書く）
 * 文章は、星座・数字ごとの既存の鑑定文（content/）と、data.mjs の七十二候・デーカンの文章を組み合わせる。
 * 同じ文章を多くの日付で使い回さない（日付ごとのページが量産ページに見えないように）。
 */
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const require = createRequire(import.meta.url);
const R = (p) => require(path.join(ROOT, p));
const daily = R("assets/js/engines/daily.js");
const horo = R("assets/js/content/horoscope-text.js");
const numText = R("assets/js/content/numerology-text.js");
const dailyText = R("assets/js/content/daily-text.js");
const astro = R("assets/js/core/astro.js");
const { KOU, DECAN } = await import(path.join(ROOT, "tools/tanjobi/data.mjs"));
if (KOU.length !== 72) throw new Error("七十二候は72個");

const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const pad2 = (n) => (n < 10 ? "0" : "") + n;
const core = (n) => (n === 11 ? 2 : n === 22 ? 4 : n === 33 ? 6 : n);

const SIGN_ELEMENT = ["火", "地", "風", "水", "火", "地", "風", "水", "火", "地", "風", "水"];
const SIGN_NAMES = ["牡羊座", "牡牛座", "双子座", "蟹座", "獅子座", "乙女座", "天秤座", "蠍座", "射手座", "山羊座", "水瓶座", "魚座"];
const ELEMENT_HARMONY = { "火": ["火", "風"], "風": ["風", "火"], "地": ["地", "水"], "水": ["水", "地"] };
const BIRTHSTONE = {
  1: "ガーネット", 2: "アメシスト・クリソベリル・キャッツ・アイ", 3: "アクアマリン・サンゴ・ブラッドストーン・アイオライト",
  4: "ダイヤモンド・モルガナイト", 5: "エメラルド・ヒスイ", 6: "真珠・ムーンストーン・アレキサンドライト", 7: "ルビー・スフェーン",
  8: "ペリドット・サードオニックス・スピネル", 9: "サファイア・クンツァイト", 10: "オパール・トルマリン", 11: "トパーズ・シトリン",
  12: "トルコ石・ラピスラズリ・タンザナイト・ジルコン"
};
// 誕生石の名前 → パワーストーンの解説ページ
const STONE_PAGE = { "ガーネット": "garnet", "アメシスト": "amethyst", "アクアマリン": "aquamarine", "アイオライト": "iolite", "モルガナイト": "morganite",
  "ヒスイ": "hisui", "ムーンストーン": "moonstone", "ペリドット": "peridot", "オパール": "opal", "トルマリン": "tourmaline", "シトリン": "citrine",
  "トルコ石": "turquoise", "ラピスラズリ": "lapis" };
const DAYS_IN = [31, 29, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];

function seasonOf(term) {
  const order = daily.SOLAR_TERMS.map((t) => t.name);
  const i = order.indexOf(term.name); // 0＝春分
  // 立春(315°)〜：春、立夏(45°)〜：夏、立秋(135°)〜：秋、立冬(225°)〜：冬
  const lon = daily.SOLAR_TERMS[i].lon;
  if (lon >= 315 || lon < 45) return "春";
  if (lon < 135) return "夏";
  if (lon < 225) return "秋";
  return "冬";
}

const ALL = [];
for (let m = 1; m <= 12; m++) for (let d = 1; d <= DAYS_IN[m - 1]; d++) ALL.push({ m, d });
const info = new Map();
ALL.forEach(({ m, d }, idx) => {
  const r = daily.calculateDaily({ year: 2024, month: m, day: d }).birthday;
  const signs = r.signs.map((s) => s.sign);
  info.set(`${m}-${d}`, { m, d, idx, birthday: r.birthday, attitude: r.attitude, signs, share: r.signs });
});

// 七十二候・デーカン：1960〜2030年の各年の正午の太陽の黄経から、いちばん多い答え
function mode(arr) {
  const c = new Map();
  for (const x of arr) c.set(x, (c.get(x) || 0) + 1);
  return [...c.entries()].sort((a, b) => b[1] - a[1])[0][0];
}
for (const me of info.values()) {
  const lons = [];
  for (let y = 1960; y <= 2030; y++) {
    if (me.m === 2 && me.d === 29 && !(y % 4 === 0 && (y % 100 !== 0 || y % 400 === 0))) continue;
    lons.push(astro.sunLongitude(astro.julianDayJst(y, me.m, me.d, 12)));
  }
  me.kou = mode(lons.map((l) => Math.floor((((l - 315) % 360) + 360) % 360 / 5)));
  const main = me.signs[0];
  me.decan = mode(lons.filter((l) => Math.floor(l / 30) === main).map((l) => Math.floor((l % 30) / 10)));
}

const keyOf = (m, d) => `${pad2(m)}-${pad2(d)}`;
const label = (m, d) => `${m}月${d}日`;

function partners(me) {
  const el = SIGN_ELEMENT[me.signs[0]];
  const ok = ELEMENT_HARMONY[el];
  const list = [...info.values()].filter((x) => x !== me && core(x.birthday) === core(me.birthday) && ok.includes(SIGN_ELEMENT[x.signs[0]]));
  // 1年に散らばるように、等間隔に6つ選ぶ
  if (list.length <= 6) return list;
  const out = [];
  for (let i = 0; i < 6; i++) out.push(list[Math.floor(i * list.length / 6)]);
  return out;
}

const TEMPLATE = fs.readFileSync(path.join(ROOT, "learn/suhijutsu/index.html"), "utf8");
const FOOT_RAW = TEMPLATE.slice(TEMPLATE.indexOf("<footer"));
function headFor(rel, title, desc, ogTitle, ogDesc, depth) {
  let h = TEMPLATE.slice(0, TEMPLATE.indexOf("<main"));
  h = h.replace(/<title>.*?<\/title>/, `<title>${esc(title)}</title>`)
    .replace(/<meta name="description" content=".*?">/, `<meta name="description" content="${esc(desc)}">`)
    .replace(/https:\/\/emiri-uranai\.com\/learn\/suhijutsu\//g, `https://emiri-uranai.com/${rel}`)
    .replace(/<meta property="og:title" content=".*?">/, `<meta property="og:title" content="${esc(ogTitle)}">`)
    .replace(/<meta property="og:description" content=".*?">/, `<meta property="og:description" content="${esc(ogDesc)}">`)
    .replace('<li><a href="../../learn/" aria-current="page">占いを知る</a></li>', '<li><a href="../../learn/">占いを知る</a></li>')
    .replace('<link rel="stylesheet" href="../../assets/css/common.css">', '<link rel="stylesheet" href="../../assets/css/common.css">\n<link rel="stylesheet" href="../../assets/css/tanjobi.css">');
  if (depth === 1) h = h.replace(/"\.\.\/\.\.\//g, '"../');
  return h;
}
const footFor = (depth) => (depth === 1 ? FOOT_RAW.replace(/"\.\.\/\.\.\//g, '"../') : FOOT_RAW);

function dayPage(me) {
  const { m, d } = me;
  const k = keyOf(m, d), name = label(m, d);
  const mainSign = SIGN_NAMES[me.signs[0]];
  const sunMain = horo.SUN[mainSign];
  const el = SIGN_ELEMENT[me.signs[0]];
  const kou = KOU[me.kou], dec = DECAN[mainSign][me.decan];
  const decName = `${mainSign}の第${me.decan + 1}デーカン`;
  const bT = numText.TRAITS[core(me.birthday)], aT = numText.TRAITS[core(me.attitude)];
  // 二十四節気は七十二候と同じ計算（3候で1節気）にそろえ、同じページの中で食い違わないようにする
  const tLon = (315 + Math.floor(me.kou / 3) * 15) % 360;
  const term = daily.SOLAR_TERMS.find((t) => t.lon === tLon), season = seasonOf(term);
  const kw = sunMain.keyword.split("・");
  const signText = me.signs.length === 1
    ? `${name}生まれの太陽星座は${mainSign}です。`
    : `${name}は星座の境目にあたる日で、生まれた年によって${me.signs.map((s) => SIGN_NAMES[s]).join("または")}になります（このページでは多い方の${mainSign}を中心に読んでいます）。`;
  const lead = `${name}生まれの人は、${mainSign}の「${kw[0]}」と、数秘術のバースデーナンバー${me.birthday}（${numText.label(me.birthday)}）が持つ「${bT.gift}」をあわせ持つ人。第一印象では「${aT.gift}」が伝わりやすく、七十二候の「${kou[0]}」のころに生まれた、${kw[kw.length - 1]}を大切にするタイプです。`;
  const prev = ALL[(me.idx + ALL.length - 1) % ALL.length], next = ALL[(me.idx + 1) % ALL.length];
  const pts = partners(me);
  const signLabel = me.signs.map((s) => SIGN_NAMES[s]).join("か");
  const title = `${name}生まれは何座？${signLabel}の性格と恋愛・仕事｜誕生日占い｜えみり`;
  const desc = `${name}生まれの人の性格・恋愛・仕事・相性を、星座（${mainSign}）と数秘術（バースデーナンバー${me.birthday}・アティチュードナンバー${me.attitude}）から読み解きます。誕生石、生まれた季節、相性のよい誕生日も紹介。`;
  const rel = `tanjobi/${k}/`;
  const signsBlock = me.signs.length > 1
    ? me.signs.map((s) => `    <h3>${esc(SIGN_NAMES[s])}の場合</h3>\n    <p>${esc(horo.SUN[SIGN_NAMES[s]].body)}</p>`).join("\n")
    : `    <p>${esc(`${mainSign}のキーワードは「${sunMain.keyword}」。`)}</p>`;
  const body = `<main id="main" class="wrap-narrow">
  <nav class="breadcrumb" aria-label="パンくずリスト">
    <ol>
      <li><a href="../../">えみり</a></li>
      <li><a href="../">誕生日占い</a></li>
      <li aria-current="page">${esc(name)}</li>
    </ol>
  </nav>

  <section class="hero">
    <p class="eyebrow">BIRTHDAY ${esc(k.replace("-", "/"))}</p>
    <h1>${esc(name)}生まれの性格と運勢</h1>
    <p>${esc(lead)}</p>
  </section>

  <section class="card prose" aria-labelledby="tj-profile-title">
    <p class="eyebrow">PROFILE</p>
    <h2 id="tj-profile-title">${esc(name)}生まれのプロフィール</h2>
    <dl class="learn-dl">
      <div><dt>太陽星座</dt><dd>${esc(me.signs.map((s) => SIGN_NAMES[s]).join("・"))}${me.signs.length > 1 ? "（生まれた年による）" : ""}</dd></div>
      <div><dt>バースデーナンバー</dt><dd>${me.birthday}（${esc(numText.label(me.birthday))}）</dd></div>
      <div><dt>アティチュードナンバー</dt><dd>${me.attitude}（${esc(numText.label(me.attitude))}）</dd></div>
      <div><dt>星座の中の区切り</dt><dd>${esc(decName)}（${esc(dec.sub === mainSign ? `${mainSign}らしさがいちばん濃い区切り` : `${dec.sub}の色が加わる区切り`)}）</dd></div>
      <div><dt>生まれた季節</dt><dd>${esc(season)}・二十四節気の「${esc(term.name)}（${esc(term.reading)}）」のころ</dd></div>
      <div><dt>七十二候</dt><dd>「${esc(kou[0])}（${esc(kou[1])}）」のころ</dd></div>
      <div><dt>誕生石（${m}月）</dt><dd>${BIRTHSTONE[m].split("・").map((x) => (STONE_PAGE[x] ? `<a href="../../powerstone/${STONE_PAGE[x]}/">${esc(x)}</a>` : esc(x))).join("・")}</dd></div>
      <div><dt>1年の中で</dt><dd>${m === 2 && d === 29 ? "4年に一度だけめぐってくる日" : `${me.idx + 1 - (m > 2 ? 1 : 0)}日目（うるう年は${me.idx + 1}日目）`}</dd></div>
    </dl>
  </section>

  <section class="card prose" aria-labelledby="tj-sign-title">
    <p class="eyebrow">ZODIAC</p>
    <h2 id="tj-sign-title">星座から見る性格</h2>
    <p>${esc(signText)}</p>
${signsBlock}
    <h3>${esc(decName)}<small class="tj-sub">星座を10°ずつ3つに分けた区切り</small></h3>
    <p>${esc(`${name}生まれは${decName}。${dec.trait}`)}</p>
  </section>

  <section class="card prose" aria-labelledby="tj-num-title">
    <p class="eyebrow">NUMEROLOGY</p>
    <h2 id="tj-num-title">数秘術から見る持ち味と第一印象</h2>
    <h3>バースデーナンバー${me.birthday}：${esc(bT.gift)}</h3>
    <p>${esc(`${name}生まれのバースデーナンバー（自然に出る持ち味）は${me.birthday}。「${bT.key}」をテーマに、${bT.gift}を生かせる人です。心が満たされるのは「${bT.need}」を感じられるとき。一方で、${bT.risk}ところには気をつけて。`)}</p>
    <h3>アティチュードナンバー${me.attitude}：${esc(aT.gift)}</h3>
    <p>${esc(`初対面では「${aT.gift}」が先に伝わり、${aT.key}の人として覚えられやすいでしょう。${bT.gift}との組み合わせが、${name}生まれならではの個性です。`)}</p>
  </section>

  <section class="card prose" aria-labelledby="tj-life-title">
    <p class="eyebrow">LOVE & WORK</p>
    <h2 id="tj-life-title">恋愛と仕事</h2>
    <h3>恋愛</h3>
    <p>${esc(dec.love + `バースデーナンバー${me.birthday}のあなたは、相手に「${bT.need}」を求めやすいので、それを言葉にして伝えると関係が安定します。`)}</p>
    <h3>仕事</h3>
    <p>${esc(dec.work + `${bT.gift}を生かせる役割を選ぶと、${name}生まれらしい力が発揮されます。`)}</p>
    <h3>開運のヒント</h3>
    <p>${esc(`${bT.risk}と感じたときは、ひと呼吸おいて。第一印象の「${aT.gift}」を意識すると、人との縁が広がります。誕生石の${BIRTHSTONE[m].split("・")[0]}をお守りにするのもおすすめです。`)}</p>
  </section>

  <section class="card prose" aria-labelledby="tj-season-title">
    <p class="eyebrow">SEASON</p>
    <h2 id="tj-season-title">生まれた季節：${esc(term.name)}のころ</h2>
    <p>${esc(dailyText.TERM_TEXT[term.name])}</p>
    <h3>七十二候「${esc(kou[0])}（${esc(kou[1])}）」<small class="tj-sub">約5日ごとの季節</small></h3>
    <p>${esc(`${name}ごろは「${kou[0]}」。${kou[2]}`)}</p>
    <p>${esc(kou[3])}</p>
    <p class="tj-note">${esc(`季節の区切りは年によって1日ほど前後します。`)}</p>
  </section>

  <section class="card" aria-labelledby="tj-match-title">
    <p class="eyebrow">COMPATIBILITY</p>
    <h2 id="tj-match-title">相性のよい誕生日</h2>
    <p class="lead">${esc(`${name}生まれ（${mainSign}・${el}のエレメント）と星座のエレメントが調和し、バースデーナンバー${core(me.birthday)}の性質が同じ誕生日です。`)}</p>
    <ul class="tj-days">
${pts.map((x) => `      <li><a href="../${keyOf(x.m, x.d)}/">${esc(label(x.m, x.d))}<small>${esc(SIGN_NAMES[x.signs[0]])}</small></a></li>`).join("\n")}
    </ul>
    <p><a href="../../aisho/">生年月日で、もっとくわしい相性占いを見る →</a></p>
  </section>

  <section class="feature-box" aria-labelledby="tj-more-title">
    <p class="eyebrow">MORE</p>
    <h2 id="tj-more-title">生まれ年を入れて、もっとくわしく</h2>
    <p>${esc(`${name}生まれでも、生まれた年によって九星・干支・月の星座などが変わります。生年月日を入れると、あなただけの結果が見られます。`)}</p>
    <ul class="tj-tools">
      <li><a href="../../horoscope/">ホロスコープ</a></li>
      <li><a href="../../suhijutsu/">数秘術</a></li>
      <li><a href="../../kyusei/">九星気学</a></li>
      <li><a href="../../shichusuimei/">四柱推命</a></li>
      <li><a href="../../seiju/">星獣カルテ</a></li>
      <li><a href="../../maya/">マヤ暦</a></li>
      <li><a href="../../shukuyo/">宿曜占星術</a></li>
      <li><a href="../../jyotish/">インド占星術</a></li>
    </ul>
  </section>

  <nav class="tj-pager" aria-label="前後の誕生日">
    <a href="../${keyOf(prev.m, prev.d)}/">← ${esc(label(prev.m, prev.d))}</a>
    <a href="../">誕生日の一覧</a>
    <a href="../${keyOf(next.m, next.d)}/">${esc(label(next.m, next.d))} →</a>
  </nav>

  <p class="notice">占いは未来や性格を断定するものではありません。自己理解やエンターテインメントとしてお楽しみください。</p>
</main>

`;
  const dir = path.join(ROOT, "tanjobi", k);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, "index.html"), headFor(rel, title, desc, `${name}生まれの性格｜えみり`, `${name}生まれの性格・恋愛・仕事・相性を、星座と数秘術から読み解きます。`, 2) + body + footFor(2));
}

function indexPage() {
  const months = [];
  for (let m = 1; m <= 12; m++) {
    const days = ALL.filter((x) => x.m === m);
    months.push(`  <section class="card" aria-labelledby="tj-m${m}-title">
    <h2 id="tj-m${m}-title">${m}月生まれ<small class="tj-stone">誕生石：${esc(BIRTHSTONE[m])}</small></h2>
    <ul class="tj-grid">
${days.map((x) => `      <li><a href="${keyOf(x.m, x.d)}/">${x.d}</a></li>`).join("\n")}
    </ul>
  </section>`);
  }
  const body = `<main id="main" class="wrap-narrow">
  <nav class="breadcrumb" aria-label="パンくずリスト">
    <ol>
      <li><a href="../">えみり</a></li>
      <li aria-current="page">誕生日占い</li>
    </ol>
  </nav>

  <section class="hero">
    <p class="eyebrow">BIRTHDAY</p>
    <h1>誕生日占い｜366日の性格と運勢</h1>
    <p>1月1日から12月31日まで、2月29日を含む366日それぞれの性格・恋愛・仕事・相性を、星座と数秘術から読み解きます。誕生石や生まれた季節、相性のよい誕生日も紹介しています。</p>
  </section>

  <form class="card tj-jump" id="tj-jump" action="#" novalidate>
    <label for="tj-month">月</label>
    <select id="tj-month">${Array.from({ length: 12 }, (_, i) => `<option value="${i + 1}">${i + 1}月</option>`).join("")}</select>
    <label for="tj-day">日</label>
    <select id="tj-day">${Array.from({ length: 31 }, (_, i) => `<option value="${i + 1}">${i + 1}日</option>`).join("")}</select>
    <button type="submit" class="btn">誕生日を見る</button>
  </form>

${months.join("\n\n")}

  <p class="notice">占いは未来や性格を断定するものではありません。自己理解やエンターテインメントとしてお楽しみください。</p>
</main>
<script src="../assets/js/pages/tanjobi-index.js" defer></script>

`;
  fs.mkdirSync(path.join(ROOT, "tanjobi"), { recursive: true });
  fs.writeFileSync(path.join(ROOT, "tanjobi/index.html"),
    headFor("tanjobi/", "誕生日占い｜366日の誕生日別の性格・恋愛・相性｜えみり",
      "誕生日占い。1月1日〜12月31日（2月29日を含む）366日それぞれの性格・恋愛・仕事・相性を、星座と数秘術のバースデーナンバー・アティチュードナンバーから読み解きます。誕生石・生まれた季節・相性のよい誕生日も。無料。",
      "誕生日占い｜えみり", "366日それぞれの誕生日の性格・恋愛・相性を読み解きます。", 1) + body + footFor(1));
}

for (const me of info.values()) dayPage(me);
indexPage();
console.log(`作成：tanjobi/ と ${info.size} 日分のページ`);
