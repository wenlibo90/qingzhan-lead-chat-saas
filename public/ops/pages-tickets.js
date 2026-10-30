(function () {
  'use strict';
  var O = window.Ops;
  var STATUS = { open: '待回复', pending: '已回复', resolved: '已解决', closed: '已关闭' };
  var PRIORITY = { low: '低', normal: '普通', high: '高', urgent: '紧急' };
  var CATEGORY = { install: '接入安装', billing: '套餐计费', feature: '功能咨询', bug: '故障', other: '其他' };
  var st = { status: '', priority: '', q: '' };

  O.register('tickets', {
    title: '支持工单', subtitle: '客户接入、计费与产品问题',
    render: function (root) {
      root.innerHTML = '<div class="page-head"><div><h1>支持工单</h1><p>客户在后台提交的问题会进入这里，回复后客户会收到站内通知。</p></div></div><div class="az-card"><div class="az-card-body tight" style="padding-bottom:12px"><div id="ticket-stats" class="flex gap-1 wrap mb-2"></div><div class="ops-filters"><input class="au-input" data-q placeholder="搜索标题、客户或工单号" value="' + O.esc(st.q) + '"><select class="au-select" data-status><option value="">全部状态</option><option value="open">待回复</option><option value="pending">已回复</option><option value="resolved">已解决</option><option value="closed">已关闭</option></select><select class="au-select" data-priority><option value="">全部优先级</option><option value="urgent">紧急</option><option value="high">高</option><option value="normal">普通</option><option value="low">低</option></select></div></div><div id="ticket-body">' + skeleton(3) + '</div></div>';
      var t;
      root.querySelector('[data-q]').oninput = function (e) { clearTimeout(t); t = setTimeout(function () { st.q = e.target.value.trim(); load(root); }, 300); };
      root.querySelector('[data-status]').onchange = function (e) { st.status = e.target.value; load(root); };
      root.querySelector('[data-priority]').onchange = function (e) { st.priority = e.target.value; load(root); };
      load(root);
    }
  });

  function load(root) {
    var qs = '/api/ops/tickets?status=' + encodeURIComponent(st.status) + '&priority=' + encodeURIComponent(st.priority) + '&q=' + encodeURIComponent(st.q);
    O.api(qs).then(function (d) {
      root.querySelector('#ticket-stats').innerHTML = [['', '全部'], ['open', '待回复'], ['pending', '已回复'], ['resolved', '已解决'], ['closed', '已关闭']].map(function (x) {
        var n = x[0] ? (d.stats[x[0]] || 0) : d.stats.all;
        return '<button class="au-chip ' + (st.status === x[0] ? 'active' : '') + '" data-tstat="' + x[0] + '">' + x[1] + ' <b>' + n + '</b></button>';
      }).join('');
      O.$$('[data-tstat]', root).forEach(function (b) { b.onclick = function () { st.status = b.getAttribute('data-tstat'); load(root); }; });
      var body = root.querySelector('#ticket-body');
      body.innerHTML = '<div class="table-wrap"><table class="az-table"><thead><tr><th>工单</th><th>客户</th><th>分类</th><th>优先级</th><th>状态</th><th>消息</th><th>最近更新</th><th></th></tr></thead><tbody>' +
        (d.tickets.length ? d.tickets.map(function (t) {
          var cls = t.status === 'open' ? 'orange' : t.status === 'pending' ? 'blue' : t.status === 'resolved' ? 'green' : 'gray';
          return '<tr><td><div class="u-name">#' + t.id + ' ' + O.esc(t.subject) + '</div><div class="u-sub">' + O.esc(t.user_name || '客户') + '</div></td><td><div class="u-sub">' + O.esc(t.tenant_name) + '</div><div class="u-sub">' + O.planLabel(t.plan) + '</div></td><td>' + (CATEGORY[t.category] || t.category) + '</td><td>' + (PRIORITY[t.priority] || t.priority) + '</td><td><span class="pill ' + cls + '">' + (STATUS[t.status] || t.status) + '</span></td><td>' + t.messages + '</td><td class="tiny muted">' + O.fmtTime(t.last_message_at || t.created_at) + '</td><td><button class="au-btn au-btn--ghost au-btn--xs" data-ticket="' + t.id + '">处理</button></td></tr>';
        }).join('') : '<tr><td colspan="8"><div class="ops-empty">暂无工单</div></td></tr>') + '</tbody></table></div>';
      O.$$('[data-ticket]', body).forEach(function (b) { b.onclick = function () { openTicket(b.getAttribute('data-ticket'), root); }; });
    }).catch(O.handle);
  }

  function openTicket(id, root) {
    O.api('/api/ops/tickets/' + id).then(function (d) {
      var t = d.ticket;
      var body = '<div class="ops-detail-grid"><div class="ops-detail-card"><h4>工单信息</h4><b>#' + t.id + ' ' + O.esc(t.subject) + '</b><p>' + (CATEGORY[t.category] || t.category) + ' · ' + (PRIORITY[t.priority] || t.priority) + '<br>客户：' + O.esc(t.tenant_name) + ' · ' + O.planLabel(t.plan) + '<br>提交人：' + O.esc(t.user_name || '客户') + '<br>创建时间：' + O.fmtTime(t.created_at) + '</p></div>' +
        '<div class="ops-detail-card"><h4>处理状态</h4><div class="grid" style="gap:7px"><select class="az-select" data-status>' + Object.keys(STATUS).map(function (k) { return '<option value="' + k + '"' + (t.status === k ? ' selected' : '') + '>' + STATUS[k] + '</option>'; }).join('') + '</select><select class="az-select" data-priority>' + Object.keys(PRIORITY).map(function (k) { return '<option value="' + k + '"' + (t.priority === k ? ' selected' : '') + '>' + PRIORITY[k] + '</option>'; }).join('') + '</select><button class="au-btn au-btn--ghost au-btn--xs" data-save>保存状态</button></div></div></div>' +
        '<div class="divider"></div><div class="ticket-thread">' + d.messages.map(function (m) {
          var mine = m.sender_type === 'platform';
          return '<div class="ticket-msg ' + (mine ? 'mine' : 'platform') + '"><div class="tm-head"><b>' + O.esc(m.sender_name || (mine ? '平台运营' : '客户')) + '</b><span>' + O.fmtTime(m.created_at) + '</span></div><div class="tm-body">' + O.esc(m.content).replace(/\n/g, '<br>') + '</div></div>';
        }).join('') + '</div>' +
        '<label class="field-label mt-2">回复客户</label><textarea class="az-textarea" data-reply rows="4" placeholder="回复会同步到客户后台并发送站内通知"></textarea><div class="flex gap-1 mt-1"><button class="au-btn au-btn--primary au-btn--sm" data-send>发送回复</button><button class="au-btn au-btn--ghost au-btn--sm" data-close-ticket>关闭工单</button></div>';
      var m = O.modal({ title: '处理工单', size: 'wide', body: body, footer: [{ label: '关闭', class: 'au-btn--ghost' }] });
      m.el.querySelector('[data-save]').onclick = function () {
        O.api('/api/ops/tickets/' + t.id, { method: 'PATCH', body: { status: m.el.querySelector('[data-status]').value, priority: m.el.querySelector('[data-priority]').value } }).then(function () { m.close(); O.toast('工单状态已更新', 'ok'); load(root); }).catch(O.handle);
      };
      m.el.querySelector('[data-send]').onclick = function () {
        var content = m.el.querySelector('[data-reply]').value.trim();
        if (!content) return O.toast('请填写回复内容', 'err');
        O.api('/api/ops/tickets/' + t.id + '/messages', { body: { content: content } }).then(function () { m.close(); O.toast('已回复客户', 'ok'); load(root); }).catch(O.handle);
      };
      m.el.querySelector('[data-close-ticket]').onclick = function () {
        O.api('/api/ops/tickets/' + t.id, { method: 'PATCH', body: { status: 'closed' } }).then(function () { m.close(); O.toast('工单已关闭', 'ok'); load(root); }).catch(O.handle);
      };
    }).catch(O.handle);
  }

  function skeleton(n) { return '<div class="az-card pad">' + Array.from({ length: n }).map(function () { return '<div class="au-skeleton" style="margin-bottom:12px"></div>'; }).join('') + '</div>'; }
})();
