/*
 * /kyusei/ 九星気学 個人鑑定ページ
 * 計算：KaruteEngines.kyusei / 文章：KaruteContent.kyusei / 描画：このファイル（共通部品は kyusei-render.js）
 * 表示順：要約 → 本命星 → 月命星 → 基本性格 → 内面 → 組み合わせ → 強み → 苦手 → 仕事 → 恋愛 → 人間関係 → 成長 →（HTML側）次にできること
 */
(function (root) {
  "use strict";
  var Karute = root.Karute;
  var engine = root.KaruteEngines.kyusei;
  var content = root.KaruteContent.kyusei;
  var R = root.KaruteKyuseiRender;
  var h = Karute.dom.h;

  function render(container, v, onUseTime) {
    Karute.dom.clear(container);
    container.appendChild(h("h2", { class: "visually-hidden", tabindex: "-1", id: "kyusei-result-heading" }, "九星気学の鑑定結果"));

    // 1. 要約
    container.appendChild(R.section("kyusei-summary", "NINE STAR KI KARTE", "あなたの九星気学カルテ", [
      h("p", { class: "kyusei-meta" }, v.birthLabel + "生まれ",
        v.precision === "estimated" ? h("span", null, " ", h("span", { class: "kyusei-badge-estimated" }, "推定")) : null),
      h("div", { class: "kyusei-pair" },
        R.starBlock("本命星", v.honmei),
        h("p", { class: "kyusei-pair-rel" }, h("span", { class: "visually-hidden" }, "ふたつの星の関係："), v.combination.label),
        R.starBlock("月命星", v.getsumei)),
      h("p", { class: "kyusei-catch" }, v.summary.catchphrase),
      h("p", null, v.summary.lead),
      R.boundaryNotice(v.term.boundary, onUseTime),
      v.precisionNote ? h("p", { class: "kyusei-note" }, v.precisionNote) : null
    ], "kyusei-summary"));

    // 2. 本命星
    container.appendChild(R.section("kyusei-honmei", "HONMEI STAR", "本命星：" + v.honmei.name, [
      R.tradition(v.honmeiSection.tradition),
      h("p", null, v.honmeiSection.text),
      R.traits(v.honmeiSection.facts),
      h("p", { class: "kyusei-meta" }, v.term.lines[0]),
      h("h3", null, "九星と五行"),
      R.nineStars(v.honmei.number, v.getsumei.number)
    ]));

    // 3. 月命星
    container.appendChild(R.section("kyusei-getsumei", "GETSUMEI STAR", "月命星：" + v.getsumei.name, [
      R.tradition(v.getsumeiSection.tradition),
      h("p", null, v.getsumeiSection.text),
      R.traits(v.getsumeiSection.facts),
      h("p", { class: "kyusei-meta" }, v.term.lines[1])
    ]));

    // 4. 本命星の基本性格
    container.appendChild(R.section("kyusei-basic", "", "本命星の基本性格", [h("p", null, v.basic)]));
    // 5. 月命星が表す内面
    container.appendChild(R.section("kyusei-inner", "", "月命星が表す内面", [h("p", null, v.inner)]));

    // 6. 本命星 × 月命星
    var c = v.combination;
    container.appendChild(R.section("kyusei-combination", "HONMEI × GETSUMEI", "本命星 × 月命星の組み合わせ", [
      h("p", { class: "kyusei-category" }, h("span", { class: "kyusei-category-label" }, c.label)),
      R.elementCycle([{ element: v.honmei.element, label: "本命" }, { element: v.getsumei.element, label: "月命" }]),
      R.tradition(c.tradition),
      h("p", { class: "kyusei-source" }, "えみりの読み解き"),
      h("p", null, c.text),
      R.traits([["この組み合わせの強み", c.strength], ["気をつけたいこと", c.caution]])
    ]));

    // 7〜12
    container.appendChild(R.section("kyusei-strength", "", "強み", [
      h("ul", { class: "kyusei-list" }, v.strengths.map(function (s) { return h("li", null, s); })),
      h("p", { class: "kyusei-meta" }, v.strengthsNote)
    ]));
    container.appendChild(R.section("kyusei-weakness", "", "苦手になりやすいこと", [
      h("ul", { class: "kyusei-list" }, v.weaknesses.map(function (s) { return h("li", null, s); })),
      h("p", { class: "kyusei-meta" }, v.weaknessNote)
    ]));
    container.appendChild(R.section("kyusei-work", "", "仕事・才能", [h("p", null, v.work)]));
    container.appendChild(R.section("kyusei-love", "", "恋愛", [h("p", null, v.love)]));
    container.appendChild(R.section("kyusei-relations", "", "人間関係", [h("p", null, v.relations)]));
    container.appendChild(R.section("kyusei-growth", "", "成長のヒント", [h("p", null, v.growth), h("p", null, v.growthExtra)]));
  }

  function init() {
    var form = document.getElementById("kyusei-form");
    var output = document.getElementById("kyusei-result-body");
    var wrap = document.getElementById("kyusei-result");
    if (!form || !output || !wrap) return;

    var field = Karute.BirthDateField.mount(form.querySelector("[data-birthdate='self']"), {
      idPrefix: "self", legend: "あなたの生年月日", useProfile: true
    });
    var time = R.timeField(form.querySelector("[data-birthtime='self']"), {
      idPrefix: "self",
      legend: "生まれた時刻（任意）",
      collapsible: false,
      hint: "立春や節入りの当日に生まれた方は、生まれた時刻によって本命星・月命星が変わることがあります。分かる場合だけ、日本時間で入力してください。それ以外の日は入力しなくても結果は変わりません。時刻は保存しません。"
    });

    function useTime() {
      Karute.dom.scrollTo(time.element);
      time.focus();
    }

    form.addEventListener("submit", function (event) {
      event.preventDefault();
      var input = field.read();
      if (!input.ok) return;
      var t = time.read();
      if (!t.ok) return;
      field.commit(input.value); // 保存するのは生年月日だけ（時刻は保存しない）
      var birth = { year: input.value.year, month: input.value.month, day: input.value.day, time: t.value };
      var kr = engine.calculateKyusei(birth);
      render(output, content.buildKyuseiView(kr), useTime);
      if (kr.honmeiStar) wrap.setAttribute("data-share", "わたしの本命星は「" + kr.honmeiStar.name + "」でした");
      wrap.hidden = false;
      Karute.dom.scrollTo(wrap);
      var heading = document.getElementById("kyusei-result-heading");
      if (heading) heading.focus({ preventScroll: true });
    });
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})(typeof self !== "undefined" ? self : this);
