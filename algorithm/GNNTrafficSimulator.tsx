import React, { useRef, useEffect, useState } from 'react';
import * as d3 from 'd3';

interface Node extends d3.SimulationNodeDatum {
  id: string;
  isCongested: boolean;
}

interface Link extends d3.SimulationLinkDatum<Node> {
  source: string;
  target: string;
  weight: number;
}

export default function GNNTrafficSimulator() {
  const svgRef = useRef<SVGSVGElement>(null);
  const [density, setDensity] = useState<number>(0.5);

  useEffect(() => {
    if (!svgRef.current) return;
    const width = 800;
    const height = 400;
    const svg = d3.select(svgRef.current).attr('viewBox', `0 0 ${width} ${height}`);
    svg.selectAll('*').remove();

    // 根據 density 滑桿參數動態產生虛擬路網的相鄰矩陣 (Nodes & Links)
    const nodes: Node[] = Array.from({ length: 40 }, (_, i) => ({ id: `n${i}`, isCongested: false }));
    const links: Link[] = []; // 此處實作節點連線邏輯

    const simulation = d3.forceSimulation(nodes)
      .force('link', d3.forceLink(links).id((d: any) => d.id).distance(50))
      .force('charge', d3.forceManyBody().strength(-100))
      .force('center', d3.forceCenter(width / 2, height / 2));

    // 繪製道路 (Edges)
    const link = svg.append('g').selectAll('line').data(links).enter().append('line')
      .attr('stroke', '#4ade80') // Tailwind emerald-400 (代表車流暢通)
      .attr('stroke-width', 2);

    // 繪製路口 (Nodes)
    const node = svg.append('g').selectAll('circle').data(nodes).enter().append('circle')
      .attr('r', 6)
      .attr('fill', '#94a3b8'); // Tailwind slate-400

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
    
    // 選擇特定中心節點觸發壅塞事件，透過 transition 動畫擴散紅色狀態
    svg.selectAll('circle').filter((_, i) => i === 20)
       .transition().duration(500)
       .attr('fill', '#ef4444'); // Tailwind red-500
       
    // 實作 GNN Message Passing：遍歷相鄰 Links 並依序改變 stroke 顏色，模擬回堵
  };

  return (
    <div className="flex flex-col items-center w-full max-w-4xl p-6 bg-gray-900 rounded-xl shadow-2xl">
      <div className="flex gap-8 mb-6 w-full items-center justify-between">
        <button 
          className="px-6 py-3 bg-red-600 hover:bg-red-500 text-white rounded-lg font-semibold transition-colors shadow-lg"
          onClick={triggerCongestion}
        >
          觸發交通壅塞
        </button>
        <div className="flex flex-col flex-1 max-w-xs">
          <div className="flex justify-between text-sm text-gray-300 mb-1">
            <span>網路密度 (Network Density)</span>
            <span>{density}</span>
          </div>
          <input
            type="range"
            min="0.2" max="1.0" step="0.1"
            value={density}
            onChange={(e) => setDensity(parseFloat(e.target.value))}
            className="w-full accent-blue-500 cursor-pointer"
          />
        </div>
        <button 
          className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
          onClick={() => setDensity(0.5)} // 觸發 useEffect 重置
        >
          重置網路
        </button>
      </div>
      <svg ref={svgRef} className="w-full h-[400px] bg-black rounded-lg border border-gray-800" />
    </div>
  );
}