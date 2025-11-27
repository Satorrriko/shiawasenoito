# 快速部署到 GitHub Pages

## 🚀 最简单的方式（推荐）

### 1. 准备工作

确保你的 GitHub 仓库已经创建，并且代码已推送。

### 2. 启用 GitHub Pages

1. 进入你的 GitHub 仓库
2. 点击 **Settings** → **Pages**
3. 在 **Source** 中选择 **"GitHub Actions"**
4. 保存

### 3. 推送代码

```bash
# 在项目根目录
git add .
git commit -m "Add GitHub Pages deployment workflow"
git push origin main
```

### 4. 等待部署完成

1. 进入仓库的 **Actions** 标签页
2. 查看 "Deploy to GitHub Pages" 工作流
3. 等待绿色对勾 ✅ 出现

### 5. 访问你的网站

部署成功后，访问：
```
https://你的用户名.github.io/仓库名/
```

例如：`https://username.github.io/hs/`

---

## 📝 如果仓库名不是 `hs`

如果你的仓库名不同，需要修改 `vite.config.ts`：

```typescript
export default defineConfig({
  plugins: [react()],
  base: "/你的仓库名/"  // 例如：base: "/my-game/"
});
```

---

## 🔧 手动部署（备选方案）

如果不想使用 GitHub Actions，可以使用 gh-pages：

```bash
cd web
npm install --save-dev gh-pages
npm run deploy
```

---

## ❓ 常见问题

**Q: 页面显示 404？**
- 检查 `vite.config.ts` 中的 `base` 路径是否正确
- 确认仓库名和 base 路径匹配

**Q: 资源加载失败？**
- 检查浏览器控制台的错误信息
- 确认所有资源路径正确

**Q: 如何更新部署？**
- 使用 GitHub Actions：直接推送代码即可
- 使用 gh-pages：运行 `npm run deploy`

