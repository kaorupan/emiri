/*
 * /shibi/ 紫微斗数 個人鑑定ページ
 * 計算：KaruteEngines.shibi（旧暦は Karute.kyureki）/ 文章：KaruteContent.shibi / 描画：このファイル
 * 表示順：命盤 → 命宮 → 五行局と身宮 → 恋愛・お金・仕事 → 四化
 */
(function (root) {
  "use strict";
  var Karute = root.Karute, h = Karute.dom.h, R = root.KaruteKyuseiRender;
  var engine = root.KaruteEngines.shibi, content = root.KaruteContent.shibi;
  // 命盤の並び（行・列）。中央の2×2は空ける
  var CELL = { "巳": [1, 1], "午": [1, 2], "未": [1, 3], "申": [1, 4], "辰": [2, 1], "酉": [2, 4], "卯": [3, 1], "戌": [3, 4], "寅": [4, 1], "丑": [4, 2], "子": [4, 3], "亥": [4, 4] };

  function tradition(text) {
    return h("div", { class: "kyusei-tradition" }, h("p", { class: "kyusei-source" }, "紫微斗数での位置づけ"), h("p", null, text));
  }

  function chart(v) {
    return h("div", { class: "shibi-chart", role: "table", "aria-label": "命盤（12宮）" },
      v.grid.map(function (p) {
        var rc = CELL[p.branch];
        return h("div", { class: "shibi-cell" + (p.isMei ? " is-mei" : "") + (p.isShin ? " is-shin" : ""), role: "cell", style: "grid-row:" + rc[0] + ";grid-column:" + rc[1] },
          h("p", { class: "shibi-palace" }, p.name, p.isShin ? h("span", { class: "shibi-shin" }, "身") : null),
          h("p", { class: "shibi-major" }, p.major.length ? p.major.join(" ") : "—"),
          p.minor.length ? h("p", { class: "shibi-minor" }, p.minor.join(" ")) : null,
          h("p", { class: "shibi-branch" }, p.stem + p.branch));
      }),
      h("div", { class: "shibi-center", style: "grid-row:2 / span 2;grid-column:2 / span 2" },
        h("p", null, v.birthLabel), h("p", null, v.lunarLabel), h("p", { class: "shibi-kyoku" }, v.kyoku.name)));
  }

  function render(container, v) {
    Karute.dom.clear(container);
    container.appendChild(h("h2", { class: "visually-hidden", tabindex: "-1", id: "shibi-result-heading" }, "紫微斗数の鑑定結果"));
    container.appendChild(R.section("shibi-summary", "ZI WEI DOU SHU", "あなたの命盤", [
      h("p", { class: "kyusei-meta" }, v.birthLabel + "生まれ（" + v.lunarLabel + "）"),
      chart(v),
      h("p", { class: "kyusei-meta" }, v.gridNote),
      v.leapNote ? h("p", { class: "kyusei-note" }, v.leapNote) : null,
      tradition(v.tradition.chart)
    ], "kyusei-summary"));
    container.appendChild(R.section("shibi-mei", "LIFE PALACE", "命宮：" + (v.mei.stars.join("・") || "主星なし"), [
      tradition(v.tradition.mei),
      v.mei.borrowed ? h("p", { class: "kyusei-note" }, "命宮に主星がない「空宮」のため、向かい側の遷移宮の星（" + v.mei.stars.join("・") + "）を借りて読んでいます。") : null,
      v.mei.texts.map(function (t) { return h("div", null, h("p", { class: "maya-lead" }, t.star + "星：" + t.keyword), h("p", null, t.text)); })
    ]));
    container.appendChild(R.section("shibi-kyoku", "", "五行局と身宮", [tradition(v.tradition.kyoku), R.traits([[v.kyoku.name, v.kyoku.text], ["身宮", v.shin.text]])]));
    container.appendChild(R.section("shibi-readings", "", "恋愛・お金・仕事", v.readings.map(function (rd) {
      return h("div", { class: "kyusei-reading" },
        h("h3", null, rd.name + "（" + rd.theme + "）" + (rd.stars.length ? "：" + rd.stars.join("・") : "")),
        rd.borrowed ? h("p", { class: "kyusei-meta" }, "主星のない宮のため、向かい側の宮の星で読んでいます。") : null,
        rd.texts.map(function (t) { return h("p", null, t); }));
    })));
    container.appendChild(R.section("shibi-sika", "FOUR TRANSFORMATIONS", "四化（生まれ年の星の変化）", [
      tradition(v.tradition.sika),
      R.traits(v.sika.map(function (s) { return [s.title, s.text]; }))
    ]));
  }

  function init() {
    var form = document.getElementById("shibi-form");
    var output = document.getElementById("shibi-result-body");
    var wrap = document.getElementById("shibi-result");
    if (!form || !output || !wrap) return;
    var field = Karute.BirthDateField.mount(form.querySelector("[data-birthdate='self']"), { idPrefix: "self", legend: "あなたの生年月日", useProfile: true });
    var time = R.timeField(form.querySelector("[data-birthtime='self']"), {
      idPrefix: "self", legend: "生まれた時刻（必須）", collapsible: false,
      hint: "紫微斗数は、生まれた時刻（2時間ごとの時辰）で命盤が決まります。日本時間で入力してください。分からない場合は、母子手帳などで確かめてみてください。時刻は保存しません。"
    });
    var timeError = document.getElementById("shibi-time-required");
    form.addEventListener("submit", function (event) {
      event.preventDefault();
      var input = field.read();
      if (!input.ok) return;
      var t = time.read();
      if (!t.ok) return;
      if (!t.value) {
        timeError.hidden = false;
        time.focus();
        return;
      }
      timeError.hidden = true;
      field.commit(input.value);
      var r;
      try { r = engine.calculateShibi({ year: input.value.year, month: input.value.month, day: input.value.day, time: t.value }); } catch (e) {
        Karute.dom.clear(output);
        output.appendChild(h("p", { class: "card kyusei-note", role: "alert" }, "この生年月日は計算できる範囲の外のため、鑑定できません。"));
        wrap.hidden = false;
        return;
      }
      render(output, content.buildShibiView(r));
      wrap.hidden = false;
      Karute.dom.scrollTo(wrap);
      var heading = document.getElementById("shibi-result-heading");
      if (heading) heading.focus({ preventScroll: true });
    });
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})(typeof self !== "undefined" ? self : this);
