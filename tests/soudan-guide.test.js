const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const html = fs.readFileSync(path.join(__dirname, '../soudan/index.html'), 'utf8');
test('相談ガイドは無料コンテンツと外部の有料相談を区別する', () => {
  assert.ok(html.includes('「登録無料」と「鑑定無料」は別'));
  assert.ok(html.includes('無料占いを利用するための条件ではありません'));
  assert.ok(html.includes('href="../ichiran/"'));
  assert.ok(html.includes('予算の上限'));
});
test('相談ガイドは広告表示と既存の計測・リンク保護を維持する', () => {
  assert.ok(html.includes('このページには広告（PR）を含みます'));
  assert.ok(html.includes('rel="nofollow sponsored noopener"'));
  assert.equal((html.match(/data-track="aff_click"/g) || []).length, 5);
  assert.ok(!/<a[^>]+href="[^\"]*premium\//.test(html));
});
