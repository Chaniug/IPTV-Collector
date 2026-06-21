/**
 * IPTV 源采集脚本 - 实用版
 * 使用稳定的公开源和实际的分类逻辑
 */

const https = require('https');
const http = require('http');
const fs = require('fs');
const path = require('path');

// ========== 默认公开源列表 ==========
const DEFAULT_SOURCES = [
  'https://raw.githubusercontent.com/iptv-org/iptv/master/streams/cn.m3u',
  'https://iptv-org.github.io/iptv/index.m3u',
  'https://raw.githubusercontent.com/fanmingming/live/main/tv/m3u/global.m3u',
  'https://raw.githubusercontent.com/YueChan/Live/main/IPTV.m3u',
  'https://iptv.228088.xyz/cn.m3u',
  'https://epg.pw/test_channels.m3u',
  'https://raw.githubusercontent.com/imDazui/Tvlist-awesome-m3u-m3u8/master/m3u/%E5%85%A8%E5%9B%BD%E4%B8%BB%E6%B5%81%E5%8D%AB%E8%A7%86%E5%8F%B0%E9%AB%98%E6%B8%85.m3u',
  'https://raw.githubusercontent.com/imDazui/Tvlist-awesome-m3u-m3u8/master/m3u/%E4%B8%AD%E5%A4%AE%E7%94%B5%E8%A7%86%E5%8F%B0%E9%AB%98%E6%B8%85.m3u'
];

function loadSources() {
  const root = path.join(__dirname, '..');
  const txtPath = path.join(root, 'sources.txt');
  const jsonPath = path.join(root, 'sources.json');

  // 优先读取 sources.txt，每行一个地址
  if (fs.existsSync(txtPath)) {
    try {
      const lines = fs.readFileSync(txtPath, 'utf8')
        .split(/\r?\n/)
        .map(line => line.trim())
        .filter(line => line && !line.startsWith('#'));
      if (lines.length > 0) {
        console.log(`📄 已从 sources.txt 加载 ${lines.length} 个采集源`);
        return lines;
      }
    } catch (e) {
      console.log('⚠️  读取 sources.txt 失败，使用默认源:', e.message);
    }
  }

  // 其次读取 sources.json
  if (fs.existsSync(jsonPath)) {
    try {
      const data = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
      const urls = Array.isArray(data) ? data : data.sources;
      if (Array.isArray(urls) && urls.length > 0) {
        console.log(`📄 已从 sources.json 加载 ${urls.length} 个采集源`);
        return urls;
      }
    } catch (e) {
      console.log('⚠️  读取 sources.json 失败，使用默认源:', e.message);
    }
  }

  console.log(`📄 未找到自定义源配置，使用默认 ${DEFAULT_SOURCES.length} 个采集源`);
  return DEFAULT_SOURCES;
}

