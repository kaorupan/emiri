/*
 * /seiju/aisho/ 星獣カルテの相性ページ
 * 表示順（固定）：1.あなた → 2.お相手 → 3.総合相性 → 4.詳細な相性 → 5.親密さ・スキンシップ
 */
(function (root) {
  "use strict";
  var Karute = root.Karute;
  var engine = root.KaruteEngines.seiju;
  var content = root.KaruteContent.seiju;
  var R = root.KaruteSeijuRender;
  var h = Karute.dom.h;

  function step(id, n, eyebrow, title, children) {
    return h("section", { class: "card seiju-block", id: id, "aria-labelledby": id + "-title", "data-order": String(n) },
      h("p", { class: "eyebrow" }, h("span", { class: "step-no" }, String(n)), " ", eyebrow),
      h("h2", { id: id + "-title" }, title),
      children);
  }

  function person(id, n, title, p) {
    return step(id, n, n === 1 ? "PERSON 01" : "PERSON 02", title, [
      h("div", { class: "seiju-person-head", "data-season": p.beast.season.id },
        R.crest(p.beast, true),
        h("div", null, h("p", { class: "seiju-name" }, p.beast.name), h("p", { class: "seiju-catch" }, p.beast.catchphrase))),
      R.tags(p.beast),
      h("p", { class: "seiju-meta" }, "生年月日：" + p.birthLabel,
        p.precision === "estimated" ? h("span", null, " ", h("span", { class: "seiju-badge-estimated" }, "推定")) : null),
      h("p", null, p.personality),
      R.traits(p.points),
      p.notes.map(function (x) { return h("p", { class: "seiju-note" }, x); })
    ]);
  }

  function render(container, v) {
    Karute.dom.clear(container);
    container.appendChild(h("h2", { class: "visually-hidden", tabindex: "-1", id: "seiju-aisho-heading" }, "星獣カルテの相性の鑑定結果"));

    container.appendChild(person("seiju-aisho-you", 1, "あなたの星獣", v.you));
    container.appendChild(person("seiju-aisho-partner", 2, "お相手の星獣", v.partner));

    container.appendChild(step("seiju-aisho-total", 3, "TOTAL", "ふたりの総合相性", [
      h("p", { class: "seiju-category" }, h("span", { class: "seiju-category-label" }, v.total.label)),
      h("p", null, v.total.lead),
      v.total.sameBeastNote ? h("p", { class: "seiju-note" }, v.total.sameBeastNote) : null,
      h("ul", { class: "seiju-factors" }, v.total.factors.map(function (f) {
        return h("li", { class: "seiju-factor" }, h("h3", null, f.title, h("span", { class: "seiju-pill" }, f.label)), h("p", null, f.text));
      })),
      h("p", { class: "seiju-method" }, v.total.method)
    ]));

    container.appendChild(step("seiju-aisho-detail", 4, "DETAILS", "詳細な相性", v.details.map(function (d) {
      return h("div", { class: "seiju-reading" }, h("h3", null, d.title),
        d.text ? h("p", null, d.text) : null,
        d.list ? h("ul", { class: "seiju-list" }, d.list.map(function (x) { return h("li", null, x); })) : null);
    })));

    container.appendChild(step("seiju-aisho-intimacy", 5, "INTIMACY", "親密さ・スキンシップの相性", [
      h("p", { class: "seiju-meta" }, v.intimacy.lead),
      h("p", null, v.intimacy.text),
      R.traits(v.intimacy.points)
    ]));
  }

  function init() {
    var form = document.getElementById("seiju-aisho-form");
    var output = document.getElementById("seiju-aisho-result-body");
    var wrap = document.getElementById("seiju-aisho-result");
    if (!form || !output || !wrap) return;

    var you = Karute.BirthDateField.mount(form.querySelector("[data-birthdate='self']"), {
      idPrefix: "self", legend: "あなたの生年月日", useProfile: true
    });
    // お相手の生年月日は保存しない
    var partner = Karute.BirthDateField.mount(form.querySelector("[data-birthdate='partner']"), {
      idPrefix: "partner", legend: "お相手の生年月日", useProfile: false
    });

    form.addEventListener("submit", function (event) {
      event.preventDefault();
      var b = partner.read();
      var a = you.read(); // フォーカスは上（あなた）のエラーを優先
      if (!a.ok || !b.ok) return;
      you.commit(a.value);
      render(output, content.buildSeijuCompatibilityView(engine.calculateSeijuCompatibility(a.value, b.value)));
      wrap.hidden = false;
      Karute.dom.scrollTo(wrap);
      var heading = document.getElementById("seiju-aisho-heading");
      if (heading) heading.focus({ preventScroll: true });
    });
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})(typeof self !== "undefined" ? self : this);
