// 以下指令安裝套件
// npm install lucide-react

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Play, Pause, RotateCcw, Truck } from 'lucide-react';

// --- 型別定義 ---
interface Point {
  x: number;
  y: number;
}

interface DeliveryNode extends Point {
  id: number;
  isDepot: boolean;
}

// --- 常數與設定 ---
const NODE_COUNT = 35;
const VEHICLE_COLORS = ['#ef4444', '#3b82f6', '#10b981', '#f59e0b', '#8b5cf6'];
const ITERATIONS_PER_FRAME = 200; // 每次渲染畫面執行的演算法迭代次數

export default function App() {
  // --- 狀態管理 ---
  const [vehicleCount, setVehicleCount] = useState<number>(3);
  const [isOptimizing, setIsOptimizing] = useState<boolean>(false);
  const [totalDistance, setTotalDistance] = useState<number>(0);
  const [iterationCount, setIterationCount] = useState<number>(0);

  // --- 參照 (Ref) 用於高效能 Canvas 渲染，避免觸發 React 重新渲染 ---
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const requestRef = useRef<number>();
  
  // 核心資料結構
  const depotRef = useRef<DeliveryNode>({ id: 0, x: 0.5, y: 0.5, isDepot: true });
  const nodesRef = useRef<DeliveryNode[]>([]);
  // routes 是一個陣列，每個元素代表一台車的路線 (不包含起終點的 Depot)
  const routesRef = useRef<DeliveryNode[][]>([]); 

  // --- 工具函式 ---
  const calculateDistance = (p1: Point, p2: Point) => {
    return Math.hypot(p1.x - p2.x, p1.y - p2.y);
  };

  const calculateTotalDistance = useCallback((routes: DeliveryNode[][]) => {
    let total = 0;
    const depot = depotRef.current;
    
    routes.forEach(route => {
      if (route.length === 0) return;
      // 從 Depot 到第一個節點
      total += calculateDistance(depot, route[0]);
      // 節點之間的距離
      for (let i = 0; i < route.length - 1; i++) {
        total += calculateDistance(route[i], route[i + 1]);
      }
      // 從最後一個節點回到 Depot
      total += calculateDistance(route[route.length - 1], depot);
    });
    return total;
  }, []);

  // --- 初始化與重置 ---
  const initializeNodes = useCallback(() => {
    const newNodes: DeliveryNode[] = [];
    for (let i = 1; i <= NODE_COUNT; i++) {
      // 隨機分佈在 5% 到 95% 的畫布範圍內，避免太靠邊緣
      newNodes.push({
        id: i,
        x: 0.05 + Math.random() * 0.9,
        y: 0.05 + Math.random() * 0.9,
        isDepot: false,
      });
    }
    nodesRef.current = newNodes;
  }, []);

  const generateInitialRoutes = useCallback(() => {
    const routes: DeliveryNode[][] = Array.from({ length: vehicleCount }, () => []);
    
    // 刻意使用隨機分配來產生糟糕的初始解（構造式啟發階段的雛形），
    // 這樣視覺優化過程會更加明顯且具戲劇性。
    const shuffledNodes = [...nodesRef.current].sort(() => Math.random() - 0.5);
    shuffledNodes.forEach((node, index) => {
      routes[index % vehicleCount].push(node);
    });

    routesRef.current = routes;
    setTotalDistance(calculateTotalDistance(routes));
    setIterationCount(0);
  }, [vehicleCount, calculateTotalDistance]);

  const handleReset = useCallback(() => {
    setIsOptimizing(false);
    if (requestRef.current) cancelAnimationFrame(requestRef.current);
    initializeNodes();
    generateInitialRoutes();
    draw();
  }, [initializeNodes, generateInitialRoutes]);

  // --- 核心演算法：局部搜尋 (Local Search) ---
  const optimizeStep = useCallback(() => {
    let currentRoutes = routesRef.current.map(route => [...route]);
    let currentDist = calculateTotalDistance(currentRoutes);
    let improved = false;

    // 每一幀執行多次迭代以加速收斂
    for (let iter = 0; iter < ITERATIONS_PER_FRAME; iter++) {
      const v1Index = Math.floor(Math.random() * vehicleCount);
      const v2Index = Math.floor(Math.random() * vehicleCount);
      
      const newRoutes = currentRoutes.map(route => [...route]);
      
      if (v1Index === v2Index) {
        // Intra-route (2-opt): 在同一條路線內反轉一段路徑 (解開交叉線的關鍵)
        const route = newRoutes[v1Index];
        if (route.length > 2) {
          let i = Math.floor(Math.random() * route.length);
          let j = Math.floor(Math.random() * route.length);
          if (i > j) [i, j] = [j, i];
          
          // 反轉 i 到 j 之間的路徑
          const segment = route.slice(i, j + 1).reverse();
          newRoutes[v1Index] = [
            ...route.slice(0, i),
            ...segment,
            ...route.slice(j + 1)
          ];
        }
      } else {
        // Inter-route (Relocate): 將一個節點從一條路線移到另一條路線
        if (newRoutes[v1Index].length > 0) {
          const fromIndex = Math.floor(Math.random() * newRoutes[v1Index].length);
          const toIndex = Math.floor(Math.random() * (newRoutes[v2Index].length + 1));
          
          const node = newRoutes[v1Index].splice(fromIndex, 1)[0];
          newRoutes[v2Index].splice(toIndex, 0, node);
        }
      }

      const newDist = calculateTotalDistance(newRoutes);
      // 若分數提升（距離縮短），則接受新解
      if (newDist < currentDist) {
        currentRoutes = newRoutes;
        currentDist = newDist;
        improved = true;
      }
    }

    if (improved) {
      routesRef.current = currentRoutes;
      setTotalDistance(currentDist);
    }

    setIterationCount(prev => prev + ITERATIONS_PER_FRAME);
    draw();

    if (isOptimizing) {
      requestRef.current = requestAnimationFrame(optimizeStep);
    }
  }, [vehicleCount, calculateTotalDistance, isOptimizing]);

  // --- Canvas 繪圖邏輯 ---
  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;

    const width = canvas.width;
    const height = canvas.height;
    const scaleX = width;
    const scaleY = height;
    const depot = depotRef.current;

    // 清空畫布
    ctx.clearRect(0, 0, width, height);
    ctx.fillStyle = '#0f172a'; // Tailwind slate-900
    ctx.fillRect(0, 0, width, height);

    // 繪製路徑
    ctx.lineWidth = 2.5;
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';

    routesRef.current.forEach((route, index) => {
      if (route.length === 0) return;
      const color = VEHICLE_COLORS[index % VEHICLE_COLORS.length];
      
      ctx.beginPath();
      ctx.strokeStyle = color + '80'; // 加入透明度
      
      // 從 Depot 出發
      ctx.moveTo(depot.x * scaleX, depot.y * scaleY);
      
      // 連結所有節點
      route.forEach(node => {
        ctx.lineTo(node.x * scaleX, node.y * scaleY);
      });
      
      // 回到 Depot
      ctx.lineTo(depot.x * scaleX, depot.y * scaleY);
      ctx.stroke();

      // 繪製車輛顏色專屬的節點外框
      route.forEach(node => {
        ctx.beginPath();
        ctx.arc(node.x * scaleX, node.y * scaleY, 5, 0, Math.PI * 2);
        ctx.fillStyle = '#1e293b'; // slate-800
        ctx.fill();
        ctx.lineWidth = 2;
        ctx.strokeStyle = color;
        ctx.stroke();
      });
    });

    // 繪製 Depot (中央集散地)
    const dx = depot.x * scaleX;
    const dy = depot.y * scaleY;
    
    // 光暈效果
    const gradient = ctx.createRadialGradient(dx, dy, 2, dx, dy, 20);
    gradient.addColorStop(0, 'rgba(255, 255, 255, 0.8)');
    gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
    ctx.beginPath();
    ctx.arc(dx, dy, 20, 0, Math.PI * 2);
    ctx.fillStyle = gradient;
    ctx.fill();

    // Depot 本體
    ctx.beginPath();
    ctx.rect(dx - 8, dy - 8, 16, 16);
    ctx.fillStyle = '#ffffff';
    ctx.fill();
    ctx.strokeStyle = '#3b82f6';
    ctx.lineWidth = 3;
    ctx.stroke();

  }, []);

  // --- 生命週期與事件綁定 ---
  useEffect(() => {
    handleReset();
  }, [handleReset, vehicleCount]);

  useEffect(() => {
    if (isOptimizing) {
      requestRef.current = requestAnimationFrame(optimizeStep);
    } else if (requestRef.current) {
      cancelAnimationFrame(requestRef.current);
    }
    return () => {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  }, [isOptimizing, optimizeStep]);

  // 處理視窗縮放 (響應式滿版 Canvas)
  useEffect(() => {
    const handleResize = () => {
      if (containerRef.current && canvasRef.current) {
        const { clientWidth, clientHeight } = containerRef.current;
        // 處理高解析度螢幕 (Retina Display) 的模糊問題
        const dpr = window.devicePixelRatio || 1;
        canvasRef.current.width = clientWidth * dpr;
        canvasRef.current.height = clientHeight * dpr;
        canvasRef.current.style.width = `${clientWidth}px`;
        canvasRef.current.style.height = `${clientHeight}px`;
        const ctx = canvasRef.current.getContext('2d');
        if (ctx) ctx.scale(dpr, dpr);
        draw();
      }
    };

    window.addEventListener('resize', handleResize);
    handleResize(); // 初始化大小
    return () => window.removeEventListener('resize', handleResize);
  }, [draw]);

  // --- 畫面渲染 ---
  return (
    <div className="flex flex-col w-full h-screen bg-slate-950 text-slate-200 font-sans overflow-hidden">
      {/* 頂部控制列 */}
      <header className="flex flex-col sm:flex-row items-center justify-between p-4 bg-slate-900 border-b border-slate-800 shadow-md gap-4 z-10">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-500/20 rounded-lg">
            <Truck className="w-6 h-6 text-blue-400" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-white tracking-wide">車輛路徑優化模擬器</h1>
            <p className="text-xs text-slate-400">Timefold Solver 啟發式演算法展示</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-6">
          {/* 滑桿區 */}
          <div className="flex items-center gap-3 bg-slate-800/50 px-4 py-2 rounded-lg border border-slate-700/50">
            <label htmlFor="vehicle-slider" className="text-sm font-medium text-slate-300 whitespace-nowrap">
              車隊數量: <span className="text-white font-bold">{vehicleCount}</span>
            </label>
            <input
              id="vehicle-slider"
              type="range"
              min="1"
              max="5"
              value={vehicleCount}
              onChange={(e) => {
                setVehicleCount(parseInt(e.target.value));
                setIsOptimizing(false);
              }}
              className="w-24 sm:w-32 accent-blue-500 cursor-pointer"
              disabled={isOptimizing}
            />
          </div>

          {/* 按鈕區 */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsOptimizing(!isOptimizing)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all duration-200 ${
                isOptimizing 
                  ? 'bg-amber-500/20 text-amber-400 hover:bg-amber-500/30 border border-amber-500/50' 
                  : 'bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-500/20'
              }`}
            >
              {isOptimizing ? (
                <><Pause className="w-4 h-4" /> 暫停優化</>
              ) : (
                <><Play className="w-4 h-4" /> 執行最佳化</>
              )}
            </button>
            
            <button
              onClick={handleReset}
              className="flex items-center gap-2 px-4 py-2 rounded-lg font-medium bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white transition-colors border border-slate-700"
            >
              <RotateCcw className="w-4 h-4" /> 重置節點
            </button>
          </div>
        </div>
      </header>

      {/* 主要畫布與狀態疊加層 */}
      <main ref={containerRef} className="relative flex-1 w-full h-full bg-slate-950">
        <canvas 
          ref={canvasRef} 
          className="absolute inset-0 w-full h-full cursor-crosshair touch-none"
        />
        
        {/* 左下角狀態資訊面板 */}
        <div className="absolute bottom-6 left-6 bg-slate-900/80 backdrop-blur-md border border-slate-700 p-4 rounded-xl shadow-2xl pointer-events-none min-w-[240px]">
          <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">最佳化狀態</h3>
          
          <div className="space-y-3">
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-slate-300">當前總距離 (分數)</span>
              </div>
              <div className="text-2xl font-mono font-bold text-emerald-400">
                {/* 將標準化距離轉換為易讀的整數分數 */}
                {Math.round(totalDistance * 1000).toLocaleString()}
              </div>
            </div>
            
            <div className="pt-3 border-t border-slate-700/50">
              <div className="flex justify-between text-sm">
                <span className="text-slate-400">演算迭代次數</span>
                <span className="font-mono text-slate-300">{iterationCount.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-sm mt-1">
                <span className="text-slate-400">配送點總數</span>
                <span className="font-mono text-slate-300">{NODE_COUNT}</span>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}