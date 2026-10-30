'use strict';
const express = require('express');
const { get, run, all } = require('../db');
const { verifyPassword, hashPassword, signToken, authRequired } = require('../auth');
const { featuresOf, planOf, FEATURES } = require('../plans');
const { publicUser, tenantPublic, sitePublic, audit, publicBase } = require('../helpers');
const { hit } = require('../services/ratelimit');

const router = express.Router();

function accountPublic(account) {
  if (!account) return null;
  return { id: account.id, name: account.name, email: account.email, phone: account.phone, status: account.status, risk_score: account.risk_score, created_at: account.created_at };
}

function membershipsOf(accountId) {
  return all(
    `SELECT u.id AS user_id, u.role, u.name AS user_name, t.id AS tenant_id, t.name AS tenant_name, t.plan, t.plan_status, t.status, t.trial_ends_at
     FROM users u JOIN tenants t ON t.id = u.tenant_id
     WHERE u.account_id = ? AND u.status = 'active' ORDER BY u.id`,
    [accountId]
  );
}

router.post('/login', (req, res) => {
  const { email, phone, identifier, password } = req.body || {};
  const loginName = String(identifier || email || phone || '').trim();
  const ip = (req.headers['x-forwarded-for'] || req.ip || '').split(',')[0];
  if (!hit(`login:${ip}`, 15, 60000).ok) return res.status(429).json({ error: '尝试次数过多，请 1 分钟后重试' });
  if (!loginName || !password) return res.status(400).json({ error: '请输入手机号或邮箱，以及密码' });
  const normalized = loginName.toLowerCase();
  let account = get('SELECT * FROM accounts WHERE email = ? OR phone = ?', [normalized, loginName]);
  let user = null;
  if (!account) {
    user = get('SELECT * FROM users WHERE lower(email) = ? OR phone = ? ORDER BY id LIMIT 1', [normalized, loginName]);
    if (user && user.account_id) account = get('SELECT * FROM accounts WHERE id = ?', [user.account_id]);
  }
  const storedHash = account ? account.password_hash : user ? user.password_hash : null;
  if (!account && !user) {
    const platform = get('SELECT id FROM platform_users WHERE email = ? AND status = ?', [normalized, 'active']);
    if (platform) return res.status(403).json({ error: '这是平台运营账号，请前往 /ops/ 登录', code: 'OPS_ACCOUNT', login_url: '/ops/' });
    return res.status(401).json({ error: '账号或密码不正确' });
  }
  if (!verifyPassword(password, storedHash)) return res.status(401).json({ error: '账号或密码不正确' });
  if (account && account.status !== 'active') return res.status(403).json({ error: '登录账号已被停用' });
  if (user && user.status !== 'active') return res.status(403).json({ error: '账号已被停用' });

  const memberships = account ? membershipsOf(account.id) : [];
  if (!memberships.length) return res.status(403).json({ error: '该账号还没有工作空间' });
  const target = memberships.find((m) => m.status === 'active') || memberships[0];
  user = get('SELECT * FROM users WHERE id = ?', [target.user_id]);
  const tenant = get('SELECT * FROM tenants WHERE id = ?', [target.tenant_id]);
  if (!tenant || tenant.status !== 'active') return res.status(403).json({ error: '所属工作空间已停用' });
  run("UPDATE users SET last_login_at = datetime('now') WHERE id = ?", [user.id]);
  if (account) run("UPDATE accounts SET last_login_at = datetime('now') WHERE id = ?", [account.id]);
  run('INSERT INTO audit_logs (tenant_id, user_id, action, target, detail, ip) VALUES (?,?,?,?,?,?)', [tenant.id, user.id, 'login', user.email || user.phone || '', '登录成功', ip]);
  res.json({
    token: signToken(user),
    user: publicUser(user),
    account: accountPublic(account),
    tenant: tenantPublic(tenant),
    plan: planOf(tenant.plan),
    features: featuresOf(tenant.plan).map((f) => ({ code: f, name: FEATURES[f] })),
    workspaces: memberships,
    trial: { status: tenant.plan_status, ends_at: tenant.trial_ends_at }
  });
});

router.get('/me', authRequired, (req, res) => {
  const sites = all('SELECT * FROM sites WHERE tenant_id = ? ORDER BY is_sandbox, id', [req.tenant.id]);
  res.json({
    user: publicUser(req.user),
    account: accountPublic(req.account),
    tenant: tenantPublic(req.tenant),
    plan: planOf(req.tenant.plan),
    features: featuresOf(req.tenant.plan).map((f) => ({ code: f, name: FEATURES[f] })),
    featureCodes: featuresOf(req.tenant.plan),
    sites: sites.map((s) => sitePublic(s, req.tenant.plan, publicBase(req))),
    workspaces: req.account ? membershipsOf(req.account.id) : [],
    trial: { status: req.tenant.plan_status, started_at: req.tenant.trial_started_at, ends_at: req.tenant.trial_ends_at }
  });
});

router.get('/workspaces', authRequired, (req, res) => {
  res.json({ workspaces: req.account ? membershipsOf(req.account.id) : [] });
});

router.post('/switch', authRequired, (req, res) => {
  const tenantId = Number(req.body.tenantId);
  if (!req.account) return res.status(400).json({ error: '账号信息缺失' });
  const membership = get('SELECT * FROM users WHERE account_id = ? AND tenant_id = ? AND status = ?', [req.account.id, tenantId, 'active']);
  if (!membership) return res.status(404).json({ error: '你没有该工作空间的权限' });
  const tenant = get('SELECT * FROM tenants WHERE id = ? AND status = ?', [tenantId, 'active']);
  if (!tenant) return res.status(403).json({ error: '工作空间已停用' });
  res.json({
    token: signToken(membership),
    user: publicUser(membership),
    tenant: tenantPublic(tenant),
    plan: planOf(tenant.plan),
    features: featuresOf(tenant.plan).map((f) => ({ code: f, name: FEATURES[f] }))
  });
});

router.post('/password', authRequired, (req, res) => {
  const { oldPassword, newPassword } = req.body || {};
  const stored = req.account ? req.account.password_hash : req.user.password_hash;
  if (!verifyPassword(oldPassword || '', stored)) return res.status(400).json({ error: '原密码不正确' });
  if (!newPassword || String(newPassword).length < 6) return res.status(400).json({ error: '新密码至少 6 位' });
  const hash = hashPassword(newPassword);
  if (req.account) {
    run('UPDATE accounts SET password_hash = ? WHERE id = ?', [hash, req.account.id]);
    run('UPDATE users SET password_hash = ? WHERE account_id = ?', [hash, req.account.id]);
  } else {
    run('UPDATE users SET password_hash = ? WHERE id = ?', [hash, req.user.id]);
  }
  audit(req, 'user.password', req.user.email || req.user.phone || '', '修改登录密码');
  res.json({ ok: true });
});

router.get('/users-lite', authRequired, (req, res) => {
  const users = all('SELECT id, name, avatar, role, status FROM users WHERE tenant_id = ? AND status = ? ORDER BY id', [req.tenant.id, 'active']);
  res.json({ users });
});

module.exports = router;
