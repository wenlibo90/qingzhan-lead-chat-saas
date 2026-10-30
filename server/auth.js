'use strict';
const crypto = require('node:crypto');
const { get } = require('./db');
const { hasFeature, planOf } = require('./plans');

const SECRET = process.env.APP_SECRET || 'qingzhan-leadchat-dev-secret-2026';
const TOKEN_TTL = 1000 * 60 * 60 * 12;

function hashPassword(password, salt = crypto.randomBytes(16).toString('hex')) {
  const hash = crypto.scryptSync(String(password), salt, 32).toString('hex');
  return `scrypt$${salt}$${hash}`;
}

function verifyPassword(password, stored) {
  if (!stored) return false;
  const [scheme, salt, hash] = String(stored).split('$');
  if (scheme !== 'scrypt' || !salt || !hash) return false;
  const test = crypto.scryptSync(String(password), salt, 32).toString('hex');
  return crypto.timingSafeEqual(Buffer.from(hash, 'hex'), Buffer.from(test, 'hex'));
}

function b64(obj) {
  return Buffer.from(JSON.stringify(obj)).toString('base64url');
}

function signToken(user) {
  const payload = { uid: user.id, aid: user.account_id || null, tid: user.tenant_id, role: user.role, realm: 'tenant', exp: Date.now() + TOKEN_TTL };
  const body = b64(payload);
  const sig = crypto.createHmac('sha256', SECRET).update(body).digest('base64url');
  return `${body}.${sig}`;
}

function readToken(token) {
  if (!token || !token.includes('.')) return null;
  const [body, sig] = token.split('.');
  const expected = crypto.createHmac('sha256', SECRET).update(body).digest('base64url');
  if (sig.length !== expected.length) return null;
  if (!crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) return null;
  try {
    const payload = JSON.parse(Buffer.from(body, 'base64url').toString('utf8'));
    if (!payload.exp || payload.exp < Date.now()) return null;
    return payload;
  } catch {
    return null;
  }
}

function authRequired(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : (req.query.token || '');
  const payload = readToken(token);
  if (!payload) return res.status(401).json({ error: '登录已失效，请重新登录', code: 'UNAUTHORIZED' });
  const user = get('SELECT * FROM users WHERE id = ? AND status = ?', [payload.uid, 'active']);
  if (!user) return res.status(401).json({ error: '账号不可用', code: 'UNAUTHORIZED' });
  const account = user.account_id ? get('SELECT * FROM accounts WHERE id = ?', [user.account_id]) : null;
  if (account && account.status !== 'active') return res.status(403).json({ error: '登录账号已被停用', code: 'ACCOUNT_DISABLED' });
  const tenant = get('SELECT * FROM tenants WHERE id = ?', [user.tenant_id]);
  if (!tenant || tenant.status !== 'active') return res.status(403).json({ error: '工作空间已停用', code: 'TENANT_DISABLED' });
  req.user = user;
  req.account = account;
  req.tenant = tenant;
  next();
}

function signOpsToken(opsUser) {
  const payload = { pid: opsUser.id, role: opsUser.role, realm: 'ops', exp: Date.now() + TOKEN_TTL };
  const body = b64(payload);
  const sig = crypto.createHmac('sha256', SECRET).update(body).digest('base64url');
  return `${body}.${sig}`;
}

function readOpsToken(token) {
  const payload = readToken(token);
  if (!payload || payload.realm !== 'ops' || !payload.pid) return null;
  return payload;
}

function opsAuthRequired(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : (req.query.token || '');
  const payload = readOpsToken(token);
  if (!payload) return res.status(401).json({ error: '运营登录已失效', code: 'OPS_UNAUTHORIZED' });
  const user = get('SELECT * FROM platform_users WHERE id = ? AND status = ?', [payload.pid, 'active']);
  if (!user) return res.status(401).json({ error: '运营账号不可用', code: 'OPS_UNAUTHORIZED' });
  req.opsUser = user;
  next();
}

function requireOpsRole(...roles) {
  return (req, res, next) => {
    if (!req.opsUser || !roles.includes(req.opsUser.role)) {
      return res.status(403).json({ error: '当前运营角色无权执行该操作', code: 'OPS_FORBIDDEN' });
    }
    next();
  };
}

function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ error: '当前角色无权执行该操作', code: 'FORBIDDEN' });
    }
    next();
  };
}

function featureGate(feature) {
  return (req, res, next) => {
    const plan = req.tenant.plan;
    if (!hasFeature(plan, feature)) {
      return res.status(403).json({
        error: `当前套餐（${planOf(plan).name}）未开通该能力`,
        code: 'PLAN_LOCKED',
        feature,
        required: feature
      });
    }
    next();
  };
}

function signApiKey() {
  return 'qz_' + crypto.randomBytes(24).toString('hex');
}

function apiKeyAuth(req, res, next) {
  const key = req.headers['x-api-key'] || req.query.api_key;
  if (!key) return res.status(401).json({ error: '缺少 x-api-key', code: 'UNAUTHORIZED' });
  const record = get('SELECT * FROM api_keys WHERE key = ? AND enabled = 1', [key]);
  if (!record) return res.status(401).json({ error: 'API Key 无效', code: 'UNAUTHORIZED' });
  const tenant = get('SELECT * FROM tenants WHERE id = ?', [record.tenant_id]);
  if (!tenant || !hasFeature(tenant.plan, 'api')) {
    return res.status(403).json({ error: '当前套餐未开通开放 API', code: 'PLAN_LOCKED' });
  }
  req.tenant = tenant;
  req.apiKey = record;
  next();
}

module.exports = {
  hashPassword, verifyPassword, signToken, readToken, authRequired,
  requireRole, featureGate, signApiKey, apiKeyAuth,
  signOpsToken, readOpsToken, opsAuthRequired, requireOpsRole
};
