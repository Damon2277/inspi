/**
 * Input Validation Security Tester
 * 
 * 专门用于测试输入验证安全性的测试器
 * 包括XSS、SQL注入、命令注入等各种恶意输入的测试
 */

export interface InputValidationConfig {
  enableXSSTests: boolean;
  enableSQLInjectionTests: boolean;
  enableCommandInjectionTests: boolean;
  enablePathTraversalTests: boolean;
  enableFileUploadTests: boolean;
  customPayloads: ValidationPayload[];
  sanitizationRules: SanitizationRule[];
}

export interface ValidationPayload {
  name: string;
  type: 'xss' | 'sql' | 'command' | 'path' | 'file' | 'custom';
  payload: string;
  expectedResult: 'blocked' | 'sanitized' | 'escaped' | 'allowed';
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
}

export interface SanitizationRule {
  name: string;
  pattern: RegExp;
  replacement: string;
  description: string;
}

export interface ValidationTestResult {
  payload: ValidationPayload;
  actualResult: 'blocked' | 'sanitized' | 'escaped' | 'allowed' | 'error';
  passed: boolean;
  sanitizedOutput?: string;
  errorMessage?: string;
  executionTime: number;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
}

export class InputValidationTester {
  private config: InputValidationConfig;
  private defaultPayloads: ValidationPayload[];

  constructor(config: InputValidationConfig) {
    this.config = config;
    this.defaultPayloads = this.generateDefaultPayloads();
  }

  /**
   * 运行完整的输入验证测试套件
   */
  async runValidationTests(inputValidator: InputValidator): Promise<ValidationTestResult[]> {
    const results: ValidationTestResult[] = [];
    const allPayloads = [...this.defaultPayloads, ...this.config.customPayloads];

    for (const payload of allPayloads) {
      if (this.shouldRunPayload(payload)) {
        const result = await this.testPayload(payload, inputValidator);
        results.push(result);
      }
    }

    return results;
  }

  /**
   * 测试单个payload
   */
  private async testPayload(payload: ValidationPayload, validator: InputValidator): Promise<ValidationTestResult> {
    const startTime = Date.now();
    
    try {
      const validationResult = await validator.validate(payload.payload);
      const executionTime = Date.now() - startTime;

      const actualResult = this.determineActualResult(validationResult);
      const passed = actualResult === payload.expectedResult;
      const riskLevel = passed ? 'low' : payload.severity;

      return {
        payload,
        actualResult,
        passed,
        sanitizedOutput: validationResult.sanitized,
        executionTime,
        riskLevel
      };
    } catch (error) {
      return {
        payload,
        actualResult: 'error',
        passed: false,
        errorMessage: error instanceof Error ? error.message : String(error),
        executionTime: Date.now() - startTime,
        riskLevel: 'high'
      };
    }
  }

