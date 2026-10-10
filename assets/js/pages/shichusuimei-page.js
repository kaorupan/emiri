/*
 * /shichusuimei/ 四柱推命 個人鑑定ページ
 * 計算：KaruteEngines.shichusuimei / 文章：KaruteContent.shichusuimei / 描画：このファイル
 * 共通部品（時刻の入力欄・カード・境界のお知らせ）は kyusei-render.js を使う。
 * 表示順：命式表 → 日干 → 中心星 → ほかの通変星 → 十二運 → 五行 → 天中殺 → 年運 → 仕事と恋愛 →（HTML側）次にできること
 */
(function (root) {
  "use strict";
  var Karute = root.Karute;
  var engine = root.KaruteEngines.shichusuimei;
  var content = root.KaruteContent.shichusuimei;
  var R = root.KaruteKyuseiRender;
  var h = Karute.dom.h;

  function tradition(text) {
    return h("div", { class: "kyusei-tradition" }, h("p", { class: "kyusei-source" }, "四柱推命での位置づけ"), h("p", null, text));
  }

  function meishikiTable(rows) {
    var head = h("tr", null, h("th", { scope: "col" }, h("span", { class: "visually-hidden" }, "項目")),
      rows.map(function (r) { return h("th", { scope: "col" }, r.label); }));
    function line(label, fn) {
      return h("tr", null, h("th", { scope: "row" }, label), rows.map(function (r) {
        if (r.empty) return h("td", { class: "ssm-empty" }, label === "天干" ? "時刻なし" : "—");
        return fn(r);
      }));
    }
    return h("div", { class: "ssm-table-wrap" },
      h("table", { class: "ssm-table" },
        h("caption", { class: "visually-hidden" }, "命式表（年柱・月柱・日柱・時柱）"),
        h("thead", null, head),
        h("tbody", null,
          line("天干", function (r) { return h("td", { class: "ssm-char", "data-element": r.stemElement }, h("span", { class: "ssm-kanji" }, r.stem), h("span", { class: "ssm-reading" }, r.stemReading)); }),
          line("地支", function (r) { return h("td", { class: "ssm-char", "data-element": r.branchElement }, h("span", { class: "ssm-kanji" }, r.branch), h("span", { class: "ssm-reading" }, r.branchReading)); }),
          line("蔵干", function (r) { return h("td", null, r.hidden); }),
          line("通変星（天干）", function (r) { return h("td", { class: r.key === "day" ? "ssm-self" : null }, r.stemTsuhen); }),
          line("通変星（蔵干）", function (r) { return h("td", { class: r.key === "month" ? "ssm-center" : null }, r.branchTsuhen); }),
          line("十二運", function (r) { return h("td", null, r.juniun); }))));
  }

  function elementBars(e) {
    return h("ul", { class: "ssm-bars", "aria-label": "五行の数（" + e.total + "文字中）" }, e.list.map(function (x) {
      return h("li", { class: "ssm-bar", "data-element": x.element },
        h("span", { class: "ssm-bar-label" }, x.element),
        h("span", { class: "ssm-bar-track", "aria-hidden": "true" }, h("span", { class: "ssm-bar-fill", style: "width:" + Math.round(x.ratio * 100) + "%" })),
        h("span", { class: "ssm-bar-count" }, x.count + "つ"),
        h("span", { class: "ssm-bar-image" }, x.image));
    }));
  }

  function render(container, v, onUseTime) {
    Karute.dom.clear(container);
    container.appendChild(h("h2", { class: "visually-hidden", tabindex: "-1", id: "ssm-result-heading" }, "四柱推命の鑑定結果"));

    // 1. 命式
    container.appendChild(R.section("ssm-meishiki", "FOUR PILLARS", "あなたの命式", [
      h("p", { class: "kyusei-meta" }, v.birthLabel + "生まれ",
        v.precision === "estimated" ? h("span", null, " ", h("span", { class: "kyusei-badge-estimated" }, "推定")) : null),
      meishikiTable(v.table),
      h("p", { class: "ssm-catch" }, "日干 ", h("b", null, v.dayMaster.name + "（" + v.dayMaster.reading + "）"), "・中心星 ", h("b", null, v.chushin.name)),
      R.boundaryNotice(v.boundary, onUseTime),
      v.hasTime ? null : h("p", { class: "kyusei-note" }, "生まれた時刻が分からないため、時柱を除いた6文字で読んでいます。時刻が分かる場合は入力すると、時柱も加わります。"),
      h("p", { class: "kyusei-meta" }, v.termLine),
      v.precisionNote ? h("p", { class: "kyusei-note" }, v.precisionNote) : null
    ], "kyusei-summary"));

    // 2. 日干
    var d = v.dayMaster;
    container.appendChild(R.section("ssm-daymaster", "DAY MASTER", "日干：" + d.name + "（" + d.nature + "）", [
      tradition(d.tradition),
      h("p", { class: "ssm-lead", "data-element": d.element }, d.catchphrase),
      h("p", null, d.body),
      R.traits(d.facts.concat([["気をつけたいこと", d.caution]]))
    ]));

    // 3. 中心星
    container.appendChild(R.section("ssm-chushin", "CENTRAL STAR", "中心星：" + v.chushin.name + "（" + v.chushin.keyword + "）", [
      tradition(v.chushin.tradition),
      h("p", null, v.chushin.body)
    ]));

    // 4. ほかの通変星
    if (v.others.length) {
      container.appendChild(R.section("ssm-others", "", "命式にあるほかの星", [
        h("p", { class: "kyusei-meta" }, "年柱・月柱・日柱・時柱に表れている通変星です。中心星を支える、あなたのもうひとつの顔です。"),
        h("dl", { class: "kyusei-traits" }, v.others.map(function (o) {
          return h("div", { class: "kyusei-trait" }, h("dt", null, o.name + "（" + o.keyword + "）"), h("dd", null, o.body));
        }))
      ]));
    }

    // 5. 十二運
    container.appendChild(R.section("ssm-juniun", "", "日柱の十二運：" + v.juniun.name, [
      tradition(v.juniun.tradition),
      h("p", null, v.juniun.body)
    ]));

    // 6. 五行
    container.appendChild(R.section("ssm-elements", "FIVE ELEMENTS", "五行のバランス", [
      tradition(v.elements.tradition),
      elementBars(v.elements),
      h("p", null, v.elements.summary),
      v.elements.texts.length ? R.traits(v.elements.texts) : null
    ]));

    // 7. 天中殺
    container.appendChild(R.section("ssm-kuubou", "", "天中殺：" + v.kuubou.name, [
      tradition(v.kuubou.tradition),
      h("p", null, v.kuubou.body),
      h("p", { class: "kyusei-meta" }, v.kuubou.note)
    ]));

    // 8. 年運
    container.appendChild(R.section("ssm-years", "YEARLY FLOW", "これから3年の流れ", [
      tradition(v.yearsTradition),
      h("ol", { class: "ssm-years" }, v.years.map(function (y) {
        return h("li", { class: "ssm-year" },
          h("p", { class: "ssm-year-head" }, h("b", null, y.year + "年（" + y.name + "）"), "　", y.tsuhen, "・", y.juniun,
            y.kuubou ? h("span", { class: "ssm-tag" }, "天中殺の年") : null),
          h("p", null, y.text));
      }))
    ]));

    // 9. 仕事と恋愛
    container.appendChild(R.section("ssm-work", "", "仕事と恋愛のヒント", [
      R.traits([["仕事", d.work], ["恋愛", d.love]])
    ]));
  }

  function init() {
    var form = document.getElementById("ssm-form");
    var output = document.getElementById("ssm-result-body");
    var wrap = document.getElementById("ssm-result");
    if (!form || !output || !wrap) return;

    var field = Karute.BirthDateField.mount(form.querySelector("[data-birthdate='self']"), {
      idPrefix: "self", legend: "あなたの生年月日", useProfile: true
    });
    var time = R.timeField(form.querySelector("[data-birthtime='self']"), {
      idPrefix: "self",
      legend: "生まれた時刻（任意）",
      collapsible: false,
      hint: "分かる場合は日本時間で入力してください。時柱（生まれた時刻の柱）が加わり、節入りの当日に生まれた方は年柱・月柱も正確に判定できます。分からなくても鑑定できます。時刻は保存しません。"
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
      field.commit(input.value);
      var birth = { year: input.value.year, month: input.value.month, day: input.value.day, time: t.value };
      var r = engine.calculateShichusuimei(birth);
      render(output, content.buildShichusuimeiView(r, Karute.date.todayInJapan(), engine), useTime);
      wrap.hidden = false;
      Karute.dom.scrollTo(wrap);
      var heading = document.getElementById("ssm-result-heading");
      if (heading) heading.focus({ preventScroll: true });
    });
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})(typeof self !== "undefined" ? self : this);
