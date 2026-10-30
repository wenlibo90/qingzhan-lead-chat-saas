'use strict';
const express = require('express');
const { all, get, run, json } = require('../db');
const { authRequired, featureGate, requireRole } = require('../auth');
const { siteScope, paging, audit } = require('../helpers');
const { notifyTenant } = require('../services/notify');

const router = express.Router();
router.use(authRequired);

const STATUS = ['new', 'following', 'won', 'invalid'];

function mapLead(l) {
  return {
    id: l.id,
    siteId: l.site_id,
    siteName: l.site_name,
    visitorId: l.visitor_id,
    vid: l.vid,
    conversationId: l.conversation_id,
    source: l.source,
    name: l.name,
    phone: l.phone,
    email: l.email,
    company: l.company,
    businessType: l.business_type,
    requirement: l.requirement,
    status: l.status,
    ownerId: l.owner_id,
    ownerName: l.owner_name,
    score: Math.round(Number(l.score) || 0),
    tags: json(l.tags, []),
    createdAt: l.created_at,
    updatedAt: l.updated_at,
    followUpCount: l.follow_up_count,
    lastFollowUp: l.last_follow_up
  };
}

router.get('/', featureGate('crm'), (req, res) => {
  const { site } = siteScope(req);
  const { limit, offset, page } = paging(req, 20, 100);
  const params = [req.tenant.id];
  let where = 'l.tenant_id = ?';
  if (site) { where += ' AND l.site_id = ?'; params.push(site.id); }
  if (req.query.status && STATUS.includes(req.query.status)) { where += ' AND l.status = ?'; params.push(req.query.status); }
  if (req.query.source) { where += ' AND l.source = ?'; params.push(req.query.source); }
  if (req.query.ownerId) { where += ' AND l.owner_id = ?'; params.push(Number(req.query.ownerId)); }
  if (req.query.mine === '1') { where += ' AND l.owner_id = ?'; params.push(req.user.id); }
  const q = String(req.query.q || '').trim();
  if (q) { where += ' AND (l.name LIKE ? OR l.phone LIKE ? OR l.company LIKE ? OR l.requirement LIKE ?)'; params.push(`%${q}%`, `%${q}%`, `%${q}%`, `%${q}%`); }
  const total = get(`SELECT COUNT(*) c FROM leads l WHERE ${where}`, params).c;
  const rows = all(
    `SELECT l.*, s.name AS site_name, v.vid, u.name AS owner_name,
            (SELECT COUNT(*) FROM follow_ups f WHERE f.lead_id = l.id) AS follow_up_count,
            (SELECT content FROM follow_ups f WHERE f.lead_id = l.id ORDER BY f.id DESC LIMIT 1) AS last_follow_up
     FROM leads l JOIN sites s ON s.id = l.site_id LEFT JOIN visitors v ON v.id = l.visitor_id
     LEFT JOIN users u ON u.id = l.owner_id WHERE ${where}
     ORDER BY l.created_at DESC LIMIT ? OFFSET ?`,
    [...params, limit, offset]
  );
  const stats = { all: total };
  for (const st of STATUS) {
    const p = [...params.slice(0), st];
    stats[st] = get(`SELECT COUNT(*) c FROM leads l WHERE ${where} AND l.status = ?`, p).c;
  }
  res.json({ leads: rows.map(mapLead), total, page, limit, stats });
});

