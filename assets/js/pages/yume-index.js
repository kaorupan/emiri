/* /yume/ 夢占い辞典：キーワードで一覧をしぼりこむ */
(function () {
  "use strict";
  var input = document.getElementById("yume-q"), count = document.getElementById("yume-count");
  if (!input) return;
  var items = document.querySelectorAll(".yume-list li");
  var sections = document.querySelectorAll("section[id^='yume-']");
  function toHira(s) { return s.replace(/[ァ-ヶ]/g, function (c) { return String.fromCharCode(c.charCodeAt(0) - 0x60); }); }
  function apply() {
    var q = toHira(input.value.trim().toLowerCase());
    var shown = 0;
    for (var i = 0; i < items.length; i++) {
      var hit = !q || toHira(items[i].getAttribute("data-words").toLowerCase()).indexOf(q) >= 0;
      items[i].hidden = !hit;
      if (hit) shown++;
    }
    for (var j = 0; j < sections.length; j++) {
      sections[j].hidden = !!q && !sections[j].querySelector(".yume-list li:not([hidden])");
    }
    count.textContent = q ? (shown ? shown + "件見つかりました" : "見つかりませんでした。ほかの言葉でも探してみてください。") : "";
  }
  input.addEventListener("input", apply);
})();
