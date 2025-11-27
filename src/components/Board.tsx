import React from "react";
import type { Coordinate } from "../game/types";

interface BoardProps {
  gridSize: number;
  deadCells: Coordinate[];
  locks: Coordinate[];
  turretsDebug?: Coordinate[];
  selectable?: boolean;
  selected?: Coordinate | null;
  onSelect?: (coord: Coordinate) => void;
  turretsLocked?: boolean[];
  turretsUsed?: boolean[]; // 每个炮台本回合是否已使用
  coverage?: Coordinate[]; // 当前策略的覆盖范围
  selectedTurretIndex?: number | null; // 当前选中的炮台
  onTurretSelect?: (turretIndex: number) => void; // 点击炮台时的回调
  canSelectTurret?: boolean; // 是否允许选择炮台
  availableStrategies?: (0 | 1)[]; // 可用策略列表（用于浮窗显示）
  onStrategySelect?: (strategy: 0 | 1) => void; // 选择策略的回调
  selectedStrategy?: 0 | 1 | null; // 当前选中的策略（用于浮窗高亮）
  isSettingTurrets?: boolean; // 是否在设置炮台模式
  selectedTurretPositions?: Coordinate[]; // 已选择的炮台位置（设置模式）
}

const coordKey = (c: Coordinate) => `${c[0]}-${c[1]}`;

