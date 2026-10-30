'use strict';
const express = require('express');
const { authRequired, requireRole } = require('../auth');
const { publicBase } = require('../helpers');
const referral = require('../services/referral');

const router = express.Router();
router.use(authRequired);
router.get('/', (req, res) => {
  if (!req.account) return res.status(400).json({ error: '账号信息缺失' });
  res.json(referral.overview(req.account.id, publicBase(req)));
});
router.post('/withdrawals', requireRole('admin'), (req, res) => {
  try {
    const w = referral.requestWithdrawal(req.account.id, req.body.amount_cents || Math.round(Number(req.body.amount || 0) * 100), req.body.note);
    res.json({ ok: true, withdrawal: w, balance_cents: referral.balanceCents(req.account.id) });
  } catch (e) {
    res.status(e.status || 400).json({ error: e.message });
  }
});
module.exports = router;
