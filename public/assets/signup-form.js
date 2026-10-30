(function () {
  'use strict';

  function mount(form, options) {
    if (!form) return null;
    options = options || {};
    var labels = options.labels || {};
    var sendBtn = form.querySelector('[data-send-code]');
    var submitBtn = form.querySelector('[data-submit]');
    var errBox = form.querySelector('[data-error]');
    var hint = form.querySelector('[data-code-hint]');
    var refInput = form.querySelector('[name=ref]');
    var scope = options.scope || form;
    var ref = new URL(location.href).searchParams.get('ref') || '';

    var sendLabel = labels.send || (sendBtn && sendBtn.textContent.trim()) || '获取验证码';
    var submitLabel = labels.submit || (submitBtn && submitBtn.textContent.trim()) || '注册并进入后台';
    var successLabel = labels.success || '注册成功，正在进入...';

    if (ref && refInput) refInput.value = ref;
    if (ref) {
      var banner = scope.querySelector('[data-ref-banner]');
      if (banner) banner.hidden = false;
    }

    function showError(msg) {
      if (!errBox) return;
      errBox.style.display = msg ? 'block' : 'none';
      errBox.textContent = msg || '';
    }

    if (sendBtn) {
      sendBtn.addEventListener('click', function () {
        var phone = form.phone.value.trim();
        if (!/^1[3-9]\d{9}$/.test(phone)) return showError('请输入正确的手机号');
        showError('');
        sendBtn.disabled = true;
        sendBtn.textContent = labels.sending || '发送中...';
        fetch('/api/signup/send-code', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ phone: phone })
        })
          .then(function (r) { return r.json().then(function (d) { if (!r.ok) throw new Error(d.error || '发送失败'); return d; }); })
          .then(function (d) {
            if (hint) {
              hint.innerHTML = d.dev_code
                ? '演示环境验证码：<b>' + d.dev_code + '</b>（已填入，可直接使用）'
                : '验证码已发送，5 分钟内有效';
            }
            if (d.dev_code) form.code.value = d.dev_code;
            var left = 60;
            sendBtn.textContent = left + 's 后重发';
            var timer = setInterval(function () {
              left--;
              sendBtn.textContent = left + 's 后重发';
              if (left <= 0) {
                clearInterval(timer);
                sendBtn.disabled = false;
                sendBtn.textContent = labels.resend || '重新获取';
              }
            }, 1000);
          })
          .catch(function (err) {
            sendBtn.disabled = false;
            sendBtn.textContent = sendLabel;
            showError(err.message);
          });
      });
    }

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var phone = form.phone.value.trim();
      var code = form.code.value.trim();
      var password = form.password.value;
      if (!/^1[3-9]\d{9}$/.test(phone)) return showError('请输入正确的手机号');
      if (!/^\d{6}$/.test(code)) return showError('请输入 6 位验证码');
      if (password.length < 6) return showError('密码至少 6 位');
      if (!form.agree.checked) return showError('请先同意隐私政策与服务条款');
      showError('');
      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.textContent = labels.submitting || '正在注册...';
      }
      fetch('/api/signup/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone: phone,
          code: code,
          password: password,
          ref: refInput ? refInput.value.trim() : '',
          locale: window.I18N ? I18N.locale : 'zh-CN'
        })
      })
        .then(function (r) { return r.json().then(function (d) { if (!r.ok) throw new Error(d.error || '注册失败'); return d; }); })
        .then(function (d) {
          try { localStorage.setItem('qz_admin_token', d.token); } catch (e) { }
          if (submitBtn) submitBtn.textContent = successLabel;
          location.href = d.next || '/admin/#/onboarding';
        })
        .catch(function (err) {
          if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.textContent = submitLabel;
          }
          showError(err.message);
        });
    });

    return { form: form };
  }

  window.QingkeSignup = { mount: mount };
})();
