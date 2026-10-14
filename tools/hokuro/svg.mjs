// ほくろ占いの図（えみりのオリジナル。顔は正面から見た図、体は正面と背面）
// 図は「向かって」見た位置。左右の意味の違いは本文で説明する。
const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

const FACE = `<rect class="hk-skin" x="96" y="236" width="48" height="64" rx="6"/>
<ellipse class="hk-skin" cx="38" cy="152" rx="11" ry="21"/><ellipse class="hk-skin" cx="202" cy="152" rx="11" ry="21"/>
<ellipse class="hk-skin" cx="120" cy="150" rx="82" ry="108"/>
<path class="hk-hair" d="M40,128 C34,60 76,30 120,30 C166,30 208,60 200,128 C188,96 168,70 120,64 C74,70 52,96 40,128 Z"/>
<path class="hk-line" d="M66,114 C76,106 92,106 102,112 M138,112 C148,106 164,106 174,114"/>
<path class="hk-line" d="M72,138 C80,130 96,130 104,138 C96,144 80,144 72,138 Z M136,138 C144,130 160,130 168,138 C160,144 144,144 136,138 Z"/>
<path class="hk-line" d="M120,142 C118,160 112,176 110,184 C116,190 124,190 130,184"/>
<path class="hk-line" d="M100,216 C112,210 128,210 140,216 C128,226 112,226 100,216 Z"/>`;

const person = (cx) => `<circle class="hk-skin" cx="${cx}" cy="30" r="19"/>
<rect class="hk-skin" x="${cx - 7}" y="46" width="14" height="14"/>
<path class="hk-skin" d="M${cx - 38},70 C${cx - 30},60 ${cx + 30},60 ${cx + 38},70 L${cx + 30},190 L${cx - 30},190 Z"/>
<path class="hk-skin" d="M${cx - 38},70 L${cx - 52},140 L${cx - 62},200 L${cx - 52},204 L${cx - 40},146 L${cx - 30},100 Z"/>
<path class="hk-skin" d="M${cx + 38},70 L${cx + 52},140 L${cx + 62},200 L${cx + 52},204 L${cx + 40},146 L${cx + 30},100 Z"/>
<path class="hk-skin" d="M${cx - 30},188 L${cx - 2},188 L${cx - 6},312 L${cx - 26},312 Z"/>
<path class="hk-skin" d="M${cx + 2},188 L${cx + 30},188 L${cx + 26},312 L${cx + 6},312 Z"/>
<path class="hk-skin" d="M${cx - 28},310 L${cx - 4},310 L${cx - 2},322 L${cx - 32},322 Z"/>
<path class="hk-skin" d="M${cx + 4},310 L${cx + 28},310 L${cx + 32},322 L${cx + 2},322 Z"/>`;
const BODY = `${person(90)}${person(230)}
<text class="hk-cap" x="90" y="338" text-anchor="middle">正面</text><text class="hk-cap" x="230" y="338" text-anchor="middle">背面</text>`;

const VIEW = { face: "0 0 240 300", body: "0 0 320 344" };
const BASE = { face: FACE, body: BODY };

/*
 * figure({ area, hl:[{x,y}], dots:[{x,y,href,label,n}], title, size })
 *   hl：目立たせる位置（そのページのほくろ）、dots：一覧の図でリンクにする位置
 */
export function figure(o) {
  const hl = (o.hl || []).map((p) => `<circle class="hk-glow" cx="${p.x}" cy="${p.y}" r="13"/><circle class="hk-mole" cx="${p.x}" cy="${p.y}" r="5.5"/>`).join("");
  const dots = (o.dots || []).map((p) => `<a href="${esc(p.href)}" aria-label="${esc(p.label)}"><circle class="hk-hit" cx="${p.x}" cy="${p.y}" r="12"/><circle class="hk-dot" cx="${p.x}" cy="${p.y}" r="7"/><text class="hk-num" x="${p.x}" y="${p.y + 3.2}" text-anchor="middle">${p.n}</text></a>`).join("");
  const cls = o.size === "sm" ? "hk-fig hk-sm" : "hk-fig";
  return `<svg class="${cls}" viewBox="${VIEW[o.area]}" role="img" aria-label="${esc(o.title)}"><title>${esc(o.title)}</title>${BASE[o.area]}${hl}${dots}</svg>`;
}
