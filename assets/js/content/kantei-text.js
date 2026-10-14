/*
 * 本格占い「総合鑑定書」の組み立て（計算結果 → 表示用データ。DOM操作なし）
 *
 *   - 数秘術・九星気学・星獣カルテの計算は、無料占いと同じエンジンを使う。
 *   - それ以外の占術（四柱推命・マヤ暦・宿曜・西洋占星術・インド占星術・紫微斗数・姓名判断・干支・吉方位）の章と
 *     「総合判断」は kantei-extra.js で組み立てて、ここで差し込む。姓名（sei・mei）と出生時刻は任意。
 *   - 文章は各占術の鑑定文（numerology-text / kyusei-text / seiju-data）を土台に、
 *     この鑑定書だけの「あなたの軸」（3占術の共通テーマ）と「これから3年の流れ」を加える。
 *   - AIや外部サービスは使わない。同じ入力からは、いつでも同じ鑑定書ができる。
 *
 * 「あなたの軸」の決め方（えみり独自）
 *   各占術の結果を6つの軸（開拓・調和・表現・構築・探究・変化）に対応させ、重みをつけて数える。
 *   重み：ライフパス3、本命星3、星獣の季節2、バースデー1、アティチュード1、月命星1、星獣の月のリズム1。
 *   同点のときは、ライフパス → 本命星 → 星獣の季節 の軸を優先する。
 *
 * 「〇〇さんとの相性」（相性の相手を1人設定したときだけ入る章）
 *   数秘術・九星気学・星獣カルテの相性（無料の相性占いと同じ計算・文章）を、テーマごとに並べ直してまとめる。
 *   最後に「別のお相手との相性鑑定」への案内（upsell）を付ける。
 *
 * 「これから3年の流れ」
 *   数秘術：その年のパーソナルイヤー。九星気学：その年の年盤で本命星が入る宮（同会）。
 *   九星気学の年は立春で切り替わるため、「その年の立春から翌年の立春の前まで」と明記する。
 */
