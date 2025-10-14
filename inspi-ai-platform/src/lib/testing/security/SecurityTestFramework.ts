/**
 * Security Test Framework
 *
 * 综合安全测试框架，包括输入验证测试、权限控制测试、
 * 数据加密验证和安全漏洞自动扫描
 */
import { EventEmitter } from 'events';

export interface SecurityTestConfig {
  timeout: number;
  retries: number;
  inputValidation: {
    enabled: boolean;
    testPayloads: SecurityPayload[];
    sanitizationTests: boolean;
    encodingTests: boolean;
  };
  authorizationTests: {
    enabled: boolean;
    roleBasedTests: boolean;
    resourceAccessTests: boolean;
    elevationTests: boolean;
  };
  encryptionTests: {
    enabled: boolean;
    algorithmTests: boolean;
    keyManagementTests: boolean;
    dataIntegrityTests: boolean;
  };
  vulnerabilityScanning: {
    enabled: boolean;
    sqlInjection: boolean;
    xssInjection: boolean;
    commandInjection: boolean;
    pathTraversal: boolean;
  };
  reporting: {
    enabled: boolean;
    detailedLogs: boolean;
    vulnerabilityScoring: boolean;
    complianceChecks: boolean;
  };
}

export interface SecurityPayload {
  name: string;
  type: 'xss' | 'sql' | 'command' | 'path_traversal' | 'xxe' | 'csrf' | 'custom';
  payload: string;
  description: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  expectedBehavior: 'block' | 'sanitize' | 'escape' | 'reject';
}

export interface SecurityTestResult {
  testName: string;
  type: 'input_validation' | 'authorization' | 'encryption' | 'vulnerability_scan';
  status: 'passed' | 'failed' | 'vulnerable' | 'error';
  duration: number;
  payload?: SecurityPayload;
  vulnerability?: SecurityVulnerability;
  details: SecurityTestDetails;
  timestamp: Date;
}

export interface SecurityVulnerability {
  type: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  impact: string;
  recommendation: string;
  cwe?: string;
  cvss?: number;
}

export interface SecurityTestDetails {
  input: any;
  output: any;
  expected: any;
  actual: any;
  blocked: boolean;
  sanitized: boolean;
  encrypted: boolean;
}

export interface AuthorizationTestCase {
  name: string;
  user: UserContext;
  resource: ResourceContext;
  action: string;
  expectedResult: 'allow' | 'deny';
  reason?: string;
}

export interface UserContext {
  id: string;
  roles: string[];
  permissions: string[];
  attributes?: Record<string, any>;
}

export interface ResourceContext {
  id: string;
  type: string;
  owner?: string;
  visibility: 'public' | 'private' | 'restricted';
  attributes?: Record<string, any>;
}

export interface EncryptionTestCase {
  name: string;
  algorithm: string;
  keySize: number;
  data: string;
  expectedEncrypted: boolean;
  expectedDecrypted: boolean;
}

export class SecurityTestFramework extends EventEmitter {
  private config: SecurityTestConfig;
  private testResults: SecurityTestResult[] = [];
  private vulnerabilities: SecurityVulnerability[] = [];

  constructor(config: SecurityTestConfig) {
    super();
    this.config = config;
  }

  /**
   * 运行完整的安全测试套件
   */
  async runSecurityTestSuite(): Promise<SecurityTestResult[]> {
    const results: SecurityTestResult[] = [];

    this.emit('securityTestSuiteStarted');

    try {
      // 1. 输入验证测试
      if (this.config.inputValidation.enabled) {
        const inputValidationResults = await this.runInputValidationTests();
        results.push(...inputValidationResults);
      }

      // 2. 认证授权测试
      if (this.config.authorizationTests.enabled) {
        const authorizationResults = await this.runAuthorizationTests();
        results.push(...authorizationResults);
      }

      // 3. 数据加密测试
      if (this.config.encryptionTests.enabled) {
        const encryptionResults = await this.runEncryptionTests();
        results.push(...encryptionResults);
      }

      // 4. 漏洞扫描测试
      if (this.config.vulnerabilityScanning.enabled) {
        const vulnerabilityResults = await this.runVulnerabilityScanning();
        results.push(...vulnerabilityResults);
      }

      this.testResults = results;
      this.emit('securityTestSuiteCompleted', { results, vulnerabilities: this.vulnerabilities });

      return results;
    } catch (error) {
      this.emit('securityTestSuiteError', error);
      throw error;
    }
  }

