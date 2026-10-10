// 今日の運勢の自動テスト：node --test tests/
//
// 期待値は実装の式を使わず、独立した資料の値を固定して書いています（ゴールデンテスト）。
//
// 出典
//  [LUFT]  ルフト「九星気学早見表」日家九星（1997・2008・2009・2020・2026・2031・2032年の全日、閏の年を含む）
//          https://www.luft.co.jp/cgi/nine-star-ki-table.php → tests/fixtures/nikka-kyusei-luft.json
//  [LUFT-GZ] 同ページの六十干支（2026年）
//  [NAOJ]  国立天文台 暦計算室「令和8年(2026)暦要項 朔弦望」https://eco.mtk.nao.ac.jp/koyomi/yoko/2026/rekiyou263.html
//  [KICHI] 2026年の一粒万倍日・天赦日：ルフト「縁起のいい日・吉日カレンダー」を基本に、節入り当日の扱いを
//          ベストカレンダー・JAL「一粒万倍日カレンダー」にそろえたもの → tests/fixtures/kichijitsu-2026.json
//  [NAOJ-24] 国立天文台「令和8年(2026)暦要項 二十四節気」https://eco.mtk.nao.ac.jp/koyomi/yoko/2026/rekiyou262.html
//  [AE]    astronomy-engine 2.1.19 の EclipticGeoMoon（月の視黄経・その日の春分点基準）。独立した実装との比較
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { execFileSync } = require("node:child_process");
const astro = require("../assets/js/core/astro.js");
const daily = require("../assets/js/engines/daily.js");
const text = require("../assets/js/content/daily-text.js");

const calc = (y, m, d) => daily.calculateDaily({ year: y, month: m, day: d });

test("[LUFT] 日の九星：7年分（2,558日）の全日が一致（九星の閏を含む）", () => {
  const ref = JSON.parse(fs.readFileSync(path.join(__dirname, "fixtures/nikka-kyusei-luft.json"), "utf8")).years;
  let count = 0;
  for (const [y, digits] of Object.entries(ref)) {
    for (let i = 0; i < digits.length; i++) {
      const d = daily.addDays({ year: Number(y), month: 1, day: 1 }, i);
      assert.equal(calc(d.year, d.month, d.day).dayStar.number, Number(digits[i]), `${d.year}-${d.month}-${d.day}`);
      count++;
    }
  }
  assert.equal(count, 2558);
});

test("[LUFT] 九星の閏：夏至側は甲午が三碧（三碧が2日）、冬至側は甲午が七赤（七赤が2日）", () => {
  // 2020年 夏至側の閏：6/19 三碧（陽遁の終わり）→ 6/20 甲午 三碧（陰遁の始まり）
  assert.deepEqual([calc(2020, 6, 19).dayStar.number, calc(2020, 6, 20).dayStar.number, calc(2020, 6, 21).dayStar.number], [3, 3, 2]);
  assert.equal(calc(2020, 6, 20).sexagenary.name, "甲午");
  assert.equal(calc(2020, 6, 20).dayStar.dun, "yin");
  assert.equal(calc(2020, 6, 20).dayStar.leap, true);
  // 2031年 冬至側の閏：12/19 七赤 → 12/20 甲午 七赤（陽遁）
  assert.deepEqual([calc(2031, 12, 19).dayStar.number, calc(2031, 12, 20).dayStar.number, calc(2031, 12, 21).dayStar.number], [7, 7, 8]);
  assert.equal(calc(2031, 12, 20).dayStar.dun, "yang");
  // 閏でない年：2026年 6/18 九紫 → 6/19 甲子 九紫（陰遁）、12/15 一白 → 12/16 甲子 一白（陽遁）
  assert.deepEqual([calc(2026, 6, 18).dayStar.number, calc(2026, 6, 19).dayStar.number], [9, 9]);
  assert.deepEqual([calc(2026, 12, 15).dayStar.number, calc(2026, 12, 16).dayStar.number], [1, 1]);
  assert.equal(calc(2026, 6, 19).dayStar.leap, false);
});

