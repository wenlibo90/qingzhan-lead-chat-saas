'use strict';
const { db, run, get, all, tx } = require('./db');
const { hashPassword, signApiKey } = require('./auth');
const { createWorkspace, loaderToken, referralCode } = require('./services/provision');

function pad(n) { return String(n).padStart(2, '0'); }
function fmt(d) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}
function daysAgo(n, hour = 10, minute = 0) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  d.setHours(hour, minute, Math.floor(Math.random() * 59), 0);
  return d;
}
function addMinutes(date, minutes) {
  return new Date(date.getTime() + minutes * 60000);
}

let seed = 20261029;
function rnd() {
  seed = (seed * 1664525 + 1013904223) % 4294967296;
  return seed / 4294967296;
}
function pick(arr) { return arr[Math.floor(rnd() * arr.length)]; }
function rand(min, max) { return Math.floor(rnd() * (max - min + 1)) + min; }

const SURNAMES = ['陈', '林', '王', '李', '张', '刘', '黄', '周', '吴', '徐', '孙', '马', '朱', '胡', '郭', '何', '高', '罗', '郑', '梁', '谢', '宋', '唐', '韩', '曹', '邓', '彭', '曾', '萧', '田'];
const GIVEN = ['晓峰', '思远', '雨桐', '子涵', '浩然', '嘉怡', '文博', '梦琪', '宇航', '若曦', '俊杰', '静怡', '明轩', '佳琪', '天宇', '欣怡', '志强', '雅琳', '一鸣', '诗涵'];
const COMPANIES = ['远航教育', '橙子烘焙', '云启软件', '恒信物流', '悦颜医美', '森屿家居', '北辰咨询', '简一设计', '青柠健身', '海纳跨境', '起点财税', '木棉服饰', '星野摄影', '康桥口腔', '鹏程建材', '微光文化'];
const BUSINESS = ['企业服务', '教育培训', '电商零售', '医疗健康', '家居建材', 'SaaS 软件', '本地生活', '跨境贸易'];
const CITIES = [
  ['广东', '深圳'], ['北京', '北京'], ['上海', '上海'], ['浙江', '杭州'], ['江苏', '南京'],
  ['四川', '成都'], ['湖北', '武汉'], ['山东', '青岛'], ['福建', '厦门'], ['陕西', '西安'],
  ['河南', '郑州'], ['湖南', '长沙']
];
const PAGES = [
  ['/', '云图科技 - 让每一次访问都有回响', 'direct'],
  ['/product', '产品能力 - 云图线索客服', 'direct'],
  ['/pricing', '价格方案 - 云图线索客服', 'direct'],
  ['/case', '客户案例 - 云图科技', 'direct'],
  ['/about', '关于我们 - 云图科技', 'direct'],
  ['/blog/jsqr', '一段 JS 如何提升 38% 留资率', 'blog'],
  ['/contact', '联系销售 - 云图科技', 'direct']
];
const SOURCES = [
  { source: 'baidu', medium: 'organic', campaign: '', keyword: '在线客服系统', weight: 26 },
  { source: 'google', medium: 'organic', campaign: '', keyword: 'saas live chat', weight: 12 },
  { source: 'wechat', medium: 'social', campaign: '公众号推文', keyword: '', weight: 18 },
  { source: 'zhihu', medium: 'social', campaign: '问答引流', keyword: '', weight: 10 },
  { source: 'douyin', medium: 'cpc', campaign: '秋季获客', keyword: '', weight: 8 },
  { source: 'direct', medium: 'none', campaign: '', keyword: '', weight: 20 },
  { source: 'partner', medium: 'referral', campaign: '渠道合作', keyword: '', weight: 6 }
];
const DEVICES = [
  { device: 'desktop', browser: 'Chrome', os: 'Windows', w: 52 },
  { device: 'mobile', browser: 'Safari', os: 'iOS', w: 30 },
  { device: 'mobile', browser: 'WeChat', os: 'Android', w: 12 },
  { device: 'desktop', browser: 'Edge', os: 'macOS', w: 6 }
];
function weighted(list) {
  const total = list.reduce((s, i) => s + i.weight, 0);
  let r = rnd() * total;
  for (const item of list) { r -= item.weight; if (r <= 0) return item; }
  return list[0];
}
function name() { return pick(SURNAMES) + pick(GIVEN); }
function phone() { return `1${pick(['3', '5', '7', '8', '9'])}${String(rand(100000000, 999999999))}`; }

const AGENT_LINES = [
  '您好，我是云图的顾问，请问想了解哪方面的能力？',
  '可以的，我们支持一段 JS 接入，客服、埋点、触达和线索管理都在里面。',
  '您目前网站用的是什么建站系统？我可以直接给您一段接入代码。',
  '专业版支持转化漏斗和意向打分，价格是 899 元/月，年付有 2 个月优惠。',
  '方便留个手机号吗？我安排技术同学给您做一次 20 分钟的接入演示。',
  '这个问题我帮您确认一下，稍等两分钟。',
  '已经帮您开通试用账号，登录后台就能看到访客轨迹。',
  '好的，我把接入文档发您，遇到问题随时在这里找我。'
];
const VISITOR_LINES = [
  '你好，我想了解一下你们的产品。',
  '我们是做教育培训的，网站每天大概 2000 访问。',
  '这个需要技术人员配合吗？',
  '可以自动弹出表单收集手机号吗？',
  '价格怎么算？',
  '和我们现在用的客服系统能对接吗？',
  '访客轨迹能看到具体页面吗？',
  '我先看看，有需要再联系。',
  '能不能录制访客操作？',
  '我们做外贸站，支持英文吗？'
];
const REQUIREMENTS = [
  '希望提升官网留资率，重点看主动弹窗和线索 CRM。',
  '需要把微信、百度来的流量统一统计，想看渠道转化。',
  '客服人力不足，想用 AI 机器人先接待再转人工。',
  '有多个业务站点，需要数据隔离和子账号权限。',
  '想了解录屏和访客轨迹，排查客户流失原因。',
  '外贸独立站需要多语言和自定义域名。'
];

function clear() {
  const tables = ['referral_withdrawals', 'referral_rewards', 'referral_visits', 'referrals', 'ticket_messages', 'support_tickets', 'payment_events', 'orders', 'application_activities', 'applications', 'platform_audit_logs', 'sms_codes', 'platform_users', 'visitor_tags', 'follow_ups', 'leads', 'form_submissions', 'forms', 'messages', 'conversations', 'events', 'pageviews', 'visitor_sessions', 'recordings', 'visitors', 'faqs', 'faq_categories', 'knowledge_files', 'rules', 'rule_logs', 'canned_replies', 'tags', 'blacklist', 'announcements', 'notifications', 'notification_channels', 'api_keys', 'audit_logs', 'sites', 'users', 'accounts', 'tenants'];
  for (const t of tables) db.exec(`DELETE FROM ${t}`);
  db.exec("DELETE FROM sqlite_sequence");
}