(function (root, factory) {
  if (typeof module === "object" && module.exports) {
    module.exports = factory(
      require("../engines/numerology.js"), require("./numerology-text.js"),
      require("../engines/kyusei.js"), require("./kyusei-text.js"), require("./kyusei-data.js"),
      require("../engines/seiju.js"), require("./seiju-data.js"), require("./seiju-text.js"),
      require("../engines/daily.js"), require("./kantei-extra.js")
    );
  } else {
    root.KaruteContent = root.KaruteContent || {};
    root.KaruteContent.kantei = factory(
      root.KaruteEngines.numerology, root.KaruteContent.numerology,
      root.KaruteEngines.kyusei, root.KaruteContent.kyusei, root.KaruteContent.kyuseiData,
      root.KaruteEngines.seiju, root.KaruteContent.seijuData, root.KaruteContent.seiju,
      root.KaruteEngines.daily, root.KaruteContent.kanteiExtra
    );
  }
})(typeof self !== "undefined" ? self : this, function (numEngine, numText, kyEngine, kyText, kyData, sjEngine, sjData, sjText, daily, extra) {
  "use strict";

  var AXES = {
    kaitaku: { name: "開拓", catch: "自分の手で道を切り拓く人",
      text: "あなたの中心にあるのは、自分で決めて、自分から動き出す力です。誰かが用意した道をなぞるより、まだ形のないものに最初の一歩を刻むときに、いちばん生き生きとします。周りが迷っているときほど、あなたの決断が空気を変えるきっかけになります。",
      advice: "勢いで走り出したあとに、立ち止まって振り返る時間を意識してとること。動く力に「見直す力」が加わると、切り拓いた道が長く続く道になります。" },
    chowa: { name: "調和", catch: "人と人をつなぎ、場を整える人",
      text: "あなたの中心にあるのは、人の気持ちを感じ取り、関係を整える力です。自分が前に出るより、周りが安心して力を出せる場をつくることに喜びを感じやすいでしょう。あなたがいると、ばらばらだったものが自然とまとまっていきます。",
      advice: "人の気持ちを優先するあまり、自分の本音を後回しにしすぎないこと。「わたしはこうしたい」を一言添えるだけで、あなたの調和はもっと強くなります。" },
    hyogen: { name: "表現", catch: "言葉と明るさで、世界を広げる人",
      text: "あなたの中心にあるのは、感じたことを外へ伝え、人の心を動かす力です。会話や発信、ちょっとした遊び心が、あなたのまわりに人とチャンスを集めます。あなたが楽しんでいる姿そのものが、周りへの贈り物になります。",
      advice: "広げることが得意なぶん、ひとつのことを深める時間も大切に。伝えたいことの芯がはっきりすると、あなたの言葉はもっと遠くまで届きます。" },
    kochiku: { name: "構築", catch: "こつこつ積み上げ、形にする人",
      text: "あなたの中心にあるのは、目の前のことを着実に積み重ね、確かな形にしていく力です。派手さより信頼を大切にし、時間をかけるほど価値が増していくタイプです。あなたが築いたものは、周りの人の土台にもなっていきます。",
      advice: "慎重さが強く出すぎると、新しい流れに乗り遅れることも。ときどき小さな実験として、いつもと違うやり方を試してみましょう。" },
    tankyu: { name: "探究", catch: "深く見つめ、本質を見極める人",
      text: "あなたの中心にあるのは、物事の奥にある理由や本質を見極める力です。表面的な答えでは満足せず、自分が納得できるまで考え抜くことで、人とは違う深い洞察にたどり着きます。静かな時間の中で、あなたの力は育っていきます。",
      advice: "考えを内側にしまい込みすぎず、まとまる前でも誰かに話してみること。あなたの洞察は、人と分かち合ったときに大きな価値になります。" },
    henka: { name: "変化", catch: "新しい風を呼びこみ、流れを変える人",
      text: "あなたの中心にあるのは、変化を恐れず、新しいものを取り入れていく力です。同じ場所にとどまるより、移り変わる流れの中でこそ才能が目を覚まします。あなたが持ち込む新しい視点が、停滞していた場所に風を通します。",
      advice: "変化を求めるあまり、育ちかけたものを手放しすぎないこと。続けることと変えることを意識して選ぶと、あなたの自由さが実りにつながります。" }
  };
  var AXIS_ORDER = ["kaitaku", "chowa", "hyogen", "kochiku", "tankyu", "henka"];

  var NUM_AXIS = { 1: "kaitaku", 2: "chowa", 3: "hyogen", 4: "kochiku", 5: "henka", 6: "chowa", 7: "tankyu", 8: "kochiku", 9: "chowa" };
  var STAR_AXIS = { 1: "tankyu", 2: "kochiku", 3: "kaitaku", 4: "chowa", 5: "kaitaku", 6: "kochiku", 7: "hyogen", 8: "henka", 9: "hyogen" };
  var SEASON_AXIS = { spring: "kaitaku", summer: "hyogen", autumn: "kochiku", winter: "tankyu" };
  var MOON_AXIS = { waxing: "henka", full: "chowa", waning: "tankyu" };

  // 年盤で本命星が入る宮の、1年のテーマ（伝統的な象意をもとにした、えみりの読み）
  var YEAR_PALACE = {
    son: { name: "巽宮", theme: "整う・信用", text: "これまでの努力が信用となって返ってくる年。人とのご縁や約束ごとがまとまりやすく、仕事や結婚など大切な話を進めるのにも向いています。" },
    ken: { name: "乾宮", theme: "充実・活躍", text: "やる気と行動力が満ち、責任のある役割を任されやすい年。目上の人の引き立ても受けやすく、力を出しきることで大きく前進します。" },
    shin: { name: "震宮", theme: "始動・発展", text: "新しいことが動き出す年。準備してきたことを外に出すのに向いています。勢いがあるぶん、言葉の強さには少しだけ気をつけて。" },
    da: { name: "兌宮", theme: "喜び・実り", text: "実りを受け取り、楽しみやご縁に恵まれやすい年。人との交流や食事の席が運を運びます。気がゆるんでの使いすぎには注意を。" },
    ri: { name: "離宮", theme: "注目・ひらめき", text: "あなたの良さが人の目にとまり、ひらめきが冴える年。一方で、合わなくなったものとの別れも起こりやすく、選び直しの年でもあります。" },
    kon: { name: "坤宮", theme: "準備・地固め", text: "地道な努力が次の飛躍の土台になる年。派手さはなくても、学びや人の支えに力を注ぐほど、あとで大きく実ります。" },
    gon: { name: "艮宮", theme: "変化・転換", text: "流れが切り替わりやすい年。仕事や住まいなどで転機が訪れることも。無理に元へ戻すより、これからに合う形へ整え直す好機です。" },
    kan: { name: "坎宮", theme: "充電・内省", text: "エネルギーを内側にためる、冬のような年。大きく広げるより、休む・学ぶ・見つめ直すことで、次の9年の力を蓄えます。" },
    center: { name: "中宮", theme: "転機・見直し", text: "盤の中心に入り、周りの影響を受けやすい年。大きな決断は慎重に進め、自分の足元や生き方を見直すことで、次の流れに乗りやすくなります。" }
  };

  // 九星の伝統的な色（開運のヒント）
  var STAR_LUCKY = {
    1: { colors: ["白", "黒", "水色"] }, 2: { colors: ["黄", "茶", "黒"] }, 3: { colors: ["青", "緑"] },
    4: { colors: ["緑", "青"] }, 5: { colors: ["黄", "茶"] }, 6: { colors: ["白", "金"] },
    7: { colors: ["白", "金", "赤"] }, 8: { colors: ["白", "黄"] }, 9: { colors: ["紫", "赤"] }
  };

  function pad2(n) { return (n < 10 ? "0" : "") + n; }
  function para(text) { return { type: "p", text: text }; }
  function heading(text) { return { type: "h3", text: text }; }
  function list(items) { return { type: "ul", items: items }; }
  function facts(rows) { return { type: "facts", rows: rows }; }

  function requireInput(p) {
    var y = Number(p.year), m = Number(p.month), d = Number(p.day);
    if (!Number.isInteger(y) || !Number.isInteger(m) || !Number.isInteger(d)) throw new Error("生年月日が正しくありません");
    var sei = String(p.sei || "").trim(), mei = String(p.mei || "").trim();
    return { year: y, month: m, day: d, time: p.time || null, name: String(p.name || "").trim() || mei, sei: sei, mei: mei };
  }

  /*
   * 相性の章
   *   me / partner：requireInput 済みの入力。whoMe / whoPartner：呼び名（「あなた」「〇〇さん」）
   */
  function buildAishoChapter(me, partner, whoPartner, today) {
    var bA = { year: me.year, month: me.month, day: me.day }, bB = { year: partner.year, month: partner.month, day: partner.day };
    var nc = numText.buildCompatibility(numEngine.calculateCompatibility(bA, bB, { targetYear: today.year }));
    var kc = kyText.buildKyuseiCompatibilityView(kyEngine.calculateKyuseiCompatibility(
      me.time ? { year: me.year, month: me.month, day: me.day, time: me.time } : bA,
      partner.time ? { year: partner.year, month: partner.month, day: partner.day, time: partner.time } : bB));
    var sc = sjText.buildSeijuCompatibilityView(sjEngine.calculateSeijuCompatibility(bA, bB));
    var nd = {};
    nc.details.forEach(function (d) { nd[d.title.replace(/（.*）$/, "")] = d; });
    var kd = {};
    kc.details.forEach(function (d) { kd[d.title] = d; });
    var sd = {};
    (sc.details || []).forEach(function (d) { sd[d.title] = d; });
    var pName = whoPartner;
    var pb = partner.year + "年" + partner.month + "月" + partner.day + "日" + (partner.time ? " " + partner.time : "");
    var pKy = kc.partner, pSj = sc.partner;
    var text = function (d) { return d ? (d.text || (d.list ? d.list.join("　") : "")) : null; };
    var blocks = [
      para("ここからは、" + pName + "との相性を、数秘術・九星気学・星獣カルテの3つの占術から読み解きます。点数や良し悪しで決めつけるのではなく、ふたりの関係をより心地よくするためのヒントとしてお読みください。"),
      facts([
        [pName + "の生年月日", pb],
        ["数秘術", "ライフパス " + nc.partner.numbers[0].number + "（" + nc.partner.numbers[0].label + "）"],
        ["九星気学", "本命星 " + pKy.honmei.name + "／月命星 " + pKy.getsumei.name],
        ["星獣カルテ", pSj.beast.name + "（" + pSj.beast.season.name + " × " + pSj.beast.moon.name + "）"]
      ]),
      heading("ふたりの全体像"),
      para("数秘術：" + nc.total.headline + nc.total.message),
      para("九星気学：本命星どうしは「" + kc.total.label + "」。" + kc.total.lead + (kc.total.inner ? kc.total.inner.text : "")),
      para("星獣カルテ：「" + sc.total.label + "」。" + sc.total.lead),
      heading("惹かれ合う理由"),
      para(text(nd["惹かれ合う理由"])),
      sd["惹かれ合うポイント"] ? para(text(sd["惹かれ合うポイント"])) : null,
      heading("恋愛の相性"),
      para(text(nd["恋愛の相性"])),
      heading("価値観と会話"),
      para(text(nd["価値観・会話"])),
      kd["価値観"] ? para(text(kd["価値観"])) : null,
      kd["コミュニケーション"] ? para(text(kd["コミュニケーション"])) : null,
      heading("暮らしと結婚"),
      para(text(nd["結婚・暮らしの相性"])),
      kd["生活ペース"] ? para(text(kd["生活ペース"])) : null,
      para(text(nd["お金・生活感覚"])),
      heading("あなたから見た" + pName + "、" + pName + "から見たあなた"),
      para(text(nd["あなたから見たお相手"])),
      para(text(nd["お相手から見たあなた"])),
      heading("すれ違いやすいポイントと仲直り"),
      para(text(nd["すれ違いやすいポイント"])),
      para(text(nd["仲直りの方法"])),
      heading("親密さと距離感"),
      para(nc.intimacy.text),
      facts(kc.intimacy.slice(0, 3).map(function (x) { return [x.title, x.text]; })),
      heading("ふたりのタイミング"),
      para(text(nd["今年のふたり"])),
      para(text(nd["関係が動きやすい月"])),
      heading("長続きのコツ"),
      list((nd["長続きするためのコツ"] && nd["長続きするためのコツ"].list) || []),
      kd["関係を育てるコツ"] ? para(text(kd["関係を育てるコツ"])) : null
    ].filter(function (b) { return b && (b.type !== "p" || b.text); });
    return { id: "aisho", title: pName + "との相性", blocks: blocks };
  }

  /**
   * @param {{name?:string, year:number, month:number, day:number, time?:string}} person
   * @param {{year:number, month:number, day:number}} today 作成日（日本時間）
   * @param {{name?:string, year:number, month:number, day:number, time?:string}} [partner] 相性を見るお相手（1人・任意）
   */
  function buildKantei(person, today, partner) {
    var p = requireInput(person);
    var q = partner ? requireInput(partner) : null;
    var birth = { year: p.year, month: p.month, day: p.day };
    var num = numEngine.calculateNumerology(birth, { targetYear: today.year });
    var nv = numText.buildPersonal(num);
    var ky = kyEngine.calculateKyusei(p.time ? { year: p.year, month: p.month, day: p.day, time: p.time } : birth);
    var kv = kyText.buildKyuseiView(ky);
    var sj = sjEngine.calculateSeiju(birth);
    var beast = sjData.getBeast(sj.beast);
    var sv = sjText.buildSeijuView(sj);
    var season = sjData.SEASONS[sj.season], moon = sjData.MOONS[sj.moonPhase];
    var H = kyText.STAR_TEXT[ky.honmei], G = kyText.STAR_TEXT[ky.getsumei];
    var honmei = kyData.STARS[ky.honmei], getsumei = kyData.STARS[ky.getsumei];
    var lpData = numText.LIFE_PATH[num.lifePath];
    var who = p.name ? p.name + "さん" : "あなた";

    // ---- あなたの軸 ----
    var votes = [
      { axis: NUM_AXIS[num.core.lifePath], w: 3, label: "数秘術のライフパス" + num.lifePath },
      { axis: STAR_AXIS[ky.honmei], w: 3, label: "九星気学の本命星「" + honmei.name + "」" },
      { axis: SEASON_AXIS[sj.season], w: 2, label: "星獣カルテの「" + season.name + "」" },
      { axis: NUM_AXIS[num.core.birthday], w: 1, label: "バースデー" + num.birthday },
      { axis: NUM_AXIS[num.core.attitude], w: 1, label: "アティチュード" + num.attitude },
      { axis: STAR_AXIS[ky.getsumei], w: 1, label: "月命星「" + getsumei.name + "」" },
      { axis: MOON_AXIS[sj.moonPhase], w: 1, label: "「" + moon.name + "」のリズム" }
    ];
    var X = extra.build(p, q, today, {
      who: who, honmei: honmei.name, getsumei: getsumei.name, honmeiNumber: ky.honmei, getsumeiNumber: ky.getsumei,
      honmeiElement: honmei.element, lifePath: num.lifePath, kigakuYear: kyEngine.calculateKyusei({ year: today.year, month: today.month, day: today.day }).kigakuYear
    });
    X.axisVotes.forEach(function (v) { if (v.axis) votes.push(v); });
    var score = {};
    AXIS_ORDER.forEach(function (a) { score[a] = 0; });
    votes.forEach(function (v) { score[v.axis] += v.w; });
    var priority = [votes[0].axis, votes[1].axis, votes[2].axis];
    var ranked = AXIS_ORDER.slice().sort(function (a, b) {
      if (score[b] !== score[a]) return score[b] - score[a];
      var pa = priority.indexOf(a), pb = priority.indexOf(b);
      return (pa === -1 ? 9 : pa) - (pb === -1 ? 9 : pb);
    });
    var mainAxis = ranked[0], subAxis = ranked[1];
    var mainFrom = votes.filter(function (v) { return v.axis === mainAxis; }).map(function (v) { return v.label; });
    var subFrom = votes.filter(function (v) { return v.axis === subAxis; }).map(function (v) { return v.label; });
    var A = AXES[mainAxis], S = AXES[subAxis];

    // ---- これから3年 ----
    var years = [0, 1, 2].map(function (k) {
      var y = today.year + k;
      var py = numEngine.personalYear(p.month, p.day, y);
      var ys = kyEngine.yearStar(y);
      var palace = daily.palaceOf(ky.honmei, ys);
      var yp = YEAR_PALACE[palace];
      var pyText = numText.PERSONAL_YEAR[py];
      return {
        year: y, personalYear: py, pyTheme: pyText.theme, pyText: pyText.text,
        yearStar: kyData.STARS[ys].name, palace: yp.name, palaceTheme: yp.theme, palaceText: yp.text
      };
    });

    // ---- 開運のヒント ----
    var supporters = kyData.STARS.filter(function (s) { return s && kyData.GENERATES[s.element] === honmei.element; }).map(function (s) { return s.name; });
    var sameElem = kyData.STARS.filter(function (s) { return s && s.element === honmei.element && s.number !== ky.honmei; }).map(function (s) { return s.name; });

    var birthLabel = p.year + "年" + p.month + "月" + p.day + "日" + (p.time ? " " + p.time : "");
    var made = today.year + "年" + today.month + "月" + today.day + "日";

    var chapters = [
      { id: "intro", title: "はじめに", blocks: [
        para(who + "の生年月日" + (p.time ? "と出生時刻" : "") + (X.nameResult ? "、そしてお名前" : "") + "から、" + (X.keywords.length + 3) + "の占術で読み解いた、" + who + "だけの総合鑑定書です。"),
        para("土台にするのは、数秘術（生年月日の「数字」）、九星気学（生まれた年と月の「星」）、星獣カルテ（生まれた日の「季節と月のリズム」）の3つ。そこに、" + X.keywords.map(function (k) { return k[0]; }).join("・") + "を重ねて、" + who + "を多くの角度から見ていきます。違う角度から見て同じことが表れている部分は、あなたの中でとくに強い性質です。"),
        para("占いは未来を決めるものではなく、自分を知り、選ぶためのヒントです。心に響いたところから、気軽に読んでみてください。")
      ] },
      { id: "karute", title: "あなたのカルテ", blocks: [
        facts([
          ["生年月日", birthLabel],
          ["数秘術", "ライフパス " + num.lifePath + "（" + numText.label(num.lifePath) + "）／バースデー " + num.birthday + "（" + numText.label(num.birthday) + "）／アティチュード " + num.attitude + "（" + numText.label(num.attitude) + "）"],
          ["九星気学", "本命星 " + honmei.name + "（" + honmei.element + "）／月命星 " + getsumei.name + "（" + getsumei.element + "）"],
          ["星獣カルテ", beast.name + "（" + season.name + " × " + moon.name + "）"],
          ["あなたの軸", A.name + "（" + A.catch + "）"]
        ].concat(X.karuteFacts)),
        kv.term && kv.term.boundary ? para("九星気学の補足：生まれた日が節入りの日にあたるため、生まれた時刻によって星が変わる可能性があります。" + (p.time ? "入力された出生時刻で判定しています。" : "出生時刻がわかる場合は、時刻を入れると確実に判定できます。")) : null
      ].filter(Boolean) },
      { id: "axis", title: "あなたの軸：" + A.name, blocks: [
        para("3つの占術を重ね合わせると、" + who + "の中心には「" + A.name + "」の力が見えてきます。" + mainFrom.join("、") + "が、そろってこの方向を指しています。"),
        heading(A.catch),
        para(A.text),
        heading("もうひとつの柱：" + S.name),
        para("次に強く表れているのは「" + S.name + "」の力です（" + subFrom.join("、") + "）。" + S.text),
        heading("軸を生かすために"),
        para(A.advice)
      ] },
      { id: "synthesis", title: "総合判断：すべての占術が語るあなた", blocks: X.synthesisBlocks(mainAxis, subAxis, A.name, S.name) },
      { id: "personality", title: "基本の性格", blocks: [
        heading("数秘術：ライフパス" + num.lifePath + "「" + lpData.tag + "」"),
        para(lpData.summary + lpData.personality),
        para(nv.deep[0].lead + nv.deep[0].text),
        heading("考え方と判断のくせ"),
        para(nv.deep[1].text),
        heading("九星気学：本命星「" + honmei.name + "」"),
        para(H.basic),
        heading("内側の顔：月命星「" + getsumei.name + "」"),
        para(G.inner),
        para("ふたつの星の関係は「" + kv.combination.label + "」。" + kv.combination.text),
        heading("星獣カルテ：「" + beast.name + "」"),
        para("「" + beast.catch + "」。" + beast.personality),
        para(sv.reason.join("")),
        facts(sv.season.traits)
      ] },
      X.systemChapters,
      X.nameChapter || null,
      { id: "strength", title: "強みと、つまずきやすいところ", blocks: [
        heading("あなたの強み"),
        list([numText.TRAITS[num.core.lifePath].gift + "（数秘術）"].concat(kv.strengths.map(function (s) { return s + "（九星気学）"; })).concat([beast.strength.split("。")[0] + "（星獣カルテ）"])),
        heading("隠れた一面"),
        para(beast.hidden),
        heading("つまずきやすいところ"),
        list(kv.weaknesses.concat([beast.weakness.split("。")[0], numText.TRAITS[num.core.lifePath].risk + "こと"])),
        para(kv.weaknessNote),
        para(nv.deep[6].text),
        heading("ふたつの星が教えてくれること"),
        para(kv.combination.tradition + "強み：" + kv.combination.strength + "気をつけたいこと：" + kv.combination.caution)
      ] },
      { id: "work", title: "仕事・才能", blocks: [
        para(lpData.work),
        para(H.work),
        para(beast.work),
        heading("生まれ持った才能：バースデー" + num.birthday),
        para(nv.birthday.text),
        nv.deep[2] ? para(nv.deep[2].text) : null
      ].concat(X.add.work).filter(Boolean) },
      { id: "love", title: "恋愛・パートナーシップ", blocks: [
        para(lpData.love),
        para(kv.love),
        para(beast.love),
        nv.deep[4] ? heading("恋愛で本当に求めるもの") : null,
        nv.deep[4] ? para(nv.deep[4].text) : null,
        heading("潜在的に求める相手像"),
        para(nv.deep[5].text),
        heading("安心できる関係のために"),
        para("あなたの星獣が求めるのは「" + beast.seeks + "」。そしてあなたが相手に贈れるのは「" + beast.offers + "」です。内面（月命星の" + getsumei.name + "）には「" + G.closeness + "」という一面もあります。")
      ].concat(X.add.love).filter(Boolean) },
      { id: "relations", title: "人間関係", blocks: [
        para(H.relations),
        para(beast.relationships),
        heading("第一印象：アティチュード" + num.attitude),
        para(nv.attitude.text + nv.attitude.gap)
      ] },
      { id: "money", title: "お金との付き合い方", blocks: [
        para(lpData.money),
        nv.deep[3] ? para(nv.deep[3].text) : null
      ].filter(Boolean) },
      { id: "years", title: "これから3年の流れ", blocks: [
        para("数秘術のパーソナルイヤー（1月1日で切り替わり）と、九星気学の年の星（その年の立春から翌年の立春の前まで）を軸に、四柱推命の年の干支、マヤ暦の誕生日のKIN、西洋占星術・インド占星術のいまの流れを重ねて、これから3年を読みます。"),
        { type: "years", items: years.map(function (y) {
          return { year: y.year, rows: [
            ["数秘術", "パーソナルイヤー " + y.personalYear + "「" + y.pyTheme + "」：" + y.pyText],
            ["九星気学", "年の星 " + y.yearStar + "、本命星は" + y.palace + "（" + y.palaceTheme + "）：" + y.palaceText]
          ].concat(X.add.years[y.year] || []) };
        }) },
        heading(today.year + "年の12か月"),
        { type: "months", items: nv.months.map(function (m) { return { month: m.month, number: m.number, theme: m.theme, text: m.text }; }) }
      ] },
      X.houiChapter,
      X.etoChapter,
      { id: "luck", title: "開運と成長のヒント", blocks: [
        facts([
          ["ラッキーカラー", STAR_LUCKY[ky.honmei].colors.join("・") + "（本命星「" + honmei.name + "」の色）"],
          ["ラッキーナンバー", String(num.lifePath) + "（ライフパス）"],
          ["支えてくれる星", supporters.join("・") + "（あなたの「" + honmei.element + "」を生む五行の星）"],
          ["感覚の近い星", sameElem.length ? sameElem.join("・") + "（同じ「" + honmei.element + "」の五行）" : "同じ五行の星はほかにありません"],
          ["星獣が求めるもの", beast.seeks]
        ]),
        heading("今年を生かすヒント"),
        para(nv.deep[7].text),
        heading("成長のヒント"),
        para(H.growth),
        para(beast.growth),
        para(kv.growthExtra)
      ] },
      q ? (function () { var c = buildAishoChapter(p, q, q.name ? q.name + "さん" : "お相手", today); c.blocks = c.blocks.concat(X.add.aisho); return c; })() : null,
      { id: "closing", title: "おわりに", blocks: [
        para(who + "の中心にある「" + A.name + "」の力は、どの占術から見ても、あなたらしさの源です。うまくいかない時期も、その力を使う場所や方法を少し変えるだけで、流れは変わっていきます。"),
        para("この鑑定書は、いつでも読み返せるように保存しておいてください。年が変わったときや迷ったとき、もう一度ページを開くと、そのときのあなたに必要な言葉が見つかるかもしれません。"),
        para("※ 占いの結果は、自己理解やエンターテインメントとしてお楽しみください。医療・法律・お金などの大切な判断を占いだけで決めないでください。")
      ] }
    ];
    chapters = [].concat.apply([], chapters).filter(Boolean);

    return {
      title: "総合鑑定書",
      partnerName: q ? (q.name ? q.name + "さん" : "お相手") : null,
      upsell: {
        title: "ほかの人との相性も、見てみませんか？",
        text: "この鑑定書と同じ占術で、別のお相手との相性を読み解く「追加の相性鑑定」をご用意します。家族、友人、職場の人、気になるあの人――大切な人との関係を、もう一歩深く知ることができます。",
        price: "お相手1人につき 980円（税込）",
        note: "お相手の生年月日を入力するだけで、相性の章をお届けします（準備中）。"
      },
      who: who,
      name: p.name,
      birthLabel: birthLabel,
      madeLabel: made,
      axis: { main: mainAxis, sub: subAxis, mainName: A.name, subName: S.name, score: score },
      chapters: chapters,
      method: [
        "数秘術・九星気学・星獣カルテの計算は、えみりの無料占いと同じ方法で行っています（九星気学は立春・節入りの時刻で判定）。",
        "「あなたの軸」と「これから3年の流れ」は、3つの占術の結果をもとに、えみりが用意した読み方で組み立てています。",
        "鑑定文は、あらかじめ用意した文章を計算結果に合わせて組み合わせています（作成時にAIが文章をその場で生成することはありません）。"
      ].concat(X.method).concat(q ? ["相性の章は、えみりの無料の相性占い（数秘術・九星気学・星獣カルテ）と同じ計算と文章をもとに、テーマごとにまとめ直したものです。"] : [])
    };
  }

  return {
    AXES: AXES,
    YEAR_PALACE: YEAR_PALACE,
    NUM_AXIS: NUM_AXIS,
    STAR_AXIS: STAR_AXIS,
    buildKantei: buildKantei
  };
});
