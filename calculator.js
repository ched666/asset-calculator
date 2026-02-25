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

// 从服务器加载默认配置
async function loadDefaultConfig() {
    try {
        const response = await fetch('default-config.json');
        if (!response.ok) return null;
        return await response.json();
    } catch (error) {
        console.log('无法加载默认配置，使用内置配置');
        return null;
    }
}

// 初始化配置（首次访问时从服务器加载）
async function initializeConfig() {
    const hasConfig = localStorage.getItem('productConfig');
    const hasSchemes = localStorage.getItem('bankSchemes');
    
    // 如果已有配置，直接返回
    if (hasConfig && hasSchemes) {
        return;
    }
    
    // 首次访问，尝试加载默认配置
    const defaultConfig = await loadDefaultConfig();
    if (defaultConfig) {
        if (!hasConfig && defaultConfig.productConfig) {
            localStorage.setItem('productConfig', JSON.stringify(defaultConfig.productConfig));
            console.log('✓ 已加载默认产品配置');
        }
        if (!hasSchemes && defaultConfig.bankSchemes) {
            localStorage.setItem('bankSchemes', JSON.stringify(defaultConfig.bankSchemes));
            console.log('✓ 已加载默认推荐方案');
        }
    }
}

// 同步云端配置
async function syncCloudConfig(event) {
    const btn = event ? event.target : document.querySelector('button[onclick*="syncCloudConfig"]');
    if (!btn) {
        alert('无法找到同步按钮');
        return;
    }
    
    const originalText = btn.textContent;
    btn.textContent = '同步中...';
    btn.disabled = true;
    
    try {
        const defaultConfig = await loadDefaultConfig();
        if (defaultConfig) {
            if (defaultConfig.productConfig) {
                localStorage.setItem('productConfig', JSON.stringify(defaultConfig.productConfig));
            }
            if (defaultConfig.bankSchemes) {
                localStorage.setItem('bankSchemes', JSON.stringify(defaultConfig.bankSchemes));
            }
            
            btn.textContent = '✓ 同步成功';
            btn.style.background = '#28a745';
            
            // 刷新页面以应用新配置
            setTimeout(() => {
                location.reload();
            }, 1000);
        } else {
            throw new Error('无法获取云端配置');
        }
    } catch (error) {
        btn.textContent = '✗ 同步失败';
        btn.style.background = '#e74c3c';
        console.error('同步配置失败：', error);
        
        setTimeout(() => {
            btn.textContent = originalText;
            btn.style.background = '';
            btn.disabled = false;
        }, 2000);
    }
}

// 获取产品配置
function getConfig() {
    const stored = localStorage.getItem('productConfig');
    return stored ? JSON.parse(stored) : DEFAULT_CONFIG;
}

// 调整目标收益率
function adjustTargetRate(inputId, delta) {
    const input = document.getElementById(inputId);
    const currentValue = parseFloat(input.value) || 0;
    const newValue = Math.max(0, Math.min(10, currentValue + delta));
    input.value = newValue.toFixed(2);
    
    // 如果是自定义配置的目标收益率，触发更新
    if (inputId === 'customTargetRate') {
        updateTotalRatio();
    }
}

// 计算函数
function calculate() {
    const amount = parseFloat(document.getElementById('amount').value);
    const targetRate = parseFloat(document.getElementById('targetRate').value);
    const allocationType = document.querySelector('input[name="allocationType"]:checked').value;
    const liquidityRatio = allocationType === 'wealth' ? 0 : parseFloat(document.getElementById('liquidityRatio').value);
    const preference = document.querySelector('input[name="preference"]:checked').value;

    if (!amount || amount <= 0) {
        showError('请输入有效的资金金额');
        return;
    }

    if (!targetRate || targetRate < 0) {
        showError('请输入有效的目标收益率');
        return;
    }

    if (allocationType !== 'wealth' && (liquidityRatio < 0 || liquidityRatio > 100)) {
        showError('活期存款比例必须在0-100%之间');
        return;
    }

    const config = getConfig();
    let solutions = [];

    try {
        switch (allocationType) {
            case 'deposit':
                solutions = generateDepositSolutions(config.deposits, targetRate, liquidityRatio, preference);
                break;
            case 'wealth':
                solutions = generateWealthSolutions(config.wealth, targetRate, preference);
                break;
            case 'mixed':
                solutions = generateMixedSolutions(config, targetRate, liquidityRatio, preference);
                break;
        }

        if (solutions && solutions.length > 0) {
            showMultipleResults(solutions, amount, allocationType);
        } else {
            const maxRate = getMaxRate(config, allocationType);
            showError(`无法达到目标收益率 ${targetRate.toFixed(2)}%。当前产品组合最高可达到 ${maxRate.toFixed(2)}%。请降低目标收益率或选择其他配置方式。`);
        }
    } catch (error) {
        showError('计算出错：' + error.message);
    }
}

// 生成存款方案
function generateDepositSolutions(deposits, targetRate, liquidityRatio, preference) {
    const solutions = [];
    
    // 找到活期存款
    const demandDeposit = deposits.find(d => d.name.includes('活期'));
    if (!demandDeposit) {
        throw new Error('未找到活期存款产品');
    }
    
    const demandIndex = deposits.indexOf(demandDeposit);
    const otherDeposits = deposits.filter((d, i) => i !== demandIndex);
    
    // 计算剩余资金需要达到的收益率
    const remainingRatio = 100 - liquidityRatio;
    if (remainingRatio <= 0) {
        // 全部活期
        const allocation = new Array(deposits.length).fill(0);
        allocation[demandIndex] = 100;
        solutions.push({
            feasible: true,
            allocation,
            clientRate: demandDeposit.clientRate,
            bankRate: demandDeposit.ftpRate - demandDeposit.clientRate,
            productCount: 1,
            preference: preference,
            liquidityScore: 100
        });
        return solutions;
    }
    
    const requiredRate = (targetRate * 100 - demandDeposit.clientRate * liquidityRatio) / remainingRatio;
    
    // 按客户利率排序其他存款
    const sorted = otherDeposits.map((p, idx) => ({
        ...p,
        originalIndex: deposits.indexOf(p),
        bankRate: p.ftpRate - p.clientRate
    })).sort((a, b) => a.clientRate - b.clientRate);
    
    const minRate = sorted[0].clientRate;
    const maxRate = sorted[sorted.length - 1].clientRate;
    
    if (requiredRate < minRate || requiredRate > maxRate) {
        return [];
    }
    
    // 根据倾向生成方案
    switch (preference) {
        case 'yield':
            // 收益优先：使用高收益产品，活期仅保底
            solutions.push(generateYieldFirstDeposit(deposits, sorted, demandIndex, liquidityRatio, requiredRate, targetRate));
            break;
            
        case 'liquidity':
            // 流动性优先：增加活期和短期存款
            solutions.push(generateLiquidityFirstDeposit(deposits, sorted, demandIndex, liquidityRatio, targetRate));
            break;
            
        case 'balance':
            // 平衡组合：多个产品分散配置
            solutions.push(generateBalancedDeposit(deposits, sorted, demandIndex, liquidityRatio, requiredRate, targetRate));
            break;
    }
    
    return solutions.filter(s => s && s.feasible);
}

// 收益优先存款方案
function generateYieldFirstDeposit(deposits, sorted, demandIndex, liquidityRatio, requiredRate, targetRate) {
    const allocation = new Array(deposits.length).fill(0);
    allocation[demandIndex] = liquidityRatio;
    
    // 找到能达到目标收益率的最高收益产品组合
    for (let i = sorted.length - 1; i >= 0; i--) {
        const high = sorted[i];
        
        if (high.clientRate >= requiredRate) {
            // 单一高收益产品即可
            allocation[high.originalIndex] = 100 - liquidityRatio;
            
            let clientRate = 0;
            let bankRate = 0;
            deposits.forEach((p, idx) => {
                const ratio = allocation[idx];
                clientRate += p.clientRate * ratio / 100;
                bankRate += (p.ftpRate - p.clientRate) * ratio / 100;
            });
            
            return {
                feasible: true,
                allocation,
                clientRate,
                bankRate,
                productCount: 2,
                preference: 'yield',
                liquidityScore: liquidityRatio,
                description: '收益优先方案：采用高收益产品最大化客户收益'
            };
        }
        
        // 尝试两个产品组合
        if (i > 0) {
            const low = sorted[i - 1];
            if (requiredRate >= low.clientRate && requiredRate <= high.clientRate) {
                const ratio = (requiredRate - low.clientRate) / (high.clientRate - low.clientRate);
                const highRatio = ratio * (100 - liquidityRatio);
                const lowRatio = (100 - liquidityRatio) - highRatio;
                
                allocation[high.originalIndex] = highRatio;
                allocation[low.originalIndex] = lowRatio;
                
                let clientRate = 0;
                let bankRate = 0;
                deposits.forEach((p, idx) => {
                    const r = allocation[idx];
                    clientRate += p.clientRate * r / 100;
                    bankRate += (p.ftpRate - p.clientRate) * r / 100;
                });
                
                return {
                    feasible: true,
                    allocation,
                    clientRate,
                    bankRate,
                    productCount: 3,
                    preference: 'yield',
                    liquidityScore: liquidityRatio,
                    description: '收益优先方案：配置高收益产品组合'
                };
            }
        }
    }
    
    return null;
}

// 流动性优先存款方案
function generateLiquidityFirstDeposit(deposits, sorted, demandIndex, liquidityRatio, targetRate) {
    const allocation = new Array(deposits.length).fill(0);
    
    // 增加活期比例到30-50%
    const enhancedLiquidity = Math.max(liquidityRatio, Math.min(40, liquidityRatio + 20));
    allocation[demandIndex] = enhancedLiquidity;
    
    // 剩余资金优先配置短期存款（7天通知、3个月）
    const remainingRatio = 100 - enhancedLiquidity;
    const shortTermDeposits = sorted.filter(d => 
        d.name.includes('7天') || d.name.includes('3个月')
    ).sort((a, b) => b.clientRate - a.clientRate);
    
    if (shortTermDeposits.length > 0) {
        // 计算所需收益率
        const demandDeposit = deposits[demandIndex];
        const requiredRate = (targetRate * 100 - demandDeposit.clientRate * enhancedLiquidity) / remainingRatio;
        
        // 使用短期产品
        if (shortTermDeposits.length === 1) {
            allocation[shortTermDeposits[0].originalIndex] = remainingRatio;
        } else {
            // 分散在多个短期产品
            const product1 = shortTermDeposits[0];
            const product2 = shortTermDeposits[1];
            
            if (requiredRate >= product2.clientRate && requiredRate <= product1.clientRate) {
                const ratio = (requiredRate - product2.clientRate) / (product1.clientRate - product2.clientRate);
                allocation[product1.originalIndex] = ratio * remainingRatio;
                allocation[product2.originalIndex] = (1 - ratio) * remainingRatio;
            } else if (requiredRate <= product2.clientRate) {
                // 平均分配短期产品
                allocation[product1.originalIndex] = remainingRatio / 2;
                allocation[product2.originalIndex] = remainingRatio / 2;
            } else {
                allocation[product1.originalIndex] = remainingRatio;
            }
        }
    } else {
        // 没有短期产品，使用最短期的
        allocation[sorted[0].originalIndex] = remainingRatio;
    }
    
    let clientRate = 0;
    let bankRate = 0;
    deposits.forEach((p, idx) => {
        const ratio = allocation[idx];
        clientRate += p.clientRate * ratio / 100;
        bankRate += (p.ftpRate - p.clientRate) * ratio / 100;
    });
    
    return {
        feasible: true,
        allocation,
        clientRate,
        bankRate,
        productCount: allocation.filter(a => a > 0).length,
        preference: 'liquidity',
        liquidityScore: enhancedLiquidity,
        description: '流动性优先方案：增加活期和短期存款比例'
    };
}

