'use strict';
const express = require('express');
const crypto = require('node:crypto');
const { all, get, run, json, tx } = require('../db');
const { authRequired, requireRole, featureGate } = require('../auth');
const { siteScope, audit, sitePublic, publicBase } = require('../helpers');
const { hasFeature, limitOf, featureLabel, FEATURES } = require('../plans');
const { upload, publicUrl } = require('../upload');
const { loaderToken } = require('../services/provision');

const router = express.Router();
router.use(authRequired);

function baseUrl(req) { return publicBase(req); }

function countLimitCheck(req, res, kind) {
  const limit = limitOf(req.tenant.plan, kind);
  if (limit === -1) return null;
  const current = kind === 'agents'
    ? get('SELECT COUNT(*) c FROM users WHERE tenant_id = ?', [req.tenant.id]).c
    : get('SELECT COUNT(*) c FROM sites WHERE tenant_id = ? AND is_sandbox = 0', [req.tenant.id]).c;
  if (current >= limit) {
    return res.status(403).json({ error: `${req.tenant.plan === 'free' ? '免费版' : '当前套餐'}最多支持 ${limit} 个${kind === 'agents' ? '子账号' : '站点'}，请升级套餐`, code: 'PLAN_LIMIT' });
  }
  return null;
}

function sanitizeConfig(input, plan) {
  const c = { ...(input || {}) };
  const out = {
    primaryColor: /^#[0-9a-fA-F]{6}$/.test(c.primaryColor || '') ? c.primaryColor : '#2563eb',
    position: ['right', 'left'].includes(c.position) ? c.position : 'right',
    offsetBottom: Math.min(120, Math.max(0, Number(c.offsetBottom ?? 24))),
    offsetSide: Math.min(120, Math.max(0, Number(c.offsetSide ?? 24))),
    buttonSize: Math.min(80, Math.max(40, Number(c.buttonSize ?? 58))),
    icon: ['chat', 'headset', 'message', 'spark'].includes(c.icon) ? c.icon : 'headset',
    animation: ['breath', 'bounce', 'none'].includes(c.animation) ? c.animation : 'breath',
    mobile: {
      size: Math.min(80, Math.max(40, Number((c.mobile || {}).size ?? 52))),
      offsetBottom: Math.min(120, Math.max(0, Number((c.mobile || {}).offsetBottom ?? 18))),
      offsetSide: Math.min(120, Math.max(0, Number((c.mobile || {}).offsetSide ?? 14)))
    },
    title: String(c.title || '在线客服').slice(0, 30),
    agentName: String(c.agentName || '客服').slice(0, 20),
    welcome: String(c.welcome || '您好，请问有什么可以帮您？').slice(0, 300),
    subtitle: String(c.subtitle || '通常 1 分钟内回复').slice(0, 40),
    offlineText: String(c.offlineText || '当前客服不在线，您可以留言。').slice(0, 300),
    offlineEnabled: !!c.offlineEnabled,
    prechatEnabled: hasFeature(plan, 'forms') ? !!c.prechatEnabled : false,
    prechatFormId: hasFeature(plan, 'forms') ? (c.prechatFormId ? Number(c.prechatFormId) : null) : null,
    offlineFormId: c.offlineFormId ? Number(c.offlineFormId) : null,
    faqEnabled: hasFeature(plan, 'knowledge') ? c.faqEnabled !== false : false,
    recordingEnabled: hasFeature(plan, 'recording') ? !!c.recordingEnabled : false,
    ratingEnabled: hasFeature(plan, 'rating') ? c.ratingEnabled !== false : false,
    showBranding: hasFeature(plan, 'whitelabel') ? false : c.showBranding !== false,
    businessHours: /^\d{2}:\d{2}-\d{2}:\d{2}$/.test(c.businessHours || '') ? c.businessHours : '09:00-21:00',
    aiEnabled: hasFeature(plan, 'ai_bot') ? !!c.aiEnabled : false,
    aiName: String(c.aiName || 'AI 助手').slice(0, 20),
    theme: ['light', 'dark', 'auto'].includes(c.theme) ? c.theme : 'light',
    locale: ['zh-CN', 'zh-TW', 'en', 'ja', 'ko'].includes(c.locale) ? c.locale : 'zh-CN',
    quickReplies: Array.isArray(c.quickReplies) ? c.quickReplies.slice(0, 6).map((x) => String(x).slice(0, 30)) : ['想了解价格', '怎么接入', '预约演示'],
    compliance: {
      enabled: false,
      required: false,
      text: '',
      policyUrl: ''
    },
    languages: hasFeature(plan, 'translation') ? (Array.isArray(c.languages) ? c.languages.slice(0, 5) : ['zh-CN', 'en-US']) : ['zh-CN']
  };
  return out;
}

