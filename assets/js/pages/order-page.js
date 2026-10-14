/*
 * 本格占いの注文ページ（/premium/order/）
 *   1回目のボタン：入力を確かめて「入力内容の確認」を出す
 *   2回目のボタン：支払い確認API（worker/）に送り、Stripe の支払いページへ移動する
 * 入力内容は、支払いページを作るときに決済サービス（Stripe）の注文情報として保存される。
 */
(function (root) {
  "use strict";
  var Karute = root.Karute;
  var h = Karute.dom.h;
  var HISTORY_KEY = "emiri.kantei.history";

  function loadHistory() {
    try { var a = JSON.parse(root.localStorage.getItem(HISTORY_KEY) || "[]"); return Array.isArray(a) ? a : []; } catch (e) { return []; }
  }

  function val(id) { var el = document.getElementById(id); return el ? el.value.trim() : ""; }

  function readPerson(prefix, field, label, errors) {
    var name = val(prefix + "-name"), sei = val(prefix + "-sei"), mei = val(prefix + "-mei"), time = val(prefix + "-time");
    var nameEl = document.getElementById(prefix + "-name");
    nameEl.removeAttribute("aria-invalid");
    var d = field.read();
    if (!name) { nameEl.setAttribute("aria-invalid", "true"); errors.push(label + "の呼び名を入力してください。"); }
    if (!d.ok) { errors.push(label + "の生年月日を確かめてください。"); return null; }
    if (d.value.year < 1900 || d.value.year > 2100) { errors.push(label + "の生年は1900〜2100年で入力してください。"); return null; }
    if ((sei && !mei) || (!sei && mei)) errors.push(label + "の姓名は、姓と名の両方を入れるか、両方とも空けてください。");
    var p = { name: name, year: d.value.year, month: d.value.month, day: d.value.day };
    if (sei && mei) { p.sei = sei; p.mei = mei; }
    if (time) p.time = time;
    return p;
  }

  function summaryRows(p, label) {
    var rows = [[label + "の呼び名", p.name]];
    if (p.sei) rows.push(["姓名", p.sei + " " + p.mei]);
    rows.push(["生年月日", p.year + "年" + p.month + "月" + p.day + "日"]);
    rows.push(["出生時刻", p.time || "（入力なし）"]);
    return rows;
  }

  function init() {
    var form = document.getElementById("order-form");
    if (!form) return;
    var api = form.getAttribute("data-api") || "";
    var closed = form.hasAttribute("data-closed") || !api;
    var self = Karute.BirthDateField.mount(form.querySelector("[data-birthdate='order-self']"), { idPrefix: "order-self", legend: "あなたの生年月日" });
    var partner = Karute.BirthDateField.mount(form.querySelector("[data-birthdate='order-partner']"), { idPrefix: "order-partner", legend: "お相手の生年月日" });
    var details = document.getElementById("order-partner");
    var confirmBox = document.getElementById("order-confirm");
    var summary = document.getElementById("order-summary");
    var errorBox = document.getElementById("order-error");
    var button = document.getElementById("order-submit");
    var agree = document.getElementById("order-agree");
    var pending = null;

    if (/[?&]canceled=1/.test(root.location.search)) {
      errorBox.textContent = "お支払いは完了していません。もう一度お試しいただけます（入力内容はお手数ですが入れ直してください）。";
      errorBox.hidden = false;
    }

    var history = loadHistory();
    if (history.length) {
      var list = document.getElementById("order-history-list");
      history.forEach(function (x) {
        list.appendChild(h("li", null, h("a", { href: "../kantei/?sid=" + encodeURIComponent(x.sid) }, (x.name || "") + "さんの総合鑑定書（" + (x.made || "") + "）", h("span", { class: "arrow", "aria-hidden": "true" }, " →"))));
      });
      document.getElementById("order-history").hidden = false;
    }

    function reset() {
      if (!pending) return;
      pending = null;
      confirmBox.hidden = true;
      button.textContent = "入力内容を確認する";
    }
    form.addEventListener("input", function (e) { if (e.target !== agree) reset(); });
    form.addEventListener("change", function (e) { if (e.target !== agree) reset(); });
    details.addEventListener("toggle", reset);

    function fail(msg) {
      errorBox.textContent = msg;
      errorBox.hidden = false;
      button.disabled = false;
      errorBox.scrollIntoView({ block: "center" });
    }

    form.addEventListener("submit", function (e) {
      e.preventDefault();
      if (closed) return;
      errorBox.hidden = true;
      if (pending) {
        if (!agree.checked) return fail("特定商取引法に基づく表記とプライバシーポリシーを確認し、チェックを入れてください。");
        button.disabled = true;
        button.textContent = "お支払いのページを準備しています…";
        root.fetch(api + "/api/checkout", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ person: pending.person, partner: pending.partner, agree: true })
        }).then(function (r) { return r.json().then(function (d) { return { ok: r.ok, d: d }; }); })
          .then(function (res) {
            if (res.ok && res.d.url) { root.location.href = res.d.url; return; }
            button.textContent = "この内容でお支払いへ進む";
            fail(res.d.error || "お支払いのページを作れませんでした。時間をおいてお試しください。");
          })
          .catch(function () {
            button.textContent = "この内容でお支払いへ進む";
            fail("通信に失敗しました。電波の良い場所で、もう一度お試しください。");
          });
        return;
      }
      var errors = [];
      var me = readPerson("order-self", self, "あなた", errors);
      var you = null;
      if (details.open && (val("order-partner-name") || val("order-partner-sei") || document.getElementById("bd-order-partner-year").value)) {
        you = readPerson("order-partner", partner, "お相手", errors);
      }
      if (errors.length || !me) return fail(errors.join(" "));
      pending = { person: me, partner: you };
      Karute.dom.clear(summary);
      var rows = summaryRows(me, "あなた");
      if (you) rows = rows.concat(summaryRows(you, "お相手"));
      else rows.push(["相性のお相手", "（設定なし）"]);
      rows.forEach(function (r) { summary.appendChild(h("div", null, h("dt", null, r[0]), h("dd", null, r[1]))); });
      confirmBox.hidden = false;
      confirmBox.focus();
      button.textContent = "この内容でお支払いへ進む";
    });
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})(typeof self !== "undefined" ? self : this);
