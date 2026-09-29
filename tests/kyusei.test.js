// 九星気学の自動テスト：node --test tests/
//
// 期待値は実装の式を使わず、独立した資料の値を固定して書いています（ゴールデンテスト）。
//
// 出典
//  [NAOJ]  国立天文台 暦計算室「暦要項」二十四節気（日本時間、分単位・四捨五入）
//          https://eco.mtk.nao.ac.jp/koyomi/yoko/2024/rekiyou242.html など（2005, 2010, 2015, 2020, 2021, 2023〜2027年）
//  [MSC]   Master Sean Chan「Feng Shui 20xx Flying Star Chart」各年の月の中宮星（＝月命星）と節入り時刻（UTC+8）
//          https://www.masterseanchan.com/fengshui-2022-flying-star-chart/ ・ -2023- ・ -2024- ・ -2025-
//          年の中宮星（＝本命星）：2022 五黄、2023 四緑、2024 三碧、2025 二黒
//          2027年丑月（2028年1月）＝三碧、2028年丑月（2029年1月）＝九紫、2029年寅月＝八白、2029年子月＝七赤
//  [BC]    ベストカレンダー「九星早見」2026年の月の九星：2/4〜 八白、3/5〜 七赤、4/5〜 六白、5/5〜 五黄、
//          6/6〜 四緑、7/7〜 三碧、8/7〜 二黒、9/7〜 一白（https://bestcalendar.jp/tools/kyusei）
//  [成美堂] 成美堂出版『占い大全 命占』第3章 九星気学の例：1991年3月20日生まれ → 月命星 四緑木星
//  [oggi]  Oggi.jp「2月は『戊寅 二黒土星』の月」（2025年2月）、「1月1日〜2月3日生まれは前年の星」
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const astro = require("../assets/js/core/astro.js");
const k = require("../assets/js/engines/kyusei.js");
const data = require("../assets/js/content/kyusei-data.js");
const text = require("../assets/js/content/kyusei-text.js");

const STAR = { 一白: 1, 二黒: 2, 三碧: 3, 四緑: 4, 五黄: 5, 六白: 6, 七赤: 7, 八白: 8, 九紫: 9 };
const calc = (y, m, d, time) => k.calculateKyusei({ year: y, month: m, day: d, time });
const hm = (h, m) => ({ hour: h, minute: m });

// [NAOJ] 12の節（小寒・立春・啓蟄・清明・立夏・芒種・小暑・立秋・白露・寒露・立冬・大雪）の日本時間
const NAOJ = {
  2005: ["01-05 15:03", "02-04 02:43", "03-05 20:45", "04-05 01:34", "05-05 18:53", "06-05 23:02", "07-07 09:17", "08-07 19:03", "09-07 21:57", "10-08 13:33", "11-07 16:42", "12-07 09:33"],
  2010: ["01-05 20:09", "02-04 07:48", "03-06 01:46", "04-05 06:30", "05-05 23:44", "06-06 03:49", "07-07 14:02", "08-07 23:49", "09-08 02:45", "10-08 18:26", "11-07 21:42", "12-07 14:38"],
  2015: ["01-06 01:21", "02-04 12:58", "03-06 06:56", "04-05 11:39", "05-06 04:53", "06-06 08:58", "07-07 19:12", "08-08 05:01", "09-08 08:00", "10-08 23:43", "11-08 02:59", "12-07 19:53"],
  2020: ["01-06 06:30", "02-04 18:03", "03-05 11:57", "04-04 16:38", "05-05 09:51", "06-05 13:58", "07-07 00:14", "08-07 10:06", "09-07 13:08", "10-08 04:55", "11-07 08:14", "12-07 01:09"],
  2021: ["01-05 12:23", "02-03 23:59", "03-05 17:54", "04-04 22:35", "05-05 15:47", "06-05 19:52", "07-07 06:05", "08-07 15:54", "09-07 18:53", "10-08 10:39", "11-07 13:59", "12-07 06:57"],
  2023: ["01-06 00:05", "02-04 11:43", "03-06 05:36", "04-05 10:13", "05-06 03:19", "06-06 07:18", "07-07 17:31", "08-08 03:23", "09-08 06:27", "10-08 22:16", "11-08 01:36", "12-07 18:33"],
  2024: ["01-06 05:49", "02-04 17:27", "03-05 11:23", "04-04 16:02", "05-05 09:10", "06-05 13:10", "07-06 23:20", "08-07 09:09", "09-07 12:11", "10-08 04:00", "11-07 07:20", "12-07 00:17"],
  2025: ["01-05 11:33", "02-03 23:10", "03-05 17:07", "04-04 21:49", "05-05 14:57", "06-05 18:57", "07-07 05:05", "08-07 14:52", "09-07 17:52", "10-08 09:41", "11-07 13:04", "12-07 06:05"],
  2026: ["01-05 17:23", "02-04 05:02", "03-05 22:59", "04-05 03:40", "05-05 20:49", "06-06 00:48", "07-07 10:57", "08-07 20:43", "09-07 23:41", "10-08 15:29", "11-07 18:52", "12-07 11:53"],
  2027: ["01-05 23:10", "02-04 10:46", "03-06 04:40", "04-05 09:17", "05-06 02:25", "06-06 06:26", "07-07 16:37", "08-08 02:27", "09-08 05:28", "10-08 21:17", "11-08 00:39", "12-07 17:38"]
};
const LONGITUDES = [285, 315, 345, 15, 45, 75, 105, 135, 165, 195, 225, 255];
const TERM_NAMES = ["小寒", "立春", "啓蟄", "清明", "立夏", "芒種", "小暑", "立秋", "白露", "寒露", "立冬", "大雪"];

