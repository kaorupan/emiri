/*
 * /seimei/aisho/ 姓名判断の相性ページ
 * 表示順：1.あなた → 2.お相手 → 3.ふたりの相性
 * 名前は保存しない・送信しない。
 */
(function (root) {
  "use strict";
  var Karute = root.Karute, h = Karute.dom.h, R = root.KaruteKyuseiRender, C = root.KaruteCompatPage, S = root.KaruteSeimeiRender;
  var engine = root.KaruteEngines.seimei, content = root.KaruteContent.seimei;

  function pad(n) { return n < 10 ? "0" + n : String(n); }

  function person(id, n, title, p, r) {
    return C.step(id, n, n === 1 ? "PERSON 01" : "PERSON 02", title, [
      S.nameStrokes(r.sei, r.mei),
      R.traits([
        ["人格 " + p.jin.value + "画（" + p.jin.element + "）", [S.luckBadge(p.jin.luck), " ", h("a", { href: "../kakusu/" + pad(p.jin.n) + "/" }, p.jin.keyword)]],
        ["総格 " + p.sou.value + "画（" + p.sou.element + "）", [S.luckBadge(p.sou.luck), " ", h("a", { href: "../kakusu/" + pad(p.sou.n) + "/" }, p.sou.keyword)]]
      ]),
      h("p", null, p.love)
    ]);
  }

  function render(output, a, b) {
    var v = content.buildSeimeiCompatibilityView(engine.calculateSeimeiCompatibility(a, b));
    [
      person("seimei-aisho-you", 1, v.you.fullName + " さん（あなた）", v.you, a),
      person("seimei-aisho-partner", 2, v.partner.fullName + " さん（お相手）", v.partner, b),
      C.step("seimei-aisho-total", 3, "TOTAL", "ふたりの相性", [
        h("div", { class: "seimei-score" },
          h("p", { class: "seimei-score-num" }, String(v.score), h("small", null, "点")),
          h("p", { class: "seimei-score-label" }, "名前の相性")),
        C.tradition("姓名判断での位置づけ", v.tradition),
        h("p", { class: "kyusei-source" }, "えみりの読み解き"),
        h("p", null, v.lead),
        R.traits([
          ["性格の相性（人格どうし・" + v.jin.type + "）", v.jin.text],
          ["人生の方向性（総格どうし・" + v.sou.type + "）", v.sou.text]
        ]),
        v.sameJin ? h("p", null, v.sameJin) : null,
        h("p", { class: "kyusei-meta" }, "点数は、五行の関係と吉凶から出した、えみり独自の目安です。")
      ])
    ].forEach(function (node) { output.appendChild(node); });
  }

  function init() {
    var form = document.getElementById("seimei-aisho-form");
    var output = document.getElementById("seimei-aisho-result-body");
    var wrap = document.getElementById("seimei-aisho-result");
    if (!form || !output || !wrap) return;
    var you = S.nameField(form.querySelector("[data-name='self']"), { idPrefix: "self", legend: "あなたの名前" });
    var partner = S.nameField(form.querySelector("[data-name='partner']"), { idPrefix: "partner", legend: "お相手の名前" });
    form.addEventListener("submit", function (event) {
      event.preventDefault();
      var b = partner.read();
      var a = you.read();
      if (!a.ok || !b.ok) return;
      Karute.dom.clear(output);
      output.appendChild(h("h2", { class: "visually-hidden", tabindex: "-1", id: "seimei-aisho-heading" }, "姓名判断の相性の鑑定結果"));
      render(output, a.result, b.result);
      wrap.hidden = false;
      Karute.dom.scrollTo(wrap);
      var heading = document.getElementById("seimei-aisho-heading");
      if (heading) heading.focus({ preventScroll: true });
    });
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})(typeof self !== "undefined" ? self : this);
