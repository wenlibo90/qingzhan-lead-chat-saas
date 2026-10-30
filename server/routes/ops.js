'use strict';
const express = require('express');
const { all, get, run, json } = require('../db');
const { verifyPassword, hashPassword, signOpsToken, opsAuthRequired, requireOpsRole } = require('../auth');
const { PLANS, planOf } = require('../plans');
const { createWorkspace } = require('../services/provision');
const { notifyTenant } = require('../services/notify');
const referral = require('../services/referral');
const { hit } = require('../services/ratelimit');

const router = express.Router();
const APP_STATUS = ['new', 'contacted', 'qualified', 'demo', 'trial', 'proposal', 'won', 'lost'];
const APP_STATUS_LABEL = { new: '新申请', contacted: '已联系', qualified: '已确认', demo: '已演示', trial: '试用中', proposal: '已报价', won: '已成交', lost: '已流失' };

function ipOf(req) {
  return String(req.headers['x-forwarded-for'] || req.socket.remoteAddress || req.ip || '').split(',')[0].trim().replace('::ffff:', '');
}
function opsPublic(u) {
  return { id: u.id, name: u.name, email: u.email, role: u.role, status: u.status, last_login_at: u.last_login_at, created_at: u.created_at };
}
function opsAudit(req, action, target, detail) {
  run('INSERT INTO platform_audit_logs (platform_user_id, action, target, detail, ip) VALUES (?,?,?,?,?)', [
    req.opsUser ? req.opsUser.id : null, action, target || '', detail ? String(detail).slice(0, 500) : '', ipOf(req)
  ]);
}
function paging(q, def = 20, max = 100) {
  const page = Math.max(1, Number(q.page || 1));
  const limit = Math.min(max, Math.max(1, Number(q.limit || def)));
  return { page, limit, offset: (page - 1) * limit };
}

router.post('/auth/login', (req, res) => {
  const { email, password } = req.body || {};
  const ip = ipOf(req);
  if (!hit(`opslogin:${ip}`, 12, 60000).ok) return res.status(429).json({ error: '尝试次数过多，请稍后再试' });
  if (!email || !password) return res.status(400).json({ error: '请输入运营邮箱和密码' });
  const user = get('SELECT * FROM platform_users WHERE email = ?', [String(email).toLowerCase().trim()]);
  if (!user) {
    const tenantAccount = get('SELECT id FROM accounts WHERE email = ?', [String(email).toLowerCase().trim()]);
    if (tenantAccount) return res.status(403).json({ error: '这是客户账号，请前往 /admin/ 登录', code: 'TENANT_ACCOUNT', login_url: '/admin/' });
    return res.status(401).json({ error: '邮箱或密码不正确' });
  }
  if (!verifyPassword(password, user.password_hash)) return res.status(401).json({ error: '邮箱或密码不正确' });
  if (user.status !== 'active') return res.status(403).json({ error: '运营账号已停用' });
  run("UPDATE platform_users SET last_login_at = datetime('now') WHERE id = ?", [user.id]);
  req.opsUser = user;
  opsAudit(req, 'ops.login', user.email, '登录运营后台');
  res.json({ token: signOpsToken(user), user: opsPublic(user) });
});

router.get('/auth/me', opsAuthRequired, (req, res) => {
  res.json({ user: opsPublic(req.opsUser) });
});

router.post('/auth/password', opsAuthRequired, (req, res) => {
  const { oldPassword, newPassword } = req.body || {};
  if (!verifyPassword(oldPassword || '', req.opsUser.password_hash)) return res.status(400).json({ error: '原密码不正确' });
  if (!newPassword || String(newPassword).length < 6) return res.status(400).json({ error: '新密码至少 6 位' });
  run('UPDATE platform_users SET password_hash = ? WHERE id = ?', [hashPassword(newPassword), req.opsUser.id]);
  opsAudit(req, 'ops.password', req.opsUser.email, '修改运营密码');
  res.json({ ok: true });
});

