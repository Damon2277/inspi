import * as d3 from 'd3';

// D3.js v6+ 类型兼容性修复
type D3Selection = d3.Selection<any, any, any, any>;
type D3Simulation = d3.Simulation<any, any>;
type D3Force = d3.Force<any, any>;
type D3Zoom = d3.ZoomBehavior<any, any>;
type D3Drag = d3.DragBehavior<any, any, any>;


import { SimulationNodeDatum, SimulationLinkDatum } from 'd3-force';

interface GraphNode extends SimulationNodeDatum {
  id: string;
  label: string;
  radius?: number;
  color?: string;
}

interface GraphLink extends SimulationLinkDatum<GraphNode> {
  source: string | GraphNode;
  target: string | GraphNode;
}

/**
 * D3.js 图谱渲染器
 * 核心渲染引擎，负责图谱的可视化渲染和交互
 */

import {
  createZoomBehavior,
  createDragBehavior,
  createTooltip,
  showTooltip,
  hideTooltip,
  generateNodeTooltip,
  generateEdgeTooltip,
} from './d3-utils';
import {
  GraphRenderer,
  GraphRendererConfig,
  GraphVisualizationData,
  LayoutConfig,
  VisualConfig,
  InteractionConfig,
  D3Node,
  D3Edge,
  GraphEvent,
  GraphEventType,
  GraphEventHandler,
  DEFAULT_LAYOUT_CONFIG,
  DEFAULT_VISUAL_CONFIG,
  DEFAULT_INTERACTION_CONFIG,
} from './types';

export class D3GraphRenderer implements GraphRenderer {
  private container: HTMLElement;
  private svg: d3.Selection<SVGSVGElement, unknown, null, undefined>;
  private g: d3.Selection<SVGGElement, unknown, null, undefined>;
  private simulation: d3.Simulation<D3Node, D3Edge>;
  private tooltip: d3.Selection<HTMLDivElement, unknown, HTMLElement, any>;
  private zoom: d3.ZoomBehavior<SVGSVGElement, unknown>;

  private layoutConfig: LayoutConfig;
  private visualConfig: VisualConfig;
  private interactionConfig: InteractionConfig;
  private data: GraphVisualizationData;

  private eventHandlers: Map<GraphEventType, GraphEventHandler[]> = new Map();
  private selection: { nodes: string[]; edges: string[] } = { nodes: [], edges: [] };

  // DOM元素选择器
  private nodeSelection!: d3.Selection<SVGCircleElement, D3Node, SVGGElement, unknown>;
  private linkSelection!: d3.Selection<SVGLineElement, D3Edge, SVGGElement, unknown>;
  private labelSelection!: d3.Selection<SVGTextElement, D3Node, SVGGElement, unknown>;

  constructor(config: GraphRendererConfig) {
    this.container = config.container;
    this.layoutConfig = { ...DEFAULT_LAYOUT_CONFIG, ...config.layout };
    this.visualConfig = { ...DEFAULT_VISUAL_CONFIG, ...config.visual };
    this.interactionConfig = { ...DEFAULT_INTERACTION_CONFIG, ...config.interaction };
    this.data = config.data;

    this.initializeSVG();
    this.initializeSimulation();
    this.initializeTooltip();
    this.render(this.data);
  }

  /**
   * 初始化SVG容器
   */
  private initializeSVG(): void {
    // 清理现有内容
    d3.select<any, any>(this.container).selectAll('*').remove();

    // 创建SVG
    this.svg = d3.select<any, any>(this.container)
      .append('svg')
      .attr('width', this.layoutConfig.width)
      .attr('height', this.layoutConfig.height)
      .style('background-color', this.visualConfig.colors.background);

    // 创建主容器组
    this.g = this.svg.append('g')
      .attr('class', 'graph-container');

    // 创建图层
    this.g.append('g').attr('class', 'links');
    this.g.append('g').attr('class', 'nodes');
    this.g.append('g').attr('class', 'labels');

    // 初始化缩放行为
    if (this.interactionConfig.zoom.enabled) {
      this.zoom = createZoomBehavior(
        this.svg,
        this.g,
        this.interactionConfig.zoom.scaleExtent,
      );
    }

    // 绑定画布点击事件
    this.svg.on('click', (event: any) => {
      if (event.target === event.currentTarget) {
        this.clearSelection();
        this.emit({
          type: 'canvas:click',
          target: null,
          originalEvent: event,
          position: { x: d3.pointer(event)[0], y: d3.pointer(event)[1] },
        });
      }
    });
  }

