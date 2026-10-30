(function () {
  'use strict';
  var O = window.Ops;

  // ---------------- overview ----------------
  O.register('overview', {
    title: '运营概览', subtitle: '注册、激活、试用与销售线索',
    render: function (root) {
      root.innerHTML = '<div id="ov-body">' + skeleton(4) + '</div>';
      O.api('/api/ops/overview').then(function (d) {
        var m = d.metrics;
        var maxAct = Math.max.apply(null, d.activation.map(function (a) { return a.value; }).concat([1]));
        var metrics = [
          ['注册账号', m.accounts, '新增 7 天 ' + m.newAccounts, 'users'],
          ['工作空间', m.workspaces, '试用中 ' + m.trialing, 'building'],
          ['已安装 JS', m.installed, '激活关键步骤', 'trend'],
          ['付费工作空间', m.paid, '标准版及以上', 'card'],
          ['申请线索', m.applications, '待跟进 ' + m.newApplications, 'inbox'],
          ['风险/停用', m.risk, '需要人工查看', 'shield'],
          ['已收金额', '¥' + Number(m.revenue || 0).toLocaleString('zh-CN'), (m.paidOrders || 0) + ' 笔已支付订单', 'card']
        ];
        root.querySelector('#ov-body').innerHTML =
          '<div class="ops-metric-grid section-gap">' + metrics.map(function (x) {
            return '<div class="ops-metric"><span>' + x[0] + '</span><b>' + O.fmtNum(x[1]) + '</b><em class="' + (x[0].indexOf('风险') > -1 ? 'warn' : '') + '">' + x[2] + '</em></div>';
          }).join('') + '</div>' +
          '<div class="grid g-2-1 section-gap"><div class="az-card"><div class="az-card-head"><div><h3>注册与申请趋势</h3><div class="sub">最近 14 天，按天统计</div></div></div><div class="az-card-body">' + O.lineChart(d.trend.map(function (t) { return t.date; }), d.trend.map(function (t) { return t.signups; }), 'ovsign') + '<div class="chart-legend mt-1"><span><i style="background:#8b5cf6"></i>注册账号</span><span><i style="background:#cbd5e1"></i>申请线索见申请列表</span></div></div></div>' +
          '<div class="az-card"><div class="az-card-head"><h3>激活漏斗</h3><div class="sub">从账号到首条线索</div></div><div class="az-card-body">' + d.activation.map(function (a) {
            return '<div class="bar-row"><span class="bar-label">' + O.esc(a.label) + '</span><span class="bar-track"><span class="bar-fill" style="width:' + Math.max(2, a.value / maxAct * 100) + '%"></span></span><span class="bar-val">' + O.fmtNum(a.value) + '</span></div>';
          }).join('') + '<div class="ops-callout mt-2">自助注册的核心指标是「安装 JS 后是否收到首条会话」。注册量只是漏斗入口。</div></div></div></div>' +
          '<div class="grid g2 section-gap"><div class="az-card"><div class="az-card-head"><div><h3>最近注册</h3><div class="sub">账号与工作空间</div></div><button class="au-btn au-btn--ghost au-btn--xs" data-go="accounts">查看全部</button></div><div class="az-card-body">' + (d.recentAccounts.length ? d.recentAccounts.map(function (a) {
            return '<div class="ops-list-item"><span class="avatar-sm">' + O.esc((a.name || '?').slice(0, 1)) + '</span><div style="flex:1;min-width:0"><b>' + O.esc(a.name || '未命名') + ' <span class="pill gray" style="font-size:9px">' + a.workspace_count + ' 个工作空间</span></b><span>' + O.esc(a.phone || a.email || '-') + '</span></div><div class="right">' + O.timeAgo(a.created_at) + '</div></div>';
          }).join('') : '<div class="ops-empty">暂无注册</div>') + '</div></div>' +
          '<div class="az-card"><div class="az-card-head"><div><h3>最近申请</h3><div class="sub">B 端销售线索</div></div><button class="au-btn au-btn--ghost au-btn--xs" data-go="applications">查看全部</button></div><div class="az-card-body">' + (d.recentApplications.length ? d.recentApplications.map(function (a) {
            return '<div class="ops-list-item"><span class="avatar-sm gray">申</span><div style="flex:1;min-width:0"><b>' + O.esc(a.name) + ' · ' + O.esc(a.company || '个人') + '</b><span>' + O.esc(a.phone || '') + ' · ' + O.esc(a.channel || '') + '</span></div><div class="right">' + O.statusPill(a.status) + '<div style="margin-top:3px">' + O.timeAgo(a.created_at) + '</div></div></div>';
          }).join('') : '<div class="ops-empty">暂无申请</div>') + '</div></div></div>' +
          '<div class="grid g2"><div class="az-card"><div class="az-card-head"><h3>试用即将到期</h3><div class="sub">未来 7 天</div></div><div class="az-card-body">' + (d.trialsEnding.length ? d.trialsEnding.map(function (t) {
            return '<div class="ops-list-item"><span class="avatar-sm orange">试</span><div style="flex:1"><b>' + O.esc(t.name) + '</b><span>' + O.planLabel(t.plan) + ' · 到期 ' + O.fmtTime(t.trial_ends_at) + '</span></div><button class="au-btn au-btn--ghost au-btn--xs" data-go="workspaces">处理</button></div>';
          }).join('') : '<div class="ops-empty">暂无即将到期试用</div>') + '</div></div>' +
          '<div class="az-card"><div class="az-card-head"><h3>套餐分布</h3></div><div class="az-card-body">' + d.plans.map(function (p) {
            return '<div class="bar-row"><span class="bar-label">' + O.planLabel(p.plan) + '</span><span class="bar-track"><span class="bar-fill" style="width:' + Math.min(100, p.c / Math.max(1, d.metrics.workspaces) * 100) + '%"></span></span><span class="bar-val">' + p.c + '</span></div>';
          }).join('') + '</div></div></div>';
        O.$$('[data-go]', root).forEach(function (b) { b.onclick = function () { O.go(b.getAttribute('data-go')); }; });
      }).catch(function (e) { O.handle(e); root.querySelector('#ov-body').innerHTML = '<div class="ops-empty">' + O.esc(e.message) + '</div>'; });
    }
  });

  // ---------------- accounts ----------------
  O.register('accounts', {
    title: '客户账号', subtitle: '自助注册与销售开通的统一身份',
    render: function (root) {
      if (!O._acc) O._acc = { q: '', status: '', page: 1 };
      var st = O._acc;
      root.innerHTML = '<div class="page-head"><div><h1>客户账号</h1><p>账号是登录身份，可关联一个或多个工作空间。</p></div></div>' +
        '<div class="az-card"><div class="az-card-body tight" style="padding-bottom:12px"><div class="ops-filters"><input class="au-input" data-q placeholder="搜索姓名、手机号、邮箱" value="' + O.esc(st.q) + '"><select class="au-select" data-status><option value="">全部状态</option><option value="active"' + (st.status === 'active' ? ' selected' : '') + '>正常</option><option value="suspended"' + (st.status === 'suspended' ? ' selected' : '') + '>已停用</option></select><span class="tiny muted" data-total></span></div></div><div id="acc-body">' + skeleton(3) + '</div></div>';
      var t;
      root.querySelector('[data-q]').oninput = function (e) { clearTimeout(t); t = setTimeout(function () { st.q = e.target.value.trim(); st.page = 1; load(root); }, 300); };
      root.querySelector('[data-status]').onchange = function (e) { st.status = e.target.value; st.page = 1; load(root); };
      load(root);
    }
  });
  function load(root) {
    var st = O._acc;
    O.api('/api/ops/accounts?page=' + st.page + '&limit=20' + (st.q ? '&q=' + encodeURIComponent(st.q) : '') + (st.status ? '&status=' + st.status : '')).then(function (d) {
      var body = root.querySelector('#acc-body');
      root.querySelector('[data-total]').textContent = '共 ' + d.total + ' 个账号';
      body.innerHTML = '<div class="table-wrap"><table class="az-table"><thead><tr><th>账号</th><th>工作空间</th><th>套餐</th><th>状态</th><th>风险分</th><th>注册时间</th><th></th></tr></thead><tbody>' +
        (d.accounts.length ? d.accounts.map(function (a) {
          return '<tr><td><div class="flex items-center gap-1"><span class="avatar-sm">' + O.esc((a.name || '?').slice(0, 1)) + '</span><div><div class="u-name">' + O.esc(a.name || '未命名') + '</div><div class="u-sub">' + O.esc(a.phone || a.email || '-') + '</div></div></div></td>' +
            '<td><div style="font-size:11.5px">' + O.esc(a.workspace_names || '-') + '</div><div class="u-sub">' + a.workspace_count + ' 个工作空间</div></td>' +
            '<td>' + (a.plans || '').split(',').filter(Boolean).map(function (p) { return '<span class="pill blue" style="margin-right:2px">' + O.planLabel(p) + '</span>'; }).join('') + '</td>' +
            '<td>' + O.statusPill(a.status) + '</td><td><span class="pill ' + (a.risk_score >= 30 ? 'red' : 'gray') + '">' + a.risk_score + '</span></td>' +
            '<td class="tiny muted">' + O.fmtTime(a.created_at) + '</td><td><button class="au-btn au-btn--ghost au-btn--xs" data-acc="' + a.id + '">详情</button></td></tr>';
        }).join('') : '<tr><td colspan="7"><div class="ops-empty">没有账号</div></td></tr>') + '</tbody></table></div>' + O.pager(d.total, d.page, d.limit, 'data-pg');
      O.$$('[data-acc]', body).forEach(function (b) { b.onclick = function () { openAccount(b.getAttribute('data-acc'), root); }; });
      O.$$('[data-pg]', body).forEach(function (b) { b.onclick = function () { st.page = Number(b.getAttribute('data-pg')); load(root); }; });
    }).catch(function (e) { O.handle(e); });
  }
  function openAccount(id, root) {
    O.api('/api/ops/accounts/' + id).then(function (d) {
      var a = d.account;
      var body = '<div class="ops-detail-grid"><div class="ops-detail-card"><h4>账号信息</h4><b>' + O.esc(a.name || '未命名') + '</b><p>' + O.esc(a.phone || '-') + '<br>' + O.esc(a.email || '-') + '<br>注册来源：' + O.esc(a.signup_source || '-') + '<br>注册 IP：' + O.esc(a.signup_ip || '-') + '<br>注册时间：' + O.fmtTime(a.created_at) + '</p></div>' +
        '<div class="ops-detail-card"><h4>风险与状态</h4><b>' + O.statusPill(a.status) + ' 风险分 ' + a.risk_score + '</b><p>停用账号后，该账号将无法登录任何工作空间。</p><div class="flex gap-1 mt-2"><button class="au-btn au-btn--ghost au-btn--xs" data-risk="30">标记风险 30</button><button class="au-btn au-btn--ghost au-btn--xs" data-risk="60">标记风险 60</button><button class="au-btn au-btn--danger au-btn--xs" data-toggle-acc>' + (a.status === 'active' ? '停用账号' : '恢复账号') + '</button></div></div></div>' +
        '<div class="divider"></div><h4 style="font-size:13px;margin:0 0 8px">关联工作空间</h4>' + (d.workspaces.length ? d.workspaces.map(function (w) {
          return '<div class="ops-list-item"><span class="avatar-sm green">' + O.esc(w.name.slice(0, 1)) + '</span><div style="flex:1"><b>' + O.esc(w.name) + '</b><span>' + O.planLabel(w.plan) + ' · ' + O.planStatusLabel(w.plan_status) + ' · ' + w.sites + ' 站点 · ' + w.conversations + ' 会话 · ' + w.leads + ' 线索</span></div><div class="right">' + (w.installed_at ? '<span class="pill green">已安装</span>' : '<span class="pill gray">未安装</span>') + '</div></div>';
        }).join('') : '<div class="ops-empty">没有工作空间</div>') +
        (d.applications.length ? '<div class="divider"></div><h4 style="font-size:13px;margin:0 0 8px">关联申请</h4>' + d.applications.map(function (x) { return '<div class="ops-list-item"><span class="avatar-sm gray">申</span><div style="flex:1"><b>' + O.esc(x.name) + ' · ' + O.esc(x.company || '') + '</b><span>' + O.esc(x.phone || '') + '</span></div><div class="right">' + O.statusPill(x.status) + '</div></div>'; }).join('') : '');
      var m = O.modal({ title: '账号详情', size: 'wide', body: body, footer: [{ label: '关闭', class: 'au-btn--ghost' }] });
      O.$$('[data-risk]', m.el).forEach(function (b) { b.onclick = function () { updateAccount(a.id, { risk_score: Number(b.getAttribute('data-risk')) }, m, root); }; });
      m.el.querySelector('[data-toggle-acc]').onclick = function () { updateAccount(a.id, { status: a.status === 'active' ? 'suspended' : 'active' }, m, root); };
    }).catch(O.handle);
  }
  function updateAccount(id, payload, m, root) {
    O.api('/api/ops/accounts/' + id, { method: 'PATCH', body: payload }).then(function () { m.close(); O.toast('账号已更新', 'ok'); load(root); }).catch(O.handle);
  }

  // ---------------- workspaces ----------------
  O.register('workspaces', {
    title: '工作空间', subtitle: '套餐、试用、安装与用量',
    render: function (root) {
      if (!O._ws) O._ws = { q: '', plan: '', plan_status: '', status: '', page: 1 };
      var st = O._ws;
      root.innerHTML = '<div class="page-head"><div><h1>工作空间</h1><p>工作空间是客户的数据边界，也是套餐与试用的承载单位。</p></div></div>' +
        '<div class="az-card"><div class="az-card-body tight" style="padding-bottom:12px"><div class="ops-filters"><input class="au-input" data-q placeholder="搜索名称、来源或 ID" value="' + O.esc(st.q) + '"><select class="au-select" data-plan><option value="">全部套餐</option><option value="free">免费版</option><option value="standard">标准版</option><option value="pro">专业版</option><option value="enterprise">企业版</option></select><select class="au-select" data-pstatus><option value="">全部订阅状态</option><option value="active">正常</option><option value="trialing">试用中</option><option value="expired">已过期</option></select><select class="au-select" data-tstatus><option value="">全部空间状态</option><option value="active">正常</option><option value="suspended">已停用</option></select><span class="tiny muted" data-total></span></div></div><div id="ws-body">' + skeleton(3) + '</div></div>';
      var t;
      root.querySelector('[data-q]').oninput = function (e) { clearTimeout(t); t = setTimeout(function () { st.q = e.target.value.trim(); st.page = 1; loadWs(root); }, 300); };
      root.querySelector('[data-plan]').onchange = function (e) { st.plan = e.target.value; st.page = 1; loadWs(root); };
      root.querySelector('[data-pstatus]').onchange = function (e) { st.plan_status = e.target.value; st.page = 1; loadWs(root); };
      root.querySelector('[data-tstatus]').onchange = function (e) { st.status = e.target.value; st.page = 1; loadWs(root); };
      loadWs(root);
    }
  });
  function loadWs(root) {
    var st = O._ws;
    O.api('/api/ops/workspaces?page=' + st.page + '&limit=20' + (st.q ? '&q=' + encodeURIComponent(st.q) : '') + (st.plan ? '&plan=' + st.plan : '') + (st.plan_status ? '&plan_status=' + st.plan_status : '') + (st.status ? '&status=' + st.status : '')).then(function (d) {
      var body = root.querySelector('#ws-body');
      root.querySelector('[data-total]').textContent = '共 ' + d.total + ' 个工作空间';
      body.innerHTML = '<div class="table-wrap"><table class="az-table"><thead><tr><th>工作空间</th><th>负责人</th><th>套餐</th><th>试用/到期</th><th>用量</th><th>安装</th><th></th></tr></thead><tbody>' +
        (d.workspaces.length ? d.workspaces.map(function (w) {
          return '<tr><td><div class="u-name">' + O.esc(w.name) + ' <span class="pill gray" style="font-size:9px">#' + w.id + '</span></div><div class="u-sub">来源 ' + O.esc(w.signup_source || '-') + ' · ' + w.members + ' 成员</div></td>' +
            '<td><div class="u-sub">' + O.esc(w.owner_name || '-') + '</div><div class="u-sub">' + O.esc(w.owner_phone || w.owner_email || '') + '</div></td>' +
            '<td><span class="pill blue">' + O.planLabel(w.plan) + '</span> <span class="pill ' + (w.plan_status === 'trialing' ? 'orange' : w.plan_status === 'expired' ? 'gray' : 'green') + '">' + O.planStatusLabel(w.plan_status) + '</span></td>' +
            '<td class="tiny muted">' + (w.trial_ends_at ? O.fmtTime(w.trial_ends_at) : O.planStatusLabel(w.plan_status)) + '</td>' +
            '<td class="tiny">' + w.visitors + ' 访客 · ' + w.conversations + ' 会话 · ' + w.leads + ' 线索</td>' +
            '<td>' + (w.installed_at ? '<span class="pill green">已安装</span>' : '<span class="pill gray">未安装</span>') + '</td>' +
            '<td><button class="au-btn au-btn--ghost au-btn--xs" data-ws="' + w.id + '">详情</button></td></tr>';
        }).join('') : '<tr><td colspan="7"><div class="ops-empty">没有工作空间</div></td></tr>') + '</tbody></table></div>' + O.pager(d.total, d.page, d.limit, 'data-pg');
      O.$$('[data-ws]', body).forEach(function (b) { b.onclick = function () { openWs(b.getAttribute('data-ws'), root); }; });
      O.$$('[data-pg]', body).forEach(function (b) { b.onclick = function () { st.page = Number(b.getAttribute('data-pg')); loadWs(root); }; });
    }).catch(O.handle);
  }
  function openWs(id, root) {
    O.api('/api/ops/workspaces/' + id).then(function (d) {
      var t = d.tenant;
      var members = d.members.map(function (m) { return '<div class="ops-list-item"><span class="avatar-sm">' + O.esc(m.name.slice(0, 1)) + '</span><div style="flex:1"><b>' + O.esc(m.name) + ' · ' + O.esc(m.role) + '</b><span>' + O.esc(m.account_phone || m.account_email || m.email || '') + '</span></div><span class="pill ' + (m.status === 'active' ? 'green' : 'gray') + '">' + (m.status === 'active' ? '正常' : '停用') + '</span></div>'; }).join('');
      var sites = d.sites.map(function (s) { return '<div class="ops-list-item"><span class="avatar-sm green">站</span><div style="flex:1"><b>' + O.esc(s.name) + '</b><span>' + O.esc(s.domain || s.site_key) + '</span></div><div class="right">' + (s.installed_at ? '<span class="pill green">已安装</span>' : '<span class="pill gray">未安装</span>') + '</div></div>'; }).join('');
      var body = '<div class="ops-detail-grid"><div class="ops-detail-card"><h4>工作空间</h4><b>' + O.esc(t.name) + '</b><p>#' + t.id + '<br>来源：' + O.esc(t.signup_source || '-') + '<br>注册 IP：' + O.esc(t.signup_ip || '-') + '<br>创建时间：' + O.fmtTime(t.created_at) + '</p></div>' +
        '<div class="ops-detail-card"><h4>套餐与试用</h4><b>' + O.planLabel(t.plan) + ' · ' + O.planStatusLabel(t.plan_status) + '</b><p>试用到期：' + O.fmtTime(t.trial_ends_at) + '<br>风险分：' + t.risk_score + ' · 状态：' + O.statusPill(t.status) + '</p></div></div>' +
        '<div class="flex gap-1 mt-2 wrap"><select class="az-select" data-plan style="width:120px">' + ['free', 'standard', 'pro', 'enterprise'].map(function (p) { return '<option value="' + p + '"' + (t.plan === p ? ' selected' : '') + '>' + O.planLabel(p) + '</option>'; }).join('') + '</select><button class="au-btn au-btn--ghost au-btn--xs" data-save-plan>保存套餐</button><button class="au-btn au-btn--ghost au-btn--xs" data-extend>延长试用 7 天</button><button class="au-btn au-btn--' + (t.status === 'active' ? 'danger' : 'success') + ' au-btn--xs" data-toggle-ws>' + (t.status === 'active' ? '停用工作空间' : '恢复工作空间') + '</button></div>' +
        '<div class="divider"></div><div class="grid g2"><div><h4 style="font-size:12px;margin:0 0 7px">成员</h4>' + (members || '<div class="ops-empty">暂无成员</div>') + '</div><div><h4 style="font-size:12px;margin:0 0 7px">站点</h4>' + (sites || '<div class="ops-empty">暂无站点</div>') + '</div></div>' +
        '<div class="divider"></div><h4 style="font-size:12px;margin:0 0 7px">关联申请</h4>' + (d.applications.length ? d.applications.map(function (a) { return '<div class="ops-list-item"><span class="avatar-sm gray">申</span><div style="flex:1"><b>' + O.esc(a.name) + ' · ' + O.esc(a.company || '') + '</b><span>' + O.esc(a.phone || '') + '</span></div><div class="right">' + O.statusPill(a.status) + '</div></div>'; }).join('') : '<div class="ops-empty">无关联申请</div>');
      var m = O.modal({ title: '工作空间详情', size: 'wide', body: body, footer: [{ label: '关闭', class: 'au-btn--ghost' }] });
      m.el.querySelector('[data-save-plan]').onclick = function () {
        O.api('/api/ops/workspaces/' + t.id, { method: 'PATCH', body: { plan: m.el.querySelector('[data-plan]').value } }).then(function () { m.close(); O.toast('套餐已更新', 'ok'); loadWs(root); }).catch(O.handle);
      };
      m.el.querySelector('[data-extend]').onclick = function () {
        var base = t.trial_ends_at ? new Date(String(t.trial_ends_at).replace(' ', 'T') + 'Z').getTime() : Date.now();
        var next = new Date(Math.max(Date.now(), base) + 7 * 86400000).toISOString().slice(0, 19).replace('T', ' ');
        O.api('/api/ops/workspaces/' + t.id, { method: 'PATCH', body: { trial_ends_at: next, plan_status: 'trialing' } }).then(function () { m.close(); O.toast('试用已延长 7 天', 'ok'); loadWs(root); }).catch(O.handle);
      };
      m.el.querySelector('[data-toggle-ws]').onclick = function () {
        O.api('/api/ops/workspaces/' + t.id, { method: 'PATCH', body: { status: t.status === 'active' ? 'suspended' : 'active' } }).then(function () { m.close(); O.toast('工作空间状态已更新', 'ok'); loadWs(root); }).catch(O.handle);
      };
    }).catch(O.handle);
  }

  // ---------------- applications ----------------
  O.register('applications', {
    title: '申请线索', subtitle: 'B 端申请、跟进与转工作空间',
    render: function (root) {
      if (!O._apps) O._apps = { q: '', status: '', owner: '', page: 1 };
      var st = O._apps;
      root.innerHTML = '<div class="page-head"><div><h1>申请线索</h1><p>落地页与销售申请进入平台线索池，与客户自己的线索 CRM 完全分离。</p></div><button class="au-btn au-btn--primary au-btn--sm" data-add-app>手动录入</button></div>' +
        '<div class="az-card"><div class="az-card-body tight" style="padding-bottom:12px"><div id="app-stats" class="flex gap-1 wrap mb-2"></div><div class="ops-filters"><input class="au-input" data-q placeholder="搜索姓名、手机号、公司" value="' + O.esc(st.q) + '"><select class="au-select" data-status><option value="">全部状态</option></select><span class="tiny muted" data-total></span></div></div><div id="app-body">' + skeleton(3) + '</div></div>';
      var t;
      root.querySelector('[data-q]').oninput = function (e) { clearTimeout(t); t = setTimeout(function () { st.q = e.target.value.trim(); st.page = 1; loadApps(root); }, 300); };
      root.querySelector('[data-status]').onchange = function (e) { st.status = e.target.value; st.page = 1; loadApps(root); };
      root.querySelector('[data-add-app]').onclick = function () { addApplication(root); };
      loadApps(root);
    }
  });
  function loadApps(root) {
    var st = O._apps;
    O.api('/api/ops/applications?page=' + st.page + '&limit=20' + (st.q ? '&q=' + encodeURIComponent(st.q) : '') + (st.status ? '&status=' + st.status : '')).then(function (d) {
      var sel = root.querySelector('[data-status]');
      sel.innerHTML = '<option value="">全部状态</option>' + d.statuses.map(function (s) { return '<option value="' + s + '"' + (st.status === s ? ' selected' : '') + '>' + d.labels[s] + '</option>'; }).join('');
      root.querySelector('#app-stats').innerHTML = [['all', '全部'], ['new', '新申请'], ['contacted', '已联系'], ['qualified', '已确认'], ['won', '已成交']].map(function (x) { return '<button class="au-chip ' + (st.status === (x[0] === 'all' ? '' : x[0]) ? 'active' : '') + '" data-stat="' + (x[0] === 'all' ? '' : x[0]) + '">' + x[1] + ' <b>' + (d.stats[x[0]] || 0) + '</b></button>'; }).join('');
      O.$$('[data-stat]', root).forEach(function (b) { b.onclick = function () { st.status = b.getAttribute('data-stat'); st.page = 1; loadApps(root); }; });
      root.querySelector('[data-total]').textContent = '共 ' + d.total + ' 条';
      var body = root.querySelector('#app-body');
      body.innerHTML = '<div class="table-wrap"><table class="az-table"><thead><tr><th>申请</th><th>公司与需求</th><th>来源</th><th>状态</th><th>负责人</th><th>时间</th><th></th></tr></thead><tbody>' +
        (d.applications.length ? d.applications.map(function (a) {
          return '<tr><td><div class="u-name">' + O.esc(a.name) + '</div><div class="u-sub">' + O.esc(a.phone || a.email || '') + '</div></td>' +
            '<td><div class="u-sub">' + O.esc(a.company || '个人') + '</div><div class="u-sub">' + O.esc(a.channel || a.message || '') + '</div></td>' +
            '<td><span class="pill ' + (a.source === 'pql' ? 'purple' : 'gray') + '">' + O.esc(O.sourceLabel(a.source)) + '</span></td>' +
            '<td>' + O.statusPill(a.status) + '</td><td class="tiny">' + O.esc(a.owner_name || '未分配') + '</td><td class="tiny muted">' + O.timeAgo(a.created_at) + '</td>' +
            '<td><button class="au-btn au-btn--ghost au-btn--xs" data-app="' + a.id + '">跟进</button></td></tr>';
        }).join('') : '<tr><td colspan="7"><div class="ops-empty">暂无申请</div></td></tr>') + '</tbody></table></div>' + O.pager(d.total, d.page, d.limit, 'data-pg');
      O.$$('[data-app]', body).forEach(function (b) { b.onclick = function () { openApp(b.getAttribute('data-app'), root); }; });
      O.$$('[data-pg]', body).forEach(function (b) { b.onclick = function () { st.page = Number(b.getAttribute('data-pg')); loadApps(root); }; });
    }).catch(O.handle);
  }
  function addApplication(root) {
    O.modal({
      title: '手动录入申请', body: '<div class="form-grid"><div><label class="field-label">姓名 *</label><input class="az-input" data-a="name"></div><div><label class="field-label">手机号 *</label><input class="az-input" data-a="phone"></div><div><label class="field-label">公司</label><input class="az-input" data-a="company"></div><div><label class="field-label">邮箱</label><input class="az-input" data-a="email"></div><div class="full"><label class="field-label">需求</label><textarea class="az-textarea" data-a="message"></textarea></div></div>',
      footer: [{ label: '取消', class: 'au-btn--ghost' }, { label: '创建', class: 'au-btn--primary', onClick: function (card, close) {
        var body = {};
        O.$$('[data-a]', card).forEach(function (i) { body[i.getAttribute('data-a')] = i.value.trim(); });
        O.api('/api/ops/applications', { body: body }).then(function () { close(); O.toast('申请已创建', 'ok'); loadApps(root); }).catch(O.handle);
      } }]
    });
  }
  function openApp(id, root) {
    Promise.all([O.api('/api/ops/applications/' + id), O.api('/api/ops/team')]).then(function (res) {
      var d = res[0], team = res[1].users.filter(function (u) { return u.status === 'active'; });
      var a = d.application;
      var options = team.map(function (u) { return '<option value="' + u.id + '"' + (a.owner_id === u.id ? ' selected' : '') + '>' + O.esc(u.name) + ' · ' + O.roleLabel(u.role) + '</option>'; }).join('');
      var body = '<div class="ops-detail-grid"><div class="ops-detail-card"><h4>申请信息</h4><b>' + O.esc(a.name) + ' · ' + O.esc(a.company || '个人') + '</b><p>' + O.esc(a.phone || '') + '<br>' + O.esc(a.email || '') + '<br>' + O.esc(a.website || '') + '<br>来源：' + O.esc(a.source) + '<br>渠道：' + O.esc(a.channel || '-') + '<br>需求：' + O.esc(a.message || '-') + '</p></div>' +
        '<div class="ops-detail-card"><h4>状态与归属</h4><div class="grid" style="gap:8px"><select class="az-select" data-status>' + d.statuses.map(function (s) { return '<option value="' + s + '"' + (a.status === s ? ' selected' : '') + '>' + d.labels[s] + '</option>'; }).join('') + '</select><select class="az-select" data-owner><option value="">未分配</option>' + options + '</select><div class="flex gap-1"><button class="au-btn au-btn--primary au-btn--xs" data-save>保存</button>' + (a.tenant_id ? '<span class="pill green">已开通工作空间</span>' : '<button class="au-btn au-btn--warning au-btn--xs" data-convert>转为工作空间</button>') + '</div></div></div></div>' +
        '<div class="divider"></div><div class="grid g2"><div><h4 style="font-size:12px;margin:0 0 7px">跟进时间线</h4><div class="ops-timeline">' + (d.activities.length ? d.activities.map(function (x) { return '<div class="ops-timeline-item"><b>' + O.esc(x.content) + '</b><span>' + O.esc(x.user_name || '系统') + ' · ' + O.fmtTime(x.created_at) + '</span></div>'; }).join('') : '<div class="ops-empty">还没有跟进记录</div>') + '</div></div>' +
        '<div><h4 style="font-size:12px;margin:0 0 7px">添加跟进</h4><textarea class="az-textarea" data-note placeholder="记录电话、微信、演示或报价情况..."></textarea><button class="au-btn au-btn--primary au-btn--sm mt-1" data-add-note>保存跟进</button></div></div>' +
        (d.workspace ? '<div class="notice ok mt-2">已关联工作空间：' + O.esc(d.workspace.name) + ' · ' + O.planLabel(d.workspace.plan) + ' · ' + O.planStatusLabel(d.workspace.plan_status) + '</div>' : '');
      var m = O.modal({ title: '申请跟进', size: 'wide', body: body, footer: [{ label: '关闭', class: 'au-btn--ghost' }] });
      m.el.querySelector('[data-save]').onclick = function () {
        O.api('/api/ops/applications/' + a.id, { method: 'PATCH', body: { status: m.el.querySelector('[data-status]').value, owner_id: m.el.querySelector('[data-owner]').value || null } }).then(function () { m.close(); O.toast('申请已更新', 'ok'); loadApps(root); }).catch(O.handle);
      };
      m.el.querySelector('[data-add-note]').onclick = function () {
        var note = m.el.querySelector('[data-note]').value.trim();
        if (!note) return O.toast('请输入跟进内容', 'err');
        O.api('/api/ops/applications/' + a.id + '/activities', { body: { content: note } }).then(function () { m.close(); O.toast('跟进已记录', 'ok'); loadApps(root); }).catch(O.handle);
      };
      var conv = m.el.querySelector('[data-convert]');
      if (conv) conv.onclick = function () { m.close(); convertApp(a, root); };
    }).catch(O.handle);
  }
  function convertApp(a, root) {
    var m = O.modal({
      title: '转为工作空间', subtitle: '会创建账号与工作空间，客户登录后添加自己的网站',
      body: '<div class="grid"><div><label class="field-label">工作空间名称</label><input class="az-input" data-cv="name" value="' + O.esc(a.company || a.name + ' 的工作空间') + '"></div><div><label class="field-label">开通套餐</label><select class="az-select" data-cv="plan"><option value="pro">专业版 14 天试用</option><option value="standard">标准版 14 天试用</option><option value="free">免费版</option></select></div><div class="ops-callout">如果手机号已有账号，会直接增加一个工作空间成员关系；没有账号会创建账号并返回临时密码。</div></div>',
      footer: [{ label: '取消', class: 'au-btn--ghost' }, { label: '开通工作空间', class: 'au-btn--primary', onClick: function (card, close) {
        var name = card.querySelector('[data-cv="name"]').value.trim();
        var plan = card.querySelector('[data-cv="plan"]').value;
        O.api('/api/ops/applications/' + a.id + '/convert', { body: { workspaceName: name, plan: plan } }).then(function (r) {
          close();
          O.modal({ title: '工作空间已开通', body: '<div class="notice ok">客户账号：' + O.esc(r.account.phone || r.account.email || '') + (r.temp_password ? '<br>临时密码：<b>' + O.esc(r.temp_password) + '</b>（仅显示一次，请转交客户）' : '<br>客户已有账号，直接登录即可。') + '</div><div class="side-kv mt-2"><span>工作空间</span><b>' + O.esc(r.tenant.name) + '</b></div><div class="side-kv"><span>下一步</span><b>客户登录后添加自己的网站</b></div>', footer: [{ label: '关闭', class: 'au-btn--ghost' }] });
          loadApps(root);
        }).catch(O.handle);
      } }]
    });
  }

  // ---------------- subscriptions ----------------
  O.register('subscriptions', {
    title: '订阅与试用', subtitle: '套餐分布、试用到期与订阅状态',
    render: function (root) {
      root.innerHTML = '<div id="sub-body">' + skeleton(3) + '</div>';
      O.api('/api/ops/subscriptions').then(function (d) {
        var planMap = {};
        d.plans.forEach(function (p) { planMap[p.plan] = (planMap[p.plan] || 0) + p.c; });
        root.querySelector('#sub-body').innerHTML =
          '<div class="ops-metric-grid section-gap"><div class="ops-metric"><span>已收金额</span><b>¥' + Number(d.revenue || 0).toLocaleString('zh-CN') + '</b><em>' + (d.paidOrders || 0) + ' 笔已支付</em></div>' + d.catalog.map(function (p) {
            return '<div class="ops-metric"><span>' + p.name + '</span><b>' + (planMap[p.code] || 0) + '</b><em>' + (p.price ? '¥' + p.price + '/月起' : p.code === 'enterprise' ? '定制' : '免费') + '</em></div>';
          }).join('') + '</div>' +
          '<div class="grid g2 section-gap"><div class="az-card"><div class="az-card-head"><div><h3>试用中的工作空间</h3><div class="sub">按到期时间排序</div></div></div><div class="az-card-body">' + (d.trials.length ? d.trials.map(function (t) {
            return '<div class="ops-list-item"><span class="avatar-sm orange">试</span><div style="flex:1"><b>' + O.esc(t.name) + ' · ' + O.esc(t.owner_name || '-') + '</b><span>' + O.planLabel(t.plan) + ' · 到期 ' + O.fmtTime(t.trial_ends_at) + '</span></div><button class="au-btn au-btn--ghost au-btn--xs" data-ws-go="' + t.id + '">查看</button></div>';
          }).join('') : '<div class="ops-empty">暂无试用</div>') + '</div></div>' +
          '<div class="az-card"><div class="az-card-head"><h3>3 天内到期</h3><div class="sub">建议提前触达</div></div><div class="az-card-body">' + (d.expiring.length ? d.expiring.map(function (t) { return '<div class="ops-list-item"><span class="avatar-sm red">!</span><div style="flex:1"><b>' + O.esc(t.name) + '</b><span>到期 ' + O.fmtTime(t.trial_ends_at) + '</span></div></div>'; }).join('') : '<div class="ops-empty">暂无临期</div>') + '</div></div></div>' +
          '<div class="az-card section-gap"><div class="az-card-head"><div><h3>订单记录</h3><div class="sub">支付回调与订阅开通结果</div></div></div><div class="az-card-body flush"><div class="table-wrap"><table class="az-table"><thead><tr><th>订单号</th><th>工作空间</th><th>套餐</th><th>金额</th><th>状态</th><th>创建时间</th></tr></thead><tbody>' + (d.orders && d.orders.length ? d.orders.map(function (o) { return '<tr><td class="mono" style="font-size:10px">' + O.esc(o.order_no) + '</td><td>' + O.esc(o.tenant_name) + '</td><td>' + O.planLabel(o.plan) + ' · ' + (o.cycle === 'yearly' ? '年付' : '月付') + '</td><td>¥' + (o.amount_cents / 100).toLocaleString('zh-CN') + '</td><td>' + O.statusPill(o.status) + '</td><td class="tiny muted">' + O.fmtTime(o.created_at) + '</td></tr>'; }).join('') : '<tr><td colspan="6"><div class="ops-empty">暂无订单</div></td></tr>') + '</tbody></table></div></div></div>' +
          '<div class="az-card"><div class="az-card-head"><h3>最近订阅变化</h3></div><div class="az-card-body flush"><div class="table-wrap"><table class="az-table"><thead><tr><th>工作空间</th><th>套餐</th><th>状态</th><th>来源</th><th>站点</th><th>创建时间</th></tr></thead><tbody>' +
          d.recent.map(function (t) { return '<tr><td><b>' + O.esc(t.name) + '</b></td><td>' + O.planLabel(t.plan) + '</td><td>' + O.statusPill(t.plan_status) + '</td><td>' + O.esc(t.signup_source || '-') + '</td><td>' + t.sites + '</td><td class="tiny muted">' + O.fmtTime(t.created_at) + '</td></tr>'; }).join('') + '</tbody></table></div></div></div>';
        O.$$('[data-ws-go]', root).forEach(function (b) { b.onclick = function () { O.go('workspaces'); }; });
      }).catch(O.handle);
    }
  });

  // ---------------- risk ----------------
  O.register('risk', {
    title: '风控审核', subtitle: '高风险账号、工作空间与异常注册',
    render: function (root) {
      root.innerHTML = '<div id="risk-body">' + skeleton(3) + '</div>';
      O.api('/api/ops/risk').then(function (d) {
        root.querySelector('#risk-body').innerHTML =
          '<div class="notice warn mb-2">风险分来自同 IP 批量注册、一次性邮箱与人工标记。命中后建议人工确认，再决定停用或放行。</div>' +
          '<div class="grid g2"><div class="az-card"><div class="az-card-head"><h3>高风险账号</h3><div class="sub">风险分 ≥ 30 或已停用</div></div><div class="az-card-body">' + (d.accounts.length ? d.accounts.map(function (a) {
            return '<div class="ops-list-item"><span class="avatar-sm red">' + O.esc((a.name || '?').slice(0, 1)) + '</span><div style="flex:1"><b>' + O.esc(a.name || '未命名') + ' · 风险 ' + a.risk_score + '</b><span>' + O.esc(a.phone || a.email || '') + ' · ' + O.statusPill(a.status) + '</span></div><button class="au-btn au-btn--ghost au-btn--xs" data-risk-acc="' + a.id + '">处理</button></div>';
          }).join('') : '<div class="ops-empty">暂无高风险账号</div>') + '</div></div>' +
          '<div class="az-card"><div class="az-card-head"><h3>高风险工作空间</h3></div><div class="az-card-body">' + (d.workspaces.length ? d.workspaces.map(function (w) {
            return '<div class="ops-list-item"><span class="avatar-sm orange">' + O.esc(w.name.slice(0, 1)) + '</span><div style="flex:1"><b>' + O.esc(w.name) + ' · 风险 ' + w.risk_score + '</b><span>' + O.planLabel(w.plan) + ' · ' + O.statusPill(w.status) + ' · ' + O.esc(w.signup_ip || '') + '</span></div></div>';
          }).join('') : '<div class="ops-empty">暂无高风险工作空间</div>') + '</div></div></div>' +
          '<div class="az-card mt-2"><div class="az-card-head"><h3>同 IP 批量注册</h3><div class="sub">同一 IP ≥ 3 个账号</div></div><div class="az-card-body flush"><div class="table-wrap"><table class="az-table"><thead><tr><th>IP</th><th>账号数</th><th>账号</th></tr></thead><tbody>' +
          (d.repeatedIps.length ? d.repeatedIps.map(function (r) { return '<tr><td class="mono">' + O.esc(r.signup_ip) + '</td><td><span class="pill red">' + r.c + '</span></td><td class="tiny">' + O.esc(r.names) + '</td></tr>'; }).join('') : '<tr><td colspan="3"><div class="ops-empty">暂无异常 IP</div></td></tr>') + '</tbody></table></div></div>';
        O.$$('[data-risk-acc]', root).forEach(function (b) { b.onclick = function () { O.go('accounts'); }; });
      }).catch(O.handle);
    }
  });

  // ---------------- team ----------------
  O.register('team', {
    title: '平台成员', subtitle: '运营、销售、财务与支持账号',
    render: function (root) {
      root.innerHTML = '<div class="page-head"><div><h1>平台成员</h1><p>平台账号与客户账号完全隔离，只有这里的人能进入运营后台。</p></div>' + (O.state.user.role === 'superadmin' ? '<button class="au-btn au-btn--primary au-btn--sm" data-add-ops>添加成员</button>' : '') + '</div><div class="az-card" id="team-body">' + skeleton(3) + '</div>';
      var add = root.querySelector('[data-add-ops]');
      if (add) add.onclick = function () { addOps(root); };
      loadTeam(root);
    }
  });
  function loadTeam(root) {
    O.api('/api/ops/team').then(function (d) {
      var body = root.querySelector('#team-body');
      body.innerHTML = '<div class="table-wrap"><table class="az-table"><thead><tr><th>成员</th><th>角色</th><th>状态</th><th>最近登录</th><th>创建时间</th><th></th></tr></thead><tbody>' +
        d.users.map(function (u) {
          return '<tr><td><div class="flex items-center gap-1"><span class="avatar-sm purple">' + O.esc(u.name.slice(0, 1)) + '</span><div><div class="u-name">' + O.esc(u.name) + '</div><div class="u-sub">' + O.esc(u.email) + '</div></div></div></td><td>' + O.roleLabel(u.role) + '</td><td>' + O.statusPill(u.status) + '</td><td class="tiny muted">' + (u.last_login_at ? O.timeAgo(u.last_login_at) : '从未登录') + '</td><td class="tiny muted">' + O.fmtTime(u.created_at) + '</td><td>' + (O.state.user.role === 'superadmin' ? '<button class="au-btn au-btn--ghost au-btn--xs" data-edit-ops="' + u.id + '">编辑</button>' : '') + '</td></tr>';
        }).join('') + '</tbody></table></div>';
      O.$$('[data-edit-ops]', body).forEach(function (b) {
        b.onclick = function () {
          var u = d.users.filter(function (x) { return String(x.id) === b.getAttribute('data-edit-ops'); })[0];
          O.modal({ title: '编辑平台成员', body: '<div class="grid"><div><label class="field-label">姓名</label><input class="az-input" data-o="name" value="' + O.esc(u.name) + '"></div><div><label class="field-label">角色</label><select class="az-select" data-o="role">' + ['superadmin', 'ops', 'sales', 'support', 'finance'].map(function (r) { return '<option value="' + r + '"' + (u.role === r ? ' selected' : '') + '>' + O.roleLabel(r) + '</option>'; }).join('') + '</select></div><div><label class="field-label">状态</label><select class="az-select" data-o="status"><option value="active"' + (u.status === 'active' ? ' selected' : '') + '>正常</option><option value="disabled"' + (u.status === 'disabled' ? ' selected' : '') + '>停用</option></select></div><div><label class="field-label">重置密码（留空不改）</label><input class="az-input" data-o="password" type="password"></div></div>', footer: [{ label: '取消', class: 'au-btn--ghost' }, { label: '保存', class: 'au-btn--primary', onClick: function (card, close) { var body = {}; O.$$('[data-o]', card).forEach(function (i) { if (i.value.trim()) body[i.getAttribute('data-o')] = i.value.trim(); }); O.api('/api/ops/team/' + u.id, { method: 'PATCH', body: body }).then(function () { close(); O.toast('成员已更新', 'ok'); loadTeam(root); }).catch(O.handle); } }] });
        };
      });
    }).catch(O.handle);
  }
  function addOps(root) {
    O.modal({ title: '添加平台成员', body: '<div class="form-grid"><div><label class="field-label">姓名</label><input class="az-input" data-o="name"></div><div><label class="field-label">邮箱</label><input class="az-input" data-o="email"></div><div><label class="field-label">初始密码</label><input class="az-input" data-o="password" type="password"></div><div><label class="field-label">角色</label><select class="az-select" data-o="role"><option value="ops">运营</option><option value="sales">销售</option><option value="support">支持</option><option value="finance">财务</option><option value="superadmin">超级管理员</option></select></div></div>', footer: [{ label: '取消', class: 'au-btn--ghost' }, { label: '创建', class: 'au-btn--primary', onClick: function (card, close) { var body = {}; O.$$('[data-o]', card).forEach(function (i) { body[i.getAttribute('data-o')] = i.value.trim(); }); O.api('/api/ops/team', { body: body }).then(function () { close(); O.toast('成员已创建', 'ok'); loadTeam(root); }).catch(O.handle); } }] });
  }

  // ---------------- logs ----------------
  O.register('logs', {
    title: '操作日志', subtitle: '平台级审计记录',
    render: function (root) {
      O.api('/api/ops/audit-logs').then(function (d) {
        root.innerHTML = '<div class="az-card"><div class="az-card-body flush"><div class="table-wrap"><table class="az-table"><thead><tr><th>时间</th><th>操作人</th><th>动作</th><th>对象</th><th>详情</th><th>IP</th></tr></thead><tbody>' +
          (d.logs.length ? d.logs.map(function (l) { return '<tr><td class="tiny muted">' + O.fmtTime(l.created_at) + '</td><td>' + O.esc(l.user_name || '系统') + '</td><td><span class="pill gray">' + O.esc(l.action) + '</span></td><td class="tiny">' + O.esc(l.target || '-') + '</td><td class="tiny muted">' + O.esc(l.detail || '') + '</td><td class="tiny mono">' + O.esc(l.ip || '-') + '</td></tr>'; }).join('') : '<tr><td colspan="6"><div class="ops-empty">暂无日志</div></td></tr>') + '</tbody></table></div></div></div>';
      }).catch(O.handle);
    }
  });

  function skeleton(n) { return '<div class="az-card pad">' + Array.from({ length: n }).map(function () { return '<div class="au-skeleton" style="margin-bottom:12px"></div>'; }).join('') + '</div>'; }
})();
