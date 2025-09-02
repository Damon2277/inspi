/**
 * 知识图谱系统配置
 */

import { 
  GraphTemplate, 
  GraphLayout, 
  NodeType, 
  EdgeType, 
  LayoutConfig, 
  ViewConfig,
  GraphNode,
  GraphEdge
} from '@/types/knowledgeGraph';

// 默认布局配置
export const DEFAULT_LAYOUT_CONFIG: LayoutConfig = {
  type: GraphLayout.FORCE,
  options: {
    nodeSpacing: 100,
    levelSpacing: 150,
    centerForce: 0.1,
    linkDistance: 80,
    linkStrength: 0.5,
    chargeStrength: -300,
    collisionRadius: 30,
    alpha: 0.3,
    alphaDecay: 0.02,
    velocityDecay: 0.4
  }
};

// 默认视图配置
export const DEFAULT_VIEW_CONFIG: ViewConfig = {
  showLabels: true,
  showEdgeLabels: false,
  nodeSize: 'proportional',
  edgeWidth: 'fixed',
  colorScheme: 'default',
  theme: 'light',
  animations: true,
  minimap: true,
  toolbar: true
};

// 节点类型配置
export const NODE_TYPE_CONFIG = {
  [NodeType.SUBJECT]: {
    color: '#1f2937',
    size: 60,
    icon: '📚',
    maxChildren: 20
  },
  [NodeType.CHAPTER]: {
    color: '#3b82f6',
    size: 45,
    icon: '📖',
    maxChildren: 15
  },
  [NodeType.TOPIC]: {
    color: '#10b981',
    size: 35,
    icon: '📝',
    maxChildren: 10
  },
  [NodeType.CONCEPT]: {
    color: '#f59e0b',
    size: 25,
    icon: '💡',
    maxChildren: 5
  },
  [NodeType.SKILL]: {
    color: '#ef4444',
    size: 30,
    icon: '🎯',
    maxChildren: 8
  }
};

// 边类型配置
export const EDGE_TYPE_CONFIG = {
  [EdgeType.CONTAINS]: {
    color: '#6b7280',
    style: 'solid' as const,
    weight: 1.0,
    description: '包含关系'
  },
  [EdgeType.PREREQUISITE]: {
    color: '#dc2626',
    style: 'dashed' as const,
    weight: 0.8,
    description: '前置关系'
  },
  [EdgeType.RELATED]: {
    color: '#059669',
    style: 'dotted' as const,
    weight: 0.6,
    description: '相关关系'
  },
  [EdgeType.EXTENDS]: {
    color: '#7c3aed',
    style: 'solid' as const,
    weight: 0.7,
    description: '扩展关系'
  },
  [EdgeType.APPLIES]: {
    color: '#ea580c',
    style: 'solid' as const,
    weight: 0.9,
    description: '应用关系'
  }
};

// 学科分类配置
export const SUBJECT_CONFIG = {
  mathematics: {
    name: '数学',
    color: '#3b82f6',
    icon: '🔢',
    description: '数学学科知识图谱'
  },
  chinese: {
    name: '语文',
    color: '#dc2626',
    icon: '📝',
    description: '语文学科知识图谱'
  },
  english: {
    name: '英语',
    color: '#059669',
    icon: '🌍',
    description: '英语学科知识图谱'
  },
  physics: {
    name: '物理',
    color: '#7c3aed',
    icon: '⚛️',
    description: '物理学科知识图谱'
  },
  chemistry: {
    name: '化学',
    color: '#ea580c',
    icon: '🧪',
    description: '化学学科知识图谱'
  },
  biology: {
    name: '生物',
    color: '#10b981',
    icon: '🌱',
    description: '生物学科知识图谱'
  },
  history: {
    name: '历史',
    color: '#92400e',
    icon: '📜',
    description: '历史学科知识图谱'
  },
  geography: {
    name: '地理',
    color: '#0891b2',
    icon: '🌏',
    description: '地理学科知识图谱'
  }
};

// 学段配置
export const GRADE_LEVEL_CONFIG = {
  elementary: {
    name: '小学',
    range: '1-6年级',
    description: '小学阶段知识图谱'
  },
  middle: {
    name: '初中',
    range: '7-9年级',
    description: '初中阶段知识图谱'
  },
  high: {
    name: '高中',
    range: '10-12年级',
    description: '高中阶段知识图谱'
  }
};

