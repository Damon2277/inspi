/**
 * 知识图谱可视化组件测试
 */

import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { KnowledgeGraphViewer } from '@/components/knowledge-graph/KnowledgeGraphViewer'
import { createKnowledgeGraphFixture } from '@/fixtures'

// Mock D3.js
const mockD3 = {
  select: jest.fn(() => mockD3),
  selectAll: jest.fn(() => mockD3),
  append: jest.fn(() => mockD3),
  attr: jest.fn(() => mockD3),
  style: jest.fn(() => mockD3),
  data: jest.fn(() => mockD3),
  enter: jest.fn(() => mockD3),
  exit: jest.fn(() => mockD3),
  remove: jest.fn(() => mockD3),
  on: jest.fn(() => mockD3),
  call: jest.fn(() => mockD3),
  transition: jest.fn(() => mockD3),
  duration: jest.fn(() => mockD3),
  ease: jest.fn(() => mockD3),
  node: jest.fn(() => []),
  nodes: jest.fn(() => mockD3),
  links: jest.fn(() => mockD3),
  force: jest.fn(() => mockD3),
  stop: jest.fn(() => mockD3),
  restart: jest.fn(() => mockD3),
  alpha: jest.fn(() => mockD3),
  alphaTarget: jest.fn(() => mockD3),
  zoom: jest.fn(() => mockD3),
  scaleExtent: jest.fn(() => mockD3),
  extent: jest.fn(() => mockD3),
  transform: jest.fn(),
  event: { transform: { x: 0, y: 0, k: 1 } },
}

jest.mock('d3', () => ({
  select: jest.fn(() => mockD3),
  selectAll: jest.fn(() => mockD3),
  forceSimulation: jest.fn(() => mockD3),
  forceLink: jest.fn(() => mockD3),
  forceManyBody: jest.fn(() => mockD3),
  forceCenter: jest.fn(() => mockD3),
  forceCollide: jest.fn(() => mockD3),
  zoom: jest.fn(() => mockD3),
  zoomIdentity: { x: 0, y: 0, k: 1 },
  drag: jest.fn(() => mockD3),
  scaleOrdinal: jest.fn(() => mockD3),
  schemeCategory10: ['#1f77b4', '#ff7f0e', '#2ca02c'],
}))

// Mock ResizeObserver
global.ResizeObserver = jest.fn().mockImplementation(() => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn(),
}))

describe('KnowledgeGraphViewer组件测试', () => {
  const mockGraph = createKnowledgeGraphFixture({
    id: 'test-graph',
    nodes: [
      { id: 'node1', name: '代数', x: 100, y: 100, type: 'concept' },
      { id: 'node2', name: '几何', x: 200, y: 150, type: 'concept' },
      { id: 'node3', name: '统计', x: 150, y: 200, type: 'concept' },
    ],
    edges: [
      { source: 'node1', target: 'node2', type: 'related' },
      { source: 'node2', target: 'node3', type: 'prerequisite' },
    ],
  })

  const defaultProps = {
    graph: mockGraph,
    width: 800,
    height: 600,
    interactive: true,
    onNodeClick: jest.fn(),
    onNodeHover: jest.fn(),
    onEdgeClick: jest.fn(),
  }

  beforeEach(() => {
    jest.clearAllMocks()
  })  
describe('基础渲染', () => {
    test('应该渲染知识图谱容器', () => {
      render(<KnowledgeGraphViewer {...defaultProps} />)
      
      const container = screen.getByTestId('knowledge-graph-container')
      expect(container).toBeInTheDocument()
      expect(container).toHaveClass('knowledge-graph-viewer')
    })

    test('应该设置正确的尺寸', () => {
      render(<KnowledgeGraphViewer {...defaultProps} />)
      
      const svg = screen.getByTestId('knowledge-graph-svg')
      expect(svg).toHaveAttribute('width', '800')
      expect(svg).toHaveAttribute('height', '600')
    })

    test('应该渲染所有节点', async () => {
      render(<KnowledgeGraphViewer {...defaultProps} />)
      
      await waitFor(() => {
        expect(mockD3.selectAll).toHaveBeenCalledWith('.node')
        expect(mockD3.data).toHaveBeenCalledWith(mockGraph.nodes)
      })
    })

    test('应该渲染所有边', async () => {
      render(<KnowledgeGraphViewer {...defaultProps} />)
      
      await waitFor(() => {
        expect(mockD3.selectAll).toHaveBeenCalledWith('.edge')
        expect(mockD3.data).toHaveBeenCalledWith(mockGraph.edges)
      })
    })

    test('应该处理空图谱', () => {
      const emptyGraph = createKnowledgeGraphFixture({
        nodes: [],
        edges: [],
      })

      render(<KnowledgeGraphViewer {...defaultProps} graph={emptyGraph} />)
      
      const container = screen.getByTestId('knowledge-graph-container')
      expect(container).toBeInTheDocument()
      
      const emptyMessage = screen.getByText('暂无知识图谱数据')
      expect(emptyMessage).toBeInTheDocument()
    })
  })

  describe('交互功能', () => {
    test('应该处理节点点击事件', async () => {
      const onNodeClick = jest.fn()
      render(<KnowledgeGraphViewer {...defaultProps} onNodeClick={onNodeClick} />)
      
      // 模拟D3节点点击
      const mockNodeData = mockGraph.nodes[0]
      mockD3.on.mockImplementation((event, handler) => {
        if (event === 'click') {
          handler(mockNodeData)
        }
        return mockD3
      })

      await waitFor(() => {
        expect(mockD3.on).toHaveBeenCalledWith('click', expect.any(Function))
      })

      expect(onNodeClick).toHaveBeenCalledWith(mockNodeData)
    })

    test('应该处理节点悬停事件', async () => {
      const onNodeHover = jest.fn()
      render(<KnowledgeGraphViewer {...defaultProps} onNodeHover={onNodeHover} />)
      
      const mockNodeData = mockGraph.nodes[0]
      mockD3.on.mockImplementation((event, handler) => {
        if (event === 'mouseenter') {
          handler(mockNodeData)
        }
        return mockD3
      })

      await waitFor(() => {
        expect(mockD3.on).toHaveBeenCalledWith('mouseenter', expect.any(Function))
      })

      expect(onNodeHover).toHaveBeenCalledWith(mockNodeData)
    })

    test('应该支持节点拖拽', async () => {
      render(<KnowledgeGraphViewer {...defaultProps} />)
      
      await waitFor(() => {
        expect(mockD3.call).toHaveBeenCalled()
      })
      
      // 验证拖拽事件处理器设置
      const dragCalls = mockD3.call.mock.calls.filter(call => 
        call[0] && typeof call[0] === 'function'
      )
      expect(dragCalls.length).toBeGreaterThan(0)
    })

    test('应该支持缩放和平移', async () => {
      render(<KnowledgeGraphViewer {...defaultProps} />)
      
      await waitFor(() => {
        expect(mockD3.call).toHaveBeenCalled()
      })
      
      // 验证缩放功能设置
      expect(mockD3.scaleExtent).toHaveBeenCalledWith([0.1, 10])
    })

    test('应该在非交互模式下禁用交互', () => {
      render(<KnowledgeGraphViewer {...defaultProps} interactive={false} />)
      
      const container = screen.getByTestId('knowledge-graph-container')
      expect(container).toHaveClass('non-interactive')
    })
  })