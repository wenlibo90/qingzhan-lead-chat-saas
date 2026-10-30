'use strict';
const { all, run, json } = require('../db');

function createNotification(tenantId, userId, type, title, content, payload = {}) {
  return run(
    'INSERT INTO notifications (tenant_id, user_id, type, title, content, payload) VALUES (?,?,?,?,?,?)',
    [tenantId, userId || null, type, title, content || '', JSON.stringify(payload)]
  );
}

async function pushWebhook(channel, payload) {
  const body = channel.type === 'dingtalk'
    ? { msgtype: 'markdown', markdown: { title: payload.title, text: `### ${payload.title}\n\n${payload.content}` } }
    : { msgtype: 'markdown', markdown: { content: `### ${payload.title}\n${payload.content}` } };
  try {
    const resp = await fetch(channel.webhook, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(2500)
    });
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    return true;
  } catch (err) {
    return false;
  }
}

async function notifyTenant(tenantId, event, title, content, payload = {}) {
  createNotification(tenantId, null, event, title, content, payload);
  const channels = all('SELECT * FROM notification_channels WHERE tenant_id = ? AND enabled = 1', [tenantId]);
  await Promise.all(
    channels
      .filter((c) => json(c.events, []).includes(event))
      .map((c) => pushWebhook(c, { title, content, ...payload }))
  );
}

module.exports = { createNotification, notifyTenant };
