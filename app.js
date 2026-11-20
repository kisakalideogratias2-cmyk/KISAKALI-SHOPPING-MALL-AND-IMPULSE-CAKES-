// KISAKALI SHOPPING MALL - Master Application Logic & State Controller
// Products come from the Supabase database (published products only).
// CART FIX: one storage key (kisakali_cart), always re-read before changes, never auto-deleted by the catalog.

// ---------- cart + wishlist (saved in the browser) ----------
const CART_KEY = 'kisakali_cart';
function readCart() {
  try {
    const v = JSON.parse(localStorage.getItem(CART_KEY));
    return Array.isArray(v) ? v : [];
  } catch (e) { return []; }
}
function writeCart(list) {
  try { localStorage.setItem(CART_KEY, JSON.stringify(list)); } catch (e) { console.warn('Could not save cart:', e); }
}

let shoppingCart = readCart();
let wishlistCount = parseInt(localStorage.getItem('kisakali_wishlist_count')) || 0;

const productList = document.getElementById('product-list');
const cartToggle = document.getElementById('cart-toggle');
const cartClose = document.getElementById('cart-close');
const cartSidebar = document.getElementById('cart-sidebar');
const cartItemsContainer = document.getElementById('cart-items-container');
const cartTotalAmount = document.getElementById('cart-total-amount');
const cartCount = document.getElementById('cart-count');
const wishlistCounterEl = document.getElementById('wishlist-count');

// ---------- helpers ----------
let DELIVERY_FEE_PER_VENDOR = 3000; // replaced by the value in the database (settings.delivery_fee_per_vendor)