router.get('/sites', (req, res) => {
  const sites = all('SELECT * FROM sites WHERE tenant_id = ? ORDER BY id', [req.tenant.id]);
  const data = sites.map((s) => {
    const pub = sitePublic(s, req.tenant.plan, baseUrl(req));
    const stats = {
      visitors: get('SELECT COUNT(*) c FROM visitors WHERE site_id = ?', [s.id]).c,
      conversations: get('SELECT COUNT(*) c FROM conversations WHERE site_id = ?', [s.id]).c,
      leads: get('SELECT COUNT(*) c FROM leads WHERE site_id = ?', [s.id]).c,
      blockedEvents: get("SELECT COUNT(*) c FROM events WHERE site_id = ? AND type = 'adblock'", [s.id]).c
    };
    return {
      ...pub,
      embed_code: `<script async src="${baseUrl(req)}/qz.js?${s.loader_token}"></script>`,
      stats,
      created_at: s.created_at
    };
  });
  res.json({ sites: data, limits: { sites: limitOf(req.tenant.plan, 'sites'), agents: limitOf(req.tenant.plan, 'agents') } });
});

router.post('/sites', requireRole('admin', 'operator'), (req, res) => {
  const limited = countLimitCheck(req, res, 'sites');
  if (limited) return limited;
  const name = String(req.body.name || '').trim().slice(0, 50);
  const domain = String(req.body.domain || '').trim().slice(0, 120);
  if (!name) return res.status(400).json({ error: '请填写站点名称' });
  if (!domain) return res.status(400).json({ error: '请填写绑定域名' });
  const key = `qz_${crypto.randomBytes(7).toString('hex')}`;
  const id = run('INSERT INTO sites (tenant_id, name, domain, site_key, loader_token, widget_config) VALUES (?,?,?,?,?,?)',
    [req.tenant.id, name, domain, key, loaderToken(), JSON.stringify(sanitizeConfig({}, req.tenant.plan))]).lastInsertRowid;
  audit(req, 'site.create', `site:${id}`, name);
  const site = get('SELECT * FROM sites WHERE id = ?', [id]);
  res.json({ ok: true, site: sitePublic(site, req.tenant.plan, baseUrl(req)) });
});

router.patch('/sites/:id', requireRole('admin', 'operator'), (req, res) => {
  const site = get('SELECT * FROM sites WHERE id = ? AND tenant_id = ?', [Number(req.params.id), req.tenant.id]);
  if (!site) return res.status(404).json({ error: '站点不存在' });
  const body = req.body || {};
  if (body.name !== undefined) run('UPDATE sites SET name = ? WHERE id = ?', [String(body.name).slice(0, 50), site.id]);
  if (body.domain !== undefined) run('UPDATE sites SET domain = ? WHERE id = ?', [String(body.domain).slice(0, 120), site.id]);
  if (body.widget_config !== undefined) {
    const next = sanitizeConfig(body.widget_config, req.tenant.plan);
    run('UPDATE sites SET widget_config = ? WHERE id = ?', [JSON.stringify(next), site.id]);
  }
  if (body.tracking_enabled !== undefined) run('UPDATE sites SET tracking_enabled = ? WHERE id = ?', [body.tracking_enabled ? 1 : 0, site.id]);
  if (body.compliance_enabled !== undefined) run('UPDATE sites SET compliance_enabled = ? WHERE id = ?', [body.compliance_enabled ? 1 : 0, site.id]);
  audit(req, 'site.update', `site:${site.id}`, Object.keys(body).join(','));
  const fresh = get('SELECT * FROM sites WHERE id = ?', [site.id]);
  res.json({ ok: true, site: sitePublic(fresh, req.tenant.plan, baseUrl(req)) });
});

