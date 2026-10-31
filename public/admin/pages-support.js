/* Support tickets */
(function () {
  'use strict';
  var A = window.Admin;
  var CATEGORY = { install: '接入安装', billing: '套餐计费', feature: '功能咨询', bug: '故障问题', other: '其他' };
  var PRIORITY = { low: '低', normal: '普通', high: '高', urgent: '紧急' };
  var STATUS = { open: '待回复', pending: '已回复', resolved: '已解决', closed: '已关闭' };
  var state = { status: '', tickets: [], stats: {} };

  A.registerPage('support', {
    title: '帮助与工单', subtitle: '接入、计费与产品问题',
    roles: ['admin', 'operator', 'agent'],
    render: function (root) {
      root.innerHTML = '<div class="page-head"><div><h1>帮助与工单</h1><p>平台运营会在这里回复接入、计费和产品问题。</p></div><button class="au-btn au-btn--primary au-btn--sm" data-new-ticket>提交工单</button></div><div class="az-card"><div class="az-card-body tight" style="padding-bottom:12px"><div class="flex gap-1 wrap mb-2" id="ticket-stats"></div><div class="tiny muted" id="ticket-tip">工单会同步到平台运营后台，紧急问题请选择「紧急」。</div></div><div id="ticket-list">' + A.skeleton(3) + '</div></div>';
      root.querySelector('[data-new-ticket]').onclick = function () { newTicket(root); };
      load(root);
    }
  });

  function load(root) {
    var statsBox = root.querySelector('#ticket-stats');
    var listBox = root.querySelector('#ticket-list');
    if (!statsBox || !listBox) return;
    A.api('/api/support/tickets' + (state.status ? '?status=' + state.status : '')).then(function (d) {
      if (!root.contains(statsBox) || !root.contains(listBox)) return;
      state.tickets = d.tickets; state.stats = d.stats;
      var stats = statsBox;
      stats.innerHTML = [['', '全部'], ['open', '待回复'], ['pending', '已回复'], ['resolved', '已解决'], ['closed', '已关闭']].map(function (x) {
        var count = x[0] ? (d.stats[x[0]] || 0) : (d.stats.open + d.stats.pending + d.stats.resolved + d.stats.closed);
        return '<button class="au-chip ' + (state.status === x[0] ? 'active' : '') + '" data-tstat="' + x[0] + '">' + x[1] + ' <b>' + count + '</b></button>';
      }).join('');
      A.$$('[data-tstat]', root).forEach(function (b) { b.onclick = function () { state.status = b.getAttribute('data-tstat'); load(root); }; });
      var list = listBox;
      list.innerHTML = d.tickets.length ? d.tickets.map(function (t) {
        var st = STATUS[t.status] || t.status;
        var cls = t.status === 'open' ? 'orange' : t.status === 'pending' ? 'blue' : t.status === 'resolved' ? 'green' : 'gray';
        return '<button class="ticket-row" data-ticket="' + t.id + '"><span class="ticket-id">#' + t.id + '</span><span class="ticket-main"><b>' + A.esc(t.subject) + '</b><span>' + (CATEGORY[t.category] || t.category) + ' · ' + (PRIORITY[t.priority] || t.priority) + ' · ' + t.messages + ' 条消息</span></span><span class="ticket-time">' + A.fmtTime(t.last_message_at || t.created_at) + '</span><span class="pill ' + cls + '">' + st + '</span></button>';
      }).join('') : A.empty('还没有工单', '遇到接入、计费或产品问题，可以直接提交给平台运营。');
      A.$$('[data-ticket]', list).forEach(function (b) { b.onclick = function () { openTicket(b.getAttribute('data-ticket'), root); }; });
    }).catch(A.handleError);
  }

  function newTicket(root) {
    var m = A.modal({
      title: '提交工单', subtitle: '描述越具体，回复越快',
      body: '<div class="form-grid"><div class="full"><label class="field-label">问题标题</label><input class="az-input" data-t="subject" placeholder="例如：安装 JS 后没有看到挂件"></div><div><label class="field-label">分类</label><select class="az-select" data-t="category">' + Object.keys(CATEGORY).map(function (k) { return '<option value="' + k + '">' + CATEGORY[k] + '</option>'; }).join('') + '</select></div><div><label class="field-label">优先级</label><select class="az-select" data-t="priority"><option value="normal">普通</option><option value="high">高</option><option value="urgent">紧急</option><option value="low">低</option></select></div><div class="full"><label class="field-label">问题描述</label><textarea class="az-textarea" data-t="content" rows="5" placeholder="请说明页面、操作步骤、浏览器和期望结果"></textarea></div></div>',
      footer: [{ label: '取消', class: 'au-btn--ghost' }, { label: '提交工单', class: 'au-btn--primary', onClick: function (card, close) {
        var body = {};
        A.$$('[data-t]', card).forEach(function (i) { body[i.getAttribute('data-t')] = i.value.trim(); });
        A.apiPost('/api/support/tickets', body).then(function () { close(); A.toast('工单已提交', 'ok'); load(root); }).catch(A.handleError);
      } }]
    });
  }

  function openTicket(id, root) {
    A.api('/api/support/tickets/' + id).then(function (d) {
      var t = d.ticket;
      var body = '<div class="ticket-meta"><span class="pill ' + (t.status === 'open' ? 'orange' : t.status === 'pending' ? 'blue' : t.status === 'resolved' ? 'green' : 'gray') + '">' + (STATUS[t.status] || t.status) + '</span><span>' + (CATEGORY[t.category] || t.category) + '</span><span>' + (PRIORITY[t.priority] || t.priority) + '</span><span>创建于 ' + A.fmtTime(t.created_at) + '</span></div>' +
        '<div class="ticket-thread">' + d.messages.map(function (msg) {
          var mine = msg.sender_type === 'tenant';
          return '<div class="ticket-msg ' + (mine ? 'mine' : 'platform') + '"><div class="tm-head"><b>' + A.esc(msg.sender_name || (mine ? '我' : '平台运营')) + '</b><span>' + A.fmtTime(msg.created_at) + '</span></div><div class="tm-body">' + A.esc(msg.content).replace(/\n/g, '<br>') + '</div></div>';
        }).join('') + '</div>' +
        (t.status === 'closed' ? '<div class="notice info mt-2">工单已关闭。如需继续，请提交新工单。</div>' : '<div class="mt-2"><label class="field-label">补充回复</label><textarea class="az-textarea" data-reply rows="3" placeholder="补充信息或回复平台运营"></textarea><div class="flex gap-1 mt-1"><button class="au-btn au-btn--primary au-btn--sm" data-send>发送</button><button class="au-btn au-btn--ghost au-btn--sm" data-resolve>标记已解决</button></div></div>');
      var m = A.modal({ title: t.subject, size: 'wide', body: body, footer: [{ label: '关闭', class: 'au-btn--ghost' }] });
      var send = m.el.querySelector('[data-send]');
      if (send) send.onclick = function () {
        var content = m.el.querySelector('[data-reply]').value.trim();
        if (!content) return A.toast('请填写回复内容', 'err');
        A.apiPost('/api/support/tickets/' + t.id + '/messages', { content: content }).then(function () { m.close(); A.toast('已回复', 'ok'); load(root); }).catch(A.handleError);
      };
      var resolve = m.el.querySelector('[data-resolve]');
      if (resolve) resolve.onclick = function () {
        A.apiPatch('/api/support/tickets/' + t.id, { status: 'resolved' }).then(function () { m.close(); A.toast('已标记解决', 'ok'); load(root); }).catch(A.handleError);
      };
    }).catch(A.handleError);
  }
})();
