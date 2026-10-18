/*
 * 電話番号占い
 *   下4桁法：電話番号の下4桁を80で割った余り（0のときは80）を、81数の吉凶（content/seimei-numbers.js）で読む。
 *   数秘術：すべての数字を足して1けたにした数（11・22・33は残す）で、その番号が持つ雰囲気を読む。
 *   電話番号はどこにも送らない・保存しない（ページ側でも保存しない）。
 *
 * ブラウザでは window.KaruteContent.denwa、Node では module.exports。
 */
(function (root, factory) {
  var api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  root.KaruteContent = root.KaruteContent || {};
  root.KaruteContent.denwa = api;
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";

  function digitsOf(s) { return String(s || "").normalize("NFKC").replace(/[^0-9]/g, ""); }
  function reduce(n) {
    while (n > 9 && n !== 11 && n !== 22 && n !== 33) n = String(n).split("").reduce(function (a, b) { return a + Number(b); }, 0);
    return n;
  }

  /** 下4桁 → 1〜80 */
  function remainderOf(last4) { var r = Number(last4) % 80; return r === 0 ? 80 : r; }

  /**
   * @param phone 電話番号（ハイフン・空白・全角でもよい）
   * @param NUM content/seimei-numbers.js
   * @returns {ok, digits, last4, remainder, meaning, sum, numerology}
   */
  function read(phone, NUM) {
    var d = digitsOf(phone);
    if (d.length < 4) return { ok: false, reason: "short" };
    if (d.length > 15) return { ok: false, reason: "long" };
    var last4 = d.slice(-4), r = remainderOf(last4);
    var sum = d.split("").reduce(function (a, b) { return a + Number(b); }, 0);
    return { ok: true, digits: d.length, last4: last4, remainder: r, meaning: NUM.number(r), sum: sum, numerology: reduce(sum) || 0 };
  }

  /** 81数の中で、指定した吉凶になる余り（1〜80） */
  function remaindersBy(luck, NUM) {
    var out = [];
    for (var r = 1; r <= 80; r++) if (NUM.number(r).luck === luck) out.push(r);
    return out;
  }

  return { read: read, remainderOf: remainderOf, digitsOf: digitsOf, remaindersBy: remaindersBy, reduce: reduce };
});
