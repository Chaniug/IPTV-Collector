/**
 * IPTV 源自动采集脚本 v2
 * 专注于国内可用源，优先使用国内 CDN
 */

const https = require('https');
const http = require('http');
const fs = require('fs');
const path = require('path');

// 可靠的采集源
const SOURCES = [
  // iptv-org 中国源（过滤后）
  { name: 'iptv-org 中国', url: 'https://raw.githubusercontent.com/iptv-org/iptv/master/streams/cn.m3u' },
  
  // 国内镜像（备选）
  { name: 'Gitee镜像', url: 'https://gitee.com/xietao3/IPTV/raw/master/streams/cn.m3u' },
];

// 国内 CDN 域名白名单（优先保留）
const DOMAIN_WHITELIST = [
  'bupt.edu.cn',
  'chinamobile.com',
  'chinaunicom.com',
  'ctyun.cn',
  'cdn.jsdelivr.net',
  'ghproxy.com',
  'gitproxy.com',
  'tankr.net',
  'tv.cctv.com',
  'migu.cn',
  'cmvideo.cn',
  'goodiptv.club',
  'wiserain.fr',
];

// 国外域名黑名单（大概率不可用）
const DOMAIN_BLACKLIST = [
  'youtube.com',
  'twitch.tv',
  'akamai',
  'cloudfront',
  'akamaized',
  'dailymotion',
  'stream.root',
  '.ru/',
  'us.to',
];

// 分组映射
const GROUP_MAP = {
  'CCTV': '央视台',
  'CETV': '教育台',
  'CETV-1': '教育台',
  'BRTV': '地方台',
  'BTV': '地方台',
  '北京': '地方台',
  '上海': '地方台',
  '广东': '地方台',
  '深圳': '地方台',
  '浙江': '地方台',
  '江苏': '地方台',
  '湖南': '地方台',
  '东方': '地方台',
  '东方卫视': '卫视台',
  '安徽': '地方台',
  '山东': '地方台',
  '四川': '地方台',
  '湖北': '地方台',
  '辽宁': '地方台',
  '天津': '地方台',
  '重庆': '地方台',
  '黑龙江': '地方台',
  '吉林': '地方台',
  '河北': '地方台',
  '河南': '地方台',
  '山西': '地方台',
  '陕西': '地方台',
  '云南': '地方台',
  '贵州': '地方台',
  '海南': '地方台',
  '江西': '地方台',
  '福建': '地方台',
  '甘肃': '地方台',
  '青海': '地方台',
  '宁夏': '地方台',
  '新疆': '地方台',
  '西藏': '地方台',
  '广西': '地方台',
  '内蒙古': '地方台',
  '凤凰': '卫视台',
  '华视': '卫视台',
  '东风': '卫视台',
  'TVBS': '卫视台',
  '中视': '卫视台',
  '东森': '卫视台',
  'JET': '卫视台',
  'J2': '卫视台',
  'VTV': '卫视台',
  '卡通': '卡通类',
  '金鹰卡通': '卡通类',
  '炫动卡通': '卡通类',
  '优漫卡通': '卡通类',
  '嘉佳卡通': '卡通类',
  '纪实': '纪实类',
  '新闻': '新闻类',
  'CGTN': '国际台',
  'DW': '国际台',
  'NHK': '国际台',
  'BBC': '国际台',
  'VOA': '国际台',
  '农科': '科学类',
  'CGTN': '国际台',
  '国防军事': '军事类',
  '农林卫视': '地方台',
};

/**
 * HTTP 请求封装
 */
