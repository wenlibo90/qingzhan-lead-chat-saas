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

  var code = '<script async src="' + location.origin + '/widget.js?key=YOUR_KEY"><\/script>';
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

  // trial form
  var form = document.getElementById('trial-form');
  if (form) {
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var btn = form.querySelector('button[type=submit]');
      var success = document.getElementById('trial-success');
      var data = {
        name: form.name.value.trim(),
        phone: form.phone.value.trim(),
        company: form.company.value.trim(),
        website: form.website.value.trim(),
        channel: form.channel.value
      };
      if (!data.name || !data.phone) { toast('请填写称呼和手机号'); return; }
      if (!/^1[3-9]\d{9}$/.test(data.phone)) { toast('手机号格式不正确'); return; }
      btn.disabled = true;
      btn.textContent = '提交中...';
      fetch('/api/public/demo-request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      }).then(function (r) { return r.json().then(function (d) { if (!r.ok) throw new Error(d.error || '提交失败'); return d; }); })
        .then(function (d) {
          success.className = 'tf-success show';
          success.textContent = d.message || '提交成功，我们会在 1 个工作日内联系你';
          form.querySelectorAll('input').forEach(function (i) { i.value = ''; });
          btn.disabled = false;
          btn.textContent = '已提交，等待顾问联系';
          toast('提交成功，顾问会尽快联系你');
        })
        .catch(function (err) {
          btn.disabled = false;
          btn.textContent = '提交申请';
          toast(err.message);
        });
    });
  }

  // anchor offset for fixed nav
  document.addEventListener('click', function (e) {
    var a = e.target.closest ? e.target.closest('a[href^="#"]') : null;
    if (!a) return;
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
