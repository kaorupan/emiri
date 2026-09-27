/*
 * 星獣カルテの鑑定文の組み立て（DOM操作なし）
 * エンジンの判定結果 ＋ 世界観データ → 画面に出す表示用データ
 */
(function (root, factory) {
  if (typeof module === "object" && module.exports) {
    module.exports = factory(require("./seiju-data.js"));
  } else {
    root.KaruteContent = root.KaruteContent || {};
    root.KaruteContent.seiju = factory(root.KaruteContent.seijuData);
  }
})(typeof self !== "undefined" ? self : this, function (data) {
  "use strict";

  var SEASON_ORDER = ["spring", "summer", "autumn", "winter"];
  var MOON_ORDER = ["waxing", "full", "waning"];

  function pad4(y) { var s = String(y); while (s.length < 4) s = "0" + s; return s; }
  function md(d) { return d.month + "月" + d.day + "日"; }
  function ymd(d) { return (d.year >= 1 ? pad4(d.year) + "年" : "前年") + d.month + "月" + d.day + "日"; }

  function precisionNote(r) {
    if (r.precision === "verified") return null;
    return "この年代は、太陽と月の位置の計算が推定になります。星獣は同じ計算方法で決めていますが、季節や月のリズムの境目に近い日は、実際と異なる可能性があります。";
  }

  // 12星獣の地図（4季節 × 3つの月のリズム）
  function grid(currentBeastId) {
    return {
      seasons: SEASON_ORDER.map(function (s) { return { id: s, name: data.SEASONS[s].name, plain: data.SEASONS[s].plain }; }),
      moons: MOON_ORDER.map(function (m) { return { id: m, name: data.MOONS[m].name }; }),
      rows: SEASON_ORDER.map(function (s) {
        return MOON_ORDER.map(function (m) {
          var b = data.BEASTS.filter(function (x) { return x.season === s && x.moon === m; })[0];
          return { id: b.id, name: b.name, sigil: b.sigil, current: b.id === currentBeastId };
        });
      })
    };
  }

  function beastCard(r) {
    var b = data.getBeast(r.beast);
    var s = data.SEASONS[r.season], m = data.MOONS[r.moonPhase];
    return {
      id: b.id, name: b.name, sigil: b.sigil, catchphrase: b.catch,
      season: { id: s.id, name: s.name, plain: s.plain },
      moon: { id: m.id, name: m.name }
    };
  }

  /**
   * 個人鑑定の表示用データ
   */
  function buildSeijuView(r) {
    var b = data.getBeast(r.beast);
    var s = data.SEASONS[r.season];
    var m = data.MOONS[r.moonPhase];
    var sd = r.seasonDetail, mdl = r.moonDetail;
    var birthLabel = ymd(r.input);

    var seasonStartText = sd.isStartDay
      ? "あなたの誕生日は、ちょうど" + s.startTerm + "の日。この日から「" + s.name + "」が始まりました。"
      : "あなたの誕生日は、" + s.startTerm + "（" + (sd.startDate.year === r.input.year ? "" : "前年の") + md(sd.startDate) + "）から始まる「" + s.name + "」の中にあります。";

    var reason = [
      seasonStartText + s.reason,
      "生まれた日の正午（日本時間）の月は、新月から数えて約" + mdl.age + "日目。新月から次の新月までを3つに分けたうち、" + m.range + "にあたる「" + m.name + "」でした。" + m.meaning,
      "「" + s.power + "」と、" + m.name + "の「" + m.power + "」。この2つが重なり、あなたの星獣は「" + b.name + "」になりました。「" + b.catch + "」――それが" + b.name + "です。"
    ];

    var notes = [];
    if (mdl.nearBoundary) {
      notes.push("生まれた日の月は、月のリズムの境目の近く（正午から約" + mdl.hoursToBoundary + "時間）にありました。生まれた時刻によっては、となりの月のリズムの星獣の性質もあわせ持つかもしれません。");
    }
    var pn = precisionNote(r);
    if (pn) notes.push(pn);

    return {
      beast: beastCard(r),
      birthLabel: birthLabel,
      precision: r.precision,
      summary: {
        headline: "あなたの星獣は「" + b.name + "」",
        catchphrase: b.catch,
        points: [["季節", s.name + "（" + s.plain + "）"], ["月のリズム", m.name], ["強み", b.strength.split("。")[0]]]
      },
      intro: b.reason,
      season: {
        name: s.name, plain: s.plain, range: s.range,
        startLabel: s.startTerm + "：" + ymd(sd.startDate) + "／次の季節の始まり：" + ymd(sd.nextSeasonStartDate),
        traits: [["基本のエネルギー", s.energy], ["得意なこと", s.forte], ["行動の傾向", s.action], ["人との関わり方", s.relation]]
      },
      moon: {
        name: m.name, range: m.range, meaning: m.meaning, keywords: m.keywords, power: m.power,
        age: mdl.age, fraction: mdl.fraction,
        detail: "生まれた日の正午（日本時間）の月齢：約" + mdl.age + "日（直前の新月：" + ymd(mdl.previousNewMoonDate) + "、次の新月：" + ymd(mdl.nextNewMoonDate) + "）"
      },
      reason: reason,
      notes: notes,
      grid: grid(b.id),
      sections: [
        { key: "personality", title: "基本性格", text: b.personality },
        { key: "strength", title: "強み", text: b.strength },
        { key: "hidden", title: "隠れた一面", text: b.hidden },
        { key: "weakness", title: "苦手になりやすいこと", text: b.weakness },
        { key: "work", title: "仕事・才能", text: b.work },
        { key: "love", title: "恋愛", text: b.love },
        { key: "relationships", title: "人間関係", text: b.relationships },
        { key: "growth", title: "成長のヒント", text: b.growth }
      ]
    };
  }

  // ---------------- 相性 ----------------

  var CATEGORIES = {
    resonance: { label: "共鳴しやすい", lead: "同じ季節や同じ月のリズムを持ち、説明しなくても分かり合える部分が多いふたりです。" },
    complement: { label: "補い合いやすい", lead: "違う力を持ちながらも、どこかでリズムが重なるふたり。足りないところを自然に補い合えます。" },
    stimulus: { label: "刺激を与え合う", lead: "季節も月のリズムも違う、対照的なふたり。お互いにない視点を持ち込み、世界を広げ合える関係です。" },
    pace: { label: "ペース調整が必要", lead: "大切にしたいものは近くても、進む速さや確かめ方が違うふたり。ペースを話し合えると、心強いチームになります。" }
  };

  var PACE_TEXT = { quick: "早めに距離を縮めたい", attuned: "相手の様子を感じ取りながら近づく", slow: "時間をかけて安心を確かめたい" };
  var EXPRESSION_TEXT = { open: "気持ちを言葉や態度で表しやすい", reserved: "言葉よりも、そばにいることで愛情を示しやすい" };

  function who(key) { return key === "person1" ? "あなた" : "お相手"; }
  function other(key) { return key === "person1" ? "person2" : "person1"; }

  function seasonRelationText(c, s1, s2) {
    var t = c.seasonRelation.type;
    if (t === "same") return { label: "同じ季節", text: "ふたりとも「" + s1.name + "」生まれ。大切にしている価値観や、力を出しやすい場面が似ています。" };
    if (t === "opposite") return { label: "向かい合う季節", text: "「" + s1.name + "」と「" + s2.name + "」は、一年の中で向かい合う季節。正反対の強みを持つため、ひとりでは届かない場所へ一緒に届きます。" };
    var e = c.seasonRelation.earlier, l = other(e);
    var se = e === "person1" ? s1 : s2, sl = e === "person1" ? s2 : s1;
    return { label: "つながる季節", text: "「" + se.name + "」から「" + sl.name + "」へ、季節がつながる関係。" + who(e) + "が始めたことを、" + who(l) + "が次の段階へ運びやすい組み合わせです。" };
  }

  function moonRelationText(c, m1, m2) {
    var t = c.moonRelation.type;
    if (t === "same") return { label: "同じリズム", text: "ふたりとも「" + m1.name + "」のリズム。物事に取りかかる速さや、気持ちが動くタイミングが似ています。" };
    if (t === "contrast") return { label: "逆向きのリズム", text: "「満ちゆく月」と「欠けゆく月」。動き出す力と見極める力という、逆向きのリズムを持つふたりです。" };
    var f = c.moonRelation.fullSide, o = other(f);
    var mo = o === "person1" ? m1 : m2;
    return { label: "満ちた月がつなぐリズム", text: who(f) + "の「満ちた月」のリズムが、" + who(o) + "の「" + mo.name + "」を映し出し、ふたりをつなぐ役になります。" };
  }

  function buildSeijuCompatibilityView(c) {
    var p1 = c.person1, p2 = c.person2;
    var b1 = data.getBeast(p1.beast), b2 = data.getBeast(p2.beast);
    var s1 = data.SEASONS[p1.season], s2 = data.SEASONS[p2.season];
    var m1 = data.MOONS[p1.moonPhase], m2 = data.MOONS[p2.moonPhase];
    var cat = CATEGORIES[c.category];
    var sr = seasonRelationText(c, s1, s2);
    var mr = moonRelationText(c, m1, m2);

    function person(r, b, key) {
      var v = buildSeijuView(r);
      return {
        key: key, label: who(key), beast: v.beast, birthLabel: v.birthLabel, precision: r.precision,
        personality: b.personality,
        points: [["強み", b.strength.split("。")[0]], ["隠れた一面", b.hidden.split("。")[0]], ["求めるもの", b.seeks]],
        notes: v.notes
      };
    }

    var love;
    if (c.moonRelation.type === "same") love = "気持ちが高まるタイミングが似ていて、自然に距離が縮まりやすい関係です。慣れてきたころに、感謝を言葉にする習慣を持つと長続きします。";
    else if (c.moonRelation.type === "bridge") love = "「満ちた月」のリズムを持つ" + who(c.moonRelation.fullSide) + "が相手の気持ちを受け止め、関係のテンポを整えやすい組み合わせです。受け止める側に負担が偏らないよう、ときどき役割を入れ替えて。";
    else love = "一方は早く動き出したく、一方はじっくり確かめたい組み合わせ。どちらのペースも間違いではないので、「今どのくらいの速さがいい？」と確かめ合うことが大切です。";

    var living;
    if (c.seasonRelation.type === "same") living = "生活のリズムや大事にしたいことが近く、一緒にいて疲れにくいふたりです。似ているからこそ、苦手なことも重なりやすい点だけ意識して。";
    else if (c.seasonRelation.type === "adjacent") living = "季節がつながるように、役割を引き継ぎ合える関係。" + who(c.seasonRelation.earlier) + "が始めたことを、" + who(other(c.seasonRelation.earlier)) + "が整えて続けていく形が合います。";
    else living = "暮らしのペースや大事にするものが違うぶん、家のことやお金のルールを先に話し合っておくと、互いの得意を生かした暮らしになります。";

    var e1 = c.intimacy.expression.person1, e2 = c.intimacy.expression.person2;
    var talk;
    if (e1 === "open" && e2 === "open") talk = "どちらも気持ちを外に出しやすく、話が弾みやすいふたり。盛り上がるぶん、相手の話を最後まで聞く意識を持つとさらに通じ合えます。";
    else if (e1 === "reserved" && e2 === "reserved") talk = "言葉が少なくても通じ合える、落ち着いた会話ができるふたり。そのぶん、大事なことほど言葉にする意識を持つと安心です。";
    else talk = who(e1 === "open" ? "person1" : "person2") + "がよく話し、" + who(e1 === "open" ? "person2" : "person1") + "がじっくり受け止める組み合わせ。受け止める側の考えを聞く時間を、意識してつくりましょう。";

    var tips = {
      resonance: "似ている部分に甘えず、違いが見えた時こそ面白がること。",
      complement: "相手の得意に任せる場面と、自分が引き受ける場面をはっきり分けること。",
      stimulus: "相手のやり方を「間違い」ではなく「別の正解」として受け止めること。",
      pace: "予定や決めごとは、決める前に「どのくらいの速さで進めたいか」を話し合うこと。"
    };

    var pace1 = c.intimacy.pace.person1, pace2 = c.intimacy.pace.person2;
    var paceGap;
    if (pace1 === pace2) paceGap = "近づく速さが似ているので、無理なく自然に親しくなれます。";
    else if (c.moonRelation.type === "contrast") paceGap = "近づきたい速さに差が出やすい組み合わせです。「今はどのくらいの距離が心地いい？」と言葉で確かめ合うと、どちらも安心できます。";
    else paceGap = "「満ちた月」のリズムを持つ" + who(c.moonRelation.fullSide) + "が相手のペースを感じ取り、ふたりの距離感を整えやすいでしょう。";

    return {
      method: "karute-original",
      you: person(p1, b1, "person1"),
      partner: person(p2, b2, "person2"),
      total: {
        category: c.category,
        label: cat.label,
        lead: cat.lead,
        sameBeast: c.sameBeast,
        sameBeastNote: c.sameBeast ? "ふたりは同じ「" + b1.name + "」。鏡を見るように分かり合える一方で、同じところでつまずきやすい組み合わせです。" : null,
        factors: [
          { title: "季節の相性", label: sr.label, text: sr.text },
          { title: "月のリズムの相性", label: mr.label, text: mr.text },
          { title: "星獣どうしの相性", label: b1.name + " × " + b2.name, text: "あなたの「" + b1.offers + "」と、お相手の「" + b2.offers + "」が出会う組み合わせです。" }
        ],
        method: "星獣カルテの相性は、「季節の相性」「月のリズムの相性」「星獣どうしの特徴」の3つから読む、占いのカルテ独自のエンターテインメント占いです。点数ではなく、関係の傾向を言葉で表しています。"
      },
      details: [
        { title: "惹かれ合うポイント", text: "あなたはお相手の「" + b2.offers + "」に、お相手はあなたの「" + b1.offers + "」に惹かれやすいでしょう。自分にない力を持つ相手だからこそ、一緒にいると世界が広がります。" },
        { title: "あなたから見たお相手", text: "あなたにとってお相手は、「" + b2.offers + "」をくれる存在。一方で、お相手の" + b2.weakShort + "ところに戸惑うこともありそうです。そんな時は、お相手が求めている「" + b2.seeks + "」を思い出してみてください。" },
        { title: "お相手から見たあなた", text: "お相手にとってあなたは、「" + b1.offers + "」をくれる存在。一方で、あなたの" + b1.weakShort + "ところが、お相手には分かりにくく映ることも。あなたが求める「" + b1.seeks + "」を、言葉で伝えておくと安心です。" },
        { title: "恋愛", text: love },
        { title: "暮らし・長い付き合い", text: living },
        { title: "会話・コミュニケーション", text: talk },
        { title: "仕事・一緒に何かをする", text: "あなたの「" + b1.offers + "」と、お相手の「" + b2.offers + "」を別々の役割として生かすと、ひとりでは出せない成果につながります。" },
        { title: "すれ違いやすいポイント", text: "あなたの" + b1.weakShort + "ところと、お相手の" + b2.weakShort + "ところが同時に出ると、すれ違いが長引きやすくなります。相手の反応を「気持ちがない」と決めつけず、星獣の性質の違いとして一度整理してみましょう。" },
        { title: "長続きのコツ", list: [
          tips[c.category],
          "あなたが求める「" + b1.seeks + "」を、察してもらうのではなく言葉にする。",
          "お相手が求める「" + b2.seeks + "」を、その人らしさとして尊重する。"
        ] }
      ],
      intimacy: {
        lead: "ここでは、ふたりの距離感、親密になる速さ、安心感、愛情表現、境界線を、季節と月のリズムから読みます。",
        text: "あなたは" + PACE_TEXT[pace1] + "タイプ、お相手は" + PACE_TEXT[pace2] + "タイプです。" + paceGap,
        points: [
          ["親密になる速さ", "あなた：" + PACE_TEXT[pace1] + "／お相手：" + PACE_TEXT[pace2]],
          ["愛情表現", "あなた：" + EXPRESSION_TEXT[e1] + "／お相手：" + EXPRESSION_TEXT[e2]],
          ["安心できること", "あなた：" + b1.seeks + "／お相手：" + b2.seeks],
          ["スキンシップと境界線", "触れ合いの好みや、ひとりになりたいタイミングは人それぞれ。嫌だと感じたことは理由を問い詰めず、まず尊重することが信頼につながります。"],
          ["コミュニケーション", "気まずくなる前に、「うれしかったこと」と「少し苦手だったこと」を短く伝え合う習慣を。"]
        ]
      }
    };
  }

  return {
    CATEGORIES: CATEGORIES,
    grid: grid,
    buildSeijuView: buildSeijuView,
    buildSeijuCompatibilityView: buildSeijuCompatibilityView
  };
});