export const Board: React.FC<BoardProps> = ({
  gridSize,
  deadCells,
  locks,
  turretsDebug,
  selectable,
  selected,
  onSelect,
  turretsLocked,
  turretsUsed,
  coverage,
  selectedTurretIndex,
  onTurretSelect,
  canSelectTurret,
  availableStrategies = [],
  onStrategySelect,
  selectedStrategy,
  isSettingTurrets = false,
  selectedTurretPositions = []
}: BoardProps) => {
  const deadSet = new Set(deadCells.map(coordKey));
  const lockSet = new Set(locks.map(coordKey));
  const turretSet = new Set((turretsDebug ?? []).map(coordKey));
  const selKey = selected ? coordKey(selected) : null;
  const coverageSet = new Set((coverage ?? []).map(coordKey));
  const selectedTurretPositionsSet = new Set(selectedTurretPositions.map(coordKey));

  // 建立坐标到炮台索引的映射
  const coordToTurretIndex = new Map<string, number>();
  if (turretsDebug) {
    for (let i = 0; i < turretsDebug.length; i++) {
      coordToTurretIndex.set(coordKey(turretsDebug[i]), i);
    }
  }

  const cells: React.ReactNode[] = [];
  for (let y = 0; y < gridSize; y++) {
    for (let x = 0; x < gridSize; x++) {
      const key = `${x}-${y}`;
      const isDead = deadSet.has(key);
      const isLock = lockSet.has(key);
      const isTurret = turretSet.has(key);
      const isSelected = selKey === key;
      const turretIndex = coordToTurretIndex.get(key);
      const isLocked = turretIndex !== undefined && turretsLocked?.[turretIndex];
      const isUsed = turretIndex !== undefined && turretsUsed?.[turretIndex];
      const isInCoverage = coverageSet.has(key);
      const isSelectedTurret = turretIndex === selectedTurretIndex;
      const isSelectedTurretPosition = isSettingTurrets && selectedTurretPositionsSet.has(key);
      const isCenter = x === 2 && y === 2;

      let label = "";
      if (isSettingTurrets && isSelectedTurretPosition) {
        // 设置模式下显示已选择的炮台位置编号
        const posIndex = selectedTurretPositions.findIndex(t => t[0] === x && t[1] === y);
        label = `P${posIndex}`;
      } else if (isTurret && isDead) label = "X";
      else if (isTurret) {
        label = `T${turretIndex ?? ""}`;
      } else if (isDead) label = "*";
      else if (isLock) label = "#";

      const classNames = [
        "cell",
        isDead ? "dead" : "",
        isLock ? "lock" : "",
        isTurret ? "turret-debug" : "",
        isSelected ? "selected" : "",
        isLocked ? "locked" : "",
        isUsed ? "turret-used" : "",
        isInCoverage ? "coverage" : "",
        isSelectedTurret ? "selected-turret" : "",
        isSettingTurrets && isSelectedTurretPosition ? "turret-position-selected" : "",
        isSettingTurrets && !isDead && !isCenter ? "turret-position-selectable" : ""
      ]
        .filter(Boolean)
        .join(" ");

      const handleClick = (e: React.MouseEvent) => {
        // 设置模式下，允许点击选择炮台位置（除了中心格和死亡格）
        if (isSettingTurrets && onSelect) {
          if (isCenter) {
            // 中心格不可选，但不阻止事件（让提示显示）
            return;
          }
          if (isDead) {
            // 死亡格不可选
            return;
          }
          onSelect([x, y]);
          return;
        }
        
        // 如果点击的是炮台且允许选择炮台，优先处理炮台选择
        if (isTurret && turretIndex !== undefined && canSelectTurret && onTurretSelect) {
          const isLocked = turretsLocked?.[turretIndex];
          const isUsed = turretsUsed?.[turretIndex];
          if (!isLocked && !isUsed) {
            e.stopPropagation();
            onTurretSelect(turretIndex);
            return;
          }
        }
        // 否则处理普通格子选择
        if (selectable && onSelect) {
          onSelect([x, y]);
        }
      };

      cells.push(
        <div key={key} className={classNames} onClick={handleClick} style={{ position: "relative" }} title={isTurret ? `炮台 #${turretIndex}${isLocked ? " (已锁定)" : ""}${isUsed ? " (已使用)" : ""}` : undefined}>
          {label || `${x}${y}`}
        </div>
      );
    }
  }

  // 浮窗显示在棋盘外部（通过Portal或绝对定位）
  const showStrategyPopup = selectedTurretIndex !== null && availableStrategies.length > 0 && onStrategySelect;
  const selectedTurretCoord = selectedTurretIndex !== null && selectedTurretIndex !== undefined && turretsDebug ? turretsDebug[selectedTurretIndex] : null;

  return (
    <>
      <div className="board">{cells}</div>
      {showStrategyPopup && selectedTurretCoord && (
        <div
          className="strategy-popup"
          style={{
            position: "fixed",
            top: "50%",
            right: "24px",
            transform: "translateY(-50%)",
            zIndex: 2000,
            background: "rgba(59, 130, 246, 0.95)",
            border: "2px solid #3b82f6",
            borderRadius: "8px",
            padding: "12px",
            minWidth: "160px",
            boxShadow: "0 4px 12px rgba(0,0,0,0.5)",
            backdropFilter: "blur(4px)"
          }}
          onClick={e => e.stopPropagation()}
        >
          <div style={{ fontSize: 12, color: "#bfdbfe", marginBottom: 8, fontWeight: "bold" }}>
            炮台 #{selectedTurretIndex} 可用策略:
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {availableStrategies.map((strategy, idx) => (
              <button
                key={idx}
                className="btn secondary"
                style={{
                  fontSize: 11,
                  padding: "8px 12px",
                  background: selectedStrategy === strategy ? "rgba(245, 158, 11, 0.4)" : "rgba(255,255,255,0.15)",
                  border: selectedStrategy === strategy ? "2px solid #f59e0b" : "1px solid rgba(255,255,255,0.3)",
                  color: "#fff",
                  cursor: "pointer",
                  borderRadius: "4px",
                  transition: "all 0.2s",
                  width: "100%"
                }}
                onClick={() => onStrategySelect?.(strategy)}
                onMouseEnter={e => {
                  if (selectedStrategy !== strategy) {
                    e.currentTarget.style.background = "rgba(255,255,255,0.25)";
                  }
                }}
                onMouseLeave={e => {
                  if (selectedStrategy !== strategy) {
                    e.currentTarget.style.background = "rgba(255,255,255,0.15)";
                  }
                }}
              >
                {strategy === 0 ? "cross (行/列)" : "round (8邻)"}
              </button>
            ))}
          </div>
        </div>
      )}
    </>
  );
};