  /**
   * 初始化力导向仿真
   */
  private initializeSimulation(): void {
    this.simulation = d3.forceSimulation<D3Node>()
      .force('link', d3.forceLink<D3Node, D3Edge>()
        .id(d => d.id)
        .distance(this.layoutConfig.options.linkDistance || 80)
        .strength(this.layoutConfig.options.linkStrength || 0.5),
      )
      .force('charge', d3.forceManyBody()
        .strength(this.layoutConfig.options.chargeStrength || -300),
      )
      .force('center', d3.forceCenter(
        this.layoutConfig.width / 2,
        this.layoutConfig.height / 2,
      ).strength(this.layoutConfig.options.centerStrength || 0.1))
      .force('collision', d3.forceCollide<D3Node>()
        .radius(d => d.radius + (this.layoutConfig.options.collisionRadius || 5)),
      )
      .alpha(this.layoutConfig.options.alpha || 0.3)
      .alphaDecay(this.layoutConfig.options.alphaDecay || 0.02)
      .velocityDecay(this.layoutConfig.options.velocityDecay || 0.4);

    // 绑定tick事件
    this.simulation.on('tick', () => this.tick());
  }

  /**
   * 初始化工具提示
   */
  private initializeTooltip(): void {
    if (this.interactionConfig.tooltip.enabled) {
      this.tooltip = createTooltip();
    }
  }

  /**
   * 渲染图谱
   */
  render(data: GraphVisualizationData): void {
    this.data = data;
    this.updateLinks();
    this.updateNodes();
    this.updateLabels();
    this.updateSimulation();
  }

  /**
   * 更新图谱数据
   */
  update(data: GraphVisualizationData): void {
    this.render(data);
  }

  /**
   * 清空图谱
   */
  clear(): void {
    this.g.selectAll('.links line').remove();
    this.g.selectAll('.nodes circle').remove();
    this.g.selectAll('.labels text').remove();
    this.simulation.nodes([]);
    this.simulation.force('link', d3.forceLink([]));
  }

  /**
   * 更新连线
   */
  private updateLinks(): void {
    const linkSelection = this.g
      .select<SVGGElement>('g.links')
      .selectAll<SVGLineElement, D3Edge>('line')
      .data(this.data.links, (d: D3Edge) => d.id);

    // 移除旧连线
    linkSelection.exit().remove();

    // 添加新连线
    const linkEnter = linkSelection.enter()
      .append('line')
      .attr('class', 'link')
      .style('cursor', 'pointer');

    // 合并选择
    this.linkSelection = linkEnter.merge(linkSelection) as d3.Selection<SVGLineElement, D3Edge, SVGGElement, unknown>;

    // 设置连线样式
    this.linkSelection
      .attr('stroke', d => d.color)
      .attr('stroke-width', d => d.strokeWidth)
      .attr('stroke-opacity', d => d.opacity)
      .attr('stroke-dasharray', d => d.strokeDasharray || null);

    // 绑定连线事件
    this.bindLinkEvents();
  }

  /**
   * 更新节点
   */
  private updateNodes(): void {
    const nodeSelection = this.g
      .select<SVGGElement>('g.nodes')
      .selectAll<SVGCircleElement, D3Node>('circle')
      .data(this.data.nodes, (d: D3Node) => d.id);

    // 移除旧节点
    nodeSelection.exit().remove();

    // 添加新节点
    const nodeEnter = nodeSelection.enter()
      .append('circle')
      .attr('class', 'node')
      .style('cursor', 'pointer');

    // 合并选择
    this.nodeSelection = nodeEnter.merge(nodeSelection) as d3.Selection<SVGCircleElement, D3Node, SVGGElement, unknown>;

    // 设置节点样式
    this.nodeSelection
      .attr('r', d => d.radius)
      .attr('fill', d => d.color)
      .attr('stroke', d => d.strokeColor)
      .attr('stroke-width', d => d.strokeWidth)
      .attr('fill-opacity', d => d.opacity);

    // 绑定拖拽行为
    if (this.interactionConfig.drag.enabled) {
      const drag = createDragBehavior(
        this.simulation,
        (node) => this.onNodeDragStart(node),
        (node) => this.onNodeDrag(node),
        (node) => this.onNodeDragEnd(node),
      );
      this.nodeSelection.call(drag);
    }

    // 绑定节点事件
    this.bindNodeEvents();
  }

