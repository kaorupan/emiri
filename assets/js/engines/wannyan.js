/*
 * 星のわんにゃん占い エンジン（判定のみ・DOM操作なし）
 *
 * 星獣カルテと同じ天体の動きで、96タイプのどれかを決める。
 *   太陽の視黄経（日本時間のその日の終わり）→ 季節（4）と、その前半・後半（8つの時期）
 *   月（その日の正午）が新月から次の新月までのどこにあるか → 月のリズム（3）と、月の形（12）
 *   星獣（季節 × 月のリズム）の8タイプのうち、[前半の月の形の1・2番目]＝犬、[3・4番目]＝猫
 * 生まれた日の元素：四柱推命の日干の五行（甲乙＝木、丙丁＝火、戊己＝土、庚辛＝金、壬癸＝水）
 *
 * ブラウザでは window.KaruteEngines.wannyan、Node では module.exports。
 */
(function (root, factory) {
  if (typeof module === "object" && module.exports) {
    module.exports = factory(require("../core/astro.js"), require("./seiju.js"), require("../content/seiju-types.js"), require("../content/wannyan-data.js"), require("../content/seiju-data.js"));
  } else {
    root.KaruteEngines = root.KaruteEngines || {};
    root.KaruteEngines.wannyan = factory(root.Karute.astro, root.KaruteEngines.seiju, root.KaruteContent.seijuTypes, root.KaruteContent.wannyan, root.KaruteContent.seijuData);
  }
})(typeof self !== "undefined" ? self : this, function (astro, seiju, types, data, seijuData) {
  "use strict";

  var ELEMENT_OF_STEM = ["木", "木", "火", "火", "土", "土", "金", "金", "水", "水"];
  var STEMS = "甲乙丙丁戊己庚辛壬癸";
  var NEAR_DAYS = 0.5;

  var beastById = {};
  (Array.isArray(seijuData.BEASTS) ? seijuData.BEASTS : Object.keys(seijuData.BEASTS).map(function (k) { return seijuData.BEASTS[k]; }))
    .forEach(function (b) { beastById[b.id] = b; });

  // 96タイプの一覧（星獣の順、各8タイプ）
  var TYPES = [];
  var bySlug = {};
  Object.keys(seiju.BEAST_GRID).forEach(function (season) {
    seiju.MOON_PHASES.forEach(function (rhythm) {
      var beastId = seiju.BEAST_GRID[season][rhythm];
      var periods = types.PERIODS.filter(function (p) { return p.season === season; });
      var moons = types.MOONS.filter(function (m) { return m.rhythm === rhythm; });
      var slots = [[0, 0], [0, 1], [1, 0], [1, 1], [0, 2], [0, 3], [1, 2], [1, 3]];
      data.RAW[beastId].forEach(function (r, i) {
        var t = {
          slug: r[0], kind: r[1], adj: r[2], breed: r[3], name: r[2] + r[3], motto: r[4],
          persona: r[5], strength: r[6], weakness: r[7], love: r[8], work: r[9],
          beastId: beastId, beastName: beastById[beastId].name, group: data.GROUPS[beastId],
          period: periods[slots[i][0]], moon: moons[slots[i][1]], index: TYPES.length
        };
        TYPES.push(t);
        bySlug[t.slug] = t;
      });
    });
  });

  function slotOf(period, moon) {
    var pos = moon.n % 4, half = period.half - 1;
    return pos < 2 ? half * 2 + pos : 4 + half * 2 + (pos - 2);
  }
  function typeFor(lon, fraction) {
    var season = seiju.seasonFromLongitude(lon);
    var rhythm = seiju.moonPhaseFromFraction(fraction);
    var beastId = seiju.beastFor(season, rhythm);
    var period = types.periodFromLongitude(lon);
    var moon = types.moonFromFraction(fraction);
    var list = TYPES.filter(function (t) { return t.beastId === beastId; });
    return list[slotOf(period, moon)];
  }

  function dayStemIndex(y, m, d) {
    var jd = Math.floor(astro.julianDayJst(y, m, d, 12) + 0.5);
    return ((jd - 1) % 10 + 10) % 10;
  }

  function calculateWannyan(birth) {
    var y = Number(birth.year), m = Number(birth.month), d = Number(birth.day);
    if (!Number.isInteger(y) || !Number.isInteger(m) || !Number.isInteger(d)) throw new Error("生年月日が正しくありません");
    var noonJd = astro.julianDayJst(y, m, d, 12);
    var lon = astro.sunLongitude(noonJd + 0.5);
    var lun = astro.lunation(noonJd);
    var type = typeFor(lon, lun.fraction);
    var stem = dayStemIndex(y, m, d);
    // 境目に近いか（太陽は1日に約1°、月の形は約2.5日ごとに変わる）
    var lonPos = (((lon - 315) % 45) + 45) % 45;
    var nearPeriod = Math.min(lonPos, 45 - lonPos) < NEAR_DAYS;
    var mPos = (lun.fraction * 12) % 1;
    var nearMoon = Math.min(mPos, 1 - mPos) * lun.length / 12 < NEAR_DAYS;
    var neighbors = [];
    if (nearPeriod || nearMoon) {
      [-1, 1].forEach(function (dd) {
        var t = typeFor(astro.sunLongitude(noonJd + 0.5 + dd * 0.5), astro.lunation(noonJd + dd * 0.5).fraction);
        if (t !== type && neighbors.indexOf(t) < 0) neighbors.push(t);
      });
    }
    return {
      input: { year: y, month: m, day: d },
      type: type,
      element: { stem: STEMS.charAt(stem), name: ELEMENT_OF_STEM[stem] },
      moonAge: Math.round(lun.age * 10) / 10,
      sunLongitude: Math.round(lon * 100) / 100,
      nearBoundary: neighbors.length > 0,
      neighbors: neighbors,
      precision: astro.isVerifiedYear(y) ? "verified" : "estimated"
    };
  }

  return { TYPES: TYPES, bySlug: bySlug, calculateWannyan: calculateWannyan, typeFor: typeFor, dayStemIndex: dayStemIndex };
});
