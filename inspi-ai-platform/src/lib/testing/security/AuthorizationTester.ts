/**
 * Authorization Security Tester
 *
 * 专门用于测试认证授权安全边界的测试器
 * 包括权限提升、访问控制绕过、会话管理等测试
 */

export interface AuthorizationConfig {
  enableRoleBasedTests: boolean;
  enableResourceAccessTests: boolean;
  enablePrivilegeEscalationTests: boolean;
  enableSessionTests: boolean;
  enableTokenTests: boolean;
  customRoles: Role[];
  customResources: Resource[];
  testScenarios: AuthTestScenario[];
}

export interface Role {
  name: string;
  permissions: string[];
  level: number;
  description: string;
}

export interface Resource {
  id: string;
  type: string;
  owner?: string;
  visibility: 'public' | 'private' | 'restricted';
  requiredPermissions: string[];
  requiredRoles: string[];
}

export interface AuthTestScenario {
  name: string;
  description: string;
  user: TestUser;
  resource: Resource;
  action: string;
  expectedResult: 'allow' | 'deny';
  testType: 'role_based' | 'resource_access' | 'privilege_escalation' | 'session' | 'token';
}

export interface TestUser {
  id: string;
  username: string;
  roles: string[];
  permissions: string[];
  sessionId?: string;
  token?: string;
  attributes?: Record<string, any>;
}

export interface AuthorizationTestResult {
  scenario: AuthTestScenario;
  actualResult: 'allow' | 'deny' | 'error';
  passed: boolean;
  executionTime: number;
  errorMessage?: string;
  securityRisk: 'none' | 'low' | 'medium' | 'high' | 'critical';
  details: AuthTestDetails;
}

export interface AuthTestDetails {
  requestedAction: string;
  userContext: TestUser;
  resourceContext: Resource;
  authorizationDecision: string;
  reasonCode?: string;
  additionalInfo?: Record<string, any>;
}

export class AuthorizationTester {
  private config: AuthorizationConfig;
  private defaultScenarios: AuthTestScenario[];

  constructor(config: AuthorizationConfig) {
    this.config = config;
    this.defaultScenarios = this.generateDefaultScenarios();
  }

  /**
   * 运行完整的授权测试套件
   */
  async runAuthorizationTests(authService: AuthorizationService): Promise<AuthorizationTestResult[]> {
    const results: AuthorizationTestResult[] = [];
    const allScenarios = [...this.defaultScenarios, ...this.config.testScenarios];

    for (const scenario of allScenarios) {
      if (this.shouldRunScenario(scenario)) {
        const result = await this.testScenario(scenario, authService);
        results.push(result);
      }
    }

    return results;
  }

  /**
   * 测试单个授权场景
   */
  private async testScenario(scenario: AuthTestScenario, authService: AuthorizationService): Promise<AuthorizationTestResult> {
    const startTime = Date.now();

    try {
      const authResult = await authService.authorize(scenario.user, scenario.resource, scenario.action);
      const executionTime = Date.now() - startTime;

      const actualResult = authResult.allowed ? 'allow' : 'deny';
      const passed = actualResult === scenario.expectedResult;
      const securityRisk = this.assessSecurityRisk(scenario, actualResult, passed);

      return {
        scenario,
        actualResult,
        passed,
        executionTime,
        securityRisk,
        details: {
          requestedAction: scenario.action,
          userContext: scenario.user,
          resourceContext: scenario.resource,
          authorizationDecision: authResult.decision,
          reasonCode: authResult.reasonCode,
          additionalInfo: authResult.additionalInfo,
        },
      };
    } catch (error) {
      return {
        scenario,
        actualResult: 'error',
        passed: false,
        executionTime: Date.now() - startTime,
        errorMessage: error instanceof Error ? error.message : String(error),
        securityRisk: 'high',
        details: {
          requestedAction: scenario.action,
          userContext: scenario.user,
          resourceContext: scenario.resource,
          authorizationDecision: 'error',
        },
      };
    }
  }

