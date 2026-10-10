/*
 * 四柱推命 エンジン（計算のみ・DOM操作なし・文章なし）
 *
 * ■ えみりが採用する方式（流派・実装で差が出うる点を明文化）
 *   1. 暦と時刻：日本時間（UTC+9）の暦日・時刻。先発グレゴリオ暦。出生地による地方時（経度）の補正はしない。
 *   2. 年柱：立春（太陽黄経315°）の時刻で年が切り替わる。九星気学と同じ判定（engines/kyusei.js）を使う。
 *   3. 月柱：12の節（立春・啓蟄・…・小寒）の時刻で月が切り替わる。月支は寅月から順に、月干は五虎遁
 *      （甲・己の年は丙寅から、乙・庚は戊寅、丙・辛は庚寅、丁・壬は壬寅、戊・癸は甲寅）。
 *      節入り当日で出生時刻の入力がない場合は、九星気学と同じく「節入りの日から新しい月」とし、
 *      時刻によって変わる可能性を返す（boundary / alternative）。
 *   4. 日柱：日本時間の暦日で60日周期（2000年1月1日＝戊午）。日付は0時で切り替える（23時台も同じ日）。
 *   5. 時柱（出生時刻があるときだけ）：23時〜翌1時前が子の刻、以後2時間ごと。時干は五鼠遁で、
 *      23時台（夜の子の刻）は翌日の日干から求める（日柱はその日のまま）。
 *   6. 蔵干：十二支の本気（主な気）だけを使う。子＝癸、丑＝己、寅＝甲、卯＝乙、辰＝戊、巳＝丙、
 *      午＝丁、未＝己、申＝庚、酉＝辛、戌＝戊、亥＝壬。
 *   7. 通変星：日干（自分）から見た五行の関係と陰陽の異同。中心星は月支の本気の通変星。
 *   8. 十二運：日干から見た各柱の地支の運。陽干は順に、陰干は逆に巡る（陰陽で長生の位置が異なる方式）。
 *   9. 五行のバランス：天干と地支（地支はその支の五行）の数。時柱が分からないときは6つで数える。
 *  10. 天中殺（空亡）：日柱の旬で決まる2つの十二支。
 *  11. 年運：その年（立春で区切る）の干支を、日干から見た通変星と十二運で読む。
 *   ※ 大運・格局・用神・身強弱の判定は扱わない。
 *
 * ブラウザでは window.KaruteEngines.shichusuimei、Node では module.exports で使える。
 */
