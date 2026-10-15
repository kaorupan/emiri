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

  // 詳細鑑定の見出し → ページ内リンク用のID
  var DEEP_IDS = { "あなたの本質": "num-deep-core", "仕事・適職・働き方": "num-deep-work", "恋愛で本当に求めるもの": "num-deep-love", "金運・お金との付き合い方": "num-deep-money" };

  function renderDeep(items) {
    return section("num-deep", "DEEP READING", "詳細鑑定", [
      h("p", { class: "num-note" }, "見出しを押すと開閉できます。"),
      items.map(function (it, i) {
        return h("details", { class: "fold num-reading", id: DEEP_IDS[it.title] || null, open: i === 0 ? "" : null },
          h("summary", null, h("h3", null, it.title)),
          h("div", { class: "fold-body" },
            it.lead ? h("p", { class: "num-lead-strong" }, it.lead) : null,
            h("p", null, it.text),
            it.points ? traitList(it.points) : null));
      })
    ]);
  }

  // 冒頭の要約：計算結果から出した文章だけを使う（新しい鑑定文は足さない）
  //   行動のヒント＝今年（パーソナルイヤー）の文章のうち、テーマの説明のあとの一文
  function yearHint(py) {
    var parts = (String(py.text || "").match(/[^。]+。?/g) || []).map(function (x) { return x.trim(); }).filter(Boolean);
    var rest = parts.filter(function (x) { return !/パーソナルイヤーは|テーマは「/.test(x); });
    return "テーマは「" + py.theme + "」。" + (rest.join("") || "");
  }
  function renderOverview(view, nowMonth) {
    var month = view.months.filter(function (m) { return m.month === nowMonth; })[0];
    var points = [["特徴", view.summary.copy], ["強み", view.summary.strength], ["注意点", view.summary.risk],
      ["行動のヒント（" + view.personalYear.year + "年）", yearHint(view.personalYear)]];
    if (month) points.push(["今月（" + month.month + "月）", month.theme]);
    var toc = [["#num-deep-love", "恋愛"], ["#num-deep-work", "仕事"], ["#num-year", "今年の流れ"]];
    if (month) toc.push(["#num-month-now", "今月"]);
    toc.push(["#num-deep", "詳細鑑定"], ["#num-summary", "数字の一覧"]);
    return h("section", { class: "card num-block result-overview", "aria-labelledby": "num-result-heading" },
      h("p", { class: "eyebrow" }, "SUMMARY"),
      h("h2", { id: "num-result-heading", tabindex: "-1" }, "鑑定結果の要約"),
      h("p", { class: "result-headline" }, view.summary.headline),
      h("dl", { class: "result-points" }, points.map(function (p) {
        return h("div", null, h("dt", null, p[0]), h("dd", null, p[1]));
      })),
      h("nav", { class: "result-toc", "aria-label": "鑑定結果の目次" },
        h("ul", null, toc.map(function (t) { return h("li", null, h("a", { href: t[0] }, t[1])); }))));
  }

  function renderMonths(year, months, nowMonth) {
    return section("num-months", "12 MONTHS", year + "年 12ヶ月の流れ", [
      h("p", { class: "num-note" }, "パーソナルイヤーと月から出す「パーソナルマンス」で、月ごとのテーマを見ます。"),
      h("ol", { class: "num-months" }, months.map(function (m) {
        var now = m.month === nowMonth;
        return h("li", { class: "num-month" + (now ? " is-now" : ""), id: now ? "num-month-now" : null, "aria-current": now ? "date" : null },
          h("p", { class: "num-month-head" }, h("span", null, m.month + "月", now ? h("span", { class: "now-badge" }, "今月") : null), h("span", { class: "num-month-num" }, "PM " + m.number)),
          h("p", { class: "num-month-theme" }, m.theme),
          h("p", { class: "num-month-text" }, m.text));
      }))
    ]);
  }

  function render(container, view, nowMonth) {
    Karute.dom.clear(container);
    [
      renderOverview(view, nowMonth),
      renderSummary(view.summary),
      renderLifePath(view.lifePath),
      renderNumberBlock("num-birthday", "BIRTHDAY NUMBER", "バースデーナンバー", view.birthday),
      renderNumberBlock("num-attitude", "ATTITUDE NUMBER", "アティチュードナンバー", view.attitude),
      renderPersonalYear(view.personalYear),
      renderDeep(view.deep),
      renderMonths(view.personalYear.year, view.months, nowMonth)
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

      var today = Karute.date.todayInJapan();
      var result = engine.calculateNumerology(input.value, { targetYear: today.year });
      render(output, content.buildPersonal(result), today.month);
      resultWrap.hidden = false;
      Karute.dom.scrollTo(resultWrap);
      var heading = document.getElementById("num-result-heading");
      if (heading) heading.focus({ preventScroll: true });
    });
  }

  // 目次から閉じた詳細鑑定へ飛んだときは開く
  document.addEventListener("click", function (e) {
    var a = e.target.closest && e.target.closest(".result-toc a");
    if (!a) return;
    var el = document.getElementById(a.getAttribute("href").slice(1));
    if (el && el.tagName === "DETAILS") el.open = true;
  });

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})(typeof self !== "undefined" ? self : this);
