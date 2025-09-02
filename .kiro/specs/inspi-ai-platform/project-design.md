# 设计文档

## 概述

Inspi.AI平台采用现代化的Web应用架构，以React/Next.js为前端框架，Node.js/Express为后端API，MongoDB为主数据库，Redis用于缓存和会话管理。平台设计围绕核心价值循环，确保用户体验流畅且功能模块间紧密集成。

### 核心设计原则

1. **以教师为中心**：所有功能设计都优先考虑教师的创作体验和工作流程
2. **简约而不简单**：界面简洁但功能强大，避免认知负担
3. **社区驱动**：通过致敬系统和贡献度机制促进知识共享
4. **渐进式体验**：未登录用户可浏览，登录后解锁创作功能
5. **移动优先**：响应式设计，支持多设备访问

## 架构设计

### 系统架构图

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   前端应用       │    │   API网关        │    │   微服务集群     │
│   (Next.js)     │◄──►│   (Express)     │◄──►│   (Node.js)     │
│                 │    │                 │    │                 │
│ - 用户界面       │    │ - 路由管理       │    │ - 用户服务       │
│ - 状态管理       │    │ - 身份验证       │    │ - 内容服务       │
│ - 客户端缓存     │    │ - 限流控制       │    │ - AI服务        │
└─────────────────┘    └─────────────────┘    │ - 通知服务       │
                                              └─────────────────┘
                                                       │
                       ┌─────────────────┐    ┌─────────────────┐
                       │   缓存层         │    │   数据层         │
                       │   (Redis)       │    │   (MongoDB)     │
                       │                 │    │                 │
                       │ - 会话存储       │    │ - 用户数据       │
                       │ - 热点数据       │    │ - 内容数据       │
                       │ - 限流计数       │    │ - 图谱数据       │
                       └─────────────────┘    └─────────────────┘
```

### 技术栈选择

**前端技术栈：**
- Next.js 14 (React 18) - 服务端渲染，SEO优化
- TypeScript - 类型安全
- Tailwind CSS - 快速样式开发
- Zustand - 轻量级状态管理
- React Query - 数据获取和缓存
- D3.js - 知识图谱可视化
- Framer Motion - 动画效果

**后端技术栈：**
- Node.js + Express - API服务
- TypeScript - 类型安全
- MongoDB + Mongoose - 数据存储
- Redis - 缓存和会话
- JWT - 身份验证
- Google OAuth 2.0 - 第三方登录
- Gemini API - AI内容生成

**基础设施：**
- Docker - 容器化部署
- Nginx - 反向代理和负载均衡
- PM2 - 进程管理
- Winston - 日志管理

## 组件与接口设计

### 前端组件架构

```
src/
├── components/
│   ├── common/           # 通用组件
│   │   ├── Header.tsx
│   │   ├── Footer.tsx
│   │   ├── Loading.tsx
│   │   └── Modal.tsx
│   ├── auth/            # 认证相关
│   │   ├── LoginModal.tsx
│   │   └── AuthGuard.tsx
│   ├── magic/           # AI魔法师
│   │   ├── KnowledgeInput.tsx
│   │   ├── CardGenerator.tsx
│   │   ├── CardEditor.tsx
│   │   └── PublishModal.tsx
│   ├── square/          # 智慧广场
│   │   ├── WorkCard.tsx
│   │   ├── FilterBar.tsx
│   │   ├── WorkDetail.tsx
│   │   └── ReuseButton.tsx
│   ├── profile/         # 个人中心
│   │   ├── KnowledgeGraph.tsx
│   │   ├── WorkList.tsx
│   │   └── ContributionStats.tsx
│   └── subscription/    # 订阅管理
│       ├── PlanCard.tsx
│       └── UsageStats.tsx
├── pages/
│   ├── index.tsx        # AI教学魔法师
│   ├── square.tsx       # 智慧广场
│   ├── profile/[id].tsx # 个人主页
│   └── subscription.tsx # 订阅管理
├── hooks/               # 自定义Hooks
├── utils/               # 工具函数
├── types/               # TypeScript类型定义
└── stores/              # 状态管理
```

### 核心API接口设计

#### 用户认证接口
```typescript
// POST /api/auth/login
interface LoginRequest {
  email: string;
  password?: string;
  googleToken?: string;
}