function createTenant(name, plan, brand) {
  return run(
    'INSERT INTO tenants (name, plan, brand_name, brand_color) VALUES (?,?,?,?)',
    [name, plan, brand, '#2563eb']
  ).lastInsertRowid;
}

function createUser(tenantId, email, userName, password, role, phone) {
  const hash = hashPassword(password);
  const accountId = run(
    'INSERT INTO accounts (phone, email, name, password_hash, signup_source, referral_code) VALUES (?,?,?,?,?,?)',
    [phone || null, email, userName, hash, 'seed', referralCode()]
  ).lastInsertRowid;
  return run(
    'INSERT INTO users (tenant_id, account_id, email, phone, name, password_hash, role, avatar) VALUES (?,?,?,?,?,?,?,?)',
    [tenantId, accountId, email, phone || null, userName, hash, role, userName.slice(0, 1)]
  ).lastInsertRowid;
}

function defaultWidget(overrides = {}) {
  return {
    primaryColor: '#2563eb',
    locale: 'zh-CN',
    position: 'right',
    offsetBottom: 24,
    offsetSide: 24,
    buttonSize: 58,
    icon: 'headset',
    animation: 'breath',
    mobile: { size: 52, offsetBottom: 18, offsetSide: 14 },
    title: '在线客服',
    agentName: '云图顾问',
    welcome: '您好，我是云图顾问。想了解一段 JS 如何帮您收集线索吗？',
    subtitle: '通常 1 分钟内回复',
    offlineText: '当前客服不在线，您可以留言，我们会在工作时间尽快联系您。',
    offlineEnabled: true,
    prechatEnabled: true,
    prechatFormId: null,
    faqEnabled: true,
    recordingEnabled: true,
    ratingEnabled: true,
    showBranding: true,
    businessHours: '09:00-21:00',
    compliance: {
      enabled: false,
      text: '',
      policyUrl: ''
    },
    ...overrides
  };
}

console.log('Seeding database...');
clear();

const t1 = createTenant('云图科技', 'pro', '云图线索客服');
const t2 = createTenant('星辰跨境', 'standard', '星辰跨境');

const admin = createUser(t1, 'admin@demo.com', '林晓', 'admin123', 'admin', '13800000001');
const ops = createUser(t1, 'ops@demo.com', '周敏', 'ops123', 'operator', '13800000002');
const agent1 = createUser(t1, 'agent@demo.com', '陈曦', 'agent123', 'agent', '13800000003');
const agent2 = createUser(t1, 'agent2@demo.com', '王凯', 'agent123', 'agent', '13800000004');
const t2admin = createUser(t2, 'owner@demo.com', '苏蔓', 'demo1234', 'admin', '13800000005');

const site1 = run(
  `INSERT INTO sites (tenant_id, name, domain, site_key, loader_token, widget_config, tracking_enabled, compliance_enabled)
   VALUES (?,?,?,?,?,?,1,1)`,
  [t1, '云图科技官网', 'www.yuntu-tech.com', 'qz_demo_8f3k2m', '0f928e95b1adc3f89d3a1e0dab18c5bf', JSON.stringify(defaultWidget())]
).lastInsertRowid;

const site2 = run(
  `INSERT INTO sites (tenant_id, name, domain, site_key, loader_token, widget_config, tracking_enabled, compliance_enabled)
   VALUES (?,?,?,?,?,?,1,0)`,
  [t1, '产品帮助中心', 'help.yuntu-tech.com', 'qz_help_2d9x7p', loaderToken(), JSON.stringify(defaultWidget({ primaryColor: '#8b5cf6', title: '帮助中心', welcome: '欢迎来到帮助中心，可以先看看常见问题。', prechatEnabled: false }))]
).lastInsertRowid;

const site3 = run(
  `INSERT INTO sites (tenant_id, name, domain, site_key, loader_token, widget_config, tracking_enabled, compliance_enabled)
   VALUES (?,?,?,?,?,?,1,1)`,
  [t2, 'BloomCraft 独立站', 'www.bloomcraft.com', 'qz_bloom_5k1n8', loaderToken(), JSON.stringify(defaultWidget({ primaryColor: '#10b981', welcome: 'Hi! How can we help you today?', showBranding: false }))]
).lastInsertRowid;

run("UPDATE sites SET installed_at = datetime('now','-12 days'), last_widget_ping_at = datetime('now') WHERE id IN (?,?)", [site1, site3]);
run('UPDATE tenants SET hide_branding = 0 WHERE id = ?', [t1]);
run('INSERT INTO api_keys (tenant_id, name, key) VALUES (?,?,?)', [t1, '默认 API Key', signApiKey()]);

const catIds = {};
const categories = ['产品咨询', '价格与套餐', '接入与部署', '售后服务'];
categories.forEach((c, i) => {
  catIds[c] = run('INSERT INTO faq_categories (tenant_id, site_id, name, sort) VALUES (?,?,?,?)', [t1, site1, c, i]).lastInsertRowid;
});
const FAQS = [
  ['产品咨询', '一段 JS 真的能启用全部访客能力吗？', '是的。接入脚本会自动加载客服挂件、行为采集、触发弹窗、知识库、录屏等能力，后续新增功能无需再次改代码，后台开启即可生效。'],
  ['产品咨询', '会影响我们网站的打开速度吗？', '不会。脚本采用异步懒加载，首屏只加载约 4KB 的加载器，挂件与聊天核心在浏览器空闲时按需加载，不阻塞页面渲染。'],
  ['产品咨询', '支持手机端吗？', '支持 PC、H5、微信内置浏览器，并可在后台单独配置移动端按钮尺寸和位置。'],
  ['价格与套餐', '免费版可以一直用吗？', '可以。免费版包含基础聊天、离线留言、基础挂件配置和基础访问统计，适合先验证效果。'],
  ['价格与套餐', '专业版包含哪些高级能力？', '专业版包含转化漏斗、意向打分、轻线索 CRM、区域热力图、客服绩效、自动化规则、访客录屏和线索导出。'],
  ['价格与套餐', '年付有优惠吗？', '年付按 10 个月计费，另赠送 1 个月接入辅导。企业版支持按坐席与流量定制。'],
  ['接入与部署', '接入需要技术人员吗？', '复制后台生成的一段 script 标签粘贴到网站 head 或 body 末尾即可，通常 5 分钟完成。'],
  ['接入与部署', '一个账号可以管理多个网站吗？', '可以。多站点各自生成独立 JS，访客、会话、线索和报表按站点隔离统计。'],
  ['接入与部署', '被广告拦截插件拦截怎么办？', '后台会展示挂件拦截率。我们提供独立域名加载脚本与降级入口，可显著降低拦截影响。'],
  ['售后服务', '数据存储在哪里？是否安全？', '数据按租户隔离存储，支持一键关闭行为采集，企业版可提供独立部署与数据导出方案。'],
  ['售后服务', '可以开发票吗？', '支持增值税普通发票与专用发票，付款后在后台提交开票信息即可。'],
  ['售后服务', '如何迁移历史会话？', '企业版提供开放 API 与数据导出接口，可将会话、线索与访客档案迁移到自有系统。']
];
FAQS.forEach(([cat, q, a], i) => {
  run('INSERT INTO faqs (tenant_id, site_id, category_id, question, answer, sort, views) VALUES (?,?,?,?,?,?,?)',
    [t1, site1, catIds[cat], q, a, i, rand(20, 480)]);
});
run('INSERT INTO faq_categories (tenant_id, site_id, name, sort) VALUES (?,?,?,?)', [t1, site2, '接入问题', 0]);
run('INSERT INTO faqs (tenant_id, site_id, category_id, question, answer) VALUES (?,?,?,?,?)',
  [t1, site2, 5, '如何获取站点 JS 代码？', '登录后台，进入「站点管理」，点击复制代码即可。']);

