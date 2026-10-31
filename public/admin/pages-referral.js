/* Referral program */
(function () {
  'use strict';
  var A = window.Admin;

  A.registerPage('referral', {
    title: '推广中心', subtitle: '邀请客户，赚取推广奖励',
    roles: ['admin', 'operator', 'agent'],
    render: function (root) {
      root.innerHTML = '<div class="page-head"><div><h1>推广中心</h1><p>把专属链接分享给朋友、客户或社群，对方完成付费后获得奖励。</p></div></div><div id="ref-body">' + A.skeleton(4) + '</div>';
      load(root);
    }
  });

  function money(cents) { return '¥' + (Number(cents || 0) / 100).toFixed(2); }
  function load(root) {
    var box = root.querySelector('#ref-body');
    if (!box) return;
    A.api('/api/referral').then(function (d) {
      var s = d.stats;
      var rewardRows = d.rewards.map(function (r) {
        var st = { pending: '待结算', available: '可提现', withdrawn: '已提现', void: '已作废' }[r.status] || r.status;
        var cls = r.status === 'available' ? 'green' : r.status === 'pending' ? 'orange' : 'gray';
        return '<tr><td>' + A.esc(r.referred_name || '-') + '</td><td>' + A.esc(r.order_no || '-') + '</td><td>' + A.planName(r.plan) + '</td><td><b>' + money(r.amount_cents) + '</b></td><td><span class="pill ' + cls + '">' + st + '</span></td><td class="tiny muted">' + A.fmtTime(r.created_at) + '</td></tr>';
      }).join('');
      var refRows = d.referrals.map(function (r) {
        var st = { registered: '已注册', activated: '已激活', paid: '已付费', void: '已作废' }[r.status] || r.status;
        return '<tr><td>' + A.esc(r.referred_name || '-') + '</td><td>' + A.esc(r.workspace_name || '-') + '</td><td><span class="pill ' + (r.status === 'paid' ? 'green' : r.status === 'activated' ? 'blue' : 'gray') + '">' + st + '</span></td><td class="tiny muted">' + A.fmtTime(r.created_at) + '</td></tr>';
      }).join('');
      var wRows = d.withdrawals.map(function (w) {
        var st = { requested: '审核中', approved: '已通过', paid: '已打款', rejected: '已拒绝' }[w.status] || w.status;
        var cls = w.status === 'paid' ? 'green' : w.status === 'rejected' ? 'red' : 'orange';
        return '<tr><td class="mono">#' + w.id + '</td><td><b>' + money(w.amount_cents) + '</b></td><td><span class="pill ' + cls + '">' + st + '</span></td><td class="tiny muted">' + A.fmtTime(w.created_at) + '</td><td class="tiny muted">' + A.esc(w.note || '') + '</td></tr>';
      }).join('');
      if (!root.contains(box)) return;
      box.innerHTML =
        '<div class="referral-hero"><div><span class="kicker">REFERRAL PROGRAM</span><h2>邀请一位客户，获得首单 20% 奖励</h2><p>把链接发给正在找客服/线索工具的站长、朋友和客户。对方通过你的链接注册并完成首次付费，奖励在 7 天后可提现。</p>' +
          '<div class="ref-link-box"><span class="mono" data-ref-link>' + A.esc(d.link) + '</span><button class="au-btn au-btn--primary au-btn--sm" data-copy-ref>复制邀请链接</button></div>' +
          '<div class="tiny" style="margin-top:8px;opacity:.8">推广码：<b class="mono">' + A.esc(d.code) + '</b> · 最低提现 ' + money(d.rules.minWithdrawCents) + ' · 奖励结算周期 ' + d.rules.holdDays + ' 天</div></div>' +
          '<div class="ref-stats"><div><b>' + money(s.availableCents) + '</b><span>可提现</span></div><div><b>' + money(s.pendingCents) + '</b><span>待结算</span></div><div><b>' + money(s.earnedCents) + '</b><span>累计奖励</span></div><div><b>' + s.paid + '</b><span>付费客户</span></div></div></div>' +
        '<div class="grid g4 section-gap">' +
          '<div class="metric-card"><div class="m-label">访问</div><div class="m-value">' + s.visits + '</div><div class="m-sub">通过邀请链接</div></div>' +
          '<div class="metric-card"><div class="m-label">注册</div><div class="m-value">' + s.registered + '</div><div class="m-sub">产生推荐关系</div></div>' +
          '<div class="metric-card"><div class="m-label">激活</div><div class="m-value">' + s.activated + '</div><div class="m-sub">安装或首条会话</div></div>' +
          '<div class="metric-card"><div class="m-label">付费</div><div class="m-value">' + s.paid + '</div><div class="m-sub">完成首次订阅</div></div>' +
        '</div>' +
        '<div class="grid g2 section-gap"><div class="az-card"><div class="az-card-head"><div><h3>奖励记录</h3><div class="sub">首单 20%，7 天后可提现</div></div>' + (A.isAdmin() && s.availableCents >= d.rules.minWithdrawCents ? '<button class="au-btn au-btn--primary au-btn--xs" data-withdraw>申请提现</button>' : '') + '</div><div class="az-card-body flush"><div class="table-wrap"><table class="az-table"><thead><tr><th>被邀请人</th><th>订单</th><th>套餐</th><th>奖励</th><th>状态</th><th>时间</th></tr></thead><tbody>' + (rewardRows || '<tr><td colspan="6"><div class="empty-state" style="padding:24px">还没有奖励记录，先分享邀请链接</div></td></tr>') + '</tbody></table></div></div></div>' +
          '<div class="az-card"><div class="az-card-head"><div><h3>提现记录</h3><div class="sub">平台运营人工审核打款</div></div></div><div class="az-card-body flush"><div class="table-wrap"><table class="az-table"><thead><tr><th>编号</th><th>金额</th><th>状态</th><th>时间</th><th>备注</th></tr></thead><tbody>' + (wRows || '<tr><td colspan="5"><div class="empty-state" style="padding:24px">暂无可提现记录</div></td></tr>') + '</tbody></table></div></div></div></div>' +
        '<div class="grid g2"><div class="az-card"><div class="az-card-head"><h3>邀请注册</h3></div><div class="az-card-body flush"><div class="table-wrap"><table class="az-table"><thead><tr><th>账号</th><th>工作空间</th><th>状态</th><th>时间</th></tr></thead><tbody>' + (refRows || '<tr><td colspan="4"><div class="empty-state" style="padding:24px">还没有邀请注册</div></td></tr>') + '</tbody></table></div></div></div>' +
          '<div class="az-card pad"><h4 style="margin:0 0 8px;font-size:13px">推广规则</h4><div class="tiny muted" style="line-height:2">· 通过你的专属链接注册的新账号才计入推荐关系<br>· 被邀请人完成首次付费后，按实付金额的 20% 生成奖励<br>· 奖励在支付后 7 天转为可提现，退款订单会作废<br>· 最低提现 ' + money(d.rules.minWithdrawCents) + '，由平台运营人工审核打款<br>· 禁止自邀请、刷单和虚假注册</div></div></div>';
      A.$$('[data-copy-ref]', root).forEach(function (b) { b.onclick = function () { A.copy(d.link); }; });
      var wb = root.querySelector('[data-withdraw]');
      if (wb) wb.onclick = function () { withdraw(d, root); };
    }).catch(function (e) { if (!root.contains(box)) return; A.handleError(e); box.innerHTML = A.empty('加载失败', e.message); });
  }

  function withdraw(d, root) {
    var m = A.modal({
      title: '申请提现', subtitle: '可提现余额 ' + money(d.stats.availableCents),
      body: '<div class="grid"><div><label class="field-label">提现金额（元）</label><input class="az-input" data-wa type="number" min="' + (d.rules.minWithdrawCents / 100) + '" step="0.01" value="' + (d.stats.availableCents / 100).toFixed(2) + '"></div><div><label class="field-label">收款说明</label><textarea class="az-textarea" data-wnote placeholder="微信号 / 支付宝账号 / 对公账户"></textarea></div></div>',
      footer: [{ label: '取消', class: 'au-btn--ghost' }, { label: '提交申请', class: 'au-btn--primary', onClick: function (card, close) {
        var amount = Math.round(Number(card.querySelector('[data-wa]').value) * 100);
        var note = card.querySelector('[data-wnote]').value.trim();
        if (!amount || amount < d.rules.minWithdrawCents) return A.toast('提现金额低于最低限额', 'err');
        A.apiPost('/api/referral/withdrawals', { amount_cents: amount, note: note }).then(function () { close(); A.toast('提现申请已提交', 'ok'); load(root); }).catch(A.handleError);
      } }]
    });
  }
})();
