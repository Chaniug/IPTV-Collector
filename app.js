// IPTV 电视直播源
class IPTVApp {
    constructor() {
        this.channels = [];
        this.currentSource = localStorage.getItem('iptv-source') || 'channels.json';
        this.currentCDN = localStorage.getItem('iptv-cdn') || 'direct';
        this.cdnBase = {
            direct: 'https://chaniug.github.io/IPTV-Collector',
            jsdelivr: 'https://cdn.jsdelivr.net/gh/Chaniug/IPTV-Collector@master',
            ghproxy: 'https://ghproxy.com/https://raw.githubusercontent.com/Chaniug/IPTV-Collector/master'
        };
        this.initSourceSelector();
        this.initCDNSelector();
        this.loadChannels(this.currentSource);
    }

    initSourceSelector() {
        const select = document.getElementById('sourceSelect');
        if (!select) return;
        select.value = this.currentSource;
        select.addEventListener('change', (e) => {
            this.currentSource = e.target.value;
            localStorage.setItem('iptv-source', this.currentSource);
            this.updateDownloadLinks();
            this.loadChannels(this.currentSource);
        });
        this.updateDownloadLinks();
    }

    initCDNSelector() {
        const select = document.getElementById('cdnSelect');
        if (!select) return;
        select.value = this.currentCDN;
        select.addEventListener('change', (e) => {
            this.currentCDN = e.target.value;
            localStorage.setItem('iptv-cdn', this.currentCDN);
            this.updateDownloadLinks();
        });
    }

    getM3uFile() {
        if (this.currentSource === 'channels-valid.json') return 'iptv-valid.m3u';
        if (this.currentSource === 'channels-cn.json') return 'iptv-cn.m3u';
        return 'iptv.m3u';
    }

    getJsonFile() {
        if (this.currentSource === 'channels-valid.json') return 'channels-valid.json';
        if (this.currentSource === 'channels-cn.json') return 'channels-cn.json';
        return 'channels.json';
    }

    buildUrl(file) {
        return `${this.cdnBase[this.currentCDN]}/${file}`;
    }

    updateDownloadLinks() {
        const m3uFile = this.getM3uFile();
        const jsonFile = this.getJsonFile();

        document.getElementById('subUrl').textContent = this.buildUrl(m3uFile);

        const m3uBtn = document.getElementById('downloadM3u');
        const jsonBtn = document.getElementById('downloadJson');
        if (m3uBtn) {
            m3uBtn.href = this.buildUrl(m3uFile);
            if (this.currentSource === 'channels-valid.json') {
                m3uBtn.download = 'IPTV有效直播源.m3u';
            } else if (this.currentSource === 'channels-cn.json') {
                m3uBtn.download = 'IPTV国内直播源.m3u';
            } else {
                m3uBtn.download = 'IPTV直播源.m3u';
            }
        }
        if (jsonBtn) {
            jsonBtn.href = this.buildUrl(jsonFile);
            jsonBtn.download = jsonFile;
        }

        const hint = document.getElementById('subHint');
        if (hint) {
            if (this.currentSource === 'channels-valid.json') {
                hint.textContent = '仅包含在海外节点验证可通的频道，适合求稳使用';
            } else if (this.currentSource === 'channels-cn.json') {
                hint.textContent = '精选国内源，适合在国内电视/盒子直接使用';
            } else {
                hint.textContent = '包含所有采集到的频道，适合国内网络使用（频道最全）';
            }
        }
    }

    async loadChannels(sourceFile) {
        try {
            const response = await fetch(this.buildUrl(sourceFile) + '?t=' + Date.now());
            const data = await response.json();
            
            if (!data.channels || data.channels.length === 0) {
                document.getElementById('channelList').innerHTML = 
                    '<p class="empty">暂无频道数据，请运行 <code>npm run collect</code> 采集数据</p>';
                return;
            }
            
            this.channels = data.channels.map(ch => ({
                ...ch,
                category: ch.category || ch.group || 'other'
            }));
            this.currentCategory = 'all';
            this.currentPage = 1;
            this.pageSize = 60;
            this.searchKeyword = '';
            this.renderChannels();
            this.updateStats();
            this.updateLastUpdated(data.update);
        } catch (e) {
            console.error('加载频道失败:', e);
            document.getElementById('channelList').innerHTML = 
                `<p class="error">加载 ${sourceFile} 失败，请检查文件是否存在</p>`;
        }
    }

