/*
 * /suhijutsu/aisho/ 数秘術の相性ページ
 * 表示順（固定）：1.あなた → 2.お相手 → 3.総合相性 → 4.詳細な相性 → 5.親密さ・スキンシップ
 */
(function (root) {
  "use strict";
  var Karute = root.Karute;
  var engine = root.KaruteEngines.numerology;
  var content = root.KaruteContent.numerology;
  var h = Karute.dom.h;

  function section(id, step, eyebrow, title, children) {
    return h("section", { class: "card num-block", id: id, "aria-labelledby": id + "-title", "data-order": String(step) },
      h("p", { class: "eyebrow" }, h("span", { class: "step-no" }, String(step)), " ", eyebrow),
      h("h2", { id: id + "-title" }, title),
      children);
  }

  function traitList(items) {
    return h("dl", { class: "num-traits" }, items.map(function (it) {
      return h("div", { class: "num-trait" }, h("dt", null, it[0]), h("dd", null, it[1]));
    }));
  }

  function renderPerson(id, step, title, v) {
    return section(id, step, v.who === "you" ? "PERSON 01" : "PERSON 02", title, [
      h("p", { class: "num-note" }, "生年月日：" + Karute.date.formatJa(v.birth)),
      h("ul", { class: "num-chips" }, v.numbers.map(function (n) {
        return h("li", { class: "num-chip" }, n.name + " ", h("b", null, String(n.number)), "｜" + n.label);
      })),
      h("p", { class: "num-tag" }, v.tag),
      h("p", null, v.summary),
      traitList(v.points),
      h("p", { class: "num-note" }, v.ideal)
    ]);
  }

  function renderTotal(v) {
    return section("aisho-total", 3, "TOTAL", "ふたりの総合相性", [
      h("div", { class: "num-score-hero" },
        h("p", { class: "num-score", "aria-label": "総合相性 " + v.score + "点（100点満点）" }, String(v.score), h("small", null, " / 100")),
        h("p", { class: "num-score-level" }, v.level)),
      h("p", { class: "num-lead" }, v.headline),
      h("p", null, v.message),
      h("ul", { class: "num-scores" }, v.categories.map(function (c) {
        return h("li", { class: "num-score-item" },
          h("span", { class: "num-score-name" }, c.name),
          h("b", null, String(c.score)),
          h("span", { class: "num-bar", "aria-hidden": "true" }, h("i", { style: "width:" + c.score + "%" })),
          h("small", null, c.note));
      })),
      h("p", { class: "num-method" }, v.method)
    ]);
  }

  function renderDetails(items) {
    return section("aisho-detail", 4, "DETAILS", "詳細な相性", items.map(function (it) {
      return h("div", { class: "num-reading" },
        h("h3", null, it.title,
          it.level ? h("span", { class: "num-pill" }, it.level + "（" + it.score + "）") : null,
          it.badge ? h("span", { class: "num-pill" }, it.badge) : null),
        it.text ? h("p", null, it.text) : null,
        it.list ? h("ul", { class: "num-list" }, it.list.map(function (x) { return h("li", null, x); })) : null);
    }));
  }

  function renderIntimacy(v) {
    return section("aisho-intimacy", 5, "INTIMACY", "親密さ・スキンシップの相性", [
      h("p", { class: "num-note" }, v.lead),
      h("p", { class: "num-score-level" }, "ペースの噛み合いやすさ：" + v.level),
      h("p", null, v.text),
      traitList(v.points)
    ]);
  }

  function render(container, view) {
    Karute.dom.clear(container);
    container.appendChild(h("h2", { class: "visually-hidden", tabindex: "-1", id: "aisho-result-heading" }, "相性の鑑定結果"));
    [
      renderPerson("aisho-you", 1, "あなたの数秘術", view.you),
      renderPerson("aisho-partner", 2, "お相手の数秘術", view.partner),
      renderTotal(view.total),
      renderDetails(view.details),
      renderIntimacy(view.intimacy)
    ].forEach(function (el) { container.appendChild(el); });
  }

  function init() {
    var form = document.getElementById("aisho-form");
    var output = document.getElementById("aisho-result-body");
    var resultWrap = document.getElementById("aisho-result");
    if (!form || !output || !resultWrap) return;

    var you = Karute.BirthDateField.mount(form.querySelector("[data-birthdate='self']"), {
      idPrefix: "self", legend: "あなたの生年月日", useProfile: true
    });
    // お相手の生年月日は保存しない
    var partner = Karute.BirthDateField.mount(form.querySelector("[data-birthdate='partner']"), {
      idPrefix: "partner", legend: "お相手の生年月日", useProfile: false
    });

    form.addEventListener("submit", function (event) {
      event.preventDefault();
      // 両方の入力欄にエラーを出し、フォーカスは上（あなた）のエラーを優先する
      var b = partner.read();
      var a = you.read();
      if (!a.ok || !b.ok) return;
      you.commit(a.value);

      var targetYear = Karute.date.todayInJapan().year;
      var result = engine.calculateCompatibility(a.value, b.value, { targetYear: targetYear });
      render(output, content.buildCompatibility(result));
      resultWrap.hidden = false;
      Karute.dom.scrollTo(resultWrap);
      var heading = document.getElementById("aisho-result-heading");
      if (heading) heading.focus({ preventScroll: true });
    });
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})(typeof self !== "undefined" ? self : this);
