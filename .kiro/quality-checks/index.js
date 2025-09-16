/**
 * 自动化质量检查系统 - 主入口
 * 集成代码质量检查工具，实现质量指标收集和分析
 */

const CodeQualityMonitor = require('./code-quality-monitor');
const FunctionalValidator = require('./functional-validator');
const IntelligentWarningSystem = require('./intelligent-warning-system');
const QualityReporter = require('./quality-reporter');

class QualityCheckSystem {
  constructor(config = {}) {
    this.config = {
      enableCodeQuality: true,
      enableFunctionalValidation: true,
      enableIntelligentWarnings: true,
      reportingEnabled: true,
      ...config
    };

    this.codeQualityMonitor = new CodeQualityMonitor(this.config);
    this.functionalValidator = new FunctionalValidator(this.config);
    this.warningSystem = new IntelligentWarningSystem(this.config);
    this.reporter = new QualityReporter(this.config);
  }

  /**
   * 运行完整的质量检查
   */
  async runFullQualityCheck(options = {}) {
    const results = {
      timestamp: new Date().toISOString(),
      overallStatus: 'passed',
      checks: {}
    };

    try {
      // 1. 代码质量检查
      if (this.config.enableCodeQuality) {
        console.log('🔍 Running code quality checks...');
        results.checks.codeQuality = await this.codeQualityMonitor.runQualityChecks();
      }

      // 2. 功能完整性验证
      if (this.config.enableFunctionalValidation) {
        console.log('🧪 Running functional validation...');
        results.checks.functionalValidation = await this.functionalValidator.validateFunctionality();
      }

      // 3. 智能问题预警
      if (this.config.enableIntelligentWarnings) {
        console.log('⚠️  Running intelligent warning analysis...');
        results.checks.intelligentWarnings = await this.warningSystem.analyzeForWarnings(results.checks);
      }

      // 确定整体状态
      results.overallStatus = this._determineOverallStatus(results.checks);

      // 生成报告
      if (this.config.reportingEnabled) {
        await this.reporter.generateQualityReport(results);
      }

      return results;
    } catch (error) {
      console.error('❌ Quality check system error:', error);
      results.overallStatus = 'error';
      results.error = error.message;
      return results;
    }
  }

  /**
   * 运行预提交质量检查
   */
  async runPreCommitChecks() {
    console.log('🚀 Running pre-commit quality checks...');
    
    const results = await this.runFullQualityCheck({
      mode: 'pre-commit',
      failFast: true
    });

    if (results.overallStatus === 'failed' || results.overallStatus === 'error') {
      console.error('❌ Pre-commit checks failed. Commit blocked.');
      process.exit(1);
    }

    console.log('✅ Pre-commit checks passed.');
    return results;
  }

  /**
   * 确定整体状态
   */
  _determineOverallStatus(checks) {
    const statuses = Object.values(checks).map(check => check.status);
    
    if (statuses.includes('failed') || statuses.includes('error')) {
      return 'failed';
    }
    
    if (statuses.includes('warning')) {
      return 'warning';
    }
    
    return 'passed';
  }
}

module.exports = QualityCheckSystem;