const formPrechat = run(
  `INSERT INTO forms (tenant_id, site_id, name, type, title, subtitle, button_text, fields)
   VALUES (?,?,?,?,?,?,?,?)`,
  [t1, site1, '预检表单', 'prechat', '先简单认识一下', '留下业务类型与手机号，顾问会带着方案来找你。', '开始咨询', JSON.stringify([
    { key: 'business_type', label: '业务类型', type: 'select', required: true, options: BUSINESS, placeholder: '请选择业务类型' },
    { key: 'phone', label: '手机号', type: 'phone', required: true, placeholder: '请输入手机号，仅用于本次咨询' },
    { key: 'need', label: '想解决的问题', type: 'textarea', required: false, placeholder: '例如：官网留资率低，想接主动弹窗' }
  ])]
).lastInsertRowid;
run('INSERT INTO forms (tenant_id, site_id, name, type, title, subtitle, button_text, fields) VALUES (?,?,?,?,?,?,?,?)',
  [t1, site1, '预约演示', 'trigger', '预约 20 分钟接入演示', '我们会用你的网站做一次真实接入演示。', '预约演示', JSON.stringify([
    { key: 'name', label: '称呼', type: 'text', required: true, placeholder: '怎么称呼您' },
    { key: 'phone', label: '手机号', type: 'phone', required: true, placeholder: '请输入手机号' },
    { key: 'company', label: '公司名称', type: 'text', required: false, placeholder: '公司/团队名称' },
    { key: 'size', label: '客服团队规模', type: 'select', required: false, options: ['1 人', '2-5 人', '6-20 人', '20 人以上'] }
  ])]
);
const formOffline = run('INSERT INTO forms (tenant_id, site_id, name, type, title, subtitle, button_text, fields) VALUES (?,?,?,?,?,?,?,?)',
  [t1, site1, '离线留言', 'offline', '客服暂时不在线', '留下联系方式，我们会在 1 个工作日内回复。', '提交留言', JSON.stringify([
    { key: 'name', label: '称呼', type: 'text', required: true, placeholder: '怎么称呼您' },
    { key: 'phone', label: '手机号', type: 'phone', required: true, placeholder: '请输入手机号' },
    { key: 'content', label: '留言内容', type: 'textarea', required: true, placeholder: '请描述您的问题' }
  ])]
);
const prechatFields = JSON.parse(get('SELECT fields FROM forms WHERE id = ?', [formPrechat]).fields);
run('UPDATE sites SET widget_config = ? WHERE id = ?', [
  JSON.stringify(defaultWidget({ prechatFormId: formPrechat })), site1
]);
// also fix offline form reference into widget config
const w1 = JSON.parse(get('SELECT widget_config FROM sites WHERE id = ?', [site1]).widget_config);
w1.offlineFormId = formOffline;
run('UPDATE sites SET widget_config = ? WHERE id = ?', [JSON.stringify(w1), site1]);

const ruleDefs = [
  {
    name: '价格页停留 15 秒弹演示表单', type: 'trigger', priority: 1,
    conditions: { pageMatch: '/pricing', pageMatchType: 'contains', dwell: 15, device: 'all', visitorType: 'all', scrollDepth: 0, idle: 0, exitIntent: false },
    actions: { type: 'form', formId: 2, title: '想了解专业版？', message: '预约 20 分钟演示，我们用你的网站现场接入。', delay: 0 }
  },
  {
    name: '退出意图挽留', type: 'trigger', priority: 2,
    conditions: { exitIntent: true, pageMatch: '', dwell: 8, device: 'desktop', visitorType: 'all', scrollDepth: 0, idle: 0 },
    actions: { type: 'message', title: '等一下，先领一份方案', message: '留下邮箱，我们把《一段 JS 做完整线索闭环》的拆解发给你。', delay: 0 }
  },
  {
    name: '新访客 30 秒无操作问候', type: 'trigger', priority: 3,
    conditions: { idle: 30, visitorType: 'new', pageMatch: '', device: 'all', dwell: 20, scrollDepth: 0, exitIntent: false },
    actions: { type: 'greeting', title: '在找什么？', message: '我可以直接告诉你哪一版套餐适合现在的流量规模。', delay: 0 }
  },
  {
    name: '关键词：价格/多少钱', type: 'keyword', priority: 1,
    conditions: { keywords: ['价格', '多少钱', '费用', '报价'] },
    actions: { reply: '专业版 899 元/月，年付 8990 元（相当于 10 个月）。如果方便留个手机号，我发你一份按流量测算的报价单。' }
  },
  {
    name: '关键词：接入/代码', type: 'keyword', priority: 2,
    conditions: { keywords: ['接入', '代码', 'js', '安装'] },
    actions: { reply: '接入只需要一段 script：把后台「站点管理」里的代码粘贴到网站 body 末尾即可，5 分钟生效，不影响首屏速度。' }
  },
  {
    name: '敏感词过滤', type: 'sensitive', priority: 1,
    conditions: { words: ['傻逼', '骗子', '垃圾', 'fuck'] },
    actions: { action: 'block', notice: '消息包含不适宜内容，已被拦截。' }
  }
];
for (const r of ruleDefs) {
  run('INSERT INTO rules (tenant_id, site_id, name, type, conditions, actions, priority, triggered_count) VALUES (?,?,?,?,?,?,?,?)',
    [t1, site1, r.name, r.type, JSON.stringify(r.conditions), JSON.stringify(r.actions), r.priority, rand(8, 120)]);
}

