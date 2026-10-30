'use strict';
const { get, run, all } = require('../db');

function ownerForPql() {
  return get(
    `SELECT p.* FROM platform_users p
     WHERE p.status = 'active' AND p.role IN ('sales','superadmin')
     ORDER BY (SELECT COUNT(*) FROM applications a WHERE a.owner_id = p.id AND a.status NOT IN ('won','lost')) ASC, p.id ASC
     LIMIT 1`
  );
}

function evaluateTenant(tenantId) {
  const tenant = get('SELECT * FROM tenants WHERE id = ?', [tenantId]);
  if (!tenant || tenant.status !== 'active') return null;
  if (tenant.plan === 'enterprise') return null;
  const site = get('SELECT * FROM sites WHERE tenant_id = ? AND is_sandbox = 0 ORDER BY id LIMIT 1', [tenantId]);
  if (!site || !site.installed_at) return null;
  const conversations = get('SELECT COUNT(*) c FROM conversations WHERE tenant_id = ? AND site_id = ?', [tenantId, site.id]).c;
  const leads = get('SELECT COUNT(*) c FROM leads WHERE tenant_id = ? AND site_id = ?', [tenantId, site.id]).c;
  const visitors = get('SELECT COUNT(*) c FROM visitors WHERE tenant_id = ? AND site_id = ?', [tenantId, site.id]).c;
  const members = get("SELECT COUNT(*) c FROM users WHERE tenant_id = ? AND status = 'active'", [tenantId]).c;
  if (visitors < 50 || (conversations < 5 && leads < 2)) return null;
  const recent = get(
    `SELECT * FROM applications WHERE tenant_id = ? AND source = 'pql'
       AND created_at >= datetime('now','-30 days') ORDER BY id DESC LIMIT 1`,
    [tenantId]
  );
  if (recent) return null;
  const owner = ownerForPql();
  const ownerUser = get("SELECT u.*, a.phone AS account_phone, a.email AS account_email FROM users u LEFT JOIN accounts a ON a.id = u.account_id WHERE u.tenant_id = ? AND u.role = 'admin' ORDER BY u.id LIMIT 1", [tenantId]);
  const reasons = [];
  if (conversations >= 5) reasons.push(`${conversations} 条会话`);
  if (leads >= 2) reasons.push(`${leads} 条线索`);
  reasons.push(`${visitors} 位访客`);
  if (members > 1) reasons.push(`${members} 名成员`);
  const message = `产品内 PQL：已安装 JS，${reasons.join('，')}。当前套餐 ${tenant.plan}${tenant.plan_status === 'trialing' ? '（试用中）' : ''}，建议销售跟进升级。`;
  const id = run(
    `INSERT INTO applications (name, phone, email, company, website, size, channel, message, source, status, owner_id, account_id, tenant_id)
     VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)`,
    [ownerUser ? ownerUser.name : tenant.name, ownerUser ? ownerUser.account_phone || ownerUser.phone : null, ownerUser ? ownerUser.account_email || ownerUser.email : null,
      tenant.name, site.domain || '', `${members} 人`, 'PQL 自动识别', message, 'pql', 'new', owner ? owner.id : null,
      ownerUser ? ownerUser.account_id : null, tenant.id]
  ).lastInsertRowid;
  run('INSERT INTO platform_audit_logs (action, target, detail) VALUES (?,?,?)', ['pql.create', `application:${id}`, `${tenant.name} / ${reasons.join('，')}`]);
  return get('SELECT * FROM applications WHERE id = ?', [id]);
}

function evaluateAll() {
  const tenants = all("SELECT id FROM tenants WHERE status = 'active' AND plan != 'enterprise'");
  const created = [];
  for (const t of tenants) {
    try { const app = evaluateTenant(t.id); if (app) created.push(app); } catch (e) { /* one tenant must not block lifecycle */ }
  }
  return created;
}

module.exports = { evaluateTenant, evaluateAll };