// 平衡组合存款方案
function generateBalancedDeposit(deposits, sorted, demandIndex, liquidityRatio, requiredRate, targetRate) {
    const allocation = new Array(deposits.length).fill(0);
    allocation[demandIndex] = liquidityRatio;
    
    const remainingRatio = 100 - liquidityRatio;
    
    // 使用3-4个产品分散配置
    const selectedProducts = [];
    
    // 选择短期、中期、长期各一个
    const shortTerm = sorted.find(d => d.name.includes('7天') || d.name.includes('3个月'));
    const midTerm = sorted.find(d => d.name.includes('6个月'));
    const longTerm = sorted.find(d => d.name.includes('1年'));
    
    if (shortTerm) selectedProducts.push(shortTerm);
    if (midTerm) selectedProducts.push(midTerm);
    if (longTerm) selectedProducts.push(longTerm);
    
    if (selectedProducts.length === 0) {
        // 如果没有找到，使用收益率最接近的两个
        for (let i = 0; i < sorted.length - 1; i++) {
            if (requiredRate >= sorted[i].clientRate && requiredRate <= sorted[i + 1].clientRate) {
                selectedProducts.push(sorted[i], sorted[i + 1]);
                break;
            }
        }
    }
    
    if (selectedProducts.length > 0) {
        // 按银行收益率排序
        selectedProducts.sort((a, b) => b.bankRate - a.bankRate);
        
        // 分配比例：优先银行收益高的，但要保证客户收益达标
        let allocatedRatio = 0;
        let achievedRate = deposits[demandIndex].clientRate * liquidityRatio / 100;
        
        for (let i = 0; i < selectedProducts.length - 1; i++) {
            const product = selectedProducts[i];
            const ratio = Math.min(remainingRatio * 0.4, remainingRatio - allocatedRatio - 10);
            
            allocation[product.originalIndex] = ratio;
            allocatedRatio += ratio;
            achievedRate += product.clientRate * ratio / 100;
        }
        
        // 最后一个产品分配剩余比例
        const lastProduct = selectedProducts[selectedProducts.length - 1];
        allocation[lastProduct.originalIndex] = remainingRatio - allocatedRatio;
        
        // 微调以达到目标收益率
        let clientRate = 0;
        deposits.forEach((p, idx) => {
            clientRate += p.clientRate * allocation[idx] / 100;
        });
        
        // 如果收益不达标，调整配置
        if (Math.abs(clientRate - targetRate) > 0.01) {
            // 在最高和最低收益产品间调整
            const highIdx = selectedProducts[selectedProducts.length - 1].originalIndex;
            const lowIdx = selectedProducts[0].originalIndex;
            
            const adjustRatio = ((targetRate - clientRate) / 
                (deposits[highIdx].clientRate - deposits[lowIdx].clientRate)) * 100;
            
            if (allocation[lowIdx] >= Math.abs(adjustRatio)) {
                allocation[highIdx] += adjustRatio;
                allocation[lowIdx] -= adjustRatio;
            }
        }
    }
    
    let clientRate = 0;
    let bankRate = 0;
    deposits.forEach((p, idx) => {
        const ratio = allocation[idx];
        clientRate += p.clientRate * ratio / 100;
        bankRate += (p.ftpRate - p.clientRate) * ratio / 100;
    });
    
    return {
        feasible: true,
        allocation,
        clientRate,
        bankRate,
        productCount: allocation.filter(a => a > 0.01).length,
        preference: 'balance',
        liquidityScore: liquidityRatio,
        description: '平衡组合方案：分散配置多个期限产品'
    };
}

// 生成理财方案
function generateWealthSolutions(wealth, targetRate, preference) {
    const solutions = [];
    
    const sorted = wealth.map((p, index) => ({
        ...p,
        index,
        bankRate: p.commissionRate,
        // 流动性评分：T+1最高，赎回天数越少越高
        liquidityScore: p.name.includes('T+1') ? 100 : 
                       p.name.includes('7天') ? 80 :
                       p.name.includes('14天') ? 60 : 40
    })).sort((a, b) => a.clientRate - b.clientRate);
    
    const minRate = sorted[0].clientRate;
    const maxRate = sorted[sorted.length - 1].clientRate;
    
    if (targetRate < minRate || targetRate > maxRate) {
        return [];
    }
    
    switch (preference) {
        case 'yield':
            // 收益优先：选择高收益理财
            solutions.push(generateYieldFirstWealth(wealth, sorted, targetRate));
            break;
            
        case 'liquidity':
            // 流动性优先：选择T+1和短期理财
            solutions.push(generateLiquidityFirstWealth(wealth, sorted, targetRate));
            break;
            
        case 'balance':
            // 平衡：多个理财产品组合
            solutions.push(generateBalancedWealth(wealth, sorted, targetRate));
            break;
    }
    
    return solutions.filter(s => s && s.feasible);
}

// 收益优先理财方案
function generateYieldFirstWealth(wealth, sorted, targetRate) {
    const allocation = new Array(wealth.length).fill(0);
    
    // 找到能达到目标的最高收益组合
    for (let i = sorted.length - 1; i >= 0; i--) {
        const high = sorted[i];
        
        if (high.clientRate >= targetRate) {
            allocation[high.index] = 100;
            
            return {
                feasible: true,
                allocation,
                clientRate: high.clientRate,
                bankRate: high.bankRate,
                productCount: 1,
                preference: 'yield',
                description: '收益优先方案：选择高收益理财产品'
            };
        }
        
        if (i > 0) {
            const low = sorted[i - 1];
            if (targetRate >= low.clientRate && targetRate <= high.clientRate) {
                const ratio = (targetRate - low.clientRate) / (high.clientRate - low.clientRate);
                const highRatio = ratio * 100;
                const lowRatio = 100 - highRatio;
                
                allocation[high.index] = highRatio;
                allocation[low.index] = lowRatio;
                
                const clientRate = (high.clientRate * highRatio + low.clientRate * lowRatio) / 100;
                const bankRate = (high.bankRate * highRatio + low.bankRate * lowRatio) / 100;
                
                return {
                    feasible: true,
                    allocation,
                    clientRate,
                    bankRate,
                    productCount: 2,
                    preference: 'yield',
                    description: '收益优先方案：高收益理财组合'
                };
            }
        }
    }
    
    return null;
}

// 流动性优先理财方案  
function generateLiquidityFirstWealth(wealth, sorted, targetRate) {
    const allocation = new Array(wealth.length).fill(0);
    
    // 优先T+1和短期理财
    const t1Product = sorted.find(p => p.name.includes('T+1'));
    const shortTermProducts = sorted.filter(p => 
        p.name.includes('7天') || p.name.includes('14天')
    ).sort((a, b) => b.liquidityScore - a.liquidityScore);
    
    if (!t1Product && shortTermProducts.length === 0) {
        // 没有短期产品，使用常规方案
        return generateYieldFirstWealth(wealth, sorted, targetRate);
    }
    
    // 至少50%配置在T+1
    if (t1Product) {
        allocation[t1Product.index] = 50;
        
        // 剩余50%配置在其他产品以达到目标收益
        const requiredRate = (targetRate * 100 - t1Product.clientRate * 50) / 50;
        
        for (let i = 0; i < sorted.length; i++) {
            if (sorted[i].index === t1Product.index) continue;
            
            const product = sorted[i];
            if (product.clientRate >= requiredRate) {
                allocation[product.index] = 50;
                break;
            }
            
            if (i < sorted.length - 1) {
                const next = sorted[i + 1];
                if (next.index !== t1Product.index && 
                    requiredRate >= product.clientRate && 
                    requiredRate <= next.clientRate) {
                    const ratio = (requiredRate - product.clientRate) / 
                                 (next.clientRate - product.clientRate);
                    allocation[next.index] = ratio * 50;
                    allocation[product.index] = (1 - ratio) * 50;
                    break;
                }
            }
        }
    } else {
        // 使用短期产品组合
        if (shortTermProducts.length >= 2) {
            allocation[shortTermProducts[0].index] = 60;
            allocation[shortTermProducts[1].index] = 40;
        } else {
            allocation[shortTermProducts[0].index] = 100;
        }
    }
    
    let clientRate = 0;
    let bankRate = 0;
    wealth.forEach((p, idx) => {
        const ratio = allocation[idx];
        clientRate += p.clientRate * ratio / 100;
        bankRate += p.commissionRate * ratio / 100;
    });
    
    return {
        feasible: true,
        allocation,
        clientRate,
        bankRate,
        productCount: allocation.filter(a => a > 0).length,
        preference: 'liquidity',
        description: '流动性优先方案：T+1和短期理财为主'
    };
}

// 平衡理财方案
function generateBalancedWealth(wealth, sorted, targetRate) {
    const allocation = new Array(wealth.length).fill(0);
    
    // 选择3个产品分散配置
    const lowIdx = 0;
    const midIdx = Math.floor(sorted.length / 2);
    const highIdx = sorted.length - 1;
    
    // 初始平均分配
    allocation[sorted[lowIdx].index] = 25;
    allocation[sorted[midIdx].index] = 35;
    allocation[sorted[highIdx].index] = 40;
    
    // 调整以达到目标收益率
    let clientRate = 0;
    wealth.forEach((p, idx) => {
        clientRate += p.clientRate * allocation[idx] / 100;
    });
    
    if (Math.abs(clientRate - targetRate) > 0.01) {
        // 在高低收益产品间微调
        const adjustRatio = ((targetRate - clientRate) / 
            (sorted[highIdx].clientRate - sorted[lowIdx].clientRate)) * 100;
        
        if (allocation[sorted[lowIdx].index] >= Math.abs(adjustRatio)) {
            allocation[sorted[highIdx].index] += adjustRatio;
            allocation[sorted[lowIdx].index] -= adjustRatio;
        }
    }
    
    clientRate = 0;
    let bankRate = 0;
    wealth.forEach((p, idx) => {
        const ratio = allocation[idx];
        clientRate += p.clientRate * ratio / 100;
        bankRate += p.commissionRate * ratio / 100;
    });
    
    return {
        feasible: true,
        allocation,
        clientRate,
        bankRate,
        productCount: 3,
        preference: 'balance',
        description: '平衡组合方案：分散配置多个理财产品'
    };
}

// 生成混合方案（存款+理财）
function generateMixedSolutions(config, targetRate, liquidityRatio, preference) {
    const solutions = [];
    
    // 找到活期存款
    const demandDeposit = config.deposits.find(d => d.name.includes('活期'));
    if (!demandDeposit) {
        throw new Error('未找到活期存款产品');
    }
    
    const allProducts = [
        ...config.deposits.map(p => ({ 
            ...p, 
            type: 'deposit', 
            bankRate: p.ftpRate - p.clientRate,
            liquidityScore: p.name.includes('活期') ? 100 : 
                           p.name.includes('7天') ? 80 :
                           p.name.includes('3个月') ? 60 : 
                           p.name.includes('6个月') ? 40 : 30
        })),
        ...config.wealth.map(p => ({ 
            ...p, 
            type: 'wealth', 
            bankRate: p.commissionRate,
            liquidityScore: p.name.includes('T+1') ? 90 :
                           p.name.includes('7天') ? 70 :
                           p.name.includes('14天') ? 50 : 30
        }))
    ];
    
    switch (preference) {
        case 'yield':
            solutions.push(generateYieldFirstMixed(allProducts, demandDeposit, liquidityRatio, targetRate));
            break;
            
        case 'liquidity':
            solutions.push(generateLiquidityFirstMixed(allProducts, demandDeposit, liquidityRatio, targetRate));
            break;
            
        case 'balance':
            solutions.push(generateBalancedMixed(allProducts, demandDeposit, liquidityRatio, targetRate));
            break;
    }
    
    return solutions.filter(s => s && s.feasible);
}

// 收益优先混合方案
function generateYieldFirstMixed(allProducts, demandDeposit, liquidityRatio, targetRate) {
    const allocations = [];
    
    // 活期仅保底
    allocations.push({
        product: demandDeposit,
        ratio: liquidityRatio
    });
    
    const remainingRatio = 100 - liquidityRatio;
    const requiredRate = (targetRate * 100 - demandDeposit.clientRate * liquidityRatio) / remainingRatio;
    
    // 从所有产品中选择最高收益的组合
    const otherProducts = allProducts.filter(p => p.name !== demandDeposit.name)
        .sort((a, b) => b.clientRate - a.clientRate);
    
    // 尝试单一高收益产品
    for (let product of otherProducts) {
        if (product.clientRate >= requiredRate) {
            allocations.push({
                product,
                ratio: remainingRatio
            });
            
            return createMixedSolutionFromAllocations(allProducts, allocations, 'yield', 
                '收益优先方案：选择最高收益产品', liquidityRatio);
        }
    }
    
    // 尝试两个产品组合
    for (let i = 0; i < otherProducts.length - 1; i++) {
        const high = otherProducts[i];
        const low = otherProducts[i + 1];
        
        if (requiredRate >= low.clientRate && requiredRate <= high.clientRate) {
            const ratio = (requiredRate - low.clientRate) / (high.clientRate - low.clientRate);
            
            allocations.push({
                product: high,
                ratio: ratio * remainingRatio
            });
            allocations.push({
                product: low,
                ratio: (1 - ratio) * remainingRatio
            });
            
            return createMixedSolutionFromAllocations(allProducts, allocations, 'yield',
                '收益优先方案：高收益产品组合', liquidityRatio);
        }
    }
    
    return null;
}

