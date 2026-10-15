/*
 * /fusui/ 本命卦（八宅風水）の診断
 *   生年月日（立春で年を区切る）と性別 → KaruteEngines.fusui → 吉方位・凶方位の方位盤と使い方
 *   入力はサーバーに送らない。
 */
(function (root) {
  "use strict";
  var Karute = root.Karute, h = Karute.dom.h;
  var engine = root.KaruteEngines.fusui, text = root.KaruteContent.fusui;
  var GRID = [["nw", "n", "ne"], ["w", "c", "e"], ["sw", "s", "se"]];

  function compass(g) {
    var cells = [];
    GRID.forEach(function (row) {
      row.forEach(function (k) {
        if (k === "c") {
          cells.push(h("div", { class: "fs-cell fs-center" }, h("b", null, g.name), h("span", null, g.groupName)));
          return;
        }
        var d = g.dirs.filter(function (x) { return x.key === k; })[0];
        cells.push(h("div", { class: "fs-cell " + (d.star.good ? "is-good" : "is-bad") + (d.star.key === "seiki" ? " is-best" : "") },
          h("span", { class: "fs-dir" }, d.name), h("b", null, d.star.name), h("span", { class: "fs-mark" }, d.star.good ? "吉" : "凶")));
      });
    });
    return h("figure", { class: "fs-chart" },
      h("div", { class: "fs-grid", role: "img", "aria-label": g.name + "の人の方位盤。吉方位は" + g.good.map(function (x) { return x.name + "（" + x.star.name + "）"; }).join("、") + "。凶方位は" + g.bad.map(function (x) { return x.name + "（" + x.star.name + "）"; }).join("、") }, cells),
      h("figcaption", null, "地図と同じく、北を上にしています。家の中心から見た方位です。"));
  }

  function starList(items) {
    return h("ul", { class: "fs-stars" }, items.map(function (x) {
      var t = text.STAR[x.star.key];
      return h("li", { class: x.star.good ? "is-good" : "is-bad" },
        h("p", { class: "fs-star-head" }, h("b", null, x.name), "　" + x.star.name + "（" + x.star.reading + "）：" + t.short),
        h("p", null, t.text + t.use));
    }));
  }

  function guaCard(g, label) {
    var t = text.GUA[g.n];
    var best = g.good[0], health = g.good[1], love = g.good[2];
    return h("section", { class: "card fs-card", "aria-labelledby": "fs-title-" + g.n },
      label ? h("p", { class: "eyebrow" }, label) : h("p", { class: "eyebrow" }, "YOUR GUA"),
      h("h2", { id: "fs-title-" + g.n, class: "fs-name", tabindex: "-1" }, "あなたの本命卦は「" + g.name + "（" + g.reading + "）」"),
      h("p", { class: "fs-sub" }, t.symbol + "の卦・" + g.groupName + "・五行は" + g.element),
      h("dl", { class: "result-points" },
        h("div", null, h("dt", null, "吉方位"), h("dd", null, g.good.map(function (x) { return x.name; }).join("・"))),
        h("div", null, h("dt", null, "いちばんの吉方位"), h("dd", null, best.name + "（生気：発展・やる気）")),
        h("div", null, h("dt", null, "寝るときの頭の向き"), h("dd", null, health.name + "（健康）か" + love.name + "（人間関係・恋愛）")),
        h("div", null, h("dt", null, "机で向く方位"), h("dd", null, best.name + "（集中・仕事運）")),
        h("div", null, h("dt", null, "ラッキーカラー"), h("dd", null, t.colors.join("・")))),
      compass(g),
      h("h3", null, "吉方位の使い方"), starList(g.good),
      h("h3", null, "凶方位との付き合い方"), starList(g.bad),
      h("h3", null, g.name + "の人の性格"), h("p", null, t.personality),
      h("p", null, h("a", { class: "btn btn-ghost", href: g.slug + "/", "data-track": "related_click", "data-target": "fusui-" + g.slug, "data-position": "result" }, g.name + "の人の恋愛・仕事・部屋づくりを見る")));
  }

  function render(box, r, sexLabel) {
    Karute.dom.clear(box);
    var y = r.input.year + "年" + r.input.month + "月" + r.input.day + "日";
    box.appendChild(h("p", { class: "fs-meta" }, y + "生まれ（気学の年は" + r.kigakuYear + "年）・" + sexLabel));
    if (r.both) {
      box.appendChild(h("p", { class: "notice" }, "伝統的な八宅風水では、本命卦は性別によって出し方が変わります。性別を答えない場合は、両方の結果を並べています。しっくりくる方を参考にしてください。"));
      box.appendChild(guaCard(r.m.gua, "男性の出し方の場合"));
      box.appendChild(guaCard(r.f.gua, "女性の出し方の場合"));
    } else {
      box.appendChild(guaCard(r.gua));
      if (r.mayChange) {
        box.appendChild(h("p", { class: "notice" }, "立春の日の生まれで、生まれた時刻によっては前の年として「" + r.alternative.name + "（" + r.alternative.reading + "）」になります。", h("a", { href: r.alternative.slug + "/" }, r.alternative.name + "の解説を見る")));
      }
    }
    box.hidden = false;
    Karute.dom.scrollTo(box);
  }

  function init() {
    var form = document.getElementById("fusui-form");
    var box = document.getElementById("fusui-result");
    if (!form || !box) return;
    var field = Karute.BirthDateField.mount(form.querySelector("[data-birthdate='self']"), { idPrefix: "self", legend: "あなたの生年月日", useProfile: true });
    var err = document.getElementById("fusui-sex-error");
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var input = field.read();
      var sexEl = form.querySelector("input[name='fusui-sex']:checked");
      err.hidden = !!sexEl;
      if (!sexEl) { err.textContent = "本命卦の出し方を選んでください。"; }
      if (!input.ok || !sexEl) return;
      field.commit(input.value);
      var sex = sexEl.value;
      if (sex === "x") {
        render(box, { both: true, input: input.value, kigakuYear: engine.calculateHonmeika(input.value, "m").kigakuYear,
          m: engine.calculateHonmeika(input.value, "m"), f: engine.calculateHonmeika(input.value, "f") }, "性別は答えない");
      } else {
        render(box, engine.calculateHonmeika(input.value, sex), sex === "m" ? "男性の出し方" : "女性の出し方");
      }
    });
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})(typeof self !== "undefined" ? self : this);
