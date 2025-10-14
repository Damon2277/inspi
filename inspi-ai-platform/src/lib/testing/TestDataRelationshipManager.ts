import { ObjectId } from 'mongoose';

import { User, Work, KnowledgeGraph, GraphNode, GraphEdge } from '@/types';

import { TestDataBuilder } from './TestDataBuilder';
import { TestDataFactory } from './TestDataFactory';

/**
 * 测试数据关联关系管理器
 * 负责管理测试数据之间的复杂关联关系，确保数据一致性
 */

// 关系类型定义
export interface DataRelationship {
  id: string;
  type: RelationshipType;
  source: DataReference;
  target: DataReference;
  metadata?: Record<string, any>;
  createdAt: Date;
}

export enum RelationshipType {
  USER_OWNS_WORK = 'user_owns_work',
  USER_OWNS_GRAPH = 'user_owns_graph',
  WORK_REUSES_WORK = 'work_reuses_work',
  GRAPH_CONTAINS_NODE = 'graph_contains_node',
  NODE_CONNECTS_NODE = 'node_connects_node',
  NODE_REFERENCES_WORK = 'node_references_work',
  USER_COLLABORATES_USER = 'user_collaborates_user',
}

export interface DataReference {
  type: 'user' | 'work' | 'graph' | 'node' | 'edge';
  id: string | ObjectId;
  data?: any;
}

// 关系约束定义
export interface RelationshipConstraint {
  type: RelationshipType;
  sourceType: DataReference['type'];
  targetType: DataReference['type'];
  cardinality: 'one-to-one' | 'one-to-many' | 'many-to-many';
  required: boolean;
  validator?: (source: any, target: any) => boolean;
}

// 数据集合管理器
export class TestDataCollection {
  private users: Map<string, User> = new Map();
  private works: Map<string, Work> = new Map();
  private graphs: Map<string, KnowledgeGraph> = new Map();
  private relationships: Map<string, DataRelationship> = new Map();

  // 添加数据
  addUser(user: User): void {
    this.users.set(user._id.toString(), user);
  }

  addWork(work: Work): void {
    this.works.set(work._id.toString(), work);
  }

  addGraph(graph: KnowledgeGraph): void {
    this.graphs.set(graph._id.toString(), graph);
  }

  // 获取数据
  getUser(id: string | ObjectId): User | undefined {
    return this.users.get(id.toString());
  }

  getWork(id: string | ObjectId): Work | undefined {
    return this.works.get(id.toString());
  }

  getGraph(id: string | ObjectId): KnowledgeGraph | undefined {
    return this.graphs.get(id.toString());
  }

  // 获取所有数据
  getAllUsers(): User[] {
    return Array.from(this.users.values());
  }

  getAllWorks(): Work[] {
    return Array.from(this.works.values());
  }

  getAllGraphs(): KnowledgeGraph[] {
    return Array.from(this.graphs.values());
  }

  // 添加关系
  addRelationship(relationship: DataRelationship): void {
    this.relationships.set(relationship.id, relationship);
  }

  // 获取关系
  getRelationships(type?: RelationshipType): DataRelationship[] {
    const relationships = Array.from(this.relationships.values());
    return type ? relationships.filter(r => r.type === type) : relationships;
  }

  // 根据源获取关系
  getRelationshipsBySource(sourceId: string | ObjectId, type?: RelationshipType): DataRelationship[] {
    return this.getRelationships(type).filter(r => r.source.id.toString() === sourceId.toString());
  }

  // 根据目标获取关系
  getRelationshipsByTarget(targetId: string | ObjectId, type?: RelationshipType): DataRelationship[] {
    return this.getRelationships(type).filter(r => r.target.id.toString() === targetId.toString());
  }

  // 清空所有数据
  clear(): void {
    this.users.clear();
    this.works.clear();
    this.graphs.clear();
    this.relationships.clear();
  }

