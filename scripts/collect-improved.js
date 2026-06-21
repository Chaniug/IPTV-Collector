/**
 * IPTV 源采集脚本 v5 - 改进版
 * 增加多源备份、优化测试逻辑、添加更多可靠源
 */

const https = require('https');
const http = require('http');
const fs = require('fs');
const path = require('path');

// ========== 多源预置频道（IPv6为主的稳定源） ==========
const PRESET_CHANNELS = [
  // 央视台 - 多源备份
  { name: 'CCTV-1 综合', url: 'http://[2409:8087:2001:20:2800:0:df6e:eb22]/ott.mobaibox.com/PLTV/4/224/3221226922/index.m3u8', group: '央视台', logo: 'https://epg.112114.xyz/logo/CCTV1.png' },
  { name: 'CCTV-1 综合', url: 'http://[2409:8087:1e03:21::4]:6060/cctv1hd/1.m3u8', group: '央视台', logo: 'https://epg.112114.xyz/logo/CCTV1.png' },
  { name: 'CCTV-2 财经', url: 'http://[2409:8087:2001:20:2800:0:df6e:eb22]/ott.mobaibox.com/PLTV/4/224/3221226923/index.m3u8', group: '央视台', logo: 'https://epg.112114.xyz/logo/CCTV2.png' },
  { name: 'CCTV-3 综艺', url: 'http://[2409:8087:2001:20:2800:0:df6e:eb22]/ott.mobaibox.com/PLTV/4/224/3221226924/index.m3u8', group: '央视台', logo: 'https://epg.112114.xyz/logo/CCTV3.png' },
  { name: 'CCTV-4 国际', url: 'http://[2409:8087:2001:20:2800:0:df6e:eb14]/ott.mobaibox.com/PLTV/4/224/3221226927/index.m3u8', group: '央视台', logo: 'https://epg.112114.xyz/logo/CCTV4.png' },
  { name: 'CCTV-5 体育', url: 'http://[2409:8087:2001:20:2800:0:df6e:eb22]/ott.mobaibox.com/PLTV/4/224/3221226925/index.m3u8', group: '央视台', logo: 'https://epg.112114.xyz/logo/CCTV5.png' },
  { name: 'CCTV-5+ 体育', url: 'http://[2409:8087:2001:20:2800:0:df6e:eb22]/ott.mobaibox.com/PLTV/4/224/3221226926/index.m3u8', group: '央视台', logo: 'https://epg.112114.xyz/logo/CCTV5+.png' },
  { name: 'CCTV-6 电影', url: 'http://[2409:8087:2001:20:2800:0:df6e:eb14]/ott.mobaibox.com/PLTV/4/224/3221227157/index.m3u8', group: '央视台', logo: 'https://epg.112114.xyz/logo/CCTV6.png' },
  { name: 'CCTV-7 国防', url: 'http://[2409:8087:2001:20:2800:0:df6e:eb14]/ott.mobaibox.com/PLTV/4/224/3221226940/index.m3u8', group: '央视台', logo: 'https://epg.112114.xyz/logo/CCTV7.png' },
  { name: 'CCTV-8 电视剧', url: 'http://[2409:8087:2001:20:2800:0:df6e:eb14]/ott.mobaibox.com/PLTV/4/224/3221226941/index.m3u8', group: '央视台', logo: 'https://epg.112114.xyz/logo/CCTV8.png' },
  { name: 'CCTV-9 纪录', url: 'http://[2409:8087:2001:20:2800:0:df6e:eb14]/ott.mobaibox.com/PLTV/4/224/3221226942/index.m3u8', group: '央视台', logo: 'https://epg.112114.xyz/logo/CCTV9.png' },
  { name: 'CCTV-10 科教', url: 'http://[2409:8087:2001:20:2800:0:df6e:eb14]/ott.mobaibox.com/PLTV/4/224/3221226943/index.m3u8', group: '央视台', logo: 'https://epg.112114.xyz/logo/CCTV10.png' },
  { name: 'CCTV-11 戏曲', url: 'http://[2409:8087:2001:20:2800:0:df6e:eb14]/ott.mobaibox.com/PLTV/4/224/3221226944/index.m3u8', group: '央视台', logo: 'https://epg.112114.xyz/logo/CCTV11.png' },
  { name: 'CCTV-12 社会与法', url: 'http://[2409:8087:2001:20:2800:0:df6e:eb14]/ott.mobaibox.com/PLTV/4/224/3221226945/index.m3u8', group: '央视台', logo: 'https://epg.112114.xyz/logo/CCTV12.png' },
  { name: 'CCTV-13 新闻', url: 'http://[2409:8087:2001:20:2800:0:df6e:eb14]/ott.mobaibox.com/PLTV/4/224/3221226946/index.m3u8', group: '央视台', logo: 'https://epg.112114.xyz/logo/CCTV13.png' },
  { name: 'CCTV-14 少儿', url: 'http://[2409:8087:2001:20:2800:0:df6e:eb14]/ott.mobaibox.com/PLTV/4/224/3221226948/index.m3u8', group: '央视台', logo: 'https://epg.112114.xyz/logo/CCTV14.png' },
  { name: 'CCTV-15 音乐', url: 'http://[2409:8087:2001:20:2800:0:df6e:eb14]/ott.mobaibox.com/PLTV/4/224/3221226947/index.m3u8', group: '央视台', logo: 'https://epg.112114.xyz/logo/CCTV15.png' },
  { name: 'CCTV-17 农业农村', url: 'http://[2409:8087:2001:20:2800:0:df6e:eb14]/ott.mobaibox.com/PLTV/4/224/3221227159/index.m3u8', group: '央视台', logo: 'https://epg.112114.xyz/logo/CCTV17.png' },
  { name: 'CETV-1', url: 'http://[2409:8087:2001:20:2800:0:df6e:eb14]/ott.mobaibox.com/PLTV/4/224/3221226959/index.m3u8', group: '教育台', logo: 'https://epg.112114.xyz/logo/CETV1.png' },

  // 卫视台 - 多源备份
  { name: '湖南卫视', url: 'http://[2409:8087:2001:20:2800:0:df6e:eb14]/ott.mobaibox.com/PLTV/4/224/3221226953/index.m3u8', group: '卫视台', logo: 'https://epg.112114.xyz/logo/湖南卫视.png' },
  { name: '浙江卫视', url: 'http://[2409:8087:2001:20:2800:0:df6e:eb14]/ott.mobaibox.com/PLTV/4/224/3221226952/index.m3u8', group: '卫视台', logo: 'https://epg.112114.xyz/logo/浙江卫视.png' },
  { name: '江苏卫视', url: 'http://[2409:8087:2001:20:2800:0:df6e:eb14]/ott.mobaibox.com/PLTV/4/224/3221226961/index.m3u8', group: '卫视台', logo: 'https://epg.112114.xyz/logo/江苏卫视.png' },
  { name: '东方卫视', url: 'http://[2409:8087:2001:20:2800:0:df6e:eb14]/ott.mobaibox.com/PLTV/4/224/3221226960/index.m3u8', group: '卫视台', logo: 'https://epg.112114.xyz/logo/东方卫视.png' },
  { name: '北京卫视', url: 'http://[2409:8087:2001:20:2800:0:df6e:eb22]/ott.mobaibox.com/PLTV/4/224/3221226967/index.m3u8', group: '卫视台', logo: 'https://epg.112114.xyz/logo/北京卫视.png' },
  { name: '广东卫视', url: 'http://[2409:8087:2001:20:2800:0:df6e:eb14]/ott.mobaibox.com/PLTV/4/224/3221226965/index.m3u8', group: '卫视台', logo: 'https://epg.112114.xyz/logo/广东卫视.png' },
  { name: '深圳卫视', url: 'http://[2409:8087:2001:20:2800:0:df6e:eb14]/ott.mobaibox.com/PLTV/4/224/3221226963/index.m3u8', group: '卫视台', logo: 'https://epg.112114.xyz/logo/深圳卫视.png' },
  { name: '天津卫视', url: 'http://[2409:8087:2001:20:2800:0:df6e:eb22]/ott.mobaibox.com/PLTV/4/224/3221226971/index.m3u8', group: '卫视台', logo: 'https://epg.112114.xyz/logo/天津卫视.png' },
  { name: '山东卫视', url: 'http://[2409:8087:2001:20:2800:0:df6e:eb14]/ott.mobaibox.com/PLTV/4/224/3221226964/index.m3u8', group: '卫视台', logo: 'https://epg.112114.xyz/logo/山东卫视.png' },
  { name: '安徽卫视', url: 'http://[2409:8087:2001:20:2800:0:df6e:eb14]/ott.mobaibox.com/PLTV/4/224/3221226968/index.m3u8', group: '卫视台', logo: 'https://epg.112114.xyz/logo/安徽卫视.png' },

  // 备用源（IPv4源 - 更通用）
  { name: 'CCTV-1 综合', url: 'http://39.134.66.66/PLTV/88888888/224/3221227200/index.m3u8', group: '央视台', logo: 'https://epg.112114.xyz/logo/CCTV1.png' },
  { name: 'CCTV-2 财经', url: 'http://39.134.66.66/PLTV/88888888/224/3221227201/index.m3u8', group: '央视台', logo: 'https://epg.112114.xyz/logo/CCTV2.png' },
  { name: 'CCTV-5 体育', url: 'http://39.134.66.66/PLTV/88888888/224/3221227203/index.m3u8', group: '央视台', logo: 'https://epg.112114.xyz/logo/CCTV5.png' },
  { name: '湖南卫视', url: 'http://39.134.66.66/PLTV/88888888/224/3221227337/index.m3u8', group: '卫视台', logo: 'https://epg.112114.xyz/logo/湖南卫视.png' },
  { name: '浙江卫视', url: 'http://39.134.66.66/PLTV/88888888/224/3221227336/index.m3u8', group: '卫视台', logo: 'https://epg.112114.xyz/logo/浙江卫视.png' },
  { name: '江苏卫视', url: 'http://39.134.66.66/PLTV/88888888/224/3221227205/index.m3u8', group: '卫视台', logo: 'https://epg.112114.xyz/logo/江苏卫视.png' },
  { name: '北京卫视', url: 'http://39.134.66.66/PLTV/88888888/224/3221227210/index.m3u8', group: '卫视台', logo: 'https://epg.112114.xyz/logo/北京卫视.png' },

  // 卡通类
  { name: '金鹰卡通', url: 'http://[2409:8087:2001:20:2800:0:df6e:eb14]/ott.mobaibox.com/PLTV/4/224/3221226972/index.m3u8', group: '卡通类', logo: 'https://epg.112114.xyz/logo/金鹰卡通.png' },
  { name: '优漫卡通', url: 'http://[2409:8087:2001:20:2800:0:df6e:eb14]/ott.mobaibox.com/PLTV/4/224/3221226993/index.m3u8', group: '卡通类', logo: 'https://epg.112114.xyz/logo/优漫卡通.png' },
  { name: '卡酷少儿', url: 'http://[2409:8087:2001:20:2800:0:df6e:eb22]/ott.mobaibox.com/PLTV/4/224/3221226986/index.m3u8', group: '卡通类', logo: 'https://epg.112114.xyz/logo/卡酷少儿.png' },

  // 高清测试源（国内较稳定的源）
  { name: 'CCTV-4K 测试', url: 'http://39.134.66.66/PLTV/88888888/224/3221227202/index.m3u8', group: '测试台', logo: 'https://epg.112114.xyz/logo/CCTV4K.png' },
  { name: 'CCTV-8K 测试', url: 'http://39.134.66.66/PLTV/88888888/224/3221227204/index.m3u8', group: '测试台', logo: 'https://epg.112114.xyz/logo/CCTV8K.png' }
];

