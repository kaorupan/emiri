// 手相の図（えみりのオリジナル。右手の手のひらを自分に向けた形。親指が右側）
export const LINES = {
  seimei: "M222,206 C178,232 170,300 196,384",
  zunou: "M222,208 C188,228 132,250 84,290",
  kanjou: "M68,214 C110,208 160,204 204,180",
  unmei: "M150,384 C152,320 156,250 160,176",
  taiyou: "M120,262 L118,182",
  zaiun: "M86,250 L84,192",
  kekkon: "M67,192 L88,190",
  kenkou: "M186,356 L98,228"
};
export const COLORS = { seimei: "#e8b85a", zunou: "#7fb4f0", kanjou: "#f0786c", unmei: "#9fd99a", taiyou: "#f0a8c8", zaiun: "#c9a0f0", kekkon: "#f0cc5c", kenkou: "#a8c8c0" };

const HAND = `<path class="th-hand" d="M66,200 C62,170 60,140 62,112 C63,96 88,94 90,112 L94,168 L100,168 C99,120 98,80 101,58 C103,40 132,40 134,58 C137,85 138,125 139,166 L146,166 C146,115 146,70 148,44 C150,26 180,26 182,44 C184,72 184,120 183,168 L189,170 C191,130 194,95 198,74 C201,58 228,60 228,78 C228,110 224,150 222,190 C232,186 246,172 258,158 C268,146 286,152 282,168 C276,196 258,228 246,252 C238,268 236,290 234,320 C232,350 222,372 210,388 L96,388 C84,372 72,340 68,300 C66,265 66,230 66,200 Z"/>
<path class="th-crease" d="M66,140 L90,140 M101,96 L134,96 M101,128 L136,128 M147,80 L182,80 M147,118 L183,118 M196,104 L227,106 M194,138 L225,140 M248,186 C256,180 264,176 272,176"/>`;

const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

// しるしの形（x,y が中心）
export function mark(type, x, y, s = 7) {
  switch (type) {
    case "star": return `<path class="th-mark" d="M${x - s},${y} L${x + s},${y} M${x},${y - s} L${x},${y + s} M${x - s * .7},${y - s * .7} L${x + s * .7},${y + s * .7} M${x - s * .7},${y + s * .7} L${x + s * .7},${y - s * .7}"/>`;
    case "cross": return `<path class="th-mark" d="M${x - s},${y} L${x + s},${y} M${x},${y - s} L${x},${y + s}"/>`;
    case "triangle": return `<path class="th-mark" d="M${x},${y - s} L${x + s},${y + s * .8} L${x - s},${y + s * .8} Z"/>`;
    case "square": return `<rect class="th-mark" x="${x - s}" y="${y - s}" width="${s * 2}" height="${s * 2}"/>`;
    case "island": return `<ellipse class="th-mark" cx="${x}" cy="${y}" rx="${s * 1.3}" ry="${s * .6}"/>`;
    case "chain": return [0, 1, 2].map((i) => `<ellipse class="th-mark" cx="${x - s * 2 + i * s * 2}" cy="${y}" rx="${s}" ry="${s * .55}"/>`).join("");
    case "grid": return `<path class="th-mark" d="M${x - s},${y - s} L${x + s},${y + s} M${x - s},${y} L${x},${y + s} M${x},${y - s} L${x + s},${y} M${x + s},${y - s} L${x - s},${y + s} M${x},${y - s} L${x - s},${y} M${x + s},${y} L${x},${y + s}"/>`;
    case "dot": return `<circle class="th-mark th-fill" cx="${x}" cy="${y}" r="${s * .45}"/>`;
    case "eye": return `<path class="th-mark" d="M${x - s * 1.4},${y} C${x - s * .5},${y - s} ${x + s * .5},${y - s} ${x + s * 1.4},${y} C${x + s * .5},${y + s} ${x - s * .5},${y + s} ${x - s * 1.4},${y} Z"/>`;
    default: return "";
  }
}

/*
 * figure({ hl:[path], base:["seimei",…] | "all" | [], marks:[[type,x,y,s]], labels:[[text,x,y]], dashed:[path], title, size:"lg"|"sm" })
 */
export function figure(o) {
  const base = o.base === undefined ? Object.keys(LINES) : o.base === "all" ? Object.keys(LINES) : o.base;
  const baseLines = base.map((k) => `<path class="th-base" d="${LINES[k]}"/>`).join("");
  const colored = (o.colored || []).map(([k, label]) => `<path class="th-line" style="stroke:${COLORS[k]}" d="${LINES[k]}"/>`).join("");
  const hl = (o.hl || []).map((d) => `<path class="th-hl" d="${d}"/>`).join("");
  const dashed = (o.dashed || []).map((d) => `<path class="th-hl th-dash" d="${d}"/>`).join("");
  const marks = (o.marks || []).map((m) => mark(...m)).join("");
  const labels = (o.labels || []).map(([t, x, y, anchor]) => `<text class="th-label" x="${x}" y="${y}" text-anchor="${anchor || "middle"}">${esc(t)}</text>`).join("");
  const cls = o.size === "sm" ? "th-fig th-sm" : "th-fig";
  return `<svg class="${cls}" viewBox="40 20 260 380" role="img" aria-label="${esc(o.title)}"><title>${esc(o.title)}</title>${HAND}${baseLines}${colored}${hl}${dashed}${marks}${labels}</svg>`;
}
