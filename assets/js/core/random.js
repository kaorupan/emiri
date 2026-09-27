/*
 * 乱数源（0以上1未満）。使えるなら暗号用乱数（crypto.getRandomValues）を使う。
 * 占術エンジンにはこの関数を渡す。テストでは別の関数を渡して結果を検証できる。
 */
(function (root) {
  "use strict";
  var Karute = root.Karute = root.Karute || {};

  function secureRandom() {
    var c = root.crypto;
    if (c && typeof c.getRandomValues === "function") {
      var buf = new Uint32Array(1);
      c.getRandomValues(buf);
      return buf[0] / 4294967296; // 2^32 で割って [0, 1)
    }
    return Math.random();
  }

  Karute.random = { secure: secureRandom };
})(typeof self !== "undefined" ? self : this);