// ========== 改进的 HTTP 请求 ==========
function fetchWithRetry(url, options = {}) {
  return new Promise((resolve, reject) => {
    const retryCount = options.retryCount || 3;
    const timeout = options.timeout || 15000;
    const method = options.method || 'GET';

    let attempts = 0;

    function attempt() {
      attempts++;

      const isHttps = url.startsWith('https://');
      const client = isHttps ? https : http;

      const req = client.request(url, {
        method,
        headers: {
          'User-Agent': 'VLC/3.0.18',
          'Accept': '*/*',
          'Connection': 'close'
        },
        timeout
      }, (res) => {
        const statusCode = res.statusCode;
        const contentType = res.headers['content-type'] || '';

        if (statusCode >= 200 && statusCode < 400 && contentType.includes('application/vnd.apple.mpegurl')) {
          // 这是 m3u8 文件，验证是否包含有效内容
          const chunks = [];
          res.on('data', chunk => chunks.push(chunk));
          res.on('end', () => {
            const content = Buffer.concat(chunks).toString('utf8');
            // 检查是否包含 #EXTM3U 标识
            if (content.includes('#EXTM3U') && content.includes('#EXTINF')) {
              resolve({ statusCode, content: content.substring(0, 5000) });
            } else {
              if (attempts < retryCount) {
                attempt();
              } else {
                reject(new Error('Invalid m3u8 format'));
              }
            }
          });
        } else if (statusCode >= 200 && statusCode < 400) {
          // 其他有效的 HTTP 响应
          const chunks = [];
          res.on('data', chunk => chunks.push(chunk));
          res.on('end', () => {
            resolve({ statusCode, content: Buffer.concat(chunks).toString('utf8').substring(0, 5000) });
          });
        } else {
          if (attempts < retryCount) {
            attempt();
          } else {
            reject(new Error(`HTTP ${statusCode}`));
          }
        }
      });

      req.on('error', (err) => {
        if (attempts < retryCount) {
          attempt();
        } else {
          reject(err);
        }
      });

      req.setTimeout(timeout, () => {
        req.destroy();
        if (attempts < retryCount) {
          attempt();
        } else {
          reject(new Error('Timeout'));
        }
      });

      req.end();
    }

    attempt();
  });
}

