/**
 * 数据验证工具函数
 * 提供各种数据验证功能
 */

import { GraphNode, GraphEdge } from '@/types/knowledgeGraph';
import { VALIDATION_RULES } from '@/lib/config/knowledgeGraph';

/**
 * 验证图谱结构
 */
export function validateGraphStructure(nodes: GraphNode[], edges: GraphEdge[]): void {
  // 检查节点ID唯一性
  const nodeIds = new Set<string>();
  for (const node of nodes) {
    if (nodeIds.has(node.id)) {
      throw new Error(`重复的节点ID: ${node.id}`);
    }
    nodeIds.add(node.id);
  }

  // 检查边的源节点和目标节点是否存在
  for (const edge of edges) {
    if (!nodeIds.has(edge.source)) {
      throw new Error(`边的源节点不存在: ${edge.source}`);
    }
    if (!nodeIds.has(edge.target)) {
      throw new Error(`边的目标节点不存在: ${edge.target}`);
    }
  }

  // 检查是否存在循环依赖（针对prerequisite类型的边）
  const prerequisiteEdges = edges.filter(e => e.type === 'prerequisite');
  if (hasCircularDependency(nodes, prerequisiteEdges)) {
    throw new Error('检测到循环依赖关系');
  }
}

/**
 * 验证节点数据
 */
export function validateNodeData(node: Partial<GraphNode>): void {
  // 验证标签
  if (!node.label || typeof node.label !== 'string') {
    throw new Error('节点标签不能为空');
  }

  if (node.label.length < VALIDATION_RULES.NODE_LABEL.MIN_LENGTH ||
      node.label.length > VALIDATION_RULES.NODE_LABEL.MAX_LENGTH) {
    throw new Error(`节点标签长度必须在${VALIDATION_RULES.NODE_LABEL.MIN_LENGTH}-${VALIDATION_RULES.NODE_LABEL.MAX_LENGTH}之间`);
  }

  if (!VALIDATION_RULES.NODE_LABEL.PATTERN.test(node.label)) {
    throw new Error('节点标签包含无效字符');
  }

  // 验证层级
  if (typeof node.level !== 'number' || node.level < 0) {
    throw new Error('节点层级必须是非负整数');
  }

  // 验证元数据
  if (node.metadata) {
    if (node.metadata.description && 
        node.metadata.description.length > VALIDATION_RULES.DESCRIPTION.MAX_LENGTH) {
      throw new Error(`节点描述长度不能超过${VALIDATION_RULES.DESCRIPTION.MAX_LENGTH}字符`);
    }

    if (node.metadata.difficulty && 
        (node.metadata.difficulty < 1 || node.metadata.difficulty > 5)) {
      throw new Error('节点难度必须在1-5之间');
    }

    if (node.metadata.importance && 
        (node.metadata.importance < 0 || node.metadata.importance > 1)) {
      throw new Error('节点重要性必须在0-1之间');
    }

    if (node.metadata.tags) {
      if (node.metadata.tags.length > VALIDATION_RULES.TAGS.MAX_COUNT) {
        throw new Error(`标签数量不能超过${VALIDATION_RULES.TAGS.MAX_COUNT}个`);
      }

      for (const tag of node.metadata.tags) {
        if (tag.length > VALIDATION_RULES.TAGS.MAX_LENGTH) {
          throw new Error(`标签长度不能超过${VALIDATION_RULES.TAGS.MAX_LENGTH}字符`);
        }
      }
    }

    if (node.metadata.estimatedTime && node.metadata.estimatedTime < 0) {
      throw new Error('预计学习时间不能为负数');
    }
  }
}

/**
 * 验证边数据
 */
export function validateEdgeData(edge: Partial<GraphEdge>): void {
  // 验证源节点和目标节点
  if (!edge.source || typeof edge.source !== 'string') {
    throw new Error('边的源节点ID不能为空');
  }

  if (!edge.target || typeof edge.target !== 'string') {
    throw new Error('边的目标节点ID不能为空');
  }

  if (edge.source === edge.target) {
    throw new Error('边的源节点和目标节点不能相同');
  }

  // 验证权重
  if (typeof edge.weight !== 'number' || edge.weight < 0) {
    throw new Error('边的权重必须是非负数');
  }

  // 验证元数据
  if (edge.metadata) {
    if (edge.metadata.strength && 
        (edge.metadata.strength < 0 || edge.metadata.strength > 1)) {
      throw new Error('边的强度必须在0-1之间');
    }

    if (edge.metadata.description && 
        edge.metadata.description.length > 200) {
      throw new Error('边的描述长度不能超过200字符');
    }
  }
}

