// 默认推荐方案配置
const DEFAULT_SCHEMES = [
    // 仅存款方案
    {
        id: 1,
        name: '存款流动性优先方案',
        type: 'deposit',
        preference: 'liquidity',
        description: '高比例活期存款，保证资金灵活性',
        products: [
            { name: '活期存款', ratio: 40 },
            { name: '7天通知', ratio: 30 },
            { name: '3个月', ratio: 30 }
        ],
        enabled: true
    },
    {
        id: 2,
        name: '存款收益优先方案',
        type: 'deposit',
        preference: 'yield',
        description: '配置长期存款，追求更高收益',
        products: [
            { name: '活期存款', ratio: 10 },
            { name: '6个月', ratio: 40 },
            { name: '1年', ratio: 50 }
        ],
        enabled: true
    },
    {
        id: 3,
        name: '存款平衡组合方案',
        type: 'deposit',
        preference: 'balance',
        description: '短中长期存款均衡配置',
        products: [
            { name: '活期存款', ratio: 20 },
            { name: '3个月', ratio: 30 },
            { name: '6个月', ratio: 30 },
            { name: '1年', ratio: 20 }
        ],
        enabled: true
    },
    // 仅理财方案
    {
        id: 4,
        name: '理财流动性优先方案',
        type: 'wealth',
        preference: 'liquidity',
        description: 'T+1为主，随时可赎回',
        products: [
            { name: 'T+1赎回', ratio: 60 },
            { name: '7天赎回', ratio: 40 }
        ],
        enabled: true
    },
    {
        id: 5,
        name: '理财收益优先方案',
        type: 'wealth',
        preference: 'yield',
        description: '配置高收益理财产品',
        products: [
            { name: '7天赎回', ratio: 60 },
            { name: '3个月赎回', ratio: 40 }
        ],
        enabled: true
    },
    {
        id: 6,
        name: '理财平衡组合方案',
        type: 'wealth',
        preference: 'balance',
        description: '多种期限理财均衡配置',
        products: [
            { name: 'T+1赎回', ratio: 30 },
            { name: '7天赎回', ratio: 40 },
            { name: '14天赎回', ratio: 30 }
        ],
        enabled: true
    },
    // 存款+理财方案
    {
        id: 7,
        name: '混合流动性优先方案',
        type: 'mixed',
        preference: 'liquidity',
        description: '活期存款+T+1理财组合',
        products: [
            { name: '活期存款', ratio: 35 },
            { name: '7天通知', ratio: 25 },
            { name: 'T+1赎回', ratio: 40 }
        ],
        enabled: true
    },
    {
        id: 8,
        name: '混合收益优先方案',
        type: 'mixed',
        preference: 'yield',
        description: '长期存款+高收益理财',
        products: [
            { name: '活期存款', ratio: 10 },
            { name: '1年', ratio: 40 },
            { name: '7天赎回', ratio: 50 }
        ],
        enabled: true
    },
    {
        id: 9,
        name: '混合平衡组合方案',
        type: 'mixed',
        preference: 'balance',
        description: '存款理财均衡配置',
        products: [
            { name: '活期存款', ratio: 20 },
            { name: '3个月', ratio: 25 },
            { name: '6个月', ratio: 25 },
            { name: '7天赎回', ratio: 30 }
        ],
        enabled: true
    }
];

let currentSchemes = [];

// 页面加载时初始化
document.addEventListener('DOMContentLoaded', function() {
    loadSchemes();
    renderSchemes();
});

// 加载方案
function loadSchemes() {
    const stored = localStorage.getItem('bankSchemes');
    currentSchemes = stored ? JSON.parse(stored) : JSON.parse(JSON.stringify(DEFAULT_SCHEMES));
}