interface LoginResponse {
  token: string;
  user: UserProfile;
  subscription: SubscriptionInfo;
}

// GET /api/auth/me
interface UserProfile {
  id: string;
  email: string;
  name: string;
  avatar?: string;
  createdAt: Date;
  contributionScore: number;
}
```

#### AI内容生成接口
```typescript
// POST /api/magic/generate
interface GenerateRequest {
  knowledgePoint: string;
  subject?: string;
  gradeLevel?: string;
}

interface GenerateResponse {
  cards: TeachingCard[];
  sessionId: string;
}

interface TeachingCard {
  id: string;
  type: 'visualization' | 'analogy' | 'thinking' | 'interaction';
  title: string;
  content: string;
  editable: boolean;
}

// POST /api/magic/regenerate
interface RegenerateRequest {
  sessionId: string;
  cardId: string;
  instruction?: string;
}
```

#### 作品管理接口
```typescript
// POST /api/works
interface CreateWorkRequest {
  title: string;
  knowledgePoint: string;
  subject: string;
  gradeLevel: string;
  cards: TeachingCard[];
  tags?: string[];
}

// GET /api/works
interface WorksListResponse {
  works: WorkSummary[];
  pagination: PaginationInfo;
  filters: FilterOptions;
}

interface WorkSummary {
  id: string;
  title: string;
  author: AuthorInfo;
  knowledgePoint: string;
  subject: string;
  reuseCount: number;
  createdAt: Date;
  thumbnail?: string;
}
```

#### 知识图谱接口
```typescript
// GET /api/profile/:userId/knowledge-graph
interface KnowledgeGraphResponse {
  nodes: GraphNode[];
  edges: GraphEdge[];
  metadata: GraphMetadata;
}

interface GraphNode {
  id: string;
  label: string;
  type: 'subject' | 'topic' | 'work';
  position: { x: number; y: number };
  data: {
    workCount?: number;
    reuseCount?: number;
    color?: string;
  };
}

interface GraphEdge {
  source: string;
  target: string;
  type: 'contains' | 'relates' | 'extends';
  weight?: number;
}
```

## 数据模型设计

### 用户模型 (User)
```typescript
interface User {
  _id: ObjectId;
  email: string;
  name: string;
  avatar?: string;
  googleId?: string;
  subscription: {
    plan: 'free' | 'pro' | 'super';
    expiresAt?: Date;
    autoRenew: boolean;
  };
  usage: {
    dailyGenerations: number;
    dailyReuses: number;
    lastResetDate: Date;
  };
  contributionScore: number;
  createdAt: Date;
  updatedAt: Date;
}
```

### 作品模型 (Work)
```typescript
interface Work {
  _id: ObjectId;
  title: string;
  knowledgePoint: string;
  subject: string;
  gradeLevel: string;
  author: ObjectId;
  cards: TeachingCard[];
  tags: string[];
  reuseCount: number;
  originalWork?: ObjectId; // 如果是复用作品，指向原作品
  attribution: Attribution[];
  status: 'draft' | 'published' | 'archived';
  createdAt: Date;
  updatedAt: Date;
}

interface Attribution {
  originalAuthor: ObjectId;
  originalWorkId: ObjectId;
  originalWorkTitle: string;
}
```

### 知识图谱模型 (KnowledgeGraph)
```typescript
interface KnowledgeGraph {
  _id: ObjectId;
  userId: ObjectId;
  type: 'preset' | 'custom';
  subject?: string;
  nodes: GraphNode[];
  edges: GraphEdge[];
  layout: 'force' | 'hierarchical' | 'circular';
  createdAt: Date;
  updatedAt: Date;
}

