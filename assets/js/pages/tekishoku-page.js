/*
 * /tekishoku/ 適職占い
 *   生年月日 → content/tekishoku.js（数秘術・九星気学・四柱推命の組み合わせ）→ 向いている仕事と、転職に動きやすい時期
 *   入力はサーバーに送らない。
 */
(function (root) {
  "use strict";
  var Karute = root.Karute, h = Karute.dom.h;
  var E = {
    numerology: root.KaruteEngines.numerology, numText: root.KaruteContent.numerology,
    kyusei: root.KaruteEngines.kyusei, kyText: root.KaruteContent.kyusei,
    shichu: root.KaruteEngines.shichusuimei, shText: root.KaruteContent.shichusuimei
  };

  function card(id, eyebrow, title, children, cls) {
    return h("section", { class: "card tk-block" + (cls ? " " + cls : ""), id: id, "aria-labelledby": id + "-title" },
      h("p", { class: "eyebrow" }, eyebrow), h("h2", { id: id + "-title" }, title), children);
  }

  function render(box, v) {
    var s = v.summary, best = s.bestYear;
    Karute.dom.clear(box);
    box.appendChild(h("section", { class: "card result-overview", "aria-labelledby": "tk-result-heading" },
      h("p", { class: "eyebrow" }, "SUMMARY"),
      h("h2", { id: "tk-result-heading", tabindex: "-1" }, "あなたの適職と転職の時期"),
      h("dl", { class: "result-points" },
        h("div", null, h("dt", null, "強み"), h("dd", null, s.strength)),
        h("div", null, h("dt", null, "力が出る働き方"), h("dd", null, s.workStyle)),
        h("div", null, h("dt", null, "避けたい状態"), h("dd", null, s.avoid)),
        h("div", null, h("dt", null, "転職の時期"), h("dd", null, best.year + "年が「" + best.level.label + "」（これから3年の中で）")),
        s.goodMonths.length ? h("div", null, h("dt", null, "動き出しやすい月"), h("dd", null, s.goodMonths.map(function (m) { return m.year + "年" + m.month + "月"; }).join("・"))) : null),
      h("nav", { class: "result-toc", "aria-label": "鑑定結果の目次" }, h("ul", null,
        h("li", null, h("a", { href: "#tk-views" }, "3つの占術で見る適職")),
        h("li", null, h("a", { href: "#tk-years" }, "これからの3年")),
        h("li", null, h("a", { href: "#tk-months" }, "これからの12か月"))))));

    box.appendChild(card("tk-views", "APTITUDE", "3つの占術で見る、向いている仕事", v.views.map(function (x) {
      return h("div", { class: "tk-view" },
        h("h3", null, x.method, h("span", { class: "tk-tag" }, x.label)),
        h("p", null, x.text),
        x.strengths ? h("p", { class: "tk-strengths" }, "強み：" + x.strengths.join("、")) : null,
        h("p", { class: "tk-more" }, h("a", { href: x.link, "data-track": "related_click", "data-target": x.link.replace(/\W/g, ""), "data-position": "result" }, x.method + "でくわしく見る →")));
    })));

    box.appendChild(card("tk-years", "TIMING", "これからの3年：転職に動きやすい時期", [
      h("p", { class: "tk-note" }, "数秘術のパーソナルイヤー（その年のテーマ）と、四柱推命のその年の星（通変星）を合わせた目安です。"),
      h("ol", { class: "tk-years" }, v.years.map(function (y) {
        return h("li", { class: "tk-year tk-" + y.level.key },
          h("p", { class: "tk-year-head" }, h("b", null, y.year + "年"), h("span", { class: "tk-badge" }, y.level.label)),
          h("p", null, "数秘術：パーソナルイヤー" + y.personalYear + "。" + y.pyText),
          h("p", null, "四柱推命：" + y.tsuhen + "の年。" + y.tsuhenText),
          y.kuubou ? h("p", { class: "tk-kuubou" }, "この年は「" + v.kuubouName + "」にあたります。四柱推命では、新しいことを大きく始めるより、準備や見直しに向く年とされます。") : null,
          h("p", { class: "tk-tip" }, y.level.tip));
      }))
    ]));

    box.appendChild(card("tk-months", "MONTHS", "これからの12か月", [
      h("p", { class: "tk-note" }, "数秘術のパーソナルマンス（月ごとのテーマ）から見た目安です。★は動き出しやすい月です。"),
      h("ol", { class: "tk-months" }, v.months.map(function (m) {
        return h("li", { class: "tk-month" + (m.good ? " is-good" : "") },
          h("b", null, (m.month === 1 || m === v.months[0] ? m.year + "年" : "") + m.month + "月", m.good ? h("span", { "aria-label": "動き出しやすい月" }, " ★") : null),
          h("span", null, m.label));
      }))
    ]));

    box.appendChild(h("p", { class: "notice" }, "占いの結果は、自分を見つめ直すための目安です。転職するかどうかは、仕事の条件や暮らし、家族のことなども含めて、あなた自身で判断してください。"));
    box.hidden = false;
    Karute.dom.scrollTo(box);
    var hd = document.getElementById("tk-result-heading");
    if (hd) hd.focus({ preventScroll: true });
  }

  function init() {
    var form = document.getElementById("tekishoku-form");
    var box = document.getElementById("tekishoku-result");
    if (!form || !box) return;
    var field = Karute.BirthDateField.mount(form.querySelector("[data-birthdate='self']"), { idPrefix: "self", legend: "あなたの生年月日", useProfile: true });
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var input = field.read();
      if (!input.ok) return;
      field.commit(input.value);
      render(box, root.KaruteContent.tekishoku.build(input.value, Karute.date.todayInJapan(), E));
    });
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})(typeof self !== "undefined" ? self : this);
