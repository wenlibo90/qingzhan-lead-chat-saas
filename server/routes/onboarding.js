'use strict';
const express = require('express');
const { all, get } = require('../db');
const { authRequired } = require('../auth');
const { sitePublic, publicBase } = require('../helpers');

const router = express.Router();
router.use(authRequired);

router.get('/status', (req, res) => {
  const sites = all('SELECT * FROM sites WHERE tenant_id = ? AND is_sandbox = 0 ORDER BY id', [req.tenant.id]);
  const prod = sites[0] || null;
  const prodIds = sites.map((s) => s.id);
  const placeholders = prodIds.length ? prodIds.map(() => '?').join(',') : '0';
  const conversations = prodIds.length ? get(`SELECT COUNT(*) c FROM conversations WHERE tenant_id = ? AND site_id IN (${placeholders})`, [req.tenant.id, ...prodIds]).c : 0;
  const leads = prodIds.length ? get(`SELECT COUNT(*) c FROM leads WHERE tenant_id = ? AND site_id IN (${placeholders})`, [req.tenant.id, ...prodIds]).c : 0;
  const visitors = prodIds.length ? get(`SELECT COUNT(*) c FROM visitors WHERE tenant_id = ? AND site_id IN (${placeholders})`, [req.tenant.id, ...prodIds]).c : 0;
  const team = get('SELECT COUNT(*) c FROM users WHERE tenant_id = ?', [req.tenant.id]).c;
  const installed = !!(prod && prod.installed_at);
  const steps = [
    { key: 'site', title: '添加你的网站', desc: '在站点管理中添加网站，拿到 Site Key', done: !!prod },
    { key: 'install', title: '把 JS 安装到自己的网站', desc: '复制代码粘贴到 body 末尾，检测到后自动标记完成', done: installed },
    { key: 'chat', title: '收到第一条会话', desc: '访客打开挂件并发起咨询', done: conversations > 0 },
    { key: 'lead', title: '收到第一条线索', desc: '表单、离线留言或聊天转化产生线索', done: leads > 0 },
    { key: 'team', title: '邀请一位客服', desc: '多人协作接待，避免消息无人响应', done: team > 1 }
  ];
  res.json({
    complete: installed && conversations > 0,
    progress: Math.round((steps.filter((s) => s.done).length / steps.length) * 100),
    plan: { code: req.tenant.plan, status: req.tenant.plan_status, trial_ends_at: req.tenant.trial_ends_at },
    production_site: prod ? sitePublic(prod, req.tenant.plan, publicBase(req)) : null,
    site_count: sites.length,
    counts: { conversations, leads, visitors, team },
    steps
  });
});

module.exports = router;
