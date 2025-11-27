import type { Coordinate, PublicState } from "./types";
import { Engine } from "./engine";

export type Mode = 0 | 1;

// 非训练版简单 AI：随机但规则正确

export class RedSimpleAI {
  /**
   * 简单批量策略：让所有未被封锁的炮台各自随机选择一个模式与目标。
   * 返回 actions 列表，供 Engine.killBatch 使用。
   */
  decide(engine: Engine): { actions: { turretIndex: number; mode: Mode; target: Coordinate }[] } {
    const state = engine.getPublicState();
    const gridSize = state.gridSize;
    const dead = new Set(state.deadCells.map(c => `${c[0]}-${c[1]}`));
    // 注意：允许攻击被封锁的格子，所以不需要过滤lastLocks
    const turrets = engine.revealTurrets();
    const turretsLocked = state.turretsLocked ?? [false, false, false];

    const actions: { turretIndex: number; mode: Mode; target: Coordinate }[] = [];

    for (let turretIndex = 0; turretIndex < turrets.length; turretIndex++) {
      if (turretsLocked[turretIndex]) continue;
      const turret = turrets[turretIndex];
      const mode: Mode = Math.random() < 0.5 ? 0 : 1;

      const covered: Coordinate[] = [];
      if (mode === 0) {
        for (let i = 0; i < gridSize; i++) covered.push([turret[0], i] as Coordinate);
        for (let i = 0; i < gridSize; i++) covered.push([i, turret[1]] as Coordinate);
      } else {
        for (let dx of [-1, 0, 1]) {
          for (let dy of [-1, 0, 1]) {
            if (dx === 0 && dy === 0) continue;
            const xx = turret[0] + dx;
            const yy = turret[1] + dy;
            if (xx >= 0 && xx < gridSize && yy >= 0 && yy < gridSize) covered.push([xx, yy] as Coordinate);
          }
        }
      }
      const legal = covered.filter(c => {
        const key = `${c[0]}-${c[1]}`;
        // 允许攻击被封锁的格子，只过滤死亡格
        return !dead.has(key);
      });
      if (covered.length === 0) continue;
      const pool = legal.length ? legal : covered;
      const target = pool[Math.floor(Math.random() * pool.length)];
      actions.push({ turretIndex, mode, target });
    }

    return { actions };
  }
}

export class BlueSimpleAI {
  decide(engine: Engine): Coordinate[] {
    const state: PublicState = engine.getPublicState();
    const gridSize = state.gridSize;
    const dead = new Set(state.deadCells.map(c => `${c[0]}-${c[1]}`));

    // 启发式：优先封锁死亡格周围的格子，否则随机选 3 个不同格
    const scores = new Map<string, number>();
    for (let x = 0; x < gridSize; x++) {
      for (let y = 0; y < gridSize; y++) {
        scores.set(`${x}-${y}`, 0);
      }
    }
    for (const [dx, dy] of state.deadCells) {
      for (let ddx of [-1, 0, 1]) {
        for (let ddy of [-1, 0, 1]) {
          const xx = dx + ddx;
          const yy = dy + ddy;
          if (xx < 0 || xx >= gridSize || yy < 0 || yy >= gridSize) continue;
          const key = `${xx}-${yy}`;
          scores.set(key, (scores.get(key) ?? 0) + 1);
        }
      }
    }
    // 中心与死亡格给极低分
    scores.set(`2-2`, -1e9);
    for (const [x, y] of state.deadCells) {
      scores.set(`${x}-${y}`, -1e9);
    }

    const cells: { coord: Coordinate; score: number }[] = [];
    scores.forEach((v, k) => {
      const [sx, sy] = k.split("-").map(Number);
      cells.push({ coord: [sx, sy], score: v });
    });
    cells.sort((a, b) => b.score - a.score);

    const picks: Coordinate[] = [];
    for (const c of cells) {
      if (picks.length >= 3) break;
      const key = `${c.coord[0]}-${c.coord[1]}`;
      if (dead.has(key)) continue;
      if (c.coord[0] === 2 && c.coord[1] === 2) continue;
      if (!picks.some(p => p[0] === c.coord[0] && p[1] === c.coord[1])) picks.push(c.coord);
    }
    // 补齐
    for (let x = 0; x < gridSize && picks.length < 3; x++) {
      for (let y = 0; y < gridSize && picks.length < 3; y++) {
        const key = `${x}-${y}`;
        if (dead.has(key)) continue;
        if (x === 2 && y === 2) continue;
        if (!picks.some(p => p[0] === x && p[1] === y)) picks.push([x, y]);
      }
    }
    return picks;
  }
}


