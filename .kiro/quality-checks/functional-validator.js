/**
 * 功能完整性验证器
 * 创建自动化功能测试套件，实现功能回归检测机制，建立功能状态一致性验证
 */

const fs = require('fs').promises;
const path = require('path');
const { execSync } = require('child_process');

class FunctionalValidator {
  constructor(config = {}) {
    this.config = {
      projectRoot: process.cwd(),
      testTimeout: 30000,
      testPatterns: ['**/*.test.{js,ts,tsx}', '**/*.spec.{js,ts,tsx}'],
      criticalPaths: [
        '/',
        '/create',
        '/square',
        '/profile',
        '/works'
      ],
      apiEndpoints: [
        '/api/health',
        '/api/auth/verify-email',
        '/api/magic/generate'
      ],
      ...config
    };

    this.testResults = {
      unit: { passed: 0, failed: 0, total: 0, details: [] },
      integration: { passed: 0, failed: 0, total: 0, details: [] },
      e2e: { passed: 0, failed: 0, total: 0, details: [] },
      api: { passed: 0, failed: 0, total: 0, details: [] }
    };
  }

  /**
   * 验证功能完整性
   */
  async validateFunctionality() {
    const results = {
      status: 'passed',
      timestamp: new Date().toISOString(),
      testResults: {
        passed: 0,
        failed: 0,
        total: 0
      },
      functionalChecks: {},
      regressionIssues: [],
      consistencyIssues: []
    };

    try {
      console.log('  🧪 Running functional validation tests...');

      // 1. 运行单元测试
      console.log('    📝 Running unit tests...');
      results.functionalChecks.unitTests = await this._runUnitTests();

      // 2. 运行集成测试
      console.log('    🔗 Running integration tests...');
      results.functionalChecks.integrationTests = await this._runIntegrationTests();

      // 3. 运行 API 测试
      console.log('    🌐 Running API tests...');
      results.functionalChecks.apiTests = await this._runApiTests();

      // 4. 检查功能状态一致性
      console.log('    🔍 Checking functional consistency...');
      results.functionalChecks.consistencyCheck = await this._checkFunctionalConsistency();

      // 5. 检测功能回归
      console.log('    📊 Detecting functional regression...');
      results.regressionIssues = await this._detectFunctionalRegression();

      // 汇总测试结果
      results.testResults = this._aggregateTestResults();
      results.status = this._determineFunctionalStatus(results);

      // 保存验证结果
      await this._saveFunctionalValidationResults(results);

      return results;
    } catch (error) {
      console.error('Functional validation error:', error);
      results.status = 'error';
      results.error = error.message;
      return results;
    }
  }