// ========== 改进的 HTTP 请求 ==========
function fetchSource(url, timeout = 20000) {
  return new Promise((resolve, reject) => {
    const isHttps = url.startsWith('https://');
    const client = isHttps ? https : http;

    const req = client.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': '*/*',
        'Accept-Language': 'zh-CN,zh;q=0.9'
      },
      timeout
    }, (res) => {
      const statusCode = res.statusCode;
      if (statusCode >= 200 && statusCode < 400) {
        const chunks = [];
        res.on('data', chunk => chunks.push(chunk));
        res.on('end', () => {
          const content = Buffer.concat(chunks).toString('utf8');
          // 必须是有效的 M3U 文件
          if (content.includes('#EXTM3U')) {
            resolve(content);
          } else {
            reject(new Error('Not a valid M3U file'));
          }
        });
      } else {
        reject(new Error(`HTTP ${statusCode}`));
      }
    });

    req.on('error', reject);
    req.setTimeout(timeout, () => {
      req.destroy();
      reject(new Error('Timeout'));
    });
  });
}

// ========== 频道分类器 ==========
function categorizeChannel(name, originalGroup = '') {
  // 清理和标准化名称
  const cleanName = name.replace(/\[.*?\]|\(.*?\)|【.*?】/g, '').trim();

  const categoryRules = [
    { keywords: ['CCTV', 'CETV', '央视', '中国教育', 'CGTN'], group: '央视台', category: 'cctv' },
    { keywords: ['卫视', '东方卫视', '湖南卫视', '浙江卫视', '江苏卫视', '北京卫视', '凤凰卫视', '凤凰资讯', '凤凰'], group: '卫视台', category: 'satellite' },
    { keywords: ['卡通', '少儿', '儿童', '动漫', '动画'], group: '卡通类', category: 'cartoon' },
    { keywords: ['新闻', '资讯', 'NEWS'], group: '新闻类', category: 'news' },
    { keywords: ['体育', '足球', '篮球', '奥运', '体育赛事'], group: '体育类', category: 'sports' },
    { keywords: ['电影', '影院', '剧场', '影视'], group: '电影类', category: 'movie' }
  ];

  for (const rule of categoryRules) {
    if (rule.keywords.some(kw => cleanName.includes(kw))) {
      return { group: rule.group, category: rule.category, cleanName };
    }
  }

  return {
    group: originalGroup || '其他台',
    category: 'other',
    cleanName
  };
}

// ========== 简单的 URL 测试 ==========
function testUrl(url, timeout = 10000) {
  return new Promise((resolve) => {
    try {
      const isHttps = url.startsWith('https://');
      const client = isHttps ? https : http;

      const req = client.request(url, {
        method: 'HEAD',
        timeout,
        headers: {
          'User-Agent': 'VLC/3.0.18',
          'Accept': '*/*'
        }
      }, (res) => {
        res.destroy();
        // 宽松的验证：只要返回200就认为是有效的
        const isValid = res.statusCode >= 200 && res.statusCode < 400;
        resolve({
          valid: isValid,
          statusCode: res.statusCode,
          url: url
        });
      });

      req.on('error', () => {
        resolve({ valid: false, statusCode: 0, url: url });
      });

      req.setTimeout(timeout, () => {
        req.destroy();
        resolve({ valid: false, statusCode: 0, url: url });
      });

      req.end();
    } catch (error) {
      resolve({ valid: false, statusCode: 0, url: url });
    }
  });
}

