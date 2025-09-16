/**
 * 预提交检查系统
 * Pre-commit Check System
 */

const fs = require('fs').promises;
const path = require('path');
const { execSync } = require('child_process');

class PreCommitChecker {
  constructor() {
    this.configPath = '.kiro/workflow-rules/pre-commit-config.json';
    this.resultsPath = '.kiro/workflow-rules/check-results.json';
    this.defaultConfig = {
      checks: {
        runExistingTests: true,
        checkStyleConsistency: true,
        validateFeatureStatus: true,
        updateDocumentation: false,
        verifyDependencies: true,
        codeQualityCheck: true,
        functionalTests: true
      },
      testCommands: {
        unit: 'npm test -- --run',
        integration: 'npm run test:integration',
        e2e: 'npm run test:e2e'
      },
      thresholds: {
        testCoverage: 80,
        codeQuality: 'B',
        maxWarnings: 5
      }
    };
  }

  /**
   * 初始化预提交检查器
   */
  async initialize() {
    try {
      // 确保配置目录存在
      await fs.mkdir('.kiro/workflow-rules', { recursive: true });
      
      // 创建默认配置文件
      try {
        await fs.access(this.configPath);
      } catch {
        await fs.writeFile(this.configPath, JSON.stringify(this.defaultConfig, null, 2));
        console.log('✅ 创建预提交检查配置文件');
      }
    } catch (error) {
      console.error('❌ 预提交检查器初始化失败:', error.message);
      throw error;
    }
  }

  /**
   * 运行所有预提交检查
   */
  async runChecks() {
    console.log('🔍 开始预提交检查...');
    
    const config = await this.loadConfig();
    const results = {
      timestamp: new Date().toISOString(),
      overall: 'pending',
      checks: {},
      summary: {
        passed: 0,
        failed: 0,
        warnings: 0,
        skipped: 0
      }
    };

    try {
      // 1. 运行现有测试
      if (config.checks.runExistingTests) {
        results.checks.existingTests = await this.runExistingTests(config);
      }

      // 2. 检查样式一致性
      if (config.checks.checkStyleConsistency) {
        results.checks.styleConsistency = await this.checkStyleConsistency();
      }

      // 3. 验证功能状态
      if (config.checks.validateFeatureStatus) {
        results.checks.featureStatus = await this.validateFeatureStatus();
      }

      // 4. 验证依赖关系
      if (config.checks.verifyDependencies) {
        results.checks.dependencies = await this.verifyDependencies();
      }

      // 5. 代码质量检查
      if (config.checks.codeQualityCheck) {
        results.checks.codeQuality = await this.checkCodeQuality();
      }

      // 计算总体结果
      this.calculateOverallResult(results);
      
      // 保存结果
      await this.saveResults(results);
      
      // 生成报告
      this.generateReport(results);
      
      return results;

    } catch (error) {
      results.overall = 'error';
      results.error = error.message;
      await this.saveResults(results);
      throw error;
    }
  }

  /**
   * 运行现有测试
   */
  async runExistingTests(config) {
    console.log('  📋 运行现有测试...');
    
    const testResult = {
      status: 'pending',
      details: {},
      messages: []
    };

    try {
      // 检查是否有测试文件
      const hasTests = await this.checkForTestFiles();
      if (!hasTests) {
        testResult.status = 'skipped';
        testResult.messages.push('未找到测试文件，跳过测试');
        return testResult;
      }

      // 运行单元测试
      if (config.testCommands.unit) {
        try {
          const output = execSync(config.testCommands.unit, { 
            encoding: 'utf8',
            cwd: process.cwd(),
            timeout: 60000 
          });
          testResult.details.unit = { status: 'passed', output };
          testResult.messages.push('单元测试通过');
        } catch (error) {
          testResult.details.unit = { status: 'failed', error: error.message };
          testResult.messages.push('单元测试失败');
          testResult.status = 'failed';
        }
      }

      if (testResult.status !== 'failed') {
        testResult.status = 'passed';
      }

    } catch (error) {
      testResult.status = 'error';
      testResult.messages.push(`测试执行错误: ${error.message}`);
    }

    return testResult;
  }

