/* Team, billing, settings, AI, notifications, logs */
(function () {
  'use strict';
  var A = window.Admin;
  var D = A.data;
  var ROLE = { admin: '管理员', operator: '运营', agent: '客服' };

  // ---------------- team ----------------
  A.registerPage('team', {
    title: '团队与权限', subtitle: 'RBAC：管理员 / 运营 / 客服',
    roles: ['admin', 'operator'],
    render: function (root) {
      root.innerHTML = '<div class="page-head"><div><h1>团队与权限</h1><p>客服只能接待对话；运营可配置站点与报表；管理员拥有全部权限。</p></div><div class="head-actions"><button class="au-btn au-btn--primary au-btn--sm" data-add-user>' + A.icon('plus', 14) + ' 添加子账号</button></div></div><div id="team-body">' + A.skeleton(3) + '</div>';
      root.querySelector('[data-add-user]').onclick = function () { openAddUser(root); };
      var teamBox = root.querySelector('#team-body');
      A.api('/api/users').then(function (d) {
        if (!teamBox || !root.contains(teamBox)) return;
        var box = teamBox;
        box.innerHTML = '<div class="grid g3 mb-2">' +
          '<div class="metric-card"><div class="m-top"><span class="m-label">团队账号</span><span class="m-ico">' + A.icon('users', 14) + '</span></div><div class="m-value">' + d.users.filter(function (u) { return u.status === 'active'; }).length + '<small> / ' + (d.limit === -1 ? '不限' : d.limit) + '</small></div><div class="m-sub">当前套餐坐席</div></div>' +
          '<div class="metric-card"><div class="m-top"><span class="m-label">客服</span><span class="m-ico green">' + A.icon('chat', 14) + '</span></div><div class="m-value">' + d.users.filter(function (u) { return u.role === 'agent'; }).length + '</div><div class="m-sub">专注接待与线索跟进</div></div>' +
          '<div class="metric-card"><div class="m-top"><span class="m-label">管理员</span><span class="m-ico purple">' + A.icon('shield', 14) + '</span></div><div class="m-value">' + d.users.filter(function (u) { return u.role === 'admin'; }).length + '</div><div class="m-sub">可管理配置与计费</div></div></div>' +
          '<div class="az-card"><div class="az-card-body flush"><div class="table-wrap"><table class="az-table"><thead><tr><th>成员</th><th>角色</th><th>接待会话</th><th>线索产出</th><th>最近登录</th><th>状态</th><th></th></tr></thead><tbody>' +
          d.users.map(function (u) {
            return '<tr><td><div class="flex items-center gap-1">' + A.avatarHtml(u, 'avatar-sm', 12) + '<div><div class="u-name">' + A.esc(u.name) + (u.id === A.state.user.id ? ' <span class="pill blue" style="font-size:9px">我</span>' : '') + '</div><div class="u-sub">' + A.esc(u.email) + '</div></div></div></td>' +
              '<td><span class="pill ' + (u.role === 'admin' ? 'purple' : u.role === 'operator' ? 'green' : 'blue') + '">' + ROLE[u.role] + '</span></td>' +
              '<td>' + u.conversations + '</td><td>' + u.leads + '</td><td class="tiny muted">' + (u.last_login_at ? A.timeAgo(u.last_login_at) : '从未登录') + '</td>' +
              '<td>' + (u.status === 'active' ? '<span class="pill green">正常</span>' : '<span class="pill gray">已停用</span>') + '</td>' +
              '<td><div class="flex gap-1"><button class="au-btn au-btn--ghost au-btn--xs" data-edit-user="' + u.id + '">编辑</button>' + (u.id !== A.state.user.id ? '<button class="au-btn au-btn--ghost au-btn--xs" data-toggle-user="' + u.id + '">' + (u.status === 'active' ? '停用' : '启用') + '</button>' : '') + '</div></td></tr>';
          }).join('') + '</tbody></table></div></div></div>' +
          '<div class="notice info mt-2">' + A.icon('shield', 14) + '<span>客服默认只能接待会话、查看访客基础档案与跟进自己的线索；配置、报表、团队与计费仅对管理员/运营开放。</span></div>';
        A.$$('[data-edit-user]', box).forEach(function (b) {
          b.onclick = function () { editUser(root, d.users.filter(function (u) { return String(u.id) === b.getAttribute('data-edit-user'); })[0]); };
        });
        A.$$('[data-toggle-user]', box).forEach(function (b) {
          b.onclick = function () {
            var u = d.users.filter(function (x) { return String(x.id) === b.getAttribute('data-toggle-user'); })[0];
            A.apiPatch('/api/users/' + u.id, { status: u.status === 'active' ? 'disabled' : 'active' }).then(function () { A.toast('状态已更新', 'ok'); A.route(); }).catch(A.handleError);
          };
        });
      }).catch(function (e) { if (!teamBox || !root.contains(teamBox)) return; A.handleError(e); teamBox.innerHTML = A.empty('加载失败', e.message); });
    }
  });

  function openAddUser(root) {
    if (!A.isAdmin()) return A.toast('仅管理员可添加子账号', 'err');
    A.modal({
      title: '添加子账号', subtitle: '账号密码可后续在成员编辑中重置',
      body: '<div class="form-grid"><div><label class="field-label">姓名</label><input class="az-input" data-u="name"></div><div><label class="field-label">邮箱</label><input class="az-input" data-u="email" type="email"></div>' +
        '<div><label class="field-label">初始密码</label><input class="az-input" data-u="password" type="password" placeholder="至少 6 位"></div>' +
        '<div><label class="field-label">角色</label><select class="az-select" data-u="role"><option value="agent">客服</option><option value="operator">运营</option><option value="admin">管理员</option></select></div></div>' +
        '<div class="notice info mt-2">' + A.icon('shield', 14) + '<span>客服只能聊天与跟进线索，不能修改配置或查看高级报表。</span></div>',
      footer: [{ label: '取消', class: 'au-btn--ghost' }, { label: '创建账号', class: 'au-btn--primary', onClick: function (card, close) {
        var body = {};
        A.$$('[data-u]', card).forEach(function (i) { body[i.getAttribute('data-u')] = i.value.trim(); });
        A.apiPost('/api/users', body).then(function () { close(); A.toast('子账号已创建', 'ok'); A.route(); }).catch(A.handleError);
      } }]
    });
  }

  function editUser(root, u) {
    if (!A.isAdmin()) return A.toast('仅管理员可编辑成员', 'err');
    A.modal({
      title: '编辑成员', subtitle: u.email,
      body: '<div class="form-grid"><div><label class="field-label">姓名</label><input class="az-input" data-u="name" value="' + A.esc(u.name) + '"></div><div><label class="field-label">角色</label><select class="az-select" data-u="role"><option value="agent"' + (u.role === 'agent' ? ' selected' : '') + '>客服</option><option value="operator"' + (u.role === 'operator' ? ' selected' : '') + '>运营</option><option value="admin"' + (u.role === 'admin' ? ' selected' : '') + '>管理员</option></select></div>' +
        '<div class="full"><label class="field-label">重置密码（留空不修改）</label><input class="az-input" data-u="password" type="password" placeholder="至少 6 位"></div></div>',
      footer: [{ label: '取消', class: 'au-btn--ghost' }, { label: '保存', class: 'au-btn--primary', onClick: function (card, close) {
        var body = {};
        A.$$('[data-u]', card).forEach(function (i) { if (i.value.trim()) body[i.getAttribute('data-u')] = i.value.trim(); });
        A.apiPatch('/api/users/' + u.id, body).then(function () { close(); A.toast('成员已更新', 'ok'); A.route(); }).catch(A.handleError);
      } }]
    });
  }

  // ---------------- billing ----------------
  A.registerPage('billing', {
    title: '套餐与用量', subtitle: '订阅、订单与额度管理',
    roles: ['admin'],
    render: function (root) {
      root.innerHTML = '<div class="page-head"><div><h1>套餐与用量</h1><p>自助升级按订单支付；企业版和定制需求可直接转给销售。</p></div></div><div id="billing-body">' + A.skeleton(4) + '</div>';
      A.api('/api/billing').then(function (d) {
        var plan = d.plan;
        var usage = d.usage;
        var sub = d.subscription || {};
        var limits = plan.limits;
        var isTrial = sub.plan_status === 'trialing';
        var trialLeft = A.trialDaysLeft();
        var periodEnd = sub.current_period_end ? String(sub.current_period_end).slice(0, 10) : '';
        function usageRow(label, used, limit) {
          var pct = limit === -1 ? 10 : Math.min(100, (used / Math.max(1, limit)) * 100);
          return '<div class="usage-row"><span class="u-label">' + label + '</span><span class="u-track"><span class="u-fill" style="width:' + pct + '%"></span></span><span class="u-val">' + used + (limit === -1 ? ' / 不限' : ' / ' + limit) + '</span></div>';
        }
        var planRank = { free: 0, standard: 1, pro: 2, enterprise: 3 };
        function planButton(p) {
          if (p.code === plan.code && p.code === 'free') return '<button class="au-btn au-btn--ghost" style="width:100%" disabled>当前套餐</button>';
          if (p.code !== 'free' && !isTrial && sub.plan_status === 'active' && planRank[p.code] < planRank[plan.code]) {
            return '<button class="au-btn au-btn--ghost" style="width:100%" disabled>当前周期内保留更高套餐</button>';
          }
          if (p.code === plan.code && !isTrial && sub.plan_status === 'active') {
            if (p.code === 'enterprise') return '<button class="au-btn au-btn--ghost" style="width:100%" disabled>当前套餐</button>';
            return '<button class="au-btn au-btn--primary" style="width:100%" data-buy="' + p.code + '">续费当前套餐</button>';
          }
          if (p.code === plan.code && isTrial) return '<button class="au-btn au-btn--primary" style="width:100%" data-buy="' + p.code + '">转为付费' + p.name + '</button>';
          if (p.code === 'free') return '<button class="au-btn au-btn--ghost" style="width:100%" data-downgrade>降级到免费版</button>';
          if (p.code === 'enterprise') return '<button class="au-btn au-btn--ghost" style="width:100%" data-enterprise>联系销售</button>';
          return '<button class="au-btn au-btn--primary" style="width:100%" data-buy="' + p.code + '">升级到' + p.name + '</button>';
        }
        var planCards = d.plans.map(function (p) {
          return '<div class="plan-card' + (p.recommended ? ' recommended' : '') + (p.code === plan.code ? ' current' : '') + '">' +
            (p.recommended ? '<span class="pill purple" style="position:absolute;right:12px;top:12px">主推</span>' : '') +
            '<h3>' + p.name + '</h3><div class="price">' + (p.code === 'free' ? '¥0' : p.price ? '¥' + p.price : '定制') + (p.price ? '<small> / 月</small>' : '') + '</div>' +
            (p.yearly ? '<div class="tiny muted" style="margin-top:-2px">年付 ¥' + p.yearly + '</div>' : '') +
            '<div class="tagline">' + A.esc(p.tagline) + '</div>' +
            '<ul>' + p.highlights.map(function (h) { return '<li>' + A.icon('check', 12) + A.esc(h) + '</li>'; }).join('') + '</ul>' +
            planButton(p) + '</div>';
        }).join('');
        var compareFeatures = [
          ['chat', '在线客服对话'], ['triggers', '主动触发弹窗'], ['forms', '自定义表单'], ['knowledge', '自助知识库'], ['recording', '访客录屏'],
          ['funnel', '转化漏斗'], ['intent_scoring', '意向自动打分'], ['crm', '轻线索 CRM'], ['geo_heatmap', '区域热力图'], ['automation', '自动化规则引擎'],
          ['ai_bot', 'AI 接待机器人'], ['translation', '多语言翻译'], ['whitelabel', '白标与自定义域名'], ['api', '开放 API'], ['sla', 'SLA 支持']
        ];
        var statusText = isTrial ? '试用中' : sub.plan_status === 'active' ? '正常' : sub.plan_status === 'expired' ? '已过期' : sub.plan_status;
        var statusPill = isTrial ? 'orange' : sub.plan_status === 'active' ? 'green' : sub.plan_status === 'past_due' ? 'red' : 'gray';
        var periodLine = isTrial
          ? '试用剩余 ' + (trialLeft == null ? '-' : trialLeft + ' 天') + ' · 到期 ' + (sub.trial_ends_at ? String(sub.trial_ends_at).slice(0, 10) : '-')
          : periodEnd ? (sub.plan_status === 'past_due' ? '已到期，7 天宽限期内可续费 · ' : '当前周期至 ') + periodEnd + ' · ' + (sub.billing_cycle === 'yearly' ? '年付' : '月付') : plan.code === 'free' ? '免费版不设到期时间' : '当前为销售开通或演示套餐，未记录订阅周期';
        var pastDueNotice = sub.plan_status === 'past_due' ? '<div class="notice danger mt-2">' + A.icon('alert', 14) + '<span>订阅已到期，套餐能力保留 7 天宽限期。请尽快续费，避免降级免费版。</span></div>' : '';
        var cancelNotice = sub.cancel_at_period_end ? '<div class="notice warn mt-2">' + A.icon('alert', 14) + '<span>已设置到期降级免费版。' + (periodEnd ? '当前周期至 ' + periodEnd + '。' : '') + ' <button class="au-btn au-btn--ghost au-btn--xs" data-resume>恢复订阅</button></span></div>' : '';
        var orderRows = (d.orders || []).map(function (o) {
          var st = { pending: '待支付', paid: '已支付', failed: '支付失败', canceled: '已取消', refunded: '已退款' }[o.status] || o.status;
          var cls = o.status === 'paid' ? 'green' : o.status === 'pending' ? 'orange' : 'gray';
          return '<tr><td class="mono" style="font-size:10px">' + A.esc(o.order_no) + '</td><td>' + A.planName(o.plan) + '</td><td>' + (o.cycle === 'yearly' ? '年付' : '月付') + '</td><td>' + A.fmtMoney(o.amount) + '</td><td><span class="pill ' + cls + '">' + st + '</span></td><td class="tiny muted">' + A.fmtTime(o.created_at) + '</td><td>' + (o.status === 'pending' ? '<button class="au-btn au-btn--ghost au-btn--xs" data-pay-order="' + o.id + '">去支付</button>' : o.invoice_no ? '<span class="tiny mono">' + A.esc(o.invoice_no) + '</span>' : '-') + '</td></tr>';
        }).join('');
        var invoiceRows = (d.invoices || []).map(function (i) {
          return '<div class="side-kv"><span>' + A.esc(i.id) + ' · ' + i.date + '</span><b>' + A.fmtMoney(i.amount) + ' <span class="pill green">已开票</span></b></div>';
        }).join('');
        root.querySelector('#billing-body').innerHTML =
          '<div class="grid g-2-1 section-gap"><div class="az-card pad"><div class="flex items-center justify-between"><div><div class="tiny muted">当前套餐</div><h2 style="margin:3px 0;font-size:22px">' + plan.name + ' <span class="pill ' + statusPill + '" style="font-size:10px;vertical-align:middle">' + statusText + '</span></h2><div class="tiny muted">' + A.esc(periodLine) + '</div></div><span class="pill ' + (plan.code === 'pro' ? 'purple' : 'blue') + '">' + (plan.price ? '¥' + plan.price + ' / 月' : plan.code === 'enterprise' ? '定制报价' : '免费') + '</span></div>' +
          (isTrial ? '<div class="notice warn mt-2">' + A.icon('clock', 14) + '<span>专业版试用剩余 <b>' + trialLeft + '</b> 天，到期自动降级免费版，数据保留。</span></div>' : '') + pastDueNotice + cancelNotice +
          '<div class="divider"></div>' + usageRow('客服坐席', usage.agents, limits.agents) + usageRow('站点数量', usage.sites, limits.sites) + usageRow('本月访客', usage.monthlyVisitors, limits.visitors_monthly) + usageRow('附件存储', usage.storageMb + ' MB', -1) +
          '<div class="notice info mt-2">' + A.icon('card', 14) + '<span>' + A.esc(d.payment.message) + '</span></div></div>' +
          '<div class="az-card pad"><h4 style="margin:0 0 10px;font-size:13px">当前已解锁能力</h4><div class="tag-list">' + plan.featuresDetail.map(function (f) { return '<span class="pill blue">' + A.esc(f) + '</span>'; }).join('') + '</div>' +
          '<div class="divider"></div><h4 style="margin:0 0 8px;font-size:13px">发票记录</h4>' + (invoiceRows || '<div class="tiny muted">暂无已支付订单</div>') + '</div></div>' +
          '<div class="plan-grid section-gap">' + planCards + '</div>' +
          '<div class="az-card section-gap"><div class="az-card-head"><div><h3>订单记录</h3><div class="sub">支付回调验签、金额服务端校验、幂等处理</div></div></div><div class="az-card-body flush"><div class="table-wrap"><table class="az-table"><thead><tr><th>订单号</th><th>套餐</th><th>周期</th><th>金额</th><th>状态</th><th>创建时间</th><th>操作</th></tr></thead><tbody>' + (orderRows || '<tr><td colspan="7"><div class="empty-state" style="padding:24px"><p>暂无订单</p></div></td></tr>') + '</tbody></table></div></div></div>' +
          '<div class="az-card"><div class="az-card-head"><h3>功能对比</h3><div class="sub">按版本锁定，未开通能力在后台置灰</div></div><div class="az-card-body flush"><div class="table-wrap"><table class="az-table"><thead><tr><th>能力</th>' + d.plans.map(function (p) { return '<th>' + p.name + '</th>'; }).join('') + '</tr></thead><tbody>' +
          compareFeatures.map(function (f) {
            return '<tr><td><b style="font-size:12px">' + f[1] + '</b></td>' + d.plans.map(function (p) {
              return '<td>' + (p.features.indexOf(f[0]) > -1 ? '<span style="color:#10b981">' + A.icon('check', 14) + '</span>' : '<span class="muted">-</span>') + '</td>';
            }).join('') + '</tr>';
          }).join('') + '</tbody></table></div></div></div>';

        A.$$('[data-buy]', root).forEach(function (b) {
          b.onclick = function () { openOrder(b.getAttribute('data-buy'), d); };
        });
        A.$$('[data-pay-order]', root).forEach(function (b) {
          b.onclick = function () { openPayment((d.orders || []).filter(function (o) { return String(o.id) === b.getAttribute('data-pay-order'); })[0], d); };
        });
        var down = root.querySelector('[data-downgrade]');
        if (down) down.onclick = function () {
          A.confirm({ title: '降级到免费版', message: '立即降级会失去专业版能力，数据保留。付费周期内降级会安排在当前周期结束后生效。', okText: '确认降级', danger: true }).then(function (ok) {
            if (!ok) return;
            A.apiPost('/api/billing/downgrade', {}).then(function () { A.toast('降级已安排', 'ok'); A.boot(); }).catch(A.handleError);
          });
        };
        var ent = root.querySelector('[data-enterprise]');
        if (ent) ent.onclick = function () {
          A.apiPost('/api/billing/contact-sales', { message: '客户在套餐页咨询企业版。' }).then(function () { A.toast('已转给销售，会在 1 个工作日内联系你', 'ok'); }).catch(A.handleError);
        };
        var resume = root.querySelector('[data-resume]');
        if (resume) resume.onclick = function () {
          A.apiPost('/api/billing/resume', {}).then(function () { A.toast('已恢复订阅', 'ok'); A.route(); }).catch(A.handleError);
        };
      }).catch(function (e) { A.handleError(e); });
    }
  });

  function openOrder(planCode, d) {
    var plan = d.plans.filter(function (p) { return p.code === planCode; })[0];
    if (!plan) return;
    var savedCycle = 'monthly';
    var m = A.modal({
      title: '开通' + plan.name,
      subtitle: '订单金额由服务端按套餐价格计算，前端不传价格',
      body: '<div class="plan-order"><div><label class="field-label">计费周期</label><div class="cycle-switch"><button class="au-chip active" data-cycle="monthly">月付 ¥' + plan.price + '</button><button class="au-chip" data-cycle="yearly">年付 ¥' + plan.yearly + ' <span style="font-size:9px;opacity:.7">省 2 个月</span></button></div></div>' +
        '<div class="order-summary"><div class="side-kv"><span>套餐</span><b>' + plan.name + '</b></div><div class="side-kv"><span>周期</span><b data-cycle-label>月付</b></div><div class="side-kv total"><span>应付</span><b data-amount>¥' + plan.price + '</b></div></div>' +
        '<div class="tiny muted">支付成功后立即生效；年付按 10 个月计费。企业版与定制需求请联系销售。</div></div>',
      footer: [{ label: '取消', class: 'au-btn--ghost' }, { label: '创建订单', class: 'au-btn--primary', onClick: function (card, close) {
        var btn = card.querySelectorAll('.modal-foot .au-btn')[1];
        btn.disabled = true;
        btn.textContent = '创建中...';
        A.apiPost('/api/billing/orders', { plan: planCode, cycle: savedCycle }).then(function (r) {
          close();
          openPayment(r.order, d, r.payment);
        }).catch(function (e) { btn.disabled = false; btn.textContent = '创建订单'; A.handleError(e); });
      } }]
    });
    function pick(cycle) {
      savedCycle = cycle;
      A.$$('[data-cycle]', m.el).forEach(function (b) { b.classList.toggle('active', b.getAttribute('data-cycle') === cycle); });
      m.el.querySelector('[data-cycle-label]').textContent = cycle === 'yearly' ? '年付' : '月付';
      m.el.querySelector('[data-amount]').textContent = '¥' + (cycle === 'yearly' ? plan.yearly : plan.price);
    }
    A.$$('[data-cycle]', m.el).forEach(function (b) { b.onclick = function () { pick(b.getAttribute('data-cycle')); }; });
  }

  function openPayment(order, d, payment) {
    if (!order) return;
    var pay = payment || (d && d.payment) || { mock: false, message: '支付通道未配置' };
    var alipayReady = pay.provider === 'alipay' && pay.enabled;
    var noticeClass = pay.mock || alipayReady ? 'info' : 'warn';
    var actionLabel = pay.mock ? '模拟支付完成' : alipayReady ? '前往支付宝支付' : '联系销售';
    var m = A.modal({
      title: '支付订单',
      subtitle: '订单号 ' + order.order_no,
      body: '<div class="order-summary"><div class="side-kv"><span>套餐</span><b>' + A.planName(order.plan) + '</b></div><div class="side-kv"><span>周期</span><b>' + (order.cycle === 'yearly' ? '年付' : '月付') + '</b></div><div class="side-kv total"><span>应付</span><b>¥' + order.amount + '</b></div></div>' +
        '<div class="notice ' + noticeClass + ' mt-2">' + A.icon('card', 14) + '<span>' + A.esc(pay.message || (pay.mock ? '开发环境可模拟支付。' : '请配置支付渠道后使用。')) + '</span></div>' +
        (order.status === 'paid' ? '<div class="notice ok mt-2">该订单已支付。</div>' : ''),
      footer: order.status === 'paid' ? [{ label: '关闭', class: 'au-btn--ghost' }] : [
        { label: '稍后支付', class: 'au-btn--ghost', onClick: function (card, close) { close(); A.route(); } },
        { label: actionLabel, class: 'au-btn--primary', onClick: function (card, close) {
          if (pay.mock) {
            A.apiPost('/api/billing/orders/' + order.id + '/pay', {}).then(function () {
              close();
              A.toast('支付成功，套餐已生效', 'ok');
              A.boot();
            }).catch(A.handleError);
            return;
          }
          if (!alipayReady) {
            A.apiPost('/api/billing/contact-sales', { message: '客户需要协助完成支付。' }).then(function () { close(); A.toast('已转给销售', 'ok'); }).catch(A.handleError);
            return;
          }
          var go = function (url) {
            if (!url) return A.toast('支付宝下单失败，请稍后重试', 'err');
            close();
            window.location.href = url;
          };
          if (pay.payUrl) return go(pay.payUrl);
          A.apiPost('/api/billing/orders/' + order.id + '/pay-intent', {}).then(function (r) { go(r.payUrl); }).catch(A.handleError);
        } }
      ]
    });
  }

  // ---------------- settings ----------------
  A.registerPage('settings', {
    title: '系统设置', subtitle: '品牌、白标、通知与 API',
    roles: ['admin', 'operator'],
    render: function (root) {
      if (!D.settings) D.settings = { tab: 'brand' };
      var st = D.settings;
      root.innerHTML = '<div class="page-head"><div><h1>系统设置</h1><p>品牌、白标、钉钉/企微通知与开放 API。</p></div></div>' +
        '<div class="az-card"><div class="az-card-body tight" style="padding-bottom:0"><div class="tabs"><button class="' + (st.tab === 'brand' ? 'active' : '') + '" data-stab="brand">品牌与合规</button><button class="' + (st.tab === 'channels' ? 'active' : '') + '" data-stab="channels">消息通知</button><button class="' + (st.tab === 'api' ? 'active' : '') + '" data-stab="api">开放 API</button></div></div><div class="az-card-body" id="settings-body">' + A.skeleton(3) + '</div></div>';
      A.$$('[data-stab]', root).forEach(function (b) {
        b.onclick = function () {
          st.tab = b.getAttribute('data-stab');
          A.$$('[data-stab]', root).forEach(function (x) { x.classList.remove('active'); });
          b.classList.add('active');
          loadSettings(root);
        };
      });
      loadSettings(root);
    }
  });

  function loadSettings(root) {
    var st = D.settings;
    var box = root.querySelector('#settings-body');
    A.api('/api/settings').then(function (d) {
      if (st.tab === 'brand') {
        var t = d.settings;
        box.innerHTML = '<div class="grid g-2-1"><div class="az-card"><div class="az-card-head"><h3>品牌信息</h3><div class="sub">用于后台、访客挂件与白标</div></div><div class="az-card-body"><div class="form-grid">' +
          '<div><label class="field-label">企业名称</label><input class="az-input" data-t="name" value="' + A.esc(t.name) + '"' + (A.isAdmin() ? '' : ' disabled') + '></div>' +
          '<div><label class="field-label">对外品牌名</label><input class="az-input" data-t="brand_name" value="' + A.esc(t.brand_name) + '"' + (A.isAdmin() ? '' : ' disabled') + '></div>' +
          '<div><label class="field-label">品牌色</label><input class="az-input" data-t="brand_color" value="' + A.esc(t.brand_color) + '"' + (A.isAdmin() ? '' : ' disabled') + '></div>' +
          '<div><label class="field-label">自定义域名</label><input class="az-input" data-t="custom_domain" value="' + A.esc(t.custom_domain) + '" placeholder="chat.your-domain.com" ' + (!d.licensed.whitelabel ? 'disabled' : '') + '></div></div>' +
          '<div class="divider"></div>' +
          '<div class="switch-row"><div><b>隐藏平台品牌</b><span>访客挂件不显示 Powered by，企业版白标能力</span></div>' + (d.licensed.whitelabel ? '<button class="az-switch ' + (t.hide_branding ? 'on' : '') + '" data-flag="hide_branding"></button>' : '<span class="pill gray">企业版</span>') + '</div>' +
          '<div class="switch-row"><div><b>自定义域名</b><span>绑定独立域名后访客看不到平台域名</span></div>' + (d.licensed.whitelabel ? '<span class="pill green">已解锁</span>' : '<span class="pill gray">企业版</span>') + '</div>' +
          (A.isAdmin() ? '<button class="au-btn au-btn--primary au-btn--sm mt-2" data-save-settings>保存设置</button>' : '<div class="tiny muted mt-2">仅管理员可修改</div>') +
          '</div></div><div class="grid" style="gap:16px;align-content:start"><div class="az-card pad"><h4 style="margin:0 0 8px;font-size:13px">版本能力</h4>' +
          '<div class="side-kv"><span>当前套餐</span><b>' + A.state.plan.name + '</b></div><div class="side-kv"><span>白标</span><b>' + (d.licensed.whitelabel ? '已解锁' : '未开通') + '</b></div><div class="side-kv"><span>开放 API</span><b>' + (d.licensed.api ? '已解锁' : '未开通') + '</b></div>' +
          '<button class="au-btn au-btn--ghost au-btn--sm" style="width:100%;margin-top:10px" onclick="Admin.go(\'billing\')">查看套餐</button></div>' +
          '<div class="az-card pad"><h4 style="margin:0 0 8px;font-size:13px">行为采集</h4><div class="tiny muted" style="line-height:1.9">行为采集总开关在「挂件配置 → 能力开关」中按站点控制。关闭后停止新增页面轨迹、点击和来源数据，聊天与线索仍可正常使用。</div></div></div></div>';
        if (A.isAdmin()) {
          box.querySelector('[data-save-settings]').onclick = function () {
            var body = {};
            A.$$('[data-t]', box).forEach(function (i) { body[i.getAttribute('data-t')] = i.value.trim(); });
            var flag = box.querySelector('[data-flag="hide_branding"]');
            if (flag) body.hide_branding = flag.classList.contains('on');
            A.apiPatch('/api/settings', body).then(function () { A.toast('设置已保存', 'ok'); A.boot(); }).catch(A.handleError);
          };
        }
        var sw = box.querySelector('[data-flag="hide_branding"]');
        if (sw) sw.onclick = function () { sw.classList.toggle('on'); };
      } else if (st.tab === 'channels') {
        box.innerHTML = '<div class="grid g-2-1"><div class="az-card"><div class="az-card-head"><div><h3>通知渠道</h3><div class="sub">新会话与新线索推送到钉钉/企业微信</div></div><button class="au-btn au-btn--primary au-btn--xs" data-add-ch>' + A.icon('plus', 12) + ' 添加渠道</button></div><div class="az-card-body">' +
          (d.channels.length ? d.channels.map(function (c) {
            return '<div class="recording-link"><span class="r-ico" style="background:rgba(37,99,235,.1);color:#2563eb">' + A.icon('bell', 14) + '</span><span style="flex:1"><b style="font-size:11.5px">' + (c.type === 'dingtalk' ? '钉钉群机器人' : '企业微信群机器人') + '</b><span class="tiny muted" style="display:block">' + A.esc(c.webhook) + '</span><span class="tiny muted">事件：' + c.events.join(' / ') + ' · ' + (c.enabled ? '启用' : '停用') + '</span></span>' +
              '<button class="au-btn au-btn--ghost au-btn--xs" data-test-ch="' + c.id + '">测试</button><button class="au-btn au-btn--ghost au-btn--xs" data-del-ch="' + c.id + '">删除</button></div>';
          }).join('') : A.empty('暂无通知渠道', '添加钉钉或企业微信机器人，新线索实时提醒销售')) + '</div></div>' +
          '<div class="az-card pad"><h4 style="margin:0 0 8px;font-size:13px">配置方法</h4><div class="tiny muted" style="line-height:1.9">1. 在钉钉群添加「自定义机器人」<br>2. 复制 Webhook 地址（含 access_token）<br>3. 粘贴到左侧并选择事件<br>4. 点击测试确认收到消息<br><br>企业微信：群设置 → 群机器人 → 复制 Webhook。</div></div></div>';
        var add = box.querySelector('[data-add-ch]');
        if (add) add.onclick = function () {
          A.modal({
            title: '添加通知渠道', body: '<div class="grid"><div><label class="field-label">渠道类型</label><select class="az-select" data-ch="type"><option value="dingtalk">钉钉群机器人</option><option value="wecom">企业微信群机器人</option></select></div><div><label class="field-label">Webhook 地址</label><input class="az-input" data-ch="webhook" placeholder="https://oapi.dingtalk.com/robot/send?access_token=..."></div><div><label class="field-label">推送事件</label><div class="flex gap-1"><label class="au-checkbox"><input type="checkbox" data-ch-event="conversation" checked> 新会话</label><label class="au-checkbox"><input type="checkbox" data-ch-event="lead" checked> 新线索</label></div></div></div>',
            footer: [{ label: '取消', class: 'au-btn--ghost' }, { label: '添加', class: 'au-btn--primary', onClick: function (card, close) {
              var body = {};
              A.$$('[data-ch]', card).forEach(function (i) { body[i.getAttribute('data-ch')] = i.value.trim(); });
              body.events = A.$$('[data-ch-event]', card).filter(function (i) { return i.checked; }).map(function (i) { return i.getAttribute('data-ch-event'); });
              A.apiPost('/api/notification-channels', body).then(function () { close(); A.toast('通知渠道已添加', 'ok'); A.route(); }).catch(A.handleError);
            } }]
          });
        };
        A.$$('[data-test-ch]', box).forEach(function (b) {
          b.onclick = function () {
            A.apiPost('/api/notification-channels/' + b.getAttribute('data-test-ch') + '/test').then(function (res) { A.toast(res.message, res.ok ? 'ok' : 'err'); }).catch(A.handleError);
          };
        });
        A.$$('[data-del-ch]', box).forEach(function (b) {
          b.onclick = function () { A.apiDel('/api/notification-channels/' + b.getAttribute('data-del-ch')).then(function () { A.toast('已删除', 'ok'); A.route(); }).catch(A.handleError); };
        });
      } else {
        if (!d.licensed.api) {
          box.innerHTML = '<div class="locked-card"><div class="lock-ov"><span class="lk-ico">' + A.icon('lock', 20) + '</span><h4>开放 API 需要企业版</h4><p>企业版提供线索、会话、访客读写接口与 API Key 管理。</p><button class="au-btn au-btn--primary" onclick="Admin.upgrade(\'api\')">升级套餐</button></div></div>';
          return;
        }
        A.api('/api/api-keys').then(function (kd) {
          box.innerHTML = '<div class="grid g-2-1"><div class="az-card"><div class="az-card-head"><div><h3>API Keys</h3><div class="sub">使用 x-api-key 请求 /api/v1/*</div></div><button class="au-btn au-btn--primary au-btn--xs" data-new-key>新建 Key</button></div><div class="az-card-body">' +
            (kd.keys.length ? kd.keys.map(function (k) {
              return '<div class="flex items-center gap-1" style="padding:9px 0;border-bottom:1px dashed rgba(148,163,184,.18)"><div style="flex:1"><b style="font-size:12px">' + A.esc(k.name) + '</b><div class="tiny muted mono">' + A.esc(k.key) + '</div></div><span class="pill ' + (k.enabled ? 'green' : 'gray') + '">' + (k.enabled ? '启用' : '停用') + '</span><button class="au-btn au-btn--ghost au-btn--xs" data-copy-key="' + A.esc(k.key) + '">复制</button>' + (k.enabled ? '<button class="au-btn au-btn--ghost au-btn--xs" data-del-key="' + k.id + '">停用</button>' : '') + '</div>';
            }).join('') : '<div class="tiny muted">暂无 API Key</div>') + '</div></div>' +
            '<div class="az-card pad"><h4 style="margin:0 0 8px;font-size:13px">示例</h4><div class="code-box" style="font-size:10px">curl -H "x-api-key: YOUR_KEY" \\\n  ' + location.origin + '/api/v1/leads</div><div class="tiny muted mt-1" style="line-height:1.8">支持：GET /api/v1/leads、POST /api/v1/leads、GET /api/v1/conversations、GET /api/v1/visitors、GET /api/v1/stats。</div></div></div>';
          var nk = box.querySelector('[data-new-key]');
          if (nk) nk.onclick = function () {
            A.prompt({ title: '新建 API Key', label: 'Key 名称', value: '外部系统对接' }).then(function (name) {
              if (!name) return;
              A.apiPost('/api/api-keys', { name: name }).then(function (res) {
                A.modal({ title: 'API Key 已创建', body: '<div class="notice warn">' + A.icon('alert', 14) + '<span>请立即复制保存，关闭后无法再次完整查看。</span></div><div class="code-box mt-2">' + A.esc(res.key) + '</div>', footer: [{ label: '复制', class: 'au-btn--primary', onClick: function () { A.copy(res.key); } }, { label: '关闭', class: 'au-btn--ghost' }] });
                A.route();
              }).catch(A.handleError);
            });
          };
          A.$$('[data-copy-key]', box).forEach(function (b) { b.onclick = function () { A.copy(b.getAttribute('data-copy-key')); }; });
          A.$$('[data-del-key]', box).forEach(function (b) { b.onclick = function () { A.apiDel('/api/api-keys/' + b.getAttribute('data-del-key')).then(function () { A.toast('Key 已停用', 'ok'); A.route(); }).catch(A.handleError); }; });
        }).catch(A.handleError);
      }
    }).catch(function (e) { A.handleError(e); box.innerHTML = A.empty('加载失败', e.message); });
  }

  // ---------------- AI ----------------
  A.registerPage('ai', {
    title: 'AI 接待', subtitle: '知识库应答、摘要与意图标签',
    roles: ['admin', 'operator'],
    feature: 'ai_bot',
    render: function (root) {
      root.innerHTML = '<div class="page-head"><div><h1>AI 接待机器人</h1><p>基于知识库自动应答，无法回答转人工；会话结束自动生成摘要与跟进建议。</p></div><div class="head-actions"><button class="au-btn au-btn--ghost au-btn--sm" data-ai-config>去开启 AI</button></div></div><div id="ai-body">' + A.skeleton(4) + '</div>';
      root.querySelector('[data-ai-config]').onclick = function () { A.go('widget'); };
      A.api('/api/ai/overview').then(function (d) {
        var s = d.stats;
        var box = root.querySelector('#ai-body');
        box.innerHTML = '<div class="grid g4 section-gap">' +
          metric('已生成摘要', s.summarized, 'sparkles', 'purple') + metric('机器人消息', s.botMessages, 'chat', '') + metric('无人工接待', s.autoHandled, 'zap', 'green') + metric('知识库条数', s.faqCount, 'book', 'orange') +
          '</div><div class="grid g-2-1 section-gap"><div class="grid" style="gap:16px">' +
          '<div class="az-card"><div class="az-card-head"><div><h3>最近 AI 摘要</h3><div class="sub">自动写入访客档案与线索</div></div></div><div class="az-card-body">' +
          (d.recent.length ? d.recent.map(function (c) {
            return '<div style="padding:10px 0;border-bottom:1px dashed rgba(148,163,184,.18)"><div class="flex items-center justify-between"><b style="font-size:12px">' + A.esc(c.subject || '会话 #' + c.id) + '</b><span class="pill ' + (c.ai_intent === 'high' ? 'red' : c.ai_intent === 'medium' ? 'orange' : 'gray') + '">' + ({ high: '高意向', medium: '中意向', low: '低意向' })[c.ai_intent] || '未识别' + '</span></div><div class="tiny muted" style="margin-top:4px;line-height:1.7">' + A.esc(c.ai_summary) + '</div>' + (c.ai_suggestion ? '<div class="notice ok mt-1" style="font-size:10.5px">建议：' + A.esc(c.ai_suggestion) + '</div>' : '') + '</div>';
          }).join('') : A.empty('暂无摘要', '会话结束后会自动生成，也可以在会话侧栏手动生成')) + '</div></div>' +
          '<div class="az-card"><div class="az-card-head"><h3>机器人应答测试</h3><div class="sub">基于当前站点知识库</div></div><div class="az-card-body"><div class="flex gap-1"><input class="az-input" data-test-q placeholder="输入访客问题，例如：专业版多少钱"><button class="au-btn au-btn--primary au-btn--sm" data-test-run>测试</button></div><div id="ai-test-result" class="mt-2"></div></div></div>' +
          '<div class="az-card"><div class="az-card-head"><h3>多语言翻译</h3><div class="sub">外贸独立站接待辅助</div></div><div class="az-card-body"><textarea class="az-textarea" data-trans-text placeholder="输入中文，翻译成英文"></textarea><div class="flex gap-1 mt-1"><button class="au-btn au-btn--ghost au-btn--sm" data-trans>翻译成英文</button></div><div id="trans-result" class="notice info mt-2" style="display:none"></div></div></div>' +
          '</div><div class="grid" style="gap:16px;align-content:start">' +
          '<div class="az-card"><div class="az-card-head"><h3>意图分布</h3></div><div class="az-card-body">' + (d.intents.length ? A.donut(d.intents.map(function (i) { return { name: ({ high: '高意向', medium: '中意向', low: '低意向' })[i.ai_intent] || i.ai_intent, value: i.c } }) , { centerLabel: '会话' }) : '<div class="tiny muted">暂无意图数据</div>') + '</div></div>' +
          '<div class="az-card pad"><h4 style="margin:0 0 8px;font-size:13px">工作方式</h4><div class="tiny muted" style="line-height:1.9">· 访客消息先与知识库做相似度匹配<br>· 命中直接回复，未命中提示转人工<br>· 同一会话 2 分钟内不重复自动回复<br>· 会话结束自动生成摘要、需求、建议与标签</div></div>' +
          '</div></div>';
        box.querySelector('[data-test-run]').onclick = function () {
          var q = box.querySelector('[data-test-q]').value.trim();
          if (!q) return;
          A.apiPost('/api/ai/test-answer', { question: q, siteId: A.currentSite() && A.currentSite().id }).then(function (r) {
            box.querySelector('#ai-test-result').innerHTML = '<div class="notice ' + (r.matched ? 'ok' : 'warn') + '">' + A.icon(r.matched ? 'check' : 'alert', 14) + '<span><b>匹配：' + (r.matched ? A.esc(r.matched.question) + '（' + r.matched.score + '）' : '未命中知识库') + '</b><br>' + A.esc(r.reply) + '<br>自动标签：' + (r.tags.join(' / ') || '无') + '</span></div>';
          }).catch(A.handleError);
        };
        var transBtn = box.querySelector('[data-trans]');
        if (transBtn) transBtn.onclick = function () {
          var text = box.querySelector('[data-trans-text]').value.trim();
          if (!text) return;
          A.apiPost('/api/ai/translate', { text: text, target: 'en' }).then(function (r) {
            var res = box.querySelector('#trans-result');
            res.style.display = 'flex';
            res.textContent = r.text;
          }).catch(A.handleError);
        };
      }).catch(function (e) { A.handleError(e); });
    }
  });

  function metric(label, value, ico, color) {
    return '<div class="metric-card"><div class="m-top"><span class="m-label">' + label + '</span><span class="m-ico ' + color + '">' + A.icon(ico, 14) + '</span></div><div class="m-value" style="font-size:23px">' + value + '</div></div>';
  }

  // ---------------- notifications ----------------
  A.registerPage('notifications', {
    title: '消息通知', subtitle: '新会话、新线索与转接提醒',
    roles: ['admin', 'operator', 'agent'],
    render: function (root) {
      root.innerHTML = '<div class="page-head"><div><h1>消息通知</h1><p>站内通知与钉钉/企微推送使用同一事件源。</p></div><div class="head-actions"><button class="au-btn au-btn--ghost au-btn--sm" data-read-all>全部标为已读</button></div></div><div class="az-card" id="notify-body">' + A.skeleton(3) + '</div>';
      root.querySelector('[data-read-all]').onclick = function () {
        A.apiPost('/api/notifications/read-all').then(function () { A.state.unread = 0; A.renderSidebar(); A.toast('已全部标为已读', 'ok'); A.route(); }).catch(A.handleError);
      };
      A.api('/api/notifications').then(function (d) {
        var box = root.querySelector('#notify-body');
        box.innerHTML = d.notifications.length ? d.notifications.map(function (n) {
          return '<div class="flex gap-1" style="padding:14px 18px;border-bottom:1px solid rgba(148,163,184,.12);' + (n.is_read ? '' : 'background:rgba(37,99,235,.03)') + '"><span class="avatar-sm ' + (n.type === 'lead' ? 'green' : n.type === 'transfer' ? 'purple' : '') + '">' + A.icon(n.type === 'lead' ? 'leads' : n.type === 'transfer' ? 'users' : 'chat', 14) + '</span><div style="flex:1"><div class="flex items-center gap-1"><b style="font-size:12.5px">' + A.esc(n.title) + '</b>' + (n.is_read ? '' : '<span class="pill blue" style="font-size:9px">未读</span>') + '<span class="tiny muted" style="margin-left:auto">' + A.timeAgo(n.created_at) + '</span></div><div class="tiny muted" style="margin-top:2px">' + A.esc(n.content || '') + '</div></div></div>';
        }).join('') : A.empty('暂无通知', '新会话和新线索会在这里提醒');
        A.state.unread = 0;
        A.renderSidebar();
        A.apiPost('/api/notifications/read-all').catch(function () { });
      }).catch(A.handleError);
    }
  });

  // ---------------- logs ----------------
  A.registerPage('logs', {
    title: '操作日志', subtitle: '配置变更与敏感操作审计',
    roles: ['admin'],
    render: function (root) {
      root.innerHTML = '<div class="page-head"><div><h1>操作日志</h1><p>记录登录、配置变更、线索导出与成员管理，满足审计要求。</p></div></div><div class="az-card" id="logs-body">' + A.skeleton(4) + '</div>';
      A.api('/api/audit-logs').then(function (d) {
        var box = root.querySelector('#logs-body');
        box.innerHTML = '<div class="table-wrap"><table class="az-table"><thead><tr><th>时间</th><th>操作人</th><th>动作</th><th>对象</th><th>详情</th><th>IP</th></tr></thead><tbody>' +
          (d.logs.length ? d.logs.map(function (l) {
            return '<tr><td class="tiny muted">' + A.fmtTime(l.created_at) + '</td><td>' + A.esc(l.user_name || '系统') + '</td><td><span class="pill gray">' + A.esc(l.action) + '</span></td><td class="tiny">' + A.esc(l.target || '-') + '</td><td class="tiny muted">' + A.esc(A.clip(l.detail || '', 60)) + '</td><td class="tiny muted mono">' + A.esc(l.ip || '-') + '</td></tr>';
          }).join('') : '<tr><td colspan="6">' + A.empty('暂无日志') + '</td></tr>') + '</tbody></table></div>';
      }).catch(A.handleError);
    }
  });
})();
