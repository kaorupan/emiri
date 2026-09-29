/*
 * /kyusei/aisho/ 九星気学の相性ページ
 * 表示順（固定）：1.あなた → 2.お相手 → 3.総合相性 → 4.詳細な相性 → 5.親密さ・スキンシップ
 */
(function (root) {
  "use strict";
  var Karute = root.Karute;
  var engine = root.KaruteEngines.kyusei;
  var content = root.KaruteContent.kyusei;
  var R = root.KaruteKyuseiRender;
  var h = Karute.dom.h;

  function step(id, n, eyebrow, title, children) {
    return h("section", { class: "card kyusei-block", id: id, "aria-labelledby": id + "-title", "data-order": String(n) },
      h("p", { class: "eyebrow" }, h("span", { class: "kyusei-step-no" }, String(n)), " ", eyebrow),
      h("h2", { id: id + "-title" }, title),
      children);
  }

  function person(id, n, title, p, onUseTime) {
    return step(id, n, n === 1 ? "PERSON 01" : "PERSON 02", title, [
      h("p", { class: "kyusei-meta" }, "生年月日：" + p.birthLabel,
        p.precisionNote ? h("span", null, " ", h("span", { class: "kyusei-badge-estimated" }, "推定")) : null),
      h("div", { class: "kyusei-pair" },
        R.starBlock("本命星", p.honmei),
        h("p", { class: "kyusei-pair-rel" }, h("span", { class: "visually-hidden" }, "ふたつの星の関係："), p.points[2][1]),
        R.starBlock("月命星", p.getsumei)),
      h("p", { class: "kyusei-catch" }, p.catchphrase),
      R.traits(p.points.slice(0, 2)),
      R.boundaryNotice(p.boundary, onUseTime),
      p.precisionNote ? h("p", { class: "kyusei-note" }, p.precisionNote) : null
    ]);
  }

  function render(container, v, useTime) {
    Karute.dom.clear(container);
    container.appendChild(h("h2", { class: "visually-hidden", tabindex: "-1", id: "kyusei-aisho-heading" }, "九星気学の相性の鑑定結果"));

    container.appendChild(person("kyusei-aisho-you", 1, "あなたの九星気学", v.you, function () { useTime("self"); }));
    container.appendChild(person("kyusei-aisho-partner", 2, "お相手の九星気学", v.partner, function () { useTime("partner"); }));

    container.appendChild(step("kyusei-aisho-total", 3, "TOTAL", "ふたりの総合相性", [
      h("p", { class: "kyusei-category" }, h("span", { class: "kyusei-category-label" }, v.total.label)),
      R.elementCycle([
        { element: v.you.honmei.element, label: "あなた" },
        { element: v.partner.honmei.element, label: "お相手" }
      ]),
      R.tradition(v.total.tradition),
      h("p", { class: "kyusei-source" }, "占いのカルテの読み解き"),
      h("p", null, v.total.lead),
      h("p", null, v.total.direction),
      h("div", { class: "kyusei-factor" }, h("h3", null, "内面（月命星どうし）", h("span", { class: "kyusei-pill" }, v.total.inner.label)), h("p", null, v.total.inner.text)),
      v.anyMayChange ? h("p", { class: "kyusei-note" }, "生まれた時刻によって星が変わる可能性がある方がいるため、相性の読み解きも変わる場合があります。上のお知らせをご確認ください。") : null,
      h("p", { class: "kyusei-method" }, v.total.method)
    ]));

    container.appendChild(step("kyusei-aisho-detail", 4, "DETAILS", "詳細な相性", [
      h("div", { class: "kyusei-reading" },
        h("h3", null, "五行の関係"),
        h("ul", { class: "kyusei-factors" }, v.relations.map(function (r) {
          return h("li", { class: "kyusei-factor" }, h("p", { class: "kyusei-factor-head" }, r.head, h("span", { class: "kyusei-pill" }, r.label)), h("p", null, r.text));
        })),
        h("p", { class: "kyusei-meta" }, v.relationsNote)),
      v.details.map(function (d) {
        return h("div", { class: "kyusei-reading" }, h("h3", null, d.title),
          d.text ? h("p", null, d.text) : null,
          d.list ? h("ul", { class: "kyusei-list" }, d.list.map(function (x) { return h("li", null, x); })) : null);
      })
    ]));

    container.appendChild(step("kyusei-aisho-intimacy", 5, "INTIMACY", "親密さ・スキンシップの相性", [
      h("p", { class: "kyusei-meta" }, "距離感や安心感など、親しくなるうえでの傾向です。いちばん大切なのは、おたがいの気持ちとペースを尊重することです。"),
      R.traits(v.intimacy.map(function (x) { return [x.title, x.text]; }))
    ]));
  }

  function init() {
    var form = document.getElementById("kyusei-aisho-form");
    var output = document.getElementById("kyusei-aisho-result-body");
    var wrap = document.getElementById("kyusei-aisho-result");
    if (!form || !output || !wrap) return;

    var you = Karute.BirthDateField.mount(form.querySelector("[data-birthdate='self']"), {
      idPrefix: "self", legend: "あなたの生年月日", useProfile: true
    });
    // お相手の生年月日は保存しない
    var partner = Karute.BirthDateField.mount(form.querySelector("[data-birthdate='partner']"), {
      idPrefix: "partner", legend: "お相手の生年月日", useProfile: false
    });
    var hint = "立春や節入りの当日生まれの場合だけ、結果が変わることがあります。分かる場合だけ日本時間で入力してください（保存しません）。";
    var times = {
      self: R.timeField(form.querySelector("[data-birthtime='self']"), { idPrefix: "self", legend: "あなたの生まれた時刻（任意）", collapsible: true, hint: hint }),
      partner: R.timeField(form.querySelector("[data-birthtime='partner']"), { idPrefix: "partner", legend: "お相手の生まれた時刻（任意）", collapsible: true, hint: hint })
    };

    function useTime(side) {
      Karute.dom.scrollTo(times[side].element);
      times[side].focus();
    }

    form.addEventListener("submit", function (event) {
      event.preventDefault();
      var tb = times.partner.read();
      var b = partner.read();
      var ta = times.self.read();
      var a = you.read(); // フォーカスは上（あなた）のエラーを優先
      if (!a.ok || !b.ok || !ta.ok || !tb.ok) return;
      you.commit(a.value);
      var birthA = { year: a.value.year, month: a.value.month, day: a.value.day, time: ta.value };
      var birthB = { year: b.value.year, month: b.value.month, day: b.value.day, time: tb.value };
      render(output, content.buildKyuseiCompatibilityView(engine.calculateKyuseiCompatibility(birthA, birthB)), useTime);
      wrap.hidden = false;
      Karute.dom.scrollTo(wrap);
      var heading = document.getElementById("kyusei-aisho-heading");
      if (heading) heading.focus({ preventScroll: true });
    });
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})(typeof self !== "undefined" ? self : this);
