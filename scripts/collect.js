/**
 * IPTV 源采集脚本 v4 - 可靠源优先
 */

const https = require('https');
const http = require('http');
const fs = require('fs');
const path = require('path');

// ========== 预置可靠源（北邮教育网 - 最稳定） ==========
const PRESET_CHANNELS = [
  // 央视台
  { name: 'CCTV-1 综合', url: 'http://ivi.bupt.edu.cn/hls/cctv1hd.m3u8', group: '央视台', logo: 'https://epg.112114.xyz/logo/CCTV1.png' },
  { name: 'CCTV-2 财经', url: 'http://ivi.bupt.edu.cn/hls/cctv2hd.m3u8', group: '央视台', logo: 'https://epg.112114.xyz/logo/CCTV2.png' },
  { name: 'CCTV-3 综艺', url: 'http://ivi.bupt.edu.cn/hls/cctv3hd.m3u8', group: '央视台', logo: 'https://epg.112114.xyz/logo/CCTV3.png' },
  { name: 'CCTV-4 国际', url: 'http://ivi.bupt.edu.cn/hls/cctv4hd.m3u8', group: '央视台', logo: 'https://epg.112114.xyz/logo/CCTV4.png' },
  { name: 'CCTV-5 体育', url: 'http://ivi.bupt.edu.cn/hls/cctv5hd.m3u8', group: '央视台', logo: 'https://epg.112114.xyz/logo/CCTV5.png' },
  { name: 'CCTV-5+ 体育', url: 'http://ivi.bupt.edu.cn/hls/cctv5phd.m3u8', group: '央视台', logo: 'https://epg.112114.xyz/logo/CCTV5+.png' },
  { name: 'CCTV-6 电影', url: 'http://ivi.bupt.edu.cn/hls/cctv6hd.m3u8', group: '央视台', logo: 'https://epg.112114.xyz/logo/CCTV6.png' },
  { name: 'CCTV-7 国防', url: 'http://ivi.bupt.edu.cn/hls/cctv7hd.m3u8', group: '央视台', logo: 'https://epg.112114.xyz/logo/CCTV7.png' },
  { name: 'CCTV-8 电视剧', url: 'http://ivi.bupt.edu.cn/hls/cctv8hd.m3u8', group: '央视台', logo: 'https://epg.112114.xyz/logo/CCTV8.png' },
  { name: 'CCTV-9 纪录', url: 'http://ivi.bupt.edu.cn/hls/cctv9hd.m3u8', group: '央视台', logo: 'https://epg.112114.xyz/logo/CCTV9.png' },
  { name: 'CCTV-10 科教', url: 'http://ivi.bupt.edu.cn/hls/cctv10hd.m3u8', group: '央视台', logo: 'https://epg.112114.xyz/logo/CCTV10.png' },
  { name: 'CCTV-11 戏曲', url: 'http://ivi.bupt.edu.cn/hls/cctv11.m3u8', group: '央视台', logo: 'https://epg.112114.xyz/logo/CCTV11.png' },
  { name: 'CCTV-12 社会与法', url: 'http://ivi.bupt.edu.cn/hls/cctv12hd.m3u8', group: '央视台', logo: 'https://epg.112114.xyz/logo/CCTV12.png' },
  { name: 'CCTV-13 新闻', url: 'http://ivi.bupt.edu.cn/hls/cctv13.m3u8', group: '央视台', logo: 'https://epg.112114.xyz/logo/CCTV13.png' },
  { name: 'CCTV-14 少儿', url: 'http://ivi.bupt.edu.cn/hls/cctv14hd.m3u8', group: '央视台', logo: 'https://epg.112114.xyz/logo/CCTV14.png' },
  { name: 'CCTV-15 音乐', url: 'http://ivi.bupt.edu.cn/hls/cctv15.m3u8', group: '央视台', logo: 'https://epg.112114.xyz/logo/CCTV15.png' },
  { name: 'CCTV-16 奥林匹克', url: 'http://ivi.bupt.edu.cn/hls/cctv16.m3u8', group: '央视台', logo: 'https://epg.112114.xyz/logo/CCTV16.png' },
  { name: 'CCTV-17 农业农村', url: 'http://ivi.bupt.edu.cn/hls/cctv17.m3u8', group: '央视台', logo: 'https://epg.112114.xyz/logo/CCTV17.png' },
  { name: 'CETV-1', url: 'http://ivi.bupt.edu.cn/hls/cetv1.m3u8', group: '教育台', logo: 'https://epg.112114.xyz/logo/CETV1.png' },
  
  // 卫视台
  { name: '湖南卫视', url: 'http://ivi.bupt.edu.cn/hls/hunanhd.m3u8', group: '卫视台', logo: 'https://epg.112114.xyz/logo/湖南卫视.png' },
  { name: '浙江卫视', url: 'http://ivi.bupt.edu.cn/hls/zjhd.m3u8', group: '卫视台', logo: 'https://epg.112114.xyz/logo/浙江卫视.png' },
  { name: '江苏卫视', url: 'http://ivi.bupt.edu.cn/hls/jshd.m3u8', group: '卫视台', logo: 'https://epg.112114.xyz/logo/江苏卫视.png' },
  { name: '东方卫视', url: 'http://ivi.bupt.edu.cn/hls/dongfanghd.m3u8', group: '卫视台', logo: 'https://epg.112114.xyz/logo/东方卫视.png' },
  { name: '北京卫视', url: 'http://ivi.bupt.edu.cn/hls/btv1hd.m3u8', group: '卫视台', logo: 'https://epg.112114.xyz/logo/北京卫视.png' },
  { name: '广东卫视', url: 'http://ivi.bupt.edu.cn/hls/gdhd.m3u8', group: '卫视台', logo: 'https://epg.112114.xyz/logo/广东卫视.png' },
  { name: '深圳卫视', url: 'http://ivi.bupt.edu.cn/hls/szhd.m3u8', group: '卫视台', logo: 'https://epg.112114.xyz/logo/深圳卫视.png' },
  { name: '天津卫视', url: 'http://ivi.bupt.edu.cn/hls/tjhd.m3u8', group: '卫视台', logo: 'https://epg.112114.xyz/logo/天津卫视.png' },
  { name: '山东卫视', url: 'http://ivi.bupt.edu.cn/hls/sdhd.m3u8', group: '卫视台', logo: 'https://epg.112114.xyz/logo/山东卫视.png' },
  { name: '安徽卫视', url: 'http://ivi.bupt.edu.cn/hls/ahhd.m3u8', group: '卫视台', logo: 'https://epg.112114.xyz/logo/安徽卫视.png' },
  { name: '黑龙江卫视', url: 'http://ivi.bupt.edu.cn/hls/hlhd.m3u8', group: '卫视台', logo: 'https://epg.112114.xyz/logo/黑龙江卫视.png' },
  { name: '辽宁卫视', url: 'http://ivi.bupt.edu.cn/hls/lnhd.m3u8', group: '卫视台', logo: 'https://epg.112114.xyz/logo/辽宁卫视.png' },
  { name: '吉林卫视', url: 'http://ivi.bupt.edu.cn/hls/jlhd.m3u8', group: '卫视台', logo: 'https://epg.112114.xyz/logo/吉林卫视.png' },
  { name: '河北卫视', url: 'http://ivi.bupt.edu.cn/hls/hebhd.m3u8', group: '卫视台', logo: 'https://epg.112114.xyz/logo/河北卫视.png' },
  { name: '河南卫视', url: 'http://ivi.bupt.edu.cn/hls/hahd.m3u8', group: '卫视台', logo: 'https://epg.112114.xyz/logo/河南卫视.png' },
  { name: '湖北卫视', url: 'http://ivi.bupt.edu.cn/hls/hbhd.m3u8', group: '卫视台', logo: 'https://epg.112114.xyz/logo/湖北卫视.png' },
  { name: '江西卫视', url: 'http://ivi.bupt.edu.cn/hls/jxhd.m3u8', group: '卫视台', logo: 'https://epg.112114.xyz/logo/江西卫视.png' },
  { name: '山西卫视', url: 'http://ivi.bupt.edu.cn/hls/shxhd.m3u8', group: '卫视台', logo: 'https://epg.112114.xyz/logo/山西卫视.png' },
  { name: '陕西卫视', url: 'http://ivi.bupt.edu.cn/hls/sxhd.m3u8', group: '卫视台', logo: 'https://epg.112114.xyz/logo/陕西卫视.png' },
  { name: '四川卫视', url: 'http://ivi.bupt.edu.cn/hls/schd.m3u8', group: '卫视台', logo: 'https://epg.112114.xyz/logo/四川卫视.png' },
  { name: '重庆卫视', url: 'http://ivi.bupt.edu.cn/hls/cqhd.m3u8', group: '卫视台', logo: 'https://epg.112114.xyz/logo/重庆卫视.png' },
  { name: '贵州卫视', url: 'http://ivi.bupt.edu.cn/hls/gzhd.m3u8', group: '卫视台', logo: 'https://epg.112114.xyz/logo/贵州卫视.png' },
  { name: '云南卫视', url: 'http://ivi.bupt.edu.cn/hls/ynhd.m3u8', group: '卫视台', logo: 'https://epg.112114.xyz/logo/云南卫视.png' },
  { name: '海南卫视', url: 'http://ivi.bupt.edu.cn/hls/hainan.m3u8', group: '卫视台', logo: 'https://epg.112114.xyz/logo/海南卫视.png' },
  { name: '甘肃卫视', url: 'http://ivi.bupt.edu.cn/hls/gshd.m3u8', group: '卫视台', logo: 'https://epg.112114.xyz/logo/甘肃卫视.png' },
  { name: '青海卫视', url: 'http://ivi.bupt.edu.cn/hls/qhtv.m3u8', group: '卫视台', logo: 'https://epg.112114.xyz/logo/青海卫视.png' },
  { name: '宁夏卫视', url: 'http://ivi.bupt.edu.cn/hls/nxtv.m3u8', group: '卫视台', logo: 'https://epg.112114.xyz/logo/宁夏卫视.png' },
  { name: '新疆卫视', url: 'http://ivi.bupt.edu.cn/hls/xjtv.m3u8', group: '卫视台', logo: 'https://epg.112114.xyz/logo/新疆卫视.png' },
  { name: '西藏卫视', url: 'http://ivi.bupt.edu.cn/hls/xztv.m3u8', group: '卫视台', logo: 'https://epg.112114.xyz/logo/西藏卫视.png' },
  { name: '广西卫视', url: 'http://ivi.bupt.edu.cn/hls/gxhd.m3u8', group: '卫视台', logo: 'https://epg.112114.xyz/logo/广西卫视.png' },
  { name: '内蒙古卫视', url: 'http://ivi.bupt.edu.cn/hls/nmhd.m3u8', group: '卫视台', logo: 'https://epg.112114.xyz/logo/内蒙古卫视.png' },
  { name: '凤凰卫视', url: 'http://ivi.bupt.edu.cn/hls/phoenix.m3u8', group: '卫视台', logo: 'https://epg.112114.xyz/logo/凤凰卫视.png' },
  { name: '凤凰资讯', url: 'http://ivi.bupt.edu.cn/hls/phoenixinfo.m3u8', group: '卫视台', logo: 'https://epg.112114.xyz/logo/凤凰资讯.png' },
  
  // 卡通类
  { name: '金鹰卡通', url: 'http://ivi.bupt.edu.cn/hls/jinying.m3u8', group: '卡通类', logo: 'https://epg.112114.xyz/logo/金鹰卡通.png' },
  { name: '炫动卡通', url: 'http://ivi.bupt.edu.cn/hls/xuandong.m3u8', group: '卡通类', logo: 'https://epg.112114.xyz/logo/炫动卡通.png' },
  { name: '优漫卡通', url: 'http://ivi.bupt.edu.cn/hls/youman.m3u8', group: '卡通类', logo: 'https://epg.112114.xyz/logo/优漫卡通.png' },
  { name: '嘉佳卡通', url: 'http://ivi.bupt.edu.cn/hls/jiajia.m3u8', group: '卡通类', logo: 'https://epg.112114.xyz/logo/嘉佳卡通.png' },
  { name: '卡酷少儿', url: 'http://ivi.bupt.edu.cn/hls/kaku.m3u8', group: '卡通类', logo: 'https://epg.112114.xyz/logo/卡酷少儿.png' },
];

