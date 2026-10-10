/*
 * 紫微斗数 エンジン（計算のみ・DOM操作なし・文章なし）
 *
 * ■ えみりが採用する方式（流派で差が出る点を明文化）
 *   1. 暦：生まれた日を旧暦に直す（core/kyureki.js、日本時間）。生まれた時刻（時辰）が必要。
 *      23時台は翌日の子の刻として扱う（旧暦の日も翌日になる）。出生地による時差の補正はしない。
 *   2. 年の干支：旧暦の年（旧正月で切り替わる）。
 *   3. 閏月：その月の15日までは同じ番号の月、16日以降は次の月として扱う。
 *   4. 命宮：寅から旧暦の月の数だけ順に進み、そこから時辰の数だけ逆に戻った宮。身宮：月の位置から時辰の数だけ順に進んだ宮。
 *      12宮は命宮から逆回りに、命・兄弟・夫妻・子女・財帛・疾厄・遷移・交友・官禄・田宅・福徳・父母。
 *   5. 宮の天干：年干から五虎遁で寅宮の天干を決め、順に並べる。
 *   6. 五行局：命宮の干支の納音五行（水二局・木三局・金四局・土五局・火六局）。
 *   7. 紫微星：五行局の数と旧暦の日から求める一般的な方法。天府星は寅申を軸に紫微星と対称の位置。
 *      紫微星系（紫微・天機・太陽・武曲・天同・廉貞）と天府星系（天府・太陰・貪狼・巨門・天相・天梁・七殺・破軍）の14主星。
 *   8. 補助の星：左輔・右弼（月）、文昌・文曲（時辰）、禄存・擎羊・陀羅（年干）。
 *   9. 四化：年干による化禄・化権・化科・化忌（庚年は 太陽・武曲・太陰・天同）。
 *  10. 主星のない宮（空宮）は、向かい側の宮（対宮）の主星を借りて読む。
 *
 * ブラウザでは window.KaruteEngines.shibi、Node では module.exports で使える。
 */