  /**
   * 更新标签
   */
  private updateLabels(): void {
    const labelSelection = this.g
      .select<SVGGElement>('g.labels')
      .selectAll<SVGTextElement, D3Node>('text')
      .data(this.data.nodes, (d: D3Node) => d.id);

    // 移除旧标签
    labelSelection.exit().remove();

    // 添加新标签
    const labelEnter = labelSelection.enter()
      .append('text')
      .attr('class', 'label')
      .style('pointer-events', 'none')
      .style('user-select', 'none');

    // 合并选择
    this.labelSelection = labelEnter.merge(labelSelection) as d3.Selection<SVGTextElement, D3Node, SVGGElement, unknown>;

    // 设置标签样式和内容
    this.labelSelection
      .text(d => d.label)
      .attr('text-anchor', 'middle')
      .attr('dominant-baseline', 'central')
      .style('font-size', '12px')
      .style('font-family', 'Arial, sans-serif')
      .style('fill', '#333')
      .style('font-weight', 'bold');
  }

  /**
   * 更新仿真
   */
  private updateSimulation(): void {
    this.simulation.nodes(this.data.nodes);

    const linkForce = this.simulation.force('link') as d3.ForceLink<D3Node, D3Edge>;
    if (linkForce) {
      linkForce.links(this.data.links);
    }

    this.simulation.alpha(0.3).restart();
  }

  /**
   * 仿真tick事件处理
   */
  private tick(): void {
    // 更新连线位置
    this.linkSelection
      .attr('x1', d => (d.source as D3Node).x!)
      .attr('y1', d => (d.source as D3Node).y!)
      .attr('x2', d => (d.target as D3Node).x!)
      .attr('y2', d => (d.target as D3Node).y!);

    // 更新节点位置
    this.nodeSelection
      .attr('cx', d => d.x!)
      .attr('cy', d => d.y!);

    // 更新标签位置
    this.labelSelection
      .attr('x', d => d.x!)
      .attr('y', d => d.y!);
  }

  /**
   * 绑定节点事件
   */
  private bindNodeEvents(): void {
    this.nodeSelection
      .on('click', (event: any, d) => {
        event.stopPropagation();
        this.handleNodeClick(event, d);
      })
      .on('dblclick', (event: any, d) => {
        event.stopPropagation();
        this.emit({
          type: 'node:dblclick',
          target: d,
          originalEvent: event,
          position: { x: d3.pointer(event)[0], y: d3.pointer(event)[1] },
        });
      })
      .on('mouseenter', (event: any, d) => {
        this.handleNodeMouseEnter(event, d);
      })
      .on('mouseleave', (event: any, d) => {
        this.handleNodeMouseLeave(event, d);
      });
  }

  /**
   * 绑定连线事件
   */
  private bindLinkEvents(): void {
    this.linkSelection
      .on('click', (event: any, d) => {
        event.stopPropagation();
        this.handleEdgeClick(event, d);
      })
      .on('mouseenter', (event: any, d) => {
        this.handleEdgeMouseEnter(event, d);
      })
      .on('mouseleave', (event: any, d) => {
        this.handleEdgeMouseLeave(event, d);
      });
  }

  /**
   * 处理节点点击
   */
  private handleNodeClick(event: MouseEvent, node: D3Node): void {
    if (this.interactionConfig.selection.enabled) {
      if (this.interactionConfig.selection.multiSelect && event.ctrlKey) {
        // 多选模式
        this.toggleNodeSelection(node.id);
      } else {
        // 单选模式
        this.selectNodes([node.id]);
      }
    }

    this.emit({
      type: 'node:click',
      target: node,
      originalEvent: event,
      position: { x: d3.pointer(event)[0], y: d3.pointer(event)[1] },
    });
  }

