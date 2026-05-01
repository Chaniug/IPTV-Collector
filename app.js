// IPTV 源采集器 - 主应用脚本
class IPTVCollector {
    constructor() {
        this.sources = [];
        this.favorites = this.loadFromStorage('favorites') || [];
        this.settings = this.loadFromStorage('settings') || {
            timeout: 5000,
            concurrency: 10,
            sourceUrls: ['https://iptv-org.github.io/api/channels.json']
        };
        
        this.currentTab = 'collector';
        this.currentCategory = 'all';
        
        this.init();
    }

    // 初始化
    init() {
        this.bindEvents();
        this.loadSettings();
        this.renderFavorites();
        this.updateStats();
    }

    // 绑定事件
    bindEvents() {
        // 标签切换
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.addEventListener('click', () => this.switchTab(btn.dataset.tab));
        });

        // 分类筛选
        document.querySelectorAll('.filter-btn').forEach(btn => {
            btn.addEventListener('click', () => this.filterByCategory(btn.dataset.category));
        });

        // 采集按钮
        document.getElementById('collectAll').addEventListener('click', () => this.collectAll());

        // 测试按钮
        document.getElementById('testAll').addEventListener('click', () => this.testAllSources());

        // 导出 M3U
        document.getElementById('exportM3U').addEventListener('click', () => this.exportM3U());

        // 清空收藏
        document.getElementById('clearFavorites').addEventListener('click', () => this.clearFavorites());

        // 清除数据
        document.getElementById('clearData').addEventListener('click', () => this.clearAllData());

        // 添加源 URL
        document.getElementById('addSourceUrl').addEventListener('click', () => this.addSourceUrlInput());

        // 设置保存
        document.getElementById('timeoutSetting').addEventListener('change', (e) => this.saveSettings());
        document.getElementById('concurrencySetting').addEventListener('change', (e) => this.saveSettings());
    }

    // 标签切换
    switchTab(tabId) {
        this.currentTab = tabId;
        
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.tab === tabId);
        });
        
        document.querySelectorAll('.tab-panel').forEach(panel => {
            panel.classList.toggle('active', panel.id === tabId);
        });
    }

    // 分类筛选
    filterByCategory(category) {
        this.currentCategory = category;
        
        document.querySelectorAll('.filter-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.category === category);
        });
        
        this.renderSourceList();
    }

    // 加载设置
    loadSettings() {
        document.getElementById('timeoutSetting').value = this.settings.timeout;
        document.getElementById('concurrencySetting').value = this.settings.concurrency;
        
        const container = document.getElementById('sourceUrls');
        container.innerHTML = '';
        
        this.settings.sourceUrls.forEach((url, index) => {
            this.addSourceUrlInput(url);
        });
    }

    // 添加源 URL 输入框
    addSourceUrlInput(value = '') {
        const container = document.getElementById('sourceUrls');
        const div = document.createElement('div');
        div.className = 'source-url-item';
        div.innerHTML = `
            <input type="text" placeholder="输入 API URL" value="${value}">
            <button class="btn-icon delete-source">×</button>
        `;
        
        div.querySelector('.delete-source').addEventListener('click', function() {
            if (container.children.length > 1) {
                div.remove();
            }
        });
        
        container.appendChild(div);
    }

    // 保存设置
    saveSettings() {
        this.settings.timeout = parseInt(document.getElementById('timeoutSetting').value);
        this.settings.concurrency = parseInt(document.getElementById('concurrencySetting').value);
        
        const urls = [];
        document.querySelectorAll('#sourceUrls input').forEach(input => {
            if (input.value.trim()) {
                urls.push(input.value.trim());
            }
        });
        this.settings.sourceUrls = urls;
        
        this.saveToStorage('settings', this.settings);
    }

    // 采集全部源
    async collectAll() {
        this.showLoading('正在采集 IPTV 源...');
        this.saveSettings();
        
        try {
            const allChannels = [];
            
            // 从多个源采集
            for (const url of this.settings.sourceUrls) {
                try {
                    const channels = await this.fetchChannels(url);
                    allChannels.push(...channels);
                } catch (e) {
                    console.warn(`从 ${url} 采集失败:`, e);
                }
            }
            
            // 去重
            const uniqueChannels = this.deduplicateChannels(allChannels);
            
            // 分配类别
            this.sources = uniqueChannels.map(ch => ({
                ...ch,
                category: this.categorizeChannel(ch.name),
                status: 'pending',
                tested: false
            }));
            
            this.renderSourceList();
            this.updateStats();
            this.showToast(`成功采集 ${this.sources.length} 个频道`, 'success');
            
            // 自动测试
            setTimeout(() => this.testAllSources(), 500);
            
        } catch (error) {
            this.showToast('采集失败: ' + error.message, 'error');
        } finally {
            this.hideLoading();
        }
    }

    // 获取频道数据
    async fetchChannels(url) {
        if (url.includes('iptv-org')) {
            const response = await fetch(url);
            const data = await response.json();
            
            return data.map(item => ({
                name: item.name,
                url: item.url,
                logo: item.logo || '',
                country: item.country?.[0] || '',
                category: item.category || []
            }));
        }
        
        // 通用 fetch
        const response = await fetch(url);
        const data = await response.json();
        
        if (Array.isArray(data)) {
            return data.map(item => ({
                name: item.name || item.title || '未知频道',
                url: item.url || item.link || item.stream_url || '',
                logo: item.logo || item.icon || '',
                country: item.country || '',
                category: item.category || []
            })).filter(ch => ch.url);
        }
        
        return [];
    }

    // 去重
    deduplicateChannels(channels) {
        const seen = new Map();
        
        return channels.filter(ch => {
            const key = ch.url.toLowerCase();
            if (!seen.has(key)) {
                seen.set(key, true);
                return true;
            }
            return false;
        });
    }

    // 频道分类
    categorizeChannel(name) {
        const lowerName = name.toLowerCase();
        
        if (lowerName.includes('cctv') || lowerName.includes('央视')) {
            return 'cctv';
        }
        if (lowerName.includes('卫视') || lowerName.includes('凤凰') || 
            lowerName.includes('hkt') || lowerName.includes('tvb')) {
            return 'satellite';
        }
        if (lowerName.includes('北京') || lowerName.includes('上海') || 
            lowerName.includes('广东') || lowerName.includes('江苏') ||
            lowerName.includes('浙江') || lowerName.includes('四川') ||
            lowerName.includes('山东') || lowerName.includes('湖北')) {
            return 'local';
        }
        return 'other';
    }

    // 测试所有源
    async testAllSources() {
        const pending = this.sources.filter(s => !s.tested || s.status === 'pending');
        
        if (pending.length === 0) {
            this.showToast('所有源已测试', 'success');
            return;
        }
        
        this.showToast(`开始测试 ${pending.length} 个源...`, 'success');
        
        const concurrency = this.settings.concurrency;
        
        for (let i = 0; i < pending.length; i += concurrency) {
            const batch = pending.slice(i, i + concurrency);
            await Promise.all(batch.map(ch => this.testSource(ch)));
            
            this.updateStats();
            this.renderSourceList();
            
            document.getElementById('progressText').textContent = 
                `测试中: ${Math.min(i + concurrency, pending.length)}/${pending.length}`;
        }
        
        document.getElementById('progressText').textContent = '测试完成';
        this.showToast('测试完成', 'success');
    }

    // 测试单个源
    async testSource(channel) {
        channel.status = 'testing';
        
        try {
            const controller = new AbortController();
            const timeout = setTimeout(() => controller.abort(), this.settings.timeout);
            
            const response = await fetch(channel.url, {
                method: 'HEAD',
                signal: controller.signal
            });
            
            clearTimeout(timeout);
            
            channel.status = response.ok ? 'valid' : 'invalid';
        } catch {
            channel.status = 'invalid';
        }
        
        channel.tested = true;
    }

    // 渲染频道列表
    renderSourceList() {
        const container = document.getElementById('sourceList');
        const filtered = this.currentCategory === 'all' 
            ? this.sources 
            : this.sources.filter(s => s.category === this.currentCategory);
        
        if (filtered.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <p>${this.sources.length === 0 ? '点击「采集全部」开始获取 IPTV 源' : '该分类暂无频道'}</p>
                </div>
            `;
            return;
        }
        
        container.innerHTML = filtered.map((ch, index) => {
            const isFav = this.favorites.some(f => f.url === ch.url);
            const statusIcon = this.getStatusIcon(ch.status);
            
            return `
                <div class="source-item ${ch.status}" data-index="${this.sources.indexOf(ch)}">
                    <div class="channel-logo">
                        ${ch.logo ? `<img src="${ch.logo}" alt="${ch.name}" onerror="this.parentElement.textContent='📺'">` : '📺'}
                    </div>
                    <div class="channel-info">
                        <div class="channel-name">${ch.name}</div>
                        <div class="channel-url">${ch.url}</div>
                    </div>
                    <span class="channel-category">${this.getCategoryName(ch.category)}</span>
                    <div class="channel-actions">
                        <button class="action-btn play-btn" onclick="iptv.playChannel(${this.sources.indexOf(ch)})" title="播放">▶</button>
                        <button class="action-btn favorite-btn ${isFav ? 'active' : ''}" onclick="iptv.toggleFavorite(${this.sources.indexOf(ch)})" title="收藏">
                            ${isFav ? '★' : '☆'}
                        </button>
                        <button class="action-btn copy-btn" onclick="iptv.copyUrl('${ch.url}')" title="复制">📋</button>
                    </div>
                    <div class="status-icon">${statusIcon}</div>
                </div>
            `;
        }).join('');
    }

    // 获取状态图标
    getStatusIcon(status) {
        switch(status) {
            case 'valid':
                return '<span style="color: #10b981;">✓</span>';
            case 'invalid':
                return '<span style="color: #ef4444;">✗</span>';
            case 'testing':
                return '<div class="spinner"></div>';
            default:
                return '<span style="color: #94a3b8;">○</span>';
        }
    }

    // 获取分类名称
    getCategoryName(category) {
        const names = {
            'cctv': '央视',
            'satellite': '卫视',
            'local': '地方台',
            'other': '其他'
        };
        return names[category] || '其他';
    }

    // 更新统计
    updateStats() {
        const total = this.sources.length;
        const valid = this.sources.filter(s => s.status === 'valid').length;
        const invalid = this.sources.filter(s => s.status === 'invalid').length;
        
        document.getElementById('totalCount').textContent = `总源数: ${total}`;
        document.getElementById('validCount').textContent = `有效: ${valid}`;
        document.getElementById('invalidCount').textContent = `无效: ${invalid}`;
    }

    // 播放频道
    playChannel(index) {
        const channel = this.sources[index];
        if (!channel || channel.status !== 'valid') {
            this.showToast('请选择有效的频道', 'error');
            return;
        }
        
        const video = document.getElementById('videoPlayer');
        video.src = channel.url;
        video.play().catch(e => this.showToast('播放失败: ' + e.message, 'error'));
        
        document.getElementById('currentChannel').textContent = channel.name;
        this.switchTab('player');
        this.updateChannelGrid(channel);
    }

    // 更新频道网格
    updateChannelGrid(currentChannel) {
        const grid = document.getElementById('channelGrid');
        const validChannels = this.sources.filter(s => s.status === 'valid');
        
        if (validChannels.length === 0) {
            grid.innerHTML = '<p class="empty-state">请先测试频道</p>';
            return;
        }
        
        grid.innerHTML = validChannels.map((ch, i) => {
            const actualIndex = this.sources.indexOf(ch);
            const isActive = currentChannel && ch.url === currentChannel.url;
            
            return `
                <div class="channel-card ${isActive ? 'active' : ''}" onclick="iptv.playChannel(${actualIndex})">
                    <div class="channel-card-logo">${ch.logo ? '<img src="' + ch.logo + '" onerror="this.parentElement.textContent=\'📺\'">' : '📺'}</div>
                    <div class="channel-card-name">${ch.name}</div>
                </div>
            `;
        }).join('');
    }

    // 切换收藏
    toggleFavorite(index) {
        const channel = this.sources[index];
        const existingIndex = this.favorites.findIndex(f => f.url === channel.url);
        
        if (existingIndex >= 0) {
            this.favorites.splice(existingIndex, 1);
            this.showToast('已取消收藏');
        } else {
            this.favorites.push({
                name: channel.name,
                url: channel.url,
                logo: channel.logo,
                category: channel.category
            });
            this.showToast('已添加到收藏', 'success');
        }
        
        this.saveToStorage('favorites', this.favorites);
        this.renderSourceList();
        this.renderFavorites();
    }

    // 渲染收藏列表
    renderFavorites() {
        const container = document.getElementById('favoritesList');
        
        if (this.favorites.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <p>收藏的频道将显示在这里</p>
                </div>
            `;
            return;
        }
        
        container.innerHTML = this.favorites.map((ch, index) => `
            <div class="source-item valid">
                <div class="channel-logo">
                    ${ch.logo ? `<img src="${ch.logo}" alt="${ch.name}" onerror="this.parentElement.textContent='📺'">` : '📺'}
                </div>
                <div class="channel-info">
                    <div class="channel-name">${ch.name}</div>
                    <div class="channel-url">${ch.url}</div>
                </div>
                <span class="channel-category">${this.getCategoryName(ch.category)}</span>
                <div class="channel-actions">
                    <button class="action-btn play-btn" onclick="iptv.playFavorite(${index})" title="播放">▶</button>
                    <button class="action-btn copy-btn" onclick="iptv.copyUrl('${ch.url}')" title="复制">📋</button>
                </div>
            </div>
        `).join('');
    }

    // 播放收藏
    playFavorite(index) {
        const channel = this.favorites[index];
        
        const video = document.getElementById('videoPlayer');
        video.src = channel.url;
        video.play().catch(e => this.showToast('播放失败: ' + e.message, 'error'));
        
        document.getElementById('currentChannel').textContent = channel.name;
        this.switchTab('player');
        this.updateChannelGrid(channel);
    }

    // 复制 URL
    copyUrl(url) {
        navigator.clipboard.writeText(url).then(() => {
            this.showToast('已复制到剪贴板', 'success');
        }).catch(() => {
            this.showToast('复制失败', 'error');
        });
    }

    // 导出 M3U
    exportM3U() {
        if (this.favorites.length === 0) {
            this.showToast('没有可导出的收藏', 'error');
            return;
        }
        
        const validFavorites = this.favorites.filter(ch => {
            const source = this.sources.find(s => s.url === ch.url);
            return !source || source.status === 'valid';
        });
        
        if (validFavorites.length === 0) {
            this.showToast('收藏中没有有效源', 'error');
            return;
        }
        
        let m3u = '#EXTM3U\n\n';
        
        validFavorites.forEach(ch => {
            m3u += `#EXTINF:-1 tvg-name="${ch.name}" tvg-logo="${ch.logo || ''}",${ch.name}\n`;
            m3u += `${ch.url}\n\n`;
        });
        
        const blob = new Blob([m3u], { type: 'audio/x-mpegurl' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `IPTV_${new Date().toISOString().slice(0,10)}.m3u`;
        a.click();
        URL.revokeObjectURL(url);
        
        this.showToast(`已导出 ${validFavorites.length} 个频道`, 'success');
    }

    // 清空收藏
    clearFavorites() {
        if (confirm('确定要清空所有收藏吗？')) {
            this.favorites = [];
            this.saveToStorage('favorites', this.favorites);
            this.renderFavorites();
            this.renderSourceList();
            this.showToast('收藏已清空');
        }
    }

    // 清除所有数据
    clearAllData() {
        if (confirm('确定要清除所有数据吗？此操作不可恢复！')) {
            localStorage.clear();
            this.sources = [];
            this.favorites = [];
            this.settings = {
                timeout: 5000,
                concurrency: 10,
                sourceUrls: ['https://iptv-org.github.io/api/channels.json']
            };
            this.loadSettings();
            this.renderSourceList();
            this.renderFavorites();
            this.updateStats();
            this.showToast('所有数据已清除');
        }
    }

    // Toast 提示
    showToast(message, type = '') {
        const toast = document.getElementById('toast');
        toast.textContent = message;
        toast.className = 'toast ' + type + ' show';
        
        setTimeout(() => {
            toast.classList.remove('show');
        }, 3000);
    }

    // 显示加载
    showLoading(text = '加载中...') {
        if (document.querySelector('.loading-overlay')) return;
        
        const overlay = document.createElement('div');
        overlay.className = 'loading-overlay';
        overlay.innerHTML = `
            <div class="loading-spinner"></div>
            <div class="loading-text">${text}</div>
        `;
        document.body.appendChild(overlay);
    }

    // 隐藏加载
    hideLoading() {
        const overlay = document.querySelector('.loading-overlay');
        if (overlay) overlay.remove();
    }

    // 本地存储
    saveToStorage(key, data) {
        try {
            localStorage.setItem('iptv_' + key, JSON.stringify(data));
        } catch (e) {
            console.error('存储失败:', e);
        }
    }

    loadFromStorage(key) {
        try {
            const data = localStorage.getItem('iptv_' + key);
            return data ? JSON.parse(data) : null;
        } catch (e) {
            console.error('读取失败:', e);
            return null;
        }
    }
}

// 初始化应用
const iptv = new IPTVCollector();
