/*
 * ホロスコープ（西洋占星術）エンジン（計算のみ・DOM操作なし・文章なし）
 *
 * ■ えみりが採用する方式
 *   1. 星座：トロピカル方式（春分点を牡羊座0°とする、日本の占いで一般的な方式）。12星座は30°ずつ。
 *   2. 天体：太陽・月・水星・金星・火星・木星・土星・天王星・海王星・冥王星の10天体。
 *      地球から見た、その日の春分点にもとづく視黄経（光行差・章動を含む）。
 *      計算は astronomy-engine 2.1.19（MIT License、assets/js/vendor/）を使う。
 *   3. 時刻：日本時間。出生時刻がない場合は正午で計算し、その日のうちに星座が変わる天体（とくに月）は
 *      「時刻によって変わる可能性」として、0時と24時の星座を返す（mayChange）。
 *   4. 逆行：前後12時間の黄経の変化から判定（太陽・月は逆行しない）。
 *   5. アスペクト：太陽〜土星の7天体どうしの主要アスペクト（0°・60°・90°・120°・180°）。
 *      オーブ（許容範囲）は合・衝 8°、トライン・スクエア 7°、セクスタイル 5°。
 *   6. エレメント（火・地・風・水）とクオリティ（活動・不動・柔軟）：太陽〜土星の7天体で数える
 *      （太陽と月は2つ分として数える）。
 *   7. 出生地を使うアセンダント（上昇星座）とハウスは、この無料版では扱わない。
 *
 * ブラウザでは window.KaruteEngines.horoscope、Node では module.exports で使える。
 */