// 数学学科预设模板
export const MATH_TEMPLATE: Omit<GraphTemplate, 'id' | 'createdAt' | 'updatedAt'> = {
  name: '数学知识图谱',
  description: '基于教学大纲的数学学科知识结构',
  subject: 'mathematics',
  category: 'official',
  nodes: [
    {
      id: 'math',
      label: '数学',
      type: NodeType.SUBJECT,
      level: 0,
      position: { x: 0, y: 0 },
      isVisible: true,
      isLocked: true
    },
    {
      id: 'algebra',
      label: '代数',
      type: NodeType.CHAPTER,
      level: 1,
      parentId: 'math',
      position: { x: -200, y: 150 },
      isVisible: true,
      isLocked: true
    },
    {
      id: 'geometry',
      label: '几何',
      type: NodeType.CHAPTER,
      level: 1,
      parentId: 'math',
      position: { x: 200, y: 150 },
      isVisible: true,
      isLocked: true
    },
    {
      id: 'statistics',
      label: '统计与概率',
      type: NodeType.CHAPTER,
      level: 1,
      parentId: 'math',
      position: { x: 0, y: 300 },
      isVisible: true,
      isLocked: true
    },
    {
      id: 'linear-equations',
      label: '线性方程',
      type: NodeType.TOPIC,
      level: 2,
      parentId: 'algebra',
      position: { x: -300, y: 250 },
      isVisible: true,
      isLocked: true
    },
    {
      id: 'quadratic-equations',
      label: '二次方程',
      type: NodeType.TOPIC,
      level: 2,
      parentId: 'algebra',
      position: { x: -100, y: 250 },
      isVisible: true,
      isLocked: true
    },
    {
      id: 'plane-geometry',
      label: '平面几何',
      type: NodeType.TOPIC,
      level: 2,
      parentId: 'geometry',
      position: { x: 100, y: 250 },
      isVisible: true,
      isLocked: true
    },
    {
      id: 'solid-geometry',
      label: '立体几何',
      type: NodeType.TOPIC,
      level: 2,
      parentId: 'geometry',
      position: { x: 300, y: 250 },
      isVisible: true,
      isLocked: true
    }
  ],
  edges: [
    {
      id: 'math-algebra',
      source: 'math',
      target: 'algebra',
      type: EdgeType.CONTAINS,
      weight: 1.0,
      metadata: {
        strength: 1.0,
        color: '#6b7280'
      },
      isVisible: true,
      isDirected: true
    },
    {
      id: 'math-geometry',
      source: 'math',
      target: 'geometry',
      type: EdgeType.CONTAINS,
      weight: 1.0,
      metadata: {
        strength: 1.0,
        color: '#6b7280'
      },
      isVisible: true,
      isDirected: true
    },
    {
      id: 'math-statistics',
      source: 'math',
      target: 'statistics',
      type: EdgeType.CONTAINS,
      weight: 1.0,
      metadata: {
        strength: 1.0,
        color: '#6b7280'
      },
      isVisible: true,
      isDirected: true
    },
    {
      id: 'algebra-linear',
      source: 'algebra',
      target: 'linear-equations',
      type: EdgeType.CONTAINS,
      weight: 1.0,
      metadata: {
        strength: 1.0,
        color: '#6b7280'
      },
      isVisible: true,
      isDirected: true
    },
    {
      id: 'algebra-quadratic',
      source: 'algebra',
      target: 'quadratic-equations',
      type: EdgeType.CONTAINS,
      weight: 1.0,
      metadata: {
        strength: 1.0,
        color: '#6b7280'
      },
      isVisible: true,
      isDirected: true
    },
    {
      id: 'geometry-plane',
      source: 'geometry',
      target: 'plane-geometry',
      type: EdgeType.CONTAINS,
      weight: 1.0,
      metadata: {
        strength: 1.0,
        color: '#6b7280'
      },
      isVisible: true,
      isDirected: true
    },
    {
      id: 'geometry-solid',
      source: 'geometry',
      target: 'solid-geometry',
      type: EdgeType.CONTAINS,
      weight: 1.0,
      metadata: {
        strength: 1.0,
        color: '#6b7280'
      },
      isVisible: true,
      isDirected: true
    },
    {
      id: 'linear-quadratic',
      source: 'linear-equations',
      target: 'quadratic-equations',
      type: EdgeType.PREREQUISITE,
      weight: 0.8,
      metadata: {
        strength: 0.8,
        color: '#dc2626',
        style: 'dashed'
      },
      isVisible: true,
      isDirected: true
    },
    {
      id: 'plane-solid',
      source: 'plane-geometry',
      target: 'solid-geometry',
      type: EdgeType.PREREQUISITE,
      weight: 0.9,
      metadata: {
        strength: 0.9,
        color: '#dc2626',
        style: 'dashed'
      },
      isVisible: true,
      isDirected: true
    }
  ],
  layout: DEFAULT_LAYOUT_CONFIG,
  view: DEFAULT_VIEW_CONFIG,
  isOfficial: true,
  usageCount: 0,
  rating: 5.0,
  tags: ['数学', '基础', '官方']
};

