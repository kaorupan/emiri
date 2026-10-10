/*
 * /shibi/aisho/ 紫微斗数の相性ページ（ふたりとも生まれた時刻が必要）
 * 表示順：1.あなた → 2.お相手 → 3.ふたりの命盤の縁 → 4.四化の飛び先
 */
(function (root) {
  "use strict";
  var Karute = root.Karute, h = Karute.dom.h, R = root.KaruteKyuseiRender, C = root.KaruteCompatPage;
  var engine = root.KaruteEngines.shibi, content = root.KaruteContent.shibi;

  function person(id, n, title, p) {
    return C.step(id, n, n === 1 ? "PERSON 01" : "PERSON 02", title, [
      h("p", { class: "kyusei-meta" }, p.birthLabel + "（" + p.lunarLabel + "）"),
      R.traits([["命宮の星", p.mei + (p.borrowed ? "（対宮から）" : "")], ["キーワード", p.keyword], ["五行局", p.kyoku]])
    ]);
  }

  function build(a, b) {
    if (!a.time || !b.time) throw new Error("time");
    var v = content.buildShibiCompatibilityView(engine.calculateShibiCompatibility(a, b));
    return [
      person("shibi-aisho-you", 1, "あなたの命宮", v.you),
      person("shibi-aisho-partner", 2, "お相手の命宮", v.partner),
      C.step("shibi-aisho-total", 3, "TOTAL", "ふたりの命盤の縁", [
        C.tradition("紫微斗数での位置づけ", v.tradition),
        h("p", { class: "kyusei-source" }, "えみりの読み解き"),
        R.traits([["五行局：" + v.kyoku.pair, v.kyoku.text]].concat(v.points)),
        v.points.length ? null : h("p", null, "命宮や夫妻宮の星に重なりはありません。似ているからではなく、違う個性どうしとして惹かれ合う組み合わせです。")
      ]),
      C.step("shibi-aisho-flying", 4, "FLYING STARS", "ふたりの四化（化禄・化忌）の飛び先", [
        h("p", { class: "kyusei-meta" }, "生まれ年の化禄（恵み）と化忌（こだわり）が、相手の命盤のどの宮に入るかを見ています。"),
        R.traits(v.flying)
      ])
    ];
  }

  function init() {
    C.mount({ prefix: "shibi-aisho", heading: "紫微斗数の相性の鑑定結果", withTime: true,
      timeHint: "紫微斗数の相性には、ふたりとも生まれた時刻（日本時間）が必要です（保存しません）。",
      build: build });
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})(typeof self !== "undefined" ? self : this);
