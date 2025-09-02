# 测试最佳实践指南

## 📋 目录

1. [测试原则](#测试原则)
2. [测试策略](#测试策略)
3. [代码质量](#代码质量)
4. [性能优化](#性能优化)
5. [团队协作](#团队协作)
6. [持续改进](#持续改进)

## 🎯 测试原则

### 1. FIRST 原则

**Fast (快速)**
- 测试应该快速执行
- 单元测试 < 100ms
- 集成测试 < 5s
- E2E测试 < 30s

```typescript
// ✅ 快速的单元测试
test('计算函数应该快速返回结果', () => {
  const result = calculateSum([1, 2, 3, 4, 5])
  expect(result).toBe(15)
})

// ❌ 缓慢的测试
test('不要在测试中使用真实的网络请求', async () => {
  // 避免真实的 API 调用
  const response = await fetch('https://api.example.com/data')
  // ...
})
```

**Independent (独立)**
- 测试之间不应该相互依赖
- 每个测试都应该能够独立运行
- 测试顺序不应该影响结果

```typescript
// ✅ 独立的测试
describe('用户服务', () => {
  beforeEach(() => {
    // 每个测试前重置状态
    userService.reset()
  })

  test('应该创建用户', () => {
    const user = userService.create({ name: 'Test' })
    expect(user.id).toBeDefined()
  })

  test('应该删除用户', () => {
    const user = userService.create({ name: 'Test' })
    const result = userService.delete(user.id)
    expect(result).toBe(true)
  })
})
```

**Repeatable (可重复)**
- 测试结果应该一致
- 不依赖外部环境
- 使用确定性的数据

```typescript
// ✅ 可重复的测试
test('日期格式化应该返回一致结果', () => {
  const fixedDate = new Date('2024-01-27T10:00:00Z')
  const formatted = formatDate(fixedDate)
  expect(formatted).toBe('2024-01-27')
})

// ❌ 不可重复的测试
test('避免使用当前时间', () => {
  const now = new Date() // 每次运行结果不同
  const formatted = formatDate(now)
  // 结果不可预测
})
```

**Self-Validating (自验证)**
- 测试应该有明确的通过/失败结果
- 不需要人工检查日志
- 断言应该清晰明确

```typescript
// ✅ 自验证的测试
test('用户名验证应该返回明确结果', () => {
  expect(validateUsername('valid_user')).toBe(true)
  expect(validateUsername('invalid user')).toBe(false)
  expect(validateUsername('')).toBe(false)
})
```

**Timely (及时)**
- 测试应该与代码同时编写
- 遵循 TDD 或至少在功能完成后立即编写
- 不要延迟测试编写

### 2. 测试金字塔原则

```
    🎭 E2E Tests (少量)
   ⚡ Integration Tests (适量)
  🧪 Unit Tests (大量)
```

**比例建议**:
- 单元测试: 70%
- 集成测试: 20%
- E2E测试: 10%

## 📊 测试策略

### 1. 测试分层策略

#### 单元测试层
**目标**: 测试最小可测试单元
**范围**: 函数、类、组件
**特点**: 快速、隔离、大量

```typescript
// 组件单元测试
describe('Button 组件', () => {
  test('应该渲染正确的文本', () => {
    render(<Button>点击我</Button>)
    expect(screen.getByText('点击我')).toBeInTheDocument()
  })

  test('应该处理点击事件', async () => {
    const handleClick = jest.fn()
    render(<Button onClick={handleClick}>点击我</Button>)
    
    await userEvent.click(screen.getByRole('button'))
    expect(handleClick).toHaveBeenCalledTimes(1)
  })
})
```

#### 集成测试层
**目标**: 测试模块间交互
**范围**: API、数据库、服务集成
**特点**: 中等速度、真实环境、适量

```typescript
// API 集成测试
describe('用户 API 集成', () => {
  test('应该创建用户并返回正确数据', async () => {
    const userData = { name: 'Test User', email: 'test@example.com' }
    
    const response = await request(app)
      .post('/api/users')
      .send(userData)
      .expect(201)
    
    expect(response.body).toMatchObject(userData)
    expect(response.body.id).toBeDefined()
  })
})
```

#### E2E测试层
**目标**: 测试完整用户流程
**范围**: 端到端业务场景
**特点**: 慢速、真实环境、少量

```typescript
// E2E 测试
test('用户完整注册流程', async ({ page }) => {
  await page.goto('/register')
  
  await page.fill('[data-testid="name"]', 'Test User')
  await page.fill('[data-testid="email"]', 'test@example.com')
  await page.fill('[data-testid="password"]', 'password123')
  await page.click('[data-testid="submit"]')
  
  await expect(page.locator('[data-testid="welcome"]')).toBeVisible()
})
```

### 2. 测试优先级策略

#### 高优先级 (必须测试)
- 核心业务逻辑
- 用户关键路径
- 安全相关功能
- 数据处理逻辑

#### 中优先级 (应该测试)
- 边界条件处理
- 错误处理逻辑
- 性能关键路径
- 第三方集成

#### 低优先级 (可以测试)
- UI 样式细节
- 非关键辅助功能
- 简单的 getter/setter
- 配置和常量

### 3. 风险驱动测试

```typescript
// 高风险：支付相关功能
describe('支付处理', () => {
  test('应该正确计算订阅费用', () => {
    const subscription = { type: 'pro', duration: 12 }
    const amount = calculateSubscriptionAmount(subscription)
    expect(amount).toBe(1200) // 100 * 12
  })

  test('应该处理支付失败情况', async () => {
    const mockPayment = { amount: 1200, method: 'invalid' }
    
    await expect(processPayment(mockPayment))
      .rejects.toThrow('支付方式无效')
  })
})
```

## 💎 代码质量

### 1. 测试代码质量标准

#### 清晰的测试命名
```typescript
// ✅ 好的命名
describe('AI卡片生成器', () => {
  describe('当用户输入知识点时', () => {
    test('应该启用生成按钮', () => {})
    test('应该显示卡片类型选择器', () => {})
  })

  describe('当达到使用限制时', () => {
    test('应该禁用生成按钮', () => {})
    test('应该显示升级提示', () => {})
  })
})

// ❌ 不好的命名
describe('CardGenerator', () => {
  test('test1', () => {})
  test('button works', () => {})
})
```

#### 有意义的断言
```typescript
// ✅ 清晰的断言
test('应该返回格式化的用户信息', () => {
  const user = { id: 1, name: 'John', email: 'john@example.com' }
  const formatted = formatUser(user)
  
  expect(formatted).toEqual({
    id: 1,
    displayName: 'John',
    emailAddress: 'john@example.com',
    isActive: true
  })
})

// ❌ 模糊的断言
test('user formatting', () => {
  const result = formatUser(user)
  expect(result).toBeTruthy() // 不够具体
})
```

#### 适当的测试数据
```typescript
// ✅ 有意义的测试数据
const mockUser = createUserFixture({
  subscription: 'pro',
  dailyGenerations: 5,
  remainingGenerations: 3
})

// ✅ 边界值测试
test('应该处理边界情况', () => {
  expect(validateAge(0)).toBe(false)    // 最小边界
  expect(validateAge(1)).toBe(true)     // 最小有效值
  expect(validateAge(120)).toBe(true)   // 最大有效值
  expect(validateAge(121)).toBe(false)  // 最大边界
})
```

### 2. Mock 使用最佳实践

#### 合理的 Mock 范围
```typescript
// ✅ Mock 外部依赖
jest.mock('@/lib/ai/geminiService', () => ({
  generateCards: jest.fn().mockResolvedValue(mockCards)
}))

// ✅ Mock 复杂的内部模块
jest.mock('@/lib/database', () => ({
  connect: jest.fn(),
  query: jest.fn(),
  disconnect: jest.fn()
}))

// ❌ 过度 Mock
jest.mock('@/utils/helpers') // 简单工具函数不需要 Mock
```

#### Mock 数据的真实性
```typescript
// ✅ 真实的 Mock 数据
const mockAIResponse = {
  cards: [
    {
      type: 'concept',
      title: '二次函数概念',
      content: '二次函数是形如 f(x) = ax² + bx + c 的函数...',
      examples: ['f(x) = x² + 2x + 1'],
      keyPoints: ['开口方向', '顶点坐标', '对称轴']
    }
  ],
  metadata: {
    generationTime: 2500,
    tokensUsed: 150
  }
}

// ❌ 简化过度的 Mock 数据
const mockAIResponse = { cards: ['card1', 'card2'] }
```

### 3. 测试覆盖率管理

#### 覆盖率目标
- **语句覆盖率**: ≥ 90%
- **分支覆盖率**: ≥ 85%
- **函数覆盖率**: ≥ 95%
- **行覆盖率**: ≥ 90%

#### 覆盖率排除规则
```javascript
// jest.config.js
module.exports = {
  collectCoverageFrom: [
    'src/**/*.{js,ts,tsx}',
    '!src/**/*.d.ts',
    '!src/**/*.stories.{js,ts,tsx}',
    '!src/**/__tests__/**',
    '!src/**/node_modules/**',
    '!src/types/**',
    '!src/constants/**'
  ],
  coverageThreshold: {
    global: {
      branches: 85,
      functions: 95,
      lines: 90,
      statements: 90
    }
  }
}
```

## ⚡ 性能优化

### 1. 测试执行优化

#### 并行执行
```bash
# Jest 并行配置
npm run test:unit -- --maxWorkers=4

# Playwright 并行配置
npm run test:e2e -- --workers=2
```

#### 测试分组
```javascript
// jest.config.js
module.exports = {
  projects: [
    {
      displayName: 'unit',
      testMatch: ['<rootDir>/src/**/__tests__/**/*.test.{js,ts,tsx}']
    },
    {
      displayName: 'integration',
      testMatch: ['<rootDir>/src/**/__tests__/**/*.integration.test.{js,ts}']
    }
  ]
}
```

#### 智能测试选择
```bash
# 只运行变更相关的测试
npm run test:unit -- --onlyChanged

# 只运行失败的测试
npm run test:unit -- --onlyFailures

# 监听模式
npm run test:watch
```

### 2. 资源管理

#### 内存优化
```typescript
// 测试后清理大对象
afterEach(() => {
  // 清理大型 Mock 数据
  jest.clearAllMocks()
  
  // 清理 DOM
  cleanup()
  
  // 清理全局状态
  store.reset()
})
```

#### 数据库连接管理
```typescript
// 全局设置和清理
beforeAll(async () => {
  await database.connect()
})

afterAll(async () => {
  await database.disconnect()
})

// 每个测试清理数据
afterEach(async () => {
  await database.clearTestData()
})
```

### 3. 测试数据优化

#### 最小化测试数据
```typescript
// ✅ 最小化数据
const minimalUser = {
  id: '1',
  name: 'Test',
  email: 'test@example.com'
}

// ❌ 过多不必要的数据
const bloatedUser = {
  id: '1',
  name: 'Test User',
  email: 'test@example.com',
  avatar: 'base64-encoded-image-data...',
  preferences: { /* 大量配置 */ },
  history: [ /* 大量历史数据 */ ]
}
```

#### 数据重用策略
```typescript
// 共享测试数据
const sharedTestData = {
  users: createUserFixtures(5),
  works: createWorkFixtures(20),
  graphs: createGraphFixtures(3)
}

describe('多个测试套件', () => {
  beforeAll(() => {
    // 一次性创建共享数据
    setupSharedData(sharedTestData)
  })
})
```

## 🤝 团队协作

### 1. 测试规范

#### 代码审查清单
- [ ] 测试命名清晰描述行为
- [ ] 测试覆盖主要场景和边界情况
- [ ] Mock 使用合理，不过度依赖
- [ ] 断言具体明确
- [ ] 测试独立，无副作用
- [ ] 性能合理，执行快速

#### 提交规范
```bash
# 提交信息格式
test: 添加用户注册流程的E2E测试

# 包含测试的功能提交
feat: 实现AI卡片生成功能

- 添加卡片生成API
- 实现前端生成界面
- 添加单元测试和集成测试
- 更新API文档
```

### 2. 知识分享

#### 测试文档维护
- 及时更新测试指南
- 记录常见问题和解决方案
- 分享测试技巧和最佳实践
- 维护测试工具使用说明

#### 团队培训
```markdown
## 测试培训计划

### 新人入职培训
- [ ] 测试环境搭建
- [ ] 基础测试编写
- [ ] 工具使用培训
- [ ] 代码审查参与

### 进阶培训
- [ ] 高级测试技巧
- [ ] 性能测试方法
- [ ] 测试架构设计
- [ ] 自动化测试实践
```

### 3. 质量监控

#### 测试指标跟踪
```typescript
// 测试指标收集
const testMetrics = {
  coverage: {
    statements: 92.5,
    branches: 88.3,
    functions: 96.1,
    lines: 91.8
  },
  performance: {
    unitTestTime: 45.2,
    integrationTestTime: 180.5,
    e2eTestTime: 420.8
  },
  stability: {
    passRate: 98.5,
    flakyTests: 2,
    failureRate: 1.5
  }
}
```

#### 质量门禁
```yaml
# CI/CD 质量门禁
quality_gates:
  test_coverage: ">= 90%"
  test_pass_rate: ">= 95%"
  performance_regression: "< 20%"
  security_issues: "= 0"
```

## 🔄 持续改进

### 1. 测试债务管理

#### 识别测试债务
- 缺失的测试用例
- 过时的测试代码
- 脆弱的测试（经常失败）
- 慢速的测试

#### 债务偿还策略
```markdown
## 测试债务偿还计划

### 高优先级
- [ ] 为核心业务逻辑添加缺失测试
- [ ] 修复不稳定的E2E测试
- [ ] 优化慢速集成测试

### 中优先级
- [ ] 重构重复的测试代码
- [ ] 更新过时的Mock数据
- [ ] 改进测试可读性

### 低优先级
- [ ] 添加边界情况测试
- [ ] 优化测试数据管理
- [ ] 完善测试文档
```

### 2. 测试创新

#### 新技术探索
- 视觉回归测试
- 契约测试 (Contract Testing)
- 混沌工程测试
- AI辅助测试生成

#### 工具升级
```bash
# 定期评估和升级测试工具
npm audit
npm outdated
npm update

# 评估新的测试框架和工具
# 如：Vitest, Testing Library 新版本等
```

### 3. 反馈循环

#### 测试效果评估
```typescript
// 测试效果指标
const testEffectiveness = {
  bugCatchRate: 85, // 测试发现的bug比例
  regressionPrevention: 92, // 回归问题预防率
  developmentSpeed: 1.2, // 开发速度提升倍数
  codeQuality: 4.5 // 代码质量评分 (1-5)
}
```

#### 持续优化
- 定期回顾测试策略
- 收集开发者反馈
- 分析测试失败模式
- 优化测试工具链

## 📚 参考资源

### 推荐阅读
- [Testing JavaScript](https://testingjavascript.com/) - Kent C. Dodds
- [The Art of Unit Testing](https://www.manning.com/books/the-art-of-unit-testing-third-edition)
- [Growing Object-Oriented Software, Guided by Tests](http://www.growing-object-oriented-software.com/)

### 工具推荐
- **单元测试**: Jest, Vitest
- **组件测试**: Testing Library, Enzyme
- **E2E测试**: Playwright, Cypress
- **性能测试**: Lighthouse, WebPageTest
- **视觉测试**: Percy, Chromatic

### 社区资源
- [Testing Library Discord](https://discord.gg/testing-library)
- [Jest Community](https://jestjs.io/community)
- [Playwright Community](https://playwright.dev/community)

---

**文档版本**: v1.0  
**最后更新**: 2024年1月27日  
**维护者**: inspi-ai-platform 开发团队

记住：好的测试不仅仅是验证代码正确性，更是提升代码质量、增强开发信心、促进团队协作的重要工具。持续改进测试实践，让测试成为开发过程中的得力助手！