'use strict';
const { get, all, run, json } = require('./db');
const { readToken } = require('./auth');
const { hasFeature, planOf } = require('./plans');
const presence = require('./services/presence');
const ai = require('./services/ai');
const { notifyTenant, createNotification } = require('./services/notify');
const { hit } = require('./services/ratelimit');
const { recalcVisitorIntent } = require('./helpers');
const { blockedCheck, clientIp } = require('./routes/public');

function safeJson(v, f) { try { return JSON.parse(v); } catch { return f; } }

function loadConversation(id) {
  return get(
    `SELECT c.*, s.tenant_id AS tid, s.site_key, s.widget_config, s.tracking_enabled, t.plan, t.name AS tenant_name,
            v.vid, v.name AS visitor_name, v.phone AS visitor_phone, v.province, v.city, v.device, v.browser, v.os,
            v.intent_score, v.intent_level, v.pageview_count, v.tracking_consent, v.source, v.ip
     FROM conversations c
     JOIN sites s ON s.id = c.site_id
     JOIN tenants t ON t.id = s.tenant_id
     JOIN visitors v ON v.id = c.visitor_id
     WHERE c.id = ?`,
    [Number(id)]
  );
}

function messagePayload(m, conv) {
  return {
    id: m.id,
    conversationId: m.conversation_id,
    senderType: m.sender_type,
    senderName: m.sender_name,
    type: m.type,
    content: m.content,
    fileUrl: m.file_url,
    fileName: m.file_name,
    fileSize: m.file_size,
    isPrivate: !!m.is_private,
    meta: safeJson(m.meta, {}),
    createdAt: m.created_at,
    agentId: m.sender_id
  };
}

function insertMessage(conv, { senderType, senderId, senderName, type = 'text', content, fileUrl, fileName, fileSize, isPrivate = false, meta = {} }) {
  const id = run(
    `INSERT INTO messages (tenant_id, conversation_id, sender_type, sender_id, sender_name, type, content, file_url, file_name, file_size, is_private, meta)
     VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`,
    [conv.tid, conv.id, senderType, senderId || null, senderName || '', type, content || '', fileUrl || null, fileName || null, fileSize || null, isPrivate ? 1 : 0, JSON.stringify(meta)]
  ).lastInsertRowid;
  run("UPDATE conversations SET last_message_at = datetime('now') WHERE id = ?", [conv.id]);
  if (senderType === 'visitor') {
    run('UPDATE conversations SET unread_agent = unread_agent + 1 WHERE id = ?', [conv.id]);
  } else if (senderType === 'agent') {
    run('UPDATE conversations SET unread_visitor = unread_visitor + 1 WHERE id = ?', [conv.id]);
  }
  return get('SELECT * FROM messages WHERE id = ?', [id]);
}

function sensitiveHit(siteId, text) {
  if (!text) return null;
  const rules = all('SELECT * FROM rules WHERE site_id = ? AND type = ? AND enabled = 1', [siteId, 'sensitive']);
  for (const r of rules) {
    const c = safeJson(r.conditions, {});
    const words = c.words || [];
    const found = words.find((w) => w && text.toLowerCase().includes(String(w).toLowerCase()));
    if (found) return { rule: r, word: found, notice: (safeJson(r.actions, {}).notice) || '消息包含不适宜内容，已被拦截。' };
  }
  return null;
}

function keywordRule(siteId, text) {
  const rules = all('SELECT * FROM rules WHERE site_id = ? AND type = ? AND enabled = 1 ORDER BY priority, id', [siteId, 'keyword']);
  for (const r of rules) {
    const c = safeJson(r.conditions, {});
    const words = c.keywords || [];
    if (words.some((w) => w && text.toLowerCase().includes(String(w).toLowerCase()))) {
      return { rule: r, reply: safeJson(r.actions, {}).reply };
    }
  }
  return null;
}

