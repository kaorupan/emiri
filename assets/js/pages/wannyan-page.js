/*
 * 星のわんにゃん占い：診断ページ（/wannyan/）
 *   生年月日 → engines/wannyan.js でタイプを判定 → 結果を描く。生年月日はサーバーに送らない。
 */
(function (root) {
  "use strict";
  var Karute = root.Karute;
  var h = Karute.dom.h;
  var NAME = "星のわんにゃん占い";
  var EL = { "木": "伸びる力", "火": "照らす力", "土": "育む力", "金": "磨く力", "水": "めぐる力" };

  function picture(t, images) {
    if (images.indexOf(t.slug) >= 0) return h("img", { class: "wn-photo wn-lg", src: "../assets/img/wannyan/" + t.slug + ".webp", width: "480", height: "480", alt: t.name + "のイメージ" });
    return h("span", { class: "wn-photo wn-lg wn-ph wn-ph-" + t.kind, role: "img", "aria-label": t.name },
      h("span", { class: "wn-ph-emoji", "aria-hidden": "true" }, t.kind === "dog" ? "🐶" : "🐱"),
      h("span", { class: "wn-ph-name" }, t.breed));
  }

  function render(box, r, images) {
    var t = r.type, types = root.KaruteContent.seijuTypes;
    var el = types.ELEMENTS[r.element.name];
    var mates = root.KaruteEngines.wannyan.TYPES.filter(function (x) { return x.beastId === t.beastId && x !== t; });
    var share = "わたしは「" + t.name + "」タイプでした！ #" + NAME + " https://emiri-uranai.com/wannyan/";
    Karute.dom.clear(box);
    box.appendChild(h("section", { class: "card wn-card", "aria-labelledby": "wn-result-title" },
      h("div", { class: "wn-hero" },
        picture(t, images),
        h("div", null,
          h("p", { class: "eyebrow" }, (t.kind === "dog" ? "DOG" : "CAT") + " · No." + String(t.index + 1).padStart(2, "0")),
          h("h2", { id: "wn-result-title", class: "wn-name" }, "あなたは「" + t.name + "」タイプ"),
          h("p", { class: "wn-motto" }, "「" + t.motto + "」"),
          h("p", { class: "wn-team" }, t.group.name + "（" + t.beastName + "のなかま）"))),
      h("div", { class: "prose" },
        h("h3", null, "性格"), h("p", null, t.persona),
        h("h3", null, "強み"), h("p", null, t.strength),
        h("h3", null, "弱点"), h("p", null, t.weakness),
        h("h3", null, "恋愛"), h("p", null, t.love + " " + t.period.love + " " + t.moon.love),
        h("h3", null, "仕事"), h("p", null, t.work + " " + t.period.work + " " + t.moon.work),
        h("h3", null, "あなたに宿る元素：" + el.name + "（" + EL[el.name] + "）"), h("p", null, el.text),
        h("h3", null, "生まれた日の空"),
        h("p", null, r.input.year + "年" + r.input.month + "月" + r.input.day + "日は、" + t.period.name + "（" + t.period.range + "）で、月は" + t.moon.name + "（月齢 約" + r.moonAge + "）。" + t.period.trait + " " + t.moon.trait),
        r.nearBoundary ? h("p", { class: "notice" }, "生まれた日が、時期や月の形の変わり目に近い日です。生まれた時刻によっては「" + r.neighbors.map(function (x) { return x.name; }).join("」「") + "」タイプの性質もあわせ持つかもしれません。") : null,
        r.precision === "estimated" ? h("p", { class: "kyusei-meta" }, "1800〜2100年以外の生まれは、天体の位置を推定で計算しています。") : null),
      h("div", { class: "wn-actions" },
        h("a", { class: "btn", href: "https://line.me/R/share?text=" + encodeURIComponent(share), target: "_blank", rel: "noopener" }, "LINEで結果を送る"),
        h("a", { class: "btn btn-ghost", href: "https://x.com/intent/post?text=" + encodeURIComponent(share), target: "_blank", rel: "noopener" }, "Xでシェア"),
        h("a", { class: "btn btn-ghost", href: t.slug + "/" }, "このタイプをくわしく見る")),
      h("h3", { class: "wn-subhead" }, t.group.name + "のなかま"),
      h("ul", { class: "wn-grid" }, mates.map(function (x) {
        return h("li", null, h("a", { href: x.slug + "/" },
          images.indexOf(x.slug) >= 0 ? h("img", { class: "wn-photo wn-sm", src: "../assets/img/wannyan/" + x.slug + ".webp", width: "160", height: "160", alt: "", loading: "lazy" })
            : h("span", { class: "wn-photo wn-sm wn-ph wn-ph-" + x.kind, "aria-hidden": "true" }, h("span", { class: "wn-ph-emoji" }, x.kind === "dog" ? "🐶" : "🐱")),
          h("span", null, x.name)));
      }))
    ));
    box.hidden = false;
    Karute.dom.scrollTo ? Karute.dom.scrollTo(box) : box.scrollIntoView();
  }

  function init() {
    var form = document.getElementById("wannyan-form");
    var box = document.getElementById("wannyan-result");
    if (!form || !box) return;
    var images = (box.getAttribute("data-images") || "").split(",").filter(Boolean);
    var field = Karute.BirthDateField.mount(form.querySelector("[data-birthdate='wannyan']"), { idPrefix: "wannyan", legend: "あなたの生年月日", useProfile: true });
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var res = field.read();
      if (!res.ok) return;
      field.commit(res.value);
      render(box, root.KaruteEngines.wannyan.calculateWannyan(res.value), images);
    });
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})(typeof self !== "undefined" ? self : this);
