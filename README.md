# えみり

無料占いと本格占いの総合占いサイト「えみり」（旧称：占いのカルテ）のソースです。
「あなたを、ひとつの占いで決めつけない。」

- **無料占い・コラム**：登録不要・何度でも。占術別（数秘術・タロット・星獣カルテ・九星気学）と、悩み別（恋愛・相性・仕事・性格・人間関係・お金）から選べる。
- **本格占い**（`/premium/`）：生年月日から複数の占術を計算し、鑑定書（PDF）にまとめる有料メニュー。現在は紹介ページのみ（準備中）。決済・鑑定書の生成はまだ実装していない。

内部の名前空間（`Karute` / `KaruteEngines` / `KaruteContent`）と localStorage のキー（`uranai-karute:` で始まるもの）は、保存済みデータを引き継ぐため旧名のまま残している。

静的サイト（HTML / CSS / 素のJavaScript）です。ビルドは不要で、フォルダをそのままWebサーバーに置けば動きます。

## ローカルで見る

`file://` で直接開くとディレクトリへのリンク（`suhijutsu/` など）が開けないため、簡易サーバーで見てください。

```sh
python3 -m http.server 8000
# → http://localhost:8000/
```

## ディレクトリ構成

```
/                         TOP（index.html）：無料占い／本格占いの切り替え・今日の運勢・悩みから選ぶ・占術から選ぶ（#uranau）
/premium/                 本格占いTOP（準備中）
/premium/sample/          総合鑑定書の見本（架空の1990年1月1日生まれ「サンプル」さん。本文はダミー文字＋ぼかし）
/unsei/                   今日の運勢の一覧（自動生成）
/unsei/YYYY-MM-DD/        その日の運勢：九星・12星座ランキング、暦・吉日・二十四節気・新月満月、今日誕生日の人（自動生成）
/koyomi/                  吉日カレンダーの一覧（自動生成）
/koyomi/YYYY-MM/          月ごとの吉日カレンダー：一粒万倍日・天赦日・己巳の日・寅の日・巳の日・節気・新月満月（自動生成。今月と来月）
/suhijutsu/               数秘術 個人鑑定
/suhijutsu/aisho/         数秘術 相性
/tarot/                   タロット（大アルカナ22枚・3枚引き）
/seiju/                   星獣カルテ（オリジナル占い）
/seiju/aisho/             星獣カルテ 相性
/kyusei/                  九星気学 個人鑑定（本命星・月命星）
/kyusei/aisho/            九星気学 相性
/shichusuimei/            四柱推命（命式・日干・中心星・十二運・五行・天中殺・年運）
/shichusuimei/aisho/ ・ /maya/aisho/ ・ /shukuyo/aisho/   各占術の相性（共通部品 assets/js/pages/compat-page.js）
/horoscope/ ・ /horoscope/aisho/  ホロスコープ（10天体・アスペクト・今年の木星土星）と相性（シナストリー）
/shibi/ ・ /shibi/aisho/      紫微斗数（命盤・14主星・四化）と相性（生まれた時刻が必須）
/jyotish/ ・ /jyotish/aisho/   インド占星術（9つの星・ラーシ・ナクシャトラ・ダシャー）と相性（アシュタクータ36点）
/shukuyo/                 宿曜占星術（本命宿・性格・三九の秘法の相性・今日の巡り）
/maya/                    マヤ暦（KIN・太陽の紋章・銀河の音・ウェイブスペル・4つの関係KIN・黒KIN・年回り）
/aisho/                   相性占いTOP
/learn/                   占いを知るTOP
/learn/suhijutsu/         数秘術を知る
/assets/css/common.css        全ページ共通（色・カード・ナビ・フォーム）
/assets/css/numerology.css    数秘術専用（クラス名は .num- 接頭辞）
/assets/css/tarot.css         タロット専用（クラス名は .tarot- 接頭辞）
/assets/css/seiju.css         星獣カルテ専用（クラス名は .seiju- 接頭辞）
/assets/css/kyusei.css        九星気学専用（クラス名は .kyusei- 接頭辞）
/assets/css/shichusuimei.css  四柱推命専用（.ssm- 接頭辞。kyusei.css の部品も使う）
/assets/js/core/date.js             生年月日の共通仕様（0001〜9999年・実在日・日本時間の今日）
/assets/js/core/dom.js              DOMヘルパー（textContentのみ）
/assets/js/core/profile.js          共通プロフィール（端末内保存。明示的に選んだ時だけ）
/assets/js/core/birthdate-field.js  生年月日入力の共通部品（エラーは入力欄の下に表示）
/assets/js/core/random.js           乱数源（crypto.getRandomValues）
/assets/js/core/storage.js          localStorage の安全な窓口（使えない環境でも例外を出さない）
/assets/js/core/astro.js            太陽の位置・月の満ち欠けの近似計算（Meeus）と、節入り時刻の高精度計算（VSOP87D短縮＋ΔT）。1800〜2100年を確認済み範囲とする
/assets/js/engines/numerology.js    数秘術の計算（DOMに触らない純粋関数）
/assets/js/content/numerology-text.js  数秘術の鑑定文（計算結果 → 表示用データ）
/assets/js/pages/numerology-page.js                 個人鑑定ページの描画
/assets/js/pages/numerology-compatibility-page.js   相性ページの描画
/assets/js/engines/tarot.js          タロットの抽選と「1日1回」の判定（DOMに触らない）
/assets/js/content/tarot-deck.js     カードデータ（番号・名前・キーワード・正逆の意味・逆位置の表れ方）
/assets/js/content/tarot-readings.js テーマ別の読み（カード×テーマ×正逆）
/assets/js/content/tarot-text.js     テーマ定義と、総合メッセージ・注意点の組み立て
/assets/js/pages/tarot-page.js       タロットページの描画と操作
/assets/js/engines/seiju.js          星獣カルテの判定と相性（DOMに触らない）
/assets/js/content/seiju-data.js     季節4つ・月のリズム3つ・12星獣の世界観データ
/assets/js/content/seiju-text.js     星獣カルテの鑑定文の組み立て
/assets/js/pages/seiju-render.js     星獣カルテの描画部品（紋章・月の形・12星獣の地図）
/assets/js/pages/seiju-page.js / seiju-compatibility-page.js  各ページの描画
/assets/js/content/kyusei-data.js    九星気学の固定データ（九星・五行・相生相剋・月の九星の起点・12の節）※伝統的な対応だけ
/assets/js/engines/kyusei.js         九星気学の計算（本命星・月命星・節入り・相性データ。DOMに触らない）
/assets/js/content/kyusei-text.js    九星気学の鑑定文（伝統的な位置づけ TRADITION と、サイト独自の読み解き STAR_TEXT を分けて持つ）
/assets/js/pages/kyusei-render.js    九星気学の描画部品（出生時刻の任意入力・九星のしるし・五行の巡り・境界のお知らせ）
/assets/js/pages/kyusei-page.js / kyusei-compatibility-page.js  各ページの描画
/assets/js/engines/shichusuimei.js   四柱推命の計算（年柱・月柱は kyusei.js の立春・節入り判定を使う。方式は冒頭コメント）
/assets/js/content/shichusuimei-text.js  四柱推命の鑑定文（TRADITION と、えみりの読み解きを分けて持つ）
/assets/js/pages/shichusuimei-page.js    四柱推命ページの描画（kyusei-render.js の部品を使う）
/assets/js/core/kyureki.js    旧暦（天保暦の規則・六曜）。今日の運勢の旧暦・六曜・日の宿にも使う
/assets/js/engines/shukuyo.js 宿曜占星術の計算（本命宿・三九の秘法・日の宿）
/assets/js/content/shukuyo-text.js  宿曜占星術の鑑定文
/assets/js/pages/shukuyo-page.js    宿曜占星術ページの描画
/assets/css/shukuyo.css      宿曜専用（.shuku- 接頭辞）
/assets/js/engines/maya.js   マヤ暦（13の月の暦・ドリームスペル）の計算。方式は冒頭コメント
/assets/js/content/maya-text.js  マヤ暦の鑑定文
/assets/js/pages/maya-page.js    マヤ暦ページの描画
/assets/css/maya.css         マヤ暦専用（.maya- 接頭辞。紋章の4色）
/assets/js/engines/daily.js          今日の運勢の計算（日の干支・日の九星・日盤・月の星座・ランキング。DOMに触らない）
/assets/js/content/daily-text.js     今日の運勢の文章（宮・ハウスの読み、暦、今日誕生日の人）
/assets/css/daily.css                今日の運勢専用（クラス名は .daily- 接頭辞）
/assets/js/content/kantei-text.js    本格占い「総合鑑定書」の組み立て（3占術＋あなたの軸＋これから3年。AIなし・同じ入力なら同じ内容）
/assets/js/pages/kantei-page.js      総合鑑定書の描画と「PDFで保存・印刷」
/assets/css/kantei.css               総合鑑定書専用（.kantei- 接頭辞）。印刷時はA4・白地・章ごとに改ページ
/tools/daily/generate.mjs            今日の運勢ページの生成（npm run daily）
/tools/daily/run-daily.bat           自分のWindows PCで毎日生成・公開するときのバッチ
/tools/seo/seo.mjs                   正式URL（canonical・og:url）、RSSの案内、sitemap.xml・feed.xml・robots.txt
/site.config.json                    公開URL（baseUrl）とサイト名。SEOの設定はここだけ
/sitemap.xml /feed.xml /robots.txt   自動生成（手で直さない）
/.github/workflows/daily-unsei.yml   GitHub Actions で毎日 0:05（日本時間）に生成・公開
/tests/*.test.js          計算・日付の自動テスト（Node）
/tests/e2e/browser_test.py  ブラウザ操作テスト（Playwright）
/tools/check-site.mjs     重複ID・リンク切れ・H1・meta・禁止表現などの静的チェック
```

