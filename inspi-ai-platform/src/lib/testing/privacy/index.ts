/**
 * 数据隐私保护测试模块
 * 提供全面的隐私保护测试功能
 */

export { DataMaskingTester } from './DataMaskingTester';
export type { 
  SensitiveDataPattern, 
  MaskingTestResult 
} from './DataMaskingTester';

export { AccessPermissionTester } from './AccessPermissionTester';
export type { 
  AccessRule, 
  AccessTestCase, 
  AccessTestResult 
} from './AccessPermissionTester';

export { DataDeletionTester } from './DataDeletionTester';
export type { 
  DeletionRule, 
  DeletionTestCase, 
  DeletionTestResult 
} from './DataDeletionTester';

export { PrivacyComplianceChecker } from './PrivacyComplianceChecker';
export type { 
  ComplianceRule, 
  ComplianceContext, 
  ComplianceResult, 
  ComplianceReport 
} from './PrivacyComplianceChecker';

/**
 * 隐私测试框架
 * 集成所有隐私保护测试功能的主要类
 */
export class PrivacyTestFramework {
  private maskingTester: DataMaskingTester;
  private permissionTester: AccessPermissionTester;
  private deletionTester: DataDeletionTester;
  private complianceChecker: PrivacyComplianceChecker;

  constructor() {
    this.maskingTester = new DataMaskingTester();
    this.permissionTester = new AccessPermissionTester();
    this.deletionTester = new DataDeletionTester();
    this.complianceChecker = new PrivacyComplianceChecker();
  }

  /**
   * 获取数据脱敏测试器
   */
  getMaskingTester(): DataMaskingTester {
    return this.maskingTester;
  }

  /**
   * 获取访问权限测试器
   */
  getPermissionTester(): AccessPermissionTester {
    return this.permissionTester;
  }

  /**
   * 获取数据删除测试器
   */
  getDeletionTester(): DataDeletionTester {
    return this.deletionTester;
  }

  /**
   * 获取合规检查器
   */
  getComplianceChecker(): PrivacyComplianceChecker {
    return this.complianceChecker;
  }

  /**
   * 运行完整的隐私保护测试套件
   */
  async runFullPrivacyTestSuite(options: {
    testData?: any;
    complianceContext?: any;
    generateReports?: boolean;
  } = {}): Promise<{
    maskingResults: any[];
    permissionResults: any[];
    deletionResults: any[];
    complianceReport: any;
    overallScore: number;
    summary: string;
  }> {
    const results = {
      maskingResults: [] as any[],
      permissionResults: [] as any[],
      deletionResults: [] as any[],
      complianceReport: null as any,
      overallScore: 0,
      summary: ''
    };

    try {
      // 运行数据脱敏测试
      if (options.testData) {
        results.maskingResults = await this.maskingTester.testDataMasking(options.testData);
      }

      // 运行访问权限测试
      this.permissionTester.generateDefaultRules();
      this.permissionTester.generateDefaultTestCases();
      results.permissionResults = await this.permissionTester.runPermissionTests();

      // 运行数据删除测试
      this.deletionTester.generateDefaultDeletionRules();
      this.deletionTester.generateDefaultTestCases();
      results.deletionResults = await this.deletionTester.runDeletionTests();

      // 运行合规检查
      if (options.complianceContext) {
        results.complianceReport = await this.complianceChecker.runComplianceCheck(options.complianceContext);
      }

      // 计算总体评分
      results.overallScore = this.calculateOverallScore(results);

      // 生成摘要
      results.summary = this.generateSummary(results);

      return results;
    } catch (error) {
      throw new Error(`隐私测试套件执行失败: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * 计算总体评分
   */
  private calculateOverallScore(results: any): number {
    let totalScore = 0;
    let componentCount = 0;

    // 数据脱敏评分
    if (results.maskingResults.length > 0) {
      const maskingPassed = results.maskingResults.filter((r: any) => r.passed).length;
      const maskingScore = (maskingPassed / results.maskingResults.length) * 100;
      totalScore += maskingScore;
      componentCount++;
    }

    // 访问权限评分
    if (results.permissionResults.length > 0) {
      const permissionPassed = results.permissionResults.filter((r: any) => r.passed).length;
      const permissionScore = (permissionPassed / results.permissionResults.length) * 100;
      totalScore += permissionScore;
      componentCount++;
    }

    // 数据删除评分
    if (results.deletionResults.length > 0) {
      const deletionPassed = results.deletionResults.filter((r: any) => r.passed).length;
      const deletionScore = (deletionPassed / results.deletionResults.length) * 100;
      totalScore += deletionScore;
      componentCount++;
    }

    // 合规检查评分
    if (results.complianceReport) {
      totalScore += results.complianceReport.overallScore;
      componentCount++;
    }

    return componentCount > 0 ? Math.round(totalScore / componentCount) : 0;
  }

  /**
   * 生成测试摘要
   */
  private generateSummary(results: any): string {
    let summary = '隐私保护测试摘要\n';
    summary += '==================\n';
    summary += `总体评分: ${results.overallScore}/100\n\n`;

    if (results.maskingResults.length > 0) {
      const maskingPassed = results.maskingResults.filter((r: any) => r.passed).length;
      summary += `数据脱敏测试: ${maskingPassed}/${results.maskingResults.length} 通过\n`;
    }

    if (results.permissionResults.length > 0) {
      const permissionPassed = results.permissionResults.filter((r: any) => r.passed).length;
      summary += `访问权限测试: ${permissionPassed}/${results.permissionResults.length} 通过\n`;
    }

    if (results.deletionResults.length > 0) {
      const deletionPassed = results.deletionResults.filter((r: any) => r.passed).length;
      summary += `数据删除测试: ${deletionPassed}/${results.deletionResults.length} 通过\n`;
    }

    if (results.complianceReport) {
      summary += `合规检查: ${results.complianceReport.passedRules}/${results.complianceReport.totalRules} 规则通过\n`;
      if (results.complianceReport.criticalViolations > 0) {
        summary += `⚠️  发现 ${results.complianceReport.criticalViolations} 个严重违规\n`;
      }
    }

    return summary;
  }

  /**
   * 清理所有测试器
   */
  cleanup(): void {
    this.permissionTester.cleanup();
    this.deletionTester.cleanup();
    this.complianceChecker.cleanup();
  }
}