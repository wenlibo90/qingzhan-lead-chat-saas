'use strict';
const assert = require('node:assert');
const { io } = require('socket.io-client');
const { get } = require('../db');

const BASE = process.env.BASE_URL || 'http://localhost:3000';
const KEY = 'qz_demo_8f3k2m';
let passed = 0;

async function req(path, opts = {}) {
  const headers = Object.assign({}, opts.headers || {});
  if (!(opts.body instanceof FormData)) headers['Content-Type'] = 'application/json';
  if (opts.token) headers.Authorization = 'Bearer ' + opts.token;
  const res = await fetch(BASE + path, {
    method: opts.method || (opts.body ? 'POST' : 'GET'),
    headers,
    body: opts.body instanceof FormData ? opts.body : opts.body ? JSON.stringify(opts.body) : undefined
  });
  const data = await res.json().catch(() => ({}));
  return { status: res.status, data };
}
function ok(name, cond, extra) {
  if (cond) { passed++; console.log('  ok  ' + name); }
  else { console.error('  FAIL ' + name, extra || ''); process.exitCode = 1; }
}
function connect(url, auth) {
  return new Promise((resolve, reject) => {
    const s = io(url, { transports: ['websocket'], auth });
    const timer = setTimeout(() => { s.close(); reject(new Error('socket timeout')); }, 8000);
    s.on('connect', () => { clearTimeout(timer); resolve(s); });
    s.on('connect_error', (e) => { clearTimeout(timer); reject(e); });
  });
}
function emitAck(socket, event, payload) {
  return new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new Error('ack timeout: ' + event)), 8000);
    socket.emit(event, payload, (res) => { clearTimeout(t); resolve(res); });
  });
}
function once(socket, event) {
  return new Promise((resolve) => socket.once(event, resolve));
}

