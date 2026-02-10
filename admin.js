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
