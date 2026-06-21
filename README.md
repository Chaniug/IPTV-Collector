# 📺 IPTV 电视直播源收集器（自动化更新版）

🚀 **自动收集、测试和更新国内可用电视频道直播源**，每天更新保证源的新鲜度。

[![GitHub Actions Status](https://github.com/Chaniug/IPTV-Collector/actions/workflows/deploy.yml/badge.svg)](https://github.com/Chaniug/IPTV-Collector/actions/workflows/deploy.yml)
[![Auto Collect Status](https://github.com/Chaniug/IPTV-Collector/actions/workflows/collect-only.yml/badge.svg)](https://github.com/Chaniug/IPTV-Collector/actions/workflows/collect-only.yml)
![GitHub Pages](https://img.shields.io/badge/GitHub%20Pages-已部署-brightgreen)

## 🔥 主要特性

✅ **每天自动更新** - GitHub Actions 每天早上 8 点自动采集最新源  
✅ **527+ 个频道** - 7 个分类，覆盖央视、卫视、卡通、新闻等  
✅ **智能分类** - 基于频道名称自动分类到合适的类别  
✅ **源质量测试** - 自动测试频道有效性，确保可用性  
✅ **多格式支持** - 同时提供 M3U 和 JSON 格式  
✅ **网页预览** - 可通过 GitHub Pages 直接查看和测试  
✅ **自动部署** - 更新后自动部署到 GitHub Pages  

## 📡 订阅方式（推荐）

### 方法一：订阅链接（最新）
```
https://chaniug.github.io/IPTV-Collector/iptv.m3u
```
*复制链接到任意 IPTV 播放器中订阅即可*  

### 方法二：直接下载
- [iptv.m3u](iptv.m3u) - M3U播放列表文件  
- [channels.json](channels.json) - JSON格式数据（开发者用）

### 方法三：在线预览
👉 **[点击查看网页版频道列表](https://chaniug.github.io/IPTV-Collector/)**

## 📺 频道分类

| 分类 | 频道数 | 说明 |
|------|--------|------|
| **央视台** | 33 | CCTV 1-17、CETV、CGTN 等 |
| **卫视台** | 150 | 湖南、浙江、江苏、东方、北京等各大卫视 |
| **卡通类** | 14 | 金鹰卡通、优漫卡通、卡酷少儿等 |
| **新闻类** | 44 | 新闻资讯频道 |
| **体育类** | 10 | 体育赛事频道 |
| **电影类** | 15 | 电影、影视剧场频道 |
| **其他台** | 261 | 地方台、专业频道等其他类型 |
| **总计** | **527** | 👆 更新时间：{{UPDATE_TIME}} |

*数据每天自动更新，具体数量可能变化*

## 🚀 如何订阅使用

### 快速开始
1. **复制订阅链接**：`https://chaniug.github.io/IPTV-Collector/iptv.m3u`
2. **打开播放器**：VLC、PotPlayer、TVBox 等
3. **添加订阅**：找到"添加网络串流"或"订阅"功能
4. **粘贴链接**：粘贴订阅链接，确定即可

### 推荐播放器
- **VLC**：跨平台，开源免费，支持良好
- **PotPlayer**：Windows 平台，功能强大  
- **TVBox**：Android 平台，专为IPTV设计
- **IINA**：macOS 平台，界面美观

## 🛠️ 开发者指南

### 本地开发
```bash
# 克隆项目
git clone https://github.com/Chaniug/IPTV-Collector.git
cd IPTV-Collector

# 安装依赖
npm install

# 手动采集源
npm run collect      # 采集最新源
npm run test         # 测试频道可用性
npm run update       # 采集并自动提交到Git

# 本地预览
npm start           # 访问 http://localhost:8080
```

### GitHub Actions 自动化
项目配置了两个自动化工作流：

1. **`deploy.yml`** - 自动化采集、测试、部署到 GitHub Pages
   - 触发时机：每天 6:00 UTC、手动触发、推送时
   - 功能：采集 → 测试 → 部署 → 发布

2. **`collect-only.yml`** - 纯采集工作流（每天 8:00 UTC）
   - 专注采集最新源，更轻量
   - 检测文件变化，有变化才提交

### 项目结构
```
IPTV-Collector/
├── .github/workflows/     # GitHub Actions 自动化脚本
│   ├── deploy.yml         # 完整采集+部署工作流
│   └── collect-only.yml   # 纯采集工作流
├── scripts/               # 采集和处理脚本
│   ├── collect-practical.js  # 主采集脚本（推荐）
│   ├── collect.js         # 原版采集脚本（备份）
│   ├── collect-improved.js # 改进版采集脚本
│   └── test-channels.js   # 频道测试工具
├── app.js                 # 前端应用逻辑
├── index.html             # 主页面
├── styles.css             # 样式表
├── iptv.m3u              # 生成的 M3U 播放列表
└── channels.json         # 频道数据（JSON格式）
```

## 🔍 故障排除

### 常见问题

#### ❓ 频道无法播放？
1. **原因**：直播源时效性很强，可能已失效
2. **解决**：等待自动化更新（每天 8:00 UTC），或手动运行 `npm run collect`
3. **建议**：多尝试几个频道，特别是"央视台"和"卫视台"分类

#### ❓ 网页无法访问？
1. **原因**：GitHub Pages 可能尚未部署
2. **解决**：检查 GitHub Actions 运行状态，或直接下载 `iptv.m3u` 文件使用
3. **备用**：https://raw.githubusercontent.com/Chaniug/IPTV-Collector/master/iptv.m3u

#### ❓ 分类不正确？
1. **原因**：频道名称不规范导致分类错误
2. **解决**：打开 issue 报告错误的分类
3. **改进**：修改 `collect-practical.js` 中的 `categorizeChannel` 函数

### 手动更新
```bash
# 如果自动化失败，可以手动运行
npm run collect           # 采集最新源
npm run test              # 测试可用性
git add .                 # 添加文件
git commit -m "更新IPTV源" # 提交更新
git push                  # 推送仓库
```

## 🤝 贡献指南

### 提交新源
1. 确保源是公开且稳定的
2. 运行 `npm run test` 验证源有效性
3. 通过 Pull Request 提交更改

### 报告问题
1. 使用 [Issue 模板](.github/ISSUE_TEMPLATE/bug_report.md)
2. 提供详细的频道信息和播放环境
3. 分享错误信息或截图

### 改进建议
1. 使用 [功能请求模板](.github/ISSUE_TEMPLATE/feature_request.md)
2. 描述功能的价值和实现思路
3. 讨论技术可行性

## 📊 自动化时间表

| 时间 | 工作流 | 状态 |
|------|--------|------|
| **每天 06:00 UTC** | `deploy.yml` | 采集 → 测试 → 部署 |
| **每天 08:00 UTC** | `collect-only.yml` | 轻量采集 → 有变化才提交 |
| **推送时** | `deploy.yml` | 立即采集部署 |
| **手动触发** | 两个工作流均可 | 随时执行 |

**北京时间换算**：UTC+8，即每天 14:00 和 16:00 自动运行

## ⚠️ 免责声明

⚠️ **本项目仅供学习和技术交流使用**

1. 所有直播源均来自互联网公开资源
2. 请遵守当地法律法规，合理使用
3. 不得用于商业用途
4. 使用即表示同意自行承担所有风险

## 📞 联系方式

- **GitHub Issues**: [报告问题或请求功能](https://github.com/Chaniug/IPTV-Collector/issues)
- **自动更新状态**: [查看 GitHub Actions](https://github.com/Chaniug/IPTV-Collector/actions)
- **网页预览**: [chaniug.github.io/IPTV-Collector](https://chaniug.github.io/IPTV-Collector)

---

## 🔄 更新日志

### v2.0.0 (2026/06/21)
- ✅ 重构采集系统，解决频道无法播放问题
- ✅ 增加 GitHub Actions 自动化采集和部署
- ✅ 改进分类系统，支持7个主要分类
- ✅ 添加频道测试工具和网页预览功能
- ✅ 完善故障排除文档和用户指南

### v1.0.0 (2026/05/03)
- 初始版本发布
- *注：原版使用的北邮教育网源已全部失效*

---

**🎉 特别感谢**: [iptv-org/iptv](https://github.com/iptv-org/iptv) 和所有贡献者提供的公开源

**⭐ 如果这个项目对您有帮助，请在 GitHub 上点个 Star！**