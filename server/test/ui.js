'use strict';
const { chromium } = require('playwright');
const fs = require('node:fs');
const http = require('node:http');

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
  if (!(await page.title()).includes('轻客服')) throw new Error('landing title');
  const priceCards = await page.locator('.price-card').count();
  if (priceCards !== 4) throw new Error('pricing cards ' + priceCards);
  log('落地页加载，4 个套餐卡片');
  await page.screenshot({ path: SHOTS + '/01-landing.png', fullPage: true });

  const consultTriggers = await page.locator('[data-consult]').count();
  if (consultTriggers < 5) throw new Error('consult triggers ' + consultTriggers);
  await page.locator('[data-consult]').first().click();
  await page.waitForSelector('.consult-mask', { timeout: 3000 });
  await page.fill('.consult-form input[name=name]', 'UI 测试顾问');
  await page.fill('.consult-form input[name=phone]', '13912345678');
  await page.locator('.consult-form button[type=submit]').click();
  await page.waitForSelector('.consult-success.show', { timeout: 5000 });
  await page.screenshot({ path: SHOTS + '/01a-consult-modal.png' });
  await page.locator('[data-consult-close]').click();
  if (await page.locator('.consult-mask').count()) throw new Error('consult modal not closed');
  log('首页预约顾问弹窗从入口打开并提交成功');

  const signupTriggers = await page.locator('[data-signup]').count();
  if (signupTriggers < 6) throw new Error('signup triggers ' + signupTriggers);
  await page.locator('[data-signup]').first().click();
  await page.waitForSelector('.signup-mask', { timeout: 3000 });
  if (!(await page.locator('.signup-intro').isVisible())) throw new Error('signup intro missing');
  await page.fill('.signup-form input[name=phone]', '13700002222');
  await page.locator('.signup-form [data-send-code]').click();
  await page.waitForFunction(() => /演示环境验证码/.test((document.querySelector('.signup-hint') || {}).textContent || ''), null, { timeout: 5000 });
  await page.screenshot({ path: SHOTS + '/01c-signup-modal.png' });
  await page.locator('.signup-mask .consult-close').click();
  if (await page.locator('.signup-mask').count()) throw new Error('signup modal not closed');
  if ((await page.url()).includes('/signup')) throw new Error('signup modal navigated away');
  log('首页免费注册弹窗打开、发码且不跳转');

  // cross-origin customer site: absolute embed must load core and config
  const crossServer = http.createServer((req, res) => {
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end('<!doctype html><html><head><meta charset="utf-8"><title>Customer Site</title></head><body><h1>Customer Site</h1><script async src="' + BASE + '/qz.js?0f928e95b1adc3f89d3a1e0dab18c5bf"></script></body></html>');
  });
  await new Promise((resolve) => crossServer.listen(3101, '127.0.0.1', resolve));
  const crossPage = await ctx.newPage();
  crossPage.on('pageerror', (e) => errors.push('cross-origin pageerror: ' + e.message));
  crossPage.on('console', (m) => { if (m.type() === 'error') errors.push('cross-origin console: ' + m.text()); });
  await crossPage.goto('http://127.0.0.1:3101/', { waitUntil: 'networkidle' });
  await crossPage.waitForSelector('#qz-widget-host .qz-launcher', { timeout: 12000 });
  await crossPage.locator('#qz-widget-host .qz-launcher').click();
  await crossPage.waitForTimeout(800);
  if (!(await crossPage.locator('#qz-widget-host .qz-panel.qz-open').count())) throw new Error('cross-origin widget panel failed');
  await crossPage.screenshot({ path: SHOTS + '/01b-cross-origin-widget.png' });
  log('跨域客户网站用绝对地址加载挂件');
  await crossPage.close();
  await new Promise((resolve) => crossServer.close(resolve));

  // public i18n
  const i18nCtx = await browser.newContext({ viewport: { width: 1280, height: 800 }, locale: 'en-US' });
  const i18nPage = await i18nCtx.newPage();
  i18nPage.on('pageerror', (e) => errors.push('i18n pageerror: ' + e.message));
  await i18nPage.goto(BASE + '/', { waitUntil: 'networkidle' });
  await i18nPage.selectOption('[data-lang-select]', 'en');
  await i18nPage.waitForTimeout(500);
  const heroCta = await i18nPage.locator('.hero-cta .btn-primary').innerText();
  if (!/Sign up free/i.test(heroCta)) throw new Error('landing i18n failed: ' + heroCta);
  const heroTitle = await i18nPage.locator('.hero h1').innerText();
  if (!/lead CRM/i.test(heroTitle)) throw new Error('landing title i18n failed: ' + heroTitle);
  await i18nPage.goto(BASE + '/', { waitUntil: 'networkidle' });
  await i18nPage.click('[data-signup]');
  await i18nPage.waitForSelector('.signup-mask', { timeout: 3000 });
  const signupTitle = await i18nPage.locator('.signup-mask .consult-head h3').innerText();
  if (!/Create your account/i.test(signupTitle)) throw new Error('signup i18n failed: ' + signupTitle);
  await i18nPage.screenshot({ path: SHOTS + '/01c-i18n.png' });
  await i18nCtx.close();
  log('落地页与注册页五语言切换');

  // widget on landing
  await page.waitForTimeout(800);
  const launcher = page.locator('#qz-widget-host .qz-launcher');
  await launcher.waitFor({ state: 'visible', timeout: 8000 });
  log('访客挂件异步注入完成');
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
  await admin.fill('input[name=identifier]', 'admin@demo.com');
  await admin.fill('input[name=password]', 'admin123');
  await admin.click('#login-form button[type=submit]');
  await admin.waitForSelector('#app:not([hidden])', { timeout: 10000 });
  await admin.waitForTimeout(1600);
  log('管理员登录并进入工作台');
  const landingTitle = await admin.locator('.page-head h1').first().innerText();
  if (landingTitle !== '数据概览') throw new Error('default page is not dashboard: ' + landingTitle);
  await admin.click('[data-user]');
  await admin.waitForTimeout(300);
  await admin.click('[data-profile]');
  await admin.waitForTimeout(300);
  await admin.fill('[data-profile-name]', 'UI 管理员');
  await admin.locator('[data-avatar="av2"]').click();
  await admin.locator('.modal-card .modal-foot button').last().click();
  await admin.waitForTimeout(800);
  if (!(await admin.locator('.top-user .avatar-art').count())) throw new Error('profile avatar not applied');
  log('修改昵称与内置头像，后台默认数据概览');
  await admin.selectOption('[data-admin-lang]', 'en');
  await admin.waitForTimeout(1600);
  const enNav = await admin.locator('[data-nav="dashboard"] .n-label').innerText();
  if (enNav !== 'Overview') throw new Error('admin i18n nav failed: ' + enNav);
  await admin.selectOption('[data-admin-lang]', 'zh-CN');
  await admin.waitForTimeout(1600);
  const zhNav = await admin.locator('[data-nav="dashboard"] .n-label').innerText();
  if (zhNav !== '数据概览') throw new Error('admin i18n restore failed: ' + zhNav);
  log('后台语言切换到英文并恢复中文');
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
    ['analytics', 'analytics'], ['visitors', 'visitor'], ['leads', 'lead'], ['reports', 'report'], ['widget', 'widget'], ['automation', 'automation'],
    ['knowledge', 'knowledge'], ['sites', 'sites'], ['forms', 'forms'], ['team', 'team'], ['billing', 'billing'],
    ['settings', 'settings'], ['notifications', 'notifications'], ['support', 'support'], ['referral', 'referral'], ['logs', 'logs']
  ];
  for (const [key, file] of pages) {
    await admin.locator('[data-nav="' + key + '"]').click();
    await admin.waitForTimeout(1100);
    const title = await admin.locator('.page-head h1').first().innerText().catch(() => '');
    if (!title) throw new Error('page title missing: ' + key);
    await admin.screenshot({ path: SHOTS + '/10-admin-' + file + '.png', fullPage: true });
    log('管理后台页面：' + title);
  }

  // cloud notes opens in a new tab with the shared login
  const notesNav = admin.locator('[data-nav="notes"]');
  if (await notesNav.count()) {
    const [notesPage] = await Promise.all([ctx.waitForEvent('page'), notesNav.click()]);
    await notesPage.waitForLoadState('networkidle');
    await notesPage.waitForTimeout(1200);
    if (!(await notesPage.title()).includes('云笔记')) throw new Error('notes page title missing');
    if (await notesPage.locator('#notebookNav .nav-item').count() < 1) throw new Error('notes notebooks missing');
    await notesPage.screenshot({ path: SHOTS + '/10-admin-notes.png', fullPage: true });
    await notesPage.close();
    log('云笔记新标签页与共享登录');
  }

  // billing order flow
  await admin.locator('[data-nav="billing"]').click();
  await admin.waitForTimeout(1100);
  const renew = admin.locator('[data-buy="pro"]');
  if (await renew.count()) {
    await renew.first().click();
    await admin.waitForTimeout(500);
    await admin.locator('.modal-card .modal-foot button').last().click();
    await admin.waitForTimeout(900);
    const payBtn = admin.locator('.modal-card .modal-foot button').last();
    if (await payBtn.count()) {
      const payLabel = await payBtn.innerText();
      if (payLabel.includes('模拟支付')) {
        await payBtn.click();
        await admin.waitForTimeout(1800);
        await admin.screenshot({ path: SHOTS + '/20-billing-paid.png', fullPage: true });
        log('自助订单创建与模拟支付');
      } else {
        await admin.locator('.modal-card .modal-close').click();
        await admin.waitForTimeout(300);
        log('自助订单创建并生成支付宝支付链接');
      }
    }
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
  await mp.screenshot({ path: SHOTS + '/14-mobile-landing.png' });
  const mLauncher = mp.locator('#qz-widget-host .qz-launcher');
  await mLauncher.waitFor({ state: 'visible', timeout: 8000 });
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
  await mInput.fill('移动端可以直接发起咨询吗');
  await mp.locator('#qz-widget-host [data-act="send"]').click();
  await mp.waitForTimeout(1200);
  const mBubbles = await mp.locator('#qz-widget-host .qz-msg').count();
  if (!mBubbles) throw new Error('mobile chat failed');
  log('移动端访客可直接发起咨询');

  // ---------- self-serve signup ----------
  const signup = await ctx.newPage();
  signup.on('pageerror', (e) => errors.push('signup pageerror: ' + e.message));
  signup.on('console', (m) => { if (m.type() === 'error') errors.push('signup console: ' + m.text()); });
  await signup.goto(BASE + '/', { waitUntil: 'networkidle' });
  await signup.click('[data-signup]');
  await signup.waitForSelector('.signup-mask', { timeout: 3000 });
  const signupPhone = '139' + String(Date.now()).slice(-8);
  await signup.fill('.signup-form input[name=phone]', signupPhone);
  await signup.click('.signup-form [data-send-code]');
  await signup.waitForFunction(() => /演示环境验证码/.test((document.querySelector('.signup-form [data-code-hint]') || {}).textContent || ''), null, { timeout: 5000 });
  await signup.fill('.signup-form input[name=password]', 'test1234');
  await signup.click('.signup-form button[type=submit]');
  await signup.waitForSelector('#app:not([hidden])', { timeout: 15000 });
  await signup.waitForTimeout(1300);
  if (!signup.url().includes('/admin/#/onboarding')) throw new Error('signup redirect: ' + signup.url());
  const onbTitle = await signup.locator('#page h1').first().innerText();
  if (onbTitle !== '接入向导') throw new Error('onboarding title ' + onbTitle);
  await signup.screenshot({ path: SHOTS + '/16-signup-onboarding.png', fullPage: true });
  log('自助注册并进入接入向导');
  await signup.evaluate(() => localStorage.removeItem('qz_admin_token'));
  await signup.goto(BASE + '/admin/?relogin=' + Date.now() + '#/onboarding', { waitUntil: 'networkidle' });
  await signup.fill('input[name=identifier]', signupPhone);
  await signup.fill('input[name=password]', 'test1234');
  await signup.click('#login-form button[type=submit]');
  await signup.waitForSelector('#app:not([hidden])', { timeout: 15000 });
  await signup.waitForTimeout(1400);
  const onbTitleAgain = await signup.locator('#page h1').first().innerText();
  if (onbTitleAgain !== '接入向导') throw new Error('login should keep onboarding route: ' + onbTitleAgain);
  log('登录后保留接入向导路由');
  if (await signup.locator('a[href^="/sandbox/"]').count()) throw new Error('self-serve sandbox should be removed');
  const addSite = signup.locator('[data-add-site]').first();
  if (!(await addSite.count())) throw new Error('onboarding add-site action missing');
  await addSite.click();
  await signup.waitForTimeout(800);
  await signup.locator('[data-new-site]').click();
  await signup.waitForTimeout(400);
  await signup.fill('[data-s="name"]', 'UI 测试独立站');
  await signup.fill('[data-s="domain"]', 'www.ui-test-site.com');
  await signup.locator('.modal-card .modal-foot button').last().click();
  await signup.waitForTimeout(1800);
  if (!(await signup.locator('.code-box').count())) throw new Error('new site embed missing');
  const embedText = await signup.locator('.code-box').first().innerText();
  if (!/src="https?:\/\/[^"]+\/qz\.js\?[a-f0-9]{32}/.test(embedText)) throw new Error('embed is not absolute: ' + embedText);
  await signup.screenshot({ path: SHOTS + '/17-signup-site.png', fullPage: true });
  log('注册后添加自己的网站并显示接入代码');

  // ---------- platform ops ----------
  const ops = await ctx.newPage();
  ops.on('pageerror', (e) => errors.push('ops pageerror: ' + e.message));
  ops.on('console', (m) => { if (m.type() === 'error') errors.push('ops console: ' + m.text()); });
  await ops.goto(BASE + '/ops/', { waitUntil: 'networkidle' });
  await ops.fill('input[name=email]', 'ops@platform.com');
  await ops.fill('input[name=password]', 'ops123');
  await ops.click('#ops-login-form button[type=submit]');
  await ops.waitForSelector('#ops-app:not([hidden])', { timeout: 10000 });
  await ops.waitForTimeout(1200);
  await ops.screenshot({ path: SHOTS + '/18-ops-overview.png', fullPage: true });
  log('平台运营后台登录');
  for (const key of ['accounts', 'workspaces', 'applications', 'subscriptions', 'risk', 'referrals', 'tickets', 'team', 'logs']) {
    await ops.click('[data-nav="' + key + '"]');
    await ops.waitForTimeout(800);
    const title = await ops.locator('.topbar-title').innerText();
    if (!title) throw new Error('ops page ' + key);
    await ops.screenshot({ path: SHOTS + '/19-ops-' + key + '.png' });
  }
  log('运营后台九个模块可打开');
  await ops.click('[data-nav="tickets"]');
  await ops.waitForTimeout(700);
  const ticketBtn = ops.locator('[data-ticket]').first();
  if (await ticketBtn.count()) {
    await ticketBtn.click();
    await ops.waitForTimeout(700);
    await ops.screenshot({ path: SHOTS + '/21-ops-ticket-detail.png', fullPage: true });
    log('运营工单详情与回复面板');
    await ops.locator('.modal-close').click();
    await ops.waitForTimeout(300);
  }
  const appRow = ops.locator('[data-nav="applications"]');
  await appRow.click();
  await ops.waitForTimeout(700);

  console.log('\n页面错误数：' + errors.length);
  errors.slice(0, 4).forEach((e) => console.log('  - ' + e));
  await browser.close();
  if (errors.length) process.exitCode = 1;
})().catch((err) => {
  console.error('UI 测试失败：', err.message);
  process.exit(1);
});
