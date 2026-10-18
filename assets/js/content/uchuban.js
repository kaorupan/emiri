/*
 * 宇宙盤（算命学）
 *   60の干支を円の上に並べ、生まれた年・月・日の干支（陰占）の3点を結んだ形を「行動領域」として読む。
 *   盤の向き：甲子を真上に置き、時計回りに 1つ6° ずつ並べる（流派によって向きや区分の名前はちがう）。
 *   4つの区分：甲子〜戊寅（右上）／己卯〜癸巳（右下）／甲午〜戊申（左下）／己酉〜癸亥（左上）。
 *   相性：ふたりの形が同じ区分にいくつ入っているか（共有する区分の数）と、形の重なりの広さで読む。
 *
 * 干支の計算は四柱推命のエンジン（engines/shichusuimei.js）を使う。
 * ブラウザでは window.KaruteContent.uchuban、Node では module.exports。
 */
(function (root, factory) {
  var api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  root.KaruteContent = root.KaruteContent || {};
  root.KaruteContent.uchuban = api;
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";

  var AREAS = [
    { key: "a", name: "守りと安定", range: "甲子〜戊寅", text: "決まりごとや積み重ねを大切にし、落ち着いた環境で力を出す世界です。" },
    { key: "b", name: "自由と自立", range: "己卯〜癸巳", text: "自分の考えで動き、人に縛られずに道をつくっていく世界です。" },
    { key: "c", name: "挑戦と行動", range: "甲午〜戊申", text: "目標に向かって勢いよく進み、競い合いの中で伸びていく世界です。" },
    { key: "d", name: "知性と戦略", range: "己酉〜癸亥", text: "考え、計画し、知識や工夫で物事を動かしていく世界です。" }
  ];

  var SIZE = {
    wide: { label: "広い", text: "行動範囲が広く、いろいろな世界に顔を出せるタイプです。人づきあいも幅広く、ひとつの場所にとどまるより、動きながら力を発揮します。器用な反面、手を広げすぎて疲れやすいところも。" },
    middle: { label: "ふつう", text: "なじみの世界を大切にしながら、必要なときは外の世界にも出ていけるバランスのよい広さです。得意な場所と新しい場所を行き来することで、力が育ちます。" },
    narrow: { label: "せまい", text: "行動範囲をしぼり、得意な世界を深く掘り下げるタイプです。少数の人との深い関係や、専門性を磨くことで力が出ます。慣れない場では疲れやすいので、自分のペースを守りましょう。" },
    line: { label: "線", text: "年・月・日のうち2つの干支が同じで、形が線になっています（算命学で律音と呼ばれる組み合わせ）。ひとつのことへのこだわりと集中力がとても強いタイプ。まっすぐな分、まわりの影響を受けやすい時期もあります。" },
    point: { label: "点", text: "年・月・日の干支がすべて同じで、形が点になっています。とても珍しい組み合わせで、自分だけの世界観をしっかり持ち、その中で力を発揮するタイプです。" }
  };

  var MATCH = {
    3: { name: "いつも一緒タイプ", text: "共通の世界がとても多く、興味や行動の範囲が重なりやすいふたりです。一緒にいて自然に話が合い、恋人や親友として深く結びつきやすい関係。近すぎてお互いの外の世界が見えにくくなることもあるので、ひとりの時間も大切に。" },
    2: { name: "ちょうどいい距離タイプ", text: "わかり合える共通の世界と、それぞれの世界の両方を持っているふたりです。近づきすぎず離れすぎず、恋愛にも結婚にも、仕事のパートナーにも向いたバランスのよい関係です。" },
    1: { name: "それぞれ自立タイプ", text: "共通の世界は少なめで、お互いに自分の世界を持っているふたりです。相手の気分に振り回されにくく、役割を分け合う関係に向いています。会話のきっかけは意識してつくると◎。" },
    0: { name: "別世界タイプ", text: "行動領域が重ならない、まったく別の世界に生きるふたりです。だからこそ、相手は自分にない視点を運んでくれる存在。相手を変えようとせず、ちがいを楽しめると長続きします。" }
  };

  var STEMS = "甲乙丙丁戊己庚辛壬癸", BRANCHES = "子丑寅卯辰巳午未申酉戌亥";
  function nameOf(i) { return STEMS.charAt(i % 10) + BRANCHES.charAt(i % 12); }
  function mod(n, m) { return ((n % m) + m) % m; }

  // 干支の番号（0＝甲子）→ 円の上の座標（半径1、真上が甲子、時計回り。y は下向きが＋）
  function point(i) {
    var a = (i * 6) * Math.PI / 180;
    return { x: Math.sin(a), y: -Math.cos(a) };
  }
  // 円の中の点 → 区分（0〜3）。中心は区分なし
  function areaOf(p) {
    if (Math.abs(p.x) < 1e-9 && Math.abs(p.y) < 1e-9) return -1;
    var deg = mod(Math.atan2(p.x, -p.y) * 180 / Math.PI, 360);
    return Math.min(3, Math.floor(deg / 90));
  }
  function triArea(a, b, c) { return Math.abs((b.x - a.x) * (c.y - a.y) - (c.x - a.x) * (b.y - a.y)) / 2; }
  function inTri(p, a, b, c) {
    var d1 = (p.x - b.x) * (a.y - b.y) - (a.x - b.x) * (p.y - b.y);
    var d2 = (p.x - c.x) * (b.y - c.y) - (b.x - c.x) * (p.y - c.y);
    var d3 = (p.x - a.x) * (c.y - a.y) - (c.x - a.x) * (p.y - a.y);
    var neg = d1 < -1e-12 || d2 < -1e-12 || d3 < -1e-12, pos = d1 > 1e-12 || d2 > 1e-12 || d3 > 1e-12;
    return !(neg && pos);
  }
  function strictlyInside(p, a, b, c) {
    var e = 1e-9;
    var d1 = (p.x - b.x) * (a.y - b.y) - (a.x - b.x) * (p.y - b.y);
    var d2 = (p.x - c.x) * (b.y - c.y) - (b.x - c.x) * (p.y - c.y);
    var d3 = (p.x - a.x) * (c.y - a.y) - (c.x - a.x) * (p.y - a.y);
    return (d1 > e && d2 > e && d3 > e) || (d1 < -e && d2 < -e && d3 < -e);
  }
  var EQ = 3 * Math.sqrt(3) / 4; // 円に内接する正三角形の面積

  // 形が通る区分（三角形の中・線の上を細かく調べる）
  function areasOf(pts) {
    var seen = [false, false, false, false], N = 48;
    for (var i = 0; i <= N; i++) for (var j = 0; j <= N - i; j++) {
      var k = N - i - j;
      var p = { x: (pts[0].x * i + pts[1].x * j + pts[2].x * k) / N, y: (pts[0].y * i + pts[1].y * j + pts[2].y * k) / N };
      var a = areaOf(p);
      if (a >= 0) seen[a] = true;
    }
    return [0, 1, 2, 3].filter(function (n) { return seen[n]; });
  }

  /** ひとりの宇宙盤 */
  function chart(birth, E) {
    var sh = E.shichu.calculateShichusuimei(birth);
    var keys = ["year", "month", "day"], labels = { year: "年", month: "月", day: "日" };
    var dots = keys.map(function (k) { var idx = sh.byKey[k].index; return { key: k, label: labels[k], index: idx, name: nameOf(idx), pos: point(idx) }; });
    var pts = dots.map(function (d) { return d.pos; });
    var distinct = dots.map(function (d) { return d.index; }).filter(function (v, i, a) { return a.indexOf(v) === i; }).length;
    var ratio = distinct === 3 ? triArea(pts[0], pts[1], pts[2]) / EQ : 0;
    var shape = distinct === 1 ? "point" : distinct === 2 ? "line" : ratio >= 0.55 ? "wide" : ratio >= 0.25 ? "middle" : "narrow";
    var gaps = [mod(dots[1].index - dots[0].index, 60), mod(dots[2].index - dots[1].index, 60), mod(dots[0].index - dots[2].index, 60)];
    var daisango = distinct === 3 && dots.every(function (d, i) { return mod(d.index - dots[(i + 1) % 3].index, 60) % 20 === 0; });
    // 中心が三角形の内側（辺の上はのぞく）にあれば、4つの世界すべてを通る
    var center = distinct === 3 && strictlyInside({ x: 0, y: 0 }, pts[0], pts[1], pts[2]);
    var areas = center ? [0, 1, 2, 3] : areasOf(pts);
    return {
      input: sh.input, dots: dots, shape: shape, size: SIZE[shape], ratio: ratio, percent: Math.round(ratio * 100),
      areas: areas.map(function (a) { return AREAS[a]; }), areaIndexes: areas, center: center, daisango: daisango, gaps: gaps
    };
  }

  // ふたりの形の重なり（円の中を細かい格子で数える）
  function overlap(a, b) {
    var pa = a.dots.map(function (d) { return d.pos; }), pb = b.dots.map(function (d) { return d.pos; });
    if (a.shape === "line" || a.shape === "point" || b.shape === "line" || b.shape === "point") return null;
    var N = 120, inA = 0, inB = 0, both = 0;
    for (var i = 0; i < N; i++) for (var j = 0; j < N; j++) {
      var p = { x: -1 + (i + 0.5) * 2 / N, y: -1 + (j + 0.5) * 2 / N };
      var x = inTri(p, pa[0], pa[1], pa[2]), y = inTri(p, pb[0], pb[1], pb[2]);
      if (x) inA++; if (y) inB++; if (x && y) both++;
    }
    var small = Math.min(inA, inB);
    return small ? both / small : 0;
  }

  /** ふたりの相性 */
  function compat(a, b) {
    var shared = a.areaIndexes.filter(function (n) { return b.areaIndexes.indexOf(n) >= 0; });
    var key = Math.min(3, shared.length);
    var ov = overlap(a, b);
    var ovText = ov === null ? "" :
      ov >= 0.6 ? "形の重なりがとても大きく、片方の世界をもう片方が包みこむような関係です。" :
      ov >= 0.25 ? "形がほどよく重なっていて、共通の話題と、それぞれの持ち味の両方があります。" :
      ov > 0 ? "形の重なりは小さめ。ふだんは別々の場所で活躍し、ときどき交わる関係です。" :
      "形は重なっていません。お互いの世界を尊重し合うことが、関係を育てる鍵です。";
    return { shared: shared.map(function (n) { return AREAS[n]; }), type: MATCH[key], typeKey: key, overlap: ov, overlapPercent: ov === null ? null : Math.round(ov * 100), overlapText: ovText };
  }

  return { chart: chart, compat: compat, point: point, areaOf: areaOf, nameOf: nameOf, AREAS: AREAS, SIZE: SIZE, MATCH: MATCH };
});
