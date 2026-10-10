/*
 * 紫微斗数の鑑定文の組み立て（DOM操作なし）
 *   - TRADITION：紫微斗数で一般的に説明される位置づけ
 *   - STAR ほか：えみり独自の読み解き文（14主星・宮の伝統的な意味をもとに、サイトが書いた文章）
 */
(function (root, factory) {
  if (typeof module === "object" && module.exports) {
    module.exports = factory();
  } else {
    root.KaruteContent = root.KaruteContent || {};
    root.KaruteContent.shibi = factory();
  }
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";

  var TRADITION = {
    chart: "紫微斗数は、中国で生まれ、北極星（紫微星）を中心とする星々を12の宮に配置して読む占術です。生年月日と生まれた時刻から「命盤」を作り、命宮・夫妻宮・財帛宮・官禄宮など12の宮に入った星から、性格や人生のさまざまな分野を読み解きます。",
    mei: "命宮は、その人の性格や生き方の土台を表す、命盤でもっとも大切な宮です。命宮に入る主星が、あなたの本質を教えてくれます。主星のない宮（空宮）は、向かい側の宮の星を借りて読みます。",
    shin: "身宮は、人生の後半に表れやすい性質や、自分で努力して身につけていく生き方を表すとされます。",
    kyoku: "五行局は、命宮の干支から決まる、その人の運の巡り方のリズムです。水二局・木三局・金四局・土五局・火六局の5つがあります。",
    sika: "四化は、生まれた年の干によって、4つの星が「化禄（恵み）」「化権（力）」「化科（名誉）」「化忌（こだわり・課題）」に変化するものです。どの宮に入るかで、人生のどの分野にそのエネルギーが表れるかを読みます。",
    compat: "紫微斗数の相性は、ふたりの命盤を重ねて読みます。命宮の星どうしの関係、自分の夫妻宮の星と相手の命宮の星の重なり、相手の生まれ年の四化（化禄・化忌）が自分の命盤のどの宮に入るか、五行局の関係などから、ふたりの縁の形を見ます。"
  };

  var STAR = {
    "紫微": { keyword: "帝王の星・品格・統率力", mei: "紫微星は星々の中心に立つ帝王の星。気品と存在感があり、自然と人の上に立つ人です。プライドが高く、自分の考えをしっかり持っていますが、面倒見がよく、頼られると力を発揮します。", love: "パートナーには品格と尊敬を求めます。相手を大切に守る、包容力のある愛し方です。", money: "大きなお金を動かす力があり、地位とともに財も育ちます。見栄の出費には注意。", work: "リーダーや管理職、組織の中心で力を発揮します。" },
    "天機": { keyword: "知恵の星・企画力・変化", mei: "天機星は頭の回転が速い知恵の星。物事をよく考え、計画を立てるのが得意です。好奇心旺盛で、変化を楽しみながら新しいアイデアを生み出します。考えすぎて迷うこともある、繊細な一面も。", love: "会話を楽しめる知的な相手と相性◎。気持ちが揺れやすいので、言葉で確かめ合うと安心します。", money: "知恵とアイデアでお金を生みます。収入は変動しやすいので、計画的な管理を。", work: "企画・参謀・研究・ITなど、頭を使う仕事で輝きます。" },
    "太陽": { keyword: "光の星・博愛・発信力", mei: "太陽星は周りを照らす光の星。明るく正義感が強く、人のために動くことに喜びを感じます。表に立って発信する力があり、多くの人に影響を与えます。与えすぎて疲れないよう、休む時間も大切に。", love: "おおらかで情熱的な愛し方。相手を明るく照らし、引っぱっていきます。", money: "名声とともに財が育つタイプ。人のためのお金の使い方が、巡って返ってきます。", work: "人前に立つ仕事、公的な仕事、教育や発信の分野で輝きます。" },
    "武曲": { keyword: "財の星・決断力・実行力", mei: "武曲星は財と決断の星。白黒はっきりさせる意志の強さと、目標を必ずやり遂げる実行力があります。現実的でお金の感覚にすぐれ、努力で富を築いていくタイプです。", love: "照れ屋で言葉は少なめでも、行動で愛を示す誠実なタイプです。", money: "財運に恵まれ、稼ぐ力も貯める力も強い星です。", work: "金融・経営・技術職など、結果がはっきり出る仕事で力を発揮します。" },
    "天同": { keyword: "福の星・おおらか・癒し", mei: "天同星は福に恵まれる穏やかな星。のんびりとしたおおらかさがあり、一緒にいる人を安心させます。争いを好まず、楽しいことや心地よいことを大切にする、人に愛される人です。", love: "やさしく穏やかな恋愛を好みます。一緒にくつろげる相手と長続きします。", money: "人に恵まれて財が巡ります。楽しみへの出費が増えやすいので、ほどほどに。", work: "人を癒す仕事、サービス業、福祉や教育の分野に向いています。" },
    "廉貞": { keyword: "情熱の星・カリスマ・美意識", mei: "廉貞星は情熱と魅力の星。華やかさと強い意志をあわせ持ち、人を惹きつけるカリスマ性があります。正義感が強く、こだわりを持って物事に取り組む、エネルギッシュな人です。", love: "情熱的でドラマチックな恋愛をします。相手への想いの強さが魅力です。", money: "仕事への情熱がそのまま財につながります。勢いの出費には注意。", work: "芸術・美容・政治・営業など、情熱と魅力が生きる分野で輝きます。" },
    "天府": { keyword: "蔵の星・安定・包容力", mei: "天府星は財を蓄える蔵の星。穏やかで包容力があり、物事を安定させる力を持っています。慎重で計画的、周りから信頼される人です。人をまとめ、守る役割が似合います。", love: "安定した、穏やかな関係を大切にします。家庭的で頼れるパートナーです。", money: "貯める力が強く、堅実に財を築きます。", work: "経営・管理・財務など、組織を安定させる仕事に向いています。" },
    "太陰": { keyword: "月の星・やさしさ・感受性", mei: "太陰星は月のようにやさしく繊細な星。感受性が豊かで、人の気持ちに寄り添う思いやりがあります。美しいものを愛し、内面の豊かさを大切にする人です。", love: "ロマンチックで、細やかな愛情を注ぐタイプです。", money: "こつこつ蓄える財運があり、不動産にも縁があるとされます。", work: "芸術・デザイン・ケアの仕事など、感性ややさしさが生きる分野に向いています。" },
    "貪狼": { keyword: "欲望の星・多才・社交", mei: "貪狼星は多才で魅力的な星。好奇心と欲求が強く、さまざまなことに挑戦して才能を開花させます。社交的で人を楽しませるのが得意。楽しみながら成長していく人です。", love: "恋愛運が強く、出会いにも恵まれます。刺激を求めすぎないことが長続きの鍵。", money: "人脈と多才さで財を得ます。遊びへの出費には注意。", work: "エンターテインメント・営業・接客など、人と関わる華やかな仕事で輝きます。" },
    "巨門": { keyword: "言葉の星・探究心・説得力", mei: "巨門星は言葉と探究の星。物事を深く掘り下げ、本質を見抜く力があります。話す力・説得する力にすぐれ、議論にも強い人。ときに言葉が鋭くなるので、伝え方を意識すると◎。", love: "言葉でのコミュニケーションを大切にします。誤解は早めに話し合いで解いて。", money: "話す力・専門知識が財を生みます。", work: "教育・法律・営業・研究・メディアなど、言葉を使う仕事に向いています。" },
    "天相": { keyword: "補佐の星・誠実・調整力", mei: "天相星は誠実で気配りのある補佐の星。人と人の間に立って調整し、物事を円滑に進めます。正義感が強く、困っている人を放っておけない、面倒見のよい人です。", love: "相手を支える、誠実で献身的な愛し方です。", money: "人の役に立つことで、安定した財に恵まれます。", work: "秘書・補佐役・公務・調整役など、組織を支える仕事で信頼されます。" },
    "天梁": { keyword: "長寿の星・守護・面倒見", mei: "天梁星は人を守り導く長老の星。落ち着きがあり、困っている人に手を差しのべる面倒見のよさがあります。年齢より大人びて見られることも。経験を重ねるほど信頼が増す人です。", love: "相手を守り、導くような愛し方。年の差のある関係とも縁があります。", money: "人を助けることで、巡り巡って財に恵まれます。", work: "医療・福祉・教育・相談業など、人を助け導く仕事に向いています。" },
    "七殺": { keyword: "将軍の星・勇気・突破力", mei: "七殺星は勇ましい将軍の星。困難を恐れず、自分の力で道を切りひらく突破力があります。独立心が強く、行動が早い人。波のある人生でも、乗り越えるたびに大きくなります。", love: "情熱的でストレート。お互いの自由を尊重できる関係が向いています。", money: "大胆な行動で財をつかみます。浮き沈みに備えて蓄えを。", work: "起業・営業・スポーツ・開拓など、勝負どころのある仕事で輝きます。" },
    "破軍": { keyword: "変革の星・創造・開拓", mei: "破軍星は古いものを壊し、新しいものを生み出す変革の星。冒険心が強く、変化の中でこそ力を発揮します。常識にとらわれない発想で、人生を何度もつくり変えていく人です。", love: "刺激的でドラマチックな恋愛。安定と自由のバランスがテーマです。", money: "出入りの大きい財運。新しい挑戦が財を生みます。", work: "新規事業・クリエイティブ・改革など、変化の多い仕事に向いています。" }
  };

  var PALACE_THEME = {
    "命宮": "性格と生き方", "兄弟宮": "兄弟姉妹・身近な仲間", "夫妻宮": "恋愛と結婚", "子女宮": "子ども・創造性", "財帛宮": "お金の稼ぎ方と使い方",
    "疾厄宮": "心と体の健康", "遷移宮": "外での活動・移動", "交友宮": "友人・部下・人づきあい", "官禄宮": "仕事と社会的な立場",
    "田宅宮": "家・住まい・財産", "福徳宮": "心の満足・趣味", "父母宮": "親・目上の人との縁"
  };
  var SIKA_TEXT = {
    "化禄": "恵みと豊かさが巡ってくる分野です。",
    "化権": "力を発揮し、主導権を握りやすい分野です。",
    "化科": "評価や名誉、良い評判に恵まれる分野です。",
    "化忌": "こだわりや課題が生まれやすい分野。意識して向き合うことで、大きな成長につながります。"
  };
  var KYOKU = {
    "水二局": "水二局は、流れる水のように柔軟で、早くから運が動き出すリズム。若いうちから活躍の場が広がりやすいタイプです。",
    "木三局": "木三局は、木が育つように着実に伸びていくリズム。学びと成長を重ねながら、運が大きく開いていきます。",
    "金四局": "金四局は、金属が鍛えられるように、経験を積むほど強くなるリズム。中年以降に実力が光ります。",
    "土五局": "土五局は、大地のようにどっしりと安定したリズム。じっくり時間をかけて、確かな運を築きます。",
    "火六局": "火六局は、火が燃え上がるように、ある時期から一気に勢いが増すリズム。遅咲きの大器とされます。"
  };

  // 相性
  var KYOKU_REL = {
    same: "ふたりの五行局は同じ五行。運のリズムが似ていて、同じペースで歩んでいけます。",
    generates: "あなたの五行局がお相手の五行局を生む関係。あなたの存在がお相手の運を育てます。",
    generated: "お相手の五行局があなたの五行局を生む関係。お相手のそばで、あなたの運が育ちます。",
    controls: "あなたの五行局がお相手の五行局を抑える関係。あなたがお相手を引き締め、方向を整える役になりやすいでしょう。",
    controlled: "お相手の五行局があなたの五行局を抑える関係。お相手があなたに、けじめや新しい視点をもたらします。"
  };

  function pad2(n) { return n < 10 ? "0" + n : String(n); }
  function dateLabel(r) { return r.input.year + "年" + r.input.month + "月" + r.input.day + "日 " + r.input.time.hour + ":" + pad2(r.input.time.minute); }
  function lunarLabel(r) { return "旧暦 " + r.lunar.year + "年" + (r.lunar.leap ? "閏" : "") + r.lunar.month + "月" + r.lunar.day + "日・" + r.hour.name; }

  function starLine(p) {
    return p.major.map(function (s) { return s.name + (s.sika ? "・" + s.sika.slice(1) : ""); });
  }

  function palaceReading(r, name, field) {
    var p = r.byName[name];
    var main = r.mainStars(p);
    var lines = main.stars.map(function (s) { return s + "星：" + STAR[s][field]; });
    return { name: name, theme: PALACE_THEME[name], stars: main.stars, borrowed: main.borrowed, texts: lines, branch: p.stem + p.branch };
  }

  function buildShibiView(r) {
    var mei = r.mainStars(r.mei);
    var meiTexts = mei.stars.map(function (s) { return { star: s, keyword: STAR[s].keyword, text: STAR[s].mei }; });
    var grid = r.palaces.map(function (p) {
      return { branch: p.branch, stem: p.stem, name: p.name, isMei: p.name === "命宮", isShin: p.isShin, major: starLine(p), minor: p.minor.map(function (s) { return s.name + (s.sika ? "・" + s.sika.slice(1) : ""); }) };
    });
    return {
      birthLabel: dateLabel(r),
      lunarLabel: lunarLabel(r),
      leapNote: r.lunarUsed.leapAdjusted ? "旧暦の閏月の16日以降のお生まれのため、次の月として命盤を作っています。" : null,
      tradition: TRADITION,
      grid: grid,
      gridNote: "命盤の「禄・権・科・忌」は、四化（化禄・化権・化科・化忌）を表します。",
      kyoku: { name: r.kyoku.name, text: KYOKU[r.kyoku.name] },
      mei: { branch: r.mei.stem + r.mei.branch, stars: mei.stars, borrowed: mei.borrowed, texts: meiTexts },
      shin: { palace: r.shin.name, text: "身宮は" + r.shin.name + "にあります。人生の後半にかけて、「" + PALACE_THEME[r.shin.name] + "」があなたの生き方の大切なテーマになっていきます。" },
      readings: [palaceReading(r, "夫妻宮", "love"), palaceReading(r, "財帛宮", "money"), palaceReading(r, "官禄宮", "work")],
      sika: r.sika.map(function (s) { return { title: s.type + "：" + s.star + "星 → " + s.palace + "（" + PALACE_THEME[s.palace] + "）", text: SIKA_TEXT[s.type] }; })
    };
  }

  function buildShibiCompatibilityView(c) {
    function person(r) { var m = r.mainStars(r.mei); return { birthLabel: dateLabel(r), lunarLabel: lunarLabel(r), kyoku: r.kyoku.name, mei: m.stars.join("・") || "（主星なし）", borrowed: m.borrowed, keyword: m.stars.map(function (s) { return STAR[s].keyword.split("・")[0]; }).join("・") }; }
    var points = [];
    if (c.meiStars.shared.length) points.push(["命宮に同じ星", "ふたりの命宮には同じ" + c.meiStars.shared.join("・") + "星があります。根っこの性質が似ていて、分かり合える関係です。"]);
    if (c.spouseMatch.youSpouseInPartnerMei.length) points.push(["あなたの夫妻宮 × お相手の命宮", "あなたの夫妻宮の星（" + c.spouseMatch.youSpouseInPartnerMei.join("・") + "）が、お相手の命宮にあります。お相手は、あなたが心の奥で求めるパートナー像に重なる人です。"]);
    if (c.spouseMatch.partnerSpouseInYourMei.length) points.push(["お相手の夫妻宮 × あなたの命宮", "お相手の夫妻宮の星（" + c.spouseMatch.partnerSpouseInYourMei.join("・") + "）が、あなたの命宮にあります。あなたは、お相手が求めるパートナー像に重なる人です。"]);
    function fly(f, who, whom) {
      var out = [];
      if (f.roku.palace) out.push([who + "の化禄（" + f.roku.star + "）→ " + whom + "の" + f.roku.palace, who + "は、" + whom + "の「" + PALACE_THEME[f.roku.palace] + "」に恵みをもたらす存在です。"]);
      if (f.ki.palace) out.push([who + "の化忌（" + f.ki.star + "）→ " + whom + "の" + f.ki.palace, who + "は、" + whom + "の「" + PALACE_THEME[f.ki.palace] + "」に強く関わり、こだわりや課題を一緒に乗り越える相手です。"]);
      return out;
    }
    return {
      you: person(c.person1), partner: person(c.person2),
      tradition: TRADITION.compat,
      kyoku: { pair: c.kyoku.you + " × " + c.kyoku.partner, text: KYOKU_REL[c.kyoku.relation] },
      points: points,
      flying: fly(c.partnerToYou, "お相手", "あなた").concat(fly(c.youToPartner, "あなた", "お相手"))
    };
  }

  return {
    TRADITION: TRADITION, STAR: STAR, PALACE_THEME: PALACE_THEME, SIKA_TEXT: SIKA_TEXT, KYOKU: KYOKU,
    buildShibiView: buildShibiView,
    buildShibiCompatibilityView: buildShibiCompatibilityView
  };
});