  /**
   * 生成默认的测试场景
   */
  private generateDefaultScenarios(): AuthTestScenario[] {
    const scenarios: AuthTestScenario[] = [];

    // 基于角色的访问控制测试
    if (this.config.enableRoleBasedTests) {
      scenarios.push(
        {
          name: 'Admin Full Access',
          description: '管理员应该能够访问所有资源',
          user: { id: 'admin1', username: 'admin', roles: ['admin'], permissions: ['*'] },
          resource: { id: 'res1', type: 'document', visibility: 'private', requiredPermissions: ['read'], requiredRoles: ['user'] },
          action: 'read',
          expectedResult: 'allow',
          testType: 'role_based',
        },
        {
          name: 'User Limited Access',
          description: '普通用户只能访问自己的资源',
          user: { id: 'user1', username: 'user1', roles: ['user'], permissions: ['read', 'write'] },
          resource: { id: 'res1', type: 'document', visibility: 'private', owner: 'user1', requiredPermissions: ['read'], requiredRoles: ['user'] },
          action: 'read',
          expectedResult: 'allow',
          testType: 'role_based',
        },
        {
          name: 'Unauthorized User Access',
          description: '未授权用户不应该能够访问私有资源',
          user: { id: 'user1', username: 'user1', roles: ['user'], permissions: ['read'] },
          resource: { id: 'res2', type: 'document', visibility: 'private', owner: 'user2', requiredPermissions: ['read'], requiredRoles: ['user'] },
          action: 'read',
          expectedResult: 'deny',
          testType: 'role_based',
        },
      );
    }

    // 资源访问控制测试
    if (this.config.enableResourceAccessTests) {
      scenarios.push(
        {
          name: 'Public Resource Access',
          description: '任何用户都应该能够访问公共资源',
          user: { id: 'guest1', username: 'guest', roles: ['guest'], permissions: [] },
          resource: { id: 'pub1', type: 'document', visibility: 'public', requiredPermissions: [], requiredRoles: [] },
          action: 'read',
          expectedResult: 'allow',
          testType: 'resource_access',
        },
        {
          name: 'Restricted Resource Access',
          description: '只有特定角色才能访问受限资源',
          user: { id: 'user1', username: 'user1', roles: ['user'], permissions: ['read'] },
          resource: { id: 'rest1', type: 'document', visibility: 'restricted', requiredPermissions: ['read'], requiredRoles: ['premium'] },
          action: 'read',
          expectedResult: 'deny',
          testType: 'resource_access',
        },
        {
          name: 'Owner Resource Access',
          description: '资源所有者应该能够访问自己的私有资源',
          user: { id: 'user1', username: 'user1', roles: ['user'], permissions: ['read', 'write'] },
          resource: { id: 'priv1', type: 'document', visibility: 'private', owner: 'user1', requiredPermissions: ['read'], requiredRoles: ['user'] },
          action: 'write',
          expectedResult: 'allow',
          testType: 'resource_access',
        },
      );
    }

    // 权限提升测试
    if (this.config.enablePrivilegeEscalationTests) {
      scenarios.push(
        {
          name: 'Horizontal Privilege Escalation',
          description: '用户不应该能够访问其他用户的私有资源',
          user: { id: 'user1', username: 'user1', roles: ['user'], permissions: ['read', 'write'] },
          resource: { id: 'priv2', type: 'document', visibility: 'private', owner: 'user2', requiredPermissions: ['read'], requiredRoles: ['user'] },
          action: 'read',
          expectedResult: 'deny',
          testType: 'privilege_escalation',
        },
        {
          name: 'Vertical Privilege Escalation',
          description: '普通用户不应该能够执行管理员操作',
          user: { id: 'user1', username: 'user1', roles: ['user'], permissions: ['read', 'write'] },
          resource: { id: 'admin1', type: 'system', visibility: 'restricted', requiredPermissions: ['admin'], requiredRoles: ['admin'] },
          action: 'delete',
          expectedResult: 'deny',
          testType: 'privilege_escalation',
        },
        {
          name: 'Role Manipulation Attempt',
          description: '用户不应该能够修改自己的角色',
          user: { id: 'user1', username: 'user1', roles: ['user'], permissions: ['read', 'write'] },
          resource: { id: 'role1', type: 'role', visibility: 'restricted', requiredPermissions: ['admin'], requiredRoles: ['admin'] },
          action: 'update',
          expectedResult: 'deny',
          testType: 'privilege_escalation',
        },
      );
    }

    // 会话管理测试
    if (this.config.enableSessionTests) {
      scenarios.push(
        {
          name: 'Valid Session Access',
          description: '有效会话应该允许访问',
          user: { id: 'user1', username: 'user1', roles: ['user'], permissions: ['read'], sessionId: 'valid_session_123' },
          resource: { id: 'res1', type: 'document', visibility: 'private', owner: 'user1', requiredPermissions: ['read'], requiredRoles: ['user'] },
          action: 'read',
          expectedResult: 'allow',
          testType: 'session',
        },
        {
          name: 'Invalid Session Access',
          description: '无效会话应该拒绝访问',
          user: { id: 'user1', username: 'user1', roles: ['user'], permissions: ['read'], sessionId: 'invalid_session_456' },
          resource: { id: 'res1', type: 'document', visibility: 'private', owner: 'user1', requiredPermissions: ['read'], requiredRoles: ['user'] },
          action: 'read',
          expectedResult: 'deny',
          testType: 'session',
        },
        {
          name: 'Expired Session Access',
          description: '过期会话应该拒绝访问',
          user: { id: 'user1', username: 'user1', roles: ['user'], permissions: ['read'], sessionId: 'expired_session_789' },
          resource: { id: 'res1', type: 'document', visibility: 'private', owner: 'user1', requiredPermissions: ['read'], requiredRoles: ['user'] },
          action: 'read',
          expectedResult: 'deny',
          testType: 'session',
        },
      );
    }

    // Token验证测试
    if (this.config.enableTokenTests) {
      scenarios.push(
        {
          name: 'Valid Token Access',
          description: '有效token应该允许访问',
          user: { id: 'user1', username: 'user1', roles: ['user'], permissions: ['read'], token: 'valid_jwt_token' },
          resource: { id: 'api1', type: 'api', visibility: 'restricted', requiredPermissions: ['api_access'], requiredRoles: ['user'] },
          action: 'call',
          expectedResult: 'allow',
          testType: 'token',
        },
        {
          name: 'Invalid Token Access',
          description: '无效token应该拒绝访问',
          user: { id: 'user1', username: 'user1', roles: ['user'], permissions: ['read'], token: 'invalid_jwt_token' },
          resource: { id: 'api1', type: 'api', visibility: 'restricted', requiredPermissions: ['api_access'], requiredRoles: ['user'] },
          action: 'call',
          expectedResult: 'deny',
          testType: 'token',
        },
        {
          name: 'Tampered Token Access',
          description: '被篡改的token应该拒绝访问',
          user: { id: 'user1', username: 'user1', roles: ['user'], permissions: ['read'], token: 'tampered_jwt_token' },
          resource: { id: 'api1', type: 'api', visibility: 'restricted', requiredPermissions: ['api_access'], requiredRoles: ['user'] },
          action: 'call',
          expectedResult: 'deny',
          testType: 'token',
        },
      );
    }

    return scenarios;
  }