// ---------- overview ----------
router.get('/overview', opsAuthRequired, (req, res) => {
  const accounts = get('SELECT COUNT(*) c FROM accounts').c;
  const newAccounts = get("SELECT COUNT(*) c FROM accounts WHERE created_at >= datetime('now','-7 days')").c;
  const workspaces = get('SELECT COUNT(*) c FROM tenants').c;
  const trialing = get("SELECT COUNT(*) c FROM tenants WHERE plan_status = 'trialing'").c;
  const paid = get("SELECT COUNT(*) c FROM tenants WHERE plan IN ('standard','pro','enterprise') AND plan_status = 'active'").c;
  const installed = get('SELECT COUNT(DISTINCT tenant_id) c FROM sites WHERE is_sandbox = 0 AND installed_at IS NOT NULL').c;
  const applications = get('SELECT COUNT(*) c FROM applications').c;
  const newApplications = get("SELECT COUNT(*) c FROM applications WHERE status = 'new'").c;
  const risk = get('SELECT COUNT(*) c FROM accounts WHERE risk_score >= 30 OR status != ?', ['active']).c;
  const revenue = Number(get("SELECT COALESCE(SUM(amount_cents),0) s FROM orders WHERE status = 'paid'").s || 0) / 100;
  const paidOrders = get("SELECT COUNT(*) c FROM orders WHERE status = 'paid'").c;
  const firstChat = get('SELECT COUNT(DISTINCT c.tenant_id) c FROM conversations c JOIN sites s ON s.id = c.site_id WHERE s.is_sandbox = 0').c;
  const firstLead = get('SELECT COUNT(DISTINCT l.tenant_id) c FROM leads l JOIN sites s ON s.id = l.site_id WHERE s.is_sandbox = 0').c;
  const trend = all(`SELECT date(created_at) d, COUNT(*) c FROM accounts WHERE created_at >= datetime('now','-14 days') GROUP BY d`);
  const appTrend = all(`SELECT date(created_at) d, COUNT(*) c FROM applications WHERE created_at >= datetime('now','-14 days') GROUP BY d`);
  const dates = [];
  const trendMap = new Map(trend.map((r) => [r.d, r.c]));
  const appMap = new Map(appTrend.map((r) => [r.d, r.c]));
  for (let i = 13; i >= 0; i--) {
    const d = new Date(Date.now() - i * 86400000).toISOString().slice(0, 10);
    dates.push({ date: d, signups: trendMap.get(d) || 0, applications: appMap.get(d) || 0 });
  }
  const recentAccounts = all(`SELECT a.*, (SELECT COUNT(*) FROM users u WHERE u.account_id = a.id) workspace_count FROM accounts a ORDER BY a.id DESC LIMIT 8`);
  const recentApplications = all('SELECT * FROM applications ORDER BY id DESC LIMIT 8');
  const trialsEnding = all("SELECT id, name, plan, trial_ends_at FROM tenants WHERE plan_status = 'trialing' AND trial_ends_at <= datetime('now','+7 days') ORDER BY trial_ends_at LIMIT 8");
  const planDist = all('SELECT plan, COUNT(*) c FROM tenants GROUP BY plan');
  res.json({
    metrics: { accounts, newAccounts, workspaces, trialing, paid, installed, applications, newApplications, risk, revenue, paidOrders },
    activation: [
      { label: '注册账号', value: accounts },
      { label: '创建工作空间', value: workspaces },
      { label: '安装 JS', value: installed },
      { label: '首条会话', value: firstChat },
      { label: '首条线索', value: firstLead }
    ],
    trend: dates,
    recentAccounts,
    recentApplications,
    trialsEnding,
    plans: planDist,
    planCatalog: PLANS
  });
});

// ---------- accounts ----------
router.get('/accounts', opsAuthRequired, (req, res) => {
  const { page, limit, offset } = paging(req.query);
  const q = String(req.query.q || '').trim();
  const status = String(req.query.status || '');
  const params = [];
  let where = '1=1';
  if (q) { where += ' AND (a.name LIKE ? OR a.phone LIKE ? OR a.email LIKE ?)'; params.push(`%${q}%`, `%${q}%`, `%${q}%`); }
  if (status) { where += ' AND a.status = ?'; params.push(status); }
  const total = get(`SELECT COUNT(*) c FROM accounts a WHERE ${where}`, params).c;
  const rows = all(
    `SELECT a.*, (SELECT COUNT(*) FROM users u WHERE u.account_id = a.id) AS workspace_count,
            (SELECT GROUP_CONCAT(t.name, ' / ') FROM users u JOIN tenants t ON t.id = u.tenant_id WHERE u.account_id = a.id) AS workspace_names,
            (SELECT GROUP_CONCAT(t.plan, ',') FROM users u JOIN tenants t ON t.id = u.tenant_id WHERE u.account_id = a.id) AS plans
     FROM accounts a WHERE ${where} ORDER BY a.id DESC LIMIT ? OFFSET ?`,
    [...params, limit, offset]
  );
  res.json({ accounts: rows, total, page, limit });
});