function parseNaoj(year, s) {
  const [md, t] = s.split(" ");
  const [month, day] = md.split("-").map(Number);
  const [hour, minute] = t.split(":").map(Number);
  return { year, month, day, hour, minute };
}
// 日本時間の「年月日 時:分」を分単位で進める（日付の繰り上がりも扱う）
function addMinutes(p, delta) {
  const d = new Date(Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute + delta));
  return { year: d.getUTCFullYear(), month: d.getUTCMonth() + 1, day: d.getUTCDate(), hour: d.getUTCHours(), minute: d.getUTCMinutes() };
}
const at = (p) => calc(p.year, p.month, p.day, hm(p.hour, p.minute));

// [MSC] 月の九星（小寒の月〜大雪の月の順＝1月〜12月の節から始まる月）
// 各年：[小寒から（前年の丑月）, 立春から, 啓蟄から, …, 大雪から]
const MSC_MONTH_STARS = {
  2023: ["九紫", "八白", "七赤", "六白", "五黄", "四緑", "三碧", "二黒", "一白", "九紫", "八白", "七赤"],
  2024: ["六白", "五黄", "四緑", "三碧", "二黒", "一白", "九紫", "八白", "七赤", "六白", "五黄", "四緑"],
  2025: ["三碧", "二黒", "一白", "九紫", "八白", "七赤", "六白", "五黄", "四緑", "三碧", "二黒", "一白"]
};
// 各年の最初の月（小寒の前＝前年の子月）の星 [MSC 2022 Dec / 2023 Dec / 2024 Dec]
const MSC_PREV_DEC = { 2023: "一白", 2024: "七赤", 2025: "四緑" };

// ---------- 節入り時刻の精度 ----------

test("[NAOJ] 10年分・120個の節入り時刻が国立天文台の値と1分以内（2005〜2027年）", () => {
  let max = 0;
  for (const [y, list] of Object.entries(NAOJ)) {
    list.forEach((s, i) => {
      const p = parseNaoj(Number(y), s);
      const ref = astro.julianDayJst(p.year, p.month, p.day, p.hour + p.minute / 60);
      const diff = Math.abs(astro.solarLongitudeTime(Number(y), LONGITUDES[i]) - ref) * 1440;
      max = Math.max(max, diff);
      assert.ok(diff <= 1, `${y} ${TERM_NAMES[i]} ${s}：差 ${diff.toFixed(2)}分`);
    });
  }
  assert.ok(max < 1);
});

