'use strict';
const { all, get, run, json } = require('./db');

function parseRange(req, fallback = 14) {
  const q = req && req.query ? req.query : (req || {});
  const raw = q.range != null ? q.range : q.days != null ? q.days : fallback;
  const days = Math.min(90, Math.max(1, Number(raw) || fallback));
  return days;
}

function siteScope(req, siteIdParam) {
  const sites = all('SELECT * FROM sites WHERE tenant_id = ? ORDER BY id', [req.tenant.id]);
  const requested = Number(siteIdParam || req.query.siteId || req.query.site_id || 0);
  if (requested) {
    const site = sites.find((s) => s.id === requested);
    if (!site) {
      const err = new Error('站点不存在或不属于当前租户');
      err.status = 404;
      throw err;
    }
    return { site, sites };
  }
  return { site: sites[0], sites };
}

function whereTenant(req, alias = '') {
  return `${alias}tenant_id = ${Number(req.tenant.id)}`;
}

function paging(q, defLimit = 20, max = 100) {
  const page = Math.max(1, Number(q.page || 1));
  const limit = Math.min(max, Math.max(1, Number(q.limit || q.pageSize || defLimit)));
  return { page, limit, offset: (page - 1) * limit };
}

function siteFilterSql(alias, siteId) {
  return siteId ? ` AND ${alias}site_id = ${Number(siteId)}` : '';
}

function dateFilterSql(alias, days) {
  return ` AND ${alias}created_at >= datetime('now', '-${Number(days)} days')`;
}

function publicUser(user) {
  if (!user) return null;
  return {
    id: user.id,
    tenant_id: user.tenant_id,
    name: user.name,
    email: user.email,
    role: user.role,
    account_id: user.account_id,
    phone: user.phone || null,
    avatar: user.avatar,
    permissions: json(user.permissions, []),
    last_login_at: user.last_login_at
  };
}

function tenantPublic(tenant) {
  return {
    id: tenant.id,
    name: tenant.name,
    plan: tenant.plan,
    brand_name: tenant.brand_name || tenant.name,
    brand_color: tenant.brand_color,
    hide_branding: !!tenant.hide_branding,
    custom_domain: tenant.custom_domain,
    plan_status: tenant.plan_status || 'active',
    trial_started_at: tenant.trial_started_at,
    trial_ends_at: tenant.trial_ends_at
  };
}

function publicBase(req) {
  const configured = String(process.env.PUBLIC_BASE || '').trim();
  if (configured) return configured.replace(/\/+$/, '');
  if (!req) return '';
  const headers = req.headers || {};
  function schemeOf(value) {
    try { return new URL(String(value)).protocol.replace(':', ''); } catch (e) { return null; }
  }
  let proto = String(headers['x-forwarded-proto'] || '').split(',')[0].trim();
  if (!proto) {
    const forwarded = String(headers.forwarded || '');
    const match = forwarded.match(/proto=(https?)/i);
    if (match) proto = match[1].toLowerCase();
  }
  if (!proto && String(headers['x-forwarded-ssl'] || '').toLowerCase() === 'on') proto = 'https';
  if (!['http', 'https'].includes(proto)) proto = req.secure ? 'https' : 'http';
  // A browser request over HTTPS must never produce an HTTP embed URL, even if
  // the reverse proxy omits or mislabels X-Forwarded-Proto.
  const browserProto = schemeOf(headers.origin) || schemeOf(headers.referer);
  if (browserProto === 'https' || (browserProto === 'http' && proto !== 'https')) proto = browserProto;
  const host = String(headers['x-forwarded-host'] || req.get('host') || headers.host || '').split(',')[0].trim();
  const prefix = String(headers['x-forwarded-prefix'] || '').trim().replace(/\/+$/, '');
  return host ? `${proto}://${host}${prefix}` : '';
}

function sitePublic(site, plan, base) {
  const config = json(site.widget_config, {});
  return {
    id: site.id,
    name: site.name,
    domain: site.domain,
    site_key: site.site_key,
    is_sandbox: !!site.is_sandbox,
    installed_at: site.installed_at || null,
    last_widget_ping_at: site.last_widget_ping_at || null,
    tracking_enabled: !!site.tracking_enabled,
    compliance_enabled: !!site.compliance_enabled,
    widget_config: config,
    embed_code: `<script async src="${base || publicBase()}/qz.js?${site.loader_token}"></script>`
  };
}

function audit(req, action, target, detail) {
  run('INSERT INTO audit_logs (tenant_id, user_id, action, target, detail, ip) VALUES (?,?,?,?,?,?)', [
    req.tenant.id, req.user ? req.user.id : null, action, target || '', detail ? String(detail).slice(0, 500) : '',
    (req.headers['x-forwarded-for'] || req.ip || '').split(',')[0]
  ]);
}

function recalcVisitorIntent(tenantId, visitorId) {
  const v = get('SELECT * FROM visitors WHERE id = ? AND tenant_id = ?', [visitorId, tenantId]);
  if (!v) return;
  const convs = get('SELECT COUNT(*) c FROM conversations WHERE visitor_id = ?', [visitorId]).c;
  const subs = get('SELECT COUNT(*) c FROM form_submissions WHERE visitor_id = ?', [visitorId]).c;
  const pricing = get("SELECT COUNT(*) c FROM pageviews WHERE visitor_id = ? AND url LIKE '%pric%'", [visitorId]).c;
  let score = 0;
  score += Math.min(Number(v.pageview_count) * 3, 30);
  score += Math.min(Number(v.visit_count) * 6, 24);
  score += Math.min(Math.floor(Number(v.total_dwell_ms) / 60000) * 2, 18);
  score += Math.min(pricing * 8, 24);
  score += Math.min(convs * 15, 30);
  score += Math.min(subs * 20, 40);
  if (v.phone) score += 15;
  if (v.email) score += 8;
  if (v.company) score += 6;
  score = Math.max(0, Math.min(100, score));
  run('UPDATE visitors SET intent_score = ?, intent_level = ? WHERE id = ?', [score, score >= 60 ? 'high' : score >= 30 ? 'medium' : 'low', visitorId]);
}

module.exports = {
  parseRange, siteScope, paging, siteFilterSql, dateFilterSql, publicBase,
  publicUser, tenantPublic, sitePublic, audit, recalcVisitorIntent, whereTenant
};
