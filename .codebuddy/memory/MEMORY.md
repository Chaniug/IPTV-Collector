# IPTV-Collector 项目记忆

## 项目结构
- 前端：`app.js` + `index.html` + `styles.css`（静态网站，部署在 GitHub Pages）
- 采集脚本：`scripts/collect-practical.js`（主力）、`collect.js`（v4已失效）、`collect-improved.js`（v5）
- 数据文件：`channels.json`（全量）、`channels-cn.json`（国内源）、`channels-valid.json`（海外可达）
- 对应 M3U：`iptv.m3u`、`iptv-cn.m3u`、`iptv-valid.m3u`
- 源配置：`sources.txt`（每行一个采集源 URL）

## 关键事实
- 北邮教育网源 `ivi.bupt.edu.cn` 已全部失效（截至 2026-06）
- `raw.githubusercontent.com` 在国内访问被重置，需用 `cdn.jsdelivr.net` CDN 镜像
- 可用数据源：`cdn.jsdelivr.net/gh/iptv-org/iptv@master/streams/cn.m3u`、`epg.pw/test_channels.m3u`
- 远程有 GitHub Actions 定时自动更新（每日），提交格式 "auto: 更新 IPTV 源 YYYY-MM-DD"
- 前端默认数据源是 `channels-cn.json`，默认 CDN 是 jsdelivr

## 采集脚本运行
```
node scripts/collect-practical.js
```
会生成全量、国内、海外可达三个版本的数据文件。运行时间约 2-3 分钟（需测试 500 个频道可达性）。
