/*
 * 「占いを知る」の解説ページを作る（learn/<占術>/index.html）
 *
 *   node tools/learn/generate.mjs
 *
 * 用語の一覧（星・カード・宿など）は、各占いの鑑定で使っている文章データ（assets/js/content/*）から作る。
 * 鑑定の中身を直したら、このスクリプトを実行し直すと解説ページも同じ内容にそろう。
 * ページの枠（head・ヘッダー・フッター）は learn/suhijutsu/index.html から写す。
 */
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const require = createRequire(import.meta.url);
const R = (p) => require(path.join(ROOT, p));

const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const TEMPLATE = fs.readFileSync(path.join(ROOT, "learn/suhijutsu/index.html"), "utf8");
const HEAD = TEMPLATE.slice(0, TEMPLATE.indexOf("<main"));
const FOOT = TEMPLATE.slice(TEMPLATE.indexOf("<footer"));

function head(slug, title, desc, ogTitle, ogDesc) {
  return HEAD
    .replace(/<title>.*?<\/title>/, `<title>${esc(title)}</title>`)
    .replace(/<meta name="description" content=".*?">/, `<meta name="description" content="${esc(desc)}">`)
    .replace(/https:\/\/emiri-uranai\.com\/learn\/suhijutsu\//g, `https://emiri-uranai.com/learn/${slug}/`)
    .replace(/<meta property="og:title" content=".*?">/, `<meta property="og:title" content="${esc(ogTitle)}">`)
    .replace(/<meta property="og:description" content=".*?">/, `<meta property="og:description" content="${esc(ogDesc)}">`);
}

const card = (id, eyebrow, title, html) => `  <section class="card prose" aria-labelledby="${id}-title">
    <p class="eyebrow">${esc(eyebrow)}</p>
    <h2 id="${id}-title">${esc(title)}</h2>
${html}
  </section>
`;
const p = (t) => `    <p>${esc(t)}</p>`;
const dl = (rows) => `    <dl class="learn-dl">
${rows.map(([k, v]) => `      <div><dt>${esc(k)}</dt><dd>${esc(v)}</dd></div>`).join("\n")}
    </dl>`;
const ul = (items) => `    <ul>
${items.map((x) => `      <li>${x}</li>`).join("\n")}
    </ul>`;
const strongItem = (k, v) => `<strong>${esc(k)}</strong>：${esc(v)}`;

function page(cfg) {
  const links = [`<a class="btn" href="../../${cfg.tool}/" style="max-width:360px">${esc(cfg.tryLabel)}</a>`];
  if (cfg.aisho) links.push(`<a class="btn btn-ghost" href="../../${cfg.tool}/aisho/" style="max-width:360px">${esc(cfg.aishoLabel)}</a>`);
  const body = `<main id="main" class="wrap-narrow">
  <nav class="breadcrumb" aria-label="パンくずリスト">
    <ol>
      <li><a href="../../">えみり</a></li>
      <li><a href="../">占いを知る</a></li>
      <li aria-current="page">${esc(cfg.name)}</li>
    </ol>
  </nav>

  <section class="hero">
    <p class="eyebrow">${esc(cfg.eyebrow)}</p>
    <h1>${esc(cfg.h1)}</h1>
    <p>${esc(cfg.lead)}</p>
  </section>

${cfg.sections.join("\n")}
  <section class="feature-box" aria-labelledby="try-title">
    <p class="eyebrow">TRY IT</p>
    <h2 id="try-title">${esc(cfg.tryTitle)}</h2>
    <p>${esc(cfg.tryText)}</p>
    <p class="learn-actions">${links.join("\n    ")}</p>
  </section>

  <p class="notice">占いは未来や性格を断定するものではありません。自己理解やエンターテインメントとしてお楽しみください。</p>
</main>

`;
  const dir = path.join(ROOT, "learn", cfg.slug);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, "index.html"), head(cfg.slug, cfg.title, cfg.desc, cfg.ogTitle, cfg.ogDesc) + body + FOOT);
  return cfg.slug;
}

const made = [];