  /**
   * 判断是否应该运行特定的场景
   */
  private shouldRunScenario(scenario: AuthTestScenario): boolean {
    switch (scenario.testType) {
      case 'role_based':
        return this.config.enableRoleBasedTests;
      case 'resource_access':
        return this.config.enableResourceAccessTests;
      case 'privilege_escalation':
        return this.config.enablePrivilegeEscalationTests;
      case 'session':
        return this.config.enableSessionTests;
      case 'token':
        return this.config.enableTokenTests;
      default:
        return true;
    }
  }

  /**
   * 评估安全风险级别
   */
  private assessSecurityRisk(scenario: AuthTestScenario, actualResult: string, passed: boolean): 'none' | 'low' | 'medium' | 'high' | 'critical' {
    if (passed) {
      return 'none';
    }

    // 如果测试失败，根据场景类型和预期结果评估风险
    if (scenario.expectedResult === 'deny' && actualResult === 'allow') {
      // 应该拒绝但实际允许 - 这是安全漏洞
      switch (scenario.testType) {
        case 'privilege_escalation':
          return 'critical';
        case 'resource_access':
          return scenario.resource.visibility === 'private' ? 'high' : 'medium';
        case 'role_based':
          return 'high';
        case 'session':
        case 'token':
          return 'medium';
        default:
          return 'medium';
      }
    } else if (scenario.expectedResult === 'allow' && actualResult === 'deny') {
      // 应该允许但实际拒绝 - 这是功能问题，安全风险较低
      return 'low';
    }

    return 'medium';
  }

  /**
   * 生成授权测试报告
   */
  generateAuthorizationReport(results: AuthorizationTestResult[]): AuthorizationReport {
    const totalTests = results.length;
    const passedTests = results.filter(r => r.passed).length;
    const failedTests = results.filter(r => !r.passed).length;

    const criticalRisks = results.filter(r => r.securityRisk === 'critical').length;
    const highRisks = results.filter(r => r.securityRisk === 'high').length;
    const mediumRisks = results.filter(r => r.securityRisk === 'medium').length;
    const lowRisks = results.filter(r => r.securityRisk === 'low').length;

    const averageExecutionTime = results.reduce((sum, r) => sum + r.executionTime, 0) / totalTests;

    const testTypeResults = this.groupResultsByTestType(results);

    return {
      summary: {
        totalTests,
        passedTests,
        failedTests,
        passRate: (passedTests / totalTests) * 100,
        averageExecutionTime,
      },
      riskDistribution: {
        critical: criticalRisks,
        high: highRisks,
        medium: mediumRisks,
        low: lowRisks,
        none: totalTests - criticalRisks - highRisks - mediumRisks - lowRisks,
      },
      testTypeResults,
      testResults: results,
      securityIssues: this.identifySecurityIssues(results),
      recommendations: this.generateRecommendations(results),
      timestamp: new Date(),
    };
  }

