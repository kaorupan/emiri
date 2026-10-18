/*
 * /horoscope/seiza-aisho/ 誕生日（月日）→ 星座 → 12星座の相性（tools/seiza-aisho/generate.mjs と同じ表）
 *   入力はどこにも送らない。
 */
(function () {
  "use strict";
  var SIGNS = ["牡羊座", "牡牛座", "双子座", "蟹座", "獅子座", "乙女座", "天秤座", "蠍座", "射手座", "山羊座", "水瓶座", "魚座"];
  // 各星座のはじまり（月・日）。境目の日は年によって1日ずれることがある
  var START = [[3, 21], [4, 20], [5, 21], [6, 22], [7, 23], [8, 23], [9, 23], [10, 24], [11, 23], [12, 22], [1, 20], [2, 19]];
  var REL = {
    4: [95, "最高の相性（トライン）", "同じエレメントの星座どうし。価値観や感じ方が近く、一緒にいて自然体でいられる相性です。"],
    2: [88, "高め合う相性（セクスタイル）", "補い合うエレメントの星座どうし。会話が弾みやすく、お互いのよさを引き出し合えます。"],
    6: [82, "惹かれ合う相性（オポジション）", "正反対の星座どうし。自分にないものを持つ相手に強く惹かれます。ちがいを認め合えると、最高のパートナーに。"],
    0: [80, "似た者同士（同じ星座）", "同じ星座どうし。共感しやすく話が早い一方、苦手なところも似ているので、ときどき役割を分けて。"],
    1: [70, "ゆっくり育つ相性（となりの星座）", "となりどうしの星座。性格のタイプはちがいますが、時間をかけるほど理解し合えます。"],
    5: [66, "歩み寄りが鍵の相性（150°）", "見ている方向がちがう星座どうし。相手のペースに合わせる工夫が、関係を育てます。"],
    3: [62, "刺激し合う相性（スクエア）", "ぶつかりやすい角度の星座どうし。意見のちがいはありますが、そのぶんお互いを成長させる関係です。"]
  };
  function signOf(m, d) {
    for (var i = 0; i < 12; i++) {
      var s = START[i], e = START[(i + 1) % 12];
      var v = m * 100 + d, sv = s[0] * 100 + s[1], ev = e[0] * 100 + e[1];
      if (sv <= ev ? v >= sv && v < ev : v >= sv || v < ev) return i;
    }
    return 0;
  }
  function cusp(m, d) { return START.some(function (s) { return (s[0] === m && (s[1] === d || s[1] - 1 === d)); }); }
  function read(p) {
    var m = Number(document.getElementById("sz-" + p + "-m").value), d = Number(document.getElementById("sz-" + p + "-d").value);
    if (!m || !d) return null;
    if (d > new Date(Date.UTC(2000, m, 0)).getUTCDate()) return { bad: m + "月に" + d + "日はありません。" };
    return { m: m, d: d };
  }
  function init() {
    var form = document.getElementById("seiza-form"), box = document.getElementById("seiza-result"), err = document.getElementById("sz-error");
    if (!form) return;
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var a = read("a"), b = read("b");
      var msg = !a || !b ? "ふたりの誕生日（月と日）を選んでください。" : a.bad || b.bad || "";
      if (msg) { err.textContent = msg; err.hidden = false; return; }
      err.hidden = true;
      var i = signOf(a.m, a.d), j = signOf(b.m, b.d), dd = Math.abs(i - j) % 12, k = Math.min(dd, 12 - dd), r = REL[k];
      box.innerHTML = "";
      var add = function (tag, cls, text) { var el = document.createElement(tag); if (cls) el.className = cls; el.textContent = text; box.appendChild(el); return el; };
      var hd = add("p", "at-num", SIGNS[i] + " × " + SIGNS[j] + "：" + r[1] + "（" + r[0] + "点）");
      hd.tabIndex = -1;
      add("p", "", r[2]);
      if (cusp(a.m, a.d) || cusp(b.m, b.d)) add("p", "sg-note", "星座の境目に近い誕生日です。生まれた年によって、となりの星座になることがあります。");
      var link = document.createElement("a"); link.href = "#sz-" + i; link.textContent = SIGNS[i] + "の相性ランキングを見る →"; box.appendChild(link);
      box.hidden = false; hd.focus();
    });
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init); else init();
})();
