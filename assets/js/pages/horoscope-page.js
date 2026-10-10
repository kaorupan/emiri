/*
 * /horoscope/ ホロスコープ 個人鑑定ページ
 * 計算：KaruteEngines.horoscope（astronomy-engine）/ 文章：KaruteContent.horoscope / 描画：このファイル
 * 表示順：天体の位置 → 太陽 → 月 → 水星・金星・火星 → 木星・土星 → 世代の星 → バランス → アスペクト → 今年の木星・土星
 */
(function (root) {
  "use strict";
  var Karute = root.Karute, h = Karute.dom.h, R = root.KaruteKyuseiRender;
  var engine = root.KaruteEngines.horoscope, content = root.KaruteContent.horoscope;

  function tradition(text) {
    return h("div", { class: "kyusei-tradition" }, h("p", { class: "kyusei-source" }, "西洋占星術での位置づけ"), h("p", null, text));
  }

  function bars(list, total) {
    return h("ul", { class: "ssm-bars" }, list.map(function (x) {
      return h("li", { class: "ssm-bar", "data-horo": x.name },
        h("span", { class: "ssm-bar-label" }, x.name),
        h("span", { class: "ssm-bar-track", "aria-hidden": "true" }, h("span", { class: "ssm-bar-fill", style: "width:" + Math.round(x.count / total * 100) + "%" })),
        h("span", { class: "ssm-bar-count" }, String(x.count)));
    }));
  }

  function render(container, v) {
    Karute.dom.clear(container);
    container.appendChild(h("h2", { class: "visually-hidden", tabindex: "-1", id: "horo-result-heading" }, "ホロスコープの鑑定結果"));

    container.appendChild(R.section("horo-summary", "HOROSCOPE", "あなたの天体の配置", [
      h("p", { class: "kyusei-meta" }, v.birthLabel + "生まれ" + v.timeNote),
      h("p", { class: "horo-big" }, "太陽 ", h("b", null, v.sun.sign), "　月 ", h("b", null, v.moon.sign)),
      h("table", { class: "horo-table" },
        h("caption", { class: "visually-hidden" }, "10天体の星座と度数"),
        h("thead", null, h("tr", null, h("th", { scope: "col" }, "天体"), h("th", { scope: "col" }, "星座と度数"))),
        h("tbody", null, v.planets.map(function (p) {
          return h("tr", { class: p.mayChange ? "is-uncertain" : null }, h("th", { scope: "row" }, p.name), h("td", null, p.position, p.mayChange ? h("span", { class: "horo-flag" }, "※") : null));
        }))),
      v.notes.map(function (n) { return h("p", { class: "kyusei-note" }, "※ " + n); }),
      tradition(v.tradition.chart)
    ], "kyusei-summary"));

    container.appendChild(R.section("horo-sun", "SUN", "太陽：" + v.sun.sign, [tradition(v.tradition.sun), h("p", { class: "maya-lead" }, v.sun.keyword), h("p", null, v.sun.body)]));
    container.appendChild(R.section("horo-moon", "MOON", "月：" + v.moon.sign, [tradition(v.tradition.moon), h("p", null, v.moon.body)]));
    container.appendChild(R.section("horo-personal", "", "考え方・愛し方・行動力", [tradition(v.tradition.personal), R.traits(v.personal)]));
    container.appendChild(R.section("horo-social", "", "幸運の星と試練の星", [tradition(v.tradition.social), R.traits(v.social)]));
    container.appendChild(R.section("horo-outer", "", "世代の星", [tradition(v.tradition.outer), R.traits(v.outer)]));
    container.appendChild(R.section("horo-balance", "BALANCE", "エレメントとクオリティ", [
      tradition(v.tradition.balance),
      h("h3", null, "エレメント（太陽〜土星・太陽と月は2つ分）"), bars(v.balance.elements, v.balance.total),
      h("h3", null, "クオリティ"), bars(v.balance.qualities, v.balance.total),
      R.traits(v.balance.texts)
    ]));
    container.appendChild(R.section("horo-aspects", "ASPECTS", "天体どうしの角度（アスペクト）", [
      tradition(v.tradition.aspects),
      v.aspects.length ? h("ul", { class: "kyusei-factors" }, v.aspects.map(function (a) {
        return h("li", { class: "kyusei-factor horo-aspect-" + a.tone }, h("p", { class: "kyusei-factor-head" }, a.title, h("span", { class: "kyusei-pill" }, "誤差 " + a.orb + "°")), h("p", null, a.text));
      })) : h("p", null, "太陽〜土星の天体どうしに、主要なアスペクトはありません。それぞれの天体が独立して、のびのびと働く配置です。")
    ]));
    if (v.year) container.appendChild(R.section("horo-year", "THIS YEAR", "今年の木星と土星", [tradition(v.tradition.year), R.traits(v.year)]));
  }

  function init() {
    var form = document.getElementById("horo-form");
    var output = document.getElementById("horo-result-body");
    var wrap = document.getElementById("horo-result");
    if (!form || !output || !wrap) return;
    var field = Karute.BirthDateField.mount(form.querySelector("[data-birthdate='self']"), { idPrefix: "self", legend: "あなたの生年月日", useProfile: true });
    var time = R.timeField(form.querySelector("[data-birthtime='self']"), {
      idPrefix: "self", legend: "生まれた時刻（任意）", collapsible: false,
      hint: "月はおよそ2日半で星座を移るため、時刻が分かると月の星座が確定します。日本時間で入力してください。分からなければ正午で計算します。時刻は保存しません。"
    });
    form.addEventListener("submit", function (event) {
      event.preventDefault();
      var input = field.read();
      if (!input.ok) return;
      var t = time.read();
      if (!t.ok) return;
      field.commit(input.value);
      var r = engine.calculateHoroscope({ year: input.value.year, month: input.value.month, day: input.value.day, time: t.value });
      render(output, content.buildHoroscopeView(r, engine.transits(Karute.date.todayInJapan())));
      wrap.hidden = false;
      Karute.dom.scrollTo(wrap);
      var heading = document.getElementById("horo-result-heading");
      if (heading) heading.focus({ preventScroll: true });
    });
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})(typeof self !== "undefined" ? self : this);
