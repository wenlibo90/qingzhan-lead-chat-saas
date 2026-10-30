'use strict';
const express = require('express');
const { get, run, all, json } = require('../db');
const { verifyPassword, hashPassword, signToken, authRequired } = require('../auth');
const { featuresOf, planOf, FEATURES } = require('../plans');
const { publicUser, tenantPublic, sitePublic, audit } = require('../helpers');
const { hit } = require('../services/ratelimit');

const router = express.Router();

router.post('/login', (req, res) => {
  const { email, password } = req.body || {};
  const ip = (req.headers['x-forwarded-for'] || req.ip || '').split(',')[0];
  if (!hit(`login:${ip}`, 15, 60000).ok) return res.status(429).json({ error: '尝试次数过多，请 1 分钟后重试' });
  if (!email || !password) return res.status(400).json({ error: '请输入邮箱和密码' });
  const user = get('SELECT * FROM users WHERE email = ?', [String(email).toLowerCase().trim()]);
  if (!user || !verifyPassword(password, user.password_hash)) {
    return res.status(401).json({ error: '邮箱或密码不正确' });
  }
  if (user.status !== 'active') return res.status(403).json({ error: '账号已被停用' });
  const tenant = get('SELECT * FROM tenants WHERE id = ?', [user.tenant_id]);
  if (!tenant || tenant.status !== 'active') return res.status(403).json({ error: '所属租户已停用' });
  run("UPDATE users SET last_login_at = datetime('now') WHERE id = ?", [user.id]);
  run('INSERT INTO audit_logs (tenant_id, user_id, action, target, detail, ip) VALUES (?,?,?,?,?,?)', [tenant.id, user.id, 'login', user.email, '登录成功', ip]);
  res.json({
    token: signToken(user),
    user: publicUser(user),
    tenant: tenantPublic(tenant),
    plan: planOf(tenant.plan),
    features: featuresOf(tenant.plan).map((f) => ({ code: f, name: FEATURES[f] }))
  });
});

router.get('/me', authRequired, (req, res) => {
  const sites = all('SELECT * FROM sites WHERE tenant_id = ? ORDER BY id', [req.tenant.id]);
  res.json({
    user: publicUser(req.user),
    tenant: tenantPublic(req.tenant),
    plan: planOf(req.tenant.plan),
    features: featuresOf(req.tenant.plan).map((f) => ({ code: f, name: FEATURES[f] })),
    featureCodes: featuresOf(req.tenant.plan),
    sites: sites.map((s) => sitePublic(s, req.tenant.plan))
  });
});

router.post('/password', authRequired, (req, res) => {
  const { oldPassword, newPassword } = req.body || {};
  if (!verifyPassword(oldPassword || '', req.user.password_hash)) return res.status(400).json({ error: '原密码不正确' });
  if (!newPassword || String(newPassword).length < 6) return res.status(400).json({ error: '新密码至少 6 位' });
  run('UPDATE users SET password_hash = ? WHERE id = ?', [hashPassword(newPassword), req.user.id]);
  audit(req, 'user.password', req.user.email, '修改登录密码');
  res.json({ ok: true });
});

router.get('/users-lite', authRequired, (req, res) => {
  const users = all('SELECT id, name, avatar, role, status FROM users WHERE tenant_id = ? AND status = ? ORDER BY id', [req.tenant.id, 'active']);
  res.json({ users });
});

module.exports = router;
