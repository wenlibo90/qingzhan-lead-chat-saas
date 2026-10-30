'use strict';

const buckets = new Map();
let lastSweep = Date.now();

function hit(key, limit, windowMs) {
  const now = Date.now();
  if (now - lastSweep > 60000) {
    for (const [k, v] of buckets) if (now - v.start > 120000) buckets.delete(k);
    lastSweep = now;
  }
  let bucket = buckets.get(key);
  if (!bucket || now - bucket.start > windowMs) {
    bucket = { start: now, count: 0 };
    buckets.set(key, bucket);
  }
  bucket.count += 1;
  return { ok: bucket.count <= limit, remaining: Math.max(0, limit - bucket.count), reset: bucket.start + windowMs };
}

function middleware(limit, windowMs, keyFn) {
  return (req, res, next) => {
    const key = `${req.path}:${keyFn ? keyFn(req) : (req.ip || 'unknown')}`;
    const result = hit(key, limit, windowMs);
    if (!result.ok) {
      return res.status(429).json({ error: '请求过于频繁，请稍后再试', code: 'RATE_LIMITED', retry_after: Math.ceil((result.reset - Date.now()) / 1000) });
    }
    next();
  };
}

module.exports = { hit, middleware };