// 渲染方案列表
function renderSchemes() {
    const container = document.getElementById('schemesContainer');
    container.innerHTML = '';
    
    const typeLabels = {
        deposit: '仅存款',
        wealth: '仅理财',
        mixed: '存款+理财'
    };
    
    const preferenceLabels = {
        liquidity: '流动性优先',
        yield: '收益优先',
        balance: '平衡组合'
    };
    
    currentSchemes.forEach((scheme, index) => {
        const schemeDiv = document.createElement('div');
        schemeDiv.className = 'card scheme-item';
        
        schemeDiv.innerHTML = `
            <div class="scheme-header">
                <h3 class="scheme-title-clickable" onclick="toggleSchemeCollapse(${index})">
                    <span class="collapse-icon" id="collapse_icon_${index}">▶</span>
                    ${scheme.name}
                </h3>
                <div class="scheme-actions">
                    <label class="checkbox-label">
                        <input type="checkbox" ${scheme.enabled ? 'checked' : ''} 
                               onchange="toggleScheme(${index})">
                        <span>启用</span>
                    </label>
                    <button class="btn-delete" onclick="deleteScheme(${index})">删除</button>
                </div>
            </div>
            
            <div class="scheme-content" id="scheme_content_${index}" style="display: none;">
                <div class="form-grid">
                    <div class="form-field">
                        <label>方案名称</label>
                        <input type="text" value="${scheme.name}" 
                               onchange="updateScheme(${index}, 'name', this.value)">
                    </div>
                    <div class="form-field">
                        <label>方案类型</label>
                        <select onchange="updateSchemeType(${index}, this.value)">
                            <option value="deposit" ${scheme.type === 'deposit' ? 'selected' : ''}>仅存款</option>
                            <option value="wealth" ${scheme.type === 'wealth' ? 'selected' : ''}>仅理财</option>
                            <option value="mixed" ${scheme.type === 'mixed' ? 'selected' : ''}>存款+理财</option>
                        </select>
                    </div>
                    <div class="form-field">
                        <label>倾向标签</label>
                        <select onchange="updateScheme(${index}, 'preference', this.value)">
                            <option value="liquidity" ${scheme.preference === 'liquidity' ? 'selected' : ''}>流动性优先</option>
                            <option value="yield" ${scheme.preference === 'yield' ? 'selected' : ''}>收益优先</option>
                            <option value="balance" ${scheme.preference === 'balance' ? 'selected' : ''}>平衡组合</option>
                        </select>
                    </div>
                    <div class="form-field form-field-full">
                        <label>方案描述</label>
                        <input type="text" value="${scheme.description}" 
                               onchange="updateScheme(${index}, 'description', this.value)">
                    </div>
                </div>
                
                <h4>产品配置</h4>
                <div id="products_${index}" class="product-selection-area"></div>
                
                <div class="scheme-summary" id="summary_${index}">
                    <div class="summary-row">
                        <span>总比例：</span>
                        <span class="${calculateTotalRatio(scheme.products) === '100' ? 'valid' : 'invalid'}">${calculateTotalRatio(scheme.products)}%</span>
                    </div>
                    <div class="summary-row" id="rate_summary_${index}">
                        <!-- 综合收益率将在这里显示 -->
                    </div>
                </div>
            </div>
        `;
        
        container.appendChild(schemeDiv);
        
        // 渲染该方案的产品选择区域
        renderProductSelection(index);
        
        // 计算并显示综合收益率
        calculateSchemeRate(index);
    });
}

// 渲染产品选择区域
function renderProductSelection(schemeIndex) {
    const scheme = currentSchemes[schemeIndex];
    const container = document.getElementById(`products_${schemeIndex}`);
    const productConfig = getProductConfig();
    
    // 获取可用产品列表
    let availableProducts = [];
    if (scheme.type === 'deposit') {
        availableProducts = productConfig.deposits;
    } else if (scheme.type === 'wealth') {
        availableProducts = productConfig.wealth;
    } else if (scheme.type === 'mixed') {
        availableProducts = [...productConfig.deposits, ...productConfig.wealth];
    }
    
    container.innerHTML = '';
    
    // 创建产品列表
    availableProducts.forEach(product => {
        const existingProduct = scheme.products.find(p => p.name === product.name);
        const isSelected = !!existingProduct;
        const ratio = isSelected ? existingProduct.ratio : 0;
        
        const productDiv = document.createElement('div');
        productDiv.className = 'product-checkbox-item';
        productDiv.innerHTML = `
            <div class="product-checkbox-row">
                <label class="product-checkbox-label">
                    <input type="checkbox" ${isSelected ? 'checked' : ''} 
                           onchange="toggleProductSelection(${schemeIndex}, '${product.name}', this.checked)">
                    <span class="product-name-text">${product.name}</span>
                    <span class="product-rate-text">${product.clientRate}%</span>
                </label>
                ${isSelected ? `
                    <div class="product-ratio-input">
                        <label>比例：</label>
                        <input type="number" value="${ratio}" min="0" max="100" step="5"
                               onchange="updateProductRatio(${schemeIndex}, '${product.name}', parseFloat(this.value))">
                        <span>%</span>
                    </div>
                ` : ''}
            </div>
        `;
        container.appendChild(productDiv);
    });
}

