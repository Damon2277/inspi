/**
 * 合规性检查框架 - 核心框架类
 * 
 * 提供统一的合规性检查接口和管理功能
 */

export interface ComplianceRule {
  id: string;
  name: string;
  description: string;
  category: 'code-quality' | 'test-coverage' | 'documentation' | 'security';
  severity: 'error' | 'warning' | 'info';
  enabled: boolean;
  check: (context: ComplianceContext) => Promise<ComplianceResult>;
}

export interface ComplianceContext {
  projectPath: string;
  testResults?: any;
  coverageData?: any;
  codeMetrics?: any;
  documentationPaths?: string[];
  customData?: Record<string, any>;
}

export interface ComplianceResult {
  ruleId: string;
  passed: boolean;
  score: number; // 0-100
  message: string;
  details?: string;
  suggestions?: string[];
  evidence?: any;
  timestamp: Date;
}

export interface ComplianceReport {
  id: string;
  timestamp: Date;
  projectName: string;
  overallScore: number;
  status: 'passed' | 'failed' | 'warning';
  summary: {
    totalRules: number;
    passedRules: number;
    failedRules: number;
    warningRules: number;
  };
  categoryScores: Record<string, number>;
  results: ComplianceResult[];
  recommendations: string[];
  trends?: ComplianceTrend[];
}

export interface ComplianceTrend {
  date: Date;
  score: number;
  category: string;
}

export class ComplianceFramework {
  private rules: Map<string, ComplianceRule> = new Map();
  private config: ComplianceConfig;

  constructor(config: ComplianceConfig) {
    this.config = config;
  }

  /**
   * 注册合规性规则
   */
  registerRule(rule: ComplianceRule): void {
    this.rules.set(rule.id, rule);
  }

  /**
   * 批量注册规则
   */
  registerRules(rules: ComplianceRule[]): void {
    rules.forEach(rule => this.registerRule(rule));
  }

  /**
   * 获取规则
   */
  getRule(id: string): ComplianceRule | undefined {
    return this.rules.get(id);
  }

  /**
   * 获取所有启用的规则
   */
  getEnabledRules(): ComplianceRule[] {
    return Array.from(this.rules.values()).filter(rule => rule.enabled);
  }

  /**
   * 按类别获取规则
   */
  getRulesByCategory(category: string): ComplianceRule[] {
    return Array.from(this.rules.values()).filter(rule => 
      rule.category === category && rule.enabled
    );
  }

  /**
   * 执行合规性检查
   */
  async runCompliance(context: ComplianceContext): Promise<ComplianceReport> {
    const enabledRules = this.getEnabledRules();
    const results: ComplianceResult[] = [];

    // 并行执行所有规则检查
    const rulePromises = enabledRules.map(async (rule) => {
      try {
        const result = await rule.check(context);
        return result;
      } catch (error) {
        return {
          ruleId: rule.id,
          passed: false,
          score: 0,
          message: `Rule execution failed: ${error.message}`,
          timestamp: new Date()
        };
      }
    });

    const ruleResults = await Promise.all(rulePromises);
    results.push(...ruleResults);

    return this.generateReport(results, context);
  }

