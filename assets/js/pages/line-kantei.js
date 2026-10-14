/*
 * LINE で受け取る無料の総合鑑定書：表示（/line/kantei/?d=…）
 *   ?d= の値（core/kantei-link.js）から入力内容と作成日を読み、鑑定書を描く。
 */
(function (root) {
  "use strict";
  var Karute = root.Karute;
  var h = Karute.dom.h;

  function init() {
    var container = document.getElementById("kantei-root");
    if (!container || !container.hasAttribute("data-line")) return;
    var m = /[?&]d=([^&#]+)/.exec(root.location.search);
    var data = m ? Karute.kanteiLink.decode(decodeURIComponent(m[1])) : null;
    if (!data) {
      Karute.dom.clear(container);
      container.appendChild(h("section", { class: "card prose" },
        h("h2", null, "鑑定書が見つかりません"),
        h("p", null, "リンクが途中で切れているかもしれません。LINEのトークに届いたリンクを、もう一度開いてください。"),
        h("p", null, h("a", { href: "../" }, "鑑定書を作り直す"))));
      return;
    }
    var report = root.KaruteContent.kantei.buildKantei(data.p, data.made, data.q || undefined);
    report.upsell = null; // 無料版では有料の追加相性の案内は出さない
    root.KaruteKanteiPage.render(container, report, {});
    var btn = document.getElementById("kantei-print");
    if (!btn) return;
    btn.hidden = false;
    if (/ Line\//i.test(root.navigator.userAgent || "")) {
      // LINE の中のブラウザでは印刷（PDF保存）が使えない。いつものブラウザで開き直してもらう
      var href = root.location.href.replace(/[?&]openExternalBrowser=1/, "") + "&openExternalBrowser=1";
      var a = h("a", { class: "btn", id: "kantei-open-browser", href: href }, "ブラウザで開いてPDF保存");
      btn.parentNode.replaceChild(a, btn);
      a.parentNode.parentNode.insertBefore(h("p", { class: "kyusei-meta" }, "LINEの中ではPDF保存ができません。ボタンを押すと、いつものブラウザ（SafariやChromeなど）で開きます。そこで「PDFで保存・印刷」を押してください。"), a.parentNode.nextSibling);
      return;
    }
    btn.addEventListener("click", function () { root.print(); });
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})(typeof self !== "undefined" ? self : this);
