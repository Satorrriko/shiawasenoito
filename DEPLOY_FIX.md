# GitHub Pages 部署路径修复说明

## 问题分析

根据错误信息：
```
Error: An error occurred trying to start process '/usr/bin/bash' with working directory '/home/runner/work/shiawasenoito/shiawasenoito/./web/shiawasenoito'. No such file or directory
```

说明：
- GitHub 仓库名是 `shiawasenoito`
- GitHub Actions 在仓库根目录运行（`/home/runner/work/shiawasenoito/shiawasenoito/`）
- 工作流试图访问 `./web/shiawasenoito`，但这个路径不存在

## 解决方案

### 情况 1：GitHub 仓库根目录就是 web 项目（推荐）

如果你的 GitHub 仓库 `shiawasenoito` 的根目录直接包含：
- `package.json`
- `vite.config.ts`
- `src/`
- `index.html`
- 等 web 项目文件

那么工作流文件 `.github/workflows/deploy.yml` 应该：
- 直接使用当前目录（`.`）作为工作目录
- **已修复**：工作流文件已更新为使用当前目录

### 情况 2：GitHub 仓库包含整个项目结构

如果你的 GitHub 仓库根目录是 `hs/`，包含：
- `hs/engine/`
- `web/shiawasenoito/`
- 等

那么需要：
1. 将工作流文件移动到仓库根目录的 `.github/workflows/`
2. 工作流中的路径使用 `web/shiawasenoito/`

## 当前修复

已更新工作流文件，假设**情况 1**（仓库根目录就是 web 项目）。

### 工作流文件位置

工作流文件应该在：
- **情况 1**：`.github/workflows/deploy.yml`（在仓库根目录）
- **情况 2**：`hs/.github/workflows/deploy.yml`（在项目根目录）

### 验证步骤

1. **检查 GitHub 仓库结构**
   - 进入你的 GitHub 仓库
   - 查看根目录是否包含 `package.json` 和 `src/` 目录

2. **检查工作流文件位置**
   - 工作流文件应该在 `.github/workflows/deploy.yml`
   - 如果不在，需要移动到正确位置

3. **检查 vite.config.ts**
   - 确认 `base: "/shiawasenoito/"` 与仓库名匹配
   - 如果仓库名不同，修改 base 路径

## 如果问题仍然存在

### 选项 A：确认仓库结构

在 GitHub 仓库中检查：
```bash
# 在仓库根目录应该看到：
package.json
vite.config.ts
src/
index.html
.github/workflows/deploy.yml
```

### 选项 B：调整工作流路径

如果仓库结构是 `hs/web/shiawasenoito/`，修改工作流：

```yaml
- name: Install dependencies
  working-directory: ./web/shiawasenoito  # 或实际路径
  run: npm ci
```

### 选项 C：使用相对路径检查

在 GitHub Actions 中添加调试步骤：

```yaml
- name: Debug - List files
  run: |
    pwd
    ls -la
    ls -la web/ 2>/dev/null || echo "web directory not found"
```

## 快速修复清单

- [x] 更新工作流文件使用当前目录
- [ ] 确认 GitHub 仓库根目录结构
- [ ] 确认 `.github/workflows/deploy.yml` 在正确位置
- [ ] 确认 `vite.config.ts` 中的 `base` 路径正确
- [ ] 推送代码并查看 Actions 日志