router.get('/accounts/:id', opsAuthRequired, (req, res) => {
  const account = get('SELECT * FROM accounts WHERE id = ?', [Number(req.params.id)]);
  if (!account) return res.status(404).json({ error: '账号不存在' });
  const workspaces = all(
    `SELECT u.id AS user_id, u.role, u.status AS member_status, t.*,
            (SELECT COUNT(*) FROM sites s WHERE s.tenant_id = t.id AND s.is_sandbox = 0) sites,
            (SELECT COUNT(*) FROM visitors v WHERE v.tenant_id = t.id) visitors,
            (SELECT COUNT(*) FROM conversations c WHERE c.tenant_id = t.id) conversations,
            (SELECT COUNT(*) FROM leads l WHERE l.tenant_id = t.id) leads
     FROM users u JOIN tenants t ON t.id = u.tenant_id WHERE u.account_id = ? ORDER BY t.id DESC`, [account.id]
  );
  const applications = all('SELECT * FROM applications WHERE account_id = ? OR phone = ? ORDER BY id DESC', [account.id, account.phone || '__none__']);
  res.json({ account, workspaces, applications });
});

router.patch('/accounts/:id', opsAuthRequired, requireOpsRole('superadmin', 'ops', 'risk'), (req, res) => {
  const account = get('SELECT * FROM accounts WHERE id = ?', [Number(req.params.id)]);
  if (!account) return res.status(404).json({ error: '账号不存在' });
  const b = req.body || {};
  const updates = [];
  const params = [];
  if (b.status && ['active', 'suspended', 'disabled'].includes(b.status)) { updates.push('status = ?'); params.push(b.status); }
  if (b.risk_score !== undefined) { updates.push('risk_score = ?'); params.push(Math.max(0, Math.min(100, Number(b.risk_score) || 0))); }
  if (!updates.length) return res.status(400).json({ error: '没有可更新字段' });
  params.push(account.id);
  run(`UPDATE accounts SET ${updates.join(', ')} WHERE id = ?`, params);
  if (b.status && b.status !== 'active') run("UPDATE users SET status = 'disabled' WHERE account_id = ?", [account.id]);
  if (b.status === 'active') run("UPDATE users SET status = 'active' WHERE account_id = ?", [account.id]);
  opsAudit(req, 'account.update', `account:${account.id}`, JSON.stringify(b));
  res.json({ ok: true });
});

// ---------- workspaces ----------
router.get('/workspaces', opsAuthRequired, (req, res) => {
  const { page, limit, offset } = paging(req.query);
  const q = String(req.query.q || '').trim();
  const plan = String(req.query.plan || '');
  const planStatus = String(req.query.plan_status || '');
  const status = String(req.query.status || '');
  const params = [];
  let where = '1=1';
  if (q) { where += ' AND (t.name LIKE ? OR t.signup_source LIKE ? OR t.id = ?)'; params.push(`%${q}%`, `%${q}%`, Number(q) || -1); }
  if (plan) { where += ' AND t.plan = ?'; params.push(plan); }
  if (planStatus) { where += ' AND t.plan_status = ?'; params.push(planStatus); }
  if (status) { where += ' AND t.status = ?'; params.push(status); }
  const total = get(`SELECT COUNT(*) c FROM tenants t WHERE ${where}`, params).c;
  const rows = all(
    `SELECT t.*,
      (SELECT u.name FROM users u WHERE u.tenant_id = t.id AND u.role = 'admin' ORDER BY u.id LIMIT 1) owner_name,
      (SELECT a.phone FROM users u JOIN accounts a ON a.id = u.account_id WHERE u.tenant_id = t.id AND u.role = 'admin' ORDER BY u.id LIMIT 1) owner_phone,
      (SELECT a.email FROM users u JOIN accounts a ON a.id = u.account_id WHERE u.tenant_id = t.id AND u.role = 'admin' ORDER BY u.id LIMIT 1) owner_email,
      (SELECT COUNT(*) FROM users u WHERE u.tenant_id = t.id) members,
      (SELECT COUNT(*) FROM sites s WHERE s.tenant_id = t.id AND s.is_sandbox = 0) sites,
      (SELECT MAX(s.installed_at) FROM sites s WHERE s.tenant_id = t.id AND s.is_sandbox = 0) installed_at,
      (SELECT COUNT(*) FROM visitors v WHERE v.tenant_id = t.id) visitors,
      (SELECT COUNT(*) FROM conversations c WHERE c.tenant_id = t.id) conversations,
      (SELECT COUNT(*) FROM leads l WHERE l.tenant_id = t.id) leads
     FROM tenants t WHERE ${where} ORDER BY t.id DESC LIMIT ? OFFSET ?`,
    [...params, limit, offset]
  );
  res.json({ workspaces: rows, total, page, limit });
});