router.get('/export.csv', featureGate('leads_export'), (req, res) => {
  const { site } = siteScope(req);
  const params = [req.tenant.id];
  let where = 'l.tenant_id = ?';
  if (site) { where += ' AND l.site_id = ?'; params.push(site.id); }
  if (req.query.status && STATUS.includes(req.query.status)) { where += ' AND l.status = ?'; params.push(req.query.status); }
  const rows = all(
    `SELECT l.*, s.name AS site_name, u.name AS owner_name FROM leads l JOIN sites s ON s.id = l.site_id LEFT JOIN users u ON u.id = l.owner_id
     WHERE ${where} ORDER BY l.created_at DESC LIMIT 10000`, params
  );
  const statusText = { new: '新线索', following: '跟进中', won: '已成交', invalid: '无效' };
  const header = ['线索ID', '站点', '来源', '姓名', '手机号', '邮箱', '公司', '业务类型', '需求', '状态', '负责人', '意向分', '标签', '创建时间', '最近更新'];
  const lines = [header.join(',')];
  for (const l of rows) {
    lines.push([
      l.id, l.site_name, l.source, l.name || '', l.phone || '', l.email || '', l.company || '', l.business_type || '',
      l.requirement || '', statusText[l.status] || l.status, l.owner_name || '未分配', l.score,
      json(l.tags, []).join('/'), l.created_at, l.updated_at
    ].map((x) => `"${String(x == null ? '' : x).replace(/"/g, '""')}"`).join(','));
  }
  audit(req, 'lead.export', `${rows.length} rows`, '导出线索 Excel(CSV)');
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="leads_${new Date().toISOString().slice(0, 10)}.csv"`);
  res.send('\uFEFF' + lines.join('\r\n'));
});

router.get('/:id', featureGate('crm'), (req, res) => {
  const l = get(
    `SELECT l.*, s.name AS site_name, v.vid, v.province, v.city, v.intent_level, v.intent_score AS visitor_score, u.name AS owner_name
     FROM leads l JOIN sites s ON s.id = l.site_id LEFT JOIN visitors v ON v.id = l.visitor_id LEFT JOIN users u ON u.id = l.owner_id
     WHERE l.id = ? AND l.tenant_id = ?`,
    [Number(req.params.id), req.tenant.id]
  );
  if (!l) return res.status(404).json({ error: '线索不存在' });
  const followUps = all('SELECT f.*, u.name AS user_name FROM follow_ups f LEFT JOIN users u ON u.id = f.user_id WHERE f.lead_id = ? ORDER BY f.id DESC', [l.id]);
  const conversation = l.conversation_id ? get('SELECT id, subject, status, rating, created_at FROM conversations WHERE id = ?', [l.conversation_id]) : null;
  res.json({ lead: mapLead(l), followUps, conversation });
});

router.post('/', featureGate('crm'), requireRole('admin', 'operator', 'agent'), async (req, res) => {
  const { site } = siteScope(req, req.body.siteId);
  if (!site) return res.status(400).json({ error: '请选择站点' });
  const b = req.body || {};
  if (!b.name && !b.phone) return res.status(400).json({ error: '姓名或手机号至少填写一项' });
  if (b.phone && !/^1[3-9]\d{9}$/.test(String(b.phone))) return res.status(400).json({ error: '手机号格式不正确' });
  const id = run(
    `INSERT INTO leads (tenant_id, site_id, source, name, phone, email, company, business_type, requirement, status, owner_id, score, tags)
     VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)`,
    [req.tenant.id, site.id, b.source || 'manual', b.name || '', b.phone || '', b.email || '', b.company || '',
      b.business_type || '', b.requirement || '', STATUS.includes(b.status) ? b.status : 'new',
      b.ownerId ? Number(b.ownerId) : req.user.id, Number(b.score) || 30, JSON.stringify(b.tags || ['手动录入'])]
  ).lastInsertRowid;
  await notifyTenant(req.tenant.id, 'lead', '新增线索', `${b.name || b.phone} 由 ${req.user.name} 手动录入`, { leadId: id, siteId: site.id });
  audit(req, 'lead.create', `lead:${id}`, b.name || b.phone);
  res.json({ ok: true, id });
});

router.patch('/:id', featureGate('crm'), requireRole('admin', 'operator', 'agent'), (req, res) => {
  const l = get('SELECT * FROM leads WHERE id = ? AND tenant_id = ?', [Number(req.params.id), req.tenant.id]);
  if (!l) return res.status(404).json({ error: '线索不存在' });
  const b = req.body || {};
  if (req.user.role === 'agent' && l.owner_id && l.owner_id !== req.user.id) return res.status(403).json({ error: '仅线索负责人可更新' });
  const updates = [];
  const params = [];
  for (const key of ['name', 'phone', 'email', 'company', 'business_type', 'requirement']) {
    if (b[key] !== undefined) { updates.push(`${key} = ?`); params.push(String(b[key]).slice(0, 500)); }
  }
  if (b.status !== undefined) {
    if (!STATUS.includes(b.status)) return res.status(400).json({ error: '状态不合法' });
    updates.push('status = ?'); params.push(b.status);
  }
  if (b.ownerId !== undefined) { updates.push('owner_id = ?'); params.push(b.ownerId ? Number(b.ownerId) : null); }
  if (b.score !== undefined) { updates.push('score = ?'); params.push(Math.max(0, Math.min(100, Number(b.score)))); }
  if (Array.isArray(b.tags)) { updates.push('tags = ?'); params.push(JSON.stringify(b.tags)); }
  if (!updates.length) return res.status(400).json({ error: '没有可更新字段' });
  updates.push("updated_at = datetime('now')");
  params.push(l.id);
  run(`UPDATE leads SET ${updates.join(', ')} WHERE id = ?`, params);
  if (b.status) {
    run("INSERT INTO notifications (tenant_id, user_id, type, title, content, payload) VALUES (?,?,?,?,?,?)",
      [req.tenant.id, l.owner_id, 'lead', '线索状态更新', `线索 #${l.id} 状态更新为 ${b.status}`, JSON.stringify({ leadId: l.id })]);
  }
  audit(req, 'lead.update', `lead:${l.id}`, JSON.stringify(b).slice(0, 300));
  res.json({ ok: true });
});

