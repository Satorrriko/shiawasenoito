# GitHub Pages 部署指南

本文档介绍如何将 Hidden Stations Web 应用部署到 GitHub Pages。

## 方式一：使用 GitHub Actions（推荐）✨

这是自动化部署方式，每次推送到主分支时自动构建和部署。

### 前置条件

1. 确保你的仓库已启用 GitHub Pages
   - 进入仓库 Settings → Pages
   - Source 选择 "GitHub Actions"

### 部署步骤

1. **确保工作流文件已创建**
   - 文件路径：`.github/workflows/deploy.yml`
   - 如果主分支是 `master` 而不是 `main`，需要修改工作流文件中的分支名

2. **推送代码到 GitHub**
   ```bash
   git add .
   git commit -m "Add GitHub Pages deployment"
   git push origin main
   ```

3. **查看部署状态**
   - 进入仓库的 Actions 标签页
   - 查看 "Deploy to GitHub Pages" 工作流运行状态
   - 部署成功后，访问地址：`https://你的用户名.github.io/仓库名/`

### 手动触发部署

如果需要手动触发部署：
- 进入 Actions 标签页
- 选择 "Deploy to GitHub Pages" 工作流
- 点击 "Run workflow"

---

## 方式二：使用 gh-pages 包（手动部署）

### 安装依赖

```bash
cd web
npm install --save-dev gh-pages
```

### 配置仓库信息

如果仓库名不是 `hs`，需要修改 `vite.config.ts` 中的 `base` 路径：

```typescript
export default defineConfig({
  plugins: [react()],
  base: "/仓库名/"  // 例如：base: "/hs/"
});
```

### 部署

```bash
cd web
npm run deploy
```

### 首次部署需要配置

首次使用 `gh-pages` 时，可能需要配置：

```bash
git config --global user.name "你的名字"
git config --global user.email "你的邮箱"
```

---

## 访问地址

部署成功后，你的应用可以通过以下地址访问：

- **如果仓库名是 `hs`**：`https://你的用户名.github.io/hs/`
- **如果仓库在根目录**：`https://你的用户名.github.io/`

## 注意事项

1. **Base 路径配置**
   - 如果仓库名是 `hs`，且部署在 `https://用户名.github.io/hs/`，需要设置 `base: "/hs/"`
   - 如果部署在根路径 `https://用户名.github.io/`，使用 `base: "/"`
   - 当前配置为 `base: "./"` 使用相对路径，适用于子路径部署

2. **自定义域名**
   - 在仓库 Settings → Pages → Custom domain 中配置
   - 配置后需要添加 CNAME 文件

3. **404 页面**
   - GitHub Pages 是静态托管，SPA 路由需要特殊处理
   - 当前应用是单页应用，不需要额外配置

4. **更新部署**
   - 使用 GitHub Actions：推送代码即可自动部署
   - 使用 gh-pages：运行 `npm run deploy`

## 故障排查

### 部署后页面空白

1. 检查浏览器控制台错误
2. 确认 `base` 路径配置正确
3. 检查构建产物是否完整

### 资源加载失败

1. 检查 `vite.config.ts` 中的 `base` 配置
2. 确认所有资源路径使用相对路径或正确的 base 路径

### GitHub Actions 失败

1. 检查 Actions 标签页的错误信息
2. 确认 Node.js 版本兼容
3. 检查依赖安装是否成功

## 相关文件

- `.github/workflows/deploy.yml` - GitHub Actions 工作流配置
- `vite.config.ts` - Vite 构建配置（包含 base 路径）
- `package.json` - 包含部署脚本