interface WorkMount {
  _id: ObjectId;
  userId: ObjectId;
  workId: ObjectId;
  graphId: ObjectId;
  nodeId: string;
  createdAt: Date;
}
```

### 贡献度记录模型 (ContributionLog)
```typescript
interface ContributionLog {
  _id: ObjectId;
  userId: ObjectId;
  type: 'creation' | 'reuse';
  points: number;
  workId: ObjectId;
  relatedUserId?: ObjectId; // 复用时的原作者
  createdAt: Date;
}
```

## 核心功能设计

### 1. AI教学魔法师

#### 工作流程设计
1. **输入阶段**：用户输入知识点，可选择学科和学段
2. **生成阶段**：调用Gemini API生成四种类型卡片
3. **编辑阶段**：用户可编辑每张卡片或要求重新生成
4. **发布阶段**：组合卡片成作品，添加标题和标签

#### Gemini API集成策略
```typescript
class AIService {
  private geminiClient: GoogleGenerativeAI;
  
  async generateTeachingCards(knowledgePoint: string, context: GenerationContext): Promise<TeachingCard[]> {
    const prompt = this.buildPrompt(knowledgePoint, context);
    const result = await this.geminiClient.generateContent(prompt);
    return this.parseResponse(result.response.text());
  }
  
  private buildPrompt(knowledgePoint: string, context: GenerationContext): string {
    return `
      作为一名资深教育专家，请为知识点"${knowledgePoint}"生成四种教学创意卡片：
      
      1. 可视化卡：提供一个能帮助学生在大脑中"看见"抽象概念的场景、比喻或简笔画示意
      2. 类比延展卡：提供一个能将此知识点与生活常识或其他学科知识进行巧妙类比的例子
      3. 启发思考卡：设计1-2个能够激发学生深度思考、甚至引发辩论的开放性问题
      4. 互动氛围卡：构思一个简单、有趣的课堂互动游戏或小组活动
      
      学科：${context.subject || '通用'}
      学段：${context.gradeLevel || '通用'}
      
      请以JSON格式返回，每张卡片包含type、title、content字段。
    `;
  }
}
```

### 2. 智慧广场

#### 内容展示策略
- **瀑布流布局**：响应式卡片网格，支持无限滚动
- **多维度筛选**：学科、学段、热度、时间等
- **搜索功能**：支持知识点、标题、作者搜索
- **推荐算法**：基于用户行为和内容相似度

#### 复用机制设计
```typescript
class ReuseService {
  async reuseWork(userId: string, workId: string): Promise<ReuseResult> {
    // 1. 检查用户复用限额
    await this.checkReuseLimit(userId);
    
    // 2. 复制作品卡片到用户编辑区
    const originalWork = await this.getWork(workId);
    const draftWork = await this.createDraftFromWork(userId, originalWork);
    
    // 3. 记录复用关系
    await this.recordReuse(userId, workId, originalWork.author);
    
    // 4. 更新原作者贡献度
    await this.updateContribution(originalWork.author, 'reuse', 50);
    
    return { draftId: draftWork._id, message: '复用成功，可以开始编辑了' };
  }
}
```

### 3. 个人知识图谱

#### 可视化技术选择
使用D3.js构建交互式知识图谱：

```typescript
class KnowledgeGraphRenderer {
  private svg: d3.Selection<SVGSVGElement, unknown, HTMLElement, any>;
  private simulation: d3.Simulation<GraphNode, GraphEdge>;
  
  render(data: KnowledgeGraphData) {
    this.setupSimulation(data);
    this.renderNodes(data.nodes);
    this.renderEdges(data.edges);
    this.setupInteractions();
  }
  
  private setupSimulation(data: KnowledgeGraphData) {
    this.simulation = d3.forceSimulation(data.nodes)
      .force('link', d3.forceLink(data.edges).id(d => d.id))
      .force('charge', d3.forceManyBody().strength(-300))
      .force('center', d3.forceCenter(width / 2, height / 2));
  }
  
