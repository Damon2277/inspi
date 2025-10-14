#!/usr/bin/env node

/**
 * 端到端性能测试自动化脚本
 * 运行完整的性能测试套件并生成报告
 */

const { execSync, spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

class PerformanceE2ETester {
  constructor() {
    this.baseDir = path.join(__dirname, '..');
    this.reportsDir = path.join(this.baseDir, 'reports');
    this.testResults = {
      timestamp: new Date().toISOString(),
      environment: this.getEnvironmentInfo(),
      tests: {},
      summary: {
        totalTests: 0,
        passedTests: 0,
        failedTests: 0,
        totalDuration: 0,
        performanceScore: 0
      }
    };

    // 确保报告目录存在
    if (!fs.existsSync(this.reportsDir)) {
      fs.mkdirSync(this.reportsDir, { recursive: true });
    }
  }

  getEnvironmentInfo() {
    return {
      node: process.version,
      platform: process.platform,
      arch: process.arch,
      memory: Math.round(process.memoryUsage().heapTotal / 1024 / 1024) + 'MB',
      cpu: require('os').cpus()[0].model,
      cores: require('os').cpus().length
    };
  }

  log(message, level = 'info') {
    const timestamp = new Date().toISOString();
    const prefix = {
      info: '📋',
      success: '✅',
      error: '❌',
      warning: '⚠️',
      debug: '🔍'
    }[level] || '📋';

    console.log(`${prefix} [${timestamp}] ${message}`);
  }

  async runCommand(command, options = {}) {
    return new Promise((resolve, reject) => {
      this.log(`Running: ${command}`, 'debug');
      
      const child = spawn('sh', ['-c', command], {
        cwd: this.baseDir,
        stdio: 'pipe',
        ...options
      });

      let stdout = '';
      let stderr = '';

      child.stdout.on('data', (data) => {
        stdout += data.toString();
      });

      child.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      child.on('close', (code) => {
        if (code === 0) {
          resolve({ stdout, stderr, code });
        } else {
          reject(new Error(`Command failed with code ${code}: ${stderr}`));
        }
      });

      child.on('error', (error) => {
        reject(error);
      });
    });
  }

  async checkPrerequisites() {
    this.log('Checking prerequisites...', 'info');

    try {
      // 检查Node.js版本
      const nodeVersion = process.version;
      this.log(`Node.js version: ${nodeVersion}`, 'debug');

      // 检查依赖是否安装
      if (!fs.existsSync(path.join(this.baseDir, 'node_modules'))) {
        this.log('Installing dependencies...', 'info');
        await this.runCommand('npm install');
      }

      // 检查测试文件是否存在
      const testFiles = [
        'src/__tests__/e2e/performance.test.ts',
        'src/__tests__/performance/cache.test.ts',
        'src/__tests__/performance/mobile.test.ts'
      ];

      for (const testFile of testFiles) {
        const filePath = path.join(this.baseDir, testFile);
        if (!fs.existsSync(filePath)) {
          throw new Error(`Test file not found: ${testFile}`);
        }
      }

      // 检查应用是否运行
      try {
        const response = await fetch('http://localhost:3000/api/health');
        if (!response.ok) {
          throw new Error('Health check failed');
        }
        this.log('Application is running and healthy', 'success');
      } catch (error) {
        this.log('Application is not running. Please start it first.', 'warning');
        this.log('Run: npm run dev', 'info');
        throw new Error('Application not available');
      }

      this.log('All prerequisites met', 'success');
    } catch (error) {
      this.log(`Prerequisites check failed: ${error.message}`, 'error');
      throw error;
    }
  }

  async runE2EPerformanceTests() {
    this.log('Running E2E performance tests...', 'info');
    const startTime = Date.now();

    try {
      const result = await this.runCommand(
        'npm test -- --testPathPattern=e2e/performance.test.ts --verbose --json',
        { timeout: 300000 } // 5分钟超时
      );

      const duration = Date.now() - startTime;
      const testOutput = this.parseJestOutput(result.stdout);

      this.testResults.tests.e2e = {
        name: 'E2E Performance Tests',
        duration,
        status: testOutput.success ? 'passed' : 'failed',
        results: testOutput.testResults,
        metrics: this.extractPerformanceMetrics(result.stdout)
      };

      this.log(`E2E tests completed in ${duration}ms`, 'success');
      return testOutput.success;
    } catch (error) {
      const duration = Date.now() - startTime;
      this.testResults.tests.e2e = {
        name: 'E2E Performance Tests',
        duration,
        status: 'failed',
        error: error.message
      };

      this.log(`E2E tests failed: ${error.message}`, 'error');
      return false;
    }
  }

  async runCachePerformanceTests() {
    this.log('Running cache performance tests...', 'info');
    const startTime = Date.now();

    try {
      const result = await this.runCommand(
        'npm test -- --testPathPattern=performance/cache.test.ts --verbose --json',
        { timeout: 180000 } // 3分钟超时
      );

      const duration = Date.now() - startTime;
      const testOutput = this.parseJestOutput(result.stdout);

      this.testResults.tests.cache = {
        name: 'Cache Performance Tests',
        duration,
        status: testOutput.success ? 'passed' : 'failed',
        results: testOutput.testResults,
        metrics: this.extractCacheMetrics(result.stdout)
      };

      this.log(`Cache tests completed in ${duration}ms`, 'success');
      return testOutput.success;
    } catch (error) {
      const duration = Date.now() - startTime;
      this.testResults.tests.cache = {
        name: 'Cache Performance Tests',
        duration,
        status: 'failed',
        error: error.message
      };

      this.log(`Cache tests failed: ${error.message}`, 'error');
      return false;
    }
  }

  async runMobilePerformanceTests() {
    this.log('Running mobile performance tests...', 'info');
    const startTime = Date.now();

    try {
      const result = await this.runCommand(
        'npm test -- --testPathPattern=performance/mobile.test.ts --verbose --json',
        { timeout: 600000 } // 10分钟超时
      );

      const duration = Date.now() - startTime;
      const testOutput = this.parseJestOutput(result.stdout);

      this.testResults.tests.mobile = {
        name: 'Mobile Performance Tests',
        duration,
        status: testOutput.success ? 'passed' : 'failed',
        results: testOutput.testResults,
        metrics: this.extractMobileMetrics(result.stdout)
      };

      this.log(`Mobile tests completed in ${duration}ms`, 'success');
      return testOutput.success;
    } catch (error) {
      const duration = Date.now() - startTime;
      this.testResults.tests.mobile = {
        name: 'Mobile Performance Tests',
        duration,
        status: 'failed',
        error: error.message
      };

      this.log(`Mobile tests failed: ${error.message}`, 'error');
      return false;
    }
  }

  parseJestOutput(output) {
    try {
      // 尝试解析JSON输出
      const lines = output.split('\n');
      const jsonLine = lines.find(line => line.trim().startsWith('{') &&
        line.includes('testResults'));
      
      if (jsonLine) {
        const result = JSON.parse(jsonLine);
        return {
          success: result.success,
          testResults: result.testResults
        };
      }

      // 如果没有JSON输出，解析文本输出
      const success = !output.includes('FAIL') && output.includes('PASS');
      return {
        success,
        testResults: []
      };
    } catch (error) {
      this.log(`Failed to parse Jest output: ${error.message}`, 'warning');
      return {
        success: false,
        testResults: []
      };
    }
  }

  extractPerformanceMetrics(output) {
    const metrics = {};
    
    // 提取LCP指标
    const lcpMatch = output.match(/LCP: ([\d.]+)ms/g);
    if (lcpMatch) {
      metrics.lcp = lcpMatch.map(m => parseFloat(m.match(/[\d.]+/)[0]));
    }

    // 提取FCP指标
    const fcpMatch = output.match(/FCP: ([\d.]+)ms/g);
    if (fcpMatch) {
      metrics.fcp = fcpMatch.map(m => parseFloat(m.match(/[\d.]+/)[0]));
    }

    // 提取CLS指标
    const clsMatch = output.match(/CLS: ([\d.]+)/g);
    if (clsMatch) {
      metrics.cls = clsMatch.map(m => parseFloat(m.match(/[\d.]+/)[0]));
    }

    // 提取加载时间
    const loadTimeMatch = output.match(/Load Time: ([\d.]+)ms/g);
    if (loadTimeMatch) {
      metrics.loadTime = loadTimeMatch.map(m => parseFloat(m.match(/[\d.]+/)[0]));
    }

    return metrics;
  }

  extractCacheMetrics(output) {
    const metrics = {};

    // 提取命中率
    const hitRateMatch = output.match(/Hit Rate: ([\d.]+)%/g);
    if (hitRateMatch) {
      metrics.hitRate = hitRateMatch.map(m => parseFloat(m.match(/[\d.]+/)[0]));
    }

    // 提取性能提升
    const improvementMatch = output.match(/improvement: ([\d.]+)/g);
    if (improvementMatch) {
      metrics.improvement = improvementMatch.map(m => parseFloat(m.match(/[\d.]+/)[0]));
    }

    return metrics;
  }

  extractMobileMetrics(output) {
    const metrics = {};

    // 提取内存使用
    const memoryMatch = output.match(/Memory: ([\d.]+)MB/g);
    if (memoryMatch) {
      metrics.memory = memoryMatch.map(m => parseFloat(m.match(/[\d.]+/)[0]));
    }

    // 提取CPU使用率
    const cpuMatch = output.match(/CPU: ([\d.]+)%/g);
    if (cpuMatch) {
      metrics.cpu = cpuMatch.map(m => parseFloat(m.match(/[\d.]+/)[0]));
    }

    // 提取电池影响
    const batteryMatch = output.match(/Battery Impact: (\w+)/g);
    if (batteryMatch) {
      metrics.batteryImpact = batteryMatch.map(m => m.match(/(\w+)$/)[1]);
    }

    return metrics;
  }

  calculatePerformanceScore() {
    let totalScore = 0;
    let testCount = 0;

    for (const [testName, testResult] of Object.entries(this.testResults.tests)) {
      if (testResult.status === 'passed') {
        let testScore = 100;

        // 根据性能指标调整分数
        if (testResult.metrics) {
          if (testResult.metrics.lcp) {
            const avgLcp = testResult.metrics.lcp.reduce((a, b) => a + b,
              0) / testResult.metrics.lcp.length;
            if (avgLcp > 4000) testScore -= 20;
            else if (avgLcp > 2500) testScore -= 10;
          }

          if (testResult.metrics.cls) {
            const avgCls = testResult.metrics.cls.reduce((a, b) => a + b,
              0) / testResult.metrics.cls.length;
            if (avgCls > 0.25) testScore -= 15;
            else if (avgCls > 0.1) testScore -= 5;
          }

          if (testResult.metrics.hitRate) {
            const avgHitRate = testResult.metrics.hitRate.reduce((a, b) => a + b,
              0) / testResult.metrics.hitRate.length;
            if (avgHitRate < 80) testScore -= 20;
            else if (avgHitRate < 90) testScore -= 10;
          }
        }

        totalScore += Math.max(0, testScore);
      }
      testCount++;
    }

    return testCount > 0 ? Math.round(totalScore / testCount) : 0;
  }

  generateReport() {
    // 计算汇总信息
    this.testResults.summary.totalTests = Object.keys(this.testResults.tests).length;
    this.testResults.summary.passedTests = Object.values(this.testResults.tests)
      .filter(test => test.status === 'passed').length;
    this.testResults.summary.failedTests = this.testResults.summary.totalTests -
      this.testResults.summary.passedTests;
    this.testResults.summary.totalDuration = Object.values(this.testResults.tests)
      .reduce((sum, test) => sum + (test.duration || 0), 0);
    this.testResults.summary.performanceScore = this.calculatePerformanceScore();

    // 生成JSON报告
    const jsonReportPath = path.join(this.reportsDir, `performance-e2e-${Date.now()}.json`);
    fs.writeFileSync(jsonReportPath, JSON.stringify(this.testResults, null, 2));

    // 生成HTML报告
    const htmlReport = this.generateHTMLReport();
    const htmlReportPath = path.join(this.reportsDir, `performance-e2e-${Date.now()}.html`);
    fs.writeFileSync(htmlReportPath, htmlReport);

    this.log(`Reports generated:`, 'success');
    this.log(`  JSON: ${jsonReportPath}`, 'info');
    this.log(`  HTML: ${htmlReportPath}`, 'info');

    return {
      json: jsonReportPath,
      html: htmlReportPath
    };
  }

  generateHTMLReport() {
    const { summary, tests, timestamp, environment } = this.testResults;
    
    return `
<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>性能测试报告 - E2E</title>
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI',
          Roboto, sans-serif; margin: 0; padding: 20px; background: #f5f5f5; }
        .container { max-width: 1200px; margin: 0 auto; background:
          white; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
        .header { background: linear-gradient(135deg, #667eea 0%,
          #764ba2 100%); color: white; padding: 30px; border-radius: 8px 8px 0 0; }
        .header h1 { margin: 0; font-size: 2.5em; }
        .header p { margin: 10px 0 0 0; opacity: 0.9; }
        .summary { display: grid; grid-template-columns: repeat(auto-fit,
          minmax(200px, 1fr)); gap: 20px; padding: 30px; }
        .summary-card { background: #f8f9fa; padding: 20px; border-radius:
          8px; text-align: center; }
        .summary-card h3 { margin: 0 0 10px 0; color: #495057; }
        .summary-card .value { font-size: 2em; font-weight: bold; color: #007bff; }
        .summary-card.success .value { color: #28a745; }
        .summary-card.danger .value { color: #dc3545; }
        .summary-card.warning .value { color: #ffc107; }
        .content { padding: 0 30px 30px 30px; }
        .test-section { margin-bottom: 30px; }
        .test-section h2 { color: #495057; border-bottom: 2px solid #e9ecef; padding-bottom: 10px; }
        .test-result { background: #f8f9fa; border-radius: 8px; padding:
          20px; margin-bottom: 15px; }
        .test-result.passed { border-left: 4px solid #28a745; }
        .test-result.failed { border-left: 4px solid #dc3545; }
        .test-header { display: flex; justify-content:
          space-between; align-items: center; margin-bottom: 15px; }
        .test-name { font-size: 1.2em; font-weight: bold; }
        .test-status { padding: 5px 15px; border-radius: 20px; color: white; font-size: 0.9em; }
        .test-status.passed { background: #28a745; }
        .test-status.failed { background: #dc3545; }
        .metrics { display: grid; grid-template-columns: repeat(auto-fit,
          minmax(150px, 1fr)); gap: 15px; margin-top: 15px; }
        .metric { background: white; padding: 15px; border-radius: 6px; text-align: center; }
        .metric-label { font-size: 0.9em; color: #6c757d; margin-bottom: 5px; }
        .metric-value { font-size: 1.3em; font-weight: bold; color: #495057; }
        .environment { background: #e9ecef; padding: 20px; border-radius: 8px; margin-top: 20px; }
        .environment h3 { margin-top: 0; }
        .environment-grid { display: grid; grid-template-columns:
          repeat(auto-fit, minmax(200px, 1fr)); gap: 10px; }
        .score { font-size: 3em; font-weight: bold; }
        .score.excellent { color: #28a745; }
        .score.good { color: #17a2b8; }
        .score.fair { color: #ffc107; }
        .score.poor { color: #dc3545; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🚀 性能测试报告 - E2E</h1>
            <p>生成时间: ${new Date(timestamp).toLocaleString('zh-CN')}</p>
        </div>
        
        <div class="summary">
            <div class="summary-card">
                <h3>总测试数</h3>
                <div class="value">${summary.totalTests}</div>
            </div>
            <div class="summary-card success">
                <h3>通过测试</h3>
                <div class="value">${summary.passedTests}</div>
            </div>
            <div class="summary-card ${summary.failedTests > 0 ? 'danger' : 'success'}">
                <h3>失败测试</h3>
                <div class="value">${summary.failedTests}</div>
            </div>
            <div class="summary-card">
                <h3>总耗时</h3>
                <div class="value">${Math.round(summary.totalDuration / 1000)}s</div>
            </div>
            <div class="summary-card">
                <h3>性能评分</h3>
                <div class="value score ${this.getScoreClass(summary.performanceScore)}">${summary.performanceScore}</div>
            </div>
        </div>
        
        <div class="content">
            <div class="test-section">
                <h2>📊 测试结果详情</h2>
                ${Object.entries(tests).map(([testName, testResult]) => `
                    <div class="test-result ${testResult.status}">
                        <div class="test-header">
                            <div class="test-name">${testResult.name}</div>
                            <div class="test-
                              status ${testResult.status}">${testResult.status.toUpperCase()}</div>
                        </div>
                        <div>
                            <strong>耗时:</strong> ${Math.round((testResult.duration || 0) / 1000)}秒
                        </div>
                        ${testResult.error ? `<div style="color: #dc3545; margin-
                          top: 10px;"><strong>错误:</strong> ${testResult.error}</div>` : ''}
                        ${testResult.metrics ? this.renderMetrics(testResult.metrics) : ''}
                    </div>
                `).join('')}
            </div>
            
            <div class="environment">
                <h3>🖥️ 测试环境</h3>
                <div class="environment-grid">
                    <div><strong>Node.js:</strong> ${environment.node}</div>
                    <div><strong>平台:</strong> ${environment.platform}</div>
                    <div><strong>架构:</strong> ${environment.arch}</div>
                    <div><strong>内存:</strong> ${environment.memory}</div>
                    <div><strong>CPU:</strong> ${environment.cpu}</div>
                    <div><strong>核心数:</strong> ${environment.cores}</div>
                </div>
            </div>
        </div>
    </div>
</body>
</html>`;
  }

  renderMetrics(metrics) {
    if (!metrics || Object.keys(metrics).length === 0) {
      return '';
    }

    return `
      <div class="metrics">
        ${Object.entries(metrics).map(([key, values]) => {
          if (Array.isArray(values) && values.length > 0) {
            const avg = values.reduce((a, b) => a + b, 0) / values.length;
            return `
              <div class="metric">
                <div class="metric-label">${key.toUpperCase()}</div>
                <div class="metric-value">${this.formatMetricValue(key, avg)}</div>
              </div>
            `;
          }
          return '';
        }).join('')}
      </div>
    `;
  }

  formatMetricValue(key, value) {
    if (key.includes('time') || key === 'lcp' || key === 'fcp') {
      return `${Math.round(value)}ms`;
    }
    if (key === 'hitRate') {
      return `${Math.round(value)}%`;
    }
    if (key === 'memory') {
      return `${Math.round(value)}MB`;
    }
    if (key === 'cpu') {
      return `${Math.round(value)}%`;
    }
    if (key === 'cls') {
      return value.toFixed(3);
    }
    return Math.round(value);
  }

  getScoreClass(score) {
    if (score >= 90) return 'excellent';
    if (score >= 75) return 'good';
    if (score >= 60) return 'fair';
    return 'poor';
  }

  async run() {
    const startTime = Date.now();
    
    try {
      this.log('🚀 Starting E2E Performance Test Suite', 'info');
      this.log('=====================================', 'info');

      // 检查先决条件
      await this.checkPrerequisites();

      // 运行各种性能测试
      const results = await Promise.allSettled([
        this.runE2EPerformanceTests(),
        this.runCachePerformanceTests(),
        this.runMobilePerformanceTests()
      ]);

      // 检查结果
      const allPassed = results.every(result => 
        result.status === 'fulfilled' && result.value === true
      );

      const totalDuration = Date.now() - startTime;
      this.testResults.summary.totalDuration = totalDuration;

      // 生成报告
      const reports = this.generateReport();

      // 输出结果
      this.log('=====================================', 'info');
      this.log('🏁 E2E Performance Test Suite Complete', 'info');
      this.log(`Total Duration: ${Math.round(totalDuration / 1000)}s`, 'info');
      this.log(`Performance Score: ${this.testResults.summary.performanceScore}/100`, 'info');
      this.log(`Tests Passed:
        ${this.testResults.summary.passedTests}/${this.testResults.summary.totalTests}`, 'info');

      if (allPassed) {
        this.log('All tests passed! 🎉', 'success');
        process.exit(0);
      } else {
        this.log('Some tests failed. Check the reports for details.', 'warning');
        process.exit(1);
      }

    } catch (error) {
      this.log(`Test suite failed: ${error.message}`, 'error');
      process.exit(1);
    }
  }
}

// 运行测试套件
if (require.main === module) {
  const tester = new PerformanceE2ETester();
  tester.run().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}

module.exports = PerformanceE2ETester;