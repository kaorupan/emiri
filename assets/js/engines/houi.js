/*
 * 吉方位（九星気学の年盤）エンジン（計算のみ・DOM操作なし・文章なし）
 *
 * ■ えみりが採用する方式
 *   1. 年盤：その年（立春から翌年の立春の前まで）の九星を中宮に置き、後天定位の順（中宮→北西→西→北東→南→北→南西→東→南東）に
 *      1つずつ数を増やして（9の次は1）八方に配置する。
 *   2. 凶方位（年盤）：五黄殺（五黄土星のいる方位）、暗剣殺（五黄殺の反対）、歳破（その年の十二支の反対）、
 *      本命殺（本命星のいる方位）、本命的殺（本命殺の反対）、定位対冲（星が本来の定位置の反対側に入っている方位）。
 *      五黄土星が中宮のときは五黄殺・暗剣殺はない。本命星が中宮のときは本命殺・本命的殺はない（八方塞がりの年とされる）。
 *   3. 吉方位：凶方位を除いた方位のうち、そこにいる星が本命星と相生または比和（同じ五行）の関係にある方位。
 *      五黄土星のいる方位は吉方位にしない。月命星があれば、月命殺（月命星のいる方位）・月命的殺（その反対）も凶方位に加え、
 *      月命星とも相生・比和の方位を「最大吉方」とする。
 *   4. 方位は8方位（北・北東・東・南東・南・南西・西・北西）。月盤・日盤・方位の角度（30度／60度）は扱わない。
 *   5. 歳破：十二支の方位（子＝北、丑・寅＝北東、卯＝東、辰・巳＝南東、午＝南、未・申＝南西、酉＝西、戌・亥＝北西）の反対の8方位。
 *
 * 公開されている年盤（2026年：中宮一白、五黄殺＝南、暗剣殺・歳破＝北、定位対冲＝西）と、本命星・月命星別の吉方・最大吉方の例と一致することを確かめている。
 * ブラウザでは window.KaruteEngines.houi、Node では module.exports で使える。
 */
(function (root, factory) {
  if (typeof module === "object" && module.exports) {
    module.exports = factory(require("../content/kyusei-data.js"));
  } else {
    root.KaruteEngines = root.KaruteEngines || {};
    root.KaruteEngines.houi = factory(root.KaruteContent.kyuseiData);
  }
})(typeof self !== "undefined" ? self : this, function (data) {
  "use strict";

  var DIRS = [
    { key: "n", name: "北" }, { key: "ne", name: "北東" }, { key: "e", name: "東" }, { key: "se", name: "南東" },
    { key: "s", name: "南" }, { key: "sw", name: "南西" }, { key: "w", name: "西" }, { key: "nw", name: "北西" }
  ];
  var NAME = {};
  DIRS.forEach(function (d) { NAME[d.key] = d.name; });
  var OPP = { n: "s", ne: "sw", e: "w", se: "nw", s: "n", sw: "ne", w: "e", nw: "se" };
  var FLY = { nw: 1, w: 2, ne: 3, s: 4, n: 5, sw: 6, e: 7, se: 8 };       // 中宮からの増分
  var HOME = { 1: "n", 2: "sw", 3: "e", 4: "se", 6: "nw", 7: "w", 8: "ne", 9: "s" }; // 後天定位
  var STEMS = ["甲", "乙", "丙", "丁", "戊", "己", "庚", "辛", "壬", "癸"];
  var BRANCHES = ["子", "丑", "寅", "卯", "辰", "巳", "午", "未", "申", "酉", "戌", "亥"];
  var BRANCH_DIR = ["n", "ne", "ne", "e", "se", "se", "s", "sw", "sw", "w", "nw", "nw"];

  function mod(n, m) { return ((n % m) + m) % m; }
  function yearStar(year) {
    var b = data.YEAR_STAR_BASE, s = mod(b.star - (year - b.year), 9);
    return s === 0 ? 9 : s;
  }
  function eto(year) { return { stem: STEMS[mod(year - 4, 10)], branch: BRANCHES[mod(year - 4, 12)], branchIndex: mod(year - 4, 12) }; }
  function elementOf(star) { return data.STARS[star].element; }

  // 本命星（または月命星）と相生・比和の星（五黄は除く）
  function goodStars(star) {
    var el = elementOf(star), out = [];
    for (var s = 1; s <= 9; s++) {
      if (s === 5) continue;
      var e = elementOf(s);
      if (e === el || data.GENERATES[e] === el || data.GENERATES[el] === e) out.push(s);
    }
    return out.filter(function (s) { return s !== star || star !== 5; });
  }

  /*
   * yearChart(気学の年) → { year, center, stars:{n:…}, gooh, anken, saiha, teii:[…], eto }
   */
  function yearChart(year) {
    var center = yearStar(year), stars = {};
    DIRS.forEach(function (d) { var v = mod(center + FLY[d.key], 9); stars[d.key] = v === 0 ? 9 : v; });
    var gooh = null;
    DIRS.forEach(function (d) { if (stars[d.key] === 5) gooh = d.key; });
    var et = eto(year);
    var saiha = OPP[BRANCH_DIR[et.branchIndex]];
    var teii = DIRS.filter(function (d) { var s = stars[d.key]; return s !== 5 && OPP[HOME[s]] === d.key; }).map(function (d) { return d.key; });
    return { year: year, center: center, stars: stars, gooh: gooh, anken: gooh ? OPP[gooh] : null, saiha: saiha, teii: teii, eto: et };
  }

  /*
   * forPerson(気学の年, 本命星, 月命星?) → { chart, honmeiCenter, dirs:[{key,name,star,bad:[ラベル],good,best}], good:[key], best:[key] }
   */
  function forPerson(year, honmei, getsumei) {
    var c = yearChart(year);
    var hDir = null;
    DIRS.forEach(function (d) { if (c.stars[d.key] === honmei) hDir = d.key; });
    var gDir = null;
    if (getsumei) DIRS.forEach(function (d) { if (c.stars[d.key] === getsumei) gDir = d.key; });
    var gH = goodStars(honmei), gG = getsumei ? goodStars(getsumei) : null;
    var dirs = DIRS.map(function (d) {
      var bad = [];
      if (d.key === c.gooh) bad.push("五黄殺");
      if (d.key === c.anken) bad.push("暗剣殺");
      if (d.key === c.saiha) bad.push("歳破");
      if (hDir && d.key === hDir) bad.push("本命殺");
      if (hDir && d.key === OPP[hDir]) bad.push("本命的殺");
      if (gDir && d.key === gDir) bad.push("月命殺");
      if (gDir && d.key === OPP[gDir]) bad.push("月命的殺");
      if (c.teii.indexOf(d.key) >= 0) bad.push("定位対冲");
      var star = c.stars[d.key];
      var good = !bad.length && gH.indexOf(star) >= 0;
      var best = good && !!gG && gG.indexOf(star) >= 0;
      return { key: d.key, name: d.name, star: star, bad: bad, good: good, best: best };
    });
    return {
      chart: c, honmei: honmei, getsumei: getsumei || null, honmeiCenter: !hDir,
      dirs: dirs,
      good: dirs.filter(function (d) { return d.good; }).map(function (d) { return d.key; }),
      best: dirs.filter(function (d) { return d.best; }).map(function (d) { return d.key; })
    };
  }

  return { DIRS: DIRS, NAME: NAME, OPP: OPP, HOME: HOME, yearStar: yearStar, eto: eto, goodStars: goodStars, yearChart: yearChart, forPerson: forPerson };
});
