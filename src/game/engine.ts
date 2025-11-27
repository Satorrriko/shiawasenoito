import type { Coordinate, Player, PublicState } from "./types";

const GRID_SIZE = 5;
const MAX_ROUNDS = 5;

type StrategyToken = string;

export interface KillResult {
  ok: boolean;
  killed: boolean;
  reason?: string;
  detailedLog?: {
    round: number;
    turretIndex: number;
    turret: Coordinate;
    mode: number;
    target: Coordinate;
    isKill: boolean;
    reason: string;
    timestamp: string;
  };
}

export interface KillBatchActionResult {
  turretIndex: number;
  target: Coordinate;
  mode: 0 | 1;
  killed: boolean;
  turret?: Coordinate;
  coveredTargets?: Coordinate[];
}

export interface KillBatchResult {
  ok: boolean;
  actions: KillBatchActionResult[];
  reason?: string;
}

export interface MonitorResult {
  ok: boolean;
  winner: Player | null;
  round: number;
  reason?: string;
}

export class Engine {
  private gridSize: number = GRID_SIZE;
  private turrets: Coordinate[] = [];
  private currentRound = 1;
  private lastLocks: Set<string> = new Set();
  private deadCells: Set<string> = new Set();
  private gameOver = false;
  private winner: Player | null = null;
  private strategyTokensInitial: StrategyToken[] | null = null;
  private strategyTokensRemaining: StrategyToken[] | null = null;
  private didKillThisRound = false;
  private deadHistory: { round: number; target: Coordinate; mode: number }[] = [];
  private locksHistory: { round: number; locks: Coordinate[] }[] = [];
  private lastUsedTokenLen: number | null = null;
  private detailedLogs: Array<{
    round: number;
    turretIndex: number;
    turret: Coordinate;
    mode: number;
    target: Coordinate;
    isKill: boolean;
    reason: string;
    timestamp: string;
  }> = []; // 详细对局日志
  private turretsUsedThisRound: boolean[] = [false, false, false]; // 跟踪每个炮台本回合是否已使用

  constructor(opts?: { turrets?: Coordinate[]; strategyTokens?: StrategyToken[] }) {
    this.reset(opts);
  }

  reset(opts?: { turrets?: Coordinate[]; strategyTokens?: StrategyToken[] }) {
    const { turrets, strategyTokens } = opts ?? {};
    this.currentRound = 1;
    this.lastLocks = new Set();
    this.deadCells = new Set();
    // (2,2) 初始为死亡格
    this.deadCells.add(this.keyOf([2, 2]));
    this.gameOver = false;
    this.winner = null;
    this.didKillThisRound = false;
    this.deadHistory = [];
    this.locksHistory = [];
    this.lastUsedTokenLen = null;
    this.detailedLogs = [];
    this.turretsUsedThisRound = [false, false, false];

    if (turrets) {
      this.validateTurrets(turrets);
      this.turrets = turrets.map(c => [...c] as Coordinate);
    } else {
      this.turrets = this.generateRandomTurrets();
    }

    if (strategyTokens) {
      this.validateStrategyTokens(strategyTokens);
      this.strategyTokensInitial = [...strategyTokens];
      this.strategyTokensRemaining = [...strategyTokens];
    } else {
      this.strategyTokensInitial = null;
      this.strategyTokensRemaining = null;
    }
  }

  private keyOf(c: Coordinate): string {
    return `${c[0]}-${c[1]}`;
  }

  private generateRandomTurrets(): Coordinate[] {
    const coords: Coordinate[] = [];
    for (let x = 0; x < this.gridSize; x++) {
      for (let y = 0; y < this.gridSize; y++) {
        if (x === 2 && y === 2) continue;
        coords.push([x, y]);
      }
    }
    for (let i = coords.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [coords[i], coords[j]] = [coords[j], coords[i]];
    }
    return coords.slice(0, 3);
  }

  private ensureGameRunning() {
    if (this.gameOver) throw new Error("game_over");
  }