  /**
   * 运行输入验证安全测试
   */
  async runInputValidationTests(): Promise<SecurityTestResult[]> {
    const results: SecurityTestResult[] = [];
    const payloads = this.config.inputValidation.testPayloads;

    this.emit('inputValidationTestsStarted');

    for (const payload of payloads) {
      const startTime = Date.now();

      try {
        const testResult = await this.executeInputValidationTest(payload);
        testResult.duration = Date.now() - startTime;
        results.push(testResult);

        if (testResult.status === 'vulnerable') {
          this.vulnerabilities.push(testResult.vulnerability!);
        }
      } catch (error) {
        results.push({
          testName: `Input Validation - ${payload.name}`,
          type: 'input_validation',
          status: 'error',
          duration: Date.now() - startTime,
          payload,
          details: {
            input: payload.payload,
            output: null,
            expected: 'blocked or sanitized',
            actual: error,
            blocked: false,
            sanitized: false,
            encrypted: false,
          },
          timestamp: new Date(),
        });
      }
    }

    this.emit('inputValidationTestsCompleted', results);
    return results;
  }

  /**
   * 执行单个输入验证测试
   */
  private async executeInputValidationTest(payload: SecurityPayload): Promise<SecurityTestResult> {
    // 模拟输入验证测试
    const isBlocked = this.shouldBlockPayload(payload);
    const sanitizedOutput = this.sanitizeInput(payload.payload);
    const isSanitized = sanitizedOutput !== payload.payload;

    const testPassed = payload.expectedBehavior === 'block' ? isBlocked :
                      payload.expectedBehavior === 'sanitize' ? isSanitized : true;

    const result: SecurityTestResult = {
      testName: `Input Validation - ${payload.name}`,
      type: 'input_validation',
      status: testPassed ? 'passed' : 'vulnerable',
      duration: 0,
      payload,
      details: {
        input: payload.payload,
        output: sanitizedOutput,
        expected: payload.expectedBehavior,
        actual: isBlocked ? 'blocked' : isSanitized ? 'sanitized' : 'passed',
        blocked: isBlocked,
        sanitized: isSanitized,
        encrypted: false,
      },
      timestamp: new Date(),
    };

    if (!testPassed) {
      result.vulnerability = {
        type: payload.type,
        severity: payload.severity,
        description: `Input validation failed for ${payload.type} payload`,
        impact: this.getImpactForPayloadType(payload.type),
        recommendation: this.getRecommendationForPayloadType(payload.type),
        cwe: this.getCWEForPayloadType(payload.type),
      };
    }

    return result;
  }

  /**
   * 运行认证授权测试
   */
  async runAuthorizationTests(): Promise<SecurityTestResult[]> {
    const results: SecurityTestResult[] = [];
    const testCases = this.generateAuthorizationTestCases();

    this.emit('authorizationTestsStarted');

    for (const testCase of testCases) {
      const startTime = Date.now();

      try {
        const testResult = await this.executeAuthorizationTest(testCase);
        testResult.duration = Date.now() - startTime;
        results.push(testResult);
      } catch (error) {
        results.push({
          testName: `Authorization - ${testCase.name}`,
          type: 'authorization',
          status: 'error',
          duration: Date.now() - startTime,
          details: {
            input: testCase,
            output: null,
            expected: testCase.expectedResult,
            actual: error,
            blocked: false,
            sanitized: false,
            encrypted: false,
          },
          timestamp: new Date(),
        });
      }
    }

    this.emit('authorizationTestsCompleted', results);
    return results;
  }

  /**
   * 执行单个认证授权测试
   */
  private async executeAuthorizationTest(testCase: AuthorizationTestCase): Promise<SecurityTestResult> {
    const hasAccess = this.evaluatePermission(testCase.user, testCase.resource, testCase.action);
    const expectedAccess = testCase.expectedResult === 'allow';
    const testPassed = hasAccess === expectedAccess;

    const result: SecurityTestResult = {
      testName: `Authorization - ${testCase.name}`,
      type: 'authorization',
      status: testPassed ? 'passed' : 'failed',
      duration: 0,
      details: {
        input: testCase,
        output: { access: hasAccess },
        expected: expectedAccess,
        actual: hasAccess,
        blocked: !hasAccess,
        sanitized: false,
        encrypted: false,
      },
      timestamp: new Date(),
    };

    if (!testPassed) {
      result.vulnerability = {
        type: 'authorization',
        severity: 'high',
        description: `Authorization check failed for ${testCase.action} on ${testCase.resource.type}`,
        impact: 'Unauthorized access to protected resources',
        recommendation: 'Review and fix authorization logic',
        cwe: 'CWE-285',
      };
    }

    return result;
  }

