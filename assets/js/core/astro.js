/*
 * 天文計算（太陽の位置・月の満ち欠け）— 占術の分類に必要な精度の近似計算
 *
 * 採用アルゴリズム（Jean Meeus『Astronomical Algorithms』第2版）
 *   - ユリウス日：第7章（グレゴリオ暦を過去にも延長して適用）
 *   - 太陽の視黄経：第25章の低精度式（誤差 およそ0.01°＝時刻で15分程度、1800〜2100年）
 *   - 新月・満月の時刻：第49章（平均の朔望＋周期補正項。惑星による微小補正は省略、誤差は数分程度）
 *   - 節入りの時刻（九星気学用）：VSOP87D の短縮級数＋ΔT（下の「節気」の節を参照。sunLongitude とは別関数）
 *
 * 注意：
 *   - sunLongitude・新月・満月は「力学時（TT）」の式で、世界時（UT）との差 ΔT は無視している（星獣カルテ用。結果を変えないため据え置き）。
 *     ΔT は 1800〜2100年では数分以内だが、古代では数時間、遠い未来では予測できないほど大きくなる。
 *   - そのため、計算結果を「確認済み」とする範囲を VERIFIED_YEAR_MIN〜MAX に限定する。
 *     範囲外でも同じ式で計算はするが、呼び出し側は「推定」として扱うこと。
 *
 * ブラウザでは window.Karute.astro、Node では module.exports で使える。
 */
