/**
 * D3.js 工具函数
 * 提供图谱可视化的基础工具和辅助函数
 */
import * as d3 from 'd3';

import { GraphNode, GraphEdge } from '@/shared/types/knowledgeGraph';

import {
  D3Node,
  D3Edge,
  GraphVisualizationData,
  VisualConfig,
  DEFAULT_VISUAL_CONFIG,
} from './types';

/**
 * 将图谱数据转换为D3可视化数据
 */
export function transformGraphData(
  nodes: GraphNode[],
  edges: GraphEdge[],
  visualConfig: VisualConfig = DEFAULT_VISUAL_CONFIG,
): GraphVisualizationData {
  // 转换节点数据
  const d3Nodes: D3Node[] = nodes.map(node => ({
    id: node.id,
    label: node.label,
    type: node.type,
    level: node.level,
    x: node.position?.x || 0,
    y: node.position?.y || 0,
    fx: null,
    fy: null,
    // 可视化属性
    radius: calculateNodeRadius(node, visualConfig),
    color: getNodeColor(node.type, visualConfig),
    strokeColor: visualConfig.colors.nodes[node.type] || '#666',
    strokeWidth: visualConfig.node.strokeWidth,
    opacity: visualConfig.node.opacity,
    // 原始数据
    originalData: node,
    // 状态
    selected: false,
    hovered: false,
    dragging: false,
  }));

  // 创建节点ID映射
  const nodeMap = new Map(d3Nodes.map(node => [node.id, node]));

  // 转换边数据
  const d3Links: D3Edge[] = edges
    .filter(edge => nodeMap.has(edge.source) && nodeMap.has(edge.target))
    .map(edge => ({
      id: edge.id,
      source: nodeMap.get(edge.source)!,
      target: nodeMap.get(edge.target)!,
      type: edge.type,
      weight: edge.weight,
      // 可视化属性
      color: getEdgeColor(edge.type, visualConfig),
      strokeWidth: calculateEdgeWidth(edge, visualConfig),
      strokeDasharray: getEdgeStyle(edge.type),
      opacity: visualConfig.edge.opacity,
      // 原始数据
      originalData: edge,
      // 状态
      selected: false,
      hovered: false,
    }));

  // 计算边界
  const bounds = calculateBounds(d3Nodes);

  return {
    nodes: d3Nodes,
    links: d3Links,
    bounds,
  };
}

/**
 * 计算节点半径
 */
function calculateNodeRadius(node: GraphNode, config: VisualConfig): number {
  const { defaultRadius, minRadius, maxRadius } = config.node;

  // 基于节点类型和重要性计算半径
  let radius = defaultRadius;

  // 根据节点类型调整
  switch (node.type) {
    case 'subject':
      radius = defaultRadius * 1.5;
      break;
    case 'chapter':
      radius = defaultRadius * 1.2;
      break;
    case 'topic':
      radius = defaultRadius;
      break;
    case 'concept':
      radius = defaultRadius * 0.8;
      break;
    case 'skill':
      radius = defaultRadius * 0.9;
      break;
  }

  // 根据重要性调整
  if (node.metadata.importance) {
    radius *= (0.7 + node.metadata.importance * 0.6);
  }

  // 根据作品数量调整
  if (node.metadata.workCount > 0) {
    radius *= (1 + Math.log(node.metadata.workCount + 1) * 0.1);
  }

  return Math.max(minRadius, Math.min(maxRadius, radius));
}

/**
 * 获取节点颜色
 */
function getNodeColor(nodeType: string, config: VisualConfig): string {
  return config.colors.nodes[nodeType] || '#666666';
}

/**
 * 计算边宽度
 */
function calculateEdgeWidth(edge: GraphEdge, config: VisualConfig): number {
  const { defaultStrokeWidth, minStrokeWidth, maxStrokeWidth } = config.edge;

  let width = defaultStrokeWidth;

  // 根据权重调整
  width *= edge.weight;

  // 根据关系强度调整
  if (edge.metadata?.strength) {
    width *= edge.metadata.strength;
  }

  return Math.max(minStrokeWidth, Math.min(maxStrokeWidth, width));
}

/**
 * 获取边颜色
 */
function getEdgeColor(edgeType: string, config: VisualConfig): string {
  return config.colors.edges[edgeType] || '#999999';
}

/**
 * 获取边样式
 */
function getEdgeStyle(edgeType: string): string | undefined {
  switch (edgeType) {
    case 'prerequisite':
      return '5,5';
    case 'related':
      return '2,3';
    default:
      return undefined;
  }
}

/**
 * 计算图谱边界
 */
function calculateBounds(nodes: D3Node[]): { minX: number; maxX: number; minY: number; maxY: number } {
  if (nodes.length === 0) {
    return { minX: 0, maxX: 0, minY: 0, maxY: 0 };
  }

  let minX = Infinity, maxX = -Infinity;
  let minY = Infinity, maxY = -Infinity;

  nodes.forEach(node => {
    const x = node.x || 0;
    const y = node.y || 0;
    const r = node.radius;

    minX = Math.min(minX, x - r);
    maxX = Math.max(maxX, x + r);
    minY = Math.min(minY, y - r);
    maxY = Math.max(maxY, y + r);
  });

  return { minX, maxX, minY, maxY };
}

