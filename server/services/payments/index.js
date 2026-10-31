'use strict';

const alipay = require('./alipay');

function provider() {
  const explicit = String(process.env.PAYMENT_PROVIDER || '').trim();
  if (explicit) return explicit;
  return alipay.isConfigured() ? 'alipay' : 'mock';
}

function mockEnabled() {
  return provider() === 'mock' && process.env.NODE_ENV !== 'production';
}

function info() {
  const name = provider();
  if (name === 'alipay') {
    const details = alipay.info();
    return {
      provider: 'alipay',
      mode: 'redirect',
      mock: false,
      enabled: details.configured,
      message: details.configured
        ? '支付宝电脑网站支付已配置，下单后跳转支付宝完成付款。'
        : '支付宝配置不完整：缺少 ' + details.missing.join(', ')
    };
  }
  if (name === 'mock') {
    return { provider: 'mock', mode: 'mock', mock: true, enabled: true, message: '开发环境可直接模拟支付完成订单。' };
  }
  return { provider: name, mode: 'external', mock: false, enabled: false, message: '支付通道待配置，可先联系销售开通。' };
}

function createIntent(order) {
  const name = provider();
  if (name === 'alipay') return alipay.createPagePay(order);
  const err = new Error('当前支付通道不可用');
  err.status = 503;
  throw err;
}

function validateNotify(providerName, params) {
  if (providerName === 'alipay') return alipay.validateNotify(params);
  return { ok: false, reason: 'unknown provider' };
}

function normalizeNotify(providerName, params) {
  if (providerName === 'alipay') return alipay.normalizeNotify(params);
  throw new Error('unknown provider');
}

module.exports = { provider, mockEnabled, info, createIntent, validateNotify, normalizeNotify, alipay };
