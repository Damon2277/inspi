/**
 * 隐私测试集成测试
 */

import { PrivacyTestFramework } from '../../../../lib/testing/privacy';

describe('PrivacyTestingIntegration', () => {
  let framework: PrivacyTestFramework;

  beforeEach(() => {
    framework = new PrivacyTestFramework();
  });

  afterEach(() => {
    framework.cleanup();
  });

  describe('完整隐私测试套件', () => {
    it('应该能够运行完整的隐私保护测试', async () => {
      const testData = {
        user: {
          email: 'test@example.com',
          phone: '123-456-7890',
          name: 'Test User',
        },
        sensitive: {
          ssn: '123-45-6789',
          creditCard: '1234 5678 9012 3456',
        },
      };

      const complianceContext = {
        codebase: {
          files: [
            {
              path: 'src/api/user.ts',
              content: 'export function getUser() { return user; }',
              type: 'typescript' as const,
            },
          ],
        },
        dataModels: [
          {
            name: 'User',
            fields: [
              { name: 'email', type: 'string', sensitive: true, pii: true },
              { name: 'name', type: 'string', sensitive: false, pii: true },
            ],
          },
        ],
        apiEndpoints: [
          {
            path: '/api/user',
            method: 'GET',
            collectsPersonalData: true,
            requiresConsent: false,
          },
        ],
        configuration: {
          dataRetentionPeriods: { User: 365 },
          encryptionSettings: { 'User.email': false },
          auditingEnabled: false,
        },
      };

      const results = await framework.runFullPrivacyTestSuite({
        testData,
        complianceContext,
        generateReports: true,
      });

      expect(results).toBeDefined();
      expect(results.overallScore).toBeGreaterThanOrEqual(0);
      expect(results.overallScore).toBeLessThanOrEqual(100);
      expect(results.summary).toContain('隐私保护测试摘要');
    });

    it('应该正确计算总体评分', async () => {
      const results = await framework.runFullPrivacyTestSuite({
        testData: { test: 'data' },
        generateReports: false,
      });

      expect(typeof results.overallScore).toBe('number');
      expect(results.overallScore).toBeGreaterThanOrEqual(0);
      expect(results.overallScore).toBeLessThanOrEqual(100);
    });

    it('应该生成详细的测试摘要', async () => {
      const results = await framework.runFullPrivacyTestSuite({
        testData: { email: 'test@example.com' },
      });

      expect(results.summary).toContain('隐私保护测试摘要');
      expect(results.summary).toContain('总体评分');
    });
  });

  describe('组件集成测试', () => {
    it('应该正确集成所有隐私测试组件', () => {
      const maskingTester = framework.getMaskingTester();
      const permissionTester = framework.getPermissionTester();
      const deletionTester = framework.getDeletionTester();
      const complianceChecker = framework.getComplianceChecker();

      expect(maskingTester).toBeDefined();
      expect(permissionTester).toBeDefined();
      expect(deletionTester).toBeDefined();
      expect(complianceChecker).toBeDefined();
    });

    it('应该能够独立使用各个测试组件', async () => {
      const maskingTester = framework.getMaskingTester();

      const results = await maskingTester.testDataMasking({
        email: 'test@example.com',
      });

      expect(results).toBeDefined();
      expect(Array.isArray(results)).toBe(true);
    });
  });

  describe('错误处理', () => {
    it('应该处理测试执行中的异常', async () => {
      // 测试无效的合规上下文
      const invalidContext = {
        codebase: { files: [] },
        dataModels: [],
        apiEndpoints: [],
        configuration: {
          dataRetentionPeriods: {},
          encryptionSettings: {},
          auditingEnabled: false,
        },
      };

      await expect(framework.runFullPrivacyTestSuite({
        complianceContext: invalidContext,
      })).resolves.toBeDefined();
    });

    it('应该在没有测试数据时正常运行', async () => {
      const results = await framework.runFullPrivacyTestSuite({});

      expect(results).toBeDefined();
      expect(results.overallScore).toBeGreaterThanOrEqual(0);
    });
  });

  describe('性能测试', () => {
    it('应该在合理时间内完成隐私测试套件', async () => {
      const startTime = Date.now();

      await framework.runFullPrivacyTestSuite({
        testData: { email: 'test@example.com' },
      });

      const endTime = Date.now();
      const executionTime = endTime - startTime;

      expect(executionTime).toBeLessThan(10000); // 应该在10秒内完成
    });
  });

  describe('清理功能', () => {
    it('应该能够清理所有测试组件', () => {
      expect(() => framework.cleanup()).not.toThrow();
    });
  });
});