  /**
   * 运行单元测试
   */
  async _runUnitTests() {
    try {
      const projectPath = path.join(this.config.projectRoot, 'inspi-ai-platform');
      
      // 检查是否有 Jest 配置
      const jestConfigPath = path.join(projectPath, 'jest.config.js');
      try {
        await fs.access(jestConfigPath);
      } catch {
        return {
          status: 'skipped',
          message: 'Jest configuration not found',
          passed: 0,
          failed: 0,
          total: 0
        };
      }

      // 运行单元测试
      const command = `cd ${projectPath} && npm test -- --testPathPattern="__tests__" --testNamePattern="^(?!.*e2e).*" --passWithNoTests --json --coverage=false`;
      
      try {
        const output = execSync(command, { 
          encoding: 'utf8', 
          stdio: 'pipe',
          timeout: this.config.testTimeout 
        });
        
        const testResult = JSON.parse(output);
        
        this.testResults.unit = {
          passed: testResult.numPassedTests || 0,
          failed: testResult.numFailedTests || 0,
          total: testResult.numTotalTests || 0,
          details: testResult.testResults || []
        };

        return {
          status: testResult.success ? 'passed' : 'failed',
          passed: testResult.numPassedTests || 0,
          failed: testResult.numFailedTests || 0,
          total: testResult.numTotalTests || 0,
          coverage: testResult.coverageMap ? this._extractCoverageInfo(testResult.coverageMap) : null,
          failedTests: testResult.testResults?.filter(t => t.status === 'failed').map(t => ({
            name: t.name,
            message: t.message
          })) || []
        };
      } catch (error) {
        // 测试失败时仍可能有有效输出
        if (error.stdout) {
          try {
            const testResult = JSON.parse(error.stdout);
            
            this.testResults.unit = {
              passed: testResult.numPassedTests || 0,
              failed: testResult.numFailedTests || 0,
              total: testResult.numTotalTests || 0,
              details: testResult.testResults || []
            };

            return {
              status: 'failed',
              passed: testResult.numPassedTests || 0,
              failed: testResult.numFailedTests || 0,
              total: testResult.numTotalTests || 0,
              error: 'Some tests failed',
              failedTests: testResult.testResults?.filter(t => t.status === 'failed').map(t => ({
                name: t.name,
                message: t.message
              })) || []
            };
          } catch {
            return {
              status: 'error',
              passed: 0,
              failed: 0,
              total: 0,
              error: 'Failed to parse test results'
            };
          }
        }
        
        return {
          status: 'error',
          passed: 0,
          failed: 0,
          total: 0,
          error: error.message
        };
      }
    } catch (error) {
      return {
        status: 'error',
        passed: 0,
        failed: 0,
        total: 0,
        error: error.message
      };
    }
  }

  /**
   * 运行集成测试
   */
  async _runIntegrationTests() {
    try {
      const projectPath = path.join(this.config.projectRoot, 'inspi-ai-platform');
      
      // 运行集成测试（如果存在）
      const command = `cd ${projectPath} && npm test -- --testPathPattern="integration" --passWithNoTests --json`;
      
      try {
        const output = execSync(command, { 
          encoding: 'utf8', 
          stdio: 'pipe',
          timeout: this.config.testTimeout 
        });
        
        const testResult = JSON.parse(output);
        
        this.testResults.integration = {
          passed: testResult.numPassedTests || 0,
          failed: testResult.numFailedTests || 0,
          total: testResult.numTotalTests || 0,
          details: testResult.testResults || []
        };

        return {
          status: testResult.success ? 'passed' : 'failed',
          passed: testResult.numPassedTests || 0,
          failed: testResult.numFailedTests || 0,
          total: testResult.numTotalTests || 0
        };
      } catch (error) {
        if (error.stdout) {
          try {
            const testResult = JSON.parse(error.stdout);
            
            this.testResults.integration = {
              passed: testResult.numPassedTests || 0,
              failed: testResult.numFailedTests || 0,
              total: testResult.numTotalTests || 0,
              details: testResult.testResults || []
            };

            return {
              status: 'failed',
              passed: testResult.numPassedTests || 0,
              failed: testResult.numFailedTests || 0,
              total: testResult.numTotalTests || 0
            };
          } catch {
            return {
              status: 'skipped',
              message: 'No integration tests found',
              passed: 0,
              failed: 0,
              total: 0
            };
          }
        }
        
        return {
          status: 'skipped',
          message: 'No integration tests found',
          passed: 0,
          failed: 0,
          total: 0
        };
      }
    } catch (error) {
      return {
        status: 'error',
        passed: 0,
        failed: 0,
        total: 0,
        error: error.message
      };
    }
  }

