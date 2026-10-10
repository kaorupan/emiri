/*
 * マヤ暦の鑑定文の組み立て（DOM操作なし）
 * エンジンの判定結果 → 画面に出す表示用データ
 *
 * 文章の出どころを分けています。
 *   - TRADITION：マヤ暦（13の月の暦）で一般的に説明される位置づけ（KIN・紋章・音・ウェイブスペルなどとは何か）
 *   - SEAL ほか：えみり独自の読み解き文（紋章・音の一般的な意味をもとに、サイトが書いた文章）
 */
(function (root, factory) {
  if (typeof module === "object" && module.exports) {
    module.exports = factory();
  } else {
    root.KaruteContent = root.KaruteContent || {};
    root.KaruteContent.maya = factory();
  }
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";

  var TRADITION = {
    seal: "太陽の紋章は、20の紋章のうち生まれた日のKINが持つ紋章です。マヤ暦では、その人の本質や、表の顔として表れやすい性質を表すとされます。",
    tone: "銀河の音は、1から13までの13の音のうち、生まれた日のKINが持つ音です。その人の役割や、物事への取り組み方、人生のテーマを表すとされます。",
    wavespell: "ウェイブスペルは、13日ごとのまとまり（波）の最初の日の紋章です。自分では気づきにくい潜在的な力や、人生の背景に流れるテーマを表すとされます。",
    relations: "マヤ暦では、自分のKINと特別な関係にある4つのKIN（ガイド・類似・反対・神秘）を「運命の五角形」として読みます。生年月日のKINがこれらに当たる人は、あなたに影響を与えやすい人とされます。",
    black: "黒KINは、260のKINのうち、銀河の活性化の入り口とされる52のKINです。260のKINを並べた表で黒く塗られることから、この名で呼ばれます。",
    years: "マヤ暦では、毎年の誕生日に、その年の過ごし方を表すKINが巡ってくるとされます（年回り）。銀河の音は1年に1つずつ進み、13年で一巡します。"
  };

  var COLOR = {
    "赤": { theme: "始める", text: "赤の紋章は「始める」力。新しいことへの情熱と、まっすぐな行動力があります。" },
    "白": { theme: "整える", text: "白の紋章は「整える」力。物事を見極め、余分なものをそぎ落として形を整えます。" },
    "青": { theme: "変える", text: "青の紋章は「変える」力。新しい視点を持ち込み、流れを変えるきっかけを作ります。" },
    "黄": { theme: "熟す", text: "黄の紋章は「熟す」力。積み重ねたものを実らせ、まわりと分かち合います。" }
  };

  // ---------------- 太陽の紋章：えみりの読み解き ----------------
  var SEAL = {
    "赤い龍": { keyword: "生命力・母性・はじまり", body: "赤い龍は、20の紋章のはじまり。生み出す力と、まわりを育む大きな母性を持っています。面倒見がよく、困っている人を放っておけない人情家。誇り高く、自分の信念をまっすぐに貫く強さもあります。", strength: "面倒見のよさ、生命力、ものごとを始める力", hint: "人に尽くしすぎて疲れたら、自分を育てることにも力を向けて。受け取ることも大切な役目です。" },
    "白い風": { keyword: "感性・言葉・共感", body: "白い風は、目に見えない思いを感じとり、言葉にして運ぶ紋章。感受性が豊かで、人の気持ちに寄り添う力があります。繊細で傷つきやすい一面もありますが、そのぶん人の心を動かす言葉を持っています。", strength: "共感力、言葉で伝える力、繊細な感性", hint: "感じたことを抱えこまず、書く・話すなどで外に出すと心が軽くなります。" },
    "青い夜": { keyword: "夢・豊かさ・個の世界", body: "青い夜は、夢を描き、豊かさを形にしていく紋章。自分だけの世界を大切にし、ひとりの時間で発想を深めます。現実的な感覚もあり、思い描いた夢を着実に実現していく力があります。", strength: "夢を描く力、豊かさを引き寄せる力、独自の世界観", hint: "夢は口に出し、目に見える形で書き出すと、実現への道筋がはっきりします。" },
    "黄色い種": { keyword: "探究・気づき・開花", body: "黄色い種は、小さな種が時間をかけて花開くように、じっくり物事を育てる紋章。納得するまで調べたい探究心と、物事の本質に気づく力があります。こうと決めたら貫く粘り強さも魅力です。", strength: "探究心、集中力、可能性を育てる力", hint: "理屈で納得できないと動けないときは、まず小さく試してみるのも一つの方法です。" },
    "赤い蛇": { keyword: "情熱・本能・生命力", body: "赤い蛇は、体の感覚と本能に正直な、情熱の紋章。好きなことにはとことんのめり込み、ずば抜けた集中力を発揮します。白黒はっきりさせたい性格で、裏表のない誠実さが人を惹きつけます。", strength: "集中力、情熱、体の感覚の鋭さ", hint: "疲れや違和感など、体からのサインを大切に。休むことも力を発揮する準備です。" },
    "白い世界の橋渡し": { keyword: "つなぐ・手放す・おもてなし", body: "白い世界の橋渡しは、人と人、世界と世界をつなぐ紋章。人脈を広げ、まわりを結びつけることで力を発揮します。おもてなしの心があり、古いものを手放して新しい流れを作る潔さも持っています。", strength: "人をつなぐ力、社交性、手放す勇気", hint: "つなぐ役に夢中になったら、自分自身の気持ちとのつながりも確かめて。" },
    "青い手": { keyword: "癒し・理解・体験", body: "青い手は、手で触れ、実際に体験しながら理解を深める紋章。物事をていねいに扱い、人を癒すあたたかさを持っています。一度手がけたことは最後までやり遂げる、まじめで誠実な人です。", strength: "癒しの力、実行力、体験から学ぶ力", hint: "頭で考えすぎたら、まず手を動かしてみて。やってみる中で答えが見えてきます。" },
    "黄色い星": { keyword: "美・調和・こだわり", body: "黄色い星は、美しさと調和を求める紋章。センスがよく、細部まで行き届いた美意識を持っています。努力家で、理想に向かってこつこつと自分を磨き続けることで、ひときわ輝く存在になります。", strength: "美意識、向上心、調和を生む力", hint: "完璧を目指すほど自分に厳しくなりがち。できたことを数える習慣を。" },
    "赤い月": { keyword: "流れ・浄化・使命", body: "赤い月は、水のように流れを生み出し、まわりを浄化する紋章。新しい流れを作る使命感を持ち、こうと思ったら情熱的に突き進みます。感受性が強く、場の空気を変える不思議な力があります。", strength: "流れを作る力、使命感、浄化する力", hint: "気持ちの波が大きいときは、水を飲む・お風呂に入るなど、心身をととのえる時間を。" },
    "白い犬": { keyword: "誠実・忠実・家族愛", body: "白い犬は、誠実さと愛情深さの紋章。家族や仲間を大切にし、一度信頼した人には最後まで尽くします。正直でうそがつけず、まっすぐな思いやりで人の心をつかみます。", strength: "誠実さ、愛情深さ、仲間を守る力", hint: "身内を大切にするぶん、外の世界に心を開くと、さらに居場所が広がります。" },
    "青い猿": { keyword: "遊び心・ひらめき・ユーモア", body: "青い猿は、遊び心とひらめきの紋章。ユーモアがあり、その場を明るく楽しい空気にする天性のムードメーカーです。好奇心旺盛で器用。楽しみながら取り組むことで、思いがけない才能が花開きます。", strength: "ひらめき、ユーモア、場を明るくする力", hint: "楽しさを大切にしながら、ひとつのことを続ける時間も作ると力が深まります。" },
    "黄色い人": { keyword: "自由意志・知恵・自分の道", body: "黄色い人は、自分の意志で道を選ぶ紋章。束縛を嫌い、納得できる生き方を自分で切りひらいていきます。知識欲が旺盛で、学んだ知恵を人のために生かそうとする、まっすぐな人です。", strength: "自分の道を選ぶ力、知恵、人を導く力", hint: "人にもそれぞれの道があると認めると、あなたの言葉がより届きやすくなります。" },
    "赤い空歩く人": { keyword: "探求・貢献・人のために", body: "赤い空歩く人は、空と地上をつなぐように、広い世界を探求する紋章。人の役に立ちたいという思いが強く、社会や人のために動くことで力を発揮します。好奇心が強く、行動範囲も広い人です。", strength: "貢献する力、行動力、広い視野", hint: "人のために動くのと同じくらい、自分の望みも大切にして。" },
    "白い魔法使い": { keyword: "誠実・受け入れる・時間を超える", body: "白い魔法使いは、ひたむきさと誠実さの紋章。ひとつのことに一途に取り組み、人を許し受け入れる大きな心を持っています。そのひたむきな姿が、まわりに魔法のような影響を与えていきます。", strength: "誠実さ、ひたむきさ、受け入れる力", hint: "頑張りすぎて自分を追い込みがち。ありのままの自分も受け入れてあげて。" },
    "青い鷲": { keyword: "洞察・ビジョン・先見性", body: "青い鷲は、空高くから全体を見渡す紋章。先を見通す洞察力と、物事を俯瞰する視点を持っています。冷静な分析力がありながら、心の奥には人を思う繊細なやさしさも秘めています。", strength: "洞察力、先見性、全体を見る力", hint: "見えすぎて不安になるときは、今いちばん大事なひとつに焦点を絞って。" },
    "黄色い戦士": { keyword: "挑戦・勇気・知性", body: "黄色い戦士は、問いを持って挑み続ける紋章。困難にも立ち向かう勇気と、物事を論理的に考える知性を持っています。自分に問いかけ続けることで道を切りひらく、たくましい人です。", strength: "挑戦する力、勇気、筋道を立てる力", hint: "ひとりで戦わず、仲間に助けを求めることも、強さのひとつです。" },
    "赤い地球": { keyword: "共鳴・絆・ナビゲーション", body: "赤い地球は、人と心を合わせ、共に進む紋章。仲間との絆を大切にし、チームの中で力を発揮します。物事の流れやタイミングを感じとる力があり、まわりを正しい方向へ導くナビゲーターです。", strength: "絆を結ぶ力、協調性、流れを読む力", hint: "まわりに合わせすぎたと感じたら、自分の心の声と共鳴しているか確かめて。" },
    "白い鏡": { keyword: "真実・秩序・映し出す", body: "白い鏡は、物事をありのままに映し出す紋章。うそやごまかしを嫌い、真実を見極める目を持っています。礼儀正しく、秩序を大切にする人。人はあなたと接することで、自分自身を見つめ直します。", strength: "真実を見抜く力、誠実さ、物事を整える力", hint: "自分にも人にも厳しくなったら、相手は自分を映す鏡と思い出して、少しゆるめて。" },
    "青い嵐": { keyword: "変容・エネルギー・巻き込む力", body: "青い嵐は、大きなエネルギーで変化を起こす紋章。まわりを巻き込む力があり、停滞した状況を一気に動かします。家族や身内を大切にする情の深さもあり、パワフルさの奥にあたたかさがあります。", strength: "変化を起こす力、行動力、巻き込む力", hint: "勢いが強いぶん、ひと呼吸おいて方向を確かめてから動くと、さらに力が生きます。" },
    "黄色い太陽": { keyword: "光・無条件の愛・リーダー", body: "黄色い太陽は、20の紋章の最後を飾る、光の紋章。まわりを明るく照らし、分けへだてなく愛を注ぐ存在です。責任感が強く、自然とリーダーの役割を担います。あなたがいるだけで、場があたたかくなります。", strength: "明るさ、包容力、リーダーシップ", hint: "いつも照らす側にいるぶん、ときには人に頼って休む日も作って。" }
  };

  // ---------------- 銀河の音：えみりの読み解き ----------------
  var TONE = {
    1: { keyword: "統一・はじまり", body: "音1は、物事を始め、ひとつにまとめる音。目的がはっきりすると迷わず進む、ぶれない芯を持っています。" },
    2: { keyword: "挑戦・二極", body: "音2は、ふたつの間で揺れながら、その違いを受け入れていく音。迷いや葛藤を力に変え、挑戦によって成長します。" },
    3: { keyword: "奉仕・つなぐ", body: "音3は、人と人をつなぎ、動きを生み出す音。行動力と奉仕の心があり、人の役に立つことで輝きます。" },
    4: { keyword: "形・探究", body: "音4は、物事の形やしくみを明らかにする音。分析力と探究心があり、こつこつと基盤を整えていきます。" },
    5: { keyword: "中心・輝き", body: "音5は、中心に立ち、力を集める音。存在感があり、目標に向かって人や物事をまとめる力があります。" },
    6: { keyword: "平等・バランス", body: "音6は、リズムを整え、バランスをとる音。人を公平に扱い、安定した流れを作るのが得意です。" },
    7: { keyword: "神秘・調律", body: "音7は、13の音のちょうど真ん中にある、神秘の音。直感が鋭く、目に見えないものを感じとり、まわりと調律します。" },
    8: { keyword: "調和・模範", body: "音8は、調和を生み出し、手本となる音。信念を持ち、ことばと行動を一致させることで人の信頼を集めます。" },
    9: { keyword: "意図・粘り強さ", body: "音9は、大きな意図を持ってやり遂げる音。持続力があり、時間をかけて大きな成果を実らせます。" },
    10: { keyword: "実現・形にする", body: "音10は、思いを現実の形にする音。現実的で実行力があり、目に見える結果を生み出すのが得意です。" },
    11: { keyword: "解放・変化", body: "音11は、古いものを手放し、変化を起こす音。こだわりを解き放ち、新しい流れを生む柔軟さがあります。" },
    12: { keyword: "協力・普遍化", body: "音12は、人と協力し、学びを分かち合う音。相談役として人を支え、多くの人の知恵をまとめます。" },
    13: { keyword: "超越・完成", body: "音13は、13の流れを完成させる音。大きな視点を持ち、ひとつの流れを終えて次の段階へ引き上げる力があります。" }
  };

  // 年回り（その年の銀河の音）
  var YEAR_TONE = {
    1: "新しい13年の始まりの年。これから育てたいことの種をまくのに向いています。",
    2: "迷いや揺れが出やすい年。比べたり悩んだりする中で、本当に大切なものが見えてきます。",
    3: "人とのつながりが広がる年。手を貸したり借りたりすることで、物事が動き出します。",
    4: "足元を固める年。やり方やしくみを見直し、土台を整えると後の年が楽になります。",
    5: "自分の中心が定まる年。目標をひとつに絞ると、まわりの力も集まってきます。",
    6: "リズムを整える年。生活や仕事のバランスを見直すと、流れがなめらかになります。",
    7: "13年の折り返しの年。直感を信じて、本当に進みたい方向を確かめるときです。",
    8: "調和の年。まわりと足並みをそろえることで、信頼と評価が高まります。",
    9: "粘り強さが実を結ぶ年。続けてきたことを、もう一歩先まで進めてみましょう。",
    10: "形にする年。思い描いてきたことを、目に見える成果にしやすいときです。",
    11: "手放しと変化の年。合わなくなったものを整理すると、新しい流れが入ってきます。",
    12: "協力と分かち合いの年。学んできたことを人に伝えると、自分の理解も深まります。",
    13: "13年の締めくくりの年。これまでを振り返り、次の13年への準備を整えましょう。"
  };

  var RELATION = {
    guide: { label: "ガイドKIN", role: "あなたを導く存在", text: "人生の道しるべとなる紋章です。この紋章の人からの助言や、この紋章の性質を意識することが、あなたを前に進めます。" },
    analog: { label: "類似KIN", role: "似た感覚の仲間", text: "感覚や価値観が近く、一緒にいて自然体でいられる関係とされます。気負わず協力し合える相手です。" },
    antipode: { label: "反対KIN", role: "視野を広げてくれる存在", text: "自分にない視点を持ち、ときに刺激し合う関係とされます。ぶつかることもありますが、そのぶん大きな学びがあります。" },
    occult: { label: "神秘KIN", role: "見えない力で支え合う存在", text: "表には見えにくいところで深く支え合う関係とされます。KIN番号を足すと261になる、特別な組み合わせです。" }
  };

  var BLACK_TEXT = "黒KINの人は、目に見えない世界と現実をつなぐ役割を持つとされます。感受性が強く、まわりの影響を受けやすい一方で、人の気持ちや場の変化を誰より早く感じとれる人です。特別な才能や成功を約束するものではありませんが、繊細さを自分の強みとして大切にしてください。";

  function pad4(y) { var s = String(y); while (s.length < 4) s = "0" + s; return s; }
  function dateLabel(d) { return (d.year <= 0 ? "紀元前" + (1 - d.year) : pad4(d.year)) + "年" + d.month + "月" + d.day + "日"; }

  function kinCard(info) {
    return { kin: info.kin, seal: info.seal.name, color: info.seal.color, tone: info.tone.number, toneName: info.tone.name, black: info.black, name: "KIN" + info.kin + "　" + info.seal.name + "・音" + info.tone.number };
  }

  /**
   * 表示用データ
   * @param {Object} r engines/maya.js の calculateMaya の結果
   * @param {{year:number, month:number, day:number}} today 年回りの起点
   * @param {Object} [engine] yearCycles を持つエンジン
   */
  function buildMayaView(r, today, engine) {
    var eng = engine || (typeof require === "function" ? require("../engines/maya.js") : null);
    var s = SEAL[r.seal.name], w = SEAL[r.wavespell.name], t = TONE[r.tone.number];
    var years = eng.yearCycles(r, today, 3).map(function (y) {
      return { year: y.year, age: y.age, kin: y.kin, seal: y.seal.name, tone: y.tone.number, text: YEAR_TONE[y.tone.number] };
    });
    var rel = ["guide", "analog", "antipode", "occult"].map(function (k) {
      var info = r.relations[k];
      return Object.assign({ key: k, label: RELATION[k].label, role: RELATION[k].role, text: RELATION[k].text, keyword: SEAL[info.seal.name].keyword }, kinCard(info));
    });
    return {
      birthLabel: dateLabel(r.input),
      kin: r.kin,
      main: kinCard({ kin: r.kin, seal: r.seal, tone: r.tone, black: r.black }),
      catchphrase: r.seal.name + "の本質に、" + r.wavespell.name + "の潜在力、音" + r.tone.number + "の「" + t.keyword + "」",
      seal: { name: r.seal.name, color: r.seal.color, keyword: s.keyword, body: s.body, strength: s.strength, hint: s.hint, colorText: COLOR[r.seal.color].text, tradition: TRADITION.seal },
      tone: { number: r.tone.number, name: r.tone.name, keyword: t.keyword, body: t.body, tradition: TRADITION.tone },
      wavespell: { name: r.wavespell.name, color: r.wavespell.color, keyword: w.keyword, body: w.body, day: r.wavespellDay, same: r.wavespell.name === r.seal.name, tradition: TRADITION.wavespell },
      relations: rel,
      relationsTradition: TRADITION.relations,
      black: r.black ? { text: BLACK_TEXT, tradition: TRADITION.black } : null,
      years: years,
      yearsTradition: TRADITION.years,
      leapDay: r.leapDay ? { text: "2月29日は、マヤ暦（13の月の暦）では独立したKINを持たない特別な日（0.0 フナブ・クの日）です。えみりでは2月28日と同じKIN" + r.kin + "で鑑定しています。流派によっては3月1日側のKIN" + r.leapDay.alternative.kin + "（" + r.leapDay.alternative.seal.name + "・音" + r.leapDay.alternative.tone.number + "）とする場合もあります。" } : null
    };
  }

  // ---------------- 相性：えみりの読み解き ----------------
  var COMPAT_TRADITION = "マヤ暦の相性は、ふたりのKINが「運命の五角形」（ガイド・類似・反対・神秘）の関係にあるか、紋章・銀河の音・ウェイブスペル・色を共有しているかから読みます。また、ふたりのKIN番号を足して求める「ふたりのKIN」は、ふたりの関係そのものが持つテーマを表すとされます。";

  var LINK = {
    same: { label: "同じKIN", text: "ふたりは同じKIN。考え方も感じ方もよく似ていて、まるで鏡を見ているような関係です。分かり合える安心感がある一方、同じ弱点も持っているので、ときには違う意見を歓迎して。" },
    occult: { label: "神秘KIN", text: "ふたりはKIN番号を足すと261になる「神秘KIN」の関係。目に見えないところで深く支え合い、出会ったことに意味を感じやすい、特別なご縁とされます。" },
    analog: { label: "類似KIN", text: "ふたりは「類似KIN」の関係。感覚や価値観が近く、一緒にいて自然体でいられる、気負わない仲間のような相性です。" },
    antipode: { label: "反対KIN", text: "ふたりは「反対KIN」の関係。自分にない視点を持つ相手で、ぶつかることもありますが、そのぶん互いの世界を大きく広げ合えます。" },
    partnerGuide: { label: "お相手があなたのガイドKIN", text: "お相手は、あなたのガイドKIN。人生の道しるべとして、あなたを導き、背中を押してくれる存在です。お相手のことばには耳を傾けてみて。" },
    youGuide: { label: "あなたがお相手のガイドKIN", text: "あなたは、お相手のガイドKIN。あなたの生き方やことばが、お相手の道しるべになります。押しつけず、見守るように関わると力が生きます。" }
  };

  var SHARED = {
    seal: "同じ太陽の紋章。本質が似ていて、相手の喜ぶことや嫌がることが感覚で分かります。",
    tone: "同じ銀河の音。物事への取り組み方や役割が似ていて、ペースを合わせやすい組み合わせです。",
    wavespell: "同じウェイブスペル。心の奥にある潜在的なテーマが共通していて、深いところで共鳴し合えます。",
    color: "同じ色の紋章。「始める・整える・変える・熟す」のうち同じ力を持ち、目指す方向がそろいやすい組み合わせです。",
    toneMystic: "銀河の音を足すと14になる組み合わせ。神秘KINと同じ音の関係で、互いに足りないものを補い合えるとされます。"
  };

  function compatPerson(r) {
    return { birthLabel: dateLabel(r.input), kin: r.kin, seal: r.seal.name, color: r.seal.color, tone: r.tone.number, wavespell: r.wavespell.name, keyword: SEAL[r.seal.name].keyword, leapDay: !!r.leapDay };
  }

  function buildMayaCompatibilityView(c) {
    var links = c.links.map(function (k) { return { label: LINK[k].label, text: LINK[k].text }; });
    var shared = c.shared.map(function (k) { return SHARED[k]; });
    var pk = c.pairKin;
    var lead;
    if (links.length) lead = "ふたりは「" + links.map(function (l) { return l.label; }).join("」「") + "」の関係にある、マヤ暦の上で縁の深い組み合わせです。";
    else if (shared.length) lead = "ふたりは運命の五角形の関係ではありませんが、共通するエネルギーを持ち、自然に響き合える組み合わせです。";
    else lead = "ふたりは、それぞれ違うエネルギーを持つ組み合わせ。違いがあるからこそ、お互いにない世界を見せ合えます。";
    return {
      you: compatPerson(c.person1),
      partner: compatPerson(c.person2),
      tradition: COMPAT_TRADITION,
      lead: lead,
      links: links,
      shared: shared,
      pairKin: {
        kin: pk.kin, seal: pk.seal.name, color: pk.seal.color, tone: pk.tone.number,
        text: "ふたりの関係を表すKINは、KIN" + pk.kin + "「" + pk.seal.name + "・音" + pk.tone.number + "」。この関係のテーマは「" + SEAL[pk.seal.name].keyword + "」、取り組み方は「" + TONE[pk.tone.number].keyword + "」です。" + SEAL[pk.seal.name].body.split("。")[0] + "。ふたりでいるとき、この性質が関係の中に表れやすいでしょう。"
      }
    };
  }

  return {
    buildMayaCompatibilityView: buildMayaCompatibilityView,
    LINK: LINK,
    SHARED: SHARED,
    TRADITION: TRADITION,
    COLOR: COLOR,
    SEAL: SEAL,
    TONE: TONE,
    YEAR_TONE: YEAR_TONE,
    RELATION: RELATION,
    buildMayaView: buildMayaView
  };
});
