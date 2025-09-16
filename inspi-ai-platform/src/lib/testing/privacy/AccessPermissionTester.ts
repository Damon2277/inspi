/**
 * 数据访问权限测试器
 * 用于测试数据访问权限控制是否正确实施
 */

export interface AccessRule {
  resource: string;
  action: 'read' | 'write' | 'delete' | 'update';
  roles: string[];
  conditions?: Record<string, any>;
}

export interface AccessTestCase {
  name: string;
  user: {
    id: string;
    roles: string[];
    attributes?: Record<string, any>;
  };
  resource: string;
  action: string;
  context?: Record<string, any>;
  expectedResult: boolean;
  reason?: string;
}

export interface AccessTestResult {
  testCase: string;
  passed: boolean;
  expected: boolean;
  actual: boolean;
  error?: string;
  executionTime: number;
}

export class AccessPermissionTester {
  private rules: Map<string, AccessRule[]> = new Map();
  private testCases: AccessTestCase[] = [];

  /**
   * 注册访问规则
   */
  registerRule(rule: AccessRule): void {
    const key = `${rule.resource}:${rule.action}`;
    const existing = this.rules.get(key) || [];
    existing.push(rule);
    this.rules.set(key, existing);
  }

  /**
   * 批量注册访问规则
   */
  registerRules(rules: AccessRule[]): void {
    rules.forEach(rule => this.registerRule(rule));
  }

  /**
   * 添加测试用例
   */
  addTestCase(testCase: AccessTestCase): void {
    this.testCases.push(testCase);
  }

  /**
   * 批量添加测试用例
   */
  addTestCases(testCases: AccessTestCase[]): void {
    testCases.forEach(testCase => this.addTestCase(testCase));
  }

  /**
   * 执行权限测试
   */
  async runPermissionTests(): Promise<AccessTestResult[]> {
    const results: AccessTestResult[] = [];

    for (const testCase of this.testCases) {
      const startTime = Date.now();
      
      try {
        const actual = await this.checkAccess(
          testCase.user,
          testCase.resource,
          testCase.action,
          testCase.context
        );
        
        const executionTime = Date.now() - startTime;
        
        results.push({
          testCase: testCase.name,
          passed: actual === testCase.expectedResult,
          expected: testCase.expectedResult,
          actual,
          executionTime
        });
      } catch (error) {
        const executionTime = Date.now() - startTime;
        
        results.push({
          testCase: testCase.name,
          passed: false,
          expected: testCase.expectedResult,
          actual: false,
          error: error instanceof Error ? error.message : String(error),
          executionTime
        });
      }
    }

    return results;
  }

  /**
   * 检查访问权限
   */
  async checkAccess(
    user: { id: string; roles: string[]; attributes?: Record<string, any> },
    resource: string,
    action: string,
    context?: Record<string, any>
  ): Promise<boolean> {
    const key = `${resource}:${action}`;
    const rules = this.rules.get(key) || [];

    if (rules.length === 0) {
      // 没有规则定义，默认拒绝访问
      return false;
    }

    // 检查是否有匹配的规则
    for (const rule of rules) {
      if (this.matchesRule(user, rule, context)) {
        return true;
      }
    }

    return false;
  }

  /**
   * 检查用户是否匹配规则
   */
  private matchesRule(
    user: { id: string; roles: string[]; attributes?: Record<string, any> },
    rule: AccessRule,
    context?: Record<string, any>
  ): boolean {
    // 检查角色
    const hasRequiredRole = rule.roles.some(role => user.roles.includes(role));
    if (!hasRequiredRole) {
      return false;
    }

    // 检查条件
    if (rule.conditions) {
      return this.evaluateConditions(rule.conditions, user, context);
    }

    return true;
  }

  /**
   * 评估访问条件
   */
  private evaluateConditions(
    conditions: Record<string, any>,
    user: { id: string; roles: string[]; attributes?: Record<string, any> },
    context?: Record<string, any>
  ): boolean {
    for (const [key, value] of Object.entries(conditions)) {
      if (key.startsWith('user.')) {
        const userKey = key.substring(5);
        const userValue = user.attributes?.[userKey];
        
        if (!this.compareValues(userValue, value)) {
          return false;
        }
      } else if (key.startsWith('context.')) {
        const contextKey = key.substring(8);
        const contextValue = context?.[contextKey];
        
        if (!this.compareValues(contextValue, value)) {
          return false;
        }
      } else if (key === 'userId') {
        // 特殊处理用户ID匹配
        if (context?.userId && user.id !== context.userId) {
          return false;
        }
      }
    }

    return true;
  }