router.post('/:id/followups', featureGate('crm'), requireRole('admin', 'operator', 'agent'), (req, res) => {
  const l = get('SELECT * FROM leads WHERE id = ? AND tenant_id = ?', [Number(req.params.id), req.tenant.id]);
  if (!l) return res.status(404).json({ error: '线索不存在' });
  const content = String(req.body.content || '').trim().slice(0, 1000);
  if (!content) return res.status(400).json({ error: '跟进内容不能为空' });
  run('INSERT INTO follow_ups (tenant_id, lead_id, user_id, content) VALUES (?,?,?,?)', [req.tenant.id, l.id, req.user.id, content]);
  run("UPDATE leads SET updated_at = datetime('now'), status = CASE WHEN status = 'new' THEN 'following' ELSE status END WHERE id = ?", [l.id]);
  res.json({ ok: true });
});

router.post('/:id/assign', featureGate('crm'), requireRole('admin', 'operator'), (req, res) => {
  const l = get('SELECT * FROM leads WHERE id = ? AND tenant_id = ?', [Number(req.params.id), req.tenant.id]);
  if (!l) return res.status(404).json({ error: '线索不存在' });
  const target = get('SELECT * FROM users WHERE id = ? AND tenant_id = ?', [Number(req.body.ownerId), req.tenant.id]);
  if (!target) return res.status(400).json({ error: '负责人不存在' });
  run("UPDATE leads SET owner_id = ?, updated_at = datetime('now') WHERE id = ?", [target.id, l.id]);
  run('INSERT INTO notifications (tenant_id, user_id, type, title, content, payload) VALUES (?,?,?,?,?,?)',
    [req.tenant.id, target.id, 'lead', '分配了新线索', `线索 #${l.id} ${l.name || l.phone || ''} 已分配给你`, JSON.stringify({ leadId: l.id })]);
  res.json({ ok: true });
});

router.delete('/:id', featureGate('crm'), requireRole('admin'), (req, res) => {
  const l = get('SELECT * FROM leads WHERE id = ? AND tenant_id = ?', [Number(req.params.id), req.tenant.id]);
  if (!l) return res.status(404).json({ error: '线索不存在' });
  run('DELETE FROM follow_ups WHERE lead_id = ?', [l.id]);
  run('DELETE FROM leads WHERE id = ?', [l.id]);
  audit(req, 'lead.delete', `lead:${l.id}`, '删除线索');
  res.json({ ok: true });
});

module.exports = router;
