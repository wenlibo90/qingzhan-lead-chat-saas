'use strict';

const express = require('express');
const { authRequired, featureGate, requireRole } = require('../auth');
const analytics = require('../services/analytics');

const router = express.Router();
router.use(authRequired);

function handle(fn) {
  return (req, res, next) => {
    try {
      res.json(fn(req));
    } catch (err) {
      next(err);
    }
  };
}

router.get('/overview', featureGate('basic_stats'), handle((req) => analytics.overview(req)));
router.get('/realtime', featureGate('basic_stats'), handle((req) => analytics.realtime(req)));

const advanced = [requireRole('admin', 'operator'), featureGate('source_stats')];
router.get('/pages', ...advanced, handle((req) => analytics.pages(req)));
router.get('/acquisition', ...advanced, handle((req) => analytics.acquisition(req)));
router.get('/audience', ...advanced, handle((req) => analytics.audience(req)));
router.get('/events', ...advanced, handle((req) => analytics.events(req)));

router.get('/export', ...advanced, (req, res, next) => {
  try {
    const csv = analytics.exportCsv(req);
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${csv.filename}"`);
    res.send(csv.content);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
