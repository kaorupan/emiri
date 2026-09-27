/*
 * 端末内保存（localStorage）の安全な窓口。
 * プライベートモードや設定でlocalStorageが使えない場合でも例外を出さず、
 * isAvailable() が false になるだけにする。
 *
 * Karute.storage.jsonStore("uranai-karute:tarot") で { load, save, clear } を返す。
 */
(function (root) {
  "use strict";
  var Karute = root.Karute = root.Karute || {};

  function backend() {
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

  function jsonStore(key) {
    return {
      isAvailable: function () { return backend() !== null; },
      load: function () {
        var s = backend();
        if (!s) return null;
        try {
          var raw = s.getItem(key);
          return raw ? JSON.parse(raw) : null;
        } catch (e) {
          return null;
        }
      },
      save: function (value) {
        var s = backend();
        if (!s) return false;
        try {
          s.setItem(key, JSON.stringify(value));
          return true;
        } catch (e) {
          return false;
        }
      },
      clear: function () {
        var s = backend();
        if (!s) return false;
        try { s.removeItem(key); return true; } catch (e) { return false; }
      }
    };
  }

  Karute.storage = { isAvailable: function () { return backend() !== null; }, jsonStore: jsonStore };
})(typeof self !== "undefined" ? self : this);