### 3層の分離

1. **engines/**：入力 → 計算結果データ。DOMも文章も持たない。総合占いからはここだけを呼ぶ。
   ```js
   KaruteEngines.numerology.calculateNumerology({ year: 1992, month: 1, day: 21 }, { targetYear: 2026 })
   // → { lifePath: 7, birthday: 3, attitude: 4, personalYear: 5, personalMonths: [...], ... }
   ```
2. **content/**：計算結果 → 鑑定文（表示用データ）。
3. **pages/**：表示用データ → HTML。ID はページ内で一意な接頭辞付き（`num-` `aisho-` `bd-self-` など）。

各ファイルは即時関数で囲み、グローバルに出すのは `Karute` / `KaruteEngines` / `KaruteContent` の名前空間だけです。

## タロット

```js
KaruteEngines.tarot.drawTarot({ theme: "love", date: "2026-09-27", random: Karute.random.secure })
// → { spread: "three-card", theme: "love", date: "2026-09-27",
//     cards: [{ position: "past", cardId: 5, orientation: "reversed" }, …] }
```

- シャッフルは Fisher–Yates。逆位置の確率は `REVERSED_PROBABILITY`（0.35、旧版の値を維持）。
- 伏せたカードの向きはシャッフル時に決まり、選んだ後に変わらない。選んだ順に過去→現在→未来。
- テーマを増やすとき（例：決断・今日のメッセージ）は、`tarot-text.js` の `THEMES` に1件、`tarot-readings.js` の全22枚に同じキーの `{ upright, reversed }` を足す。テストが全カード分そろっているか確認する。
- カード画像を使うときは `tarot-deck.js` の各カードの `image` にパスを入れる（未設定なら文字のカード）。

### 「同じテーマは1日1回」

- 同じ端末・同じ日・同じテーマでは同じ結果を表示する。日付は日本時間0時で切り替える（端末の時計のタイムゾーンに依存しない）。
- 保存先：localStorage のキー `uranai-karute:tarot`。中身は次の形だけ（質問文などの自由入力は保存しない）。
  ```json
  { "version": 1, "date": "2026-09-27",
    "readings": { "love": { "cards": [ { "position": "past", "cardId": 5, "orientation": "reversed" }, … ] } } }
  ```
- 日付が変わった記録は使わず、次に保存するときに上書きする（前日以前の結果は残さない）。
- 同じ日・同じテーマの結果がすでにあれば上書きしない（先に引いた結果を正とする）。
- 保存データが壊れていたら無視して新しく引く。localStorage が使えない環境では、ページを開いている間だけ覚え、画面にその旨を表示する。

## 星獣カルテ（オリジナル占い）

「人は、生まれた日にひとつの星獣を宿す。」星獣＝季節（4）× 月のリズム（3）。

```js
KaruteEngines.seiju.calculateSeiju({ year: 1992, month: 1, day: 21 })
// → { beast: "tsukikage-cat", season: "winter", moonPhase: "full", precision: "verified", seasonDetail: {...}, moonDetail: {...} }
KaruteEngines.seiju.calculateSeijuCompatibility(birth1, birth2)
// → { category: "resonance", seasonRelation: {...}, moonRelation: {...}, intimacy: {...}, person1, person2 }
```

- 季節：日本時間のその日の終わり（24時）の太陽の視黄経。立春315°・立夏45°・立秋135°・立冬225°で切り替え（「立春の日から春」）。
- 月のリズム：その日の正午（日本時間）が、新月から次の新月までのどこにあるか。0〜1/3 満ちゆく月、1/3〜2/3 満ちた月、2/3〜1 欠けゆく月。
- 天文計算は Meeus『Astronomical Algorithms』の近似式（新月・満月は日食・月食の記録と15分以内で一致することをテストで確認）。ΔT を無視しているため、1800〜2100年を確認済み範囲（verified）とし、それ以外も同じ式で計算して「推定」（estimated）と表示する。
- 相性は「季節の関係（同じ／つながる／向かい合う）」×「月のリズムの関係（同じ／満ちた月がつなぐ／逆向き）」の表で4分類（共鳴しやすい・補い合いやすい・刺激を与え合う・ペース調整が必要）。点数は付けない。星獣どうしの特徴（offers / seeks）は詳細な文章に使う。

## 九星気学

```js
KaruteEngines.kyusei.calculateKyusei({ year: 2024, month: 2, day: 4, time: "17:20" }) // time は任意（日本時間）
// → { honmei: 4, getsumei: 6, honmeiElement: "木", getsumeiElement: "金", kigakuYear: 2023, monthIndex: 11,
//     innerRelation: {...}, solarTermInfo: { basis, risshun, termStart, nextTerm, boundary, mayChange, alternative, marginMinutes },
//     precision: "verified" }
KaruteEngines.kyusei.calculateKyuseiCompatibility(a, b) // a, b は生年月日（＋時刻）でも calculateKyusei の結果でもよい
// → { category, innerCategory, honmeiRelation: { type, giver, actor, ... }, getsumeiRelation, crossRelations, person1, person2 }
```

### 採用した計算ルール（流派・実装で差が出うる点）

| 項目 | えみりの方式 |
|---|---|
| 暦 | サイト共通の先発グレゴリオ暦（1582年以前もグレゴリオ暦をさかのぼって適用。ページごとに変えない） |
| 時刻 | 日本時間。天文計算の内部は世界時・力学時、表示はすべて日本時間（分は四捨五入＝国立天文台と同じ） |
| 年の区切り | その年の実際の立春（太陽黄経315°）の時刻。1月1日〜立春前は前年。「2月4日固定」にはしない |
| 月の区切り | 12の節（立春・啓蟄・清明・立夏・芒種・小暑・立秋・白露・寒露・立冬・大雪・小寒）の時刻。小寒〜立春前（丑月）は前年の気学上の年 |
| 本命星 | 気学上の年の九星。1年ごとに逆順（2017年＝一白水星を基準）。「11から西暦の各桁の和を引く」と同じ結果 |
| 月命星 | 寅月（立春〜）の星：一白・四緑・七赤の年＝八白、三碧・六白・九紫の年＝五黄、二黒・五黄・八白の年＝二黒。そこから毎月1つずつ逆順 |
| 節入り当日（時刻なし） | 多くの早見表と同じく「節入りの日から新しい月（年）」で判定し、「生まれた時刻によって結果が変わる可能性があります」と、節入り前だった場合の星を表示 |
| 出生時刻（任意） | 九星気学ページだけの任意入力。節入り時刻と比べて判定。時刻は保存しない（共通プロフィールは生年月日だけのまま） |
| 誤差の幅 | 確認済み範囲は前後2分、それ以外は 10分＋2.4×((年−1820)/100)²秒（ΔTの不確かさを見込んだサイト独自の目安）。幅の中なら「変わる可能性」を返す |
| 五行 | 一白＝水、二黒・五黄・八白＝土、三碧・四緑＝木、六白・七赤＝金、九紫＝火（kyusei-data.js の STARS にだけ書く） |
| 相性 | 本命星どうしの五行関係で分類（比和＝感覚を共有しやすい／相生＝力を渡しやすい／相剋＝刺激と調整が生まれやすい）。月命星どうし・交差の関係も表示。分類は対称、相生で「生む側（giver）」・相剋で「抑える側（actor）」は視点で入れ替わるデータとして保持。点数は付けない |
| 扱わないもの | 傾斜宮・吉方位・年盤／月盤の運勢 |

### 節入り時刻の精度（astro.js）

- 星獣カルテが使う `sunLongitude`（低精度式）は変更していない。国立天文台の節入り時刻と比べると最大で約13分ずれるため、九星気学用に別関数 `apparentSunLongitude`（VSOP87D 地球の級数を振幅1e-7 rad以上の130項に短縮、章動・光行差・FK5補正）と `deltaT`（NASA Espenak & Meeus の多項式）、`solarLongitudeCrossing` / `previousSolarLongitudeTime` / `solarLongitudeTime` を追加した。
- 国立天文台「暦要項」の二十四節気（2005・2010・2015・2020・2021・2023〜2027年の12節、120個）と比べて最大0.6分。分に丸めた値は120個中112個が一致し、残りも1分差。
- 独立した実装（astronomy-engine）と1800〜2100年の全節入りで比べて最大1分以内。1800〜2100年を確認済み（verified）、それ以外は同じ式で計算して「推定」と表示する。遠い年代では暦とのずれで、たとえば9999年の小寒は前年12月末になるが、計算は太陽の黄経から直接求めるので破綻しない。
- 星獣カルテの判定（季節・月相・12星獣）が変わっていないことは、`sunLongitude`・`lunation` の固定値テストと、1790〜2110年ほか約3.9万日の判定結果の一致で確認した。

### テストの出典（tests/kyusei.test.js）

- 国立天文台 暦計算室「暦要項」二十四節気：https://eco.mtk.nao.ac.jp/koyomi/yoko/
- Master Sean Chan「Feng Shui 2022〜2025 Flying Star Chart」（年・月の中宮星と節入り時刻 UTC+8）：https://www.masterseanchan.com/fengshui-2024-flying-star-chart/ ほか
- ベストカレンダー「九星早見」（2026年の月の九星）：https://bestcalendar.jp/tools/kyusei
- 成美堂出版『占い大全 命占』第3章 九星気学（1991年3月20日生まれ → 月命星 四緑木星）
- Oggi.jp（2025年2月＝二黒土星の月、1月1日〜2月3日生まれは前年の星）：https://oggi.jp/7697504 ・ https://oggi.jp/6772474

## 今日の運勢（毎日の自動生成）

```sh
npm run daily                                   # 日本時間の今日のページを作る
node tools/daily/generate.mjs --date 2026-10-10 # 日付を指定
node tools/daily/generate.mjs --date 2026-10-01 --days 10  # まとめて作る（過去の日付の作り直しにも）
```

- 運勢の記事には構造化データ（BlogPosting・BreadcrumbList）を入れ、sitemap.xml（全ページ）と feed.xml（新しい30日分のRSS）も毎回作り直す。
- 生成するもの：`unsei/<日付>/index.html`、`unsei/index.html`（一覧）、TOP の「今日の運勢」欄（`<!-- daily:start -->`〜`<!-- daily:end -->` の間だけ）、前日のページ（「次の日」リンクのため）。
- 文章は計算結果と文章データ（daily-text.js）の組み合わせで作る。AI や外部サービスは使わないので、費用はかからず、同じ日付なら何度実行しても同じ結果になる。
- 自動化は2通り。どちらか一方だけ使う。
  1. **GitHub Actions＋GitHub Pages**（採用中・PCの電源が切れていても動く）：`.github/workflows/daily-unsei.yml` が毎日 0:05 ごろに生成・テスト・コミットし、そのまま GitHub Pages に公開する。main に push したときも公開し直す。リポジトリの Settings → Pages の Source は「GitHub Actions」。
  2. **自分のWindows PC**：タスクスケジューラで `tools\daily\run-daily.bat` を毎日 0:05 に実行する。PCが起動していないと動かない。

### 計算のしかた

| 項目 | えみりの方式 |
|---|---|
| 日付 | 日本時間の暦日 |
| 日の干支 | ユリウス通日の60日周期（2000年1月1日＝戊午） |
| 日の九星 | 冬至に最も近い甲子＝一白で陽遁、夏至に最も近い甲子＝九紫で陰遁。冬至・夏至が甲午なら後の甲子。切替日の間隔が240日になるときは後の甲子の30日前（甲午）で切り替える（九星の閏：冬至側は七赤、夏至側は三碧が2日続く）。冬至・夏至の日付は astro.js の高精度式 |
| 九星のランキング | 日盤で本命星が入る宮の順（巽・乾・震・兌・離・坤・艮・坎・中宮）。日の星との五行の関係はひと言で添えるだけで、順位には使わない |
| 月の位置 | Meeus 第47章の主要40項（`astro.moonLongitude`）。astronomy-engine と比べて1900〜2100年で最大0.011° |
| 12星座のランキング | 正午（日本時間）の月の星座が、その星座から数えて何番目のハウスか。順位は 5・11・1・10・9・3・7・2・6・4・8・12 番目の順 |
| 新月・満月 | astro.js の朔望の式（力学時）から ΔT を引いて日本時間に。国立天文台の値と±1分 |
| 吉日（選日） | 節月（節入りの日から新しい月）と日の干支から。一粒万倍日＝節月ごとの十二支、天赦日＝季節ごとの干支（戊寅・甲午・戊申・甲子）、寅の日・巳の日＝日の十二支、己巳の日＝日の干支。2026年の一粒万倍日63日・天赦日6日が公開資料と一致 |
| 二十四節気 | 太陽黄経15°ごとの時刻（astro.js）。国立天文台の2026年の24個と日付一致・時刻±1分 |
| 次の新月・満月 | 翌日以降で最初の新月・満月の日時と月の星座、あと何日か |
| 今日誕生日の人 | 数秘術のバースデー・アティチュードナンバーと、1950〜2025年の各年の正午で判定した太陽星座（年で変わる日は両方を表示） |

順位（どの宮・ハウスを上にするか）は伝統的な意味をもとにした、えみりの読み方です。流派によって違う点：冬至・夏至が癸巳の日に当たる年の切替日（前の甲子をとる流派と後の甲子をとる流派がある。ここでは最も近い前の甲子）。

### テストの出典（tests/daily.test.js）

- ルフト「九星気学早見表」日家九星：1997・2008・2009・2020・2026・2031・2032年の全日（2,558日、閏の年を含む）と2026年の六十干支：https://www.luft.co.jp/cgi/nine-star-ki-table.php
- 国立天文台「令和8年(2026)暦要項 朔弦望」：https://eco.mtk.nao.ac.jp/koyomi/yoko/2026/rekiyou263.html
- astronomy-engine 2.1.19（月の黄経の比較。テストには固定値だけを書いている）

## 新しい占術を追加するとき

1. `assets/js/engines/<占術>.js` に計算だけを書き、`tests/<占術>.test.js` に既知の答えでテストを書く
2. `assets/js/content/<占術>-text.js` に文章
3. `assets/js/pages/<占術>-page.js` と `assets/css/<占術>.css`（固有の接頭辞）
4. `/<占術>/index.html` を既存ページからコピーして作る（ヘッダー・フッターはそのまま）
5. TOP・相性TOP・占いを知るTOP の「準備中」をリンクに差し替える
6. `npm test` と `npm run check` と E2E を通す

ヘッダー・フッターは各HTMLに同じものを書いています（メニュー：無料占い／相性／今日の運勢（準備中）／本格占い／占いを知る）。`tools/check-site.mjs` が全ページで同じリンク先になっているかを確認します。ページが増えたら、共通部分を生成する仕組み（静的サイト生成）への移行を検討してください。

## テスト

```sh
npm test            # 計算・日付の自動テスト（node --test）
npm run check       # 静的チェック
npm run daily       # 今日の運勢ページを作る（最後に npm run seo も実行される）
npm run seo         # 正式URL・sitemap.xml・feed.xml・robots.txt をそろえる
python3 tests/e2e/browser_test.py   # ブラウザ操作テスト：サイト全体と数秘術（要 Playwright + Chromium）
python3 tests/e2e/tarot_test.py     # ブラウザ操作テスト：タロット
python3 tests/e2e/seiju_test.py     # ブラウザ操作テスト：星獣カルテ
python3 tests/e2e/kyusei_test.py    # ブラウザ操作テスト：九星気学
```

## 公開前に決めること

- **正式URL**：`site.config.json` の `baseUrl`（いまは `https://emiri-uranai.com`）から、全ページの canonical・og:url・sitemap.xml・feed.xml・robots.txt を作ります。独自ドメインに移るときは `baseUrl` を変えて `node tools/daily/generate.mjs --all`（運勢の記事の構造化データも作り直し、最後に SEO の仕上げも実行）を実行します。独自ドメイン emiri-uranai.com（Cloudflare で DNS 管理、GitHub Pages の Custom domain に登録）で公開している。
- **OGP画像**：未設定です。

## 数秘術の計算ルール

旧 `numerology-v11.html` の式を変更せずに移植しています（監査でA判定）。相性は統合版で追加された `compatibilityEngine()` を正本とし、同じ値になることを 12,000 組のランダムな生年月日で照合済みです。相性は「数秘術の唯一の公式」ではなく「えみり独自の相性分析」として表示します。

## 四柱推命の検証
- tests/fixtures/shichusuimei-lunar.json：lunar-javascript 1.7.3（EightChar sect 2）で作った正解データ。
  年柱・月柱は中国時間（UTC+8）で節入りを判定するため、日本時間から1時間引いて比べている。
  作成時は 1900〜2100年のランダムな生年月日・時刻 2万件で突き合わせ、四柱・通変星・蔵干・十二運・天中殺がすべて一致。

## マヤ暦の検証
- tests/fixtures/maya-reference.json：公開されている年別一覧・早見表の値（出典はファイル内）。
- ガイドKINの紋章のずれは音ごとに 0・12・4・16・8（音1〜5、以後くり返し）。複数の解説サイトの表と一致を確認。

## 旧暦・宿曜の検証
- tests/fixtures/kyureki-astronomy-engine.json：astronomy-engine の新月・中気（日本時間）から別に組み立てた旧暦。
  作成時に1900〜2100年の全73,383日を突き合わせ、新月が0時の34秒後にある2097年1月の1か月だけ1日ずれた（nearEdge で案内）。
- 六曜は2026年10月をベストカレンダーと照合。本命宿は「觜宿の有名人」として紹介されている12人の生年月日で照合。

## 本格占い：相性の章
- kantei-text.js の buildKantei(person, today, partner?) に、相性の相手（1人・任意）を渡すと「〇〇さんとの相性」の章が「おわりに」の前に入る。
- 鑑定書の最後に「追加の相性鑑定」（別のお相手との相性の章だけを追加購入）への案内を表示する。
- 見本（/premium/sample/）は架空の「ミライ」さん（1992年5月15日）を相性の相手に設定し、相性の章は書き出しとお相手のカルテだけ読める。

## ホロスコープ
- 天体の位置は assets/js/vendor/astronomy-engine-2.1.19.min.js（MIT License、著作権表示はファイル先頭）で計算。
- tests/fixtures/horoscope-ingress-2025.json：公開されている2025年の星座入りの時刻と照合（太陽・水星は数分以内）。
- アセンダント・ハウスは出生地が必要なため、本格占い（出生地の入力）で扱う予定。

## 紫微斗数の検証
- tests/fixtures/shibi-iztro.json：iztro（MIT）の命盤と照合（日本と中国の旧暦の日付が同じ日のみ）。
  作成時は約3,800件で一致。違ったのは23時台が旧暦の月末にあたる3件だけ（iztro は晩子を当日の月で数える流派、えみりは翌日の子の刻）。

## インド占星術の検証
- tests/fixtures/jyotish-swisseph.json：スイス・エフェメリス（pyswisseph、SIDM_LAHIRI）のサイデリアル黄経と照合。
  作成時は3,000件で、境目（0.03°以内）の17件を除きナクシャトラ・ラーシがすべて一致。
- アシュタクータの表は流派差がある。@prisri/jyotish（ISC）の実装と比べ、ヴァルナ・ターラ・グラハ・マイトリは全組み合わせで一致。
  ヨーニは14×14の一般的な表、ガナは「新郎ラークシャサ×新婦デーヴァ＝1点」、ヴァシャは射手座・山羊座を前半後半で分ける方式を採用し、
  バクート・ナーディの打ち消し（例外）は点数に入れずお知らせとして表示する。

## 占いを知る（learn/）
- learn/suhijutsu/ 以外の解説ページ（tarot・kyusei・shichusuimei・maya・shukuyo・horoscope・shibi・jyotish・seiju・koyomi）は
  `npm run learn`（tools/learn/generate.mjs）で、鑑定に使っている文章データから作る。鑑定の文章を直したら実行し直す。

## 誕生日占い（tanjobi/）
- 366日ぶん（tanjobi/MM-DD/）と一覧（tanjobi/）は `npm run tanjobi`（tools/tanjobi/generate.mjs）で作る。
- 月日だけで決まるもの（太陽星座・バースデーナンバー・アティチュードナンバー・季節と二十四節気・誕生石）から組み立てる。
  誕生石は全国宝石卸商協同組合の2021年改訂版（全29石）。
- 今日の運勢の「今日が誕生日の人」から、その日の誕生日ページへリンクしている。

## 夢占い辞典（yume/）
- 文章は tools/yume/data/*.mjs（カテゴリごと、えみりのオリジナル）。`npm run yume` で yume/<語>/ と一覧を作る。
- 一覧ページではキーワード（ひらがな・カタカナどちらでも）でしぼりこめる（assets/js/pages/yume-index.js）。

- 方針：1語1ページで、ページの中を厚くする（場面別の意味を増やす）。場面ごとに別ページは作らない。需要の大きい種類（ゴキブリ・白い蛇など）だけ、親の語の「種類別」ページとして独立させる。
- データ：`tools/yume/data/<カテゴリ>.mjs`（カテゴリ本体）と `*-more.mjs`（`addTo` で既存カテゴリに語を追加、`upgrade` で既存の語に心理・恋愛・仕事・場面を追記）。
- 語の項目：`psych`（見るときの心理）・`love`・`work`・`parent`（親の語のslug）は任意。場面が4つ以上あるとページ先頭に場面の目次（#s1〜）が出る。
- 生成時に、slug の重複・related / parent の切れをエラーにする。テストで場面見出しの重複と、全ページの最低ライン（場面6つ以上・心理・恋愛と仕事の欄あり）を確認する。新しい語もこの基準を満たしてから公開する。

## 姓名判断（seimei/）

- `/seimei/`（個人鑑定）・`/seimei/aisho/`（名前の相性）は手書きのページ。`/seimei/kakusu/`（1〜81画の意味、82ページ）は `npm run seimei` で作る。
- 計算：`assets/js/engines/seimei.js`。五格（天格・人格・地格・外格・総格）、姓・名が1字のときは霊数1（天格・地格・外格のみ）、82以上は80を引く、三才配置は下1桁で五行。
- 画数は今の字形で数える（旧字体に直す康熙字典式はとらない）。漢字は MJ文字情報一覧表の総画数（CC BY-SA 2.1 JP）を `tools/seimei/build-strokes.py` で `assets/js/content/seimei-strokes.js` に書き出したもの（JIS X 0213/0212 の漢字＋髙・𠮷、約1.3万字）。互換漢字（神 U+FA19 など）はその字形の画数。漢字に Unicode 正規化はかけない。
- かなは書き順どおり、濁点＋2・半濁点＋1、「々」は直前の字と同じ画数。
- 81数の吉凶は熊崎式の流れをくむ一般的な区分。文章（`seimei-numbers.js`・`seimei-text.js`）はえみりのオリジナル。総合点と相性点はえみり独自の目安。
- 名前は保存も送信もしない。
- テスト：`tests/seimei.test.js`、`tests/e2e/seimei_test.py`。

## 吉方位（kippoui/）・干支（eto/）

- 吉方位：`assets/js/engines/houi.js`（九星気学の年盤）。年盤は中宮から後天定位の順に配置。凶方位＝五黄殺・暗剣殺・歳破・本命殺・本命的殺・月命殺・月命的殺・定位対冲。吉方位＝凶方位以外で本命星と相生・比和の星の方位、月命星とも相生・比和なら最大吉方。月盤・日盤・方位の角度は扱わない。
- 2026年の年盤と、本命星×月命星の4つの組み合わせの表示を、公開されている年盤（八雲院）と照合してテストにしている（tests/kippoui.test.js）。
- ページ：`npm run kippoui` で `kippoui/`（生年月日で調べる）、`kippoui/YYYY/`（年盤と一覧）、`kippoui/YYYY/1〜9/`（本命星別）を作る。年は「今日の気学上の年」と翌年。毎日の自動更新でも実行するので、立春を過ぎると翌年分が自動で増える（古い年のページは残る）。
- 干支：`assets/js/engines/eto.js`。ふだんの「〇〇年生まれ」に合わせて年の区切りは1月1日（四柱推命・九星気学は立春）。`npm run eto` で `eto/`（調べる・今年と来年の干支・早見表1924〜2035）と十二支12ページを作る。文章は `assets/js/content/eto-text.js`（えみりのオリジナル）。

## 手相（tesou/）

- `npm run tesou` で `tesou/`（見方・基本8本の図）、線ごとのページ25、テーマ別まとめ5つ（`tesou/renai/` 恋愛・結婚、`kinun/` 金運、`shigoto/` 仕事運、`kenkou/` 健康・体質、`seikaku/` 性格・才能。中身は generate.mjs の HUBS）、`tesou/shirushi/`（しるし）、`tesou/oka/`（丘）を作る。
- 図は `tools/tesou/svg.mjs` のオリジナルのSVG（右手の手のひらを自分に向けた形）。線ごとの「形と意味」には、形ごとの小さな図をつける（基本の線）。
- 文章は `tools/tesou/data.mjs`（えみりのオリジナル）。特定の手相家が名づけた独自の線の名前は使わず、一般的な名前の線だけを扱う。

## 相性占いと本格占いの役割分担

- 無料の相性占い＝1つの占術でふたりを見る（占術ごとの `*/aisho/`）。本格占い＝複数の占術を重ね合わせた「ふたりの相性」の章（鑑定書1,980円にお相手1人を含む。追加1人980円）。
- 「総合相性占い」（無料・広告で解放）は、本格占いと内容が重なるため作らないことにした。`aisho/` の枠は本格占いへの案内と、恋愛に関わるほかのページ（手相・干支・誕生日・夢）への回遊リンクに置き換えた。
- 各相性ページの本格占いの案内文は同じ文面にそろえる（`premium-upsell`）。

## 本格占い（総合鑑定書）のボリューム

- 土台の3占術（数秘術・九星気学・星獣カルテ：`kantei-text.js`）に、`kantei-extra.js` で四柱推命・マヤ暦・宿曜・西洋占星術・インド占星術・紫微斗数（時刻があるとき）・姓名判断（姓名があるとき）・干支・吉方位を重ねる。
- 「総合判断」の章：占術ごとのキーワード一覧、すべての占術に共通するテーマ（あなたの軸。四柱推命の中心星とマヤ暦の紋章の色も票に加える）、五行の重なり、生まれ持ったもの（生年月日）×名前で育つもの。
- 「名前が持つ力」の章：五格・三才配置に加え、人格の五行×本命星の五行、総格の数の根×ライフパスの重ね読み。
- 「これから3年」は数秘術・九星気学・四柱推命・マヤ暦・西洋占星術・インド占星術の6視点。相性の章にも四柱推命・マヤ暦・宿曜・西洋占星術・インド占星術・名前の相性を加える。
- A4のPDFで約33ページ（生年月日のみ）、姓名・出生時刻・相性の相手をすべて入れると約45ページ（見本で計測）。

## 運営者情報・プライバシーポリシー・お問い合わせ・特商法、Search Console・AdSense

- `npm run legal` で `about/`・`privacy/`・`contact/`・`tokushoho/` を作る（文面は tools/legal/generate.mjs）。全ページのフッターからリンク（tests/legal.test.js で確認）。
- 特商法：販売事業者「えみり（個人事業）」。運営責任者・所在地・電話番号は「請求があった場合には遅滞なく開示」。開示の請求はお問い合わせフォームで受け、メールで回答する。
- site.config.json の設定（入れたら `npm run legal` と `npm run seo` を実行）
  - `contactFormUrl`：お問い合わせのGoogleフォームのURL。空ならフォームのボタンを出さず「準備中」と表示。
  - `googleSiteVerification`：Search Console の「HTMLタグ」で確認するときの content の値。TOPの head に入る。
  - `adsenseClient`：AdSense のサイト運営者ID（ca-pub-…）。全ページの head に広告コードが入り、`ads.txt` も作られる。

## 本格占いの販売（Stripe ＋ Cloudflare Workers）

- 流れ：`premium/order/`（入力・確認・同意）→ `worker/` の `POST /api/checkout` が Stripe Checkout（1,980円）を作る → 支払い → `premium/kantei/?sid=…` → `GET /api/kantei` が支払い済みを確かめて入力内容を返す → ブラウザで鑑定書を描く（作成日＝購入日）。
- 入力内容は Stripe の注文情報（metadata）に保存。当方にデータベースはない。sid（URL）が読み返しの鍵。この端末で開いた鑑定書は注文ページに一覧表示（localStorage）。
- `premium/kantei/` は noindex でサイトマップから外す。
- 生成：`node tools/premium/generate.mjs`（注文ページ・鑑定書ページ、premium/ と premium/sample/ の `<!--buy-->` 部分）。
- site.config.json：`salesApiUrl`（Worker のURL）、`salesOpen`（true で販売開始）。
- Worker の公開：`.github/workflows/worker.yml`（GitHub シークレット CLOUDFLARE_API_TOKEN / CLOUDFLARE_ACCOUNT_ID）。Stripe のシークレットキーは Cloudflare の管理画面で `STRIPE_SECRET_KEY` として運営者本人が設定する。リポジトリには書かない（テストで確認）。
- 注意：鑑定文の組み立ては公開されている JavaScript で行うため、技術的には支払いなしで再現できる。価格帯から許容しているが、気になる場合は Worker 側で鑑定書を組み立てる形に移す。
- テスト：tests/premium-sales.test.js（Worker を偽の Stripe で検査）、tests/e2e/premium_order_test.py（偽APIで注文〜鑑定書表示）。

## Stripe の代理販売（Managed Payments）

- `worker/wrangler.toml` の `MANAGED_PAYMENTS = "true"` で、Stripe の代理販売で売る（販売者は Stripe の Link。購入者の明細は `LINK.COM* …`）。税コード `txcd_10503004`（デジタル文書・閲覧・買い切り）、税込。`PRICE_ID` を入れると管理画面で作った価格を使う。
- 運営者が Stripe の管理画面で Managed Payments を有効にし、規約に同意しておく必要がある（Settings → Managed Payments）。
- 特商法のページの「販売事業者」をどう書くかは、Stripe に確認してから変える（未変更）。

## アフィリエイト（紹介）枠

- 案件は `tools/affiliate/programs.json`。ASP でもらったリンク（url）と表示計測用画像（pixel）、紹介文、テーマ（love / general）を書く。
- `node tools/affiliate/inject.mjs` で各ページの `</main>` 直前に `<!--aff-->` 枠を入れる（案件0件なら枠なし）。毎日のワークフローでも実行。ページを生成し直したら、このスクリプトも実行する。
- 恋愛・相性のページは love、ほかの占いページは general。運営者情報・規約・本格占いのページには入れない。
- 枠には必ず「PR」と、広告であることの説明を出す（ステマ規制）。プライバシーポリシーに「アフィリエイトプログラムについて」（#affiliate）。

## 本格占いの導線の表示／非表示

- `site.config.json` の `premiumVisible`（今は false＝非表示）。`node tools/premium/visibility.mjs` で反映（毎日のワークフローでも実行）。
- 非表示のとき：メニュー・フッターの「本格占い」、TOP の切り替えタブ、各ページの案内（premium-upsell / premium-teaser）を `<!--premium-hidden:base64-->` にしまう。premium/ 以下は noindex でサイトマップから外れる（ページ自体は残る）。
- 戻すとき：`premiumVisible` を true にして同じスクリプトを実行するだけで、元の HTML に完全に戻る（テストで確認）。

## LINE で受け取る無料の総合鑑定書（line/）

- `line/`：入力フォーム（LIFF で開く）。`line/kantei/?d=…`：鑑定書の表示。どちらも noindex でサイトマップ外。
- 入力内容はサーバーに送らない。`assets/js/core/kantei-link.js` で入力と作成日を `?d=`（base64url の JSON）にして、LINE の中なら `liff.sendMessages` でそのリンクをトークに送ってから開く。無料版では有料の追加相性の案内は出さない。
- `site.config.json` の `liffId`（LINE Developers の LINE ログインチャネルで作った LIFF ID。公開値）を入れて `node tools/line/generate.mjs`。空の間は準備中。
- LIFF の設定：サイズ Full、エンドポイント `https://emiri-uranai.com/line/`、Scope `openid` `chat_message.write`、友だち追加オプション On (Aggressive)。リッチメニューの上段は `https://liff.line.me/<LIFF ID>`。
- テスト：tests/line.test.js、tests/e2e/line_test.py（偽の LIFF）。
- サイト内の案内：`node tools/line/cta.mjs`（liffId があるときだけ。TOP は紹介の下、ほかの占いページは本文の最後＝紹介枠の上。運営・規約・本格占い・LINE のページには入れない。毎日のワークフローでも実行）。QR コードは `assets/img/line-qr.svg`（LIFF の URL）。