router.delete('/sites/:id', requireRole('admin'), (req, res) => {
  const site = get('SELECT * FROM sites WHERE id = ? AND tenant_id = ?', [Number(req.params.id), req.tenant.id]);
  if (!site) return res.status(404).json({ error: '站点不存在' });
  tx(() => {
    run('DELETE FROM messages WHERE conversation_id IN (SELECT id FROM conversations WHERE site_id = ? AND tenant_id = ?)', [site.id, req.tenant.id]);
    run('DELETE FROM follow_ups WHERE lead_id IN (SELECT id FROM leads WHERE site_id = ? AND tenant_id = ?)', [site.id, req.tenant.id]);
    run('DELETE FROM visitor_tags WHERE visitor_id IN (SELECT id FROM visitors WHERE site_id = ? AND tenant_id = ?)', [site.id, req.tenant.id]);
    run('DELETE FROM rule_logs WHERE visitor_id IN (SELECT id FROM visitors WHERE site_id = ? AND tenant_id = ?)', [site.id, req.tenant.id]);
    run('DELETE FROM form_submissions WHERE site_id = ? AND tenant_id = ?', [site.id, req.tenant.id]);
    run('DELETE FROM recordings WHERE site_id = ? AND tenant_id = ?', [site.id, req.tenant.id]);
    run('DELETE FROM leads WHERE site_id = ? AND tenant_id = ?', [site.id, req.tenant.id]);
    run('DELETE FROM conversations WHERE site_id = ? AND tenant_id = ?', [site.id, req.tenant.id]);
    run('DELETE FROM visitors WHERE site_id = ? AND tenant_id = ?', [site.id, req.tenant.id]);
    for (const table of ['visitor_sessions', 'pageviews', 'events', 'forms', 'faq_categories', 'faqs', 'knowledge_files', 'rules', 'blacklist', 'announcements']) {
      run(`DELETE FROM ${table} WHERE site_id = ? AND tenant_id = ?`, [site.id, req.tenant.id]);
    }
    run('DELETE FROM sites WHERE id = ? AND tenant_id = ?', [site.id, req.tenant.id]);
  });
  audit(req, 'site.delete', `site:${site.id}`, `${site.name} / ${site.domain || ''}`);
  res.json({ ok: true });
});

router.post('/sites/:id/rotate-key', requireRole('admin'), (req, res) => {
  const site = get('SELECT * FROM sites WHERE id = ? AND tenant_id = ?', [Number(req.params.id), req.tenant.id]);
  if (!site) return res.status(404).json({ error: '站点不存在' });
  const key = `qz_${crypto.randomBytes(7).toString('hex')}`;
  const token = loaderToken();
  run('UPDATE sites SET site_key = ?, loader_token = ? WHERE id = ?', [key, token, site.id]);
  audit(req, 'site.rotate_key', `site:${site.id}`, key);
  res.json({ ok: true, site_key: key, loader_token: token, embed_code: `<script async src="${baseUrl(req)}/qz.js?${token}"></script>` });
});

router.get('/sites/:id/embed', (req, res) => {
  const site = get('SELECT * FROM sites WHERE id = ? AND tenant_id = ?', [Number(req.params.id), req.tenant.id]);
  if (!site) return res.status(404).json({ error: '站点不存在' });
  res.json({
    site_key: site.site_key,
    embed_code: `<script async src="${baseUrl(req)}/qz.js?${site.loader_token}"></script>`,
    npm: `import '${baseUrl(req)}/qz.js?${site.loader_token}'`,
    url: `${baseUrl(req)}/qz.js?${site.loader_token}`
  });
});

// ---------- forms ----------
router.get('/forms', featureGate('forms'), (req, res) => {
  const { site } = siteScope(req);
  const rows = all('SELECT * FROM forms WHERE tenant_id = ?' + (site ? ' AND site_id = ?' : '') + ' ORDER BY id DESC', site ? [req.tenant.id, site.id] : [req.tenant.id]);
  res.json({ forms: rows.map((f) => ({ ...f, fields: json(f.fields, []) })) });
});