test("[NAOJ] 立春の表示（日本時間・分）：2024年 2/4 17:27、2021年 2/3 23:59、2025年 2/3 23:10", () => {
  for (const [y, m, d, want] of [[2024, 2, 10, "2024年2月4日 17:27"], [2021, 2, 10, "2021年2月3日 23:59"], [2025, 2, 10, "2025年2月3日 23:10"]]) {
    const r = calc(y, m, d).solarTermInfo.risshun;
    assert.equal(text.dateLabel(r.jst) + " " + text.timeLabel(r.jst), want);
  }
});

// ---------- 本命星 ----------

test("[MSC][BC] 本命星：2022 五黄、2023 四緑、2024 三碧、2025 二黒、2026 一白（立春後の通常日）", () => {
  const want = { 2022: "五黄", 2023: "四緑", 2024: "三碧", 2025: "二黒", 2026: "一白" };
  for (const [y, s] of Object.entries(want)) {
    const r = calc(Number(y), 6, 15);
    assert.equal(r.honmei, STAR[s], y);
    assert.equal(r.kigakuYear, Number(y));
    assert.equal(r.solarTermInfo.mayChange, false);
  }
});

test("[oggi][MSC] 2024-02-03 は立春前 → 前年（2023年）の四緑木星。1月1日も前年", () => {
  for (const [m, d] of [[2, 3], [1, 1], [1, 20]]) {
    const r = calc(2024, m, d);
    assert.equal(r.kigakuYear, 2023);
    assert.equal(r.honmeiStar.name, "四緑木星");
    assert.equal(r.honmeiElement, "木");
  }
  assert.equal(calc(2024, 2, 5).honmeiStar.name, "三碧木星");
});

test("立春を1分単位で：2024年（NAOJ 17:27）17:24 は前年・17:30 は新年、17:26〜17:28 は誤差の幅として「変わる可能性」を返す", () => {
  const before = calc(2024, 2, 4, "17:24");
  assert.equal(before.honmeiStar.name, "四緑木星");
  assert.equal(before.getsumeiStar.name, "六白金星");
  assert.equal(before.solarTermInfo.mayChange, false);
  assert.equal(before.solarTermInfo.boundary.kind, "resolved");

  const after = calc(2024, 2, 4, "17:30");
  assert.equal(after.honmeiStar.name, "三碧木星");
  assert.equal(after.getsumeiStar.name, "五黄土星");
  assert.equal(after.solarTermInfo.mayChange, false);

  assert.equal(calc(2024, 2, 4, "17:26").honmeiStar.name, "四緑木星");
  assert.equal(calc(2024, 2, 4, "17:28").honmeiStar.name, "三碧木星");
  for (const t of ["17:26", "17:27", "17:28"]) {
    const r = calc(2024, 2, 4, t);
    assert.equal(r.solarTermInfo.mayChange, true, t);
    assert.equal(r.solarTermInfo.boundary.kind, "near-time");
  }
});

test("立春の当日（時刻なし）：節入りの日から新年として判定し、時刻で変わる可能性と前年側の星を返す", () => {
  const r = calc(2024, 2, 4);
  assert.equal(r.honmeiStar.name, "三碧木星");
  assert.equal(r.solarTermInfo.mayChange, true);
  assert.equal(r.solarTermInfo.boundary.kind, "on-day");
  assert.equal(r.solarTermInfo.boundary.term.term, "立春");
  assert.equal(r.solarTermInfo.alternative.honmeiStar.name, "四緑木星");
  assert.equal(r.solarTermInfo.alternative.getsumeiStar.name, "六白金星");
  // 2021年の立春は 2/3 23:59（NAOJ）。2/3 が当日、2/4 は日付の変わり目の直後なので誤差の幅として注意を出す
  assert.equal(calc(2021, 2, 3).solarTermInfo.boundary.kind, "on-day");
  assert.equal(calc(2021, 2, 3, "12:00").honmeiStar.name, "七赤金星");
  assert.equal(calc(2021, 2, 4).honmeiStar.name, "六白金星");
  assert.equal(calc(2021, 2, 4).solarTermInfo.boundary.kind, "near-edge");
});

// ---------- 月命星 ----------

test("[成美堂] 1991年3月20日生まれ → 月命星 四緑木星", () => {
  assert.equal(calc(1991, 3, 20).getsumeiStar.name, "四緑木星");
});

