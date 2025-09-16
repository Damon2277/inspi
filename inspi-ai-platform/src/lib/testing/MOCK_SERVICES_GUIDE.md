# Mock服务管理系统使用指南

## 概述

Mock服务管理系统是全面单元测试计划的核心组件，提供统一的Mock服务注册、管理和验证功能。该系统确保测试环境中外部依赖的一致性和可靠性。

## 核心组件

### 1. MockServiceManager - 服务管理器

中央管理器，负责所有Mock服务的注册、管理和协调。

```typescript
import { MockServiceManager } from '@/lib/testing';

const manager = MockServiceManager.getInstance();
```

#### 主要功能

- **服务注册**: 注册和管理多个Mock服务
- **状态管理**: 跟踪服务状态和调用历史
- **一致性验证**: 验证所有服务的正确性
- **批量操作**: 重置、清理所有服务

### 2. BaseMockService - 基础Mock服务

所有Mock服务的基类，提供通用功能。

```typescript
import { BaseMockService } from '@/lib/testing';

class CustomMockService extends BaseMockService {
  constructor() {
    super('CustomService', '1.0.0');
  }
  
  protected async onVerify(): Promise<boolean> {
    // 实现验证逻辑
    return true;
  }
}
```

### 3. 具体Mock服务实现

#### MockGeminiService - AI服务Mock

```typescript
import { MockGeminiService } from '@/lib/testing';

const geminiService = new MockGeminiService();

// 设置自定义响应
geminiService.setPromptResponse('Generate a card', {
  content: JSON.stringify({
    title: 'Test Card',
    content: 'Test content'
  }),
  usage: { promptTokens: 10, completionTokens: 20, totalTokens: 30 }
});

// 使用服务
const result = await geminiService.generateContent('Generate a card');
```

#### MockEmailService - 邮件服务Mock

```typescript
import { MockEmailService } from '@/lib/testing';

const emailService = new MockEmailService();

// 发送邮件
const result = await emailService.sendEmail({
  to: 'test@example.com',
  subject: 'Test Email',
  text: 'Test content'
});

// 查询发送记录
const sentEmails = emailService.getSentEmails();
const userEmails = emailService.getEmailsTo('test@example.com');
```

#### MockDatabaseService - 数据库服务Mock

```typescript
import { MockDatabaseService } from '@/lib/testing';

const dbService = new MockDatabaseService();

// CRUD操作
const user = await dbService.create('users', { name: 'Test User' });
const users = await dbService.find('users', { name: 'Test User' });
await dbService.updateById('users', user._id, { age: 25 });
await dbService.deleteById('users', user._id);
```

## 使用示例

### 基本使用

```typescript
import {
  MockServiceManager,
  MockGeminiService,
  MockEmailService,
  MockDatabaseService
} from '@/lib/testing';

describe('My Feature Tests', () => {
  let manager: MockServiceManager;
  let geminiService: MockGeminiService;
  let emailService: MockEmailService;
  let dbService: MockDatabaseService;

  beforeEach(() => {
    manager = MockServiceManager.getInstance();
    manager.cleanup();
    
    // 创建服务实例
    geminiService = new MockGeminiService();
    emailService = new MockEmailService();
    dbService = new MockDatabaseService();
    
    // 注册服务
    manager.registerMock(geminiService, { trackCalls: true });
    manager.registerMock(emailService, { trackCalls: true });
    manager.registerMock(dbService, { trackCalls: true });
  });

  afterEach(() => {
    manager.cleanup();
  });

  it('should handle user registration workflow', async () => {
    // 1. 创建用户
    const user = await dbService.create('users', {
      name: 'John Doe',
      email: 'john@example.com'
    });

    // 2. 生成欢迎内容
    const welcomeContent = await geminiService.generateContent(
      'Generate welcome message for new user'
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
    
    // 验证邮件发送
    expect(emailService.wasEmailSent(user.email, 'welcome')).toBe(true);
  });
});
```

### 高级配置

```typescript
// 配置失败率和延迟
geminiService.setFailureRate(0.1); // 10% 失败率
geminiService.setDefaultDelay(200); // 200ms 延迟

emailService.setConfig({
  failureRate: 0.05,
  delay: 100,
  messageIdPrefix: 'test-'
});

dbService.setConfig({
  simulateLatency: true,
  defaultLatency: 50,
  failureRate: 0.02
});
```

### 响应模式匹配

```typescript
// 精确匹配
geminiService.setPromptResponse('specific prompt', {
  content: 'specific response'
});

// 模式匹配
geminiService.addResponsePattern(/card.*generation/i, {
  content: JSON.stringify({ type: 'card', title: 'Generated Card' })
});

// 条件响应
geminiService.setPromptResponse('failing prompt', {
  content: 'should not return',
  shouldFail: true,
  errorMessage: 'Simulated AI failure'
});
```

### 数据一致性验证

```typescript
it('should maintain data consistency across services', async () => {
  const userId = 'user_123';
  const userEmail = 'user@example.com';

  // 创建用户
  const user = await dbService.create('users', {
    _id: userId,
    email: userEmail,
    name: 'Test User'
  });

  // 发送邮件
  await emailService.sendEmail({
    to: userEmail,
    subject: 'Account Created',
    text: 'Your account has been created'
  });

  // 验证数据一致性
  const retrievedUser = await dbService.findById('users', userId);
  const sentEmails = emailService.getEmailsTo(userEmail);

  expect(retrievedUser).toBeDefined();
  expect(retrievedUser!.email).toBe(userEmail);
  expect(sentEmails).toHaveLength(1);
  expect(sentEmails[0].to).toBe(userEmail);
});
```