  private validateCoordinate(coord: Coordinate) {
    const [x, y] = coord;
    if (x < 0 || x >= this.gridSize || y < 0 || y >= this.gridSize) {
      throw new Error("coordinate_out_of_bounds");
    }
  }

  private validateTurrets(turrets: Coordinate[]) {
    if (turrets.length !== 3) throw new Error("turrets_must_be_length_3");
    const seen = new Set<string>();
    for (const c of turrets) {
      this.validateCoordinate(c);
      if (c[0] === 2 && c[1] === 2) throw new Error("turret_cannot_be_at_22");
      const k = this.keyOf(c);
      if (seen.has(k)) throw new Error("turret_coordinates_must_be_unique");
      seen.add(k);
    }
  }

  private validateStrategyTokens(tokens: StrategyToken[]) {
    if (tokens.length !== 5) throw new Error("strategy_tokens_must_be_length_5");
    for (const t of tokens) {
      if (!t || (t[0] !== "0" && t[0] !== "1")) throw new Error("invalid_strategy_token_item");
    }
  }

  private validateTurretIndex(turretIndex: number) {
    if (!(turretIndex >= 0 && turretIndex < 3)) throw new Error("turret_index_out_of_range");
  }

  private isCrossKill(turret: Coordinate, target: Coordinate): boolean {
    return turret[0] === target[0] || turret[1] === target[1];
  }

  private isRoundKill(turret: Coordinate, target: Coordinate): boolean {
    const dx = Math.abs(turret[0] - target[0]);
    const dy = Math.abs(turret[1] - target[1]);
    return Math.max(dx, dy) === 1;
  }

  private computeCoveredTargets(mode: 0 | 1, turret: Coordinate): Coordinate[] {
    const res: Coordinate[] = [];
    if (mode === 0) {
      const [x, y] = turret;
      for (let yy = 0; yy < this.gridSize; yy++) res.push([x, yy]);
      for (let xx = 0; xx < this.gridSize; xx++) res.push([xx, y]);
      return res.filter(c => !(c[0] === turret[0] && c[1] === turret[1]));
    }
    const [x, y] = turret;
    for (let dx of [-1, 0, 1]) {
      for (let dy of [-1, 0, 1]) {
        if (dx === 0 && dy === 0) continue;
        const xx = x + dx;
        const yy = y + dy;
        if (xx >= 0 && xx < this.gridSize && yy >= 0 && yy < this.gridSize) {
          res.push([xx, yy]);
        }
      }
    }
    return res;
  }

  getPublicState(): PublicState {
    const lastLocksArr = Array.from(this.lastLocks).map(k => {
      const [sx, sy] = k.split("-").map(Number);
      return [sx, sy] as Coordinate;
    });
    const deadArr = Array.from(this.deadCells).map(k => {
      const [sx, sy] = k.split("-").map(Number);
      return [sx, sy] as Coordinate;
    });
    let turretsLocked: boolean[] | null = null;
    if (!this.gameOver) {
      turretsLocked = this.turrets.map(t => this.lastLocks.has(this.keyOf(t)));
    } else {
      turretsLocked = [false, false, false];
    }
    // 计算当前回合应该使用的token（基于初始token列表和当前回合）
    let currentRoundToken: string | null = null;
    if (this.strategyTokensInitial && this.currentRound >= 1 && this.currentRound <= this.strategyTokensInitial.length) {
      const tokenIndex = this.currentRound - 1; // 回合从1开始，索引从0开始
      const token = this.strategyTokensInitial[tokenIndex];
      // 检查该token是否还在剩余列表中（未被使用）
      if (this.strategyTokensRemaining && this.strategyTokensRemaining.includes(token)) {
        currentRoundToken = token;
      }
    }

    return {
      gridSize: this.gridSize,
      round: this.currentRound,
      lastLocks: lastLocksArr,
      deadCells: deadArr,
      gameOver: this.gameOver,
      winner: this.winner,
      strategyTokensRemaining: this.strategyTokensRemaining ? [...this.strategyTokensRemaining] : null,
      currentRoundToken,
      turretsLocked,
      deadHistory: [...this.deadHistory],
      locksHistory: [...this.locksHistory],
      lastUsedTokenLen: this.lastUsedTokenLen,
      turretsUsedThisRound: [...this.turretsUsedThisRound]
    };
  }

