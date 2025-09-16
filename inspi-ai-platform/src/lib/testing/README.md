# 测试基础设施系统

本文档介绍了Inspi.AI平台的完整测试基础设施系统，该系统提供了标准化、可维护、高效的测试环境和数据管理功能。

## 概述

测试基础设施系统包含以下核心组件：

### 测试数据管理
1. **TestDataFactory** - 工厂模式实现，提供快速数据创建
2. **TestDataBuilder** - 构建器模式实现，提供流式API
3. **TestDataRelationshipManager** - 关系管理器，处理数据间的复杂关联
4. **TestDataCleanupManager** - 清理管理器，负责测试数据的生命周期管理

### Mock服务管理
5. **MockServiceManager** - 统一管理所有Mock服务
6. **MockGeminiService** - AI服务Mock实现
7. **MockEmailService** - 邮件服务Mock实现
8. **MockDatabaseService** - 数据库服务Mock实现
9. **BaseMockService** - 所有Mock服务的基类

### 测试配置管理
10. **TestConfigManager** - 统一管理Jest配置
11. **TestEnvironment** - 检测和初始化测试环境
12. **TestDatabaseManager** - 管理测试数据库连接
13. **JestConfigGenerator** - 动态生成Jest配置

## 核心特性

### ✅ 已实现的功能

#### 测试数据管理
- **标准化数据创建**: 为所有核心数据模型提供工厂函数
- **构建器模式**: 支持流式API构建复杂数据对象
- **关系管理**: 自动处理数据间的关联关系和一致性
- **数据清理**: 提供多种清理策略和自动化清理机制
- **序列号管理**: 确保测试数据的唯一性和可预测性

#### Mock服务管理
- **服务注册**: 统一注册和管理所有Mock服务
- **状态管理**: 跟踪服务状态和调用历史
- **一致性验证**: 验证所有服务的正确性和数据一致性
- **批量操作**: 支持批量重置、清理所有服务
- **错误处理**: 完善的错误处理和恢复机制

#### 通用特性
- **类型安全**: 完整的TypeScript类型支持
- **高性能**: 优化的数据创建和服务管理算法
- **可扩展**: 支持自定义数据工厂和Mock服务
- **测试隔离**: 确保测试间的完全隔离

## 快速开始

### 测试数据创建

```typescript
import { testDataFactory, testDataBuilder } from '@/lib/testing';

// 使用工厂模式创建数据
const user = testDataFactory.user.create();
const work = testDataFactory.work.createWithAuthor(user._id);

// 使用构建器模式创建数据
const customUser = testDataBuilder.user()
  .withEmail('test@example.com')
  .withName('Test User')
  .asProUser()
  .withUsage(5, 2)
  .build();
```

### Mock服务使用

```typescript
import {
  MockServiceManager,
  MockGeminiService,
  MockEmailService,
  MockDatabaseService
} from '@/lib/testing';

// 创建和注册Mock服务
const manager = MockServiceManager.getInstance();
const geminiService = new MockGeminiService();
const emailService = new MockEmailService();
const dbService = new MockDatabaseService();

manager.registerMock(geminiService, { trackCalls: true });
manager.registerMock(emailService, { trackCalls: true });
manager.registerMock(dbService, { trackCalls: true });

// 使用Mock服务
const aiResult = await geminiService.generateContent('Generate a card');
const emailResult = await emailService.sendEmail({
  to: 'test@example.com',
  subject: 'Test',
  text: 'Content'
});
const user = await dbService.create('users', { name: 'Test User' });
```

### 复杂测试场景

```typescript
// 创建用户生态系统
const { user, works } = testDataFactory.createUserWithWorks(5);

// 端到端工作流测试
describe('User Registration Workflow', () => {
  beforeEach(() => {
    manager.cleanup();
    manager.registerMock(geminiService);
    manager.registerMock(emailService);
    manager.registerMock(dbService);
  });

  it('should handle complete user registration', async () => {
    // 1. 创建用户
    const user = await dbService.create('users', {
      name: 'John Doe',
      email: 'john@example.com'
    });

    // 2. 生成欢迎内容
    const welcomeContent = await geminiService.generateContent(
      'Generate welcome message'
    );

    // 3. 发送欢迎邮件
    const emailResult = await emailService.sendEmail({
      to: user.email,
      subject: 'Welcome!',
      html: welcomeContent.content
    });

    // 验证结果
    expect(user._id).toBeTruthy();
    expect(welcomeContent.content).toBeTruthy();
    expect(emailResult.success).toBe(true);
  });
});
```

## 详细文档

### Mock服务管理系统

详细的Mock服务使用指南请参考：[Mock服务管理系统使用指南](./MOCK_SERVICES_GUIDE.md)

