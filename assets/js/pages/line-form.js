/*
 * LINE で受け取る無料の総合鑑定書：入力フォーム（/line/。LINE の LIFF で開く）
 *   1. LIFF を初期化（LINE の外のブラウザで開いたときは LINE ログイン）
 *   2. えみりの LINE 公式アカウントを友だち追加しているか確かめる（liff.getFriendship）。
 *      友だちでない・確かめられないときは、フォームを使えないようにして友だち追加を案内する
 *      （LINE Developers で、LINE ログインのチャネルに公式アカウントをリンクしておく必要がある）
 *   3. 入力を確かめ、鑑定書の URL（/line/kantei/?d=…）を作る。送信の直前にも、もう一度友だちか確かめる
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
    var gate = document.getElementById("line-gate");
    var gateTitle = document.getElementById("line-gate-title");
    var gateText = document.getElementById("line-gate-text");
    var gateOpen = document.getElementById("line-gate-open");
    var recheck = document.getElementById("line-gate-recheck");
    var ready = Promise.resolve(false);
    var isFriend = false;

    // 友だちかどうか：true / false / null（確かめられなかった）
    function checkFriend() {
      return ready.then(function (ok) {
        if (!ok) return null;
        return liff.getFriendship().then(function (r) { return !!(r && r.friendFlag); }, function () { return null; });
      });
    }
    function lock(state) {
      isFriend = state === true;
      button.disabled = !isFriend;
      form.hidden = !isFriend;
      if (!gate) return;
      gate.hidden = isFriend;
      if (isFriend) return;
      if (state === null) {
        gateTitle.textContent = "LINEで開いてください";
        gateText.textContent = "総合鑑定書は、えみりのLINE公式アカウントを友だち追加した方へのプレゼントです。LINEアプリで開き、友だち追加をしてからご利用ください。";
      } else {
        gateTitle.textContent = "LINEの友だち追加が必要です";
        gateText.textContent = "総合鑑定書は、えみりのLINE公式アカウントを友だち追加した方へのプレゼントです。友だち追加をしてから、「友だち追加したので確認する」を押してください。";
      }
      if (gateOpen) gateOpen.hidden = !!(liff && liff.isInClient && safeInClient());
    }
    function safeInClient() { try { return liff.isInClient(); } catch (e) { return false; } }

    if (!closed && liff) {
      ready = liff.init({ liffId: liffId }).then(function () {
        if (!liff.isInClient() && !liff.isLoggedIn()) { liff.login({ redirectUri: root.location.href }); return false; }
        return true;
      }).catch(function () { return false; });
    }
    if (!closed) {
      button.disabled = true;
      checkFriend().then(lock);
      // 「確認する」：ページを読み込み直して、LINE にもう一度確かめる（押したことがはっきりわかるように）
      var KEY = "emiri-line-recheck";
      var rechecked = false;
      try { rechecked = sessionStorage.getItem(KEY) === "1"; sessionStorage.removeItem(KEY); } catch (e) {}
      checkFriend().then(function (st) {
        var status = document.getElementById("line-gate-status");
        if (rechecked && st !== true && status) {
          status.textContent = st === null
            ? "LINEと通信できませんでした。LINEアプリで開き直してから、もう一度お試しください。"
            : "まだ友だち追加が確認できません。友だち追加（ブロックしている場合は、LINEの友だちリストで「ブロック解除」）をしてから、もう一度押してください。";
          status.hidden = false;
        }
      });
      if (recheck) recheck.addEventListener("click", function () {
        recheck.disabled = true;
        recheck.textContent = "確認しています…";
        try { sessionStorage.setItem(KEY, "1"); } catch (e) {}
        root.location.reload();
      });
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
      checkFriend().then(function (st) {
        if (st !== true) { button.textContent = "鑑定書を受け取る（無料）"; lock(st); throw new Error("not-friend"); }
        return true;
      }).then(function (ok) {
        if (ok && liff && liff.isInClient()) {
          var text = "【えみり】" + me.name + "さんの総合鑑定書ができました。\nこのリンクから、いつでも読み返せます（いつものブラウザで開くので、PDFで保存もできます）。\n" + url + "&openExternalBrowser=1";
          return liff.sendMessages([{ type: "text", text: text }]).catch(function () { /* 送れなくても鑑定書は開く */ });
        }
      }).then(function () { root.location.href = url; }, function () { if (gate) gate.scrollIntoView({ block: "center" }); });
    });
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})(typeof self !== "undefined" ? self : this);
