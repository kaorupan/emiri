/*
 * 本格占い「総合鑑定書」の追加の章（計算結果 → 表示用データ。DOM操作なし）
 *
 *   kantei-text.js の3占術（数秘術・九星気学・星獣カルテ）に、えみりのほかの占術を重ねる。
 *     四柱推命・マヤ暦・宿曜占星術・西洋占星術（ホロスコープ）・インド占星術・紫微斗数（出生時刻があるときだけ）
 *     姓名判断（姓名を入れたときだけ）・干支・吉方位（今年と来年）
 *   計算と文章は、それぞれの無料占いと同じエンジン・文章を使い、この鑑定書では
 *   「総合判断」（すべての占術に共通して表れる傾向）と「生年月日 × 名前」の重ね読みを加える。
 *
 * build(p, q, today, base) → { axisVotes, karuteFacts, synthesis, systemChapters, nameChapter, houiChapter, etoChapter,
 *                              add: { personality, work, love, money, relations, years:{年:[行]}, aisho }, method }
 *   p / q：kantei-text の requireInput 済みの入力（q は相性の相手、なければ null）。sei / mei は任意。
 *   base：{ who, honmei, getsumei, honmeiElement, lifePath, kigakuYear }
 */
(function (root, factory) {
  if (typeof module === "object" && module.exports) {
    module.exports = factory({
      ssmE: require("../engines/shichusuimei.js"), ssmT: require("./shichusuimei-text.js"),
      mayaE: require("../engines/maya.js"), mayaT: require("./maya-text.js"),
      shukuE: require("../engines/shukuyo.js"), shukuT: require("./shukuyo-text.js"),
      horoE: require("../engines/horoscope.js"), horoT: require("./horoscope-text.js"),
      jyoE: require("../engines/jyotish.js"), jyoT: require("./jyotish-text.js"),
      shibiE: require("../engines/shibi.js"), shibiT: require("./shibi-text.js"),
      seimeiE: require("../engines/seimei.js"), seimeiT: require("./seimei-text.js"),
      houiE: require("../engines/houi.js"), houiT: require("./houi-text.js"),
      etoE: require("../engines/eto.js"), etoT: require("./eto-text.js"),
      kyData: require("./kyusei-data.js")
    });
  } else {
    var E = root.KaruteEngines, C = root.KaruteContent;
    root.KaruteContent = root.KaruteContent || {};
    root.KaruteContent.kanteiExtra = factory({
      ssmE: E.shichusuimei, ssmT: C.shichusuimei, mayaE: E.maya, mayaT: C.maya, shukuE: E.shukuyo, shukuT: C.shukuyo,
      horoE: E.horoscope, horoT: C.horoscope, jyoE: E.jyotish, jyoT: C.jyotish, shibiE: E.shibi, shibiT: C.shibi,
      seimeiE: E.seimei, seimeiT: C.seimei, houiE: E.houi, houiT: C.houi, etoE: E.eto, etoT: C.eto, kyData: C.kyuseiData
    });
  }
})(typeof self !== "undefined" ? self : this, function (M) {
  "use strict";

  function para(text) { return text ? { type: "p", text: text } : null; }
  function heading(text) { return { type: "h3", text: text }; }
  function list(items) { return { type: "ul", items: items.filter(Boolean) }; }
  function facts(rows) { return { type: "facts", rows: rows.filter(function (r) { return r && r[1]; }) }; }
  function clean(blocks) { return blocks.filter(function (b) { return b && (b.type !== "p" || b.text) && (b.type !== "ul" || b.items.length) && (b.type !== "facts" || b.rows.length); }); }
  function safe(fn) { try { return fn(); } catch (e) { return null; } }

  // 通変星・マヤの色 → 「あなたの軸」（kantei-text と同じ6つの軸）
  var TSUHEN_AXIS = { "比肩": "kaitaku", "劫財": "kaitaku", "食神": "hyogen", "傷官": "hyogen", "偏財": "henka", "正財": "kochiku", "偏官": "kaitaku", "正官": "kochiku", "偏印": "tankyu", "印綬": "tankyu" };
  var MAYA_AXIS = { "赤": "kaitaku", "白": "chowa", "青": "henka", "黄": "kochiku" };
  var GEN = { 木: "火", 火: "土", 土: "金", 金: "水", 水: "木" };
  var KOKU = { 木: "土", 土: "水", 水: "火", 火: "金", 金: "木" };

  // 名前（人格の五行）と、生まれ持ったもの（本命星の五行）の関係
  function nameBirthRelation(nameEl, birthEl) {
    if (nameEl === birthEl) return { label: "比和（同じ五行）", text: "名前の中心（人格）と、生まれ持った本命星が同じ「" + nameEl + "」の五行です。生まれ持った性質を、名前がそのまま後押ししてくれる配置で、自分らしさをまっすぐ発揮しやすいでしょう。同じ性質が重なるぶん、強みも癖も濃く出やすいので、違うタイプの人の意見を取り入れるとバランスがとれます。" };
    if (GEN[birthEl] === nameEl) return { label: "相生（生まれ持ったものが名前を育てる）", text: "本命星の「" + birthEl + "」が、名前の人格の「" + nameEl + "」を生み出す関係です。生まれ持った性質が土台となって、名前に込められた力が自然と育っていく配置。年齢を重ねるほど、名前の持つ良さが表に出てきます。" };
    if (GEN[nameEl] === birthEl) return { label: "相生（名前が生まれ持ったものを支える）", text: "名前の人格の「" + nameEl + "」が、本命星の「" + birthEl + "」を生み出す関係です。名前が、生まれ持った性質を後ろから支えてくれる配置。名前を呼ばれるたびに、本来の力が引き出されるような心強さがあります。" };
    if (KOKU[nameEl] === birthEl) return { label: "相剋（名前が生まれ持ったものを引き締める）", text: "名前の人格の「" + nameEl + "」が、本命星の「" + birthEl + "」を抑える関係です。生まれ持った性質の行き過ぎを、名前がブレーキのように整えてくれる配置。自分を律する力が強いぶん、ときには肩の力を抜くことも大切です。" };
    return { label: "相剋（生まれ持ったものが名前を鍛える）", text: "本命星の「" + birthEl + "」が、名前の人格の「" + nameEl + "」を抑える関係です。生まれ持った性質と、名前の示す方向が少し違うため、内側で葛藤を感じることも。そのぶん両方の力を使い分けられる、幅の広い人になれます。" };
  }

  // 総格の数と、数秘術のライフパスの響き合い（数の根：総格を1桁にしたもの）
  function rootNumber(n) { var v = n; while (v > 9) v = String(v).split("").reduce(function (a, c) { return a + Number(c); }, 0); return v; }

  function build(p, q, today, base) {
    var out = { axisVotes: [], karuteFacts: [], systemChapters: [], add: { personality: [], work: [], love: [], money: [], relations: [], years: {}, aisho: [] }, method: [] };
    var birth = { year: p.year, month: p.month, day: p.day };
    var birthT = p.time ? { year: p.year, month: p.month, day: p.day, time: p.time } : birth;
    var keywords = [];
    var addYear = function (y, row) { (out.add.years[y] = out.add.years[y] || []).push(row); };

    // ---- 四柱推命 ----
    var ssm = safe(function () { return M.ssmT.buildShichusuimeiView(M.ssmE.calculateShichusuimei(birthT), today, M.ssmE); });
    if (ssm) {
      var dm = ssm.dayMaster, ch = ssm.chushin;
      keywords.push(["四柱推命", "日主「" + dm.name + "」：" + dm.catchphrase]);
      out.axisVotes.push({ axis: TSUHEN_AXIS[ch.name], w: 2, label: "四柱推命の中心星「" + ch.name + "」" });
      out.karuteFacts.push(["四柱推命", "日主 " + dm.name + "（" + dm.element + "）／中心星 " + ch.name + "／十二運 " + ssm.juniun.name + "／" + ssm.kuubou.name]);
      out.systemChapters.push({ id: "shichusuimei", title: "四柱推命で見るあなた", blocks: clean([
        para("四柱推命は、生まれた年・月・日" + (ssm.hasTime ? "・時刻" : "") + "の干支から、あなたが生まれ持った五行のバランスと、人生のリズムを読む占術です。"),
        facts(ssm.table.map(function (c) { return [c.label, c.empty ? "（時刻なし）" : c.stem + c.branch + "（" + c.stemReading + c.branchReading + "）　通変星：" + c.stemTsuhen + "・" + c.branchTsuhen + "　十二運：" + c.juniun]; })),
        heading("日主「" + dm.name + "」：" + dm.catchphrase),
        para(dm.body),
        facts(dm.facts),
        para(dm.caution),
        heading("中心星「" + ch.name + "」：" + ch.keyword),
        para(ch.body),
        heading("命式にあるほかの星"),
        list(ssm.others.map(function (o) { return o.name + "（" + o.keyword + "）：" + o.body; })),
        heading("十二運「" + ssm.juniun.name + "」"),
        para(ssm.juniun.body),
        heading("五行のバランス"),
        para(ssm.elements.summary),
        list(ssm.elements.texts.map(function (t) { return t[0] + "：" + t[1]; })),
        heading("天中殺：" + ssm.kuubou.name),
        para(ssm.kuubou.body),
        para(ssm.kuubou.note)
      ]) });
      out.add.work.push(heading("四柱推命から見た仕事"), para(dm.work));
      out.add.love.push(heading("四柱推命から見た恋愛"), para(dm.love));
      ssm.years.forEach(function (y) { addYear(y.year, ["四柱推命", y.name + "の年（通変星 " + y.tsuhen + "・十二運 " + y.juniun + "）：" + y.text + (y.kuubou ? "（天中殺の年）" : "")]); });
    }

    // ---- マヤ暦 ----
    var maya = safe(function () { return M.mayaT.buildMayaView(M.mayaE.calculateMaya(birth), today, M.mayaE); });
    if (maya) {
      keywords.push(["マヤ暦", "KIN" + maya.kin + "：" + maya.seal.name + "（" + maya.seal.keyword + "）"]);
      out.axisVotes.push({ axis: MAYA_AXIS[maya.seal.color], w: 1, label: "マヤ暦の紋章の色「" + maya.seal.color + "」" });
      out.karuteFacts.push(["マヤ暦", "KIN" + maya.kin + "／太陽の紋章 " + maya.seal.name + "／銀河の音 " + maya.tone.number + "（" + maya.tone.name + "）／ウェイブスペル " + maya.wavespell.name]);
      out.systemChapters.push({ id: "maya", title: "マヤ暦で見るあなた", blocks: clean([
        para("マヤ暦（13の月の暦）では、生まれた日のKIN（キン）から、あなたの本質と人生のテーマを読みます。"),
        para(maya.catchphrase + "。" + (maya.main.black ? "あなたは、宇宙のエネルギーを強く受け取るとされる「黒KIN」の日に生まれています。" : "")),
        heading("太陽の紋章「" + maya.seal.name + "」：" + maya.seal.keyword),
        para(maya.seal.body),
        facts([["強み", maya.seal.strength], ["色のテーマ", maya.seal.colorText], ["ヒント", maya.seal.hint]]),
        heading("銀河の音 " + maya.tone.number + "「" + maya.tone.name + "」：" + maya.tone.keyword),
        para(maya.tone.body),
        heading("ウェイブスペル「" + maya.wavespell.name + "」：" + maya.wavespell.keyword),
        para(maya.wavespell.same ? "太陽の紋章とウェイブスペルが同じです。表に見える性質と内に秘めた力が一致していて、自分らしさをそのまま生かしやすい人です。" : maya.wavespell.body),
        heading("あなたと縁の深い4つのKIN"),
        list(maya.relations.map(function (r) { return r.label + "（" + r.role + "）：" + r.name + "。" + r.text; }))
      ]) });
      maya.years.forEach(function (y) { addYear(y.year, ["マヤ暦", y.year + "年の誕生日から KIN" + y.kin + "（" + y.seal + "・音" + y.tone + "）：" + y.text]); });
    }

    // ---- 宿曜占星術 ----
    var shuku = safe(function () { return M.shukuT.buildShukuyoView(M.shukuE.calculateShukuyo(birth), today, M.shukuE); });
    if (shuku) {
      var hm = shuku.honmei;
      keywords.push(["宿曜占星術", hm.name + "：" + hm.keyword]);
      out.karuteFacts.push(["宿曜占星術", "本命宿 " + hm.name + "（" + hm.reading + "）／生まれた日の旧暦 " + shuku.lunarLabel]);
      out.systemChapters.push({ id: "shukuyo", title: "宿曜占星術で見るあなた", blocks: clean([
        para("宿曜占星術は、生まれた日の月の位置（旧暦）から、27の宿のどれに生まれたかを見る占術です。人との関係を細やかに読めるのが特徴です。"),
        heading("本命宿「" + hm.name + "」：" + hm.keyword),
        para(hm.body),
        facts([["恋愛", hm.love], ["仕事", hm.work]]),
        heading("人との関係（三九の秘法）"),
        para("宿曜では、相手の宿とあなたの宿の位置関係で、6つの関係が決まります。あなたから見たそれぞれの関係の宿は次のとおりです。"),
        list(shuku.groups.map(function (g) {
          var names = [].concat(g.near || [], g.middle || [], g.far || [], g.other || []).map(function (x) { return x.name; });
          return g.title + "：" + g.body + (names.length ? "（" + names.join("・") + "）" : "");
        }))
      ]) });
    }

    // ---- 西洋占星術 ----
    var horo = safe(function () { return M.horoT.buildHoroscopeView(M.horoE.calculateHoroscope(birthT), M.horoE.transits(today)); });
    if (horo) {
      keywords.push(["西洋占星術", "太陽 " + horo.sun.sign + "（" + horo.sun.keyword + "）・月 " + horo.moon.sign]);
      out.karuteFacts.push(["西洋占星術", "太陽 " + horo.sun.sign + "／月 " + horo.moon.sign + (p.time ? "" : "（正午で計算）")]);
      var pair = function (x) { return x[0] + "：" + x[1]; };
      out.systemChapters.push({ id: "horoscope", title: "西洋占星術（ホロスコープ）で見るあなた", blocks: clean([
        para("生まれた瞬間の太陽・月・惑星の位置から、あなたの心の地図を描きます。" + (p.time ? "" : "出生時刻がないため、正午の位置で計算しています（月の星座は日によって変わることがあります）。")),
        heading("太陽：" + horo.sun.sign + "（" + horo.sun.keyword + "）"),
        para(horo.sun.body),
        heading("月：" + horo.moon.sign),
        para(horo.moon.body),
        heading("個人の天体（考え方・愛し方・行動）"),
        list(horo.personal.map(pair)),
        heading("社会の天体（幸運と課題）"),
        list(horo.social.map(pair)),
        heading("エレメントとクオリティのバランス"),
        list(horo.balance.texts.map(pair)),
        heading("天体どうしの角度（アスペクト）"),
        list(horo.aspects.slice(0, 5).map(function (a) { return a.title + "：" + a.text; }))
      ]) });
      if (horo.personal[1]) out.add.love.push(heading("西洋占星術から見た愛し方"), para(horo.personal[1][1]));
      horo.year.forEach(function (y) { addYear(today.year, ["西洋占星術", y[0] + "：" + y[1]]); });
    }

    // ---- インド占星術 ----
    var jyo = safe(function () { var j = M.jyoE.calculateJyotish(birthT); return M.jyoT.buildJyotishView(j, M.jyoE.currentDasha(j, Date.UTC(today.year, today.month - 1, today.day))); });
    if (jyo) {
      keywords.push(["インド占星術", "ナクシャトラ " + jyo.nakshatra.name + "（" + jyo.nakshatra.keyword + "）"]);
      out.karuteFacts.push(["インド占星術", "月 " + jyo.moon.rashi + "（" + jyo.moon.ja + "）／ナクシャトラ " + jyo.nakshatra.name + " 第" + jyo.nakshatra.pada + "パーダ"]);
      out.systemChapters.push({ id: "jyotish", title: "インド占星術で見るあなた", blocks: clean([
        para("インド占星術では、とくに月の位置を大切にし、27のナクシャトラ（月の宿）と、人生の時期を区切るダシャーで運勢を読みます。"),
        heading("月の星座：" + jyo.moon.rashi + "（" + jyo.moon.ja + "）"),
        para(jyo.moon.text),
        heading("ナクシャトラ：" + jyo.nakshatra.name + "（" + jyo.nakshatra.keyword + "）"),
        para(jyo.nakshatra.text + "宿曜占星術の「" + jyo.nakshatra.shuku + "」にあたります。"),
        para(jyo.mayChange),
        heading("いまの時期（ダシャー）"),
        para(jyo.dasha.mahaText),
        facts([["大きな時期", jyo.dasha.maha + "（" + jyo.dasha.mahaRange + "）"], ["小さな時期", jyo.dasha.antar + "（" + jyo.dasha.antarRange + "）"], ["次の時期", jyo.dasha.next]])
      ]) });
      addYear(today.year, ["インド占星術", "いまは" + jyo.dasha.maha + "の大きな時期（" + jyo.dasha.mahaRange + "）。" + jyo.dasha.mahaText.replace(/^[^：]*：/, "")]);
    }

    // ---- 紫微斗数（出生時刻があるときだけ） ----
    var shibi = p.time ? safe(function () { return M.shibiT.buildShibiView(M.shibiE.calculateShibi(birthT)); }) : null;
    if (shibi) {
      keywords.push(["紫微斗数", "命宮 " + shibi.mei.stars.join("・") + "（" + shibi.mei.texts.map(function (t) { return t.keyword; }).join("／") + "）"]);
      out.karuteFacts.push(["紫微斗数", "命宮 " + shibi.mei.branch + "（" + shibi.mei.stars.join("・") + "）／身宮 " + shibi.shin.palace + "／" + shibi.kyoku.name]);
      out.systemChapters.push({ id: "shibi", title: "紫微斗数で見るあなた", blocks: clean([
        para("紫微斗数は、旧暦の生年月日と生まれた時刻から12の宮に星を配置し、人生の各分野を読む占術です。"),
        heading("命宮：" + shibi.mei.stars.join("・")),
        list(shibi.mei.texts.map(function (t) { return t.star + "（" + t.keyword + "）：" + t.text; })),
        heading("身宮：" + shibi.shin.palace),
        para(shibi.shin.text),
        heading("人生のリズム：" + shibi.kyoku.name),
        para(shibi.kyoku.text),
        heading("大切な宮"),
        list(shibi.readings.map(function (r) { return r.name + "（" + r.theme + "）：" + r.texts.join(""); })),
        heading("四化の星"),
        list(shibi.sika.map(function (s) { return s.title + "：" + s.text; }))
      ]) });
    }

    // ---- 姓名判断（姓名を入れたときだけ） ----
    var nameR = (p.sei && p.mei) ? M.seimeiE.calculateSeimei({ sei: p.sei, mei: p.mei }) : null;
    if (nameR && nameR.ok) {
      var nv = M.seimeiT.buildSeimeiView(nameR);
      var jin = nv.kakus[0], sou = nv.kakus[1];
      var rel = nameBirthRelation(nameR.jin.element, base.honmeiElement);
      var lpRoot = base.lifePath > 9 ? rootNumber(base.lifePath) : base.lifePath, souRoot = rootNumber(nameR.sou.value);
      keywords.push(["姓名判断", "人格" + jin.value + "画「" + jin.keyword + "」・総格" + sou.value + "画「" + sou.keyword + "」"]);
      out.karuteFacts.push(["姓名判断", nv.fullName + "：人格 " + jin.value + "画（" + jin.luck + "）／総格 " + sou.value + "画（" + sou.luck + "）／三才 " + nv.sansai.ten + "・" + nv.sansai.jin + "・" + nv.sansai.chi]);
      out.nameChapter = { id: "seimei", title: "名前が持つ力", blocks: clean([
        para(nv.fullName + "という名前の画数から、名前があなたに与えている力を読み解きます。生年月日の占いが「生まれ持ったもの」を表すのに対して、名前は「呼ばれるたびに育っていくもの」を表すと考えられています。"),
        facts(nv.kakus.map(function (k) { return [k.name + "（" + k.alias + "）", k.value + "画・" + k.luck + "「" + k.keyword + "」" + (k.rei ? "（霊数を含む）" : "")]; })),
        heading("名前の中心：人格" + jin.value + "画「" + jin.keyword + "」"),
        para(jin.role), para(jin.text),
        facts([["恋愛・人間関係", jin.love], ["仕事・お金", jin.work]]),
        heading("人生全体：総格" + sou.value + "画「" + sou.keyword + "」"),
        para(sou.role), para(sou.text),
        heading("若いころの土台：地格" + nv.kakus[2].value + "画「" + nv.kakus[2].keyword + "」"),
        para(nv.kakus[2].text),
        heading("人との関わり：外格" + nv.kakus[3].value + "画「" + nv.kakus[3].keyword + "」"),
        para(nv.kakus[3].text),
        heading("三才配置：" + nv.sansai.ten + "・" + nv.sansai.jin + "・" + nv.sansai.chi),
        para(nv.sansai.lead),
        list(nv.sansai.details.map(function (d) { return d[0] + "：" + d[1]; })),
        heading("生年月日 × 名前の重ね読み"),
        para("九星気学の本命星（" + base.honmei + "）の五行は「" + base.honmeiElement + "」、名前の人格の五行は「" + nameR.jin.element + "」。ふたつの関係は「" + rel.label + "」です。"),
        para(rel.text),
        para(lpRoot === souRoot
          ? "さらに、総格" + nameR.sou.value + "画を1桁にした数（" + souRoot + "）が、数秘術のライフパス" + base.lifePath + "と響き合っています。生まれ持った使命と、名前が示す人生のテーマが同じ方向を向いている、心強い組み合わせです。"
          : "総格" + nameR.sou.value + "画を1桁にした数は" + souRoot + "、数秘術のライフパスは" + base.lifePath + "。生まれ持った使命（ライフパス）に、名前が「" + sou.keyword + "」という別の色を加えて、人生をより豊かにしてくれます。"),
        heading("名前からのメッセージ"),
        para(nv.advice),
        para("※ 画数は今の字形で数えています。旧字体で数える流派とは結果が異なることがあります。")
      ]) };
      out.add.love.push(heading("名前から見た恋愛"), para(jin.love));
      out.add.work.push(heading("名前から見た仕事"), para(sou.work));
      out.nameResult = nameR;
    }

    // ---- 吉方位（今年と来年） ----
    var houiYears = [base.kigakuYear, base.kigakuYear + 1];
    var star = function (n) { return M.kyData.STARS[n].name; };
    out.houiChapter = { id: "kippoui", title: "あなたの吉方位（" + houiYears[0] + "年・" + houiYears[1] + "年）", blocks: clean([
      para("九星気学の年盤と、あなたの本命星（" + base.honmei + "）・月命星（" + base.getsumei + "）から、旅行や引っ越し、お参りに向く方位を出しました。年の区切りは立春です。")
    ].concat([].concat.apply([], houiYears.map(function (y) {
      var r = M.houiE.forPerson(y, base.honmeiNumber, base.getsumeiNumber);
      var best = r.dirs.filter(function (d) { return d.best; }), good = r.dirs.filter(function (d) { return d.good && !d.best; }), bad = r.dirs.filter(function (d) { return d.bad.length; });
      return [
        heading(y + "年（" + r.chart.eto.stem + r.chart.eto.branch + "・" + star(r.chart.center) + "中宮）"),
        facts([["最大吉方", best.map(function (d) { return d.name; }).join("・") || "なし"], ["吉方位", good.map(function (d) { return d.name; }).join("・") || "なし"], ["凶方位", bad.map(function (d) { return d.name + "（" + d.bad.join("・") + "）"; }).join("、")]]),
        r.honmeiCenter ? para("この年は本命星が中宮に入る「八方塞がり」の年とされます。大きな移動は慎重に。") : null,
        list(best.concat(good).map(function (d) { var e = M.houiT.STAR_EFFECT[d.star]; return d.name + "（" + star(d.star) + "）：" + e.title + "。" + e.text; }))
      ];
    }))).concat([heading("吉方位の使い方")]).concat(M.houiT.HOW_TO.map(para))) };

    // ---- 干支 ----
    var eto = M.etoE.etoOfYear(p.year);
    var bt = M.etoT.BRANCHES[eto.branchIndex];
    out.karuteFacts.push(["干支", eto.name + "（" + eto.reading + "）・" + bt.animal + "年"]);
    var etoYears = [today.year, today.year + 1].map(function (y) {
      var e = M.etoE.etoOfYear(y), r = M.etoT.RELATION[M.etoE.relation(eto.branchIndex, e.branchIndex)];
      return [heading(y + "年（" + e.name + "）との関係：" + r.label), para(r.text)];
    });
    out.etoChapter = { id: "eto", title: "生まれ年の干支：" + eto.name, blocks: clean([
      para(p.year + "年生まれのあなたの干支は「" + eto.name + "（" + eto.reading + "）」、十二支は「" + bt.kanji + "（" + bt.animal + "）」です。"),
      heading(bt.kanji + "年生まれの性格：" + bt.keyword),
      para(bt.character),
      facts([["恋愛", bt.love], ["仕事", bt.work], ["開運のヒント", bt.luck]])
    ].concat([].concat.apply([], etoYears)).concat([para("※ 干支はふだんの「〇〇年生まれ」に合わせて1月1日で区切っています。")])) };

    // ---- 総合判断 ----
    out.keywords = keywords;
    out.synthesisBlocks = function (axisMain, axisSub, axisName, axisSubName) {
      var elems = [];
      if (ssm) elems.push(["四柱推命の日主", ssm.dayMaster.element]);
      elems.push(["九星気学の本命星", base.honmeiElement]);
      if (nameR && nameR.ok) elems.push(["名前の人格", nameR.jin.element]);
      var counts = {};
      elems.forEach(function (e) { counts[e[1]] = (counts[e[1]] || 0) + 1; });
      var top = Object.keys(counts).sort(function (a, b) { return counts[b] - counts[a]; })[0];
      var EL_NOTE = { 木: "伸びていく成長の力", 火: "明るく燃える情熱の力", 土: "受け止め育てる安定の力", 金: "引き締めて磨く決断の力", 水: "しなやかに流れる知恵の力" };
      return clean([
        para("ここまでの占術を、すべて重ね合わせて読み解きます。違う物差しで測っても同じ結果が出るところは、あなたの中でとくに強く、揺るがない性質です。"),
        heading("占術ごとのキーワード"),
        facts(keywords),
        heading("すべての占術に共通するテーマ：" + axisName + "と" + axisSubName),
        para("数秘術・九星気学・星獣カルテに、四柱推命の中心星とマヤ暦の紋章の色を加えて重ね合わせても、あなたの中心にあるのは「" + axisName + "」、それを支えるのは「" + axisSubName + "」の力でした。たくさんの占術が同じ方向を指しているほど、その力はあなたにとって自然で、無理なく発揮できるものです。"),
        heading("五行で見たあなた"),
        para(elems.map(function (e) { return e[0] + "は「" + e[1] + "」"; }).join("、") + "。" + (counts[top] > 1
          ? "複数の占術で「" + top + "」の五行が重なっていて、" + EL_NOTE[top] + "が、あなたの根っこにあることがわかります。"
          : "占術ごとに違う五行が出ていて、ひとつの型にはまらない、多面的な魅力を持つ人です。場面によって違う顔を使い分けられることが強みになります。")),
        nameR && nameR.ok ? heading("生まれ持ったものと、名前で育つもの") : null,
        nameR && nameR.ok ? para("生年月日が示す「" + axisName + "」の力に、名前は人格「" + M.seimeiT.number(nameR.jin.value).keyword + "」と総格「" + M.seimeiT.number(nameR.sou.value).keyword + "」の力を加えています。生まれ持った力を土台に、名前の力を意識して育てていくことで、あなたらしさはさらに大きく花開きます。") : null,
        !(nameR && nameR.ok) ? para("（姓名を入れると、ここに「生まれ持ったものと名前で育つもの」の読み解きが加わります）") : null
      ]);
    };

    // ---- 相性の追加（相手がいるとき） ----
    if (q) {
      var bA = birth, bB = { year: q.year, month: q.month, day: q.day };
      var tA = birthT, tB = q.time ? { year: q.year, month: q.month, day: q.day, time: q.time } : bB;
      var blocks = [heading("ほかの占術から見たふたり")];
      var sc = safe(function () { return M.ssmT.buildShichusuimeiCompatibilityView(M.ssmE.calculateShichusuimeiCompatibility(tA, tB)); });
      if (sc) blocks.push(heading("四柱推命：" + sc.total.label), para(sc.total.text), para(sc.branch.label + "。" + sc.branch.text));
      var mc = safe(function () { return M.mayaT.buildMayaCompatibilityView(M.mayaE.calculateMayaCompatibility(bA, bB)); });
      if (mc) blocks.push(heading("マヤ暦：ふたりのKIN" + mc.pairKin.kin + "（" + mc.pairKin.seal + "）"), para(mc.lead), para(mc.pairKin.text));
      var kc = safe(function () { return M.shukuT.buildShukuyoCompatibilityView(M.shukuE.calculateShukuyoCompatibility(bA, bB)); });
      if (kc) blocks.push(heading("宿曜占星術：" + kc.pair.title), para(kc.pair.body), para(kc.distance));
      var hc = safe(function () { return M.horoT.buildHoroscopeCompatibilityView(M.horoE.calculateHoroscopeCompatibility(tA, tB)); });
      if (hc) blocks.push(heading("西洋占星術：太陽と月の相性"), para(hc.lead), para(hc.sun.label + "：" + hc.sun.text), para(hc.moon.label + "：" + hc.moon.text), list(hc.aspects.slice(0, 3).map(function (a) { return a.title + "：" + a.text; })));
      var jc = safe(function () { return M.jyoT.buildJyotishCompatibilityView(M.jyoE.calculateJyotishCompatibility(tA, tB)); });
      if (jc) blocks.push(heading("インド占星術：アシュタクータ " + jc.youAsGroom.total + "／36点"), para(jc.youAsGroom.label + "。" + jc.youAsGroom.text));
      var qn = (q.sei && q.mei) ? M.seimeiE.calculateSeimei({ sei: q.sei, mei: q.mei }) : null;
      if (nameR && nameR.ok && qn && qn.ok) {
        var nc = M.seimeiT.buildSeimeiCompatibilityView(M.seimeiE.calculateSeimeiCompatibility(nameR, qn));
        blocks.push(heading("名前の相性（姓名判断）"), para(nc.lead), facts([["性格の相性（人格・" + nc.jin.type + "）", nc.jin.text], ["人生の方向性（総格・" + nc.sou.type + "）", nc.sou.text]]), para(nc.sameJin));
      }
      out.add.aisho = clean(blocks);
    }

    out.method = [
      "四柱推命・マヤ暦・宿曜占星術・西洋占星術・インド占星術" + (shibi ? "・紫微斗数" : "") + (nameR && nameR.ok ? "・姓名判断" : "") + "・干支・吉方位も、えみりの無料占いと同じ計算と文章をもとにしています。" + (p.time ? "" : "出生時刻がないため、紫微斗数は含まず、西洋占星術・インド占星術は正午の位置で計算しています。"),
      "「総合判断」は、すべての占術の結果を重ね合わせて、えみりが用意した読み方で組み立てています。"
    ];
    return out;
  }

  return { build: build, nameBirthRelation: nameBirthRelation, TSUHEN_AXIS: TSUHEN_AXIS, MAYA_AXIS: MAYA_AXIS };
});
