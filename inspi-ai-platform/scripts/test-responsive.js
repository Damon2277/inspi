#!/usr/bin/env node

/**
 * PC端界面优化响应式测试运行器
 * 运行所有响应式相关的测试并生成报告
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// 测试配置
const TEST_CONFIG = {
  unit: {
    pattern: 'src/__tests__/responsive/pc-ui-enhancement.test.tsx',
    description: '单元测试 - PC端界面优化响应式功能',
  },
  integration: {
    pattern: 'src/__tests__/integration/responsive-system.test.tsx',
    description: '集成测试 - 响应式系统整体功能',
  },
  e2e: {
    pattern: 'src/__tests__/e2e/responsive-pc-ui.e2e.test.ts',
    description: 'E2E测试 - 真实浏览器环境响应式行为',
  },
};

// 断点配置
const BREAKPOINTS = [
  { name: 'mobile', width: 375, height: 667 },
  { name: 'tablet', width: 768, height: 1024 },
  { name: 'desktop', width: 1024, height: 768 },
  { name: 'wide', width: 1440, height: 900 },
  { name: 'ultrawide', width: 1920, height: 1080 },
];

// 颜色输出
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logHeader(message) {
  log(`\n${'='.repeat(60)}`, 'cyan');
  log(`${message}`, 'bright');
  log(`${'='.repeat(60)}`, 'cyan');
}

function logSection(message) {
  log(`\n${'-'.repeat(40)}`, 'blue');
  log(`${message}`, 'blue');
  log(`${'-'.repeat(40)}`, 'blue');
}

// 检查依赖
function checkDependencies() {
  logSection('检查测试依赖');
  
  try {
    execSync('npm list jest', { stdio: 'ignore' });
    log('✓ Jest 已安装', 'green');
  } catch (error) {
    log('✗ Jest 未安装', 'red');
    process.exit(1);
  }

  try {
    execSync('npm list @playwright/test', { stdio: 'ignore' });
    log('✓ Playwright 已安装', 'green');
  } catch (error) {
    log('✗ Playwright 未安装', 'red');
    log('请运行: npm install @playwright/test', 'yellow');
    process.exit(1);
  }
}

// 运行单元测试
async function runUnitTests() {
  logSection('运行单元测试');
  
  try {
    const command = `npm test -- ${TEST_CONFIG.unit.pattern} --verbose --coverage`;
    log(`执行命令: ${command}`, 'cyan');
    
    execSync(command, { stdio: 'inherit' });
    log('✓ 单元测试通过', 'green');
    return true;
  } catch (error) {
    log('✗ 单元测试失败', 'red');
    return false;
  }
}

// 运行集成测试
async function runIntegrationTests() {
  logSection('运行集成测试');
  
  try {
    // 检查集成测试文件是否存在
    const testFile = path.join(process.cwd(), TEST_CONFIG.integration.pattern);
    if (!fs.existsSync(testFile)) {
      log('⚠ 集成测试文件不存在，跳过', 'yellow');
      return true;
    }

    const command = `npm test -- ${TEST_CONFIG.integration.pattern} --verbose`;
    log(`执行命令: ${command}`, 'cyan');
    
    execSync(command, { stdio: 'inherit' });
    log('✓ 集成测试通过', 'green');
    return true;
  } catch (error) {
    log('✗ 集成测试失败', 'red');
    return false;
  }
}

// 运行E2E测试
async function runE2ETests() {
  logSection('运行E2E测试');
  
  try {
    // 检查开发服务器是否运行
    log('检查开发服务器状态...', 'cyan');
    
    const command = 'npx playwright test src/__tests__/e2e/responsive-pc-ui.e2e.test.ts';
    log(`执行命令: ${command}`, 'cyan');
    
    execSync(command, { stdio: 'inherit' });
    log('✓ E2E测试通过', 'green');
    return true;
  } catch (error) {
    log('✗ E2E测试失败', 'red');
    log('请确保开发服务器正在运行 (npm run dev)', 'yellow');
    return false;
  }
}

// 生成测试报告
function generateReport(results) {
  logSection('生成测试报告');
  
  const timestamp = new Date().toISOString();
  const report = {
    timestamp,
    breakpoints: BREAKPOINTS,
    results,
    summary: {
      total: results.length,
      passed: results.filter(r => r.passed).length,
      failed: results.filter(r => !r.passed).length,
    },
  };

  // 保存JSON报告
  const reportPath = path.join(process.cwd(), 'test-reports', 'responsive-test-report.json');
  const reportDir = path.dirname(reportPath);
  
  if (!fs.existsSync(reportDir)) {
    fs.mkdirSync(reportDir, { recursive: true });
  }
  
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
  log(`✓ 测试报告已保存: ${reportPath}`, 'green');

  // 生成HTML报告
  const htmlReport = generateHTMLReport(report);
  const htmlPath = path.join(reportDir, 'responsive-test-report.html');
  fs.writeFileSync(htmlPath, htmlReport);
  log(`✓ HTML报告已保存: ${htmlPath}`, 'green');

  return report;
}

// 生成HTML报告
function generateHTMLReport(report) {
  const passRate = ((report.summary.passed / report.summary.total) * 100).toFixed(2);
  
  return `
<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>PC端界面优化响应式测试报告</title>
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI',
          Roboto, sans-serif; margin: 0; padding: 20px; background: #f5f5f5; }
        .container { max-width: 1200px; margin: 0 auto; background:
          white; padding: 30px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
        .header { text-align: center; margin-bottom: 30px; }
        .summary { display: grid; grid-template-columns: repeat(auto-fit,
          minmax(200px, 1fr)); gap: 20px; margin-bottom: 30px; }
        .summary-card { background: linear-gradient(135deg, #667eea 0%,
          #764ba2 100%); color: white; padding: 20px; border-radius: 8px; text-align: center; }
        .summary-card h3 { margin: 0 0 10px 0; font-size: 2em; }
        .summary-card p { margin: 0; opacity: 0.9; }
        .results { margin-top: 30px; }
        .result-item { background: #f8f9fa; margin-bottom: 15px; padding:
          20px; border-radius: 8px; border-left: 4px solid #28a745; }
        .result-item.failed { border-left-color: #dc3545; }
        .result-title { font-weight: bold; margin-bottom: 10px; }
        .result-details { color: #666; font-size: 0.9em; }
        .breakpoints { display: grid; grid-template-columns: repeat(auto-fit,
          minmax(150px, 1fr)); gap: 15px; margin: 20px 0; }
        .breakpoint { background: #e9ecef; padding: 15px; border-radius: 6px; text-align: center; }
        .timestamp { text-align: center; color: #666; margin-top: 30px; font-size: 0.9em; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>PC端界面优化响应式测试报告</h1>
            <p>测试时间: ${report.timestamp}</p>
        </div>
        
        <div class="summary">
            <div class="summary-card">
                <h3>${report.summary.total}</h3>
                <p>总测试数</p>
            </div>
            <div class="summary-card">
                <h3>${report.summary.passed}</h3>
                <p>通过测试</p>
            </div>
            <div class="summary-card">
                <h3>${report.summary.failed}</h3>
                <p>失败测试</p>
            </div>
            <div class="summary-card">
                <h3>${passRate}%</h3>
                <p>通过率</p>
            </div>
        </div>

        <h2>测试断点</h2>
        <div class="breakpoints">
            ${report.breakpoints.map(bp => `
                <div class="breakpoint">
                    <strong>${bp.name}</strong><br>
                    ${bp.width} × ${bp.height}
                </div>
            `).join('')}
        </div>

        <div class="results">
            <h2>测试结果</h2>
            ${report.results.map(result => `
                <div class="result-item ${result.passed ? 'passed' : 'failed'}">
                    <div class="result-title">
                        ${result.passed ? '✅' : '❌'} ${result.name}
                    </div>
                    <div class="result-details">
                        ${result.description || ''}
                        ${result.error ? `<br><strong>错误:</strong> ${result.error}` : ''}
                    </div>
                </div>
            `).join('')}
        </div>

        <div class="timestamp">
            报告生成时间: ${new Date().toLocaleString('zh-CN')}
        </div>
    </div>
</body>
</html>
  `;
}

// 主函数
async function main() {
  logHeader('PC端界面优化响应式测试');
  
  const args = process.argv.slice(2);
  const testType = args[0] || 'all';
  
  log(`测试类型: ${testType}`, 'cyan');
  log(`测试断点: ${BREAKPOINTS.map(bp => `${bp.name}(${bp.width}x${bp.height})`).join(', ')}`, 'cyan');

  // 检查依赖
  checkDependencies();

  const results = [];
  let allPassed = true;

  try {
    if (testType === 'all' || testType === 'unit') {
      const unitResult = await runUnitTests();
      results.push({
        name: '单元测试',
        description: TEST_CONFIG.unit.description,
        passed: unitResult,
      });
      allPassed = allPassed && unitResult;
    }

    if (testType === 'all' || testType === 'integration') {
      const integrationResult = await runIntegrationTests();
      results.push({
        name: '集成测试',
        description: TEST_CONFIG.integration.description,
        passed: integrationResult,
      });
      allPassed = allPassed && integrationResult;
    }

    if (testType === 'all' || testType === 'e2e') {
      const e2eResult = await runE2ETests();
      results.push({
        name: 'E2E测试',
        description: TEST_CONFIG.e2e.description,
        passed: e2eResult,
      });
      allPassed = allPassed && e2eResult;
    }

    // 生成报告
    const report = generateReport(results);

    // 输出总结
    logHeader('测试总结');
    log(`总测试数: ${report.summary.total}`, 'cyan');
    log(`通过测试: ${report.summary.passed}`, 'green');
    log(`失败测试: ${report.summary.failed}`, report.summary.failed > 0 ? 'red' : 'green');
    log(`通过率: ${((report.summary.passed / report.summary.total) * 100).toFixed(2)}%`, 'cyan');

    if (allPassed) {
      log('\n🎉 所有测试通过！', 'green');
      process.exit(0);
    } else {
      log('\n❌ 部分测试失败', 'red');
      process.exit(1);
    }

  } catch (error) {
    log(`\n❌ 测试运行出错: ${error.message}`, 'red');
    process.exit(1);
  }
}

// 处理未捕获的异常
process.on('unhandledRejection', (reason, promise) => {
  log(`未处理的Promise拒绝: ${reason}`, 'red');
  process.exit(1);
});

process.on('uncaughtException', (error) => {
  log(`未捕获的异常: ${error.message}`, 'red');
  process.exit(1);
});

// 运行主函数
if (require.main === module) {
  main();
}

module.exports = {
  runUnitTests,
  runIntegrationTests,
  runE2ETests,
  generateReport,
  BREAKPOINTS,
  TEST_CONFIG,
};