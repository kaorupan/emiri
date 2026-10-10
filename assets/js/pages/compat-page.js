/*
 * 相性ページの共通部品（四柱推命・マヤ暦・宿曜の相性ページで使う）
 *   KaruteCompatPage.mount({ prefix, withTime, timeHint, build(birthA, birthB) → [ノード…], heading })
 *   - あなたの生年月日は保存できる（プロフィール）。お相手の生年月日と時刻は保存しない。
 *   - 部品：step（番号つきカード）、tradition（伝統的な説明）、person（人物カード）
 */
(function (root) {
  "use strict";
  var Karute = root.Karute;
  var R = root.KaruteKyuseiRender;
  var h = Karute.dom.h;

  function step(id, n, eyebrow, title, children) {
    return h("section", { class: "card kyusei-block", id: id, "aria-labelledby": id + "-title", "data-order": String(n) },
      h("p", { class: "eyebrow" }, h("span", { class: "kyusei-step-no" }, String(n)), " ", eyebrow),
      h("h2", { id: id + "-title" }, title),
      children);
  }

  function tradition(label, text) {
    return h("div", { class: "kyusei-tradition" }, h("p", { class: "kyusei-source" }, label), h("p", null, text));
  }

  function mount(cfg) {
    var form = document.getElementById(cfg.prefix + "-form");
    var output = document.getElementById(cfg.prefix + "-result-body");
    var wrap = document.getElementById(cfg.prefix + "-result");
    if (!form || !output || !wrap) return;
    var you = Karute.BirthDateField.mount(form.querySelector("[data-birthdate='self']"), { idPrefix: "self", legend: "あなたの生年月日", useProfile: true });
    var partner = Karute.BirthDateField.mount(form.querySelector("[data-birthdate='partner']"), { idPrefix: "partner", legend: "お相手の生年月日", useProfile: false });
    var times = null;
    if (cfg.withTime) {
      times = {
        self: R.timeField(form.querySelector("[data-birthtime='self']"), { idPrefix: "self", legend: "あなたの生まれた時刻（任意）", collapsible: true, hint: cfg.timeHint }),
        partner: R.timeField(form.querySelector("[data-birthtime='partner']"), { idPrefix: "partner", legend: "お相手の生まれた時刻（任意）", collapsible: true, hint: cfg.timeHint })
      };
    }
    form.addEventListener("submit", function (event) {
      event.preventDefault();
      var tb = times ? times.partner.read() : { ok: true, value: null };
      var b = partner.read();
      var ta = times ? times.self.read() : { ok: true, value: null };
      var a = you.read();
      if (!a.ok || !b.ok || !ta.ok || !tb.ok) return;
      you.commit(a.value);
      var birthA = { year: a.value.year, month: a.value.month, day: a.value.day };
      var birthB = { year: b.value.year, month: b.value.month, day: b.value.day };
      if (times) { birthA.time = ta.value; birthB.time = tb.value; }
      Karute.dom.clear(output);
      output.appendChild(h("h2", { class: "visually-hidden", tabindex: "-1", id: cfg.prefix + "-heading" }, cfg.heading));
      try {
        cfg.build(birthA, birthB).forEach(function (node) { if (node) output.appendChild(node); });
      } catch (e) {
        output.appendChild(h("p", { class: "card kyusei-note", role: "alert" }, "この生年月日は計算できる範囲の外のため、鑑定できません。"));
      }
      wrap.hidden = false;
      Karute.dom.scrollTo(wrap);
      var heading = document.getElementById(cfg.prefix + "-heading");
      if (heading) heading.focus({ preventScroll: true });
    });
  }

  root.KaruteCompatPage = { mount: mount, step: step, tradition: tradition };
})(typeof self !== "undefined" ? self : this);
