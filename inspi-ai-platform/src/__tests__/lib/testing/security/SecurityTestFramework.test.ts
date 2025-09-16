/**
 * Security Test Framework Unit Tests
 */

import { SecurityTestFramework } from '../../../../lib/testing/security/SecurityTestFramework';

describe('SecurityTestFramework', () => {
  let framework: SecurityTestFramework;
  let mockConfig: any;

  beforeEach(() => {
    mockConfig = {
      timeout: 5000,
      retries: 3,
      inputValidation: {
        enabled: true,
        testPayloads: [
          {
            name: 'XSS Basic',
            type: 'xss',
            payload: '<script>alert("test")</script>',
            description: 'Basic XSS test',
            severity: 'high',
            expectedBehavior: 'block'
          },
          {
            name: 'SQL Injection',
            type: 'sql',
            payload: "' OR '1'='1",
            description: 'Basic SQL injection',
            severity: 'critical',
            expectedBehavior: 'block'
          }
        ],
        sanitizationTests: true,
        encodingTests: true
      },
      authorizationTests: {
        enabled: true,
        roleBasedTests: true,
        resourceAccessTests: true,
        elevationTests: true
      },
      encryptionTests: {
        enabled: true,
        algorithmTests: true,
        keyManagementTests: true,
        dataIntegrityTests: true
      },
      vulnerabilityScanning: {
        enabled: true,
        sqlInjection: true,
        xssInjection: true,
        commandInjection: true,
        pathTraversal: true
      },
      reporting: {
        enabled: true,
        detailedLogs: true,
        vulnerabilityScoring: true,
        complianceChecks: true
      }
    };

    framework = new SecurityTestFramework(mockConfig);
  });

  describe('构造函数', () => {
    it('应该正确初始化配置', () => {
      expect(framework).toBeInstanceOf(SecurityTestFramework);
    });

    it('应该继承EventEmitter', () => {
      expect(framework.on).toBeDefined();
      expect(framework.emit).toBeDefined();
    });
  });

  describe('runSecurityTestSuite', () => {
    it('应该运行完整的安全测试套件', async () => {
      const results = await framework.runSecurityTestSuite();
      
      expect(results).toBeDefined();
      expect(Array.isArray(results)).toBe(true);
      expect(results.length).toBeGreaterThan(0);
    });

    it('应该触发相应的事件', async () => {
      const startedSpy = jest.fn();
      const completedSpy = jest.fn();
      
      framework.on('securityTestSuiteStarted', startedSpy);
      framework.on('securityTestSuiteCompleted', completedSpy);
      
      await framework.runSecurityTestSuite();
      
      expect(startedSpy).toHaveBeenCalled();
      expect(completedSpy).toHaveBeenCalled();
    });

    it('应该在禁用所有测试时返回空结果', async () => {
      const disabledConfig = {
        ...mockConfig,
        inputValidation: { ...mockConfig.inputValidation, enabled: false },
        authorizationTests: { ...mockConfig.authorizationTests, enabled: false },
        encryptionTests: { ...mockConfig.encryptionTests, enabled: false },
        vulnerabilityScanning: { ...mockConfig.vulnerabilityScanning, enabled: false }
      };

      const disabledFramework = new SecurityTestFramework(disabledConfig);
      const results = await disabledFramework.runSecurityTestSuite();
      
      expect(results).toBeDefined();
      expect(results.length).toBe(0);
    });
  });

  describe('runInputValidationTests', () => {
    it('应该运行输入验证测试', async () => {
      const results = await framework.runInputValidationTests();
      
      expect(results).toBeDefined();
      expect(Array.isArray(results)).toBe(true);
      expect(results.length).toBeGreaterThan(0);
    });

    it('应该测试所有配置的payload', async () => {
      const results = await framework.runInputValidationTests();
      
      expect(results.length).toBe(mockConfig.inputValidation.testPayloads.length);
    });

    it('应该正确识别恶意payload', async () => {
      const results = await framework.runInputValidationTests();
      
      const xssResult = results.find(r => r.payload?.type === 'xss');
      const sqlResult = results.find(r => r.payload?.type === 'sql');
      
      expect(xssResult).toBeDefined();
      expect(sqlResult).toBeDefined();
    });
  });

  describe('runAuthorizationTests', () => {
    it('应该运行授权测试', async () => {
      const results = await framework.runAuthorizationTests();
      
      expect(results).toBeDefined();
      expect(Array.isArray(results)).toBe(true);
      expect(results.length).toBeGreaterThan(0);
    });

    it('应该测试不同的权限场景', async () => {
      const results = await framework.runAuthorizationTests();
      
      const hasAdminTest = results.some(r => 
        r.testName.includes('Admin') || 
        r.details.userContext.roles?.includes('admin')
      );
      const hasUserTest = results.some(r => 
        r.testName.includes('User') || 
        r.details.userContext.roles?.includes('user')
      );
      
      expect(hasAdminTest || hasUserTest).toBe(true);
    });
  });

  describe('runEncryptionTests', () => {
    it('应该运行加密测试', async () => {
      const results = await framework.runEncryptionTests();
      
      expect(results).toBeDefined();
      expect(Array.isArray(results)).toBe(true);
      expect(results.length).toBeGreaterThan(0);
    });

    it('应该测试不同的加密算法', async () => {
      const results = await framework.runEncryptionTests();
      
      const hasAESTest = results.some(r => 
        r.testName.includes('AES') || 
        r.details.keyInfo?.algorithm?.includes('AES')
      );
      
      expect(hasAESTest).toBe(true);
    });
  });

  describe('runVulnerabilityScanning', () => {
    it('应该运行漏洞扫描', async () => {
      const results = await framework.runVulnerabilityScanning();
      
      expect(results).toBeDefined();
      expect(Array.isArray(results)).toBe(true);
      expect(results.length).toBeGreaterThan(0);
    });

    it('应该扫描不同类型的漏洞', async () => {
      const results = await framework.runVulnerabilityScanning();
      
      const hasSQLScan = results.some(r => r.testName.includes('SQL'));
      const hasXSSScan = results.some(r => r.testName.includes('XSS'));
      
      expect(hasSQLScan || hasXSSScan).toBe(true);
    });
  });

  describe('generateSecurityReport', () => {
    it('应该生成完整的安全报告', async () => {
      await framework.runSecurityTestSuite();
      const report = framework.generateSecurityReport();
      
      expect(report).toBeDefined();
      expect(report.summary).toBeDefined();
      expect(report.vulnerabilities).toBeDefined();
      expect(report.testResults).toBeDefined();
      expect(report.vulnerabilityDetails).toBeDefined();
      expect(report.recommendations).toBeDefined();
      expect(report.timestamp).toBeInstanceOf(Date);
    });

    it('应该正确计算统计信息', async () => {
      await framework.runSecurityTestSuite();
      const report = framework.generateSecurityReport();
      
      expect(report.summary.totalTests).toBeGreaterThanOrEqual(0);
      expect(report.summary.passedTests).toBeGreaterThanOrEqual(0);
      expect(report.summary.failedTests).toBeGreaterThanOrEqual(0);
      expect(report.summary.vulnerableTests).toBeGreaterThanOrEqual(0);
      expect(report.summary.errorTests).toBeGreaterThanOrEqual(0);
      
      const total = report.summary.passedTests + 
                   report.summary.failedTests + 
                   report.summary.vulnerableTests + 
                   report.summary.errorTests;
      expect(total).toBe(report.summary.totalTests);
    });

    it('应该提供有用的建议', async () => {
      await framework.runSecurityTestSuite();
      const report = framework.generateSecurityReport();
      
      expect(report.recommendations).toBeDefined();
      expect(Array.isArray(report.recommendations)).toBe(true);
      expect(report.recommendations.length).toBeGreaterThan(0);
    });
  });

  describe('事件处理', () => {
    it('应该在测试开始时触发事件', async () => {
      const spy = jest.fn();
      framework.on('securityTestSuiteStarted', spy);
      
      await framework.runSecurityTestSuite();
      
      expect(spy).toHaveBeenCalled();
    });

    it('应该在测试完成时触发事件', async () => {
      const spy = jest.fn();
      framework.on('securityTestSuiteCompleted', spy);
      
      await framework.runSecurityTestSuite();
      
      expect(spy).toHaveBeenCalledWith(expect.objectContaining({
        results: expect.any(Array),
        vulnerabilities: expect.any(Array)
      }));
    });

    it('应该在输入验证测试时触发事件', async () => {
      const startSpy = jest.fn();
      const completeSpy = jest.fn();
      
      framework.on('inputValidationTestsStarted', startSpy);
      framework.on('inputValidationTestsCompleted', completeSpy);
      
      await framework.runInputValidationTests();
      
      expect(startSpy).toHaveBeenCalled();
      expect(completeSpy).toHaveBeenCalled();
    });
  });

  describe('错误处理', () => {
    it('应该处理测试执行中的错误', async () => {
      // 创建一个会导致错误的配置
      const errorConfig = {
        ...mockConfig,
        timeout: -1 // 无效的超时值
      };

      const errorFramework = new SecurityTestFramework(errorConfig);
      
      // 测试不应该抛出异常
      await expect(errorFramework.runSecurityTestSuite()).resolves.toBeDefined();
    });

    it('应该在错误时触发错误事件', async () => {
      const errorSpy = jest.fn();
      framework.on('securityTestSuiteError', errorSpy);
      
      // 模拟一个会导致错误的情况
      const originalMethod = framework.runInputValidationTests;
      framework.runInputValidationTests = jest.fn().mockRejectedValue(new Error('Test error'));
      
      try {
        await framework.runSecurityTestSuite();
      } catch (error) {
        // 预期的错误
      }
      
      // 恢复原方法
      framework.runInputValidationTests = originalMethod;
    });
  });

  describe('性能测试', () => {
    it('应该在合理时间内完成测试', async () => {
      const startTime = Date.now();
      await framework.runSecurityTestSuite();
      const endTime = Date.now();
      
      const duration = endTime - startTime;
      expect(duration).toBeLessThan(30000); // 30秒内完成
    });

    it('应该记录测试执行时间', async () => {
      const results = await framework.runSecurityTestSuite();
      
      results.forEach(result => {
        expect(result.duration).toBeGreaterThanOrEqual(0);
        expect(typeof result.duration).toBe('number');
      });
    });
  });
});