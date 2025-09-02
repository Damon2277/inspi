/**
 * 知识图谱可视化演示页面
 */
'use client'

import React, { useState } from 'react'
import { KnowledgeGraphViewer } from '@/components/knowledge-graph/KnowledgeGraphViewer'
import { KnowledgeGraph } from '@/types/knowledgeGraph'

// 演示数据
const demoGraph: KnowledgeGraph = {
  id: 'demo-graph',
  name: '数学知识图谱演示',
  description: '展示数学学科的知识结构',
  subjectId: 'math',
  userId: 'demo-user',
  isPublic: true,
  nodes: [
    {
      id: 'math',
      label: '数学',
      type: 'subject',
      level: 0,
      description: '数学学科',
      isVisible: true,
      position: { x: 0, y: 0 },
      metadata: { workCount: 15 }
    },
    {
      id: 'algebra',
      label: '代数',
      type: 'chapter',
      level: 1,
      description: '代数章节',
      isVisible: true,
      position: { x: -200, y: 100 },
      metadata: { workCount: 8 }
    },
    {
      id: 'geometry',
      label: '几何',
      type: 'chapter',
      level: 1,
      description: '几何章节',
      isVisible: true,
      position: { x: 200, y: 100 },
      metadata: { workCount: 7 }
    },
    {
      id: 'linear-equations',
      label: '线性方程',
      type: 'topic',
      level: 2,
      description: '线性方程主题',
      isVisible: true,
      position: { x: -300, y: 200 },
      metadata: { workCount: 5 }
    },
    {
      id: 'quadratic-equations',
      label: '二次方程',
      type: 'topic',
      level: 2,
      description: '二次方程主题',
      isVisible: true,
      position: { x: -100, y: 200 },
      metadata: { workCount: 4 }
    },
    {
      id: 'triangles',
      label: '三角形',
      type: 'topic',
      level: 2,
      description: '三角形主题',
      isVisible: true,
      position: { x: 100, y: 200 },
      metadata: { workCount: 6 }
    },
    {
      id: 'circles',
      label: '圆',
      type: 'topic',
      level: 2,
      description: '圆主题',
      isVisible: true,
      position: { x: 300, y: 200 },
      metadata: { workCount: 3 }
    }
  ],
  edges: [
    {
      id: 'math-algebra',
      source: 'math',
      target: 'algebra',
      type: 'contains',
      weight: 1,
      isDirected: true,
      isVisible: true,
      metadata: { strength: 0.9 }
    },
    {
      id: 'math-geometry',
      source: 'math',
      target: 'geometry',
      type: 'contains',
      weight: 1,
      isDirected: true,
      isVisible: true,
      metadata: { strength: 0.9 }
    },
    {
      id: 'algebra-linear',
      source: 'algebra',
      target: 'linear-equations',
      type: 'contains',
      weight: 1,
      isDirected: true,
      isVisible: true,
      metadata: { strength: 0.8 }
    },
    {
      id: 'algebra-quadratic',
      source: 'algebra',
      target: 'quadratic-equations',
      type: 'contains',
      weight: 1,
      isDirected: true,
      isVisible: true,
      metadata: { strength: 0.8 }
    },
    {
      id: 'geometry-triangles',
      source: 'geometry',
      target: 'triangles',
      type: 'contains',
      weight: 1,
      isDirected: true,
      isVisible: true,
      metadata: { strength: 0.8 }
    },
    {
      id: 'geometry-circles',
      source: 'geometry',
      target: 'circles',
      type: 'contains',
      weight: 1,
      isDirected: true,
      isVisible: true,
      metadata: { strength: 0.8 }
    },
    {
      id: 'linear-quadratic',
      source: 'linear-equations',
      target: 'quadratic-equations',
      type: 'prerequisite',
      weight: 0.7,
      isDirected: true,
      isVisible: true,
      metadata: { strength: 0.6 }
    }
  ],
  createdAt: new Date(),
  updatedAt: new Date()
}

