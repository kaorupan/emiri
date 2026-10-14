/*
 * 購入者専用の鑑定書ページ（/premium/kantei/?sid=…）
 *   支払い確認API（worker/）に sid を送り、支払い済みなら入力内容を受け取って鑑定書を描く。
 *   作成日は購入した日にそろえるので、いつ開いても同じ内容になる。
 */
(function (root) {
  "use strict";
  var Karute = root.Karute;
  var h = Karute.dom.h;
  var HISTORY_KEY = "emiri.kantei.history";

  function remember(sid, name, made) {
    try {
      var a = JSON.parse(root.localStorage.getItem(HISTORY_KEY) || "[]");
      if (!Array.isArray(a)) a = [];
      a = a.filter(function (x) { return x && x.sid !== sid; });
      a.unshift({ sid: sid, name: name, made: made });
      root.localStorage.setItem(HISTORY_KEY, JSON.stringify(a.slice(0, 20)));
    } catch (e) { /* 保存できなくても表示は続ける */ }
  }

  function message(container, title, text) {
    Karute.dom.clear(container);
    container.appendChild(h("section", { class: "card prose" },
      h("h2", null, title),
      h("p", null, text),
      h("p", null, h("a", { href: "../../contact/" }, "お問い合わせはこちら"))));
  }

  function init() {
    var container = document.getElementById("kantei-root");
    if (!container || !container.hasAttribute("data-api")) return;
    var api = container.getAttribute("data-api");
    var m = /[?&]sid=([^&]+)/.exec(root.location.search);
    var sid = m ? decodeURIComponent(m[1]) : "";
    if (!sid || !api) return message(container, "鑑定書が見つかりません", "このページは、総合鑑定書をご購入いただいた方専用のページです。お支払い後に開いたページのURLからご覧ください。");

    var tries = 0;
    function load() {
      root.fetch(api + "/api/kantei?sid=" + encodeURIComponent(sid))
        .then(function (r) { return r.json().then(function (d) { return { status: r.status, d: d }; }); })
        .then(function (res) {
          if (res.status === 402 && tries < 5) { tries++; setTimeout(load, 2000); return; }
          if (res.status !== 200) return message(container, "鑑定書を表示できません", (res.d && res.d.error ? res.d.error + "。" : "") + "お支払いが済んでいるのに表示されない場合は、お手数ですがお問い合わせください。確認のうえ対応します。");
          var report = root.KaruteContent.kantei.buildKantei(res.d.person, res.d.made, res.d.partner || undefined);
          root.KaruteKanteiPage.render(container, report, {});
          remember(sid, res.d.person.name, res.d.made.year + "年" + res.d.made.month + "月" + res.d.made.day + "日");
          var btn = document.getElementById("kantei-print");
          if (btn) { btn.hidden = false; btn.addEventListener("click", function () { root.print(); }); }
        })
        .catch(function () { message(container, "通信に失敗しました", "電波の良い場所で、ページを読み込み直してください。"); });
    }
    load();
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})(typeof self !== "undefined" ? self : this);
