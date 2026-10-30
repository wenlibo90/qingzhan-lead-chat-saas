'use strict';
const express = require('express');
const { all, get, run, json } = require('../db');
const { authRequired } = require('../auth');
const { siteScope, paging } = require('../helpers');

const router = express.Router();
router.use(authRequired);

function mapConversation(c) {
  return {
    id: c.id,
    siteId: c.site_id,
    siteName: c.site_name,
    visitorId: c.visitor_id,
    visitorName: c.visitor_name || '访客',
    visitorPhone: c.visitor_phone,
    vid: c.vid,
    province: c.province,
    city: c.city,
    device: c.device,
    browser: c.browser,
    os: c.os,
    source: c.source,
    intentScore: c.intent_score,
    intentLevel: c.intent_level,
    pageviewCount: c.pageview_count,
    status: c.status,
    agentId: c.agent_id,
    agentName: c.agent_name,
    subject: c.subject,
    rating: c.rating,
    tags: json(c.tags, []),
    unreadAgent: c.unread_agent,
    lastMessageAt: c.last_message_at,
    createdAt: c.created_at,
    closedAt: c.closed_at,
    lastMessage: c.last_message,
    lastSender: c.last_sender,
    aiSummary: c.ai_summary,
    aiNeed: c.ai_need,
    aiSuggestion: c.ai_suggestion,
    aiIntent: c.ai_intent,
    firstResponseMs: c.first_response_ms
  };
}

router.get('/', (req, res) => {
  const { site } = siteScope(req);
  const { limit, offset, page } = paging(req, 20, 100);
  const status = String(req.query.status || 'all');
  const q = String(req.query.q || '').trim();
  const params = [req.tenant.id];
  let where = 'c.tenant_id = ?';
  if (site) { where += ' AND c.site_id = ?'; params.push(site.id); }
  if (status !== 'all' && ['open', 'pending', 'closed'].includes(status)) { where += ' AND c.status = ?'; params.push(status); }
  if (req.query.mine === '1') { where += ' AND c.agent_id = ?'; params.push(req.user.id); }
  if (req.query.agentId) { where += ' AND c.agent_id = ?'; params.push(Number(req.query.agentId)); }
  if (q) {
    where += ` AND (v.name LIKE ? OR v.phone LIKE ? OR c.subject LIKE ? OR c.id = ?)`;
    params.push(`%${q}%`, `%${q}%`, `%${q}%`, Number(q) || -1);
  }
  const total = get(
    `SELECT COUNT(*) c FROM conversations c JOIN visitors v ON v.id = c.visitor_id WHERE ${where}`,
    params
  ).c;
  const rows = all(
    `SELECT c.*, s.name AS site_name, v.name AS visitor_name, v.phone AS visitor_phone, v.vid, v.province, v.city,
            v.device, v.browser, v.os, v.source, v.intent_score, v.intent_level, v.pageview_count, u.name AS agent_name,
            (SELECT content FROM messages WHERE conversation_id = c.id ORDER BY id DESC LIMIT 1) AS last_message,
            (SELECT sender_type FROM messages WHERE conversation_id = c.id ORDER BY id DESC LIMIT 1) AS last_sender
     FROM conversations c
     JOIN sites s ON s.id = c.site_id
     JOIN visitors v ON v.id = c.visitor_id
     LEFT JOIN users u ON u.id = c.agent_id
     WHERE ${where}
     ORDER BY CASE c.status WHEN 'pending' THEN 0 WHEN 'open' THEN 1 ELSE 2 END, c.last_message_at DESC
     LIMIT ? OFFSET ?`,
    [...params, limit, offset]
  );
  const counts = {
    all: get('SELECT COUNT(*) c FROM conversations WHERE tenant_id = ?' + (site ? ' AND site_id = ?' : ''), site ? [req.tenant.id, site.id] : [req.tenant.id]).c,
    open: get("SELECT COUNT(*) c FROM conversations WHERE tenant_id = ? AND status = 'open'" + (site ? ' AND site_id = ?' : ''), site ? [req.tenant.id, site.id] : [req.tenant.id]).c,
    pending: get("SELECT COUNT(*) c FROM conversations WHERE tenant_id = ? AND status = 'pending'" + (site ? ' AND site_id = ?' : ''), site ? [req.tenant.id, site.id] : [req.tenant.id]).c,
    closed: get("SELECT COUNT(*) c FROM conversations WHERE tenant_id = ? AND status = 'closed'" + (site ? ' AND site_id = ?' : ''), site ? [req.tenant.id, site.id] : [req.tenant.id]).c
  };
  res.json({ conversations: rows.map(mapConversation), total, page, limit, counts });
});

function loadConv(req, id) {
  return get(
    `SELECT c.*, s.name AS site_name, s.tenant_id AS tid, v.name AS visitor_name, v.phone AS visitor_phone, v.vid,
            v.province, v.city, v.device, v.browser, v.os, v.source, v.intent_score, v.intent_level, v.pageview_count,
            v.tracking_consent, u.name AS agent_name
     FROM conversations c JOIN sites s ON s.id = c.site_id JOIN visitors v ON v.id = c.visitor_id
     LEFT JOIN users u ON u.id = c.agent_id WHERE c.id = ?`,
    [Number(id)]
  );
}

