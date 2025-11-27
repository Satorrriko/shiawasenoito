import type { Coordinate, PublicState } from "./types";
import { Engine } from "./engine";

/**
 * 红方 AI：完全复刻 Python 版逻辑
 * - token 随机选择（若启用）
 * - 模式序列随机化
 * - 最大匹配算法保证理论最大命中
 */
export class RedAIAdvanced {
  private tokenPickRandom: boolean;
  private turretPickIndex: number = 0;

  constructor(opts?: { randomizeTokens?: boolean }) {
    this.tokenPickRandom = opts?.randomizeTokens ?? false;
  }

  chooseStrategyToken(state: PublicState): string | null {
    const tokens = state.strategyTokensRemaining;
    if (!tokens || tokens.length === 0) {
      return null;
    }
    const picked = this.tokenPickRandom
      ? tokens[Math.floor(Math.random() * tokens.length)]
      : tokens[0];
    return picked;
  }

  decide(engine: Engine): { actions?: Array<{ turretIndex: number; target: Coordinate; mode: 0 | 1 }>; strategyToken?: string | null } | { turretIndex: number; mode: 0 | 1; target: Coordinate } {
    const state = engine.getPublicState();
    const gridSize = state.gridSize;
    const deadCells = state.deadCells;
    const forbidden = new Set<string>();
    for (const c of deadCells) forbidden.add(`${c[0]}-${c[1]}`);
    // 注意：允许攻击被封锁的格子，所以不将封锁格子加入forbidden

    const turrets = engine.revealTurrets();
    const turretSet = new Set<string>();
    for (const t of turrets) turretSet.add(`${t[0]}-${t[1]}`);

    const computeCovered = (mode: 0 | 1, turret: Coordinate): Coordinate[] => {
      if (mode === 0) {
        const [x, y] = turret;
        const res: Coordinate[] = [];
        for (let yy = 0; yy < gridSize; yy++) res.push([x, yy]);
        for (let xx = 0; xx < gridSize; xx++) res.push([xx, y]);
        return res.filter(c => !(c[0] === turret[0] && c[1] === turret[1]));
      }
      const [x, y] = turret;
      const res: Coordinate[] = [];
      for (const dx of [-1, 0, 1]) {
        for (const dy of [-1, 0, 1]) {
          if (dx === 0 && dy === 0) continue;
          const xx = x + dx;
          const yy = y + dy;
          if (xx >= 0 && xx < gridSize && yy >= 0 && yy < gridSize) {
            res.push([xx, yy]);
          }
        }
      }
      return res;
    };

    const turretsLocked = state.turretsLocked ?? [false, false, false];
    const availableIndices = turretsLocked.map((locked, i) => (!locked ? i : -1)).filter(i => i >= 0);

    const legalTargetsFor = (turretIndex: number, mode: 0 | 1): Coordinate[] => {
      const turret = turrets[turretIndex];
      const covered = computeCovered(mode, turret);
      return covered.filter(c => {
        const key = `${c[0]}-${c[1]}`;
        return !forbidden.has(key) && !turretSet.has(key);
      });
    };

    const token = this.chooseStrategyToken(state);
    if (token) {
      const modes: (0 | 1)[] = [...token].map(ch => (ch === "1" ? 1 : 0));
      // 随机化模式顺序
      for (let i = modes.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [modes[i], modes[j]] = [modes[j], modes[i]];
      }

      // 建立可行边：模式位 -> 炮台（存在合法目标）
      const legalMap = new Map<string, Coordinate[]>();
      for (let pos = 0; pos < modes.length; pos++) {
        const m = modes[pos];
        for (const tIdx of availableIndices) {
          const lt = legalTargetsFor(tIdx, m);
          if (lt.length > 0) {
            legalMap.set(`${pos}-${tIdx}`, lt);
          }
        }
      }

      // 最大匹配（回溯）
      let bestAssign: Array<[number, number]> = [];

      const dfs = (posIdx: number, usedTurrets: Set<number>, cur: Array<[number, number]>): void => {
        if (posIdx >= modes.length) {
          if (cur.length > bestAssign.length) {
            bestAssign = [...cur];
          }
          return;
        }

        const candidates: number[] = [];
        for (const tIdx of availableIndices) {
          if (!usedTurrets.has(tIdx) && legalMap.has(`${posIdx}-${tIdx}`)) {
            candidates.push(tIdx);
          }
        }
        // 随机打乱候选
        for (let i = candidates.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [candidates[i], candidates[j]] = [candidates[j], candidates[i]];
        }

        let assigned = false;
        for (const t of candidates) {
          cur.push([posIdx, t]);
          usedTurrets.add(t);
          dfs(posIdx + 1, usedTurrets, cur);
          usedTurrets.delete(t);
          cur.pop();
          assigned = true;
        }
        if (!assigned) {
          dfs(posIdx + 1, usedTurrets, cur);
        }
      };

      dfs(0, new Set(), []);

      const actions: Array<{ turretIndex: number; target: Coordinate; mode: 0 | 1 }> = [];
      for (const [pos, tIdx] of bestAssign) {
        const mode = modes[pos];
        const lt = legalMap.get(`${pos}-${tIdx}`);
        if (!lt || lt.length === 0) continue;
        const target = lt[Math.floor(Math.random() * lt.length)];
        actions.push({ turretIndex: tIdx, target, mode });
      }

      return { actions, strategyToken: token };
    }

    // 无 token：选择任一存在合法目标的 (炮台, 模式)
    const viablePairs: Array<[number, 0 | 1, Coordinate[]]> = [];
    for (const m of [0, 1] as const) {
      for (const tIdx of availableIndices) {
        const lt = legalTargetsFor(tIdx, m);
        if (lt.length > 0) {
          viablePairs.push([tIdx, m, lt]);
        }
      }
    }

    if (viablePairs.length > 0) {
      const [tIdx, mode, lt] = viablePairs[Math.floor(Math.random() * viablePairs.length)];
      const target = lt[Math.floor(Math.random() * lt.length)];
      return { turretIndex: tIdx, mode, target };
    }

    // 极端兜底
    for (const tIdx of availableIndices) {
      for (const m of [0, 1] as const) {
        const covered = computeCovered(m, turrets[tIdx]);
        const fallback = covered.filter(c => !turretSet.has(`${c[0]}-${c[1]}`));
        if (fallback.length > 0) {
          const target = fallback[Math.floor(Math.random() * fallback.length)];
          return { turretIndex: tIdx, mode: m, target };
        }
      }
    }

    return { turretIndex: 0, mode: 0, target: [0, 0] };
  }
}

