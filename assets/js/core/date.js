/*
 * 生年月日の共通仕様（全占術で共有）
 *   年：4桁の数字 0001〜9999
 *   月：1〜12
 *   日：実在する日付（うるう年はグレゴリオ暦のルールを0001年まで遡って適用）
 * JavaScript の Date は0〜99年を1900年代として扱うため、検証には使わない。
 */
(function (root, factory) {
  var api = factory();
  if (typeof module === "object" && module.exports) {
    module.exports = api;
  } else {
    root.Karute = root.Karute || {};
    root.Karute.date = api;
  }
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";

  var MIN_YEAR = 1;
  var MAX_YEAR = 9999;

  function isLeapYear(year) {
    return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
  }

  function daysInMonth(year, month) {
    if (month === 2) return isLeapYear(year) ? 29 : 28;
    return [4, 6, 9, 11].indexOf(month) !== -1 ? 30 : 31;
  }

  function toText(value) {
    return value === undefined || value === null ? "" : String(value).trim();
  }

  // 全角数字を半角へ（スマホの日本語入力対策）
  function normalizeDigits(text) {
    return text.replace(/[０-９]/g, function (ch) {
      return String.fromCharCode(ch.charCodeAt(0) - 0xfee0);
    });
  }

  /**
   * @param {{year:any, month:any, day:any}} raw  フォームの値（文字列でも数値でもよい）
   * @returns {{ok:true, value:{year,month,day}} | {ok:false, errors:{year?:string, month?:string, day?:string}, message:string}}
   */
  function validateBirthDate(raw) {
    raw = raw || {};
    var yearText = normalizeDigits(toText(raw.year));
    var monthText = normalizeDigits(toText(raw.month));
    var dayText = normalizeDigits(toText(raw.day));
    var errors = {};

    if (yearText === "" && monthText === "" && dayText === "") {
      return { ok: false, errors: { year: "生年月日を入力してください。" }, message: "生年月日を入力してください。" };
    }

    var year = null, month = null, day = null;

    if (yearText === "") {
      errors.year = "年を入力してください。";
    } else if (!/^\d{4}$/.test(yearText)) {
      errors.year = "年は4桁の数字で入力してください（例：1992、0001）。";
    } else {
      year = Number(yearText);
      if (year < MIN_YEAR || year > MAX_YEAR) {
        errors.year = "年は0001〜9999の範囲で入力してください。";
        year = null;
      }
    }

    if (monthText === "") {
      errors.month = "月を選んでください。";
    } else if (!/^\d{1,2}$/.test(monthText) || Number(monthText) < 1 || Number(monthText) > 12) {
      errors.month = "月は1〜12で選んでください。";
    } else {
      month = Number(monthText);
    }

    if (dayText === "") {
      errors.day = "日を選んでください。";
    } else if (!/^\d{1,2}$/.test(dayText) || Number(dayText) < 1 || Number(dayText) > 31) {
      errors.day = "日は1〜31で選んでください。";
    } else {
      day = Number(dayText);
    }

    if (year !== null && month !== null && day !== null && day > daysInMonth(year, month)) {
      errors.day = pad(year, 4) + "年" + month + "月" + day + "日は存在しない日付です。";
    }

    var keys = Object.keys(errors);
    if (keys.length) {
      return { ok: false, errors: errors, message: errors[keys[0]] };
    }
    return { ok: true, value: { year: year, month: month, day: day } };
  }

  function pad(n, width) {
    var s = String(n);
    while (s.length < width) s = "0" + s;
    return s;
  }

  function formatJa(date) {
    return pad(date.year, 4) + "年" + date.month + "月" + date.day + "日";
  }

  function toIso(date) {
    return pad(date.year, 4) + "-" + pad(date.month, 2) + "-" + pad(date.day, 2);
  }

  // 日本時間の「今日」。占い結果の「今年」「今月」はこれを基準にする
  function todayInJapan(now) {
    var d = now ? new Date(now.getTime()) : new Date();
    var jst = new Date(d.getTime() + 9 * 60 * 60 * 1000);
    return { year: jst.getUTCFullYear(), month: jst.getUTCMonth() + 1, day: jst.getUTCDate() };
  }

  return {
    MIN_YEAR: MIN_YEAR,
    MAX_YEAR: MAX_YEAR,
    isLeapYear: isLeapYear,
    daysInMonth: daysInMonth,
    validateBirthDate: validateBirthDate,
    formatJa: formatJa,
    toIso: toIso,
    pad: pad,
    todayInJapan: todayInJapan
  };
});