const canned = [
  ['首次问候', '您好，我是云图顾问。请问想了解客服接入、访客分析还是线索管理？', '通用'],
  ['价格回复', '专业版 899 元/月，年付 8990 元；企业版按坐席与流量定制。您方便说下日访问量吗？', '销售'],
  ['接入说明', '只需要一段 script 标签，粘贴到网站 body 末尾即可，后台开功能无需二次改代码。', '技术'],
  ['预约演示', '可以安排 20 分钟演示，我们用您的网站现场接入。您哪天方便？', '销售'],
  ['稍等', '稍等，我确认一下这个细节，两分钟内回复您。', '通用'],
  ['结束语', '感谢咨询，接入文档已发到您的邮箱，有问题随时找我。', '通用']
];
canned.forEach(([title, content, category]) => {
  run('INSERT INTO canned_replies (tenant_id, title, content, category, usage_count) VALUES (?,?,?,?,?)',
    [t1, title, content, category, rand(3, 60)]);
});

const tagDefs = [['高意向', 'red', 1], ['价格敏感', 'orange', 1], ['教育行业', 'blue', 0], ['跨境', 'purple', 0], ['已预约演示', 'green', 1], ['需人工跟进', 'gray', 1]];
const tagIds = tagDefs.map(([n, c, a]) => run('INSERT INTO tags (tenant_id, name, color, auto) VALUES (?,?,?,?)', [t1, n, c, a]).lastInsertRowid);

run('INSERT INTO announcements (tenant_id, site_id, content, position, link, link_text, bg_color) VALUES (?,?,?,?,?,?,?)',
  [t1, site1, '10 月限时：专业版年付立减 2 个月，赠接入辅导', 'side', '/pricing', '查看详情', '#2563eb']);
run('INSERT INTO announcements (tenant_id, site_id, content, position, link, link_text, bg_color, enabled) VALUES (?,?,?,?,?,?,?,0)',
  [t1, site1, '双十一活动预告', 'side', '', '', '#8b5cf6']);
run('INSERT INTO blacklist (tenant_id, site_id, type, value, reason) VALUES (?,?,?,?,?)', [t1, site1, 'ip', '203.0.113.66', '恶意刷消息']);
run('INSERT INTO blacklist (tenant_id, site_id, type, value, reason) VALUES (?,?,?,?,?)', [t1, site1, 'ip', '198.51.100.23', '爬虫采集']);

const visitorIds = [];
const convs = [];
const visitorMeta = [];

