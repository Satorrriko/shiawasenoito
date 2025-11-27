import type { Coordinate, PublicState } from "./types";
import { Engine } from "./engine";

/**
 * 蓝方 AI：完全复刻 Python 版逻辑
 * - 后验枚举所有三炮台组合
 * - 用死亡历史过滤
 * - 用封锁历史过滤
 * - 异常判据（实际 kill < token 长度）
 * - MAP 选锁
 * - 逐步放宽过滤
 */
export class BlueAIAdvanced {
  decide(engine: Engine): Coordinate[] {
    const state = engine.getPublicState();
    const gridSize = state.gridSize;
    const nowRound = state.round;
    const deadHistory = state.deadHistory;
    const locksHistory = state.locksHistory;
    const deadCells = state.deadCells;

    // 1) 枚举所有三炮台组合（排除 (2,2) 与死亡格）
    const cells: Coordinate[] = [];
    for (let x = 0; x < gridSize; x++) {
      for (let y = 0; y < gridSize; y++) {
        if (x === 2 && y === 2) continue;
        let isDead = false;
        for (const dc of deadCells) {
          if (dc[0] === x && dc[1] === y) {
            isDead = true;
            break;
          }
        }
        if (!isDead) cells.push([x, y]);
      }
    }

    // 生成所有三元组合
    const allTriplets: Coordinate[][] = [];
    for (let i = 0; i < cells.length; i++) {
      for (let j = i + 1; j < cells.length; j++) {
        for (let k = j + 1; k < cells.length; k++) {
          allTriplets.push([cells[i], cells[j], cells[k]]);
        }
      }
    }

    const explainsKill = (triplet: Coordinate[], item: { target: Coordinate; mode: number }): boolean => {
      const target = item.target;
      const mode = item.mode;
      for (const t of triplet) {
        if (t[0] === target[0] && t[1] === target[1]) continue;
        if (mode === 0) {
          if (t[0] === target[0] || t[1] === target[1]) return true;
        } else {
          const dx = Math.abs(t[0] - target[0]);
          const dy = Math.abs(t[1] - target[1]);
          if (Math.max(dx, dy) === 1) return true;
        }
      }
      return false;
    };

    // 2) 用死亡历史过滤
    let filteredByDead = allTriplets.filter(trip => {
      return deadHistory.every(it => explainsKill(trip, it));
    });

    // 3) 用封锁历史过滤
    const locksSets = locksHistory.map(itm => {
      const s = new Set<string>();
      for (const c of itm.locks) s.add(`${c[0]}-${c[1]}`);
      return s;
    });

    let filteredByLocks: Coordinate[][] = [];
    for (const trip of filteredByDead) {
      const tripSet = new Set<string>();
      for (const c of trip) tripSet.add(`${c[0]}-${c[1]}`);
      let matchesAny = false;
      for (const ls of locksSets) {
        if (tripSet.size === ls.size && [...tripSet].every(k => ls.has(k)) && [...ls].every(k => tripSet.has(k))) {
          matchesAny = true;
          break;
        }
      }
      if (!matchesAny) filteredByLocks.push(trip);
    }

    let candidatesTriplets = filteredByLocks;

    // 3.5) 异常判据
    try {
      const lastLocksList = state.lastLocks;
      const tokenLen = state.lastUsedTokenLen ?? 1;
      const actualNewKills = deadHistory.filter(it => it.round === nowRound).length;
      if (actualNewKills < Math.max(0, tokenLen)) {
        const lastLockSet = new Set<string>();
        for (const c of lastLocksList) lastLockSet.add(`${c[0]}-${c[1]}`);
        const preN = candidatesTriplets.length;
        candidatesTriplets = candidatesTriplets.filter(trip => {
          for (const c of trip) {
            if (lastLockSet.has(`${c[0]}-${c[1]}`)) return true;
          }
          return false;
        });
      }
    } catch {}

    // 4) MAP 选锁：打分
    const tripletScore = (trip: Coordinate[]): number => {
      let score = 0;
      for (const it of deadHistory) {
        const target = it.target;
        const mode = it.mode;
        if (mode === 0) {
          score += trip.filter(t => !(t[0] === target[0] && t[1] === target[1]) && (t[0] === target[0] || t[1] === target[1])).length;
        } else {
          score += trip.filter(t => {
            if (t[0] === target[0] && t[1] === target[1]) return false;
            const dx = Math.abs(t[0] - target[0]);
            const dy = Math.abs(t[1] - target[1]);
            return Math.max(dx, dy) === 1;
          }).length;
        }
      }
      return score;
    };

    if (candidatesTriplets.length > 0) {
      candidatesTriplets.sort((a, b) => tripletScore(b) - tripletScore(a));
      const best = candidatesTriplets[0];
      return best.map(c => [...c] as Coordinate);
    }

    // 候选为空：逐步放宽过滤
    let relaxLevel: string | null = null;
    candidatesTriplets = filteredByLocks;
    relaxLevel = "locks_only";
    if (candidatesTriplets.length === 0) {
      candidatesTriplets = filteredByDead;
      relaxLevel = "dead_only";
    }
    if (candidatesTriplets.length === 0) {
      candidatesTriplets = allTriplets;
      relaxLevel = "no_filters";
    }

    candidatesTriplets.sort((a, b) => tripletScore(b) - tripletScore(a));
    const best = candidatesTriplets[0];
    return best.map(c => [...c] as Coordinate);
  }
}

