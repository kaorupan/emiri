/*
 * /jyotish/aisho/ インド占星術の相性ページ（アシュタクータ・36点満点）
 * 表示順：1.あなた → 2.お相手 → 3.ふたりの点数 → 4.8つの項目
 */
(function (root) {
  "use strict";
  var Karute = root.Karute, h = Karute.dom.h, R = root.KaruteKyuseiRender, C = root.KaruteCompatPage;
  var engine = root.KaruteEngines.jyotish, content = root.KaruteContent.jyotish;

  function person(id, n, title, p) {
    return C.step(id, n, n === 1 ? "PERSON 01" : "PERSON 02", title, [
      h("p", { class: "kyusei-meta" }, "生年月日：" + p.birthLabel),
      R.traits([["月の星座", p.moon], ["ナクシャトラ", p.nakshatra]]),
      p.mayChange ? h("p", { class: "kyusei-note" }, "この日は月がナクシャトラを移る日です。生まれた時刻を入れると確定します。") : null
    ]);
  }

  function score(k, caption) {
    return h("div", { class: "jyo-score" },
      caption ? h("p", { class: "kyusei-meta" }, caption) : null,
      h("p", { class: "jyo-total" }, h("b", null, String(k.total)), " / 36点"),
      h("p", { class: "kyusei-category" }, h("span", { class: "kyusei-category-label" }, k.label)),
      h("p", null, k.text));
  }

  function items(k) {
    return h("ul", { class: "kyusei-factors" }, k.items.map(function (it) {
      return h("li", { class: "kyusei-factor" },
        h("p", { class: "kyusei-factor-head" }, it.name, h("span", { class: "kyusei-pill" }, it.score + " / " + it.max)),
        h("p", null, it.text + (it.detail ? "（" + it.detail + "）" : "")),
        it.exception ? h("p", { class: "kyusei-meta" }, it.exception) : null);
    }));
  }

  function build(a, b) {
    var v = content.buildJyotishCompatibilityView(engine.calculateJyotishCompatibility(a, b));
    var scoreBlock = v.same
      ? [score(v.youAsGroom)]
      : [h("p", { class: "kyusei-meta" }, "アシュタクータは、伝統的に男性側と女性側を分けて計算するため、一部の項目で向きによって点数が変わります。ふたりの場合は次のとおりです。"),
        h("div", { class: "jyo-scores" }, score(v.youAsGroom, "あなたを男性側とした場合"), score(v.youAsBride, "あなたを女性側とした場合"))];
    return [
      person("jyo-aisho-you", 1, "あなたの月", v.you),
      person("jyo-aisho-partner", 2, "お相手の月", v.partner),
      C.step("jyo-aisho-total", 3, "GUNA MILAN", "ふたりの点数（36点満点）", [C.tradition("インド占星術での位置づけ", v.tradition)].concat(scoreBlock)),
      C.step("jyo-aisho-detail", 4, "ASHTAKOOTA", "8つの項目", [
        v.same ? null : h("p", { class: "kyusei-meta" }, "下の内訳は「あなたを男性側とした場合」です。"),
        items(v.youAsGroom)
      ])
    ];
  }

  function init() {
    C.mount({ prefix: "jyo-aisho", heading: "インド占星術の相性の鑑定結果", withTime: true,
      timeHint: "月はおよそ1日でナクシャトラを移るため、時刻が分かると相性がより正確になります。日本時間で入力してください（保存しません）。",
      build: build });
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})(typeof self !== "undefined" ? self : this);