// ========== 改进的源测试 ==========
async function testChannel(channel, timeout = 10000) {
  return new Promise((resolve) => {
    try {
      const controller = new AbortController();
      const signal = controller.signal;

      const timeoutId = setTimeout(() => {
        controller.abort();
      }, timeout);

      const url = channel.url;
      const isHttps = url.startsWith('https://');
      const client = isHttps ? https : http;

      const req = client.request(url, {
        method: 'HEAD',
        timeout,
        signal,
        headers: {
          'User-Agent': 'VLC/3.0.18',
          'Accept': '*/*',
          'Connection': 'close'
        }
      }, (res) => {
        clearTimeout(timeoutId);
        const statusCode = res.statusCode;
        const contentType = res.headers['content-type'] || '';

        // 更严格的验证：需要是有效的 m3u8 响应
        const isValid = statusCode >= 200 && statusCode < 400 &&
                       (contentType.includes('application/vnd.apple.mpegurl') ||
                        contentType.includes('audio/x-mpegurl') ||
                        contentType.includes('video/mpegurl'));

        resolve({
          ...channel,
          valid: isValid,
          status: statusCode,
          contentType: contentType
        });

        res.destroy();
      });

      req.on('error', (err) => {
        clearTimeout(timeoutId);
        resolve({ ...channel, valid: false, error: err.message });
      });

      req.setTimeout(timeout, () => {
        clearTimeout(timeoutId);
        req.destroy();
        resolve({ ...channel, valid: false, error: 'Timeout' });
      });

      req.end();
    } catch (e) {
      resolve({ ...channel, valid: false, error: e.message });
    }
  });
}