// 切换产品选择
function toggleProductSelection(schemeIndex, productName, isSelected) {
    const scheme = currentSchemes[schemeIndex];
    
    if (isSelected) {
        // 添加产品
        scheme.products.push({
            name: productName,
            ratio: 0
        });
    } else {
        // 删除产品
        const index = scheme.products.findIndex(p => p.name === productName);
        if (index !== -1) {
            scheme.products.splice(index, 1);
        }
    }
    
    // 只更新当前方案的产品选择区域和汇总，不重新渲染整个页面
    renderProductSelection(schemeIndex);
    updateSchemeSummary(schemeIndex);
}

// 更新产品比例
function updateProductRatio(schemeIndex, productName, ratio) {
    const scheme = currentSchemes[schemeIndex];
    const product = scheme.products.find(p => p.name === productName);
    if (product) {
        // 检查总比例是否会超过100%
        const otherProductsTotal = scheme.products
            .filter(p => p.name !== productName)
            .reduce((sum, p) => sum + p.ratio, 0);
        
        const newTotal = otherProductsTotal + ratio;
        
        // 如果超过100%，限制为最大可用值
        if (newTotal > 100) {
            product.ratio = 100 - otherProductsTotal;
            // 更新输入框显示
            const inputElement = document.querySelector(`input[data-scheme="${schemeIndex}"][data-product="${productName}"]`);
            if (inputElement) {
                inputElement.value = product.ratio;
            }
        } else {
            product.ratio = ratio;
        }
        
        // 更新所有输入框的最大值限制
        scheme.products.forEach(p => {
            const inputElement = document.querySelector(`input[data-scheme="${schemeIndex}"][data-product="${p.name}"]`);
            if (inputElement) {
                const currentVal = p.ratio;
                const othersTotal = scheme.products
                    .filter(prod => prod.name !== p.name)
                    .reduce((sum, prod) => sum + prod.ratio, 0);
                inputElement.max = 100 - othersTotal;
            }
        });
        
        // 只更新汇总，不重新渲染
        updateSchemeSummary(schemeIndex);
    }
}

// 更新方案汇总信息
function updateSchemeSummary(schemeIndex) {
    const scheme = currentSchemes[schemeIndex];
    const totalRatio = calculateTotalRatio(scheme.products);
    
    // 更新总比例显示
    const summaryDiv = document.getElementById(`summary_${schemeIndex}`);
    if (summaryDiv) {
        const ratioSpan = summaryDiv.querySelector('.summary-row:first-child span:last-child');
        if (ratioSpan) {
            ratioSpan.textContent = `${totalRatio}%`;
            ratioSpan.className = totalRatio === '100' ? 'valid' : 'invalid';
        }
    }
    
    // 重新计算综合收益率
    calculateSchemeRate(schemeIndex);
}

// 更新方案类型（需要重新渲染产品列表）
function updateSchemeType(index, type) {
    currentSchemes[index].type = type;
    // 清空当前产品列表，因为类型变了
    currentSchemes[index].products = [];
    renderSchemes();
}

// 渲染产品列表（旧版本，保留用于兼容）
function renderProducts(schemeIndex) {
    const scheme = currentSchemes[schemeIndex];
    const container = document.getElementById(`products_${schemeIndex}`);
    
    container.innerHTML = '';
    
    scheme.products.forEach((product, productIndex) => {
        const productDiv = document.createElement('div');
        productDiv.className = 'product-config-item';
        productDiv.innerHTML = `
            <div class="input-row">
                <div class="input-group" style="flex: 2;">
                    <label>产品名称</label>
                    <input type="text" value="${product.name}" 
                           onchange="updateProduct(${schemeIndex}, ${productIndex}, 'name', this.value)">
                </div>
                <div class="input-group" style="flex: 1;">
                    <label>比例 (%)</label>
                    <input type="number" value="${product.ratio}" min="0" max="100" step="5"
                           onchange="updateProduct(${schemeIndex}, ${productIndex}, 'ratio', parseFloat(this.value))">
                </div>
                <div style="display: flex; align-items: flex-end;">
                    <button class="btn-delete" onclick="deleteProduct(${schemeIndex}, ${productIndex})">删除</button>
                </div>
            </div>
        `;
        container.appendChild(productDiv);
    });
}

