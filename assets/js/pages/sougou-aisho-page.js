/*
 * /aisho/ 総合相性診断
 *   ふたりの生年月日＋関係（恋人・夫婦・友達・家族・仕事）→ content/sougou-aisho.js → 8つの占術の相性と総合点
 *   入力はサーバーに送らない。
 */
(function (root) {
  "use strict";
  var Karute = root.Karute, h = Karute.dom.h;
  var KE = root.KaruteEngines, KC = root.KaruteContent;
  var E = { numerology: KE.numerology, kyusei: KE.kyusei, shichu: KE.shichusuimei, horoscope: KE.horoscope, shukuyo: KE.shukuyo, maya: KE.maya, jyotish: KE.jyotish, uchuban: KC.uchuban };

  function bar(score) {
    return h("span", { class: "sg-bar", "aria-hidden": "true" }, h("span", { style: "width:" + score + "%" }));
  }

  function render(box, v) {
    Karute.dom.clear(box);
    box.appendChild(h("section", { class: "card sg-total", "aria-labelledby": "sg-result-heading" },
      h("p", { class: "sg-rel" }, v.relationLabel + "の相性"),
      h("h2", { id: "sg-result-heading", tabindex: "-1" }, v.headline),
      h("p", { class: "sg-score" }, h("b", null, String(v.total)), h("span", null, "点")),
      bar(v.total),
      h("p", null, v.tip),
      h("dl", { class: "result-points" },
        h("div", null, h("dt", null, "いちばん響き合う占術"), h("dd", null, v.best.method + "（" + v.best.score + "点）：" + v.best.reason)),
        h("div", null, h("dt", null, "すれ違いに気をつけたい占術"), h("dd", null, v.weakest.method + "（" + v.weakest.score + "点）：" + v.weakest.reason)))));

    box.appendChild(h("section", { class: "card sg-block", "aria-labelledby": "sg-list-title" },
      h("h2", { id: "sg-list-title" }, "8つの占術で見る、ふたりの相性"),
      h("ul", { class: "sg-items" }, v.items.map(function (x) {
        return h("li", null,
          h("p", { class: "sg-item-head" }, h("b", null, x.method), h("span", null, x.score + "点")),
          bar(x.score),
          h("p", { class: "sg-reason" }, x.reason),
          h("a", { href: x.link, "data-track": "related_click", "data-target": x.key + "-aisho", "data-position": "result" }, x.method + "の相性をくわしく見る →"));
      })),
      h("p", { class: "sg-note" }, "点数は、それぞれの占術の判定（相生・干合・三九の秘法など）を、えみりの目安として100点満点に置きかえたものです。総合点は8つの平均をもとに、ちがいがわかりやすいように幅を広げて出しています。")));

    box.appendChild(h("p", { class: "notice" }, "相性占いは、ふたりの関係を考えるためのヒントです。点数で関係のよし悪しが決まるわけではありません。"));
    box.hidden = false;
    Karute.dom.scrollTo(box);
    var hd = document.getElementById("sg-result-heading");
    if (hd) hd.focus({ preventScroll: true });
  }

  function init() {
    var form = document.getElementById("sougou-form");
    var box = document.getElementById("sougou-result");
    if (!form || !box) return;
    var you = Karute.BirthDateField.mount(form.querySelector("[data-birthdate='self']"), { idPrefix: "self", legend: "あなたの生年月日", useProfile: true });
    var partner = Karute.BirthDateField.mount(form.querySelector("[data-birthdate='partner']"), { idPrefix: "partner", legend: "お相手の生年月日", useProfile: false });
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var a = you.read(), b = partner.read();
      if (!a.ok || !b.ok) return;
      you.commit(a.value);
      var rel = (form.querySelector("input[name='relation']:checked") || {}).value || "love";
      render(box, KC.sougouAisho.build(a.value, b.value, rel, Karute.date.todayInJapan(), E));
    });
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})(typeof self !== "undefined" ? self : this);
