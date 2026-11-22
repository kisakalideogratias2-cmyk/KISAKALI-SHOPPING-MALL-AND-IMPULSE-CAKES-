/* Kisakali in-app notification bell. Shared by every portal.
   Needs api.js (window.KAPI) and the notifications SQL. Safe to include on any page:
   it does nothing when nobody is signed in. Text is inserted with textContent only. */
(function () {
  'use strict';
  var sb = null, uid = null, items = [], unread = 0, open = false, wrap, btn, badge, panel, list, statusEl;

  function css() {
    var s = document.createElement('style');
    s.textContent =
      '#kx-bell{position:fixed;top:12px;right:12px;z-index:9500;width:42px;height:42px;border-radius:50%;border:1px solid #444;background:#1a1918;color:#fff;cursor:pointer;font-size:17px}' +
      '#kx-bell .kx-b{position:absolute;top:-4px;right:-4px;min-width:18px;height:18px;padding:0 5px;border-radius:9px;background:#e24b4a;color:#fff;font-size:11px;line-height:18px;text-align:center;display:none}' +
      '#kx-bell-panel{position:fixed;top:62px;right:12px;z-index:9501;width:min(340px,calc(100vw - 24px));max-height:70vh;overflow:auto;background:#1a1918;color:#eee;border:1px solid #444;border-radius:10px;padding:10px;display:none;font-size:14px}' +
      '#kx-bell-panel .kx-h{display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;font-weight:600}' +
      '#kx-bell-panel button{background:none;border:1px solid #555;color:#eee;border-radius:6px;padding:4px 8px;cursor:pointer;font-size:12px}' +
      '#kx-bell-panel .kx-i{display:block;width:100%;text-align:left;background:#262423;border:0;border-left:3px solid transparent;border-radius:6px;padding:9px;margin-bottom:6px;cursor:pointer;color:#eee}' +
      '#kx-bell-panel .kx-i.unread{border-left-color:#FE980F}' +
      '#kx-bell-panel .kx-t{font-weight:600;display:block}' +
      '#kx-bell-panel .kx-d{display:block;color:#b3b1ae;font-size:12px;margin-top:3px}' +
      '#kx-bell-panel .kx-m{color:#b3b1ae;font-size:12px;margin:8px 0 0}';
    document.head.appendChild(s);
  }

  function el(tag, cls, text) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text != null) e.textContent = text;
    return e;
  }

  function ago(iso) {
    var s = Math.max(0, (Date.now() - new Date(iso).getTime()) / 1000);
    if (s < 60) return 'just now';
    if (s < 3600) return Math.floor(s / 60) + ' min ago';
    if (s < 86400) return Math.floor(s / 3600) + ' h ago';
    return new Date(iso).toLocaleDateString('en-GB');
  }

  function render() {
    badge.textContent = unread > 99 ? '99+' : String(unread);
    badge.style.display = unread > 0 ? 'block' : 'none';
    list.textContent = '';
    if (!items.length) { list.appendChild(el('p', 'kx-m', 'No notifications yet.')); return; }
    items.forEach(function (n) {
      var b = el('button', 'kx-i' + (n.read_at ? '' : ' unread'));
      b.appendChild(el('span', 'kx-t', n.title));
      if (n.body) b.appendChild(el('span', 'kx-d', n.body));
      b.appendChild(el('span', 'kx-d', ago(n.created_at)));
      b.addEventListener('click', function () { openItem(n); });
      list.appendChild(b);
    });
  }

  function load() {
    return Promise.all([
      sb.rpc('my_notifications', { p_limit: 30 }),
      sb.rpc('my_unread_count')
    ]).then(function (r) {
      items = (r[0] && r[0].data) || [];
      unread = Number(r[1] && r[1].data) || 0;
      render();
    });
  }

  function markRead(ids) {
    return sb.rpc('mark_notifications_read', { p_ids: ids || null }).then(load);
  }

  function openItem(n) {
    var go = n.url || '/';
    markRead([n.id]).then(function () { window.location.href = go; });
  }

  function toggle() {
    open = !open;
    panel.style.display = open ? 'block' : 'none';
    if (open) load();
  }

  function build() {
    css();
    btn = el('button', null, '');
    btn.id = 'kx-bell';
    btn.setAttribute('aria-label', 'Notifications');
    btn.innerHTML = '<i class="fas fa-bell" aria-hidden="true"></i>';
    badge = el('span', 'kx-b', '');
    btn.appendChild(badge);
    btn.addEventListener('click', toggle);

    panel = el('div');
    panel.id = 'kx-bell-panel';
    var head = el('div', 'kx-h');
    head.appendChild(el('span', null, 'Notifications'));
    var all = el('button', null, 'Mark all read');
    all.addEventListener('click', function () { markRead(null); });
    head.appendChild(all);
    panel.appendChild(head);

    // Phone alerts: reuses push-client.js, which listens for clicks on #kx-enable-push
    if (!('Notification' in window) || Notification.permission !== 'granted') {
      var pb = el('button', null, 'Turn on phone alerts');
      pb.id = 'kx-enable-push';
      pb.style.marginBottom = '8px';
      panel.appendChild(pb);
    }
    statusEl = el('p', 'kx-m');
    statusEl.id = 'kx-push-status';
    panel.appendChild(statusEl);

    list = el('div');
    panel.appendChild(list);

    document.body.appendChild(btn);
    document.body.appendChild(panel);
  }

  function listen() {
    sb.channel('kx-notif-' + uid)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications', filter: 'user_id=eq.' + uid },
        function (payload) {
          unread++;
          render();
          if (payload && payload.new && payload.new.title && document.hidden === false && !open) {
            // Short on-screen hint when the page is open
            var hint = el('div', null, payload.new.title);
            hint.style.cssText = 'position:fixed;top:64px;left:12px;right:70px;z-index:9502;background:#262423;color:#fff;padding:10px 12px;border-radius:8px;border-left:3px solid #FE980F;font-size:14px';
            document.body.appendChild(hint);
            setTimeout(function () { hint.remove(); }, 4000);
          }
          if (open) load();
        })
      .subscribe();
  }

  function start() {
    if (!window.KAPI || !window.KAPI.sb) return;
    sb = window.KAPI.sb;
    sb.auth.getSession().then(function (r) {
      var user = r && r.data && r.data.session && r.data.session.user;
      if (!user) return;
      uid = user.id;
      build();
      load();
      listen();
    });
  }

  function waitAndStart(tries) {
    if (window.KAPI && window.KAPI.sb) return start();
    if (tries > 40) return;
    setTimeout(function () { waitAndStart(tries + 1); }, 250);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', function () { waitAndStart(0); });
  else waitAndStart(0);
})();
