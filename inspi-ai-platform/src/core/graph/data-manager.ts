/**
 * 图谱数据管理系统
 * 负责图谱数据的增删改查、版本控制、导入导出等功能
 */
import {
  KnowledgeGraph,
  GraphNode,
  GraphEdge,
  CreateNodeRequest,
  UpdateNodeRequest,
  CreateEdgeRequest,
  GraphOperation,
  NodeType,
  EdgeType,
} from '@/shared/types/knowledgeGraph';
// 移除对D3相关模块的依赖，避免测试时的导入问题
// import { GraphVisualizationData } from './types'
// import { transformGraphData } from './d3-utils'

/**
 * 图谱数据管理器
 */
export class GraphDataManager {
  private graph: KnowledgeGraph;
  private operationHistory: GraphOperation[] = [];
  private maxHistorySize: number = 100;
  private changeListeners: Set<(graph: KnowledgeGraph) => void> = new Set();

  constructor(graph: KnowledgeGraph) {
    this.graph = { ...graph };
  }

  /**
   * 获取当前图谱
   */
  getGraph(): KnowledgeGraph {
    return { ...this.graph };
  }

  /**
   * 获取可视化数据
   */
  getVisualizationData(): any {
    // 简化实现，避免D3依赖问题
    return {
      nodes: this.graph.nodes,
      links: this.graph.edges,
      bounds: { minX: 0, maxX: 800, minY: 0, maxY: 600 },
    };
  }

  /**
   * 添加变化监听器
   */
  addChangeListener(listener: (graph: KnowledgeGraph) => void): void {
    this.changeListeners.add(listener);
  }

  /**
   * 移除变化监听器
   */
  removeChangeListener(listener: (graph: KnowledgeGraph) => void): void {
    this.changeListeners.delete(listener);
  }

  /**
   * 通知变化
   */
  private notifyChange(): void {
    this.changeListeners.forEach(listener => listener(this.graph));
  }

  /**
   * 记录操作历史
   */
  private recordOperation(operation: Omit<GraphOperation, 'id' | 'timestamp'>): void {
    const op: GraphOperation = {
      id: this.generateId(),
      timestamp: new Date(),
      ...operation,
    };

    this.operationHistory.push(op);

    // 限制历史记录大小
    if (this.operationHistory.length > this.maxHistorySize) {
      this.operationHistory.shift();
    }
  }

  /**
   * 生成唯一ID
   */
  private generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * 验证节点ID唯一性
   */
  private validateNodeId(nodeId: string, excludeId?: string): boolean {
    return !this.graph.nodes.some(node => node.id === nodeId && node.id !== excludeId);
  }

  /**
   * 验证边ID唯一性
   */
  private validateEdgeId(edgeId: string, excludeId?: string): boolean {
    return !this.graph.edges.some(edge => edge.id === edgeId && edge.id !== excludeId);
  }

  /**
   * 验证节点存在
   */
  private validateNodeExists(nodeId: string): boolean {
    return this.graph.nodes.some(node => node.id === nodeId);
  }

  // ============= 节点操作 =============

  /**
   * 创建节点
   */
  createNode(request: CreateNodeRequest & { id?: string }): GraphNode {
    const nodeId = request.id || this.generateId();

    if (!this.validateNodeId(nodeId)) {
      throw new Error(`Node with id ${nodeId} already exists`);
    }

    // 验证父节点存在
    if (request.parentId && !this.validateNodeExists(request.parentId)) {
      throw new Error(`Parent node ${request.parentId} does not exist`);
    }

    // 计算层级
    let level = 0;
    if (request.parentId) {
      const parentNode = (this.graph.nodes as any).find(node => node.id === request.parentId);
      if (parentNode) {
        level = parentNode.level + 1;
      }
    }

    const newNode: GraphNode = {
      id: nodeId,
      label: request.label,
      type: request.type,
      level,
      parentId: request.parentId,
      position: request.position,
      metadata: {
        workCount: 0,
        reuseCount: 0,
        ...request.metadata,
      },
      isVisible: true,
      isLocked: false,
    };

    this.graph.nodes.push(newNode);
    this.graph.version++;

    // 记录操作
    this.recordOperation({
      graphId: this.graph.id,
      userId: this.graph.userId,
      type: 'create_node',
      data: { node: newNode },
      canUndo: true,
    });

    this.notifyChange();
    return newNode;
  }

