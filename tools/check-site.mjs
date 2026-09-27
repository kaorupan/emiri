#!/usr/bin/env node
// サイト全体の静的チェック：node tools/check-site.mjs
//  - 重複ID / H1 が1つ / title・description・canonical
//  - リンク切れ（ファイルと #アンカー）、CSS/JSの参照切れ
//  - 利用者に見える開発者向け文言・直接的な表現
//  - ファイル名のバージョン番号
//  - 共通ナビ・フッターが全ページで同じリンク先か
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const SKIP_DIRS = new Set([".git", "node_modules", "tests", "tools"]);
const problems = [];
const note = (file, msg) => problems.push(`${path.relative(ROOT, file) || file}: ${msg}`);

function walk(dir, out = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (e.isDirectory()) { if (!SKIP_DIRS.has(e.name)) walk(path.join(dir, e.name), out); }
    else out.push(path.join(dir, e.name));
  }
  return out;
}

const files = walk(ROOT);
const htmlFiles = files.filter((f) => f.endsWith(".html"));
const idsByFile = new Map();

const stripComments = (s) => s.replace(/<!--[\s\S]*?-->/g, "");
const attrValues = (html, attr) => [...html.matchAll(new RegExp(`\\s${attr}="([^"]*)"`, "g"))].map((m) => m[1]);

for (const f of htmlFiles) {
  const html = stripComments(fs.readFileSync(f, "utf8"));
  const ids = attrValues(html, "id");
  idsByFile.set(f, new Set(ids));
  const seen = new Set();
  for (const id of ids) { if (seen.has(id)) note(f, `重複ID "${id}"`); seen.add(id); }
}

function resolveTarget(fromFile, href) {
  const [p, frag] = href.split("#");
  let target = fromFile;
  if (p) {
    target = path.resolve(path.dirname(fromFile), p);
    if (p.endsWith("/") || (fs.existsSync(target) && fs.statSync(target).isDirectory())) target = path.join(target, "index.html");
  }
  return { target, frag };
}

// ページごとの共通ナビ・フッターのリンク先（サイト内の絶対パスへ正規化）
const navSignature = new Map();

for (const f of htmlFiles) {
  const html = stripComments(fs.readFileSync(f, "utf8"));

  const h1 = (html.match(/<h1[\s>]/g) || []).length;
  if (h1 !== 1) note(f, `H1 が ${h1} 個`);
  if (!/<title>[^<]{5,}<\/title>/.test(html)) note(f, "title がない");
  if (!/<meta name="description" content="[^"]{30,}"/.test(html)) note(f, "meta description がない/短い");
  if (!/<link rel="canonical" href="[^"]+"/.test(html)) note(f, "canonical がない");
  if (!/<html lang="ja">/.test(html)) note(f, 'html lang="ja" がない');

  for (const href of [...attrValues(html, "href"), ...attrValues(html, "src")]) {
    if (/^(https?:|mailto:|tel:|data:)/.test(href)) continue;
    if (href.startsWith("/")) {
      // canonical はサイトのルートからのパスで書く。それ以外の絶対パスは禁止（サブディレクトリ配置で壊れるため）
      if (!new RegExp(`rel="canonical" href="${href.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}"`).test(html)) note(f, `ルート絶対パスのリンク ${href}`);
      continue;
    }
    if (href === "#") { note(f, 'href="#" のダミーリンク'); continue; }
    const { target, frag } = resolveTarget(f, href);
    if (!fs.existsSync(target)) { note(f, `リンク切れ ${href}`); continue; }
    if (frag && target.endsWith(".html") && !idsByFile.get(target)?.has(frag)) note(f, `アンカー切れ ${href}`);
  }

  const block = (re) => (html.match(re) || [""])[0];
  const sig = (part) => attrValues(part, "href").map((h) => {
    const { target, frag } = resolveTarget(f, h);
    return path.relative(ROOT, target) + (frag ? "#" + frag : "");
  }).join(" | ") + " || " + (part.match(/nav-soon[^<]*<span class="soon-badge">準備中/g) || []).length;
  navSignature.set(f, [sig(block(/<header class="site-header">[\s\S]*?<\/header>/)), sig(block(/<footer class="site-footer">[\s\S]*?<\/footer>/))]);
}

const sigs = [...navSignature.values()].map((s) => s.join("\n"));
// いちばん多いパターンを基準にし、そこから外れたページだけを報告する
const counts = sigs.reduce((m, s) => m.set(s, (m.get(s) || 0) + 1), new Map());
const base = [...counts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0];
[...navSignature.keys()].forEach((f, i) => { if (sigs[i] !== base) note(f, "共通ナビ／フッターのリンク先が他ページと違う"); });

// 利用者に見える文言（HTML本文と文章データ）に開発者向け表現や直接的な表現が混ざっていないか
const FORBIDDEN = [/\bV\d\b/, /PROTOTYPE/i, /本番版/, /次段階/, /NEXT ENGINE/i, /広告を入れる/, /動作確認/, /デモ/, /セックス/, /\balert\(/];
const userFacing = [...htmlFiles, ...files.filter((f) => /assets[\\/]js[\\/](content|pages|core)[\\/].*\.js$/.test(f))];
for (const f of userFacing) {
  let text = fs.readFileSync(f, "utf8");
  if (f.endsWith(".js")) text = text.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
  else text = stripComments(text);
  for (const re of FORBIDDEN) if (re.test(text)) note(f, `使わない表現 ${re}`);
}

for (const f of files) {
  if (/-(v\d+|test|fixed)(\.|\/|$)/i.test(path.relative(ROOT, f))) note(f, "ファイル名にバージョン等の接尾辞");
}

console.log(`HTML ${htmlFiles.length} ページを確認`);
if (problems.length) {
  console.log(`問題 ${problems.length} 件`);
  problems.forEach((p) => console.log(" - " + p));
  process.exit(1);
}
console.log("問題 0 件（重複ID・リンク切れ・H1・meta・禁止表現・ファイル名・共通ナビ）");
