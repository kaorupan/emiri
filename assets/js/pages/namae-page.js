/*
 * /suhijutsu/namae/ 名前の数秘術と相性
 *   名前（ひらがな・カタカナ・ローマ字）→ content/namae-suhi.js → 3つの数字と、ふたりの相性。入力はどこにも送らない。
 */
(function (root) {
  "use strict";
  var Karute = root.Karute, h = Karute.dom.h;
  var N = root.KaruteContent.namaeSuhi, T = root.KaruteContent.numerology.TRAITS;
  function core(n) { return n === 11 ? 2 : n === 22 ? 4 : n === 33 ? 6 : n; }
  function trait(n) { return T[core(n)] || null; }

  function person(label, r) {
    var s = trait(r.soul), d = trait(r.destiny), p = trait(r.personality);
    return h("section", { class: "card sg-block", "aria-label": label + "の名前の数字" },
      h("h2", null, label + "の名前の数字"),
      h("p", { class: "sg-note" }, "ローマ字：" + r.romaji.toUpperCase()),
      h("ul", { class: "sg-items" },
        h("li", null, h("p", { class: "sg-item-head" }, h("b", null, "ソウルナンバー（心）"), h("span", null, String(r.soul || "－"))), s ? h("p", { class: "sg-reason" }, "「" + s.key + "」の心。" + s.need + "を大切にしたい人。") : h("p", { class: "sg-reason" }, "母音がないため出せません。")),
        h("li", null, h("p", { class: "sg-item-head" }, h("b", null, "パーソナリティナンバー（見せる顔）"), h("span", null, String(r.personality || "－"))), p ? h("p", { class: "sg-reason" }, "まわりからは" + p.gift + "のある人に見えやすい。") : null),
        h("li", null, h("p", { class: "sg-item-head" }, h("b", null, "ディスティニーナンバー（役割）"), h("span", null, String(r.destiny))), d ? h("p", { class: "sg-reason" }, "「" + d.key + "」の役割。" + d.gift + "を生かすと、名前の力が発揮されます。") : null)));
  }

  function render(box, a, b) {
    Karute.dom.clear(box);
    var first;
    if (b) {
      var c = N.compat(a, b, T);
      first = h("section", { class: "card sg-total", "aria-labelledby": "nm-result-heading" },
        h("p", { class: "sg-rel" }, "名前の相性"),
        h("h2", { id: "nm-result-heading", tabindex: "-1" }, c.level),
        h("p", { class: "sg-score" }, h("b", null, String(c.score)), h("span", null, "点")),
        h("span", { class: "sg-bar", "aria-hidden": "true" }, h("span", { style: "width:" + c.score + "%" })),
        h("dl", { class: "result-points" },
          h("div", null, h("dt", null, "心の相性（ソウルナンバー " + (c.a.soul || "－") + "と" + (c.b.soul || "－") + "）"), h("dd", null, c.soul.text)),
          h("div", null, h("dt", null, "役割の相性（ディスティニーナンバー " + c.a.destiny + "と" + c.b.destiny + "）"), h("dd", null, c.destiny.text))));
      box.appendChild(first);
      box.appendChild(person("あなた", c.a));
      box.appendChild(person("お相手", c.b));
    } else {
      var r = N.numbers(a);
      first = person("あなた", r);
      first.querySelector("h2").id = "nm-result-heading";
      first.querySelector("h2").setAttribute("tabindex", "-1");
      box.appendChild(first);
    }
    box.appendChild(h("p", { class: "notice" }, "名前の数字は、ふたりの関係を考えるためのヒントです。生年月日がわかるときは、総合相性もあわせて見てみてください。"));
    box.hidden = false;
    Karute.dom.scrollTo(box);
    var hd = document.getElementById("nm-result-heading");
    if (hd) hd.focus({ preventScroll: true });
  }

  function init() {
    var form = document.getElementById("namae-form");
    var box = document.getElementById("namae-result");
    var err = document.getElementById("nm-error");
    if (!form || !box) return;
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var a = form.a.value.trim(), b = form.b.value.trim();
      var msg = "";
      var ra = N.romanize(a), rb = b ? N.romanize(b) : { ok: true };
      if (!a) msg = "あなたの名前を入れてください。";
      else if (!ra.ok) msg = "あなたの名前は、ひらがな・カタカナ・ローマ字で入れてください（使えない文字：" + (ra.chars || []).join("") + "）。";
      else if (!rb.ok) msg = "お相手の名前は、ひらがな・カタカナ・ローマ字で入れてください（使えない文字：" + (rb.chars || []).join("") + "）。";
      if (msg) { err.textContent = msg; err.hidden = false; (ra.ok && a ? form.b : form.a).focus(); return; }
      err.hidden = true;
      render(box, a, b || null);
    });
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})(typeof self !== "undefined" ? self : this);