router.get('/:id', (req, res) => {
  const conv = loadConv(req, req.params.id);
  if (!conv || conv.tid !== req.tenant.id) return res.status(404).json({ error: '会话不存在' });
  const messages = all('SELECT * FROM messages WHERE conversation_id = ? ORDER BY id', [conv.id]).map((m) => ({
    id: m.id,
    senderType: m.sender_type,
    senderId: m.sender_id,
    senderName: m.sender_name,
    type: m.type,
    content: m.content,
    fileUrl: m.file_url,
    fileName: m.file_name,
    fileSize: m.file_size,
    isPrivate: !!m.is_private,
    meta: json(m.meta, {}),
    createdAt: m.created_at
  }));
  const visitor = get('SELECT * FROM visitors WHERE id = ?', [conv.visitor_id]);
  const recentPages = all('SELECT url, title, dwell_ms, entered_at FROM pageviews WHERE visitor_id = ? ORDER BY id DESC LIMIT 8', [visitor.id]);
  const agents = all('SELECT id, name, avatar, role FROM users WHERE tenant_id = ? AND status = ? ORDER BY id', [req.tenant.id, 'active']);
  const leads = all('SELECT * FROM leads WHERE conversation_id = ?', [conv.id]);
  res.json({
    conversation: mapConversation(conv),
    messages,
    visitor: {
      id: visitor.id, vid: visitor.vid, name: visitor.name, phone: visitor.phone, email: visitor.email,
      company: visitor.company, businessType: visitor.business_type, province: visitor.province, city: visitor.city,
      device: visitor.device, browser: visitor.browser, os: visitor.os, ip: visitor.ip,
      source: visitor.source, keyword: visitor.keyword, utmSource: visitor.utm_source, utmMedium: visitor.utm_medium,
      utmCampaign: visitor.utm_campaign, referrer: visitor.referrer, landingPage: visitor.landing_page,
      pageviewCount: visitor.pageview_count, visitCount: visitor.visit_count, totalDwellMs: visitor.total_dwell_ms,
      intentScore: visitor.intent_score, intentLevel: visitor.intent_level, tags: json(visitor.tags, []),
      firstSeen: visitor.first_seen, lastSeen: visitor.last_seen, trackingConsent: !!visitor.tracking_consent
    },
    recentPages,
    agents,
    leads,
    ratings: conv.rating ? [{ score: conv.rating, comment: conv.rating_comment }] : []
  });
});

router.patch('/:id', (req, res) => {
  const conv = loadConv(req, req.params.id);
  if (!conv || conv.tid !== req.tenant.id) return res.status(404).json({ error: '会话不存在' });
  const updates = [];
  const params = [];
  const body = req.body || {};
  if (['open', 'pending', 'closed'].includes(body.status)) {
    updates.push('status = ?');
    params.push(body.status);
    if (body.status === 'closed') updates.push("closed_at = datetime('now')");
  }
  if (Array.isArray(body.tags)) { updates.push('tags = ?'); params.push(JSON.stringify(body.tags.slice(0, 10))); }
  if (body.agentId !== undefined) {
    if (req.user.role === 'agent' && Number(body.agentId) !== req.user.id) return res.status(403).json({ error: '客服只能认领会话给自己' });
    updates.push('agent_id = ?');
    params.push(body.agentId ? Number(body.agentId) : null);
  }
  if (!updates.length) return res.status(400).json({ error: '没有可更新的字段' });
  params.push(conv.id);
  run(`UPDATE conversations SET ${updates.join(', ')} WHERE id = ?`, params);
  res.json({ ok: true, conversation: mapConversation(loadConv(req, conv.id)) });
});

router.post('/:id/note', (req, res) => {
  const conv = loadConv(req, req.params.id);
  if (!conv || conv.tid !== req.tenant.id) return res.status(404).json({ error: '会话不存在' });
  const content = String(req.body.content || '').trim().slice(0, 2000);
  if (!content) return res.status(400).json({ error: '备注内容不能为空' });
  const id = run(
    'INSERT INTO messages (tenant_id, conversation_id, sender_type, sender_id, sender_name, type, content, is_private, meta) VALUES (?,?,?,?,?,?,?,1,?)',
    [req.tenant.id, conv.id, 'agent', req.user.id, `${req.user.name}（备注）`, 'note', content, JSON.stringify({ internal: true })]
  ).lastInsertRowid;
  res.json({ ok: true, id });
});

router.get('/:id/assignable-agents', (req, res) => {
  const users = all('SELECT id, name, avatar, role FROM users WHERE tenant_id = ? AND status = ? AND role IN (?, ?, ?) ORDER BY id', [req.tenant.id, 'active', 'agent', 'operator', 'admin']);
  res.json({ agents: users });
});

module.exports = router;