  revealTurrets(): Coordinate[] {
    return this.turrets.map(t => [...t] as Coordinate);
  }

  isGameOver(): boolean {
    return this.gameOver;
  }

  // 消耗token而不执行kill（用于无可用炮台的情况）
  consumeToken(token: StrategyToken): boolean {
    if (!this.strategyTokensRemaining) {
      return false;
    }
    const idx = this.strategyTokensRemaining.indexOf(token);
    if (idx >= 0) {
      this.strategyTokensRemaining.splice(idx, 1);
      this.lastUsedTokenLen = token.length;
      this.didKillThisRound = true; // 标记本轮完成
      return true;
    }
    return false;
  }

  getDetailedLogs(): Array<{
    round: number;
    turretIndex: number;
    turret: Coordinate;
    mode: number;
    target: Coordinate;
    isKill: boolean;
    reason: string;
    timestamp: string;
  }> {
    return [...this.detailedLogs];
  }

  exportGameLog(): string {
    const logs: string[] = [];
    logs.push("=== Hidden Stations 对局详细日志 ===\n");
    logs.push(`生成时间: ${new Date().toLocaleString('zh-CN')}\n`);
    logs.push(`炮台位置: ${this.turrets.map((t, i) => `炮台${i}=(${t[0]},${t[1]})`).join(", ")}\n`);
    logs.push(`初始策略牌: ${this.strategyTokensInitial?.join(", ") || "无"}\n`);
    logs.push("\n=== 详细行动记录 ===\n");
    
    for (const log of this.detailedLogs) {
      logs.push(`[回合 ${log.round}] ${log.timestamp}`);
      logs.push(`  炮台${log.turretIndex}(${log.turret[0]},${log.turret[1]}) 模式${log.mode === 0 ? "cross" : "round"} 目标(${log.target[0]},${log.target[1]})`);
      logs.push(`  命中: ${log.isKill}`);
      logs.push(`  判定: ${log.reason}`);
      logs.push("");
    }
    
    logs.push("\n=== 死亡历史 ===\n");
    for (const entry of this.deadHistory) {
      logs.push(`回合${entry.round}: 目标(${entry.target[0]},${entry.target[1]}) 模式${entry.mode === 0 ? "cross" : "round"}`);
    }
    
    logs.push("\n=== 封锁历史 ===\n");
    for (const entry of this.locksHistory) {
      logs.push(`回合${entry.round}: ${entry.locks.map(c => `(${c[0]},${c[1]})`).join(", ")}`);
    }
    
    logs.push(`\n=== 游戏结束 ===\n`);
    logs.push(`胜者: ${this.winner || "未结束"}`);
    logs.push(`总回合数: ${this.currentRound}`);
    
    return logs.join("\n");
  }

