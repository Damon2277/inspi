/**
 * 图谱可视化核心模块
 * 统一导出所有图谱相关的组件和工具
 */

// 主要组件
export { default as KnowledgeGraphViewer } from './KnowledgeGraphViewer';

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
  LayoutAlgorithm,
} from './types';

// 默认配置
export {
  DEFAULT_LAYOUT_CONFIG,
  DEFAULT_VISUAL_CONFIG,
  DEFAULT_INTERACTION_CONFIG,
} from './types';

// 工具函数
export {
  transformGraphData,
  createZoomBehavior,
  createDragBehavior,
  createTooltip,
  showTooltip,
  hideTooltip,
  distance,
  constrainToRect,
  snapToGrid,
  interpolateColor,
  generateNodeTooltip,
  generateEdgeTooltip,
} from './d3-utils';

// 渲染器
export { D3GraphRenderer } from './graph-renderer';

// 布局算法
export {
  layoutManager,
  LayoutManager,
  ForceLayoutAlgorithm,
  HierarchicalLayoutAlgorithm,
  CircularLayoutAlgorithm,
  TreeLayoutAlgorithm,
  GridLayoutAlgorithm,
  RadialLayoutAlgorithm,
} from './layout-algorithms';

// 数据管理器
export { GraphDataManager } from './data-manager';

// 交互管理器
export {
  GraphInteractionManager,
  type SelectionState,
  type FilterState,
  type EditingState,
} from './interaction-manager';

// Hook
export { default as useKnowledgeGraph } from '@/shared/hooks/useKnowledgeGraph';