function cleanFields(fields) {
  if (!Array.isArray(fields)) return [];
  return fields.slice(0, 12).map((f, i) => ({
    key: String(f.key || `field_${i}`).replace(/[^a-zA-Z0-9_]/g, '').slice(0, 30) || `field_${i}`,
    label: String(f.label || '字段').slice(0, 30),
    type: ['text', 'phone', 'email', 'textarea', 'select', 'radio', 'checkbox'].includes(f.type) ? f.type : 'text',
    required: !!f.required,
    placeholder: String(f.placeholder || '').slice(0, 80),
    options: Array.isArray(f.options) ? f.options.slice(0, 20).map((o) => String(o).slice(0, 40)) : []
  }));
}

router.post('/forms', requireRole('admin', 'operator'), featureGate('forms'), (req, res) => {
  const { site } = siteScope(req, req.body.siteId);
  if (!site) return res.status(400).json({ error: '请先创建站点' });
  const b = req.body;
  if (!b.name) return res.status(400).json({ error: '请填写表单名称' });
  const id = run(
    'INSERT INTO forms (tenant_id, site_id, name, type, title, subtitle, button_text, fields, enabled) VALUES (?,?,?,?,?,?,?,?,?)',
    [req.tenant.id, site.id, String(b.name).slice(0, 40), ['prechat', 'trigger', 'lead', 'offline'].includes(b.type) ? b.type : 'lead',
      String(b.title || b.name).slice(0, 60), String(b.subtitle || '').slice(0, 160), String(b.button_text || '提交').slice(0, 20),
      JSON.stringify(cleanFields(b.fields)), b.enabled === false ? 0 : 1]
  ).lastInsertRowid;
  audit(req, 'form.create', `form:${id}`, b.name);
  res.json({ ok: true, id });
});

router.patch('/forms/:id', requireRole('admin', 'operator'), featureGate('forms'), (req, res) => {
  const f = get('SELECT * FROM forms WHERE id = ? AND tenant_id = ?', [Number(req.params.id), req.tenant.id]);
  if (!f) return res.status(404).json({ error: '表单不存在' });
  const b = req.body;
  const updates = [];
  const params = [];
  for (const key of ['name', 'title', 'subtitle', 'button_text']) {
    if (b[key] !== undefined) { updates.push(`${key} = ?`); params.push(String(b[key]).slice(0, 160)); }
  }
  if (b.fields !== undefined) { updates.push('fields = ?'); params.push(JSON.stringify(cleanFields(b.fields))); }
  if (b.enabled !== undefined) { updates.push('enabled = ?'); params.push(b.enabled ? 1 : 0); }
  if (!updates.length) return res.status(400).json({ error: '没有可更新字段' });
  params.push(f.id);
  run(`UPDATE forms SET ${updates.join(', ')} WHERE id = ?`, params);
  res.json({ ok: true });
});

router.delete('/forms/:id', requireRole('admin', 'operator'), featureGate('forms'), (req, res) => {
  const f = get('SELECT * FROM forms WHERE id = ? AND tenant_id = ?', [Number(req.params.id), req.tenant.id]);
  if (!f) return res.status(404).json({ error: '表单不存在' });
  run('UPDATE forms SET enabled = 0 WHERE id = ?', [f.id]);
  res.json({ ok: true });
});

// ---------- rules ----------
function ruleGate(type) {
  if (type === 'trigger') return featureGate('triggers');
  if (type === 'keyword') return featureGate('keyword_reply');
  return featureGate('automation');
}

router.get('/rules', (req, res) => {
  const { site } = siteScope(req);
  const rows = all('SELECT * FROM rules WHERE tenant_id = ?' + (site ? ' AND site_id = ?' : '') + ' ORDER BY type, priority, id', site ? [req.tenant.id, site.id] : [req.tenant.id]);
  res.json({
    rules: rows.map((r) => ({ ...r, conditions: json(r.conditions, {}), actions: json(r.actions, {}), enabled: !!r.enabled })),
    licensed: {
      trigger: hasFeature(req.tenant.plan, 'triggers'),
      keyword: hasFeature(req.tenant.plan, 'keyword_reply'),
      sensitive: hasFeature(req.tenant.plan, 'automation')
    }
  });
});

