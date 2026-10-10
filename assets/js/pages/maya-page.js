/*
 * /maya/ マヤ暦 個人鑑定ページ
 * 計算：KaruteEngines.maya / 文章：KaruteContent.maya / 描画：このファイル（カード部品は kyusei-render.js）
 * 表示順：KIN → 太陽の紋章 → 銀河の音 → ウェイブスペル → 運命の五角形（4つのKIN）→ 黒KIN（該当者のみ）→ 年回り →（HTML側）次にできること
 */
(function (root) {
  "use strict";
  var Karute = root.Karute;
  var engine = root.KaruteEngines.maya;
  var content = root.KaruteContent.maya;
  var R = root.KaruteKyuseiRender;
  var h = Karute.dom.h;

  function tradition(text) {
    return h("div", { class: "kyusei-tradition" }, h("p", { class: "kyusei-source" }, "マヤ暦での位置づけ"), h("p", null, text));
  }

  function badge(card) {
    return h("div", { class: "maya-kin", "data-color": card.color },
      h("p", { class: "maya-kin-num" }, h("span", { class: "maya-kin-label" }, "KIN"), String(card.kin)),
      h("p", { class: "maya-kin-seal" }, card.seal),
      h("p", { class: "maya-kin-tone" }, "銀河の音 " + card.tone + "（" + card.toneName + "）"),
      card.black ? h("p", { class: "maya-kin-black" }, "黒KIN") : null);
  }

  function render(container, v) {
    Karute.dom.clear(container);
    container.appendChild(h("h2", { class: "visually-hidden", tabindex: "-1", id: "maya-result-heading" }, "マヤ暦の鑑定結果"));

    container.appendChild(R.section("maya-summary", "MAYAN CALENDAR", "あなたのKIN", [
      h("p", { class: "kyusei-meta" }, v.birthLabel + "生まれ"),
      badge(v.main),
      h("p", { class: "maya-catch" }, v.catchphrase),
      v.leapDay ? h("p", { class: "kyusei-note" }, v.leapDay.text) : null
    ], "kyusei-summary"));

    container.appendChild(R.section("maya-seal", "SOLAR SEAL", "太陽の紋章：" + v.seal.name, [
      tradition(v.seal.tradition),
      h("p", { class: "maya-lead", "data-color": v.seal.color }, v.seal.keyword),
      h("p", null, v.seal.body),
      R.traits([["強み", v.seal.strength], ["色のテーマ", v.seal.colorText], ["ヒント", v.seal.hint]])
    ]));

    container.appendChild(R.section("maya-tone", "GALACTIC TONE", "銀河の音：" + v.tone.number + "（" + v.tone.name + "の音）", [
      tradition(v.tone.tradition),
      h("p", { class: "maya-lead" }, v.tone.keyword),
      h("p", null, v.tone.body)
    ]));

    container.appendChild(R.section("maya-wavespell", "WAVESPELL", "ウェイブスペル：" + v.wavespell.name, [
      tradition(v.wavespell.tradition),
      h("p", { class: "maya-lead", "data-color": v.wavespell.color }, v.wavespell.keyword),
      v.wavespell.same ? h("p", null, "太陽の紋章とウェイブスペルが同じ" + v.wavespell.name + "です。表に見える性質と内に秘めた力が一致していて、自分らしさをそのまま生かしやすい人です。") : h("p", null, v.wavespell.body),
      h("p", { class: "kyusei-meta" }, "あなたは" + v.wavespell.name + "の13日間の" + v.wavespell.day + "日目に生まれました。")
    ]));

    container.appendChild(R.section("maya-relations", "DESTINY ORACLE", "あなたと縁の深い4つのKIN", [
      tradition(v.relationsTradition),
      h("ul", { class: "maya-rel" }, v.relations.map(function (r) {
        return h("li", { class: "maya-rel-item", "data-color": r.color },
          h("p", { class: "maya-rel-label" }, r.label, h("span", null, "　" + r.role)),
          h("p", { class: "maya-rel-kin" }, r.name),
          h("p", { class: "maya-rel-key" }, r.keyword),
          h("p", null, r.text));
      }))
    ]));

    if (v.black) {
      container.appendChild(R.section("maya-black", "", "あなたは黒KINです", [tradition(v.black.tradition), h("p", null, v.black.text)]));
    }

    container.appendChild(R.section("maya-years", "YEARLY CYCLE", "これから3年の年回り", [
      tradition(v.yearsTradition),
      h("ol", { class: "ssm-years" }, v.years.map(function (y) {
        return h("li", { class: "ssm-year" },
          h("p", { class: "ssm-year-head" }, h("b", null, y.year + "年の誕生日から（" + y.age + "歳）"), "　KIN" + y.kin + "・" + y.seal + "・音" + y.tone),
          h("p", null, y.text));
      }))
    ]));
  }

  function init() {
    var form = document.getElementById("maya-form");
    var output = document.getElementById("maya-result-body");
    var wrap = document.getElementById("maya-result");
    if (!form || !output || !wrap) return;
    var field = Karute.BirthDateField.mount(form.querySelector("[data-birthdate='self']"), {
      idPrefix: "self", legend: "あなたの生年月日", useProfile: true
    });
    form.addEventListener("submit", function (event) {
      event.preventDefault();
      var input = field.read();
      if (!input.ok) return;
      field.commit(input.value);
      var r = engine.calculateMaya(input.value);
      render(output, content.buildMayaView(r, Karute.date.todayInJapan(), engine));
      wrap.hidden = false;
      Karute.dom.scrollTo(wrap);
      var heading = document.getElementById("maya-result-heading");
      if (heading) heading.focus({ preventScroll: true });
    });
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})(typeof self !== "undefined" ? self : this);
