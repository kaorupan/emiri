#!/usr/bin/env node
/*
 * LINE の友だち追加で「あなただけの鑑定書」を無料で受け取れる案内を、各ページに入れる
 *
 *   node tools/line/cta.mjs
 *
 * site.config.json の liffId があるときだけ入れる（空なら外す）。何度実行しても同じ結果になる。
 *   TOP：最初の紹介（hero）のすぐ下
 *   そのほかの占いページ：</main> の直前（紹介枠 <!--aff--> があればその上）
 *   運営者情報・規約・本格占い・LINE のページには入れない
 * ボタンは LIFF の URL（LINE で開くと、友だち追加をすすめてから入力フォームが開く）。パソコンでは QR コードも出す。
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const SKIP_DIRS = new Set([".git", ".github", "node_modules", "tests", "tools", "worker", "assets"]);
const NO_CTA = /^(about|privacy|contact|tokushoho|premium|line)\//;
const MARK = /\n?<!--line-cta-->[\s\S]*?<!--\/line-cta-->\n?/;

export function block(liffId, depth) {
  const up = "../".repeat(depth);
  const url = `https://liff.line.me/${liffId}`;
  return `<!--line-cta-->
  <aside class="card line-cta" aria-label="LINEで無料の鑑定書を受け取る">
    <div class="line-cta-body">
      <p class="line-cta-eyebrow">LINE限定・無料プレゼント</p>
      <p class="line-cta-title">12の占術で読み解く<br>「あなただけの鑑定書」</p>
      <p class="line-cta-text">数秘術・九星気学・四柱推命・西洋占星術など12の占術で、性格・仕事・恋愛・お金・これから3年の流れまでを1冊にまとめた総合鑑定書を、えみりのLINEを友だち追加した方に無料でお届けします。気になる人との相性も入れられます。</p>
      <p><a class="btn line-cta-btn" href="${url}" target="_blank" rel="noopener">LINEで友だち追加して受け取る</a></p>
      <p class="line-cta-note">お名前と生年月日を入れるだけ。届いた鑑定書はいつでも読み返せて、PDFで保存もできます。</p>
    </div>
    <figure class="line-cta-qr">
      <img src="${up}assets/img/line-qr.svg" width="132" height="132" alt="LINEで鑑定書を受け取るQRコード" loading="lazy">
      <figcaption>スマホのカメラで読み取ってください</figcaption>
    </figure>
  </aside>
<!--/line-cta-->`;
}

export function apply(html, rel, liffId) {
  let out = html.replace(MARK, "\n");
  if (!liffId || NO_CTA.test(rel) || !out.includes("</main>")) return out;
  const b = block(liffId, rel.split("/").length - 1);
  if (rel === "index.html") {
    const hero = out.search(/<section class="hero[^"]*"/);
    if (hero >= 0) {
      const end = out.indexOf("</section>", hero) + "</section>".length;
      return out.slice(0, end) + "\n" + b + out.slice(end);
    }
  }
  if (out.includes("\n<!--aff-->")) return out.replace("\n<!--aff-->", "\n" + b + "\n<!--aff-->");
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
  const config = JSON.parse(fs.readFileSync(path.join(root, "site.config.json"), "utf8"));
  const liffId = String(config.liffId || "").trim();
  let changed = 0;
  for (const rel of walk(root, root)) {
    const file = path.join(root, rel);
    const before = fs.readFileSync(file, "utf8");
    const after = apply(before, rel, liffId);
    if (after !== before) { fs.writeFileSync(file, after); changed++; }
  }
  return { liffId, changed };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const r = run();
  console.log(`LINEの案内：${r.liffId ? "表示" : "なし"}（更新したページ ${r.changed}）`);
}
