/**
 * Mock服务集成测试
 * 验证Mock服务管理系统的整体一致性和集成功能
 */

import {
  MockServiceManager,
  MockGeminiService,
  MockEmailService,
  MockDatabaseService,
  mockServiceManager
} from '@/lib/testing';

describe('Mock Service Integration', () => {
  let manager: MockServiceManager;
  let geminiService: MockGeminiService;
  let emailService: MockEmailService;
  let databaseService: MockDatabaseService;

  beforeEach(() => {
    manager = MockServiceManager.getInstance();
    manager.cleanup();
    
    geminiService = new MockGeminiService();
    emailService = new MockEmailService();
    databaseService = new MockDatabaseService();
  });

  afterEach(() => {
    manager.cleanup();
  });

  describe('服务集成场景', () => {
    it('应该能够注册和管理多个服务', () => {
      // Act
      manager.registerMock(geminiService, { trackCalls: true });
      manager.registerMock(emailService, { trackCalls: true });
      manager.registerMock(databaseService, { trackCalls: true });

      // Assert
      expect(manager.hasMock('GeminiService')).toBe(true);
      expect(manager.hasMock('EmailService')).toBe(true);
      expect(manager.hasMock('DatabaseService')).toBe(true);

      const stats = manager.getStats();
      expect(stats.totalServices).toBe(3);
      expect(stats.activeServices).toBe(3);
    });

    it('应该能够验证所有服务的一致性', async () => {
      // Arrange
      manager.registerMock(geminiService);
      manager.registerMock(emailService);
      manager.registerMock(databaseService);

      // Act
      const verificationResult = await manager.verifyAllMocks();

      // Assert
      expect(verificationResult.allValid).toBe(true);
      expect(verificationResult.results).toHaveLength(3);
      
      verificationResult.results.forEach(result => {
        expect(result.isValid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });
    });

    it('应该能够重置所有服务状态', async () => {
      // Arrange
      manager.registerMock(geminiService);
      manager.registerMock(emailService);
      manager.registerMock(databaseService);

      // 使用服务以增加调用计数
      await geminiService.generateContent('test');
      await emailService.sendEmail({
        to: 'test@example.com',
        subject: 'Test',
        text: 'Content'
      });
      await databaseService.create('users', { name: 'Test User' });

      // Act
      manager.resetAllMocks();

      // Assert
      const allStatuses = manager.getAllMockStatus();
      allStatuses.forEach(status => {
        expect(status.callCount).toBe(0);
        expect(status.errors).toHaveLength(0);
        expect(status.isActive).toBe(true);
      });
    });
  });

  describe('端到端工作流测试', () => {
    beforeEach(() => {
      manager.registerMock(geminiService, { trackCalls: true });
      manager.registerMock(emailService, { trackCalls: true });
      manager.registerMock(databaseService, { trackCalls: true });
    });

    it('应该支持完整的用户注册工作流', async () => {
      // Arrange - 模拟用户注册流程
      const userData = {
        name: 'John Doe',
        email: 'john@example.com',
        age: 30
      };

      // Act
      // 1. 创建用户记录
      const createdUser = await databaseService.create('users', userData);
      
      // 2. 生成欢迎邮件内容
      const welcomeContent = await geminiService.generateContent(
        `Generate a welcome email for user ${userData.name}`
      );
      
      // 3. 发送欢迎邮件
      const emailResult = await emailService.sendEmail({
        to: userData.email,
        subject: 'Welcome to our platform!',
        html: `<p>${welcomeContent.content}</p>`
      });

      // Assert
      expect(createdUser._id).toBeTruthy();
      expect(createdUser.name).toBe(userData.name);
      
      expect(welcomeContent.content).toBeTruthy();
      expect(welcomeContent.usage).toBeDefined();
      
      expect(emailResult.success).toBe(true);
      expect(emailResult.messageId).toBeTruthy();

      // 验证服务调用历史
      const callHistory = manager.getCallHistory();
      expect(callHistory.has('GeminiService')).toBe(true);
      expect(callHistory.has('EmailService')).toBe(true);
      expect(callHistory.has('DatabaseService')).toBe(true);
    });

    it('应该支持内容生成和存储工作流', async () => {
      // Arrange
      const prompt = 'Create a teaching card about JavaScript basics';

      // Act
      // 1. 生成教学卡片内容
      geminiService.setPromptResponse(prompt, {
        content: JSON.stringify({
          title: 'JavaScript Basics',
          content: 'Learn the fundamentals of JavaScript programming',
          tags: ['javascript', 'programming', 'basics'],
          difficulty: 'beginner'
        }),
        usage: { promptTokens: 20, completionTokens: 50, totalTokens: 70 }
      });

      const aiResult = await geminiService.generateContent(prompt);
      const cardData = JSON.parse(aiResult.content);

      // 2. 存储到数据库
      const savedCard = await databaseService.create('works', {
        ...cardData,
        authorId: 'user_1',
        createdBy: 'ai'
      });

      // 3. 发送通知邮件
      const notificationResult = await emailService.sendEmail({
        to: 'author@example.com',
        subject: 'New teaching card created',
        text: `Your teaching card "${cardData.title}" has been created successfully.`
      });

      // Assert
      expect(cardData.title).toBe('JavaScript Basics');
      expect(savedCard._id).toBeTruthy();
      expect(savedCard.title).toBe(cardData.title);
      expect(notificationResult.success).toBe(true);

      // 验证数据一致性
      const retrievedCard = await databaseService.findById('works', savedCard._id);
      expect(retrievedCard).toBeDefined();
      expect(retrievedCard!.title).toBe(cardData.title);
    });
  });

  describe('错误处理和恢复', () => {
    beforeEach(() => {
      manager.registerMock(geminiService);
      manager.registerMock(emailService);
      manager.registerMock(databaseService);
    });

    it('应该处理单个服务失败的情况', async () => {
      // Arrange
      emailService.setFailureRate(1); // 邮件服务100%失败

      // Act
      const verificationResult = await manager.verifyAllMocks();

      // Assert
      expect(verificationResult.allValid).toBe(false);
      
      const emailResult = verificationResult.results.find(r => r.serviceName === 'EmailService');
      const geminiResult = verificationResult.results.find(r => r.serviceName === 'GeminiService');
      const dbResult = verificationResult.results.find(r => r.serviceName === 'DatabaseService');

      expect(emailResult!.isValid).toBe(false);
      expect(geminiResult!.isValid).toBe(true);
      expect(dbResult!.isValid).toBe(true);
    });

    it('应该能够从服务失败中恢复', async () => {
      // Arrange
      geminiService.setFailureRate(1);
      
      // 验证失败状态
      let verificationResult = await manager.verifyAllMocks();
      expect(verificationResult.allValid).toBe(false);

      // Act - 修复服务
      geminiService.setFailureRate(0);
      manager.resetMock('GeminiService');

      // Assert - 验证恢复
      verificationResult = await manager.verifyAllMocks();
      expect(verificationResult.allValid).toBe(true);
    });

    it('应该处理服务停用的情况', async () => {
      // Arrange
      databaseService.deactivate();

      // Act
      const verificationResult = await manager.verifyMock('DatabaseService');

      // Assert
      expect(verificationResult.isValid).toBe(false);
      expect(verificationResult.errors.length).toBeGreaterThan(0);

      // 重新激活后应该正常
      databaseService.activate();
      const recoveredResult = await manager.verifyMock('DatabaseService');
      expect(recoveredResult.isValid).toBe(true);
    });
  });

  describe('性能和扩展性', () => {
    it('应该能够处理大量服务注册', () => {
      // Arrange
      const services = Array.from({ length: 50 }, (_, i) => {
        const service = new MockGeminiService();
        service.name = `GeminiService_${i}`;
        return service;
      });

      // Act
      services.forEach(service => {
        manager.registerMock(service);
      });

      // Assert
      const stats = manager.getStats();
      expect(stats.totalServices).toBe(50);
      expect(stats.activeServices).toBe(50);
    });

    it('应该能够高效验证大量服务', async () => {
      // Arrange
      const services = [
        new MockGeminiService(),
        new MockEmailService(),
        new MockDatabaseService(),
        new MockGeminiService(),
        new MockEmailService()
      ];

      services.forEach((service, i) => {
        service.name = `${service.name}_${i}`;
        manager.registerMock(service);
      });

      // Act
      const startTime = Date.now();
      const verificationResult = await manager.verifyAllMocks();
      const endTime = Date.now();

      // Assert
      expect(verificationResult.allValid).toBe(true);
      expect(verificationResult.results).toHaveLength(5);
      
      const verificationTime = endTime - startTime;
      expect(verificationTime).toBeLessThan(5000); // 应该在5秒内完成
    });
  });

  describe('数据一致性验证', () => {
    beforeEach(() => {
      manager.registerMock(geminiService);
      manager.registerMock(emailService);
      manager.registerMock(databaseService);
    });

    it('应该维护跨服务的数据一致性', async () => {
      // Arrange
      const userId = 'user_123';
      const userEmail = 'user@example.com';

      // Act
      // 1. 创建用户
      const user = await databaseService.create('users', {
        _id: userId,
        email: userEmail,
        name: 'Test User'
      });

      // 2. 发送邮件
      const emailResult = await emailService.sendEmail({
        to: userEmail,
        subject: 'Account Created',
        text: 'Your account has been created'
      });

      // 3. 生成个性化内容
      const aiContent = await geminiService.generateContent(
        `Generate personalized content for user ${user.name}`
      );

      // Assert
      expect(user._id).toBe(userId);
      expect(emailResult.success).toBe(true);
      expect(aiContent.content).toBeTruthy();

      // 验证邮件记录与用户数据一致
      const sentEmails = emailService.getEmailsTo(userEmail);
      expect(sentEmails).toHaveLength(1);
      expect(sentEmails[0].to).toBe(userEmail);

      // 验证用户仍然存在于数据库中
      const retrievedUser = await databaseService.findById('users', userId);
      expect(retrievedUser).toBeDefined();
      expect(retrievedUser!.email).toBe(userEmail);
    });

    it('应该检测和报告数据不一致', async () => {
      // Arrange
      const userEmail = 'test@example.com';

      // 创建用户但使用错误的邮件地址发送邮件
      await databaseService.create('users', {
        email: userEmail,
        name: 'Test User'
      });

      await emailService.sendEmail({
        to: 'wrong@example.com', // 错误的邮件地址
        subject: 'Test',
        text: 'Content'
      });

      // Act
      const userEmails = emailService.getEmailsTo(userEmail);
      const wrongEmails = emailService.getEmailsTo('wrong@example.com');

      // Assert
      expect(userEmails).toHaveLength(0); // 正确邮件地址没有收到邮件
      expect(wrongEmails).toHaveLength(1); // 错误邮件地址收到了邮件

      // 这种不一致应该在实际应用中被检测和处理
    });
  });

  describe('单例模式验证', () => {
    it('应该确保管理器是单例', () => {
      // Act
      const instance1 = MockServiceManager.getInstance();
      const instance2 = MockServiceManager.getInstance();
      const instance3 = mockServiceManager;

      // Assert
      expect(instance1).toBe(instance2);
      expect(instance2).toBe(instance3);
      expect(instance1).toBe(manager);
    });

    it('单例状态应该在所有引用中保持一致', () => {
      // Arrange
      const instance1 = MockServiceManager.getInstance();
      const instance2 = mockServiceManager;

      // Act
      instance1.registerMock(geminiService);

      // Assert
      expect(instance2.hasMock('GeminiService')).toBe(true);
      expect(instance1.getStats().totalServices).toBe(instance2.getStats().totalServices);
    });
  });

  describe('清理和资源管理', () => {
    it('应该能够完全清理所有服务和状态', () => {
      // Arrange
      manager.registerMock(geminiService, { trackCalls: true });
      manager.registerMock(emailService, { trackCalls: true });
      manager.registerMock(databaseService, { trackCalls: true });

      // 使用服务
      manager.getMock('GeminiService');
      manager.getMock('EmailService');

      // Act
      manager.cleanup();

      // Assert
      expect(manager.hasMock('GeminiService')).toBe(false);
      expect(manager.hasMock('EmailService')).toBe(false);
      expect(manager.hasMock('DatabaseService')).toBe(false);

      const stats = manager.getStats();
      expect(stats.totalServices).toBe(0);
      expect(stats.activeServices).toBe(0);
      expect(stats.totalCalls).toBe(0);

      const callHistory = manager.getCallHistory();
      expect(callHistory.size).toBe(0);
    });

    it('清理后应该能够重新注册服务', () => {
      // Arrange
      manager.registerMock(geminiService);
      manager.cleanup();

      // Act
      const newGeminiService = new MockGeminiService();
      manager.registerMock(newGeminiService);

      // Assert
      expect(manager.hasMock('GeminiService')).toBe(true);
      const retrievedService = manager.getMock('GeminiService');
      expect(retrievedService).toBe(newGeminiService);
    });
  });
});