export default function GraphDemoPage() {
  const [selectedNode, setSelectedNode] = useState<string | null>(null)
  const [hoveredNode, setHoveredNode] = useState<string | null>(null)

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            知识图谱可视化演示
          </h1>
          <p className="text-gray-600">
            这是一个交互式的知识图谱可视化演示，展示了数学学科的知识结构。
          </p>
        </div>

        <div className="bg-white rounded-lg shadow-lg p-6">
          <div className="mb-4">
            <h2 className="text-xl font-semibold text-gray-800 mb-2">
              {demoGraph.name}
            </h2>
            <p className="text-gray-600 text-sm">
              {demoGraph.description}
            </p>
          </div>

          <div className="border rounded-lg overflow-hidden">
            <KnowledgeGraphViewer
              graph={demoGraph}
              width={1000}
              height={600}
              onNodeClick={(nodeId) => {
                console.log('节点点击:', nodeId)
                setSelectedNode(nodeId)
              }}
              onNodeDoubleClick={(nodeId) => {
                console.log('节点双击:', nodeId)
              }}
              onNodeHover={(nodeId) => {
                setHoveredNode(nodeId)
              }}
              onEdgeClick={(edgeId) => {
                console.log('边点击:', edgeId)
              }}
              onCanvasClick={() => {
                setSelectedNode(null)
              }}
              className="w-full"
            />
          </div>

          {/* 信息面板 */}
          <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* 选中节点信息 */}
            <div className="bg-gray-50 rounded-lg p-4">
              <h3 className="font-semibold text-gray-800 mb-2">选中节点</h3>
              {selectedNode ? (
                <div>
                  <p className="text-sm text-gray-600">
                    节点ID: <span className="font-mono">{selectedNode}</span>
                  </p>
                  {(() => {
                    const node = demoGraph.nodes.find(n => n.id === selectedNode)
                    return node ? (
                      <div className="mt-2">
                        <p className="text-sm"><strong>标签:</strong> {node.label}</p>
                        <p className="text-sm"><strong>类型:</strong> {node.type}</p>
                        <p className="text-sm"><strong>层级:</strong> {node.level}</p>
                        <p className="text-sm"><strong>描述:</strong> {node.description}</p>
                        <p className="text-sm"><strong>作品数量:</strong> {node.metadata?.workCount || 0}</p>
                      </div>
                    ) : null
                  })()}
                </div>
              ) : (
                <p className="text-sm text-gray-500">点击节点查看详细信息</p>
              )}
            </div>

            {/* 悬停节点信息 */}
            <div className="bg-gray-50 rounded-lg p-4">
              <h3 className="font-semibold text-gray-800 mb-2">悬停节点</h3>
              {hoveredNode ? (
                <div>
                  <p className="text-sm text-gray-600">
                    节点ID: <span className="font-mono">{hoveredNode}</span>
                  </p>
                  {(() => {
                    const node = demoGraph.nodes.find(n => n.id === hoveredNode)
                    return node ? (
                      <div className="mt-2">
                        <p className="text-sm"><strong>标签:</strong> {node.label}</p>
                        <p className="text-sm"><strong>类型:</strong> {node.type}</p>
                      </div>
                    ) : null
                  })()}
                </div>
              ) : (
                <p className="text-sm text-gray-500">悬停在节点上查看信息</p>
              )}
            </div>
          </div>

          {/* 图谱统计 */}
          <div className="mt-6 bg-blue-50 rounded-lg p-4">
            <h3 className="font-semibold text-blue-800 mb-2">图谱统计</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <p className="text-blue-600 font-medium">节点总数</p>
                <p className="text-2xl font-bold text-blue-800">{demoGraph.nodes.length}</p>
              </div>
              <div>
                <p className="text-blue-600 font-medium">边总数</p>
                <p className="text-2xl font-bold text-blue-800">{demoGraph.edges.length}</p>
              </div>
              <div>
                <p className="text-blue-600 font-medium">最大层级</p>
                <p className="text-2xl font-bold text-blue-800">
                  {Math.max(...demoGraph.nodes.map(n => n.level))}
                </p>
              </div>
              <div>
                <p className="text-blue-600 font-medium">总作品数</p>
                <p className="text-2xl font-bold text-blue-800">
                  {demoGraph.nodes.reduce((sum, n) => sum + (n.metadata?.workCount || 0), 0)}
                </p>
              </div>
            </div>
          </div>

          {/* 操作说明 */}
          <div className="mt-6 bg-yellow-50 rounded-lg p-4">
            <h3 className="font-semibold text-yellow-800 mb-2">操作说明</h3>
            <ul className="text-sm text-yellow-700 space-y-1">
              <li>• 点击节点：选中节点并查看详细信息</li>
              <li>• 双击节点：触发节点特殊操作</li>
              <li>• 悬停节点：查看节点基本信息</li>
              <li>• 拖拽节点：移动节点位置</li>
              <li>• 滚轮缩放：放大或缩小图谱</li>
              <li>• 拖拽画布：平移视图</li>
              <li>• 点击"适应"按钮：自动调整视图以显示所有内容</li>
              <li>• 点击"居中"按钮：将视图居中</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}