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
/suhijutsu/               数秘術 個人鑑定
/suhijutsu/aisho/         数秘術 相性
/tarot/                   タロット（大アルカナ22枚・3枚引き）
/seiju/                   星獣カルテ（オリジナル占い）
/seiju/aisho/             星獣カルテ 相性
/kyusei/                  九星気学 個人鑑定（本命星・月命星）
/kyusei/aisho/            九星気学 相性
/aisho/                   相性占いTOP
/learn/                   占いを知るTOP
/learn/suhijutsu/         数秘術を知る
/assets/css/common.css        全ページ共通（色・カード・ナビ・フォーム）
/assets/css/numerology.css    数秘術専用（クラス名は .num- 接頭辞）
/assets/css/tarot.css         タロット専用（クラス名は .tarot- 接頭辞）
/assets/css/seiju.css         星獣カルテ専用（クラス名は .seiju- 接頭辞）
/assets/css/kyusei.css        九星気学専用（クラス名は .kyusei- 接頭辞）
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
python3 tests/e2e/browser_test.py   # ブラウザ操作テスト：サイト全体と数秘術（要 Playwright + Chromium）
python3 tests/e2e/tarot_test.py     # ブラウザ操作テスト：タロット
python3 tests/e2e/seiju_test.py     # ブラウザ操作テスト：星獣カルテ
python3 tests/e2e/kyusei_test.py    # ブラウザ操作テスト：九星気学
```

## 公開前に決めること

- **canonical**：いまはサイトのルートからのパス（`/suhijutsu/` など）です。ドメインが決まったら `https://…/suhijutsu/` の形に置き換えてください。ルート以外（サブディレクトリ）に置く場合もここを直します。
- **OGP画像**：未設定です。

## 数秘術の計算ルール

旧 `numerology-v11.html` の式を変更せずに移植しています（監査でA判定）。相性は統合版で追加された `compatibilityEngine()` を正本とし、同じ値になることを 12,000 組のランダムな生年月日で照合済みです。相性は「数秘術の唯一の公式」ではなく「えみり独自の相性分析」として表示します。
