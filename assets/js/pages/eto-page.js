/*
 * /eto/ 生まれ年から干支を調べる（入力は保存しない）
 */
(function (root) {
  "use strict";
  var Karute = root.Karute, h = Karute.dom.h;
  var E = root.KaruteEngines.eto, T = root.KaruteContent.eto;

  function init() {
    var form = document.getElementById("eto-form");
    var select = document.getElementById("eto-year");
    var out = document.getElementById("eto-result");
    if (!form || !select || !out) return;
    form.addEventListener("submit", function (event) {
      event.preventDefault();
      var y = Number(select.value);
      var e = E.etoOfYear(y), b = T.BRANCHES[e.branchIndex];
      Karute.dom.clear(out);
      out.appendChild(h("div", { class: "eto-result" },
        h("div", { class: "eto-badge" }, h("b", null, e.name), h("span", null, y + "年生まれ・" + e.reading + "（" + b.animal + "年）")),
        h("p", null, b.kanji + "年生まれのキーワードは「" + b.keyword + "」。"),
        h("p", null, h("a", { href: b.slug + "/" }, b.kanji + "年生まれの性格・相性・運勢を見る →")),
        h("p", { class: "kyusei-meta" }, "1月1日〜立春（2月4日ごろ）の前に生まれた人は、四柱推命・九星気学では前の年（" + E.etoOfYear(y - 1).name + "）として見ます。")));
    });
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})(typeof self !== "undefined" ? self : this);
