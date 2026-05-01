/**
 * IPTV 源自动采集脚本
 * 功能：从多个 GitHub 仓库采集源、去重、测试、输出
 */

const https = require('https');
const http = require('http');
const fs = require('fs');
const path = require('path');

// 知名 IPTV 仓库列表
const SOURCES = [
  // iptv-org 官方库
  { name: 'iptv-org', url: 'https://raw.githubusercontent.com/iptv-org/iptv/master/streams/cn.m3u' },
  
  // FanMingMing/Live - 国内直播源
  { name: 'FanMingMing/Live', url: 'https://raw.githubusercontent.com/FanmingFe/Live/master/README.m3u' },
  
  // 国内镜像源
  { name: '国内源1', url: 'https://ghproxy.com/https://raw.githubusercontent.com/iptv-org/iptv/master/streams/cn.m3u' },
];

// 分组名称映射
const GROUP_MAP = {
  'CCTV': '央视台',
  'CETV': '教育台',
  '北京': '地方台',
  '上海': '地方台',
  '广东': '地方台',
  '深圳': '地方台',
  '浙江': '地方台',
  '江苏': '地方台',
  '湖南': '地方台',
  '东方': '地方台',
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
  ' Channel': '卫视频',
  '卡通': '卡通类',
  '金鹰': '卡通类',
  '炫动': '卡通类',
  '优漫': '卡通类',
  '嘉佳': '卡通类',
  '少儿': '卡通类',
  '纪实': '纪实类',
  'BRTV': '地方台',
  '农林': '地方台',
  '新闻': '新闻类',
  '国际': '国际台',
  'CGTN': '国际台',
  'DW': '国际台',
  'NHK': '国际台',
  'BBC': '国际台',
  'VOA': '国际台',
};

const httpAgent = new http.Agent({ keepAlive: true, timeout: 10000 });
const httpsAgent = new https.Agent({ keepAlive: true, timeout: 10000 });

/**
 * HTTP GET 请求
 */
function fetch(url, timeout = 30000) {
  return new Promise((resolve, reject) => {
    const isHttps = url.startsWith('https://');
    const client = isHttps ? https : http;
    const agent = isHttps ? httpsAgent : httpAgent;
    
    const req = client.get(url, { agent }, (res) => {
      // 处理重定向
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
    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Timeout'));
    });
    
    req.setTimeout(timeout);
  });
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
      // 解析扩展信息
      const info = trimmed.substring(8);
      const match = info.match(/,([^,]*)$/);
      const name = match ? match[1] : '未知';
      
      // 提取属性
      const attrs = {};
      const attrMatches = trimmed.matchAll(/([a-zA-Z0-9-]+)="([^"]*)"/g);
      for (const m of attrMatches) {
        attrs[m[1]] = m[2];
      }
      
      currentChannel = {
        name: name,
        url: '',
        logo: attrs['tvg-logo'] || attrs['logo'] || '',
        group: attrs['group-title'] || attrs['tvg-group'] || '',
        country: attrs['country'] || attrs['tvg-country'] || 'CN',
      };
    } else if (trimmed && !trimmed.startsWith('#') && currentChannel) {
      // URL 行
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
  
  // 默认分组
  if (name.includes('CCTV') || name.includes('CETV')) {
    return '央视台';
  }
  if (name.includes('卫视')) {
    return '卫视台';
  }
  
  return '其他台';
}

/**
 * 频道去重（基于 URL）
 */
function deduplicateChannels(channels) {
  const seen = new Set();
  const result = [];
  
  for (const ch of channels) {
    if (!seen.has(ch.url) && ch.url.startsWith('http')) {
      seen.add(ch.url);
      
      // 如果分组为空，自动确定
      if (!ch.group) {
        ch.group = determineGroup(ch.name);
      }
      
      result.push(ch);
    }
  }
  
  return result;
}

/**
 * 测试频道源是否有效
 */
async function testChannel(channel, timeout = 8000) {
  return new Promise((resolve) => {
    const start = Date.now();
    
    try {
      const req = (channel.url.startsWith('https') ? https : http).request(channel.url, {
        method: 'HEAD',
        timeout,
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; IPTV-Auto-Update/1.0)',
        }
      }, (res) => {
        const elapsed = Date.now() - start;
        // 接受 2xx, 3xx 状态码
        resolve({ ...channel, valid: res.statusCode >= 200 && res.statusCode < 400, elapsed });
      });
      
      req.on('error', () => {
        resolve({ ...channel, valid: false, elapsed: Date.now() - start });
      });
      
      req.on('timeout', () => {
        req.destroy();
        resolve({ ...channel, valid: false, elapsed: timeout });
      });
      
      req.end();
    } catch (e) {
      resolve({ ...channel, valid: false, elapsed: 0 });
    }
  });
}