test("[oggi][BC] 2025年2月（立春後）→ 二黒土星、2026年の2月〜9月 → 八白・七赤・六白・五黄・四緑・三碧・二黒・一白", () => {
  assert.equal(calc(2025, 2, 10).getsumeiStar.name, "二黒土星");
  const want = ["八白", "七赤", "六白", "五黄", "四緑", "三碧", "二黒", "一白"];
  [[2, 10], [3, 10], [4, 10], [5, 10], [6, 10], [7, 10], [8, 10], [9, 10]].forEach(([m, d], i) => {
    assert.equal(calc(2026, m, d).getsumei, STAR[want[i]], `2026-${m}`);
  });
});

test("[MSC] 2027〜2029年の例：2028年1月＝三碧、2029年1月＝九紫、2029年2月（立春後）＝八白、2029年12月（大雪後）＝七赤", () => {
  assert.equal(calc(2028, 1, 20).getsumei, 3);
  assert.equal(calc(2028, 1, 20).kigakuYear, 2027);
  assert.equal(calc(2029, 1, 20).getsumei, 9);
  assert.equal(calc(2029, 2, 20).getsumei, 8);
  assert.equal(calc(2029, 12, 20).getsumei, 7);
});

test("[NAOJ][MSC] 12の節入りすべて × 3年（2023〜2025年）：節入りの3分前と3分後で月命星が正しく切り替わる", () => {
  for (const y of [2023, 2024, 2025]) {
    const stars = MSC_MONTH_STARS[y];
    NAOJ[y].forEach((s, i) => {
      const p = parseNaoj(y, s);
      const beforeWant = i === 0 ? MSC_PREV_DEC[y] : stars[i - 1];
      const b = at(addMinutes(p, -3));
      const a = at(addMinutes(p, 3));
      assert.equal(b.getsumei, STAR[beforeWant], `${y} ${TERM_NAMES[i]}の3分前`);
      assert.equal(a.getsumei, STAR[stars[i]], `${y} ${TERM_NAMES[i]}の3分後`);
      // 5分以上離れていれば「変わる可能性」は出ない
      assert.equal(at(addMinutes(p, -5)).solarTermInfo.mayChange, false);
      assert.equal(at(addMinutes(p, 5)).solarTermInfo.mayChange, false);
      // 節入りと同じ分は、誤差の幅として「変わる可能性」を返す
      assert.equal(at(p).solarTermInfo.mayChange, true, `${y} ${TERM_NAMES[i]} ちょうど`);
    });
  }
});

test("[NAOJ] 12の節入りの当日（時刻なし）は「変わる可能性」、前日・翌日は確定（2024・2026年）", () => {
  for (const y of [2024, 2026]) {
    NAOJ[y].forEach((s, i) => {
      const p = parseNaoj(y, s);
      const on = calc(p.year, p.month, p.day);
      assert.equal(on.solarTermInfo.mayChange, true, `${y} ${TERM_NAMES[i]} 当日`);
      assert.equal(on.solarTermInfo.boundary.term.term, TERM_NAMES[i]);
      const prev = addMinutes({ ...p, hour: 12, minute: 0 }, -1440);
      const next = addMinutes({ ...p, hour: 12, minute: 0 }, 1440);
      assert.equal(calc(prev.year, prev.month, prev.day).solarTermInfo.mayChange, false, `${y} ${TERM_NAMES[i]} 前日`);
      assert.equal(calc(next.year, next.month, next.day).solarTermInfo.mayChange, false, `${y} ${TERM_NAMES[i]} 翌日`);
      // 当日の既定は節入り後、代わりの結果は節入り前（前日と同じ星）
      assert.equal(on.getsumei, calc(next.year, next.month, next.day).getsumei);
      assert.equal(on.solarTermInfo.alternative.getsumei, calc(prev.year, prev.month, prev.day).getsumei);
    });
  }
});

test("丑月（小寒〜立春の前）は前年の気学上の年に属する：2024-01-10 → 2023年・四緑木星・丑月・六白金星", () => {
  const r = calc(2024, 1, 10);
  assert.equal(r.kigakuYear, 2023);
  assert.equal(r.monthBranch, "丑");
  assert.equal(r.getsumeiStar.name, "六白金星");
  assert.equal(calc(2024, 1, 3).monthBranch, "子"); // 小寒（1/6）の前は子月
});