router.post('/rules', requireRole('admin', 'operator'), (req, res, next) => {
  const type = req.body.type || 'trigger';
  ruleGate(type)(req, res, next);
}, (req, res) => {
  const { site } = siteScope(req, req.body.siteId);
  if (!site) return res.status(400).json({ error: '请先创建站点' });
  const b = req.body;
  if (!b.name) return res.status(400).json({ error: '请填写规则名称' });
  const type = ['trigger', 'keyword', 'sensitive', 'auto_reply'].includes(b.type) ? b.type : 'trigger';
  const id = run(
    'INSERT INTO rules (tenant_id, site_id, name, type, conditions, actions, priority, enabled) VALUES (?,?,?,?,?,?,?,?)',
    [req.tenant.id, site.id, String(b.name).slice(0, 60), type, JSON.stringify(b.conditions || {}), JSON.stringify(b.actions || {}), Number(b.priority) || 10, b.enabled === false ? 0 : 1]
  ).lastInsertRowid;
  audit(req, 'rule.create', `rule:${id}`, b.name);
  res.json({ ok: true, id });
});

router.patch('/rules/:id', requireRole('admin', 'operator'), (req, res, next) => {
  const r = get('SELECT * FROM rules WHERE id = ? AND tenant_id = ?', [Number(req.params.id), req.tenant.id]);
  if (!r) return res.status(404).json({ error: '规则不存在' });
  ruleGate(r.type)(req, res, next);
}, (req, res) => {
  const r = get('SELECT * FROM rules WHERE id = ? AND tenant_id = ?', [Number(req.params.id), req.tenant.id]);
  const b = req.body;
  const updates = [];
  const params = [];
  if (b.name !== undefined) { updates.push('name = ?'); params.push(String(b.name).slice(0, 60)); }
  if (b.conditions !== undefined) { updates.push('conditions = ?'); params.push(JSON.stringify(b.conditions)); }
  if (b.actions !== undefined) { updates.push('actions = ?'); params.push(JSON.stringify(b.actions)); }
  if (b.priority !== undefined) { updates.push('priority = ?'); params.push(Number(b.priority) || 10); }
  if (b.enabled !== undefined) { updates.push('enabled = ?'); params.push(b.enabled ? 1 : 0); }
  if (!updates.length) return res.status(400).json({ error: '没有可更新字段' });
  params.push(r.id);
  run(`UPDATE rules SET ${updates.join(', ')} WHERE id = ?`, params);
  res.json({ ok: true });
});

router.delete('/rules/:id', requireRole('admin', 'operator'), (req, res) => {
  const r = get('SELECT * FROM rules WHERE id = ? AND tenant_id = ?', [Number(req.params.id), req.tenant.id]);
  if (!r) return res.status(404).json({ error: '规则不存在' });
  run('DELETE FROM rule_logs WHERE rule_id = ?', [r.id]);
  run('DELETE FROM rules WHERE id = ?', [r.id]);
  audit(req, 'rule.delete', `rule:${r.id}`, r.name);
  res.json({ ok: true });
});

// ---------- knowledge ----------
router.get('/faqs', (req, res) => {
  const { site } = siteScope(req);
  if (!site) return res.json({ categories: [], faqs: [], files: [] });
  const categories = all('SELECT * FROM faq_categories WHERE site_id = ? ORDER BY sort, id', [site.id]);
  const faqs = all('SELECT * FROM faqs WHERE site_id = ? ORDER BY sort, id', [site.id]);
  const files = all('SELECT * FROM knowledge_files WHERE site_id = ? ORDER BY id DESC', [site.id]);
  res.json({ categories, faqs, files, licensed: hasFeature(req.tenant.plan, 'knowledge') });
});

router.post('/faq-categories', requireRole('admin', 'operator'), featureGate('knowledge'), (req, res) => {
  const { site } = siteScope(req);
  if (!site) return res.status(400).json({ error: '请先创建站点' });
  const id = run('INSERT INTO faq_categories (tenant_id, site_id, name, sort) VALUES (?,?,?,?)',
    [req.tenant.id, site.id, String(req.body.name || '未命名分类').slice(0, 30), Number(req.body.sort) || 0]).lastInsertRowid;
  res.json({ ok: true, id });
});

