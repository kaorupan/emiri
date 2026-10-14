/*
 * 星のわんにゃん占い：相性ページ（/wannyan/aisho/）
 *   ふたりの生年月日 → それぞれのタイプ → content/wannyan-aisho.js と星獣カルテの相性で読み解く。
 *   生年月日はサーバーに送らない。
 */
(function (root) {
  "use strict";
  var Karute = root.Karute;
  var h = Karute.dom.h;
  var NAME = "星のわんにゃん占い";
  var PICK = ["恋愛", "会話・コミュニケーション", "仕事・一緒に何かをする", "すれ違いやすいポイント", "長続きのコツ"];

  function pic(t, images, cls) {
    if (images.indexOf(t.slug) >= 0) return h("img", { class: "wn-photo " + cls, src: "../../assets/img/wannyan/" + t.slug + ".webp", width: "240", height: "240", alt: t.name + "のイメージ" });
    return h("span", { class: "wn-photo " + cls + " wn-ph wn-ph-" + t.kind, role: "img", "aria-label": t.name }, h("span", { class: "wn-ph-emoji", "aria-hidden": "true" }, t.kind === "dog" ? "🐶" : "🐱"));
  }

  function personCard(label, t, images) {
    return h("div", { class: "wn-pair-card" },
      h("p", { class: "eyebrow" }, label),
      pic(t, images, "wn-md"),
      h("p", { class: "wn-pair-name" }, h("a", { href: "../" + t.slug + "/" }, t.name)),
      h("p", { class: "wn-team" }, t.group.name));
  }

  function section(title, label, text, extra) {
    return h("div", { class: "wn-reading" },
      h("h3", null, title, label ? h("span", { class: "wn-pill" }, label) : null),
      h("p", null, text),
      extra || null);
  }

  function render(box, r1, r2, images) {
    var A = root.KaruteContent.wannyanAisho.build(r1, r2, root.KaruteContent.seijuTypes.PERIODS);
    var sv = root.KaruteContent.seiju && root.KaruteContent.seiju.buildSeijuCompatibilityView
      ? root.KaruteContent.seiju.buildSeijuCompatibilityView(root.KaruteEngines.seiju.calculateSeijuCompatibility(r1.input, r2.input)) : null;
    var share = "わたし「" + r1.type.name + "」×あの人「" + r2.type.name + "」の相性は…「" + A.kind.title + "」でした！ #" + NAME + " https://emiri-uranai.com/wannyan/aisho/";
    Karute.dom.clear(box);
    box.appendChild(h("section", { class: "card wn-card", "aria-labelledby": "wn-aisho-title" },
      h("div", { class: "wn-pair" }, personCard("あなた", r1.type, images), h("span", { class: "wn-pair-x", "aria-hidden": "true" }, "×"), personCard("お相手", r2.type, images)),
      h("p", { class: "eyebrow" }, A.kind.label),
      h("h2", { id: "wn-aisho-title", class: "wn-name" }, A.kind.title),
      sv ? h("p", { class: "wn-team" }, "チームどうしの相性：", h("b", null, sv.total.label)) : null,
      A.notes.map(function (n) { return h("p", { class: "notice" }, n); }),
      h("div", { class: "prose" },
        section("わんことにゃんこの組み合わせ", A.kind.label, A.kind.text, h("p", { class: "wn-tip" }, "💡 " + A.kind.tip)),
        section("月の形の相性", A.moon.label, A.moon.title + "。" + A.moon.text),
        section("生まれた時期の相性", A.period.label, A.period.text),
        section("元素の相性", A.element.label, A.element.text),
        sv ? section("チームどうしの相性", sv.total.label, sv.total.lead) : null,
        sv ? sv.details.filter(function (d) { return PICK.indexOf(d.title) >= 0; }).map(function (d) {
          return section(d.title, null, d.text || (d.list || []).join(" "));
        }) : null),
      h("div", { class: "wn-actions" },
        h("a", { class: "btn", href: "https://line.me/R/share?text=" + encodeURIComponent(share), target: "_blank", rel: "noopener" }, "LINEで結果を送る"),
        h("a", { class: "btn btn-ghost", href: "https://x.com/intent/post?text=" + encodeURIComponent(share), target: "_blank", rel: "noopener" }, "Xでシェア")),
      h("p", { class: "kyusei-meta" }, NAME + "の相性は、月の形・生まれた時期・元素、そして星獣カルテのチームどうしの相性から読む、えみり独自のエンターテインメント占いです。点数ではなく、関係の傾向を言葉で表しています。")
    ));
    box.hidden = false;
    Karute.dom.scrollTo ? Karute.dom.scrollTo(box) : box.scrollIntoView();
  }

  function init() {
    var form = document.getElementById("wannyan-aisho-form");
    var box = document.getElementById("wannyan-aisho-result");
    if (!form || !box) return;
    var images = (box.getAttribute("data-images") || "").split(",").filter(Boolean);
    var me = Karute.BirthDateField.mount(form.querySelector("[data-birthdate='wn-self']"), { idPrefix: "wn-self", legend: "あなたの生年月日", useProfile: true });
    var you = Karute.BirthDateField.mount(form.querySelector("[data-birthdate='wn-partner']"), { idPrefix: "wn-partner", legend: "お相手の生年月日" });
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var a = me.read();
      var b = you.read();
      if (!a.ok || !b.ok) return;
      me.commit(a.value);
      var W = root.KaruteEngines.wannyan;
      render(box, W.calculateWannyan(a.value), W.calculateWannyan(b.value), images);
    });
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})(typeof self !== "undefined" ? self : this);
