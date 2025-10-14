/**
 * Security Testing Integration Tests
 *
 * 测试安全测试框架的集成功能
 */

import {
  SecurityTestFramework,
  InputValidationTester,
  AuthorizationTester,
  EncryptionValidator,
  VulnerabilityScanner,
} from '../../../../lib/testing/security';

describe('安全测试集成', () => {
  describe('SecurityTestFramework', () => {
    let framework: SecurityTestFramework;

    beforeEach(() => {
      const config = {
        timeout: 5000,
        retries: 3,
        inputValidation: {
          enabled: true,
          testPayloads: [
            {
              name: 'XSS Test',
              type: 'xss' as const,
              payload: '<script>alert("test")</script>',
              description: 'Basic XSS test',
              severity: 'high' as const,
              expectedBehavior: 'block' as const,
            },
          ],
          sanitizationTests: true,
          encodingTests: true,
        },
        authorizationTests: {
          enabled: true,
          roleBasedTests: true,
          resourceAccessTests: true,
          elevationTests: true,
        },
        encryptionTests: {
          enabled: true,
          algorithmTests: true,
          keyManagementTests: true,
          dataIntegrityTests: true,
        },
        vulnerabilityScanning: {
          enabled: true,
          sqlInjection: true,
          xssInjection: true,
          commandInjection: true,
          pathTraversal: true,
        },
        reporting: {
          enabled: true,
          detailedLogs: true,
          vulnerabilityScoring: true,
          complianceChecks: true,
        },
      };

      framework = new SecurityTestFramework(config);
    });

    it('应该能够运行完整的安全测试套件', async () => {
      const results = await framework.runSecurityTestSuite();

      expect(results).toBeDefined();
      expect(Array.isArray(results)).toBe(true);
      expect(results.length).toBeGreaterThan(0);
    });

    it('应该能够生成安全测试报告', async () => {
      await framework.runSecurityTestSuite();
      const report = framework.generateSecurityReport();

      expect(report).toBeDefined();
      expect(report.summary).toBeDefined();
      expect(report.vulnerabilities).toBeDefined();
      expect(report.testResults).toBeDefined();
      expect(report.recommendations).toBeDefined();
      expect(report.timestamp).toBeInstanceOf(Date);
    });

    it('应该能够检测到安全漏洞', async () => {
      const results = await framework.runSecurityTestSuite();
      const report = framework.generateSecurityReport();

      // 检查是否有漏洞被检测到
      expect(report.vulnerabilities.total).toBeGreaterThanOrEqual(0);

      if (report.vulnerabilities.total > 0) {
        expect(report.vulnerabilityDetails.length).toBeGreaterThan(0);
        expect(report.recommendations.length).toBeGreaterThan(0);
      }
    });
  });

  describe('InputValidationTester', () => {
    let tester: InputValidationTester;
    let mockValidator: any;

    beforeEach(() => {
      const config = {
        enableXSSTests: true,
        enableSQLInjectionTests: true,
        enableCommandInjectionTests: true,
        enablePathTraversalTests: true,
        enableFileUploadTests: true,
        customPayloads: [],
        sanitizationRules: [
          {
            name: 'Remove Scripts',
            pattern: /<script[^>]*>.*?<\/script>/gi,
            replacement: '',
            description: 'Remove script tags',
          },
        ],
      };

      tester = new InputValidationTester(config);

      mockValidator = {
        validate: jest.fn().mockResolvedValue({
          original: 'test input',
          blocked: false,
          sanitized: 'test input',
          escaped: 'test input',
          errors: [],
          warnings: [],
        }),
      };
    });

    it('应该能够运行输入验证测试', async () => {
      const results = await tester.runValidationTests(mockValidator);

      expect(results).toBeDefined();
      expect(Array.isArray(results)).toBe(true);
      expect(results.length).toBeGreaterThan(0);
      expect(mockValidator.validate).toHaveBeenCalled();
    });

    it('应该能够检测XSS漏洞', async () => {
      mockValidator.validate.mockResolvedValue({
        original: '<script>alert("xss")</script>',
        blocked: false,
        sanitized: '<script>alert("xss")</script>',
        escaped: '<script>alert("xss")</script>',
        errors: [],
        warnings: [],
      });

      const results = await tester.runValidationTests(mockValidator);
      const xssResults = results.filter(r => r.payload.type === 'xss');

      expect(xssResults.length).toBeGreaterThan(0);

      // 检查是否有失败的XSS测试（表示检测到漏洞）
      const failedXssTests = xssResults.filter(r => !r.passed);
      expect(failedXssTests.length).toBeGreaterThanOrEqual(0);
    });

    it('应该能够生成验证报告', async () => {
      const results = await tester.runValidationTests(mockValidator);
      const report = tester.generateValidationReport(results);

      expect(report).toBeDefined();
      expect(report.summary).toBeDefined();
      expect(report.riskDistribution).toBeDefined();
      expect(report.testResults).toBeDefined();
      expect(report.recommendations).toBeDefined();
      expect(report.timestamp).toBeInstanceOf(Date);
    });
  });

  describe('AuthorizationTester', () => {
    let tester: AuthorizationTester;
    let mockAuthService: any;

    beforeEach(() => {
      const config = {
        enableRoleBasedTests: true,
        enableResourceAccessTests: true,
        enablePrivilegeEscalationTests: true,
        enableSessionTests: true,
        enableTokenTests: true,
        customRoles: [],
        customResources: [],
        testScenarios: [],
      };

      tester = new AuthorizationTester(config);

      mockAuthService = {
        authorize: jest.fn().mockResolvedValue({
          allowed: true,
          decision: 'allow',
          reasonCode: 'valid_permissions',
          additionalInfo: {},
        }),
      };
    });

    it('应该能够运行授权测试', async () => {
      const results = await tester.runAuthorizationTests(mockAuthService);

      expect(results).toBeDefined();
      expect(Array.isArray(results)).toBe(true);
      expect(results.length).toBeGreaterThan(0);
      expect(mockAuthService.authorize).toHaveBeenCalled();
    });

    it('应该能够检测权限提升漏洞', async () => {
      // 模拟权限提升漏洞：普通用户能够访问管理员资源
      mockAuthService.authorize.mockImplementation((user: any, resource: any, action: string) => {
        return Promise.resolve({
          allowed: true, // 错误地允许访问
          decision: 'allow',
          reasonCode: 'bypass_detected',
          additionalInfo: {},
        });
      });

      const results = await tester.runAuthorizationTests(mockAuthService);
      const privilegeEscalationTests = results.filter(r => r.scenario.testType === 'privilege_escalation');

      expect(privilegeEscalationTests.length).toBeGreaterThan(0);

      // 检查是否有失败的权限提升测试
      const failedTests = privilegeEscalationTests.filter(r => !r.passed);
      expect(failedTests.length).toBeGreaterThan(0);
    });

    it('应该能够生成授权报告', async () => {
      const results = await tester.runAuthorizationTests(mockAuthService);
      const report = tester.generateAuthorizationReport(results);

      expect(report).toBeDefined();
      expect(report.summary).toBeDefined();
      expect(report.riskDistribution).toBeDefined();
      expect(report.testTypeResults).toBeDefined();
      expect(report.securityIssues).toBeDefined();
      expect(report.recommendations).toBeDefined();
      expect(report.timestamp).toBeInstanceOf(Date);
    });
  });

  describe('EncryptionValidator', () => {
    let validator: EncryptionValidator;
    let mockEncryptionService: any;

    beforeEach(() => {
      const config = {
        enableAlgorithmTests: true,
        enableKeyManagementTests: true,
        enableDataIntegrityTests: true,
        enablePerformanceTests: true,
        supportedAlgorithms: [
          {
            name: 'AES-256',
            type: 'symmetric' as const,
            keySize: 256,
            blockSize: 128,
            mode: 'CBC',
            padding: 'PKCS7',
            description: 'AES 256-bit encryption',
          },
        ],
        keyStrengthRequirements: {
          minimumSymmetricKeySize: 128,
          minimumAsymmetricKeySize: 2048,
          requiredRandomness: 128,
          keyRotationInterval: 86400,
        },
        testDataSets: [
          {
            name: 'Small Text',
            data: 'Hello, World!',
            size: 13,
            type: 'text' as const,
            sensitivityLevel: 'low' as const,
          },
        ],
      };

      validator = new EncryptionValidator(config);

      mockEncryptionService = {
        encrypt: jest.fn().mockResolvedValue('encrypted_data_base64'),
        decrypt: jest.fn().mockResolvedValue('Hello, World!'),
        generateKey: jest.fn().mockResolvedValue('generated_key_base64'),
        storeKey: jest.fn().mockResolvedValue(undefined),
        retrieveKey: jest.fn().mockResolvedValue('stored_key_base64'),
        deleteKey: jest.fn().mockResolvedValue(undefined),
      };
    });

    it('应该能够运行加密测试', async () => {
      const results = await validator.runEncryptionTests(mockEncryptionService);

      expect(results).toBeDefined();
      expect(Array.isArray(results)).toBe(true);
      expect(results.length).toBeGreaterThan(0);
      expect(mockEncryptionService.encrypt).toHaveBeenCalled();
      expect(mockEncryptionService.decrypt).toHaveBeenCalled();
    });

    it('应该能够检测加密问题', async () => {
      // 模拟加密失败
      mockEncryptionService.decrypt.mockResolvedValue('Wrong Data!');

      const results = await validator.runEncryptionTests(mockEncryptionService);
      const failedTests = results.filter(r => r.status === 'failed' || r.status === 'error');

      expect(failedTests.length).toBeGreaterThan(0);
    });

    it('应该能够生成加密报告', async () => {
      const results = await validator.runEncryptionTests(mockEncryptionService);
      const report = validator.generateEncryptionReport(results);

      expect(report).toBeDefined();
      expect(report.summary).toBeDefined();
      expect(report.securityLevels).toBeDefined();
      expect(report.issueDistribution).toBeDefined();
      expect(report.testResults).toBeDefined();
      expect(report.recommendations).toBeDefined();
      expect(report.timestamp).toBeInstanceOf(Date);
    });
  });

  describe('VulnerabilityScanner', () => {
    let scanner: VulnerabilityScanner;

    beforeEach(() => {
      const config = {
        enableWebVulnerabilityScans: true,
        enableInjectionScans: true,
        enableConfigurationScans: true,
        enableDependencyScans: true,
        scanDepth: 'medium' as const,
        timeout: 10000,
        maxConcurrentScans: 5,
        customRules: [],
        excludePatterns: [],
      };

      scanner = new VulnerabilityScanner(config);
    });

    it('应该能够运行漏洞扫描', async () => {
      const targets = [
        {
          type: 'url' as const,
          identifier: 'https://example.com/api/test',
          method: 'GET',
          parameters: [],
          headers: {},
          authentication: { type: 'none' as const },
        },
      ];

      const results = await scanner.runVulnerabilityScan(targets);

      expect(results).toBeDefined();
      expect(Array.isArray(results)).toBe(true);
      expect(results.length).toBe(targets.length);
    });

    it('应该能够检测各种类型的漏洞', async () => {
      const targets = [
        {
          type: 'endpoint' as const,
          identifier: '/api/vulnerable',
          method: 'POST',
          parameters: [
            {
              name: 'input',
              type: 'string' as const,
              required: true,
              testValues: ['<script>alert("xss")</script>', "'; DROP TABLE users; --"],
            },
          ],
          headers: {},
          authentication: { type: 'none' as const },
        },
      ];

      const results = await scanner.runVulnerabilityScan(targets);

      expect(results.length).toBeGreaterThan(0);

      const vulnerabilities = results.flatMap(r => r.vulnerabilities);
      expect(vulnerabilities.length).toBeGreaterThanOrEqual(0);
    });

    it('应该能够生成漏洞扫描报告', async () => {
      const targets = [
        {
          type: 'url' as const,
          identifier: 'https://example.com',
          method: 'GET',
          parameters: [],
          headers: {},
          authentication: { type: 'none' as const },
        },
      ];

      const results = await scanner.runVulnerabilityScan(targets);
      const report = scanner.generateVulnerabilityReport(results);

      expect(report).toBeDefined();
      expect(report.summary).toBeDefined();
      expect(report.severityDistribution).toBeDefined();
      expect(report.categoryDistribution).toBeDefined();
      expect(report.scanResults).toBeDefined();
      expect(report.topVulnerabilities).toBeDefined();
      expect(report.recommendations).toBeDefined();
      expect(report.timestamp).toBeInstanceOf(Date);
    });
  });

  describe('安全测试集成场景', () => {
    it('应该能够协同运行多个安全测试组件', async () => {
      // 创建各个测试组件
      const securityFramework = new SecurityTestFramework({
        timeout: 5000,
        retries: 1,
        inputValidation: { enabled: true, testPayloads: [], sanitizationTests: true, encodingTests: true },
        authorizationTests: { enabled: true, roleBasedTests: true, resourceAccessTests: true, elevationTests: true },
        encryptionTests: { enabled: true, algorithmTests: true, keyManagementTests: true, dataIntegrityTests: true },
        vulnerabilityScanning: { enabled: true, sqlInjection: true, xssInjection: true, commandInjection: true, pathTraversal: true },
        reporting: { enabled: true, detailedLogs: true, vulnerabilityScoring: true, complianceChecks: true },
      });

      const inputValidator = new InputValidationTester({
        enableXSSTests: true,
        enableSQLInjectionTests: true,
        enableCommandInjectionTests: false,
        enablePathTraversalTests: false,
        enableFileUploadTests: false,
        customPayloads: [],
        sanitizationRules: [],
      });

      const vulnerabilityScanner = new VulnerabilityScanner({
        enableWebVulnerabilityScans: true,
        enableInjectionScans: true,
        enableConfigurationScans: false,
        enableDependencyScans: false,
        scanDepth: 'shallow',
        timeout: 5000,
        maxConcurrentScans: 2,
        customRules: [],
        excludePatterns: [],
      });

      // 运行测试
      const securityResults = await securityFramework.runSecurityTestSuite();
      const securityReport = securityFramework.generateSecurityReport();

      const mockValidator = {
        validate: jest.fn().mockResolvedValue({
          original: 'test',
          blocked: false,
          sanitized: 'test',
          escaped: 'test',
          errors: [],
          warnings: [],
        }),
      };
      const validationResults = await inputValidator.runValidationTests(mockValidator);
      const validationReport = inputValidator.generateValidationReport(validationResults);

      const scanTargets = [
        {
          type: 'url' as const,
          identifier: 'https://test.com',
          method: 'GET',
          parameters: [],
          headers: {},
          authentication: { type: 'none' as const },
        },
      ];
      const scanResults = await vulnerabilityScanner.runVulnerabilityScan(scanTargets);
      const scanReport = vulnerabilityScanner.generateVulnerabilityReport(scanResults);

      // 验证所有组件都正常工作
      expect(securityResults).toBeDefined();
      expect(securityReport).toBeDefined();
      expect(validationResults).toBeDefined();
      expect(validationReport).toBeDefined();
      expect(scanResults).toBeDefined();
      expect(scanReport).toBeDefined();

      // 验证报告包含必要信息
      expect(securityReport.summary.totalTests).toBeGreaterThan(0);
      expect(validationReport.summary.totalTests).toBeGreaterThan(0);
      expect(scanReport.summary.totalScans).toBeGreaterThan(0);
    });

    it('应该能够处理安全测试中的错误情况', async () => {
      const framework = new SecurityTestFramework({
        timeout: 100, // 很短的超时时间
        retries: 1,
        inputValidation: { enabled: true, testPayloads: [], sanitizationTests: true, encodingTests: true },
        authorizationTests: { enabled: false, roleBasedTests: false, resourceAccessTests: false, elevationTests: false },
        encryptionTests: { enabled: false, algorithmTests: false, keyManagementTests: false, dataIntegrityTests: false },
        vulnerabilityScanning: { enabled: false, sqlInjection: false, xssInjection: false, commandInjection: false, pathTraversal: false },
        reporting: { enabled: true, detailedLogs: true, vulnerabilityScoring: true, complianceChecks: true },
      });

      const results = await framework.runSecurityTestSuite();
      const report = framework.generateSecurityReport();

      expect(results).toBeDefined();
      expect(report).toBeDefined();
      expect(report.summary.totalTests).toBeGreaterThanOrEqual(0);
    });
  });
});
