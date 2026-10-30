'use strict';
const express = require('express');
const { all, get, run, json } = require('../db');
const { apiKeyAuth } = require('../auth');
const { notifyTenant } = require('../services/notify');

const router = express.Router();
router.use(apiKeyAuth);
router.use((req, res, next) => {
  run("UPDATE api_keys SET last_used_at = datetime('now') WHERE id = ?", [req.apiKey.id]);
  next();
});

router.get('/stats', (req, res) => {
  const tid = req.tenant.id;
  res.json({
    visitors: get('SELECT COUNT(*) c FROM visitors WHERE tenant_id = ?', [tid]).c,
    conversations: get('SELECT COUNT(*) c FROM conversations WHERE tenant_id = ?', [tid]).c,
    openConversations: get("SELECT COUNT(*) c FROM conversations WHERE tenant_id = ? AND status != 'closed'", [tid]).c,
    leads: get('SELECT COUNT(*) c FROM leads WHERE tenant_id = ?', [tid]).c,
    newLeads: get("SELECT COUNT(*) c FROM leads WHERE tenant_id = ? AND status = 'new'", [tid]).c
  });
});

router.get('/leads', (req, res) => {
  const limit = Math.min(200, Number(req.query.limit) || 50);
  const offset = Math.max(0, Number(req.query.offset) || 0);
  const status = req.query.status;
  const rows = all(
    `SELECT * FROM leads WHERE tenant_id = ?${status ? ' AND status = ?' : ''} ORDER BY id DESC LIMIT ? OFFSET ?`,
    status ? [req.tenant.id, status, limit, offset] : [req.tenant.id, limit, offset]
  );
  res.json({ data: rows.map((l) => ({ ...l, tags: json(l.tags, []) })), total: get('SELECT COUNT(*) c FROM leads WHERE tenant_id = ?', [req.tenant.id]).c });
});

router.post('/leads', async (req, res) => {
  const b = req.body || {};
  if (!b.phone && !b.email) return res.status(400).json({ error: 'phone 或 email 至少填一个' });
  const site = get('SELECT * FROM sites WHERE tenant_id = ? ORDER BY id LIMIT 1', [req.tenant.id]);
  if (!site) return res.status(400).json({ error: '租户下没有站点' });
  const id = run(
    'INSERT INTO leads (tenant_id, site_id, source, name, phone, email, company, business_type, requirement, status, score, tags) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)',
    [req.tenant.id, site.id, 'api', String(b.name || '').slice(0, 50), String(b.phone || '').slice(0, 20), String(b.email || '').slice(0, 100),
      String(b.company || '').slice(0, 100), String(b.business_type || '').slice(0, 50), String(b.requirement || '').slice(0, 1000), 'new', 40, JSON.stringify(['API 导入'])]
  ).lastInsertRowid;
  await notifyTenant(req.tenant.id, 'lead', 'API 新增线索', `${b.name || b.phone || ''} 通过开放 API 写入`, { leadId: id });
  res.json({ ok: true, id });
});

router.patch('/leads/:id', (req, res) => {
  const l = get('SELECT * FROM leads WHERE id = ? AND tenant_id = ?', [Number(req.params.id), req.tenant.id]);
  if (!l) return res.status(404).json({ error: '线索不存在' });
  const b = req.body || {};
  const updates = [];
  const params = [];
  for (const key of ['name', 'phone', 'email', 'company', 'business_type', 'requirement', 'status']) {
    if (b[key] !== undefined) { updates.push(`${key} = ?`); params.push(String(b[key]).slice(0, 500)); }
  }
  if (!updates.length) return res.status(400).json({ error: '没有可更新字段' });
  updates.push("updated_at = datetime('now')");
  params.push(l.id);
  run(`UPDATE leads SET ${updates.join(', ')} WHERE id = ?`, params);
  res.json({ ok: true });
});

router.get('/conversations', (req, res) => {
  const limit = Math.min(200, Number(req.query.limit) || 50);
  const rows = all(
    `SELECT c.*, v.name AS visitor_name, v.phone AS visitor_phone FROM conversations c JOIN visitors v ON v.id = c.visitor_id
     WHERE c.tenant_id = ? ORDER BY c.id DESC LIMIT ?`, [req.tenant.id, limit]
  );
  res.json({ data: rows });
});

router.get('/conversations/:id/messages', (req, res) => {
  const c = get('SELECT * FROM conversations WHERE id = ? AND tenant_id = ?', [Number(req.params.id), req.tenant.id]);
  if (!c) return res.status(404).json({ error: '会话不存在' });
  const msgs = all('SELECT * FROM messages WHERE conversation_id = ? AND is_private = 0 ORDER BY id', [c.id]);
  res.json({ conversation: c, messages: msgs });
});

router.get('/visitors', (req, res) => {
  const limit = Math.min(200, Number(req.query.limit) || 50);
  const rows = all('SELECT id, vid, name, province, city, device, source, pageview_count, intent_level, first_seen, last_seen FROM visitors WHERE tenant_id = ? ORDER BY last_seen DESC LIMIT ?', [req.tenant.id, limit]);
  res.json({ data: rows });
});

module.exports = router;
