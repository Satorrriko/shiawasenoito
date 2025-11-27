export type Coordinate = [number, number];

export type Player = "red" | "blue";

// 与 Python 版 Engine.get_public_state 保持相近，但字段名采用 camelCase 以便前端使用
export interface PublicState {
  gridSize: number;
  round: number;
  lastLocks: Coordinate[];
  deadCells: Coordinate[];
  gameOver: boolean;
  winner: Player | null;
  strategyTokensRemaining: string[] | null;
  currentRoundToken?: string | null; // 当前回合应该使用的token
  turretsLocked: boolean[] | null;
  deadHistory: { round: number; target: Coordinate; mode: number }[];
  locksHistory: { round: number; locks: Coordinate[] }[];
  lastUsedTokenLen?: number | null;
  turretsUsedThisRound?: boolean[]; // 每个炮台本回合是否已使用
}