router.get('/workspaces/:id', opsAuthRequired, (req, res) => {
  const tenant = get('SELECT * FROM tenants WHERE id = ?', [Number(req.params.id)]);
  if (!tenant) return res.status(404).json({ error: '工作空间不存在' });
  const members = all(`SELECT u.*, a.phone AS account_phone, a.email AS account_email FROM users u LEFT JOIN accounts a ON a.id = u.account_id WHERE u.tenant_id = ? ORDER BY u.id`, [tenant.id]);
  const sites = all('SELECT * FROM sites WHERE tenant_id = ? ORDER BY is_sandbox, id', [tenant.id]);
  const apps = all('SELECT * FROM applications WHERE tenant_id = ? ORDER BY id DESC', [tenant.id]);
  res.json({ tenant, members, sites, applications: apps });
});

router.patch('/workspaces/:id', opsAuthRequired, requireOpsRole('superadmin', 'ops', 'sales'), (req, res) => {
  const tenant = get('SELECT * FROM tenants WHERE id = ?', [Number(req.params.id)]);
  if (!tenant) return res.status(404).json({ error: '工作空间不存在' });
  const b = req.body || {};
  const updates = [];
  const params = [];
  if (b.plan && PLANS.some((p) => p.code === b.plan)) { updates.push('plan = ?'); params.push(b.plan); if (!b.plan_status) { updates.push("plan_status = 'active'"); } }
  if (b.plan_status && ['active', 'trialing', 'expired', 'past_due', 'canceled'].includes(b.plan_status)) { updates.push('plan_status = ?'); params.push(b.plan_status); }
  if (b.status && ['active', 'suspended', 'disabled'].includes(b.status)) { updates.push('status = ?'); params.push(b.status); }
  if (b.trial_ends_at !== undefined) { updates.push('trial_ends_at = ?'); params.push(b.trial_ends_at || null); }
  if (b.risk_score !== undefined) { updates.push('risk_score = ?'); params.push(Math.max(0, Math.min(100, Number(b.risk_score) || 0))); }
  if (!updates.length) return res.status(400).json({ error: '没有可更新字段' });
  params.push(tenant.id);
  run(`UPDATE tenants SET ${updates.join(', ')} WHERE id = ?`, params);
  opsAudit(req, 'workspace.update', `tenant:${tenant.id}`, JSON.stringify(b));
  res.json({ ok: true });
});

// ---------- applications ----------
router.get('/applications', opsAuthRequired, (req, res) => {
  const { page, limit, offset } = paging(req.query);
  const q = String(req.query.q || '').trim();
  const status = String(req.query.status || '');
  const ownerId = String(req.query.owner_id || '');
  const params = [];
  let where = '1=1';
  if (q) { where += ' AND (a.name LIKE ? OR a.phone LIKE ? OR a.email LIKE ? OR a.company LIKE ?)'; params.push(`%${q}%`, `%${q}%`, `%${q}%`, `%${q}%`); }
  if (status && APP_STATUS.includes(status)) { where += ' AND a.status = ?'; params.push(status); }
  if (ownerId) { where += ' AND a.owner_id = ?'; params.push(Number(ownerId)); }
  const total = get(`SELECT COUNT(*) c FROM applications a WHERE ${where}`, params).c;
  const rows = all(
    `SELECT a.*, p.name AS owner_name FROM applications a LEFT JOIN platform_users p ON p.id = a.owner_id
     WHERE ${where} ORDER BY CASE a.status WHEN 'new' THEN 0 WHEN 'contacted' THEN 1 ELSE 2 END, a.id DESC LIMIT ? OFFSET ?`,
    [...params, limit, offset]
  );
  const stats = {};
  for (const st of APP_STATUS) stats[st] = get('SELECT COUNT(*) c FROM applications WHERE status = ?', [st]).c;
  stats.all = get('SELECT COUNT(*) c FROM applications').c;
  res.json({ applications: rows, total, page, limit, stats, statuses: APP_STATUS, labels: APP_STATUS_LABEL });
});

