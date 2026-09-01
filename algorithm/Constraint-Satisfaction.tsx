import React, { useState, useEffect, useRef, useCallback } from 'react';
import { RotateCcw } from 'lucide-react';

// --- 型別定義 ---
type ShiftType = 'DAY' | 'NIGHT' | 'OFF';

interface Employee {
  id: string;
  name: string;
  preferredOffDay: number; 
}

interface Score {
  hard: number;
  soft: number;
  violations: Set<string>; 
}

// --- 常數設定 ---
const EMPLOYEES: Employee[] = [
  { id: 'E1', name: '護理師 A', preferredOffDay: 5 }, 
  { id: 'E2', name: '護理師 B', preferredOffDay: 6 }, 
  { id: 'E3', name: '護理師 C', preferredOffDay: 2 },
  { id: 'E4', name: '護理師 D', preferredOffDay: 4 },
  { id: 'E5', name: '護理師 E', preferredOffDay: 0 },
];
const DAYS = ['週一', '週二', '週三', '週四', '週五', '週六', '週日'];
const SHIFT_TYPES: ShiftType[] = ['DAY', 'NIGHT', 'OFF'];
const ITERATIONS_PER_FRAME = 50;

export default function App() {
  const [grid, setGrid] = useState<Record<string, ShiftType[]>>({});
  const [isOptimizing, setIsOptimizing] = useState<boolean>(false);
  const [score, setScore] = useState<Score>({ hard: 0, soft: 0, violations: new Set() });
  const [strictLeave, setStrictLeave] = useState<boolean>(true);
  
  const requestRef = useRef<number>();
  const gridRef = useRef<Record<string, ShiftType[]>>({});

  // --- 評估函數 (計算分數與違規) ---
  const evaluateScore = useCallback((currentGrid: Record<string, ShiftType[]>, isStrictLeave: boolean): Score => {
    let hardScore = 0;
    let softScore = 0;
    const violations = new Set<string>();

    for (let day = 0; day < 7; day++) {
      let dayCount = 0;
      let nightCount = 0;
      
      EMPLOYEES.forEach(emp => {
        if (currentGrid[emp.id]?.[day] === 'DAY') dayCount++;
        if (currentGrid[emp.id]?.[day] === 'NIGHT') nightCount++;
      });

      if (dayCount < 2) {
        hardScore -= (2 - dayCount) * 10;
        EMPLOYEES.forEach(emp => {
           if (currentGrid[emp.id]?.[day] === 'OFF') violations.add(`${emp.id}-${day}`);
        });
      }
      if (nightCount < 1) {
        hardScore -= (1 - nightCount) * 20;
        EMPLOYEES.forEach(emp => {
           if (currentGrid[emp.id]?.[day] === 'OFF' || currentGrid[emp.id]?.[day] === 'DAY') violations.add(`${emp.id}-${day}`);
        });
      }
      if (dayCount > 2) softScore -= (dayCount - 2) * 5;
    }

    EMPLOYEES.forEach(emp => {
      const schedule = currentGrid[emp.id];
      if (!schedule) return;
      
      let consecutiveWork = 0;

      for (let day = 0; day < 7; day++) {
        const shift = schedule[day];
        
        if (day < 6 && shift === 'NIGHT' && schedule[day + 1] === 'DAY') {
          hardScore -= 50;
          violations.add(`${emp.id}-${day}`);
          violations.add(`${emp.id}-${day + 1}`);
        }

        if (shift !== 'OFF') {
          consecutiveWork++;
          if (consecutiveWork > 5) {
            hardScore -= 30;
            violations.add(`${emp.id}-${day}`);
          }
        } else {
          consecutiveWork = 0;
        }

        if (day === emp.preferredOffDay) {
          if (shift !== 'OFF') {
            if (isStrictLeave) {
              hardScore -= 40;
              violations.add(`${emp.id}-${day}`);
            } else {
              softScore -= 20;
            }
          } else {
            softScore += 10; 
          }
        }
      }
      
      const offDays = schedule.filter(s => s === 'OFF').length;
      if (offDays < 2) softScore -= (2 - offDays) * 10;
      else if (offDays > 2) softScore -= (offDays - 2) * 5;
    });

    return { hard: hardScore, soft: softScore, violations };
  }, []);

  // --- 初始化與重置 ---
  const initializeGrid = useCallback(() => {
    setIsOptimizing(false);
    const newGrid: Record<string, ShiftType[]> = {};
    EMPLOYEES.forEach(emp => {
      newGrid[emp.id] = Array.from({ length: 7 }, () => 
        SHIFT_TYPES[Math.floor(Math.random() * SHIFT_TYPES.length)]
      );
    });
    gridRef.current = newGrid;
    setGrid(newGrid);
    setScore(evaluateScore(newGrid, strictLeave));
  }, [evaluateScore, strictLeave]);

  // --- 手動點擊儲存格切換班別 ---
  const handleCellClick = (empId: string, dayIdx: number) => {
    if (isOptimizing) return; // 最佳化進行中不允許手動修改
    
    const currentShift = grid[empId][dayIdx];
    // 循環切換：日 -> 夜 -> 休 -> 日
    const nextShiftMap: Record<ShiftType, ShiftType> = {
      'DAY': 'NIGHT',
      'NIGHT': 'OFF',
      'OFF': 'DAY'
    };
    const nextShift = nextShiftMap[currentShift];

    const newGrid = { ...grid };
    newGrid[empId] = [...newGrid[empId]];
    newGrid[empId][dayIdx] = nextShift;

    gridRef.current = newGrid;
    setGrid(newGrid);
    setScore(evaluateScore(newGrid, strictLeave));
  };

  // --- 核心演算法：局部搜尋 ---
  const optimizeStep = useCallback(() => {
    let currentGrid = { ...gridRef.current };
    let currentScore = evaluateScore(currentGrid, strictLeave);
    let improved = false;

    if (currentScore.hard === 0 && currentScore.soft > 30) {
      setIsOptimizing(false);
      return;
    }

    for (let iter = 0; iter < ITERATIONS_PER_FRAME; iter++) {
      const newGrid: Record<string, ShiftType[]> = {};
      EMPLOYEES.forEach(emp => {
        newGrid[emp.id] = [...currentGrid[emp.id]];
      });

      if (Math.random() > 0.4) {
        const randomEmp = EMPLOYEES[Math.floor(Math.random() * EMPLOYEES.length)].id;
        const randomDay = Math.floor(Math.random() * 7);
        const currentShift = newGrid[randomEmp][randomDay];
        const otherShifts = SHIFT_TYPES.filter(s => s !== currentShift);
        newGrid[randomEmp][randomDay] = otherShifts[Math.floor(Math.random() * otherShifts.length)];
      } else {
        const isSameDaySwap = Math.random() > 0.5;
        if (isSameDaySwap) {
          const emp1 = EMPLOYEES[Math.floor(Math.random() * EMPLOYEES.length)].id;
          const emp2 = EMPLOYEES[Math.floor(Math.random() * EMPLOYEES.length)].id;
          const day = Math.floor(Math.random() * 7);
          const temp = newGrid[emp1][day];
          newGrid[emp1][day] = newGrid[emp2][day];
          newGrid[emp2][day] = temp;
        } else {
          const emp = EMPLOYEES[Math.floor(Math.random() * EMPLOYEES.length)].id;
          const day1 = Math.floor(Math.random() * 7);
          const day2 = Math.floor(Math.random() * 7);
          const temp = newGrid[emp][day1];
          newGrid[emp][day1] = newGrid[emp][day2];
          newGrid[emp][day2] = temp;
        }
      }

      const newScore = evaluateScore(newGrid, strictLeave);

      if (newScore.hard > currentScore.hard || 
         (newScore.hard === currentScore.hard && newScore.soft >= currentScore.soft)) {
        currentGrid = newGrid;
        currentScore = newScore;
        improved = true;
      }
    }

    if (improved) {
      gridRef.current = currentGrid;
      setGrid(currentGrid);
      setScore(currentScore);
    }

    if (isOptimizing) {
      requestRef.current = requestAnimationFrame(optimizeStep);
    }
  }, [evaluateScore, strictLeave, isOptimizing]);

  useEffect(() => {
    initializeGrid();
  }, [initializeGrid]);

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

  useEffect(() => {
    if (Object.keys(gridRef.current).length > 0) {
      setScore(evaluateScore(gridRef.current, strictLeave));
    }
  }, [strictLeave, evaluateScore]);

  // --- UI 渲染輔助函數 ---
  const getShiftStyle = (shift: ShiftType, isViolation: boolean) => {
    let base = "flex items-center justify-center h-14 rounded-lg text-sm font-bold transition-all duration-200 select-none cursor-pointer ";
    
    if (shift === 'DAY') base += "bg-[#def2ff] text-[#0077d4] hover:bg-[#cbe8ff]";
    else if (shift === 'NIGHT') base += "bg-[#f5e1f5] text-[#9b4d9b] hover:bg-[#eed4ee]";
    else if (shift === 'OFF') base += "bg-[#2a2a2a] text-[#888888] hover:bg-[#333333]";

    if (isViolation) {
      base += " ring-2 ring-red-500 ring-offset-2 ring-offset-[#111]";
    }
    
    if (isOptimizing) base += " opacity-90 pointer-events-none";

    return base;
  };

  const getShiftLabel = (shift: ShiftType) => {
    if (shift === 'DAY') return '日';
    if (shift === 'NIGHT') return '夜';
    return '休';
  };

  return (
    <div className="min-h-screen bg-[#111111] text-gray-200 font-sans flex flex-col items-center py-10 px-6">
      
      {/* 頂部標題與重置按鈕 */}
      <div className="w-full max-w-4xl flex justify-between items-center mb-10">
        <h1 className="text-2xl font-bold text-white">護理師排班最佳化模擬</h1>
        <button 
          onClick={initializeGrid}
          className="w-10 h-10 rounded-full bg-[#222] hover:bg-[#333] flex items-center justify-center transition-colors"
        >
          <RotateCcw className="w-5 h-5 text-gray-300" />
        </button>
      </div>

      {/* 班表 Grid */}
      <div className="w-full max-w-4xl mb-12">
        <div className="grid grid-cols-8 gap-3 mb-4">
          <div className="text-gray-400 font-medium text-sm flex items-center justify-center">人員 / 日期</div>
          {DAYS.map((day, idx) => (
            <div key={idx} className="text-center text-gray-400 font-bold text-sm flex items-center justify-center">
              {day}
            </div>
          ))}
        </div>

        {EMPLOYEES.map(emp => (
          <div key={emp.id} className="grid grid-cols-8 gap-3 mb-3">
            <div className="text-sm font-bold text-white flex items-center justify-center">
              {emp.name}
            </div>
            {grid[emp.id]?.map((shift, dayIdx) => {
              const isViolation = score.violations.has(`${emp.id}-${dayIdx}`);
              return (
                <div 
                  key={`${emp.id}-${dayIdx}`} 
                  className={getShiftStyle(shift, isViolation)}
                  onClick={() => handleCellClick(emp.id, dayIdx)}
                >
                  {getShiftLabel(shift)}
                </div>
              );
            })}
          </div>
        ))}
      </div>

      {/* 分數顯示區 */}
      <div className="w-full max-w-4xl flex justify-center items-center gap-16 mb-12">
        <div className="text-center">
          <div className="text-gray-400 text-sm font-bold mb-2">硬約束分數 (HARD)</div>
          <div className="text-2xl font-bold text-white">{score.hard}</div>
        </div>
        <div className="w-px h-10 bg-gray-700"></div>
        <div className="text-center">
          <div className="text-gray-400 text-sm font-bold mb-2">軟約束分數 (SOFT)</div>
          <div className="text-2xl font-bold text-white">{score.soft}</div>
        </div>
      </div>

      {/* 底部控制區 */}
      <div className="w-full max-w-4xl flex justify-between items-center bg-[#111]">
        <button
          onClick={() => setIsOptimizing(!isOptimizing)}
          className="bg-[#2a2a2a] hover:bg-[#3a3a3a] text-white text-lg font-bold py-4 px-12 rounded-full w-1/2 transition-colors border border-[#333]"
        >
          {isOptimizing ? '暫停' : '執行最佳化'}
        </button>

        <div className="flex items-center gap-4">
          <span className="text-gray-300 font-bold">嚴格執行休假偏好</span>
          <label className="relative inline-flex items-center cursor-pointer">
            <input 
              type="checkbox" 
              className="sr-only peer"
              checked={strictLeave}
              onChange={() => setStrictLeave(!strictLeave)}
            />
            <div className="w-12 h-6 bg-gray-600 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-white"></div>
          </label>
        </div>
      </div>

    </div>
  );
}