  // 获取统计信息
  getStats(): {
    users: number;
    works: number;
    graphs: number;
    relationships: number;
  } {
    return {
      users: this.users.size,
      works: this.works.size,
      graphs: this.graphs.size,
      relationships: this.relationships.size,
    };
  }
}

// 关系管理器主类
export class TestDataRelationshipManager {
  private collection = new TestDataCollection();
  private factory = new TestDataFactory();
  private constraints: Map<RelationshipType, RelationshipConstraint> = new Map();
  private relationshipIdCounter = 0;

  constructor() {
    this.initializeConstraints();
  }

  // 初始化关系约束
  private initializeConstraints(): void {
    const constraints: RelationshipConstraint[] = [
      {
        type: RelationshipType.USER_OWNS_WORK,
        sourceType: 'user',
        targetType: 'work',
        cardinality: 'one-to-many',
        required: true,
      },
      {
        type: RelationshipType.USER_OWNS_GRAPH,
        sourceType: 'user',
        targetType: 'graph',
        cardinality: 'one-to-many',
        required: true,
      },
      {
        type: RelationshipType.WORK_REUSES_WORK,
        sourceType: 'work',
        targetType: 'work',
        cardinality: 'many-to-many',
        required: false,
        validator: (source: Work, target: Work) => source._id.toString() !== target._id.toString(),
      },
      {
        type: RelationshipType.GRAPH_CONTAINS_NODE,
        sourceType: 'graph',
        targetType: 'node',
        cardinality: 'one-to-many',
        required: false,
      },
      {
        type: RelationshipType.NODE_CONNECTS_NODE,
        sourceType: 'node',
        targetType: 'node',
        cardinality: 'many-to-many',
        required: false,
        validator: (source: GraphNode, target: GraphNode) => source.id !== target.id,
      },
    ];

    constraints.forEach(constraint => {
      this.constraints.set(constraint.type, constraint);
    });
  }

  // 生成关系ID
  private generateRelationshipId(): string {
    return `rel_${++this.relationshipIdCounter}`;
  }

  // 验证关系
  private validateRelationship(
    type: RelationshipType,
    source: any,
    target: any,
  ): { valid: boolean; error?: string } {
    const constraint = this.constraints.get(type);
    if (!constraint) {
      return { valid: false, error: `Unknown relationship type: ${type}` };
    }

    // 验证自定义约束
    if (constraint.validator && !constraint.validator(source, target)) {
      return { valid: false, error: `Custom validation failed for ${type}` };
    }

    return { valid: true };
  }

  // 创建关系
  private createRelationship(
    type: RelationshipType,
    source: DataReference,
    target: DataReference,
    metadata?: Record<string, any>,
  ): DataRelationship {
    return {
      id: this.generateRelationshipId(),
      type,
      source,
      target,
      metadata,
      createdAt: new Date(),
    };
  }

  // 建立用户-作品关系
  establishUserWorkRelationship(user: User, work: Work): void {
    const validation = this.validateRelationship(RelationshipType.USER_OWNS_WORK, user, work);
    if (!validation.valid) {
      throw new Error(`Cannot establish user-work relationship: ${validation.error}`);
    }

    // 更新作品的作者
    work.author = user._id;

    // 添加到集合
    this.collection.addUser(user);
    this.collection.addWork(work);

    // 创建关系
    const relationship = this.createRelationship(
      RelationshipType.USER_OWNS_WORK,
      { type: 'user', id: user._id },
      { type: 'work', id: work._id },
    );
    this.collection.addRelationship(relationship);
  }

  // 建立用户-知识图谱关系
  establishUserGraphRelationship(user: User, graph: KnowledgeGraph): void {
    const validation = this.validateRelationship(RelationshipType.USER_OWNS_GRAPH, user, graph);
    if (!validation.valid) {
      throw new Error(`Cannot establish user-graph relationship: ${validation.error}`);
    }

    // 更新图谱的用户ID
    graph.userId = user._id;

    // 添加到集合
    this.collection.addUser(user);
    this.collection.addGraph(graph);

    // 创建关系
    const relationship = this.createRelationship(
      RelationshipType.USER_OWNS_GRAPH,
      { type: 'user', id: user._id },
      { type: 'graph', id: graph._id },
    );
    this.collection.addRelationship(relationship);
  }

