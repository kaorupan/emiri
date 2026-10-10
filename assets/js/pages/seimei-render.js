/*
 * 姓名判断ページの共通部品（個人鑑定・相性で使う）
 *   nameField(container, { idPrefix, legend }) → { read() → {ok, value:{sei,mei}} }
 *     名前は保存しない・送信しない。画数がわからない字は、入力欄の下にその字を示す。
 *   nameStrokes(chars)：字と画数を並べた表示
 *   kakuBadge(k)：数と吉凶のバッジ
 */
(function (root) {
  "use strict";
  var Karute = root.Karute;
  var engine = root.KaruteEngines.seimei;
  var h = Karute.dom.h;

  var MSG = {
    empty: { sei: "姓（名字）を入力してください。", mei: "名（下の名前）を入力してください。" },
    long: { sei: "姓は5文字までで入力してください。", mei: "名は8文字までで入力してください。" }
  };

  function nameField(container, opts) {
    var p = "nm-" + opts.idPrefix;
    var errorId = p + "-error";
    var sei = h("input", { id: p + "-sei", class: "bd-input", type: "text", autocomplete: "off", spellcheck: "false", placeholder: "例：山田", maxlength: "12", "aria-describedby": p + "-hint " + errorId });
    var mei = h("input", { id: p + "-mei", class: "bd-input", type: "text", autocomplete: "off", spellcheck: "false", placeholder: "例：花子", maxlength: "16", "aria-describedby": p + "-hint " + errorId });
    var errorBox = h("p", { id: errorId, class: "bd-error", role: "alert", hidden: true });
    var field = h("fieldset", { class: "bd-field seimei-field" },
      h("legend", { class: "bd-legend" }, opts.legend),
      h("div", { class: "seimei-row" },
        h("div", { class: "bd-cell" }, h("label", { for: p + "-sei" }, "姓（名字）"), sei),
        h("div", { class: "bd-cell" }, h("label", { for: p + "-mei" }, "名（下の名前）"), mei)),
      h("p", { id: p + "-hint", class: "bd-hint" }, "戸籍などで使っている字で、漢字・ひらがな・カタカナを入力してください。"),
      errorBox);
    Karute.dom.clear(container);
    container.appendChild(field);

    function clearErrors() {
      errorBox.hidden = true;
      errorBox.textContent = "";
      sei.removeAttribute("aria-invalid");
      mei.removeAttribute("aria-invalid");
    }
    [sei, mei].forEach(function (el) { el.addEventListener("input", clearErrors); });

    function fail(text, inputs) {
      errorBox.textContent = text;
      errorBox.hidden = false;
      inputs.forEach(function (el) { el.setAttribute("aria-invalid", "true"); });
      inputs[0].focus();
      return { ok: false };
    }

    return {
      read: function () {
        clearErrors();
        var value = { sei: sei.value, mei: mei.value };
        var r = engine.calculateSeimei(value);
        if (r.ok) return { ok: true, value: value, result: r };
        var e = r.errors[0];
        if (e.code === "unknown") {
          return fail("「" + r.unknown.join("」「") + "」の画数がわかりませんでした。漢字・ひらがな・カタカナで入力するか、別の字体（例：旧字体↔新字体）で試してください。", [sei, mei]);
        }
        return fail(MSG[e.code][e.field], [e.field === "sei" ? sei : mei]);
      },
      focus: function () { sei.focus(); }
    };
  }

  function nameStrokes(sei, mei) {
    function cell(x) {
      return h("li", { class: "seimei-char" + (x.kind === "repeat" ? " is-repeat" : "") },
        h("span", { class: "seimei-char-ch" }, x.ch), h("span", { class: "seimei-char-n" }, x.strokes + "画"));
    }
    return h("div", { class: "seimei-name", role: "group", "aria-label": "名前と画数" },
      h("ul", { class: "seimei-name-part" }, sei.map(cell)),
      h("ul", { class: "seimei-name-part" }, mei.map(cell)));
  }

  var LUCK_CLASS = { "大吉": "dai", "吉": "kichi", "半吉": "han", "凶": "kyo" };
  function luckBadge(luck) { return h("span", { class: "seimei-luck seimei-luck-" + LUCK_CLASS[luck] }, luck); }

  root.KaruteSeimeiRender = { nameField: nameField, nameStrokes: nameStrokes, luckBadge: luckBadge, LUCK_CLASS: LUCK_CLASS };
})(typeof self !== "undefined" ? self : this);
