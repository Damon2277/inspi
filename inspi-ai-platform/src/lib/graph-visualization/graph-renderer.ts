/**
 * 图谱渲染器
 * 核心的D3.js图谱渲染引擎
 */
import * as d3 from 'd3'
import {
  D3Node,
  D3Edge,
  GraphVisualizationData,
  GraphRenderer,
  GraphRendererConfig,
  LayoutConfig,
  VisualConfig,
  InteractionConfig,
  GraphEvent,
  GraphEventType,
  GraphEventHandler,
  DEFAULT_LAYOUT_CONFIG,
  DEFAULT_VISUAL_CONFIG,
  DEFAULT_INTERACTION_CONFIG
} from './types'
import {
  createZoomBehavior,
  createDragBehavior,
  createTooltip,
  showTooltip,
  hideTooltip,
  generateNodeTooltip,
  generateEdgeTooltip
} from './d3-utils'
import { layoutManager } from './layout-algorithms'

export class D3GraphRenderer implements GraphRenderer {
  private container: HTMLElement
  private svg: d3.Selection<SVGSVGElement, unknown, null, undefined>
  private g: d3.Selection<SVGGElement, unknown, null, undefined>
  private tooltip: d3.Selection<HTMLDivElement, unknown, HTMLElement, any>
  
  private layoutConfig: LayoutConfig
  private visualConfig: VisualConfig
  private interactionConfig: InteractionConfig
  
  private nodes: D3Node[] = []
  private links: D3Edge[] = []
  private selectedNodes: Set<string> = new Set()
  private selectedEdges: Set<string> = new Set()
  
  private eventHandlers: Map<GraphEventType, GraphEventHandler[]> = new Map()
  private zoom: d3.ZoomBehavior<SVGSVGElement, unknown> | null = null
  
  constructor(config: GraphRendererConfig) {
    this.container = config.container
    this.layoutConfig = config.layout || DEFAULT_LAYOUT_CONFIG
    this.visualConfig = config.visual || DEFAULT_VISUAL_CONFIG
    this.interactionConfig = config.interaction || DEFAULT_INTERACTION_CONFIG
    
    this.initializeSVG()
    this.initializeTooltip()
    
    if (config.data) {
      this.render(config.data)
    }
  }

  private initializeSVG(): void {
    // 清理现有内容
    d3.select(this.container).selectAll('*').remove()
    
    // 创建SVG
    this.svg = d3.select(this.container)
      .append('svg')
      .attr('width', '100%')
      .attr('height', '100%')
      .style('background', this.visualConfig.colors.background)
    
    // 创建主容器组
    this.g = this.svg.append('g')
      .attr('class', 'graph-container')
    
    // 创建图层
    this.g.append('g').attr('class', 'edges')
    this.g.append('g').attr('class', 'nodes')
  }

  private initializeTooltip(): void {
    this.tooltip = createTooltip()
  }

  render(data: GraphVisualizationData): void {
    this.nodes = [...data.nodes]
    this.links = [...data.links]
    
    this.renderEdges()
    this.renderNodes()
    this.applyLayout()
    this.enableInteraction(this.interactionConfig)
  }

  update(data: GraphVisualizationData): void {
    this.nodes = [...data.nodes]
    this.links = [...data.links]
    
    this.updateEdges()
    this.updateNodes()
    this.applyLayout()
  }

  clear(): void {
    this.g.selectAll('.nodes').selectAll('*').remove()
    this.g.selectAll('.edges').selectAll('*').remove()
    this.nodes = []
    this.links = []
    this.selectedNodes.clear()
    this.selectedEdges.clear()
  }

