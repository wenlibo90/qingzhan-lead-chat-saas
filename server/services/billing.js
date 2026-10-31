'use strict';
const crypto = require('node:crypto');
const { get, run, all, tx } = require('../db');
const { planOf } = require('../plans');
const referral = require('./referral');
const payments = require('./payments');

const RANK = { free: 0, standard: 1, pro: 2, enterprise: 3 };
const SECRET = process.env.PAYMENT_WEBHOOK_SECRET || process.env.APP_SECRET || 'qingzhan-leadchat-dev-secret-2026';

function provider() { return payments.provider(); }
function mockEnabled() { return payments.mockEnabled(); }
function paymentInfo() { return payments.info(); }
function paymentIntent(order) { return payments.createIntent(order); }
function nowIso() { return new Date().toISOString().slice(0, 19).replace('T', ' '); }
function addPeriod(base, cycle) {
  const d = base ? new Date(String(base).replace(' ', 'T') + 'Z') : new Date();
  if (isNaN(d.getTime())) return addPeriod(null, cycle);
  if (cycle === 'yearly') d.setUTCFullYear(d.getUTCFullYear() + 1);
  else d.setUTCMonth(d.getUTCMonth() + 1);
  return d.toISOString().slice(0, 19).replace('T', ' ');
}
function random(n) { return crypto.randomBytes(n).toString('hex').toUpperCase(); }
function orderNo() { return 'QZ' + new Date().toISOString().slice(0, 10).replace(/-/g, '') + random(4).slice(0, 8); }
function invoiceNo() { return 'INV-' + new Date().toISOString().slice(0, 7).replace('-', '') + '-' + random(3).slice(0, 6); }
function amountCents(plan, cycle) {
  const price = cycle === 'yearly' ? Number(plan.yearly || 0) : Number(plan.price || 0);
  return Math.round(price * 100);
}
function orderPublic(o) {
  if (!o) return null;
  return { ...o, amount: o.amount_cents / 100 };
}
function subscriptionOf(tenant) {
  return {
    plan: tenant.plan,
    plan_status: tenant.plan_status,
    billing_cycle: tenant.billing_cycle || 'monthly',
    current_period_start: tenant.current_period_start || null,
    current_period_end: tenant.current_period_end || null,
    cancel_at_period_end: !!tenant.cancel_at_period_end,
    trial_ends_at: tenant.trial_ends_at || null,
    last_payment_at: tenant.last_payment_at || null
  };
}

function createOrder({ tenantId, planCode, cycle = 'monthly', userId = null }) {
  const tenant = get('SELECT * FROM tenants WHERE id = ?', [tenantId]);
  if (!tenant) throw Object.assign(new Error('工作空间不存在'), { status: 404 });
  if (tenant.status !== 'active') throw Object.assign(new Error('工作空间已停用'), { status: 403 });
  const plan = planOf(planCode);
  if (!['standard', 'pro'].includes(plan.code)) throw Object.assign(new Error('该套餐需要联系销售开通'), { status: 400 });
  if (!['monthly', 'yearly'].includes(cycle)) throw Object.assign(new Error('计费周期不合法'), { status: 400 });
  if (tenant.plan_status === 'active' && tenant.plan !== 'free' && RANK[plan.code] < RANK[tenant.plan]) {
    throw Object.assign(new Error('当前套餐高于目标套餐，请先取消续费，到期后再降级'), { status: 400 });
  }
  const amount = amountCents(plan, cycle);
  if (!amount) throw Object.assign(new Error('套餐价格未配置'), { status: 400 });
  const id = run(
    `INSERT INTO orders (order_no, tenant_id, plan, cycle, amount_cents, status, provider, idempotency_key, created_by, expires_at)
     VALUES (?,?,?,?,?,?,?,?,?,datetime('now','+30 minutes'))`,
    [orderNo(), tenant.id, plan.code, cycle, amount, 'pending', provider(), `${tenant.id}:${plan.code}:${cycle}:${Date.now()}`, userId]
  ).lastInsertRowid;
  const order = get('SELECT * FROM orders WHERE id = ?', [id]);
  const payment = paymentInfo();
  if (payment.provider === 'alipay' && payment.enabled) {
    try {
      payment.payUrl = paymentIntent(order).payUrl;
    } catch (err) {
      payment.enabled = false;
      payment.message = err.message;
    }
  }
  return { order: orderPublic(order), payment };
}

