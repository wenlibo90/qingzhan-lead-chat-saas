/* Dashboard & reports */
(function () {
  'use strict';
  var A = window.Admin;
  var D = A.data;

  function rangeSwitch(current, attr) {
    return '<div class="flex gap-1">' + [7, 14, 30].map(function (d) {
      return '<button class="au-btn ' + (Number(current) === d ? 'au-btn--primary' : 'au-btn--ghost') + ' au-btn--xs" ' + (attr || 'data-range') + '="' + d + '">' + d + ' 天</button>';
    }).join('') + '</div>';
  }

  A.registerPage('dashboard', {
    title: '数据概览', subtitle: '一眼看清流量、对话与线索',
    roles: ['admin', 'operator', 'agent'],
    feature: 'basic_stats',
    render: function (root) {
      if (!D.dash) D.dash = { range: 14, metric: 'visitors' };
      var st = D.dash;
      root.innerHTML = '<div class="page-head"><div><h1>数据概览</h1><p>所有访客行为均由同一段 JS 自动采集，无需额外埋点。</p></div><div class="head-actions">' + rangeSwitch(st.range) +
        '<button class="au-btn au-btn--ghost au-btn--sm" data-refresh>' + A.icon('refresh', 14) + ' 刷新</button></div></div>' +
        '<div id="dash-body">' + A.skeleton(4) + '</div>';
      root.querySelector('[data-refresh]').addEventListener('click', function () { renderDash(root); });
      A.$$('[data-range]', root).forEach(function (b) {
        b.addEventListener('click', function () {
          st.range = Number(b.getAttribute('data-range'));
          root.querySelectorAll('[data-range]').forEach(function (x) { x.className = 'au-btn au-btn--ghost au-btn--xs'; });
          b.className = 'au-btn au-btn--primary au-btn--xs';
          renderDash(root);
        });
      });
      renderDash(root);
    }
  });

  function renderDash(root) {
    var st = D.dash;
    var body = root.querySelector('#dash-body');
    if (body) body.innerHTML = A.skeleton(4);
    A.api('/api/dashboard/overview?range=' + st.range + A.siteQ()).then(function (d) {
      var m = d.metrics;
      var f = d.features;
      var metrics = [
        { label: '访客数', value: A.fmtNum(m.visitors), sub: '新访客 ' + A.fmtNum(m.newVisitors), icon: 'users', color: '' },
        { label: '页面浏览', value: A.fmtNum(m.pageviews), sub: '访问会话 ' + A.fmtNum(m.sessions), icon: 'eye', color: 'purple' },
        { label: '发起会话', value: A.fmtNum(m.conversations), sub: '咨询转化 ' + A.fmtPct(m.chatRate), icon: 'chat', color: 'green' },
        { label: '新增线索', value: A.fmtNum(m.leads), sub: '留资转化 ' + A.fmtPct(m.leadRate), icon: 'leads', color: 'orange' },
        { label: '平均响应', value: m.avgResponseMs ? (m.avgResponseMs < 60000 ? Math.round(m.avgResponseMs / 1000) + '<small> 秒</small>' : Math.round(m.avgResponseMs / 60000) + '<small> 分</small>') : '-', sub: '实时在线客服 ' + d.online.agents, icon: 'clock', color: '' },
        { label: '满意度', value: m.satisfaction ? m.satisfaction + '<small> / 5</small>' : '-', sub: m.ratingCount + ' 条评价', icon: 'star', color: 'orange' }
      ];
      var metricHtml = '<div class="grid g3 section-gap">' + metrics.map(function (x) {
        return '<div class="metric-card"><div class="m-top"><span class="m-label">' + x.label + '</span><span class="m-ico ' + x.color + '">' + A.icon(x.icon, 15) + '</span></div>' +
          '<div class="m-value">' + x.value + '</div><div class="m-sub">' + x.sub + '</div></div>';
      }).join('') + '</div>';

      var chartSeries = {
        visitors: { name: '访客', color: '#2563eb', values: d.trend.visitors.map(function (x) { return x.value; }) },
        pageviews: { name: '浏览', color: '#8b5cf6', values: d.trend.pageviews.map(function (x) { return x.value; }) },
        conversations: { name: '会话', color: '#10b981', values: d.trend.conversations.map(function (x) { return x.value; }) },
        leads: { name: '线索', color: '#f59e0b', values: d.trend.leads.map(function (x) { return x.value; }) }
      };
      var current = chartSeries[st.metric] || chartSeries.visitors;
      var legend = Object.keys(chartSeries).map(function (k) {
        return '<button class="legend-btn ' + (st.metric === k ? 'active' : '') + '" data-metric="' + k + '"><i style="background:' + chartSeries[k].color + '"></i>' + chartSeries[k].name + '</button>';
      }).join('');
      var trendCard = '<div class="az-card"><div class="az-card-head"><div><h3>趋势分析</h3><div class="sub">' + st.range + ' 天数据走势，点击图例切换指标</div></div><div class="chart-legend">' + legend + '</div></div>' +
        '<div class="az-card-body">' + A.lineChart({ labels: d.trend.dates, series: [current], height: 250, id: 'main' }) + '</div></div>';

      var funnelMini = f.funnel
        ? '<div class="az-card"><div class="az-card-head"><h3>转化漏斗</h3><a class="tiny" href="#/reports" data-go-reports>查看完整报表</a></div><div class="az-card-body" id="dash-funnel"><div class="au-skeleton"></div></div></div>'
        : '<div class="az-card pad"><div class="locked-card"><div class="lock-ov"><span class="lk-ico">' + A.icon('lock', 18) + '</span><h4>转化漏斗</h4><p>访问 → 打开客服 → 发起对话 → 提交线索，专业版解锁。</p><button class="au-btn au-btn--primary au-btn--sm" data-up="funnel">升级查看</button></div></div></div>';

      var sourceCard = f.source
        ? '<div class="az-card"><div class="az-card-head"><h3>来源渠道</h3><a class="tiny" href="#/reports" data-go-reports>来源分析</a></div><div class="az-card-body" id="dash-sources"><div class="au-skeleton"></div></div></div>'
        : '';

      var onlineCard = '<div class="az-card pad"><div class="flex items-center justify-between mb-2"><h3 style="margin:0;font-size:14px">实时状态</h3><span class="pill green"><span class="dot-status green"></span> 在线</span></div>' +
        '<div class="flex gap-2"><div style="flex:1"><div class="muted tiny">站内访客</div><div style="font-size:24px;font-weight:800">' + d.online.visitors + '</div></div>' +
        '<div style="flex:1"><div class="muted tiny">在线客服</div><div style="font-size:24px;font-weight:800">' + d.online.agents + '</div></div>' +
        '<div style="flex:1"><div class="muted tiny">待接待</div><div style="font-size:24px;font-weight:800;color:#f59e0b">' + m.openConv + '</div></div></div>' +
        '<div class="divider"></div><div class="flex items-center justify-between"><span class="tiny muted">广告拦截上报</span><span class="tiny"><b>' + m.adblock + '</b> 次 · ' + A.fmtPct(m.adblockRate) + '</span></div>' +
        (m.adblockRate > 20 ? '<div class="notice warn mt-1">' + A.icon('alert', 14) + '<span>挂件拦截率偏高，建议启用独立域名脚本，或在后台查看被拦截访客路径。</span></div>' : '') + '</div>';

      var usage = d.plan.usage;
      var limits = d.plan.limits;
      function bar(label, used, limit) {
        var pct = limit === -1 ? 12 : Math.min(100, (used / Math.max(1, limit)) * 100);
        return '<div class="usage-row"><span class="u-label">' + label + '</span><span class="u-track"><span class="u-fill" style="width:' + pct + '%"></span></span><span class="u-val">' + used + (limit === -1 ? ' / 不限' : ' / ' + limit) + '</span></div>';
      }
      var planCard = '<div class="az-card pad"><div class="flex items-center justify-between mb-2"><h3 style="margin:0;font-size:14px">套餐用量</h3><span class="pill blue">' + d.plan.name + '</span></div>' +
        bar('客服坐席', usage.agents, limits.agents) + bar('站点数量', usage.sites, limits.sites) + bar('本月访客', usage.monthlyVisitors, limits.visitors_monthly) +
        '<button class="au-btn au-btn--ghost au-btn--sm" style="width:100%;margin-top:8px" onclick="Admin.go(\'billing\')">管理套餐</button></div>';

      var recentRows = d.recent.length ? d.recent.map(function (c) {
        return '<tr data-conv="' + c.id + '" style="cursor:pointer"><td><div class="u-name">' + A.esc(c.visitor_name || '访客') + '</div><div class="u-sub">' + A.esc(c.province || '') + ' · ' + A.esc(c.site_name) + '</div></td>' +
          '<td>' + A.clip(c.subject || '咨询', 22) + '</td><td>' + (c.agent_name ? A.esc(c.agent_name) : '<span class="muted">待分配</span>') + '</td><td>' + A.statusPill(c.status) + '</td><td class="tiny muted">' + A.timeAgo(c.last_message_at) + '</td></tr>';
      }).join('') : '<tr><td colspan="5">' + A.empty('暂无会话', '访客打开挂件后会自动出现在这里') + '</td></tr>';

      var recentCard = '<div class="az-card"><div class="az-card-head"><div><h3>最近会话</h3><div class="sub">优先处理待接入会话</div></div><button class="au-btn au-btn--ghost au-btn--xs" onclick="Admin.go(\'conversations\')">进入接待</button></div><div class="az-card-body flush"><div class="table-wrap"><table class="az-table compact"><thead><tr><th>访客</th><th>主题</th><th>客服</th><th>状态</th><th>时间</th></tr></thead><tbody>' + recentRows + '</tbody></table></div></div></div>';
      body.innerHTML = (A.trialDaysLeft() != null ? '<div class="notice warn mb-2">' + A.icon('clock', 14) + '<span>专业版试用剩余 <b>' + A.trialDaysLeft() + '</b> 天，到期自动降级免费版，数据完整保留。 <a href="#/billing">查看套餐</a></span></div>' : '') + metricHtml +
        '<div class="grid g-2-1 section-gap">' + trendCard + '<div class="grid" style="gap:16px">' + onlineCard + planCard + '</div></div>' +
        '<div class="grid grid-start section-gap" style="gap:16px;grid-template-columns:1fr 1fr 1.2fr">' +
          funnelMini +
          '<div class="grid" style="gap:16px">' + sourceCard + '</div>' +
          recentCard +
        '</div>';

      var funnelBox = body.querySelector('#dash-funnel');
      if (funnelBox) {
        A.api('/api/reports/funnel?range=' + st.range + A.siteQ()).then(function (fd) {
          funnelBox.innerHTML = A.funnel(fd.steps);
        }).catch(function () { funnelBox.innerHTML = '<div class="tiny muted">加载失败</div>'; });
      }
      var sourceBox = body.querySelector('#dash-sources');
      if (sourceBox && A.role() !== 'agent') {
        A.api('/api/reports/sources?range=' + st.range + A.siteQ()).then(function (sd) {
          var top = sd.sources.slice(0, 5);
          sourceBox.innerHTML = A.donut(top.map(function (s) { return { name: s.source, value: s.visitors }; }), { centerLabel: '访客' });
        }).catch(function () { sourceBox.innerHTML = ''; });
      }
      A.$$('[data-metric]', body).forEach(function (btn) {
        btn.addEventListener('click', function () { st.metric = btn.getAttribute('data-metric'); renderDash(root); });
      });
      A.$$('[data-conv]', body).forEach(function (tr) {
        tr.addEventListener('click', function () { A.go('conversations/' + tr.getAttribute('data-conv')); });
      });
      A.$$('[data-up]', body).forEach(function (b) { b.addEventListener('click', function () { A.upgrade(b.getAttribute('data-up')); }); });
      A.$$('[data-go-reports]', body).forEach(function (a) { a.addEventListener('click', function (e) { e.preventDefault(); A.go('reports'); }); });
    }).catch(function (e) {
      A.handleError(e);
      if (body) body.innerHTML = '<div class="az-card pad">' + A.empty('数据加载失败', e.message) + '</div>';
    });
  }

  // ---------------- reports ----------------
  A.registerPage('reports', {
    title: '数据报表', subtitle: '来源、漏斗、绩效与区域热力',
    roles: ['admin', 'operator'],
    feature: 'source_stats',
    render: function (root) {
      if (!D.reports) D.reports = { tab: 'sources', range: 14 };
      var st = D.reports;
      var tabs = [
        { key: 'sources', label: '流量来源', feature: 'source_stats' },
        { key: 'funnel', label: '转化漏斗', feature: 'funnel' },
        { key: 'agents', label: '客服绩效', feature: 'agent_perf' },
        { key: 'geo', label: '区域热力', feature: 'geo_heatmap' },
        { key: 'churn', label: '流失访客', feature: 'churn_report' }
      ];
      root.innerHTML = '<div class="page-head"><div><h1>数据报表</h1><p>以访客为主线，把流量、对话和线索放在同一张表里。</p></div><div class="head-actions">' + rangeSwitch(st.range) + '</div></div>' +
        '<div class="az-card"><div class="az-card-body tight" style="padding-bottom:0"><div class="tabs">' +
        tabs.map(function (t) {
          var locked = !A.can(t.feature);
          return '<button class="' + (st.tab === t.key ? 'active' : '') + (locked ? ' locked' : '') + '" data-rtab="' + t.key + '">' + t.label + (locked ? ' · ' + A.featureNeeded(t.feature) : '') + '</button>';
        }).join('') +
        '</div></div><div class="az-card-body" id="report-body">' + A.skeleton(4) + '</div></div>';
      A.$$('[data-rtab]', root).forEach(function (b) {
        b.addEventListener('click', function () {
          st.tab = b.getAttribute('data-rtab');
          A.$$('[data-rtab]', root).forEach(function (x) { x.classList.remove('active'); });
          b.classList.add('active');
          renderTab(root);
        });
      });
      A.$$('[data-range]', root).forEach(function (b) {
        b.addEventListener('click', function () {
          st.range = Number(b.getAttribute('data-range'));
          A.$$('[data-range]', root).forEach(function (x) { x.className = 'au-btn au-btn--ghost au-btn--xs'; });
          b.className = 'au-btn au-btn--primary au-btn--xs';
          renderTab(root);
        });
      });
      renderTab(root);
    }
  });

  function renderTab(root) {
    var st = D.reports;
    var box = root.querySelector('#report-body');
    var tab = st.tab;
    if (!A.can({ sources: 'source_stats', funnel: 'funnel', agents: 'agent_perf', geo: 'geo_heatmap', churn: 'churn_report' }[tab])) {
      box.innerHTML = '<div class="locked-card"><div class="lock-ov"><span class="lk-ico">' + A.icon('lock', 20) + '</span><h4>' + ({ funnel: '转化漏斗', agents: '客服绩效', geo: '区域热力', churn: '流失访客' })[tab] + ' 需要专业版</h4><p>升级专业版，解锁完整转化闭环分析与线索产出统计。</p><button class="au-btn au-btn--primary" onclick="Admin.upgrade(\'' + ({ sources: 'source_stats', funnel: 'funnel', agents: 'agent_perf', geo: 'geo_heatmap', churn: 'churn_report' }[tab]) + '\')">升级套餐</button></div></div>';
      return;
    }
    box.innerHTML = A.skeleton(3);
    var url = '/api/reports/' + tab + '?range=' + st.range + A.siteQ();
    A.api(url).then(function (d) {
      if (tab === 'sources') return renderSources(box, d);
      if (tab === 'funnel') return renderFunnel(box, d);
      if (tab === 'agents') return renderAgents(box, d);
      if (tab === 'geo') return renderGeo(box, d);
      if (tab === 'churn') return renderChurn(box, d);
    }).catch(function (e) {
      A.handleError(e);
      box.innerHTML = A.empty('报表加载失败', e.message);
    });
  }

  function renderSources(box, d) {
    var rows = d.sources || [];
    var total = rows.reduce(function (s, r) { return s + r.visitors; }, 0);
    var head = '<div class="grid g4 mb-2">' +
      metricMini('来源渠道', rows.length, 'icon-compass') +
      metricMini('访客总量', A.fmtNum(total), 'icon-users') +
      metricMini('最高咨询转化', rows.length ? A.fmtPct(Math.max.apply(null, rows.map(function (r) { return r.chatRate; }))) : '-', 'icon-chat') +
      metricMini('最高留资转化', rows.length ? A.fmtPct(Math.max.apply(null, rows.map(function (r) { return r.leadRate; }))) : '-', 'icon-leads') + '</div>';
    var bars = A.barList(rows.slice(0, 8).map(function (r) { return { name: r.source, value: r.visitors }; }));
    var table = '<div class="table-wrap"><table class="az-table"><thead><tr><th>渠道</th><th>访客</th><th>会话</th><th>咨询转化</th><th>线索</th><th>留资转化</th><th>平均停留</th></tr></thead><tbody>' +
      rows.map(function (r) {
        return '<tr><td><b>' + A.esc(r.source) + '</b></td><td>' + A.fmtNum(r.visitors) + '</td><td>' + A.fmtNum(r.conversations) + '</td><td>' + A.fmtPct(r.chatRate) + '</td><td>' + A.fmtNum(r.leads) + '</td><td><span class="pill ' + (r.leadRate > 5 ? 'green' : 'gray') + '">' + A.fmtPct(r.leadRate) + '</span></td><td>' + r.avgDwellSec + ' 秒</td></tr>';
      }).join('') + '</tbody></table></div>';
    box.innerHTML = head + '<div class="grid g-2-1"><div class="az-card"><div class="az-card-head"><h3>各渠道访客量</h3></div><div class="az-card-body">' + bars + '</div></div>' +
      '<div class="az-card"><div class="az-card-head"><h3>渠道占比</h3></div><div class="az-card-body">' + A.donut(rows.slice(0, 6).map(function (r) { return { name: r.source, value: r.visitors }; }), { centerLabel: '访客' }) + '</div></div></div>' +
      '<div class="az-card mt-2"><div class="az-card-head"><div><h3>渠道明细</h3><div class="sub">咨询转化 = 发起会话访客 / 渠道访客</div></div></div><div class="az-card-body flush">' + table + '</div></div>';
  }

  function renderFunnel(box, d) {
    var s = d.steps;
    box.innerHTML = '<div class="grid g-2-1"><div class="az-card"><div class="az-card-head"><div><h3>转化漏斗</h3><div class="sub">访问 → 打开客服 → 发起对话 → 提交线索</div></div></div><div class="az-card-body">' + A.funnel(s) + '</div></div>' +
      '<div class="az-card"><div class="az-card-head"><h3>关键指标</h3></div><div class="az-card-body">' +
      s.map(function (step, i) {
        return '<div class="side-kv" style="margin-bottom:12px"><span>' + step.label + '</span><b style="font-size:15px">' + A.fmtNum(step.value) + '</b></div>' +
          (i ? '<div class="tiny muted" style="margin:-6px 0 12px">环节转化 ' + A.fmtPct(step.stepRate) + ' · 整体 ' + A.fmtPct(step.rate) + '</div>' : '');
      }).join('') +
      '<div class="notice info mt-2">' + A.icon('activity', 14) + '<span>打开客服数据来自自动埋点事件，无需在按钮上额外加代码。</span></div></div></div></div>';
  }

  function renderAgents(box, d) {
    var rows = d.agents || [];
    var top = rows.slice(0, 8).map(function (r) { return { name: r.name, value: r.conversations }; });
    var table = '<div class="table-wrap"><table class="az-table"><thead><tr><th>客服</th><th>接待会话</th><th>已结束</th><th>发出消息</th><th>线索产出</th><th>平均响应</th><th>满意度</th><th>接待占比</th></tr></thead><tbody>' +
      rows.map(function (r) {
        return '<tr><td><div class="flex items-center gap-1"><span class="avatar-sm">' + A.esc(r.name.slice(0, 1)) + '</span><div><div class="u-name">' + A.esc(r.name) + '</div><div class="u-sub">' + ({ admin: '管理员', operator: '运营', agent: '客服' })[r.role] + '</div></div></div></td>' +
          '<td><b>' + r.conversations + '</b></td><td>' + r.closed + '</td><td>' + A.fmtNum(r.messages) + '</td><td>' + r.leads + '</td>' +
          '<td>' + A.fmtMs(r.avgResponseMs) + '</td><td>' + (r.avgRating ? '<span class="pill ' + (r.avgRating >= 4 ? 'green' : 'orange') + '">' + r.avgRating + ' / 5</span>' : '<span class="muted">-</span>') + '</td>' +
          '<td><div class="bar-track" style="width:80px;display:inline-block;vertical-align:middle"><div class="bar-fill" style="width:' + r.share + '%"></div></div> <span class="tiny muted">' + r.share + '%</span></td></tr>';
      }).join('') + '</tbody></table></div>';
    box.innerHTML = '<div class="grid g-2-1"><div class="az-card"><div class="az-card-head"><h3>接待量排行</h3></div><div class="az-card-body">' + (top.length ? A.barList(top) : A.empty('暂无数据')) + '</div></div>' +
      '<div class="az-card"><div class="az-card-head"><h3>绩效说明</h3></div><div class="az-card-body"><div class="notice info">' + A.icon('activity', 14) + '<span>平均响应按会话首条客服回复计算；满意度为已评价会话的平均星级。</span></div>' +
      '<div class="side-kv mt-2"><span>参与统计客服</span><b>' + rows.length + '</b></div><div class="side-kv"><span>总会话</span><b>' + rows.reduce(function (a, b) { return a + b.conversations; }, 0) + '</b></div></div></div></div>' +
      '<div class="az-card mt-2"><div class="az-card-head"><h3>客服明细</h3></div><div class="az-card-body flush">' + table + '</div></div>';
  }

  function renderGeo(box, d) {
    var rows = d.provinces || [];
    box.innerHTML = '<div class="grid g-2-1"><div class="az-card"><div class="az-card-head"><div><h3>全国区域热力</h3><div class="sub">气泡大小与颜色代表访客密度，悬停查看咨询与留资</div></div></div><div class="az-card-body">' + A.heatmap(rows) + '</div></div>' +
      '<div class="az-card"><div class="az-card-head"><h3>区域排行</h3></div><div class="az-card-body">' + (rows.length ? A.barList(rows.slice(0, 8).map(function (r) { return { name: r.province, value: r.visitors, color: 'linear-gradient(90deg,#2563eb,#f97316)' }; })) : A.empty('暂无区域数据')) + '</div></div></div>' +
      '<div class="az-card mt-2"><div class="az-card-head"><h3>区域明细</h3><div class="sub">访客 ' + d.total + ' 人</div></div><div class="az-card-body flush"><div class="table-wrap"><table class="az-table"><thead><tr><th>省份</th><th>访客</th><th>咨询访客</th><th>留资访客</th><th>留资转化</th><th>热度</th></tr></thead><tbody>' +
      rows.map(function (r) {
        return '<tr><td><b>' + A.esc(r.province) + '</b></td><td>' + r.visitors + '</td><td>' + r.chatters + '</td><td>' + r.leaders + '</td><td>' + A.fmtPct(r.leadRate) + '</td><td><div class="bar-track" style="width:90px;display:inline-block;vertical-align:middle"><div class="bar-fill" style="width:' + r.intensity * 100 + '%"></div></div></td></tr>';
      }).join('') + '</tbody></table></div></div></div>';
  }

  function renderChurn(box, d) {
    var rows = d.visitors || [];
    box.innerHTML = '<div class="notice warn mb-2">' + A.icon('alert', 14) + '<span>过去 14 天访问过网站但没有发起咨询的访客，优先跟进高意向人群。共 <b>' + d.total + '</b> 人，当前展示意向最高的 ' + Math.min(50, rows.length) + ' 位。</span></div>' +
      '<div class="az-card"><div class="az-card-body flush"><div class="table-wrap"><table class="az-table"><thead><tr><th>访客</th><th>地区</th><th>来源</th><th>访问页数</th><th>停留</th><th>意向</th><th>最后页面</th><th>最近访问</th><th></th></tr></thead><tbody>' +
      (rows.length ? rows.slice(0, 50).map(function (v) {
        return '<tr><td><div class="u-name">' + A.esc(v.name) + '</div><div class="u-sub">' + A.esc(v.vid) + (v.phone ? ' · ' + A.esc(v.phone) : '') + '</div></td>' +
          '<td>' + A.esc(v.province || '-') + ' ' + A.esc(v.city || '') + '</td><td>' + A.esc(v.source || '-') + '</td><td>' + v.pageviewCount + '</td><td>' + v.dwellSec + ' 秒</td>' +
          '<td>' + A.intentPill(v.intentLevel, v.intentScore) + '</td><td class="tiny muted">' + A.esc(A.clip(v.lastPage || v.landingPage || '-', 22)) + '</td><td class="tiny muted">' + A.timeAgo(v.lastSeen) + '</td>' +
          '<td><button class="au-btn au-btn--ghost au-btn--xs" data-visitor="' + v.id + '">查看档案</button></td></tr>';
      }).join('') : '<tr><td colspan="9">' + A.empty('没有流失访客', '所有访客都发起了咨询，表现不错') + '</td></tr>') + '</tbody></table></div></div></div>';
    A.$$('[data-visitor]', box).forEach(function (b) {
      b.addEventListener('click', function () { A.go('visitors/' + b.getAttribute('data-visitor')); });
    });
  }

  function metricMini(label, value, ico) {
    return '<div class="metric-card"><div class="m-top"><span class="m-label">' + label + '</span><span class="m-ico">' + A.icon(ico.replace('icon-', ''), 14) + '</span></div><div class="m-value" style="font-size:22px">' + value + '</div></div>';
  }
})();