/**
 * 创建缩放行为
 */
export function createZoomBehavior(
  svg: d3.Selection<SVGSVGElement, unknown, null, undefined>,
  container: d3.Selection<SVGGElement, unknown, null, undefined>,
  scaleExtent: [number, number] = [0.1, 3],
) {
  const zoom = d3.zoom<SVGSVGElement, unknown>()
    .scaleExtent(scaleExtent)
    .on('zoom', (event) => {
      container.attr('transform', event.transform);
    });

  svg.call(zoom);

  return zoom;
}

/**
 * 创建拖拽行为
 */
export function createDragBehavior(
  simulation: d3.Simulation<D3Node, D3Edge>,
  onDragStart?: (node: D3Node) => void,
  onDrag?: (node: D3Node) => void,
  onDragEnd?: (node: D3Node) => void,
) {
  return d3.drag<SVGCircleElement, D3Node>()
    .on('start', (event, d) => {
      if (!event.active) simulation.alphaTarget(0.3).restart();
      d.fx = d.x;
      d.fy = d.y;
      d.dragging = true;
      onDragStart && onDragStart(d);
    })
    .on('drag', (event, d) => {
      d.fx = event.x;
      d.fy = event.y;
      onDrag && onDrag(d);
    })
    .on('end', (event, d) => {
      if (!event.active) simulation.alphaTarget(0);
      d.fx = null;
      d.fy = null;
      d.dragging = false;
      onDragEnd && onDragEnd(d);
    });
}

/**
 * 创建工具提示
 */
export function createTooltip() {
  return d3.select('body')
    .append('div')
    .attr('class', 'graph-tooltip')
    .style('position', 'absolute')
    .style('visibility', 'hidden')
    .style('background', 'rgba(0, 0, 0, 0.8)')
    .style('color', 'white')
    .style('padding', '8px 12px')
    .style('border-radius', '4px')
    .style('font-size', '12px')
    .style('pointer-events', 'none')
    .style('z-index', '1000');
}

/**
 * 显示工具提示
 */
export function showTooltip(
  tooltip: d3.Selection<HTMLDivElement, unknown, HTMLElement, any>,
  content: string,
  event: MouseEvent,
  offset: { x: number; y: number } = { x: 10, y: -10 },
) {
  tooltip
    .style('visibility', 'visible')
    .html(content)
    .style('left', (event.pageX + offset.x) + 'px')
    .style('top', (event.pageY + offset.y) + 'px');
}

/**
 * 隐藏工具提示
 */
export function hideTooltip(
  tooltip: d3.Selection<HTMLDivElement, unknown, HTMLElement, any>,
) {
  tooltip.style('visibility', 'hidden');
}

/**
 * 计算两点之间的距离
 */
export function distance(p1: { x: number; y: number }, p2: { x: number; y: number }): number {
  const dx = p1.x - p2.x;
  const dy = p1.y - p2.y;
  return Math.sqrt(dx * dx + dy * dy);
}

/**
 * 限制点在矩形范围内
 */
export function constrainToRect(
  point: { x: number; y: number },
  rect: { x: number; y: number; width: number; height: number },
): { x: number; y: number } {
  return {
    x: Math.max(rect.x, Math.min(rect.x + rect.width, point.x)),
    y: Math.max(rect.y, Math.min(rect.y + rect.height, point.y)),
  };
}

/**
 * 将点对齐到网格
 */
export function snapToGrid(
  point: { x: number; y: number },
  gridSize: number,
): { x: number; y: number } {
  return {
    x: Math.round(point.x / gridSize) * gridSize,
    y: Math.round(point.y / gridSize) * gridSize,
  };
}

/**
 * 插值颜色
 */
export function interpolateColor(color1: string, color2: string, t: number): string {
  const interpolator = d3.interpolate(color1, color2);
  return interpolator(t);
}

/**
 * 生成节点工具提示内容
 */
export function generateNodeTooltip(node: D3Node): string {
  const { originalData } = node;
  return `
    <div>
      <strong>${node.label}</strong><br/>
      类型: ${node.type}<br/>
      层级: ${node.level}<br/>
      作品数: ${originalData.metadata.workCount}<br/>
      ${originalData.metadata.description ? `描述: ${originalData.metadata.description}` : ''}
    </div>
  `;
}

/**
 * 生成边工具提示内容
 */
export function generateEdgeTooltip(edge: D3Edge): string {
  const sourceLabel = typeof edge.source === 'object' ? edge.source.label : edge.source;
  const targetLabel = typeof edge.target === 'object' ? edge.target.label : edge.target;

  return `
    <div>
      <strong>${sourceLabel} → ${targetLabel}</strong><br/>
      关系: ${edge.type}<br/>
      权重: ${edge.weight}<br/>
      ${edge.originalData.metadata?.description ? `描述: ${edge.originalData.metadata.description}` : ''}
    </div>
  `;
}

export default {
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
};
