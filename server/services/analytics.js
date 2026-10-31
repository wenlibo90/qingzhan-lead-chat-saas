'use strict';

const { all, get } = require('../db');
const { siteScope } = require('../helpers');
const presence = require('./presence');

const MAX_RANGE = 365;
const cache = new Map();

function rangeOf(req, fallback = 14) {
  const raw = req && req.query ? (req.query.range != null ? req.query.range : req.query.days) : null;
  return Math.min(MAX_RANGE, Math.max(1, Math.round(Number(raw) || fallback)));
}

function scopeOf(req) {
  const { site } = siteScope(req);
  return { site, siteId: site ? site.id : null };
}

function win(column, days, offset = 0) {
  const start = `datetime('now', '-${days + offset} days')`;
  const end = offset ? `datetime('now', '-${offset} days')` : "datetime('now')";
  return `${column} >= ${start} AND ${column} < ${end}`;
}

function dayKeys(days) {
  const keys = [];
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(start.getTime() - i * 86400000);
    keys.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`);
  }
  return keys;
}

function series(rows, days, key = 'c') {
  const map = new Map(rows.map((r) => [r.d, r[key]]));
  return dayKeys(days).map((d) => ({ date: d, value: Number(map.get(d)) || 0 }));
}

function pct(part, total) {
  return total ? Number(((part / total) * 100).toFixed(1)) : 0;
}

function normalizePath(url) {
  const raw = String(url || '').trim();
  if (!raw) return '/';
  try {
    const parsed = new URL(raw, 'http://site.local');
    return (parsed.pathname || '/').slice(0, 300);
  } catch {
    return raw.split('?')[0].split('#')[0].slice(0, 300) || '/';
  }
}

function cached(key, ttl, fn) {
  const hit = cache.get(key);
  if (hit && hit.expires > Date.now()) return hit.value;
  const value = fn();
  cache.set(key, { value, expires: Date.now() + ttl });
  if (cache.size > 400) {
    const now = Date.now();
    for (const [k, v] of cache) if (v.expires <= now) cache.delete(k);
  }
  return value;
}

function traffic(req, days, offset = 0) {
  const { siteId } = scopeOf(req);
  const tenantId = req.tenant.id;
  const siteSql = siteId ? ' AND site_id = ?' : '';
  const base = siteId ? [siteId] : [];
  const params = (extra = []) => [tenantId, ...extra, ...base];

  const visitors = get(`SELECT COUNT(*) c FROM visitors WHERE tenant_id = ? AND merged_into IS NULL AND blocked = 0 AND ${win('last_seen', days, offset)}${siteSql}`, params()).c;
  const newVisitors = get(`SELECT COUNT(*) c FROM visitors WHERE tenant_id = ? AND merged_into IS NULL AND blocked = 0 AND ${win('first_seen', days, offset)}${siteSql}`, params()).c;
  const pageviews = get(`SELECT COUNT(*) c, COALESCE(SUM(dwell_ms), 0) dwell FROM pageviews WHERE tenant_id = ? AND ${win('entered_at', days, offset)}${siteSql}`, params());
  const sessions = get(`SELECT COUNT(*) c, SUM(CASE WHEN page_count <= 1 THEN 1 ELSE 0 END) bounce, COALESCE(SUM(duration_ms), 0) duration FROM visitor_sessions WHERE tenant_id = ? AND ${win('started_at', days, offset)}${siteSql}`, params());
  const conversations = get(`SELECT COUNT(*) c FROM conversations WHERE tenant_id = ? AND ${win('created_at', days, offset)}${siteSql}`, params()).c;
  const leads = get(`SELECT COUNT(*) c FROM leads WHERE tenant_id = ? AND ${win('created_at', days, offset)}${siteSql}`, params()).c;

  const pv = Number(pageviews.c) || 0;
  const sess = Number(sessions.c) || 0;
  const bounce = Number(sessions.bounce) || 0;
  return {
    visitors,
    newVisitors,
    returningVisitors: Math.max(0, visitors - newVisitors),
    pageviews: pv,
    sessions: sess,
    bounces: bounce,
    bounceRate: pct(bounce, sess),
    avgDwellSec: pv ? Math.round((Number(pageviews.dwell) || 0) / pv / 1000) : 0,
    pagesPerVisit: sess ? Number((pv / sess).toFixed(2)) : 0,
    conversations,
    leads,
    chatRate: pct(conversations, visitors),
    leadRate: pct(leads, visitors)
  };
}

function change(current, previous) {
  if (!previous) return current ? 100 : 0;
  return Number((((current - previous) / previous) * 100).toFixed(1));
}

function overview(req) {
  const days = rangeOf(req);
  const { site, siteId } = scopeOf(req);
  return cached(`overview:${req.tenant.id}:${siteId || 0}:${days}`, 30000, () => {
    const current = traffic(req, days, 0);
    const previous = traffic(req, days, days);
    const changes = {};
    Object.keys(current).forEach((key) => {
      if (typeof current[key] === 'number') changes[key] = change(current[key], previous[key]);
    });

    const siteSql = siteId ? ' AND site_id = ?' : '';
    const base = siteId ? [siteId] : [];
    const p = (extra = []) => [req.tenant.id, ...extra, ...base];

    const uvTrend = all(`SELECT date(entered_at) d, COUNT(DISTINCT visitor_id) c FROM pageviews WHERE tenant_id = ? AND ${win('entered_at', days)}${siteSql} GROUP BY d`, p());
    const pvTrend = all(`SELECT date(entered_at) d, COUNT(*) c FROM pageviews WHERE tenant_id = ? AND ${win('entered_at', days)}${siteSql} GROUP BY d`, p());
    const sessTrend = all(`SELECT date(started_at) d, COUNT(*) c FROM visitor_sessions WHERE tenant_id = ? AND ${win('started_at', days)}${siteSql} GROUP BY d`, p());
    const convTrend = all(`SELECT date(created_at) d, COUNT(*) c FROM conversations WHERE tenant_id = ? AND ${win('created_at', days)}${siteSql} GROUP BY d`, p());
    const leadTrend = all(`SELECT date(created_at) d, COUNT(*) c FROM leads WHERE tenant_id = ? AND ${win('created_at', days)}${siteSql} GROUP BY d`, p());

    const pages = pagesData(req, 6);
    const acquisition = acquisitionData(req, 5);
    const realtime = realtimeData(req);

    return {
      range: days,
      site: site ? { id: site.id, name: site.name } : null,
      metrics: current,
      previous,
      changes,
      trend: {
        dates: dayKeys(days),
        visitors: series(uvTrend, days),
        pageviews: series(pvTrend, days),
        sessions: series(sessTrend, days),
        conversations: series(convTrend, days),
        leads: series(leadTrend, days)
      },
      topPages: pages.pages.slice(0, 6),
      topSources: acquisition.sources.slice(0, 5),
      realtime
    };
  });
}

function realtimeData(req) {
  const { siteId } = scopeOf(req);
  const tenantId = req.tenant.id;
  const siteSql = siteId ? ' AND p.site_id = ?' : '';
  const base = siteId ? [siteId] : [];
  const recent = "datetime('now', '-5 minutes')";
  const summary = get(
    `SELECT COUNT(*) pv, COUNT(DISTINCT p.visitor_id) uv, COUNT(DISTINCT p.session_id) sessions
     FROM pageviews p WHERE p.tenant_id = ? AND p.entered_at >= ${recent}${siteSql}`,
    [tenantId, ...base]
  );
  const pages = all(
    `SELECT p.url, COUNT(*) pv, COUNT(DISTINCT p.visitor_id) uv
     FROM pageviews p WHERE p.tenant_id = ? AND p.entered_at >= ${recent}${siteSql}
     GROUP BY p.url ORDER BY pv DESC LIMIT 8`,
    [tenantId, ...base]
  );
  const sources = all(
    `SELECT COALESCE(NULLIF(v.source, ''), 'direct') source, COUNT(DISTINCT p.visitor_id) visitors
     FROM pageviews p JOIN visitors v ON v.id = p.visitor_id
     WHERE p.tenant_id = ? AND p.entered_at >= ${recent}${siteSql}
     GROUP BY source ORDER BY visitors DESC LIMIT 6`,
    [tenantId, ...base]
  );
  const last = get(`SELECT MAX(entered_at) last FROM pageviews WHERE tenant_id = ?${siteId ? ' AND site_id = ?' : ''}`, [tenantId, ...base]).last;
  return {
    online: siteId ? presence.visitorCount(siteId) : 0,
    pageviews: Number(summary.pv) || 0,
    visitors: Number(summary.uv) || 0,
    sessions: Number(summary.sessions) || 0,
    lastSeen: last || null,
    pages: pages.map((r) => ({ path: normalizePath(r.url), pageviews: r.pv, visitors: r.uv })),
    sources: sources.map((r) => ({ source: r.source, visitors: r.visitors }))
  };
}

function realtime(req) {
  const { siteId } = scopeOf(req);
  return cached(`realtime:${req.tenant.id}:${siteId || 0}`, 8000, () => realtimeData(req));
}

function pagesData(req, limit = 30) {
  const days = rangeOf(req);
  const { siteId } = scopeOf(req);
  const tenantId = req.tenant.id;
  const siteSql = siteId ? ' AND site_id = ?' : '';
  const base = siteId ? [siteId] : [];
  const p = (extra = []) => [tenantId, ...extra, ...base];

  const views = all(
    `SELECT url, COUNT(*) pv, COUNT(DISTINCT visitor_id) uv, COALESCE(SUM(dwell_ms), 0) dwell
     FROM pageviews WHERE tenant_id = ? AND ${win('entered_at', days)}${siteSql}
     GROUP BY url ORDER BY pv DESC LIMIT 800`,
    p()
  );
  const entries = all(
    `SELECT entry_page url, COUNT(*) entries, SUM(CASE WHEN page_count <= 1 THEN 1 ELSE 0 END) bounces
     FROM visitor_sessions WHERE tenant_id = ? AND ${win('started_at', days)}${siteSql}
     GROUP BY entry_page LIMIT 800`,
    p()
  );
  const exits = all(
    `SELECT exit_page url, COUNT(*) exits FROM visitor_sessions
     WHERE tenant_id = ? AND ${win('started_at', days)}${siteSql} AND exit_page IS NOT NULL AND exit_page != ''
     GROUP BY exit_page LIMIT 800`,
    p()
  );
  let scrolls = [];
  try {
    scrolls = all(
      `SELECT url, COUNT(*) scroll_samples, AVG(CAST(json_extract(payload, '$.depth') AS REAL)) scroll_depth
       FROM events WHERE tenant_id = ? AND type = 'scroll' AND ${win('created_at', days)}${siteSql}
       GROUP BY url LIMIT 800`,
      p()
    );
  } catch { /* older SQLite without json1 falls back to no scroll data */ }

  const merged = new Map();
  function add(rows, mapper) {
    rows.forEach((r) => {
      const path = normalizePath(r.url);
      const item = merged.get(path) || { path, url: r.url || path, pageviews: 0, visitors: 0, dwellMs: 0, entries: 0, exits: 0, bounces: 0, scrollSamples: 0, scrollDepth: 0 };
      mapper(item, r);
      merged.set(path, item);
    });
  }
  add(views, (item, r) => {
    item.pageviews += Number(r.pv) || 0;
    item.visitors += Number(r.uv) || 0;
    item.dwellMs += Number(r.dwell) || 0;
  });
  add(entries, (item, r) => {
    item.entries += Number(r.entries) || 0;
    item.bounces += Number(r.bounces) || 0;
  });
  add(exits, (item, r) => {
    item.exits += Number(r.exits) || 0;
  });
  add(scrolls, (item, r) => {
    item.scrollSamples += Number(r.scroll_samples) || 0;
    item.scrollDepth += (Number(r.scroll_depth) || 0) * (Number(r.scroll_samples) || 0);
  });

  const pages = Array.from(merged.values())
    .map((item) => ({
      path: item.path,
      url: item.url,
      pageviews: item.pageviews,
      visitors: item.visitors,
      avgDwellSec: item.pageviews ? Math.round(item.dwellMs / item.pageviews / 1000) : 0,
      entries: item.entries,
      exits: item.exits,
      bounceRate: pct(item.bounces, item.entries),
      avgScrollDepth: item.scrollSamples ? Math.round(item.scrollDepth / item.scrollSamples) : 0
    }))
    .filter((item) => item.pageviews > 0)
    .sort((a, b) => b.pageviews - a.pageviews);
  return {
    range: days,
    pages: pages.slice(0, limit),
    landing: pages.slice().sort((a, b) => b.entries - a.entries).slice(0, 10),
    exit: pages.slice().sort((a, b) => b.exits - a.exits).slice(0, 10)
  };
}

function pages(req) {
  const { siteId } = scopeOf(req);
  return cached(`pages:${req.tenant.id}:${siteId || 0}:${rangeOf(req)}`, 30000, () => pagesData(req, 40));
}

function acquisitionData(req, limit = 20) {
  const days = rangeOf(req);
  const { siteId } = scopeOf(req);
  const tenantId = req.tenant.id;
  const siteSql = siteId ? ' AND v.site_id = ?' : '';
  const base = siteId ? [siteId] : [];
  const p = [tenantId, ...base];
  const from = `FROM visitors v WHERE v.tenant_id = ? AND v.merged_into IS NULL AND ${win('v.first_seen', days)}${siteSql}`;

  function breakdown(column) {
    return all(
      `SELECT COALESCE(NULLIF(${column}, ''), '未知') label, COUNT(*) visitors,
              SUM((SELECT COUNT(*) FROM conversations c WHERE c.visitor_id = v.id)) conversations,
              SUM((SELECT COUNT(*) FROM leads l WHERE l.visitor_id = v.id)) leads,
              SUM(v.total_dwell_ms) dwell
       ${from} GROUP BY label ORDER BY visitors DESC LIMIT ${Number(limit) || 20}`,
      p
    ).map((r) => ({
      name: r.label,
      visitors: Number(r.visitors) || 0,
      conversations: Number(r.conversations) || 0,
      leads: Number(r.leads) || 0,
      chatRate: pct(Number(r.conversations) || 0, Number(r.visitors) || 0),
      leadRate: pct(Number(r.leads) || 0, Number(r.visitors) || 0),
      avgDwellSec: r.visitors ? Math.round((Number(r.dwell) || 0) / r.visitors / 1000) : 0
    }));
  }

  return {
    range: days,
    sources: breakdown('v.source').map((r) => ({ ...r, name: r.name === '未知' ? 'direct' : r.name })),
    mediums: breakdown('v.utm_medium'),
    campaigns: breakdown('v.utm_campaign'),
    referrers: breakdown("CASE WHEN v.referrer IS NULL OR v.referrer = '' THEN 'direct' ELSE v.referrer END").slice(0, 12)
  };
}

function acquisition(req) {
  const { siteId } = scopeOf(req);
  return cached(`acq:${req.tenant.id}:${siteId || 0}:${rangeOf(req)}`, 30000, () => acquisitionData(req, 20));
}

function audienceData(req) {
  const days = rangeOf(req);
  const { siteId } = scopeOf(req);
  const tenantId = req.tenant.id;
  const siteSql = siteId ? ' AND site_id = ?' : '';
  const base = siteId ? [siteId] : [];
  const p = [tenantId, ...base];
  const dims = ['device', 'browser', 'os', 'country', 'province', 'city', 'language', 'screen'];
  const result = {};
  dims.forEach((dim) => {
    result[dim] = all(
      `SELECT COALESCE(NULLIF(${dim}, ''), '未知') label, COUNT(*) value
       FROM visitors WHERE tenant_id = ? AND merged_into IS NULL AND ${win('last_seen', days)}${siteSql}
       GROUP BY label ORDER BY value DESC LIMIT 12`,
      p
    ).map((r) => ({ name: r.label, value: r.value }));
  });
  const total = get(`SELECT COUNT(*) c FROM visitors WHERE tenant_id = ? AND merged_into IS NULL AND ${win('last_seen', days)}${siteSql}`, p).c;
  return { range: days, total, ...result };
}

function audience(req) {
  const { siteId } = scopeOf(req);
  return cached(`audience:${req.tenant.id}:${siteId || 0}:${rangeOf(req)}`, 30000, () => audienceData(req));
}

function percentile(values, p) {
  if (!values.length) return 0;
  const sorted = values.slice().sort((a, b) => a - b);
  const index = Math.min(sorted.length - 1, Math.max(0, Math.ceil((p / 100) * sorted.length) - 1));
  return sorted[index];
}

function findVitalValue(payload) {
  const data = payload || {};
  const value = data.value != null ? Number(data.value) : Number(data.metric_value);
  return Number.isFinite(value) ? value : null;
}

function vitals(req) {
  const days = rangeOf(req);
  const { siteId } = scopeOf(req);
  const tenantId = req.tenant.id;
  const siteSql = siteId ? ' AND site_id = ?' : '';
  const base = siteId ? [siteId] : [];
  const rows = all(
    `SELECT name, payload FROM events
     WHERE tenant_id = ? AND ${win('created_at', days)}${siteSql}
       AND (type = 'performance' OR name LIKE 'web_vital_%')
     ORDER BY id DESC LIMIT 3000`,
    [tenantId, ...base]
  );
  const groups = new Map();
  rows.forEach((r) => {
    let payload = {};
    try { payload = JSON.parse(r.payload || '{}'); } catch { payload = {}; }
    const metric = String(payload.metric || r.name || '').replace(/^web_vital_/, '').toUpperCase();
    if (!metric) return;
    const value = findVitalValue(payload);
    if (value == null) return;
    if (!groups.has(metric)) groups.set(metric, []);
    groups.get(metric).push({ value, rating: payload.rating || '' });
  });
  const thresholds = {
    LCP: { good: 2500, poor: 4000 },
    CLS: { good: 0.1, poor: 0.25 },
    INP: { good: 200, poor: 500 },
    TTFB: { good: 800, poor: 1800 },
    FCP: { good: 1800, poor: 3000 }
  };
  return Array.from(groups.entries()).map(([metric, list]) => {
    const values = list.map((x) => x.value);
    const t = thresholds[metric] || { good: 0, poor: 0 };
    const good = t.good ? list.filter((x) => x.value <= t.good).length : 0;
    return {
      metric,
      samples: list.length,
      avg: Number((values.reduce((s, v) => s + v, 0) / values.length).toFixed(2)),
      p75: Number(percentile(values, 75).toFixed(2)),
      goodRate: pct(good, list.length),
      unit: metric === 'CLS' ? '' : 'ms'
    };
  }).sort((a, b) => b.samples - a.samples);
}

function eventsData(req) {
  const days = rangeOf(req);
  const { siteId } = scopeOf(req);
  const tenantId = req.tenant.id;
  const siteSql = siteId ? ' AND site_id = ?' : '';
  const base = siteId ? [siteId] : [];
  const p = [tenantId, ...base];
  const rows = all(
    `SELECT COALESCE(NULLIF(name, ''), type) name, type, COUNT(*) count, COUNT(DISTINCT visitor_id) visitors,
            MAX(created_at) last_at
     FROM events WHERE tenant_id = ? AND ${win('created_at', days)}${siteSql}
     GROUP BY name, type ORDER BY count DESC LIMIT 40`,
    p
  ).map((r) => ({
    name: r.name || r.type,
    type: r.type,
    count: Number(r.count) || 0,
    visitors: Number(r.visitors) || 0,
    lastAt: r.last_at
  }));
  const top = rows.filter((r) => r.type !== 'performance').slice(0, 5);
  const trends = top.map((r) => {
    const trend = all(
      `SELECT date(created_at) d, COUNT(*) c FROM events
       WHERE tenant_id = ? AND ${win('created_at', days)}${siteSql}
         AND COALESCE(NULLIF(name, ''), type) = ?
       GROUP BY d`,
      [...p, r.name]
    );
    return { name: r.name, values: series(trend, days) };
  });
  return {
    range: days,
    dates: dayKeys(days),
    events: rows,
    trends,
    vitals: vitals(req)
  };
}

function events(req) {
  const { siteId } = scopeOf(req);
  return cached(`events:${req.tenant.id}:${siteId || 0}:${rangeOf(req)}`, 30000, () => eventsData(req));
}

function csvCell(value) {
  const text = value == null ? '' : String(value);
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

function toCsv(headers, rows) {
  return '\ufeff' + [headers, ...rows].map((row) => row.map(csvCell).join(',')).join('\r\n');
}

function exportCsv(req) {
  const report = String((req.query && req.query.report) || 'overview');
  const days = rangeOf(req);
  let headers = [];
  let rows = [];
  if (report === 'pages') {
    const data = pagesData(req, 5000);
    headers = ['页面', '浏览量', '访客数', '平均停留秒', '入口数', '退出数', '跳出率', '平均滚动深度'];
    rows = data.pages.map((r) => [r.path, r.pageviews, r.visitors, r.avgDwellSec, r.entries, r.exits, r.bounceRate, r.avgScrollDepth]);
  } else if (report === 'acquisition') {
    const data = acquisitionData(req, 200);
    headers = ['渠道', '访客数', '会话数', '线索数', '咨询转化率', '留资转化率', '平均停留秒'];
    rows = data.sources.map((r) => [r.name, r.visitors, r.conversations, r.leads, r.chatRate, r.leadRate, r.avgDwellSec]);
  } else if (report === 'audience') {
    const data = audienceData(req);
    headers = ['维度', '取值', '访客数'];
    ['device', 'browser', 'os', 'country', 'province', 'city', 'language', 'screen'].forEach((dim) => {
      data[dim].forEach((r) => rows.push([dim, r.name, r.value]));
    });
  } else if (report === 'events') {
    const data = eventsData(req);
    headers = ['事件', '类型', '次数', '访客数', '最近发生'];
    rows = data.events.map((r) => [r.name, r.type, r.count, r.visitors, r.lastAt]);
  } else {
    const data = overview(req);
    headers = ['指标', '数值', '较上期'];
    const labels = { visitors: '访客数', newVisitors: '新访客', returningVisitors: '回访访客', pageviews: '浏览量', sessions: '访问次数', bounces: '跳出次数', bounceRate: '跳出率', avgDwellSec: '平均停留秒', pagesPerVisit: '人均页数', conversations: '会话数', leads: '线索数', chatRate: '咨询转化率', leadRate: '留资转化率' };
    Object.keys(labels).forEach((key) => rows.push([labels[key], data.metrics[key], data.changes[key] + '%']));
    rows.push(['统计范围', data.range + ' 天', '']);
  }
  return {
    filename: `analytics-${report}-${days}d.csv`,
    content: toCsv(headers, rows)
  };
}

module.exports = {
  rangeOf,
  overview,
  realtime,
  pages,
  acquisition,
  audience,
  events,
  exportCsv
};
