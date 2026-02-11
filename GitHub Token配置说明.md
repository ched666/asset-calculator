# GitHub Token 配置说明（Fine-grained - 推荐）

## 🔒 为什么使用 Fine-grained Token？

**Classic Token的问题：**
- ❌ 权限范围太广：勾选`repo`后对**所有仓库**都有权限
- ❌ 安全风险高：一旦泄露，您所有仓库都可能受影响

**Fine-grained Token的优势：**
- ✅ 权限精确控制：**仅对指定仓库**有权限
- ✅ 更加安全：即使泄露，也只影响单个仓库
- ✅ 符合最小权限原则

---

## 📝 创建 Fine-grained Token

### 1. 访问Token创建页面

访问：https://github.com/settings/personal-access-tokens/new

### 2. 填写基本信息

- **Token name**（名称）：`asset-calculator-publisher`
- **Expiration**（有效期）：建议选择 `90 days`（90天）或更长
- **Description**（描述）：`用于资产配置计算器云端发布功能`

### 3. ⭐ 选择仓库范围（重要）

- **Repository access** → 选择 **"Only select repositories"**
- 点击"Select repositories"下拉框
- ✅ 勾选 **`ched666/asset-calculator`**

### 4. ⭐ 设置权限（重要）

在 **"Repository permissions"** 部分：
- 找到 **Contents** → 设置为 **"Read and write"**
- 其他权限保持默认（No access）

### 5. 生成Token

1. 点击页面底部的 **"Generate token"**
2. **⚠️ 立即复制生成的Token**（只显示一次！）
3. Token格式：`ghp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx`

---

## 💻 在系统中使用

### 首次使用

1. 管理员登录后台
2. 进入"方案管理"页面
3. 点击 **"🚀 发布共享"** 按钮
4. 系统会弹出提示框，要求输入Token
5. 粘贴刚才复制的Token
6. ✅ Token会自动保存在浏览器本地

### 后续使用

- 直接点击"发布共享"，无需再输入Token
- 如需更换Token，点击"🔑 重置Token"按钮

---

## 🔒 安全性对比

| 特性 | Classic Token | Fine-grained Token（推荐） |
|------|--------------|--------------------------|
| 权限范围 | 所有仓库 | 仅指定仓库 |
| 最小权限原则 | ❌ | ✅ |
| 泄露风险 | 高（影响所有仓库） | 低（仅影响单个仓库） |
| 权限可撤销 | 必须删除整个Token | 可单独移除仓库访问 |
| GitHub推荐 | 逐步淘汰 | ✅ 推荐使用 |

---

## ❓ 常见问题

**Q: Token保存在哪里？**
A: 保存在管理员浏览器的localStorage中，不会上传到服务器或代码仓库。

**Q: 多个管理员需要各自配置Token吗？**
A: 是的。每个管理员在自己的浏览器中首次使用时输入一次即可。

**Q: Token过期了怎么办？**
A: 按照上述步骤重新创建一个新Token，然后在系统中点击"重置Token"后重新输入。

**Q: 如何撤销Token权限？**
A: 访问 https://github.com/settings/personal-access-tokens → 找到对应Token → 点击"Revoke"

**Q: 万一Token泄露了怎么办？**
A: 
1. 立即在GitHub中撤销该Token
2. 创建新的Token
3. 由于使用Fine-grained Token，只有asset-calculator仓库受影响

---

## ✅ 配置完成后

管理员就可以：
1. 修改产品配置或推荐方案
2. 点击"💾 保存配置"（保存到本地）
3. 点击"🚀 发布共享"（同步到云端）
4. 所有新用户1-2分钟后看到最新配置

**享受使用！** 🎉
