/*
 * 復縁占い・片思い占い（えみりの組み合わせ）
 *   ふたりの縁：お相手の生年月日があれば、総合相性（content/sougou-aisho.js：8つの占術）で読む
 *   動きやすい月：数秘術のパーソナルマンス（その月のテーマ）を、復縁・片思いそれぞれの言葉で読む（今月から6か月）
 *   アドバイス：選んでもらった今の状況（別れてからの期間・連絡・きっかけなど）に合わせた文章
 *   相手の気持ちと選択を大切にする。ブロックされている・連絡を断られているときは、連絡をすすめない。
 *
 * ブラウザでは window.KaruteContent.renai、Node では module.exports。
 */
(function (root, factory) {
  var api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  root.KaruteContent = root.KaruteContent || {};
  root.KaruteContent.renai = api;
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";

  // パーソナルマンス（1〜9）：[点（2＝動きやすい、1＝ふつう、0＝整える）, 月の言葉]
  var MONTH = {
    fukuen: {
      1: [2, "新しい関係として、もう一度はじめやすい月"],
      2: [2, "歩み寄りや仲直りに向く月"],
      3: [1, "気軽なひとことを送りやすい月"],
      4: [1, "信頼を少しずつ積み直す月"],
      5: [2, "再会のきっかけが生まれやすい月"],
      6: [2, "気持ちを素直に伝え直せる月"],
      7: [0, "自分を見つめ直し、磨く月"],
      8: [1, "関係を冷静に見直せる月"],
      9: [0, "過去に区切りをつけ、心を整える月"]
    },
    kataomoi: {
      1: [2, "気持ちを伝える一歩を踏み出しやすい月"],
      2: [2, "ふたりの距離が縮まりやすい月"],
      3: [1, "会話が弾み、誘いやすい月"],
      4: [1, "信頼を育てる月"],
      5: [1, "思い切った誘いが動きを生む月"],
      6: [2, "やさしさが伝わり、愛情が深まりやすい月"],
      7: [0, "自分の気持ちを確かめる月"],
      8: [1, "自信を持って振る舞える月"],
      9: [0, "気持ちを整理し、次に備える月"]
    }
  };

  var Q = {
    fukuen: {
      period: {
        m1: "別れてまだ日が浅い今は、気持ちが大きく揺れやすい時期です。すぐに答えを出そうとせず、まずは食事や睡眠を整えて、自分を立て直すことを優先しましょう。",
        m6: "少し時間がたち、お互いに気持ちを落ち着けて振り返れるころです。別れの理由を、相手を責めずに自分の目線で見つめ直してみましょう。",
        y1: "時間がたったぶん、お互いに変化があるはずです。昔の続きではなく「今のふたり」として向き合えると、新しい関係を築きやすくなります。",
        over: "長い時間がたっているので、もう一度会うなら「新しく知り合う」くらいの気持ちで。過去の思い出より、今の相手を知ろうとする姿勢が大切です。"
      },
      contact: {
        now: "今も連絡を取れているのは大きな強みです。重い話より、近況や相手の話を聞くことから。安心して話せる相手だと思ってもらえることが、いちばんの近道です。",
        some: "ときどき連絡がある関係なら、誕生日や季節のあいさつなど、自然なきっかけを大切に。返事を急かさず、相手のペースに合わせましょう。",
        none: "今は連絡を取っていないなら、焦って連絡するより、まず自分の毎日を充実させることから。共通の友人の集まりなど、無理のない場で自然に会えるのがいちばんです。",
        blocked: "連絡を断られている今は、相手が距離を置きたいというサインです。別のアカウントや人づてに連絡するのはやめましょう。相手の気持ちを大切にすることが、あなた自身を守ることにもつながります。この時期は、自分のための時間にしてください。"
      },
      reason: {
        natural: "自然消滅だった場合は、どちらかが嫌いになったわけではないことも多いもの。忙しさやすれ違いの原因がわかれば、やり直すときの工夫が見えてきます。",
        fight: "けんかが理由なら、まずは「どちらが悪いか」より、自分の言い方や態度で直したいところをひとつ決めておきましょう。謝るなら、言いわけをつけずに短く。",
        them: "相手から別れを告げられたなら、相手の決めたことをいったん受け止めることが大切です。そのうえで、自分が変われるところを形にしていくと、印象が変わっていきます。",
        me: "自分から別れを切り出したなら、なぜ戻りたいと思ったのかを言葉にしておきましょう。同じ理由でまたすれ違わないか、確かめてから動くと安心です。",
        distance: "距離や環境が理由なら、その状況が変わったかどうかが鍵です。会える回数や連絡のしかたなど、具体的な形を考えてから伝えると、相手も前向きに考えやすくなります。"
      }
    },
    kataomoi: {
      relation: {
        new: "知り合ったばかりの今は、相手のことを知る時期です。好きな食べ物や休日の過ごし方など、相手が話しやすい話題から少しずつ距離を縮めましょう。",
        friend: "友達の関係なら、すでに信頼があるのが強み。いつもと少しちがう場所に誘うなど、「友達」から一歩だけ踏み出すきっかけを作ってみましょう。",
        work: "職場や学校の相手なら、まわりの目も気になるところ。仕事や勉強での小さな協力や感謝のひとことが、自然に印象を良くしてくれます。",
        online: "SNSやアプリで知り合った相手なら、メッセージだけでなく、短い通話や会う約束で「実際のやりとり」を増やすと、気持ちが伝わりやすくなります。"
      },
      contact: {
        often: "よく話せているなら、関係は順調です。相手の話を覚えていて、次に会ったときに話題にするなど、「あなたを気にかけている」が伝わる工夫を。",
        some: "ときどき話す関係なら、話すきっかけを少し増やしましょう。相手の得意なことについて質問するのは、自然で好印象なきっかけです。",
        rare: "ほとんど話せていないなら、まずはあいさつや短い会話から。いきなり大きく動くより、顔を合わせる回数を増やすほうが近道です。"
      },
      feeling: {
        good: "手応えを感じているなら、思い切って気持ちを伝えてもよいタイミングが近いかもしれません。下の「動きやすい月」を目安に、ふたりきりで話せる場を作ってみましょう。",
        unsure: "相手の気持ちがわからないときは、気持ちを確かめるより、まずは一緒にいて楽しい時間を増やすことから。相手からの誘いや連絡が増えてきたら、それがサインです。",
        low: "脈がないかもと感じていても、それは今の時点での話です。無理に追いかけず、自分の毎日を充実させていると、ふとしたときに関係が動くこともあります。相手の気持ちを尊重しながら、ゆっくり進みましょう。"
      }
    }
  };

  var STEPS = {
    fukuen: ["気持ちを整える（自分の毎日を立て直す）", "別れの理由を、自分の目線で振り返る", "自然なきっかけで、軽く連絡してみる（相手が望んでいる場合だけ）", "会えたら、昔の話より「今のふたり」の話をする"],
    kataomoi: ["相手が話しやすい話題で、会話を増やす", "ふたりで話せる時間を少しずつ作る", "動きやすい月に、思い切って誘ってみる", "相手のペースを大切にしながら、気持ちを伝える"]
  };

  function reduce(n) { while (n > 9) n = String(n).split("").reduce(function (a, b) { return a + Number(b); }, 0); return n; }

  /**
   * @param kind "fukuen" | "kataomoi"
   * @param me {year, month, day}
   * @param partner {year, month, day} | null
   * @param answers 選んでもらった状況（例：{ period: "m6", contact: "some", reason: "fight" }）
   * @param today {year, month, day}
   * @param E エンジン（sougou-aisho の E と同じもの）。総合相性には E.sougou（content/sougou-aisho.js）を使う
   */
  function build(kind, me, partner, answers, today, E) {
    var K = MONTH[kind] ? kind : "fukuen";
    var months = [];
    for (var k = 0; k < 6; k++) {
      var m = today.month + k, y = today.year;
      if (m > 12) { m -= 12; y += 1; }
      var list = E.numerology.calculateNumerology(me, { targetYear: y }).personalMonths;
      var pm = reduce((list.filter(function (x) { return x.month === m; })[0] || {}).personalMonth || 1);
      var d = MONTH[K][pm];
      months.push({ year: y, month: m, pm: pm, score: d[0], label: d[1], good: d[0] === 2 });
    }
    var best = months.filter(function (x) { return x.good; })[0] || null;

    var en = null;
    if (partner && E.sougou) {
      var s = E.sougou.build(me, partner, "love", today, E);
      en = { total: s.total, headline: s.headline, best: s.best, weakest: s.weakest, items: s.items };
    }

    var a = answers || {}, texts = [];
    var QK = Q[K];
    Object.keys(QK).forEach(function (q) { if (a[q] && QK[q][a[q]]) texts.push({ q: q, text: QK[q][a[q]] }); });
    var blocked = K === "fukuen" && a.contact === "blocked";

    return {
      kind: K,
      months: months,
      bestMonth: best,
      en: en,
      advice: texts,
      steps: blocked ? ["今は連絡を控え、相手の気持ちを尊重する", "自分のための時間（趣味・友人・休息）を増やす", "気持ちを整理して、これからの自分を考える"] : STEPS[K],
      blocked: blocked
    };
  }

  return { build: build, MONTH: MONTH, Q: Q };
});