(function (root, factory) {
  if (typeof module === "object" && module.exports) {
    module.exports = factory(require("../core/kyureki.js"));
  } else {
    root.KaruteEngines = root.KaruteEngines || {};
    root.KaruteEngines.shibi = factory(root.Karute.kyureki);
  }
})(typeof self !== "undefined" ? self : this, function (kyureki) {
  "use strict";

  var STEMS = "甲乙丙丁戊己庚辛壬癸";
  var BRANCHES = "子丑寅卯辰巳午未申酉戌亥";
  var PALACES = ["命宮", "兄弟宮", "夫妻宮", "子女宮", "財帛宮", "疾厄宮", "遷移宮", "交友宮", "官禄宮", "田宅宮", "福徳宮", "父母宮"];
  var MAJOR = ["紫微", "天機", "太陽", "武曲", "天同", "廉貞", "天府", "太陰", "貪狼", "巨門", "天相", "天梁", "七殺", "破軍"];
  // 納音五行（干支の番号を2つずつ）
  var NAYIN = ["金", "火", "木", "土", "金", "火", "水", "土", "金", "木", "水", "土", "火", "木", "水", "金", "火", "木", "土", "金", "火", "水", "土", "金", "木", "水", "土", "火", "木", "水"];
  var KYOKU = { "水": 2, "木": 3, "金": 4, "土": 5, "火": 6 };
  var KYOKU_NAME = { 2: "水二局", 3: "木三局", 4: "金四局", 5: "土五局", 6: "火六局" };
  var SIKA = {
    "甲": ["廉貞", "破軍", "武曲", "太陽"], "乙": ["天機", "天梁", "紫微", "太陰"], "丙": ["天同", "天機", "文昌", "廉貞"],
    "丁": ["太陰", "天同", "天機", "巨門"], "戊": ["貪狼", "太陰", "右弼", "天機"], "己": ["武曲", "貪狼", "天梁", "文曲"],
    "庚": ["太陽", "武曲", "太陰", "天同"], "辛": ["巨門", "太陽", "文曲", "文昌"], "壬": ["天梁", "紫微", "左輔", "武曲"],
    "癸": ["破軍", "巨門", "太陰", "貪狼"]
  };
  var SIKA_NAMES = ["化禄", "化権", "化科", "化忌"];
  var LUZON = { "甲": 2, "乙": 3, "丙": 5, "丁": 6, "戊": 5, "己": 6, "庚": 8, "辛": 9, "壬": 11, "癸": 0 };

  function mod(n, m) { return ((n % m) + m) % m; }

  function sexagenaryOf(stem, branch) {
    for (var i = 0; i < 60; i++) if (i % 10 === stem && i % 12 === branch) return i;
    return -1;
  }

  function normalizeTime(time) {
    if (time == null || time === "") return null;
    var mt = /^(\d{1,2}):(\d{2})$/.exec(String(time).trim()), h, mi;
    if (mt) { h = Number(mt[1]); mi = Number(mt[2]); } else if (typeof time === "object") { h = Number(time.hour); mi = Number(time.minute); }
    if (!(h >= 0 && h <= 23 && mi >= 0 && mi <= 59)) throw new Error("時刻が正しくありません");
    return { hour: h, minute: mi };
  }

  function nextDay(y, m, d) {
    var dt = new Date(Date.UTC(y, m - 1, d + 1));
    return { year: dt.getUTCFullYear(), month: dt.getUTCMonth() + 1, day: dt.getUTCDate() };
  }

  // 紫微星の位置（五行局の数 n、旧暦の日 d）
  function shibiPosition(n, d) {
    var q = Math.ceil(d / n), r = q * n - d;
    var pos = 2 + (q - 1);
    pos += r % 2 === 0 ? r : -r;
    return mod(pos, 12);
  }

  /**
   * 紫微斗数の命盤
   * @param {{year, month, day, time}} birth 日本時間（time は必須）
   */
  function calculateShibi(birth) {
    var time = normalizeTime(birth.time);
    if (!time) throw new Error("紫微斗数には生まれた時刻が必要です");
    var y = Number(birth.year), m = Number(birth.month), d = Number(birth.day);
    var hourIndex = Math.floor((time.hour + 1) / 2) % 12;
    var date = time.hour === 23 ? nextDay(y, m, d) : { year: y, month: m, day: d };
    var lunar = kyureki.fromGregorian(date.year, date.month, date.day);
    var lm = lunar.month;
    if (lunar.leap && lunar.day > 15) lm = lm % 12 + 1;
    var ld = lunar.day;
    var yearStem = mod(lunar.year - 4, 10), yearBranch = mod(lunar.year - 4, 12);
    var ys = STEMS.charAt(yearStem);

    var mei = mod(2 + (lm - 1) - hourIndex, 12);
    var shin = mod(2 + (lm - 1) + hourIndex, 12);
    var toraStem = mod((yearStem % 5) * 2 + 2, 10);
    function stemOf(b) { return mod(toraStem + mod(b - 2, 12), 10); }
    var meiIdx = sexagenaryOf(stemOf(mei), mei);
    var kyoku = KYOKU[NAYIN[Math.floor(meiIdx / 2)]];

    var z = shibiPosition(kyoku, ld);
    var f = mod(4 - z, 12);
    var pos = {
      "紫微": z, "天機": mod(z - 1, 12), "太陽": mod(z - 3, 12), "武曲": mod(z - 4, 12), "天同": mod(z - 5, 12), "廉貞": mod(z - 8, 12),
      "天府": f, "太陰": mod(f + 1, 12), "貪狼": mod(f + 2, 12), "巨門": mod(f + 3, 12), "天相": mod(f + 4, 12), "天梁": mod(f + 5, 12), "七殺": mod(f + 6, 12), "破軍": mod(f + 10, 12)
    };
    var lz = LUZON[ys];
    var minorPos = {
      "左輔": mod(4 + (lm - 1), 12), "右弼": mod(10 - (lm - 1), 12),
      "文昌": mod(10 - hourIndex, 12), "文曲": mod(4 + hourIndex, 12),
      "禄存": lz, "擎羊": mod(lz + 1, 12), "陀羅": mod(lz - 1, 12)
    };
    var sika = {};
    SIKA[ys].forEach(function (star, i) { sika[star] = SIKA_NAMES[i]; });

    var palaces = [];
    for (var b = 0; b < 12; b++) {
      var pi = mod(mei - b, 12);
      palaces[b] = {
        branchIndex: b, branch: BRANCHES.charAt(b), stem: STEMS.charAt(stemOf(b)),
        name: PALACES[pi], order: pi, isShin: b === shin,
        major: MAJOR.filter(function (s) { return pos[s] === b; }).map(function (s) { return { name: s, sika: sika[s] || null }; }),
        minor: Object.keys(minorPos).filter(function (s) { return minorPos[s] === b; }).map(function (s) { return { name: s, sika: sika[s] || null }; })
      };
    }
    var byName = {};
    palaces.forEach(function (p) { byName[p.name] = p; });
    // 空宮は対宮の主星を借りる
    function mainStars(p) {
      if (p.major.length) return { stars: p.major.map(function (s) { return s.name; }), borrowed: false };
      var opp = palaces[mod(p.branchIndex + 6, 12)];
      return { stars: opp.major.map(function (s) { return s.name; }), borrowed: true };
    }
    var sikaPlaces = SIKA[ys].map(function (star, i) {
      var b = pos[star] !== undefined ? pos[star] : minorPos[star];
      return { type: SIKA_NAMES[i], star: star, palace: palaces[b].name };
    });

    return {
      input: { year: y, month: m, day: d, time: time },
      lunar: lunar,
      lunarUsed: { month: lm, day: ld, leapAdjusted: lunar.leap && lunar.day > 15 },
      hour: { index: hourIndex, name: BRANCHES.charAt(hourIndex) + "の刻" },
      year: { stem: ys, branch: BRANCHES.charAt(yearBranch), name: ys + BRANCHES.charAt(yearBranch) },
      kyoku: { number: kyoku, name: KYOKU_NAME[kyoku] },
      mei: byName["命宮"], shin: palaces[shin],
      palaces: palaces, byName: byName,
      mainStars: mainStars,
      sika: sikaPlaces,
      starPositions: pos
    };
  }

  function ensure(x) { return x && x.palaces ? x : calculateShibi(x); }

  /**
   * 相性：五行局の関係、命宮の主星どうし、あなたの夫妻宮とお相手の命宮、お相手の年干の化禄・化忌が入るあなたの宮（逆も）
   */
  function calculateShibiCompatibility(a, b) {
    var ra = ensure(a), rb = ensure(b);
    var order = ["木", "火", "土", "金", "水"];
    var elOf = { 2: "水", 3: "木", 4: "金", 5: "土", 6: "火" };
    var ea = order.indexOf(elOf[ra.kyoku.number]), eb = order.indexOf(elOf[rb.kyoku.number]);
    var d = mod(eb - ea, 5);
    var kyokuRel = ["same", "generates", "controls", "controlled", "generated"][d];
    var meiA = ra.mainStars(ra.mei).stars, meiB = rb.mainStars(rb.mei).stars;
    var spouseA = ra.mainStars(ra.byName["夫妻宮"]).stars, spouseB = rb.mainStars(rb.byName["夫妻宮"]).stars;
    function overlap(x, y) { return x.filter(function (s) { return y.indexOf(s) >= 0; }); }
    function flying(from, to) {
      var list = SIKA[from.year.stem];
      function place(star) { var p = to.starPositions[star]; return p === undefined ? null : to.palaces[p].name; }
      return { roku: { star: list[0], palace: place(list[0]) }, ki: { star: list[3], palace: place(list[3]) } };
    }
    return {
      person1: ra, person2: rb,
      kyoku: { relation: kyokuRel, you: ra.kyoku.name, partner: rb.kyoku.name },
      meiStars: { you: meiA, partner: meiB, shared: overlap(meiA, meiB) },
      spouseMatch: { youSpouseInPartnerMei: overlap(spouseA, meiB), partnerSpouseInYourMei: overlap(spouseB, meiA) },
      partnerToYou: flying(rb, ra),
      youToPartner: flying(ra, rb)
    };
  }

  return {
    STEMS: STEMS, BRANCHES: BRANCHES, PALACES: PALACES, MAJOR: MAJOR, SIKA: SIKA, KYOKU_NAME: KYOKU_NAME,
    shibiPosition: shibiPosition,
    calculateShibi: calculateShibi,
    calculateShibiCompatibility: calculateShibiCompatibility
  };
});