/**
 * 生成 M3U 文件内容
 */
function generateM3U(channels) {
  const lines = ['#EXTM3U', ''];
  
  // 按分组排序
  const groups = {};
  for (const ch of channels) {
    const group = ch.group || '其他台';
    if (!groups[group]) groups[group] = [];
    groups[group].push(ch);
  }
  
  const groupOrder = ['央视台', '卫视台', '地方台', '卡通类', '纪实类', '新闻类', '国际台', '其他台'];
  
  for (const group of groupOrder) {
    if (!groups[group]) continue;
    
    for (const ch of groups[group]) {
      lines.push(`#EXTINF:-1 tvg-name="${ch.name}" tvg-logo="${ch.logo}" group-title="${group}",${ch.name}`);
      lines.push(ch.url);
    }
    lines.push('');
  }
  
  return lines.join('\n');
}

/**
 * 生成 JSON 文件内容
 */
function generateJSON(channels) {
  return JSON.stringify({
    update: new Date().toISOString(),
    count: channels.length,
    channels: channels.map(ch => ({
      name: ch.name,
      url: ch.url,
      logo: ch.logo,
      group: ch.group,
    }))
  }, null, 2);
}

/**
 * 主函数
 */
async function main() {
  console.log('🚀 IPTV 源自动采集开始...\n');
  
  const allChannels = [];
  
  // 从各来源采集
  for (const source of SOURCES) {
    try {
      console.log(`📡 从 ${source.name} 采集...`);
      const content = await fetch(source.url, 30000);
      const channels = parseM3U(content);
      console.log(`   获取到 ${channels.length} 个频道`);
      allChannels.push(...channels);
    } catch (e) {
      console.log(`   ❌ 失败: ${e.message}`);
    }
  }
  
  console.log(`\n📊 共采集 ${allChannels.length} 个频道（去重前）`);
  
  // 去重
  const uniqueChannels = deduplicateChannels(allChannels);
  console.log(`🔄 去重后剩余 ${uniqueChannels.length} 个频道`);
  
  // 随机选取最多 200 个进行测试（完整测试太耗时）
  const testCount = Math.min(200, uniqueChannels.length);
  const testChannels = uniqueChannels
    .sort(() => Math.random() - 0.5)
    .slice(0, testCount);
  
  console.log(`\n⏱️  测试前 ${testCount} 个频道（并发 20）...`);
  
  const concurrency = 20;
  const validChannels = [];
  let tested = 0;
  
  for (let i = 0; i < testChannels.length; i += concurrency) {
    const batch = testChannels.slice(i, i + concurrency);
    const results = await Promise.all(batch.map(ch => testChannel(ch)));
    
    for (const result of results) {
      tested++;
      if (result.valid) {
        validChannels.push(result);
        process.stdout.write(`\r   ✅ ${tested}/${testCount} 测试通过`);
      } else {
        process.stdout.write(`\r   ❌ ${tested}/${testCount} 测试失败`);
      }
    }
  }
  
  console.log(`\n\n✅ 有效源: ${validChannels.length}/${testCount}`);
  
  // 对于未测试的频道，保留原样（标记为待测试）
  const untestedChannels = uniqueChannels.slice(testCount);
  console.log(`⏸️  未测试: ${untestedChannels.length} 个（直接保留）`);
  
  // 合并结果：有效的 + 未测试的
  const finalChannels = [...validChannels, ...untestedChannels];
  
  // 按名称排序
  finalChannels.sort((a, b) => a.name.localeCompare(b.name, 'zh-CN'));
  
  console.log(`\n📝 生成最终文件（共 ${finalChannels.length} 个频道）...`);
  
  // 输出 M3U
  const m3uContent = generateM3U(finalChannels);
  fs.writeFileSync(path.join(__dirname, 'iptv.m3u'), m3uContent, 'utf8');
  
  // 输出 JSON
  const jsonContent = generateJSON(finalChannels);
  fs.writeFileSync(path.join(__dirname, 'channels.json'), jsonContent, 'utf8');
  
  console.log('✅ 完成！');
  console.log(`   - iptv.m3u: ${finalChannels.length} 个频道`);
  console.log(`   - channels.json: ${finalChannels.length} 个频道`);
}

// 运行
main().catch(console.error);
