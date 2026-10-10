/*
 * /shukuyo/aisho/ 宿曜占星術の相性ページ
 * 表示順：1.あなた → 2.お相手 → 3.ふたりの関係 → 4.恋愛・仕事
 */
(function (root) {
  "use strict";
  var Karute = root.Karute, h = Karute.dom.h, R = root.KaruteKyuseiRender, C = root.KaruteCompatPage;
  var engine = root.KaruteEngines.shukuyo, content = root.KaruteContent.shukuyo;

  function person(id, n, title, p) {
    return C.step(id, n, n === 1 ? "PERSON 01" : "PERSON 02", title, [
      h("p", { class: "kyusei-meta" }, "生年月日：" + p.birthLabel + "（" + p.lunarLabel + "）"),
      h("div", { class: "shuku-main" }, h("p", { class: "shuku-name" }, p.shuku), h("p", { class: "shuku-key" }, p.keyword)),
      p.nearEdge ? h("p", { class: "kyusei-note" }, "旧暦の月の境目に近い日のお生まれのため、本命宿が前後の宿になる可能性があります。") : null
    ]);
  }

  function build(a, b) {
    var v = content.buildShukuyoCompatibilityView(engine.calculateShukuyoCompatibility(a, b));
    return [
      person("shuku-aisho-you", 1, "あなたの本命宿", v.you),
      person("shuku-aisho-partner", 2, "お相手の本命宿", v.partner),
      C.step("shuku-aisho-total", 3, "TOTAL", "ふたりの関係：" + v.pair.title, [
        C.tradition("宿曜占星術での位置づけ", v.tradition),
        h("p", { class: "kyusei-source" }, "えみりの読み解き"),
        h("p", null, v.pair.body),
        h("p", null, v.youSee),
        v.partnerSees ? h("p", null, v.partnerSees) : null,
        v.distance ? h("p", { class: "kyusei-meta" }, v.distance) : null
      ]),
      C.step("shuku-aisho-detail", 4, "DETAILS", "恋愛・仕事の相性", [R.traits(v.details)])
    ];
  }

  function init() { C.mount({ prefix: "shuku-aisho", heading: "宿曜占星術の相性の鑑定結果", withTime: false, build: build }); }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})(typeof self !== "undefined" ? self : this);
