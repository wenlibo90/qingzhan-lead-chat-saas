'use strict';
const express = require('express');
const crypto = require('node:crypto');
const { all, get, run, json } = require('../db');
const { hasFeature, planOf, featuresOf, FEATURES } = require('../plans');
const { locate } = require('../services/geo');
const { onlineAgentCount, visitorCount } = require('../services/presence');
const { notifyTenant } = require('../services/notify');
const { hit } = require('../services/ratelimit');
const { recalcVisitorIntent } = require('../helpers');
const { upload, uploadRecording, publicUrl } = require('../upload');
const ai = require('../services/ai');

const router = express.Router();

function clientIp(req) {
  return String(req.headers['x-forwarded-for'] || req.socket.remoteAddress || req.ip || '').split(',')[0].trim().replace('::ffff:', '');
}

function parseUA(ua = '') {
  const u = String(ua);
  let browser = 'Other';
  if (/MicroMessenger/i.test(u)) browser = 'WeChat';
  else if (/Edg\//i.test(u)) browser = 'Edge';
  else if (/Chrome\//i.test(u)) browser = 'Chrome';
  else if (/Safari\//i.test(u) && /Version\//i.test(u)) browser = 'Safari';
  else if (/Firefox\//i.test(u)) browser = 'Firefox';
  let os = 'Other';
  if (/Windows/i.test(u)) os = 'Windows';
  else if (/iPhone|iPad|iPod/i.test(u)) os = 'iOS';
  else if (/Android/i.test(u)) os = 'Android';
  else if (/Mac OS X/i.test(u)) os = 'macOS';
  else if (/Linux/i.test(u)) os = 'Linux';
  const device = /iPad|Tablet/i.test(u) ? 'tablet' : /Mobile|Android|iPhone/i.test(u) ? 'mobile' : 'desktop';
  return { browser, os, device };
}

function sourceFrom(referrer, utmSource, selfHosts = []) {
  if (utmSource) return String(utmSource).slice(0, 40);
  if (!referrer) return 'direct';
  try {
    const host = new URL(referrer).hostname.replace(/^www\./, '').toLowerCase();
    if (!host) return 'direct';
    const self = selfHosts.map((h) => String(h || '').replace(/^www\./, '').toLowerCase()).filter(Boolean);
    if (self.some((h) => host === h || host.endsWith('.' + h) || h.endsWith('.' + host))) return 'direct';
    if (host === 'localhost' || host === '::1' || /^127\./.test(host)) return 'local';
    const map = {
      'baidu.com': 'baidu', 'google.com': 'google', 'bing.com': 'bing', 'sogou.com': 'sogou',
      'so.com': '360', 'zhihu.com': 'zhihu', 'weixin.qq.com': 'wechat', 'douyin.com': 'douyin',
      'xiaohongshu.com': 'xiaohongshu', 'weibo.com': 'weibo'
    };
    for (const [k, v] of Object.entries(map)) if (host.endsWith(k)) return v;
    return host;
  } catch {
    return 'referral';
  }
}

function keywordFrom(referrer) {
  if (!referrer) return null;
  try {
    const u = new URL(referrer);
    const wd = u.searchParams.get('wd') || u.searchParams.get('q') || u.searchParams.get('word') || u.searchParams.get('query');
    return wd ? wd.slice(0, 80) : null;
  } catch {
    return null;
  }
}

function siteByKey(key) {
  if (!key) return null;
  return get('SELECT s.*, t.plan AS tenant_plan, t.name AS tenant_name, t.brand_name, t.brand_color, t.hide_branding, t.status AS tenant_status FROM sites s JOIN tenants t ON t.id = s.tenant_id WHERE s.site_key = ?', [String(key)]);
}

function blockedCheck(site, ip, vid) {
  if (!site || site.blocked) return true;
  if (site.tenant_status !== 'active') return true;
  if (!hasFeature(site.tenant_plan, 'blacklist')) return false;
  const rows = all('SELECT * FROM blacklist WHERE tenant_id = ? AND (site_id = ? OR site_id IS NULL)', [site.tenant_id, site.id]);
  return rows.some((b) => (b.type === 'ip' && b.value === ip) || (b.type === 'visitor' && b.value === vid));
}

async function upsertVisitor(site, req, data = {}) {
  const ip = clientIp(req);
  const ua = parseUA(req.headers['user-agent']);
  const device = data.device || {};
  const vid = data.vid || `v_${crypto.randomBytes(8).toString('hex')}`;
  const fingerprint = data.fingerprint || null;
  let visitor = get('SELECT * FROM visitors WHERE tenant_id = ? AND site_id = ? AND vid = ?', [site.tenant_id, site.id, vid]);
  if (!visitor && fingerprint) {
    const candidate = get(
      'SELECT * FROM visitors WHERE tenant_id = ? AND site_id = ? AND fingerprint = ? AND merged_into IS NULL ORDER BY last_seen DESC LIMIT 1',
      [site.tenant_id, site.id, fingerprint]
    );
    if (candidate && data.vid) {
      return { visitor: candidate, merged: true, vid: candidate.vid };
    }
  }
  if (!visitor) {
    const geo = await locate(ip);
    const referrer = data.referrer || req.headers.referer || '';
    const selfHosts = [site.domain, String(req.headers['x-forwarded-host'] || req.headers.host || '').split(',')[0].split(':')[0]];
    const source = data.utm_source || sourceFrom(referrer, '', selfHosts);
    const info = {
      tenant_id: site.tenant_id, site_id: site.id, vid, fingerprint,
      ip, country: geo.country, province: geo.province, city: geo.city,
      device: device.type || ua.device, browser: device.browser || ua.browser, os: device.os || ua.os,
      language: device.language || req.headers['accept-language'] || 'zh-CN',
      screen: device.screen || '',
      source, utm_source: data.utm_source || null, utm_medium: data.utm_medium || null,
      utm_campaign: data.utm_campaign || null, utm_term: data.utm_term || null, utm_content: data.utm_content || null,
      referrer: String(referrer).slice(0, 500), keyword: data.utm_term || keywordFrom(referrer),
      landing_page: data.url || '', tracking_consent: data.consent === false ? 0 : 1
    };
    const inserted = run(
      `INSERT OR IGNORE INTO visitors (tenant_id, site_id, vid, fingerprint, ip, country, province, city, device, browser, os, language, screen, source, utm_source, utm_medium, utm_campaign, utm_term, utm_content, referrer, keyword, landing_page, tracking_consent)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      [info.tenant_id, info.site_id, info.vid, info.fingerprint, info.ip, info.country, info.province, info.city,
        info.device, info.browser, info.os, info.language, info.screen, info.source, info.utm_source, info.utm_medium,
        info.utm_campaign, info.utm_term, info.utm_content, info.referrer, info.keyword, info.landing_page, info.tracking_consent]
    );
    if (!inserted.changes) {
      visitor = get('SELECT * FROM visitors WHERE tenant_id = ? AND site_id = ? AND vid = ?', [site.tenant_id, site.id, vid]);
      if (visitor) return { visitor, merged: false, vid: visitor.vid };
      throw new Error('访客创建失败');
    }
    visitor = get('SELECT * FROM visitors WHERE id = ?', [inserted.lastInsertRowid]);
  } else {
    run(
      `UPDATE visitors SET last_seen = datetime('now'), ip = ?, device = COALESCE(NULLIF(?, ''), device),
       browser = COALESCE(NULLIF(?, ''), browser), os = COALESCE(NULLIF(?, ''), os),
       tracking_consent = ? WHERE id = ?`,
      [ip, device.type || '', device.browser || '', device.os || '', data.consent === false ? 0 : data.consent === true ? 1 : visitor.tracking_consent, visitor.id]
    );
    if (data.consent === false && visitor.tracking_consent !== 0) {
      visitor.tracking_consent = 0;
    }
  }
  return { visitor, merged: false, vid: visitor.vid };
}

function sanitizeWidget(site, plan) {
  const w = json(site.widget_config, {});
  const licensed = {
    triggers: hasFeature(plan, 'triggers'),
    forms: hasFeature(plan, 'forms'),
    knowledge: hasFeature(plan, 'knowledge'),
    recording: hasFeature(plan, 'recording'),
    rating: hasFeature(plan, 'rating'),
    announcement: hasFeature(plan, 'announcement'),
    compliance: true,
    aiBot: hasFeature(plan, 'ai_bot'),
    translation: hasFeature(plan, 'translation'),
    whitelabel: hasFeature(plan, 'whitelabel')
  };
  return {
    primaryColor: w.primaryColor || '#2563eb',
    position: w.position || 'right',
    offsetBottom: Number(w.offsetBottom ?? 24),
    offsetSide: Number(w.offsetSide ?? 24),
    buttonSize: Math.min(80, Math.max(40, Number(w.buttonSize ?? 58))),
    icon: w.icon || 'headset',
    animation: w.animation || 'breath',
    mobile: w.mobile || { size: 52, offsetBottom: 18, offsetSide: 14 },
    title: w.title || '在线客服',
    agentName: w.agentName || '客服',
    welcome: w.welcome || '您好，请问有什么可以帮您？',
    subtitle: w.subtitle || '通常 1 分钟内回复',
    offlineText: w.offlineText || '当前客服不在线，您可以留言。',
    offlineEnabled: !!w.offlineEnabled,
    prechatEnabled: licensed.forms && !!w.prechatEnabled,
    prechatFormId: licensed.forms ? w.prechatFormId : null,
    faqEnabled: licensed.knowledge && w.faqEnabled !== false,
    recordingEnabled: licensed.recording && !!w.recordingEnabled,
    ratingEnabled: licensed.rating && w.ratingEnabled !== false,
    showBranding: hasFeature(plan, 'whitelabel') ? false : w.showBranding !== false,
    businessHours: w.businessHours || '09:00-21:00',
    aiEnabled: licensed.aiBot && !!w.aiEnabled,
    aiName: w.aiName || 'AI 助手',
    locale: ['zh-CN', 'zh-TW', 'en', 'ja', 'ko'].includes(w.locale) ? w.locale : 'zh-CN',
    languages: licensed.translation ? (w.languages || ['zh-CN', 'en-US']) : ['zh-CN'],
    compliance: {
      enabled: !!site.compliance_enabled,
      text: '',
      policyUrl: '',
      required: !!(w.compliance && w.compliance.required)
    },
    licensed,
    theme: w.theme || 'light',
    quickReplies: w.quickReplies || ['想了解价格', '怎么接入', '预约演示']
  };
}

router.get('/config', async (req, res) => {
  const site = siteByKey(req.query.key);
  if (!site) return res.status(404).json({ error: '站点不存在，请检查 site key' });
  if (site.blocked || site.tenant_status !== 'active') return res.status(403).json({ error: '站点已停用' });
  const plan = site.tenant_plan;
  const ip = clientIp(req);
  if (site.is_sandbox) {
    run("UPDATE sites SET last_widget_ping_at = datetime('now') WHERE id = ?", [site.id]);
  } else {
    run("UPDATE sites SET installed_at = COALESCE(installed_at, datetime('now')), last_widget_ping_at = datetime('now') WHERE id = ?", [site.id]);
  }
  const visitor = req.query.vid
    ? get('SELECT * FROM visitors WHERE tenant_id = ? AND site_id = ? AND vid = ?', [site.tenant_id, site.id, req.query.vid])
    : null;
  const blocked = blockedCheck(site, ip, visitor ? visitor.vid : '');
  const widget = sanitizeWidget(site, plan);
  const licensed = widget.licensed;

  let faqs = [];
  if (licensed.knowledge) {
    const cats = all('SELECT * FROM faq_categories WHERE site_id = ? ORDER BY sort', [site.id]);
    faqs = cats.map((c) => ({
      id: c.id,
      name: c.name,
      items: all('SELECT id, question, answer FROM faqs WHERE site_id = ? AND category_id = ? AND enabled = 1 ORDER BY sort', [site.id, c.id])
    }));
    const files = all('SELECT id, name, file_url AS url, size, type FROM knowledge_files WHERE site_id = ? ORDER BY id DESC LIMIT 20', [site.id]);
    if (files.length) faqs.push({ id: 'files', name: '资料下载', items: files.map((f) => ({ id: `f${f.id}`, question: f.name, answer: '', file: f })) });
  }

  let forms = {};
  if (licensed.forms) {
    const raw = all('SELECT * FROM forms WHERE site_id = ? AND enabled = 1', [site.id]);
    forms = {
      prechat: raw.find((f) => f.id === widget.prechatFormId) || null,
      offline: raw.find((f) => f.type === 'offline') || null,
      all: raw.map((f) => ({ ...f, fields: json(f.fields, []) }))
    };
    if (forms.prechat) forms.prechat.fields = json(forms.prechat.fields, []);
    if (forms.offline) forms.offline.fields = json(forms.offline.fields, []);
  }

  let triggers = [];
  if (licensed.triggers) {
    triggers = all('SELECT id, name, conditions, actions FROM rules WHERE site_id = ? AND type = ? AND enabled = 1 ORDER BY priority, id', [site.id, 'trigger']).map((r) => ({
      id: r.id, name: r.name, conditions: json(r.conditions, {}), actions: json(r.actions, {})
    }));
  }

  const announcement = licensed.announcement
    ? all('SELECT id, content, position, link, link_text, bg_color FROM announcements WHERE site_id = ? AND enabled = 1 ORDER BY id DESC LIMIT 1', [site.id])[0] || null
    : null;

  const online = onlineAgentCount(site.tenant_id) > 0 || withinBusinessHours(widget.businessHours);

  res.json({
    site: { id: site.id, name: site.name, domain: site.domain, key: site.site_key },
    plan: { code: plan, name: planOf(plan).name, features: featuresOf(plan).map((f) => ({ code: f, name: FEATURES[f] })) },
    widget,
    online,
    agentsOnline: onlineAgentCount(site.tenant_id),
    visitorsOnline: visitorCount(site.id),
    announcement,
    faqs,
    forms,
    triggers,
    blocked,
    compliance: widget.compliance,
    branding: {
      hide: !!site.hide_branding || hasFeature(plan, 'whitelabel'),
      name: site.brand_name || site.tenant_name,
      color: site.brand_color || '#2563eb'
    },
    visitor: visitor ? {
      vid: visitor.vid,
      tracking_consent: !!visitor.tracking_consent,
      name: visitor.name,
      phone: visitor.phone,
      intent_level: visitor.intent_level
    } : null,
    server_time: new Date().toISOString()
  });
});

function withinBusinessHours(range) {
  try {
    const [start, end] = String(range || '09:00-21:00').split('-').map((s) => Number(s.split(':')[0]));
    const hour = new Date().getHours();
    return hour >= start && hour <= end;
  } catch {
    return true;
  }
}

router.post('/consent', (req, res) => {
  const site = siteByKey(req.body.key);
  if (!site) return res.status(404).json({ error: '站点不存在' });
  const { vid, consent } = req.body;
  if (vid) {
    run('UPDATE visitors SET tracking_consent = ? WHERE tenant_id = ? AND site_id = ? AND vid = ?', [consent ? 1 : 0, site.tenant_id, site.id, vid]);
  }
  res.json({ ok: true, tracking: !!consent });
});

router.post('/session', async (req, res) => {
  const site = siteByKey(req.body.key);
  if (!site) return res.status(404).json({ error: '站点不存在' });
  const ip = clientIp(req);
  if (!hit(`session:${site.id}:${ip}`, 40, 60000).ok) return res.status(429).json({ error: '请求过于频繁' });
  const data = req.body || {};
  if (blockedCheck(site, ip, data.vid)) return res.json({ blocked: true });
  const { visitor } = await upsertVisitor(site, req, data);
  const sid = run(
    `INSERT INTO visitor_sessions (tenant_id, site_id, visitor_id, entry_page, exit_page, referrer, utm_source, device)
     VALUES (?,?,?,?,?,?,?,?)`,
    [site.tenant_id, site.id, visitor.id, data.url || '', data.url || '', data.referrer || '', data.utm_source || '', visitor.device]
  ).lastInsertRowid;
  run("UPDATE visitors SET visit_count = visit_count + 1, last_seen = datetime('now') WHERE id = ?", [visitor.id]);
  res.json({ vid: visitor.vid, sid, blocked: false, consent: !!visitor.tracking_consent, site: { id: site.id }, visitorId: visitor.id });
});

router.post('/track', async (req, res) => {
  const body = req.body || {};
  const site = siteByKey(body.key);
  if (!site) return res.status(404).json({ error: '站点不存在' });
  const ip = clientIp(req);
  if (!hit(`track:${site.id}:${ip}`, 240, 60000).ok) return res.status(429).json({ error: '请求过于频繁' });
  if (blockedCheck(site, ip, body.vid)) return res.json({ blocked: true });
  if (!site.tracking_enabled) return res.json({ disabled: true, reason: '站点已关闭行为采集' });

  const { visitor } = await upsertVisitor(site, req, body);
  const consent = body.consent === false ? false : !!visitor.tracking_consent;
  if (!consent) {
    return res.json({ vid: visitor.vid, consent: false, stored: false, message: '访客已拒绝行为追踪，仅保留匿名会话能力' });
  }

  let sid = body.sid ? Number(body.sid) : null;
  if (sid) {
    const existing = get('SELECT * FROM visitor_sessions WHERE id = ? AND visitor_id = ?', [sid, visitor.id]);
    if (!existing) sid = null;
  }
  if (!sid && (body.type === 'pageview' || !body.type)) {
    sid = run(
      `INSERT INTO visitor_sessions (tenant_id, site_id, visitor_id, entry_page, exit_page, referrer, utm_source, device)
       VALUES (?,?,?,?,?,?,?,?)`,
      [site.tenant_id, site.id, visitor.id, body.url || '', body.url || '', body.referrer || '', body.utm_source || '', visitor.device]
    ).lastInsertRowid;
    run("UPDATE visitors SET visit_count = visit_count + 1 WHERE id = ?", [visitor.id]);
  }

  const type = body.type || 'pageview';
  let pageviewId = body.pageviewId || null;

  if (type === 'pageview') {
    const seq = (get('SELECT COALESCE(MAX(seq), -1) + 1 AS n FROM pageviews WHERE visitor_id = ?', [visitor.id]).n) || 0;
    pageviewId = run(
      'INSERT INTO pageviews (tenant_id, site_id, visitor_id, session_id, url, title, referrer, seq) VALUES (?,?,?,?,?,?,?,?)',
      [site.tenant_id, site.id, visitor.id, sid, String(body.url || '').slice(0, 500), String(body.title || '').slice(0, 200), String(body.referrer || '').slice(0, 500), seq]
    ).lastInsertRowid;
    run('UPDATE visitor_sessions SET page_count = page_count + 1, exit_page = ? WHERE id = ?', [String(body.url || '').slice(0, 300), sid]);
    run('UPDATE visitors SET pageview_count = pageview_count + 1, last_seen = datetime(\'now\') WHERE id = ?', [visitor.id]);
    recalcVisitorIntent(site.tenant_id, visitor.id);
  } else if (type === 'dwell') {
    const ms = Math.min(60 * 60 * 1000, Math.max(0, Number(body.dwell) || 0));
    if (pageviewId) {
      const pv = get('SELECT * FROM pageviews WHERE id = ? AND visitor_id = ?', [pageviewId, visitor.id]);
      if (pv) {
        const delta = Math.max(0, ms - Number(pv.dwell_ms || 0));
        run("UPDATE pageviews SET dwell_ms = ?, exited_at = datetime('now') WHERE id = ?", [ms, pageviewId]);
        run('UPDATE visitors SET total_dwell_ms = total_dwell_ms + ?, last_seen = datetime(\'now\') WHERE id = ?', [delta, visitor.id]);
        run('UPDATE visitor_sessions SET duration_ms = duration_ms + ?, ended_at = datetime(\'now\') WHERE id = ?', [delta, sid || pv.session_id]);
      }
    }
    recalcVisitorIntent(site.tenant_id, visitor.id);
  } else if (type === 'click' || type === 'scroll' || type === 'event' || type === 'exit' || type === 'adblock' || type === 'performance') {
    run(
      'INSERT INTO events (tenant_id, site_id, visitor_id, session_id, type, name, payload, url) VALUES (?,?,?,?,?,?,?,?)',
      [site.tenant_id, site.id, visitor.id, sid, type, String(body.name || '').slice(0, 80), JSON.stringify(body.payload || {}).slice(0, 4000), String(body.url || '').slice(0, 500)]
    );
    if (type === 'exit' && sid) run("UPDATE visitor_sessions SET ended_at = datetime('now') WHERE id = ?", [sid]);
    recalcVisitorIntent(site.tenant_id, visitor.id);
  }

  const fresh = get('SELECT * FROM visitors WHERE id = ?', [visitor.id]);
  res.json({
    vid: fresh.vid,
    sid,
    pageviewId,
    consent: !!fresh.tracking_consent,
    stored: true,
    intent: { score: fresh.intent_score, level: fresh.intent_level },
    visitorId: fresh.id
  });
});

router.post('/trigger-check', async (req, res) => {
  const body = req.body || {};
  const site = siteByKey(body.key);
  if (!site) return res.status(404).json({ error: '站点不存在' });
  if (!hasFeature(site.tenant_plan, 'triggers')) return res.json({ matched: null });
  const ip = clientIp(req);
  if (blockedCheck(site, ip, body.vid)) return res.json({ matched: null, blocked: true });
  const visitor = body.vid ? get('SELECT * FROM visitors WHERE tenant_id = ? AND site_id = ? AND vid = ?', [site.tenant_id, site.id, body.vid]) : null;
  const rules = all('SELECT * FROM rules WHERE site_id = ? AND type = ? AND enabled = 1 ORDER BY priority, id', [site.id, 'trigger']);
  const ctx = {
    url: body.url || '',
    dwell: Number(body.dwell || 0),
    scrollDepth: Number(body.scrollDepth || 0),
    idle: Number(body.idle || 0),
    exitIntent: !!body.exitIntent,
    device: body.device || 'desktop',
    isNew: visitor ? Number(visitor.visit_count) <= 1 : true
  };
  for (const rule of rules) {
    const c = json(rule.conditions, {});
    if (c.pageMatch) {
      const target = String(c.pageMatch);
      const ok = c.pageMatchType === 'exact' ? ctx.url === target : ctx.url.includes(target);
      if (!ok) continue;
    }
    if (c.dwell && ctx.dwell < Number(c.dwell)) continue;
    if (c.scrollDepth && ctx.scrollDepth < Number(c.scrollDepth)) continue;
    if (c.idle && ctx.idle < Number(c.idle)) continue;
    if (c.exitIntent && !ctx.exitIntent) continue;
    if (c.device && c.device !== 'all' && c.device !== ctx.device) continue;
    if (c.visitorType && c.visitorType !== 'all') {
      if (c.visitorType === 'new' && !ctx.isNew) continue;
      if (c.visitorType === 'returning' && ctx.isNew) continue;
    }
    run('UPDATE rules SET triggered_count = triggered_count + 1 WHERE id = ?', [rule.id]);
    run('INSERT INTO rule_logs (tenant_id, rule_id, visitor_id, action) VALUES (?,?,?,?)', [site.tenant_id, rule.id, visitor ? visitor.id : null, 'trigger']);
    return res.json({ matched: { id: rule.id, name: rule.name, actions: json(rule.actions, {}), conditions: c } });
  }
  res.json({ matched: null });
});

router.post('/form/:id', async (req, res) => {
  const form = get('SELECT * FROM forms WHERE id = ?', [Number(req.params.id)]);
  if (!form || !form.enabled) return res.status(404).json({ error: '表单不存在' });
  const site = get('SELECT s.*, t.plan AS tenant_plan, t.status AS tenant_status FROM sites s JOIN tenants t ON t.id = s.tenant_id WHERE s.id = ?', [form.site_id]);
  if (!site || !hasFeature(site.tenant_plan, 'forms')) return res.status(403).json({ error: '当前套餐未开通表单能力', code: 'PLAN_LOCKED' });
  const ip = clientIp(req);
  if (!hit(`form:${site.id}:${ip}`, 20, 60000).ok) return res.status(429).json({ error: '提交过于频繁，请稍后再试' });
  if (blockedCheck(site, ip, req.body.vid)) return res.status(403).json({ error: '当前访客已被限制提交' });

  const fields = json(form.fields, []);
  const data = req.body.data || {};
  const errors = [];
  for (const f of fields) {
    if (f.required && !String(data[f.key] ?? '').trim()) errors.push(`${f.label}不能为空`);
    if (f.type === 'phone' && data[f.key] && !/^1[3-9]\d{9}$/.test(String(data[f.key]))) errors.push('手机号格式不正确');
  }
  if (errors.length) return res.status(400).json({ error: errors[0], errors });

  const { visitor } = await upsertVisitor(site, req, { ...req.body });
  const convId = req.body.conversationId ? Number(req.body.conversationId) : null;
  const subId = run(
    'INSERT INTO form_submissions (tenant_id, site_id, form_id, visitor_id, conversation_id, data) VALUES (?,?,?,?,?,?)',
    [site.tenant_id, site.id, form.id, visitor.id, convId, JSON.stringify(data)]
  ).lastInsertRowid;

  const phone = data.phone || visitor.phone;
  const name = data.name || data.contact || visitor.name;
  if (phone) {
    run('UPDATE visitors SET phone = COALESCE(phone, ?), name = COALESCE(name, ?), company = COALESCE(company, ?), business_type = COALESCE(business_type, ?) WHERE id = ?',
      [phone, name || null, data.company || null, data.business_type || null, visitor.id]);
  }
  let leadId = null;
  if (form.type !== 'offline' || !convId) {
    leadId = run(
      `INSERT INTO leads (tenant_id, site_id, visitor_id, conversation_id, source, name, phone, email, company, business_type, requirement, status, score, tags)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      [site.tenant_id, site.id, visitor.id, convId, form.type === 'offline' ? 'offline' : 'form', name || '未留名',
        phone || null, data.email || visitor.email || null, data.company || null, data.business_type || null,
        data.need || data.content || data.requirement || null, 'new', Math.round(Math.min(95, 30 + (phone ? 30 : 0) + Number(visitor.intent_score || 0) / 3)),
        JSON.stringify(['表单线索'])]
    ).lastInsertRowid;
  }
  recalcVisitorIntent(site.tenant_id, visitor.id);
  await notifyTenant(site.tenant_id, 'lead', '收到新的线索', `${name || visitor.province || '访客'} 提交了「${form.name}」，手机号 ${phone || '未填写'}`, { leadId, siteId: site.id });
  res.json({ ok: true, submissionId: subId, leadId, visitorId: visitor.id });
});

router.post('/offline', async (req, res) => {
  const site = siteByKey(req.body.key);
  if (!site) return res.status(404).json({ error: '站点不存在' });
  if (!hasFeature(site.tenant_plan, 'offline_msg')) return res.status(403).json({ error: '当前套餐不支持离线留言' });
  const ip = clientIp(req);
  if (!hit(`offline:${site.id}:${ip}`, 10, 60000).ok) return res.status(429).json({ error: '提交过于频繁' });
  const { name, phone, content } = req.body;
  if (!name || !phone || !content) return res.status(400).json({ error: '请填写完整信息' });
  if (!/^1[3-9]\d{9}$/.test(String(phone))) return res.status(400).json({ error: '手机号格式不正确' });
  if (String(content).length > 2000) return res.status(400).json({ error: '留言内容过长' });
  const { visitor } = await upsertVisitor(site, req, req.body);
  run('UPDATE visitors SET name = ?, phone = ? WHERE id = ?', [name, phone, visitor.id]);
  const convId = run(
    'INSERT INTO conversations (tenant_id, site_id, visitor_id, status, subject, source, last_message_at) VALUES (?,?,?,?,?,?,datetime(\'now\'))',
    [site.tenant_id, site.id, visitor.id, 'pending', `离线留言 - ${String(content).slice(0, 30)}`, 'offline']
  ).lastInsertRowid;
  run('INSERT INTO messages (tenant_id, conversation_id, sender_type, sender_id, sender_name, type, content) VALUES (?,?,?,?,?,?,?)',
    [site.tenant_id, convId, 'visitor', visitor.vid, name, 'text', String(content).slice(0, 2000)]);
  const leadId = run(
    'INSERT INTO leads (tenant_id, site_id, visitor_id, conversation_id, source, name, phone, requirement, status, score, tags) VALUES (?,?,?,?,?,?,?,?,?,?,?)',
    [site.tenant_id, site.id, visitor.id, convId, 'offline', name, phone, String(content).slice(0, 500), 'new', 45, JSON.stringify(['离线留言'])]
  ).lastInsertRowid;
  await notifyTenant(site.tenant_id, 'lead', '收到离线留言', `${name}（${phone}）留言：${String(content).slice(0, 60)}`, { leadId, siteId: site.id });
  res.json({ ok: true, conversationId: convId, leadId });
});

router.post('/rating', (req, res) => {
  const { conversationId, score, comment } = req.body;
  const conv = get('SELECT c.*, s.tenant_id AS tid, t.plan FROM conversations c JOIN sites s ON s.id = c.site_id JOIN tenants t ON t.id = s.tenant_id WHERE c.id = ?', [Number(conversationId)]);
  if (!conv) return res.status(404).json({ error: '会话不存在' });
  if (!hasFeature(conv.plan, 'rating')) return res.status(403).json({ error: '当前套餐未开通满意度评价', code: 'PLAN_LOCKED' });
  const n = Math.min(5, Math.max(1, Number(score) || 5));
  run('UPDATE conversations SET rating = ?, rating_comment = ? WHERE id = ?', [n, String(comment || '').slice(0, 500), conv.id]);
  run('INSERT INTO messages (tenant_id, conversation_id, sender_type, sender_name, type, content, meta) VALUES (?,?,?,?,?,?,?)',
    [conv.tid, conv.id, 'system', '系统', 'rating', `访客评价 ${n} 星${comment ? '：' + String(comment).slice(0, 200) : ''}`, JSON.stringify({ score: n })]);
  res.json({ ok: true });
});

router.post('/translate', (req, res) => {
  const site = siteByKey(req.body.key);
  if (!site) return res.status(404).json({ error: '站点不存在' });
  if (!hasFeature(site.tenant_plan, 'translation')) return res.status(403).json({ error: '当前套餐未开通多语言翻译', code: 'PLAN_LOCKED' });
  const ip = clientIp(req);
  if (!hit(`trans:${site.id}:${ip}`, 30, 60000).ok) return res.status(429).json({ error: '翻译请求过于频繁' });
  const text = String(req.body.text || '').slice(0, 1000);
  if (!text) return res.status(400).json({ error: '缺少文本' });
  res.json({ text: ai.translate(text, req.body.target === 'zh' ? 'zh' : 'en') });
});

router.get('/faq/:id/view', (req, res) => {
  run('UPDATE faqs SET views = views + 1 WHERE id = ?', [Number(req.params.id)]);
  res.json({ ok: true });
});

router.post('/adblock', async (req, res) => {
  const site = siteByKey(req.body.key);
  if (!site) return res.status(404).json({ error: '站点不存在' });
  const { visitor } = await upsertVisitor(site, req, req.body);
  run('INSERT INTO events (tenant_id, site_id, visitor_id, type, name, payload, url) VALUES (?,?,?,?,?,?,?)',
    [site.tenant_id, site.id, visitor.id, 'adblock', 'widget_blocked', JSON.stringify({ blocked: true, ua: req.headers['user-agent'] || '' }).slice(0, 1000), String(req.body.url || '')]);
  res.json({ ok: true, recorded: true });
});

router.post('/upload', (req, res) => {
  const key = req.query.key || req.body.key;
  const site = siteByKey(key);
  if (!site) return res.status(404).json({ error: '站点不存在' });
  const ip = clientIp(req);
  if (!hit(`upload:${site.id}:${ip}`, 20, 60000).ok) return res.status(429).json({ error: '上传过于频繁' });
  upload.single('file')(req, res, (err) => {
    if (err) return res.status(400).json({ error: err.message || '上传失败' });
    if (!req.file) return res.status(400).json({ error: '未收到文件' });
    res.json({
      ok: true,
      url: publicUrl(req.file),
      name: req.file.originalname,
      size: req.file.size,
      type: req.file.mimetype
    });
  });
});

router.post('/recording', (req, res) => {
  const site = siteByKey(req.query.key || req.body.key);
  if (!site) return res.status(404).json({ error: '站点不存在' });
  if (!hasFeature(site.tenant_plan, 'recording')) return res.status(403).json({ error: '当前套餐未开通访客录屏', code: 'PLAN_LOCKED' });
  const ip = clientIp(req);
  if (!hit(`rec:${site.id}:${ip}`, 5, 60000).ok) return res.status(429).json({ error: '录制过于频繁' });
  uploadRecording.single('file')(req, res, (err) => {
    if (err) return res.status(400).json({ error: err.message || '上传失败' });
    if (!req.file) return res.status(400).json({ error: '未收到录屏文件' });
    const url = publicUrl(req.file);
    const visitor = req.body.vid ? get('SELECT * FROM visitors WHERE tenant_id = ? AND site_id = ? AND vid = ?', [site.tenant_id, site.id, req.body.vid]) : null;
    const convId = req.body.conversationId ? Number(req.body.conversationId) : null;
    const recId = run('INSERT INTO recordings (tenant_id, site_id, visitor_id, conversation_id, file_url, size, duration) VALUES (?,?,?,?,?,?,?)',
      [site.tenant_id, site.id, visitor ? visitor.id : null, convId, url, req.file.size, Number(req.body.duration) || 0]).lastInsertRowid;
    if (convId) {
      run('INSERT INTO messages (tenant_id, conversation_id, sender_type, sender_name, type, content, file_url, file_name, file_size, meta) VALUES (?,?,?,?,?,?,?,?,?,?)',
        [site.tenant_id, convId, 'visitor', visitor ? visitor.name || '访客' : '访客', 'recording', '访客发来一段页面录屏', url, req.file.originalname, req.file.size, JSON.stringify({ recordingId: recId })]);
      run("UPDATE conversations SET last_message_at = datetime('now'), unread_agent = unread_agent + 1 WHERE id = ?", [convId]);
    }
    res.json({ ok: true, id: recId, url });
  });
});

router.post('/blacklist-check', (req, res) => {
  const site = siteByKey(req.body.key);
  if (!site) return res.status(404).json({ error: '站点不存在' });
  res.json({ blocked: blockedCheck(site, clientIp(req), req.body.vid || '') });
});

module.exports = router;
module.exports.siteByKey = siteByKey;
module.exports.clientIp = clientIp;
module.exports.blockedCheck = blockedCheck;
module.exports.parseUA = parseUA;
