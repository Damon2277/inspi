#!/usr/bin/env node

/**
 * 集成测试脚本 - 端到端测试
 */

const { execSync, spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const http = require('http');

console.log('🚀 开始集成测试 - 端到端测试...\n');

// 测试配置
const TEST_CONFIG = {
  baseUrl: 'http://localhost:3000',
  timeout: 30000,
  retries: 3,
  testSuites: [
    'content-security',
    'invitation-system',
    'api-endpoints',
    'user-flows'
  ]
};

// 测试结果记录
const testResults = {
  passed: 0,
  failed: 0,
  skipped: 0,
  tests: []
};

/**
 * 等待服务启动
 */
async function waitForServer(url, timeout = 30000) {
  const start = Date.now();
  
  while (Date.now() - start < timeout) {
    try {
      await new Promise((resolve, reject) => {
        const req = http.get(url, (res) => {
          resolve(res.statusCode);
        });
        req.on('error', reject);
        req.setTimeout(5000, () => req.destroy());
      });
      return true;
    } catch (error) {
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }
  return false;
}

/**
 * 启动开发服务器
 */
function startDevServer() {
  console.log('🔧 启动开发服务器...');
  
  const server = spawn('npm', ['run', 'dev'], {
    stdio: 'pipe',
    cwd: path.join(__dirname, '..')
  });
  
  return new Promise((resolve, reject) => {
    let output = '';
    
    server.stdout.on('data', (data) => {
      output += data.toString();
      if (output.includes('Ready') || output.includes('localhost:3000')) {
        console.log('✅ 开发服务器已启动');
        resolve(server);
      }
    });
    
    server.stderr.on('data', (data) => {
      console.error('Server error:', data.toString());
    });
    
    setTimeout(() => {
      reject(new Error('服务器启动超时'));
    }, 30000);
  });
}

/**
 * 执行测试套件
 */
async function runTestSuite(suiteName) {
  console.log(`\n🧪 执行测试套件: ${suiteName}`);
  
  try {
    switch (suiteName) {
      case 'content-security':
        return await testContentSecurity();
      case 'invitation-system':
        return await testInvitationSystem();
      case 'api-endpoints':
        return await testApiEndpoints();
      case 'user-flows':
        return await testUserFlows();
      default:
        throw new Error(`未知的测试套件: ${suiteName}`);
    }
  } catch (error) {
    console.error(`❌ 测试套件失败: ${suiteName} - ${error.message}`);
    return { passed: 0, failed: 1, tests: [{ name: suiteName, status: 'failed',
      error: error.message }] };
  }
}

/**
 * 内容安全验证系统集成测试
 */
async function testContentSecurity() {
  const tests = [
    {
      name: '敏感词检测API',
      test: async () => {
        const response = await fetch(`${TEST_CONFIG.baseUrl}/api/content/validate`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ content: '这是一个测试内容' })
        });
        
        if (!response.ok) {
          throw new Error(`API响应错误: ${response.status}`);
        }
        
        const result = await response.json();
        if (!result.hasOwnProperty('isValid')) {
          throw new Error('API响应格式错误');
        }
        
        return '内容验证API正常工作';
      }
    },
    {
      name: '敏感词过滤测试',
      test: async () => {
        const response = await fetch(`${TEST_CONFIG.baseUrl}/api/content/validate`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ content: '这个白痴真是垃圾' })
        });
        
        const result = await response.json();
        if (result.isValid) {
          throw new Error('敏感词检测失败');
        }
        
        return '敏感词检测正常工作';
      }
    },
    {
      name: 'XSS攻击防护测试',
      test: async () => {
        const response = await fetch(`${TEST_CONFIG.baseUrl}/api/content/validate`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ content: '<script>alert("xss")</script>' })
        });
        
        const result = await response.json();
        if (result.isValid) {
          throw new Error('XSS检测失败');
        }
        
        return 'XSS防护正常工作';
      }
    }
  ];
  
  return await executeTests(tests);
}

/**
 * 邀请系统集成测试
 */
async function testInvitationSystem() {
  const tests = [
    {
      name: '邀请码生成API',
      test: async () => {
        const response = await fetch(`${TEST_CONFIG.baseUrl}/api/invite/generate`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId: 'test-user-1', type: 'standard' })
        });
        
        if (!response.ok) {
          throw new Error(`API响应错误: ${response.status}`);
        }
        
        const result = await response.json();
        if (!result.code) {
          throw new Error('邀请码生成失败');
        }
        
        return `邀请码生成成功: ${result.code}`;
      }
    },
    {
      name: '邀请统计API',
      test: async () => {
        const response = await fetch(`${TEST_CONFIG.baseUrl}/api/invite/stats/test-user-1`);
        
        if (!response.ok) {
          throw new Error(`API响应错误: ${response.status}`);
        }
        
        const result = await response.json();
        if (!result.hasOwnProperty('totalInvites')) {
          throw new Error('统计数据格式错误');
        }
        
        return '邀请统计API正常工作';
      }
    },
    {
      name: '通知系统API',
      test: async () => {
        const response = await fetch(`${TEST_CONFIG.baseUrl}/api/notifications`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: 'test-user-1',
            type: 'invite_success',
            title: '测试通知',
            message: '这是一个测试通知'
          })
        });
        
        if (!response.ok) {
          throw new Error(`API响应错误: ${response.status}`);
        }
        
        return '通知系统API正常工作';
      }
    }
  ];
  
  return await executeTests(tests);
}

