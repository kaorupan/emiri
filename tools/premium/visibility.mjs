#!/usr/bin/env node
/*
 * 本格占い（有料）への導線を、表示する／隠すを切り替える
 *
 *   node tools/premium/visibility.mjs
 *
 * site.config.json の premiumVisible が false のとき：
 *   - メニュー・フッターの「本格占い」、TOPの切り替えタブ、各ページの本格占いの案内（premium-upsell / premium-teaser）を
 *     HTML コメント <!--premium-hidden:…--> の中にしまう（中身は base64 で元のまま保存）
 *   - 本格占いのページ（premium/ 以下）を検索に出さない（noindex）。ページ自体は消さない
 * premiumVisible が true（または未設定）のとき：しまったものを元どおりに戻す。
 * 何度実行しても同じ結果になる。生成し直したページにも効くよう、毎日のワークフローで実行する。
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const SKIP_DIRS = new Set([".git", ".github", "node_modules", "tests", "tools", "worker", "assets"]);

const HIDE = [
  /<li><a href="(?:\.\.\/)*premium\/"(?: aria-current="page")?>本格占い<\/a><\/li>/g,
  /<section class="[^"]*\bpremium-(?:upsell|teaser)\b[^"]*"[^>]*>[\s\S]*?<\/section>/g,
  /<nav class="mode-switch"[^>]*>[\s\S]*?<\/nav>/g
];
const WRAPPED = /<!--premium-hidden:([A-Za-z0-9+/=]*)-->/g;
const NOINDEX = '<!--premium-noindex--><meta name="robots" content="noindex">';

const enc = (s) => Buffer.from(s, "utf8").toString("base64");
const dec = (s) => Buffer.from(s, "base64").toString("utf8");

export function show(html) {
  return html.replace(WRAPPED, (_, b) => dec(b)).replace("\n" + NOINDEX, "").replace(NOINDEX, "");
}

export function hide(html, rel) {
  let out = show(html);
  if (/^premium\//.test(rel) && !/<meta name="robots" content="noindex">/.test(out)) {
    out = out.replace(/(<meta name="viewport"[^>]*>)/, `$1\n${NOINDEX}`);
  }
  for (const re of HIDE) out = out.replace(re, (m) => `<!--premium-hidden:${enc(m)}-->`);
  return out;
}

export function apply(html, rel, visible) {
  return visible ? show(html) : hide(html, rel);
}

function walk(dir, root, out = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (e.isDirectory()) { if (!SKIP_DIRS.has(e.name)) walk(path.join(dir, e.name), root, out); }
    else if (e.name.endsWith(".html")) out.push(path.relative(root, path.join(dir, e.name)).split(path.sep).join("/"));
  }
  return out;
}

export function isVisible(root = ROOT) {
  const c = JSON.parse(fs.readFileSync(path.join(root, "site.config.json"), "utf8"));
  return c.premiumVisible !== false;
}

export function run(root = ROOT) {
  const visible = isVisible(root);
  let changed = 0;
  for (const rel of walk(root, root)) {
    const file = path.join(root, rel);
    const before = fs.readFileSync(file, "utf8");
    const after = apply(before, rel, visible);
    if (after !== before) { fs.writeFileSync(file, after); changed++; }
  }
  return { visible, changed };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const r = run();
  console.log(`本格占いの導線：${r.visible ? "表示" : "非表示"}（更新したページ ${r.changed}）`);
}
