'use client';

import React, { useState, useRef, useEffect } from 'react';

interface KnowledgeNode {
  id: string;
  name: string;
  subject: string;
  level: number;
  worksCount: number;
  x: number;
  y: number;
  connections: string[];
}

interface MobileKnowledgeGraphProps {
  nodes: KnowledgeNode[];
  onNodeClick?: (nodeId: string) => void;
}

const MobileKnowledgeGraph: React.FC<MobileKnowledgeGraphProps> = ({ 
  nodes, 
  onNodeClick 
}) => {
  const [viewMode, setViewMode] = useState<'overview' | 'detail'>('overview');
  const [selectedNode, setSelectedNode] = useState<KnowledgeNode | null>(null);
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [lastTouch, setLastTouch] = useState({ x: 0, y: 0 });
  
  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  // 获取节点颜色
  const getNodeColor = (level: number, worksCount: number) => {
    if (worksCount === 0) return '#E5E7EB'; // 灰色 - 无作品
    
    switch (level) {
      case 1: return '#3B82F6'; // 蓝色 - 一级节点
      case 2: return '#10B981'; // 绿色 - 二级节点
      case 3: return '#F59E0B'; // 黄色 - 三级节点
      default: return '#6B7280'; // 灰色 - 其他
    }
  };

  // 获取节点大小
  const getNodeSize = (level: number, worksCount: number) => {
    const baseSize = 20;
    const levelMultiplier = level === 1 ? 1.5 : level === 2 ? 1.2 : 1;
    const worksMultiplier = Math.min(1 + worksCount * 0.1, 2);
    return baseSize * levelMultiplier * worksMultiplier;
  };

  // 处理节点点击
  const handleNodeClick = (node: KnowledgeNode) => {
    setSelectedNode(node);
    setViewMode('detail');
    onNodeClick?.(node.id);
  };

  // 处理触摸开始
  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      setIsDragging(true);
      setLastTouch({
        x: e.touches[0].clientX,
        y: e.touches[0].clientY
      });
    }
  };

  // 处理触摸移动
  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging || e.touches.length !== 1) return;
    
    e.preventDefault();
    
    const deltaX = e.touches[0].clientX - lastTouch.x;
    const deltaY = e.touches[0].clientY - lastTouch.y;
    
    setPosition(prev => ({
      x: prev.x + deltaX,
      y: prev.y + deltaY
    }));
    
    setLastTouch({
      x: e.touches[0].clientX,
      y: e.touches[0].clientY
    });
  };

  // 处理触摸结束
  const handleTouchEnd = () => {
    setIsDragging(false);
  };

  // 处理缩放
  const handleZoom = (zoomIn: boolean) => {
    setScale(prev => {
      const newScale = zoomIn ? prev * 1.2 : prev / 1.2;
      return Math.max(0.5, Math.min(3, newScale));
    });
  };

  // 重置视图
  const resetView = () => {
    setScale(1);
    setPosition({ x: 0, y: 0 });
  };

  // 计算SVG视图框
  const viewBox = `${-position.x / scale} ${-position.y / scale} ${300 / scale} ${400 / scale}`;

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
      {/* 控制栏 */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200">
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setViewMode('overview')}
            className={`px-3 py-1 text-sm font-medium rounded-md transition-colors duration-200 ${
              viewMode === 'overview'
                ? 'bg-indigo-100 text-indigo-700'
                : 'text-gray-600 hover:text-gray-900'
            }`}
            style={{ touchAction: 'manipulation' }}
          >
            总览
          </button>
          <button
            onClick={() => setViewMode('detail')}
            className={`px-3 py-1 text-sm font-medium rounded-md transition-colors duration-200 ${
              viewMode === 'detail'
                ? 'bg-indigo-100 text-indigo-700'
                : 'text-gray-600 hover:text-gray-900'
            }`}
            style={{ touchAction: 'manipulation' }}
          >
            详情
          </button>
        </div>

        {viewMode === 'overview' && (
          <div className="flex items-center space-x-2">
            <button
              onClick={() => handleZoom(false)}
              className="p-1 text-gray-600 hover:text-gray-900 rounded"
              style={{ touchAction: 'manipulation' }}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
              </svg>
            </button>
            <button
              onClick={resetView}
              className="p-1 text-gray-600 hover:text-gray-900 rounded"
              style={{ touchAction: 'manipulation' }}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </button>
            <button
              onClick={() => handleZoom(true)}
              className="p-1 text-gray-600 hover:text-gray-900 rounded"
              style={{ touchAction: 'manipulation' }}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
            </button>
          </div>
        )}
      </div>

      {/* 内容区域 */}
      <div className="h-80">
        {viewMode === 'overview' ? (
          // 图谱总览
          <div 
            ref={containerRef}
            className="relative w-full h-full overflow-hidden bg-gray-50"
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
          >
            <svg
              ref={svgRef}
              className="w-full h-full"
              viewBox={viewBox}
              style={{ touchAction: 'none' }}
            >
              {/* 连接线 */}
              <g>
                {nodes.map(node => 
                  node.connections.map(connectionId => {
                    const targetNode = nodes.find(n => n.id === connectionId);
                    if (!targetNode) return null;
                    
                    return (
                      <line
                        key={`${node.id}-${connectionId}`}
                        x1={node.x}
                        y1={node.y}
                        x2={targetNode.x}
                        y2={targetNode.y}
                        stroke="#D1D5DB"
                        strokeWidth="2"
                      />
                    );
                  })
                )}
              </g>

              {/* 节点 */}
              <g>
                {nodes.map(node => {
                  const nodeSize = getNodeSize(node.level, node.worksCount);
                  const nodeColor = getNodeColor(node.level, node.worksCount);
                  
                  return (
                    <g key={node.id}>
                      <circle
                        cx={node.x}
                        cy={node.y}
                        r={nodeSize}
                        fill={nodeColor}
                        stroke="#FFFFFF"
                        strokeWidth="2"
                        className="cursor-pointer"
                        onClick={() => handleNodeClick(node)}
                      />
                      <text
                        x={node.x}
                        y={node.y + nodeSize + 15}
                        textAnchor="middle"
                        className="text-xs fill-gray-700 pointer-events-none"
                        style={{ fontSize: '10px' }}
                      >
                        {node.name}
                      </text>
                      {node.worksCount > 0 && (
                        <text
                          x={node.x}
                          y={node.y + 3}
                          textAnchor="middle"
                          className="text-xs fill-white font-bold pointer-events-none"
                          style={{ fontSize: '8px' }}
                        >
                          {node.worksCount}
                        </text>
                      )}
                    </g>
                  );
                })}
              </g>
            </svg>

            {/* 图例 */}
            <div className="absolute bottom-4 left-4 bg-white rounded-lg shadow-sm border border-gray-200 p-3">
              <div className="text-xs font-medium text-gray-900 mb-2">图例</div>
              <div className="space-y-1">
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                  <span className="text-xs text-gray-600">一级概念</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 rounded-full bg-green-500"></div>
                  <span className="text-xs text-gray-600">二级概念</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                  <span className="text-xs text-gray-600">三级概念</span>
                </div>
              </div>
            </div>
          </div>
        ) : (
          // 节点详情
          <div className="p-4 h-full overflow-y-auto">
            {selectedNode ? (
              <div className="space-y-4">
                {/* 节点信息 */}
                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="flex items-center space-x-3 mb-3">
                    <div 
                      className="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-bold"
                      style={{ backgroundColor: getNodeColor(selectedNode.level, selectedNode.worksCount) }}
                    >
                      {selectedNode.worksCount}
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">
                        {selectedNode.name}
                      </h3>
                      <p className="text-sm text-gray-600">
                        {selectedNode.subject} • 第{selectedNode.level}级概念
                      </p>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-gray-500">作品数量</span>
                      <div className="font-semibold text-gray-900">
                        {selectedNode.worksCount}个
                      </div>
                    </div>
                    <div>
                      <span className="text-gray-500">关联概念</span>
                      <div className="font-semibold text-gray-900">
                        {selectedNode.connections.length}个
                      </div>
                    </div>
                  </div>
                </div>

                {/* 关联概念 */}
                {selectedNode.connections.length > 0 && (
                  <div>
                    <h4 className="text-sm font-medium text-gray-900 mb-3">关联概念</h4>
                    <div className="space-y-2">
                      {selectedNode.connections.map(connectionId => {
                        const connectedNode = nodes.find(n => n.id === connectionId);
                        if (!connectedNode) return null;
                        
                        return (
                          <button
                            key={connectionId}
                            onClick={() => handleNodeClick(connectedNode)}
                            className="w-full flex items-center justify-between p-3 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 active:bg-gray-100 transition-colors duration-200"
                            style={{ touchAction: 'manipulation' }}
                          >
                            <div className="flex items-center space-x-3">
                              <div 
                                className="w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-bold"
                                style={{ backgroundColor: getNodeColor(connectedNode.level, connectedNode.worksCount) }}
                              >
                                {connectedNode.worksCount}
                              </div>
                              <div className="text-left">
                                <div className="text-sm font-medium text-gray-900">
                                  {connectedNode.name}
                                </div>
                                <div className="text-xs text-gray-500">
                                  第{connectedNode.level}级 • {connectedNode.worksCount}个作品
                                </div>
                              </div>
                            </div>
                            <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                            </svg>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* 操作按钮 */}
                <div className="flex space-x-3">
                  <button
                    className="flex-1 px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-lg text-gray-700 bg-white hover:bg-gray-50 active:bg-gray-100 transition-colors duration-200"
                    style={{ 
                      minHeight: '44px',
                      touchAction: 'manipulation'
                    }}
                  >
                    查看作品
                  </button>
                  <button
                    className="flex-1 px-4 py-2 border border-transparent text-sm font-medium rounded-lg text-white bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 transition-colors duration-200"
                    style={{ 
                      minHeight: '44px',
                      touchAction: 'manipulation'
                    }}
                  >
                    添加作品
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-center h-full">
                <div className="text-center">
                  <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <p className="text-gray-500 text-sm">请选择一个概念节点查看详情</p>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default React.memo(MobileKnowledgeGraph);