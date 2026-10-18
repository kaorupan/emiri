/*
 * 総合相性（えみりの組み合わせ）
 *   ふたりの生年月日から、8つの占術の相性をまとめて出す。
 *   それぞれの占術の判定（相生・干合・三九の秘法など）を、えみりの目安として 0〜100 の点に置きかえ、平均を総合点にする。
 *   点は「相性のよし悪しを決めるもの」ではなく、どの占術でいちばん響き合うかを見るための目安。
 *
 * ブラウザでは window.KaruteContent.sougouAisho、Node では module.exports。計算は各エンジンに任せる。
 */
(function (root, factory) {
  var api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  root.KaruteContent = root.KaruteContent || {};
  root.KaruteContent.sougouAisho = api;
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";

  var STAR = ["", "一白水星", "二黒土星", "三碧木星", "四緑木星", "五黄土星", "六白金星", "七赤金星", "八白土星", "九紫火星"];
  var KY = { sosho: [86, "相生（支え合う関係）"], hiwa: [78, "比和（似た者同士）"], sokoku: [60, "相剋（刺激し合う関係）"] };
  var SH_STEM = { same: [78, "同じ五行で、価値観が近い"], generates: [84, "あなたが相手を育てる五行"], generated: [84, "相手があなたを育てる五行"], controls: [62, "あなたが相手を引っぱる五行"], controlled: [62, "相手があなたを引っぱる五行"] };
  var SH_BRANCH = { shigou: [10, "日支が支合（暮らしのリズムが合う）"], sangou: [6, "日支が三合（同じ方向を向ける）"], same: [3, "日支が同じ"], chuu: [-10, "日支が冲（ぶつかりやすい）"], none: [0, ""] };
  var SIGN = { same: [88, "同じ星座"], sameElement: [86, "同じエレメント"], harmony: [80, "補い合うエレメント"], contrast: [62, "ちがうタイプのエレメント"] };
  var SHUKU = { "栄親": 92, "業胎": 86, "命": 82, "友衰": 78, "危成": 66, "安壊": 54 };
  var MAYA_LINK = { same: "同じKIN", occult: "神秘KIN", analog: "類似KIN", partnerGuide: "相手があなたのガイドKIN", youGuide: "あなたが相手のガイドKIN", antipode: "反対KIN" };
  var MAYA_SHARED = { seal: "同じ太陽の紋章", tone: "同じ銀河の音", wavespell: "同じウェイブスペル", color: "同じ色の紋章", toneMystic: "銀河の音が神秘の関係" };
  var UB = { 3: 84, 2: 88, 1: 72, 0: 62 };

  var RELATIONS = {
    love: { label: "恋人・片思い", noun: "ふたり" },
    marriage: { label: "夫婦・結婚", noun: "夫婦" },
    friend: { label: "友達・同性", noun: "ふたり" },
    family: { label: "親子・きょうだい", noun: "家族" },
    work: { label: "仕事・職場", noun: "ふたり" }
  };
  var BANDS = [
    { min: 85, title: "とても相性のよい" },
    { min: 76, title: "相性のよい" },
    { min: 66, title: "育てるほどよくなる" },
    { min: 0, title: "ちがいを学び合う" }
  ];
  var TIPS = {
    love: ["自然体でいられる関係。気持ちは言葉にして伝えるほど深まります。", "会話のテンポが合いやすいふたり。小さな約束を重ねると、信頼が育ちます。", "惹かれる部分と、すれ違う部分の両方があります。相手のペースを知ることが近道です。", "ちがいが刺激になる関係。決めつけずに、相手の考えを聞く時間をとりましょう。"],
    marriage: ["暮らしの感覚が合いやすく、長く穏やかに続きやすい組み合わせです。", "支え合える組み合わせ。家事やお金の役割分担を話し合うと、さらに安定します。", "生活の中でちがいが見えやすい組み合わせ。ルールをふたりで決めると楽になります。", "価値観のちがいを持ち寄る夫婦。相手の得意を頼る姿勢が、家庭を強くします。"],
    friend: ["一緒にいて楽な、長く続きやすい友達です。", "話が合いやすく、お互いを応援し合える関係です。", "ちょうどよい距離感が大切な関係。会う頻度より、会ったときの時間を大切に。", "自分にない視点をくれる友達。ちがいを面白がれると、心強い存在になります。"],
    family: ["言わなくても通じ合いやすい家族です。感謝は言葉にすると、さらに温かく。", "支え合える関係。それぞれの考えを尊重すると、家族の空気がやわらぎます。", "似ているところと、ちがうところがはっきりした関係。ひとりの時間も認め合って。", "考え方のちがいが出やすい関係。正しさより、相手の気持ちを聞くことを大切に。"],
    work: ["息の合ったチームになれる組み合わせ。大きな仕事も任せ合えます。", "役割を分けると力が出る組み合わせ。得意分野をはっきりさせましょう。", "進め方のちがいが出やすい組み合わせ。最初に目的と分担をすり合わせて。", "ちがう強みを持つふたり。意見がぶつかったら、どちらの案もよいところを拾って。"]
  };

  function clamp(n) { return Math.max(40, Math.min(98, Math.round(n))); }

  /**
   * @param a, b {year, month, day}
   * @param relation "love" | "marriage" | "friend" | "family" | "work"
   * @param today {year, month, day}
   * @param E { numerology, kyusei, shichu, horoscope, shukuyo, maya, jyotish, uchuban }
   */
  function build(a, b, relation, today, E) {
    var items = [];

    var n = E.numerology.calculateCompatibility(a, b, { targetYear: today.year });
    items.push({ key: "suhijutsu", method: "数秘術", score: clamp(n.scores.total), reason: "ライフパス" + n.person1.lifePath + "と" + n.person2.lifePath, link: "../suhijutsu/aisho/" });

    var k = E.kyusei.calculateKyuseiCompatibility(a, b);
    var hk = KY[k.category] || KY.hiwa, gk = KY[k.innerCategory] || KY.hiwa;
    items.push({ key: "kyusei", method: "九星気学", score: clamp(hk[0] * 0.65 + gk[0] * 0.35), reason: STAR[k.honmeiRelation.stars.a] + "と" + STAR[k.honmeiRelation.stars.b] + "：" + hk[1], link: "../kyusei/aisho/" });

    var s = E.shichu.calculateShichusuimeiCompatibility(a, b);
    var st = s.stem.kangou ? [94, "日干が干合（強く引き合う）"] : (SH_STEM[s.stem.relation] || SH_STEM.same);
    var br = SH_BRANCH[s.branch.relation] || SH_BRANCH.none;
    var dm1 = s.person1.dayMaster.name, dm2 = s.person2.dayMaster.name;
    items.push({ key: "shichusuimei", method: "四柱推命", score: clamp(st[0] + br[0]), reason: "日干 " + dm1 + "と" + dm2 + "：" + st[1] + (br[1] ? "。" + br[1] : ""), link: "../shichusuimei/aisho/" });

    var h = E.horoscope.calculateHoroscopeCompatibility(a, b);
    var sun = SIGN[h.sun] || SIGN.contrast, moon = SIGN[h.moon] || SIGN.contrast;
    var s1 = h.person1.planets[0].sign, s2 = h.person2.planets[0].sign;
    items.push({ key: "horoscope", method: "星座（ホロスコープ）", score: clamp(sun[0] * 0.7 + moon[0] * 0.3), reason: s1 + "と" + s2 + "：" + sun[1], link: "../horoscope/aisho/" });

    var u = E.shukuyo.calculateShukuyoCompatibility(a, b);
    items.push({ key: "shukuyo", method: "宿曜占星術", score: clamp(SHUKU[u.pair] || 70), reason: u.person1.honmei.name + "と" + u.person2.honmei.name + "：" + u.pair + "の関係", link: "../shukuyo/aisho/" });

    var m = E.maya.calculateMayaCompatibility(a, b);
    var ms = m.links.length ? (m.links.indexOf("antipode") >= 0 && m.links.length === 1 ? 76 : 94) : 66 + 5 * m.shared.length;
    var mr = m.links.map(function (x) { return MAYA_LINK[x]; }).concat(m.shared.map(function (x) { return MAYA_SHARED[x]; })).filter(Boolean);
    items.push({ key: "maya", method: "マヤ暦", score: clamp(ms), reason: "KIN" + m.person1.kin + "とKIN" + m.person2.kin + (mr.length ? "：" + mr.join("・") : "：特別な組み合わせはなし（自由な関係）"), link: "../maya/aisho/" });

    var j = E.jyotish.calculateJyotishCompatibility(a, b);
    var jt = j.youAsGroom.items.reduce(function (t, x) { return t + x.score; }, 0);
    var jb = j.youAsBride.items.reduce(function (t, x) { return t + x.score; }, 0);
    var jbest = Math.max(jt, jb);
    items.push({ key: "jyotish", method: "インド占星術", score: clamp(45 + jbest / 36 * 50), reason: "アシュタクータ " + jbest + "点／36点", link: "../jyotish/aisho/" });

    var ua = E.uchuban.chart(a, E), ub2 = E.uchuban.chart(b, E), uc = E.uchuban.compat(ua, ub2);
    items.push({ key: "uchuban", method: "宇宙盤（算命学）", score: clamp(UB[uc.typeKey]), reason: uc.type.name + "（共通の世界 " + uc.shared.length + "つ）", link: "../uchuban/" });

    // 平均は 66〜84 あたりに集まるので、ちがいが見えるように 75 を中心に広げる（50〜98）
    var avg = items.reduce(function (t, x) { return t + x.score; }, 0) / items.length;
    var total = Math.max(50, Math.min(98, Math.round(75 + (avg - 75) * 1.8)));
    var bandIndex = 0;
    while (total < BANDS[bandIndex].min) bandIndex++;
    var rel = RELATIONS[relation] ? relation : "love";
    var sorted = items.slice().sort(function (x, y) { return y.score - x.score; });
    return {
      total: total,
      relation: rel,
      relationLabel: RELATIONS[rel].label,
      headline: BANDS[bandIndex].title + RELATIONS[rel].noun,
      tip: TIPS[rel][bandIndex],
      items: items,
      best: sorted[0],
      weakest: sorted[sorted.length - 1]
    };
  }

  return { build: build, RELATIONS: RELATIONS, BANDS: BANDS };
});
