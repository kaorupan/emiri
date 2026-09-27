# 占いのカルテ

完全無料・登録不要の占いサイト「占いのカルテ」のソースです。
「あなたを、ひとつの占いで決めつけない。」

静的サイト（HTML / CSS / 素のJavaScript）です。ビルドは不要で、フォルダをそのままWebサーバーに置けば動きます。

## ローカルで見る

`file://` で直接開くとディレクトリへのリンク（`suhijutsu/` など）が開けないため、簡易サーバーで見てください。

```sh
python3 -m http.server 8000
# → http://localhost:8000/
```

## ディレクトリ構成

```
/                         TOP（index.html）
/suhijutsu/               数秘術 個人鑑定
/suhijutsu/aisho/         数秘術 相性
/aisho/                   相性占いTOP
/learn/                   占いを知るTOP
/learn/suhijutsu/         数秘術を知る
/assets/css/common.css        全ページ共通（色・カード・ナビ・フォーム）
/assets/css/numerology.css    数秘術専用（クラス名は .num- 接頭辞）
/assets/js/core/date.js             生年月日の共通仕様（0001〜9999年・実在日・日本時間の今日）
/assets/js/core/dom.js              DOMヘルパー（textContentのみ）
/assets/js/core/profile.js          共通プロフィール（端末内保存。明示的に選んだ時だけ）
/assets/js/core/birthdate-field.js  生年月日入力の共通部品（エラーは入力欄の下に表示）
/assets/js/engines/numerology.js    数秘術の計算（DOMに触らない純粋関数）
/assets/js/content/numerology-text.js  数秘術の鑑定文（計算結果 → 表示用データ）
/assets/js/pages/numerology-page.js                 個人鑑定ページの描画
/assets/js/pages/numerology-compatibility-page.js   相性ページの描画
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

## 新しい占術を追加するとき

1. `assets/js/engines/<占術>.js` に計算だけを書き、`tests/<占術>.test.js` に既知の答えでテストを書く
2. `assets/js/content/<占術>-text.js` に文章
3. `assets/js/pages/<占術>-page.js` と `assets/css/<占術>.css`（固有の接頭辞）
4. `/<占術>/index.html` を既存ページからコピーして作る（ヘッダー・フッターはそのまま）
5. TOP・相性TOP・占いを知るTOP の「準備中」をリンクに差し替える
6. `npm test` と `npm run check` と E2E を通す

ヘッダー・フッターは各HTMLに同じものを書いています。`tools/check-site.mjs` が全ページで同じリンク先になっているかを確認します。ページが増えたら、共通部分を生成する仕組み（静的サイト生成）への移行を検討してください。

## テスト

```sh
npm test            # 計算・日付の自動テスト（node --test）
npm run check       # 静的チェック
python3 tests/e2e/browser_test.py   # ブラウザ操作テスト（要 Playwright + Chromium）
```

## 公開前に決めること

- **canonical**：いまはサイトのルートからのパス（`/suhijutsu/` など）です。ドメインが決まったら `https://…/suhijutsu/` の形に置き換えてください。ルート以外（サブディレクトリ）に置く場合もここを直します。
- **OGP画像**：未設定です。

## 数秘術の計算ルール

旧 `numerology-v11.html` の式を変更せずに移植しています（監査でA判定）。相性は統合版で追加された `compatibilityEngine()` を正本とし、同じ値になることを 12,000 組のランダムな生年月日で照合済みです。相性は「数秘術の唯一の公式」ではなく「占いのカルテ独自の相性分析」として表示します。