/* ---------------- タロット ---------------- */
{
  const deck = R("assets/js/content/tarot-deck.js");
  made.push(page({
    slug: "tarot", name: "タロット", tool: "tarot", eyebrow: "LEARN TAROT", h1: "タロットを知る",
    title: "タロットとは？大アルカナ22枚の意味と正位置・逆位置の読み方｜えみり",
    desc: "タロット占いのしくみを解説。大アルカナ22枚（愚者から世界まで）それぞれの正位置・逆位置のキーワード、3枚引き（過去・現在・未来）の読み方、えみりのタロットのルールをまとめました。",
    ogTitle: "タロットとは？｜えみり", ogDesc: "大アルカナ22枚の意味と、正位置・逆位置の読み方を解説します。",
    lead: "タロットは、78枚（または大アルカナ22枚）のカードに描かれた象徴を通して、いまの状況や気持ち、これからの向き合い方を考える占いです。未来を決めつけるものではなく、「今」を整理するためのヒントとして使います。",
    sections: [
      card("basic", "BASIC", "大アルカナと小アルカナ", [
        p("タロットは、人生の大きなテーマや転機を表す「大アルカナ」22枚と、日常の出来事を表す「小アルカナ」56枚の、合わせて78枚でできています。えみりのタロットは、メッセージがはっきりしている大アルカナ22枚で占います。"),
        p("カードが上下正しく出た「正位置」はテーマがまっすぐ表れた状態、上下逆に出た「逆位置」はテーマが停滞・過剰・不足・内向きになった状態として読みます。逆位置は「悪い意味」とは限りません。")
      ].join("\n")),
      card("cards", "22 CARDS", "大アルカナ22枚の意味", dl(deck.CARDS.map((c) => [`${c.numeral}　${c.name}（${c.nameEn}）`, `正位置：${c.keywords.join("・")}／逆位置：${c.reversedKeywords.join("・")}。${c.upright}`]))),
      card("spread", "THREE CARDS", "3枚引き（過去・現在・未来）", [
        p("選んだ順に、1枚目を「過去（今につながる背景）」、2枚目を「現在（いま中心にあること）」、3枚目を「未来（このまま進んだ先にある可能性）」として読みます。3枚をばらばらに読むのではなく、流れとしてつなげて読むのがコツです。"),
        p("えみりでは、同じ端末・同じ日・同じテーマでは同じ結果を表示します。結果が気に入るまで引き直すのではなく、出たカードからメッセージを受け取ってみてください。")
      ].join("\n"))
    ],
    tryTitle: "タロットを引いてみる", tryText: "総合・恋愛・仕事・人間関係・お金のテーマから選んで、3枚のカードで占えます。", tryLabel: "タロットで占う"
  }));
}

/* ---------------- 九星気学 ---------------- */
{
  const data = R("assets/js/content/kyusei-data.js"), text = R("assets/js/content/kyusei-text.js");
  made.push(page({
    slug: "kyusei", name: "九星気学", tool: "kyusei", eyebrow: "LEARN NINE STAR KI", h1: "九星気学を知る",
    title: "九星気学とは？一白水星〜九紫火星の意味と本命星・月命星の出し方｜えみり",
    desc: "九星気学のしくみを解説。一白水星から九紫火星までの9つの星の五行・象意・性格、本命星と月命星の出し方、立春と節入りで年・月を区切る理由、五行の相生・相剋をまとめました。",
    ogTitle: "九星気学とは？｜えみり", ogDesc: "9つの星の意味と、本命星・月命星の出し方を解説します。",
    lead: "九星気学は、一白水星から九紫火星までの9つの星と、木・火・土・金・水の五行で、人の性質や人どうしの関係、時期の流れを読む日本の占術です。",
    sections: [
      card("basic", "BASIC", "本命星と月命星", [
        p("生まれた年の星を「本命星」、生まれた月の星を「月命星」といいます。九星気学の1年は1月1日ではなく立春（2月4日ごろ）から、1か月は暦の1日ではなく節入りから始まります。そのため1月や2月はじめに生まれた人は、前の年の星になることがあります。"),
        p("本命星はその人の基本的な性質や生き方を、月命星は内面や感じ方を表すとされます。")
      ].join("\n")),
      card("stars", "9 STARS", "9つの星の意味", dl(data.STARS.filter(Boolean).map((s) => [`${s.name}（五行：${s.element}・${s.trigram}）`, `${text.STAR_TEXT[s.number].catch}。象意：${s.imagery.join("・")}`]))),
      card("gogyo", "FIVE ELEMENTS", "五行の相生と相剋", [
        p("相生（そうしょう）は、木→火→土→金→水→木と、となりの五行を生み出す関係。相剋（そうこく）は、木→土→水→火→金→木と、ひとつ飛ばしの五行を抑える関係です。同じ五行どうしは比和（ひわ）といいます。"),
        p("相剋は「悪い関係」ではなく、刺激や調整が生まれやすい関係として読みます。")
      ].join("\n"))
    ],
    tryTitle: "自分の本命星を調べる", tryText: "立春・節入りの時刻で判定した本命星と月命星から、性格・仕事・恋愛を読み解きます。", tryLabel: "九星気学で占う",
    aisho: true, aishoLabel: "九星気学の相性を見る"
  }));
}

