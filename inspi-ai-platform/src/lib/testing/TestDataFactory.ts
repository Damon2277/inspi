import { ObjectId } from 'mongoose';

import { NodeType, EdgeType, GraphType, GraphLayout } from '@/shared/types/knowledgeGraph';
import { User, Work, TeachingCard, Attribution, KnowledgeGraph, GraphNode, GraphEdge } from '@/types';

/**
 * 测试数据工厂系统
 * 提供标准化的测试数据创建、管理和清理功能
 */

// 基础工厂接口
export interface TestDataFactory<T> {
  create(overrides?: Partial<T>): T;
  createMany(count: number, overrides?: Partial<T>): T[];
  createWithRelations?(relations: any): T;
}

// 序列号生成器
class SequenceGenerator {
  private static counters: Map<string, number> = new Map();

  static next(key: string): number {
    const current = this.counters.get(key) || 0;
    const next = current + 1;
    this.counters.set(key, next);
    return next;
  }

  static reset(key?: string): void {
    if (key) {
      this.counters.delete(key);
    } else {
      this.counters.clear();
    }
  }
}

// 用户数据工厂
export class UserFactory implements TestDataFactory<User> {
  private static readonly defaultUser: Omit<User, '_id'> = {
    email: 'test@example.com',
    name: 'Test User',
    avatar: null,
    password: null,
    googleId: null,
    subscription: {
      plan: 'free',
      expiresAt: null,
      autoRenew: false,
    },
    usage: {
      dailyGenerations: 0,
      dailyReuses: 0,
      lastResetDate: new Date(),
    },
    contributionScore: 0,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  create(overrides: Partial<User> = {}): User {
    const sequence = SequenceGenerator.next('user');

    return {
      _id: new ObjectId(),
      ...UserFactory.defaultUser,
      email: `test${sequence}@example.com`,
      name: `Test User ${sequence}`,
      ...overrides,
    };
  }

  createMany(count: number, overrides: Partial<User> = {}): User[] {
    return Array.from({ length: count }, () => (this.create as any)(overrides));
  }

  createWithSubscription(plan: 'free' | 'pro' | 'super', overrides: Partial<User> = {}): User {
    const expiresAt = plan !== 'free' ? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) : null;

    return (this.create as any)({
      subscription: {
        plan,
        expiresAt,
        autoRenew: plan !== 'free',
      },
      ...overrides,
    });
  }

  createWithUsage(generations: number, reuses: number, overrides: Partial<User> = {}): User {
    return (this.create as any)({
      usage: {
        dailyGenerations: generations,
        dailyReuses: reuses,
        lastResetDate: new Date(),
      },
      ...overrides,
    });
  }

  createGoogleUser(overrides: Partial<User> = {}): User {
    const sequence = SequenceGenerator.next('google-user');

    return (this.create as any)({
      googleId: `google_${sequence}`,
      password: null,
      ...overrides,
    });
  }
}

// 教学卡片工厂
export class TeachingCardFactory implements TestDataFactory<TeachingCard> {
  private static readonly cardTypes: TeachingCard['type'][] = [
    'visualization', 'analogy', 'thinking', 'interaction',
  ];

  create(overrides: Partial<TeachingCard> = {}): TeachingCard {
    const sequence = SequenceGenerator.next('card');
    const type = TeachingCardFactory.cardTypes[sequence % TeachingCardFactory.cardTypes.length];

    return {
      id: `card_${sequence}`,
      type,
      title: `Test Card ${sequence}`,
      content: `This is test content for card ${sequence}`,
      editable: true,
      ...overrides,
    };
  }

  createMany(count: number, overrides: Partial<TeachingCard> = {}): TeachingCard[] {
    return Array.from({ length: count }, () => (this.create as any)(overrides));
  }

  createByType(type: TeachingCard['type'], overrides: Partial<TeachingCard> = {}): TeachingCard {
    return (this.create as any)({ type, ...overrides });
  }

  createSet(): TeachingCard[] {
    return TeachingCardFactory.cardTypes.map(type => this.createByType(type));
  }
}

// 作品数据工厂
export class WorkFactory implements TestDataFactory<Work> {
  private static readonly subjects = ['数学', '语文', '英语', '物理', '化学', '生物'];
  private static readonly gradeLevels = ['小学', '初中', '高中'];
  private static readonly statuses: Work['status'][] = ['draft', 'published', 'archived'];

  private cardFactory = new TeachingCardFactory();

  create(overrides: Partial<Work> = {}): Work {
    const sequence = SequenceGenerator.next('work');
    const subject = WorkFactory.subjects[sequence % WorkFactory.subjects.length];
    const gradeLevel = WorkFactory.gradeLevels[sequence % WorkFactory.gradeLevels.length];

    return {
      _id: new ObjectId(),
      title: `Test Work ${sequence}`,
      knowledgePoint: `Knowledge Point ${sequence}`,
      subject,
      gradeLevel,
      author: new ObjectId(),
      cards: this.cardFactory.createMany(3),
      tags: [`tag${sequence}`, `${subject.toLowerCase()}`],
      reuseCount: 0,
      attribution: [],
      status: 'draft',
      createdAt: new Date(),
      updatedAt: new Date(),
      ...overrides,
    };
  }

