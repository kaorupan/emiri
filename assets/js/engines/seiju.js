/*
 * 星獣カルテ エンジン（判定のみ・DOM操作なし）
 *
 * 「人は、生まれた日にひとつの星獣を宿す。」
 * 星獣＝ 生まれた日の「太陽がつくる季節」（4つ）× 「月のリズム」（3つ）＝ 12
 *
 * 季節：太陽の視黄経で分ける（暦の上の季節）。日本時間のその日の終わり（24:00）の太陽で判定するので、
 *       「立春の日から春」という暦の感覚と一致する。
 *   芽吹き（春）：315°〜45°（立春〜立夏の前日）   陽ざし（夏）：45°〜135°（立夏〜立秋の前日）
 *   実り（秋）  ：135°〜225°（立秋〜立冬の前日） 静けさ（冬）：225°〜315°（立冬〜立春の前日）
 * 月：その日の正午（日本時間）が、新月から次の新月までのどこにあたるかを3等分で分ける。
 *   満ちゆく月：0〜1/3（新月〜上弦を少し過ぎたころ）
 *   満ちた月  ：1/3〜2/3（満月をはさむ時期。満月はほぼ中央の1/2にあたる）
 *   欠けゆく月：2/3〜1（満月を過ぎ、下弦を越えて次の新月の手前まで）
 *
 * 天文計算は core/astro.js（Meeus の近似式）。1800〜2100年を「確認済み」、それ以外は「推定」として返す。
 * 判定の方法は年代によって変えない（範囲外でも同じ式で計算し、精度の注意を付けるだけ）。
 *
 * ブラウザでは window.KaruteEngines.seiju、Node では module.exports で使える。
 */
