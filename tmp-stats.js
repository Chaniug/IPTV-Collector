const j = require('./channels.json');
console.log('=== 全量数据统计 ===');
console.log('总频道数:', j.count);
console.log('CCTV频道数:', j.channels.filter(c => c.name.includes('CCTV')).length);
console.log('卫视频道数:', j.channels.filter(c => c.name.includes('卫视')).length);

console.log('\n分类统计:');
const g = {};
j.channels.forEach(c => { g[c.group] = (g[c.group] || 0) + 1; });
Object.entries(g).forEach(([k, v]) => console.log(' ', k, ':', v));

console.log('\n所有CCTV频道:');
j.channels.filter(c => c.name.includes('CCTV')).forEach(c => console.log(' ', c.name, '-', c.url.substring(0, 60)));

console.log('\n=== 国内源分类统计 ===');
const cn = require('./channels-cn.json');
console.log('总频道数:', cn.count);
const cg = {};
cn.channels.forEach(c => { cg[c.group] = (cg[c.group] || 0) + 1; });
Object.entries(cg).forEach(([k, v]) => console.log(' ', k, ':', v));

console.log('\n国内源里的央视台频道:');
cn.channels.filter(c => c.group === '央视台').forEach(c => console.log(' ', c.name, '-', c.url.substring(0, 60)));
