/*
 * 干支（十干十二支）エンジン（計算のみ）
 *   etoOfYear(西暦) → { stem, branch, index60, branchIndex, stemIndex, name }（4年＝甲子 を基準。年の区切りは1月1日）
 *   relation(生まれ年の支, その年の支) → "same" | "sangou" | "shigou" | "chuu" | "gai" | "none"
 *     三合：申子辰・亥卯未・寅午戌・巳酉丑　支合：子丑・寅亥・卯戌・辰酉・巳申・午未
 *     冲：6つ離れた支　害：子未・丑午・寅巳・卯辰・申亥・酉戌
 * ふだん使う「〇〇年生まれ」の干支に合わせ、年の区切りは1月1日とする（四柱推命・九星気学は立春で区切る）。
 */
(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory();
  else { root.KaruteEngines = root.KaruteEngines || {}; root.KaruteEngines.eto = factory(); }
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";
  var STEMS = ["甲", "乙", "丙", "丁", "戊", "己", "庚", "辛", "壬", "癸"];
  var STEM_READ = ["きのえ", "きのと", "ひのえ", "ひのと", "つちのえ", "つちのと", "かのえ", "かのと", "みずのえ", "みずのと"];
  var BRANCHES = ["子", "丑", "寅", "卯", "辰", "巳", "午", "未", "申", "酉", "戌", "亥"];
  var BRANCH_READ = ["ね", "うし", "とら", "う", "たつ", "み", "うま", "ひつじ", "さる", "とり", "いぬ", "い"];
  var SANGOU = [[8, 0, 4], [11, 3, 7], [2, 6, 10], [5, 9, 1]];
  var SHIGOU = [[0, 1], [2, 11], [3, 10], [4, 9], [5, 8], [6, 7]];
  var GAI = [[0, 7], [1, 6], [2, 5], [3, 4], [8, 11], [9, 10]];
  function mod(n, m) { return ((n % m) + m) % m; }
  function pairIn(list, a, b) { return list.some(function (p) { return (p[0] === a && p[1] === b) || (p[0] === b && p[1] === a); }); }

  function etoOfYear(year) {
    var s = mod(year - 4, 10), b = mod(year - 4, 12);
    return {
      year: year, stemIndex: s, branchIndex: b, index60: mod(year - 4, 60),
      stem: STEMS[s], branch: BRANCHES[b], name: STEMS[s] + BRANCHES[b],
      reading: STEM_READ[s] + BRANCH_READ[b]
    };
  }

  function relation(a, b) {
    if (a === b) return "same";
    if (mod(a - b, 12) === 6) return "chuu";
    if (SANGOU.some(function (g) { return g.indexOf(a) >= 0 && g.indexOf(b) >= 0; })) return "sangou";
    if (pairIn(SHIGOU, a, b)) return "shigou";
    if (pairIn(GAI, a, b)) return "gai";
    return "none";
  }

  // 生まれ年の一覧（その支の年）
  function yearsOf(branchIndex, from, to) {
    var out = [];
    for (var y = from; y <= to; y++) if (mod(y - 4, 12) === branchIndex) out.push(y);
    return out;
  }

  return { STEMS: STEMS, STEM_READ: STEM_READ, BRANCHES: BRANCHES, BRANCH_READ: BRANCH_READ, etoOfYear: etoOfYear, relation: relation, yearsOf: yearsOf };
});