(function (root, factory) {
  var astro;
  if (typeof module === "object" && module.exports) {
    astro = require("../core/astro.js");
    module.exports = factory(astro);
  } else {
    root.KaruteEngines = root.KaruteEngines || {};
    root.KaruteEngines.seiju = factory(root.Karute.astro);
  }
})(typeof self !== "undefined" ? self : this, function (astro) {
  "use strict";

  var SEASONS = ["spring", "summer", "autumn", "winter"];
  var MOON_PHASES = ["waxing", "full", "waning"];

  // 季節の始まりの太陽黄経（立春・立夏・立秋・立冬）
  var SEASON_START_LONGITUDE = { spring: 315, summer: 45, autumn: 135, winter: 225 };

  // 月のリズムの境目（朔望月の中での位置）
  var MOON_BOUNDARIES = [1 / 3, 2 / 3];

  // 季節 × 月のリズム → 星獣
  var BEAST_GRID = {
    spring: { waxing: "raiko-tiger", full: "yumewatari-rabbit", waning: "morimori-bear" },
    summer: { waxing: "enyoku-falcon", full: "hoshiumi-dolphin", waning: "soten-hawk" },
    autumn: { waxing: "ogon-lion", full: "daichi-deer", waning: "shirogane-fox" },
    winter: { waxing: "akatsuki-wolf", full: "tsukikage-cat", waning: "shinkai-owl" }
  };

  // 境目に近いとみなす時間（日）。出生時刻が分からないため、正午から半日以内は「境目に近い」と伝える
  var NEAR_BOUNDARY_DAYS = 0.5;

  function seasonFromLongitude(lon) {
    if (lon >= 315 || lon < 45) return "spring";
    if (lon < 135) return "summer";
    if (lon < 225) return "autumn";
    return "winter";
  }

  function moonPhaseFromFraction(f) {
    if (f < MOON_BOUNDARIES[0]) return "waxing";
    if (f < MOON_BOUNDARIES[1]) return "full";
    return "waning";
  }

  function requireBirth(b) {
    if (!b || typeof b !== "object") throw new TypeError("birth is required");
    ["year", "month", "day"].forEach(function (k) {
      if (typeof b[k] !== "number" || Math.floor(b[k]) !== b[k]) throw new TypeError(k + " must be an integer");
    });
    if (b.year < 1 || b.year > 9999) throw new RangeError("year out of range");
    if (b.month < 1 || b.month > 12 || b.day < 1 || b.day > 31) throw new RangeError("date out of range");
  }

  // その日（日本時間）の季節：日の終わり（24:00）の太陽で判定
  function seasonOfNoonJd(noonJd) {
    return seasonFromLongitude(astro.sunLongitude(noonJd + 0.5));
  }

  // 季節が始まった日と、次の季節が始まる日（どちらも日本時間の日付）
  function seasonSpan(noonJd, season) {
    var start = noonJd, guard = 0;
    while (seasonOfNoonJd(start - 1) === season && guard++ < 120) start -= 1;
    var next = noonJd; guard = 0;
    while (seasonOfNoonJd(next + 1) === season && guard++ < 120) next += 1;
    return { startDate: astro.jstDateFromJulianDay(start), nextSeasonStartDate: astro.jstDateFromJulianDay(next + 1) };
  }

  /**
   * calculateSeiju({ year, month, day })
   * @returns {{
   *   input, beast, season, moonPhase, precision: "verified"|"estimated",
   *   seasonDetail: { sunLongitude, startDate, nextSeasonStartDate, isStartDay },
   *   moonDetail: { age, fraction, lunationLength, previousNewMoonDate, nextNewMoonDate, nearBoundary, hoursToBoundary }
   * }}
   */
  function calculateSeiju(birth) {
    requireBirth(birth);
    var noonJd = astro.julianDayJst(birth.year, birth.month, birth.day, 12);

    var season = seasonOfNoonJd(noonJd);
    var span = seasonSpan(noonJd, season);

    var lun = astro.lunation(noonJd);
    var moonPhase = moonPhaseFromFraction(lun.fraction);
    // いちばん近い境目（0/1 も新月として含める）までの日数
    var boundaries = [0, MOON_BOUNDARIES[0], MOON_BOUNDARIES[1], 1];
    var nearestDays = Math.min.apply(null, boundaries.map(function (b) { return Math.abs(lun.fraction - b) * lun.length; }));
    // 0 と 1（新月）は満ちゆく月・欠けゆく月の境目
    var nearBoundary = nearestDays < NEAR_BOUNDARY_DAYS;

    return {
      input: { year: birth.year, month: birth.month, day: birth.day },
      beast: BEAST_GRID[season][moonPhase],
      season: season,
      moonPhase: moonPhase,
      precision: astro.isVerifiedYear(birth.year) ? "verified" : "estimated",
      seasonDetail: {
        sunLongitude: Math.round(astro.sunLongitude(noonJd + 0.5) * 100) / 100,
        startDate: span.startDate,
        nextSeasonStartDate: span.nextSeasonStartDate,
        isStartDay: span.startDate.year === birth.year && span.startDate.month === birth.month && span.startDate.day === birth.day
      },
      moonDetail: {
        age: Math.round(lun.age * 10) / 10,
        fraction: Math.round(lun.fraction * 1000) / 1000,
        lunationLength: Math.round(lun.length * 100) / 100,
        previousNewMoonDate: astro.jstDateFromJulianDay(lun.previousNewMoon),
        nextNewMoonDate: astro.jstDateFromJulianDay(lun.nextNewMoon),
        nearBoundary: nearBoundary,
        hoursToBoundary: Math.round(nearestDays * 24)
      }
    };
  }

  // ---- 相性 ----

  // 季節の関係：同じ／となり（季節がつながる）／向かい合う
  function seasonRelation(a, b) {
    var ia = SEASONS.indexOf(a), ib = SEASONS.indexOf(b);
    var d = (ib - ia + 4) % 4;
    if (d === 0) return { type: "same" };
    if (d === 2) return { type: "opposite" };
    // d===1：a の次の季節が b（a → b の流れ）。d===3：b → a の流れ
    return { type: "adjacent", earlier: d === 1 ? "person1" : "person2" };
  }

  // 月のリズムの関係：同じ／満ちた月がつなぐ／満ちゆく×欠けゆく（逆向き）
  function moonRelation(a, b) {
    if (a === b) return { type: "same" };
    if (a === "full" || b === "full") return { type: "bridge", fullSide: a === "full" ? "person1" : "person2" };
    return { type: "contrast" };
  }

  // 季節の関係 × 月の関係 → ふたりの相性の分類（言葉で返す。点数は付けない）
  var CATEGORY_TABLE = {
    same: { same: "resonance", bridge: "resonance", contrast: "pace" },
    adjacent: { same: "resonance", bridge: "complement", contrast: "pace" },
    opposite: { same: "complement", bridge: "stimulus", contrast: "stimulus" }
  };

  // 親密になるペース（月のリズム）と、気持ちの表し方（季節）
  var PACE = { waxing: "quick", full: "attuned", waning: "slow" };
  var EXPRESSION = { spring: "open", summer: "open", autumn: "reserved", winter: "reserved" };

  /**
   * calculateSeijuCompatibility(person1Birth, person2Birth)
   * 対称な項目（category, seasonRelation.type, moonRelation.type, sameBeast）は入れ替えても同じ。
   * 方向のある項目（どちらの季節が先か、満月側がどちらか、各自の視点）は person1/person2 で表す。
   */
  function calculateSeijuCompatibility(birth1, birth2) {
    var p1 = calculateSeiju(birth1);
    var p2 = calculateSeiju(birth2);
    var sr = seasonRelation(p1.season, p2.season);
    var mr = moonRelation(p1.moonPhase, p2.moonPhase);
    return {
      method: "karute-original",
      person1: p1,
      person2: p2,
      seasonRelation: sr,
      moonRelation: mr,
      sameBeast: p1.beast === p2.beast,
      category: CATEGORY_TABLE[sr.type][mr.type],
      intimacy: {
        pace: { person1: PACE[p1.moonPhase], person2: PACE[p2.moonPhase] },
        expression: { person1: EXPRESSION[p1.season], person2: EXPRESSION[p2.season] }
      }
    };
  }

  function beastFor(season, moonPhase) {
    return BEAST_GRID[season][moonPhase];
  }

  return {
    SEASONS: SEASONS,
    MOON_PHASES: MOON_PHASES,
    SEASON_START_LONGITUDE: SEASON_START_LONGITUDE,
    MOON_BOUNDARIES: MOON_BOUNDARIES,
    BEAST_GRID: BEAST_GRID,
    CATEGORY_TABLE: CATEGORY_TABLE,
    VERIFIED_YEAR_MIN: astro.VERIFIED_YEAR_MIN,
    VERIFIED_YEAR_MAX: astro.VERIFIED_YEAR_MAX,
    seasonFromLongitude: seasonFromLongitude,
    moonPhaseFromFraction: moonPhaseFromFraction,
    beastFor: beastFor,
    calculateSeiju: calculateSeiju,
    calculateSeijuCompatibility: calculateSeijuCompatibility
  };
});