  // 建立作品复用关系
  establishWorkReuseRelationship(originalWork: Work, reusedWork: Work): void {
    const validation = this.validateRelationship(RelationshipType.WORK_REUSES_WORK, reusedWork, originalWork);
    if (!validation.valid) {
      throw new Error(`Cannot establish work reuse relationship: ${validation.error}`);
    }

    // 更新复用作品的信息
    reusedWork.originalWork = originalWork._id;
    reusedWork.attribution = [{
      originalAuthor: originalWork.author,
      originalWorkId: originalWork._id,
      originalWorkTitle: originalWork.title,
    }];

    // 增加原作品的复用次数
    originalWork.reuseCount += 1;

    // 更新集合
    this.collection.addWork(originalWork);
    this.collection.addWork(reusedWork);

    // 创建关系
    const relationship = this.createRelationship(
      RelationshipType.WORK_REUSES_WORK,
      { type: 'work', id: reusedWork._id },
      { type: 'work', id: originalWork._id },
      { reuseDate: new Date() },
    );
    this.collection.addRelationship(relationship);
  }

  // 建立图谱节点关系
  establishGraphNodeRelationship(graph: KnowledgeGraph, node: GraphNode): void {
    // 检查节点是否已存在
    const existingNode = graph(nodes.find as any)(n => n.id === node.id);
    if (existingNode) {
      throw new Error(`Node ${node.id} already exists in graph ${graph._id}`);
    }

    // 添加节点到图谱
    graph.nodes.push(node);
    graph.version += 1;

    // 更新集合
    this.collection.addGraph(graph);

    // 创建关系
    const relationship = this.createRelationship(
      RelationshipType.GRAPH_CONTAINS_NODE,
      { type: 'graph', id: graph._id },
      { type: 'node', id: node.id },
    );
    this.collection.addRelationship(relationship);
  }

  // 建立节点连接关系
  establishNodeConnectionRelationship(
    graph: KnowledgeGraph,
    sourceNode: GraphNode,
    targetNode: GraphNode,
    edge: GraphEdge,
  ): void {
    const validation = this.validateRelationship(RelationshipType.NODE_CONNECTS_NODE, sourceNode, targetNode);
    if (!validation.valid) {
      throw new Error(`Cannot establish node connection: ${validation.error}`);
    }

    // 检查节点是否存在于图谱中
    const sourceExists = graph.nodes.some(n => n.id === sourceNode.id);
    const targetExists = graph.nodes.some(n => n.id === targetNode.id);

    if (!sourceExists || !targetExists) {
      throw new Error('Source or target node does not exist in the graph');
    }

    // 设置边的源和目标
    edge.source = sourceNode.id;
    edge.target = targetNode.id;

    // 添加边到图谱
    graph.edges.push(edge);
    graph.version += 1;

    // 更新集合
    this.collection.addGraph(graph);

    // 创建关系
    const relationship = this.createRelationship(
      RelationshipType.NODE_CONNECTS_NODE,
      { type: 'node', id: sourceNode.id },
      { type: 'node', id: targetNode.id },
      { edgeId: edge.id, edgeType: edge.type },
    );
    this.collection.addRelationship(relationship);
  }