/**
 * 检查循环依赖
 */
function hasCircularDependency(nodes: GraphNode[], edges: GraphEdge[]): boolean {
  // 构建邻接表
  const adjacencyList = new Map<string, string[]>();
  
  nodes.forEach(node => {
    adjacencyList.set(node.id, []);
  });

  edges.forEach(edge => {
    const sourceList = adjacencyList.get(edge.source);
    if (sourceList) {
      sourceList.push(edge.target);
    }
  });

  // 使用DFS检测循环
  const visited = new Set<string>();
  const recursionStack = new Set<string>();

  function dfs(nodeId: string): boolean {
    visited.add(nodeId);
    recursionStack.add(nodeId);

    const neighbors = adjacencyList.get(nodeId) || [];
    for (const neighborId of neighbors) {
      if (!visited.has(neighborId)) {
        if (dfs(neighborId)) {
          return true;
        }
      } else if (recursionStack.has(neighborId)) {
        return true; // 发现循环
      }
    }

    recursionStack.delete(nodeId);
    return false;
  }

  // 检查所有未访问的节点
  for (const node of nodes) {
    if (!visited.has(node.id)) {
      if (dfs(node.id)) {
        return true;
      }
    }
  }

  return false;
}

/**
 * 验证图谱名称
 */
export function validateGraphName(name: string): void {
  if (!name || typeof name !== 'string') {
    throw new Error('图谱名称不能为空');
  }

  const trimmedName = name.trim();
  if (trimmedName.length < VALIDATION_RULES.GRAPH_NAME.MIN_LENGTH ||
      trimmedName.length > VALIDATION_RULES.GRAPH_NAME.MAX_LENGTH) {
    throw new Error(`图谱名称长度必须在${VALIDATION_RULES.GRAPH_NAME.MIN_LENGTH}-${VALIDATION_RULES.GRAPH_NAME.MAX_LENGTH}之间`);
  }

  if (!VALIDATION_RULES.GRAPH_NAME.PATTERN.test(trimmedName)) {
    throw new Error('图谱名称包含无效字符');
  }
}

/**
 * 验证搜索查询
 */
export function validateSearchQuery(query: string): void {
  if (query && query.length < 2) {
    throw new Error('搜索关键词至少需要2个字符');
  }
}

/**
 * 验证分页参数
 */
export function validatePaginationParams(page?: number, limit?: number): {
  page: number;
  limit: number;
} {
  const validatedPage = Math.max(1, Math.floor(page || 1));
  const validatedLimit = Math.min(100, Math.max(1, Math.floor(limit || 20)));

  return {
    page: validatedPage,
    limit: validatedLimit
  };
}

/**
 * 验证颜色值
 */
export function validateColor(color: string): boolean {
  const colorRegex = /^#[0-9A-Fa-f]{6}$/;
  return colorRegex.test(color);
}

/**
 * 验证URL
 */
export function validateUrl(url: string): boolean {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

/**
 * 清理和验证标签
 */
export function validateAndCleanTags(tags: string[]): string[] {
  if (!Array.isArray(tags)) {
    return [];
  }

  const cleanedTags = tags
    .map(tag => tag.trim())
    .filter(tag => tag.length > 0 && tag.length <= VALIDATION_RULES.TAGS.MAX_LENGTH)
    .slice(0, VALIDATION_RULES.TAGS.MAX_COUNT);

  // 去重
  return [...new Set(cleanedTags)];
}

export default {
  validateGraphStructure,
  validateNodeData,
  validateEdgeData,
  validateGraphName,
  validateSearchQuery,
  validatePaginationParams,
  validateColor,
  validateUrl,
  validateAndCleanTags
};