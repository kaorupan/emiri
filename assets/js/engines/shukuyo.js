/*
 * 宿曜占星術 エンジン（計算のみ・DOM操作なし・文章なし）
 *
 * ■ えみりが採用する方式
 *   1. 生まれた日を旧暦に直す（core/kyureki.js。日本時間・天保暦の規則）。
 *   2. 本命宿：旧暦の各月の1日に決まった宿（1月＝室、2月＝奎、3月＝胃、4月＝畢、5月＝参、6月＝鬼、7月＝張、
 *      8月＝角、9月＝氐、10月＝心、11月＝斗、12月＝虚）を当て、以後1日ごとに27宿を順に進める（牛宿は使わない）。
 *      閏月は、同じ番号の月（閏の前の月）と同じ宿から始める。
 *   3. 27宿の並び：昴・畢・觜・参・井・鬼・柳・星・張・翼・軫・角・亢・氐・房・心・尾・箕・斗・女・虚・危・室・壁・奎・婁・胃。
 *   4. 相性（三九の秘法）：自分の宿から相手の宿まで並びの順に数えた数で決める。
 *      0＝命、9＝業、18＝胎、それ以外は 1〜8・10〜17・19〜26 がそれぞれ 栄・衰・安・危・成・壊・友・親 の順。
 *      距離：1〜4・23〜26＝近距離、5〜8・19〜22＝中距離、10〜17＝遠距離。
 *   5. 日の宿：その日の旧暦の日付から同じ規則で求めた宿。本命宿との関係から、その日の巡りを読む。
 *   6. 旧暦の新月が日付の変わり目のすぐ近く（およそ5分以内）にある月は、1日ずれる可能性を nearEdge で返す。
 *
 * ブラウザでは window.KaruteEngines.shukuyo、Node では module.exports で使える。
 */
(function (root, factory) {
  if (typeof module === "object" && module.exports) {
    module.exports = factory(require("../core/kyureki.js"));
  } else {
    root.KaruteEngines = root.KaruteEngines || {};
    root.KaruteEngines.shukuyo = factory(root.Karute.kyureki);
  }
})(typeof self !== "undefined" ? self : this, function (kyureki) {
  "use strict";

  var SHUKU = ["昴", "畢", "觜", "参", "井", "鬼", "柳", "星", "張", "翼", "軫", "角", "亢", "氐", "房", "心", "尾", "箕", "斗", "女", "虚", "危", "室", "壁", "奎", "婁", "胃"];
  var READINGS = ["ぼう", "ひつ", "し", "しん", "せい", "き", "りゅう", "せい", "ちょう", "よく", "しん", "かく", "こう", "てい", "ぼう", "しん", "び", "き", "と", "じょ", "きょ", "き", "しつ", "へき", "けい", "ろう", "い"];
  // 旧暦の各月1日の宿（1月〜12月）
  var MONTH_START = { 1: 22, 2: 24, 3: 26, 4: 1, 5: 3, 6: 5, 7: 8, 8: 11, 9: 13, 10: 15, 11: 18, 12: 20 };
  var RELATIONS = ["栄", "衰", "安", "危", "成", "壊", "友", "親"];
  var PAIRS = { "命": "命", "業": "業胎", "胎": "業胎", "栄": "栄親", "親": "栄親", "友": "友衰", "衰": "友衰", "安": "安壊", "壊": "安壊", "危": "危成", "成": "危成" };

  function mod(n, m) { return ((n % m) + m) % m; }

  function shukuIndex(lunarMonth, lunarDay) { return mod(MONTH_START[lunarMonth] + lunarDay - 1, 27); }

  function shukuInfo(i) { return { index: i, name: SHUKU[i] + "宿", short: SHUKU[i], reading: READINGS[i] + "しゅく" }; }

  // 自分の宿 a から見た、相手の宿 b の関係
  function relation(a, b) {
    var o = mod(b - a, 27);
    var type, distance = null;
    if (o === 0) type = "命";
    else if (o === 9) type = "業";
    else if (o === 18) type = "胎";
    else {
      type = RELATIONS[o % 9 - 1];
      distance = (o <= 4 || o >= 23) ? "近" : (o <= 8 || o >= 19) ? "中" : "遠";
    }
    return { offset: o, type: type, pair: PAIRS[type], distance: distance };
  }

  function shukuOfDate(y, m, d) {
    var k = kyureki.fromGregorian(y, m, d);
    return { lunar: k, shuku: shukuInfo(shukuIndex(k.month, k.day)) };
  }

  /**
   * 宿曜占星術の個人判定
   * @param {{year:number, month:number, day:number}} birth 日本時間の暦日
   */
  function calculateShukuyo(birth) {
    var y = Number(birth.year), m = Number(birth.month), d = Number(birth.day);
    var s = shukuOfDate(y, m, d);
    var me = s.shuku.index;
    var all = SHUKU.map(function (_, i) {
      var r = relation(me, i);
      return { shuku: shukuInfo(i), type: r.type, pair: r.pair, distance: r.distance, offset: r.offset };
    });
    return {
      input: { year: y, month: m, day: d },
      lunar: s.lunar,
      honmei: s.shuku,
      relations: all,
      nearEdge: s.lunar.nearEdge,
      alternatives: s.lunar.nearEdge ? [shukuInfo(mod(me - 1, 27)), shukuInfo(mod(me + 1, 27))] : null
    };
  }

  /**
   * ある日の宿と、本命宿から見たその日の関係（日運）
   */
  function dayFortune(honmeiIndex, date) {
    var s = shukuOfDate(date.year, date.month, date.day);
    var r = relation(honmeiIndex, s.shuku.index);
    return { date: date, lunar: s.lunar, shuku: s.shuku, type: r.type, distance: r.distance };
  }

  return {
    SHUKU: SHUKU,
    RELATIONS: RELATIONS,
    MONTH_START: MONTH_START,
    shukuIndex: shukuIndex,
    shukuInfo: shukuInfo,
    shukuOfDate: shukuOfDate,
    relation: relation,
    calculateShukuyo: calculateShukuyo,
    dayFortune: dayFortune
  };
});