  private setupInteractions() {
    // 节点拖拽、缩放、点击等交互
    this.svg.selectAll('.node')
      .call(d3.drag()
        .on('start', this.dragStarted)
        .on('drag', this.dragged)
        .on('end', this.dragEnded))
      .on('click', this.nodeClicked);
  }
}
```

#### 预设图谱模板
为各学科提供基于教学大纲的预设知识图谱：
- 数学：代数、几何、统计等主要分支
- 语文：文学、语法、写作等模块
- 英语：语法、词汇、听说读写等技能
- 科学：物理、化学、生物等学科

### 4. 贡献度系统

#### 积分计算逻辑
```typescript
class ContributionService {
  calculateContribution(user: User): number {
    const creationPoints = user.works.length * 10;
    const reusePoints = user.works.reduce((sum, work) => sum + work.reuseCount * 50, 0);
    return creationPoints + reusePoints;
  }
  
  async updateLeaderboard(): Promise<void> {
    // 每日更新排行榜
    const users = await User.find().populate('works');
    const rankings = users.map(user => ({
      userId: user._id,
      score: this.calculateContribution(user),
      weeklyScore: this.calculateWeeklyContribution(user)
    })).sort((a, b) => b.score - a.score);
    
    await this.cacheRankings(rankings);
  }
}
```

## 错误处理

### 前端错误处理策略
1. **网络错误**：自动重试机制，用户友好的错误提示
2. **表单验证**：实时验证，清晰的错误信息
3. **权限错误**：引导用户登录或升级订阅
4. **AI生成失败**：提供重试选项，记录错误日志

### 后端错误处理
```typescript
class ErrorHandler {
  static handle(error: Error, req: Request, res: Response, next: NextFunction) {
    if (error instanceof ValidationError) {
      return res.status(400).json({
        code: 'VALIDATION_ERROR',
        message: error.message,
        details: error.details
      });
    }
    
    if (error instanceof RateLimitError) {
      return res.status(429).json({
        code: 'RATE_LIMIT_EXCEEDED',
        message: '使用次数已达上限，请升级订阅或明天再试',
        resetTime: error.resetTime
      });
    }
    
    // 记录未知错误
    logger.error('Unhandled error:', error);
    res.status(500).json({
      code: 'INTERNAL_ERROR',
      message: '服务器内部错误，请稍后重试'
    });
  }
}
```

## 测试策略

### 测试金字塔
1. **单元测试**：工具函数、组件逻辑、API服务
2. **集成测试**：API端点、数据库操作、第三方服务
3. **端到端测试**：关键用户流程、跨浏览器兼容性

### 关键测试场景
- 用户注册登录流程
- AI内容生成和编辑
- 作品发布和复用
- 知识图谱交互
- 订阅和支付流程
- 贡献度计算准确性

### 测试工具选择
- **前端**：Jest + React Testing Library + Cypress
- **后端**：Jest + Supertest + MongoDB Memory Server
- **性能**：Lighthouse + WebPageTest
- **安全**：OWASP ZAP + Snyk

## 性能优化

### 前端优化
1. **代码分割**：按路由和功能模块分割
2. **图片优化**：WebP格式，懒加载，CDN分发
3. **缓存策略**：Service Worker，浏览器缓存
4. **包大小优化**：Tree shaking，动态导入

### 后端优化
1. **数据库优化**：索引设计，查询优化，连接池
2. **缓存策略**：Redis缓存热点数据，CDN静态资源
3. **API优化**：分页，字段选择，批量操作
4. **负载均衡**：水平扩展，健康检查

### 监控指标
- **性能指标**：响应时间，吞吐量，错误率
- **用户体验**：页面加载时间，交互响应时间
- **业务指标**：用户活跃度，内容生成量，复用率

这个设计文档提供了Inspi.AI平台的全面技术架构和实现方案，确保系统的可扩展性、可维护性和用户体验。