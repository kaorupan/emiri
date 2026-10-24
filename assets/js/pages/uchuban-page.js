/*
 * /uchuban/ 宇宙盤（算命学）
 *   生年月日 → 年・月・日の干支を60干支の円に置き、3点を結んだ形（行動領域）を描いて読む。
 *   お相手の生年月日も入れると、ふたりの形を重ねて相性を読む。入力はサーバーに送らない。
 */
(function (root) {
  "use strict";
  var Karute = root.Karute, h = Karute.dom.h;
  var U = root.KaruteContent.uchuban;
  var E = { shichu: root.KaruteEngines.shichusuimei };
  var NS = "http://www.w3.org/2000/svg";

  function s(tag, attrs, kids) {
    var el = document.createElementNS(NS, tag);
    for (var k in attrs) el.setAttribute(k, attrs[k]);
    (kids || []).forEach(function (c) { if (c) el.appendChild(typeof c === "string" ? document.createTextNode(c) : c); });
    return el;
  }

  // 盤の絵（R：円の半径、中心 160,160）
  function board(charts, title) {
    var C = 160, R = 120, L = R + 22;
    var xy = function (p, r) { return (C + p.x * r).toFixed(1) + "," + (C + p.y * r).toFixed(1); };
    var kids = [s("title", {}, [title])];
    // 4つの区分の色分け
    var fills = ["#2a2140", "#221b36", "#2a2140", "#221b36"];
    for (var q = 0; q < 4; q++) {
      var a0 = U.point(q * 15), a1 = U.point(q * 15 + 15 === 60 ? 0 : q * 15 + 15);
      kids.push(s("path", { d: "M" + C + "," + C + " L" + xy(a0, R) + " A" + R + "," + R + " 0 0 1 " + xy(a1, R) + " Z", fill: fills[q], stroke: "none" }));
    }
    kids.push(s("circle", { cx: C, cy: C, r: R, fill: "none", stroke: "#5a4580", "stroke-width": "1.5" }));
    for (var i = 0; i < 60; i++) {
      var p = U.point(i), big = i % 15 === 0;
      kids.push(s("line", { x1: (C + p.x * (R - (big ? 8 : 4))).toFixed(1), y1: (C + p.y * (R - (big ? 8 : 4))).toFixed(1), x2: (C + p.x * R).toFixed(1), y2: (C + p.y * R).toFixed(1), stroke: big ? "#b79bff" : "#5a4580", "stroke-width": big ? "2" : "1" }));
    }
    [0, 15, 30, 45].forEach(function (i) {
      var p = U.point(i);
      kids.push(s("text", { x: (C + p.x * (R + 12)).toFixed(1), y: (C + p.y * (R + 12) + 4).toFixed(1), "text-anchor": i === 15 ? "start" : i === 45 ? "end" : "middle", fill: "#b79bff", "font-size": "11" }, [U.nameOf(i)]));
    });
    U.AREAS.forEach(function (a, q) {
      var p = U.point(q * 15 + 7.5);
      kids.push(s("text", { x: (C + p.x * R * 0.62).toFixed(1), y: (C + p.y * R * 0.62 + 4).toFixed(1), "text-anchor": "middle", fill: "#8f84a0", "font-size": "11" }, [a.name]));
    });
    var colors = [{ line: "#e7c568", fill: "rgba(231,197,104,.28)" }, { line: "#a27cff", fill: "rgba(162,124,255,.30)" }];
    charts.forEach(function (c, n) {
      var col = colors[n], pts = c.dots.map(function (d) { return xy(d.pos, R); }).join(" ");
      kids.push(s("polygon", { points: pts, fill: col.fill, stroke: col.line, "stroke-width": "2.5", "stroke-linejoin": "round" }));
      c.dots.forEach(function (d) {
        kids.push(s("circle", { cx: (C + d.pos.x * R).toFixed(1), cy: (C + d.pos.y * R).toFixed(1), r: "5", fill: col.line }));
      });
    });
    charts.forEach(function (c, n) {
      c.dots.forEach(function (d, k) {
        var r = L + (charts.length > 1 ? n * 12 : 0) + (k === 1 && c.dots[0].index === d.index ? 12 : 0) + (k === 2 && c.dots[1].index === d.index ? 24 : 0);
        var p = d.pos;
        kids.push(s("text", { x: (C + p.x * r).toFixed(1), y: (C + p.y * r + 4).toFixed(1), "text-anchor": p.x > 0.3 ? "start" : p.x < -0.3 ? "end" : "middle", fill: colors[n].line, "font-size": "13", "font-weight": "700" }, [d.label]));
      });
    });
    return s("svg", { viewBox: "-30 -10 380 340", class: "ub-board", role: "img", "aria-label": title }, kids);
  }

  function personBlock(c, who) {
    return h("div", { class: "ub-person" },
      h("p", { class: "ub-shape" }, who + "の行動領域：", h("b", null, c.size.label), c.shape === "wide" || c.shape === "middle" || c.shape === "narrow" ? h("span", null, "（円の中の正三角形を100としたとき " + c.percent + "）") : null),
      h("p", null, c.size.text),
      c.daisango ? h("p", { class: "ub-tip" }, "3つの点がちょうど正三角形になる、とても珍しい形です（大三合と呼ばれます）。") : null,
      c.center ? h("p", { class: "ub-tip" }, "形が盤の中心をふくんでいます。4つの世界すべてにまたがる、バランスのとれた行動領域です。") : null,
      h("p", { class: "ub-areas-title" }, "形が通る世界（" + c.areas.length + "つ）"),
      h("ul", { class: "ub-areas" }, c.areas.map(function (a) { return h("li", null, h("b", null, a.name), h("span", null, a.text)); })),
      h("p", { class: "ub-note" }, "年 " + c.dots[0].name + "・月 " + c.dots[1].name + "・日 " + c.dots[2].name));
  }

  function render(box, me, other) {
    Karute.dom.clear(box);
    var head = h("section", { class: "card", "aria-labelledby": "ub-result-heading" },
      h("h2", { id: "ub-result-heading", tabindex: "-1" }, other ? "ふたりの宇宙盤と相性" : "あなたの宇宙盤"),
      board(other ? [me, other] : [me], other ? "ふたりの宇宙盤（金色があなた、紫がお相手）" : "あなたの宇宙盤"),
      h("ul", { class: "ub-legend" },
        h("li", null, h("span", { class: "ub-key ub-key-me" }, "あなた"), "年 " + me.dots[0].name + "・月 " + me.dots[1].name + "・日 " + me.dots[2].name),
        other ? h("li", null, h("span", { class: "ub-key ub-key-you" }, "お相手"), "年 " + other.dots[0].name + "・月 " + other.dots[1].name + "・日 " + other.dots[2].name) : null));
    box.appendChild(head);
    if (other) {
      var m = U.compat(me, other);
      box.appendChild(h("section", { class: "card ub-block", "aria-labelledby": "ub-match-title" },
        h("h2", { id: "ub-match-title" }, "ふたりの相性：", m.type.name),
        h("p", null, m.type.text),
        h("dl", { class: "result-points" },
          h("div", null, h("dt", null, "共通の世界"), h("dd", null, m.shared.length ? m.shared.map(function (a) { return a.name; }).join("・") + "（" + m.shared.length + "つ）" : "なし")),
          m.overlapPercent !== null ? h("div", null, h("dt", null, "形の重なり"), h("dd", null, "小さいほうの形の約" + m.overlapPercent + "%が重なっています。" + m.overlapText)) : null)));
    }
    box.appendChild(h("section", { class: "card ub-block", "aria-labelledby": "ub-me-title" },
      h("h2", { id: "ub-me-title" }, "あなたの行動領域"), personBlock(me, "あなた")));
    if (other) box.appendChild(h("section", { class: "card ub-block", "aria-labelledby": "ub-you-title" },
      h("h2", { id: "ub-you-title" }, "お相手の行動領域"), personBlock(other, "お相手")));
    box.appendChild(h("p", { class: "notice" }, "宇宙盤は、生き方や人との距離感を考えるためのひとつの見方です。相性のよし悪しを決めつけるものではありません。"));
    box.setAttribute("data-share", other ? "ふたりの相性は「" + U.compat(me, other).type.name + "」でした" : "わたしの行動領域は「" + me.size.label + "」タイプでした");
    box.hidden = false;
    Karute.dom.scrollTo(box);
    var hd = document.getElementById("ub-result-heading");
    if (hd) hd.focus({ preventScroll: true });
  }

  function init() {
    var form = document.getElementById("uchuban-form");
    var box = document.getElementById("uchuban-result");
    if (!form || !box) return;
    var you = Karute.BirthDateField.mount(form.querySelector("[data-birthdate='self']"), { idPrefix: "self", legend: "あなたの生年月日", useProfile: true });
    var partner = Karute.BirthDateField.mount(form.querySelector("[data-birthdate='partner']"), { idPrefix: "partner", legend: "お相手の生年月日（相性を見るときだけ）", useProfile: false });
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var a = you.read();
      if (!a.ok) return;
      you.commit(a.value);
      var py = document.getElementById("bd-partner-year");
      var other = null;
      if (py && py.value.trim()) {
        var b = partner.read();
        if (!b.ok) return;
        other = U.chart(b.value, E);
      }
      render(box, U.chart(a.value, E), other);
    });
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})(typeof self !== "undefined" ? self : this);
