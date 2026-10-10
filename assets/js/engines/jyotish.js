/*
 * インド占星術（ジョーティッシュ）エンジン（計算のみ・DOM操作なし・文章なし）
 *
 * ■ えみりが採用する方式
 *   1. 星座：サイデリアル方式（実際の星座の位置にもとづく、インド占星術の方式）。
 *      アヤナムシャ（春分点のずれ）はラヒリ（チトラパクシャ）。1956年3月21日に23°14′43.9″とし、
 *      IAU 2006 の一般歳差で前後に延ばす。章動も含める（スイス・エフェメリスの値と0.001°以内）。
 *   2. 天体：太陽・月・火星・水星・木星・金星・土星（astronomy-engine で求めた視黄経からアヤナムシャを引く）と、
 *      ラーフ（月の平均昇交点）・ケートゥ（その反対）の9天体（ナヴァグラハ）。
 *   3. 時刻：日本時間。出生時刻がない場合は正午で計算し、その日のうちに月のラーシ・ナクシャトラが変わる場合は返す。
 *   4. ナクシャトラ：月の位置を13°20′ずつの27に分けたもの。パーダは3°20′ずつの4つ。
 *   5. ヴィムショッタリ・ダシャー：月のナクシャトラの支配星から始まる120年の周期。
 *      生まれたときのナクシャトラの残りの割合で最初の期間を決める。1年は365.25日。
 *   6. 相性：アシュタクータ（グナ・ミラン、36点満点）。ヴァルナ1・ヴァシャ2・ターラ3・ヨーニ4・
 *      グラハ・マイトリ5・ガナ6・バクート7・ナーディ8。男女の向きで点数が変わる項目があるため、両方の向きを返す。
 *      表は流派で細部が異なる。ヨーニは14×14の一般的な表、ガナは「新郎ラークシャサ×新婦デーヴァ＝1点」の表、
 *      ヴァシャは射手座・山羊座を前半・後半で分ける方式。バクート・ナーディの「打ち消し（例外）」は点数には入れず、
 *      当てはまる場合に exception として返す。
 *   7. アセンダント（ラグナ）とハウスは出生地が必要なため、この無料版では扱わない。
 *
 * ブラウザでは window.KaruteEngines.jyotish、Node では module.exports で使える。
 */
