'use strict';
const express = require('express');
const { all, get, run, json } = require('../db');
const { authRequired, featureGate, requireRole } = require('../auth');
const { siteScope, paging, audit, recalcVisitorIntent } = require('../helpers');
const { hasFeature } = require('../plans');

const router = express.Router();
router.use(authRequired);

function mapVisitor(v, advanced) {
  return {
    id: v.id,
    vid: v.vid,
    name: v.name,
    phone: advanced ? v.phone : v.phone ? v.phone.replace(/(\d{3})\d{4}(\d{4})/, '$1****$2') : null,
    email: advanced ? v.email : null,
    company: advanced ? v.company : null,
    businessType: v.business_type,
    province: v.province,
    city: v.city,
    device: v.device,
    browser: v.browser,
    os: v.os,
    source: advanced ? v.source : undefined,
    keyword: advanced ? v.keyword : undefined,
    utmSource: advanced ? v.utm_source : undefined,
    referrer: advanced ? v.referrer : undefined,
    landingPage: v.landing_page,
    pageviewCount: v.pageview_count,
    visitCount: v.visit_count,
    totalDwellMs: v.total_dwell_ms,
    intentScore: advanced ? v.intent_score : undefined,
    intentLevel: advanced ? v.intent_level : undefined,
    tags: advanced ? json(v.tags, []) : undefined,
    trackingConsent: !!v.tracking_consent,
    blocked: !!v.blocked,
    firstSeen: v.first_seen,
    lastSeen: v.last_seen,
    conversationCount: v.conversation_count,
    leadCount: v.lead_count
  };
}

router.get('/', (req, res) => {
  const { site } = siteScope(req);
  const { limit, offset, page } = paging(req, 20, 100);
  const advanced = hasFeature(req.tenant.plan, 'visitor_profile_basic');
  const q = String(req.query.q || '').trim();
  const params = [req.tenant.id];
  let where = 'v.tenant_id = ? AND v.merged_into IS NULL';
  if (site) { where += ' AND v.site_id = ?'; params.push(site.id); }
  if (q) { where += ' AND (v.name LIKE ? OR v.phone LIKE ? OR v.vid LIKE ? OR v.city LIKE ?)'; params.push(`%${q}%`, `%${q}%`, `%${q}%`, `%${q}%`); }
  if (req.query.intent && ['high', 'medium', 'low'].includes(req.query.intent)) { where += ' AND v.intent_level = ?'; params.push(req.query.intent); }
  if (req.query.range) { where += ` AND v.last_seen >= datetime('now', '-${Number(req.query.range)} days')`; }
  const total = get(`SELECT COUNT(*) c FROM visitors v WHERE ${where}`, params).c;
  const rows = all(
    `SELECT v.*, (SELECT COUNT(*) FROM conversations c WHERE c.visitor_id = v.id) AS conversation_count,
            (SELECT COUNT(*) FROM leads l WHERE l.visitor_id = v.id) AS lead_count
     FROM visitors v WHERE ${where} ORDER BY v.last_seen DESC LIMIT ? OFFSET ?`,
    [...params, limit, offset]
  );
  res.json({ visitors: rows.map((v) => mapVisitor(v, advanced)), total, page, limit, advanced });
});

router.get('/export.csv', featureGate('crm'), (req, res) => {
  const { site } = siteScope(req);
  const params = [req.tenant.id];
  let where = 'v.tenant_id = ?';
  if (site) { where += ' AND v.site_id = ?'; params.push(site.id); }
  const rows = all(`SELECT * FROM visitors v WHERE ${where} ORDER BY last_seen DESC LIMIT 5000`, params);
  const header = ['访客ID', '姓名', '手机号', '公司', '业务类型', '省份', '城市', '设备', '浏览器', '来源', '落地页', '访问页数', '访问次数', '停留秒数', '意向分', '意向等级', '首次访问', '最近访问'];
  const lines = [header.join(',')];
  for (const v of rows) {
    lines.push([
      v.vid, v.name || '', v.phone || '', v.company || '', v.business_type || '', v.province || '', v.city || '',
      v.device || '', v.browser || '', v.source || '', v.landing_page || '', v.pageview_count, v.visit_count,
      Math.round(Number(v.total_dwell_ms) / 1000), v.intent_score, v.intent_level, v.first_seen, v.last_seen
    ].map((x) => `"${String(x == null ? '' : x).replace(/"/g, '""')}"`).join(','));
  }
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', 'attachment; filename="visitors.csv"');
  res.send('\uFEFF' + lines.join('\r\n'));
});

