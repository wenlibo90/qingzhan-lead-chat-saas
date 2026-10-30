/* Self-serve onboarding */
(function () {
  'use strict';
  var A = window.Admin;

  A.registerPage('onboarding', {
    title: '接入向导', subtitle: '从注册到第一条会话',
    roles: ['admin', 'operator', 'agent'],
    render: function (root) {
      root.innerHTML = '<div class="page-head"><div><h1>接入向导</h1><p>添加自己的网站，安装一段 JS，然后在真实访客身上看到效果。</p></div><div class="head-actions"><button class="au-btn au-btn--ghost au-btn--sm" data-refresh>' + A.icon('refresh', 14) + ' 刷新状态</button></div></div><div id="onboarding-body">' + A.skeleton(4) + '</div>';
      root.querySelector('[data-refresh]').addEventListener('click', function () { load(root); });
      load(root);
    }
  });

  function load(root) {
    A.api('/api/onboarding/status').then(function (d) {
      var site = d.production_site;
      var trialLeft = A.trialDaysLeft();
      var stepHtml = d.steps.map(function (s, i) {
        return '<div class="step-row ' + (s.done ? 'done' : '') + '">' +
          '<span class="step-no">' + (s.done ? '✓' : i + 1) + '</span>' +
          '<div class="step-main"><b>' + A.esc(s.title) + '</b><span>' + A.esc(s.desc) + '</span></div>' +
          '<span class="step-state">' + (s.done ? '已完成' : '待完成') + '</span></div>';
      }).join('');
      var embed = site && site.embed_code ? site.embed_code : '';
      var installed = !!(site && site.installed_at);
      var action = site
        ? '<button class="au-btn au-btn--primary" data-copy>' + A.icon('copy', 14) + ' 复制接入代码</button>'
        : '<button class="au-btn au-btn--primary" data-add-site>' + A.icon('globe', 14) + ' 添加我的网站</button>';
      var codeBlock = site
        ? '<div class="code-box">' + A.esc(embed) + '</div><div class="flex gap-1 mt-2"><button class="au-btn au-btn--primary au-btn--sm" data-copy>复制代码</button><a class="au-btn au-btn--ghost au-btn--sm" href="#/sites">网站接入设置</a></div>'
        : '<div class="empty-state" style="padding:26px 16px"><div class="em-ico">' + A.icon('globe', 20) + '</div><b>先添加你的网站</b><p>添加后系统会生成 Site Key 和一段 JS。把代码放到你的网站，就能开始接收真实咨询。</p><button class="au-btn au-btn--primary au-btn--sm mt-2" data-add-site>添加网站</button></div>';
      root.querySelector('#onboarding-body').innerHTML =
        '<div class="onboard-hero">' +
          '<div class="oh-left"><span class="kicker">SELF-SERVE ONBOARDING</span><h2>你好，' + A.esc(A.state.user.name) + '</h2><p>你的工作空间「' + A.esc(A.state.tenant.name) + '」已经开通。自助客户直接在自己的网站上跑真实场景，不需要额外演示站。</p>' +
          '<div class="oh-actions">' + action + '<a class="au-btn au-btn--ghost" href="#/sites">' + A.icon('grid', 14) + ' 站点管理</a></div>' +
          (trialLeft != null ? '<div class="oh-trial">专业版试用剩余 <b>' + trialLeft + '</b> 天，到期自动降级免费版，数据保留。<a href="#/billing">查看套餐</a></div>' : '') + '</div>' +
          '<div class="oh-progress"><div class="progress-ring" style="--p:' + d.progress + '"><b>' + d.progress + '%</b><span>完成度</span></div><span class="pill ' + (d.complete ? 'green' : 'orange') + '">' + (d.complete ? '已激活' : '待激活') + '</span></div>' +
        '</div>' +
        '<div class="grid g-2-1 section-gap">' +
          '<div class="grid" style="gap:16px">' +
            '<div class="az-card"><div class="az-card-head"><h3>接入步骤</h3><div class="sub">添加网站后复制同一段 JS</div></div><div class="az-card-body">' + stepHtml + '</div></div>' +
            '<div class="az-card"><div class="az-card-head"><div><h3>把这段代码放到你的网站</h3><div class="sub">WordPress、Shopify、Vue/React 都是同一段代码</div></div><span class="pill ' + (installed ? 'green' : site ? 'gray' : 'orange') + '">' + (installed ? '已检测到安装' : site ? '等待安装' : '等待添加网站') + '</span></div><div class="az-card-body">' +
              codeBlock +
              '<div class="notice ' + (installed ? 'ok' : 'info') + ' mt-2">' + A.icon(installed ? 'check' : 'activity', 14) + '<span>' + (installed ? '已经检测到挂件在你的网站上报，安装步骤完成。' : site ? '复制代码后粘贴到网站 body 末尾，刷新页面即可被检测到。' : '添加网站后，把生成的 JS 放到真实网站，访客就能看到挂件。') + '</span></div>' +
            '</div></div>' +
          '</div>' +
          '<div class="grid" style="gap:16px;align-content:start">' +
            '<div class="az-card pad"><h4 style="margin:0 0 10px;font-size:13px">实时数据</h4>' +
              '<div class="oh-metrics"><div><b>' + d.counts.visitors + '</b><span>访客</span></div><div><b>' + d.counts.conversations + '</b><span>会话</span></div><div><b>' + d.counts.leads + '</b><span>线索</span></div></div>' +
              '<div class="divider"></div><div class="side-kv"><span>正式站点</span><b>' + (site ? A.esc(site.name) : '未添加') + '</b></div><div class="side-kv"><span>Site Key</span><b class="mono" style="font-size:10px">' + (site ? A.esc(site.site_key) : '-') + '</b></div><div class="side-kv"><span>站点数量</span><b>' + d.site_count + '</b></div>' +
            '</div>' +
            '<div class="az-card pad"><h4 style="margin:0 0 10px;font-size:13px">接下来</h4><div class="tiny muted" style="line-height:1.9">· 在「站点管理」添加更多网站<br>· 在「挂件配置」修改欢迎语和配色<br>· 在「自动化规则」配置主动弹窗<br>· 在「团队与权限」邀请客服<br>· 在「线索 CRM」查看聊天产生的线索</div><div class="flex gap-1 mt-2 wrap"><button class="au-btn au-btn--ghost au-btn--xs" onclick="Admin.go(\'sites\')">站点管理</button><button class="au-btn au-btn--ghost au-btn--xs" onclick="Admin.go(\'widget\')">挂件配置</button><button class="au-btn au-btn--ghost au-btn--xs" onclick="Admin.go(\'team\')">邀请客服</button></div></div>' +
          '</div>' +
        '</div>';
      A.$$('[data-copy]', root).forEach(function (b) { b.addEventListener('click', function () { if (embed) A.copy(embed); }); });
      A.$$('[data-add-site]', root).forEach(function (b) { b.addEventListener('click', function () { A.go('sites'); }); });
    }).catch(function (e) {
      A.handleError(e);
      root.querySelector('#onboarding-body').innerHTML = A.empty('加载失败', e.message);
    });
  }
})();
