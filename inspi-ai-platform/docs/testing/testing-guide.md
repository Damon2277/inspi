# inspi-ai-platform 测试使用指南

## 📋 目录

1. [快速开始](#快速开始)
2. [测试套件介绍](#测试套件介绍)
3. [运行测试](#运行测试)
4. [编写测试](#编写测试)
5. [测试工具](#测试工具)
6. [最佳实践](#最佳实践)
7. [故障排除](#故障排除)
8. [高级功能](#高级功能)

## 🚀 快速开始

### 环境要求

- Node.js 18+
- npm 或 yarn
- MongoDB (测试数据库)
- Redis (缓存服务)

### 安装依赖

```bash
# 安装项目依赖
npm install

# 安装测试专用依赖
npm run install:test-deps

# 安装 Playwright 浏览器
npx playwright install
```

### 运行第一个测试

```bash
# 运行所有测试
npm run test:all

# 运行单元测试
npm run test:unit

# 运行集成测试
npm run test:integration

# 运行端到端测试
npm run test:e2e
```

## 🧪 测试套件介绍

### 测试金字塔架构

```
        🎭 E2E Tests (16个场景)
       ⚡ Performance Tests (10个指标)
      🔗 Integration Tests (150个用例)
     🧪 Unit Tests (375个用例)
    📱 Mobile + 🔒 Security Tests
```

### 1. 单元测试 (Unit Tests)

**目录**: `src/__tests__/unit/`  
**用例数**: 375个  
**覆盖范围**: 组件、Hook、工具函数、服务层

```bash
# 运行单元测试
npm run test:unit

# 监听模式
npm run test:unit -- --watch

# 生成覆盖率报告
npm run test:coverage
```

**主要测试内容**:
- React 组件渲染和交互
- 自定义 Hook 逻辑
- 工具函数和辅助方法
- 服务层业务逻辑
- 状态管理 (Zustand)

### 2. 集成测试 (Integration Tests)

**目录**: `src/__tests__/integration/`  
**用例数**: 150个  
**覆盖范围**: 模块间交互、数据流、API集成

```bash
# 运行集成测试
npm run test:integration

# 运行特定集成测试
npm run test:integration -- --testNamePattern="API"
```

**主要测试内容**:
- API 接口集成
- 数据库操作
- 缓存机制
- 中间件功能
- 第三方服务集成

### 3. 端到端测试 (E2E Tests)

**目录**: `src/__tests__/e2e/`  
**场景数**: 16个  
**覆盖范围**: 完整用户旅程

```bash
# 运行 E2E 测试
npm run test:e2e

# 运行特定浏览器
npm run test:e2e -- --project=chromium

# 调试模式
npm run test:e2e -- --debug
```

**主要测试场景**:
- 用户注册登录流程
- AI 卡片生成完整流程
- 作品发布和复用流程
- 知识图谱交互
- 移动端用户体验

### 4. 性能测试 (Performance Tests)

**目录**: `src/__tests__/performance/`  
**指标数**: 10个  
**覆盖范围**: 关键性能指标

```bash
# 运行性能测试
npm run test:performance

# 比较性能基准
node scripts/test-tools.js benchmark-compare
```

**主要性能指标**:
- 页面加载时间
- AI 生成响应时间
- 图谱渲染性能
- 内存使用情况
- 网络请求优化

### 5. 安全测试 (Security Tests)

**目录**: `src/__tests__/security/`  
**覆盖范围**: 安全漏洞检测

```bash
# 运行安全测试
npm run test:security

# 运行安全扫描
npm audit
```

### 6. 移动端测试 (Mobile Tests)

**目录**: `src/__tests__/mobile/`  
**覆盖范围**: 移动端兼容性

```bash
# 运行移动端测试
npm run test:mobile

# 运行特定设备测试
npm run test:mobile -- --project="Mobile Chrome"
```

## 🏃‍♂️ 运行测试

### 基础命令

```bash
# 运行所有测试
npm run test:all

# 运行特定类型测试
npm run test:unit
npm run test:integration
npm run test:e2e
npm run test:performance
npm run test:security
npm run test:mobile

# 监听模式 (开发时使用)
npm run test:watch
npm run test:watch:integration

# 生成覆盖率报告
npm run test:coverage
npm run test:coverage:all

# CI 模式 (持续集成)
npm run test:ci
```

### 高级运行选项

```bash
# 运行特定测试文件
npm run test:unit -- src/__tests__/unit/components/CardGenerator.test.tsx

# 运行匹配模式的测试
npm run test:unit -- --testNamePattern="AI卡片生成"

# 并行运行测试
npm run test:parallel

# 调试模式
npm run test:debug
npm run test:debug:integration

# 使用测试运行器
npm run test:runner
```

### 环境配置

```bash
# 设置测试环境
node scripts/test-tools.js setup test

# 生成测试数据
node scripts/test-tools.js generate-data all --count 50

# 清理测试数据
node scripts/test-tools.js clean-data

# 健康检查
node scripts/test-tools.js health-check
```

## ✍️ 编写测试

### 单元测试示例

```typescript
// src/__tests__/unit/components/MyComponent.test.tsx
import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MyComponent } from '@/components/MyComponent'

describe('MyComponent', () => {
  test('应该正确渲染组件', () => {
    render(<MyComponent title="测试标题" />)
    
    expect(screen.getByText('测试标题')).toBeInTheDocument()
  })

  test('应该处理用户交互', async () => {
    const onClickMock = jest.fn()
    render(<MyComponent onClick={onClickMock} />)
    
    const button = screen.getByRole('button')
    await userEvent.click(button)
    
    expect(onClickMock).toHaveBeenCalledTimes(1)
  })
})
```

### 集成测试示例

```typescript
// src/__tests__/integration/api.test.ts
import request from 'supertest'
import { app } from '@/app'
import { testDataManager } from '@/tests/utils/test-data-manager'

describe('API Integration Tests', () => {
  beforeAll(async () => {
    await testDataManager.createTestDataSet({ environment: 'integration' })
  })

  afterAll(async () => {
    await testDataManager.cleanupAllData()
  })

  test('POST /api/works 应该创建新作品', async () => {
    const workData = {
      title: '测试作品',
      description: '测试描述',
      subject: '数学'
    }

    const response = await request(app)
      .post('/api/works')
      .send(workData)
      .expect(201)

    expect(response.body).toMatchObject({
      title: '测试作品',
      subject: '数学'
    })
  })
})
```

### E2E 测试示例

```typescript
// src/__tests__/e2e/user-flow.test.ts
import { test, expect } from '@playwright/test'

test('用户完整使用流程', async ({ page }) => {
  // 访问首页
  await page.goto('/')
  await expect(page).toHaveTitle(/inspi AI平台/)

  // 用户登录
  await page.click('[data-testid="login-button"]')
  await page.fill('[data-testid="email"]', 'test@example.com')
  await page.fill('[data-testid="password"]', 'password')
  await page.click('[data-testid="submit"]')

  // 验证登录成功
  await expect(page.locator('[data-testid="user-avatar"]')).toBeVisible()

  // 生成 AI 卡片
  await page.click('[data-testid="magic-nav"]')
  await page.fill('[data-testid="knowledge-input"]', '二次函数')
  await page.click('[data-testid="generate-button"]')

  // 验证卡片生成
  await expect(page.locator('[data-testid="generated-cards"]')).toBeVisible({ timeout: 30000 })
})
```

### 性能测试示例

```typescript
// src/__tests__/performance/page-load.test.ts
import { test, expect } from '@playwright/test'

test('首页加载性能测试', async ({ page }) => {
  const startTime = Date.now()
  
  await page.goto('/')
  await page.waitForLoadState('networkidle')
  
  const loadTime = Date.now() - startTime
  
  // 验证加载时间小于 3 秒
  expect(loadTime).toBeLessThan(3000)
  
  console.log(`首页加载时间: ${loadTime}ms`)
})
```

## 🛠️ 测试工具

### 1. 测试辅助工具

```bash
# 查看所有可用工具
node scripts/test-tools.js --help

# 设置测试环境
node scripts/test-tools.js setup e2e

# 生成测试数据
node scripts/test-tools.js generate-data users --count 20

# 分析测试结果
node scripts/test-tools.js analyze-results --format html

# 性能基准比较
node scripts/test-tools.js benchmark-compare --output ./reports
```

### 2. 测试数据管理

```typescript
import { testDataManager } from '@/tests/utils/test-data-manager'

// 创建测试数据集
const dataSet = await testDataManager.createTestDataSet({
  environment: 'e2e',
  cleanup: true
})

// 清理测试数据
await testDataManager.cleanupAllData()
```

### 3. Mock 工具

```typescript
import { createMockUser, createMockWork } from '@/tests/fixtures'
import { mockAIService } from '@/tests/utils/mock-utils'

// 创建 Mock 数据
const mockUser = createMockUser({ subscription: 'pro' })
const mockWork = createMockWork({ author: mockUser })

// Mock AI 服务
mockAIService.generateCards.mockResolvedValue(mockCards)
```

### 4. 性能监控仪表板

访问 `src/__tests__/dashboard/performance-dashboard.html` 查看实时性能监控。

## 📋 最佳实践

### 1. 测试命名规范

```typescript
// ✅ 好的测试命名
describe('CardGenerator 组件', () => {
  test('应该在输入知识点后显示生成按钮', () => {})
  test('应该在生成失败时显示错误信息', () => {})
  test('应该在达到使用限制时禁用生成按钮', () => {})
})

// ❌ 不好的测试命名
describe('CardGenerator', () => {
  test('test1', () => {})
  test('button click', () => {})
})
```

### 2. 测试结构

```typescript
describe('功能模块', () => {
  // 设置和清理
  beforeEach(() => {
    // 每个测试前的设置
  })

  afterEach(() => {
    // 每个测试后的清理
  })

  describe('特定场景', () => {
    test('应该执行预期行为', () => {
      // Arrange (准备)
      const input = '测试输入'
      
      // Act (执行)
      const result = functionUnderTest(input)
      
      // Assert (断言)
      expect(result).toBe('预期输出')
    })
  })
})
```

### 3. Mock 使用原则

```typescript
// ✅ Mock 外部依赖
jest.mock('@/lib/ai/geminiService', () => ({
  generateCards: jest.fn()
}))

// ✅ Mock 复杂的内部模块
jest.mock('@/lib/database', () => ({
  connect: jest.fn(),
  disconnect: jest.fn()
}))

// ❌ 不要 Mock 被测试的模块
// jest.mock('@/components/CardGenerator')
```

### 4. 异步测试

```typescript
// ✅ 正确处理异步操作
test('应该异步加载数据', async () => {
  const promise = loadData()
  
  await expect(promise).resolves.toEqual(expectedData)
})

// ✅ 使用 waitFor 等待 DOM 更新
test('应该显示加载状态', async () => {
  render(<AsyncComponent />)
  
  await waitFor(() => {
    expect(screen.getByText('加载中...')).toBeInTheDocument()
  })
})
```

### 5. 测试数据管理

```typescript
// ✅ 使用 Fixture 创建测试数据
const mockUser = createUserFixture({
  subscription: 'pro',
  dailyGenerations: 10
})

// ✅ 每个测试使用独立数据
beforeEach(() => {
  testData = createTestDataSet()
})

// ✅ 测试后清理数据
afterEach(() => {
  cleanupTestData()
})
```

## 🔧 故障排除

### 常见问题

#### 1. 测试运行缓慢

**问题**: 测试执行时间过长

**解决方案**:
```bash
# 并行运行测试
npm run test:parallel

# 只运行变更相关的测试
npm run test:unit -- --onlyChanged

# 使用监听模式
npm run test:watch
```

#### 2. 内存不足错误

**问题**: `JavaScript heap out of memory`

**解决方案**:
```bash
# 增加 Node.js 内存限制
export NODE_OPTIONS="--max-old-space-size=4096"

# 或在 package.json 中设置
"test:unit": "NODE_OPTIONS='--max-old-space-size=4096' jest"
```

#### 3. Playwright 浏览器问题

**问题**: 浏览器启动失败

**解决方案**:
```bash
# 重新安装浏览器
npx playwright install

# 安装系统依赖
npx playwright install-deps

# 使用无头模式
npm run test:e2e -- --headed=false
```

#### 4. 数据库连接问题

**问题**: 测试数据库连接失败

**解决方案**:
```bash
# 检查数据库状态
node scripts/test-tools.js health-check

# 重置测试环境
node scripts/test-tools.js reset-env

# 手动启动数据库服务
# MongoDB: mongod
# Redis: redis-server
```

### 调试技巧

#### 1. 调试单元测试

```bash
# 使用调试模式
npm run test:debug

# 在浏览器中调试
npm run test:unit -- --debug
```

#### 2. 调试 E2E 测试

```bash
# 有头模式运行
npm run test:e2e -- --headed

# 慢动作模式
npm run test:e2e -- --slowMo=1000

# 暂停调试
await page.pause()
```

#### 3. 查看测试报告

```bash
# 生成详细报告
npm run test:report

# 查看覆盖率报告
open coverage/lcov-report/index.html

# 查看 Playwright 报告
npx playwright show-report
```

## 🚀 高级功能

### 1. 自定义测试配置

```javascript
// jest.config.custom.js
module.exports = {
  ...require('./jest.config.unit.js'),
  testMatch: ['**/__tests__/custom/**/*.test.{js,ts,tsx}'],
  setupFilesAfterEnv: ['<rootDir>/jest.setup.custom.js'],
  collectCoverageFrom: [
    'src/components/custom/**/*.{js,ts,tsx}',
  ],
}
```

### 2. 测试环境变量

```bash
# .env.test
NODE_ENV=test
MONGODB_URI=mongodb://localhost:27017/inspi_test
REDIS_URL=redis://localhost:6379/1
GEMINI_API_KEY=test_key
```

### 3. 自定义 Matcher

```typescript
// jest.setup.js
expect.extend({
  toBeValidEmail(received) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    const pass = emailRegex.test(received)
    
    return {
      message: () => `expected ${received} ${pass ? 'not ' : ''}to be a valid email`,
      pass,
    }
  },
})

// 使用
expect('test@example.com').toBeValidEmail()
```

### 4. 测试快照

```typescript
// 组件快照测试
test('应该匹配快照', () => {
  const tree = renderer
    .create(<MyComponent prop="value" />)
    .toJSON()
  
  expect(tree).toMatchSnapshot()
})

// 更新快照
npm run test:unit -- --updateSnapshot
```

### 5. 性能基准测试

```typescript
// 性能基准测试
test('函数性能基准', () => {
  const start = performance.now()
  
  // 执行被测试的函数
  heavyFunction()
  
  const end = performance.now()
  const duration = end - start
  
  // 验证执行时间小于基准值
  expect(duration).toBeLessThan(100) // 100ms
})
```

## 📚 相关资源

- [Jest 官方文档](https://jestjs.io/docs/getting-started)
- [Testing Library 文档](https://testing-library.com/docs/)
- [Playwright 文档](https://playwright.dev/docs/intro)
- [React 测试最佳实践](https://kentcdodds.com/blog/common-mistakes-with-react-testing-library)

## 🤝 贡献指南

### 添加新测试

1. 确定测试类型和位置
2. 遵循命名规范
3. 编写清晰的测试用例
4. 添加必要的文档
5. 运行测试确保通过

### 报告问题

如果发现测试相关问题，请：

1. 检查[故障排除](#故障排除)部分
2. 搜索已知问题
3. 提供详细的错误信息
4. 包含复现步骤

---

**文档版本**: v1.0  
**最后更新**: 2024年1月27日  
**维护者**: inspi-ai-platform 开发团队