  /**
   * 比较值
   */
  private compareValues(actual: any, expected: any): boolean {
    if (typeof expected === 'object' && expected !== null) {
      if (expected.$eq !== undefined) {
        return actual === expected.$eq;
      }
      if (expected.$ne !== undefined) {
        return actual !== expected.$ne;
      }
      if (expected.$in !== undefined) {
        return Array.isArray(expected.$in) && expected.$in.includes(actual);
      }
      if (expected.$nin !== undefined) {
        return Array.isArray(expected.$nin) && !expected.$nin.includes(actual);
      }
      if (expected.$gt !== undefined) {
        return actual > expected.$gt;
      }
      if (expected.$gte !== undefined) {
        return actual >= expected.$gte;
      }
      if (expected.$lt !== undefined) {
        return actual < expected.$lt;
      }
      if (expected.$lte !== undefined) {
        return actual <= expected.$lte;
      }
    }

    return actual === expected;
  }

  /**
   * 生成默认测试用例
   */
  generateDefaultTestCases(): void {
    // 管理员权限测试
    this.addTestCase({
      name: '管理员应该能够访问所有用户数据',
      user: {
        id: 'admin-1',
        roles: ['admin']
      },
      resource: 'user',
      action: 'read',
      expectedResult: true,
      reason: '管理员拥有所有权限'
    });

    // 普通用户权限测试
    this.addTestCase({
      name: '普通用户只能访问自己的数据',
      user: {
        id: 'user-1',
        roles: ['user']
      },
      resource: 'user',
      action: 'read',
      context: { userId: 'user-1' },
      expectedResult: true,
      reason: '用户可以访问自己的数据'
    });

    this.addTestCase({
      name: '普通用户不能访问其他用户的数据',
      user: {
        id: 'user-1',
        roles: ['user']
      },
      resource: 'user',
      action: 'read',
      context: { userId: 'user-2' },
      expectedResult: false,
      reason: '用户不能访问其他用户的数据'
    });

    // 匿名用户权限测试
    this.addTestCase({
      name: '匿名用户不能访问受保护的资源',
      user: {
        id: 'anonymous',
        roles: ['anonymous']
      },
      resource: 'user',
      action: 'read',
      expectedResult: false,
      reason: '匿名用户没有访问权限'
    });

    // 删除权限测试
    this.addTestCase({
      name: '普通用户不能删除数据',
      user: {
        id: 'user-1',
        roles: ['user']
      },
      resource: 'user',
      action: 'delete',
      expectedResult: false,
      reason: '普通用户没有删除权限'
    });

    this.addTestCase({
      name: '管理员可以删除数据',
      user: {
        id: 'admin-1',
        roles: ['admin']
      },
      resource: 'user',
      action: 'delete',
      expectedResult: true,
      reason: '管理员拥有删除权限'
    });
  }

  /**
   * 生成默认访问规则
   */
  generateDefaultRules(): void {
    // 管理员规则
    this.registerRule({
      resource: 'user',
      action: 'read',
      roles: ['admin']
    });

    this.registerRule({
      resource: 'user',
      action: 'write',
      roles: ['admin']
    });

    this.registerRule({
      resource: 'user',
      action: 'delete',
      roles: ['admin']
    });

    // 用户自己的数据访问规则
    this.registerRule({
      resource: 'user',
      action: 'read',
      roles: ['user'],
      conditions: {
        userId: true
      }
    });

    this.registerRule({
      resource: 'user',
      action: 'update',
      roles: ['user'],
      conditions: {
        userId: true
      }
    });

    // 作品访问规则
    this.registerRule({
      resource: 'work',
      action: 'read',
      roles: ['user', 'admin']
    });

    this.registerRule({
      resource: 'work',
      action: 'write',
      roles: ['user'],
      conditions: {
        'context.ownerId': user => user.id
      }
    });
  }

  /**
   * 生成权限测试报告
   */
  generatePermissionReport(results: AccessTestResult[]): string {
    const totalTests = results.length;
    const passedTests = results.filter(r => r.passed).length;
    const failedTests = totalTests - passedTests;
    const avgExecutionTime = results.reduce((sum, r) => sum + r.executionTime, 0) / totalTests;

    let report = `数据访问权限测试报告\n`;
    report += `========================\n`;
    report += `总测试数: ${totalTests}\n`;
    report += `通过: ${passedTests}\n`;
    report += `失败: ${failedTests}\n`;
    report += `通过率: ${((passedTests / totalTests) * 100).toFixed(2)}%\n`;
    report += `平均执行时间: ${avgExecutionTime.toFixed(2)}ms\n\n`;

    if (failedTests > 0) {
      report += `失败详情:\n`;
      report += `----------\n`;
      
      for (const result of results) {
        if (!result.passed) {
          report += `测试用例: ${result.testCase}\n`;
          report += `  期望结果: ${result.expected}\n`;
          report += `  实际结果: ${result.actual}\n`;
          report += `  执行时间: ${result.executionTime}ms\n`;
          if (result.error) {
            report += `  错误信息: ${result.error}\n`;
          }
          report += `\n`;
        }
      }
    }

    return report;
  }

  /**
   * 清理测试数据
   */
  cleanup(): void {
    this.rules.clear();
    this.testCases = [];
  }
}