/**
 * API端点测试
 */
async function testApiEndpoints() {
  const endpoints = [
    { path: '/api/health', method: 'GET' },
    { path: '/api/ready', method: 'GET' },
    { path: '/api/metrics', method: 'GET' },
  ];
  
  const tests = endpoints.map(endpoint => ({
    name: `${endpoint.method} ${endpoint.path}`,
    test: async () => {
      const response = await fetch(`${TEST_CONFIG.baseUrl}${endpoint.path}`, {
        method: endpoint.method
      });
      
      if (!response.ok) {
        throw new Error(`API响应错误: ${response.status}`);
      }
      
      return `${endpoint.path} 正常响应`;
    }
  }));
  
  return await executeTests(tests);
}

/**
 * 用户流程测试
 */
async function testUserFlows() {
  const tests = [
    {
      name: '首页加载测试',
      test: async () => {
        const response = await fetch(`${TEST_CONFIG.baseUrl}/`);
        
        if (!response.ok) {
          throw new Error(`页面加载失败: ${response.status}`);
        }
        
        const html = await response.text();
        if (!html.includes('<!DOCTYPE html>')) {
          throw new Error('页面内容异常');
        }
        
        return '首页加载正常';
      }
    },
    {
      name: '邀请页面加载测试',
      test: async () => {
        const response = await fetch(`${TEST_CONFIG.baseUrl}/invitation`);
        
        if (!response.ok) {
          throw new Error(`页面加载失败: ${response.status}`);
        }
        
        return '邀请页面加载正常';
      }
    },
    {
      name: '管理后台加载测试',
      test: async () => {
        const response = await fetch(`${TEST_CONFIG.baseUrl}/admin`);
        
        if (!response.ok) {
          throw new Error(`页面加载失败: ${response.status}`);
        }
        
        return '管理后台加载正常';
      }
    }
  ];
  
  return await executeTests(tests);
}

/**
 * 执行测试列表
 */
async function executeTests(tests) {
  let passed = 0;
  let failed = 0;
  const results = [];
  
  for (const test of tests) {
    try {
      console.log(`  🔍 ${test.name}`);
      const result = await test.test();
      console.log(`  ✅ ${test.name} - ${result}`);
      results.push({ name: test.name, status: 'passed', result });
      passed++;
    } catch (error) {
      console.log(`  ❌ ${test.name} - ${error.message}`);
      results.push({ name: test.name, status: 'failed', error: error.message });
      failed++;
    }
  }
  
  return { passed, failed, tests: results };
}

/**
 * 主测试流程
 */
async function runIntegrationTests() {
  let server = null;
  
  try {
    // 启动服务器
    server = await startDevServer();
    
    // 等待服务器就绪
    console.log('⏳ 等待服务器就绪...');
    const isReady = await waitForServer(TEST_CONFIG.baseUrl);
    if (!isReady) {
      throw new Error('服务器启动失败');
    }
    
    console.log('✅ 服务器就绪，开始测试\n');
    
    // 执行所有测试套件
    for (const suiteName of TEST_CONFIG.testSuites) {
      const result = await runTestSuite(suiteName);
      testResults.passed += result.passed;
      testResults.failed += result.failed;
      testResults.tests.push(...result.tests);
    }
    
    // 生成测试报告
    console.log('\n📊 集成测试结果汇总');
    console.log('=' .repeat(50));
    console.log(`✅ 通过: ${testResults.passed}`);
    console.log(`❌ 失败: ${testResults.failed}`);
    console.log(`📈 成功率:
      ${((testResults.passed / (testResults.passed + testResults.failed)) * 100).toFixed(1)}%`);
    
    // 保存测试报告
    const reportData = {
      timestamp: new Date().toISOString(),
      testType: 'integration',
      summary: {
        passed: testResults.passed,
        failed: testResults.failed,
        successRate:
          ((testResults.passed / (testResults.passed + testResults.failed)) * 100).toFixed(1) + '%'
      },
      tests: testResults.tests
    };
    
    fs.writeFileSync(
      path.join(__dirname, '../INTEGRATION_TEST_REPORT.json'),
      JSON.stringify(reportData, null, 2)
    );
    
    console.log('\n📄 详细报告已保存到: INTEGRATION_TEST_REPORT.json');
    
    return testResults.failed === 0;
    
  } catch (error) {
    console.error('❌ 集成测试失败:', error.message);
    return false;
  } finally {
    // 清理服务器
    if (server) {
      console.log('\n🔧 关闭开发服务器...');
      server.kill();
    }
  }
}

// 执行测试
if (require.main === module) {
  runIntegrationTests()
    .then(success => {
      process.exit(success ? 0 : 1);
    })
    .catch(error => {
      console.error('测试执行失败:', error);
      process.exit(1);
    });
}

module.exports = { runIntegrationTests };