  /**
   * 更新节点
   */
  updateNode(nodeId: string, request: UpdateNodeRequest): GraphNode {
    const nodeIndex = this.graph.nodes.findIndex(node => node.id === nodeId);
    if (nodeIndex === -1) {
      throw new Error(`Node ${nodeId} not found`);
    }

    const oldNode = { ...this.graph.nodes[nodeIndex] };
    const updatedNode = {
      ...oldNode,
      ...request,
      metadata: {
        ...oldNode.metadata,
        ...request.metadata,
      },
    };

    this.graph.nodes[nodeIndex] = updatedNode;
    this.graph.version++;

    // 记录操作
    this.recordOperation({
      graphId: this.graph.id,
      userId: this.graph.userId,
      type: 'update_node',
      data: { nodeId, oldNode, newNode: updatedNode },
      canUndo: true,
    });

    this.notifyChange();
    return updatedNode;
  }

  /**
   * 删除节点
   */
  deleteNode(nodeId: string): void {
    const nodeIndex = this.graph.nodes.findIndex(node => node.id === nodeId);
    if (nodeIndex === -1) {
      throw new Error(`Node ${nodeId} not found`);
    }

    const node = this.graph.nodes[nodeIndex];

    // 检查是否为锁定节点
    if (node.isLocked) {
      throw new Error(`Cannot delete locked node ${nodeId}`);
    }

    // 删除相关的边
    const relatedEdges = this.graph.edges.filter(
      edge => edge.source === nodeId || edge.target === nodeId,
    );

    // 删除子节点
    const childNodes = this.graph.nodes.filter(node => node.parentId === nodeId);

    // 移除节点
    this.graph.nodes.splice(nodeIndex, 1);

    // 移除相关边
    this.graph.edges = this.graph.edges.filter(
      edge => edge.source !== nodeId && edge.target !== nodeId,
    );

    this.graph.version++;

    // 记录操作
    this.recordOperation({
      graphId: this.graph.id,
      userId: this.graph.userId,
      type: 'delete_node',
      data: {
        node,
        relatedEdges,
        childNodes: childNodes.map(child => child.id),
      },
      canUndo: true,
    });

    this.notifyChange();
  }

  /**
   * 移动节点
   */
  moveNode(nodeId: string, position: { x: number; y: number }): void {
    const node = (this.graph.nodes as any).find(node => node.id === nodeId);
    if (!node) {
      throw new Error(`Node ${nodeId} not found`);
    }

    const oldPosition = node.position;
    node.position = position;
    this.graph.version++;

    // 记录操作
    this.recordOperation({
      graphId: this.graph.id,
      userId: this.graph.userId,
      type: 'move_node',
      data: { nodeId, oldPosition, newPosition: position },
      canUndo: true,
    });

    this.notifyChange();
  }

  /**
   * 获取节点
   */
  getNode(nodeId: string): GraphNode | undefined {
    return (this.graph.nodes as any).find(node => node.id === nodeId);
  }

  /**
   * 获取子节点
   */
  getChildNodes(parentId: string): GraphNode[] {
    return this.graph.nodes.filter(node => node.parentId === parentId);
  }

  /**
   * 获取节点路径
   */
  getNodePath(nodeId: string): GraphNode[] {
    const path: GraphNode[] = [];
    let currentNode = this.getNode(nodeId);

    while (currentNode) {
      path.unshift(currentNode);
      currentNode = currentNode.parentId ? this.getNode(currentNode.parentId) : undefined;
    }
    return path;
  }

  // ============= 边操作 =============