/* ---------------- 四柱推命 ---------------- */
{
  const t = R("assets/js/content/shichusuimei-text.js"), e = R("assets/js/engines/shichusuimei.js");
  const readings = ["きのえ", "きのと", "ひのえ", "ひのと", "つちのえ", "つちのと", "かのえ", "かのと", "みずのえ", "みずのと"];
  made.push(page({
    slug: "shichusuimei", name: "四柱推命", tool: "shichusuimei", eyebrow: "LEARN FOUR PILLARS", h1: "四柱推命を知る",
    title: "四柱推命とは？命式・日干（十干）・通変星・十二運・天中殺の意味｜えみり",
    desc: "四柱推命のしくみを解説。命式の作り方、日干（甲〜癸の十干）の意味、比肩から印綬までの通変星10種、長生から養までの十二運、天中殺（空亡）、干合などの相性の見方をまとめました。",
    ogTitle: "四柱推命とは？｜えみり", ogDesc: "十干・通変星・十二運・天中殺の意味を一覧で解説します。",
    lead: "四柱推命は、生まれた年・月・日・時刻の4つの柱を干支で表した「命式」から、その人の本質や運の流れを読む中国生まれの占術です。",
    sections: [
      card("basic", "BASIC", "命式と日干", [
        p("年・月・日・時刻を、それぞれ十干（甲・乙・丙…）と十二支（子・丑・寅…）の組み合わせで表し、4本の柱に並べたものを「命式」と呼びます。生まれた日の干「日干」が自分自身を表し、ほかの文字はすべて日干から見た関係として読みます。"),
        p(t.TRADITION.chushin)
      ].join("\n")),
      card("stems", "10 STEMS", "十干（日干）の意味", dl(e.STEMS.split("").map((s, i) => [`${s}（${readings[i]}）＝${t.DAY_MASTER[s].nature}`, t.DAY_MASTER[s].catch]))),
      card("tsuhen", "10 STARS", "通変星10種の意味", dl(e.TSUHEN.map((n) => [`${n}（${t.TSUHEN[n].keyword}）`, t.TSUHEN[n].body]))),
      card("juniun", "12 STAGES", "十二運の意味", [p(t.TRADITION.juniun), dl(e.JUNIUN.map((n) => [n, t.JUNIUN[n]]))].join("\n")),
      card("kuubou", "VOID", "天中殺（空亡）", [p(t.TRADITION.kuubou), dl(Object.keys(t.KUUBOU).map((k) => [k + "天中殺", t.KUUBOU[k]]))].join("\n")),
      card("compat", "COMPATIBILITY", "四柱推命の相性の見方", [
        p("相性は、ふたりの日干どうしの関係を中心に見ます。甲と己、乙と庚、丙と辛、丁と壬、戊と癸の組み合わせは「干合」と呼ばれ、陰陽が引き合う結びつきの強い組み合わせとされます。"),
        p("あわせて、相手の日干が自分にとって何の通変星に当たるか、生まれた日の十二支（日支）どうしの支合・三合・冲、五行の補い合いを読みます。")
      ].join("\n"))
    ],
    tryTitle: "自分の命式を作る", tryText: "生年月日（と分かれば生まれた時刻）から命式を作り、日干・中心星・五行・天中殺・年運を読み解きます。", tryLabel: "四柱推命で占う",
    aisho: true, aishoLabel: "四柱推命の相性を見る"
  }));
}

