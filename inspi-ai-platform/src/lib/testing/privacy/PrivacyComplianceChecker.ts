/**
 * 隐私合规自动检查器
 * 用于自动检查代码和数据处理是否符合隐私保护法规
 */

export interface ComplianceRule {
  id: string;
  name: string;
  description: string;
  regulation: 'GDPR' | 'CCPA' | 'PIPEDA' | 'LGPD' | 'CUSTOM';
  severity: 'critical' | 'high' | 'medium' | 'low';
  category: 'data-collection' | 'data-processing' | 'data-storage' | 'data-transfer' | 'user-rights' | 'consent';
  checker: (context: ComplianceContext) => Promise<ComplianceResult>;
}

export interface ComplianceContext {
  codebase: {
    files: Array<{
      path: string;
      content: string;
      type: 'typescript' | 'javascript' | 'json' | 'sql' | 'other';
    }>;
  };
  dataModels: Array<{
    name: string;
    fields: Array<{
      name: string;
      type: string;
      sensitive: boolean;
      pii: boolean;
    }>;
  }>;
  apiEndpoints: Array<{
    path: string;
    method: string;
    collectsPersonalData: boolean;
    requiresConsent: boolean;
  }>;
  configuration: {
    dataRetentionPeriods: Record<string, number>;
    encryptionSettings: Record<string, boolean>;
    auditingEnabled: boolean;
  };
}

export interface ComplianceResult {
  ruleId: string;
  passed: boolean;
  findings: Array<{
    type: 'violation' | 'warning' | 'info';
    message: string;
    location?: {
      file: string;
      line?: number;
      column?: number;
    };
    suggestion?: string;
  }>;
  score: number; // 0-100
}

export interface ComplianceReport {
  timestamp: Date;
  overallScore: number;
  totalRules: number;
  passedRules: number;
  failedRules: number;
  criticalViolations: number;
  highViolations: number;
  mediumViolations: number;
  lowViolations: number;
  results: ComplianceResult[];
  recommendations: string[];
}

export class PrivacyComplianceChecker {
  private rules: Map<string, ComplianceRule> = new Map();

  constructor() {
    this.initializeDefaultRules();
  }

  /**
   * 注册合规规则
   */
  registerRule(rule: ComplianceRule): void {
    this.rules.set(rule.id, rule);
  }

  /**
   * 批量注册合规规则
   */
  registerRules(rules: ComplianceRule[]): void {
    rules.forEach(rule => this.registerRule(rule));
  }

  /**
   * 执行合规检查
   */
  async runComplianceCheck(context: ComplianceContext): Promise<ComplianceReport> {
    const results: ComplianceResult[] = [];
    const startTime = Date.now();

    for (const [, rule] of this.rules) {
      try {
        const result = await rule.checker(context);
        results.push(result);
      } catch (error) {
        results.push({
          ruleId: rule.id,
          passed: false,
          findings: [{
            type: 'violation',
            message: `Rule execution failed: ${error instanceof Error ? error.message : String(error)}`
          }],
          score: 0
        });
      }
    }

    return this.generateReport(results);
  }

  /**
   * 生成合规报告
   */
  private generateReport(results: ComplianceResult[]): ComplianceReport {
    const totalRules = results.length;
    const passedRules = results.filter(r => r.passed).length;
    const failedRules = totalRules - passedRules;
    
    let criticalViolations = 0;
    let highViolations = 0;
    let mediumViolations = 0;
    let lowViolations = 0;

    for (const result of results) {
      if (!result.passed) {
        const rule = this.rules.get(result.ruleId);
        if (rule) {
          switch (rule.severity) {
            case 'critical':
              criticalViolations++;
              break;
            case 'high':
              highViolations++;
              break;
            case 'medium':
              mediumViolations++;
              break;
            case 'low':
              lowViolations++;
              break;
          }
        }
      }
    }

    const overallScore = totalRules > 0 
      ? Math.round((results.reduce((sum, r) => sum + r.score, 0) / totalRules))
      : 0;

    const recommendations = this.generateRecommendations(results);

    return {
      timestamp: new Date(),
      overallScore,
      totalRules,
      passedRules,
      failedRules,
      criticalViolations,
      highViolations,
      mediumViolations,
      lowViolations,
      results,
      recommendations
    };
  }

