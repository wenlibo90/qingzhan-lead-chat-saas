'use strict';
const express = require('express');
const billing = require('../services/billing');
const router = express.Router();

router.post('/webhook/:provider', (req, res) => {
  const raw = req.rawBody || Buffer.from(JSON.stringify(req.body || {}));
  const signature = req.headers['x-payment-signature'] || req.headers['x-qz-signature'];
  if (!billing.verifyWebhook(raw, signature)) return res.status(401).json({ error: '签名校验失败' });
  const b = req.body || {};
  const eventId = String(b.event_id || b.eventId || '').slice(0, 120);
  const orderNo = String(b.order_no || b.orderNo || '').slice(0, 80);
  const amount = Number(b.amount_cents != null ? b.amount_cents : b.amountCents);
  const status = String(b.status || '');
  if (!eventId || !orderNo || !Number.isFinite(amount)) return res.status(400).json({ error: '回调参数不完整' });
  try {
    const result = billing.processWebhook({
      provider: String(req.params.provider || 'external').slice(0, 30),
      eventId, orderNo, amountCents: amount, status,
      providerTradeNo: b.provider_trade_no || b.providerTradeNo || null,
      raw: raw.toString('utf8')
    });
    res.json({ ok: true, duplicate: !!result.duplicate, failed: !!result.failed });
  } catch (e) {
    res.status(e.status || 400).json({ error: e.message });
  }
});

module.exports = router;
