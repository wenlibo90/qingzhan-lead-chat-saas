'use strict';

const fs = require('node:fs');
const { AlipaySdk } = require('alipay-sdk');
const { planOf } = require('../../plans');

let sdk = null;
let sdkSignature = '';

function env(name) {
  return String(process.env[name] || '').trim();
}

function normalizePrivateKey(value) {
  let key = String(value || '').trim().replace(/\\n/g, '\n');
  if (!key) return '';
  if (key.includes('BEGIN')) return key;
  return `-----BEGIN PRIVATE KEY-----\n${key.replace(/\s+/g, '').match(/.{1,64}/g).join('\n')}\n-----END PRIVATE KEY-----`;
}

function normalizePublicKey(value) {
  let key = String(value || '').trim().replace(/\\n/g, '\n');
  if (!key) return '';
  if (key.includes('BEGIN')) return key;
  return `-----BEGIN PUBLIC KEY-----\n${key.replace(/\s+/g, '').match(/.{1,64}/g).join('\n')}\n-----END PUBLIC KEY-----`;
}

function readKeyFile(name) {
  const file = env(name);
  if (!file) return '';
  try { return fs.readFileSync(file, 'utf8'); } catch { return ''; }
}

function config() {
  return {
    appId: env('ALIPAY_APP_ID'),
    privateKey: normalizePrivateKey(env('ALIPAY_PRIVATE_KEY') || readKeyFile('ALIPAY_PRIVATE_KEY_FILE')),
    alipayPublicKey: normalizePublicKey(env('ALIPAY_PUBLIC_KEY')),
    gateway: env('ALIPAY_GATEWAY') || 'https://openapi.alipay.com/gateway.do',
    notifyUrl: env('ALIPAY_NOTIFY_URL'),
    returnUrl: env('ALIPAY_RETURN_URL'),
    sellerId: env('ALIPAY_SELLER_ID'),
    keyType: env('ALIPAY_KEY_TYPE') || 'PKCS8'
  };
}

function missing() {
  const c = config();
  const list = [];
  if (!c.appId) list.push('ALIPAY_APP_ID');
  if (!c.privateKey) list.push('ALIPAY_PRIVATE_KEY');
  if (!c.alipayPublicKey) list.push('ALIPAY_PUBLIC_KEY');
  if (!c.notifyUrl) list.push('ALIPAY_NOTIFY_URL');
  return list;
}

function isConfigured() {
  return missing().length === 0;
}

function getSdk() {
  const c = config();
  if (!isConfigured()) {
    const err = new Error('支付宝配置不完整：缺少 ' + missing().join(', '));
    err.status = 503;
    throw err;
  }
  const signature = [c.appId, c.privateKey.slice(-24), c.alipayPublicKey.slice(-24), c.gateway, c.keyType].join('|');
  if (!sdk || sdkSignature !== signature) {
    sdk = new AlipaySdk({
      appId: c.appId,
      privateKey: c.privateKey,
      alipayPublicKey: c.alipayPublicKey,
      gateway: c.gateway,
      keyType: c.keyType,
      signType: 'RSA2',
      timeout: 10000
    });
    sdkSignature = signature;
  }
  return sdk;
}

function createPagePay(order) {
  const c = config();
  const sdk = getSdk();
  const plan = planOf(order.plan);
  const cycle = order.cycle === 'yearly' ? '年付' : '月付';
  const total = (Number(order.amount_cents) / 100).toFixed(2);
  const params = {
    bizContent: {
      out_trade_no: order.order_no,
      product_code: 'FAST_INSTANT_TRADE_PAY',
      total_amount: total,
      subject: `轻客服 SaaS · ${plan.name} ${cycle}`,
      body: `订单 ${order.order_no}`,
      timeout_express: '30m'
    },
    notifyUrl: c.notifyUrl
  };
  if (c.returnUrl) params.returnUrl = c.returnUrl;
  return {
    provider: 'alipay',
    mode: 'redirect',
    payUrl: sdk.pageExecute('alipay.trade.page.pay', 'GET', params),
    orderNo: order.order_no,
    amountCents: Number(order.amount_cents)
  };
}