for (let day = 13; day >= 0; day--) {
  const base = 5 + Math.floor(rnd() * 6) + Math.max(0, 8 - day);
  for (let i = 0; i < base; i++) {
    const isReturning = rnd() < 0.22;
    const src = weighted(SOURCES);
    const dev = weighted(DEVICES);
    const [province, city] = pick(CITIES);
    const vName = rnd() < 0.55 ? name() : null;
    const vPhone = rnd() < 0.32 ? phone() : null;
    const createdAt = daysAgo(day, rand(9, 22), rand(0, 59));
    const vid = `v_${Math.random().toString(36).slice(2, 10)}${Math.random().toString(36).slice(2, 6)}`;
    const ip = `${rand(36, 223)}.${rand(1, 254)}.${rand(1, 254)}.${rand(1, 254)}`;
    const visitCount = isReturning ? rand(2, 5) : 1;
    const convTime = rnd() < 0.22 ? createdAt : null;
    const vId = run(
      `INSERT INTO visitors (tenant_id, site_id, vid, fingerprint, name, phone, email, company, business_type, ip, country, province, city, device, browser, os, language, screen, source, utm_source, utm_medium, utm_campaign, keyword, referrer, landing_page, pageview_count, visit_count, total_dwell_ms, tracking_consent, first_seen, last_seen)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      [t1, site1, vid, `fp_${vid.slice(2, 10)}`, vName, vPhone, vPhone ? `user${rand(100, 999)}@example.com` : null,
        rnd() < 0.4 ? pick(COMPANIES) : null, pick(BUSINESS), ip, '中国', province, city, dev.device, dev.browser, dev.os,
        'zh-CN', pick(['1920x1080', '1440x900', '390x844', '414x896']), src.source, src.source, src.medium,
        src.campaign || null, src.keyword || null, src.source === 'direct' ? '' : `https://www.${src.source}.com/search`,
        PAGES[0][0], 0, visitCount, 0, 1, fmt(createdAt), fmt(addMinutes(createdAt, rand(3, 40)))]
    ).lastInsertRowid;
    visitorIds.push(vId);

    let totalPages = 0;
    let totalDwell = 0;
    let lastSeen = createdAt;
    let sessionId = null;
    let entryPage = '/';
    for (let s = 0; s < visitCount; s++) {
      let sStart = s === 0 ? createdAt : addMinutes(createdAt, rand(60 * 24, 60 * 24 * 6));
      if (sStart.getTime() > Date.now() - 600000) sStart = new Date(Date.now() - rand(30, 300) * 60000);
      const sDuration = rand(90, 720) * 1000;
      const pageCount = rand(2, 6);
      entryPage = pick(PAGES)[0];
      sessionId = run(
        'INSERT INTO visitor_sessions (tenant_id, site_id, visitor_id, started_at, ended_at, duration_ms, page_count, entry_page, exit_page, referrer, utm_source, device) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)',
        [t1, site1, vId, fmt(sStart), fmt(new Date(sStart.getTime() + sDuration)), sDuration, pageCount, entryPage, pick(PAGES)[0], src.source === 'direct' ? '' : `https://www.${src.source}.com/`, src.source, dev.device]
      ).lastInsertRowid;
      let cursor = new Date(sStart.getTime());
      for (let p = 0; p < pageCount; p++) {
        const page = rnd() < 0.4 && p > 0 ? PAGES[2] : (rnd() < 0.35 ? PAGES[1] : pick(PAGES));
        const dwell = rand(12, 190) * 1000;
        const entered = new Date(cursor.getTime());
        cursor = new Date(cursor.getTime() + dwell + rand(2, 12) * 1000);
        run('INSERT INTO pageviews (tenant_id, site_id, visitor_id, session_id, url, title, referrer, dwell_ms, entered_at, exited_at, seq) VALUES (?,?,?,?,?,?,?,?,?,?,?)',
          [t1, site1, vId, sessionId, page[0], page[1], p === 0 ? `https://www.${src.source}.com/` : PAGES[p - 1][0], dwell, fmt(entered), fmt(new Date(entered.getTime() + dwell)), p]);
        totalPages++;
        totalDwell += dwell;
        if (rnd() < 0.3) {
          run('INSERT INTO events (tenant_id, site_id, visitor_id, session_id, type, name, payload, url, created_at) VALUES (?,?,?,?,?,?,?,?,?)',
            [t1, site1, vId, sessionId, 'click', pick(['预约演示', '查看价格', '下载白皮书', '复制接入代码', '咨询客服']), JSON.stringify({ x: rand(100, 900), y: rand(100, 700), plan: pick(['standard', 'pro', 'enterprise']) }), page[0], fmt(new Date(entered.getTime() + rand(3000, 30000)))]);
        }
        if (rnd() < 0.12) {
          run('INSERT INTO events (tenant_id, site_id, visitor_id, session_id, type, name, payload, url, created_at) VALUES (?,?,?,?,?,?,?,?,?)',
            [t1, site1, vId, sessionId, 'scroll', 'scroll_depth', JSON.stringify({ depth: rand(25, 100) }), page[0], fmt(new Date(entered.getTime() + rand(5000, 40000)))]);
        }
      }
      lastSeen = cursor;
    }

    const hasConv = convTime && rnd() < 0.7;
    let convId = null;
    let convStatus = null;
    if (hasConv) {
      const agentId = rnd() < 0.82 ? pick([agent1, agent2]) : null;
      const status = !agentId ? 'pending' : day > 1 ? 'closed' : pick(['open', 'pending', 'closed']);
      convStatus = status;
      const created = new Date(convTime.getTime() + rand(10, 40) * 60000);
      const closed = status === 'closed' ? addMinutes(created, rand(8, 45)) : null;
      const rating = status === 'closed' && rnd() < 0.7 ? rand(3, 5) : null;
      const convTags = rnd() < 0.4 ? JSON.stringify([pick(['价格敏感', '高意向', '教育行业'])]) : '[]';
      convId = run(
        `INSERT INTO conversations (tenant_id, site_id, visitor_id, agent_id, status, subject, source, rating, rating_comment, tags, first_response_ms, last_message_at, unread_agent, unread_visitor, closed_at, created_at)
         VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
        [t1, site1, vId, agentId, status, pick(['咨询专业版报价', '想接入主动弹窗', '了解访客轨迹', '需要多站点管理', '外贸站多语言咨询', '录屏功能怎么用']),
          src.source, rating, rating ? pick(['顾问专业，回复很快', '方案很清晰', '接入比想象中简单', '']) : null,
          convTags, rand(15, 180) * 1000, fmt(closed || new Date(created.getTime() + rand(5, 30) * 60000)),
          status === 'open' ? rand(0, 3) : 0, 0, closed ? fmt(closed) : null, fmt(created)]
      ).lastInsertRowid;
      if (agentId) run('UPDATE conversations SET status = ? WHERE id = ? AND status = ?', ['open', convId, 'pending']);

      const msgCount = rand(4, 9);
      let last = created;
      for (let m = 0; m < msgCount; m++) {
        const fromVisitor = agentId ? m % 2 === 0 : true;
        last = addMinutes(last, rand(1, 4));
        const type = rnd() < 0.08 ? 'image' : 'text';
        run('INSERT INTO messages (tenant_id, conversation_id, sender_type, sender_id, sender_name, type, content, file_url, meta, created_at) VALUES (?,?,?,?,?,?,?,?,?,?)',
          [t1, convId, fromVisitor ? 'visitor' : 'agent', fromVisitor ? vId : agentId,
            fromVisitor ? (vName || '访客') : (agentId === agent1 ? '陈曦' : '王凯'),
            type, fromVisitor ? pick(VISITOR_LINES) : pick(AGENT_LINES),
            type === 'image' ? 'https://images.unsplash.com/photo-1553877522-43269d4ea984?w=640&q=70' : null,
            JSON.stringify({}), fmt(last)]);
      }
      if (rnd() < 0.3) {
        run('INSERT INTO messages (tenant_id, conversation_id, sender_type, sender_id, sender_name, type, content, meta, created_at) VALUES (?,?,?,?,?,?,?,?,?)',
          [t1, convId, 'system', null, '系统', 'text', '客服已将会话标记为「已预约演示」', JSON.stringify({ system: true }), fmt(addMinutes(last, 1))]);
      }
      if (agentId && rnd() < 0.5) {
        run('INSERT INTO messages (tenant_id, conversation_id, sender_type, sender_id, sender_name, type, content, is_private, meta, created_at) VALUES (?,?,?,?,?,?,?,?,?,?)',
          [t1, convId, 'agent', agentId, '内部备注', 'note', pick(['客户是教育行业，重点介绍线索 CRM。', '预算敏感，先发年付优惠。', '需要技术同学协助演示接入。', '已加微信，本周五回访。']), 1, JSON.stringify({ internal: true }), fmt(addMinutes(last, 2))]);
      }
      convs.push({ id: convId, visitorId: vId, status, agentId, created });

      if (rnd() < 0.45) {
        const leadStatus = pick(['new', 'following', 'following', 'won', 'invalid']);
        const leadId = run(
          'INSERT INTO leads (tenant_id, site_id, visitor_id, conversation_id, source, name, phone, email, company, business_type, requirement, status, owner_id, score, tags, created_at, updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)',
          [t1, site1, vId, convId, 'chat', vName || name(), vPhone || phone(), `lead${rand(100, 999)}@example.com`,
            pick(COMPANIES), pick(BUSINESS), pick(REQUIREMENTS), leadStatus, rnd() < 0.7 ? pick([agent1, agent2]) : null,
            rand(40, 95), JSON.stringify(rnd() < 0.5 ? ['高意向'] : []), fmt(created), fmt(addMinutes(created, rand(60, 3000)))]
        ).lastInsertRowid;
        if (rnd() < 0.6) {
          run('INSERT INTO follow_ups (tenant_id, lead_id, user_id, content, created_at) VALUES (?,?,?,?,?)',
            [t1, leadId, pick([agent1, agent2]), pick(['电话沟通 10 分钟，客户在对比 3 家。', '已发送报价单和接入文档。', '客户要求下周演示，已约周三下午。', '预算未批，标记为下季度跟进。']), fmt(addMinutes(created, rand(120, 4000)))]);
        }
      }
    }

    if (rnd() < 0.18) {
      const subData = { name: vName || name(), phone: vPhone || phone(), business_type: pick(BUSINESS), need: pick(REQUIREMENTS) };
      run('INSERT INTO form_submissions (tenant_id, site_id, form_id, visitor_id, conversation_id, data, created_at) VALUES (?,?,?,?,?,?,?)',
        [t1, site1, formPrechat, vId, convId, JSON.stringify(subData), fmt(addMinutes(createdAt, rand(1, 5)))]);
      if (!convId && rnd() < 0.6) {
        run('INSERT INTO leads (tenant_id, site_id, visitor_id, source, name, phone, business_type, requirement, status, owner_id, score, created_at, updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)',
          [t1, site1, vId, 'form', subData.name, subData.phone, subData.business_type, subData.need, pick(['new', 'following']), rnd() < 0.5 ? ops : null, rand(25, 70), fmt(addMinutes(createdAt, 6)), fmt(addMinutes(createdAt, 6))]);
      }
    }

    // 合并回访访客档案（同一设备）
    if (isReturning && visitorMeta.length && rnd() < 0.25) {
      const prev = pick(visitorMeta);
      if (prev.fingerprint !== `fp_${vid.slice(2, 10)}`) {
        // keep as separate record but mark merge source for demo
      }
    }
    visitorMeta.push({ id: vId, vid, fingerprint: `fp_${vid.slice(2, 10)}` });

    run('UPDATE visitors SET pageview_count = ?, total_dwell_ms = ?, last_seen = ? WHERE id = ?', [totalPages, totalDwell, fmt(lastSeen), vId]);
    let score = Math.min(100, totalPages * 3 + visitCount * 6 + Math.floor(totalDwell / 60000) * 2 + Math.floor(rnd() * 20));
    if (convStatus) score += 15;
    if (vPhone) score += 12;
    score = Math.min(100, score);
    run('UPDATE visitors SET intent_score = ?, intent_level = ? WHERE id = ?', [score, score >= 60 ? 'high' : score >= 30 ? 'medium' : 'low', vId]);

    if (score >= 60) {
      run('INSERT OR IGNORE INTO visitor_tags (tenant_id, visitor_id, tag_id) VALUES (?,?,?)', [t1, vId, tagIds[0]]);
    }
    if (province === '广东' && rnd() < 0.4) {
      run('INSERT OR IGNORE INTO visitor_tags (tenant_id, visitor_id, tag_id) VALUES (?,?,?)', [t1, vId, tagIds[2]]);
    }
  }
}

// 近 24 小时实时会话
const liveNames = ['周雨桐', '李思远', '张嘉怡', '王志强'];
liveNames.forEach((n, i) => {
  const vid = `v_live_${i}_${Math.random().toString(36).slice(2, 8)}`;
  const created = addMinutes(new Date(), -rand(4, 50));
  const [province, city] = CITIES[i];
  const visitorId = run(
    `INSERT INTO visitors (tenant_id, site_id, vid, fingerprint, name, phone, business_type, ip, country, province, city, device, browser, os, source, utm_source, utm_medium, referrer, landing_page, pageview_count, visit_count, total_dwell_ms, intent_score, intent_level, tracking_consent, first_seen, last_seen)
     VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
    [t1, site1, vid, `fp_live_${i}`, n, rnd() < 0.5 ? phone() : null, pick(BUSINESS), `113.${rand(1, 254)}.${rand(1, 254)}.${rand(1, 254)}`, '中国', province, city,
      pick(['desktop', 'mobile']), pick(['Chrome', 'Safari', 'WeChat']), pick(['Windows', 'iOS', 'Android']), 'baidu', 'baidu', 'organic',
      'https://www.baidu.com/s?wd=在线客服系统', '/pricing', rand(3, 9), rand(1, 3), rand(60000, 300000), rand(55, 90), 'high', 1, fmt(created), fmt(new Date())]
  ).lastInsertRowid;
  const convId = run(
    'INSERT INTO conversations (tenant_id, site_id, visitor_id, agent_id, status, subject, source, last_message_at, unread_agent, created_at) VALUES (?,?,?,?,?,?,?,?,?,?)',
    [t1, site1, visitorId, i % 2 === 0 ? agent1 : agent2, 'open', pick(['咨询专业版报价', '想接入主动弹窗', '多站点数据隔离', '访客录屏怎么开']), 'baidu', fmt(new Date()), rand(1, 3), fmt(created)]
  ).lastInsertRowid;
  run('INSERT INTO messages (tenant_id, conversation_id, sender_type, sender_id, sender_name, type, content, created_at) VALUES (?,?,?,?,?,?,?,?)',
    [t1, convId, 'visitor', vid, n, 'text', pick(VISITOR_LINES), fmt(created)]);
  run('INSERT INTO messages (tenant_id, conversation_id, sender_type, sender_id, sender_name, type, content, created_at) VALUES (?,?,?,?,?,?,?,?)',
    [t1, convId, 'agent', i % 2 === 0 ? agent1 : agent2, i % 2 === 0 ? '陈曦' : '王凯', 'text', pick(AGENT_LINES), fmt(addMinutes(created, 1))]);
  run('INSERT INTO messages (tenant_id, conversation_id, sender_type, sender_id, sender_name, type, content, created_at) VALUES (?,?,?,?,?,?,?,?)',
    [t1, convId, 'visitor', vid, n, 'text', pick(VISITOR_LINES), fmt(addMinutes(created, 2))]);
});

