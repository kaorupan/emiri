/*
 * /kensaku/ サイト内検索（?q=キーワード）
 *   索引：assets/data/search.json（tools/home/generate.mjs が作る。占いの一覧＋全ページのタイトルと説明）
 *   表記ゆれ：全角・半角（NFKC）、大文字・小文字、カタカナ→ひらがなをそろえて探す。空白で区切ると「すべて含む」。
 *   検索した言葉は、アクセス解析にも、どこにも送らない（結果が0件かどうかだけを数える）。
 */
(function (root) {
  "use strict";
  var Karute = root.Karute, h = Karute.dom.h;

  var core = root.KaruteSearchCore, norm = core.norm, search = core.search;

  var SUGGEST = ["相性", "恋愛", "仕事", "今日の運勢", "夢", "手相", "パワーストーン", "風水"];

  function render(box, q, list) {
    Karute.dom.clear(box);
    if (!q) { box.appendChild(h("p", { class: "block-note" }, "キーワードを入れて検索してください。")); return; }
    if (!list.length) {
      box.appendChild(h("p", { class: "search-none" }, "「" + q + "」に合う占いが見つかりませんでした。"));
      box.appendChild(h("p", { class: "block-note" }, "言葉を短くするか、別の言い方で探してみてください。こんな言葉でも探せます："));
      box.appendChild(h("ul", { class: "chips" }, SUGGEST.map(function (w) {
        return h("li", null, h("a", { href: "?q=" + encodeURIComponent(w) }, w));
      })));
      return;
    }
    var MAX = 50;
    box.appendChild(h("p", { class: "block-note" }, "「" + q + "」の検索結果：" + list.length + "件" + (list.length > MAX ? "（上位" + MAX + "件を表示）" : "")));
    box.appendChild(h("ul", { class: "rows search-rows" }, list.slice(0, MAX).map(function (e) {
      return h("li", null, h("a", { class: "row", href: "../" + e.u, "data-track": "related_click", "data-target": "search-result", "data-position": "search" },
        h("span", { class: "row-body" },
          h("b", null, e.t, e.c ? h("span", { class: "row-cat" }, e.c) : null),
          e.d ? h("small", null, e.d) : null),
        h("span", { class: "row-arrow", "aria-hidden": "true" }, "›")));
    })));
  }

  function init() {
    var box = document.getElementById("search-result");
    if (!box) return;
    var q = (new URLSearchParams(root.location.search).get("q") || "").trim().slice(0, 60);
    var input = document.getElementById("kensaku-q");
    if (input) input.value = q;
    if (!q) return;
    box.appendChild(h("p", { class: "block-note" }, "検索しています…"));
    fetch(box.getAttribute("data-index")).then(function (r) { return r.json(); }).then(function (index) {
      var list = search(index, q);
      render(box, q, list);
      if (Karute.track) Karute.track("search", { target: list.length ? "hit" : "none" });
      var t = document.getElementById("result-title");
      if (t) t.focus({ preventScroll: true });
    }).catch(function () {
      Karute.dom.clear(box);
      box.appendChild(h("p", { class: "search-none" }, "検索の準備ができませんでした。時間をおいて、もう一度お試しください。"));
    });
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})(typeof self !== "undefined" ? self : this);
