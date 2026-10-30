'use strict';
const express = require('express');
const { all, get, run, json } = require('../db');
const { authRequired, requireRole, featureGate, hashPassword, signApiKey } = require('../auth');
const { audit, publicUser, tenantPublic } = require('../helpers');
const { PLANS, planOf, featuresOf, FEATURES, limitOf, hasFeature } = require('../plans');
const ai = require('../services/ai');
const { ensureAccount } = require('../services/provision');
const billing = require('../services/billing');

const router = express.Router();
router.use(authRequired);

// ---------- team ----------
router.get('/users', requireRole('admin', 'operator'), (req, res) => {
  const users = all(
    `SELECT u.id, u.name, u.email, u.phone, u.role, u.avatar, u.status, u.last_login_at, u.created_at,
            a.email AS account_email, a.phone AS account_phone,
            (SELECT COUNT(*) FROM conversations c WHERE c.agent_id = u.id) AS conversations,
            (SELECT COUNT(*) FROM leads l WHERE l.owner_id = u.id) AS leads
     FROM users u LEFT JOIN accounts a ON a.id = u.account_id WHERE u.tenant_id = ? ORDER BY u.id`,
    [req.tenant.id]
  );
  res.json({ users, limit: limitOf(req.tenant.plan, 'agents'), plan: req.tenant.plan });
});

router.post('/users', requireRole('admin'), (req, res) => {
  const limit = limitOf(req.tenant.plan, 'agents');
  const activeCount = get("SELECT COUNT(*) c FROM users WHERE tenant_id = ? AND status = 'active'", [req.tenant.id]).c;
  if (limit !== -1 && activeCount >= limit) {
    return res.status(403).json({ error: `当前套餐最多 ${limit} 个账号，升级后可继续添加`, code: 'PLAN_LIMIT' });
  }
  const b = req.body || {};
  if (!b.name || !b.email || !b.password) return res.status(400).json({ error: '姓名、邮箱、初始密码不能为空' });
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(b.email)) return res.status(400).json({ error: '邮箱格式不正确' });
  if (String(b.password).length < 6) return res.status(400).json({ error: '密码至少 6 位' });
  if (!['agent', 'operator', 'admin'].includes(b.role)) return res.status(400).json({ error: '角色不合法' });
  const { account } = ensureAccount({ name: b.name, email: b.email, phone: b.phone, password: b.password, source: 'invite' });
  if (get('SELECT id FROM users WHERE tenant_id = ? AND account_id = ?', [req.tenant.id, account.id])) {
    return res.status(400).json({ error: '该账号已经是当前工作空间成员' });
  }
  const id = run('INSERT INTO users (tenant_id, account_id, email, phone, name, password_hash, role, avatar) VALUES (?,?,?,?,?,?,?,?)',
    [req.tenant.id, account.id, account.email, account.phone, String(b.name).slice(0, 30), account.password_hash, b.role, String(b.name).slice(0, 1)]).lastInsertRowid;
  audit(req, 'user.create', `user:${id}`, `${b.email} / ${b.role}`);
  res.json({ ok: true, id, account_created: account.id });
});