  /**
   * 生成合规性报告
   */
  private generateReport(results: ComplianceResult[], context: ComplianceContext): ComplianceReport {
    const totalRules = results.length;
    const passedRules = results.filter(r => r.passed).length;
    const failedRules = results.filter(r => !r.passed).length;
    const warningRules = results.filter(r => r.score > 0 && r.score < 100).length;

    // 计算总体分数
    const overallScore = totalRules > 0 
      ? Math.round(results.reduce((sum, r) => sum + r.score, 0) / totalRules)
      : 0;

    // 计算类别分数
    const categoryScores: Record<string, number> = {};
    const categories = ['code-quality', 'test-coverage', 'documentation', 'security'];
    
    categories.forEach(category => {
      const categoryResults = results.filter(r => {
        const rule = this.getRule(r.ruleId);
        return rule?.category === category;
      });
      
      if (categoryResults.length > 0) {
        categoryScores[category] = Math.round(
          categoryResults.reduce((sum, r) => sum + r.score, 0) / categoryResults.length
        );
      }
    });

    // 生成建议
    const recommendations = this.generateRecommendations(results);

    // 确定状态
    const status = overallScore >= this.config.thresholds.pass 
      ? 'passed' 
      : overallScore >= this.config.thresholds.warning 
        ? 'warning' 
        : 'failed';

    return {
      id: `compliance-${Date.now()}`,
      timestamp: new Date(),
      projectName: context.projectPath.split('/').pop() || 'unknown',
      overallScore,
      status,
      summary: {
        totalRules,
        passedRules,
        failedRules,
        warningRules
      },
      categoryScores,
      results,
      recommendations
    };
  }

  /**
   * 生成改进建议
   */
  private generateRecommendations(results: ComplianceResult[]): string[] {
    const recommendations: string[] = [];
    const failedResults = results.filter(r => !r.passed);

    // 按严重程度分组
    const errorResults = failedResults.filter(r => {
      const rule = this.getRule(r.ruleId);
      return rule?.severity === 'error';
    });

    const warningResults = failedResults.filter(r => {
      const rule = this.getRule(r.ruleId);
      return rule?.severity === 'warning';
    });

    if (errorResults.length > 0) {
      recommendations.push(`修复 ${errorResults.length} 个严重合规性问题`);
    }

    if (warningResults.length > 0) {
      recommendations.push(`处理 ${warningResults.length} 个警告级别的合规性问题`);
    }

    // 添加具体建议
    failedResults.forEach(result => {
      if (result.suggestions) {
        recommendations.push(...result.suggestions);
      }
    });

    return [...new Set(recommendations)]; // 去重
  }

  /**
   * 验证合规性阈值
   */
  validateThresholds(report: ComplianceReport): boolean {
    return report.overallScore >= this.config.thresholds.pass;
  }

  /**
   * 获取合规性统计
   */
  getComplianceStats(report: ComplianceReport): ComplianceStats {
    return {
      overallScore: report.overallScore,
      categoryBreakdown: report.categoryScores,
      ruleBreakdown: report.results.reduce((acc, result) => {
        acc[result.ruleId] = result.score;
        return acc;
      }, {} as Record<string, number>),
      complianceRate: (report.summary.passedRules / report.summary.totalRules) * 100,
      improvementAreas: this.identifyImprovementAreas(report)
    };
  }

  /**
   * 识别改进领域
   */
  private identifyImprovementAreas(report: ComplianceReport): string[] {
    const areas: string[] = [];
    
    Object.entries(report.categoryScores).forEach(([category, score]) => {
      if (score < this.config.thresholds.warning) {
        areas.push(category);
      }
    });

    return areas;
  }
}

export interface ComplianceConfig {
  thresholds: {
    pass: number;
    warning: number;
  };
  rules: {
    enabled: string[];
    disabled: string[];
  };
  reporting: {
    outputPath: string;
    formats: ('json' | 'html' | 'markdown')[];
  };
  scheduling: {
    enabled: boolean;
    interval: string; // cron expression
  };
}

export interface ComplianceStats {
  overallScore: number;
  categoryBreakdown: Record<string, number>;
  ruleBreakdown: Record<string, number>;
  complianceRate: number;
  improvementAreas: string[];
}

export const DEFAULT_COMPLIANCE_CONFIG: ComplianceConfig = {
  thresholds: {
    pass: 80,
    warning: 60
  },
  rules: {
    enabled: [],
    disabled: []
  },
  reporting: {
    outputPath: './compliance-reports',
    formats: ['json', 'html']
  },
  scheduling: {
    enabled: false,
    interval: '0 0 * * *' // 每天午夜
  }
};