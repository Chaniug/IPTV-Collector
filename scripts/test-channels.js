/**
 * 频道测试脚本
 * 测试采集到的频道是否可用
 */

const https = require('https');
const http = require('http');
const fs = require('fs');
const path = require('path');

// 从 channels.json 读取频道
const channelsData = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'channels.json'), 'utf8'));
const channels = channelsData.channels || [];

console.log('🔍 频道测试工具');
console.log(`📊 共计 ${channels.length} 个频道`);
console.log('');

// 分组统计
const groupStats = {};
channels.forEach(ch => {
  groupStats[ch.group] = (groupStats[ch.group] || 0) + 1;
});

console.log('📺 频道分组统计:');
for (const [group, count] of Object.entries(groupStats)) {
  console.log(`   ${group}: ${count}个`);
}
console.log('');

// 简单的 HTTP 测试
async function testChannel(url, timeout = 10000) {
  return new Promise((resolve) => {
    try {
      const isHttps = url.startsWith('https://');
      const client = isHttps ? https : http;

      const req = client.request(url, {
        method: 'HEAD',
        timeout,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          'Accept': '*/*'
        }
      }, (res) => {
        res.destroy();
        resolve({
          valid: res.statusCode >= 200 && res.statusCode < 400,
          statusCode: res.statusCode,
          contentType: res.headers['content-type'] || ''
        });
      });

      req.on('error', () => {
        resolve({ valid: false, statusCode: 0, contentType: '' });
      });

      req.setTimeout(timeout, () => {
        req.destroy();
        resolve({ valid: false, statusCode: 0, contentType: '' });
      });

      req.end();
    } catch (error) {
      resolve({ valid: false, statusCode: 0, contentType: '', error: error.message });
    }
  });
}

// 测试前 N 个频道
async function testSampleChannels(sampleSize = 20) {
  console.log(`⚡ 测试前 ${sampleSize} 个频道...`);

  // 选择不同分组的频道进行测试
  const groups = Object.keys(groupStats).slice(0, 5); // 测试前5个分组
  const testChannels = [];

  for (const group of groups) {
    const groupChannels = channels.filter(ch => ch.group === group).slice(0, 4); // 每个分组测试最多4个
    testChannels.push(...groupChannels);

    if (testChannels.length >= sampleSize) {
      break;
    }
  }

  if (testChannels.length < sampleSize) {
    // 补充随机频道
    const remaining = channels.slice(0, sampleSize - testChannels.length);
    testChannels.push(...remaining);
  }

  const results = [];
  const startTime = Date.now();

  // 并发测试
  const concurrency = 5;
  for (let i = 0; i < testChannels.length; i += concurrency) {
    const batch = testChannels.slice(i, i + concurrency);
    const batchResults = await Promise.all(batch.map(async (ch) => {
      const testResult = await testChannel(ch.url, 10000);
      return {
        name: ch.name,
        group: ch.group,
        url: ch.url,
        ...testResult
      };
    }));

    results.push(...batchResults);

    // 进度显示
    const passed = results.filter(r => r.valid).length;
    process.stdout.write(`\r   ${results.length}/${testChannels.length} 个频道 | ✅ 有效: ${passed}`);
  }

  const endTime = Date.now();
  const totalTime = ((endTime - startTime) / 1000).toFixed(1);

  console.log(`\n\n✅ 测试完成 (耗时: ${totalTime}秒)`);
  console.log(`   📊 结果: ${results.filter(r => r.valid).length}/${results.length} 个有效`);

  // 分组统计结果
  const groupResults = {};
  results.forEach(r => {
    if (!groupResults[r.group]) groupResults[r.group] = { total: 0, valid: 0 };
    groupResults[r.group].total += 1;
    if (r.valid) groupResults[r.group].valid += 1;
  });

  console.log('\n📈 分组有效性统计:');
  for (const [group, stats] of Object.entries(groupResults)) {
    const percentage = (stats.valid / stats.total * 100).toFixed(1);
    console.log(`   ${group}: ${stats.valid}/${stats.total} (${percentage}%)`);
  }

  // 显示一些无效频道的例子（可能的原因）
  const invalidChannels = results.filter(r => !r.valid);
  if (invalidChannels.length > 0) {
    console.log('\n⚠️  无效频道示例 (可能原因):');
    invalidChannels.slice(0, 3).forEach(ch => {
      console.log(`   - ${ch.name} (${ch.group})`);
      console.log(`     原因: ${ch.statusCode === 0 ? '超时/网络错误' : `HTTP ${ch.statusCode}`}`);
    });
  }
}

// 主函数
async function main() {
  if (channels.length === 0) {
    console.log('❌ 没有频道数据，请先运行 npm run collect');
    return;
  }

  await testSampleChannels(20);

  console.log('\n💡 建议:');
  console.log('   1. 不同网络环境下频道的可用性可能不同');
  console.log('   2. HTTP HEAD 测试不是 100% 准确');
  console.log('   3. 实际播放测试是最可靠的');
  console.log('   4. 定期运行 npm run collect 更新源');

  console.log('\n🎯 使用建议:');
  console.log('   - 使用支持的播放器（VLC、PotPlayer等）');
  console.log('   - 多尝试几个频道，部分源可能需要特定条件');
  console.log('   - 关注更新日志，及时获取新的可用源');
}

// 运行测试
main().catch(error => {
  console.error('测试过程出错:', error);
});