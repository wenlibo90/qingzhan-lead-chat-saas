'use strict';
const crypto = require('node:crypto');
const { get, run, tx } = require('../db');
const { hashPassword } = require('../auth');
const { defaultWidget } = require('./site-defaults');

function normalizeEmail(email) {
  const value = email ? String(email).trim().toLowerCase() : '';
  return value || null;
}
function normalizePhone(phone) {
  const value = phone ? String(phone).replace(/\D/g, '') : '';
  return value || null;
}
function futureDate(days) {
  return new Date(Date.now() + days * 86400000).toISOString().slice(0, 19).replace('T', ' ');
}
function siteKey(prefix = 'qz') {
  return `${prefix}_${crypto.randomBytes(7).toString('hex')}`;
}
function loaderToken() {
  return crypto.randomBytes(16).toString('hex');
}
function referralCode() {
  return crypto.randomBytes(4).toString('hex').toUpperCase();
}
function randomPassword() {
  return crypto.randomBytes(9).toString('base64url');
}

function assessRisk({ ip, email }) {
  let score = 0;
  if (ip) {
    const row = get("SELECT COUNT(*) c FROM accounts WHERE signup_ip = ? AND created_at >= datetime('now','-1 day')", [ip]);
    if (row && row.c > 2) score += 30 + row.c * 5;
  }
  if (email && /(mailinator|guerrillamail|10minutemail|tempmail|yopmail)\./i.test(email)) score += 35;
  return Math.min(100, score);
}

function ensureAccount({ name, email, phone, password, source = 'self_serve', ip = null, locale = 'zh-CN' }) {
  const normEmail = normalizeEmail(email);
  const normPhone = normalizePhone(phone);
  let account = normEmail ? get('SELECT * FROM accounts WHERE email = ?', [normEmail]) : null;
  if (!account && normPhone) account = get('SELECT * FROM accounts WHERE phone = ?', [normPhone]);
  if (account) return { account, created: false, tempPassword: null };
  const tempPassword = password || randomPassword();
  const id = run(
    'INSERT INTO accounts (phone, email, name, password_hash, signup_source, signup_ip, risk_score, referral_code, locale) VALUES (?,?,?,?,?,?,?,?,?)',
    [normPhone, normEmail, String(name || '用户').slice(0, 40), hashPassword(tempPassword), source, ip, assessRisk({ ip, email: normEmail }), referralCode(), locale]
  ).lastInsertRowid;
  account = get('SELECT * FROM accounts WHERE id = ?', [id]);
  return { account, created: true, tempPassword };
}

function createWorkspace(opts) {
  const {
    workspaceName, ownerName, email, phone, password, website,
    plan = 'pro', planStatus = 'trialing', source = 'self_serve', ip = null,
    goal = '', industry = '', trialDays = 14, withSite = true, locale = 'zh-CN'
  } = opts || {};
  return tx(() => {
    const { account, created, tempPassword } = ensureAccount({ name: ownerName, email, phone, password, source, ip, locale });
    const trialEnds = planStatus === 'trialing' ? futureDate(trialDays) : null;
    const trialStarted = planStatus === 'trialing' ? new Date().toISOString().slice(0, 19).replace('T', ' ') : null;
    const tenantId = run(
      `INSERT INTO tenants (name, plan, plan_status, trial_started_at, trial_ends_at, signup_source, signup_ip, risk_score, onboarding_state)
       VALUES (?,?,?,?,?,?,?,?,?)`,
      [String(workspaceName || `${ownerName || '我的'}工作空间`).slice(0, 60), plan, planStatus, trialStarted, trialEnds, source, ip, assessRisk({ ip, email }), JSON.stringify({ goal, industry })]
    ).lastInsertRowid;
    const userId = run(
      'INSERT INTO users (tenant_id, account_id, email, phone, name, password_hash, role, avatar) VALUES (?,?,?,?,?,?,?,?)',
      [tenantId, account.id, account.email, account.phone, String(ownerName || account.name || '管理员').slice(0, 30), account.password_hash, 'admin', String(ownerName || account.name || '管').slice(0, 1)]
    ).lastInsertRowid;
    let prodId = null;
    if (withSite) {
      const prodConfig = defaultWidget({
        title: '在线客服',
        agentName: ownerName || '在线顾问',
        welcome: `您好，我是${ownerName || '在线顾问'}。请问有什么可以帮您？`,
        prechatEnabled: false
      });
      prodId = run(
        'INSERT INTO sites (tenant_id, name, domain, site_key, loader_token, widget_config, is_sandbox) VALUES (?,?,?,?,?,?,0)',
        [tenantId, String(workspaceName || '我的网站').slice(0, 50), String(website || '').slice(0, 120), siteKey(), loaderToken(), JSON.stringify(prodConfig)]
      ).lastInsertRowid;
    }
    const user = get('SELECT * FROM users WHERE id = ?', [userId]);
    return {
      account,
      accountCreated: created,
      tempPassword: created ? tempPassword : null,
      tenant: get('SELECT * FROM tenants WHERE id = ?', [tenantId]),
      user,
      site: prodId ? get('SELECT * FROM sites WHERE id = ?', [prodId]) : null
    };
  });
}

module.exports = { createWorkspace, ensureAccount, assessRisk, siteKey, loaderToken, referralCode, normalizeEmail, normalizePhone, futureDate };