/* ---------------- マヤ暦 ---------------- */
{
  const t = R("assets/js/content/maya-text.js"), e = R("assets/js/engines/maya.js");
  made.push(page({
    slug: "maya", name: "マヤ暦", tool: "maya", eyebrow: "LEARN MAYAN CALENDAR", h1: "マヤ暦を知る",
    title: "マヤ暦とは？KINの出し方・20の太陽の紋章・13の銀河の音の意味｜えみり",
    desc: "マヤ暦（13の月の暦）のしくみを解説。KINの出し方、赤い龍から黄色い太陽までの20の太陽の紋章、13の銀河の音、ウェイブスペル、ガイド・類似・反対・神秘KIN、黒KINの意味をまとめました。",
    ogTitle: "マヤ暦とは？｜えみり", ogDesc: "20の紋章と13の音の意味、KINの出し方を解説します。",
    lead: "日本で「マヤ暦」として親しまれている占いは、古代マヤの260日の暦の考え方をもとにした「13の月の暦（ドリームスペル）」で、生まれた日のKIN（キン）からその人を読みます。",
    sections: [
      card("basic", "BASIC", "KINと260日の暦", [
        p("20の紋章と13の音を組み合わせた260日を1巡りとし、1日ごとにKINが1つ進みます。生まれた日のKINが、その人のKINです。えみりでは1987年7月26日をKIN34とし、2月29日は数えずに求めています。"),
        p(t.TRADITION.wavespell)
      ].join("\n")),
      card("seals", "20 SEALS", "20の太陽の紋章", dl(e.SEALS.map((s, i) => [`${i + 1}　${s.name}`, t.SEAL[s.name].keyword + "。" + t.SEAL[s.name].body.split("。")[0] + "。"]))),
      card("tones", "13 TONES", "13の銀河の音", dl(e.TONES.map((n, i) => [`音${i + 1}（${n}）`, t.TONE[i + 1].keyword + "。" + t.TONE[i + 1].body]))),
      card("colors", "4 COLORS", "4つの色", dl(Object.keys(t.COLOR).map((c) => [c + "（" + t.COLOR[c].theme + "）", t.COLOR[c].text]))),
      card("relations", "DESTINY ORACLE", "縁の深い4つのKINと黒KIN", [p(t.TRADITION.relations), dl(Object.keys(t.RELATION).map((k) => [t.RELATION[k].label + "（" + t.RELATION[k].role + "）", t.RELATION[k].text])), p(t.TRADITION.black)].join("\n"))
    ],
    tryTitle: "自分のKINを調べる", tryText: "太陽の紋章・銀河の音・ウェイブスペルと、縁の深い4つのKIN、年回りを読み解きます。", tryLabel: "マヤ暦で占う",
    aisho: true, aishoLabel: "マヤ暦の相性を見る"
  }));
}

