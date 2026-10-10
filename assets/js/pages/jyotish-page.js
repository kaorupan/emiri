/*
 * /jyotish/ インド占星術 個人鑑定ページ
 * 計算：KaruteEngines.jyotish（astronomy-engine）/ 文章：KaruteContent.jyotish / 描画：このファイル
 * 表示順：9つの星 → 月の星座（ラーシ）→ ナクシャトラ → いまのダシャー
 */
(function (root) {
  "use strict";
  var Karute = root.Karute, h = Karute.dom.h, R = root.KaruteKyuseiRender;
  var engine = root.KaruteEngines.jyotish, content = root.KaruteContent.jyotish;

  function tradition(text) {
    return h("div", { class: "kyusei-tradition" }, h("p", { class: "kyusei-source" }, "インド占星術での位置づけ"), h("p", null, text));
  }

  function render(container, v) {
    Karute.dom.clear(container);
    container.appendChild(h("h2", { class: "visually-hidden", tabindex: "-1", id: "jyo-result-heading" }, "インド占星術の鑑定結果"));
    container.appendChild(R.section("jyo-summary", "JYOTISH", "あなたの9つの星", [
      h("p", { class: "kyusei-meta" }, v.birthLabel + "生まれ" + v.timeNote),
      h("p", { class: "horo-big" }, "月 ", h("b", null, v.moon.rashi), "　ナクシャトラ ", h("b", null, v.nakshatra.name)),
      h("table", { class: "horo-table" },
        h("caption", { class: "visually-hidden" }, "9つの星（ナヴァグラハ）の星座と度数"),
        h("thead", null, h("tr", null, h("th", { scope: "col" }, "星"), h("th", { scope: "col" }, "星座（ラーシ）"), h("th", { scope: "col" }, "度数"))),
        h("tbody", null, v.planets.map(function (p) { return h("tr", null, h("th", { scope: "row" }, p.name), h("td", null, p.rashi), h("td", null, p.degree)); }))),
      v.mayChange ? h("p", { class: "kyusei-note" }, v.mayChange) : null,
      h("p", { class: "kyusei-meta" }, v.ayanamsa + "　太陽はインドの星座では" + v.sun.rashi + "（" + v.sun.ja + "）です。"),
      tradition(v.tradition.chart),
      tradition(v.tradition.planets)
    ], "kyusei-summary"));
    container.appendChild(R.section("jyo-moon", "RASHI", "月の星座：" + v.moon.rashi + "（" + v.moon.ja + "）", [tradition(v.tradition.moon), h("p", null, v.moon.text)]));
    container.appendChild(R.section("jyo-nakshatra", "NAKSHATRA", "ナクシャトラ：" + v.nakshatra.name, [
      tradition(v.tradition.nakshatra),
      h("p", { class: "maya-lead" }, v.nakshatra.keyword),
      h("p", null, v.nakshatra.text),
      R.traits([["パーダ（4つの区分）", "第" + v.nakshatra.pada + "パーダ"], ["宿曜の二十七宿では", v.nakshatra.shuku]])
    ]));
    if (v.dasha) {
      container.appendChild(R.section("jyo-dasha", "DASHA", "いまのあなたの時期（ダシャー）", [
        tradition(v.tradition.dasha),
        R.traits([
          ["マハーダシャー：" + v.dasha.maha + "（" + v.dasha.mahaRange + "）", v.dasha.mahaText],
          v.dasha.antar ? ["アンタルダシャー：" + v.dasha.antar, v.dasha.antarRange + "。大きな時期の中の、小さな流れです。"] : null,
          v.dasha.next ? ["次の時期", v.dasha.next] : null
        ].filter(Boolean))
      ]));
    }
  }

  function init() {
    var form = document.getElementById("jyo-form");
    var output = document.getElementById("jyo-result-body");
    var wrap = document.getElementById("jyo-result");
    if (!form || !output || !wrap) return;
    var field = Karute.BirthDateField.mount(form.querySelector("[data-birthdate='self']"), { idPrefix: "self", legend: "あなたの生年月日", useProfile: true });
    var time = R.timeField(form.querySelector("[data-birthtime='self']"), {
      idPrefix: "self", legend: "生まれた時刻（任意）", collapsible: false,
      hint: "月はおよそ1日でナクシャトラを移るため、時刻が分かると月の位置とダシャーが正確になります。日本時間で入力してください。分からなければ正午で計算します。時刻は保存しません。"
    });
    form.addEventListener("submit", function (event) {
      event.preventDefault();
      var input = field.read();
      if (!input.ok) return;
      var t = time.read();
      if (!t.ok) return;
      field.commit(input.value);
      var r = engine.calculateJyotish({ year: input.value.year, month: input.value.month, day: input.value.day, time: t.value });
      render(output, content.buildJyotishView(r, engine.currentDasha(r, Date.now())));
      wrap.hidden = false;
      Karute.dom.scrollTo(wrap);
      var heading = document.getElementById("jyo-result-heading");
      if (heading) heading.focus({ preventScroll: true });
    });
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})(typeof self !== "undefined" ? self : this);
