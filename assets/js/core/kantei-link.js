/*
 * 無料の総合鑑定書（LINE）のリンク：入力内容 ⇔ URL の ?d= の値
 *   { v:1, p:{name,year,month,day,sei?,mei?,time?}, q?:{…}, m:[年,月,日] } を JSON → UTF-8 → base64url
 *   m は作成日。いつ開いても同じ内容になるよう、作った日を入れておく。
 */
(function (root, factory) {
  var api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  root.Karute = root.Karute || {};
  root.Karute.kanteiLink = api;
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";
  var TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;

  function utf8ToB64url(s) {
    var b64;
    if (typeof Buffer !== "undefined") b64 = Buffer.from(s, "utf8").toString("base64");
    else b64 = btoa(unescape(encodeURIComponent(s)));
    return b64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  }
  function b64urlToUtf8(s) {
    var b64 = String(s).replace(/-/g, "+").replace(/_/g, "/");
    while (b64.length % 4) b64 += "=";
    if (typeof Buffer !== "undefined") return Buffer.from(b64, "base64").toString("utf8");
    return decodeURIComponent(escape(atob(b64)));
  }
  function clean(s, max) { return String(s == null ? "" : s).replace(/[\u0000-\u001f\u007f<>]/g, "").trim().slice(0, max); }

  function person(p, needName) {
    if (!p || typeof p !== "object") return null;
    var y = Number(p.year), m = Number(p.month), d = Number(p.day);
    if (!(y >= 1900 && y <= 2100 && m >= 1 && m <= 12 && d >= 1 && d <= 31)) return null;
    var dt = new Date(Date.UTC(y, m - 1, d));
    if (dt.getUTCMonth() !== m - 1) return null;
    var out = { name: clean(p.name, 20), year: y, month: m, day: d };
    if (needName && !out.name) return null;
    var sei = clean(p.sei, 10), mei = clean(p.mei, 10);
    if (sei && mei) { out.sei = sei; out.mei = mei; }
    var t = clean(p.time, 5);
    if (t && TIME_RE.test(t)) out.time = t;
    return out;
  }

  function encode(data) {
    var p = person(data.p, true);
    if (!p) throw new Error("入力内容が正しくありません");
    var obj = { v: 1, p: p, m: data.m };
    if (data.q) { var q = person(data.q, true); if (!q) throw new Error("お相手の入力内容が正しくありません"); obj.q = q; }
    return utf8ToB64url(JSON.stringify(obj));
  }

  function decode(s) {
    try {
      var o = JSON.parse(b64urlToUtf8(s));
      if (!o || o.v !== 1) return null;
      var p = person(o.p, true);
      if (!p) return null;
      var q = o.q ? person(o.q, true) : null;
      var m = Array.isArray(o.m) ? o.m.map(Number) : null;
      if (!m || !(m[0] >= 2020 && m[0] <= 2200 && m[1] >= 1 && m[1] <= 12 && m[2] >= 1 && m[2] <= 31)) return null;
      return { p: p, q: q, made: { year: m[0], month: m[1], day: m[2] } };
    } catch (e) { return null; }
  }

  return { encode: encode, decode: decode, person: person };
});