router.patch('/users/:id', requireRole('admin'), (req, res) => {
  const u = get('SELECT * FROM users WHERE id = ? AND tenant_id = ?', [Number(req.params.id), req.tenant.id]);
  if (!u) return res.status(404).json({ error: '成员不存在' });
  const b = req.body || {};
  if (b.role && !['agent', 'operator', 'admin'].includes(b.role)) return res.status(400).json({ error: '角色不合法' });
  if (u.id === req.user.id && b.status === 'disabled') return res.status(400).json({ error: '不能停用当前登录账号' });
  if (u.id === req.user.id && b.role && b.role !== 'admin') return res.status(400).json({ error: '不能降低自己的管理员权限' });
  const updates = [];
  const params = [];
  for (const key of ['name', 'role', 'status', 'avatar']) {
    if (b[key] !== undefined) { updates.push(`${key} = ?`); params.push(String(b[key]).slice(0, 100)); }
  }
  if (b.password) {
    const hash = hashPassword(b.password);
    updates.push('password_hash = ?'); params.push(hash);
    if (u.account_id) run('UPDATE accounts SET password_hash = ? WHERE id = ?', [hash, u.account_id]);
  }
  if (b.name !== undefined) {
    updates.push('name = ?'); params.push(String(b.name).slice(0, 30));
    if (u.account_id) run('UPDATE accounts SET name = ? WHERE id = ?', [String(b.name).slice(0, 30), u.account_id]);
  }
  if (!updates.length) return res.status(400).json({ error: '没有可更新字段' });
  params.push(u.id);
  run(`UPDATE users SET ${updates.join(', ')} WHERE id = ?`, params);
  audit(req, 'user.update', `user:${u.id}`, JSON.stringify(b).replace(/"password":"[^"]*"/, '"password":"***"').slice(0, 200));
  res.json({ ok: true });
});

router.delete('/users/:id', requireRole('admin'), (req, res) => {
  const u = get('SELECT * FROM users WHERE id = ? AND tenant_id = ?', [Number(req.params.id), req.tenant.id]);
  if (!u) return res.status(404).json({ error: '成员不存在' });
  if (u.id === req.user.id) return res.status(400).json({ error: '不能停用自己的账号' });
  run("UPDATE users SET status = 'disabled' WHERE id = ?", [u.id]);
  audit(req, 'user.disable', `user:${u.id}`, u.email);
  res.json({ ok: true });
});

// ---------- tenant settings ----------
router.get('/settings', (req, res) => {
  const tenant = req.tenant;
  const channels = all('SELECT * FROM notification_channels WHERE tenant_id = ?', [tenant.id]);
  res.json({
    tenant: tenantPublic(tenant),
    settings: {
      name: tenant.name,
      brand_name: tenant.brand_name || tenant.name,
      brand_color: tenant.brand_color,
      hide_branding: !!tenant.hide_branding,
      custom_domain: tenant.custom_domain || '',
      status: tenant.status
    },
    channels: channels.map((c) => ({ ...c, events: json(c.events, []) })),
    licensed: {
      whitelabel: hasFeature(tenant.plan, 'whitelabel'),
      api: hasFeature(tenant.plan, 'api')
    }
  });
});

router.patch('/settings', requireRole('admin'), (req, res) => {
  const b = req.body || {};
  if (b.hide_branding && !hasFeature(req.tenant.plan, 'whitelabel')) return res.status(403).json({ error: '白标能力需企业版', code: 'PLAN_LOCKED' });
  if (b.custom_domain && !hasFeature(req.tenant.plan, 'whitelabel')) return res.status(403).json({ error: '自定义域名需企业版', code: 'PLAN_LOCKED' });
  const updates = [];
  const params = [];
  if (b.name) { updates.push('name = ?'); params.push(String(b.name).slice(0, 50)); }
  if (b.brand_name !== undefined) { updates.push('brand_name = ?'); params.push(String(b.brand_name).slice(0, 50)); }
  if (b.brand_color !== undefined) {
    if (!/^#[0-9a-fA-F]{6}$/.test(b.brand_color)) return res.status(400).json({ error: '颜色格式不正确' });
    updates.push('brand_color = ?'); params.push(b.brand_color);
  }
  if (b.hide_branding !== undefined) { updates.push('hide_branding = ?'); params.push(b.hide_branding ? 1 : 0); }
  if (b.custom_domain !== undefined) { updates.push('custom_domain = ?'); params.push(String(b.custom_domain).slice(0, 120)); }
  if (!updates.length) return res.status(400).json({ error: '没有可更新字段' });
  params.push(req.tenant.id);
  run(`UPDATE tenants SET ${updates.join(', ')} WHERE id = ?`, params);
  audit(req, 'tenant.update', `tenant:${req.tenant.id}`, JSON.stringify(b).slice(0, 200));
  res.json({ ok: true, tenant: tenantPublic(get('SELECT * FROM tenants WHERE id = ?', [req.tenant.id])) });
});

// ---------- billing ----------
router.get('/billing', (req, res) => {
  const plan = planOf(req.tenant.plan);
  const usage = {
    agents: get("SELECT COUNT(*) c FROM users WHERE tenant_id = ? AND status = 'active'", [req.tenant.id]).c,
    sites: get('SELECT COUNT(*) c FROM sites WHERE tenant_id = ? AND is_sandbox = 0', [req.tenant.id]).c,
    monthlyVisitors: get("SELECT COUNT(*) c FROM visitors WHERE tenant_id = ? AND first_seen >= datetime('now','start of month')", [req.tenant.id]).c,
    storageMb: Math.round(get('SELECT COALESCE(SUM(file_size),0) s FROM messages WHERE tenant_id = ?', [req.tenant.id]).s / 1024 / 1024)
  };
  res.json({
    plan: { ...plan, featuresDetail: featuresOf(req.tenant.plan).map((f) => FEATURES[f]) },
    usage,
    plans: PLANS,
    subscription: billing.subscriptionOf(req.tenant),
    orders: billing.listOrders(req.tenant.id),
    invoices: billing.listInvoices(req.tenant.id),
    payment: {
      provider: billing.provider(),
      mock: billing.mockEnabled(),
      message: billing.mockEnabled() ? '开发环境支持模拟支付；生产环境需配置真实支付适配器。' : '支付通道待配置，可先联系销售开通。'
    }
  });
});

router.post('/billing/orders', requireRole('admin'), (req, res) => {
  const planCode = String(req.body.plan || '');
  const cycle = req.body.cycle === 'yearly' ? 'yearly' : 'monthly';
  try {
    const result = billing.createOrder({ tenantId: req.tenant.id, planCode, cycle, userId: req.user.id });
    audit(req, 'billing.order_create', `order:${result.order.id}`, `${planCode} / ${cycle} / ¥${result.order.amount}`);
    res.json({ ok: true, ...result });
  } catch (e) {
    res.status(e.status || 400).json({ error: e.message });
  }
});

router.post('/billing/orders/:id/pay', requireRole('admin'), (req, res) => {
  const order = get('SELECT * FROM orders WHERE id = ? AND tenant_id = ?', [Number(req.params.id), req.tenant.id]);
  if (!order) return res.status(404).json({ error: '订单不存在' });
  if (!billing.mockEnabled()) return res.status(403).json({ error: '当前环境未启用模拟支付，请通过支付渠道完成' });
  try {
    const result = billing.applyPaidOrder(order.id, { providerTradeNo: 'MOCK-' + Date.now() });
    audit(req, 'billing.pay', `order:${order.order_no}`, '模拟支付成功');
    res.json({ ok: true, plan: planOf(result.tenant.plan), subscription: billing.subscriptionOf(result.tenant) });
  } catch (e) {
    res.status(e.status || 400).json({ error: e.message });
  }
});

router.post('/billing/orders/:id/cancel', requireRole('admin'), (req, res) => {
  try {
    const order = billing.cancelOrder(Number(req.params.id), req.tenant.id);
    audit(req, 'billing.order_cancel', `order:${order.order_no}`, '取消待支付订单');
    res.json({ ok: true, order: billing.orderPublic(order) });
  } catch (e) {
    res.status(e.status || 400).json({ error: e.message });
  }
});

router.post('/billing/downgrade', requireRole('admin'), (req, res) => {
  const result = billing.scheduleDowngrade(req.tenant.id);
  audit(req, 'billing.downgrade', `tenant:${req.tenant.id}`, result.immediate ? '立即降级免费版' : '预约到期降级免费版');
  res.json({ ok: true, ...result, subscription: billing.subscriptionOf(result.tenant) });
});

router.post('/billing/resume', requireRole('admin'), (req, res) => {
  const tenant = billing.resumeSubscription(req.tenant.id);
  audit(req, 'billing.resume', `tenant:${req.tenant.id}`, '恢复自动续费');
  res.json({ ok: true, subscription: billing.subscriptionOf(tenant) });
});

router.post('/billing/contact-sales', requireRole('admin'), (req, res) => {
  const app = billing.contactSales(req.tenant.id, req.user.id, String(req.body.message || '').slice(0, 1000));
  audit(req, 'billing.contact_sales', `application:${app.id}`, '企业版/定制咨询');
  res.json({ ok: true, application: { id: app.id, status: app.status } });
});

// Development-only shortcut kept for demos and tests. The customer UI uses orders.
router.post('/billing/change-plan', requireRole('admin'), (req, res) => {
  if (process.env.NODE_ENV === 'production' && process.env.ALLOW_PLAN_SWITCH !== '1') {
    return res.status(403).json({ error: '生产环境请通过订单与支付开通套餐' });
  }
  const plan = String(req.body.plan || '');
  if (!PLANS.some((p) => p.code === plan)) return res.status(400).json({ error: '套餐不存在' });
  run("UPDATE tenants SET plan = ?, plan_status = 'active' WHERE id = ?", [plan, req.tenant.id]);
  audit(req, 'billing.change_plan', `tenant:${req.tenant.id}`, `${req.tenant.plan} -> ${plan} (demo)`);
  res.json({ ok: true, plan: planOf(plan) });
});

// ---------- api keys ----------
router.get('/api-keys', requireRole('admin'), featureGate('api'), (req, res) => {
  res.json({ keys: all('SELECT id, name, key, enabled, last_used_at, created_at FROM api_keys WHERE tenant_id = ?', [req.tenant.id]) });
});
router.post('/api-keys', requireRole('admin'), featureGate('api'), (req, res) => {
  const name = String(req.body.name || '默认 Key').slice(0, 40);
  const key = signApiKey();
  const id = run('INSERT INTO api_keys (tenant_id, name, key) VALUES (?,?,?)', [req.tenant.id, name, key]).lastInsertRowid;
  res.json({ ok: true, id, key });
});
router.delete('/api-keys/:id', requireRole('admin'), featureGate('api'), (req, res) => {
  const k = get('SELECT * FROM api_keys WHERE id = ? AND tenant_id = ?', [Number(req.params.id), req.tenant.id]);
  if (!k) return res.status(404).json({ error: 'Key 不存在' });
  run('UPDATE api_keys SET enabled = 0 WHERE id = ?', [k.id]);
  res.json({ ok: true });
});

// ---------- notification channels ----------
router.post('/notification-channels', requireRole('admin', 'operator'), (req, res) => {
  const b = req.body || {};
  if (!['dingtalk', 'wecom'].includes(b.type)) return res.status(400).json({ error: '仅支持钉钉或企业微信' });
  if (!/^https?:\/\//.test(b.webhook || '')) return res.status(400).json({ error: 'Webhook 地址不合法' });
  const events = Array.isArray(b.events) && b.events.length ? b.events : ['conversation', 'lead'];
  const id = run('INSERT INTO notification_channels (tenant_id, type, webhook, enabled, events) VALUES (?,?,?,?,?)',
    [req.tenant.id, b.type, String(b.webhook).slice(0, 500), b.enabled === false ? 0 : 1, JSON.stringify(events)]).lastInsertRowid;
  res.json({ ok: true, id });
});
router.patch('/notification-channels/:id', requireRole('admin', 'operator'), (req, res) => {
  const c = get('SELECT * FROM notification_channels WHERE id = ? AND tenant_id = ?', [Number(req.params.id), req.tenant.id]);
  if (!c) return res.status(404).json({ error: '渠道不存在' });
  const b = req.body || {};
  run('UPDATE notification_channels SET webhook = ?, enabled = ?, events = ? WHERE id = ?', [
    String(b.webhook ?? c.webhook).slice(0, 500), b.enabled === undefined ? c.enabled : (b.enabled ? 1 : 0),
    JSON.stringify(Array.isArray(b.events) ? b.events : json(c.events, [])), c.id
  ]);
  res.json({ ok: true });
});
router.delete('/notification-channels/:id', requireRole('admin', 'operator'), (req, res) => {
  const c = get('SELECT * FROM notification_channels WHERE id = ? AND tenant_id = ?', [Number(req.params.id), req.tenant.id]);
  if (!c) return res.status(404).json({ error: '渠道不存在' });
  run('DELETE FROM notification_channels WHERE id = ?', [c.id]);
  res.json({ ok: true });
});

router.post('/notification-channels/:id/test', requireRole('admin', 'operator'), async (req, res) => {
  const c = get('SELECT * FROM notification_channels WHERE id = ? AND tenant_id = ?', [Number(req.params.id), req.tenant.id]);
  if (!c) return res.status(404).json({ error: '渠道不存在' });
  const { pushWebhook } = require('../services/notify');
  const ok = await pushWebhook(c, { title: '轻客服 SaaS 测试消息', content: '如果你看到这条消息，说明 webhook 配置成功。' });
  res.json({ ok, message: ok ? '测试消息已发送' : '发送失败，请检查 Webhook 地址' });
});

// ---------- notifications ----------
router.get('/notifications', (req, res) => {
  const rows = all(
    `SELECT * FROM notifications WHERE tenant_id = ? AND (user_id IS NULL OR user_id = ?) ORDER BY id DESC LIMIT 50`,
    [req.tenant.id, req.user.id]
  );
  const unread = get('SELECT COUNT(*) c FROM notifications WHERE tenant_id = ? AND (user_id IS NULL OR user_id = ?) AND is_read = 0', [req.tenant.id, req.user.id]).c;
  res.json({ notifications: rows.map((n) => ({ ...n, payload: json(n.payload, {}) })), unread });
});

router.post('/notifications/read-all', (req, res) => {
  run('UPDATE notifications SET is_read = 1 WHERE tenant_id = ? AND (user_id IS NULL OR user_id = ?)', [req.tenant.id, req.user.id]);
  res.json({ ok: true });
});

router.post('/notifications/:id/read', (req, res) => {
  run('UPDATE notifications SET is_read = 1 WHERE id = ? AND tenant_id = ?', [Number(req.params.id), req.tenant.id]);
  res.json({ ok: true });
});

// ---------- audit ----------
router.get('/audit-logs', requireRole('admin'), (req, res) => {
  const rows = all(
    `SELECT a.*, u.name AS user_name FROM audit_logs a LEFT JOIN users u ON u.id = a.user_id
     WHERE a.tenant_id = ? ORDER BY a.id DESC LIMIT 100`, [req.tenant.id]
  );
  res.json({ logs: rows });
});

// ---------- AI ----------
router.get('/ai/overview', featureGate('ai_bot'), (req, res) => {
  const convs = get('SELECT COUNT(*) c FROM conversations WHERE tenant_id = ? AND ai_summary IS NOT NULL', [req.tenant.id]).c;
  const botMessages = get("SELECT COUNT(*) c FROM messages WHERE tenant_id = ? AND sender_type = 'bot'", [req.tenant.id]).c;
  const autoHandled = get("SELECT COUNT(*) c FROM conversations WHERE tenant_id = ? AND agent_id IS NULL AND created_at >= datetime('now','-30 days')", [req.tenant.id]).c;
  const intents = all("SELECT ai_intent, COUNT(*) c FROM conversations WHERE tenant_id = ? AND ai_intent IS NOT NULL GROUP BY ai_intent", [req.tenant.id]);
  const recent = all('SELECT id, subject, ai_summary, ai_need, ai_suggestion, ai_intent, created_at FROM conversations WHERE tenant_id = ? AND ai_summary IS NOT NULL ORDER BY id DESC LIMIT 8', [req.tenant.id]);
  const faqCount = get('SELECT COUNT(*) c FROM faqs WHERE tenant_id = ?', [req.tenant.id]).c;
  res.json({ stats: { summarized: convs, botMessages, autoHandled, faqCount }, intents, recent });
});

router.post('/ai/summary/:conversationId', featureGate('ai_bot'), (req, res) => {
  const conv = get('SELECT * FROM conversations WHERE id = ? AND tenant_id = ?', [Number(req.params.conversationId), req.tenant.id]);
  if (!conv) return res.status(404).json({ error: '会话不存在' });
  const messages = all('SELECT * FROM messages WHERE conversation_id = ? AND is_private = 0', [conv.id]);
  const visitor = get('SELECT * FROM visitors WHERE id = ?', [conv.visitor_id]);
  const summary = ai.summarize(messages, visitor);
  run('UPDATE conversations SET ai_summary = ?, ai_need = ?, ai_suggestion = ?, ai_intent = ? WHERE id = ?',
    [summary.summary, summary.need, summary.suggestion, summary.intent, conv.id]);
  if (summary.tags.length) {
    const current = json(visitor.tags, []);
    run('UPDATE visitors SET tags = ? WHERE id = ?', [JSON.stringify([...new Set([...current, ...summary.tags])]), visitor.id]);
  }
  res.json({ ok: true, summary });
});

router.post('/ai/translate', featureGate('translation'), (req, res) => {
  const { text, target } = req.body || {};
  if (!text) return res.status(400).json({ error: '缺少文本' });
  res.json({ text: ai.translate(String(text).slice(0, 2000), target === 'zh' ? 'zh' : 'en') });
});

router.post('/ai/test-answer', featureGate('ai_bot'), (req, res) => {
  const { site } = require('../helpers').siteScope(req, req.body.siteId);
  if (!site) return res.status(400).json({ error: '请先创建站点' });
  const question = String(req.body.question || '').slice(0, 300);
  const match = ai.matchFaq(site.id, question);
  res.json({
    question,
    matched: match ? { id: match.faq.id, question: match.faq.question, answer: match.faq.answer, score: Number(match.score.toFixed(2)) } : null,
    reply: match ? match.faq.answer : '未匹配到知识库，将自动转人工',
    tags: ai.autoTag(question)
  });
});

module.exports = router;