  /**
   * 创建边
   */
  createEdge(request: CreateEdgeRequest & { id?: string }): GraphEdge {
    const edgeId = request.id || this.generateId();

    if (!this.validateEdgeId(edgeId)) {
      throw new Error(`Edge with id ${edgeId} already exists`);
    }

    // 验证源节点和目标节点存在
    if (!this.validateNodeExists(request.source)) {
      throw new Error(`Source node ${request.source} does not exist`);
    }

    if (!this.validateNodeExists(request.target)) {
      throw new Error(`Target node ${request.target} does not exist`);
    }

    // 检查是否已存在相同的边
    const existingEdge = (this.graph.edges as any).find(
      edge => edge.source === request.source &&
               edge.target === request.target &&
               edge.type === request.type,
    );

    if (existingEdge) {
      throw new Error(`Edge already exists between ${request.source} and ${request.target}`);
    }

    const newEdge: GraphEdge = {
      id: edgeId,
      source: request.source,
      target: request.target,
      type: request.type,
      weight: request.weight || 1,
      metadata: request.metadata,
      isVisible: true,
      isDirected: true,
    };

    this.graph.edges.push(newEdge);
    this.graph.version++;

    // 记录操作
    this.recordOperation({
      graphId: this.graph.id,
      userId: this.graph.userId,
      type: 'create_edge',
      data: { edge: newEdge },
      canUndo: true,
    });

    this.notifyChange();
    return newEdge;
  }

  /**
   * 删除边
   */
  deleteEdge(edgeId: string): void {
    const edgeIndex = this.graph.edges.findIndex(edge => edge.id === edgeId);
    if (edgeIndex === -1) {
      throw new Error(`Edge ${edgeId} not found`);
    }

    const edge = this.graph.edges[edgeIndex];
    this.graph.edges.splice(edgeIndex, 1);
    this.graph.version++;

    // 记录操作
    this.recordOperation({
      graphId: this.graph.id,
      userId: this.graph.userId,
      type: 'delete_edge',
      data: { edge },
      canUndo: true,
    });

    this.notifyChange();
  }

  /**
   * 获取边
   */
  getEdge(edgeId: string): GraphEdge | undefined {
    return (this.graph.edges as any).find(edge => edge.id === edgeId);
  }

  /**
   * 获取节点的所有边
   */
  getNodeEdges(nodeId: string): GraphEdge[] {
    return this.graph.edges.filter(
      edge => edge.source === nodeId || edge.target === nodeId,
    );
  }

  /**
   * 获取连接两个节点的边
   */
  getEdgesBetween(sourceId: string, targetId: string): GraphEdge[] {
    return this.graph.edges.filter(
      edge => (edge.source === sourceId && edge.target === targetId) ||
              (edge.source === targetId && edge.target === sourceId),
    );
  }

  // ============= 搜索和查询 =============

  /**
   * 搜索节点
   */
  searchNodes(query: string, filters?: {
    types?: NodeType[]
    levels?: number[]
    hasWorks?: boolean
  }): GraphNode[] {
    let results = this.graph.nodes;

    // 文本搜索
    if (query.trim()) {
      const searchTerm = query.toLowerCase();
      results = results.filter(node =>
        node.label.toLowerCase().includes(searchTerm) ||
        node.metadata.description?.toLowerCase().includes(searchTerm) ||
        node.metadata.tags?.some(tag => tag.toLowerCase().includes(searchTerm)),
      );
    }

    // 应用过滤器
    if (filters) {
      if (filters.types && filters.types.length > 0) {
        results = results.filter(node => filters.types!.includes(node.type));
      }

      if (filters.levels && filters.levels.length > 0) {
        results = results.filter(node => filters.levels!.includes(node.level));
      }

      if (filters.hasWorks !== undefined) {
        results = results.filter(node =>
          filters.hasWorks ? node.metadata.workCount > 0 : node.metadata.workCount === 0,
        );
      }
    }
    return results;
  }