test("月命星は西暦の月だけでは決まらない：2024年3月4日（啓蟄前）と3月6日（啓蟄後）で異なる", () => {
  assert.equal(calc(2024, 3, 4).getsumeiStar.name, "五黄土星");
  assert.equal(calc(2024, 3, 6).getsumeiStar.name, "四緑木星");
});

// ---------- 五行 ----------

test("九星と五行の対応（固定データ）", () => {
  const want = { 1: "水", 2: "土", 3: "木", 4: "木", 5: "土", 6: "金", 7: "金", 8: "土", 9: "火" };
  for (let n = 1; n <= 9; n++) assert.equal(data.STARS[n].element, want[n]);
  const r = calc(2021, 6, 15); // 六白金星の年
  assert.equal(r.honmeiElement, "金");
});

test("九星と五行の対応表は kyusei-data.js の1か所だけに書かれている", () => {
  const dir = path.join(__dirname, "..", "assets", "js");
  const files = ["engines/kyusei.js", "content/kyusei-text.js", "pages/kyusei-page.js", "pages/kyusei-compatibility-page.js", "pages/kyusei-render.js"];
  for (const f of files) {
    const src = fs.readFileSync(path.join(dir, f), "utf8");
    assert.ok(!/element\s*:\s*"[水土木金火]"/.test(src), f);
    assert.ok(!/"一白水星"/.test(src), f + " に九星名の表がある");
  }
});

test("五行の関係：比和・相生・相剋と向き", () => {
  assert.deepEqual(k.elementRelation("木", "木"), { type: "hiwa", generator: null, controller: null });
  assert.equal(k.elementRelation("木", "火").generator, "first");
  assert.equal(k.elementRelation("火", "木").generator, "second");
  assert.equal(k.elementRelation("水", "火").controller, "first");
  assert.equal(k.elementRelation("金", "水").type, "sosho");
  assert.equal(k.elementRelation("土", "水").type, "sokoku");
});

// ---------- 年代・精度 ----------

test("0001〜9999年すべてで結果を返し、1800〜2100年以外は「推定」", () => {
  const a = calc(1, 1, 1), b = calc(9999, 12, 31), c = calc(1800, 1, 1), d = calc(2100, 12, 31), e = calc(1582, 10, 10);
  for (const r of [a, b, c, d, e]) {
    assert.ok(r.honmei >= 1 && r.honmei <= 9 && r.getsumei >= 1 && r.getsumei <= 9);
  }
  assert.equal(a.precision, "estimated");
  assert.equal(a.kigakuYear, 0); // 0001年1月1日は立春前 → 紀元前1年（天文学的な0年）
  assert.equal(text.yearLabel(0), "紀元前1年");
  assert.equal(b.precision, "estimated");
  assert.equal(c.precision, "verified");
  assert.equal(d.precision, "verified");
  assert.equal(e.precision, "estimated");
  assert.ok(a.solarTermInfo.marginMinutes > c.solarTermInfo.marginMinutes);
});

test("出生時刻の形式：不正な時刻は受け付けない", () => {
  assert.throws(() => calc(2024, 2, 4, "25:00"));
  assert.throws(() => calc(2024, 2, 4, { hour: 10, minute: 60 }));
  assert.equal(calc(2024, 6, 15, "").input.time, null);
});

// ---------- 相性 ----------

// 本命星9 × 月命星9 の81通りをそろえた日付
function sampleResults() {
  const seen = new Map();
  for (let y = 2000; y < 2012 && seen.size < 81; y++) {
    for (let m = 1; m <= 12; m++) {
      const r = calc(y, m, 20);
      const key = r.honmei + "-" + r.getsumei;
      if (!seen.has(key)) seen.set(key, r);
    }
  }
  return [...seen.values()];
}