test("[LUFT-GZ] 日の干支", () => {
  assert.equal(calc(2026, 1, 1).sexagenary.name, "乙亥");
  assert.equal(calc(2026, 2, 19).sexagenary.name, "甲子");
  assert.equal(calc(2026, 10, 10).sexagenary.name, "丁巳");
  assert.equal(calc(2026, 12, 31).sexagenary.name, "己卯");
  assert.equal(calc(2000, 1, 1).sexagenary.name, "戊午");
});

test("[AE] 月の黄経：独立した実装と0.02°以内", () => {
  const cases = [
    ["1900-06-15T03:00:00Z", 288.5744], ["1955-01-01T00:00:00Z", 358.8982], ["1999-08-11T11:03:00Z", 138.3002],
    ["2000-01-01T12:00:00Z", 223.3239], ["2020-06-21T06:40:00Z", 90.3438], ["2026-10-10T03:00:00Z", 190.3695],
    ["2026-10-26T04:12:00Z", 32.7651], ["2050-03-03T15:00:00Z", 108.5798], ["2099-12-31T21:00:00Z", 155.6824]
  ];
  for (const [iso, lon] of cases) {
    const jd = Date.parse(iso) / 864e5 + 2440587.5;
    const diff = Math.abs(((astro.moonLongitude(jd) - lon + 540) % 360) - 180);
    assert.ok(diff < 0.02, `${iso}: ${astro.moonLongitude(jd)} vs ${lon}`);
  }
});

test("[NAOJ] 新月・満月の日時（2026年9〜12月、日本時間・±1分）", () => {
  const naoj = [["new", 9, 11, 12, 27], ["full", 9, 27, 1, 49], ["new", 10, 11, 0, 50], ["full", 10, 26, 13, 12],
    ["new", 11, 9, 16, 2], ["full", 11, 24, 23, 54], ["new", 12, 9, 9, 52], ["full", 12, 24, 10, 28]];
  for (const [kind, m, d, h, mi] of naoj) {
    const ev = calc(2026, m, d).moon.events;
    assert.equal(ev.length, 1, `${m}/${d}`);
    assert.equal(ev[0].kind, kind);
    assert.ok(Math.abs(ev[0].time.hour * 60 + ev[0].time.minute - (h * 60 + mi)) <= 1, `${m}/${d} ${JSON.stringify(ev[0].time)}`);
  }
  assert.equal(calc(2026, 10, 12).moon.events.length, 0);
});

test("ランキング：九星は1〜9位、12星座は1〜12位が重複なく並ぶ", () => {
  for (let i = 0; i < 400; i += 7) {
    const d = daily.addDays({ year: 2026, month: 1, day: 1 }, i);
    const r = calc(d.year, d.month, d.day);
    assert.deepEqual(r.kyusei.map((k) => k.rank), [1, 2, 3, 4, 5, 6, 7, 8, 9]);
    assert.deepEqual([...new Set(r.kyusei.map((k) => k.star))].length, 9);
    assert.deepEqual(r.zodiac.map((z) => z.rank), [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]);
    assert.deepEqual([...new Set(r.zodiac.map((z) => z.sign))].length, 12);
    // 日の九星そのものは中宮に入る
    assert.equal(r.kyusei.find((k) => k.star === r.dayStar.number).palace, "center");
    // 月がある星座は第1ハウス
    assert.equal(r.zodiac.find((z) => z.sign === r.moon.sign).house, 1);
  }
});

test("日盤の宮：五黄が中宮の盤は、六白＝乾・一白＝坎・四緑＝巽（定位盤）", () => {
  assert.equal(daily.palaceOf(6, 5), "ken");
  assert.equal(daily.palaceOf(1, 5), "kan");
  assert.equal(daily.palaceOf(4, 5), "son");
  assert.equal(daily.palaceOf(9, 5), "ri");
  assert.equal(daily.palaceOf(2, 5), "kon");
});

test("今日誕生日の人：数秘の数と太陽星座（年で変わる日は両方）", () => {
  const b = calc(2026, 10, 10).birthday;
  assert.equal(b.birthday, 1);
  assert.equal(b.attitude, 2);
  assert.deepEqual(b.signs.map((s) => daily.SIGNS[s.sign].name), ["天秤座"]);
  const cusp = calc(2026, 3, 21).birthday.signs.map((s) => daily.SIGNS[s.sign].name).sort();
  assert.deepEqual(cusp, ["牡羊座", "魚座"].sort());
  assert.equal(calc(2026, 11, 29).birthday.birthday, 11);
});

