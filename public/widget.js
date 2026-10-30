/*! Qingzhan Lead Chat Widget loader v1.0 | 一段 JS，客服 + 埋点 + 触达 + 线索 */
(function () {
  'use strict';
  if (window.__QZ_LOADED__) return;
  window.__QZ_LOADED__ = true;

  var script = document.currentScript || (function () {
    var list = document.getElementsByTagName('script');
    for (var i = list.length - 1; i >= 0; i--) {
      if (list[i].src && list[i].src.indexOf('widget.js') > -1) return list[i];
    }
    return null;
  })();

  var key = (script && script.getAttribute('data-key')) || window.QINGZHAN_KEY || '';
  if (!key && script && script.src) {
    try {
      var u = new URL(script.src, location.href);
      key = u.searchParams.get('key') || '';
    } catch (e) { key = ''; }
  }

  var base = '';
  try {
    base = script && script.src ? new URL(script.src, location.href).origin : location.origin;
  } catch (e2) { base = location.origin; }

  // Public API queue (usable before core is ready)
  var queue = [];
  var api = {
    key: key,
    base: base,
    open: function () { queue.push(['open']); },
    close: function () { queue.push(['close']); },
    toggle: function () { queue.push(['toggle']); },
    track: function (name, payload) { queue.push(['track', name, payload]); },
    setConsent: function (v) { queue.push(['setConsent', v]); },
    identify: function (data) { queue.push(['identify', data]); },
    version: '1.0.0'
  };
  window.Qingzhan = window.Qingzhan || api;
  window.__QZ_CONFIG__ = { key: key, base: base, queue: queue, api: api };

  if (!key) {
    if (window.console) console.warn('[Qingzhan] 缺少 site key，请在 script 地址中追加 ?key=你的站点Key');
    return;
  }

  // Ad-block detection (non-blocking)
  function reportBlocked() {
    try {
      var vid = '';
      try { vid = localStorage.getItem('qz_vid_' + key) || ''; } catch (e) { }
      var body = JSON.stringify({ key: key, url: location.href, vid: vid, referrer: document.referrer || '' });
      if (navigator.sendBeacon) {
        navigator.sendBeacon(base + '/api/public/adblock?key=' + encodeURIComponent(key), new Blob([body], { type: 'application/json' }));
      } else {
        fetch(base + '/api/public/adblock?key=' + encodeURIComponent(key), {
          method: 'POST', headers: { 'Content-Type': 'application/json' }, body: body, keepalive: true
        }).catch(function () { });
      }
    } catch (e) { }
  }

  function detectAdblock(callback) {
    try {
      var bait = document.createElement('div');
      bait.className = 'adsbox ad-banner pub_300x250 text-ad ad-placement';
      bait.setAttribute('style', 'width:1px;height:1px;position:absolute!important;left:-9999px;top:-9999px;pointer-events:none;');
      bait.innerHTML = '&nbsp;';
      document.body.appendChild(bait);
      setTimeout(function () {
        var blocked = bait.offsetParent === null || bait.offsetHeight === 0 || bait.clientHeight === 0;
        if (bait.parentNode) bait.parentNode.removeChild(bait);
        if (blocked) {
          window.__QZ_ADBLOCKED__ = true;
          reportBlocked();
        }
        if (callback) callback(blocked);
      }, 260);
    } catch (e) { if (callback) callback(false); }
  }

  var coreRequested = false;
  function loadCore() {
    if (coreRequested) return;
    coreRequested = true;
    var s = document.createElement('script');
    s.src = base + '/widget-core.js?v=1.0.0';
    s.async = true;
    s.onerror = function () {
      window.__QZ_ADBLOCKED__ = true;
      reportBlocked();
    };
    s.onload = function () {
      if (window.Qingzhan && window.Qingzhan.__ready) window.Qingzhan.__ready();
    };
    (document.head || document.documentElement).appendChild(s);
  }

  function schedule() {
    detectAdblock(function () {
      if ('requestIdleCallback' in window) {
        requestIdleCallback(loadCore, { timeout: 1200 });
      } else {
        setTimeout(loadCore, 180);
      }
    });
  }

  if (document.readyState === 'complete') schedule();
  else window.addEventListener('load', schedule, { once: true });

  // Also preload when visitor shows intent
  ['mousemove', 'touchstart', 'scroll', 'keydown'].forEach(function (evt) {
    window.addEventListener(evt, loadCore, { once: true, passive: true });
  });
})();