function fetch(url, timeout = 20000) {
  return new Promise((resolve, reject) => {
    const isHttps = url.startsWith('https://');
    const client = isHttps ? https : http;
    
    const req = client.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': '*/*',
      }
    }, (res) => {
      if (res.statusCode === 301 || res.statusCode === 302) {
        if (res.headers.location) {
          return fetch(res.headers.location, timeout).then(resolve).catch(reject);
        }
      }
      
      if (res.statusCode !== 200) {
        return reject(new Error(`HTTP ${res.statusCode}`));
      }
      
      const chunks = [];
      res.on('data', chunk => chunks.push(chunk));
      res.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    });
    
    req.on('error', reject);
    req.setTimeout(timeout, () => {
      req.destroy();
      reject(new Error('Timeout'));
    });
  });
}

/**
 * 检查 URL 是否可能可用（国内访问）
 */
function isLikelyAvailable(url) {
  if (!url || !url.startsWith('http')) return false;
  
  // 检查黑名单
  for (const black of DOMAIN_BLACKLIST) {
    if (url.includes(black)) return false;
  }
  
  // 检查白名单
  for (const white of DOMAIN_WHITELIST) {
    if (url.includes(white)) return true;
  }
  
  // 检查是否为国内域名
  const cnDomains = ['.cn', '.com.cn', '.net.cn', '.org.cn', '.gov.cn'];
  const hasCnDomain = cnDomains.some(d => url.includes(d));
  const hasBaiduMirror = url.includes('baidu') || url.includes('cn');
  
  // 检查端口（常见国内端口）
  const commonPorts = [80, 443, 8080, 554, 8000, 8888];
  const hasCommonPort = commonPorts.some(p => url.includes(`:${p}`));
  
  return hasCnDomain || hasBaiduMirror || hasCommonPort;
}

/**
 * 解析 M3U 文件
 */
function parseM3U(content) {
  const channels = [];
  const lines = content.split(/\r?\n/);
  
  let currentChannel = null;
  
  for (const line of lines) {
    const trimmed = line.trim();
    
    if (trimmed.startsWith('#EXTINF:')) {
      const info = trimmed.substring(8);
      const match = info.match(/,([^,]*)$/);
      const name = match ? match[1].trim() : '未知';
      
      const attrs = {};
      for (const m of trimmed.matchAll(/([a-zA-Z0-9-]+)="([^"]*)"/g)) {
        attrs[m[1]] = m[2];
      }
      
      currentChannel = {
        name,
        url: '',
        logo: attrs['tvg-logo'] || attrs['logo'] || '',
        group: attrs['group-title'] || '',
        country: attrs['country'] || 'CN',
      };
    } else if (trimmed && !trimmed.startsWith('#') && currentChannel) {
      currentChannel.url = trimmed;
      if (currentChannel.name && currentChannel.url) {
        channels.push({...currentChannel});
      }
      currentChannel = null;
    }
  }
  
  return channels;
}

/**
 * 确定频道分组
 */
function determineGroup(name) {
  for (const [keyword, group] of Object.entries(GROUP_MAP)) {
    if (name.includes(keyword)) {
      return group;
    }
  }
  
  if (name.includes('CCTV') || name.includes('CETV')) return '央视台';
  if (name.includes('卫视')) return '卫视台';
  
  return '其他台';
}

/**
 * 测试频道源
 */
async function testChannel(channel, timeout = 5000) {
  return new Promise((resolve) => {
    try {
      const req = (channel.url.startsWith('https') ? https : http).request(channel.url, {
        method: 'HEAD',
        timeout,
        headers: {
          'User-Agent': 'VLC/3.0.18 LibVLC/3.0.18',
          'Accept': '*/*',
        }
      }, (res) => {
        resolve({ 
          ...channel, 
          valid: res.statusCode >= 200 && res.statusCode < 400,
          status: res.statusCode
        });
      });
      
      req.on('error', () => resolve({ ...channel, valid: false }));
      req.on('timeout', () => {
        req.destroy();
        resolve({ ...channel, valid: false });
      });
      
      req.setTimeout(timeout, () => {
        req.destroy();
        resolve({ ...channel, valid: false });
      });
      
      req.end();
    } catch (e) {
      resolve({ ...channel, valid: false });
    }
  });
}

/**
 * 生成 M3U 文件
 */
function generateM3U(channels) {
  const lines = ['#EXTM3U', ''];
  
  const groups = {};
  for (const ch of channels) {
    const g = ch.group || '其他台';
    if (!groups[g]) groups[g] = [];
    groups[g].push(ch);
  }
  
  const order = ['央视台', '卫视台', '地方台', '卡通类', '纪实类', '新闻类', '国际台', '其他台'];
  
  for (const g of order) {
    if (!groups[g]) continue;
    for (const ch of groups[g].sort((a, b) => a.name.localeCompare(b.name, 'zh-CN'))) {
      lines.push(`#EXTINF:-1 tvg-name="${ch.name}" tvg-logo="${ch.logo}" group-title="${g}",${ch.name}`);
      lines.push(ch.url);
    }
    lines.push('');
  }
  
  return lines.join('\n');
}

/**
 * 主函数
 */
async function main() {
  console.log('🚀 IPTV 源采集开始（国内优先版）\n');
  
  const allChannels = [];
  
  for (const source of SOURCES) {
    try {
      console.log(`📡 从 ${source.name} 采集...`);
      const content = await fetch(source.url, 30000);
      const channels = parseM3U(content);
      console.log(`   获取 ${channels.length} 个频道`);
      allChannels.push(...channels);
    } catch (e) {
      console.log(`   ❌ 失败: ${e.message}`);
    }
  }
  
  console.log(`\n📊 采集 ${allChannels.length} 个频道`);
  
  // 优先保留国内可用源
  const priorityChannels = allChannels.filter(ch => isLikelyAvailable(ch.url));
  const otherChannels = allChannels.filter(ch => !isLikelyAvailable(ch.url));
  
  console.log(`🎯 优先保留 ${priorityChannels.length} 个（国内/高可用）`);
  console.log(`📦 备用 ${otherChannels.length} 个（待测试）`);
  
  // 去重
  const seen = new Set();
  const deduplicated = [];
  
  for (const ch of [...priorityChannels, ...otherChannels]) {
    if (!seen.has(ch.url) && ch.url.startsWith('http')) {
      seen.add(ch.url);
      if (!ch.group) ch.group = determineGroup(ch.name);
      deduplicated.push(ch);
    }
  }
  
  console.log(`🔄 去重后 ${deduplicated.length} 个频道`);
  
  // 测试优先通道（前 150 个）
  const toTest = deduplicated.slice(0, 150);
  const untested = deduplicated.slice(150);
  
  console.log(`\n⏱️  测试 ${toTest.length} 个通道...`);
  
  const concurrency = 30;
  const validChannels = [];
  let tested = 0;
  
  for (let i = 0; i < toTest.length; i += concurrency) {
    const batch = toTest.slice(i, i + concurrency);
    const results = await Promise.all(batch.map(ch => testChannel(ch)));
    
    for (const r of results) {
      tested++;
      if (r.valid) {
        validChannels.push(r);
        process.stdout.write(`\r   ✅ ${tested}/${toTest.length}`);
      }
    }
  }
  
  console.log(`\n\n✅ 有效: ${validChannels.length}/${toTest.length}`);
  
  // 合并：有效源 + 未测试的优先源
  const finalChannels = [
    ...validChannels,
    ...untested.filter(ch => isLikelyAvailable(ch.url)),
  ];
  
  console.log(`📝 最终保留 ${finalChannels.length} 个频道`);
  
  // 保存
  const m3uPath = path.join(__dirname, '..', 'iptv.m3u');
  const jsonPath = path.join(__dirname, '..', 'channels.json');
  
  fs.writeFileSync(m3uPath, generateM3U(finalChannels), 'utf8');
  fs.writeFileSync(jsonPath, JSON.stringify({
    update: new Date().toISOString(),
    count: finalChannels.length,
    valid: validChannels.length,
    channels: finalChannels.map(ch => ({
      name: ch.name,
      url: ch.url,
      logo: ch.logo,
      group: ch.group,
    }))
  }, null, 2), 'utf8');
  
  console.log('\n✅ 完成！');
  console.log(`   iptv.m3u: ${finalChannels.length} 个`);
  console.log(`   channels.json: ${finalChannels.length} 个`);
  
  // 显示有效频道示例
  if (validChannels.length > 0) {
    console.log('\n📺 有效频道示例：');
    validChannels.slice(0, 10).forEach(ch => {
      console.log(`   ${ch.name} [${ch.group}]`);
    });
  }
}

main().catch(console.error);
