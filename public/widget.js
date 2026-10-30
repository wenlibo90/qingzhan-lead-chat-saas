/*! Qingke SaaS Widget loader v1.0 */
(function () {
  'use strict';
  if (window.__QZ_LOADED__) return;
  window.__QZ_LOADED__ = true;
  var script = document.currentScript || (function () {
    var list = document.getElementsByTagName('script');
    for (var i = list.length - 1; i >= 0; i--) {
      if (list[i].src && /(?:qz|widget)\.js/.test(list[i].src)) return list[i];
    }
    return null;
  })();
  var key = '__SITE_KEY__';
  if (key === '__SITE_KEY__' && script && script.src) {
    try { key = new URL(script.src, location.href).searchParams.get('key') || ''; } catch (e) { key = ''; }
  }
  if (!key && script) key = script.getAttribute('data-key') || window.QINGZHAN_KEY || '';
  var base = location.origin;
  try {
    if (script && script.src) {
      var scriptUrl = new URL(script.src, location.href);
      base = scriptUrl.origin + scriptUrl.pathname.replace(/\/(?:qz|widget)\.js$/, '');
    }
  } catch (e2) { base = location.origin; }
  var queue = [];
  var api = {
    key: key,
    base: base,
    open: function () { queue.push(['open']); },
    close: function () { queue.push(['close']); },
    toggle: function () { queue.push(['toggle']); },
    track: function (name, payload) { queue.push(['track', name, payload]); },
    identify: function (data) { queue.push(['identify', data]); },
    version: '1.0.0'
  };
  window.Qingzhan = window.Qingzhan || api;
  window.__QZ_CONFIG__ = { key: key, base: base, queue: queue, api: api };
  if (!key) {
    if (window.console) console.warn('[Qingzhan] missing loader token');
    return;
  }
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
        if (blocked) { window.__QZ_ADBLOCKED__ = true; reportBlocked(); }
        if (callback) callback(blocked);
      }, 260);
    } catch (e) { if (callback) callback(false); }
  }
  var coreRequested = false;
  function loadCore() {
    if (coreRequested) return;
    coreRequested = true;
    var s = document.createElement('script');
    s.src = base + '/qz-core.js?v=1.0.0';
    s.async = true;
    s.onerror = function () { window.__QZ_ADBLOCKED__ = true; reportBlocked(); };
    s.onload = function () { if (window.Qingzhan && window.Qingzhan.__ready) window.Qingzhan.__ready(); };
    (document.head || document.documentElement).appendChild(s);
  }
  function schedule() {
    detectAdblock(function () {
      if ('requestIdleCallback' in window) requestIdleCallback(loadCore, { timeout: 1200 });
      else setTimeout(loadCore, 180);
    });
  }
  if (document.readyState === 'complete') schedule();
  else window.addEventListener('load', schedule, { once: true });
  ['mousemove', 'touchstart', 'scroll', 'keydown'].forEach(function (evt) {
    window.addEventListener(evt, loadCore, { once: true, passive: true });
  });
})();
