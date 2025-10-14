/**
 * 邮件服务限流和错误恢复测试
 * 测试邮件服务的限流机制、错误恢复策略和服务降级
 */

import nodemailer from 'nodemailer';

import { EmailService } from '@/lib/email/service';
import { AssertionHelpers } from '@/lib/testing/helpers/AssertionHelpers';
import { MockEmailService } from '@/lib/testing/mocks/MockEmailService';
import { PerformanceMonitor } from '@/lib/testing/performance/PerformanceMonitor';
import { TestDataFactory } from '@/lib/testing/TestDataFactory';

// Mock dependencies
jest.mock('nodemailer');
jest.mock('@/lib/utils/logger');
jest.mock('redis');

describe('Email Rate Limiting and Recovery Tests', () => {
  let emailService: EmailService;
  let mockEmailService: MockEmailService;
  let mockTransporter: any;
  let testDataFactory: TestDataFactory;
  let performanceMonitor: PerformanceMonitor;

  // Mock Redis for rate limiting
  const mockRedis = {
    get: jest.fn(),
    set: jest.fn(),
    incr: jest.fn(),
    expire: jest.fn(),
    del: jest.fn(),
    exists: jest.fn(),
    ttl: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();

    // Setup mock transporter
    mockTransporter = {
      sendMail: jest.fn(),
      verify: jest.fn(),
      close: jest.fn(),
    };

    (nodemailer.createTransporter as jest.Mock).mockReturnValue(mockTransporter);

    // Setup environment
    process.env.EMAIL_SMTP_HOST = 'smtp.test.com';
    process.env.EMAIL_SMTP_PORT = '587';
    process.env.EMAIL_SMTP_USER = 'test@example.com';
    process.env.EMAIL_SMTP_PASS = 'password';
    process.env.EMAIL_FROM_EMAIL = 'noreply@inspi.ai';
    process.env.EMAIL_FROM_NAME = 'Inspi.AI';
    process.env.REDIS_URL = 'redis://localhost:6379';

    emailService = new EmailService();
    mockEmailService = new MockEmailService();
    testDataFactory = new TestDataFactory();
    performanceMonitor = new PerformanceMonitor();

    // Setup Redis mock
    require('redis').createClient = jest.fn().mockReturnValue(mockRedis);
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.clearAllMocks();

    // Clean up environment
    delete process.env.EMAIL_SMTP_HOST;
    delete process.env.EMAIL_SMTP_PORT;
    delete process.env.EMAIL_SMTP_USER;
    delete process.env.EMAIL_SMTP_PASS;
    delete process.env.EMAIL_FROM_EMAIL;
    delete process.env.EMAIL_FROM_NAME;
    delete process.env.REDIS_URL;
  });

  describe('基于用户的限流', () => {
    it('应该限制单个用户的邮件发送频率', async () => {
      // Arrange
      const user = testDataFactory.user.create({
        email: 'ratelimit@example.com',
        name: 'Rate Limited User',
      });

      const emailOptions = {
        to: user.email,
        subject: 'Rate Limit Test',
        html: '<p>Test content</p>',
      };

      // Mock Redis responses for rate limiting
      mockRedis.get.mockResolvedValue('2'); // 已发送2封
      mockRedis.incr.mockResolvedValue(3);  // 增加到3封
      mockRedis.expire.mockResolvedValue(1);

      mockTransporter.sendMail.mockResolvedValue({ messageId: 'rate-test' });

      // Act
      const result = await emailService.sendEmail(emailOptions);

      // Assert
      expect(result.success).toBe(true);
      expect(mockRedis.get).toHaveBeenCalledWith(`email_rate_limit:user:${user.email}`);
      expect(mockRedis.incr).toHaveBeenCalledWith(`email_rate_limit:user:${user.email}`);
    });

    it('应该在超过用户限制时拒绝发送', async () => {
      // Arrange
      const user = testDataFactory.user.create({
        email: 'overlimit@example.com',
        name: 'Over Limit User',
      });

      const emailOptions = {
        to: user.email,
        subject: 'Over Limit Test',
        html: '<p>This should be rejected</p>',
      };

      // Mock Redis - 用户已达到限制
      mockRedis.get.mockResolvedValue('10'); // 已发送10封（假设限制是5封）

      // Act
      const result = await emailService.sendEmail(emailOptions);

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toContain('Rate limit exceeded');
      expect(mockTransporter.sendMail).not.toHaveBeenCalled();
    });

    it('应该为不同邮件类型设置不同的限制', async () => {
      // Arrange
      const user = testDataFactory.user.create({
        email: 'typelimit@example.com',
        name: 'Type Limit User',
      });

      const verificationEmail = {
        to: user.email,
        subject: 'Verification Code',
        html: '<p>Code: 123456</p>',
        headers: { 'X-Email-Type': 'verification' },
      };

      const marketingEmail = {
        to: user.email,
        subject: 'Marketing Newsletter',
        html: '<p>Check our features!</p>',
        headers: { 'X-Email-Type': 'marketing' },
      };

      // Mock Redis - 验证邮件限制更宽松
      mockRedis.get.mockImplementation((key) => {
        if (key.includes('verification')) return Promise.resolve('2');
        if (key.includes('marketing')) return Promise.resolve('5');
        return Promise.resolve('0');
      });

      mockTransporter.sendMail.mockResolvedValue({ messageId: 'type-test' });

      // Act
      const verificationResult = await emailService.sendEmail(verificationEmail);
      const marketingResult = await emailService.sendEmail(marketingEmail);

      // Assert
      expect(verificationResult.success).toBe(true); // 验证邮件应该通过
      expect(marketingResult.success).toBe(false);   // 营销邮件应该被限制
      expect(marketingResult.error).toContain('Rate limit exceeded');
    });

    it('应该在时间窗口重置后允许发送', async () => {
      // Arrange
      const user = testDataFactory.user.create({
        email: 'window@example.com',
        name: 'Window User',
      });

      const emailOptions = {
        to: user.email,
        subject: 'Window Test',
        html: '<p>Window test</p>',
      };

      // Mock Redis - 初始状态接近限制
      mockRedis.get.mockResolvedValueOnce('4'); // 接近限制
      mockRedis.incr.mockResolvedValueOnce(5);  // 达到限制
      mockRedis.expire.mockResolvedValue(1);

      mockTransporter.sendMail.mockResolvedValue({ messageId: 'window-test' });

      // Act - 第一次发送（应该成功）
      const firstResult = await emailService.sendEmail(emailOptions);

      // 模拟时间窗口重置
      mockRedis.get.mockResolvedValueOnce(null); // 计数器重置
      mockRedis.incr.mockResolvedValueOnce(1);   // 新窗口第一封

      // Act - 时间窗口重置后发送
      const secondResult = await emailService.sendEmail(emailOptions);

      // Assert
      expect(firstResult.success).toBe(true);
      expect(secondResult.success).toBe(true);
    });
  });

  describe('全局限流', () => {
    it('应该实现全局发送速率限制', async () => {
      // Arrange
      const users = Array.from({ length: 20 }, (_, i) =>
        testDataFactory.user.create({
          email: `global${i}@example.com`,
          name: `Global User ${i}`,
        }),
      );

      // Mock Redis - 全局计数器
      let globalCount = 0;
      mockRedis.get.mockImplementation((key) => {
        if (key === 'email_rate_limit:global') {
          return Promise.resolve(globalCount.toString());
        }
        return Promise.resolve('0');
      });

      mockRedis.incr.mockImplementation((key) => {
        if (key === 'email_rate_limit:global') {
          globalCount++;
          return Promise.resolve(globalCount);
        }
        return Promise.resolve(1);
      });

      mockTransporter.sendMail.mockResolvedValue({ messageId: 'global-test' });

      // Act
      const results = await Promise.all(
        users.map(user =>
          emailService.sendEmail({
            to: user.email,
            subject: 'Global Test',
            html: '<p>Global test</p>',
          }),
        ),
      );

      // Assert
      const successCount = results.filter(r => r.success).length;
      const rateLimitedCount = results.filter(r =>
        !r.success && r.error?.includes('Global rate limit'),
      ).length;

      expect(successCount).toBeLessThan(20); // 应该有全局限制
      expect(rateLimitedCount).toBeGreaterThan(0);
    });

    it('应该在系统负载高时降低发送速率', async () => {
      // Arrange
      const user = testDataFactory.user.create({
        email: 'loadtest@example.com',
        name: 'Load Test User',
      });

      // Mock系统负载检测
      const mockSystemLoad = {
        cpu: 0.9,  // 90% CPU使用率
        memory: 0.8, // 80% 内存使用率
        queue: 100,   // 100个待处理任务
      };

      // Mock Redis - 基于负载调整限制
      mockRedis.get.mockImplementation((key) => {
        if (key === 'system_load') {
          return Promise.resolve(JSON.stringify(mockSystemLoad));
        }
        return Promise.resolve('0');
      });

      mockTransporter.sendMail.mockImplementation(() =>
        new Promise(resolve =>
          setTimeout(() => resolve({ messageId: 'load-test' }), 1000),
        ),
      );

      // Act
      const startTime = Date.now();
      const result = await emailService.sendEmail({
        to: user.email,
        subject: 'Load Test',
        html: '<p>Load test</p>',
      });
      const duration = Date.now() - startTime;

      // Assert
      expect(result.success).toBe(true);
      expect(duration).toBeGreaterThan(500); // 应该有延迟
    });

    it('应该实现优先级队列', async () => {
      // Arrange
      const highPriorityEmail = {
        to: 'high@example.com',
        subject: 'High Priority',
        html: '<p>High priority content</p>',
        headers: { 'X-Priority': 'high' },
      };

      const lowPriorityEmail = {
        to: 'low@example.com',
        subject: 'Low Priority',
        html: '<p>Low priority content</p>',
        headers: { 'X-Priority': 'low' },
      };

      const sendOrder: string[] = [];
      mockTransporter.sendMail.mockImplementation((options) => {
        sendOrder.push(options.to);
        return Promise.resolve({ messageId: 'priority-test' });
      });

      // Act - 先发送低优先级，再发送高优先级
      const lowPromise = emailService.sendEmail(lowPriorityEmail);
      const highPromise = emailService.sendEmail(highPriorityEmail);

      await Promise.all([lowPromise, highPromise]);

      // Assert
      // 高优先级邮件应该先发送
      expect(sendOrder[0]).toBe('high@example.com');
      expect(sendOrder[1]).toBe('low@example.com');
    });
  });

  describe('错误恢复机制', () => {
    it('应该实现指数退避重试', async () => {
      // Arrange
      const user = testDataFactory.user.create({
        email: 'retry@example.com',
        name: 'Retry User',
      });

      const emailOptions = {
        to: user.email,
        subject: 'Retry Test',
        html: '<p>Retry test</p>',
      };

      const retryDelays: number[] = [];
      let attemptCount = 0;

      mockTransporter.sendMail.mockImplementation(() => {
        attemptCount++;
        const delay = Math.pow(2, attemptCount - 1) * 1000; // 指数退避
        retryDelays.push(delay);

        if (attemptCount < 3) {
          return Promise.reject(new Error('Temporary failure'));
        }
        return Promise.resolve({ messageId: 'retry-success' });
      });

      // Act
      const result = await emailService.sendEmail(emailOptions);

      // Assert
      expect(result.success).toBe(true);
      expect(attemptCount).toBe(3);
      expect(retryDelays).toEqual([1000, 2000, 4000]); // 1s, 2s, 4s
    });

    it('应该区分可重试和不可重试的错误', async () => {
      // Arrange
      const testCases = [
        {
          error: Object.assign(new Error('Network timeout'), { code: 'ETIMEDOUT' }),
          shouldRetry: true,
          description: '网络超时',
        },
        {
          error: Object.assign(new Error('Connection reset'), { code: 'ECONNRESET' }),
          shouldRetry: true,
          description: '连接重置',
        },
        {
          error: Object.assign(new Error('Authentication failed'), { code: 'EAUTH' }),
          shouldRetry: false,
          description: '认证失败',
        },
        {
          error: Object.assign(new Error('Invalid recipient'), { responseCode: 550 }),
          shouldRetry: false,
          description: '无效收件人',
        },
      ];

      for (const testCase of testCases) {
        // Arrange
        const user = testDataFactory.user.create({
          email: `${testCase.error.code}@example.com`,
          name: 'Error Test User',
        });

        let attemptCount = 0;
        mockTransporter.sendMail.mockImplementation(() => {
          attemptCount++;
          return Promise.reject(testCase.error);
        });

        // Act
        const result = await emailService.sendEmail({
          to: user.email,
          subject: 'Error Test',
          html: '<p>Error test</p>',
        });

        // Assert
        expect(result.success).toBe(false);

        if (testCase.shouldRetry) {
          expect(attemptCount).toBeGreaterThan(1); // 应该重试
        } else {
          expect(attemptCount).toBe(1); // 不应该重试
        }

        // Reset for next test
        jest.clearAllMocks();
      }
    });

    it('应该实现断路器模式', async () => {
      // Arrange
      const user = testDataFactory.user.create({
        email: 'circuit@example.com',
        name: 'Circuit Breaker User',
      });

      const emailOptions = {
        to: user.email,
        subject: 'Circuit Breaker Test',
        html: '<p>Circuit breaker test</p>',
      };

      // Mock连续失败
      mockTransporter.sendMail.mockRejectedValue(new Error('Service unavailable'));

      // Act - 发送多封邮件触发断路器
      const results = await Promise.all([
        emailService.sendEmail(emailOptions),
        emailService.sendEmail(emailOptions),
        emailService.sendEmail(emailOptions),
        emailService.sendEmail(emailOptions),
        emailService.sendEmail(emailOptions),
      ]);

      // Assert
      const failureCount = results.filter(r => !r.success).length;
      expect(failureCount).toBe(5);

      // 后续请求应该快速失败（断路器打开）
      const circuitOpenResult = await emailService.sendEmail(emailOptions);
      expect(circuitOpenResult.success).toBe(false);
      expect(circuitOpenResult.error).toContain('Circuit breaker is open');
    });

    it('应该在服务恢复后重置断路器', async () => {
      // Arrange
      const user = testDataFactory.user.create({
        email: 'recovery@example.com',
        name: 'Recovery User',
      });

      const emailOptions = {
        to: user.email,
        subject: 'Recovery Test',
        html: '<p>Recovery test</p>',
      };

      // Mock初始失败，然后恢复
      let callCount = 0;
      mockTransporter.sendMail.mockImplementation(() => {
        callCount++;
        if (callCount <= 5) {
          return Promise.reject(new Error('Service unavailable'));
        }
        return Promise.resolve({ messageId: 'recovery-success' });
      });

      // Act - 触发断路器
      await Promise.all(Array(5).fill(null).map(() =>
        emailService.sendEmail(emailOptions),
      ));

      // 等待断路器半开状态
      jest.advanceTimersByTime(60000); // 1分钟后

      // 尝试发送（应该成功并重置断路器）
      const recoveryResult = await emailService.sendEmail(emailOptions);

      // Assert
      expect(recoveryResult.success).toBe(true);
      expect(recoveryResult.messageId).toBe('recovery-success');
    });

    it('应该实现服务降级', async () => {
      // Arrange
      const user = testDataFactory.user.create({
        email: 'degraded@example.com',
        name: 'Degraded User',
      });

      // Mock服务不可用
      mockTransporter.sendMail.mockRejectedValue(new Error('Service unavailable'));

      // Mock降级存储（如文件系统或备用队列）
      const mockDegradedStorage = {
        store: jest.fn().mockResolvedValue(true),
      };

      // Act
      const result = await emailService.sendEmail({
        to: user.email,
        subject: 'Degraded Test',
        html: '<p>Degraded test</p>',
      }, {
        allowDegradation: true,
        degradedStorage: mockDegradedStorage,
      });

      // Assert
      expect(result.success).toBe(true);
      expect(result.degraded).toBe(true);
      expect(mockDegradedStorage.store).toHaveBeenCalled();
    });
  });

  describe('队列管理', () => {
    it('应该实现邮件队列', async () => {
      // Arrange
      const emails = Array.from({ length: 10 }, (_, i) => ({
        to: `queue${i}@example.com`,
        subject: `Queue Test ${i}`,
        html: `<p>Queue test ${i}</p>`,
      }));

      const processedOrder: number[] = [];
      mockTransporter.sendMail.mockImplementation((options) => {
        const index = parseInt(options.subject.match(/\d+/)?.[0] || '0', 10);
        processedOrder.push(index);
        return Promise.resolve({ messageId: `queue-${index}` });
      });

      // Act
      const results = await Promise.all(
        emails.map(email => emailService.sendEmail(email)),
      );

      // Assert
      expect(results.every(r => r.success)).toBe(true);
      expect(processedOrder).toHaveLength(10);
    });

    it('应该处理队列满的情况', async () => {
      // Arrange
      const user = testDataFactory.user.create({
        email: 'queuefull@example.com',
        name: 'Queue Full User',
      });

      // Mock队列满
      mockRedis.get.mockResolvedValue('1000'); // 队列中有1000个任务

      // Act
      const result = await emailService.sendEmail({
        to: user.email,
        subject: 'Queue Full Test',
        html: '<p>Queue full test</p>',
      });

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toContain('Email queue is full');
    });

    it('应该支持延迟发送', async () => {
      // Arrange
      const user = testDataFactory.user.create({
        email: 'delayed@example.com',
        name: 'Delayed User',
      });

      const delayMs = 5000; // 5秒延迟
      const sendTime = Date.now();

      mockTransporter.sendMail.mockImplementation(() =>
        new Promise(resolve =>
          setTimeout(() => resolve({ messageId: 'delayed-test' }), delayMs),
        ),
      );

      // Act
      const result = await emailService.sendEmail({
        to: user.email,
        subject: 'Delayed Test',
        html: '<p>Delayed test</p>',
      }, {
        delay: delayMs,
      });

      const actualDelay = Date.now() - sendTime;

      // Assert
      expect(result.success).toBe(true);
      expect(actualDelay).toBeGreaterThanOrEqual(delayMs);
    });

    it('应该支持批量发送优化', async () => {
      // Arrange
      const recipients = Array.from({ length: 100 }, (_, i) =>
        `batch${i}@example.com`,
      );

      const batchEmail = {
        to: recipients,
        subject: 'Batch Test',
        html: '<p>Batch test</p>',
      };

      let batchCount = 0;
      mockTransporter.sendMail.mockImplementation((options) => {
        batchCount++;
        // 模拟批量发送，每次处理多个收件人
        return Promise.resolve({ messageId: `batch-${batchCount}` });
      });

      // Act
      const result = await emailService.sendEmail(batchEmail);

      // Assert
      expect(result.success).toBe(true);
      // 批量发送应该减少SMTP连接数
      expect(batchCount).toBeLessThan(recipients.length);
    });
  });

  describe('监控和指标', () => {
    it('应该收集发送指标', async () => {
      // Arrange
      const user = testDataFactory.user.create({
        email: 'metrics@example.com',
        name: 'Metrics User',
      });

      mockTransporter.sendMail.mockResolvedValue({ messageId: 'metrics-test' });

      // Act
      await emailService.sendEmail({
        to: user.email,
        subject: 'Metrics Test',
        html: '<p>Metrics test</p>',
      });

      const metrics = emailService.getMetrics();

      // Assert
      expect(metrics).toHaveProperty('totalSent');
      expect(metrics).toHaveProperty('totalFailed');
      expect(metrics).toHaveProperty('averageResponseTime');
      expect(metrics).toHaveProperty('rateLimitHits');
      expect(metrics.totalSent).toBeGreaterThan(0);
    });

    it('应该监控性能指标', async () => {
      // Arrange
      const user = testDataFactory.user.create({
        email: 'performance@example.com',
        name: 'Performance User',
      });

      const responseTime = 500;
      mockTransporter.sendMail.mockImplementation(() =>
        new Promise(resolve =>
          setTimeout(() => resolve({ messageId: 'perf-test' }), responseTime),
        ),
      );

      // Act
      const timer = performanceMonitor.startTimer('email-performance');
      await emailService.sendEmail({
        to: user.email,
        subject: 'Performance Test',
        html: '<p>Performance test</p>',
      });
      const duration = performanceMonitor.endTimer('email-performance');

      // Assert
      expect(duration).toBeGreaterThanOrEqual(responseTime);

      const performanceMetrics = performanceMonitor.getMetrics();
      expect(performanceMetrics).toHaveProperty('email-performance');
    });

    it('应该生成健康检查报告', async () => {
      // Arrange
      mockTransporter.verify.mockResolvedValue(true);
      mockRedis.get.mockResolvedValue('5'); // 队列中有5个任务

      // Act
      const healthReport = await emailService.getHealthReport();

      // Assert
      expect(healthReport).toHaveProperty('status');
      expect(healthReport).toHaveProperty('smtp');
      expect(healthReport).toHaveProperty('queue');
      expect(healthReport).toHaveProperty('rateLimiter');
      expect(healthReport.status).toBe('healthy');
    });
  });

  describe('配置和管理', () => {
    it('应该支持动态配置更新', async () => {
      // Arrange
      const newConfig = {
        rateLimits: {
          perUser: 10,
          perHour: 100,
          global: 1000,
        },
        retryPolicy: {
          maxAttempts: 5,
          backoffMultiplier: 2,
        },
      };

      // Act
      await emailService.updateConfig(newConfig);
      const currentConfig = emailService.getConfig();

      // Assert
      expect(currentConfig.rateLimits.perUser).toBe(10);
      expect(currentConfig.retryPolicy.maxAttempts).toBe(5);
    });

    it('应该支持配置验证', async () => {
      // Arrange
      const invalidConfig = {
        rateLimits: {
          perUser: -1, // 无效值
          perHour: 'invalid', // 无效类型
        },
      };

      // Act & Assert
      await expect(
        emailService.updateConfig(invalidConfig),
      ).rejects.toThrow('Invalid configuration');
    });

    it('应该支持运行时统计重置', async () => {
      // Arrange
      const user = testDataFactory.user.create({
        email: 'reset@example.com',
        name: 'Reset User',
      });

      mockTransporter.sendMail.mockResolvedValue({ messageId: 'reset-test' });

      // 发送一些邮件
      await emailService.sendEmail({
        to: user.email,
        subject: 'Reset Test',
        html: '<p>Reset test</p>',
      });

      // Act
      await emailService.resetMetrics();
      const metrics = emailService.getMetrics();

      // Assert
      expect(metrics.totalSent).toBe(0);
      expect(metrics.totalFailed).toBe(0);
    });
  });
});