    updateLastUpdated(updateString) {
        const el = document.getElementById('lastUpdated');
        if (!el || !updateString) return;
        
        try {
            const date = new Date(updateString);
            const formatted = date.toLocaleDateString('zh-CN', {
                year: 'numeric',
                month: '2-digit',
                day: '2-digit'
            });
            el.textContent = formatted;
        } catch (e) {
            el.textContent = updateString;
        }
    }

    getFilteredChannels() {
        let filtered = this.currentCategory === 'all'
            ? this.channels
            : this.channels.filter(ch => ch.category === this.currentCategory);

        if (this.searchKeyword) {
            const kw = this.searchKeyword.toLowerCase();
            filtered = filtered.filter(ch => ch.name.toLowerCase().includes(kw));
        }
        return filtered;
    }

    renderChannels() {
        const container = document.getElementById('channelList');
        const filtered = this.getFilteredChannels();

        if (filtered.length === 0) {
            container.innerHTML = '<p class="empty">暂无频道</p>';
            document.getElementById('pagination').innerHTML = '';
            return;
        }

        const totalPages = Math.ceil(filtered.length / this.pageSize);
        this.currentPage = Math.max(1, Math.min(this.currentPage, totalPages));
        const start = (this.currentPage - 1) * this.pageSize;
        const pageChannels = filtered.slice(start, start + this.pageSize);

        container.innerHTML = pageChannels.map(ch => `
            <div class="channel-item" data-url="${this.escapeHtml(ch.url)}" data-name="${this.escapeHtml(ch.name)}">
                <div class="channel-logo">
                    <img src="${this.escapeHtml(ch.logo)}" alt="${this.escapeHtml(ch.name)}" loading="lazy"
                         onerror="this.src='data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><text y=%22.9em%22 font-size=%2280%22>📺</text></svg>'">
                </div>
                <div class="channel-name">${this.escapeHtml(ch.name)}</div>
                <div class="channel-category">${this.escapeHtml(this.getCategoryName(ch.category))}</div>
                <button class="btn-copy" data-action="copy">复制地址</button>
                <button class="btn-play" data-action="play">播放</button>
            </div>
        `).join('');

        this.renderPagination(totalPages);
    }

    renderPagination(totalPages) {
        const container = document.getElementById('pagination');
        if (totalPages <= 1) {
            container.innerHTML = '';
            return;
        }

        let html = `<span>第 ${this.currentPage}/${totalPages} 页（共 ${this.getFilteredChannels().length} 个）</span>`;
        html += `<div class="page-buttons">`;
        html += `<button ${this.currentPage === 1 ? 'disabled' : ''} data-page="prev">上一页</button>`;
        const maxButtons = 7;
        let startPage = Math.max(1, this.currentPage - Math.floor(maxButtons / 2));
        let endPage = Math.min(totalPages, startPage + maxButtons - 1);
        if (endPage - startPage + 1 < maxButtons) {
            startPage = Math.max(1, endPage - maxButtons + 1);
        }
        for (let i = startPage; i <= endPage; i++) {
            html += `<button class="${i === this.currentPage ? 'active' : ''}" data-page="${i}">${i}</button>`;
        }
        html += `<button ${this.currentPage === totalPages ? 'disabled' : ''} data-page="next">下一页</button>`;
        html += `</div>`;
        container.innerHTML = html;
    }

