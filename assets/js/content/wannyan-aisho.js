/*
 * 星のわんにゃん占い：相性の読み解き（えみりのオリジナル）
 *   1. わんこ・にゃんこの組み合わせ（3通り）
 *   2. 月の形の関係（12の月の距離）
 *   3. 生まれた時期の関係（8つの時期）
 *   4. 元素の関係（五行の相生・相剋）
 *   ＋ 星獣カルテの相性（季節・月のリズム・星獣）を「チームどうしの相性」として使う
 */
(function (root, factory) {
  var api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  root.KaruteContent = root.KaruteContent || {};
  root.KaruteContent.wannyanAisho = api;
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";

  var KIND = {
    "dog-dog": { label: "わんこ × わんこ", title: "いつでも一緒の、なかよしコンビ",
      text: "ふたりとも人なつっこく、気持ちを素直に表に出すわんこタイプ。一緒にいる時間そのものを楽しめる、にぎやかで明るい関係です。お互いに「かまってほしい」気持ちが強いので、どちらかが寂しさをためこまないよう、こまめに声をかけ合うのがコツ。",
      tip: "予定を一緒に立てて、同じことを楽しむ時間を増やすと、絆がどんどん深まります。" },
    "cat-cat": { label: "にゃんこ × にゃんこ", title: "ほどよい距離が心地いい、大人のコンビ",
      text: "ふたりとも自分のペースを大切にするにゃんこタイプ。べったりしすぎない、ほどよい距離感が心地よい関係です。同じ部屋でそれぞれ好きなことをしていても、なぜか安心できる。そんな空気をつくれるふたりです。",
      tip: "言葉にしなくても分かり合えるぶん、大事なことほど言葉で確かめ合うと、すれ違いを防げます。" },
    "dog-cat": { label: "わんこ × にゃんこ", title: "違うからこそおもしろい、凸凹コンビ",
      text: "人なつっこいわんこタイプと、マイペースなにゃんこタイプの組み合わせ。最初は「なんでそうなるの？」と驚くことも多いですが、自分にないものを持つ相手から学べる、刺激のある関係です。わんこが場を明るくし、にゃんこが落ち着きを与える、いいバランスが生まれます。",
      tip: "わんこ側は相手のひとりの時間を尊重し、にゃんこ側はときどき素直に甘えてみる。それだけで、ぐっと仲が深まります。" }
  };

  var MOON = [
    { max: 0, label: "同じ月", title: "同じ月の下に生まれた、鏡のようなふたり", text: "ふたりは同じ月の形の生まれ。物事の始め方や気持ちの波が似ていて、説明しなくても分かり合えます。似ているぶん、同じところでつまずくことも。ひとりが落ち込んだときは、もうひとりが意識して明るさを担当しましょう。" },
    { max: 1, label: "となりの月", title: "となり合う月の、息の合うふたり", text: "ふたりの月の形はとなり同士。ペースが近く、一緒に何かを進めると自然に息が合います。少しだけずれたリズムが、お互いの足りないところを補ってくれます。" },
    { max: 2, label: "近い月", title: "近い月の、歩幅のそろうふたり", text: "ふたりの月の形は近く、物事に向かう歩幅がそろいやすい組み合わせ。気持ちの温度も近いので、一緒にいて疲れにくい関係です。" },
    { max: 3, label: "支え合う月", title: "満ち欠けの四分の一ずれた、支え合うふたり", text: "ふたりの月の形は、ちょうど四分の一ずれた関係。片方が動き出すとき、もう片方は整える時期にいることが多く、交互に支え合える組み合わせです。" },
    { max: 5, label: "離れた月", title: "離れた月の、新鮮なふたり", text: "ふたりの月の形は離れていて、物事のとらえ方やタイミングがちがいます。だからこそ、一緒にいると新しい発見の多い、新鮮な関係です。相手のペースを尊重することが、仲良くいるいちばんのコツ。" },
    { max: 6, label: "向かい合う月", title: "空の向こう側どうし、引き合うふたり", text: "ふたりの月の形は、新月と満月のように空の向かい側。正反対の性質を持つからこそ、強く引き合う組み合わせです。ぶつかることもありますが、お互いを認め合えたとき、どんなコンビにもない強さを発揮します。" }
  ];

  var GEN = { "木": "火", "火": "土", "土": "金", "金": "水", "水": "木" };   // 相生（生む）
  var KOKU = { "木": "土", "土": "水", "水": "火", "火": "金", "金": "木" };  // 相剋（抑える）

  function moonRelation(a, b) {
    var d = Math.abs(a.n - b.n); d = Math.min(d, 12 - d);
    for (var i = 0; i < MOON.length; i++) if (d <= MOON[i].max) return { step: d, label: MOON[i].label, title: MOON[i].title, text: MOON[i].text };
    return null;
  }

  function periodRelation(a, b) {
    var ia = a.order, ib = b.order;
    var d = Math.abs(ia - ib); d = Math.min(d, 8 - d);
    if (d === 0) return { label: "同じ時期", text: "ふたりとも" + a.name + "生まれ。季節の中で同じ時期に生まれたふたりは、大切にしたいものや力を出しやすい場面がよく似ています。" };
    if (a.season === b.season) return { label: "同じ季節の前と後", text: a.name + "と" + b.name + "は、同じ季節の前半と後半。季節が育っていく流れの中で、" + (a.half < b.half ? "あなたが始めたことをお相手が仕上げる" : "お相手が始めたことをあなたが仕上げる") + "ような、バトンをつなぐ関係です。" };
    if (d === 4) return { label: "向かい合う季節", text: a.name + "と" + b.name + "は、一年の中で向かい合う時期。感じ方も好みも正反対になりやすいぶん、ひとりでは見えない景色を見せ合える、学びの多い関係です。" };
    if (d <= 2) return { label: "となりの季節", text: a.name + "と" + b.name + "は、季節の移り変わりの中で近い時期。ペースのちがいが小さく、自然に歩み寄れる関係です。" };
    return { label: "離れた季節", text: a.name + "と" + b.name + "は、季節の中で少し離れた時期。ちがいを楽しめると、お互いの世界がぐっと広がります。" };
  }

  function elementRelation(a, b) {
    if (a === b) return { label: "同じ元素", text: "ふたりとも「" + a + "」の元素。根っこの性質が似ていて、安心感のある関係です。似たもの同士で意地を張り合わないように、ゆずり合いを意識しましょう。" };
    if (GEN[a] === b) return { label: "あなたが育てる", text: "あなたの「" + a + "」が、お相手の「" + b + "」を育てる関係（相生）。あなたが自然とお相手を支え、力を引き出してあげられます。" };
    if (GEN[b] === a) return { label: "お相手が育てる", text: "お相手の「" + b + "」が、あなたの「" + a + "」を育てる関係（相生）。お相手のそばにいると、あなたは自然に力を出しやすくなります。" };
    if (KOKU[a] === b) return { label: "あなたが引き締める", text: "あなたの「" + a + "」が、お相手の「" + b + "」を引き締める関係（相剋）。あなたの言葉はお相手にとって大事な指針になりますが、強く言いすぎないのがコツです。" };
    return { label: "お相手が引き締める", text: "お相手の「" + b + "」が、あなたの「" + a + "」を引き締める関係（相剋）。お相手の一言が、あなたを良い方向へ導いてくれます。耳の痛い言葉ほど、受け止めてみて。" };
  }

  // r1, r2：engines/wannyan.js の calculateWannyan の結果、periods：seiju-types.js の PERIODS
  function build(r1, r2, periods) {
    var a = r1.type, b = r2.type;
    var key = a.kind === b.kind ? a.kind + "-" + b.kind : "dog-cat";
    var order = function (p) { return periods.indexOf(p); };
    var pa = { name: a.period.name, season: a.period.season, half: a.period.half, order: order(a.period) };
    var pb = { name: b.period.name, season: b.period.season, half: b.period.half, order: order(b.period) };
    var notes = [];
    if (a === b) notes.push("ふたりは同じ「" + a.name + "」タイプ。考え方も好みもそっくりな、双子のようなふたりです。");
    else if (a.beastId === b.beastId) notes.push("ふたりは同じ「" + a.group.name + "」のなかま。根っこの価値観が近く、自然と分かり合える関係です。");
    return {
      kind: KIND[key],
      moon: moonRelation(a.moon, b.moon),
      period: periodRelation(pa, pb),
      element: elementRelation(r1.element.name, r2.element.name),
      notes: notes
    };
  }

  return { build: build, KIND: KIND, moonRelation: moonRelation, elementRelation: elementRelation };
});
