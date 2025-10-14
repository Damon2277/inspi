/**
 * 图谱可视化类型定义
 * 扩展基础图谱类型，添加可视化相关属性
 */
import * as d3 from 'd3';

import { GraphNode, GraphEdge, KnowledgeGraph } from '@/shared/types/knowledgeGraph';

// D3.js 仿真节点类型
export interface D3Node extends d3.SimulationNodeDatum {
  id: string
  label: string
  type: string
  level: number
  x?: number
  y?: number
  fx?: number | null
  fy?: number | null
  vx?: number
  vy?: number
  // 可视化属性
  radius: number
  color: string
  strokeColor: string
  strokeWidth: number
  opacity: number
  // 原始数据
  originalData: GraphNode
  // 状态
  selected: boolean
  hovered: boolean
  dragging: boolean
}

// D3.js 仿真边类型
export interface D3Edge extends d3.SimulationLinkDatum<D3Node> {
  id: string
  source: D3Node | string
  target: D3Node | string
  type: string
  weight: number
  // 可视化属性
  color: string
  strokeWidth: number
  strokeDasharray?: string
  opacity: number
  // 原始数据
  originalData: GraphEdge
  // 状态
  selected: boolean
  hovered: boolean
}

// 图谱可视化数据
export interface GraphVisualizationData {
  nodes: D3Node[]
  links: D3Edge[]
  bounds: {
    minX: number
    maxX: number
    minY: number
    maxY: number
  }
}

// 布局配置
export interface LayoutConfig {
  type: 'force' | 'hierarchical' | 'circular' | 'tree' | 'grid'
  width: number
  height: number
  options: {
    // 力导向布局参数
    linkDistance?: number
    linkStrength?: number
    chargeStrength?: number
    centerStrength?: number
    collisionRadius?: number
    alpha?: number
    alphaDecay?: number
    velocityDecay?: number
    // 层次布局参数
    levelSpacing?: number
    nodeSpacing?: number
    // 环形布局参数
    radius?: number
    startAngle?: number
    endAngle?: number
    // 网格布局参数
    columns?: number
    rows?: number
    cellWidth?: number
    cellHeight?: number
  }
}

// 视觉样式配置
export interface VisualConfig {
  // 节点样式
  node: {
    defaultRadius: number
    minRadius: number
    maxRadius: number
    strokeWidth: number
    opacity: number
    selectedOpacity: number
    hoveredOpacity: number
  }
  // 边样式
  edge: {
    defaultStrokeWidth: number
    minStrokeWidth: number
    maxStrokeWidth: number
    opacity: number
    selectedOpacity: number
    hoveredOpacity: number
  }
  // 颜色配置
  colors: {
    nodes: Record<string, string>
    edges: Record<string, string>
    background: string
    selection: string
    hover: string
  }
  // 动画配置
  animation: {
    duration: number
    easing: string
  }
}

// 交互配置
export interface InteractionConfig {
  // 缩放配置
  zoom: {
    enabled: boolean
    scaleExtent: [number, number]
    translateExtent?: [[number, number], [number, number]]
  }
  // 拖拽配置
  drag: {
    enabled: boolean
    constrainToCanvas: boolean
    snapToGrid: boolean
    gridSize: number
  }
  // 选择配置
  selection: {
    enabled: boolean
    multiSelect: boolean
    selectOnClick: boolean
  }
  // 工具提示配置
  tooltip: {
    enabled: boolean
    delay: number
    offset: { x: number; y: number }
  }
}

// 图谱渲染器配置
export interface GraphRendererConfig {
  container: HTMLElement
  layout: LayoutConfig
  visual: VisualConfig
  interaction: InteractionConfig
  data: GraphVisualizationData
}

// 事件类型
export type GraphEventType =
  | 'node:click'
  | 'node:dblclick'
  | 'node:mouseenter'
  | 'node:mouseleave'
  | 'node:dragstart'
  | 'node:drag'
  | 'node:dragend'
  | 'edge:click'
  | 'edge:mouseenter'
  | 'edge:mouseleave'
  | 'canvas:click'
  | 'canvas:zoom'
  | 'canvas:pan'
  | 'selection:change'

// 事件数据
export interface GraphEvent {
  type: GraphEventType
  target: D3Node | D3Edge | null
  originalEvent: Event
  position: { x: number; y: number }
  data?: any
}

// 事件处理器
export type GraphEventHandler = (event: GraphEvent) => void

// 图谱渲染器接口
export interface GraphRenderer {
  // 渲染方法
  render(data: GraphVisualizationData): void
  update(data: GraphVisualizationData): void
  clear(): void

  // 布局方法
  setLayout(config: LayoutConfig): void
  applyLayout(): void

  // 样式方法
  setVisualConfig(config: VisualConfig): void
  updateNodeStyles(nodeIds: string[]): void
  updateEdgeStyles(edgeIds: string[]): void

  // 交互方法
  enableInteraction(config: InteractionConfig): void
  disableInteraction(): void

  // 选择方法
  selectNodes(nodeIds: string[]): void
  selectEdges(edgeIds: string[]): void
  clearSelection(): void
  getSelection(): { nodes: string[]; edges: string[] }

  // 视图方法
  zoomToFit(padding?: number): void
  zoomToNodes(nodeIds: string[], padding?: number): void
  centerView(): void

  // 事件方法
  on(event: GraphEventType, handler: GraphEventHandler): void
  off(event: GraphEventType, handler?: GraphEventHandler): void
  emit(event: GraphEvent): void

  // 销毁方法
  destroy(): void
}

// 布局算法接口
export interface LayoutAlgorithm {
  name: string
  apply(nodes: D3Node[], links: D3Edge[], config: LayoutConfig): void
  stop?(): void
}

// 导出默认配置
export const DEFAULT_LAYOUT_CONFIG: LayoutConfig = {
  type: 'force',
  width: 800,
  height: 600,
  options: {
    linkDistance: 80,
    linkStrength: 0.5,
    chargeStrength: -300,
    centerStrength: 0.1,
    collisionRadius: 30,
    alpha: 0.3,
    alphaDecay: 0.02,
    velocityDecay: 0.4,
  },
};

export const DEFAULT_VISUAL_CONFIG: VisualConfig = {
  node: {
    defaultRadius: 20,
    minRadius: 10,
    maxRadius: 50,
    strokeWidth: 2,
    opacity: 0.9,
    selectedOpacity: 1.0,
    hoveredOpacity: 1.0,
  },
  edge: {
    defaultStrokeWidth: 2,
    minStrokeWidth: 1,
    maxStrokeWidth: 8,
    opacity: 0.6,
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
};

export const DEFAULT_INTERACTION_CONFIG: InteractionConfig = {
  zoom: {
    enabled: true,
    scaleExtent: [0.1, 3],
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
    delay: 500,
    offset: { x: 10, y: -10 },
  },
};
