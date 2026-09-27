/*
 * /suhijutsu/ 数秘術の個人鑑定ページ
 * 計算：KaruteEngines.numerology / 文章：KaruteContent.numerology / 描画：このファイル
 */
(function (root) {
  "use strict";
  var Karute = root.Karute;
  var engine = root.KaruteEngines.numerology;
  var content = root.KaruteContent.numerology;
  var h = Karute.dom.h;

  function section(id, eyebrow, title, children, extraClass) {
    return h("section", { class: "card num-block" + (extraClass ? " " + extraClass : ""), id: id, "aria-labelledby": id + "-title" },
      h("p", { class: "eyebrow" }, eyebrow),
      h("h2", { id: id + "-title" }, title),
      children);
  }

  function traitList(items) {
    return h("dl", { class: "num-traits" }, items.map(function (it) {
      return h("div", { class: "num-trait" }, h("dt", null, it[0]), h("dd", null, it[1]));
    }));
  }

  function masterBadge(isMaster) {
    return isMaster ? h("span", { class: "num-master" }, "マスターナンバー") : null;
  }

  function renderSummary(v) {
    var table = h("table", { class: "num-table" },
      h("caption", { class: "visually-hidden" }, "あなたの数秘カルテ"),
      h("thead", null, h("tr", null,
        h("th", { scope: "col" }, "数秘"), h("th", { scope: "col" }, "数字"),
        h("th", { scope: "col" }, "見ているもの"), h("th", { scope: "col" }, "キーワード"))),
      h("tbody", null, v.rows.map(function (r) {
        return h("tr", null, h("th", { scope: "row" }, r.name), h("td", { class: "num-cell-number" }, String(r.number)),
          h("td", null, r.role), h("td", null, r.keyword));
      })));
    return section("num-summary", "YOUR NUMEROLOGY KARTE", "あなたの数秘カルテ", [
      h("div", { class: "num-table-wrap" }, table),
      h("div", { class: "num-core" },
        h("p", { class: "num-core-name" }, v.headline),
        h("p", { class: "num-core-copy" }, v.copy),
        traitList([["強み", v.strength], ["求めるもの", v.need], ["注意点", v.risk]]))
    ], "num-summary");
  }

  function renderLifePath(v) {
    return section("num-lifepath", "LIFE PATH NUMBER", "ライフパスナンバー", [
      h("div", { class: "num-hero" },
        h("p", { class: "num-big", "aria-label": "ライフパス " + v.number }, String(v.number)),
        masterBadge(v.master),
        h("p", { class: "num-tag" }, v.tag),
        h("p", { class: "num-lead" }, v.summary)),
      h("div", { class: "num-grid" }, v.sections.map(function (s) {
        return h("div", { class: "num-sub" }, h("h3", null, s.title), h("p", null, s.text));
      }))
    ]);
  }

  function renderNumberBlock(id, eyebrow, title, v) {
    return section(id, eyebrow, title, [
      h("div", { class: "num-inline" },
        h("p", { class: "num-mid", "aria-label": title + " " + v.number }, String(v.number)),
        h("div", null, h("p", { class: "num-tag" }, v.label), masterBadge(v.master))),
      h("p", { class: "num-note" }, v.lead),
      h("p", null, v.text),
      v.gap ? h("p", null, v.gap) : null,
      traitList([["強み", v.gift], ["求めるもの", v.need], ["注意点", v.risk]])
    ]);
  }

  function renderPersonalYear(v) {
    return section("num-year", "PERSONAL YEAR", v.year + "年のパーソナルイヤー", [
      h("div", { class: "num-inline" },
        h("p", { class: "num-mid", "aria-label": "パーソナルイヤー " + v.number }, String(v.number)),
        h("div", null, h("p", { class: "num-tag" }, "テーマ：「" + v.theme + "」"))),
      h("p", null, v.text)
    ]);
  }

  function renderDeep(items) {
    return section("num-deep", "DEEP READING", "詳細鑑定", items.map(function (it) {
      return h("div", { class: "num-reading" },
        h("h3", null, it.title),
        it.lead ? h("p", { class: "num-lead-strong" }, it.lead) : null,
        h("p", null, it.text),
        it.points ? traitList(it.points) : null);
    }));
  }

  function renderMonths(year, months) {
    return section("num-months", "12 MONTHS", year + "年 12ヶ月の流れ", [
      h("p", { class: "num-note" }, "パーソナルイヤーと月から出す「パーソナルマンス」で、月ごとのテーマを見ます。"),
      h("ol", { class: "num-months" }, months.map(function (m) {
        return h("li", { class: "num-month" },
          h("p", { class: "num-month-head" }, h("span", null, m.month + "月"), h("span", { class: "num-month-num" }, "PM " + m.number)),
          h("p", { class: "num-month-theme" }, m.theme),
          h("p", { class: "num-month-text" }, m.text));
      }))
    ]);
  }

  function render(container, view) {
    Karute.dom.clear(container);
    container.appendChild(h("h2", { class: "visually-hidden", tabindex: "-1", id: "num-result-heading" }, "鑑定結果"));
    [
      renderSummary(view.summary),
      renderLifePath(view.lifePath),
      renderNumberBlock("num-birthday", "BIRTHDAY NUMBER", "バースデーナンバー", view.birthday),
      renderNumberBlock("num-attitude", "ATTITUDE NUMBER", "アティチュードナンバー", view.attitude),
      renderPersonalYear(view.personalYear),
      renderDeep(view.deep),
      renderMonths(view.personalYear.year, view.months)
    ].forEach(function (el) { container.appendChild(el); });
  }

  function init() {
    var form = document.getElementById("suhijutsu-form");
    var output = document.getElementById("suhijutsu-result-body");
    var resultWrap = document.getElementById("suhijutsu-result");
    if (!form || !output || !resultWrap) return;

    var field = Karute.BirthDateField.mount(form.querySelector("[data-birthdate='self']"), {
      idPrefix: "self", legend: "あなたの生年月日", useProfile: true
    });

    form.addEventListener("submit", function (event) {
      event.preventDefault();
      var input = field.read();
      if (!input.ok) return;
      field.commit(input.value);

      var targetYear = Karute.date.todayInJapan().year;
      var result = engine.calculateNumerology(input.value, { targetYear: targetYear });
      render(output, content.buildPersonal(result));
      resultWrap.hidden = false;
      Karute.dom.scrollTo(resultWrap);
      var heading = document.getElementById("num-result-heading");
      if (heading) heading.focus({ preventScroll: true });
    });
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})(typeof self !== "undefined" ? self : this);