function verifyNotify(params) {
  try {
    const sdk = getSdk();
    if (sdk.checkNotifySign(params)) return true;
  } catch { /* try v2 below */ }
  try {
    return getSdk().checkNotifySignV2(params);
  } catch {
    return false;
  }
}

function validateNotify(params) {
  const c = config();
  if (!isConfigured()) return { ok: false, reason: 'alipay not configured' };
  if (String(params.app_id || '') !== c.appId) return { ok: false, reason: 'app_id mismatch' };
  if (c.sellerId && params.seller_id && String(params.seller_id) !== c.sellerId) return { ok: false, reason: 'seller_id mismatch' };
  if (!verifyNotify(params)) return { ok: false, reason: 'signature invalid' };
  if (!params.out_trade_no || !params.trade_status) return { ok: false, reason: 'missing trade fields' };
  const amount = Number(params.total_amount);
  if (!Number.isFinite(amount) || amount <= 0) return { ok: false, reason: 'invalid amount' };
  return { ok: true };
}

function normalizeNotify(params) {
  const amount = Number(params.total_amount);
  return {
    provider: 'alipay',
    eventId: String(params.notify_id || `${params.trade_no || params.out_trade_no}:${params.trade_status}:${params.gmt_payment || ''}`).slice(0, 120),
    orderNo: String(params.out_trade_no || ''),
    amountCents: Math.round(amount * 100),
    status: String(params.trade_status || ''),
    providerTradeNo: params.trade_no || null,
    raw: JSON.stringify(params)
  };
}

async function query(orderNo) {
  const sdk = getSdk();
  const res = await sdk.exec('alipay.trade.query', { bizContent: { out_trade_no: orderNo } }, { validateSign: true });
  const data = (res && (res.alipay_trade_query_response || res)) || {};
  if (data.code !== '10000') {
    const err = new Error(data.sub_msg || data.msg || '支付宝查单失败');
    err.code = data.sub_code || data.code;
    throw err;
  }
  return {
    status: data.trade_status,
    tradeNo: data.trade_no || null,
    amountCents: Math.round(Number(data.total_amount || 0) * 100),
    buyerId: data.buyer_user_id || null
  };
}

async function refund(orderNo, amountCents, reason) {
  const sdk = getSdk();
  const res = await sdk.exec('alipay.trade.refund', {
    bizContent: {
      out_trade_no: orderNo,
      refund_amount: (Number(amountCents) / 100).toFixed(2),
      refund_reason: String(reason || '订单退款').slice(0, 200)
    }
  }, { validateSign: true });
  const data = (res && (res.alipay_trade_refund_response || res)) || {};
  if (data.code !== '10000') {
    const err = new Error(data.sub_msg || data.msg || '支付宝退款失败');
    err.code = data.sub_code || data.code;
    throw err;
  }
  return data;
}

async function close(orderNo) {
  const sdk = getSdk();
  const res = await sdk.exec('alipay.trade.close', { bizContent: { out_trade_no: orderNo } }, { validateSign: true });
  const data = (res && (res.alipay_trade_close_response || res)) || {};
  if (data.code !== '10000') {
    const err = new Error(data.sub_msg || data.msg || '支付宝关单失败');
    err.code = data.sub_code || data.code;
    throw err;
  }
  return data;
}

function info() {
  const c = config();
  return {
    provider: 'alipay',
    configured: isConfigured(),
    missing: missing(),
    appId: c.appId || null,
    gateway: c.gateway,
    notifyUrl: c.notifyUrl || null,
    returnUrl: c.returnUrl || null
  };
}

module.exports = {
  isConfigured, missing, info, config, createPagePay,
  validateNotify, verifyNotify, normalizeNotify, query, refund, close
};