## 服务验证

### 单个服务验证

```typescript
const result = await manager.verifyMock('GeminiService');
console.log(result.isValid); // true/false
console.log(result.errors); // 错误列表
```

### 批量服务验证

```typescript
const result = await manager.verifyAllMocks();
console.log(result.allValid); // 所有服务是否有效
result.results.forEach(serviceResult => {
  console.log(`${serviceResult.serviceName}: ${serviceResult.isValid}`);
});
```

## 状态管理

### 获取服务状态

```typescript
// 单个服务状态
const status = geminiService.getStatus();
console.log(status.callCount, status.errors);

// 所有服务状态
const allStatuses = manager.getAllMockStatus();
allStatuses.forEach(status => {
  console.log(`${status.name}: ${status.callCount} calls`);
});

// 管理器统计
const stats = manager.getStats();
console.log(`Total services: ${stats.totalServices}`);
console.log(`Active services: ${stats.activeServices}`);
```

### 调用历史跟踪

```typescript
// 启用调用跟踪
manager.registerMock(geminiService, { trackCalls: true });

// 使用服务
manager.getMock('GeminiService');

// 查看调用历史
const history = manager.getCallHistory('GeminiService');
console.log(history.get('GeminiService')); // 调用记录数组
```

## 错误处理和恢复

### 处理服务失败

```typescript
// 设置高失败率
geminiService.setFailureRate(1);

// 验证会失败
const result = await manager.verifyMock('GeminiService');
expect(result.isValid).toBe(false);

// 修复服务
geminiService.setFailureRate(0);
manager.resetMock('GeminiService');

// 重新验证
const recoveredResult = await manager.verifyMock('GeminiService');
expect(recoveredResult.isValid).toBe(true);
```

### 服务停用和激活

```typescript
// 停用服务
geminiService.deactivate();

// 尝试使用会抛出错误
await expect(geminiService.generateContent('test'))
  .rejects.toThrow('not active');

// 重新激活
geminiService.activate();

// 现在可以正常使用
const result = await geminiService.generateContent('test');
expect(result).toBeDefined();
```

## 性能优化

### 缓存和重用

```typescript
// 使用缓存
const result1 = await geminiService.generateContent('test', { useCache: true });
const result2 = await geminiService.generateContent('test', { useCache: true });

// result2 可能来自缓存
console.log(result2.cached); // true/false
```

### 批量操作

```typescript
// 批量重置
manager.resetAllMocks();

// 批量验证
const verificationResult = await manager.verifyAllMocks();

// 批量清理
manager.cleanup();
```

## 最佳实践

### 1. 测试隔离

```typescript
beforeEach(() => {
  manager.cleanup(); // 确保测试间隔离
  // 重新设置服务
});
```

### 2. 合理的失败率

```typescript
// 不要设置过高的失败率，除非专门测试错误处理
geminiService.setFailureRate(0.05); // 5% 是合理的
```

### 3. 验证数据一致性

```typescript
afterEach(async () => {
  // 验证所有服务状态正常
  const result = await manager.verifyAllMocks();
  if (!result.allValid) {
    console.warn('Some mock services are in invalid state');
  }
});
```

### 4. 适当的延迟模拟

```typescript
// 模拟真实的网络延迟
geminiService.setDefaultDelay(100); // 100ms
emailService.setDelay(50); // 50ms
dbService.setConfig({ defaultLatency: 10 }); // 10ms
```

### 5. 清理资源

```typescript
afterAll(() => {
  manager.cleanup(); // 清理所有资源
});
```

## 故障排除

### 常见问题

1. **服务验证失败**
   - 检查失败率设置
   - 查看错误日志
   - 重置服务状态

2. **内存泄漏**
   - 确保调用 `cleanup()`
   - 限制历史记录数量
   - 定期重置服务

3. **测试不稳定**
   - 降低失败率
   - 增加重试机制
   - 检查服务间依赖

### 调试技巧

```typescript
// 启用详细日志
const stats = geminiService.getStats();
console.log('Service stats:', stats);

// 检查调用历史
const history = manager.getCallHistory();
console.log('Call history:', history);

// 验证服务状态
const result = await manager.verifyAllMocks();
console.log('Verification result:', result);
```

## 扩展指南

### 创建自定义Mock服务

```typescript
import { BaseMockService } from '@/lib/testing';

export class MockCustomService extends BaseMockService {
  constructor() {
    super('CustomService', '1.0.0');
  }

  async customMethod(param: string): Promise<string> {
    this.ensureActive();
    this.recordCall('customMethod', [param]);
    
    // 模拟延迟
    await this.simulateDelay();
    
    // 返回结果
    return `Processed: ${param}`;
  }

  protected async onVerify(): Promise<boolean> {
    try {
      const result = await this.customMethod('test');
      return result.includes('Processed');
    } catch (error) {
      this.addError(`Verification failed: ${error}`);
      return false;
    }
  }
}
```

### 集成到现有测试

```typescript
// 在现有测试中使用
import { mockServiceManager } from '@/lib/testing';

// 全局设置
beforeAll(() => {
  const geminiService = new MockGeminiService();
  mockServiceManager.registerMock(geminiService);
});

// 在测试中使用
it('should work with mock services', async () => {
  const service = mockServiceManager.getMock<MockGeminiService>('GeminiService');
  const result = await service.generateContent('test');
  expect(result).toBeDefined();
});
```

这个Mock服务管理系统为全面单元测试计划提供了强大的基础设施，确保测试的可靠性、一致性和可维护性。