// 计算总比例
function calculateTotalRatio(products) {
    return products.reduce((sum, p) => sum + (p.ratio || 0), 0).toFixed(0);
}

// 计算方案的综合收益率
function calculateSchemeRate(schemeIndex) {
    const scheme = currentSchemes[schemeIndex];
    const totalRatio = parseFloat(calculateTotalRatio(scheme.products));
    
    // 如果比例不是100%，不显示收益率
    if (Math.abs(totalRatio - 100) > 0.01) {
        const container = document.getElementById(`rate_summary_${schemeIndex}`);
        if (container) {
            container.innerHTML = '<span style="color: #999; font-size: 13px;">总比例达到100%后将显示综合收益率和银行收益</span>';
        }
        return;
    }
    
    // 获取产品配置
    const productConfig = getProductConfig();
    let weightedClientRate = 0;
    let weightedBankRate = 0;
    let hasInvalidProduct = false;
    
    scheme.products.forEach(product => {
        // 查找产品配置数据
        let productData = productConfig.deposits.find(p => p.name === product.name);
        let isDeposit = true;
        
        if (!productData) {
            productData = productConfig.wealth.find(p => p.name === product.name);
            isDeposit = false;
        }
        
        if (productData) {
            // 客户收益率
            weightedClientRate += product.ratio * productData.clientRate / 100;
            
            // 银行收益率
            if (isDeposit) {
                // 存款：银行收益 = FTP利率 - 客户利率
                const bankProfitRate = productData.ftpRate - productData.clientRate;
                weightedBankRate += product.ratio * bankProfitRate / 100;
            } else {
                // 理财：银行收益 = 佣金率
                weightedBankRate += product.ratio * productData.commissionRate / 100;
            }
        } else {
            hasInvalidProduct = true;
        }
    });
    
    const container = document.getElementById(`rate_summary_${schemeIndex}`);
    if (container) {
        if (hasInvalidProduct) {
            container.innerHTML = '<span style="color: #ff5722; font-size: 13px;">⚠ 存在无效产品名称，请检查</span>';
        } else {
            // 假设示例金额为1000万元
            const exampleAmount = 1000;
            const clientEarning = exampleAmount * weightedClientRate / 100;
            const bankEarning = exampleAmount * weightedBankRate / 100;
            
            container.innerHTML = `
                <div style="display: flex; flex-direction: column; gap: 8px;">
                    <div style="display: flex; justify-content: space-between; align-items: center;">
                        <span>客户综合收益率：</span>
                        <span style="color: #ff6f00; font-weight: 600; font-size: 16px;">${weightedClientRate.toFixed(2)}%</span>
                    </div>
                    <div style="display: flex; justify-content: space-between; align-items: center; padding: 8px; background: #e8f5e9; border-radius: 6px;">
                        <span style="color: #2e7d32;">💰 银行综合收益率：</span>
                        <span style="color: #2e7d32; font-weight: 600; font-size: 16px;">${weightedBankRate.toFixed(2)}%</span>
                    </div>
                    <div style="font-size: 12px; color: #999; margin-top: 4px;">
                        <div>示例（1000万元）：</div>
                        <div>• 客户年收益：${clientEarning.toFixed(2)}万元</div>
                        <div>• 银行年收益：${bankEarning.toFixed(2)}万元</div>
                    </div>
                </div>
            `;
        }
    }
}

// 获取产品配置
function getProductConfig() {
    const stored = localStorage.getItem('productConfig');
    if (stored) {
        return JSON.parse(stored);
    }
    
    // 默认产品配置
    return {
        deposits: [
            { name: '活期存款', clientRate: 0.05, ftpRate: 2.4 },
            { name: '7天通知', clientRate: 0.75, ftpRate: 1.9 },
            { name: '3个月', clientRate: 1.0, ftpRate: 2.0 },
            { name: '6个月', clientRate: 1.2, ftpRate: 2.05 },
            { name: '1年', clientRate: 1.3, ftpRate: 2.15 }
        ],
        wealth: [
            { name: 'T+1赎回', clientRate: 1.75, commissionRate: 0.1 },
            { name: '7天赎回', clientRate: 2.08, commissionRate: 0.05 },
            { name: '14天赎回', clientRate: 1.87, commissionRate: 0.05 },
            { name: '3个月赎回', clientRate: 2.0, commissionRate: 0.05 }
        ]
    };
}

