import React, { useMemo, useState } from "react";
import { Engine } from "./game/engine";
import { RedAIAdvanced } from "./game/redAiAdvanced";
import { BlueAIAdvanced } from "./game/blueAiAdvanced";
import type { Coordinate, Player } from "./game/types";
import { Board } from "./components/Board";

type ControlMode = "human-red" | "human-blue" | "ai-vs-ai";

const newEngine = () =>
  new Engine({
    strategyTokens: ["110", "10", "11", "10", "00"] // 与 Python 版一致
  });

export const App: React.FC = () => {
  const [engine, setEngine] = useState<Engine>(() => newEngine());
  const [mode, setMode] = useState<ControlMode>("human-red");
  const [selectedTarget, setSelectedTarget] = useState<Coordinate | null>(null);
  const [redMode, setRedMode] = useState<0 | 1>(0);
  const [selectedToken, setSelectedToken] = useState<string | null>(null);
  const [selectedTokenIndex, setSelectedTokenIndex] = useState<number | null>(null); // 选中的token在列表中的索引
  const [tokenStrategies, setTokenStrategies] = useState<(0 | 1)[]>([]); // token解析后的策略数组（按顺序）
  const [selectedTurretIndex, setSelectedTurretIndex] = useState<number | null>(null);
  const [selectedStrategy, setSelectedStrategy] = useState<0 | 1 | null>(null); // 当前选中的策略（模式）
  const [coverage, setCoverage] = useState<Coordinate[]>([]); // 当前策略的覆盖范围
  const [logs, setLogs] = useState<string[]>([]);
  const [isSettingTurrets, setIsSettingTurrets] = useState<boolean>(false); // 是否在设置炮台阶段
  const [selectedTurrets, setSelectedTurrets] = useState<Coordinate[]>([]); // 已选择的炮台位置（最多3个）

  const redAI = useMemo(() => new RedAIAdvanced({ randomizeTokens: true }), []);
  const blueAI = useMemo(() => new BlueAIAdvanced(), []);

  const pushLog = (line: string) => {
    setLogs(prev => [...prev.slice(-150), line]);
  };

  const downloadGameLog = () => {
    const logContent = engine.exportGameLog();
    const blob = new Blob([logContent], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `hidden-stations-log-${new Date().toISOString().replace(/[:.]/g, "-")}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    pushLog("[系统] 对局日志已下载");
  };

  const state = engine.getPublicState();
  const turrets = engine.revealTurrets();

  const resetGame = () => {
    const e = newEngine();
    setEngine(e);
    setSelectedTarget(null);
    setSelectedToken(null);
    setSelectedTokenIndex(null);
    setTokenStrategies([]);
    setSelectedTurretIndex(null);
    setSelectedStrategy(null);
    setCoverage([]);
    setLogs([]);
    setIsSettingTurrets(false);
    setSelectedTurrets([]);
    pushLog("[系统] 新的一局开始");
  };

  // 开始设置炮台位置
  const startSettingTurrets = () => {
    setIsSettingTurrets(true);
    setSelectedTurrets([]);
    pushLog("[系统] 请点击棋盘选择3个炮台位置（不能选择中心格(2,2)和已死亡格子）");
  };

  // 取消设置炮台
  const cancelSettingTurrets = () => {
    setIsSettingTurrets(false);
    setSelectedTurrets([]);
    pushLog("[系统] 已取消设置炮台");
  };

  // 确认设置炮台并开始游戏
  const confirmTurrets = () => {
    if (selectedTurrets.length !== 3) {
      pushLog(`[系统] 请选择3个炮台位置，当前已选择${selectedTurrets.length}个`);
      return;
    }
    try {
      const e = new Engine({
        turrets: selectedTurrets,
        strategyTokens: ["110", "10", "11", "10", "00"]
      });
      setEngine(e);
      setIsSettingTurrets(false);
      setSelectedTurrets([]);
      setSelectedTarget(null);
      setSelectedToken(null);
      setSelectedTokenIndex(null);
      setTokenStrategies([]);
      setSelectedTurretIndex(null);
      setSelectedStrategy(null);
      setCoverage([]);
      pushLog(`[系统] 炮台位置已设置: 炮台0(${selectedTurrets[0][0]},${selectedTurrets[0][1]}), 炮台1(${selectedTurrets[1][0]},${selectedTurrets[1][1]}), 炮台2(${selectedTurrets[2][0]},${selectedTurrets[2][1]})`);
      pushLog("[系统] 游戏开始");
    } catch (error) {
      pushLog(`[系统] 设置失败: ${error instanceof Error ? error.message : String(error)}`);
    }
  };

  // 处理设置炮台时的格子点击
  const handleTurretPositionSelect = (coord: Coordinate) => {
    if (!isSettingTurrets) return;
    
    const [x, y] = coord;
    // 不能选择中心格
    if (x === 2 && y === 2) {
      pushLog("[系统] 不能选择中心格(2,2)");
      return;
    }
    
    // 不能选择已死亡的格子
    const deadSet = new Set(state.deadCells.map(c => `${c[0]}-${c[1]}`));
    const key = `${x}-${y}`;
    if (deadSet.has(key)) {
      pushLog("[系统] 不能选择已死亡的格子");
      return;
    }
    
    // 检查是否已选择
    const existingIndex = selectedTurrets.findIndex(t => t[0] === x && t[1] === y);
    if (existingIndex >= 0) {
      // 取消选择
      const newTurrets = selectedTurrets.filter((_, idx) => idx !== existingIndex);
      setSelectedTurrets(newTurrets);
      pushLog(`[系统] 已取消选择炮台位置(${x},${y})，剩余${newTurrets.length}/3`);
    } else {
      // 检查是否已满
      if (selectedTurrets.length >= 3) {
        pushLog("[系统] 已选择3个炮台位置，请先取消某个位置再选择新的");
        return;
      }
      // 添加选择
      const newTurrets = [...selectedTurrets, coord];
      setSelectedTurrets(newTurrets);
      pushLog(`[系统] 已选择炮台位置(${x},${y})，已选择${newTurrets.length}/3`);
    }
  };

  // 计算覆盖范围
  const computeCoverage = (turretIndex: number, mode: 0 | 1): Coordinate[] => {
    const turret = turrets[turretIndex];
    const gridSize = state.gridSize;
    const res: Coordinate[] = [];
    if (mode === 0) {
      // cross: 行+列
      for (let y = 0; y < gridSize; y++) res.push([turret[0], y]);
      for (let x = 0; x < gridSize; x++) res.push([x, turret[1]]);
      return res.filter(c => !(c[0] === turret[0] && c[1] === turret[1]));
    } else {
      // round: 8邻域
      for (const dx of [-1, 0, 1]) {
        for (const dy of [-1, 0, 1]) {
          if (dx === 0 && dy === 0) continue;
          const xx = turret[0] + dx;
          const yy = turret[1] + dy;
          if (xx >= 0 && xx < gridSize && yy >= 0 && yy < gridSize) {
            res.push([xx, yy]);
          }
        }
      }
      return res;
    }
  };

  // 处理token选择
  const handleTokenSelect = (token: string, tokenIndex: number) => {
    setSelectedToken(token);
    // 使用token和索引的组合作为唯一标识，避免相同值的token互相影响
    setSelectedTokenIndex(tokenIndex);
    // token中的每个字符代表一次攻击的模式：'0'=cross, '1'=round
    const strategies: (0 | 1)[] = [...token].map(ch => (ch === "1" ? 1 : 0));
    setTokenStrategies(strategies);
    setSelectedTurretIndex(null);
    setSelectedStrategy(null);
    setCoverage([]);
    pushLog(`[系统] 已选择策略牌: ${token} (${strategies.length}次攻击: ${strategies.map(s => s === 0 ? "cross" : "round").join(", ")})`);
    
    // 检查是否还有可用炮台（使用最新状态）
    const currentState = engine.getPublicState();
    const hasAvailableTurret = [0, 1, 2].some(idx => {
      const isLocked = currentState.turretsLocked?.[idx] ?? false;
      const isUsed = currentState.turretsUsedThisRound?.[idx] ?? false;
      return !isLocked && !isUsed;
    });
    
    if (!hasAvailableTurret) {
      pushLog("[系统] 无可用炮台，消耗token并自动结束回合");
      // 消耗token
      if (token) {
        engine.consumeToken(token);
      }
      setSelectedToken(null);
      setSelectedTokenIndex(null);
      setTokenStrategies([]);
      setTimeout(() => {
        handleBlueAction();
      }, 500);
    }
  };

  // 处理炮台选择
  const handleTurretSelect = (turretIndex: number) => {
    if (!selectedToken || tokenStrategies.length === 0) {
      pushLog("[系统] 请先选择策略牌");
      return;
    }
    if (state.turretsLocked?.[turretIndex]) {
      pushLog(`[系统] 炮台 #${turretIndex} 已被锁定，无法使用`);
      return;
    }
    if (state.turretsUsedThisRound?.[turretIndex]) {
      pushLog(`[系统] 炮台 #${turretIndex} 本回合已使用，无法再次使用`);
      return;
    }
    
    // 检查是否还有可用炮台
    const hasAvailableTurret = [0, 1, 2].some(idx => {
      const isLocked = state.turretsLocked?.[idx] ?? false;
      const isUsed = state.turretsUsedThisRound?.[idx] ?? false;
      return !isLocked && !isUsed;
    });
    
    if (!hasAvailableTurret) {
      pushLog("[系统] 无可用炮台，消耗token并自动结束回合");
      // 消耗token
      if (selectedToken) {
        engine.consumeToken(selectedToken);
      }
      setSelectedToken(null);
      setSelectedTokenIndex(null);
      setTokenStrategies([]);
      setSelectedTurretIndex(null);
      setSelectedStrategy(null);
      setCoverage([]);
      setTimeout(() => {
        handleBlueAction();
      }, 500);
      return;
    }
    
    setSelectedTurretIndex(turretIndex);
    setSelectedStrategy(null);
    setCoverage([]);
    pushLog(`[系统] 已选择炮台 #${turretIndex}，请从浮窗中选择策略`);
  };

  // 处理策略选择（从token剩余策略中选择）
  const handleStrategySelect = (strategy: 0 | 1) => {
    if (selectedTurretIndex === null) {
      pushLog("[系统] 请先选择炮台");
      return;
    }
    // 检查该策略是否在token剩余策略中
    if (!tokenStrategies.includes(strategy)) {
      pushLog(`[系统] 该策略(${strategy === 0 ? "cross" : "round"})不在token剩余策略中`);
      return;
    }
    setSelectedStrategy(strategy);
    const cov = computeCoverage(selectedTurretIndex, strategy);
    // 过滤掉死亡格、友军（炮台坐标），但允许攻击被封锁的格子
    const deadSet = new Set(state.deadCells.map(c => `${c[0]}-${c[1]}`));
    const turretSet = new Set(turrets.map(t => `${t[0]}-${t[1]}`));
    const legal = cov.filter(c => {
      const key = `${c[0]}-${c[1]}`;
      return !deadSet.has(key) && !turretSet.has(key);
    });
    setCoverage(legal);
    pushLog(`[系统] 已选择策略: ${strategy === 0 ? "cross (行/列)" : "round (8邻)"}，可攻击${legal.length}个目标`);
  };

  // 处理目标选择（在覆盖范围内）
  const handleTargetSelect = (target: Coordinate) => {
    if (selectedTurretIndex === null || selectedStrategy === null || !selectedToken) {
      return;
    }
    if (!coverage.some(c => c[0] === target[0] && c[1] === target[1])) {
      pushLog("[系统] 该目标不在当前策略的覆盖范围内");
      return;
    }

    // 从token策略数组中移除已使用的策略
    const newStrategies = [...tokenStrategies];
    const idx = newStrategies.indexOf(selectedStrategy);
    if (idx < 0) {
      pushLog("[系统] 该策略已不可用");
      return;
    }
    newStrategies.splice(idx, 1);
    const isLastStrategy = newStrategies.length === 0;

    // 执行kill：如果是最后一个策略，才传递token（消耗token）；否则不传token
    const res = engine.kill({
      mode: selectedStrategy,
      turretIndex: selectedTurretIndex,
      target,
      strategyToken: isLastStrategy ? selectedToken : undefined
    });

    if (res.ok) {
      // 记录详细日志
      if (res.detailedLog) {
        pushLog(`[详细] ${res.detailedLog.reason}`);
      }
      pushLog(
        `[红方] 炮台${selectedTurretIndex} 模式${selectedStrategy === 0 ? "cross" : "round"} 目标(${target[0]},${target[1]}) 命中=${res.killed}`
      );
      
      // 如果策略用完了，清除token并进入蓝方回合
      if (isLastStrategy) {
        pushLog("[系统] 策略牌所有策略已用完，进入蓝方回合");
        setSelectedToken(null);
        setSelectedTokenIndex(null);
        setTokenStrategies([]);
        setSelectedTurretIndex(null);
        setSelectedStrategy(null);
        setCoverage([]);
        setSelectedTarget(null);
        // 自动执行蓝方行动
        setTimeout(() => {
          handleBlueAction();
        }, 500);
      } else {
        // 更新剩余策略
        setTokenStrategies(newStrategies);
        
        // 检查是否还有可用的炮台（未被锁定且未使用）
        const newState = engine.getPublicState();
        const hasAvailableTurret = [0, 1, 2].some(idx => {
          const isLocked = newState.turretsLocked?.[idx] ?? false;
          const isUsed = newState.turretsUsedThisRound?.[idx] ?? false;
          return !isLocked && !isUsed;
        });
        
        if (!hasAvailableTurret) {
          // 没有可用炮台，但还有剩余策略，需要消耗token并结束回合
          pushLog(`[系统] 剩余策略: ${newStrategies.map(s => s === 0 ? "cross" : "round").join(", ")}，但无可用炮台，消耗token并自动结束回合`);
          
          // 消耗token
          if (selectedToken) {
            engine.consumeToken(selectedToken);
          }
          
          setSelectedToken(null);
          setSelectedTokenIndex(null);
          setTokenStrategies([]);
          setSelectedTurretIndex(null);
          setSelectedStrategy(null);
          setCoverage([]);
          setSelectedTarget(null);
          
          // 自动执行蓝方行动
          setTimeout(() => {
            handleBlueAction();
          }, 500);
        } else {
          // 重置选择，准备下一个策略
          setSelectedTurretIndex(null);
          setSelectedStrategy(null);
          setCoverage([]);
          setSelectedTarget(null);
          pushLog(`[系统] 剩余策略: ${newStrategies.map(s => s === 0 ? "cross" : "round").join(", ")}`);
        }
      }
    } else {
      pushLog(`[红方] 错误: ${res.reason}`);
    }
  };

  const handleRedAction = () => {
    if (state.gameOver) return;
    if (mode === "ai-vs-ai" || mode === "human-blue") {
      const decision = redAI.decide(engine);
      if ("actions" in decision && decision.actions) {
        const res = engine.killBatch({ actions: decision.actions, strategyToken: decision.strategyToken ?? undefined });
        if (res.ok) {
          res.actions.forEach(a => {
            pushLog(
              `[红方AI] 炮台${a.turretIndex} 模式${a.mode} 目标(${a.target[0]},${a.target[1]}) 命中=${a.killed}`
            );
          });
        } else {
          pushLog(`[红方AI] 错误: ${res.reason}`);
        }
      } else if ("turretIndex" in decision) {
        const res = engine.kill({ mode: decision.mode, turretIndex: decision.turretIndex, target: decision.target });
        if (res.detailedLog) {
          pushLog(`[详细] ${res.detailedLog.reason}`);
        }
        pushLog(
          `[红方AI] 炮台${decision.turretIndex} 模式${decision.mode} 目标(${decision.target[0]},${decision.target[1]}) 命中=${res.killed}`
        );
      }
    } else {
      // 人类模式：通过点击覆盖范围内的格子来执行
      if (!selectedTarget) {
        pushLog("[系统] 请先选择策略牌、炮台、策略，然后点击覆盖范围内的目标格");
        return;
      }
      handleTargetSelect(selectedTarget);
    }
  };

  const handleBlueAction = () => {
    if (state.gameOver) return;
    let locks: Coordinate[];
    if (mode === "human-blue") {
      pushLog("[系统] V1 暂仅支持蓝方 AI，请切换模式为 Red 或 AI vs AI");
      return;
    } else {
      locks = blueAI.decide(engine);
      const res = engine.monitor(locks);
      pushLog(`[蓝方AI] 锁定: ${locks.map(c => `(${c[0]},${c[1]})`).join(", ")} winner=${res.winner ?? "None"}`);
    }
  };

  const handleAutoRound = () => {
    if (state.gameOver) return;
    handleRedAction();
    const afterRed = engine.getPublicState();
    if (afterRed.gameOver) {
      pushLog(`[系统] 游戏结束，胜者=${afterRed.winner}`);
      return;
    }
    handleBlueAction();
    const afterBlue = engine.getPublicState();
    if (afterBlue.gameOver) {
      pushLog(`[系统] 游戏结束，胜者=${afterBlue.winner}`);
    }
  };

  const winnerLabel = (w: Player | null) => {
    if (!w) return "进行中";
    return w === "red" ? "红方" : "蓝方";
  };

  return (
    <div className="app-root">
      <div className="card">
        <div className="left-pane">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
            <div>
              <div className="section-title">Hidden Stations / V1 Web</div>
              <div style={{ fontSize: 20, marginTop: 4 }}>棋盘</div>
              <div style={{ fontSize: 12, color: "#9ca3af" }}>
                {isSettingTurrets 
                  ? `设置模式: 点击选择炮台位置 (${selectedTurrets.length}/3)` 
                  : "T=炮台（仅调试可见）、*=kill、#=lock"}
              </div>
            </div>
            <div style={{ textAlign: "right", fontSize: 12, color: "#9ca3af" }}>
              回合: <span style={{ color: "#e5e7eb" }}>{state.round}</span>
              <br />
              状态: <span style={{ color: "#e5e7eb" }}>{winnerLabel(state.winner)}</span>
            </div>
          </div>
          <Board
            gridSize={state.gridSize}
            deadCells={state.deadCells}
            locks={state.lastLocks}
            turretsDebug={turrets}
            turretsLocked={state.turretsLocked ?? undefined}
            turretsUsed={state.turretsUsedThisRound ?? undefined}
            selectable={!isSettingTurrets && mode === "human-red" && selectedStrategy !== null}
            selected={selectedTarget}
            onSelect={c => {
              if (isSettingTurrets) {
                handleTurretPositionSelect(c);
              } else if (selectedStrategy !== null) {
                setSelectedTarget(c);
                handleTargetSelect(c);
              } else {
                setSelectedTarget(c);
              }
            }}
            coverage={coverage}
            selectedTurretIndex={selectedTurretIndex}
            onTurretSelect={handleTurretSelect}
            canSelectTurret={!isSettingTurrets && mode === "human-red" && selectedToken !== null && tokenStrategies.length > 0}
            availableStrategies={selectedTurretIndex !== null ? tokenStrategies : []}
            onStrategySelect={handleStrategySelect}
            selectedStrategy={selectedStrategy}
            isSettingTurrets={isSettingTurrets}
            selectedTurretPositions={selectedTurrets}
          />
        </div>

        <div className="right-pane">
          <div>
            <div className="section-title">模式</div>
            <div className="btn-group" style={{ marginTop: 6 }}>
              <button
                className="btn"
                style={{ opacity: mode === "human-red" ? 1 : 0.6 }}
                onClick={() => setMode("human-red")}
              >
                红方（人） vs 蓝方 AI
              </button>
              <button
                className="btn"
                style={{ opacity: mode === "human-blue" ? 1 : 0.6 }}
                onClick={() => setMode("human-blue")}
              >
                蓝方（人） vs 红方 AI
              </button>
              <button
                className="btn"
                style={{ opacity: mode === "ai-vs-ai" ? 1 : 0.6 }}
                onClick={() => setMode("ai-vs-ai")}
              >
                AI vs AI
              </button>
            </div>
          </div>

          <div>
            <div className="section-title">红方行动</div>
            {mode === "human-red" && (
              <div style={{ marginTop: 6 }}>
                {state.strategyTokensRemaining && state.strategyTokensRemaining.length > 0 && (
                  <div style={{ marginBottom: 8 }}>
                    <div style={{ fontSize: 12, marginBottom: 4 }}>策略牌（Token）- 回合 {state.round}：</div>
                    <div className="btn-group" style={{ flexWrap: "wrap" }}>
                      {state.strategyTokensRemaining.map((token, idx) => {
                        const isSelected = selectedTokenIndex === idx; // 使用索引比较，而不是token值
                        return (
                          <button
                            key={`token-${idx}`}
                            className="btn secondary"
                            style={{
                              opacity: isSelected ? 1 : 0.6,
                              fontSize: 11,
                              padding: "4px 8px",
                              outline: isSelected ? "2px solid #10b981" : "none",
                              outlineOffset: "2px"
                            }}
                            onClick={() => handleTokenSelect(token, idx)}
                            title={`Token #${idx + 1}: ${token}`}
                          >
                            {token}
                          </button>
                        );
                      })}
                    </div>
                    {selectedToken && (
                      <div style={{ fontSize: 11, color: "#10b981", marginTop: 4, fontWeight: "bold" }}>
                        ✓ 已锁定: {selectedToken} (剩余策略: {tokenStrategies.map(s => s === 0 ? "cross" : "round").join(", ")})
                      </div>
                    )}
                  </div>
                )}
                {selectedToken && tokenStrategies.length > 0 && (
                  <div style={{ marginBottom: 8 }}>
                    <div style={{ fontSize: 12, marginBottom: 4, color: "#93c5fd" }}>
                      {selectedTurretIndex === null
                        ? `请在棋盘上点击炮台选择（T0/T1/T2），剩余策略: ${tokenStrategies.map(s => s === 0 ? "cross" : "round").join(", ")}`
                        : `已选择炮台 #${selectedTurretIndex}，剩余策略: ${tokenStrategies.map(s => s === 0 ? "cross" : "round").join(", ")}`}
                    </div>
                    {selectedStrategy !== null && (
                      <div style={{ fontSize: 11, color: "#fbbf24", marginTop: 4 }}>
                        ✓ 已选择策略: {selectedStrategy === 0 ? "cross" : "round"}，点击绿色覆盖区域选择目标
                      </div>
                    )}
                  </div>
                )}
                {!selectedToken && (
                  <div style={{ marginBottom: 8 }}>
                    <div style={{ fontSize: 12, marginBottom: 4 }}>模式（无策略牌时）：</div>
                    <div className="btn-group">
                      <button
                        className="btn secondary"
                        style={{ opacity: redMode === 0 ? 1 : 0.6 }}
                        onClick={() => setRedMode(0)}
                      >
                        cross (行/列)
                      </button>
                      <button
                        className="btn secondary"
                        style={{ opacity: redMode === 1 ? 1 : 0.6 }}
                        onClick={() => setRedMode(1)}
                      >
                        round (8 邻)
                      </button>
                    </div>
                    <div style={{ fontSize: 12, marginTop: 6, color: "#9ca3af" }}>
                      点击棋盘格选择目标
                    </div>
                  </div>
                )}
                {selectedToken && selectedStrategy === null && (
                  <div style={{ fontSize: 12, marginTop: 6, color: "#9ca3af" }}>
                    请选择炮台和策略
                  </div>
                )}
                {selectedStrategy !== null && (
                  <div style={{ fontSize: 12, marginTop: 6, color: "#10b981", fontWeight: "bold" }}>
                    ✓ 已选择策略，点击绿色覆盖区域执行攻击
                  </div>
                )}
              </div>
            )}
            <div style={{ marginTop: 8 }} className="btn-group">
              <button className="btn" onClick={handleRedAction}>
                执行红方行动
              </button>
              <button className="btn secondary" onClick={handleAutoRound}>
                自动跑一整回合
              </button>
            </div>
          </div>

          <div>
            <div className="section-title">蓝方行动</div>
            <div className="btn-group" style={{ marginTop: 6 }}>
              <button className="btn" onClick={handleBlueAction}>
                执行蓝方行动（当前为 AI）
              </button>
            </div>
          </div>

          <div>
            <div className="section-title">对局控制</div>
            {isSettingTurrets ? (
              <div style={{ marginTop: 6 }}>
                <div style={{ fontSize: 12, color: "#fbbf24", marginBottom: 8, fontWeight: "bold" }}>
                  设置炮台位置: 已选择 {selectedTurrets.length}/3
                </div>
                <div className="btn-group">
                  <button 
                    className="btn" 
                    onClick={confirmTurrets}
                    disabled={selectedTurrets.length !== 3}
                    style={{ opacity: selectedTurrets.length === 3 ? 1 : 0.5 }}
                  >
                    确认并开始游戏
                  </button>
                  <button className="btn secondary" onClick={cancelSettingTurrets}>
                    取消
                  </button>
                </div>
                <div style={{ fontSize: 11, color: "#9ca3af", marginTop: 6 }}>
                  点击棋盘选择炮台位置（不能选择中心格和死亡格）
                </div>
              </div>
            ) : (
              <div className="btn-group" style={{ marginTop: 6 }}>
                <button className="btn secondary" onClick={startSettingTurrets}>
                  自选炮台位置
                </button>
                <button className="btn secondary" onClick={resetGame}>
                  重新开局（随机炮台）
                </button>
                <button className="btn secondary" onClick={downloadGameLog}>
                  下载对局日志
                </button>
              </div>
            )}
          </div>

          <div>
            <div className="section-title">日志</div>
            <div className="log-area">
              {logs.map((line, idx) => (
                <div key={idx} className="log-line-system">
                  {line}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};


