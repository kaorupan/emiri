/*
 * 星獣カルテの描画部品（個人鑑定・相性の両ページで共有）。文字はすべて textContent で入れる。
 */
(function (root) {
  "use strict";
  var h = root.Karute.dom.h;

  function section(id, eyebrow, title, children, season) {
    return h("section", { class: "card seiju-block", id: id, "aria-labelledby": id + "-title", "data-season": season || null },
      eyebrow ? h("p", { class: "eyebrow" }, eyebrow) : null,
      h("h2", { id: id + "-title" }, title),
      children);
  }

  function moon(id, name) {
    return name
      ? h("span", { class: "seiju-moon", "data-moon": id, role: "img", "aria-label": name })
      : h("span", { class: "seiju-moon", "data-moon": id, "aria-hidden": "true" });
  }

  function crest(beast, small) {
    return h("div", { class: "seiju-crest" + (small ? " seiju-crest-sm" : ""), "data-season": beast.season.id, role: "img",
      "aria-label": beast.name + "の紋章（" + beast.season.name + "・" + beast.moon.name + "）" },
      h("span", { class: "seiju-crest-sigil", "aria-hidden": "true" }, beast.sigil),
      small ? null : moon(beast.moon.id, beast.moon.name));
  }

  function tags(beast) {
    return h("ul", { class: "seiju-tags", "aria-label": "属性" },
      h("li", { class: "seiju-tag", "data-season": beast.season.id }, h("span", { class: "seiju-dot", "aria-hidden": "true" }), beast.season.name),
      h("li", { class: "seiju-tag" }, moon(beast.moon.id, ""), beast.moon.name));
  }

  function traits(items) {
    return h("dl", { class: "seiju-traits" }, items.map(function (it) {
      return h("div", { class: "seiju-trait" }, h("dt", null, it[0]), h("dd", null, it[1]));
    }));
  }

  function map(grid) {
    return h("div", { class: "seiju-map-wrap" }, h("table", { class: "seiju-map" },
      h("caption", { class: "visually-hidden" }, "12星獣の地図。行が季節、列が月のリズム"),
      h("thead", null, h("tr", null, h("td", null), grid.moons.map(function (m) { return h("th", { scope: "col" }, m.name); }))),
      h("tbody", null, grid.rows.map(function (row, i) {
        var s = grid.seasons[i];
        return h("tr", { "data-season": s.id },
          h("th", { scope: "row" }, s.plain),
          row.map(function (cell) {
            return h("td", { class: cell.current ? "is-current" : null, "aria-current": cell.current ? "true" : null },
              h("b", { "aria-hidden": "true" }, cell.sigil), h("small", null, cell.name));
          }));
      }))));
  }

  root.KaruteSeijuRender = { section: section, moon: moon, crest: crest, tags: tags, traits: traits, map: map };
})(typeof self !== "undefined" ? self : this);