// 更新方案
function updateScheme(index, field, value) {
    currentSchemes[index][field] = value;
    renderSchemes();
}

// 更新产品
function updateProduct(schemeIndex, productIndex, field, value) {
    currentSchemes[schemeIndex].products[productIndex][field] = value;
    renderSchemes();
}

// 切换方案启用状态
function toggleScheme(index) {
    currentSchemes[index].enabled = !currentSchemes[index].enabled;
}

// 切换方案折叠/展开
function toggleSchemeCollapse(index) {
    const content = document.getElementById(`scheme_content_${index}`);
    const icon = document.getElementById(`collapse_icon_${index}`);
    
    if (content.style.display === 'none') {
        content.style.display = 'block';
        icon.textContent = '▼';
    } else {
        content.style.display = 'none';
        icon.textContent = '▶';
    }
}

// 添加新方案
function addScheme() {
    const newScheme = {
        id: Date.now(),
        name: '新方案',
        type: 'deposit',
        preference: 'balance',
        description: '请设置方案描述',
        products: [
            { name: '活期存款', ratio: 50 },
            { name: '3个月', ratio: 50 }
        ],
        enabled: true
    };
    
    currentSchemes.push(newScheme);
    renderSchemes();
}

// 添加产品到方案
function addProduct(schemeIndex) {
    currentSchemes[schemeIndex].products.push({
        name: '新产品',
        ratio: 0
    });
    renderSchemes();
}

// 删除方案
function deleteScheme(index) {
    if (confirm('确定要删除这个方案吗？')) {
        currentSchemes.splice(index, 1);
        renderSchemes();
    }
}

// 删除产品
function deleteProduct(schemeIndex, productIndex) {
    if (currentSchemes[schemeIndex].products.length <= 1) {
        alert('至少需要保留一个产品');
        return;
    }
    
    currentSchemes[schemeIndex].products.splice(productIndex, 1);
    renderSchemes();
}

// 保存所有方案
function saveSchemes() {
    // 验证所有方案
    for (let scheme of currentSchemes) {
        if (!scheme.name) {
            alert('请填写所有方案的名称');
            return;
        }
        
        const totalRatio = scheme.products.reduce((sum, p) => sum + (p.ratio || 0), 0);
        if (Math.abs(totalRatio - 100) > 0.01) {
            alert(`方案"${scheme.name}"的产品比例总和必须为100%，当前为${totalRatio.toFixed(2)}%`);
            return;
        }
        
        for (let product of scheme.products) {
            if (!product.name) {
                alert(`方案"${scheme.name}"中存在未命名的产品`);
                return;
            }
        }
    }
    
    localStorage.setItem('bankSchemes', JSON.stringify(currentSchemes));
    showSaveMessage();
}

// 恢复默认方案
function resetSchemes() {
    if (confirm('确定要恢复默认方案吗？这将清除所有自定义方案。')) {
        currentSchemes = JSON.parse(JSON.stringify(DEFAULT_SCHEMES));
        localStorage.setItem('bankSchemes', JSON.stringify(currentSchemes));
        renderSchemes();
        showSaveMessage();
    }
}

// 显示保存消息
function showSaveMessage() {
    const message = document.getElementById('saveMessage');
    message.style.display = 'block';
    setTimeout(() => {
        message.style.display = 'none';
    }, 2000);
}

// 展开所有方案
function expandAll() {
    currentSchemes.forEach((scheme, index) => {
        const content = document.getElementById(`scheme_content_${index}`);
        const icon = document.getElementById(`collapse_icon_${index}`);
        if (content && icon) {
            content.style.display = 'block';
            icon.textContent = '▼';
        }
    });
}

// 折叠所有方案
function collapseAll() {
    currentSchemes.forEach((scheme, index) => {
        const content = document.getElementById(`scheme_content_${index}`);
        const icon = document.getElementById(`collapse_icon_${index}`);
        if (content && icon) {
            content.style.display = 'none';
            icon.textContent = '▶';
        }
    });
}

