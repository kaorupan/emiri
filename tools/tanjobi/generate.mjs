/*
 * 誕生日占い：366日ぶんのページを作る（tanjobi/MM-DD/index.html と tanjobi/index.html）
 *
 *   node tools/tanjobi/generate.mjs
 *
 * 生まれた年によらず「月日」だけで決まるものから組み立てる。
 *   - 太陽星座（1950〜2025年の各年の正午で判定。年によって変わる日は両方を示す：engines/daily.js と同じ）
 *   - 数秘術のバースデーナンバー・アティチュードナンバー（engines/numerology.js）
 *   - 季節と二十四節気（2026年の暦で、その日が入る節気。年によって1日ほど前後するため「ごろ」と書く）
 *   - 誕生石（全国宝石卸商協同組合の2021年改訂版）
 *   - 相性のよい誕生日（太陽星座のエレメントが同じか補い合い、バースデーナンバーが同じ日）
 * 文章は、星座・数字ごとの既存の鑑定文（content/）と、このファイルのエレメント別の文章を組み合わせる。
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

const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const pad2 = (n) => (n < 10 ? "0" : "") + n;
const core = (n) => (n === 11 ? 2 : n === 22 ? 4 : n === 33 ? 6 : n);

const SIGN_ELEMENT = ["火", "地", "風", "水", "火", "地", "風", "水", "火", "地", "風", "水"];
const SIGN_NAMES = ["牡羊座", "牡牛座", "双子座", "蟹座", "獅子座", "乙女座", "天秤座", "蠍座", "射手座", "山羊座", "水瓶座", "魚座"];
const ELEMENT_LIFE = {
  "火": { love: "恋愛では、好きになったら自分から動く情熱派。駆け引きより、まっすぐな気持ちを伝えることで心が通い合います。", work: "仕事では、新しいことを始める場面や、人を引っぱる場面で輝きます。スピード感のある環境が向いています。", tip: "勢いのあるときこそ、ひと呼吸おいて周りの声を聞くと、運がさらに開けます。" },
  "地": { love: "恋愛では、時間をかけて信頼を育てる誠実派。一緒に過ごす日常の中で、愛情を形にしていきます。", work: "仕事では、こつこつ積み上げ、確かな成果を出すことが得意。専門性や技術を磨くほど評価されます。", tip: "慎重さはあなたの強み。ときには小さな冒険をして、新しい風を取り入れてみて。" },
  "風": { love: "恋愛では、会話と知的な刺激を大切にする軽やかさ。友だちのように話せる相手と長続きします。", work: "仕事では、情報や人をつなぐ役割で力を発揮します。企画・広報・交渉など、ことばを使う場が向いています。", tip: "考えを言葉にするのが得意なぶん、ときには心の声にも耳を傾けると、迷いが晴れます。" },
  "水": { love: "恋愛では、相手の気持ちに深く寄り添う愛情派。心から安心できる相手に、惜しみない愛を注ぎます。", work: "仕事では、人の心を感じとる力が生きる分野で輝きます。ケア・接客・表現の仕事に向いています。", tip: "人の気持ちを受け取りすぎて疲れたら、ひとりで心を整える時間をとりましょう。" }
};
const ELEMENT_HARMONY = { "火": ["火", "風"], "風": ["風", "火"], "地": ["地", "水"], "水": ["水", "地"] };
const BIRTHSTONE = {
  1: "ガーネット", 2: "アメシスト・クリソベリル・キャッツ・アイ", 3: "アクアマリン・サンゴ・ブラッドストーン・アイオライト",
  4: "ダイヤモンド・モルガナイト", 5: "エメラルド・ヒスイ", 6: "真珠・ムーンストーン・アレキサンドライト", 7: "ルビー・スフェーン",
  8: "ペリドット・サードオニックス・スピネル", 9: "サファイア・クンツァイト", 10: "オパール・トルマリン", 11: "トパーズ・シトリン",
  12: "トルコ石・ラピスラズリ・タンザナイト・ジルコン"
};
const DAYS_IN = [31, 29, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];

// 2026年の二十四節気（日本時間の日付）から、その月日が入る節気を求める
const TERMS = [];
for (const y of [2025, 2026]) for (const t of daily.SOLAR_TERMS) {
  const jd = astro.solarLongitudeTime(y, t.lon);
  const d = astro.jstDateFromJulianDay(jd);
  TERMS.push({ name: t.name, reading: t.reading, y: d.year, m: d.month, d: d.day });
}
TERMS.sort((a, b) => a.y - b.y || a.m - b.m || a.d - b.d);
function termOf(m, d) {
  const key = 2026 * 10000 + (m === 2 && d === 29 ? 228 : m * 100 + d);
  let cur = null;
  for (const t of TERMS) if (t.y * 10000 + t.m * 100 + t.d <= key) cur = t;
  return cur;
}
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
  const life = ELEMENT_LIFE[el];
  const bT = numText.TRAITS[core(me.birthday)], aT = numText.TRAITS[core(me.attitude)];
  const term = termOf(m, d), season = seasonOf(term);
  const kw = sunMain.keyword.split("・");
  const signText = me.signs.length === 1
    ? `${name}生まれの太陽星座は${mainSign}です。`
    : `${name}は星座の境目にあたる日で、生まれた年によって${me.signs.map((s) => SIGN_NAMES[s]).join("または")}になります（このページでは多い方の${mainSign}を中心に読んでいます）。`;
  const lead = `${name}生まれの人は、${mainSign}の「${kw[0]}」と、数秘術のバースデーナンバー${me.birthday}（${numText.label(me.birthday)}）が持つ「${bT.gift}」をあわせ持つ人。第一印象では「${aT.gift}」が伝わりやすく、${season}の${term.name}のころに生まれた、${kw[kw.length - 1]}を大切にするタイプです。`;
  const prev = ALL[(me.idx + ALL.length - 1) % ALL.length], next = ALL[(me.idx + 1) % ALL.length];
  const pts = partners(me);
  const title = `${name}生まれの性格と恋愛・仕事｜誕生日占い｜えみり`;
  const desc = `${name}生まれの人の性格・恋愛・仕事・相性を、星座（${mainSign}）と数秘術（バースデーナンバー${me.birthday}・アティチュードナンバー${me.attitude}）から読み解きます。誕生石、生まれた季節、相性のよい誕生日も紹介。`;
  const rel = `tanjobi/${k}/`;
  const signsBlock = me.signs.length > 1
    ? me.signs.map((s) => `    <h3>${esc(SIGN_NAMES[s])}の場合</h3>\n    <p>${esc(horo.SUN[SIGN_NAMES[s]].body)}</p>`).join("\n")
    : `    <p>${esc(sunMain.body)}</p>`;
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
      <div><dt>生まれた季節</dt><dd>${esc(season)}・二十四節気の「${esc(term.name)}（${esc(term.reading)}）」のころ</dd></div>
      <div><dt>誕生石（${m}月）</dt><dd>${esc(BIRTHSTONE[m])}</dd></div>
      <div><dt>1年の中で</dt><dd>${m === 2 && d === 29 ? "4年に一度だけめぐってくる日" : `${me.idx + 1 - (m > 2 ? 1 : 0)}日目（うるう年は${me.idx + 1}日目）`}</dd></div>
    </dl>
  </section>

  <section class="card prose" aria-labelledby="tj-sign-title">
    <p class="eyebrow">ZODIAC</p>
    <h2 id="tj-sign-title">星座から見る性格</h2>
    <p>${esc(signText)}</p>
${signsBlock}
  </section>

  <section class="card prose" aria-labelledby="tj-num-title">
    <p class="eyebrow">NUMEROLOGY</p>
    <h2 id="tj-num-title">数秘術から見る持ち味と第一印象</h2>
    <h3>バースデーナンバー${me.birthday}：${esc(bT.gift)}</h3>
    <p>${esc(`生まれた日から出すバースデーナンバーは、自然に発揮しやすい持ち味を表します。${name}生まれの人のバースデーナンバーは${me.birthday}。「${bT.key}」をテーマに、${bT.gift}を生かせる人です。心が満たされるのは「${bT.need}」を感じられるとき。一方で、${bT.risk}ところには気をつけて。`)}</p>
    <h3>アティチュードナンバー${me.attitude}：${esc(aT.gift)}</h3>
    <p>${esc(`誕生月と誕生日から出すアティチュードナンバーは、初対面の人に伝わりやすい印象を表します。${name}生まれの人は、まわりから「${aT.gift}」を持った人として見られやすいでしょう。`)}</p>
  </section>

  <section class="card prose" aria-labelledby="tj-life-title">
    <p class="eyebrow">LOVE & WORK</p>
    <h2 id="tj-life-title">恋愛と仕事</h2>
    <h3>恋愛</h3>
    <p>${esc(life.love + `バースデーナンバー${me.birthday}のあなたは、相手に「${bT.need}」を求めやすいので、それを言葉にして伝えると関係が安定します。`)}</p>
    <h3>仕事</h3>
    <p>${esc(life.work + `${bT.gift}を生かせる役割を選ぶと、${name}生まれらしい力が発揮されます。`)}</p>
    <h3>開運のヒント</h3>
    <p>${esc(life.tip + `誕生石の${BIRTHSTONE[m].split("・")[0]}を身につけるのもおすすめです。`)}</p>
  </section>

  <section class="card prose" aria-labelledby="tj-season-title">
    <p class="eyebrow">SEASON</p>
    <h2 id="tj-season-title">生まれた季節：${esc(term.name)}のころ</h2>
    <p>${esc(dailyText.TERM_TEXT[term.name])}</p>
    <p>${esc(`${name}は${season}の季節。二十四節気の日付は年によって1日ほど前後するため、生まれた年によっては前後の節気になることもあります。`)}</p>
  </section>

  <section class="card" aria-labelledby="tj-match-title">
    <p class="eyebrow">COMPATIBILITY</p>
    <h2 id="tj-match-title">相性のよい誕生日</h2>
    <p class="lead">${esc(`星座のエレメント（${el}）が調和し、バースデーナンバーの性質が同じ誕生日です。`)}</p>
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
