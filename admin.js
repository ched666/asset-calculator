// 默认产品配置
const DEFAULT_CONFIG = {
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

let currentConfig = null;

// 页面加载时初始化
document.addEventListener('DOMContentLoaded', function() {
    loadConfig();
    renderProducts();
});

// 加载配置
function loadConfig() {
    const stored = localStorage.getItem('productConfig');
    currentConfig = stored ? JSON.parse(stored) : JSON.parse(JSON.stringify(DEFAULT_CONFIG));
}

// 渲染产品列表
function renderProducts() {
    renderDeposits();
    renderWealth();
}

// 渲染存款产品
function renderDeposits() {
    const container = document.getElementById('depositProducts');
    container.innerHTML = '';
    
    currentConfig.deposits.forEach((product, index) => {
        container.innerHTML += `
            <div class="product-item" data-index="${index}">
                <div class="product-item-header">
                    <h4>存款产品 ${index + 1}</h4>
                    <button class="btn-delete" onclick="deleteDeposit(${index})">删除</button>
                </div>
                <div class="input-group">
                    <label>产品名称</label>
                    <input type="text" value="${product.name}" 
                           onchange="updateDeposit(${index}, 'name', this.value)">
                </div>
                <div class="input-row">
                    <div class="input-group">
                        <label>客户利率 (%)</label>
                        <input type="number" step="0.01" value="${product.clientRate}" 
                               onchange="updateDeposit(${index}, 'clientRate', parseFloat(this.value))">
                    </div>
                    <div class="input-group">
                        <label>银行FTP (%)</label>
                        <input type="number" step="0.01" value="${product.ftpRate}" 
                               onchange="updateDeposit(${index}, 'ftpRate', parseFloat(this.value))">
                    </div>
                </div>
                <div class="input-group">
                    <label>银行收益率: ${(product.ftpRate - product.clientRate).toFixed(2)}%</label>
                </div>
            </div>
        `;
    });
}

// 渲染理财产品
function renderWealth() {
    const container = document.getElementById('wealthProducts');
    container.innerHTML = '';
    
    currentConfig.wealth.forEach((product, index) => {
        container.innerHTML += `
            <div class="product-item" data-index="${index}">
                <div class="product-item-header">
                    <h4>理财产品 ${index + 1}</h4>
                    <button class="btn-delete" onclick="deleteWealth(${index})">删除</button>
                </div>
                <div class="input-group">
                    <label>产品名称</label>
                    <input type="text" value="${product.name}" 
                           onchange="updateWealth(${index}, 'name', this.value)">
                </div>
                <div class="input-row">
                    <div class="input-group">
                        <label>客户利率 (%)</label>
                        <input type="number" step="0.01" value="${product.clientRate}" 
                               onchange="updateWealth(${index}, 'clientRate', parseFloat(this.value))">
                    </div>
                    <div class="input-group">
                        <label>销售费率 (%)</label>
                        <input type="number" step="0.01" value="${product.commissionRate}" 
                               onchange="updateWealth(${index}, 'commissionRate', parseFloat(this.value))">
                    </div>
                </div>
                <div class="input-group">
                    <label>银行收益率: ${product.commissionRate.toFixed(2)}%</label>
                </div>
            </div>
        `;
    });
}

// 更新存款产品
function updateDeposit(index, field, value) {
    currentConfig.deposits[index][field] = value;
    if (field !== 'name') {
        renderDeposits(); // 重新渲染以更新计算的银行收益率
    }
}

// 更新理财产品
function updateWealth(index, field, value) {
    currentConfig.wealth[index][field] = value;
    if (field !== 'name') {
        renderWealth(); // 重新渲染以更新显示的银行收益率
    }
}

// 添加存款产品
function addDeposit() {
    currentConfig.deposits.push({
        name: '新存款产品',
        clientRate: 1.0,
        ftpRate: 2.0
    });
    renderDeposits();
}

// 添加理财产品
function addWealth() {
    currentConfig.wealth.push({
        name: '新理财产品',
        clientRate: 2.0,
        commissionRate: 0.05
    });
    renderWealth();
}

// 删除存款产品
function deleteDeposit(index) {
    if (currentConfig.deposits.length <= 1) {
        alert('至少需要保留一个存款产品');
        return;
    }
    if (confirm('确定要删除这个产品吗？')) {
        currentConfig.deposits.splice(index, 1);
        renderDeposits();
    }
}

// 删除理财产品
function deleteWealth(index) {
    if (currentConfig.wealth.length <= 1) {
        alert('至少需要保留一个理财产品');
        return;
    }
    if (confirm('确定要删除这个产品吗？')) {
        currentConfig.wealth.splice(index, 1);
        renderWealth();
    }
}

// 保存配置
function saveConfig() {
    // 验证数据
    for (let deposit of currentConfig.deposits) {
        if (!deposit.name || deposit.clientRate === undefined || deposit.ftpRate === undefined) {
            alert('请填写完整的存款产品信息');
            return;
        }
    }
    
    for (let wealth of currentConfig.wealth) {
        if (!wealth.name || wealth.clientRate === undefined || wealth.commissionRate === undefined) {
            alert('请填写完整的理财产品信息');
            return;
        }
    }
    
    localStorage.setItem('productConfig', JSON.stringify(currentConfig));
    showSaveMessage();
}

// 恢复默认配置
function resetConfig() {
    if (confirm('确定要恢复默认配置吗？这将清除所有自定义设置。')) {
        currentConfig = JSON.parse(JSON.stringify(DEFAULT_CONFIG));
        localStorage.setItem('productConfig', JSON.stringify(currentConfig));
        renderProducts();
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

// GitHub配置（内置）
const GITHUB_CONFIG = {
    user: 'ched666',
    repo: 'asset-calculator',
    token: ''  // Token由管理员首次输入后保存在localStorage
};

// 获取GitHub Token
function getGithubToken() {
    const saved = localStorage.getItem('githubToken');
    if (saved) return saved;
    return GITHUB_CONFIG.token;
}

// 保存Token到本地
function saveToken(token) {
    localStorage.setItem('githubToken', token);
    alert('✓ Token已保存到本地浏览器');
}

// 检查并提示输入Token
function ensureToken() {
    let token = getGithubToken();
    if (!token) {
        const instructions = 
            '⚠️ 首次使用需要配置GitHub Token\n\n' +
            '🔑 创建Fine-grained Token（推荐）：\n' +
            'https://github.com/settings/personal-access-tokens/new\n\n' +
            '🎯 配置要点：\n' +
            '1. Token name: asset-calculator-publisher\n' +
            '2. Repository access: Only select repositories\n' +
            '3. 选择: ched666/asset-calculator\n' +
            '4. Permissions > Contents: Read and write\n' +
            '5. 点击"Generate token"并复制\n\n' +
            '请输入Token：';
        
        token = prompt(instructions);
        
        if (!token) {
            return null;
        }
        
        token = token.trim();
        
        if (token.length < 20) {
            alert('❌ Token格式不正确，请重新输入');
            return null;
        }
        
        saveToken(token);
    }
    return token;
}

// 保存并发布
async function saveAndPublish() {
    saveConfig();
    await new Promise(resolve => setTimeout(resolve, 500));
    publishToCloud();
}

// 发布到云端
async function publishToCloud() {
    const statusDiv = document.getElementById('publishStatus');
    statusDiv.style.color = '#667eea';
    statusDiv.textContent = '正在发布到云端...';
    
    try {
        const token = ensureToken();
        if (!token) {
            throw new Error('未配置GitHub Token');
        }
        
        // 准备配置数据
        const config = {
            productConfig: currentConfig,
            bankSchemes: JSON.parse(localStorage.getItem('bankSchemes') || '[]')
        };
        
        const content = JSON.stringify(config, null, 2);
        const base64Content = btoa(unescape(encodeURIComponent(content)));
        
        // 先获取文件的SHA
        const getUrl = `https://api.github.com/repos/${GITHUB_CONFIG.user}/${GITHUB_CONFIG.repo}/contents/default-config.json`;
        let sha = null;
        
        try {
            const getResponse = await fetch(getUrl, {
                headers: {
                    'Authorization': `token ${token}`,
                    'Accept': 'application/vnd.github.v3+json'
                }
            });
            
            if (getResponse.ok) {
                const fileData = await getResponse.json();
                sha = fileData.sha;
            }
        } catch (e) {
            // 文件不存在
        }
        
        // 更新或创建文件
        const putUrl = `https://api.github.com/repos/${GITHUB_CONFIG.user}/${GITHUB_CONFIG.repo}/contents/default-config.json`;
        const body = {
            message: '更新产品配置 - 管理员发布',
            content: base64Content,
            branch: 'main'
        };
        
        if (sha) {
            body.sha = sha;
        }
        
        const response = await fetch(putUrl, {
            method: 'PUT',
            headers: {
                'Authorization': `token ${token}`,
                'Accept': 'application/vnd.github.v3+json',
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(body)
        });
        
        if (!response.ok) {
            const error = await response.json();
            
            if (response.status === 401) {
                throw new Error('Token无效或已过期，请点击“🔑 重置Token”后重新配置');
            } else if (response.status === 403) {
                throw new Error('Token权限不足，需要Contents的Read and write权限');
            } else if (response.status === 404) {
                throw new Error('仓库不存在或Token无访问权限');
            } else {
                throw new Error(error.message || `HTTP ${response.status}`);
            }
        }
        
        statusDiv.style.color = '#28a745';
        statusDiv.innerHTML = '✅ 发布成功！配置已同步到云端<br><small>新用户将在1-2分钟后看到更新</small>';
        
        setTimeout(() => {
            statusDiv.textContent = '';
        }, 5000);
        
    } catch (error) {
        statusDiv.style.color = '#e74c3c';
        statusDiv.textContent = '❌ 发布失败：' + error.message;
        console.error('发布错误：', error);
    }
}

// 重置Token
function resetToken() {
    if (confirm('确定要清除已保存的GitHub Token吗？\n下次发布时需要重新输入。')) {
        localStorage.removeItem('githubToken');
        alert('✅ Token已清除，下次发布时将重新提示输入。');
    }
}

// 测试Token是否有效
async function testToken() {
    const statusDiv = document.getElementById('publishStatus');
    const token = getGithubToken();
    
    if (!token) {
        statusDiv.style.color = '#e74c3c';
        statusDiv.textContent = '⚠️ 未配置Token，请点击“发布共享”进行配置';
        return;
    }
    
    statusDiv.style.color = '#667eea';
    statusDiv.textContent = '正在测试Token...';
    
    try {
        const response = await fetch(`https://api.github.com/repos/${GITHUB_CONFIG.user}/${GITHUB_CONFIG.repo}`, {
            headers: {
                'Authorization': `token ${token}`,
                'Accept': 'application/vnd.github.v3+json'
            }
        });
        
        if (response.ok) {
            statusDiv.style.color = '#28a745';
            statusDiv.innerHTML = '✅ Token有效！可以正常发布配置。';
        } else if (response.status === 401) {
            statusDiv.style.color = '#e74c3c';
            statusDiv.innerHTML = '❌ Token无效或已过期<br><small>请点击“🔑 重置Token”后重新配置</small>';
        } else if (response.status === 403) {
            statusDiv.style.color = '#e74c3c';
            statusDiv.innerHTML = '❌ Token权限不足<br><small>需要Contents的Read and write权限</small>';
        } else if (response.status === 404) {
            statusDiv.style.color = '#e74c3c';
            statusDiv.innerHTML = '❌ 仓库不存在或无访问权限<br><small>请检查Token是否有asset-calculator仓库权限</small>';
        } else {
            throw new Error(`HTTP ${response.status}`);
        }
    } catch (error) {
        statusDiv.style.color = '#e74c3c';
        statusDiv.textContent = '❌ 测试失败：' + error.message;
    }
    
    setTimeout(() => {
        statusDiv.textContent = '';
    }, 5000);
}