router.post('/applications', opsAuthRequired, requireOpsRole('superadmin', 'ops', 'sales'), (req, res) => {
  const b = req.body || {};
  if (!b.name || !b.phone) return res.status(400).json({ error: '姓名和手机号不能为空' });
  const id = run(
    `INSERT INTO applications (name, phone, email, company, website, size, channel, message, source, status, owner_id)
     VALUES (?,?,?,?,?,?,?,?,?,?,?)`,
    [String(b.name).slice(0, 40), String(b.phone).slice(0, 20), String(b.email || '').slice(0, 100), String(b.company || '').slice(0, 80),
      String(b.website || '').slice(0, 120), String(b.size || '').slice(0, 40), String(b.channel || '').slice(0, 40),
      String(b.message || '').slice(0, 1000), 'manual', 'new', req.opsUser.id]
  ).lastInsertRowid;
  opsAudit(req, 'application.create', `application:${id}`, b.name);
  res.json({ ok: true, id });
});

router.get('/applications/:id', opsAuthRequired, (req, res) => {
  const app = get('SELECT a.*, p.name AS owner_name FROM applications a LEFT JOIN platform_users p ON p.id = a.owner_id WHERE a.id = ?', [Number(req.params.id)]);
  if (!app) return res.status(404).json({ error: '申请不存在' });
  const activities = all('SELECT x.*, p.name AS user_name FROM application_activities x LEFT JOIN platform_users p ON p.id = x.platform_user_id WHERE x.application_id = ? ORDER BY x.id DESC', [app.id]);
  const workspace = app.tenant_id ? get('SELECT id, name, plan, plan_status FROM tenants WHERE id = ?', [app.tenant_id]) : null;
  res.json({ application: app, activities, workspace, statuses: APP_STATUS, labels: APP_STATUS_LABEL });
});

router.patch('/applications/:id', opsAuthRequired, requireOpsRole('superadmin', 'ops', 'sales'), (req, res) => {
  const app = get('SELECT * FROM applications WHERE id = ?', [Number(req.params.id)]);
  if (!app) return res.status(404).json({ error: '申请不存在' });
  const b = req.body || {};
  const updates = [];
  const params = [];
  if (b.status && APP_STATUS.includes(b.status)) { updates.push('status = ?'); params.push(b.status); if (b.status === 'contacted') updates.push("last_contact_at = datetime('now')"); }
  if (b.owner_id !== undefined) { updates.push('owner_id = ?'); params.push(b.owner_id ? Number(b.owner_id) : null); }
  if (b.message !== undefined) { updates.push('message = ?'); params.push(String(b.message).slice(0, 1000)); }
  if (!updates.length) return res.status(400).json({ error: '没有可更新字段' });
  updates.push("updated_at = datetime('now')");
  params.push(app.id);
  run(`UPDATE applications SET ${updates.join(', ')} WHERE id = ?`, params);
  if (b.status && b.status !== app.status) {
    run('INSERT INTO application_activities (application_id, platform_user_id, type, content) VALUES (?,?,?,?)', [app.id, req.opsUser.id, 'status', `状态更新为 ${APP_STATUS_LABEL[b.status] || b.status}`]);
  }
  opsAudit(req, 'application.update', `application:${app.id}`, JSON.stringify(b));
  res.json({ ok: true });
});