  /**
   * 处理节点鼠标进入
   */
  private handleNodeMouseEnter(event: MouseEvent, node: D3Node): void {
    node.hovered = true;
    this.updateNodeStyle(node);

    if (this.tooltip && this.interactionConfig.tooltip.enabled) {
      const content = generateNodeTooltip(node);
      showTooltip(this.tooltip, content, event, this.interactionConfig.tooltip.offset);
    }

    this.emit({
      type: 'node:mouseenter',
      target: node,
      originalEvent: event,
      position: { x: d3.pointer(event)[0], y: d3.pointer(event)[1] },
    });
  }

  /**
   * 处理节点鼠标离开
   */
  private handleNodeMouseLeave(event: MouseEvent, node: D3Node): void {
    node.hovered = false;
    this.updateNodeStyle(node);

    if (this.tooltip) {
      hideTooltip(this.tooltip);
    }

    this.emit({
      type: 'node:mouseleave',
      target: node,
      originalEvent: event,
      position: { x: d3.pointer(event)[0], y: d3.pointer(event)[1] },
    });
  }

  /**
   * 处理边点击
   */
  private handleEdgeClick(event: MouseEvent, edge: D3Edge): void {
    if (this.interactionConfig.selection.enabled) {
      if (this.interactionConfig.selection.multiSelect && event.ctrlKey) {
        this.toggleEdgeSelection(edge.id);
      } else {
        this.selectEdges([edge.id]);
      }
    }

    this.emit({
      type: 'edge:click',
      target: edge,
      originalEvent: event,
      position: { x: d3.pointer(event)[0], y: d3.pointer(event)[1] },
    });
  }

  /**
   * 处理边鼠标进入
   */
  private handleEdgeMouseEnter(event: MouseEvent, edge: D3Edge): void {
    edge.hovered = true;
    this.updateEdgeStyle(edge);

    if (this.tooltip && this.interactionConfig.tooltip.enabled) {
      const content = generateEdgeTooltip(edge);
      showTooltip(this.tooltip, content, event, this.interactionConfig.tooltip.offset);
    }

    this.emit({
      type: 'edge:mouseenter',
      target: edge,
      originalEvent: event,
      position: { x: d3.pointer(event)[0], y: d3.pointer(event)[1] },
    });
  }

  /**
   * 处理边鼠标离开
   */
  private handleEdgeMouseLeave(event: MouseEvent, edge: D3Edge): void {
    edge.hovered = false;
    this.updateEdgeStyle(edge);

    if (this.tooltip) {
      hideTooltip(this.tooltip);
    }

    this.emit({
      type: 'edge:mouseleave',
      target: edge,
      originalEvent: event,
      position: { x: d3.pointer(event)[0], y: d3.pointer(event)[1] },
    });
  }

  /**
   * 节点拖拽开始
   */
  private onNodeDragStart(node: D3Node): void {
    this.emit({
      type: 'node:dragstart',
      target: node,
      originalEvent: event,
      position: { x: node.x!, y: node.y! },
    });
  }

  /**
   * 节点拖拽中
   */
  private onNodeDrag(node: D3Node): void {
    this.emit({
      type: 'node:drag',
      target: node,
      originalEvent: event,
      position: { x: node.x!, y: node.y! },
    });
  }

  /**
   * 节点拖拽结束
   */
  private onNodeDragEnd(node: D3Node): void {
    this.emit({
      type: 'node:dragend',
      target: node,
      originalEvent: event,
      position: { x: node.x!, y: node.y! },
    });
  }

  /**
   * 更新节点样式
   */
  private updateNodeStyle(node: D3Node): void {
    const nodeElement = this.nodeSelection.filter(d => d.id === node.id);

    let opacity = this.visualConfig.node.opacity;
    if (node.selected) {
      opacity = this.visualConfig.node.selectedOpacity;
    } else if (node.hovered) {
      opacity = this.visualConfig.node.hoveredOpacity;
    }

    nodeElement
      .transition()
      .duration(this.visualConfig.animation.duration)
      .attr('fill-opacity', opacity)
      .attr('stroke', node.selected ? this.visualConfig.colors.selection : node.strokeColor)
      .attr('stroke-width', node.selected ? node.strokeWidth * 2 : node.strokeWidth);
  }

