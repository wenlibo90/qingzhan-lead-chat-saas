'use strict';
const { get, run, all } = require('../db');

const RATE = 20;
const HOLD_DAYS = 7;
const MIN_WITHDRAW_CENTS = 10000;

function normalizeCode(code) {
  return String(code || '').trim().toUpperCase().replace(/[^A-F0-9]/g, '').slice(0, 8);
}
function codeOf(accountId) {
  const account = get('SELECT referral_code FROM accounts WHERE id = ?', [accountId]);
  return account ? account.referral_code : null;
}
function recordVisit(code, ip, ua) {
  const normalized = normalizeCode(code);
  if (!normalized) return false;
  const account = get('SELECT id FROM accounts WHERE referral_code = ?', [normalized]);
  if (!account) return false;
  run('INSERT INTO referral_visits (code, ip, ua) VALUES (?,?,?)', [normalized, ip || null, String(ua || '').slice(0, 300)]);
  return true;
}
function recordReferral({ code, referredAccountId, ip }) {
  const normalized = normalizeCode(code);
  if (!normalized || !referredAccountId) return null;
  const referrer = get('SELECT * FROM accounts WHERE referral_code = ?', [normalized]);
  if (!referrer || referrer.id === Number(referredAccountId)) return null;
  run('INSERT OR IGNORE INTO referrals (referrer_account_id, referred_account_id, code, status, ip) VALUES (?,?,?,?,?)', [referrer.id, referredAccountId, normalized, 'registered', ip || null]);
  return get('SELECT * FROM referrals WHERE referred_account_id = ?', [referredAccountId]);
}
function syncActivated() {
  return run(`UPDATE referrals SET status = 'activated', activated_at = COALESCE(activated_at, datetime('now'))
              WHERE status = 'registered' AND EXISTS (
                SELECT 1 FROM users u JOIN sites s ON s.tenant_id = u.tenant_id
                WHERE u.account_id = referrals.referred_account_id AND s.installed_at IS NOT NULL
              )`).changes;
}
function makeRewardsAvailable() {
  return run("UPDATE referral_rewards SET status = 'available' WHERE status = 'pending' AND available_at IS NOT NULL AND available_at <= datetime('now')").changes;
}
function rewardPaidOrder(order) {
  const owner = get("SELECT u.account_id FROM users u WHERE u.tenant_id = ? AND u.role = 'admin' ORDER BY u.id LIMIT 1", [order.tenant_id]);
  if (!owner || !owner.account_id) return null;
  const referral = get("SELECT * FROM referrals WHERE referred_account_id = ? AND status IN ('registered','activated','paid') ORDER BY id DESC LIMIT 1", [owner.account_id]);
  if (!referral) return null;
  if (get('SELECT id FROM referral_rewards WHERE referral_id = ?', [referral.id])) return null;
  const amount = Math.max(0, Math.round(Number(order.amount_cents) * RATE / 100));
  if (!amount) return null;
  const id = run(
    "INSERT INTO referral_rewards (referrer_account_id, referral_id, order_id, amount_cents, rate, status, available_at) VALUES (?,?,?,?,?,'pending',datetime('now','+7 days'))",
    [referral.referrer_account_id, referral.id, order.id, amount, RATE]
  ).lastInsertRowid;
  run("UPDATE referrals SET status = 'paid', paid_at = COALESCE(paid_at, datetime('now')), activated_at = COALESCE(activated_at, datetime('now')) WHERE id = ?", [referral.id]);
  const refTenant = get('SELECT tenant_id FROM users WHERE account_id = ? AND role = ? ORDER BY id LIMIT 1', [referral.referrer_account_id, 'admin']);
  if (refTenant) {
    run('INSERT INTO notifications (tenant_id, user_id, type, title, content, payload) VALUES (?,?,?,?,?,?)', [
      refTenant.tenant_id, null, 'referral', '推广奖励已产生', `你邀请的用户完成付费，${(amount / 100).toFixed(2)} 元奖励将在 ${HOLD_DAYS} 天后可提现。`,
      JSON.stringify({ referralId: referral.id, rewardId: id, amountCents: amount })
    ]);
  }
  run('INSERT INTO platform_audit_logs (action, target, detail) VALUES (?,?,?)', ['referral.reward', `account:${referral.referrer_account_id}`, `order:${order.id} / ¥${(amount / 100).toFixed(2)}`]);
  return get('SELECT * FROM referral_rewards WHERE id = ?', [id]);
}
function balanceCents(accountId) {
  const earned = get("SELECT COALESCE(SUM(amount_cents),0) s FROM referral_rewards WHERE referrer_account_id = ? AND status = 'available'", [accountId]).s || 0;
  const held = get("SELECT COALESCE(SUM(amount_cents),0) s FROM referral_withdrawals WHERE account_id = ? AND status IN ('requested','approved','paid')", [accountId]).s || 0;
  return Math.max(0, Number(earned) - Number(held));
}
function overview(accountId, base) {
  const account = get('SELECT id, referral_code FROM accounts WHERE id = ?', [accountId]);
  if (!account) return null;
  const code = account.referral_code;
  const visits = get('SELECT COUNT(*) c FROM referral_visits WHERE code = ?', [code]).c;
  const rows = all(`SELECT r.*, a.name AS referred_name, t.name AS workspace_name
                     FROM referrals r LEFT JOIN accounts a ON a.id = r.referred_account_id
                     LEFT JOIN users u ON u.account_id = a.id AND u.role = 'admin'
                     LEFT JOIN tenants t ON t.id = u.tenant_id
                     WHERE r.referrer_account_id = ? ORDER BY r.id DESC`, [accountId]);
  const rewards = all(`SELECT rr.*, a.name AS referred_name, o.order_no, o.plan
                       FROM referral_rewards rr LEFT JOIN referrals r ON r.id = rr.referral_id
                       LEFT JOIN accounts a ON a.id = r.referred_account_id
                       LEFT JOIN orders o ON o.id = rr.order_id
                       WHERE rr.referrer_account_id = ? ORDER BY rr.id DESC`, [accountId]);
  const withdrawals = all('SELECT * FROM referral_withdrawals WHERE account_id = ? ORDER BY id DESC', [accountId]);
  const sums = {};
  for (const status of ['pending', 'available', 'withdrawn', 'void']) {
    sums[status] = get('SELECT COALESCE(SUM(amount_cents),0) s FROM referral_rewards WHERE referrer_account_id = ? AND status = ?', [accountId, status]).s || 0;
  }
  return {
    code,
    link: `${base || ''}/r/${code}`,
    stats: {
      visits,
      registered: rows.length,
      activated: rows.filter((r) => ['activated', 'paid'].includes(r.status)).length,
      paid: rows.filter((r) => r.status === 'paid').length,
      earnedCents: Number(sums.pending) + Number(sums.available) + Number(sums.withdrawn),
      availableCents: balanceCents(accountId),
      pendingCents: Number(sums.pending),
      withdrawnCents: Number(sums.withdrawn)
    },
    referrals: rows,
    rewards,
    withdrawals,
    rules: { rate: RATE, holdDays: HOLD_DAYS, minWithdrawCents: MIN_WITHDRAW_CENTS }
  };
}
function requestWithdrawal(accountId, amountCents, note) {
  const amount = Math.floor(Number(amountCents));
  if (!Number.isFinite(amount) || amount < MIN_WITHDRAW_CENTS) throw Object.assign(new Error(`最低提现 ${MIN_WITHDRAW_CENTS / 100} 元`), { status: 400 });
  const pending = get("SELECT id FROM referral_withdrawals WHERE account_id = ? AND status IN ('requested','approved')", [accountId]);
  if (pending) throw Object.assign(new Error('已有提现申请在处理中'), { status: 400 });
  if (amount > balanceCents(accountId)) throw Object.assign(new Error('可提现余额不足'), { status: 400 });
  const id = run('INSERT INTO referral_withdrawals (account_id, amount_cents, status, note) VALUES (?,?,?,?)', [accountId, amount, 'requested', String(note || '').slice(0, 300)]).lastInsertRowid;
  return get('SELECT * FROM referral_withdrawals WHERE id = ?', [id]);
}
function opsOverview() {
  const referrals = all(`SELECT r.*, ra.name AS referrer_name, ra.phone AS referrer_phone, aa.name AS referred_name, aa.phone AS referred_phone
                         FROM referrals r LEFT JOIN accounts ra ON ra.id = r.referrer_account_id LEFT JOIN accounts aa ON aa.id = r.referred_account_id
                         ORDER BY r.id DESC LIMIT 200`);
  const rewards = all(`SELECT rr.*, a.name AS referrer_name, r.referred_account_id, aa.name AS referred_name, o.order_no
                       FROM referral_rewards rr LEFT JOIN accounts a ON a.id = rr.referrer_account_id
                       LEFT JOIN referrals r ON r.id = rr.referral_id LEFT JOIN accounts aa ON aa.id = r.referred_account_id
                       LEFT JOIN orders o ON o.id = rr.order_id ORDER BY rr.id DESC LIMIT 200`);
  const withdrawals = all(`SELECT w.*, a.name AS account_name, a.phone, a.email
                            FROM referral_withdrawals w LEFT JOIN accounts a ON a.id = w.account_id ORDER BY w.id DESC LIMIT 200`);
  const totals = {
    referrals: get('SELECT COUNT(*) c FROM referrals').c,
    paid: get("SELECT COUNT(*) c FROM referrals WHERE status = 'paid'").c,
    rewardsCents: get("SELECT COALESCE(SUM(amount_cents),0) s FROM referral_rewards WHERE status != 'void'").s || 0,
    pendingWithdrawals: get("SELECT COUNT(*) c FROM referral_withdrawals WHERE status IN ('requested','approved')").c
  };
  return { referrals, rewards, withdrawals, totals };
}
function updateWithdrawal(id, status, note, platformUserId) {
  if (!['approved', 'rejected', 'paid'].includes(status)) throw Object.assign(new Error('状态不合法'), { status: 400 });
  const w = get('SELECT * FROM referral_withdrawals WHERE id = ?', [Number(id)]);
  if (!w) throw Object.assign(new Error('提现记录不存在'), { status: 404 });
  run("UPDATE referral_withdrawals SET status = ?, note = COALESCE(?, note), platform_user_id = ?, processed_at = CASE WHEN ? IN ('rejected','paid') THEN datetime('now') ELSE processed_at END WHERE id = ?", [status, note || null, platformUserId || null, status, w.id]);
  return get('SELECT * FROM referral_withdrawals WHERE id = ?', [w.id]);
}
module.exports = { RATE, HOLD_DAYS, MIN_WITHDRAW_CENTS, normalizeCode, codeOf, recordVisit, recordReferral, syncActivated, makeRewardsAvailable, rewardPaidOrder, balanceCents, overview, requestWithdrawal, opsOverview, updateWithdrawal };
