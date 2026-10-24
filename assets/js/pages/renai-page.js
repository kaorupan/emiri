/*
 * /fukuen/ 復縁占い・/kataomoi/ 片思い占い
 *   生年月日（＋わかればお相手）と今の状況 → content/renai.js → ふたりの縁・動きやすい月・状況に合わせたアドバイス
 *   入力はサーバーに送らない。
 */
(function (root) {
  "use strict";
  var Karute = root.Karute, h = Karute.dom.h;
  var KE = root.KaruteEngines, KC = root.KaruteContent;
  var E = { numerology: KE.numerology, kyusei: KE.kyusei, shichu: KE.shichusuimei, horoscope: KE.horoscope, shukuyo: KE.shukuyo, maya: KE.maya, jyotish: KE.jyotish, uchuban: KC.uchuban, sougou: KC.sougouAisho };
  var LABEL = { fukuen: "復縁", kataomoi: "片思い" };

  function bar(score) { return h("span", { class: "sg-bar", "aria-hidden": "true" }, h("span", { style: "width:" + score + "%" })); }

  function render(box, v) {
    var name = LABEL[v.kind];
    Karute.dom.clear(box);
    var head = h("section", { class: "card sg-total", "aria-labelledby": "rn-result-heading" },
      h("p", { class: "sg-rel" }, name + "占いの結果"),
      h("h2", { id: "rn-result-heading", tabindex: "-1" }, v.blocked ? "今は、自分を大切にする時期"
        : v.bestMonth ? v.bestMonth.year + "年" + v.bestMonth.month + "月が動きやすい月" : "今は、関係を育てる時期"),
      v.blocked ? h("p", null, "相手が距離を置きたいと伝えている今は、連絡を控えることがいちばんの近道です。下の流れは、気持ちを整えるための目安として読んでください。")
        : v.bestMonth ? h("p", null, v.bestMonth.label + "です。これからの半年の中で、" + (v.kind === "fukuen" ? "歩み寄りのきっかけ" : "気持ちを伝えるきっかけ") + "をつかみやすい目安です。") : null);
    if (v.en) {
      head.appendChild(h("div", { class: "rn-en" },
        h("p", { class: "rn-en-title" }, "ふたりの縁（8つの占術の総合相性）"),
        h("p", { class: "sg-score" }, h("b", null, String(v.en.total)), h("span", null, "点")),
        bar(v.en.total),
        h("p", null, v.en.headline + "。いちばん響き合うのは" + v.en.best.method + "（" + v.en.best.reason + "）です。"),
        h("p", null, h("a", { href: "../aisho/", "data-track": "related_click", "data-target": "aisho", "data-position": "result" }, "8つの占術の相性をくわしく見る →"))));
    }
    box.appendChild(head);

    box.appendChild(h("section", { class: "card sg-block", "aria-labelledby": "rn-month-title" },
      h("h2", { id: "rn-month-title" }, v.blocked ? "これからの心の流れ（6か月）" : "これからの6か月：動きやすい月"),
      h("p", { class: "sg-note" }, "数秘術のパーソナルマンス（月ごとのテーマ）から見た目安です。" + (v.blocked ? "" : "★は動きやすい月です。")),
      h("ol", { class: "tk-months" }, v.months.map(function (m, i) {
        var good = m.good && !v.blocked;
        return h("li", { class: "tk-month" + (good ? " is-good" : "") },
          h("b", null, (i === 0 || m.month === 1 ? m.year + "年" : "") + m.month + "月", good ? h("span", { "aria-label": "動きやすい月" }, " ★") : null),
          h("span", null, m.label));
      }))));

    if (v.advice.length) {
      box.appendChild(h("section", { class: "card sg-block prose", "aria-labelledby": "rn-adv-title" },
        h("h2", { id: "rn-adv-title" }, "今の状況から見るアドバイス"),
        v.advice.map(function (a) { return h("p", null, a.text); })));
    }

    box.appendChild(h("section", { class: "card sg-block", "aria-labelledby": "rn-step-title" },
      h("h2", { id: "rn-step-title" }, "これからの進め方"),
      h("ol", { class: "rn-steps" }, v.steps.map(function (s) { return h("li", null, s); }))));

    if (document.getElementById("consult")) {
      box.appendChild(h("p", { class: "result-consult" }, "ひとりで抱えきれないときは、",
        h("a", { href: "#consult", "data-track": "related_click", "data-target": "consult", "data-position": "result" }, "占い師に気持ちを聞いてもらう"), "こともできます（広告）。"));
    }
    box.appendChild(h("p", { class: "notice" }, "占いの結果は、気持ちを整理するための目安です。相手の気持ちや選んだことは、相手のものとして大切にしてください。"));
    box.hidden = false;
    Karute.dom.scrollTo(box);
    var hd = document.getElementById("rn-result-heading");
    if (hd) hd.focus({ preventScroll: true });
  }

  function init() {
    var form = document.getElementById("renai-form");
    var box = document.getElementById("renai-result");
    if (!form || !box) return;
    var kind = form.getAttribute("data-kind");
    var you = Karute.BirthDateField.mount(form.querySelector("[data-birthdate='self']"), { idPrefix: "self", legend: "あなたの生年月日", useProfile: true });
    var partner = Karute.BirthDateField.mount(form.querySelector("[data-birthdate='partner']"), { idPrefix: "partner", legend: "お相手の生年月日（わかれば）", useProfile: false });
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var a = you.read();
      if (!a.ok) return;
      you.commit(a.value);
      var other = null, py = document.getElementById("bd-partner-year");
      if (py && py.value.trim()) { var b = partner.read(); if (!b.ok) return; other = b.value; }
      var answers = {};
      Array.from(form.querySelectorAll("input[type=radio]:checked")).forEach(function (r) { answers[r.name] = r.value; });
      render(box, KC.renai.build(kind, a.value, other, answers, Karute.date.todayInJapan(), E));
    });
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})(typeof self !== "undefined" ? self : this);