// 流动性优先混合方案
function generateLiquidityFirstMixed(allProducts, demandDeposit, liquidityRatio, targetRate) {
    const allocations = [];
    
    // 增加活期比例
    const enhancedLiquidity = Math.max(liquidityRatio, Math.min(35, liquidityRatio + 15));
    allocations.push({
        product: demandDeposit,
        ratio: enhancedLiquidity
    });
    
    const remainingRatio = 100 - enhancedLiquidity;
    const requiredRate = (targetRate * 100 - demandDeposit.clientRate * enhancedLiquidity) / remainingRatio;
    
    // 优先选择高流动性产品
    const liquidProducts = allProducts
        .filter(p => p.name !== demandDeposit.name)
        .sort((a, b) => b.liquidityScore - a.liquidityScore || b.clientRate - a.clientRate);
    
    // 选择流动性最高的产品
    const t1Wealth = liquidProducts.find(p => p.type === 'wealth' && p.name.includes('T+1'));
    const shortDeposit = liquidProducts.find(p => p.type === 'deposit' && p.name.includes('7天'));
    
    if (t1Wealth && shortDeposit) {
        // T+1理财 + 7天通知
        const t1Ratio = remainingRatio * 0.6;
        const depositRatio = remainingRatio * 0.4;
        
        allocations.push({
            product: t1Wealth,
            ratio: t1Ratio
        });
        allocations.push({
            product: shortDeposit,
            ratio: depositRatio
        });
    } else if (t1Wealth) {
        // 主要配置T+1
        allocations.push({
            product: t1Wealth,
            ratio: remainingRatio * 0.7
        });
        
        // 剩余配置其他产品
        const otherProduct = liquidProducts.find(p => p !== t1Wealth);
        if (otherProduct) {
            allocations.push({
                product: otherProduct,
                ratio: remainingRatio * 0.3
            });
        }
    } else {
        // 使用流动性最高的两个产品
        if (liquidProducts.length >= 2) {
            allocations.push({
                product: liquidProducts[0],
                ratio: remainingRatio * 0.6
            });
            allocations.push({
                product: liquidProducts[1],
                ratio: remainingRatio * 0.4
            });
        } else if (liquidProducts.length > 0) {
            allocations.push({
                product: liquidProducts[0],
                ratio: remainingRatio
            });
        }
    }
    
    return createMixedSolutionFromAllocations(allProducts, allocations, 'liquidity',
        '流动性优先方案：高比例活期+短期产品', enhancedLiquidity);
}

// 平衡混合方案
function generateBalancedMixed(allProducts, demandDeposit, liquidityRatio, targetRate) {
    const allocations = [];
    
    // 活期保持合理比例
    const balancedLiquidity = Math.max(liquidityRatio, 15);
    allocations.push({
        product: demandDeposit,
        ratio: balancedLiquidity
    });
    
    const remainingRatio = 100 - balancedLiquidity;
    
    // 选择存款和理财各一到两个产品
    const deposits = allProducts.filter(p => p.type === 'deposit' && p.name !== demandDeposit.name)
        .sort((a, b) => b.bankRate - a.bankRate);
    const wealth = allProducts.filter(p => p.type === 'wealth')
        .sort((a, b) => b.bankRate - a.bankRate);
    
    // 存款和理财各50%
    const depositRatio = remainingRatio * 0.5;
    const wealthRatio = remainingRatio * 0.5;
    
    // 选择一个中期存款
    const midTermDeposit = deposits.find(d => d.name.includes('3个月') || d.name.includes('6个月')) || deposits[0];
    if (midTermDeposit) {
        allocations.push({
            product: midTermDeposit,
            ratio: depositRatio
        });
    }
    
    // 选择一个理财产品
    const balancedWealth = wealth.find(w => w.name.includes('7天') || w.name.includes('14天')) || wealth[0];
    if (balancedWealth) {
        allocations.push({
            product: balancedWealth,
            ratio: wealthRatio
        });
    }
    
    return createMixedSolutionFromAllocations(allProducts, allocations, 'balance',
        '平衡组合方案：活期+存款+理财均衡配置', balancedLiquidity);
}

// 从配置创建混合方案
function createMixedSolutionFromAllocations(allProducts, allocations, preference, description, liquidityScore) {
    let clientRate = 0;
    let bankRate = 0;
    
    allocations.forEach(({ product, ratio }) => {
        clientRate += product.clientRate * ratio / 100;
        bankRate += product.bankRate * ratio / 100;
    });
    
    return {
        feasible: true,
        allocations: allocations.filter(a => a.ratio > 0.01),
        clientRate,
        bankRate,
        allProducts,
        productCount: allocations.filter(a => a.ratio > 0.01).length,
        preference,
        description,
        liquidityScore: liquidityScore || allocations.find(a => a.product.name.includes('活期'))?.ratio || 0
    };
}

// 优化混合配置（存款+理财）
function optimizeMixedAllocation(config, targetRate) {
    const allProducts = [
        ...config.deposits.map(p => ({ ...p, type: 'deposit', bankRate: p.ftpRate - p.clientRate })),
        ...config.wealth.map(p => ({ ...p, type: 'wealth', bankRate: p.commissionRate }))
    ];

    // 按银行收益率从高到低排序
    const sortedByBank = [...allProducts].sort((a, b) => b.bankRate - a.bankRate);
    
    const minRate = Math.min(...allProducts.map(p => p.clientRate));
    const maxRate = Math.max(...allProducts.map(p => p.clientRate));

    if (targetRate < minRate || targetRate > maxRate) {
        return { feasible: false };
    }

    // 尝试使用线性规划的简化版本
    let bestSolution = null;
    let maxBankRate = -1;

    // 尝试所有两两组合
    for (let i = 0; i < allProducts.length; i++) {
        for (let j = i; j < allProducts.length; j++) {
            const p1 = allProducts[i];
            const p2 = allProducts[j];

            if (i === j) {
                // 单一产品
                if (Math.abs(p1.clientRate - targetRate) < 0.001) {
                    const solution = createMixedSolution(allProducts, [{ product: p1, ratio: 100 }]);
                    if (solution.bankRate > maxBankRate) {
                        maxBankRate = solution.bankRate;
                        bestSolution = solution;
                    }
                }
            } else {
                // 两个产品组合
                if ((targetRate >= Math.min(p1.clientRate, p2.clientRate) && 
                     targetRate <= Math.max(p1.clientRate, p2.clientRate)) ||
                    Math.abs(p1.clientRate - p2.clientRate) < 0.001) {
                    
                    const ratio = p1.clientRate === p2.clientRate ? 
                        0.5 : 
                        (targetRate - p1.clientRate) / (p2.clientRate - p1.clientRate);
                    
                    if (ratio >= 0 && ratio <= 1) {
                        const r2 = ratio * 100;
                        const r1 = 100 - r2;
                        
                        const solution = createMixedSolution(allProducts, [
                            { product: p1, ratio: r1 },
                            { product: p2, ratio: r2 }
                        ]);
                        
                        if (Math.abs(solution.clientRate - targetRate) < 0.01 && 
                            solution.bankRate > maxBankRate) {
                            maxBankRate = solution.bankRate;
                            bestSolution = solution;
                        }
                    }
                }
            }
        }
    }

    if (bestSolution) {
        return { feasible: true, ...bestSolution, allProducts };
    }

    return { feasible: false };
}

// 获取最大可达收益率
function getMaxRate(config, allocationType) {
    switch (allocationType) {
        case 'deposit':
            return Math.max(...config.deposits.map(p => p.clientRate));
        case 'wealth':
            return Math.max(...config.wealth.map(p => p.clientRate));
        case 'mixed':
            return Math.max(
                ...config.deposits.map(p => p.clientRate),
                ...config.wealth.map(p => p.clientRate)
            );
    }
}

