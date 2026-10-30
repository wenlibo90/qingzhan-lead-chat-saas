'use strict';

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

function hashIp(ip) {
  let h = 2166136261;
  const str = String(ip || '0.0.0.0');
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return Math.abs(h);
}

function isPrivate(ip) {
  return /^(10\.|127\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.|::1|localhost)/.test(String(ip || ''));
}

/**
 * 本地 IP 归属地解析。生产环境可通过 GEO_API 接入高德/腾讯位置服务，
 * 未配置时使用确定性映射，保证同一 IP 始终归入同一区域，便于演示与统计。
 */
async function locate(ip) {
  if (process.env.GEO_API) {
    try {
      const url = process.env.GEO_API.replace('{ip}', encodeURIComponent(ip));
      const resp = await fetch(url, { signal: AbortSignal.timeout(1500) });
      if (resp.ok) {
        const data = await resp.json();
        const province = data.province || data.region || '';
        const city = data.city || '';
        if (province) return { country: '中国', province, city, provider: 'api' };
      }
    } catch {
      /* fall through to local resolver */
    }
  }
  if (isPrivate(ip)) return { country: '本地', province: '本地网络', city: '内网', provider: 'local' };
  const h = hashIp(ip);
  const total = REGIONS.reduce((s, r) => s + r.weight, 0);
  let cursor = h % total;
  for (const region of REGIONS) {
    cursor -= region.weight;
    if (cursor < 0) {
      return { country: '中国', province: region.province, city: region.city, provider: 'local' };
    }
  }
  return { country: '中国', province: '广东', city: '深圳', provider: 'local' };
}

function regionList() {
  return REGIONS.map((r) => r.province);
}

module.exports = { locate, regionList, REGIONS };
