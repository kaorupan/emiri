/*
 * 九星気学 エンジン（計算のみ・DOM操作なし）
 *
 * ■ えみりが採用する方式（流派・実装で差が出うる点を明文化）
 *   1. 暦：生年月日はサイト共通の仕様どおり、グレゴリオ暦を1582年以前にも延長して扱う（先発グレゴリオ暦）。
 *   2. 時刻：日本時間（Asia/Tokyo, UTC+9）。天文計算の内部では世界時・力学時を使い、表示はすべて日本時間。
 *   3. 年の区切り：その年の実際の立春（太陽黄経315°）の時刻。1月1日や「2月4日固定」では切り替えない。
 *      立春の前に生まれた人は前の年の星（例：2024年2月3日生まれ → 2023年の四緑木星）。
 *   4. 月の区切り：12の節（立春・啓蟄・清明・立夏・芒種・小暑・立秋・白露・寒露・立冬・大雪・小寒）の時刻。
 *      小寒〜立春の前（丑月）は、前年の立春から始まる気学上の年に属する。
 *   5. 本命星：気学上の年の九星。1年ごとに逆順に巡り、2017年＝一白水星を基準とする。
 *   6. 月命星：気学上の年の九星のグループで寅月の星が決まり（一白・四緑・七赤→八白、三碧・六白・九紫→五黄、
 *      二黒・五黄・八白→二黒）、そこから1か月ごとに逆順に巡る。
 *   7. 節入り当日（出生時刻の入力なし）：多くの早見表と同じく「節入りの日から新しい月（年）」として判定し、
 *      結果が時刻によって変わる可能性を必ず返す（boundary）。出生時刻があれば節入り時刻と比べて判定する。
 *   8. 精度：節入り時刻は core/astro.js の高精度式（国立天文台の公表値との差 およそ1分以内）。
 *      1800〜2100年を確認済み（verified）、それ以外は同じ式で計算して推定（estimated）とする。
 *      境界の判定には誤差の幅（BOUNDARY_MARGIN）を持たせ、幅の中なら「時刻によって変わる可能性」を返す。
 *   ※ 傾斜宮・吉方位・年盤／月盤の運勢はこのエンジンでは扱わない。
 *
 * ブラウザでは window.KaruteEngines.kyusei、Node では module.exports で使える。
 */
