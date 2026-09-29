/*
 * 九星気学の固定データ（伝統的な対応関係だけを置く）
 *
 * ここにあるのは、九星気学で一般的に使われる対応表です。サイト独自の読み解き文は kyusei-text.js に分けています。
 *   - 九星の名前・五行・色・八卦（易の卦）・象意（その星が象徴するもの）
 *   - 五行の相生（生み出す関係）・相剋（抑える関係）
 *   - 年の九星の巡り方、月の九星の起点（寅月＝立春からの月に入る星）
 *   - 月の区切りとなる12の節（節入り）と太陽黄経
 *
 * 九星と五行の対応はこのファイルの STARS にだけ書く（エンジン・文章・画面はここを参照する）。
 *
 * ブラウザでは window.KaruteContent.kyuseiData、Node では module.exports で使える。
 */
(function (root, factory) {
  var api = factory();
  if (typeof module === "object" && module.exports) {
    module.exports = api;
  } else {
    root.KaruteContent = root.KaruteContent || {};
    root.KaruteContent.kyuseiData = api;
  }
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";

  // 九星（番号 1〜9）。element が五行。trigram は後天八卦での対応（五黄は中央で卦を持たない）
  var STARS = [
    null,
    { number: 1, name: "一白水星", short: "一白", element: "水", color: "白", trigram: "坎（かん）", nature: "水",
      imagery: ["水", "流れ", "交わり", "秘めたもの", "始まり"] },
    { number: 2, name: "二黒土星", short: "二黒", element: "土", color: "黒", trigram: "坤（こん）", nature: "大地",
      imagery: ["大地", "母性", "勤勉", "育成", "土台"] },
    { number: 3, name: "三碧木星", short: "三碧", element: "木", color: "碧", trigram: "震（しん）", nature: "雷",
      imagery: ["雷", "発展", "音・声", "若さ", "始動"] },
    { number: 4, name: "四緑木星", short: "四緑", element: "木", color: "緑", trigram: "巽（そん）", nature: "風",
      imagery: ["風", "整う", "信用", "縁", "往来"] },
    { number: 5, name: "五黄土星", short: "五黄", element: "土", color: "黄", trigram: "（中央・卦なし）", nature: "中央",
      imagery: ["中央", "統率", "強さ", "終わりと再生"] },
    { number: 6, name: "六白金星", short: "六白", element: "金", color: "白", trigram: "乾（けん）", nature: "天",
      imagery: ["天", "父性", "完全", "目上", "活動"] },
    { number: 7, name: "七赤金星", short: "七赤", element: "金", color: "赤", trigram: "兌（だ）", nature: "沢",
      imagery: ["沢", "喜び", "口（会話・飲食）", "金銭", "実り"] },
    { number: 8, name: "八白土星", short: "八白", element: "土", color: "白", trigram: "艮（ごん）", nature: "山",
      imagery: ["山", "変化", "継承", "蓄積", "境目"] },
    { number: 9, name: "九紫火星", short: "九紫", element: "火", color: "紫", trigram: "離（り）", nature: "火",
      imagery: ["火", "明るさ", "知性", "美", "離合"] }
  ];

  // 五行（木・火・土・金・水）
  var ELEMENTS = {
    "木": { id: "wood", name: "木", reading: "もく", image: "伸びていく木" },
    "火": { id: "fire", name: "火", reading: "か", image: "燃え上がる火" },
    "土": { id: "earth", name: "土", reading: "ど", image: "受け止める土" },
    "金": { id: "metal", name: "金", reading: "ごん", image: "引き締まった金属" },
    "水": { id: "water", name: "水", reading: "すい", image: "形を変えて流れる水" }
  };

  // 相生：A が B を生む（木→火→土→金→水→木）
  var GENERATES = { "木": "火", "火": "土", "土": "金", "金": "水", "水": "木" };
  var GENERATES_REASON = {
    "木": "木が燃えて火を生む",
    "火": "燃えたあとの灰が土になる",
    "土": "土の中から金属が生まれる",
    "金": "金属の表面に水が生じる",
    "水": "水が木を育てる"
  };
  // 相剋：A が B を抑える（木→土→水→火→金→木）
  var CONTROLS = { "木": "土", "土": "水", "水": "火", "火": "金", "金": "木" };
  var CONTROLS_REASON = {
    "木": "木が根を張って土を締める",
    "土": "土が水をせき止める",
    "水": "水が火を消す",
    "火": "火が金属を溶かす",
    "金": "金属の刃が木を切る"
  };

  /*
   * 年の九星：1年ごとに 九紫→八白→…→一白→九紫 と逆順に巡る。
   * 基準年：2017年（立春から翌年の立春の前まで）＝ 一白水星。
   * （同じ規則を「11 から西暦の各桁の和を引く」と説明する早見表もある。どちらも同じ結果になる）
   */
  var YEAR_STAR_BASE = { year: 2017, star: 1 };

  /*
   * 月の九星：寅月（立春〜啓蟄の前）に入る星は、その年の九星のグループで決まり、
   * そこから1か月ごとに1つずつ逆順に巡る（翌年の寅月まで途切れずにつながる）。
   *   一白・四緑・七赤の年 → 寅月は八白土星
   *   三碧・六白・九紫の年 → 寅月は五黄土星
   *   二黒・五黄・八白の年 → 寅月は二黒土星
   */
  var TORA_MONTH_STAR = { 1: 8, 4: 8, 7: 8, 3: 5, 6: 5, 9: 5, 2: 2, 5: 2, 8: 2 };

  /*
   * 月の区切り（12の節）。index は寅月を0とした月の番号。longitude は節入りの太陽黄経（度）
   * 丑月（小寒〜立春の前）は、前の年の立春から始まる「気学上の年」の最後の月にあたる
   */
  var MONTH_TERMS = [
    { index: 0, term: "立春", reading: "りっしゅん", longitude: 315, branch: "寅", usual: "2月4日ごろ" },
    { index: 1, term: "啓蟄", reading: "けいちつ", longitude: 345, branch: "卯", usual: "3月6日ごろ" },
    { index: 2, term: "清明", reading: "せいめい", longitude: 15, branch: "辰", usual: "4月5日ごろ" },
    { index: 3, term: "立夏", reading: "りっか", longitude: 45, branch: "巳", usual: "5月6日ごろ" },
    { index: 4, term: "芒種", reading: "ぼうしゅ", longitude: 75, branch: "午", usual: "6月6日ごろ" },
    { index: 5, term: "小暑", reading: "しょうしょ", longitude: 105, branch: "未", usual: "7月7日ごろ" },
    { index: 6, term: "立秋", reading: "りっしゅう", longitude: 135, branch: "申", usual: "8月8日ごろ" },
    { index: 7, term: "白露", reading: "はくろ", longitude: 165, branch: "酉", usual: "9月8日ごろ" },
    { index: 8, term: "寒露", reading: "かんろ", longitude: 195, branch: "戌", usual: "10月8日ごろ" },
    { index: 9, term: "立冬", reading: "りっとう", longitude: 225, branch: "亥", usual: "11月7日ごろ" },
    { index: 10, term: "大雪", reading: "たいせつ", longitude: 255, branch: "子", usual: "12月7日ごろ" },
    { index: 11, term: "小寒", reading: "しょうかん", longitude: 285, branch: "丑", usual: "1月6日ごろ" }
  ];

  return {
    STARS: STARS,
    ELEMENTS: ELEMENTS,
    GENERATES: GENERATES,
    GENERATES_REASON: GENERATES_REASON,
    CONTROLS: CONTROLS,
    CONTROLS_REASON: CONTROLS_REASON,
    YEAR_STAR_BASE: YEAR_STAR_BASE,
    TORA_MONTH_STAR: TORA_MONTH_STAR,
    MONTH_TERMS: MONTH_TERMS
  };
});