// ========== 主函数 ==========
async function main() {
  console.log('🚀 IPTV 源采集开始（实用版）\n');
  console.log('📡 从稳定的公开源采集...\n');

  const STABLE_SOURCES = loadSources();
  let allChannels = [];
  const seenUrls = new Set();

  // 从每个源采集
  for (let i = 0; i < STABLE_SOURCES.length; i++) {
    const sourceUrl = STABLE_SOURCES[i];
    const sourceName = new URL(sourceUrl).hostname;

    try {
      console.log(`🔍 采集源 ${i + 1}/${STABLE_SOURCES.length}: ${sourceName}`);

      let content;
      try {
        content = await fetchSource(sourceUrl, 30000);
      } catch (fetchError) {
        console.log(`   ⚠️  ${sourceName} 获取失败: ${fetchError.message}`);
        continue;
      }

      if (!content || content.length < 100) {
        console.log(`   ⚠️  ${sourceName} 内容过短或无内容`);
        continue;
      }

      let m3uChannels = [];
      let currentChannel = null;
      const lines = content.split(/\r?\n/);
      let lineCount = 0;

      for (const line of lines) {
        lineCount++;
        const trimmed = line.trim();

        if (trimmed.startsWith('#EXTINF:')) {
          // 提取频道信息
          const nameMatch = trimmed.match(/,([^,]*)$/);
          let name = nameMatch ? nameMatch[1].trim() : '未知频道';

          // 提取属性
          const attrs = {};
          const attrMatches = trimmed.matchAll(/([a-zA-Z-]+)=\"([^\"]*)\"/g);
          for (const match of attrMatches) {
            attrs[match[1]] = match[2];
          }

          const logo = attrs['tvg-logo'] || attrs['tvg-logo'] || attrs['logo'] || '';
          const group = attrs['group-title'] || attrs['group'] || '';

          currentChannel = {
            originalName: name,
            logo: logo,
            originalGroup: group || '',
            attrs: attrs
          };
        } else if (trimmed && !trimmed.startsWith('#') && currentChannel) {
          // 这是URL行
          const url = trimmed;

          if (!seenUrls.has(url)) {
            seenUrls.add(url);

            // 应用分类
            const categoryInfo = categorizeChannel(currentChannel.originalName, currentChannel.originalGroup);

            m3uChannels.push({
              name: categoryInfo.cleanName || currentChannel.originalName,
              url: url,
              logo: currentChannel.logo,
              group: categoryInfo.group,
              category: categoryInfo.category,
              originalName: currentChannel.originalName,
              originalGroup: currentChannel.originalGroup
            });
          }
          currentChannel = null;
        }
      }

      console.log(`   ✅ 从 ${sourceName} 解析出 ${m3uChannels.length} 个频道`);

      if (m3uChannels.length > 0) {
        const sampleSize = Math.min(10, m3uChannels.length);
        console.log(`   📡 抽样测试 ${sampleSize} 个频道...`);
        const testBatch = m3uChannels.slice(0, sampleSize);
        const testResults = await Promise.all(
          testBatch.map(ch => testUrl(ch.url).then(result => ({ ...ch, ...result })))
        );

        const validChannels = testResults.filter(ch => ch.valid);
        console.log(`   ✅ 海外可达: ${validChannels.length}/${testBatch.length}`);

        // 国内源在 GitHub Actions 海外节点可能测不通，不再因测试失败丢弃
        allChannels.push(...m3uChannels);
      }

    } catch (error) {
      console.log(`   ❌ ${sourceName} 处理失败: ${error.message}`);
    }
  }

  // 去重（按URL）
  const urlMap = new Map();
  for (const ch of allChannels) {
    if (!urlMap.has(ch.url)) {
      urlMap.set(ch.url, ch);
    }
  }

  let uniqueChannels = Array.from(urlMap.values());
  console.log(`\n📊 初步采集: ${uniqueChannels.length} 个频道`);

  // 限制总频道数，优先保留常见分类
  const MAX_CHANNELS = 500;
  if (uniqueChannels.length > MAX_CHANNELS) {
    console.log(`⚠️  频道过多，限制为前 ${MAX_CHANNELS} 个（优先央视/卫视/体育/电影/新闻/卡通）`);
    const priority = ['央视台', '卫视台', '体育类', '电影类', '新闻类', '卡通类', '其他台'];
    const sorted = [];
    const rest = [];
    for (const ch of uniqueChannels) {
      if (priority.includes(ch.group)) sorted.push(ch);
      else rest.push(ch);
    }
    sorted.sort((a, b) => priority.indexOf(a.group) - priority.indexOf(b.group));
    uniqueChannels = sorted.concat(rest).slice(0, MAX_CHANNELS);
  }

  if (uniqueChannels.length === 0) {
    console.log('❌ 没有采集到任何频道，使用备用方案...');
    const fallbackChannels = [
      { name: 'CCTV-1 综合', url: 'http://39.134.66.66/PLTV/88888888/224/3221227200/index.m3u8', group: '央视台', category: 'cctv', logo: 'https://epg.112114.xyz/logo/CCTV1.png' },
      { name: 'CCTV-2 财经', url: 'http://39.134.66.66/PLTV/88888888/224/3221227201/index.m3u8', group: '央视台', category: 'cctv', logo: 'https://epg.112114.xyz/logo/CCTV2.png' },
      { name: 'CCTV-5 体育', url: 'http://39.134.66.66/PLTV/88888888/224/3221227203/index.m3u8', group: '央视台', category: 'cctv', logo: 'https://epg.112114.xyz/logo/CCTV5.png' },
      { name: '湖南卫视', url: 'http://39.134.66.66/PLTV/88888888/224/3221227337/index.m3u8', group: '卫视台', category: 'satellite', logo: 'https://epg.112114.xyz/logo/湖南卫视.png' },
      { name: '浙江卫视', url: 'http://39.134.66.66/PLTV/88888888/224/3221227336/index.m3u8', group: '卫视台', category: 'satellite', logo: 'https://epg.112114.xyz/logo/浙江卫视.png' },
      { name: '江苏卫视', url: 'http://39.134.66.66/PLTV/88888888/224/3221227205/index.m3u8', group: '卫视台', category: 'satellite', logo: 'https://epg.112114.xyz/logo/江苏卫视.png' },
      { name: '北京卫视', url: 'http://39.134.66.66/PLTV/88888888/224/3221227210/index.m3u8', group: '卫视台', category: 'satellite', logo: 'https://epg.112114.xyz/logo/北京卫视.png' }
    ];
    uniqueChannels = fallbackChannels;
  }

  // 分组统计
  const groupStats = {};
  for (const ch of uniqueChannels) {
    const group = ch.group.replace(/[•*·\s]/g, '').trim();
    if (!groupStats[group]) groupStats[group] = 0;
    groupStats[group]++;
  }

  console.log('\n📺 频道分组统计:');
  for (const [group, count] of Object.entries(groupStats)) {
    console.log(`   ${group}: ${count}个`);
  }

  // 测试所有频道在海外节点的可达性（仅用于生成 valid 子集，不丢弃全量）
  console.log('\n🔍 开始验证频道海外可达性...');
  const validChannels = [];
  const testConcurrency = 10;
  for (let i = 0; i < uniqueChannels.length; i += testConcurrency) {
    const batch = uniqueChannels.slice(i, i + testConcurrency);
    const results = await Promise.all(
      batch.map(ch => testUrl(ch.url, 8000).then(r => ({ ...ch, ...r })))
    );
    results.forEach(r => {
      if (r.valid) validChannels.push(r);
    });
    process.stdout.write(`\r   ${Math.min(i + testConcurrency, uniqueChannels.length)}/${uniqueChannels.length} | ✅ 有效: ${validChannels.length}`);
  }
  console.log('');

  // 生成最终输出
  const m3uPath = path.join(__dirname, '..', 'iptv.m3u');
  const jsonPath = path.join(__dirname, '..', 'channels.json');
  const validM3uPath = path.join(__dirname, '..', 'iptv-valid.m3u');
  const validJsonPath = path.join(__dirname, '..', 'channels-valid.json');

  const categoryOrder = ['央视台', '卫视台', '卡通类', '新闻类', '体育类', '电影类', '教育台', '其他台'];

  function buildM3u(channels) {
    let content = '#EXTM3U\n\n';
    for (const category of categoryOrder) {
      const categoryChannels = channels.filter(ch => ch.group === category);
      if (categoryChannels.length > 0) {
        categoryChannels.forEach(ch => {
          const safeName = ch.name.replace(/"/g, '');
          const safeId = safeName.replace(/\s+/g, '').replace(/[^a-zA-Z0-9\u4e00-\u9fa5_-]/g, '');
          content += `#EXTINF:-1 tvg-id="${safeId}" tvg-name="${safeName}" tvg-logo="${ch.logo}" group-title="${ch.group}",${safeName}\n`;
          content += `${ch.url}\n`;
        });
        content += '\n';
      }
    }
    return content;
  }

  function buildJson(channels) {
    return {
      update: new Date().toISOString(),
      count: channels.length,
      sources: STABLE_SOURCES.length,
      channels: channels.map(ch => ({
        name: ch.name,
        url: ch.url,
        logo: ch.logo,
        group: ch.group,
        category: ch.category
      }))
    };
  }

  fs.writeFileSync(m3uPath, buildM3u(uniqueChannels), 'utf8');
  fs.writeFileSync(jsonPath, JSON.stringify(buildJson(uniqueChannels), null, 2), 'utf8');
  fs.writeFileSync(validM3uPath, buildM3u(validChannels), 'utf8');
  fs.writeFileSync(validJsonPath, JSON.stringify(buildJson(validChannels), null, 2), 'utf8');

  console.log('\n✅ 采集完成！');
  console.log(`   📁 iptv.m3u / channels.json: ${uniqueChannels.length} 个频道（全量）`);
  console.log(`   📁 iptv-valid.m3u / channels-valid.json: ${validChannels.length} 个频道（海外可达）`);
  console.log(`\n📅 更新时间: ${new Date().toLocaleString('zh-CN')}`);

  console.log('\n💡 使用方法:');
  console.log('   1. 国内用户优先使用 iptv.m3u（频道最全）');
  console.log('   2. 海外环境或求稳使用 iptv-valid.m3u');
  console.log('   3. 将 m3u 导入 VLC、PotPlayer 等播放器播放');
}

// 运行主函数
if (require.main === module) {
  main().catch(error => {
    console.error('采集过程出错:', error);
    process.exit(1);
  });
}

module.exports = { main, categorizeChannel };