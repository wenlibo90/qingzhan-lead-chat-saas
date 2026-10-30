(function () {
  'use strict';
  var O = window.Ops = {};
  var LS = { get: function (k, d) { try { var v = localStorage.getItem(k); return v == null ? d : v; } catch (e) { return d; } }, set: function (k, v) { try { localStorage.setItem(k, v); } catch (e) { } }, del: function (k) { try { localStorage.removeItem(k); } catch (e) { } } };
  O.state = { token: LS.get('qz_ops_token', ''), user: null, route: null, pages: {} };

  O.esc = function (s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); };
  O.$ = function (s, c) { return (c || document).querySelector(s); };
  O.$$ = function (s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); };
  O.icon = function (name, size) {
    var s = size || 17;
    var p = {
      overview: '<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/>',
      users: '<path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/>',
      building: '<rect x="3" y="3" width="18" height="18" rx="2"/><path d="M9 22V12h6v10M9 7h.01M15 7h.01"/>',
      inbox: '<path d="M22 12h-6l-2 3h-4l-2-3H2"/><path d="M5.45 5.11L2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z"/>',
      card: '<rect x="1" y="4" width="22" height="16" rx="2"/><path d="M1 10h22"/>',
      shield: '<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>',
      team: '<path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/>',
      logs: '<path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"/>',
      refresh: '<path d="M23 4v6h-6M1 20v-6h6"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/>',
      logout: '<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><path d="M16 17l5-5-5-5M21 12H9"/>',
      search: '<circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/>',
      arrow: '<path d="M5 12h14M12 5l7 7-7 7"/>',
      check: '<path d="M20 6L9 17l-5-5"/>',
      alert: '<path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><path d="M12 9v4M12 17h.01"/>',
      trend: '<path d="M23 6l-9.5 9.5-5-5L1 18"/><path d="M17 6h6v6"/>',
      phone: '<path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6A19.79 19.79 0 0 1 1.12 4.18 2 2 0 0 1 3.11 2h3a2 2 0 0 1 2 1.72c.13.96.36 1.9.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.9.34 1.85.57 2.81.7A2 2 0 0 1 22 16.92z"/>'
    };
    return '<svg viewBox="0 0 24 24" width="' + s + '" height="' + s + '" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">' + (p[name] || p.overview) + '</svg>';
  };

  O.fmtNum = function (n) { n = Number(n) || 0; if (n >= 10000) return (n / 10000).toFixed(1) + '万'; return String(n); };
  O.fmtTime = function (s) { if (!s) return '-'; var d = new Date(String(s).replace(' ', 'T') + (String(s).indexOf('Z') > -1 ? '' : 'Z')); if (isNaN(d.getTime())) return String(s); return (d.getMonth() + 1) + '-' + String(d.getDate()).padStart(2, '0') + ' ' + String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0'); };
  O.timeAgo = function (s) { if (!s) return '-'; var d = new Date(String(s).replace(' ', 'T') + (String(s).indexOf('Z') > -1 ? '' : 'Z')); var diff = Date.now() - d.getTime(); if (diff < 60000) return '刚刚'; if (diff < 3600000) return Math.floor(diff / 60000) + ' 分钟前'; if (diff < 86400000) return Math.floor(diff / 3600000) + ' 小时前'; return Math.floor(diff / 86400000) + ' 天前'; };
  O.planLabel = function (p) { return ({ free: '免费版', standard: '标准版', pro: '专业版', enterprise: '企业版' })[p] || p || '-'; };
  O.planStatusLabel = function (s) { return ({ active: '正常', trialing: '试用中', expired: '已过期', past_due: '逾期', canceled: '已取消' })[s] || s || '-'; };
  O.appStatusLabel = function (s) { return ({ new: '新申请', contacted: '已联系', qualified: '已确认', demo: '已演示', trial: '试用中', proposal: '已报价', won: '已成交', lost: '已流失' })[s] || s; };
  O.roleLabel = function (r) { return ({ superadmin: '超级管理员', ops: '运营', sales: '销售', support: '客服', finance: '财务' })[r] || r; };
  O.sourceLabel = function (s) { return ({ landing: '落地页', manual: '手动录入', signup: '注册关联', pql: '产品 PQL', billing: '企业咨询', sales_convert: '销售开通' })[s] || s || '-'; };

  O.api = function (path, opts) {
    opts = opts || {};
    var headers = Object.assign({ 'Content-Type': 'application/json' }, opts.headers || {});
    if (O.state.token) headers.Authorization = 'Bearer ' + O.state.token;
    var init = { method: opts.method || (opts.body ? 'POST' : 'GET'), headers: headers };
    if (opts.body) init.body = JSON.stringify(opts.body);
    return fetch(path, init).then(function (res) {
      return res.json().catch(function () { return {}; }).then(function (data) {
        if (res.status === 401) { O.logout(true); throw new Error('运营登录已失效'); }
        if (!res.ok) throw new Error(data.error || '请求失败');
        return data;
      });
    });
  };
  O.handle = function (e) { O.toast(e.message || '操作失败', 'err'); };
  O.toast = function (msg, type) {
    var root = document.getElementById('toast-root');
    var t = document.createElement('div');
    t.className = 'az-toast ' + (type || '');
    t.textContent = msg;
    root.appendChild(t);
    setTimeout(function () { t.style.opacity = '0'; t.style.transition = 'opacity .2s'; setTimeout(function () { t.remove(); }, 220); }, 2600);
  };
  O.modal = function (opts) {
    var root = document.getElementById('modal-root');
    var mask = document.createElement('div');
    mask.className = 'modal-mask';
    var footer = opts.footer && opts.footer.length ? '<div class="modal-foot">' + opts.footer.map(function (b, i) { return '<button class="au-btn ' + (b.class || 'au-btn--ghost') + '" data-mf="' + i + '">' + O.esc(b.label) + '</button>'; }).join('') + '</div>' : '';
    mask.innerHTML = '<div class="modal-card ' + (opts.size || '') + '"><div class="modal-head"><div><h3>' + O.esc(opts.title || '') + '</h3>' + (opts.subtitle ? '<p>' + O.esc(opts.subtitle) + '</p>' : '') + '</div><button class="modal-close">&times;</button></div><div class="modal-body">' + (opts.body || '') + '</div>' + footer + '</div>';
    root.appendChild(mask);
    var card = mask.querySelector('.modal-card');
    function close() { mask.style.opacity = '0'; setTimeout(function () { mask.remove(); }, 160); if (opts.onClose) opts.onClose(); }
    mask.addEventListener('click', function (e) { if (e.target === mask) close(); });
    mask.querySelector('.modal-close').addEventListener('click', close);
    (opts.footer || []).forEach(function (b, i) {
      var btn = mask.querySelector('[data-mf="' + i + '"]');
      if (btn) btn.addEventListener('click', function () { if (b.onClick) b.onClick(card, close); else close(); });
    });
    if (opts.onOpen) opts.onOpen(card, close);
    return { el: card, close: close };
  };
  O.confirm = function (opts) {
    return new Promise(function (resolve) {
      O.modal({ title: opts.title || '确认', size: 'narrow', body: '<p style="font-size:12.5px;line-height:1.7;color:#475569;margin:0">' + O.esc(opts.message || '') + '</p>', footer: [{ label: '取消', class: 'au-btn--ghost', onClick: function (c, close) { resolve(false); close(); } }, { label: opts.okText || '确定', class: opts.danger ? 'au-btn--danger' : 'au-btn--primary', onClick: function (c, close) { resolve(true); close(); } }], onClose: function () { resolve(false); } });
    });
  };
  O.copy = function (text) { if (navigator.clipboard) navigator.clipboard.writeText(text).catch(function () { }); else { var t = document.createElement('textarea'); t.value = text; document.body.appendChild(t); t.select(); document.execCommand('copy'); t.remove(); } O.toast('已复制', 'ok'); };
  O.pager = function (total, page, limit, attr) {
    var pages = Math.max(1, Math.ceil(total / limit));
    return '<div class="ops-pager"><button class="au-btn au-btn--ghost au-btn--xs" ' + (page <= 1 ? 'disabled' : '') + ' ' + (attr || 'data-pg') + '="' + (page - 1) + '">上一页</button><span class="tiny muted" style="padding:6px 8px">' + page + ' / ' + pages + '</span><button class="au-btn au-btn--ghost au-btn--xs" ' + (page >= pages ? 'disabled' : '') + ' ' + (attr || 'data-pg') + '="' + (page + 1) + '">下一页</button></div>';
  };
  O.lineChart = function (labels, values, id) {
    var w = 900, h = 220, pl = 38, pr = 12, pt = 14, pb = 24;
    var max = Math.max.apply(null, values.concat([1]));
    var iw = w - pl - pr, ih = h - pt - pb;
    var step = labels.length > 1 ? iw / (labels.length - 1) : iw;
    function x(i) { return pl + i * step; }
    function y(v) { return pt + ih - (v / max) * ih; }
    var grid = '';
    for (var g = 0; g <= 4; g++) {
      var gy = pt + ih / 4 * g;
      grid += '<line x1="' + pl + '" y1="' + gy + '" x2="' + (w - pr) + '" y2="' + gy + '" stroke="rgba(148,163,184,.16)"/><text x="' + (pl - 6) + '" y="' + (gy + 3) + '" text-anchor="end" font-size="9" fill="#94a3b8">' + Math.round(max - max / 4 * g) + '</text>';
    }
    var pts = values.map(function (v, i) { return x(i) + ',' + y(v); }).join(' L');
    var area = 'M' + pts + ' L' + x(values.length - 1) + ',' + (pt + ih) + ' L' + pl + ',' + (pt + ih) + ' Z';
    var xl = labels.map(function (l, i) { if (labels.length > 8 && i % Math.ceil(labels.length / 7) !== 0 && i !== labels.length - 1) return ''; return '<text x="' + x(i) + '" y="' + (h - 5) + '" text-anchor="middle" font-size="9" fill="#94a3b8">' + O.esc(String(l).slice(5)) + '</text>'; }).join('');
    return '<svg viewBox="0 0 ' + w + ' ' + h + '" preserveAspectRatio="none" style="width:100%;height:auto;display:block"><defs><linearGradient id="' + (id || 'og') + '" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#8b5cf6" stop-opacity=".2"/><stop offset="100%" stop-color="#8b5cf6" stop-opacity="0"/></linearGradient></defs>' + grid + '<path d="' + area + '" fill="url(#' + (id || 'og') + ')"/><path d="M' + pts + '" fill="none" stroke="#8b5cf6" stroke-width="2.2" stroke-linejoin="round"/>' + values.map(function (v, i) { return '<circle cx="' + x(i) + '" cy="' + y(v) + '" r="2.6" fill="#fff" stroke="#8b5cf6" stroke-width="1.6"><title>' + O.esc(labels[i]) + '：' + v + '</title></circle>'; }).join('') + xl + '</svg>';
  };

  O.register = function (name, def) { O.state.pages[name] = def; };
  O.nav = [
    { title: '平台概览', items: [{ key: 'overview', label: '运营概览', icon: 'overview' }] },
    { title: '客户与增长', items: [{ key: 'accounts', label: '客户账号', icon: 'users' }, { key: 'workspaces', label: '工作空间', icon: 'building' }, { key: 'applications', label: '申请线索', icon: 'inbox' }, { key: 'subscriptions', label: '订阅与试用', icon: 'card' }] },
    { title: '治理', items: [{ key: 'risk', label: '风控审核', icon: 'shield' }, { key: 'referrals', label: '推广奖励', icon: 'star' }, { key: 'tickets', label: '支持工单', icon: 'inbox' }, { key: 'team', label: '平台成员', icon: 'team' }, { key: 'logs', label: '操作日志', icon: 'logs' }] }
  ];

  O.renderLogin = function () {
    document.getElementById('boot-screen').hidden = true;
    document.getElementById('ops-app').hidden = true;
    var box = document.getElementById('ops-login');
    box.hidden = false;
    box.innerHTML =
      '<div class="login-brand">' +
        '<div class="login-logo"><span class="login-logo-mark"><img src="/assets/logo.webp" alt=""></span>轻客服 SaaS<span class="ops-brand-pill">平台运营</span></div>' +
        '<div class="login-hero">' +
          '<h1>一条自助线，<br>一条销售线。</h1>' +
          '<p>从注册账号、工作空间到试用订阅与销售申请，平台运营在一个控制台里完成。客户数据与运营数据完全隔离。</p>' +
          '<div class="login-points">' +
            '<div class="login-point"><span>' + O.icon('check', 13) + '</span>注册账号、工作空间、订阅订单统一视图</div>' +
            '<div class="login-point"><span>' + O.icon('check', 13) + '</span>申请线索进入平台销售池，可转为工作空间</div>' +
            '<div class="login-point"><span>' + O.icon('check', 13) + '</span>推广奖励、支持工单、风控与审计可追溯</div>' +
          '</div>' +
          '<div class="ops-login-note"><b>平台运营独立域</b><span>客户账号无法访问 /ops，运营账号也不会进入客户工作台。</span></div>' +
          '<div class="login-foot">© 2026 轻客服 SaaS · 平台运营控制台</div>' +
        '</div>' +
      '</div>' +
      '<div class="login-form-wrap"><form class="login-card" id="ops-login-form">' +
        '<div class="flex items-center justify-between mb-2"><h2 style="margin:0">运营登录</h2><span class="ops-badge">平台运营</span></div>' +
        '<p class="muted">平台运营账号独立于客户账号体系。</p>' +
        '<div class="au-form-group"><label class="au-label">运营邮箱</label><input class="au-input" name="email" type="email" value="ops@platform.com" autocomplete="username" required></div>' +
        '<div class="au-form-group"><label class="au-label">密码</label><input class="au-input" name="password" type="password" value="ops123" autocomplete="current-password" required></div>' +
        '<div class="flex items-center justify-between mb-2"><label class="small muted flex items-center gap-1"><input type="checkbox" checked> 记住登录状态</label><span class="small muted">仅限平台成员</span></div>' +
        '<button class="au-btn au-btn--primary au-btn--lg" style="width:100%" type="submit">进入运营控制台</button>' +
        '<div id="ops-error" class="notice danger mt-2" style="display:none"></div>' +
        '<div class="demo-accounts"><p>演示账号（点击自动登录）</p><div class="demo-row">' +
          '<button type="button" class="demo-chip" data-email="ops@platform.com" data-pass="ops123">超级管理员 · ops@platform.com</button>' +
          '<button type="button" class="demo-chip" data-email="sales@platform.com" data-pass="sales123">销售 · sales@platform.com</button>' +
        '</div></div>' +
        '<div class="tiny muted mt-2" style="text-align:center">客户账号请前往 <a href="/admin/" style="color:#2563eb">客户后台</a> 登录</div>' +
      '</form></div>';
    var form = document.getElementById('ops-login-form');
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var btn = form.querySelector('button[type=submit]');
      var errBox = document.getElementById('ops-error');
      btn.disabled = true; btn.textContent = '登录中...';
      errBox.style.display = 'none';
      fetch('/api/ops/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: form.email.value.trim(), password: form.password.value }) })
        .then(function (r) { return r.json().then(function (d) { if (!r.ok) throw new Error(d.error || '登录失败'); return d; }); })
        .then(function (d) { O.state.token = d.token; LS.set('qz_ops_token', d.token); O.boot(); })
        .catch(function (err) { errBox.style.display = 'flex'; errBox.textContent = err.message; btn.disabled = false; btn.textContent = '进入运营控制台'; });
    });
    O.$$('.demo-chip', form).forEach(function (chip) {
      chip.addEventListener('click', function () {
        form.email.value = chip.getAttribute('data-email');
        form.password.value = chip.getAttribute('data-pass');
        form.dispatchEvent(new Event('submit'));
      });
    });
  };
  O.logout = function (silent) { O.state.token = ''; O.state.user = null; LS.del('qz_ops_token'); if (silent) O.toast('登录已失效，请重新登录', 'err'); O.renderLogin(); };

  O.boot = function () {
    if (!O.state.token) return O.renderLogin();
    O.api('/api/ops/auth/me').then(function (d) {
      O.state.user = d.user;
      document.getElementById('boot-screen').hidden = true;
      document.getElementById('ops-login').hidden = true;
      document.getElementById('ops-app').hidden = false;
      if (!O._bound) { O._bound = true; window.addEventListener('hashchange', function () { O.route(); }); }
      O.renderShell();
      O.route();
    }).catch(function () { O.renderLogin(); });
  };
  O.renderShell = function () {
    var side = document.getElementById('ops-sidebar');
    side.innerHTML = '<div class="side-logo"><span class="side-logo-mark"><img src="/assets/logo.webp" alt=""></span><span><b>轻客服 SaaS</b><small class="ops-brand-sub">平台运营 · OPS CONSOLE</small></span></div>' +
      '<div class="side-site"><span class="site-ico">' + O.icon('shield', 14) + '</span><span class="site-meta"><b>' + O.esc(O.state.user.name) + '</b><span>' + O.roleLabel(O.state.user.role) + '</span></span></div>' +
      '<nav class="side-nav">' + O.nav.map(function (g) { return '<div class="nav-group"><div class="nav-group-title">' + g.title + '</div>' + g.items.map(function (it) { return '<button class="nav-item" data-nav="' + it.key + '"><span class="n-ico">' + O.icon(it.icon, 16) + '</span><span class="n-label">' + it.label + '</span></button>'; }).join('') + '</div>'; }).join('') + '</nav>' +
      '<div class="side-plan"><b><span>双线运营</span><span class="pill purple">OPS</span></b><p>自助注册与销售申请分开管理，数据统一沉淀。</p><button data-logout>退出运营后台</button></div>';
    O.$$('[data-nav]', side).forEach(function (b) { b.onclick = function () { O.go(b.getAttribute('data-nav')); }; });
    side.querySelector('[data-logout]').onclick = function () { O.logout(); };
    O.renderTopbar();
  };
  O.renderTopbar = function () {
    var def = O.state.pages[O.state.route && O.state.route.page] || {};
    document.getElementById('ops-topbar').innerHTML = '<div class="topbar-title">' + O.esc(def.title || '运营概览') + '<small>' + O.esc(def.subtitle || '') + '</small></div><div class="topbar-spacer"></div><div class="top-actions"><button class="top-icon-btn" data-refresh>' + O.icon('refresh', 15) + '</button><span class="ops-badge">' + O.roleLabel(O.state.user.role) + '</span><button class="top-user" data-me><span class="au-avatar">' + O.esc(O.state.user.name.slice(0, 1)) + '</span><span><b>' + O.esc(O.state.user.name) + '</b><span class="role">平台运营</span></span></button></div>';
    document.querySelector('#ops-topbar [data-refresh]').onclick = function () { O.route(); };
    document.querySelector('#ops-topbar [data-me]').onclick = function () {
      O.modal({ title: '运营账号', body: '<div class="side-kv"><span>姓名</span><b>' + O.esc(O.state.user.name) + '</b></div><div class="side-kv"><span>邮箱</span><b>' + O.esc(O.state.user.email) + '</b></div><div class="side-kv"><span>角色</span><b>' + O.roleLabel(O.state.user.role) + '</b></div>', footer: [{ label: '退出登录', class: 'au-btn--danger', onClick: function () { O.logout(); } }, { label: '关闭', class: 'au-btn--ghost' }] });
    };
  };
  O.go = function (path) { if (location.hash === '#/' + path) O.route(); else location.hash = '#/' + path; };
  O.parse = function () { var h = (location.hash || '#/overview').replace(/^#\/?/, ''); var seg = h.split('/').filter(Boolean); return { page: seg[0] || 'overview', params: seg.slice(1) }; };
  O.route = function () {
    var r = O.parse();
    var def = O.state.pages[r.page];
    if (!def) { r.page = 'overview'; def = O.state.pages.overview; }
    O.state.route = { page: r.page, def: def, params: r.params };
    O.renderTopbar();
    O.$$('.nav-item').forEach(function (n) { n.classList.toggle('active', n.getAttribute('data-nav') === r.page); });
    var page = document.getElementById('ops-page');
    page.innerHTML = '<div class="empty-state"><div class="em-ico">' + O.icon('refresh', 20) + '</div>加载中...</div>';
    def.render(page, r.params);
    window.scrollTo(0, 0);
  };
  O.statusPill = function (status) {
    var map = { new: 'blue', contacted: 'orange', qualified: 'purple', demo: 'purple', trial: 'blue', proposal: 'orange', won: 'green', lost: 'gray', active: 'green', trialing: 'orange', expired: 'gray', suspended: 'red', disabled: 'red', past_due: 'red', canceled: 'gray' };
    var direct = { suspended: '已停用', disabled: '已停用', active: '正常', past_due: '逾期', canceled: '已取消', pending: '待支付', paid: '已支付', failed: '支付失败', refunded: '已退款' };
    var label = direct[status] || (O.appStatusLabel(status) === status ? O.planStatusLabel(status) : O.appStatusLabel(status));
    return '<span class="pill ' + (map[status] || 'gray') + '">' + O.esc(label) + '</span>';
  };
})();