// ========== HTTP 请求 ==========
function fetch(url, timeout = 15000) {
  return new Promise((resolve, reject) => {
    const isHttps = url.startsWith('https://');
    const client = isHttps ? https : http;
    
    const req = client.get(url, {
      headers: { 'User-Agent': 'VLC/3.0.18', 'Accept': '*/*' }
    }, (res) => {
      if (res.statusCode >= 200 && res.statusCode < 400) {
        const chunks = [];
        res.on('data', chunk => chunks.push(chunk));
        res.on('end', () => resolve(Buffer.concat(chunks).toString('utf8').substring(0, 5000)));
      } else {
        reject(new Error(`HTTP ${res.statusCode}`));
      }
    });
    
    req.on('error', reject);
    req.setTimeout(timeout, () => { req.destroy(); reject(new Error('Timeout')); });
  });
}

// ========== 测试源 ==========
async function testChannel(channel, timeout = 10000) {
  return new Promise((resolve) => {
    try {
      const req = (channel.url.startsWith('https') ? https : http)
        .request(channel.url, { method: 'GET', timeout, headers: { 'User-Agent': 'VLC/3.0.18', 'Range': 'bytes=0-500' } },
        (res) => resolve({ ...channel, valid: res.statusCode >= 200 && res.statusCode < 400, status: res.statusCode }));
      
      req.on('error', () => resolve({ ...channel, valid: false }));
      req.setTimeout(timeout, () => { req.destroy(); resolve({ ...channel, valid: false }); });
      req.end();
    } catch (e) {
      resolve({ ...channel, valid: false });
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

// ========== 主函数 ==========
async function main() {
  console.log('🚀 IPTV 源采集开始（北邮教育网源）\n');
  
  // 1. 测试预置源
  console.log(`📡 测试 ${PRESET_CHANNELS.length} 个预置源...`);
  
  const concurrency = 15;
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
  
  // 2. 尝试采集外部源补充
  console.log('\n📡 采集外部源补充...');
  
  const externalChannels = [];
  const failedUrls = new Set(results.filter(r => !r.valid).map(r => r.url));
  
  const externalSources = [
    'https://raw.githubusercontent.com/iptv-org/iptv/master/streams/cn.m3u',
  ];
  
  for (const src of externalSources) {
    try {
      console.log(`   从 ${new URL(src).pathname} 采集...`);
      const content = await fetch(src, 25000);
      
      const lines = content.split(/\r?\n/);
      let currentChannel = null;
      
      for (const line of lines) {
        const trimmed = line.trim();
        
        if (trimmed.startsWith('#EXTINF:')) {
          const match = trimmed.match(/,([^,]*)$/);
          const name = match ? match[1].trim() : '未知';
          const attrs = {};
          for (const m of trimmed.matchAll(/([a-zA-Z-]+)="([^"]*)"/g)) {
            attrs[m[1]] = m[2];
          }
          currentChannel = { name, logo: attrs['tvg-logo'] || '', group: attrs['group-title'] || '' };
        } else if (trimmed && !trimmed.startsWith('#') && currentChannel) {
          currentChannel.url = trimmed;
          
          // 过滤掉已失败的源和重复的
          if (!failedUrls.has(trimmed) && !validChannels.find(v => v.url === trimmed)) {
            // 自动分类
            if (!currentChannel.group) {
              const n = currentChannel.name;
              if (n.includes('CCTV') || n.includes('CETV')) currentChannel.group = '央视台';
              else if (n.includes('卫视') || n.includes('凤凰')) currentChannel.group = '卫视台';
              else if (n.includes('卡通') || n.includes('少儿')) currentChannel.group = '卡通类';
              else currentChannel.group = '其他台';
            }
            externalChannels.push({...currentChannel});
          }
          currentChannel = null;
        }
      }
      
      console.log(`   获取 ${externalChannels.length} 个新频道`);
    } catch (e) {
      console.log(`   ❌ 失败: ${e.message}`);
    }
  }
  
  // 3. 合并并去重
  const allChannels = [...validChannels, ...externalChannels];
  const seen = new Set();
  const finalChannels = allChannels.filter(ch => {
    if (seen.has(ch.url)) return false;
    seen.add(ch.url);
    return true;
  });
  
  console.log(`\n📊 最终: ${finalChannels.length} 个频道`);
  
  // 4. 保存
  const m3uPath = path.join(__dirname, '..', 'iptv.m3u');
  const jsonPath = path.join(__dirname, '..', 'channels.json');
  
  fs.writeFileSync(m3uPath, generateM3U(finalChannels), 'utf8');
  fs.writeFileSync(jsonPath, JSON.stringify({
    update: new Date().toISOString(),
    count: finalChannels.length,
    preset_valid: validChannels.length,
    channels: finalChannels.map(ch => ({ name: ch.name, url: ch.url, logo: ch.logo, group: ch.group }))
  }, null, 2), 'utf8');
  
  console.log('\n✅ 完成！');
  console.log(`   iptv.m3u: ${finalChannels.length} 个`);
  console.log(`   channels.json: ${finalChannels.length} 个`);
  
  // 分组统计
  const groupStats = {};
  for (const ch of finalChannels) {
    groupStats[ch.group] = (groupStats[ch.group] || 0) + 1;
  }
  console.log('\n📺 分组统计:');
  for (const [g, c] of Object.entries(groupStats)) {
    console.log(`   ${g}: ${c}`);
  }
}

main().catch(console.error);