  /**
   * 运行数据加密测试
   */
  async runEncryptionTests(): Promise<SecurityTestResult[]> {
    const results: SecurityTestResult[] = [];
    const testCases = this.generateEncryptionTestCases();

    this.emit('encryptionTestsStarted');

    for (const testCase of testCases) {
      const startTime = Date.now();

      try {
        const testResult = await this.executeEncryptionTest(testCase);
        testResult.duration = Date.now() - startTime;
        results.push(testResult);
      } catch (error) {
        results.push({
          testName: `Encryption - ${testCase.name}`,
          type: 'encryption',
          status: 'error',
          duration: Date.now() - startTime,
          details: {
            input: testCase.data,
            output: null,
            expected: 'encrypted data',
            actual: error,
            blocked: false,
            sanitized: false,
            encrypted: false,
          },
          timestamp: new Date(),
        });
      }
    }

    this.emit('encryptionTestsCompleted', results);
    return results;
  }

  /**
   * 执行单个加密测试
   */
  private async executeEncryptionTest(testCase: EncryptionTestCase): Promise<SecurityTestResult> {
    // 模拟加密测试
    const encryptedData = this.mockEncrypt(testCase.data, testCase.algorithm);
    const decryptedData = this.mockDecrypt(encryptedData, testCase.algorithm);

    const encryptionWorked = encryptedData !== testCase.data;
    const decryptionWorked = decryptedData === testCase.data;

    const testPassed = encryptionWorked === testCase.expectedEncrypted &&
                      decryptionWorked === testCase.expectedDecrypted;

    const result: SecurityTestResult = {
      testName: `Encryption - ${testCase.name}`,
      type: 'encryption',
      status: testPassed ? 'passed' : 'failed',
      duration: 0,
      details: {
        input: testCase.data,
        output: { encrypted: encryptedData, decrypted: decryptedData },
        expected: { encrypted: testCase.expectedEncrypted, decrypted: testCase.expectedDecrypted },
        actual: { encrypted: encryptionWorked, decrypted: decryptionWorked },
        blocked: false,
        sanitized: false,
        encrypted: encryptionWorked,
      },
      timestamp: new Date(),
    };

    if (!testPassed) {
      result.vulnerability = {
        type: 'encryption',
        severity: 'critical',
        description: `Encryption test failed for algorithm ${testCase.algorithm}`,
        impact: 'Data may not be properly encrypted',
        recommendation: 'Review encryption implementation',
        cwe: 'CWE-327',
      };
    }

    return result;
  }

  /**
   * 运行漏洞扫描测试
   */
  async runVulnerabilityScanning(): Promise<SecurityTestResult[]> {
    const results: SecurityTestResult[] = [];

    this.emit('vulnerabilityScanningStarted');

    // SQL注入扫描
    if (this.config.vulnerabilityScanning.sqlInjection) {
      const sqlResults = await this.scanSQLInjection();
      results.push(...sqlResults);
    }

    // XSS扫描
    if (this.config.vulnerabilityScanning.xssInjection) {
      const xssResults = await this.scanXSSInjection();
      results.push(...xssResults);
    }

    // 命令注入扫描
    if (this.config.vulnerabilityScanning.commandInjection) {
      const cmdResults = await this.scanCommandInjection();
      results.push(...cmdResults);
    }

    // 路径遍历扫描
    if (this.config.vulnerabilityScanning.pathTraversal) {
      const pathResults = await this.scanPathTraversal();
      results.push(...pathResults);
    }

    this.emit('vulnerabilityScanningCompleted', results);
    return results;
  }

