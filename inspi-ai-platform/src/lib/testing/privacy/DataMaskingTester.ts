/**
 * 数据脱敏测试器
 * 用于测试敏感数据的脱敏处理是否正确
 */

export interface SensitiveDataPattern {
  name: string;
  pattern: RegExp;
  maskingRule: (value: string) => string;
  testCases: Array<{
    input: string;
    expectedMasked: string;
    shouldMatch: boolean;
  }>;
}

export interface MaskingTestResult {
  pattern: string;
  passed: boolean;
  failures: Array<{
    input: string;
    expected: string;
    actual: string;
    reason: string;
  }>;
}

export class DataMaskingTester {
  private patterns: Map<string, SensitiveDataPattern> = new Map();

  constructor() {
    this.initializeDefaultPatterns();
  }

  /**
   * 注册敏感数据模式
   */
  registerPattern(pattern: SensitiveDataPattern): void {
    this.patterns.set(pattern.name, pattern);
  }

  /**
   * 测试数据脱敏功能
   */
  async testDataMasking(data: any): Promise<MaskingTestResult[]> {
    const results: MaskingTestResult[] = [];

    for (const [name, pattern] of this.patterns) {
      const result = await this.testPattern(pattern, data);
      results.push(result);
    }

    return results;
  }

  /**
   * 验证脱敏后的数据不包含原始敏感信息
   */
  validateMaskedData(originalData: any, maskedData: any): boolean {
    const originalStr = JSON.stringify(originalData);
    const maskedStr = JSON.stringify(maskedData);

    // 检查是否还包含敏感信息
    for (const [, pattern] of this.patterns) {
      const matches = originalStr.match(pattern.pattern);
      if (matches) {
        for (const match of matches) {
          if (maskedStr.includes(match)) {
            return false; // 发现未脱敏的敏感数据
          }
        }
      }
    }

    return true;
  }

  /**
   * 测试特定模式
   */
  private async testPattern(pattern: SensitiveDataPattern, data: any): Promise<MaskingTestResult> {
    const result: MaskingTestResult = {
      pattern: pattern.name,
      passed: true,
      failures: []
    };

    // 测试预定义的测试用例
    for (const testCase of pattern.testCases) {
      const actualMasked = pattern.maskingRule(testCase.input);
      const shouldMatch = pattern.pattern.test(testCase.input);

      if (shouldMatch !== testCase.shouldMatch) {
        result.passed = false;
        result.failures.push({
          input: testCase.input,
          expected: testCase.shouldMatch ? 'should match' : 'should not match',
          actual: shouldMatch ? 'matched' : 'did not match',
          reason: 'Pattern matching failed'
        });
      }

      if (actualMasked !== testCase.expectedMasked) {
        result.passed = false;
        result.failures.push({
          input: testCase.input,
          expected: testCase.expectedMasked,
          actual: actualMasked,
          reason: 'Masking result mismatch'
        });
      }
    }

    // 测试实际数据
    const dataStr = JSON.stringify(data);
    const matches = dataStr.match(pattern.pattern);
    if (matches) {
      for (const match of matches) {
        const masked = pattern.maskingRule(match);
        if (masked === match) {
          result.passed = false;
          result.failures.push({
            input: match,
            expected: 'masked value',
            actual: match,
            reason: 'Sensitive data not masked'
          });
        }
      }
    }

    return result;
  }

  /**
   * 初始化默认的敏感数据模式
   */
  private initializeDefaultPatterns(): void {
    // 邮箱地址
    this.registerPattern({
      name: 'email',
      pattern: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g,
      maskingRule: (email: string) => {
        const [local, domain] = email.split('@');
        const maskedLocal = local.length > 2 
          ? local[0] + '*'.repeat(local.length - 2) + local[local.length - 1]
          : '*'.repeat(local.length);
        return `${maskedLocal}@${domain}`;
      },
      testCases: [
        {
          input: 'user@example.com',
          expectedMasked: 'u**r@example.com',
          shouldMatch: true
        },
        {
          input: 'test@test.co',
          expectedMasked: 't**t@test.co',
          shouldMatch: true
        },
        {
          input: 'not-an-email',
          expectedMasked: 'not-an-email',
          shouldMatch: false
        }
      ]
    });

    // 手机号码
    this.registerPattern({
      name: 'phone',
      pattern: /\b\d{3}-?\d{3}-?\d{4}\b/g,
      maskingRule: (phone: string) => {
        const digits = phone.replace(/\D/g, '');
        return digits.substring(0, 3) + '***' + digits.substring(6);
      },
      testCases: [
        {
          input: '123-456-7890',
          expectedMasked: '123***7890',
          shouldMatch: true
        },
        {
          input: '1234567890',
          expectedMasked: '123***7890',
          shouldMatch: true
        },
        {
          input: '12345',
          expectedMasked: '12345',
          shouldMatch: false
        }
      ]
    });

    // 身份证号码（简化版）
    this.registerPattern({
      name: 'idCard',
      pattern: /\b\d{15}|\d{18}\b/g,
      maskingRule: (id: string) => {
        return id.substring(0, 6) + '*'.repeat(id.length - 10) + id.substring(id.length - 4);
      },
      testCases: [
        {
          input: '123456789012345678',
          expectedMasked: '123456********5678',
          shouldMatch: true
        },
        {
          input: '123456789012345',
          expectedMasked: '123456*****2345',
          shouldMatch: true
        },
        {
          input: '12345',
          expectedMasked: '12345',
          shouldMatch: false
        }
      ]
    });

    // IP地址
    this.registerPattern({
      name: 'ipAddress',
      pattern: /\b(?:\d{1,3}\.){3}\d{1,3}\b/g,
      maskingRule: (ip: string) => {
        const parts = ip.split('.');
        return `${parts[0]}.${parts[1]}.***.***.`;
      },
      testCases: [
        {
          input: '192.168.1.1',
          expectedMasked: '192.168.***.***.', 
          shouldMatch: true
        },
        {
          input: '10.0.0.1',
          expectedMasked: '10.0.***.***.', 
          shouldMatch: true
        },
        {
          input: 'not-an-ip',
          expectedMasked: 'not-an-ip',
          shouldMatch: false
        }
      ]
    });
  }

  /**
   * 获取所有注册的模式
   */
  getRegisteredPatterns(): string[] {
    return Array.from(this.patterns.keys());
  }

  /**
   * 生成脱敏测试报告
   */
  generateMaskingReport(results: MaskingTestResult[]): string {
    const totalTests = results.length;
    const passedTests = results.filter(r => r.passed).length;
    const failedTests = totalTests - passedTests;

    let report = `数据脱敏测试报告\n`;
    report += `==================\n`;
    report += `总测试数: ${totalTests}\n`;
    report += `通过: ${passedTests}\n`;
    report += `失败: ${failedTests}\n`;
    report += `通过率: ${((passedTests / totalTests) * 100).toFixed(2)}%\n\n`;

    if (failedTests > 0) {
      report += `失败详情:\n`;
      report += `----------\n`;
      
      for (const result of results) {
        if (!result.passed) {
          report += `模式: ${result.pattern}\n`;
          for (const failure of result.failures) {
            report += `  输入: ${failure.input}\n`;
            report += `  期望: ${failure.expected}\n`;
            report += `  实际: ${failure.actual}\n`;
            report += `  原因: ${failure.reason}\n\n`;
          }
        }
      }
    }

    return report;
  }
}