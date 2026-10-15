/*
 * 風水：八宅風水の本命卦（判定のみ・DOM操作なし）
 *
 * 本命卦は、生まれた年（立春で区切る気学の年）の九星から求める。
 *   男性：本命星の数（5のときは坤＝2）
 *   女性：(6 − 本命星の数) を9で割った余り（0のときは9、5のときは艮＝8）
 * 本命星は engines/kyusei.js（立春の時刻で年を区切る）をそのまま使う。
 *
 * 8つの卦と、方位ごとの吉凶（遊年八宅）
 *   東四命：坎(1)・震(3)・巽(4)・離(9)  → 北・東・南東・南が吉
 *   西四命：坤(2)・乾(6)・兌(7)・艮(8)  → 南西・北西・西・北東が吉
 *
 * ブラウザでは window.KaruteEngines.fusui、Node では module.exports。
 */
(function (root, factory) {
  if (typeof module === "object" && module.exports) {
    module.exports = factory(require("./kyusei.js"));
  } else {
    root.KaruteEngines = root.KaruteEngines || {};
    root.KaruteEngines.fusui = factory(root.KaruteEngines.kyusei);
  }
})(typeof self !== "undefined" ? self : this, function (kyusei) {
  "use strict";

  var DIRS = {
    n: { key: "n", name: "北" }, ne: { key: "ne", name: "北東" }, e: { key: "e", name: "東" }, se: { key: "se", name: "南東" },
    s: { key: "s", name: "南" }, sw: { key: "sw", name: "南西" }, w: { key: "w", name: "西" }, nw: { key: "nw", name: "北西" }
  };

  // 8つの方位の吉凶の名前（吉→凶の順）
  var STARS = [
    { key: "seiki", name: "生気", reading: "せいき", good: true, rank: 1 },
    { key: "teni", name: "天医", reading: "てんい", good: true, rank: 2 },
    { key: "ennen", name: "延年", reading: "えんねん", good: true, rank: 3 },
    { key: "fukui", name: "伏位", reading: "ふくい", good: true, rank: 4 },
    { key: "kagai", name: "禍害", reading: "かがい", good: false, rank: 5 },
    { key: "rokusatsu", name: "六殺", reading: "ろくさつ", good: false, rank: 6 },
    { key: "goki", name: "五鬼", reading: "ごき", good: false, rank: 7 },
    { key: "zetsumei", name: "絶命", reading: "ぜつめい", good: false, rank: 8 }
  ];

  // 卦の数 → [生気, 天医, 延年, 伏位, 禍害, 六殺, 五鬼, 絶命] の方位
  var TABLE = {
    1: ["se", "e", "s", "n", "w", "nw", "ne", "sw"],   // 坎
    9: ["e", "se", "n", "s", "ne", "sw", "w", "nw"],   // 離
    3: ["s", "n", "se", "e", "sw", "ne", "nw", "w"],   // 震
    4: ["n", "s", "e", "se", "nw", "w", "sw", "ne"],   // 巽
    6: ["w", "ne", "sw", "nw", "se", "n", "e", "s"],   // 乾
    2: ["ne", "w", "nw", "sw", "e", "s", "se", "n"],   // 坤
    8: ["sw", "nw", "w", "ne", "s", "e", "n", "se"],   // 艮
    7: ["nw", "sw", "ne", "w", "n", "se", "s", "e"]    // 兌
  };

  var GUA = {
    1: { n: 1, slug: "kan", name: "坎", reading: "かん", home: "n", element: "水", group: "east" },
    2: { n: 2, slug: "kon", name: "坤", reading: "こん", home: "sw", element: "土", group: "west" },
    3: { n: 3, slug: "shin", name: "震", reading: "しん", home: "e", element: "木", group: "east" },
    4: { n: 4, slug: "son", name: "巽", reading: "そん", home: "se", element: "木", group: "east" },
    6: { n: 6, slug: "ken", name: "乾", reading: "けん", home: "nw", element: "金", group: "west" },
    7: { n: 7, slug: "da", name: "兌", reading: "だ", home: "w", element: "金", group: "west" },
    8: { n: 8, slug: "gon", name: "艮", reading: "ごん", home: "ne", element: "土", group: "west" },
    9: { n: 9, slug: "ri", name: "離", reading: "り", home: "s", element: "火", group: "east" }
  };
  var ORDER = [1, 2, 3, 4, 6, 7, 8, 9];

  function guaNumber(honmei, sex) {
    var n;
    if (sex === "f") {
      n = ((6 - honmei) % 9 + 9) % 9;
      if (n === 0) n = 9;
      if (n === 5) n = 8;
    } else {
      n = honmei;
      if (n === 5) n = 2;
    }
    return n;
  }

  // その卦の8方位（北から時計回り）
  function directions(n) {
    var t = TABLE[n];
    return ["n", "ne", "e", "se", "s", "sw", "w", "nw"].map(function (k) {
      var i = t.indexOf(k);
      return { key: k, name: DIRS[k].name, star: STARS[i] };
    });
  }

  function guaInfo(n) {
    var g = GUA[n];
    return {
      n: g.n, slug: g.slug, name: g.name, reading: g.reading, element: g.element,
      group: g.group, groupName: g.group === "east" ? "東四命" : "西四命", homeName: DIRS[g.home].name,
      dirs: directions(n),
      good: TABLE[n].slice(0, 4).map(function (k, i) { return { key: k, name: DIRS[k].name, star: STARS[i] }; }),
      bad: TABLE[n].slice(4).map(function (k, i) { return { key: k, name: DIRS[k].name, star: STARS[i + 4] }; })
    };
  }

  /**
   * @param birth { year, month, day }
   * @param sex   "m" | "f"
   */
  function calculateHonmeika(birth, sex) {
    var k = kyusei.calculateKyusei(birth);
    var res = { input: { year: k.input.year, month: k.input.month, day: k.input.day, sex: sex },
      kigakuYear: k.kigakuYear, honmei: k.honmei, gua: guaInfo(guaNumber(k.honmei, sex)), mayChange: false, alternative: null };
    var alt = k.solarTermInfo.alternative;
    // 立春の前後で年が変わる場合だけ、もう一方の卦も返す
    if (alt && alt.kigakuYear !== k.kigakuYear) {
      var n2 = guaNumber(alt.honmei, sex);
      if (n2 !== res.gua.n) { res.mayChange = true; res.alternative = guaInfo(n2); }
    }
    return res;
  }

  // 東四命・西四命どうしの相性（同じグループなら、お互いの吉方位がそろう）
  function sameGroup(a, b) { return GUA[a].group === GUA[b].group; }

  return { DIRS: DIRS, STARS: STARS, TABLE: TABLE, GUA: GUA, ORDER: ORDER, guaNumber: guaNumber, guaInfo: guaInfo, directions: directions, calculateHonmeika: calculateHonmeika, sameGroup: sameGroup };
});
