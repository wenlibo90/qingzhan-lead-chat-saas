'use strict';
const path = require('node:path');
const crypto = require('node:crypto');
const fs = require('node:fs');
const { DatabaseSync } = require('node:sqlite');

const DATA_DIR = path.join(__dirname, '..', 'data');
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

const db = new DatabaseSync(process.env.DB_FILE || path.join(DATA_DIR, 'app.db'));

const schema = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8');
db.exec(schema);

function tableSql(name) {
  const row = db.prepare("SELECT sql FROM sqlite_master WHERE type = 'table' AND name = ?").get(name);
  return row ? row.sql : '';
}
function columns(name) {
  return db.prepare(`PRAGMA table_info(${name})`).all().map((c) => c.name);
}
function ensureColumn(table, column, ddl) {
  if (!columns(table).includes(column)) db.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${ddl}`);
}

// Existing installations: add platform fields without dropping tenant data.
ensureColumn('tenants', 'plan_status', "TEXT NOT NULL DEFAULT 'active'");
ensureColumn('tenants', 'trial_started_at', 'TEXT');
ensureColumn('tenants', 'signup_source', 'TEXT');
ensureColumn('tenants', 'signup_ip', 'TEXT');
ensureColumn('tenants', 'risk_score', 'INTEGER NOT NULL DEFAULT 0');
ensureColumn('tenants', 'onboarding_state', "TEXT NOT NULL DEFAULT '{}'");
ensureColumn('tenants', 'billing_cycle', "TEXT NOT NULL DEFAULT 'monthly'");
ensureColumn('tenants', 'current_period_start', 'TEXT');
ensureColumn('tenants', 'current_period_end', 'TEXT');
ensureColumn('tenants', 'cancel_at_period_end', 'INTEGER NOT NULL DEFAULT 0');
ensureColumn('tenants', 'last_payment_at', 'TEXT');
ensureColumn('sites', 'is_sandbox', 'INTEGER NOT NULL DEFAULT 0');
ensureColumn('sites', 'installed_at', 'TEXT');
ensureColumn('sites', 'last_widget_ping_at', 'TEXT');
ensureColumn('sites', 'sandbox_visited_at', 'TEXT');
ensureColumn('sites', 'loader_token', 'TEXT');
try {
  const DEMO_TOKEN = '0f928e95b1adc3f89d3a1e0dab18c5bf';
  const siteRows = db.prepare('SELECT id, site_key, loader_token FROM sites').all();
  const used = new Set(siteRows.map((s) => s.loader_token).filter(Boolean));
  for (const site of siteRows) {
    if (site.site_key === 'qz_demo_8f3k2m') {
      if (site.loader_token !== DEMO_TOKEN) db.prepare('UPDATE sites SET loader_token = ? WHERE id = ?').run(DEMO_TOKEN, site.id);
      used.add(DEMO_TOKEN);
      continue;
    }
    if (site.loader_token && /^[a-f0-9]{32}$/.test(site.loader_token)) continue;
    let token;
    do { token = crypto.randomBytes(16).toString('hex'); } while (used.has(token));
    used.add(token);
    db.prepare('UPDATE sites SET loader_token = ? WHERE id = ?').run(token, site.id);
  }
  db.exec('CREATE UNIQUE INDEX IF NOT EXISTS idx_sites_loader_token ON sites(loader_token)');
} catch (e) { /* migration must not block startup */ }

// Privacy banner is intentionally disabled until the product is ready for a full consent flow.
try {
  const siteRows = db.prepare('SELECT id, widget_config, compliance_enabled FROM sites').all();
  for (const site of siteRows) {
    let cfg = {};
    try { cfg = JSON.parse(site.widget_config || '{}'); } catch (e) { cfg = {}; }
    if ((cfg.compliance && cfg.compliance.enabled) || site.compliance_enabled) {
      cfg.compliance = Object.assign({}, cfg.compliance || {}, { enabled: false, text: '', policyUrl: '' });
      db.prepare('UPDATE sites SET widget_config = ?, compliance_enabled = 0 WHERE id = ?').run(JSON.stringify(cfg), site.id);
    }
  }
} catch (e) { /* migration must not block startup */ }

// Rebuild the legacy users table so one account can join multiple workspaces.
if (tableSql('users').includes('email TEXT NOT NULL UNIQUE')) {
  db.exec('DROP INDEX IF EXISTS idx_users_tenant');
  db.exec('DROP INDEX IF EXISTS idx_users_account');
  db.exec('ALTER TABLE users RENAME TO users_legacy');
  db.exec(`CREATE TABLE users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    tenant_id INTEGER NOT NULL REFERENCES tenants(id),
    account_id INTEGER REFERENCES accounts(id),
    email TEXT,
    phone TEXT,
    name TEXT NOT NULL,
    password_hash TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'agent',
    avatar TEXT,
    status TEXT NOT NULL DEFAULT 'active',
    permissions TEXT DEFAULT '[]',
    last_login_at TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    UNIQUE(tenant_id, email)
  )`);
  db.exec(`INSERT INTO users (id, tenant_id, account_id, email, phone, name, password_hash, role, avatar, status, permissions, last_login_at, created_at)
           SELECT id, tenant_id, NULL, email, NULL, name, password_hash, role, avatar, status, permissions, last_login_at, created_at FROM users_legacy`);
  db.exec('DROP TABLE users_legacy');
  db.exec('CREATE INDEX IF NOT EXISTS idx_users_tenant ON users(tenant_id)');
  db.exec('CREATE INDEX IF NOT EXISTS idx_users_account ON users(account_id)');
}

if (!columns('users').includes('account_id')) ensureColumn('users', 'account_id', 'INTEGER REFERENCES accounts(id)');
if (!columns('users').includes('phone')) ensureColumn('users', 'phone', 'TEXT');
db.exec('CREATE INDEX IF NOT EXISTS idx_users_account ON users(account_id)');

// Backfill accounts from legacy tenant users.
const orphans = all('SELECT * FROM users WHERE account_id IS NULL');
for (const user of orphans) {
  const email = user.email ? String(user.email).toLowerCase() : null;
  const phone = user.phone || null;
  let account = email ? get('SELECT * FROM accounts WHERE email = ?', [email]) : null;
  if (!account && phone) account = get('SELECT * FROM accounts WHERE phone = ?', [phone]);
  if (!account) {
    const id = db.prepare('INSERT INTO accounts (phone, email, name, password_hash, signup_source) VALUES (?,?,?,?,?)')
      .run(phone, email, user.name, user.password_hash, 'seed').lastInsertRowid;
    account = get('SELECT * FROM accounts WHERE id = ?', [id]);
  }
  db.prepare('UPDATE users SET account_id = ?, phone = COALESCE(phone, ?) WHERE id = ?').run(account.id, phone, user.id);
}

function all(sql, params = []) {
  return db.prepare(sql).all(...params);
}
function get(sql, params = []) {
  return db.prepare(sql).get(...params);
}
function run(sql, params = []) {
  return db.prepare(sql).run(...params);
}
function tx(fn) {
  db.exec('BEGIN');
  try {
    const out = fn();
    db.exec('COMMIT');
    return out;
  } catch (err) {
    db.exec('ROLLBACK');
    throw err;
  }
}
function json(value, fallback) {
  if (value == null) return fallback;
  if (typeof value === 'object') return value;
  try { return JSON.parse(value); } catch { return fallback; }
}

module.exports = { db, all, get, run, tx, json, DATA_DIR };