// 语文学科预设模板
export const CHINESE_TEMPLATE: Omit<GraphTemplate, 'id' | 'createdAt' | 'updatedAt'> = {
  name: '语文知识图谱',
  description: '基于教学大纲的语文学科知识结构',
  subject: 'chinese',
  category: 'official',
  nodes: [
    {
      id: 'chinese',
      label: '语文',
      type: NodeType.SUBJECT,
      level: 0,
      position: { x: 0, y: 0 },
      isVisible: true,
      isLocked: true
    },
    {
      id: 'literature',
      label: '文学',
      type: NodeType.CHAPTER,
      level: 1,
      parentId: 'chinese',
      position: { x: -200, y: 150 },
      isVisible: true,
      isLocked: true
    },
    {
      id: 'writing',
      label: '写作',
      type: NodeType.CHAPTER,
      level: 1,
      parentId: 'chinese',
      position: { x: 200, y: 150 },
      isVisible: true,
      isLocked: true
    },
    {
      id: 'grammar',
      label: '语法',
      type: NodeType.CHAPTER,
      level: 1,
      parentId: 'chinese',
      position: { x: 0, y: 300 },
      isVisible: true,
      isLocked: true
    }
  ],
  edges: [
    {
      id: 'chinese-literature',
      source: 'chinese',
      target: 'literature',
      type: EdgeType.CONTAINS,
      weight: 1.0,
      metadata: {
        strength: 1.0,
        color: '#6b7280'
      },
      isVisible: true,
      isDirected: true
    },
    {
      id: 'chinese-writing',
      source: 'chinese',
      target: 'writing',
      type: EdgeType.CONTAINS,
      weight: 1.0,
      metadata: {
        strength: 1.0,
        color: '#6b7280'
      },
      isVisible: true,
      isDirected: true
    },
    {
      id: 'chinese-grammar',
      source: 'chinese',
      target: 'grammar',
      type: EdgeType.CONTAINS,
      weight: 1.0,
      metadata: {
        strength: 1.0,
        color: '#6b7280'
      },
      isVisible: true,
      isDirected: true
    }
  ],
  layout: DEFAULT_LAYOUT_CONFIG,
  view: DEFAULT_VIEW_CONFIG,
  isOfficial: true,
  usageCount: 0,
  rating: 5.0,
  tags: ['语文', '基础', '官方']
};

// 预设模板列表
export const PRESET_TEMPLATES = [
  MATH_TEMPLATE,
  CHINESE_TEMPLATE
];

// 图谱限制配置
export const GRAPH_LIMITS = {
  MAX_NODES_PER_GRAPH: 500,
  MAX_EDGES_PER_GRAPH: 1000,
  MAX_GRAPHS_PER_USER: 50,
  MAX_CUSTOM_TEMPLATES: 10,
  MAX_WORKS_PER_NODE: 100,
  MAX_NODE_LABEL_LENGTH: 50,
  MAX_GRAPH_NAME_LENGTH: 100,
  MAX_DESCRIPTION_LENGTH: 500
};