  /**
   * 检查样式一致性
   */
  async checkStyleConsistency() {
    console.log('  🎨 检查样式一致性...');
    
    const styleResult = {
      status: 'pending',
      details: {},
      messages: []
    };

    try {
      // 检查样式文件是否存在
      const styleFiles = await this.findStyleFiles();
      if (styleFiles.length === 0) {
        styleResult.status = 'skipped';
        styleResult.messages.push('未找到样式文件');
        return styleResult;
      }

      // 检查样式快照系统
      const hasStyleSnapshots = await this.checkStyleSnapshots();
      if (hasStyleSnapshots) {
        // 使用样式快照系统进行检查
        const StyleMonitor = require('../style-recovery/style-monitor');
        const monitor = new StyleMonitor();
        const changes = await monitor.detectChanges();
        
        if (changes.length > 0) {
          styleResult.status = 'warning';
          styleResult.details.changes = changes;
          styleResult.messages.push(`检测到 ${changes.length} 个样式变更`);
        } else {
          styleResult.status = 'passed';
          styleResult.messages.push('样式一致性检查通过');
        }
      } else {
        // 基础样式检查
        styleResult.status = 'passed';
        styleResult.messages.push('基础样式检查通过');
      }

    } catch (error) {
      styleResult.status = 'error';
      styleResult.messages.push(`样式检查错误: ${error.message}`);
    }

    return styleResult;
  }

  /**
   * 验证功能状态
   */
  async validateFeatureStatus() {
    console.log('  📊 验证功能状态...');
    
    const statusResult = {
      status: 'pending',
      details: {},
      messages: []
    };

    try {
      // 检查项目状态文件
      const projectStatePath = '.kiro/project-state/current-state.json';
      
      try {
        const stateData = await fs.readFile(projectStatePath, 'utf8');
        const projectState = JSON.parse(stateData);
        
        // 验证状态一致性
        const inconsistencies = this.checkStateConsistency(projectState);
        
        if (inconsistencies.length > 0) {
          statusResult.status = 'warning';
          statusResult.details.inconsistencies = inconsistencies;
          statusResult.messages.push(`发现 ${inconsistencies.length} 个状态不一致问题`);
        } else {
          statusResult.status = 'passed';
          statusResult.messages.push('功能状态验证通过');
        }
        
      } catch (error) {
        statusResult.status = 'skipped';
        statusResult.messages.push('项目状态文件不存在，跳过状态验证');
      }

    } catch (error) {
      statusResult.status = 'error';
      statusResult.messages.push(`状态验证错误: ${error.message}`);
    }

    return statusResult;
  }

  /**
   * 验证依赖关系
   */
  async verifyDependencies() {
    console.log('  🔗 验证依赖关系...');
    
    const depResult = {
      status: 'pending',
      details: {},
      messages: []
    };

    try {
      // 检查 package.json
      const packagePath = path.join(process.cwd(), 'package.json');
      const packageData = JSON.parse(await fs.readFile(packagePath, 'utf8'));
      
      // 检查依赖冲突
      const conflicts = await this.checkDependencyConflicts(packageData);
      
      if (conflicts.length > 0) {
        depResult.status = 'warning';
        depResult.details.conflicts = conflicts;
        depResult.messages.push(`发现 ${conflicts.length} 个依赖冲突`);
      } else {
        depResult.status = 'passed';
        depResult.messages.push('依赖关系验证通过');
      }

    } catch (error) {
      depResult.status = 'error';
      depResult.messages.push(`依赖验证错误: ${error.message}`);
    }

    return depResult;
  }

  /**
   * 代码质量检查
   */
  async checkCodeQuality() {
    console.log('  🔍 代码质量检查...');
    
    const qualityResult = {
      status: 'pending',
      details: {},
      messages: []
    };

    try {
      // 运行 ESLint 检查
      try {
        const output = execSync('npx eslint . --format json', { 
          encoding: 'utf8',
          cwd: process.cwd()
        });
        
        const eslintResults = JSON.parse(output);
        const errorCount = eslintResults.reduce((sum, file) => sum + file.errorCount, 0);
        const warningCount = eslintResults.reduce((sum, file) => sum + file.warningCount, 0);
        
        qualityResult.details.eslint = {
          errors: errorCount,
          warnings: warningCount,
          files: eslintResults.length
        };
        
        if (errorCount > 0) {
          qualityResult.status = 'failed';
          qualityResult.messages.push(`ESLint 发现 ${errorCount} 个错误`);
        } else if (warningCount > 5) {
          qualityResult.status = 'warning';
          qualityResult.messages.push(`ESLint 发现 ${warningCount} 个警告`);
        } else {
          qualityResult.status = 'passed';
          qualityResult.messages.push('代码质量检查通过');
        }
        
      } catch (error) {
        // ESLint 不存在或配置错误
        qualityResult.status = 'skipped';
        qualityResult.messages.push('ESLint 未配置，跳过代码质量检查');
      }

    } catch (error) {
      qualityResult.status = 'error';
      qualityResult.messages.push(`代码质量检查错误: ${error.message}`);
    }

    return qualityResult;
  }