(function (root, factory) {
  var api = factory();
  if (typeof module === "object" && module.exports) {
    module.exports = api;
  } else {
    root.Karute = root.Karute || {};
    root.Karute.astro = api;
  }
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";

  var VERIFIED_YEAR_MIN = 1800;
  var VERIFIED_YEAR_MAX = 2100;
  var JST_OFFSET_DAYS = 9 / 24;
  var RAD = Math.PI / 180;

  function norm360(x) {
    x = x % 360;
    return x < 0 ? x + 360 : x;
  }

  function sinD(x) { return Math.sin(x * RAD); }

  // 暦の日付（グレゴリオ暦）＋ 世界時の時刻（日の小数）→ ユリウス日
  function julianDay(year, month, dayWithFraction) {
    var y = year, m = month;
    if (m <= 2) { y -= 1; m += 12; }
    var a = Math.floor(y / 100);
    var b = 2 - a + Math.floor(a / 4);
    return Math.floor(365.25 * (y + 4716)) + Math.floor(30.6001 * (m + 1)) + dayWithFraction + b - 1524.5;
  }

  // 日本時間の「その日の hour 時」→ ユリウス日
  function julianDayJst(year, month, day, hour) {
    return julianDay(year, month, day + hour / 24 - JST_OFFSET_DAYS);
  }

  // ユリウス日 → 日本時間の暦の日付
  function jstDateFromJulianDay(jd) {
    var z = Math.floor(jd + 0.5 + JST_OFFSET_DAYS);
    var alpha = Math.floor((z - 1867216.25) / 36524.25);
    var a = z + 1 + alpha - Math.floor(alpha / 4);
    var b = a + 1524;
    var c = Math.floor((b - 122.1) / 365.25);
    var d = Math.floor(365.25 * c);
    var e = Math.floor((b - d) / 30.6001);
    var day = b - d - Math.floor(30.6001 * e);
    var month = e < 14 ? e - 1 : e - 13;
    var year = month > 2 ? c - 4716 : c - 4715;
    return { year: year, month: month, day: day };
  }

  // 太陽の視黄経（度）
  function sunLongitude(jd) {
    var t = (jd - 2451545.0) / 36525;
    var l0 = 280.46646 + 36000.76983 * t + 0.0003032 * t * t;
    var m = 357.52911 + 35999.05029 * t - 0.0001537 * t * t;
    var c = (1.914602 - 0.004817 * t - 0.000014 * t * t) * sinD(m) +
      (0.019993 - 0.000101 * t) * sinD(2 * m) +
      0.000289 * sinD(3 * m);
    var omega = 125.04 - 1934.136 * t;
    return norm360(l0 + c - 0.00569 - 0.00478 * sinD(omega));
  }

  // 新月（phase=0）・満月（phase=0.5）の時刻（ユリウス日）。k は 2000年1月の新月を0とした朔望の番号
  function moonPhaseJd(k, phase) {
    var kk = k + phase;
    var t = kk / 1236.85;
    var t2 = t * t, t3 = t2 * t, t4 = t3 * t;
    var jde = 2451550.09766 + 29.530588861 * kk + 0.00015437 * t2 - 0.000000150 * t3 + 0.00000000073 * t4;
    var e = 1 - 0.002516 * t - 0.0000074 * t2;
    var m = 2.5534 + 29.10535670 * kk - 0.0000014 * t2 - 0.00000011 * t3;
    var mp = 201.5643 + 385.81693528 * kk + 0.0107582 * t2 + 0.00001238 * t3 - 0.000000058 * t4;
    var f = 160.7108 + 390.67050284 * kk - 0.0016118 * t2 - 0.00000227 * t3 + 0.000000011 * t4;
    var om = 124.7746 - 1.56375588 * kk + 0.0020672 * t2 + 0.00000215 * t3;

    var isNew = phase === 0;
    var corr =
      (isNew ? -0.40720 : -0.40614) * sinD(mp) +
      (isNew ? 0.17241 : 0.17302) * e * sinD(m) +
      (isNew ? 0.01608 : 0.01614) * sinD(2 * mp) +
      (isNew ? 0.01039 : 0.01043) * sinD(2 * f) +
      (isNew ? 0.00739 : 0.00734) * e * sinD(mp - m) +
      (isNew ? -0.00514 : -0.00515) * e * sinD(mp + m) +
      (isNew ? 0.00208 : 0.00209) * e * e * sinD(2 * m) +
      -0.00111 * sinD(mp - 2 * f) +
      -0.00057 * sinD(mp + 2 * f) +
      0.00056 * e * sinD(2 * mp + m) +
      -0.00042 * sinD(3 * mp) +
      0.00042 * e * sinD(m + 2 * f) +
      0.00038 * e * sinD(m - 2 * f) +
      -0.00024 * e * sinD(2 * mp - m) +
      -0.00017 * sinD(om) +
      -0.00007 * sinD(mp + 2 * m) +
      0.00004 * sinD(2 * mp - 2 * f) +
      0.00004 * sinD(3 * m) +
      0.00003 * sinD(mp + m - 2 * f) +
      0.00003 * sinD(2 * mp + 2 * f) +
      -0.00003 * sinD(mp + m + 2 * f) +
      0.00003 * sinD(mp - m + 2 * f) +
      -0.00002 * sinD(mp - m - 2 * f) +
      -0.00002 * sinD(3 * mp + m) +
      0.00002 * sinD(4 * mp);
    return jde + corr;
  }

  function newMoonJd(k) { return moonPhaseJd(k, 0); }
  function fullMoonJd(k) { return moonPhaseJd(k, 0.5); }

  /**
   * ある時刻を含む朔望月（新月から次の新月まで）と、その中での位置
   * @returns {{ previousNewMoon, nextNewMoon, age, length, fraction }}
   *   age：直前の新月からの日数（月齢）、fraction：0（新月）〜1（次の新月の直前）
   */
  function lunation(jd) {
    var k = Math.floor((jd - 2451550.09766) / 29.530588861);
    var prev = newMoonJd(k);
    var guard = 0;
    while (prev > jd && guard++ < 5) { k -= 1; prev = newMoonJd(k); }
    var next = newMoonJd(k + 1);
    while (next <= jd && guard++ < 10) { k += 1; prev = next; next = newMoonJd(k + 1); }
    var length = next - prev;
    var age = jd - prev;
    return { k: k, previousNewMoon: prev, nextNewMoon: next, age: age, length: length, fraction: age / length };
  }

  /* ------------------------------------------------------------------
   * 節気（二十四節気）の時刻を求めるための高精度な太陽黄経
   *
   * 上の sunLongitude（低精度式）は星獣カルテの「日単位の季節分類」に使っており、結果を変えないために
   * そのまま残す。九星気学では節入りの「時刻」まで必要なので、次の方式を別関数として用意した。
   *
   *   - 地球の日心黄経：VSOP87D（Bretagnon & Francou 1988）の級数を、振幅 1e-7 rad 未満の項を省いて使用
   *     （係数は公開されている VSOP87 データの値。省いた項による誤差は 1秒角程度＝時刻で30秒程度以下）
   *   - FK5 補正 −0.09033″、章動は Meeus 第22章の簡略式（誤差 0.5″程度）、光行差 −20.4898″/R
   *   - ΔT（力学時 TT − 世界時 UT）：NASA の Espenak & Meeus による多項式
   *     （https://eclipse.gsfc.nasa.gov/SEhelp/deltatpoly2004.html）
   *
   * 検証（tests/kyusei.test.js）：国立天文台「暦要項」の二十四節気（2005, 2010, 2015, 2020〜2027年の
   * 12節すべて）と比べて、差は最大でおよそ0.6分。国立天文台は分単位（四捨五入）で公表している。
   * ------------------------------------------------------------------ */

  // VSOP87D 地球 L0〜L5：[振幅(rad), 位相(rad), 周波数(rad/千年)] を平らに並べたもの
  var EARTH_L = [
    [ // L0（93項）
      1.753470457,0,0, 0.03341656456,4.6692568042,6283.07585, 0.00034894275,4.6261024176,12566.1517,
      0.00003417571,2.8288657961,3.5231183, 0.00003497056,2.7441180097,5753.3848849, 0.00003135896,3.6276704176,77713.7714681,
      0.00002676218,4.418083514,7860.4193924, 0.00002342687,6.1351623763,3930.2096962, 0.00001273166,2.0370965577,529.6909651,
      0.00001324292,0.7424635635,11506.7697698, 0.00000901855,2.0450544351,26.2983198, 0.00001199167,1.1096294432,1577.3435424,
      0.00000857223,3.5084915696,398.1490034, 0.00000779786,1.1788265211,5223.6939198, 0.0000099025,5.2326812959,5884.9268466,
      0.00000753141,2.5333905382,5507.5532387, 0.00000505264,4.5829256305,18849.22755, 0.00000492379,4.2050663986,775.5226113,
      0.00000356655,2.9195411687,0.0673103, 0.00000284125,1.8986903419,796.2980068, 0.0000024281,0.3448114091,5486.7778432,
      0.00000317087,5.8490195222,11790.6290887, 0.00000271039,0.3148860765,10977.0788047, 0.0000020616,4.8064660606,2544.3144199,
      0.00000205385,1.8694781369,5573.1428014, 0.00000202261,2.4576779546,6069.7767546, 0.00000126184,1.0830263021,20.7753955,
      0.00000155516,0.8330607381,213.2990954, 0.00000115132,0.6454491168,0.9803211, 0.00000102851,0.6359984673,4694.0029547,
      0.00000101724,4.2667982136,7.113547, 9.9206e-7,6.2099294026,2146.1654165, 0.00000132212,3.4111827556,2942.4634233,
      9.7607e-7,0.6810127227,155.4203994, 8.5128e-7,1.2987074302,6275.962303, 7.4651e-7,1.7550891616,5088.6288398,
      0.00000101895,0.9756922182,15720.8387849, 8.4711e-7,3.6708009302,71430.6956181, 7.3547e-7,4.6792656548,801.8209311,
      7.3874e-7,3.5031944317,3154.6870849, 7.8756e-7,3.0369831314,12036.4607349, 7.9637e-7,1.807913307,17260.1546547,
      8.5803e-7,5.9832263126,161000.6857377, 5.6963e-7,2.7843039804,6286.5989683, 6.1148e-7,1.8183981102,7084.8967811,
      6.9627e-7,0.8329759697,9437.7629349, 5.6116e-7,4.3869488078,14143.4952424, 6.2449e-7,3.9776388059,8827.3902699,
      5.1145e-7,0.283068645,5856.4776591, 5.5577e-7,3.4700600906,6279.5527316, 4.1036e-7,5.368173514,8429.2412665,
      5.1605e-7,1.3328274698,1748.0164131, 5.1992e-7,0.1891494583,12139.5535091, 4.9e-7,0.4873506503,1194.4470102,
      3.92e-7,6.1683299502,10447.3878396, 3.5566e-7,1.7759731469,6812.7668151, 3.677e-7,6.0413385935,10213.2855462,
      3.6596e-7,2.5695523863,1059.3819302, 3.3291e-7,0.5930949946,17789.8456198, 3.5954e-7,1.708761119,2352.8661538,
      4.0938e-7,2.3985088171,19651.0484811, 3.0047e-7,2.7397512393,1349.8674097, 3.0412e-7,0.4429446414,83996.8473181,
      2.3663e-7,0.4847356776,8031.0922631, 2.3574e-7,2.0652772005,3340.6124267, 2.1089e-7,4.148254641,951.7184063,
      2.4738e-7,0.2148476214,3.5904287, 2.5352e-7,3.164709534,4690.4798364, 2.282e-7,5.2219788803,4705.7323075,
      2.1419e-7,1.4256373552,16730.4636896, 2.1891e-7,5.5559430256,553.5694028, 1.7481e-7,4.5605290036,135.06508,
      1.9925e-7,5.2220847127,12168.0026966, 1.986e-7,5.7747016765,6309.3741698, 2.03e-7,0.3713379295,283.8593189,
      1.4421e-7,4.1931533255,242.728604, 1.6225e-7,5.9883772256,11769.8536932, 1.5077e-7,4.1956718107,6256.7775302,
      1.9124e-7,3.8221999695,23581.2581773, 1.8888e-7,5.3862688097,149854.4001348, 1.4346e-7,3.7235508442,38.0276726,
      1.7898e-7,2.2149073565,13367.9726311, 1.2054e-7,2.6222958835,955.5997416, 1.1287e-7,0.1773932809,4164.3119896,
      1.3971e-7,4.4013814,6681.2248534, 1.3621e-7,1.8893447141,7632.9432597, 1.2503e-7,1.1305241221,5.5229243,
      1.0498e-7,5.3590951867,1592.5960136, 1.0327e-7,6.1998256613,6438.4962494, 1.2003e-7,1.003514567,632.7837393,
      1.0827e-7,0.3273452022,103.0927742, 1.0005e-7,6.0291496328,5746.2713379, 1.0523e-7,0.9387180551,11926.2544137
    ],
    [ // L1（27項）
      6283.319667,0,0, 0.00206058863,2.6782345558,6283.07585, 0.0000430343,2.6351265041,12566.1517,
      0.00000425264,1.5904698073,3.5231183, 0.00000108977,2.9661800199,1577.3435424, 9.3478e-7,2.5921283537,18849.22755,
      0.00000119261,5.795574878,26.2983198, 7.2122e-7,1.138461582,529.6909651, 6.7768e-7,1.8747230479,398.1490034,
      6.7327e-7,4.4091823517,5507.5532387, 5.9027e-7,2.8879703846,5223.6939198, 5.5976e-7,2.1747168026,155.4203994,
      4.5407e-7,0.3980307981,796.2980068, 3.6369e-7,0.4662473984,775.5226113, 2.8958e-7,2.6470738388,7.113547,
      1.9097e-7,1.8462833258,5486.7778432, 2.0844e-7,5.3413827515,0.9803211, 1.8508e-7,4.9685512458,213.2990954,
      1.6233e-7,0.0321648305,2544.3144199, 1.7293e-7,2.9911686495,6275.962303, 1.5832e-7,1.4304928533,2146.1654165,
      1.4615e-7,1.2053236632,10977.0788047, 1.1877e-7,3.2580481561,5088.6288398, 1.1514e-7,2.0750241815,4694.0029547,
      1.2461e-7,2.8343228551,1748.0164131, 1.1808e-7,5.2737979048,1194.4470102, 1.0641e-7,0.766141992,553.5694028
    ],
    [ // L2（6項）
      0.0005291887,0,0, 0.00008719837,1.0720966524,6283.07585, 0.00000309125,0.8672881883,12566.1517,
      2.7339e-7,0.0529787169,3.5231183, 1.6334e-7,5.1882669104,26.2983198, 1.5752e-7,3.6845788943,155.4203994
    ],
    [ // L3（3項）
      0.00000289226,5.8438419872,6283.07585, 3.4955e-7,0,0, 1.6819e-7,5.4876691235,12566.1517
    ],
    [ // L4（1項）
      0.00000114084,3.1415926536,0
    ],
    [ // L5（0項）

    ]
  ];

  // ΔT（秒）。year は小数付きの年（例：2024.5）。Espenak & Meeus（NASA）の多項式
  function deltaT(year) {
    var y = year, u;
    if (y < -500) { u = (y - 1820) / 100; return -20 + 32 * u * u; }
    if (y < 500) {
      u = y / 100;
      return 10583.6 - 1014.41 * u + 33.78311 * u * u - 5.952053 * Math.pow(u, 3) - 0.1798452 * Math.pow(u, 4) +
        0.022174192 * Math.pow(u, 5) + 0.0090316521 * Math.pow(u, 6);
    }
    if (y < 1600) {
      u = (y - 1000) / 100;
      return 1574.2 - 556.01 * u + 71.23472 * u * u + 0.319781 * Math.pow(u, 3) - 0.8503463 * Math.pow(u, 4) -
        0.005050998 * Math.pow(u, 5) + 0.0083572073 * Math.pow(u, 6);
    }
    if (y < 1700) { u = y - 1600; return 120 - 0.9808 * u - 0.01532 * u * u + Math.pow(u, 3) / 7129; }
    if (y < 1800) {
      u = y - 1700;
      return 8.83 + 0.1603 * u - 0.0059285 * u * u + 0.00013336 * Math.pow(u, 3) - Math.pow(u, 4) / 1174000;
    }
    if (y < 1860) {
      u = y - 1800;
      return 13.72 - 0.332447 * u + 0.0068612 * u * u + 0.0041116 * Math.pow(u, 3) - 0.00037436 * Math.pow(u, 4) +
        0.0000121272 * Math.pow(u, 5) - 0.0000001699 * Math.pow(u, 6) + 0.000000000875 * Math.pow(u, 7);
    }
    if (y < 1900) {
      u = y - 1860;
      return 7.62 + 0.5737 * u - 0.251754 * u * u + 0.01680668 * Math.pow(u, 3) - 0.0004473624 * Math.pow(u, 4) +
        Math.pow(u, 5) / 233174;
    }
    if (y < 1920) {
      u = y - 1900;
      return -2.79 + 1.494119 * u - 0.0598939 * u * u + 0.0061966 * Math.pow(u, 3) - 0.000197 * Math.pow(u, 4);
    }
    if (y < 1941) { u = y - 1920; return 21.20 + 0.84493 * u - 0.076100 * u * u + 0.0020936 * Math.pow(u, 3); }
    if (y < 1961) { u = y - 1950; return 29.07 + 0.407 * u - u * u / 233 + Math.pow(u, 3) / 2547; }
    if (y < 1986) { u = y - 1975; return 45.45 + 1.067 * u - u * u / 260 - Math.pow(u, 3) / 718; }
    if (y < 2005) {
      u = y - 2000;
      return 63.86 + 0.3345 * u - 0.060374 * u * u + 0.0017275 * Math.pow(u, 3) + 0.000651814 * Math.pow(u, 4) +
        0.00002373599 * Math.pow(u, 5);
    }
    if (y < 2050) { u = y - 2000; return 62.92 + 0.32217 * u + 0.005589 * u * u; }
    if (y < 2150) { u = (y - 1820) / 100; return -20 + 32 * u * u - 0.5628 * (2150 - y); }
    u = (y - 1820) / 100;
    return -20 + 32 * u * u;
  }

  function yearOfJulianDay(jd) {
    return 2000 + (jd - 2451545.0) / 365.2425;
  }

  // 太陽の視黄経（度・高精度）。jdTT は力学時のユリウス日
  function apparentSunLongitude(jdTT) {
    var tau = (jdTT - 2451545.0) / 365250; // ユリウス千年
    var lon = 0, power = 1;
    for (var i = 0; i < EARTH_L.length; i++) {
      var s = 0, series = EARTH_L[i];
      for (var j = 0; j < series.length; j += 3) s += series[j] * Math.cos(series[j + 1] + series[j + 2] * tau);
      lon += s * power;
      power *= tau;
    }
    var t = tau * 10; // ユリウス世紀
    var sun = lon / RAD + 180 - 0.09033 / 3600;
    // 章動（黄経）
    var omega = 125.04452 - 1934.136261 * t;
    var ls = 280.4665 + 36000.7698 * t;
    var lm = 218.3165 + 481267.8813 * t;
    var dpsi = -17.20 * sinD(omega) - 1.32 * sinD(2 * ls) - 0.23 * sinD(2 * lm) + 0.21 * sinD(2 * omega);
    // 光行差（距離 R は低精度式で十分）
    var m = 357.52911 + 35999.05029 * t;
    var e = 0.016708634 - 0.000042037 * t;
    var c = (1.914602 - 0.004817 * t) * sinD(m) + (0.019993 - 0.000101 * t) * sinD(2 * m) + 0.000289 * sinD(3 * m);
    var r = 1.000001018 * (1 - e * e) / (1 + e * Math.cos((m + c) * RAD));
    return norm360(sun + dpsi / 3600 - 20.4898 / 3600 / r);
  }

  // 世界時のユリウス日 → 太陽の視黄経（高精度・ΔT を考慮）
  function apparentSunLongitudeUt(jdUT) {
    return apparentSunLongitude(jdUT + deltaT(yearOfJulianDay(jdUT)) / 86400);
  }

  /**
   * 太陽の視黄経が longitude（度）になる時刻（世界時のユリウス日）を、jdGuess の近く（±半月程度）で求める
   */
  function solarLongitudeCrossing(longitude, jdGuess) {
    var jd = jdGuess;
    for (var i = 0; i < 20; i++) {
      var diff = longitude - apparentSunLongitudeUt(jd);
      diff = ((diff % 360) + 540) % 360 - 180;
      var step = diff / 360 * 365.2422;
      jd += step;
      if (Math.abs(step) < 1e-8) break;
    }
    return jd;
  }

  /**
   * 時刻 jdUT の直前（jdUT を含む）に太陽の視黄経が longitude になった時刻
   * 例：previousSolarLongitudeTime(jd, 315) → その時点から見て直近の立春
   */
  function previousSolarLongitudeTime(jdUT, longitude) {
    var behind = norm360(apparentSunLongitudeUt(jdUT) - longitude);
    var jd = solarLongitudeCrossing(longitude, jdUT - behind / 360 * 365.2422);
    if (jd > jdUT) jd = solarLongitudeCrossing(longitude, jd - 365.2422);
    return jd;
  }

  /**
   * 指定した年（グレゴリオ暦）の春分を起点に、黄経 longitude になる時刻を探す
   * 例：solarLongitudeTime(2024, 315) → 2024年の立春。黄経 270° 以上（小寒・大寒）は春分より前（1月）で探す
   * 遠い年代では暦とのずれで小寒が前年12月末になることもあるため、「ある時点の節」は previousSolarLongitudeTime で求めること
   */
  function solarLongitudeTime(year, longitude) {
    var offset = longitude >= 270 ? longitude - 360 : longitude;
    return solarLongitudeCrossing(longitude, julianDay(year, 3, 20.5) + offset / 360 * 365.2422);
  }

  // ユリウス日（世界時）→ 日本時間の日付と時刻
  function jstDateTimeFromJulianDay(jd) {
    var date = jstDateFromJulianDay(jd);
    var local = jd + 0.5 + JST_OFFSET_DAYS;
    var seconds = Math.round((local - Math.floor(local)) * 86400 * 1000) / 1000;
    if (seconds >= 86400) { seconds = 86399.999; }
    return {
      year: date.year, month: date.month, day: date.day,
      hour: Math.floor(seconds / 3600),
      minute: Math.floor((seconds % 3600) / 60),
      second: seconds % 60
    };
  }


  function isVerifiedYear(year) {
    return year >= VERIFIED_YEAR_MIN && year <= VERIFIED_YEAR_MAX;
  }

  return {
    VERIFIED_YEAR_MIN: VERIFIED_YEAR_MIN,
    VERIFIED_YEAR_MAX: VERIFIED_YEAR_MAX,
    julianDay: julianDay,
    julianDayJst: julianDayJst,
    jstDateFromJulianDay: jstDateFromJulianDay,
    sunLongitude: sunLongitude,
    newMoonJd: newMoonJd,
    fullMoonJd: fullMoonJd,
    lunation: lunation,
    isVerifiedYear: isVerifiedYear,
    deltaT: deltaT,
    apparentSunLongitude: apparentSunLongitude,
    apparentSunLongitudeUt: apparentSunLongitudeUt,
    solarLongitudeCrossing: solarLongitudeCrossing,
    previousSolarLongitudeTime: previousSolarLongitudeTime,
    solarLongitudeTime: solarLongitudeTime,
    jstDateTimeFromJulianDay: jstDateTimeFromJulianDay
  };
});
