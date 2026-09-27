/*
 * タロットエンジン（抽選と「1日1回」の判定のみ・DOM操作なし）
 *
 * - 大アルカナ22枚（カードID 0〜21）。カード名や意味は content/tarot-deck.js が持つ。
 * - 3枚引き：1枚目＝過去、2枚目＝現在、3枚目＝未来。
 * - シャッフルは Fisher–Yates。乱数源（0以上1未満を返す関数）は外から渡せる（テスト用）。
 * - 「同じ端末・同じ日・同じテーマは同じ結果」：保存先（store）も外から渡す。
 *   store は { load(): object|null, save(object): boolean } を満たせばよい。
 *
 * ブラウザでは window.KaruteEngines.tarot、Node では module.exports で使える。
 */
(function (root, factory) {
  var api = factory();
  if (typeof module === "object" && module.exports) {
    module.exports = api;
  } else {
    root.KaruteEngines = root.KaruteEngines || {};
    root.KaruteEngines.tarot = api;
  }
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";

  var CARD_COUNT = 22;
  var POSITIONS = ["past", "present", "future"];
  var ORIENTATIONS = ["upright", "reversed"];

  // 逆位置が出る確率。旧版（tarot-v1）の35%を維持する。
  // 50%にすると3枚中1.5枚が逆位置になり、全体の読みが「見直し」に偏りやすいため、
  // 旧版の体験を変えない値を採用している。
  var REVERSED_PROBABILITY = 0.35;

  var RECORD_VERSION = 1;
  var DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
  var THEME_PATTERN = /^[a-z][a-z0-9-]{0,31}$/;

  function allCardIds() {
    var ids = [];
    for (var i = 0; i < CARD_COUNT; i++) ids.push(i);
    return ids;
  }

  function nextIndex(random, upperExclusive) {
    var r = random();
    if (typeof r !== "number" || !(r >= 0) || r >= 1) r = 0; // 不正な乱数源でも範囲外にしない
    return Math.floor(r * upperExclusive);
  }

  // Fisher–Yates シャッフル（元の配列は変更しない）
  function shuffle(items, random) {
    var a = items.slice();
    for (var i = a.length - 1; i > 0; i--) {
      var j = nextIndex(random, i + 1);
      var tmp = a[i]; a[i] = a[j]; a[j] = tmp;
    }
    return a;
  }

  function orientationFor(random) {
    var r = random();
    return typeof r === "number" && r < REVERSED_PROBABILITY ? "reversed" : "upright";
  }

  function requireRandom(random) {
    if (typeof random !== "function") throw new TypeError("random must be a function returning [0,1)");
    return random;
  }

  /**
   * 伏せたカードの山を作る。各カードの向きもこの時点で決まる（選んだ後に変わらない）。
   * @returns {Array<{cardId:number, orientation:"upright"|"reversed"}>}
   */
  function shuffleDeck(options) {
    var random = requireRandom(options && options.random);
    var ids = (options && options.cardIds) || allCardIds();
    return shuffle(ids, random).map(function (id) {
      return { cardId: id, orientation: orientationFor(random) };
    });
  }

  function checkThemeAndDate(theme, date) {
    if (typeof theme !== "string" || !THEME_PATTERN.test(theme)) throw new TypeError("invalid theme");
    if (typeof date !== "string" || !DATE_PATTERN.test(date)) throw new TypeError("date must be YYYY-MM-DD");
  }

  /**
   * 山から選んだ3枚で結果を作る。picks は山の中の位置（重複不可）。選んだ順に 過去→現在→未来。
   */
  function readingFromDeck(theme, date, deck, picks) {
    checkThemeAndDate(theme, date);
    picks = picks || [0, 1, 2];
    if (!Array.isArray(picks) || picks.length !== POSITIONS.length) throw new RangeError("pick exactly 3 cards");
    var seen = {};
    var cards = picks.map(function (index, i) {
      if (typeof index !== "number" || index < 0 || index >= deck.length || Math.floor(index) !== index) throw new RangeError("invalid pick");
      if (seen[index]) throw new RangeError("the same card was picked twice");
      seen[index] = true;
      return { position: POSITIONS[i], cardId: deck[index].cardId, orientation: deck[index].orientation };
    });
    return { spread: "three-card", theme: theme, date: date, cards: cards };
  }

  /**
   * 画面なしで3枚引く（総合占い・今日の運勢などから再利用する入口）
   * drawTarot({ theme: "love", date: "2026-09-27", random: Math.random })
   */
  function drawTarot(options) {
    options = options || {};
    var deck = shuffleDeck({ random: options.random, cardIds: options.cardIds });
    return readingFromDeck(options.theme, options.date, deck, options.picks);
  }

  function isValidCards(cards) {
    if (!Array.isArray(cards) || cards.length !== POSITIONS.length) return false;
    var seen = {};
    for (var i = 0; i < cards.length; i++) {
      var c = cards[i];
      if (!c || c.position !== POSITIONS[i]) return false;
      if (typeof c.cardId !== "number" || Math.floor(c.cardId) !== c.cardId || c.cardId < 0 || c.cardId >= CARD_COUNT) return false;
      if (ORIENTATIONS.indexOf(c.orientation) === -1) return false;
      if (seen[c.cardId]) return false;
      seen[c.cardId] = true;
    }
    return true;
  }

  // ---- 1日1回（同じ日・同じテーマは同じ結果） ----
  // 保存形式（最低限のみ。質問文などの自由入力は保存しない）:
  // { version: 1, date: "2026-09-27", readings: { love: { cards: [{position, cardId, orientation} x3] } } }
  // 日付が変わった記録は読み込み時に無視し、次の保存で上書きされる（前日以前の結果は残さない）。

  function loadRecord(store, date) {
    if (!store || typeof store.load !== "function") return null;
    var data;
    try { data = store.load(); } catch (e) { return null; }
    if (!data || data.version !== RECORD_VERSION || data.date !== date || !data.readings || typeof data.readings !== "object") return null;
    return data;
  }

  /**
   * 今日すでにそのテーマで引いた結果があれば返す。なければ null。
   */
  function getDailyReading(options) {
    checkThemeAndDate(options.theme, options.date);
    var record = loadRecord(options.store, options.date);
    if (!record) return null;
    var saved = record.readings[options.theme];
    if (!saved || !isValidCards(saved.cards)) return null;
    return {
      spread: "three-card",
      theme: options.theme,
      date: options.date,
      cards: saved.cards.map(function (c) { return { position: c.position, cardId: c.cardId, orientation: c.orientation }; })
    };
  }

  /**
   * 結果を保存する。保存できたら true。
   * 同じ日・同じテーマの結果がすでにあれば上書きしない（先に引いた結果を正とする）。
   */
  function saveDailyReading(options) {
    var reading = options.reading;
    checkThemeAndDate(reading.theme, reading.date);
    if (!isValidCards(reading.cards)) throw new TypeError("invalid reading");
    var store = options.store;
    if (!store || typeof store.save !== "function") return false;

    var record = loadRecord(store, reading.date) || { version: RECORD_VERSION, date: reading.date, readings: {} };
    var clean = { version: RECORD_VERSION, date: reading.date, readings: {} };
    Object.keys(record.readings).forEach(function (theme) {
      var r = record.readings[theme];
      if (THEME_PATTERN.test(theme) && r && isValidCards(r.cards)) clean.readings[theme] = { cards: r.cards };
    });
    if (clean.readings[reading.theme]) return true;
    clean.readings[reading.theme] = {
      cards: reading.cards.map(function (c) { return { position: c.position, cardId: c.cardId, orientation: c.orientation }; })
    };
    try { return store.save(clean) === true; } catch (e) { return false; }
  }

  /** 今日すでに占ったテーマの一覧 */
  function todaysThemes(options) {
    var record = loadRecord(options.store, options.date);
    if (!record) return [];
    return Object.keys(record.readings).filter(function (t) {
      return THEME_PATTERN.test(t) && record.readings[t] && isValidCards(record.readings[t].cards);
    });
  }

  return {
    CARD_COUNT: CARD_COUNT,
    POSITIONS: POSITIONS,
    REVERSED_PROBABILITY: REVERSED_PROBABILITY,
    allCardIds: allCardIds,
    shuffle: shuffle,
    shuffleDeck: shuffleDeck,
    readingFromDeck: readingFromDeck,
    drawTarot: drawTarot,
    isValidCards: isValidCards,
    getDailyReading: getDailyReading,
    saveDailyReading: saveDailyReading,
    todaysThemes: todaysThemes
  };
});
