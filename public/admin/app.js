/* Qingzhan admin core */
(function () {
  'use strict';
  var A = window.Admin = {};
  var LS = {
    get: function (k, d) { try { var v = localStorage.getItem(k); return v == null ? d : v; } catch (e) { return d; } },
    set: function (k, v) { try { localStorage.setItem(k, v); } catch (e) { } },
    del: function (k) { try { localStorage.removeItem(k); } catch (e) { } }
  };

  A.state = {
    token: LS.get('qz_admin_token', ''),
    user: null,
    tenant: null,
    plan: null,
    features: [],
    sites: [],
    siteId: LS.get('qz_admin_site', ''),
    route: null,
    unread: 0,
    socket: null,
    pendingConv: 0,
    dark: LS.get('qz_admin_dark', '') === '1'
  };
  A.pages = {};
  A.data = {};

  A.esc = function (s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  };
  A.attr = A.esc;
  A.$ = function (sel, ctx) { return (ctx || document).querySelector(sel); };
  A.$$ = function (sel, ctx) { return Array.prototype.slice.call((ctx || document).querySelectorAll(sel)); };

  A.icon = function (name, size) {
    var s = size || 18;
    var p = {
      dashboard: '<rect x="3" y="3" width="7" height="9" rx="1.5"/><rect x="14" y="3" width="7" height="5" rx="1.5"/><rect x="14" y="12" width="7" height="9" rx="1.5"/><rect x="3" y="16" width="7" height="5" rx="1.5"/>',
      chat: '<path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8z"/>',
      users: '<path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/>',
      leads: '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M19 8v6M22 11h-6"/>',
      chart: '<path d="M3 3v18h18"/><path d="M18 17V9M13 17V5M8 17v-3"/>',
      zap: '<path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/>',
      book: '<path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>',
      settings: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.6 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.6a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>',
      globe: '<circle cx="12" cy="12" r="10"/><path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>',
      code: '<path d="M16 18l6-6-6-6M8 6l-6 6 6 6"/>',
      bell: '<path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/>',
      search: '<circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/>',
      plus: '<path d="M12 5v14M5 12h14"/>',
      filter: '<path d="M22 3H2l8 9.46V19l4 2v-8.54z"/>',
      download: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="M7 10l5 5 5-5M12 15V3"/>',
      upload: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="M17 8l-5-5-5 5M12 3v12"/>',
      close: '<path d="M18 6L6 18M6 6l12 12"/>',
      check: '<path d="M20 6L9 17l-5-5"/>',
      arrow: '<path d="M5 12h14M12 5l7 7-7 7"/>',
      back: '<path d="M19 12H5M12 19l-7-7 7-7"/>',
      refresh: '<path d="M23 4v6h-6M1 20v-6h6"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/>',
      external: '<path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><path d="M15 3h6v6M10 14L21 3"/>',
      lock: '<rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>',
      sparkles: '<path d="M12 3l1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9z"/><path d="M19 15l.9 2.1L22 18l-2.1.9L19 21l-.9-2.1L16 18l2.1-.9z"/>',
      building: '<rect x="3" y="3" width="18" height="18" rx="2"/><path d="M9 22V12h6v10M9 7h.01M15 7h.01M9 11h.01M15 11h.01"/>',
      card: '<rect x="1" y="4" width="22" height="16" rx="2"/><path d="M1 10h22"/>',
      shield: '<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>',
      activity: '<path d="M22 12h-4l-3 9L9 3l-3 9H2"/>',
      clock: '<circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/>',
      star: '<path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01z"/>',
      file: '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/>',
      image: '<rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="M21 15l-5-5L5 21"/>',
      play: '<circle cx="12" cy="12" r="10"/><path d="M10 8l6 4-6 4z"/>',
      tag: '<path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/><path d="M7 7h.01"/>',
      trash: '<path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>',
      edit: '<path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.12 2.12 0 0 1 3 3L12 15l-4 1 1-4z"/>',
      copy: '<rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>',
      logout: '<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><path d="M16 17l5-5-5-5M21 12H9"/>',
      sun: '<circle cx="12" cy="12" r="5"/><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/>',
      moon: '<path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>',
      menu: '<path d="M3 12h18M3 6h18M3 18h18"/>',
      phone: '<path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.96.36 1.9.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.9.34 1.85.57 2.81.7A2 2 0 0 1 22 16.92z"/>',
      mail: '<path d="M4 4h16a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z"/><path d="M22 6l-10 7L2 6"/>',
      video: '<path d="M23 7l-7 5 7 5V7z"/><rect x="1" y="5" width="15" height="14" rx="2"/>',
      wand: '<path d="M15 4V2M15 16v-2M8 9h2M20 9h2M17.8 11.8L19 13M17.8 6.2L19 5M3 21l9-9M12.2 6.2L11 5"/>',
      target: '<circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/>',
      list: '<path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"/>',
      eye: '<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>',
      compass: '<circle cx="12" cy="12" r="10"/><path d="M16.24 7.76l-2.12 6.36-6.36 2.12 2.12-6.36z"/>',
      alert: '<path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><path d="M12 9v4M12 17h.01"/>',
      server: '<rect x="2" y="2" width="20" height="8" rx="2"/><rect x="2" y="14" width="20" height="8" rx="2"/><path d="M6 6h.01M6 18h.01"/>',
      link: '<path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>',
      grid: '<rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/>',
      form: '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6M9 13h6M9 17h4"/>'
    };
    return '<svg viewBox="0 0 24 24" width="' + s + '" height="' + s + '" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">' + (p[name] || p.grid) + '</svg>';
  };

  // ---------------- format ----------------
  A.fmtNum = function (n) {
    n = Number(n) || 0;
    if (n >= 100000000) return (n / 100000000).toFixed(1) + '亿';
    if (n >= 10000) return (n / 10000).toFixed(1) + '万';
    return String(n);
  };
  A.fmtPct = function (n) { return (Number(n) || 0).toFixed(1) + '%'; };
  A.fmtMoney = function (n) { return '¥' + Number(n || 0).toLocaleString('zh-CN'); };
  A.fmtMs = function (ms) {
    if (!ms) return '-';
    if (ms < 60000) return Math.round(ms / 1000) + ' 秒';
    return Math.floor(ms / 60000) + ' 分 ' + Math.round((ms % 60000) / 1000) + ' 秒';
  };
  A.timeAgo = function (s) {
    if (!s) return '';
    var d = new Date(String(s).replace(' ', 'T') + (String(s).indexOf('Z') > -1 ? '' : 'Z'));
    if (isNaN(d.getTime())) d = new Date(s);
    var diff = Date.now() - d.getTime();
    if (diff < 60000) return '刚刚';
    if (diff < 3600000) return Math.floor(diff / 60000) + ' 分钟前';
    if (diff < 86400000) return Math.floor(diff / 3600000) + ' 小时前';
    if (diff < 86400000 * 7) return Math.floor(diff / 86400000) + ' 天前';
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  };
  A.fmtTime = function (s) {
    if (!s) return '';
    var d = new Date(String(s).replace(' ', 'T') + (String(s).indexOf('Z') > -1 ? '' : 'Z'));
    if (isNaN(d.getTime())) d = new Date(s);
    return String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0') + ' ' + String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0');
  };
  A.fmtDate = function (s) {
    if (!s) return '-';
    return String(s).slice(0, 10);
  };
  A.sourceLabel = function (s) {
    return ({ form: '表单', chat: '聊天', offline: '离线留言', landing: '落地页', api: 'API', manual: '手动录入', direct: '直接访问', baidu: '百度', google: '谷歌', wechat: '微信', wechat_mp: '公众号', zhihu: '知乎', douyin: '抖音', bing: '必应', sogou: '搜狗', '360': '360', xiaohongshu: '小红书', weibo: '微博', referral: '外链', local: '本地', localhost: '本地', '127.0.0.1': '本地', '::1': '本地' })[s] || s || '-';
  };
  A.clip = function (s, n) { s = String(s || ''); return s.length > n ? s.slice(0, n) + '…' : s; };

  // ---------------- API ----------------
  A.api = function (path, opts) {
    opts = opts || {};
    var headers = Object.assign({ 'Content-Type': 'application/json' }, opts.headers || {});
    if (A.state.token) headers.Authorization = 'Bearer ' + A.state.token;
    var init = { method: opts.method || (opts.body ? 'POST' : 'GET'), headers: headers };
    if (opts.body && !(opts.body instanceof FormData)) init.body = JSON.stringify(opts.body);
    if (opts.body instanceof FormData) { delete headers['Content-Type']; init.body = opts.body; }
    return fetch(path, init).then(function (res) {
      return res.json().catch(function () { return {}; }).then(function (data) {
        if (res.status === 401) { A.logout(true); throw new Error('登录已失效'); }
        if (!res.ok) {
          var err = new Error(data.error || ('请求失败 ' + res.status));
          err.code = data.code;
          err.status = res.status;
          err.data = data;
          throw err;
        }
        return data;
      });
    });
  };
  A.apiGet = function (path) { return A.api(path); };
  A.apiPost = function (path, body) { return A.api(path, { method: 'POST', body: body }); };
  A.apiPatch = function (path, body) { return A.api(path, { method: 'PATCH', body: body }); };
  A.apiPut = function (path, body) { return A.api(path, { method: 'PUT', body: body }); };
  A.apiDel = function (path) { return A.api(path, { method: 'DELETE' }); };

  A.handleError = function (err) {
    if (!err) return;
    if (err.code === 'PLAN_LOCKED') return A.upgrade(err.data && err.data.feature, err.message);
    if (err.code === 'PLAN_LIMIT') return A.upgrade('', err.message);
    A.toast(err.message || '操作失败', 'err');
  };

  // ---------------- toast / modal ----------------
  A.toast = function (msg, type) {
    var root = document.getElementById('toast-root');
    var t = document.createElement('div');
    t.className = 'az-toast ' + (type || '');
    t.innerHTML = (type === 'ok' ? A.icon('check', 14) : type === 'err' ? A.icon('alert', 14) : '') + '<span>' + A.esc(msg) + '</span>';
    root.appendChild(t);
    setTimeout(function () {
      t.style.opacity = '0';
      t.style.transform = 'translateY(6px)';
      t.style.transition = 'all .2s';
      setTimeout(function () { t.remove(); }, 220);
    }, 2800);
  };

  A.modal = function (opts) {
    var root = document.getElementById('modal-root');
    var mask = document.createElement('div');
    mask.className = 'modal-mask';
    var footer = '';
    if (opts.footer && opts.footer.length) {
      footer = '<div class="modal-foot">' + opts.footer.map(function (b, i) {
        return '<button class="au-btn ' + (b.class || 'au-btn--ghost') + '" data-mf="' + i + '">' + A.esc(b.label) + '</button>';
      }).join('') + '</div>';
    }
    mask.innerHTML = '<div class="modal-card ' + (opts.size || '') + '" role="dialog" aria-modal="true">' +
      '<div class="modal-head"><div><h3>' + A.esc(opts.title || '') + '</h3>' + (opts.subtitle ? '<p>' + A.esc(opts.subtitle) + '</p>' : '') + '</div><button class="modal-close" aria-label="关闭">&times;</button></div>' +
      '<div class="modal-body">' + (opts.body || '') + '</div>' + footer + '</div>';
    root.appendChild(mask);
    var card = mask.querySelector('.modal-card');
    function close() {
      mask.style.opacity = '0';
      setTimeout(function () { mask.remove(); }, 160);
      if (opts.onClose) opts.onClose();
    }
    mask.addEventListener('click', function (e) { if (e.target === mask) close(); });
    mask.querySelector('.modal-close').addEventListener('click', close);
    (opts.footer || []).forEach(function (b, i) {
      var btn = mask.querySelector('[data-mf="' + i + '"]');
      if (btn) btn.addEventListener('click', function () {
        if (b.onClick) b.onClick(card, close);
        else close();
      });
    });
    if (opts.onOpen) opts.onOpen(card, close);
    return { el: card, mask: mask, close: close };
  };

  A.confirm = function (opts) {
    return new Promise(function (resolve) {
      A.modal({
        title: opts.title || '确认操作',
        size: 'narrow',
        body: '<p style="font-size:12.5px;line-height:1.7;color:#475569;margin:0">' + A.esc(opts.message || '') + '</p>',
        footer: [
          { label: '取消', class: 'au-btn--ghost', onClick: function (c, close) { resolve(false); close(); } },
          { label: opts.okText || '确定', class: opts.danger ? 'au-btn--danger' : 'au-btn--primary', onClick: function (c, close) { resolve(true); close(); } }
        ],
        onClose: function () { resolve(false); }
      });
    });
  };

  A.prompt = function (opts) {
    return new Promise(function (resolve) {
      var m = A.modal({
        title: opts.title || '输入',
        body: '<label class="field-label">' + A.esc(opts.label || '') + '</label>' + (opts.textarea ? '<textarea class="az-textarea" data-pv></textarea>' : '<input class="az-input" data-pv>'),
        footer: [
          { label: '取消', class: 'au-btn--ghost', onClick: function (c, close) { resolve(null); close(); } },
          { label: '确定', class: 'au-btn--primary', onClick: function (c, close) { var v = c.querySelector('[data-pv]').value.trim(); resolve(v); close(); } }
        ],
        onClose: function () { resolve(null); }
      });
      var input = m.el.querySelector('[data-pv]');
      if (opts.value) input.value = opts.value;
      setTimeout(function () { input.focus(); }, 80);
    });
  };

  A.copy = function (text) {
    function fallback() {
      var ta = document.createElement('textarea');
      ta.value = text;
      ta.style.position = 'fixed';
      ta.style.left = '-9999px';
      document.body.appendChild(ta);
      ta.select();
      try { document.execCommand('copy'); } catch (e) { }
      ta.remove();
    }
    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(text).catch(fallback);
    } else fallback();
    A.toast('已复制到剪贴板', 'ok');
  };

  A.can = function (feature) {
    if (!feature) return true;
    return A.state.features.indexOf(feature) > -1;
  };
  A.role = function () { return A.state.user ? A.state.user.role : ''; };
  A.isAdmin = function () { return A.role() === 'admin'; };
  A.isAgent = function () { return A.role() === 'agent'; };

  A.siteQ = function (prefix) {
    if (!A.state.siteId) return '';
    return (prefix === '?' ? '?' : '&') + 'siteId=' + encodeURIComponent(A.state.siteId);
  };
  A.currentSite = function () {
    var list = A.state.sites.filter(function (s) { return !s.is_sandbox; });
    if (!A.state.siteId) return list[0] || A.state.sites[0] || null;
    return list.filter(function (s) { return String(s.id) === String(A.state.siteId); })[0] || list[0] || A.state.sites[0] || null;
  };
  A.trialDaysLeft = function () {
    if (!A.state.tenant || !A.state.tenant.trial_ends_at || A.state.tenant.plan_status !== 'trialing') return null;
    var d = new Date(String(A.state.tenant.trial_ends_at).replace(' ', 'T') + 'Z');
    return Math.max(0, Math.ceil((d.getTime() - Date.now()) / 86400000));
  };

  // ---------------- register ----------------
  A.registerPage = function (name, def) { A.pages[name] = def; };

  // ---------------- nav ----------------
  A.nav = [
    {
      title: '工作台', items: [
        { key: 'onboarding', label: '接入向导', icon: 'target', roles: ['admin', 'operator', 'agent'] },
        { key: 'dashboard', label: '数据概览', icon: 'dashboard', feature: 'basic_stats', roles: ['admin', 'operator', 'agent'] },
        { key: 'notes', label: '云笔记', icon: 'book', roles: ['admin', 'operator', 'agent'], external: '/notes' },
        { key: 'analytics', label: '网站分析', icon: 'chart', feature: 'source_stats', roles: ['admin', 'operator'] },
        { key: 'conversations', label: '会话接待', icon: 'chat', feature: 'chat', roles: ['admin', 'operator', 'agent'], badge: 'chat' },
        { key: 'visitors', label: '访客档案', icon: 'users', feature: 'visitor_profile_basic', roles: ['admin', 'operator', 'agent'] },
        { key: 'leads', label: '线索 CRM', icon: 'leads', feature: 'crm', roles: ['admin', 'operator', 'agent'] }
      ]
    },
    {
      title: '增长与转化', items: [
        { key: 'referral', label: '推广中心', icon: 'star', roles: ['admin', 'operator', 'agent'] },
        { key: 'reports', label: '数据报表', icon: 'chart', feature: 'source_stats', roles: ['admin', 'operator'] },
        { key: 'automation', label: '自动化规则', icon: 'zap', feature: 'triggers', roles: ['admin', 'operator'] },
        { key: 'knowledge', label: '知识库', icon: 'book', feature: 'knowledge', roles: ['admin', 'operator'] },
        { key: 'ai', label: 'AI 接待', icon: 'sparkles', feature: 'ai_bot', roles: ['admin', 'operator'] }
      ]
    },
    {
      title: '站点配置', items: [
        { key: 'widget', label: '挂件配置', icon: 'settings', feature: 'widget_basic', roles: ['admin', 'operator'] },
        { key: 'sites', label: '站点管理', icon: 'globe', feature: 'widget_basic', roles: ['admin', 'operator'] },
        { key: 'forms', label: '表单配置', icon: 'form', feature: 'forms', roles: ['admin', 'operator'] }
      ]
    },
    {
      title: '系统', items: [
        { key: 'team', label: '团队与权限', icon: 'shield', roles: ['admin', 'operator'] },
        { key: 'billing', label: '套餐与用量', icon: 'card', roles: ['admin'] },
        { key: 'settings', label: '系统设置', icon: 'settings', roles: ['admin', 'operator'] },
        { key: 'notifications', label: '消息通知', icon: 'bell', roles: ['admin', 'operator', 'agent'], badge: 'bell' },
        { key: 'support', label: '帮助与工单', icon: 'book', roles: ['admin', 'operator', 'agent'] },
        { key: 'logs', label: '操作日志', icon: 'list', roles: ['admin'] }
      ]
    }
  ];

  A.t = function (value) { return window.I18N ? window.I18N.t(value) : value; };
  A.setLocale = function (locale) {
    if (window.I18N) window.I18N.setLocale(locale);
    var u = A.state.user;
    var done = function () { location.reload(); };
    if (u && A.state.token) A.apiPatch('/api/auth/profile', { name: u.name, locale: locale }).then(done).catch(done);
    else done();
  };
  A.langSelectHtml = function (attr) {
    return '<select class="top-select top-lang" ' + (attr || 'data-admin-lang') + '>' + (window.I18N ? I18N.locales : []).map(function (l) {
      return '<option value="' + l.code + '">' + l.label + '</option>';
    }).join('') + '</select>';
  };
  A.planName = function (code) {
    return ({ free: '免费版', standard: '标准版', pro: '专业版', enterprise: '企业版' })[code] || code;
  };
  A.avatarDefs = [
    { id: 'av1', bg: 'linear-gradient(135deg,#2563eb,#06b6d4)', icon: 'chat' },
    { id: 'av2', bg: 'linear-gradient(135deg,#8b5cf6,#ec4899)', icon: 'sparkles' },
    { id: 'av3', bg: 'linear-gradient(135deg,#10b981,#06b6d4)', icon: 'star' },
    { id: 'av4', bg: 'linear-gradient(135deg,#f59e0b,#ef4444)', icon: 'zap' },
    { id: 'av5', bg: 'linear-gradient(135deg,#0f766e,#14b8a6)', icon: 'shield' },
    { id: 'av6', bg: 'linear-gradient(135deg,#1d4ed8,#7c3aed)', icon: 'globe' },
    { id: 'av7', bg: 'linear-gradient(135deg,#be123c,#f97316)', icon: 'target' },
    { id: 'av8', bg: 'linear-gradient(135deg,#334155,#0ea5e9)', icon: 'phone' }
  ];
  A.avatarHtml = function (user, extra, iconSize) {
    var id = user && user.avatar;
    var def = A.avatarDefs.filter(function (a) { return a.id === id; })[0];
    var cls = 'au-avatar avatar-art' + (extra ? ' ' + extra : '');
    if (def) return '<span class="' + cls + '" style="background:' + def.bg + '">' + A.icon(def.icon, iconSize || 15) + '</span>';
    return '<span class="' + cls + '">' + A.esc(((user && user.name) || '?').slice(0, 1)) + '</span>';
  };
  A.featureNeeded = function (feature) {
    if (['triggers', 'forms', 'visitor_profile_basic', 'source_stats', 'keyword_reply', 'rating'].indexOf(feature) > -1) return '标准版';
    if (['funnel', 'intent_scoring', 'crm', 'geo_heatmap', 'agent_perf', 'automation', 'recording', 'leads_export', 'churn_report', 'knowledge', 'announcement', 'blacklist'].indexOf(feature) > -1) return '专业版';
    if (['ai_bot', 'translation', 'whitelabel', 'api', 'sla'].indexOf(feature) > -1) return '企业版';
    return '';
  };

  // ---------------- login ----------------
  A.renderLogin = function () {
    document.getElementById('boot-screen').hidden = true;
    document.getElementById('app').hidden = true;
    var screen = document.getElementById('login-screen');
    screen.hidden = false;
    screen.classList.add('has-bg');
    screen.innerHTML =
      '<div class="login-brand">' +
        '<div class="login-logo"><span class="login-logo-mark"><img src="/assets/logo.webp" alt=""></span>' + A.t('轻客服 SaaS') +
          '<span class="login-brand-pill">' + A.t('工作台') + '</span></div>' +
        '<div class="login-stage" aria-hidden="true">' +
          '<div class="lv lv-bubble lv-bubble--1"><img src="/assets/login/login-03.webp" alt=""></div>' +
          '<div class="lv lv-bubble lv-bubble--2"><img src="/assets/login/login-04.webp" alt=""></div>' +
          '<div class="lv lv-bubble lv-bubble--3"><img src="/assets/login/login-05.webp" alt=""></div>' +
          '<div class="lv lv-chart"><img src="/assets/login/login-02.webp" alt=""></div>' +
          '<div class="lv lv-tag"><span class="lv-tag-pill"><i></i>' + A.t('线索沉淀') + '</span></div>' +
          '<div class="lv lv-dash"><img src="/assets/login/login-01.webp" alt=""></div>' +
        '</div>' +
        '<div class="login-hero">' +
          '<h1>' + A.t('客服挂件接住访客，') + '<br>' + A.t('线索 CRM 沉淀商机') + '</h1>' +
          '<p>' + A.t('一段客服挂件接入网站，实时接待、记录行为、主动触达，再把咨询沉淀为线索，进入线索 CRM 跟进成交。') + '</p>' +
          '<div class="login-points">' +
            '<div class="login-point"><span>' + A.icon('check', 13) + '</span>' + A.t('异步懒加载，不阻塞宿主网站首屏') + '</div>' +
            '<div class="login-point"><span>' + A.icon('check', 13) + '</span>' + A.t('实时聊天 + 无埋点行为采集 + 意向打分') + '</div>' +
            '<div class="login-point"><span>' + A.icon('check', 13) + '</span>' + A.t('多租户数据隔离，RBAC 权限体系') + '</div>' +
          '</div>' +
          '<div class="login-code">&lt;script async src="https://Your Domain Name/qz.js?YOUR_LOADER_TOKEN"&gt;&lt;/script&gt;</div>' +
          '<div class="login-foot">© 2026 ' + A.t('轻客服 SaaS') + ' · ' + A.t('客服挂件接住访客，线索CRM沉淀商机') + '</div>' +
        '</div>' +
      '</div>' +
      '<div class="login-form-wrap"><form class="login-card" id="login-form">' +
        '<div class="login-mobile-brand"><span class="login-logo-mark"><img src="/assets/logo.webp" alt=""></span><b>' + A.t('轻客服 SaaS') + '</b></div>' +
        '<div class="login-card-head"><h2>' + A.t('登录工作台') + '</h2><div class="login-lang-wrap">' + A.langSelectHtml('data-login-lang') + '</div></div>' +
        '<p class="login-sub">' + A.t('使用注册账号或团队账号登录，也可点击演示账号快速体验。') + '</p>' +
        '<div class="au-form-group login-field"><label class="au-label">' + A.t('手机号或邮箱') + '</label><input class="au-input" type="text" name="identifier" placeholder="' + A.t('手机号 / you@company.com') + '" autocomplete="username" required></div>' +
        '<div class="au-form-group login-field"><label class="au-label">' + A.t('密码') + '</label><input class="au-input" type="password" name="password" placeholder="' + A.t('请输入密码') + '" autocomplete="current-password" required></div>' +
        '<div class="login-options"><label class="login-remember"><input type="checkbox" checked><span class="login-check" aria-hidden="true"></span><span>' + A.t('记住登录状态') + '</span></label><span class="login-register">' + A.t('没有账号？') + ' <a href="#" data-login-signup>' + A.t('免费注册') + '</a></span></div>' +
        '<button class="au-btn au-btn--primary au-btn--lg login-submit" type="submit">' + A.t('进入工作台') + '</button>' +
        '<div id="login-error" class="notice danger mt-2" style="display:none"></div>' +
        '<div class="demo-accounts"><p>' + A.t('演示账号（点击自动登录）') + '</p><div class="demo-row">' +
          '<button type="button" class="demo-chip" data-email="admin@demo.com" data-pass="admin123">' + A.t('管理员 · 林晓') + '</button>' +
          '<button type="button" class="demo-chip" data-email="ops@demo.com" data-pass="ops123">' + A.t('运营 · 周敏') + '</button>' +
          '<button type="button" class="demo-chip" data-email="agent@demo.com" data-pass="agent123">' + A.t('客服 · 陈曦') + '</button>' +
        '</div></div>' +
        '<div class="login-ops">' + A.t('平台运营账号请前往') + ' <a href="/ops/">' + A.t('运营后台') + '</a></div>' +
      '</form></div>';
    var form = document.getElementById('login-form');
    var errBox = document.getElementById('login-error');
    var loginLang = document.querySelector('[data-login-lang]');
    if (loginLang) {
      loginLang.value = window.I18N ? I18N.locale : 'zh-CN';
      loginLang.addEventListener('change', function () { A.setLocale(loginLang.value); });
    }
    var stage = screen.querySelector('.login-stage');
    if (screen._qzParallax) screen.removeEventListener('pointermove', screen._qzParallax);
    if (stage && !window.matchMedia('(prefers-reduced-motion: reduce)').matches && window.matchMedia('(pointer:fine)').matches) {
      var raf = 0;
      screen._qzParallax = function (e) {
        if (raf) return;
        raf = requestAnimationFrame(function () {
          raf = 0;
          var rect = screen.getBoundingClientRect();
          var x = Math.max(-1, Math.min(1, (e.clientX - rect.left) / rect.width * 2 - 1));
          var y = Math.max(-1, Math.min(1, (e.clientY - rect.top) / rect.height * 2 - 1));
          stage.style.setProperty('--px', x.toFixed(3));
          stage.style.setProperty('--py', y.toFixed(3));
        });
      };
      screen.addEventListener('pointermove', screen._qzParallax, { passive: true });
    }
    var submitBtn = form.querySelector('button[type=submit]');
    var signupLink = form.querySelector('[data-login-signup]');
    if (signupLink) signupLink.addEventListener('click', function (e) {
      e.preventDefault();
      openSignupDialog();
    });
    function openSignupDialog() {
      var mask = document.createElement('div');
      mask.className = 'login-signup-mask';
      mask.innerHTML =
        '<div class="login-signup-card" role="dialog" aria-modal="true">' +
          '<button class="login-signup-close" type="button" aria-label="关闭">&times;</button>' +
          '<aside class="login-signup-aside">' +
            '<span class="login-signup-kicker">' + A.t('免费注册 · 14 天专业版试用') + '</span>' +
            '<h3>' + A.t('注册一个账号') + '<br><em>' + A.t('把自己的网站接进来') + '</em></h3>' +
            '<p>' + A.t('注册只需要手机号和密码。进入后台后添加你的网站，复制一段 JS 放到自己的页面，真实访客就能看到客服挂件、行为轨迹和线索表单。') + '</p>' +
            '<div class="login-signup-points"><span>' + A.t('注册只要 30 秒') + '</span><span>' + A.t('后台添加自己的网站') + '</span><span>' + A.t('直接跑真实场景') + '</span></div>' +
            '<p class="login-signup-note">' + A.t('轻客服 SaaS · 个人网站和应用不需要复杂流程，快速接入。') + '</p>' +
          '</aside>' +
          '<div class="login-signup-main">' +
            '<div class="login-signup-head"><h3>' + A.t('创建账号') + '</h3><p>' + A.t('手机号用于登录和接收接入提醒，不会对外展示。') + '</p></div>' +
            '<form class="login-signup-form" novalidate>' +
              '<input type="hidden" name="ref">' +
              '<div class="signup-ref" data-ref-banner hidden>' + A.t('你正在通过好友邀请注册，首单付费后邀请人将获得推广奖励。') + '</div>' +
              '<div class="au-form-group"><label class="au-label">' + A.t('手机号') + '</label>' +
                '<div class="signup-phone-row"><input class="au-input" name="phone" type="tel" maxlength="11" placeholder="' + A.t('请输入 11 位手机号') + '" autocomplete="tel">' +
                '<button type="button" class="au-btn au-btn--ghost signup-code-btn" data-send-code>' + A.t('获取验证码') + '</button></div>' +
                '<div class="signup-hint" data-code-hint></div></div>' +
              '<div class="au-form-group"><label class="au-label">' + A.t('验证码') + '</label><input class="au-input" name="code" type="text" maxlength="6" placeholder="' + A.t('6 位短信验证码') + '" inputmode="numeric" autocomplete="one-time-code"></div>' +
              '<div class="au-form-group"><label class="au-label">' + A.t('密码') + '</label><input class="au-input" name="password" type="password" minlength="6" placeholder="' + A.t('至少 6 位，用于登录后台') + '" autocomplete="new-password"></div>' +
              '<div class="signup-agree"><label><input type="checkbox" name="agree" checked> <span>' + A.t('我已阅读并同意') + '</span> <a href="/privacy.html" target="_blank">' + A.t('隐私政策') + '</a> <span>' + A.t('与') + '</span> <a href="/terms.html" target="_blank">' + A.t('服务条款') + '</a></label></div>' +
              '<div class="s-error" data-error></div>' +
              '<button class="au-btn au-btn--primary login-submit" type="submit" data-submit>' + A.t('注册并进入后台') + '</button>' +
            '</form>' +
          '</div>' +
        '</div>';
      document.body.appendChild(mask);
      var close = function () { mask.remove(); };
      mask.querySelector('.login-signup-close').addEventListener('click', close);
      mask.addEventListener('click', function (ev) { if (ev.target === mask) close(); });
      var onEsc = function (ev) { if (ev.key === 'Escape') { close(); document.removeEventListener('keydown', onEsc); } };
      document.addEventListener('keydown', onEsc);
      var signupForm = mask.querySelector('.login-signup-form');
      if (window.QingkeSignup) window.QingkeSignup.mount(signupForm, { scope: mask });
      setTimeout(function () { var p = signupForm.querySelector('[name=phone]'); if (p) p.focus(); }, 60);
    }
    var doLogin = function (identifier, password, sourceBtn) {
      submitBtn.disabled = true;
      submitBtn.textContent = A.t('登录中...');
      errBox.style.display = 'none';
      A.$$('.demo-chip', form).forEach(function (c) { c.disabled = true; });
      if (sourceBtn) sourceBtn.classList.add('is-loading');
      fetch('/api/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ identifier: identifier, password: password }) })
        .then(function (r) { return r.json().then(function (d) { if (!r.ok) throw new Error(d.error || A.t('登录失败')); return d; }); })
        .then(function (data) {
          A.state.token = data.token;
          LS.set('qz_admin_token', data.token);
          A.boot();
        })
        .catch(function (err) {
          errBox.style.display = 'flex';
          errBox.textContent = err.message;
          submitBtn.disabled = false;
          submitBtn.textContent = A.t('进入工作台');
          A.$$('.demo-chip', form).forEach(function (c) { c.disabled = false; });
          if (sourceBtn) sourceBtn.classList.remove('is-loading');
        });
    };
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      doLogin(form.identifier.value.trim(), form.password.value);
    });
    A.$$('.demo-chip', form).forEach(function (chip) {
      chip.addEventListener('click', function () {
        doLogin(chip.getAttribute('data-email'), chip.getAttribute('data-pass'), chip);
      });
    });
  };

  A.logout = function (silent) {
    A.state.token = '';
    A.state.user = null;
    A.state.socket = null;
    A._sideSig = null;
    LS.del('qz_admin_token');
    if (silent) A.toast('登录已失效，请重新登录', 'err');
    A.renderLogin();
  };

  // ---------------- boot / shell ----------------
  A.boot = function () {
    var boot = document.getElementById('boot-screen');
    if (!A.state.token) {
      boot.hidden = true;
      A.renderLogin();
      return;
    }
    A.api('/api/auth/me').then(function (me) {
      A.state.user = me.user;
      A.state.tenant = me.tenant;
      A.state.plan = me.plan;
      A.state.features = me.featureCodes || (me.features || []).map(function (f) { return f.code; });
      A.state.sites = me.sites || [];
      A.state.workspaces = me.workspaces || [];
      A.state.account = me.account || null;
      if (window.I18N) I18N.setLocale(LS.get('qz_locale', '') || (me.account && me.account.locale) || 'zh-CN');
      A.state.account = me.account || null;
      if (A.state.siteId && !A.state.sites.some(function (s) { return String(s.id) === String(A.state.siteId); })) {
        A.state.siteId = '';
        LS.del('qz_admin_site');
      }
      boot.hidden = true;
      document.getElementById('login-screen').hidden = true;
      document.getElementById('app').hidden = false;
      A.renderShell();
      A.connectSocket();
      if (!A._hashBound) {
        A._hashBound = true;
        window.addEventListener('hashchange', function () { A.route(); });
      }
      A.route();
      A.pollNotifications();
    }).catch(function (err) {
      boot.hidden = true;
      if (!A.state.token) A.renderLogin();
      else { A.state.token = ''; LS.del('qz_admin_token'); A.renderLogin(); A.toast('登录已失效，请重新登录', 'err'); }
    });
  };

  A.renderShell = function () {
    A.renderSidebar();
    A.renderTopbar();
    A.refreshConvCounts();
  };

  var convCountTimer = null;
  A.refreshConvCounts = function () {
    clearTimeout(convCountTimer);
    convCountTimer = setTimeout(function () {
      if (!A.state.token) return;
      A.api('/api/conversations?status=pending&limit=1' + A.siteQ()).then(function (d) {
        var n = (d.counts && d.counts.pending) || 0;
        if (n !== A.state.pendingConv) { A.state.pendingConv = n; A.renderSidebar(); }
      }).catch(function () { });
    }, 500);
  };

  A.renderSidebar = function (force) {
    var side = document.getElementById('sidebar');
    var sig = [
      A.role(), A.state.siteId, (A.currentSite() || {}).id, (A.currentSite() || {}).name,
      A.state.plan && A.state.plan.code, A.state.plan && A.state.plan.limits ? A.state.plan.limits.agents : '',
      A.state.sites.length, A.trialDaysLeft(), window.I18N ? I18N.locale : ''
    ].join('|');
    if (!force && sig === A._sideSig) { A.syncNavBadges(); return; }
    A._sideSig = sig;
    var prevTop = 0;
    var oldNav = side.querySelector('.side-nav');
    if (oldNav) prevTop = oldNav.scrollTop;
    var navHtml = A.nav.map(function (group) {
      var items = group.items.filter(function (it) {
        return !it.roles || it.roles.indexOf(A.role()) > -1;
      });
      if (!items.length) return '';
      return '<div class="nav-group"><div class="nav-group-title">' + A.esc(A.t(group.title)) + '</div>' + items.map(function (it) {
        var locked = it.feature && !A.can(it.feature);
        return '<button class="nav-item' + (locked ? ' locked' : '') + '" data-nav="' + it.key + '"' + (it.external ? ' data-external="' + A.esc(it.external) + '"' : '') + '>' +
          '<span class="n-ico">' + A.icon(it.icon, 17) + '</span><span class="n-label">' + A.esc(A.t(it.label)) + '</span>' +
          (locked ? '<span class="n-lock">' + A.featureNeeded(it.feature) + '</span>' : '') +
          (it.badge === 'chat' && A.state.pendingConv ? '<span class="n-badge">' + (A.state.pendingConv > 99 ? '99+' : A.state.pendingConv) + '</span>' : '') +
          (it.badge === 'bell' && A.state.unread ? '<span class="n-badge">' + (A.state.unread > 99 ? '99+' : A.state.unread) + '</span>' : '') +
          '</button>';
      }).join('') + '</div>';
    }).join('');
    side.innerHTML =
      '<div class="side-logo"><span class="side-logo-mark"><img src="/assets/logo.webp" alt=""></span><span><b>轻客服 SaaS</b><small>客服挂件 · 线索 CRM</small></span></div>' +
      '<nav class="side-nav">' + navHtml + '</nav>';
    A.$$('[data-nav]', side).forEach(function (btn) {
      btn.addEventListener('click', function () {
        var external = btn.getAttribute('data-external');
        if (external) {
          window.open(external, '_blank', 'noopener');
          side.classList.remove('open');
          return;
        }
        A.go(btn.getAttribute('data-nav'));
        side.classList.remove('open');
      });
    });
    var newNav = side.querySelector('.side-nav');
    if (newNav) newNav.scrollTop = prevTop;
    if (A.state.route) A.markNav(A.state.route.page);
    A.syncNavBadges();
  };

  A.syncNavBadges = function () {
    var items = A.nav.reduce(function (acc, g) { return acc.concat(g.items); }, []);
    items.forEach(function (it) {
      if (!it.badge) return;
      var btn = document.querySelector('#sidebar .nav-item[data-nav="' + it.key + '"]');
      if (!btn) return;
      var count = it.badge === 'chat' ? (A.state.pendingConv || 0) : (A.state.unread || 0);
      var el = btn.querySelector('.n-badge');
      if (!count) { if (el) el.parentNode.removeChild(el); return; }
      if (!el) { el = document.createElement('span'); el.className = 'n-badge'; btn.appendChild(el); }
      el.textContent = count > 99 ? '99+' : String(count);
    });
  };

  A.renderTopbar = function () {
    var top = document.getElementById('topbar');
    var page = A.pages[A.state.route && A.state.route.page] || {};
    var siteOptions = '<option value="">全部站点</option>' + A.state.sites.filter(function (s) { return !s.is_sandbox; }).map(function (s) {
      return '<option value="' + s.id + '"' + (String(s.id) === String(A.state.siteId) ? ' selected' : '') + '>' + A.esc(s.name) + '</option>';
    }).join('');
    var curSite = A.currentSite();
    var siteTitle = curSite ? curSite.name + (curSite.domain ? ' · ' + curSite.domain : '') : '全部站点';
    var trLeft = A.trialDaysLeft();
    var planName = trLeft != null ? '试用中' : (A.state.plan ? A.state.plan.name : '免费版');
    var planMeta = trLeft != null ? '剩 ' + trLeft + ' 天' : (A.state.plan && A.state.plan.limits && A.state.plan.limits.agents !== -1 ? A.state.plan.limits.agents + ' 坐席' : '');
    var planChip = A.role() === 'agent' ? '' :
      '<button class="top-plan' + (trLeft != null ? ' is-trial' : '') + '" data-plan-chip title="' + A.esc('当前套餐：' + planName + (planMeta ? ' · ' + planMeta : '') + '，点击查看用量与套餐') + '">' +
      '<span class="tp-dot"></span><span class="tp-name">' + A.esc(planName) + '</span>' +
      (planMeta ? '<span class="tp-meta">' + A.esc(planMeta) + '</span>' : '') + '</button>';
    top.innerHTML =
      '<button class="top-icon-btn menu-toggle" data-menu aria-label="菜单">' + A.icon('menu', 17) + '</button>' +
      '<div class="topbar-title">' + A.esc(A.t(page.title || '数据概览')) + '<small>' + A.esc(A.t(page.subtitle || '')) + '</small></div>' +
      '<div class="topbar-spacer"></div>' +
      '<div class="top-actions">' +
      A.langSelectHtml() +
      planChip +
      '<select class="top-select" data-site-filter title="' + A.esc(siteTitle) + '" aria-label="选择站点">' + siteOptions + '</select>' +
      '<button class="top-icon-btn" data-bell aria-label="通知">' + A.icon('bell', 16) + (A.state.unread ? '<span class="dot"></span>' : '') + '</button>' +
      '<button class="top-user" data-user>' +
      A.avatarHtml(A.state.user, '', 15) +
      '<span><b>' + A.esc(A.state.user && A.state.user.name || '') + '</b><span class="role">' + ({ admin: '管理员', operator: '运营', agent: '客服' })[A.role()] + '</span></span>' +
      '</button></div>';
    top.querySelector('[data-menu]').addEventListener('click', function () {
      document.getElementById('sidebar').classList.toggle('open');
    });
    top.querySelector('[data-site-filter]').addEventListener('change', function (e) {
      A.state.siteId = e.target.value;
      LS.set('qz_admin_site', A.state.siteId);
      A.renderSidebar();
      A.route();
      A.refreshConvCounts();
    });
    var langSel = top.querySelector('[data-admin-lang]');
    if (langSel) {
      langSel.value = window.I18N ? I18N.locale : 'zh-CN';
      langSel.addEventListener('change', function () { A.setLocale(langSel.value); });
    }
    top.querySelector('[data-bell]').addEventListener('click', A.openNotifications);
    var planChipEl = top.querySelector('[data-plan-chip]');
    if (planChipEl) planChipEl.addEventListener('click', function () {
      if (A.role() === 'admin') { A.go('billing'); return; }
      A.toast('套餐与用量由管理员管理，当前：' + planName + (planMeta ? ' · ' + planMeta : ''), 'info');
    });
    top.querySelector('[data-user]').addEventListener('click', A.openUserMenu);
  };

  A.go = function (path) {
    if (location.hash === '#/' + path) { A.route(); return; }
    location.hash = '#/' + path;
  };

  A.parseRoute = function () {
    var hash = (location.hash || '#/dashboard').replace(/^#\/?/, '');
    var parts = hash.split('?');
    var seg = parts[0].split('/').filter(Boolean);
    return { page: seg[0] || 'dashboard', params: seg.slice(1), query: {} };
  };

  A.markNav = function (page) {
    A.$$('#sidebar .nav-item').forEach(function (n) { n.classList.toggle('active', n.getAttribute('data-nav') === page); });
  };

  A.route = function () {
    var r = A.parseRoute();
    var def = A.pages[r.page];
    if (!def) { r.page = 'dashboard'; def = A.pages.dashboard; }
    if (A.state.route && A.state.route.def && A.state.route.def.destroy) {
      try { A.state.route.def.destroy(); } catch (e) { }
    }
    A.state.route = { page: r.page, params: r.params, def: def, query: r.query };
    A.renderSidebar();
    A.renderTopbar();
    A.markNav(r.page);
    var container = document.getElementById('page');
    if (def.roles && def.roles.indexOf(A.role()) < 0) {
      container.innerHTML = A.lockPage('该页面仅对' + (def.roles.indexOf('operator') > -1 ? '管理员/运营' : '管理员') + '开放', '权限不足');
      return;
    }
    if (def.feature && !A.can(def.feature)) {
      container.innerHTML = A.lockPage(def.title + '需要' + A.featureNeeded(def.feature) + '能力', def.title);
      return;
    }
    container.innerHTML = '<div class="empty-state"><div class="em-ico">' + A.icon('refresh', 20) + '</div>加载中...</div>';
    try {
      def.render(container, { params: r.params, query: r.query });
    } catch (e) {
      console.error(e);
      container.innerHTML = '<div class="empty-state"><b>页面渲染失败</b>' + A.esc(e.message) + '</div>';
    }
    window.scrollTo(0, 0);
  };

  A.lockPage = function (message, title) {
    return '<div class="page-head"><div><h1>' + A.esc(title || '功能未解锁') + '</h1><p>' + A.esc(message) + '</p></div></div>' +
      '<div class="az-card pad"><div class="locked-card"><div class="lock-ov"><span class="lk-ico">' + A.icon('lock', 20) + '</span>' +
      '<h4>升级套餐即可使用</h4><p>专业版解锁转化漏斗、意向打分、线索 CRM、自动化与录屏；企业版提供 AI 与白标。</p>' +
      '<button class="au-btn au-btn--primary" onclick="Admin.go(\'billing\')">查看套餐</button></div></div></div>';
  };

  // ---------------- notifications / user ----------------
  A.pollNotifications = function () {
    if (!A.state.token) return;
    clearInterval(A._notifyTimer);
    A._notifyTimer = setInterval(function () {
      A.api('/api/notifications').then(function (d) {
        A.state.unread = d.unread;
        A.renderSidebar();
      }).catch(function () { });
    }, 45000);
    A.api('/api/notifications').then(function (d) { A.state.unread = d.unread; A.renderSidebar(); }).catch(function () { });
  };

  A.openNotifications = function () {
    A.api('/api/notifications').then(function (d) {
      var body = d.notifications.length ? d.notifications.map(function (n) {
        return '<div class="flex gap-1" style="padding:10px 0;border-bottom:1px dashed rgba(148,163,184,.2)">' +
          '<span class="avatar-sm ' + (n.type === 'lead' ? 'green' : n.type === 'transfer' ? 'purple' : '') + '">' + A.icon(n.type === 'lead' ? 'leads' : 'chat', 14) + '</span>' +
          '<div style="flex:1;min-width:0"><b style="font-size:12px;display:block">' + A.esc(n.title) + ' <span class="tiny muted">' + A.timeAgo(n.created_at) + '</span></b><div class="tiny muted">' + A.esc(n.content) + '</div></div>' +
          (n.is_read ? '' : '<span class="dot-status blue" style="background:#2563eb"></span>') + '</div>';
      }).join('') : '<div class="empty-state">暂无通知</div>';
      A.modal({
        title: '消息通知', subtitle: d.unread ? d.unread + ' 条未读' : '全部已读', body: body,
        footer: [{ label: '全部标为已读', class: 'au-btn--ghost', onClick: function (c, close) { A.apiPost('/api/notifications/read-all').then(function () { A.state.unread = 0; A.renderSidebar(); close(); A.toast('已全部标为已读', 'ok'); }); } }, { label: '关闭', class: 'au-btn--primary' }]
      });
      A.state.unread = 0;
      A.renderSidebar();
      A.apiPost('/api/notifications/read-all').catch(function () { });
    }).catch(A.handleError);
  };

  A.openUserMenu = function () {
    var u = A.state.user;
    var body = '<div class="flex items-center gap-2" style="padding-bottom:14px;border-bottom:1px solid rgba(148,163,184,.2)">' +
      A.avatarHtml(u, 'au-avatar--lg', 20) +
      '<div><b style="font-size:15px">' + A.esc(u.name) + '</b><div class="small muted">' + A.esc(u.email || (A.state.account && A.state.account.phone) || '') + '</div><div class="tag-list mt-1"><span class="pill blue">' + ({ admin: '管理员', operator: '运营', agent: '客服' })[u.role] + '</span><span class="pill gray">' + A.esc(A.state.tenant.name) + '</span></div></div></div>' +
      '<div class="mt-2"><div class="side-kv"><span>所属套餐</span><b>' + (A.state.plan ? A.state.plan.name : '') + '</b></div>' +
      '<div class="side-kv"><span>站点数量</span><b>' + A.state.sites.filter(function (s) { return !s.is_sandbox; }).length + '</b></div>' +
      '<div class="side-kv"><span>账号状态</span><b>正常</b></div></div>' +
      (A.state.workspaces && A.state.workspaces.length > 1 ? '<div class="divider"></div><div class="field-label">切换工作空间</div><div class="grid" style="gap:6px">' + A.state.workspaces.map(function (w) {
        return '<button class="au-list-item' + (Number(w.tenant_id) === Number(A.state.tenant.id) ? ' au-active' : '') + '" data-ws="' + w.tenant_id + '" style="border:1px solid rgba(148,163,184,.18)"><span class="avatar-sm">' + A.icon('globe', 13) + '</span><span class="au-list-item-content"><span class="au-list-item-title">' + A.esc(w.tenant_name) + '</span><span class="au-list-item-desc">' + A.planName(w.plan) + ' · ' + w.role + '</span></span></button>';
      }).join('') + '</div>' : '') +
      '<div class="grid" style="grid-template-columns:1fr 1fr;gap:8px;margin-top:12px"><button class="au-btn au-btn--ghost" data-profile>个人资料</button><button class="au-btn au-btn--ghost" data-pwd>修改密码</button><button class="au-btn au-btn--danger" data-logout style="grid-column:span 2">退出登录</button></div>';
    var m = A.modal({ title: '账号', body: body });
    m.el.querySelector('[data-logout]').addEventListener('click', function () { m.close(); A.logout(); });
    m.el.querySelector('[data-pwd]').addEventListener('click', function () { m.close(); A.openPassword(); });
    m.el.querySelector('[data-profile]').addEventListener('click', function () { m.close(); A.openProfile(); });
    A.$$('[data-ws]', m.el).forEach(function (b) {
      b.addEventListener('click', function () {
        var tid = b.getAttribute('data-ws');
        if (Number(tid) === Number(A.state.tenant.id)) return m.close();
        A.apiPost('/api/auth/switch', { tenantId: Number(tid) }).then(function (r) {
          A.state.token = r.token;
          LS.set('qz_admin_token', r.token);
          LS.del('qz_admin_site');
          m.close();
          location.reload();
        }).catch(A.handleError);
      });
    });
  };

  A.openProfile = function () {
    var u = A.state.user;
    var selected = u.avatar || '';
    var body = '<div class="grid"><div><label class="field-label">昵称</label><input class="az-input" data-profile-name maxlength="30" value="' + A.esc(u.name || '') + '"></div>' +
      '<div><label class="field-label">选择头像</label><div class="avatar-picker">' + A.avatarDefs.map(function (a) {
        return '<button type="button" class="avatar-choice' + (selected === a.id ? ' active' : '') + '" data-avatar="' + a.id + '">' + A.avatarHtml({ avatar: a.id, name: u.name }, '', 17) + '</button>';
      }).join('') + '</div></div></div>';
    var m = A.modal({
      title: '个人资料', subtitle: '昵称与头像会显示在后台和团队列表',
      body: body,
      footer: [{ label: '取消', class: 'au-btn--ghost' }, { label: '保存资料', class: 'au-btn--primary', onClick: function (card, close) {
        var name = card.querySelector('[data-profile-name]').value.trim();
        if (!name) return A.toast('昵称不能为空', 'err');
        A.apiPatch('/api/auth/profile', { name: name, avatar: selected }).then(function (res) {
          A.state.user = res.user;
          close();
          A.renderTopbar();
          A.renderSidebar();
          A.toast('个人资料已更新', 'ok');
        }).catch(A.handleError);
      } }]
    });
    A.$$('[data-avatar]', m.el).forEach(function (b) {
      b.onclick = function () {
        selected = b.getAttribute('data-avatar');
        A.$$('[data-avatar]', m.el).forEach(function (x) { x.classList.toggle('active', x === b); });
      };
    });
  };

  A.openPassword = function () {
    var m = A.modal({
      title: '修改密码', size: 'narrow',
      body: '<div class="grid"><div><label class="field-label">原密码</label><input class="az-input" type="password" data-old></div><div><label class="field-label">新密码</label><input class="az-input" type="password" data-new placeholder="至少 6 位"></div></div>',
      footer: [{ label: '取消', class: 'au-btn--ghost' }, { label: '保存', class: 'au-btn--primary', onClick: function (card, close) {
        var oldP = card.querySelector('[data-old]').value, newP = card.querySelector('[data-new]').value;
        A.apiPost('/api/auth/password', { oldPassword: oldP, newPassword: newP }).then(function () { close(); A.toast('密码已更新', 'ok'); }).catch(A.handleError);
      } }]
    });
  };

  // ---------------- upgrade ----------------
  A.upgrade = function (feature, message) {
    A.api('/api/billing').then(function (d) {
      var need = feature ? A.featureNeeded(feature) : '';
      var cards = (d.plans || []).map(function (p) {
        var active = p.code === A.state.plan.code;
        return '<div class="plan-card' + (p.recommended ? ' recommended' : '') + (active ? ' current' : '') + '">' +
          (p.recommended ? '<span class="pill purple" style="position:absolute;right:12px;top:12px">主推</span>' : '') +
          '<h3>' + p.name + '</h3><div class="price">' + (p.price ? '¥' + p.price : '定制') + (p.price ? '<small> / 月</small>' : '') + '</div>' +
          '<div class="tagline">' + A.esc(p.tagline) + '</div>' +
          '<ul>' + p.highlights.map(function (h) { return '<li>' + A.icon('check', 12) + A.esc(h) + '</li>'; }).join('') + '</ul>' +
          '<button class="au-btn ' + (active ? 'au-btn--ghost' : 'au-btn--primary') + '" style="width:100%" data-plan="' + p.code + '"' + (active ? ' disabled' : '') + '>' + (active ? '当前套餐' : p.code === 'enterprise' ? '联系销售' : '切换体验') + '</button>' +
          '</div>';
      }).join('');
      A.modal({
        title: '升级套餐', subtitle: message || '解锁更多访客能力', size: 'wide',
        body: '<div class="plan-grid">' + cards + '</div>',
        onOpen: function (card, close) {
          A.$$('[data-plan]', card).forEach(function (btn) {
            btn.addEventListener('click', function () {
              var plan = btn.getAttribute('data-plan');
              if (plan === 'enterprise') { A.toast('已记录需求，销售会在 1 个工作日内联系你', 'ok'); close(); return; }
              A.apiPost('/api/billing/change-plan', { plan: plan }).then(function () {
                close(); A.toast('套餐已切换为' + A.planName(plan), 'ok'); A.boot();
              }).catch(A.handleError);
            });
          });
        }
      });
    }).catch(function () {
      A.toast(message || '该功能需要升级套餐', 'err');
    });
  };

  // ---------------- socket ----------------
  A.connectSocket = function () {
    if (!A.state.token || A.state.socket) return;
    function connect() {
      var s = window.io(location.origin, { transports: ['websocket', 'polling'], reconnection: true });
      A.state.socket = s;
      s.on('connect', function () {
        s.emit('auth:agent', { token: A.state.token }, function (res) {
          if (res && res.error) console.warn('[socket]', res.error);
        });
      });
      s.on('notification:new', function (d) {
        A.state.unread += 1;
        A.renderSidebar();
        A.toast((d && d.title || '新通知') + (d && d.content ? '：' + d.content : ''), 'ok');
      });
      s.on('conversation:new', function () { A.refreshConvCounts(); });
      s.on('conversation:update', function () { A.refreshConvCounts(); });
      s.on('message:new', function () { A.refreshConvCounts(); });
    }
    if (window.io) return connect();
    var script = document.createElement('script');
    script.src = '/socket.io/socket.io.js';
    script.onload = connect;
    document.head.appendChild(script);
  };

  // ---------------- charts ----------------
  A.lineChart = function (opts) {
    var labels = opts.labels || [];
    var series = opts.series || [];
    var w = 900, h = opts.height || 250, pl = 42, pr = 14, pt = 16, pb = 26;
    var max = 1;
    series.forEach(function (s) { s.values.forEach(function (v) { if (Number(v) > max) max = Number(v); }); });
    max = Math.ceil(max * 1.15) || 1;
    var iw = w - pl - pr, ih = h - pt - pb;
    var step = labels.length > 1 ? iw / (labels.length - 1) : iw;
    function x(i) { return pl + i * step; }
    function y(v) { return pt + ih - (Number(v) / max) * ih; }
    var grid = '';
    for (var g = 0; g <= 4; g++) {
      var gy = pt + (ih / 4) * g;
      grid += '<line x1="' + pl + '" y1="' + gy + '" x2="' + (w - pr) + '" y2="' + gy + '" stroke="rgba(148,163,184,.16)" stroke-width="1"/>';
      grid += '<text x="' + (pl - 8) + '" y="' + (gy + 3) + '" text-anchor="end" font-size="10" fill="#94a3b8">' + A.fmtNum(Math.round(max - (max / 4) * g)) + '</text>';
    }
    var paths = series.map(function (s, si) {
      var pts = s.values.map(function (v, i) { return x(i) + ',' + y(v); });
      var line = 'M' + pts.join(' L');
      var area = line + ' L' + x(s.values.length - 1) + ',' + (pt + ih) + ' L' + pl + ',' + (pt + ih) + ' Z';
      var color = s.color || ['#2563eb', '#10b981', '#f59e0b', '#8b5cf6'][si % 4];
      return (si === 0 ? '<defs><linearGradient id="lg' + (opts.id || 'a') + '" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="' + color + '" stop-opacity=".18"/><stop offset="100%" stop-color="' + color + '" stop-opacity="0"/></linearGradient></defs><path d="' + area + '" fill="url(#lg' + (opts.id || 'a') + ')"/>' : '') +
        '<path d="' + line + '" fill="none" stroke="' + color + '" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>' +
        s.values.map(function (v, i) { return '<circle cx="' + x(i) + '" cy="' + y(v) + '" r="2.6" fill="#fff" stroke="' + color + '" stroke-width="1.8"><title>' + A.esc(labels[i] || '') + '：' + A.fmtNum(v) + '</title></circle>'; }).join('');
    }).join('');
    var xLabels = labels.map(function (l, i) {
      if (labels.length > 10 && i % Math.ceil(labels.length / 7) !== 0 && i !== labels.length - 1) return '';
      return '<text x="' + x(i) + '" y="' + (h - 6) + '" text-anchor="middle" font-size="9.5" fill="#94a3b8">' + A.esc(String(l).slice(5)) + '</text>';
    }).join('');
    return '<div class="chart-box"><svg viewBox="0 0 ' + w + ' ' + h + '" preserveAspectRatio="none">' + grid + paths + xLabels + '</svg></div>';
  };

  A.donut = function (data, opts) {
    var total = data.reduce(function (s, d) { return s + d.value; }, 0) || 1;
    var colors = opts && opts.colors || ['#2563eb', '#0ea5e9', '#8b5cf6', '#10b981', '#f59e0b', '#ec4899', '#64748b'];
    var r = 54, c = 2 * Math.PI * r, offset = 0;
    var arcs = data.map(function (d, i) {
      var len = (d.value / total) * c;
      var arc = '<circle cx="70" cy="70" r="' + r + '" fill="none" stroke="' + (d.color || colors[i % colors.length]) + '" stroke-width="16" stroke-dasharray="' + len + ' ' + (c - len) + '" stroke-dashoffset="' + (-offset) + '" transform="rotate(-90 70 70)" stroke-linecap="butt"><title>' + A.esc(d.name) + '：' + d.value + '</title></circle>';
      offset += len;
      return arc;
    }).join('');
    var legend = data.map(function (d, i) {
      return '<div><i style="background:' + (d.color || colors[i % colors.length]) + '"></i><span>' + A.esc(d.name) + '</span><b>' + A.fmtNum(d.value) + '</b></div>';
    }).join('');
    return '<div class="flex items-center gap-2" style="flex-wrap:wrap"><div style="width:140px;flex-shrink:0"><svg viewBox="0 0 140 140" width="140" height="140">' + arcs + '<text x="70" y="66" text-anchor="middle" font-size="20" font-weight="800" fill="#0f172a">' + A.fmtNum(total) + '</text><text x="70" y="84" text-anchor="middle" font-size="9" fill="#94a3b8">' + A.esc((opts && opts.centerLabel) || '总计') + '</text></svg></div><div class="donut-legend" style="flex:1">' + legend + '</div></div>';
  };

  A.barList = function (rows, opts) {
    var max = Math.max.apply(null, rows.map(function (r) { return r.value; }).concat([1]));
    return rows.map(function (r) {
      return '<div class="bar-row"><span class="bar-label" title="' + A.esc(r.name) + '">' + A.esc(r.name) + '</span><span class="bar-track"><span class="bar-fill" style="width:' + Math.max(2, (r.value / max) * 100) + '%;' + (r.color ? 'background:' + r.color : '') + '"></span></span><span class="bar-val">' + A.esc(opts && opts.format ? opts.format(r.value) : A.fmtNum(r.value)) + '</span></div>';
    }).join('');
  };

  A.funnel = function (steps) {
    var max = Math.max.apply(null, steps.map(function (s) { return s.value; }).concat([1]));
    return steps.map(function (s, i) {
      var pct = (s.value / max) * 100;
      return '<div class="funnel-step"><span class="funnel-name">' + A.esc(s.label) + '</span>' +
        '<span class="funnel-bar-wrap"><span class="funnel-bar" style="width:' + Math.max(6, pct) + '%;min-width:46px">' + A.fmtNum(s.value) + '</span></span>' +
        '<span class="funnel-meta"><b>' + A.fmtPct(s.rate) + '</b>整体转化' + (i > 0 ? ' · 环节 ' + A.fmtPct(s.stepRate) : '') + '</span></div>';
    }).join('');
  };

  A.heatmap = function (provinces) {
    var coords = { '北京': [596, 121], '上海': [700, 205], '广东': [596, 318], '浙江': [676, 236], '江苏': [652, 196], '四川': [398, 246], '湖北': [536, 236], '山东': [632, 154], '福建': [672, 276], '陕西': [470, 192], '河南': [552, 184], '湖南': [552, 278] };
    var max = Math.max.apply(null, provinces.map(function (p) { return p.visitors; }).concat([1]));
    var bubbles = provinces.map(function (p) {
      var xy = coords[p.province];
      if (!xy) return '';
      var ratio = p.visitors / max;
      var r = 7 + ratio * 20;
      var color = ratio > .65 ? '#ef4444' : ratio > .4 ? '#f97316' : ratio > .2 ? '#2563eb' : '#38bdf8';
      return '<g><circle cx="' + xy[0] + '" cy="' + xy[1] + '" r="' + r + '" fill="' + color + '" opacity=".55"><title>' + A.esc(p.province) + '：' + p.visitors + ' 访客 / ' + p.leads + ' 线索</title></circle>' +
        '<circle cx="' + xy[0] + '" cy="' + xy[1] + '" r="' + Math.max(2.5, r * .28) + '" fill="' + color + '"/>' +
        '<text x="' + (xy[0] + r + 2) + '" y="' + (xy[1] + 3) + '" font-size="9" fill="#475569">' + A.esc(p.province) + '</text></g>';
    }).join('');
    return '<div class="heatmap-wrap"><svg viewBox="0 0 860 400">' +
      '<path d="M70 128 L110 82 L172 64 L222 78 L262 54 L320 62 L362 44 L430 60 L474 48 L534 74 L590 64 L646 86 L700 82 L756 112 L806 152 L818 196 L784 226 L732 238 L704 276 L654 292 L614 330 L560 346 L522 380 L470 382 L430 352 L380 362 L334 334 L292 350 L252 322 L210 316 L180 280 L142 258 L120 216 L86 196 Z" fill="rgba(37,99,235,.05)" stroke="rgba(37,99,235,.22)" stroke-width="1.5" stroke-linejoin="round"/>' +
      '<path d="M700 300 L720 312 L714 342 L694 350 L684 330 Z" fill="rgba(37,99,235,.06)" stroke="rgba(37,99,235,.2)" stroke-width="1"/>' +
      bubbles + '</svg><div class="heat-legend"><span>低</span><i style="background:#38bdf8"></i><i style="background:#2563eb"></i><i style="background:#f97316"></i><i style="background:#ef4444"></i><span>高</span></div></div>';
  };

  A.statusPill = function (status) {
    var map = { open: ['green', '进行中'], pending: ['orange', '待接入'], closed: ['gray', '已结束'], new: ['blue', '新线索'], following: ['orange', '跟进中'], won: ['green', '已成交'], invalid: ['gray', '无效'] };
    var m = map[status] || ['gray', status];
    return '<span class="pill ' + m[0] + '">' + m[1] + '</span>';
  };
  A.intentPill = function (level, score) {
    var map = { high: ['red', '高意向'], medium: ['orange', '中意向'], low: ['gray', '低意向'] };
    var m = map[level] || ['gray', level || '未知'];
    return '<span class="pill ' + m[0] + '">' + m[1] + (score != null ? ' ' + Math.round(score) : '') + '</span>';
  };

  A.empty = function (title, desc, action) {
    return '<div class="empty-state"><div class="em-ico">' + A.icon('grid', 20) + '</div><b>' + A.esc(title) + '</b>' + A.esc(desc || '') + (action || '') + '</div>';
  };

  A.skeleton = function (rows) {
    return '<div class="az-card pad">' + Array.from({ length: rows || 4 }).map(function () { return '<div class="au-skeleton" style="margin-bottom:12px"></div>'; }).join('') + '</div>';
  };

  A.refresh = function () { A.route(); };

  A.log = function () { };

})();
