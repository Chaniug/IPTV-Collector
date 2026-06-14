// IPTV 电视直播源 - 简化版
class IPTVApp {
    constructor() {
        this.channels = [];
        this.loadChannels();
    }

    async loadChannels() {
        try {
            const response = await fetch('channels.json');
            const data = await response.json();
            
            if (!data.channels || data.channels.length === 0) {
                document.getElementById('channelList').innerHTML = 
                    '<p class="empty">暂无频道数据，请运行 <code>npm run collect</code> 采集数据</p>';
                return;
            }
            
            this.channels = data.channels.map(ch => ({
                ...ch,
                category: ch.category || ch.group || 'other' // 兼容 group 和 category 字段
            }));
            this.renderChannels();
            this.updateStats();
            this.updateLastUpdated(data.update);
        } catch (e) {
            console.error('加载频道失败:', e);
            document.getElementById('channelList').innerHTML = 
                '<p class="error">加载频道失败，请检查 channels.json 文件</p>';
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

    renderChannels(category = 'all') {
        const container = document.getElementById('channelList');
        const filtered = category === 'all' 
            ? this.channels 
            : this.channels.filter(ch => ch.category === category);

        if (filtered.length === 0) {
            container.innerHTML = '<p class="empty">暂无频道</p>';
            return;
        }

        container.innerHTML = filtered.map(ch => `
            <div class="channel-item" data-url="${this.escapeHtml(ch.url)}" data-name="${this.escapeHtml(ch.name)}">
                <div class="channel-logo">
                    <img src="${this.escapeHtml(ch.logo)}" alt="${this.escapeHtml(ch.name)}" 
                         onerror="this.src='data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><text y=%22.9em%22 font-size=%2280%22>📺</text></svg>'">
                </div>
                <div class="channel-name">${this.escapeHtml(ch.name)}</div>
                <div class="channel-category">${this.escapeHtml(this.getCategoryName(ch.category))}</div>
                <button class="btn-copy" data-action="copy">复制地址</button>
                <button class="btn-play" data-action="play">播放</button>
            </div>
        `).join('');
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
            'other': '其他'
        };
        return names[category] || '其他';
    }

    updateStats() {
        document.getElementById('totalCount').textContent = this.channels.length;
        document.getElementById('cctvCount').textContent = 
            this.channels.filter(ch => ch.category === 'cctv').length;
        document.getElementById('satelliteCount').textContent = 
            this.channels.filter(ch => ch.category === 'satellite').length;
        document.getElementById('localCount').textContent = 
            this.channels.filter(ch => ch.category === 'local').length;
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
        app.renderChannels(btn.dataset.category);
    });
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