  private renderNodes(): void {
    const nodeGroup = this.g.select('.nodes')
    
    const nodeSelection = nodeGroup
      .selectAll<SVGGElement, D3Node>('.node')
      .data(this.nodes, d => d.id)
    
    // 移除旧节点
    nodeSelection.exit().remove()
    
    // 创建新节点组
    const nodeEnter = nodeSelection.enter()
      .append('g')
      .attr('class', 'node')
      .style('cursor', 'pointer')
    
    // 添加节点圆圈
    nodeEnter.append('circle')
      .attr('r', d => d.radius)
      .attr('fill', d => d.color)
      .attr('stroke', d => d.strokeColor)
      .attr('stroke-width', d => d.strokeWidth)
      .attr('opacity', d => d.opacity)
    
    // 添加节点标签
    nodeEnter.append('text')
      .attr('class', 'node-label')
      .attr('text-anchor', 'middle')
      .attr('dy', '.35em')
      .style('font-size', '12px')
      .style('font-weight', 'bold')
      .style('fill', '#333')
      .style('pointer-events', 'none')
      .text(d => d.label)
    
    // 合并选择集
    const nodeUpdate = nodeEnter.merge(nodeSelection)
    
    // 绑定事件
    this.bindNodeEvents(nodeUpdate)
  }

  private updateNodes(): void {
    const nodeGroup = this.g.select('.nodes')
    const nodeSelection = nodeGroup.selectAll<SVGGElement, D3Node>('.node')
      .data(this.nodes, d => d.id)
    
    // 更新现有节点
    nodeSelection.select('circle')
      .attr('r', d => d.radius)
      .attr('fill', d => d.color)
      .attr('stroke', d => d.strokeColor)
      .attr('stroke-width', d => d.strokeWidth)
      .attr('opacity', d => d.opacity)
    
    nodeSelection.select('.node-label')
      .text(d => d.label)
  }

  private renderEdges(): void {
    const edgeGroup = this.g.select('.edges')
    
    const edgeSelection = edgeGroup
      .selectAll<SVGLineElement, D3Edge>('.edge')
      .data(this.links, d => d.id)
    
    // 移除旧边
    edgeSelection.exit().remove()
    
    // 创建新边
    const edgeEnter = edgeSelection.enter()
      .append('line')
      .attr('class', 'edge')
      .attr('stroke', d => d.color)
      .attr('stroke-width', d => d.strokeWidth)
      .attr('stroke-dasharray', d => d.strokeDasharray || null)
      .attr('opacity', d => d.opacity)
      .style('cursor', 'pointer')
    
    // 合并选择集
    const edgeUpdate = edgeEnter.merge(edgeSelection)
    
    // 绑定事件
    this.bindEdgeEvents(edgeUpdate)
  }

  private updateEdges(): void {
    const edgeGroup = this.g.select('.edges')
    const edgeSelection = edgeGroup.selectAll<SVGLineElement, D3Edge>('.edge')
      .data(this.links, d => d.id)
    
    // 更新现有边
    edgeSelection
      .attr('stroke', d => d.color)
      .attr('stroke-width', d => d.strokeWidth)
      .attr('stroke-dasharray', d => d.strokeDasharray || null)
      .attr('opacity', d => d.opacity)
  }

  private bindNodeEvents(selection: d3.Selection<SVGGElement, D3Node, SVGGElement, unknown>): void {
    selection
      .on('click', (event, d) => {
        event.stopPropagation()
        this.handleNodeClick(d, event)
      })
      .on('dblclick', (event, d) => {
        event.stopPropagation()
        this.handleNodeDoubleClick(d, event)
      })
      .on('mouseenter', (event, d) => {
        this.handleNodeMouseEnter(d, event)
      })
      .on('mouseleave', (event, d) => {
        this.handleNodeMouseLeave(d, event)
      })
  }

  private bindEdgeEvents(selection: d3.Selection<SVGLineElement, D3Edge, SVGGElement, unknown>): void {
    selection
      .on('click', (event, d) => {
        event.stopPropagation()
        this.handleEdgeClick(d, event)
      })
      .on('mouseenter', (event, d) => {
        this.handleEdgeMouseEnter(d, event)
      })
      .on('mouseleave', (event, d) => {
        this.handleEdgeMouseLeave(d, event)
      })
  }

