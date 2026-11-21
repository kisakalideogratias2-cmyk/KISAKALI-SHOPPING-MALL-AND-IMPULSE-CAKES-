/* KISAKALI x IMPULSE extras: welcome animation, Kiswahili toggle, in-app chat. One file, loaded last on every page. */
(function () {
  "use strict";
  var page = (location.pathname.split("/").pop() || "index.html").toLowerCase();
  if (page.indexOf(".") < 0) page += ".html";
  var PUBLIC = ["", "index.html", "shop.html", "checkout.html", "track.html", "product-details.html", "register.html", "vendor-apply.html"];
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
  function store(k, v) { try { if (v === undefined) return localStorage.getItem(k); localStorage.setItem(k, v); } catch (e) { } return null; }
  function css(t) { var s = document.createElement("style"); s.textContent = t; document.head.appendChild(s); }

  /* ================= 1. WELCOME ANIMATION (home page, once per visit) ================= */
  function intro() {
    var seen = null; try { seen = sessionStorage.getItem("kx_intro"); } catch (e) { }
    if (seen || (window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches)) return;
    try { sessionStorage.setItem("kx_intro", "1"); } catch (e) { }
    var hd = document.querySelector("header"), top = hd ? Math.round(hd.getBoundingClientRect().top + hd.offsetHeight / 2) : 40;
    css("#kx-intro{position:fixed;inset:0;z-index:99999;background:radial-gradient(circle at 50% 50%,#1a1a1a,#0D0D0D);display:flex;align-items:center;justify-content:center;overflow:hidden;transition:opacity .6s}" +
      "#kx-intro.out{opacity:0;pointer-events:none}" +
      ".kx-ball{position:absolute;left:50%;top:" + top + "px;width:34px;height:34px;margin-left:-17px;border-radius:50%;background:radial-gradient(circle at 35% 30%,#fff,#FE980F 45%,#E8508A);box-shadow:0 0 24px #FE980F;animation:kxdrop 1.15s cubic-bezier(.55,0,.9,.4) forwards}" +
      "@keyframes kxdrop{0%{transform:translateY(0)}100%{transform:translateY(calc(50vh - " + top + "px))}}" +
      ".kx-ball.boom{animation:kxboom .45s ease-out forwards}" +
      "@keyframes kxboom{0%{transform:translateY(calc(50vh - " + top + "px)) scale(1);opacity:1}60%{transform:translateY(calc(50vh - " + top + "px)) scale(5);opacity:1;background:#fff}100%{transform:translateY(calc(50vh - " + top + "px)) scale(9);opacity:0}}" +
      ".kx-ring{position:absolute;left:50%;top:50%;width:20px;height:20px;margin:-10px;border-radius:50%;border:3px solid #FE980F;opacity:0;animation:kxring .9s ease-out forwards}" +
      ".kx-ring.r2{border-color:#E8508A;animation-delay:.15s}" +
      "@keyframes kxring{0%{transform:scale(1);opacity:.9}100%{transform:scale(34);opacity:0}}" +
      ".kx-spark{position:absolute;left:50%;top:50%;width:9px;height:9px;margin:-4px;border-radius:50%;animation:kxspark .9s ease-out forwards}" +
      "@keyframes kxspark{0%{transform:translate(0,0) scale(1);opacity:1}100%{transform:translate(var(--dx),var(--dy)) scale(.2);opacity:0}}" +
      ".kx-shake{animation:kxshake .35s linear}@keyframes kxshake{25%{transform:translate(-6px,4px)}50%{transform:translate(6px,-4px)}75%{transform:translate(-4px,-3px)}}" +
      ".kx-wel{position:absolute;text-align:center;padding:0 20px;opacity:0;transform:scale(.7);transition:all .7s cubic-bezier(.2,1.2,.4,1)}" +
      ".kx-wel.show{opacity:1;transform:scale(1)}" +
      ".kx-wel small{display:block;color:#b3b1ae;letter-spacing:3px;font-size:13px;margin-bottom:8px}" +
      ".kx-wel h2{font-size:clamp(26px,7vw,48px);color:#fff;line-height:1.2;margin:0}" +
      ".kx-wel h2 b{color:#FE980F}.kx-wel h2 i{font-style:normal;color:#E8508A}" +
      ".kx-wel p{color:#b3b1ae;margin-top:12px;font-size:14px}.kx-skip{position:absolute;right:14px;bottom:14px;background:none;border:1px solid #555;color:#b3b1ae;border-radius:20px;padding:6px 14px;font-size:12px;cursor:pointer}");
    var o = document.createElement("div"); o.id = "kx-intro"; o.setAttribute("role", "presentation");
    var sw = (store("kx_lang") === "sw");
    o.innerHTML = '<div class="kx-ball"></div><div class="kx-wel"><small>' + (sw ? "KARIBU" : "WELCOME") + '</small><h2>' +
      (sw ? "Karibu <b>Kisakali Mall</b><br>na <i>Impulse Cakes</i>" : "Welcome to <b>Kisakali Mall</b><br>&amp; <i>Impulse Cakes</i>") + '</h2><p>' +
      (sw ? "Zawadi, keki na maajabu, tunaleta Ifakara na Morogoro." : "Gifts, cakes and surprises, delivered in Ifakara &amp; Morogoro.") + '</p></div><button class="kx-skip" type="button">' + (sw ? "Ruka" : "Skip") + '</button>';
    document.body.appendChild(o);
    var ball = o.querySelector(".kx-ball"), wel = o.querySelector(".kx-wel"), done = false, timers = [];
    function end() { if (done) return; done = true; timers.forEach(clearTimeout); o.classList.add("out"); setTimeout(function () { o.remove(); }, 700); }
    o.querySelector(".kx-skip").onclick = end;
    timers.push(setTimeout(function () {
      ball.classList.add("boom"); document.body.classList.add("kx-shake");
      setTimeout(function () { document.body.classList.remove("kx-shake"); }, 400);
      ["", "r2"].forEach(function (c) { var r = document.createElement("div"); r.className = "kx-ring " + c; o.appendChild(r); });
      var cols = ["#FE980F", "#E8508A", "#fff", "#ffd27a"];
      for (var i = 0; i < 28; i++) {
        var a = Math.random() * 6.283, d = 120 + Math.random() * 220, s = document.createElement("div");
        s.className = "kx-spark"; s.style.background = cols[i % 4];
        s.style.setProperty("--dx", Math.cos(a) * d + "px"); s.style.setProperty("--dy", Math.sin(a) * d + "px");
        o.appendChild(s);
      }
    }, 1150));
    timers.push(setTimeout(function () { wel.classList.add("show"); }, 1500));
    timers.push(setTimeout(end, 4200));
  }
  css(".kx-shake{animation:kxshake .35s linear}");

  /* ================= 2. KISWAHILI (public pages) ================= */
  var SW = {
    "Home": "Mwanzo", "Marketplace": "Soko", "Checkout": "Malipo", "Track Order": "Fuatilia Oda", "Cart": "Kikapu",
    "Call": "Piga simu", "Email us": "Tutumie barua pepe", "Contact Information": "Mawasiliano", "Call Kisakali": "Piga simu Kisakali", "Call Impulse": "Piga simu Impulse",
    "WhatsApp Kisakali": "WhatsApp Kisakali", "WhatsApp Impulse": "WhatsApp Impulse",
    "Why Shop with KISAKALI?": "Kwa nini ununue KISAKALI?", "How KISAKALI Works": "Jinsi KISAKALI inavyofanya kazi",
    "Verified Vendors": "Wauzaji Waliothibitishwa", "Proudly in partnership": "Kwa ushirikiano wa fahari",
    "Every Gift Tells a Story. Every Surprise Creates a Memory.": "Kila zawadi ina hadithi. Kila maajabu huunda kumbukumbu.",
    "Cakes, Flowers & Gifts from Local Vendors": "Keki, Maua na Zawadi kutoka kwa Wauzaji wa Hapa",
    "Plan a Surprise They Will Remember": "Panga Maajabu Watakayoyakumbuka",
    "Recipient Name (if different from you)": "Jina la mpokeaji (kama si wewe)", "Recipient Phone (for the rider)": "Simu ya mpokeaji (kwa dereva)",
    "Delivery Date": "Tarehe ya kufikishiwa", "Delivery Time": "Muda wa kufikishiwa", "Card Message (optional)": "Ujumbe wa kadi (si lazima)",
    "Message on the cake (optional)": "Ujumbe juu ya keki (si lazima)",
    "Morning (8am-12pm)": "Asubuhi (saa 2-6)", "Afternoon (12pm-4pm)": "Mchana (saa 6-10)", "Evening (4pm-8pm)": "Jioni (saa 10-2)",
    "Cake order: please choose a delivery date at least 1 day ahead.": "Oda ya keki: chagua tarehe ya kufikishiwa angalau siku 1 mbele.",
    "Total": "Jumla", "Subtotal": "Jumla ndogo", "Delivery": "Usafirishaji", "Skip": "Ruka",
    "Your cart is empty.": "Kikapu chako ni tupu.", "Go to the marketplace": "Nenda sokoni",
    "Choose how you want to use KISAKALI and IMPULSE CAKES.": "Chagua jinsi unavyotaka kutumia KISAKALI na IMPULSE CAKES.",
    "Vendor": "Muuzaji", "Rider": "Dereva", "Customer": "Mteja", "Sign In": "Ingia", "Sign in": "Ingia", "Register": "Jisajili", "Create account": "Fungua akaunti",
    "Add to Cart": "Weka kwenye kikapu", "Buy Now": "Nunua sasa", "Place Order": "Weka oda", "Search": "Tafuta", "Full Name": "Jina kamili", "Phone": "Simu", "Address": "Anwani",
    "Apply to sell on Kisakali & Impulse Cakes": "Omba kuuza Kisakali na Impulse Cakes", "Apply to Sell on Kisakali & Impulse Cakes": "Omba Kuuza Kisakali na Impulse Cakes"
  };
  var PH = { "Search": "Tafuta", "e.g. Amina Said": "mf. Amina Said", "e.g. 0754000000": "mf. 0754000000", "Message to print on the card": "Ujumbe wa kuchapisha kwenye kadi" };
  var origText = new WeakMap(), origPh = new WeakMap(), lang = store("kx_lang") === "sw" ? "sw" : "en", busy = false;
  function norm(t) { return t.replace(/\s+/g, " ").trim(); }
  function walk(root) {
    var w = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, null), n, list = [];
    while ((n = w.nextNode())) { var p = n.parentNode && n.parentNode.nodeName; if (p !== "SCRIPT" && p !== "STYLE" && p !== "TEXTAREA") list.push(n); }
    list.forEach(function (n) {
      var o = origText.has(n) ? origText.get(n) : n.nodeValue, k = norm(o);
      if (lang === "sw" && SW[k]) { if (!origText.has(n)) origText.set(n, o); n.nodeValue = o.replace(k, SW[k]); }
      else if (lang === "en" && origText.has(n)) { n.nodeValue = origText.get(n); origText.delete(n); }
    });
    [].forEach.call(root.querySelectorAll("[placeholder]"), function (e) {
      var o = origPh.has(e) ? origPh.get(e) : e.getAttribute("placeholder");
      if (lang === "sw" && PH[o]) { origPh.set(e, o); e.setAttribute("placeholder", PH[o]); }
      else if (lang === "en" && origPh.has(e)) { e.setAttribute("placeholder", origPh.get(e)); origPh.delete(e); }
    });
  }
  function applyLang() { busy = true; walk(document.body); document.documentElement.lang = lang === "sw" ? "sw" : "en"; busy = false; }
  function langToggle() {
    css(".kx-lang{position:fixed;left:12px;bottom:12px;z-index:9000;display:flex;border:1px solid #444;border-radius:20px;overflow:hidden;background:#161616;font-size:12px;font-weight:700}" +
      ".kx-lang button{background:none;border:0;color:#b3b1ae;padding:7px 12px;cursor:pointer}.kx-lang button.on{background:#FE980F;color:#0D0D0D}");
    var d = document.createElement("div"); d.className = "kx-lang"; d.innerHTML = '<button data-l="en">EN</button><button data-l="sw">SW</button>';
    function mark() { [].forEach.call(d.children, function (b) { b.className = b.getAttribute("data-l") === lang ? "on" : ""; }); }
    d.onclick = function (e) { var l = e.target.getAttribute && e.target.getAttribute("data-l"); if (!l) return; lang = l; store("kx_lang", l); mark(); applyLang(); };
    document.body.appendChild(d); mark();
    var t; new MutationObserver(function () { if (busy) return; clearTimeout(t); t = setTimeout(function () { if (lang === "sw") applyLang(); }, 150); }).observe(document.body, { childList: true, subtree: true });
    applyLang();
  }

  /* ================= 3. IN-APP CHAT ================= */
  function chat() {
    var K = window.KAPI; if (!K || !K.live || !K.sb) return;
    var sb = K.sb, me = null, cur = null, chan = null, panel, list, msgs, input, badge;
    css(".kx-cb{position:fixed;right:14px;bottom:14px;z-index:9001;width:54px;height:54px;border-radius:50%;border:0;background:#FE980F;color:#0D0D0D;font-size:22px;cursor:pointer;box-shadow:0 4px 14px rgba(0,0,0,.5)}" +
      ".kx-cb em{position:absolute;top:-4px;right:-4px;background:#E8508A;color:#fff;border-radius:10px;font:700 11px/1 sans-serif;padding:4px 6px;font-style:normal}" +
      ".kx-cp{position:fixed;right:10px;bottom:80px;z-index:9002;width:min(360px,calc(100vw - 20px));height:min(480px,70vh);background:#161616;border:1px solid #444;border-radius:14px;display:none;flex-direction:column;overflow:hidden;color:#fff;font-size:14px}" +
      ".kx-cp.open{display:flex}.kx-ch{display:flex;justify-content:space-between;align-items:center;padding:10px 12px;background:#222;font-weight:700}" +
      ".kx-ch button{background:none;border:0;color:#b3b1ae;font-size:18px;cursor:pointer}.kx-cl{flex:1;overflow:auto;padding:8px}" +
      ".kx-ti{padding:10px;border-bottom:1px solid #2a2a2a;cursor:pointer}.kx-ti b{display:block}.kx-ti span{color:#b3b1ae;font-size:12px}" +
      ".kx-m{max-width:80%;padding:7px 10px;border-radius:12px;margin:4px 0;word-wrap:break-word}.kx-m.me{background:#FE980F;color:#0D0D0D;margin-left:auto}.kx-m.them{background:#2a2a2a}" +
      ".kx-m small{display:block;font-size:10px;opacity:.6;margin-top:2px}.kx-cf{display:flex;gap:6px;padding:8px;border-top:1px solid #333}" +
      ".kx-cf input{flex:1;background:#0D0D0D;border:1px solid #444;border-radius:20px;color:#fff;padding:9px 12px}.kx-cf button{background:#FE980F;border:0;border-radius:20px;padding:0 16px;font-weight:700;cursor:pointer}" +
      ".kx-new{padding:10px;color:#FE980F;cursor:pointer;font-weight:700;text-align:center}");
    var btn = document.createElement("button"); btn.className = "kx-cb"; btn.setAttribute("aria-label", "Chat"); btn.innerHTML = '\u{1F4AC}<em hidden></em>';
    panel = document.createElement("div"); panel.className = "kx-cp";
    panel.innerHTML = '<div class="kx-ch"><span id="kx-t">Chats</span><span><button id="kx-back" hidden>←</button><button id="kx-x">×</button></span></div><div class="kx-cl" id="kx-l"></div>' +
      '<form class="kx-cf" id="kx-f" hidden><input id="kx-i" maxlength="1000" placeholder="Type a message..." autocomplete="off"><button>Send</button></form>';
    document.body.appendChild(btn); document.body.appendChild(panel);
    list = panel.querySelector("#kx-l"); input = panel.querySelector("#kx-i"); badge = btn.querySelector("em");
    var $t = panel.querySelector("#kx-t"), $b = panel.querySelector("#kx-back"), $f = panel.querySelector("#kx-f");
    function ago(t) { var d = new Date(t); return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }); }
    function unread(n) { badge.hidden = !n; badge.textContent = n > 9 ? "9+" : n; }
    function showList() {
      cur = null; if (chan) { sb.removeChannel(chan); chan = null; } $t.textContent = "Chats"; $b.hidden = true; $f.hidden = true; list.innerHTML = "<p style='padding:10px;color:#b3b1ae'>Loading...</p>";
      K.rpc("chat_threads_list").then(function (rows) {
        var n = 0; rows.forEach(function (r) { n += +r.unread || 0; }); unread(n);
        list.innerHTML = '<div class="kx-new" id="kx-n">+ New chat</div>' + rows.map(function (r) {
          return '<div class="kx-ti" data-id="' + esc(r.id) + '" data-n="' + esc(r.other_name) + '"><b>' + esc(r.other_name) + ' <span>(' + esc(r.other_role) + (r.order_number ? " · " + esc(r.order_number) : "") + ')</span>' + (+r.unread ? ' 🔴' : '') + '</b><span>' + esc(r.last || "No messages yet") + '</span></div>';
        }).join("") || "";
      }).catch(function (e) { list.innerHTML = "<p style='padding:10px;color:#f88'>" + esc(e.message) + "</p>"; });
    }
    function showContacts() {
      $b.hidden = false; $t.textContent = "New chat"; list.innerHTML = "<p style='padding:10px;color:#b3b1ae'>Loading...</p>";
      K.rpc("chat_contacts").then(function (rows) {
        list.innerHTML = rows.map(function (r) { return '<div class="kx-ti" data-p="' + esc(r.id) + '" data-n="' + esc(r.name) + '"><b>' + esc(r.name) + '</b><span>' + esc(r.role) + '</span></div>'; }).join("") ||
          "<p style='padding:10px;color:#b3b1ae'>No one to chat with yet. Chats open after an order links you together.</p>";
      }).catch(function (e) { list.innerHTML = "<p style='padding:10px;color:#f88'>" + esc(e.message) + "</p>"; });
    }
    function bubble(m) {
      var d = document.createElement("div"); d.className = "kx-m " + (m.sender_id === me ? "me" : "them"); d.innerHTML = esc(m.body) + "<small>" + ago(m.created_at) + "</small>";
      list.appendChild(d); list.scrollTop = list.scrollHeight;
    }
    function openThread(id, name) {
      cur = id; $t.textContent = name; $b.hidden = false; $f.hidden = false; list.innerHTML = "";
      sb.from("chat_messages").select("*").eq("thread_id", id).order("id").limit(200).then(function (r) {
        (r.data || []).forEach(bubble); K.rpc("chat_mark_read", { p_thread: id }).catch(function () { });
      });
      chan = sb.channel("kx-chat-" + id).on("postgres_changes", { event: "INSERT", schema: "public", table: "chat_messages", filter: "thread_id=eq." + id }, function (p) {
        bubble(p.new); if (p.new.sender_id !== me) K.rpc("chat_mark_read", { p_thread: id }).catch(function () { });
      }).subscribe();
      input.focus();
    }
    list.onclick = function (e) {
      var el = e.target.closest("[data-id],[data-p],#kx-n"); if (!el) return;
      if (el.id === "kx-n") return showContacts();
      if (el.dataset.id) return openThread(el.dataset.id, el.dataset.n);
      K.rpc("chat_open", { p_other: el.dataset.p, p_order: null }).then(function (id) { openThread(id, el.dataset.n); }).catch(function (e) { alert(e.message); });
    };
    $b.onclick = showList; panel.querySelector("#kx-x").onclick = function () { panel.classList.remove("open"); };
    $f.onsubmit = function (e) {
      e.preventDefault(); var v = input.value.trim(); if (!v || !cur) return; input.value = "";
      K.rpc("chat_send", { p_thread: cur, p_body: v }).catch(function (e) { alert(e.message); });
    };
    btn.onclick = function () { panel.classList.toggle("open"); if (panel.classList.contains("open") && !cur) showList(); };
    function poll() { if (!me) return; K.rpc("chat_threads_list").then(function (rows) { var n = 0; rows.forEach(function (r) { n += +r.unread || 0; }); unread(n); }).catch(function () { }); }
    function start(session) {
      me = session && session.user ? session.user.id : null; btn.style.display = me ? "" : "none"; if (me) poll();
    }
    btn.style.display = "none";
    sb.auth.getSession().then(function (r) { start(r.data && r.data.session); });
    sb.auth.onAuthStateChange(function (_e, s) { start(s); });
    setInterval(function () { if (!panel.classList.contains("open")) poll(); }, 30000);
  }

  /* ================= 4. PWA: service worker, update prompt, install prompt, offline status ================= */
  function pwa() {
    css(".kx-bar{position:fixed;left:0;right:0;z-index:100000;padding:8px 14px;font:13px/1.4 system-ui,sans-serif;text-align:center;color:#fff}" +
      "#kx-off{top:0;background:#b00020}#kx-off.ok{background:#1b7f3b}" +
      "#kx-upd{bottom:0;background:#262423;border-top:2px solid #FE980F;display:flex;gap:10px;align-items:center;justify-content:center}" +
      "#kx-upd button,.kx-inst button.go{background:#FE980F;color:#0D0D0D;border:0;border-radius:16px;padding:6px 14px;font-weight:700;cursor:pointer}" +
      ".kx-inst{position:fixed;left:50%;bottom:calc(76px + env(safe-area-inset-bottom,0px));transform:translateX(-50%);z-index:9000;max-width:calc(100vw - 24px);background:#262423;color:#fff;border:1px solid #FE980F;border-radius:22px;padding:8px 10px 8px 14px;font:13px/1.35 system-ui,sans-serif;display:flex;gap:8px;align-items:center;box-shadow:0 4px 14px rgba(0,0,0,.5)}" +
      ".kx-inst button.x{background:none;border:0;color:#b3b1ae;font-size:18px;cursor:pointer;padding:0 6px}");
    var offBar = null, offTimer = null;
    function setOnline(first) {
      if (!offBar) { offBar = document.createElement("div"); offBar.id = "kx-off"; offBar.className = "kx-bar"; offBar.setAttribute("role", "status"); offBar.setAttribute("aria-live", "polite"); offBar.hidden = true; document.body.appendChild(offBar); }
      clearTimeout(offTimer);
      if (!navigator.onLine) { offBar.className = "kx-bar"; offBar.textContent = "You are offline. Some features will not work until you reconnect."; offBar.hidden = false; }
      else if (!first) { offBar.className = "kx-bar ok"; offBar.textContent = "Back online."; offBar.hidden = false; offTimer = setTimeout(function () { offBar.hidden = true; }, 2500); }
      else offBar.hidden = true;
    }
    window.addEventListener("online", function () { setOnline(false); });
    window.addEventListener("offline", function () { setOnline(false); });
    setOnline(true);
    var isPrivate = (location.protocol === "https:" || location.hostname === "localhost" || location.hostname === "127.0.0.1");
    if ("serviceWorker" in navigator && isPrivate) {
      var reloading = false, hadController = !!navigator.serviceWorker.controller;
      navigator.serviceWorker.addEventListener("controllerchange", function () { if (reloading || !hadController) return; reloading = true; location.reload(); });
      var showUpdate = function (reg) {
        if (document.getElementById("kx-upd") || !reg.waiting) return;
        var b = document.createElement("div"); b.id = "kx-upd"; b.className = "kx-bar"; b.setAttribute("role", "status");
        b.innerHTML = '<span>A new version of Kisakali is ready.</span><button type="button">Refresh</button>';
        b.querySelector("button").onclick = function () { if (reg.waiting) reg.waiting.postMessage({ type: "SKIP_WAITING" }); b.remove(); };
        document.body.appendChild(b);
      };
      var register = function () {
        navigator.serviceWorker.register("/firebase-messaging-sw.js", { scope: "/" }).then(function (reg) {
          if (reg.waiting && navigator.serviceWorker.controller) showUpdate(reg);
          reg.addEventListener("updatefound", function () {
            var w = reg.installing; if (!w) return;
            w.addEventListener("statechange", function () { if (w.state === "installed" && navigator.serviceWorker.controller) showUpdate(reg); });
          });
        }).catch(function (e) { console.warn("Service worker not registered:", e && e.message); });
      };
      if (document.readyState === "complete") register(); else window.addEventListener("load", register);
    }

    /* --- BRANDED INSTALL PROMPT --- */
    var standalone =
      (window.matchMedia && window.matchMedia("(display-mode: standalone)").matches) ||
      window.navigator.standalone === true;
    if (standalone || page === "admin.html") return;
    var snoozed = false;
    try { snoozed = Number(store("kx_inst_snooze")) > Date.now(); } catch (e) {}
    if (snoozed) return;
    var deferredPrompt = null, modal = null;
    css(
      ".kx-install-overlay{position:fixed;inset:0;z-index:100001;display:flex;align-items:center;justify-content:center;padding:20px;background:rgba(0,0,0,.76);backdrop-filter:blur(5px)}" +
      ".kx-install-card{position:relative;width:min(390px,100%);box-sizing:border-box;padding:28px 22px 22px;text-align:center;background:#171717;color:#fff;border:1px solid #FE980F;border-radius:22px;box-shadow:0 18px 55px rgba(0,0,0,.55);font:15px/1.5 system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif}" +
      ".kx-install-card img{width:76px;height:76px;object-fit:contain;border-radius:18px;margin:0 auto 12px;display:block}" +
      ".kx-install-card h2{font-size:23px;line-height:1.2;margin:4px 0 9px;color:#FE980F}" +
      ".kx-install-card p{margin:0 0 20px;color:#ddd;font-size:14px}" +
      ".kx-install-actions{display:flex;gap:10px;justify-content:center;flex-wrap:wrap}" +
      ".kx-install-actions button{border:0;border-radius:24px;padding:12px 19px;font-weight:750;font-size:14px;cursor:pointer}" +
      ".kx-install-primary{background:#FE980F;color:#111;min-width:140px}" +
      ".kx-install-later{background:#303030;color:#fff}" +
      ".kx-install-close{position:absolute;right:12px;top:9px;border:0;background:transparent;color:#aaa;font-size:25px;cursor:pointer}" +
      ".kx-install-hint{display:block;margin-top:14px;color:#aaa;font-size:11px}"
    );
    function closeInstallPrompt(remember) {
      if (remember) { try { store("kx_inst_snooze", String(Date.now() + 7 * 24 * 60 * 60 * 1000)); } catch (e) {} }
      if (modal) { modal.remove(); modal = null; }
    }
    function showInstallPrompt(isIOS) {
      if (modal || document.getElementById("kx-install-overlay")) return;
      modal = document.createElement("div"); modal.id = "kx-install-overlay"; modal.className = "kx-install-overlay";
      modal.setAttribute("role", "dialog"); modal.setAttribute("aria-modal", "true"); modal.setAttribute("aria-labelledby", "kx-install-title");
      var instructions = isIOS ? "Tap the Share icon in Safari, then choose “Add to Home Screen”." : "Install the app on your phone for a faster, app-like shopping experience.";
      modal.innerHTML =
        '<div class="kx-install-card">' +
          '<button type="button" class="kx-install-close" aria-label="Close">×</button>' +
          '<img src="/icon-192.png" alt="Kisakali app icon" onerror="this.style.display=\'none\'">' +
          '<h2 id="kx-install-title">Get the KISAKALI App!</h2>' +
          '<p>Shop at Kisakali Shopping Mall and order from IMPULSE Cakes — right from your home screen.</p>' +
          '<div class="kx-install-actions">' +
            (isIOS ? '<button type="button" class="kx-install-primary">How to Install</button>' : '<button type="button" class="kx-install-primary">Install App</button>') +
            '<button type="button" class="kx-install-later">Maybe Later</button>' +
          '</div>' +
          '<span class="kx-install-hint">' + instructions + '</span>' +
        '</div>';
      var primary = modal.querySelector(".kx-install-primary"), later = modal.querySelector(".kx-install-later");
      var close = modal.querySelector(".kx-install-close"), hint = modal.querySelector(".kx-install-hint");
      primary.onclick = function () {
        if (isIOS) {
          hint.textContent = "In Safari: tap Share (the square with an upward arrow), then tap “Add to Home Screen”, and confirm.";
          primary.textContent = "Got it"; primary.onclick = function () { closeInstallPrompt(true); }; return;
        }
        if (!deferredPrompt) {
          hint.textContent = "If the install option is unavailable, open your browser menu and choose “Install app” or “Add to Home screen”.";
          return;
        }
        var promptEvent = deferredPrompt; deferredPrompt = null; promptEvent.prompt();
        if (promptEvent.userChoice && typeof promptEvent.userChoice.then === "function") {
          promptEvent.userChoice.then(function (choice) { closeInstallPrompt(!!(choice && choice.outcome === "accepted")); }).catch(function () { closeInstallPrompt(false); });
        } else closeInstallPrompt(false);
      };
      later.onclick = function () { closeInstallPrompt(true); };
      close.onclick = function () { closeInstallPrompt(true); };
      modal.addEventListener("click", function (event) { if (event.target === modal) closeInstallPrompt(true); });
      document.body.appendChild(modal);
    }
    window.addEventListener("beforeinstallprompt", function (event) { event.preventDefault(); deferredPrompt = event; showInstallPrompt(false); });
    window.addEventListener("appinstalled", function () { deferredPrompt = null; closeInstallPrompt(true); });
    var userAgent = navigator.userAgent || "";
    var isIOSSafari =
      /iphone|ipad|ipod/i.test(userAgent) &&
      /safari/i.test(userAgent) &&
      !/crios|fxios|edgios|opios/i.test(userAgent);
    if (isIOSSafari) showInstallPrompt(true);

    /* Android/Chrome fallback: show manual install instructions if Chrome
       does not dispatch beforeinstallprompt. Native install prompt cannot be forced. */
    var forceInstallTest = false;
    try { forceInstallTest = new URLSearchParams(location.search).get("showInstall") === "1"; } catch (e) {}
    var isAndroidChrome =
      /android/i.test(userAgent) &&
      /chrome/i.test(userAgent) &&
      !/edg|opr|opera|samsungbrowser/i.test(userAgent);
    if (forceInstallTest) {
      showInstallPrompt(false);
    } else if (isAndroidChrome && !deferredPrompt) {
      window.setTimeout(function () {
        if (!deferredPrompt && !modal && !standalone) {
          showInstallPrompt(false);
          var hint = modal && modal.querySelector(".kx-install-hint");
          if (hint) {
            hint.textContent = "To install: open Chrome menu (⋮), then choose “Install app” or “Add to Home screen”. If you don't see it, use Chrome's menu after visiting the site again.";
          }
        }
      }, 1800);
    }
  }

  function boot() {
    if (page === "" || page === "index.html") intro();
    if (PUBLIC.indexOf(page) > -1) langToggle();
    chat();
    pwa();
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot); else boot();
})();