    goToPage(page) {
        const filtered = this.getFilteredChannels();
        const totalPages = Math.ceil(filtered.length / this.pageSize);
        if (page === 'prev') this.currentPage--;
        else if (page === 'next') this.currentPage++;
        else this.currentPage = page;
        this.currentPage = Math.max(1, Math.min(this.currentPage, totalPages));
        this.renderChannels();
        document.getElementById('channelList').scrollIntoView({ behavior: 'smooth', block: 'start' });
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    getCategoryName(category) {
        const names = {
            'cctv': '央视',
            'satellite': '卫视',
            'local': '地方台',
            'cartoon': '卡通',
            'news': '新闻',
            'sports': '体育',
            'movie': '电影',
            'other': '其他'
        };
        return names[category] || category || '其他';
    }

    updateStats() {
        const container = document.getElementById('statsContainer');
        if (!container) return;

        const stats = {
            total: this.channels.length,
            cctv: this.channels.filter(ch => ch.category === 'cctv').length,
            satellite: this.channels.filter(ch => ch.category === 'satellite').length,
            cartoon: this.channels.filter(ch => ch.category === 'cartoon').length,
            news: this.channels.filter(ch => ch.category === 'news').length,
            sports: this.channels.filter(ch => ch.category === 'sports').length,
            movie: this.channels.filter(ch => ch.category === 'movie').length,
            other: this.channels.filter(ch => ch.category === 'other' || !ch.category).length
        };

        // 更新简单统计
        if (document.getElementById('totalCount')) {
            document.getElementById('totalCount').textContent = stats.total;
            document.getElementById('cctvCount').textContent = stats.cctv;
            document.getElementById('satelliteCount').textContent = stats.satellite;

            // 如果没有localCount元素，使用卡通分类来代替
            const localEl = document.getElementById('localCount');
            if (localEl) {
                localEl.textContent = stats.cartoon + stats.news + stats.sports + stats.movie + stats.other;
            }
        }

        // 更新详细统计表格（如果存在）
        const statsTable = document.getElementById('statsTable');
        if (statsTable) {
            statsTable.innerHTML = `
                <tr><td>央视台</td><td>${stats.cctv}</td></tr>
                <tr><td>卫视台</td><td>${stats.satellite}</td></tr>
                <tr><td>卡通类</td><td>${stats.cartoon}</td></tr>
                <tr><td>新闻类</td><td>${stats.news}</td></tr>
                <tr><td>体育类</td><td>${stats.sports}</td></tr>
                <tr><td>电影类</td><td>${stats.movie}</td></tr>
                <tr><td>其他台</td><td>${stats.other}</td></tr>
            `;
        }
    }

    copyUrl(url, name) {
        navigator.clipboard.writeText(url).then(() => {
            this.showToast(`已复制 ${name} 的地址`);
        }).catch(() => {
            this.showToast('复制失败，请手动复制', 'error');
        });
    }

    playUrl(url, name) {
        window.open(url, '_blank');
    }

    async testChannels() {
        const btn = document.getElementById('testBtn');
        const result = document.getElementById('testResult');
        
        btn.disabled = true;
        btn.textContent = '测试中...';
        result.innerHTML = '<p>正在测试频道...</p>';
        
        const testChannels = this.channels.slice(0, 10);
        let validCount = 0;
        let html = '<div class="test-list">';
        
        for (const ch of testChannels) {
            try {
                const controller = new AbortController();
                const timeout = setTimeout(() => controller.abort(), 8000);
                
                const response = await fetch(ch.url, { 
                    method: 'GET',
                    signal: controller.signal 
                });
                
                clearTimeout(timeout);
                
                const status = response.ok ? '✓ 可用' : '✗ 无效';
                const cls = response.ok ? 'valid' : 'invalid';
                if (response.ok) validCount++;
                
                html += `<div class="test-item ${cls}">${this.escapeHtml(ch.name)}: ${status}</div>`;
            } catch {
                html += `<div class="test-item invalid">${this.escapeHtml(ch.name)}: ✗ 超时</div>`;
            }
        }
        
        html += '</div>';
        html += `<p class="test-summary">测试完成: ${validCount}/${testChannels.length} 可用</p>`;
        result.innerHTML = html;
        
        btn.disabled = false;
        btn.textContent = '⚡ 重新测试';
    }

    showToast(message, type = '') {
        const toast = document.getElementById('toast');
        toast.textContent = message;
        toast.className = 'toast ' + type + ' show';
        
        setTimeout(() => {
            toast.classList.remove('show');
        }, 2000);
    }
}

// 初始化
const app = new IPTVApp();

// 事件委托 - 频道列表按钮点击
document.getElementById('channelList').addEventListener('click', (e) => {
    const channelItem = e.target.closest('.channel-item');
    if (!channelItem) return;
    
    const url = channelItem.dataset.url;
    const name = channelItem.dataset.name;
    
    if (e.target.dataset.action === 'copy') {
        app.copyUrl(url, name);
    } else if (e.target.dataset.action === 'play') {
        app.playUrl(url, name);
    }
});

// 筛选按钮事件
document.querySelectorAll('.filter-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        app.currentCategory = btn.dataset.category;
        app.currentPage = 1;
        app.renderChannels();
    });
});

// 搜索框事件
document.getElementById('searchInput').addEventListener('input', (e) => {
    app.searchKeyword = e.target.value.trim();
    app.currentPage = 1;
    app.renderChannels();
});

// 分页按钮事件
document.getElementById('pagination').addEventListener('click', (e) => {
    if (e.target.tagName !== 'BUTTON') return;
    const page = e.target.dataset.page;
    if (page) app.goToPage(page);
});

// 测试按钮事件
document.getElementById('testBtn').addEventListener('click', () => app.testChannels());

// 复制订阅链接
function copyText(id) {
    const text = document.getElementById(id).textContent;
    navigator.clipboard.writeText(text).then(() => {
        app.showToast('订阅链接已复制！');
    }).catch(() => {
        app.showToast('复制失败', 'error');
    });
}
