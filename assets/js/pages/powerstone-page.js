/*
 * /powerstone/ あなたの守護石の診断
 *   生年月日 → 誕生石（誕生月）・五行の石（九星の本命星の五行）・ライフパスの石（数秘術）
 *   入力はサーバーに送らない。
 */
(function (root) {
  "use strict";
  var Karute = root.Karute, h = Karute.dom.h;
  var S = root.KaruteContent.stones, kyusei = root.KaruteEngines.kyusei, num = root.KaruteEngines.numerology;
  var COLOR_NAME = {};
  S.COLORS.forEach(function (c) { COLOR_NAME[c.id] = c.name; });

  function stoneCard(s, why) {
    return h("li", { class: "ps-card" },
      h("a", { href: s.slug + "/", "data-track": "related_click", "data-target": "powerstone-" + s.slug, "data-position": "result" },
        h("span", { class: "ps-dot ps-" + s.color, "aria-hidden": "true" }),
        h("span", { class: "ps-card-body" },
          h("b", null, s.name), h("small", null, "石言葉：" + s.words),
          why ? h("span", { class: "ps-why" }, why) : null),
        h("span", { class: "arrow", "aria-hidden": "true" }, "→")));
  }

  function render(box, birth) {
    var month = Number(birth.month);
    var k = kyusei.calculateKyusei(birth);
    var el = k.honmeiStar.element;
    var lp = num.calculateNumerology(birth, { targetYear: Karute.date.todayInJapan().year }).lifePath;
    var lpPick = S.LIFEPATH[lp] || S.LIFEPATH[lp % 11] || S.LIFEPATH[1];

    var bs = S.BIRTHSTONES[month];
    var bsStones = bs.filter(function (x) { return S.bySlug[x]; }).map(function (x) { return S.bySlug[x]; });
    var bsOthers = bs.filter(function (x) { return !S.bySlug[x]; });
    var colors = S.ELEMENT_COLORS[el];
    var elStones = S.STONES.filter(function (s) { return colors.indexOf(s.color) >= 0; }).slice(0, 3);
    var lpStone = S.bySlug[lpPick[0]];

    Karute.dom.clear(box);
    box.appendChild(h("section", { class: "card ps-result-card", "aria-labelledby": "ps-result-title" },
      h("p", { class: "eyebrow" }, "YOUR STONES"),
      h("h2", { id: "ps-result-title", tabindex: "-1" }, "あなたの守護石"),
      h("p", { class: "ps-main" }, "いちばんのおすすめは「", h("a", { href: lpStone.slug + "/" }, lpStone.name), "」。" + lpPick[1] + "です。"),
      h("h3", null, "1. ライフパスナンバー" + lp + "の石"),
      h("p", { class: "ps-note" }, "数秘術のライフパスナンバー（生き方のテーマ）に合わせて、えみりが選んだ石です。"),
      h("ul", { class: "ps-cards" }, stoneCard(lpStone, lpPick[1])),
      h("h3", null, "2. " + month + "月の誕生石"),
      h("ul", { class: "ps-cards" }, bsStones.map(function (s) { return stoneCard(s, month + "月の誕生石"); })),
      bsOthers.length ? h("p", { class: "ps-note" }, "ほかに" + bsOthers.join("・") + "も" + month + "月の誕生石です（2021年改訂版）。") : null,
      h("h3", null, "3. 五行「" + el + "」の石"),
      h("p", { class: "ps-note" }, "九星気学の本命星（" + k.honmeiStar.name + "）の五行は「" + el + "」。" + colors.map(function (c) { return COLOR_NAME[c]; }).join("・") + "の石が、あなたの気と調和するとされます。"),
      h("ul", { class: "ps-cards" }, elStones.map(function (s) { return stoneCard(s, "五行「" + el + "」の色"); })),
      h("p", { class: "ps-note" }, "パワーストーンの力は言い伝えによるものです。気に入った石を、毎日を前向きに過ごすお守りとして楽しんでください。")));
    box.hidden = false;
    Karute.dom.scrollTo(box);
  }

  function init() {
    var form = document.getElementById("powerstone-form");
    var box = document.getElementById("powerstone-result");
    if (!form || !box) return;
    var field = Karute.BirthDateField.mount(form.querySelector("[data-birthdate='self']"), { idPrefix: "self", legend: "あなたの生年月日", useProfile: true });
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var input = field.read();
      if (!input.ok) return;
      field.commit(input.value);
      render(box, input.value);
    });
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})(typeof self !== "undefined" ? self : this);
