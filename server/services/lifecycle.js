'use strict';
const { all, get, run, json } = require('../db');
const pql = require('./pql');

function notifyTenantOnce(tenantId, type, title, content, payload) {
  const rows = all("SELECT payload FROM notifications WHERE tenant_id = ? AND type = ? AND created_at >= datetime('now','-14 days')", [tenantId, type]);
  const key = payload && payload.reminder;
  if (key && rows.some((r) => { try { return json(r.payload, {}).reminder === key; } catch (e) { return false; } })) return false;
  run('INSERT INTO notifications (tenant_id, user_id, type, title, content, payload) VALUES (?,?,?,?,?,?)', [tenantId, null, type, title, content, JSON.stringify(payload || {})]);
  return true;
}

function hoursUntil(dateStr) {
  if (!dateStr) return Infinity;
  const d = new Date(String(dateStr).replace(' ', 'T') + 'Z').getTime();
  return (d - Date.now()) / 3600000;
}

function expireTrials() {
  const expired = all("SELECT * FROM tenants WHERE plan_status = 'trialing' AND trial_ends_at IS NOT NULL AND trial_ends_at < datetime('now')");
  for (const tenant of expired) {
    run("UPDATE tenants SET plan = 'free', plan_status = 'expired' WHERE id = ?", [tenant.id]);
    run("INSERT INTO notifications (tenant_id, user_id, type, title, content, payload) VALUES (?,?,?,?,?,?)", [
      tenant.id, null, 'billing', '专业版试用已结束', '已自动切换为免费版，数据完整保留。升级后可继续使用专业版能力。', JSON.stringify({ tenantId: tenant.id })
    ]);
  }
  return expired.length;
}

function sendTrialReminders() {
  const trials = all("SELECT * FROM tenants WHERE plan_status = 'trialing' AND trial_ends_at IS NOT NULL");
  let sent = 0;
  for (const t of trials) {
    const h = hoursUntil(t.trial_ends_at);
    if (h <= 0) continue;
    if (h <= 24 && notifyTenantOnce(t.id, 'trial', '专业版试用还剩 1 天', '明天试用结束，到期自动降级免费版，数据保留。可在套餐页选择继续使用专业版。', { reminder: '1d', tenantId: t.id })) sent++;
    else if (h <= 72 && h > 48 && notifyTenantOnce(t.id, 'trial', '专业版试用还剩 3 天', '试用即将结束，建议现在确认套餐，避免专业版能力中断。', { reminder: '3d', tenantId: t.id })) sent++;
  }
  return sent;
}

function expireSubscriptions() {
  const rows = all("SELECT * FROM tenants WHERE plan != 'free' AND current_period_end IS NOT NULL");
  const now = Date.now();
  let changed = 0;
  for (const t of rows) {
    const end = new Date(String(t.current_period_end).replace(' ', 'T') + 'Z').getTime();
    if (!Number.isFinite(end) || end >= now) continue;
    const graceMs = 7 * 86400000;
    if (t.cancel_at_period_end || (t.plan_status === 'past_due' && end < now - graceMs)) {
      run("UPDATE tenants SET plan = 'free', plan_status = 'expired', current_period_end = NULL, cancel_at_period_end = 0 WHERE id = ?", [t.id]);
      run("INSERT INTO notifications (tenant_id, user_id, type, title, content, payload) VALUES (?,?,?,?,?,?)", [
        t.id, null, 'billing', '订阅已到期', '当前订阅已到期，已切换为免费版，数据完整保留。续费后可恢复原套餐能力。', JSON.stringify({ tenantId: t.id, reminder: 'subscription_expired' })
      ]);
      changed++;
    } else if (t.plan_status === 'active') {
      run("UPDATE tenants SET plan_status = 'past_due' WHERE id = ?", [t.id]);
      notifyTenantOnce(t.id, 'billing', '订阅已到期，进入 7 天宽限期', '当前订阅周期已结束，套餐能力在 7 天宽限期内保留。请尽快续费，避免自动降级免费版。', { reminder: 'past_due', tenantId: t.id });
      changed++;
    }
  }
  return changed;
}

function runLifecycle() {
  const trialsExpired = expireTrials();
  const reminders = sendTrialReminders();
  const subsExpired = expireSubscriptions();
  const pqls = pql.evaluateAll();
  return { trialsExpired, reminders, subsExpired, pqls: pqls.length };
}

function startLifecycle() {
  runLifecycle();
  const timer = setInterval(runLifecycle, 60 * 60 * 1000);
  timer.unref();
}

module.exports = { expireTrials, sendTrialReminders, expireSubscriptions, runLifecycle, startLifecycle };
