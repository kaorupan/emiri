/*
 * /tarot/ タロットページの描画と操作
 * 抽選：KaruteEngines.tarot / 文章：KaruteContent.tarot / 保存：Karute.storage / 描画：このファイル
 *
 * 状態：idle（入力）→ picking（伏せたカードを3枚選ぶ）→ result（結果）
 * 同じ日（日本時間）・同じテーマの結果が端末に保存されていれば、選ぶ画面を出さずにその結果を表示する。
 * 質問文は画面表示にだけ使い、保存しない。
 */
(function (root) {
  "use strict";
  var Karute = root.Karute;
  var engine = root.KaruteEngines.tarot;
  var content = root.KaruteContent.tarot;
  var h = Karute.dom.h;

  var STORAGE_KEY = "uranai-karute:tarot";
  var REVEAL_DELAY_MS = 600;

  // localStorageが使えないときは、このページを開いている間だけ覚える
  function memoryStore() {
    var data = null;
    return {
      load: function () { return data ? JSON.parse(JSON.stringify(data)) : null; },
      save: function (v) { data = JSON.parse(JSON.stringify(v)); return true; }
    };
  }

  function todayIso() {
    return Karute.date.toIso(Karute.date.todayInJapan());
  }

  function prefersReducedMotion() {
    return !!(root.matchMedia && root.matchMedia("(prefers-reduced-motion: reduce)").matches);
  }

  function init() {
    var form = document.getElementById("tarot-form");
    if (!form) return;
    var els = {
      form: form,
      submit: form.querySelector("button[type=submit]"),
      question: document.getElementById("tarot-question"),
      today: document.getElementById("tarot-today-status"),
      storageNote: document.getElementById("tarot-storage-note"),
      pick: document.getElementById("tarot-pick"),
      pickStatus: document.getElementById("tarot-pick-status"),
      deck: document.getElementById("tarot-deck"),
      result: document.getElementById("tarot-result"),
      resultBody: document.getElementById("tarot-result-body")
    };

    var persistent = Karute.storage.jsonStore(STORAGE_KEY);
    var canPersist = persistent.isAvailable();
    var store = canPersist ? persistent : memoryStore();
    if (!canPersist) els.storageNote.hidden = false;

    var state = { phase: "idle", theme: null, date: null, deck: null, picks: [], question: "", timer: null };

    function selectedTheme() {
      var checked = form.querySelector("input[name='tarot-theme']:checked");
      return checked ? checked.value : "general";
    }

    function themeLabel(id) {
      var t = content.getTheme(id);
      return t ? t.label : id;
    }

    // 今日すでに占ったテーマの表示と、ボタンの文言
    function refreshTodayStatus() {
      var date = todayIso();
      var done = engine.todaysThemes({ store: store, date: date });
      form.querySelectorAll("input[name='tarot-theme']").forEach(function (input) {
        var mark = input.parentNode.querySelector(".tarot-theme-done");
        if (mark) mark.hidden = done.indexOf(input.value) === -1;
      });
      if (done.length) {
        els.today.textContent = "今日（" + formatDate(date) + "）は「" +
          done.map(themeLabel).join("」「") + "」を占っています。同じテーマは日本時間の0時まで同じ結果を表示します。";
        els.today.hidden = false;
      } else {
        els.today.hidden = true;
      }
      els.submit.textContent = done.indexOf(selectedTheme()) !== -1 ? "今日の結果をもう一度見る" : "カードをシャッフルする";
    }

    function formatDate(iso) {
      var p = iso.split("-");
      return Number(p[1]) + "月" + Number(p[2]) + "日";
    }

    function cancelPicking() {
      if (state.timer) { clearTimeout(state.timer); state.timer = null; }
      state.phase = "idle";
      state.deck = null;
      state.picks = [];
      Karute.dom.clear(els.deck);
      els.pickStatus.textContent = "";
      els.pick.hidden = true;
    }

    // ---- 伏せたカードを選ぶ ----
    var POSITION_ORDER = ["過去", "現在", "未来"];

    function pickPrompt() {
      var n = state.picks.length;
      if (n >= 3) return "3枚そろいました。カードを開きます。";
      return (n + 1) + "枚目（" + POSITION_ORDER[n] + "）のカードを選んでください。";
    }

    function startPicking(theme, date) {
      cancelPicking(); // 前回の選択状態を必ず消す（監査B14）
      state.phase = "picking";
      state.theme = theme;
      state.date = date;
      state.deck = engine.shuffleDeck({ random: Karute.random.secure });
      state.picks = [];

      state.deck.forEach(function (_, index) {
        var button = h("button", {
          type: "button", class: "tarot-back", "aria-pressed": "false",
          "aria-label": "伏せられたカード " + (index + 1) + "枚目（全22枚）",
          "data-index": String(index)
        }, h("span", { "aria-hidden": "true" }, "✦"));
        button.addEventListener("click", function () { choose(index, button); });
        els.deck.appendChild(h("li", null, button));
      });
      els.pickStatus.textContent = pickPrompt();
      els.pick.hidden = false;
      els.result.hidden = true;
      Karute.dom.scrollTo(els.pick);
      var first = els.deck.querySelector("button");
      if (first) first.focus({ preventScroll: true });
    }

    function choose(index, button) {
      if (state.phase !== "picking" || state.picks.length >= 3 || state.picks.indexOf(index) !== -1) return;
      var hadFocus = document.activeElement === button;
      state.picks.push(index);
      var order = state.picks.length;
      button.setAttribute("aria-pressed", "true");
      button.disabled = true;
      button.setAttribute("aria-label", "伏せられたカード " + (index + 1) + "（" + order + "枚目・" + POSITION_ORDER[order - 1] + "として選択済み）");
      button.appendChild(h("span", { class: "tarot-back-order", "aria-hidden": "true" }, POSITION_ORDER[order - 1]));
      els.pickStatus.textContent = pickPrompt();

      if (state.picks.length === 3) {
        els.deck.querySelectorAll("button").forEach(function (b) { b.disabled = true; });
        if (hadFocus) {
          // 選んだボタンが無効になってもフォーカスが迷子にならないよう、案内文へ移す
          els.pickStatus.setAttribute("tabindex", "-1");
          els.pickStatus.focus({ preventScroll: true });
        }
        state.phase = "revealing";
        state.timer = setTimeout(reveal, prefersReducedMotion() ? 0 : REVEAL_DELAY_MS);
      } else {
        // 次に選べるカードへフォーカスを移す（キーボード操作用）
        var next = els.deck.querySelector("button:not(:disabled)");
        if (next && hadFocus) next.focus();
      }
    }

    function reveal() {
      state.timer = null;
      var reading = engine.readingFromDeck(state.theme, state.date, state.deck, state.picks);
      var saved = engine.saveDailyReading({ reading: reading, store: store });
      // 保存の直前に別タブなどで同じテーマを引いていた場合は、先に保存された結果を正とする
      var stored = engine.getDailyReading({ theme: state.theme, date: state.date, store: store });
      cancelPicking();
      var radio = form.querySelector("input[name='tarot-theme'][value='" + reading.theme + "']");
      if (radio) radio.checked = true;
      // メモリ上の保存（localStorageが使えない環境）は「保存できた」とは扱わない
      showResult(stored || reading, { reused: false, saved: saved && canPersist });
    }

    // ---- 結果 ----
    function section(id, eyebrow, title, children) {
      return h("section", { class: "card tarot-block", id: id, "aria-labelledby": id + "-title" },
        h("p", { class: "eyebrow" }, eyebrow),
        h("h2", { id: id + "-title" }, title),
        children);
    }

    function cardTile(item) {
      var c = item.card;
      var art = c.image
        ? h("div", { class: "tarot-art" }, h("img", { src: c.image, alt: c.name + "（" + c.nameEn + "）", loading: "lazy" }))
        : h("div", { class: "tarot-art", "aria-hidden": "true" },
          h("span", { class: "tarot-art-num" }, c.numeral),
          h("span", { class: "tarot-art-en" }, c.nameEn),
          h("span", { class: "tarot-art-ja" }, c.name));
      return h("li", null, h("article", { class: "tarot-card" + (item.orientation === "reversed" ? " is-reversed" : "") },
        h("p", { class: "tarot-pos" }, item.positionLabel),
        art,
        h("h3", null, c.numeral + " " + c.name),
        h("p", { class: "tarot-orient" }, item.orientationLabel),
        h("p", { class: "tarot-keywords" }, item.keywords.join("・")),
        h("p", { class: "tarot-meaning" }, item.meaning),
        item.aspect ? h("p", { class: "tarot-aspect" }, "逆位置の表れ方：" + item.aspect.name + "（" + item.aspect.text + "）") : null
      ));
    }

    function renderResult(view, info) {
      var body = els.resultBody;
      Karute.dom.clear(body);
      body.appendChild(h("h2", { class: "visually-hidden", tabindex: "-1", id: "tarot-result-heading" }, "タロットの鑑定結果"));

      // 1. 今回のテーマ
      body.appendChild(section("tarot-theme-result", "THEME", "今回のテーマ", [
        h("p", { class: "tarot-theme-title" }, view.theme.label),
        h("p", { class: "tarot-meta" }, view.dateLabel + "（日本時間）の結果"),
        info.reused ? h("p", { class: "tarot-status" }, "今日の「" + view.theme.label + "」はすでに占っています。同じテーマの結果は1日1回、日本時間の0時に切り替わります。") : null,
        !info.reused && !info.saved ? h("p", { class: "tarot-notice" }, "この端末では結果を保存できないため、ページを開き直すと同じテーマでも別のカードになります。") : null
      ]));

      // 2. 質問文（入力があるときだけ。textContentで表示）
      if (view.question) {
        body.appendChild(section("tarot-question-result", "QUESTION", "今回の相談内容", [
          h("p", { class: "tarot-quote" }, view.question)
        ]));
      }

      // 3. 3枚のカード
      body.appendChild(section("tarot-cards", "THREE CARD SPREAD", "あなたが引いた3枚", [
        h("ol", { class: "tarot-spread" }, view.cards.map(cardTile))
      ]));

      // 4〜6. 過去・現在・未来
      view.cards.forEach(function (item) {
        body.appendChild(section("tarot-" + item.position, item.position.toUpperCase(), item.reading.title, [
          h("p", { class: "tarot-reading-lead" }, item.reading.lead),
          h("p", null, item.reading.text),
          item.reading.note ? h("p", { class: "tarot-note" }, item.reading.note) : null
        ]));
      });

      // 7. 総合メッセージ
      body.appendChild(section("tarot-message", "MESSAGE", "3枚からのメッセージ", [
        h("p", { class: "tarot-headline" }, view.headline),
        view.message.map(function (p) { return h("p", null, p); })
      ]));

      // 8. 気をつけたいこと
      body.appendChild(section("tarot-caution", "CAUTION", "気をつけたいこと", [
        h("ul", { class: "tarot-list" }, view.cautions.map(function (x) { return h("li", null, x); }))
      ]));

      // 9. 次にできること
      var otherTheme = h("button", { type: "button", class: "tarot-action" }, "別のテーマで占う");
      otherTheme.addEventListener("click", function () {
        var target = form.querySelector("input[name='tarot-theme']:not(:checked)") || form.querySelector("input[name='tarot-theme']");
        Karute.dom.scrollTo(form);
        if (target) target.focus({ preventScroll: true });
      });

      var done = engine.todaysThemes({ store: store, date: view.date });
      var todayButtons = done.map(function (id) {
        var b = h("button", { type: "button", "aria-current": id === view.theme.id ? "true" : null }, "今日の「" + themeLabel(id) + "」");
        b.addEventListener("click", function () {
          var reading = engine.getDailyReading({ theme: id, date: view.date, store: store });
          if (!reading) return;
          var radio = form.querySelector("input[name='tarot-theme'][value='" + id + "']");
          if (radio) radio.checked = true;
          showResult(reading, { reused: true, saved: true });
        });
        return b;
      });

      body.appendChild(section("tarot-next", "NEXT", "次にできること", [
        h("ul", { class: "link-list" },
          h("li", null, otherTheme),
          h("li", null, h("a", { href: "../suhijutsu/" }, "生年月日から数秘術でも見る ", h("span", { class: "arrow", "aria-hidden": "true" }, "→"))),
          h("li", null, h("a", { href: "../learn/tarot/" }, "タロットについて知る ", h("span", { class: "arrow", "aria-hidden": "true" }, "→")))
        ),
        todayButtons.length ? h("p", { class: "tarot-meta" }, "今日占った結果をもう一度見る") : null,
        todayButtons.length ? h("p", { class: "tarot-today" }, todayButtons) : null,
        h("p", { class: "tarot-note" }, "同じテーマの結果は1日1回です。日本時間の0時を過ぎると、新しく引けます。")
      ]));
    }

    function showResult(reading, info) {
      var view = content.buildTarotView(reading, { question: state.question });
      state.phase = "result";
      renderResult(view, info);
      els.result.hidden = false;
      refreshTodayStatus();
      Karute.dom.scrollTo(els.result);
      var heading = document.getElementById("tarot-result-heading");
      if (heading) heading.focus({ preventScroll: true });
    }

    // ---- 入力 ----
    form.addEventListener("submit", function (event) {
      event.preventDefault();
      var theme = selectedTheme();
      if (!content.getTheme(theme)) theme = "general";
      state.question = els.question.value; // 表示にだけ使う。保存しない
      var date = todayIso();
      var existing = engine.getDailyReading({ theme: theme, date: date, store: store });
      if (existing) {
        cancelPicking();
        showResult(existing, { reused: true, saved: true });
      } else {
        els.result.hidden = true;
        startPicking(theme, date);
      }
    });

    // テーマを変えたら、選びかけのカードは破棄する
    form.addEventListener("change", function (event) {
      if (event.target && event.target.name === "tarot-theme") {
        if (state.phase === "picking") cancelPicking();
        refreshTodayStatus();
      }
    });

    refreshTodayStatus();
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})(typeof self !== "undefined" ? self : this);
