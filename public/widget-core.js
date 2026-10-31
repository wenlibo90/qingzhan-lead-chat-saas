/*! Qingke SaaS Widget core v1.0 */
(function () {
  'use strict';
  var CONF = window.__QZ_CONFIG__ || {};
  var KEY = CONF.key || '';
  var BASE = CONF.base || location.origin;
  var LOCALES = {
    'zh-CN': { title: '在线客服', welcome: '您好，有什么可以帮您？', subtitle: '通常 1 分钟内回复', offline: '当前离线，可留言', powered: '由轻客服 SaaS 提供技术支持', faq: '自助帮助', close: '收起', sendFile: '发送文件', recording: '录屏反馈', input: '输入消息...', send: '发送', leave: '留言给我们', name: '称呼 *', phone: '手机号 *', message: '留言内容 *', submitMsg: '提交留言', submitted: '留言已提交', submittedDesc: '我们会在 1 个工作日内联系您，也可以继续查看常见问题。', viewFaq: '查看常见问题', faqIntro: '先看看有没有你关心的问题，解决不了再转人工。', toAgent: '没解决，转人工客服', ratingTitle: '这次咨询满意吗？', ratingDesc: '你的评价会帮助我们做得更好', ratingPlaceholder: '补充一句评价（选填）', submitRating: '提交评价', thanks: '感谢你的评价', formSubmitted: '已提交表单：', submit: '提交', submitting: '提交中...', submitFailed: '提交失败', recordingSent: '录屏已发送给客服', proactiveSuccess: '提交成功', proactiveDesc: '顾问会尽快联系你，也可以直接开始咨询。', startChat: '开始咨询' },
    'zh-TW': { title: '線上客服', welcome: '您好，有什麼可以幫您？', subtitle: '通常 1 分鐘內回覆', offline: '目前離線，可留言', powered: '由輕客服 SaaS 提供技術支援', faq: '自助幫助', close: '收起', sendFile: '傳送檔案', recording: '錄屏回饋', input: '輸入訊息...', send: '傳送', leave: '留言給我們', name: '稱呼 *', phone: '手機號 *', message: '留言內容 *', submitMsg: '提交留言', submitted: '留言已提交', submittedDesc: '我們會在 1 個工作日內聯絡您，也可以繼續查看常見問題。', viewFaq: '查看常見問題', faqIntro: '先看看有沒有你關心的問題，解決不了再轉人工。', toAgent: '沒解決，轉人工客服', ratingTitle: '這次諮詢滿意嗎？', ratingDesc: '你的評價會幫助我們做得更好', ratingPlaceholder: '補充一句評價（選填）', submitRating: '提交評價', thanks: '感謝你的評價', formSubmitted: '已提交表單：', submit: '提交', submitting: '提交中...', submitFailed: '提交失敗', recordingSent: '錄屏已傳送給客服', proactiveSuccess: '提交成功', proactiveDesc: '顧問會盡快聯絡你，也可以直接開始諮詢。', startChat: '開始諮詢' },
    en: { title: 'Live Support', welcome: 'Hi, how can we help?', subtitle: 'Usually replies within 1 minute', offline: 'We are offline. Leave a message.', powered: 'Powered by Qingke SaaS', faq: 'Help Center', close: 'Close', sendFile: 'Send file', recording: 'Screen recording', input: 'Type a message...', send: 'Send', leave: 'Leave us a message', name: 'Name *', phone: 'Phone *', message: 'Message *', submitMsg: 'Send message', submitted: 'Message sent', submittedDesc: 'We will contact you within one business day. You can also browse our FAQs.', viewFaq: 'View FAQs', faqIntro: 'Browse common questions first. If you still need help, talk to our team.', toAgent: 'Talk to a human', ratingTitle: 'How was this conversation?', ratingDesc: 'Your feedback helps us improve', ratingPlaceholder: 'Add a comment (optional)', submitRating: 'Submit rating', thanks: 'Thank you for your feedback', formSubmitted: 'Form submitted: ', submit: 'Submit', submitting: 'Submitting...', submitFailed: 'Submission failed', recordingSent: 'Recording sent to support', proactiveSuccess: 'Submitted', proactiveDesc: 'Our team will contact you soon. You can also start a chat now.', startChat: 'Start chat' },
    ja: { title: 'オンラインサポート', welcome: 'こんにちは。どのようなご用件でしょうか？', subtitle: '通常 1 分以内に返信します', offline: '現在オフラインです。メッセージを残せます。', powered: 'Qingke SaaS 提供', faq: 'ヘルプセンター', close: '閉じる', sendFile: 'ファイルを送信', recording: '画面録画', input: 'メッセージを入力...', send: '送信', leave: 'メッセージを残す', name: 'お名前 *', phone: '電話番号 *', message: 'メッセージ *', submitMsg: '送信する', submitted: '送信しました', submittedDesc: '1 営業日以内にご連絡します。よくある質問もご覧いただけます。', viewFaq: 'よくある質問を見る', faqIntro: 'まずよくある質問をご確認ください。解決しない場合は担当者におつなぎします。', toAgent: '担当者に相談する', ratingTitle: '今回の対応はいかがでしたか？', ratingDesc: 'ご意見はサービス改善に役立てます', ratingPlaceholder: 'コメント（任意）', submitRating: '評価を送信', thanks: 'ご評価ありがとうございます', formSubmitted: 'フォーム送信済み：', submit: '送信', submitting: '送信中...', submitFailed: '送信に失敗しました', recordingSent: '画面録画を送信しました', proactiveSuccess: '送信しました', proactiveDesc: '担当者よりご連絡します。今すぐチャットも開始できます。', startChat: 'チャットを開始' },
    ko: { title: '온라인 상담', welcome: '안녕하세요. 무엇을 도와드릴까요?', subtitle: '보통 1분 이내에 답변합니다', offline: '현재 오프라인입니다. 메시지를 남겨주세요.', powered: 'Qingke SaaS 제공', faq: '도움말 센터', close: '닫기', sendFile: '파일 보내기', recording: '화면 녹화', input: '메시지를 입력하세요...', send: '보내기', leave: '메시지 남기기', name: '이름 *', phone: '전화번호 *', message: '메시지 *', submitMsg: '메시지 보내기', submitted: '메시지가 전송되었습니다', submittedDesc: '영업일 기준 1일 이내에 연락드리겠습니다. 자주 묻는 질문도 확인할 수 있습니다.', viewFaq: '자주 묻는 질문', faqIntro: '먼저 자주 묻는 질문을 확인해 주세요. 해결되지 않으면 상담원에게 연결합니다.', toAgent: '상담원 연결', ratingTitle: '상담에 만족하셨나요?', ratingDesc: '의견은 서비스 개선에 도움이 됩니다', ratingPlaceholder: '의견을 남겨주세요 (선택)', submitRating: '평가 보내기', thanks: '평가해 주셔서 감사합니다', formSubmitted: '양식 제출됨: ', submit: '제출', submitting: '제출 중...', submitFailed: '제출 실패', recordingSent: '화면 녹화를 전송했습니다', proactiveSuccess: '제출되었습니다', proactiveDesc: '담당자가 곧 연락드립니다. 지금 바로 상담을 시작할 수도 있습니다.', startChat: '상담 시작' }
  };
  function t(key, fallback) {
    var lang = (widget && widget.locale) || 'zh-CN';
    var dict = LOCALES[lang] || LOCALES['zh-CN'];
    return dict[key] || LOCALES['zh-CN'][key] || fallback || '';
  }
  var QUEUE = CONF.queue || [];
  var LEGACY_API = CONF.api || null;
  if (!KEY || window.Qingzhan && window.Qingzhan.__coreLoaded) return;
  if (window.Qingzhan) window.Qingzhan.__coreLoaded = true;

  var LS = {
    get: function (k, d) { try { var v = localStorage.getItem(k); return v == null ? d : v; } catch (e) { return d; } },
    set: function (k, v) { try { localStorage.setItem(k, v); } catch (e) { } },
    del: function (k) { try { localStorage.removeItem(k); } catch (e) { } }
  };
  var SS = {
    get: function (k, d) { try { var v = sessionStorage.getItem(k); return v == null ? d : v; } catch (e) { return d; } },
    set: function (k, v) { try { sessionStorage.setItem(k, v); } catch (e) { } }
  };

  var vid = LS.get('qz_vid_' + KEY, '');
  if (!vid) {
    vid = 'v_' + Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);
    LS.set('qz_vid_' + KEY, vid);
  }
  var consent = '1';
  var sid = SS.get('qz_sid_' + KEY, '');
  var prechatData = LS.get('qz_prechat_' + KEY, '');
  var visits = parseInt(LS.get('qz_visits_' + KEY, '0'), 10) || 0;

  var config = null;
  var widget = null;
  var ui = {};
  var socket = null;
  var connecting = false;
  var conversationId = null;
  var conversationStatus = null;
  var agent = null;
  var chatOpen = false;
  var unread = 0;
  var currentScreen = 'chat';
  var pageviewId = null;
  var pageEnteredAt = Date.now();
  var lastActivity = Date.now();
  var maxScroll = 0;
  var sentScroll = {};
  var exitIntent = false;
  var trackingOn = false;
  var identityReady = false;
  var rateTimer = null;
  var rulesTimer = null;
  var shownRuleIds = {};
  var pendingSend = null;
  var modalOpen = false;

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function el(tag, attrs, html) {
    var n = document.createElement(tag);
    if (attrs) Object.keys(attrs).forEach(function (k) {
      if (k === 'class') n.className = attrs[k];
      else if (k === 'html') n.innerHTML = attrs[k];
      else if (k === 'text') n.textContent = attrs[k];
      else n.setAttribute(k, attrs[k]);
    });
    if (html != null) n.innerHTML = html;
    return n;
  }
  function timeText(s) {
    if (!s) return '';
    var d = new Date(String(s).replace(' ', 'T') + (String(s).indexOf('Z') > -1 ? '' : 'Z'));
    if (isNaN(d.getTime())) d = new Date(s);
    var h = d.getHours(), m = d.getMinutes();
    return (h < 10 ? '0' : '') + h + ':' + (m < 10 ? '0' : '') + m;
  }
  function fingerprint() {
    var raw = [navigator.userAgent, navigator.language, screen.width, screen.height, screen.colorDepth, new Date().getTimezoneOffset(), navigator.hardwareConcurrency || 0, navigator.platform || ''].join('|');
    var h = 5381;
    for (var i = 0; i < raw.length; i++) h = ((h << 5) + h + raw.charCodeAt(i)) >>> 0;
    return 'fp_' + h.toString(36);
  }
  var FP = fingerprint();
  var DEVICE = (function () {
    var ua = navigator.userAgent;
    var browser = 'Other';
    if (/MicroMessenger/i.test(ua)) browser = 'WeChat';
    else if (/Edg\//i.test(ua)) browser = 'Edge';
    else if (/Chrome\//i.test(ua)) browser = 'Chrome';
    else if (/Safari\//i.test(ua) && /Version\//i.test(ua)) browser = 'Safari';
    else if (/Firefox\//i.test(ua)) browser = 'Firefox';
    var os = 'Other';
    if (/Windows/i.test(ua)) os = 'Windows';
    else if (/iPhone|iPad|iPod/i.test(ua)) os = 'iOS';
    else if (/Android/i.test(ua)) os = 'Android';
    else if (/Mac OS X/i.test(ua)) os = 'macOS';
    else if (/Linux/i.test(ua)) os = 'Linux';
    var type = /iPad|Tablet/i.test(ua) ? 'tablet' : /Mobile|Android|iPhone/i.test(ua) ? 'mobile' : 'desktop';
    return { type: type, browser: browser, os: os, language: navigator.language || 'zh-CN', screen: screen.width + 'x' + screen.height };
  })();

  function utm(name) {
    try { return new URL(location.href).searchParams.get(name) || ''; } catch (e) { return ''; }
  }
  function consentAllowed() {
    if (consent === '1') return true;
    if (consent === '0') return false;
    return !(widget && widget.compliance && widget.compliance.enabled);
  }
  function basePayload() {
    return {
      key: KEY, vid: vid, sid: sid, consent: consentAllowed(),
      fingerprint: FP, device: DEVICE, referrer: document.referrer || '',
      utm_source: utm('utm_source'), utm_medium: utm('utm_medium'), utm_campaign: utm('utm_campaign'),
      utm_term: utm('utm_term'), utm_content: utm('utm_content'),
      url: location.href, title: document.title
    };
  }
  function api(path, opts) {
    opts = opts || {};
    return fetch(BASE + path, {
      method: opts.method || 'POST',
      headers: Object.assign({ 'Content-Type': 'application/json' }, opts.headers || {}),
      body: opts.body ? JSON.stringify(opts.body) : undefined,
      keepalive: !!opts.keepalive
    }).then(function (r) {
      return r.json().catch(function () { return {}; }).then(function (data) {
        if (!r.ok) {
          var err = new Error(data.error || '请求失败');
          err.status = r.status;
          err.data = data;
          throw err;
        }
        return data;
      });
    });
  }

  // ---------------- tracking ----------------
  function startTracking() {
    if (trackingOn || !config || config.blocked) return;
    if (consent === '0') return;
    if (widget && widget.compliance && widget.compliance.enabled && consent == null) return;
    trackingOn = true;
    SS.set('qz_visits_' + KEY, String(visits + 1));
    api('/api/public/session', {
      body: Object.assign(basePayload(), { consent: consent !== '0' })
    }).then(function (res) {
      if (res.blocked) { trackingOn = false; return; }
      identityReady = true;
      if (res.vid && res.vid !== vid) { vid = res.vid; LS.set('qz_vid_' + KEY, vid); }
      if (res.sid) { sid = String(res.sid); SS.set('qz_sid_' + KEY, sid); }
      sendPageview();
    }).catch(function () { trackingOn = false; });
    bindTracking();
    startVitals();
    startRuleEngine();
  }

  function sendPageview() {
    if (!trackingOn) return;
    pageEnteredAt = Date.now();
    sentScroll = {};
    api('/api/public/track', {
      body: Object.assign(basePayload(), { type: 'pageview', consent: consent !== '0' })
    }).then(function (res) {
      if (res.pageviewId) pageviewId = res.pageviewId;
      if (res.vid && res.vid !== vid) { vid = res.vid; LS.set('qz_vid_' + KEY, vid); }
      if (res.sid) { sid = String(res.sid); SS.set('qz_sid_' + KEY, sid); }
    }).catch(function () { });
  }
  function flushDwell() {
    if (!trackingOn) return;
    var ms = Date.now() - pageEnteredAt;
    if (ms < 1500) return;
    var body = Object.assign(basePayload(), { type: 'dwell', dwell: ms, pageviewId: pageviewId });
    try {
      if (navigator.sendBeacon) {
        navigator.sendBeacon(BASE + '/api/public/track', new Blob([JSON.stringify(body)], { type: 'application/json' }));
      } else {
        api('/api/public/track', { body: body, keepalive: true }).catch(function () { });
      }
    } catch (e) { }
  }
  function trackEvent(name, payload, type) {
    if (!trackingOn) return;
    api('/api/public/track', {
      body: Object.assign(basePayload(), { type: type || 'event', name: name, payload: payload || {} })
    }).catch(function () { });
  }
  function beaconEvent(name, payload, type) {
    if (!trackingOn) return;
    var body = Object.assign(basePayload(), { type: type || 'event', name: name, payload: payload || {} });
    try {
      if (navigator.sendBeacon) {
        navigator.sendBeacon(BASE + '/api/public/track', new Blob([JSON.stringify(body)], { type: 'application/json' }));
        return;
      }
    } catch (e) { }
    trackEvent(name, payload, type);
  }

  var vitalsStarted = false;
  function startVitals() {
    if (vitalsStarted || !window.PerformanceObserver) return;
    vitalsStarted = true;
    var lcp = 0, cls = 0, inp = 0;
    function rating(metric, value) {
      if (metric === 'LCP') return value <= 2500 ? 'good' : value <= 4000 ? 'needs-improvement' : 'poor';
      if (metric === 'CLS') return value <= 0.1 ? 'good' : value <= 0.25 ? 'needs-improvement' : 'poor';
      if (metric === 'INP') return value <= 200 ? 'good' : value <= 500 ? 'needs-improvement' : 'poor';
      if (metric === 'TTFB') return value <= 800 ? 'good' : value <= 1800 ? 'needs-improvement' : 'poor';
      if (metric === 'FCP') return value <= 1800 ? 'good' : value <= 3000 ? 'needs-improvement' : 'poor';
      return '';
    }
    function report(metric, value) {
      if (!value && value !== 0) return;
      beaconEvent('web_vital_' + metric.toLowerCase(), {
        metric: metric,
        value: Math.round(value * 1000) / 1000,
        rating: rating(metric, value),
        path: location.pathname
      }, 'performance');
    }
    try {
      new PerformanceObserver(function (list) {
        var entries = list.getEntries();
        var last = entries[entries.length - 1];
        if (last) lcp = last.startTime;
      }).observe({ type: 'largest-contentful-paint', buffered: true });
    } catch (e) { }
    try {
      new PerformanceObserver(function (list) {
        list.getEntries().forEach(function (entry) {
          if (!entry.hadRecentInput) cls += entry.value;
        });
      }).observe({ type: 'layout-shift', buffered: true });
    } catch (e) { }
    try {
      new PerformanceObserver(function (list) {
        list.getEntries().forEach(function (entry) {
          if (entry.interactionId && entry.duration > inp) inp = entry.duration;
        });
      }).observe({ type: 'event', buffered: true, durationThreshold: 40 });
    } catch (e) { }
    try {
      new PerformanceObserver(function (list) {
        list.getEntries().forEach(function (entry) {
          if (entry.name === 'first-contentful-paint') report('FCP', entry.startTime);
        });
      }).observe({ type: 'paint', buffered: true });
    } catch (e) { }
    try {
      var nav = performance.getEntriesByType('navigation')[0];
      if (nav) report('TTFB', nav.responseStart);
    } catch (e) { }
    var vitalsFlushed = false;
    function flushVitals() {
      if (vitalsFlushed) return;
      vitalsFlushed = true;
      if (lcp) report('LCP', lcp);
      report('CLS', cls);
      if (inp) report('INP', inp);
    }
    window.addEventListener('pagehide', flushVitals);
    document.addEventListener('visibilitychange', function () {
      if (document.visibilityState === 'hidden') flushVitals();
    });
  }

  var clickHandler = null, scrollHandler = null, activityHandler = null, exitHandler = null, routeHandler = null;
  function bindTracking() {
    if (clickHandler) return;
    clickHandler = function (e) {
      lastActivity = Date.now();
      try {
        if (e.target.closest && e.target.closest('#qz-widget-host')) return;
        var t = e.target;
        var text = (t.innerText || t.textContent || '').trim().slice(0, 40) || t.getAttribute('aria-label') || t.tagName;
        var payload = { tag: t.tagName, text: text, href: t.getAttribute && (t.getAttribute('href') || ''), path: location.pathname };
        trackEvent(text, payload, 'click');
      } catch (err) { }
    };
    document.addEventListener('click', clickHandler, true);

    scrollHandler = function () {
      lastActivity = Date.now();
      maxScroll = Math.max(maxScroll, (window.scrollY || window.pageYOffset || 0));
      var doc = document.documentElement;
      var height = Math.max(1, doc.scrollHeight - window.innerHeight);
      var pct = Math.round((maxScroll / height) * 100);
      [25, 50, 75, 100].forEach(function (m) {
        if (pct >= m && !sentScroll[m]) {
          sentScroll[m] = true;
          trackEvent('scroll_' + m, { depth: m, path: location.pathname }, 'scroll');
        }
      });
    };
    window.addEventListener('scroll', scrollHandler, { passive: true });

    activityHandler = function () { lastActivity = Date.now(); };
    ['mousemove', 'keydown', 'touchstart', 'click'].forEach(function (ev) {
      document.addEventListener(ev, activityHandler, { passive: true });
    });

    if (!('ontouchstart' in window)) {
      exitHandler = function (e) {
        if (e.clientY <= 0 && !exitIntent) {
          exitIntent = true;
          evaluateRules(true);
        }
      };
      document.addEventListener('mouseout', exitHandler);
    }

    routeHandler = function () {
      flushDwell();
      setTimeout(function () {
        if (location.href !== config._lastUrl) {
          config._lastUrl = location.href;
          maxScroll = 0;
          sendPageview();
        }
      }, 120);
    };
    window.addEventListener('popstate', routeHandler);
    ['pushState', 'replaceState'].forEach(function (m) {
      var orig = history[m];
      history[m] = function () {
        var ret = orig.apply(this, arguments);
        routeHandler();
        return ret;
      };
    });
    window.addEventListener('pagehide', flushDwell);
    document.addEventListener('visibilitychange', function () { if (document.visibilityState === 'hidden') flushDwell(); });
  }

  // ---------------- rules ----------------
  function startRuleEngine() {
    if (!config || !config.triggers || !config.triggers.length || rulesTimer) return;
    rulesTimer = setInterval(function () { evaluateRules(false); }, 4500);
    setTimeout(function () { evaluateRules(false); }, 2500);
  }
  function evaluateRules(forceExit) {
    if (!config || !config.triggers || !config.triggers.length || !trackingOn) return;
    if (chatOpen) return;
    if (widget && widget.licensed && !widget.licensed.triggers) return;
    var ctx = {
      url: location.href,
      dwell: Math.round((Date.now() - pageEnteredAt) / 1000),
      scrollDepth: maxScroll > 0 ? Math.min(100, Math.round((maxScroll / Math.max(1, document.documentElement.scrollHeight - window.innerHeight)) * 100)) : 0,
      idle: Math.round((Date.now() - lastActivity) / 1000),
      exitIntent: !!(forceExit || exitIntent),
      device: DEVICE.type,
      isNew: visits < 1
    };
    for (var i = 0; i < config.triggers.length; i++) {
      var rule = config.triggers[i];
      var c = rule.conditions || {};
      if (shownRuleIds[rule.id]) continue;
      if (c.pageMatch) {
        var ok = c.pageMatchType === 'exact' ? ctx.url === c.pageMatch : ctx.url.indexOf(c.pageMatch) > -1;
        if (!ok) continue;
      }
      if (c.dwell && ctx.dwell < Number(c.dwell)) continue;
      if (c.scrollDepth && ctx.scrollDepth < Number(c.scrollDepth)) continue;
      if (c.idle && ctx.idle < Number(c.idle)) continue;
      if (c.exitIntent && !ctx.exitIntent) continue;
      if (c.device && c.device !== 'all' && c.device !== ctx.device) continue;
      if (c.visitorType && c.visitorType !== 'all') {
        if (c.visitorType === 'new' && !ctx.isNew) continue;
        if (c.visitorType === 'returning' && ctx.isNew) continue;
      }
      shownRuleIds[rule.id] = true;
      fireRule(rule, ctx);
      break;
    }
  }
  function fireRule(rule, ctx) {
    api('/api/public/trigger-check', {
      body: { key: KEY, vid: vid, url: ctx.url, dwell: ctx.dwell, scrollDepth: ctx.scrollDepth, idle: ctx.idle, exitIntent: ctx.exitIntent, device: ctx.device }
    }).then(function (res) {
      if (!res || !res.matched) return;
      var actions = res.matched.actions || {};
      if (actions.delay) {
        setTimeout(function () { showProactive(actions); }, Math.min(10, Number(actions.delay)) * 1000);
      } else {
        showProactive(actions);
      }
    }).catch(function () { });
  }

  // ---------------- UI ----------------
  function icon(name, size) {
    var s = size || 22;
    var paths = {
      chat: '<path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/>',
      headset: '<path d="M3 18v-6a9 9 0 0 1 18 0v6"/><path d="M21 19a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3zM3 19a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-3a2 2 0 0 0-2-2H3z"/>',
      message: '<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/><path d="M8 9h8M8 13h5"/>',
      spark: '<path d="M12 2l1.9 5.8L20 9.7l-4.9 3.6L17 20l-5-3.6L7 20l1.9-6.7L4 9.7l6.1-1.9z"/>',
      close: '<path d="M18 6L6 18M6 6l12 12"/>',
      send: '<path d="M22 2L11 13M22 2l-7 20-4-9-9-4z"/>',
      paperclip: '<path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"/>',
      book: '<path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>',
      video: '<path d="M23 7l-7 5 7 5V7z"/><rect x="1" y="5" width="15" height="14" rx="2"/>',
      download: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="M7 10l5 5 5-5M12 15V3"/>',
      star: '<path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01z"/>',
      minimize: '<path d="M8 3v3a2 2 0 0 1-2 2H3M21 8h-3a2 2 0 0 1-2-2V3M3 16h3a2 2 0 0 1 2 2v3M16 21v-3a2 2 0 0 1 2-2h3"/>',
      check: '<path d="M20 6L9 17l-5-5"/>',
      arrow: '<path d="M5 12h14M12 5l7 7-7 7"/>'
    };
    if (name === 'logo') {
      return '<svg viewBox="0 0 32 32" width="' + s + '" height="' + s + '" fill="none"><rect x="2" y="2" width="28" height="28" rx="9" fill="currentColor" opacity=".18"/><path d="M9 11.5A3.5 3.5 0 0 1 12.5 8h7A3.5 3.5 0 0 1 23 11.5v5a3.5 3.5 0 0 1-3.5 3.5H15l-4.5 3v-3h-1.5A3.5 3.5 0 0 1 9 16.5z" fill="currentColor"/><circle cx="13" cy="14" r="1.2" fill="white"/><circle cx="16.5" cy="14" r="1.2" fill="white"/><circle cx="20" cy="14" r="1.2" fill="white"/></svg>';
    }
    return '<svg viewBox="0 0 24 24" width="' + s + '" height="' + s + '" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' + (paths[name] || paths.chat) + '</svg>';
  }

  function css() {
    var primary = widget.primaryColor || '#2563eb';
    var dark = widget.theme === 'dark' || (widget.theme === 'auto' && window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches);
    var bg = dark ? '#0f172a' : '#ffffff';
    var panel = dark ? '#111c33' : '#f8fbff';
    var text = dark ? '#e2e8f0' : '#111827';
    var muted = dark ? '#94a3b8' : '#64748b';
    var line = dark ? 'rgba(148,163,184,.18)' : 'rgba(148,163,184,.26)';
    return '' +
      ':host{all:initial;--qz-primary:' + primary + ';--qz-text:' + text + ';--qz-muted:' + muted + ';--qz-line:' + line + ';--qz-bg:' + bg + ';--qz-panel:' + panel + ';}' +
      '*{box-sizing:border-box;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI","Noto Sans SC","Microsoft YaHei",sans-serif;}' +
      '.qz-launcher{position:fixed;z-index:2147483000;width:58px;height:58px;border-radius:50%;border:none;cursor:pointer;display:grid;place-items:center;color:#fff;background:linear-gradient(135deg,' + primary + ',#0ea5e9);box-shadow:0 14px 34px rgba(37,99,235,.35),0 2px 8px rgba(15,23,42,.12);transition:transform .18s ease,box-shadow .18s ease;}' +
      '.qz-launcher:hover{transform:translateY(-2px) scale(1.03);box-shadow:0 18px 42px rgba(37,99,235,.42);}' +
      '.qz-launcher svg{pointer-events:none;}' +
      '.qz-launcher.qz-breath::before{content:"";position:absolute;inset:-6px;border-radius:50%;border:2px solid ' + primary + ';opacity:.35;animation:qzBreath 2.4s ease-out infinite;}' +
      '.qz-launcher.qz-bounce{animation:qzBounce 2.2s ease infinite;}' +
      '@keyframes qzBreath{0%{transform:scale(.85);opacity:.4}70%{transform:scale(1.35);opacity:0}100%{opacity:0}}' +
      '@keyframes qzBounce{0%,20%,50%,80%,100%{transform:translateY(0)}40%{transform:translateY(-7px)}60%{transform:translateY(-4px)}}' +
      '.qz-badge{position:absolute;top:-3px;right:-3px;min-width:20px;height:20px;padding:0 5px;border-radius:999px;background:#ef4444;color:#fff;font-size:11px;font-weight:700;display:grid;place-items:center;border:2px solid #fff;}' +
      '.qz-hint{position:fixed;z-index:2147482998;max-width:240px;padding:11px 14px;border-radius:14px 14px 4px 14px;background:var(--qz-bg);color:var(--qz-text);box-shadow:0 12px 34px rgba(15,23,42,.16);font-size:13px;line-height:1.5;cursor:pointer;border:1px solid var(--qz-line);animation:qzFade .3s ease;}' +
      '.qz-hint b{display:block;font-size:12px;color:var(--qz-primary);margin-bottom:2px;}' +
      '.qz-panel{position:fixed;z-index:2147483000;width:min(384px,calc(100vw - 28px));height:min(620px,calc(100vh - 110px));background:var(--qz-bg);border-radius:22px;box-shadow:0 30px 80px rgba(15,23,42,.28),0 4px 16px rgba(15,23,42,.08);display:flex;flex-direction:column;overflow:hidden;border:1px solid var(--qz-line);opacity:0;transform:translateY(14px) scale(.98);pointer-events:none;transition:opacity .22s ease,transform .22s ease;}' +
      '.qz-panel.qz-open{opacity:1;transform:none;pointer-events:auto;}' +
      '.qz-head{position:relative;padding:16px 16px 14px;background:linear-gradient(135deg,' + primary + ',#0ea5e9);color:#fff;flex-shrink:0;}' +
      '.qz-head-top{display:flex;align-items:center;gap:10px;}' +
      '.qz-avatar{width:40px;height:40px;border-radius:50%;background:rgba(255,255,255,.22);display:grid;place-items:center;font-weight:700;font-size:15px;flex-shrink:0;overflow:hidden;border:1px solid rgba(255,255,255,.3);}' +
      '.qz-head-name{font-size:15px;font-weight:700;line-height:1.2;display:flex;align-items:center;gap:6px;}' +
      '.qz-dot{width:7px;height:7px;border-radius:50%;background:#4ade80;box-shadow:0 0 0 3px rgba(74,222,128,.22);display:inline-block;}' +
      '.qz-dot.off{background:#fbbf24;box-shadow:0 0 0 3px rgba(251,191,36,.2);}' +
      '.qz-head-sub{font-size:11px;opacity:.85;margin-top:2px;}' +
      '.qz-head-actions{margin-left:auto;display:flex;gap:2px;}' +
      '.qz-icon-btn{width:32px;height:32px;border-radius:9px;border:none;background:rgba(255,255,255,.12);color:#fff;display:grid;place-items:center;cursor:pointer;transition:background .15s;}' +
      '.qz-icon-btn:hover{background:rgba(255,255,255,.24);}' +
      '.qz-body{flex:1;min-height:0;display:flex;flex-direction:column;background:var(--qz-panel);position:relative;}' +
      '.qz-scroll{flex:1;min-height:0;overflow-y:auto;padding:16px 14px 8px;scroll-behavior:smooth;}' +
      '.qz-scroll::-webkit-scrollbar{width:5px}.qz-scroll::-webkit-scrollbar-thumb{background:rgba(148,163,184,.35);border-radius:9px}' +
      '.qz-welcome{background:var(--qz-bg);border:1px solid var(--qz-line);border-radius:14px;padding:12px 14px;font-size:13px;line-height:1.65;color:var(--qz-text);margin-bottom:10px;box-shadow:0 4px 14px rgba(15,23,42,.04);}' +
      '.qz-msg{display:flex;gap:7px;margin-bottom:12px;align-items:flex-end;animation:qzFade .18s ease;}' +
      '.qz-msg.qz-me{flex-direction:row-reverse;}' +
      '.qz-msg-avatar{width:26px;height:26px;border-radius:50%;background:linear-gradient(135deg,' + primary + ',#0ea5e9);color:#fff;display:grid;place-items:center;font-size:11px;font-weight:700;flex-shrink:0;}' +
      '.qz-msg.qz-me .qz-msg-avatar{background:#cbd5e1;color:#475569;}' +
      '.qz-bubble{max-width:78%;padding:9px 12px;border-radius:14px 14px 14px 4px;background:var(--qz-bg);color:var(--qz-text);font-size:13px;line-height:1.6;box-shadow:0 3px 10px rgba(15,23,42,.05);word-break:break-word;border:1px solid var(--qz-line);}' +
      '.qz-msg.qz-me .qz-bubble{background:linear-gradient(135deg,' + primary + ',#2563eb);color:#fff;border:none;border-radius:14px 14px 4px 14px;box-shadow:0 6px 16px rgba(37,99,235,.22);}' +
      '.qz-bubble img{max-width:100%;border-radius:9px;display:block;cursor:zoom-in;}' +
      '.qz-trans{display:inline-block;margin-left:7px;border:none;background:rgba(37,99,235,.09);color:#2563eb;border-radius:6px;font-size:10px;padding:1px 5px;cursor:pointer;vertical-align:middle;}' +
      '.qz-trans-text{margin-top:6px;padding-top:6px;border-top:1px dashed rgba(148,163,184,.4);font-size:12px;color:#64748b;line-height:1.6;}' +
      '.qz-file{display:flex;align-items:center;gap:8px;text-decoration:none;color:inherit;}' +
      '.qz-file-icon{width:32px;height:32px;border-radius:8px;background:rgba(37,99,235,.1);color:' + primary + ';display:grid;place-items:center;flex-shrink:0;}' +
      '.qz-file-name{font-size:12px;font-weight:600;max-width:150px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}' +
      '.qz-file-size{font-size:10px;color:var(--qz-muted);}' +
      '.qz-time{font-size:10px;color:var(--qz-muted);text-align:center;margin:4px 0 10px;}' +
      '.qz-sys{text-align:center;font-size:11px;color:var(--qz-muted);margin:8px 0;padding:0 20px;line-height:1.5;}' +
      '.qz-typing{display:flex;gap:4px;padding:10px 14px;width:max-content;background:var(--qz-bg);border:1px solid var(--qz-line);border-radius:12px;margin-bottom:10px;}' +
      '.qz-typing i{width:5px;height:5px;border-radius:50%;background:#94a3b8;animation:qzType 1s infinite;}' +
      '.qz-typing i:nth-child(2){animation-delay:.15s}.qz-typing i:nth-child(3){animation-delay:.3s}' +
      '@keyframes qzType{0%,60%,100%{transform:translateY(0);opacity:.4}30%{transform:translateY(-3px);opacity:1}}' +
      '.qz-quick{display:flex;gap:6px;flex-wrap:wrap;padding:0 14px 8px;}' +
      '.qz-chip{padding:6px 11px;border-radius:999px;background:var(--qz-bg);border:1px solid var(--qz-line);font-size:12px;color:' + primary + ';cursor:pointer;white-space:nowrap;transition:all .15s;}' +
      '.qz-chip:hover{background:rgba(37,99,235,.08);border-color:rgba(37,99,235,.35);}' +
      '.qz-compose{padding:10px 12px 12px;border-top:1px solid var(--qz-line);background:var(--qz-bg);flex-shrink:0;}' +
      '.qz-inputrow{display:flex;align-items:flex-end;gap:6px;background:var(--qz-panel);border:1px solid var(--qz-line);border-radius:14px;padding:6px 6px 6px 10px;transition:border-color .15s;}' +
      '.qz-inputrow:focus-within{border-color:' + primary + ';box-shadow:0 0 0 3px rgba(37,99,235,.1);}' +
      '.qz-input{flex:1;border:none;outline:none;background:transparent;resize:none;font-size:13px;line-height:1.5;max-height:96px;color:var(--qz-text);padding:5px 0;font-family:inherit;}' +
      '.qz-input::placeholder{color:#94a3b8;}' +
      '.qz-send{width:32px;height:32px;border-radius:10px;border:none;background:linear-gradient(135deg,' + primary + ',#0ea5e9);color:#fff;display:grid;place-items:center;cursor:pointer;flex-shrink:0;transition:transform .12s;}' +
      '.qz-send:hover{transform:scale(1.05)}.qz-send:disabled{opacity:.45;cursor:not-allowed;}' +
      '.qz-tools{display:flex;align-items:center;gap:2px;margin-right:2px;}' +
      '.qz-tool{width:28px;height:28px;border-radius:8px;border:none;background:transparent;color:var(--qz-muted);display:grid;place-items:center;cursor:pointer;position:relative;}' +
      '.qz-tool:hover{background:rgba(148,163,184,.14);color:' + primary + ';}' +
      '.qz-tool.qz-rec{color:#ef4444;animation:qzBlink 1.2s infinite;}' +
      '@keyframes qzBlink{50%{opacity:.4}}' +
      '.qz-foot{text-align:center;font-size:10px;color:var(--qz-muted);padding:0 0 8px;background:var(--qz-bg);}' +
      '.qz-foot a{color:inherit;text-decoration:none;}' +
      '.qz-screen{position:absolute;inset:0;background:var(--qz-panel);z-index:5;overflow-y:auto;padding:20px 18px;display:flex;flex-direction:column;}' +
      '.qz-screen h3{font-size:16px;margin:0 0 4px;color:var(--qz-text);}' +
      '.qz-screen p{font-size:12px;color:var(--qz-muted);margin:0 0 16px;line-height:1.6;}' +
      '.qz-field{margin-bottom:12px;}' +
      '.qz-field label{display:block;font-size:12px;font-weight:600;color:var(--qz-text);margin-bottom:5px;}' +
      '.qz-field input,.qz-field select,.qz-field textarea{width:100%;padding:9px 11px;border-radius:10px;border:1px solid var(--qz-line);background:var(--qz-bg);color:var(--qz-text);font-size:13px;outline:none;font-family:inherit;}' +
      '.qz-field textarea{min-height:70px;resize:vertical;}' +
      '.qz-field input:focus,.qz-field select:focus,.qz-field textarea:focus{border-color:' + primary + ';box-shadow:0 0 0 3px rgba(37,99,235,.1);}' +
      '.qz-primary{width:100%;padding:11px;border:none;border-radius:11px;background:linear-gradient(135deg,' + primary + ',#0ea5e9);color:#fff;font-size:14px;font-weight:600;cursor:pointer;font-family:inherit;box-shadow:0 8px 20px rgba(37,99,235,.22);}' +
      '.qz-primary:disabled{opacity:.6;cursor:not-allowed;}' +
      '.qz-ghost{width:100%;padding:10px;border:1px solid var(--qz-line);border-radius:11px;background:transparent;color:var(--qz-text);font-size:13px;cursor:pointer;margin-top:8px;font-family:inherit;}' +
      '.qz-small{font-size:11px;color:var(--qz-muted);text-align:center;margin-top:12px;line-height:1.6;}' +
      '.qz-faq-cat{font-size:12px;font-weight:700;color:var(--qz-muted);margin:14px 0 7px;text-transform:uppercase;letter-spacing:.04em;}' +
      '.qz-faq-item{width:100%;text-align:left;padding:10px 12px;border-radius:10px;border:1px solid var(--qz-line);background:var(--qz-bg);margin-bottom:6px;font-size:12.5px;color:var(--qz-text);cursor:pointer;display:flex;justify-content:space-between;gap:10px;align-items:center;font-family:inherit;}' +
      '.qz-faq-item:hover{border-color:' + primary + ';color:' + primary + ';}' +
      '.qz-faq-a{font-size:12.5px;line-height:1.7;color:var(--qz-text);background:var(--qz-bg);border:1px solid var(--qz-line);border-radius:10px;padding:12px;margin:6px 0 12px;white-space:pre-wrap;}' +
      '.qz-star{background:none;border:none;cursor:pointer;color:#cbd5e1;padding:2px;}' +
      '.qz-star.on{color:#f59e0b;}' +
      '.qz-rating{background:var(--qz-bg);border:1px solid var(--qz-line);border-radius:14px;padding:14px;margin:8px 0 14px;text-align:center;}' +
      '.qz-rating h4{margin:0 0 4px;font-size:13.5px;color:var(--qz-text);}' +
      '.qz-rating p{margin:0 0 10px;font-size:11.5px;color:var(--qz-muted);}' +
      '.qz-stars{display:flex;justify-content:center;gap:4px;margin-bottom:10px;}' +
      '.qz-rating textarea{width:100%;border:1px solid var(--qz-line);border-radius:9px;padding:8px;font-size:12px;min-height:52px;resize:none;margin-bottom:8px;background:var(--qz-panel);color:var(--qz-text);font-family:inherit;outline:none;}' +
      '.qz-proactive{position:fixed;z-index:2147483000;width:min(310px,calc(100vw - 30px));background:var(--qz-bg);border-radius:18px;box-shadow:0 22px 60px rgba(15,23,42,.24);border:1px solid var(--qz-line);overflow:hidden;animation:qzSlide .35s cubic-bezier(.2,.9,.3,1.1);}' +
      '.qz-proactive-head{padding:13px 15px 0;display:flex;align-items:center;gap:9px;}' +
      '.qz-proactive-avatar{width:30px;height:30px;border-radius:50%;background:linear-gradient(135deg,' + primary + ',#0ea5e9);color:#fff;display:grid;place-items:center;flex-shrink:0;}' +
      '.qz-proactive-title{font-size:13px;font-weight:700;color:var(--qz-text);}' +
      '.qz-proactive-close{margin-left:auto;border:none;background:transparent;color:#94a3b8;cursor:pointer;font-size:18px;line-height:1;padding:4px;}' +
      '.qz-proactive-body{padding:8px 15px 14px;font-size:12.5px;line-height:1.65;color:var(--qz-muted);}' +
      '.qz-proactive-body b{display:block;font-size:13px;color:var(--qz-text);margin-bottom:3px;}' +
      '.qz-proactive .qz-primary{margin-top:10px;padding:9px;font-size:13px;}' +
      '.qz-announce-top{position:fixed;top:0;left:0;right:0;z-index:2147482999;padding:9px 40px 9px 16px;font-size:12.5px;text-align:center;color:#fff;box-shadow:0 4px 16px rgba(15,23,42,.12);display:flex;align-items:center;justify-content:center;gap:10px;}' +
      '.qz-announce-top a{color:#fff;text-decoration:underline;font-weight:600;}' +
      '.qz-announce-top button{position:absolute;right:10px;top:50%;transform:translateY(-50%);background:transparent;border:none;color:#fff;opacity:.8;cursor:pointer;font-size:16px;padding:4px;}' +
      '.qz-announce-side{position:fixed;z-index:2147482997;width:250px;padding:14px 36px 14px 16px;border-radius:14px;font-size:12.5px;line-height:1.6;color:#fff;box-shadow:0 14px 36px rgba(15,23,42,.18);}' +
      '.qz-announce-side a{color:#fff;font-weight:700;display:block;margin-top:7px;font-size:11.5px;text-decoration:underline;text-underline-offset:3px;}' +
      '.qz-announce-side button{position:absolute;right:8px;top:8px;width:22px;height:22px;border:none;background:rgba(255,255,255,.16);border-radius:50%;color:#fff;cursor:pointer;font-size:14px;line-height:1;display:grid;place-items:center;}' +
      '.qz-toast{position:absolute;left:50%;bottom:90px;transform:translateX(-50%);background:rgba(15,23,42,.9);color:#fff;font-size:12px;padding:8px 14px;border-radius:999px;z-index:9;animation:qzFade .2s ease;max-width:86%;text-align:center;}' +
      '.qz-rec-indicator{position:absolute;top:76px;left:50%;transform:translateX(-50%);background:#ef4444;color:#fff;font-size:11px;padding:5px 12px;border-radius:999px;z-index:8;box-shadow:0 6px 18px rgba(239,68,68,.3);display:flex;align-items:center;gap:6px;}' +
      '.qz-imgview{position:absolute;inset:0;background:rgba(15,23,42,.92);z-index:20;display:grid;place-items:center;padding:20px;cursor:zoom-out;}' +
      '.qz-imgview img{max-width:100%;max-height:100%;border-radius:8px;}' +
      '@keyframes qzFade{from{opacity:0;transform:translateY(5px)}to{opacity:1;transform:none}}' +
      '@keyframes qzSlide{from{opacity:0;transform:translateY(18px) scale(.97)}to{opacity:1;transform:none}}' +
      '@media(max-width:640px){.qz-panel{inset:0!important;width:100%!important;height:100%!important;max-height:100vh;border-radius:0;border:none;}.qz-proactive{left:12px!important;right:12px!important;bottom:86px!important;width:auto;}.qz-announce-side{display:none!important;}}' +
      '@media(prefers-reduced-motion:reduce){.qz-launcher,.qz-panel,.qz-msg,.qz-hint,.qz-proactive{animation:none!important;transition:none!important;}}';
  }

  function mount() {
    var host = document.getElementById('qz-widget-host');
    if (host) return;
    host = el('div', { id: 'qz-widget-host' });
    host.style.cssText = 'all:initial;position:static;';
    document.body.appendChild(host);
    var shadow = host.attachShadow ? host.attachShadow({ mode: 'open' }) : host;
    var style = document.createElement('style');
    style.textContent = css();
    shadow.appendChild(style);
    ui.shadow = shadow;
    ui.host = host;
    ui.root = shadow;
    renderLauncher();
    if (widget.showBranding) { /* branding inside panel */ }
    renderAnnouncement();
    if (!widget.showBranding) { /* white label */ }
    // panel
    var panel = el('div', { class: 'qz-panel', role: 'dialog', 'aria-label': t('title') });
    shadow.appendChild(panel);
    ui.panel = panel;
    panel.innerHTML = panelHtml();
    bindPanel();
    applyPosition();
    flushQueue();
    window.Qingzhan = window.Qingzhan || {};
    window.Qingzhan.open = openChat;
    window.Qingzhan.close = closeChat;
    window.Qingzhan.toggle = function () { chatOpen ? closeChat() : openChat(); };
    window.Qingzhan.track = function (name, payload) { trackEvent(name, payload); };
    window.qz = window.qz || {};
    window.qz.open = openChat;
    window.qz.close = closeChat;
    window.qz.toggle = function () { chatOpen ? closeChat() : openChat(); };
    window.qz.track = function (name, payload) { trackEvent(name, payload); };
    window.Qingzhan.identify = function (data) {
      if (!data) return;
      if (data.phone) prechatData = JSON.stringify({ phone: data.phone, name: data.name || '' });
      if (data.name) prechatData = JSON.stringify(Object.assign(safeJson(prechatData, {}), { name: data.name }));
      LS.set('qz_prechat_' + KEY, prechatData);
    };
    window.Qingzhan.__ready = function () { };
    if (LEGACY_API) LEGACY_API.__coreReady = true;
  }

  function applyPosition() {
    var p = widget.position === 'left' ? 'left' : 'right';
    var side = Number(widget.offsetSide || 24);
    var bottom = Number(widget.offsetBottom || 24);
    var isMobile = window.innerWidth <= 640;
    var m = widget.mobile || {};
    var size = isMobile ? Number(m.size || 52) : Number(widget.buttonSize || 58);
    var b = isMobile ? Number(m.offsetBottom || 18) : bottom;
    var s = isMobile ? Number(m.offsetSide || 14) : side;
    ui.launcher.style.width = size + 'px';
    ui.launcher.style.height = size + 'px';
    ui.launcher.style.bottom = b + 'px';
    ui.launcher.style[p] = s + 'px';
    ui.launcher.style[p === 'left' ? 'right' : 'left'] = 'auto';
    if (ui.panel) {
      ui.panel.style.bottom = (b + size + 12) + 'px';
      ui.panel.style[p] = s + 'px';
      ui.panel.style[p === 'left' ? 'right' : 'left'] = 'auto';
    }
    if (ui.hint) {
      ui.hint.style.bottom = (b + size + 16) + 'px';
      ui.hint.style[p] = s + 'px';
      ui.hint.style[p === 'left' ? 'right' : 'left'] = 'auto';
    }
  }

  function renderLauncher() {
    var btn = el('button', { class: 'qz-launcher ' + (widget.animation === 'breath' ? 'qz-breath' : widget.animation === 'bounce' ? 'qz-bounce' : ''), 'aria-label': t('title') });
    btn.innerHTML = icon(widget.icon || 'headset', 26);
    var badge = el('span', { class: 'qz-badge', style: 'display:none' });
    btn.appendChild(badge);
    btn.addEventListener('click', function () { chatOpen ? closeChat() : openChat(); });
    ui.launcher = btn;
    ui.badge = badge;
    ui.root.appendChild(btn);
    var hint = el('div', { class: 'qz-hint' });
    hint.innerHTML = '<b>' + esc(widget.agentName || t('title')) + '</b>' + esc(widget.welcome || t('welcome'));
    hint.addEventListener('click', openChat);
    hint.style.display = 'none';
    ui.hint = hint;
    ui.root.appendChild(hint);
  }

  function panelHtml() {
    var branding = widget.showBranding ? '<div class="qz-foot">由 <a href="' + BASE + '/" target="_blank" rel="noopener">轻客服 SaaS</a> 提供技术支持</div>' : '';
    return '' +
      '<div class="qz-head">' +
      '<div class="qz-head-top">' +
      '<div class="qz-avatar">' + (!widget.showBranding ? icon('logo', 24) : esc((widget.agentName || t('title')).slice(0, 1))) + '</div>' +
      '<div><div class="qz-head-name">' + esc(widget.title || t('title')) + '<span class="qz-dot" data-online></span></div><div class="qz-head-sub" data-sub>' + esc(widget.subtitle || '') + '</div></div>' +
      '<div class="qz-head-actions">' +
      '<button class="qz-icon-btn" data-act="faq" title="' + t('faq') + '" aria-label="' + t('faq') + '">' + icon('book', 16) + '</button>' +
      '<button class="qz-icon-btn" data-act="close" title="' + t('close') + '" aria-label="' + t('close') + '">' + icon('close', 16) + '</button>' +
      '</div></div></div>' +
      '<div class="qz-body">' +
      '<div class="qz-scroll" data-scroll></div>' +
      '<div qz-quick data-quick></div>' +
      '<div class="qz-compose">' +
      '<div class="qz-inputrow">' +
      '<div class="qz-tools">' +
      '<button class="qz-tool" data-act="file" title="' + t('sendFile') + '" aria-label="' + t('sendFile') + '">' + icon('paperclip', 16) + '</button>' +
      (widget.recordingEnabled ? '<button class="qz-tool" data-act="record" title="' + t('recording') + '" aria-label="' + t('recording') + '">' + icon('video', 16) + '</button>' : '') +
      '</div>' +
      '<textarea class="qz-input" rows="1" placeholder="' + t('input') + '" aria-label="' + t('input') + '"></textarea>' +
      '<button class="qz-send" data-act="send" disabled aria-label="' + t('send') + '">' + icon('send', 16) + '</button>' +
      '</div></div>' +
      '<div data-screen></div>' +
      branding +
      '</div>';
  }

  function bindPanel() {
    var panel = ui.panel;
    ui.scroll = panel.querySelector('[data-scroll]');
    ui.quick = panel.querySelector('[data-quick]');
    ui.input = panel.querySelector('.qz-input');
    ui.sendBtn = panel.querySelector('[data-act="send"]');
    ui.screen = panel.querySelector('[data-screen]');

    panel.addEventListener('click', function (e) {
      var trBtn = e.target.closest && e.target.closest('[data-trans]');
      if (trBtn) {
        e.preventDefault();
        var text = decodeURIComponent(trBtn.getAttribute('data-trans'));
        var target = (navigator.language || 'zh').toLowerCase().indexOf('zh') === 0 ? 'en' : 'zh';
        trBtn.textContent = '...';
        api('/api/public/translate', { body: { key: KEY, text: text, target: target } }).then(function (r) {
          var box = trBtn.parentNode;
          var out = el('div', { class: 'qz-trans-text' });
          out.textContent = r.text;
          box.appendChild(out);
          trBtn.remove();
        }).catch(function (err) { trBtn.textContent = '译'; toast(err.message || '翻译失败'); });
        return;
      }
      var btn = e.target.closest('[data-act]');
      if (!btn) {
        if (e.target.tagName === 'IMG' && e.target.closest('.qz-bubble')) {
          var view = el('div', { class: 'qz-imgview' });
          view.innerHTML = '<img src="' + esc(e.target.src) + '" alt="">';
          view.addEventListener('click', function () { view.remove(); });
          panel.appendChild(view);
        }
        return;
      }
      var act = btn.getAttribute('data-act');
      if (act === 'close') closeChat();
      else if (act === 'send') sendMessage();
      else if (act === 'faq') showFaq();
      else if (act === 'file') pickFile();
      else if (act === 'record') toggleRecording();
      else if (act === 'rating') submitRating(btn);
    });

    ui.input.addEventListener('input', function () {
      ui.input.style.height = 'auto';
      ui.input.style.height = Math.min(96, ui.input.scrollHeight) + 'px';
      ui.sendBtn.disabled = !ui.input.value.trim();
      if (socket && conversationId && ui.input.value.trim()) {
        socket.emit('visitor:typing', { conversationId: conversationId, draft: (ui.input.value || '').slice(0, 120) });
      }
    });
    ui.input.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        if (ui.input.value.trim()) sendMessage();
      }
      if (e.key === 'Escape') closeChat();
    });
    ui.quick.addEventListener('click', function (e) {
      var chip = e.target.closest('.qz-chip');
      if (!chip) return;
      ui.input.value = chip.textContent;
      ui.input.dispatchEvent(new Event('input'));
      sendMessage();
    });

    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && chatOpen) closeChat();
    });
    window.addEventListener('resize', applyPosition);
  }

  function renderQuick() {
    if (!ui.quick) return;
    var list = widget.quickReplies || [];
    ui.quick.innerHTML = list.map(function (q) { return '<button class="qz-chip">' + esc(q) + '</button>'; }).join('');
  }

  // ---------------- chat ----------------
  function openChat() {
    if (!config || config.blocked) return;
    chatOpen = true;
    if (ui.hint) ui.hint.style.display = 'none';
    ui.panel.classList.add('qz-open');
    applyPosition();
    trackEvent('widget_open', { page: location.pathname });
    unread = 0;
    updateBadge();
    if (!config.online && widget.offlineEnabled && !conversationId) {
      showOffline();
    } else if (widget.prechatEnabled && !prechatData && !SS.get('qz_prechat_shown_' + KEY)) {
      showPrechat();
    } else {
      ensureChat();
    }
  }
  function closeChat() {
    chatOpen = false;
    ui.panel.classList.remove('qz-open');
    if (socket && conversationId) socket.emit('visitor:read', { conversationId: conversationId });
  }
  function updateBadge() {
    if (!ui.badge) return;
    ui.badge.style.display = unread > 0 ? 'grid' : 'none';
    ui.badge.textContent = unread > 9 ? '9+' : String(unread);
  }
  function loadSocket(cb) {
    if (window.io) return cb();
    if (connecting) return;
    connecting = true;
    var s = document.createElement('script');
    s.src = BASE + '/socket.io/socket.io.js';
    s.async = true;
    s.onload = function () { connecting = false; cb(); };
    s.onerror = function () { connecting = false; toast('连接失败，请刷新页面重试'); };
    document.head.appendChild(s);
  }
  function ensureIdentity(cb) {
    if (identityReady || trackingOn) return cb();
    api('/api/public/session', { body: basePayload() }).then(function (res) {
      if (res.blocked) { toast('当前访客已被限制咨询'); return; }
      identityReady = true;
      if (res.vid && res.vid !== vid) { vid = res.vid; LS.set('qz_vid_' + KEY, vid); }
      if (res.sid) { sid = String(res.sid); SS.set('qz_sid_' + KEY, sid); }
      cb();
    }).catch(function (e) { toast(e.message || '会话初始化失败'); });
  }
  function ensureChat() {
    if (socket && socket.connected && conversationId) { renderChatState(); return; }
    ensureIdentity(function () { loadSocket(function () {
      if (socket) return;
      socket = window.io(BASE, { transports: ['websocket', 'polling'], reconnection: true, reconnectionAttempts: 6, timeout: 10000 });
      socket.on('connect', function () {
        socket.emit('visitor:init', { key: KEY, vid: vid, subject: document.title }, function (res) {
          if (!res || res.error) { toast(res && res.error ? res.error : '会话初始化失败'); return; }
          conversationId = res.conversation.id;
          conversationStatus = res.conversation.status;
          agent = res.conversation.agent;
          updateOnline(!!res.online, res.widget);
          renderMessages(res.messages || []);
          renderQuick();
          if (pendingSend) { var p = pendingSend; pendingSend = null; dispatchMessage(p); }
        });
      });
      socket.on('message:new', function (m) {
        if (!m || m.isPrivate) return;
        appendMessage(m);
        if (chatOpen) {
          socket.emit('visitor:read', { conversationId: conversationId });
        } else if (m.senderType !== 'visitor') {
          unread++;
          updateBadge();
          if (ui.hint) {
            ui.hint.style.display = 'block';
            ui.hint.innerHTML = '<b>' + esc(m.senderName || '客服') + '</b>' + esc((m.content || '').slice(0, 60));
          }
        }
      });
      socket.on('message:blocked', function (d) { toast(d.notice || '消息已被拦截'); });
      socket.on('conversation:update', function (d) {
        if (d && d.id === conversationId) {
          if (d.status) conversationStatus = d.status;
          if (d.agentName) agent = { name: d.agentName };
          if (d.agentId) agent = { id: d.agentId, name: d.agentName || (agent && agent.name) };
          updateOnlineStatus();
        }
      });
      socket.on('conversation:closed', function () {
        conversationStatus = 'closed';
        updateOnlineStatus();
        showRating();
      });
      socket.on('agent:typing', function (d) {
        if (d && d.conversationId === conversationId) showTyping(d.name);
      });
      socket.on('disconnect', function () { updateOnlineStatus(); });
    });
    });
  }

  function updateOnline(online, w) {
    if (w) {
      widget.agentName = w.agentName || widget.agentName;
      widget.title = w.title || widget.title;
      widget.welcome = w.welcome || widget.welcome;
      widget.aiEnabled = w.aiEnabled;
      widget.aiName = w.aiName;
    }
    var dot = ui.panel.querySelector('[data-online]');
    if (dot) dot.className = 'qz-dot' + (online ? '' : ' off');
    var sub = ui.panel.querySelector('[data-sub]');
    if (sub) sub.textContent = online ? (widget.subtitle || t('subtitle')) : t('offline');
    var nameEl = ui.panel.querySelector('.qz-head-name');
    if (nameEl) nameEl.innerHTML = esc(widget.title || t('title')) + '<span class="qz-dot' + (online ? '' : ' off') + '"></span>';
  }
  function updateOnlineStatus() {
    var dot = ui.panel.querySelector('[data-online]');
    if (dot && conversationStatus === 'closed') dot.className = 'qz-dot off';
  }

  function renderMessages(list) {
    ui.scroll.innerHTML = '';
    var welcome = el('div', { class: 'qz-welcome' });
    welcome.innerHTML = esc(widget.welcome || '您好，请问有什么可以帮您？');
    ui.scroll.appendChild(welcome);
    list.forEach(function (m) { if (!m.isPrivate) appendMessage(m, true); });
    scrollBottom();
  }
  function appendMessage(m, silent) {
    if (!ui.scroll) return;
    if (m.type === 'note' || m.isPrivate) return;
    if (m.type === 'rating') return;
    if (m.senderType === 'system') {
      var sys = el('div', { class: 'qz-sys' });
      sys.textContent = m.content;
      ui.scroll.appendChild(sys);
      scrollBottom();
      return;
    }
    var me = m.senderType === 'visitor';
    var row = el('div', { class: 'qz-msg' + (me ? ' qz-me' : '') });
    var av = el('div', { class: 'qz-msg-avatar' });
    av.textContent = me ? '我' : (m.senderType === 'bot' ? 'AI' : (m.senderName || '客').slice(0, 1));
    row.appendChild(av);
    var bubble = el('div', { class: 'qz-bubble' });
    if (m.type === 'image' && m.fileUrl) {
      bubble.innerHTML = '<img src="' + esc(m.fileUrl) + '" alt="图片" loading="lazy">';
    } else if (m.type === 'recording' && m.fileUrl) {
      bubble.innerHTML = '<a class="qz-file" href="' + esc(m.fileUrl) + '" target="_blank" rel="noopener"><span class="qz-file-icon">' + icon('video', 15) + '</span><span><span class="qz-file-name">页面录屏</span><span class="qz-file-size">点击查看</span></span></a>';
    } else if ((m.type === 'file') && m.fileUrl) {
      bubble.innerHTML = '<a class="qz-file" href="' + esc(m.fileUrl) + '" target="_blank" rel="noopener"><span class="qz-file-icon">' + icon('paperclip', 15) + '</span><span><span class="qz-file-name">' + esc(m.fileName || '附件') + '</span><span class="qz-file-size">' + fmtSize(m.fileSize) + '</span></span></a>';
    } else if (m.type === 'form' && m.meta && m.meta.form) {
      bubble.textContent = t('formSubmitted') + (m.meta.form.title || '');
    } else {
      bubble.innerHTML = esc(m.content || '').replace(/\n/g, '<br>');
    }
    if (!me && m.type === 'text' && m.content && widget && widget.licensed && widget.licensed.translation) {
      var tr = el('button', { class: 'qz-trans', 'data-trans': encodeURIComponent(m.content) });
      tr.textContent = '译';
      bubble.appendChild(tr);
    }
    row.appendChild(bubble);
    ui.scroll.appendChild(row);
    if (!silent) scrollBottom();
  }
  function scrollBottom() {
    if (!ui.scroll) return;
    setTimeout(function () { ui.scroll.scrollTop = ui.scroll.scrollHeight; }, 30);
  }
  function fmtSize(n) {
    n = Number(n) || 0;
    if (n > 1024 * 1024) return (n / 1024 / 1024).toFixed(1) + 'MB';
    if (n > 1024) return Math.round(n / 1024) + 'KB';
    return n + 'B';
  }
  function showTyping(name) {
    if (!ui.scroll) return;
    var old = ui.scroll.querySelector('.qz-typing');
    if (old) old.remove();
    var t = el('div', { class: 'qz-typing' });
    t.innerHTML = '<i></i><i></i><i></i>';
    ui.scroll.appendChild(t);
    scrollBottom();
    clearTimeout(t._timer);
    t._timer = setTimeout(function () { t.remove(); }, 3000);
  }
  function toast(msg) {
    if (!ui.panel) return;
    var old = ui.panel.querySelector('.qz-toast');
    if (old) old.remove();
    var t = el('div', { class: 'qz-toast' });
    t.textContent = msg;
    ui.panel.appendChild(t);
    setTimeout(function () { t.remove(); }, 2800);
  }

  function sendMessage() {
    var text = (ui.input.value || '').trim();
    if (!text) return;
    if (!config.online && widget.offlineEnabled && !conversationId) { showOffline(); return; }
    if (!socket || !conversationId) {
      pendingSend = { text: text, type: 'text' };
      ensureChat();
      ui.input.value = '';
      ui.input.style.height = 'auto';
      ui.sendBtn.disabled = true;
      return;
    }
    dispatchMessage({ text: text, type: 'text' });
    ui.input.value = '';
    ui.input.style.height = 'auto';
    ui.sendBtn.disabled = true;
  }
  function dispatchMessage(p) {
    if (!socket || !conversationId) return;
    var payload = { conversationId: conversationId, type: p.type || 'text', content: p.text || p.content || '', fileUrl: p.fileUrl, fileName: p.fileName, fileSize: p.fileSize };
    var temp = el('div', { class: 'qz-msg qz-me' });
    temp.innerHTML = '<div class="qz-msg-avatar">我</div><div class="qz-bubble" style="opacity:.65">' + (p.type === 'image' ? '<img src="' + esc(p.fileUrl) + '">' : esc(payload.content).replace(/\n/g, '<br>')) + '</div>';
    ui.scroll.appendChild(temp);
    scrollBottom();
    socket.emit('visitor:message', payload, function (res) {
      if (res && res.error) {
        temp.querySelector('.qz-bubble').style.opacity = '1';
        toast(res.error);
      } else if (temp.parentNode) {
        temp.remove();
      }
    });
  }

  function pickFile() {
    if (!socket || !conversationId) { pendingSend = { openFile: true }; ensureChat(); return; }
    var input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.zip,.csv';
    input.style.display = 'none';
    input.addEventListener('change', function () {
      var file = input.files && input.files[0];
      if (!file) return;
      if (file.size > 20 * 1024 * 1024) { toast('文件不能超过 20MB'); return; }
      uploadFile(file);
      input.remove();
    });
    document.body.appendChild(input);
    input.click();
  }
  function uploadFile(file) {
    toast('正在上传...');
    var fd = new FormData();
    fd.append('file', file);
    fetch(BASE + '/api/public/upload?key=' + encodeURIComponent(KEY), { method: 'POST', body: fd })
      .then(function (r) { return r.json(); })
      .then(function (res) {
        if (res.error) throw new Error(res.error);
        var isImg = /^image\//.test(file.type);
        dispatchMessage({ type: isImg ? 'image' : 'file', text: isImg ? '[图片]' : '[文件]', fileUrl: res.url, fileName: res.name, fileSize: res.size });
      })
      .catch(function (e) { toast(e.message || '上传失败'); });
  }

  // ---------------- recording ----------------
  var recorder = null, recChunks = [], recStart = 0, recStream = null;
  function toggleRecording() {
    if (recorder && recorder.state === 'recording') {
      recorder.stop();
      return;
    }
    if (!navigator.mediaDevices || !navigator.mediaDevices.getDisplayMedia) {
      toast('当前浏览器不支持录屏，请使用 Chrome/Edge');
      return;
    }
    if (!socket || !conversationId) { toast('请先开始对话'); return; }
    navigator.mediaDevices.getDisplayMedia({ video: { frameRate: 15 }, audio: false }).then(function (stream) {
      recStream = stream;
      recChunks = [];
      recStart = Date.now();
      var mime = MediaRecorder.isTypeSupported('video/webm;codecs=vp9') ? 'video/webm;codecs=vp9' : 'video/webm';
      recorder = new MediaRecorder(stream, { mimeType: mime, videoBitsPerSecond: 900000 });
      recorder.ondataavailable = function (e) { if (e.data && e.data.size) recChunks.push(e.data); };
      recorder.onstop = function () {
        stream.getTracks().forEach(function (t) { t.stop(); });
        var btn = ui.panel.querySelector('[data-act="record"]');
        if (btn) btn.classList.remove('qz-rec');
        var ind = ui.panel.querySelector('.qz-rec-indicator');
        if (ind) ind.remove();
        var blob = new Blob(recChunks, { type: 'video/webm' });
        if (blob.size < 1000) { toast('录制时间过短'); return; }
        uploadRecording(blob);
      };
      recorder.start(1000);
      var btn = ui.panel.querySelector('[data-act="record"]');
      if (btn) btn.classList.add('qz-rec');
      var ind = el('div', { class: 'qz-rec-indicator' });
      ind.innerHTML = '<span style="width:7px;height:7px;border-radius:50%;background:#fff;display:inline-block"></span> 正在录屏，点击停止';
      ind.addEventListener('click', function () { if (recorder) recorder.stop(); });
      ui.panel.appendChild(ind);
    }).catch(function () { toast('已取消录屏'); });
  }
  function uploadRecording(blob) {
    toast('正在上传录屏...');
    var fd = new FormData();
    fd.append('file', blob, 'recording_' + Date.now() + '.webm');
    fd.append('vid', vid);
    fd.append('conversationId', String(conversationId || ''));
    fd.append('duration', String(Math.round((Date.now() - recStart) / 1000)));
    fetch(BASE + '/api/public/recording?key=' + encodeURIComponent(KEY), { method: 'POST', body: fd })
      .then(function (r) { return r.json(); })
      .then(function (res) { if (res.error) throw new Error(res.error); toast(t('recordingSent')); })
      .catch(function (e) { toast(e.message || '录屏上传失败'); });
  }

  // ---------------- forms ----------------
  function safeJson(s, d) { try { return JSON.parse(s); }catch (e) { return d; } }
  function formHtml(form, submitLabel) {
    var fields = (form.fields || []).map(function (f) {
      var required = f.required ? ' required' : '';
      var ph = f.placeholder ? ' placeholder="' + esc(f.placeholder) + '"' : '';
      var label = '<label>' + esc(f.label) + (f.required ? ' *' : '') + '</label>';
      if (f.type === 'textarea') return '<div class="qz-field">' + label + '<textarea name="' + esc(f.key) + '"' + ph + required + '></textarea></div>';
      if (f.type === 'select') return '<div class="qz-field">' + label + '<select name="' + esc(f.key) + '"' + required + '><option value="">请选择</option>' + (f.options || []).map(function (o) { return '<option>' + esc(o) + '</option>'; }).join('') + '</select></div>';
      if (f.type === 'radio') return '<div class="qz-field">' + label + (f.options || []).map(function (o) { return '<label style="font-weight:400;display:inline-flex;gap:5px;margin-right:10px"><input type="radio" name="' + esc(f.key) + '" value="' + esc(o) + '" style="width:auto">' + esc(o) + '</label>'; }).join('') + '</div>';
      return '<div class="qz-field">' + label + '<input name="' + esc(f.key) + '" type="' + (f.type === 'phone' ? 'tel' : f.type === 'email' ? 'email' : 'text') + '"' + ph + required + '></div>';
    }).join('');
    return fields + '<button class="qz-primary" data-submit-form>' + esc(submitLabel || form.button_text || t('submit')) + '</button>';
  }
  function collectForm(container) {
    var data = {};
    container.querySelectorAll('[name]').forEach(function (input) {
      if (input.type === 'radio') { if (input.checked) data[input.name] = input.value; }
      else data[input.name] = input.value.trim();
    });
    return data;
  }
  function submitForm(formId, container, done) {
    var data = collectForm(container);
    var btn = container.querySelector('[data-submit-form]');
    if (btn) { btn.disabled = true; btn.textContent = t('submitting'); }
    api('/api/public/form/' + formId, { body: { key: KEY, vid: vid, data: data, conversationId: conversationId, consent: consentAllowed() } })
      .then(function (res) {
        if (res.ok) {
          prechatData = JSON.stringify(data);
          LS.set('qz_prechat_' + KEY, prechatData);
          if (done) done(data, res);
        }
      })
      .catch(function (e) {
        if (btn) { btn.disabled = false; btn.textContent = t('submit'); }
        toast(e.message || t('submitFailed'));
      });
  }
  function showPrechat() {
    var form = config.forms && config.forms.prechat;
    if (!form) { ensureChat(); return; }
    SS.set('qz_prechat_shown_' + KEY, '1');
    ui.screen.style.display = 'block';
    var screen = el('div', { class: 'qz-screen' });
    screen.innerHTML = '<h3>' + esc(form.title || '开始咨询') + '</h3><p>' + esc(form.subtitle || '') + '</p><div data-form>' + formHtml(form, form.button_text) + '</div><button class="qz-ghost" data-skip>跳过，直接聊天</button>';
    ui.screen.innerHTML = '';
    ui.screen.appendChild(screen);
    screen.querySelector('[data-skip]').addEventListener('click', function () {
      ui.screen.style.display = 'none';
      ensureChat();
    });
    screen.querySelector('[data-submit-form]').addEventListener('click', function () {
      var required = screen.querySelectorAll('[required]');
      var bad = false;
      required.forEach(function (i) { if (!i.value.trim()) { bad = true; i.style.borderColor = '#ef4444'; } });
      if (bad) { toast('请填写必填项'); return; }
      submitForm(form.id, screen, function () {
        ui.screen.style.display = 'none';
        ensureChat();
      });
    });
  }
  function showOffline() {
    var form = config.forms && config.forms.offline;
    ui.screen.style.display = 'block';
    var screen = el('div', { class: 'qz-screen' });
    screen.innerHTML = '<h3>' + t('leave') + '</h3><p>' + esc(widget.offlineText) + '</p>';
    if (form) {
      screen.innerHTML += '<div data-form>' + formHtml(form, form.button_text) + '</div>';
    } else {
      screen.innerHTML += '<div class="qz-field"><label>' + t('name') + '</label><input name="name" required></div><div class="qz-field"><label>' + t('phone') + '</label><input name="phone" type="tel" required></div><div class="qz-field"><label>' + t('message') + '</label><textarea name="content" required></textarea></div><button class="qz-primary" data-submit-offline>' + t('submitMsg') + '</button>';
    }
    ui.screen.innerHTML = '';
    ui.screen.appendChild(screen);
    var submit = screen.querySelector('[data-submit-form]') || screen.querySelector('[data-submit-offline]');
    submit.addEventListener('click', function () {
      var data = collectForm(screen);
      if (!data.name || !data.phone || !data.content) { toast('请填写完整信息'); return; }
      submit.disabled = true;
      api('/api/public/offline', { body: { key: KEY, vid: vid, name: data.name, phone: data.phone, content: data.content, consent: consentAllowed() } })
        .then(function () {
          screen.innerHTML = '<h3>' + t('submitted') + '</h3><p>' + t('submittedDesc') + '</p><button class="qz-primary" data-faq>' + t('viewFaq') + '</button>';
          screen.querySelector('[data-faq]').addEventListener('click', showFaq);
        })
        .catch(function (e) { submit.disabled = false; toast(e.message || t('submitFailed')); });
    });
  }

  // ---------------- FAQ ----------------
  function showFaq() {
    if (!widget.faqEnabled || !config.faqs || !config.faqs.length) { toast(t('faq')); return; }
    ui.screen.style.display = 'block';
    var screen = el('div', { class: 'qz-screen' });
    var html = '<h3>' + t('faq') + '</h3><p>' + t('faqIntro') + '</p>';
    config.faqs.forEach(function (cat) {
      html += '<div class="qz-faq-cat">' + esc(cat.name) + '</div>';
      cat.items.forEach(function (item) {
        if (item.file) {
          html += '<a class="qz-faq-item" href="' + esc(item.file.url) + '" target="_blank" rel="noopener">' + esc(item.file.name) + icon('download', 14) + '</a>';
        } else {
          html += '<button class="qz-faq-item" data-q="' + item.id + '">' + esc(item.question) + icon('arrow', 14) + '</button>';
          html += '<div class="qz-faq-a" data-a="' + item.id + '" style="display:none">' + esc(item.answer) + '</div>';
        }
      });
    });
    html += '<button class="qz-ghost" data-agent>' + t('toAgent') + '</button>';
    screen.innerHTML = html;
    ui.screen.innerHTML = '';
    ui.screen.appendChild(screen);
    screen.querySelectorAll('[data-q]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var id = btn.getAttribute('data-q');
        var a = screen.querySelector('[data-a="' + id + '"]');
        if (a) a.style.display = a.style.display === 'none' ? 'block' : 'none';
        api('/api/public/faq/' + id + '/view', { body: {} }).catch(function () { });
      });
    });
    screen.querySelector('[data-agent]').addEventListener('click', function () {
      ui.screen.style.display = 'none';
      ensureChat();
    });
  }

  // ---------------- rating ----------------
  function showRating() {
    if (!widget.ratingEnabled) return;
    var exists = ui.scroll.querySelector('.qz-rating');
    if (exists) return;
    var card = el('div', { class: 'qz-rating' });
    card.innerHTML = '<h4>这次咨询满意吗？</h4><p>你的评价会帮助我们做得更好</p><div class="qz-stars">' +
      [1, 2, 3, 4, 5].map(function (i) { return '<button class="qz-star" data-star="' + i + '" aria-label="' + i + '星">' + icon('star', 24) + '</button>'; }).join('') +
      '</div><textarea placeholder="' + t('ratingPlaceholder') + '" data-comment></textarea><button class="qz-primary" data-rating-submit disabled>' + t('submitRating') + '</button>';
    ui.scroll.appendChild(card);
    scrollBottom();
    var score = 0;
    card.querySelectorAll('[data-star]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        score = Number(btn.getAttribute('data-star'));
        card.querySelectorAll('[data-star]').forEach(function (b) {
          b.classList.toggle('on', Number(b.getAttribute('data-star')) <= score);
        });
        card.querySelector('[data-rating-submit]').disabled = false;
      });
    });
    card.querySelector('[data-rating-submit]').addEventListener('click', function () {
      var btn = card.querySelector('[data-rating-submit]');
      btn.disabled = true;
      api('/api/public/rating', { body: { conversationId: conversationId, score: score, comment: card.querySelector('[data-comment]').value } })
        .then(function () {
          card.innerHTML = '<h4>' + t('thanks') + '</h4><p>' + icon('check', 18) + ' 已收到 ' + score + ' 星反馈</p>';
        })
        .catch(function (e) { btn.disabled = false; toast(e.message || t('submitFailed')); });
    });
  }

  // ---------------- render chat state ----------------
  function renderChatState() {
    if (!config.online && widget.offlineEnabled && !conversationId) {
      renderMessages([]);
      var welcome = ui.scroll.querySelector('.qz-welcome');
      if (welcome) welcome.innerHTML = esc(widget.offlineText);
      showOffline();
    }
  }

  // ---------------- proactive ----------------
  function showProactive(actions) {
    if (!actions) return;
    var existing = ui.shadow.querySelector('.qz-proactive');
    if (existing) existing.remove();
    var card = el('div', { class: 'qz-proactive' });
    var pos = widget.position === 'left' ? 'left' : 'right';
    var side = Number(widget.offsetSide || 24);
    var size = Number(widget.buttonSize || 58);
    card.style[pos] = side + 'px';
    card.style.bottom = (Number(widget.offsetBottom || 24) + size + 14) + 'px';
    var type = actions.type || 'message';
    var head = '<div class="qz-proactive-head"><div class="qz-proactive-avatar">' + icon(type === 'form' ? 'message' : 'chat', 16) + '</div><div class="qz-proactive-title">' + esc(actions.title || widget.agentName || t('title')) + '</div><button class="qz-proactive-close" aria-label="关闭">&times;</button></div>';
    var body = '<div class="qz-proactive-body"><b>' + esc(actions.title || '') + '</b>' + esc(actions.message || '') + '</div>';
    if (type === 'form' && actions.formId) {
      var form = (config.forms && config.forms.all || []).filter(function (f) { return f.id === Number(actions.formId); })[0];
      if (form) {
        card.innerHTML = head + '<div class="qz-proactive-body"><b>' + esc(actions.title || form.title) + '</b>' + esc(actions.message || form.subtitle || '') + '<div data-pform style="margin-top:10px">' + formHtml(form, form.button_text) + '</div></div>';
      } else {
        card.innerHTML = head + body;
      }
    } else {
      card.innerHTML = head + body + '<div class="qz-proactive-body" style="padding-top:0"><button class="qz-primary" data-popen>' + esc(actions.buttonText || (type === 'form' ? '填写信息' : '开始咨询')) + '</button></div>';
    }
    ui.shadow.appendChild(card);
    card.querySelector('.qz-proactive-close').addEventListener('click', function () { card.remove(); });
    var popen = card.querySelector('[data-popen]');
    if (popen) popen.addEventListener('click', function () { card.remove(); openChat(); });
    var pformBtn = card.querySelector('[data-submit-form]');
    if (pformBtn) {
      pformBtn.addEventListener('click', function () {
        var formId = actions.formId;
        var required = card.querySelectorAll('[required]');
        var bad = false;
        required.forEach(function (i) { if (!i.value.trim()) { bad = true; } });
        if (bad) { toast('请填写必填项'); return; }
        submitForm(formId, card, function () {
          card.innerHTML = head + '<div class="qz-proactive-body"><b>提交成功</b>顾问会尽快联系你，也可以直接开始咨询。</div><div class="qz-proactive-body" style="padding-top:0"><button class="qz-primary" data-popen>' + t('startChat') + '</button></div>';
          card.querySelector('[data-popen]').addEventListener('click', function () { card.remove(); openChat(); });
        });
      });
    }
    trackEvent('trigger_popup', { title: actions.title, type: type });
    clearTimeout(card._timer);
    card._timer = setTimeout(function () { card.remove(); }, 30000);
  }

  // ---------------- announcement ----------------
  function renderAnnouncement() {
    var a = config.announcement;
    if (!a) return;
    if (SS.get('qz_announce_' + a.id, '') === 'closed') return;
    var isTop = a.position !== 'side';
    var bar = el('div', { class: isTop ? 'qz-announce-top' : 'qz-announce-side' });
    bar.style.background = a.bg_color || '#2563eb';
    bar.innerHTML = '<span>' + esc(a.content) + '</span>' + (a.link ? '<a href="' + esc(a.link) + '" target="_blank" rel="noopener">' + esc(a.link_text || '查看') + '</a>' : '') + '<button aria-label="关闭公告">&times;</button>';
    if (!isTop) {
      bar.style.left = '20px';
      bar.style.bottom = '104px';
    }
    ui.shadow.appendChild(bar);
    bar.querySelector('button').addEventListener('click', function () {
      SS.set('qz_announce_' + a.id, 'closed');
      bar.remove();
    });
  }

  // ---------------- queue & boot ----------------
  function flushQueue() {
    var q = QUEUE.splice(0, QUEUE.length);
    q.forEach(function (item) {
      if (item[0] === 'open') openChat();
      else if (item[0] === 'close') closeChat();
      else if (item[0] === 'toggle') chatOpen ? closeChat() : openChat();
      else if (item[0] === 'track') trackEvent(item[1], item[2]);
    });
  }

  function boot() {
    api('/api/public/config?key=' + encodeURIComponent(KEY) + '&vid=' + encodeURIComponent(vid), { method: 'GET' })
      .then(function (res) {
        config = res;
        widget = res.widget;
        if (res.blocked) { if (window.console) console.warn('[Qingzhan] 当前访客已被限制咨询'); return; }
        config._lastUrl = location.href;
        mount();
        if (res.visitor && res.visitor.vid && res.visitor.vid !== vid) { vid = res.visitor.vid; LS.set('qz_vid_' + KEY, vid); }
        var showHint = LS.get('qz_hint_' + KEY, '') !== '1' && widget.welcome;
        if (showHint && ui.hint) {
          setTimeout(function () {
            if (!chatOpen) {
              ui.hint.style.display = 'block';
              LS.set('qz_hint_' + KEY, '1');
              setTimeout(function () { if (ui.hint) ui.hint.style.display = 'none'; }, 9000);
            }
          }, 5000);
        }
        startTracking();
      })
      .catch(function (err) {
        if (window.console) console.warn('[Qingzhan] 加载配置失败', err.message);
      });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