  /**
   * 生成默认的测试payload
   */
  private generateDefaultPayloads(): ValidationPayload[] {
    const payloads: ValidationPayload[] = [];

    // XSS Payloads
    if (this.config.enableXSSTests) {
      payloads.push(
        {
          name: 'Basic Script Tag',
          type: 'xss',
          payload: '<script>alert("XSS")</script>',
          expectedResult: 'blocked',
          severity: 'high',
          description: 'Basic XSS attempt using script tag'
        },
        {
          name: 'JavaScript URL',
          type: 'xss',
          payload: 'javascript:alert("XSS")',
          expectedResult: 'blocked',
          severity: 'high',
          description: 'XSS attempt using javascript: URL'
        },
        {
          name: 'Event Handler',
          type: 'xss',
          payload: '<img src="x" onerror="alert(\'XSS\')">',
          expectedResult: 'blocked',
          severity: 'high',
          description: 'XSS attempt using event handler'
        },
        {
          name: 'SVG XSS',
          type: 'xss',
          payload: '<svg onload="alert(\'XSS\')">',
          expectedResult: 'blocked',
          severity: 'high',
          description: 'XSS attempt using SVG element'
        },
        {
          name: 'Encoded XSS',
          type: 'xss',
          payload: '%3Cscript%3Ealert%28%22XSS%22%29%3C%2Fscript%3E',
          expectedResult: 'blocked',
          severity: 'medium',
          description: 'URL-encoded XSS attempt'
        }
      );
    }

    // SQL Injection Payloads
    if (this.config.enableSQLInjectionTests) {
      payloads.push(
        {
          name: 'Basic SQL Injection',
          type: 'sql',
          payload: "' OR '1'='1",
          expectedResult: 'blocked',
          severity: 'critical',
          description: 'Basic SQL injection attempt'
        },
        {
          name: 'Union Select',
          type: 'sql',
          payload: "' UNION SELECT * FROM users --",
          expectedResult: 'blocked',
          severity: 'critical',
          description: 'SQL injection using UNION SELECT'
        },
        {
          name: 'Drop Table',
          type: 'sql',
          payload: "'; DROP TABLE users; --",
          expectedResult: 'blocked',
          severity: 'critical',
          description: 'Destructive SQL injection attempt'
        },
        {
          name: 'Boolean Blind SQL',
          type: 'sql',
          payload: "1' AND (SELECT COUNT(*) FROM users) > 0 --",
          expectedResult: 'blocked',
          severity: 'high',
          description: 'Boolean-based blind SQL injection'
        },
        {
          name: 'Time-based SQL',
          type: 'sql',
          payload: "1'; WAITFOR DELAY '00:00:05' --",
          expectedResult: 'blocked',
          severity: 'high',
          description: 'Time-based SQL injection'
        }
      );
    }

    // Command Injection Payloads
    if (this.config.enableCommandInjectionTests) {
      payloads.push(
        {
          name: 'Basic Command Injection',
          type: 'command',
          payload: '; rm -rf /',
          expectedResult: 'blocked',
          severity: 'critical',
          description: 'Destructive command injection'
        },
        {
          name: 'Pipe Command',
          type: 'command',
          payload: '| cat /etc/passwd',
          expectedResult: 'blocked',
          severity: 'high',
          description: 'Command injection using pipe'
        },
        {
          name: 'And Command',
          type: 'command',
          payload: '&& whoami',
          expectedResult: 'blocked',
          severity: 'medium',
          description: 'Command injection using AND operator'
        },
        {
          name: 'Backtick Command',
          type: 'command',
          payload: '`id`',
          expectedResult: 'blocked',
          severity: 'high',
          description: 'Command injection using backticks'
        },
        {
          name: 'Subshell Command',
          type: 'command',
          payload: '$(whoami)',
          expectedResult: 'blocked',
          severity: 'high',
          description: 'Command injection using subshell'
        }
      );
    }

    // Path Traversal Payloads
    if (this.config.enablePathTraversalTests) {
      payloads.push(
        {
          name: 'Basic Path Traversal',
          type: 'path',
          payload: '../../../etc/passwd',
          expectedResult: 'blocked',
          severity: 'high',
          description: 'Basic path traversal attempt'
        },
        {
          name: 'Windows Path Traversal',
          type: 'path',
          payload: '..\\..\\..\\windows\\system32\\config\\sam',
          expectedResult: 'blocked',
          severity: 'high',
          description: 'Windows path traversal attempt'
        },
        {
          name: 'Double Encoded Path',
          type: 'path',
          payload: '....//....//....//etc/passwd',
          expectedResult: 'blocked',
          severity: 'medium',
          description: 'Double-encoded path traversal'
        },
        {
          name: 'URL Encoded Path',
          type: 'path',
          payload: '%2e%2e%2f%2e%2e%2f%2e%2e%2fetc%2fpasswd',
          expectedResult: 'blocked',
          severity: 'medium',
          description: 'URL-encoded path traversal'
        },
        {
          name: 'Null Byte Path',
          type: 'path',
          payload: '../../../etc/passwd%00.jpg',
          expectedResult: 'blocked',
          severity: 'high',
          description: 'Path traversal with null byte'
        }
      );
    }

    // File Upload Payloads
    if (this.config.enableFileUploadTests) {
      payloads.push(
        {
          name: 'PHP Shell Upload',
          type: 'file',
          payload: '<?php system($_GET["cmd"]); ?>',
          expectedResult: 'blocked',
          severity: 'critical',
          description: 'PHP shell upload attempt'
        },
        {
          name: 'JSP Shell Upload',
          type: 'file',
          payload: '<%@ page import="java.io.*" %><% Runtime.getRuntime().exec(request.getParameter("cmd")); %>',
          expectedResult: 'blocked',
          severity: 'critical',
          description: 'JSP shell upload attempt'
        },
        {
          name: 'ASP Shell Upload',
          type: 'file',
          payload: '<%eval request("cmd")%>',
          expectedResult: 'blocked',
          severity: 'critical',
          description: 'ASP shell upload attempt'
        },
        {
          name: 'Executable Extension',
          type: 'file',
          payload: 'malicious.exe',
          expectedResult: 'blocked',
          severity: 'high',
          description: 'Executable file upload attempt'
        }
      );
    }

    return payloads;
  }