// 另外两个站点少量数据
for (const [sid, tid] of [[site2, t1], [site3, t2]]) {
  for (let i = 0; i < 12; i++) {
    const vid = `v_s${sid}_${i}`;
    run(`INSERT INTO visitors (tenant_id, site_id, vid, province, city, device, browser, source, pageview_count, visit_count, total_dwell_ms, intent_score, intent_level, tracking_consent, first_seen) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,1,?)`,
      [tid, sid, vid, pick(CITIES)[0], pick(CITIES)[1], pick(['desktop', 'mobile']), pick(['Chrome', 'Safari']), pick(['baidu', 'direct', 'google']), rand(1, 6), 1, rand(20000, 200000), rand(10, 70), 'medium', fmt(daysAgo(rand(0, 10), rand(9, 20)))]);
  }
  run('INSERT INTO leads (tenant_id, site_id, source, name, phone, business_type, requirement, status, score) VALUES (?,?,?,?,?,?,?,?,?)',
    [tid, sid, 'form', name(), phone(), pick(BUSINESS), '独立站询盘，需要多语言接待。', 'new', 50]);
}

// 平台运营账号
const platformAdmin = run('INSERT INTO platform_users (name, email, password_hash, role) VALUES (?,?,?,?)',
  ['平台运营', 'ops@platform.com', hashPassword('ops123'), 'superadmin']).lastInsertRowid;