  kill(opts: {
    mode?: 0 | 1;
    target: Coordinate;
    turretIndex: number;
    strategyToken?: StrategyToken | null;
  }): KillResult {
    this.ensureGameRunning();
    const { mode, target, turretIndex, strategyToken } = opts;
    
    // 只有在以下情况才检查 kill_already_done_this_round：
    // 1. 已经完成本轮 kill（didKillThisRound = true）
    // 2. 且不是逐步消耗 token 的过程（传了 strategyToken 或未启用策略牌）
    if (this.didKillThisRound) {
      // 如果是在逐步消耗 token 过程中（没传 token 但启用了策略牌），允许继续
      if (this.strategyTokensRemaining && !strategyToken) {
        // 允许继续，这是逐步消耗过程
      } else {
        return { ok: false, killed: false, reason: "kill_already_done_this_round" };
      }
    }

    this.validateCoordinate(target);
    this.validateTurretIndex(turretIndex);

    // 检查炮台是否已在本回合使用过
    if (this.turretsUsedThisRound[turretIndex]) {
      return { ok: false, killed: false, reason: "turret_already_used_this_round" };
    }

    // 注意：红方可以攻击被封锁的格子，所以不检查封锁状态

    let effectiveMode: 0 | 1 | undefined = mode;
    if (this.strategyTokensRemaining) {
      if (strategyToken) {
        // 传了token：验证token是否可用，但使用用户选择的mode（不是token的第一个字符）
        if (!this.strategyTokensRemaining.includes(strategyToken)) {
          return { ok: false, killed: false, reason: "strategy_token_not_available" };
        }
        if (!strategyToken || strategyToken.length === 0 || [...strategyToken].some(ch => ch !== "0" && ch !== "1")) {
          return { ok: false, killed: false, reason: "invalid_strategy_token" };
        }
        // 使用用户传入的mode，而不是token的第一个字符
        if (mode === undefined || (mode !== 0 && mode !== 1)) {
          return { ok: false, killed: false, reason: "mode_required_when_using_token" };
        }
        effectiveMode = mode;
      } else {
        // 如果没有传token但启用了策略牌，且提供了mode，允许使用（逐步消耗模式）
        if (mode === undefined || (mode !== 0 && mode !== 1)) {
          return { ok: false, killed: false, reason: "strategy_token_required_or_mode_required" };
        }
        effectiveMode = mode;
      }
    }
    if (effectiveMode !== 0 && effectiveMode !== 1) {
      return { ok: false, killed: false, reason: "invalid_mode" };
    }

    const turret = this.turrets[turretIndex];
    let isKill = effectiveMode === 0 ? this.isCrossKill(turret, target) : this.isRoundKill(turret, target);
    let killReason = "";
    
    // 详细日志：记录判定过程
    if (effectiveMode === 0) {
      const sameRow = turret[0] === target[0];
      const sameCol = turret[1] === target[1];
      killReason = `cross模式: 炮台(${turret[0]},${turret[1]}) 目标(${target[0]},${target[1]}) 同行=${sameRow} 同列=${sameCol}`;
    } else {
      const dx = Math.abs(turret[0] - target[0]);
      const dy = Math.abs(turret[1] - target[1]);
      const isAdjacent = Math.max(dx, dy) === 1;
      killReason = `round模式: 炮台(${turret[0]},${turret[1]}) 目标(${target[0]},${target[1]}) dx=${dx} dy=${dy} 相邻=${isAdjacent}`;
    }
    
    // 自身坐标不可被杀以及友方坐标不可被杀
    if (isKill && target[0] === turret[0] && target[1] === turret[1]) {
      isKill = false;
      killReason += " -> 自身坐标，取消命中";
    }
    if (isKill && this.turrets.some(t => t[0] === target[0] && t[1] === target[1])) {
      isKill = false;
      killReason += " -> 友军坐标，取消命中";
    }
    
    // 标记炮台为已使用
    this.turretsUsedThisRound[turretIndex] = true;

    // 将详细日志存储
    const detailedLog = {
      round: this.currentRound,
      turretIndex,
      turret: [...turret] as Coordinate,
      mode: effectiveMode,
      target: [...target] as Coordinate,
      isKill,
      reason: killReason,
      timestamp: new Date().toISOString()
    };
    this.detailedLogs.push(detailedLog);
    if (isKill) {
      this.deadCells.add(this.keyOf(target));
      this.deadHistory.push({ round: this.currentRound, target: [...target] as Coordinate, mode: effectiveMode });
    }
    
    // 只有在以下情况才设置 didKillThisRound = true：
    // 1. 传了 strategyToken（最后一次 kill，消耗 token）
    // 2. 未启用策略牌（单次 kill）
    if (this.strategyTokensRemaining && strategyToken) {
      // 传了 token：这是最后一次 kill，消耗 token 并标记本轮完成
      const idx = this.strategyTokensRemaining.indexOf(strategyToken);
      if (idx >= 0) this.strategyTokensRemaining.splice(idx, 1);
      this.lastUsedTokenLen = strategyToken.length;
      this.didKillThisRound = true;
    } else if (!this.strategyTokensRemaining) {
      // 未启用策略牌：单次 kill，立即标记完成
      this.lastUsedTokenLen = 1;
      this.didKillThisRound = true;
    } else {
      // 逐步消耗 token：不传 token，不标记完成，允许继续 kill
      this.lastUsedTokenLen = 1;
      // 不设置 didKillThisRound，允许继续
    }
    return { 
      ok: true, 
      killed: isKill, 
      reason: isKill ? "killed" : "not_in_kill_condition",
      detailedLog // 返回详细日志
    };
  }