(function (root, factory) {
  if (typeof module === "object" && module.exports) {
    module.exports = factory(require("../core/astro.js"), require("./kyusei.js"));
  } else {
    root.KaruteEngines = root.KaruteEngines || {};
    root.KaruteEngines.shichusuimei = factory(root.Karute.astro, root.KaruteEngines.kyusei);
  }
})(typeof self !== "undefined" ? self : this, function (astro, kyusei) {
  "use strict";

  var STEMS = "甲乙丙丁戊己庚辛壬癸";
  var BRANCHES = "子丑寅卯辰巳午未申酉戌亥";
  var STEM_READINGS = ["きのえ", "きのと", "ひのえ", "ひのと", "つちのえ", "つちのと", "かのえ", "かのと", "みずのえ", "みずのと"];
  var BRANCH_READINGS = ["ね", "うし", "とら", "う", "たつ", "み", "うま", "ひつじ", "さる", "とり", "いぬ", "い"];
  var ELEMENTS = ["木", "火", "土", "金", "水"];
  var ELEMENT_KEYS = ["wood", "fire", "earth", "metal", "water"];
  // 地支の五行（0木 1火 2土 3金 4水）
  var BRANCH_ELEMENT = [4, 2, 0, 0, 2, 1, 1, 2, 3, 3, 2, 4];
  // 地支の本気（天干の番号）
  var HIDDEN_MAIN = [9, 5, 0, 1, 4, 2, 3, 5, 6, 7, 4, 8];
  var TSUHEN = ["比肩", "劫財", "食神", "傷官", "偏財", "正財", "偏官", "正官", "偏印", "印綬"];
  var TSUHEN_READINGS = ["ひけん", "ごうざい", "しょくじん", "しょうかん", "へんざい", "せいざい", "へんかん", "せいかん", "へんいん", "いんじゅ"];
  var JUNIUN = ["長生", "沐浴", "冠帯", "建禄", "帝旺", "衰", "病", "死", "墓", "絶", "胎", "養"];
  var JUNIUN_READINGS = ["ちょうせい", "もくよく", "かんたい", "けんろく", "ていおう", "すい", "びょう", "し", "ぼ", "ぜつ", "たい", "よう"];
  // 十二運の長生の位置（天干ごと）
  var CHOSEI = [11, 6, 2, 9, 2, 9, 5, 0, 8, 3];

  function mod(n, m) { return ((n % m) + m) % m; }

  function stemElement(s) { return Math.floor(s / 2); }
  function isYang(s) { return s % 2 === 0; }

  function pillarName(index) { return STEMS.charAt(index % 10) + BRANCHES.charAt(index % 12); }

  // 天干と地支の番号 → 60干支の番号
  function sexagenaryOf(stem, branch) {
    for (var i = 0; i < 60; i++) if (i % 10 === stem && i % 12 === branch) return i;
    throw new Error("干支の組み合わせが正しくありません");
  }

  // 日本時間の暦日 → 日の干支の番号（0＝甲子）
  function dayIndex(year, month, day) {
    var n = Math.round(astro.julianDay(year, month, day) + 0.5);
    return mod(n + 49, 60);
  }

  function yearIndex(kigakuYear) { return mod(kigakuYear - 4, 60); }

  // 年干と月の番号（寅月＝0 … 丑月＝11）→ 月の干支の番号
  function monthIndexOf(yearStem, monthIdx) {
    var stem = mod((yearStem % 5) * 2 + 2 + monthIdx, 10);
    var branch = mod(2 + monthIdx, 12);
    return sexagenaryOf(stem, branch);
  }

  // 日干と時刻 → 時の干支の番号（23時台は翌日の日干で求める）
  function hourIndexOf(dayStem, hour) {
    var branch = Math.floor((hour + 1) / 2) % 12;
    var baseStem = hour === 23 ? (dayStem + 1) % 10 : dayStem;
    var stem = mod((baseStem % 5) * 2 + branch, 10);
    return sexagenaryOf(stem, branch);
  }

  // 日干から見た天干の通変星（0〜9）
  function tsuhenIndex(dayStem, stem) {
    var me = stemElement(dayStem), it = stemElement(stem);
    var same = isYang(dayStem) === isYang(stem) ? 0 : 1;
    var rel = mod(it - me, 5); // 0 同じ, 1 我が生む, 2 我が剋す, 3 我を剋す, 4 我を生む
    return rel * 2 + same;
  }

  // 日干から見た地支の十二運（0〜11）
  function juniunIndex(dayStem, branch) {
    var start = CHOSEI[dayStem];
    return isYang(dayStem) ? mod(branch - start, 12) : mod(start - branch, 12);
  }

  // 日柱の干支 → 天中殺（空亡）の2つの地支
  function kuubou(dayIdx) {
    var first = mod((dayIdx % 12) - (dayIdx % 10) + 10, 12);
    return [first, (first + 1) % 12];
  }

  function stemInfo(s) {
    return { index: s, name: STEMS.charAt(s), reading: STEM_READINGS[s], element: ELEMENTS[stemElement(s)], elementKey: ELEMENT_KEYS[stemElement(s)], yang: isYang(s) };
  }

  function branchInfo(b) {
    return { index: b, name: BRANCHES.charAt(b), reading: BRANCH_READINGS[b], element: ELEMENTS[BRANCH_ELEMENT[b]], elementKey: ELEMENT_KEYS[BRANCH_ELEMENT[b]] };
  }

  function tsuhenInfo(i) { return { index: i, name: TSUHEN[i], reading: TSUHEN_READINGS[i] }; }
  function juniunInfo(i) { return { index: i, name: JUNIUN[i], reading: JUNIUN_READINGS[i] }; }

  function buildPillar(key, idx, dayStem) {
    var s = idx % 10, b = idx % 12;
    var hidden = HIDDEN_MAIN[b];
    return {
      key: key,
      index: idx,
      name: pillarName(idx),
      stem: stemInfo(s),
      branch: branchInfo(b),
      hidden: stemInfo(hidden),
      stemTsuhen: key === "day" ? null : tsuhenInfo(tsuhenIndex(dayStem, s)),
      branchTsuhen: tsuhenInfo(tsuhenIndex(dayStem, hidden)),
      juniun: juniunInfo(juniunIndex(dayStem, b))
    };
  }

  function elementBalance(pillars) {
    var counts = [0, 0, 0, 0, 0];
    pillars.forEach(function (p) {
      counts[stemElement(p.stem.index)] += 1;
      counts[BRANCH_ELEMENT[p.branch.index]] += 1;
    });
    var total = counts.reduce(function (a, b) { return a + b; }, 0);
    var max = Math.max.apply(null, counts), min = Math.min.apply(null, counts);
    return ELEMENTS.map(function (name, i) {
      return { element: name, key: ELEMENT_KEYS[i], count: counts[i], ratio: counts[i] / total, most: counts[i] === max, least: counts[i] === min };
    });
  }

  function pillarsFor(state, dayIdx, hourIdx) {
    var yIdx = yearIndex(state.kigakuYear);
    var mIdx = monthIndexOf(yIdx % 10, state.monthIndex);
    var dayStem = dayIdx % 10;
    var list = [buildPillar("year", yIdx, dayStem), buildPillar("month", mIdx, dayStem), buildPillar("day", dayIdx, dayStem)];
    if (hourIdx != null) list.push(buildPillar("hour", hourIdx, dayStem));
    return list;
  }

  /**
   * 四柱推命の命式
   * @param {{year:number, month:number, day:number, time?:(string|{hour:number, minute:number})}} birth
   * @returns {Object} pillars（年・月・日・時）、dayMaster、chushin（中心星）、elements、kuubou、solarTermInfo ほか
   */
  function calculateShichusuimei(birth) {
    var k = kyusei.calculateKyusei(birth);
    var input = k.input;
    var dIdx = dayIndex(input.year, input.month, input.day);
    var dayStem = dIdx % 10;
    var hIdx = input.time ? hourIndexOf(dayStem, input.time.hour) : null;
    var pillars = pillarsFor(k, dIdx, hIdx);
    var month = pillars[1];
    var alt = null;
    if (k.solarTermInfo.alternative) {
      var ap = pillarsFor(k.solarTermInfo.alternative, dIdx, hIdx);
      alt = { year: ap[0], month: ap[1], chushin: ap[1].branchTsuhen, kigakuYear: k.solarTermInfo.alternative.kigakuYear };
    }
    var void2 = kuubou(dIdx);
    return {
      input: input,
      hasTime: !!input.time,
      pillars: pillars,
      byKey: pillars.reduce(function (o, p) { o[p.key] = p; return o; }, {}),
      dayMaster: stemInfo(dayStem),
      chushin: month.branchTsuhen,
      elements: elementBalance(pillars),
      kuubou: { branches: void2.map(branchInfo), name: BRANCHES.charAt(void2[0]) + BRANCHES.charAt(void2[1]) + "天中殺" },
      kigakuYear: k.kigakuYear,
      solarTermInfo: k.solarTermInfo,
      alternative: alt,
      precision: k.precision
    };
  }

  /**
   * 年運：日干から見た、その年（立春で区切る）の干支の通変星と十二運
   * @param {number} dayStem 日干の番号
   * @param {number} kigakuYear 立春で区切った年
   */
  function yearFortune(dayStem, kigakuYear) {
    var idx = yearIndex(kigakuYear);
    return {
      year: kigakuYear,
      index: idx,
      name: pillarName(idx),
      tsuhen: tsuhenInfo(tsuhenIndex(dayStem, idx % 10)),
      juniun: juniunInfo(juniunIndex(dayStem, idx % 12)),
      isKuubou: false
    };
  }

  /**
   * 今日（日本時間）から見た年運の並び
   * @param {Object} result calculateShichusuimei の結果
   * @param {{year:number, month:number, day:number}} today
   * @param {number} count 何年分
   */
  function yearFortunes(result, today, count) {
    var now = kyusei.calculateKyusei({ year: today.year, month: today.month, day: today.day });
    var voids = result.kuubou.branches.map(function (b) { return b.index; });
    var list = [];
    for (var i = 0; i < (count || 3); i++) {
      var f = yearFortune(result.dayMaster.index, now.kigakuYear + i);
      f.isKuubou = voids.indexOf(f.index % 12) >= 0;
      list.push(f);
    }
    return list;
  }

  return {
    STEMS: STEMS,
    BRANCHES: BRANCHES,
    ELEMENTS: ELEMENTS,
    TSUHEN: TSUHEN,
    JUNIUN: JUNIUN,
    HIDDEN_MAIN: HIDDEN_MAIN,
    calculateShichusuimei: calculateShichusuimei,
    yearFortune: yearFortune,
    yearFortunes: yearFortunes,
    dayIndex: dayIndex,
    yearIndex: yearIndex,
    monthIndexOf: monthIndexOf,
    hourIndexOf: hourIndexOf,
    tsuhenIndex: tsuhenIndex,
    juniunIndex: juniunIndex,
    kuubou: kuubou,
    pillarName: pillarName
  };
});