router.post('/applications/:id/activities', opsAuthRequired, requireOpsRole('superadmin', 'ops', 'sales', 'support'), (req, res) => {
  const app = get('SELECT * FROM applications WHERE id = ?', [Number(req.params.id)]);
  if (!app) return res.status(404).json({ error: '申请不存在' });
  const content = String(req.body.content || '').trim().slice(0, 1000);
  if (!content) return res.status(400).json({ error: '请填写跟进内容' });
  run('INSERT INTO application_activities (application_id, platform_user_id, type, content) VALUES (?,?,?,?)', [app.id, req.opsUser.id, 'note', content]);
  run("UPDATE applications SET last_contact_at = datetime('now'), updated_at = datetime('now') WHERE id = ?", [app.id]);
  res.json({ ok: true });
});

router.post('/applications/:id/convert', opsAuthRequired, requireOpsRole('superadmin', 'ops', 'sales'), (req, res) => {
  const app = get('SELECT * FROM applications WHERE id = ?', [Number(req.params.id)]);
  if (!app) return res.status(404).json({ error: '申请不存在' });
  if (app.tenant_id) return res.status(400).json({ error: '该申请已开通工作空间' });
  const workspaceName = String(req.body.workspaceName || app.company || `${app.name} 的工作空间`).slice(0, 60);
  const plan = ['free', 'standard', 'pro', 'enterprise'].includes(req.body.plan) ? req.body.plan : 'pro';
  const planStatus = plan === 'free' ? 'active' : req.body.plan_status === 'active' ? 'active' : 'trialing';
  const result = createWorkspace({
    workspaceName, ownerName: app.name, email: app.email, phone: app.phone, website: app.website,
    plan, planStatus, source: 'sales_convert', trialDays: 14, goal: app.channel, industry: app.size
  });
  run("UPDATE applications SET tenant_id = ?, account_id = ?, status = 'won', updated_at = datetime('now') WHERE id = ?", [result.tenant.id, result.account.id, app.id]);
  run('INSERT INTO application_activities (application_id, platform_user_id, type, content) VALUES (?,?,?,?)', [app.id, req.opsUser.id, 'convert', `开通工作空间 ${workspaceName}（${planOf(plan).name}）`]);
  opsAudit(req, 'application.convert', `application:${app.id}`, `tenant:${result.tenant.id}`);
  res.json({
    ok: true,
    tenant: result.tenant,
    account: { id: result.account.id, phone: result.account.phone, email: result.account.email },
    temp_password: result.tempPassword,
    site: result.site
  });
});

// ---------- subscriptions ----------
router.get('/subscriptions', opsAuthRequired, (req, res) => {
  const plans = all('SELECT plan, plan_status, COUNT(*) c FROM tenants GROUP BY plan, plan_status');
  const trials = all(`SELECT t.id, t.name, t.plan, t.trial_ends_at, u.name AS owner_name
                      FROM tenants t LEFT JOIN users u ON u.tenant_id = t.id AND u.role = 'admin'
                      WHERE t.plan_status = 'trialing' ORDER BY t.trial_ends_at LIMIT 100`);
  const expiring = all("SELECT id, name, trial_ends_at FROM tenants WHERE plan_status = 'trialing' AND trial_ends_at <= datetime('now','+3 days') ORDER BY trial_ends_at");
  const recent = all(`SELECT t.id, t.name, t.plan, t.plan_status, t.signup_source, t.created_at,
                      (SELECT COUNT(*) FROM sites s WHERE s.tenant_id = t.id AND s.is_sandbox = 0) sites
                      FROM tenants t ORDER BY t.id DESC LIMIT 20`);
  const orders = all(`SELECT o.*, t.name AS tenant_name FROM orders o JOIN tenants t ON t.id = o.tenant_id ORDER BY o.id DESC LIMIT 30`);
  const revenue = Number(get("SELECT COALESCE(SUM(amount_cents),0) s FROM orders WHERE status = 'paid'").s || 0) / 100;
  const paidOrders = get("SELECT COUNT(*) c FROM orders WHERE status = 'paid'").c;
  res.json({ plans, trials, expiring, recent, orders, revenue, paidOrders, catalog: PLANS });
});

