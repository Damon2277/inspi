import { ObjectId } from 'mongoose';

import { NodeType, EdgeType, GraphType, GraphLayout } from '@/shared/types/knowledgeGraph';
import { User, Work, TeachingCard, KnowledgeGraph, GraphNode, GraphEdge } from '@/types';

/**
 * 测试数据构建器模式实现
 * 提供流式API来构建复杂的测试数据对象
 */

// 基础构建器接口
export interface Builder<T> {
  build(): T;
  reset(): this;
}

// 用户构建器
export class UserBuilder implements Builder<User> {
  private data: Partial<User> = {};
  private static sequence = 0;

  constructor() {
    this.reset();
  }

  reset(): this {
    UserBuilder.sequence++;
    this.data = {
      _id: new ObjectId(),
      email: `user${UserBuilder.sequence}@example.com`,
      name: `User ${UserBuilder.sequence}`,
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
    return this;
  }

  withId(id: ObjectId): this {
    this.data._id = id;
    return this;
  }

  withEmail(email: string): this {
    this.data.email = email;
    return this;
  }

  withName(name: string): this {
    this.data.name = name;
    return this;
  }

  withAvatar(avatar: string): this {
    this.data.avatar = avatar;
    return this;
  }

  withPassword(password: string): this {
    this.data.password = password;
    return this;
  }

  withGoogleId(googleId: string): this {
    this.data.googleId = googleId;
    this.data.password = null; // Google users don't have passwords
    return this;
  }

  withSubscription(plan: 'free' | 'pro' | 'super', autoRenew: boolean = false): this {
    const expiresAt = plan !== 'free' ? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) : null;
    this.data.subscription = {
      plan,
      expiresAt,
      autoRenew,
    };
    return this;
  }

  withUsage(generations: number, reuses: number): this {
    this.data.usage = {
      dailyGenerations: generations,
      dailyReuses: reuses,
      lastResetDate: new Date(),
    };
    return this;
  }

  withContributionScore(score: number): this {
    this.data.contributionScore = score;
    return this;
  }

  withCreatedAt(date: Date): this {
    this.data.createdAt = date;
    return this;
  }

  asFreeUser(): this {
    return this.withSubscription('free');
  }

  asProUser(): this {
    return this.withSubscription('pro', true);
  }

  asSuperUser(): this {
    return this.withSubscription('super', true);
  }

  asGoogleUser(): this {
    const sequence = UserBuilder.sequence;
    return this.withGoogleId(`google_${sequence}`);
  }

  asActiveUser(): this {
    return this.withUsage(3, 1).withContributionScore(50);
  }

  asNewUser(): this {
    return this.withUsage(0, 0).withContributionScore(0);
  }

  build(): User {
    return { ...this.data } as User;
  }
}

// 教学卡片构建器
export class TeachingCardBuilder implements Builder<TeachingCard> {
  private data: Partial<TeachingCard> = {};
  private static sequence = 0;

  constructor() {
    this.reset();
  }

  reset(): this {
    TeachingCardBuilder.sequence++;
    this.data = {
      id: `card_${TeachingCardBuilder.sequence}`,
      type: 'visualization',
      title: `Card ${TeachingCardBuilder.sequence}`,
      content: `Content for card ${TeachingCardBuilder.sequence}`,
      editable: true,
    };
    return this;
  }

  withId(id: string): this {
    this.data.id = id;
    return this;
  }

  withType(type: TeachingCard['type']): this {
    this.data.type = type;
    return this;
  }

  withTitle(title: string): this {
    this.data.title = title;
    return this;
  }

  withContent(content: string): this {
    this.data.content = content;
    return this;
  }

  asReadOnly(): this {
    this.data.editable = false;
    return this;
  }

  asEditable(): this {
    this.data.editable = true;
    return this;
  }

  asVisualization(): this {
    return this.withType('visualization')
      .withTitle('Visualization Card')
      .withContent('This card helps visualize the concept');
  }

  asAnalogy(): this {
    return this.withType('analogy')
      .withTitle('Analogy Card')
      .withContent('This concept is like...');
  }

  asThinking(): this {
    return this.withType('thinking')
      .withTitle('Thinking Card')
      .withContent('Think about this question...');
  }

  asInteraction(): this {
    return this.withType('interaction')
      .withTitle('Interactive Card')
      .withContent('Try this interactive exercise...');
  }

  build(): TeachingCard {
    return { ...this.data } as TeachingCard;
  }
}

// 作品构建器
export class WorkBuilder implements Builder<Work> {
  private data: Partial<Work> = {};
  private static sequence = 0;

  constructor() {
    this.reset();
  }