  private handleNodeClick(node: D3Node, event: Event): void {
    if (this.interactionConfig.selection.enabled) {
      if (this.interactionConfig.selection.multiSelect && (event as MouseEvent).ctrlKey) {
        this.toggleNodeSelection(node.id)
      } else {
        this.selectNodes([node.id])
      }
    }
    
    this.emit({
      type: 'node:click',
      target: node,
      originalEvent: event,
      position: { x: (event as MouseEvent).clientX, y: (event as MouseEvent).clientY }
    })
  }

  private handleNodeDoubleClick(node: D3Node, event: Event): void {
    this.emit({
      type: 'node:dblclick',
      target: node,
      originalEvent: event,
      position: { x: (event as MouseEvent).clientX, y: (event as MouseEvent).clientY }
    })
  }

  private handleNodeMouseEnter(node: D3Node, event: Event): void {
    if (this.interactionConfig.tooltip.enabled) {
      const tooltip = generateNodeTooltip(node)
      showTooltip(this.tooltip, tooltip, event as MouseEvent, this.interactionConfig.tooltip.offset)
    }
    
    this.emit({
      type: 'node:mouseenter',
      target: node,
      originalEvent: event,
      position: { x: (event as MouseEvent).clientX, y: (event as MouseEvent).clientY }
    })
  }

  private handleNodeMouseLeave(node: D3Node, event: Event): void {
    if (this.interactionConfig.tooltip.enabled) {
      hideTooltip(this.tooltip)
    }
    
    this.emit({
      type: 'node:mouseleave',
      target: node,
      originalEvent: event,
      position: { x: (event as MouseEvent).clientX, y: (event as MouseEvent).clientY }
    })
  }

  private handleEdgeClick(edge: D3Edge, event: Event): void {
    if (this.interactionConfig.selection.enabled) {
      if (this.interactionConfig.selection.multiSelect && (event as MouseEvent).ctrlKey) {
        this.toggleEdgeSelection(edge.id)
      } else {
        this.selectEdges([edge.id])
      }
    }
    
    this.emit({
      type: 'edge:click',
      target: edge,
      originalEvent: event,
      position: { x: (event as MouseEvent).clientX, y: (event as MouseEvent).clientY }
    })
  }

  private handleEdgeMouseEnter(edge: D3Edge, event: Event): void {
    if (this.interactionConfig.tooltip.enabled) {
      const tooltip = generateEdgeTooltip(edge)
      showTooltip(this.tooltip, tooltip, event as MouseEvent, this.interactionConfig.tooltip.offset)
    }
    
    this.emit({
      type: 'edge:mouseenter',
      target: edge,
      originalEvent: event,
      position: { x: (event as MouseEvent).clientX, y: (event as MouseEvent).clientY }
    })
  }

  private handleEdgeMouseLeave(edge: D3Edge, event: Event): void {
    if (this.interactionConfig.tooltip.enabled) {
      hideTooltip(this.tooltip)
    }
    
    this.emit({
      type: 'edge:mouseleave',
      target: edge,
      originalEvent: event,
      position: { x: (event as MouseEvent).clientX, y: (event as MouseEvent).clientY }
    })
  }

  private toggleNodeSelection(nodeId: string): void {
    if (this.selectedNodes.has(nodeId)) {
      this.selectedNodes.delete(nodeId)
    } else {
      this.selectedNodes.add(nodeId)
    }
    this.updateSelectionStyles()
    this.emitSelectionChange()
  }

  private toggleEdgeSelection(edgeId: string): void {
    if (this.selectedEdges.has(edgeId)) {
      this.selectedEdges.delete(edgeId)
    } else {
      this.selectedEdges.add(edgeId)
    }
    this.updateSelectionStyles()
    this.emitSelectionChange()
  }