  /**
   * SQL注入扫描
   */
  private async scanSQLInjection(): Promise<SecurityTestResult[]> {
    const sqlPayloads = [
      "' OR '1'='1",
      "'; DROP TABLE users; --",
      "' UNION SELECT * FROM users --",
      "1' AND (SELECT COUNT(*) FROM users) > 0 --",
    ];

    const results: SecurityTestResult[] = [];

    for (const payload of sqlPayloads) {
      const startTime = Date.now();
      const isBlocked = this.mockSQLInjectionDefense(payload);

      results.push({
        testName: `SQL Injection Scan - ${payload.substring(0, 20)}...`,
        type: 'vulnerability_scan',
        status: isBlocked ? 'passed' : 'vulnerable',
        duration: Date.now() - startTime,
        payload: {
          name: 'SQL Injection',
          type: 'sql',
          payload,
          description: 'SQL injection attempt',
          severity: 'critical',
          expectedBehavior: 'block',
        },
        details: {
          input: payload,
          output: isBlocked ? 'blocked' : 'executed',
          expected: 'blocked',
          actual: isBlocked ? 'blocked' : 'executed',
          blocked: isBlocked,
          sanitized: false,
          encrypted: false,
        },
        timestamp: new Date(),
        vulnerability: !isBlocked ? {
          type: 'sql_injection',
          severity: 'critical',
          description: 'SQL injection vulnerability detected',
          impact: 'Database compromise, data theft',
          recommendation: 'Use parameterized queries',
          cwe: 'CWE-89',
        } : undefined,
      });
    }

    return results;
  }

  /**
   * XSS扫描
   */
  private async scanXSSInjection(): Promise<SecurityTestResult[]> {
    const xssPayloads = [
      "<script>alert('XSS')</script>",
      "data:text/html,<script>alert('XSS')</script>",
      "<img src=x onerror=alert('XSS')>",
      "<svg onload=alert('XSS')>",
    ];

    const results: SecurityTestResult[] = [];

    for (const payload of xssPayloads) {
      const startTime = Date.now();
      const isBlocked = this.mockXSSDefense(payload);

      results.push({
        testName: `XSS Scan - ${payload.substring(0, 20)}...`,
        type: 'vulnerability_scan',
        status: isBlocked ? 'passed' : 'vulnerable',
        duration: Date.now() - startTime,
        payload: {
          name: 'XSS Attack',
          type: 'xss',
          payload,
          description: 'Cross-site scripting attempt',
          severity: 'high',
          expectedBehavior: 'block',
        },
        details: {
          input: payload,
          output: isBlocked ? 'blocked' : 'executed',
          expected: 'blocked',
          actual: isBlocked ? 'blocked' : 'executed',
          blocked: isBlocked,
          sanitized: false,
          encrypted: false,
        },
        timestamp: new Date(),
        vulnerability: !isBlocked ? {
          type: 'xss',
          severity: 'high',
          description: 'XSS vulnerability detected',
          impact: 'Session hijacking, data theft',
          recommendation: 'Sanitize user input',
          cwe: 'CWE-79',
        } : undefined,
      });
    }

    return results;
  }

  /**
   * 命令注入扫描
   */
  private async scanCommandInjection(): Promise<SecurityTestResult[]> {
    const cmdPayloads = [
      '; rm -rf /',
      '| cat /etc/passwd',
      '&& whoami',
      '`id`',
    ];

    const results: SecurityTestResult[] = [];

    for (const payload of cmdPayloads) {
      const startTime = Date.now();
      const isBlocked = this.mockCommandInjectionDefense(payload);

      results.push({
        testName: `Command Injection Scan - ${payload}`,
        type: 'vulnerability_scan',
        status: isBlocked ? 'passed' : 'vulnerable',
        duration: Date.now() - startTime,
        payload: {
          name: 'Command Injection',
          type: 'command',
          payload,
          description: 'Command injection attempt',
          severity: 'critical',
          expectedBehavior: 'block',
        },
        details: {
          input: payload,
          output: isBlocked ? 'blocked' : 'executed',
          expected: 'blocked',
          actual: isBlocked ? 'blocked' : 'executed',
          blocked: isBlocked,
          sanitized: false,
          encrypted: false,
        },
        timestamp: new Date(),
        vulnerability: !isBlocked ? {
          type: 'command_injection',
          severity: 'critical',
          description: 'Command injection vulnerability detected',
          impact: 'System compromise',
          recommendation: 'Validate and sanitize input',
          cwe: 'CWE-78',
        } : undefined,
      });
    }

    return results;
  }