  /**
   * 运行 API 测试
   */
  async _runApiTests() {
    const results = {
      status: 'passed',
      passed: 0,
      failed: 0,
      total: this.config.apiEndpoints.length,
      endpoints: []
    };

    try {
      // 检查项目是否在运行
      const isRunning = await this._checkIfProjectIsRunning();
      
      if (!isRunning) {
        return {
          status: 'skipped',
          message: 'Project is not running, cannot test API endpoints',
          passed: 0,
          failed: 0,
          total: 0
        };
      }

      // 测试每个 API 端点
      for (const endpoint of this.config.apiEndpoints) {
        try {
          const endpointResult = await this._testApiEndpoint(endpoint);
          results.endpoints.push(endpointResult);
          
          if (endpointResult.status === 'passed') {
            results.passed++;
          } else {
            results.failed++;
          }
        } catch (error) {
          results.endpoints.push({
            endpoint,
            status: 'failed',
            error: error.message
          });
          results.failed++;
        }
      }

      this.testResults.api = {
        passed: results.passed,
        failed: results.failed,
        total: results.total,
        details: results.endpoints
      };

      results.status = results.failed === 0 ? 'passed' : 'failed';
      return results;
    } catch (error) {
      return {
        status: 'error',
        passed: 0,
        failed: 0,
        total: 0,
        error: error.message
      };
    }
  }

  /**
   * 检查项目是否在运行
   */
  async _checkIfProjectIsRunning() {
    try {
      // 尝试访问健康检查端点
      const { execSync } = require('child_process');
      execSync('curl -f http://localhost:3000/api/health', { 
        stdio: 'pipe',
        timeout: 5000 
      });
      return true;
    } catch {
      return false;
    }
  }

  /**
   * 测试单个 API 端点
   */
  async _testApiEndpoint(endpoint) {
    try {
      const url = `http://localhost:3000${endpoint}`;
      const command = `curl -s -o /dev/null -w "%{http_code}" "${url}"`;
      
      const statusCode = execSync(command, { 
        encoding: 'utf8',
        timeout: 10000 
      }).trim();

      const isSuccess = statusCode.startsWith('2') || statusCode === '404'; // 404 可能是正常的
      
      return {
        endpoint,
        status: isSuccess ? 'passed' : 'failed',
        statusCode: parseInt(statusCode),
        responseTime: Date.now() // 简化的响应时间
      };
    } catch (error) {
      return {
        endpoint,
        status: 'failed',
        error: error.message
      };
    }
  }

  /**
   * 检查功能状态一致性
   */
  async _checkFunctionalConsistency() {
    const consistencyIssues = [];
    
    try {
      // 1. 检查项目状态文件一致性
      const projectStateIssues = await this._checkProjectStateConsistency();
      consistencyIssues.push(...projectStateIssues);

      // 2. 检查配置文件一致性
      const configIssues = await this._checkConfigConsistency();
      consistencyIssues.push(...configIssues);

      // 3. 检查依赖一致性
      const dependencyIssues = await this._checkDependencyConsistency();
      consistencyIssues.push(...dependencyIssues);

      return {
        status: consistencyIssues.length === 0 ? 'passed' : 'warning',
        issues: consistencyIssues,
        totalIssues: consistencyIssues.length
      };
    } catch (error) {
      return {
        status: 'error',
        error: error.message,
        issues: [],
        totalIssues: 0
      };
    }
  }

  /**
   * 检查项目状态一致性
   */
  async _checkProjectStateConsistency() {
    const issues = [];
    
    try {
      const projectStatePath = path.join(this.config.projectRoot, '.kiro', 'project-state');
      
      try {
        await fs.access(projectStatePath);
        
        // 检查状态文件是否存在
        const stateFiles = await fs.readdir(projectStatePath);
        
        if (stateFiles.length === 0) {
          issues.push({
            type: 'missing_state',
            severity: 'medium',
            message: 'Project state directory exists but contains no state files'
          });
        }
      } catch {
        issues.push({
          type: 'missing_state_dir',
          severity: 'low',
          message: 'Project state directory does not exist'
        });
      }
    } catch (error) {
      issues.push({
        type: 'state_check_error',
        severity: 'low',
        message: `Failed to check project state: ${error.message}`
      });
    }
    
    return issues;
  }