test("相性：A×B と B×A で、分類（対称であるべき情報）は同じ・向き（視点で変わる情報）は入れ替わる", () => {
  const rs = sampleResults();
  const flip = { a: "b", b: "a", null: null };
  let pairs = 0;
  for (const A of rs) {
    for (const B of rs) {
      const ab = k.calculateKyuseiCompatibility(A, B), ba = k.calculateKyuseiCompatibility(B, A);
      assert.equal(ab.category, ba.category);
      assert.equal(ab.innerCategory, ba.innerCategory);
      assert.equal(ab.honmeiRelation.type, ba.honmeiRelation.type);
      assert.equal(ab.honmeiRelation.sameStar, ba.honmeiRelation.sameStar);
      assert.equal(ab.honmeiRelation.giver, flip[ba.honmeiRelation.giver]);
      assert.equal(ab.honmeiRelation.actor, flip[ba.honmeiRelation.actor]);
      assert.equal(ab.getsumeiRelation.giver, flip[ba.getsumeiRelation.giver]);
      assert.equal(ab.getsumeiRelation.actor, flip[ba.getsumeiRelation.actor]);
      // 交差（あなたの本命星×お相手の月命星）は入れ替えると反対側の組になる
      assert.equal(ab.crossRelations.aHonmeiBGetsumei.type, ba.crossRelations.bHonmeiAGetsumei.type);
      assert.equal(ab.crossRelations.aHonmeiBGetsumei.giver, ba.crossRelations.bHonmeiAGetsumei.giver);
      pairs++;
    }
  }
  assert.equal(pairs, 81 * 81);
});

test("相性：具体例（1992-01-21 九紫・三碧 × 1991-08-20 九紫・八白）", () => {
  const c = k.calculateKyuseiCompatibility({ year: 1992, month: 1, day: 21 }, { year: 1991, month: 8, day: 20 });
  assert.equal(c.person1.honmeiStar.name, "九紫火星");
  assert.equal(c.person1.getsumeiStar.name, "三碧木星");
  assert.equal(c.person2.getsumeiStar.name, "八白土星");
  assert.equal(c.category, "hiwa");
  assert.equal(c.honmeiRelation.sameStar, true);
  assert.equal(c.innerCategory, "sokoku");
  assert.equal(c.getsumeiRelation.actor, "a"); // 木（あなた）が土（お相手）を抑える
  const v = text.buildKyuseiCompatibilityView(c);
  assert.equal(v.total.label, "感覚を共有しやすい");
});

test("相性の文章：相剋を「悪い」と書かない・断定や禁止表現を使わない・点数を付けない", () => {
  const rs = sampleResults().slice(0, 30);
  const bad = /必ず|絶対|最悪|別れるべき|科学的に証明|セックス|\d+\s*点|\/\s*100|相剋だから悪い|悪い相性です/;
  for (const A of rs) for (const B of rs) {
    const v = text.buildKyuseiCompatibilityView(k.calculateKyuseiCompatibility(A, B));
    const all = JSON.stringify(v);
    assert.ok(!bad.test(all), all.match(bad) && all.match(bad)[0]);
    assert.equal(v.intimacy.length, 6);
  }
  for (const A of rs) {
    const all = JSON.stringify(text.buildKyuseiView(A));
    assert.ok(!bad.test(all));
  }
});

test("個人鑑定の文章：9星それぞれの文章がそろっている", () => {
  const fields = ["catch", "keyword", "innerKeyword", "basic", "inner", "work", "love", "relations", "growth", "values", "talk", "pace", "closeness"];
  for (let n = 1; n <= 9; n++) {
    for (const f of fields) assert.ok(text.STAR_TEXT[n][f] && text.STAR_TEXT[n][f].length > 5, n + " " + f);
    assert.equal(text.STAR_TEXT[n].strengths.length, 3);
    assert.equal(text.STAR_TEXT[n].weaknesses.length, 3);
  }
});

// ---------- 既存の天文計算（星獣カルテ）を変えていないこと ----------

test("astro.sunLongitude / lunation は九星気学の追加前と同じ値（星獣カルテの結果を変えない）", () => {
  const want = [
    [2400000.5, "234.3901796808", "0.3801486781"],
    [2451545, "280.3725548788", "0.8235868552"],
    [2460000.25, "335.8599936893", "0.1513076727"],
    [2500000, "158.4589955645", "0.6858167650"]
  ];
  for (const [jd, lon, frac] of want) {
    assert.equal(astro.sunLongitude(jd).toFixed(10), lon);
    assert.equal(astro.lunation(jd).fraction.toFixed(10), frac);
  }
});
