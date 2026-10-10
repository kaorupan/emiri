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
 *   7. 暦の吉日（選日）：節月（その月の節入りの日から次の節入りの前日まで。節入り当日は新しい月）と日の干支から求める。
 *      一粒万倍日：節月ごとの十二支（寅月＝丑・午、卯月＝酉・寅、辰月＝子・卯、巳月＝卯・辰、午月＝巳・午、未月＝酉・午、
 *        申月＝子・未、酉月＝卯・申、戌月＝酉・午、亥月＝酉・戌、子月＝亥・子、丑月＝子・卯）。
 *      天赦日：立春〜立夏前の戊寅、立夏〜立秋前の甲午、立秋〜立冬前の戊申、立冬〜立春前の甲子。
 *      寅の日・巳の日：日の十二支。己巳の日：日の干支が己巳。
 *   8. 二十四節気：太陽黄経15°ごとの時刻（astro.js の高精度式）。日付は日本時間。今日の節気と次の節気を返す。
 *   9. 次の新月・満月：日本時間の今日より後の最初の新月・満月の日時と、そのときの月の星座。
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

  // 二十四節気（太陽黄経 0°＝春分 から15°ごと）。setsu：月の区切りになる「節」なら、その節月の十二支（0＝子）
  var SOLAR_TERMS = [
    { lon: 0, name: "春分", reading: "しゅんぶん" }, { lon: 15, name: "清明", reading: "せいめい", setsu: 4 },
    { lon: 30, name: "穀雨", reading: "こくう" }, { lon: 45, name: "立夏", reading: "りっか", setsu: 5 },
    { lon: 60, name: "小満", reading: "しょうまん" }, { lon: 75, name: "芒種", reading: "ぼうしゅ", setsu: 6 },
    { lon: 90, name: "夏至", reading: "げし" }, { lon: 105, name: "小暑", reading: "しょうしょ", setsu: 7 },
    { lon: 120, name: "大暑", reading: "たいしょ" }, { lon: 135, name: "立秋", reading: "りっしゅう", setsu: 8 },
    { lon: 150, name: "処暑", reading: "しょしょ" }, { lon: 165, name: "白露", reading: "はくろ", setsu: 9 },
    { lon: 180, name: "秋分", reading: "しゅうぶん" }, { lon: 195, name: "寒露", reading: "かんろ", setsu: 10 },
    { lon: 210, name: "霜降", reading: "そうこう" }, { lon: 225, name: "立冬", reading: "りっとう", setsu: 11 },
    { lon: 240, name: "小雪", reading: "しょうせつ" }, { lon: 255, name: "大雪", reading: "たいせつ", setsu: 0 },
    { lon: 270, name: "冬至", reading: "とうじ" }, { lon: 285, name: "小寒", reading: "しょうかん", setsu: 1 },
    { lon: 300, name: "大寒", reading: "だいかん" }, { lon: 315, name: "立春", reading: "りっしゅん", setsu: 2 },
    { lon: 330, name: "雨水", reading: "うすい" }, { lon: 345, name: "啓蟄", reading: "けいちつ", setsu: 3 }
  ];

  // 一粒万倍日：節月の十二支 → その月に一粒万倍日となる日の十二支
  var ICHIRYU = { 2: [1, 6], 3: [9, 2], 4: [0, 3], 5: [3, 4], 6: [5, 6], 7: [9, 6], 8: [0, 7], 9: [3, 8], 10: [9, 6], 11: [9, 10], 0: [11, 0], 1: [0, 3] };
  // 天赦日：季節の始まり（立春・立夏・立秋・立冬の黄経）→ 日の干支（60干支の番号）
  var TENSHA = { 315: 14, 45: 30, 135: 44, 225: 0 };
  var KICHIJITSU_ORDER = ["tensha", "ichiryu", "tsuchinotomi", "tora", "mi"];

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
      if (jd >= dayStart && jd < dayStart + 1) events.push({ kind: "new", time: jstTime(jd), sign: signIndex(astro.moonLongitude(jd)) });
    });
    var full = toUT(astro.fullMoonJd(lun.k));
    if (full >= dayStart && full < dayStart + 1) events.push({ kind: "full", time: jstTime(full), sign: signIndex(astro.moonLongitude(full)) });
    return {
      longitude: lon, sign: sign, startSign: startSign, ingress: ingress,
      age: lun.age, ageText: (Math.round(lun.age * 10) / 10).toFixed(1), phase: moonPhaseName(lun.age),
      events: events
    };
  }

  var termCache = {};
  // year の前後を含む二十四節気の一覧（日本時間の日付つき、時刻順）
  function termsAround(year) {
    if (termCache[year]) return termCache[year];
    var list = [];
    for (var y = year - 1; y <= year + 1; y++) {
      SOLAR_TERMS.forEach(function (t) {
        var jd = astro.solarLongitudeTime(y, t.lon);
        var dt = astro.jstDateTimeFromJulianDay(jd);
        list.push({ term: t, jd: jd, dayNumber: dayNumber(dt.year, dt.month, dt.day), date: { year: dt.year, month: dt.month, day: dt.day }, time: jstTime(jd) });
      });
    }
    list.sort(function (a, b) { return a.jd - b.jd; });
    var seen = {};
    list = list.filter(function (x) { var k = Math.round(x.jd * 10); if (seen[k]) return false; seen[k] = true; return true; });
    termCache[year] = list;
    return list;
  }

  function koyomiOf(n, year, sx) {
    var list = termsAround(year);
    var current = null, next = null, setsu = null, season = null;
    for (var i = 0; i < list.length; i++) {
      var t = list[i];
      if (t.dayNumber <= n) {
        current = t;
        if (t.term.setsu !== undefined) setsu = t;
        if (TENSHA[t.term.lon] !== undefined) season = t;
      } else if (!next) { next = t; }
    }
    var branch = sx % 12;
    var kichi = [];
    if (season && TENSHA[season.term.lon] === sx) kichi.push("tensha");
    if (setsu && ICHIRYU[setsu.term.setsu].indexOf(branch) !== -1) kichi.push("ichiryu");
    if (sx === 5) kichi.push("tsuchinotomi");
    if (branch === 2) kichi.push("tora");
    if (branch === 5 && sx !== 5) kichi.push("mi");
    var pick = function (t) { return t && { name: t.term.name, reading: t.term.reading, lon: t.term.lon, date: t.date, time: t.time, inDays: t.dayNumber - n }; };
    return {
      kichijitsu: kichi.sort(function (a, b) { return KICHIJITSU_ORDER.indexOf(a) - KICHIJITSU_ORDER.indexOf(b); }),
      term: { current: pick(current), next: pick(next), today: current && current.dayNumber === n ? current.term.name : null },
      setsuMonthBranch: setsu ? setsu.term.setsu : null
    };
  }

  // 日本時間の暦日 n より後（翌日以降）の最初の新月・満月
  function nextMoons(n, year) {
    var dayEnd = astro.julianDayJst(dateFromDayNumber(n).year, dateFromDayNumber(n).month, dateFromDayNumber(n).day, 24);
    var toUT = function (jdTT) { return jdTT - astro.deltaT(year) / 86400; };
    var k = Math.floor((dayEnd - 2451550.09766) / 29.530588861) - 1;
    var found = { "new": null, full: null };
    for (var i = 0; i < 4 && (!found["new"] || !found.full); i++, k++) {
      [["new", astro.newMoonJd(k)], ["full", astro.fullMoonJd(k)]].forEach(function (e) {
        var jd = toUT(e[1]);
        if (jd >= dayEnd && !found[e[0]]) {
          var dt = astro.jstDateTimeFromJulianDay(jd);
          found[e[0]] = { date: { year: dt.year, month: dt.month, day: dt.day }, time: jstTime(jd), sign: signIndex(astro.moonLongitude(jd)), inDays: dayNumber(dt.year, dt.month, dt.day) - n };
        }
      });
    }
    return found;
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
      koyomi: koyomiOf(n, d.year, sx),
      nextMoon: nextMoons(n, d.year),
      precision: astro.isVerifiedYear(d.year) ? "verified" : "estimated"
    };
  }

  function addDays(date, delta) {
    var d = requireDate(date);
    return dateFromDayNumber(dayNumber(d.year, d.month, d.day) + delta);
  }

  return {
    SIGNS: SIGNS,
    SOLAR_TERMS: SOLAR_TERMS,
    termsAround: termsAround,
    dateFromDayNumber: dateFromDayNumber,
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
