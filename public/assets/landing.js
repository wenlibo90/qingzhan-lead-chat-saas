(function () {
  'use strict';
  var nav = document.getElementById('site-nav');
  function onScroll() {
    if (window.scrollY > 24) nav.classList.add('scrolled');
    else nav.classList.remove('scrolled');
  }
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  var toggle = document.getElementById('nav-toggle');
  var links = document.getElementById('nav-links');
  if (toggle) {
    toggle.addEventListener('click', function () { links.classList.toggle('open'); });
    links.addEventListener('click', function (e) {
      if (e.target.tagName === 'A') links.classList.remove('open');
    });
  }

  var revealEls = Array.prototype.slice.call(document.querySelectorAll('.reveal'));
  if ('IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('in');
          io.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });
    revealEls.forEach(function (el) { io.observe(el); });
  } else {
    revealEls.forEach(function (el) { el.classList.add('in'); });
  }

  // 首屏光团跟随鼠标做视差（transform 仍在跑漂移动画，这里用独立的 translate 叠加）
  var hero = document.querySelector('.hero');
  var heroGlows = hero ? Array.prototype.slice.call(hero.querySelectorAll('.hero-glow')) : [];
  if (hero && heroGlows.length && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    var px = 0, py = 0, pRaf = null;
    var paintGlow = function () {
      pRaf = null;
      heroGlows.forEach(function (g, i) {
        var k = i === 0 ? 46 : -32;
        g.style.translate = (px * k).toFixed(1) + 'px ' + (py * k * .72).toFixed(1) + 'px';
      });
    };
    hero.addEventListener('pointermove', function (e) {
      var r = hero.getBoundingClientRect();
      px = (e.clientX - r.left) / r.width - .5;
      py = (e.clientY - r.top) / r.height - .5;
      if (!pRaf) pRaf = requestAnimationFrame(paintGlow);
    }, { passive: true });
    hero.addEventListener('pointerleave', function () {
      px = 0; py = 0;
      if (!pRaf) pRaf = requestAnimationFrame(paintGlow);
    });
  }

  // billing toggle
  var billing = 'month';
  var billBtns = Array.prototype.slice.call(document.querySelectorAll('[data-billing]'));
  billBtns.forEach(function (btn) {
    btn.addEventListener('click', function () {
      billing = btn.getAttribute('data-billing');
      billBtns.forEach(function (b) { b.classList.remove('active'); });
      btn.classList.add('active');
      Array.prototype.slice.call(document.querySelectorAll('[data-price]')).forEach(function (p) {
        var month = Number(p.getAttribute('data-price'));
        var year = Number(p.getAttribute('data-year') || 0);
        if (!month) { p.textContent = '¥0'; return; }
        if (!year) { p.textContent = '¥' + month; return; }
        p.textContent = billing === 'year' ? '¥' + Math.round(year / 12) : '¥' + month;
      });
      var subs = Array.prototype.slice.call(document.querySelectorAll('.pc-price span'));
      subs.forEach(function (s) {
        if (s.textContent.indexOf('/') === 0) s.textContent = billing === 'year' ? '/ 月 · 年付' : '/ 月';
      });
    });
  });

  function toast(msg) {
    var holder = document.getElementById('toast-holder');
    var t = document.createElement('div');
    t.className = 'land-toast';
    t.textContent = msg;
    holder.appendChild(t);
    setTimeout(function () {
      t.style.opacity = '0';
      t.style.transition = 'opacity .2s';
      setTimeout(function () { t.remove(); }, 220);
    }, 2400);
  }

  var code = '<script async src="' + location.origin + '/qz.js?YOUR_LOADER_TOKEN"><\/script>';
  var copyBtn = document.getElementById('copy-code');
  if (copyBtn) {
    copyBtn.addEventListener('click', function () {
      function done() { toast('接入代码已复制'); }
      if (navigator.clipboard && window.isSecureContext) {
        navigator.clipboard.writeText(code).then(done).catch(fallback);
      } else fallback();
      function fallback() {
        var ta = document.createElement('textarea');
        ta.value = code;
        ta.style.position = 'fixed';
        ta.style.left = '-9999px';
        document.body.appendChild(ta);
        ta.select();
        try { document.execCommand('copy'); done(); } catch (e) { toast('请手动复制代码'); }
        ta.remove();
      }
    });
  }

  // FAQ: keep only one open
  Array.prototype.slice.call(document.querySelectorAll('.faq-item')).forEach(function (item) {
    item.addEventListener('toggle', function () {
      if (item.open) {
        Array.prototype.slice.call(document.querySelectorAll('.faq-item')).forEach(function (other) {
          if (other !== item) other.open = false;
        });
      }
    });
  });

  // 教程示例里的可选对勾与开关
  Array.prototype.slice.call(document.querySelectorAll('.gs-check, .gs-switch')).forEach(function (btn) {
    btn.addEventListener('click', function () {
      var on = btn.classList.toggle('on');
      btn.setAttribute('aria-pressed', on ? 'true' : 'false');
    });
  });

  // consultation modal
  var consultModal = null;
  function buildConsultModal() {
    var mask = document.createElement('div');
    mask.className = 'consult-mask';
    mask.innerHTML =
      '<div class="consult-card" role="dialog" aria-modal="true" aria-labelledby="consult-title">' +
        '<button class="consult-close" type="button" aria-label="Close">&times;</button>' +
        '<aside class="consult-intro">' +
          '<span class="kicker light" data-i18n="trialKicker">团队 / 企业通道</span>' +
          '<h3 id="consult-title" data-i18n-html="trialTitle">让顾问带你做一次<br>真实接入演示</h3>' +
          '<p data-i18n="trialSub">提交信息后，顾问会带着你的网站做一次真实接入演示。想自己先研究，可以直接免费注册。</p>' +
          '<div class="trial-points"><span data-i18n="trialPoint1">14 天全功能试用</span><span data-i18n="trialPoint2">免费接入辅导</span><span data-i18n="trialPoint3">随时降级免费版</span></div>' +
        '</aside>' +
        '<div class="consult-main">' +
          '<div class="consult-head"><h3 data-i18n="consultTitle">预约顾问</h3><p data-i18n="consultSub">留个联系方式，顾问会带着你的网站做一次真实接入演示。</p></div>' +
          '<form class="consult-form" id="consult-form">' +
            '<div class="cf-row"><div class="cf-field"><label data-i18n="consultName">称呼</label><input name="name" data-i18n-placeholder="consultNamePh" placeholder="怎么称呼你" required></div><div class="cf-field"><label data-i18n="consultPhone">手机号</label><input name="phone" type="tel" data-i18n-placeholder="consultPhonePh" placeholder="用于接收顾问联系" required></div></div>' +
            '<div class="cf-row"><div class="cf-field"><label data-i18n="consultCompany">公司 / 团队</label><input name="company" data-i18n-placeholder="consultCompanyPh" placeholder="公司或团队名称"></div><div class="cf-field"><label data-i18n="consultWebsite">官网</label><input name="website" placeholder="www.example.com"></div></div>' +
            '<div class="cf-field"><label data-i18n="consultNeed">当前最想解决的问题</label><select name="channel"><option value="" data-i18n="consultNeedPlaceholder">请选择</option><option>官网留资率低</option><option>客服人力不足</option><option>流量来源看不清</option><option>线索跟进混乱</option><option>多站点管理</option><option>外贸多语言接待</option></select></div>' +
            '<div class="tf-note" data-i18n="consultNote">提交即表示同意我们通过电话或短信联系你。</div>' +
            '<button class="btn btn-primary btn-lg" type="submit" data-i18n="consultSubmit">提交预约</button>' +
            '<div class="s-error" style="display:none;margin-top:10px;color:#b91c1c;font-size:11.5px"></div>' +
          '</form>' +
          '<div class="consult-success"><div class="cs-icon">✓</div><h4 data-i18n="consultSuccess">预约已提交</h4><p data-i18n="consultSuccessDesc">顾问会在 1 个工作日内联系你，确认演示时间。</p><button class="btn btn-primary" type="button" data-consult-close data-i18n="consultClose">关闭</button></div>' +
        '</div>' +
      '</div>';
    document.body.appendChild(mask);
    if (window.I18N) I18N.apply(mask);
    var close = function () {
      mask.remove(); consultModal = null; document.body.classList.remove('consult-open');
      document.removeEventListener('keydown', onKey);
    };
    function onKey(e) { if (e.key === 'Escape') close(); }
    mask.addEventListener('click', function (e) { if (e.target === mask) close(); });
    mask.querySelector('.consult-close').addEventListener('click', close);
    mask.querySelector('[data-consult-close]').addEventListener('click', close);
    document.addEventListener('keydown', onKey);
    var form = mask.querySelector('#consult-form');
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var err = form.querySelector('.s-error');
      var btn = form.querySelector('button[type=submit]');
      var data = {
        name: form.name.value.trim(), phone: form.phone.value.trim(), company: form.company.value.trim(),
        website: form.website.value.trim(), channel: form.channel.value,
        utm_source: new URLSearchParams(location.search).get('utm_source') || '',
        utm_medium: new URLSearchParams(location.search).get('utm_medium') || '',
        utm_campaign: new URLSearchParams(location.search).get('utm_campaign') || ''
      };
      if (!data.name || !data.phone) { err.style.display = 'block'; err.textContent = '请填写称呼和手机号'; return; }
      if (!/^1[3-9]\d{9}$/.test(data.phone)) { err.style.display = 'block'; err.textContent = '手机号格式不正确'; return; }
      err.style.display = 'none';
      btn.disabled = true; btn.textContent = '提交中...';
      fetch('/api/public/demo-request', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) })
        .then(function (r) { return r.json().then(function (json) { if (!r.ok) throw new Error(json.error || '提交失败'); return json; }); })
        .then(function () {
          form.style.display = 'none';
          mask.querySelector('.consult-success').classList.add('show');
          toast('提交成功，顾问会尽快联系你');
        })
        .catch(function (e) { btn.disabled = false; btn.textContent = '提交预约'; err.style.display = 'block'; err.textContent = e.message; });
    });
    consultModal = { mask: mask, close: close, focus: function () { var input = mask.querySelector('input[name=name]'); if (input) input.focus(); } };
    return consultModal;
  }
  function openConsult() {
    if (signupModal) signupModal.close();
    if (!consultModal) buildConsultModal();
    document.body.classList.add('consult-open');
    consultModal.focus();
  }
  document.addEventListener('click', function (e) {
    var trigger = e.target.closest ? e.target.closest('[data-consult]') : null;
    if (!trigger) return;
    e.preventDefault();
    openConsult();
  });


  // signup modal
  var signupModal = null;
  function buildSignupModal() {
    var mask = document.createElement('div');
    mask.className = 'consult-mask signup-mask';
    mask.innerHTML =
      '<div class="consult-card signup-dialog" role="dialog" aria-modal="true" aria-labelledby="signup-title">' +
        '<button class="consult-close" type="button" aria-label="Close">&times;</button>' +
        '<aside class="consult-intro signup-intro">' +
          '<span class="kicker light" data-i18n="免费注册 · 14 天专业版试用">免费注册 · 14 天专业版试用</span>' +
          '<h3 id="signup-title" data-i18n-html="signupHero">注册一个账号<br>把<span>自己的网站</span>接进来</h3>' +
          '<p data-i18n="signupSubHero">注册只需要手机号和密码。进入后台后添加你的网站，复制一段 JS 放到自己的页面，真实访客就能看到客服挂件、行为轨迹和线索表单。</p>' +
          '<div class="trial-points"><span data-i18n="signupB1">注册只要 30 秒</span><span data-i18n="signupB2">后台添加自己的网站</span><span data-i18n="signupB3">直接跑真实场景</span></div>' +
          '<p class="signup-note" data-i18n="signupIntroNote">轻客服 SaaS · 个人网站和应用不需要复杂流程，快速接入。</p>' +
          '<a class="trial-login" href="#trial" data-consult data-i18n="signupTeamCta">需要私有化或团队版？可以预约顾问 →</a>' +
        '</aside>' +
        '<div class="consult-main">' +
          '<div class="consult-head"><h3 data-i18n="signupTitle">创建账号</h3><p data-i18n="signupSub">手机号用于登录和接收接入提醒，不会对外展示。</p></div>' +
          '<div class="signup-ref" data-ref-banner hidden>你正在通过好友邀请注册，首单付费后邀请人将获得推广奖励。</div>' +
          '<form class="consult-form signup-form" id="signup-modal-form">' +
            '<input type="hidden" name="ref">' +
            '<div class="cf-field"><label data-i18n="phone">手机号</label><div class="signup-phone-row"><input name="phone" type="tel" maxlength="11" data-i18n-placeholder="phonePlaceholder" placeholder="请输入 11 位手机号" autocomplete="tel"><button type="button" class="signup-code-btn" data-send-code data-i18n="sendCode">获取验证码</button></div><div class="signup-hint" data-code-hint></div></div>' +
            '<div class="cf-field"><label data-i18n="code">验证码</label><input name="code" type="text" maxlength="6" data-i18n-placeholder="codePlaceholder" placeholder="6 位短信验证码" inputmode="numeric" autocomplete="one-time-code"></div>' +
            '<div class="cf-field"><label data-i18n="password">设置密码</label><input name="password" type="password" minlength="6" data-i18n-placeholder="passwordPlaceholder" placeholder="至少 6 位，用于登录后台" autocomplete="new-password"></div>' +
            '<div class="signup-agree"><label><input type="checkbox" name="agree" checked> <span data-i18n="agree">我已阅读并同意</span> <a href="/privacy.html" target="_blank" data-i18n="privacy">隐私政策</a> <span data-i18n="与">与</span> <a href="/terms.html" target="_blank" data-i18n="terms">服务条款</a></label></div>' +
            '<button class="btn btn-primary btn-lg" type="submit" data-submit data-i18n="submitRegister">注册并进入后台</button>' +
            '<div class="s-error" data-error></div>' +
            '<div class="signup-login-hint"><span data-i18n="loginHint">已经有账号？</span> <a href="/admin/" data-i18n="directLogin">直接登录</a></div>' +
          '</form>' +
        '</div>' +
      '</div>';
    document.body.appendChild(mask);
    if (window.I18N) I18N.apply(mask);
    if (window.QingkeSignup) {
      window.QingkeSignup.mount(mask.querySelector('.signup-form'), {
        scope: mask,
        labels: {
          send: mask.querySelector('[data-send-code]').textContent.trim(),
          submit: mask.querySelector('[data-submit]').textContent.trim()
        }
      });
    }
    var close = function () {
      mask.remove(); signupModal = null; document.body.classList.remove('signup-open');
      document.removeEventListener('keydown', onKey);
    };
    function onKey(e) { if (e.key === 'Escape') close(); }
    mask.addEventListener('click', function (e) { if (e.target === mask) close(); });
    mask.querySelector('.consult-close').addEventListener('click', close);
    document.addEventListener('keydown', onKey);
    signupModal = { mask: mask, close: close, focus: function () { var input = mask.querySelector('input[name=phone]'); if (input) input.focus(); } };
    return signupModal;
  }
  function openSignup() {
    if (consultModal) consultModal.close();
    if (!signupModal) buildSignupModal();
    document.body.classList.add('signup-open');
    signupModal.focus();
  }
  // 带 ?signup=1 或 ?ref= 参数进入时直接弹出注册弹窗
  if (/[?&](signup=1|ref=)/.test(location.search)) openSignup();
  document.addEventListener('click', function (e) {
    var trigger = e.target.closest ? e.target.closest('[data-signup]') : null;
    if (!trigger) return;
    e.preventDefault();
    openSignup();
  });

  // anchor offset for fixed nav
  document.addEventListener('click', function (e) {
    var a = e.target.closest ? e.target.closest('a[href^="#"]') : null;
    if (!a || a.hasAttribute('data-consult')) return;
    var id = a.getAttribute('href');
    if (id.length < 2) return;
    var target = document.querySelector(id);
    if (!target) return;
    e.preventDefault();
    var y = target.getBoundingClientRect().top + window.scrollY - 76;
    window.scrollTo({ top: y, behavior: 'smooth' });
    history.replaceState(null, '', id);
  });
})();