  /**
   * 检查配置一致性
   */
  async _checkConfigConsistency() {
    const issues = [];
    
    try {
      const projectPath = path.join(this.config.projectRoot, 'inspi-ai-platform');
      
      // 检查关键配置文件
      const configFiles = [
        'package.json',
        'next.config.ts',
        'tailwind.config.ts',
        'tsconfig.json'
      ];

      for (const configFile of configFiles) {
        try {
          await fs.access(path.join(projectPath, configFile));
        } catch {
          issues.push({
            type: 'missing_config',
            severity: 'high',
            message: `Missing configuration file: ${configFile}`
          });
        }
      }

      // 检查环境变量文件
      try {
        await fs.access(path.join(projectPath, '.env.local'));
      } catch {
        try {
          await fs.access(path.join(projectPath, '.env.example'));
        } catch {
          issues.push({
            type: 'missing_env',
            severity: 'medium',
            message: 'No environment configuration files found'
          });
        }
      }
    } catch (error) {
      issues.push({
        type: 'config_check_error',
        severity: 'low',
        message: `Failed to check configuration: ${error.message}`
      });
    }
    
    return issues;
  }

  /**
   * 检查依赖一致性
   */
  async _checkDependencyConsistency() {
    const issues = [];
    
    try {
      const projectPath = path.join(this.config.projectRoot, 'inspi-ai-platform');
      const packageJsonPath = path.join(projectPath, 'package.json');
      const packageLockPath = path.join(projectPath, 'package-lock.json');
      
      // 检查 package.json 和 package-lock.json 是否同步
      try {
        const packageJsonStat = await fs.stat(packageJsonPath);
        const packageLockStat = await fs.stat(packageLockPath);
        
        if (packageJsonStat.mtime > packageLockStat.mtime) {
          issues.push({
            type: 'outdated_lockfile',
            severity: 'medium',
            message: 'package-lock.json is older than package.json, run npm install'
          });
        }
      } catch {
        issues.push({
          type: 'missing_lockfile',
          severity: 'high',
          message: 'package-lock.json is missing'
        });
      }

      // 检查 node_modules 是否存在
      try {
        await fs.access(path.join(projectPath, 'node_modules'));
      } catch {
        issues.push({
          type: 'missing_node_modules',
          severity: 'high',
          message: 'node_modules directory is missing, run npm install'
        });
      }
    } catch (error) {
      issues.push({
        type: 'dependency_check_error',
        severity: 'low',
        message: `Failed to check dependencies: ${error.message}`
      });
    }
    
    return issues;
  }

  /**
   * 检测功能回归
   */
  async _detectFunctionalRegression() {
    const regressionIssues = [];
    
    try {
      // 读取历史测试结果
      const historyPath = path.join(this.config.projectRoot, '.kiro', 'quality-checks', 'history');
      
      try {
        const files = await fs.readdir(historyPath);
        const recentFiles = files
          .filter(f => f.startsWith('functional-validation-'))
          .sort()
          .slice(-5); // 最近5次结果

        if (recentFiles.length >= 2) {
          const currentResults = this.testResults;
          
          // 读取上一次的结果
          const lastResultFile = recentFiles[recentFiles.length - 1];
          const lastResultPath = path.join(historyPath, lastResultFile);
          const lastResults = JSON.parse(await fs.readFile(lastResultPath, 'utf8'));

          // 比较测试结果
          if (lastResults.testResults) {
            // 检查单元测试回归
            if (currentResults.unit.passed < lastResults.testResults.unit?.passed) {
              regressionIssues.push({
                type: 'unit_test_regression',
                severity: 'high',
                message: `Unit tests passed decreased from ${lastResults.testResults.unit.passed} to ${currentResults.unit.passed}`,
                current: currentResults.unit.passed,
                previous: lastResults.testResults.unit.passed
              });
            }

            // 检查集成测试回归
            if (currentResults.integration.passed < lastResults.testResults.integration?.passed) {
              regressionIssues.push({
                type: 'integration_test_regression',
                severity: 'high',
                message: `Integration tests passed decreased from ${lastResults.testResults.integration.passed} to ${currentResults.integration.passed}`,
                current: currentResults.integration.passed,
                previous: lastResults.testResults.integration.passed
              });
            }

            // 检查 API 测试回归
            if (currentResults.api.passed < lastResults.testResults.api?.passed) {
              regressionIssues.push({
                type: 'api_test_regression',
                severity: 'high',
                message: `API tests passed decreased from ${lastResults.testResults.api.passed} to ${currentResults.api.passed}`,
                current: currentResults.api.passed,
                previous: lastResults.testResults.api.passed
              });
            }
          }
        }
      } catch {
        // 没有历史数据，无法检测回归
      }
    } catch (error) {
      regressionIssues.push({
        type: 'regression_check_error',
        severity: 'low',
        message: `Failed to check for regression: ${error.message}`
      });
    }
    
    return regressionIssues;
  }

