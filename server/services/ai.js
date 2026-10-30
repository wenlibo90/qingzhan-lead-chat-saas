'use strict';
const { all, json } = require('../db');

const STOP = new Set(['的', '了', '是', '吗', '呢', '我', '你', '我们', '你们', '请问', '可以', '怎么', '什么', '这个', '那个', '和', '与', '有', '在']);

function bigrams(text) {
  const clean = String(text || '').toLowerCase().replace(/[\s，。！？、,.!?;；:：()（）【】\[\]"'`]/g, '');
  const grams = new Set();
  for (let i = 0; i < clean.length - 1; i++) {
    const g = clean.slice(i, i + 2);
    if (!STOP.has(g)) grams.add(g);
  }
  return grams;
}

function overlap(a, b) {
  let n = 0;
  for (const g of a) if (b.has(g)) n++;
  return n;
}

function matchFaq(siteId, text) {
  const faqs = all('SELECT * FROM faqs WHERE site_id = ? AND enabled = 1', [siteId]);
  const q = bigrams(text);
  let best = null;
  let bestScore = 0;
  for (const faq of faqs) {
    const target = bigrams(faq.question + faq.answer);
    const score = overlap(q, target) / Math.max(3, Math.sqrt(target.size || 1));
    if (score > bestScore) {
      bestScore = score;
      best = faq;
    }
  }
  if (best && bestScore >= 0.55) return { faq: best, score: bestScore };
  return null;
}

function autoTag(text) {
  const t = String(text || '');
  const tags = [];
  const dict = [
    ['价格', ['价格', '多少钱', '费用', '报价', '预算', '贵']],
    ['接入', ['接入', '代码', 'js', '安装', '部署']],
    ['多站点', ['多站点', '多个网站', '站点']],
    ['外贸', ['外贸', '英文', '海外', '跨境', '多语言']],
    ['教育', ['教育', '培训', '课程', '学员']],
    ['高意向', ['演示', '试用', '合同', '付款', '采购', '报价单']],
    ['AI', ['ai', '机器人', '自动回复']]
  ];
  for (const [tag, words] of dict) if (words.some((w) => t.toLowerCase().includes(w))) tags.push(tag);
  if (/1[3-9]\d{9}/.test(t)) tags.push('已留手机号');
  return [...new Set(tags)];
}

function summarize(messages, visitor) {
  const texts = messages.filter((m) => m.sender_type === 'visitor').map((m) => m.content || '').join(' ');
  const agentTexts = messages.filter((m) => m.sender_type === 'agent').map((m) => m.content || '').join(' ');
  const tags = autoTag(texts);
  const need = texts
    ? (texts.match(/[^。！？!?]{6,60}[。！？!?]?/g) || [texts.slice(0, 80)]).slice(0, 2).join(' ')
    : '暂未表达明确需求';
  let suggestion = '建议 24 小时内电话回访，确认预算与决策人。';
  if (tags.includes('价格')) suggestion = '客户关注价格，建议先发送年付优惠与按流量测算的报价单。';
  if (tags.includes('接入')) suggestion = '客户关注接入成本，建议直接发送一段 JS 接入示例并约 20 分钟演示。';
  if (tags.includes('外贸')) suggestion = '外贸场景，建议介绍多语言接待与自定义域名能力。';
  if (!agentTexts) suggestion = '会话尚无人工回复，建议立即接管并发送首个问题。';
  const summary = texts
    ? `访客${visitor && visitor.province ? `来自${visitor.province}` : ''}，主要咨询：${need.slice(0, 120)}。共发送 ${messages.filter((m) => m.sender_type === 'visitor').length} 条消息。`
    : '访客进入会话但未发送消息，可结合页面轨迹主动跟进。';
  const intent = tags.includes('高意向') ? 'high' : tags.includes('价格') || tags.includes('接入') ? 'medium' : 'low';
  return { summary, need: need.slice(0, 180), suggestion, tags: tags.slice(0, 5), intent };
}

const EN_PHRASES = [
  ['您好', 'Hello'], ['你好', 'Hello'], ['谢谢', 'Thank you'], ['再见', 'Goodbye'],
  ['价格', 'price'], ['多少钱', 'how much'], ['免费', 'free'], ['套餐', 'plan'],
  ['接入', 'integration'], ['代码', 'code'], ['客服', 'support'], ['演示', 'demo'],
  ['访客', 'visitor'], ['线索', 'lead'], ['网站', 'website'], ['可以', 'yes, we can'],
  ['稍等', 'please wait a moment'], ['支持', 'support'], ['试用', 'trial'], ['发票', 'invoice']
];

function translate(text, target = 'en') {
  let out = String(text || '');
  if (target === 'zh') {
    for (const [zh, en] of EN_PHRASES) {
      out = out.replace(new RegExp(en.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi'), zh);
    }
    if (out === text) out = `[中文] ${text}`;
    return out;
  }
  for (const [zh, en] of EN_PHRASES) out = out.split(zh).join(en);
  if (out === text) out = `[EN] ${text}`;
  return out;
}

module.exports = { matchFaq, autoTag, summarize, translate };
