'use strict';

function intentOf(visitor, extra = {}) {
  let score = 0;
  const pages = Number(visitor.pageview_count || 0);
  const visits = Number(visitor.visit_count || 1);
  const dwell = Number(visitor.total_dwell_ms || 0);
  const convs = Number(extra.conversations || 0);
  const submissions = Number(extra.submissions || 0);
  const pricing = Number(extra.pricingViews || 0);

  score += Math.min(pages * 3, 30);
  score += Math.min(visits * 6, 24);
  score += Math.min(Math.floor(dwell / 60000) * 2, 18);
  score += Math.min(pricing * 8, 24);
  score += Math.min(convs * 15, 30);
  score += Math.min(submissions * 20, 40);

  if (visitor.phone) score += 15;
  if (visitor.email) score += 8;
  if (visitor.company) score += 6;

  score = Math.max(0, Math.min(100, score));
  const level = score >= 60 ? 'high' : score >= 30 ? 'medium' : 'low';
  return { score, level };
}

module.exports = { intentOf };
