/* KISAKALI admin-access.js  (NEW file, add-on)
   Adds per-admin permissions on top of your existing admin.html + admin-live.js WITHOUT editing them.
   - Super admin gets a new "Admins" tab: add an admin by email and switch each permission ON/OFF any time.
   - A partner admin (e.g. IMPULSE) only sees the tabs/cards he has permission for.
   The real protection is in the database (admin_permissions.sql); this file only shows/hides things.
   If admin_permissions.sql has not been run yet, this file does nothing and the old behaviour stays. */
(function () {
  var K = window.KAPI; if (!K || !K.live || typeof window.kLiveMount !== "function") return;
  var sb = K.sb, orig = window.kLiveMount;
  var ST = { isSuper: false, perms: {}, root: null, wired: false };

  var L = {
    en: { tab: "Admins", admins: "Admins", add: "Add an admin", hint: "He must first register an account on register.html. Then type the same email here.", email: "Admin email",
      full: "Full access", lim: "Orders only", save: "Save permissions", del: "Remove admin", addBtn: "Add admin", sup: "Super admin always has full access.",
      saved: "Permissions saved", added: "Admin added", removed: "Admin removed", setFull: "All switched on. Press Save permissions.", setLim: "Orders only. Press Save permissions.",
      conf: "Remove this admin? He becomes a normal customer.", badEmail: "Enter a valid email.", none: "No admins yet.", loading: "Loading...",
      fullA: "Full access", limA: "Limited access",
      p: { orders: "Orders & payments (verify payments, assign riders)", applications: "Vendor & rider applications", products: "Review products",
        withdrawals: "Vendor withdrawals", settings: "Commission rate", audit: "Audit log" } },
    sw: { tab: "Wasimamizi", admins: "Wasimamizi", add: "Ongeza msimamizi", hint: "Lazima kwanza ajisajili kwenye register.html. Kisha andika barua pepe ile ile hapa.", email: "Barua pepe ya admin",
      full: "Ufikiaji kamili", lim: "Oda tu", save: "Hifadhi ruhusa", del: "Ondoa admin", addBtn: "Ongeza admin", sup: "Super admin ana ufikiaji kamili kila wakati.",
      saved: "Ruhusa zimehifadhiwa", added: "Admin ameongezwa", removed: "Admin ameondolewa", setFull: "Zote zimewashwa. Bonyeza Hifadhi ruhusa.", setLim: "Oda tu. Bonyeza Hifadhi ruhusa.",
      conf: "Kumwondoa admin huyu? Atakuwa mteja wa kawaida.", badEmail: "Weka barua pepe sahihi.", none: "Hakuna admin bado.", loading: "Inapakia...",
      fullA: "Ufikiaji kamili", limA: "Ufikiaji mdogo",
      p: { orders: "Oda na malipo (kuthibitisha malipo, kumpa rider)", applications: "Maombi ya wauzaji na riders", products: "Kupitisha bidhaa",
        withdrawals: "Utoaji pesa wa wauzaji", settings: "Kamisheni", audit: "Kumbukumbu (audit log)" } }
  };
  var KEYS = ["orders", "applications", "products", "withdrawals", "settings", "audit"];
  function T() { var l = "en"; try { l = localStorage.getItem("kLang") || "en"; } catch (e) { } return L[l] || L.en; }
  function can(k) { return ST.isSuper || !!ST.perms[k]; }
  function esc(s) { return String(s == null ? "" : s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;"); }
  function toast(m) { var t = document.getElementById("toast"); if (!t) return; t.textContent = m; t.style.display = "block"; clearTimeout(toast.h); toast.h = setTimeout(function () { t.style.display = "none"; }, 3000); }
  function btn(act, key, label, extra) { return '<button class="btn" style="padding:6px 12px;font-size:12px;margin:4px 6px 0 0;' + (extra || "") + '" data-aa="' + act + '" data-k="' + esc(key) + '">' + label + "</button>"; }
  function badge(t, c) { return '<span class="badge ' + c + '">' + esc(t) + "</span>"; }

  /* ---------- hide what this admin may not use ---------- */
  var TABMAP = { orders: "orders", apps: "applications", products: "products", payouts: "withdrawals" };
  var CARD = { "Commission (delivered)": "settings", "Pending withdrawals": "withdrawals", "Total orders": "orders", "Waiting for payment": "orders", "Delivered orders": "orders",
    "Cancelled orders": "orders", "Verified sales": "orders", "Delivery fees (verified)": "orders", "Unverified payments": "orders" };
  function textNodes(n, fn) { var w = document.createTreeWalker(n, NodeFilter.SHOW_TEXT, null); var x; while ((x = w.nextNode())) fn(x); }
  function apply() {
    var root = ST.root; if (!root) return;
    [].forEach.call(root.querySelectorAll('.tab-btn[data-la="tab"]'), function (b) {
      var k = b.getAttribute("data-k");
      var ok = TABMAP[k] ? can(TABMAP[k]) : k === "settings" ? (can("settings") || can("audit")) : true;
      b.style.display = ok ? "" : "none";
    });
    if (ST.isSuper) {
      var tabs = root.querySelector(".tabs");
      if (tabs && !tabs.querySelector('[data-aa="tab"]')) {
        var b = document.createElement("button");
        b.className = "tab-btn"; b.setAttribute("data-aa", "tab"); b.innerHTML = '<i class="fas fa-users-cog"></i>' + esc(T().tab);
        tabs.appendChild(b);
      }
      return;
    }
    /* partner admin: the UI was told "super" so every tab can draw; trim what he may not have */
    var full = KEYS.every(can);
    var banner = root.firstElementChild;
    if (banner) textNodes(banner, function (n) { if (n.nodeValue.indexOf("Super Admin") > -1) n.nodeValue = n.nodeValue.replace("Super Admin", "Admin \u00b7 " + (full ? T().fullA : T().limA)); });
    [].forEach.call(root.querySelectorAll(".stat-card"), function (c) {
      var h = c.querySelector("h5"), need = h && CARD[h.textContent.trim()]; if (need && !can(need)) c.style.display = "none";
    });
    [].forEach.call(root.querySelectorAll('.alert-item [data-la="tab"]'), function (b) {
      var need = TABMAP[b.getAttribute("data-k")]; if (need && !can(need)) b.closest(".alert-item").style.display = "none";
    });
    [].forEach.call(root.querySelectorAll(".section-box"), function (bx) {
      var h = bx.querySelector("h3.sub-title"); if (!h) return;
      var t = h.textContent;
      if (t.indexOf("Commission and fees") > -1 && !can("settings")) bx.style.display = "none";
      if (t.indexOf("Audit log") > -1 && !can("audit")) bx.style.display = "none";
    });
  }

  /* ---------- Admins tab (super admin) ---------- */
  function permBoxes(id, on) {
    return KEYS.map(function (k) {
      return '<label style="display:block;margin:6px 0;font-size:13px"><input type="checkbox" id="aa-pm-' + esc(id) + "-" + k + '"' + (on && on[k] ? " checked" : "") + "> " + esc(T().p[k]) + "</label>";
    }).join("");
  }
  function readPerms(id) { var o = {}; KEYS.forEach(function (k) { var e = document.getElementById("aa-pm-" + id + "-" + k); o[k] = !!(e && e.checked); }); return o; }
  function setAll(id, fn) { KEYS.forEach(function (k) { var e = document.getElementById("aa-pm-" + id + "-" + k); if (e) e.checked = fn(k); }); }
  function box(title, inner) { return '<div class="section-box"><h3 class="sub-title"><i class="fas fa-users-cog"></i> ' + title + "</h3>" + inner + "</div>"; }
  function val(id) { var e = document.getElementById(id); return e ? e.value.trim() : ""; }

  function openAdmins() {
    var body = ST.root.querySelector("#la-body"); if (!body) return;
    [].forEach.call(ST.root.querySelectorAll(".tab-btn"), function (b) { b.classList.toggle("on", b.getAttribute("data-aa") === "tab"); });
    body.innerHTML = '<p class="note-small">' + esc(T().loading) + "</p>";
    sb.rpc("admin_list_admins").then(function (r) {
      if (r.error) throw new Error(r.error.message);
      var rows = (r.data || []).map(function (a) {
        var sup = a.tier === "super";
        return '<div style="border:1px solid #444;border-radius:6px;padding:14px;margin-bottom:12px;background:#262423"><b>' + esc(a.name || a.email) + "</b> &middot; " + esc(a.email) + " " +
          badge(sup ? "Super Admin" : "Admin", sup ? "badge-verified" : "badge-pending") + " " + badge(String(a.brand || "kisakali").toUpperCase(), "badge-pending") +
          (sup ? '<p class="note-small">' + esc(T().sup) + "</p>" :
            '<div style="margin-top:8px">' + permBoxes(a.id, a.permissions) + "</div>" +
            btn("full", a.id, esc(T().full)) + btn("lim", a.id, esc(T().lim), "background:#666;color:#fff;") + btn("save", a.id, esc(T().save)) + btn("del", a.id, esc(T().del), "background:#a33;color:#fff;")) + "</div>";
      }).join("");
      var add = box(esc(T().add), '<p class="note-small" style="margin:0 0 8px">' + esc(T().hint) + "</p>" +
        '<input class="ta" id="aa-email" type="email" placeholder="' + esc(T().email) + '" style="max-width:320px;margin-bottom:8px"> ' +
        '<select class="ta" id="aa-brand" style="max-width:200px;display:inline-block"><option value="impulse">IMPULSE CAKES</option><option value="kisakali">KISAKALI</option></select>' +
        '<div style="margin-top:8px">' + permBoxes("new", { orders: true, applications: true, products: true }) + "</div>" + btn("add", "", esc(T().addBtn)));
      body.innerHTML = box(esc(T().admins), rows || '<p class="note-small" style="margin:0">' + esc(T().none) + "</p>") + add;
    }).catch(function (e) { body.innerHTML = '<div class="section-box"><p style="color:#ff4d4d;margin:0">' + esc(e.message) + "</p></div>"; });
  }
  function rpc(name, args, ok) {
    sb.rpc(name, args).then(function (r) { if (r.error) { toast(r.error.message); return; } toast(ok); openAdmins(); }, function (e) { toast(e.message || "Error"); });
  }
  function onClick(e) {
    var b = e.target.closest("[data-aa]"); if (!b || !ST.root.contains(b)) return;
    var a = b.getAttribute("data-aa"), k = b.getAttribute("data-k");
    if (a === "tab") openAdmins();
    else if (a === "full") { setAll(k, function () { return true; }); toast(T().setFull); }
    else if (a === "lim") { setAll(k, function (x) { return x === "orders"; }); toast(T().setLim); }
    else if (a === "save") rpc("admin_set_permissions", { p_id: k, p_perms: readPerms(k) }, T().saved);
    else if (a === "del") { if (confirm(T().conf)) rpc("admin_remove_admin", { p_id: k }, T().removed); }
    else if (a === "add") { var em = val("aa-email"); if (!/^\S+@\S+\.\S+$/.test(em)) { toast(T().badEmail); return; } rpc("admin_grant_admin", { p_email: em, p_brand: val("aa-brand"), p_perms: readPerms("new") }, T().added); }
  }

  /* ---------- hook: wrap kLiveMount so we know who is signed in ---------- */
  window.kLiveMount = function (el, ctx) {
    sb.auth.getUser().then(function (u) {
      var uid = u && u.data && u.data.user && u.data.user.id; if (!uid) throw new Error("no user");
      return sb.from("profiles").select("role,admin_tier,permissions").eq("id", uid).maybeSingle();
    }).then(function (r) {
      if (r.error || !r.data || r.data.role !== "admin") { orig(el, ctx); return; }   /* permissions not set up yet: old behaviour */
      ST.isSuper = r.data.admin_tier === "super"; ST.perms = r.data.permissions || {}; ST.root = el;
      var c = {}; for (var k in ctx) c[k] = ctx[k];
      if (!ST.isSuper) c.tier = "super";     /* cosmetic only: lets every tab draw; the database still enforces the real limits */
      orig(el, c);
      if (!ST.wired) { ST.wired = true; el.addEventListener("click", onClick); new MutationObserver(apply).observe(el, { childList: true, subtree: true }); }
      apply();
    }).catch(function () { orig(el, ctx); });
  };
})();