### 1. TestDataFactory

工厂模式实现，提供快速的数据创建功能。

#### 用户工厂 (UserFactory)

```typescript
// 基本创建
const user = testDataFactory.user.create();

// 批量创建
const users = testDataFactory.user.createMany(10);

// 创建特定订阅类型的用户
const proUser = testDataFactory.user.createWithSubscription('pro');
const freeUser = testDataFactory.user.createWithSubscription('free');

// 创建Google用户
const googleUser = testDataFactory.user.createGoogleUser();

// 创建有使用记录的用户
const activeUser = testDataFactory.user.createWithUsage(5, 2);
```

#### 作品工厂 (WorkFactory)

```typescript
// 基本创建
const work = testDataFactory.work.create();

// 创建指定作者的作品
const work = testDataFactory.work.createWithAuthor(userId);

// 创建已发布的作品
const publishedWork = testDataFactory.work.createPublished();

// 创建指定卡片数量的作品
const workWithCards = testDataFactory.work.createWithCards(5);

// 创建复用作品
const reusedWork = testDataFactory.work.createReusedWork(originalWork, newAuthorId);
```

#### 知识图谱工厂 (KnowledgeGraphFactory)

```typescript
// 基本创建
const graph = testDataFactory.graph.create();

// 创建层次结构图谱
const hierarchyGraph = testDataFactory.graph.createWithHierarchy(3, 2);

// 创建公开图谱
const publicGraph = testDataFactory.graph.createPublic();

// 创建用户图谱
const userGraph = testDataFactory.graph.createForUser(userId);
```

### 2. TestDataBuilder

构建器模式实现，提供流式API来构建复杂的数据对象。

#### 用户构建器

```typescript
const user = testDataBuilder.user()
  .withEmail('custom@example.com')
  .withName('Custom User')
  .withAvatar('https://example.com/avatar.jpg')
  .asProUser()
  .withUsage(10, 5)
  .withContributionScore(100)
  .withCreatedAt(new Date('2023-01-01'))
  .build();
```

#### 作品构建器

```typescript
const work = testDataBuilder.work()
  .withTitle('Advanced Mathematics')
  .withKnowledgePoint('Quadratic Functions')
  .withAuthor(userId)
  .asMathWork()
  .asPublished()
  .withCompleteCardSet()
  .addTag('advanced')
  .addTag('functions')
  .withReuseCount(25)
  .build();
```

#### 知识图谱构建器

```typescript
const graph = testDataBuilder.graph()
  .withUserId(userId)
  .withName('Mathematics Knowledge Graph')
  .asMathGraph()
  .withSimpleHierarchy()
  .asPublic()
  .withLayout(GraphLayout.HIERARCHICAL)
  .build();
```

### 3. TestDataRelationshipManager

管理测试数据之间的复杂关联关系。

```typescript
import { testDataRelationshipManager } from '@/lib/testing';

// 建立用户-作品关系
const user = testDataFactory.user.create();
const work = testDataFactory.work.create();
testDataRelationshipManager.establishUserWorkRelationship(user, work);

// 建立作品复用关系
const originalWork = testDataFactory.work.createPublished();
const reusedWork = testDataFactory.work.create();
testDataRelationshipManager.establishWorkReuseRelationship(originalWork, reusedWork);

// 创建复杂生态系统
const collection = testDataRelationshipManager.createUserEcosystem({
  userCount: 10,
  worksPerUser: 5,
  graphsPerUser: 2,
  reuseRate: 0.3,
});

// 验证数据完整性
const validation = testDataRelationshipManager.validateDataIntegrity();
if (!validation.valid) {
  console.error('Data integrity issues:', validation.errors);
}
```

### 4. TestDataCleanupManager

管理测试数据的生命周期和清理。

```typescript
import { createTestDataCleanupManager, CleanupStrategy, CleanupScope } from '@/lib/testing';

const collection = testDataRelationshipManager.getCollection();
const cleanupManager = createTestDataCleanupManager(collection);

// 立即清理所有数据
const stats = await cleanupManager.cleanupNow({
  strategy: CleanupStrategy.IMMEDIATE,
  scope: CleanupScope.ALL,
});

// 调度清理任务
const taskId = cleanupManager.scheduleCleanup({
  strategy: CleanupStrategy.TTL,
  scope: CleanupScope.ORPHANED,
  ttl: 24 * 60 * 60 * 1000, // 24小时
});

// 设置测试钩子
const hooks = cleanupManager.setupTestHooks();

// 在Jest测试中使用
beforeEach(hooks.beforeEach);
afterEach(hooks.afterEach);
afterAll(hooks.afterAll);
```

