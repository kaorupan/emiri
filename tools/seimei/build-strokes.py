#!/usr/bin/env python3
"""
姓名判断の画数表 assets/js/content/seimei-strokes.js を作る（ふだんは実行しなくてよい）

  python3 tools/seimei/build-strokes.py <moji.db のパス>

moji.db は npm パッケージ @mandel59/mojidata（MIT）に同梱の SQLite。
その中の「MJ文字情報一覧表」（IPA／文字情報技術促進協議会、CC BY-SA 2.1 JP）の「総画数」を使う。
- 戸籍・住民基本台帳の文字の標準字形（MJ文字図形）で数えた画数なので、日本で使われている字形の画数になる。
- 対象：JIS X 0213・JIS X 0212 にある漢字（＝ふつうのパソコン・スマホで入力できる漢字）と「髙」「𠮷」。
- 各文字は、その文字コード（実装したUCS）で表示される字形の画数を使う。互換漢字（神＝U+FA19 など）もその字形の画数になる。
"""
import sqlite3, sys, os, collections, json

db = sys.argv[1]
out = os.path.join(os.path.dirname(__file__), "..", "..", "assets", "js", "content", "seimei-strokes.js")
c = sqlite3.connect(db)
by = collections.defaultdict(list)
seen = {}
for u, n, x13, x12 in c.execute("select 実装したUCS, 総画数, X0213, X0212 from mji where 実装したUCS is not null order by MJ文字図形名"):
    if not u or len(u) != 1 or n is None or u in seen:
        continue
    if not (x13 or x12 or u in ("髙", "𠮷")):
        continue
    if not (0x3400 <= ord(u) <= 0x9FFF or 0xF900 <= ord(u) <= 0xFAFF or ord(u) >= 0x20000):
        continue
    seen[u] = n
    by[n].append(u)

lines = ",\n".join('    %d: "%s"' % (k, "".join(sorted(by[k]))) for k in sorted(by))
js = """/*
 * 姓名判断で使う漢字の画数（日本で使われている字形で数える）
 * 出典：MJ文字情報一覧表（IPA／一般社団法人 文字情報技術促進協議会、CC BY-SA 2.1 JP）の「総画数」。
 *   https://moji.or.jp/mojikiban/  （@mandel59/mojidata 同梱のデータから tools/seimei/build-strokes.py で書き出し）
 * 収録：JIS X 0213・JIS X 0212 の漢字と「髙」「𠮷」、%d字。このファイルは CC BY-SA 2.1 JP で利用できる。
 * 互換漢字（例：﨑・神（FA19））は別の字として、その字形の画数を持つ。
 */
(function (root, factory) {
  if (typeof module === "object" && module.exports) {
    module.exports = factory();
  } else {
    root.KaruteContent = root.KaruteContent || {};
    root.KaruteContent.seimeiStrokes = factory();
  }
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";
  var BY_STROKES = {
%s
  };
  var map = null;
  function build() {
    map = {};
    Object.keys(BY_STROKES).forEach(function (k) {
      var chars = Array.from(BY_STROKES[k]);
      for (var i = 0; i < chars.length; i++) map[chars[i]] = Number(k);
    });
  }
  return {
    count: %d,
    strokesOf: function (ch) { if (!map) build(); return map[ch] || null; }
  };
});
""" % (len(seen), lines, len(seen))
open(out, "w", encoding="utf-8").write(js)
print(len(seen), "chars ->", out)