  /**
   * 路径遍历扫描
   */
  private async scanPathTraversal(): Promise<SecurityTestResult[]> {
    const pathPayloads = [
      '../../../etc/passwd',
      '..\\..\\..\\windows\\system32\\config\\sam',
      '....//....//....//etc/passwd',
      '%2e%2e%2f%2e%2e%2f%2e%2e%2fetc%2fpasswd',
    ];

    const results: SecurityTestResult[] = [];

    for (const payload of pathPayloads) {
      const startTime = Date.now();
      const isBlocked = this.mockPathTraversalDefense(payload);

      results.push({
        testName: `Path Traversal Scan - ${payload}`,
        type: 'vulnerability_scan',
        status: isBlocked ? 'passed' : 'vulnerable',
        duration: Date.now() - startTime,
        payload: {
          name: 'Path Traversal',
          type: 'path_traversal',
          payload,
          description: 'Path traversal attempt',
          severity: 'high',
          expectedBehavior: 'block',
        },
        details: {
          input: payload,
          output: isBlocked ? 'blocked' : 'executed',
          expected: 'blocked',
          actual: isBlocked ? 'blocked' : 'executed',
          blocked: isBlocked,
          sanitized: false,
          encrypted: false,
        },
        timestamp: new Date(),
        vulnerability: !isBlocked ? {
          type: 'path_traversal',
          severity: 'high',
          description: 'Path traversal vulnerability detected',
          impact: 'File system access',
          recommendation: 'Validate file paths',
          cwe: 'CWE-22',
        } : undefined,
      });
    }

    return results;
  }

  /**
   * 生成安全测试报告
   */
  generateSecurityReport(): SecurityReport {
    const totalTests = this.testResults.length;
    const passedTests = this.testResults.filter(r => r.status === 'passed').length;
    const failedTests = this.testResults.filter(r => r.status === 'failed').length;
    const vulnerableTests = this.testResults.filter(r => r.status === 'vulnerable').length;
    const errorTests = this.testResults.filter(r => r.status === 'error').length;

    const criticalVulns = this.vulnerabilities.filter(v => v.severity === 'critical').length;
    const highVulns = this.vulnerabilities.filter(v => v.severity === 'high').length;
    const mediumVulns = this.vulnerabilities.filter(v => v.severity === 'medium').length;
    const lowVulns = this.vulnerabilities.filter(v => v.severity === 'low').length;

    return {
      summary: {
        totalTests,
        passedTests,
        failedTests,
        vulnerableTests,
        errorTests,
        passRate: (passedTests / totalTests) * 100,
        vulnerabilityRate: (vulnerableTests / totalTests) * 100,
      },
      vulnerabilities: {
        total: this.vulnerabilities.length,
        critical: criticalVulns,
        high: highVulns,
        medium: mediumVulns,
        low: lowVulns,
      },
      testResults: this.testResults,
      vulnerabilityDetails: this.vulnerabilities,
      recommendations: this.generateRecommendations(),
      timestamp: new Date(),
    };
  }

  // 辅助方法
  private shouldBlockPayload(payload: SecurityPayload): boolean {
    const maliciousPatterns = [
      /<script/i,
      /javascript:/i,
      /on\w+\s*=/i,
      /union\s+select/i,
      /drop\s+table/i,
      /\.\.\//,
      /etc\/passwd/,
      /cmd\.exe/i,
    ];
    return maliciousPatterns.some(pattern => pattern.test(payload.payload));
  }