function applyPaidOrder(orderId, { providerTradeNo = null } = {}, inTransaction = false) {
  const execute = () => {
    const order = get('SELECT * FROM orders WHERE id = ?', [orderId]);
    if (!order) throw Object.assign(new Error('订单不存在'), { status: 404 });
    if (order.status === 'paid') return { order, duplicate: true };
    if (order.status !== 'pending') throw Object.assign(new Error('订单状态不可支付'), { status: 400 });
    const tenant = get('SELECT * FROM tenants WHERE id = ?', [order.tenant_id]);
    if (!tenant) throw Object.assign(new Error('工作空间不存在'), { status: 404 });
    const now = nowIso();
    const samePlan = tenant.plan === order.plan && tenant.plan_status === 'active' && tenant.current_period_end;
    const start = samePlan && String(tenant.current_period_end) > now && !tenant.cancel_at_period_end ? tenant.current_period_end : now;
    const end = addPeriod(start, order.cycle);
    const inv = invoiceNo();
    run("UPDATE orders SET status = 'paid', provider_trade_no = ?, paid_at = datetime('now'), period_start = ?, period_end = ?, invoice_no = ?, updated_at = datetime('now') WHERE id = ?",
      [providerTradeNo, start, end, inv, order.id]);
    run("UPDATE tenants SET plan = ?, plan_status = 'active', billing_cycle = ?, current_period_start = ?, current_period_end = ?, cancel_at_period_end = 0, last_payment_at = datetime('now'), trial_ends_at = NULL WHERE id = ?",
      [order.plan, order.cycle, now, end, tenant.id]);
    run("INSERT INTO notifications (tenant_id, user_id, type, title, content, payload) VALUES (?,?,?,?,?,?)", [
      tenant.id, null, 'billing', '套餐已开通', `${planOf(order.plan).name} 已生效，当前周期至 ${String(end).slice(0, 10)}。`, JSON.stringify({ orderId: order.id, plan: order.plan, until: end })
    ]);
    run('INSERT INTO platform_audit_logs (action, target, detail) VALUES (?,?,?)', ['billing.paid', `tenant:${tenant.id}`, `${order.order_no} / ¥${(order.amount_cents / 100).toFixed(2)} / ${order.plan}`]);
    try { referral.rewardPaidOrder(get('SELECT * FROM orders WHERE id = ?', [order.id])); } catch (e) { /* reward must not block payment */ }
    return { order: get('SELECT * FROM orders WHERE id = ?', [order.id]), tenant: get('SELECT * FROM tenants WHERE id = ?', [tenant.id]), duplicate: false };
  };
  return inTransaction ? execute() : tx(execute);
}

function markOrderFailed(orderId, reason) {
  run("UPDATE orders SET status = 'failed', updated_at = datetime('now') WHERE id = ? AND status = 'pending'", [orderId]);
  const order = get('SELECT * FROM orders WHERE id = ?', [orderId]);
  if (order) run("INSERT INTO notifications (tenant_id, user_id, type, title, content, payload) VALUES (?,?,?,?,?,?)", [order.tenant_id, null, 'billing', '支付未完成', reason || '支付失败，请重新发起订单。', JSON.stringify({ orderId })]);
  return order;
}

function cancelOrder(orderId, tenantId) {
  const order = get('SELECT * FROM orders WHERE id = ? AND tenant_id = ?', [orderId, tenantId]);
  if (!order) throw Object.assign(new Error('订单不存在'), { status: 404 });
  if (order.status !== 'pending') throw Object.assign(new Error('只有待支付订单可以取消'), { status: 400 });
  run("UPDATE orders SET status = 'canceled', updated_at = datetime('now') WHERE id = ?", [order.id]);
  return get('SELECT * FROM orders WHERE id = ?', [order.id]);
}

function scheduleDowngrade(tenantId) {
  const tenant = get('SELECT * FROM tenants WHERE id = ?', [tenantId]);
  if (!tenant) throw Object.assign(new Error('工作空间不存在'), { status: 404 });
  if (tenant.plan_status === 'trialing' || tenant.plan === 'free' || !tenant.current_period_end) {
    run("UPDATE tenants SET plan = 'free', plan_status = 'active', trial_ends_at = NULL, current_period_start = NULL, current_period_end = NULL, cancel_at_period_end = 0 WHERE id = ?", [tenantId]);
    return { immediate: true, tenant: get('SELECT * FROM tenants WHERE id = ?', [tenantId]) };
  }
  run("UPDATE tenants SET cancel_at_period_end = 1 WHERE id = ?", [tenantId]);
  return { immediate: false, tenant: get('SELECT * FROM tenants WHERE id = ?', [tenantId]) };
}