function init(io) {
  io.on('connection', (socket) => {
    let ctx = null;

    socket.on('auth:agent', (payload = {}, ack = () => {}) => {
      const token = payload.token || socket.handshake.auth.token;
      const decoded = readToken(token);
      if (!decoded) return ack({ error: '认证失败' });
      const user = get('SELECT * FROM users WHERE id = ? AND status = ?', [decoded.uid, 'active']);
      if (!user) return ack({ error: '账号不可用' });
      ctx = { role: 'agent', user, tenantId: user.tenant_id };
      socket.join(`tenant:${user.tenant_id}`);
      socket.join(`agent:${user.id}`);
      presence.addAgent(user.tenant_id, socket.id, user.id);
      io.to(`tenant:${user.tenant_id}`).emit('presence:agents', { count: presence.onlineAgentCount(user.tenant_id) });
      ack({ ok: true, user: { id: user.id, name: user.name, role: user.role }, onlineAgents: presence.onlineAgentCount(user.tenant_id) });
    });

    socket.on('visitor:init', (payload = {}, ack = () => {}) => {
      const site = get(
        `SELECT s.*, t.plan, t.name AS tenant_name, t.brand_name, t.hide_branding, t.status AS tenant_status
         FROM sites s JOIN tenants t ON t.id = s.tenant_id WHERE s.site_key = ?`,
        [payload.key || socket.handshake.auth.key]
      );
      if (!site || site.tenant_status !== 'active') return ack({ error: '站点不存在或已停用' });
      const ip = clientIp(socket.request);
      if (blockedCheck(site, ip, payload.vid)) return ack({ error: '当前访客已被限制咨询', blocked: true });
      const visitor = get('SELECT * FROM visitors WHERE tenant_id = ? AND site_id = ? AND vid = ?', [site.tenant_id, site.id, payload.vid]);
      if (!visitor) return ack({ error: '访客未初始化，请刷新页面' });
      ctx = { role: 'visitor', site, visitor };
      presence.addVisitor(site.id, socket.id, visitor.id);
      io.to(`tenant:${site.tenant_id}`).emit('presence:visitors', { siteId: site.id, count: presence.visitorCount(site.id) });

      let conv = get(
        `SELECT * FROM conversations WHERE site_id = ? AND visitor_id = ? AND status != 'closed'
         AND created_at >= datetime('now', '-1 day') ORDER BY id DESC LIMIT 1`,
        [site.id, visitor.id]
      );
      if (!conv) {
        const id = run(
          `INSERT INTO conversations (tenant_id, site_id, visitor_id, status, subject, source, last_message_at)
           VALUES (?,?,?,?,?,?,datetime('now'))`,
          [site.tenant_id, site.id, visitor.id, 'pending', payload.subject || visitor.landing_page || '网站咨询', visitor.source || 'widget']
        ).lastInsertRowid;
        conv = get('SELECT * FROM conversations WHERE id = ?', [id]);
        run('INSERT INTO messages (tenant_id, conversation_id, sender_type, sender_name, type, content, meta) VALUES (?,?,?,?,?,?,?)',
          [site.tenant_id, conv.id, 'system', '系统', 'text', '访客进入会话', JSON.stringify({ system: true, event: 'enter' })]);
        const full = loadConversation(conv.id);
        io.to(`tenant:${site.tenant_id}`).emit('conversation:new', summarizeConversation(full));
        createNotification(site.tenant_id, null, 'conversation', '新会话', `${visitor.name || visitor.province || '访客'} 发起咨询：${conv.subject}`, { conversationId: conv.id });
        io.to(`tenant:${site.tenant_id}`).emit('notification:new', { title: '新会话', content: conv.subject });
      }
      socket.join(`conv:${conv.id}`);
      const messages = all('SELECT * FROM messages WHERE conversation_id = ? AND is_private = 0 ORDER BY id', [conv.id]).map((m) => messagePayload(m, conv));
      const agent = conv.agent_id ? get('SELECT id, name, avatar FROM users WHERE id = ?', [conv.agent_id]) : null;
      const widget = safeJson(site.widget_config, {});
      ack({
        ok: true,
        conversation: { id: conv.id, status: conv.status, agent },
        messages,
        visitor: { id: visitor.id, vid: visitor.vid, name: visitor.name, phone: visitor.phone, trackingConsent: !!visitor.tracking_consent },
        online: presence.onlineAgentCount(site.tenant_id) > 0,
        widget: {
          agentName: widget.agentName, title: widget.title, welcome: widget.welcome,
          offlineText: widget.offlineText, businessHours: widget.businessHours,
          aiEnabled: hasFeature(site.plan, 'ai_bot') && !!widget.aiEnabled,
          aiName: widget.aiName || 'AI 助手'
        }
      });
    });

    socket.on('visitor:message', async (payload = {}, ack = () => {}) => {
      if (!ctx || ctx.role !== 'visitor') return ack({ error: '未初始化' });
      const conv = loadConversation(payload.conversationId);
      if (!conv || conv.visitor_id !== ctx.visitor.id) return ack({ error: '会话不存在' });
      const content = String(payload.content || '').slice(0, 4000);
      if (!content && !payload.fileUrl) return ack({ error: '消息不能为空' });
      const limit = hit(`msg:${ctx.visitor.id}`, 20, 30000);
      if (!limit.ok) return ack({ error: '发送过于频繁，请稍后再试', rateLimited: true });

      const bad = sensitiveHit(conv.site_id, content);
      if (bad) {
        run('INSERT INTO rule_logs (tenant_id, rule_id, visitor_id, action) VALUES (?,?,?,?)', [conv.tid, bad.rule.id, ctx.visitor.id, 'block']);
        socket.emit('message:blocked', { notice: bad.notice });
        return ack({ error: bad.notice, blocked: true });
      }

      const msg = insertMessage(conv, {
        senderType: 'visitor', senderId: ctx.visitor.id, senderName: ctx.visitor.name || '访客',
        type: ['text', 'image', 'file', 'recording'].includes(payload.type) ? payload.type : 'text',
        content: content || (payload.type === 'image' ? '[图片]' : '[文件]'),
        fileUrl: payload.fileUrl, fileName: payload.fileName, fileSize: payload.fileSize
      });
      io.to(`conv:${conv.id}`).emit('message:new', messagePayload(msg, conv));
      io.to(`tenant:${conv.tid}`).emit('conversation:update', conversationSummary(conv.id));

      if (conv.status === 'closed') {
        run("UPDATE conversations SET status = 'pending', closed_at = NULL WHERE id = ?", [conv.id]);
      }
      recalcVisitorIntent(conv.tid, ctx.visitor.id);
      ack({ ok: true, messageId: msg.id, createdAt: msg.created_at });

      // 关键词自动回复
      if (hasFeature(conv.plan, 'keyword_reply') && content) {
        const kw = keywordRule(conv.site_id, content);
        if (kw && kw.reply) {
          const already = get("SELECT id FROM rule_logs WHERE rule_id = ? AND visitor_id = ? AND action = 'reply'", [kw.rule.id, ctx.visitor.id]);
          if (!already) {
            run('INSERT INTO rule_logs (tenant_id, rule_id, visitor_id, action) VALUES (?,?,?,?)', [conv.tid, kw.rule.id, ctx.visitor.id, 'reply']);
            run('UPDATE rules SET triggered_count = triggered_count + 1 WHERE id = ?', [kw.rule.id]);
            setTimeout(() => {
              const bot = insertMessage(conv, { senderType: 'bot', senderName: '自动回复', type: 'text', content: kw.reply, meta: { ruleId: kw.rule.id } });
              io.to(`conv:${conv.id}`).emit('message:new', messagePayload(bot, conv));
            }, 700);
            return;
          }
        }
      }

      // AI 机器人
      const widgetCfg = safeJson(conv.widget_config, {});
      if (hasFeature(conv.plan, 'ai_bot') && widgetCfg.aiEnabled && !conv.agent_id && content) {
        const recentBot = get("SELECT id FROM messages WHERE conversation_id = ? AND sender_type = 'bot' AND created_at >= datetime('now', '-2 minutes')", [conv.id]);
        if (!recentBot) {
          const match = ai.matchFaq(conv.site_id, content);
          setTimeout(() => {
            const reply = match
              ? `${match.faq.answer}`
              : '这个问题我需要请人工顾问来回答，已为您转接，请稍候。';
            const bot = insertMessage(conv, { senderType: 'bot', senderName: widgetCfg.aiName || 'AI 助手', type: 'text', content: reply, meta: { ai: true } });
            io.to(`conv:${conv.id}`).emit('message:new', messagePayload(bot, conv));
            if (!match) {
              run("UPDATE conversations SET status = 'pending' WHERE id = ?", [conv.id]);
              io.to(`tenant:${conv.tid}`).emit('conversation:update', conversationSummary(conv.id));
            }
          }, 900);
        }
      }
    });

    socket.on('visitor:typing', (payload = {}) => {
      if (!ctx || ctx.role !== 'visitor') return;
      io.to(`tenant:${ctx.site.tenant_id}`).emit('visitor:typing', {
        conversationId: Number(payload.conversationId),
        name: ctx.visitor.name || '访客',
        visitorId: ctx.visitor.id,
        draft: String(payload.draft || '').slice(0, 120)
      });
    });

    socket.on('visitor:read', (payload = {}) => {
      if (!ctx || ctx.role !== 'visitor') return;
      const convId = Number(payload.conversationId);
      run("UPDATE messages SET read_at = datetime('now') WHERE conversation_id = ? AND sender_type != 'visitor' AND read_at IS NULL", [convId]);
      run('UPDATE conversations SET unread_visitor = 0 WHERE id = ?', [convId]);
    });

    socket.on('agent:join', (payload = {}, ack = () => {}) => {
      if (!ctx || ctx.role !== 'agent') return ack({ error: '认证失败' });
      const conv = loadConversation(payload.conversationId);
      if (!conv || conv.tid !== ctx.tenantId) return ack({ error: '会话不存在' });
      socket.join(`conv:${conv.id}`);
      run('UPDATE conversations SET unread_agent = 0 WHERE id = ?', [conv.id]);
      run("UPDATE messages SET read_at = datetime('now') WHERE conversation_id = ? AND sender_type = 'visitor' AND read_at IS NULL", [conv.id]);
      ack({ ok: true, conversation: conversationSummary(conv.id) });
    });

    socket.on('agent:message', (payload = {}, ack = () => {}) => {
      if (!ctx || ctx.role !== 'agent') return ack({ error: '认证失败' });
      const conv = loadConversation(payload.conversationId);
      if (!conv || conv.tid !== ctx.tenantId) return ack({ error: '会话不存在' });
      const content = String(payload.content || '').slice(0, 4000);
      if (!content && !payload.fileUrl) return ack({ error: '消息不能为空' });
      if (!hit(`amsg:${ctx.user.id}`, 90, 60000).ok) return ack({ error: '发送过于频繁' });

      let claimed = false;
      if (!conv.agent_id) {
        run("UPDATE conversations SET agent_id = ?, status = 'open' WHERE id = ?", [ctx.user.id, conv.id]);
        claimed = true;
      }
      if (conv.status === 'pending') run("UPDATE conversations SET status = 'open' WHERE id = ?", [conv.id]);
      if (!conv.first_response_ms) {
        const elapsed = Date.now() - new Date(conv.created_at.replace(' ', 'T') + 'Z').getTime();
        run('UPDATE conversations SET first_response_ms = ? WHERE id = ?', [Math.max(0, elapsed), conv.id]);
      }
      const msg = insertMessage(conv, {
        senderType: 'agent', senderId: ctx.user.id, senderName: ctx.user.name,
        type: ['text', 'image', 'file'].includes(payload.type) ? payload.type : 'text',
        content, fileUrl: payload.fileUrl, fileName: payload.fileName, fileSize: payload.fileSize
      });
      io.to(`conv:${conv.id}`).emit('message:new', messagePayload(msg, conv));
      io.to(`conv:${conv.id}`).emit('conversation:update', { id: conv.id, status: 'open', agentId: ctx.user.id, agentName: ctx.user.name });
      io.to(`tenant:${conv.tid}`).emit('conversation:update', conversationSummary(conv.id));
      if (claimed) {
        const sys = insertMessage(conv, { senderType: 'system', senderName: '系统', type: 'text', content: `${ctx.user.name} 已接管会话`, meta: { system: true } });
        io.to(`conv:${conv.id}`).emit('message:new', messagePayload(sys, conv));
      }
      ack({ ok: true, messageId: msg.id, claimed });
    });

    socket.on('agent:note', (payload = {}, ack = () => {}) => {
      if (!ctx || ctx.role !== 'agent') return ack({ error: '认证失败' });
      const conv = loadConversation(payload.conversationId);
      if (!conv || conv.tid !== ctx.tenantId) return ack({ error: '会话不存在' });
      if (ctx.user.role === 'agent' && conv.agent_id && conv.agent_id !== ctx.user.id) {
        return ack({ error: '仅会话归属客服可添加备注' });
      }
      const msg = insertMessage(conv, {
        senderType: 'agent', senderId: ctx.user.id, senderName: ctx.user.name + '（备注）',
        type: 'note', content: String(payload.content || '').slice(0, 2000), isPrivate: true, meta: { internal: true }
      });
      io.to(`tenant:${conv.tid}`).emit('note:new', messagePayload(msg, conv));
      ack({ ok: true, messageId: msg.id });
    });

    socket.on('agent:typing', (payload = {}) => {
      if (!ctx || ctx.role !== 'agent') return;
      io.to(`conv:${Number(payload.conversationId)}`).emit('agent:typing', { conversationId: Number(payload.conversationId), name: ctx.user.name });
    });

    socket.on('conversation:claim', (payload = {}, ack = () => {}) => {
      if (!ctx || ctx.role !== 'agent') return ack({ error: '认证失败' });
      const conv = loadConversation(payload.conversationId);
      if (!conv || conv.tid !== ctx.tenantId) return ack({ error: '会话不存在' });
      if (conv.agent_id && conv.agent_id !== ctx.user.id && ctx.user.role === 'agent') return ack({ error: '会话已被其他客服接管' });
      run("UPDATE conversations SET agent_id = ?, status = 'open' WHERE id = ?", [ctx.user.id, conv.id]);
      const sys = insertMessage(conv, { senderType: 'system', senderName: '系统', type: 'text', content: `${ctx.user.name} 接管了会话`, meta: { system: true } });
      io.to(`conv:${conv.id}`).emit('message:new', messagePayload(sys, conv));
      io.to(`tenant:${conv.tid}`).emit('conversation:update', conversationSummary(conv.id));
      ack({ ok: true });
    });

    socket.on('conversation:transfer', (payload = {}, ack = () => {}) => {
      if (!ctx || ctx.role !== 'agent') return ack({ error: '认证失败' });
      const conv = loadConversation(payload.conversationId);
      if (!conv || conv.tid !== ctx.tenantId) return ack({ error: '会话不存在' });
      const target = get('SELECT * FROM users WHERE id = ? AND tenant_id = ? AND status = ?', [Number(payload.toUserId), ctx.tenantId, 'active']);
      if (!target) return ack({ error: '目标客服不存在' });
      run("UPDATE conversations SET agent_id = ?, status = 'open' WHERE id = ?", [target.id, conv.id]);
      const sys = insertMessage(conv, { senderType: 'system', senderName: '系统', type: 'text', content: `${ctx.user.name} 将会话转接给 ${target.name}`, meta: { system: true } });
      io.to(`conv:${conv.id}`).emit('message:new', messagePayload(sys, conv));
      io.to(`tenant:${conv.tid}`).emit('conversation:update', conversationSummary(conv.id));
      createNotification(ctx.tenantId, target.id, 'transfer', '收到会话转接', `${ctx.user.name} 把「${conv.subject || '咨询'}」转接给你`, { conversationId: conv.id });
      io.to(`agent:${target.id}`).emit('notification:new', { title: '收到会话转接', content: conv.subject || '' });
      ack({ ok: true });
    });

    socket.on('conversation:close', async (payload = {}, ack = () => {}) => {
      if (!ctx || ctx.role !== 'agent') return ack({ error: '认证失败' });
      const conv = loadConversation(payload.conversationId);
      if (!conv || conv.tid !== ctx.tenantId) return ack({ error: '会话不存在' });
      run("UPDATE conversations SET status = 'closed', closed_at = datetime('now') WHERE id = ?", [conv.id]);
      const sys = insertMessage(conv, { senderType: 'system', senderName: '系统', type: 'text', content: '会话已结束，感谢您的咨询', meta: { system: true, event: 'closed' } });
      io.to(`conv:${conv.id}`).emit('message:new', messagePayload(sys, conv));
      io.to(`conv:${conv.id}`).emit('conversation:closed', { conversationId: conv.id });
      io.to(`tenant:${conv.tid}`).emit('conversation:update', conversationSummary(conv.id));
      let summary = null;
      if (hasFeature(conv.plan, 'ai_bot')) {
        const messages = all('SELECT * FROM messages WHERE conversation_id = ? AND is_private = 0', [conv.id]);
        const visitor = get('SELECT * FROM visitors WHERE id = ?', [conv.visitor_id]);
        summary = ai.summarize(messages, visitor);
        run('UPDATE conversations SET ai_summary = ?, ai_need = ?, ai_suggestion = ?, ai_intent = ? WHERE id = ?',
          [summary.summary, summary.need, summary.suggestion, summary.intent, conv.id]);
        if (summary.tags.length) {
          const current = safeJson(visitor.tags, []);
          run('UPDATE visitors SET tags = ? WHERE id = ?', [JSON.stringify([...new Set([...current, ...summary.tags])]), visitor.id]);
        }
      }
      ack({ ok: true, summary });
    });

    socket.on('conversation:reopen', (payload = {}, ack = () => {}) => {
      if (!ctx || ctx.role !== 'agent') return ack({ error: '认证失败' });
      const conv = loadConversation(payload.conversationId);
      if (!conv || conv.tid !== ctx.tenantId) return ack({ error: '会话不存在' });
      run("UPDATE conversations SET status = 'open', closed_at = NULL WHERE id = ?", [conv.id]);
      io.to(`tenant:${conv.tid}`).emit('conversation:update', conversationSummary(conv.id));
      ack({ ok: true });
    });

    socket.on('agent:read', (payload = {}) => {
      if (!ctx || ctx.role !== 'agent') return;
      const conv = loadConversation(payload.conversationId);
      if (!conv || conv.tid !== ctx.tenantId) return;
      run('UPDATE conversations SET unread_agent = 0 WHERE id = ?', [conv.id]);
      run("UPDATE messages SET read_at = datetime('now') WHERE conversation_id = ? AND sender_type = 'visitor' AND read_at IS NULL", [conv.id]);
    });

    socket.on('disconnect', () => {
      if (!ctx) return;
      if (ctx.role === 'agent') {
        presence.removeAgent(ctx.tenantId, socket.id);
        io.to(`tenant:${ctx.tenantId}`).emit('presence:agents', { count: presence.onlineAgentCount(ctx.tenantId) });
      } else if (ctx.role === 'visitor') {
        presence.removeVisitor(ctx.site.id, socket.id);
        io.to(`tenant:${ctx.site.tenant_id}`).emit('presence:visitors', { siteId: ctx.site.id, count: presence.visitorCount(ctx.site.id) });
      }
    });
  });
}

function summarizeConversation(conv) {
  return {
    id: conv.id,
    visitorId: conv.visitor_id,
    visitorName: conv.visitor_name || '访客',
    visitorPhone: conv.visitor_phone,
    vid: conv.vid,
    province: conv.province,
    city: conv.city,
    device: conv.device,
    browser: conv.browser,
    os: conv.os,
    intentScore: conv.intent_score,
    intentLevel: conv.intent_level,
    pageviewCount: conv.pageview_count,
    source: conv.source,
    subject: conv.subject,
    status: conv.status,
    agentId: conv.agent_id,
    unreadAgent: conv.unread_agent,
    lastMessageAt: conv.last_message_at,
    createdAt: conv.created_at,
    trackingConsent: !!conv.tracking_consent
  };
}

function conversationSummary(id) {
  const conv = loadConversation(id);
  if (!conv) return null;
  const last = get('SELECT content, sender_type, type, created_at FROM messages WHERE conversation_id = ? ORDER BY id DESC LIMIT 1', [id]);
  return { ...summarizeConversation(conv), lastMessage: last ? last.content : '', lastSender: last ? last.sender_type : '' };
}

module.exports = { init, loadConversation, conversationSummary, summarizeConversation };