(function (root, factory) {
  if (typeof module === "object" && module.exports) {
    module.exports = factory(require("../core/astro.js"), require("../content/kyusei-data.js"));
  } else {
    root.KaruteEngines = root.KaruteEngines || {};
    root.KaruteEngines.kyusei = factory(root.Karute.astro, root.KaruteContent.kyuseiData);
  }
})(typeof self !== "undefined" ? self : this, function (astro, data) {
  "use strict";

  var DAYS_PER_YEAR = 365.2422;
  var SECONDS_PER_DAY = 86400;

  /*
   * 境界判定の誤差の幅（秒）
   *   確認済み範囲：120秒（国立天文台の値との差は最大0.6分。余裕を見て2分）
   *   推定範囲：600秒 ＋ 2.4 × u² 秒（u＝(年−1820)/100）。
   *     ΔT（地球の自転の揺らぎ）の推定の不確かさが年代とともに大きくなることを見込んだ、サイト独自の安全側の目安。
   *     例：西暦1年でおよそ23分、西暦1000年でおよそ13分、西暦9999年でおよそ4時間半。
   */
  function boundaryMarginSeconds(year) {
    if (astro.isVerifiedYear(year)) return 120;
    var u = (year - 1820) / 100;
    return 600 + 2.4 * u * u;
  }

  function mod(n, m) {
    return ((n % m) + m) % m;
  }

  // 気学上の年 → 本命星（1〜9）
  function yearStar(kigakuYear) {
    var base = data.YEAR_STAR_BASE;
    var s = mod(base.star - (kigakuYear - base.year), 9);
    return s === 0 ? 9 : s;
  }

  // 本命星と月の番号（寅月＝0 … 丑月＝11）→ 月命星（1〜9）
  function monthStar(honmei, monthIndex) {
    var s = mod(data.TORA_MONTH_STAR[honmei] - monthIndex, 9);
    return s === 0 ? 9 : s;
  }

  function starInfo(n) {
    return data.STARS[n];
  }

  /*
   * 五行どうしの関係（x から見た y）
   *   hiwa：比和（同じ五行）
   *   sosho：相生（generator が生む側）
   *   sokoku：相剋（controller が抑える側）
   */
  function elementRelation(x, y) {
    if (x === y) return { type: "hiwa", generator: null, controller: null };
    if (data.GENERATES[x] === y) return { type: "sosho", generator: "first", controller: null };
    if (data.GENERATES[y] === x) return { type: "sosho", generator: "second", controller: null };
    if (data.CONTROLS[x] === y) return { type: "sokoku", generator: null, controller: "first" };
    return { type: "sokoku", generator: null, controller: "second" };
  }

  function termByIndex(i) {
    return data.MONTH_TERMS[i];
  }

  // ユリウス日（世界時）→ 日本時間（分に四捨五入。国立天文台の公表値と同じ丸め方）
  function jstMinute(jd) {
    var t = astro.jstDateTimeFromJulianDay(jd + 30 / SECONDS_PER_DAY);
    return { year: t.year, month: t.month, day: t.day, hour: t.hour, minute: t.minute };
  }

  function termMoment(index, jd) {
    var t = termByIndex(index);
    return { index: index, term: t.term, reading: t.reading, branch: t.branch, longitude: t.longitude, jd: jd, jst: jstMinute(jd) };
  }

  /*
   * ある時刻（世界時のユリウス日）が属する気学上の年・月と、九星
   */
  function stateAt(jd) {
    var lon = astro.apparentSunLongitudeUt(jd);
    var monthIndex = Math.floor(mod(lon - 315, 360) / 30);
    if (monthIndex > 11) monthIndex = 11;
    var term = termByIndex(monthIndex);
    var start = astro.previousSolarLongitudeTime(jd, term.longitude);
    var next = astro.solarLongitudeCrossing(termByIndex((monthIndex + 1) % 12).longitude, start + 30.44);
    var risshun = monthIndex === 0 ? start : astro.previousSolarLongitudeTime(jd, 315);
    var kigakuYear = jstMinute(risshun).year;
    var honmei = yearStar(kigakuYear);
    return {
      kigakuYear: kigakuYear,
      monthIndex: monthIndex,
      honmei: honmei,
      getsumei: monthStar(honmei, monthIndex),
      termStart: termMoment(monthIndex, start),
      nextTerm: termMoment((monthIndex + 1) % 12, next),
      risshun: termMoment(0, risshun)
    };
  }

  function sameState(a, b) {
    return a.kigakuYear === b.kigakuYear && a.monthIndex === b.monthIndex;
  }

  // "17:05" / {hour, minute} → {hour, minute}。不正なら例外
  function normalizeTime(time) {
    if (time == null || time === "") return null;
    var h, m;
    if (typeof time === "string") {
      var match = /^(\d{1,2}):(\d{2})$/.exec(time.trim());
      if (!match) throw new Error("時刻の形式が正しくありません");
      h = Number(match[1]); m = Number(match[2]);
    } else {
      h = Number(time.hour); m = Number(time.minute);
    }
    if (!(h >= 0 && h <= 23 && m >= 0 && m <= 59 && h % 1 === 0 && m % 1 === 0)) throw new Error("時刻の範囲が正しくありません");
    return { hour: h, minute: m };
  }

  /**
   * 九星気学の個人判定
   * @param {{year:number, month:number, day:number, time?:(string|{hour:number, minute:number})}} birth
   *   日付は日本時間の暦（先発グレゴリオ暦）、time は日本時間（任意）
   * @returns {{
   *   honmei:number, getsumei:number, honmeiStar:Object, getsumeiStar:Object,
   *   honmeiElement:string, getsumeiElement:string, kigakuYear:number, monthIndex:number,
   *   innerRelation:Object, solarTermInfo:Object, precision:"verified"|"estimated", input:Object
   * }}
   */
  function calculateKyusei(birth) {
    var year = Number(birth.year), month = Number(birth.month), day = Number(birth.day);
    var time = normalizeTime(birth.time);
    var margin = boundaryMarginSeconds(year) / SECONDS_PER_DAY;
    var dayStart = astro.julianDayJst(year, month, day, 0);
    var dayEnd = dayStart + 1;
    var primary, alternative = null, boundary = null;

    if (time) {
      // 出生時刻が分かる場合：その1分間の中央で判定し、節入り時刻が誤差の幅の中なら「変わる可能性」を返す
      var t0 = dayStart + (time.hour * 60 + time.minute) / 1440;
      var mid = t0 + 30 / SECONDS_PER_DAY;
      primary = stateAt(mid);
      var lo = stateAt(t0 - margin);
      var hi = stateAt(t0 + 60 / SECONDS_PER_DAY + margin);
      var crossing = null;
      if (!sameState(lo, primary)) crossing = { state: lo, term: primary.termStart, side: "after" };
      else if (!sameState(hi, primary)) crossing = { state: hi, term: primary.nextTerm, side: "before" };
      if (crossing) {
        alternative = crossing.state;
        boundary = { kind: "near-time", term: crossing.term, side: crossing.side, rule: "time" };
      } else if (isSameJstDay(primary.termStart.jd, dayStart)) {
        // 節入りの当日だが、出生時刻が節入りより十分あとなので確定
        boundary = { kind: "resolved", term: primary.termStart, side: "after", rule: "time" };
      } else if (isSameJstDay(primary.nextTerm.jd, dayStart)) {
        boundary = { kind: "resolved", term: primary.nextTerm, side: "before", rule: "time" };
      }
    } else {
      // 生年月日だけの場合：その日（誤差の幅を含む）の中に節入りがあるかを見る
      var first = stateAt(dayStart - margin);
      var last = stateAt(dayEnd + margin);
      if (sameState(first, last)) {
        primary = stateAt(dayStart + 0.5);
      } else {
        // 境目の節入り時刻
        var edge = last.termStart;
        var inside = edge.jd >= dayStart && edge.jd < dayEnd;
        if (inside) {
          // 節入りの日から新しい月（年）として判定する（早見表と同じ日付の扱い）
          primary = last;
          alternative = first;
          boundary = { kind: "on-day", term: edge, side: "after", rule: "date" };
        } else {
          // 節入りが日付の変わり目のすぐ前後（誤差の幅の中）
          primary = stateAt(dayStart + 0.5);
          alternative = sameState(primary, first) ? last : first;
          boundary = { kind: "near-edge", term: edge, side: sameState(primary, last) ? "after" : "before", rule: "date" };
        }
      }
    }

    var honmeiStar = starInfo(primary.honmei);
    var getsumeiStar = starInfo(primary.getsumei);
    return {
      input: { year: year, month: month, day: day, time: time },
      honmei: primary.honmei,
      getsumei: primary.getsumei,
      honmeiStar: honmeiStar,
      getsumeiStar: getsumeiStar,
      honmeiElement: honmeiStar.element,
      getsumeiElement: getsumeiStar.element,
      kigakuYear: primary.kigakuYear,
      monthIndex: primary.monthIndex,
      monthBranch: termByIndex(primary.monthIndex).branch,
      innerRelation: innerRelation(primary.honmei, primary.getsumei),
      solarTermInfo: {
        basis: time ? "time" : "date",
        risshun: primary.risshun,
        termStart: primary.termStart,
        nextTerm: primary.nextTerm,
        boundary: boundary,
        mayChange: !!alternative,
        alternative: alternative ? {
          honmei: alternative.honmei, getsumei: alternative.getsumei,
          honmeiStar: starInfo(alternative.honmei), getsumeiStar: starInfo(alternative.getsumei),
          kigakuYear: alternative.kigakuYear, monthIndex: alternative.monthIndex
        } : null,
        marginMinutes: Math.round(boundaryMarginSeconds(year) / 60)
      },
      precision: astro.isVerifiedYear(year) ? "verified" : "estimated"
    };
  }

  function isSameJstDay(jd, dayStart) {
    return jd >= dayStart && jd < dayStart + 1;
  }

  // 本命星（外側）と月命星（内側）の関係
  function innerRelation(honmei, getsumei) {
    var he = starInfo(honmei).element, ge = starInfo(getsumei).element;
    var r = elementRelation(he, ge);
    var direction = null;
    if (r.type === "sosho") direction = r.generator === "first" ? "honmei-to-getsumei" : "getsumei-to-honmei";
    if (r.type === "sokoku") direction = r.controller === "first" ? "honmei-to-getsumei" : "getsumei-to-honmei";
    return {
      type: honmei === getsumei ? "same-star" : r.type,
      elementType: r.type,
      direction: direction,
      honmeiElement: he,
      getsumeiElement: ge
    };
  }

  // ふたりの星どうしの関係。type は対称、giver（相生で生む側）・actor（相剋で抑える側）は視点で入れ替わる
  function pairRelation(starA, starB) {
    var ea = starInfo(starA).element, eb = starInfo(starB).element;
    var r = elementRelation(ea, eb);
    return {
      type: r.type,
      sameStar: starA === starB,
      stars: { a: starA, b: starB },
      elements: { a: ea, b: eb },
      giver: r.generator === "first" ? "a" : r.generator === "second" ? "b" : null,
      actor: r.controller === "first" ? "a" : r.controller === "second" ? "b" : null
    };
  }

  function ensureResult(x) {
    return x && typeof x.honmei === "number" && x.solarTermInfo ? x : calculateKyusei(x);
  }

  /**
   * 九星気学の相性（データのみ）
   * @param a 1人目（あなた）の生年月日（と任意の時刻）または calculateKyusei の結果
   * @param b 2人目（お相手）
   * @returns {{
   *   category:"hiwa"|"sosho"|"sokoku",       // 本命星どうしの五行関係（A×B と B×A で同じ）
   *   innerCategory:"hiwa"|"sosho"|"sokoku",  // 月命星どうしの五行関係（対称）
   *   honmeiRelation:Object, getsumeiRelation:Object, // giver / actor は視点で入れ替わる
   *   crossRelations:{ aHonmeiBGetsumei:Object, bHonmeiAGetsumei:Object },
   *   anyMayChange:boolean, person1:Object, person2:Object
   * }}
   */
  function calculateKyuseiCompatibility(a, b) {
    var p1 = ensureResult(a), p2 = ensureResult(b);
    var honmeiRelation = pairRelation(p1.honmei, p2.honmei);
    var getsumeiRelation = pairRelation(p1.getsumei, p2.getsumei);
    return {
      category: honmeiRelation.type,
      innerCategory: getsumeiRelation.type,
      honmeiRelation: honmeiRelation,
      getsumeiRelation: getsumeiRelation,
      crossRelations: {
        aHonmeiBGetsumei: pairRelation(p1.honmei, p2.getsumei),
        bHonmeiAGetsumei: pairRelation(p2.honmei, p1.getsumei)
      },
      anyMayChange: p1.solarTermInfo.mayChange || p2.solarTermInfo.mayChange,
      person1: p1,
      person2: p2
    };
  }

  return {
    calculateKyusei: calculateKyusei,
    calculateKyuseiCompatibility: calculateKyuseiCompatibility,
    yearStar: yearStar,
    monthStar: monthStar,
    elementRelation: elementRelation,
    boundaryMarginSeconds: boundaryMarginSeconds,
    stateAt: stateAt
  };
});
