'use strict';
const path = require('node:path');
const http = require('node:http');
const fs = require('node:fs');
const express = require('express');
const { Server } = require('socket.io');

const publicRoutes = require('./routes/public');
const authRoutes = require('./routes/auth');
const conversationRoutes = require('./routes/conversations');
const visitorRoutes = require('./routes/visitors');
const leadRoutes = require('./routes/leads');
const reportRoutes = require('./routes/reports');
const configRoutes = require('./routes/config');
const settingsRoutes = require('./routes/settings');
const externalRoutes = require('./routes/external');
const landingRoutes = require('./routes/landing');
const signupRoutes = require('./routes/signup');
const onboardingRoutes = require('./routes/onboarding');
const opsRoutes = require('./routes/ops');
const paymentRoutes = require('./routes/payments');
const supportRoutes = require('./routes/support');
const referralRoutes = require('./routes/referral');
const referralService = require('./services/referral');
const { startLifecycle } = require('./services/lifecycle');
const socketInit = require('./socket').init;
const { UPLOAD_DIR } = require('./upload');

const PORT = Number(process.env.PORT || 3000);
const HOST = process.env.HOST || '0.0.0.0';
const ROOT = path.join(__dirname, '..');
const PUBLIC_DIR = path.join(ROOT, 'public');

const app = express();
app.set('trust proxy', true);
app.disable('x-powered-by');

app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'interest-cohort=()');
  next();
});

app.use(express.json({ limit: '2mb', verify: (req, res, buf) => { req.rawBody = buf; } }));
app.use(express.urlencoded({ extended: true, limit: '2mb' }));

// Widget script must be embeddable cross-origin
app.use('/widget.js', (req, res, next) => {
  if (!scriptContextAllowed(req)) return res.status(404).type('text').send('Not Found');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Cache-Control', 'public, max-age=60');
  res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
  next();
});
app.use('/widget-core.js', (req, res, next) => {
  if (!scriptContextAllowed(req)) return res.status(404).type('text').send('Not Found');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Cache-Control', 'public, max-age=300');
  res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
  next();
});

function scriptContextAllowed(req) {
  const dest = String(req.headers['sec-fetch-dest'] || '').toLowerCase();
  if (dest) return dest === 'script';
  return Boolean(req.headers.referer);
}

app.get('/qz.js', (req, res) => {
  if (!scriptContextAllowed(req)) return res.status(404).type('text').send('Not Found');
  const token = decodeURIComponent(String(req.originalUrl.split('?')[1] || '').split('&')[0]).trim();
  if (!/^[a-f0-9]{32}$/.test(token)) return res.status(404).type('text').send('Not Found');
  const site = require('./db').get('SELECT s.*, t.status AS tenant_status FROM sites s JOIN tenants t ON t.id = s.tenant_id WHERE s.loader_token = ?', [token]);
  if (!site || site.tenant_status !== 'active' || site.blocked) return res.status(404).type('text').send('Not Found');
  const template = fs.readFileSync(path.join(PUBLIC_DIR, 'widget.js'), 'utf8');
  const body = template.replace('__SITE_KEY__', String(site.site_key).replace(/[^a-zA-Z0-9_]/g, ''));
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Cache-Control', 'public, max-age=300');
  res.setHeader('X-Robots-Tag', 'noindex, nofollow');
  res.type('application/javascript').send(body);
});

app.get('/qz-core.js', (req, res) => {
  if (!scriptContextAllowed(req)) return res.status(404).type('text').send('Not Found');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Cache-Control', 'public, max-age=300');
  res.setHeader('X-Robots-Tag', 'noindex, nofollow');
  res.type('application/javascript').sendFile(path.join(PUBLIC_DIR, 'widget-core.js'));
});

app.use('/api/public', (req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Access-Control-Max-Age', '86400');
  if (req.method === 'OPTIONS') return res.status(204).end();
  next();
});
app.use('/api/public', publicRoutes);
app.use('/api/public', landingRoutes);
app.use('/api/signup', signupRoutes);
app.use('/api/onboarding', onboardingRoutes);
app.use('/api/support', supportRoutes);
app.use('/api/referral', referralRoutes);
app.use('/api/ops', opsRoutes);
app.use('/api/public/payments', paymentRoutes);
app.use('/api/auth', authRoutes);
app.use('/api', landingRoutes);
app.use('/api/v1', externalRoutes);
app.use('/api/conversations', conversationRoutes);
app.use('/api/visitors', visitorRoutes);
app.use('/api/leads', leadRoutes);
app.use('/api', reportRoutes);
app.use('/api', configRoutes);
app.use('/api', settingsRoutes);

app.use('/uploads', express.static(UPLOAD_DIR, { maxAge: '7d', fallthrough: true }));
app.use(express.static(PUBLIC_DIR, { index: false, maxAge: 0, etag: true }));

app.get(['/demo', '/demo/'], (req, res) => res.sendFile(path.join(PUBLIC_DIR, 'demo', 'index.html')));
app.get('/r/:code', (req, res) => {
  const code = String(req.params.code || '').trim();
  referralService.recordVisit(code, (req.headers['x-forwarded-for'] || req.socket.remoteAddress || '').split(',')[0], req.headers['user-agent']);
  res.redirect(302, '/?signup=1&ref=' + encodeURIComponent(code));
});
app.get(['/promote', '/promote/'], (req, res) => res.sendFile(path.join(PUBLIC_DIR, 'promote.html')));
app.get(['/admin', '/admin/'], (req, res) => res.sendFile(path.join(PUBLIC_DIR, 'admin', 'index.html')));
app.get(['/ops', '/ops/'], (req, res) => res.sendFile(path.join(PUBLIC_DIR, 'ops', 'index.html')));
app.use('/admin', express.static(path.join(PUBLIC_DIR, 'admin'), { index: 'index.html', maxAge: 0 }));
app.get('/admin/*', (req, res) => res.sendFile(path.join(PUBLIC_DIR, 'admin', 'index.html')));

app.get('/', (req, res) => res.sendFile(path.join(PUBLIC_DIR, 'index.html')));

app.use((req, res) => {
  if (req.path.startsWith('/api/')) return res.status(404).json({ error: '接口不存在' });
  res.status(404).sendFile(path.join(PUBLIC_DIR, '404.html'), (err) => {
    if (err) res.status(404).send('404 Not Found');
  });
});

app.use((err, req, res, next) => {
  console.error('[error]', req.method, req.path, err.message);
  if (res.headersSent) return next(err);
  const status = err.status || (err.code === 'LIMIT_FILE_SIZE' ? 413 : 500);
  res.status(status).json({ error: status === 500 ? '服务器开小差了，请稍后再试' : err.message, code: err.code });
});

const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: true, credentials: false },
  maxHttpBufferSize: 1e6,
  pingTimeout: 20000,
  pingInterval: 25000
});

socketInit(io);

startLifecycle();

server.listen(PORT, HOST, () => {
  console.log(`[qingzhan] server running at http://${HOST}:${PORT}`);
  console.log(`[qingzhan] landing:  http://localhost:${PORT}/`);
  console.log(`[qingzhan] admin:    http://localhost:${PORT}/admin/`);
  console.log(`[qingzhan] demo:     http://localhost:${PORT}/demo/`);
  console.log(`[qingzhan] widget:   http://localhost:${PORT}/qz.js?0f928e95b1adc3f89d3a1e0dab18c5bf`);
});

function shutdown() {
  console.log('[qingzhan] shutting down...');
  io.close();
  server.close(() => process.exit(0));
  setTimeout(() => process.exit(0), 3000);
}
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

module.exports = { app, server, io };