  /**
   * 按测试类型分组结果
   */
  private groupResultsByTestType(results: AuthorizationTestResult[]): Record<string, { passed: number; failed: number; total: number }> {
    const grouped: Record<string, { passed: number; failed: number; total: number }> = {};

    for (const result of results) {
      const testType = result.scenario.testType;
      if (!grouped[testType]) {
        grouped[testType] = { passed: 0, failed: 0, total: 0 };
      }

      grouped[testType].total++;
      if (result.passed) {
        grouped[testType].passed++;
      } else {
        grouped[testType].failed++;
      }
    }

    return grouped;
  }

  /**
   * 识别安全问题
   */
  private identifySecurityIssues(results: AuthorizationTestResult[]): SecurityIssue[] {
    const issues: SecurityIssue[] = [];
    const failedResults = results.filter(r => !r.passed && r.securityRisk !== 'none');

    for (const result of failedResults) {
      issues.push({
        type: result.scenario.testType,
        severity: result.securityRisk,
        description: `${result.scenario.name}: ${result.scenario.description}`,
        impact: this.getImpactForTestType(result.scenario.testType),
        recommendation: this.getRecommendationForTestType(result.scenario.testType),
        affectedResource: result.scenario.resource.id,
        testScenario: result.scenario.name,
      });
    }

    return issues;
  }

  /**
   * 生成改进建议
   */
  private generateRecommendations(results: AuthorizationTestResult[]): string[] {
    const recommendations: string[] = [];
    const failedResults = results.filter(r => !r.passed);

    if (failedResults.some(r => r.scenario.testType === 'privilege_escalation')) {
      recommendations.push('加强权限提升防护，实施最小权限原则');
    }

    if (failedResults.some(r => r.scenario.testType === 'role_based')) {
      recommendations.push('审查基于角色的访问控制实现');
    }

    if (failedResults.some(r => r.scenario.testType === 'resource_access')) {
      recommendations.push('完善资源访问控制策略');
    }

    if (failedResults.some(r => r.scenario.testType === 'session')) {
      recommendations.push('加强会话管理和验证机制');
    }

    if (failedResults.some(r => r.scenario.testType === 'token')) {
      recommendations.push('改进token验证和安全处理');
    }

    if (recommendations.length === 0) {
      recommendations.push('授权安全性良好，继续保持当前的安全措施');
    }

    return recommendations;
  }

  private getImpactForTestType(testType: string): string {
    const impacts = {
      privilege_escalation: '权限提升可能导致系统完全被攻破',
      role_based: '角色控制失效可能导致未授权访问',
      resource_access: '资源访问控制失效可能导致数据泄露',
      session: '会话管理问题可能导致会话劫持',
      token: 'Token验证问题可能导致身份伪造',
    };
    return impacts[testType as keyof typeof impacts] || '未知安全影响';
  }

  private getRecommendationForTestType(testType: string): string {
    const recommendations = {
      privilege_escalation: '实施严格的权限检查和最小权限原则',
      role_based: '审查和加强基于角色的访问控制',
      resource_access: '完善资源级别的访问控制',
      session: '加强会话管理和超时控制',
      token: '改进token生成、验证和撤销机制',
    };
    return recommendations[testType as keyof typeof recommendations] || '审查相关安全实现';
  }
}

// 授权服务接口
export interface AuthorizationService {
  authorize(user: TestUser, resource: Resource, action: string): Promise<AuthorizationResult>;
}

export interface AuthorizationResult {
  allowed: boolean;
  decision: string;
  reasonCode?: string;
  additionalInfo?: Record<string, any>;
}

export interface SecurityIssue {
  type: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  impact: string;
  recommendation: string;
  affectedResource: string;
  testScenario: string;
}

export interface AuthorizationReport {
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
    none: number;
  };
  testTypeResults: Record<string, { passed: number; failed: number; total: number }>;
  testResults: AuthorizationTestResult[];
  securityIssues: SecurityIssue[];
  recommendations: string[];
  timestamp: Date;
}
