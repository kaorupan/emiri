/*
 * パワーストーンのデータ（えみりのまとめ）
 *   意味・石言葉は昔から言い伝えられているもの。「〜といわれます」と書き、効果を言い切らない。
 *   硬度はモース硬度のおおよその値。誕生石は全国宝石卸商協同組合の2021年改訂版。
 *   care：sun＝日光で色があせやすい／water＝水や汗に弱い（どちらも、やさしく扱う目安）
 *
 * ブラウザでは window.KaruteContent.stones、Node では module.exports。
 */
(function (root, factory) {
  var api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  root.KaruteContent = root.KaruteContent || {};
  root.KaruteContent.stones = api;
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";

  // 願い
  var WISHES = [
    { id: "renai", name: "恋愛・結婚", icon: "💗", lead: "出会い・片思い・ふたりの関係を育てたいときに" },
    { id: "kinun", name: "金運・豊かさ", icon: "🪙", lead: "お金の流れや、豊かな暮らしを意識したいときに" },
    { id: "shigoto", name: "仕事・勉強", icon: "💼", lead: "集中力や決断力、目標に向かう力がほしいときに" },
    { id: "iyashi", name: "癒やし・心の安定", icon: "🌙", lead: "疲れた心を休めたい、気持ちを落ち着けたいときに" },
    { id: "ningen", name: "人間関係", icon: "🤝", lead: "家族・友人・職場の人とのつながりを大切にしたいときに" },
    { id: "mamori", name: "お守り・厄除け", icon: "🛡️", lead: "身を守り、よくない流れを断ち切りたいときに" }
  ];

  // 色のグループ（五行とも対応させる）
  var COLORS = [
    { id: "white", name: "白・透明", element: "金" }, { id: "pink", name: "ピンク", element: "火" },
    { id: "red", name: "赤・オレンジ", element: "火" }, { id: "yellow", name: "黄・金・茶", element: "土" },
    { id: "green", name: "緑", element: "木" }, { id: "blue", name: "青・水色", element: "水" },
    { id: "purple", name: "紫", element: "火" }, { id: "black", name: "黒・グレー", element: "水" }
  ];

  function S(slug, name, kana, en, group, color, hard, month, wishes, words, meaning, story, care, pair) {
    return { slug: slug, name: name, kana: kana, en: en, group: group, color: color, hardness: hard, month: month,
      wishes: wishes, words: words, meaning: meaning, story: story, care: care, pair: pair };
  }

  var STONES = [
    S("suisho", "水晶", "すいしょう", "Crystal Quartz", "石英（クォーツ）", "white", "7", 0, ["iyashi", "mamori", "shigoto"], "純粋・完全・調和",
      "パワーストーンの基本ともいわれる石。透明な姿から、心や場所を清め、ほかの石の力を引き出すとされます。迷ったときに最初に選ぶ1つにも。",
      "古くから世界中でお守りや祭具に使われ、日本でも勾玉などに加工されてきました。", [], ["amethyst", "rosequartz", "citrine"]),
    S("amethyst", "アメジスト", "あめじすと", "Amethyst", "石英（クォーツ）", "purple", "7", 2, ["iyashi", "renai", "mamori"], "誠実・心の平和・真実の愛",
      "紫水晶とも呼ばれる、気品ある紫色の石。心を落ち着け、穏やかな眠りや、誠実な愛を支える石といわれます。",
      "ギリシャ語で「酔わない」という意味の言葉が名前の由来といわれ、悪酔いを防ぐお守りとされていました。", ["sun"], ["rosequartz", "suisho", "moonstone"]),
    S("rosequartz", "ローズクォーツ", "ろーずくぉーつ", "Rose Quartz", "石英（クォーツ）", "pink", "7", 0, ["renai", "iyashi", "ningen"], "愛・優しさ・美",
      "やわらかなピンク色の、恋愛のお守りとして人気の石。自分を大切にする気持ちと、人を思いやる心を育てるといわれます。",
      "「愛と美の石」として親しまれ、恋愛成就を願う人に選ばれてきました。", ["sun"], ["moonstone", "amethyst", "rhodochrosite"]),
    S("citrine", "シトリン", "しとりん", "Citrine", "石英（クォーツ）", "yellow", "7", 11, ["kinun", "shigoto"], "繁栄・希望・明るさ",
      "太陽のような黄色の石。商売繁盛の石と呼ばれ、明るい気持ちと豊かさを呼びこむといわれます。",
      "11月の誕生石の1つ。黄金色から、お財布の中に入れるお守りとしても親しまれています。", ["sun"], ["tigereye", "rutile", "suisho"]),
    S("tigereye", "タイガーアイ", "たいがーあい", "Tiger's Eye", "石英（クォーツ）", "yellow", "7", 0, ["kinun", "shigoto", "mamori"], "洞察・決断・成功",
      "光の筋が虎の目のように見える石。物事を見通す力と決断力を高め、金運・仕事運のお守りといわれます。",
      "虎の目は「すべてを見通す」とされ、古くから魔よけや勝負のお守りに使われてきました。", [], ["citrine", "onyx", "rutile"]),
    S("rutile", "ルチルクォーツ", "るちるくぉーつ", "Rutilated Quartz", "石英（クォーツ）", "yellow", "6〜7", 0, ["kinun", "shigoto"], "金運・直感・成功",
      "水晶の中に、金色の針のような鉱物が入った石。強い金運と、チャンスをつかむ力を呼ぶといわれます。",
      "中に入った針状の鉱物（ルチル）が光る姿から、「天使の髪」と呼ばれることもあります。", [], ["citrine", "tigereye", "suisho"]),
    S("smoky", "スモーキークォーツ", "すもーきーくぉーつ", "Smoky Quartz", "石英（クォーツ）", "black", "7", 0, ["mamori", "iyashi"], "安定・忍耐・グラウンディング",
      "煙のような茶色がかった水晶。地に足をつけて現実を見つめ、不安や焦りを落ち着かせる石といわれます。",
      "日本では「茶水晶」とも呼ばれ、落ち着いた色合いで男性にも人気があります。", [], ["onyx", "tigereye", "suisho"]),
    S("onyx", "オニキス", "おにきす", "Onyx", "石英（カルセドニー）", "black", "6.5〜7", 0, ["mamori", "shigoto"], "意志・成功・魔よけ",
      "つややかな黒の石。強い意志と自分の軸を保ち、よくないものから身を守るお守りといわれます。",
      "8月の誕生石サードオニックスの仲間。魔よけの石として、古くから装飾品に使われてきました。", [], ["tigereye", "smoky", "hematite"]),
    S("tourmaline", "ブラックトルマリン", "ぶらっくとるまりん", "Black Tourmaline", "トルマリン（電気石）", "black", "7〜7.5", 10, ["mamori", "iyashi"], "浄化・保護",
      "黒くつやのある石。邪気をはね返し、心と体を守るお守りとして人気があります。人混みに出かける日の相棒にも。",
      "トルマリンは温めると電気を帯びる性質から「電気石」とも呼ばれます。10月の誕生石の仲間です。", [], ["suisho", "onyx", "smoky"]),
    S("lapis", "ラピスラズリ", "らぴすらずり", "Lapis Lazuli", "ラピスラズリ", "blue", "5〜5.5", 12, ["mamori", "shigoto"], "幸運・真実・成功",
      "夜空のような深い青に、金色の粒が光る石。古代から「聖なる石」とされ、幸運と真実を見抜く力をもたらすといわれます。",
      "世界最古のパワーストーンの1つともいわれ、日本では「瑠璃（るり）」と呼ばれてきました。12月の誕生石です。", ["water"], ["suisho", "turquoise", "sodalite"]),
    S("turquoise", "ターコイズ", "たーこいず", "Turquoise", "ターコイズ", "blue", "5〜6", 12, ["mamori", "ningen"], "成功・繁栄・旅のお守り",
      "空色の石。旅の安全を守るお守りとして知られ、持ち主を危険から守り、成功へ導くといわれます。",
      "日本名は「トルコ石」。12月の誕生石で、世界各地でお守りとして大切にされてきました。", ["water", "sun"], ["lapis", "suisho", "amazonite"]),
    S("aquamarine", "アクアマリン", "あくあまりん", "Aquamarine", "ベリル", "blue", "7.5〜8", 3, ["ningen", "iyashi", "renai"], "幸福・聡明・勇気",
      "海の水のような淡い青の石。心を穏やかにし、人と心を通わせる力を高めるといわれます。",
      "3月の誕生石。船乗りが航海のお守りにしたという言い伝えがあります。", [], ["moonstone", "suisho", "larimar"]),
    S("moonstone", "ムーンストーン", "むーんすとーん", "Moonstone", "長石（フェルスパー）", "white", "6〜6.5", 6, ["renai", "iyashi"], "愛の予感・純粋・家庭の幸福",
      "月の光のようにやさしく光る石。女性のお守りとして知られ、恋愛や家庭の幸せを支えるといわれます。",
      "6月の誕生石。表面に浮かぶ青白い光が、月の満ち欠けのように見えることから名付けられました。", [], ["rosequartz", "aquamarine", "labradorite"]),
    S("labradorite", "ラブラドライト", "らぶらどらいと", "Labradorite", "長石（フェルスパー）", "black", "6〜6.5", 0, ["shigoto", "mamori"], "直感・創造性",
      "角度によって青や金に光る不思議な石。直感やひらめきを高め、新しい可能性に気づかせてくれるといわれます。",
      "カナダのラブラドール地方で見つかったことが名前の由来です。", [], ["moonstone", "suisho", "iolite"]),
    S("aventurine", "アベンチュリン", "あべんちゅりん", "Aventurine", "石英（クォーツ）", "green", "6.5〜7", 0, ["kinun", "iyashi", "ningen"], "幸運・リラックス・チャンス",
      "やわらかな緑色の石。緊張した心をリラックスさせ、思いがけない幸運やチャンスを呼びこむといわれます。",
      "「インド翡翠」とも呼ばれます。きらきらとした小さな輝きが特徴です。", [], ["citrine", "peridot", "rosequartz"]),
    S("hisui", "翡翠", "ひすい", "Jade", "ヒスイ輝石（ジェダイト）", "green", "6.5〜7", 5, ["kinun", "ningen", "mamori"], "長寿・繁栄・徳",
      "深い緑の、日本の国石。人徳を高め、長寿や繁栄をもたらすお守りとして大切にされてきました。",
      "日本では縄文時代から勾玉などに加工されてきた石で、5月の誕生石の1つです。", [], ["suisho", "aventurine", "malachite"]),
    S("malachite", "マラカイト", "まらかいと", "Malachite", "マラカイト（孔雀石）", "green", "3.5〜4", 0, ["mamori", "iyashi"], "危険回避・再生",
      "孔雀の羽のような縞模様の緑の石。持ち主の身代わりとなって危険から守ると言い伝えられています。",
      "日本名は「孔雀石（くじゃくいし）」。昔は粉にして緑色の顔料にも使われました。", ["water"], ["suisho", "hisui", "lapis"]),
    S("garnet", "ガーネット", "がーねっと", "Garnet", "ガーネット（柘榴石）", "red", "6.5〜7.5", 1, ["renai", "shigoto", "ningen"], "真実・友愛・努力の実り",
      "深い赤色の石。こつこつ続けた努力を実らせ、愛や友情を長く続ける力があるといわれます。",
      "1月の誕生石。柘榴（ざくろ）の実に似ていることから、日本では柘榴石と呼ばれます。", [], ["rosequartz", "carnelian", "suisho"]),
    S("carnelian", "カーネリアン", "かーねりあん", "Carnelian", "石英（カルセドニー）", "red", "6.5〜7", 0, ["shigoto", "renai"], "勇気・行動力・情熱",
      "夕日のようなオレンジ色の石。迷いをふり払い、前に進む勇気と行動力を与えるといわれます。",
      "日本では「紅玉髄（べにぎょくずい）」と呼ばれ、古代エジプトでもお守りに使われていました。", [], ["garnet", "citrine", "tigereye"]),
    S("peridot", "ペリドット", "ぺりどっと", "Peridot", "かんらん石", "green", "6.5〜7", 8, ["iyashi", "kinun"], "夫婦の幸福・明るさ",
      "明るいオリーブグリーンの石。前向きな気持ちと、家庭の明るさをもたらすといわれます。",
      "8月の誕生石。「太陽の石」とも呼ばれ、夜でも輝きを失わないといわれてきました。", [], ["citrine", "aventurine", "suisho"]),
    S("hematite", "ヘマタイト", "へまたいと", "Hematite", "ヘマタイト（赤鉄鉱）", "black", "5.5〜6.5", 0, ["mamori", "shigoto"], "勝利・集中・活力",
      "金属のような銀黒色の石。集中力と活力を高め、試験や試合など勝負ごとのお守りといわれます。",
      "鉄を多くふくむ鉱物で、削ると赤い粉になることから「血の石」を意味する名前がつきました。", ["water"], ["onyx", "tigereye", "suisho"]),
    S("amazonite", "アマゾナイト", "あまぞないと", "Amazonite", "長石（フェルスパー）", "green", "6〜6.5", 0, ["ningen", "iyashi"], "希望・調和",
      "青緑色のさわやかな石。心のもやもやを晴らし、まわりの人との調和を助けるといわれます。",
      "南米のアマゾン川にちなんで名付けられたといわれる、さわやかな色の長石です。", [], ["aquamarine", "aventurine", "turquoise"]),
    S("fluorite", "フローライト", "ふろーらいと", "Fluorite", "フローライト（蛍石）", "purple", "4", 0, ["shigoto", "iyashi"], "集中・知性・整理",
      "紫や緑の、透明感のある石。考えを整理し、集中力を高める「勉強の石」として人気があります。",
      "日本名は「蛍石（ほたるいし）」。熱すると光る性質があることから名付けられました。", ["sun", "water"], ["suisho", "sodalite", "amethyst"]),
    S("sodalite", "ソーダライト", "そーだらいと", "Sodalite", "ソーダライト（方ソーダ石）", "blue", "5.5〜6", 0, ["shigoto", "iyashi"], "冷静・理性・知性",
      "白い模様が入った深い青の石。冷静な判断力と、論理的に考える力を支えるといわれます。",
      "ラピスラズリに似ていますが、金色の粒が少なく、白い模様が多いのが特徴です。", [], ["lapis", "fluorite", "suisho"]),
    S("rhodochrosite", "インカローズ", "いんかろーず", "Rhodochrosite", "ロードクロサイト（菱マンガン鉱）", "pink", "3.5〜4", 0, ["renai", "iyashi"], "情熱的な愛・新しい恋",
      "バラ色の縞模様が美しい石。情熱的な愛と、新しい恋を呼びこむ石として人気があります。",
      "鉱物名は「ロードクロサイト」。アルゼンチンのインカ帝国時代の遺跡で見つかったことから、インカローズと呼ばれます。", ["sun", "water"], ["rosequartz", "moonstone", "suisho"]),
    S("agate", "アゲート", "あげーと", "Agate", "石英（カルセドニー）", "white", "6.5〜7", 0, ["ningen", "mamori"], "家族の絆・長寿",
      "しま模様が美しい石。家族や仲間との絆を深め、穏やかな暮らしを支えるといわれます。",
      "日本では「瑪瑙（めのう）」と呼ばれ、仏教の七宝の1つにも数えられてきました。", [], ["suisho", "carnelian", "onyx"]),
    S("opal", "オパール", "おぱーる", "Opal", "オパール（蛋白石）", "white", "5.5〜6.5", 10, ["renai", "shigoto"], "希望・創造性",
      "虹色の光が遊ぶように輝く石。希望と創造力をもたらし、才能を引き出すといわれます。",
      "10月の誕生石。中に水分をふくんでいるため、乾燥や急な温度の変化に弱い繊細な石です。", ["water", "sun"], ["moonstone", "suisho", "rosequartz"]),
    S("iolite", "アイオライト", "あいおらいと", "Iolite", "コーディエライト（菫青石）", "blue", "7〜7.5", 3, ["shigoto", "ningen"], "道しるべ・初志貫徹",
      "見る角度で青や紫に色が変わる石。迷ったときの道しるべになり、目標へ導くといわれます。",
      "3月の誕生石の1つ。昔の船乗りが、太陽の方向を知る道具に使ったという言い伝えがあります。", [], ["labradorite", "lapis", "suisho"]),
    S("larimar", "ラリマー", "らりまー", "Larimar", "ペクトライト", "blue", "4.5〜5", 0, ["iyashi", "ningen"], "愛と平和・癒やし",
      "カリブの海のような水色の石。張りつめた心をやさしく癒やし、愛と平和をもたらす石といわれます。",
      "カリブ海のドミニカ共和国でしか採れない、世界三大ヒーリングストーンの1つとされる石です。", ["sun", "water"], ["aquamarine", "moonstone", "suisho"]),
    S("morganite", "モルガナイト", "もるがないと", "Morganite", "ベリル", "pink", "7.5〜8", 4, ["renai", "iyashi"], "優美・清らかな愛",
      "桃色のやさしい輝きの石。思いやりにあふれた、清らかで穏やかな愛を育てるといわれます。",
      "2021年から4月の誕生石に加わりました。アクアマリンやエメラルドと同じベリルの仲間です。", [], ["rosequartz", "aquamarine", "moonstone"])
  ];

  // 誕生石（2021年改訂版）。このサイトに解説ページがない石は名前だけ
  var BIRTHSTONES = {
    1: ["garnet"], 2: ["amethyst", "クリソベリル・キャッツアイ"], 3: ["aquamarine", "iolite", "サンゴ", "ブラッドストーン"],
    4: ["ダイヤモンド", "morganite"], 5: ["エメラルド", "hisui"], 6: ["真珠", "moonstone", "アレキサンドライト"],
    7: ["ルビー", "スフェーン"], 8: ["peridot", "サードオニックス", "スピネル"], 9: ["サファイア", "クンツァイト"],
    10: ["opal", "tourmaline"], 11: ["citrine", "トパーズ"], 12: ["turquoise", "lapis", "タンザナイト", "ジルコン"]
  };

  // 五行（九星の本命星の五行）→ 色
  var ELEMENT_COLORS = { "木": ["green"], "火": ["red", "pink", "purple"], "土": ["yellow"], "金": ["white"], "水": ["blue", "black"] };

  // ライフパスナンバー → えみりが選ぶテーマの石（えみり独自の組み合わせ）
  var LIFEPATH = {
    1: ["carnelian", "行動力と決断力を支える石"], 2: ["moonstone", "やさしさと協調性を守る石"], 3: ["citrine", "明るさと表現力を広げる石"],
    4: ["tigereye", "努力をこつこつ実らせる石"], 5: ["aquamarine", "自由な挑戦と出会いを守る石"], 6: ["rosequartz", "愛情と思いやりを育てる石"],
    7: ["amethyst", "探究心と直感を深める石"], 8: ["rutile", "実行力と豊かさを呼ぶ石"], 9: ["larimar", "包容力と癒やしの心を支える石"],
    11: ["labradorite", "ひらめきと直感を磨く石"], 22: ["hisui", "大きな目標と信頼を支える石"], 33: ["suisho", "大きな愛と調和を広げる石"]
  };

  var bySlug = {};
  STONES.forEach(function (s) { bySlug[s.slug] = s; });

  return { WISHES: WISHES, COLORS: COLORS, STONES: STONES, BIRTHSTONES: BIRTHSTONES, ELEMENT_COLORS: ELEMENT_COLORS, LIFEPATH: LIFEPATH, bySlug: bySlug };
});
