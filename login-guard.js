/* Shows script errors, files that did not load and a stuck Sign in button as a red box at the bottom of the page.
   Add ONE line inside <head> of vendor.html (or any portal page), before the other scripts:
   <script src="login-guard.js"></script>
   Remove it once everything works. It changes nothing else on the page. */
(function () {
  var seen = {};
  function put(text) {
    var b = document.getElementById("kx-guard");
    if (!b) {
      b = document.createElement("div"); b.id = "kx-guard";
      b.style.cssText = "position:fixed;left:0;right:0;bottom:0;z-index:2147483646;max-height:45vh;overflow:auto;background:#b00020;color:#fff;padding:8px 14px;font:12px/1.4 sans-serif";
      document.body.appendChild(b);
    }
    var p = document.createElement("div");
    p.style.cssText = "border-bottom:1px solid rgba(255,255,255,.3);padding:4px 0";
    p.textContent = text; b.appendChild(p);
  }
  function bar(text) {
    if (seen[text]) return; seen[text] = 1;
    if (document.body) put(text); else document.addEventListener("DOMContentLoaded", function () { put(text); });
  }

  /* 1. a script stopped with an error, or a file did not load */
  window.addEventListener("error", function (e) {
    var t = e.target;
    if (t && t !== window && t.tagName) {
      var f = t.src || t.href || "";
      if (/\/api\.js$/.test(f)) return;            /* api.js is optional: the page has a built-in copy */
      bar("File did not load: " + (f.split("/").pop() || t.tagName));
      return;
    }
    bar("Script error: " + (e.message || "unknown") + (e.filename ? " (" + e.filename.split("/").pop() + ", line " + e.lineno + ")" : ""));
  }, true);

  /* 2. a background request failed and nobody handled it */
  window.addEventListener("unhandledrejection", function (e) {
    var r = e.reason; bar("Request failed: " + ((r && r.message) || r));
  });

  /* 3. the Sign in button was never connected (the page script stopped before it finished) */
  window.addEventListener("load", function () {
    setTimeout(function () {
      var g = document.getElementById("lgGo");
      if (g && !g.onclick && !g.disabled) bar("The Sign in button is not connected: the page script stopped before it finished loading. Read any 'Script error' or 'File did not load' line above.");
    }, 800);
  });

  /* 4. the Sign in button was pressed but nothing finished within 12 seconds */
  document.addEventListener("click", function (e) {
    var g = e.target && e.target.closest && e.target.closest("#lgGo"); if (!g) return;
    setTimeout(function () {
      var lg = document.getElementById("login");
      if (lg && lg.style.display !== "none") {
        var m = document.getElementById("lgMsg");
        bar("Sign in did not finish after 12 seconds. Message on the login box: " + (m && m.textContent ? m.textContent : "(none)") + ". Button disabled: " + g.disabled + ".");
      }
    }, 12000);
  }, true);
})();