  reset(): this {
    WorkBuilder.sequence++;
    this.data = {
      _id: new ObjectId(),
      title: `Work ${WorkBuilder.sequence}`,
      knowledgePoint: `Knowledge Point ${WorkBuilder.sequence}`,
      subject: '数学',
      gradeLevel: '初中',
      author: new ObjectId(),
      cards: [],
      tags: [],
      reuseCount: 0,
      attribution: [],
      status: 'draft',
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    return this;
  }

  withId(id: ObjectId): this {
    this.data._id = id;
    return this;
  }

  withTitle(title: string): this {
    this.data.title = title;
    return this;
  }

  withKnowledgePoint(knowledgePoint: string): this {
    this.data.knowledgePoint = knowledgePoint;
    return this;
  }

  withSubject(subject: string): this {
    this.data.subject = subject;
    return this;
  }

  withGradeLevel(gradeLevel: string): this {
    this.data.gradeLevel = gradeLevel;
    return this;
  }

  withAuthor(author: ObjectId): this {
    this.data.author = author;
    return this;
  }

  withCards(cards: TeachingCard[]): this {
    this.data.cards = [...cards];
    return this;
  }

  addCard(card: TeachingCard): this {
    if (!this.data.cards) this.data.cards = [];
    this.data.cards.push(card);
    return this;
  }

  withTags(tags: string[]): this {
    this.data.tags = [...tags];
    return this;
  }

  addTag(tag: string): this {
    if (!this.data.tags) this.data.tags = [];
    this.data.tags.push(tag);
    return this;
  }

  withReuseCount(count: number): this {
    this.data.reuseCount = count;
    return this;
  }

  withStatus(status: Work['status']): this {
    this.data.status = status;
    return this;
  }

  withOriginalWork(originalWorkId: ObjectId): this {
    this.data.originalWork = originalWorkId;
    return this;
  }

  withAttribution(attribution: Work['attribution']): this {
    this.data.attribution = [...attribution];
    return this;
  }

  withCreatedAt(date: Date): this {
    this.data.createdAt = date;
    return this;
  }

  asDraft(): this {
    return this.withStatus('draft');
  }

  asPublished(): this {
    return this.withStatus('published');
  }

  asArchived(): this {
    return this.withStatus('archived');
  }

  asPopular(): this {
    return this.withReuseCount(Math.floor(Math.random() * 100) + 50)
      .asPublished();
  }

  asMathWork(): this {
    return this.withSubject('数学')
      .withKnowledgePoint('二次函数')
      .addTag('数学')
      .addTag('函数');
  }

  asChineseWork(): this {
    return this.withSubject('语文')
      .withKnowledgePoint('古诗词鉴赏')
      .addTag('语文')
      .addTag('古诗');
  }

  asEnglishWork(): this {
    return this.withSubject('英语')
      .withKnowledgePoint('Present Perfect Tense')
      .addTag('英语')
      .addTag('语法');
  }

  withCompleteCardSet(): this {
    const cardBuilder = new TeachingCardBuilder();
    const cards = [
      cardBuilder.asVisualization().build(),
      cardBuilder.asAnalogy().build(),
      cardBuilder.asThinking().build(),
      cardBuilder.asInteraction().build(),
    ];
    return this.withCards(cards);
  }

  asReusedFrom(originalWork: Work, newAuthor: ObjectId): this {
    return this.withTitle(`${originalWork.title} (Reused)`)
      .withKnowledgePoint(originalWork.knowledgePoint)
      .withSubject(originalWork.subject)
      .withGradeLevel(originalWork.gradeLevel)
      .withAuthor(newAuthor)
      .withOriginalWork(originalWork._id)
      .withAttribution([{
        originalAuthor: originalWork.author,
        originalWorkId: originalWork._id,
        originalWorkTitle: originalWork.title,
      }])
      .withCards(originalWork.cards.map(card => ({
        ...card,
        id: `${card.id}_reused`,
      })));
  }

  build(): Work {
    return { ...this.data } as Work;
  }
}

// 图节点构建器
export class GraphNodeBuilder implements Builder<GraphNode> {
  private data: Partial<GraphNode> = {};
  private static sequence = 0;

  constructor() {
    this.reset();
  }

