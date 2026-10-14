/*
 * サイト共通の小さな仕組み（全ページで読み込む）
 *
 * 1. 計測（Karute.track）
 *    - アクセス解析（GA4）が設定されていれば gtag へ、なければ window.dataLayer に積むだけ（どこにも送らない）。
 *    - 送るのは「占術・ページの場所・位置・行き先・サービス名」だけ。
 *      生年月日・名前・相手の情報・相談内容・URLのクエリ（?d= など）は絶対に送らない。
 *    - イベント
 *        fortune_start   占いのフォームを送信した   { fortune, page_path }
 *        fortune_result  結果が表示された           { fortune, page_path }
 *        start_click     TOPなどの「占う」ボタン      { target, position }
 *        related_click   関連する占い・記事へのリンク  { target, position }
 *        line_click      LINEへのリンク              { position }
 *        aff_click       広告（相談サービス）のリンク  { service, position, theme }
 *      リンクには data-track="イベント名" と data-target / data-position / data-service などを付ける。
 *
 * 2. 結果の表示：id が "-result" で終わる要素が表示されたら、結果の最初の見出しへフォーカスを移す
 *    （ページ側ですでにフォーカスを移していれば何もしない）。キーボード・読み上げで結果に気づけるように。
 */
(function (root) {
  "use strict";
  if (!root.document) return;
  var Karute = root.Karute = root.Karute || {};
  var doc = root.document;

  var ALLOWED = ["fortune", "page_path", "target", "position", "service", "theme"];
  function pagePath() { return root.location.pathname; }
  function fortuneOf() {
    var parts = pagePath().replace(/^\/+|\/+$/g, "").split("/");
    return parts[0] || "top";
  }
  function clean(params) {
    var out = {};
    ALLOWED.forEach(function (k) {
      if (params && params[k] != null) out[k] = String(params[k]).replace(/[?#].*$/, "").slice(0, 80);
    });
    return out;
  }
  function track(name, params) {
    if (!/^[a-z_]{3,30}$/.test(name)) return;
    var p = clean(params);
    if (!p.page_path) p.page_path = pagePath();
    if (!p.fortune) p.fortune = fortuneOf();
    try {
      if (typeof root.gtag === "function") root.gtag("event", name, p);
      else (root.dataLayer = root.dataLayer || []).push({ event: name, params: p });
    } catch (e) { /* 計測の失敗で画面を止めない */ }
  }
  Karute.track = track;

  // リンクのクリック（data-track）
  doc.addEventListener("click", function (e) {
    var a = e.target && e.target.closest ? e.target.closest("[data-track]") : null;
    if (!a) return;
    track(a.getAttribute("data-track"), {
      target: a.getAttribute("data-target"), position: a.getAttribute("data-position"),
      service: a.getAttribute("data-service"), theme: a.getAttribute("data-theme")
    });
  }, true);

  // 占いの開始（フォームの送信）
  doc.addEventListener("submit", function (e) {
    var f = e.target;
    if (f && f.id && /-form$/.test(f.id)) track("fortune_start", {});
  }, true);

  // 結果の表示：hidden が外れたら計測と、フォーカスの移動
  function watch(el) {
    var timer = null;
    new MutationObserver(function () {
      if (el.hidden) return;
      // 描画と表示の切り替えをまとめて「1回の結果表示」として数える
      root.clearTimeout(timer);
      timer = root.setTimeout(function () {
        if (el.hidden || !el.firstElementChild) return;
        track("fortune_result", {});
        if (el.contains(doc.activeElement)) return;
        var h = el.querySelector("h2, h3");
        if (!h) return;
        if (!h.hasAttribute("tabindex")) h.setAttribute("tabindex", "-1");
        try { h.focus({ preventScroll: true }); } catch (err) { h.focus(); }
      }, 120);
    }).observe(el, { attributes: true, attributeFilter: ["hidden"], childList: true });
  }
  function init() {
    doc.querySelectorAll("[id$='-result']").forEach(watch);
  }
  if (doc.readyState === "loading") doc.addEventListener("DOMContentLoaded", init);
  else init();
})(typeof self !== "undefined" ? self : this);