/* ---------------- 宿曜占星術 ---------------- */
{
  const t = R("assets/js/content/shukuyo-text.js"), e = R("assets/js/engines/shukuyo.js");
  const order = e.SHUKU.map((s) => s + "宿");
  made.push(page({
    slug: "shukuyo", name: "宿曜占星術", tool: "shukuyo", eyebrow: "LEARN SHUKUYO", h1: "宿曜占星術を知る",
    title: "宿曜占星術とは？本命宿27宿の性格と三九の秘法（相性）の見方｜えみり",
    desc: "宿曜占星術のしくみを解説。旧暦から本命宿を出す方法、昴宿から胃宿までの27宿の性格、三九の秘法による相性（命・業胎・栄親・友衰・安壊・危成）と距離の意味をまとめました。",
    ogTitle: "宿曜占星術とは？｜えみり", ogDesc: "27宿の性格と、三九の秘法の相性を解説します。",
    lead: "宿曜占星術は、インドの占星術が仏教の経典『宿曜経』として中国に伝わり、平安時代に弘法大師空海が日本にもたらしたとされる占術です。月の通り道を27の宿に分け、生まれた日に月があった宿を「本命宿」とします。",
    sections: [
      card("basic", "BASIC", "本命宿の求め方", [
        p("生まれた日を旧暦に直し、旧暦の各月の1日に決まった宿（1月は室宿、2月は奎宿、3月は胃宿、4月は畢宿、5月は参宿、6月は鬼宿、7月は張宿、8月は角宿、9月は氐宿、10月は心宿、11月は斗宿、12月は虚宿）から、1日ごとに宿を進めて求めます。"),
        p("インド占星術の27のナクシャトラが、この二十七宿のもとになっています。")
      ].join("\n")),
      card("shuku", "27 MANSIONS", "27宿の性格", dl(order.map((s) => [s, t.SHUKU[s].keyword + "。" + t.SHUKU[s].body.split("。").slice(0, 2).join("。") + "。"]))),
      card("compat", "SANKU NO HIHOU", "三九の秘法（相性）", [p(t.TRADITION.relations), dl(Object.keys(t.PAIR).map((k) => [t.PAIR[k].title, t.PAIR[k].body]))].join("\n")),
      card("day", "TODAY", "日々の宿と過ごし方", [p(t.TRADITION.today), dl(Object.keys(t.DAY).map((k) => ["「" + k + "」の日", t.DAY[k]]))].join("\n"))
    ],
    tryTitle: "自分の本命宿を調べる", tryText: "旧暦から本命宿を求め、性格・恋愛・仕事と、27宿との相性、今日の巡りを読み解きます。", tryLabel: "宿曜占星術で占う",
    aisho: true, aishoLabel: "宿曜占星術の相性を見る"
  }));
}

/* ---------------- ホロスコープ ---------------- */
{
  const t = R("assets/js/content/horoscope-text.js"), e = R("assets/js/engines/horoscope.js");
  made.push(page({
    slug: "horoscope", name: "西洋占星術・ホロスコープ", tool: "horoscope", eyebrow: "LEARN ASTROLOGY", h1: "西洋占星術（ホロスコープ）を知る",
    title: "ホロスコープとは？12星座・10天体・アスペクトの意味｜えみり",
    desc: "西洋占星術のホロスコープのしくみを解説。12星座の性格とエレメント・クオリティ、太陽・月・水星・金星・火星・木星・土星・天王星・海王星・冥王星の意味、アスペクト（合・トライン・スクエアなど）をまとめました。",
    ogTitle: "ホロスコープとは？｜えみり", ogDesc: "12星座と10天体、アスペクトの意味を解説します。",
    lead: t.TRADITION.chart,
    sections: [
      card("signs", "12 SIGNS", "12星座（太陽星座）の意味", dl(e.SIGNS.map((s) => [`${s.name}（${s.element}・${s.quality}）`, t.SUN[s.name].keyword + "。" + t.SUN[s.name].body.split("。").slice(1, 3).join("。") + "。"]))),
      card("planets", "10 PLANETS", "10天体が表すもの", [p(t.TRADITION.sun), p(t.TRADITION.moon), p(t.TRADITION.personal), p(t.TRADITION.social), p(t.TRADITION.outer)].join("\n")),
      card("balance", "ELEMENTS", "エレメントとクオリティ", [p(t.TRADITION.balance), dl(Object.keys(t.ELEMENT).map((k) => [k + "のエレメント", t.ELEMENT[k]]).concat(Object.keys(t.QUALITY).map((k) => [k + "宮", t.QUALITY[k]])))].join("\n")),
      card("aspects", "ASPECTS", "アスペクト（天体どうしの角度）", [p(t.TRADITION.aspects), ul(e.ASPECTS.map((a) => strongItem(a.name + "（" + a.angle + "°）", "えみりではオーブ（許容範囲）" + a.orb + "°まで")))].join("\n")),
      card("compat", "SYNASTRY", "ホロスコープの相性", p(t.TRADITION.compat))
    ],
    tryTitle: "自分のホロスコープを見る", tryText: "10天体の星座と度数を天文計算で求め、性格・愛し方・行動力と今年の流れを読み解きます。", tryLabel: "ホロスコープで占う",
    aisho: true, aishoLabel: "ホロスコープの相性を見る"
  }));
}