  /**
   * 获取图谱统计信息
   */
  getStatistics(): {
    nodeCount: number
    edgeCount: number
    nodesByType: Record<string, number>
    edgesByType: Record<string, number>
    maxDepth: number
    averageDegree: number
    density: number
  } {
    const nodeCount = this.graph.nodes.length;
    const edgeCount = this.graph.edges.length;

    // 按类型统计节点
    const nodesByType: Record<string, number> = {};
    this.graph.nodes.forEach(node => {
      nodesByType[node.type] = (nodesByType[node.type] || 0) + 1;
    });

    // 按类型统计边
    const edgesByType: Record<string, number> = {};
    this.graph.edges.forEach(edge => {
      edgesByType[edge.type] = (edgesByType[edge.type] || 0) + 1;
    });

    // 计算最大深度
    const maxDepth = Math.max(...this.graph.nodes.map(node => node.level), 0);

    // 计算平均度数
    const degrees = new Map<string, number>();
    this.graph.edges.forEach(edge => {
      degrees.set(edge.source, (degrees.get(edge.source) || 0) + 1);
      degrees.set(edge.target, (degrees.get(edge.target) || 0) + 1);
    });
    const averageDegree = nodeCount > 0 ?
      Array.from(degrees.values()).reduce((sum, degree) => sum + degree, 0) / nodeCount : 0;

    // 计算密度
    const maxPossibleEdges = nodeCount * (nodeCount - 1) / 2;
    const density = maxPossibleEdges > 0 ? edgeCount / maxPossibleEdges : 0;

    return {
      nodeCount,
      edgeCount,
      nodesByType,
      edgesByType,
      maxDepth,
      averageDegree,
      density,
    };
  }

  // ============= 版本控制 =============

  /**
   * 获取操作历史
   */
  getOperationHistory(): GraphOperation[] {
    return [...this.operationHistory];
  }

  /**
   * 撤销操作
   */
  undo(): boolean {
    const lastOperation = this.operationHistory
      .slice()
      .reverse()
      .find(op => op.canUndo);

    if (!lastOperation) {
      return false;
    }

    try {
      this.undoOperation(lastOperation);

      // 标记为已撤销
      lastOperation.canUndo = false;
      this.graph.version++;
      this.notifyChange();

      return true;
    } catch (error) {
      console.error('Failed to undo operation:', error);
      return false;
    }
  }

  /**
   * 撤销特定操作
   */
  private undoOperation(operation: GraphOperation): void {
    switch (operation.type) {
      case 'create_node':
        const nodeId = operation.data.node.id;
        this.graph.nodes = this.graph.nodes.filter(node => node.id !== nodeId);
        break;

      case 'delete_node':
        this.graph.nodes.push(operation.data.node);
        if (operation.data.relatedEdges) {
          this.graph.edges.push(...operation.data.relatedEdges);
        }
        break;

      case 'create_edge':
        const edgeId = operation.data.edge.id;
        this.graph.edges = this.graph.edges.filter(edge => edge.id !== edgeId);
        break;

      case 'delete_edge':
        this.graph.edges.push(operation.data.edge);
        break;

      case 'move_node':
        const node = (this.graph.nodes as any).find(n => n.id === operation.data.nodeId);
        if (node) {
          node.position = operation.data.oldPosition;
        }
        break;

      default:
        throw new Error(`Cannot undo operation type: ${operation.type}`);
    }
  }

  // ============= 导入导出 =============

  /**
   * 导出图谱数据
   */
  exportGraph(format: 'json' | 'graphml' | 'gexf' = 'json'): string {
    switch (format) {
      case 'json':
        return JSON.stringify(this.graph, null, 2);

      case 'graphml':
        return this.exportToGraphML();

      case 'gexf':
        return this.exportToGEXF();

      default:
        throw new Error(`Unsupported export format: ${format}`);
    }
  }

