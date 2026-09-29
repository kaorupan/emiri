/*
 * 九星気学ページの描画部品（個人鑑定・相性で共通）
 *   - 出生時刻（任意）の入力欄
 *   - 九星のしるし（番号の漢数字＋五行の色）、九星と五行の一覧、五行の巡り
 *   - 節入りの説明・境界のお知らせ
 * 文字はすべて textContent（Karute.dom.h）で入れる。
 */
(function (root) {
  "use strict";
  var Karute = root.Karute;
  var data = root.KaruteContent.kyuseiData;
  var h = Karute.dom.h;

  var KANJI = ["", "一", "二", "三", "四", "五", "六", "七", "八", "九"];
  var ELEMENT_ORDER = ["木", "火", "土", "金", "水"];

  /*
   * 出生時刻（任意）の入力欄
   * read() → { ok:true, value:null | "HH:MM" } / { ok:false }（エラーは入力欄の下に表示）
   * 時刻は保存しない。
   */
  function timeField(container, opts) {
    var p = "kt-" + opts.idPrefix;
    var errorId = p + "-error";
    function options(from, to, unit, pad) {
      var list = [h("option", { value: "" }, "未入力")];
      for (var i = from; i <= to; i++) list.push(h("option", { value: String(i) }, (pad && i < 10 ? "0" + i : String(i)) + unit));
      return list;
    }
    var hour = h("select", { id: p + "-hour", class: "bd-input", "aria-describedby": p + "-hint " + errorId }, options(0, 23, "時", false));
    var minute = h("select", { id: p + "-minute", class: "bd-input", "aria-describedby": p + "-hint " + errorId }, options(0, 59, "分", true));
    var errorBox = h("p", { id: errorId, class: "bd-error", role: "alert", hidden: true });
    var body = h("div", { class: "kyusei-time-body" },
      h("div", { class: "kyusei-time-row" },
        h("div", { class: "bd-cell" }, h("label", { for: p + "-hour" }, "時"), hour),
        h("div", { class: "bd-cell" }, h("label", { for: p + "-minute" }, "分"), minute)),
      h("p", { id: p + "-hint", class: "bd-hint" }, opts.hint),
      errorBox);
    var root;
    var details = null;
    if (opts.collapsible) {
      details = h("details", { class: "kyusei-time", id: p }, h("summary", null, opts.legend), body);
      root = details;
    } else {
      root = h("fieldset", { class: "bd-field kyusei-time", id: p }, h("legend", { class: "bd-legend" }, opts.legend), body);
    }
    Karute.dom.clear(container);
    container.appendChild(root);

    function clearErrors() {
      errorBox.hidden = true;
      errorBox.textContent = "";
      hour.removeAttribute("aria-invalid");
      minute.removeAttribute("aria-invalid");
    }
    [hour, minute].forEach(function (el) { el.addEventListener("change", clearErrors); });

    return {
      read: function () {
        clearErrors();
        if (hour.value === "" && minute.value === "") return { ok: true, value: null };
        var missing = hour.value === "" ? hour : minute.value === "" ? minute : null;
        if (missing) {
          missing.setAttribute("aria-invalid", "true");
          errorBox.textContent = "生まれた時刻は「時」と「分」の両方を選んでください。分からない場合は、両方とも「未入力」のままにしてください。";
          errorBox.hidden = false;
          if (details) details.open = true;
          missing.focus();
          return { ok: false };
        }
        var mm = Number(minute.value);
        return { ok: true, value: hour.value + ":" + (mm < 10 ? "0" + mm : String(mm)) };
      },
      focus: function () {
        if (details) details.open = true;
        hour.focus();
      },
      element: root
    };
  }

  // 九星のしるし（例：丸の中に「三」、色は五行）
  function starMark(star, small) {
    return h("span", { class: "kyusei-mark" + (small ? " kyusei-mark-sm" : ""), "data-element": star.element, "aria-hidden": "true" }, KANJI[star.number]);
  }

  // 「本命星 三碧木星 ／ 五行 木」のように星名と五行を並べて見せる
  function starBlock(role, star, extra) {
    return h("div", { class: "kyusei-star", "data-element": star.element },
      starMark(star),
      h("dl", { class: "kyusei-star-body" },
        h("div", null, h("dt", null, role), h("dd", { class: "kyusei-star-name" }, star.name)),
        h("div", null, h("dt", null, "五行"), h("dd", { class: "kyusei-star-element" }, star.element)),
        extra || null));
  }

  // 九星の一覧（本命星・月命星に印）
  function nineStars(honmei, getsumei) {
    var items = [];
    for (var n = 1; n <= 9; n++) {
      var s = data.STARS[n];
      var marks = [];
      if (n === honmei) marks.push("本命");
      if (n === getsumei) marks.push("月命");
      items.push(h("li", { class: "kyusei-nine-item" + (marks.length ? " is-mine" : ""), "data-element": s.element },
        starMark(s, true),
        h("span", { class: "kyusei-nine-name" }, s.name),
        h("span", { class: "kyusei-nine-el" }, "五行 " + s.element),
        marks.length ? h("span", { class: "kyusei-nine-tag" }, marks.join("・")) : null));
    }
    return h("ul", { class: "kyusei-nine", "aria-label": "九星と五行の一覧" }, items);
  }

  // 五行の巡り（相生の順）に、ふたつの星の五行を示す
  function elementCycle(marks) {
    return h("div", { class: "kyusei-cycle" },
      h("ol", { class: "kyusei-cycle-list", "aria-label": "五行の相生の順（木→火→土→金→水→木）" },
        ELEMENT_ORDER.map(function (e) {
          var tags = marks.filter(function (m) { return m.element === e; }).map(function (m) { return m.label; });
          return h("li", { class: "kyusei-cycle-item" + (tags.length ? " is-mine" : ""), "data-element": e },
            h("span", { class: "kyusei-cycle-el" }, e),
            tags.length ? h("span", { class: "kyusei-cycle-tag" }, tags.join("・")) : null);
        })),
      h("p", { class: "kyusei-meta" }, "相生：木→火→土→金→水→木（となりへ力を渡す）／ 相剋：木→土→水→火→金→木（ひとつ飛ばしで抑える）"));
  }

  function traits(pairs) {
    return h("dl", { class: "kyusei-traits" }, pairs.map(function (p) {
      return h("div", { class: "kyusei-trait" }, h("dt", null, p[0]), h("dd", null, p[1]));
    }));
  }

  function section(id, eyebrow, title, children, extraClass) {
    return h("section", { class: "card kyusei-block" + (extraClass ? " " + extraClass : ""), id: id, "aria-labelledby": id + "-title" },
      eyebrow ? h("p", { class: "eyebrow" }, eyebrow) : null,
      h("h2", { id: id + "-title" }, title),
      children);
  }

  // 伝統的な説明と、サイト独自の読み解きを見分けられるようにするラベル付きの段落
  function tradition(text) {
    return h("div", { class: "kyusei-tradition" }, h("p", { class: "kyusei-source" }, "九星気学での位置づけ"), h("p", null, text));
  }

  // 境界（節入り）のお知らせ。onUseTime があれば「時刻を入力する」ボタンを出す
  function boundaryNotice(b, onUseTime) {
    if (!b) return null;
    return h("div", { class: "kyusei-boundary kyusei-boundary-" + b.level, role: b.level === "warn" ? "note" : null },
      h("p", { class: "kyusei-boundary-title" }, b.title),
      h("p", null, b.text),
      b.alt ? h("p", { class: "kyusei-boundary-alt" }, b.alt) : null,
      b.canUseTime && onUseTime ? h("p", null, h("button", { type: "button", class: "btn btn-ghost kyusei-use-time", onclick: onUseTime }, "生まれた時刻を入力して確かめる")) : null);
  }

  root.KaruteKyuseiRender = {
    timeField: timeField,
    starMark: starMark,
    starBlock: starBlock,
    nineStars: nineStars,
    elementCycle: elementCycle,
    traits: traits,
    section: section,
    tradition: tradition,
    boundaryNotice: boundaryNotice
  };
})(typeof self !== "undefined" ? self : this);
