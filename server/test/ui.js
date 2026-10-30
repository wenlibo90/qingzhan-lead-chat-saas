'use strict';
const { chromium } = require('playwright');
const fs = require('node:fs');

const BASE = process.env.BASE_URL || 'http://localhost:3000';
const SHOTS = '/tmp/shots';
if (!fs.existsSync(SHOTS)) fs.mkdirSync(SHOTS, { recursive: true });
const errors = [];
let step = 0;

function log(name) { console.log(`  ok  ${++step}. ${name}`); }

(async () => {
  const browser = await chromium.launch({ args: ['--no-sandbox', '--disable-dev-shm-usage'] });
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 960 }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
  page.on('console', (m) => { if (m.type() === 'error') errors.push('console: ' + m.text()); });

  // ---------- landing ----------
  await page.goto(BASE + '/', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1200);
  await page.evaluate(async () => {
    for (let y = 0; y < document.body.scrollHeight; y += 700) { window.scrollTo(0, y); await new Promise((r) => setTimeout(r, 80)); }
    window.scrollTo(0, 0);
    document.querySelectorAll('.reveal').forEach(function (el) { el.classList.add('in'); });
  });
  await page.waitForTimeout(500);
  if (!(await page.title()).includes('轻站')) throw new Error('landing title');
  const priceCards = await page.locator('.price-card').count();
  if (priceCards !== 4) throw new Error('pricing cards ' + priceCards);
  log('落地页加载，4 个套餐卡片');
  await page.screenshot({ path: SHOTS + '/01-landing.png', fullPage: true });

  // widget on landing
  await page.waitForTimeout(800);
  const launcher = page.locator('#qz-widget-host .qz-launcher');
  await launcher.waitFor({ state: 'visible', timeout: 8000 });
  log('访客挂件异步注入完成');
  const consent = page.locator('#qz-widget-host .qz-consent .qz-yes');
  if (await consent.count()) { await consent.click(); log('隐私提示：同意追踪'); }
  await launcher.click();
  await page.waitForTimeout(900);
  await page.screenshot({ path: SHOTS + '/02-landing-widget.png' });
  const panelVisible = await page.locator('#qz-widget-host .qz-panel.qz-open').count();
  if (!panelVisible) throw new Error('widget panel not open');
  log('访客挂件聊天面板打开');

  // admin login first so agents are online for widget test
  const admin = await ctx.newPage();
  admin.on('pageerror', (e) => errors.push('admin pageerror: ' + e.message + '\n' + (e.stack || '')));
  admin.on('console', (m) => { if (m.type() === 'error') errors.push('admin console: ' + m.text()); });
  await admin.goto(BASE + '/admin/', { waitUntil: 'networkidle' });
  await admin.screenshot({ path: SHOTS + '/03-admin-login.png' });
  await admin.fill('input[name=email]', 'admin@demo.com');
  await admin.fill('input[name=password]', 'admin123');
  await admin.click('#login-form button[type=submit]');
  await admin.waitForSelector('#app:not([hidden])', { timeout: 10000 });
  await admin.waitForTimeout(1600);
  log('管理员登录并进入工作台');
  await admin.screenshot({ path: SHOTS + '/04-admin-dashboard.png', fullPage: true });
  const metricText = await admin.locator('.metric-card .m-value').first().innerText();
  if (!metricText.trim()) throw new Error('dashboard metrics empty');
  log('数据概览指标渲染：' + metricText.trim().replace(/\n/g, ' '));

  // ---------- demo site widget flow ----------
  const demo = await ctx.newPage();
  demo.on('pageerror', (e) => errors.push('demo pageerror: ' + e.message));
  demo.on('console', (m) => { if (m.type() === 'error') errors.push('demo console: ' + m.text()); });
  await demo.goto(BASE + '/demo/', { waitUntil: 'networkidle' });
  await demo.waitForTimeout(1400);
  await demo.screenshot({ path: SHOTS + '/05-demo.png', fullPage: true });
  const demoLauncher = demo.locator('#qz-widget-host .qz-launcher');
  await demoLauncher.waitFor({ state: 'visible', timeout: 8000 });
  const demoConsent = demo.locator('#qz-widget-host .qz-consent .qz-yes');
  if (await demoConsent.count()) await demoConsent.click();
  await demoLauncher.click();
  await demo.waitForTimeout(700);
  const prechatBtn = demo.locator('#qz-widget-host .qz-screen [data-submit-form]');
  if (await prechatBtn.count()) {
    log('预检表单弹出');
    const selects = demo.locator('#qz-widget-host .qz-screen select');
    if (await selects.count()) await selects.first().selectOption({ index: 1 });
    const inputs = demo.locator('#qz-widget-host .qz-screen input');
    if (await inputs.count()) await inputs.first().fill('13911112222');
    await demo.screenshot({ path: SHOTS + '/06-demo-prechat.png' });
    await prechatBtn.click();
    await demo.waitForTimeout(1400);
    log('预检表单提交并进入会话');
  }
  const chatInput = demo.locator('#qz-widget-host .qz-input');
  await chatInput.waitFor({ state: 'visible', timeout: 8000 });
  await chatInput.fill('想了解一下专业版的转化漏斗怎么用');
  await demo.locator('#qz-widget-host [data-act="send"]').click();
  await demo.waitForTimeout(1200);
  await demo.screenshot({ path: SHOTS + '/07-demo-chat.png' });
  const bubbles = await demo.locator('#qz-widget-host .qz-msg').count();
  if (bubbles < 1) throw new Error('visitor message not rendered');
  log('访客实时发送消息并在聊天窗口渲染');

  // admin sees new conversation
  await admin.reload({ waitUntil: 'networkidle' });
  await admin.waitForTimeout(1200);
  await admin.locator('[data-nav="conversations"]').click();
  await admin.waitForTimeout(1400);
  await admin.screenshot({ path: SHOTS + '/08-admin-conversations.png' });
  const convItems = await admin.locator('.conv-item').count();
  if (!convItems) throw new Error('no conversations in admin');
  log('客服后台实时会话列表：' + convItems + ' 条');
  await admin.locator('.conv-item').first().click();
  await admin.waitForTimeout(1200);
  await admin.screenshot({ path: SHOTS + '/09-admin-chat.png' });
  const chatBody = await admin.locator('#chat-body').count();
  if (!chatBody) throw new Error('admin chat pane missing');
  log('客服会话详情与访客侧栏渲染');

  // other admin pages
  const pages = [
    ['visitors', 'visitor'], ['leads', 'lead'], ['reports', 'report'], ['widget', 'widget'], ['automation', 'automation'],
    ['knowledge', 'knowledge'], ['sites', 'sites'], ['forms', 'forms'], ['team', 'team'], ['billing', 'billing'],
    ['settings', 'settings'], ['notifications', 'notifications'], ['logs', 'logs']
  ];
  for (const [key, file] of pages) {
    await admin.locator('[data-nav="' + key + '"]').click();
    await admin.waitForTimeout(1100);
    const title = await admin.locator('.page-head h1').first().innerText().catch(() => '');
    if (!title) throw new Error('page title missing: ' + key);
    await admin.screenshot({ path: SHOTS + '/10-admin-' + file + '.png', fullPage: true });
    log('管理后台页面：' + title);
  }

  // visitors detail
  await admin.locator('[data-nav="visitors"]').click();
  await admin.waitForTimeout(900);
  const vBtn = admin.locator('[data-v]').first();
  if (await vBtn.count()) {
    await vBtn.click();
    await admin.waitForTimeout(1100);
    await admin.screenshot({ path: SHOTS + '/11-admin-visitor-detail.png', fullPage: true });
    log('访客 360 档案页');
  }

  // reports tabs
  await admin.locator('[data-nav="reports"]').click();
  await admin.waitForTimeout(900);
  for (const tab of ['sources', 'funnel', 'agents', 'geo', 'churn']) {
    const b = admin.locator('[data-rtab="' + tab + '"]');
    if (await b.count()) {
      await b.click();
      await admin.waitForTimeout(900);
    }
  }
  await admin.screenshot({ path: SHOTS + '/12-admin-reports.png', fullPage: true });
  log('报表五个标签页切换');

  // widget config live preview
  await admin.locator('[data-nav="widget"]').click();
  await admin.waitForTimeout(900);
  await admin.locator('[data-wtab="embed"]').click();
  await admin.waitForTimeout(700);
  await admin.screenshot({ path: SHOTS + '/13-admin-embed.png', fullPage: true });
  log('挂件接入代码页');

  // mobile landing
  const mob = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 });
  const mp = await mob.newPage();
  mp.on('pageerror', (e) => errors.push('mobile pageerror: ' + e.message));
  await mp.goto(BASE + '/', { waitUntil: 'networkidle' });
  await mp.waitForTimeout(1000);
  await mp.evaluate(async () => {
    for (let y = 0; y < document.body.scrollHeight; y += 600) { window.scrollTo(0, y); await new Promise((r) => setTimeout(r, 70)); }
    window.scrollTo(0, 0);
    document.querySelectorAll('.reveal').forEach(function (el) { el.classList.add('in'); });
  });
  await mp.waitForTimeout(500);
  await mp.screenshot({ path: SHOTS + '/14-mobile-landing.png', fullPage: true });
  const mLauncher = mp.locator('#qz-widget-host .qz-launcher');
  await mLauncher.waitFor({ state: 'visible', timeout: 8000 });
  const mConsent = mp.locator('#qz-widget-host .qz-consent button').last();
  if (await mConsent.count()) await mConsent.click();
  await mLauncher.click();
  await mp.waitForTimeout(800);
  await mp.screenshot({ path: SHOTS + '/15-mobile-widget.png' });
  log('移动端落地页与全屏挂件渲染');
  const skip = mp.locator('#qz-widget-host [data-skip]');
  if (await skip.count()) {
    await skip.click();
    await mp.waitForTimeout(900);
  }
  const mInput = mp.locator('#qz-widget-host .qz-input');
  await mInput.waitFor({ state: 'visible', timeout: 8000 });
  await mInput.fill('拒绝追踪后仍然可以咨询吗');
  await mp.locator('#qz-widget-host [data-act="send"]').click();
  await mp.waitForTimeout(1200);
  const mBubbles = await mp.locator('#qz-widget-host .qz-msg').count();
  if (!mBubbles) throw new Error('declined-consent chat failed');
  log('访客拒绝追踪后仍可发起咨询');

  console.log('\n页面错误数：' + errors.length);
  errors.slice(0, 4).forEach((e) => console.log('  - ' + e));
  await browser.close();
  if (errors.length) process.exitCode = 1;
})().catch((err) => {
  console.error('UI 测试失败：', err.message);
  process.exit(1);
});
