/*
 * タロットの鑑定文の組み立て（DOM操作なし）
 * 抽選結果（engines/tarot.js）＋カードデータ（tarot-deck.js）＋テーマ別の読み（tarot-readings.js）
 * → 画面に出す表示用データ。
 * 生成AIや外部APIは使わず、用意した文章パーツを「過去→現在」「現在→未来」の流れで組み合わせる。
 */
(function (root, factory) {
  var deck, readings;
  if (typeof module === "object" && module.exports) {
    deck = require("./tarot-deck.js");
    readings = require("./tarot-readings.js");
    module.exports = factory(deck, readings);
  } else {
    root.KaruteContent = root.KaruteContent || {};
    root.KaruteContent.tarot = factory(root.KaruteContent.tarotDeck, root.KaruteContent.tarotReadings);
  }
})(typeof self !== "undefined" ? self : this, function (deck, readings) {
  "use strict";

  // テーマ。旧版の「これからの未来」「その他・自由相談」は「総合」にまとめた。
  // 追加するときは、ここに1件足し、tarot-readings.js の全カードに同じキーの文章を足す。
  var THEMES = [
    { id: "general", label: "総合", description: "いまの自分と全体の流れ",
      closing: {
        light: "全体としては、未来のカードが示す方向へ素直に進んでよい流れです。今日できる小さな一歩をひとつ決めてみましょう。",
        shadow: "全体としては、進む前に整えておきたいことがある流れです。未来のカードは確定ではなく、今の選び方で変えられます。"
      },
      caution: "カードの結果を理由に、大事な決断を急がないこと。判断材料のひとつとして使いましょう。" },
    { id: "love", label: "恋愛", description: "気になる人・恋人・これからの出会い",
      closing: {
        light: "恋愛では、この流れを信じて気持ちを素直に伝えていくことが、未来のカードを生かす鍵になります。",
        shadow: "恋愛では、答えを急ぐより二人のペースを確かめ直すことで、未来のカードの意味が変わっていきます。"
      },
      caution: "相手の気持ちをカードだけで決めつけず、分からないことは本人と確かめ合うこと。" },
    { id: "work", label: "仕事", description: "仕事の進め方・職場・キャリア",
      closing: {
        light: "仕事では、今の方向性を保ちながら、成果につながる行動をひとつずつ積み重ねていきましょう。",
        shadow: "仕事では、進め方や優先順位を一度見直すことで、未来のカードが示す滞りを避けやすくなります。"
      },
      caution: "結果を急ぐあまり、確認や相談を省かないこと。" },
    { id: "relationships", label: "人間関係", description: "友人・家族・職場の人との関係",
      closing: {
        light: "人間関係では、今の自然な関わり方を大切にすると、つながりがさらに育っていきます。",
        shadow: "人間関係では、相手との距離感や伝え方を少し調整するだけで、流れが変わりやすいでしょう。"
      },
      caution: "相手を変えようとするより、自分の関わり方から整えること。" },
    { id: "money", label: "お金", description: "使い方・貯め方・収入",
      closing: {
        light: "お金の面では、今の使い方・貯め方の方向で大丈夫です。目的をはっきりさせるとさらに安定します。",
        shadow: "お金の面では、収支を一度書き出して見直すことが、未来のカードを良い方向に変える近道です。"
      },
      caution: "大きな出費や契約は、カードの結果だけで決めず、数字と条件を確かめてから。" }
  ];

  var POSITION_INFO = {
    past: { label: "過去", title: "今につながる背景", lead: "過去の位置に" },
    present: { label: "現在", title: "いま中心にあること", lead: "現在の位置に" },
    future: { label: "未来", title: "このまま進んだ先にある可能性", lead: "未来の位置に" }
  };

  var ORIENTATION_LABEL = { upright: "正位置", reversed: "逆位置" };

  // 逆位置の表れ方ごとの「このまま進むとどうなりやすいか」
  var ASPECT_TENDENCY = {
    "停滞": "流れが止まりやすくなる",
    "内向化": "気持ちや力が内側にこもりやすくなる",
    "過剰": "カードの力が強く出すぎやすくなる",
    "不足": "カードの力を出し切れなくなりやすい",
    "見直し": "これまでのやり方を見直す時期が来る"
  };

  function getTheme(id) {
    for (var i = 0; i < THEMES.length; i++) if (THEMES[i].id === id) return THEMES[i];
    return null;
  }

  function keyword(c, orientation) {
    return orientation === "reversed" ? c.reversedKeywords[0] : c.keywords[0];
  }

  function tone(c, orientation) {
    return c.tone[orientation];
  }

  // 過去 → 現在 の流れ（カードの明暗で文を選ぶ）
  function pastToPresent(a, aOri, b, bOri) {
    var ka = keyword(a, aOri), kb = keyword(b, bOri);
    var ta = tone(a, aOri), tb = tone(b, bOri);
    if (ta === "light" && tb === "light") return "過去の「" + ka + "」が土台となり、いまは「" + kb + "」として形になりつつあります。";
    if (ta === "shadow" && tb === "light") return "過去の「" + ka + "」の時期を経て、いまは「" + kb + "」へと流れが動き出しています。";
    if (ta === "light" && tb === "shadow") return "過去の「" + ka + "」の流れが、いまは「" + kb + "」という課題に向き合う段階に入っています。";
    return "過去からの「" + ka + "」が、いまも「" + kb + "」として続いている状態です。";
  }

  // 現在 → 未来 の流れ
  function presentToFuture(b, bOri, c, cOri) {
    var kb = keyword(b, bOri), kc = keyword(c, cOri);
    var tb = tone(b, bOri), tc = tone(c, cOri);
    if (tb === "light" && tc === "light") return "このまま進めば、「" + kb + "」の先に「" + kc + "」が待っています。";
    if (tb === "shadow" && tc === "light") return "今の「" + kb + "」を乗り越えることで、未来は「" + kc + "」へと開けていきます。";
    if (tb === "light" && tc === "shadow") return "ただ、このまま進むと、未来には「" + kc + "」という課題が現れやすくなります。今のうちに少し調整を。";
    return "今の「" + kb + "」に向き合わないままだと、未来も「" + kc + "」が続きやすいでしょう。逆にいえば、ここを整えれば流れは変えられます。";
  }

  function reversedSummary(cards) {
    var rev = cards.filter(function (x) { return x.orientation === "reversed"; });
    if (rev.length === 0) return "3枚とも正位置で、それぞれのカードのテーマがまっすぐに表れている流れです。";
    if (rev.length === 1) return "逆位置は" + POSITION_INFO[rev[0].position].label + "の1枚だけ。そこが今回の見直しポイントです。";
    if (rev.length === 2) return "逆位置が2枚あり、立ち止まって整えることが求められている時期です。";
    return "3枚とも逆位置です。悪い結果という意味ではなく、外へ動くより内側を整えることに向いた時期と読みます。";
  }

  // 3枚全体から読む注意点（逆位置の文章を並べるだけにしない）
  function buildCautions(items, theme) {
    var past = items[0], present = items[1], future = items[2];
    var list = [];
    list.push("いちばん意識したいのは、現在のカード「" + present.card.name + "」が示す「" + present.card.caution + "」ことです。");

    if (future.orientation === "reversed") {
      list.push("未来のカードが逆位置なのは、結果が悪いという意味ではありません。「" + future.card.name + "」の逆位置は「" +
        future.card.reversedAspect + "」――" + ASPECT_TENDENCY[future.card.reversedAspect] + "ことを示しています。今の選び方しだいで変えられます。");
    } else if (present.orientation === "reversed") {
      list.push("現在のカードの逆位置は「" + present.card.reversedAspect + "」のサイン。無理に進めるより、立て直す時間をとると未来の「" +
        future.card.name + "」を生かしやすくなります。");
    } else if (past.orientation === "reversed") {
      list.push("過去の「" + keyword(past.card, "reversed") + "」がぶり返さないよう、うまくいき始めた今こそ丁寧に進めましょう。");
    } else {
      list.push("3枚とも正位置のときは、順調さに任せて確認を怠りやすくなります。未来の「" + future.card.name + "」が示す「" + future.card.caution + "」ことも心に留めて。");
    }

    list.push(theme.caution);
    return list;
  }

  function formatDate(iso) {
    var p = iso.split("-");
    return Number(p[0]) + "年" + Number(p[1]) + "月" + Number(p[2]) + "日";
  }

  /**
   * @param reading engines/tarot.js の結果 { theme, date, cards:[{position, cardId, orientation}] }
   * @param options { question?: string }  質問文は表示にだけ使う（保存しない）
   */
  function buildTarotView(reading, options) {
    var theme = getTheme(reading.theme);
    if (!theme) throw new TypeError("unknown theme: " + reading.theme);
    var question = options && typeof options.question === "string" ? options.question.trim() : "";

    var items = reading.cards.map(function (c) {
      var base = deck.getCard(c.cardId);
      var info = POSITION_INFO[c.position];
      return {
        position: c.position,
        positionLabel: info.label,
        card: base,
        orientation: c.orientation,
        orientationLabel: ORIENTATION_LABEL[c.orientation],
        keywords: c.orientation === "reversed" ? base.reversedKeywords : base.keywords,
        meaning: c.orientation === "reversed" ? base.reversed : base.upright,
        aspect: c.orientation === "reversed" ? { name: base.reversedAspect, text: deck.ASPECTS[base.reversedAspect] } : null,
        reading: {
          title: info.label + "｜" + info.title,
          lead: info.lead + "「" + base.name + "」の" + ORIENTATION_LABEL[c.orientation] + "が出ています。",
          text: readings.getReading(c.cardId, reading.theme, c.orientation),
          note: c.position === "future" ? "未来のカードは確定した運命ではなく、今の流れが続いた場合の可能性です。" : null
        }
      };
    });

    var past = items[0], present = items[1], future = items[2];

    return {
      theme: { id: theme.id, label: theme.label, description: theme.description },
      date: reading.date,
      dateLabel: formatDate(reading.date),
      question: question || null,
      cards: items,
      headline: theme.label + "の流れは「" + present.card.name + "」から「" + future.card.name + "」へ。",
      message: [
        pastToPresent(past.card, past.orientation, present.card, present.orientation),
        presentToFuture(present.card, present.orientation, future.card, future.orientation),
        reversedSummary(reading.cards),
        theme.closing[tone(future.card, future.orientation)]
      ],
      cautions: buildCautions(items, theme)
    };
  }

  return {
    THEMES: THEMES,
    POSITION_INFO: POSITION_INFO,
    getTheme: getTheme,
    buildTarotView: buildTarotView
  };
});