router.get('/:id', featureGate('visitor_profile_basic'), (req, res) => {
  const v = get('SELECT * FROM visitors WHERE id = ? AND tenant_id = ?', [Number(req.params.id), req.tenant.id]);
  if (!v) return res.status(404).json({ error: '访客不存在' });
  const advanced = hasFeature(req.tenant.plan, 'intent_scoring');
  const sessions = all('SELECT * FROM visitor_sessions WHERE visitor_id = ? ORDER BY id DESC LIMIT 30', [v.id]);
  const pageviews = all('SELECT * FROM pageviews WHERE visitor_id = ? ORDER BY id DESC LIMIT 50', [v.id]);
  const events = all('SELECT * FROM events WHERE visitor_id = ? ORDER BY id DESC LIMIT 80', [v.id]);
  const conversations = all(
    'SELECT c.id, c.status, c.subject, c.rating, c.created_at, c.last_message_at, u.name AS agent_name FROM conversations c LEFT JOIN users u ON u.id = c.agent_id WHERE c.visitor_id = ? ORDER BY c.id DESC',
    [v.id]
  );
  const submissions = all('SELECT fs.*, f.name AS form_name FROM form_submissions fs LEFT JOIN forms f ON f.id = fs.form_id WHERE fs.visitor_id = ? ORDER BY fs.id DESC', [v.id]).map((s) => ({ ...s, data: json(s.data, {}) }));
  const files = all(
    `SELECT m.id, m.file_name, m.file_url, m.file_size, m.type, m.created_at, m.conversation_id FROM messages m
     WHERE m.conversation_id IN (SELECT id FROM conversations WHERE visitor_id = ?) AND m.file_url IS NOT NULL ORDER BY m.id DESC LIMIT 30`,
    [v.id]
  );
  const recordings = all('SELECT * FROM recordings WHERE visitor_id = ? ORDER BY id DESC', [v.id]);
  const leads = hasFeature(req.tenant.plan, 'crm')
    ? all('SELECT * FROM leads WHERE visitor_id = ? ORDER BY id DESC', [v.id])
    : [];
  const tagRows = all('SELECT t.* FROM tags t JOIN visitor_tags vt ON vt.tag_id = t.id WHERE vt.visitor_id = ?', [v.id]);
  const allTags = all('SELECT * FROM tags WHERE tenant_id = ? ORDER BY id', [req.tenant.id]);
  const timeline = [
    ...sessions.map((s) => ({ type: 'session', at: s.started_at, title: '访问网站', detail: `${s.page_count} 个页面 · ${Math.round(s.duration_ms / 1000)} 秒`, icon: 'visit' })),
    ...conversations.map((c) => ({ type: 'conversation', at: c.created_at, title: c.subject || '发起咨询', detail: `${c.agent_name || '未分配'} · ${c.status}`, icon: 'chat' })),
    ...submissions.map((s) => ({ type: 'form', at: s.created_at, title: `提交表单：${s.form_name || ''}`, detail: JSON.stringify(s.data).slice(0, 120), icon: 'form' })),
    ...events.filter((e) => e.type === 'click').slice(0, 20).map((e) => ({ type: 'click', at: e.created_at, title: `点击：${e.name}`, detail: e.url, icon: 'click' }))
  ].sort((a, b) => String(b.at).localeCompare(String(a.at))).slice(0, 60);

  res.json({
    visitor: {
      ...mapVisitor(v, true),
      ip: advanced ? v.ip : v.ip ? v.ip.replace(/\.\d+\.\d+$/, '.*.*') : null,
      country: v.country,
      language: v.language,
      screen: v.screen,
      utmCampaign: v.utm_campaign,
      totalDwellMs: v.total_dwell_ms,
      trackingConsent: !!v.tracking_consent,
      blocked: !!v.blocked
    },
    sessions,
    pageviews,
    events: events.map((e) => ({ ...e, payload: json(e.payload, {}) })),
    conversations,
    submissions,
    files,
    recordings,
    leads,
    tags: tagRows,
    allTags,
    timeline,
    advanced
  });
});