  /** 同一回合内对多个炮台执行攻击动作（批量），完全复刻 Python 逻辑 */
  killBatch(opts: {
    actions: { turretIndex: number; target: Coordinate; mode?: 0 | 1 }[];
    strategyToken?: StrategyToken | null;
  }): KillBatchResult {
    this.ensureGameRunning();
    if (this.didKillThisRound) {
      return { ok: false, actions: [], reason: "kill_already_done_this_round" };
    }

    const { actions, strategyToken } = opts;
    if (!actions || actions.length === 0) {
      return { ok: false, actions: [], reason: "empty_actions" };
    }

    // 校验与准备 token / 模式池
    let modePool: (0 | 1)[] | null = null;
    if (this.strategyTokensRemaining) {
      if (!strategyToken) {
        return { ok: false, actions: [], reason: "strategy_token_required" };
      }
      if (!this.strategyTokensRemaining.includes(strategyToken)) {
        return { ok: false, actions: [], reason: "strategy_token_not_available" };
      }
      if (strategyToken.length === 0 || [...strategyToken].some(ch => ch !== "0" && ch !== "1")) {
        return { ok: false, actions: [], reason: "invalid_strategy_token" };
      }
      modePool = [...strategyToken].map(ch => (ch === "1" ? 1 : 0));
    }

    // 过滤可用炮台（未被封锁的）
    const availableIndices: number[] = [];
    for (let idx = 0; idx < this.turrets.length; idx++) {
      if (!this.lastLocks.has(this.keyOf(this.turrets[idx]))) {
        availableIndices.push(idx);
      }
    }

    // 逐行动校验并填充 mode
    const filledActions: { turretIndex: number; target: Coordinate; mode: 0 | 1 }[] = [];
    const tmpModePool = modePool ? [...modePool] : null;

    for (const a of actions) {
      if (!a || typeof a !== "object") {
        return { ok: false, actions: [], reason: "invalid_action_item" };
      }
      if (typeof a.turretIndex !== "number" || !a.target) {
        return { ok: false, actions: [], reason: "action_missing_fields" };
      }

      const turretIndex = a.turretIndex;
      const target = a.target;
      let mode = a.mode;

      try {
        this.validateTurretIndex(turretIndex);
        this.validateCoordinate(target);
      } catch (e) {
        return { ok: false, actions: [], reason: String(e) };
      }

      if (!availableIndices.includes(turretIndex)) {
        return { ok: false, actions: [], reason: "turret_locked" };
      }

      if (this.strategyTokensRemaining === null) {
        // 未启用策略牌，要求给出 mode
        if (mode !== 0 && mode !== 1) {
          return { ok: false, actions: [], reason: "invalid_mode" };
        }
      } else {
        // 启用策略牌，使用 token 模式池
        if (mode === undefined) {
          if (!tmpModePool || tmpModePool.length === 0) {
            return { ok: false, actions: [], reason: "no_mode_left_in_token" };
          }
          mode = tmpModePool.shift()!;
        } else {
          if (mode !== 0 && mode !== 1) {
            return { ok: false, actions: [], reason: "invalid_mode" };
          }
          // 消耗匹配的 mode
          if (!tmpModePool) {
            return { ok: false, actions: [], reason: "mode_provided_but_token_disabled" };
          }
          const idx = tmpModePool.indexOf(mode);
          if (idx < 0) {
            return { ok: false, actions: [], reason: "mode_exceeds_token_quota" };
          }
          tmpModePool.splice(idx, 1);
        }
      }

      filledActions.push({ turretIndex, target, mode: mode! });
    }

    // 执行每个动作
    const perActionResults: KillBatchActionResult[] = [];
    for (const item of filledActions) {
      const { turretIndex, target, mode } = item;
      const turret = this.turrets[turretIndex];
      const coveredTargets = this.computeCoveredTargets(mode, turret);
      let isKill = mode === 0 ? this.isCrossKill(turret, target) : this.isRoundKill(turret, target);

      // 自身坐标不可被杀以及友方坐标不可被杀
      if (isKill && target[0] === turret[0] && target[1] === turret[1]) {
        isKill = false;
      }
      if (isKill && this.turrets.some(t => t[0] === target[0] && t[1] === target[1])) {
        isKill = false;
      }

      if (isKill) {
        this.deadCells.add(this.keyOf(target));
        this.deadHistory.push({
          round: this.currentRound,
          target: [...target] as Coordinate,
          mode
        });
      }

      perActionResults.push({
        turretIndex,
        target: [...target] as Coordinate,
        mode,
        killed: isKill,
        turret: [...turret] as Coordinate,
        coveredTargets: coveredTargets.sort((a, b) => a[0] - b[0] || a[1] - b[1])
      });
    }

    // 批量完成后标记本轮 kill 完成并消耗一张 token（若启用）
    this.didKillThisRound = true;
    if (this.strategyTokensRemaining && strategyToken) {
      const idx = this.strategyTokensRemaining.indexOf(strategyToken);
      if (idx >= 0) this.strategyTokensRemaining.splice(idx, 1);
    }
    // 记录本回合使用的 token 长度；未启用策略牌则以 actions 数量作为"理论最大次数"
    this.lastUsedTokenLen = strategyToken ? strategyToken.length : perActionResults.length;

    return { ok: true, actions: perActionResults };
  }

