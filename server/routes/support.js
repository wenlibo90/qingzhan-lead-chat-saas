'use strict';
const express = require('express');
const { all, get, run } = require('../db');
const { authRequired } = require('../auth');
const { audit } = require('../helpers');
const { notifyTenant } = require('../services/notify');
const { hit } = require('../services/ratelimit');

const router = express.Router();
router.use(authRequired);
const CATEGORIES = ['install', 'billing', 'feature', 'bug', 'other'];
const PRIORITIES = ['low', 'normal', 'high', 'urgent'];

function ticketOf(id, tenantId) {
  return get('SELECT * FROM support_tickets WHERE id = ? AND tenant_id = ?', [Number(id), tenantId]);
}

router.get('/tickets', (req, res) => {
  const status = String(req.query.status || '');
  const params = [req.tenant.id];
  let where = 'tenant_id = ?';
  if (status) { where += ' AND status = ?'; params.push(status); }
  const tickets = all(
    `SELECT t.*, (SELECT COUNT(*) FROM ticket_messages m WHERE m.ticket_id = t.id) messages
     FROM support_tickets t WHERE ${where} ORDER BY CASE t.status WHEN 'open' THEN 0 WHEN 'pending' THEN 1 ELSE 2 END, t.id DESC LIMIT 100`,
    params
  );
  const stats = {};
  for (const st of ['open', 'pending', 'resolved', 'closed']) stats[st] = get('SELECT COUNT(*) c FROM support_tickets WHERE tenant_id = ? AND status = ?', [req.tenant.id, st]).c;
  res.json({ tickets, stats });
});

router.post('/tickets', (req, res) => {
  const b = req.body || {};
  const subject = String(b.subject || '').trim().slice(0, 120);
  const content = String(b.content || '').trim().slice(0, 3000);
  if (!hit(`ticket:${req.tenant.id}:${req.user.id}`, 8, 3600000).ok) return res.status(429).json({ error: '工单提交过于频繁，请稍后再试' });
  if (!subject) return res.status(400).json({ error: '请填写问题标题' });
  if (!content) return res.status(400).json({ error: '请描述具体问题' });
  const category = CATEGORIES.includes(b.category) ? b.category : 'other';
  const priority = PRIORITIES.includes(b.priority) ? b.priority : 'normal';
  const id = run(
    'INSERT INTO support_tickets (tenant_id, user_id, subject, category, priority, status, last_message_at) VALUES (?,?,?,?,?,?,datetime(\'now\'))',
    [req.tenant.id, req.user.id, subject, category, priority, 'open']
  ).lastInsertRowid;
  run('INSERT INTO ticket_messages (ticket_id, sender_type, sender_id, sender_name, content) VALUES (?,?,?,?,?)', [id, 'tenant', req.user.id, req.user.name, content]);
  run('INSERT INTO platform_audit_logs (action, target, detail) VALUES (?,?,?)', ['ticket.create', `ticket:${id}`, `${req.tenant.name} / ${subject}`]);
  audit(req, 'ticket.create', `ticket:${id}`, subject);
  res.json({ ok: true, id });
});

router.get('/tickets/:id', (req, res) => {
  const ticket = ticketOf(req.params.id, req.tenant.id);
  if (!ticket) return res.status(404).json({ error: '工单不存在' });
  const messages = all('SELECT * FROM ticket_messages WHERE ticket_id = ? ORDER BY id', [ticket.id]);
  res.json({ ticket, messages });
});

router.post('/tickets/:id/messages', async (req, res) => {
  const ticket = ticketOf(req.params.id, req.tenant.id);
  if (!ticket) return res.status(404).json({ error: '工单不存在' });
  if (ticket.status === 'closed') return res.status(400).json({ error: '工单已关闭' });
  const content = String(req.body.content || '').trim().slice(0, 3000);
  if (!content) return res.status(400).json({ error: '请填写回复内容' });
  run('INSERT INTO ticket_messages (ticket_id, sender_type, sender_id, sender_name, content) VALUES (?,?,?,?,?)', [ticket.id, 'tenant', req.user.id, req.user.name, content]);
  run("UPDATE support_tickets SET status = CASE WHEN status = 'resolved' THEN 'open' ELSE 'open' END, last_message_at = datetime('now'), updated_at = datetime('now') WHERE id = ?", [ticket.id]);
  await notifyTenant(req.tenant.id, 'ticket', '工单有新回复', `${req.user.name} 回复了工单「${ticket.subject}」`, { ticketId: ticket.id });
  res.json({ ok: true });
});

router.patch('/tickets/:id', (req, res) => {
  const ticket = ticketOf(req.params.id, req.tenant.id);
  if (!ticket) return res.status(404).json({ error: '工单不存在' });
  const status = String(req.body.status || '');
  if (!['resolved', 'closed'].includes(status)) return res.status(400).json({ error: '只能关闭或标记已解决' });
  run("UPDATE support_tickets SET status = ?, updated_at = datetime('now') WHERE id = ?", [status, ticket.id]);
  audit(req, 'ticket.status', `ticket:${ticket.id}`, status);
  res.json({ ok: true });
});

module.exports = router;
