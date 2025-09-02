/**
 * 知识图谱验证工具
 * 提供图结构验证、数据完整性检查等功能
 */
import {
  GraphNode,
  GraphEdge,
  KnowledgeGraph,
  NodeType,
  EdgeType,
  SubjectCategory,
  EducationLevel
} from '@/types/knowledgeGraph';
import { GRAPH_LIMITS, VALIDATION_RULES } from '@/lib/config/knowledgeGraph';

// ============= 基础验证函数 =============

/**
 * 验证图结构的完整性
 */
export function validateGraphStructure(
  nodes: GraphNode[], 
  edges: GraphEdge[]
): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];

  // 验证节点
  const nodeValidation = validateNodes(nodes);
  if (!nodeValidation.isValid) {
    errors.push(...nodeValidation.errors);
  }

  // 验证边
  const edgeValidation = validateEdges(edges, nodes);
  if (!edgeValidation.isValid) {
    errors.push(...edgeValidation.errors);
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * 验证节点数据
 */
export function validateNodes(nodes: GraphNode[]): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];
  const nodeIds = new Set<string>();
  // 检查节点数量限制
  if (nodes.length > GRAPH_LIMITS.MAX_NODES_PER_GRAPH) {
    errors.push(`节点数量超过限制 (${GRAPH_LIMITS.MAX_NODES_PER_GRAPH})`);
  }

  for (const node of nodes) {
    // 检查必填字段
    if (!node.id) {
      errors.push('节点缺少ID');
      continue;
    }
    if (!node.label?.trim()) {
      errors.push(`节点 ${node.id} 缺少标签`);
    }
    if (!Object.values(NodeType).includes(node.type)) {
      errors.push(`节点 ${node.id} 类型无效: ${node.type}`);
    }

    // 检查ID唯一性
    if (nodeIds.has(node.id)) {
      errors.push(`节点ID重复: ${node.id}`);
    }
    nodeIds.add(node.id);

    // 验证层级
    if (typeof node.level !== 'number' || node.level < 0) {
      errors.push(`节点 ${node.id} 层级无效`);
    }
  }

  return { isValid: errors.length === 0, errors };
}

/**
 * 验证边数据
 */
export function validateEdges(
  edges: GraphEdge[], 
  nodes: GraphNode[]
): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];
  const edgeIds = new Set<string>();
  const nodeIds = new Set(nodes.map(n => n.id));

  // 检查边数量限制
  if (edges.length > GRAPH_LIMITS.MAX_EDGES_PER_GRAPH) {
    errors.push(`边数量超过限制 (${GRAPH_LIMITS.MAX_EDGES_PER_GRAPH})`);
  }

  for (const edge of edges) {
    // 检查必填字段
    if (!edge.id) {
      errors.push('边缺少ID');
      continue;
    }
    if (!edge.source) {
      errors.push(`边 ${edge.id} 缺少源节点`);
    }
    if (!edge.target) {
      errors.push(`边 ${edge.id} 缺少目标节点`);
    }
    if (!Object.values(EdgeType).includes(edge.type)) {
      errors.push(`边 ${edge.id} 类型无效: ${edge.type}`);
    }

    // 检查ID唯一性
    if (edgeIds.has(edge.id)) {
      errors.push(`边ID重复: ${edge.id}`);
    }
    edgeIds.add(edge.id);

    // 验证节点存在性
    if (edge.source && !nodeIds.has(edge.source)) {
      errors.push(`边 ${edge.id} 的源节点不存在: ${edge.source}`);
    }
    if (edge.target && !nodeIds.has(edge.target)) {
      errors.push(`边 ${edge.id} 的目标节点不存在: ${edge.target}`);
    }

    // 验证权重
    if (typeof edge.weight !== 'number' || edge.weight < 0) {
      errors.push(`边 ${edge.id} 权重无效`);
    }

    // 验证自环
    if (edge.source === edge.target) {
      errors.push(`边 ${edge.id} 不能连接到自身`);
    }
  }

  return { isValid: errors.length === 0, errors };
}