## ほくろ占い（hokuro/）

- `node tools/hokuro/generate.mjs`：トップ（顔・体の図から探す）、場所ごとのページ（26か所）、テーマ別（renai / kinun / ninki / seikaku）。
- 図は `tools/hokuro/svg.mjs`（オリジナルの顔・体の図、向かって見た位置）、文章は `tools/hokuro/data.mjs`（オリジナル）。各ページに「変化があるほくろは皮膚科へ」の案内を入れる。
- 生成し直したら、`node tools/line/cta.mjs && node tools/affiliate/inject.mjs && node tools/premium/visibility.mjs && node tools/seo/seo.mjs` も実行する（毎日のワークフローでも実行される）。
- 恋愛系（hokuro/renai・mejiri・namida・kuchibiru）は紹介枠の love テーマ。

## 星のわんにゃん占い（wannyan/・オリジナル）

- 星獣カルテと同じ天体計算で96タイプ（犬48・猫48）。時期8（季節の前半・後半、太陽黄経）× 月の形12（月齢12等分）。星獣1つにつき8タイプ。月の形の前半2つ＝犬、後半2つ＝猫。
- `assets/js/content/seiju-types.js`（時期・月の形・元素の文章）、`assets/js/content/wannyan-data.js`（96タイプの文章・チーム名）、`assets/js/engines/wannyan.js`（判定。元素＝日干の五行）、`assets/js/pages/wannyan-page.js`（診断）。
- `node tools/wannyan/generate.mjs`：wannyan/（診断・96タイプ一覧）と wannyan/<slug>/（96ページ）。画像は `assets/img/wannyan/<slug>.webp` を置いて実行し直すと差し替わる（なければ絵文字のカード）。画像の指示書は `tools/wannyan/image-prompts.md`。
- 生成し直したら cta / affiliate / visibility / seo も実行する。
