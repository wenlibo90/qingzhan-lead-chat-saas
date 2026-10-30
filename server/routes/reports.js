'use strict';
const express = require('express');
const { all, get, json } = require('../db');
const { authRequired, featureGate, requireRole } = require('../auth');
const { siteScope, parseRange } = require('../helpers');
const { hasFeature, planOf } = require('../plans');
const presence = require('../services/presence');

const router = express.Router();
router.use(authRequired);

function dayKeys(days) {
  const keys = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    keys.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`);
  }
  return keys;
}

function series(rows, days) {
  const map = new Map(rows.map((r) => [r.d, r.c]));
  return dayKeys(days).map((d) => ({ date: d, value: map.get(d) || 0 }));
}

router.get('/dashboard/overview', (req, res) => {
  const days = parseRange(req, 14);
  const { site } = siteScope(req);
  const sid = site ? site.id : null;
  const sf = sid ? ' AND site_id = ?' : '';
  const sfx = sid ? ' AND c.site_id = ?' : '';
  const p = (extra = []) => (sid ? [sid, ...extra] : extra);

  const visitors = get(`SELECT COUNT(*) c FROM visitors WHERE tenant_id = ? AND merged_into IS NULL AND last_seen >= datetime('now', '-${days} days')${sf}`, [req.tenant.id, ...p()]).c;
  const newVisitors = get(`SELECT COUNT(*) c FROM visitors WHERE tenant_id = ? AND first_seen >= datetime('now', '-${days} days')${sf}`, [req.tenant.id, ...p()]).c;
  const pageviews = get(`SELECT COUNT(*) c FROM pageviews WHERE tenant_id = ? AND entered_at >= datetime('now', '-${days} days')${sf}`, [req.tenant.id, ...p()]).c;
  const sessions = get(`SELECT COUNT(*) c FROM visitor_sessions WHERE tenant_id = ? AND started_at >= datetime('now', '-${days} days')${sf}`, [req.tenant.id, ...p()]).c;
  const conversations = get(`SELECT COUNT(*) c FROM conversations WHERE tenant_id = ? AND created_at >= datetime('now', '-${days} days')${sf}`, [req.tenant.id, ...p()]).c;
  const leads = get(`SELECT COUNT(*) c FROM leads WHERE tenant_id = ? AND created_at >= datetime('now', '-${days} days')${sf}`, [req.tenant.id, ...p()]).c;
  const openConv = get(`SELECT COUNT(*) c FROM conversations WHERE tenant_id = ? AND status != 'closed'${sf}`, [req.tenant.id, ...p()]).c;
  const response = get(`SELECT AVG(first_response_ms) a FROM conversations WHERE tenant_id = ? AND first_response_ms IS NOT NULL AND created_at >= datetime('now', '-${days} days')${sf}`, [req.tenant.id, ...p()]).a;
  const rating = get(`SELECT AVG(rating) a, COUNT(rating) c FROM conversations WHERE tenant_id = ? AND rating IS NOT NULL AND created_at >= datetime('now', '-${days} days')${sf}`, [req.tenant.id, ...p()]);

  const vTrend = series(all(`SELECT date(first_seen) d, COUNT(*) c FROM visitors WHERE tenant_id = ? AND first_seen >= datetime('now', '-${days} days')${sf} GROUP BY d`, [req.tenant.id, ...p()]), days);
  const pvTrend = series(all(`SELECT date(entered_at) d, COUNT(*) c FROM pageviews WHERE tenant_id = ? AND entered_at >= datetime('now', '-${days} days')${sf} GROUP BY d`, [req.tenant.id, ...p()]), days);
  const cTrend = series(all(`SELECT date(created_at) d, COUNT(*) c FROM conversations WHERE tenant_id = ? AND created_at >= datetime('now', '-${days} days')${sf} GROUP BY d`, [req.tenant.id, ...p()]), days);
  const lTrend = series(all(`SELECT date(created_at) d, COUNT(*) c FROM leads WHERE tenant_id = ? AND created_at >= datetime('now', '-${days} days')${sf} GROUP BY d`, [req.tenant.id, ...p()]), days);

  const adblock = get(`SELECT COUNT(*) c FROM events WHERE tenant_id = ? AND type = 'adblock' AND created_at >= datetime('now', '-${days} days')${sf}`, [req.tenant.id, ...p()]).c;
  const widgetOpens = get(`SELECT COUNT(DISTINCT visitor_id) c FROM events WHERE tenant_id = ? AND name IN ('widget_open','chat_open') AND created_at >= datetime('now', '-${days} days')${sf}`, [req.tenant.id, ...p()]).c;
  const uniqueChatters = get(`SELECT COUNT(DISTINCT visitor_id) c FROM conversations WHERE tenant_id = ? AND created_at >= datetime('now', '-${days} days')${sf}`, [req.tenant.id, ...p()]).c;
  const openedEstimate = Math.max(widgetOpens, uniqueChatters);
  const adblockRate = pageviews + adblock > 0 ? Number(((adblock / (pageviews + adblock)) * 100).toFixed(1)) : 0;

  const recent = all(
    `SELECT c.id, c.subject, c.status, c.created_at, c.last_message_at, v.name AS visitor_name, v.province, s.name AS site_name, u.name AS agent_name
     FROM conversations c JOIN visitors v ON v.id = c.visitor_id JOIN sites s ON s.id = c.site_id LEFT JOIN users u ON u.id = c.agent_id
     WHERE c.tenant_id = ?${sfx} ORDER BY c.last_message_at DESC LIMIT 6`,
    [req.tenant.id, ...(sid ? [sid] : [])]
  );
  const agents = all("SELECT COUNT(*) c FROM users WHERE tenant_id = ? AND status = 'active' AND role IN ('agent','operator','admin')", [req.tenant.id])[0].c;
  const siteCount = all('SELECT COUNT(*) c FROM sites WHERE tenant_id = ? AND is_sandbox = 0', [req.tenant.id])[0].c;
  const monthlyVisitors = get("SELECT COUNT(*) c FROM visitors WHERE tenant_id = ? AND first_seen >= datetime('now', 'start of month')", [req.tenant.id]).c;

  res.json({
    range: days,
    site: site ? { id: site.id, name: site.name } : null,
    metrics: {
      visitors, newVisitors, pageviews, sessions, conversations, leads, openConv,
      avgResponseMs: response ? Math.round(response) : 0,
      satisfaction: rating.a ? Number(rating.a.toFixed(1)) : 0,
      ratingCount: rating.c,
      chatRate: visitors ? Number(((uniqueChatters / visitors) * 100).toFixed(1)) : 0,
      leadRate: visitors ? Number(((leads / visitors) * 100).toFixed(1)) : 0,
      adblock, adblockRate, openedEstimate
    },
    trend: {
      dates: dayKeys(days),
      visitors: vTrend, pageviews: pvTrend, conversations: cTrend, leads: lTrend
    },
    recent,
    online: { visitors: site ? presence.visitorCount(site.id) : 0, agents: presence.onlineAgentCount(req.tenant.id) },
    plan: {
      code: req.tenant.plan, name: planOf(req.tenant.plan).name, limits: planOf(req.tenant.plan).limits,
      usage: { agents, sites: siteCount, monthlyVisitors }
    },
    features: {
      funnel: hasFeature(req.tenant.plan, 'funnel'),
      crm: hasFeature(req.tenant.plan, 'crm'),
      geo: hasFeature(req.tenant.plan, 'geo_heatmap'),
      agentPerf: hasFeature(req.tenant.plan, 'agent_perf'),
      churn: hasFeature(req.tenant.plan, 'churn_report'),
      source: hasFeature(req.tenant.plan, 'source_stats')
    },
    adblockAlert: adblockRate > 20
  });
});

router.get('/reports/sources', requireRole('admin', 'operator'), featureGate('source_stats'), (req, res) => {
  const days = parseRange(req);
  const { site } = siteScope(req);
  const sf = site ? ' AND site_id = ?' : '';
  const p = site ? [site.id] : [];
  const rows = all(
    `SELECT COALESCE(NULLIF(source, ''), 'direct') AS source,
            COUNT(*) AS visitors,
            SUM(CASE WHEN conv > 0 THEN 1 ELSE 0 END) AS chatters,
            SUM(conv) AS conversations,
            SUM(CASE WHEN lead > 0 THEN 1 ELSE 0 END) AS leaders,
            SUM(lead) AS leads,
            SUM(dwell) AS dwell
     FROM (
       SELECT v.id, v.source, v.total_dwell_ms AS dwell,
              (SELECT COUNT(*) FROM conversations c WHERE c.visitor_id = v.id) AS conv,
              (SELECT COUNT(*) FROM leads l WHERE l.visitor_id = v.id) AS lead
       FROM visitors v WHERE v.tenant_id = ? AND v.first_seen >= datetime('now', '-${days} days')${sf.replace('site_id', 'v.site_id')}
     ) GROUP BY source ORDER BY visitors DESC`,
    [req.tenant.id, ...p]
  );
  res.json({
    sources: rows.map((r) => ({
      source: r.source,
      visitors: r.visitors,
      conversations: r.conversations,
      leads: r.leads,
      chatRate: r.visitors ? Number(((r.chatters / r.visitors) * 100).toFixed(1)) : 0,
      leadRate: r.visitors ? Number(((r.leaders / r.visitors) * 100).toFixed(1)) : 0,
      avgDwellSec: r.visitors ? Math.round(r.dwell / r.visitors / 1000) : 0
    }))
  });
});

router.get('/reports/funnel', requireRole('admin', 'operator'), featureGate('funnel'), (req, res) => {
  const days = parseRange(req);
  const { site } = siteScope(req);
  const sf = site ? ' AND site_id = ?' : '';
  const p = site ? [site.id] : [];
  const visitors = get(`SELECT COUNT(*) c FROM visitors WHERE tenant_id = ? AND first_seen >= datetime('now', '-${days} days')${sf}`, [req.tenant.id, ...p]).c;
  const opened1 = get(`SELECT COUNT(DISTINCT visitor_id) c FROM events WHERE tenant_id = ? AND name IN ('widget_open','chat_open') AND created_at >= datetime('now', '-${days} days')${sf}`, [req.tenant.id, ...p]).c;
  const chatters = get(`SELECT COUNT(DISTINCT visitor_id) c FROM conversations WHERE tenant_id = ? AND created_at >= datetime('now', '-${days} days')${sf}`, [req.tenant.id, ...p]).c;
  const conversations = get(`SELECT COUNT(*) c FROM conversations WHERE tenant_id = ? AND created_at >= datetime('now', '-${days} days')${sf}`, [req.tenant.id, ...p]).c;
  const leads = get(`SELECT COUNT(*) c FROM leads WHERE tenant_id = ? AND created_at >= datetime('now', '-${days} days')${sf}`, [req.tenant.id, ...p]).c;
  const opened = Math.max(opened1, chatters);
  const steps = [
    { key: 'visit', label: '访问网站', value: visitors },
    { key: 'open', label: '打开客服', value: opened },
    { key: 'chat', label: '发起对话', value: conversations },
    { key: 'lead', label: '提交线索', value: leads }
  ].map((s, i, arr) => ({
    ...s,
    rate: visitors ? Number(((s.value / visitors) * 100).toFixed(1)) : 0,
    stepRate: i === 0 ? 100 : arr[i - 1].value ? Number(((s.value / arr[i - 1].value) * 100).toFixed(1)) : 0
  }));
  res.json({ steps });
});

router.get('/reports/agents', requireRole('admin', 'operator'), featureGate('agent_perf'), (req, res) => {
  const days = parseRange(req);
  const { site } = siteScope(req);
  const sf = site ? ' AND c.site_id = ?' : '';
  const p = site ? [site.id] : [];
  const rows = all(
    `SELECT u.id, u.name, u.role, u.avatar,
            COUNT(c.id) AS conversations,
            SUM(CASE WHEN c.status = 'closed' THEN 1 ELSE 0 END) AS closed,
            AVG(c.first_response_ms) AS avg_response,
            AVG(c.rating) AS avg_rating,
            SUM(CASE WHEN c.rating >= 4 THEN 1 ELSE 0 END) AS good_ratings,
            COUNT(c.rating) AS rating_count,
            (SELECT COUNT(*) FROM leads l WHERE l.owner_id = u.id AND l.created_at >= datetime('now', '-${days} days')) AS leads,
            (SELECT COUNT(*) FROM messages m WHERE m.sender_id = u.id AND m.sender_type = 'agent' AND m.created_at >= datetime('now', '-${days} days')) AS messages
     FROM users u LEFT JOIN conversations c ON c.agent_id = u.id AND c.created_at >= datetime('now', '-${days} days')${sf}
     WHERE u.tenant_id = ? AND u.status = 'active'
     GROUP BY u.id ORDER BY conversations DESC`,
    [...p, req.tenant.id]
  );
  const total = rows.reduce((s, r) => s + r.conversations, 0);
  res.json({
    agents: rows.map((r) => ({
      id: r.id, name: r.name, role: r.role, avatar: r.avatar,
      conversations: r.conversations, closed: r.closed, messages: r.messages, leads: r.leads,
      avgResponseMs: r.avg_response ? Math.round(r.avg_response) : 0,
      avgRating: r.avg_rating ? Number(r.avg_rating.toFixed(1)) : 0,
      satisfaction: r.rating_count ? Number(((r.good_ratings / r.rating_count) * 100).toFixed(1)) : 0,
      share: total ? Number(((r.conversations / total) * 100).toFixed(1)) : 0
    }))
  });
});

router.get('/reports/geo', requireRole('admin', 'operator'), featureGate('geo_heatmap'), (req, res) => {
  const days = parseRange(req);
  const { site } = siteScope(req);
  const sf = site ? ' AND site_id = ?' : '';
  const p = site ? [site.id] : [];
  const rows = all(
    `SELECT v.province, v.city, COUNT(*) visitors,
            SUM(CASE WHEN (SELECT COUNT(*) FROM conversations c WHERE c.visitor_id = v.id) > 0 THEN 1 ELSE 0 END) chatters,
            SUM(CASE WHEN (SELECT COUNT(*) FROM leads l WHERE l.visitor_id = v.id) > 0 THEN 1 ELSE 0 END) leaders,
            (SELECT COUNT(*) FROM leads l2 WHERE l2.visitor_id = v.id) lead_count
     FROM visitors v WHERE v.tenant_id = ? AND v.first_seen >= datetime('now', '-${days} days')${sf.replace('site_id', 'v.site_id')}
     GROUP BY v.province ORDER BY visitors DESC`,
    [req.tenant.id, ...p]
  );
  const provinces = rows.map((r) => ({
    province: r.province || '未知', visitors: r.visitors, chatters: r.chatters, leaders: r.leaders,
    leads: r.lead_count,
    leadRate: r.visitors ? Number(((r.leaders / r.visitors) * 100).toFixed(1)) : 0
  }));
  const max = Math.max(1, ...provinces.map((x) => x.visitors));
  res.json({ provinces: provinces.map((x) => ({ ...x, intensity: Number((x.visitors / max).toFixed(2)) })), total: provinces.reduce((s, x) => s + x.visitors, 0) });
});

router.get('/reports/churn', requireRole('admin', 'operator'), featureGate('churn_report'), (req, res) => {
  const days = parseRange(req);
  const { site } = siteScope(req);
  const sf = site ? ' AND v.site_id = ?' : '';
  const p = site ? [site.id] : [];
  const rows = all(
    `SELECT v.id, v.vid, v.name, v.phone, v.province, v.city, v.source, v.device, v.pageview_count, v.total_dwell_ms,
            v.intent_score, v.intent_level, v.last_seen, v.first_seen, v.landing_page,
            (SELECT url FROM pageviews pv WHERE pv.visitor_id = v.id ORDER BY pv.id DESC LIMIT 1) AS last_page
     FROM visitors v
     WHERE v.tenant_id = ? AND v.first_seen >= datetime('now', '-${days} days')${sf}
       AND NOT EXISTS (SELECT 1 FROM conversations c WHERE c.visitor_id = v.id)
     ORDER BY v.intent_score DESC, v.last_seen DESC LIMIT 200`,
    [req.tenant.id, ...p]
  );
  res.json({
    total: rows.length,
    visitors: rows.map((v) => ({
      id: v.id, vid: v.vid, name: v.name || '匿名访客', phone: v.phone, province: v.province, city: v.city,
      source: v.source, device: v.device, pageviewCount: v.pageview_count, dwellSec: Math.round(v.total_dwell_ms / 1000),
      intentScore: v.intent_score, intentLevel: v.intent_level, lastSeen: v.last_seen, landingPage: v.landing_page, lastPage: v.last_page
    }))
  });
});

module.exports = router;
