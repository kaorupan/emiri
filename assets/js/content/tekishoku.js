/*
 * 適職占い（えみりの組み合わせ）
 *   向いている仕事：数秘術（ライフパス）・九星気学（本命星）・四柱推命（日干）の「仕事」の読みを並べる
 *   転職の時期：数秘術のパーソナルイヤー／パーソナルマンスと、四柱推命のその年の通変星・天中殺から、
 *              「動きやすい年・月」の目安を出す（占いとしての目安。決めつけない）
 *
 * ブラウザでは window.KaruteContent.tekishoku、Node では module.exports。計算は各エンジンに任せ、ここでは組み合わせるだけ。
 */
(function (root, factory) {
  var api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  root.KaruteContent = root.KaruteContent || {};
  root.KaruteContent.tekishoku = api;
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";

  // パーソナルイヤー：転職との相性（2＝動きやすい、1＝条件しだいで、0＝準備・充電）
  var PY = {
    1: [2, "新しいスタートの年。新しい職場や働き方に飛びこむのに向いています。"],
    2: [0, "人とのつながりを育てる年。焦って動くより、人脈や情報を集めておくと次につながります。"],
    3: [1, "表現と楽しさの年。やりたいことを口に出すと、思わぬ話が舞いこみやすい時期です。"],
    4: [0, "土台を固める年。今の場所でスキルや実績を積み上げると、のちの転職で強みになります。"],
    5: [2, "変化の年。転職や引っ越しなど、環境を変える動きと相性がよい時期です。"],
    6: [0, "責任と人間関係の年。家族や周りとの調整を大切にしながら、無理のない計画を。"],
    7: [0, "内省の年。自分が本当にしたい仕事を見つめ直す「自己分析」に向いた時期です。"],
    8: [1, "実りと評価の年。収入やポジションを上げる交渉、キャリアアップの転職に向いています。"],
    9: [1, "区切りの年。今の仕事を締めくくり、次へ進む準備をするのに向いています。"]
  };
  // パーソナルマンス
  var PM = {
    1: "動き出しやすい月", 5: "変化を起こしやすい月", 8: "条件の交渉に向く月", 9: "区切りをつけやすい月",
    3: "やりたいことを話してみる月", 7: "自己分析に向く月", 2: "情報を集める月", 4: "準備を固める月", 6: "周りと相談する月"
  };
  var PM_SCORE = { 1: 2, 5: 2, 8: 1, 9: 1, 3: 1 };

  // その年の通変星（四柱推命）：転職との相性
  var TSUHEN = {
    "比肩": [1, "自分の力で道を切りひらく年。独立や、自分で選んだ道に進む決断に向いています。"],
    "劫財": [0, "周りの影響を受けやすい年。人の誘いに流されず、条件をよく見比べて。"],
    "食神": [1, "好きなことや得意なことが仕事につながりやすい年です。"],
    "傷官": [2, "今の環境を変えたい気持ちが強まる年。新しい場所で才能を試す転機になりやすいとされます。"],
    "偏財": [2, "人の縁からチャンスが来やすい年。紹介や声かけを大切に。"],
    "正財": [0, "コツコツ積み上げる年。今の場所で信用と実績を育てると実を結びます。"],
    "偏官": [2, "変化と挑戦の年。プレッシャーの中で大きく動く転機になりやすいとされます。"],
    "正官": [1, "評価や昇進に縁がある年。社内での異動やキャリアアップも選択肢に。"],
    "偏印": [1, "ひらめきの年。新しい分野や、これまでと違う働き方に関心が向きやすい時期です。"],
    "印綬": [0, "学びの年。資格や勉強で力をつけておくと、次の転職で生きてきます。"]
  };

  var LEVELS = [
    { min: 3, key: "go", label: "転職に動きやすい年", tip: "求人を見たり、転職サービスに相談したりと、具体的に動き始めるのに向いています。" },
    { min: 2, key: "ready", label: "準備を整えて動く年", tip: "自己分析や情報集めをしっかりしてから動くと、よい流れに乗りやすい年です。" },
    { min: 0, key: "stay", label: "力を蓄える年", tip: "今の場所で実績やスキルを積み、次のチャンスに備えるのに向いています。" }
  ];
  function levelOf(score) { for (var i = 0; i < LEVELS.length; i++) if (score >= LEVELS[i].min) return LEVELS[i]; return LEVELS[LEVELS.length - 1]; }
  // 「AとBとAとCを同時に使える役割」→「A・B・Cを同時に使える役割」（同じ言葉の重なりをなくす）
  function uniqueJoin(text) {
    var m = String(text).match(/^(.*)(を同時に使える役割)$/);
    if (!m) return text;
    var seen = [];
    m[1].split("と").forEach(function (w) { if (w && seen.indexOf(w) < 0) seen.push(w); });
    return seen.join("・") + m[2];
  }
  function reduce(n) { while (n > 9) n = String(n).split("").reduce(function (a, b) { return a + Number(b); }, 0); return n; }

  /**
   * @param birth {year, month, day}
   * @param today {year, month, day}（日本時間）
   * @param E { numerology, numText, kyusei, kyText, shichu, shText }（各エンジン・文章）
   */
  function build(birth, today, E) {
    var num = E.numerology.calculateNumerology(birth, { targetYear: today.year });
    var nv = E.numText.buildPersonal(num);
    var ky = E.kyusei.calculateKyusei(birth);
    var star = E.kyText.STAR_TEXT[ky.honmei];
    var sh = E.shichu.calculateShichusuimei(birth);
    var dm = E.shText.DAY_MASTER[sh.dayMaster.name];

    var lpWork = (nv.lifePath.sections.filter(function (s) { return s.title === "仕事"; })[0] || {}).text || "";
    var deep = nv.deep.filter(function (d) { return d.title === "仕事・適職・働き方"; })[0] || { text: "", points: [] };

    // これからの3年
    var fortunes = E.shichu.yearFortunes(sh, today, 3);
    var years = fortunes.map(function (f, i) {
      var y = today.year + i;
      var py = reduce(E.numerology.calculateNumerology(birth, { targetYear: y }).personalYear);
      var p = PY[py] || PY[reduce(py)];
      var t = TSUHEN[f.tsuhen.name] || [0, ""];
      var score = p[0] + t[0];
      if (f.isKuubou) score = Math.min(score, 2);
      var lv = levelOf(score);
      return { year: y, personalYear: py, pyText: p[1], tsuhen: f.tsuhen.name, tsuhenText: t[1], kuubou: f.isKuubou, score: score, level: lv };
    });

    // これからの12か月（今月から）
    var months = [];
    for (var k = 0; k < 12; k++) {
      var m = today.month + k, y2 = today.year;
      if (m > 12) { m -= 12; y2 += 1; }
      var list = E.numerology.calculateNumerology(birth, { targetYear: y2 }).personalMonths;
      var pm = reduce((list.filter(function (x) { return x.month === m; })[0] || {}).personalMonth || 0);
      months.push({ year: y2, month: m, pm: pm, label: PM[pm] || "", good: (PM_SCORE[pm] || 0) >= 2, ok: (PM_SCORE[pm] || 0) === 1 });
    }

    var best = years.slice().sort(function (a, b) { return b.score - a.score || a.year - b.year; })[0];
    var goodMonths = months.filter(function (m) { return m.good; });

    return {
      input: num.input,
      lifePath: num.lifePath,
      summary: {
        strength: nv.summary.strength,
        workStyle: uniqueJoin((deep.points.filter(function (p) { return p[0] === "力を発揮しやすい環境"; })[0] || [])[1] || ""),
        avoid: (deep.points.filter(function (p) { return p[0] === "避けたい状態"; })[0] || [])[1] || "",
        bestYear: best,
        goodMonths: goodMonths.slice(0, 3)
      },
      views: [
        { method: "数秘術", label: "ライフパスナンバー" + num.lifePath, text: lpWork + " " + deep.text, link: "../suhijutsu/" },
        { method: "九星気学", label: "本命星：" + ky.honmeiStar.name, text: star.work, strengths: star.strengths, link: "../kyusei/" },
        { method: "四柱推命", label: "日干：" + sh.dayMaster.name + "（" + sh.dayMaster.reading + "）", text: dm.work, strengths: [dm.strength], link: "../shichusuimei/" }
      ],
      years: years,
      months: months,
      kuubouName: sh.kuubou.name
    };
  }

  return { build: build, PY: PY, PM: PM, TSUHEN: TSUHEN, LEVELS: LEVELS };
});