const platformSales = run('INSERT INTO platform_users (name, email, password_hash, role) VALUES (?,?,?,?)',
  ['销售顾问', 'sales@platform.com', hashPassword('sales123'), 'sales']).lastInsertRowid;

// 自助注册的 C 端工作空间（用于运营后台演示）
const self1 = createWorkspace({
  workspaceName: '木棉设计工作室', ownerName: '赵一鸣', phone: '13600000001', email: 'zhaoyiming@example.com',
  password: 'demo1234', website: 'www.mumian-design.com', plan: 'pro', planStatus: 'trialing',
  source: 'self_signup', industry: '设计服务', goal: '线索收集', trialDays: 3
});
const self2 = createWorkspace({
  workspaceName: '海纳跨境独立站', ownerName: '苏晴', phone: '13600000002', email: 'suqing@example.com',
  password: 'demo1234', website: 'www.hainacross.com', plan: 'standard', planStatus: 'active',
  source: 'sales_convert', industry: '跨境贸易', goal: '客服接待'
});
const self3 = createWorkspace({
  workspaceName: '青柠健身工作室', ownerName: '陈野', phone: '13600000003', email: 'chenye@example.com',
  password: 'demo1234', website: 'www.qingning-fit.com', plan: 'free', planStatus: 'active',
  source: 'self_signup', industry: '本地生活', goal: '客服接待'
});
// 让演示数据更像真实运营状态
run("UPDATE sites SET installed_at = datetime('now','-2 days'), last_widget_ping_at = datetime('now') WHERE tenant_id = ? AND is_sandbox = 0", [self1.tenant.id]);
run("UPDATE sites SET installed_at = datetime('now','-9 days'), last_widget_ping_at = datetime('now') WHERE tenant_id = ? AND is_sandbox = 0", [self2.tenant.id]);
const sid1 = get('SELECT id FROM sites WHERE tenant_id = ? AND is_sandbox = 0', [self1.tenant.id]).id;
const v1 = run(`INSERT INTO visitors (tenant_id, site_id, vid, fingerprint, name, phone, province, city, device, browser, os, source, pageview_count, visit_count, total_dwell_ms, intent_score, intent_level, tracking_consent)
  VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,1)`, [self1.tenant.id, sid1, 'v_demo_self_1', 'fp_demo_self_1', '李想', '13711112222', '广东', '深圳', 'desktop', 'Chrome', 'Windows', 'baidu', 5, 2, 260000, 72, 'high']).lastInsertRowid;
const c1 = run(`INSERT INTO conversations (tenant_id, site_id, visitor_id, status, subject, source, last_message_at) VALUES (?,?,?,?,?,?,datetime('now','-1 day'))`,
  [self1.tenant.id, sid1, v1, 'open', '想咨询官网留资方案', 'baidu']).lastInsertRowid;
run("INSERT INTO messages (tenant_id, conversation_id, sender_type, sender_name, type, content, created_at) VALUES (?,?,?,?,?,?,datetime('now','-1 day'))", [self1.tenant.id, c1, 'visitor', '李想', 'text', '你好，想了解一下你们的方案。']);
run("INSERT INTO leads (tenant_id, site_id, visitor_id, conversation_id, source, name, phone, requirement, status, owner_id, score, created_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,datetime('now','-1 day'))", [self1.tenant.id, sid1, v1, c1, 'chat', '李想', '13711112222', '想咨询官网留资方案', 'new', self1.user.id, 72]);

// 申请表单用户（B 端销售线索）
const appRows = [
  ['周启明', '13500000011', 'zhouqm@haichuan-logistics.com', '海川物流', 'www.haichuan-logistics.com', '20 人以上', '官网留资率低', 'contacted', platformSales, '想了解多站点管理和线索分配。'],
  ['林一诺', '13500000012', 'linyn@qiming-edu.com', '启明教育', 'www.qiming-edu.com', '6-20 人', '客服人力不足', 'qualified', platformSales, '希望用 AI 先接待再转人工。'],
  ['许文', '13500000013', 'xuwen@atelier-xu.com', '独立设计工作室', 'www.atelier-xu.com', '1 人', '官网留资率低', 'new', null, '个人网站，想先自己接入。'],
  ['高远', '13500000014', 'gaoyuan@beichen.com', '北辰咨询', 'www.beichen-consulting.com', '6-20 人', '线索跟进混乱', 'demo', platformAdmin, '已预约下周演示。'],
  ['苏晴', '13600000002', 'suqing@example.com', '海纳跨境', 'www.hainacross.com', '2-5 人', '外贸多语言接待', 'won', platformSales, '已转为标准版工作空间。']
];
for (const [n, p, e, company, site, size, channel, status, ownerId, msg] of appRows) {
  const appId = run('INSERT INTO applications (name, phone, email, company, website, size, channel, message, source, status, owner_id) VALUES (?,?,?,?,?,?,?,?,?,?,?)',
    [n, p, e, company, site, size, channel, msg, 'landing', status, ownerId]).lastInsertRowid;
  run('INSERT INTO application_activities (application_id, platform_user_id, type, content) VALUES (?,?,?,?)', [appId, ownerId, 'note', '首次沟通记录：客户主要关注接入成本与线索转化。']);
}
run("UPDATE applications SET tenant_id = ?, account_id = ?, status = 'won' WHERE phone = '13600000002'", [self2.tenant.id, self2.account.id]);
run('INSERT INTO applications (name, phone, email, company, website, size, channel, message, source, status) VALUES (?,?,?,?,?,?,?,?,?,?)',
  ['陈野', '13600000003', 'chenye@example.com', '青柠健身工作室', 'www.qingning-fit.com', '1 人', '官网留资率低', '已自助注册，先自己研究。', 'signup', 'contacted']);

// 订阅订单与工单演示数据
run(`INSERT INTO orders (order_no, tenant_id, plan, cycle, amount_cents, status, provider, invoice_no, paid_at, period_start, period_end, created_by)
  VALUES (?,?,?,?,?,?,?,?,datetime('now','-9 days'),datetime('now','-9 days'),datetime('now','+21 days'),?)`,
  ['QZ20261030SEED001', self2.tenant.id, 'standard', 'monthly', 29900, 'paid', 'mock', 'INV-202610-SEED01', self2.user.id]);
