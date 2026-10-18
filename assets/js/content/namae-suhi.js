/*
 * 名前の数秘術（ひらがな・カタカナ・ローマ字）
 *   名前をローマ字（ヘボン式）にして、A=1 … I=9、J=1 … のピタゴラス式の表で数字にする。
 *     ソウルナンバー：母音（a・i・u・e・o）の合計 … 心の奥の願い
 *     パーソナリティナンバー：子音の合計 … まわりに見せる顔
 *     ディスティニーナンバー：すべての文字の合計 … 名前が持つ役割
 *   11・22・33 はマスターナンバーとして残す。
 *   相性：ふたりのソウルナンバー（心）とディスティニーナンバー（役割）の組み合わせで見る。
 *     同じ数字／同じグループ（1・5・7、2・4・8、3・6・9）／ちがうグループ の3段階（えみりの読み方）
 *
 * ブラウザでは window.KaruteContent.namaeSuhi、Node では module.exports。
 */
(function (root, factory) {
  var api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  root.KaruteContent = root.KaruteContent || {};
  root.KaruteContent.namaeSuhi = api;
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";

  // ひらがな → ローマ字（ヘボン式）
  var KANA = {
    "あ": "a", "い": "i", "う": "u", "え": "e", "お": "o",
    "か": "ka", "き": "ki", "く": "ku", "け": "ke", "こ": "ko", "が": "ga", "ぎ": "gi", "ぐ": "gu", "げ": "ge", "ご": "go",
    "さ": "sa", "し": "shi", "す": "su", "せ": "se", "そ": "so", "ざ": "za", "じ": "ji", "ず": "zu", "ぜ": "ze", "ぞ": "zo",
    "た": "ta", "ち": "chi", "つ": "tsu", "て": "te", "と": "to", "だ": "da", "ぢ": "ji", "づ": "zu", "で": "de", "ど": "do",
    "な": "na", "に": "ni", "ぬ": "nu", "ね": "ne", "の": "no",
    "は": "ha", "ひ": "hi", "ふ": "fu", "へ": "he", "ほ": "ho", "ば": "ba", "び": "bi", "ぶ": "bu", "べ": "be", "ぼ": "bo",
    "ぱ": "pa", "ぴ": "pi", "ぷ": "pu", "ぺ": "pe", "ぽ": "po",
    "ま": "ma", "み": "mi", "む": "mu", "め": "me", "も": "mo",
    "や": "ya", "ゆ": "yu", "よ": "yo",
    "ら": "ra", "り": "ri", "る": "ru", "れ": "re", "ろ": "ro",
    "わ": "wa", "ゐ": "i", "ゑ": "e", "を": "o", "ん": "n", "ゔ": "vu",
    "ぁ": "a", "ぃ": "i", "ぅ": "u", "ぇ": "e", "ぉ": "o"
  };
  var YOON = { "ゃ": "a", "ゅ": "u", "ょ": "o" };
  var YOON_HEAD = { "し": "sh", "ち": "ch", "じ": "j", "ぢ": "j" };

  function toHiragana(s) {
    return String(s).normalize("NFKC").replace(/[ァ-ヶ]/g, function (c) { return String.fromCharCode(c.charCodeAt(0) - 0x60); });
  }

  /** 名前 → ローマ字（ひらがな・カタカナ・ローマ字の混在も可）。読めない文字は ok:false */
  function romanize(name) {
    var s = toHiragana(name).toLowerCase().replace(/[\s・･.\-_'’]/g, "");
    if (!s) return { ok: false, reason: "empty" };
    var out = "", bad = [];
    for (var i = 0; i < s.length; i++) {
      var c = s.charAt(i), next = s.charAt(i + 1);
      if (/[a-z]/.test(c)) { out += c; continue; }
      if (c === "っ") { var r = KANA[next] || ""; out += r ? (r.indexOf("ch") === 0 ? "t" : r.charAt(0)) : ""; continue; }
      if (c === "ー") { var v = out.match(/[aiueo]$/); if (v) out += v[0]; continue; }
      if (YOON[next] && KANA[c] && c !== "ん") {
        out += (YOON_HEAD[c] || KANA[c].slice(0, -1) + "y") + YOON[next];
        i++; continue;
      }
      if (KANA[c]) {
        // ん の次が母音・や行なら n' と区別しないで n のまま（数字は同じ）
        out += KANA[c]; continue;
      }
      bad.push(c);
    }
    if (bad.length) return { ok: false, reason: "chars", chars: bad };
    return { ok: true, romaji: out };
  }

  function letterValue(ch) { return (ch.charCodeAt(0) - 97) % 9 + 1; }
  function reduce(n) {
    while (n > 9 && n !== 11 && n !== 22 && n !== 33) n = String(n).split("").reduce(function (a, b) { return a + Number(b); }, 0);
    return n;
  }
  function core(n) { return n === 11 ? 2 : n === 22 ? 4 : n === 33 ? 6 : n; }

  /** 名前 → 3つの数字 */
  function numbers(name) {
    var r = romanize(name);
    if (!r.ok) return r;
    var soul = 0, pers = 0;
    r.romaji.split("").forEach(function (ch) {
      var v = letterValue(ch);
      if ("aiueo".indexOf(ch) >= 0) soul += v; else pers += v;
    });
    return { ok: true, romaji: r.romaji, soul: reduce(soul) || 0, personality: reduce(pers) || 0, destiny: reduce(soul + pers) };
  }

  var GROUP = { 1: "a", 5: "a", 7: "a", 2: "b", 4: "b", 8: "b", 3: "c", 6: "c", 9: "c" };
  var GROUP_NAME = { a: "自分の道を進む数字（1・5・7）", b: "形にして守る数字（2・4・8）", c: "心を伝え合う数字（3・6・9）" };
  function pair(x, y) {
    var a = core(x), b = core(y);
    if (!a || !b) return { score: 70, kind: "none", text: "数字が出ないため、くらべられません。" };
    if (a === b) return { score: 92, kind: "same", text: "同じ数字どうし。感じ方や大切にしたいものがよく似ていて、言わなくても通じ合いやすい組み合わせです。" };
    if (GROUP[a] === GROUP[b]) return { score: 84, kind: "group", text: "同じグループ（" + GROUP_NAME[GROUP[a]] + "）の数字どうし。進みたい方向が近く、自然と歩調が合いやすい組み合わせです。" };
    return { score: 68, kind: "diff", text: "ちがうグループの数字どうし。相手は自分にない持ち味を運んでくれる存在。ちがいを補い合うほど、関係が深まります。" };
  }

  /** ふたりの名前の相性 */
  function compat(nameA, nameB, T) {
    var a = numbers(nameA), b = numbers(nameB);
    if (!a.ok || !b.ok) return { ok: false, a: a, b: b };
    var soul = pair(a.soul, b.soul), dest = pair(a.destiny, b.destiny);
    var score = Math.round(soul.score * 0.6 + dest.score * 0.4);
    var trait = function (n) { return T && T[core(n)] ? T[core(n)] : null; };
    return {
      ok: true, a: a, b: b, soul: soul, destiny: dest, score: score,
      level: score >= 86 ? "とても相性のよいふたり" : score >= 76 ? "相性のよいふたり" : "ちがいを補い合うふたり",
      traits: { aSoul: trait(a.soul), bSoul: trait(b.soul), aDest: trait(a.destiny), bDest: trait(b.destiny) }
    };
  }

  return { romanize: romanize, numbers: numbers, compat: compat, pair: pair, letterValue: letterValue };
});