/* ---------------- 紫微斗数 ---------------- */
{
  const t = R("assets/js/content/shibi-text.js"), e = R("assets/js/engines/shibi.js");
  made.push(page({
    slug: "shibi", name: "紫微斗数", tool: "shibi", eyebrow: "LEARN ZI WEI DOU SHU", h1: "紫微斗数を知る",
    title: "紫微斗数とは？命盤・12宮・14主星・四化の意味｜えみり",
    desc: "紫微斗数のしくみを解説。命盤の作り方、命宮・夫妻宮・財帛宮・官禄宮など12宮の意味、紫微星から破軍星までの14主星の性格、化禄・化権・化科・化忌の四化、五行局をまとめました。",
    ogTitle: "紫微斗数とは？｜えみり", ogDesc: "12宮と14主星、四化の意味を解説します。",
    lead: t.TRADITION.chart,
    sections: [
      card("palaces", "12 PALACES", "12宮が表すもの", dl(e.PALACES.map((n) => [n, t.PALACE_THEME[n]]))),
      card("stars", "14 STARS", "14主星の意味", dl(e.MAJOR.map((s) => [s + "星（" + t.STAR[s].keyword + "）", t.STAR[s].mei]))),
      card("sika", "FOUR TRANSFORMATIONS", "四化", [p(t.TRADITION.sika), dl(Object.keys(t.SIKA_TEXT).map((k) => [k, t.SIKA_TEXT[k]]))].join("\n")),
      card("kyoku", "FIVE ELEMENTS", "五行局と身宮", [p(t.TRADITION.kyoku), dl(Object.keys(t.KYOKU).map((k) => [k, t.KYOKU[k]])), p(t.TRADITION.shin)].join("\n")),
      card("compat", "COMPATIBILITY", "紫微斗数の相性", p(t.TRADITION.compat))
    ],
    tryTitle: "自分の命盤を作る", tryText: "生年月日と生まれた時刻から命盤を作り、14主星で性格・恋愛・お金・仕事を読み解きます。", tryLabel: "紫微斗数で占う",
    aisho: true, aishoLabel: "紫微斗数の相性を見る"
  }));
}

