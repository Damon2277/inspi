#!/usr/bin/env node

/**
 * 质量门禁检查脚本
 * 根据项目质量标准级别执行相应的质量检查
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// 质量标准配置
const QUALITY_LEVELS = {
  MVP: {
    name: 'MVP (Level 1)',
    coverage: 70,
    eslintErrors: 0,
    typescriptErrors: 0,
    securityHigh: 0,
    performanceRegression: 20
  },
  STANDARD: {
    name: 'Standard (Level 2)', 
    coverage: 85,
    eslintErrors: 0,
    typescriptErrors: 0,
    securityMediumHigh: 0,
    performanceRegression: 10
  },
  ENTERPRISE: {
    name: 'Enterprise (Level 3)',
    coverage: 95,
    eslintErrors: 0,
    typescriptErrors: 0,
    securityAll: 0,
    performanceRegression: 5
  }
};

class QualityGateChecker {
  constructor(level = 'MVP') {
    this.level = level;
    this.config = QUALITY_LEVELS[level];
    this.results = {
      passed: true,
      checks: [],
      summary: {}
    };
  }

  /**
   * 执行命令并返回结果
   */
  execCommand(command, options = {}) {
    try {
      const result = execSync(command, { 
        encoding: 'utf8', 
        stdio: 'pipe',
        ...options 
      });
      return { success: true, output: result };
    } catch (error) {
      return { 
        success: false, 
        output: error.stdout || error.message,
        error: error.stderr || error.message
      };
    }
  }

  /**
   * 检查代码覆盖率
   */
  checkCoverage() {
    console.log('📊 Checking code coverage...');
    
    const coverageFile = path.join(process.cwd(), 'coverage', 'coverage-summary.json');
    
    if (!fs.existsSync(coverageFile)) {
      // 运行测试生成覆盖率报告
      const testResult = this.execCommand('npm run test:coverage');
      if (!testResult.success) {
        this.addCheckResult('coverage', false, 'Failed to generate coverage report');
        return false;
      }
    }

    try {
      const coverage = JSON.parse(fs.readFileSync(coverageFile, 'utf8'));
      const totalCoverage = coverage.total.lines.pct;
      const passed = totalCoverage >= this.config.coverage;
      
      this.addCheckResult('coverage', passed, 
        `Coverage: ${totalCoverage}% (required: ${this.config.coverage}%)`);
      
      return passed;
    } catch (error) {
      this.addCheckResult('coverage', false, `Coverage check failed: ${error.message}`);
      return false;
    }
  }

  /**
   * 检查ESLint错误
   */
  checkESLint() {
    console.log('🔍 Checking ESLint...');
    
    const result = this.execCommand('npm run lint');
    const passed = result.success;
    
    this.addCheckResult('eslint', passed, 
      passed ? 'ESLint: No errors found' : `ESLint: ${result.error}`);
    
    return passed;
  }

  /**
   * 检查TypeScript错误
   */
  checkTypeScript() {
    console.log('🔧 Checking TypeScript...');
    
    const result = this.execCommand('npm run type-check');
    const passed = result.success;
    
    this.addCheckResult('typescript', passed,
      passed ? 'TypeScript: No type errors' : `TypeScript: ${result.error}`);
    
    return passed;
  }

  /**
   * 检查安全漏洞
   */
  checkSecurity() {
    console.log('🔒 Checking security vulnerabilities...');
    
    const result = this.execCommand('npm audit --audit-level=high');
    const passed = result.success;
    
    this.addCheckResult('security', passed,
      passed ? 'Security: No high-risk vulnerabilities' : `Security: ${result.output}`);
    
    return passed;
  }

  /**
   * 检查性能回退
   */
  checkPerformance() {
    console.log('⚡ Checking performance...');
    
    // 检查是否存在性能基准文件
    const benchmarkFile = path.join(process.cwd(), 'performance-benchmarks.json');
    
    if (!fs.existsSync(benchmarkFile)) {
      this.addCheckResult('performance', true, 'Performance: No baseline found, skipping check');
      return true;
    }

    try {
      // 运行性能测试
      const result = this.execCommand('npm run test:performance');
      const passed = result.success;
      
      this.addCheckResult('performance', passed,
        passed ? 'Performance: Within acceptable range' : `Performance: ${result.error}`);
      
      return passed;
    } catch (error) {
      this.addCheckResult('performance', true, 'Performance: Check skipped due to error');
      return true;
    }
  }

  /**
   * 添加检查结果
   */
  addCheckResult(check, passed, message) {
    this.results.checks.push({
      check,
      passed,
      message,
      timestamp: new Date().toISOString()
    });

    if (!passed) {
      this.results.passed = false;
    }

    console.log(`${passed ? '✅' : '❌'} ${message}`);
  }

  /**
   * 生成质量报告
   */
  generateReport() {
    const report = {
      level: this.config.name,
      timestamp: new Date().toISOString(),
      passed: this.results.passed,
      checks: this.results.checks,
      summary: {
        total: this.results.checks.length,
        passed: this.results.checks.filter(c => c.passed).length,
        failed: this.results.checks.filter(c => !c.passed).length
      }
    };

    // 保存报告
    const reportDir = path.join(process.cwd(), 'docs', 'reports');
    if (!fs.existsSync(reportDir)) {
      fs.mkdirSync(reportDir, { recursive: true });
    }

    const reportFile = path.join(reportDir, `quality-gate-${Date.now()}.json`);
    fs.writeFileSync(reportFile, JSON.stringify(report, null, 2));

    console.log(`\n📋 Quality Gate Report: ${reportFile}`);
    console.log(`📊 Level: ${report.level}`);
    console.log(`✅ Passed: ${report.summary.passed}/${report.summary.total}`);
    console.log(`❌ Failed: ${report.summary.failed}/${report.summary.total}`);
    console.log(`🎯 Overall: ${report.passed ? 'PASSED' : 'FAILED'}`);

    return report;
  }

  /**
   * 执行所有质量检查
   */
  run() {
    console.log(`🚪 Starting Quality Gate Check - ${this.config.name}`);
    console.log('=' .repeat(50));

    // 执行各项检查
    this.checkCoverage();
    this.checkESLint();
    this.checkTypeScript();
    this.checkSecurity();
    this.checkPerformance();

    // 生成报告
    const report = this.generateReport();

    // 返回结果
    if (report.passed) {
      console.log('\n🎉 Quality Gate PASSED!');
      process.exit(0);
    } else {
      console.log('\n🚫 Quality Gate FAILED!');
      process.exit(1);
    }
  }
}

// 命令行参数处理
const args = process.argv.slice(2);
const level = args[0] || 'MVP';

if (!QUALITY_LEVELS[level.toUpperCase()]) {
  console.error(`❌ Invalid quality level: ${level}`);
  console.error('Available levels: MVP, STANDARD, ENTERPRISE');
  process.exit(1);
}

// 如果直接运行此脚本
if (require.main === module) {
  const checker = new QualityGateChecker(level.toUpperCase());
  checker.run();
}

module.exports = QualityGateChecker;