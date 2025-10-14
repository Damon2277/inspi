/**
 * 测试数据工厂
 * 用于生成各种测试数据
 */
import { Types } from 'mongoose';

import {
  GraphType,
  NodeType,
  EdgeType,
  GraphLayout,
  KnowledgeGraph,
  GraphNode,
  GraphEdge,
} from '@/shared/types/knowledgeGraph';

// 基础工厂类
class Factory<T> {
  private defaults: Partial<T>;
  private sequence = 0;

  constructor(defaults: Partial<T>) {
    this.defaults = defaults;
  }

  create(overrides: Partial<T> = {}): T {
    this.sequence++;
    return {
      ...this.defaults,
      ...overrides,
    } as T;
  }

  createMany(count: number, overrides: Partial<T> = {}): T[] {
    return Array.from({ length: count }, () => (this.create as any)(overrides));
  }

  sequence(fn: (seq: number) => Partial<T>): T {
    this.sequence++;
    return (this.create as any)(fn(this.sequence));
  }
}

// 用户工厂
export const UserFactory = new Factory({
  _id: () => new Types.ObjectId().toString(),
  email: () => `user${Date.now()}@example.com`,
  name: 'Test User',
  avatar: 'https://example.com/avatar.jpg',
  subscription: {
    type: 'free',
    expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    limits: {
      dailyGenerations: 10,
      maxWorks: 50,
      maxGraphs: 5,
    },
  },
  createdAt: new Date(),
  updatedAt: new Date(),
});

// 作品工厂
export const WorkFactory = new Factory({
  _id: () => new Types.ObjectId().toString(),
  userId: () => new Types.ObjectId().toString(),
  title: 'Test Work',
  description: 'This is a test work',
  subject: 'mathematics',
  educationLevel: 'high_school',
  cards: [
    {
      id: () => new Types.ObjectId().toString(),
      type: 'concept',
      title: 'Test Concept',
      content: 'This is a test concept card',
      metadata: {},
    },
  ],
  metadata: {
    isPublic: true,
    tags: ['test', 'mathematics'],
    difficulty: 3,
    estimatedTime: 30,
  },
  stats: {
    views: 0,
    likes: 0,
    reuseCount: 0,
    rating: 0,
  },
  createdAt: new Date(),
  updatedAt: new Date(),
});

// 知识图谱节点工厂
export const GraphNodeFactory = new Factory<GraphNode>({
  id: () => new Types.ObjectId().toString(),
  label: 'Test Node',
  type: NodeType.TOPIC,
  level: 1,
  position: { x: 0, y: 0 },
  metadata: {
    description: 'Test node description',
    workCount: 0,
    reuseCount: 0,
    tags: ['test'],
  },
  isVisible: true,
  isLocked: false,
});

// 知识图谱边工厂
export const GraphEdgeFactory = new Factory<GraphEdge>({
  id: () => new Types.ObjectId().toString(),
  source: () => new Types.ObjectId().toString(),
  target: () => new Types.ObjectId().toString(),
  type: EdgeType.PREREQUISITE,
  weight: 1.0,
  metadata: {
    strength: 0.8,
    description: 'Test edge',
  },
  isVisible: true,
  isDirected: true,
});

// 知识图谱工厂
export const KnowledgeGraphFactory = new Factory<KnowledgeGraph>({
  id: () => new Types.ObjectId().toString(),
  userId: () => new Types.ObjectId().toString(),
  name: 'Test Knowledge Graph',
  description: 'This is a test knowledge graph',
  type: GraphType.CUSTOM,
  subject: 'mathematics',
  gradeLevel: 'high',
  nodes: [],
  edges: [],
  layout: {
    type: GraphLayout.FORCE,
    options: {},
  },
  view: {
    showLabels: true,
    showEdgeLabels: false,
    nodeSize: 'fixed',
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
});

// 贡献记录工厂
export const ContributionFactory = new Factory({
  _id: () => new Types.ObjectId().toString(),
  userId: () => new Types.ObjectId().toString(),
  type: 'work_created',
  points: 10,
  metadata: {
    workId: () => new Types.ObjectId().toString(),
    workTitle: 'Test Work',
  },
  createdAt: new Date(),
});

// 复用记录工厂
export const ReuseFactory = new Factory({
  _id: () => new Types.ObjectId().toString(),
  originalWorkId: () => new Types.ObjectId().toString(),
  newWorkId: () => new Types.ObjectId().toString(),
  userId: () => new Types.ObjectId().toString(),
  originalAuthorId: () => new Types.ObjectId().toString(),
  type: 'full_reuse',
  attribution: {
    originalTitle: 'Original Work',
    originalAuthor: 'Original Author',
    reuseType: 'full_reuse',
    modifications: [],
  },
  createdAt: new Date(),
});

// 复杂数据场景工厂
export class ScenarioFactory {
  // 创建完整的知识图谱场景
  static createGraphWithNodes(nodeCount = 3, edgeCount = 2) {
    const nodes = GraphNodeFactory.createMany(nodeCount, {});
    const edges = [];

    // 创建边，确保引用存在的节点
    for (let i = 0; i < Math.min(edgeCount, nodeCount - 1); i++) {
      edges.push((GraphEdgeFactory.create as any)({
        source: nodes[i].id,
        target: nodes[i + 1].id,
      }));
    }

    return (KnowledgeGraphFactory.create as any)({
      nodes,
      edges,
    });
  }

  // 创建用户及其作品场景
  static createUserWithWorks(workCount = 3) {
    const user = (UserFactory.create as any)();
    const works = WorkFactory.createMany(workCount, {
      userId: user._id,
    });

    return { user, works };
  }

  // 创建复用链场景
  static createReuseChain(length = 3) {
    const users = UserFactory.createMany(length);
    const works = [];
    const reuses = [];

    // 创建原始作品
    const originalWork = (WorkFactory.create as any)({
      userId: users[0]._id,
    });
    works.push(originalWork);

    // 创建复用链
    for (let i = 1; i < length; i++) {
      const newWork = (WorkFactory.create as any)({
        userId: users[i]._id,
      });
      works.push(newWork);

      const reuse = (ReuseFactory.create as any)({
        originalWorkId: works[i - 1]._id,
        newWorkId: newWork._id,
        userId: users[i]._id,
        originalAuthorId: users[0]._id,
      });
      reuses.push(reuse);
    }

    return { users, works, reuses };
  }
}

const factories = {
  UserFactory,
  WorkFactory,
  GraphNodeFactory,
  GraphEdgeFactory,
  KnowledgeGraphFactory,
  ContributionFactory,
  ReuseFactory,
  ScenarioFactory,
};

export default factories;