// ---------- risk ----------
router.get('/risk', opsAuthRequired, (req, res) => {
  const accounts = all("SELECT * FROM accounts WHERE risk_score >= 30 OR status != 'active' ORDER BY risk_score DESC, id DESC LIMIT 100");
  const workspaces = all("SELECT id, name, plan, plan_status, status, risk_score, signup_ip, created_at FROM tenants WHERE risk_score >= 30 OR status != 'active' ORDER BY risk_score DESC, id DESC LIMIT 100");
  const repeatedIps = all("SELECT signup_ip, COUNT(*) c, GROUP_CONCAT(name, ' / ') names FROM accounts WHERE signup_ip IS NOT NULL AND signup_ip != '' GROUP BY signup_ip HAVING c >= 3 ORDER BY c DESC LIMIT 30");
  res.json({ accounts, workspaces, repeatedIps });
});

// ---------- support tickets ----------
router.get('/tickets', opsAuthRequired, (req, res) => {
  const status = String(req.query.status || '');
  const priority = String(req.query.priority || '');
  const q = String(req.query.q || '').trim();
  const params = [];
  let where = '1=1';
  if (status) { where += ' AND t.status = ?'; params.push(status); }
  if (priority) { where += ' AND t.priority = ?'; params.push(priority); }
  if (q) { where += ' AND (t.subject LIKE ? OR x.name LIKE ? OR t.id = ?)'; params.push(`%${q}%`, `%${q}%`, Number(q) || -1); }
  const tickets = all(
    `SELECT t.*, x.name AS tenant_name, x.plan, u.name AS user_name,
            (SELECT COUNT(*) FROM ticket_messages m WHERE m.ticket_id = t.id) messages
     FROM support_tickets t JOIN tenants x ON x.id = t.tenant_id LEFT JOIN users u ON u.id = t.user_id
     WHERE ${where} ORDER BY CASE t.status WHEN 'open' THEN 0 WHEN 'pending' THEN 1 ELSE 2 END, t.id DESC LIMIT 100`,
    params
  );
  const stats = {};
  for (const st of ['open', 'pending', 'resolved', 'closed']) stats[st] = get('SELECT COUNT(*) c FROM support_tickets WHERE status = ?', [st]).c;
  stats.all = get('SELECT COUNT(*) c FROM support_tickets').c;
  res.json({ tickets, stats });
});

router.get('/tickets/:id', opsAuthRequired, (req, res) => {
  const ticket = get(
    `SELECT t.*, x.name AS tenant_name, x.plan, x.plan_status, u.name AS user_name, u.email AS user_email
     FROM support_tickets t JOIN tenants x ON x.id = t.tenant_id LEFT JOIN users u ON u.id = t.user_id WHERE t.id = ?`,
    [Number(req.params.id)]
  );
  if (!ticket) return res.status(404).json({ error: '工单不存在' });
  const messages = all('SELECT * FROM ticket_messages WHERE ticket_id = ? ORDER BY id', [ticket.id]);
  res.json({ ticket, messages });
});

router.patch('/tickets/:id', opsAuthRequired, requireOpsRole('superadmin', 'ops', 'support'), (req, res) => {
  const ticket = get('SELECT * FROM support_tickets WHERE id = ?', [Number(req.params.id)]);
  if (!ticket) return res.status(404).json({ error: '工单不存在' });
  const updates = [];
  const params = [];
  if (req.body.status && ['open', 'pending', 'resolved', 'closed'].includes(req.body.status)) { updates.push('status = ?'); params.push(req.body.status); }
  if (req.body.priority && ['low', 'normal', 'high', 'urgent'].includes(req.body.priority)) { updates.push('priority = ?'); params.push(req.body.priority); }
  if (!updates.length) return res.status(400).json({ error: '没有可更新字段' });
  updates.push("updated_at = datetime('now')");
  params.push(ticket.id);
  run(`UPDATE support_tickets SET ${updates.join(', ')} WHERE id = ?`, params);
  opsAudit(req, 'ticket.update', `ticket:${ticket.id}`, JSON.stringify(req.body));
  res.json({ ok: true });
});