(function (root, factory) {
  if (typeof module === "object" && module.exports) {
    module.exports = factory(require("../vendor/astronomy-engine-2.1.19.min.js"));
  } else {
    root.KaruteEngines = root.KaruteEngines || {};
    root.KaruteEngines.horoscope = factory(root.Astronomy);
  }
})(typeof self !== "undefined" ? self : this, function (A) {
  "use strict";

  var SIGNS = [
    { name: "牡羊座", element: "火", quality: "活動" }, { name: "牡牛座", element: "地", quality: "不動" },
    { name: "双子座", element: "風", quality: "柔軟" }, { name: "蟹座", element: "水", quality: "活動" },
    { name: "獅子座", element: "火", quality: "不動" }, { name: "乙女座", element: "地", quality: "柔軟" },
    { name: "天秤座", element: "風", quality: "活動" }, { name: "蠍座", element: "水", quality: "不動" },
    { name: "射手座", element: "火", quality: "柔軟" }, { name: "山羊座", element: "地", quality: "活動" },
    { name: "水瓶座", element: "風", quality: "不動" }, { name: "魚座", element: "水", quality: "柔軟" }
  ];
  var PLANETS = [
    { key: "sun", body: "Sun", name: "太陽" }, { key: "moon", body: "Moon", name: "月" },
    { key: "mercury", body: "Mercury", name: "水星" }, { key: "venus", body: "Venus", name: "金星" },
    { key: "mars", body: "Mars", name: "火星" }, { key: "jupiter", body: "Jupiter", name: "木星" },
    { key: "saturn", body: "Saturn", name: "土星" }, { key: "uranus", body: "Uranus", name: "天王星" },
    { key: "neptune", body: "Neptune", name: "海王星" }, { key: "pluto", body: "Pluto", name: "冥王星" }
  ];
  var ASPECTS = [
    { key: "conjunction", name: "合（コンジャンクション）", angle: 0, orb: 8 },
    { key: "sextile", name: "セクスタイル", angle: 60, orb: 5 },
    { key: "square", name: "スクエア", angle: 90, orb: 7 },
    { key: "trine", name: "トライン", angle: 120, orb: 7 },
    { key: "opposition", name: "衝（オポジション）", angle: 180, orb: 8 }
  ];
  var PERSONAL = ["sun", "moon", "mercury", "venus", "mars", "jupiter", "saturn"];
  var JST_MS = 9 * 3600 * 1000;

  function mod(n, m) { return ((n % m) + m) % m; }

  function timeOf(y, m, d, hour, minute) {
    var date = new Date(Date.UTC(y, m - 1, d, hour, minute) - JST_MS);
    if (y < 100) date.setUTCFullYear(y);
    return A.MakeTime(date);
  }

  function longitude(body, t) {
    if (body === "Sun") return A.SunPosition(t).elon;
    if (body === "Moon") return A.EclipticGeoMoon(t).lon;
    return A.Ecliptic(A.GeoVector(body, t, true)).elon;
  }

  function signIndex(lon) { return Math.floor(mod(lon, 360) / 30); }

  function position(p, lon, retro) {
    var s = signIndex(lon);
    var deg = mod(lon, 360) - s * 30;
    return {
      key: p.key, name: p.name, longitude: mod(lon, 360), signIndex: s, sign: SIGNS[s].name,
      degree: Math.floor(deg), minute: Math.floor((deg - Math.floor(deg)) * 60), retrograde: retro
    };
  }

  function normalizeTime(time) {
    if (time == null || time === "") return null;
    var mt = /^(\d{1,2}):(\d{2})$/.exec(String(time).trim());
    var h, mi;
    if (mt) { h = Number(mt[1]); mi = Number(mt[2]); } else if (typeof time === "object") { h = Number(time.hour); mi = Number(time.minute); }
    if (!(h >= 0 && h <= 23 && mi >= 0 && mi <= 59)) throw new Error("時刻が正しくありません");
    return { hour: h, minute: mi };
  }

  /**
   * ある日時の10天体の位置
   * @param {{year, month, day, time?}} birth 日本時間
   */
  function calculateHoroscope(birth) {
    var y = Number(birth.year), m = Number(birth.month), d = Number(birth.day);
    var time = normalizeTime(birth.time);
    var t = time ? timeOf(y, m, d, time.hour, time.minute) : timeOf(y, m, d, 12, 0);
    var dayStart = timeOf(y, m, d, 0, 0), dayEnd = dayStart.AddDays(1);
    var planets = PLANETS.map(function (p) {
      var lon = longitude(p.body, t);
      var retro = false;
      if (p.key !== "sun" && p.key !== "moon") {
        var before = longitude(p.body, t.AddDays(-0.5)), after = longitude(p.body, t.AddDays(0.5));
        retro = mod(after - before + 180, 360) - 180 < 0;
      }
      var pos = position(p, lon, retro);
      if (!time) {
        var s0 = signIndex(longitude(p.body, dayStart)), s1 = signIndex(longitude(p.body, dayEnd));
        if (s0 !== s1) pos.mayChange = { from: SIGNS[s0].name, to: SIGNS[s1].name };
      }
      return pos;
    });
    var byKey = {};
    planets.forEach(function (p) { byKey[p.key] = p; });

    var aspects = [];
    for (var i = 0; i < PERSONAL.length; i++) for (var j = i + 1; j < PERSONAL.length; j++) {
      var a = byKey[PERSONAL[i]], b = byKey[PERSONAL[j]];
      var asp = aspectBetween(a.longitude, b.longitude);
      if (asp) aspects.push({ a: a.key, b: b.key, aName: a.name, bName: b.name, aspect: asp.key, aspectName: asp.name, orb: asp.orb });
    }

    var elements = { "火": 0, "地": 0, "風": 0, "水": 0 }, qualities = { "活動": 0, "不動": 0, "柔軟": 0 };
    PERSONAL.forEach(function (k) {
      var w = k === "sun" || k === "moon" ? 2 : 1;
      var s = SIGNS[byKey[k].signIndex];
      elements[s.element] += w; qualities[s.quality] += w;
    });

    return {
      input: { year: y, month: m, day: d, time: time },
      hasTime: !!time,
      planets: planets,
      byKey: byKey,
      aspects: aspects,
      elements: elements,
      qualities: qualities,
      mayChange: planets.filter(function (p) { return p.mayChange; }).map(function (p) { return p.key; })
    };
  }

  // 2つの黄経のアスペクト（いちばん近いもの）
  function aspectBetween(l1, l2) {
    var diff = Math.abs(mod(l1 - l2 + 180, 360) - 180);
    var best = null;
    ASPECTS.forEach(function (as) {
      var o = Math.abs(diff - as.angle);
      if (o <= as.orb && (!best || o < best.orb)) best = { key: as.key, name: as.name, orb: Math.round(o * 10) / 10 };
    });
    return best;
  }

  /**
   * 今日（日本時間）の天体の星座：年運に使う木星・土星など
   */
  function transits(date) {
    var t = timeOf(date.year, date.month, date.day, 12, 0);
    return PLANETS.map(function (p) {
      var lon = longitude(p.body, t);
      var before = longitude(p.body, t.AddDays(-0.5)), after = longitude(p.body, t.AddDays(0.5));
      return position(p, lon, p.key !== "sun" && p.key !== "moon" && mod(after - before + 180, 360) - 180 < 0);
    }).reduce(function (o, p) { o[p.key] = p; return o; }, {});
  }

  function ensure(x) { return x && x.planets ? x : calculateHoroscope(x); }

  /**
   * 相性（シナストリー）：ふたりの天体どうしのアスペクトと、太陽・月の星座のエレメント
   */
  function calculateHoroscopeCompatibility(a, b) {
    var ra = ensure(a), rb = ensure(b);
    var pairs = [
      ["sun", "sun"], ["moon", "moon"], ["sun", "moon"], ["moon", "sun"],
      ["venus", "mars"], ["mars", "venus"], ["venus", "venus"], ["mercury", "mercury"], ["sun", "venus"], ["venus", "sun"], ["moon", "venus"], ["venus", "moon"]
    ];
    var aspects = [];
    pairs.forEach(function (pr) {
      var p1 = ra.byKey[pr[0]], p2 = rb.byKey[pr[1]];
      var asp = aspectBetween(p1.longitude, p2.longitude);
      if (asp) aspects.push({ you: pr[0], partner: pr[1], youName: p1.name, partnerName: p2.name, aspect: asp.key, aspectName: asp.name, orb: asp.orb });
    });
    function rel(x, y) {
      var ex = SIGNS[x].element, ey = SIGNS[y].element;
      if (x === y) return "same";
      if (ex === ey) return "sameElement";
      var pairsOk = { "火風": 1, "風火": 1, "地水": 1, "水地": 1 };
      if (pairsOk[ex + ey]) return "harmony";
      return "contrast";
    }
    return {
      person1: ra, person2: rb,
      sun: rel(ra.byKey.sun.signIndex, rb.byKey.sun.signIndex),
      moon: rel(ra.byKey.moon.signIndex, rb.byKey.moon.signIndex),
      aspects: aspects
    };
  }

  return {
    SIGNS: SIGNS,
    PLANETS: PLANETS,
    ASPECTS: ASPECTS,
    calculateHoroscope: calculateHoroscope,
    calculateHoroscopeCompatibility: calculateHoroscopeCompatibility,
    transits: transits,
    aspectBetween: aspectBetween,
    longitudeAt: function (body, y, m, d, h, mi) { return longitude(body, timeOf(y, m, d, h, mi)); }
  };
});