  private sanitizeInput(input: string): string {
    return input
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#x27;')
      .replace(/\//g, '&#x2F;');
  }

  private evaluatePermission(user: UserContext, resource: ResourceContext, action: string): boolean {
    // 模拟权限评估逻辑
    if (user.roles.includes('admin')) return true;
    if (resource.visibility === 'public') return true;
    if (resource.owner === (user.id || (user as any)._id)) return true;
    if (user.roles.includes('user') && action === 'read' && resource.visibility === 'restricted') return true;
    return false;
  }

  private generateAuthorizationTestCases(): AuthorizationTestCase[] {
    return [
      {
        name: 'Admin access to private resource',
        user: { id: 'admin1', roles: ['admin'], permissions: ['read', 'write'] },
        resource: { id: 'res1', type: 'document', visibility: 'private', owner: 'user1' },
        action: 'read',
        expectedResult: 'allow',
      },
      {
        name: 'User access to own resource',
        user: { id: 'user1', roles: ['user'], permissions: ['read'] },
        resource: { id: 'res1', type: 'document', visibility: 'private', owner: 'user1' },
        action: 'read',
        expectedResult: 'allow',
      },
      {
        name: 'User access to others private resource',
        user: { id: 'user1', roles: ['user'], permissions: ['read'] },
        resource: { id: 'res2', type: 'document', visibility: 'private', owner: 'user2' },
        action: 'read',
        expectedResult: 'deny',
      },
    ];
  }

  private generateEncryptionTestCases(): EncryptionTestCase[] {
    return [
      {
        name: 'AES-256 encryption',
        algorithm: 'AES-256',
        keySize: 256,
        data: 'sensitive data',
        expectedEncrypted: true,
        expectedDecrypted: true,
      },
      {
        name: 'RSA encryption',
        algorithm: 'RSA',
        keySize: 2048,
        data: 'public key data',
        expectedEncrypted: true,
        expectedDecrypted: true,
      },
    ];
  }

  private mockEncrypt(data: string, algorithm: string): string {
    // 模拟加密
    return Buffer.from(data).toString('base64') + '_encrypted_' + algorithm;
  }

  private mockDecrypt(encryptedData: string, algorithm: string): string {
    // 模拟解密
    const base64Data = encryptedData.replace('_encrypted_' + algorithm, '');
    return Buffer.from(base64Data, 'base64').toString();
  }

  private mockSQLInjectionDefense(payload: string): boolean {
    const sqlPatterns = [/union\s+select/i, /drop\s+table/i, /insert\s+into/i, /delete\s+from/i];
    return sqlPatterns.some(pattern => pattern.test(payload));
  }

  private mockXSSDefense(payload: string): boolean {
    const xssPatterns = [/<script/i, /javascript:/i, /on\w+\s*=/i, /eval\(/i];
    return xssPatterns.some(pattern => pattern.test(payload));
  }

  private mockCommandInjectionDefense(payload: string): boolean {
    const cmdPatterns = [/;\s*rm\s+/i, /&&\s*cat\s+/i, /\|\s*nc\s+/i, /`.*`/];
    return cmdPatterns.some(pattern => pattern.test(payload));
  }

  private mockPathTraversalDefense(payload: string): boolean {
    const pathPatterns = [/\.\.\//g, /\.\.\\/g, /%2e%2e%2f/gi, /etc\/passwd/i];
    return pathPatterns.some(pattern => pattern.test(payload));
  }

  private getImpactForPayloadType(type: string): string {
    const impacts = {
      xss: 'Cross-site scripting attacks, session hijacking, data theft',
      sql: 'Database compromise, data extraction, data manipulation',
      command: 'System compromise, arbitrary code execution',
      path_traversal: 'File system access, sensitive file disclosure',
      xxe: 'XML external entity attacks, file disclosure',
      csrf: 'Cross-site request forgery, unauthorized actions',
    };
    return impacts[type as keyof typeof impacts] || 'Unknown security impact';
  }

  private getRecommendationForPayloadType(type: string): string {
    const recommendations = {
      xss: 'Implement proper input sanitization and output encoding',
      sql: 'Use parameterized queries and input validation',
      command: 'Validate and sanitize all user inputs, avoid system calls',
      path_traversal: 'Validate file paths and use whitelisting',
      xxe: 'Disable external entity processing in XML parsers',
      csrf: 'Implement CSRF tokens and same-site cookies',
    };
    return recommendations[type as keyof typeof recommendations] || 'Review security implementation';
  }

  private getCWEForPayloadType(type: string): string {
    const cwes = {
      xss: 'CWE-79',
      sql: 'CWE-89',
      command: 'CWE-78',
      path_traversal: 'CWE-22',
      xxe: 'CWE-611',
      csrf: 'CWE-352',
    };
    return cwes[type as keyof typeof cwes] || 'CWE-Unknown';
  }

  private generateRecommendations(): string[] {
    const recommendations: string[] = [];

    if (this.vulnerabilities.some(v => v.type === 'xss')) {
      recommendations.push('Implement comprehensive XSS protection');
    }

    if (this.vulnerabilities.some(v => v.type === 'sql_injection')) {
      recommendations.push('Use parameterized queries for all database operations');
    }

    if (this.vulnerabilities.some(v => v.type === 'command_injection')) {
      recommendations.push('Avoid system calls with user input');
    }

    if (this.vulnerabilities.some(v => v.type === 'path_traversal')) {
      recommendations.push('Implement strict file path validation');
    }

    if (recommendations.length === 0) {
      recommendations.push('Continue monitoring for new security threats');
    }

    return recommendations;
  }
}

export interface SecurityReport {
  summary: {
    totalTests: number;
    passedTests: number;
    failedTests: number;
    vulnerableTests: number;
    errorTests: number;
    passRate: number;
    vulnerabilityRate: number;
  };
  vulnerabilities: {
    total: number;
    critical: number;
    high: number;
    medium: number;
    low: number;
  };
  testResults: SecurityTestResult[];
  vulnerabilityDetails: SecurityVulnerability[];
  recommendations: string[];
  timestamp: Date;
}