  createMany(count: number, overrides: Partial<Work> = {}): Work[] {
    return Array.from({ length: count }, () => (this.create as any)(overrides));
  }

  createWithAuthor(author: ObjectId, overrides: Partial<Work> = {}): Work {
    return (this.create as any)({ author, ...overrides });
  }

  createPublished(overrides: Partial<Work> = {}): Work {
    return (this.create as any)({
      status: 'published',
      reuseCount: Math.floor(Math.random() * 50),
      ...overrides,
    });
  }

  createWithCards(cardCount: number, overrides: Partial<Work> = {}): Work {
    return (this.create as any)({
      cards: this.cardFactory.createMany(cardCount),
      ...overrides,
    });
  }

  createReusedWork(originalWork: Work, newAuthor: ObjectId, overrides: Partial<Work> = {}): Work {
    const attribution: Attribution = {
      originalAuthor: originalWork.author,
      originalWorkId: originalWork._id,
      originalWorkTitle: originalWork.title,
    };

    return (this.create as any)({
      title: `${originalWork.title} (Reused)`,
      knowledgePoint: originalWork.knowledgePoint,
      subject: originalWork.subject,
      gradeLevel: originalWork.gradeLevel,
      author: newAuthor,
      originalWork: originalWork._id,
      attribution: [attribution],
      cards: originalWork.cards.map(card => ({ ...card, id: `${card.id}_reused` })),
      ...overrides,
    });
  }
}

// 知识图谱节点工厂
export class GraphNodeFactory implements TestDataFactory<GraphNode> {
  create(overrides: Partial<GraphNode> = {}): GraphNode {
    const sequence = SequenceGenerator.next('node');

    return {
      id: `node_${sequence}`,
      label: `Node ${sequence}`,
      type: NodeType.CONCEPT,
      level: 0,
      parentId: null,
      position: { x: 0, y: 0, z: 0 },
      metadata: {
        description: `Description for node ${sequence}`,
        workCount: 0,
        reuseCount: 0,
        color: '#3b82f6',
        icon: '📝',
        size: 30,
        importance: 0.5,
        tags: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      isVisible: true,
      isLocked: false,
      ...overrides,
    };
  }

  createMany(count: number, overrides: Partial<GraphNode> = {}): GraphNode[] {
    return Array.from({ length: count }, () => (this.create as any)(overrides));
  }

  createWithParent(parentId: string, overrides: Partial<GraphNode> = {}): GraphNode {
    return (this.create as any)({ parentId, level: 1, ...overrides });
  }

  createHierarchy(depth: number, childrenPerLevel: number = 2): GraphNode[] {
    const nodes: GraphNode[] = [];

    // Create root node
    const root = (this.create as any)({ level: 0, label: 'Root Node' });
    nodes.push(root);

    // Create hierarchy
    let currentLevelNodes = [root];

    for (let level = 1; level < depth; level++) {
      const nextLevelNodes: GraphNode[] = [];

      for (const parent of currentLevelNodes) {
        for (let i = 0; i < childrenPerLevel; i++) {
          const child = this.createWithParent(parent.id, {
            level,
            label: `${parent.label} - Child ${i + 1}`,
          });
          nodes.push(child);
          nextLevelNodes.push(child);
        }
      }

      currentLevelNodes = nextLevelNodes;
    }

    return nodes;
  }
}

// 知识图谱边工厂
export class GraphEdgeFactory implements TestDataFactory<GraphEdge> {
  create(overrides: Partial<GraphEdge> = {}): GraphEdge {
    const sequence = SequenceGenerator.next('edge');

    return {
      id: `edge_${sequence}`,
      source: `node_${sequence}`,
      target: `node_${sequence + 1}`,
      type: EdgeType.CONTAINS,
      weight: 1,
      metadata: {
        strength: 1,
        description: `Edge ${sequence} description`,
        color: '#6b7280',
        style: 'solid',
        animated: false,
        createdAt: new Date(),
      },
      isVisible: true,
      isDirected: true,
      ...overrides,
    };
  }

  createMany(count: number, overrides: Partial<GraphEdge> = {}): GraphEdge[] {
    return Array.from({ length: count }, () => (this.create as any)(overrides));
  }

  createBetween(sourceId: string, targetId: string, overrides: Partial<GraphEdge> = {}): GraphEdge {
    return (this.create as any)({ source: sourceId, target: targetId, ...overrides });
  }

  createHierarchyEdges(nodes: GraphNode[]): GraphEdge[] {
    const edges: GraphEdge[] = [];

    for (const node of nodes) {
      if (node.parentId) {
        const edge = this.createBetween(node.parentId, node.id, {
          type: EdgeType.CONTAINS,
        });
        edges.push(edge);
      }
    }

    return edges;
  }
}

// 知识图谱工厂
export class KnowledgeGraphFactory implements TestDataFactory<KnowledgeGraph> {
  private nodeFactory = new GraphNodeFactory();
  private edgeFactory = new GraphEdgeFactory();

