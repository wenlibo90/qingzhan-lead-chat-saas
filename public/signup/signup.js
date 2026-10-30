(function () {
  'use strict';
  var form = document.getElementById('signup-form');
  function $(sel) { return document.querySelector(sel); }
  function showError(msg) {
    var box = $('#form-error');
    box.style.display = msg ? 'block' : 'none';
    box.textContent = msg || '';
  }
  $('#send-code').addEventListener('click', function () {
    var phone = form.phone.value.trim();
    var btn = this;
    if (!/^1[3-9]\d{9}$/.test(phone)) return showError('请输入正确的手机号');
    showError('');
    btn.disabled = true;
    btn.textContent = '发送中...';
    fetch('/api/signup/send-code', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ phone: phone }) })
      .then(function (r) { return r.json().then(function (d) { if (!r.ok) throw new Error(d.error || '发送失败'); return d; }); })
      .then(function (d) {
        var hint = $('#code-hint');
        hint.innerHTML = d.dev_code ? '演示环境验证码：<b>' + d.dev_code + '</b>（已填入，可直接使用）' : '验证码已发送，5 分钟内有效';
        if (d.dev_code) form.code.value = d.dev_code;
        var left = 60;
        btn.textContent = left + 's 后重发';
        var timer = setInterval(function () {
          left--;
          btn.textContent = left + 's 后重发';
          if (left <= 0) { clearInterval(timer); btn.disabled = false; btn.textContent = '重新获取'; }
        }, 1000);
      })
      .catch(function (err) { btn.disabled = false; btn.textContent = '获取验证码'; showError(err.message); });
  });

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    var btn = $('#submit-btn');
    var phone = form.phone.value.trim();
    var code = form.code.value.trim();
    var password = form.password.value;
    if (!/^1[3-9]\d{9}$/.test(phone)) return showError('请输入正确的手机号');
    if (!/^\d{6}$/.test(code)) return showError('请输入 6 位验证码');
    if (password.length < 6) return showError('密码至少 6 位');
    if (!form.agree.checked) return showError('请先同意隐私政策与服务条款');
    showError('');
    btn.disabled = true;
    btn.textContent = '正在注册...';
    fetch('/api/signup/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone: phone, code: code, password: password })
    }).then(function (r) { return r.json().then(function (d) { if (!r.ok) throw new Error(d.error || '注册失败'); return d; }); })
      .then(function (d) {
        try { localStorage.setItem('qz_admin_token', d.token); } catch (e) { }
        btn.textContent = '注册成功，正在进入...';
        location.href = d.next || '/admin/#/onboarding';
      })
      .catch(function (err) {
        btn.disabled = false;
        btn.textContent = '注册并进入后台';
        showError(err.message);
      });
  });
})();
