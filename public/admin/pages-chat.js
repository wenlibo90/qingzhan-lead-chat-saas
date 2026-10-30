/* Conversation center */
(function () {
  'use strict';
  var A = window.Admin;
  var CH = { root: null, convs: [], activeId: null, detail: null, filter: 'all', q: '', mode: 'reply', handlers: [], typingTimer: null, openId: null, mobileChat: false };

  function cleanup() {
    var s = A.state.socket;
    if (s) CH.handlers.forEach(function (h) { s.off(h[0], h[1]); });
    CH.handlers = [];
    clearTimeout(CH.typingTimer);
    CH.root = null;
  }

  function on(event, fn) {
    var s = A.state.socket;
    if (!s) return;
    s.on(event, fn);
    CH.handlers.push([event, fn]);
  }

  A.registerPage('conversations', {
    title: '会话接待', subtitle: '实时对话、抢单、转接与内部备注',
    roles: ['admin', 'operator', 'agent'],
    feature: 'chat',
    destroy: cleanup,
    render: function (root, ctx) {
      cleanup();
      CH.root = root;
      CH.mobileChat = false;
      root.innerHTML = '<div class="page-head"><div><h1>会话接待</h1><p>访客消息通过 WebSocket 实时到达，未分配会话可抢单接入。</p></div>' +
        '<div class="head-actions"><span class="pill green"><span class="dot-status green"></span> 实时连接</span>' +
        '<button class="au-btn au-btn--ghost au-btn--sm" data-refresh-list>' + A.icon('refresh', 14) + ' 刷新</button></div></div>' +
        '<div class="chat-shell">' +
        '<div class="chat-col chat-list-col" id="conv-list-col">' +
        '<div class="chat-list-head"><div class="filters"><input class="au-input" data-search placeholder="搜索访客、手机号、会话号" style="width:100%"></div>' +
        '<div class="chat-tabs">' +
        '<button class="active" data-filter="all">全部<span data-cnt="all"></span></button>' +
        '<button data-filter="pending">待接入<span data-cnt="pending"></span></button>' +
        '<button data-filter="open">进行中<span data-cnt="open"></span></button>' +
        '<button data-filter="closed">已结束<span data-cnt="closed"></span></button>' +
        '</div></div><div class="chat-list" id="conv-list">' + A.skeleton(5) + '</div></div>' +
        '<div class="chat-col chat-main-col" id="conv-main"><div class="chat-empty">' + A.icon('chat', 40) + '<b>选择一个会话开始接待</b>从左侧列表进入会话，支持抢单、转接和内部备注</div></div>' +
        '<div class="chat-col chat-side" id="conv-side"><div class="side-block"><h4>访客信息</h4><div class="tiny muted">选择会话后展示访客档案、页面轨迹与线索信息。</div></div></div>' +
        '</div>';

      root.querySelector('[data-search]').addEventListener('input', debounce(function (e) {
        CH.q = e.target.value.trim();
        loadList(root);
      }, 300));
      root.querySelector('[data-refresh-list]').addEventListener('click', function () { loadList(root); });
      A.$$('[data-filter]', root).forEach(function (b) {
        b.addEventListener('click', function () {
          CH.filter = b.getAttribute('data-filter');
          A.$$('[data-filter]', root).forEach(function (x) { x.classList.remove('active'); });
          b.classList.add('active');
          loadList(root);
        });
      });

      bindSocket(root);
      loadList(root).then(function () {
        var target = ctx.params && ctx.params[0];
        if (target) openConversation(root, Number(target));
      });
    }
  });

  function debounce(fn, ms) {
    var t;
    return function () {
      var args = arguments, ctx = this;
      clearTimeout(t);
      t = setTimeout(function () { fn.apply(ctx, args); }, ms);
    };
  }

  function bindSocket(root) {
    if (!A.state.socket) {
      var tries = 0;
      var timer = setInterval(function () {
        tries++;
        if (A.state.socket) { clearInterval(timer); bindSocket(root); }
        else if (tries > 20) clearInterval(timer);
      }, 500);
      A.connectSocket();
      return;
    }
    on('message:new', function (m) {
      if (!m) return;
      if (Number(m.conversationId) === Number(CH.activeId)) {
        if (m.isPrivate) return;
        appendMessage(m);
        if (m.senderType === 'visitor') {
          A.state.socket.emit('agent:read', { conversationId: CH.activeId });
          hideTyping();
        }
      }
      loadList(root, true);
    });
    on('note:new', function (m) {
      if (Number(m.conversationId) === Number(CH.activeId)) appendMessage(m);
    });
    on('conversation:update', function (d) {
      if (d && Number(d.id) === Number(CH.activeId) && CH.detail) {
        CH.detail.conversation.status = d.status || CH.detail.conversation.status;
        if (d.agentId) {
          CH.detail.conversation.agentId = d.agentId;
          CH.detail.conversation.agentName = d.agentName || CH.detail.conversation.agentName;
        }
        renderHeader();
        renderSide();
      }
      loadList(root, true);
    });
    on('conversation:new', function (d) {
      loadList(root, true);
      if (d && d.id) A.toast('新会话：' + (d.visitorName || '访客') + ' · ' + (d.subject || ''), 'ok');
    });
    on('visitor:typing', function (d) {
      if (Number(d.conversationId) !== Number(CH.activeId)) return;
      var bar = CH.root && CH.root.querySelector('#typing-bar');
      if (!bar) return;
      bar.style.display = 'flex';
      bar.innerHTML = '<span class="dot-status green"></span> 访客正在输入' + (d.draft ? '：<span style="color:#475569">' + A.esc(d.draft) + '</span>' : '…');
      clearTimeout(CH.typingTimer);
      CH.typingTimer = setTimeout(hideTyping, 4000);
    });
    on('conversation:closed', function (d) {
      if (Number(d.conversationId) === Number(CH.activeId)) {
        loadDetail(root, CH.activeId);
      }
    });
  }

  function hideTyping() {
    var bar = CH.root && CH.root.querySelector('#typing-bar');
    if (bar) { bar.style.display = 'none'; bar.innerHTML = ''; }
  }

  function loadList(root, silent) {
    var url = '/api/conversations?status=' + CH.filter + '&limit=40' + A.siteQ() + (CH.q ? '&q=' + encodeURIComponent(CH.q) : '');
    return A.api(url).then(function (d) {
      CH.convs = d.conversations;
      A.state.pendingConv = d.counts.pending;
      A.renderSidebar();
      var list = root.querySelector('#conv-list');
      if (!list) return;
      ['all', 'pending', 'open', 'closed'].forEach(function (k) {
        var el = root.querySelector('[data-cnt="' + k + '"]');
        if (el) el.textContent = d.counts[k] ? '(' + d.counts[k] + ')' : '';
      });
      if (!d.conversations.length) {
        list.innerHTML = '<div class="empty-state" style="padding:40px 10px"><div class="em-ico">' + A.icon('chat', 20) + '</div><b>暂无会话</b>访客打开挂件后会自动出现</div>';
        return;
      }
      list.innerHTML = d.conversations.map(function (c) {
        var active = Number(c.id) === Number(CH.activeId);
        var intent = c.intentLevel === 'high' ? 'red' : c.intentLevel === 'medium' ? 'orange' : 'gray';
        return '<button class="conv-item' + (active ? ' active' : '') + '" data-conv="' + c.id + '">' +
          '<span class="au-avatar">' + A.esc((c.visitorName || '访').slice(0, 1)) + '</span>' +
          '<span class="conv-main"><span class="conv-top"><b>' + A.esc(c.visitorName || '访客') + '</b>' +
          (c.status === 'pending' ? '<span class="mini" style="background:rgba(245,158,11,.14);color:#b45309">待接入</span>' : '') +
          '<span class="time">' + A.timeAgo(c.lastMessageAt) + '</span></span>' +
          '<span class="conv-preview">' + (c.lastSender === 'agent' ? '你：' : c.lastSender === 'visitor' ? '' : '') + A.esc(A.clip(c.lastMessage || c.subject || '进入会话', 30)) + '</span>' +
          '<span class="conv-tags"><span class="mini ' + intent + '">' + ({ high: '高意向', medium: '中意向', low: '低意向' })[c.intentLevel] + '</span>' +
          '<span class="mini">' + A.esc(c.province || '未知') + '</span>' +
          (c.agentName ? '<span class="mini green">' + A.esc(c.agentName) + '</span>' : '<span class="mini">未分配</span>') + '</span></span>' +
          (c.unreadAgent ? '<span class="conv-unread">' + (c.unreadAgent > 9 ? '9+' : c.unreadAgent) + '</span>' : '') +
          '</button>';
      }).join('');
      A.$$('[data-conv]', list).forEach(function (btn) {
        btn.addEventListener('click', function () { openConversation(root, Number(btn.getAttribute('data-conv'))); });
      });
      if (CH.activeId && !silent) {
        var activeEl = list.querySelector('[data-conv="' + CH.activeId + '"]');
        if (activeEl) activeEl.classList.add('active');
      }
    }).catch(function (e) { if (!silent) A.handleError(e); });
  }

  function openConversation(root, id) {
    CH.activeId = id;
    CH.mobileChat = true;
    var listCol = root.querySelector('#conv-list-col');
    var mainCol = root.querySelector('#conv-main');
    if (listCol) listCol.classList.add('mobile-hide');
    if (mainCol) mainCol.classList.remove('mobile-hide');
    A.$$('[data-conv]', root).forEach(function (b) { b.classList.toggle('active', Number(b.getAttribute('data-conv')) === id); });
    var main = root.querySelector('#conv-main');
    main.innerHTML = '<div class="chat-empty"><div class="au-spinner au-spinner--sm"></div><span>加载会话...</span></div>';
    loadDetail(root, id);
    if (A.state.socket) A.state.socket.emit('agent:join', { conversationId: id });
    history.replaceState(null, '', '#/conversations/' + id);
  }

  function loadDetail(root, id) {
    var main = root.querySelector('#conv-main');
    A.api('/api/conversations/' + id).then(function (d) {
      CH.detail = d;
      CH.activeId = id;
      renderChat(main, d);
      renderSide(d);
      loadList(root, true);
    }).catch(function (e) {
      A.handleError(e);
      main.innerHTML = '<div class="chat-empty">' + A.esc(e.message) + '</div>';
    });
  }

  function renderHeader() {
    if (!CH.detail || !CH.root) return;
    var d = CH.detail;
    var c = d.conversation;
    var head = CH.root.querySelector('#chat-main-head');
    if (!head) return;
    var isMine = c.agentId === A.state.user.id;
    var canManage = A.role() !== 'agent' || !c.agentId || isMine;
    head.innerHTML = '<span class="au-avatar">' + A.esc((c.visitorName || '访').slice(0, 1)) + '</span>' +
      '<div><div class="ch-name">' + A.esc(c.visitorName || '访客') + ' ' + A.statusPill(c.status) + (isMine ? '<span class="pill blue">我的会话</span>' : '') + '</div>' +
      '<div class="ch-sub">' + A.esc(c.province || '') + ' ' + A.esc(c.city || '') + ' · 访问 ' + c.pageviewCount + ' 页 · ' + (c.agentName ? '归属 ' + A.esc(c.agentName) : '未分配') + ' · #' + c.id + '</div></div>' +
      '<div class="chat-main-actions">' +
      '<button class="tool-btn" data-back style="display:none">' + A.icon('back', 13) + ' 返回</button>' +
      (!c.agentId ? '<button class="au-btn au-btn--primary au-btn--xs" data-claim>抢单接入</button>' : '') +
      (canManage ? '<button class="tool-btn" data-transfer>' + A.icon('users', 13) + '<span>转接</span></button>' : '') +
      (c.status !== 'closed' ? '<button class="tool-btn" data-close>' + A.icon('check', 13) + '<span>结束</span></button>' : '<button class="tool-btn" data-reopen>' + A.icon('refresh', 13) + '<span>重开</span></button>') +
      '</div>';
    head.querySelector('[data-back]').onclick = function () { A.go('conversations'); };
    var claim = head.querySelector('[data-claim]');
    if (claim) claim.onclick = function () {
      A.state.socket.emit('conversation:claim', { conversationId: c.id }, function (res) {
        if (res && res.error) A.toast(res.error, 'err'); else { A.toast('已接入会话', 'ok'); loadDetail(CH.root, c.id); }
      });
    };
    var tr = head.querySelector('[data-transfer]');
    if (tr) tr.onclick = openTransfer;
    var cl = head.querySelector('[data-close]');
    if (cl) cl.onclick = function () {
      A.confirm({ title: '结束会话', message: '结束后访客会收到满意度评价邀请，确定要结束吗？', okText: '结束会话' }).then(function (ok) {
        if (!ok) return;
        A.state.socket.emit('conversation:close', { conversationId: c.id }, function (res) {
          if (res && res.error) A.toast(res.error, 'err'); else { A.toast('会话已结束', 'ok'); loadDetail(CH.root, c.id); }
        });
      });
    };
    var ro = head.querySelector('[data-reopen]');
    if (ro) ro.onclick = function () {
      A.state.socket.emit('conversation:reopen', { conversationId: c.id }, function (res) {
        if (res && res.error) A.toast(res.error, 'err'); else loadDetail(CH.root, c.id);
      });
    };
  }

  function renderChat(main, d) {
    var c = d.conversation;
    main.innerHTML = '<div class="chat-main-head" id="chat-main-head"></div>' +
      '<div class="chat-body" id="chat-body"></div>' +
      '<div class="chat-compose" id="chat-compose">' +
      '<div class="compose-tools">' +
      '<button class="tool-btn" data-canned>' + A.icon('zap', 12) + ' 快捷话术</button>' +
      '<button class="tool-btn" data-attach>' + A.icon('file', 12) + ' 附件</button>' +
      '<button class="tool-btn note" data-mode>' + A.icon('edit', 12) + ' <span data-mode-label>切换内部备注</span></button>' +
      '<span style="flex:1"></span><span class="tiny muted" data-mode-hint>公开回复，访客可见</span>' +
      '</div>' +
      '<div class="compose-box" id="compose-box">' +
      '<textarea id="chat-input" rows="1" placeholder="输入消息，Enter 发送，Shift+Enter 换行"></textarea>' +
      '<button class="au-btn au-btn--primary au-btn--sm" id="chat-send">发送</button>' +
      '</div><input type="file" id="chat-file" hidden accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.zip"></div>';
    renderHeader();
    var body = main.querySelector('#chat-body');
    body.innerHTML = d.messages.map(function (m) { return messageHtml(m); }).join('') +
      '<div class="msg-typing" id="typing-bar" style="display:none"></div>';
    scrollChat();
    bindCompose(main, d);
  }

  function messageHtml(m) {
    if (m.senderType === 'system') return '<div class="msg-sys">' + A.esc(m.content) + '</div>';
    if (m.type === 'rating') return '<div class="msg-sys">' + A.esc(m.content) + '</div>';
    if (m.type === 'note' || m.isPrivate) {
      return '<div class="msg-row"><span class="au-avatar" style="background:linear-gradient(135deg,#f59e0b,#f97316)">备</span><div><div class="msg-note">' + A.esc(m.content) + '<div class="msg-meta">' + A.esc(m.senderName || '内部备注') + ' · ' + A.fmtTime(m.createdAt) + ' · 访客不可见</div></div></div></div>';
    }
    var me = m.senderType === 'agent' || m.senderType === 'bot';
    var content = '';
    if (m.type === 'image' && m.fileUrl) content = '<img src="' + A.esc(m.fileUrl) + '" alt="图片" data-img="' + A.esc(m.fileUrl) + '">';
    else if (m.type === 'file' || m.type === 'recording') {
      content = '<a class="msg-file" href="' + A.esc(m.fileUrl || '#') + '" target="_blank" rel="noopener"><span class="avatar-sm gray">' + A.icon(m.type === 'recording' ? 'video' : 'file', 13) + '</span><span><b style="font-size:11.5px">' + A.esc(m.fileName || (m.type === 'recording' ? '页面录屏' : '附件')) + '</b><span class="tiny muted" style="display:block">' + (m.fileSize ? (m.fileSize / 1024 > 1024 ? (m.fileSize / 1024 / 1024).toFixed(1) + 'MB' : Math.round(m.fileSize / 1024) + 'KB') : '点击查看') + '</span></span></a>';
    } else {
      content = A.esc(m.content || '').replace(/\n/g, '<br>');
    }
    return '<div class="msg-row' + (me ? ' me' : '') + '"><span class="au-avatar" style="' + (m.senderType === 'bot' ? 'background:linear-gradient(135deg,#8b5cf6,#ec4899)' : me ? '' : 'background:linear-gradient(135deg,#64748b,#94a3b8)') + '">' + A.esc((m.senderName || (me ? '客' : '访')).slice(0, 1)) + '</span>' +
      '<div style="max-width:76%"><div class="msg-bubble">' + content + '</div><div class="msg-meta">' + A.esc(m.senderName || '') + ' · ' + A.fmtTime(m.createdAt) + (m.senderType === 'bot' ? ' · 自动' : '') + '</div></div></div>';
  }

  function appendMessage(m) {
    var body = CH.root && CH.root.querySelector('#chat-body');
    if (!body) return;
    var temp = document.createElement('div');
    temp.innerHTML = messageHtml(m);
    var node = temp.firstElementChild;
    var typing = body.querySelector('#typing-bar');
    if (typing) body.insertBefore(node, typing); else body.appendChild(node);
    scrollChat();
    A.$$('[data-img]', body).forEach(function (img) {
      img.onclick = function () {
        A.modal({ title: '查看图片', size: 'wide', body: '<img src="' + A.esc(img.getAttribute('data-img')) + '" style="max-width:100%;border-radius:10px;display:block;margin:auto">' });
      };
    });
  }

  function scrollChat() {
    var body = CH.root && CH.root.querySelector('#chat-body');
    if (body) setTimeout(function () { body.scrollTop = body.scrollHeight; }, 30);
  }

  function bindCompose(main, d) {
    var input = main.querySelector('#chat-input');
    var send = main.querySelector('#chat-send');
    var file = main.querySelector('#chat-file');
    var box = main.querySelector('#compose-box');
    var typing = null;

    function updateSend() {
      send.disabled = !input.value.trim() && !CH.pendingFile;
      input.style.height = 'auto';
      input.style.height = Math.min(90, input.scrollHeight) + 'px';
    }
    input.addEventListener('input', function () {
      updateSend();
      if (A.state.socket) {
        clearTimeout(typing);
        typing = setTimeout(function () {
          A.state.socket.emit('agent:typing', { conversationId: d.conversation.id });
        }, 400);
      }
    });
    input.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        doSend();
      }
    });
    send.addEventListener('click', doSend);
    updateSend();

    function doSend() {
      var text = input.value.trim();
      if (!text && !CH.pendingFile) return;
      var mode = CH.mode;
      var payload = { conversationId: d.conversation.id, type: 'text', content: text };
      if (CH.pendingFile) {
        payload.type = CH.pendingFile.type;
        payload.fileUrl = CH.pendingFile.url;
        payload.fileName = CH.pendingFile.name;
        payload.fileSize = CH.pendingFile.size;
        if (!text) payload.content = CH.pendingFile.type === 'image' ? '[图片]' : '[文件]';
      }
      input.value = '';
      CH.pendingFile = null;
      updateSend();
      if (mode === 'note') {
        if (!text) return;
        A.state.socket.emit('agent:note', { conversationId: d.conversation.id, content: text }, function (res) {
          if (res && res.error) A.toast(res.error, 'err');
        });
        return;
      }
      A.state.socket.emit('agent:message', payload, function (res) {
        if (res && res.error) { A.toast(res.error, 'err'); input.value = text; updateSend(); }
        else if (res && res.claimed) { loadList(CH.root, true); }
      });
      if (CH.pendingFile) CH.pendingFile = null;
    }

    main.querySelector('[data-mode]').addEventListener('click', function () {
      CH.mode = CH.mode === 'reply' ? 'note' : 'reply';
      var label = main.querySelector('[data-mode-label]');
      var hint = main.querySelector('[data-mode-hint]');
      var boxEl = main.querySelector('#compose-box');
      var btn = main.querySelector('[data-mode]');
      if (CH.mode === 'note') {
        label.textContent = '切换公开回复';
        hint.textContent = '内部备注，访客不可见';
        hint.style.color = '#b45309';
        boxEl.classList.add('note');
        btn.classList.add('note');
        input.placeholder = '写一条仅团队可见的内部备注...';
      } else {
        label.textContent = '切换内部备注';
        hint.textContent = '公开回复，访客可见';
        hint.style.color = '';
        boxEl.classList.remove('note');
        btn.classList.remove('note');
        input.placeholder = '输入消息，Enter 发送，Shift+Enter 换行';
      }
    });

    main.querySelector('[data-canned]').addEventListener('click', function () {
      A.api('/api/canned-replies').then(function (res) {
        var pop = main.querySelector('.canned-pop');
        if (pop) { pop.remove(); return; }
        pop = document.createElement('div');
        pop.className = 'canned-pop';
        pop.innerHTML = res.replies.length ? res.replies.map(function (r) {
          return '<button data-reply="' + r.id + '"><b>' + A.esc(r.title) + '</b><span>' + A.esc(r.content) + '</span></button>';
        }).join('') : '<div class="tiny muted" style="padding:10px">暂无快捷话术</div>';
        main.querySelector('#chat-compose').appendChild(pop);
        A.$$('[data-reply]', pop).forEach(function (b) {
          b.addEventListener('click', function () {
            var r = res.replies.filter(function (x) { return String(x.id) === b.getAttribute('data-reply'); })[0];
            input.value = r.content;
            pop.remove();
            updateSend();
            input.focus();
          });
        });
      }).catch(A.handleError);
    });

    main.querySelector('[data-attach]').addEventListener('click', function () { file.click(); });
    file.addEventListener('change', function () {
      var f = file.files && file.files[0];
      if (!f) return;
      if (f.size > 20 * 1024 * 1024) { A.toast('文件不能超过 20MB', 'err'); return; }
      var fd = new FormData();
      fd.append('file', f);
      A.toast('正在上传...');
      A.api('/api/upload', { method: 'POST', body: fd }).then(function (res) {
        CH.pendingFile = { url: res.url, name: res.name, size: res.size, type: /^image\//.test(f.type) ? 'image' : 'file' };
        updateSend();
        A.toast('附件已就绪，点击发送', 'ok');
        file.value = '';
      }).catch(A.handleError);
    });

    main.querySelector('#chat-body').addEventListener('click', function (e) {
      if (e.target.tagName === 'IMG' && e.target.getAttribute('data-img')) {
        A.modal({ title: '查看图片', size: 'wide', body: '<img src="' + A.esc(e.target.getAttribute('data-img')) + '" style="max-width:100%;border-radius:10px;display:block;margin:auto">' });
        return;
      }
      var trBtn = e.target.closest && e.target.closest('[data-tr]');
      if (trBtn) {
        var text = decodeURIComponent(trBtn.getAttribute('data-tr'));
        trBtn.disabled = true;
        trBtn.textContent = '翻译中';
        A.apiPost('/api/ai/translate', { text: text, target: /[\u4e00-\u9fa5]/.test(text) ? 'en' : 'zh' }).then(function (r) {
          var bubble = trBtn.closest('.msg-bubble');
          if (bubble && !bubble.querySelector('.msg-trans')) {
            var d = document.createElement('div');
            d.className = 'msg-trans';
            d.textContent = r.text;
            bubble.appendChild(d);
          }
          trBtn.remove();
        }).catch(function (err) { trBtn.disabled = false; trBtn.textContent = '译'; A.handleError(err); });
      }
    });
  }

  function openTransfer() {
    if (!CH.detail) return;
    var agents = CH.detail.agents.filter(function (a) { return a.id !== CH.detail.conversation.agentId; });
    if (!agents.length) return A.toast('没有可转接的客服');
    A.modal({
      title: '转接会话', subtitle: '转接后目标客服会收到站内通知',
      body: '<div class="grid" style="gap:7px">' + agents.map(function (a) {
        return '<button class="au-list-item" data-to="' + a.id + '" style="border:1px solid rgba(148,163,184,.18)"><span class="avatar-sm">' + A.esc(a.name.slice(0, 1)) + '</span><span class="au-list-item-content"><span class="au-list-item-title">' + A.esc(a.name) + '</span><span class="au-list-item-desc">' + ({ admin: '管理员', operator: '运营', agent: '客服' })[a.role] + '</span></span></button>';
      }).join('') + '</div>',
      onOpen: function (card, close) {
        A.$$('[data-to]', card).forEach(function (b) {
          b.addEventListener('click', function () {
            A.state.socket.emit('conversation:transfer', { conversationId: CH.detail.conversation.id, toUserId: Number(b.getAttribute('data-to')) }, function (res) {
              if (res && res.error) A.toast(res.error, 'err');
              else { A.toast('已转接', 'ok'); close(); loadDetail(CH.root, CH.activeId); }
            });
          });
        });
      }
    });
  }

  function renderSide(d) {
    var side = CH.root && CH.root.querySelector('#conv-side');
    if (!side) return;
    var v = d.visitor;
    var c = d.conversation;
    var tags = v.tags || [];
    var statusMap = { new: '新线索', following: '跟进中', won: '已成交', invalid: '无效' };
    var leads = d.leads || [];
    side.innerHTML =
      '<div class="side-block"><div class="visitor-big"><span class="au-avatar">' + A.esc((v.name || '访').slice(0, 1)) + '</span><div><b>' + A.esc(v.name || '匿名访客') + '</b><span>' + A.esc(v.province || '') + ' ' + A.esc(v.city || '') + ' · ' + A.esc(v.device || '') + '</span></div><span style="margin-left:auto">' + A.intentPill(v.intentLevel, v.intentScore) + '</span></div>' +
      '<div class="tag-edit mt-2" id="side-tags">' + (tags.length ? tags.map(function (t) { return '<span class="au-chip">' + A.esc(t) + '</span>'; }).join('') : '<span class="tiny muted">暂无标签</span>') + '<button class="au-chip" data-edit-tags style="padding:3px 9px;font-size:10.5px">+ 标签</button></div></div>' +
      '<div class="side-block"><h4>访客信息 <button class="tiny" data-open-profile style="border:none;background:none;color:#2563eb;cursor:pointer">完整档案</button></h4>' +
      kv('手机号', v.phone || '未留资') + kv('邮箱', v.email || '-') + kv('公司', v.company || '-') + kv('业务', v.businessType || '-') +
      kv('来源', A.sourceLabel(v.source) + (v.keyword ? ' / ' + v.keyword : '')) + kv('设备', (v.os || '') + ' ' + (v.browser || '')) + kv('访问次数', v.visitCount + ' 次 / ' + v.pageviewCount + ' 页') +
      kv('首次访问', A.fmtTime(v.firstSeen)) + kv('合规状态', v.trackingConsent ? '已同意追踪' : '已拒绝追踪') + '</div>' +
      '<div class="side-block"><h4>最近页面</h4>' + (d.recentPages.length ? d.recentPages.slice(0, 6).map(function (p) {
        return '<div class="page-mini"><span class="p-ico">' + A.icon('eye', 11) + '</span><span style="min-width:0"><b>' + A.esc(p.title || p.url) + '</b><span>' + A.esc(p.url) + ' · ' + Math.round((p.dwell_ms || 0) / 1000) + 's</span></span></div>';
      }).join('') : '<div class="tiny muted">暂无页面记录</div>') + '</div>' +
      '<div class="side-block"><h4>会话与线索</h4>' +
      kv('会话状态', ({ open: '进行中', pending: '待接入', closed: '已结束' })[c.status]) +
      kv('满意度', c.rating ? c.rating + ' / 5' + (c.ratingComment ? ' · ' + c.ratingComment : '') : '未评价') +
      (leads.length ? leads.map(function (l) { return '<div class="recording-link"><span class="r-ico" style="background:rgba(16,185,129,.1);color:#059669">' + A.icon('leads', 14) + '</span><span style="flex:1"><b style="font-size:11.5px">' + A.esc(l.name || '线索') + ' · ' + (statusMap[l.status] || l.status) + '</b><span class="tiny muted" style="display:block">' + A.esc(l.requirement || '') + '</span></span></div>'; }).join('') : '<button class="au-btn au-btn--ghost au-btn--xs" style="width:100%" data-make-lead>转为线索</button>') +
      '</div>' +
      '<div class="side-block"><h4>AI 会话摘要 ' + (A.can('ai_bot') ? '<button class="tiny" data-ai style="border:none;background:none;color:#7c3aed;cursor:pointer">生成</button>' : '<span class="pill purple" style="font-size:9px">企业版</span>') + '</h4>' +
      (c.aiSummary ? '<div class="tiny" style="line-height:1.7;color:#475569">' + A.esc(c.aiSummary) + '</div>' +
        (c.aiNeed ? '<div class="notice info mt-1" style="font-size:10.5px">需求：' + A.esc(c.aiNeed) + '</div>' : '') +
        (c.aiSuggestion ? '<div class="notice ok mt-1" style="font-size:10.5px">建议：' + A.esc(c.aiSuggestion) + '</div>' : '') : '<div class="tiny muted">会话结束后自动生成摘要，也可以手动生成。</div>') + '</div>' +
      '<div class="side-block"><h4>快捷操作</h4><div class="flex gap-1 wrap">' +
      (v.blocked ? '<span class="pill red">已拉黑</span>' : '<button class="au-btn au-btn--ghost au-btn--xs" data-block>拉黑访客</button>') +
      '<button class="au-btn au-btn--ghost au-btn--xs" data-site-link>站点详情</button></div></div>';

    function kv(k, val) { return '<div class="side-kv"><span>' + k + '</span><b title="' + A.esc(val) + '">' + A.esc(val) + '</b></div>'; }

    var profile = side.querySelector('[data-open-profile]');
    if (profile) profile.onclick = function () { A.go('visitors/' + v.id); };
    var editTags = side.querySelector('[data-edit-tags]');
    if (editTags) editTags.onclick = function () { openTagEditor(v); };
    var ai = side.querySelector('[data-ai]');
    if (ai) ai.onclick = function () {
      ai.disabled = true;
      A.apiPost('/api/ai/summary/' + c.id).then(function (res) {
        A.toast('AI 摘要已生成', 'ok');
        loadDetail(CH.root, CH.activeId);
      }).catch(function (e) { ai.disabled = false; A.handleError(e); });
    };
    var mk = side.querySelector('[data-make-lead]');
    if (mk) mk.onclick = function () {
      A.apiPost('/api/leads', {
        siteId: c.siteId, name: v.name || '访客', phone: v.phone || '', company: v.company || '',
        businessType: v.businessType || '', requirement: c.subject || '会话转化线索', source: 'chat'
      }).then(function (res) {
        A.toast('线索已创建', 'ok');
        loadDetail(CH.root, CH.activeId);
      }).catch(A.handleError);
    };
    var block = side.querySelector('[data-block]');
    if (block) block.onclick = function () {
      A.confirm({ title: '拉黑访客', message: '拉黑后该访客将无法再次发起咨询，确定继续？', danger: true, okText: '拉黑' }).then(function (ok) {
        if (!ok) return;
        A.apiPatch('/api/visitors/' + v.id, { blocked: true }).then(function () { A.toast('已拉黑访客', 'ok'); loadDetail(CH.root, CH.activeId); }).catch(A.handleError);
      });
    };
  }

  function openTagEditor(v) {
    A.api('/api/tags').then(function (res) {
      A.modal({
        title: '编辑访客标签', subtitle: '手动标签会同步到访客档案与线索',
        body: '<div class="tag-edit" style="gap:7px">' + res.tags.map(function (t) {
          var on = (v.tags || []).indexOf(t.name) > -1;
          return '<button class="au-chip ' + (on ? 'active' : '') + '" data-tag="' + t.id + '">' + A.esc(t.name) + '</button>';
        }).join('') + '</div>',
        footer: [{ label: '取消', class: 'au-btn--ghost' }, { label: '保存标签', class: 'au-btn--primary', onClick: function (card, close) {
          var ids = A.$$('[data-tag].active', card).map(function (b) { return Number(b.getAttribute('data-tag')); });
          A.apiPost('/api/visitors/' + v.id + '/tags', { tagIds: ids }).then(function () {
            close(); A.toast('标签已更新', 'ok'); loadDetail(CH.root, CH.activeId);
          }).catch(A.handleError);
        } }],
        onOpen: function (card) {
          A.$$('[data-tag]', card).forEach(function (b) {
            b.addEventListener('click', function () { b.classList.toggle('active'); });
          });
        }
      });
    }).catch(A.handleError);
  }
})();
