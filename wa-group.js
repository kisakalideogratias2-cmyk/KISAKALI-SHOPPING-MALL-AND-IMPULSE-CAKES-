/* KISAKALI: "Join our WhatsApp group" button for every page and portal.
   The link is NOT written in the code. The Admin sets it in Settings & audit and it is
   kept in the database, so a redeploy never resets it. If no link is set, no button shows.
   Needs only supabase-config.js (loaded automatically here if the page does not have it). */
(function () {
  if (window.__kxWaGroup) return;
  window.__kxWaGroup = true;

  var CACHE_KEY = "kxWaGroupLink";
  var OK = /^https:\/\/(chat\.whatsapp\.com|(www\.)?whatsapp\.com\/channel)\/[A-Za-z0-9_-]{10,60}$/;

  function lang() { try { return localStorage.getItem("kLang") || "en"; } catch (e) { return "en"; } }
  function label() { return lang() === "sw" ? "Jiunge na group letu la WhatsApp" : "Join our WhatsApp group"; }

  function remove() {
    var o = document.getElementById("kx-wa-group");
    if (o && o.parentNode) o.parentNode.removeChild(o);
  }

  function show(link) {
    if (!link || !OK.test(link)) { remove(); return; }
    var a = document.getElementById("kx-wa-group");
    if (!a) {
      if (!document.getElementById("kx-wa-group-css")) {
        var s = document.createElement("style");
        s.id = "kx-wa-group-css";
        s.textContent =
          "#kx-wa-group{position:fixed;left:12px;bottom:calc(var(--kx-lift,0px) + env(safe-area-inset-bottom,0px) + 56px);z-index:9990;display:flex;align-items:center;gap:8px;" +
          "background:#25D366;color:#0D0D0D;font:600 13px/1.2 sans-serif;text-decoration:none;padding:10px 14px;" +
          "border-radius:999px;box-shadow:0 4px 14px rgba(0,0,0,.35)}" +
          "#kx-wa-group:hover{filter:brightness(1.08)}" +
          "#kx-wa-group svg{width:20px;height:20px;flex:0 0 auto}" +
          "@media(max-width:480px){#kx-wa-group{font-size:12px;padding:9px 12px;max-width:calc(100vw - 90px)}}" +
          "@media print{#kx-wa-group{display:none}}";
        document.head.appendChild(s);
      }
      a = document.createElement("a");
      a.id = "kx-wa-group";
      a.target = "_blank";
      a.rel = "noopener noreferrer";
      a.innerHTML =
        '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.75.46 3.45 1.32 4.95L2.05 22l5.25-1.38a9.9 9.9 0 0 0 4.74 1.21c5.46 0 9.91-4.45 9.91-9.91C21.95 6.45 17.5 2 12.04 2zm5.8 14.12c-.25.69-1.45 1.32-2 1.37-.51.05-1 .24-3.37-.7-2.84-1.12-4.65-4.04-4.79-4.23-.14-.19-1.14-1.52-1.14-2.9 0-1.38.72-2.06.98-2.34.25-.28.55-.35.74-.35l.53.01c.17.01.4-.06.62.47.25.6.85 2.07.92 2.22.07.15.12.33.02.52-.1.19-.15.31-.29.48-.15.17-.31.37-.44.5-.15.15-.3.31-.13.6.17.29.76 1.25 1.63 2.03 1.12 1 2.06 1.31 2.35 1.46.29.14.46.12.63-.07.17-.19.73-.85.92-1.14.19-.29.39-.24.65-.14.26.1 1.67.79 1.96.93.29.14.48.21.55.33.07.12.07.69-.18 1.38z"/></svg>' +
        '<span></span>';
      (document.body || document.documentElement).appendChild(a);
    }
    a.href = link;
    a.setAttribute("aria-label", label());
    a.lastChild.textContent = label();
  }

  function cfg(cb) {
    if (window.KISAKALI_CONFIG && window.KISAKALI_CONFIG.SUPABASE_URL) return cb(window.KISAKALI_CONFIG);
    var s = document.createElement("script");
    s.src = "supabase-config.js";
    s.onload = function () { cb(window.KISAKALI_CONFIG); };
    s.onerror = function () { cb(null); };
    document.head.appendChild(s);
  }

  function run() {
    /* show the last known link at once, then confirm with the database */
    try { show(localStorage.getItem(CACHE_KEY)); } catch (e) {}

    cfg(function (C) {
      if (!C || !C.SUPABASE_URL || !C.SUPABASE_ANON_KEY) return;
      fetch(C.SUPABASE_URL + "/rest/v1/rpc/get_whatsapp_group_link", {
        method: "POST",
        headers: { "apikey": C.SUPABASE_ANON_KEY, "Authorization": "Bearer " + C.SUPABASE_ANON_KEY, "Content-Type": "application/json" },
        body: "{}"
      }).then(function (r) { return r.ok ? r.json() : Promise.reject(); })
        .then(function (link) {
          link = (typeof link === "string") ? link.trim() : "";
          try { if (link) localStorage.setItem(CACHE_KEY, link); else localStorage.removeItem(CACHE_KEY); } catch (e) {}
          show(link);
        })
        .catch(function () { /* offline or not set up yet: keep whatever is showing */ });
    });
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", run); else run();
})();