// ========== 生成 M3U ==========
function generateM3U(channels) {
  const lines = ['#EXTM3U', ''];
  const groups = {};

  for (const ch of channels) {
    const g = ch.group || '其他台';
    if (!groups[g]) groups[g] = [];
    groups[g].push(ch);
  }

  const order = ['央视台', '卫视台', '卡通类', '教育台', '测试台', '其他台'];
  for (const g of order) {
    if (!groups[g]) continue;

    // 按频道名称排序
    const sortedChannels = groups[g].sort((a, b) => a.name.localeCompare(b.name, 'zh-CN'));

    for (const ch of sortedChannels) {
      lines.push(`#EXTINF:-1 tvg-id="${ch.name.replace(/\s+/g, '')}" tvg-name="${ch.name}" tvg-logo="${ch.logo}" group-title="${g}",${ch.name}`);
      lines.push(ch.url);
    }
    lines.push('');
  }

  return lines.join('\n');
}

// ========== 主函数 ==========
async function main() {
  console.log('🚀 IPTV 源采集开始（改进版 v5）\n');
  console.log('📡 使用 IPv6 + IPv4 多源备份策略\n');

  // 1. 测试预置源
  console.log(`📡 测试 ${PRESET_CHANNELS.length} 个预置源...`);

  const concurrency = 10;
  const results = [];

  for (let i = 0; i < PRESET_CHANNELS.length; i += concurrency) {
    const batch = PRESET_CHANNELS.slice(i, i + concurrency);
    const batchResults = await Promise.all(batch.map(ch => testChannel(ch)));
    results.push(...batchResults);

    const passed = batchResults.filter(r => r.valid).length;
    process.stdout.write(`\r   ${Math.min(i + concurrency, PRESET_CHANNELS.length)}/${PRESET_CHANNELS.length} | ✅通过: ${passed}`);
  }

  const validChannels = results.filter(r => r.valid);
  console.log(`\n\n✅ 有效预置源: ${validChannels.length}/${PRESET_CHANNELS.length}`);

  if (validChannels.length === 0) {
    console.log('❌ 没有有效的预置源，尝试从外部源采集...');
  } else {
    // 显示有效的源
    console.log('\n📺 有效频道列表:');
    const byGroup = {};
    validChannels.forEach(ch => {
      const group = ch.group || '其他台';
      if (!byGroup[group]) byGroup[group] = [];
      byGroup[group].push(ch);
    });

    Object.entries(byGroup).forEach(([group, channels]) => {
      console.log(`   ${group}: ${channels.length}个`);
    });
  }

  // 2. 尝试采集外部源补充
  console.log('\n📡 采集外部源补充...');

  const externalChannels = [];

  const externalSources = [
    'https://mirror.ghproxy.com/https://raw.githubusercontent.com/iptv-org/iptv/master/streams/cn.m3u', // 使用镜像源
    'https://mirror.ghproxy.com/https://raw.githubusercontent.com/Evil-c/Iptv-List/master/Iptv-List.m3u',
    'https://raw.githubusercontent.com/YanG-1989/m3u/main/Gather.m3u'
  ];

  let sourceIndex = 0;
  for (const src of externalSources) {
    sourceIndex++;
    try {
      console.log(`   源${sourceIndex}: 从 ${new URL(src).hostname} 采集...`);
      const result = await fetchWithRetry(src, { timeout: 30000 });

      const lines = result.content.split(/\r?\n/);
      let currentChannel = null;

      for (const line of lines) {
        const trimmed = line.trim();

        if (trimmed.startsWith('#EXTINF:')) {
          const match = trimmed.match(/,([^,]*)$/);
          const name = match ? match[1].trim() : '未知';
          const attrs = {};
          for (const m of trimmed.matchAll(/([a-zA-Z-]+)=\"([^\"]*)\"/g)) {
            attrs[m[1]] = m[2];
          }
          currentChannel = {
            name,
            logo: attrs['tvg-logo'] || attrs['tvg-logo'] || '',
            group: attrs['group-title'] || ''
          };
        } else if (trimmed && !trimmed.startsWith('#') && currentChannel) {
          currentChannel.url = trimmed;

          // 过滤掉已有的源
          const hasDuplicate = validChannels.some(v => v.url === trimmed) ||
                              externalChannels.some(ec => ec.url === trimmed);

          if (!hasDuplicate) {
            // 自动分类
            if (!currentChannel.group) {
              const n = currentChannel.name;
              if (n.includes('CCTV') || n.includes('CETV')) {
                currentChannel.group = '央视台';
              } else if (n.includes('卫视') || n.includes('凤凰')) {
                currentChannel.group = '卫视台';
              } else if (n.includes('卡通') || n.includes('少儿')) {
                currentChannel.group = '卡通类';
              } else if (n.includes('教育')) {
                currentChannel.group = '教育台';
              } else {
                currentChannel.group = '其他台';
              }
            }
            externalChannels.push({...currentChannel});
          }
          currentChannel = null;
        }
      }

      console.log(`   获取 ${externalChannels.length} 个新频道`);

      if (externalChannels.length >= 30) {
        console.log('   已获取足够的外部源，停止进一步采集');
        break;
      }
    } catch (e) {
      console.log(`   ❌ 失败: ${e.message}`);
    }
  }

  // 3. 测试并过滤外部源（只测试前30个）
  console.log('\n📡 测试外部源有效性...');
  const externalToTest = externalChannels.slice(0, 30);
  const externalTestResults = await Promise.all(externalToTest.map(ch => testChannel(ch)));
  const validExternalChannels = externalTestResults.filter(r => r.valid);

  console.log(`✅ 有效外部源: ${validExternalChannels.length}/${externalToTest.length}`);

  // 4. 合并并去重
  const allChannels = [...validChannels, ...validExternalChannels];
  const seen = new Set();
  const finalChannels = allChannels.filter(ch => {
    if (seen.has(ch.url)) return false;
    seen.add(ch.url);
    return true;
  });

  console.log(`\n📊 最终: ${finalChannels.length} 个频道`);

  // 5. 保存
  const m3uPath = path.join(__dirname, '..', 'iptv.m3u');
  const jsonPath = path.join(__dirname, '..', 'channels.json');

  // 添加默认logo（如果缺失）
  const finalChannelsWithLogo = finalChannels.map(ch => ({
    ...ch,
    logo: ch.logo || `https://epg.112114.xyz/logo/${ch.name.replace(/\s+/g, '')}.png`
  }));

  fs.writeFileSync(m3uPath, generateM3U(finalChannelsWithLogo), 'utf8');
  fs.writeFileSync(jsonPath, JSON.stringify({
    update: new Date().toISOString(),
    count: finalChannels.length,
    preset_valid: validChannels.length,
    external_valid: validExternalChannels.length,
    channels: finalChannelsWithLogo.map(ch => ({
      name: ch.name,
      url: ch.url,
      logo: ch.logo,
      group: ch.group,
      category: ch.group // 为前端应用添加兼容字段
    }))
  }, null, 2), 'utf8');

  console.log('\n✅ 完成！');
  console.log(`   iptv.m3u: ${finalChannels.length} 个频道`);
  console.log(`   channels.json: ${finalChannels.length} 个频道`);

  // 分组统计
  const groupStats = {};
  for (const ch of finalChannels) {
    groupStats[ch.group] = (groupStats[ch.group] || 0) + 1;
  }
  console.log('\n📺 分组统计:');
  for (const [g, c] of Object.entries(groupStats)) {
    console.log(`   ${g}: ${c}`);
  }

  console.log('\n💡 使用建议:');
  console.log('   1. 直接打开 iptv.m3u 文件使用 M3U 播放器');
  console.log('   2. 或在网页中打开 index.html 查看频道列表');
  console.log('   3. IPv6 源需要网络支持 IPv6，如无法播放尝试 IPv4 源');
  console.log(`\n🕐 更新时间: ${new Date().toLocaleString('zh-CN')}`);
}

// 错误处理
process.on('unhandledRejection', (reason, promise) => {
  console.error('未处理的 Promise 拒绝:', reason);
});

main().catch(error => {
  console.error('采集过程中发生错误:', error);
  process.exit(1);
});