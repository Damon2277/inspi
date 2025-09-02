/**
 * 知识图谱系统类型定义
 */

// 图节点类型枚举
export enum NodeType {
  SUBJECT = 'subject',      // 学科
  CHAPTER = 'chapter',      // 章节
  TOPIC = 'topic',          // 主题
  CONCEPT = 'concept',      // 概念
  SKILL = 'skill'           // 技能
}

// 图边类型枚举
export enum EdgeType {
  CONTAINS = 'contains',         // 包含关系
  PREREQUISITE = 'prerequisite', // 前置关系
  RELATED = 'related',           // 相关关系
  EXTENDS = 'extends',           // 扩展关系
  APPLIES = 'applies'            // 应用关系
}

// 图谱布局类型
export enum GraphLayout {
  FORCE = 'force',           // 力导向布局
  HIERARCHICAL = 'hierarchical', // 层次布局
  CIRCULAR = 'circular',     // 环形布局
  TREE = 'tree',            // 树形布局
  GRID = 'grid'             // 网格布局
}

// 图谱类型
export enum GraphType {
  PRESET = 'preset',         // 预设模板
  CUSTOM = 'custom',         // 自定义图谱
  HYBRID = 'hybrid'          // 混合图谱（基于预设的自定义）
}

// 节点位置信息
export interface NodePosition {
  x: number;
  y: number;
  z?: number; // 3D支持
}

// 节点元数据
export interface NodeMetadata {
  description?: string;
  workCount: number;
  reuseCount: number;
  color?: string;
  icon?: string;
  size?: number;
  importance?: number; // 节点重要性评分
  tags?: string[];
  createdAt?: Date;
  updatedAt?: Date;
}

// 图节点定义
export interface GraphNode {
  id: string;
  label: string;
  type: NodeType;
  level: number; // 层级深度
  parentId?: string; // 父节点ID
  position?: NodePosition;
  metadata: NodeMetadata;
  isVisible: boolean;
  isLocked: boolean; // 是否锁定（预设节点不可删除）
}

// 边元数据
export interface EdgeMetadata {
  strength?: number; // 关系强度
  description?: string;
  color?: string;
  style?: 'solid' | 'dashed' | 'dotted';
  animated?: boolean;
  createdAt?: Date;
}

// 图边定义
export interface GraphEdge {
  id: string;
  source: string;
  target: string;
  type: EdgeType;
  weight: number; // 权重
  metadata?: EdgeMetadata;
  isVisible: boolean;
  isDirected: boolean; // 是否有向
}

// 图谱布局配置
export interface LayoutConfig {
  type: GraphLayout;
  options: {
    nodeSpacing?: number;
    levelSpacing?: number;
    centerForce?: number;
    linkDistance?: number;
    linkStrength?: number;
    chargeStrength?: number;
    collisionRadius?: number;
    alpha?: number;
    alphaDecay?: number;
    velocityDecay?: number;
  };
}

// 图谱视图配置
export interface ViewConfig {
  showLabels: boolean;
  showEdgeLabels: boolean;
  nodeSize: 'fixed' | 'proportional';
  edgeWidth: 'fixed' | 'proportional';
  colorScheme: string;
  theme: 'light' | 'dark';
  animations: boolean;
  minimap: boolean;
  toolbar: boolean;
}

// 知识图谱主体定义
export interface KnowledgeGraph {
  id: string;
  userId: string;
  name: string;
  description?: string;
  type: GraphType;
  subject?: string; // 学科分类
  gradeLevel?: string; // 学段
  nodes: GraphNode[];
  edges: GraphEdge[];
  layout: LayoutConfig;
  view: ViewConfig;
  version: number; // 版本号
  isPublic: boolean; // 是否公开
  templateId?: string; // 基于的模板ID
  createdAt: Date;
  updatedAt: Date;
}

// 作品挂载信息
export interface WorkMount {
  id: string;
  userId: string;
  workId: string;
  graphId: string;
  nodeId: string;
  position?: number; // 在节点中的位置
  isPrimary: boolean; // 是否为主要挂载点
  createdAt: Date;
}

// 图谱模板定义
export interface GraphTemplate {
  id: string;
  name: string;
  description: string;
  subject: string;
  gradeLevel?: string;
  category: string;
  nodes: Omit<GraphNode, 'metadata'>[];
  edges: GraphEdge[];
  layout: LayoutConfig;
  view: ViewConfig;
  isOfficial: boolean; // 是否官方模板
  usageCount: number; // 使用次数
  rating: number; // 评分
  tags: string[];
  authorId?: string;
  createdAt: Date;
  updatedAt: Date;
}

// 节点统计信息
export interface NodeStats {
  nodeId: string;
  workCount: number;
  reuseCount: number;
  viewCount: number;
  lastActivity: Date;
  growthRate: number; // 增长率
  importance: number; // 重要性评分
}

// 图谱统计信息
export interface GraphStats {
  graphId: string;
  nodeCount: number;
  edgeCount: number;
  workCount: number;
  totalReuseCount: number;
  averageNodeDegree: number;
  maxDepth: number;
  density: number; // 图密度
  clustering: number; // 聚类系数
  lastUpdated: Date;
}

// 图谱搜索结果
export interface GraphSearchResult {
  nodes: GraphNode[];
  edges: GraphEdge[];
  paths: GraphPath[];
  total: number;
  query: string;
  filters: SearchFilters;
}