(async () => {
  console.log('\n[1] 认证与租户');
  const login = await req('/api/auth/login', { body: { email: 'admin@demo.com', password: 'admin123' } });
  ok('管理员登录', login.status === 200 && login.data.token, login.data);
  const token = login.data.token;
  const me = await req('/api/auth/me', { token });
  ok('当前用户与套餐', me.status === 200 && me.data.plan.code === 'pro', me.data.plan);
  ok('站点列表生成嵌入代码', me.data.sites.length >= 2 && me.data.sites[0].embed_code.includes('widget.js'));
  const badLogin = await req('/api/auth/login', { body: { email: 'admin@demo.com', password: 'wrong' } });
  ok('错误密码被拒绝', badLogin.status === 401);

  console.log('\n[2] 公开配置与访客追踪');
  const cfg = await req('/api/public/config?key=' + KEY);
  ok('挂件配置加载', cfg.status === 200 && cfg.data.widget.primaryColor);
  ok('专业版返回触发规则', Array.isArray(cfg.data.triggers) && cfg.data.triggers.length >= 3, cfg.data.triggers && cfg.data.triggers.length);
  ok('知识库与表单返回', cfg.data.faqs.length > 0 && cfg.data.forms.all.length > 0);
  const session = await req('/api/public/session', { body: { key: KEY, url: BASE + '/pricing', referrer: 'https://www.baidu.com/s?wd=在线客服系统' } });
  ok('访客会话创建', session.status === 200 && session.data.vid && session.data.sid, session.data);
  const vid = session.data.vid;
  const sid = session.data.sid;
  const pv = await req('/api/public/track', { body: { key: KEY, vid, sid, type: 'pageview', url: BASE + '/pricing', title: '价格方案' } });
  ok('页面浏览入库', pv.status === 200 && pv.data.pageviewId, pv.data);
  const dwell = await req('/api/public/track', { body: { key: KEY, vid, sid, type: 'dwell', pageviewId: pv.data.pageviewId, dwell: 22000 } });
  ok('停留时长上报', dwell.status === 200 && dwell.data.stored);
  const click = await req('/api/public/track', { body: { key: KEY, vid, sid, type: 'click', name: '预约演示', url: BASE + '/pricing' } });
  ok('点击行为上报', click.status === 200);
  const trigger = await req('/api/public/trigger-check', { body: { key: KEY, vid, url: BASE + '/pricing', dwell: 20, scrollDepth: 10 } });
  ok('触发规则命中价格页停留', trigger.status === 200 && trigger.data.matched && trigger.data.matched.name.includes('价格页'), trigger.data);
  const consent = await req('/api/public/consent', { body: { key: KEY, vid, consent: false } });
  ok('访客拒绝追踪接口', consent.status === 200 && consent.data.tracking === false);
  const consentBack = await req('/api/public/consent', { body: { key: KEY, vid, consent: true } });
  ok('访客恢复追踪', consentBack.status === 200 && consentBack.data.tracking === true);
  const blocked = await req('/api/public/blacklist-check', { body: { key: KEY, vid: 'v_not_blocked' } });
  ok('黑名单检查接口', blocked.status === 200 && typeof blocked.data.blocked === 'boolean');

  console.log('\n[3] 表单、离线留言与落地页线索');
  const prechat = cfg.data.forms.prechat;
  const submit = await req('/api/public/form/' + prechat.id, { body: { key: KEY, vid, data: { business_type: 'SaaS 软件', phone: '13800138000', need: '想提升官网留资' } } });
  ok('预检表单提交并生成线索', submit.status === 200 && submit.data.leadId, submit.data);
  const badForm = await req('/api/public/form/' + prechat.id, { body: { key: KEY, vid, data: { phone: '123' } } });
  ok('表单校验手机号', badForm.status === 400);
  const offline = await req('/api/public/offline', { body: { key: KEY, vid, name: '测试访客', phone: '13900139000', content: '想了解企业版私有化部署能力' } });
  ok('离线留言创建会话与线索', offline.status === 200 && offline.data.conversationId && offline.data.leadId, offline.data);
  const demo = await req('/api/public/demo-request', { body: { name: '张三', phone: '13700137000', company: '测试公司', channel: '官网留资率低' } });
  ok('落地页试用申请入库', demo.status === 200 && demo.data.ok);

  console.log('\n[4] 实时聊天（Socket.IO）');
  const visitor = await connect(BASE, { key: KEY });
  const init = await emitAck(visitor, 'visitor:init', { key: KEY, vid, subject: '集成测试会话' });
  ok('访客初始化会话', init.ok && init.conversation.id, init);
  const convId = init.conversation.id;
  const agent = await connect(BASE, { token });
  const auth = await emitAck(agent, 'auth:agent', { token });
  ok('客服 Socket 认证', auth.ok, auth);
  const join = await emitAck(agent, 'agent:join', { conversationId: convId });
  ok('客服加入会话', join.ok);
  const agentMsgEvent = once(visitor, 'message:new');
  const send = await emitAck(agent, 'agent:message', { conversationId: convId, content: '您好，这里是集成测试客服。' });
  ok('客服发送消息', send.ok && send.messageId, send);
  const received = await agentMsgEvent;
  ok('访客实时收到客服消息', received && received.content.includes('集成测试客服'), received);
  const visitorMsgEvent = once(agent, 'message:new');
  const vsend = await emitAck(visitor, 'visitor:message', { conversationId: convId, content: '我想了解专业版报价' });
  ok('访客发送消息', vsend.ok);
  const vmsg = await visitorMsgEvent;
  ok('客服实时收到访客消息', vmsg && vmsg.content.includes('专业版报价'));
  const note = await emitAck(agent, 'agent:note', { conversationId: convId, content: '内部备注：客户预算充足' });
  ok('内部私有备注', note.ok);
  const claim = await emitAck(agent, 'conversation:claim', { conversationId: convId });
  ok('会话抢单/接管', claim.ok);
  const typing = once(agent, 'visitor:typing');
  visitor.emit('visitor:typing', { conversationId: convId, draft: '我正在输入预算' });
  const typingData = await typing;
  ok('访客输入预览（草稿）', typingData && typingData.draft === '我正在输入预算');
  const close = await emitAck(agent, 'conversation:close', { conversationId: convId });
  ok('结束会话（专业版不生成 AI 摘要）', close.ok && close.summary === null, close.summary);
  const rating = await req('/api/public/rating', { body: { conversationId: convId, score: 5, comment: '回复很快' } });
  ok('访客满意度评价', rating.status === 200);
  visitor.close();
  agent.close();

  console.log('\n[5] 后台会话与访客档案');
  const convList = await req('/api/conversations?status=all', { token });
  ok('会话列表', convList.status === 200 && convList.data.conversations.length > 0);
  const convDetail = await req('/api/conversations/' + convId, { token });
  ok('会话详情含内部备注', convDetail.status === 200 && convDetail.data.messages.some((m) => m.isPrivate), convDetail.data.messages.length);
  const visitors = await req('/api/visitors?q=' + encodeURIComponent(vid), { token });
  ok('访客列表', visitors.status === 200 && visitors.data.total > 0);
  const visitorId = visitors.data.visitors.filter((v) => v.vid === vid)[0].id;
  const profile = await req('/api/visitors/' + visitorId, { token });
  ok('访客 360 档案', profile.status === 200 && profile.data.timeline.length > 0 && profile.data.pageviews.length > 0);
  const tags = await req('/api/tags', { token });
  const tagRes = await req('/api/visitors/' + visitorId + '/tags', { token, body: { tagIds: [tags.data.tags[0].id] } });
  ok('访客打标签', tagRes.status === 200 && tagRes.data.tags.length === 1);

  console.log('\n[6] 线索 CRM 与导出');
  const leads = await req('/api/leads', { token });
  ok('线索列表', leads.status === 200 && leads.data.total > 0);
  const leadId = leads.data.leads[0].id;
  const follow = await req('/api/leads/' + leadId + '/followups', { token, body: { content: '集成测试跟进记录' } });
  ok('添加跟进记录', follow.status === 200);
  const statusUpdate = await req('/api/leads/' + leadId, { token, method: 'PATCH', body: { status: 'following' } });
  ok('线索状态流转', statusUpdate.status === 200);
  const csvRes = await fetch(BASE + '/api/leads/export.csv', { headers: { Authorization: 'Bearer ' + token } });
  const csv = await csvRes.text();
  ok('线索导出 CSV/Excel', csvRes.status === 200 && csv.includes('线索ID') && csv.includes('手机号'));

  console.log('\n[7] 报表');
  const dash = await req('/api/dashboard/overview?range=14', { token });
  ok('数据概览', dash.status === 200 && dash.data.metrics && dash.data.trend.dates.length === 14);
  ok('广告拦截统计', typeof dash.data.metrics.adblockRate === 'number');
  for (const [name, path] of [['来源', 'sources'], ['漏斗', 'funnel'], ['绩效', 'agents'], ['热力', 'geo'], ['流失', 'churn']]) {
    const r = await req('/api/reports/' + path + '?range=14', { token });
    ok(name + '报表', r.status === 200);
  }

  console.log('\n[8] 配置模块');
  const sites = await req('/api/sites', { token });
  ok('站点列表', sites.status === 200 && sites.data.sites.length >= 2);
  const siteId = sites.data.sites[0].id;
  const widgetSave = await req('/api/sites/' + siteId, { token, method: 'PATCH', body: { widget_config: { ...sites.data.sites[0].widget_config, primaryColor: '#7c3aed', title: '在线咨询' } } });
  ok('保存挂件配置', widgetSave.status === 200 && widgetSave.data.site.widget_config.primaryColor === '#7c3aed');
  const rules = await req('/api/rules', { token });
  ok('规则列表', rules.status === 200 && rules.data.rules.length > 0);
  const newRule = await req('/api/rules', { token, body: { name: '集成测试规则', type: 'trigger', siteId, conditions: { dwell: 5 }, actions: { type: 'greeting', title: '测试', message: '测试消息' } } });
  ok('新建触发规则', newRule.status === 200 && newRule.data.id);
  const faqs = await req('/api/faqs', { token });
  ok('知识库读取', faqs.status === 200 && faqs.data.faqs.length > 0);
  const newFaq = await req('/api/faqs', { token, body: { siteId, question: '集成测试问题', answer: '集成测试答案', categoryId: faqs.data.categories[0].id } });
  ok('新增 FAQ', newFaq.status === 200);
  const forms = await req('/api/forms', { token });
  ok('表单列表', forms.status === 200 && forms.data.forms.length >= 2);
  const announcement = await req('/api/announcement?siteId=' + siteId, { token });
  ok('公告读取', announcement.status === 200);
  const bl = await req('/api/blacklist?siteId=' + siteId, { token });
  ok('黑名单读取', bl.status === 200);
  const settings = await req('/api/settings', { token });
  ok('系统设置读取', settings.status === 200 && settings.data.tenant);
  const billing = await req('/api/billing', { token });
  ok('套餐与用量', billing.status === 200 && billing.data.plans.length === 4);
  const notifications = await req('/api/notifications', { token });
  ok('通知列表', notifications.status === 200);
  const logs = await req('/api/audit-logs', { token });
  ok('操作日志', logs.status === 200 && logs.data.logs.length > 0);
  const aiLocked = await req('/api/ai/overview', { token });
  ok('专业版未开通 AI（版本锁定）', aiLocked.status === 403 && aiLocked.data.code === 'PLAN_LOCKED');
  const transLocked = await req('/api/public/translate', { body: { key: KEY, text: '你好', target: 'en' } });
  ok('专业版未开通多语言翻译', transLocked.status === 403);
  await req('/api/billing/change-plan', { token, body: { plan: 'enterprise' } });
  const trans = await req('/api/public/translate', { body: { key: KEY, text: '你好，价格多少钱', target: 'en' } });
  ok('企业版访客端翻译', trans.status === 200 && /Hello|price|how much/i.test(trans.data.text), trans.data);
  const ai = await req('/api/ai/overview', { token });
  ok('企业版 AI 概览', ai.status === 200 && ai.data.stats);
  const aiTest = await req('/api/ai/test-answer', { token, body: { question: '价格怎么算', siteId } });
  ok('AI 知识库命中', aiTest.status === 200 && aiTest.data.reply);
  const aiSummary = await req('/api/ai/summary/' + convId, { token, body: {} });
  ok('企业版 AI 会话摘要', aiSummary.status === 200 && aiSummary.data.summary.summary, aiSummary.data);
  await req('/api/billing/change-plan', { token, body: { plan: 'pro' } });

  console.log('\n[9] 权限与套餐隔离');
  const agentLogin = await req('/api/auth/login', { body: { email: 'agent@demo.com', password: 'agent123' } });
  const agentToken = agentLogin.data.token;
  const agentReports = await req('/api/reports/sources', { token: agentToken });
  ok('客服不能看高级报表', agentReports.status === 403);
  const agentUsers = await req('/api/users', { token: agentToken });
  ok('客服不能管理团队', agentUsers.status === 403);
  const agentChat = await req('/api/conversations', { token: agentToken });
  ok('客服可以接待会话', agentChat.status === 200);
  const ownerLogin = await req('/api/auth/login', { body: { email: 'owner@demo.com', password: 'demo1234' } });
  const ownerToken = ownerLogin.data.token;
  const ownerCrm = await req('/api/leads', { token: ownerToken });
  ok('标准版无 CRM 权限', ownerCrm.status === 403 && ownerCrm.data.code === 'PLAN_LOCKED');
  const ownerFunnel = await req('/api/reports/funnel', { token: ownerToken });
  ok('标准版无漏斗权限', ownerFunnel.status === 403);
  const ownerSite = await req('/api/sites', { token: ownerToken });
  ok('租户数据隔离（站点不串）', ownerSite.status === 200 && ownerSite.data.sites.every((s) => s.site_key !== KEY));

  console.log('\n[10] 开放 API');
  const key = get('SELECT * FROM api_keys WHERE tenant_id = 1 AND enabled = 1');
  const extLocked = await req('/api/v1/stats', { headers: { 'x-api-key': key.key } });
  ok('专业版未开通开放 API（版本锁定）', extLocked.status === 403);
  await req('/api/billing/change-plan', { token, body: { plan: 'enterprise' } });
  const ext = await req('/api/v1/stats', { headers: { 'x-api-key': key.key } });
  ok('API Key 访问统计', ext.status === 200 && typeof ext.data.leads === 'number');
  const extLeads = await req('/api/v1/leads', { headers: { 'x-api-key': key.key } });
  ok('API Key 读取线索', extLeads.status === 200 && Array.isArray(extLeads.data.data));
  await req('/api/billing/change-plan', { token, body: { plan: 'pro' } });
  const noKey = await req('/api/v1/stats');
  ok('无 API Key 拒绝', noKey.status === 401);

  console.log('\n[11] 文件上传与广告拦截');
  const fd = new FormData();
  fd.append('file', new Blob(['hello qingzhan'], { type: 'text/plain' }), 'test.txt');
  const upRes = await fetch(BASE + '/api/public/upload?key=' + KEY, { method: 'POST', body: fd });
  const upData = await upRes.json();
  ok('访客文件上传', upRes.status === 200 && upData.url.startsWith('/uploads/'), upData);
  const adm = await req('/api/upload', { token, method: 'POST', body: (() => { const f = new FormData(); f.append('file', new Blob(['admin'], { type: 'text/plain' }), 'a.txt'); return f; })() });
  ok('后台上传附件', adm.status === 200 && adm.data.url);
  const adblock = await req('/api/public/adblock', { body: { key: KEY, vid, url: BASE + '/pricing' } });
  ok('广告拦截事件上报', adblock.status === 200 && adblock.data.recorded);
  const adEvents = get("SELECT COUNT(*) c FROM events WHERE type = 'adblock'");
  ok('拦截事件已入库', adEvents.c > 0);

  console.log('\n完成：' + passed + ' 项通过' + (process.exitCode ? '，存在失败项' : '，全部通过'));
  process.exit(process.exitCode || 0);
})().catch((err) => {
  console.error('\n测试异常：', err);
  process.exit(1);
});
