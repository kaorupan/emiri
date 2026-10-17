/*
 * サイト内検索のしくみ（表記ゆれをそろえて、すべての言葉を含むページを点数順に並べる）
 *   ブラウザでは window.KaruteSearchCore、Node では module.exports（テスト用）。
 */
(function (root, factory) {
  var api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  root.KaruteSearchCore = api;
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";
  function norm(s) {
    s = String(s || "").normalize ? String(s || "").normalize("NFKC") : String(s || "");
    s = s.toLowerCase().replace(/[ァ-ヶ]/g, function (c) { return String.fromCharCode(c.charCodeAt(0) - 0x60); });
    return s.replace(/[・｜|、。,.!?！？「」『』（）()【】]/g, " ").replace(/\s+/g, " ").trim();
  }
  function tokens(q) { return norm(q).split(" ").filter(Boolean); }

  function search(index, q) {
    var ts = tokens(q);
    if (!ts.length) return [];
    var out = [];
    index.forEach(function (e) {
      if (!e._t) { e._t = norm(e.t); e._k = norm(e.k + " " + e.c); e._d = norm(e.d); }
      var score = 0;
      for (var i = 0; i < ts.length; i++) {
        var w = ts[i], s = 0;
        if (e._t.indexOf(w) >= 0) s += 6;
        if (e._k.indexOf(w) >= 0) s += 4;
        if (e._d.indexOf(w) >= 0) s += 1;
        if (!s) return;          // すべての言葉を含むものだけ
        score += s;
      }
      score += e.p ? 5 : 0;      // 占いそのもの（一覧に載っているもの）を上に
      if (e._t.indexOf(norm(q)) === 0) score += 3;
      out.push({ e: e, score: score });
    });
    out.sort(function (a, b) { return b.score - a.score || a.e.t.length - b.e.t.length; });
    return out.map(function (x) { return x.e; });
  }

  return { norm: norm, tokens: tokens, search: search };
});