  /**
   * 生成改进建议
   */
  private generateRecommendations(results: ComplianceResult[]): string[] {
    const recommendations: string[] = [];
    const violationsByCategory = new Map<string, number>();

    for (const result of results) {
      if (!result.passed) {
        const rule = this.rules.get(result.ruleId);
        if (rule) {
          const count = violationsByCategory.get(rule.category) || 0;
          violationsByCategory.set(rule.category, count + 1);
        }
      }
    }

    // 根据违规类别生成建议
    for (const [category, count] of violationsByCategory) {
      switch (category) {
        case 'data-collection':
          recommendations.push(`发现 ${count} 个数据收集相关违规，建议审查数据收集流程并确保获得适当的用户同意`);
          break;
        case 'data-processing':
          recommendations.push(`发现 ${count} 个数据处理相关违规，建议实施数据最小化原则和目的限制`);
          break;
        case 'data-storage':
          recommendations.push(`发现 ${count} 个数据存储相关违规，建议加强数据加密和访问控制`);
          break;
        case 'data-transfer':
          recommendations.push(`发现 ${count} 个数据传输相关违规，建议实施安全的数据传输机制`);
          break;
        case 'user-rights':
          recommendations.push(`发现 ${count} 个用户权利相关违规，建议实施完整的用户权利管理系统`);
          break;
        case 'consent':
          recommendations.push(`发现 ${count} 个同意管理相关违规，建议改进同意收集和管理机制`);
          break;
      }
    }

    return recommendations;
  }

