/* /tanjobi/ 誕生日占いの一覧：月と日を選んで、その日のページへ移動する */
(function () {
  "use strict";
  var form = document.getElementById("tj-jump");
  if (!form) return;
  var DAYS = [31, 29, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  var month = document.getElementById("tj-month"), day = document.getElementById("tj-day");
  function pad(n) { return (n < 10 ? "0" : "") + n; }
  function sync() {
    var max = DAYS[Number(month.value) - 1];
    for (var i = 0; i < day.options.length; i++) {
      var o = day.options[i];
      o.disabled = Number(o.value) > max;
      o.hidden = Number(o.value) > max;
    }
    if (Number(day.value) > max) day.value = String(max);
  }
  month.addEventListener("change", sync);
  sync();
  form.addEventListener("submit", function (e) {
    e.preventDefault();
    location.href = pad(Number(month.value)) + "-" + pad(Number(day.value)) + "/";
  });
})();