(function (root, factory) {
  if (typeof module === "object" && module.exports) {
    module.exports = factory(require("../vendor/astronomy-engine-2.1.19.min.js"));
  } else {
    root.KaruteEngines = root.KaruteEngines || {};
    root.KaruteEngines.jyotish = factory(root.Astronomy);
  }
})(typeof self !== "undefined" ? self : this, function (A) {
  "use strict";

  var RASHI = [
    { name: "メーシャ", ja: "牡羊座", lord: "mars" }, { name: "ヴリシャバ", ja: "牡牛座", lord: "venus" },
    { name: "ミトゥナ", ja: "双子座", lord: "mercury" }, { name: "カルカ", ja: "蟹座", lord: "moon" },
    { name: "シンハ", ja: "獅子座", lord: "sun" }, { name: "カニヤー", ja: "乙女座", lord: "mercury" },
    { name: "トゥラー", ja: "天秤座", lord: "venus" }, { name: "ヴリシュチカ", ja: "蠍座", lord: "mars" },
    { name: "ダヌ", ja: "射手座", lord: "jupiter" }, { name: "マカラ", ja: "山羊座", lord: "saturn" },
    { name: "クンバ", ja: "水瓶座", lord: "saturn" }, { name: "ミーナ", ja: "魚座", lord: "jupiter" }
  ];
  var NAKSHATRA = ["アシュヴィニー", "バラニー", "クリッティカー", "ローヒニー", "ムリガシラー", "アールドラー", "プナルヴァス", "プシュヤ", "アーシュレーシャー",
    "マガー", "プールヴァ・パールグニー", "ウッタラ・パールグニー", "ハスタ", "チトラー", "スヴァーティー", "ヴィシャーカー", "アヌラーダー", "ジエーシュター",
    "ムーラ", "プールヴァ・アーシャーダー", "ウッタラ・アーシャーダー", "シュラヴァナ", "ダニシュター", "シャタビシャー", "プールヴァ・バードラパダー", "ウッタラ・バードラパダー", "レーヴァティー"];
  // 二十七宿（宿曜）との対応（参考表示）
  var SHUKU = ["婁", "胃", "昴", "畢", "觜", "参", "井", "鬼", "柳", "星", "張", "翼", "軫", "角", "亢", "氐", "房", "心", "尾", "箕", "斗", "女", "虚", "危", "室", "壁", "奎"];
  var PLANETS = [
    { key: "sun", name: "太陽（スーリヤ）", body: "Sun" }, { key: "moon", name: "月（チャンドラ）", body: "Moon" },
    { key: "mars", name: "火星（マンガラ）", body: "Mars" }, { key: "mercury", name: "水星（ブダ）", body: "Mercury" },
    { key: "jupiter", name: "木星（グル）", body: "Jupiter" }, { key: "venus", name: "金星（シュクラ）", body: "Venus" },
    { key: "saturn", name: "土星（シャニ）", body: "Saturn" }, { key: "rahu", name: "ラーフ" }, { key: "ketu", name: "ケートゥ" }
  ];
  var DASHA_ORDER = ["ketu", "venus", "sun", "moon", "mars", "rahu", "jupiter", "saturn", "mercury"];
  var DASHA_YEARS = { ketu: 7, venus: 20, sun: 6, moon: 10, mars: 7, rahu: 18, jupiter: 16, saturn: 19, mercury: 17 };
  var LORD_NAME = { sun: "太陽", moon: "月", mars: "火星", mercury: "水星", jupiter: "木星", venus: "金星", saturn: "土星", rahu: "ラーフ", ketu: "ケートゥ" };
  var NAK_SPAN = 360 / 27;
  var JST_MS = 9 * 3600 * 1000;
  var DAY_MS = 86400000;

  function mod(n, m) { return ((n % m) + m) % m; }

  function timeOf(y, m, d, hour, minute) { return A.MakeTime(new Date(Date.UTC(y, m - 1, d, hour, minute) - JST_MS)); }

  // ラヒリ・アヤナムシャ（度、章動を含む）
  function ayanamsa(t) {
    function pA(T) { return (5028.796195 * T + 1.1054348 * T * T + 0.00007964 * T * T * T) / 3600; }
    var T0 = (2435553.5 - 2451545) / 36525;
    return 23.245524743 + pA(t.tt / 36525) - pA(T0) + A.e_tilt(t).dpsi / 3600;
  }

  // 月の平均昇交点（ラーフ）の黄経（春分点基準・度）
  function meanNode(t) {
    var T = t.tt / 36525;
    return mod(125.0445479 - 1934.1362891 * T + 0.0020754 * T * T + T * T * T / 467441 - T * T * T * T / 60616000, 360);
  }

  function tropical(body, t) {
    if (body === "Sun") return A.SunPosition(t).elon;
    if (body === "Moon") return A.EclipticGeoMoon(t).lon;
    return A.Ecliptic(A.GeoVector(body, t, true)).elon;
  }

  function siderealAll(t) {
    var ay = ayanamsa(t);
    var out = {};
    PLANETS.forEach(function (p) {
      if (p.body) out[p.key] = mod(tropical(p.body, t) - ay, 360);
    });
    var rahu = mod(meanNode(t) - (ay - A.e_tilt(t).dpsi / 3600), 360);
    out.rahu = rahu;
    out.ketu = mod(rahu + 180, 360);
    return out;
  }

  function nakshatraOf(lon) {
    var i = Math.floor(lon / NAK_SPAN);
    var within = lon - i * NAK_SPAN;
    return { index: i, name: NAKSHATRA[i], shuku: SHUKU[i] + "宿", pada: Math.floor(within / (NAK_SPAN / 4)) + 1, fraction: within / NAK_SPAN, lord: DASHA_ORDER[i % 9] };
  }

  function normalizeTime(time) {
    if (time == null || time === "") return null;
    var mt = /^(\d{1,2}):(\d{2})$/.exec(String(time).trim()), h, mi;
    if (mt) { h = Number(mt[1]); mi = Number(mt[2]); } else if (typeof time === "object") { h = Number(time.hour); mi = Number(time.minute); }
    if (!(h >= 0 && h <= 23 && mi >= 0 && mi <= 59)) throw new Error("時刻が正しくありません");
    return { hour: h, minute: mi };
  }

  /*
   * ヴィムショッタリ・ダシャー
   *   birthMs：誕生の時刻（UTCのミリ秒）、nak：月のナクシャトラ
   *   返すもの：マハーダシャーの一覧（開始・終了）と、各マハーダシャーのアンタルダシャー
   */
  function vimshottari(birthMs, nak) {
    var YEAR_MS = 365.25 * DAY_MS;
    var start = DASHA_ORDER.indexOf(nak.lord);
    var first = DASHA_YEARS[nak.lord];
    var elapsed = nak.fraction * first;
    var t = birthMs - elapsed * YEAR_MS; // 最初のダシャーの本来の開始
    var list = [];
    for (var i = 0; i < 10; i++) {
      var lord = DASHA_ORDER[(start + i) % 9];
      var len = DASHA_YEARS[lord] * YEAR_MS;
      var sub = [], s = t;
      for (var j = 0; j < 9; j++) {
        var sl = DASHA_ORDER[(start + i + j) % 9];
        var slen = DASHA_YEARS[lord] * DASHA_YEARS[sl] / 120 * YEAR_MS;
        sub.push({ lord: sl, name: LORD_NAME[sl], start: s, end: s + slen });
        s += slen;
      }
      list.push({ lord: lord, name: LORD_NAME[lord], years: DASHA_YEARS[lord], start: t, end: t + len, sub: sub });
      t += len;
    }
    return list;
  }

  function jstDate(ms) {
    var d = new Date(ms + JST_MS);
    return { year: d.getUTCFullYear(), month: d.getUTCMonth() + 1, day: d.getUTCDate() };
  }

  /**
   * インド占星術の判定
   * @param {{year, month, day, time?}} birth 日本時間
   */
  function calculateJyotish(birth) {
    var y = Number(birth.year), m = Number(birth.month), d = Number(birth.day);
    var time = normalizeTime(birth.time);
    var hh = time ? time.hour : 12, mm = time ? time.minute : 0;
    var t = timeOf(y, m, d, hh, mm);
    var lon = siderealAll(t);
    var planets = PLANETS.map(function (p) {
      var r = Math.floor(lon[p.key] / 30);
      var deg = lon[p.key] - r * 30;
      return { key: p.key, name: p.name, longitude: lon[p.key], rashiIndex: r, rashi: RASHI[r].name, rashiJa: RASHI[r].ja, degree: Math.floor(deg), minute: Math.floor((deg % 1) * 60) };
    });
    var byKey = {};
    planets.forEach(function (p) { byKey[p.key] = p; });
    var moonNak = nakshatraOf(lon.moon);
    var mayChange = null;
    if (!time) {
      var m0 = siderealAll(timeOf(y, m, d, 0, 0)).moon, m1 = siderealAll(timeOf(y, m, d, 23, 59)).moon;
      var n0 = nakshatraOf(m0), n1 = nakshatraOf(m1);
      if (n0.index !== n1.index || Math.floor(m0 / 30) !== Math.floor(m1 / 30)) {
        mayChange = { from: n0.name, to: n1.name, rashiFrom: RASHI[Math.floor(m0 / 30)].name, rashiTo: RASHI[Math.floor(m1 / 30)].name };
      }
    }
    var birthMs = Date.UTC(y, m - 1, d, hh, mm) - JST_MS;
    var dashas = vimshottari(birthMs, moonNak);
    return {
      input: { year: y, month: m, day: d, time: time },
      hasTime: !!time,
      ayanamsa: ayanamsa(t),
      planets: planets,
      byKey: byKey,
      moonDegree: lon.moon - byKey.moon.rashiIndex * 30,
      moonRashi: { index: byKey.moon.rashiIndex, name: byKey.moon.rashi, ja: byKey.moon.rashiJa, lord: RASHI[byKey.moon.rashiIndex].lord },
      sunRashi: { index: byKey.sun.rashiIndex, name: byKey.sun.rashi, ja: byKey.sun.rashiJa },
      nakshatra: moonNak,
      mayChange: mayChange,
      dashas: dashas,
      birthMs: birthMs
    };
  }

  // いま（todayMs）のマハーダシャーとアンタルダシャー
  function currentDasha(result, nowMs) {
    for (var i = 0; i < result.dashas.length; i++) {
      var md = result.dashas[i];
      if (nowMs >= md.start && nowMs < md.end) {
        var ad = md.sub.filter(function (s) { return nowMs >= s.start && nowMs < s.end; })[0];
        return {
          maha: { lord: md.lord, name: md.name, start: jstDate(Math.max(md.start, result.birthMs)), end: jstDate(md.end) },
          antar: ad ? { lord: ad.lord, name: ad.name, start: jstDate(ad.start), end: jstDate(ad.end) } : null,
          next: result.dashas[i + 1] ? { lord: result.dashas[i + 1].lord, name: result.dashas[i + 1].name, start: jstDate(result.dashas[i + 1].start) } : null
        };
      }
    }
    return null;
  }

  /* ---------------- アシュタクータ（36点） ---------------- */
  var VARNA = [1, 2, 3, 0, 1, 2, 3, 0, 1, 2, 3, 0]; // 0 ブラーフマナ 1 クシャトリヤ 2 ヴァイシャ 3 シュードラ（星座ごと）
  // 0 双方の動物（チャトゥシュパダ）1 人間（マナヴァ）2 水（ジャラチャラ）3 野生（ヴァナチャラ）4 虫（キータ）
  var VASHYA = [0, 0, 1, 2, 3, 1, 1, 4, 1, 0, 1, 2];
  // 射手座は前半（15°未満）が人間・後半が四足、山羊座は前半が四足・後半が水
  function vashyaOf(rashi, deg) {
    if (rashi === 8) return deg < 15 ? 1 : 0;
    if (rashi === 9) return deg < 15 ? 0 : 2;
    return VASHYA[rashi];
  }
  var VASHYA_SCORE = [
    [2, 1, 1, 0.5, 1], [1, 2, 0.5, 0, 1], [1, 0.5, 2, 1, 1], [0.5, 0, 1, 2, 0], [1, 1, 1, 0, 2]
  ];
  var YONI = [0, 1, 2, 3, 3, 4, 5, 2, 5, 6, 6, 7, 8, 9, 8, 9, 10, 10, 4, 11, 12, 11, 13, 0, 13, 7, 1];
  var YONI_NAMES = ["馬", "象", "羊", "蛇", "犬", "猫", "鼠", "牛", "水牛", "虎", "鹿", "猿", "マングース", "獅子"];
  var YONI_SCORE = [
    [4, 2, 2, 3, 2, 2, 2, 1, 0, 1, 3, 3, 2, 1],
    [2, 4, 3, 3, 2, 2, 2, 2, 3, 1, 2, 3, 2, 0],
    [2, 3, 4, 2, 1, 2, 1, 3, 3, 1, 2, 0, 3, 1],
    [3, 3, 2, 4, 2, 1, 1, 1, 1, 2, 2, 2, 0, 2],
    [2, 2, 1, 2, 4, 2, 1, 2, 2, 1, 0, 2, 1, 1],
    [2, 2, 2, 1, 2, 4, 0, 2, 2, 1, 3, 3, 2, 1],
    [2, 2, 1, 1, 1, 0, 4, 2, 2, 2, 2, 2, 1, 2],
    [1, 2, 3, 1, 2, 2, 2, 4, 3, 0, 3, 2, 2, 1],
    [0, 3, 3, 1, 2, 2, 2, 3, 4, 1, 2, 2, 2, 1],
    [1, 1, 1, 2, 1, 1, 2, 0, 1, 4, 1, 1, 2, 1],
    [3, 2, 2, 2, 0, 3, 2, 3, 2, 1, 4, 2, 2, 1],
    [3, 3, 0, 2, 2, 3, 2, 2, 2, 1, 2, 4, 3, 2],
    [2, 2, 3, 0, 1, 2, 1, 2, 2, 2, 2, 3, 4, 2],
    [1, 0, 1, 2, 1, 1, 2, 1, 1, 1, 1, 2, 2, 4]
  ];
  // ガナ：0 デーヴァ（神）1 マヌシャ（人）2 ラークシャサ（鬼）
  var GANA = [0, 1, 2, 1, 0, 1, 0, 0, 2, 2, 1, 1, 0, 2, 0, 2, 0, 2, 2, 1, 1, 0, 2, 2, 1, 1, 0];
  var GANA_NAMES = ["デーヴァ（神）", "マヌシャ（人）", "ラークシャサ（鬼）"];
  // [新郎のガナ][新婦のガナ]
  var GANA_SCORE = [[6, 6, 0], [5, 6, 0], [1, 0, 6]];
  // ナーディ：0 アーディ 1 マディヤ 2 アンティヤ
  var NADI = [0, 1, 2, 2, 1, 0, 0, 1, 2, 0, 1, 2, 2, 1, 0, 0, 1, 2, 0, 1, 2, 2, 1, 0, 0, 1, 2];
  var NADI_NAMES = ["アーディ", "マディヤ", "アンティヤ"];
  // 惑星どうしの友好関係（自然の関係）：1 友 0 中立 -1 敵
  var FRIENDS = {
    sun: { moon: 1, mars: 1, jupiter: 1, mercury: 0, venus: -1, saturn: -1 },
    moon: { sun: 1, mercury: 1, mars: 0, jupiter: 0, venus: 0, saturn: 0 },
    mars: { sun: 1, moon: 1, jupiter: 1, venus: 0, saturn: 0, mercury: -1 },
    mercury: { sun: 1, venus: 1, mars: 0, jupiter: 0, saturn: 0, moon: -1 },
    jupiter: { sun: 1, moon: 1, mars: 1, saturn: 0, mercury: -1, venus: -1 },
    venus: { mercury: 1, saturn: 1, mars: 0, jupiter: 0, sun: -1, moon: -1 },
    saturn: { mercury: 1, venus: 1, jupiter: 0, sun: -1, moon: -1, mars: -1 }
  };

  function relation(a, b) { return a === b ? 1 : FRIENDS[a][b]; }

  function grahaMaitri(la, lb) {
    if (la === lb) return 5;
    var x = relation(la, lb), y = relation(lb, la);
    if (x === 1 && y === 1) return 5;
    if ((x === 1 && y === 0) || (x === 0 && y === 1)) return 4;
    if (x === 0 && y === 0) return 3;
    if ((x === 1 && y === -1) || (x === -1 && y === 1)) return 1;
    if ((x === 0 && y === -1) || (x === -1 && y === 0)) return 0.5;
    return 0;
  }

  function taraScore(fromNak, toNak) {
    var t = mod(toNak - fromNak, 27) + 1;
    var r = t % 9;
    return [3, 5, 7].indexOf(r) >= 0 ? 0 : 1.5;
  }

  /*
   * アシュタクータ（boy＝新郎側、girl＝新婦側：月のラーシとナクシャトラ）
   */
  function ashtakoota(boy, girl) {
    var rb = boy.moonRashi.index, rg = girl.moonRashi.index;
    var nb = boy.nakshatra.index, ng = girl.nakshatra.index;
    var vb = VARNA[rb], vg = VARNA[rg];
    var items = [];
    items.push({ key: "varna", name: "ヴァルナ（役割・精神性）", max: 1, score: vb <= vg ? 1 : 0 });
    var db = boy.moonDegree == null ? 0 : boy.moonDegree, dg = girl.moonDegree == null ? 0 : girl.moonDegree;
    items.push({ key: "vashya", name: "ヴァシャ（惹かれ合い・主導権）", max: 2, score: VASHYA_SCORE[vashyaOf(rb, db)][vashyaOf(rg, dg)] });
    items.push({ key: "tara", name: "ターラ（運と健康）", max: 3, score: taraScore(ng, nb) + taraScore(nb, ng) });
    items.push({ key: "yoni", name: "ヨーニ（本能・親密さ）", max: 4, score: YONI_SCORE[YONI[nb]][YONI[ng]], detail: YONI_NAMES[YONI[nb]] + " × " + YONI_NAMES[YONI[ng]] });
    items.push({ key: "maitri", name: "グラハ・マイトリ（心の通い合い）", max: 5, score: grahaMaitri(RASHI[rb].lord, RASHI[rg].lord), detail: LORD_NAME[RASHI[rb].lord] + " × " + LORD_NAME[RASHI[rg].lord] });
    items.push({ key: "gana", name: "ガナ（気質）", max: 6, score: GANA_SCORE[GANA[nb]][GANA[ng]], detail: GANA_NAMES[GANA[nb]] + " × " + GANA_NAMES[GANA[ng]] });
    var dist = mod(rg - rb, 12) + 1; // 新郎から新婦まで（1〜12）
    var bad = [2, 12, 5, 9, 6, 8].indexOf(dist) >= 0 || [2, 12, 5, 9, 6, 8].indexOf(mod(rb - rg, 12) + 1) >= 0;
    var lb = RASHI[rb].lord, lg = RASHI[rg].lord;
    items.push({ key: "bhakoot", name: "バクート（暮らし・家族の繁栄）", max: 7, score: bad ? 0 : 7,
      exception: bad && (lb === lg || (relation(lb, lg) === 1 && relation(lg, lb) === 1)) });
    var sameNadi = NADI[nb] === NADI[ng];
    items.push({ key: "nadi", name: "ナーディ（体質・健康）", max: 8, score: sameNadi ? 0 : 8, detail: NADI_NAMES[NADI[nb]] + " × " + NADI_NAMES[NADI[ng]],
      exception: sameNadi && ((rb === rg && nb !== ng) || (nb === ng && rb !== rg)) });
    var total = items.reduce(function (s, x) { return s + x.score; }, 0);
    return { items: items, total: total };
  }

  function ensure(x) { return x && x.nakshatra ? x : calculateJyotish(x); }

  function calculateJyotishCompatibility(a, b) {
    var ra = ensure(a), rb = ensure(b);
    var asBoy = ashtakoota(ra, rb), asGirl = ashtakoota(rb, ra);
    return { person1: ra, person2: rb, youAsGroom: asBoy, youAsBride: asGirl, same: asBoy.total === asGirl.total };
  }

  return {
    RASHI: RASHI, NAKSHATRA: NAKSHATRA, DASHA_ORDER: DASHA_ORDER, DASHA_YEARS: DASHA_YEARS, LORD_NAME: LORD_NAME,
    YONI: YONI, GANA: GANA, NADI: NADI,
    ayanamsaAt: function (y, m, d, h, mi) { return ayanamsa(timeOf(y, m, d, h, mi)); },
    siderealAt: function (y, m, d, h, mi) { return siderealAll(timeOf(y, m, d, h, mi)); },
    nakshatraOf: nakshatraOf,
    calculateJyotish: calculateJyotish,
    currentDasha: currentDasha,
    ashtakoota: ashtakoota,
    grahaMaitri: grahaMaitri,
    calculateJyotishCompatibility: calculateJyotishCompatibility
  };
});
