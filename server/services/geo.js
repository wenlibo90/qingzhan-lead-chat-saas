'use strict';

const ip2 = (() => {
  try { return require('ip2region/node'); } catch { return null; }
})();

const REGIONS = [
  { province: '广东', city: '深圳', weight: 18 },
  { province: '北京', city: '北京', weight: 15 },
  { province: '上海', city: '上海', weight: 14 },
  { province: '浙江', city: '杭州', weight: 12 },
  { province: '江苏', city: '南京', weight: 10 },
  { province: '四川', city: '成都', weight: 7 },
  { province: '湖北', city: '武汉', weight: 6 },
  { province: '山东', city: '青岛', weight: 5 },
  { province: '福建', city: '厦门', weight: 4 },
  { province: '陕西', city: '西安', weight: 3 },
  { province: '河南', city: '郑州', weight: 3 },
  { province: '湖南', city: '长沙', weight: 3 }
];

let queryPromise = null;
let queryFailed = false;

function isPrivate(ip) {
  return /^(10\.|127\.|169\.254\.|192\.168\.|100\.(6[4-9]|[7-9]\d|1[01]\d|12[0-7])\.|172\.(1[6-9]|2\d|3[01])\.|::1$|fe80:|fc[0-9a-f]{2}:|fd[0-9a-f]{2}:)/i.test(String(ip || ''));
}

function cleanIp(ip) {
  return String(ip || '').trim().replace(/^::ffff:/i, '');
}

function trimProvince(name) {
  const value = String(name || '').trim();
  if (!value) return '';
  return value
    .replace(/(壮族自治区|回族自治区|维吾尔自治区|特别行政区|自治区|省|市)$/, '')
    .trim() || value;
}

function trimCity(name) {
  const value = String(name || '').trim();
  if (!value) return '';
  return value
    .replace(/(自治州|自治县|地区|林区|盟|市)$/, '')
    .trim() || value;
}

function lookupService() {
  if (!ip2 || !ip2.IP2Region) return Promise.resolve(null);
  if (queryFailed) return Promise.resolve(null);
  if (!queryPromise) {
    const families = String(process.env.GEO_FAMILIES || '4,6')
      .split(',')
      .map((v) => Number(v.trim()))
      .filter((v) => v === 4 || v === 6);
    queryPromise = ip2.IP2Region.open({ families: families.length ? families : [4, 6] })
      .catch((err) => {
        queryFailed = true;
        if (process.env.GEO_DEBUG === '1') console.warn('[geo] ip2region 加载失败', err.message);
        return null;
      });
  }
  return queryPromise;
}

async function lookupIp2Region(ip) {
  const query = await lookupService();
  if (!query) return null;
  try {
    const result = query.lookup(ip);
    if (!result) return null;
    const province = trimProvince(result.subdivisions && result.subdivisions[0] && result.subdivisions[0].name);
    const city = trimCity(result.city && result.city.name);
    const country = String(result.country && result.country.name || '').trim();
    if (!country && !province && !city) return null;
    return {
      country: country || '未知',
      province: province || '未知',
      city: city || '',
      isp: String(result.isp || '').trim(),
      provider: 'ip2region'
    };
  } catch {
    return null;
  }
}

async function lookupApi(ip) {
  if (!process.env.GEO_API) return null;
  try {
    const url = process.env.GEO_API.replace('{ip}', encodeURIComponent(ip));
    const resp = await fetch(url, { signal: AbortSignal.timeout(1500) });
    if (!resp.ok) return null;
    const data = await resp.json();
    const province = data.province || data.region || '';
    const city = data.city || '';
    if (!province && !city) return null;
    return { country: data.country || '中国', province, city, isp: data.isp || '', provider: 'api' };
  } catch {
    return null;
  }
}

/**
 * IP 归属地解析。默认使用内置 ip2region 离线库（IPv4/IPv6），
 * 配置 GEO_API 时优先使用第三方接口，接口失败自动回退到离线库。
 */
async function locate(ip) {
  const value = cleanIp(ip);
  if (!value) return { country: '未知', province: '未知', city: '', provider: 'unknown' };
  if (isPrivate(value)) return { country: '本地', province: '本地网络', city: '内网', provider: 'local' };

  const api = await lookupApi(value);
  if (api) return api;

  const local = await lookupIp2Region(value);
  if (local) return local;

  return { country: '未知', province: '未知', city: '', provider: 'unknown' };
}

function regionList() {
  return REGIONS.map((r) => r.province);
}

module.exports = { locate, regionList, REGIONS };