router.patch('/faq-categories/:id', requireRole('admin', 'operator'), featureGate('knowledge'), (req, res) => {
  const c = get('SELECT * FROM faq_categories WHERE id = ? AND tenant_id = ?', [Number(req.params.id), req.tenant.id]);
  if (!c) return res.status(404).json({ error: '分类不存在' });
  run('UPDATE faq_categories SET name = ?, sort = ? WHERE id = ?', [String(req.body.name || c.name).slice(0, 30), Number(req.body.sort ?? c.sort), c.id]);
  res.json({ ok: true });
});

router.delete('/faq-categories/:id', requireRole('admin', 'operator'), featureGate('knowledge'), (req, res) => {
  const c = get('SELECT * FROM faq_categories WHERE id = ? AND tenant_id = ?', [Number(req.params.id), req.tenant.id]);
  if (!c) return res.status(404).json({ error: '分类不存在' });
  run('UPDATE faqs SET category_id = NULL WHERE category_id = ?', [c.id]);
  run('DELETE FROM faq_categories WHERE id = ?', [c.id]);
  res.json({ ok: true });
});

router.post('/faqs', requireRole('admin', 'operator'), featureGate('knowledge'), (req, res) => {
  const { site } = siteScope(req, req.body.siteId);
  if (!site) return res.status(400).json({ error: '请先创建站点' });
  const b = req.body;
  if (!b.question || !b.answer) return res.status(400).json({ error: '问题和答案不能为空' });
  const id = run('INSERT INTO faqs (tenant_id, site_id, category_id, question, answer, sort, enabled) VALUES (?,?,?,?,?,?,?)',
    [req.tenant.id, site.id, b.categoryId ? Number(b.categoryId) : null, String(b.question).slice(0, 200), String(b.answer).slice(0, 3000), Number(b.sort) || 0, b.enabled === false ? 0 : 1]).lastInsertRowid;
  res.json({ ok: true, id });
});

router.patch('/faqs/:id', requireRole('admin', 'operator'), featureGate('knowledge'), (req, res) => {
  const f = get('SELECT * FROM faqs WHERE id = ? AND tenant_id = ?', [Number(req.params.id), req.tenant.id]);
  if (!f) return res.status(404).json({ error: 'FAQ 不存在' });
  const b = req.body;
  run('UPDATE faqs SET question = ?, answer = ?, category_id = ?, sort = ?, enabled = ? WHERE id = ?', [
    String(b.question ?? f.question).slice(0, 200), String(b.answer ?? f.answer).slice(0, 3000),
    b.categoryId !== undefined ? (b.categoryId ? Number(b.categoryId) : null) : f.category_id,
    Number(b.sort ?? f.sort), b.enabled === undefined ? f.enabled : (b.enabled ? 1 : 0), f.id
  ]);
  res.json({ ok: true });
});

router.delete('/faqs/:id', requireRole('admin', 'operator'), featureGate('knowledge'), (req, res) => {
  const f = get('SELECT * FROM faqs WHERE id = ? AND tenant_id = ?', [Number(req.params.id), req.tenant.id]);
  if (!f) return res.status(404).json({ error: 'FAQ 不存在' });
  run('DELETE FROM faqs WHERE id = ?', [f.id]);
  res.json({ ok: true });
});

router.post('/knowledge-files', requireRole('admin', 'operator'), featureGate('knowledge'), (req, res) => {
  const { site } = siteScope(req);
  if (!site) return res.status(400).json({ error: '请先创建站点' });
  upload.single('file')(req, res, (err) => {
    if (err) return res.status(400).json({ error: err.message || '上传失败' });
    if (!req.file) return res.status(400).json({ error: '未收到文件' });
    const id = run('INSERT INTO knowledge_files (tenant_id, site_id, category_id, name, file_url, size, type) VALUES (?,?,?,?,?,?,?)',
      [req.tenant.id, site.id, req.body.categoryId ? Number(req.body.categoryId) : null, String(req.body.name || req.file.originalname).slice(0, 100), publicUrl(req.file), req.file.size, req.file.mimetype]).lastInsertRowid;
    res.json({ ok: true, id, url: publicUrl(req.file) });
  });
});

router.delete('/knowledge-files/:id', requireRole('admin', 'operator'), featureGate('knowledge'), (req, res) => {
  const f = get('SELECT * FROM knowledge_files WHERE id = ? AND tenant_id = ?', [Number(req.params.id), req.tenant.id]);
  if (!f) return res.status(404).json({ error: '文件不存在' });
  run('DELETE FROM knowledge_files WHERE id = ?', [f.id]);
  res.json({ ok: true });
});

