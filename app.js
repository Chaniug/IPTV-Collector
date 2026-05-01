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
        
        // CORS 代理列表（按优先级排序）
        this.corsProxies = [
            'https://api.allorigins.win/raw?url=',
            'https://corsproxy.io/?',
            'https://proxy.cors.sh/'
        ];
        
        // 预置频道源（国内常用频道，可直连）
        this.presetChannels = [
            { name: 'CCTV-1 综合', url: 'http://ivi.bupt.edu.cn/hls/cctv1hd.m3u8', logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/a/a5/CCTV-1_%E7%BB%BC%E5%90%88.png/200px-CCTV-1_%E7%BB%BC%E5%90%88.png', category: 'cctv' },
            { name: 'CCTV-2 财经', url: 'http://ivi.bupt.edu.cn/hls/cctv2hd.m3u8', logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/9/96/CCTV-2_%E8%B4%A2%E7%BB%8F.png/200px-CCTV-2_%E8%B4%A2%E7%BB%8F.png', category: 'cctv' },
            { name: 'CCTV-3 综艺', url: 'http://ivi.bupt.edu.cn/hls/cctv3hd.m3u8', logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/0/0f/CCTV-3_%E7%BB%BC%E8%89%BA.png/200px-CCTV-3_%E7%BB%BC%E8%89%BA.png', category: 'cctv' },
            { name: 'CCTV-4 中文国际', url: 'http://ivi.bupt.edu.cn/hls/cctv4hd.m3u8', logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/2/25/CCTV-4_%E4%B8%AD%E6%96%87%E5%9B%BD%E9%99%85.png/200px-CCTV-4_%E4%B8%AD%E6%96%87%E5%9B%BD%E9%99%85.png', category: 'cctv' },
            { name: 'CCTV-5+ 体育', url: 'http://ivi.bupt.edu.cn/hls/cctv5hd.m3u8', logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/1/13/CCTV-5_%E8%BF%90%E5%8A%A8.png/200px-CCTV-5_%E8%BF%90%E5%8A%A8.png', category: 'cctv' },
            { name: 'CCTV-6 电影', url: 'http://ivi.bupt.edu.cn/hls/cctv6hd.m3u8', logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/2/25/CCTV-6_%E7%94%B5%E5%BD%B1.png/200px-CCTV-6_%E7%94%B5%E5%BD%B1.png', category: 'cctv' },
            { name: 'CCTV-7 国防军事', url: 'http://ivi.bupt.edu.cn/hls/cctv7hd.m3u8', logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/7/7a/CCTV-7_%E5%86%9B%E4%BA%8B.png/200px-CCTV-7_%E5%86%9B%E4%BA%8B.png', category: 'cctv' },
            { name: 'CCTV-8 电视剧', url: 'http://ivi.bupt.edu.cn/hls/cctv8hd.m3u8', logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/7/75/CCTV-8_%E5%89%A7%E5%9C%BA.png/200px-CCTV-8_%E5%89%A7%E5%9C%BA.png', category: 'cctv' },
            { name: 'CCTV-9 纪录', url: 'http://ivi.bupt.edu.cn/hls/cctv9hd.m3u8', logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/2/2e/CCTV-9_%E7%BA%AA%E5%BD%95.png/200px-CCTV-9_%E7%BA%AA%E5%BD%95.png', category: 'cctv' },
            { name: 'CCTV-10 科教', url: 'http://ivi.bupt.edu.cn/hls/cctv10hd.m3u8', logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/7/7d/CCTV-10_%E7%A7%91%E6%95%99.png/200px-CCTV-10_%E7%A7%91%E6%95%99.png', category: 'cctv' },
            { name: 'CCTV-11 戏曲', url: 'http://ivi.bupt.edu.cn/hls/cctv11.m3u8', logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/6/67/CCTV-11_%E6%88%8F%E6%9B%B3.png/200px-CCTV-11_%E6%88%8F%E6%9B%B3.png', category: 'cctv' },
            { name: 'CCTV-12 社会与法', url: 'http://ivi.bupt.edu.cn/hls/cctv12hd.m3u8', logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/9/9b/CCTV-12_%E7%A4%BE%E4%BC%9A%E4%B8%8E%E6%B3%95.png/200px-CCTV-12_%E7%A4%BE%E4%BC%9A%E4%B8%8E%E6%B3%95.png', category: 'cctv' },
            { name: 'CCTV-13 新闻', url: 'http://ivi.bupt.edu.cn/hls/cctv13.m3u8', logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/9/96/CCTV-13_%E6%96%B0%E9%97%BB.png/200px-CCTV-13_%E6%96%B0%E9%97%BB.png', category: 'cctv' },
            { name: 'CCTV-14 少儿', url: 'http://ivi.bupt.edu.cn/hls/cctv14hd.m3u8', logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/1/13/CCTV-14_%E5%B0%91%E5%84%BF.png/200px-CCTV-14_%E5%B0%91%E5%84%BF.png', category: 'cctv' },
            { name: 'CCTV-15 音乐', url: 'http://ivi.bupt.edu.cn/hls/cctv15.m3u8', logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/8/85/CCTV-15_%E9%9F%B3%E4%B9%90.png/200px-CCTV-15_%E9%9F%B3%E4%B9%90.png', category: 'cctv' },
            { name: 'CCTV-16 奥林匹克', url: 'http://ivi.bupt.edu.cn/hls/cctv16.m3u8', logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/c/c4/CCTV-16_%E5%A5%A5%E5%8D%81%E9%93%9C%E9%81%93.png/200px-CCTV-16_%E5%A5%A5%E5%8D%81%E9%93%9C%E9%81%93.png', category: 'cctv' },
            { name: 'CCTV-17 农业农村', url: 'http://ivi.bupt.edu.cn/hls/cctv17.m3u8', logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/d/d6/CCTV-17_%E5%86%9C%E4%B8%9A%E5%86%9C%E6%9D%91.png/200px-CCTV-17_%E5%86%9C%E4%B8%9A%E5%86%9C%E6%9D%91.png', category: 'cctv' },
            { name: 'CETV-1 中国教育', url: 'http://ivi.bupt.edu.cn/hls/cetv1.m3u8', logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/7/72/CETV-1_logo.png/200px-CETV-1_logo.png', category: 'other' },
            { name: '湖南卫视', url: 'http://ivi.bupt.edu.cn/hls/hunanhd.m3u8', logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/2/23/HunanWeishi.png/200px-HunanWeishi.png', category: 'satellite' },
            { name: '浙江卫视', url: 'http://ivi.bupt.edu.cn/hls/zjhd.m3u8', logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/2/2f/ZhejiangTV.png/200px-ZhejiangTV.png', category: 'satellite' },
            { name: '江苏卫视', url: 'http://ivi.bupt.edu.cn/hls/jshd.m3u8', logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/7/75/Logo_of_Jiangsu_Television.png/200px-Logo_of_Jiangsu_Television.png', category: 'satellite' },
            { name: '东方卫视', url: 'http://ivi.bupt.edu.cn/hls/dongfanghd.m3u8', logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/5/5e/DragonTV.png/200px-DragonTV.png', category: 'satellite' },
            { name: '北京卫视', url: 'http://ivi.bupt.edu.cn/hls/btv1hd.m3u8', logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/8/8b/BeijingTV.png/200px-BeijingTV.png', category: 'local' },
            { name: '上海卫视', url: 'http://ivi.bupt.edu.cn/hls/shtv.m3u8', logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/8/8c/STV_Logo.png/200px-STV_Logo.png', category: 'local' },
            { name: '广东卫视', url: 'http://ivi.bupt.edu.cn/hls/gdhd.m3u8', logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/8/8a/GuangdongTV.png/200px-GuangdongTV.png', category: 'local' },
            { name: '深圳卫视', url: 'http://ivi.bupt.edu.cn/hls/szhd.m3u8', logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/42/ShenzhenTV.png/200px-ShenzhenTV.png', category: 'local' },
            { name: '安徽卫视', url: 'http://ivi.bupt.edu.cn/hls/ahhd.m3u8', logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/4d/AnhuiTV.png/200px-AnhuiTV.png', category: 'local' },
            { name: '四川卫视', url: 'http://ivi.bupt.edu.cn/hls/schd.m3u8', logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/7/7e/SichuanTV.png/200px-SichuanTV.png', category: 'local' },
            { name: '山东卫视', url: 'http://ivi.bupt.edu.cn/hls/sdhd.m3u8', logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/6/6e/ShandongTV.png/200px-ShandongTV.png', category: 'local' },
            { name: '湖北卫视', url: 'http://ivi.bupt.edu.cn/hls/hbhd.m3u8', logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/6/68/HubeiTV.png/200px-HubeiTV.png', category: 'local' },
            { name: '辽宁卫视', url: 'http://ivi.bupt.edu.cn/hls/lnhd.m3u8', logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/45/LiaoningTV.png/200px-LiaoningTV.png', category: 'local' },
            { name: '天津卫视', url: 'http://ivi.bupt.edu.cn/hls/tjhd.m3u8', logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/2/28/TianjinTV.png/200px-TianjinTV.png', category: 'local' },
            { name: '重庆卫视', url: 'http://ivi.bupt.edu.cn/hls/cqhd.m3u8', logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/5/52/ChongqingTV.png/200px-ChongqingTV.png', category: 'local' },
            { name: '黑龙江卫视', url: 'http://ivi.bupt.edu.cn/hls/hlhd.m3u8', logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/7/72/HeilongjiangTV.png/200px-HeilongjiangTV.png', category: 'local' },
            { name: '吉林卫视', url: 'http://ivi.bupt.edu.cn/hls/jlhd.m3u8', logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/8/8d/JilinTV.png/200px-JilinTV.png', category: 'local' },
            { name: '河北卫视', url: 'http://ivi.bupt.edu.cn/hls/hebhd.m3u8', logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/8/8b/HebeiTV.png/200px-HebeiTV.png', category: 'local' },
            { name: '云南卫视', url: 'http://ivi.bupt.edu.cn/hls/yntv.m3u8', logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/c/c7/YunnanTV.png/200px-YunnanTV.png', category: 'local' },
            { name: '贵州卫视', url: 'http://ivi.bupt.edu.cn/hls/gztv.m3u8', logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/d/d4/GuizhouTV.png/200px-GuizhouTV.png', category: 'local' },
            { name: '海南卫视', url: 'http://ivi.bupt.edu.cn/hls/hainan.m3u8', logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/d/d0/HainanTV.png/200px-HainanTV.png', category: 'local' },
            { name: '江西卫视', url: 'http://ivi.bupt.edu.cn/hls/jxhd.m3u8', logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/7/72/JiangxiTV.png/200px-JiangxiTV.png', category: 'local' },
            { name: '山西卫视', url: 'http://ivi.bupt.edu.cn/hls/shxhd.m3u8', logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/3/3f/ShanxiTV.png/200px-ShanxiTV.png', category: 'local' },
            { name: '内蒙古卫视', url: 'http://ivi.bupt.edu.cn/hls/nmhd.m3u8', logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/a/a5/InnerMongoliaTV.png/200px-InnerMongoliaTV.png', category: 'local' },
            { name: '广西卫视', url: 'http://ivi.bupt.edu.cn/hls/gxhd.m3u8', logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/5/5e/GuangxiTV.png/200px-GuangxiTV.png', category: 'local' },
            { name: '甘肃卫视', url: 'http://ivi.bupt.edu.cn/hls/gshd.m3u8', logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/d/d3/GansuTV.png/200px-GansuTV.png', category: 'local' },
            { name: '宁夏卫视', url: 'http://ivi.bupt.edu.cn/hls/nxtv.m3u8', logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/2/24/NingxiaTV.png/200px-NingxiaTV.png', category: 'local' },
            { name: '青海卫视', url: 'http://ivi.bupt.edu.cn/hls/qhtv.m3u8', logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/42/QinghaiTV.png/200px-QinghaiTV.png', category: 'local' },
            { name: '新疆卫视', url: 'http://ivi.bupt.edu.cn/hls/xjtv.m3u8', logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/48/XinjiangTV.png/200px-XinjiangTV.png', category: 'local' },
            { name: '西藏卫视', url: 'http://ivi.bupt.edu.cn/hls/xztv.m3u8', logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/4f/TibetTV.png/200px-TibetTV.png', category: 'local' },
            { name: '凤凰卫视中文', url: 'http://ivi.bupt.edu.cn/hls/phoenix.m3u8', logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/4f/PhoenixTV.png/200px-PhoenixTV.png', category: 'satellite' },
            { name: '凤凰卫视资讯', url: 'http://ivi.bupt.edu.cn/hls/phoenixinfo.m3u8', logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/4f/PhoenixTV.png/200px-PhoenixTV.png', category: 'satellite' }
        ];
        
        this.init();
    }

    // 初始化
    init() {
        this.bindEvents();
        this.loadSettings();
        this.renderFavorites();
        this.updateStats();
        
        // 自动加载预置频道
        this.loadPresetChannels();
    }
    
    // 加载预置频道
    loadPresetChannels() {
        if (this.sources.length === 0) {
            this.sources = this.presetChannels.map(ch => ({
                name: ch.name,
                url: ch.url,
                logo: ch.logo || '',
                category: ch.category,
                status: 'pending',
                tested: false
            }));
            this.renderSourceList();
            this.updateStats();
        }
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
                    this.showToast(`从 ${new URL(url).hostname} 获取到 ${channels.length} 个频道`, 'success');
                } catch (e) {
                    console.warn(`从 ${url} 采集失败:`, e);
                    this.showToast(`从 ${url} 采集失败，使用预置频道`, 'error');
                }
            }
            
            // 去重
            const uniqueChannels = this.deduplicateChannels(allChannels);
            
            // 合并预置频道（避免重复）
            const presetUrls = new Set(this.presetChannels.map(ch => ch.url));
            const newChannels = uniqueChannels.filter(ch => !presetUrls.has(ch.url));
            
            // 分配类别
            this.sources = [
                ...this.presetChannels.map(ch => ({
                    name: ch.name,
                    url: ch.url,
                    logo: ch.logo || '',
                    category: ch.category,
                    status: 'pending',
                    tested: false
                })),
                ...newChannels.map(ch => ({
                    ...ch,
                    category: this.categorizeChannel(ch.name),
                    status: 'pending',
                    tested: false
                }))
            ];
            
            this.renderSourceList();
            this.updateStats();
            this.showToast(`共 ${this.sources.length} 个频道（预置 ${this.presetChannels.length} + 采集 ${newChannels.length}）`, 'success');
            
            // 自动测试
            setTimeout(() => this.testAllSources(), 500);
            
        } catch (error) {
            this.showToast('采集失败: ' + error.message, 'error');
            // 确保预置频道可用
            if (this.sources.length === 0) {
                this.loadPresetChannels();
                this.showToast('已加载预置频道，请点击"测试全部"', 'error');
            }
        } finally {
            this.hideLoading();
        }
    }

    // 获取频道数据（通过 CORS 代理）
    async fetchChannels(url) {
        const data = await this.fetchWithProxy(url);
        
        if (url.includes('iptv-org')) {
            if (Array.isArray(data)) {
                return data.map(item => ({
                    name: item.name,
                    url: item.url,
                    logo: item.logo || '',
                    country: item.country?.[0] || '',
                    category: item.category || []
                }));
            }
        }
        
        // 通用解析
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
    
    // 使用 CORS 代理获取数据
    async fetchWithProxy(url) {
        // 尝试使用多个代理
        for (const proxy of this.corsProxies) {
            try {
                const proxyUrl = proxy + encodeURIComponent(url);
                const response = await fetch(proxyUrl, {
                    timeout: 15000
                });
                
                if (response.ok) {
                    return await response.json();
                }
            } catch (e) {
                console.warn(`代理 ${proxy} 失败:`, e);
            }
        }
        
        // 所有代理都失败，尝试直接获取（可能失败，但给出友好错误）
        try {
            const response = await fetch(url);
            if (response.ok) {
                return await response.json();
            }
        } catch (e) {
            console.warn('直接请求失败:', e);
        }
        
        throw new Error('无法获取数据，请检查网络或稍后重试');
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