  private updateSelectionStyles(): void {
    // 更新节点选择样式
    this.g.selectAll<SVGGElement, D3Node>('.node')
      .select('circle')
      .attr('stroke', d => 
        this.selectedNodes.has(d.id) 
          ? this.visualConfig.colors.selection 
          : d.strokeColor
      )
      .attr('stroke-width', d => 
        this.selectedNodes.has(d.id) 
          ? d.strokeWidth * 2 
          : d.strokeWidth
      )
    
    // 更新边选择样式
    this.g.selectAll<SVGLineElement, D3Edge>('.edge')
      .attr('stroke', d => 
        this.selectedEdges.has(d.id) 
          ? this.visualConfig.colors.selection 
          : d.color
      )
      .attr('stroke-width', d => 
        this.selectedEdges.has(d.id) 
          ? d.strokeWidth * 2 
          : d.strokeWidth
      )
  }

  private emitSelectionChange(): void {
    this.emit({
      type: 'selection:change',
      target: null,
      originalEvent: new Event('selection:change'),
      position: { x: 0, y: 0 },
      data: {
        nodes: Array.from(this.selectedNodes),
        edges: Array.from(this.selectedEdges)
      }
    })
  }

  // 公共方法实现
  setLayout(config: LayoutConfig): void {
    this.layoutConfig = { ...this.layoutConfig, ...config }
  }

  applyLayout(): void {
    layoutManager.applyLayout(
      this.layoutConfig.type,
      this.nodes,
      this.links,
      this.layoutConfig
    )
    
    // 如果是力导向布局，绑定tick事件
    const simulation = layoutManager.getCurrentSimulation()
    if (simulation) {
      simulation.on('tick', () => {
        this.updatePositions()
      })
    }
  }

  private updatePositions(): void {
    // 更新节点位置
    this.g.selectAll<SVGGElement, D3Node>('.node')
      .attr('transform', d => `translate(${d.x || 0}, ${d.y || 0})`)
    
    // 更新边位置
    this.g.selectAll<SVGLineElement, D3Edge>('.edge')
      .attr('x1', d => (d.source as D3Node).x || 0)
      .attr('y1', d => (d.source as D3Node).y || 0)
      .attr('x2', d => (d.target as D3Node).x || 0)
      .attr('y2', d => (d.target as D3Node).y || 0)
  }

  setVisualConfig(config: VisualConfig): void {
    this.visualConfig = { ...this.visualConfig, ...config }
    this.updateNodes()
    this.updateEdges()
  }

  updateNodeStyles(nodeIds: string[]): void {
    this.updateNodes()
  }

  updateEdgeStyles(edgeIds: string[]): void {
    this.updateEdges()
  }

  enableInteraction(config: InteractionConfig): void {
    this.interactionConfig = { ...this.interactionConfig, ...config }
    
    if (config.zoom.enabled) {
      this.zoom = createZoomBehavior(this.svg, this.g, config.zoom)
    }
    
    if (config.drag.enabled) {
      const dragBehavior = createDragBehavior(this.nodes, this.links, config.drag)
      this.g.selectAll('.node').call(dragBehavior)
    }
    
    // 绑定画布点击事件
    this.svg.on('click', (event) => {
      if (event.target === this.svg.node()) {
        this.clearSelection()
        this.emit({
          type: 'canvas:click',
          target: null,
          originalEvent: event,
          position: { x: event.clientX, y: event.clientY }
        })
      }
    })
  }

  disableInteraction(): void {
    if (this.zoom) {
      this.svg.on('.zoom', null)
      this.zoom = null
    }
    
    this.g.selectAll('.node').on('.drag', null)
    this.svg.on('click', null)
  }

  selectNodes(nodeIds: string[]): void {
    this.selectedNodes.clear()
    nodeIds.forEach(id => this.selectedNodes.add(id))
    this.updateSelectionStyles()
    this.emitSelectionChange()
  }

  selectEdges(edgeIds: string[]): void {
    this.selectedEdges.clear()
    edgeIds.forEach(id => this.selectedEdges.add(id))
    this.updateSelectionStyles()
    this.emitSelectionChange()
  }

  clearSelection(): void {
    this.selectedNodes.clear()
    this.selectedEdges.clear()
    this.updateSelectionStyles()
    this.emitSelectionChange()
  }

  getSelection(): { nodes: string[]; edges: string[] } {
    return {
      nodes: Array.from(this.selectedNodes),
      edges: Array.from(this.selectedEdges)
    }
  }

