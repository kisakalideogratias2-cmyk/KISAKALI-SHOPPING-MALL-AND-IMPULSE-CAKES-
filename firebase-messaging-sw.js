/* Kisakali background push service worker. Must live at the site ROOT: /firebase-messaging-sw.js */
/* HARDENING: if the Firebase scripts cannot be loaded (blocked network, CDN problem), do not let the whole
   worker fail. Without this the browser throws the worker away, and the site loses install + offline support. */
try {
importScripts("https://www.gstatic.com/firebasejs/10.14.1/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/10.14.1/firebase-messaging-compat.js");

firebase.initializeApp({
  apiKey: "AIzaSyD0ivDwbmmPhVrSOzTSL3mSMTECgOSb5NY",
  authDomain: "kisakali-shopping-mall.firebaseapp.com",
  projectId: "kisakali-shopping-mall",
  storageBucket: "kisakali-shopping-mall.firebasestorage.app",
  messagingSenderId: "95484067910",
  appId: "1:95484067910:web:41e4492b494a7a53a8ca47"
});

const messaging = firebase.messaging();

// The server sends DATA-ONLY messages, so this is the single place a notification is shown.
messaging.onBackgroundMessage((payload) => {
  const d = payload.data || {};
  const title = d.title || (payload.notification && payload.notification.title) || "Kisakali Shopping Mall";
  const body = d.body || (payload.notification && payload.notification.body) || "You have a new notification.";
  return self.registration.showNotification(title, {
    body: body,
    icon: "/icon-192.png",
    data: { url: d.url || "/" },
    tag: d.tag || undefined
  });
});

} catch (err) {
  console.warn("Firebase push not available in the service worker:", err && err.message);
}

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = new URL((event.notification.data && event.notification.data.url) || "/", self.location.origin).href;
  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then((list) => {
      for (const c of list) { if (c.url === url && "focus" in c) return c.focus(); }
      return clients.openWindow(url);
    })
  );
});


/* =====================================================================
   PWA CACHING (added to the existing worker so there is ONE service worker at scope "/").
   The Firebase push code above is unchanged.
   Rules: same-origin GET only. Supabase, Firebase and CDN requests are never touched.
   Nothing from the admin portal is cached. Private/API responses are never stored.
   To release a new cache layout, change KX_VERSION: old caches are deleted on activate.
   ===================================================================== */
const KX_VERSION = "kuma-v1";
const KX_SHELL = KX_VERSION + "-shell";
const KX_RUNTIME = KX_VERSION + "-runtime";
const KX_OFFLINE = "/offline.html";
const KX_PRECACHE = [KX_OFFLINE, "/icon-192.png", "/icon-512.png", "/manifest.webmanifest"];
const KX_NEVER_CACHE = /^\/(admin|admin-live|admin-access)(\.html|\.js)?\/?$/i;
const KX_NET_TIMEOUT_MS = 5000;

// A response that was redirected cannot be served to a navigation; rebuild it as a plain response.
function kxClean(res) {
  if (!res.redirected) return Promise.resolve(res);
  return res.blob().then((b) => new Response(b, { status: res.status, statusText: res.statusText, headers: res.headers }));
}

self.addEventListener("install", (event) => {
  // No skipWaiting() here: a new worker waits until the page asks for it (see SKIP_WAITING below),
  // so an update never swaps code underneath a customer who is in the middle of checkout.
  event.waitUntil(
    caches.open(KX_SHELL).then((cache) =>
      Promise.all(KX_PRECACHE.map((u) =>
        fetch(u, { cache: "reload" }).then(kxClean).then((r) => (r.ok ? cache.put(u, r) : null)).catch(() => null)
      ))
    )
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k.indexOf("kuma-") === 0 && k !== KX_SHELL && k !== KX_RUNTIME).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "SKIP_WAITING") self.skipWaiting();
});

function kxOfflineResponse(isNav) {
  if (!isNav) return Promise.resolve(Response.error());
  return caches.match(KX_OFFLINE).then((r) => r || new Response("You are offline.", { status: 503, headers: { "Content-Type": "text/plain; charset=utf-8" } }));
}

// Network first; if the network is slow (>5s) or down, use the saved copy. Successful responses refresh the copy.
function kxNetworkFirst(req, key, isNav, store) {
  return new Promise((resolve) => {
    let settled = false;
    const finish = (r) => { if (!settled) { settled = true; resolve(r); } };
    const timer = setTimeout(() => { caches.match(key).then((hit) => { if (hit) finish(hit); }); }, KX_NET_TIMEOUT_MS);
    fetch(req).then((res) => {
      clearTimeout(timer);
      if (store && res && res.status === 200 && res.type === "basic") {
        const copy = res.clone();
        caches.open(KX_RUNTIME).then((c) => c.put(key, copy)).catch(() => {});
      }
      finish(res);
    }).catch(() => {
      clearTimeout(timer);
      caches.match(key).then((hit) => (hit ? finish(hit) : kxOfflineResponse(isNav).then(finish)));
    });
  });
}

// Cache first for images and fonts (they rarely change); fill the cache on first use.
function kxCacheFirst(req, key) {
  return caches.match(key).then((hit) => {
    if (hit) return hit;
    return fetch(req).then((res) => {
      if (res && res.status === 200 && res.type === "basic") {
        const copy = res.clone();
        caches.open(KX_RUNTIME).then((c) => c.put(key, copy)).catch(() => {});
      }
      return res;
    });
  });
}

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET" || req.headers.has("range")) return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;                        // Supabase / Firebase / CDNs: untouched
  if (url.pathname === "/firebase-messaging-sw.js") return;               // always fetch the worker itself fresh
  const isNav = req.mode === "navigate";
  const key = url.origin + url.pathname;                                  // ignore ?query so order numbers etc. are never stored in keys

  if (KX_NEVER_CACHE.test(url.pathname)) {                                // admin: network only, offline page if down
    if (isNav) event.respondWith(fetch(req).catch(() => kxOfflineResponse(true)));
    return;
  }
  if (isNav) { event.respondWith(kxNetworkFirst(req, key, true, true)); return; }
  const dest = req.destination;
  if (dest === "image" || dest === "font") { event.respondWith(kxCacheFirst(req, key).catch(() => Response.error())); return; }
  if (dest === "script" || dest === "style" || dest === "manifest") { event.respondWith(kxNetworkFirst(req, key, false, true)); return; }
});