/* ---------------- インド占星術 ---------------- */
{
  const t = R("assets/js/content/jyotish-text.js"), e = R("assets/js/engines/jyotish.js");
  const shuku = ["婁", "胃", "昴", "畢", "觜", "参", "井", "鬼", "柳", "星", "張", "翼", "軫", "角", "亢", "氐", "房", "心", "尾", "箕", "斗", "女", "虚", "危", "室", "壁", "奎"];
  made.push(page({
    slug: "jyotish", name: "インド占星術", tool: "jyotish", eyebrow: "LEARN JYOTISH", h1: "インド占星術を知る",
    title: "インド占星術とは？ナクシャトラ27宿・ダシャー・アシュタクータ（相性）の意味｜えみり",
    desc: "インド占星術（ジョーティッシュ）のしくみを解説。サイデリアル方式とアヤナムシャ、月の星座（ラーシ）、アシュヴィニーからレーヴァティーまでの27ナクシャトラ、ヴィムショッタリ・ダシャー、36点満点の相性アシュタクータをまとめました。",
    ogTitle: "インド占星術とは？｜えみり", ogDesc: "27のナクシャトラとダシャー、相性の見方を解説します。",
    lead: t.TRADITION.chart,
    sections: [
      card("rashi", "RASHI", "月の星座（ラーシ）", [p(t.TRADITION.moon), dl(e.RASHI.map((r) => [r.name + "（" + r.ja + "）", t.RASHI[r.name]]))].join("\n")),
      card("nakshatra", "27 NAKSHATRAS", "27のナクシャトラ", [p(t.TRADITION.nakshatra), dl(e.NAKSHATRA.map((n, i) => [`${i + 1}　${n}（宿曜の${shuku[i]}宿）`, t.NAKSHATRA[n][0] + "。" + t.NAKSHATRA[n][1]]))].join("\n")),
      card("dasha", "DASHA", "ヴィムショッタリ・ダシャー", [p(t.TRADITION.dasha), dl(e.DASHA_ORDER.map((l) => [e.LORD_NAME[l] + "（" + e.DASHA_YEARS[l] + "年）", t.DASHA[l].split("：")[1]]))].join("\n")),
      card("compat", "ASHTAKOOTA", "アシュタクータ（36点満点の相性）", [p(t.TRADITION.compat), dl([["ヴァルナ（1点）", t.KOOTA.varna], ["ヴァシャ（2点）", t.KOOTA.vashya], ["ターラ（3点）", t.KOOTA.tara], ["ヨーニ（4点）", t.KOOTA.yoni], ["グラハ・マイトリ（5点）", t.KOOTA.maitri], ["ガナ（6点）", t.KOOTA.gana], ["バクート（7点）", t.KOOTA.bhakoot], ["ナーディ（8点）", t.KOOTA.nadi]])].join("\n"))
    ],
    tryTitle: "自分のナクシャトラを調べる", tryText: "9つの星をサイデリアル方式で求め、月の星座・ナクシャトラ・いまのダシャーを読み解きます。", tryLabel: "インド占星術で占う",
    aisho: true, aishoLabel: "インド占星術の相性（36点）を見る"
  }));
}

/* ---------------- 星獣カルテ ---------------- */
{
  const d = R("assets/js/content/seiju-data.js");
  made.push(page({
    slug: "seiju", name: "星獣カルテ", tool: "seiju", eyebrow: "LEARN SEIJU", h1: "星獣カルテを知る",
    title: "星獣カルテとは？季節と月のリズムで決まる12星獣の一覧｜えみり",
    desc: "えみりのオリジナル占い「星獣カルテ」のしくみを解説。生まれた日の4つの季節（立春・立夏・立秋・立冬で区切る）と3つの月のリズムの組み合わせで決まる、12の星獣の一覧と特徴をまとめました。",
    ogTitle: "星獣カルテとは？｜えみり", ogDesc: "季節×月のリズムで決まる12星獣を解説します。",
    lead: "星獣カルテは、えみりのオリジナル占いです。生まれた日の「季節」と「月の満ち欠けのリズム」の組み合わせから、あなたが宿す12の星獣のひとつを導きます。",
    sections: [
      card("seasons", "4 SEASONS", "4つの季節", dl(Object.values(d.SEASONS).map((s) => [`${s.name}（${s.plain}・${s.range}）`, s.energy + "。" + s.reason]))),
      card("moons", "3 MOONS", "3つの月のリズム", dl(Object.values(d.MOONS).map((m) => [`${m.name}（${m.range}）`, m.meaning]))),
      card("beasts", "12 BEASTS", "12の星獣", dl(Object.values(d.BEASTS).map((b) => [`${b.name}（${d.SEASONS[b.season].plain} × ${d.MOONS[b.moon].name}）`, b.catch + "。" + b.personality.split("。")[0] + "。"])))
    ],
    tryTitle: "自分の星獣を調べる", tryText: "生年月日から、あなたの星獣と、その強み・恋愛・仕事・成長のヒントを読み解きます。", tryLabel: "星獣を調べる",
    aisho: true, aishoLabel: "星獣カルテの相性を見る"
  }));
}