// ---------- announcement ----------
router.get('/announcement', (req, res) => {
  const { site } = siteScope(req);
  if (!site) return res.json({ announcement: null });
  const a = get('SELECT * FROM announcements WHERE site_id = ? ORDER BY id DESC LIMIT 1', [site.id]);
  res.json({ announcement: a || null, licensed: hasFeature(req.tenant.plan, 'announcement') });
});

router.put('/announcement', requireRole('admin', 'operator'), featureGate('announcement'), (req, res) => {
  const { site } = siteScope(req);
  if (!site) return res.status(400).json({ error: '请先创建站点' });
  const b = req.body || {};
  const existing = get('SELECT * FROM announcements WHERE site_id = ? ORDER BY id DESC LIMIT 1', [site.id]);
  if (existing) {
    run('UPDATE announcements SET content = ?, position = ?, link = ?, link_text = ?, bg_color = ?, enabled = ?, updated_at = datetime(\'now\') WHERE id = ?', [
      String(b.content || existing.content).slice(0, 200), ['top', 'side'].includes(b.position) ? b.position : existing.position,
      String(b.link || '').slice(0, 300), String(b.link_text || '').slice(0, 20), /^#[0-9a-fA-F]{6}$/.test(b.bg_color || '') ? b.bg_color : existing.bg_color,
      b.enabled === undefined ? existing.enabled : (b.enabled ? 1 : 0), existing.id
    ]);
    return res.json({ ok: true, id: existing.id });
  }
  const id = run('INSERT INTO announcements (tenant_id, site_id, content, position, link, link_text, bg_color, enabled) VALUES (?,?,?,?,?,?,?,?)',
    [req.tenant.id, site.id, String(b.content || '活动公告').slice(0, 200), ['top', 'side'].includes(b.position) ? b.position : 'top',
      String(b.link || '').slice(0, 300), String(b.link_text || '').slice(0, 20), /^#[0-9a-fA-F]{6}$/.test(b.bg_color || '') ? b.bg_color : '#2563eb', b.enabled === false ? 0 : 1]).lastInsertRowid;
  res.json({ ok: true, id });
});

// ---------- blacklist ----------
router.get('/blacklist', featureGate('blacklist'), (req, res) => {
  const { site } = siteScope(req);
  const rows = all('SELECT * FROM blacklist WHERE tenant_id = ?' + (site ? ' AND (site_id = ? OR site_id IS NULL)' : '') + ' ORDER BY id DESC', site ? [req.tenant.id, site.id] : [req.tenant.id]);
  res.json({ entries: rows });
});

router.post('/blacklist', requireRole('admin', 'operator'), featureGate('blacklist'), (req, res) => {
  const { site } = siteScope(req);
  const b = req.body || {};
  if (!b.value) return res.status(400).json({ error: '请填写 IP 或访客 ID' });
  if (!['ip', 'visitor'].includes(b.type)) return res.status(400).json({ error: '类型不合法' });
  const id = run('INSERT INTO blacklist (tenant_id, site_id, type, value, reason) VALUES (?,?,?,?,?)',
    [req.tenant.id, site ? site.id : null, b.type, String(b.value).slice(0, 100), String(b.reason || '').slice(0, 200)]).lastInsertRowid;
  if (b.type === 'visitor') run('UPDATE visitors SET blocked = 1 WHERE vid = ? AND tenant_id = ?', [b.value, req.tenant.id]);
  audit(req, 'blacklist.add', b.type, b.value);
  res.json({ ok: true, id });
});

router.delete('/blacklist/:id', requireRole('admin', 'operator'), featureGate('blacklist'), (req, res) => {
  const b = get('SELECT * FROM blacklist WHERE id = ? AND tenant_id = ?', [Number(req.params.id), req.tenant.id]);
  if (!b) return res.status(404).json({ error: '记录不存在' });
  run('DELETE FROM blacklist WHERE id = ?', [b.id]);
  if (b.type === 'visitor') run('UPDATE visitors SET blocked = 0 WHERE vid = ? AND tenant_id = ?', [b.value, req.tenant.id]);
  res.json({ ok: true });
});

// ---------- canned replies ----------
router.get('/canned-replies', (req, res) => {
  const rows = all('SELECT * FROM canned_replies WHERE tenant_id = ? ORDER BY id', [req.tenant.id]);
  res.json({ replies: rows });
});

router.post('/canned-replies', requireRole('admin', 'operator'), (req, res) => {
  const { title, content, category } = req.body || {};
  if (!title || !content) return res.status(400).json({ error: '标题和内容不能为空' });
  const id = run('INSERT INTO canned_replies (tenant_id, title, content, category) VALUES (?,?,?,?)',
    [req.tenant.id, String(title).slice(0, 40), String(content).slice(0, 2000), String(category || '通用').slice(0, 20)]).lastInsertRowid;
  res.json({ ok: true, id });
});

router.patch('/canned-replies/:id', requireRole('admin', 'operator'), (req, res) => {
  const c = get('SELECT * FROM canned_replies WHERE id = ? AND tenant_id = ?', [Number(req.params.id), req.tenant.id]);
  if (!c) return res.status(404).json({ error: '话术不存在' });
  run('UPDATE canned_replies SET title = ?, content = ?, category = ? WHERE id = ?', [
    String(req.body.title ?? c.title).slice(0, 40), String(req.body.content ?? c.content).slice(0, 2000), String(req.body.category ?? c.category).slice(0, 20), c.id
  ]);
  res.json({ ok: true });
});

router.delete('/canned-replies/:id', requireRole('admin', 'operator'), (req, res) => {
  const c = get('SELECT * FROM canned_replies WHERE id = ? AND tenant_id = ?', [Number(req.params.id), req.tenant.id]);
  if (!c) return res.status(404).json({ error: '话术不存在' });
  run('DELETE FROM canned_replies WHERE id = ?', [c.id]);
  res.json({ ok: true });
});

// ---------- admin upload ----------
router.post('/upload', requireRole('admin', 'operator', 'agent'), (req, res) => {
  upload.single('file')(req, res, (err) => {
    if (err) return res.status(400).json({ error: err.message || '上传失败' });
    if (!req.file) return res.status(400).json({ error: '未收到文件' });
    res.json({ ok: true, url: publicUrl(req.file), name: req.file.originalname, size: req.file.size, type: req.file.mimetype });
  });
});

// ---------- tags ----------
router.get('/tags', (req, res) => {
  res.json({ tags: all('SELECT * FROM tags WHERE tenant_id = ? ORDER BY id', [req.tenant.id]) });
});

router.post('/tags', requireRole('admin', 'operator'), (req, res) => {
  const name = String(req.body.name || '').trim().slice(0, 20);
  if (!name) return res.status(400).json({ error: '标签名称不能为空' });
  const id = run('INSERT INTO tags (tenant_id, name, color, auto) VALUES (?,?,?,?)',
    [req.tenant.id, name, String(req.body.color || 'blue').slice(0, 20), req.body.auto ? 1 : 0]).lastInsertRowid;
  res.json({ ok: true, id });
});

router.delete('/tags/:id', requireRole('admin', 'operator'), (req, res) => {
  const t = get('SELECT * FROM tags WHERE id = ? AND tenant_id = ?', [Number(req.params.id), req.tenant.id]);
  if (!t) return res.status(404).json({ error: '标签不存在' });
  run('DELETE FROM visitor_tags WHERE tag_id = ?', [t.id]);
  run('DELETE FROM tags WHERE id = ?', [t.id]);
  res.json({ ok: true });
});

// ---------- recordings ----------
router.get('/recordings', featureGate('recording'), (req, res) => {
  const { site } = siteScope(req);
  const rows = all(
    `SELECT r.*, v.name AS visitor_name, v.province, v.city, c.subject FROM recordings r
     LEFT JOIN visitors v ON v.id = r.visitor_id LEFT JOIN conversations c ON c.id = r.conversation_id
     WHERE r.tenant_id = ?${site ? ' AND r.site_id = ?' : ''} ORDER BY r.id DESC LIMIT 100`,
    site ? [req.tenant.id, site.id] : [req.tenant.id]
  );
  res.json({ recordings: rows });
});

router.get('/features', (req, res) => {
  res.json({ features: hasFeature, map: FEATURES });
});

module.exports = router;
