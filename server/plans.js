'use strict';

const FEATURES = {
  chat: '在线客服对话',
  widget_basic: '基础挂件配置',
  basic_stats: '基础数据统计',
  offline_msg: '离线留言',
  triggers: '主动触发弹窗',
  forms: '自定义表单',
  visitor_profile_basic: '基础访客画像',
  source_stats: '来源渠道统计',
  keyword_reply: '关键词自动回复',
  rating: '满意度评价',
  knowledge: '自助知识库',
  announcement: '公告悬浮条',
  blacklist: '访客黑名单',
  funnel: '转化漏斗报表',
  intent_scoring: '意向自动打分',
  crm: '轻量线索 CRM',
  geo_heatmap: '全国区域热力图',
  agent_perf: '客服绩效报表',
  automation: '自动化规则引擎',
  recording: '访客录屏',
  leads_export: '线索导出 Excel',
  churn_report: '流失访客报表',
  ai_bot: 'AI 接待机器人',
  translation: '多语言对话翻译',
  whitelabel: '白标与自定义域名',
  api: '开放 API',
  sla: 'SLA 专属支持',
  team_unlimited: '无限子账号'
};

const PLANS = [
  {
    code: 'free',
    name: '免费版',
    price: 0,
    yearly: 0,
    tagline: '验证一段 JS 的威力',
    color: 'gray',
    features: ['chat', 'widget_basic', 'basic_stats', 'offline_msg'],
    limits: { agents: 1, sites: 1, visitors_monthly: 1000 },
    highlights: ['基础聊天与离线留言', '1 个客服账号', '基础挂件配置', '基础访问统计']
  },
  {
    code: 'standard',
    name: '标准版',
    price: 299,
    yearly: 2990,
    tagline: '让访客主动开口',
    color: 'blue',
    features: ['chat', 'widget_basic', 'basic_stats', 'offline_msg', 'triggers', 'forms', 'visitor_profile_basic', 'source_stats', 'keyword_reply', 'rating'],
    limits: { agents: 3, sites: 2, visitors_monthly: 20000 },
    highlights: ['主动触发弹窗与自定义表单', '基础访客画像与来源统计', '3 个子账号', '关键词自动回复与满意度评价']
  },
  {
    code: 'pro',
    name: '专业版',
    price: 899,
    yearly: 8990,
    tagline: '把流量变成线索',
    color: 'purple',
    recommended: true,
    features: ['chat', 'widget_basic', 'basic_stats', 'offline_msg', 'triggers', 'forms', 'visitor_profile_basic', 'source_stats', 'keyword_reply', 'rating', 'funnel', 'intent_scoring', 'crm', 'geo_heatmap', 'agent_perf', 'automation', 'recording', 'leads_export', 'churn_report', 'knowledge', 'announcement', 'blacklist'],
    limits: { agents: 10, sites: 5, visitors_monthly: 100000 },
    highlights: ['转化漏斗与客服绩效报表', '意向自动打分与轻线索 CRM', '可视化自动化规则引擎', '访客录屏与线索批量导出']
  },
  {
    code: 'enterprise',
    name: '企业版',
    price: 0,
    yearly: 0,
    tagline: '为增长团队定制',
    color: 'gold',
    features: ['chat', 'widget_basic', 'basic_stats', 'offline_msg', 'triggers', 'forms', 'visitor_profile_basic', 'source_stats', 'keyword_reply', 'rating', 'funnel', 'intent_scoring', 'crm', 'geo_heatmap', 'agent_perf', 'automation', 'recording', 'leads_export', 'churn_report', 'knowledge', 'announcement', 'blacklist', 'ai_bot', 'translation', 'whitelabel', 'api', 'sla', 'team_unlimited'],
    limits: { agents: -1, sites: -1, visitors_monthly: -1 },
    highlights: ['AI 接待机器人与会话摘要', '多语言对话翻译', '白标、自定义域名与开放 API', '专属 SLA 与无限子账号']
  }
];

function planOf(code) {
  return PLANS.find((p) => p.code === code) || PLANS[0];
}
function featuresOf(code) {
  return planOf(code).features;
}
function hasFeature(code, feature) {
  return featuresOf(code).includes(feature);
}
function limitOf(code, key) {
  return planOf(code).limits[key];
}

module.exports = { PLANS, FEATURES, planOf, featuresOf, hasFeature, limitOf };