/* ---------------- 暦と五行の基礎 ---------------- */
{
  const daily = R("assets/js/engines/daily.js"), dt = R("assets/js/content/daily-text.js");
  const rokuyo = [["先勝（せんしょう・さきがち）", "午前は吉、午後は凶。急ぐことは早めに済ませるとよいとされる日。"], ["友引（ともびき）", "勝負がつかない日。朝夕は吉、昼は凶。慶事によいとされます。"], ["先負（せんぶ・さきまけ）", "午前は凶、午後は吉。急がず静かに過ごすのがよいとされる日。"], ["仏滅（ぶつめつ）", "万事に凶とされる日。新しいことを始めるより、整理や見直しに向くと考える人もいます。"], ["大安（たいあん）", "万事に吉とされる、もっとも縁起のよい日。"], ["赤口（しゃっこう）", "正午だけが吉とされる日。火や刃物に注意する日ともいわれます。"]];
  made.push(page({
    slug: "koyomi", name: "暦と五行の基礎", tool: "unsei", eyebrow: "LEARN BASICS", h1: "暦と五行の基礎を知る",
    title: "五行・十干十二支・二十四節気・旧暦と六曜の基礎｜えみり",
    desc: "東洋の占いに共通する基礎知識を解説。木・火・土・金・水の五行と相生・相剋、十干と十二支（干支）、二十四節気と節入り、旧暦（太陰太陽暦）のしくみと六曜の意味をまとめました。",
    ogTitle: "暦と五行の基礎｜えみり", ogDesc: "五行・干支・二十四節気・旧暦と六曜の基礎を解説します。",
    lead: "九星気学・四柱推命・紫微斗数・宿曜占星術など、東洋の占いの多くは「五行」「干支」「二十四節気」「旧暦」という共通の土台の上にあります。このページでは、その基礎をまとめています。",
    sections: [
      card("gogyo", "FIVE ELEMENTS", "五行（木・火・土・金・水）", [
        p("五行は、自然のすべてを木・火・土・金・水の5つの性質で表す考え方です。"),
        dl([["相生（そうしょう）", "木は燃えて火を生み、火は灰となって土を生み、土は金（鉱物）を生み、金は表面に水を生み、水は木を育てる。となりへ力を渡す関係です。"], ["相剋（そうこく）", "木は土の養分を吸い、土は水をせき止め、水は火を消し、火は金を溶かし、金は木を切る。ひとつ飛ばしで抑える関係です。"], ["比和（ひわ）", "同じ五行どうし。性質が近く、勢いを強め合う関係です。"]])
      ].join("\n")),
      card("kanshi", "STEMS & BRANCHES", "十干と十二支（干支）", [
        p("十干（甲・乙・丙・丁・戊・己・庚・辛・壬・癸）は五行を陰陽に分けたもの、十二支（子・丑・寅・卯・辰・巳・午・未・申・酉・戌・亥）は年・月・日・時刻の巡りを表します。十干と十二支を順に組み合わせると60通り（六十干支）になり、60年・60日で一巡します。"),
        dl([["甲・乙", "木（甲＝陽、乙＝陰）"], ["丙・丁", "火"], ["戊・己", "土"], ["庚・辛", "金"], ["壬・癸", "水"]])
      ].join("\n")),
      card("sekki", "24 SOLAR TERMS", "二十四節気と節入り", [
        p("二十四節気は、太陽の通り道を15°ずつ24に分け、季節の目安にしたものです。そのうち立春・啓蟄・清明など12の「節」に入る瞬間を「節入り」といい、九星気学や四柱推命では、ここで月が切り替わります。"),
        dl(daily.SOLAR_TERMS.map((s) => [`${s.name}（${s.reading}）・太陽黄経${s.lon}°`, dt.TERM_TEXT[s.name]]))
      ].join("\n")),
      card("kyureki", "LUNISOLAR CALENDAR", "旧暦と六曜", [
        p("旧暦（天保暦）は、新月の日を1日とし、二十四節気の中気で月の番号を決める太陰太陽暦です。中気を含まない月が閏月になります。えみりでは、新月と中気の時刻を天文計算で求めて旧暦を組み立てています。"),
        p("六曜は、旧暦の月と日の数を足して6で割った余りで決まる暦注です。"),
        dl(rokuyo)
      ].join("\n"))
    ],
    tryTitle: "今日の暦を見る", tryText: "毎日の運勢記事に、旧暦・六曜・干支・九星・二十四節気・吉日をまとめて載せています。", tryLabel: "今日の運勢を見る"
  }));
}

console.log("作成：" + made.map((s) => "learn/" + s + "/").join(", "));
