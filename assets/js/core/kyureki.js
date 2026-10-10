/*
 * 旧暦（太陰太陽暦）の計算（DOM操作なし）
 *
 * ■ えみりが採用する方式（現在の日本で「旧暦」と呼ばれている天保暦の規則にならう）
 *   1. 日付・時刻は日本時間。新月（朔）の瞬間を含む日を、その月の1日とする。
 *   2. 中気（太陽黄経が30°の倍数になる時刻）を含む月に月の番号をつける。
 *      雨水（330°）を含む月が1月、春分（0°）が2月、…、冬至（270°）を含む月が11月。
 *   3. 冬至を含む月（11月）から次の冬至を含む月までが13か月ある年は、その間で最初に中気を含まない月を閏月とする。
 *      （いわゆる「2033年問題」は、この規則で閏11月になり、日本カレンダー暦文化振興協会の推奨と同じ）
 *   4. 新月・中気の時刻は core/astro.js の高精度式（国立天文台の値とおよそ1分以内）。
 *      日付の変わり目のすぐ近くで新月・中気が起きる日は、計算の誤差で1日ずれる可能性がある（nearEdge で返す）。
 *
 * ブラウザでは window.Karute.kyureki、Node では module.exports で使える。
 */
(function (root, factory) {
  if (typeof module === "object" && module.exports) {
    module.exports = factory(require("./astro.js"));
  } else {
    root.Karute = root.Karute || {};
    root.Karute.kyureki = factory(root.Karute.astro);
  }
})(typeof self !== "undefined" ? self : this, function (astro) {
  "use strict";

  var JST = 9 / 24;
  var SYNODIC = 29.530588861;
  var EDGE_MINUTES = 5; // 日付の変わり目からこの分数以内の新月・中気は「境目に近い」とする
  var ROKUYO = ["大安", "赤口", "先勝", "友引", "先負", "仏滅"];
  var cache = {};

  function mod(n, m) { return ((n % m) + m) % m; }

  // 世界時のユリウス日 → 日本時間の暦日の通日（整数）
  function jstDay(jd) { return Math.floor(jd + 0.5 + JST); }
  function minutesFromEdge(jd) {
    var f = (jd + 0.5 + JST) - Math.floor(jd + 0.5 + JST);
    return Math.min(f, 1 - f) * 1440;
  }

  function newMoonUt(k) {
    var jde = astro.newMoonJd(k);
    return jde - astro.deltaT(astro.jstDateFromJulianDay(jde).year) / 86400;
  }

  // 日本時間の暦日 → 通日
  function dayNumberOf(y, m, d) { return Math.floor(astro.julianDay(y, m, d) + 0.5); }

  // 通日 n を含む朔望月の番号 k（その月の1日 ≦ n ＜ 次の月の1日）
  function lunationOfDay(n) {
    var k = Math.floor((n - 0.5 - JST - 2451550.09766) / SYNODIC);
    for (var i = 0; i < 6; i++) {
      if (jstDay(newMoonUt(k)) > n) k -= 1;
      else if (jstDay(newMoonUt(k + 1)) <= n) k += 1;
      else return k;
    }
    return k;
  }

  // 冬至（黄経270°）の時刻：year 年12月ごろ
  function winterSolstice(year) { return astro.solarLongitudeCrossing(270, astro.julianDay(year, 12, 21.5)); }

  /*
   * year 年の冬至を含む月から、翌年の冬至を含む月の前までの月の並び
   * [{ k, start(通日), month, leap, chuki:[{longitude, jd}] }]
   */
  function monthsFromSolstice(year) {
    if (cache[year]) return cache[year];
    var ws1 = winterSolstice(year), ws2 = winterSolstice(year + 1);
    var k1 = lunationOfDay(jstDay(ws1)), k2 = lunationOfDay(jstDay(ws2));
    var count = k2 - k1;
    var list = [];
    for (var k = k1; k < k2; k++) {
      var start = jstDay(newMoonUt(k)), next = jstDay(newMoonUt(k + 1));
      var nm = newMoonUt(k);
      list.push({ k: k, start: start, end: next, newMoon: nm, chuki: [] });
    }
    // 中気を各月に割り当てる
    var jd = ws1;
    for (var i = 0; i < 14; i++) {
      var lon = mod(270 + 30 * i, 360);
      var t = i === 0 ? ws1 : astro.solarLongitudeCrossing(lon, jd + 30.44);
      jd = t;
      var dn = jstDay(t);
      for (var j = 0; j < list.length; j++) {
        if (dn >= list[j].start && dn < list[j].end) { list[j].chuki.push({ longitude: lon, jd: t }); break; }
      }
    }
    var leapDone = count !== 13;
    var month = 11;
    list.forEach(function (m, idx) {
      if (idx === 0) { m.month = 11; m.leap = false; return; }
      if (!leapDone && m.chuki.length === 0) {
        m.month = month; m.leap = true; leapDone = true; return;
      }
      month = month % 12 + 1;
      m.month = month; m.leap = false;
    });
    cache[year] = list;
    return list;
  }

  /**
   * 新暦（日本時間の暦日）→ 旧暦
   * @returns {{ year, month, day, leap, monthLength, rokuyo, nearEdge }}
   *   year は旧暦の年（1月1日から数える）。nearEdge は、その月の1日を決める新月が日付の変わり目に近い場合 true
   */
  function fromGregorian(y, m, d) {
    var n = dayNumberOf(y, m, d);
    var list = null, solYear = null;
    for (var yy = y - 1; yy <= y; yy++) {
      var l = monthsFromSolstice(yy);
      if (n >= l[0].start && n < l[l.length - 1].end) { list = l; solYear = yy; }
    }
    if (!list) throw new Error("旧暦の計算範囲外です");
    var mo = null, firstJan = list.length;
    for (var i = 0; i < list.length; i++) {
      if (n >= list[i].start && n < list[i].end) mo = list[i];
      if (list[i].month === 1 && !list[i].leap && firstJan === list.length) firstJan = i;
    }
    var lunarYear = list.indexOf(mo) < firstJan ? solYear : solYear + 1;
    var day = n - mo.start + 1;
    var near = minutesFromEdge(mo.newMoon) < EDGE_MINUTES ||
      (list.indexOf(mo) + 1 < list.length ? minutesFromEdge(list[list.indexOf(mo) + 1].newMoon) < EDGE_MINUTES : false);
    return {
      year: lunarYear,
      month: mo.month,
      day: day,
      leap: mo.leap,
      monthLength: mo.end - mo.start,
      rokuyo: ROKUYO[mod(mo.month + day, 6)],
      nearEdge: near
    };
  }

  function label(k) {
    return k.year + "年" + (k.leap ? "閏" : "") + k.month + "月" + k.day + "日";
  }

  return {
    ROKUYO: ROKUYO,
    fromGregorian: fromGregorian,
    monthsFromSolstice: monthsFromSolstice,
    label: label
  };
});
