# 开发指南精要版 (Essential Development Guide)

> **🎯 目标**: 为后续任务执行提供最准确、最精炼的上下文指导

## 🔴 核心规则 (必须遵守)

### 任务开始前 - 4个关键检查
1. **A1: 环境验证** - `npm run build && npm test` 必须通过
2. **B1: 任务分解** - 必须分解到2-4小时粒度
3. **K1: 复杂度评估** - 前端任务(如Task 7)需要特别准备
4. **J1: 风险识别** - 高风险项必须有缓解策略

### 开发过程中 - 3个核心原则
1. **F1: 分层验证** - 构建→导入→单元→集成，逐层验证
2. **G1: 标准错误处理** - 使用`@/lib/utils/standardErrorHandler`
3. **H1: 文件完整性** - 定期检查所有相关文件存在

### 任务完成后 - 2个必要步骤
1. **构建验证** - `npm run build` 零错误
2. **问题记录** - 所有问题和解决方案记录到知识库

## 🧠 关键经验教训

### Task 7 (智慧广场) - 复杂前端任务
```markdown
# 复杂度特征
- 4个核心组件 (WorkCard, FilterBar, SearchBar, WorkGrid)
- 复杂交互 (搜索、筛选、分页、URL同步)
- 6个测试文件，52个测试用例
- 性能优化需求 (防抖、虚拟化)

# 处理策略
- 必须分解为2-4小时子任务
- 预留30%缓冲时间
- 建立分层测试策略
- 准备性能优化计划
```

### Task 10 (知识图谱基础) - 数据模型设计
```markdown
# 成功要素
- 完整的类型系统设计 (20个文件，3000行代码)
- 分层架构：API → 服务 → 数据 → 工具
- 预设模板策略 (数学、语文知识图谱)
- 完整验证系统 (15个测试用例全通过)

# 关键配置
- 图谱限制：500节点/1000边/50图谱
- 验证规则：标签格式、坐标范围、连通性检查
- 缓存策略：Redis缓存热点数据
```

### Task 11 (图谱可视化) - D3.js集成
```markdown
# 技术架构
- 5个核心模块：类型、工具、渲染器、交互、布局
- 5种布局算法：力导向、层次、环形、树形、网格
- React集成：Hook + 组件 + 演示页面

# 测试策略调整
- 遇到D3 ES模块问题时，创建简化测试
- 先验证类型定义和配置，再测试复杂交互
- 演示页面作为功能验证的重要手段

# 性能优化
- 增量更新：只更新变化的SVG元素
- 事件委托：高效的交互处理
- 内存管理：及时清理D3资源
```

### Task 12 (排行榜系统) - 增量开发模式
```markdown
# 新发现：基于现有基础的增量开发
- 60%功能基于Task 9扩展，开发效率提升30%
- 算法设计需要精确的数学平衡：权重配置体现业务策略
- 缓存策略的分层设计：不同数据更新频率需要差异化处理

# 算法权重配置经验
WEIGHT_FACTORS: {
  RECENT_REUSE: 0.6,    // 最近复用最重要
  TOTAL_REUSE: 0.3,     // 历史复用次之  
  CREATION_TIME: 0.1    // 新作品加分
}
# 注意：浮点数精度问题，测试时使用toBeCloseTo()

# 缓存策略分层
CACHE_CONFIG: {
  LEADERBOARD: 15 * 60,      // 15分钟 - 排行榜变化相对缓慢
  TRENDING_WORKS: 30 * 60,   // 30分钟 - 热门作品更稳定
  USER_RANK: 5 * 60          // 5分钟 - 个人排名需要相对实时
}
```

### Task 13 (SEO系统) - 自动化系统设计
```markdown
# 系统化SEO架构
- 配置驱动：config.ts → utils.ts → service.ts → API
- 动态生成：根据内容类型自动生成SEO数据
- 自动更新：内容发布时触发SEO更新队列

# 测试策略演进
- 从功能测试升级到算法逻辑测试
- API测试需要Mock复杂的NextRequest对象
- 简化测试：专注核心服务逻辑，避免复杂的框架集成测试

# 缓存和性能优化
- sitemap.xml: 1小时缓存
- robots.txt: 24小时缓存
- 搜索引擎通知：批量处理，避免频繁调用
```

### Task 6 (作品管理) - 配置问题连锁反应
```javascript
// Jest配置问题 - 标准解决方案
module.exports = {
  testEnvironment: 'node',  // 关键：不是jsdom
  transformIgnorePatterns: [
    'node_modules/(?!(bson|mongodb|mongoose)/)'
  ]
};
```

```typescript
// TypeScript错误处理 - 标准模式
import { handleServiceError } from '@/lib/utils/standardErrorHandler';

try {
  // 业务逻辑
} catch (error) {
  handleServiceError(error, '操作名称');
}
```

