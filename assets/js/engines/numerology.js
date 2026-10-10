/*
 * 数秘術エンジン（計算のみ・DOM操作なし）
 *
 * 旧 numerology-v11.html と統合版 latest-4systems-fixed.html の計算式をそのまま移植。
 * 監査でA判定だった式（LP/BD/AT/PY/PM/マスターナンバー）は変更していない。
 * 相性（calculateCompatibility）は統合版で追加された compatibilityEngine() を正本とする。
 * これは「数秘術の唯一の公式」ではなく「えみり独自の相性分析」。
 *
 * ブラウザでは window.KaruteEngines.numerology、Node では module.exports で使える。
 */
(function (root, factory) {
  var api = factory();
  if (typeof module === "object" && module.exports) {
    module.exports = api;
  } else {
    root.KaruteEngines = root.KaruteEngines || {};
    root.KaruteEngines.numerology = api;
  }
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";

  var MASTER_NUMBERS = [11, 22, 33];

  function digitSum(value) {
    return String(value)
      .replace(/\D/g, "")
      .split("")
      .reduce(function (sum, ch) { return sum + Number(ch); }, 0);
  }

  // 1桁になるまで各桁を足す。keepMaster=true なら 11/22/33 で止める。
  function reduceNumber(n, keepMaster) {
    if (keepMaster === undefined) keepMaster = true;
    while (n > 9) {
      if (keepMaster && MASTER_NUMBERS.indexOf(n) !== -1) return n;
      n = digitSum(n);
    }
    return n;
  }

  // ライフパス：生年月日の全桁を合計 → マスターナンバーを残して還元
  function lifePath(year, month, day) {
    return reduceNumber(digitSum(year) + digitSum(month) + digitSum(day), true);
  }

  // バースデー：生まれた日を還元（11・22は残す）
  function birthdayNumber(day) {
    return reduceNumber(day, true);
  }

  // アティチュード：誕生月＋誕生日（各桁の合計）を還元
  function attitudeNumber(month, day) {
    return reduceNumber(digitSum(month) + digitSum(day), true);
  }

  // パーソナルイヤー：誕生月日＋対象年。切替は1月1日。マスターナンバーは残さない
  function personalYear(month, day, targetYear) {
    return reduceNumber(digitSum(month) + digitSum(day) + digitSum(targetYear), false);
  }

  // パーソナルマンス：PY＋月。マスターナンバーは残さない
  function personalMonth(py, month) {
    return reduceNumber(py + month, false);
  }

  // 相性・文章用に 11→2, 22→4, 33→6 へ寄せる
  function coreNumber(n) {
    return n === 11 ? 2 : n === 22 ? 4 : n === 33 ? 6 : n;
  }

  function isMaster(n) {
    return MASTER_NUMBERS.indexOf(n) !== -1;
  }

  function requireInt(value, name) {
    if (typeof value !== "number" || !isFinite(value) || Math.floor(value) !== value) {
      throw new TypeError(name + " must be an integer");
    }
  }

  function checkBirth(birth) {
    if (!birth || typeof birth !== "object") throw new TypeError("birth is required");
    requireInt(birth.year, "year");
    requireInt(birth.month, "month");
    requireInt(birth.day, "day");
    if (birth.year < 1 || birth.year > 9999) throw new RangeError("year out of range");
    if (birth.month < 1 || birth.month > 12) throw new RangeError("month out of range");
    if (birth.day < 1 || birth.day > 31) throw new RangeError("day out of range");
  }

  /**
   * 個人の数秘術
   * @param {{year:number, month:number, day:number}} birth
   * @param {{targetYear:number}} options  パーソナルイヤーを出す年（呼び出し側が日本時間の今年を渡す）
   */
  function calculateNumerology(birth, options) {
    checkBirth(birth);
    var targetYear = options && options.targetYear;
    requireInt(targetYear, "targetYear");

    var lp = lifePath(birth.year, birth.month, birth.day);
    var bd = birthdayNumber(birth.day);
    var at = attitudeNumber(birth.month, birth.day);
    var py = personalYear(birth.month, birth.day, targetYear);
    var months = [];
    for (var m = 1; m <= 12; m++) {
      months.push({ month: m, personalMonth: personalMonth(py, m) });
    }

    return {
      input: { year: birth.year, month: birth.month, day: birth.day },
      targetYear: targetYear,
      lifePath: lp,
      birthday: bd,
      attitude: at,
      personalYear: py,
      personalMonths: months,
      core: { lifePath: coreNumber(lp), birthday: coreNumber(bd), attitude: coreNumber(at) },
      masterNumbers: {
        lifePath: isMaster(lp),
        birthday: isMaster(bd),
        attitude: isMaster(at)
      }
    };
  }

  // ---- 相性（えみり独自の分析） ----

  // 9×9 の相性基準表（対称）。旧 numerology-v11 から移植。
  var COMPATIBILITY_BASE = [
    [88, 82, 91, 77, 86, 80, 74, 89, 79],
    [82, 93, 84, 90, 78, 92, 86, 75, 91],
    [91, 84, 92, 76, 94, 83, 81, 87, 88],
    [77, 90, 76, 95, 72, 89, 88, 86, 84],
    [86, 78, 94, 72, 90, 80, 85, 88, 82],
    [80, 92, 83, 89, 80, 94, 87, 90, 93],
    [74, 86, 81, 88, 85, 87, 96, 79, 92],
    [89, 75, 87, 86, 88, 90, 79, 94, 83],
    [79, 91, 88, 84, 82, 93, 92, 83, 95]
  ];

  function clamp(v, min, max) {
    if (min === undefined) min = 60;
    if (max === undefined) max = 99;
    return Math.max(min, Math.min(max, v));
  }

  function matrix(a, b) {
    return COMPATIBILITY_BASE[a - 1][b - 1];
  }

  // 二人の月運が噛み合いやすい月（旧 detailedPairReading の計算部分）
  function relationshipMonths(py1, py2) {
    var months = [];
    for (var mo = 1; mo <= 12; mo++) {
      var p1 = personalMonth(py1, mo);
      var p2 = personalMonth(py2, mo);
      var energy = (p1 === p2 ? 3 : 0) +
        ([1, 3, 5, 6].indexOf(p1) !== -1 ? 2 : 0) +
        ([1, 3, 5, 6].indexOf(p2) !== -1 ? 2 : 0);
      months.push({ month: mo, energy: energy, personalMonth1: p1, personalMonth2: p2 });
    }
    var best = months.slice().sort(function (x, y) {
      return y.energy - x.energy || x.month - y.month;
    }).slice(0, 3).map(function (x) { return x.month; });
    return { months: months, bestMonths: best };
  }

  // 今年のふたりの関係テーマ（旧 detailedPairReading の分岐をそのまま移植）
  function relationshipYearTheme(py1, py2) {
    if ([1, 3, 5].indexOf(py1) !== -1 && [1, 3, 5].indexOf(py2) !== -1) return "moving";
    if ([2, 6].indexOf(py1) !== -1 || [2, 6].indexOf(py2) !== -1) return "nurturing";
    if (py1 === 9 || py2 === 9) return "sorting";
    return "understanding";
  }

  /**
   * 二人の相性（えみり独自の相性分析）
   * 旧 compatibilityEngine(y1,m1,d1,y2,m2,d2) と同じ計算。
   */
  function calculateCompatibility(birth1, birth2, options) {
    var p1 = calculateNumerology(birth1, options);
    var p2 = calculateNumerology(birth2, options);

    var c1 = p1.core.lifePath, c2 = p2.core.lifePath;
    var cb1 = p1.core.birthday, cb2 = p2.core.birthday;
    var ca1 = p1.core.attitude, ca2 = p2.core.attitude;

    var lp = matrix(c1, c2);
    var bd = matrix(cb1, cb2);
    var at = matrix(ca1, ca2);
    var rhythm = clamp(100 - Math.min(8, Math.abs(ca1 - ca2)) * 4 + ((c1 + c2) % 5) - 2);
    var year = clamp(100 - Math.min(8, Math.abs(coreNumber(p1.personalYear) - coreNumber(p2.personalYear))) * 4);

    var love = clamp(Math.round(lp * 0.34 + bd * 0.18 + at * 0.22 + rhythm * 0.20 + year * 0.06));
    var marriage = clamp(Math.round(lp * 0.28 + bd * 0.24 + at * 0.12 + rhythm * 0.16 + year * 0.20));
    var values = clamp(Math.round(lp * 0.32 + bd * 0.24 + at * 0.22 + rhythm * 0.12 + year * 0.10));
    var work = clamp(Math.round(lp * 0.25 + bd * 0.18 + at * 0.30 + rhythm * 0.12 + year * 0.15));
    var intimacy = clamp(Math.round(lp * 0.26 + bd * 0.16 + at * 0.20 + rhythm * 0.32 + year * 0.06));
    var total = clamp(Math.round(love * 0.27 + marriage * 0.24 + values * 0.20 + work * 0.12 + intimacy * 0.17));

    var rel = relationshipMonths(p1.personalYear, p2.personalYear);

    return {
      method: "karute-original",
      person1: p1,
      person2: p2,
      ingredients: { lifePath: lp, birthday: bd, attitude: at, rhythm: rhythm, year: year },
      scores: { love: love, marriage: marriage, values: values, work: work, intimacy: intimacy, total: total },
      idealOverlap: Math.round((lp + bd + at) / 3),
      yearTheme: relationshipYearTheme(p1.personalYear, p2.personalYear),
      bestMonths: rel.bestMonths,
      monthFlow: rel.months
    };
  }

  return {
    reduceNumber: reduceNumber,
    lifePath: lifePath,
    birthdayNumber: birthdayNumber,
    attitudeNumber: attitudeNumber,
    personalYear: personalYear,
    personalMonth: personalMonth,
    coreNumber: coreNumber,
    isMaster: isMaster,
    calculateNumerology: calculateNumerology,
    calculateCompatibility: calculateCompatibility,
    COMPATIBILITY_BASE: COMPATIBILITY_BASE
  };
});
