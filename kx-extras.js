/* KISAKALI x IMPULSE extras: welcome animation, Kiswahili toggle, in-app chat. One file, loaded last on every page. */
(function () {
  "use strict";
  var page = (location.pathname.split("/").pop() || "index.html").toLowerCase();
  if (page.indexOf(".") < 0) page += ".html";   /* /shop and /shop.html are the same page */
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
    timers.push(setTimeout(function () {                       /* ball lands: explode */
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
    timers.push(setTimeout(function () { wel.classList.add("show"); }, 1500));   /* welcome text */
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
    panel.innerHTML = '<div class="kx-ch"><span id="kx-t">Chats</span><span><button id="kx-back" hidden>\u2190</button><button id="kx-x">\u00D7</button></span></div><div class="kx-cl" id="kx-l"></div>' +
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
          return '<div class="kx-ti" data-id="' + esc(r.id) + '" data-n="' + esc(r.other_name) + '"><b>' + esc(r.other_name) + ' <span>(' + esc(r.other_role) + (r.order_number ? " \u00B7 " + esc(r.order_number) : "") + ')</span>' + (+r.unread ? ' \u{1F534}' : '') + '</b><span>' + esc(r.last || "No messages yet") + '</span></div>';
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

    /* --- offline / back online status --- */
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

    /* --- service worker (the existing /firebase-messaging-sw.js; push-client.js registers the same file/scope) --- */
    var isPrivate = (location.protocol === "https:" || location.hostname === "localhost" || location.hostname === "127.0.0.1");
    if ("serviceWorker" in navigator && isPrivate) {
      var reloading = false, hadController = !!navigator.serviceWorker.controller;   /* first install also fires controllerchange: do not reload then */
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

    /* --- install prompt --- */
    var standalone = (window.matchMedia && matchMedia("(display-mode: standalone)").matches) || window.navigator.standalone === true;
    if (standalone || page === "admin.html") return;
    var snoozed = false; try { snoozed = +store("kx_inst_snooze") > Date.now(); } catch (e) { }
    if (snoozed) return;
    var deferred = null, box = null;
    function snooze() { store("kx_inst_snooze", String(Date.now() + 7 * 864e5)); if (box) { box.remove(); box = null; } }
    function mount(label, action) {
      if (box) return;
      box = document.createElement("div"); box.className = "kx-inst"; box.setAttribute("role", "region"); box.setAttribute("aria-label", "Install app");
      box.innerHTML = '<span>' + label + '</span><button type="button" class="go">' + (action ? "Install" : "How?") + '</button><button type="button" class="x" aria-label="Dismiss">×</button>';
      box.querySelector(".go").onclick = function () {
        if (action) { action(); return; }
        box.querySelector("span").textContent = "Tap the Share button, then “Add to Home Screen”.";
        box.querySelector(".go").remove();
      };
      box.querySelector(".x").onclick = snooze;
      document.body.appendChild(box);
    }
    window.addEventListener("beforeinstallprompt", function (e) {
      e.preventDefault(); deferred = e;
      mount("Install Kisakali on this device", function () {
        if (!deferred) return; deferred.prompt();
        deferred.userChoice.then(function () { deferred = null; if (box) { box.remove(); box = null; } });
      });
    });
    window.addEventListener("appinstalled", function () { deferred = null; if (box) { box.remove(); box = null; } });
    var ua = navigator.userAgent || "";
    var iosSafari = /iphone|ipad|ipod/i.test(ua) && /safari/i.test(ua) && !/crios|fxios|edgios|opios/i.test(ua);
    if (iosSafari) mount("Install Kisakali on your iPhone", null);
  }

  function boot() {
    if (page === "" || page === "index.html") intro();
    if (PUBLIC.indexOf(page) > -1) langToggle();
    chat();
    pwa();
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot); else boot();
})();
