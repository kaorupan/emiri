/*
 * ギャンブル運占い（えみりの組み合わせ）
 *   生まれ持ったギャンブル運：四柱推命の命式（年・月・日の通変星）から、勝負のスタイルと5つの力の目安を出す。
 *                            数秘術のライフパスで「勝負のくせ」を添える。
 *   今日のギャンブル運：今日の日の干支を、その人の日干から見た通変星・十二運と、天中殺で読む。
 *                      ラッキーな時間帯は、今日の時の干支から「偏財」「食神」になる時間を探す。
 *   どれも遊びの目安。勝ちを約束するものではない（画面とページの文章でもそう伝える）。
 *
 * ブラウザでは window.KaruteContent.gamble、Node では module.exports。
 */
(function (root, factory) {
  var api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  root.KaruteContent = root.KaruteContent || {};
  root.KaruteContent.gamble = api;
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";

  var TSUHEN = ["比肩", "劫財", "食神", "傷官", "偏財", "正財", "偏官", "正官", "偏印", "印綬"];

  // 5つの力：通変星ごとの加点（命式の中に何個あるかで数える）
  var POWER_KEYS = [
    { key: "intuition", name: "直感・ひらめき" },
    { key: "analysis", name: "読み・分析力" },
    { key: "windfall", name: "くじ運・臨時収入" },
    { key: "nerve", name: "勝負度胸" },
    { key: "control", name: "引き際・自制心" }
  ];
  var POWER = {
    "比肩": { nerve: 1, control: 1 },
    "劫財": { nerve: 1.5, control: -1 },
    "食神": { windfall: 1, intuition: 0.5, control: 0.5 },
    "傷官": { intuition: 2, nerve: 0.5, control: -0.5 },
    "偏財": { windfall: 2, nerve: 0.5 },
    "正財": { analysis: 1, control: 1 },
    "偏官": { nerve: 1.5, intuition: 0.5 },
    "正官": { control: 2, analysis: 0.5 },
    "偏印": { intuition: 1.5, analysis: 0.5 },
    "印綬": { analysis: 2 }
  };

  // 勝負のスタイル（命式の中でいちばん強い力で決める）
  var TYPES = {
    intuition: {
      name: "ひらめき直感タイプ",
      text: "ふと浮かんだ数字や、パッと目に入ったものに運が宿りやすいタイプです。考えすぎるほど迷いが出やすいので、最初のひらめきを大切にすると流れに乗りやすいでしょう。",
      fit: "数字を選ぶくじや、直感で選べる遊び",
      care: "ひらめきが外れた日に、取り返そうと続けてしまうこと"
    },
    analysis: {
      name: "データ研究タイプ",
      text: "情報を集めて、じっくり予想を組み立てるほど力が出るタイプです。過去の成績や条件を比べる時間そのものを楽しめるのが強みです。",
      fit: "競馬・競艇など、予想を組み立てる公営競技",
      care: "調べた手間を取り返したくなって、予算を超えてしまうこと"
    },
    windfall: {
      name: "臨時収入タイプ",
      text: "人の縁やタイミングから、思いがけないお金が入りやすいとされるタイプです。誘われて参加したときや、気楽に楽しんでいるときに運が向きやすいでしょう。",
      fit: "宝くじなどのくじ、仲間と楽しむ遊び",
      care: "「当たる気がする」と、続けて大きく買い足してしまうこと"
    },
    nerve: {
      name: "勝負師タイプ",
      text: "ここ一番で思い切れる、勝負度胸のあるタイプです。流れが来たときの決断が速い一方で、熱くなると引き際を忘れやすい面もあります。",
      fit: "短い時間で決着がつく、勝負どころのはっきりした遊び",
      care: "負けが続いたときに賭け金を上げてしまうこと。はじめに上限を決めておくのがいちばんの開運です"
    },
    control: {
      name: "堅実コツコツタイプ",
      text: "勝ち負けに振り回されず、決めた範囲で楽しめるタイプです。大きな一発より、少額を長く楽しむほうが運を味方につけやすいでしょう。",
      fit: "少額で長く楽しめる遊び、決めた回数だけ買うくじ",
      care: "「たまには大きく」と、いつものやり方を急に変えること"
    }
  };

  // 数秘術のライフパス：勝負のくせ
  var LP = {
    1: "先頭を切って決めたいタイプ。人の予想に流されず、自分で選んだときに納得のいく結果になりやすいでしょう。",
    2: "周りの空気に敏感なタイプ。仲間と楽しむと運が安定しやすい一方、人の意見で迷いやすいので注意を。",
    3: "楽しむ心が運を呼ぶタイプ。勝ち負けより「楽しかった」を大事にすると、流れがよくなります。",
    4: "決めたルールを守れるタイプ。予算と回数をはじめに決めておくと、強みがいちばん生きます。",
    5: "変化とスリルを楽しめるタイプ。気分が乗ったときほど、時間と予算の上限を思い出して。",
    6: "人のために使うお金に運があるタイプ。勝ったら誰かにごちそうするくらいの気持ちが吉。",
    7: "ひとりで静かに考えると冴えるタイプ。騒がしい場より、落ち着いて選べる環境が向いています。",
    8: "お金の流れに強いタイプ。勝負勘はありますが、大きく張りたくなるので上限を決めておくのが鍵です。",
    9: "直感と経験の両方を持つタイプ。こだわりすぎず、さっと切り上げるほど運が残ります。",
    11: "ひらめきが鋭いタイプ。ピンときたときと、そうでないときの差がはっきり出やすいでしょう。",
    22: "大きな目標に向かう力があるタイプ。目先の勝ち負けより、長い目で楽しむほうが向いています。",
    33: "人を楽しませる運があるタイプ。みんなで楽しむ場で、運が回ってきやすいでしょう。"
  };

  // 日干の五行 → 財（我が剋す）の五行 → 金運の色
  var COLOR = { 0: "緑", 1: "赤", 2: "黄色", 3: "白・ゴールド", 4: "黒・紺" }; // 木 火 土 金 水
  // 今日のラッキーカラー（五行ごとに2色。日の干支で入れかわる）
  var DAY_COLOR = { 0: ["グリーン", "ミントグリーン"], 1: ["レッド", "オレンジ"], 2: ["イエロー", "ベージュ"], 3: ["ゴールド", "ホワイト"], 4: ["ネイビー", "ブラック"] };
  // 五行ごとのラッキーアイテム（身近に持てるもの）
  var ITEMS = {
    0: ["緑のペン", "木製のキーホルダー", "葉っぱ模様のハンカチ", "ミントのガム", "新しいノート"],
    1: ["赤いハンカチ", "三角形のモチーフの小物", "太陽モチーフのアクセサリー", "赤い小銭入れ", "あたたかい飲み物"],
    2: ["黄色い小物", "陶器のマグカップ", "四角いカードケース", "はちみつのキャンディ", "ベージュのバッグ"],
    3: ["ゴールドのアクセサリー", "腕時計", "丸い小銭入れ", "白いハンカチ", "金色のコイン"],
    4: ["黒い財布", "ミネラルウォーター", "ガラスのアクセサリー", "紺色の帽子", "波模様のハンカチ"]
  };
  // 財の五行に合う、金運の石（えみりのパワーストーンのページ）
  var STONE = {
    0: { name: "アベンチュリン", url: "../powerstone/aventurine/" },
    1: { name: "カーネリアン", url: "../powerstone/carnelian/" },
    2: { name: "シトリン", url: "../powerstone/citrine/" },
    3: { name: "ルチルクォーツ", url: "../powerstone/rutile/" },
    4: { name: "ラピスラズリ", url: "../powerstone/lapis/" }
  };
  var ELEM = ["木", "火", "土", "金", "水"];

  // 今日の通変星：ギャンブル運の基本点（1〜5）と読み
  var DAY = {
    "偏財": [5, "思いがけないお金に縁がある日。くじ運・勝負運ともに高まりやすいとされます。"],
    "食神": [4, "気持ちに余裕があり、楽しむほど運が回る日。肩の力を抜いて遊ぶのが吉です。"],
    "傷官": [3, "ひらめきが冴える日。ただし気分の波が出やすいので、深追いは禁物です。"],
    "偏印": [3, "直感がはたらく日。いつもと違う選び方が当たりやすい一方、気まぐれにも注意。"],
    "比肩": [3, "自分の判断を信じられる日。人の予想より、自分で決めたほうが納得できます。"],
    "正財": [3, "堅実さが生きる日。大きな勝負より、少額でコツコツが向いています。"],
    "偏官": [3, "勢いのある日。勝負どころは来やすいものの、熱くなりすぎないように。"],
    "正官": [2, "ルールを守るのが吉の日。決めた予算の中で、控えめに楽しみましょう。"],
    "印綬": [2, "考える力が高まる日。勝負するより、情報を集めて次に備えるのに向いています。"],
    "劫財": [1, "お金が出ていきやすい日。つい使いすぎてしまうので、今日は見送るのが吉です。"]
  };
  var STRONG = ["冠帯", "建禄", "帝旺"], WEAK = ["病", "死", "墓", "絶"];
  var LEVELS = {
    5: { label: "大吉", title: "勝負運が高まる日" },
    4: { label: "吉", title: "楽しむほど運が回る日" },
    3: { label: "中吉", title: "ほどほどに楽しむ日" },
    2: { label: "小吉", title: "控えめが吉の日" },
    1: { label: "見送り", title: "今日はお休みが吉の日" }
  };
  var HOURS = ["23〜1時", "1〜3時", "3〜5時", "5〜7時", "7〜9時", "9〜11時", "11〜13時", "13〜15時", "15〜17時", "17〜19時", "19〜21時", "21〜23時"];

  function mod(n, m) { return ((n % m) + m) % m; }
  function reduce(n) { while (n > 9) n = String(n).split("").reduce(function (a, b) { return a + Number(b); }, 0); return n; }
  function clamp(n, lo, hi) { return Math.max(lo, Math.min(hi, n)); }

  // 日付に n 日足す（日本時間の暦日として）
  function addDays(d, n) {
    var t = new Date(Date.UTC(d.year, d.month - 1, d.day + n));
    return { year: t.getUTCFullYear(), month: t.getUTCMonth() + 1, day: t.getUTCDate() };
  }

  /** 生まれ持ったギャンブル運 */
  function natal(birth, E) {
    var sh = E.shichu.calculateShichusuimei(birth);
    var stars = [];
    sh.pillars.forEach(function (p) {
      if (p.key === "hour") return;
      if (p.stemTsuhen) stars.push(p.stemTsuhen.name);
      if (p.branchTsuhen) stars.push(p.branchTsuhen.name);
    });
    var raw = { intuition: 0, analysis: 0, windfall: 0, nerve: 0, control: 0 };
    stars.forEach(function (s) { var w = POWER[s] || {}; for (var k in w) raw[k] += w[k]; });
    var powers = POWER_KEYS.map(function (p) {
      return { key: p.key, name: p.name, raw: raw[p.key], level: clamp(Math.round(raw[p.key] + 2), 1, 5) };
    });
    // いちばん強い力（同点は 直感→分析→くじ→度胸→自制 の順）。自制がほかと並ぶなら自制を優先しない
    var top = powers.slice().sort(function (a, b) { return b.raw - a.raw; })[0];
    var num = E.numerology.calculateNumerology(birth, { targetYear: E.today.year });
    var lp = num.lifePath;
    var fin = mod(sh.dayMaster.index >> 1, 5);
    var wealth = mod(fin + 2, 5); // 我が剋す五行＝財
    var thisYear = E.shichu.yearFortunes(sh, E.today, 1)[0];
    return {
      input: sh.input,
      dayMaster: sh.dayMaster,
      stars: stars,
      type: TYPES[top.key],
      typeKey: top.key,
      powers: powers,
      lifePath: lp,
      lpText: LP[lp] || LP[reduce(lp)],
      luckyColor: COLOR[wealth],
      luckyItems: ITEMS[wealth].slice(0, 3),
      luckyStone: STONE[wealth],
      wealthElement: ELEM[wealth],
      luckyNumber: reduce(lp),
      hasHensai: stars.indexOf("偏財") >= 0,
      year: { year: thisYear.year, tsuhen: thisYear.tsuhen.name, kuubou: thisYear.isKuubou, text: (DAY[thisYear.tsuhen.name] || [0, ""])[1].replace("日。", "年。").replace(/日です。$/, "年です。").replace(/日に/g, "年に").replace("今日は", "今年は").replace(/日$/, "年") },
      kuubouName: sh.kuubou.name,
      sh: sh
    };
  }

  /** ある1日のギャンブル運 */
  function dayLuck(sh, date, E) {
    var S = E.shichu;
    var idx = S.dayIndex(date.year, date.month, date.day);
    var dm = sh.dayMaster.index;
    var ts = TSUHEN[S.tsuhenIndex(dm, idx % 10)];
    var ju = S.JUNIUN[S.juniunIndex(dm, idx % 12)];
    var voids = sh.kuubou.branches.map(function (b) { return b.index; });
    var kuubou = voids.indexOf(idx % 12) >= 0;
    var base = DAY[ts][0];
    var score = base + (STRONG.indexOf(ju) >= 0 ? 1 : 0) - (WEAK.indexOf(ju) >= 0 ? 1 : 0);
    if (kuubou) score = Math.min(score, 2);
    score = clamp(score, 1, 5);
    // ラッキーな時間帯：今日の時の干支が偏財→食神→正財になる時間（夜中の0〜5時はのぞく）
    var lucky = null;
    ["偏財", "食神", "正財"].some(function (want) {
      for (var b = 3; b <= 11; b++) {
        var hour = b * 2 - 1; // 寅(3〜5時)…亥(21〜23時)
        var hIdx = S.hourIndexOf(idx % 10, hour);
        if (TSUHEN[S.tsuhenIndex(dm, hIdx % 10)] === want) { lucky = { hours: HOURS[b], tsuhen: want }; return true; }
      }
      return false;
    });
    return {
      date: date, name: S.STEMS.charAt(idx % 10) + S.BRANCHES.charAt(idx % 12),
      tsuhen: ts, juniun: ju, kuubou: kuubou, score: score, level: LEVELS[score],
      text: DAY[ts][1], luckyTime: lucky,
      // 今日の干支の五行が生む五行を「流れを生む五行」として、ラッキーカラーとアイテムを選ぶ
      luckyElement: ELEM[mod((idx % 10 >> 1) + 1, 5)],
      luckyColor: DAY_COLOR[mod((idx % 10 >> 1) + 1, 5)][idx % 2],
      luckyItem: ITEMS[mod((idx % 10 >> 1) + 1, 5)][idx % 5]
    };
  }

  /**
   * @param birth {year, month, day}
   * @param today {year, month, day}（日本時間）
   * @param E { shichu, numerology }
   */
  function build(birth, today, E) {
    var E2 = { shichu: E.shichu, numerology: E.numerology, today: today };
    var n = natal(birth, E2);
    var t = dayLuck(n.sh, today, E2);
    var num = E.numerology.calculateNumerology(birth, { targetYear: today.year });
    var pm = (num.personalMonths.filter(function (x) { return x.month === today.month; })[0] || {}).personalMonth || 0;
    t.luckyNumber = reduce(reduce(pm) + today.day);
    var week = [];
    for (var i = 0; i < 7; i++) week.push(dayLuck(n.sh, addDays(today, i), E2));
    delete n.sh;
    return { natal: n, today: t, week: week };
  }

  return { build: build, TYPES: TYPES, DAY: DAY, LEVELS: LEVELS, POWER: POWER, LP: LP, addDays: addDays };
});
