# Git 安装和仓库连接指南

## 第一步：安装 Git（5分钟）

浏览器已经打开 Git 下载页面，如果没有打开，访问：https://git-scm.com/download/win

### 安装步骤：
1. 点击下载最新版本（会自动下载）
2. 双击下载的安装程序
3. 全部使用默认设置，一路点击 **Next**
4. 最后点击 **Install**
5. 安装完成点击 **Finish**

### 验证安装（重要）：
安装完成后，**关闭所有 PowerShell 窗口**，然后：
1. 重新打开 PowerShell
2. 输入命令测试：
   ```powershell
   git --version
   ```
3. 如果显示版本号（如 `git version 2.43.0`），说明安装成功

---

## 第二步：配置 Git 用户信息

在 PowerShell 中运行以下命令：

```powershell
# 设置用户名（改成你自己的GitHub用户名）
git config --global user.name "ched666"

# 设置邮箱（改成你的邮箱）
git config --global user.email "ched666@users.noreply.github.com"

# 验证配置
git config --list
```

---

## 第三步：连接到你的仓库

### 3.1 进入项目目录
```powershell
cd d:\pytools
```

### 3.2 初始化并连接远程仓库
```powershell
# 初始化 Git 仓库
git init

# 添加远程仓库（注意：需要用你的 token）
git remote add origin https://你的token@github.com/ched666/asset-calculator.git

# 或者使用这个（会提示输入用户名和token）
git remote add origin https://github.com/ched666/asset-calculator.git
```

### 3.3 拉取现有内容
```powershell
# 拉取远程仓库的内容
git pull origin main --allow-unrelated-histories
```

### 3.4 添加所有文件
```powershell
# 添加所有文件
git add .

# 查看状态
git status
```

### 3.5 提交并推送
```powershell
# 提交
git commit -m "Add all project files"

# 推送到 GitHub
git push -u origin main
```

---

## 快速修复脚本

我会创建一个自动化脚本帮你完成上述步骤！

---

## 常用 Git 命令（日常开发用）

### 查看状态
```powershell
git status
```

### 添加文件
```powershell
# 添加所有修改的文件
git add .

# 添加特定文件
git add index.html
```

### 提交更改
```powershell
git commit -m "描述你的修改"
```

### 推送到 GitHub
```powershell
git push
```

### 拉取最新代码
```powershell
git pull
```

### 查看提交历史
```powershell
git log
```

---

## 工作流程示例

每次修改文件后：
```powershell
# 1. 查看改了什么
git status

# 2. 添加修改的文件
git add .

# 3. 提交
git commit -m "修复了XX功能"

# 4. 推送到 GitHub
git push

# 等待1-2分钟，网站自动更新
```

---

## 问题排查

### 推送时需要输入密码？
使用 Personal Access Token 代替密码

### 提示 "failed to push"？
```powershell
git pull origin main
git push origin main
```

### 想撤销修改？
```powershell
# 撤销某个文件的修改
git checkout -- 文件名

# 撤销所有修改
git reset --hard
```

---

## 下一步

安装完 Git 后，告诉我，我会帮你运行自动化脚本！
