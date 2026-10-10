/*
 * 姓名判断：結果ページの文章（えみりのオリジナル文章）
 *   buildSeimeiView(result) / buildSeimeiCompatibilityView(compat)
 *   KAKU：五格の説明（結果ページと /seimei/kakusu/ で共通）
 * 数の意味は content/seimei-numbers.js。
 */
(function (root, factory) {
  if (typeof module === "object" && module.exports) {
    module.exports = factory(require("./seimei-numbers.js"));
  } else {
    root.KaruteContent = root.KaruteContent || {};
    root.KaruteContent.seimei = factory(root.KaruteContent.seimeiNumbers);
  }
})(typeof self !== "undefined" ? self : this, function (numbers) {
  "use strict";

  var KAKU = [
    { key: "jin", name: "人格", reading: "じんかく", alias: "主運",
      how: "姓の最後の字＋名の最初の字",
      short: "性格の中心と、働き盛りの運",
      text: "姓と名をつなぐ、名前の中心です。その人の性格の核や才能を表し、20代後半〜50代ごろの働き盛りの運を左右するとされます。五格の中で最も大切に見られる格です。" },
    { key: "sou", name: "総格", reading: "そうかく", alias: "後運",
      how: "姓名すべての画数の合計",
      short: "人生全体の流れと、晩年の運",
      text: "名前全体の画数で、人生全体の流れや、その人が最終的にたどり着く場所を表します。特に50代以降の運に強く表れるとされ、人格と並んで重要な格です。" },
    { key: "chi", name: "地格", reading: "ちかく", alias: "前運",
      how: "名の画数の合計",
      short: "生まれ持った個性と、若いころの運",
      text: "名前（下の名前）の画数で、生まれ持った個性や才能、幼少期から青年期（30歳ごろまで）の運を表します。人生の土台をつくる格です。" },
    { key: "gai", name: "外格", reading: "がいかく", alias: "副運",
      how: "総格−人格（天格＋地格−人格）",
      short: "人間関係と、まわりの環境",
      text: "人格以外の部分の画数で、家族・友人・職場など、外の世界との関係や、まわりから受ける影響を表します。対人運や社会運を見る格です。" },
    { key: "ten", name: "天格", reading: "てんかく", alias: "祖運",
      how: "姓の画数の合計",
      short: "家系から受け継ぐもの",
      text: "姓（名字）の画数で、家系や先祖から受け継ぐ性質を表します。同じ姓の家族に共通する格なので、その人個人の吉凶にはあまり影響しないとされます。" }
  ];
  var KAKU_BY = {};
  KAKU.forEach(function (k) { KAKU_BY[k.key] = k; });

  var EL_TEXT = {
    木: "木（伸びる・育てる）", 火: "火（燃える・広がる）", 土: "土（支える・育む）", 金: "金（固める・磨く）", 水: "水（流れる・満たす）"
  };

  var TEN_JIN = {
    same: "家系の気質を自然に受け継ぎ、家族や目上の人ともなじみやすい配置です。",
    give: "家系や目上の人から後押しを受けやすく、引き立てを生かして伸びる配置です。",
    receive: "家族や目上の人のために力を注ぐ配置です。尽くしたぶんだけ信頼が返ってきます。",
    press: "家系や目上の人からの期待やプレッシャーを感じやすい配置です。自分のペースを大切に。",
    pressed: "家の枠を超えて、自分の道を切りひらきたい気持ちが強い配置です。独立心が力になります。"
  };
  var JIN_CHI = {
    same: "内面と、身近な環境や家庭がなじみ、心が安定しやすい配置です。",
    give: "自分の力を、家族や後輩など身近な人のために注ぐ配置です。面倒見のよさが長所になります。",
    receive: "家庭や足元の環境に支えられて、力を発揮できる配置です。基盤が安定しやすいでしょう。",
    press: "足元の環境を自分の力で動かそうとして、無理をしやすい配置です。休む時間を意識して。",
    pressed: "環境やまわりの事情に振り回されやすい配置です。自分の時間と場所を確保すると落ち着きます。"
  };
  var SANSAI_LEVEL = {
    good: "天・人・地の流れがなめらかで、まわりの助けを受けながら、自分の力を素直に発揮できる配置です。",
    mixed: "流れの良いところと、ぶつかるところがある配置です。ぶつかる部分を意識すると、うまく乗りこなせます。",
    caution: "天・人・地の間にぶつかり合いがある配置です。そのぶん自分の力で道をつくる強さがあります。無理をためこまない工夫を。"
  };

  function scoreLead(score) {
    if (score >= 80) return { label: "とても恵まれた名前", text: "大切な格に吉数がそろった、運の流れが良い名前です。名前が持つ力を信じて、のびのびと進んでください。" };
    if (score >= 60) return { label: "バランスの良い名前", text: "吉数を軸に、全体のバランスがとれた名前です。得意なところを伸ばすほど、運が開けていきます。" };
    if (score >= 40) return { label: "長所と課題がはっきりした名前", text: "強みと、気をつけたいところがはっきりしている名前です。課題を知っておくことで、強みをいっそう生かせます。" };
    return { label: "伸びしろの大きい名前", text: "試練を表す数もありますが、それは乗り越える力を秘めている証でもあります。気をつけたいところを知って、上手に付き合っていきましょう。" };
  }

  function kakuView(r, key) {
    var k = KAKU_BY[key], v = r[key], num = numbers.number(v.value);
    return {
      key: key, name: k.name, reading: k.reading, alias: k.alias, how: k.how, short: k.short, role: k.text,
      value: v.value, n: num.n, wrapped: num.n !== v.value, rei: v.rei, luck: num.luck, element: v.element,
      keyword: num.keyword, text: num.text, love: num.love, work: num.work, advice: num.advice
    };
  }

  function buildSeimeiView(r) {
    var lead = scoreLead(r.score);
    var jin = kakuView(r, "jin"), sou = kakuView(r, "sou");
    var rei = [];
    if (r.ten.rei) rei.push("姓が1字のため、天格と外格に霊数1を足しています。");
    if (r.chi.rei) rei.push("名が1字のため、地格と外格に霊数1を足しています。");
    return {
      fullName: r.seiText + " " + r.meiText,
      chars: { sei: r.sei, mei: r.mei },
      score: r.score, scoreLabel: lead.label, scoreText: lead.text,
      summary: "名前の中心となる人格は「" + jin.keyword + "」、人生全体を表す総格は「" + sou.keyword + "」の数です。",
      kakus: KAKU.map(function (k) { return kakuView(r, k.key); }),
      rei: rei,
      sansai: {
        ten: r.sansai.ten, jin: r.sansai.jin, chi: r.sansai.chi,
        tenLabel: EL_TEXT[r.sansai.ten], jinLabel: EL_TEXT[r.sansai.jin], chiLabel: EL_TEXT[r.sansai.chi],
        tenJin: r.sansai.tenJin.type, jinChi: r.sansai.jinChi.type,
        lead: SANSAI_LEVEL[r.sansai.level],
        details: [["天格→人格（" + r.sansai.tenJin.type + "）", TEN_JIN[r.sansai.tenJin.dir]], ["人格→地格（" + r.sansai.jinChi.type + "）", JIN_CHI[r.sansai.jinChi.dir]]]
      },
      love: jin.love, work: sou.work, advice: jin.advice,
      tradition: "姓名判断は、名前の漢字の画数から運勢を読む占いです。日本では昭和の初めに熊崎健翁が体系化した「五格」（天格・人格・地格・外格・総格）で見る方法が広く知られています。"
    };
  }

  var COMPAT_JIN = {
    same: "ふたりの性格の土台が似ていて、一緒にいると自然体でいられる組み合わせです。言葉にしなくても通じ合える場面が多いでしょう。",
    give: "あなたがお相手を支え、育てていく組み合わせです。あなたのやさしさが、お相手の力を引き出します。",
    receive: "お相手があなたを支え、伸ばしてくれる組み合わせです。お相手のそばにいると、あなたらしさが育ちます。",
    press: "あなたが主導権を握りやすい組み合わせです。お相手が窮屈に感じていないか、ときどき気持ちを確かめて。",
    pressed: "お相手のペースに押されやすい組み合わせです。自分の気持ちも遠慮せず言葉にすると、良い関係が続きます。"
  };
  var COMPAT_SOU = {
    same: "人生で大切にしたいものが似ていて、同じ方向を向いて歩いていける組み合わせです。",
    give: "あなたの生き方が、お相手の人生を後押しする組み合わせです。",
    receive: "お相手の生き方が、あなたの人生を後押ししてくれる組み合わせです。",
    press: "人生の目標やペースにずれが出やすい組み合わせです。将来のことは早めに話し合って。",
    pressed: "お相手の価値観に合わせすぎてしまいやすい組み合わせです。自分の夢も大切に。"
  };

  function compatLead(score) {
    if (score >= 80) return "名前の画数から見ると、自然に支え合える、とても相性の良いふたりです。";
    if (score >= 60) return "名前の画数から見ると、良いところを伸ばし合えるふたりです。";
    if (score >= 45) return "名前の画数から見ると、違いを認め合うことで深まっていくふたりです。";
    return "名前の画数から見ると、刺激し合う関係です。違いを楽しむ気持ちが、ふたりを強くします。";
  }

  function personView(r) {
    var j = numbers.number(r.jin.value), s = numbers.number(r.sou.value);
    return {
      fullName: r.seiText + " " + r.meiText,
      jin: { value: r.jin.value, n: j.n, luck: j.luck, element: r.jin.element, keyword: j.keyword },
      sou: { value: r.sou.value, n: s.n, luck: s.luck, element: r.sou.element, keyword: s.keyword },
      love: j.love
    };
  }

  function buildSeimeiCompatibilityView(c) {
    return {
      you: personView(c.you), partner: personView(c.partner),
      score: c.score, lead: compatLead(c.score),
      jin: { type: c.jin.type, text: COMPAT_JIN[c.jin.dir] },
      sou: { type: c.sou.type, text: COMPAT_SOU[c.sou.dir] },
      sameJin: c.sameJin ? "ふたりの人格が同じ数です。考え方や感じ方がよく似ていて、共感し合える関係です。" : null,
      tradition: "姓名判断の相性は、ふたりの人格（ふだんの性格）と総格（人生の方向性）の数を五行（木・火・土・金・水）に当てはめ、生かし合う関係（相生）・同じ性質（比和）・ぶつかり合う関係（相剋）かを見るのが一般的です。"
    };
  }

  return {
    KAKU: KAKU, EL_TEXT: EL_TEXT,
    buildSeimeiView: buildSeimeiView,
    buildSeimeiCompatibilityView: buildSeimeiCompatibilityView,
    number: numbers.number
  };
});