  /**
   * 更新边样式
   */
  private updateEdgeStyle(edge: D3Edge): void {
    const edgeElement = this.linkSelection.filter(d => d.id === edge.id);

    let opacity = this.visualConfig.edge.opacity;
    if (edge.selected) {
      opacity = this.visualConfig.edge.selectedOpacity;
    } else if (edge.hovered) {
      opacity = this.visualConfig.edge.hoveredOpacity;
    }

    edgeElement
      .transition()
      .duration(this.visualConfig.animation.duration)
      .attr('stroke-opacity', opacity)
      .attr('stroke', edge.selected ? this.visualConfig.colors.selection : edge.color)
      .attr('stroke-width', edge.selected ? edge.strokeWidth * 1.5 : edge.strokeWidth);
  }

  /**
   * 切换节点选择状态
   */
  private toggleNodeSelection(nodeId: string): void {
    const index = this.selection.nodes.indexOf(nodeId);
    if (index > -1) {
      this.selection.nodes.splice(index, 1);
    } else {
      this.selection.nodes.push(nodeId);
    }
    this.updateSelectionStyles();
    this.emitSelectionChange();
  }

  /**
   * 切换边选择状态
   */
  private toggleEdgeSelection(edgeId: string): void {
    const index = this.selection.edges.indexOf(edgeId);
    if (index > -1) {
      this.selection.edges.splice(index, 1);
    } else {
      this.selection.edges.push(edgeId);
    }
    this.updateSelectionStyles();
    this.emitSelectionChange();
  }

  /**
   * 更新选择样式
   */
  private updateSelectionStyles(): void {
    // 更新节点选择状态
    this.data.nodes.forEach(node => {
      node.selected = this.selection.nodes.includes(node.id);
      this.updateNodeStyle(node);
    });

    // 更新边选择状态
    this.data.links.forEach(edge => {
      edge.selected = this.selection.edges.includes(edge.id);
      this.updateEdgeStyle(edge);
    });
  }

  /**
   * 发出选择变化事件
   */
  private emitSelectionChange(): void {
    this.emit({
      type: 'selection:change',
      target: null,
      originalEvent: new Event('selection:change'),
      position: { x: 0, y: 0 },
      data: { ...this.selection },
    });
  }

  // 公共接口实现

  setLayout(config: LayoutConfig): void {
    this.layoutConfig = { ...this.layoutConfig, ...config };
    this.applyLayout();
  }

  applyLayout(): void {
    // 重新配置仿真力
    const linkForce = this.simulation.force('link') as d3.ForceLink<D3Node, D3Edge>;
    if (linkForce) {
      linkForce
        .distance(this.layoutConfig.options.linkDistance || 80)
        .strength(this.layoutConfig.options.linkStrength || 0.5);
    }

    const chargeForce = this.simulation.force('charge') as d3.ForceManyBody<D3Node>;
    if (chargeForce) {
      chargeForce.strength(this.layoutConfig.options.chargeStrength || -300);
    }

    const centerForce = this.simulation.force('center') as d3.ForceCenter<D3Node>;
    if (centerForce) {
      centerForce.strength(this.layoutConfig.options.centerStrength || 0.1);
    }

    this.simulation
      .alpha(this.layoutConfig.options.alpha || 0.3)
      .alphaDecay(this.layoutConfig.options.alphaDecay || 0.02)
      .velocityDecay(this.layoutConfig.options.velocityDecay || 0.4)
      .restart();
  }

  setVisualConfig(config: VisualConfig): void {
    this.visualConfig = { ...this.visualConfig, ...config };
    this.updateNodeStyles([]);
    this.updateEdgeStyles([]);
  }

  updateNodeStyles(nodeIds: string[]): void {
    const targetNodes = nodeIds.length > 0
      ? this.data.nodes.filter(node => nodeIds.includes(node.id))
      : this.data.nodes;

    targetNodes.forEach(node => this.updateNodeStyle(node));
  }

  updateEdgeStyles(edgeIds: string[]): void {
    const targetEdges = edgeIds.length > 0
      ? this.data.links.filter(edge => edgeIds.includes(edge.id))
      : this.data.links;

    targetEdges.forEach(edge => this.updateEdgeStyle(edge));
  }

  enableInteraction(config: InteractionConfig): void {
    this.interactionConfig = { ...this.interactionConfig, ...config };
    // 重新初始化交互
    this.initializeSVG();
    this.render(this.data);
  }

