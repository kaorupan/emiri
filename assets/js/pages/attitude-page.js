/*
 * /suhijutsu/attitude/ アティチュードナンバーの計算
 *   月と日を選ぶ → 数字を出して、ページ内のその数字の説明へ案内する。入力はどこにも送らない。
 */
(function (root) {
  "use strict";
  function init() {
    var form = document.getElementById("attitude-form");
    var box = document.getElementById("attitude-result");
    var err = document.getElementById("at-error");
    if (!form || !box) return;
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var m = Number(form.month.value), d = Number(form.day.value);
      var max = new Date(Date.UTC(2000, m, 0)).getUTCDate();
      if (!m || !d || d > max) {
        err.textContent = !m || !d ? "月と日を選んでください。" : m + "月に" + d + "日はありません。";
        err.hidden = false; return;
      }
      err.hidden = true;
      var n = root.KaruteEngines.numerology.attitudeNumber(m, d);
      var sec = document.getElementById("at-" + n);
      var first = sec ? sec.nextElementSibling : null;
      box.innerHTML = "";
      var h = document.createElement("p"); h.className = "at-num"; h.tabIndex = -1; h.id = "at-result-heading";
      h.textContent = m + "月" + d + "日生まれのアティチュードナンバーは「" + n + "」" + (n === 11 ? "（マスターナンバー）" : "");
      box.appendChild(h);
      if (first) { var p = document.createElement("p"); p.textContent = first.textContent; box.appendChild(p); }
      var a = document.createElement("a"); a.href = "#at-" + n; a.textContent = "数字" + n + "の意味をくわしく見る →"; box.appendChild(a);
      box.hidden = false;
      h.focus();
    });
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})(typeof self !== "undefined" ? self : this);
