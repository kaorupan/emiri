/*
 * 今日の運勢 エンジン（計算のみ・DOM操作なし・文章なし）
 *
 * ■ えみりが採用する方式
 *   1. 日付は日本時間の暦日。先発グレゴリオ暦。
 *   2. 日の干支：ユリウス通日から60日周期で求める（2000年1月1日＝戊午）。
 *   3. 日の九星（日家九星）：日本の暦で一般的な方式。
 *      - 冬至に最も近い甲子の日を一白として陽遁（一白→二黒→…と順に巡る）を始める。
 *      - 夏至に最も近い甲子の日を九紫として陰遁（九紫→八白→…と逆に巡る）を始める。
 *      - 冬至・夏至が甲午の日（どちらの甲子からも30日）のときは後の甲子をとる。
 *      - 切替日の間隔が240日になるときは、後の甲子の30日前（甲午）で切り替える（九星の閏）。
 *        冬至側では甲午が七赤（七赤が2日続く）、夏至側では甲午が三碧（三碧が2日続く）になる。
 *      - 冬至・夏至の日付は core/astro.js の高精度式で求めた日本時間の日付。
 *      ※ 冬至・夏至が癸巳の日に当たる年は、前の甲子をとる流派と後の甲子をとる流派がある。ここでは「最も近い」前の甲子。
 *   4. 九星のランキング：その日の盤（日盤）で、各本命星が回座する宮（同会する宮）から決める。
 *      宮の順位は RANKED_PALACES（巽・乾・震・兌・離・坤・艮・坎・中宮の順）。宮の意味づけは伝統的な象意、順位はえみりの読み方。
 *      あわせて、日の九星と本命星の五行の関係（比和・相生・相剋）を flow として返す（順位には使わない）。
 *   5. 12星座のランキング：日本時間の正午の月の位置（星座）が、各星座から数えて何番目のハウスにあるかで決める（ソーラーハウス）。
 *      ハウスの順位は RANKED_HOUSES（5・11・1・10・9・3・7・2・6・4・8・12の順）。順位はえみりの読み方。
 *      月はおよそ2日半で星座を移るため、その日のうちに次の星座へ移る時刻も返す。
 *   6. 今日誕生日の人：誕生日の数（バースデーナンバー）・誕生月と日の数（アティチュードナンバー）と、
 *      その月日に生まれた人の太陽星座（1950〜2025年の各年の正午で判定。年によって変わる日は両方を返す）。
 *
 * ブラウザでは window.KaruteEngines.daily、Node では module.exports で使える。
 */
