/*
 * /kippoui/ 吉方位を調べるページ
 * 生年月日 → 本命星・月命星（KaruteEngines.kyusei）→ 年盤の吉方位（KaruteEngines.houi）
 * 対象の年はフォームの data-years（生成時の「今年」と「来年」）。
 */
(function (root) {
  "use strict";
  var Karute = root.Karute, h = Karute.dom.h;
  var kyusei = root.KaruteEngines.kyusei, houi = root.KaruteEngines.houi;
  var text = root.KaruteContent.houi, data = root.KaruteContent.kyuseiData;
  var GRID = [["nw", "n", "ne"], ["w", "c", "e"], ["sw", "s", "se"]];

  function star(n) { return data.STARS[n]; }

  function grid(p, caption) {
    var cells = [];
    GRID.forEach(function (row) {
      row.forEach(function (k) {
        if (k === "c") {
          cells.push(h("div", { class: "kp-cell kp-center" }, h("span", { class: "kp-dir" }, "中宮"), h("b", null, star(p.chart.center).short)));
          return;
        }
        var d = p.dirs.filter(function (x) { return x.key === k; })[0];
        var cls = d.best ? "is-best" : d.good ? "is-good" : d.bad.length ? "is-bad" : "";
        var mark = d.best ? "最大吉方" : d.good ? "吉方位" : d.bad.join("・");
        cells.push(h("div", { class: "kp-cell " + cls }, h("span", { class: "kp-dir" }, d.name), h("b", null, star(d.star).short), mark ? h("span", { class: "kp-mark" }, mark) : null));
      });
    });
    return h("figure", { class: "kp-chart" }, h("div", { class: "kp-grid", role: "img", "aria-label": caption }, cells),
      h("figcaption", null, caption + "（地図と同じく、北を上にしています）"));
  }

  function yearBlock(year, r) {
    var p = houi.forPerson(year, r.honmei, r.getsumei);
    var c = p.chart;
    var best = p.dirs.filter(function (d) { return d.best; });
    var good = p.dirs.filter(function (d) { return d.good && !d.best; });
    var bad = p.dirs.filter(function (d) { return d.bad.length; });
    var id = "kp-y" + year;
    return h("section", { class: "card kyusei-block", id: id, "aria-labelledby": id + "-title" },
      h("p", { class: "eyebrow" }, "YEAR " + year),
      h("h2", { id: id + "-title" }, year + "年の吉方位（" + c.eto.stem + c.eto.branch + "・" + star(c.center).short + "中宮）"),
      grid(p, year + "年の年盤とあなたの吉方位"),
      p.honmeiCenter ? h("p", { class: "kyusei-note" }, year + "年はあなたの本命星が中宮に入る「八方塞がり」の年とされます。引っ越しなど大きな移動は慎重に考えましょう。") : null,
      h("dl", { class: "kyusei-traits" },
        h("div", { class: "kyusei-trait" }, h("dt", null, "最大吉方"), h("dd", null, best.length ? best.map(function (d) { return d.name; }).join("・") : "なし")),
        h("div", { class: "kyusei-trait" }, h("dt", null, "吉方位"), h("dd", null, good.length ? good.map(function (d) { return d.name; }).join("・") : "なし")),
        h("div", { class: "kyusei-trait" }, h("dt", null, "凶方位"), h("dd", null, bad.map(function (d) { return d.name + "（" + d.bad.join("・") + "）"; }).join("、")))),
      best.concat(good).map(function (d) {
        var e = text.STAR_EFFECT[d.star];
        return h("div", { class: "kp-effect" }, h("h3", null, d.name + "（" + star(d.star).name + "）：" + e.title), h("p", null, e.text));
      }),
      h("p", { class: "kyusei-meta" }, h("a", { href: year + "/" + r.honmei + "/" }, star(r.honmei).name + "の" + year + "年の吉方位をくわしく見る →")));
  }

  function init() {
    var form = document.getElementById("kippoui-form");
    var output = document.getElementById("kippoui-result-body");
    var wrap = document.getElementById("kippoui-result");
    if (!form || !output || !wrap) return;
    var years = String(form.getAttribute("data-years") || "").split(",").map(Number).filter(Boolean);
    var field = Karute.BirthDateField.mount(form.querySelector("[data-birthdate='self']"), { idPrefix: "self", legend: "あなたの生年月日", useProfile: true });
    form.addEventListener("submit", function (event) {
      event.preventDefault();
      var input = field.read();
      if (!input.ok) return;
      field.commit(input.value);
      var r;
      try { r = kyusei.calculateKyusei(input.value); } catch (e) { r = null; }
      Karute.dom.clear(output);
      output.appendChild(h("h2", { class: "visually-hidden", tabindex: "-1", id: "kippoui-heading" }, "吉方位の鑑定結果"));
      if (!r) {
        output.appendChild(h("p", { class: "card kyusei-note", role: "alert" }, "この生年月日は計算できる範囲の外のため、調べられません。"));
      } else {
        output.appendChild(h("section", { class: "card kyusei-block kyusei-summary" },
          h("p", { class: "eyebrow" }, "YOUR STARS"),
          h("h2", null, "本命星 " + star(r.honmei).name + "・月命星 " + star(r.getsumei).name),
          h("p", null, "吉方位は、本命星と相性の良い星がいる方位です。月命星とも相性が良い方位は「最大吉方」として、とくに良いとされます。"),
          r.boundary ? h("p", { class: "kyusei-note" }, "節入りの日に生まれた方は、生まれた時刻によって本命星・月命星が変わることがあります。九星気学のカルテで時刻を入れて確かめてください。") : null));
        years.forEach(function (y) { output.appendChild(yearBlock(y, r)); });
      }
      wrap.hidden = false;
      Karute.dom.scrollTo(wrap);
      var heading = document.getElementById("kippoui-heading");
      if (heading) heading.focus({ preventScroll: true });
    });
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})(typeof self !== "undefined" ? self : this);