  reset(): this {
    GraphNodeBuilder.sequence++;
    this.data = {
      id: `node_${GraphNodeBuilder.sequence}`,
      label: `Node ${GraphNodeBuilder.sequence}`,
      type: NodeType.CONCEPT,
      level: 0,
      parentId: null,
      position: { x: 0, y: 0, z: 0 },
      metadata: {
        description: `Description for node ${GraphNodeBuilder.sequence}`,
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
    };
    return this;
  }

  withId(id: string): this {
    this.data.id = id;
    return this;
  }

  withLabel(label: string): this {
    this.data.label = label;
    return this;
  }

  withType(type: NodeType): this {
    this.data.type = type;
    return this;
  }

  withLevel(level: number): this {
    this.data.level = level;
    return this;
  }

  withParent(parentId: string): this {
    this.data.parentId = parentId;
    return this;
  }

  withPosition(x: number, y: number, z: number = 0): this {
    this.data.position = { x, y, z };
    return this;
  }

  withWorkCount(count: number): this {
    if (!this.data.metadata) this.data.metadata = {} as any;
    this.data.metadata.workCount = count;
    return this;
  }

  withColor(color: string): this {
    if (!this.data.metadata) this.data.metadata = {} as any;
    this.data.metadata.color = color;
    return this;
  }

  withIcon(icon: string): this {
    if (!this.data.metadata) this.data.metadata = {} as any;
    this.data.metadata.icon = icon;
    return this;
  }

  withSize(size: number): this {
    if (!this.data.metadata) this.data.metadata = {} as any;
    this.data.metadata.size = size;
    return this;
  }

  withImportance(importance: number): this {
    if (!this.data.metadata) this.data.metadata = {} as any;
    this.data.metadata.importance = importance;
    return this;
  }

  asSubject(): this {
    return this.withType(NodeType.SUBJECT)
      .withLevel(0)
      .withColor('#ef4444')
      .withIcon('📚')
      .withSize(50);
  }

  asTopic(): this {
    return this.withType(NodeType.TOPIC)
      .withLevel(1)
      .withColor('#3b82f6')
      .withIcon('📖')
      .withSize(40);
  }

  asConcept(): this {
    return this.withType(NodeType.CONCEPT)
      .withLevel(2)
      .withColor('#10b981')
      .withIcon('💡')
      .withSize(30);
  }

  asWork(): this {
    return this.withType(NodeType.WORK)
      .withLevel(3)
      .withColor('#f59e0b')
      .withIcon('📝')
      .withSize(25);
  }

  asVisible(): this {
    this.data.isVisible = true;
    return this;
  }

  asHidden(): this {
    this.data.isVisible = false;
    return this;
  }

  asLocked(): this {
    this.data.isLocked = true;
    return this;
  }

  asUnlocked(): this {
    this.data.isLocked = false;
    return this;
  }

  build(): GraphNode {
    return { ...this.data } as GraphNode;
  }
}

// 图边构建器
export class GraphEdgeBuilder implements Builder<GraphEdge> {
  private data: Partial<GraphEdge> = {};
  private static sequence = 0;

  constructor() {
    this.reset();
  }

  reset(): this {
    GraphEdgeBuilder.sequence++;
    this.data = {
      id: `edge_${GraphEdgeBuilder.sequence}`,
      source: '',
      target: '',
      type: EdgeType.CONTAINS,
      weight: 1,
      metadata: {
        strength: 1,
        description: `Edge ${GraphEdgeBuilder.sequence}`,
        color: '#6b7280',
        style: 'solid',
        animated: false,
        createdAt: new Date(),
      },
      isVisible: true,
      isDirected: true,
    };
    return this;
  }

  withId(id: string): this {
    this.data.id = id;
    return this;
  }

  withSource(source: string): this {
    this.data.source = source;
    return this;
  }

  withTarget(target: string): this {
    this.data.target = target;
    return this;
  }

  between(source: string, target: string): this {
    return this.withSource(source).withTarget(target);
  }

  withType(type: EdgeType): this {
    this.data.type = type;
    return this;
  }

  withWeight(weight: number): this {
    this.data.weight = weight;
    return this;
  }

  withStrength(strength: number): this {
    if (!this.data.metadata) this.data.metadata = {} as any;
    this.data.metadata.strength = strength;
    return this;
  }

  withColor(color: string): this {
    if (!this.data.metadata) this.data.metadata = {} as any;
    this.data.metadata.color = color;
    return this;
  }

  withStyle(style: 'solid' | 'dashed' | 'dotted'): this {
    if (!this.data.metadata) this.data.metadata = {} as any;
    this.data.metadata.style = style;
    return this;
  }

  asAnimated(): this {
    if (!this.data.metadata) this.data.metadata = {} as any;
    this.data.metadata.animated = true;
    return this;
  }

  asStatic(): this {
    if (!this.data.metadata) this.data.metadata = {} as any;
    this.data.metadata.animated = false;
    return this;
  }

  asContains(): this {
    return this.withType(EdgeType.CONTAINS)
      .withColor('#10b981')
      .withStyle('solid');
  }

  asRelates(): this {
    return this.withType(EdgeType.RELATES_TO)
      .withColor('#3b82f6')
      .withStyle('dashed');
  }

  asExtends(): this {
    return this.withType(EdgeType.EXTENDS)
      .withColor('#f59e0b')
      .withStyle('dotted');
  }

  asDirected(): this {
    this.data.isDirected = true;
    return this;
  }

