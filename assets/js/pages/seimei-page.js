/*
 * /seimei/ 姓名判断 個人鑑定ページ
 * 計算：KaruteEngines.seimei / 文章：KaruteContent.seimei / 部品：seimei-render.js・kyusei-render.js
 * 表示順：名前と画数・総合 → 五格の一覧 → 人格 → 総格 → 地格 → 外格 → 天格 → 三才配置 →（HTML側）次にできること
 */
(function (root) {
  "use strict";
  var Karute = root.Karute;
  var content = root.KaruteContent.seimei;
  var R = root.KaruteKyuseiRender;
  var S = root.KaruteSeimeiRender;
  var h = Karute.dom.h;

  var EYEBROW = { jin: "PERSONALITY", sou: "WHOLE LIFE", chi: "FOUNDATION", gai: "RELATIONSHIPS", ten: "HERITAGE" };
  function pad(n) { return n < 10 ? "0" + n : String(n); }

  function tradition(text) {
    return h("div", { class: "kyusei-tradition" }, h("p", { class: "kyusei-source" }, "姓名判断での位置づけ"), h("p", null, text));
  }

  function table(v) {
    return h("table", { class: "seimei-table" },
      h("thead", null, h("tr", null, h("th", { scope: "col" }, "格"), h("th", { scope: "col" }, "画数"), h("th", { scope: "col" }, "吉凶"), h("th", { scope: "col" }, "意味"))),
      h("tbody", null, v.kakus.map(function (k) {
        return h("tr", { "data-kaku": k.key },
          h("th", { scope: "row" }, k.name, h("small", null, k.short)),
          h("td", { class: "seimei-num" }, String(k.value), k.rei ? h("small", null, "霊数含む") : null),
          h("td", null, S.luckBadge(k.luck)),
          h("td", null, k.keyword));
      })));
  }

  function kakuSection(k, withTraits) {
    return R.section("seimei-" + k.key, EYEBROW[k.key], k.name + "：" + k.value + "画", [
      h("p", { class: "kyusei-meta" }, k.reading + "・" + k.alias + "｜" + k.how + (k.rei ? "（霊数1を含む）" : "")),
      tradition(k.role),
      h("p", { class: "seimei-lead" }, S.luckBadge(k.luck), " ", k.keyword),
      k.wrapped ? h("p", { class: "kyusei-meta" }, k.value + "は81を超えるため、80を引いた" + k.n + "の数として読みます。") : null,
      h("p", null, k.text),
      withTraits ? R.traits([["恋愛・人間関係", k.love], ["仕事・お金", k.work]]) : null,
      h("p", { class: "kyusei-meta" }, h("a", { href: "kakusu/" + pad(k.n) + "/" }, k.n + "画の意味をくわしく見る →"))
    ]);
  }

  function render(container, v) {
    Karute.dom.clear(container);
    container.appendChild(h("h2", { class: "visually-hidden", tabindex: "-1", id: "seimei-result-heading" }, "姓名判断の鑑定結果"));

    container.appendChild(R.section("seimei-summary", "NAME READING", v.fullName + " さんの姓名判断", [
      S.nameStrokes(v.chars.sei, v.chars.mei),
      h("div", { class: "seimei-score" },
        h("p", { class: "seimei-score-num" }, String(v.score), h("small", null, "点")),
        h("p", { class: "seimei-score-label" }, v.scoreLabel)),
      h("p", null, v.scoreText),
      h("p", null, v.summary),
      h("p", { class: "kyusei-meta" }, "点数は、五格の吉凶と三才配置から出した、えみり独自の目安です。")
    ], "kyusei-summary"));

    container.appendChild(R.section("seimei-gokaku", "FIVE GRIDS", "五格の一覧", [
      table(v),
      v.rei.length ? h("p", { class: "kyusei-note" }, v.rei.join("")) : null
    ]));

    v.kakus.forEach(function (k) { container.appendChild(kakuSection(k, k.key === "jin" || k.key === "sou")); });

    container.appendChild(R.section("seimei-sansai", "SANSAI", "三才配置：" + v.sansai.ten + "・" + v.sansai.jin + "・" + v.sansai.chi, [
      tradition("三才配置は、天格・人格・地格の数の下1桁を五行（木・火・土・金・水）に当てはめ、その流れを見る方法です。1・2は木、3・4は火、5・6は土、7・8は金、9・0は水になります。"),
      h("ol", { class: "seimei-sansai" },
        h("li", null, h("b", null, "天格"), v.sansai.tenLabel),
        h("li", null, h("b", null, "人格"), v.sansai.jinLabel),
        h("li", null, h("b", null, "地格"), v.sansai.chiLabel)),
      h("p", { class: "kyusei-source" }, "えみりの読み解き"),
      h("p", null, v.sansai.lead),
      R.traits(v.sansai.details)
    ]));

    container.appendChild(R.section("seimei-advice", "MESSAGE", "名前からのメッセージ", [
      h("p", { class: "seimei-lead" }, v.advice),
      h("p", { class: "kyusei-meta" }, "姓名判断は、流派によって画数の数え方や吉凶の区分が異なります。えみりでは今の字形で数えています（くわしくはページ下の「姓名判断とは？」）。")
    ]));
  }

  function init() {
    var form = document.getElementById("seimei-form");
    var output = document.getElementById("seimei-result-body");
    var wrap = document.getElementById("seimei-result");
    if (!form || !output || !wrap) return;
    var field = S.nameField(form.querySelector("[data-name='self']"), { idPrefix: "self", legend: "鑑定する名前" });
    form.addEventListener("submit", function (event) {
      event.preventDefault();
      var input = field.read();
      if (!input.ok) return;
      render(output, content.buildSeimeiView(input.result));
      wrap.hidden = false;
      Karute.dom.scrollTo(wrap);
      var heading = document.getElementById("seimei-result-heading");
      if (heading) heading.focus({ preventScroll: true });
    });
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})(typeof self !== "undefined" ? self : this);
