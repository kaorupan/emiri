/*
 * /shichusuimei/aisho/ 四柱推命の相性ページ
 * 表示順：1.あなた → 2.お相手 → 3.日干の相性 → 4.ふたりの星 → 5.日支と五行
 */
(function (root) {
  "use strict";
  var Karute = root.Karute, h = Karute.dom.h, R = root.KaruteKyuseiRender, C = root.KaruteCompatPage;
  var engine = root.KaruteEngines.shichusuimei, content = root.KaruteContent.shichusuimei;

  function person(id, n, title, p) {
    return C.step(id, n, n === 1 ? "PERSON 01" : "PERSON 02", title, [
      h("p", { class: "kyusei-meta" }, "生年月日：" + p.birthLabel),
      h("p", { class: "ssm-catch" }, "日干 ", h("b", null, p.dayMaster), "・中心星 ", h("b", null, p.chushin)),
      h("p", { class: "kyusei-catch" }, p.catchphrase),
      R.traits([["命式（年・月・日" + (p.pillars.split("・").length > 3 ? "・時" : "") + "）", p.pillars]]),
      p.mayChange ? h("p", { class: "kyusei-note" }, "節入りの当日のお生まれです。生まれた時刻によって年柱・月柱が変わる可能性があります（日干は変わりません）。") : null
    ]);
  }

  function build(a, b) {
    var v = content.buildShichusuimeiCompatibilityView(engine.calculateShichusuimeiCompatibility(a, b));
    return [
      person("ssm-aisho-you", 1, "あなたの四柱推命", v.you),
      person("ssm-aisho-partner", 2, "お相手の四柱推命", v.partner),
      C.step("ssm-aisho-total", 3, "TOTAL", "日干の相性", [
        h("p", { class: "kyusei-category" }, h("span", { class: "kyusei-category-label" }, v.total.label)),
        h("p", { class: "kyusei-meta" }, v.total.stems),
        C.tradition("四柱推命での位置づけ", v.tradition),
        h("p", { class: "kyusei-source" }, "えみりの読み解き"),
        h("p", null, v.total.text)
      ]),
      C.step("ssm-aisho-stars", 4, "STARS", "ふたりの星（通変星）", [
        R.traits(v.stars.map(function (s) { return [s.title, s.text]; }))
      ]),
      C.step("ssm-aisho-detail", 5, "DETAILS", "暮らしの相性と五行", [
        h("h3", null, "日支（暮らし・家庭）：" + v.branch.label),
        h("p", { class: "kyusei-meta" }, v.branch.pair),
        h("p", null, v.branch.text),
        h("h3", null, "五行の補い合い"),
        v.complement.map(function (t) { return h("p", null, t); })
      ])
    ];
  }

  function init() {
    C.mount({ prefix: "ssm-aisho", heading: "四柱推命の相性の鑑定結果", withTime: true,
      timeHint: "節入りの当日生まれの場合、年柱・月柱が変わることがあります。分かる場合だけ日本時間で入力してください（保存しません）。日干の相性は時刻で変わりません。",
      build: build });
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})(typeof self !== "undefined" ? self : this);
