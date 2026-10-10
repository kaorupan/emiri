/*
 * マヤ暦 エンジン（計算のみ・DOM操作なし・文章なし）
 *
 * ■ えみりが採用する方式（流派・実装で差が出うる点を明文化）
 *   1. 方式：日本で「マヤ暦」として広く使われている13の月の暦（ドリームスペル）のKIN。
 *      古代マヤの暦をそのまま現代に当てはめた計算（GMT相関）とは日付が異なる。
 *   2. 基準日：1987年7月26日＝KIN34。2月29日を数えずに、1日ごとにKINが1つ進む（260で一巡）。
 *   3. 2月29日：独立したKINを持たない日（0.0 フナブ・クの日）。えみりでは2月28日と同じKINとして扱い、
 *      3月1日側のKINになる場合があることを leapDay として返す。
 *   4. 太陽の紋章：(KIN−1) mod 20 番目（赤い龍から黄色い太陽まで）。銀河の音：(KIN−1) mod 13 ＋ 1。
 *   5. ウェイブスペル：KIN1・14・27…から始まる13日のまとまりの、最初のKINの紋章。
 *   6. ガイドKIN：銀河の音が同じで、紋章が音によって決まるKIN
 *      （音1・6・11＝同じ紋章、2・7・12＝12番先、3・8・13＝4番先、4・9＝4番前、5・10＝8番先）。
 *   7. 類似KIN：銀河の音が同じで、紋章の番号（1〜20）の和が19または39になるKIN。
 *      反対KIN：銀河の音が同じで、紋章が10番先のKIN。神秘KIN：KIN番号の和が261になるKIN。
 *   8. 黒KIN（銀河の活性化の入り口）：260のKINのうち、決まった模様をなす52のKIN。
 *   9. 年回り：誕生日ごとに1年ずつ巡るKIN（毎年の誕生日のKIN。銀河の音は1年に1つ進み、13年で一巡）。
 *
 * ブラウザでは window.KaruteEngines.maya、Node では module.exports で使える。
 */