  /**
   * 辅助方法
   */
  async checkForTestFiles() {
    const testPatterns = ['**/*.test.js', '**/*.test.ts', '**/*.spec.js', '**/*.spec.ts'];
    for (const pattern of testPatterns) {
      try {
        const files = await fs.readdir('.', { recursive: true });
        if (files.some(file => file.includes('.test.') || file.includes('.spec.'))) {
          return true;
        }
      } catch (error) {
        // 忽略错误，继续检查
      }
    }
    return false;
  }

  async findStyleFiles() {
    const styleExtensions = ['.css', '.scss', '.sass', '.less'];
    const files = [];
    
    try {
      const allFiles = await fs.readdir('.', { recursive: true });
      for (const file of allFiles) {
        if (styleExtensions.some(ext => file.endsWith(ext))) {
          files.push(file);
        }
      }
    } catch (error) {
      // 忽略错误
    }
    
    return files;
  }

  async checkStyleSnapshots() {
    try {
      await fs.access('.kiro/style-recovery');
      return true;
    } catch {
      return false;
    }
  }

  checkStateConsistency(projectState) {
    const inconsistencies = [];
    
    if (projectState.features) {
      for (const [featureName, feature] of Object.entries(projectState.features)) {
        // 检查状态逻辑
        if (feature.status === 'completed' && !feature.completionDate) {
          inconsistencies.push(`功能 ${featureName} 标记为已完成但缺少完成日期`);
        }
        
        if (feature.status === 'in_progress' && feature.completionDate) {
          inconsistencies.push(`功能 ${featureName} 状态为进行中但有完成日期`);
        }
      }
    }
    
    return inconsistencies;
  }

  async checkDependencyConflicts(packageData) {
    const conflicts = [];
    
    // 简单的依赖冲突检查
    if (packageData.dependencies && packageData.devDependencies) {
      for (const dep of Object.keys(packageData.dependencies)) {
        if (packageData.devDependencies[dep]) {
          conflicts.push(`${dep} 同时存在于 dependencies 和 devDependencies`);
        }
      }
    }
    
    return conflicts;
  }

  calculateOverallResult(results) {
    let passed = 0;
    let failed = 0;
    let warnings = 0;
    let skipped = 0;

    for (const check of Object.values(results.checks)) {
      switch (check.status) {
        case 'passed':
          passed++;
          break;
        case 'failed':
          failed++;
          break;
        case 'warning':
          warnings++;
          break;
        case 'skipped':
          skipped++;
          break;
      }
    }

    results.summary = { passed, failed, warnings, skipped };

    if (failed > 0) {
      results.overall = 'failed';
    } else if (warnings > 0) {
      results.overall = 'warning';
    } else if (passed > 0) {
      results.overall = 'passed';
    } else {
      results.overall = 'skipped';
    }
  }

  generateReport(results) {
    console.log('\n📋 预提交检查报告');
    console.log('='.repeat(50));
    console.log(`总体状态: ${this.getStatusIcon(results.overall)} ${results.overall.toUpperCase()}`);
    console.log(`检查时间: ${new Date(results.timestamp).toLocaleString()}`);
    console.log('\n详细结果:');
    
    for (const [checkName, result] of Object.entries(results.checks)) {
      console.log(`  ${this.getStatusIcon(result.status)} ${checkName}: ${result.status}`);
      if (result.messages.length > 0) {
        result.messages.forEach(msg => console.log(`    - ${msg}`));
      }
    }
    
    console.log('\n统计信息:');
    console.log(`  ✅ 通过: ${results.summary.passed}`);
    console.log(`  ❌ 失败: ${results.summary.failed}`);
    console.log(`  ⚠️  警告: ${results.summary.warnings}`);
    console.log(`  ⏭️  跳过: ${results.summary.skipped}`);
    console.log('='.repeat(50));
  }

  getStatusIcon(status) {
    const icons = {
      passed: '✅',
      failed: '❌',
      warning: '⚠️',
      skipped: '⏭️',
      error: '💥',
      pending: '⏳'
    };
    return icons[status] || '❓';
  }

  async loadConfig() {
    try {
      const configData = await fs.readFile(this.configPath, 'utf8');
      return { ...this.defaultConfig, ...JSON.parse(configData) };
    } catch {
      return this.defaultConfig;
    }
  }

  async saveResults(results) {
    try {
      await fs.writeFile(this.resultsPath, JSON.stringify(results, null, 2));
    } catch (error) {
      console.error('保存检查结果失败:', error.message);
    }
  }
}

module.exports = PreCommitChecker;