  /**
   * 初始化默认合规规则
   */
  private initializeDefaultRules(): void {
    // GDPR 数据最小化原则
    this.registerRule({
      id: 'gdpr-data-minimization',
      name: 'GDPR 数据最小化',
      description: '检查是否只收集必要的个人数据',
      regulation: 'GDPR',
      severity: 'high',
      category: 'data-collection',
      checker: async (context: ComplianceContext) => {
        const findings: ComplianceResult['findings'] = [];
        let score = 100;

        // 检查数据模型中的敏感字段
        for (const model of context.dataModels) {
          const sensitiveFields = model.fields.filter(f => f.sensitive || f.pii);
          const totalFields = model.fields.length;
          
          if (sensitiveFields.length / totalFields > 0.5) {
            findings.push({
              type: 'warning',
              message: `模型 ${model.name} 包含过多敏感字段 (${sensitiveFields.length}/${totalFields})`,
              suggestion: '考虑是否所有敏感字段都是必需的，实施数据最小化原则'
            });
            score -= 20;
          }
        }

        return {
          ruleId: 'gdpr-data-minimization',
          passed: findings.length === 0,
          findings,
          score: Math.max(0, score)
        };
      }
    });

    // 数据加密检查
    this.registerRule({
      id: 'encryption-at-rest',
      name: '静态数据加密',
      description: '检查敏感数据是否在存储时加密',
      regulation: 'GDPR',
      severity: 'critical',
      category: 'data-storage',
      checker: async (context: ComplianceContext) => {
        const findings: ComplianceResult['findings'] = [];
        let score = 100;

        // 检查配置中的加密设置
        const encryptionSettings = context.configuration.encryptionSettings;
        
        for (const model of context.dataModels) {
          const sensitiveFields = model.fields.filter(f => f.sensitive || f.pii);
          
          for (const field of sensitiveFields) {
            const encryptionKey = `${model.name}.${field.name}`;
            if (!encryptionSettings[encryptionKey]) {
              findings.push({
                type: 'violation',
                message: `敏感字段 ${model.name}.${field.name} 未启用加密`,
                suggestion: '为所有敏感数据字段启用静态加密'
              });
              score -= 25;
            }
          }
        }

        return {
          ruleId: 'encryption-at-rest',
          passed: findings.length === 0,
          findings,
          score: Math.max(0, score)
        };
      }
    });

    // 用户同意检查
    this.registerRule({
      id: 'user-consent',
      name: '用户同意管理',
      description: '检查是否正确收集和管理用户同意',
      regulation: 'GDPR',
      severity: 'high',
      category: 'consent',
      checker: async (context: ComplianceContext) => {
        const findings: ComplianceResult['findings'] = [];
        let score = 100;

        // 检查API端点是否需要同意
        for (const endpoint of context.apiEndpoints) {
          if (endpoint.collectsPersonalData && !endpoint.requiresConsent) {
            findings.push({
              type: 'violation',
              message: `API端点 ${endpoint.method} ${endpoint.path} 收集个人数据但未要求用户同意`,
              suggestion: '为收集个人数据的API端点实施同意检查机制'
            });
            score -= 30;
          }
        }

        // 检查代码中是否有同意管理逻辑
        const hasConsentManagement = context.codebase.files.some(file => 
          file.content.includes('consent') || 
          file.content.includes('agreement') ||
          file.content.includes('permission')
        );

        if (!hasConsentManagement) {
          findings.push({
            type: 'warning',
            message: '代码库中未发现同意管理相关代码',
            suggestion: '实施完整的用户同意收集和管理系统'
          });
          score -= 20;
        }

        return {
          ruleId: 'user-consent',
          passed: findings.length === 0,
          findings,
          score: Math.max(0, score)
        };
      }
    });

    // 数据保留期限检查
    this.registerRule({
      id: 'data-retention',
      name: '数据保留期限',
      description: '检查是否设置了适当的数据保留期限',
      regulation: 'GDPR',
      severity: 'medium',
      category: 'data-storage',
      checker: async (context: ComplianceContext) => {
        const findings: ComplianceResult['findings'] = [];
        let score = 100;

        const retentionPeriods = context.configuration.dataRetentionPeriods;

        for (const model of context.dataModels) {
          if (!retentionPeriods[model.name]) {
            findings.push({
              type: 'warning',
              message: `模型 ${model.name} 未设置数据保留期限`,
              suggestion: '为所有包含个人数据的模型设置适当的保留期限'
            });
            score -= 15;
          } else {
            const retentionDays = retentionPeriods[model.name];
            // 检查保留期限是否过长（超过7年）
            if (retentionDays > 2555) { // 7年
              findings.push({
                type: 'warning',
                message: `模型 ${model.name} 的数据保留期限过长 (${retentionDays} 天)`,
                suggestion: '考虑缩短数据保留期限，仅保留业务必需的时间'
              });
              score -= 10;
            }
          }
        }

        return {
          ruleId: 'data-retention',
          passed: findings.filter(f => f.type === 'violation').length === 0,
          findings,
          score: Math.max(0, score)
        };
      }
    });

    // 审计日志检查
    this.registerRule({
      id: 'audit-logging',
      name: '审计日志',
      description: '检查是否启用了适当的审计日志记录',
      regulation: 'GDPR',
      severity: 'medium',
      category: 'data-processing',
      checker: async (context: ComplianceContext) => {
        const findings: ComplianceResult['findings'] = [];
        let score = 100;

        if (!context.configuration.auditingEnabled) {
          findings.push({
            type: 'violation',
            message: '系统未启用审计日志记录',
            suggestion: '启用审计日志以跟踪个人数据的访问和处理'
          });
          score -= 40;
        }

        // 检查代码中是否有审计日志相关代码
        const hasAuditLogging = context.codebase.files.some(file => 
          file.content.includes('audit') || 
          file.content.includes('log') ||
          file.content.includes('track')
        );

        if (!hasAuditLogging) {
          findings.push({
            type: 'warning',
            message: '代码库中未发现审计日志相关代码',
            suggestion: '实施全面的审计日志记录机制'
          });
          score -= 20;
        }

        return {
          ruleId: 'audit-logging',
          passed: findings.filter(f => f.type === 'violation').length === 0,
          findings,
          score: Math.max(0, score)
        };
      }
    });

    // 数据传输安全检查
    this.registerRule({
      id: 'secure-data-transfer',
      name: '安全数据传输',
      description: '检查数据传输是否使用安全协议',
      regulation: 'GDPR',
      severity: 'high',
      category: 'data-transfer',
      checker: async (context: ComplianceContext) => {
        const findings: ComplianceResult['findings'] = [];
        let score = 100;

        // 检查代码中是否有不安全的HTTP请求
        for (const file of context.codebase.files) {
          const lines = file.content.split('\n');
          
          for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            
            // 检查HTTP URL（非HTTPS）
            if (line.includes('http://') && !line.includes('localhost') && !line.includes('127.0.0.1')) {
              findings.push({
                type: 'violation',
                message: '发现不安全的HTTP连接',
                location: {
                  file: file.path,
                  line: i + 1
                },
                suggestion: '使用HTTPS协议进行所有数据传输'
              });
              score -= 25;
            }
            
            // 检查未加密的数据库连接
            if (line.includes('sslmode=disable') || line.includes('ssl=false')) {
              findings.push({
                type: 'violation',
                message: '发现未加密的数据库连接',
                location: {
                  file: file.path,
                  line: i + 1
                },
                suggestion: '启用数据库连接的SSL/TLS加密'
              });
              score -= 30;
            }
          }
        }

        return {
          ruleId: 'secure-data-transfer',
          passed: findings.length === 0,
          findings,
          score: Math.max(0, score)
        };
      }
    });

