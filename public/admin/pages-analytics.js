/* Website analytics */
(function () {
  'use strict';
  var A = window.Admin;
  var D = A.data;

  function rangeSwitch(current, attr) {
    return '<div class="flex gap-1">' + [7, 14, 30, 90].map(function (d) {
      return '<button class="au-btn ' + (Number(current) === d ? 'au-btn--primary' : 'au-btn--ghost') + ' au-btn--xs" ' + (attr || 'data-arange') + '="' + d + '">' + d + ' 天</button>';
    }).join('') + '</div>';
  }

  function pct(v) { return A.fmtPct(v); }

  function delta(value, invert) {
    var n = Number(value) || 0;
    var good = invert ? n <= 0 : n >= 0;
    var cls = n === 0 ? 'gray' : good ? 'green' : 'red';
    var sign = n > 0 ? '+' : '';
    return '<span class="pill ' + cls + '">' + sign + n.toFixed(1) + '%</span>';
  }

  function metricCard(label, value, sub, change, icon, color, invert) {
    return '<div class="metric-card"><div class="m-top"><span class="m-label">' + label + '</span><span class="m-ico ' + (color || '') + '">' + A.icon(icon, 15) + '</span></div>' +
      '<div class="m-value">' + value + '</div><div class="m-sub">' + (change != null ? delta(change, invert) + ' ' : '') + sub + '</div></div>';
  }

  function table(headers, rows, emptyText) {
    if (!rows.length) return A.empty(emptyText || '暂无数据', '数据会在访客访问后自动汇总');
    return '<div class="table-wrap"><table class="az-table"><thead><tr>' + headers.map(function (h) { return '<th>' + h + '</th>'; }).join('') + '</tr></thead><tbody>' +
      rows.map(function (r) {
        return '<tr>' + r.map(function (c) { return '<td>' + c + '</td>'; }).join('') + '</tr>';
      }).join('') + '</tbody></table></div>';
  }

  function section(title, sub, body, action) {
    return '<div class="az-card"><div class="az-card-head"><div><h3>' + title + '</h3>' + (sub ? '<div class="sub">' + sub + '</div>' : '') + '</div>' + (action || '') + '</div><div class="az-card-body">' + body + '</div></div>';
  }

  function exportButton(report) {
    return '<button class="au-btn au-btn--ghost au-btn--sm" data-export="' + report + '">' + A.icon('download', 14) + ' 导出 CSV</button>';
  }

  A.registerPage('analytics', {
    title: '网站分析', subtitle: '流量、来源、内容、受众与事件全链路',
    roles: ['admin', 'operator'],
    feature: 'source_stats',
    render: function (root) {
      if (!D.analytics) D.analytics = { tab: 'overview', range: 14, metric: 'visitors', segment: 'sources' };
      if (D.analyticsTimer) { clearInterval(D.analyticsTimer); D.analyticsTimer = null; }
      var st = D.analytics;
      var tabs = [
        { key: 'overview', label: '流量概览' },
        { key: 'realtime', label: '实时数据' },
        { key: 'acquisition', label: '来源分析' },
        { key: 'pages', label: '内容分析' },
        { key: 'audience', label: '受众分析' },
        { key: 'events', label: '事件与性能' }
      ];
      root.innerHTML = '<div class="page-head"><div><h1>网站分析</h1><p>像专业统计平台一样查看访问、来源、内容、受众和转化。</p></div><div class="head-actions">' + rangeSwitch(st.range) +
        '<button class="au-btn au-btn--ghost au-btn--sm" data-arefresh>' + A.icon('refresh', 14) + ' 刷新</button></div></div>' +
        '<div class="az-card"><div class="az-card-body tight" style="padding-bottom:0"><div class="tabs">' +
        tabs.map(function (t) { return '<button class="' + (st.tab === t.key ? 'active' : '') + '" data-atab="' + t.key + '">' + t.label + '</button>'; }).join('') +
        '</div></div><div class="az-card-body" id="analytics-body">' + A.skeleton(4) + '</div></div>';
      A.$$('[data-atab]', root).forEach(function (b) {
        b.addEventListener('click', function () {
          st.tab = b.getAttribute('data-atab');
          A.$$('[data-atab]', root).forEach(function (x) { x.classList.remove('active'); });
          b.classList.add('active');
          renderTab(root);
        });
      });
      A.$$('[data-arange]', root).forEach(function (b) {
        b.addEventListener('click', function () {
          st.range = Number(b.getAttribute('data-arange'));
          A.$$('[data-arange]', root).forEach(function (x) { x.className = 'au-btn au-btn--ghost au-btn--xs'; });
          b.className = 'au-btn au-btn--primary au-btn--xs';
          renderTab(root);
        });
      });
      root.querySelector('[data-arefresh]').onclick = function () { renderTab(root); };
      renderTab(root);
    }
  });

  function stopTimer() {
    if (D.analyticsTimer) { clearInterval(D.analyticsTimer); D.analyticsTimer = null; }
  }

  function renderTab(root) {
    stopTimer();
    var st = D.analytics;
    var box = root.querySelector('#analytics-body');
    if (!box) return;
    box.innerHTML = A.skeleton(4);
    var q = '?range=' + st.range + A.siteQ();
    if (st.tab === 'overview') loadOverview(box, q);
    else if (st.tab === 'realtime') loadRealtime(box);
    else if (st.tab === 'acquisition') loadAcquisition(box, q);
    else if (st.tab === 'pages') loadPages(box, q);
    else if (st.tab === 'audience') loadAudience(box, q);
    else if (st.tab === 'events') loadEvents(box, q);
  }

  function bindExport(box, report) {
    A.$$('[data-export]', box).forEach(function (btn) {
      btn.addEventListener('click', function () {
        var type = btn.getAttribute('data-export') || report;
        var st = D.analytics;
        var url = '/api/analytics/export?report=' + encodeURIComponent(type) + '&range=' + st.range + A.siteQ();
        btn.disabled = true;
        fetch(url, { headers: A.state.token ? { Authorization: 'Bearer ' + A.state.token } : {} })
          .then(function (res) {
            if (res.status === 401) { A.logout(true); throw new Error('登录已失效'); }
            if (!res.ok) throw new Error('导出失败');
            var name = 'analytics-' + type + '-' + st.range + 'd.csv';
            var match = /filename="?([^"]+)"?/i.exec(res.headers.get('Content-Disposition') || '');
            if (match) name = match[1];
            return res.blob().then(function (blob) { return { blob: blob, name: name }; });
          })
          .then(function (file) {
            var link = document.createElement('a');
            link.href = URL.createObjectURL(file.blob);
            link.download = file.name;
            document.body.appendChild(link);
            link.click();
            link.remove();
            setTimeout(function () { URL.revokeObjectURL(link.href); }, 2000);
            A.toast('CSV 已开始下载');
          })
          .catch(function (e) { A.handleError(e); })
          .then(function () { btn.disabled = false; });
      });
    });
  }

  function loadOverview(box, q) {
    A.api('/api/analytics/overview' + q).then(function (d) {
      var m = d.metrics;
      var c = d.changes || {};
      var cards = '<div class="grid g3 section-gap">' +
        metricCard('访客数', A.fmtNum(m.visitors), '新访客 ' + A.fmtNum(m.newVisitors) + ' · 回访 ' + A.fmtNum(m.returningVisitors), c.visitors, 'users', '') +
        metricCard('浏览量', A.fmtNum(m.pageviews), '人均 ' + Number(m.pagesPerVisit).toFixed(2) + ' 页', c.pageviews, 'eye', 'purple') +
        metricCard('访问次数', A.fmtNum(m.sessions), '跳出率 ' + pct(m.bounceRate), c.sessions, 'activity', 'green') +
        metricCard('平均停留', m.avgDwellSec + '<small> 秒</small>', '每次访问 ' + A.fmtMs((m.avgDwellSec || 0) * 1000), c.avgDwellSec, 'clock', '') +
        metricCard('咨询转化', pct(m.chatRate), A.fmtNum(m.conversations) + ' 个会话', c.chatRate, 'chat', 'green') +
        metricCard('留资转化', pct(m.leadRate), A.fmtNum(m.leads) + ' 条线索', c.leadRate, 'leads', 'orange') +
        '</div>';

      var st = D.analytics;
      var seriesMap = {
        visitors: { name: '访客', color: '#2563eb', values: d.trend.visitors.map(function (x) { return x.value; }) },
        pageviews: { name: '浏览', color: '#8b5cf6', values: d.trend.pageviews.map(function (x) { return x.value; }) },
        sessions: { name: '访问', color: '#10b981', values: d.trend.sessions.map(function (x) { return x.value; }) },
        conversations: { name: '会话', color: '#f59e0b', values: d.trend.conversations.map(function (x) { return x.value; }) },
        leads: { name: '线索', color: '#ec4899', values: d.trend.leads.map(function (x) { return x.value; }) }
      };
      var current = seriesMap[st.metric] || seriesMap.visitors;
      var legend = Object.keys(seriesMap).map(function (k) {
        return '<button class="legend-btn ' + (st.metric === k ? 'active' : '') + '" data-ametric="' + k + '"><i style="background:' + seriesMap[k].color + '"></i>' + seriesMap[k].name + '</button>';
      }).join('');
      var trendCard = '<div class="az-card"><div class="az-card-head"><div><h3>趋势分析</h3><div class="sub">' + d.range + ' 天走势，点击图例切换指标</div></div><div class="chart-legend">' + legend + '</div></div>' +
        '<div class="az-card-body">' + A.lineChart({ labels: d.trend.dates, series: [current], height: 260, id: 'analytics' }) + '</div></div>';

      var realtimeCard = '<div class="az-card pad"><div class="flex items-center justify-between mb-2"><h3 style="margin:0;font-size:14px">实时动态</h3><span class="pill green"><span class="dot-status green"></span> 最近 5 分钟</span></div>' +
        '<div class="flex gap-2"><div style="flex:1"><div class="muted tiny">在线访客</div><div style="font-size:24px;font-weight:800">' + A.fmtNum(d.realtime.online) + '</div></div>' +
        '<div style="flex:1"><div class="muted tiny">活跃访客</div><div style="font-size:24px;font-weight:800">' + A.fmtNum(d.realtime.visitors) + '</div></div>' +
        '<div style="flex:1"><div class="muted tiny">浏览量</div><div style="font-size:24px;font-weight:800">' + A.fmtNum(d.realtime.pageviews) + '</div></div></div>' +
        '<div class="divider"></div><div class="tiny muted">正在访问</div>' + (d.realtime.pages.length ? A.barList(d.realtime.pages.slice(0, 5).map(function (p) { return { name: p.path, value: p.pageviews }; })) : '<div class="tiny muted mt-1">暂无实时访问</div>') + '</div>';

      var sourceCard = section('来源渠道', '按访客数排序', d.topSources.length
        ? A.donut(d.topSources.map(function (s) { return { name: A.sourceLabel(s.name), value: s.visitors }; }), { centerLabel: '访客' })
        : A.empty('暂无来源数据', '接入挂件后自动识别来源'), exportButton('acquisition'));

      var pageRows = d.topPages.map(function (p) {
        return [A.esc(p.path), A.fmtNum(p.pageviews), A.fmtNum(p.visitors), p.avgDwellSec + ' 秒', pct(p.bounceRate), p.avgScrollDepth + '%'];
      });
      var pagesCard = section('热门页面', '按浏览量排序', table(['页面', '浏览量', '访客', '平均停留', '跳出率', '滚动深度'], pageRows, '暂无页面数据'), exportButton('pages'));

      box.innerHTML = cards +
        '<div class="grid g-2-1 section-gap">' + trendCard + '<div class="grid" style="gap:16px">' + realtimeCard + sourceCard + '</div></div>' +
        '<div class="section-gap">' + pagesCard + '</div>' +
        '<div class="tiny muted" style="margin-top:10px">数据由客服挂件自动采集，统计口径与主流网站分析工具一致。</div>';

      A.$$('[data-ametric]', box).forEach(function (btn) {
        btn.addEventListener('click', function () { D.analytics.metric = btn.getAttribute('data-ametric'); renderTab(document.querySelector('#page')); });
      });
      bindExport(box, 'overview');
    }).catch(function (e) { A.handleError(e); box.innerHTML = emptyCard('分析数据加载失败', e.message); });
  }

  function loadRealtime(box) {
    stopTimer();
    A.api('/api/analytics/realtime' + A.siteQ()).then(function (d) {
      var pages = d.pages.map(function (p) { return '<div class="bar-row"><span class="bar-label" title="' + A.esc(p.path) + '">' + A.esc(p.path) + '</span><span class="bar-track"><span class="bar-fill" style="width:' + Math.max(4, Math.min(100, (p.pageviews / Math.max(1, d.pages[0].pageviews)) * 100)) + '%"></span></span><span class="bar-val">' + A.fmtNum(p.pageviews) + '</span></div>'; }).join('');
      var sources = d.sources.length ? A.donut(d.sources.map(function (s) { return { name: A.sourceLabel(s.source), value: s.visitors }; }), { centerLabel: '访客' }) : A.empty('暂无实时来源', '最近 5 分钟没有访问');
      box.innerHTML = '<div class="grid g4 section-gap">' +
        metricCard('当前在线', A.fmtNum(d.online), '打开客服挂件的访客', null, 'users', '') +
        metricCard('活跃访客', A.fmtNum(d.visitors), '最近 5 分钟', null, 'eye', 'purple') +
        metricCard('浏览量', A.fmtNum(d.pageviews), '最近 5 分钟', null, 'activity', 'green') +
        metricCard('访问次数', A.fmtNum(d.sessions), d.lastSeen ? '最近 ' + A.timeAgo(d.lastSeen) : '暂无数据', null, 'clock', '') +
        '</div>' +
        '<div class="grid g2 section-gap">' + section('正在访问的页面', '最近 5 分钟', pages || A.empty('暂无实时页面', '访客进入网站后会显示在这里')) +
        section('实时来源', '最近 5 分钟', sources) + '</div>' +
        '<div class="tiny muted">实时数据每 10 秒自动刷新。</div>';
      if (D.analytics.tab !== 'realtime' || !document.body.contains(box)) return;
      D.analyticsTimer = setInterval(function () {
        var target = document.querySelector('#analytics-body');
        if (!target || D.analytics.tab !== 'realtime') { stopTimer(); return; }
        loadRealtime(target);
      }, 10000);
    }).catch(function (e) { A.handleError(e); box.innerHTML = emptyCard('实时数据加载失败', e.message); });
  }

  function loadAcquisition(box, q) {
    A.api('/api/analytics/acquisition' + q).then(function (d) {
      var st = D.analytics;
      var segments = [
        { key: 'sources', label: '来源渠道', rows: d.sources },
        { key: 'mediums', label: '媒介', rows: d.mediums },
        { key: 'campaigns', label: '活动', rows: d.campaigns },
        { key: 'referrers', label: '引荐页面', rows: d.referrers }
      ];
      var seg = segments.filter(function (s) { return s.key === st.segment; })[0] || segments[0];
      var rows = seg.rows.map(function (r) {
        var name = seg.key === 'sources' ? A.sourceLabel(r.name) : r.name;
        return [A.esc(A.clip(name, 42)), A.fmtNum(r.visitors), A.fmtNum(r.conversations), pct(r.chatRate), A.fmtNum(r.leads), '<span class="pill ' + (r.leadRate > 0 ? 'green' : 'gray') + '">' + pct(r.leadRate) + '</span>', r.avgDwellSec + ' 秒'];
      });
      var segTabs = '<div class="tabs" style="margin-bottom:2px">' + segments.map(function (s) {
        return '<button class="' + (st.segment === s.key ? 'active' : '') + '" data-aseg="' + s.key + '">' + s.label + '</button>';
      }).join('') + '</div>';
      var totalVisitors = d.sources.reduce(function (s, r) { return s + r.visitors; }, 0);
      var top = d.sources[0];
      var cards = '<div class="grid g4 section-gap">' +
        metricCard('来源渠道', d.sources.length, '识别到 ' + d.sources.length + ' 个渠道', null, 'compass', '') +
        metricCard('访客总量', A.fmtNum(totalVisitors), '统计周期 ' + d.range + ' 天', null, 'users', 'purple') +
        metricCard('最高咨询转化', top ? pct(top.chatRate) : '-', top ? A.sourceLabel(top.name) : '暂无数据', null, 'chat', 'green') +
        metricCard('最高留资转化', top ? pct(top.leadRate) : '-', top ? A.sourceLabel(top.name) : '暂无数据', null, 'leads', 'orange') +
        '</div>';
      box.innerHTML = cards +
        '<div class="grid g-2-1 section-gap">' +
        '<div class="az-card"><div class="az-card-head"><div><h3>来源明细</h3><div class="sub">查看每个渠道的咨询与留资表现</div></div>' + exportButton('acquisition') + '</div><div class="az-card-body tight">' + segTabs +
        '<div style="padding:14px 16px 4px">' + table(['来源', '访客', '会话', '咨询转化', '线索', '留资转化', '平均停留'], rows, '暂无来源数据') + '</div></div></div>' +
        section('渠道分布', '按访客数', d.sources.length ? A.donut(d.sources.slice(0, 8).map(function (s) { return { name: A.sourceLabel(s.name), value: s.visitors }; }), { centerLabel: '访客' }) : A.empty('暂无来源数据', '接入挂件后自动识别来源')) +
        '</div>';
      A.$$('[data-aseg]', box).forEach(function (b) {
        b.addEventListener('click', function () { D.analytics.segment = b.getAttribute('data-aseg'); renderTab(document.querySelector('#page')); });
      });
      bindExport(box, 'acquisition');
    }).catch(function (e) { A.handleError(e); box.innerHTML = emptyCard('来源分析加载失败', e.message); });
  }

  function loadPages(box, q) {
    A.api('/api/analytics/pages' + q).then(function (d) {
      var rows = d.pages.map(function (p) {
        return [A.esc(A.clip(p.path, 48)), A.fmtNum(p.pageviews), A.fmtNum(p.visitors), p.avgDwellSec + ' 秒', pct(p.bounceRate), A.fmtNum(p.entries), A.fmtNum(p.exits), p.avgScrollDepth + '%'];
      });
      var top = d.pages.slice(0, 8).map(function (p) { return { name: p.path, value: p.pageviews }; });
      var landing = d.landing.slice(0, 8).map(function (p) { return { name: p.path, value: p.entries }; });
      var exit = d.exit.slice(0, 8).map(function (p) { return { name: p.path, value: p.exits }; });
      box.innerHTML = '<div class="grid g4 section-gap">' +
        metricCard('收录页面', A.fmtNum(d.pages.length), '有浏览记录的去重页面', null, 'file', '') +
        metricCard('总浏览量', A.fmtNum(d.pages.reduce(function (s, p) { return s + p.pageviews; }, 0)), '统计周期 ' + d.range + ' 天', null, 'eye', 'purple') +
        metricCard('入口页面', A.fmtNum(d.landing.length), '访客首先进入的页面', null, 'compass', 'green') +
        metricCard('退出页面', A.fmtNum(d.exit.length), '访客最后停留的页面', null, 'logout', 'orange') +
        '</div>' +
        '<div class="grid g2 section-gap">' + section('热门页面', '按浏览量排序', top.length ? A.barList(top) : A.empty('暂无页面数据', '访客浏览后自动汇总')) +
        section('入口页面', '按进入次数排序', landing.length ? A.barList(landing) : A.empty('暂无入口数据', '访客进入网站后自动汇总')) + '</div>' +
        '<div class="section-gap">' + section('页面明细', '停留、跳出和滚动深度', table(['页面', '浏览量', '访客', '平均停留', '跳出率', '入口', '退出', '滚动深度'], rows, '暂无页面数据'), exportButton('pages')) + '</div>' +
        '<div class="section-gap">' + section('退出页面', '按退出次数排序', exit.length ? A.barList(exit) : A.empty('暂无退出数据', '访客离开后自动汇总')) + '</div>';
      bindExport(box, 'pages');
    }).catch(function (e) { A.handleError(e); box.innerHTML = emptyCard('内容分析加载失败', e.message); });
  }

  function loadAudience(box, q) {
    A.api('/api/analytics/audience' + q).then(function (d) {
      var defs = [
        { key: 'device', label: '设备类型', icon: 'phone' },
        { key: 'browser', label: '浏览器', icon: 'globe' },
        { key: 'os', label: '操作系统', icon: 'server' },
        { key: 'country', label: '国家/地区', icon: 'globe' },
        { key: 'province', label: '省份', icon: 'compass' },
        { key: 'language', label: '语言', icon: 'chat' }
      ];
      var cards = defs.map(function (def) {
        var rows = d[def.key] || [];
        var data = rows.slice(0, 6).map(function (r) { return { name: r.name, value: r.value }; });
        return '<div class="az-card"><div class="az-card-head"><h3>' + def.label + '</h3><span class="tiny muted">' + rows.length + ' 项</span></div><div class="az-card-body">' +
          (data.length ? A.donut(data, { centerLabel: '访客' }) : A.empty('暂无数据', '访客访问后生成')) + '</div></div>';
      }).join('');
      box.innerHTML = '<div class="grid g4 section-gap">' +
        metricCard('受众总量', A.fmtNum(d.total), '统计周期 ' + d.range + ' 天', null, 'users', '') +
        metricCard('设备类型', (d.device[0] || {}).name || '-', (d.device[0] || {}).value ? A.fmtNum(d.device[0].value) + ' 位访客' : '暂无数据', null, 'phone', 'purple') +
        metricCard('主要浏览器', (d.browser[0] || {}).name || '-', (d.browser[0] || {}).value ? A.fmtNum(d.browser[0].value) + ' 位访客' : '暂无数据', null, 'globe', 'green') +
        metricCard('主要地区', (d.province[0] || {}).name || '-', (d.province[0] || {}).value ? A.fmtNum(d.province[0].value) + ' 位访客' : '暂无数据', null, 'compass', 'orange') +
        '</div><div class="grid g3 section-gap">' + cards + '</div>' +
        '<div class="section-gap">' + section('完整受众明细', '按维度查看访客分布', table(['维度', '取值', '访客数', '占比'], ['device', 'browser', 'os', 'country', 'province', 'city', 'language', 'screen'].reduce(function (acc, key) {
          (d[key] || []).forEach(function (r) { acc.push([({ device: '设备', browser: '浏览器', os: '系统', country: '国家', province: '省份', city: '城市', language: '语言', screen: '分辨率' })[key], A.esc(r.name), A.fmtNum(r.value), pct(r.value / Math.max(1, d.total) * 100)]); });
          return acc;
        }, []), '暂无受众数据'), exportButton('audience')) + '</div>';
      bindExport(box, 'audience');
    }).catch(function (e) { A.handleError(e); box.innerHTML = emptyCard('受众分析加载失败', e.message); });
  }

  function loadEvents(box, q) {
    A.api('/api/analytics/events' + q).then(function (d) {
      var eventRows = d.events.filter(function (e) { return e.type !== 'performance'; });
      var rows = eventRows.map(function (e) {
        return [A.esc(A.clip(e.name, 36)), '<span class="pill gray">' + A.esc(e.type) + '</span>', A.fmtNum(e.count), A.fmtNum(e.visitors), e.lastAt ? A.timeAgo(e.lastAt) : '-'];
      });
      var colors = ['#2563eb', '#8b5cf6', '#10b981', '#f59e0b', '#ec4899'];
      var series = d.trends.map(function (t, i) { return { name: t.name, color: colors[i % colors.length], values: t.values.map(function (x) { return x.value; }) }; });
      var trendCard = series.length
        ? '<div class="az-card"><div class="az-card-head"><div><h3>事件趋势</h3><div class="sub">Top 5 事件每日发生次数</div></div></div><div class="az-card-body">' + A.lineChart({ labels: d.dates, series: series, height: 240, id: 'events' }) + '</div></div>'
        : '<div class="az-card pad">' + A.empty('暂无事件数据', '挂件会自动采集点击、滚动和自定义事件') + '</div>';
      var vitalCards = d.vitals.length ? d.vitals.map(function (v) {
        var cls = v.goodRate >= 75 ? 'green' : v.goodRate >= 50 ? 'orange' : 'red';
        return '<div class="metric-card"><div class="m-top"><span class="m-label">' + v.metric + '</span><span class="pill ' + cls + '">' + pct(v.goodRate) + ' 良好</span></div>' +
          '<div class="m-value">' + v.p75 + '<small> ' + (v.unit || '') + '</small></div><div class="m-sub">P75 · 均值 ' + v.avg + ' · ' + A.fmtNum(v.samples) + ' 个样本</div></div>';
      }).join('') : '<div class="az-card pad">' + A.empty('暂无性能数据', '访客浏览器会在大约 30 秒后回传 Web Vitals') + '</div>';
      box.innerHTML = '<div class="section-gap">' + section('核心性能指标', 'LCP、CLS、INP、TTFB、FCP 的 P75 表现', '<div class="grid g4">' + vitalCards + '</div>') + '</div>' +
        '<div class="grid g-2-1 section-gap">' + trendCard + section('事件分布', '自动事件与自定义事件', eventRows.length ? A.barList(eventRows.slice(0, 10).map(function (e) { return { name: e.name, value: e.count }; })) : A.empty('暂无事件', '在网站中调用 qz.track() 上报自定义事件')) + '</div>' +
        '<div class="section-gap">' + section('事件明细', '按发生次数排序', table(['事件', '类型', '次数', '访客', '最近发生'], rows, '暂无事件数据'), exportButton('events')) + '</div>';
      bindExport(box, 'events');
    }).catch(function (e) { A.handleError(e); box.innerHTML = emptyCard('事件分析加载失败', e.message); });
  }

  function emptyCard(title, desc) {
    return '<div class="az-card pad">' + A.empty(title || '暂无数据', desc || '') + '</div>';
  }
})();
