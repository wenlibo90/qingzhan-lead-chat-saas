'use strict';
const express = require('express');
const crypto = require('node:crypto');
const { get, run } = require('../db');
const { signToken } = require('../auth');
const { publicUser, tenantPublic } = require('../helpers');
const { featuresOf, planOf, FEATURES } = require('../plans');
const { hit } = require('../services/ratelimit');
const { createWorkspace, assessRisk } = require('../services/provision');

const router = express.Router();
const SECRET = process.env.APP_SECRET || 'qingzhan-leadchat-dev-secret-2026';

function clientIp(req) {
  return String(req.headers['x-forwarded-for'] || req.socket.remoteAddress || req.ip || '').split(',')[0].trim().replace('::ffff:', '');
}
function codeHash(phone, code) {
  return crypto.createHmac('sha256', SECRET).update(`${phone}:${code}`).digest('hex');
}
function validPhone(phone) {
  return /^1[3-9]\d{9}$/.test(String(phone || ''));
}

router.post('/send-code', async (req, res) => {
  const phone = String(req.body.phone || '').trim();
  const ip = clientIp(req);
  if (!validPhone(phone)) return res.status(400).json({ error: '请输入正确的手机号' });
  if (!hit(`sms:phone:${phone}`, 3, 600000).ok) return res.status(429).json({ error: '验证码发送过于频繁，请 10 分钟后再试' });
  if (!hit(`sms:ip:${ip}`, 12, 3600000).ok) return res.status(429).json({ error: '当前网络请求过多，请稍后再试' });
  const existing = get('SELECT id FROM accounts WHERE phone = ?', [phone]);
  if (existing) return res.status(409).json({ error: '该手机号已注册，请直接登录', code: 'PHONE_EXISTS' });
  const code = String(Math.floor(100000 + Math.random() * 900000));
  run("INSERT INTO sms_codes (phone, code_hash, purpose, ip, expires_at) VALUES (?,?,?,?,datetime('now','+5 minutes'))", [phone, codeHash(phone, code), 'signup', ip]);
  const webhook = process.env.SMS_WEBHOOK;
  const devMode = process.env.NODE_ENV !== 'production' && process.env.SIGNUP_DEV_CODE !== 'false';
  if (!webhook && !devMode) return res.status(503).json({ error: '短信服务未配置，请联系管理员' });
  if (webhook) {
    try {
      await fetch(webhook, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, code, scene: 'signup' }),
        signal: AbortSignal.timeout(2500)
      });
    } catch {
      return res.status(502).json({ error: '短信服务暂时不可用，请稍后再试' });
    }
    return res.json({ ok: true, expires_in: 300, message: '验证码已发送' });
  }
  res.json({
    ok: true,
    expires_in: 300,
    dev_code: code,
    message: '演示环境验证码已生成',
    hint: '生产环境接入 SMS_WEBHOOK 后不再返回验证码'
  });
});

router.post('/register', (req, res) => {
  const b = req.body || {};
  const phone = String(b.phone || '').trim();
  const code = String(b.code || '').trim();
  const password = String(b.password || '');
  const name = String(b.name || `用户${phone.slice(-4)}`).trim().slice(0, 30);
  const workspaceName = String(b.workspaceName || '我的工作空间').trim().slice(0, 60);
  const ip = clientIp(req);
  if (!validPhone(phone)) return res.status(400).json({ error: '请输入正确的手机号' });
  if (!/^\d{6}$/.test(code)) return res.status(400).json({ error: '请输入 6 位验证码' });
  if (password.length < 6) return res.status(400).json({ error: '密码至少 6 位' });
  if (!hit(`signup:${ip}`, 8, 3600000).ok) return res.status(429).json({ error: '注册请求过多，请稍后再试' });
  if (get('SELECT id FROM accounts WHERE phone = ?', [phone])) return res.status(409).json({ error: '该手机号已注册，请直接登录' });
  const row = get("SELECT * FROM sms_codes WHERE phone = ? AND purpose = 'signup' AND used = 0 ORDER BY id DESC LIMIT 1", [phone]);
  if (!row) return res.status(400).json({ error: '请先获取验证码' });
  if (new Date(row.expires_at.replace(' ', 'T') + 'Z').getTime() < Date.now()) return res.status(400).json({ error: '验证码已过期，请重新获取' });
  if (row.attempts >= 5) return res.status(429).json({ error: '验证码错误次数过多，请重新获取' });
  if (row.code_hash !== codeHash(phone, code)) {
    run('UPDATE sms_codes SET attempts = attempts + 1 WHERE id = ?', [row.id]);
    return res.status(400).json({ error: '验证码不正确' });
  }
  run('UPDATE sms_codes SET used = 1 WHERE id = ?', [row.id]);
  try {
    const result = createWorkspace({
      workspaceName, ownerName: name, phone, password,
      plan: 'pro', planStatus: 'trialing', source: 'self_signup', ip, trialDays: 14, withSite: false
    });
    const token = signToken(result.user);
    run('INSERT INTO audit_logs (tenant_id, user_id, action, target, detail, ip) VALUES (?,?,?,?,?,?)', [result.tenant.id, result.user.id, 'signup', phone, '自助注册并创建工作空间', ip]);
    run('INSERT INTO platform_audit_logs (action, target, detail, ip) VALUES (?,?,?,?)', ['account.signup', `account:${result.account.id}`, `${workspaceName} / ${phone}`, ip]);
    res.json({
      ok: true,
      token,
      user: publicUser(result.user),
      account: { id: result.account.id, name: result.account.name, phone: result.account.phone },
      tenant: tenantPublic(result.tenant),
      plan: planOf(result.tenant.plan),
      features: featuresOf(result.tenant.plan).map((f) => ({ code: f, name: FEATURES[f] })),
      has_site: false,
      next: '/admin/#/onboarding',
      trial_ends_at: result.tenant.trial_ends_at
    });
  } catch (err) {
    req.log && req.log.error(err);
    return res.status(500).json({ error: '注册失败，请稍后再试' });
  }
});

module.exports = router;
