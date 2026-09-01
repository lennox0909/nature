import React, { useRef, useEffect, useState } from 'react';

type Algorithm = 'Dijkstra' | 'AStar';
type DrawMode = 'Wall' | 'Eraser';

export default function PathfindingVisualizer() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [algorithm, setAlgorithm] = useState<Algorithm>('AStar');
  const [mode, setMode] = useState<DrawMode>('Wall');
  const [isRunning, setIsRunning] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // 初始化 2D 網格背景
    ctx.fillStyle = '#1a202c'; // Tailwind gray-900
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // 繪製網格線
    ctx.strokeStyle = '#4a5568'; // Tailwind gray-600
    for (let i = 0; i <= canvas.width; i += 20) {
      ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i, canvas.height); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(0, i); ctx.lineTo(canvas.width, i); ctx.stroke();
    }
    
    // 預設起點(綠)與終點(紅)的繪製邏輯在此實作
  }, [algorithm]);

  const startSimulation = () => {
    setIsRunning(true);
    // 實作 Priority Queue，依據選擇的演算法計算權重
    // Dijkstra 權重函數: g(n)
    // A* 啟發式函數: f(n) = g(n) + h(n) [h(n) = Math.abs(current.x - target.x) + Math.abs(current.y - target.y)]
    // 使用 requestAnimationFrame 逐幀渲染節點擴展(黃色)與最終路徑(藍色)
  };

  return (
    <div className="flex flex-col items-center w-full max-w-4xl p-6 bg-gray-900 rounded-xl shadow-2xl">
      <div className="flex gap-4 mb-4 w-full justify-between items-center">
        <div className="flex gap-2">
          <select 
            className="px-4 py-2 bg-gray-800 text-white rounded-lg border border-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={algorithm}
            onChange={(e) => setAlgorithm(e.target.value as Algorithm)}
            disabled={isRunning}
          >
            <option value="Dijkstra">Dijkstra 演算法</option>
            <option value="AStar">A* (A-Star) 演算法</option>
          </select>
          <button 
            className="px-4 py-2 bg-gray-800 text-white rounded-lg border border-gray-700 hover:bg-gray-700"
            onClick={() => setMode(mode === 'Wall' ? 'Eraser' : 'Wall')}
          >
            模式: {mode === 'Wall' ? '繪製障礙物' : '橡皮擦'}
          </button>
        </div>
        <button 
          className="px-6 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-medium transition-colors disabled:opacity-50"
          onClick={startSimulation}
          disabled={isRunning}
        >
          開始模擬
        </button>
      </div>
      <canvas
        ref={canvasRef}
        width={800}
        height={500}
        className="border border-gray-700 bg-black rounded cursor-crosshair w-full"
        // 需綁定 onMouseDown / onMouseMove / onMouseUp 以更新圖形陣列狀態並重繪 Canvas
      />
    </div>
  );
}