'use strict';

function defaultWidget(overrides = {}) {
  return {
    primaryColor: '#2563eb',
    position: 'right',
    offsetBottom: 24,
    offsetSide: 24,
    buttonSize: 58,
    icon: 'headset',
    animation: 'breath',
    mobile: { size: 52, offsetBottom: 18, offsetSide: 14 },
    title: '在线客服',
    agentName: '在线顾问',
    welcome: '您好，我是在线顾问。想了解哪方面的能力？',
    subtitle: '通常 1 分钟内回复',
    offlineText: '当前客服不在线，您可以留言，我们会在工作时间尽快联系您。',
    offlineEnabled: true,
    prechatEnabled: false,
    prechatFormId: null,
    faqEnabled: true,
    recordingEnabled: true,
    ratingEnabled: true,
    showBranding: true,
    businessHours: '09:00-21:00',
    compliance: {
      enabled: false,
      text: '',
      policyUrl: ''
    },
    ...overrides
  };
}

module.exports = { defaultWidget };
