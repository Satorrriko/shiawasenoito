## Hidden Stations Web V1

一个基于 React + Vite 的前端版本，用于在浏览器中试玩 Hidden Stations。

当前功能（V1）：

- 棋盘可视化（5x5，支持调试显示炮台位置）
- 模式切换：
  - **红方（人） vs 蓝方 AI**
  - **蓝方（人，预留） vs 红方 AI（简单版）**
  - **AI vs AI** 演示
- 简化版引擎（`src/game/engine.ts`）：
  - 支持随机生成 3 个炮台（隐藏）
  - 支持红方单次 `kill(mode, turretIndex, target)` 行为
  - 支持蓝方 `monitor(locks)` 封锁并判定输赢
- 简单 AI（`src/game/simpleAIs.ts`）：
  - 红方：随机选择炮台、模式和合法目标（不攻击封锁格/死亡格）
  - 蓝方：根据死亡格周围加分的启发式选 3 个封锁点

> 注意：这里的 JS 版引擎是**轻量实现**，并未完全复制 Python 版本中所有高级特性（如策略牌 token、复杂 AI）。未来版本会逐步对齐。

---

### 本地启动

```bash
cd web
npm install   # 或 pnpm install / yarn
npm run dev
```

浏览器访问日志中提示的本地地址（通常为 `http://localhost:5173`）。

---

### 构建与部署到 GitHub Pages

1. 在 `web/vite.config.ts` 中按你的仓库名设置 `base`（例如仓库名为 `hs`，则可以改为：）

   ```ts
   export default defineConfig({
     plugins: [react()],
     base: "/hs/"
   });
   ```

2. 构建静态文件：

   ```bash
   cd web
   npm run build
   ```

   生成的静态文件位于 `web/dist/`。

3. 部署到 GitHub Pages：

   - 方法 A：单独建一个 `gh-pages` 分支，将 `web/dist` 的内容推上去。
   - 方法 B：在根仓库配置 GitHub Actions，将 `web/dist` 自动发布到 Pages（可在后续版本补充 CI 脚本）。

---

### 未来更新路径（Roadmap）

短期（V1.x）：

- **规则对齐**：将 Python 版 `Engine` 的完整规则（包括策略牌 token、批量 kill、状态公开字段）迁移到 TypeScript：
  - 新建 `src/game/advancedEngine.ts`，尽量与 `hs/engine/engine.py` 对齐。
  - 增加回合历史（dead_history / locks_history）的可视化。
- **AI 对齐**：
  - 将 Python 版 `RedAI` / `BlueAI`（尤其是蓝方后验推断逻辑）迁移到前端，作为“专家 AI”。
  - 在 UI 中提供“简单 AI / 高级 AI”切换。

中期（V2）：

- **在线对战 / P2P 模式**：
  - 在完全前端的前提下，引入 WebRTC + 第三方信令（如 `peerjs` 云服务），支持：
    - 创建房间 / 加入房间
    - 实时同步红蓝方行动
  - 或者使用 Firebase / Supabase Realtime 等做“云状态同步”方案（非严格 P2P，但体验类似在线对战）。

长期（V3）：

- **训练可视化与重放**：
  - 在 Web 前端展示自博弈数据（如你现在的 `result*.txt`），以图表方式显示胜率、平均回合数等。
  - 支持回放指定对局（step by step 浏览每回合的 kill / monitor 行为与 AI 内部推断）。
  - 为未来的 RL / 蒸馏模型预留接口（例如从后端获取策略 logits / value 曲线并可视化）。

---

### 与 Python 引擎的关系

- 当前 Python 代码（`hs/engine/*.py`）仍是“研究/训练版”：
  - 高级 AI 与日志都在这里，适合做大量自博弈、调参和训练。
- `web/src/game/*` 是“演示/交互版”：
  - 先保证玩家体验和基本规则正确，再逐步迁移高级算法。

建议的迭代策略：

1. 保持 Python 端迭代你的 AI 和规则（离线仿真为主）。
2. 每稳定一个版本，就挑选关键部分迁移到 `web/`，并在 README 中标注“已对齐到 Python 版本 X 的哪些特性”。


