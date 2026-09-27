/*
 * 生年月日入力の共通部品
 *
 * 使い方：
 *   var field = Karute.BirthDateField.mount(document.querySelector("[data-birthdate='self']"), {
 *     idPrefix: "self", legend: "あなたの生年月日", useProfile: true
 *   });
 *   var result = field.read();   // Karute.date.validateBirthDate の結果。エラーなら入力欄の下に表示済み
 *   if (result.ok) field.commit(result.value);  // 保存を選んでいれば端末に保存
 *
 * idPrefix はページ内で一意にする（例："self", "partner"）。汎用ID（"year" など）は作らない。
 */
(function (root) {
  "use strict";
  var Karute = root.Karute = root.Karute || {};
  var h = Karute.dom.h;

  function options(from, to, unit) {
    var list = [h("option", { value: "" }, "--")];
    for (var i = from; i <= to; i++) list.push(h("option", { value: String(i) }, i + unit));
    return list;
  }

  function mount(container, opts) {
    opts = opts || {};
    var p = "bd-" + (opts.idPrefix || "self");
    var errorId = p + "-error";

    var yearInput = h("input", {
      id: p + "-year", class: "bd-input", type: "text", inputmode: "numeric",
      autocomplete: opts.useProfile ? "bday-year" : "off", placeholder: "例 1992",
      "aria-describedby": p + "-hint " + errorId
    });
    var monthSelect = h("select", { id: p + "-month", class: "bd-input", "aria-describedby": errorId }, options(1, 12, "月"));
    var daySelect = h("select", { id: p + "-day", class: "bd-input", "aria-describedby": errorId }, options(1, 31, "日"));
    var errorBox = h("p", { id: errorId, class: "bd-error", role: "alert", hidden: true });

    var clearButton = h("button", { type: "button", class: "link-button" }, "入力を消す");

    var fieldset = h("fieldset", { class: "bd-field" },
      h("legend", { class: "bd-legend" }, opts.legend || "生年月日"),
      h("div", { class: "bd-row" },
        h("div", { class: "bd-cell bd-cell-year" },
          h("label", { for: p + "-year" }, "年（西暦4桁）"), yearInput),
        h("div", { class: "bd-cell" }, h("label", { for: p + "-month" }, "月"), monthSelect),
        h("div", { class: "bd-cell" }, h("label", { for: p + "-day" }, "日"), daySelect)
      ),
      h("p", { id: p + "-hint", class: "bd-hint" }, "西暦0001〜9999年まで入力できます。"),
      errorBox,
      h("div", { class: "bd-tools" }, clearButton)
    );

    Karute.dom.clear(container);
    container.appendChild(fieldset);

    // ---- 端末内保存（自分の生年月日だけ。お相手には付けない） ----
    var profileUi = null;
    if (opts.useProfile && Karute.profile && Karute.profile.isAvailable()) {
      profileUi = buildProfileUi(p);
      container.appendChild(profileUi.root);
    }

    function setValue(date) {
      yearInput.value = date ? Karute.date.pad(date.year, 4) : "";
      monthSelect.value = date ? String(date.month) : "";
      daySelect.value = date ? String(date.day) : "";
    }

    function clearErrors() {
      errorBox.hidden = true;
      errorBox.textContent = "";
      [yearInput, monthSelect, daySelect].forEach(function (el) { el.removeAttribute("aria-invalid"); });
    }

    function showErrors(result) {
      var map = { year: yearInput, month: monthSelect, day: daySelect };
      var messages = [];
      Object.keys(result.errors).forEach(function (key) {
        map[key].setAttribute("aria-invalid", "true");
        messages.push(result.errors[key]);
      });
      errorBox.textContent = messages.join(" ");
      errorBox.hidden = false;
      var first = map[Object.keys(result.errors)[0]];
      if (first) first.focus();
    }

    function read() {
      clearErrors();
      var result = Karute.date.validateBirthDate({
        year: yearInput.value, month: monthSelect.value, day: daySelect.value
      });
      if (!result.ok) showErrors(result);
      return result;
    }

    [yearInput, monthSelect, daySelect].forEach(function (el) {
      el.addEventListener("input", function () {
        if (!errorBox.hidden) clearErrors();
      });
    });

    clearButton.addEventListener("click", function () {
      setValue(null);
      clearErrors();
      yearInput.focus();
    });

    // 保存済みの生年月日があれば入力しておく
    if (profileUi) {
      var saved = Karute.profile.load();
      if (saved) {
        setValue(saved.birthDate);
        profileUi.showSaved(saved.birthDate);
      }
      profileUi.onClear(function () { setValue(null); });
    }

    return {
      read: read,
      setValue: setValue,
      commit: function (date) {
        if (profileUi) profileUi.commit(date);
      },
      focus: function () { yearInput.focus(); }
    };
  }

  function buildProfileUi(p) {
    var checkbox = h("input", { id: p + "-save", type: "checkbox" });
    var savedText = h("span", { class: "profile-saved-text" });
    var forgetButton = h("button", { type: "button", class: "link-button" }, "保存した生年月日を消す");
    var savedRow = h("p", { class: "profile-saved", hidden: true }, savedText, " ", forgetButton);
    var status = h("p", { class: "profile-status", role: "status" });
    var clearHandlers = [];

    var root = h("div", { class: "profile-box" },
      h("label", { class: "profile-check", for: p + "-save" }, checkbox, h("span", null, "この端末に生年月日を保存する")),
      h("p", { class: "profile-note" },
        "保存すると、次回からこのサイトの占いで生年月日が最初から入った状態になります。保存するのは生年月日だけで、この端末のブラウザの中にだけ残ります（サーバーには送りません）。"),
      savedRow,
      status
    );

    function showSaved(date) {
      checkbox.checked = true;
      savedText.textContent = "保存中：" + Karute.date.formatJa(date);
      savedRow.hidden = false;
    }

    function forget(message) {
      Karute.profile.clear();
      checkbox.checked = false;
      savedRow.hidden = true;
      status.textContent = message;
    }

    // チェックを外したら、その場で保存を取り消す
    checkbox.addEventListener("change", function () {
      if (checkbox.checked) {
        status.textContent = "占うボタンを押すと、この端末に保存します。";
      } else if (!savedRow.hidden) {
        forget("保存した生年月日を消しました。");
      } else {
        status.textContent = "";
      }
    });

    forgetButton.addEventListener("click", function () {
      forget("保存した生年月日を消しました。");
      clearHandlers.forEach(function (fn) { fn(); });
    });

    return {
      root: root,
      showSaved: showSaved,
      onClear: function (fn) { clearHandlers.push(fn); },
      commit: function (date) {
        if (!checkbox.checked) return;
        if (Karute.profile.saveBirthDate(date)) {
          showSaved(date);
          status.textContent = "この端末に生年月日を保存しました。";
        } else {
          checkbox.checked = false;
          status.textContent = "この端末では保存できませんでした。";
        }
      }
    };
  }

  Karute.BirthDateField = { mount: mount };
})(typeof self !== "undefined" ? self : this);