function esc(s) { return String(s == null ? "" : s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;"); }
function money(n) { return Number(n || 0).toLocaleString("en-US") + " TSh"; }
function validPhone(p) { return /^(0|\+?255)[67]\d{8}$/.test(String(p || "").replace(/[\s-]/g, "")); }
function toast(msg) {
  const t = document.createElement("div");
  t.className = "ks-toast"; t.textContent = msg;
  document.body.appendChild(t);
  setTimeout(function () { if (t.parentNode) t.parentNode.removeChild(t); }, 2200);
}
function deliveryFee(vendorCount) { return vendorCount * DELIVERY_FEE_PER_VENDOR; }
window.KS = { esc: esc, money: money, validPhone: validPhone, toast: toast, deliveryFee: deliveryFee };

// ---------- catalog (from Supabase) ----------
let catalog = [];          // [{id, name, price, img, vendor, category, stock}]
let catalogState = 'loading'; // loading | ready | offline | error

function loadScript(src) {
  return new Promise(function (resolve, reject) {
    const s = document.createElement('script');
    s.src = src; s.onload = resolve; s.onerror = function () { reject(new Error('Could not load ' + src)); };
    document.head.appendChild(s);
  });
}

// built-in copy of api.js: used only when api.js is not found next to the page
function builtinApi() {
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

}

async function ensureBackend() {
  if (window.KAPI) return window.KAPI;
  if (!window.KISAKALI_CONFIG) await loadScript('supabase-config.js');
  const C = window.KISAKALI_CONFIG || {};
  if (!C.SUPABASE_URL || !C.SUPABASE_ANON_KEY) return null;
  if (!(window.supabase && window.supabase.createClient)) {
    try { await loadScript('https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.45.4/dist/umd/supabase.min.js'); }
    catch (e) { await loadScript('https://unpkg.com/@supabase/supabase-js@2.45.4/dist/umd/supabase.min.js'); } // second source if the first is blocked
  }
  if (!window.KAPI) { try { await loadScript('api.js'); } catch (e) { /* api.js not found: use the built-in copy below */ } }
  if (!window.KAPI) builtinApi();
  return window.KAPI;
}

async function loadCatalog() {
  try {
    const api = await ensureBackend();
    if (!api || !api.live) { catalogState = 'offline'; return; }
    const sb = api.sb;

    let res = await sb.from('products')
      .select('id,vendor_id,title,price,image,stock,category:categories(slug,name),vendor:vendors(shop_name,paused,holiday)')
      .eq('is_active', true).eq('status', 'published')
      .order('created_at', { ascending: false });

    // If PostgREST cannot resolve one of the embedded relationships, retry the
    // products query without joins so a category/vendor join cannot hide every item.
    let rows;
    if (res.error) {
      console.warn('Catalog joined query failed; retrying without joins:', res.error.message);
      res = await sb.from('products')
        .select('id,vendor_id,title,price,image,stock')
        .eq('is_active', true).eq('status', 'published')
        .order('created_at', { ascending: false });
      if (res.error) throw new Error(res.error.message);
      rows = res.data || [];
      const vendorIds = Array.from(new Set(rows.map(function (r) { return r.vendor_id; }).filter(Boolean)));
      let vendorMap = {};
      if (vendorIds.length) {
        const vr = await sb.from('vendors').select('id,shop_name,paused,holiday').in('id', vendorIds);
        if (!vr.error) (vr.data || []).forEach(function (v) { vendorMap[String(v.id)] = v; });
      }
      catalog = rows.filter(function (r) {
        const v = vendorMap[String(r.vendor_id)];
        return !v || (!v.paused && !v.holiday);
      }).map(function (r) {
        const v = vendorMap[String(r.vendor_id)] || {};
        return { id:r.id, name:r.title, price:Number(r.price), img:r.image || '',
          vendor:v.shop_name || 'KISAKALI Seller', category:'', stock:r.stock, status:'published' };
      });
    } else {
      rows = res.data || [];
      // PostgREST can return embedded one-to-one relations as either an object
      // or a one-item array. Normalize both shapes before reading vendor/category.
      function oneRelation(value) {
        return Array.isArray(value) ? (value[0] || null) : (value || null);
      }
      catalog = rows.filter(function (r) {
        const v = oneRelation(r.vendor);
        return !v || (!v.paused && !v.holiday);
      }).map(function (r) {
        const v = oneRelation(r.vendor);
        const c = oneRelation(r.category);
        return {
          id:r.id, name:r.title, price:Number(r.price), img:r.image || '',
          vendor:v && v.shop_name ? v.shop_name : 'KISAKALI Seller',
          category:c && c.slug ? c.slug : '', stock:r.stock, status:'published'
        };
      });
    }

    const fee = await sb.from('settings').select('value').eq('key', 'delivery_fee_per_vendor').maybeSingle();
    if (!fee.error && fee.data && !isNaN(Number(fee.data.value))) DELIVERY_FEE_PER_VENDOR = Number(fee.data.value);

    // FIX: the cart is NEVER deleted here any more. Items that are not on sale are only reported;
    // the customer can remove them, and the server re-checks every item when the order is placed.
    if (catalog.length) {
      shoppingCart = readCart();
      const ids = {}; catalog.forEach(function (p) { ids[String(p.id)] = 1; });
      const missing = shoppingCart.filter(function (it) { return !it.custom && !ids[String(it.productId || it.id)]; }).length;
      if (missing) toast(missing + ' item(s) in your cart may no longer be available');
    }

    catalogState = 'ready';
  } catch (e) {
    console.error('Catalog error:', e);
    catalogState = 'error';
  }
}

function publishCatalog() {
  window.KISAKALI_PRODUCTS = catalog; // used by index.html sections
  window.KCATALOG = { products: catalog, state: catalogState, get: function (id) { return findProduct(id); } };
  window.dispatchEvent(new CustomEvent('kisakali:catalog', { detail: { state: catalogState, products: catalog } }));
}

function findProduct(id) {
  return catalog.filter(function (x) { return String(x.id) === String(id); })[0];
}

let currentFilter = 'all';
function renderProducts(filterCategory) {
  if (!productList) return;
  currentFilter = filterCategory || 'all';
  const msg = function (t) { productList.innerHTML = '<p style="color:#b3b1ae;grid-column:1/-1;text-align:center;padding:40px;">' + t + '</p>'; };

  if (catalogState === 'loading') return msg('Loading products...');
  if (catalogState === 'offline') return msg('The shop is not connected yet. Please check back soon.');
  if (catalogState === 'error') return msg('Could not load products. Check your connection and refresh the page.');

  const filtered = currentFilter === 'all' ? catalog : catalog.filter(function (p) { return p.category === currentFilter; });
  if (!filtered.length) return msg(catalog.length ? 'No products found in this category.' : 'No products are on sale yet. Please check back soon.');

  productList.innerHTML = filtered.map(function (p) {
    const out = p.stock <= 0;
    return '<div class="product-card" style="background:#363432;border:1px solid #444;padding:15px;border-radius:6px;text-align:center;color:#fff;">' +
      (p.img ? '<img src="' + esc(p.img) + '" alt="' + esc(p.name) + '" loading="lazy" style="width:100%;height:180px;object-fit:cover;border-radius:4px;">'
             : '<div style="width:100%;height:180px;border-radius:4px;background:#2b2927;display:flex;align-items:center;justify-content:center;color:#FE980F;font-size:32px;"><i class="fas fa-gift"></i></div>') +
      '<h4 style="margin:10px 0 5px;font-size:15px;color:#fff;">' + esc(p.name) + '</h4>' +
      '<p style="font-size:12px;color:#b3b1ae;margin-bottom:8px;"><i class="fas fa-store" style="color:#FE980F;"></i> ' + esc(p.vendor) + '</p>' +
      '<div class="price" style="color:#FE980F;font-weight:bold;font-size:16px;margin-bottom:12px;">' + money(p.price) + '</div>' +
      (out ? '<button class="btn" disabled style="background:#555;color:#ccc;width:100%;margin-bottom:8px;font-weight:bold;">Out of stock</button>'
           : '<button class="btn" style="background:#FE980F;color:#0D0D0D;width:100%;margin-bottom:8px;font-weight:bold;" onclick="addToCart(' + Number(p.id) + ')">Add to Cart</button>') +
      '<div style="display:flex;justify-content:space-between;align-items:center;margin-top:8px;">' +
        '<a href="product-details.html?id=' + Number(p.id) + '" style="font-size:12px;color:#FE980F;text-decoration:none;"><i class="fas fa-sliders-h"></i> Customize</a>' +
        '<i class="far fa-heart" style="color:#FE980F;cursor:pointer;font-size:16px;" title="Add to Wishlist" onclick="addToWishlist()"></i>' +
      '</div></div>';
  }).join('');
}

// ---------- cart ----------
if (cartToggle) cartToggle.addEventListener('click', function () { shoppingCart = readCart(); updateCartDisplay(); cartSidebar.classList.add('open'); });
if (cartClose) cartClose.addEventListener('click', function () { cartSidebar.classList.remove('open'); });

function keyOf(it) { return String(it.key || it.productId || it.id); }

function saveAndRefreshCart() {
  writeCart(shoppingCart);
  updateCartDisplay();
}

// Add one item (or +1 if already in cart). Custom items pass their own unique key.
// FIX: re-read the saved cart first, so changes made on another page are never overwritten.
window.addCartItem = function (item) {
  shoppingCart = readCart();
  if (item.productId == null && item.id != null) item.productId = item.id; // checkout reads productId || id
  const k = keyOf(item);
  const found = shoppingCart.filter(function (c) { return keyOf(c) === k; })[0];
  if (found) { found.qty = (found.qty || 1) + 1; }
  else { item.qty = item.qty || 1; shoppingCart.push(item); }
  saveAndRefreshCart();
};

window.addToCart = function (id) {
  const p = findProduct(id);
  if (!p) { toast('This product is not available'); return; }
  if (p.stock <= 0) { toast('Out of stock'); return; }
  window.addCartItem({ id: p.id, productId: p.id, name: p.name, price: p.price, img: p.img, vendor: p.vendor, category: p.category });
  if (cartSidebar) cartSidebar.classList.add('open');
  toast('Added to cart');
};

window.ksQty = function (index, delta) {
  shoppingCart = readCart();
  const it = shoppingCart[index]; if (!it) return;
  it.qty = Math.max(1, (it.qty || 1) + delta);
  saveAndRefreshCart();
};

window.removeItem = function (index) {
  shoppingCart = readCart();
  shoppingCart.splice(index, 1);
  saveAndRefreshCart();
};

window.addToWishlist = function () {
  wishlistCount++;
  localStorage.setItem('kisakali_wishlist_count', wishlistCount);
  if (wishlistCounterEl) wishlistCounterEl.textContent = wishlistCount;
  toast('Added to your Wishlist');
};

// Cart drawer: grouped by vendor, with quantities and delivery fee
function updateCartDisplay() {
  const count = shoppingCart.reduce(function (a, i) { return a + (i.qty || 1); }, 0);
  if (cartCount) cartCount.textContent = count;
  if (wishlistCounterEl) wishlistCounterEl.textContent = wishlistCount;
  if (!cartItemsContainer) return;
  if (!shoppingCart.length) {
    cartItemsContainer.innerHTML = '<p class="empty-msg" style="color:#b3b1ae;text-align:center;padding:20px;">Your cart is empty.</p>';
    if (cartTotalAmount) cartTotalAmount.textContent = "0 TSh";
    return;
  }
  const groups = {}, vendors = []; let sub = 0;
  shoppingCart.forEach(function (it, i) {
    const v = it.vendor || "Other";
    if (!groups[v]) { groups[v] = []; vendors.push(v); }
    groups[v].push([it, i]);
    sub += it.price * (it.qty || 1);
  });
  let html = vendors.map(function (v) {
    return '<div class="ks-vendor-title"><i class="fas fa-store"></i> ' + esc(v) + '</div>' +
      groups[v].map(function (p) {
        const it = p[0], i = p[1], q = it.qty || 1;
        return '<div class="ks-cart-row"><div class="ks-cart-info"><h5>' + esc(it.name) + '</h5>' +
          (it.custom ? '<small>Customized gift</small>' : '') +
          '<span class="ks-price">' + money(it.price * q) + '</span></div>' +
          '<div class="ks-qty"><button onclick="ksQty(' + i + ',-1)">-</button><b>' + q + '</b>' +
          '<button onclick="ksQty(' + i + ',1)">+</button>' +
          '<i class="fas fa-trash-alt" onclick="removeItem(' + i + ')" title="Remove"></i></div></div>';
      }).join("");
  }).join("");
  const fee = deliveryFee(vendors.length);
  html += '<div class="ks-sum"><span>Delivery (' + vendors.length + ' vendor' + (vendors.length > 1 ? 's' : '') + ')</span><span>' + money(fee) + '</span></div>';
  cartItemsContainer.innerHTML = html;
  if (cartTotalAmount) cartTotalAmount.textContent = money(sub + fee);
}

// FIX: keep the cart in step when another tab/page changes it, or when the browser Back button restores this page
window.addEventListener('storage', function (e) {
  if (e.key === CART_KEY) { shoppingCart = readCart(); updateCartDisplay(); }
});
window.addEventListener('pageshow', function () { shoppingCart = readCart(); updateCartDisplay(); });

// ---------- start ----------
updateCartDisplay();
renderProducts('all'); // shows "Loading products..." until the database answers

function urlFilter() { return new URLSearchParams(location.search).get('cat') || 'all'; }

loadCatalog().then(function () {
  publishCatalog();
  updateCartDisplay(); // delivery fee may have changed
  renderProducts(productList ? (currentFilter !== 'all' ? currentFilter : urlFilter()) : 'all');
  const s = new URLSearchParams(location.search).get('q');
  const sb = document.getElementById('search-bar');
  if (sb && s) { sb.value = s; if (typeof searchProducts === 'function') searchProducts(); }
});
