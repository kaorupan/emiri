/*
 * 四柱推命の鑑定文の組み立て（DOM操作なし）
 * エンジンの命式 → 画面に出す表示用データ
 *
 * 文章の出どころを分けています。
 *   - TRADITION：四柱推命で一般的に説明される位置づけ（日干・通変星・十二運・五行・天中殺とは何か）
 *   - DAY_MASTER ほか：えみり独自の読み解き文（十干・通変星などの伝統的な意味をもとに、サイトが書いた文章）
 */
(function (root, factory) {
  if (typeof module === "object" && module.exports) {
    module.exports = factory();
  } else {
    root.KaruteContent = root.KaruteContent || {};
    root.KaruteContent.shichusuimei = factory();
  }
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";

  var TRADITION = {
    dayMaster: "日干（にっかん）は、生まれた日の干支の上の文字です。四柱推命では、命式の中で「自分自身」を表す中心とされ、ほかのすべての文字は日干から見た関係として読みます。",
    chushin: "中心星は、生まれた月の地支に蔵された干（本気）を、日干から見た通変星です。生まれた季節の力が強く表れる場所とされ、その人の考え方や行動の傾向を代表する星として読まれます。",
    juniun: "十二運は、日干の勢いが十二支のどこで強まり弱まるかを、人の一生（長生から養まで）になぞらえたものです。ここでは日柱の十二運を、あなたのエネルギーの出し方として読みます。",
    elements: "命式の8文字（時刻が分からない場合は6文字）を、木・火・土・金・水の五行に分けて数えたものです。多い五行はその人の目立つ性質に、少ない・ない五行はほかの人や環境から補うとよいものとして読まれます。",
    kuubou: "天中殺（空亡）は、日柱の干支が属するまとまり（旬）で決まる、十干と組まない2つの十二支です。その十二支の年・月は、自分の力だけで物事を動かしにくい時期とされます。",
    years: "その年（立春から次の立春の前まで）の干支を、日干から見た通変星と十二運で読みます。年の干支は九星気学と同じく立春で切り替わります。"
  };

  // ---------------- 日干（十干）：えみりの読み解き ----------------
  var DAY_MASTER = {
    "甲": {
      nature: "大樹", element: "木",
      catch: "まっすぐ上へ伸びる、まわりを支える大きな木",
      body: "甲（きのえ）は、空に向かってまっすぐ伸びる大きな木にたとえられます。目標を決めたら曲げずに伸びていく芯の強さと、自然と人の上に立つ雰囲気を持っています。正義感が強く、筋の通らないことには黙っていられないところも。頼られると力を発揮する、面倒見のよいリーダー気質です。",
      strength: "向上心、責任感、まっすぐさ、人を引っぱる力",
      caution: "折れにくい反面、柔軟に曲がるのは苦手。意地を張りすぎたら、一度ほかの見方を取り入れてみて。",
      work: "目標がはっきりした仕事、人をまとめる立場、ゼロから育てていく仕事で伸びます。",
      love: "守りたい相手には誠実で一途。弱みを見せるのが苦手なので、甘えられる相手がいると安らぎます。"
    },
    "乙": {
      nature: "草花", element: "木",
      catch: "しなやかに風を受け流し、どこでも根を張る草花",
      body: "乙（きのと）は、草花やつる草にたとえられます。風が吹けばしなり、また元に戻るしなやかさがあり、環境に合わせて上手に生きる力を持っています。人当たりがやわらかく、協調性も抜群。見た目の穏やかさとは裏腹に、粘り強く、簡単にはあきらめない芯があります。",
      strength: "柔軟さ、協調性、粘り強さ、人とつながる力",
      caution: "まわりに合わせすぎて、自分の本音を見失うことも。ときどき「自分はどうしたい？」と確かめて。",
      work: "人と人をつなぐ仕事、細やかな気配りが生きる仕事、チームを支える役割で力を発揮します。",
      love: "相手に寄り添う、やさしい恋愛をします。頼れる相手のそばで、のびのびと咲けるタイプです。"
    },
    "丙": {
      nature: "太陽", element: "火",
      catch: "まわりを明るく照らす、あたたかな太陽",
      body: "丙（ひのえ）は、空に輝く太陽にたとえられます。明るく開放的で、いるだけで場がぱっと明るくなる存在。隠しごとが苦手で、気持ちがそのまま表に出る素直さも魅力です。人を分けへだてなく照らすおおらかさがあり、自然と人が集まってきます。",
      strength: "明るさ、行動力、おおらかさ、人を元気にする力",
      caution: "熱しやすく冷めやすい面も。勢いで始めたことは、続けるための仕組みを作っておくと◎。",
      work: "人前に立つ仕事、場を盛り上げる仕事、新しいことを広める役割で輝きます。",
      love: "好きになったらまっすぐ。駆け引きより、気持ちを素直に伝える恋愛が向いています。"
    },
    "丁": {
      nature: "灯火", element: "火",
      catch: "暗がりを静かに照らす、ろうそくの灯",
      body: "丁（ひのと）は、ろうそくやランプの灯にたとえられます。太陽のような派手さはなくても、暗い場所で人の心をあたため、道を照らす存在です。感受性が豊かで、物事の本質を見抜く鋭さがあります。内に秘めた情熱は強く、一度灯った思いは長く燃え続けます。",
      strength: "洞察力、集中力、思いやり、内に秘めた情熱",
      caution: "考えすぎて気持ちが揺れやすいことも。ひとりで抱えず、信頼できる人に話すと灯が安定します。",
      work: "専門性を深める仕事、人の心に寄り添う仕事、ものづくりや表現の分野で力を発揮します。",
      love: "深く、長く愛するタイプ。心を許した相手には、とてもあたたかな一面を見せます。"
    },
    "戊": {
      nature: "山", element: "土",
      catch: "どっしりと動じない、大きな山",
      body: "戊（つちのえ）は、大きな山にたとえられます。少しのことでは動じない安定感と、包容力を持つ人です。まわりの人はあなたのそばにいると安心します。信用を大切にし、約束を守る誠実さも魅力。じっくり時間をかけて、大きなものを築いていく力があります。",
      strength: "安定感、包容力、信頼される力、粘り強さ",
      caution: "腰が重く、変化への対応が遅れることも。小さく試してみる習慣が、山に新しい風を通します。",
      work: "長く続く仕事、人や組織の土台を支える仕事、信用が大切な分野で頼りにされます。",
      love: "ゆっくり距離を縮め、一度決めた相手を大切にする安定型。言葉にするのが少し苦手かも。"
    },
    "己": {
      nature: "田畑", element: "土",
      catch: "種を受け止め、実りを育てる田畑の土",
      body: "己（つちのと）は、田畑のやわらかな土にたとえられます。人や物事を受け止め、育てる力を持った人です。気配りが細やかで、まわりの人の才能を引き出すのが上手。現実的で計画性もあり、コツコツと積み上げたものを確かな実りに変えていきます。",
      strength: "育てる力、気配り、計画性、現実的な判断力",
      caution: "人の世話を焼きすぎて疲れてしまうことも。自分を育てる時間も意識してとって。",
      work: "人を育てる仕事、サポートや調整役、コツコツ積み上げる専門職で信頼を集めます。",
      love: "相手に尽くす、家庭的な恋愛をします。感謝の言葉をくれる相手と相性がよいでしょう。"
    },
    "庚": {
      nature: "鋼", element: "金",
      catch: "鍛えられるほど強くなる、刀や鋼",
      body: "庚（かのえ）は、刀や鋼、鉱石にたとえられます。決断力と行動力があり、白黒はっきりさせたいタイプ。困難にぶつかるほど鍛えられて強くなる、たくましさを持っています。義理人情に厚く、仲間を守るためなら一歩も引きません。",
      strength: "決断力、実行力、たくましさ、仲間を守る力",
      caution: "言葉がまっすぐすぎて、相手を傷つけてしまうことも。ひと呼吸おいてから伝えると◎。",
      work: "スピードと判断が求められる仕事、改革や立て直し、勝負の場面で力を発揮します。",
      love: "好きな人には一直線。さっぱりした関係を好み、裏表のない相手と長続きします。"
    },
    "辛": {
      nature: "宝石", element: "金",
      catch: "磨かれて光を放つ、繊細な宝石",
      body: "辛（かのと）は、宝石や貴金属にたとえられます。美意識が高く、品のよさと繊細な感性を持った人です。磨かれるほど輝くタイプで、経験を重ねるごとに魅力が増していきます。プライドが高く傷つきやすい面もありますが、それだけ物事を丁寧に扱う人でもあります。",
      strength: "美意識、繊細さ、こだわり、品格",
      caution: "完璧を求めすぎて、自分にも人にも厳しくなりがち。小さな傷も味わいだと思えると楽に。",
      work: "美しさや質を追求する仕事、専門的な技術職、細部にこだわる分野で輝きます。",
      love: "大切に扱ってくれる相手に心を開きます。理想が高いぶん、出会いには少し時間をかけて。"
    },
    "壬": {
      nature: "大河", element: "水",
      catch: "広く流れ、すべてを受け入れる大河や海",
      body: "壬（みずのえ）は、大きな川や海にたとえられます。スケールが大きく、自由を愛する人です。知識欲が旺盛で、さまざまな人や情報を受け入れる懐の深さがあります。ひとつの場所にとどまるより、流れながら世界を広げていくのが得意です。",
      strength: "自由な発想、行動範囲の広さ、知性、包容力",
      caution: "勢いがありすぎると、まわりを押し流してしまうことも。流れの向きを決める目標を持つと◎。",
      work: "移動や交流の多い仕事、情報を扱う仕事、海外や新しい分野に関わる仕事で伸びます。",
      love: "束縛を嫌い、自由な関係を好みます。お互いの世界を尊重できる相手と長続きします。"
    },
    "癸": {
      nature: "雨露", element: "水",
      catch: "大地をうるおす、やさしい雨や霧",
      body: "癸（みずのと）は、雨や霧、朝露にたとえられます。静かでやさしく、相手の気持ちを察する力にすぐれた人です。目立つことは好まなくても、まわりをそっとうるおす存在。想像力や直感が豊かで、知恵を使って物事を進めるのが得意です。",
      strength: "共感力、直感、想像力、物事を見通す知恵",
      caution: "まわりの気分に影響を受けやすい面も。ひとりで心を整える時間を大切にして。",
      work: "企画や研究、人の話を聴く仕事、芸術やことばを扱う分野で力を発揮します。",
      love: "相手の気持ちに寄り添う、繊細でやさしい恋愛をします。安心できる相手だと素直になれます。"
    }
  };

  // ---------------- 通変星：えみりの読み解き ----------------
  var TSUHEN = {
    "比肩": { keyword: "自立・マイペース", body: "比肩は、自分と同じ五行・同じ陰陽の星。自分の足で立ち、自分のやり方を貫く力を表します。人に頼るより自分で決めたい独立心があり、ひとつのことを続ける粘り強さもあります。協力するときも対等な関係が心地よいタイプです。" },
    "劫財": { keyword: "仲間・負けず嫌い", body: "劫財は、自分と同じ五行で陰陽が異なる星。人と協力しながら、ここぞという場面で勝ちにいく力を表します。仲間思いで社交的な一方、内には強い負けず嫌いを秘めています。チームの中で競い合うほど力が出るタイプです。" },
    "食神": { keyword: "楽しむ・表現", body: "食神は、自分が生み出す五行で陰陽が同じ星。おいしいもの、楽しいこと、のびのびした表現を表します。おおらかで人を和ませ、好きなことを素直に楽しめる人。楽しみながら取り組むことが、そのまま才能になります。" },
    "傷官": { keyword: "感性・鋭さ", body: "傷官は、自分が生み出す五行で陰陽が異なる星。鋭い感性と、物事を細かく見抜く力を表します。美意識や理想が高く、言葉や表現にキレがある人。妥協しない姿勢が、ほかの人にはまねできない仕事につながります。" },
    "偏財": { keyword: "社交・サービス", body: "偏財は、自分が抑える五行で陰陽が同じ星。人やお金を広く動かす力を表します。人づきあいが上手でサービス精神旺盛、場の空気を読んで人を喜ばせるのが得意。多くの人とのご縁が、チャンスを運んできます。" },
    "正財": { keyword: "誠実・コツコツ", body: "正財は、自分が抑える五行で陰陽が異なる星。こつこつと積み上げ、確かなものを手に入れる力を表します。誠実で堅実、信用を大切にする人。家庭や身近な人を守る安定感があり、時間をかけるほど豊かさが増えていきます。" },
    "偏官": { keyword: "行動・勇気", body: "偏官は、自分を抑える五行で陰陽が同じ星。困難に立ち向かう行動力と勇気を表します。スピード感があり、決断が早い人。人のために体を張れる正義感もあり、ピンチの場面ほど頼りになります。" },
    "正官": { keyword: "責任・品格", body: "正官は、自分を抑える五行で陰陽が異なる星。ルールや約束を守り、責任を果たす力を表します。きちんとしていて品があり、まわりから信頼される人。役割を与えられると、期待以上の結果で応えようとします。" },
    "偏印": { keyword: "ひらめき・自由", body: "偏印は、自分を生む五行で陰陽が同じ星。ひらめきや独創性、型にはまらない発想を表します。好奇心旺盛で、人と違う視点を持つ人。束縛を嫌い、新しいことを次々と学ぶ中で、思いがけない才能を見つけます。" },
    "印綬": { keyword: "知性・学び", body: "印綬は、自分を生む五行で陰陽が異なる星。学び、知恵、伝統や目上からの恵みを表します。知的で思慮深く、物事をじっくり理解したい人。学んだことを深めて人に伝える力があり、年を重ねるほど信頼が増します。" }
  };

  // 年運の通変星
  var YEAR_TSUHEN = {
    "比肩": "自分の力で道を切りひらく年。人に合わせるより、自分のペースで決めたことを進めると実を結びます。",
    "劫財": "仲間との協力と、ほどよい競争が力になる年。人とのつながりが広がる一方、お金の出入りには少し注意を。",
    "食神": "楽しむことが運を開く年。趣味や好きなことに時間を使うと、心にもからだにも余裕が生まれます。",
    "傷官": "感性が冴え、表現力が高まる年。鋭さが言葉に出やすいので、伝え方にひと工夫を。",
    "偏財": "人との出会いとチャンスが増える年。フットワーク軽く動くほど、ご縁が広がります。",
    "正財": "地道な積み重ねが形になる年。暮らしやお金の土台を整えると、安心感が増していきます。",
    "偏官": "挑戦と変化の年。忙しくなりやすいぶん、思い切った行動が大きな成長につながります。",
    "正官": "責任ある役割を任されやすい年。誠実に取り組むことで、評価や信頼が高まります。",
    "偏印": "新しいことを学びたくなる年。予定外の出来事も、視野を広げるきっかけとして楽しんで。",
    "印綬": "学びと準備の年。資格や勉強、目上の人からの助言が、これからの力になります。"
  };

  // ---------------- 十二運（日柱）：えみりの読み解き ----------------
  var JUNIUN = {
    "長生": "生まれたばかりの赤ちゃんのような、素直さと伸びしろを持つ運。人から自然とかわいがられ、新しい環境にもすっとなじめます。",
    "沐浴": "産湯につかる幼子のような、自由で好奇心いっぱいの運。変化を楽しめる一方、気分の波には少し注意を。",
    "冠帯": "成人を迎えた若者のような、華やかで自信にあふれた運。人前に出るほど輝き、プライドが原動力になります。",
    "建禄": "社会で一人前に働く大人のような、堅実で安定した運。自分の力で着実に結果を出していけます。",
    "帝旺": "人生の頂点に立つ王のような、もっとも勢いの強い運。リーダーシップがあり、自分の信じた道を進みます。",
    "衰": "経験を重ねた円熟期のような、落ち着いた運。一歩引いて全体を見渡す、大人の冷静さがあります。",
    "病": "静かに内面を見つめる時期のような、感受性豊かな運。想像力や優しさにすぐれ、人の痛みに寄り添えます。",
    "死": "動きを止めて深く考える運。ひとつのことを極める集中力があり、探究心が強みになります。",
    "墓": "大切なものを蔵にしまうような、堅実で根気のある運。伝統や家族を大事にし、コツコツと財を守ります。",
    "絶": "すべてがリセットされる、まっさらな運。発想が自由で、思い切った行動や方向転換を恐れません。",
    "胎": "母のおなかに宿った命のような、可能性に満ちた運。新しいことへの興味が尽きず、アイデアが豊かです。",
    "養": "大切に育てられる赤ちゃんのような、おっとりとした運。人に恵まれ、穏やかな環境でじっくり力を伸ばします。"
  };

  // ---------------- 五行：多い／ない ----------------
  var ELEMENT = {
    "木": { image: "成長・やさしさ", many: "木が多い命式は、伸びようとする力が強く、向上心と思いやりにあふれています。一方で、あれもこれもと手を広げすぎる面も。", none: "木がない命式は、成長のペースをゆっくり守れる人。新しいことを始めるときは、植物や朝の散歩など「伸びるもの」を身近に置くと、背中を押してもらえます。" },
    "火": { image: "情熱・表現", many: "火が多い命式は、情熱的で表現力が豊か。人を惹きつける明るさがありますが、燃えすぎて疲れないよう、休む時間も大切に。", none: "火がない命式は、冷静で落ち着いた人。気持ちを表に出すのが少し苦手なら、明るい色や、あたたかな場所・人を味方につけて。" },
    "土": { image: "安定・信頼", many: "土が多い命式は、どっしりとした安定感と信頼感があります。動じない強さの一方で、腰が重くなりやすい面も。", none: "土がない命式は、身軽で変化に強い人。そのぶん、生活のリズムや帰る場所など「よりどころ」を意識して作ると安定します。" },
    "金": { image: "決断・けじめ", many: "金が多い命式は、決断力とけじめがあり、物事をきっぱり進められます。ときには言葉をやわらかく包む意識を。", none: "金がない命式は、やさしく情に厚い人。決めごとを後回しにしがちなら、期限を決める・手帳に書くなど「区切る仕組み」が助けになります。" },
    "水": { image: "知恵・柔軟さ", many: "水が多い命式は、頭の回転が速く、柔軟で知恵のある人。考えすぎて迷うときは、からだを動かすとすっきりします。", none: "水がない命式は、行動が先に立つタイプ。読書や水辺での休息など、立ち止まって考える時間が新しい知恵を運んでくれます。" }
  };

  // ---------------- 天中殺：えみりの読み解き ----------------
  var KUUBOU = {
    "子丑": "子丑天中殺は、目上や親からの援助より、自分の力で道を開くタイプとされます。早くから自立心が強く、独自の道で成果を出していく人です。",
    "寅卯": "寅卯天中殺は、行動力と実行力に恵まれたタイプとされます。現実的で、思い立ったらすぐ動ける反面、スタートを焦らない意識が大切です。",
    "辰巳": "辰巳天中殺は、型にはまらない個性と、波乱をも力に変えるタイプとされます。普通では満足できない、独特の感性を持つ人です。",
    "午未": "午未天中殺は、冷静さとバランス感覚にすぐれたタイプとされます。家族や身近な人を大切にし、地に足のついた判断ができる人です。",
    "申酉": "申酉天中殺は、エネルギッシュで、多くのことを同時にこなせるタイプとされます。動きながら考える人で、忙しいほど力を発揮します。",
    "戌亥": "戌亥天中殺は、精神性が高く、理想を追い求めるタイプとされます。目に見えない価値や、心の豊かさを大切にする人です。"
  };

  var PILLAR_LABEL = { year: "年柱", month: "月柱", day: "日柱", hour: "時柱" };

  function pad2(n) { return n < 10 ? "0" + n : String(n); }
  function yearLabel(y) {
    if (y <= 0) return "紀元前" + (1 - y) + "年";
    var s = String(y);
    while (s.length < 4) s = "0" + s;
    return s + "年";
  }
  function dateLabel(d) { return yearLabel(d.year) + d.month + "月" + d.day + "日"; }
  function timeLabel(t) { return t.hour + ":" + pad2(t.minute); }
  function momentLabel(m) { return dateLabel(m.jst) + " " + timeLabel(m.jst); }

  function tableRow(p) {
    return {
      key: p.key,
      label: PILLAR_LABEL[p.key],
      stem: p.stem.name, stemReading: p.stem.reading, stemElement: p.stem.element,
      branch: p.branch.name, branchReading: p.branch.reading, branchElement: p.branch.element,
      hidden: p.hidden.name,
      stemTsuhen: p.key === "day" ? "自分" : p.stemTsuhen.name,
      branchTsuhen: p.branchTsuhen.name,
      juniun: p.juniun.name,
      empty: false
    };
  }

  function boundaryView(r) {
    var info = r.solarTermInfo, b = info.boundary, alt = r.alternative;
    if (!b) return null;
    var termLabel = b.term.term + "（" + momentLabel(b.term) + "・日本時間）";
    var isYear = b.term.index === 0;
    var what = isYear ? "年柱と月柱" : "月柱";
    var altText = alt ? "年柱 " + alt.year.name + "・月柱 " + alt.month.name + "（中心星 " + alt.chushin.name + "）" : "";
    if (b.kind === "on-day") {
      return {
        level: "warn",
        title: "生まれた時刻によって結果が変わる可能性があります",
        text: "この日は" + termLabel + "の当日です。生まれた時刻によって" + what + "が変わる可能性があります。時刻を入力しない場合は、節入りの日から新しい" + (isYear ? "年" : "月") + "として判定しています。",
        alt: timeLabel(b.term.jst) + "より前に生まれた場合は、" + altText + "になります。",
        canUseTime: true
      };
    }
    if (b.kind === "near-edge") {
      return {
        level: "warn",
        title: "生まれた時刻によって結果が変わる可能性があります",
        text: termLabel + "が、日付の変わり目のすぐ" + (b.side === "after" ? "前" : "あと") + "にあります。計算の誤差（前後およそ" + info.marginMinutes + "分）を考えると、" + what + "が変わる可能性が残ります。",
        alt: "節入りの" + (b.side === "after" ? "前" : "あと") + "として判定した場合は、" + altText + "になります。",
        canUseTime: true
      };
    }
    if (b.kind === "near-time") {
      return {
        level: "warn",
        title: "節入りの時刻とほぼ同じ時刻です",
        text: "入力された時刻（" + timeLabel(r.input.time) + "）は、" + termLabel + "と前後およそ" + info.marginMinutes + "分以内です。計算の誤差の範囲なので、" + what + "が入れ替わる可能性があります。ここでは節入りの" + (b.side === "after" ? "あと" : "前") + "として判定しています。",
        alt: "節入りの" + (b.side === "after" ? "前" : "あと") + "だった場合は、" + altText + "になります。",
        canUseTime: false
      };
    }
    return {
      level: "info",
      title: "節入りの当日です（生まれた時刻で判定しました）",
      text: "この日は" + termLabel + "の当日です。入力された時刻（" + timeLabel(r.input.time) + "）は節入りの" + (b.side === "after" ? "あと" : "前") + "なので、この結果で確定しています。",
      alt: null,
      canUseTime: false
    };
  }

  function elementsView(r) {
    var list = r.elements.map(function (e) {
      return { element: e.element, count: e.count, ratio: e.ratio, image: ELEMENT[e.element].image };
    });
    var max = Math.max.apply(null, r.elements.map(function (e) { return e.count; }));
    var many = r.elements.filter(function (e) { return e.count === max && e.count >= 3; }).map(function (e) { return e.element; });
    var none = r.elements.filter(function (e) { return e.count === 0; }).map(function (e) { return e.element; });
    var texts = [];
    many.forEach(function (e) { texts.push(["多い五行：" + e, ELEMENT[e].many]); });
    none.forEach(function (e) { texts.push(["ない五行：" + e, ELEMENT[e].none]); });
    var summary;
    if (!many.length && !none.length) summary = "五行がまんべんなくそろった、バランスのよい命式です。どの場面でも力を発揮しやすい一方、「これ」という強みを意識して育てると、個性がよりはっきりします。";
    else summary = (many.length && none.length ? many.join("・") + "が多く、" + none.join("・") + "がない" : many.length ? many.join("・") + "が多い" : none.join("・") + "がない") + "命式です。日干の" + r.dayMaster.name + "（" + r.dayMaster.element + "）を中心に、目立つ力と補いたい力を見てみましょう。";
    return { list: list, total: r.hasTime ? 8 : 6, summary: summary, texts: texts };
  }

  /**
   * 表示用データ
   * @param {Object} r engines/shichusuimei.js の calculateShichusuimei の結果
   * @param {{year:number, month:number, day:number}} today 年運の起点（日本時間の今日）
   * @param {Object} [engine] yearFortunes を持つエンジン（省略時は r.years をそのまま使う）
   */
  function buildShichusuimeiView(r, today, engine) {
    var eng = engine || (typeof require === "function" ? require("../engines/shichusuimei.js") : null);
    var dm = DAY_MASTER[r.dayMaster.name];
    var others = [];
    ["year", "month", "hour"].forEach(function (k) {
      var p = r.byKey[k];
      if (!p) return;
      [p.stemTsuhen, p.branchTsuhen].forEach(function (t) {
        if (t.name !== r.chushin.name && others.indexOf(t.name) < 0) others.push(t.name);
      });
    });
    var dayBranchT = r.byKey.day.branchTsuhen.name;
    if (dayBranchT !== r.chushin.name && others.indexOf(dayBranchT) < 0) others.push(dayBranchT);
    var years = eng.yearFortunes(r, today, 3).map(function (f) {
      return {
        year: f.year, name: f.name, tsuhen: f.tsuhen.name, juniun: f.juniun.name,
        text: YEAR_TSUHEN[f.tsuhen.name], kuubou: f.isKuubou
      };
    });
    var table = r.pillars.map(tableRow);
    if (!r.hasTime) table.push({ key: "hour", label: "時柱", empty: true });
    var kName = r.kuubou.name.slice(0, 2);
    return {
      birthLabel: dateLabel(r.input) + (r.input.time ? " " + timeLabel(r.input.time) : ""),
      hasTime: r.hasTime,
      precision: r.precision,
      precisionNote: r.precision === "verified" ? null : "この年代は、節入り（立春など）の時刻が推定になります。境界に近い日は実際と異なる可能性があります。",
      table: table,
      dayMaster: {
        name: r.dayMaster.name, reading: r.dayMaster.reading, element: r.dayMaster.element,
        yang: r.dayMaster.yang, nature: dm.nature, catchphrase: dm.catch, body: dm.body,
        facts: [["五行・陰陽", r.dayMaster.element + "の" + (r.dayMaster.yang ? "陽" : "陰")], ["たとえ", dm.nature], ["強み", dm.strength]],
        caution: dm.caution, work: dm.work, love: dm.love,
        tradition: TRADITION.dayMaster
      },
      chushin: {
        name: r.chushin.name, reading: r.chushin.reading, keyword: TSUHEN[r.chushin.name].keyword,
        body: TSUHEN[r.chushin.name].body, tradition: TRADITION.chushin
      },
      others: others.map(function (n) { return { name: n, keyword: TSUHEN[n].keyword, body: TSUHEN[n].body }; }),
      juniun: { name: r.byKey.day.juniun.name, reading: r.byKey.day.juniun.reading, body: JUNIUN[r.byKey.day.juniun.name], tradition: TRADITION.juniun },
      elements: Object.assign(elementsView(r), { tradition: TRADITION.elements }),
      kuubou: {
        name: r.kuubou.name, body: KUUBOU[kName], tradition: TRADITION.kuubou,
        note: "天中殺の年は「悪い年」ではなく、新しく大きく始めるより、整える・学ぶ・見直すことに向いた時期として読んでいます。"
      },
      years: years,
      yearsTradition: TRADITION.years,
      boundary: boundaryView(r),
      termLine: "年柱は立春（" + momentLabel(r.solarTermInfo.risshun) + "）から、月柱は" + r.solarTermInfo.termStart.term + "（" + momentLabel(r.solarTermInfo.termStart) + "）から判定しています。"
    };
  }

  // ---------------- 相性：えみりの読み解き ----------------
  var COMPAT_TRADITION = "四柱推命の相性は、ふたりの日干（自分自身を表す文字）どうしの関係を中心に見ます。とくに「干合」（甲と己、乙と庚、丙と辛、丁と壬、戊と癸）は、陰と陽が引き合い、結びつく組み合わせとされます。あわせて、相手が自分にとって何の通変星に当たるか、日支（生まれた日の十二支）どうしの関係、五行の補い合いを読みます。";

  var STEM_REL = {
    kangou: { label: "干合（引き合う組み合わせ）", text: "ふたりの日干は「干合」の関係。陰と陽が自然に引き合い、出会ったときから不思議と気になる、結びつきの強い組み合わせです。一緒にいると、お互いの性質が少しずつ混ざり合い、ふたりでひとつのチームのようになっていきます。" },
    same: { label: "比和（同じ五行）", text: "ふたりの日干は同じ五行。感じ方や大切にしたいものが近く、説明しなくても分かり合える気楽さがあります。似ているぶん、同じところでつまずきやすいので、どちらかが一歩引いて全体を見る役を交代でとると◎。" },
    generates: { label: "相生（あなたが力を渡す）", text: "あなたの五行がお相手の五行を生む関係。あなたの存在が、お相手の力や自信を自然に引き出します。あなたは与える側になりやすいので、お相手からの感謝や支えを素直に受け取ることも大切に。" },
    generated: { label: "相生（お相手が力をくれる）", text: "お相手の五行があなたの五行を生む関係。お相手のそばにいると、あなたは安心して力を発揮できます。受け取るだけにならないよう、ことばや行動で感謝を返すと、関係がさらに温まります。" },
    controls: { label: "相剋（あなたが引き締める）", text: "あなたの五行がお相手の五行を抑える関係。あなたはお相手を引き締め、方向を整える役になりやすい組み合わせです。言いすぎると窮屈に感じさせるので、伝えるときはやわらかく、認めることばを先に。" },
    controlled: { label: "相剋（お相手が引き締める）", text: "お相手の五行があなたの五行を抑える関係。お相手は、あなたに足りない視点やけじめを持ち込んでくれる存在です。ときに厳しく感じても、それはあなたを鍛え、成長させる刺激になります。" }
  };

  var AS_PARTNER = {
    "比肩": "対等な仲間。同じ目線で並んで歩ける相手です。競い合うより、それぞれの得意を生かして協力すると心強い関係に。",
    "劫財": "刺激し合うライバル的な仲間。一緒にいると負けず嫌いな面が出て、互いを高め合えます。主導権の取り合いには注意。",
    "食神": "一緒にいて楽しく、肩の力が抜ける相手。あなたが自然体でいられ、好きなことを楽しむ時間が増えていきます。",
    "傷官": "あなたの感性を鋭く刺激する相手。新しい発想をもらえる一方、言葉がきつく響くことも。率直さを大切にしつつ、思いやりを添えて。",
    "偏財": "人やチャンスとの縁を広げてくれる相手。一緒に出かけたり、新しい人と出会ったりする機会が増えます。",
    "正財": "誠実で、日々の暮らしを支えてくれる相手。四柱推命では、男性にとって正財は妻の星ともされ、安定した関係を築きやすい組み合わせです。",
    "偏官": "あなたを行動へと駆り立てる相手。困難な場面で頼りになる一方、ペースを乱されると感じることも。",
    "正官": "きちんとしていて、あなたを正しい方向へ導いてくれる相手。四柱推命では、女性にとって正官は夫の星ともされ、信頼で結ばれやすい組み合わせです。",
    "偏印": "思いがけない発想や新しい世界を見せてくれる相手。一緒にいると好奇心が刺激され、視野が広がります。",
    "印綬": "あなたを見守り、知恵や安心を与えてくれる相手。困ったときに相談したくなる、支えになる存在です。"
  };

  var BRANCH_REL = {
    shigou: { label: "支合（しごう）", text: "ふたりの日支は「支合」。日常の中で自然に寄り添える、家庭的でなじみやすい組み合わせです。一緒に暮らしたり、長い時間を過ごしたりするほど、心地よさが増していきます。" },
    sangou: { label: "三合（さんごう）", text: "ふたりの日支は「三合」のグループ。目指す方向がそろいやすく、同じ目標に向かって力を合わせると大きな成果を生む組み合わせです。" },
    chuu: { label: "冲（ちゅう）", text: "ふたりの日支は向かい合う「冲」。生活のリズムや感じ方が正反対になりやすく、ぶつかることもありますが、そのぶん強く惹かれ合い、互いに変化をもたらす関係です。" },
    same: { label: "同じ日支", text: "ふたりの日支は同じ十二支。暮らしの感覚や心地よいと感じる環境が似ていて、一緒にいて落ち着ける組み合わせです。" },
    none: { label: "特別な関係なし", text: "ふたりの日支には、強く結びつく関係もぶつかる関係もありません。お互いのペースを尊重しやすく、関係の形をふたりで自由に作っていけます。" }
  };

  function personCard(r) {
    return {
      birthLabel: dateLabel(r.input) + (r.input.time ? " " + timeLabel(r.input.time) : ""),
      pillars: r.pillars.map(function (p) { return p.name; }).join("・"),
      dayMaster: r.dayMaster.name + "（" + DAY_MASTER[r.dayMaster.name].nature + "）",
      element: r.dayMaster.element,
      chushin: r.chushin.name,
      catchphrase: DAY_MASTER[r.dayMaster.name].catch,
      mayChange: !!r.alternative
    };
  }

  function buildShichusuimeiCompatibilityView(c) {
    var a = c.person1, b = c.person2;
    var st = c.stem.kangou ? STEM_REL.kangou : STEM_REL[c.stem.relation];
    var br = BRANCH_REL[c.branch.relation];
    var comp = [];
    if (c.complement.partnerGives.length) comp.push("あなたの命式にない" + c.complement.partnerGives.join("・") + "を、お相手がたっぷり持っています。お相手と過ごすことで、あなたに足りない力が補われます。");
    if (c.complement.youGive.length) comp.push("お相手の命式にない" + c.complement.youGive.join("・") + "を、あなたがたっぷり持っています。あなたの存在が、お相手の支えになります。");
    if (!comp.length) comp.push("ふたりの命式は、五行を補い合うというより、それぞれのバランスで立っている組み合わせです。お互いの得意な五行を生かし合いましょう。");
    return {
      you: personCard(a),
      partner: personCard(b),
      anyMayChange: !!(a.alternative || b.alternative),
      tradition: COMPAT_TRADITION,
      total: { label: st.label, text: st.text, stems: a.dayMaster.name + "（" + a.dayMaster.element + "）× " + b.dayMaster.name + "（" + b.dayMaster.element + "）" },
      stars: [
        { title: "お相手は、あなたにとって「" + c.partnerAsStar.name + "」", text: AS_PARTNER[c.partnerAsStar.name] },
        { title: "あなたは、お相手にとって「" + c.youAsStar.name + "」", text: AS_PARTNER[c.youAsStar.name] }
      ],
      branch: { label: br.label, text: br.text, pair: c.branch.you.name + " × " + c.branch.partner.name },
      complement: comp
    };
  }

  return {
    buildShichusuimeiCompatibilityView: buildShichusuimeiCompatibilityView,
    STEM_REL: STEM_REL,
    AS_PARTNER: AS_PARTNER,
    BRANCH_REL: BRANCH_REL,
    TRADITION: TRADITION,
    DAY_MASTER: DAY_MASTER,
    TSUHEN: TSUHEN,
    YEAR_TSUHEN: YEAR_TSUHEN,
    JUNIUN: JUNIUN,
    ELEMENT: ELEMENT,
    KUUBOU: KUUBOU,
    buildShichusuimeiView: buildShichusuimeiView
  };
});