  asUndirected(): this {
    this.data.isDirected = false;
    return this;
  }

  asVisible(): this {
    this.data.isVisible = true;
    return this;
  }

  asHidden(): this {
    this.data.isVisible = false;
    return this;
  }

  build(): GraphEdge {
    return { ...this.data } as GraphEdge;
  }
}

// 知识图谱构建器
export class KnowledgeGraphBuilder implements Builder<KnowledgeGraph> {
  private data: Partial<KnowledgeGraph> = {};
  private static sequence = 0;

  constructor() {
    this.reset();
  }

  reset(): this {
    KnowledgeGraphBuilder.sequence++;
    this.data = {
      _id: new ObjectId(),
      userId: new ObjectId(),
      name: `Graph ${KnowledgeGraphBuilder.sequence}`,
      description: `Test knowledge graph ${KnowledgeGraphBuilder.sequence}`,
      type: GraphType.CUSTOM,
      subject: '数学',
      gradeLevel: '初中',
      nodes: [],
      edges: [],
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
    };
    return this;
  }

  withId(id: ObjectId): this {
    this.data._id = id;
    return this;
  }

  withUserId(userId: ObjectId): this {
    this.data.userId = userId;
    return this;
  }

  withName(name: string): this {
    this.data.name = name;
    return this;
  }

  withDescription(description: string): this {
    this.data.description = description;
    return this;
  }

  withType(type: GraphType): this {
    this.data.type = type;
    return this;
  }

  withSubject(subject: string): this {
    this.data.subject = subject;
    return this;
  }

  withGradeLevel(gradeLevel: string): this {
    this.data.gradeLevel = gradeLevel;
    return this;
  }

  withNodes(nodes: GraphNode[]): this {
    this.data.nodes = [...nodes];
    return this;
  }

  addNode(node: GraphNode): this {
    if (!this.data.nodes) this.data.nodes = [];
    this.data.nodes.push(node);
    return this;
  }

  withEdges(edges: GraphEdge[]): this {
    this.data.edges = [...edges];
    return this;
  }

  addEdge(edge: GraphEdge): this {
    if (!this.data.edges) this.data.edges = [];
    this.data.edges.push(edge);
    return this;
  }

  withLayout(layout: GraphLayout): this {
    if (!this.data.layout) this.data.layout = {} as any;
    this.data.layout.type = layout;
    return this;
  }

  asPublic(): this {
    this.data.isPublic = true;
    return this;
  }

  asPrivate(): this {
    this.data.isPublic = false;
    return this;
  }

  asMathGraph(): this {
    return this.withSubject('数学')
      .withName('数学知识图谱')
      .withDescription('数学学科的知识结构图');
  }

  asChineseGraph(): this {
    return this.withSubject('语文')
      .withName('语文知识图谱')
      .withDescription('语文学科的知识结构图');
  }

  withSimpleHierarchy(): this {
    const nodeBuilder = new GraphNodeBuilder();
    const edgeBuilder = new GraphEdgeBuilder();

    const subject = nodeBuilder.asSubject().withLabel('数学').build();
    const topic = nodeBuilder.asTopic().withLabel('代数').withParent(subject.id).build();
    const concept = nodeBuilder.asConcept().withLabel('二次函数').withParent(topic.id).build();

    const edge1 = edgeBuilder.asContains().between(subject.id, topic.id).build();
    const edge2 = edgeBuilder.asContains().between(topic.id, concept.id).build();

    return this.withNodes([subject, topic, concept])
      .withEdges([edge1, edge2]);
  }

  build(): KnowledgeGraph {
    return { ...this.data } as KnowledgeGraph;
  }
}

// 构建器工厂 - 提供统一的构建器创建接口
export class TestDataBuilder {
  static user(): UserBuilder {
    return new UserBuilder();
  }

  static card(): TeachingCardBuilder {
    return new TeachingCardBuilder();
  }

  static work(): WorkBuilder {
    return new WorkBuilder();
  }

  static node(): GraphNodeBuilder {
    return new GraphNodeBuilder();
  }

  static edge(): GraphEdgeBuilder {
    return new GraphEdgeBuilder();
  }

  static graph(): KnowledgeGraphBuilder {
    return new KnowledgeGraphBuilder();
  }

  /**
   * 重置所有构建器的序列号
   */
  static resetSequences(): void {
    (UserBuilder as any).sequence = 0;
    (TeachingCardBuilder as any).sequence = 0;
    (WorkBuilder as any).sequence = 0;
    (GraphNodeBuilder as any).sequence = 0;
    (GraphEdgeBuilder as any).sequence = 0;
    (KnowledgeGraphBuilder as any).sequence = 0;
  }
}

// 默认导出
export const testDataBuilder = TestDataBuilder;