// 导出配置
function exportConfig() {
    const config = {
        bankSchemes: currentSchemes,
        productConfig: JSON.parse(localStorage.getItem('productConfig') || '{}')
    };
    
    const blob = new Blob([JSON.stringify(config, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'asset-config.json';
    a.click();
    URL.revokeObjectURL(url);
}

// 导入配置
function importConfig(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const config = JSON.parse(e.target.result);
            
            if (config.bankSchemes) {
                localStorage.setItem('bankSchemes', JSON.stringify(config.bankSchemes));
                currentSchemes = config.bankSchemes;
                renderSchemes();
            }
            
            if (config.productConfig) {
                localStorage.setItem('productConfig', JSON.stringify(config.productConfig));
            }
            
            alert('配置导入成功！');
        } catch (error) {
            alert('配置文件格式错误：' + error.message);
        }
    };
    reader.readAsText(file);
}

// 保存GitHub配置
function saveGithubConfig() {
    const githubUser = document.getElementById('githubUser').value.trim();
    const githubRepo = document.getElementById('githubRepo').value.trim();
    const githubToken = document.getElementById('githubToken').value.trim();
    
    if (!githubUser || !githubRepo || !githubToken) {
        alert('请填写完整的GitHub配置信息');
        return;
    }
    
    const config = {
        user: githubUser,
        repo: githubRepo,
        token: githubToken
    };
    
    localStorage.setItem('githubConfig', JSON.stringify(config));
    alert('GitHub配置已保存到本地浏览器');
}

// 发布配置到云端
async function publishToCloud() {
    const statusDiv = document.getElementById('publishStatus');
    statusDiv.style.color = '#667eea';
    statusDiv.textContent = '正在发布...';
    
    try {
        // 获取GitHub配置
        const githubConfigStr = localStorage.getItem('githubConfig');
        if (!githubConfigStr) {
            throw new Error('请先配置并保存GitHub信息');
        }
        
        const githubConfig = JSON.parse(githubConfigStr);
        
        // 准备配置数据
        const config = {
            bankSchemes: currentSchemes,
            productConfig: JSON.parse(localStorage.getItem('productConfig') || '{}')
        };
        
        const content = JSON.stringify(config, null, 2);
        const base64Content = btoa(unescape(encodeURIComponent(content)));
        
        // 先获取文件的SHA（如果文件已存在）
        const getUrl = `https://api.github.com/repos/${githubConfig.user}/${githubConfig.repo}/contents/default-config.json`;
        let sha = null;
        
        try {
            const getResponse = await fetch(getUrl, {
                headers: {
                    'Authorization': `token ${githubConfig.token}`,
                    'Accept': 'application/vnd.github.v3+json'
                }
            });
            
            if (getResponse.ok) {
                const fileData = await getResponse.json();
                sha = fileData.sha;
            }
        } catch (e) {
            // 文件不存在，创建新文件
        }
        
        // 更新或创建文件
        const putUrl = `https://api.github.com/repos/${githubConfig.user}/${githubConfig.repo}/contents/default-config.json`;
        const body = {
            message: '更新默认配置 - 管理员发布',
            content: base64Content,
            branch: 'main'
        };
        
        if (sha) {
            body.sha = sha;
        }
        
        const response = await fetch(putUrl, {
            method: 'PUT',
            headers: {
                'Authorization': `token ${githubConfig.token}`,
                'Accept': 'application/vnd.github.v3+json',
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(body)
        });
        
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message || '发布失败');
        }
        
        statusDiv.style.color = '#28a745';
        statusDiv.innerHTML = '✅ 发布成功！配置已更新到云端<br><small>预计1-2分钟后生效</small>';
        
        setTimeout(() => {
            statusDiv.textContent = '';
        }, 5000);
        
    } catch (error) {
        statusDiv.style.color = '#e74c3c';
        statusDiv.textContent = '❌ 发布失败：' + error.message;
        console.error('发布错误：', error);
    }
}

// 页面加载时恢复GitHub配置
document.addEventListener('DOMContentLoaded', function() {
    const githubConfigStr = localStorage.getItem('githubConfig');
    if (githubConfigStr) {
        try {
            const config = JSON.parse(githubConfigStr);
            document.getElementById('githubUser').value = config.user || '';
            document.getElementById('githubRepo').value = config.repo || '';
            document.getElementById('githubToken').value = config.token || '';
        } catch (e) {
            console.error('加载GitHub配置失败', e);
        }
    }
});