  monitor(locks: Coordinate[]): MonitorResult {
    this.ensureGameRunning();
    if (!this.didKillThisRound) {
      return { ok: false, winner: null, round: this.currentRound, reason: "must_kill_before_monitor" };
    }
    if (locks.length !== 3) {
      return { ok: false, winner: null, round: this.currentRound, reason: "locks_must_be_3" };
    }
    for (const c of locks) this.validateCoordinate(c);
    const lockSet = new Set(locks.map(c => this.keyOf(c)));
    this.lastLocks = lockSet;
    this.locksHistory.push({ round: this.currentRound, locks: locks.map(c => [...c] as Coordinate) });

    const turretSet = new Set(this.turrets.map(t => this.keyOf(t)));
    const equal =
      lockSet.size === turretSet.size && [...lockSet].every(k => turretSet.has(k)) && [...turretSet].every(k => lockSet.has(k));
    if (equal) {
      this.gameOver = true;
      this.winner = "blue";
      return { ok: true, winner: "blue", round: this.currentRound, reason: "blue_matched_all_turrets" };
    }
    if (this.currentRound >= MAX_ROUNDS) {
      this.gameOver = true;
      this.winner = "red";
      return { ok: true, winner: "red", round: this.currentRound, reason: "max_rounds_reached" };
    }
    this.currentRound += 1;
    this.didKillThisRound = false;
    this.turretsUsedThisRound = [false, false, false]; // 新回合重置炮台使用状态
    return { ok: true, winner: null, round: this.currentRound, reason: "next_round" };
  }
}