(function (root, factory) {
  if (typeof module === "object" && module.exports) {
    module.exports = factory();
  } else {
    root.KaruteEngines = root.KaruteEngines || {};
    root.KaruteEngines.maya = factory();
  }
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";

  var SEALS = [
    { name: "赤い龍", reading: "あかいりゅう", color: "赤" },
    { name: "白い風", reading: "しろいかぜ", color: "白" },
    { name: "青い夜", reading: "あおいよる", color: "青" },
    { name: "黄色い種", reading: "きいろいたね", color: "黄" },
    { name: "赤い蛇", reading: "あかいへび", color: "赤" },
    { name: "白い世界の橋渡し", reading: "しろいせかいのはしわたし", color: "白" },
    { name: "青い手", reading: "あおいて", color: "青" },
    { name: "黄色い星", reading: "きいろいほし", color: "黄" },
    { name: "赤い月", reading: "あかいつき", color: "赤" },
    { name: "白い犬", reading: "しろいいぬ", color: "白" },
    { name: "青い猿", reading: "あおいさる", color: "青" },
    { name: "黄色い人", reading: "きいろいひと", color: "黄" },
    { name: "赤い空歩く人", reading: "あかいそらあるくひと", color: "赤" },
    { name: "白い魔法使い", reading: "しろいまほうつかい", color: "白" },
    { name: "青い鷲", reading: "あおいわし", color: "青" },
    { name: "黄色い戦士", reading: "きいろいせんし", color: "黄" },
    { name: "赤い地球", reading: "あかいちきゅう", color: "赤" },
    { name: "白い鏡", reading: "しろいかがみ", color: "白" },
    { name: "青い嵐", reading: "あおいあらし", color: "青" },
    { name: "黄色い太陽", reading: "きいろいたいよう", color: "黄" }
  ];
  var TONES = ["磁気", "月", "電気", "自己存在", "倍音", "律動", "共振", "銀河", "太陽", "惑星", "スペクトル", "水晶", "宇宙"];
  var BLACK_KIN = [1, 20, 22, 39, 43, 50, 51, 58, 64, 69, 72, 77, 85, 88, 93, 96, 106, 107, 108, 109, 110, 111, 112, 113, 114, 115,
    146, 147, 148, 149, 150, 151, 152, 153, 154, 155, 165, 168, 173, 176, 184, 189, 192, 197, 203, 210, 211, 218, 222, 239, 241, 260];
  // 銀河の音 → ガイドの紋章のずれ（音1から順に）
  var GUIDE_SHIFT = [0, 12, 4, 16, 8];
  var MONTH_START = [0, 31, 59, 90, 120, 151, 181, 212, 243, 273, 304, 334]; // 2月を28日とした年内の通日

  function mod(n, m) { return ((n % m) + m) % m; }

  // 2月29日を数えない通日
  function dayCount(y, m, d) { return 365 * y + MONTH_START[m - 1] + d; }
  var BASE = dayCount(1987, 7, 26); // KIN34

  function kinOfDate(y, m, d) {
    if (m === 2 && d === 29) d = 28;
    return mod(33 + dayCount(y, m, d) - BASE, 260) + 1;
  }

  function sealIndex(kin) { return (kin - 1) % 20; }
  function toneOf(kin) { return (kin - 1) % 13 + 1; }

  // 紋章（0〜19）と音（1〜13）→ KIN
  function kinFrom(seal, tone) {
    for (var k = 1; k <= 260; k++) if (sealIndex(k) === seal && toneOf(k) === tone) return k;
    throw new Error("紋章と音の組み合わせが正しくありません");
  }

  function sealInfo(i) {
    var s = SEALS[i];
    return { index: i, number: i + 1, name: s.name, reading: s.reading, color: s.color };
  }

  function kinInfo(kin) {
    var tone = toneOf(kin);
    return {
      kin: kin,
      seal: sealInfo(sealIndex(kin)),
      tone: { number: tone, name: TONES[tone - 1] },
      wavespell: sealInfo(sealIndex(kin - (kin - 1) % 13)),
      wavespellDay: (kin - 1) % 13 + 1,
      black: BLACK_KIN.indexOf(kin) >= 0,
      name: SEALS[sealIndex(kin)].name + "・音" + tone
    };
  }

  function relations(kin) {
    var s = sealIndex(kin), t = toneOf(kin);
    return {
      guide: kinInfo(kinFrom(mod(s + GUIDE_SHIFT[(t - 1) % 5], 20), t)),
      analog: kinInfo(kinFrom(mod(17 - s, 20), t)),
      antipode: kinInfo(kinFrom(mod(s + 10, 20), t)),
      occult: kinInfo(261 - kin)
    };
  }

  /**
   * マヤ暦（ドリームスペル）の個人判定
   * @param {{year:number, month:number, day:number}} birth
   */
  function calculateMaya(birth) {
    var y = Number(birth.year), m = Number(birth.month), d = Number(birth.day);
    var kin = kinOfDate(y, m, d);
    var info = kinInfo(kin);
    var leapDay = m === 2 && d === 29;
    return {
      input: { year: y, month: m, day: d },
      kin: kin,
      seal: info.seal,
      tone: info.tone,
      wavespell: info.wavespell,
      wavespellDay: info.wavespellDay,
      black: info.black,
      relations: relations(kin),
      leapDay: leapDay ? { alternative: kinInfo(kin % 260 + 1) } : null
    };
  }

  /**
   * 年回り：その年の誕生日のKIN（誕生日から次の誕生日の前日まで）
   * @param {Object} result calculateMaya の結果
   * @param {{year:number, month:number, day:number}} today
   * @param {number} count 何年分
   */
  function yearCycles(result, today, count) {
    var b = result.input;
    var bm = b.month, bd = b.day;
    var passed = today.month > bm || (today.month === bm && today.day >= bd);
    var start = passed ? today.year : today.year - 1;
    var list = [];
    for (var i = 0; i < (count || 3); i++) {
      var y = start + i;
      var k = kinOfDate(y, bm, bd);
      var info = kinInfo(k);
      info.year = y;
      info.age = y - b.year;
      list.push(info);
    }
    return list;
  }

  return {
    SEALS: SEALS,
    TONES: TONES,
    BLACK_KIN: BLACK_KIN,
    kinOfDate: kinOfDate,
    kinInfo: kinInfo,
    kinFrom: kinFrom,
    relations: relations,
    calculateMaya: calculateMaya,
    yearCycles: yearCycles
  };
});
