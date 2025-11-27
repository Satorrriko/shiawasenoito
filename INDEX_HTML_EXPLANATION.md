# index.html 路径说明

## ⚠️ 重要：不要手动修改 index.html 中的路径

### 为什么？

`index.html` 中的路径应该保持为 `/src/main.tsx`，原因如下：

### 1. 开发模式 vs 生产模式

- **开发模式** (`npm run dev`)：
  - Vite 开发服务器在根路径运行
  - 路径 `/src/main.tsx` 指向源代码
  - 如果改为 `shiawasenoito/src/main.tsx`，开发服务器会找不到文件

- **生产模式** (`npm run build`)：
  - Vite 会根据 `vite.config.ts` 中的 `base` 配置**自动处理**路径
  - 构建后的 `dist/index.html` 会自动包含正确的路径

### 2. Vite 的自动路径处理

当你运行 `npm run build` 时：

**输入** (`index.html`):
```html
<script type="module" src="/src/main.tsx"></script>
```

**输出** (`dist/index.html`):
```html
<script type="module" crossorigin src="/shiawasenoito/assets/index-xxx.js"></script>
```

Vite 会：
1. 读取 `vite.config.ts` 中的 `base: "/shiawasenoito/"`
2. 将源代码打包到 `assets/` 目录
3. 自动更新 `index.html` 中的路径为 `/shiawasenoito/assets/...`

### 3. 如果手动修改会发生什么？

❌ **错误修改**：
```html
<script type="module" src="shiawasenoito/src/main.tsx"></script>
```

会导致：
- ❌ 开发模式无法工作（找不到文件）
- ❌ 构建时路径变成 `/shiawasenoito/shiawasenoito/assets/...`（双重路径）
- ❌ 生产环境 404 错误

### 4. 正确的配置方式

✅ **保持 index.html 原样**：
```html
<script type="module" src="/src/main.tsx"></script>
```

✅ **在 vite.config.ts 中配置 base**：
```typescript
export default defineConfig({
  plugins: [react()],
  base: "/shiawasenoito/"  // 这里配置路径前缀
});
```

Vite 会自动处理一切！

## 📝 总结

- ✅ **不要**手动修改 `index.html` 中的路径
- ✅ **保持** `/src/main.tsx` 这样的绝对路径
- ✅ **配置** `vite.config.ts` 中的 `base` 选项
- ✅ **让 Vite 自动处理**构建时的路径转换

## 🔍 验证

运行构建后检查 `dist/index.html`：
```bash
npm run build
cat dist/index.html
```

应该看到路径包含 `/shiawasenoito/assets/...`，而不是源代码路径。

