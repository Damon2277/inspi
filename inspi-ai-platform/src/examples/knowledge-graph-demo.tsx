/**
 * 知识图谱可视化演示
 * 展示Task3实现的完整功能
 */
'use client';

import React, { useState } from 'react';

import { KnowledgeGraphEditor } from '@/components/knowledge-graph/KnowledgeGraphEditor';
import {
  KnowledgeGraph,
  GraphNode,
  GraphEdge,
  NodeType,
  EdgeType,
  GraphType,
  GraphLayout,
} from '@/shared/types/knowledgeGraph';

// 创建演示数据
const createDemoGraph = (): KnowledgeGraph => {
  const nodes: GraphNode[] = [
    {
      id: 'math',
      label: '数学',
      type: NodeType.SUBJECT,
      level: 0,
      position: { x: 400, y: 200 },
      metadata: {
        workCount: 15,
        reuseCount: 8,
        description: '数学是研究数量、结构、变化、空间以及信息等概念的一门学科',
        tags: ['基础学科', '理科'],
      },
      isVisible: true,
      isLocked: false,

    },
    {
      id: 'algebra',
      label: '代数',
      type: NodeType.CHAPTER,
      level: 1,
      parentId: 'math',
      position: { x: 300, y: 300 },
      metadata: {
        workCount: 8,
        reuseCount: 4,
        description: '代数是数学的一个分支，研究数、数量关系与数量结构',
        tags: ['抽象', '符号运算'],
      },
      isVisible: true,
      isLocked: false,

    },
    {
      id: 'geometry',
      label: '几何',
      type: NodeType.CHAPTER,
      level: 1,
      parentId: 'math',
      position: { x: 500, y: 300 },
      metadata: {
        workCount: 12,
        reuseCount: 6,
        description: '几何学是数学的一个分支，研究空间的性质',
        tags: ['空间', '图形'],
      },
      isVisible: true,
      isLocked: false,

    },
    {
      id: 'linear-equations',
      label: '线性方程',
      type: NodeType.CONCEPT,
      level: 2,
      parentId: 'algebra',
      position: { x: 250, y: 400 },
      metadata: {
        workCount: 20,
        reuseCount: 12,
        description: '线性方程是关于未知数的一次方程',
        tags: ['方程', '一次函数'],
      },
      isVisible: true,
      isLocked: false,

    },
    {
      id: 'quadratic-equations',
      label: '二次方程',
      type: NodeType.CONCEPT,
      level: 2,
      parentId: 'algebra',
      position: { x: 350, y: 400 },
      metadata: {
        workCount: 18,
        reuseCount: 10,
        description: '二次方程是关于未知数的二次方程',
        tags: ['方程', '抛物线'],
      },
      isVisible: true,
      isLocked: false,

    },
    {
      id: 'triangles',
      label: '三角形',
      type: NodeType.CONCEPT,
      level: 2,
      parentId: 'geometry',
      position: { x: 450, y: 400 },
      metadata: {
        workCount: 16,
        reuseCount: 9,
        description: '三角形是由三条线段围成的封闭图形',
        tags: ['多边形', '基础图形'],
      },
      isVisible: true,
      isLocked: false,

    },
    {
      id: 'circles',
      label: '圆',
      type: NodeType.CONCEPT,
      level: 2,
      parentId: 'geometry',
      position: { x: 550, y: 400 },
      metadata: {
        workCount: 14,
        reuseCount: 7,
        description: '圆是平面上到定点距离等于定长的点的集合',
        tags: ['曲线', '圆周率'],
      },
      isVisible: true,
      isLocked: false,

    },
  ];

  const edges: GraphEdge[] = [
    {
      id: 'math-algebra',
      source: 'math',
      target: 'algebra',
      type: EdgeType.CONTAINS,
      weight: 1,
      metadata: { description: '数学包含代数' },
      isVisible: true,
      isDirected: true,
    },
    {
      id: 'math-geometry',
      source: 'math',
      target: 'geometry',
      type: EdgeType.CONTAINS,
      weight: 1,
      metadata: { description: '数学包含几何' },
      isVisible: true,
      isDirected: true,
    },
    {
      id: 'algebra-linear',
      source: 'algebra',
      target: 'linear-equations',
      type: EdgeType.CONTAINS,
      weight: 1,
      metadata: { description: '代数包含线性方程' },
      isVisible: true,
      isDirected: true,
    },
    {
      id: 'algebra-quadratic',
      source: 'algebra',
      target: 'quadratic-equations',
      type: EdgeType.CONTAINS,
      weight: 1,
      metadata: { description: '代数包含二次方程' },
      isVisible: true,
      isDirected: true,
    },
    {
      id: 'geometry-triangles',
      source: 'geometry',
      target: 'triangles',
      type: EdgeType.CONTAINS,
      weight: 1,
      metadata: { description: '几何包含三角形' },
      isVisible: true,
      isDirected: true,
    },
    {
      id: 'geometry-circles',
      source: 'geometry',
      target: 'circles',
      type: EdgeType.CONTAINS,
      weight: 1,
      metadata: { description: '几何包含圆' },
      isVisible: true,
      isDirected: true,
    },
    {
      id: 'linear-quadratic',
      source: 'linear-equations',
      target: 'quadratic-equations',
      type: EdgeType.PREREQUISITE,
      weight: 0.8,
      metadata: { description: '线性方程是二次方程的基础' },
      isVisible: true,
      isDirected: true,
    },
    {
      id: 'algebra-geometry-related',
      source: 'algebra',
      target: 'geometry',
      type: EdgeType.RELATED,
      weight: 0.6,
      metadata: { description: '代数与几何相互关联' },
      isVisible: true,
      isDirected: false,
    },
  ];

  return {
    id: 'demo-graph',
    userId: 'demo-user',
    name: '数学知识图谱演示',
    description: '展示知识图谱可视化功能的演示图谱',
    type: GraphType.CUSTOM,
    subject: '数学',
    gradeLevel: '高中',
    nodes,
    edges,
    layout: {
      type: GraphLayout.FORCE,
      options: {
        linkDistance: 100,
        linkStrength: 0.6,
        chargeStrength: -400,

        collisionRadius: 35,
      },
    },
    view: {
      showLabels: true,
      showEdgeLabels: false,
      nodeSize: 'proportional',
      edgeWidth: 'proportional',
      colorScheme: 'default',
      theme: 'light',
      animations: true,
      minimap: false,
      toolbar: true,
    },
    version: 1,
    isPublic: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
};

export function KnowledgeGraphDemo() {
  const [graph, setGraph] = useState<KnowledgeGraph>(createDemoGraph());
  const [selectedLayout, setSelectedLayout] = useState<string>('force');

  const handleGraphChange = (updatedGraph: KnowledgeGraph) => {
    setGraph(updatedGraph);
    console.log('图谱已更新:', updatedGraph);
  };

  const handleSelectionChange = (selection: any) => {
    console.log('选择已变化:', selection);
  };

  const handleError = (error: string) => {
    console.error('图谱错误:', error);
    console.error(`图谱错误: ${error}`);
  };

  const resetGraph = () => {
    setGraph(createDemoGraph());
  };

  const exportGraph = () => {
    const jsonData = JSON.stringify(graph, null, 2);
    const blob = new Blob([jsonData], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'knowledge-graph-demo.json';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="w-full h-screen bg-gray-50 p-4">
      <div className="mb-4 bg-white rounded-lg shadow-sm p-4">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">
          知识图谱可视化演示 - Task 3 实现展示
        </h1>
        <p className="text-gray-600 mb-4">
          这个演示展示了Task 3实现的完整知识图谱可视化功能，包括D3.js渲染引擎、数据管理、布局算法和交互功能。
        </p>

        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <label className="text-sm font-medium text-gray-700">布局算法:</label>
            <select
              value={selectedLayout}
              onChange={(e) => setSelectedLayout(e.target.value)}
              className="px-3 py-1 border border-gray-300 rounded-md text-sm"
            >
              <option value="force">力导向布局</option>
              <option value="hierarchical">层次布局</option>
              <option value="circular">环形布局</option>
              <option value="tree">树形布局</option>
              <option value="grid">网格布局</option>
              <option value="radial">径向布局</option>
            </select>
          </div>

          <button
            onClick={resetGraph}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm"
          >
            重置图谱
          </button>

          <button
            onClick={exportGraph}
            className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 text-sm"
          >
            导出JSON
          </button>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm overflow-hidden">
        <KnowledgeGraphEditor
          graph={graph}
          width={1200}
          height={700}
          readonly={false}
          layoutConfig={{
            type: selectedLayout as any,
            options: {
              linkDistance: 120,
              linkStrength: 0.6,
              chargeStrength: -500,

            },
          }}
          visualConfig={{
            node: {
              defaultRadius: 25,
              minRadius: 15,
              maxRadius: 40,
              strokeWidth: 2,
              opacity: 0.9,
              selectedOpacity: 1.0,
              hoveredOpacity: 1.0,
            },
            edge: {
              defaultStrokeWidth: 2,
              minStrokeWidth: 1,
              maxStrokeWidth: 6,
              opacity: 0.7,
              selectedOpacity: 0.9,
              hoveredOpacity: 0.8,
            },
            colors: {
              nodes: {
                subject: '#1f2937',
                chapter: '#3b82f6',
                topic: '#10b981',
                concept: '#f59e0b',
                skill: '#ef4444',
              },
              edges: {
                contains: '#6b7280',
                prerequisite: '#dc2626',
                related: '#059669',
                extends: '#7c3aed',
                applies: '#ea580c',
              },
              background: '#ffffff',
              selection: '#3b82f6',
              hover: '#f59e0b',
            },
            animation: {
              duration: 300,
              easing: 'ease-in-out',
            },
          }}
          interactionConfig={{
            zoom: {
              enabled: true,
              scaleExtent: [0.2, 3],
            },
            drag: {
              enabled: true,
              constrainToCanvas: false,
              snapToGrid: false,
              gridSize: 20,
            },
            selection: {
              enabled: true,
              multiSelect: true,
              selectOnClick: true,
            },
            tooltip: {
              enabled: true,
              delay: 300,
              offset: { x: 10, y: -10 },
            },
          }}
          onGraphChange={handleGraphChange}
          onSelectionChange={handleSelectionChange}
          onError={handleError}
          className="border-0"
        />
      </div>

      <div className="mt-4 bg-white rounded-lg shadow-sm p-4">
        <h2 className="text-lg font-semibold text-gray-900 mb-2">功能说明</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
          <div>
            <h3 className="font-medium text-gray-800 mb-1">🎨 渲染引擎</h3>
            <p className="text-gray-600">基于D3.js的高性能图谱渲染，支持动画和交互</p>
          </div>
          <div>
            <h3 className="font-medium text-gray-800 mb-1">📊 数据管理</h3>
            <p className="text-gray-600">完整的CRUD操作、版本控制和数据导入导出</p>
          </div>
          <div>
            <h3 className="font-medium text-gray-800 mb-1">🔄 布局算法</h3>
            <p className="text-gray-600">6种布局算法，智能推荐和性能优化</p>
          </div>
          <div>
            <h3 className="font-medium text-gray-800 mb-1">🖱️ 交互功能</h3>
            <p className="text-gray-600">选择、编辑、搜索、筛选和图谱分析</p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default KnowledgeGraphDemo;
