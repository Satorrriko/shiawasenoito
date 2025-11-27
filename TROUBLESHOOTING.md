# 故障排查指南

## 当前错误

```
GET https://satorrriko.github.io/src/main.tsx net::ERR_ABORTED 404 (Not Found)
background.js:53 Uncaught TypeError: Cannot read properties of null (reading 'addEventListener')
```

## 问题分析

### 错误 1: 404 - `/src/main.tsx` 找不到

这个错误说明：
1. ❌ **访问了错误的 URL**：直接访问了 `https://satorrriko.github.io/` 而不是 `https://satorrriko.github.io/shiawasenoito/`
2. ❌ **或者 GitHub Pages 部署了源代码**：而不是构建后的 `dist/` 目录

### 错误 2: `addEventListener` 错误

这通常是浏览器扩展（如 `background.js`）的问题，不是你的代码问题。

## ✅ 解决方案

### 1. 确认访问正确的 URL

**✅ 正确的访问地址**：
```
https://satorrriko.github.io/shiawasenoito/
```

**❌ 错误的访问地址**（会导致 404）：
```
https://satorrriko.github.io/                    ❌ 根路径
https://satorrriko.github.io/src/main.tsx       ❌ 源代码路径
```

### 2. 检查 GitHub Pages 部署设置

#### 步骤 1: 检查 GitHub Actions

1. 进入你的 GitHub 仓库
2. 点击 **Actions** 标签页
3. 查看最新的 "Deploy to GitHub Pages" 工作流
4. 确认所有步骤都成功（绿色对勾 ✅）

#### 步骤 2: 检查 Pages 设置

1. 进入仓库 **Settings** → **Pages**
2. 确认 **Source** 是 **"GitHub Actions"**（不是 "Deploy from a branch"）
3. 查看部署的 URL

#### 步骤 3: 检查部署的文件

如果 GitHub Actions 成功，部署的文件应该包含：
- ✅ `index.html`（构建后的版本）
- ✅ `assets/index-*.js`（打包后的 JS 文件）
- ✅ `assets/index-*.css`（打包后的 CSS 文件）

**不应该包含**：
- ❌ `src/` 目录（源代码）
- ❌ `package.json`（除非是项目根目录）

### 3. 验证构建产物

本地验证构建是否正确：

```bash
# 在项目根目录
npm run build

# 检查构建后的文件
cat dist/index.html
```

应该看到：
```html
<script type="module" crossorigin src="/shiawasenoito/assets/index-xxx.js"></script>
<link rel="stylesheet" crossorigin href="/shiawasenoito/assets/index-xxx.css">
```

**不应该看到**：
```html
<script type="module" src="/src/main.tsx"></script>  ❌
```

### 4. 清除浏览器缓存

1. 按 `Ctrl+Shift+R`（Windows）或 `Cmd+Shift+R`（Mac）强制刷新
2. 或清除浏览器缓存：
   - Chrome: Settings → Privacy → Clear browsing data
   - Firefox: Settings → Privacy → Clear Data

### 5. 检查浏览器控制台

1. 访问 `https://satorrriko.github.io/shiawasenoito/`
2. 打开开发者工具（F12）
3. 查看 **Console** 标签页
4. 查看 **Network** 标签页，检查资源加载的完整 URL

## 🔍 调试步骤

### 如果仍然看到 404 错误：

#### 步骤 1: 检查实际访问的 URL

在浏览器地址栏确认你访问的是：
```
https://satorrriko.github.io/shiawasenoito/
```

不是：
```
https://satorrriko.github.io/
```

#### 步骤 2: 检查 GitHub Actions 日志

1. 进入 Actions 标签页
2. 点击最新的工作流运行
3. 查看 "Upload artifact" 步骤
4. 确认上传的是 `./dist` 目录

#### 步骤 3: 手动触发重新部署

1. 进入 Actions 标签页
2. 选择 "Deploy to GitHub Pages" 工作流
3. 点击 "Run workflow" 按钮
4. 等待部署完成

#### 步骤 4: 检查部署的文件内容

如果可能，检查 GitHub Pages 实际部署的文件：
- 访问 `https://satorrriko.github.io/shiawasenoito/index.html`
- 查看页面源代码（右键 → View Page Source）
- 确认路径是 `/shiawasenoito/assets/...` 而不是 `/src/...`

## 📝 检查清单

- [ ] 访问 URL：`https://satorrriko.github.io/shiawasenoito/`（包含仓库名）
- [ ] GitHub Actions 部署成功
- [ ] Pages Source 设置为 "GitHub Actions"
- [ ] 构建产物包含 `dist/` 目录
- [ ] `dist/index.html` 中的路径包含 `/shiawasenoito/assets/...`
- [ ] 清除浏览器缓存
- [ ] 浏览器控制台没有 404 错误（除了扩展错误）

## ⚠️ 常见错误

### 错误 1: 访问根路径

**症状**：`GET https://satorrriko.github.io/src/main.tsx 404`

**原因**：访问了 `https://satorrriko.github.io/` 而不是 `https://satorrriko.github.io/shiawasenoito/`

**解决**：访问正确的 URL（包含仓库名）

### 错误 2: 部署了源代码

**症状**：GitHub Pages 显示源代码文件而不是构建后的文件

**原因**：GitHub Pages Source 设置为 "Deploy from a branch" 而不是 "GitHub Actions"

**解决**：在 Settings → Pages 中改为 "GitHub Actions"

### 错误 3: 浏览器缓存

**症状**：修改后仍然看到旧版本

**解决**：强制刷新（Ctrl+Shift+R）或清除缓存

## 🆘 如果问题仍然存在

请提供：
1. 你实际访问的完整 URL
2. GitHub Actions 的部署日志截图
3. 浏览器控制台的完整错误信息
4. 浏览器 Network 标签页中资源加载的 URL

