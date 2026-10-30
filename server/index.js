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

app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true, limit: '2mb' }));

// Widget script must be embeddable cross-origin
app.use('/widget.js', (req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Cache-Control', 'public, max-age=60');
  res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
  next();
});
app.use('/widget-core.js', (req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Cache-Control', 'public, max-age=300');
  res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
  next();
});

app.use('/api/public', publicRoutes);
app.use('/api/public', landingRoutes);
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

app.get(['/admin', '/admin/'], (req, res) => res.sendFile(path.join(PUBLIC_DIR, 'admin', 'index.html')));
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

server.listen(PORT, HOST, () => {
  console.log(`[qingzhan] server running at http://${HOST}:${PORT}`);
  console.log(`[qingzhan] landing:  http://localhost:${PORT}/`);
  console.log(`[qingzhan] admin:    http://localhost:${PORT}/admin/`);
  console.log(`[qingzhan] demo:     http://localhost:${PORT}/demo/`);
  console.log(`[qingzhan] widget:   http://localhost:${PORT}/widget.js?key=qz_demo_8f3k2m`);
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
