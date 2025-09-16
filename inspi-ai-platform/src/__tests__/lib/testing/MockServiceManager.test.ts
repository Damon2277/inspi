/**
 * Mock服务管理器测试
 * 验证Mock服务注册、管理和一致性验证功能
 */

import {
  MockServiceManager,
  MockGeminiService,
  MockEmailService,
  MockDatabaseService,
  BaseMockService,
  MockService,
  MockServiceStatus
} from '@/lib/testing';

describe('MockServiceManager', () => {
  let manager: MockServiceManager;
  let mockGeminiService: MockGeminiService;
  let mockEmailService: MockEmailService;
  let mockDatabaseService: MockDatabaseService;

  beforeEach(() => {
    manager = MockServiceManager.getInstance();
    manager.cleanup(); // 清理之前的状态
    
    mockGeminiService = new MockGeminiService();
    mockEmailService = new MockEmailService();
    mockDatabaseService = new MockDatabaseService();
  });

  afterEach(() => {
    manager.cleanup();
  });

  describe('服务注册和管理', () => {
    it('应该能够注册Mock服务', () => {
      // Arrange & Act
      manager.registerMock(mockGeminiService);
      
      // Assert
      expect(manager.hasMock('GeminiService')).toBe(true);
      const retrievedService = manager.getMock<MockGeminiService>('GeminiService');
      expect(retrievedService).toBe(mockGeminiService);
    });

    it('应该能够注册多个不同类型的Mock服务', () => {
      // Arrange & Act
      manager.registerMock(mockGeminiService);
      manager.registerMock(mockEmailService);
      manager.registerMock(mockDatabaseService);
      
      // Assert
      expect(manager.hasMock('GeminiService')).toBe(true);
      expect(manager.hasMock('EmailService')).toBe(true);
      expect(manager.hasMock('DatabaseService')).toBe(true);
    });

    it('应该能够替换已注册的服务', () => {
      // Arrange
      const firstService = new MockGeminiService();
      const secondService = new MockGeminiService();
      
      // Act
      manager.registerMock(firstService);
      manager.registerMock(secondService);
      
      // Assert
      const retrievedService = manager.getMock<MockGeminiService>('GeminiService');
      expect(retrievedService).toBe(secondService);
      expect(retrievedService).not.toBe(firstService);
    });

    it('应该能够配置服务选项', () => {
      // Arrange
      const config = {
        name: 'GeminiService',
        autoReset: true,
        trackCalls: true,
        validateConsistency: true
      };
      
      // Act
      manager.registerMock(mockGeminiService, config);
      
      // Assert
      expect(manager.hasMock('GeminiService')).toBe(true);
    });

    it('获取不存在的服务应该返回null', () => {
      // Act
      const service = manager.getMock('NonExistentService');
      
      // Assert
      expect(service).toBeNull();
    });
  });

  describe('服务重置功能', () => {
    beforeEach(() => {
      manager.registerMock(mockGeminiService);
      manager.registerMock(mockEmailService);
      manager.registerMock(mockDatabaseService);
    });

    it('应该能够重置所有Mock服务', () => {
      // Arrange
      mockGeminiService.setFailureRate(0.5);
      mockEmailService.setFailureRate(0.3);
      
      // Act
      manager.resetAllMocks();
      
      // Assert
      const geminiStats = mockGeminiService.getStats();
      const emailStats = mockEmailService.getDetailedStats();
      
      expect(geminiStats.callCount).toBe(0);
      expect(emailStats.callCount).toBe(0);
      expect(geminiStats.failureRate).toBe(0);
      expect(emailStats.config.failureRate).toBe(0);
    });

    it('应该能够重置特定Mock服务', () => {
      // Arrange
      mockGeminiService.setFailureRate(0.5);
      mockEmailService.setFailureRate(0.3);
      
      // Act
      manager.resetMock('GeminiService');
      
      // Assert
      const geminiStats = mockGeminiService.getStats();
      const emailStats = mockEmailService.getDetailedStats();
      
      expect(geminiStats.callCount).toBe(0);
      expect(geminiStats.failureRate).toBe(0);
      expect(emailStats.config.failureRate).toBe(0.3); // 未重置
    });

    it('重置不存在的服务应该不抛出错误', () => {
      // Act & Assert
      expect(() => {
        manager.resetMock('NonExistentService');
      }).not.toThrow();
    });
  });

  describe('服务验证功能', () => {
    beforeEach(() => {
      manager.registerMock(mockGeminiService);
      manager.registerMock(mockEmailService);
      manager.registerMock(mockDatabaseService);
    });

    it('应该能够验证所有Mock服务', async () => {
      // Act
      const result = await manager.verifyAllMocks();
      
      // Assert
      expect(result.allValid).toBe(true);
      expect(result.results).toHaveLength(3);
      expect(result.timestamp).toBeInstanceOf(Date);
      
      result.results.forEach(serviceResult => {
        expect(serviceResult.isValid).toBe(true);
        expect(serviceResult.errors).toHaveLength(0);
      });
    });

    it('应该能够验证特定Mock服务', async () => {
      // Act
      const result = await manager.verifyMock('GeminiService');
      
      // Assert
      expect(result.serviceName).toBe('GeminiService');
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('验证失败的服务应该返回错误信息', async () => {
      // Arrange
      mockGeminiService.setFailureRate(1); // 100% 失败率
      
      // Act
      const result = await manager.verifyMock('GeminiService');
      
      // Assert
      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('验证不存在的服务应该返回错误', async () => {
      // Act
      const result = await manager.verifyMock('NonExistentService');
      
      // Assert
      expect(result.serviceName).toBe('NonExistentService');
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Service not found');
    });
  });

  describe('服务状态管理', () => {
    beforeEach(() => {
      manager.registerMock(mockGeminiService);
      manager.registerMock(mockEmailService);
    });

    it('应该能够获取所有服务状态', () => {
      // Act
      const statuses = manager.getAllMockStatus();
      
      // Assert
      expect(statuses).toHaveLength(2);
      
      const geminiStatus = statuses.find(s => s.name === 'GeminiService');
      const emailStatus = statuses.find(s => s.name === 'EmailService');
      
      expect(geminiStatus).toBeDefined();
      expect(emailStatus).toBeDefined();
      expect(geminiStatus!.isActive).toBe(true);
      expect(emailStatus!.isActive).toBe(true);
    });

    it('应该能够获取管理器统计信息', () => {
      // Act
      const stats = manager.getStats();
      
      // Assert
      expect(stats.totalServices).toBe(2);
      expect(stats.activeServices).toBe(2);
      expect(stats.totalCalls).toBe(0);
      expect(stats.servicesWithErrors).toBe(0);
    });
  });

  describe('调用历史跟踪', () => {
    it('应该能够跟踪服务调用历史', () => {
      // Arrange
      const config = {
        name: 'GeminiService',
        trackCalls: true
      };
      manager.registerMock(mockGeminiService, config);
      
      // Act
      manager.getMock('GeminiService');
      manager.getMock('GeminiService');
      
      // Assert
      const history = manager.getCallHistory('GeminiService');
      expect(history.has('GeminiService')).toBe(true);
      expect(history.get('GeminiService')).toHaveLength(2);
    });

    it('应该能够获取所有服务的调用历史', () => {
      // Arrange
      const geminiConfig = { name: 'GeminiService', trackCalls: true };
      const emailConfig = { name: 'EmailService', trackCalls: true };
      
      manager.registerMock(mockGeminiService, geminiConfig);
      manager.registerMock(mockEmailService, emailConfig);
      
      // Act
      manager.getMock('GeminiService');
      manager.getMock('EmailService');
      
      // Assert
      const allHistory = manager.getCallHistory();
      expect(allHistory.size).toBe(2);
      expect(allHistory.has('GeminiService')).toBe(true);
      expect(allHistory.has('EmailService')).toBe(true);
    });
  });

  describe('清理功能', () => {
    it('应该能够完全清理管理器', () => {
      // Arrange
      manager.registerMock(mockGeminiService);
      manager.registerMock(mockEmailService);
      
      // Act
      manager.cleanup();
      
      // Assert
      expect(manager.hasMock('GeminiService')).toBe(false);
      expect(manager.hasMock('EmailService')).toBe(false);
      
      const stats = manager.getStats();
      expect(stats.totalServices).toBe(0);
      expect(stats.activeServices).toBe(0);
    });
  });

  describe('错误处理', () => {
    it('应该处理服务重置时的错误', () => {
      // Arrange
      const faultyService = new (class extends BaseMockService {
        constructor() {
          super('FaultyService', '1.0.0');
        }
        
        reset(): void {
          throw new Error('Reset failed');
        }
        
        protected async onVerify(): Promise<boolean> {
          return true;
        }
      })();
      
      manager.registerMock(faultyService);
      
      // Act & Assert
      expect(() => {
        manager.resetAllMocks();
      }).not.toThrow();
    });

    it('应该处理服务验证时的错误', async () => {
      // Arrange
      const faultyService = new (class extends BaseMockService {
        constructor() {
          super('FaultyService', '1.0.0');
        }
        
        protected async onVerify(): Promise<boolean> {
          throw new Error('Verification failed');
        }
      })();
      
      manager.registerMock(faultyService);
      
      // Act
      const result = await manager.verifyMock('FaultyService');
      
      // Assert
      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });
  });

  describe('单例模式', () => {
    it('应该返回相同的实例', () => {
      // Act
      const instance1 = MockServiceManager.getInstance();
      const instance2 = MockServiceManager.getInstance();
      
      // Assert
      expect(instance1).toBe(instance2);
    });
  });
});