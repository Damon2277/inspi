/**
 * 图谱交互管理器
 * 负责处理图谱的各种交互功能，包括选择、编辑、搜索、筛选等
 */
import { KnowledgeGraph, GraphNode, GraphEdge } from '@/shared/types/knowledgeGraph';

import GraphDataManager from './data-manager';
import { D3Node, D3Edge, GraphVisualizationData, GraphEvent } from './types';

export interface SelectionState {
  nodes: string[]
  edges: string[]
  lastSelected: 'node' | 'edge' | null
  selectionBox?: {
    x: number
    y: number
    width: number
    height: number
  }
}

export interface FilterState {
  nodeTypes: string[]
  edgeTypes: string[]
  levels: number[]
  hasWorks: boolean | null
  searchQuery: string
  showHidden: boolean
}

export interface EditingState {
  mode: 'view' | 'edit' | 'create_node' | 'create_edge'
  activeNode: string | null
  activeEdge: string | null
  pendingEdge: {
    source: string
    target: string | null
    type: string
  } | null
}

/**
 * 图谱交互管理器
 */
export class GraphInteractionManager {
  private dataManager: GraphDataManager;
  private selectionState: SelectionState = {
    nodes: [],
    edges: [],
    lastSelected: null,
  };
  private filterState: FilterState = {
    nodeTypes: [],
    edgeTypes: [],
    levels: [],
    hasWorks: null,
    searchQuery: '',
    showHidden: false,
  };
  private editingState: EditingState = {
    mode: 'view',
    activeNode: null,
    activeEdge: null,
    pendingEdge: null,
  };

  private listeners: Map<string, Set<Function>> = new Map();

  constructor(dataManager: GraphDataManager) {
    this.dataManager = dataManager;
    this.initializeEventListeners();
  }

  /**
   * 初始化事件监听器
   */
  private initializeEventListeners(): void {
    this.dataManager.addChangeListener((graph) => {
      this.emit('graph:changed', graph);
    });
  }

