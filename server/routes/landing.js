'use strict';
const express = require('express');
const { get, run } = require('../db');
const { PLANS, FEATURES } = require('../plans');
const { hit } = require('../services/ratelimit');
const { notifyTenant } = require('../services/notify');

const router = express.Router();

router.get('/plans', (req, res) => {
  res.json({ plans: PLANS, features: FEATURES });
});

router.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'qingzhan-lead-chat', time: new Date().toISOString() });
});

router.post('/demo-request', (req, res) => {
  const ip = (req.headers['x-forwarded-for'] || req.ip || '').split(',')[0];
  if (!hit(`demo:${ip}`, 8, 60000).ok) return res.status(429).json({ error: '提交过于频繁，请稍后再试' });
  const { name, phone, company, website, size, channel } = req.body || {};
  if (!name || !phone) return res.status(400).json({ error: '请填写称呼和手机号' });
  if (!/^1[3-9]\d{9}$/.test(String(phone))) return res.status(400).json({ error: '手机号格式不正确' });
  const tenant = get("SELECT * FROM tenants ORDER BY id LIMIT 1");
  const site = get('SELECT * FROM sites WHERE tenant_id = ? ORDER BY id LIMIT 1', [tenant.id]);
  const id = run(
    `INSERT INTO leads (tenant_id, site_id, source, name, phone, company, business_type, requirement, status, score, tags)
     VALUES (?,?,?,?,?,?,?,?,?,?,?)`,
    [tenant.id, site.id, 'landing', String(name).slice(0, 40), String(phone).slice(0, 20), String(company || '').slice(0, 80),
      String(size || '').slice(0, 40), `落地页咨询：${String(website || '').slice(0, 100)} ${String(channel || '').slice(0, 80)}`.trim(),
      'new', 55, JSON.stringify(['官网落地页'])]
  ).lastInsertRowid;
  notifyTenant(tenant.id, 'lead', '官网收到新的试用申请', `${name}（${phone}）${company ? ' · ' + company : ''}`, { leadId: id, siteId: site.id }).catch(() => {});
  run('INSERT INTO notifications (tenant_id, user_id, type, title, content, payload) VALUES (?,?,?,?,?,?)',
    [tenant.id, null, 'lead', '落地页试用申请', `${name}（${phone}）申请试用`, JSON.stringify({ leadId: id })]);
  res.json({ ok: true, message: '提交成功，我们会在 1 个工作日内联系你' });
});

module.exports = router;
