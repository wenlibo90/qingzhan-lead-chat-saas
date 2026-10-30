(function () {
  'use strict';
  var O = window.Ops;

  O.register('referrals', {
    title: '推广奖励', subtitle: '推荐关系、佣金与提现审核',
    render: function (root) {
      root.innerHTML = '<div class="page-head"><div><h1>推广奖励</h1><p>客户邀请新用户后按首单 20% 生成奖励，运营在这里审核提现并标记打款。</p></div></div><div id="ref-ops-body">' + skeleton(4) + '</div>';
      load(root);
    }
  });

  function money(c) { return '¥' + (Number(c || 0) / 100).toFixed(2); }
  function load(root) {
    O.api('/api/ops/referrals').then(function (d) {
      var t = d.totals;
      var refRows = d.referrals.map(function (r) { return '<tr><td>' + O.esc(r.referrer_name || '-') + '<div class="u-sub">' + O.esc(r.referrer_phone || '') + '</div></td><td>' + O.esc(r.referred_name || '-') + '<div class="u-sub">' + O.esc(r.referred_phone || '') + '</div></td><td><span class="pill ' + (r.status === 'paid' ? 'green' : r.status === 'activated' ? 'blue' : 'gray') + '">' + ({ registered: '已注册', activated: '已激活', paid: '已付费', void: '已作废' }[r.status] || r.status) + '</span></td><td class="tiny muted">' + O.fmtTime(r.created_at) + '</td></tr>'; }).join('');
      var rewardRows = d.rewards.map(function (r) { return '<tr><td>' + O.esc(r.referrer_name || '-') + '</td><td>' + O.esc(r.referred_name || '-') + '</td><td class="mono tiny">' + O.esc(r.order_no || '-') + '</td><td><b>' + money(r.amount_cents) + '</b></td><td><span class="pill ' + (r.status === 'available' ? 'green' : r.status === 'pending' ? 'orange' : 'gray') + '">' + ({ pending: '待结算', available: '可提现', withdrawn: '已提现', void: '已作废' }[r.status] || r.status) + '</span></td><td class="tiny muted">' + O.fmtTime(r.created_at) + '</td></tr>'; }).join('');
      var wRows = d.withdrawals.map(function (w) {
        var actions = w.status === 'requested' ? '<button class="au-btn au-btn--primary au-btn--xs" data-w="' + w.id + '" data-st="approved">通过</button><button class="au-btn au-btn--ghost au-btn--xs" data-w="' + w.id + '" data-st="rejected">拒绝</button>' : w.status === 'approved' ? '<button class="au-btn au-btn--primary au-btn--xs" data-w="' + w.id + '" data-st="paid">标记打款</button>' : '';
        return '<tr><td class="mono">#' + w.id + '</td><td>' + O.esc(w.account_name || '-') + '<div class="u-sub">' + O.esc(w.phone || w.email || '') + '</div></td><td><b>' + money(w.amount_cents) + '</b></td><td><span class="pill ' + (w.status === 'paid' ? 'green' : w.status === 'rejected' ? 'red' : 'orange') + '">' + ({ requested: '审核中', approved: '已通过', paid: '已打款', rejected: '已拒绝' }[w.status] || w.status) + '</span></td><td class="tiny muted">' + O.esc(w.note || '') + '</td><td>' + actions + '</td></tr>';
      }).join('');
      root.querySelector('#ref-ops-body').innerHTML =
        '<div class="ops-metric-grid section-gap"><div class="ops-metric"><span>推荐关系</span><b>' + t.referrals + '</b><em>累计注册</em></div><div class="ops-metric"><span>付费推荐</span><b>' + t.paid + '</b><em>产生佣金</em></div><div class="ops-metric"><span>奖励总额</span><b>' + money(t.rewardsCents) + '</b><em>含待结算</em></div><div class="ops-metric"><span>待审核提现</span><b>' + t.pendingWithdrawals + '</b><em>需要财务处理</em></div></div>' +
        '<div class="az-card section-gap"><div class="az-card-head"><div><h3>提现审核</h3><div class="sub">人工审核后标记打款；拒绝后余额自动释放</div></div></div><div class="az-card-body flush"><div class="table-wrap"><table class="az-table"><thead><tr><th>编号</th><th>账号</th><th>金额</th><th>状态</th><th>收款说明</th><th>操作</th></tr></thead><tbody>' + (wRows || '<tr><td colspan="6"><div class="ops-empty">暂无提现申请</div></td></tr>') + '</tbody></table></div></div></div>' +
        '<div class="grid g2 section-gap"><div class="az-card"><div class="az-card-head"><h3>推荐关系</h3></div><div class="az-card-body flush"><div class="table-wrap"><table class="az-table"><thead><tr><th>邀请人</th><th>被邀请人</th><th>状态</th><th>时间</th></tr></thead><tbody>' + (refRows || '<tr><td colspan="4"><div class="ops-empty">暂无推荐</div></td></tr>') + '</tbody></table></div></div></div><div class="az-card"><div class="az-card-head"><h3>佣金记录</h3></div><div class="az-card-body flush"><div class="table-wrap"><table class="az-table"><thead><tr><th>邀请人</th><th>被邀请人</th><th>订单</th><th>奖励</th><th>状态</th><th>时间</th></tr></thead><tbody>' + (rewardRows || '<tr><td colspan="6"><div class="ops-empty">暂无佣金</div></td></tr>') + '</tbody></table></div></div></div></div>';
      O.$$('[data-w]', root).forEach(function (b) {
        b.onclick = function () {
          var status = b.getAttribute('data-st');
          O.confirm({ title: status === 'paid' ? '标记已打款' : status === 'approved' ? '通过提现' : '拒绝提现', message: '确认将这笔提现标记为「' + ({ approved: '已通过', paid: '已打款', rejected: '已拒绝' }[status]) + '」？', danger: status === 'rejected', okText: '确认' }).then(function (ok) {
            if (!ok) return;
            O.api('/api/ops/referral-withdrawals/' + b.getAttribute('data-w'), { method: 'PATCH', body: { status: status } }).then(function () { O.toast('提现状态已更新', 'ok'); load(root); }).catch(O.handle);
          });
        };
      });
    }).catch(O.handle);
  }
  function skeleton(n) { return '<div class="az-card pad">' + Array.from({ length: n }).map(function () { return '<div class="au-skeleton" style="margin-bottom:12px"></div>'; }).join('') + '</div>'; }
})();