/**
 * 验证完整的知识图谱
 */
export function validateKnowledgeGraph(graph: KnowledgeGraph): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];

  // 验证基础信息
  if (!graph.name?.trim()) {
    errors.push('图谱名称不能为空');
  }
  if (graph.name && graph.name.length > VALIDATION_RULES.GRAPH_NAME.MAX_LENGTH) {
    errors.push('图谱名称过长');
  }

  if (graph.description && graph.description.length > VALIDATION_RULES.DESCRIPTION.MAX_LENGTH) {
    errors.push('图谱描述过长');
  }

  // 验证学科分类（简化验证）
  if (graph.subject && typeof graph.subject !== 'string') {
    errors.push('学科分类无效');
  }

  // 验证学段（简化验证）
  if (graph.gradeLevel && typeof graph.gradeLevel !== 'string') {
    errors.push('教育阶段无效');
  }

  // 验证图结构
  const structureValidation = validateGraphStructure(graph.nodes, graph.edges);
  if (!structureValidation.isValid) {
    errors.push(...structureValidation.errors);
  }

  // 验证布局配置
  if (!graph.layout) {
    errors.push('缺少布局配置');
  }

  // 验证版本号
  if (typeof graph.version !== 'number' || graph.version < 1) {
    errors.push('版本号无效');
  }

  // 验证公开状态
  if (typeof graph.isPublic !== 'boolean') {
    errors.push('公开状态无效');
  }

  return { isValid: errors.length === 0, errors };
}

// ============= 辅助函数 =============

/**
 * 检查图是否为空
 */
export function isEmptyGraph(graph: KnowledgeGraph): boolean {
  return graph.nodes.length === 0 && graph.edges.length === 0;
}

/**
 * 检查图是否过于复杂
 */
export function isGraphTooComplex(graph: KnowledgeGraph): boolean {
  return (
    graph.nodes.length > GRAPH_LIMITS.MAX_NODES_PER_GRAPH * 0.8 ||
    graph.edges.length > GRAPH_LIMITS.MAX_EDGES_PER_GRAPH * 0.8
  );
}

/**
 * 获取图的复杂度评分
 */
export function getGraphComplexityScore(graph: KnowledgeGraph): number {
  const nodeRatio = graph.nodes.length / GRAPH_LIMITS.MAX_NODES_PER_GRAPH;
  const edgeRatio = graph.edges.length / GRAPH_LIMITS.MAX_EDGES_PER_GRAPH;
  
  // 计算最大深度
  const maxDepth = graph.nodes.length > 0 ? Math.max(...graph.nodes.map(n => n.level)) : 0;
  const depthRatio = maxDepth / 10; // 假设最大深度为10
  
  return Math.min(1, (nodeRatio + edgeRatio + depthRatio) / 3);
}

/**
 * 简化版本的图结构验证（用于快速检查）
 */
export function quickValidateGraph(nodes: GraphNode[], edges: GraphEdge[]): boolean {
  // 快速检查基本约束
  if (nodes.length > GRAPH_LIMITS.MAX_NODES_PER_GRAPH) return false;
  if (edges.length > GRAPH_LIMITS.MAX_EDGES_PER_GRAPH) return false;

  // 检查节点ID唯一性
  const nodeIds = new Set(nodes.map(n => n.id));
  if (nodeIds.size !== nodes.length) return false;

  // 检查边的节点引用
  for (const edge of edges) {
    if (!nodeIds.has(edge.source) || !nodeIds.has(edge.target)) {
      return false;
    }
  }

  return true;
}

export default {
  validateGraphStructure,
  validateNodes,
  validateEdges,
  validateKnowledgeGraph,
  isEmptyGraph,
  isGraphTooComplex,
  getGraphComplexityScore,
  quickValidateGraph
};