test("文章：全宮・全ハウス・全関係の文章があり、使わない表現を含まない", () => {
  for (const id of daily.RANKED_PALACES) assert.ok(text.PALACE[id] && text.PALACE[id].text && text.PALACE[id].advice, id);
  for (let h = 1; h <= 12; h++) assert.ok(text.HOUSE[h] && text.HOUSE[h].text, h);
  for (let s = 1; s <= 9; s++) assert.ok(text.DAY_STAR[s], s);
  const v = text.buildDaily(calc(2026, 10, 10));
  const all = JSON.stringify(v);
  for (const ng of ["必ず", "絶対", "不幸", "最悪", "死"]) assert.ok(!all.includes(ng), ng);
  assert.equal(v.kyusei[0].name, "三碧木星");
  assert.equal(v.zodiac[0].name, "双子座");
});

test("生成：同じ日付で2回実行しても同じファイル（2回目は変更なし）", () => {
  const root = path.join(__dirname, "..");
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "emiri-daily-"));
  for (const p of ["index.html", "site.config.json", "assets", "tools"]) fs.cpSync(path.join(root, p), path.join(tmp, p), { recursive: true });
  const run = () => execFileSync(process.execPath, [path.join(tmp, "tools/daily/generate.mjs"), "--date", "2026-10-10", "--days", "2"], { encoding: "utf8" });
  run();
  const first = fs.readFileSync(path.join(tmp, "unsei/2026-10-10/index.html"), "utf8");
  assert.match(first, /2026年10月10日（土）の運勢/);
  assert.match(first, /href="\.\.\/2026-10-11\/"/);
  assert.match(fs.readFileSync(path.join(tmp, "index.html"), "utf8"), /<!-- daily:start -->[\s\S]*unsei\/2026-10-1\d\/[\s\S]*<!-- daily:end -->/);
  assert.ok(fs.existsSync(path.join(tmp, "koyomi/2026-10/index.html")) && fs.existsSync(path.join(tmp, "koyomi/2026-11/index.html")));
  assert.match(fs.readFileSync(path.join(tmp, "koyomi/2026-10/index.html"), "utf8"), /10\/1（木）[\s\S]*天赦日・一粒万倍日/);
  assert.match(run(), /変更なし/);
  fs.rmSync(tmp, { recursive: true, force: true });
});

test("[KICHI] 2026年の一粒万倍日（63日）・天赦日（6日）が全日一致", () => {
  const fx = JSON.parse(fs.readFileSync(path.join(__dirname, "fixtures/kichijitsu-2026.json"), "utf8"));
  const ichi = [], ten = [];
  for (let i = 0; i < 365; i++) {
    const d = daily.addDays({ year: 2026, month: 1, day: 1 }, i);
    const k = calc(d.year, d.month, d.day).koyomi.kichijitsu;
    if (k.includes("ichiryu")) ichi.push(`${d.month}/${d.day}`);
    if (k.includes("tensha")) ten.push(`${d.month}/${d.day}`);
  }
  assert.deepEqual(ichi, fx.ichiryumanbai);
  assert.deepEqual(ten, fx.tensha);
});

test("寅の日・巳の日・己巳の日：日の十二支・干支どおり（己巳の日は巳の日と重ねて出さない）", () => {
  for (let i = 0; i < 120; i++) {
    const d = daily.addDays({ year: 2026, month: 1, day: 1 }, i);
    const r = calc(d.year, d.month, d.day);
    const k = r.koyomi.kichijitsu, gz = r.sexagenary.name;
    assert.equal(k.includes("tora"), gz[1] === "寅", gz);
    assert.equal(k.includes("tsuchinotomi"), gz === "己巳", gz);
    assert.equal(k.includes("mi"), gz[1] === "巳" && gz !== "己巳", gz);
  }
  assert.deepEqual(calc(2026, 10, 10).koyomi.kichijitsu, ["mi"]);
  assert.deepEqual(calc(2026, 10, 1).koyomi.kichijitsu, ["tensha", "ichiryu"]);
});