  // 创建完整的用户生态系统
  createUserEcosystem(config: {
    userCount: number;
    worksPerUser: number;
    graphsPerUser: number;
    reuseRate: number; // 0-1之间，表示作品被复用的概率
  }): TestDataCollection {
    const { userCount, worksPerUser, graphsPerUser, reuseRate } = config;

    // 创建用户
    const users = this.factory.user.createMany(userCount);
    users.forEach(user => this.collection.addUser(user));

    // 为每个用户创建作品
    const allWorks: Work[] = [];
    users.forEach(user => {
      const works = this.factory.work.createMany(worksPerUser);
      works.forEach(work => {
        this.establishUserWorkRelationship(user, work);
        allWorks.push(work);
      });
    });

    // 创建复用关系
    allWorks.forEach(work => {
      if (Math.random() < reuseRate) {
        const randomUser = users[Math.floor(Math.random() * users.length)];
        const reusedWork = this.factory.work.createReusedWork(work, randomUser._id);
        this.establishWorkReuseRelationship(work, reusedWork);
      }
    });

    // 为每个用户创建知识图谱
    users.forEach(user => {
      const graphs = this.factory.graph.createMany(graphsPerUser);
      graphs.forEach(graph => {
        this.establishUserGraphRelationship(user, graph);
      });
    });

    return this.collection;
  }

  // 创建协作场景
  createCollaborationScenario(): TestDataCollection {
    // 创建5个用户
    const users = this.factory.user.createMany(5);
    users.forEach(user => this.collection.addUser(user));

    // 每个用户创建2个原创作品
    const originalWorks: Work[] = [];
    users.forEach(user => {
      const works = this.factory.work.createMany(2, { status: 'published' });
      works.forEach(work => {
        this.establishUserWorkRelationship(user, work);
        originalWorks.push(work);
      });
    });

    // 创建复用网络：每个用户复用其他用户的作品
    users.forEach((user, userIndex) => {
      originalWorks.forEach((originalWork, workIndex) => {
        const originalUserIndex = Math.floor(workIndex / 2);
        if (userIndex !== originalUserIndex && Math.random() < 0.3) {
          const reusedWork = this.factory.work.createReusedWork(originalWork, user._id);
          this.establishWorkReuseRelationship(originalWork, reusedWork);
        }
      });
    });

    // 为每个用户创建知识图谱
    users.forEach(user => {
      const graph = this.factory.graph.createForUser(user._id);
      this.establishUserGraphRelationship(user, graph);

      // 为图谱添加层次结构
      const nodeBuilder = TestDataBuilder.node();
      const edgeBuilder = TestDataBuilder.edge();

      const subject = nodeBuilder.asSubject().withLabel(graph.subject || '数学').build();
      this.establishGraphNodeRelationship(graph, subject);

      // 添加2-3个主题节点
      for (let i = 0; i < 3; i++) {
        const topic = nodeBuilder.asTopic().withLabel(`主题 ${i + 1}`).withParent(subject.id).build();
        this.establishGraphNodeRelationship(graph, topic);

        const edge = edgeBuilder.asContains().between(subject.id, topic.id).build();
        this.establishNodeConnectionRelationship(graph, subject, topic, edge);

        // 为每个主题添加概念节点
        for (let j = 0; j < 2; j++) {
          const concept = nodeBuilder.asConcept().withLabel(`概念 ${i + 1}.${j + 1}`).withParent(topic.id).build();
          this.establishGraphNodeRelationship(graph, concept);

          const conceptEdge = edgeBuilder.asContains().between(topic.id, concept.id).build();
          this.establishNodeConnectionRelationship(graph, topic, concept, conceptEdge);
        }
      }
    });

    return this.collection;
  }