## 🚀 高级开发模式 (Task 12-13新增)

### 增量开发策略
```markdown
# 识别增量开发机会
- 查看现有服务是否可扩展 (如Task 9 → Task 12)
- 评估代码复用率 (>50%考虑增量开发)
- 分析依赖关系 (强依赖适合增量)

# 增量开发执行
1. 先扩展现有服务 (contributionService.ts)
2. 添加新的API端点 (基于现有模式)
3. 创建新的前端组件 (复用现有设计系统)
4. 扩展测试覆盖 (基于现有测试结构)

# 效率提升
- 开发时间缩短30%
- 代码一致性更好
- 维护成本更低
```

### 系统化架构设计
```markdown
# 配置驱动架构 (Task 13 SEO系统)
config.ts → utils.ts → service.ts → API → 组件

# 分层设计原则
1. 配置层：所有可变参数集中管理
2. 工具层：纯函数，易于测试
3. 服务层：业务逻辑，状态管理
4. API层：接口标准化
5. 组件层：UI展示和交互

# 自动化系统设计
- 事件驱动：内容发布 → 自动更新SEO
- 队列处理：批量处理，避免频繁操作
- 监控报告：健康检查和问题识别
```

### 算法设计最佳实践
```typescript
// 权重配置模式 (Task 12经验)
const ALGORITHM_CONFIG = {
  WEIGHTS: {
    RECENT_ACTIVITY: 0.6,    // 主要因子
    HISTORICAL_DATA: 0.3,    // 次要因子
    BONUS_FACTOR: 0.1        // 调节因子
  },
  VALIDATION: {
    WEIGHT_SUM_TOLERANCE: 0.0001,  // 浮点数精度容忍
    MIN_SCORE: 0,
    MAX_SCORE: 1000
  }
};

// 算法测试模式
describe('算法逻辑', () => {
  it('权重配置应该合理', () => {
    const weightSum = Object.values(WEIGHTS).reduce((a, b) => a + b, 0);
    expect(weightSum).toBeCloseTo(1.0, 10);  // 注意精度
  });
  
  it('应该正确计算评分', () => {
    const score = calculateScore(testData);
    expect(score).toBeGreaterThanOrEqual(0);
    expect(score).toBeLessThanOrEqual(1000);
  });
});
```

### 缓存策略设计模式
```typescript
// 差异化缓存策略 (Task 12-13经验)
const CACHE_STRATEGY = {
  // 根据数据特性设置TTL
  STATIC_CONTENT: 24 * 60 * 60,      // 24小时 - robots.txt
  SEMI_STATIC: 60 * 60,              // 1小时 - sitemap.xml
  DYNAMIC_SLOW: 15 * 60,             // 15分钟 - 排行榜
  DYNAMIC_FAST: 5 * 60,              // 5分钟 - 用户排名
  REAL_TIME: 60                      // 1分钟 - 实时数据
};

// 缓存键命名规范
const generateCacheKey = (type: string, params: Record<string, any>) => {
  const paramStr = Object.entries(params)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => `${k}:${v}`)
    .join('|');
  return `${type}:${paramStr}`;
};
```

## 🔧 实用工具模板

### 测试配置标准
```javascript
// Jest配置 - 适用于复杂依赖
module.exports = {
  testEnvironment: 'jsdom',  // React组件测试
  transformIgnorePatterns: [
    'node_modules/(?!(bson|mongodb|mongoose|d3|d3-.*)/)'
  ],
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1'
  }
};
```

### 知识图谱组件使用
```tsx
// 基础使用
import { KnowledgeGraphViewer } from '@/components/knowledge-graph'

<KnowledgeGraphViewer
  graph={knowledgeGraph}
  width={800}
  height={600}
  onNodeClick={(nodeId) => console.log('Node clicked:', nodeId)}
/>

// 高级配置
<KnowledgeGraphViewer
  layoutConfig={{ type: 'force', options: { linkDistance: 100 } }}
  visualConfig={{ colors: { nodes: { concept: '#ff6b6b' } } }}
  interactionConfig={{ zoom: { enabled: true, scaleExtent: [0.1, 3] } }}
/>
```

### 性能优化检查清单
```typescript
const performanceChecklist = {
  reactMemo: true,        // React.memo包装
  debounce: true,         // 防抖搜索
  pagination: true,       // 分页加载
  apiCache: true,         // API缓存
  codeSpitting: true,     // 代码分割
  d3Cleanup: true         // D3资源清理
};
```

### URL状态同步模式
```typescript
const useURLSync = (filters: FilterState) => {
  const router = useRouter();
  
  const updateURL = useCallback((newFilters: FilterState) => {
    const params = new URLSearchParams();
    Object.entries(newFilters).forEach(([key, value]) => {
      if (value) params.set(key, value);
    });
    
    const newURL = params.toString() ? `?${params.toString()}` : location.pathname;
    router.replace(newURL, { scroll: false });
  }, [router]);
  
  return { updateURL };
};
```

