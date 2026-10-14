#!/usr/bin/env node
/*
 * アフィリエイト（電話占い・チャット占いなどの紹介）枠を各ページに入れる
 *
 *   node tools/affiliate/inject.mjs
 *
 * 紹介する案件は tools/affiliate/programs.json に書く（ASP の管理画面でもらったリンクをそのまま使う）。
 *   { "programs": [ {
 *       "name": "表示名", "url": "https://px.a8.net/…（広告リンク）",
 *       "pixel": "https://www…a8.net/0.gif?…（あれば。表示計測用の1×1画像）",
 *       "lead": "ひとことの紹介文（事実だけ。誇張しない）",
 *       "themes": ["love", "general"],      // love＝恋愛・相性のページ、general＝そのほかの占いページ
 *       "rank": { "love": 1, "general": 2 },  // 並び順（小さいほど上。なければ書いた順の後ろ）
 *       "active": true
 *   } ] }
 * 案件が1つもなければ、枠は出さない（何度実行しても同じ結果になる）。
 *
 * 枠は </main> の直前に <!--aff-->…<!--/aff--> で入れる。「PR」を必ず表示する（ステルスマーケティング規制）。
 * 運営者情報・規約・本格占いのページ（有料の鑑定書）には入れない。
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const SKIP_DIRS = new Set([".git", ".github", "node_modules", "tests", "tools", "worker", "assets"]);
const NO_ADS = /^(about|privacy|contact|tokushoho|premium)\//;
const LOVE = /(^|\/)aisho\/|^tesou\/(renai|kekkonsen|tamanokoshisen|ninkisen)\/|^yume\/(koi|koibito|sukinahito|motokare|kisu|uwaki|kekkon|kokuhaku|shitto)\//;

const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const MARK = /\n?<!--aff-->[\s\S]*?<!--\/aff-->\n?/;

export function loadPrograms(root = ROOT) {
  const file = path.join(root, "tools/affiliate/programs.json");
  if (!fs.existsSync(file)) return [];
  const data = JSON.parse(fs.readFileSync(file, "utf8"));
  return (data.programs || []).filter((p) => p && p.active !== false && /^https:\/\//.test(p.url || "") && p.name);
}

export function themeOf(rel) {
  if (NO_ADS.test(rel)) return null;
  return LOVE.test(rel) ? "love" : "general";
}

const HEAD = {
  love: { title: "ふたりのこと、プロの占い師に相談してみる", text: "相性や気持ちのすれ違いなど、ひとりで抱えている恋の悩みは、電話やチャットでプロの占い師に直接相談することもできます。" },
  general: { title: "もっと詳しく知りたいときは", text: "占いの結果について詳しく聞きたいときや、自分の状況に合わせて読んでほしいときは、電話やチャットでプロの占い師に相談することもできます。" }
};

export function box(theme, programs, depth) {
  const rank = (p) => (p.rank && Number.isFinite(p.rank[theme]) ? p.rank[theme] : 99);
  const list = programs.filter((p) => !p.themes || p.themes.includes(theme))
    .map((p, i) => [p, i]).sort((a, b) => rank(a[0]) - rank(b[0]) || a[1] - b[1]).map((x) => x[0]).slice(0, 3);
  if (!list.length) return "";
  const items = list.map((p) => `      <li><a href="${esc(p.url)}" target="_blank" rel="nofollow sponsored noopener">${esc(p.name)}</a>${p.lead ? `<span class="aff-lead">${esc(p.lead)}</span>` : ""}${p.pixel ? `<img class="aff-pixel" src="${esc(p.pixel)}" width="1" height="1" alt="" loading="lazy">` : ""}</li>`).join("\n");
  const h = HEAD[theme];
  return `<!--aff-->
  <aside class="card aff-box" aria-label="広告（PR）">
    <p class="aff-pr">PR</p>
    <p class="aff-title">${h.title}</p>
    <p class="aff-text">${h.text}</p>
    <ul class="aff-list">
${items}
    </ul>
    <p class="aff-note">※ この枠は広告です。リンク先のサービスのご利用で、当サイトに紹介料が支払われることがあります。<a href="${"../".repeat(depth)}privacy/#affiliate">詳しくはこちら</a></p>
  </aside>
<!--/aff-->`;
}

export function apply(html, rel, programs) {
  let out = html.replace(MARK, "\n");
  const theme = themeOf(rel);
  if (!theme) return out;
  const b = box(theme, programs, rel.split("/").length - 1);
  if (!b || !out.includes("</main>")) return out;
  return out.replace("\n</main>", "\n" + b + "\n</main>");
}

function walk(dir, root, out = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (e.isDirectory()) { if (!SKIP_DIRS.has(e.name)) walk(path.join(dir, e.name), root, out); }
    else if (e.name.endsWith(".html")) out.push(path.relative(root, path.join(dir, e.name)).split(path.sep).join("/"));
  }
  return out;
}

export function run(root = ROOT) {
  const programs = loadPrograms(root);
  let changed = 0;
  for (const rel of walk(root, root)) {
    const file = path.join(root, rel);
    const before = fs.readFileSync(file, "utf8");
    const after = apply(before, rel, programs);
    if (after !== before) { fs.writeFileSync(file, after); changed++; }
  }
  return { programs: programs.length, changed };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const r = run();
  console.log(`アフィリエイト：案件 ${r.programs} 件、更新したページ ${r.changed}`);
}