// 显示多个结果方案
function showMultipleResults(solutions, amount, allocationType) {
    document.getElementById('errorSection').style.display = 'none';
    const resultSection = document.getElementById('resultSection');
    resultSection.style.display = 'block';
    resultSection.innerHTML = '';

    solutions.forEach((solution, index) => {
        const solutionDiv = document.createElement('div');
        solutionDiv.className = 'solution-card';
        
        const bankProfit = amount * solution.bankRate / 100;
        
        // 倾向标签
        let preferenceBadge = '';
        if (solution.preference === 'yield') {
            preferenceBadge = '<span class="preference-badge yield">收益优先</span>';
        } else if (solution.preference === 'liquidity') {
            preferenceBadge = '<span class="preference-badge liquidity">流动性优先</span>';
        } else if (solution.preference === 'balance') {
            preferenceBadge = '<span class="preference-badge balance">平衡组合</span>';
        }
        
        // 对于自定义配置，显示详细的产品信息
        let productDetailsHTML = '';
        let totalAmount = amount;
        let totalProfit = 0;
        
        if (solution.allocations) {
            // 混合配置
            const productItems = solution.allocations
                .filter(({ ratio }) => ratio > 0.01)
                .map(({ product, ratio }) => {
                    const typeLabel = product.type === 'deposit' ? '存款' : '理财';
                    const rate = product.type === 'deposit' ? product.clientRate : product.clientRate;
                    const productAmount = amount * ratio / 100;
                    const profit = productAmount * rate / 100;
                    totalProfit += profit;
                    return `
                        <div class="product-detail-item">
                            <div class="product-info">
                                <span class="product-type">${typeLabel}</span>
                                <span class="product-name">${product.name}</span>
                            </div>
                            <div class="product-metrics">
                                <span class="product-ratio">${ratio.toFixed(1)}%</span>
                                <span class="product-amount">${productAmount.toFixed(2)}</span>
                                <span class="product-rate">${rate.toFixed(2)}%</span>
                                <span class="product-profit">${profit.toFixed(2)}</span>
                            </div>
                        </div>
                    `;
                }).join('');
            
            productDetailsHTML = productItems;
        } else if (solution.allocation) {
            // 单一类型配置
            const config = getConfig();
            const products = allocationType === 'deposit' ? config.deposits : config.wealth;
            const productItems = solution.allocation
                .map((ratio, idx) => {
                    if (ratio > 0.01) {
                        const product = products[idx];
                        const rate = allocationType === 'deposit' ? product.clientRate : product.clientRate;
                        const typeLabel = allocationType === 'deposit' ? '存款' : '理财';
                        const productAmount = amount * ratio / 100;
                        const profit = productAmount * rate / 100;
                        totalProfit += profit;
                        return `
                            <div class="product-detail-item">
                                <div class="product-info">
                                    <span class="product-type">${typeLabel}</span>
                                    <span class="product-name">${product.name}</span>
                                </div>
                                <div class="product-metrics">
                                    <span class="product-ratio">${ratio.toFixed(1)}%</span>
                                    <span class="product-amount">${productAmount.toFixed(2)}</span>
                                    <span class="product-rate">${rate.toFixed(2)}%</span>
                                    <span class="product-profit">${profit.toFixed(2)}</span>
                                </div>
                            </div>
                        `;
                    }
                    return '';
                })
                .filter(html => html)
                .join('');
            
            productDetailsHTML = productItems;
        }
        
        const summaryItems = solution.isCustom ? `
            <div class="summary-item highlight">
                <span class="label">配置总金额：</span>
                <span class="value">${amount.toFixed(2)} 万元</span>
            </div>
            <div class="summary-item">
                <span class="label">使用产品数量：</span>
                <span class="value">${solution.allocations ? solution.allocations.filter(a => a.ratio > 0.01).length : (solution.allocation ? solution.allocation.filter(r => r > 0.01).length : 0)} 个</span>
            </div>
            ${productDetailsHTML ? `
            <div class="product-details-section">
                <div class="product-details-header">
                    <span class="header-label">产品明细</span>
                    <div class="header-metrics">
                        <span class="header-ratio">比例</span>
                        <span class="header-amount">配置金额</span>
                        <span class="header-rate">收益率</span>
                        <span class="header-profit">收益</span>
                    </div>
                </div>
                ${productDetailsHTML}
                <div class="product-detail-item total-row">
                    <div class="product-info">
                        <span class="product-type-summary">汇总</span>
                    </div>
                    <div class="product-metrics">
                        <span class="product-ratio-empty"></span>
                        <span class="product-amount">${totalAmount.toFixed(2)}</span>
                        <span class="product-rate">${solution.clientRate.toFixed(2)}%</span>
                        <span class="product-profit">${totalProfit.toFixed(2)}</span>
                    </div>
                </div>
            </div>
            ` : ''}
        ` : `
            <div class="summary-item">
                <span class="label">客户综合收益率：</span>
                <span class="value">${solution.clientRate.toFixed(2)}%</span>
            </div>
            <div class="summary-item">
                <span class="label">银行综合收益率：</span>
                <span class="value">${solution.bankRate.toFixed(2)}%</span>
            </div>
            <div class="summary-item">
                <span class="label">银行总收益：</span>
                <span class="value">${bankProfit.toFixed(2)} 万元</span>
            </div>
            <div class="summary-item">
                <span class="label">使用产品数量：</span>
                <span class="value">${solution.productCount || 2} 个</span>
            </div>
            ${solution.liquidityScore !== undefined ? `
            <div class="summary-item">
                <span class="label">流动性评分：</span>
                <span class="value">${solution.liquidityScore.toFixed(0)}分</span>
            </div>
            ` : ''}
        `;
        
        solutionDiv.innerHTML = `
            <div class="solution-header">
                <h2 class="solution-title">推荐方案</h2>
                <div class="header-actions">
                    ${preferenceBadge}
                    <button class="btn-collapse" onclick="toggleSolutionCollapse(${index})" title="折叠/展开">
                        ▼
                    </button>
                </div>
            </div>
            
            <div class="solution-content" id="solution_content_${index}">
                ${solution.description ? `<div class="solution-description">${solution.description}</div>` : ''}
                
                <div class="summary">
                    ${summaryItems}
                </div>
                
                <div class="action-buttons">
                    ${solution.isCustom ? '<button class="btn-primary" onclick="saveCustomScheme()">💾 保存为方案</button>' : ''}
                    <button class="btn-secondary" onclick="exportSchemeAsImage(${index})">📷 导出为图片</button>
                    <button class="btn-secondary" onclick="exportSchemeAsExcel(${index})">📊 导出为Excel</button>
                </div>
            </div>
        `;
        
        // 为导出功能存储方案数据
        solutionDiv.setAttribute('data-solution', JSON.stringify({
            ...solution,
            amount: amount,
            allocationType: allocationType
        }));
        
        resultSection.appendChild(solutionDiv);
    });

    // 滚动到结果区域
    resultSection.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

// 显示结果（单个结果或自定义结果）
function showResult(result, amount, allocationType) {
    showMultipleResults([result], amount, allocationType);
}

// 显示错误
function showError(message) {
    document.getElementById('resultSection').style.display = 'none';
    const errorSection = document.getElementById('errorSection');
    errorSection.style.display = 'block';
    document.getElementById('errorMessage').textContent = message;
    errorSection.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

// 切换流动性字段显示
function toggleLiquidityField() {
    const allocationType = document.querySelector('input[name="allocationType"]:checked').value;
    const liquidityField = document.getElementById('liquidityField');
    
    if (allocationType === 'wealth') {
        liquidityField.style.display = 'none';
    } else {
        liquidityField.style.display = 'block';
    }
}

// 切换模式
function switchMode(mode) {
    const bankMode = document.getElementById('bankMode');
    const autoMode = document.getElementById('autoMode');
    const customMode = document.getElementById('customMode');
    const tabs = document.querySelectorAll('.tab-button');
    
    tabs.forEach(tab => tab.classList.remove('active'));
    
    // 隐藏所有模式
    bankMode.style.display = 'none';
    autoMode.style.display = 'none';
    customMode.style.display = 'none';
    
    if (mode === 'bank') {
        bankMode.style.display = 'block';
        tabs[0].classList.add('active');
    } else if (mode === 'custom') {
        customMode.style.display = 'block';
        tabs[1].classList.add('active');
        renderCustomProducts();
        // 加载已保存的方案
        loadSavedSchemes();
    } else if (mode === 'auto') {
        autoMode.style.display = 'block';
        tabs[2].classList.add('active');
        toggleLiquidityField();
    }
    
    // 隐藏结果
    document.getElementById('results').innerHTML = '';
    document.getElementById('resultSection').style.display = 'none';
    document.getElementById('errorSection').style.display = 'none';
}

// 渲染自定义产品列表
function renderCustomProducts() {
    const type = document.querySelector('input[name="customType"]:checked').value;
    const config = getConfig();
    const container = document.getElementById('customProductsList');
    
    container.innerHTML = '<h3>设置各产品比例</h3><p style="color: #666; font-size: 14px; margin-bottom: 15px;">💡 取消勾选可排除不需要的产品</p>';
    
    if (type === 'deposit' || type === 'mixed') {
        container.innerHTML += '<h4 class="product-section-title">存款产品</h4>';
        config.deposits.forEach((product, index) => {
            container.innerHTML += `
                <div class="custom-product-item" id="item_deposit_${index}">
                    <label class="product-checkbox">
                        <input type="checkbox" id="enable_deposit_${index}" checked 
                               onchange="toggleProduct('deposit', ${index})">
                    </label>
                    <span class="product-name">${product.name}</span>
                    <span class="product-rate">收益率: ${product.clientRate}%</span>
                    <div class="ratio-input-group">
                        <button class="btn-ratio-adjust-small" onclick="adjustCustomRatio('deposit_${index}', -5)">-</button>
                        <input type="number" id="deposit_${index}" 
                               min="0" max="100" step="5" value="0" 
                               oninput="updateTotalRatio()">
                        <span style="margin-left: 5px;">%</span>
                        <button class="btn-ratio-adjust-small" onclick="adjustCustomRatio('deposit_${index}', 5)">+</button>
                    </div>
                </div>
            `;
        });
    }
    
    if (type === 'wealth' || type === 'mixed') {
        container.innerHTML += '<h4 class="product-section-title">理财产品</h4>';
        config.wealth.forEach((product, index) => {
            container.innerHTML += `
                <div class="custom-product-item" id="item_wealth_${index}">
                    <label class="product-checkbox">
                        <input type="checkbox" id="enable_wealth_${index}" checked 
                               onchange="toggleProduct('wealth', ${index})">
                    </label>
                    <span class="product-name">${product.name}</span>
                    <span class="product-rate">收益率: ${product.clientRate}%</span>
                    <div class="ratio-input-group">
                        <button class="btn-ratio-adjust-small" onclick="adjustCustomRatio('wealth_${index}', -5)">-</button>
                        <input type="number" id="wealth_${index}" 
                               min="0" max="100" step="5" value="0" 
                               oninput="updateTotalRatio()">
                        <span style="margin-left: 5px;">%</span>
                        <button class="btn-ratio-adjust-small" onclick="adjustCustomRatio('wealth_${index}', 5)">+</button>
                    </div>
                </div>
            `;
        });
    }
    
    updateTotalRatio();
}

// 切换产品启用/禁用状态
function toggleProduct(type, index) {
    const enableCheckbox = document.getElementById(`enable_${type}_${index}`);
    const ratioInput = document.getElementById(`${type}_${index}`);
    const itemDiv = document.getElementById(`item_${type}_${index}`);
    
    if (enableCheckbox.checked) {
        // 启用产品
        itemDiv.classList.remove('disabled-product');
        ratioInput.disabled = false;
    } else {
        // 禁用产品
        itemDiv.classList.add('disabled-product');
        ratioInput.value = 0;
        ratioInput.disabled = true;
    }
    
    updateTotalRatio();
}

// 清空产品比例
function clearProductRatio(type, index) {
    const ratioInput = document.getElementById(`${type}_${index}`);
    if (ratioInput) {
        ratioInput.value = 0;
        updateTotalRatio();
    }
}

// 清空推演建议中的产品比例
function clearSuggestionRatio(index) {
    const ratioInput = document.getElementById(`suggest_ratio_${index}`);
    if (ratioInput) {
        ratioInput.value = 0;
        updateSuggestionRatio();
    }
}

// 调整推荐比例（新增功能）
function adjustSuggestionRatio(index, amount) {
    const ratioInput = document.getElementById(`suggest_ratio_${index}`);
    if (ratioInput) {
        let currentValue = parseFloat(ratioInput.value) || 0;
        let newValue = currentValue + amount;
        
        // 限制在 0-100 范围内
        newValue = Math.max(0, Math.min(100, newValue));
        
        // 检查总比例不超过100%
        const { fixed, suggested } = window.currentSuggestion;
        let totalRatio = 0;
        fixed.forEach(item => {
            totalRatio += item.ratio;
        });
        suggested.forEach((item, idx) => {
            if (idx !== index) {
                const otherInput = document.getElementById(`suggest_ratio_${idx}`);
                if (otherInput) {
                    totalRatio += parseFloat(otherInput.value) || 0;
                }
            }
        });
        
        // 如果增加后会超过100%，则调整为最大可用值
        if (totalRatio + newValue > 100) {
            newValue = 100 - totalRatio;
        }
        
        ratioInput.value = newValue;
        updateSuggestionRatio();
    }
}

// 更新总比例和综合收益率
function updateTotalRatio() {
    const type = document.querySelector('input[name="customType"]:checked').value;
    const config = getConfig();
    let total = 0;
    let weightedRate = 0;
    
    if (type === 'deposit' || type === 'mixed') {
        config.deposits.forEach((product, index) => {
            const enableCheckbox = document.getElementById(`enable_deposit_${index}`);
            const input = document.getElementById(`deposit_${index}`);
            // 只计算已启用的产品
            if (input && enableCheckbox && enableCheckbox.checked) {
                const ratio = parseFloat(input.value) || 0;
                total += ratio;
                weightedRate += ratio * product.clientRate / 100;
            }
        });
    }
    
    if (type === 'wealth' || type === 'mixed') {
        config.wealth.forEach((product, index) => {
            const enableCheckbox = document.getElementById(`enable_wealth_${index}`);
            const input = document.getElementById(`wealth_${index}`);
            // 只计算已启用的产品
            if (input && enableCheckbox && enableCheckbox.checked) {
                const ratio = parseFloat(input.value) || 0;
                total += ratio;
                weightedRate += ratio * product.clientRate / 100;
            }
        });
    }
    
    // 如果总比例超过100%，限制所有输入框
    const exceedsLimit = total > 100;
    if (type === 'deposit' || type === 'mixed') {
        config.deposits.forEach((product, index) => {
            const input = document.getElementById(`deposit_${index}`);
            if (input && !input.disabled) {
                const currentVal = parseFloat(input.value) || 0;
                const otherTotal = total - currentVal;
                input.max = exceedsLimit ? currentVal : (100 - otherTotal);
            }
        });
    }
    if (type === 'wealth' || type === 'mixed') {
        config.wealth.forEach((product, index) => {
            const input = document.getElementById(`wealth_${index}`);
            if (input && !input.disabled) {
                const currentVal = parseFloat(input.value) || 0;
                const otherTotal = total - currentVal;
                input.max = exceedsLimit ? currentVal : (100 - otherTotal);
            }
        });
    }
    
    // 更新总比例
    const totalRatioElement = document.getElementById('totalRatio');
    totalRatioElement.textContent = total.toFixed(2) + '%';
    
    totalRatioElement.classList.remove('valid', 'invalid');
    if (Math.abs(total - 100) < 0.01) {
        totalRatioElement.classList.add('valid');
    } else if (total > 0) {
        totalRatioElement.classList.add('invalid');
    }
    
    // 更新综合收益率
    const currentRateElement = document.getElementById('currentRate');
    if (currentRateElement) {
        currentRateElement.textContent = weightedRate.toFixed(2) + '%';
        
        // 如果开启了自动推演，显示推演建议
        const autoInfer = document.getElementById('autoInfer');
        if (autoInfer && autoInfer.checked && total > 0 && total < 100) {
            // 延迟触发推演建议
            clearTimeout(updateTotalRatio.timer);
            updateTotalRatio.timer = setTimeout(() => {
                showInferenceSuggestion();
            }, 800);
        } else if (total >= 100) {
            document.getElementById('inferenceStatus').innerHTML = '';
        }
    }
}

// 自定义配置计算
function calculateCustom() {
    const type = document.querySelector('input[name="customType"]:checked').value;
    const amount = parseFloat(document.getElementById('customAmount').value);
    const config = getConfig();
    
    if (!amount || amount <= 0) {
        showError('请输入有效的资金金额');
        return;
    }
    
    let total = 0;
    const allocations = [];
    
    // 收集所有产品的配置
    if (type === 'deposit' || type === 'mixed') {
        config.deposits.forEach((product, index) => {
            const enableCheckbox = document.getElementById(`enable_deposit_${index}`);
            const input = document.getElementById(`deposit_${index}`);
            const ratio = parseFloat(input.value) || 0;
            // 只考虑已启用的产品
            if (enableCheckbox && enableCheckbox.checked && ratio > 0) {
                allocations.push({
                    product: { ...product, type: 'deposit', bankRate: product.ftpRate - product.clientRate },
                    ratio
                });
                total += ratio;
            }
        });
    }
    
    if (type === 'wealth' || type === 'mixed') {
        config.wealth.forEach((product, index) => {
            const enableCheckbox = document.getElementById(`enable_wealth_${index}`);
            const input = document.getElementById(`wealth_${index}`);
            const ratio = parseFloat(input.value) || 0;
            // 只考虑已启用的产品
            if (enableCheckbox && enableCheckbox.checked && ratio > 0) {
                allocations.push({
                    product: { ...product, type: 'wealth', bankRate: product.commissionRate },
                    ratio
                });
                total += ratio;
            }
        });
    }
    
    // 验证总比例
    if (Math.abs(total - 100) > 0.01) {
        showError(`产品比例总和必须为100%，当前为${total.toFixed(2)}%`);
        return;
    }
    
    if (allocations.length === 0) {
        showError('请至少配置一个产品');
        return;
    }
    
    // 计算收益
    let clientRate = 0;
    let bankRate = 0;
    
    allocations.forEach(({ product, ratio }) => {
        clientRate += product.clientRate * ratio / 100;
        bankRate += product.bankRate * ratio / 100;
    });
    
    const result = {
        feasible: true,
        allocations,
        clientRate,
        bankRate,
        isCustom: true
    };
    
    showResult(result, amount, type);
}

// 银行推荐方案相关功能
function loadBankSchemes() {
    const schemes = localStorage.getItem('bankSchemes');
    if (!schemes) return;
    
    const schemesList = JSON.parse(schemes);
    const enabledSchemes = schemesList.filter(s => s.enabled);
    
    const container = document.getElementById('presetSchemes');
    container.innerHTML = '';
    
    if (enabledSchemes.length === 0) {
        container.innerHTML = '<p style="color: #999;">暂无可用的推荐方案，请前往<a href="schemes-admin.html">方案管理</a>中配置</p>';
        return;
    }
    
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
    
    enabledSchemes.forEach(scheme => {
        const schemeCard = document.createElement('div');
        schemeCard.className = 'scheme-card';
        schemeCard.innerHTML = `
            <div class="scheme-card-header">
                <h3>${scheme.name}</h3>
                <span class="preference-badge ${scheme.preference}">${preferenceLabels[scheme.preference]}</span>
            </div>
            <p class="scheme-description">${scheme.description}</p>
            <div class="scheme-meta">
                <span>类型：${typeLabels[scheme.type]}</span>
                <span>产品数：${scheme.products.length}个</span>
            </div>
            <button class="btn-primary" onclick="selectScheme(${scheme.id}, this)">查看详情</button>
        `;
        container.appendChild(schemeCard);
    });
}

function selectScheme(schemeId, buttonElement) {
    const schemes = JSON.parse(localStorage.getItem('bankSchemes'));
    const scheme = schemes.find(s => s.id === schemeId);
    
    if (!scheme) return;
    
    // 清除其他方案的详情展示
    document.querySelectorAll('.scheme-detail-result').forEach(el => el.remove());
    
    // 显示方案详情并计算结果
    const config = getConfig();
    const amountInput = parseFloat(document.getElementById('bankAmount').value);
    const amount = amountInput || 1000; // 万元
    
    let resultHTML = `
        <div class="solution-card">
            <div class="solution-header">
                <h3>${scheme.name}</h3>
                <span class="preference-badge ${scheme.preference}">${{liquidity: '流动性优先', yield: '收益优先', balance: '平衡组合'}[scheme.preference]}</span>
            </div>
            <p style="margin: 15px 0; color: #666;">${scheme.description}</p>
            <h4>产品配置：</h4>
            <div class="products-list">
    `;
    
    let totalClientRate = 0;
    
    scheme.products.forEach(product => {
        const productAmount = amount * (product.ratio / 100);
        
        // 查找产品配置数据
        let productData = null;
        
        productData = config.deposits.find(p => p.name === product.name);
        if (!productData) {
            productData = config.wealth.find(p => p.name === product.name);
        }
        
        if (!productData) {
            console.log('未找到产品数据:', product.name);
            return;
        }
        
        const clientEarning = productAmount * productData.clientRate / 100;
        totalClientRate += product.ratio * productData.clientRate / 100;
        
        resultHTML += `
            <div class="product-row">
                <div class="product-info">
                    <span class="product-name">${product.name}</span>
                    <span class="product-ratio">${product.ratio}%</span>
                </div>
                <div class="product-details">
                    <span>金额：${productAmount.toFixed(2)}万元</span>
                    <span>客户年化：${productData.clientRate}%</span>
                    <span>客户年收益：${clientEarning.toFixed(4)}万元</span>
                </div>
            </div>
        `;
    });
    
    resultHTML += `
            </div>
            <div class="total-summary">
                <div class="summary-row">
                    <span>总资金</span>
                    <span>${amount.toFixed(2)}万元</span>
                </div>
                <div class="summary-row">
                    <span>综合年化收益率</span>
                    <span class="highlight">${totalClientRate.toFixed(2)}%</span>
                </div>
                <div class="summary-row">
                    <span>客户年收益</span>
                    <span>${(amount * totalClientRate / 100).toFixed(4)}万元</span>
                </div>
            </div>
            <div class="action-buttons" style="display: flex; gap: 10px; margin-top: 20px; justify-content: center; flex-wrap: wrap;">
                <button class="btn-secondary" onclick="exportBankSchemeAsImage('${scheme.name}')">📷 导出为图片</button>
                <button class="btn-secondary" onclick="exportBankSchemeAsExcel('${scheme.name}')">📊 导出为Excel</button>
            </div>
        </div>
    `;
    
    // 创建详情div
    const detailDiv = document.createElement('div');
    detailDiv.className = 'card scheme-detail-result';
    detailDiv.innerHTML = resultHTML;
    
    // 添加数据属性供导出使用
    const solutionCard = detailDiv.querySelector('.solution-card');
    if (solutionCard) {
        // 准备导出数据
        const exportData = {
            name: scheme.name,
            description: scheme.description,
            preference: scheme.preference,
            amount: amount,
            clientRate: totalClientRate,
            products: scheme.products.map(product => {
                let productData = config.deposits.find(p => p.name === product.name);
                if (!productData) {
                    productData = config.wealth.find(p => p.name === product.name);
                }
                return {
                    name: product.name,
                    ratio: product.ratio,
                    rate: productData ? productData.clientRate : 0,
                    type: config.deposits.find(p => p.name === product.name) ? '存款' : '理财'
                };
            })
        };
        solutionCard.setAttribute('data-solution', JSON.stringify(exportData));
    }
    
    // 找到当前方案卡片，将详情插入到它下方
    if (buttonElement) {
        const currentSchemeCard = buttonElement.closest('.scheme-card');
        if (currentSchemeCard) {
            // 插入到当前方案卡片的下一个兄弟节点之前
            currentSchemeCard.parentNode.insertBefore(detailDiv, currentSchemeCard.nextSibling);
            // 滚动到详情位置
            detailDiv.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
            return;
        }
    }
    
    // 如果找不到卡片（不应该发生），降级到原有方式
    document.getElementById('results').innerHTML = resultHTML;
}

// 自定义配置相关功能
function toggleAutoInfer() {
    const checked = document.getElementById('autoInfer').checked;
    document.getElementById('targetRateField').style.display = checked ? 'block' : 'none';
    
    if (!checked) {
        document.getElementById('inferenceStatus').innerHTML = '';
    } else {
        // 开启时立即显示建议
        updateTotalRatio();
    }
}

// 显示推演建议（不自动填充）
function showInferenceSuggestion() {
    const targetRate = parseFloat(document.getElementById('customTargetRate').value);
    if (!targetRate || targetRate <= 0) {
        document.getElementById('inferenceStatus').innerHTML = '<p style="color: #ff6b6b;">请先输入目标收益率</p>';
        return;
    }
    
    const type = document.querySelector('input[name="customType"]:checked').value;
    const config = getConfig();
    
    // 收集已输入的产品和比例
    const fixedProducts = [];
    let fixedRatio = 0;
    let fixedWeightedRate = 0;
    
    if (type === 'deposit' || type === 'mixed') {
        config.deposits.forEach((product, index) => {
            const enableCheckbox = document.getElementById(`enable_deposit_${index}`);
            const input = document.getElementById(`deposit_${index}`);
            const ratio = parseFloat(input.value);
            // 只考虑已启用的产品
            if (enableCheckbox && enableCheckbox.checked && ratio > 0) {
                fixedProducts.push({ ...product, ratio, type: 'deposit', inputId: `deposit_${index}`, enableId: `enable_deposit_${index}` });
                fixedRatio += ratio;
                fixedWeightedRate += ratio * product.clientRate / 100;
            }
        });
    }
    
    if (type === 'wealth' || type === 'mixed') {
        config.wealth.forEach((product, index) => {
            const enableCheckbox = document.getElementById(`enable_wealth_${index}`);
            const input = document.getElementById(`wealth_${index}`);
            const ratio = parseFloat(input.value);
            // 只考虑已启用的产品
            if (enableCheckbox && enableCheckbox.checked && ratio > 0) {
                fixedProducts.push({ ...product, ratio, type: 'wealth', inputId: `wealth_${index}`, enableId: `enable_wealth_${index}` });
                fixedRatio += ratio;
                fixedWeightedRate += ratio * product.clientRate / 100;
            }
        });
    }
    
    if (fixedProducts.length === 0) {
        document.getElementById('inferenceStatus').innerHTML = '<p style="color: #999;">💡 输入产品比例后，系统会自动显示推演建议</p>';
        return;
    }
    
    if (fixedRatio >= 100) {
        return;
    }
    
    // 计算剩余比例需要达到的收益率
    const remainingRatio = 100 - fixedRatio;
    const requiredRateForRemaining = (targetRate - fixedWeightedRate) / (remainingRatio / 100);
    
    // 收集未使用的产品
    const availableProducts = [];
    
    if (type === 'deposit' || type === 'mixed') {
        config.deposits.forEach((product, index) => {
            const inputId = `deposit_${index}`;
            const enableCheckbox = document.getElementById(`enable_deposit_${index}`);
            // 只包含已启用且未fixed的产品
            if (enableCheckbox && enableCheckbox.checked && !fixedProducts.find(p => p.inputId === inputId)) {
                availableProducts.push({ ...product, type: 'deposit', inputId });
            }
        });
    }
    
    if (type === 'wealth' || type === 'mixed') {
        config.wealth.forEach((product, index) => {
            const inputId = `wealth_${index}`;
            const enableCheckbox = document.getElementById(`enable_wealth_${index}`);
            // 只包含已启用且未fixed的产品
            if (enableCheckbox && enableCheckbox.checked && !fixedProducts.find(p => p.inputId === inputId)) {
                availableProducts.push({ ...product, type: 'wealth', inputId });
            }
        });
    }
    
    if (availableProducts.length === 0) {
        return;
    }
    
    // 按收益率排序
    availableProducts.sort((a, b) => b.clientRate - a.clientRate);
    
    // 推演算法
    const suggested = [];
    let currentWeightedRate = 0;
    let remainingToAllocate = remainingRatio;
    
    for (let i = 0; i < availableProducts.length; i++) {
        const product = availableProducts[i];
        
        if (remainingToAllocate <= 0) break;
        
        if (i === availableProducts.length - 1) {
            suggested.push({ ...product, ratio: remainingToAllocate });
            currentWeightedRate += remainingToAllocate * product.clientRate / 100;
            remainingToAllocate = 0;
        } else {
            let allocation;
            
            if (product.clientRate >= requiredRateForRemaining) {
                allocation = Math.min(remainingToAllocate / 2, remainingToAllocate);
                allocation = Math.round(allocation / 5) * 5;
                allocation = Math.max(5, allocation);
            } else {
                allocation = Math.min(remainingToAllocate * 0.6, remainingToAllocate);
                allocation = Math.round(allocation / 5) * 5;
                allocation = Math.max(5, allocation);
            }
            
            allocation = Math.min(allocation, remainingToAllocate);
            suggested.push({ ...product, ratio: allocation });
            currentWeightedRate += allocation * product.clientRate / 100;
            remainingToAllocate -= allocation;
        }
    }
    
    const finalRate = fixedWeightedRate + currentWeightedRate;
    const rateDiff = finalRate - targetRate;
    
    // 保存建议数据到全局以便应用和编辑
    window.currentSuggestion = { fixed: fixedProducts, suggested: suggested, targetRate: targetRate };
    
    // 显示建议（不自动填充）
    let suggestionHTML = `
        <div class="inference-suggestion">
            <h4>💡 智能推荐</h4>
            <p style="margin-bottom: 15px;">已配置：${fixedRatio.toFixed(0)}%，剩余：${remainingRatio.toFixed(0)}%</p>
            
            <div class="suggestion-products-container">
                <div class="fixed-products-section">
                    <h5>✓ 已选定产品</h5>
                    <div class="suggested-products">
    `;
    
    fixedProducts.forEach(item => {
        suggestionHTML += `
            <div class="suggested-item fixed-item">
                <span class="product-name">${item.name}</span>
                <span class="product-ratio fixed-ratio">${item.ratio.toFixed(0)}%</span>
            </div>
        `;
    });
    
    suggestionHTML += `
                    </div>
                </div>
                
                <div class="recommended-products-section">
                    <h5>🤖 智能推荐产品</h5>
                    <div class="suggested-products">
    `;
    
    suggested.forEach((item, index) => {
        suggestionHTML += `
            <div class="suggested-item recommended-item">
                <span class="product-name">${item.name}</span>
                <div class="editable-ratio-wrapper">
                    <button class="btn-ratio-adjust btn-decrease" onclick="adjustSuggestionRatio(${index}, -5)" title="减少5%">-</button>
                    <input type="number" class="editable-ratio" id="suggest_ratio_${index}" 
                           value="${item.ratio.toFixed(0)}" min="0" max="100" step="5"
                           readonly style="pointer-events: none;">
                    <span class="percent-symbol">%</span>
                    <button class="btn-ratio-adjust btn-increase" onclick="adjustSuggestionRatio(${index}, 5)" title="增加5%">+</button>
                </div>
            </div>
        `;
    });
    
    suggestionHTML += `
                    </div>
                </div>
            </div>
            
            <div class="suggestion-summary">
                <p class="suggestion-total-display">
                    <span>当前总比例：</span>
                    <strong id="suggestionTotalRatio" class="suggestion-total-ratio valid">100.00%</strong>
                </p>
                <p class="predicted-rate">预计综合收益率：<strong id="predictedRate">${finalRate.toFixed(2)}%</strong></p>
                <p id="targetRateHint">
    `;
    
    // 精确判断，不使用容差
    if (Math.abs(rateDiff) < 0.001) {
        // 差异小于0.001%时认为达到目标
        suggestionHTML += `<span style="color: #4caf50; font-size: 13px;">✓ 达到目标收益率</span>`;
    } else if (rateDiff > 0) {
        suggestionHTML += `<span style="color: #ff9800; font-size: 13px;">✓ 高于目标收益率 ${rateDiff.toFixed(2)}%</span>`;
    } else {
        suggestionHTML += `<span style="color: #ff5722; font-size: 13px;">⚠ 低于目标收益率 ${Math.abs(rateDiff).toFixed(2)}%</span>`;
    }
    
    suggestionHTML += `
                </p>
            </div>
            <button class="btn-primary" onclick="applySuggestion()">应用此建议</button>
        </div>
    `;
    
    document.getElementById('inferenceStatus').innerHTML = suggestionHTML;
}

// 更新推演建议中的比例和收益率
function updateSuggestionRatio() {
    if (!window.currentSuggestion) return;
    
    const { fixed, suggested, targetRate } = window.currentSuggestion;
    const config = getConfig();
    
    let totalRatio = 0;
    let weightedRate = 0;
    
    // 已选定产品的比例和收益
    fixed.forEach(item => {
        totalRatio += item.ratio;
        weightedRate += item.ratio * item.clientRate / 100;
    });
    
    // 推荐产品的比例和收益
    suggested.forEach((item, index) => {
        const input = document.getElementById(`suggest_ratio_${index}`);
        if (input) {
            const ratio = parseFloat(input.value) || 0;
            totalRatio += ratio;
            weightedRate += ratio * item.clientRate / 100;
        }
    });
    
    // 限制输入框不超过100%
    const exceedsLimit = totalRatio > 100;
    suggested.forEach((item, index) => {
        const input = document.getElementById(`suggest_ratio_${index}`);
        if (input) {
            const currentVal = parseFloat(input.value) || 0;
            const otherTotal = totalRatio - currentVal;
            input.max = exceedsLimit ? currentVal : (100 - otherTotal);
        }
    });
    
    // 更新总比例显示
    const suggestionTotalElement = document.getElementById('suggestionTotalRatio');
    if (suggestionTotalElement) {
        suggestionTotalElement.textContent = totalRatio.toFixed(2) + '%';
        suggestionTotalElement.className = 'suggestion-total-ratio';
        if (Math.abs(totalRatio - 100) < 0.1) {
            suggestionTotalElement.classList.add('valid');
        } else if (totalRatio > 100) {
            suggestionTotalElement.classList.add('over-limit');
        } else {
            suggestionTotalElement.classList.add('invalid');
        }
    }
    
    // 更新预计收益率
    const predictedRateElement = document.getElementById('predictedRate');
    if (predictedRateElement) {
        predictedRateElement.textContent = weightedRate.toFixed(2) + '%';
        
        // 更新颜色提示
        if (Math.abs(totalRatio - 100) < 0.1) {
            predictedRateElement.style.color = '#ff6f00';
        } else {
            predictedRateElement.style.color = '#999';
        }
    }
    
    // 更新目标收益率提示
    const targetRateHintElement = document.getElementById('targetRateHint');
    if (targetRateHintElement && targetRate !== undefined) {
        const rateDiff = weightedRate - targetRate;
        let hintHTML = '';
        
        // 精确判断，不使用容差
        if (Math.abs(rateDiff) < 0.001) {
            hintHTML = '<span style="color: #4caf50; font-size: 13px;">✓ 达到目标收益率</span>';
        } else if (rateDiff > 0) {
            hintHTML = `<span style="color: #ff9800; font-size: 13px;">✓ 高于目标收益率 ${rateDiff.toFixed(2)}%</span>`;
        } else {
            hintHTML = `<span style="color: #ff5722; font-size: 13px;">⚠ 低于目标收益率 ${Math.abs(rateDiff).toFixed(2)}%</span>`;
        }
        
        targetRateHintElement.innerHTML = hintHTML;
    }
}

// 应用推演建议
function applySuggestion() {
    if (!window.currentSuggestion) return;
    
    const { suggested } = window.currentSuggestion;
    
    suggested.forEach((item, index) => {
        const suggestInput = document.getElementById(`suggest_ratio_${index}`);
        const targetInput = document.getElementById(item.inputId);
        
        if (suggestInput && targetInput) {
            targetInput.value = suggestInput.value;
        }
    });
    
    updateTotalRatio();
}

// 保存自定义方案
function saveCustomScheme() {
    // 获取当前结果数据
    const type = document.querySelector('input[name="customType"]:checked').value;
    const amount = parseFloat(document.getElementById('customAmount').value);
    const config = getConfig();
    
    const allocations = [];
    let clientRate = 0;
    
    // 收集产品配置
    if (type === 'deposit' || type === 'mixed') {
        config.deposits.forEach((product, index) => {
            const enableCheckbox = document.getElementById(`enable_deposit_${index}`);
            const input = document.getElementById(`deposit_${index}`);
            const ratio = parseFloat(input.value) || 0;
            if (enableCheckbox && enableCheckbox.checked && ratio > 0) {
                allocations.push({
                    name: product.name,
                    type: 'deposit',
                    ratio,
                    clientRate: product.clientRate
                });
                clientRate += ratio * product.clientRate / 100;
            }
        });
    }
    
    if (type === 'wealth' || type === 'mixed') {
        config.wealth.forEach((product, index) => {
            const enableCheckbox = document.getElementById(`enable_wealth_${index}`);
            const input = document.getElementById(`wealth_${index}`);
            const ratio = parseFloat(input.value) || 0;
            if (enableCheckbox && enableCheckbox.checked && ratio > 0) {
                allocations.push({
                    name: product.name,
                    type: 'wealth',
                    ratio,
                    clientRate: product.clientRate
                });
                clientRate += ratio * product.clientRate / 100;
            }
        });
    }
    
    // 获取已保存的方案
    const savedSchemes = JSON.parse(localStorage.getItem('savedCustomSchemes') || '[]');
    
    // 生成方案名称
    const schemeName = `推荐方案${savedSchemes.length + 1}`;
    
    // 保存方案
    savedSchemes.push({
        id: Date.now(),
        name: schemeName,
        type,
        amount,
        allocations,
        clientRate,
        createdAt: new Date().toLocaleString()
    });
    
    localStorage.setItem('savedCustomSchemes', JSON.stringify(savedSchemes));
    
    alert(`方案已保存为"${schemeName}"`);
    
    // 刷新方案列表
    loadSavedSchemes();
}

// 加载已保存的方案
function loadSavedSchemes() {
    const savedSchemes = JSON.parse(localStorage.getItem('savedCustomSchemes') || '[]');
    
    // 在自定义配置区域显示已保存的方案
    let schemesHTML = '';
    
    if (savedSchemes.length > 0) {
        schemesHTML = `
            <div class="saved-schemes-section">
                <h3>已保存的方案</h3>
                <div class="saved-schemes-list">
        `;
        
        savedSchemes.forEach(scheme => {
            schemesHTML += `
                <div class="saved-scheme-item">
                    <label class="scheme-checkbox">
                        <input type="checkbox" id="scheme_${scheme.id}" onchange="toggleSchemeComparison()">
                    </label>
                    <span class="scheme-name-clickable" onclick="event.stopPropagation(); showSavedSchemeDetail(${scheme.id})" title="点击查看详情">${scheme.name}</span>
                    <span class="scheme-rate">${scheme.clientRate.toFixed(2)}%</span>
                    <button class="btn-delete-scheme" onclick="deleteScheme(${scheme.id})">删除</button>
                </div>
            `;
        });
        
        schemesHTML += `
                </div>
                <div id="schemeComparisonButtons" style="display: none; margin-top: 15px;">
                    <button class="btn-primary" onclick="compareSchemes()">比对选中方案</button>
                </div>
            </div>
        `;
    }
    
    // 移除已存在的方案区域
    const existingSection = document.querySelector('.saved-schemes-section');
    if (existingSection) {
        existingSection.remove();
    }
    
    if (savedSchemes.length > 0) {
        // 找到"生成测算结果"按钮
        const customMode = document.getElementById('customMode');
        const calculateButton = Array.from(customMode.querySelectorAll('button')).find(btn => 
            btn.textContent.includes('生成测算结果')
        );
        
        if (calculateButton) {
            const tempDiv = document.createElement('div');
            tempDiv.innerHTML = schemesHTML;
            // 插入到按钮之后
            calculateButton.insertAdjacentElement('afterend', tempDiv.firstElementChild);
        }
    }
}

// 切换方案比对按钮显示
function toggleSchemeComparison() {
    const savedSchemes = JSON.parse(localStorage.getItem('savedCustomSchemes') || '[]');
    const checkedCount = savedSchemes.filter(scheme => {
        const checkbox = document.getElementById(`scheme_${scheme.id}`);
        return checkbox && checkbox.checked;
    }).length;
    
    const comparisonButtons = document.getElementById('schemeComparisonButtons');
    if (comparisonButtons) {
        comparisonButtons.style.display = (checkedCount >= 2 && checkedCount <= 3) ? 'block' : 'none';
    }
}

// 比对方案
function compareSchemes() {
    const savedSchemes = JSON.parse(localStorage.getItem('savedCustomSchemes') || '[]');
    const selectedSchemes = savedSchemes.filter(scheme => {
        const checkbox = document.getElementById(`scheme_${scheme.id}`);
        return checkbox && checkbox.checked;
    });
    
    if (selectedSchemes.length < 2 || selectedSchemes.length > 3) {
        alert('请选择2-3个方案进行比对');
        return;
    }
    
    // 显示比对结果
    showSchemeComparison(selectedSchemes);
}

// 显示方案比对结果
function showSchemeComparison(schemes) {
    document.getElementById('errorSection').style.display = 'none';
    const resultSection = document.getElementById('resultSection');
    resultSection.style.display = 'block';
    
    // 构建表头
    let comparisonHTML = `
        <div class="comparison-container">
            <h2>📊 方案比对分析</h2>
            <p style="text-align: center; color: #666; margin-bottom: 20px; font-size: 14px;">
                通过可视化条形图直观对比各方案的产品配置差异
            </p>
            <div class="comparison-table">
                <div class="comparison-row comparison-header-row">
                    <div class="comparison-label-cell">对比项目</div>
    `;
    
    schemes.forEach(scheme => {
        comparisonHTML += `<div class="comparison-value-cell header-cell">${scheme.name}</div>`;
    });
    
    comparisonHTML += `</div>`;
    
    // 找到最高收益率
    const maxRate = Math.max(...schemes.map(s => s.clientRate));
    
    // 综合收益率行
    comparisonHTML += `
        <div class="comparison-row highlight-row">
            <div class="comparison-label-cell">综合收益率</div>
    `;
    schemes.forEach(scheme => {
        const isBest = Math.abs(scheme.clientRate - maxRate) < 0.001;
        const rateHTML = isBest 
            ? `<div class="comparison-value-cell rate-cell best-rate">
                <div class="best-badge">🏆 最优</div>
                <div>${scheme.clientRate.toFixed(2)}%</div>
               </div>` 
            : `<div class="comparison-value-cell rate-cell">${scheme.clientRate.toFixed(2)}%</div>`;
        comparisonHTML += rateHTML;
    });
    comparisonHTML += `</div>`;
    
    // 资金金额行
    comparisonHTML += `
        <div class="comparison-row">
            <div class="comparison-label-cell">资金金额</div>
    `;
    schemes.forEach(scheme => {
        comparisonHTML += `<div class="comparison-value-cell">${scheme.amount} 万元</div>`;
    });
    comparisonHTML += `</div>`;
    
    // 配置类型行
    comparisonHTML += `
        <div class="comparison-row">
            <div class="comparison-label-cell">配置类型</div>
    `;
    schemes.forEach(scheme => {
        const typeLabel = scheme.type === 'deposit' ? '仅存款' : scheme.type === 'wealth' ? '仅理财' : '存款+理财';
        comparisonHTML += `<div class="comparison-value-cell">${typeLabel}</div>`;
    });
    comparisonHTML += `</div>`;
    
    // 保存时间行
    comparisonHTML += `
        <div class="comparison-row">
            <div class="comparison-label-cell">保存时间</div>
    `;
    schemes.forEach(scheme => {
        comparisonHTML += `<div class="comparison-value-cell">${scheme.createdAt}</div>`;
    });
    comparisonHTML += `</div>`;
    
    // 产品配置部分标题
    comparisonHTML += `
        <div class="comparison-row section-divider">
            <div class="comparison-label-cell section-title">产品配置详情</div>
    `;
    schemes.forEach(() => {
        comparisonHTML += `<div class="comparison-value-cell"></div>`;
    });
    comparisonHTML += `</div>`;
    
    // 获取所有产品名称
    const allProductNames = new Set();
    schemes.forEach(scheme => {
        scheme.allocations.forEach(alloc => {
            allProductNames.add(`${alloc.name}（${alloc.type === 'deposit' ? '存款' : '理财'}）`);
        });
    });
    
    // 计算每个方案的总收益
    const schemeTotalEarnings = schemes.map(scheme => {
        let totalEarning = 0;
        scheme.allocations.forEach(alloc => {
            const itemAmount = scheme.amount * alloc.ratio / 100;
            const yearEarning = itemAmount * alloc.clientRate / 100;
            totalEarning += yearEarning;
        });
        return totalEarning;
    });
    
    // 为每个产品创建一行
    Array.from(allProductNames).forEach(productName => {
        comparisonHTML += `
            <div class="comparison-row product-row">
                <div class="comparison-label-cell product-label">${productName}</div>
        `;
        
        schemes.forEach((scheme, schemeIndex) => {
            const alloc = scheme.allocations.find(a => 
                `${a.name}（${a.type === 'deposit' ? '存款' : '理财'}）` === productName
            );
            
            if (alloc) {
                const itemAmount = scheme.amount * alloc.ratio / 100;
                const yearEarning = itemAmount * alloc.clientRate / 100;
                const earningRatio = schemeTotalEarnings[schemeIndex] > 0 
                    ? (yearEarning / schemeTotalEarnings[schemeIndex] * 100) 
                    : 0;
                
                comparisonHTML += `
                    <div class="comparison-value-cell product-cell">
                        <div class="product-ratio-text">${alloc.ratio.toFixed(2)}%</div>
                        <div class="product-ratio-bar-container">
                            <div class="product-ratio-bar" style="width: ${alloc.ratio}%"></div>
                        </div>
                        <div class="product-amount">${itemAmount.toFixed(2)}万元</div>
                        <div class="product-rate-small">年化${alloc.clientRate}%</div>
                        <div class="product-earning">年收益 ${yearEarning.toFixed(4)}万元</div>
                        <div class="earning-contribution">
                            <span class="contrib-label">配置${alloc.ratio.toFixed(1)}%</span>
                            <span class="contrib-arrow">→</span>
                            <span class="contrib-value">贡献${earningRatio.toFixed(1)}%</span>
                        </div>
                    </div>
                `;
            } else {
                comparisonHTML += `<div class="comparison-value-cell product-cell-empty">-</div>`;
            }
        });
        
        comparisonHTML += `</div>`;
    });
    
    comparisonHTML += `
            </div>
        </div>
    `;
    
    resultSection.innerHTML = comparisonHTML;
    resultSection.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

// 删除方案
function deleteScheme(schemeId) {
    if (!confirm('确定要删除这个方案吗？')) {
        return;
    }
    
    let savedSchemes = JSON.parse(localStorage.getItem('savedCustomSchemes') || '[]');
    savedSchemes = savedSchemes.filter(s => s.id !== schemeId);
    
    // 重新编号
    savedSchemes.forEach((scheme, index) => {
        scheme.name = `推荐方案${index + 1}`;
    });
    
    localStorage.setItem('savedCustomSchemes', JSON.stringify(savedSchemes));
    loadSavedSchemes();
}

// 调整数字输入框的值（通用函数）
function adjustNumberInput(inputId, amount) {
    const input = document.getElementById(inputId);
    if (input) {
        let currentValue = parseFloat(input.value) || 0;
        let newValue = currentValue + amount;
        
        // 获取输入框的限制
        const min = parseFloat(input.min) !== undefined && input.min !== '' ? parseFloat(input.min) : -Infinity;
        const max = parseFloat(input.max) !== undefined && input.max !== '' ? parseFloat(input.max) : Infinity;
        
        // 限制在范围内
        newValue = Math.max(min, Math.min(max, newValue));
        
        // 处理小数精度
        const step = parseFloat(input.step) || 1;
        if (step < 1) {
            const decimalPlaces = (step.toString().split('.')[1] || '').length;
            newValue = parseFloat(newValue.toFixed(decimalPlaces));
        } else {
            newValue = Math.round(newValue);
        }
        
        input.value = newValue;
        
        // 触发 input 事件（如果有绑定的处理函数）
        const event = new Event('input', { bubbles: true });
        input.dispatchEvent(event);
    }
}

// 调整自定义产品比例
function adjustCustomRatio(inputId, amount) {
    const input = document.getElementById(inputId);
    if (!input) return;
    
    let currentValue = parseFloat(input.value) || 0;
    let newValue = currentValue + amount;
    
    // 限制在0-100之间
    newValue = Math.max(0, Math.min(100, newValue));
    
    input.value = newValue;
    updateTotalRatio(); // 更新总比例显示
}

// 页面加载时初始化
document.addEventListener('DOMContentLoaded', async function() {
    // 首次访问时加载默认配置
    await initializeConfig();
    
    // 初始化配置（如果不存在）
    if (!localStorage.getItem('productConfig')) {
        localStorage.setItem('productConfig', JSON.stringify(DEFAULT_CONFIG));
    }
    
    // 初始化流动性字段显示状态
    toggleLiquidityField();
    
    // 加载银行推荐方案
    loadBankSchemes();
    
    // 加载已保存的自定义方案
    loadSavedSchemes();
});

// 导出方案为图片
async function exportSchemeAsImage(solutionIndex) {
    const solutionCards = document.querySelectorAll('.solution-card');
    const solutionCard = solutionCards[solutionIndex];
    
    if (!solutionCard) {
        alert('未找到方案数据');
        return;
    }
    
    // 检查是否已加载dom-to-image库
    if (typeof domtoimage === 'undefined') {
        // 动态加载dom-to-image库
        const script = document.createElement('script');
        script.src = 'https://cdn.jsdelivr.net/npm/dom-to-image@2.6.0/dist/dom-to-image.min.js';
        script.onload = () => {
            // 加载完成后自动重试
            console.log('dom-to-image加载完成，重新导出');
            exportSchemeAsImage(solutionIndex);
        };
        script.onerror = () => {
            console.error('dom-to-image加载失败');
            alert('导出库加载失败，请刷新页面重试');
        };
        document.head.appendChild(script);
        
        // 显示加载状态（非阻塞）
        console.log('正在加载导出功能...');
        return;
    }
    
    try {
        console.log('开始导出图片...');
        
        // 临时隐藏操作按钮和折叠按钮
        const actionButtons = solutionCard.querySelector('.action-buttons');
        const collapseBtn = solutionCard.querySelector('.btn-collapse');
        const originalActionDisplay = actionButtons ? actionButtons.style.display : '';
        const originalCollapseDisplay = collapseBtn ? collapseBtn.style.display : '';
        if (actionButtons) actionButtons.style.display = 'none';
        if (collapseBtn) collapseBtn.style.display = 'none';
        
        // 确保内容可见
        const contentDiv = solutionCard.querySelector('.solution-content');
        const originalContentDisplay = contentDiv ? contentDiv.style.display : '';
        if (contentDiv) {
            contentDiv.style.display = 'block';
        }
        
        // 添加水印
        const watermark = document.createElement('div');
        watermark.className = 'export-watermark';
        watermark.style.cssText = 'text-align: center; margin-top: 20px; padding-top: 20px; border-top: 1px solid #e0e0e0; color: #999; font-size: 12px;';
        watermark.innerHTML = `
            <div>资产配置计算器</div>
            <div>生成时间：${new Date().toLocaleString()}</div>
        `;
        solutionCard.appendChild(watermark);
        
        // 使用dom-to-image导出（支持CSS更好）
        console.log('使用dom-to-image渲染...');
        const dataUrl = await domtoimage.toPng(solutionCard, {
            width: solutionCard.offsetWidth,
            height: solutionCard.offsetHeight,
            style: {
                margin: '0'
            },
            quality: 1.0,
            cacheBust: true
        });
        
        console.log('图片生成成功');
        
        // 恢复原始状态
        if (actionButtons) actionButtons.style.display = originalActionDisplay;
        if (collapseBtn) collapseBtn.style.display = originalCollapseDisplay;
        if (contentDiv) contentDiv.style.display = originalContentDisplay;
        watermark.remove();
        
        // 下载图片
        const link = document.createElement('a');
        link.download = `资产配置方案_${new Date().toLocaleDateString()}.png`;
        link.href = dataUrl;
        link.click();
        
        console.log('图片下载完成');
        
    } catch (error) {
        console.error('导出失败：', error);
        alert('导出失败，请重试');
    }
}

// 导出方案为Excel
function exportSchemeAsExcel(solutionIndex) {
    const solutionCards = document.querySelectorAll('.solution-card');
    const solutionCard = solutionCards[solutionIndex];
    
    if (!solutionCard) {
        alert('未找到方案数据');
        return;
    }
    
    try {
        // 获取方案数据
        const solutionData = JSON.parse(solutionCard.getAttribute('data-solution'));
        const config = getConfig();
        
        // 构建Excel内容(使用CSV格式，Excel可以打开)
        let csvContent = '\ufeff'; // UTF-8 BOM
        
        // 标题
        csvContent += '资产配置推荐方案\n\n';
        
        // 基本信息
        csvContent += '方案信息\n';
        csvContent += `生成时间,${new Date().toLocaleString()}\n`;
        csvContent += `资金金额,${solutionData.amount} 万元\n`;
        csvContent += `客户综合收益率,${solutionData.clientRate.toFixed(2)}%\n\n`;
        
        // 产品明细表头
        csvContent += '产品明细\n';
        csvContent += '产品名称,产品类型,配置比例,收益率,配置金额(万元),配置收益(万元)\n';
        
        // 产品明细数据
        if (solutionData.allocations) {
            // 混合配置或已保存方案
            solutionData.allocations.forEach(allocation => {
                // 处理两种数据结构
                const product = allocation.product || allocation;
                const ratio = allocation.ratio;
                
                if (ratio > 0.01) {
                    const productName = product.name;
                    const productType = product.type === 'deposit' ? '存款' : '理财';
                    const productRate = product.clientRate || product.rate || 0;
                    const amount = solutionData.amount * ratio / 100;
                    const profit = amount * productRate / 100;
                    csvContent += `${productName},${productType},${ratio.toFixed(2)}%,${productRate.toFixed(2)}%,${amount.toFixed(2)},${profit.toFixed(2)}\n`;
                }
            });
        } else if (solutionData.allocation) {
            // 单一类型配置
            const products = solutionData.allocationType === 'deposit' ? config.deposits : config.wealth;
            const typeLabel = solutionData.allocationType === 'deposit' ? '存款' : '理财';
            
            solutionData.allocation.forEach((ratio, idx) => {
                if (ratio > 0.01) {
                    const product = products[idx];
                    const amount = solutionData.amount * ratio / 100;
                    const profit = amount * product.clientRate / 100;
                    csvContent += `${product.name},${typeLabel},${ratio.toFixed(2)}%,${product.clientRate.toFixed(2)}%,${amount.toFixed(2)},${profit.toFixed(2)}\n`;
                }
            });
        }
        
        // 汇总信息
        csvContent += '\n汇总信息\n';
        const productCount = solutionData.allocations 
            ? solutionData.allocations.filter(a => a.ratio > 0.01).length 
            : solutionData.allocation.filter(r => r > 0.01).length;
        csvContent += `使用产品数量,${productCount} 个\n`;
        csvContent += `综合收益率,${solutionData.clientRate.toFixed(2)}%\n`;
        csvContent += `年化收益,${(solutionData.amount * solutionData.clientRate / 100).toFixed(2)} 万元\n`;
        
        // 创建下载链接
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `资产配置方案_${new Date().toLocaleDateString()}.csv`;
        a.click();
        URL.revokeObjectURL(url);
        
    } catch (error) {
        console.error('导出失败：', error);
        alert('导出失败，请重试');
    }
}

// 折叠/展开推荐方案
function toggleSolutionCollapse(index) {
    const contentDiv = document.getElementById(`solution_content_${index}`);
    const button = event.target;
    
    if (contentDiv) {
        const isCollapsed = contentDiv.style.display === 'none';
        contentDiv.style.display = isCollapsed ? 'block' : 'none';
        button.textContent = isCollapsed ? '▼' : '▲';
        button.classList.toggle('collapsed', !isCollapsed);
    }
}

// 导出银行推荐方案为图片
async function exportBankSchemeAsImage(schemeName) {
    const solutionCard = document.querySelector('.scheme-detail-result .solution-card');
    
    if (!solutionCard) {
        alert('未找到方案数据');
        return;
    }
    
    // 检查是否已加载dom-to-image库
    if (typeof domtoimage === 'undefined') {
        const script = document.createElement('script');
        script.src = 'https://cdn.jsdelivr.net/npm/dom-to-image@2.6.0/dist/dom-to-image.min.js';
        script.onload = () => {
            console.log('dom-to-image加载完成，重新导出');
            exportBankSchemeAsImage(schemeName);
        };
        script.onerror = () => {
            console.error('dom-to-image加载失败');
            alert('导出库加载失败，请刷新页面重试');
        };
        document.head.appendChild(script);
        console.log('正在加载导出功能...');
        return;
    }
    
    try {
        console.log('开始导出图片...');
        
        // 临时隐藏操作按钮
        const actionButtons = solutionCard.querySelector('.action-buttons');
        const originalActionDisplay = actionButtons ? actionButtons.style.display : '';
        if (actionButtons) actionButtons.style.display = 'none';
        
        // 添加水印
        const watermark = document.createElement('div');
        watermark.className = 'export-watermark';
        watermark.style.cssText = 'text-align: center; margin-top: 20px; padding-top: 20px; border-top: 1px solid #e0e0e0; color: #999; font-size: 12px;';
        watermark.innerHTML = `
            <div>资产配置计算器</div>
            <div>生成时间：${new Date().toLocaleString()}</div>
        `;
        solutionCard.appendChild(watermark);
        
        // 使用dom-to-image导出
        console.log('使用dom-to-image渲染...');
        const dataUrl = await domtoimage.toPng(solutionCard, {
            width: solutionCard.offsetWidth,
            height: solutionCard.offsetHeight,
            style: {
                margin: '0'
            },
            quality: 1.0,
            cacheBust: true
        });
        
        console.log('图片生成成功');
        
        // 恢复原始状态
        if (actionButtons) actionButtons.style.display = originalActionDisplay;
        watermark.remove();
        
        // 下载图片
        const link = document.createElement('a');
        link.download = `${schemeName}_${new Date().toLocaleDateString()}.png`;
        link.href = dataUrl;
        link.click();
        
        console.log('图片下载完成');
        
    } catch (error) {
        console.error('导出失败：', error);
        alert('导出失败，请重试');
    }
}

// 导出银行推荐方案为Excel
function exportBankSchemeAsExcel(schemeName) {
    const solutionCard = document.querySelector('.scheme-detail-result .solution-card');
    
    if (!solutionCard) {
        alert('未找到方案数据');
        return;
    }
    
    try {
        // 获取方案数据
        const solutionData = JSON.parse(solutionCard.getAttribute('data-solution'));
        
        // 构建Excel内容(使用CSV格式)
        let csvContent = '\\ufeff'; // UTF-8 BOM
        
        // 标题
        csvContent += '资产配置推荐方案\\n\\n';
        
        // 基本信息
        csvContent += '方案信息\\n';
        csvContent += `方案名称,${solutionData.name}\\n`;
        csvContent += `方案说明,${solutionData.description}\\n`;
        csvContent += `生成时间,${new Date().toLocaleString()}\\n`;
        csvContent += `资金金额,${solutionData.amount} 万元\\n`;
        csvContent += `综合收益率,${solutionData.clientRate.toFixed(2)}%\\n\\n`;
        
        // 产品明细表头
        csvContent += '产品明细\\n';
        csvContent += '产品名称,产品类型,配置比例,收益率,配置金额(万元),配置收益(万元)\\n';
        
        // 产品明细数据
        solutionData.products.forEach(product => {
            const amount = solutionData.amount * product.ratio / 100;
            const profit = amount * product.rate / 100;
            csvContent += `${product.name},${product.type},${product.ratio.toFixed(2)}%,${product.rate.toFixed(2)}%,${amount.toFixed(2)},${profit.toFixed(2)}\\n`;
        });
        
        // 汇总信息
        csvContent += '\\n汇总信息\\n';
        csvContent += `使用产品数量,${solutionData.products.length} 个\\n`;
        csvContent += `总配置金额,${solutionData.amount.toFixed(2)} 万元\\n`;
        csvContent += `综合收益率,${solutionData.clientRate.toFixed(2)}%\\n`;
        csvContent += `年化收益,${(solutionData.amount * solutionData.clientRate / 100).toFixed(2)} 万元\\n`;
        
        // 创建下载链接
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${schemeName}_${new Date().toLocaleDateString()}.csv`;
        a.click();
        URL.revokeObjectURL(url);
        
    } catch (error) {
        console.error('导出失败：', error);
        alert('导出失败，请重试');
    }
}

// 展示已保存方案的详细信息
function showSavedSchemeDetail(schemeId) {
    const savedSchemes = JSON.parse(localStorage.getItem('savedCustomSchemes') || '[]');
    const scheme = savedSchemes.find(s => s.id === schemeId);
    
    if (!scheme) {
        alert('方案不存在');
        return;
    }
    
    // 清空错误信息
    document.getElementById('errorSection').style.display = 'none';
    
    // 获取或创建结果区域
    const resultSection = document.getElementById('resultSection');
    resultSection.style.display = 'block';
    resultSection.innerHTML = '';
    
    // 创建方案卡片
    const solutionDiv = document.createElement('div');
    solutionDiv.className = 'solution-card';
    
    // 生成产品明细HTML
    let productDetailsHTML = '';
    let totalProfit = 0;
    if (scheme.allocations && scheme.allocations.length > 0) {
        productDetailsHTML = scheme.allocations
            .map(allocation => {
                const typeLabel = allocation.type === 'deposit' ? '存款' : '理财';
                const productAmount = scheme.amount * allocation.ratio / 100;
                const profit = productAmount * allocation.clientRate / 100;
                totalProfit += profit;
                return `
                    <div class="product-detail-item">
                        <div class="product-info">
                            <span class="product-type">${typeLabel}</span>
                            <span class="product-name">${allocation.name}</span>
                        </div>
                        <div class="product-metrics">
                            <span class="product-ratio">${allocation.ratio.toFixed(1)}%</span>
                            <span class="product-amount">${productAmount.toFixed(2)}</span>
                            <span class="product-rate">${allocation.clientRate.toFixed(2)}%</span>
                            <span class="product-profit">${profit.toFixed(2)}</span>
                        </div>
                    </div>
                `;
            })
            .join('');
    }
    
    // 生成配置明细HTML
    let allocationDetailsHTML = '';
    if (scheme.allocations && scheme.allocations.length > 0) {
        allocationDetailsHTML = scheme.allocations
            .map(allocation => {
                const itemAmount = scheme.amount * allocation.ratio / 100;
                const typeLabel = allocation.type === 'deposit' ? '存款' : '理财';
                return `
                    <div class="allocation-item">
                        <span class="name">${allocation.name}（${typeLabel}）</span>
                        <div class="details">
                            <div class="percentage">${allocation.ratio.toFixed(2)}%</div>
                            <div class="amount">${itemAmount.toFixed(2)} 万元</div>
                        </div>
                    </div>
                `;
            })
            .join('');
    }
    
    // 构建方案HTML
    solutionDiv.innerHTML = `
        <div class="solution-header">
            <h2 class="solution-title">${scheme.name}</h2>
            <div class="header-actions">
                <span class="preference-badge balance">已保存方案</span>
            </div>
        </div>
        
        <div class="solution-content" id="solution_content_0">
            <div class="solution-description">创建于: ${scheme.createdAt}</div>
            
            <div class="summary">
                <div class="summary-item highlight">
                    <span class="label">客户综合收益率：</span>
                    <span class="value">${scheme.clientRate.toFixed(2)}%</span>
                </div>
                <div class="summary-item">
                    <span class="label">配置总金额：</span>
                    <span class="value">${scheme.amount.toFixed(2)} 万元</span>
                </div>
                <div class="summary-item">
                    <span class="label">使用产品数量：</span>
                    <span class="value">${scheme.allocations.length} 个</span>
                </div>
                ${productDetailsHTML ? `
                <div class="product-details-section">
                    <div class="product-details-header">
                        <span class="header-label">产品明细</span>
                        <div class="header-metrics">
                            <span class="header-ratio">比例</span>
                            <span class="header-amount">配置金额</span>
                            <span class="header-rate">收益率</span>
                            <span class="header-profit">收益</span>
                        </div>
                    </div>
                    ${productDetailsHTML}
                    <div class="product-detail-item total-row">
                        <div class="product-info">
                            <span class="product-type-summary">汇总</span>
                        </div>
                        <div class="product-metrics">
                            <span class="product-ratio-empty"></span>
                            <span class="product-amount">${scheme.amount.toFixed(2)}</span>
                            <span class="product-rate">${scheme.clientRate.toFixed(2)}%</span>
                            <span class="product-profit">${totalProfit.toFixed(2)}</span>
                        </div>
                    </div>
                </div>
                ` : ''}
            </div>

            <h3>配置明细</h3>
            <div class="allocation-details-container">
                ${allocationDetailsHTML}
            </div>
            
            <div class="action-buttons">
                <button class="btn-secondary" onclick="exportSchemeAsImage(0)">📷 导出为图片</button>
                <button class="btn-secondary" onclick="exportSchemeAsExcel(0)">📊 导出为Excel</button>
            </div>
        </div>
    `;
    
    // 为导出功能存储方案数据
    const exportData = {
        clientRate: scheme.clientRate,
        allocations: scheme.allocations.map(a => ({
            product: {
                name: a.name,
                type: a.type,
                clientRate: a.clientRate
            },
            ratio: a.ratio
        })),
        amount: scheme.amount,
        allocationType: scheme.type,
        isCustom: true
    };
    solutionDiv.setAttribute('data-solution', JSON.stringify(exportData));
    
    resultSection.appendChild(solutionDiv);
    
    // 滚动到结果区域
    resultSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
}
