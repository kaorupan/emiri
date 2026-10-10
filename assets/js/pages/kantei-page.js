/*
 * 本格占い「総合鑑定書」の表示（/premium/sample/ ほか）
 * 組み立て：KaruteContent.kantei / 描画：このファイル
 *
 * 表示する人の情報は、ページ内の <div id="kantei-root" data-person='{"name":…,"year":…}'> から読む。
 * （購入後のページでは、支払い確認の結果からこの情報を受け取って同じ関数で描画する）
 */
(function (root) {
  "use strict";
  var Karute = root.Karute;
  var kantei = root.KaruteContent.kantei;
  var h = Karute.dom.h;

  function todayJst() {
    var parts = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Tokyo", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date()).split("-");
    return { year: Number(parts[0]), month: Number(parts[1]), day: Number(parts[2]) };
  }

  function block(b) {
    if (b.type === "p") return h("p", null, b.text);
    if (b.type === "h3") return h("h3", null, b.text);
    if (b.type === "ul") return h("ul", null, b.items.map(function (t) { return h("li", null, t); }));
    if (b.type === "facts") return h("dl", { class: "kantei-facts" }, b.rows.map(function (r) { return h("div", null, h("dt", null, r[0]), h("dd", null, r[1])); }));
    if (b.type === "years") {
      return h("div", { class: "kantei-years" }, b.items.map(function (y) {
        return h("section", { class: "kantei-year" },
          h("h3", null, y.year + "年"),
          h("dl", { class: "kantei-facts" }, y.rows.map(function (r) { return h("div", null, h("dt", null, r[0]), h("dd", null, r[1])); })));
      }));
    }
    if (b.type === "months") {
      return h("ol", { class: "kantei-months" }, b.items.map(function (m) {
        return h("li", null, h("b", null, m.month + "月"), h("span", { class: "kantei-month-theme" }, m.number + "「" + m.theme + "」"), h("span", null, m.text));
      }));
    }
    return null;
  }

  function render(container, report, opts) {
    Karute.dom.clear(container);
    container.appendChild(h("section", { class: "kantei-cover" },
      opts && opts.sample ? h("p", { class: "kantei-sample-badge" }, "見本") : null,
      h("p", { class: "eyebrow" }, "EMIRI PREMIUM READING"),
      h("h2", { class: "kantei-title" }, report.title),
      h("p", { class: "kantei-who" }, report.who),
      h("p", { class: "kantei-meta" }, report.birthLabel + "生まれ"),
      h("p", { class: "kantei-meta" }, "作成日：" + report.madeLabel),
      h("p", { class: "kantei-axis" }, "あなたの軸：", h("b", null, report.axis.mainName), "　もうひとつの柱：", h("b", null, report.axis.subName))
    ));
    container.appendChild(h("nav", { class: "kantei-toc", "aria-label": "鑑定書の目次" },
      h("h2", null, "目次"),
      h("ol", null, report.chapters.map(function (c) { return h("li", null, h("a", { href: "#kantei-" + c.id }, c.title)); }))
    ));
    report.chapters.forEach(function (c, i) {
      container.appendChild(h("section", { class: "kantei-chapter", id: "kantei-" + c.id, "aria-labelledby": "kantei-" + c.id + "-title" },
        h("p", { class: "kantei-chapter-no" }, "第" + (i + 1) + "章"),
        h("h2", { id: "kantei-" + c.id + "-title" }, c.title),
        c.blocks.map(block)
      ));
    });
    container.appendChild(h("section", { class: "kantei-method" },
      h("h2", null, "この鑑定書について"),
      h("ul", null, report.method.map(function (t) { return h("li", null, t); }))
    ));
  }

  function init() {
    var container = document.getElementById("kantei-root");
    if (!container) return;
    var person;
    try { person = JSON.parse(container.getAttribute("data-person") || "null"); } catch (e) { person = null; }
    if (!person) return;
    render(container, kantei.buildKantei(person, todayJst()), { sample: container.hasAttribute("data-sample") });
    var printBtn = document.getElementById("kantei-print");
    if (printBtn) printBtn.addEventListener("click", function () { root.print(); });
  }

  root.KaruteKanteiPage = { render: render, todayJst: todayJst };
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})(typeof self !== "undefined" ? self : this);