  create(overrides: Partial<KnowledgeGraph> = {}): KnowledgeGraph {
    const sequence = SequenceGenerator.next('graph');
    const nodes = this.nodeFactory.createMany(5);
    const edges = this.edgeFactory.createMany(4);

    return {
      _id: new ObjectId(),
      userId: new ObjectId(),
      name: `Test Graph ${sequence}`,
      description: `Test knowledge graph ${sequence}`,
      type: GraphType.CUSTOM,
      subject: '数学',
      gradeLevel: '初中',
      nodes,
      edges,
      layout: {
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
          velocityDecay: 0.4,
        },
      },
      view: {
        showLabels: true,
        showEdgeLabels: false,
        nodeSize: 'proportional',
        edgeWidth: 'fixed',
        colorScheme: 'default',
        theme: 'light',
        animations: true,
        minimap: true,
        toolbar: true,
      },
      version: 1,
      isPublic: false,
      createdAt: new Date(),
      updatedAt: new Date(),
      ...overrides,
    };
  }

  createMany(count: number, overrides: Partial<KnowledgeGraph> = {}): KnowledgeGraph[] {
    return Array.from({ length: count }, () => (this.create as any)(overrides));
  }

  createWithHierarchy(depth: number, childrenPerLevel: number = 2, overrides: Partial<KnowledgeGraph> = {}): KnowledgeGraph {
    const nodes = this.nodeFactory.createHierarchy(depth, childrenPerLevel);
    const edges = this.edgeFactory.createHierarchyEdges(nodes);

    return (this.create as any)({
      nodes,
      edges,
      ...overrides,
    });
  }

  createPublic(overrides: Partial<KnowledgeGraph> = {}): KnowledgeGraph {
    return (this.create as any)({ isPublic: true, ...overrides });
  }

  createForUser(userId: ObjectId, overrides: Partial<KnowledgeGraph> = {}): KnowledgeGraph {
    return (this.create as any)({ userId, ...overrides });
  }
}

// 主工厂类 - 统一管理所有工厂
export class TestDataFactory {
  public readonly user = new UserFactory();
  public readonly card = new TeachingCardFactory();
  public readonly work = new WorkFactory();
  public readonly node = new GraphNodeFactory();
  public readonly edge = new GraphEdgeFactory();
  public readonly graph = new KnowledgeGraphFactory();

  /**
   * 重置所有序列号计数器
   */
  resetSequences(): void {
    SequenceGenerator.reset();
  }

  /**
   * 创建完整的用户-作品关系数据
   */
  createUserWithWorks(workCount: number = 3): { user: User; works: Work[] } {
    const user = this(user.create as any)();
    const works = this.work.createMany(workCount, { author: user._id });

    return { user, works };
  }

  /**
   * 创建作品复用关系链
   */
  createReuseChain(length: number): { users: User[]; works: Work[] } {
    const users = this.user.createMany(length);
    const works: Work[] = [];

    // 创建原始作品
    const originalWork = this.work.createWithAuthor(users[0]._id, { status: 'published' });
    works.push(originalWork);

    // 创建复用链
    let currentWork = originalWork;
    for (let i = 1; i < length; i++) {
      const reusedWork = this.work.createReusedWork(currentWork, users[i]._id);
      works.push(reusedWork);
      currentWork = reusedWork;
    }

    return { users, works };
  }

  /**
   * 创建知识图谱与作品的关联数据
   */
  createGraphWithWorks(nodeCount: number = 5, workCount: number = 10): {
    user: User;
    graph: KnowledgeGraph;
    works: Work[];
  } {
    const user = this(user.create as any)();
    const graph = this.graph.createForUser(user._id);
    const works = this.work.createMany(workCount, { author: user._id });

    // 为节点分配作品
    graph.nodes.forEach((node, index) => {
      const nodeWorks = works.slice(index * 2, (index + 1) * 2);
      node.metadata.workCount = nodeWorks.length;
    });

    return { user, graph, works };
  }

  /**
   * 创建多用户协作场景数据
   */
  createCollaborationScenario(): {
    users: User[];
    originalWorks: Work[];
    reusedWorks: Work[];
    graphs: KnowledgeGraph[];
  } {
    const users = this.user.createMany(5);
    const originalWorks = users.map(user =>
      this.work.createWithAuthor(user._id, { status: 'published' }),
    );

    const reusedWorks: Work[] = [];
    // 每个用户复用其他用户的作品
    users.forEach((user, userIndex) => {
      originalWorks.forEach((originalWork, workIndex) => {
        if (userIndex !== workIndex) {
          const reused = this.work.createReusedWork(originalWork, user._id);
          reusedWorks.push(reused);
        }
      });
    });

    const graphs = users.map(user => this.graph.createForUser(user._id));

    return { users, originalWorks, reusedWorks, graphs };
  }
}

// 默认导出单例实例
export const testDataFactory = new TestDataFactory();