## 最佳实践

### 1. 测试隔离

```typescript
describe('User Service Tests', () => {
  let factory: TestDataFactory;
  
  beforeEach(() => {
    factory = new TestDataFactory();
    factory.resetSequences();
  });
  
  it('should create user', () => {
    const user = factory.user.create();
    // 测试逻辑
  });
});
```

### 2. 数据关系管理

```typescript
describe('Work Reuse Tests', () => {
  beforeEach(() => {
    testDataRelationshipManager.clear();
  });
  
  it('should handle work reuse correctly', () => {
    const originalUser = testDataFactory.user.create();
    const newUser = testDataFactory.user.create();
    const originalWork = testDataFactory.work.createWithAuthor(originalUser._id);
    
    testDataRelationshipManager.establishUserWorkRelationship(originalUser, originalWork);
    
    const reusedWork = testDataFactory.work.createReusedWork(originalWork, newUser._id);
    testDataRelationshipManager.establishWorkReuseRelationship(originalWork, reusedWork);
    
    // 验证关系
    expect(reusedWork.originalWork).toEqual(originalWork._id);
    expect(originalWork.reuseCount).toBe(1);
  });
});
```

### 3. 性能优化

```typescript
// 批量创建数据
const users = testDataFactory.user.createMany(100);
const works = testDataFactory.work.createMany(500);

// 使用关系管理器创建复杂场景
const ecosystem = testDataRelationshipManager.createUserEcosystem({
  userCount: 50,
  worksPerUser: 10,
  graphsPerUser: 2,
  reuseRate: 0.2,
});
```

### 4. 清理策略

```typescript
// 测试后自动清理
cleanupManager.setDefaultConfig({
  strategy: CleanupStrategy.AFTER_TEST,
  scope: CleanupScope.ALL,
});

// 保留特定数据
await cleanupManager.cleanupNow({
  scope: CleanupScope.ALL,
  preservePatterns: [
    'important_user_.*',
    'critical_work_.*',
  ],
});
```

## 扩展指南

### 添加新的数据工厂

1. 在 `TestDataFactory.ts` 中添加新的工厂类：

```typescript
export class NewModelFactory implements TestDataFactory<NewModel> {
  create(overrides: Partial<NewModel> = {}): NewModel {
    // 实现创建逻辑
  }
  
  createMany(count: number, overrides: Partial<NewModel> = {}): NewModel[] {
    return Array.from({ length: count }, () => this.create(overrides));
  }
}
```

2. 在主工厂类中添加实例：

```typescript
export class TestDataFactory {
  public readonly newModel = new NewModelFactory();
  // ...
}
```

### 添加新的构建器

1. 在 `TestDataBuilder.ts` 中添加新的构建器类：

```typescript
export class NewModelBuilder implements Builder<NewModel> {
  private data: Partial<NewModel> = {};
  
  reset(): this {
    // 重置数据
    return this;
  }
  
  withProperty(value: any): this {
    this.data.property = value;
    return this;
  }
  
  build(): NewModel {
    return { ...this.data } as NewModel;
  }
}
```

2. 在构建器工厂中添加方法：

```typescript
export class TestDataBuilder {
  static newModel(): NewModelBuilder {
    return new NewModelBuilder();
  }
}
```

## 故障排除

### 常见问题

1. **序列号不重置**
   ```typescript
   // 确保在每个测试前重置序列号
   beforeEach(() => {
     testDataFactory.resetSequences();
   });
   ```

2. **内存泄漏**
   ```typescript
   // 使用清理管理器自动清理
   afterEach(async () => {
     await cleanupManager.cleanupNow();
   });
   ```

3. **关系不一致**
   ```typescript
   // 使用关系管理器验证数据完整性
   const validation = testDataRelationshipManager.validateDataIntegrity();
   expect(validation.valid).toBe(true);
   ```

### 调试技巧

1. **启用详细日志**
   ```typescript
   const stats = await cleanupManager.cleanupNow({
     onCleanup: (stats) => console.log('Cleanup stats:', stats),
   });
   ```

2. **检查数据统计**
   ```typescript
   const collection = testDataRelationshipManager.getCollection();
   console.log('Collection stats:', collection.getStats());
   ```

3. **验证数据完整性**
   ```typescript
   const validation = testDataRelationshipManager.validateDataIntegrity();
   if (!validation.valid) {
     console.error('Validation errors:', validation.errors);
   }
   ```

## 贡献指南

1. 遵循现有的代码风格和模式
2. 为新功能添加完整的测试覆盖
3. 更新相关文档
4. 确保向后兼容性
5. 提交前运行所有测试

## 许可证

本项目采用 MIT 许可证。详见 LICENSE 文件。