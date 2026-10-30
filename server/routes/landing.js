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
  const { name, phone, email, company, website, size, channel, message, utm_source, utm_medium, utm_campaign } = req.body || {};
  if (!name || !phone) return res.status(400).json({ error: '请填写称呼和手机号' });
  if (!/^1[3-9]\d{9}$/.test(String(phone))) return res.status(400).json({ error: '手机号格式不正确' });
  const id = run(
    `INSERT INTO applications (name, phone, email, company, website, size, channel, message, source, utm_source, utm_medium, utm_campaign, ip)
     VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)`,
    [String(name).slice(0, 40), String(phone).slice(0, 20), String(email || '').slice(0, 100), String(company || '').slice(0, 80),
      String(website || '').slice(0, 120), String(size || '').slice(0, 40), String(channel || '').slice(0, 40),
      String(message || '').slice(0, 1000), 'landing', String(utm_source || '').slice(0, 60), String(utm_medium || '').slice(0, 60), String(utm_campaign || '').slice(0, 60), ip]
  ).lastInsertRowid;
  run('INSERT INTO platform_audit_logs (action, target, detail, ip) VALUES (?,?,?,?)', ['application.create', `application:${id}`, `${name} / ${phone}`, ip]);
  res.json({ ok: true, id, message: '提交成功，我们会在 1 个工作日内联系你' });
});

module.exports = router;
