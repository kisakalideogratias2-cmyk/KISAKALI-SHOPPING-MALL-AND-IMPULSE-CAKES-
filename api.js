// KISAKALI backend client: the single place where the website talks to Supabase.
// Loaded after supabase-js and supabase-config.js. Defines window.KAPI.
// If the config is empty, KAPI.live is false and every page shows a "not connected" message.
(function () {
  var C = window.KISAKALI_CONFIG || {};
  var live = !!(C.SUPABASE_URL && C.SUPABASE_ANON_KEY && window.supabase && window.supabase.createClient);
  var sb = live ? window.supabase.createClient(C.SUPABASE_URL, C.SUPABASE_ANON_KEY, {
    auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true }
  }) : null;

  // Calls a database function and turns {error} into a thrown Error with a readable message.
  function rpc(name, args) {
    if (!sb) return Promise.reject(new Error('The shop is not connected yet.'));
    return sb.rpc(name, args || {}).then(function (r) {
      if (r.error) throw new Error(r.error.message || 'Request failed');
      return r.data;
    });
  }


  /* If the connection cannot start, say exactly why (red bar at the top of the page) so it can be fixed fast. */
  if (!live) {
    var why = !window.KISAKALI_CONFIG ? "supabase-config.js did not load. It must be in the SAME folder as this page (check the file name and spelling)."
      : (!C.SUPABASE_URL || !C.SUPABASE_ANON_KEY) ? "supabase-config.js is empty. Fill in SUPABASE_URL and SUPABASE_ANON_KEY."
      : !window.supabase ? "The Supabase library could not be downloaded (both cdn.jsdelivr.net and unpkg.com failed). Check the internet connection, data saver or ad-blocker, then refresh."
      : "The Supabase client could not start.";
    window.KAPI_WHY = why;
    var bar = function () {
      if (!document.body || document.getElementById("kapi-why")) return;
      var d = document.createElement("div"); d.id = "kapi-why";
      d.style.cssText = "position:fixed;left:0;right:0;top:0;z-index:2147483647;background:#b00020;color:#fff;padding:10px 14px;font:13px/1.4 sans-serif;text-align:center";
      d.textContent = "Not connected: " + why + (location.protocol === "file:" ? " (You opened this as a file from your device. Open it from your website address instead.)" : "");
      document.body.appendChild(d);
    };
    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", bar); else bar();
  }

  window.KAPI = {
    live: live,
    sb: sb,
    rpc: rpc,
    placeOrder: function (payload) { return rpc('place_order', { p: payload }); },
    track: function (number, phone) { return rpc('track_order', { p_number: number, p_phone: phone }); },
    applyVendor: function (payload) { return rpc('submit_vendor_application', { p: payload }); },
    // delivery photos live in the public "delivery-proofs" bucket
    photoUrl: function (path) {
      if (!sb || !path) return '';
      return sb.storage.from('delivery-proofs').getPublicUrl(path).data.publicUrl;
    }
  };
})();
