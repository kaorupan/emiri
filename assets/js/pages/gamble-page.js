/*
 * /gamble/ ギャンブル運占い
 *   生年月日 → content/gamble.js（四柱推命・数秘術の組み合わせ）→ 今日のギャンブル運、これから7日、生まれ持ったギャンブル運
 *   入力はサーバーに送らない。
 */
(function (root) {
  "use strict";
  var Karute = root.Karute, h = Karute.dom.h;
  var E = { shichu: root.KaruteEngines.shichusuimei, numerology: root.KaruteEngines.numerology };
  var WD = ["日", "月", "火", "水", "木", "金", "土"];

  function stars(n) {
    return h("span", { class: "gb-stars", role: "img", "aria-label": "5段階中" + n }, "★★★★★".slice(0, n), h("span", { class: "gb-stars-off", "aria-hidden": "true" }, "★★★★★".slice(n)));
  }
  function wd(d) { return WD[new Date(Date.UTC(d.year, d.month - 1, d.day)).getUTCDay()]; }

  function render(box, v) {
    var t = v.today, n = v.natal;
    Karute.dom.clear(box);

    box.appendChild(h("section", { class: "card gb-today gb-s" + t.score, "aria-labelledby": "gb-result-heading" },
      h("h2", { id: "gb-result-heading", tabindex: "-1" }, "今日のギャンブル運（" + t.date.month + "月" + t.date.day + "日）"),
      h("p", { class: "gb-score" }, stars(t.score), h("b", null, t.level.label), h("span", null, t.level.title)),
      h("p", null, t.text),
      t.kuubou ? h("p", { class: "gb-kuubou" }, "今日はあなたの「" + n.kuubouName + "」の日。四柱推命では、大きな勝負を避けて様子を見るのがよい日とされます。") : null,
      h("dl", { class: "gb-lucky" },
        h("div", null, h("dt", null, "ラッキーナンバー"), h("dd", null, String(t.luckyNumber))),
        h("div", null, h("dt", null, "ラッキーカラー"), h("dd", null, t.luckyColor)),
        h("div", null, h("dt", null, "ラッキーアイテム"), h("dd", null, t.luckyItem)),
        h("div", null, h("dt", null, "ツキのある時間"), h("dd", null, t.luckyTime ? t.luckyTime.hours : "なし（今日はのんびりと）"))),
      h("p", { class: "gb-note" }, "今日の干支：" + t.name + "（あなたから見て" + t.tsuhen + "・" + t.juniun + "）"),
      h("nav", { class: "result-toc", "aria-label": "鑑定結果の目次" }, h("ul", null,
        h("li", null, h("a", { href: "#gb-week" }, "これから7日間")),
        h("li", null, h("a", { href: "#gb-natal" }, "生まれ持ったギャンブル運"))))));

    box.appendChild(h("section", { class: "card gb-block", id: "gb-week", "aria-labelledby": "gb-week-title" },
      h("h2", { id: "gb-week-title" }, "これから7日間のギャンブル運"),
      h("ol", { class: "gb-week" }, v.week.map(function (d, i) {
        return h("li", { class: "gb-day gb-s" + d.score },
          h("b", null, (i === 0 ? "今日 " : "") + d.date.month + "/" + d.date.day + "（" + wd(d.date) + "）"),
          stars(d.score),
          h("span", null, d.level.label + (d.kuubou ? "・天中殺" : "")),
          h("span", { class: "gb-day-color" }, d.luckyColor));
      })),
      h("p", { class: "gb-note" }, "★4以上が、運を味方にしやすい日の目安です。色の名前は、その日のラッキーカラーです。")));

    box.appendChild(h("section", { class: "card gb-block", id: "gb-natal", "aria-labelledby": "gb-natal-title" },
      h("h2", { id: "gb-natal-title" }, "生まれ持ったギャンブル運"),
      h("p", { class: "gb-type" }, n.type.name),
      h("p", null, n.type.text),
      h("ul", { class: "gb-powers" }, n.powers.map(function (p) {
        return h("li", null, h("span", null, p.name), stars(p.level));
      })),
      h("dl", { class: "result-points" },
        h("div", null, h("dt", null, "向いている遊び方"), h("dd", null, n.type.fit)),
        h("div", null, h("dt", null, "気をつけたいこと"), h("dd", null, n.type.care)),
        h("div", null, h("dt", null, "勝負のくせ（数秘術 " + n.lifePath + "）"), h("dd", null, n.lpText)),
        h("div", null, h("dt", null, n.year.year + "年のギャンブル運"), h("dd", null, n.year.tsuhen + "の年。" + n.year.text + (n.year.kuubou ? "（天中殺の年なので、大きな勝負は控えめに）" : ""))),
        h("div", null, h("dt", null, "金運の色・数"), h("dd", null, n.luckyColor + "／" + n.luckyNumber)),
        h("div", null, h("dt", null, "お守りにしたいアイテム"), h("dd", null, n.luckyItems.join("、")))),
      h("div", { class: "gb-stone" },
        h("p", null, "あなたの金運の石：", h("b", null, n.luckyStone.name)),
        h("p", { class: "gb-note" }, "あなたの日干から見て「財」にあたる五行（" + n.wealthElement + "）の石です。勝負の日のお守りに。"),
        h("p", { class: "tk-more" }, h("a", { href: n.luckyStone.url, "data-track": "related_click", "data-target": "stone", "data-position": "result" }, n.luckyStone.name + "の意味と選び方を見る →"))),
      n.hasHensai ? h("p", { class: "gb-tip" }, "命式に「偏財」があります。偏財は、思いがけないお金や臨時収入に縁がある星とされます。") : null,
      h("p", { class: "gb-note" }, "あなたの命式の星：" + n.stars.join("・") + "（日干 " + n.dayMaster.name + "）"),
      h("p", { class: "tk-more" }, h("a", { href: "../shichusuimei/", "data-track": "related_click", "data-target": "shichusuimei", "data-position": "result" }, "四柱推命で命式をくわしく見る →"))));

    box.appendChild(h("p", { class: "notice" }, "ギャンブル運占いは、遊びを楽しむための目安です。勝ちや当選を約束するものではありません。予算と時間を決めて、無理のない範囲で楽しんでください。"));
    box.hidden = false;
    Karute.dom.scrollTo(box);
    var hd = document.getElementById("gb-result-heading");
    if (hd) hd.focus({ preventScroll: true });
  }

  function init() {
    var form = document.getElementById("gamble-form");
    var box = document.getElementById("gamble-result");
    if (!form || !box) return;
    var field = Karute.BirthDateField.mount(form.querySelector("[data-birthdate='self']"), { idPrefix: "self", legend: "あなたの生年月日", useProfile: true });
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var input = field.read();
      if (!input.ok) return;
      field.commit(input.value);
      render(box, root.KaruteContent.gamble.build(input.value, Karute.date.todayInJapan(), E));
    });
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})(typeof self !== "undefined" ? self : this);
