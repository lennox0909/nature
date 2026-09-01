import React, { useState, useEffect, useRef } from 'react';

// --- 型別與常數定義 ---
type NodeType = {
  row: number;
  col: number;
  isStart: boolean;
  isEnd: boolean;
  isWall: boolean;
};

const ROWS = 15;
const COLS = 35;
const START_NODE_ROW = 7;
const START_NODE_COL = 5;
const END_NODE_ROW = 7;
const END_NODE_COL = 29;

export default function App() {
  const [grid, setGrid] = useState<NodeType[][]>([]);
  const [isMousePressed, setIsMousePressed] = useState(false);
  const [dragType, setDragType] = useState<'start' | 'end' | 'wall' | 'eraser' | null>(null);
  const [algorithm, setAlgorithm] = useState<'Dijkstra' | 'AStar'>('Dijkstra');
  const [tool, setTool] = useState<'Wall' | 'Eraser'>('Wall');
  const [nodesVisited, setNodesVisited] = useState(0);
  const [pathLength, setPathLength] = useState(0);
  const [isRunning, setIsRunning] = useState(false);

  const animationTimeouts = useRef<NodeJS.Timeout[]>([]);

  // --- 初始化網格 ---
  useEffect(() => {
    resetGrid(true);
  }, []);

  const createNode = (col: number, row: number): NodeType => {
    return {
      col,
      row,
      isStart: row === START_NODE_ROW && col === START_NODE_COL,
      isEnd: row === END_NODE_ROW && col === END_NODE_COL,
      isWall: false,
    };
  };

  const resetGrid = (fullReset = false) => {
    clearAnimations();
    setNodesVisited(0);
    setPathLength(0);
    setIsRunning(false);

    if (fullReset) {
      const newGrid = [];
      for (let row = 0; row < ROWS; row++) {
        const currentRow = [];
        for (let col = 0; col < COLS; col++) {
          currentRow.push(createNode(col, row));
        }
        newGrid.push(currentRow);
      }
      setGrid(newGrid);
    }

    // 清除動畫 CSS
    for (let row = 0; row < ROWS; row++) {
      for (let col = 0; col < COLS; col++) {
        const el = document.getElementById(`node-${row}-${col}`);
        if (el) {
          el.classList.remove('animate-visited', 'animate-path');
          el.style.backgroundColor = ''; 
        }
      }
    }
  };

  const clearAnimations = () => {
    animationTimeouts.current.forEach(clearTimeout);
    animationTimeouts.current = [];
  };

  // --- 滑鼠互動邏輯 ---
  const handleMouseDown = (row: number, col: number) => {
    if (isRunning) return;
    setIsMousePressed(true);
    const node = grid[row][col];

    if (node.isStart) {
      setDragType('start');
    } else if (node.isEnd) {
      setDragType('end');
    } else {
      const isErasing = tool === 'Eraser' || node.isWall;
      setDragType(isErasing ? 'eraser' : 'wall');
      updateGridWall(row, col, !isErasing);
    }
  };

  const handleMouseEnter = (row: number, col: number) => {
    if (!isMousePressed || isRunning) return;

    if (dragType === 'start' || dragType === 'end') {
      const newGrid = grid.map(r => r.map(n => ({ 
        ...n, 
        isStart: dragType === 'start' ? (n.row === row && n.col === col) : n.isStart,
        isEnd: dragType === 'end' ? (n.row === row && n.col === col) : n.isEnd 
      })));
      setGrid(newGrid);
    } else if (dragType === 'wall' || dragType === 'eraser') {
      updateGridWall(row, col, dragType === 'wall');
    }
  };

  const handleMouseUp = () => {
    setIsMousePressed(false);
    setDragType(null);
  };

  const updateGridWall = (row: number, col: number, isWall: boolean) => {
    const newGrid = [...grid];
    const node = newGrid[row][col];
    if (!node.isStart && !node.isEnd) {
      newGrid[row][col] = { ...node, isWall };
      setGrid(newGrid);
    }
  };

  // --- 演算法實作 ---
  const runAlgorithm = () => {
    if (isRunning) return;
    resetGrid(false);
    setIsRunning(true);

    let startNode: NodeType | null = null;
    let endNode: NodeType | null = null;
    for (const row of grid) {
      for (const node of row) {
        if (node.isStart) startNode = node;
        if (node.isEnd) endNode = node;
      }
    }
    if (!startNode || !endNode) return;

    const visitedNodesInOrder: NodeType[] = [];
    const unvisitedNodes = [];
    const distances = new Map<string, number>();
    const previousNodes = new Map<string, NodeType | null>();
    
    for (const row of grid) {
      for (const node of row) {
        const id = `${node.row}-${node.col}`;
        distances.set(id, Infinity);
        previousNodes.set(id, null);
        unvisitedNodes.push(node);
      }
    }
    distances.set(`${startNode.row}-${startNode.col}`, 0);

    const heuristic = (node: NodeType, target: NodeType) => {
      return algorithm === 'AStar' ? Math.abs(node.row - target.row) + Math.abs(node.col - target.col) : 0;
    };

    while (!!unvisitedNodes.length) {
      unvisitedNodes.sort((a, b) => {
        const distA = distances.get(`${a.row}-${a.col}`)! + heuristic(a, endNode!);
        const distB = distances.get(`${b.row}-${b.col}`)! + heuristic(b, endNode!);
        return distA - distB;
      });

      const closestNode = unvisitedNodes.shift()!;
      if (closestNode.isWall) continue;
      if (distances.get(`${closestNode.row}-${closestNode.col}`) === Infinity) break;

      visitedNodesInOrder.push(closestNode);
      if (closestNode === endNode) break;

      const { row, col } = closestNode;
      const neighbors = [];
      if (row > 0) neighbors.push(grid[row - 1][col]);
      if (row < ROWS - 1) neighbors.push(grid[row + 1][col]);
      if (col > 0) neighbors.push(grid[row][col - 1]);
      if (col < COLS - 1) neighbors.push(grid[row][col + 1]);

      for (const neighbor of neighbors.filter(n => !n.isWall)) {
        const alt = distances.get(`${closestNode.row}-${closestNode.col}`)! + 1;
        if (alt < distances.get(`${neighbor.row}-${neighbor.col}`)!) {
          distances.set(`${neighbor.row}-${neighbor.col}`, alt);
          previousNodes.set(`${neighbor.row}-${neighbor.col}`, closestNode);
        }
      }
    }

    const nodesInShortestPathOrder = [];
    let currentNode: NodeType | null = endNode;
    while (currentNode !== null) {
      nodesInShortestPathOrder.unshift(currentNode);
      currentNode = previousNodes.get(`${currentNode.row}-${currentNode.col}`) || null;
    }

    animateAlgorithm(visitedNodesInOrder, nodesInShortestPathOrder);
  };

  const animateAlgorithm = (visitedNodes: NodeType[], pathNodes: NodeType[]) => {
    for (let i = 0; i <= visitedNodes.length; i++) {
      if (i === visitedNodes.length) {
        const t = setTimeout(() => {
          animatePath(pathNodes);
        }, i * 15);
        animationTimeouts.current.push(t);
        return;
      }
      
      const t = setTimeout(() => {
        const node = visitedNodes[i];
        if (!node.isStart && !node.isEnd) {
          const el = document.getElementById(`node-${node.row}-${node.col}`);
          if (el) el.classList.add('animate-visited');
        }
        setNodesVisited(i);
      }, i * 15);
      animationTimeouts.current.push(t);
    }
  };

  const animatePath = (pathNodes: NodeType[]) => {
    // 判斷是否找到有效路徑 (長度大於1代表成功連通)
    if (pathNodes.length > 1) {
      for (let i = 0; i < pathNodes.length; i++) {
        const t = setTimeout(() => {
          const node = pathNodes[i];
          if (!node.isStart && !node.isEnd) {
            const el = document.getElementById(`node-${node.row}-${node.col}`);
            if (el) el.classList.add('animate-path');
          }
          setPathLength(i);
        }, i * 30);
        animationTimeouts.current.push(t);
      }
    }
    setIsRunning(false);
  };

  // --- UI 渲染 ---
  return (
    <div className="min-h-screen w-full bg-[#121212] flex flex-col items-center justify-center p-4 sm:p-8 select-none font-sans">
      <style>{`
        @keyframes visitedAnimation {
          0% { transform: scale(0.3); background-color: #172554; border-radius: 100%; }
          50% { background-color: #0284c7; }
          100% { transform: scale(1); background-color: #38bdf8; }
        }
        .animate-visited {
          animation: visitedAnimation 1.2s ease-out forwards;
        }
        @keyframes pathAnimation {
          0% { transform: scale(0.6); background-color: #ca8a04; border-radius: 50%; }
          100% { transform: scale(1); background-color: #fef08a; }
        }
        .animate-path {
          animation: pathAnimation 0.4s ease-out forwards;
        }
      `}</style>

      <div className="w-full max-w-5xl">
        
        {/* 頂部標題與按鈕列 */}
        <div className="flex justify-between items-center w-full mb-8">
          <h1 className="text-2xl sm:text-3xl font-semibold text-white tracking-wide">
            路徑演算法沙盒 (Pathfinding Sandbox)
          </h1>
          <div className="flex gap-4">
            <button 
              onClick={runAlgorithm} 
              disabled={isRunning}
              className="w-12 h-12 bg-[#2d2f36] hover:bg-[#3d3f46] text-white rounded-full flex items-center justify-center transition-colors disabled:opacity-50"
              title="執行演算法"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M5 3l14 9-14 9V3z"/></svg>
            </button>
            <button 
              onClick={() => resetGrid(true)} 
              disabled={isRunning}
              className="w-12 h-12 bg-[#2d2f36] hover:bg-[#3d3f46] text-white rounded-full flex items-center justify-center transition-colors disabled:opacity-50"
              title="重置畫布"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 2v6h-6"/><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/></svg>
            </button>
          </div>
        </div>

        {/* 網格渲染區 (CSS Grid) */}
        <div 
          className="w-full bg-[#1a1a1a] border border-[#333] shadow-2xl overflow-hidden touch-none"
          onMouseLeave={handleMouseUp}
          style={{ 
            display: 'grid', 
            gridTemplateColumns: `repeat(${COLS}, minmax(0, 1fr))` 
          }}
        >
          {grid.map((row, rIdx) => 
            row.map((node, cIdx) => (
              <div
                key={`${rIdx}-${cIdx}`}
                id={`node-${rIdx}-${cIdx}`}
                onMouseDown={() => handleMouseDown(rIdx, cIdx)}
                onMouseEnter={() => handleMouseEnter(rIdx, cIdx)}
                onMouseUp={handleMouseUp}
                className={`
                  aspect-square border-[0.5px] border-[#333333] flex items-center justify-center transition-colors duration-100
                  ${node.isWall ? 'bg-white' : 'bg-transparent'}
                `}
              >
                {/* 內部綠色/紅色圓點 */}
                {node.isStart && <div className="w-1/2 h-1/2 bg-[#86efac] rounded-full shadow-lg"></div>}
                {node.isEnd && <div className="w-1/2 h-1/2 bg-[#fca5a5] rounded-full shadow-lg"></div>}
              </div>
            ))
          )}
        </div>

        {/* 數據統計區 */}
        <div className="flex justify-center items-center gap-12 sm:gap-24 my-8 text-white">
          <div className="text-center">
            <div className="text-xs text-gray-400 font-bold tracking-widest mb-2 uppercase">
              探索節點數 (NODES VISITED)
            </div>
            <div className="text-2xl font-bold">{nodesVisited}</div>
          </div>
          <div className="w-px h-10 bg-gray-700"></div>
          <div className="text-center">
            <div className="text-xs text-gray-400 font-bold tracking-widest mb-2 uppercase">
              路徑長度 (PATH LENGTH)
            </div>
            <div className="text-2xl font-bold">{pathLength}</div>
          </div>
        </div>

        {/* 底部控制列 */}
        <div className="flex flex-wrap items-center gap-8 text-white w-full">
          <div className="flex items-center gap-4">
            <span className="text-sm font-semibold">演算法 (Algorithm)</span>
            <select
              value={algorithm}
              onChange={(e) => setAlgorithm(e.target.value as 'AStar' | 'Dijkstra')}
              disabled={isRunning}
              className="bg-[#1e1e1e] border border-gray-700 text-white rounded-lg px-4 py-2 outline-none cursor-pointer focus:border-blue-500 transition-colors"
            >
              <option value="Dijkstra">Dijkstra</option>
              <option value="AStar">A-Star (A*)</option>
            </select>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm font-semibold">工具 (Tool)</span>
            <select
              value={tool}
              onChange={(e) => setTool(e.target.value as 'Wall' | 'Eraser')}
              disabled={isRunning}
              className="bg-[#1e1e1e] border border-gray-700 text-white rounded-lg px-4 py-2 outline-none cursor-pointer focus:border-blue-500 transition-colors"
            >
              <option value="Wall">繪製牆壁 (Wall)</option>
              <option value="Eraser">橡皮擦 (Eraser)</option>
            </select>
          </div>
        </div>

      </div>
    </div>
  );
}