router.post('/tickets/:id/messages', opsAuthRequired, requireOpsRole('superadmin', 'ops', 'support', 'sales'), async (req, res) => {
  const ticket = get('SELECT * FROM support_tickets WHERE id = ?', [Number(req.params.id)]);
  if (!ticket) return res.status(404).json({ error: '工单不存在' });
  const content = String(req.body.content || '').trim().slice(0, 3000);
  if (!content) return res.status(400).json({ error: '请填写回复内容' });
  run('INSERT INTO ticket_messages (ticket_id, sender_type, sender_id, sender_name, content) VALUES (?,?,?,?,?)', [ticket.id, 'platform', req.opsUser.id, req.opsUser.name, content]);
  run("UPDATE support_tickets SET status = 'pending', last_message_at = datetime('now'), updated_at = datetime('now') WHERE id = ?", [ticket.id]);
  await notifyTenant(ticket.tenant_id, 'ticket', '平台回复了你的工单', `工单「${ticket.subject}」有新回复`, { ticketId: ticket.id });
  opsAudit(req, 'ticket.reply', `ticket:${ticket.id}`, content.slice(0, 100));
  res.json({ ok: true });
});

// ---------- referral rewards ----------
router.get('/referrals', opsAuthRequired, (req, res) => {
  res.json(referral.opsOverview());
});
router.patch('/referral-withdrawals/:id', opsAuthRequired, requireOpsRole('superadmin', 'ops', 'finance'), (req, res) => {
  try {
    const w = referral.updateWithdrawal(req.params.id, req.body.status, req.body.note, req.opsUser.id);
    opsAudit(req, 'referral.withdrawal', `withdrawal:${w.id}`, `${w.status} / ¥${(w.amount_cents / 100).toFixed(2)}`);
    res.json({ ok: true, withdrawal: w });
  } catch (e) {
    res.status(e.status || 400).json({ error: e.message });
  }
});

// ---------- platform team ----------
router.get('/team', opsAuthRequired, (req, res) => {
  res.json({ users: all('SELECT id, name, email, role, status, last_login_at, created_at FROM platform_users ORDER BY id') });
});

router.post('/team', opsAuthRequired, requireOpsRole('superadmin'), (req, res) => {
  const b = req.body || {};
  if (!b.name || !b.email || !b.password) return res.status(400).json({ error: '姓名、邮箱、密码不能为空' });
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(b.email)) return res.status(400).json({ error: '邮箱格式不正确' });
  if (get('SELECT id FROM platform_users WHERE email = ?', [String(b.email).toLowerCase()])) return res.status(400).json({ error: '该邮箱已存在' });
  if (!['superadmin', 'ops', 'sales', 'support', 'finance'].includes(b.role)) return res.status(400).json({ error: '角色不合法' });
  const id = run('INSERT INTO platform_users (name, email, password_hash, role) VALUES (?,?,?,?)', [String(b.name).slice(0, 30), String(b.email).toLowerCase(), hashPassword(b.password), b.role]).lastInsertRowid;
  opsAudit(req, 'ops.create', `platform_user:${id}`, b.email);
  res.json({ ok: true, id });
});

router.patch('/team/:id', opsAuthRequired, requireOpsRole('superadmin'), (req, res) => {
  const u = get('SELECT * FROM platform_users WHERE id = ?', [Number(req.params.id)]);
  if (!u) return res.status(404).json({ error: '运营账号不存在' });
  const b = req.body || {};
  const updates = [];
  const params = [];
  if (b.name) { updates.push('name = ?'); params.push(String(b.name).slice(0, 30)); }
  if (b.role && ['superadmin', 'ops', 'sales', 'support', 'finance'].includes(b.role)) { updates.push('role = ?'); params.push(b.role); }
  if (b.status && ['active', 'disabled'].includes(b.status)) { updates.push('status = ?'); params.push(b.status); }
  if (b.password) { updates.push('password_hash = ?'); params.push(hashPassword(b.password)); }
  if (!updates.length) return res.status(400).json({ error: '没有可更新字段' });
  params.push(u.id);
  run(`UPDATE platform_users SET ${updates.join(', ')} WHERE id = ?`, params);
  opsAudit(req, 'ops.update', `platform_user:${u.id}`, JSON.stringify({ ...b, password: undefined }));
  res.json({ ok: true });
});

router.get('/audit-logs', opsAuthRequired, (req, res) => {
  const logs = all(`SELECT l.*, p.name AS user_name FROM platform_audit_logs l LEFT JOIN platform_users p ON p.id = l.platform_user_id ORDER BY l.id DESC LIMIT 200`);
  res.json({ logs });
});

module.exports = router;
