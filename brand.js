/* KISAKALI x IMPULSE partnership: one place for brand names, colours and numbers.
   Change a name, colour or phone number here and every page follows. */
(function () {
  var BRANDS = {
    kisakali: {
      key: "kisakali", name: "KISAKALI", sub: "SHOPPING MALL", full: "Kisakali Shopping Mall",
      accent: "#FE980F", accentText: "#0D0D0D",
      wa: "255634172673", phone: "0634172673", phoneShow: "0634172673", tel: "0634172673",
      tagline: "Multi-vendor shopping and surprise delivery in Ifakara, Morogoro."
    },
    impulse: {
      key: "impulse", name: "IMPULSE", sub: "CAKES", full: "Impulse Cakes",
      accent: "#E8508A", accentText: "#0D0D0D",
      wa: "255610471724", phone: "+255 610 471 724", phoneShow: "+255 610 471 724", tel: "+255610471724",
      tagline: "Cakes and gifts made for your special moments."
    }
  };

  function h(b) { return b.name + "<span>" + b.sub + "</span>"; }

  /* animated header logo: KISAKALI <-> IMPULSE (same effect as the home page) */
  function swapMarkup() {
    return '<b class="brand-item brand-k" aria-hidden="true">' + h(BRANDS.kisakali) + "</b>" +
           '<b class="brand-item brand-i" aria-hidden="true">' + h(BRANDS.impulse) + "</b>";
  }
  function swapLogo(el) {
    if (!el || el.classList.contains("brand-swap")) return;
    el.classList.add("brand-swap");
    el.setAttribute("aria-label", BRANDS.kisakali.full + " and " + BRANDS.impulse.full);
    el.removeAttribute("style");
    el.innerHTML = swapMarkup();
  }

  /* slim partnership ribbon under the header of public pages */
  function ribbon() {
    var d = document.createElement("div");
    d.className = "kx-partner-ribbon";
    d.innerHTML = '<span class="k">' + BRANDS.kisakali.name + " " + BRANDS.kisakali.sub + '</span><i class="fas fa-handshake"></i><span class="i">' +
      BRANDS.impulse.name + " " + BRANDS.impulse.sub + '</span><em>Proudly in partnership</em>';
    return d;
  }
  function footLockup() {
    var d = document.createElement("div");
    d.className = "kx-partner-foot";
    d.innerHTML = '<span class="k">' + BRANDS.kisakali.name + " " + BRANDS.kisakali.sub + '</span><i class="fas fa-handshake"></i><span class="i">' +
      BRANDS.impulse.name + " " + BRANDS.impulse.sub + "</span>";
    return d;
  }

  /* public pages: call once (brand.js does it automatically when <body data-partner> is not "off") */
  function mountPublic() {
    var hd = document.querySelector("header");
    if (!hd) return;
    swapLogo(hd.querySelector(".logo h1"));
    if (!document.querySelector(".kx-partner-ribbon")) hd.insertAdjacentElement("afterend", ribbon());
    var ft = document.querySelector("footer");
    if (ft && !ft.querySelector(".kx-partner-foot")) ft.appendChild(footLockup());
  }

  /* admin portal: everything shows as the signed-in admin's brand */
  var current = BRANDS.kisakali;
  function applyPortal(key, tier) {
    var b = BRANDS[key] || BRANDS.kisakali; current = b;
    var root = document.documentElement.style;
    root.setProperty("--accent", b.accent); root.setProperty("--primary-color", b.accent); root.setProperty("--accent-text", b.accentText);
    var role = tier === "super" ? "Super Admin" : "Admin";
    document.title = role + " Dashboard - " + b.full;
    var logo = document.querySelector("header .logo h1");
    if (logo) { logo.classList.remove("brand-swap"); logo.removeAttribute("aria-label"); logo.innerHTML = h(b); }
    var tag = document.querySelector("header .location-tag");
    if (tag) tag.innerHTML = '<i class="fas ' + (tier === "super" ? "fa-crown" : "fa-user-shield") + '" style="color:var(--accent)"></i> ' + role + " Command Center";
    var nav = document.querySelector('nav a[href="admin.html"]'); if (nav) nav.textContent = role;
    var m = document.querySelector('meta[name="theme-color"]'); if (m) m.setAttribute("content", b.accent);
    document.body.setAttribute("data-brand", b.key);
  }

  var EMAIL = "Kisakali69@gmail.com";
  /* fills every data-phone / data-tel / data-email placeholder from the numbers above */
  function bind() {
    [].forEach.call(document.querySelectorAll("[data-phone]"), function (e) { e.textContent = BRANDS[e.getAttribute("data-phone")].phoneShow; });
    [].forEach.call(document.querySelectorAll("[data-tel]"), function (e) { e.href = "tel:" + BRANDS[e.getAttribute("data-tel")].tel; });
    [].forEach.call(document.querySelectorAll("[data-email]"), function (e) { e.href = "mailto:" + EMAIL; });
    [].forEach.call(document.querySelectorAll("[data-email-text]"), function (e) { e.textContent = EMAIL; });
  }
  window.KBRAND = { email: EMAIL, bind: bind, brands: BRANDS, swapLogo: swapLogo, swapMarkup: swapMarkup, mountPublic: mountPublic, applyPortal: applyPortal,
    get current() { return current; } };

  function auto() { bind(); if (document.body && document.body.getAttribute("data-partner") !== "off" && document.body.getAttribute("data-portal") !== "admin") mountPublic(); }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", auto); else auto();
})();