  /**
   * 添加事件监听器
   */
  on(event: string, listener: Function): void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(listener);
  }

  /**
   * 移除事件监听器
   */
  off(event: string, listener?: Function): void {
    if (!this.listeners.has(event)) return;

    if (listener) {
      this.listeners.get(event)!.delete(listener);
    } else {
      this.listeners.get(event)!.clear();
    }
  }

  /**
   * 发出事件
   */
  private emit(event: string, ...args: any[]): void {
    const listeners = this.listeners.get(event);
    if (listeners) {
      listeners.forEach(listener => listener(...args));
    }
  }

  // ============= 选择管理 =============

  /**
   * 选择节点
   */
  selectNodes(nodeIds: string[], addToSelection: boolean = false): void {
    if (!addToSelection) {
      this.selectionState.nodes = [];
      this.selectionState.edges = [];
    }

    nodeIds.forEach(nodeId => {
      if (!this.selectionState.nodes.includes(nodeId)) {
        this.selectionState.nodes.push(nodeId);
      }
    });

    this.selectionState.lastSelected = 'node';
    this.emit('selection:changed', this.selectionState);
  }

  /**
   * 选择边
   */
  selectEdges(edgeIds: string[], addToSelection: boolean = false): void {
    if (!addToSelection) {
      this.selectionState.nodes = [];
      this.selectionState.edges = [];
    }

    edgeIds.forEach(edgeId => {
      if (!this.selectionState.edges.includes(edgeId)) {
        this.selectionState.edges.push(edgeId);
      }
    });

    this.selectionState.lastSelected = 'edge';
    this.emit('selection:changed', this.selectionState);
  }

  /**
   * 切换节点选择
   */
  toggleNodeSelection(nodeId: string): void {
    const index = this.selectionState.nodes.indexOf(nodeId);
    if (index > -1) {
      this.selectionState.nodes.splice(index, 1);
    } else {
      this.selectionState.nodes.push(nodeId);
    }

    this.selectionState.lastSelected = 'node';
    this.emit('selection:changed', this.selectionState);
  }

  /**
   * 切换边选择
   */
  toggleEdgeSelection(edgeId: string): void {
    const index = this.selectionState.edges.indexOf(edgeId);
    if (index > -1) {
      this.selectionState.edges.splice(index, 1);
    } else {
      this.selectionState.edges.push(edgeId);
    }

    this.selectionState.lastSelected = 'edge';
    this.emit('selection:changed', this.selectionState);
  }

  /**
   * 清除选择
   */
  clearSelection(): void {
    this.selectionState.nodes = [];
    this.selectionState.edges = [];
    this.selectionState.lastSelected = null;
    this.selectionState.selectionBox = undefined;
    this.emit('selection:changed', this.selectionState);
  }

  /**
   * 框选
   */
  selectByBox(box: { x: number; y: number; width: number; height: number }): void {
    this.selectionState.selectionBox = box;

    const graph = this.dataManager.getGraph();
    const selectedNodes: string[] = [];

    // 检查哪些节点在选择框内
    graph.nodes.forEach(node => {
      if (node.position) {
        const { x, y } = node.position;
        if (x >= box.x && x <= box.x + box.width &&
            y >= box.y && y <= box.y + box.height) {
          selectedNodes.push(node.id);
        }
      }
    });

    this.selectNodes(selectedNodes);
  }

  /**
   * 选择相邻节点
   */
  selectNeighbors(nodeId: string, addToSelection: boolean = true): void {
    const graph = this.dataManager.getGraph();
    const neighbors: string[] = [];

    graph.edges.forEach(edge => {
      if (edge.source === nodeId && !neighbors.includes(edge.target)) {
        neighbors.push(edge.target);
      }
      if (edge.target === nodeId && !neighbors.includes(edge.source)) {
        neighbors.push(edge.source);
      }
    });

    this.selectNodes(neighbors, addToSelection);
  }

  /**
   * 获取选择状态
   */
  getSelection(): SelectionState {
    return { ...this.selectionState };
  }

  // ============= 过滤和搜索 =============

  /**
   * 设置过滤器
   */
  setFilter(filter: Partial<FilterState>): void {
    this.filterState = { ...this.filterState, ...filter };
    this.emit('filter:changed', this.filterState);
  }

  /**
   * 清除过滤器
   */
  clearFilter(): void {
    this.filterState = {
      nodeTypes: [],
      edgeTypes: [],
      levels: [],
      hasWorks: null,
      searchQuery: '',
      showHidden: false,
    };
    this.emit('filter:changed', this.filterState);
  }

  /**
   * 搜索节点
   */
  searchNodes(query: string): GraphNode[] {
    this.filterState.searchQuery = query;
    const results = this.dataManager.searchNodes(query, {
      types: this.filterState.nodeTypes.length > 0 ? this.filterState.nodeTypes as any : undefined,
      levels: this.filterState.levels.length > 0 ? this.filterState.levels : undefined,
      hasWorks: this.filterState.hasWorks !== null ? this.filterState.hasWorks : undefined,
    });

    this.emit('search:results', results);
    return results;
  }

  /**
   * 高亮搜索结果
   */
  highlightSearchResults(nodeIds: string[]): void {
    this.emit('highlight:nodes', nodeIds);
  }

  /**
   * 获取过滤后的数据
   */
  getFilteredData(): GraphVisualizationData {
    const graph = this.dataManager.getGraph();
    let filteredNodes = graph.nodes;
    let filteredEdges = graph.edges;

    // 应用节点过滤器
    if (this.filterState.nodeTypes.length > 0) {
      filteredNodes = filteredNodes.filter(node =>
        this.filterState.nodeTypes.includes(node.type),
      );
    }

    if (this.filterState.levels.length > 0) {
      filteredNodes = filteredNodes.filter(node =>
        this.filterState.levels.includes(node.level),
      );
    }

    if (this.filterState.hasWorks !== null) {
      filteredNodes = filteredNodes.filter(node =>
        this.filterState.hasWorks ? node.metadata.workCount > 0 : node.metadata.workCount === 0,
      );
    }

    if (!this.filterState.showHidden) {
      filteredNodes = filteredNodes.filter(node => node.isVisible);
    }

    // 搜索过滤
    if (this.filterState.searchQuery.trim()) {
      const searchTerm = this.filterState.searchQuery.toLowerCase();
      filteredNodes = filteredNodes.filter(node =>
        node.label.toLowerCase().includes(searchTerm) ||
        node.metadata.description?.toLowerCase().includes(searchTerm),
      );
    }

    // 过滤边 - 只保留两端节点都存在的边
    const nodeIds = new Set(filteredNodes.map(node => node.id));
    filteredEdges = filteredEdges.filter(edge =>
      nodeIds.has(edge.source) && nodeIds.has(edge.target),
    );

    // 应用边类型过滤器
    if (this.filterState.edgeTypes.length > 0) {
      filteredEdges = filteredEdges.filter(edge =>
        this.filterState.edgeTypes.includes(edge.type),
      );
    }

    if (!this.filterState.showHidden) {
      filteredEdges = filteredEdges.filter(edge => edge.isVisible);
    }

    return this.dataManager.getVisualizationData();
  }

  /**
   * 获取过滤状态
   */
  getFilter(): FilterState {
    return { ...this.filterState };
  }

  // ============= 编辑模式 =============

  /**
   * 设置编辑模式
   */
  setEditMode(mode: EditingState['mode']): void {
    this.editingState.mode = mode;
    this.editingState.activeNode = null;
    this.editingState.activeEdge = null;
    this.editingState.pendingEdge = null;
    this.emit('edit:mode:changed', mode);
  }

  /**
   * 开始创建节点
   */
  startCreateNode(position: { x: number; y: number }): void {
    this.editingState.mode = 'create_node';
    this.emit('edit:create:node:start', position);
  }

  /**
   * 完成创建节点
   */
  finishCreateNode(nodeData: {
    label: string
    type: string
    position: { x: number; y: number }
  }): GraphNode {
    const node = this.dataManager.createNode({
      label: nodeData.label,
      type: nodeData.type as any,
      position: nodeData.position,
    });

    this.editingState.mode = 'view';
    this.emit('edit:create:node:finish', node);
    return node;
  }

  /**
   * 开始创建边
   */
  startCreateEdge(sourceNodeId: string): void {
    this.editingState.mode = 'create_edge';
    this.editingState.pendingEdge = {
      source: sourceNodeId,
      target: null,
      type: 'related',
    };
    this.emit('edit:create:edge:start', sourceNodeId);
  }

  /**
   * 完成创建边
   */
  finishCreateEdge(targetNodeId: string, edgeType: string = 'related'): GraphEdge | null {
    if (!this.editingState.pendingEdge) return null;

    const edge = this.dataManager.createEdge({
      source: this.editingState.pendingEdge.source,
      target: targetNodeId,
      type: edgeType as any,
    });

    this.editingState.mode = 'view';
    this.editingState.pendingEdge = null;
    this.emit('edit:create:edge:finish', edge);
    return edge;
  }

  /**
   * 取消创建边
   */
  cancelCreateEdge(): void {
    this.editingState.mode = 'view';
    this.editingState.pendingEdge = null;
    this.emit('edit:create:edge:cancel');
  }

  /**
   * 开始编辑节点
   */
  startEditNode(nodeId: string): void {
    this.editingState.mode = 'edit';
    this.editingState.activeNode = nodeId;
    this.emit('edit:node:start', nodeId);
  }

  /**
   * 完成编辑节点
   */
  finishEditNode(nodeId: string, updates: any): GraphNode {
    const node = this.dataManager.updateNode(nodeId, updates);
    this.editingState.mode = 'view';
    this.editingState.activeNode = null;
    this.emit('edit:node:finish', node);
    return node;
  }

  /**
   * 删除选中的元素
   */
  deleteSelected(): void {
    const { nodes, edges } = this.selectionState;

    // 删除选中的边
    edges.forEach(edgeId => {
      this.dataManager.deleteEdge(edgeId);
    });

    // 删除选中的节点
    nodes.forEach(nodeId => {
      try {
        this.dataManager.deleteNode(nodeId);
      } catch (error) {
        console.warn(`Cannot delete node ${nodeId}:`, error);
      }
    });

    this.clearSelection();
    this.emit('edit:delete:finish', { nodes, edges });
  }

  /**
   * 获取编辑状态
   */
  getEditState(): EditingState {
    return { ...this.editingState };
  }

  // ============= 快捷操作 =============

  /**
   * 复制选中的元素
   */
  copySelected(): void {
    const { nodes, edges } = this.selectionState;
    const graph = this.dataManager.getGraph();

    const selectedNodes = graph.nodes.filter(node => nodes.includes(node.id));
    const selectedEdges = graph.edges.filter(edge => edges.includes(edge.id));

    const clipboardData = {
      nodes: selectedNodes,
      edges: selectedEdges,
      timestamp: Date.now(),
    };

    // 存储到剪贴板（这里简化为localStorage）
    localStorage.setItem('graph-clipboard', JSON.stringify(clipboardData));
    this.emit('clipboard:copy', clipboardData);
  }

  /**
   * 粘贴元素
   */
  paste(offset: { x: number; y: number } = { x: 50, y: 50 }): void {
    const clipboardData = localStorage.getItem('graph-clipboard');
    if (!clipboardData) return;

    try {
      const data = JSON.parse(clipboardData);
      const idMapping = new Map<string, string>();

      // 创建新节点
      data.nodes.forEach((node: GraphNode) => {
        const newId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        idMapping.set(node.id, newId);

        const newNode = this.dataManager.createNode({
          id: newId,
          label: `${node.label} (copy)`,
          type: node.type,
          position: node.position ? {
            x: node.position.x + offset.x,
            y: node.position.y + offset.y,
          } : undefined,
          metadata: node.metadata,
        });
      });

      // 创建新边
      data.edges.forEach((edge: GraphEdge) => {
        const newSourceId = idMapping.get(edge.source);
        const newTargetId = idMapping.get(edge.target);

        if (newSourceId && newTargetId) {
          this.dataManager.createEdge({
            source: newSourceId,
            target: newTargetId,
            type: edge.type,
            weight: edge.weight,
            metadata: edge.metadata,
          });
        }
      });

      this.emit('clipboard:paste', { nodes: data.nodes.length, edges: data.edges.length });
    } catch (error) {
      console.error('Failed to paste:', error);
    }
  }

  /**
   * 全选
   */
  selectAll(): void {
    const graph = this.dataManager.getGraph();
    this.selectNodes(graph.nodes.map(node => node.id));
    this.selectEdges(graph.edges.map(edge => edge.id), true);
  }

  /**
   * 反选
   */
  invertSelection(): void {
    const graph = this.dataManager.getGraph();
    const allNodeIds = graph.nodes.map(node => node.id);
    const allEdgeIds = graph.edges.map(edge => edge.id);

    const newSelectedNodes = allNodeIds.filter(id => !this.selectionState.nodes.includes(id));
    const newSelectedEdges = allEdgeIds.filter(id => !this.selectionState.edges.includes(id));

    this.selectionState.nodes = newSelectedNodes;
    this.selectionState.edges = newSelectedEdges;
    this.emit('selection:changed', this.selectionState);
  }

  /**
   * 隐藏选中的元素
   */
  hideSelected(): void {
    const { nodes, edges } = this.selectionState;

    nodes.forEach(nodeId => {
      this.dataManager.updateNode(nodeId, { isVisible: false });
    });

    edges.forEach(edgeId => {
      const edge = this.dataManager.getEdge(edgeId);
      if (edge) {
        // 注意：这里需要扩展GraphDataManager来支持更新边
        // edge.isVisible = false
      }
    });

    this.clearSelection();
    this.emit('visibility:changed', { hidden: { nodes, edges } });
  }

  /**
   * 显示所有隐藏的元素
   */
  showAll(): void {
    const graph = this.dataManager.getGraph();

    graph.nodes.forEach(node => {
      if (!node.isVisible) {
        this.dataManager.updateNode(node.id, { isVisible: true });
      }
    });

    // 这里需要扩展GraphDataManager来支持更新边的可见性
    // graph.edges.forEach(edge => {
    //   if (!edge.isVisible) {
    //     edge.isVisible = true
    //   }
    // })

    this.emit('visibility:changed', { shown: 'all' });
  }

  /**
   * 锁定选中的节点
   */
  lockSelected(): void {
    const { nodes } = this.selectionState;

    nodes.forEach(nodeId => {
      this.dataManager.updateNode(nodeId, { });
    });

    this.emit('lock:changed', { locked: nodes });
  }

  /**
   * 解锁选中的节点
   */
  unlockSelected(): void {
    const { nodes } = this.selectionState;

    nodes.forEach(nodeId => {
      this.dataManager.updateNode(nodeId, { });
    });

    this.emit('lock:changed', { unlocked: nodes });
  }

  // ============= 分析功能 =============

  /**
   * 查找最短路径
   */
  findShortestPath(sourceId: string, targetId: string): string[] | null {
    const graph = this.dataManager.getGraph();

    // 使用BFS查找最短路径
    const queue: { nodeId: string; path: string[] }[] = [{ nodeId: sourceId, path: [sourceId] }];
    const visited = new Set<string>();

    while (queue.length > 0) {
      const { nodeId, path } = queue.shift()!;

      if (nodeId === targetId) {
        return path;
      }

      if (visited.has(nodeId)) continue;
      visited.add(nodeId);

      // 找到相邻节点
      graph.edges.forEach(edge => {
        let nextNodeId: string | null = null;

        if (edge.source === nodeId) {
          nextNodeId = edge.target;
        } else if (edge.target === nodeId && !edge.isDirected) {
          nextNodeId = edge.source;
        }

        if (nextNodeId && !visited.has(nextNodeId)) {
          queue.push({ nodeId: nextNodeId, path: [...path, nextNodeId] });
        }
      });
    }

    return null;
  }

  /**
   * 获取节点的度数
   */
  getNodeDegree(nodeId: string): { inDegree: number; outDegree: number; totalDegree: number } {
    const graph = this.dataManager.getGraph();
    let inDegree = 0;
    let outDegree = 0;

    graph.edges.forEach(edge => {
      if (edge.target === nodeId) inDegree++;
      if (edge.source === nodeId) outDegree++;
    });

    return {
      inDegree,
      outDegree,
      totalDegree: inDegree + outDegree,
    };
  }

  /**
   * 获取连通分量
   */
  getConnectedComponents(): string[][] {
    const graph = this.dataManager.getGraph();
    const visited = new Set<string>();
    const components: string[][] = [];

    graph.nodes.forEach(node => {
      if (!visited.has(node.id)) {
        const component = this.dfsComponent(node.id, visited, graph);
        components.push(component);
      }
    });

    return components;
  }

  /**
   * DFS遍历连通分量
   */
  private dfsComponent(nodeId: string, visited: Set<string>, graph: KnowledgeGraph): string[] {
    const component: string[] = [];
    const stack: string[] = [nodeId];

    while (stack.length > 0) {
      const currentId = stack.pop()!;

      if (visited.has(currentId)) continue;

      visited.add(currentId);
      component.push(currentId);

      // 找到相邻节点
      graph.edges.forEach(edge => {
        if (edge.source === currentId && !visited.has(edge.target)) {
          stack.push(edge.target);
        }
        if (edge.target === currentId && !edge.isDirected && !visited.has(edge.source)) {
          stack.push(edge.source);
        }
      });
    }

    return component;
  }

  /**
   * 销毁管理器
   */
  destroy(): void {
    this.listeners.clear();
    this.clearSelection();
    this.clearFilter();
    this.setEditMode('view');
  }
}

export default GraphInteractionManager;