test("[NAOJ-24] 2026年の二十四節気：24個すべて日付が一致し、時刻は±1分", () => {
  const naoj = [["小寒", 1, 5, 17, 23], ["大寒", 1, 20, 10, 45], ["立春", 2, 4, 5, 2], ["雨水", 2, 19, 0, 52], ["啓蟄", 3, 5, 22, 59],
    ["春分", 3, 20, 23, 46], ["清明", 4, 5, 3, 40], ["穀雨", 4, 20, 10, 39], ["立夏", 5, 5, 20, 49], ["小満", 5, 21, 9, 37],
    ["芒種", 6, 6, 0, 48], ["夏至", 6, 21, 17, 25], ["小暑", 7, 7, 10, 57], ["大暑", 7, 23, 4, 13], ["立秋", 8, 7, 20, 43],
    ["処暑", 8, 23, 11, 19], ["白露", 9, 7, 23, 41], ["秋分", 9, 23, 9, 5], ["寒露", 10, 8, 15, 29], ["霜降", 10, 23, 18, 38],
    ["立冬", 11, 7, 18, 52], ["小雪", 11, 22, 16, 23], ["大雪", 12, 7, 11, 53], ["冬至", 12, 22, 5, 50]];
  for (const [name, m, d, h, mi] of naoj) {
    const r = calc(2026, m, d);
    assert.equal(r.koyomi.term.today, name, `${m}/${d}`);
    const t = r.koyomi.term.current.time;
    assert.ok(Math.abs(t.hour * 60 + t.minute - (h * 60 + mi)) <= 1, `${name} ${t.hour}:${t.minute}`);
    const prev = daily.addDays({ year: 2026, month: m, day: d }, -1);
    assert.notEqual(calc(prev.year, prev.month, prev.day).koyomi.term.today, name);
  }
  const r = calc(2026, 10, 10).koyomi.term;
  assert.equal(r.current.name, "寒露");
  assert.equal(r.next.name, "霜降");
  assert.equal(r.next.inDays, 13);
});

test("[NAOJ] 次の新月・満月：日付・時刻（±1分）・あと何日", () => {
  const r = calc(2026, 10, 10).nextMoon;
  assert.deepEqual([r.new.date.month, r.new.date.day, r.new.inDays], [10, 11, 1]);
  assert.ok(Math.abs(r.new.time.hour * 60 + r.new.time.minute - 50) <= 1);
  assert.deepEqual([r.full.date.month, r.full.date.day, r.full.inDays], [10, 26, 16]);
  // 新月の当日は「次の新月」を翌月のものにする
  const r2 = calc(2026, 10, 11).nextMoon;
  assert.deepEqual([r2.new.date.month, r2.new.date.day], [11, 9]);
  assert.equal(daily.SIGNS[calc(2026, 10, 11).moon.events[0].sign].name, "天秤座");
  assert.equal(daily.SIGNS[calc(2026, 10, 26).moon.events[0].sign].name, "牡牛座");
});

test("文章：節気24・吉日5・新月満月の星座12がそろい、記事に吉日・節気・月の節がある", () => {
  for (const t of daily.SOLAR_TERMS) assert.ok(text.TERM_TEXT[t.name], t.name);
  for (const id of ["tensha", "ichiryu", "tsuchinotomi", "tora", "mi"]) assert.ok(text.KICHIJITSU[id].text && text.KICHIJITSU[id].actions.length === 3, id);
  assert.equal(text.NEW_MOON_WISH.length, 12);
  assert.equal(text.FULL_MOON_RELEASE.length, 12);
  const v = text.buildDaily(calc(2026, 10, 1));
  assert.match(v.lead, /^今日は天赦日と一粒万倍日が重なる/);
  assert.equal(v.moonFeature.kind, "countdown");
  assert.equal(text.buildDaily(calc(2026, 10, 11)).moonFeature.kind, "new");
  assert.equal(text.buildDaily(calc(2026, 10, 23)).season.featured, true);
});
