/*
 * /maya/aisho/ マヤ暦の相性ページ
 * 表示順：1.あなた → 2.お相手 → 3.ふたりの縁 → 4.ふたりのKIN
 */
(function (root) {
  "use strict";
  var Karute = root.Karute, h = Karute.dom.h, R = root.KaruteKyuseiRender, C = root.KaruteCompatPage;
  var engine = root.KaruteEngines.maya, content = root.KaruteContent.maya;

  function person(id, n, title, p) {
    return C.step(id, n, n === 1 ? "PERSON 01" : "PERSON 02", title, [
      h("p", { class: "kyusei-meta" }, "生年月日：" + p.birthLabel),
      h("div", { class: "maya-kin maya-kin-sm", "data-color": p.color },
        h("p", { class: "maya-kin-num" }, h("span", { class: "maya-kin-label" }, "KIN"), String(p.kin)),
        h("p", { class: "maya-kin-seal" }, p.seal),
        h("p", { class: "maya-kin-tone" }, "銀河の音 " + p.tone + "・ウェイブスペル " + p.wavespell)),
      h("p", { class: "maya-catch" }, p.keyword),
      p.leapDay ? h("p", { class: "kyusei-note" }, "2月29日生まれは、2月28日と同じKINで見ています。") : null
    ]);
  }

  function build(a, b) {
    var v = content.buildMayaCompatibilityView(engine.calculateMayaCompatibility(a, b));
    return [
      person("maya-aisho-you", 1, "あなたのKIN", v.you),
      person("maya-aisho-partner", 2, "お相手のKIN", v.partner),
      C.step("maya-aisho-total", 3, "TOTAL", "ふたりの縁", [
        C.tradition("マヤ暦での位置づけ", v.tradition),
        h("p", { class: "kyusei-source" }, "えみりの読み解き"),
        h("p", null, v.lead),
        v.links.length ? R.traits(v.links.map(function (l) { return [l.label, l.text]; })) : null,
        v.shared.length ? h("ul", { class: "kyusei-list" }, v.shared.map(function (s) { return h("li", null, s); })) : null
      ]),
      C.step("maya-aisho-pair", 4, "OUR KIN", "ふたりのKIN", [
        h("div", { class: "maya-kin maya-kin-sm", "data-color": v.pairKin.color },
          h("p", { class: "maya-kin-num" }, h("span", { class: "maya-kin-label" }, "KIN"), String(v.pairKin.kin)),
          h("p", { class: "maya-kin-seal" }, v.pairKin.seal),
          h("p", { class: "maya-kin-tone" }, "銀河の音 " + v.pairKin.tone)),
        h("p", null, v.pairKin.text)
      ])
    ];
  }

  function init() { C.mount({ prefix: "maya-aisho", heading: "マヤ暦の相性の鑑定結果", withTime: false, build: build }); }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})(typeof self !== "undefined" ? self : this);