function resumeSubscription(tenantId) {
  run("UPDATE tenants SET cancel_at_period_end = 0 WHERE id = ?", [tenantId]);
  return get('SELECT * FROM tenants WHERE id = ?', [tenantId]);
}

function listOrders(tenantId) {
  return all('SELECT * FROM orders WHERE tenant_id = ? ORDER BY id DESC LIMIT 30', [tenantId]).map(orderPublic);
}
function listInvoices(tenantId) {
  return all("SELECT * FROM orders WHERE tenant_id = ? AND status = 'paid' ORDER BY id DESC LIMIT 30", [tenantId]).map((o) => ({
    id: o.invoice_no || o.order_no, order_no: o.order_no, date: String(o.paid_at || o.created_at).slice(0, 10), amount: o.amount_cents / 100, status: 'paid', plan: planOf(o.plan).name, cycle: o.cycle, period_end: o.period_end
  }));
}

function verifyWebhook(rawBody, signature) {
  if (!signature) return false;
  const expected = crypto.createHmac('sha256', SECRET).update(rawBody).digest('hex');
  const a = Buffer.from(String(signature));
  const b = Buffer.from(expected);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

function processWebhook({ provider: prov, eventId, orderNo, amountCents: amount, status, providerTradeNo, raw }) {
  if (get('SELECT id FROM payment_events WHERE event_id = ?', [eventId])) return { duplicate: true };
  const order = get('SELECT * FROM orders WHERE order_no = ?', [orderNo]);
  if (!order) throw Object.assign(new Error('订单不存在'), { status: 404 });
  if (Number(order.amount_cents) !== Number(amount)) throw Object.assign(new Error('支付金额与订单不一致'), { status: 400 });
  return tx(() => {
    run('INSERT INTO payment_events (event_id, order_id, provider, amount_cents, status, raw) VALUES (?,?,?,?,?,?)', [eventId, order.id, prov, amount, status, raw ? String(raw).slice(0, 2000) : null]);
    if (!['paid', 'success', 'SUCCESS', 'TRADE_SUCCESS'].includes(String(status))) {
      run("UPDATE orders SET status = 'failed', updated_at = datetime('now') WHERE id = ? AND status = 'pending'", [order.id]);
      return { order: get('SELECT * FROM orders WHERE id = ?', [order.id]), failed: true };
    }
    return applyPaidOrder(order.id, { providerTradeNo }, true);
  });
}

function contactSales(tenantId, userId, message) {
  const existing = get("SELECT * FROM applications WHERE tenant_id = ? AND source = 'billing' AND status NOT IN ('won','lost') ORDER BY id DESC LIMIT 1", [tenantId]);
  if (existing) return existing;
  const tenant = get('SELECT * FROM tenants WHERE id = ?', [tenantId]);
  const owner = get("SELECT * FROM platform_users WHERE status = 'active' AND role IN ('sales','superadmin') ORDER BY (SELECT COUNT(*) FROM applications a WHERE a.owner_id = platform_users.id) ASC, id LIMIT 1");
  const site = get('SELECT * FROM sites WHERE tenant_id = ? AND is_sandbox = 0 ORDER BY id LIMIT 1', [tenantId]);
  const id = run(
    `INSERT INTO applications (name, phone, email, company, website, size, channel, message, source, status, owner_id, tenant_id)
     VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`,
    [tenant.name, null, null, tenant.name, site ? site.domain : '', '', '企业版咨询', message || '客户在套餐页发起企业版/定制咨询。', 'billing', 'new', owner ? owner.id : null, tenant.id]
  ).lastInsertRowid;
  return get('SELECT * FROM applications WHERE id = ?', [id]);
}

module.exports = {
  provider, mockEnabled, paymentInfo, paymentIntent, amountCents, createOrder, applyPaidOrder, markOrderFailed, cancelOrder,
  scheduleDowngrade, resumeSubscription, listOrders, listInvoices, subscriptionOf, verifyWebhook, processWebhook, contactSales, orderPublic
};
