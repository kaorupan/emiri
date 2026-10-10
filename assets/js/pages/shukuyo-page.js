/*
 * /shukuyo/ 宿曜占星術 個人鑑定ページ
 * 計算：KaruteEngines.shukuyo（旧暦は Karute.kyureki）/ 文章：KaruteContent.shukuyo / 描画：このファイル
 * 表示順：本命宿 → 性格 → 恋愛と仕事 → 今日のあなた → 27宿との相性 →（HTML側）次にできること
 */
(function (root) {
  "use strict";
  var Karute = root.Karute;
  var engine = root.KaruteEngines.shukuyo;
  var content = root.KaruteContent.shukuyo;
  var R = root.KaruteKyuseiRender;
  var h = Karute.dom.h;

  function tradition(text) {
    return h("div", { class: "kyusei-tradition" }, h("p", { class: "kyusei-source" }, "宿曜占星術での位置づけ"), h("p", null, text));
  }

  function chips(list) {
    if (!list.length) return h("span", { class: "shuku-none" }, "—");
    return list.map(function (x) { return h("span", { class: "shuku-chip" }, x.name + (x.type ? "（" + x.type + "）" : "")); });
  }

  function render(container, v) {
    Karute.dom.clear(container);
    container.appendChild(h("h2", { class: "visually-hidden", tabindex: "-1", id: "shuku-result-heading" }, "宿曜占星術の鑑定結果"));

    container.appendChild(R.section("shuku-summary", "SHUKUYO", "あなたの本命宿", [
      h("p", { class: "kyusei-meta" }, v.birthLabel + "生まれ（" + v.lunarLabel + "）"),
      h("div", { class: "shuku-main" },
        h("p", { class: "shuku-name" }, v.honmei.name),
        h("p", { class: "shuku-reading" }, v.honmei.reading),
        h("p", { class: "shuku-key" }, v.honmei.keyword)),
      v.nearEdge ? h("p", { class: "kyusei-note" }, v.nearEdge) : null,
      v.leapNote ? h("p", { class: "kyusei-note" }, v.leapNote) : null
    ], "kyusei-summary"));

    container.appendChild(R.section("shuku-character", "", v.honmei.name + "の性格", [
      tradition(v.honmei.tradition),
      h("p", null, v.honmei.body)
    ]));

    container.appendChild(R.section("shuku-lovework", "", "恋愛と仕事", [R.traits([["恋愛", v.honmei.love], ["仕事", v.honmei.work]])]));

    var t = v.today;
    container.appendChild(R.section("shuku-today", "TODAY", "今日のあなた", [
      tradition(t.tradition),
      h("p", { class: "kyusei-meta" }, t.dateLabel + "（" + t.lunarLabel + "・" + t.rokuyo + "）は" + t.shuku + "の日"),
      h("p", { class: "shuku-day" }, h("b", null, "「" + t.type + "」の日"), t.distance ? "（" + t.distance + "）" : ""),
      h("p", null, t.text)
    ]));

    container.appendChild(R.section("shuku-relations", "SANKU NO HIHOU", "27宿との相性", [
      tradition(v.relationsTradition),
      h("div", { class: "shuku-groups" }, v.groups.map(function (g) {
        var rows = g.pair === "命" || g.pair === "業胎"
          ? [h("div", { class: "shuku-row" }, h("dt", null, "宿"), h("dd", null, chips(g.other)))]
          : [["近距離", g.near], ["中距離", g.middle], ["遠距離", g.far]].map(function (r) { return h("div", { class: "shuku-row" }, h("dt", null, r[0]), h("dd", null, chips(r[1]))); });
        return h("section", { class: "shuku-group", "aria-label": g.title },
          h("h3", null, g.title),
          h("p", null, g.body),
          h("dl", { class: "shuku-dl" }, rows));
      }))
    ]));
  }

  function init() {
    var form = document.getElementById("shuku-form");
    var output = document.getElementById("shuku-result-body");
    var wrap = document.getElementById("shuku-result");
    if (!form || !output || !wrap) return;
    var field = Karute.BirthDateField.mount(form.querySelector("[data-birthdate='self']"), {
      idPrefix: "self", legend: "あなたの生年月日", useProfile: true
    });
    form.addEventListener("submit", function (event) {
      event.preventDefault();
      var input = field.read();
      if (!input.ok) return;
      field.commit(input.value);
      var r;
      try { r = engine.calculateShukuyo(input.value); } catch (e) {
        Karute.dom.clear(output);
        output.appendChild(h("p", { class: "card kyusei-note", role: "alert" }, "この生年月日は旧暦の計算範囲外のため、鑑定できません。"));
        wrap.hidden = false;
        return;
      }
      render(output, content.buildShukuyoView(r, Karute.date.todayInJapan(), engine));
      wrap.hidden = false;
      Karute.dom.scrollTo(wrap);
      var heading = document.getElementById("shuku-result-heading");
      if (heading) heading.focus({ preventScroll: true });
    });
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})(typeof self !== "undefined" ? self : this);
