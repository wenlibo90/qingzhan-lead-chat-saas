/* Sites, widget, forms, automation, knowledge */
(function () {
  'use strict';
  var A = window.Admin;
  var D = A.data;
  var ICONS = { chat: 'chat', headset: 'phone', message: 'mail', spark: 'star' };

  function switchHtml(on, attr) {
    return '<button class="az-switch ' + (on ? 'on' : '') + '" ' + attr + ' role="switch" aria-checked="' + !!on + '"></button>';
  }
  function bindSwitch(root, fn) {
    A.$$('.az-switch', root).forEach(function (b) {
      b.addEventListener('click', function () {
        b.classList.toggle('on');
        if (fn) fn(b, b.classList.contains('on'));
      });
    });
  }
  function needSite(root) {
    if (A.state.sites.length) return false;
    root.innerHTML = '<div class="page-head"><div><h1>站点配置</h1><p>还没有站点</p></div></div><div class="az-card pad">' + A.empty('请先创建站点', '每个站点会生成独立 JS 与独立数据空间') + '<div class="text-right mt-2"><button class="au-btn au-btn--primary" onclick="Admin.go(\'sites\')">去创建站点</button></div></div>';
    return true;
  }

  // ---------------- widget ----------------
  A.registerPage('widget', {
    title: '挂件配置', subtitle: '外观、文案与能力开关',
    roles: ['admin', 'operator'],
    feature: 'widget_basic',
    render: function (root) {
      if (needSite(root)) return;
      if (!D.widget) D.widget = { tab: 'appearance' };
      var st = D.widget;
      var site = A.currentSite();
      var tabs = [{ k: 'appearance', label: '外观与文案' }, { k: 'features', label: '能力开关' }, { k: 'announcement', label: '公告悬浮条' }, { k: 'blacklist', label: '访客黑名单' }, { k: 'embed', label: '接入代码' }];
      root.innerHTML = '<div class="page-head"><div><h1>挂件配置</h1><p>当前站点：' + A.esc(site.name) + ' · 修改后保存即刻对线上挂件生效</p></div>' +
        '<div class="head-actions"><button class="au-btn au-btn--primary au-btn--sm" data-save-widget>保存配置</button></div></div>' +
        '<div class="az-card mb-2"><div class="az-card-body tight" style="padding-bottom:0"><div class="tabs">' + tabs.map(function (t) {
          var locked = (t.k === 'announcement' && !A.can('announcement')) || (t.k === 'blacklist' && !A.can('blacklist'));
          return '<button class="' + (st.tab === t.k ? 'active' : '') + (locked ? ' locked' : '') + '" data-wtab="' + t.k + '">' + t.label + (locked ? ' · 专业版' : '') + '</button>';
        }).join('') + '</div></div></div><div id="widget-tab"></div>';
      A.$$('[data-wtab]', root).forEach(function (b) {
        b.addEventListener('click', function () {
          st.tab = b.getAttribute('data-wtab');
          if (st.tab === 'announcement' && !A.can('announcement')) return A.upgrade('announcement');
          if (st.tab === 'blacklist' && !A.can('blacklist')) return A.upgrade('blacklist');
          A.$$('[data-wtab]', root).forEach(function (x) { x.classList.remove('active'); });
          b.classList.add('active');
          renderWidgetTab(root);
        });
      });
      root.querySelector('[data-save-widget]').onclick = function () { saveWidget(root); };
      renderWidgetTab(root);
    }
  });

  function renderWidgetTab(root) {
    var tab = D.widget.tab;
    if (tab === 'appearance') return renderAppearance(root);
    if (tab === 'features') return renderFeatures(root);
    if (tab === 'announcement') return renderAnnouncementTab(root);
    if (tab === 'blacklist') return renderBlacklist(root);
    if (tab === 'embed') return renderEmbed(root);
  }

  function renderAppearance(root) {
    var site = A.currentSite();
    var cfg = site.widget_config || {};
    D.widget.cfg = JSON.parse(JSON.stringify(cfg));
    var box = root.querySelector('#widget-tab');
    box.innerHTML = '<div class="grid g-2-1"><div class="grid" style="gap:16px">' +
      '<div class="az-card"><div class="az-card-head"><h3>按钮与位置</h3><div class="sub">PC 与移动端可分别设置</div></div><div class="az-card-body"><div class="form-grid">' +
      '<div><label class="field-label">主色调</label><div class="flex gap-1 items-center"><input type="color" data-f="primaryColor" value="' + A.esc(cfg.primaryColor || '#2563eb') + '" style="width:42px;height:36px;border:none;background:none;cursor:pointer"><input class="az-input" data-f="primaryColor" value="' + A.esc(cfg.primaryColor || '#2563eb') + '" style="flex:1"></div></div>' +
      '<div><label class="field-label">按钮图标</label><select class="az-select" data-f="icon">' + [['headset', '耳机客服'], ['chat', '对话气泡'], ['message', '消息'], ['spark', '星标']].map(function (o) { return '<option value="' + o[0] + '"' + (cfg.icon === o[0] ? ' selected' : '') + '>' + o[1] + '</option>'; }).join('') + '</select></div>' +
      '<div><label class="field-label">位置</label><select class="az-select" data-f="position"><option value="right"' + (cfg.position !== 'left' ? ' selected' : '') + '>右下角</option><option value="left"' + (cfg.position === 'left' ? ' selected' : '') + '>左下角</option></select></div>' +
      '<div><label class="field-label">动画</label><select class="az-select" data-f="animation"><option value="breath"' + (cfg.animation === 'breath' ? ' selected' : '') + '>呼吸光圈</option><option value="bounce"' + (cfg.animation === 'bounce' ? ' selected' : '') + '>跳动</option><option value="none"' + (cfg.animation === 'none' ? ' selected' : '') + '>无动画</option></select></div>' +
      '<div><label class="field-label">按钮大小 <b data-v="buttonSize">' + (cfg.buttonSize || 58) + 'px</b></label><input type="range" min="44" max="76" value="' + (cfg.buttonSize || 58) + '" data-f="buttonSize" style="width:100%"></div>' +
      '<div><label class="field-label">距底部 <b data-v="offsetBottom">' + (cfg.offsetBottom || 24) + 'px</b></label><input type="range" min="8" max="100" value="' + (cfg.offsetBottom || 24) + '" data-f="offsetBottom" style="width:100%"></div>' +
      '<div><label class="field-label">移动端按钮大小</label><input class="az-input" type="number" data-m="size" value="' + ((cfg.mobile && cfg.mobile.size) || 52) + '"></div>' +
      '<div><label class="field-label">移动端距底部</label><input class="az-input" type="number" data-m="offsetBottom" value="' + ((cfg.mobile && cfg.mobile.offsetBottom) || 18) + '"></div>' +
      '</div></div></div>' +
      '<div class="az-card"><div class="az-card-head"><h3>文案</h3><div class="sub">访客第一眼看到的表达</div></div><div class="az-card-body"><div class="form-grid">' +
      '<div><label class="field-label">界面语言</label><select class="az-select" data-f="locale"><option value="zh-CN"' + (cfg.locale !== 'zh-TW' && cfg.locale !== 'en' && cfg.locale !== 'ja' && cfg.locale !== 'ko' ? ' selected' : '') + '>简体中文</option><option value="zh-TW"' + (cfg.locale === 'zh-TW' ? ' selected' : '') + '>繁體中文</option><option value="en"' + (cfg.locale === 'en' ? ' selected' : '') + '>English</option><option value="ja"' + (cfg.locale === 'ja' ? ' selected' : '') + '>日本語</option><option value="ko"' + (cfg.locale === 'ko' ? ' selected' : '') + '>한국어</option></select></div>' +
      '<div><label class="field-label">窗口标题</label><input class="az-input" data-f="title" value="' + A.esc(cfg.title || '在线客服') + '"></div>' +
      '<div><label class="field-label">客服名称</label><input class="az-input" data-f="agentName" value="' + A.esc(cfg.agentName || '客服') + '"></div>' +
      '<div class="full"><label class="field-label">欢迎语</label><textarea class="az-textarea" data-f="welcome">' + A.esc(cfg.welcome || '') + '</textarea></div>' +
      '<div><label class="field-label">状态提示</label><input class="az-input" data-f="subtitle" value="' + A.esc(cfg.subtitle || '') + '"></div>' +
      '<div><label class="field-label">工作时间</label><input class="az-input" data-f="businessHours" value="' + A.esc(cfg.businessHours || '09:00-21:00') + '"></div>' +
      '<div class="full"><label class="field-label">离线提示</label><textarea class="az-textarea" data-f="offlineText">' + A.esc(cfg.offlineText || '') + '</textarea></div>' +
      '<div class="full"><label class="field-label">快捷问题（逗号分隔，最多 6 个）</label><input class="az-input" data-f="quickReplies" value="' + A.esc((cfg.quickReplies || []).join('，')) + '"></div>' +
      '</div></div></div></div>' +
      '<div class="grid" style="gap:16px;align-content:start">' + previewHtml(cfg) + embedMini(site) + '</div></div>';
    bindPreview(root);
  }

  function previewHtml(cfg) {
    return '<div class="az-card"><div class="az-card-head"><h3>实时预览</h3><span class="tiny muted">样式实时变化</span></div><div class="az-card-body tight"><div class="widget-preview" id="wp" style="--wp-color:' + A.esc(cfg.primaryColor || '#2563eb') + '">' +
      '<div class="wp-browser"><i></i><i></i><i></i><span class="wp-url">' + A.esc(A.currentSite().domain || 'your-site.com') + '</span></div>' +
      '<div class="wp-content"><div class="wp-hero"></div><div class="wp-line" style="width:72%"></div><div class="wp-line" style="width:54%"></div><div class="wp-line" style="width:64%"></div></div>' +
      '<div class="wp-panel ' + (cfg.position === 'left' ? 'left' : '') + '"><div class="wp-panel-head">' + A.esc(cfg.title || '在线客服') + '<span>' + A.esc(cfg.subtitle || '通常 1 分钟内回复') + '</span></div><div class="wp-panel-body"><div class="wp-bubble">' + A.esc(cfg.welcome || '您好，请问有什么可以帮您？') + '</div></div><div class="wp-panel-foot"><div>输入消息...</div><div style="flex:0 0 44px;text-align:center">发送</div></div></div>' +
      '<div class="wp-launcher ' + (cfg.animation === 'breath' ? 'breath' : '') + ' ' + (cfg.position === 'left' ? 'left' : '') + '" style="width:' + (cfg.buttonSize || 58) + 'px;height:' + (cfg.buttonSize || 58) + 'px">' + A.icon(ICONS[cfg.icon] || 'phone', 22) + '</div>' +
      '</div></div></div>';
  }
  function embedMini(site) {
    return '<div class="az-card"><div class="az-card-head"><h3>接入代码</h3><button class="au-btn au-btn--ghost au-btn--xs" data-copy-embed>复制</button></div><div class="az-card-body"><div class="code-box">' + A.esc(site.embed_code) + '</div><div class="tiny muted mt-1">粘贴到网站 &lt;body&gt; 末尾即可，异步加载不阻塞首屏。</div></div></div>';
  }

  function bindPreview(root) {
    var cfg = D.widget.cfg;
    var wp = root.querySelector('#wp');
    function sync() {
      if (!wp) return;
      wp.style.setProperty('--wp-color', cfg.primaryColor || '#2563eb');
      var launcher = wp.querySelector('.wp-launcher');
      launcher.style.width = (cfg.buttonSize || 58) + 'px';
      launcher.style.height = (cfg.buttonSize || 58) + 'px';
      launcher.className = 'wp-launcher ' + (cfg.animation === 'breath' ? 'breath' : '') + ' ' + (cfg.position === 'left' ? 'left' : '');
      var panel = wp.querySelector('.wp-panel');
      panel.className = 'wp-panel ' + (cfg.position === 'left' ? 'left' : '');
      panel.querySelector('.wp-panel-head').innerHTML = A.esc(cfg.title || '在线客服') + '<span>' + A.esc(cfg.subtitle || '') + '</span>';
      panel.querySelector('.wp-bubble').textContent = cfg.welcome || '';
      launcher.innerHTML = A.icon(ICONS[cfg.icon] || 'phone', 22);
    }
    A.$$('[data-f]', root).forEach(function (input) {
      var handler = function () {
        var key = input.getAttribute('data-f');
        var val = input.value;
        if (['buttonSize', 'offsetBottom'].indexOf(key) > -1) {
          val = Number(val);
          var label = root.querySelector('[data-v="' + key + '"]');
          if (label) label.textContent = val + 'px';
          A.$$('[data-f="' + key + '"]', root).forEach(function (x) { if (x !== input) x.value = val; });
        }
        if (key === 'quickReplies') cfg.quickReplies = val.split(/[,，]/).map(function (s) { return s.trim(); }).filter(Boolean).slice(0, 6);
        else cfg[key] = val;
        sync();
      };
      input.addEventListener('input', handler);
      input.addEventListener('change', handler);
    });
    A.$$('[data-m]', root).forEach(function (input) {
      input.addEventListener('input', function () {
        cfg.mobile = cfg.mobile || {};
        cfg.mobile[input.getAttribute('data-m')] = Number(input.value) || 0;
      });
    });
    var copy = root.querySelector('[data-copy-embed]');
    if (copy) copy.addEventListener('click', function () { A.copy(A.currentSite().embed_code); });
  }

  function renderFeatures(root) {
    var site = A.currentSite();
    var cfg = site.widget_config || {};
    D.widget.cfg = JSON.parse(JSON.stringify(cfg));
    var box = root.querySelector('#widget-tab');
    A.api('/api/forms?siteId=' + site.id).then(function (fd) {
      var forms = A.can('forms') ? fd.forms : [];
      box.innerHTML = '<div class="grid g2"><div class="grid" style="gap:16px">' +
        '<div class="az-card"><div class="az-card-head"><h3>访客能力开关</h3><div class="sub">未开通的能力会自动隐藏</div></div><div class="az-card-body">' +
        switchRow('预检表单', '访客点开客服前先收集业务类型与手机号', 'prechatEnabled', !!cfg.prechatEnabled, A.can('forms')) +
        '<div style="padding:0 0 10px 0"><select class="az-select" data-f="prechatFormId">' + forms.filter(function (f) { return f.type === 'prechat' || f.type === 'lead'; }).map(function (f) { return '<option value="' + f.id + '"' + (Number(cfg.prechatFormId) === f.id ? ' selected' : '') + '>' + A.esc(f.name) + '</option>'; }).join('') + '</select></div>' +
        switchRow('自助知识库', '聊天内嵌入 FAQ 分类与资料下载', 'faqEnabled', cfg.faqEnabled !== false, A.can('knowledge')) +
        switchRow('满意度评价', '会话结束后邀请访客评价', 'ratingEnabled', cfg.ratingEnabled !== false, A.can('rating')) +
        switchRow('访客录屏', '访客一键录制当前页面发给客服', 'recordingEnabled', !!cfg.recordingEnabled, A.can('recording')) +
        switchRow('AI 接待机器人', '基于知识库自动应答，无法回答转人工', 'aiEnabled', !!cfg.aiEnabled, A.can('ai_bot')) +
        switchRow('显示平台标识', '关闭后隐藏 Powered by，企业版白标', 'showBranding', cfg.showBranding !== false, true) +
        '</div></div>' +
        '<div class="az-card"><div class="az-card-head"><h3>行为采集</h3><div class="sub">访客轨迹与来源统计</div></div><div class="az-card-body">' +
        switchRow('行为采集总开关', '关闭后不再记录页面轨迹、点击与来源（会话仍可用）', 'tracking', !!site.tracking_enabled, true) +
        '<div class="notice info mt-1">' + A.icon('shield', 14) + '<span>关闭行为采集总开关会立即生效，后台报表将停止新增轨迹数据。</span></div>' +
        '</div></div></div>' +
        '<div class="grid" style="gap:16px;align-content:start">' + previewHtml(cfg) + '<div class="az-card pad"><h4 style="margin:0 0 8px;font-size:13px">配置提示</h4><div class="tiny muted" style="line-height:1.8">· 预检表单只在首次咨询时出现，提交后写入线索<br>· 知识库内容在「知识库」页面维护<br>· AI 机器人使用同一个知识库，未命中自动转人工<br>· 移动端可单独调整按钮尺寸与位置</div></div></div></div>';
      bindSwitch(box);
      bindPreview(root);
      A.$$('[data-f]', box).forEach(function (i) {
        i.addEventListener('change', function () { D.widget.cfg[i.getAttribute('data-f')] = i.value; });
      });
    }).catch(function () {
      box.innerHTML = A.empty('加载失败');
    });
  }

  function switchRow(title, desc, key, on, licensed) {
    return '<div class="switch-row"><div><b>' + title + (licensed ? '' : ' <span class="pill gray" style="font-size:9px">' + A.featureNeeded(key === 'prechatEnabled' ? 'forms' : key === 'faqEnabled' ? 'knowledge' : key === 'recordingEnabled' ? 'recording' : key === 'aiEnabled' ? 'ai_bot' : '') + '</span>') + '</b><span>' + desc + '</span></div>' +
      (licensed ? switchHtml(on, 'data-sw="' + key + '"') : '<span class="pill gray">未开通</span>') + '</div>';
  }

  function saveWidget(root) {
    var site = A.currentSite();
    var cfg = D.widget.cfg || site.widget_config || {};
    var payload = { widget_config: cfg };
    var tracking = root.querySelector('[data-sw="tracking"]');
    if (tracking) payload.tracking_enabled = tracking.classList.contains('on');
    A.$$('[data-sw]', root).forEach(function (sw) {
      var key = sw.getAttribute('data-sw');
      var on = sw.classList.contains('on');
      if (key === 'tracking') return;
      cfg[key] = on;
    });
    payload.widget_config = cfg;
    A.apiPatch('/api/sites/' + site.id, payload).then(function (res) {
      A.toast('挂件配置已保存并生效', 'ok');
      site.widget_config = res.site.widget_config;
      site.tracking_enabled = res.site.tracking_enabled;
      site.compliance_enabled = res.site.compliance_enabled;
      A.renderSidebar();
    }).catch(A.handleError);
  }

  function renderEmbed(root) {
    var site = A.currentSite();
    var box = root.querySelector('#widget-tab');
    A.api('/api/sites/' + site.id + '/embed').then(function (d) {
      box.innerHTML = '<div class="grid g-2-1"><div class="grid" style="gap:16px">' +
        '<div class="az-card"><div class="az-card-head"><div><h3>标准接入</h3><div class="sub">粘贴到网站 &lt;head&gt; 或 &lt;body&gt; 末尾</div></div><button class="au-btn au-btn--primary au-btn--xs" data-copy>' + A.icon('copy', 12) + ' 复制代码</button></div><div class="az-card-body"><div class="code-box" id="embed-code">' + A.esc(d.embed_code) + '</div>' +
        '<div class="notice ok mt-2">' + A.icon('check', 14) + '<span>脚本异步加载，首屏仅约 4KB；挂件、聊天内核和 Socket 连接都在浏览器空闲后按需加载。</span></div></div></div>' +
        '<div class="az-card"><div class="az-card-head"><h3>各建站平台接入</h3></div><div class="az-card-body"><div class="grid" style="gap:12px">' +
        embedStep('WordPress', '外观 → 主题文件编辑器 → footer.php，在 &lt;/body&gt; 前粘贴代码。') +
        embedStep('Shopify', '在线商店 → 主题 → 编辑代码 → theme.liquid，在 &lt;/body&gt; 前粘贴。') +
        embedStep('Vue / React / Next.js', '在根布局的 body 末尾插入 script，或将代码放到 public/index.html。') +
        embedStep('微信小程序 / H5', 'H5 可直接使用；小程序请使用企业版开放 API 或 web-view。') +
        '</div></div></div>' +
        '<div class="az-card"><div class="az-card-head"><h3>接入验证</h3></div><div class="az-card-body"><div class="tiny muted" style="line-height:1.9">1. 打开网站，右下角应出现客服按钮<br>2. 点击按钮，确认欢迎语与客服在线状态<br>3. 发送一条消息，后台「会话接待」应实时收到<br>4. 在「数据概览」查看页面浏览与来源是否入库<br>5. 用广告拦截插件测试「挂件拦截」上报</div>' +
        '</div></div></div>' +
        '<div class="grid" style="gap:16px;align-content:start"><div class="az-card pad"><h4 style="margin:0 0 8px;font-size:13px">站点信息</h4>' +
        '<div class="side-kv"><span>站点名称</span><b>' + A.esc(site.name) + '</b></div><div class="side-kv"><span>绑定域名</span><b>' + A.esc(site.domain || '-') + '</b></div>' +
        '<div class="side-kv"><span>加载令牌</span><b class="mono" style="font-size:10px">' + A.esc(site.loader_token || '-') + '</b></div>' +
        '<div class="side-kv"><span>行为采集</span><b>' + (site.tracking_enabled ? '已开启' : '已关闭') + '</b></div>' +
        '<button class="au-btn au-btn--ghost au-btn--sm" style="width:100%;margin-top:10px" data-rotate>重新生成加载令牌</button></div>' +
        '<div class="az-card pad"><h4 style="margin:0 0 8px;font-size:13px">拦截说明</h4><div class="tiny muted" style="line-height:1.8">若挂件被广告拦截插件误拦，后台会记录拦截事件。建议：使用独立域名托管脚本、避免脚本文件名包含 ads/track 关键词、为拦截访客提供邮件或表单降级入口。</div></div></div></div>';
      box.querySelector('[data-copy]').onclick = function () { A.copy(d.embed_code); };
      box.querySelector('[data-rotate]').onclick = function () {
        A.confirm({ title: '重新生成加载令牌', message: '旧代码将立即失效，需要把新代码重新粘贴到网站。', danger: true, okText: '重新生成' }).then(function (ok) {
          if (!ok) return;
          A.apiPost('/api/sites/' + site.id + '/rotate-key').then(function (res) {
            A.toast('加载令牌已更新', 'ok');
            site.site_key = res.site_key;
            site.loader_token = res.loader_token;
            site.embed_code = res.embed_code;
            A.route();
          }).catch(A.handleError);
        });
      };
    }).catch(A.handleError);
  }
  function embedStep(title, desc) {
    return '<div><b style="font-size:12px">' + title + '</b><div class="tiny muted" style="line-height:1.7;margin-top:2px">' + desc + '</div></div>';
  }

  // ---------------- announcement ----------------
  function renderAnnouncementTab(root) {
    var box = root.querySelector('#widget-tab');
    A.api('/api/announcement' + A.siteQ('?')).then(function (d) {
      var a = d.announcement || {};
      box.innerHTML = '<div class="grid g-2-1"><div class="az-card"><div class="az-card-head"><h3>公告悬浮条</h3><div class="sub">同一段 JS 控制，修改后立即生效</div></div><div class="az-card-body">' +
        '<div class="form-grid"><div class="full"><label class="field-label">公告内容</label><input class="az-input" data-a="content" value="' + A.esc(a.content || '10 月限时：专业版年付立减 2 个月') + '"></div>' +
        '<div><label class="field-label">显示位置</label><select class="az-select" data-a="position"><option value="top"' + (a.position !== 'side' ? ' selected' : '') + '>页面顶部</option><option value="side"' + (a.position === 'side' ? ' selected' : '') + '>页面左下侧</option></select></div>' +
        '<div><label class="field-label">背景色</label><input class="az-input" data-a="bg_color" value="' + A.esc(a.bg_color || '#2563eb') + '"></div>' +
        '<div><label class="field-label">跳转链接</label><input class="az-input" data-a="link" value="' + A.esc(a.link || '') + '" placeholder="/pricing"></div>' +
        '<div><label class="field-label">链接文案</label><input class="az-input" data-a="link_text" value="' + A.esc(a.link_text || '查看详情') + '"></div>' +
        '<div class="full">' + switchRow('启用公告', '关闭后访客端立即隐藏', 'announcement_enabled', a.enabled !== 0, true) + '</div></div>' +
        '<button class="au-btn au-btn--primary au-btn--sm mt-2" data-save-announcement>保存公告</button></div></div>' +
        '<div class="az-card pad"><h4 style="margin:0 0 8px;font-size:13px">效果预览</h4><div class="widget-preview" style="min-height:190px"><div class="qz-announce-demo" id="ann-preview" style="background:' + A.esc(a.bg_color || '#2563eb') + ';color:#fff;padding:10px 14px;font-size:12px;display:flex;justify-content:space-between;border-radius:10px 10px 0 0"><span data-ann-text>' + A.esc(a.content || '公告内容') + '</span><span style="opacity:.8;font-weight:600" data-ann-link>' + A.esc(a.link_text || '查看详情') + '</span></div>' +
        '<div class="wp-content" style="padding-top:14px"><div class="wp-line" style="width:72%"></div><div class="wp-line" style="width:54%"></div><div class="wp-hero" style="height:60px"></div></div></div></div></div>';
      bindSwitch(box);
      A.$$('[data-a]', box).forEach(function (i) {
        i.addEventListener('input', function () {
          var p = box.querySelector('#ann-preview');
          if (i.getAttribute('data-a') === 'content') p.querySelector('[data-ann-text]').textContent = i.value;
          if (i.getAttribute('data-a') === 'bg_color') p.style.background = i.value;
          if (i.getAttribute('data-a') === 'link_text') p.querySelector('[data-ann-link]').textContent = i.value;
        });
      });
      box.querySelector('[data-save-announcement]').onclick = function () {
        var body = {};
        A.$$('[data-a]', box).forEach(function (i) { body[i.getAttribute('data-a')] = i.value; });
        var en = box.querySelector('[data-sw="announcement_enabled"]');
        body.enabled = en ? en.classList.contains('on') : true;
        A.apiPut('/api/announcement' + A.siteQ('?'), body).then(function () { A.toast('公告已保存', 'ok'); A.route(); }).catch(A.handleError);
      };
    }).catch(A.handleError);
  }

  // ---------------- blacklist ----------------
  function renderBlacklist(root) {
    var box = root.querySelector('#widget-tab');
    A.api('/api/blacklist' + A.siteQ('?')).then(function (d) {
      box.innerHTML = '<div class="grid g-2-1"><div class="az-card"><div class="az-card-head"><div><h3>访客黑名单</h3><div class="sub">命中后 JS 端直接拦截，禁止发起咨询</div></div><button class="au-btn au-btn--primary au-btn--xs" data-add-bl>' + A.icon('plus', 12) + ' 添加</button></div><div class="az-card-body flush">' +
        (d.entries.length ? '<div class="table-wrap"><table class="az-table"><thead><tr><th>类型</th><th>值</th><th>原因</th><th>添加时间</th><th></th></tr></thead><tbody>' +
          d.entries.map(function (e) {
            return '<tr><td><span class="pill ' + (e.type === 'ip' ? 'orange' : 'purple') + '">' + (e.type === 'ip' ? 'IP 地址' : '访客 ID') + '</span></td><td class="mono" style="font-size:11px">' + A.esc(e.value) + '</td><td>' + A.esc(e.reason || '-') + '</td><td class="tiny muted">' + A.fmtTime(e.created_at) + '</td><td><button class="au-btn au-btn--ghost au-btn--xs" data-del-bl="' + e.id + '">移除</button></td></tr>';
          }).join('') + '</tbody></table></div>' : A.empty('黑名单为空', '恶意刷消息或爬虫采集的 IP 可以在这里拦截')) +
        '</div></div><div class="az-card pad"><h4 style="margin:0 0 8px;font-size:13px">拦截规则</h4><div class="tiny muted" style="line-height:1.9">· IP 拦截按访客真实出口 IP 匹配<br>· 访客 ID 拦截会同步拉黑访客档案<br>· 命中黑名单时挂件不渲染，接口返回受限状态<br>· 被拦截请求会记录在操作日志中</div></div></div>';
      var add = box.querySelector('[data-add-bl]');
      add.onclick = function () {
        A.modal({
          title: '添加黑名单', body: '<div class="grid"><div><label class="field-label">类型</label><select class="az-select" data-bl="type"><option value="ip">IP 地址</option><option value="visitor">访客 ID</option></select></div><div><label class="field-label">值</label><input class="az-input" data-bl="value" placeholder="例如 203.0.113.66 或 v_xxxx"></div><div><label class="field-label">原因</label><input class="az-input" data-bl="reason" placeholder="恶意刷消息 / 爬虫采集"></div></div>',
          footer: [{ label: '取消', class: 'au-btn--ghost' }, { label: '添加', class: 'au-btn--primary', onClick: function (card, close) {
            var b = {};
            A.$$('[data-bl]', card).forEach(function (i) { b[i.getAttribute('data-bl')] = i.value.trim(); });
            if (!b.value) return A.toast('请填写值', 'err');
            A.apiPost('/api/blacklist' + A.siteQ('?'), b).then(function () { close(); A.toast('已加入黑名单', 'ok'); A.route(); }).catch(A.handleError);
          } }]
        });
      };
      A.$$('[data-del-bl]', box).forEach(function (b) {
        b.onclick = function () {
          A.apiDel('/api/blacklist/' + b.getAttribute('data-del-bl')).then(function () { A.toast('已移除', 'ok'); A.route(); }).catch(A.handleError);
        };
      });
    }).catch(A.handleError);
  }

  // ---------------- sites ----------------
  A.registerPage('sites', {
    title: '站点管理', subtitle: '多站点独立 JS 与数据隔离',
    roles: ['admin', 'operator'],
    feature: 'widget_basic',
    render: function (root) {
      var limit = A.state.plan.limits.sites;
      root.innerHTML = '<div class="page-head"><div><h1>站点管理</h1><p>一个账号管理多个业务网站，每个站点独立生成 JS、独立统计。当前 ' + A.state.sites.length + ' / ' + (limit === -1 ? '不限' : limit) + ' 个站点</p></div>' +
        '<div class="head-actions"><button class="au-btn au-btn--primary au-btn--sm" data-new-site>' + A.icon('plus', 14) + ' 添加站点</button></div></div><div class="grid g2" id="sites-grid"></div>';
      root.querySelector('[data-new-site]').onclick = openCreateSite;
      var grid = root.querySelector('#sites-grid');
      A.api('/api/sites').then(function (d) {
        if (!grid || !root.contains(grid)) return;
        if (!d.sites.length) { grid.innerHTML = '<div class="az-card pad">' + A.empty('还没有站点', '添加站点后会生成一段独立 JS 代码') + '</div>'; return; }
        grid.innerHTML = d.sites.map(function (s) {
          return '<div class="az-card"><div class="az-card-head"><div class="flex items-center gap-1"><span class="avatar-sm">' + A.icon('globe', 14) + '</span><div><h3>' + A.esc(s.name) + '</h3><div class="sub">' + A.esc(s.domain || '未绑定域名') + '</div></div></div>' +
            (String(s.id) === String(A.state.siteId) ? '<span class="pill blue">当前站点</span>' : '<button class="pill gray site-switch" data-use="' + s.id + '">切换</button>') + '</div>' +
            '<div class="az-card-body"><div class="grid g4" style="gap:8px"><div><div class="tiny muted">访客</div><b>' + s.stats.visitors + '</b></div><div><div class="tiny muted">会话</div><b>' + s.stats.conversations + '</b></div><div><div class="tiny muted">线索</div><b>' + s.stats.leads + '</b></div><div><div class="tiny muted">拦截</div><b>' + s.stats.blockedEvents + '</b></div></div>' +
            '<div class="code-box mt-2" style="font-size:10px;padding:10px 12px">' + A.esc(s.embed_code) + '</div>' +
            '<div class="flex gap-1 mt-2 wrap"><button class="au-btn au-btn--primary au-btn--xs" data-copy="' + s.id + '">复制代码</button><button class="au-btn au-btn--ghost au-btn--xs" data-use="' + s.id + '">设为当前</button>' + '<button class="au-btn au-btn--ghost au-btn--xs" data-edit-site="' + s.id + '">编辑</button><button class="au-btn au-btn--ghost au-btn--xs" data-widget="' + s.id + '">挂件配置</button>' + (A.isAdmin() ? '<button class="au-btn au-btn--ghost au-btn--xs" data-del-site="' + s.id + '" style="color:#dc2626">删除</button>' : '') + '</div>' +
            '<div class="tiny muted mt-1">加载令牌：<span class="mono">' + A.esc(s.loader_token || '-') + '</span></div></div></div>';
        }).join('');
        A.$$('[data-copy]', grid).forEach(function (b) {
          b.onclick = function () {
            var s = d.sites.filter(function (x) { return String(x.id) === b.getAttribute('data-copy'); })[0];
            A.copy(s.embed_code);
          };
        });
        A.$$('[data-use]', grid).forEach(function (b) {
          b.onclick = function () {
            A.state.siteId = b.getAttribute('data-use');
            try { localStorage.setItem('qz_admin_site', A.state.siteId); } catch (e) { }
            A.renderSidebar(); A.renderTopbar(); A.route();
          };
        });
        A.$$('[data-widget]', grid).forEach(function (b) {
          b.onclick = function () {
            A.state.siteId = b.getAttribute('data-widget');
            try { localStorage.setItem('qz_admin_site', A.state.siteId); } catch (e) { }
            A.go('widget');
          };
        });
        A.$$('[data-edit-site]', grid).forEach(function (b) {
          b.onclick = function () {
            var s = d.sites.filter(function (x) { return String(x.id) === b.getAttribute('data-edit-site'); })[0];
            A.modal({
              title: '编辑站点', body: '<div class="grid"><div><label class="field-label">站点名称</label><input class="az-input" data-s="name" value="' + A.esc(s.name) + '"></div><div><label class="field-label">绑定域名</label><input class="az-input" data-s="domain" value="' + A.esc(s.domain || '') + '" placeholder="www.example.com"></div></div>',
              footer: [{ label: '取消', class: 'au-btn--ghost' }, { label: '保存', class: 'au-btn--primary', onClick: function (card, close) {
                var body = {};
                A.$$('[data-s]', card).forEach(function (i) { body[i.getAttribute('data-s')] = i.value.trim(); });
                A.apiPatch('/api/sites/' + s.id, body).then(function () { close(); A.toast('站点已更新', 'ok'); A.boot(); }).catch(A.handleError);
              } }]
            });
          };
        });
        A.$$('[data-del-site]', grid).forEach(function (b) {
          b.onclick = function () {
            var s = d.sites.filter(function (x) { return String(x.id) === b.getAttribute('data-del-site'); })[0];
            if (!s) return;
            A.confirm({ title: '删除站点', message: '删除「' + s.name + '」后，该站点的访客、会话、线索与报表数据将一并删除，且无法恢复。', danger: true, okText: '确认删除' }).then(function (ok) {
              if (!ok) return;
              A.api('/api/sites/' + s.id, { method: 'DELETE' }).then(function () {
                if (String(A.state.siteId) === String(s.id)) {
                  A.state.siteId = '';
                  try { localStorage.removeItem('qz_admin_site'); } catch (e) { }
                }
                A.toast('站点已删除', 'ok');
                A.boot();
              }).catch(A.handleError);
            });
          };
        });
      }).catch(A.handleError);
    }
  });

  function openCreateSite() {
    A.modal({
      title: '添加站点', subtitle: '每个站点会获得独立加载令牌',
      body: '<div class="grid"><div><label class="field-label">站点名称 *</label><input class="az-input" data-s="name" placeholder="例如 官网 / 帮助中心 / 活动页"></div><div><label class="field-label">绑定域名 *</label><input class="az-input" data-s="domain" placeholder="www.example.com"></div></div>',
      footer: [{ label: '取消', class: 'au-btn--ghost' }, { label: '创建站点', class: 'au-btn--primary', onClick: function (card, close) {
        var body = {};
        A.$$('[data-s]', card).forEach(function (i) { body[i.getAttribute('data-s')] = i.value.trim(); });
        if (!body.name) return A.toast('请填写站点名称', 'err');
        if (!body.domain) return A.toast('请填写绑定域名', 'err');
        A.apiPost('/api/sites', body).then(function () {
          close(); A.toast('站点已创建', 'ok'); A.boot();
        }).catch(A.handleError);
      } }]
    });
  }

  // ---------------- forms ----------------
  A.registerPage('forms', {
    title: '表单配置', subtitle: '预检表单、触发表单与离线留言',
    roles: ['admin', 'operator'],
    feature: 'forms',
    render: function (root) {
      if (needSite(root)) return;
      if (!D.forms) D.forms = { siteId: A.currentSite().id };
      root.innerHTML = '<div class="page-head"><div><h1>表单配置</h1><p>同一套字段可被预检、触发规则与线索表单复用。</p></div><div class="head-actions"><button class="au-btn au-btn--primary au-btn--sm" data-new-form>' + A.icon('plus', 14) + ' 新建表单</button></div></div>' +
        '<div class="az-card"><div class="az-card-body flush" id="forms-body">' + A.skeleton(4) + '</div></div>';
      root.querySelector('[data-new-form]').onclick = function () { openFormEditor(null); };
      loadForms(root);
    }
  });

  function loadForms(root) {
    var box = root.querySelector('#forms-body');
    A.api('/api/forms?siteId=' + A.currentSite().id).then(function (d) {
      if (!d.forms.length) { box.innerHTML = A.empty('暂无表单', '新建一个预检表单，访客点开客服前先收集手机号'); return; }
      var typeMap = { prechat: ['blue', '预检表单'], trigger: ['purple', '触发表单'], lead: ['green', '线索表单'], offline: ['orange', '离线留言'] };
      box.innerHTML = '<div class="table-wrap"><table class="az-table"><thead><tr><th>表单</th><th>类型</th><th>字段</th><th>状态</th><th>创建时间</th><th></th></tr></thead><tbody>' +
        d.forms.map(function (f) {
          var t = typeMap[f.type] || ['gray', f.type];
          return '<tr><td><b>' + A.esc(f.name) + '</b><div class="u-sub">' + A.esc(f.title || '') + '</div></td><td><span class="pill ' + t[0] + '">' + t[1] + '</span></td><td class="tiny muted">' + (f.fields || []).map(function (x) { return A.esc(x.label); }).join(' / ') + '</td>' +
            '<td>' + (f.enabled ? '<span class="pill green">启用</span>' : '<span class="pill gray">停用</span>') + '</td><td class="tiny muted">' + A.fmtTime(f.created_at) + '</td>' +
            '<td><div class="flex gap-1"><button class="au-btn au-btn--ghost au-btn--xs" data-edit="' + f.id + '">编辑</button><button class="au-btn au-btn--ghost au-btn--xs" data-toggle="' + f.id + '">' + (f.enabled ? '停用' : '启用') + '</button>' + (f.type !== 'offline' && f.type !== 'prechat' ? '<button class="au-btn au-btn--ghost au-btn--xs" data-prechat="' + f.id + '">设为预检</button>' : '') + '</div></td></tr>';
        }).join('') + '</tbody></table></div>';
      A.$$('[data-edit]', box).forEach(function (b) { b.onclick = function () { openFormEditor(d.forms.filter(function (f) { return String(f.id) === b.getAttribute('data-edit'); })[0]); }; });
      A.$$('[data-toggle]', box).forEach(function (b) {
        b.onclick = function () {
          var f = d.forms.filter(function (x) { return String(x.id) === b.getAttribute('data-toggle'); })[0];
          A.apiPatch('/api/forms/' + f.id, { enabled: !f.enabled }).then(function () { A.toast('状态已更新', 'ok'); loadForms(root); }).catch(A.handleError);
        };
      });
      A.$$('[data-prechat]', box).forEach(function (b) {
        b.onclick = function () {
          var site = A.currentSite();
          var cfg = Object.assign({}, site.widget_config, { prechatEnabled: true, prechatFormId: Number(b.getAttribute('data-prechat')) });
          A.apiPatch('/api/sites/' + site.id, { widget_config: cfg }).then(function () { A.toast('已设为预检表单并开启', 'ok'); }).catch(A.handleError);
        };
      });
    }).catch(function (e) { A.handleError(e); box.innerHTML = A.empty('加载失败', e.message); });
  }

  function openFormEditor(form) {
    var fields = form ? form.fields : [
      { key: 'name', label: '称呼', type: 'text', required: true },
      { key: 'phone', label: '手机号', type: 'phone', required: true },
      { key: 'need', label: '想解决的问题', type: 'textarea', required: false }
    ];
    var body = '<div class="form-grid mb-2"><div><label class="field-label">表单名称</label><input class="az-input" data-form="name" value="' + A.esc(form ? form.name : '预检表单') + '"></div>' +
      '<div><label class="field-label">类型</label><select class="az-select" data-form="type">' + [['prechat', '预检表单'], ['trigger', '触发表单'], ['lead', '线索表单'], ['offline', '离线留言']].map(function (t) { return '<option value="' + t[0] + '"' + (form && form.type === t[0] ? ' selected' : '') + '>' + t[1] + '</option>'; }).join('') + '</select></div>' +
      '<div><label class="field-label">标题</label><input class="az-input" data-form="title" value="' + A.esc(form ? form.title : '先简单认识一下') + '"></div>' +
      '<div><label class="field-label">按钮文案</label><input class="az-input" data-form="button_text" value="' + A.esc(form ? form.button_text : '提交') + '"></div>' +
      '<div class="full"><label class="field-label">副标题</label><input class="az-input" data-form="subtitle" value="' + A.esc(form ? form.subtitle : '留下联系方式，我们会尽快联系你') + '"></div></div>' +
      '<div class="flex items-center justify-between mb-1"><b style="font-size:12px">字段配置</b><button class="au-btn au-btn--ghost au-btn--xs" data-add-field>' + A.icon('plus', 11) + ' 添加字段</button></div>' +
      '<div id="fields-box"></div>';
    var m = A.modal({
      title: form ? '编辑表单' : '新建表单', size: 'wide', body: body,
      footer: [{ label: '取消', class: 'au-btn--ghost' }, { label: '保存表单', class: 'au-btn--primary', onClick: function (card, close) {
        var payload = {};
        A.$$('[data-form]', card).forEach(function (i) { payload[i.getAttribute('data-form')] = i.value.trim(); });
        payload.fields = [];
        A.$$('[data-field-row]', card).forEach(function (row) {
          payload.fields.push({
            key: row.querySelector('[data-fk="key"]').value.trim(),
            label: row.querySelector('[data-fk="label"]').value.trim(),
            type: row.querySelector('[data-fk="type"]').value,
            required: row.querySelector('[data-fk="required"]').checked,
            placeholder: row.querySelector('[data-fk="placeholder"]').value.trim(),
            options: row.querySelector('[data-fk="options"]').value.split(/[,，]/).map(function (s) { return s.trim(); }).filter(Boolean)
          });
        });
        if (!payload.name) return A.toast('请填写表单名称', 'err');
        if (!payload.fields.length) return A.toast('至少配置一个字段', 'err');
        payload.siteId = A.currentSite().id;
        var p = form ? A.apiPatch('/api/forms/' + form.id, payload) : A.apiPost('/api/forms', payload);
        p.then(function () { close(); A.toast('表单已保存', 'ok'); A.route(); }).catch(A.handleError);
      } }],
      onOpen: function (card) { renderFieldRows(card, fields); }
    });
  }

  function renderFieldRows(card, fields) {
    var box = card.querySelector('#fields-box');
    box.innerHTML = fields.map(function (f, i) {
      return '<div class="flex gap-1 items-center" data-field-row style="margin-bottom:7px;padding:8px;border:1px solid rgba(148,163,184,.2);border-radius:9px;background:rgba(248,250,252,.6)">' +
        '<input class="az-input" data-fk="label" value="' + A.esc(f.label) + '" placeholder="字段名称" style="width:100px">' +
        '<input class="az-input" data-fk="key" value="' + A.esc(f.key) + '" placeholder="key" style="width:90px">' +
        '<select class="az-select" data-fk="type" style="width:100px">' + [['text', '文本'], ['phone', '手机号'], ['email', '邮箱'], ['textarea', '多行文本'], ['select', '下拉选择']].map(function (t) { return '<option value="' + t[0] + '"' + (f.type === t[0] ? ' selected' : '') + '>' + t[1] + '</option>'; }).join('') + '</select>' +
        '<input class="az-input" data-fk="placeholder" value="' + A.esc(f.placeholder || '') + '" placeholder="占位提示" style="flex:1">' +
        '<input class="az-input" data-fk="options" value="' + A.esc((f.options || []).join(',')) + '" placeholder="选项,逗号分隔" style="width:120px">' +
        '<label class="tiny muted flex items-center gap-1" style="white-space:nowrap"><input type="checkbox" data-fk="required"' + (f.required ? ' checked' : '') + '> 必填</label>' +
        '<button class="au-btn au-btn--ghost au-btn--xs" data-del-field>' + A.icon('trash', 11) + '</button></div>';
    }).join('');
    A.$$('[data-del-field]', box).forEach(function (b) {
      b.onclick = function () { b.closest('[data-field-row]').remove(); };
    });
  }

  // ---------------- automation ----------------
  A.registerPage('automation', {
    title: '自动化规则', subtitle: '触发弹窗、关键词应答与敏感词过滤',
    roles: ['admin', 'operator'],
    feature: 'triggers',
    render: function (root) {
      if (needSite(root)) return;
      if (!D.auto) D.auto = { tab: 'trigger' };
      var st = D.auto;
      root.innerHTML = '<div class="page-head"><div><h1>自动化规则</h1><p>可视化配置触发条件与动作，优先级支持拖拽调整。</p></div><div class="head-actions"><button class="au-btn au-btn--primary au-btn--sm" data-add-rule>' + A.icon('plus', 14) + ' 新建规则</button></div></div>' +
        '<div class="az-card"><div class="az-card-body tight" style="padding-bottom:0"><div class="tabs"><button class="' + (st.tab === 'trigger' ? 'active' : '') + '" data-atab="trigger">触发弹窗</button><button class="' + (st.tab === 'keyword' ? 'active' : '') + '" data-atab="keyword">关键词应答</button><button class="' + (st.tab === 'sensitive' ? 'active' : '') + '" data-atab="sensitive">敏感词过滤</button></div></div><div class="az-card-body" id="rules-body">' + A.skeleton(3) + '</div></div>';
      A.$$('[data-atab]', root).forEach(function (b) {
        b.addEventListener('click', function () {
          st.tab = b.getAttribute('data-atab');
          A.$$('[data-atab]', root).forEach(function (x) { x.classList.remove('active'); });
          b.classList.add('active');
          loadRules(root);
        });
      });
      root.querySelector('[data-add-rule]').onclick = function () { openRuleEditor(null, st.tab); };
      loadRules(root);
    }
  });

  function loadRules(root) {
    var tab = D.auto.tab;
    var box = root.querySelector('#rules-body');
    var needFeature = tab === 'trigger' ? 'triggers' : tab === 'keyword' ? 'keyword_reply' : 'automation';
    if (!A.can(needFeature)) {
      box.innerHTML = '<div class="locked-card"><div class="lock-ov"><span class="lk-ico">' + A.icon('lock', 20) + '</span><h4>' + ({ trigger: '触发弹窗', keyword: '关键词应答', sensitive: '敏感词过滤' })[tab] + ' 未解锁</h4><p>' + (tab === 'sensitive' ? '敏感词过滤属于专业版自动化规则引擎能力。' : '升级' + A.featureNeeded(needFeature) + '后即可配置。') + '</p><button class="au-btn au-btn--primary" onclick="Admin.upgrade(\'' + needFeature + '\')">升级套餐</button></div></div>';
      return;
    }
    A.api('/api/rules' + A.siteQ('?')).then(function (d) {
      var rules = d.rules.filter(function (r) { return r.type === tab; });
      if (!rules.length) { box.innerHTML = A.empty('暂无' + ({ trigger: '触发规则', keyword: '关键词规则', sensitive: '敏感词规则' })[tab], '点击右上角新建规则'); return; }
      box.innerHTML = '<div class="grid g2">' + rules.map(function (r) {
        var cond = r.conditions || {};
        var act = r.actions || {};
        var desc = '';
        if (tab === 'trigger') {
          var parts = [];
          if (cond.pageMatch) parts.push('页面含 ' + cond.pageMatch);
          if (cond.dwell) parts.push('停留 ' + cond.dwell + 's');
          if (cond.scrollDepth) parts.push('滚动 ' + cond.scrollDepth + '%');
          if (cond.idle) parts.push('无操作 ' + cond.idle + 's');
          if (cond.exitIntent) parts.push('退出意图');
          if (cond.device && cond.device !== 'all') parts.push(cond.device === 'desktop' ? 'PC' : '移动端');
          if (cond.visitorType && cond.visitorType !== 'all') parts.push(cond.visitorType === 'new' ? '新访客' : '回访访客');
          desc = parts.join(' · ') || '满足任一访问条件';
        } else if (tab === 'keyword') desc = '关键词：' + (cond.keywords || []).join(' / ');
        else desc = '拦截词：' + (cond.words || []).join(' / ');
        var actionLabel = ({ greeting: '问候气泡', message: '自定义消息', form: '线索表单', faq: 'FAQ 面板', announcement: '活动公告' })[act.type] || act.type || '消息';
        var ruleDetail = tab === 'trigger'
          ? '动作：' + actionLabel + ' · 已触发 ' + r.triggered_count + ' 次' + (act.title ? ' · 「' + A.esc(act.title) + '」' : '')
          : tab === 'keyword'
            ? '自动回复：' + A.esc(A.clip(act.reply || '', 80))
            : '动作：拦截消息并提示访客 · 已拦截 ' + r.triggered_count + ' 次';
        return '<div class="az-card" draggable="true" data-rule="' + r.id + '"><div class="az-card-head"><div class="flex items-center gap-1"><span style="cursor:grab;color:#94a3b8">' + A.icon('grid', 14) + '</span><div><h3>' + A.esc(r.name) + '</h3><div class="sub">' + A.esc(desc) + '</div></div></div>' +
          '<div class="flex items-center gap-1">' + switchHtml(!!r.enabled, 'data-rule-sw="' + r.id + '"') + '</div></div>' +
          '<div class="az-card-body" style="padding:13px 16px"><div class="tiny muted" style="line-height:1.7">' + ruleDetail +
          '</div><div class="flex gap-1 mt-2"><button class="au-btn au-btn--ghost au-btn--xs" data-edit-rule="' + r.id + '">编辑</button><button class="au-btn au-btn--ghost au-btn--xs" data-del-rule="' + r.id + '">删除</button><span class="tiny muted" style="margin-left:auto">优先级 ' + r.priority + '</span></div></div></div>';
      }).join('') + '</div>';
      bindSwitch(box, function (sw) {
        var id = sw.getAttribute('data-rule-sw');
        A.apiPatch('/api/rules/' + id, { enabled: sw.classList.contains('on') }).then(function () { A.toast('规则状态已更新', 'ok'); }).catch(A.handleError);
      });
      A.$$('[data-edit-rule]', box).forEach(function (b) { b.onclick = function () { openRuleEditor(rules.filter(function (r) { return String(r.id) === b.getAttribute('data-edit-rule'); })[0], tab); }; });
      A.$$('[data-del-rule]', box).forEach(function (b) {
        b.onclick = function () {
          A.confirm({ title: '删除规则', message: '删除后不可恢复，确定继续？', danger: true }).then(function (ok) {
            if (!ok) return;
            A.apiDel('/api/rules/' + b.getAttribute('data-del-rule')).then(function () { A.toast('规则已删除', 'ok'); loadRules(root); }).catch(A.handleError);
          });
        };
      });
      // drag reorder priority
      var dragId = null;
      A.$$('[data-rule]', box).forEach(function (card) {
        card.addEventListener('dragstart', function () { dragId = card.getAttribute('data-rule'); card.style.opacity = '.45'; });
        card.addEventListener('dragend', function () { card.style.opacity = '1'; });
        card.addEventListener('dragover', function (e) { e.preventDefault(); });
        card.addEventListener('drop', function (e) {
          e.preventDefault();
          var targetId = card.getAttribute('data-rule');
          if (!dragId || dragId === targetId) return;
          var order = rules.map(function (r) { return r.id; });
          var from = order.indexOf(Number(dragId));
          var to = order.indexOf(Number(targetId));
          order.splice(to, 0, order.splice(from, 1)[0]);
          Promise.all(order.map(function (id, i) { return A.apiPatch('/api/rules/' + id, { priority: i + 1 }); })).then(function () { A.toast('优先级已调整', 'ok'); loadRules(root); }).catch(A.handleError);
        });
      });
    }).catch(function (e) { A.handleError(e); box.innerHTML = A.empty('加载失败', e.message); });
  }

  function openRuleEditor(rule, type) {
    var isNew = !rule;
    var cond = rule ? rule.conditions : {};
    var act = rule ? rule.actions : {};
    var body = '';
    if (type === 'trigger') {
      body = '<div class="form-grid"><div class="full"><label class="field-label">规则名称</label><input class="az-input" data-r="name" value="' + A.esc(rule ? rule.name : '价格页停留弹演示表单') + '"></div>' +
        '<div><label class="field-label">页面匹配（留空为全站）</label><input class="az-input" data-c="pageMatch" value="' + A.esc(cond.pageMatch || '') + '" placeholder="/pricing"></div>' +
        '<div><label class="field-label">匹配方式</label><select class="az-select" data-c="pageMatchType"><option value="contains"' + (cond.pageMatchType !== 'exact' ? ' selected' : '') + '>包含</option><option value="exact"' + (cond.pageMatchType === 'exact' ? ' selected' : '') + '>完全一致</option></select></div>' +
        '<div><label class="field-label">停留时长（秒）</label><input class="az-input" type="number" data-c="dwell" value="' + (cond.dwell || 0) + '"></div>' +
        '<div><label class="field-label">滚动深度（%）</label><input class="az-input" type="number" data-c="scrollDepth" value="' + (cond.scrollDepth || 0) + '"></div>' +
        '<div><label class="field-label">无操作时长（秒）</label><input class="az-input" type="number" data-c="idle" value="' + (cond.idle || 0) + '"></div>' +
        '<div><label class="field-label">设备</label><select class="az-select" data-c="device"><option value="all"' + (cond.device === 'all' || !cond.device ? ' selected' : '') + '>全部设备</option><option value="desktop"' + (cond.device === 'desktop' ? ' selected' : '') + '>仅 PC</option><option value="mobile"' + (cond.device === 'mobile' ? ' selected' : '') + '>仅移动端</option></select></div>' +
        '<div><label class="field-label">访客类型</label><select class="az-select" data-c="visitorType"><option value="all"' + (cond.visitorType === 'all' || !cond.visitorType ? ' selected' : '') + '>全部访客</option><option value="new"' + (cond.visitorType === 'new' ? ' selected' : '') + '>新访客</option><option value="returning"' + (cond.visitorType === 'returning' ? ' selected' : '') + '>回访访客</option></select></div>' +
        '<div><label class="field-label">退出意图</label><select class="az-select" data-c="exitIntent"><option value="0"' + (!cond.exitIntent ? ' selected' : '') + '>不启用</option><option value="1"' + (cond.exitIntent ? ' selected' : '') + '>鼠标移出视口时触发</option></select></div>' +
        '<div><label class="field-label">动作类型</label><select class="az-select" data-a="type">' + [['greeting', '问候气泡'], ['message', '自定义消息'], ['form', '线索表单'], ['announcement', '活动公告']].map(function (t) { return '<option value="' + t[0] + '"' + (act.type === t[0] ? ' selected' : '') + '>' + t[1] + '</option>'; }).join('') + '</select></div>' +
        '<div><label class="field-label">弹窗标题</label><input class="az-input" data-a="title" value="' + A.esc(act.title || '') + '"></div>' +
        '<div class="full"><label class="field-label">弹窗内容</label><textarea class="az-textarea" data-a="message">' + A.esc(act.message || '') + '</textarea></div>' +
        '<div><label class="field-label">表单 ID（类型为表单时）</label><input class="az-input" type="number" data-a="formId" value="' + (act.formId || '') + '"></div>' +
        '<div><label class="field-label">延迟展示（秒）</label><input class="az-input" type="number" data-a="delay" value="' + (act.delay || 0) + '"></div></div>';
    } else if (type === 'keyword') {
      body = '<div class="grid"><div><label class="field-label">规则名称</label><input class="az-input" data-r="name" value="' + A.esc(rule ? rule.name : '关键词：价格') + '"></div>' +
        '<div><label class="field-label">触发关键词（逗号分隔）</label><input class="az-input" data-c="keywords" value="' + A.esc((cond.keywords || []).join('，')) + '" placeholder="价格，多少钱，费用"></div>' +
        '<div><label class="field-label">自动回复内容</label><textarea class="az-textarea" data-a="reply" style="min-height:110px">' + A.esc(act.reply || '') + '</textarea></div><div class="notice info">关键词命中后自动回复，同一访客同一规则只回复一次。</div></div>';
    } else {
      body = '<div class="grid"><div><label class="field-label">规则名称</label><input class="az-input" data-r="name" value="' + A.esc(rule ? rule.name : '敏感词过滤') + '"></div>' +
        '<div><label class="field-label">敏感词（逗号分隔）</label><input class="az-input" data-c="words" value="' + A.esc((cond.words || []).join('，')) + '"></div>' +
        '<div><label class="field-label">拦截提示</label><input class="az-input" data-a="notice" value="' + A.esc(act.notice || '消息包含不适宜内容，已被拦截。') + '"></div><div class="notice warn">命中后消息不会发送，访客会看到拦截提示，记录计入规则统计。</div></div>';
    }
    A.modal({
      title: (isNew ? '新建' : '编辑') + ({ trigger: '触发规则', keyword: '关键词规则', sensitive: '敏感词规则' })[type],
      subtitle: type === 'trigger' ? '支持页面、停留、滚动、无操作、退出意图、设备与访客类型组合条件' : '',
      size: 'wide', body: body,
      footer: [{ label: '取消', class: 'au-btn--ghost' }, { label: '保存规则', class: 'au-btn--primary', onClick: function (card, close) {
        var payload = { type: type, siteId: A.currentSite().id };
        var nameInput = card.querySelector('[data-r="name"]');
        payload.name = nameInput ? nameInput.value.trim() : '';
        var conditions = {};
        A.$$('[data-c]', card).forEach(function (i) {
          var k = i.getAttribute('data-c');
          if (k === 'keywords' || k === 'words') conditions[k] = i.value.split(/[,，]/).map(function (s) { return s.trim(); }).filter(Boolean);
          else if (k === 'exitIntent') conditions[k] = i.value === '1';
          else if (['dwell', 'scrollDepth', 'idle'].indexOf(k) > -1) conditions[k] = Number(i.value) || 0;
          else conditions[k] = i.value;
        });
        var actions = {};
        A.$$('[data-a]', card).forEach(function (i) {
          var k = i.getAttribute('data-a');
          if (k === 'formId' || k === 'delay') actions[k] = Number(i.value) || 0;
          else actions[k] = i.value;
        });
        payload.conditions = conditions;
        payload.actions = actions;
        if (!payload.name) return A.toast('请填写规则名称', 'err');
        (rule ? A.apiPatch('/api/rules/' + rule.id, payload) : A.apiPost('/api/rules', payload)).then(function () {
          close(); A.toast('规则已保存', 'ok'); A.route();
        }).catch(A.handleError);
      } }]
    });
  }

  // ---------------- knowledge ----------------
  A.registerPage('knowledge', {
    title: '知识库', subtitle: 'FAQ 与资料下载，同步访客自助面板',
    roles: ['admin', 'operator'],
    feature: 'knowledge',
    render: function (root) {
      if (needSite(root)) return;
      root.innerHTML = '<div class="page-head"><div><h1>知识库</h1><p>聊天内自助面板与 AI 机器人共用同一套知识库。</p></div><div class="head-actions"><button class="au-btn au-btn--ghost au-btn--sm" data-add-cat>' + A.icon('plus', 14) + ' 新建分类</button><button class="au-btn au-btn--primary au-btn--sm" data-add-faq>' + A.icon('plus', 14) + ' 新增 FAQ</button></div></div><div id="kb-body">' + A.skeleton(4) + '</div>';
      root.querySelector('[data-add-cat]').onclick = function () { createCategory(root); };
      root.querySelector('[data-add-faq]').onclick = function () { editFaq(root, null); };
      loadKnowledge(root);
    }
  });

  function loadKnowledge(root) {
    var box = root.querySelector('#kb-body');
    A.api('/api/faqs' + A.siteQ('?')).then(function (d) {
      var cats = d.categories;
      var faqs = d.faqs;
      var files = d.files;
      box.innerHTML = '<div class="grid g-2-1"><div class="grid" style="gap:16px">' +
        '<div class="az-card"><div class="az-card-head"><div><h3>FAQ 列表</h3><div class="sub">' + faqs.length + ' 条 · 访客端阅读 ' + faqs.reduce(function (s, f) { return s + f.views; }, 0) + ' 次</div></div></div><div class="az-card-body flush">' +
        (faqs.length ? '<div class="table-wrap"><table class="az-table"><thead><tr><th>问题</th><th>分类</th><th>阅读</th><th>状态</th><th></th></tr></thead><tbody>' + faqs.map(function (f) {
          var cat = cats.filter(function (c) { return c.id === f.category_id; })[0];
          return '<tr><td><b style="font-size:12px">' + A.esc(f.question) + '</b><div class="u-sub">' + A.esc(A.clip(f.answer, 52)) + '</div></td><td>' + A.esc(cat ? cat.name : '未分类') + '</td><td>' + f.views + '</td><td>' + (f.enabled ? '<span class="pill green">启用</span>' : '<span class="pill gray">停用</span>') + '</td><td><div class="flex gap-1"><button class="au-btn au-btn--ghost au-btn--xs" data-edit-faq="' + f.id + '">编辑</button><button class="au-btn au-btn--ghost au-btn--xs" data-del-faq="' + f.id + '">删除</button></div></td></tr>';
        }).join('') + '</tbody></table></div>' : A.empty('暂无 FAQ', '新增一条常见问题，访客端立即可见')) + '</div></div>' +
        '<div class="az-card"><div class="az-card-head"><div><h3>资料下载</h3><div class="sub">图片 / PDF 等附件</div></div><button class="au-btn au-btn--ghost au-btn--xs" data-upload-file>' + A.icon('upload', 12) + ' 上传</button></div><div class="az-card-body">' +
        (files.length ? files.map(function (f) {
          return '<div class="recording-link"><span class="r-ico" style="background:rgba(37,99,235,.1);color:#2563eb">' + A.icon('file', 13) + '</span><span style="flex:1"><b style="font-size:11.5px">' + A.esc(f.name) + '</b><span class="tiny muted">' + Math.round((f.size || 0) / 1024) + 'KB</span></span><button class="au-btn au-btn--ghost au-btn--xs" data-del-file="' + f.id + '">删除</button></div>';
        }).join('') : '<div class="tiny muted">暂无附件资料</div>') + '</div></div></div>' +
        '<div class="grid" style="gap:16px;align-content:start"><div class="az-card"><div class="az-card-head"><h3>分类</h3></div><div class="az-card-body">' +
        (cats.length ? cats.map(function (c) {
          var count = faqs.filter(function (f) { return f.category_id === c.id; }).length;
          return '<div class="flex items-center justify-between" style="padding:7px 0;border-bottom:1px dashed rgba(148,163,184,.18)"><div><b style="font-size:12px">' + A.esc(c.name) + '</b><div class="tiny muted">' + count + ' 条 FAQ</div></div><button class="au-btn au-btn--ghost au-btn--xs" data-del-cat="' + c.id + '">删除</button></div>';
        }).join('') : '<div class="tiny muted">暂无分类</div>') + '</div></div>' +
        '<div class="az-card pad"><h4 style="margin:0 0 8px;font-size:13px">知识库建议</h4><div class="tiny muted" style="line-height:1.9">· 优先覆盖价格、接入、售后三类高频问题<br>· 答案保持 80-200 字，先给结论再解释<br>· AI 机器人按问题相似度命中知识库<br>· 附件会出现在访客「资料下载」分组</div></div></div></div>';
      A.$$('[data-edit-faq]', box).forEach(function (b) { b.onclick = function () { editFaq(root, faqs.filter(function (f) { return String(f.id) === b.getAttribute('data-edit-faq'); })[0]); }; });
      A.$$('[data-del-faq]', box).forEach(function (b) {
        b.onclick = function () {
          A.confirm({ title: '删除 FAQ', message: '删除后访客端立即不可见。', danger: true }).then(function (ok) {
            if (!ok) return;
            A.apiDel('/api/faqs/' + b.getAttribute('data-del-faq')).then(function () { A.toast('已删除', 'ok'); loadKnowledge(root); }).catch(A.handleError);
          });
        };
      });
      A.$$('[data-del-cat]', box).forEach(function (b) {
        b.onclick = function () { A.apiDel('/api/faq-categories/' + b.getAttribute('data-del-cat')).then(function () { A.toast('分类已删除', 'ok'); loadKnowledge(root); }).catch(A.handleError); };
      });
      A.$$('[data-del-file]', box).forEach(function (b) {
        b.onclick = function () { A.apiDel('/api/knowledge-files/' + b.getAttribute('data-del-file')).then(function () { A.toast('文件已删除', 'ok'); loadKnowledge(root); }).catch(A.handleError); };
      });
      var up = box.querySelector('[data-upload-file]');
      if (up) up.onclick = function () {
        var input = document.createElement('input');
        input.type = 'file';
        input.accept = '.pdf,.png,.jpg,.jpeg,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.zip';
        input.onchange = function () {
          var f = input.files[0];
          if (!f) return;
          var fd = new FormData();
          fd.append('file', f);
          fd.append('name', f.name);
          A.api('/api/knowledge-files?siteId=' + A.currentSite().id, { method: 'POST', body: fd }).then(function () { A.toast('文件已上传', 'ok'); loadKnowledge(root); }).catch(A.handleError);
        };
        input.click();
      };
    }).catch(function (e) { A.handleError(e); box.innerHTML = A.empty('加载失败', e.message); });
  }

  function createCategory(root) {
    A.prompt({ title: '新建分类', label: '分类名称' }).then(function (name) {
      if (!name) return;
      A.apiPost('/api/faq-categories?siteId=' + A.currentSite().id, { name: name }).then(function () { A.toast('分类已创建', 'ok'); loadKnowledge(root); }).catch(A.handleError);
    });
  }

  function editFaq(root, faq) {
    A.api('/api/faqs' + A.siteQ('?')).then(function (d) {
      A.modal({
        title: faq ? '编辑 FAQ' : '新增 FAQ', size: 'wide',
        body: '<div class="grid"><div class="form-grid"><div><label class="field-label">分类</label><select class="az-select" data-faq="categoryId"><option value="">未分类</option>' + d.categories.map(function (c) { return '<option value="' + c.id + '"' + (faq && faq.category_id === c.id ? ' selected' : '') + '>' + A.esc(c.name) + '</option>'; }).join('') + '</select></div>' +
          '<div><label class="field-label">状态</label><select class="az-select" data-faq="enabled"><option value="1"' + (!faq || faq.enabled ? ' selected' : '') + '>启用</option><option value="0"' + (faq && !faq.enabled ? ' selected' : '') + '>停用</option></select></div></div>' +
          '<div><label class="field-label">问题</label><input class="az-input" data-faq="question" value="' + A.esc(faq ? faq.question : '') + '"></div>' +
          '<div><label class="field-label">答案</label><textarea class="az-textarea" data-faq="answer" style="min-height:150px">' + A.esc(faq ? faq.answer : '') + '</textarea></div></div>',
        footer: [{ label: '取消', class: 'au-btn--ghost' }, { label: '保存', class: 'au-btn--primary', onClick: function (card, close) {
          var b = {};
          A.$$('[data-faq]', card).forEach(function (i) {
            b[i.getAttribute('data-faq')] = i.getAttribute('data-faq') === 'enabled' ? i.value === '1' : i.value.trim();
          });
          if (!b.question || !b.answer) return A.toast('问题和答案不能为空', 'err');
          var p = faq ? A.apiPatch('/api/faqs/' + faq.id, b) : A.apiPost('/api/faqs', Object.assign({ siteId: A.currentSite().id }, b));
          p.then(function () { close(); A.toast('FAQ 已保存', 'ok'); loadKnowledge(root); }).catch(A.handleError);
        } }]
      });
    }).catch(A.handleError);
  }
})();