router.patch('/:id', requireRole('admin', 'operator'), (req, res) => {
  const v = get('SELECT * FROM visitors WHERE id = ? AND tenant_id = ?', [Number(req.params.id), req.tenant.id]);
  if (!v) return res.status(404).json({ error: '访客不存在' });
  const body = req.body || {};
  const allowed = ['name', 'phone', 'email', 'company', 'business_type'];
  const updates = [];
  const params = [];
  for (const key of allowed) {
    if (body[key] !== undefined) { updates.push(`${key} = ?`); params.push(String(body[key]).slice(0, 200)); }
  }
  if (body.blocked !== undefined) {
    if (!hasFeature(req.tenant.plan, 'blacklist')) return res.status(403).json({ error: '当前套餐未开通黑名单能力', code: 'PLAN_LOCKED' });
    updates.push('blocked = ?');
    params.push(body.blocked ? 1 : 0);
    if (body.blocked) {
      run('INSERT INTO blacklist (tenant_id, site_id, type, value, reason) VALUES (?,?,?,?,?)', [req.tenant.id, v.site_id, 'visitor', v.vid, '访客档案中手动拉黑']);
    }
  }
  if (!updates.length) return res.status(400).json({ error: '没有可更新字段' });
  params.push(v.id);
  run(`UPDATE visitors SET ${updates.join(', ')} WHERE id = ?`, params);
  if (body.phone || body.email) {
    run("UPDATE leads SET phone = COALESCE(?, phone), email = COALESCE(?, email) WHERE visitor_id = ?", [body.phone || null, body.email || null, v.id]);
  }
  audit(req, 'visitor.update', `visitor:${v.id}`, JSON.stringify(body).slice(0, 300));
  const fresh = get('SELECT * FROM visitors WHERE id = ?', [v.id]);
  res.json({ ok: true, visitor: mapVisitor(fresh, true) });
});

router.post('/:id/tags', requireRole('admin', 'operator', 'agent'), (req, res) => {
  const v = get('SELECT * FROM visitors WHERE id = ? AND tenant_id = ?', [Number(req.params.id), req.tenant.id]);
  if (!v) return res.status(404).json({ error: '访客不存在' });
  const tagIds = (req.body.tagIds || []).map(Number).filter(Boolean);
  const valid = all('SELECT id, name FROM tags WHERE tenant_id = ?', [req.tenant.id]);
  run('DELETE FROM visitor_tags WHERE visitor_id = ?', [v.id]);
  for (const id of tagIds) {
    if (valid.some((t) => t.id === id)) run('INSERT OR IGNORE INTO visitor_tags (tenant_id, visitor_id, tag_id) VALUES (?,?,?)', [req.tenant.id, v.id, id]);
  }
  const names = valid.filter((t) => tagIds.includes(t.id)).map((t) => t.name);
  run('UPDATE visitors SET tags = ? WHERE id = ?', [JSON.stringify(names), v.id]);
  res.json({ ok: true, tags: names });
});

router.post('/:id/merge', requireRole('admin', 'operator'), featureGate('visitor_profile_basic'), (req, res) => {
  const target = get('SELECT * FROM visitors WHERE id = ? AND tenant_id = ?', [Number(req.params.id), req.tenant.id]);
  const source = get('SELECT * FROM visitors WHERE id = ? AND tenant_id = ?', [Number(req.body.sourceId), req.tenant.id]);
  if (!target || !source || target.id === source.id) return res.status(400).json({ error: '合并对象不合法' });
  const tables = ['conversations', 'pageviews', 'events', 'form_submissions', 'leads', 'recordings'];
  for (const t of tables) run(`UPDATE ${t} SET visitor_id = ? WHERE visitor_id = ?`, [target.id, source.id]);
  run('UPDATE visitor_sessions SET visitor_id = ? WHERE visitor_id = ?', [target.id, source.id]);
  run('UPDATE visitors SET pageview_count = pageview_count + ?, visit_count = visit_count + ?, total_dwell_ms = total_dwell_ms + ? WHERE id = ?',
    [source.pageview_count, source.visit_count, source.total_dwell_ms, target.id]);
  run('UPDATE visitors SET merged_into = ?, blocked = 1 WHERE id = ?', [target.id, source.id]);
  recalcVisitorIntent(req.tenant.id, target.id);
  audit(req, 'visitor.merge', `visitor:${target.id}`, `合并 ${source.vid}`);
  res.json({ ok: true });
});

router.get('/:id/context', (req, res) => {
  const v = get('SELECT * FROM visitors WHERE id = ? AND tenant_id = ?', [Number(req.params.id), req.tenant.id]);
  if (!v) return res.status(404).json({ error: '访客不存在' });
  const pages = all('SELECT url, title, dwell_ms, entered_at FROM pageviews WHERE visitor_id = ? ORDER BY id DESC LIMIT 12', [v.id]);
  res.json({
    visitor: { id: v.id, name: v.name, province: v.province, city: v.city, device: v.device, browser: v.browser, source: v.source, intentScore: v.intent_score, intentLevel: v.intent_level, tags: json(v.tags, []) },
    pages
  });
});

module.exports = router;
