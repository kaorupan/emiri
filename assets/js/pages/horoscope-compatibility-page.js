/*
 * /horoscope/aisho/ ホロスコープの相性ページ
 * 表示順：1.あなた → 2.お相手 → 3.ふたりの星の相性 → 4.天体どうしの角度
 */
(function (root) {
  "use strict";
  var Karute = root.Karute, h = Karute.dom.h, R = root.KaruteKyuseiRender, C = root.KaruteCompatPage;
  var engine = root.KaruteEngines.horoscope, content = root.KaruteContent.horoscope;

  function person(id, n, title, p) {
    return C.step(id, n, n === 1 ? "PERSON 01" : "PERSON 02", title, [
      h("p", { class: "kyusei-meta" }, "生年月日：" + p.birthLabel),
      R.traits([["太陽", p.sun], ["月", p.moon], ["金星", p.venus], ["火星", p.mars]]),
      p.moonMayChange ? h("p", { class: "kyusei-note" }, "この日は月が星座を移る日です。生まれた時刻を入れると、月の星座が確定します。") : null
    ]);
  }

  function build(a, b) {
    var v = content.buildHoroscopeCompatibilityView(engine.calculateHoroscopeCompatibility(a, b));
    return [
      person("horo-aisho-you", 1, "あなたのホロスコープ", v.you),
      person("horo-aisho-partner", 2, "お相手のホロスコープ", v.partner),
      C.step("horo-aisho-total", 3, "TOTAL", "ふたりの星の相性", [
        C.tradition("西洋占星術での位置づけ", v.tradition),
        h("p", { class: "kyusei-source" }, "えみりの読み解き"),
        h("p", null, v.lead),
        R.traits([["太陽どうし：" + v.sun.label, v.sun.text], ["月どうし：" + v.moon.label, v.moon.text]])
      ]),
      C.step("horo-aisho-aspects", 4, "SYNASTRY", "ふたりの天体どうしの角度", [
        v.aspects.length ? h("ul", { class: "kyusei-factors" }, v.aspects.map(function (x) {
          return h("li", { class: "kyusei-factor horo-aspect-" + x.tone }, h("p", { class: "kyusei-factor-head" }, x.title), h("p", null, x.text));
        })) : h("p", null, "太陽・月・水星・金星・火星の組み合わせに、主要な角度はありません。")
      ])
    ];
  }

  function init() {
    C.mount({ prefix: "horo-aisho", heading: "ホロスコープの相性の鑑定結果", withTime: true,
      timeHint: "月の星座はおよそ2日半で変わるため、時刻が分かると月の相性がより正確になります。日本時間で入力してください（保存しません）。",
      build: build });
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})(typeof self !== "undefined" ? self : this);