(function (root, factory) {
  if (typeof module === "object" && module.exports) {
    module.exports = factory(require("../core/astro.js"), require("../content/kyusei-data.js"), require("./numerology.js"));
  } else {
    root.KaruteEngines = root.KaruteEngines || {};
    root.KaruteEngines.daily = factory(root.Karute.astro, root.KaruteContent.kyuseiData, root.KaruteEngines.numerology);
  }
})(typeof self !== "undefined" ? self : this, function (astro, kyuseiData, numerology) {
  "use strict";

  var STEMS = "甲乙丙丁戊己庚辛壬癸";
  var BRANCHES = "子丑寅卯辰巳午未申酉戌亥";
  var WEEKDAYS = "日月火水木金土";

  // 12星座（黄経0°の牡羊座から30°ごと）
  var SIGNS = [
    { id: "aries", name: "牡羊座" }, { id: "taurus", name: "牡牛座" }, { id: "gemini", name: "双子座" },
    { id: "cancer", name: "蟹座" }, { id: "leo", name: "獅子座" }, { id: "virgo", name: "乙女座" },
    { id: "libra", name: "天秤座" }, { id: "scorpio", name: "蠍座" }, { id: "sagittarius", name: "射手座" },
    { id: "capricorn", name: "山羊座" }, { id: "aquarius", name: "水瓶座" }, { id: "pisces", name: "魚座" }
  ];

  // 九宮：中宮から飛泊する順（中宮→乾→兌→艮→離→坎→坤→震→巽）
  var FLIGHT_ORDER = ["center", "ken", "da", "gon", "ri", "kan", "kon", "shin", "son"];
  var RANKED_PALACES = ["son", "ken", "shin", "da", "ri", "kon", "gon", "kan", "center"];
  var RANKED_HOUSES = [5, 11, 1, 10, 9, 3, 7, 2, 6, 4, 8, 12];

  var BIRTH_SIGN_YEARS = [1950, 2025];

  function mod(n, m) { return ((n % m) + m) % m; }

  function requireDate(d) {
    var y = Number(d && d.year), m = Number(d && d.month), day = Number(d && d.day);
    if (!Number.isInteger(y) || !Number.isInteger(m) || !Number.isInteger(day) || m < 1 || m > 12 || day < 1 || day > 31) {
      throw new Error("日付が正しくありません");
    }
    return { year: y, month: m, day: day };
  }

  // 日本時間の暦日 → 通日（ユリウス通日。正午で切り替わる天文学の通日ではなく、その暦日に対応する整数）
  function dayNumber(y, m, d) {
    return Math.round(astro.julianDay(y, m, d) + 0.5);
  }

  function dateFromDayNumber(n) {
    return astro.jstDateFromJulianDay(n - 0.5 - 9 / 24 + 0.5);
  }

  function sexagenaryIndex(n) { return mod(n + 49, 60); }

  function sexagenaryName(i) { return STEMS.charAt(i % 10) + BRANCHES.charAt(i % 12); }

  function solsticeDayNumber(year, longitude) {
    var t = astro.jstDateFromJulianDay(astro.solarLongitudeTime(year, longitude));
    return dayNumber(t.year, t.month, t.day);
  }

  // 冬至・夏至に最も近い甲子の日（甲午の日は後の甲子）
  function nearestKinoene(n) {
    var since = sexagenaryIndex(n);
    if (since === 0) return n;
    var until = 60 - since;
    return since < until ? n - since : n + until;
  }

  function switchAnchors(year) {
    var list = [];
    for (var y = year - 2; y <= year + 1; y++) {
      list.push({ dun: "yin", anchor: nearestKinoene(solsticeDayNumber(y, 90)) });
      list.push({ dun: "yang", anchor: nearestKinoene(solsticeDayNumber(y, 270)) });
    }
    return list.sort(function (a, b) { return a.anchor - b.anchor; });
  }

  /**
   * 日の九星
   * @returns {{number:number, dun:"yang"|"yin", leap:boolean, anchor:number}}
   */
  function dayStarOf(n, year) {
    var anchors = switchAnchors(year);
    for (var i = anchors.length - 1; i > 0; i--) {
      var cur = anchors[i], gap = cur.anchor - anchors[i - 1].anchor;
      if (gap !== 180 && gap !== 240) throw new Error("九星の切替日の間隔が想定外です：" + gap);
      var start = gap === 240 ? cur.anchor - 30 : cur.anchor;
      if (n >= start) {
        var k = mod(n - cur.anchor, 9);
        return { number: cur.dun === "yang" ? 1 + k : 9 - k, dun: cur.dun, leap: gap === 240 && n < cur.anchor, anchor: cur.anchor };
      }
    }
    throw new Error("九星の切替日が見つかりません");
  }

  // 日の九星の五行から見た、その人の本命星の五行との関係
  //   same：比和 / receive：日の星が生む（受け取る） / give：本人が日の星を生む（与える）
  //   pressed：日の星に抑えられる / lead：本人が日の星を抑える
  function elementFlow(dayElement, ownElement) {
    if (dayElement === ownElement) return "same";
    if (kyuseiData.GENERATES[dayElement] === ownElement) return "receive";
    if (kyuseiData.GENERATES[ownElement] === dayElement) return "give";
    if (kyuseiData.CONTROLS[dayElement] === ownElement) return "pressed";
    return "lead";
  }

  // 日盤で star が回座する宮
  function palaceOf(star, center) {
    return FLIGHT_ORDER[mod(star - center, 9)];
  }

  function signIndex(longitude) { return Math.floor(longitude / 30) % 12; }

  function jstTime(jd) {
    var t = astro.jstDateTimeFromJulianDay(jd);
    var minutes = Math.round((t.hour * 60 + t.minute + t.second / 60));
    return { hour: Math.floor(minutes / 60) % 24, minute: minutes % 60 };
  }

  function moonPhaseName(age) {
    if (age < 1.5) return "新月";
    if (age < 5.5) return "三日月";
    if (age < 9.5) return "上弦の月";
    if (age < 13.5) return "十三夜の月";
    if (age < 16.5) return "満月";
    if (age < 20.5) return "満月を過ぎた月";
    if (age < 24.5) return "下弦の月";
    return "有明の月";
  }

  function moonOf(y, m, d) {
    var dayStart = astro.julianDayJst(y, m, d, 0);
    var noon = dayStart + 0.5;
    var lon = astro.moonLongitude(noon);
    var sign = signIndex(lon);
    var startSign = signIndex(astro.moonLongitude(dayStart));
    var ingress = null;
    var boundary = (startSign + 1) * 30 % 360;
    var cross = astro.moonLongitudeCrossing(boundary, dayStart, 1);
    if (cross !== null && cross < dayStart + 1) {
      ingress = { sign: signIndex(boundary + 0.5), time: jstTime(cross) };
    }
    var lun = astro.lunation(noon);
    // 新月・満月の式は力学時（TT）なので、ΔT を引いて世界時にしてから日本時間にする
    var toUT = function (jdTT) { return jdTT - astro.deltaT(y) / 86400; };
    var events = [];
    [lun.previousNewMoon, lun.nextNewMoon].map(toUT).forEach(function (jd) {
      if (jd >= dayStart && jd < dayStart + 1) events.push({ kind: "new", time: jstTime(jd) });
    });
    var full = toUT(astro.fullMoonJd(lun.k));
    if (full >= dayStart && full < dayStart + 1) events.push({ kind: "full", time: jstTime(full) });
    return {
      longitude: lon, sign: sign, startSign: startSign, ingress: ingress,
      age: lun.age, ageText: (Math.round(lun.age * 10) / 10).toFixed(1), phase: moonPhaseName(lun.age),
      events: events
    };
  }

  function birthSigns(month, day) {
    var seen = {};
    var list = [];
    for (var y = BIRTH_SIGN_YEARS[0]; y <= BIRTH_SIGN_YEARS[1]; y++) {
      if (month === 2 && day === 29 && !(y % 4 === 0 && (y % 100 !== 0 || y % 400 === 0))) continue;
      var jd = astro.julianDayJst(y, month, day, 12);
      var s = signIndex(astro.apparentSunLongitudeUt(jd));
      if (!seen[s]) { seen[s] = 0; list.push(s); }
      seen[s]++;
    }
    var total = list.reduce(function (sum, s) { return sum + seen[s]; }, 0);
    return list.map(function (s) { return { sign: s, share: seen[s] / total }; })
      .sort(function (a, b) { return b.share - a.share; });
  }

  function birthdayOf(month, day) {
    return {
      month: month, day: day,
      birthday: numerology.birthdayNumber(day),
      attitude: numerology.attitudeNumber(month, day),
      signs: birthSigns(month, day)
    };
  }

  /**
   * @param {{year:number, month:number, day:number}} date  日本時間の暦日
   */
  function calculateDaily(date) {
    var d = requireDate(date);
    var n = dayNumber(d.year, d.month, d.day);
    var sx = sexagenaryIndex(n);
    var star = dayStarOf(n, d.year);

    var dayElement = kyuseiData.STARS[star.number].element;
    var kyusei = kyuseiData.STARS.filter(Boolean).map(function (s) {
      var palace = palaceOf(s.number, star.number);
      return { star: s.number, palace: palace, rank: RANKED_PALACES.indexOf(palace) + 1, flow: elementFlow(dayElement, s.element) };
    }).sort(function (a, b) { return a.rank - b.rank; });

    var moon = moonOf(d.year, d.month, d.day);
    var zodiac = SIGNS.map(function (s, i) {
      var house = mod(moon.sign - i, 12) + 1;
      return { sign: i, house: house, rank: RANKED_HOUSES.indexOf(house) + 1 };
    }).sort(function (a, b) { return a.rank - b.rank; });

    return {
      date: { year: d.year, month: d.month, day: d.day, weekday: mod(n + 1, 7), dayNumber: n },
      sexagenary: { index: sx, name: sexagenaryName(sx) },
      dayStar: star,
      kyusei: kyusei,
      moon: moon,
      zodiac: zodiac,
      birthday: birthdayOf(d.month, d.day),
      precision: astro.isVerifiedYear(d.year) ? "verified" : "estimated"
    };
  }

  function addDays(date, delta) {
    var d = requireDate(date);
    return dateFromDayNumber(dayNumber(d.year, d.month, d.day) + delta);
  }

  return {
    SIGNS: SIGNS,
    WEEKDAYS: WEEKDAYS,
    FLIGHT_ORDER: FLIGHT_ORDER,
    RANKED_PALACES: RANKED_PALACES,
    RANKED_HOUSES: RANKED_HOUSES,
    sexagenaryName: sexagenaryName,
    dayNumber: dayNumber,
    addDays: addDays,
    palaceOf: palaceOf,
    calculateDaily: calculateDaily
  };
});
