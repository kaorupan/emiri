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
        if (el.querySelector(".share-bar")) return; // シェアの欄を足したときの変化は数えない
        track("fortune_result", {});
        addShare(el);
        if (el.contains(doc.activeElement)) return;
        var h = el.querySelector("h2, h3");
        if (!h) return;
        if (!h.hasAttribute("tabindex")) h.setAttribute("tabindex", "-1");
        try { h.focus({ preventScroll: true }); } catch (err) { h.focus(); }
      }, 120);
    }).observe(el, { attributes: true, attributeFilter: ["hidden"], childList: true });
  }
  // 結果のシェア：LINE で送る／X でポスト／リンクをコピー
  //   文章は data-share（あれば）か、結果の見出し。生年月日・名前は入れない（見出しに年月日があれば使わない）。
  //   すでにシェアの案内があるページ（わんにゃん占い）や LINE・本格占いのページには出さない。
  function addShare(el) {
    if (el.hasAttribute("data-noshare") || el.querySelector("a[href*='line.me/R/share']")) return;
    if (/^\/(line|premium)\//.test(root.location.pathname)) return;
    var hd = el.querySelector("h2");
    var said = el.getAttribute("data-share") || (hd ? hd.textContent.replace(/\s+/g, " ").trim() : "");
    if (/\d{4}年\d{1,2}月\d{1,2}日|\d{4}[\/.-]\d{1,2}[\/.-]\d{1,2}/.test(said)) said = "";
    if (!el.hasAttribute("data-share") && /鑑定結果|要約|結果$/.test(said)) said = "";
    var name = (doc.title.split("｜")[0] || "えみり").replace(/（無料）/, "").trim();
    var url = root.location.origin + root.location.pathname;
    var text = "【えみり】" + name + (said ? "：" + said.slice(0, 60) : "で占ってみました") + " #えみり占い";
    var bar = doc.createElement("div");
    bar.className = "share-bar";
    bar.innerHTML = '<p class="share-title">結果をシェアする</p><div class="share-btns">'
      + '<a class="share-btn share-line" target="_blank" rel="noopener" data-track="share_click" data-target="line" data-position="result">LINEで送る</a>'
      + '<a class="share-btn share-x" target="_blank" rel="noopener" data-track="share_click" data-target="x" data-position="result">Xでポスト</a>'
      + '<button type="button" class="share-btn share-copy" data-track="share_click" data-target="copy" data-position="result">リンクをコピー</button></div>';
    bar.querySelector(".share-line").href = "https://line.me/R/share?text=" + encodeURIComponent(text + "\n" + url);
    bar.querySelector(".share-x").href = "https://x.com/intent/post?text=" + encodeURIComponent(text) + "&url=" + encodeURIComponent(url);
    var copy = bar.querySelector(".share-copy");
    copy.addEventListener("click", function () {
      function done(ok) { copy.textContent = ok ? "コピーしました" : "コピーできませんでした"; root.setTimeout(function () { copy.textContent = "リンクをコピー"; }, 2000); }
      try { root.navigator.clipboard.writeText(url).then(function () { done(true); }, function () { done(false); }); } catch (e) { done(false); }
    });
    el.appendChild(bar);
  }

  // タブ（[data-tabs]）：role="tablist" の中の role="tab" と、aria-controls の tabpanel を切り替える。
  // JavaScript が動かないときは、すべてのパネルがそのまま見える。URLの #（パネルの id）でも開ける。
  function initTabs(box) {
    var tabs = Array.from(box.querySelectorAll("[role='tab']"));
    if (!tabs.length) return;
    function select(tab, focus) {
      tabs.forEach(function (t) {
        var on = t === tab;
        t.setAttribute("aria-selected", on ? "true" : "false");
        t.tabIndex = on ? 0 : -1;
        var panel = doc.getElementById(t.getAttribute("aria-controls"));
        if (panel) panel.hidden = !on;
      });
      if (focus) tab.focus();
    }
    tabs.forEach(function (t, i) {
      t.addEventListener("click", function () { select(t, false); });
      t.addEventListener("keydown", function (e) {
        var n = e.key === "ArrowRight" ? i + 1 : e.key === "ArrowLeft" ? i - 1 : e.key === "Home" ? 0 : e.key === "End" ? tabs.length - 1 : null;
        if (n === null) return;
        e.preventDefault();
        select(tabs[(n + tabs.length) % tabs.length], true);
      });
    });
    function fromHash() {
      var id = (root.location.hash || "").slice(1);
      var hit = id && tabs.filter(function (t) { return t.getAttribute("aria-controls") === id; })[0];
      select(hit || tabs.filter(function (t) { return t.getAttribute("aria-selected") === "true"; })[0] || tabs[0], false);
    }
    fromHash();
    root.addEventListener("hashchange", fromHash);
  }

  function init() {
    doc.querySelectorAll("[data-tabs]").forEach(initTabs);
    doc.querySelectorAll("[id$='-result']").forEach(watch);
  }
  if (doc.readyState === "loading") doc.addEventListener("DOMContentLoaded", init);
  else init();
})(typeof self !== "undefined" ? self : this);