  disableInteraction(): void {
    this.interactionConfig = {
      zoom: { enabled: false, scaleExtent: [1, 1] },
      drag: { enabled: false, constrainToCanvas: false, snapToGrid: false, gridSize: 20 },
      selection: { enabled: false, multiSelect: false, selectOnClick: false },
      tooltip: { enabled: false, delay: 0, offset: { x: 0, y: 0 } },
    };
  }

  selectNodes(nodeIds: string[]): void {
    this.selection.nodes = [...nodeIds];
    this.updateSelectionStyles();
    this.emitSelectionChange();
  }

  selectEdges(edgeIds: string[]): void {
    this.selection.edges = [...edgeIds];
    this.updateSelectionStyles();
    this.emitSelectionChange();
  }

  clearSelection(): void {
    this.selection = { nodes: [], edges: [] };
    this.updateSelectionStyles();
    this.emitSelectionChange();
  }

  getSelection(): { nodes: string[]; edges: string[] } {
    return { ...this.selection };
  }

  zoomToFit(padding: number = 50): void {
    if (!this.zoom) return;

    const bounds = this.data.bounds;
    const width = this.layoutConfig.width;
    const height = this.layoutConfig.height;

    const dx = bounds.maxX - bounds.minX;
    const dy = bounds.maxY - bounds.minY;
    const x = (bounds.minX + bounds.maxX) / 2;
    const y = (bounds.minY + bounds.maxY) / 2;

    const scale = Math.min(
      (width - padding * 2) / dx,
      (height - padding * 2) / dy,
    );

    const transform = d3.zoomIdentity
      .translate(width / 2, height / 2)
      .scale(scale)
      .translate(-x, -y);

    this.svg.transition()
      .duration(750)
      .call(this.zoom.transform, transform);
  }

  zoomToNodes(nodeIds: string[], padding: number = 50): void {
    if (!this.zoom || nodeIds.length === 0) return;

    const targetNodes = this.data.nodes.filter(node => nodeIds.includes(node.id));
    if (targetNodes.length === 0) return;

    let minX = Infinity, maxX = -Infinity;
    let minY = Infinity, maxY = -Infinity;

    targetNodes.forEach(node => {
      const x = node.x || 0;
      const y = node.y || 0;
      const r = node.radius;

      minX = Math.min(minX, x - r);
      maxX = Math.max(maxX, x + r);
      minY = Math.min(minY, y - r);
      maxY = Math.max(maxY, y + r);
    });

    const width = this.layoutConfig.width;
    const height = this.layoutConfig.height;
    const dx = maxX - minX;
    const dy = maxY - minY;
    const x = (minX + maxX) / 2;
    const y = (minY + maxY) / 2;

    const scale = Math.min(
      (width - padding * 2) / dx,
      (height - padding * 2) / dy,
    );

    const transform = d3.zoomIdentity
      .translate(width / 2, height / 2)
      .scale(scale)
      .translate(-x, -y);

    this.svg.transition()
      .duration(750)
      .call(this.zoom.transform, transform);
  }

  centerView(): void {
    if (!this.zoom) return;

    const transform = d3.zoomIdentity
      .translate(this.layoutConfig.width / 2, this.layoutConfig.height / 2)
      .scale(1);

    this.svg.transition()
      .duration(500)
      .call(this.zoom.transform, transform);
  }

  on(event: GraphEventType, handler: GraphEventHandler): void {
    if (!this.eventHandlers.has(event)) {
      this.eventHandlers.set(event, []);
    }
    this.eventHandlers.get(event)!.push(handler);
  }

  off(event: GraphEventType, handler?: GraphEventHandler): void {
    if (!this.eventHandlers.has(event)) return;

    if (handler) {
      const handlers = this.eventHandlers.get(event)!;
      const index = handlers.indexOf(handler);
      if (index > -1) {
        handlers.splice(index, 1);
      }
    } else {
      this.eventHandlers.set(event, []);
    }
  }

  emit(event: GraphEvent): void {
    const handlers = this.eventHandlers.get(event.type);
    if (handlers) {
      handlers.forEach(handler => handler(event));
    }
  }

  destroy(): void {
    // 停止仿真
    this.simulation.stop();

    // 移除工具提示
    if (this.tooltip) {
      this.tooltip.remove();
    }

    // 清理事件处理器
    this.eventHandlers.clear();

    // 清理DOM
    d3.select<any, any>(this.container).selectAll('*').remove();
  }
}

export default D3GraphRenderer;
