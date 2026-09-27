/*
 * 天文計算（太陽の位置・月の満ち欠け）— 占術の分類に必要な精度の近似計算
 *
 * 採用アルゴリズム（Jean Meeus『Astronomical Algorithms』第2版）
 *   - ユリウス日：第7章（グレゴリオ暦を過去にも延長して適用）
 *   - 太陽の視黄経：第25章の低精度式（誤差 およそ0.01°＝時刻で15分程度、1800〜2100年）
 *   - 新月・満月の時刻：第49章（平均の朔望＋周期補正項。惑星による微小補正は省略、誤差は数分程度）
 *
 * 注意：
 *   - 計算は「力学時（TT）」で行い、世界時（UT）との差 ΔT は無視している。
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
    isVerifiedYear: isVerifiedYear
  };
});