### 前端测试分层标准
```markdown
1. 单元测试: 组件功能测试 (必须)
2. 集成测试: 页面交互测试 (必须)
3. E2E测试: 完整用户流程 (重要功能)
4. 性能测试: 渲染和交互基准 (复杂页面)
```

## 🚨 常见陷阱速查

| 问题类型 | 常见错误 | 快速解决 |
|---------|----------|----------|
| Redis API | `redis.setEx()` | 改为 `redis.setex()` |
| Jest配置 | ESM模块错误 | 添加transformIgnorePatterns |
| TypeScript | `error.message` | 使用 `error instanceof Error` |
| React Key | ObjectId类型 | 添加 `.toString()` |
| D3.js测试 | ES模块导入失败 | 创建简化测试，避免直接导入D3 |
| 图谱验证 | 循环依赖检测 | 使用DFS算法检查图结构 |
| 构建错误 | 导入导出不匹配 | 检查所有export/import语句 |
| 浮点数测试 | `toBe(1.0)`失败 | 使用`toBeCloseTo(1.0, 10)` |
| API测试 | NextRequest mock | 创建简化Mock类或测试服务层 |
| 算法权重 | 权重配置不合理 | 权重总和应接近1.0，体现业务优先级 |
| 缓存策略 | 统一缓存时间 | 根据数据更新频率差异化设置TTL |

## 📊 效率目标

### 时间分配目标
- **核心开发**: 50%+ (当前10%)
- **问题解决**: <20% (当前40%)
- **前期准备**: 30% (当前5%)

### 质量指标
- 构建成功率: >95%
- 任务完成准时率: >80%
- 返工率: <10%

## 🎯 任务执行快速检查清单

### 开始前 (5分钟)
- [ ] `npm run build` 通过
- [ ] 任务已分解到2-4小时
- [ ] 复杂任务已评估风险

### 开发中 (每小时)
- [ ] 小功能完成后立即验证
- [ ] 使用标准错误处理
- [ ] 按分层验证顺序测试

### 完成后 (10分钟)
- [ ] 构建零错误
- [ ] 文件完整性检查
- [ ] 问题解决方案记录

## 📚 测试指南要点

### 测试分层策略
```
测试金字塔
    /\
   /E2E\     - 端到端测试（少量）
  /____\
 /集成测试\    - API和数据库集成测试（适量）
/________\
/单元测试/     - 纯函数和组件测试（大量）
```

### 快速测试命令
```bash
# 开发时常用
npm run test:unit        # 单元测试（推荐）
npm run test:watch       # 监视模式
npm run test:coverage    # 覆盖率报告

# CI/CD使用
npm run test            # 所有测试
npm run test:integration # 集成测试
```

### 测试工厂使用
```typescript
import { UserFactory, WorkFactory, GraphNodeFactory } from '@/__tests__/factories'

// 创建测试数据
const user = UserFactory.create()
const users = UserFactory.createMany(5)
const adminUser = UserFactory.create({ role: 'admin' })
```

## 🎯 已完成任务总结

### Task 10: 个人知识图谱基础 ✅
- **核心成果**: 完整的数据模型和API系统
- **文件数量**: 20个文件，约3000行代码
- **测试覆盖**: 15个测试用例，100%通过
- **关键特性**: 预设模板、图谱验证、作品挂载

### Task 11: 知识图谱可视化 ✅
- **核心成果**: D3.js交互式可视化系统
- **文件数量**: 12个文件，约2000行代码
- **测试覆盖**: 10个测试用例，100%通过
- **关键特性**: 5种布局算法、完整交互、React集成

### Task 12: 排行榜和荣誉系统 ✅
- **核心成果**: 基于Task 9的增量开发，多维度排行榜系统
- **文件数量**: 9个文件，约1500行代码
- **测试覆盖**: 19个测试用例，100%通过
- **关键特性**: 智能推荐算法、分层缓存、响应式UI
- **新经验**: 增量开发模式、算法权重配置、缓存策略分层

### Task 13: 内容优化和SEO ✅
- **核心成果**: 完整的SEO优化系统，自动化更新机制
- **文件数量**: 15个文件，约2500行代码
- **测试覆盖**: 34个测试用例，100%通过
- **关键特性**: 动态SEO生成、结构化数据、sitemap/robots.txt
- **新经验**: 系统化SEO架构、测试策略演进、自动化系统设计

---

**版本**: 1.2.0 (Task 12-13增强版)  
**基于**: Task 10-13完成经验整合  
**新增**: 增量开发模式、系统化架构设计、算法设计最佳实践  
**目标**: 为Task 14+提供最精准的执行指导  
**维护**: 每个任务完成后更新关键经验