  /**
   * 判断是否应该运行特定的payload
   */
  private shouldRunPayload(payload: ValidationPayload): boolean {
    switch (payload.type) {
      case 'xss':
        return this.config.enableXSSTests;
      case 'sql':
        return this.config.enableSQLInjectionTests;
      case 'command':
        return this.config.enableCommandInjectionTests;
      case 'path':
        return this.config.enablePathTraversalTests;
      case 'file':
        return this.config.enableFileUploadTests;
      case 'custom':
        return true;
      default:
        return false;
    }
  }

  /**
   * 确定实际的验证结果
   */
  private determineActualResult(validationResult: ValidationResult): 'blocked' | 'sanitized' | 'escaped' | 'allowed' {
    if (validationResult.blocked) {
      return 'blocked';
    } else if (validationResult.sanitized && validationResult.sanitized !== validationResult.original) {
      return 'sanitized';
    } else if (validationResult.escaped && validationResult.escaped !== validationResult.original) {
      return 'escaped';
    } else {
      return 'allowed';
    }
  }

  /**
   * 应用自定义清理规则
   */
  applySanitizationRules(input: string): string {
    let sanitized = input;
    
    for (const rule of this.config.sanitizationRules) {
      sanitized = sanitized.replace(rule.pattern, rule.replacement);
    }
    
    return sanitized;
  }

  /**
   * 生成验证测试报告
   */
  generateValidationReport(results: ValidationTestResult[]): ValidationReport {
    const totalTests = results.length;
    const passedTests = results.filter(r => r.passed).length;
    const failedTests = results.filter(r => !r.passed).length;
    
    const criticalRisks = results.filter(r => r.riskLevel === 'critical').length;
    const highRisks = results.filter(r => r.riskLevel === 'high').length;
    const mediumRisks = results.filter(r => r.riskLevel === 'medium').length;
    const lowRisks = results.filter(r => r.riskLevel === 'low').length;

    const averageExecutionTime = results.reduce((sum, r) => sum + r.executionTime, 0) / totalTests;

    return {
      summary: {
        totalTests,
        passedTests,
        failedTests,
        passRate: (passedTests / totalTests) * 100,
        averageExecutionTime
      },
      riskDistribution: {
        critical: criticalRisks,
        high: highRisks,
        medium: mediumRisks,
        low: lowRisks
      },
      testResults: results,
      recommendations: this.generateRecommendations(results),
      timestamp: new Date()
    };
  }

  /**
   * 生成改进建议
   */
  private generateRecommendations(results: ValidationTestResult[]): string[] {
    const recommendations: string[] = [];
    const failedResults = results.filter(r => !r.passed);

    if (failedResults.some(r => r.payload.type === 'xss')) {
      recommendations.push('实施更严格的XSS防护措施，包括输入验证和输出编码');
    }

    if (failedResults.some(r => r.payload.type === 'sql')) {
      recommendations.push('使用参数化查询和预编译语句防止SQL注入');
    }

    if (failedResults.some(r => r.payload.type === 'command')) {
      recommendations.push('避免直接执行用户输入，使用白名单验证');
    }

    if (failedResults.some(r => r.payload.type === 'path')) {
      recommendations.push('实施严格的文件路径验证和访问控制');
    }

    if (failedResults.some(r => r.payload.type === 'file')) {
      recommendations.push('加强文件上传验证，包括文件类型和内容检查');
    }

    if (recommendations.length === 0) {
      recommendations.push('输入验证安全性良好，继续保持当前的安全措施');
    }

    return recommendations;
  }
}

// 输入验证器接口
export interface InputValidator {
  validate(input: string): Promise<ValidationResult>;
}

export interface ValidationResult {
  original: string;
  blocked: boolean;
  sanitized?: string;
  escaped?: string;
  errors: string[];
  warnings: string[];
}

export interface ValidationReport {
  summary: {
    totalTests: number;
    passedTests: number;
    failedTests: number;
    passRate: number;
    averageExecutionTime: number;
  };
  riskDistribution: {
    critical: number;
    high: number;
    medium: number;
    low: number;
  };
  testResults: ValidationTestResult[];
  recommendations: string[];
  timestamp: Date;
}