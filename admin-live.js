/* KISAKALI admin: live operations backed by Supabase.
   Needs: supabase-config.js + api.js loaded, and a signed-in user whose profile role is 'admin'.
   Every write goes through a database function that re-checks the admin role. */
(function () {
  var sb = window.KAPI && KAPI.live ? KAPI.sb : null;
  var root = null, tab = "dash", filter = "action", term = "", busy = false;
  var CACHE = { riders: [] };
  var CTX = { tier: "super", brand: "kisakali" };
  var PERMS = {};
  var PERMS_READY = false;

  function isSuper() { return CTX.tier === "super"; }
  function can(permission) {
    return isSuper() || PERMS[permission] === true;
  }

  function esc(s) {
    return String(s == null ? "" : s)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;")
      .replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  }

  function money(n) {
    return Number(n || 0).toLocaleString("en-US") + " TSh";
  }

  function when(d) {
    try {
      return new Date(d).toLocaleString("en-GB", {
        day: "numeric", month: "short",
        hour: "2-digit", minute: "2-digit"
      });
    } catch (e) { return d || ""; }
  }

  function toast(m) {
    var t = document.getElementById("toast");
    if (!t) return;
    t.textContent = m;
    t.style.display = "block";
    clearTimeout(toast.h);
    toast.h = setTimeout(function () {
      t.style.display = "none";
    }, 3000);
  }

  function q(r) {
    if (r.error) throw new Error(r.error.message);
    return r.data || [];
  }

  function badge(t, cls) {
    return '<span class="badge ' + (cls || "badge-pending") + '">' +
      esc(t) + "</span>";
  }

  function payBadge(s) {
    return badge("Payment: " + s,
      s === "Verified" ? "badge-verified" :
      s === "Pending" ? "badge-pending" : "badge-bad");
  }

  function box(title, inner) {
    return '<div class="section-box"><h3 class="sub-title">' +
      '<i class="fas fa-bolt"></i> ' + title + "</h3>" + inner + "</div>";
  }

  function empty(t) {
    return '<p class="note-small" style="margin:0">' + esc(t) + "</p>";
  }

  function btn(act, key, label, extra) {
    return '<button class="btn" style="padding:6px 12px;font-size:12px;' +
      'margin:4px 6px 0 0;' + (extra || "") +
      '" data-la="' + act + '" data-k="' + esc(key) + '">' +
      label + "</button>";
  }

  var GREY = "background:#666;color:#fff;";
  var PCHANNELS = ["Vodacom M-Pesa", "Tigo Pesa", "Airtel Money", "HaloPesa", "CRDB / NMB Bank Transfer"];

  var SW = {
    "Dashboard": "Dashibodi",
    "Orders & payments": "Oda na malipo",
    "Applications": "Maombi",
    "Products": "Bidhaa",
    "Withdrawals": "Utoaji pesa",
    "Commission": "Kamisheni",
    "Messages": "Ujumbe",
    "Settings & audit": "Mipangilio na kumbukumbu",
    "Platform overview": "Muhtasari wa jukwaa",
    "IMPULSE Admin": "Msimamizi wa IMPULSE"
  };

  function t(x) {
    var l = "en";
    try { l = localStorage.getItem("kLang") || "en"; } catch (e) {}
    return l === "sw" && SW[x] ? SW[x] : x;
  }

  function cnt(table, f) {
    var qy = sb.from(table).select("id", {
      count: "exact", head: true
    });
    return (f ? f(qy) : qy).then(function (r) {
      if (r.error) throw new Error(r.error.message);
      return r.count || 0;
    });
  }

  function sum(rows, f) {
    return rows.reduce(function (a, r) {
      return a + (Number(f(r)) || 0);
    }, 0);
  }

  /* ---------- Rider delivery-fee helpers ---------- */

  function isDelivered(o) {
    return o.status === "Delivered" || !!o.delivered_at;
  }

  function riderPaid(o) {
    return String(o.rider_payment_status || "")
      .trim().toLowerCase() === "paid";
  }

  function isPickup(o) {
    return String(o.address || "")
      .indexOf("PICKUP - customer collects") === 0;
  }

  function riderDue(o) {
    return !isPickup(o) && isDelivered(o) && !riderPaid(o);
  }

  /* ---------- Orders ---------- */

  function orderQuery() {
    var oq = sb.from("orders").select(
      "order_number,status,payment_status,payment_channel,payment_ref," +
      "customer_name,customer_phone,address,recipient_name,total," +
      "delivery_date,delivery_time,is_anonymous,created_at,delivery_fee," +
      "delivered_at,rider_payment_status,rider_paid_at," +
      "driver:drivers!orders_driver_id_fkey(vehicle_info,profile:profiles(full_name))," +
      "sub_orders(status,vendor:vendors(shop_name)),order_items(name,qty)"
    );

    var w = term.replace(/[%,()*\\]/g, " ").trim();

    if (w) {
      oq = oq.or(
        "order_number.ilike.%" + w +
        "%,customer_name.ilike.%" + w +
        "%,customer_phone.ilike.%" + w + "%"
      );
    }

    return oq.order("created_at", {
      ascending: false
    }).limit(60);
  }

  function loadOrders() {
    return Promise.all([
      orderQuery(),
      sb.from("drivers")
        .select("id,vehicle_info,profile:profiles(full_name,phone)")
        .eq("verification_status", "verified")
    ]).then(function (r) {
      var rows = q(r[0]);
      CACHE.riders = q(r[1]);

      var needs = function (o) {
        return o.payment_status === "Pending" ||
          (o.payment_status === "Verified" &&
            o.status === "Arranging" && !isPickup(o)) ||
          riderDue(o);
      };

      var list = (filter === "action" && !term)
        ? rows.filter(needs) : rows;

      var head =
        '<select id="la-filter" class="ta" style="width:auto;margin-bottom:10px">' +
        '<option value="action"' +
        (filter === "action" ? " selected" : "") +
        '>Needs action (' + rows.filter(needs).length + ')</option>' +
        '<option value="all"' +
        (filter === "all" ? " selected" : "") +
        '>All recent orders</option></select> ' +
        btn("reload", "", '<i class="fas fa-sync"></i> Refresh', GREY);

      if (term) {
        head = '<p class="note-small" style="margin:0 0 10px">' +
          'Search results for <b>' + esc(term) + "</b> " +
          btn("clear-search", "", "Clear search", GREY) +
          "</p>" + head;
      }

      if (!list.length) {
        return head + empty(
          term ? "No orders match your search." :
          filter === "action" ?
            "Nothing needs your action right now." :
            "No orders yet."
        );
      }

      return head + list.map(function (o) {
        var vend = (o.sub_orders || []).map(function (s) {
          return esc(s.vendor && s.vendor.shop_name) +
            " (" + esc(s.status) + ")";
        }).join(", ");

        var items = (o.order_items || []).map(function (i) {
          return esc(i.name) + " x" + i.qty;
        }).join(", ");

        var rider = o.driver
          ? esc((o.driver.profile && o.driver.profile.full_name) ||
            o.driver.vehicle_info || "Rider")
          : "-";

        var h =
          '<div style="border:1px solid #444;border-radius:6px;' +
          'padding:14px;margin-bottom:12px;background:#262423">' +
          "<b>" + esc(o.order_number) + "</b> " +
          badge(o.status, o.status === "Delivered"
            ? "badge-verified" : "badge-pending") + " " +
          payBadge(o.payment_status) +
          '<p class="note-small" style="color:#ddd">' +
          esc(o.customer_name) + " &middot; " +
          esc(o.customer_phone) +
          (o.is_anonymous
            ? " &middot; <b>SURPRISE (sender hidden)</b>" : "") +
          "<br>To: " + esc(o.recipient_name || o.customer_name) +
          ", " + esc(o.address) +
          "<br>" + esc(o.delivery_date || "") + " " +
          esc(o.delivery_time || "") +
          "<br>Items: " + items +
          "<br>Shops: " + vend +
          "<br>Rider: " + rider +
          " &middot; Total: <b>" + money(o.total) +
          "</b> via " + esc(o.payment_channel) +
          (o.payment_ref ? " (ref " + esc(o.payment_ref) + ")" : "") +
          " &middot; " + when(o.created_at) + "</p>";

        if (o.payment_status === "Pending") {
          h += '<input class="ta" id="ref-' +
            esc(o.order_number) +
            '" placeholder="Mobile-money transaction reference" ' +
            'style="max-width:320px;margin-right:6px">' +
            btn("verify", o.order_number, "Verify payment") +
            btn("reject", o.order_number, "Reject payment", GREY);

        } else if (
          o.payment_status === "Verified" &&
          o.status === "Arranging" &&
          isPickup(o)
        ) {
          h += '<p class="note-small"><i class="fas fa-store"></i> ' +
            'Pickup order. Ready for the customer to collect ' +
            'from the vendor. No rider needed.</p>';

        } else if (
          o.payment_status === "Verified" &&
          o.status === "Arranging"
        ) {
          h += '<select class="ta" id="rider-' +
            esc(o.order_number) +
            '" style="max-width:320px;display:inline-block">' +
            '<option value="">Choose a rider...</option>' +
            CACHE.riders.map(function (d) {
              return '<option value="' + esc(d.id) + '">' +
                esc((d.profile && d.profile.full_name) || "Rider") +
                " - " + esc(d.vehicle_info || "") + "</option>";
            }).join("") + "</select> " +
            btn("assign", o.order_number, "Assign rider");

          if (!CACHE.riders.length) {
            h += '<p class="note-small">No verified riders yet. ' +
              'Approve a rider application first.</p>';
          }

        } else if (
          o.payment_status === "Verified" &&
          o.status === "Preparing"
        ) {
          h += '<p class="note-small">Waiting for the vendor(s) ' +
            'to mark their part as ready.</p>';
        }

        if (isDelivered(o) && isPickup(o)) {
          h += '<p class="note-small" style="color:#ddd">' +
            '<i class="fas fa-store"></i> ' +
            'Collected by the customer from the vendor.</p>';

        } else if (isDelivered(o)) {
          if (riderPaid(o)) {
            h += '<p class="note-small" style="color:#ddd">' +
              '<i class="fas fa-motorcycle" ' +
              'style="color:var(--accent,#FE980F)"></i> ' +
              badge("Rider fee paid", "badge-verified") +
              (o.rider_paid_at ? " &middot; " +
                when(o.rider_paid_at) : "") + "</p>";
          } else {
            h += '<p class="note-small" style="color:#ddd">' +
              '<i class="fas fa-motorcycle" ' +
              'style="color:var(--accent,#FE980F)"></i> ' +
              'Delivered. The customer paid cash to the rider, ' +
              'and the rider keeps the delivery fee' +
              (o.delivery_fee != null
                ? " of <b>" + money(o.delivery_fee) + "</b>" : "") +
              " from that cash.</p>" +
              btn("rider-paid", o.order_number,
                "Confirm rider took the delivery fee");
          }
        }

        return h + "</div>";
      }).join("");
    });
  }

  /* ---------- Applications ---------- */

  function loadApps() {
    return Promise.all([
      sb.from("vendor_applications")
        .select("id,shop_name,owner_name,phone,category,area,created_at")
        .eq("status", "pending").order("created_at"),

      sb.from("driver_applications")
        .select("id,full_name,phone,vehicle_info,area,created_at")
        .eq("status", "pending").order("created_at")
    ]).then(function (r) {
      var v = q(r[0]), d = q(r[1]);

      var vh = v.length ? v.map(function (a) {
        return '<div class="alert-item"><span><b>' +
          esc(a.shop_name) + "</b> &middot; " +
          esc(a.owner_name) + " &middot; " +
          esc(a.phone) + "<br><small>" +
          esc(a.category || "") + " &middot; " +
          esc(a.area || "") + " &middot; " +
          when(a.created_at) + "</small></span><span>" +
          btn("vapp-ok", a.id, "Approve") +
          btn("vapp-no", a.id, "Reject", GREY) +
          "</span></div>";
      }).join("") : empty("No vendor applications waiting.");

      var dh = d.length ? d.map(function (a) {
        return '<div class="alert-item"><span><b>' +
          esc(a.full_name) + "</b> &middot; " +
          esc(a.phone) + "<br><small>" +
          esc(a.vehicle_info) + " &middot; " +
          esc(a.area || "") + " &middot; " +
          when(a.created_at) + "</small></span><span>" +
          btn("dapp-ok", a.id, "Approve") +
          btn("dapp-no", a.id, "Reject", GREY) +
          "</span></div>";
      }).join("") : empty("No rider applications waiting.");

      return box("Vendor applications", vh) +
        box("Rider applications", dh);
    });
  }

  /* ---------- Products ---------- */

  function loadProducts() {
    return sb.from("products")
      .select("id,title,price,stock,image,description,vendor:vendors(shop_name)")
      .eq("status", "submitted").order("created_at")
      .then(function (r) {
        var p = q(r);

        return box("Products waiting for review", p.length
          ? p.map(function (x) {
            return '<div class="alert-item" style="flex-wrap:wrap">' +
              (x.image
                ? '<img src="' + esc(x.image) +
                  '" alt="" style="width:64px;height:64px;' +
                  'object-fit:cover;border-radius:4px">'
                : '<span class="note-small">No photo</span>') +
              '<span style="flex:1;min-width:180px"><b>' +
              esc(x.title) + "</b> &middot; " +
              money(x.price) + " &middot; stock " + x.stock +
              "<br><small>" +
              esc(x.vendor && x.vendor.shop_name) +
              (x.description ? " &middot; " +
                esc(x.description) : "") +
              "</small></span><span>" +
              '<input class="ta" id="rr-' + esc(x.id) +
              '" placeholder="Reason if rejecting" ' +
              'style="width:200px;display:inline-block"> ' +
              btn("prod-ok", x.id, "Approve") +
              btn("prod-no", x.id, "Reject", GREY) +
              "</span></div>";
          }).join("") : empty("No products waiting for review."));
      });
  }

  /* ---------- Withdrawals ---------- */

  function loadPayouts() {
    return sb.from("payout_requests")
      .select("id,amount,status,reference,created_at,vendor:vendors(shop_name)")
      .order("created_at", { ascending: false }).limit(50)
      .then(function (r) {
        var p = q(r);

        return box("Vendor withdrawals", p.length
          ? p.map(function (x) {
            var pending = x.status === "Pending";

            return '<div class="alert-item"><span><b>' +
              esc(x.vendor && x.vendor.shop_name) +
              "</b> &middot; " + money(x.amount) + " " +
              badge(x.status, x.status === "Paid"
                ? "badge-verified" :
                pending ? "badge-pending" : "badge-bad") +
              "<br><small>" + when(x.created_at) +
              (x.reference ? " &middot; ref " +
                esc(x.reference) : "") +
              "</small></span><span>" +
              (pending
                ? '<input class="ta" id="pref-' + esc(x.id) +
                  '" placeholder="Payment reference" ' +
                  'style="width:170px;display:inline-block"> ' +
                  btn("pay-ok", x.id, "Mark paid") +
                  btn("pay-no", x.id, "Reject", GREY)
                : "") +
              "</span></div>";
          }).join("") : empty("No withdrawal requests yet.")) +
          '<p class="note-small">Pay the vendor from your mobile-money ' +
          'account first, then type the transaction reference and ' +
          'press "Mark paid".</p>';
      });
  }

  /* ---------- Commission owed by vendors (direct payments) ---------- */

  function loadCommission() {
    return sb.rpc("admin_commission_dues", { p_status: null }).then(function (r) {
      if (r.error) throw new Error(r.error.message);
      var d = r.data || {}, rows = d.rows || [];

      return box("Commission owed by vendors",
        '<p style="margin:0 0 10px">Total still due: <b style="color:#FE980F">' +
        money(d.due_total) + "</b></p>" +
        (rows.length ? rows.map(function (x) {
          var due = x.status === "Due";
          return '<div class="alert-item"><span><b>' + esc(x.shop_name) +
            "</b> &middot; order " + esc(x.order_number) + " &middot; " +
            money(x.amount) + " " +
            badge(x.status, due ? "badge-pending" : "badge-verified") +
            "<br><small>" + money(x.base_amount) + " x " + esc(x.rate) + "%" +
            (x.phone ? " &middot; " + esc(x.phone) : "") +
            " &middot; " + when(x.created_at) +
            (x.paid_ref ? " &middot; ref " + esc(x.paid_ref) : "") +
            "</small></span><span>" +
            (due
              ? '<input class="ta" id="cref-' + esc(x.id) +
                '" placeholder="Payment reference" style="width:170px;display:inline-block"> ' +
                btn("comm-paid", x.id, "Mark paid")
              : "") +
            "</span></div>";
        }).join("") : empty("No commission records yet.")) +
        '<p class="note-small">These are vendors who collect payment themselves. ' +
        "Collect the commission from the vendor first, then type the transaction " +
        'reference and press "Mark paid".</p>');
    });
  }

  /* ---------- Settings and audit ---------- */

  function loadSettings() {
    var settingsRequest = can("settings")
      ? sb.from("settings").select("key,value")
      : Promise.resolve({ data: [] });
    var auditRequest = can("audit")
      ? sb.from("audit_logs")
        .select("action,detail,created_at")
        .order("created_at", { ascending: false }).limit(40)
      : Promise.resolve({ data: [] });

    var platRequest = can("settings")
      ? sb.rpc("admin_get_platform_payment").then(function (x) { return x.error ? null : (x.data || []); }, function () { return null; })
      : Promise.resolve(null);

    var waRequest = can("settings")
      ? sb.rpc("admin_get_whatsapp_group_link").then(function (x) { return x.error ? null : (x.data || ""); }, function () { return null; })
      : Promise.resolve(null);

    return Promise.all([settingsRequest, auditRequest, platRequest, waRequest]).then(function (r) {
      var html = "";

      if (can("settings")) {
        var settings = {};
        q(r[0]).forEach(function (x) {
          settings[x.key] = x.value;
        });

        html += box("Commission and fees",
          '<div class="comm-form">Commission % ' +
          '<input id="la-comm" type="number" min="0" max="50" ' +
          'step="0.5" value="' +
          esc(settings.commission_percent || "10") + '"> ' +
          btn("comm", "", "Save") + "</div>" +
          '<p class="note-small">New orders use the rate at the time ' +
          'they are placed. Delivery fee per vendor: <b>' +
          money(settings.delivery_fee_per_vendor) +
          "</b> (change it in Supabase &gt; Table Editor &gt; settings).</p>");
      }

      if (can("settings")) {
        if (r[3] === null) {
          html += box("WhatsApp group link",
            empty("Not available yet. Run kisakali_whatsapp_group.sql in Supabase first."));
        } else {
          html += box("WhatsApp group link",
            '<p class="note-small" style="margin-top:0">Shows a "Join our WhatsApp group" button on every page and portal. ' +
            "In WhatsApp open the group &gt; Group info &gt; Invite via link, copy it and paste it here. " +
            "Leave it empty and save to hide the button.</p>" +
            '<input class="ta" id="wa-group-link" placeholder="https://chat.whatsapp.com/XXXXXXXXXX" ' +
            'style="width:100%;max-width:420px;display:block" value="' + esc(r[3]) + '"> ' +
            btn("wa-group-save", "", "Save link"));
        }
      }

      if (can("settings")) {
        var plat = r[2], have = {};
        if (plat === null) {
          html += box("Platform payment numbers",
            empty("Not available yet. Run kisakali_payments.sql in Supabase first."));
        } else {
          plat.forEach(function (c) { have[c.channel] = c; });
          html += box("Platform payment numbers",
            '<p class="note-small" style="margin-top:0">Customers see these when they pay ' +
            "KISAKALI (vendors who chose &quot;platform&quot;). Leave a row empty to hide it.</p>" +
            PCHANNELS.map(function (n, i) {
              var c = have[n] || {};
              return '<div style="margin:6px 0">' + esc(n) + '<br>' +
                '<input class="ta" id="pp-n-' + i + '" placeholder="Number" ' +
                'style="width:170px;display:inline-block" value="' + esc(c.number) + '"> ' +
                '<input class="ta" id="pp-a-' + i + '" placeholder="Account name" ' +
                'style="width:200px;display:inline-block" value="' + esc(c.name) + '"></div>';
            }).join("") + btn("pp-save", "", "Save payment numbers"));
        }
      }

      if (can("audit")) {
        var logs = q(r[1]);
        html += box("Audit log (latest 40)", logs.length
          ? '<div style="overflow-x:auto"><table class="table-custom">' +
            '<thead><tr><th>Time</th><th>Action</th>' +
            '<th>Detail</th></tr></thead><tbody>' +
            logs.map(function (l) {
              return "<tr><td>" + when(l.created_at) +
                "</td><td>" + esc(l.action) +
                "</td><td>" + esc(l.detail || "") +
                "</td></tr>";
            }).join("") +
            "</tbody></table></div>"
          : empty("No activity yet."));
      }

      return html || empty("You do not have settings or audit access.");
    });
  }

  /* ---------- Dashboard ---------- */

  function loadDash() {
    return Promise.all([
      cnt("profiles", function (x) {
        return x.eq("role", "customer");
      }),
      cnt("vendors", function (x) {
        return x.eq("approval_status", "approved");
      }),
      cnt("drivers", function (x) {
        return x.eq("verification_status", "verified");
      }),
      cnt("products", function (x) {
        return x.eq("status", "published").eq("is_active", true);
      }),
      cnt("orders"),
      cnt("orders", function (x) {
        return x.eq("payment_status", "Pending");
      }),
      cnt("orders", function (x) {
        return x.eq("status", "Delivered");
      }),
      cnt("orders", function (x) {
        return x.eq("status", "Cancelled");
      }),
      cnt("vendor_applications", function (x) {
        return x.eq("status", "pending");
      }),
      cnt("driver_applications", function (x) {
        return x.eq("status", "pending");
      }),
      cnt("products", function (x) {
        return x.eq("status", "submitted");
      }),
      sb.from("payout_requests").select("amount").eq("status", "Pending"),
      sb.from("orders")
        .select("subtotal,delivery_fee,total,commission_percent,status,payment_status")
        .in("payment_status", ["Verified", "Pending"]).limit(5000)
    ]).then(function (r) {
      var wd = q(r[11]), od = q(r[12]);

      var ver = od.filter(function (o) {
        return o.payment_status === "Verified";
      });

      var pend = od.filter(function (o) {
        return o.payment_status === "Pending";
      });

      var comm = sum(
        ver.filter(function (o) {
          return o.status === "Delivered";
        }),
        function (o) {
          return o.subtotal * o.commission_percent / 100;
        }
      );

      function card(label, val, cls) {
        return '<div class="stat-card"><h5>' + label +
          '</h5><div class="num ' + (cls || "") +
          '">' + val + "</div></div>";
      }

      function todo(label, n, key) {
        return n
          ? '<div class="alert-item"><span>' + n + " " +
            label + '</span><span>' +
            btn("tab", key, "Open") +
            "</span></div>"
          : "";
      }

      var tasks =
        todo("order(s) waiting for payment verification", r[5], "orders") +
        todo("vendor application(s) waiting", r[8], "apps") +
        todo("rider application(s) waiting", r[9], "apps") +
        todo("product(s) waiting for review", r[10], "products") +
        (can("withdrawals")
          ? todo("withdrawal request(s) waiting", wd.length, "payouts")
          : "");

      return box(t("Platform overview"),
        '<div class="stat-grid">' +
        card("Registered customers", r[0]) +
        card("Approved vendors", r[1]) +
        card("Verified riders", r[2]) +
        card("Published products", r[3]) +
        card("Total orders", r[4]) +
        card("Waiting for payment", r[5], "orange") +
        card("Delivered orders", r[6], "green") +
        card("Cancelled orders", r[7], "red") +
        card("Verified sales",
          money(sum(ver, function (o) { return o.total; }))) +
        card("Delivery fees (verified)",
          money(sum(ver, function (o) { return o.delivery_fee; }))) +
        (can("settings")
          ? card("Commission (delivered)", money(comm), "orange")
          : "") +
        card("Unverified payments",
          money(sum(pend, function (o) { return o.total; })), "orange") +
        (can("withdrawals")
          ? card("Pending withdrawals",
            money(sum(wd, function (w) { return w.amount; })), "orange")
          : "") +
        "</div>" +
        (od.length >= 5000
          ? '<p class="note-small">Money totals use the latest 5,000 orders.</p>'
          : "")) +
        box("Needs your attention",
          tasks || empty("Nothing is waiting for you."));
    });
  }

  /* ---------- Message templates ---------- */

  var TPL = [
    ["Order confirmed",
      "Habari {name}, oda yako {order} imepokelewa. Asante kwa kuchagua Kisakali Shopping Mall!",
      "Hello {name}, your order {order} has been received. Thank you for choosing Kisakali Shopping Mall!"],
    ["Payment received",
      "Malipo ya {amount} TSh yamethibitishwa kwa oda {order}.",
      "Your payment of {amount} TSh for order {order} is confirmed."],
    ["Rider on the way",
      "Habari {name}, dereva {rider} yuko njiani na oda {order}. Atafika {eta}.",
      "Hello {name}, rider {rider} is on the way with order {order}. Arrival: {eta}."],
    ["Delivered",
      "Oda {order} imefikishwa. Asante! Tafadhali tupe maoni yako.",
      "Order {order} has been delivered. Thank you! Please share your feedback."],
    ["Refund update",
      "Ombi lako la kurejeshewa pesa kwa oda {order} linashughulikiwa.",
      "Your refund request for order {order} is being processed."]
  ];

  function brandName(x) {
    return String(x).replace(
      /Kisakali Shopping Mall/g,
      (window.KBRAND && KBRAND.current.full) ||
        "Kisakali Shopping Mall"
    );
  }

  function loadMessages() {
    return Promise.resolve(box(
      "WhatsApp & SMS templates (Kiswahili / English)",
      TPL.map(function (x, i) {
        x = [x[0], brandName(x[1]), brandName(x[2])];

        return '<div style="margin-bottom:16px"><b ' +
          'style="color:var(--accent,#FE980F)">' +
          esc(x[0]) + '</b><div style="display:grid;' +
          'grid-template-columns:repeat(auto-fit,minmax(240px,1fr));' +
          'gap:12px;margin-top:8px">' +
          '<div><small>Kiswahili</small>' +
          '<textarea id="tp-' + i + '-1" rows="3" class="ta">' +
          esc(x[1]) + "</textarea>" +
          btn("tp-copy", i + "-1", "Copy") + "</div>" +
          '<div><small>English</small>' +
          '<textarea id="tp-' + i + '-2" rows="3" class="ta">' +
          esc(x[2]) + "</textarea>" +
          btn("tp-copy", i + "-2", "Copy") +
          "</div></div></div>";
      }).join("") +
      '<p class="note-small">Copy a message, replace the {placeholders} ' +
      'and send it on WhatsApp or SMS yourself. Automatic sending ' +
      'is not connected.</p>'
    ));
  }

  /* ---------- IMPULSE Admin permissions ---------- */

  var IMPULSE_PERMS = [
    ["orders", "Orders & payments"],
    ["applications", "Applications"],
    ["products", "Products"],
    ["withdrawals", "Withdrawals"],
    ["settings", "Settings"],
    ["audit", "Audit log"]
  ];

  function loadImpulse() {
    if (!isSuper()) {
      return Promise.resolve(
        empty("Only the Kisakali Super Admin can manage IMPULSE Admin access.")
      );
    }

    return sb.from("profiles")
      .select("id,full_name,admin_tier,brand,permissions,emergency_access")
      .eq("role", "admin")
      .eq("admin_tier", "admin")
      .eq("brand", "impulse")
      .then(function (r) {
        var admins = q(r);

        if (!admins.length) {
          return box("IMPULSE Admin access",
            '<p style="margin:0"><b>IMPULSE Admin account has not been created yet.</b></p>' +
            '<p class="note-small">Create the partner account in Supabase Auth, ' +
            'then create/update its profiles row with role = admin, ' +
            'admin_tier = admin and brand = impulse. This panel will show ' +
            'its permissions here.</p>');
        }

        return box("IMPULSE Admin access",
          '<p class="note-small" style="margin-top:0">' +
          'Kisakali and IMPULSE use the same marketplace data. These ' +
          'permissions control which admin modules the IMPULSE partner ' +
          'can access.</p>' +

          admins.map(function (a) {
            var perms = a.permissions || {};
            var emergency = !!a.emergency_access;
            var id = String(a.id);

            var fields = IMPULSE_PERMS.map(function (p) {
              var checked = !!perms[p[0]];

              return '<label style="display:inline-flex;align-items:center;' +
                'gap:7px;background:#262423;border:1px solid #555;' +
                'border-radius:5px;padding:9px 11px;margin:4px 6px 4px 0;' +
                'min-width:145px;box-sizing:border-box">' +
                '<input type="checkbox" id="imp-' + esc(id) + '-' +
                p[0] + '" ' +
                (checked ? "checked " : "") +
                (emergency ? "disabled " : "") +
                'style="accent-color:var(--accent,#FE980F);' +
                'width:16px;height:16px"> ' +
                esc(p[1]) + "</label>";
            }).join("");

            var status = emergency
              ? badge("EMERGENCY ACCESS ACTIVE", "badge-pending")
              : badge("Normal limited access", "badge-verified");

            var actions = emergency
              ? btn("impulse-revoke", id,
                  "Revoke emergency access",
                  "background:#a32626;color:#fff;")
              : btn("impulse-save", id, "Save permissions") +
                btn("impulse-grant", id,
                  "Grant all-access emergency", GREY);

            return '<div style="border:1px solid #555;border-radius:7px;' +
              'padding:14px;margin:12px 0;background:#2b2927">' +

              '<div style="display:flex;justify-content:space-between;' +
              'gap:10px;flex-wrap:wrap;align-items:center">' +

              '<div><b>' + esc(a.full_name || "IMPULSE Admin") +
              '</b><p class="note-small" style="margin:4px 0 0">' +
              'Account ID: ' + esc(id) + '</p></div>' +
              status + '</div>' +

              '<p class="note-small">Normal permissions</p>' +
              '<div style="display:flex;flex-wrap:wrap">' +
              fields + '</div>' +

              (emergency
                ? '<p class="note-small" style="color:#ffbd66">' +
                  'All six modules are temporarily enabled. Normal ' +
                  'permission editing is locked until emergency access ' +
                  'is revoked. Revoking restores the saved permissions ' +
                  'from before the emergency grant.</p>'
                : '<p class="note-small">Emergency access enables all ' +
                  'six modules across the shared Kisakali + IMPULSE ' +
                  'marketplace. It stays active until you manually ' +
                  'revoke it.</p>') +

              '<div style="margin-top:8px">' +
              actions + '</div></div>';
          }).join("")
        );
      });
  }

  /* ---------- Navigation ---------- */

  var TABS = [
    ["dash", "fa-home", "Dashboard"],
    ["orders", "fa-shopping-bag", "Orders & payments"],
    ["apps", "fa-user-check", "Applications"],
    ["products", "fa-boxes", "Products"],
    ["payouts", "fa-wallet", "Withdrawals"],
    ["commission", "fa-percent", "Commission"],
    ["messages", "fa-comment-dots", "Messages"],
    ["settings", "fa-cog", "Settings & audit"],
    ["impulse", "fa-user-shield", "IMPULSE Admin"]
  ];

  function visibleTabs() {
    return TABS.filter(function (tb) {
      if (tb[0] === "dash" || tb[0] === "messages") return true;
      if (tb[0] === "orders") return can("orders");
      if (tb[0] === "apps") return can("applications");
      if (tb[0] === "products") return can("products");
      if (tb[0] === "payouts") return can("withdrawals");
      if (tb[0] === "commission") return can("orders");
      if (tb[0] === "settings") {
        return can("settings") || can("audit");
      }
      if (tb[0] === "impulse") return isSuper();
      return isSuper();
    });
  }

  var LOAD = {
    dash: loadDash,
    messages: loadMessages,
    orders: function () {
      return loadOrders().then(function (h) {
        return box("Orders", h);
      });
    },
    apps: loadApps,
    products: loadProducts,
    payouts: loadPayouts,
    commission: loadCommission,
    settings: loadSettings,
    impulse: loadImpulse
  };

  function draw() {
    if (!root) return;
    if (!PERMS_READY) return;

    if (!visibleTabs().some(function (tb) {
      return tb[0] === tab;
    })) {
      tab = "dash";
    }

    var B = window.KBRAND
      ? KBRAND.current
      : { name: "KISAKALI", sub: "SHOPPING MALL" };

    var banner =
      '<div class="section-box" style="padding:12px 16px;' +
      'border-left:4px solid var(--accent,var(--accent,#FE980F));' +
      'margin-bottom:14px"><b style="color:var(--accent,' +
      'var(--accent,#FE980F))">' +
      esc(B.name) + " " + esc(B.sub) +
      "</b> &middot; " +
      (isSuper() ? "Super Admin" : "Admin") +
      "</div>";

    var nav = banner +
      '<div class="tabs" style="margin-bottom:14px">' +
      visibleTabs().map(function (tb) {
        return '<button class="tab-btn' +
          (tab === tb[0] ? " on" : "") +
          '" data-la="tab" data-k="' + tb[0] + '">' +
          '<i class="fas ' + tb[1] + '"></i>' +
          esc(t(tb[2])) + "</button>";
      }).join("") + "</div>";

    root.innerHTML = nav +
      '<div id="la-body"><p class="note-small">Loading...</p></div>';

    var mine = tab;

    LOAD[mine]().then(function (html) {
      if (tab !== mine || !document.getElementById("la-body")) return;
      document.getElementById("la-body").innerHTML = html;
    }).catch(function (e) {
      console.error(e);
      var b = document.getElementById("la-body");

      if (b) {
        b.innerHTML =
          '<div class="section-box">' +
          '<p style="color:#ff4d4d;margin:0">Could not load: ' +
          esc(e.message) + '</p>' +
          '<p class="note-small">If this says "permission denied" or ' +
          '"does not exist", run the latest supabase_setup.sql again ' +
          'and make sure your account has the admin role.</p></div>';
      }
    });
  }

  /* ---------- Database actions ---------- */

  function call(name, args, okMsg) {
    if (busy) return;
    busy = true;

    sb.rpc(name, args).then(function (r) {
      busy = false;

      if (r.error) {
        toast(r.error.message);
        return;
      }

      toast(okMsg);
      draw();

    }, function (e) {
      busy = false;
      toast(e.message || "Something went wrong.");
    });
  }

  function val(id) {
    var e = document.getElementById(id);
    return e ? e.value.trim() : "";
  }

  function onClick(e) {
    var b = e.target.closest("[data-la]");
    if (!b || !root || !root.contains(b)) return;

    var a = b.getAttribute("data-la");
    var k = b.getAttribute("data-k");

    if (a === "tab") {
      tab = k;
      draw();

    } else if (a === "reload") {
      draw();

    } else if (a === "verify") {
      var ref = val("ref-" + k);
      if (!ref) {
        toast("Type the transaction reference first.");
        return;
      }
      call("admin_verify_payment",
        { p_number: k, p_ref: ref },
        "Payment verified");

    } else if (a === "reject") {
      if (confirm("Reject the payment for " + k + "?")) {
        call("admin_reject_payment",
          { p_number: k },
          "Payment rejected");
      }

    } else if (a === "assign") {
      var d = val("rider-" + k);
      if (!d) {
        toast("Choose a rider first.");
        return;
      }
      call("admin_assign_rider",
        { p_number: k, p_driver: d },
        "Rider assigned");

    } else if (a === "rider-paid") {
      if (confirm(
        "Confirm that the rider has taken his delivery fee " +
        "from the cash collected for " + k + "?"
      )) {
        call("admin_confirm_rider_paid",
          { p_number: k },
          "Rider payment confirmed");
      }

    } else if (a === "vapp-ok") {
      call("admin_review_vendor",
        { p_id: k, p_approve: true },
        "Vendor approved");

    } else if (a === "vapp-no") {
      if (confirm("Reject this vendor application?")) {
        call("admin_review_vendor",
          { p_id: k, p_approve: false },
          "Vendor rejected");
      }

    } else if (a === "dapp-ok") {
      call("admin_review_driver",
        { p_id: k, p_approve: true },
        "Rider approved");

    } else if (a === "dapp-no") {
      if (confirm("Reject this rider application?")) {
        call("admin_review_driver",
          { p_id: k, p_approve: false },
          "Rider rejected");
      }

    } else if (a === "prod-ok") {
      call("admin_review_product",
        { p_id: Number(k), p_approve: true },
        "Product approved");

    } else if (a === "prod-no") {
      var why = val("rr-" + k);
      if (!why) {
        toast("Type the reason for rejection first.");
        return;
      }
      call("admin_reject_product",
        { p_id: Number(k), p_reason: why },
        "Product rejected");

    } else if (a === "pay-ok") {
      var pr = val("pref-" + k);
      if (!pr) {
        toast("Type the payment reference first.");
        return;
      }
      call("admin_review_payout",
        { p_id: k, p_approve: true, p_ref: pr },
        "Marked as paid");

    } else if (a === "pay-no") {
      if (confirm("Reject this withdrawal request?")) {
        call("admin_review_payout",
          { p_id: k, p_approve: false, p_ref: null },
          "Withdrawal rejected");
      }

    } else if (a === "clear-search") {
      term = "";
      draw();

    } else if (a === "tp-copy") {
      var ta = document.getElementById("tp-" + k);
      if (ta) {
        ta.select();
        try {
          navigator.clipboard.writeText(ta.value);
        } catch (x) {
          document.execCommand("copy");
        }
        toast("Copied");
      }

    } else if (a === "comm") {
      if (!can("settings")) {
        toast("You do not have settings permission.");
        return;
      }
      var c = parseFloat(val("la-comm"));
      if (isNaN(c) || c < 0 || c > 50) {
        toast("Enter a rate between 0 and 50.");
        return;
      }
      call("admin_set_commission",
        { p_percent: c },
        "Commission saved");

    } else if (a === "wa-group-save") {
      if (!can("settings")) {
        toast("You do not have settings permission.");
        return;
      }
      var wl = val("wa-group-link");
      if (wl && !/^https:\/\/(chat\.whatsapp\.com|(www\.)?whatsapp\.com\/channel)\/[A-Za-z0-9_-]{10,60}(\?.*)?$/.test(wl)) {
        toast("Paste the full link, like https://chat.whatsapp.com/XXXXXXXXXX");
        return;
      }
      call("admin_set_whatsapp_group_link",
        { p_link: wl },
        wl ? "WhatsApp group link saved" : "WhatsApp group link removed");

    } else if (a === "comm-paid") {
      var cr = val("cref-" + k);
      if (!cr) {
        toast("Type the payment reference first.");
        return;
      }
      call("admin_mark_commission_paid",
        { p_id: Number(k), p_ref: cr },
        "Commission marked as paid");

    } else if (a === "pp-save") {
      if (!can("settings")) {
        toast("You do not have settings permission.");
        return;
      }
      var chs = [];
      PCHANNELS.forEach(function (n, i) {
        var num = val("pp-n-" + i), nm = val("pp-a-" + i);
        if (num || nm) chs.push({ channel: n, number: num, name: nm });
      });
      call("admin_set_platform_payment",
        { p: { channels: chs } },
        "Payment numbers saved");

    /* ---------- IMPULSE Admin actions ---------- */

    } else if (a === "impulse-save") {
      if (!isSuper()) {
        toast("Only the Kisakali Super Admin can do this.");
        return;
      }

      var permissions = {};

      IMPULSE_PERMS.forEach(function (p) {
        var input = document.getElementById(
          "imp-" + k + "-" + p[0]
        );
        permissions[p[0]] = !!(input && input.checked);
      });

      if (confirm("Save these six IMPULSE Admin permissions?")) {
        call("admin_set_impulse_permissions", {
          p_admin_id: k,
          p_permissions: permissions
        }, "IMPULSE Admin permissions saved");
      }

    } else if (a === "impulse-grant") {
      if (!isSuper()) {
        toast("Only the Kisakali Super Admin can do this.");
        return;
      }

      if (confirm(
        "Grant emergency ALL-ACCESS to this IMPULSE Admin? " +
        "This enables all six modules across the entire shared " +
        "Kisakali + IMPULSE marketplace. Access will remain active " +
        "until you manually revoke it."
      )) {
        call("grant_impulse_emergency_access", {
          p_admin_id: k
        }, "Emergency all-access granted. Remember to revoke it manually.");
      }

    } else if (a === "impulse-revoke") {
      if (!isSuper()) {
        toast("Only the Kisakali Super Admin can do this.");
        return;
      }

      if (confirm(
        "Revoke emergency access now? The IMPULSE Admin's previous " +
        "limited permissions will be restored."
      )) {
        call("revoke_impulse_emergency_access", {
          p_admin_id: k
        }, "Emergency access revoked; previous permissions restored");
      }
    }
  }

  function onChange(e) {
    if (e.target && e.target.id === "la-filter") {
      filter = e.target.value;
      draw();
    }
  }

  window.kLiveSearch = function (text) {
    term = String(text || "").trim();
    tab = "orders";
    filter = "all";
    draw();
  };

  window.kLiveRedraw = function () {
    draw();
  };

  window.kLiveMount = function (el, ctx) {
    root = el;

    if (ctx) {
      CTX = {
        tier: ctx.tier === "super" ? "super" : "admin",
        brand: ctx.brand || "kisakali"
      };
    }

    /* Never carry permissions across account/session changes. */
    PERMS = {};
    PERMS_READY = false;

    if (!sb) {
      el.innerHTML =
        '<div class="section-box"><p style="margin:0">' +
        'The database is not connected. Fill in supabase-config.js first.' +
        '</p></div>';
      return;
    }

    el.onclick = onClick;
    el.onchange = onChange;

    if (isSuper()) {
      PERMS = {
        orders: true, applications: true, products: true,
        withdrawals: true, settings: true, audit: true
      };
      PERMS_READY = true;
      draw();
      return;
    }

    el.innerHTML =
      '<div class="section-box"><p class="note-small">Loading your admin permissions...</p></div>';

    sb.rpc("my_permissions").then(function (r) {
      if (r.error) throw new Error(r.error.message);
      PERMS = r.data || {};
      if (Array.isArray(PERMS)) PERMS = PERMS[0] || {};
      PERMS_READY = true;
      draw();
    }).catch(function (e) {
      console.error(e);
      el.innerHTML =
        '<div class="section-box"><p style="color:#ff4d4d;margin:0">' +
        'Could not load admin permissions: ' + esc(e.message) +
        '</p></div>';
    });
  };

})();