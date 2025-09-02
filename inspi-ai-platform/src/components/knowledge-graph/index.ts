/**
 * 知识图谱组件导出
 */

// 主要组件
export { default as KnowledgeGraphViewer } from './KnowledgeGraphViewer'

// 类型定义
export type {
  D3Node,
  D3Edge,
  GraphVisualizationData,
  LayoutConfig,
  VisualConfig,
  InteractionConfig,
  GraphEvent,
  GraphEventType,
  GraphEventHandler,
  GraphRenderer,
  LayoutAlgorithm
} from '@/lib/graph-visualization/types'

// 默认配置
export {
  DEFAULT_LAYOUT_CONFIG,
  DEFAULT_VISUAL_CONFIG,
  DEFAULT_INTERACTION_CONFIG
} from '@/lib/graph-visualization/types'

// 工具函数
export {
  transformGraphData,
  createZoomBehavior,
  createDragBehavior,
  calculateNodeRadius,
  calculateEdgeWidth,
  getNodeColor,
  getEdgeColor
} from '@/lib/graph-visualization/d3-utils'

// 渲染器
export { D3GraphRenderer } from '@/lib/graph-visualization/graph-renderer'

// 布局算法
export { layoutManager } from '@/lib/graph-visualization/layout-algorithms'

// Hook
export { default as useKnowledgeGraph } from '@/hooks/useKnowledgeGraph'