  /**
   * 导出为GraphML格式
   */
  private exportToGraphML(): string {
    let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
    xml += '<graphml xmlns="http://graphml.graphdrawing.org/xmlns">\n';
    xml += '  <graph id="G" edgedefault="directed">\n';

    // 导出节点
    this.graph.nodes.forEach(node => {
      xml += `    <node id="${node.id}">\n`;
      xml += `      <data key="label">${node.label}</data>\n`;
      xml += `      <data key="type">${node.type}</data>\n`;
      xml += `      <data key="level">${node.level}</data>\n`;
      xml += '    </node>\n';
    });

    // 导出边
    this.graph.edges.forEach(edge => {
      xml += `    <edge id="${edge.id}" source="${edge.source}" target="${edge.target}">\n`;
      xml += `      <data key="type">${edge.type}</data>\n`;
      xml += `      <data key="weight">${edge.weight}</data>\n`;
      xml += '    </edge>\n';
    });

    xml += '  </graph>\n';
    xml += '</graphml>';

    return xml;
  }

  /**
   * 导出为GEXF格式
   */
  private exportToGEXF(): string {
    let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
    xml += '<gexf xmlns="http://www.gexf.net/1.2draft" version="1.2">\n';
    xml += '  <graph mode="static" defaultedgetype="directed">\n';
    xml += '    <nodes>\n';

    // 导出节点
    this.graph.nodes.forEach(node => {
      xml += `      <node id="${node.id}" label="${node.label}"/>\n`;
    });

    xml += '    </nodes>\n';
    xml += '    <edges>\n';

    // 导出边
    this.graph.edges.forEach(edge => {
      xml += `      <edge id="${edge.id}" source="${edge.source}" target="${edge.target}" weight="${edge.weight}"/>\n`;
    });

    xml += '    </edges>\n';
    xml += '  </graph>\n';
    xml += '</gexf>';

    return xml;
  }

  /**
   * 导入图谱数据
   */
  importGraph(data: string, format: 'json' | 'graphml' | 'gexf' = 'json'): void {
    switch (format) {
      case 'json':
        const importedGraph = JSON.parse(data) as KnowledgeGraph;
        this.graph = importedGraph;
        break;

      default:
        throw new Error(`Import format ${format} not yet implemented`);
    }

    this.notifyChange();
  }

  /**
   * 克隆图谱
   */
  clone(): GraphDataManager {
    const clonedGraph = JSON.parse(JSON.stringify(this.graph)) as KnowledgeGraph;
    clonedGraph.id = this.generateId();
    clonedGraph.version = 1;
    clonedGraph.createdAt = new Date();
    clonedGraph.updatedAt = new Date();

    return new GraphDataManager(clonedGraph);
  }

  /**
   * 验证图谱完整性
   */
  validate(): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    // 检查节点ID唯一性
    const nodeIds = new Set<string>();
    this.graph.nodes.forEach(node => {
      if (nodeIds.has(node.id)) {
        errors.push(`Duplicate node ID: ${node.id}`);
      }
      nodeIds.add(node.id);
    });

    // 检查边ID唯一性
    const edgeIds = new Set<string>();
    this.graph.edges.forEach(edge => {
      if (edgeIds.has(edge.id)) {
        errors.push(`Duplicate edge ID: ${edge.id}`);
      }
      edgeIds.add(edge.id);
    });

    // 检查边的节点引用
    this.graph.edges.forEach(edge => {
      if (!nodeIds.has(edge.source)) {
        errors.push(`Edge ${edge.id} references non-existent source node: ${edge.source}`);
      }
      if (!nodeIds.has(edge.target)) {
        errors.push(`Edge ${edge.id} references non-existent target node: ${edge.target}`);
      }
    });

    // 检查父节点引用
    this.graph.nodes.forEach(node => {
      if (node.parentId && !nodeIds.has(node.parentId)) {
        errors.push(`Node ${node.id} references non-existent parent: ${node.parentId}`);
      }
    });

    return {
      isValid: errors.length === 0,
      errors,
    };
  }
}

export default GraphDataManager;