  zoomToFit(padding = 50): void {
    if (!this.zoom) return
    
    const bounds = this.calculateBounds()
    if (!bounds) return
    
    const { width, height } = this.layoutConfig
    const scale = Math.min(
      (width - padding * 2) / bounds.width,
      (height - padding * 2) / bounds.height,
      2
    )
    
    const translate = [
      width / 2 - scale * bounds.centerX,
      height / 2 - scale * bounds.centerY
    ]
    
    this.svg.transition()
      .duration(750)
      .call(
        this.zoom.transform,
        d3.zoomIdentity.translate(translate[0], translate[1]).scale(scale)
      )
  }

  zoomToNodes(nodeIds: string[], padding = 50): void {
    if (!this.zoom) return
    
    const targetNodes = this.nodes.filter(n => nodeIds.includes(n.id))
    if (targetNodes.length === 0) return
    
    const bounds = this.calculateNodesBounds(targetNodes)
    if (!bounds) return
    
    const { width, height } = this.layoutConfig
    const scale = Math.min(
      (width - padding * 2) / bounds.width,
      (height - padding * 2) / bounds.height,
      2
    )
    
    const translate = [
      width / 2 - scale * bounds.centerX,
      height / 2 - scale * bounds.centerY
    ]
    
    this.svg.transition()
      .duration(750)
      .call(
        this.zoom.transform,
        d3.zoomIdentity.translate(translate[0], translate[1]).scale(scale)
      )
  }

  centerView(): void {
    if (!this.zoom) return
    
    this.svg.transition()
      .duration(750)
      .call(this.zoom.transform, d3.zoomIdentity)
  }

  private calculateBounds() {
    if (this.nodes.length === 0) return null
    
    const xs = this.nodes.map(d => d.x || 0)
    const ys = this.nodes.map(d => d.y || 0)
    const minX = Math.min(...xs)
    const maxX = Math.max(...xs)
    const minY = Math.min(...ys)
    const maxY = Math.max(...ys)
    
    return {
      minX,
      maxX,
      minY,
      maxY,
      width: maxX - minX || 1,
      height: maxY - minY || 1,
      centerX: (minX + maxX) / 2,
      centerY: (minY + maxY) / 2
    }
  }

  private calculateNodesBounds(nodes: D3Node[]) {
    if (nodes.length === 0) return null
    
    const xs = nodes.map(d => d.x || 0)
    const ys = nodes.map(d => d.y || 0)
    const minX = Math.min(...xs)
    const maxX = Math.max(...xs)
    const minY = Math.min(...ys)
    const maxY = Math.max(...ys)
    
    return {
      minX,
      maxX,
      minY,
      maxY,
      width: maxX - minX || 1,
      height: maxY - minY || 1,
      centerX: (minX + maxX) / 2,
      centerY: (minY + maxY) / 2
    }
  }

  on(event: GraphEventType, handler: GraphEventHandler): void {
    if (!this.eventHandlers.has(event)) {
      this.eventHandlers.set(event, [])
    }
    this.eventHandlers.get(event)!.push(handler)
  }

  off(event: GraphEventType, handler?: GraphEventHandler): void {
    if (!this.eventHandlers.has(event)) return
    
    if (handler) {
      const handlers = this.eventHandlers.get(event)!
      const index = handlers.indexOf(handler)
      if (index > -1) {
        handlers.splice(index, 1)
      }
    } else {
      this.eventHandlers.set(event, [])
    }
  }

  emit(event: GraphEvent): void {
    const handlers = this.eventHandlers.get(event.type)
    if (handlers) {
      handlers.forEach(handler => handler(event))
    }
  }

  destroy(): void {
    // 停止布局
    layoutManager.stopCurrentLayout()
    
    // 清理事件监听器
    this.eventHandlers.clear()
    
    // 清理DOM
    if (this.tooltip) {
      this.tooltip.remove()
    }
    
    d3.select(this.container).selectAll('*').remove()
  }
}