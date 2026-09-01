import React, { useRef, useEffect, useState } from 'react';
import * as d3 from 'd3';

interface Node extends d3.SimulationNodeDatum {
  id: string;
  isCongested: boolean;
}

interface Link extends d3.SimulationLinkDatum<Node> {
  source: string | Node;
  target: string | Node;
  weight: number;
}

export default function App() {
  const svgRef = useRef<SVGSVGElement>(null);
  const [density, setDensity] = useState<number>(0.5);

  useEffect(() => {
    if (!svgRef.current) return;
    const width = 800;
    const height = 400;
    const svg = d3.select(svgRef.current).attr('viewBox', `0 0 ${width} ${height}`);
    svg.selectAll('*').remove();

    const nodes: Node[] = Array.from({ length: 40 }, (_, i) => ({ id: `n${i}`, isCongested: false }));
    const links: Link[] = [];

    // 建立網格狀連線與隨機捷徑 (依賴 density 滑桿)
    const cols = 8;
    const rows = 5;
    for (let i = 0; i < nodes.length; i++) {
      const row = Math.floor(i / cols);
      const col = i % cols;
      if (col < cols - 1) links.push({ source: nodes[i].id, target: nodes[i + 1].id, weight: 1 });
      if (row < rows - 1) links.push({ source: nodes[i].id, target: nodes[i + cols].id, weight: 1 });
      if (Math.random() < density && col < cols - 1 && row < rows - 1) {
        links.push({ source: nodes[i].id, target: nodes[i + cols + 1].id, weight: 1 });
      }
    }

    const simulation = d3.forceSimulation(nodes)
      .force('link', d3.forceLink(links).id((d: any) => d.id).distance(45))
      .force('charge', d3.forceManyBody().strength(-150))
      .force('center', d3.forceCenter(width / 2, height / 2));

    const link = svg.append('g').selectAll('line').data(links).enter().append('line')
      .attr('stroke', '#4ade80') // Tailwind emerald-400
      .attr('stroke-width', 2)
      .attr('class', 'road-link');

    const node = svg.append('g').selectAll('circle').data(nodes).enter().append('circle')
      .attr('r', 6)
      .attr('fill', '#94a3b8') // Tailwind slate-400
      .attr('class', 'road-node')
      .attr('id', d => d.id);

    simulation.on('tick', () => {
      link.attr('x1', (d: any) => d.source.x).attr('y1', (d: any) => d.source.y)
          .attr('x2', (d: any) => d.target.x).attr('y2', (d: any) => d.target.y);
      node.attr('cx', (d: any) => d.x).attr('cy', (d: any) => d.y);
    });

    return () => simulation.stop();
  }, [density]);

  const triggerCongestion = () => {
    if (!svgRef.current) return;
    const svg = d3.select(svgRef.current);
    
    // 實作 GNN Message Passing (漣漪效應擴散)
    const startNodeId = 'n20';
    const visitedNodes = new Set([startNodeId]);
    let currentLevel = [startNodeId];

    svg.select(`#${startNodeId}`).transition().duration(300).attr('fill', '#ef4444');

    const interval = setInterval(() => {
      if (currentLevel.length === 0) {
        clearInterval(interval);
        return;
      }
      
      const nextLevel: string[] = [];
      svg.selectAll('.road-link').each(function(d: any) {
        const sourceId = d.source.id;
        const targetId = d.target.id;
        const isSourceCurrent = currentLevel.includes(sourceId);
        const isTargetCurrent = currentLevel.includes(targetId);

        if (isSourceCurrent && !visitedNodes.has(targetId)) {
          d3.select(this as any).transition().duration(300).attr('stroke', '#ef4444');
          d3.select(svgRef.current).select(`#${targetId}`).transition().delay(150).duration(300).attr('fill', '#ef4444');
          visitedNodes.add(targetId);
          nextLevel.push(targetId);
        } else if (isTargetCurrent && !visitedNodes.has(sourceId)) {
          d3.select(this as any).transition().duration(300).attr('stroke', '#ef4444');
          d3.select(svgRef.current).select(`#${sourceId}`).transition().delay(150).duration(300).attr('fill', '#ef4444');
          visitedNodes.add(sourceId);
          nextLevel.push(sourceId);
        }
      });
      currentLevel = nextLevel;
    }, 400);
  };

return (
    // 1. 新增最外層滿版容器
    <div className="min-h-screen w-full bg-[#0a0c10] flex items-center justify-center p-4 sm:p-8 box-border">
      
      {/* 2. 原 Widget 容器：加入響應式 padding 與 max-w-5xl 延展空間 */}
      <div className="flex flex-col items-center w-full max-w-5xl p-6 sm:p-10 bg-[#0f1115] text-white rounded-2xl shadow-2xl font-sans">
        
        {/* 頂部標題列：小螢幕時標題置中，按鈕維持右側 */}
        <div className="flex flex-row justify-between items-center w-full mb-4 gap-4">
          <h1 className="text-xl sm:text-3xl font-semibold tracking-wide">GNN Traffic Congestion Simulator</h1>
          <button 
            className="p-3 bg-gray-800 hover:bg-gray-700 rounded-full transition-colors shrink-0"
            onClick={() => setDensity(0.5)}
          >
            <svg className="w-5 h-5 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path></svg>
          </button>
        </div>
        <p className="text-sm text-gray-400 mb-8 w-full text-left sm:text-center">Click any intersection node or press 'Trigger Congestion' to simulate traffic failure</p>

        {/* D3.js 圖表渲染區：加入 w-full 與 h-auto 確保 SVG 等比例縮放 */}
        <svg ref={svgRef} className="w-full h-auto max-h-[400px] bg-transparent mb-10" />

        {/* 中間數據儀表板 */}
        <div className="flex w-full justify-center gap-8 sm:gap-16 mb-8 text-center">
          <div>
            <div className="text-xs text-gray-500 font-bold tracking-widest mb-2">AFFECTED NODES</div>
            <div className="text-2xl font-semibold">0</div>
          </div>
          <div className="w-px bg-gray-700"></div>
          <div>
            <div className="text-xs text-gray-500 font-bold tracking-widest mb-2">SYSTEM LOAD</div>
            <div className="text-2xl font-semibold text-blue-100">Normal</div>
          </div>
        </div>

        {/* 底部控制列：加入 flex-wrap 讓小螢幕自動折行 */}
        <div className="flex flex-wrap md:flex-nowrap w-full gap-4 sm:gap-6 items-center bg-[#1a1c23] p-4 rounded-xl">
          <button
            className="w-full md:w-auto md:flex-1 py-4 px-6 bg-[#2d3039] hover:bg-[#3a3e49] text-gray-200 rounded-xl font-medium transition-colors"
            onClick={triggerCongestion}
          >
            Trigger Congestion
          </button>
          
          <div className="flex items-center gap-4 flex-1 w-full md:w-auto px-2 sm:px-4">
            <span className="text-sm text-gray-300 whitespace-nowrap">Network Density</span>
            <input
              type="range"
              min="0.2" max="1.0" step="0.1"
              value={density}
              onChange={(e) => setDensity(parseFloat(e.target.value))}
              className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer"
            />
          </div>
          
          <div className="px-6 py-4 bg-[#2d3039] rounded-xl text-sm font-medium w-full md:w-auto text-center shrink-0">
            {density}
          </div>
        </div>

      </div>
    </div>
  );
} // 新增這個右大括號來閉合最上方的 export default function App() {