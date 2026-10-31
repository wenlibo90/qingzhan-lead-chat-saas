/* Visitors & leads */
(function () {
  'use strict';
  var A = window.Admin;
  var D = A.data;

  // ---------------- visitors ----------------
  A.registerPage('visitors', {
    title: '访客档案', subtitle: '同一设备回访自动合并的访客全景',
    roles: ['admin', 'operator', 'agent'],
    feature: 'visitor_profile_basic',
    render: function (root, ctx) {
      if (ctx.params && ctx.params[0]) return renderVisitorDetail(root, Number(ctx.params[0]));
      if (!D.visitors) D.visitors = { q: '', intent: '', page: 1 };
      var st = D.visitors;
      root.innerHTML = '<div class="page-head"><div><h1>访客档案</h1><p>自动采集来源、轨迹、设备与意向，回访自动合并为同一档案。</p></div>' +
        '<div class="head-actions"><button class="au-btn au-btn--ghost au-btn--sm" data-export>' + A.icon('download', 14) + ' 导出访客</button>' +
        '<button class="au-btn au-btn--primary au-btn--sm" data-refresh>' + A.icon('refresh', 14) + ' 刷新</button></div></div>' +
        '<div class="az-card section-gap"><div class="az-card-body" style="padding-bottom:10px"><div class="filters">' +
        '<input class="au-input" data-q placeholder="搜索姓名、手机号、访客ID、城市" value="' + A.esc(st.q) + '">' +
        '<select class="au-select" data-intent><option value="">全部意向</option><option value="high"' + (st.intent === 'high' ? ' selected' : '') + '>高意向</option><option value="medium"' + (st.intent === 'medium' ? ' selected' : '') + '>中意向</option><option value="low"' + (st.intent === 'low' ? ' selected' : '') + '>低意向</option></select>' +
        '<span class="tiny muted" data-total></span></div></div><div class="az-card-body flush" id="visitor-table">' + A.skeleton(4) + '</div></div>';
      var timer;
      root.querySelector('[data-q]').addEventListener('input', function (e) {
        clearTimeout(timer);
        timer = setTimeout(function () { st.q = e.target.value.trim(); st.page = 1; loadVisitors(root); }, 300);
      });
      root.querySelector('[data-intent]').addEventListener('change', function (e) { st.intent = e.target.value; st.page = 1; loadVisitors(root); });
      root.querySelector('[data-refresh]').addEventListener('click', function () { loadVisitors(root); });
      root.querySelector('[data-export]').addEventListener('click', function () { exportVisitors(); });
      loadVisitors(root);
    }
  });

  function exportVisitors() {
    if (!A.can('crm')) return A.upgrade('crm', '导出访客需要专业版');
    var url = '/api/visitors/export.csv' + (A.state.siteId ? '?siteId=' + A.state.siteId : '');
    fetch(url, { headers: { Authorization: 'Bearer ' + A.state.token } }).then(function (r) {
      if (!r.ok) throw new Error('导出失败');
      return r.blob();
    }).then(function (blob) {
      var a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = 'visitors_' + new Date().toISOString().slice(0, 10) + '.csv';
      a.click();
      URL.revokeObjectURL(a.href);
      A.toast('导出已开始', 'ok');
    }).catch(function (e) { A.toast(e.message, 'err'); });
  }

  function loadVisitors(root) {
    var st = D.visitors;
    var box = root.querySelector('#visitor-table');
    if (box) box.innerHTML = A.skeleton(4);
    var url = '/api/visitors?page=' + st.page + '&limit=20' + A.siteQ() + (st.q ? '&q=' + encodeURIComponent(st.q) : '') + (st.intent ? '&intent=' + st.intent : '');
    A.api(url).then(function (d) {
      var totalEl = root.querySelector('[data-total]');
      if (totalEl) totalEl.textContent = '共 ' + d.total + ' 位访客';
      if (!d.visitors.length) {
        box.innerHTML = A.empty('暂无访客', '访客访问嵌入 JS 的站点后会自动出现在这里');
        return;
      }
      box.innerHTML = '<div class="table-wrap"><table class="az-table"><thead><tr><th>访客</th><th>地区</th><th>来源</th><th>设备</th><th>访问</th><th>停留</th><th>意向</th><th>最近访问</th><th></th></tr></thead><tbody>' +
        d.visitors.map(function (v) {
          return '<tr><td><div class="flex items-center gap-1"><span class="avatar-sm">' + A.esc((v.name || '匿').slice(0, 1)) + '</span><div><div class="u-name">' + A.esc(v.name || '匿名访客') + (v.blocked ? ' <span class="pill red" style="font-size:9px">已拉黑</span>' : '') + '</div><div class="u-sub mono">' + A.esc(v.vid) + '</div></div></div></td>' +
            '<td>' + A.esc(v.province || '-') + ' <span class="tiny muted">' + A.esc(v.city || '') + '</span></td>' +
            '<td>' + (d.advanced ? A.esc(A.sourceLabel(v.source)) : '<span class="muted">标准版</span>') + '</td>' +
            '<td class="tiny">' + A.esc(v.os || '') + ' · ' + A.esc(v.browser || '') + '</td>' +
            '<td>' + v.pageviewCount + ' 页 <span class="tiny muted">/ ' + v.visitCount + ' 次</span></td>' +
            '<td>' + Math.round((v.totalDwellMs || 0) / 1000) + 's</td>' +
            '<td>' + (d.advanced ? A.intentPill(v.intentLevel, v.intentScore) : '<span class="pill gray">专业版</span>') + '</td>' +
            '<td class="tiny muted">' + A.timeAgo(v.lastSeen) + '</td>' +
            '<td><button class="au-btn au-btn--ghost au-btn--xs" data-v="' + v.id + '">档案</button></td></tr>';
        }).join('') + '</tbody></table></div>' +
        '<div class="table-foot"><span>第 ' + d.page + ' 页 · 共 ' + d.total + ' 条</span><div class="pager">' +
        '<button ' + (d.page <= 1 ? 'disabled' : '') + ' data-pg="' + (d.page - 1) + '">上一页</button>' +
        '<button ' + (d.visitors.length < d.limit ? 'disabled' : '') + ' data-pg="' + (d.page + 1) + '">下一页</button></div></div>';
      A.$$('[data-v]', box).forEach(function (b) { b.addEventListener('click', function () { A.go('visitors/' + b.getAttribute('data-v')); }); });
      A.$$('[data-pg]', box).forEach(function (b) {
        b.addEventListener('click', function () { st.page = Number(b.getAttribute('data-pg')); loadVisitors(root); });
      });
    }).catch(function (e) { A.handleError(e); if (box) box.innerHTML = A.empty('加载失败', e.message); });
  }

  function renderVisitorDetail(root, id) {
    root.innerHTML = '<div class="page-head"><div><h1>访客档案</h1><p>加载中...</p></div><div class="head-actions"><button class="au-btn au-btn--ghost au-btn--sm" data-back>' + A.icon('back', 14) + ' 返回列表</button></div></div><div id="vd-body">' + A.skeleton(5) + '</div>';
    root.querySelector('[data-back]').addEventListener('click', function () { A.go('visitors'); });
    var vdBox = root.querySelector('#vd-body');
    A.api('/api/visitors/' + id).then(function (d) { if (vdBox && root.contains(vdBox)) renderDetailBody(root, d); }).catch(function (e) {
      if (!vdBox || !root.contains(vdBox)) return;
      A.handleError(e);
      vdBox.innerHTML = A.empty('无法查看档案', e.message);
    });
  }

  function renderDetailBody(root, d) {
    var v = d.visitor;
    var body = root.querySelector('#vd-body');
    var head = root.querySelector('.page-head p');
    if (head) head.textContent = (v.name || '匿名访客') + ' · ' + (v.province || '') + ' ' + (v.city || '') + ' · 最近访问 ' + A.timeAgo(v.lastSeen);
    var adv = d.advanced;
    var score = Number(v.intentScore) || 0;
    var ring = 'conic-gradient(#ef4444 ' + (score * 3.6) + 'deg, rgba(148,163,184,.16) 0deg)';
    if (score < 30) ring = 'conic-gradient(#64748b ' + (score * 3.6) + 'deg, rgba(148,163,184,.16) 0deg)';
    else if (score < 60) ring = 'conic-gradient(#f59e0b ' + (score * 3.6) + 'deg, rgba(148,163,184,.16) 0deg)';
    var tags = v.tags || [];
    body.innerHTML =
      '<div class="grid g-1-2 grid-start section-gap">' +
      '<div class="az-card pad">' +
      '<div class="flex items-center gap-2"><div style="width:74px;height:74px;border-radius:50%;background:' + ring + ';display:grid;place-items:center;flex-shrink:0"><div style="width:58px;height:58px;border-radius:50%;background:#fff;display:flex;flex-direction:column;align-items:center;justify-content:center"><b style="font-size:20px;letter-spacing:-.03em">' + (adv ? score : '-') + '</b><span class="tiny muted" style="font-size:8px">意向分</span></div></div>' +
      '<div style="min-width:0"><b style="font-size:17px;letter-spacing:-.02em">' + A.esc(v.name || '匿名访客') + '</b><div class="tiny muted mono">' + A.esc(v.vid) + '</div><div class="tag-list mt-1">' + (adv ? A.intentPill(v.intentLevel, v.intentScore) : '<span class="pill gray">意向打分需专业版</span>') + (v.blocked ? '<span class="pill red">已拉黑</span>' : '') + '</div></div></div>' +
      '<div class="tag-edit mt-2">' + (tags.length ? tags.map(function (t) { return '<span class="au-chip">' + A.esc(t) + '</span>'; }).join('') : '<span class="tiny muted">暂无标签</span>') + '<button class="au-chip" data-edit-tags style="font-size:10.5px">+ 标签</button></div>' +
      '<div class="divider"></div>' +
      kv('手机号', v.phone || '未留资') + kv('邮箱', v.email || '-') + kv('公司', v.company || '-') + kv('业务类型', v.businessType || '-') + kv('设备', (v.os || '') + ' ' + (v.browser || '') + ' · ' + (v.device || '')) + kv('地区', (v.province || '') + ' ' + (v.city || '')) + kv('IP', v.ip || '-') + kv('语言', v.language || '-') +
      '<div class="flex gap-1 mt-2"><button class="au-btn au-btn--ghost au-btn--xs" data-edit>编辑资料</button><button class="au-btn ' + (v.blocked ? 'au-btn--success' : 'au-btn--danger') + ' au-btn--xs" data-block>' + (v.blocked ? '解除拉黑' : '拉黑访客') + '</button></div></div>' +

      '<div class="grid" style="gap:16px">' +
      '<div class="grid g3">' + metricCard('访问页数', v.pageviewCount, 'eye') + metricCard('访问次数', v.visitCount, 'refresh') + metricCard('总停留', Math.round((v.totalDwellMs || 0) / 60000) + ' 分', 'clock') + '</div>' +
      '<div class="az-card"><div class="az-card-head"><h3>访客轨迹</h3><div class="sub">来源：' + A.esc(A.sourceLabel(v.source)) + (v.keyword ? ' · 关键词「' + A.esc(v.keyword) + '」' : '') + '</div></div><div class="az-card-body">' +
      '<div class="tabs" id="v-tabs"><button class="active" data-vtab="timeline">时间线</button><button data-vtab="pages">页面轨迹</button><button data-vtab="conv">会话记录</button><button data-vtab="forms">表单提交</button><button data-vtab="files">文件与录屏</button><button data-vtab="leads">线索</button></div>' +
      '<div id="v-tab-body" class="mt-2"></div></div></div></div></div>';

    function kv(k, val) { return '<div class="side-kv"><span>' + k + '</span><b title="' + A.esc(val) + '">' + A.esc(val) + '</b></div>'; }
    function metricCard(label, value, ico) {
      return '<div class="metric-card" style="padding:13px"><div class="m-top"><span class="m-label">' + label + '</span><span class="m-ico">' + A.icon(ico, 13) + '</span></div><div class="m-value" style="font-size:21px">' + value + '</div></div>';
    }

    var tab = 'timeline';
    function renderTab() {
      var box = body.querySelector('#v-tab-body');
      if (tab === 'timeline') {
        box.innerHTML = d.timeline.length ? d.timeline.map(function (t) {
          var ico = { session: 'eye', conversation: 'chat', form: 'form', click: 'target' }[t.icon] || 'activity';
          return '<div class="flex gap-1" style="padding:8px 0;border-bottom:1px dashed rgba(148,163,184,.18)"><span class="avatar-sm gray">' + A.icon(ico, 12) + '</span><div style="flex:1"><b style="font-size:11.5px">' + A.esc(t.title) + '</b><div class="tiny muted">' + A.esc(t.detail || '') + '</div></div><span class="tiny muted">' + A.fmtTime(t.at) + '</span></div>';
        }).join('') : A.empty('暂无轨迹');
      } else if (tab === 'pages') {
        box.innerHTML = '<div class="table-wrap"><table class="az-table"><thead><tr><th>页面</th><th>地址</th><th>停留</th><th>时间</th></tr></thead><tbody>' +
          d.pageviews.map(function (p) { return '<tr><td>' + A.esc(A.clip(p.title || '-', 26)) + '</td><td class="tiny muted mono">' + A.esc(p.url) + '</td><td>' + Math.round((p.dwell_ms || 0) / 1000) + 's</td><td class="tiny muted">' + A.fmtTime(p.entered_at) + '</td></tr>'; }).join('') + '</tbody></table></div>';
      } else if (tab === 'conv') {
        box.innerHTML = d.conversations.length ? '<div class="table-wrap"><table class="az-table"><thead><tr><th>主题</th><th>客服</th><th>状态</th><th>满意度</th><th>时间</th><th></th></tr></thead><tbody>' +
          d.conversations.map(function (c) { return '<tr><td>' + A.esc(c.subject || '-') + '</td><td>' + A.esc(c.agent_name || '未分配') + '</td><td>' + A.statusPill(c.status) + '</td><td>' + (c.rating ? c.rating + ' 星' : '-') + '</td><td class="tiny muted">' + A.fmtTime(c.created_at) + '</td><td><button class="au-btn au-btn--ghost au-btn--xs" data-c="' + c.id + '">查看</button></td></tr>'; }).join('') + '</tbody></table></div>' : A.empty('暂无会话');
        A.$$('[data-c]', box).forEach(function (b) { b.addEventListener('click', function () { A.go('conversations/' + b.getAttribute('data-c')); }); });
      } else if (tab === 'forms') {
        box.innerHTML = d.submissions.length ? d.submissions.map(function (s) {
          return '<div class="recording-link"><span class="r-ico" style="background:rgba(37,99,235,.1);color:#2563eb">' + A.icon('form', 14) + '</span><span style="flex:1"><b style="font-size:11.5px">' + A.esc(s.form_name || '表单') + '</b><span class="tiny muted" style="display:block">' + Object.keys(s.data).map(function (k) { return k + '：' + A.esc(s.data[k]); }).join(' · ') + '</span></span><span class="tiny muted">' + A.fmtTime(s.created_at) + '</span></div>';
        }).join('') : A.empty('暂无表单提交');
      } else if (tab === 'files') {
        var filesHtml = d.files.map(function (f) {
          return '<a class="recording-link" href="' + A.esc(f.file_url) + '" target="_blank" rel="noopener"><span class="r-ico" style="background:rgba(37,99,235,.1);color:#2563eb">' + A.icon(f.type === 'image' ? 'image' : 'file', 14) + '</span><span style="flex:1"><b style="font-size:11.5px">' + A.esc(f.file_name || '附件') + '</b><span class="tiny muted">' + A.fmtTime(f.created_at) + '</span></span></a>';
        }).join('');
        var recHtml = d.recordings.map(function (r) {
          return '<a class="recording-link" href="' + A.esc(r.file_url) + '" target="_blank" rel="noopener"><span class="r-ico">' + A.icon('video', 14) + '</span><span style="flex:1"><b style="font-size:11.5px">访客页面录屏</b><span class="tiny muted">' + A.fmtTime(r.created_at) + ' · ' + Math.round((r.size || 0) / 1024) + 'KB</span></span></a>';
        }).join('');
        box.innerHTML = (filesHtml || recHtml) ? filesHtml + recHtml : A.empty('暂无文件', '访客上传的图片、附件与录屏会汇总在这里');
      } else if (tab === 'leads') {
        if (!A.can('crm')) { box.innerHTML = '<div class="locked-card"><div class="lock-ov"><span class="lk-ico">' + A.icon('lock', 18) + '</span><h4>线索信息需要专业版</h4><p>升级后可查看该访客产生的全部线索与跟进记录。</p><button class="au-btn au-btn--primary au-btn--sm" onclick="Admin.upgrade(\'crm\')">升级</button></div></div>'; return; }
        box.innerHTML = d.leads.length ? '<div class="table-wrap"><table class="az-table"><thead><tr><th>线索</th><th>需求</th><th>状态</th><th>意向分</th><th>时间</th><th></th></tr></thead><tbody>' +
          d.leads.map(function (l) { return '<tr><td><b>' + A.esc(l.name || '-') + '</b><div class="u-sub">' + A.esc(l.phone || '') + '</div></td><td>' + A.esc(A.clip(l.requirement || '-', 28)) + '</td><td>' + A.statusPill(l.status) + '</td><td>' + Math.round(l.score) + '</td><td class="tiny muted">' + A.fmtTime(l.created_at) + '</td><td><button class="au-btn au-btn--ghost au-btn--xs" data-l="' + l.id + '">查看线索</button></td></tr>'; }).join('') + '</tbody></table></div>' : A.empty('暂无线索');
        A.$$('[data-l]', box).forEach(function (b) { b.addEventListener('click', function () { A.go('leads/' + b.getAttribute('data-l')); }); });
      }
    }
    renderTab();
    A.$$('[data-vtab]', body).forEach(function (b) {
      b.addEventListener('click', function () {
        tab = b.getAttribute('data-vtab');
        A.$$('[data-vtab]', body).forEach(function (x) { x.classList.remove('active'); });
        b.classList.add('active');
        renderTab();
      });
    });

    body.querySelector('[data-edit-tags]').onclick = function () { editTags(v, function () { A.refresh(); }); };
    body.querySelector('[data-edit]').onclick = function () { editVisitor(v); };
    body.querySelector('[data-block]').onclick = function () {
      A.confirm({ title: v.blocked ? '解除拉黑' : '拉黑访客', message: v.blocked ? '解除后访客可以重新发起咨询。' : '拉黑后该访客将无法发起咨询，确定继续？', danger: !v.blocked, okText: v.blocked ? '解除' : '拉黑' }).then(function (ok) {
        if (!ok) return;
        A.apiPatch('/api/visitors/' + v.id, { blocked: !v.blocked }).then(function () { A.toast('操作成功', 'ok'); A.refresh(); }).catch(A.handleError);
      });
    };
  }

  function editTags(v, done) {
    A.api('/api/tags').then(function (res) {
      A.modal({
        title: '编辑访客标签',
        body: '<div class="tag-edit" style="gap:7px">' + res.tags.map(function (t) {
          return '<button class="au-chip ' + ((v.tags || []).indexOf(t.name) > -1 ? 'active' : '') + '" data-tag="' + t.id + '">' + A.esc(t.name) + '</button>';
        }).join('') + '</div>',
        footer: [{ label: '取消', class: 'au-btn--ghost' }, { label: '保存', class: 'au-btn--primary', onClick: function (card, close) {
          var ids = A.$$('[data-tag].active', card).map(function (b) { return Number(b.getAttribute('data-tag')); });
          A.apiPost('/api/visitors/' + v.id + '/tags', { tagIds: ids }).then(function () { close(); A.toast('标签已更新', 'ok'); done(); }).catch(A.handleError);
        } }],
        onOpen: function (card) { A.$$('[data-tag]', card).forEach(function (b) { b.onclick = function () { b.classList.toggle('active'); }; }); }
      });
    }).catch(A.handleError);
  }

  function editVisitor(v) {
    A.modal({
      title: '编辑访客资料', subtitle: '补充信息会同步到线索与档案',
      body: '<div class="form-grid">' +
        '<div><label class="field-label">姓名</label><input class="az-input" data-f="name" value="' + A.esc(v.name || '') + '"></div>' +
        '<div><label class="field-label">手机号</label><input class="az-input" data-f="phone" value="' + A.esc(v.phone || '') + '"></div>' +
        '<div><label class="field-label">邮箱</label><input class="az-input" data-f="email" value="' + A.esc(v.email || '') + '"></div>' +
        '<div><label class="field-label">公司</label><input class="az-input" data-f="company" value="' + A.esc(v.company || '') + '"></div>' +
        '<div class="full"><label class="field-label">业务类型</label><input class="az-input" data-f="business_type" value="' + A.esc(v.businessType || '') + '"></div></div>',
      footer: [{ label: '取消', class: 'au-btn--ghost' }, { label: '保存', class: 'au-btn--primary', onClick: function (card, close) {
        var body = {};
        A.$$('[data-f]', card).forEach(function (i) { body[i.getAttribute('data-f')] = i.value.trim(); });
        A.apiPatch('/api/visitors/' + v.id, body).then(function () { close(); A.toast('资料已更新', 'ok'); A.refresh(); }).catch(A.handleError);
      } }]
    });
  }

  // ---------------- leads ----------------
  A.registerPage('leads', {
    title: '线索 CRM', subtitle: '聊天与表单线索统一流转',
    roles: ['admin', 'operator', 'agent'],
    feature: 'crm',
    render: function (root, ctx) {
      if (ctx.params && ctx.params[0]) return renderLeadDetail(root, Number(ctx.params[0]));
      if (!D.leads) D.leads = { status: '', view: 'kanban', q: '', page: 1 };
      var st = D.leads;
      root.innerHTML = '<div class="page-head"><div><h1>线索 CRM</h1><p>聊天、表单与离线留言自动汇入，统一状态流转与销售分配。</p></div><div class="head-actions">' +
        '<button class="au-btn au-btn--ghost au-btn--sm" data-export>' + A.icon('download', 14) + ' 导出 Excel</button>' +
        '<button class="au-btn au-btn--ghost au-btn--sm" data-view>' + (st.view === 'kanban' ? A.icon('list', 14) + ' 表格视图' : A.icon('grid', 14) + ' 看板视图') + '</button>' +
        '<button class="au-btn au-btn--primary au-btn--sm" data-create>' + A.icon('plus', 14) + ' 新建线索</button></div></div>' +
        '<div class="grid g4 section-gap" id="lead-stats"></div>' +
        '<div class="az-card"><div class="az-card-body" style="padding-bottom:8px"><div class="filters"><input class="au-input" data-q placeholder="搜索姓名、手机号、公司、需求" value="' + A.esc(st.q) + '"><select class="au-select" data-status><option value="">全部状态</option><option value="new">新线索</option><option value="following">跟进中</option><option value="won">已成交</option><option value="invalid">无效</option></select></div></div><div class="az-card-body" id="lead-body">' + A.skeleton(4) + '</div></div>';
      root.querySelector('[data-create]').onclick = createLead;
      root.querySelector('[data-export]').onclick = function () {
        if (!A.can('leads_export')) return A.upgrade('leads_export', '线索导出需要专业版');
        fetch('/api/leads/export.csv' + (A.state.siteId ? '?siteId=' + A.state.siteId : ''), { headers: { Authorization: 'Bearer ' + A.state.token } }).then(function (r) {
          if (!r.ok) throw new Error('导出失败');
          return r.blob();
        }).then(function (blob) {
          var a = document.createElement('a');
          a.href = URL.createObjectURL(blob);
          a.download = 'leads_' + new Date().toISOString().slice(0, 10) + '.csv';
          a.click();
          URL.revokeObjectURL(a.href);
          A.toast('导出已开始（Excel 可直接打开 CSV）', 'ok');
        }).catch(function (e) { A.toast(e.message, 'err'); });
      };
      root.querySelector('[data-view]').onclick = function () { st.view = st.view === 'kanban' ? 'table' : 'kanban'; A.route(); };
      root.querySelector('[data-status]').value = st.status;
      root.querySelector('[data-status]').onchange = function (e) { st.status = e.target.value; st.page = 1; loadLeads(root); };
      var t;
      root.querySelector('[data-q]').oninput = function (e) { clearTimeout(t); t = setTimeout(function () { st.q = e.target.value.trim(); st.page = 1; loadLeads(root); }, 300); };
      loadLeads(root);
    }
  });

  function loadLeads(root) {
    var st = D.leads;
    var body = root.querySelector('#lead-body');
    var stats = root.querySelector('#lead-stats');
    var url = '/api/leads?limit=50' + A.siteQ() + (st.status ? '&status=' + st.status : '') + (st.q ? '&q=' + encodeURIComponent(st.q) : '');
    A.api(url).then(function (d) {
      if (stats) stats.innerHTML = [
        { label: '全部线索', value: d.stats.all, ico: 'leads', color: '' },
        { label: '待跟进', value: d.stats.new, ico: 'clock', color: 'orange' },
        { label: '跟进中', value: d.stats.following, ico: 'activity', color: 'purple' },
        { label: '已成交', value: d.stats.won, ico: 'check', color: 'green' }
      ].map(function (m) {
        return '<div class="metric-card"><div class="m-top"><span class="m-label">' + m.label + '</span><span class="m-ico ' + m.color + '">' + A.icon(m.ico, 14) + '</span></div><div class="m-value" style="font-size:23px">' + m.value + '</div></div>';
      }).join('');
      if (!d.leads.length) { body.innerHTML = A.empty('暂无线索', '聊天或表单产生线索后会自动出现在这里'); return; }
      if (st.view === 'kanban') {
        var cols = [{ k: 'new', label: '新线索', color: '#2563eb' }, { k: 'following', label: '跟进中', color: '#f59e0b' }, { k: 'won', label: '已成交', color: '#10b981' }, { k: 'invalid', label: '无效', color: '#94a3b8' }];
        body.innerHTML = '<div class="kanban">' + cols.map(function (col) {
          var list = d.leads.filter(function (l) { return l.status === col.k; });
          return '<div class="k-col" data-drop="' + col.k + '"><div class="k-col-head"><span style="color:' + col.color + '">' + col.label + '</span><span class="count">' + (d.stats[col.k] || 0) + '</span></div>' +
            list.map(function (l) {
              return '<div class="k-card" draggable="true" data-lead="' + l.id + '" data-status="' + l.status + '"><b>' + A.esc(l.name || '匿名') + '</b><div class="k-phone">' + A.esc(l.phone || '未留手机号') + '</div>' +
                '<div class="k-meta"><span class="pill ' + (l.score >= 60 ? 'red' : l.score >= 30 ? 'orange' : 'gray') + '">' + Math.round(l.score) + ' 分</span><span class="pill gray">' + A.esc(A.sourceLabel(l.source)) + '</span>' + (l.ownerName ? '<span class="tiny muted">' + A.esc(l.ownerName) + '</span>' : '') + '</div></div>';
            }).join('') + '</div>';
        }).join('') + '</div>';
        A.$$('[data-lead]', body).forEach(function (card) {
          card.addEventListener('click', function () { A.go('leads/' + card.getAttribute('data-lead')); });
          card.addEventListener('dragstart', function (e) { e.dataTransfer.setData('text/plain', card.getAttribute('data-lead')); card.style.opacity = '.5'; });
          card.addEventListener('dragend', function () { card.style.opacity = '1'; });
        });
        A.$$('[data-drop]', body).forEach(function (col) {
          col.addEventListener('dragover', function (e) { e.preventDefault(); col.style.background = 'rgba(37,99,235,.06)'; });
          col.addEventListener('dragleave', function () { col.style.background = ''; });
          col.addEventListener('drop', function (e) {
            e.preventDefault();
            col.style.background = '';
            var id = e.dataTransfer.getData('text/plain');
            var status = col.getAttribute('data-drop');
            A.apiPatch('/api/leads/' + id, { status: status }).then(function () { A.toast('线索状态已更新', 'ok'); loadLeads(root); }).catch(A.handleError);
          });
        });
      } else {
        body.innerHTML = '<div class="table-wrap"><table class="az-table"><thead><tr><th>线索</th><th>来源</th><th>需求</th><th>状态</th><th>负责人</th><th>意向分</th><th>创建时间</th><th></th></tr></thead><tbody>' +
          d.leads.map(function (l) {
            return '<tr><td><div class="u-name">' + A.esc(l.name || '匿名') + '</div><div class="u-sub">' + A.esc(l.phone || '') + (l.company ? ' · ' + A.esc(l.company) : '') + '</div></td>' +
              '<td><span class="pill gray">' + A.esc(A.sourceLabel(l.source)) + '</span></td><td>' + A.esc(A.clip(l.requirement || '-', 30)) + '</td><td>' + A.statusPill(l.status) + '</td>' +
              '<td>' + A.esc(l.ownerName || '未分配') + '</td><td><span class="pill ' + (l.score >= 60 ? 'red' : l.score >= 30 ? 'orange' : 'gray') + '">' + Math.round(l.score) + '</span></td>' +
              '<td class="tiny muted">' + A.fmtTime(l.createdAt) + '</td><td><button class="au-btn au-btn--ghost au-btn--xs" data-lead="' + l.id + '">详情</button></td></tr>';
          }).join('') + '</tbody></table></div>';
        A.$$('[data-lead]', body).forEach(function (b) { b.addEventListener('click', function () { A.go('leads/' + b.getAttribute('data-lead')); }); });
      }
    }).catch(function (e) { A.handleError(e); if (body) body.innerHTML = A.empty('加载失败', e.message); });
  }

  function createLead() {
    A.api('/api/auth/users-lite').then(function (u) {
      A.modal({
        title: '新建线索', subtitle: '手动录入也会进入统一线索池',
        body: '<div class="form-grid">' +
          '<div><label class="field-label">姓名 *</label><input class="az-input" data-f="name"></div>' +
          '<div><label class="field-label">手机号</label><input class="az-input" data-f="phone"></div>' +
          '<div><label class="field-label">公司</label><input class="az-input" data-f="company"></div>' +
          '<div><label class="field-label">业务类型</label><input class="az-input" data-f="business_type"></div>' +
          '<div><label class="field-label">负责人</label><select class="az-select" data-f="ownerId">' + u.users.map(function (x) { return '<option value="' + x.id + '">' + A.esc(x.name) + '</option>'; }).join('') + '</select></div>' +
          '<div><label class="field-label">状态</label><select class="az-select" data-f="status"><option value="new">新线索</option><option value="following">跟进中</option></select></div>' +
          '<div class="full"><label class="field-label">需求描述</label><textarea class="az-textarea" data-f="requirement"></textarea></div></div>',
        footer: [{ label: '取消', class: 'au-btn--ghost' }, { label: '创建线索', class: 'au-btn--primary', onClick: function (card, close) {
          var body = {};
          A.$$('[data-f]', card).forEach(function (i) { body[i.getAttribute('data-f')] = i.value.trim(); });
          if (!body.name) return A.toast('请填写姓名', 'err');
          body.siteId = A.state.siteId || (A.state.sites[0] && A.state.sites[0].id);
          A.apiPost('/api/leads', body).then(function () { close(); A.toast('线索已创建', 'ok'); A.route(); }).catch(A.handleError);
        } }]
      });
    }).catch(A.handleError);
  }

  function renderLeadDetail(root, id) {
    root.innerHTML = '<div class="page-head"><div><h1>线索详情</h1><p>加载中...</p></div><div class="head-actions"><button class="au-btn au-btn--ghost au-btn--sm" data-back>' + A.icon('back', 14) + ' 返回线索池</button></div></div><div id="ld-body">' + A.skeleton(5) + '</div>';
    root.querySelector('[data-back]').onclick = function () { A.go('leads'); };
    A.api('/api/leads/' + id).then(function (d) {
      var l = d.lead;
      var body = root.querySelector('#ld-body');
      if (!body) return;
      body.innerHTML = '<div class="grid g-2-1">' +
        '<div class="grid" style="gap:16px">' +
        '<div class="az-card pad"><div class="flex items-center gap-2"><span class="avatar-sm purple" style="width:44px;height:44px;font-size:15px">' + A.esc((l.name || '线').slice(0, 1)) + '</span><div style="flex:1"><b style="font-size:17px">' + A.esc(l.name || '匿名线索') + '</b><div class="tiny muted">' + A.esc(l.phone || '') + (l.company ? ' · ' + A.esc(l.company) : '') + '</div></div>' + A.statusPill(l.status) + '<span class="pill ' + (l.score >= 60 ? 'red' : 'orange') + '">' + Math.round(l.score) + ' 分</span></div>' +
        '<div class="divider"></div><div class="grid g2" style="gap:8px 22px">' +
        kv('来源', A.sourceLabel(l.source)) + kv('业务类型', l.businessType || '-') + kv('邮箱', l.email || '-') + kv('负责人', l.ownerName || '未分配') + kv('创建时间', A.fmtTime(l.createdAt)) + kv('最近更新', A.fmtTime(l.updatedAt)) +
        '</div><div class="notice info mt-2">' + A.icon('target', 14) + '<span>' + A.esc(l.requirement || '暂无需求描述') + '</span></div>' +
        '<div class="flex gap-1 mt-2">' +
        '<select class="az-select" data-status style="width:130px">' + [['new', '新线索'], ['following', '跟进中'], ['won', '已成交'], ['invalid', '无效']].map(function (s) { return '<option value="' + s[0] + '"' + (l.status === s[0] ? ' selected' : '') + '>' + s[1] + '</option>'; }).join('') + '</select>' +
        '<select class="az-select" data-owner style="width:140px"><option value="">未分配</option></select>' +
        '<button class="au-btn au-btn--ghost au-btn--sm" data-save>保存变更</button>' +
        (l.conversationId ? '<button class="au-btn au-btn--ghost au-btn--sm" data-conv>查看原会话</button>' : '') +
        (l.visitorId ? '<button class="au-btn au-btn--ghost au-btn--sm" data-visitor>访客档案</button>' : '') +
        '</div></div>' +
        '<div class="az-card"><div class="az-card-head"><h3>跟进记录</h3><span class="tiny muted">' + d.followUps.length + ' 条</span></div><div class="az-card-body">' +
        '<div class="flex gap-1 mb-2"><input class="az-input" data-follow placeholder="记录一次电话、微信或演示跟进..."><button class="au-btn au-btn--primary au-btn--sm" data-follow-add>添加</button></div>' +
        (d.followUps.length ? d.followUps.map(function (f) {
          return '<div class="flex gap-1" style="padding:9px 0;border-bottom:1px dashed rgba(148,163,184,.18)"><span class="avatar-sm gray">' + A.icon('edit', 12) + '</span><div style="flex:1"><div style="font-size:12px">' + A.esc(f.content) + '</div><div class="tiny muted">' + A.esc(f.user_name || '') + ' · ' + A.fmtTime(f.created_at) + '</div></div></div>';
        }).join('') : '<div class="tiny muted" style="padding:12px 0">还没有跟进记录</div>') +
        '</div></div></div>' +
        '<div class="grid" style="gap:16px;align-content:start">' +
        '<div class="az-card pad"><h4 style="margin:0 0 10px;font-size:13px">线索质量</h4>' +
        '<div class="side-kv"><span>意向分</span><b>' + Math.round(l.score) + ' / 100</b></div><div class="side-kv"><span>访客意向</span><b>' + (l.intent_level || '-') + '</b></div><div class="side-kv"><span>地区</span><b>' + A.esc((l.province || '') + ' ' + (l.city || '')) + '</b></div>' +
        '<div class="tag-list mt-1">' + (l.tags || []).map(function (t) { return '<span class="pill blue">' + A.esc(t) + '</span>'; }).join('') + '</div></div>' +
        (d.conversation ? '<div class="az-card pad"><h4 style="margin:0 0 10px;font-size:13px">关联会话</h4><div class="side-kv"><span>主题</span><b>' + A.esc(d.conversation.subject || '-') + '</b></div><div class="side-kv"><span>状态</span><b>' + A.statusPill(d.conversation.status) + '</b></div><div class="side-kv"><span>满意度</span><b>' + (d.conversation.rating ? d.conversation.rating + ' 星' : '-') + '</b></div></div>' : '') +
        '</div></div>';

      function kv(k, val) { return '<div class="side-kv"><span>' + k + '</span><b title="' + A.esc(val) + '">' + A.esc(val) + '</b></div>'; }

      A.api('/api/auth/users-lite').then(function (u) {
        var sel = body.querySelector('[data-owner]');
        sel.innerHTML = '<option value="">未分配</option>' + u.users.map(function (x) { return '<option value="' + x.id + '"' + (l.ownerId === x.id ? ' selected' : '') + '>' + A.esc(x.name) + '</option>'; }).join('');
      });
      body.querySelector('[data-save]').onclick = function () {
        var payload = { status: body.querySelector('[data-status]').value, ownerId: body.querySelector('[data-owner]').value || null };
        A.apiPatch('/api/leads/' + l.id, payload).then(function () { A.toast('线索已更新', 'ok'); A.refresh(); }).catch(A.handleError);
      };
      var conv = body.querySelector('[data-conv]');
      if (conv) conv.onclick = function () { A.go('conversations/' + l.conversationId); };
      var vis = body.querySelector('[data-visitor]');
      if (vis) vis.onclick = function () { A.go('visitors/' + l.visitorId); };
      var add = body.querySelector('[data-follow-add]');
      add.onclick = function () {
        var input = body.querySelector('[data-follow]');
        if (!input.value.trim()) return A.toast('请输入跟进内容', 'err');
        A.apiPost('/api/leads/' + l.id + '/followups', { content: input.value.trim() }).then(function () { A.toast('跟进已记录', 'ok'); A.refresh(); }).catch(A.handleError);
      };
    }).catch(function (e) { var ld = root.querySelector('#ld-body'); if (!ld) return; A.handleError(e); ld.innerHTML = A.empty('加载失败', e.message); });
  }
})();
