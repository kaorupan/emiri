/*
 * えみりの占いの一覧（共通データ）
 *   TOPの一覧・悩みカテゴリのページ・新着・検索は、すべてこのデータから作る。
 *   新しい占いを足すときは、ここに1行足して node tools/home/generate.mjs を実行する。
 *
 *   id        英数字の名前
 *   title     占い名（一覧に出す名前）
 *   url       サイト内の場所（先頭の / なし）
 *   desc      短い説明（一覧の補足。25字前後）
 *   group     占術の分類（GROUPS の id）
 *   nayami    悩みカテゴリ（NAYAMI の id。複数可）
 *   kw        検索用のキーワード（ひらがな・言いかえ・関連語。空白区切り）
 *   icon      assets/img/icons.svg の名前
 *   pub       公開日（YYYY-MM-DD。新着の並び順）
 *   rec       おすすめに出すか（えみり独自の占いなど）
 *   top       TOPの「占術から探す」に出す（false なら一覧ページだけ）
 *
 * ブラウザでは window.KaruteContent.catalog、Node では module.exports。
 */
(function (root, factory) {
  var api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  root.KaruteContent = root.KaruteContent || {};
  root.KaruteContent.catalog = api;
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";

  var GROUPS = [
    { id: "birth", name: "生年月日で占う" },
    { id: "original", name: "えみりのオリジナル" },
    { id: "card", name: "カード・名前で占う" },
    { id: "body", name: "夢・手相・ほくろ" },
    { id: "kaiun", name: "開運・暮らし" },
    { id: "aisho", name: "相性占い" }
  ];

  var NAYAMI = [
    { id: "renai", name: "恋愛", icon: "love", lead: "片思い・恋人・結婚。恋の行方や、ふたりの関係を占う。" },
    { id: "aisho", name: "相性", icon: "aisho", lead: "恋人・友だち・家族・職場の人と、ふたりの相性を見る。" },
    { id: "shigoto", name: "仕事・才能", icon: "tekishoku", lead: "向いている仕事や働き方、転職に動きやすい時期を知る。" },
    { id: "seikaku", name: "性格・本当の自分", icon: "mirror", lead: "生まれ持った性質や才能、自分らしさを見つめる。" },
    { id: "ningen", name: "人間関係", icon: "ningen", lead: "家族・友人・職場の人との関係や距離感を見る。" },
    { id: "kinun", name: "金運・開運", icon: "money", lead: "お金の流れや、運気を上げる方位・部屋づくり・お守り。" },
    { id: "kyou", name: "今日・これから", icon: "unsei", lead: "今日の運勢や吉日、これからの流れを見る。" }
  ];

  function E(id, title, url, desc, group, nayami, kw, icon, pub, opt) {
    opt = opt || {};
    return { id: id, title: title, url: url, desc: desc, group: group, nayami: nayami, kw: kw, icon: icon, pub: pub, rec: !!opt.rec, top: opt.top !== false };
  }

  var ITEMS = [
    E("tarot", "タロット占い", "tarot/", "3枚のカードで過去・現在・未来", "card", ["renai", "shigoto", "ningen", "kinun", "kyou"], "たろっと カード 大アルカナ 今日 恋愛 仕事", "tarot", "2026-09-27"),
    E("suhijutsu", "数秘術", "suhijutsu/", "数字で見る本質・才能・今年の流れ", "birth", ["seikaku", "shigoto", "kyou"], "すうひじゅつ 数秘学 ライフパス ナンバー 誕生日 今年 運勢", "suhijutsu", "2026-09-27"),
    E("seiju", "星獣カルテ", "seiju/", "季節と月のリズムで決まる12の星獣", "original", ["seikaku"], "せいじゅう 動物 星獣 オリジナル 月", "seiju", "2026-09-27", { rec: true }),
    E("kyusei", "九星気学", "kyusei/", "本命星・月命星で性格と運気", "birth", ["seikaku", "shigoto", "kyou"], "きゅうせい 九星 本命星 月命星 一白 二黒 三碧 四緑 五黄 六白 七赤 八白 九紫", "kyusei", "2026-09-30"),
    E("shichusuimei", "四柱推命", "shichusuimei/", "命式・日干・五行・これからの3年", "birth", ["seikaku", "shigoto"], "しちゅうすいめい 命式 日干 通変星 天中殺 五行", "shichusuimei", "2026-10-10"),
    E("maya", "マヤ暦", "maya/", "KIN・太陽の紋章・銀河の音", "birth", ["seikaku"], "まやれき マヤ KIN 紋章 銀河の音", "maya", "2026-10-10"),
    E("shukuyo", "宿曜占星術", "shukuyo/", "本命宿と27宿の相性", "birth", ["seikaku", "ningen"], "すくよう 宿曜 本命宿 27宿 三九の秘法", "shukuyo", "2026-10-10"),
    E("unsei", "今日の運勢", "unsei/", "九星・12星座のランキングを毎日更新", "kaiun", ["kyou"], "きょうのうんせい 今日 運勢 ランキング 星座 12星座 毎日", "unsei", "2026-10-10"),
    E("koyomi", "吉日カレンダー", "koyomi/", "一粒万倍日・天赦日・寅の日", "kaiun", ["kinun", "kyou"], "きちじつ 暦 一粒万倍日 天赦日 寅の日 巳の日 大安 カレンダー", "koyomi", "2026-10-10"),
    E("horoscope", "ホロスコープ", "horoscope/", "10天体の星座で性格と今年の流れ", "birth", ["seikaku", "renai"], "ほろすこーぷ 西洋占星術 星座 太陽星座 月星座 金星", "horoscope", "2026-10-11"),
    E("shibi", "紫微斗数", "shibi/", "命盤と14主星で性格・仕事・お金", "birth", ["seikaku", "shigoto"], "しびとすう 命盤 主星", "shibi", "2026-10-11"),
    E("jyotish", "インド占星術", "jyotish/", "ナクシャトラとダシャーで人生の時期", "birth", ["seikaku"], "いんどせんせいじゅつ ジョーティシュ ナクシャトラ ダシャー", "jyotish", "2026-10-11"),
    E("seimei", "姓名判断", "seimei/", "名前の画数で五格を鑑定", "card", ["seikaku"], "せいめいはんだん 名前 画数 五格 総格 人格 名づけ", "seimei", "2026-10-11"),
    E("tanjobi", "誕生日占い", "tanjobi/", "366日の誕生日別の性格・恋愛", "birth", ["seikaku", "renai"], "たんじょうび 誕生日 366日 誕生石 生まれ", "tanjobi", "2026-10-11"),
    E("kippoui", "吉方位", "kippoui/", "今年と来年の吉方位・最大吉方", "kaiun", ["kinun", "kyou"], "きっぽうい 方位 方角 旅行 引っ越し 最大吉方", "kippoui", "2026-10-11"),
    E("eto", "干支（えと）", "eto/", "十二支別の性格と早見表", "kaiun", ["seikaku"], "えと 干支 十二支 年 ねずみ うし とら うさぎ たつ へび うま ひつじ さる とり いぬ いのしし", "eto", "2026-10-11"),
    E("yume", "夢占い", "yume/", "見た夢の意味をキーワードで", "body", ["renai", "kyou"], "ゆめうらない 夢 夢診断 意味", "yume", "2026-10-11"),
    E("tesou", "手相", "tesou/", "線の意味を図解で", "body", ["renai", "kinun", "seikaku"], "てそう 手相 生命線 感情線 頭脳線 運命線 結婚線", "tesou", "2026-10-11"),
    E("hokuro", "ほくろ占い", "hokuro/", "顔と体のほくろの意味を図解で", "body", ["renai", "kinun"], "ほくろ 黒子 顔 位置", "hokuro", "2026-10-15"),
    E("wannyan", "星のわんにゃん占い", "wannyan/", "96タイプの犬・猫にたとえる", "original", ["seikaku"], "わんにゃん 犬 いぬ イヌ 猫 ねこ ネコ ペット 動物 タイプ 診断 オリジナル", "wannyan", "2026-10-15", { rec: true }),
    E("fusui", "風水", "fusui/", "本命卦で見る吉方位と部屋づくり", "kaiun", ["kinun"], "ふうすい 風水 本命卦 八宅 部屋 玄関 寝室 方位", "fusui", "2026-10-15", { rec: true }),
    E("powerstone", "パワーストーン", "powerstone/", "生年月日でわかる守護石", "kaiun", ["kinun", "renai"], "ぱわーすとーん 天然石 石 誕生石 守護石 ブレスレット お守り", "powerstone", "2026-10-15"),
    E("tekishoku", "適職占い", "tekishoku/", "向いている仕事と転職の時期", "original", ["shigoto"], "てきしょく 適職 天職 仕事 転職 キャリア 向いている", "tekishoku", "2026-10-17", { rec: true }),
    E("learn", "占いを知る", "learn/", "占術のしくみと用語の解説", "kaiun", [], "まなぶ 解説 用語 用語集 しくみ", "learn", "2026-09-27", { top: false }),
    // 相性占い
    E("aisho", "相性占い", "aisho/", "8つの占術でふたりの相性", "aisho", ["aisho", "renai", "ningen"], "あいしょう 相性 ふたり カップル 恋人", "aisho", "2026-09-27"),
    E("suhijutsu-aisho", "数秘術の相性", "suhijutsu/aisho/", "ライフパスで見るふたりの相性", "aisho", ["aisho", "renai"], "あいしょう 相性 数秘術", "aisho", "2026-09-27", { top: false }),
    E("seiju-aisho", "星獣カルテの相性", "seiju/aisho/", "星獣どうしの相性", "aisho", ["aisho"], "あいしょう 相性 星獣", "aisho", "2026-09-27", { top: false }),
    E("kyusei-aisho", "九星気学の相性", "kyusei/aisho/", "五行で見るふたりの関係", "aisho", ["aisho", "ningen"], "あいしょう 相性 九星", "aisho", "2026-09-30", { top: false }),
    E("shichusuimei-aisho", "四柱推命の相性", "shichusuimei/aisho/", "日干と通変星の相性", "aisho", ["aisho"], "あいしょう 相性 四柱推命", "aisho", "2026-10-10", { top: false }),
    E("maya-aisho", "マヤ暦の相性", "maya/aisho/", "運命の五角形で見る相性", "aisho", ["aisho"], "あいしょう 相性 マヤ暦", "aisho", "2026-10-10", { top: false }),
    E("shukuyo-aisho", "宿曜占星術の相性", "shukuyo/aisho/", "三九の秘法で見る距離感", "aisho", ["aisho", "ningen"], "あいしょう 相性 宿曜", "aisho", "2026-10-10", { top: false }),
    E("horoscope-aisho", "ホロスコープの相性", "horoscope/aisho/", "天体どうしの相性", "aisho", ["aisho", "renai"], "あいしょう 相性 ホロスコープ 星座", "aisho", "2026-10-11", { top: false }),
    E("shibi-aisho", "紫微斗数の相性", "shibi/aisho/", "命盤で見るふたりの相性", "aisho", ["aisho"], "あいしょう 相性 紫微斗数", "aisho", "2026-10-11", { top: false }),
    E("jyotish-aisho", "インド占星術の相性", "jyotish/aisho/", "36点満点の相性", "aisho", ["aisho", "renai"], "あいしょう 相性 インド占星術", "aisho", "2026-10-11", { top: false }),
    E("seimei-aisho", "名前の相性", "seimei/aisho/", "ふたりの名前の画数で見る相性", "aisho", ["aisho", "renai"], "あいしょう 相性 名前 姓名判断", "aisho", "2026-10-11", { top: false }),
    E("wannyan-aisho", "わんにゃん占いの相性", "wannyan/aisho/", "わんこ×にゃんこで見る相性", "aisho", ["aisho", "renai"], "あいしょう 相性 わんにゃん 犬 猫", "aisho", "2026-10-15", { top: false })
  ];

  // 読みやすさのための並び順（TOPの「占術から探す」）
  var TOP_ORDER = ["tarot", "suhijutsu", "seimei", "yume", "tesou", "tanjobi", "kyusei", "wannyan", "aisho", "shichusuimei", "tekishoku", "fusui",
    "powerstone", "horoscope", "maya", "seiju", "hokuro", "unsei", "kippoui", "koyomi", "eto", "shukuyo", "shibi", "jyotish"];

  var byId = {};
  ITEMS.forEach(function (x) { byId[x.id] = x; });

  return { GROUPS: GROUPS, NAYAMI: NAYAMI, ITEMS: ITEMS, TOP_ORDER: TOP_ORDER, byId: byId };
});
