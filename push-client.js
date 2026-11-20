/* Kisakali browser push enrollment. No service-account/private key belongs here. */
(function () {
  'use strict';
  var cfg = window.KISAKALI_FCM_CONFIG || {};
  var vapid = window.KISAKALI_FCM_VAPID_KEY || '';
  var sb = null;

  function status(message) {
    var el = document.getElementById('kx-push-status');
    if (el) el.textContent = message;
  }
  function readyConfig() {
    return cfg.apiKey && cfg.projectId && cfg.messagingSenderId && cfg.appId &&
      cfg.apiKey.indexOf('YOUR_') !== 0 && cfg.projectId.indexOf('YOUR_') !== 0 &&
      vapid && vapid.indexOf('YOUR_') !== 0;
  }
  async function getClient() {
    if (sb) return sb;
    for (var i = 0; i < 40; i++) {
      if (window.KAPI && window.KAPI.live && window.KAPI.sb) {
        sb = window.KAPI.sb;
        return sb;
      }
      await new Promise(function (r) { setTimeout(r, 250); });
    }
    throw new Error('Kisakali Supabase client is not ready. Refresh and sign in first.');
  }
  async function enablePush() {
    if (!('serviceWorker' in navigator) || !('Notification' in window)) {
      throw new Error('This browser does not support web push notifications.');
    }
    if (!window.isSecureContext) throw new Error('Push notifications require HTTPS.');
    if (!readyConfig()) throw new Error('Firebase setup is incomplete. Add your Firebase web config and VAPID public key.');
    if (!window.firebase || !firebase.messaging) throw new Error('Firebase Messaging did not load. Check your internet connection.');

    var client = await getClient();
    var sessionResult = await client.auth.getSession();
    var user = sessionResult && sessionResult.data && sessionResult.data.session && sessionResult.data.session.user;
    if (!user) throw new Error('Please sign in to your Kisakali account before enabling notifications.');

    var permission = await Notification.requestPermission();
    if (permission !== 'granted') throw new Error('Notification permission was not granted.');

    var registration = await navigator.serviceWorker.register('/firebase-messaging-sw.js', { scope: '/' });
    if (!firebase.apps.length) firebase.initializeApp(cfg);
    var messaging = firebase.messaging();
    var token = await messaging.getToken({ vapidKey: vapid, serviceWorkerRegistration: registration });
    if (!token) throw new Error('Firebase did not return a push token.');

    var saved = await client.from('push_subscriptions').upsert({
      user_id: user.id,
      token: token,
      platform: 'web',
      enabled: true,
      updated_at: new Date().toISOString()
    }, { onConflict: 'token' });
    if (saved.error) throw saved.error;
    status('Push notifications are enabled on this device.');
    return true;
  }

  document.addEventListener('click', function (event) {
    var button = event.target.closest && event.target.closest('#kx-enable-push');
    if (!button) return;
    button.disabled = true;
    status('Enabling notifications…');
    enablePush().catch(function (error) {
      status(error && error.message ? error.message : 'Could not enable notifications.');
    }).finally(function () { button.disabled = false; });
  });

  document.addEventListener('DOMContentLoaded', function () {
    if ('Notification' in window && Notification.permission === 'granted') status('Browser permission is already granted. Open Notification Settings to register this device.');
  });
})();
