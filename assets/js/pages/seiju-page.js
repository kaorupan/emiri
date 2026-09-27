/*
 * /seiju/ 星獣カルテ 個人鑑定ページ
 * 判定：KaruteEngines.seiju / 文章：KaruteContent.seiju / 描画：このファイル（共通部品は seiju-render.js）
 */
(function (root) {
  "use strict";
  var Karute = root.Karute;
  var engine = root.KaruteEngines.seiju;
  var content = root.KaruteContent.seiju;
  var R = root.KaruteSeijuRender;
  var h = Karute.dom.h;

  function render(container, v) {
    Karute.dom.clear(container);
    container.appendChild(h("h2", { class: "visually-hidden", tabindex: "-1", id: "seiju-result-heading" }, "星獣カルテの鑑定結果"));

    // 1. 星獣カルテ要約
    container.appendChild(h("section", { class: "card seiju-block seiju-summary", id: "seiju-summary", "aria-labelledby": "seiju-summary-title", "data-season": v.beast.season.id },
      h("p", { class: "eyebrow" }, "STAR BEAST KARTE"),
      h("h2", { id: "seiju-summary-title" }, "あなたの星獣カルテ"),
      R.crest(v.beast),
      h("p", { class: "seiju-name" }, v.beast.name),
      h("p", { class: "seiju-catch" }, v.beast.catchphrase),
      R.tags(v.beast),
      h("p", { class: "seiju-meta" }, v.birthLabel + "生まれ",
        v.precision === "estimated" ? h("span", null, " ", h("span", { class: "seiju-badge-estimated" }, "推定")) : null),
      R.traits(v.summary.points)
    ));

    // 2. あなたの星獣
    container.appendChild(R.section("seiju-beast", "YOUR STAR BEAST", "あなたの星獣「" + v.beast.name + "」", [
      h("p", { class: "seiju-catch" }, v.beast.catchphrase),
      h("p", null, v.intro)
    ], v.beast.season.id));

    // 3. 季節属性
    container.appendChild(R.section("seiju-season", "SEASON", "季節属性：" + v.season.name, [
      h("div", { class: "seiju-inline" }, h("span", { class: "seiju-season-swatch", "aria-hidden": "true" }),
        h("div", null, h("p", { class: "seiju-attr-name" }, v.season.name + "（" + v.season.plain + "）"), h("p", { class: "seiju-meta" }, v.season.range))),
      h("p", { class: "seiju-meta" }, v.season.startLabel),
      R.traits(v.season.traits)
    ], v.beast.season.id));

    // 4. 月相属性
    container.appendChild(R.section("seiju-moon", "MOON RHYTHM", "月のリズム：" + v.moon.name, [
      h("div", { class: "seiju-inline" }, R.moon(v.beast.moon.id, v.moon.name),
        h("div", null, h("p", { class: "seiju-attr-name" }, v.moon.name + "｜" + v.moon.power), h("p", { class: "seiju-keywords" }, v.moon.keywords.join("・")))),
      h("p", null, v.moon.meaning),
      h("p", { class: "seiju-meta" }, "時期：" + v.moon.range),
      h("p", { class: "seiju-meta" }, v.moon.detail)
    ], v.beast.season.id));

    // 5. なぜこの星獣なのか
    container.appendChild(R.section("seiju-reason", "WHY", "あなたが「" + v.beast.name + "」になった理由", [
      h("div", { class: "seiju-reason" }, v.reason.map(function (p) { return h("p", null, p); })),
      v.notes.map(function (n) { return h("p", { class: "seiju-note" }, n); }),
      h("h3", null, "12星獣の地図（季節 × 月のリズム）"),
      R.map(v.grid)
    ], v.beast.season.id));

    // 6〜13. 性格・場面別
    v.sections.forEach(function (s) {
      container.appendChild(R.section("seiju-" + s.key, "", s.title, [h("p", null, s.text)], v.beast.season.id));
    });
  }

  function init() {
    var form = document.getElementById("seiju-form");
    var output = document.getElementById("seiju-result-body");
    var wrap = document.getElementById("seiju-result");
    if (!form || !output || !wrap) return;

    var field = Karute.BirthDateField.mount(form.querySelector("[data-birthdate='self']"), {
      idPrefix: "self", legend: "あなたの生年月日", useProfile: true
    });

    form.addEventListener("submit", function (event) {
      event.preventDefault();
      var input = field.read();
      if (!input.ok) return;
      field.commit(input.value);
      render(output, content.buildSeijuView(engine.calculateSeiju(input.value)));
      wrap.hidden = false;
      Karute.dom.scrollTo(wrap);
      var heading = document.getElementById("seiju-result-heading");
      if (heading) heading.focus({ preventScroll: true });
    });
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})(typeof self !== "undefined" ? self : this);