  // 创建复杂的知识图谱场景
  createComplexGraphScenario(): TestDataCollection {
    const user = this.factory(user.create as any)();
    this.collection.addUser(user);

    const graph = this.factory.graph.createForUser(user._id, {
      name: '复杂数学知识图谱',
      description: '包含多层次结构和交叉引用的数学知识图谱',
    });

    this.establishUserGraphRelationship(user, graph);

    const nodeBuilder = TestDataBuilder.node();
    const edgeBuilder = TestDataBuilder.edge();

    // 创建学科层
    const math = nodeBuilder.asSubject().withLabel('数学').build();
    this.establishGraphNodeRelationship(graph, math);

    // 创建分支层
    const algebra = nodeBuilder.asTopic().withLabel('代数').withParent(math.id).build();
    const geometry = nodeBuilder.asTopic().withLabel('几何').withParent(math.id).build();
    const calculus = nodeBuilder.asTopic().withLabel('微积分').withParent(math.id).build();

    [algebra, geometry, calculus].forEach(topic => {
      this.establishGraphNodeRelationship(graph, topic);
      const edge = edgeBuilder.asContains().between(math.id, topic.id).build();
      this.establishNodeConnectionRelationship(graph, math, topic, edge);
    });

    // 创建概念层
    const quadratic = nodeBuilder.asConcept().withLabel('二次函数').withParent(algebra.id).build();
    const linear = nodeBuilder.asConcept().withLabel('线性函数').withParent(algebra.id).build();
    const circle = nodeBuilder.asConcept().withLabel('圆').withParent(geometry.id).build();
    const derivative = nodeBuilder.asConcept().withLabel('导数').withParent(calculus.id).build();

    [quadratic, linear, circle, derivative].forEach(concept => {
      this.establishGraphNodeRelationship(graph, concept);
    });

    // 建立包含关系
    const algebraConcepts = [quadratic, linear];
    algebraConcepts.forEach(concept => {
      const edge = edgeBuilder.asContains().between(algebra.id, concept.id).build();
      this.establishNodeConnectionRelationship(graph, algebra, concept, edge);
    });

    const geometryConcepts = [circle];
    geometryConcepts.forEach(concept => {
      const edge = edgeBuilder.asContains().between(geometry.id, concept.id).build();
      this.establishNodeConnectionRelationship(graph, geometry, concept, edge);
    });

    const calculusConcepts = [derivative];
    calculusConcepts.forEach(concept => {
      const edge = edgeBuilder.asContains().between(calculus.id, concept.id).build();
      this.establishNodeConnectionRelationship(graph, calculus, concept, edge);
    });

    // 建立交叉引用关系
    const relatesEdge1 = edgeBuilder.asRelates().between(quadratic.id, derivative.id).build();
    this.establishNodeConnectionRelationship(graph, quadratic, derivative, relatesEdge1);

    const relatesEdge2 = edgeBuilder.asRelates().between(linear.id, quadratic.id).build();
    this.establishNodeConnectionRelationship(graph, linear, quadratic, relatesEdge2);

    return this.collection;
  }

  // 获取数据集合
  getCollection(): TestDataCollection {
    return this.collection;
  }

  // 清空所有数据
  clear(): void {
    this.collection.clear();
    this.relationshipIdCounter = 0;
  }

  // 验证数据完整性
  validateDataIntegrity(): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    // 验证用户-作品关系
    this.collection.getAllWorks().forEach(work => {
      const user = this.collection.getUser(work.author);
      if (!user) {
        errors.push(`Work ${work._id} references non-existent user ${work.author}`);
      }
    });

    // 验证用户-图谱关系
    this.collection.getAllGraphs().forEach(graph => {
      const user = this.collection.getUser(graph.userId);
      if (!user) {
        errors.push(`Graph ${graph._id} references non-existent user ${graph.userId}`);
      }
    });

    // 验证作品复用关系
    this.collection.getAllWorks().forEach(work => {
      if (work.originalWork) {
        const originalWork = this.collection.getWork(work.originalWork);
        if (!originalWork) {
          errors.push(`Work ${work._id} references non-existent original work ${work.originalWork}`);
        }
      }
    });

    // 验证图谱节点边关系
    this.collection.getAllGraphs().forEach(graph => {
      graph.edges.forEach(edge => {
        const sourceNode = graph.nodes.find(n => n.id === edge.source);
        const targetNode = graph.nodes.find(n => n.id === edge.target);

        if (!sourceNode) {
          errors.push(`Graph ${graph._id} edge ${edge.id} references non-existent source node ${edge.source}`);
        }
        if (!targetNode) {
          errors.push(`Graph ${graph._id} edge ${edge.id} references non-existent target node ${edge.target}`);
        }
      });
    });

    return {
      valid: errors.length === 0,
      errors,
    };
  }
}

// 默认导出
export const testDataRelationshipManager = new TestDataRelationshipManager();
