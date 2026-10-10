/*
 * 九星気学の鑑定文の組み立て（DOM操作なし）
 * エンジンの判定結果 ＋ 固定データ（kyusei-data.js）→ 画面に出す表示用データ
 *
 * 文章の出どころを分けています。
 *   - TRADITION：九星気学で一般的に説明される位置づけ（本命星・月命星とは何か、相生・相剋の意味）
 *   - STAR_TEXT ほか：えみり独自の読み解き文（伝統的な象意や五行をもとに、サイトが書いた文章）
 * 本命星 × 月命星、ふたりの相性は、81通り・組み合わせごとの断定文を持たず、
 * 「同じ五行（比和）・相生・相剋」とその向きから文章を組み立てます。
 */
(function (root, factory) {
  if (typeof module === "object" && module.exports) {
    module.exports = factory(require("./kyusei-data.js"));
  } else {
    root.KaruteContent = root.KaruteContent || {};
    root.KaruteContent.kyusei = factory(root.KaruteContent.kyuseiData);
  }
})(typeof self !== "undefined" ? self : this, function (data) {
  "use strict";

  // ---------------- 伝統的な位置づけ（一般的な説明） ----------------
  var TRADITION = {
    honmei: "本命星は、生まれた年（立春から次の立春の前まで）に巡っていた星です。九星気学では、その人の基本的な性質や、人生全体を通して表れやすい傾向を見る中心の星とされます。",
    getsumei: "月命星は、生まれた月（節入りから次の節入りの前まで）に巡っていた星です。九星気学では、本命星よりも内側にある性格や感じ方、とくに若いころに表れやすい面を見る星とされます。",
    sosho: "相生（そうしょう）は、一方がもう一方を生み出し、育てる関係です。",
    sokoku: "相剋（そうこく）は、一方がもう一方の勢いを抑える関係です。抑えることで形が整う、という面もあります。",
    hiwa: "比和（ひわ）は、同じ五行どうしの関係です。性質が近く、互いの勢いを強め合います。"
  };

  // ---------------- えみり独自の読み解き（星ごと） ----------------
  // keyword：外側（本命星）に出る力の短い言い方、innerKeyword：内側（月命星）の短い言い方
  var STAR_TEXT = {
    1: {
      catch: "流れを読み、しなやかに形を変える人",
      keyword: "流れを読むしなやかさ",
      innerKeyword: "本音を静かに抱える深さ",
      basic: "水のように、置かれた場所に合わせて形を変えられる人です。表立って主張するより、相手や状況の流れを読みながら、静かに自分の道を通していきます。穏やかに見えて芯は強く、一度決めたことは時間をかけてもやり遂げようとします。",
      inner: "内側には、簡単には人に見せない本音や感情の深さがあります。相手の気持ちを察する力が強いぶん、自分の気持ちは後回しにして抱え込みやすいところも。心を許した相手にだけ見せる素顔を持っています。",
      strengths: ["状況や人の気持ちを読み取る洞察力", "環境に合わせて柔軟に動ける適応力", "時間をかけて物事を続ける粘り強さ"],
      weaknesses: ["人の感情を抱え込みすぎて疲れやすい", "本音を言わずに我慢を重ねやすい", "迷いが長引くと、決めるまでに時間がかかる"],
      work: "人の話を聴く仕事、調整や橋渡しの役、研究や企画のように深く考える仕事で力を発揮しやすいでしょう。目立つ場所より、全体の流れを支える位置で信頼を集めます。",
      love: "ゆっくり距離を縮め、相手を深く理解していく恋愛をしやすいタイプです。気持ちを察してほしいと思いがちなので、ときどき言葉にして伝えると関係が安定します。",
      relations: "誰とでも角を立てずに付き合える一方、本当に心を開く相手は限られます。相談役になりやすいので、自分が話を聴いてもらえる場も大事にして。",
      growth: "抱えている気持ちを、小さなうちに言葉にしてみること。「察してもらう」より「伝える」を一つ増やすと、あなたの柔らかさがもっと生きます。",
      values: "表に出ない気持ちや、人と人の間に流れるものを大切にする",
      talk: "相手の話を受け止めてから、ゆっくり自分の考えを出す",
      pace: "周りの流れに合わせながら、自分のペースを静かに保つ",
      closeness: "時間をかけて安心できたら、深く寄り添う"
    },
    2: {
      catch: "こつこつと土台をつくり、人を育てる人",
      keyword: "こつこつ積み上げる誠実さ",
      innerKeyword: "人を支えたいという温かさ",
      basic: "大地のように、物事や人を受け止めて育てる力を持つ人です。派手さより堅実さを大切にし、任されたことを最後まで丁寧にやり遂げます。すぐに結果が出なくても、積み重ねで信頼を築いていくタイプです。",
      inner: "内側には、誰かの役に立ちたい、支えたいという温かな気持ちがあります。自分が前に出るより、周りが安心していられることに喜びを感じやすいでしょう。その分、我慢をため込みやすい面も。",
      strengths: ["任されたことを最後までやり抜く責任感", "人や物事をじっくり育てる面倒見のよさ", "地道な努力を続けられる根気"],
      weaknesses: ["我慢を重ねすぎて、限界まで言い出せない", "慎重になりすぎて、新しいことに踏み出しにくい", "頼まれると断れず、抱え込みやすい"],
      work: "チームの土台を支える仕事、人を育てる仕事、長く続けるほど価値が出る仕事に向いています。縁の下の力持ちとして、周りから頼られる存在になりやすいでしょう。",
      love: "安心できる関係をゆっくり育てる恋愛をします。相手に尽くしやすいので、自分がしてほしいことも遠慮せずに伝えると、対等で長続きする関係になります。",
      relations: "面倒見がよく、困っている人を放っておけません。頼られる一方で都合よく使われないよう、「できないこと」を伝える練習も大切です。",
      growth: "頑張っている自分を、自分でも認めてあげること。ときには人に任せたり、甘えたりすることも、長く続けるための力になります。",
      values: "約束を守ること、地道な積み重ね、身近な人の安心",
      talk: "言葉数は多くなくても、行動で気持ちを示す",
      pace: "決まったリズムをこつこつ続けるのが心地よい",
      closeness: "安心と信頼を確かめながら、ゆっくり近づく"
    },
    3: {
      catch: "まっさきに動き出し、場に勢いを生む人",
      keyword: "まっさきに動き出す勢い",
      innerKeyword: "新しいものに反応するまっすぐさ",
      basic: "春の雷のように、勢いよく物事を始める力を持つ人です。思い立ったらすぐ行動し、周りに活気を運びます。明るく率直で、考えるより先に体が動くタイプ。その行動力が新しい道を切り開きます。",
      inner: "内側には、新しいものや面白いものにすぐ反応する、まっすぐな好奇心があります。感じたことが素直に表に出やすく、気持ちの切り替えも早いほう。じっと待つことには少し苦手意識があるかもしれません。",
      strengths: ["思い立ったらすぐ動ける行動力", "周りを明るく巻き込む発信力", "失敗しても立ち上がる切り替えの早さ"],
      weaknesses: ["勢いで結論を急ぎやすい", "言葉がまっすぐすぎて、強く伝わることがある", "始めたことを途中で飽きやすい"],
      work: "新しい企画の立ち上げ、発信や営業、スピードが求められる現場で力を発揮します。最初の一歩を踏み出す役として、チームに欠かせない存在になるでしょう。",
      love: "好きになったら気持ちがまっすぐに出る恋愛をします。勢いで進みやすいので、相手のペースを一度確かめる余裕を持つと、関係がより深まります。",
      relations: "裏表がなく、誰とでもすぐに打ち解けられます。率直な言葉が誤解を生んだ時は、早めに気持ちを補足すると関係がこじれにくくなります。",
      growth: "動き出す前に、ひと呼吸だけ置いてみること。始める力に「続ける工夫」を足すと、あなたの勢いが大きな成果に変わります。",
      values: "新しさ、スピード、やってみること",
      talk: "思ったことをすぐ言葉にし、テンポよく話す",
      pace: "思い立ったら動く、変化のあるリズムが好き",
      closeness: "気持ちが高まると、早めに距離を縮めたい"
    },
    4: {
      catch: "人と人を結び、物事を整えていく人",
      keyword: "人と物事を整える調和の力",
      innerKeyword: "周りとの調和を願う優しさ",
      basic: "風のように、人と人、場所と場所をつなぐ力を持つ人です。穏やかで人当たりがよく、自然と周りに人が集まります。物事を整えて、うまく運ぶことが得意。信用を少しずつ育てていくタイプです。",
      inner: "内側には、周りとぶつからず調和していたいという優しさがあります。人の気持ちを考えるあまり、自分の意見を飲み込んでしまうことも。心の中では、実はいろいろなことを細やかに感じています。",
      strengths: ["人と人をつなぐ調整力", "誰とでも穏やかに付き合える人当たりのよさ", "物事を整えて円滑に進める段取り力"],
      weaknesses: ["周りを気にして迷いやすい", "八方美人に見られて、本音が伝わりにくい", "決断を先延ばしにしやすい"],
      work: "調整や交渉、人と人をつなぐ仕事、遠方や外部とのやりとりが多い仕事で力を発揮します。信用を積み重ねるほど、仕事の幅が広がっていくでしょう。",
      love: "優しく穏やかな恋愛をしやすいタイプです。相手に合わせすぎると自分を見失いやすいので、「わたしはこうしたい」を小さく伝える練習をすると関係が深まります。",
      relations: "人脈が広く、自然に人をつないでいきます。すべての人に合わせようとせず、大切な人との時間を優先すると、心が疲れにくくなります。",
      growth: "迷ったときは、「自分はどうしたいか」を先に決めてから周りを見ること。あなたの調和の力は、軸があるときにいちばん生きます。",
      values: "調和、信用、人とのつながり",
      talk: "相手に合わせて言葉を選び、場の空気を和らげる",
      pace: "周りと調子を合わせながら、ほどよく動く",
      closeness: "相手の様子を感じ取りながら、少しずつ近づく"
    },
    5: {
      catch: "中心に立ち、物事を大きく動かす人",
      keyword: "中心に立って物事を動かす力",
      innerKeyword: "簡単には揺らがない強い芯",
      basic: "九星の中央に位置する星らしく、人の中心に立つ存在感を持つ人です。責任を引き受け、物事を大きく動かしていく力があります。困難な場面ほど強さを発揮し、周りから頼られるタイプです。",
      inner: "内側には、簡単には揺らがない強い芯があります。自分の中に明確な基準を持ち、納得できないことには従いにくいでしょう。面倒見のよさと、自分のやり方へのこだわりが同居しています。",
      strengths: ["責任を引き受けて決断する統率力", "困難な状況でも折れない強さ", "人を引っ張り、まとめる面倒見のよさ"],
      weaknesses: ["自分の基準を押し通しやすい", "何でも自分で抱えようとしてしまう", "弱みを見せるのが苦手"],
      work: "リーダーや責任者、ゼロから立て直す仕事、大きな判断を任される立場で力を発揮します。任せる相手を見つけると、さらに大きなことを動かせます。",
      love: "頼りがいがあり、相手を守ろうとする恋愛をします。自分のやり方を通しすぎないよう、相手の考えを聞く時間を持つと、深い信頼で結ばれます。",
      relations: "自然と人が集まり、頼られる存在になります。周りの意見を取り入れる姿勢を見せると、あなたの強さがより受け入れられやすくなります。",
      growth: "ひとりで背負わず、人に任せ、人に頼ること。弱さを少し見せることが、周りとの距離を縮めるきっかけになります。",
      values: "責任、筋を通すこと、物事を最後まで動かすこと",
      talk: "結論をはっきり伝え、話の流れを引っ張る",
      pace: "自分で決めたペースで、力強く進めたい",
      closeness: "信頼できると決めた相手を、大きく包み込む"
    },
    6: {
      catch: "高い理想を掲げ、責任を持って進む人",
      keyword: "高い理想に向かう向上心",
      innerKeyword: "妥協したくない誇り高さ",
      basic: "天のように高い理想を持ち、それに向かって努力を続ける人です。責任感が強く、任されたことを高い水準でやり遂げます。正義感があり、筋の通らないことを嫌うまっすぐなタイプです。",
      inner: "内側には、妥協したくないという誇り高さがあります。自分にも人にも高い基準を求めやすく、うまくいかないと自分を責めてしまうことも。認められたい、役に立ちたいという気持ちが原動力になっています。",
      strengths: ["高い基準で物事をやり遂げる責任感", "目標に向かって努力を続ける向上心", "筋を通す正義感とリーダーシップ"],
      weaknesses: ["完璧を求めすぎて疲れやすい", "人にも厳しくなりやすい", "プライドから弱音を吐きにくい"],
      work: "管理や判断を任される仕事、専門性を磨く仕事、人の上に立つ立場で力を発揮します。高い目標があるほど、実力が伸びていくでしょう。",
      love: "誠実で、相手を大切にする恋愛をします。理想が高くなりやすいので、相手の小さな良さに目を向けると、関係がぐっと温かくなります。",
      relations: "頼りがいがあり、周りから尊敬されやすい人です。正しさを押し付けず、相手のやり方を認める余裕を持つと、慕われる存在になります。",
      growth: "「できていないところ」より「できたところ」を数えること。完璧でなくても十分だと自分に許すと、あなたの力はもっと伸びやかになります。",
      values: "誠実さ、筋を通すこと、高い理想",
      talk: "要点を押さえて、きちんと話す",
      pace: "計画を立て、きちんと区切りをつけて進めたい",
      closeness: "誠実さを確かめ、信頼を土台に近づく"
    },
    7: {
      catch: "会話と楽しさで、人を惹きつける人",
      keyword: "場を明るくする社交性",
      innerKeyword: "楽しさや喜びを求める素直さ",
      basic: "実りの秋の沢のように、人に喜びを運ぶ人です。社交的で話し上手、場の空気を明るくする魅力があります。楽しむことを大切にし、人生を豊かに味わおうとするタイプです。",
      inner: "内側には、楽しいこと、心地よいことを素直に求める気持ちがあります。寂しさには少し弱く、人とのつながりの中で元気を取り戻します。感性が豊かで、美味しいものやきれいなものに心が動きます。",
      strengths: ["人を楽しませる会話力と愛嬌", "場の空気を明るくする社交性", "物事の楽しみ方を見つける感性"],
      weaknesses: ["気分や楽しさを優先しやすい", "口が先に動いて、言いすぎることがある", "地道な作業が続くと飽きやすい"],
      work: "人と話す仕事、接客や営業、人を楽しませる企画やサービスの仕事で力を発揮します。あなたがいるだけで、チームの雰囲気がやわらぎます。",
      love: "楽しく華やかな恋愛をしやすいタイプです。楽しさだけでなく、落ち着いた時間も一緒に大切にすると、深い安心感のある関係になります。",
      relations: "誰とでも打ち解け、会話の中心にいることが多い人です。言葉の力が強いぶん、冗談が相手にどう届いたかを気にかけると信頼が深まります。",
      growth: "楽しいことを続けるための「小さな我慢」を覚えること。喜びを大切にする力は、続ける工夫と組み合わさると大きな実りになります。",
      values: "楽しさ、人との会話、心地よい時間",
      talk: "話題を広げ、軽やかに会話を楽しむ",
      pace: "楽しいことを取り入れながら、ほどよく休む",
      closeness: "会話や楽しい時間を重ねて、自然に近づく"
    },
    8: {
      catch: "変化を恐れず、じっくり積み上げる人",
      keyword: "じっくり積み上げて変えていく力",
      innerKeyword: "簡単には譲らない粘り強さ",
      basic: "山のようにどっしりとした安定感と、物事を大きく切り替える力をあわせ持つ人です。粘り強く積み上げ、ここぞという時には思い切って方向を変えられます。家族や受け継いできたものを大切にするタイプです。",
      inner: "内側には、簡単には譲らない粘り強さがあります。一度こうと決めたら動きにくい一方、納得すれば一気に切り替えます。表に出す言葉は少なくても、考えていることは深いでしょう。",
      strengths: ["コツコツ蓄える粘り強さ", "ここぞという時に切り替える決断力", "受け継いだものを守り育てる力"],
      weaknesses: ["頑固になりやすい", "気持ちを言葉にするのが遅れがち", "変化の前に考え込みすぎる"],
      work: "長い時間をかけて価値を積み上げる仕事、引き継ぎや立て直しの仕事、不動産や資産など「蓄える」ことに関わる仕事で力を発揮します。",
      love: "一度信頼した相手を大切にする、誠実な恋愛をします。気持ちを言葉にするのが遅れがちなので、小さな感謝を伝えることを意識すると関係がより温かくなります。",
      relations: "口数は多くなくても、いざという時に頼れる存在です。自分の考えにこだわりすぎず、相手の意見に耳を傾けると、関係の幅が広がります。",
      growth: "変わることを「失うこと」ではなく「次に進むこと」ととらえてみること。あなたの粘り強さは、変化と組み合わさると大きな力になります。",
      values: "積み重ね、家族や身近な人、受け継いできたもの",
      talk: "考えてから、ぽつりと本質を話す",
      pace: "自分のリズムを崩さず、じっくり進めたい",
      closeness: "時間をかけて信頼を積み上げてから近づく"
    },
    9: {
      catch: "感性と知性で、物事を明るく照らす人",
      keyword: "物事の本質を照らす感性",
      innerKeyword: "美しいものに惹かれる繊細さ",
      basic: "火のように明るく、周りを照らす華やかさを持つ人です。感性が鋭く、物事の本質を見抜く知性があります。美しいものや新しい考えに惹かれ、自分らしい表現を大切にするタイプです。",
      inner: "内側には、美しいものや心を動かすものに惹かれる繊細さがあります。人からどう見られているかを気にしやすく、気持ちの浮き沈みも表に出やすいほう。ひらめきの力が強く、直感で物事をつかみます。",
      strengths: ["物事の本質を見抜く洞察力", "美しさや新しさを感じ取る感性", "人を惹きつける華やかな表現力"],
      weaknesses: ["感情の波や人の評価を気にしやすい", "熱しやすく冷めやすい", "理想と現実の差に落ち込みやすい"],
      work: "表現や企画、デザインや教育、知識や感性を生かす仕事で力を発揮します。人前に立つ役割でも、自然と注目を集めるでしょう。",
      love: "心がときめく、情熱的な恋愛をしやすいタイプです。気持ちが高まったり冷めたりしやすいので、落ち着いたときにも相手の良さを見つめ直すと、関係が長続きします。",
      relations: "明るく華やかで、人の輪の中心になりやすい人です。人の評価を気にしすぎず、自分が大切にしたい人との関係に心を向けると、気持ちが安定します。",
      growth: "気持ちの波を否定せず、「今はこう感じている」と眺めてみること。あなたの感性は、落ち着きと組み合わさるとさらに輝きます。",
      values: "美しさ、知性、自分らしい表現",
      talk: "ひらめきや感じたことを、華やかに言葉にする",
      pace: "気分が乗ったときに一気に集中したい",
      closeness: "ときめきを大切にしながら、気持ちを伝え合う"
    }
  };

  // 本命星（外側）× 月命星（内側）の関係ごとの読み解き（えみり独自）
  function innerRelationView(r, h, g) {
    var H = STAR_TEXT[h.number], G = STAR_TEXT[g.number];
    var he = h.element, ge = g.element;
    if (r.type === "same-star") {
      return {
        label: "同じ星が重なる",
        tradition: "本命星と月命星が同じ「" + h.name + "」です。",
        text: "外に見せる顔と内側の心が、同じ" + h.name + "でそろっています。「" + H.keyword + "」がそのまま本音にもつながっているため、言っていることと感じていることにずれが少なく、人から見ても分かりやすい人です。",
        strength: "迷いが少なく、自分らしさを一貫して出せること。",
        caution: "同じ性質が重なるぶん、苦手な面も強く出やすくなります。違うタイプの人の意見を、あえて取り入れてみましょう。"
      };
    }
    if (r.type === "hiwa") {
      return {
        label: "比和（同じ五行）",
        tradition: TRADITION.hiwa + "本命星の" + h.name + "と月命星の" + g.name + "は、どちらも「" + he + "」の五行です。",
        text: "外側の「" + H.keyword + "」と、内側の「" + G.innerKeyword + "」は、同じ" + he + "の性質を持っています。表と裏が同じ方向を向いているため、気持ちと行動がそろいやすく、ひとつのことに力を集めやすい組み合わせです。",
        strength: "外と内が同じ方向を向くので、決めたことに集中しやすいこと。",
        caution: "同じ性質が強まりやすいので、行き詰まったときは別の視点を持つ人に相談すると道が開けます。"
      };
    }
    var reasonG = data.GENERATES_REASON, reasonC = data.CONTROLS_REASON;
    if (r.type === "sosho" && r.direction === "getsumei-to-honmei") {
      return {
        label: "相生（内側が外側を育てる）",
        tradition: TRADITION.sosho + "月命星の「" + ge + "」が本命星の「" + he + "」を生む関係です（" + reasonG[ge] + "）。",
        text: "内側にある「" + G.innerKeyword + "」が、外側の「" + H.keyword + "」を後ろから支えています。心が満たされているときほど、外での行動にも力が出やすい人です。",
        strength: "内面の充実が、そのまま外での力になりやすいこと。",
        caution: "心が疲れていると外での力も落ちやすいので、自分の気持ちを満たす時間を先に確保しましょう。"
      };
    }
    if (r.type === "sosho") {
      return {
        label: "相生（外側が内側を育てる）",
        tradition: TRADITION.sosho + "本命星の「" + he + "」が月命星の「" + ge + "」を生む関係です（" + reasonG[he] + "）。",
        text: "外での経験や行動（" + H.keyword + "）が、内側の「" + G.innerKeyword + "」を育てていく組み合わせです。人と関わり、動いた分だけ、内面が豊かになっていきます。",
        strength: "経験を重ねるほど、内面が深まり落ち着いていくこと。",
        caution: "外でエネルギーを使いすぎると内側が空っぽになりやすいので、ひとりで振り返る時間も大切に。"
      };
    }
    if (r.direction === "honmei-to-getsumei") {
      return {
        label: "相剋（外側が内側を引き締める）",
        tradition: TRADITION.sokoku + "本命星の「" + he + "」が月命星の「" + ge + "」を抑える関係です（" + reasonC[he] + "）。",
        text: "外で求められる役割（" + H.keyword + "）が、内側の「" + G.innerKeyword + "」を引き締める組み合わせです。場に合わせて本音を後回しにできる一方、気づかないうちに自分の気持ちを抑えていることがあります。",
        strength: "感情に流されず、その場で必要な動きを選べること。",
        caution: "本音を抑え続けると疲れがたまりやすいので、安心できる相手や場所で気持ちを外に出しましょう。"
      };
    }
    return {
      label: "相剋（内側が外側を引き締める）",
      tradition: TRADITION.sokoku + "月命星の「" + ge + "」が本命星の「" + he + "」を抑える関係です（" + reasonC[ge] + "）。",
      text: "内側の「" + G.innerKeyword + "」が、外側の「" + H.keyword + "」にブレーキをかける組み合わせです。勢いだけで動かない慎重さがある一方、心の中の迷いやこだわりで、行動が止まりやすいこともあります。",
      strength: "動く前に内側で確かめるので、大きな失敗をしにくいこと。",
      caution: "迷いで止まったときは、小さく一歩だけ動いてみると、内と外のバランスが整います。"
    };
  }

  // ---------------- 表示の部品 ----------------
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
  function starCard(n) {
    var s = data.STARS[n];
    return { number: n, name: s.name, short: s.short, element: s.element, color: s.color, trigram: s.trigram, nature: s.nature, imagery: s.imagery.slice() };
  }
  function starFacts(s) {
    return [["五行", s.element], ["色", s.color], ["易の卦（八卦）", s.trigram], ["象意（象徴するもの）", s.imagery.join("・")]];
  }
  function monthLabel(r) {
    var t = data.MONTH_TERMS[r.monthIndex];
    return t.branch + "月（" + t.term + "から）";
  }

  /*
   * 節入り・境界の説明
   *   level：info（確定）/ warn（時刻によって変わる可能性）
   */
  function termNotes(r) {
    var info = r.solarTermInfo, b = info.boundary, alt = info.alternative;
    var lines = [
      "気学上の年：" + yearLabel(r.kigakuYear) + "（立春 " + momentLabel(info.risshun) + " から）",
      "生まれた月：" + monthLabel(r) + "　" + info.termStart.term + " " + momentLabel(info.termStart) + " 〜 " + info.nextTerm.term + " " + momentLabel(info.nextTerm) + " の前まで"
    ];
    var boundary = null;
    if (b) {
      var altText = alt ? "本命星 " + alt.honmeiStar.name + "（" + alt.honmeiStar.element + "）・月命星 " + alt.getsumeiStar.name + "（" + alt.getsumeiStar.element + "）" : "";
      var termLabel = b.term.term + "（" + momentLabel(b.term) + "・日本時間）";
      var isYear = b.term.index === 0;
      var what = isYear ? "本命星と月命星" : "月命星";
      if (b.kind === "on-day") {
        boundary = {
          level: "warn",
          title: "生まれた時刻によって結果が変わる可能性があります",
          text: "この日は" + termLabel + "の当日です。生まれた時刻によって" + what + "が変わる可能性があります。時刻を入力しない場合は、節入りの日から新しい" + (isYear ? "年" : "月") + "として判定しています（多くの早見表と同じ日付の扱いです）。",
          alt: timeLabel(b.term.jst) + "より前に生まれた場合は、" + altText + "になります。",
          canUseTime: true
        };
      } else if (b.kind === "near-edge") {
        boundary = {
          level: "warn",
          title: "生まれた時刻によって結果が変わる可能性があります",
          text: termLabel + "が、日付の変わり目のすぐ" + (b.side === "after" ? "前" : "あと") + "にあります。計算の誤差（前後およそ" + info.marginMinutes + "分）を考えると、" + what + "が変わる可能性が残ります。",
          alt: "節入りの" + (b.side === "after" ? "前" : "あと") + "として判定した場合は、" + altText + "になります。",
          canUseTime: true
        };
      } else if (b.kind === "near-time") {
        boundary = {
          level: "warn",
          title: "節入りの時刻とほぼ同じ時刻です",
          text: "入力された時刻（" + timeLabel(r.input.time) + "）は、" + termLabel + "と前後およそ" + info.marginMinutes + "分以内です。計算の誤差の範囲なので、" + what + "が入れ替わる可能性があります。ここでは節入りの" + (b.side === "after" ? "あと" : "前") + "として判定しています。",
          alt: "節入りの" + (b.side === "after" ? "前" : "あと") + "だった場合は、" + altText + "になります。",
          canUseTime: false
        };
      } else if (b.kind === "resolved") {
        boundary = {
          level: "info",
          title: "節入りの当日です（生まれた時刻で判定しました）",
          text: "この日は" + termLabel + "の当日です。入力された時刻（" + timeLabel(r.input.time) + "）は節入りの" + (b.side === "after" ? "あと" : "前") + "なので、この結果で確定しています。",
          alt: null,
          canUseTime: false
        };
      }
    }
    return { lines: lines, boundary: boundary };
  }

  function precisionNote(r) {
    if (r.precision === "verified") return null;
    return "この年代は、節入り（立春など）の時刻が推定になります。同じ計算方法で求めていますが、地球の自転の揺らぎなどの影響で誤差が大きくなるため、境界に近い日は実際と異なる可能性があります。";
  }

  function relationShort(r) {
    return r.type === "same-star" ? "同じ星" : r.type === "hiwa" ? "比和" : r.type === "sosho" ? "相生" : "相剋";
  }

  /**
   * 個人鑑定の表示用データ
   */
  function buildKyuseiView(r) {
    var h = starCard(r.honmei), g = starCard(r.getsumei);
    var H = STAR_TEXT[r.honmei], G = STAR_TEXT[r.getsumei];
    var ir = innerRelationView(r.innerRelation, data.STARS[r.honmei], data.STARS[r.getsumei]);
    var notes = termNotes(r);
    var pn = precisionNote(r);
    return {
      birthLabel: dateLabel(r.input) + (r.input.time ? " " + timeLabel(r.input.time) : ""),
      precision: r.precision,
      precisionNote: pn,
      honmei: h,
      getsumei: g,
      term: notes,
      summary: {
        headline: "本命星 " + h.name + " × 月命星 " + g.name,
        catchphrase: H.catch,
        points: [
          ["本命星", h.name + "（五行：" + h.element + "）"],
          ["月命星", g.name + "（五行：" + g.element + "）"],
          ["ふたつの星の関係", ir.label]
        ],
        lead: "外側には「" + H.keyword + "」、内側には「" + G.innerKeyword + "」。" + relationShort(r.innerRelation) + "の組み合わせを持つあなたのカルテです。"
      },
      honmeiSection: {
        tradition: TRADITION.honmei,
        facts: starFacts(h),
        text: "あなたの本命星は「" + h.name + "」。キーワードは「" + H.keyword + "」です。"
      },
      getsumeiSection: {
        tradition: TRADITION.getsumei,
        facts: starFacts(g),
        text: "あなたの月命星は「" + g.name + "」。内側にあるキーワードは「" + G.innerKeyword + "」です。"
      },
      basic: H.basic,
      inner: G.inner,
      combination: ir,
      strengths: r.honmei === r.getsumei ? H.strengths.slice() : [H.strengths[0], H.strengths[1], G.strengths[0]],
      strengthsNote: r.honmei === r.getsumei ? "本命星と月命星が同じ星なので、その星の強みを3つ挙げています。" : "本命星から2つ、月命星から1つを挙げています。",
      weaknesses: [H.weaknesses[0], G.weaknesses[1]].concat(r.honmei === r.getsumei ? [H.weaknesses[2]] : []),
      weaknessNote: "弱点と決めつけるものではなく、性質が強く出すぎたときに調整したいポイントです。",
      work: H.work,
      love: H.love + (r.honmei === r.getsumei ? "" : "内面（月命星の" + g.name + "）には、「" + G.closeness + "」という一面もあります。"),
      relations: H.relations,
      growth: H.growth,
      growthExtra: "本命星と月命星の関係から見ると：" + ir.caution
    };
  }

  // ---------------- 相性 ----------------
  var CATEGORIES = {
    hiwa: {
      label: "感覚を共有しやすい",
      tradition: TRADITION.hiwa,
      lead: "ふたりの本命星は同じ五行。大切にしたいことや物事の感じ方が近く、説明しなくても分かり合える部分が多い関係です。似ているからこそ、同じところで立ち止まりやすい点だけ意識しておきましょう。"
    },
    sosho: {
      label: "力を渡しやすい",
      tradition: TRADITION.sosho,
      lead: "ふたりの本命星は相生の関係。一方の持ち味が、もう一方の力を引き出しやすい組み合わせです。渡す側・受け取る側が固定されすぎないよう、ときどき役割を入れ替えるとバランスが保てます。"
    },
    sokoku: {
      label: "刺激と調整が生まれやすい",
      tradition: TRADITION.sokoku,
      lead: "ふたりの本命星は相剋の関係。性質が違うぶん、お互いにない視点や刺激を持ち込み合える組み合わせです。ぶつかりやすい場面では、どちらかが我慢するより、やり方を調整し合うことで関係が育ちます。"
    }
  };

  function who(side) { return side === "a" ? "あなた" : "お相手"; }
  function whoOther(side) { return side === "a" ? "お相手" : "あなた"; }

  // 星どうしの関係を、向きを含めて説明する（label：短い見出し、text：説明）
  function pairText(rel, labelA, labelB) {
    var ea = rel.elements.a, eb = rel.elements.b;
    var starA = data.STARS[rel.stars.a].name, starB = data.STARS[rel.stars.b].name;
    var head = labelA + "の" + starA + "（" + ea + "）× " + labelB + "の" + starB + "（" + eb + "）";
    if (rel.type === "hiwa") {
      return { head: head, label: rel.sameStar ? "同じ星（比和）" : "比和", text: "同じ「" + ea + "」の五行どうし。感覚を共有しやすい関係です。" };
    }
    if (rel.type === "sosho") {
      var giver = rel.giver === "a" ? labelA : labelB, taker = rel.giver === "a" ? labelB : labelA;
      var ge = rel.giver === "a" ? ea : eb;
      return { head: head, label: "相生：" + giver + "→" + taker, text: giver + "の「" + ge + "」が" + taker + "の「" + data.GENERATES[ge] + "」を生む関係（" + data.GENERATES_REASON[ge] + "）。" + giver + "が力を渡しやすい向きです。" };
    }
    var actor = rel.actor === "a" ? labelA : labelB, target = rel.actor === "a" ? labelB : labelA;
    var ae = rel.actor === "a" ? ea : eb;
    return { head: head, label: "相剋：" + actor + "→" + target, text: actor + "の「" + ae + "」が" + target + "の「" + data.CONTROLS[ae] + "」を抑える関係（" + data.CONTROLS_REASON[ae] + "）。" + actor + "が働きかけ、" + target + "が刺激を受けやすい向きです。" };
  }

  function directionSentence(rel, subject) {
    if (rel.type === "hiwa") {
      return rel.sameStar ? "ふたりは同じ星どうし。鏡を見るように分かり合える一方で、同じところでつまずきやすい組み合わせです。" : "同じ五行どうしなので、" + subject + "の感覚が近く、安心して一緒にいられます。";
    }
    if (rel.type === "sosho") {
      return who(rel.giver) + "が" + whoOther(rel.giver) + "に力を渡しやすい向きです。" + whoOther(rel.giver) + "は受け取った力を自分なりの形にして返すと、循環が生まれます。";
    }
    return who(rel.actor) + "が" + whoOther(rel.actor) + "に働きかけやすい向きです。" + who(rel.actor) + "は言い方をやわらかく、" + whoOther(rel.actor) + "は刺激を成長のきっかけとして受け取ると、関係が整います。";
  }

  function person(r, side) {
    var v = buildKyuseiView(r);
    var H = STAR_TEXT[r.honmei], G = STAR_TEXT[r.getsumei];
    return {
      side: side,
      label: side === "a" ? "あなた" : "お相手",
      birthLabel: v.birthLabel,
      honmei: v.honmei,
      getsumei: v.getsumei,
      catchphrase: H.catch,
      points: [["外側（本命星）", H.keyword], ["内側（月命星）", G.innerKeyword], ["ふたつの星の関係", v.combination.label]],
      boundary: v.term.boundary,
      precisionNote: v.precisionNote
    };
  }

  /**
   * 相性の表示用データ
   */
  function buildKyuseiCompatibilityView(c) {
    var a = c.person1, b = c.person2;
    var Ha = STAR_TEXT[a.honmei], Hb = STAR_TEXT[b.honmei];
    var Ga = STAR_TEXT[a.getsumei], Gb = STAR_TEXT[b.getsumei];
    var cat = CATEGORIES[c.category];
    var hr = c.honmeiRelation, gr = c.getsumeiRelation;

    var innerLabel = { hiwa: "感覚を共有しやすい", sosho: "力を渡しやすい", sokoku: "刺激と調整が生まれやすい" }[c.innerCategory];

    function both(x, y, same, each) { return x === y ? same(x) : each(x, y); }
    var values = both(Ha.values, Hb.values, function (x) { return "ふたりとも「" + x + "」を大切にしやすい人です。"; },
      function (x, y) { return "あなたは「" + x + "」を、お相手は「" + y + "」を大切にしやすい人です。"; }) +
      (hr.type === "hiwa" ? "本命星が同じ五行なので、価値観の土台が近く、大事な決めごとでも意見がそろいやすいでしょう。" :
        hr.type === "sosho" ? "本命星は相生の関係。" + who(hr.giver) + "の大切にしていることが、" + whoOther(hr.giver) + "の考えを後押ししやすい組み合わせです。" :
          "本命星は相剋の関係。大切にするものの優先順位が違いやすいので、「何を大事にしたいか」を先に言葉にしておくと、ぶつかっても話し合いで整えられます。");

    var talk = both(Ga.talk, Gb.talk, function (x) { return "ふたりとも、" + x + "タイプ。"; },
      function (x, y) { return "あなたは" + x + "タイプ、お相手は" + y + "タイプ。"; }) +
      (gr.type === "hiwa" ? "月命星が同じ五行なので、気持ちの動き方が似ていて、会話のテンポが合いやすいでしょう。" :
        gr.type === "sosho" ? "月命星は相生の関係。" + who(gr.giver) + "の言葉が、" + whoOther(gr.giver) + "の気持ちをほぐしやすい組み合わせです。" :
          "月命星は相剋の関係。気持ちの表し方が違うため、同じ言葉でも受け取り方がずれることがあります。「今のはこういう意味だった」と補い合う習慣が助けになります。");

    var pace = both(Ha.pace, Hb.pace, function (x) { return "ふたりとも「" + x + "」タイプ。"; },
      function (x, y) { return "あなたは「" + x + "」、お相手は「" + y + "」タイプ。"; }) +
      (hr.type === "hiwa" ? "生活のリズムが近く、一緒にいて疲れにくいふたりです。" :
        hr.type === "sosho" ? "リズムは違っても、" + who(hr.giver) + "が動きのきっかけをつくり、" + whoOther(hr.giver) + "がそれを形にしていく流れが生まれやすいでしょう。" :
          "リズムに差が出やすいので、家事や予定、お金の使い方などは、先にルールを話し合っておくと互いの得意を生かせます。");

    var together = {
      hiwa: "似ている部分に甘えず、違いが見えたときこそ面白がること。",
      sosho: "力を渡してもらったときは、感謝を言葉にして返すこと。",
      sokoku: "相手のやり方を「間違い」ではなく「別の正解」として受け止めること。"
    }[c.category];

    // 親密さ（月命星＝内面の関係を中心に）
    var intimacyPace = gr.type === "hiwa" ? "親しくなるペースが似ていて、無理なく自然に距離が縮まりやすいふたりです。" :
      gr.type === "sosho" ? who(gr.giver) + "が安心感を先に差し出し、" + whoOther(gr.giver) + "がそれに応える形で、少しずつ距離が縮まりやすいでしょう。" :
        "近づきたい速さや心地よい距離に差が出やすい組み合わせです。「今はどのくらいの距離がいい？」と言葉で確かめ合うと、どちらも安心できます。";

    return {
      method: "karute-original",
      you: person(a, "a"),
      partner: person(b, "b"),
      anyMayChange: c.anyMayChange,
      total: {
        category: c.category,
        label: cat.label,
        tradition: cat.tradition,
        lead: cat.lead,
        direction: directionSentence(hr, "価値観"),
        inner: { label: innerLabel, text: "内面（月命星どうし）は「" + innerLabel + "」関係。" + directionSentence(gr, "気持ち") },
        method: "九星気学の相性は、ふたりの本命星と月命星の五行の関係（比和・相生・相剋）をもとに、えみりが独自に読み解いたものです。五行の関係は人間関係のすべてを決めるものではなく、関係の傾向を知るための一つの見方です。点数は付けていません。"
      },
      relations: [
        (function () { var t = pairText(hr, "あなた", "お相手"); t.head = "本命星どうし：" + t.head; return t; })(),
        (function () { var t = pairText(gr, "あなた", "お相手"); t.head = "月命星どうし：" + t.head; return t; })(),
        (function () { var t = pairText(c.crossRelations.aHonmeiBGetsumei, "あなた", "お相手"); t.head = "あなたの本命星 × お相手の月命星：" + t.head; return t; })(),
        (function () { var t = pairText(c.crossRelations.bHonmeiAGetsumei, "お相手", "あなた"); t.head = "お相手の本命星 × あなたの月命星：" + t.head; return t; })()
      ],
      relationsNote: "本命星どうしは外に見える価値観や生き方、月命星どうしは内面や気持ちの動き方の相性を表します。本命星と相手の月命星の組み合わせは、相手の内面にどう響くかの手がかりになります。",
      details: [
        { key: "values", title: "価値観", text: values },
        { key: "communication", title: "コミュニケーション", text: talk },
        { key: "pace", title: "生活ペース", text: pace },
        { key: "tips", title: "関係を育てるコツ", list: [
          together,
          "あなたの「" + Ga.innerKeyword + "」を、察してもらうのではなく言葉にする。",
          "お相手の「" + Gb.innerKeyword + "」を、その人らしさとして尊重する。"
        ] }
      ],
      intimacy: [
        { title: "距離感", text: both(Ga.closeness, Gb.closeness, function (x) { return "ふたりとも「" + x + "」タイプです。距離の取り方が似ているので、心地よい近さを見つけやすいでしょう。"; },
          function (x, y) { return "あなたは「" + x + "」タイプ、お相手は「" + y + "」タイプです。心地よい距離は人によって違うので、相手の近づき方を尊重しましょう。"; }) },
        { title: "親密になるペース", text: intimacyPace },
        { title: "安心感", text: both(Ha.values, Hb.values, function (x) { return "ふたりとも「" + x + "」が守られると安心しやすいでしょう。"; },
          function (x, y) { return "あなたは「" + x + "」が守られると、お相手は「" + y + "」が守られると安心しやすいでしょう。"; }) + "相手が何に安心するかを知っておくことが、信頼の土台になります。" },
        { title: "愛情表現・スキンシップ", text: "手をつなぐ、そばにいるといった触れ合いの心地よさは人それぞれです。" + (gr.type === "sokoku" ? "ふたりは表し方に差が出やすいので、" : "") + "どんな触れ合いや言葉がうれしいかを、ふだんの会話の中で伝え合いましょう。" },
        { title: "境界線", text: "近い関係になっても、ひとりの時間や触れられたくない話題は人によって違います。「いや」「今はやめておきたい」を言いやすい関係であることが、ふたりの安心につながります。" },
        { title: "伝え合い方", text: "気持ちを確かめるときは、相手の反応を推測で決めつけず、「どう感じた？」と聞くこと。" + (gr.type === "hiwa" ? "似たふたりだからこそ、言わなくても分かるはずと思い込まないことが大切です。" : "違いのあるふたりだからこそ、小さな確認が大きな安心になります。") }
      ]
    };
  }

  return {
    TRADITION: TRADITION,
    STAR_TEXT: STAR_TEXT,
    CATEGORIES: CATEGORIES,
    buildKyuseiView: buildKyuseiView,
    buildKyuseiCompatibilityView: buildKyuseiCompatibilityView,
    yearLabel: yearLabel,
    dateLabel: dateLabel,
    timeLabel: timeLabel
  };
});