    // 用户权利实施检查
    this.registerRule({
      id: 'user-rights-implementation',
      name: '用户权利实施',
      description: '检查是否实施了GDPR要求的用户权利',
      regulation: 'GDPR',
      severity: 'high',
      category: 'user-rights',
      checker: async (context: ComplianceContext) => {
        const findings: ComplianceResult['findings'] = [];
        let score = 100;

        const requiredRights = [
          'access', // 访问权
          'rectification', // 更正权
          'erasure', // 删除权
          'portability', // 数据可携权
          'restriction' // 限制处理权
        ];

        const implementedRights: string[] = [];

        // 检查API端点是否实现了用户权利
        for (const endpoint of context.apiEndpoints) {
          for (const right of requiredRights) {
            if (endpoint.path.includes(right) || endpoint.path.includes('user-data')) {
              if (!implementedRights.includes(right)) {
                implementedRights.push(right);
              }
            }
          }
        }

        // 检查代码中是否有用户权利相关实现
        for (const file of context.codebase.files) {
          for (const right of requiredRights) {
            if (file.content.includes(right) && !implementedRights.includes(right)) {
              implementedRights.push(right);
            }
          }
        }

        const missingRights = requiredRights.filter(right => !implementedRights.includes(right));

        for (const right of missingRights) {
          findings.push({
            type: 'violation',
            message: `未实施用户${right}权利`,
            suggestion: `实施GDPR要求的用户${right}权利功能`
          });
          score -= 20;
        }

        return {
          ruleId: 'user-rights-implementation',
          passed: findings.length === 0,
          findings,
          score: Math.max(0, score)
        };
      }
    });
  }

  /**
   * 生成合规报告文本
   */
  generateComplianceReportText(report: ComplianceReport): string {
    let text = `隐私合规检查报告\n`;
    text += `====================\n`;
    text += `检查时间: ${report.timestamp.toISOString()}\n`;
    text += `总体评分: ${report.overallScore}/100\n`;
    text += `总规则数: ${report.totalRules}\n`;
    text += `通过规则: ${report.passedRules}\n`;
    text += `失败规则: ${report.failedRules}\n`;
    text += `严重违规: ${report.criticalViolations}\n`;
    text += `高级违规: ${report.highViolations}\n`;
    text += `中级违规: ${report.mediumViolations}\n`;
    text += `低级违规: ${report.lowViolations}\n\n`;

    if (report.results.some(r => !r.passed)) {
      text += `违规详情:\n`;
      text += `----------\n`;
      
      for (const result of report.results) {
        if (!result.passed) {
          const rule = this.rules.get(result.ruleId);
          text += `规则: ${rule?.name || result.ruleId}\n`;
          text += `评分: ${result.score}/100\n`;
          
          for (const finding of result.findings) {
            text += `  ${finding.type.toUpperCase()}: ${finding.message}\n`;
            if (finding.location) {
              text += `    位置: ${finding.location.file}`;
              if (finding.location.line) {
                text += `:${finding.location.line}`;
              }
              text += `\n`;
            }
            if (finding.suggestion) {
              text += `    建议: ${finding.suggestion}\n`;
            }
          }
          text += `\n`;
        }
      }
    }

    if (report.recommendations.length > 0) {
      text += `改进建议:\n`;
      text += `----------\n`;
      for (const recommendation of report.recommendations) {
        text += `- ${recommendation}\n`;
      }
    }

    return text;
  }

  /**
   * 获取所有注册的规则
   */
  getRegisteredRules(): ComplianceRule[] {
    return Array.from(this.rules.values());
  }

  /**
   * 清理检查器
   */
  cleanup(): void {
    // 保留默认规则，只清理自定义规则
    const defaultRuleIds = [
      'gdpr-data-minimization',
      'encryption-at-rest',
      'user-consent',
      'data-retention',
      'audit-logging',
      'secure-data-transfer',
      'user-rights-implementation'
    ];

    for (const [id] of this.rules) {
      if (!defaultRuleIds.includes(id)) {
        this.rules.delete(id);
      }
    }
  }
}