import React, { useRef, useEffect, useState } from 'react';
import * as d3 from 'd3';

interface Node extends d3.SimulationNodeDatum {
  id: string;
  isCongested: boolean;
}

interface Link extends d3.SimulationLinkDatum<Node> {
  id: string;
  source: string | Node;
  target: string | Node;
  weight: number;
}

export default function App() {
  const svgRef = useRef<SVGSVGElement>(null);
  const [density, setDensity] = useState<number>(0.5);
  const [affectedNodes, setAffectedNodes] = useState<number>(0);
  const [systemLoad, setSystemLoad] = useState<string>('Normal');
  const [resetKey, setResetKey] = useState<number>(0); // 綁定 Reset 狀態
  const intervalsRef = useRef<number[]>([]); // 統一管理計時器以便清除

  const clearAllIntervals = () => {
    intervalsRef.current.forEach(clearInterval);
    intervalsRef.current = [];
  };

  const handleReset = () => {
    clearAllIntervals();
    setResetKey(prev => prev + 1);
    setAffectedNodes(0);
    setSystemLoad('Normal');
  };

  // D3 圖表與互動邏輯
  useEffect(() => {
    if (!svgRef.current) return;
    clearAllIntervals();
    const width = 800;
    const height = 350;
    const svg = d3.select(svgRef.current).attr('viewBox', `0 0 ${width} ${height}`);
    svg.selectAll('*').remove();

    const cols = 9;
    const rows = 5;
    const xSpacing = 85;
    const ySpacing = 70;
    const xOffset = (width - (cols - 1) * xSpacing) / 2;
    const yOffset = (height - (rows - 1) * ySpacing) / 2;

    const nodes: Node[] = Array.from({ length: cols * rows }, (_, i) => {
      const col = i % cols;
      const row = Math.floor(i / cols);
      return {
        id: `n${i}`,
        isCongested: false,
        x: xOffset + col * xSpacing,
        y: yOffset + row * ySpacing,
        fx: xOffset + col * xSpacing,
        fy: yOffset + row * ySpacing
      };
    });

    const links: Link[] = [];
    for (let i = 0; i < nodes.length; i++) {
      const row = Math.floor(i / cols);
      const col = i % cols;
      if (col < cols - 1) links.push({ id: `l-${i}-h`, source: nodes[i].id, target: nodes[i + 1].id, weight: 1 });
      if (row < rows - 1) links.push({ id: `l-${i}-v`, source: nodes[i].id, target: nodes[i + cols].id, weight: 1 });
      
      if (Math.random() < density && col < cols - 1 && row < rows - 1) {
        links.push({ id: `l-${i}-d1`, source: nodes[i].id, target: nodes[i + cols + 1].id, weight: 1 });
        if (Math.random() > 0.5) {
          links.push({ id: `l-${i}-d2`, source: nodes[i + 1].id, target: nodes[i + cols].id, weight: 1 });
        }
      }
    }

    const simulation = d3.forceSimulation(nodes)
      .force('link', d3.forceLink(links).id((d: any) => d.id))
      .force('charge', d3.forceManyBody().strength(-50));

    // 建立圖層順序：線條 -> 粒子 -> 節點光暈與核心
    const linksLayer = svg.append('g').attr('class', 'links-layer');
    const particlesLayer = svg.append('g').attr('class', 'particles-layer');
    const nodesLayer = svg.append('g').attr('class', 'nodes-layer');

    const link = linksLayer.selectAll('line').data(links).enter().append('line')
      .attr('id', d => d.id)
      .attr('stroke', '#4ade80') 
      .attr('stroke-width', 2)
      .attr('class', 'road-link transition-all duration-300');

    const drag = d3.drag<SVGGElement, any>()
      .on('start', (event, d) => {
        if (!event.active) simulation.alphaTarget(0.3).restart();
      })
      .on('drag', (event, d) => {
        d.fx = event.x;
        d.fy = event.y;
      })
      .on('end', (event, d) => {
        if (!event.active) simulation.alphaTarget(0);
      });

    const nodeGroup = nodesLayer.selectAll('g').data(nodes).enter().append('g')
      .attr('class', 'cursor-grab active:cursor-grabbing')
      .call(drag)
      .on('click', function(event, d) {
        if (event.defaultPrevented) return; 
        triggerCongestionFromNode(d.id);
      });

    // 節點：外層光暈 (Glow)
    nodeGroup.append('circle')
      .attr('id', d => `glow-${d.id}`)
      .attr('r', 16)
      .attr('fill', 'none')
      .attr('stroke', 'rgba(255, 255, 255, 0.05)')
      .attr('stroke-width', 1)
      .attr('class', 'transition-all duration-300');

    // 節點：中心實體 (Core)
    nodeGroup.append('circle')
      .attr('id', d => `core-${d.id}`)
      .attr('r', 6)
      .attr('fill', '#475569')
      .attr('stroke', '#94a3b8')
      .attr('stroke-width', 2)
      .attr('class', 'transition-all duration-300');

    simulation.on('tick', () => {
      link.attr('x1', (d: any) => d.source.x).attr('y1', (d: any) => d.source.y)
          .attr('x2', (d: any) => d.target.x).attr('y2', (d: any) => d.target.y);
      nodeGroup.attr('transform', (d: any) => `translate(${d.x},${d.y})`);
    });

    // 產生車流粒子特效
    const spawnParticle = () => {
      if (links.length === 0) return;
      const targetLink = links[Math.floor(Math.random() * links.length)];
      const source = targetLink.source as Node;
      const target = targetLink.target as Node;
      
      particlesLayer.append('circle')
        .attr('r', 1.5)
        .attr('fill', '#ffffff')
        .attr('cx', source.x)
        .attr('cy', source.y)
        .style('opacity', 0.8)
        .transition().duration(1500 + Math.random() * 1500).ease(d3.easeLinear)
        .attr('cx', target.x)
        .attr('cy', target.y)
        .on('end', function() { d3.select(this).remove(); });
    };

    const particleInterval = window.setInterval(spawnParticle, 150);
    intervalsRef.current.push(particleInterval);

    return () => {
      simulation.stop();
      clearAllIntervals();
    };
  }, [density, resetKey]); // 加入 resetKey 觸發重新渲染

  // 具備波前(Wave-front)雙色邏輯的擴散動畫
  const triggerCongestionFromNode = (startNodeId: string) => {
    if (!svgRef.current) return;
    const svg = d3.select(svgRef.current);
    const visitedNodes = new Set([startNodeId]);
    const visitedLinks = new Set<string>();
    
    let currentLevel = [startNodeId];
    let affectedCount = 1;

    setSystemLoad('Warning');
    
    // 初始化起點為黃色 (Warning 前導波)
    svg.select(`#core-${startNodeId}`).attr('fill', '#fbbf24').attr('stroke', '#f59e0b');
    svg.select(`#glow-${startNodeId}`).attr('stroke', '#fbbf24').attr('r', 20).style('opacity', 0.6).attr('stroke-width', 2);
    setAffectedNodes(affectedCount);

    const interval = window.setInterval(() => {
      if (currentLevel.length === 0) {
        clearInterval(interval);
        if (affectedCount > 15) setSystemLoad('Critical');
        return;
      }
      
      // 1. 將上一波的黃色 (Warning) 轉為粉紅色 (Congested)
      currentLevel.forEach(id => {
        svg.select(`#core-${id}`).transition().duration(400).attr('fill', '#fca5a5').attr('stroke', '#f87171');
        svg.select(`#glow-${id}`).transition().duration(400).attr('stroke', '#fca5a5').attr('r', 24).style('opacity', 0.3).attr('stroke-width', 6);
      });

      const nextLevel: string[] = [];
      
      svg.selectAll('.road-link').each(function(d: any) {
        const sourceId = d.source.id;
        const targetId = d.target.id;
        const isSourceCurrent = currentLevel.includes(sourceId);
        const isTargetCurrent = currentLevel.includes(targetId);

        if ((isSourceCurrent || isTargetCurrent) && !visitedLinks.has(d.id)) {
          // 線段變為壅塞前導色 (黃色) 並加粗
          d3.select(this as any).transition().duration(300).attr('stroke', '#fbbf24').attr('stroke-width', 4);
          visitedLinks.has(d.id) ? null : visitedLinks.add(d.id);
          
          // 後續將線段轉為深粉紅
          d3.select(this as any).transition().delay(400).duration(400).attr('stroke', '#fca5a5');
        }

        if (isSourceCurrent && !visitedNodes.has(targetId)) {
          // 新節點染為黃色 (前導波)
          svg.select(`#core-${targetId}`).transition().delay(150).duration(300).attr('fill', '#fbbf24').attr('stroke', '#f59e0b');
          svg.select(`#glow-${targetId}`).transition().delay(150).duration(300).attr('stroke', '#fbbf24').attr('r', 20).style('opacity', 0.6).attr('stroke-width', 2);
          visitedNodes.add(targetId);
          nextLevel.push(targetId);
          affectedCount++;
        } else if (isTargetCurrent && !visitedNodes.has(sourceId)) {
          svg.select(`#core-${sourceId}`).transition().delay(150).duration(300).attr('fill', '#fbbf24').attr('stroke', '#f59e0b');
          svg.select(`#glow-${sourceId}`).transition().delay(150).duration(300).attr('stroke', '#fbbf24').attr('r', 20).style('opacity', 0.6).attr('stroke-width', 2);
          visitedNodes.add(sourceId);
          nextLevel.push(sourceId);
          affectedCount++;
        }
      });
      currentLevel = nextLevel;
      setAffectedNodes(affectedCount);
    }, 600); // 放慢擴散速度以彰顯雙色過場效果
    
    intervalsRef.current.push(interval);
  };

  return (
    <div className="min-h-screen w-full bg-[#0a0c10] flex items-center justify-center p-4 sm:p-8 box-border select-none">
      <div className="flex flex-col items-center w-full max-w-5xl p-6 sm:p-10 bg-[#0f1115] text-white rounded-2xl shadow-2xl font-sans relative">
        
        <div className="flex flex-row justify-between items-center w-full mb-4 gap-4">
          <h1 className="text-xl sm:text-3xl font-semibold tracking-wide">GNN Traffic Congestion Simulator</h1>
          
          {/* 綁定 handleReset 邏輯的按鈕 */}
          <button 
            className="p-3 bg-gray-800 hover:bg-gray-700 rounded-full transition-colors shrink-0 shadow-lg cursor-pointer z-10"
            onClick={handleReset}
            title="Reset Simulator"
          >
            <svg className="w-5 h-5 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path></svg>
          </button>
        </div>
        
        <p className="text-sm text-gray-400 mb-8 w-full text-left sm:text-center">Click any intersection node or press 'Trigger Congestion' to simulate traffic failure</p>

        <svg ref={svgRef} className="w-full h-auto max-h-[400px] bg-transparent mb-10" />

        <div className="flex w-full justify-center gap-8 sm:gap-16 mb-8 text-center">
          <div>
            <div className="text-xs text-gray-500 font-bold tracking-widest mb-2">AFFECTED NODES</div>
            <div className="text-2xl font-semibold">{affectedNodes}</div>
          </div>
          <div className="w-px bg-gray-700"></div>
          <div>
            <div className="text-xs text-gray-500 font-bold tracking-widest mb-2">SYSTEM LOAD</div>
            <div className={`text-2xl font-semibold ${systemLoad === 'Critical' ? 'text-red-400' : systemLoad === 'Warning' ? 'text-yellow-400' : 'text-blue-100'}`}>
              {systemLoad}
            </div>
          </div>
        </div>

        <div className="flex flex-wrap md:flex-nowrap w-full gap-4 sm:gap-6 items-center bg-[#1a1c23] p-4 rounded-xl">
          <button
            className="w-full md:w-auto md:flex-1 py-4 px-6 bg-[#2d3039] hover:bg-[#3a3e49] text-gray-200 rounded-xl font-medium transition-colors"
            onClick={() => triggerCongestionFromNode('n22')}
          >
            Trigger Congestion
          </button>
          
          <div className="flex items-center gap-4 flex-1 w-full md:w-auto px-2 sm:px-4">
            <span className="text-sm text-gray-300 whitespace-nowrap">Network Density</span>
            <input
              type="range"
              min="0.2" max="1.0" step="0.1"
              value={density}
              onChange={(e) => {
                setDensity(parseFloat(e.target.value));
                handleReset(); // 拉動滑桿時自動重置圖表
              }}
              className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer"
            />
          </div>
          
          <div className="px-6 py-4 bg-[#2d3039] rounded-xl text-sm font-medium w-full md:w-auto text-center shrink-0">
            {density.toFixed(1)}
          </div>
        </div>

      </div>
    </div>
  );
}