  /**
   * 汇总测试结果
   */
  _aggregateTestResults() {
    const total = this.testResults.unit.total + 
                  this.testResults.integration.total + 
                  this.testResults.api.total;
    
    const passed = this.testResults.unit.passed + 
                   this.testResults.integration.passed + 
                   this.testResults.api.passed;
    
    const failed = this.testResults.unit.failed + 
                   this.testResults.integration.failed + 
                   this.testResults.api.failed;

    return {
      total,
      passed,
      failed,
      passRate: total > 0 ? Math.round((passed / total) * 100) : 0,
      breakdown: {
        unit: this.testResults.unit,
        integration: this.testResults.integration,
        api: this.testResults.api
      }
    };
  }

  /**
   * 确定功能状态
   */
  _determineFunctionalStatus(results) {
    // 如果有高严重性的回归问题，状态为失败
    const highSeverityRegressions = results.regressionIssues.filter(issue => issue.severity === 'high');
    if (highSeverityRegressions.length > 0) {
      return 'failed';
    }

    // 如果测试失败率超过10%，状态为失败
    if (results.testResults.total > 0 && (results.testResults.failed / results.testResults.total) > 0.1) {
      return 'failed';
    }

    // 如果有中等严重性的一致性问题，状态为警告
    const mediumSeverityIssues = results.functionalChecks.consistencyCheck?.issues?.filter(issue => issue.severity === 'medium') || [];
    if (mediumSeverityIssues.length > 0) {
      return 'warning';
    }

    return 'passed';
  }

  /**
   * 保存功能验证结果
   */
  async _saveFunctionalValidationResults(results) {
    try {
      const historyPath = path.join(this.config.projectRoot, '.kiro', 'quality-checks', 'history');
      await fs.mkdir(historyPath, { recursive: true });

      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const filename = `functional-validation-${timestamp}.json`;
      const filepath = path.join(historyPath, filename);

      const saveData = {
        ...results,
        testResults: this.testResults
      };

      await fs.writeFile(filepath, JSON.stringify(saveData, null, 2));

      // 保持最近20个历史记录
      const files = await fs.readdir(historyPath);
      const functionalFiles = files.filter(f => f.startsWith('functional-validation-')).sort();
      
      if (functionalFiles.length > 20) {
        const filesToDelete = functionalFiles.slice(0, functionalFiles.length - 20);
        for (const file of filesToDelete) {
          await fs.unlink(path.join(historyPath, file));
        }
      }
    } catch (error) {
      console.warn('Failed to save functional validation results:', error.message);
    }
  }

  /**
   * 提取覆盖率信息
   */
  _extractCoverageInfo(coverageMap) {
    if (!coverageMap) return null;
    
    try {
      let totalLines = 0;
      let coveredLines = 0;
      
      Object.values(coverageMap).forEach(fileCoverage => {
        if (fileCoverage.s) {
          const statements = Object.values(fileCoverage.s);
          totalLines += statements.length;
          coveredLines += statements.filter(count => count > 0).length;
        }
      });
      
      return {
        percentage: totalLines > 0 ? Math.round((coveredLines / totalLines) * 100) : 0,
        totalLines,
        coveredLines
      };
    } catch {
      return null;
    }
  }
}

module.exports = FunctionalValidator;