// 图路径定义
export interface GraphPath {
  nodes: string[]; // 节点ID序列
  edges: string[]; // 边ID序列
  length: number;
  weight: number;
  type: 'shortest' | 'learning' | 'semantic';
}

// 搜索过滤器
export interface SearchFilters {
  nodeTypes?: NodeType[];
  subjects?: string[];
  gradeLevels?: string[];
  hasWorks?: boolean;
  minWorkCount?: number;
  tags?: string[];
  dateRange?: {
    start: Date;
    end: Date;
  };
}

// 图谱操作历史
export interface GraphOperation {
  id: string;
  graphId: string;
  userId: string;
  type: 'create_node' | 'delete_node' | 'create_edge' | 'delete_edge' | 'move_node' | 'mount_work' | 'unmount_work';
  data: Record<string, any>;
  timestamp: Date;
  canUndo: boolean;
}

// API请求类型定义

// 创建图谱请求
export interface CreateGraphRequest {
  name: string;
  description?: string;
  type: GraphType;
  subject?: string;
  gradeLevel?: string;
  templateId?: string;
  isPublic?: boolean;
}

// 更新图谱请求
export interface UpdateGraphRequest {
  name?: string;
  description?: string;
  layout?: LayoutConfig;
  view?: ViewConfig;
  isPublic?: boolean;
}

// 创建节点请求
export interface CreateNodeRequest {
  label: string;
  type: NodeType;
  parentId?: string;
  position?: NodePosition;
  metadata?: Partial<NodeMetadata>;
}

// 更新节点请求
export interface UpdateNodeRequest {
  label?: string;
  position?: NodePosition;
  metadata?: Partial<NodeMetadata>;
  isVisible?: boolean;
}

// 创建边请求
export interface CreateEdgeRequest {
  source: string;
  target: string;
  type: EdgeType;
  weight?: number;
  metadata?: EdgeMetadata;
}

// 挂载作品请求
export interface MountWorkRequest {
  workId: string;
  nodeId: string;
  isPrimary?: boolean;
}

// 图谱查询参数
export interface GraphQuery {
  userId?: string;
  type?: GraphType;
  subject?: string;
  gradeLevel?: string;
  isPublic?: boolean;
  limit?: number;
  offset?: number;
  sortBy?: 'name' | 'createdAt' | 'updatedAt' | 'workCount';
  sortOrder?: 'asc' | 'desc';
}

// 节点查询参数
export interface NodeQuery {
  graphId: string;
  type?: NodeType;
  level?: number;
  hasWorks?: boolean;
  search?: string;
  limit?: number;
  offset?: number;
}

// API响应类型定义

// 图谱列表响应
export interface GraphListResponse {
  graphs: KnowledgeGraph[];
  total: number;
  pagination: {
    page: number;
    limit: number;
    totalPages: number;
  };
}

// 图谱详情响应
export interface GraphDetailResponse {
  graph: KnowledgeGraph;
  stats: GraphStats;
  recentOperations: GraphOperation[];
  mountedWorks: WorkMount[];
}

// 节点详情响应
export interface NodeDetailResponse {
  node: GraphNode;
  stats: NodeStats;
  mountedWorks: WorkMount[];
  relatedNodes: GraphNode[];
  paths: GraphPath[];
}

// 模板列表响应
export interface TemplateListResponse {
  templates: GraphTemplate[];
  categories: string[];
  subjects: string[];
  total: number;
}

// 图谱分析响应
export interface GraphAnalysisResponse {
  centrality: Record<string, number>; // 中心性分析
  communities: string[][]; // 社区发现
  importance: Record<string, number>; // 重要性评分
  recommendations: GraphNode[]; // 推荐节点
  insights: {
    type: string;
    message: string;
    data?: any;
  }[];
}

// 学习路径响应
export interface LearningPathResponse {
  paths: GraphPath[];
  recommendations: {
    nodeId: string;
    reason: string;
    confidence: number;
  }[];
  prerequisites: string[];
  nextSteps: string[];
}

// 缓存键类型
export type GraphCacheKey = 
  | `graph:${string}` // graph:graphId
  | `user_graphs:${string}` // user_graphs:userId
  | `node_stats:${string}` // node_stats:nodeId
  | `graph_stats:${string}` // graph_stats:graphId
  | `templates:${string}` // templates:subject
  | `graph_analysis:${string}`; // graph_analysis:graphId

// 事件类型
export type GraphEventType = 
  | 'graph_created'
  | 'graph_updated'
  | 'graph_deleted'
  | 'node_created'
  | 'node_updated'
  | 'node_deleted'
  | 'edge_created'
  | 'edge_deleted'
  | 'work_mounted'
  | 'work_unmounted'
  | 'graph_shared'
  | 'template_used';

// 图谱事件数据
export interface GraphEvent {
  type: GraphEventType;
  graphId: string;
  userId: string;
  data: Record<string, any>;
  timestamp: Date;
}

// 导出所有类型的联合类型，便于类型检查
export type KnowledgeGraphTypes = 
  | KnowledgeGraph
  | GraphNode
  | GraphEdge
  | GraphTemplate
  | WorkMount
  | GraphStats
  | GraphEvent;

// 工具类型
export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

export type GraphNodeUpdate = DeepPartial<GraphNode>;
export type GraphEdgeUpdate = DeepPartial<GraphEdge>;
export type KnowledgeGraphUpdate = DeepPartial<KnowledgeGraph>;