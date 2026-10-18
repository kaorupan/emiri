/*
 * /denwa/ 電話番号占い
 *   電話番号 → content/denwa.js → 下4桁法の81数と、数秘術の数。
 *   電話番号は保存しない・どこにも送らない（アクセス解析にも、結果が出たことしか送らない）。
 */
(function (root) {
  "use strict";
  var Karute = root.Karute, h = Karute.dom.h;
  var D = root.KaruteContent.denwa, NUM = root.KaruteContent.seimeiNumbers, T = root.KaruteContent.numerology.TRAITS;
  var LUCK_CLASS = { "大吉": "dw-l1", "吉": "dw-l2", "半吉": "dw-l3", "凶": "dw-l4" };
  function core(n) { return n === 11 ? 2 : n === 22 ? 4 : n === 33 ? 6 : n; }

  function render(box, v) {
    var m = v.meaning, t = T[core(v.numerology)];
    Karute.dom.clear(box);
    box.appendChild(h("section", { class: "card dw-main " + (LUCK_CLASS[m.luck] || ""), "aria-labelledby": "dw-result-heading" },
      h("p", { class: "dw-calc" }, "下4桁 " + v.last4 + " ÷ 80 の余り ＝ ", h("b", null, String(v.remainder))),
      h("h2", { id: "dw-result-heading", tabindex: "-1" }, h("span", { class: "dw-luck" }, m.luck), "「" + m.keyword + "」の番号"),
      h("p", null, m.text),
      h("dl", { class: "result-points" },
        h("div", null, h("dt", null, "人間関係・恋愛"), h("dd", null, m.love)),
        h("div", null, h("dt", null, "仕事・お金"), h("dd", null, m.work)),
        h("div", null, h("dt", null, "ひとこと"), h("dd", null, m.advice)))));
    box.appendChild(h("section", { class: "card dw-block", "aria-labelledby": "dw-num-title" },
      h("h2", { id: "dw-num-title" }, "数秘術で見る番号の雰囲気"),
      h("p", null, "すべての数字の合計は " + v.sum + "、1けたにすると ", h("b", null, String(v.numerology)), "。"),
      t ? h("p", null, "「" + t.key + "」の数字です。この番号は、" + t.gift + "を後押ししてくれる番号とされます。" + (v.numerology === 11 || v.numerology === 22 || v.numerology === 33 ? "（" + v.numerology + "はマスターナンバー）" : "")) : null,
      h("p", { class: "sg-note" }, "数秘術の数は、下4桁法とは別の見方です。番号全体の雰囲気として読んでください。")));
    box.appendChild(h("p", { class: "notice" }, m.luck === "凶" || m.luck === "半吉"
      ? "吉の数でなくても、番号を変えなければいけないわけではありません。番号は運を決めるものではなく、気持ちを整えるための目安です。気になるときは、待ち受けや連絡先の登録名など、身近なところで吉の数をとり入れてみてください。"
      : "電話番号占いは、気持ちを整えるための目安です。新しい番号を選ぶときの参考にどうぞ。"));
    box.hidden = false;
    Karute.dom.scrollTo(box);
    var hd = document.getElementById("dw-result-heading");
    if (hd) hd.focus({ preventScroll: true });
  }

  function init() {
    var form = document.getElementById("denwa-form"), box = document.getElementById("denwa-result"), err = document.getElementById("dw-error");
    if (!form || !box) return;
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var v = D.read(form.phone.value, NUM);
      if (!v.ok) {
        err.textContent = v.reason === "short" ? "電話番号を4けた以上入れてください（下4桁だけでも占えます）。" : "電話番号が長すぎます。数字を確かめてください。";
        err.hidden = false; form.phone.focus(); return;
      }
      err.hidden = true;
      render(box, v);
    });
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})(typeof self !== "undefined" ? self : this);
