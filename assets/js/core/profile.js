/*
 * 共通プロフィール（端末内保存）
 *
 * 方針：
 *  - 利用者が「この端末に保存する」を明示的に選んだときだけ保存する。初期値は保存しない。
 *  - 保存するのは生年月日だけ。出生時間・出生地は、必要な占術が出るまで扱わない。
 *  - サーバーには送らない。localStorage が使えない環境（プライベートモード等）でもエラーにしない。
 *  - 相性占いのお相手の生年月日は保存しない。
 */
(function (root) {
  "use strict";
  var Karute = root.Karute = root.Karute || {};

  var STORAGE_KEY = "uranai-karute:profile";
  var VERSION = 1;

  function storage() {
    try {
      var s = root.localStorage;
      var probe = "__karute_probe__";
      s.setItem(probe, "1");
      s.removeItem(probe);
      return s;
    } catch (e) {
      return null;
    }
  }

  function load() {
    var s = storage();
    if (!s) return null;
    try {
      var raw = s.getItem(STORAGE_KEY);
      if (!raw) return null;
      var data = JSON.parse(raw);
      if (!data || data.version !== VERSION || !data.birthDate) return null;
      var check = Karute.date.validateBirthDate(data.birthDate);
      return check.ok ? { birthDate: check.value } : null;
    } catch (e) {
      return null;
    }
  }

  function saveBirthDate(birthDate) {
    var s = storage();
    if (!s) return false;
    try {
      s.setItem(STORAGE_KEY, JSON.stringify({
        version: VERSION,
        birthDate: { year: birthDate.year, month: birthDate.month, day: birthDate.day }
      }));
      return true;
    } catch (e) {
      return false;
    }
  }

  function clear() {
    var s = storage();
    if (!s) return false;
    try {
      s.removeItem(STORAGE_KEY);
      return true;
    } catch (e) {
      return false;
    }
  }

  Karute.profile = {
    isAvailable: function () { return storage() !== null; },
    load: load,
    saveBirthDate: saveBirthDate,
    clear: clear
  };
})(typeof self !== "undefined" ? self : this);
