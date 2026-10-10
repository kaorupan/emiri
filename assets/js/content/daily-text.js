/*
 * 今日の運勢の文章（計算結果 → 表示用データ）
 *   - 宮・ハウスの意味づけは伝統的な象意をもとに、えみりが書いた文章。
 *   - ランキングの順位そのものは engines/daily.js が決める（ここでは順位を変えない）。
 *   - 断定や不安をあおる表現は使わない。占いは自己理解とエンターテインメントとして。
 */
(function (root, factory) {
  if (typeof module === "object" && module.exports) {
    module.exports = factory(require("./kyusei-data.js"), require("./numerology-text.js"), require("../engines/daily.js"));
  } else {
    root.KaruteContent = root.KaruteContent || {};
    root.KaruteContent.dailyText = factory(root.KaruteContent.kyuseiData, root.KaruteContent.numerology, root.KaruteEngines.daily);
  }
})(typeof self !== "undefined" ? self : this, function (kyuseiData, numerologyText, daily) {
  "use strict";

  // その日の中宮の星（日の九星）が表す一日の空気
  var DAY_STAR = {
    1: "水の星が中心に入る日。表に出るより、人の話に耳を傾けたり、ゆっくり考えを深めたりするのが合う、静かでしなやかな一日です。",
    2: "大地の星が中心に入る日。目立つことより、目の前の作業をこつこつ進めるのが合う、地に足のついた一日です。",
    3: "雷の星が中心に入る日。思い立ったことを始めたり、声に出して伝えたりするのに向いた、動きの出やすい一日です。",
    4: "風の星が中心に入る日。人とのやりとりや約束ごとがまとまりやすい、縁と信用を育てるのに向いた一日です。",
    5: "中央の土の星が中心に入る日。力の強い日なので、勢いで決めるより、いつも以上に丁寧に確かめながら進めると安心です。",
    6: "天の星が中心に入る日。目上の人とのやりとりや、責任のある仕事に向いた、きちんと物事を進めたい一日です。",
    7: "沢の星が中心に入る日。食事や会話、ちょっとした楽しみが気持ちをほどいてくれる、和やかな一日です。",
    8: "山の星が中心に入る日。ものごとの区切りや切り替えが起こりやすい一日。続けることと、変えることを見極めましょう。",
    9: "火の星が中心に入る日。ひらめきや美しいものに心が動きやすい、明るさと華やかさのある一日です。"
  };

  // 本命星が回座する宮の読み（日盤）
  var PALACE = {
    son: { name: "巽宮", direction: "南東", keyword: "整う・縁",
      text: "物事がととのいやすく、人とのやりとりがなめらかに進む日。約束や相談ごとがまとまりやすいでしょう。",
      advice: "連絡を後回しにせず、気になっていた人にひと言送ってみて。" },
    ken: { name: "乾宮", direction: "北西", keyword: "充実・活動",
      text: "やる気と行動力が満ちてくる日。仕事や責任のあることに取り組むと、手応えを感じやすいでしょう。",
      advice: "目上の人や頼れる人に、考えていることを伝えてみて。" },
    shin: { name: "震宮", direction: "東", keyword: "始まり・発展",
      text: "新しいことを動かし始めるのに向いた日。小さな一歩が、この先の流れをつくってくれそうです。",
      advice: "迷っていたことは、まず最初の5分だけ手をつけてみて。" },
    da: { name: "兌宮", direction: "西", keyword: "喜び・楽しみ",
      text: "楽しい会話やおいしい食事に恵まれやすい日。気持ちに余裕が生まれ、人との距離が縮まりそうです。",
      advice: "楽しさのあまりの使いすぎ・食べすぎには少しだけ気をつけて。" },
    ri: { name: "離宮", direction: "南", keyword: "注目・ひらめき",
      text: "直感がさえて、あなたの良さが人の目にとまりやすい日。見た目や言葉の印象も伝わりやすくなります。",
      advice: "思いついたアイデアはすぐメモを。言い方はいつもより柔らかめに。" },
    kon: { name: "坤宮", direction: "南西", keyword: "準備・地道",
      text: "派手さはなくても、土台を固める作業がはかどる日。人を支える役回りが、あとで実を結びます。",
      advice: "片づけや下調べなど、後回しにしていた準備を一つ進めてみて。" },
    gon: { name: "艮宮", direction: "北東", keyword: "変化・切り替え",
      text: "予定や気持ちが切り替わりやすい日。流れが変わったら、無理に元へ戻すより立ち止まって見直す好機です。",
      advice: "急な変更があっても慌てずに。続けるか変えるかを一度整理してみて。" },
    kan: { name: "坎宮", direction: "北", keyword: "休息・充電",
      text: "エネルギーを内側にためる日。無理に動くより、休んだり考えを深めたりすることで、次の力が育ちます。",
      advice: "早めに休む・ひとりの時間をとるなど、自分をいたわる予定を入れて。" },
    center: { name: "中宮", direction: "中央", keyword: "転機・見直し",
      text: "盤の中心に入り、周りの影響を受けやすい日。大きな決断は急がず、今あるものを丁寧に見直すのに向いています。",
      advice: "新しく広げるより、身の回りを整えることを優先してみて。" }
  };

  // 日の九星と本命星の五行の関係（ひと言）
  var FLOW = {
    same: "日の星と同じ五行。自分のペースを保ちやすい日です。",
    receive: "日の星があなたの五行を生む、追い風を受けやすい日です。",
    give: "あなたの五行が日の星を生む日。人に力を貸すと喜ばれそうです。",
    pressed: "日の星があなたの五行を抑える日。張り切りすぎず、余力を残して。",
    lead: "あなたの五行が日の星を抑える日。主導しやすい反面、言い方はやわらかく。"
  };

  // 月が通るハウス（その星座から数えて何番目）の読み
  var HOUSE = {
    1: { keyword: "自分らしさ", text: "月があなたの星座に入り、気持ちが前向きになりやすい日。自分のしたいことに素直になると、運が動きます。",
      advice: "身だしなみや髪型を少し変えると、気分も上がりそう。" },
    2: { keyword: "お金・五感", text: "お金や持ち物、心地よさに意識が向く日。自分にとって本当に価値のあるものを選ぶ目がさえます。",
      advice: "ほしい物は一晩おいてから決めると、満足度が高まります。" },
    3: { keyword: "会話・小さな移動", text: "人と話したり、近くへ出かけたりするのが楽しい日。ちょっとした情報が役に立ちそうです。",
      advice: "気になっていたお店や場所へ、寄り道してみて。" },
    4: { keyword: "家・くつろぎ", text: "家族や家のことに気持ちが向く日。外で頑張るより、身近な場所で心を整えると安定します。",
      advice: "部屋の一角を片づけたり、家でゆっくり過ごしたりする時間を。" },
    5: { keyword: "楽しみ・恋愛", text: "楽しいことや好きなことに恵まれやすい日。恋愛や趣味、自分を表現することに追い風が吹きます。",
      advice: "「好き」と感じたものに、少し時間を使ってみて。" },
    6: { keyword: "仕事・体調管理", text: "日々の仕事や生活リズムを整えるのに向いた日。細かなところまで気が回り、片づけがはかどります。",
      advice: "やることを書き出して、一つずつ終わらせていくと気分も軽く。" },
    7: { keyword: "対人・パートナー", text: "人との関わりが中心になる日。相手の考えを聞くことで、ひとりでは見えなかった道が見えてきます。",
      advice: "相手の話を最後まで聞いてから、自分の考えを伝えてみて。" },
    8: { keyword: "深い絆・受け取る", text: "人から受け取るものや、深いつながりに縁がある日。表面よりも本音のやりとりが大切になります。",
      advice: "頼られたら引き受けすぎず、自分も頼ることを忘れずに。" },
    9: { keyword: "学び・遠く", text: "知らないことを学んだり、遠くへ思いをはせたりするのに向いた日。視野が広がります。",
      advice: "読みたかった本や、行ってみたい場所を調べてみて。" },
    10: { keyword: "評価・成果", text: "あなたの頑張りが人の目にとまりやすい日。仕事や目標に向けて、一歩前に出るのに向いています。",
      advice: "やってきたことを、言葉にして伝えてみて。" },
    11: { keyword: "仲間・希望", text: "友人や仲間との時間が心をはずませる日。これからの希望や目標を語り合うと、運が広がります。",
      advice: "しばらく会っていない友人に、連絡してみて。" },
    12: { keyword: "休息・ひとり時間", text: "月があなたの星座の手前に入り、内側に気持ちが向く日。にぎやかさより、静かな時間で心を休めましょう。",
      advice: "予定を詰めこまず、早めに眠る日にしてみて。" }
  };

  // 月がある星座が表す一日の空気
  var MOON_MOOD = [
    "思い立ったら動きたくなる",
    "心地よさや味わいを大切にしたくなる",
    "会話や情報が行き交う",
    "身近な人や家が恋しくなる",
    "自分を表現したくなる",
    "細かなところまで整えたくなる",
    "人とのバランスを大切にしたくなる",
    "ひとつのことを深めたくなる",
    "遠くへ心が向かう",
    "目標へ着実に進みたくなる",
    "新しい考えに心ひらかれる",
    "やさしさや想像力が広がる"
  ];

  function pad2(n) { return (n < 10 ? "0" : "") + n; }
  function timeText(t) { return t.hour + ":" + pad2(t.minute); }
  function dateText(d) { return d.year + "年" + d.month + "月" + d.day + "日（" + daily.WEEKDAYS.charAt(d.weekday) + "）"; }
  function isoDate(d) { return d.year + "-" + pad2(d.month) + "-" + pad2(d.day); }

  function buildDaily(r) {
    var star = kyuseiData.STARS[r.dayStar.number];
    var signName = function (i) { return daily.SIGNS[i].name; };
    var moonSign = signName(r.moon.sign);

    var calendar = [
      { label: "日の干支", value: r.sexagenary.name },
      { label: "日の九星", value: star.name + "（" + (r.dayStar.dun === "yang" ? "陽遁" : "陰遁") + "）" },
      { label: "月齢", value: r.moon.ageText + "（" + r.moon.phase + "）" },
      { label: "月の位置", value: r.moon.ingress
        ? signName(r.moon.startSign) + " → " + timeText(r.moon.ingress.time) + "ごろから" + signName(r.moon.ingress.sign)
        : moonSign }
    ];
    var events = r.moon.events.map(function (e) {
      return (e.kind === "new" ? "新月" : "満月") + "：" + timeText(e.time) + "ごろ（" + moonSign + "）";
    });

    var kyusei = r.kyusei.map(function (k) {
      var p = PALACE[k.palace];
      var s = kyuseiData.STARS[k.star];
      return {
        rank: k.rank, id: "star-" + k.star, name: s.name, palace: p.name, keyword: p.keyword,
        text: p.text + FLOW[k.flow], advice: p.advice
      };
    });

    var zodiac = r.zodiac.map(function (z) {
      var h = HOUSE[z.house];
      return {
        rank: z.rank, id: daily.SIGNS[z.sign].id, name: signName(z.sign), house: z.house, keyword: h.keyword,
        text: h.text, advice: h.advice
      };
    });

    var b = r.birthday;
    var core = function (n) { return n === 11 ? 2 : n === 22 ? 4 : n === 33 ? 6 : n; };
    var bTrait = numerologyText.TRAITS[core(b.birthday)];
    var aTrait = numerologyText.TRAITS[core(b.attitude)];
    var signsText = b.signs.length === 1
      ? signName(b.signs[0].sign)
      : b.signs.map(function (s) { return signName(s.sign); }).join("または") + "（生まれた年によって変わります）";

    var top = kyusei[0], topSign = zodiac[0];
    return {
      iso: isoDate(r.date),
      dateText: dateText(r.date),
      title: dateText(r.date) + "の運勢",
      lead: star.name + "が中心に入り、月は" + moonSign + "。" + MOON_MOOD[r.moon.sign] + "空気の中、九星では" + top.name + "、12星座では" + topSign.name + "がいちばん追い風を受けやすい一日です。",
      dayStar: { name: star.name, text: DAY_STAR[r.dayStar.number] },
      moonMood: "月が" + moonSign + "にある日は、" + MOON_MOOD[r.moon.sign] + "雰囲気になりやすいと考えられています。",
      calendar: calendar,
      events: events,
      kyusei: kyusei,
      zodiac: zodiac,
      birthday: {
        title: r.date.month + "月" + r.date.day + "日生まれの人",
        sign: signsText,
        birthdayNumber: b.birthday, birthdayLabel: numerologyText.label(b.birthday),
        attitudeNumber: b.attitude, attitudeLabel: numerologyText.label(b.attitude),
        text: r.date.month + "月" + r.date.day + "日生まれの人は、数秘術のバースデーナンバーが" + b.birthday + "（" + numerologyText.label(b.birthday) + "）。" +
          "「" + bTrait.gift + "」を生まれ持ち、" + bTrait.need + "を大切にすることで持ち味が生きるタイプです。" +
          "第一印象を表すアティチュードナンバーは" + b.attitude + "（" + numerologyText.label(b.attitude) + "）で、周りからは「" + aTrait.gift + "」のある人として見られやすいでしょう。"
      },
      precision: r.precision
    };
  }

  return {
    DAY_STAR: DAY_STAR,
    PALACE: PALACE,
    FLOW: FLOW,
    HOUSE: HOUSE,
    MOON_MOOD: MOON_MOOD,
    buildDaily: buildDaily
  };
});
