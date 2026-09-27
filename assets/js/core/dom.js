/*
 * 小さなDOMヘルパー。文字列はすべて textContent 扱いで入れる（innerHTMLは使わない）。
 */
(function (root) {
  "use strict";
  var Karute = root.Karute = root.Karute || {};

  function appendChild(el, child) {
    if (child === null || child === undefined || child === false) return;
    if (Array.isArray(child)) {
      child.forEach(function (c) { appendChild(el, c); });
      return;
    }
    if (typeof child === "string" || typeof child === "number") {
      el.appendChild(document.createTextNode(String(child)));
      return;
    }
    el.appendChild(child);
  }

  /**
   * h("div", {class: "card", "data-x": 1}, "text", h("b", null, "bold"))
   */
  function h(tag, props) {
    var el = document.createElement(tag);
    if (props) {
      Object.keys(props).forEach(function (key) {
        var value = props[key];
        if (value === null || value === undefined || value === false) return;
        if (key === "class") el.className = value;
        else if (key === "text") el.textContent = value;
        else if (key.indexOf("on") === 0 && typeof value === "function") el.addEventListener(key.slice(2), value);
        else if (value === true) el.setAttribute(key, "");
        else el.setAttribute(key, String(value));
      });
    }
    for (var i = 2; i < arguments.length; i++) appendChild(el, arguments[i]);
    return el;
  }

  function clear(el) {
    while (el.firstChild) el.removeChild(el.firstChild);
  }

  function prefersReducedMotion() {
    return !!(root.matchMedia && root.matchMedia("(prefers-reduced-motion: reduce)").matches);
  }

  function scrollToEl(el) {
    if (!el || !el.scrollIntoView) return;
    el.scrollIntoView({ behavior: prefersReducedMotion() ? "auto" : "smooth", block: "start" });
  }

  Karute.dom = { h: h, clear: clear, scrollTo: scrollToEl };
})(typeof self !== "undefined" ? self : this);
