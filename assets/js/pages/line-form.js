/*
 * LINE で受け取る無料の総合鑑定書：入力フォーム（/line/。LINE の LIFF で開く）
 *   1. LIFF を初期化（LINE の外のブラウザで開いたときは LINE ログイン → 友だち追加のおすすめ）
 *   2. 入力を確かめ、鑑定書の URL（/line/kantei/?d=…）を作る
 *   3. LINE の中なら、その URL をトークに送ってから鑑定書を開く（あとから読み返せるように）
 * 入力内容は当サイトのサーバーには送らない。
 */
(function (root) {
  "use strict";
  var Karute = root.Karute;

  function val(id) { var el = document.getElementById(id); return el ? el.value.trim() : ""; }
  function todayJst() {
    var parts = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Tokyo", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date()).split("-");
    return [Number(parts[0]), Number(parts[1]), Number(parts[2])];
  }

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

  function init() {
    var form = document.getElementById("line-form");
    if (!form) return;
    var liffId = form.getAttribute("data-liff") || "";
    var closed = form.hasAttribute("data-closed") || !liffId;
    var self = Karute.BirthDateField.mount(form.querySelector("[data-birthdate='line-self']"), { idPrefix: "line-self", legend: "あなたの生年月日" });
    var partner = Karute.BirthDateField.mount(form.querySelector("[data-birthdate='line-partner']"), { idPrefix: "line-partner", legend: "お相手の生年月日" });
    var details = document.getElementById("line-partner");
    var errorBox = document.getElementById("line-error");
    var button = document.getElementById("line-submit");
    var agree = document.getElementById("line-agree");
    var liff = root.liff;
    var ready = Promise.resolve(false);

    if (!closed && liff) {
      ready = liff.init({ liffId: liffId }).then(function () {
        if (!liff.isInClient() && !liff.isLoggedIn()) { liff.login({ redirectUri: root.location.href }); return false; }
        return true;
      }).catch(function () { return false; });
    }

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
      var errors = [];
      var me = readPerson("line-self", self, "あなた", errors);
      var you = null;
      if (details.open && (val("line-partner-name") || val("line-partner-sei") || document.getElementById("bd-line-partner-year").value)) {
        you = readPerson("line-partner", partner, "お相手", errors);
      }
      if (!agree.checked) errors.push("プライバシーポリシーを確認し、チェックを入れてください。");
      if (errors.length || !me) return fail(errors.join(" "));
      var d;
      try { d = Karute.kanteiLink.encode({ p: me, q: you, m: todayJst() }); } catch (err) { return fail(err.message); }
      var url = root.location.origin + root.location.pathname.replace(/\/?$/, "/") + "kantei/?d=" + d;
      button.disabled = true;
      button.textContent = "鑑定書を作っています…";
      ready.then(function (ok) {
        if (ok && liff && liff.isInClient()) {
          var text = "【えみり】" + me.name + "さんの総合鑑定書ができました。\nこのリンクから、いつでも読み返せます（いつものブラウザで開くので、PDFで保存もできます）。\n" + url + "&openExternalBrowser=1";
          return liff.sendMessages([{ type: "text", text: text }]).catch(function () { /* 送れなくても鑑定書は開く */ });
        }
      }).then(function () { root.location.href = url; });
    });
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})(typeof self !== "undefined" ? self : this);