run("UPDATE tenants SET billing_cycle = 'monthly', current_period_start = datetime('now','-9 days'), current_period_end = datetime('now','+21 days'), last_payment_at = datetime('now','-9 days') WHERE id = ?", [self2.tenant.id]);
run(`INSERT INTO orders (order_no, tenant_id, plan, cycle, amount_cents, status, provider, created_by)
  VALUES (?,?,?,?,?,?,?,?)`, ['QZ20261030SEED002', self1.tenant.id, 'pro', 'monthly', 89900, 'pending', 'mock', self1.user.id]);
const t1Ticket = run("INSERT INTO support_tickets (tenant_id, user_id, subject, category, priority, status, last_message_at) VALUES (?,?,?,?,?,?,datetime('now','-2 hours'))", [self1.tenant.id, self1.user.id, '安装 JS 后没有看到挂件', 'install', 'high', 'open']).lastInsertRowid;
run("INSERT INTO ticket_messages (ticket_id, sender_type, sender_id, sender_name, content, created_at) VALUES (?,?,?,?,?,datetime('now','-2 hours'))", [t1Ticket, 'tenant', self1.user.id, self1.user.name, '我已经把代码放到 body 末尾了，刷新后右下角没有出现客服按钮，网站是 www.mumian-design.com。']);
const t2Ticket = run("INSERT INTO support_tickets (tenant_id, user_id, subject, category, priority, status, last_message_at) VALUES (?,?,?,?,?,?,datetime('now','-1 day'))", [self2.tenant.id, self2.user.id, '发票抬头需要修改', 'billing', 'normal', 'pending']).lastInsertRowid;
run("INSERT INTO ticket_messages (ticket_id, sender_type, sender_id, sender_name, content, created_at) VALUES (?,?,?,?,?,datetime('now','-1 day'))", [t2Ticket, 'tenant', self2.user.id, self2.user.name, '麻烦把发票抬头改成「海纳跨境电子商务有限公司」。']);
run("INSERT INTO ticket_messages (ticket_id, sender_type, sender_id, sender_name, content, created_at) VALUES (?,?,?,?,?,datetime('now','-20 hours'))", [t2Ticket, 'platform', platformSales, '销售顾问', '已登记，下一张发票会使用新的抬头。']);
const paidOrder = get("SELECT id FROM orders WHERE order_no = 'QZ20261030SEED001'");
const ref1 = run("INSERT INTO referrals (referrer_account_id, referred_account_id, code, status, ip, created_at, activated_at, paid_at) VALUES (?,?,?,?,?,datetime('now','-12 days'),datetime('now','-11 days'),datetime('now','-9 days'))",
  [self1.account.id, self2.account.id, self1.account.referral_code, 'paid', '127.0.0.1']).lastInsertRowid;
run("INSERT INTO referral_rewards (referrer_account_id, referral_id, order_id, amount_cents, rate, status, available_at, created_at) VALUES (?,?,?,?,?,?,datetime('now','-1 day'),datetime('now','-9 days'))",
  [self1.account.id, ref1, paidOrder.id, 5980, 20, 'available']);
run("INSERT INTO referral_withdrawals (account_id, amount_cents, status, note, created_at) VALUES (?,?,?,?,datetime('now','-2 hours'))", [self1.account.id, 3000, 'requested', '演示提现申请']);
run("INSERT INTO referrals (referrer_account_id, referred_account_id, code, status, ip, created_at) VALUES (?,?,?,?,?,datetime('now','-4 days'))", [self1.account.id, self3.account.id, self1.account.referral_code, 'registered', '127.0.0.1']);
for (let i = 0; i < 4; i++) run("INSERT INTO referral_visits (code, ip, ua, created_at) VALUES (?,?,?,datetime('now', ?))", [self1.account.referral_code, '127.0.0.1', 'seed', `-${i + 1} days`]);
run('INSERT INTO notifications (tenant_id, user_id, type, title, content, payload) VALUES (?,?,?,?,?,?)', [self1.tenant.id, null, 'referral', '推广奖励已到账', '你邀请的用户完成付费，奖励已可提现。', JSON.stringify({ demo: true })]);

const t0Ticket = run("INSERT INTO support_tickets (tenant_id, user_id, subject, category, priority, status, last_message_at) VALUES (?,?,?,?,?,?,datetime('now','-3 days'))", [t1, admin, '如何把访客数据导出成 CSV', 'feature', 'normal', 'resolved']).lastInsertRowid;
run("INSERT INTO ticket_messages (ticket_id, sender_type, sender_id, sender_name, content, created_at) VALUES (?,?,?,?,?,datetime('now','-3 days'))", [t0Ticket, 'tenant', admin, '林晓', '线索列表可以批量导出吗？']);
run("INSERT INTO ticket_messages (ticket_id, sender_type, sender_id, sender_name, content, created_at) VALUES (?,?,?,?,?,datetime('now','-2 days'))", [t0Ticket, 'platform', platformAdmin, '平台运营', '专业版支持在线索 CRM 右上角导出 CSV，已为你标记解决。']);


run('INSERT INTO audit_logs (tenant_id, user_id, action, target, detail, ip, created_at) VALUES (?,?,?,?,?,?,?)',
  [t1, admin, 'login', 'admin@demo.com', '登录成功', '127.0.0.1', fmt(new Date())]);
run('INSERT INTO audit_logs (tenant_id, user_id, action, target, detail, ip, created_at) VALUES (?,?,?,?,?,?,?)',
  [t1, admin, 'widget.update', '云图科技官网', '更新挂件配色与欢迎语', '127.0.0.1', fmt(daysAgo(2, 15, 20))]);

const counts = {
  tenants: get('SELECT COUNT(*) c FROM tenants').c,
  users: get('SELECT COUNT(*) c FROM users').c,
  visitors: get('SELECT COUNT(*) c FROM visitors').c,
  conversations: get('SELECT COUNT(*) c FROM conversations').c,
  messages: get('SELECT COUNT(*) c FROM messages').c,
  leads: get('SELECT COUNT(*) c FROM leads').c,
  pageviews: get('SELECT COUNT(*) c FROM pageviews').c,
  events: get('SELECT COUNT(*) c FROM events').c
};
console.log('Seed complete:', counts);
console.log('Tenant accounts: admin@demo.com/admin123, ops@demo.com/ops123, agent@demo.com/agent123, agent2@demo.com/agent123, owner@demo.com/demo1234');
console.log('Platform ops: ops@platform.com/ops123 (superadmin), sales@platform.com/sales123 (sales)');
console.log('Self-serve demo: 13600000001/demo1234 (木棉设计工作室, trialing)');
