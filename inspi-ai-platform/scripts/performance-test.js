#!/usr/bin/env node

/**
 * 性能测试脚本
 */
const { execSync, spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');

/**
 * 性能测试配置
 */
const config = {
  // 测试套件
  testSuites: [
    'benchmark',
    'load',
    'regression'
  ],
  
  // 输出目录
  outputDir: path.join(__dirname, '../performance-reports'),
  
  // Jest配置
  jestConfig: {
    testMatch: ['**/__tests__/performance/**/*.test.ts'],
    testTimeout: 60000, // 60秒
    maxWorkers: 1, // 单线程运行以获得一致的结果
    verbose: true
  },
  
  // 报告配置
  reports: {
    json: true,
    html: true,
    console: true
  },
  
  // 基准配置
  benchmarks: {
    warmupRuns: 3,
    testRuns: 5,
    gcBetweenRuns: true
  }
};

/**
 * 系统信息收集
 */
function getSystemInfo() {
  return {
    platform: os.platform(),
    arch: os.arch(),
    cpus: os.cpus().length,
    totalMemory: Math.round(os.totalmem() / 1024 / 1024 / 1024) + 'GB',
    freeMemory: Math.round(os.freemem() / 1024 / 1024 / 1024) + 'GB',
    nodeVersion: process.version,
    timestamp: new Date().toISOString()
  };
}

/**
 * 创建输出目录
 */
function ensureOutputDir() {
  if (!fs.existsSync(config.outputDir)) {
    fs.mkdirSync(config.outputDir, { recursive: true });
  }
}

/**
 * 运行Jest测试
 */
function runJestTests(suite) {
  return new Promise((resolve, reject) => {
    const testPattern = `**/__tests__/performance/${suite}.test.ts`;
    const outputFile = path.join(config.outputDir, `${suite}-results.json`);
    
    const jestArgs = [
      '--testMatch', testPattern,
      '--testTimeout', config.jestConfig.testTimeout.toString(),
      '--maxWorkers', config.jestConfig.maxWorkers.toString(),
      '--json',
      '--outputFile', outputFile,
      '--verbose'
    ];

    console.log(`\n🧪 Running ${suite} tests...`);
    console.log(`Command: npx jest ${jestArgs.join(' ')}\n`);

    const jest = spawn('npx', ['jest', ...jestArgs], {
      stdio: 'inherit',
      cwd: path.join(__dirname, '..')
    });

    jest.on('close', (code) => {
      if (code === 0) {
        console.log(`✅ ${suite} tests completed successfully`);
        resolve({ suite, success: true, outputFile });
      } else {
        console.log(`❌ ${suite} tests failed with code ${code}`);
        resolve({ suite, success: false, code, outputFile });
      }
    });

    jest.on('error', (error) => {
      console.error(`❌ Failed to run ${suite} tests:`, error);
      reject(error);
    });
  });
}

/**
 * 解析Jest结果
 */
function parseJestResults(outputFile) {
  try {
    if (!fs.existsSync(outputFile)) {
      return null;
    }

    const content = fs.readFileSync(outputFile, 'utf8');
    return JSON.parse(content);
  } catch (error) {
    console.warn(`⚠️  Failed to parse results from ${outputFile}:`, error.message);
    return null;
  }
}

/**
 * 生成HTML报告
 */
function generateHtmlReport(results, systemInfo) {
  const htmlTemplate = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Performance Test Report</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 1200px;
            margin: 0 auto;
            padding: 20px;
            background-color: #f5f5f5;
        }
        .header {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 30px;
            border-radius: 10px;
            margin-bottom: 30px;
            text-align: center;
        }
        .header h1 {
            margin: 0;
            font-size: 2.5em;
        }
        .system-info {
            background: white;
            padding: 20px;
            border-radius: 8px;
            margin-bottom: 20px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        .test-suite {
            background: white;
            margin-bottom: 20px;
            border-radius: 8px;
            overflow: hidden;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        .suite-header {
            padding: 20px;
            background: #f8f9fa;
            border-bottom: 1px solid #dee2e6;
        }
        .suite-content {
            padding: 20px;
        }
        .status-badge {
            display: inline-block;
            padding: 4px 12px;
            border-radius: 20px;
            font-size: 0.8em;
            font-weight: bold;
            text-transform: uppercase;
        }
        .status-success {
            background: #d4edda;
            color: #155724;
        }
        .status-failure {
            background: #f8d7da;
            color: #721c24;
        }
        .metrics {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 15px;
            margin-top: 15px;
        }
        .metric {
            background: #f8f9fa;
            padding: 15px;
            border-radius: 6px;
            text-align: center;
        }
        .metric-value {
            font-size: 1.5em;
            font-weight: bold;
            color: #495057;
        }
        .metric-label {
            font-size: 0.9em;
            color: #6c757d;
            margin-top: 5px;
        }
        .test-details {
            margin-top: 20px;
        }
        .test-item {
            padding: 10px;
            border-left: 4px solid #dee2e6;
            margin-bottom: 10px;
            background: #f8f9fa;
        }
        .test-item.passed {
            border-left-color: #28a745;
        }
        .test-item.failed {
            border-left-color: #dc3545;
        }
        .footer {
            text-align: center;
            margin-top: 40px;
            padding: 20px;
            color: #6c757d;
            font-size: 0.9em;
        }
        pre {
            background: #f8f9fa;
            padding: 15px;
            border-radius: 6px;
            overflow-x: auto;
            font-size: 0.9em;
        }
    </style>
</head>
<body>
    <div class="header">
        <h1>🚀 Performance Test Report</h1>
        <p>Generated on ${new Date().toLocaleString()}</p>
    </div>

    <div class="system-info">
        <h2>🖥️ System Information</h2>
        <div class="metrics">
            <div class="metric">
                <div class="metric-value">${systemInfo.platform}</div>
                <div class="metric-label">Platform</div>
            </div>
            <div class="metric">
                <div class="metric-value">${systemInfo.arch}</div>
                <div class="metric-label">Architecture</div>
            </div>
            <div class="metric">
                <div class="metric-value">${systemInfo.cpus}</div>
                <div class="metric-label">CPU Cores</div>
            </div>
            <div class="metric">
                <div class="metric-value">${systemInfo.totalMemory}</div>
                <div class="metric-label">Total Memory</div>
            </div>
            <div class="metric">
                <div class="metric-value">${systemInfo.nodeVersion}</div>
                <div class="metric-label">Node.js Version</div>
            </div>
        </div>
    </div>

    ${results.map(result => `
    <div class="test-suite">
        <div class="suite-header">
            <h2>📊 ${result.suite.charAt(0).toUpperCase() + result.suite.slice(1)} Tests</h2>
            <span class="status-badge ${result.success ? 'status-success' : 'status-failure'}">
                ${result.success ? 'Passed' : 'Failed'}
            </span>
        </div>
        <div class="suite-content">
            ${result.jestResults ? `
            <div class="metrics">
                <div class="metric">
                    <div class="metric-value">${result.jestResults.numTotalTests}</div>
                    <div class="metric-label">Total Tests</div>
                </div>
                <div class="metric">
                    <div class="metric-value">${result.jestResults.numPassedTests}</div>
                    <div class="metric-label">Passed</div>
                </div>
                <div class="metric">
                    <div class="metric-value">${result.jestResults.numFailedTests}</div>
                    <div class="metric-label">Failed</div>
                </div>
                <div class="metric">
                    <div class="metric-value">${(result.jestResults.testResults[0]?.perfStats?.runtime || 0).toFixed(2)}ms</div>
                    <div class="metric-label">Runtime</div>
                </div>
            </div>
            ` : ''}
            
            ${result.error ? `
            <div class="test-details">
                <h3>❌ Error Details</h3>
                <pre>${result.error}</pre>
            </div>
            ` : ''}
        </div>
    </div>
    `).join('')}

    <div class="footer">
        <p>Report generated by Performance Test Runner</p>
        <p>For more details, check the JSON reports in the performance-reports directory</p>
    </div>
</body>
</html>
  `;

  const htmlFile = path.join(config.outputDir, 'performance-report.html');
  fs.writeFileSync(htmlFile, htmlTemplate);
  console.log(`📄 HTML report generated: ${htmlFile}`);
}

/**
 * 生成JSON报告
 */
function generateJsonReport(results, systemInfo) {
  const report = {
    timestamp: new Date().toISOString(),
    systemInfo,
    results,
    summary: {
      totalSuites: results.length,
      passedSuites: results.filter(r => r.success).length,
      failedSuites: results.filter(r => !r.success).length,
      totalTests: results.reduce((sum, r) => sum + (r.jestResults?.numTotalTests || 0), 0),
      passedTests: results.reduce((sum, r) => sum + (r.jestResults?.numPassedTests || 0), 0),
      failedTests: results.reduce((sum, r) => sum + (r.jestResults?.numFailedTests || 0), 0)
    }
  };

  const jsonFile = path.join(config.outputDir, 'performance-report.json');
  fs.writeFileSync(jsonFile, JSON.stringify(report, null, 2));
  console.log(`📄 JSON report generated: ${jsonFile}`);
  
  return report;
}

/**
 * 生成控制台报告
 */
function generateConsoleReport(results, systemInfo) {
  console.log('\n' + '='.repeat(60));
  console.log('🚀 PERFORMANCE TEST SUMMARY');
  console.log('='.repeat(60));
  
  console.log(`\n🖥️  System: ${systemInfo.platform} ${systemInfo.arch}`);
  console.log(`💾 Memory: ${systemInfo.totalMemory} total`);
  console.log(`🔧 Node.js: ${systemInfo.nodeVersion}`);
  console.log(`📅 Date: ${new Date().toLocaleString()}\n`);

  results.forEach(result => {
    const status = result.success ? '✅' : '❌';
    const suite = result.suite.charAt(0).toUpperCase() + result.suite.slice(1);
    
    console.log(`${status} ${suite} Tests`);
    
    if (result.jestResults) {
      console.log(`   📊 ${result.jestResults.numPassedTests}/${result.jestResults.numTotalTests} tests passed`);
      console.log(`   ⏱️  Runtime: ${(result.jestResults.testResults[0]?.perfStats?.runtime || 0).toFixed(2)}ms`);
    }
    
    if (result.error) {
      console.log(`   ❌ Error: ${result.error}`);
    }
    
    console.log('');
  });

  const totalTests = results.reduce((sum, r) => sum + (r.jestResults?.numTotalTests || 0), 0);
  const passedTests = results.reduce((sum, r) => sum + (r.jestResults?.numPassedTests || 0), 0);
  const failedTests = results.reduce((sum, r) => sum + (r.jestResults?.numFailedTests || 0), 0);

  console.log('📈 OVERALL RESULTS:');
  console.log(`   Total Tests: ${totalTests}`);
  console.log(`   Passed: ${passedTests}`);
  console.log(`   Failed: ${failedTests}`);
  console.log(`   Success Rate: ${totalTests > 0 ? ((passedTests / totalTests) * 100).toFixed(1) : 0}%`);
  
  console.log('\n' + '='.repeat(60));
}

/**
 * 清理旧报告
 */
function cleanupOldReports() {
  if (fs.existsSync(config.outputDir)) {
    const files = fs.readdirSync(config.outputDir);
    files.forEach(file => {
      const filePath = path.join(config.outputDir, file);
      fs.unlinkSync(filePath);
    });
    console.log('🧹 Cleaned up old reports');
  }
}

/**
 * 主函数
 */
async function main() {
  console.log('🚀 Starting Performance Test Runner...\n');
  
  // 获取系统信息
  const systemInfo = getSystemInfo();
  console.log('🖥️  System Info:', systemInfo);
  
  // 创建输出目录
  ensureOutputDir();
  
  // 清理旧报告
  cleanupOldReports();
  
  // 运行测试套件
  const results = [];
  
  for (const suite of config.testSuites) {
    try {
      const result = await runJestTests(suite);
      
      // 解析Jest结果
      const jestResults = parseJestResults(result.outputFile);
      
      results.push({
        ...result,
        jestResults,
        error: !result.success ? `Test suite failed with code ${result.code}` : null
      });
      
    } catch (error) {
      console.error(`❌ Failed to run ${suite} tests:`, error);
      results.push({
        suite,
        success: false,
        error: error.message,
        jestResults: null
      });
    }
  }
  
  // 生成报告
  console.log('\n📊 Generating reports...');
  
  if (config.reports.json) {
    generateJsonReport(results, systemInfo);
  }
  
  if (config.reports.html) {
    generateHtmlReport(results, systemInfo);
  }
  
  if (config.reports.console) {
    generateConsoleReport(results, systemInfo);
  }
  
  // 检查是否有失败的测试
  const hasFailures = results.some(r => !r.success);
  
  if (hasFailures) {
    console.log('\n❌ Some performance tests failed. Check the reports for details.');
    process.exit(1);
  } else {
    console.log('\n✅ All performance tests passed!');
    process.exit(0);
  }
}

// 处理未捕获的异常
process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

process.on('uncaughtException', (error) => {
  console.error('❌ Uncaught Exception:', error);
  process.exit(1);
});

// 运行主函数
if (require.main === module) {
  main().catch(error => {
    console.error('❌ Performance test runner failed:', error);
    process.exit(1);
  });
}

module.exports = {
  config,
  getSystemInfo,
  runJestTests,
  generateHtmlReport,
  generateJsonReport,
  generateConsoleReport
};