// 缓存配置
export const GRAPH_CACHE_CONFIG = {
  KEYS: {
    GRAPH_DETAIL: (graphId: string) => `graph:${graphId}`,
    USER_GRAPHS: (userId: string) => `user_graphs:${userId}`,
    NODE_STATS: (nodeId: string) => `node_stats:${nodeId}`,
    GRAPH_STATS: (graphId: string) => `graph_stats:${graphId}`,
    TEMPLATES: (subject: string) => `templates:${subject}`,
    GRAPH_ANALYSIS: (graphId: string) => `graph_analysis:${graphId}`,
    LEARNING_PATH: (fromId: string, toId: string) => `path:${fromId}:${toId}`
  },
  TTL: {
    GRAPH_DETAIL: 1800, // 30分钟
    USER_GRAPHS: 900,   // 15分钟
    NODE_STATS: 3600,   // 1小时
    GRAPH_STATS: 3600,  // 1小时
    TEMPLATES: 86400,   // 24小时
    GRAPH_ANALYSIS: 7200, // 2小时
    LEARNING_PATH: 3600   // 1小时
  }
};

// 算法配置
export const ALGORITHM_CONFIG = {
  // 中心性计算配置
  CENTRALITY: {
    MAX_ITERATIONS: 100,
    TOLERANCE: 1e-6,
    DAMPING_FACTOR: 0.85
  },
  // 社区发现配置
  COMMUNITY_DETECTION: {
    RESOLUTION: 1.0,
    MAX_ITERATIONS: 50,
    MIN_COMMUNITY_SIZE: 3
  },
  // 路径查找配置
  PATH_FINDING: {
    MAX_PATH_LENGTH: 10,
    MAX_PATHS: 5,
    WEIGHT_THRESHOLD: 0.1
  },
  // 推荐系统配置
  RECOMMENDATION: {
    MAX_RECOMMENDATIONS: 10,
    MIN_CONFIDENCE: 0.3,
    DIVERSITY_FACTOR: 0.2
  }
};

// 验证规则
export const VALIDATION_RULES = {
  NODE_LABEL: {
    MIN_LENGTH: 1,
    MAX_LENGTH: 50,
    PATTERN: /^[\u4e00-\u9fa5a-zA-Z0-9\s\-_()（）]+$/
  },
  GRAPH_NAME: {
    MIN_LENGTH: 1,
    MAX_LENGTH: 100,
    PATTERN: /^[\u4e00-\u9fa5a-zA-Z0-9\s\-_()（）]+$/
  },
  DESCRIPTION: {
    MAX_LENGTH: 500
  },
  POSITION: {
    MIN_X: -10000,
    MAX_X: 10000,
    MIN_Y: -10000,
    MAX_Y: 10000
  }
};

// 错误消息
export const ERROR_MESSAGES = {
  GRAPH_NOT_FOUND: '知识图谱不存在',
  NODE_NOT_FOUND: '节点不存在',
  EDGE_NOT_FOUND: '边不存在',
  TEMPLATE_NOT_FOUND: '模板不存在',
  INVALID_GRAPH_TYPE: '无效的图谱类型',
  INVALID_NODE_TYPE: '无效的节点类型',
  INVALID_EDGE_TYPE: '无效的边类型',
  DUPLICATE_NODE_ID: '节点ID已存在',
  DUPLICATE_EDGE_ID: '边ID已存在',
  CIRCULAR_DEPENDENCY: '检测到循环依赖',
  MAX_NODES_EXCEEDED: '节点数量超出限制',
  MAX_EDGES_EXCEEDED: '边数量超出限制',
  INVALID_NODE_LABEL: '节点标签格式无效',
  INVALID_GRAPH_NAME: '图谱名称格式无效',
  PERMISSION_DENIED: '权限不足',
  TEMPLATE_IN_USE: '模板正在使用中，无法删除'
};

// 成功消息
export const SUCCESS_MESSAGES = {
  GRAPH_CREATED: '知识图谱创建成功',
  GRAPH_UPDATED: '知识图谱更新成功',
  GRAPH_DELETED: '知识图谱删除成功',
  NODE_CREATED: '节点创建成功',
  NODE_UPDATED: '节点更新成功',
  NODE_DELETED: '节点删除成功',
  EDGE_CREATED: '边创建成功',
  EDGE_DELETED: '边删除成功',
  WORK_MOUNTED: '作品挂载成功',
  WORK_UNMOUNTED: '作品取消挂载成功',
  TEMPLATE_APPLIED: '模板应用成功'
};