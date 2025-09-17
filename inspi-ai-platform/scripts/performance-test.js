#!/usr/bin/env node

/**
 * 性能压测脚本 - 负载测试和性能优化
 */

const { execSync, spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const http = require('http');
const https = require('https');

console.log('⚡ 开始性能压测 - 负载测试和性能优化...\n');

// 性能测试配置
const PERF_CONFIG = {
  baseUrl: 'http://localhost:3000',
  concurrency: 10,        // 并发用户数
  duration: 60,           // 测试持续时间(秒)
  rampUp: 10,            // 用户增长时间(秒)
  testScenarios: [
    'api-load-test',
    'content-validation-stress',
    'invitation-system-load',
    'database-performance',
    'memory-usage-test'
  ]
};

// 性能指标记录
const perfMetrics = {
  requests: {
    total: 0,
    successful: 0,
    failed: 0,
    avgResponseTime: 0,
    maxResponseTime: 0,
    minResponseTime: Infinity
  },
  throughput: {
    requestsPerSecond: 0,
    bytesPerSecond: 0
  },
  resources: {
    maxMemoryUsage: 0,
    avgCpuUsage: 0,
    peakCpuUsage: 0
  },
  scenarios: []
};

/**
 * HTTP请求性能测试
 */
async function performanceRequest(url, options = {}) {
  const startTime = Date.now();
  
  return new Promise((resolve, reject) => {
    const protocol = url.startsWith('https') ? https : http;
    
    const req = protocol.request(url, {
      method: options.method || 'GET',
      headers: options.headers || {},
      timeout: options.timeout || 10000
    }, (res) => {
      let data = '';
      
      res.on('data', chunk => {
        data += chunk;
      });
      
      res.on('end', () => {
        const endTime = Date.now();
        const responseTime = endTime - startTime;
        
        resolve({
          statusCode: res.statusCode,
          responseTime,
          dataSize: data.length,
          success: res.statusCode >= 200 && res.statusCode < 400
        });
      });
    });
    
    req.on('error', (error) => {
      const endTime = Date.now();
      const responseTime = endTime - startTime;
      
      reject({
        error: error.message,
        responseTime,
        success: false
      });
    });
    
    req.on('timeout', () => {
      req.destroy();
      reject({
        error: 'Request timeout',
        responseTime: options.timeout || 10000,
        success: false
      });
    });
    
    if (options.body) {
      req.write(JSON.stringify(options.body));
    }
    
    req.end();
  });
}

/**
 * API负载测试
 */
async function apiLoadTest() {
  console.log('🔥 API负载测试');
  
  const endpoints = [
    { path: '/api/health', method: 'GET' },
    { path: '/api/content/validate', method: 'POST', body: { content: '测试内容' } },
    { path: '/api/invite/stats/test-user', method: 'GET' },
    { path: '/api/notifications', method: 'GET' }
  ];
  
  const results = [];
  const startTime = Date.now();
  
  // 并发请求测试
  for (let i = 0; i < PERF_CONFIG.concurrency; i++) {
    const promises = endpoints.map(async (endpoint) => {
      const requests = [];
      
      // 每个端点发送多个请求
      for (let j = 0; j < 10; j++) {
        try {
          const result = await performanceRequest(
            `${PERF_CONFIG.baseUrl}${endpoint.path}`,
            {
              method: endpoint.method,
              headers: endpoint.method === 'POST' ? { 'Content-Type': 'application/json' } : {},
              body: endpoint.body
            }
          );
          requests.push(result);
        } catch (error) {
          requests.push(error);
        }
      }
      
      return { endpoint: endpoint.path, requests };
    });
    
    const endpointResults = await Promise.all(promises);
    results.push(...endpointResults);
  }
  
  const endTime = Date.now();
  const totalTime = (endTime - startTime) / 1000;
  
  // 计算性能指标
  let totalRequests = 0;
  let successfulRequests = 0;
  let totalResponseTime = 0;
  let maxResponseTime = 0;
  let minResponseTime = Infinity;
  
  results.forEach(endpointResult => {
    endpointResult.requests.forEach(req => {
      totalRequests++;
      if (req.success) successfulRequests++;
      totalResponseTime += req.responseTime;
      maxResponseTime = Math.max(maxResponseTime, req.responseTime);
      minResponseTime = Math.min(minResponseTime, req.responseTime);
    });
  });
  
  const avgResponseTime = totalResponseTime / totalRequests;
  const requestsPerSecond = totalRequests / totalTime;
  
  console.log(`  📊 总请求数: ${totalRequests}`);
  console.log(`  ✅ 成功请求: ${successfulRequests} (${((successfulRequests/totalRequests)*100).toFixed(1)}%)`);
  console.log(`  ⏱️  平均响应时间: ${avgResponseTime.toFixed(2)}ms`);
  console.log(`  🚀 吞吐量: ${requestsPerSecond.toFixed(2)} req/s`);
  
  return {
    name: 'API负载测试',
    totalRequests,
    successfulRequests,
    avgResponseTime,
    maxResponseTime,
    minResponseTime,
    requestsPerSecond,
    successRate: (successfulRequests/totalRequests)*100
  };
}

/**
 * 内容验证压力测试
 */
async function contentValidationStressTest() {
  console.log('🛡️ 内容验证压力测试');
  
  const testContents = [
    '正常的测试内容',
    '这个白痴真是垃圾',
    '<script>alert("xss")</script>',
    'a'.repeat(1000), // 长文本
    '包含特殊字符的内容 @#$%^&*()',
    '多行内容\n第二行\n第三行'
  ];
  
  const results = [];
  const startTime = Date.now();
  
  // 并发内容验证测试
  const promises = [];
  for (let i = 0; i < PERF_CONFIG.concurrency; i++) {
    for (const content of testContents) {
      promises.push(
        performanceRequest(
          `${PERF_CONFIG.baseUrl}/api/content/validate`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: { content }
          }
        ).catch(error => error)
      );
    }
  }
  
  const responses = await Promise.all(promises);
  const endTime = Date.now();
  
  const totalTime = (endTime - startTime) / 1000;
  const successfulRequests = responses.filter(r => r.success).length;
  const avgResponseTime = responses.reduce((sum, r) => sum + r.responseTime, 0) / responses.length;
  
  console.log(`  📊 内容验证请求: ${responses.length}`);
  console.log(`  ✅ 成功验证: ${successfulRequests} (${((successfulRequests/responses.length)*100).toFixed(1)}%)`);
  console.log(`  ⏱️  平均验证时间: ${avgResponseTime.toFixed(2)}ms`);
  
  return {
    name: '内容验证压力测试',
    totalRequests: responses.length,
    successfulRequests,
    avgResponseTime,
    successRate: (successfulRequests/responses.length)*100
  };
}

/**
 * 邀请系统负载测试
 */
async function invitationSystemLoadTest() {
  console.log('🎁 邀请系统负载测试');
  
  const operations = [
    { path: '/api/invite/generate', method: 'POST', body: { userId: 'load-test-user', type: 'standard' } },
    { path: '/api/invite/stats/load-test-user', method: 'GET' },
    { path: '/api/activities', method: 'GET' },
    { path: '/api/notifications', method: 'POST', body: { userId: 'load-test-user', type: 'test', title: '测试', message: '负载测试' } }
  ];
  
  const results = [];
  const startTime = Date.now();
  
  // 模拟多用户并发操作
  const promises = [];
  for (let i = 0; i < PERF_CONFIG.concurrency; i++) {
    for (const op of operations) {
      promises.push(
        performanceRequest(
          `${PERF_CONFIG.baseUrl}${op.path}`,
          {
            method: op.method,
            headers: op.method === 'POST' ? { 'Content-Type': 'application/json' } : {},
            body: op.body
          }
        ).catch(error => error)
      );
    }
  }
  
  const responses = await Promise.all(promises);
  const endTime = Date.now();
  
  const totalTime = (endTime - startTime) / 1000;
  const successfulRequests = responses.filter(r => r.success).length;
  const avgResponseTime = responses.reduce((sum, r) => sum + r.responseTime, 0) / responses.length;
  
  console.log(`  📊 邀请系统操作: ${responses.length}`);
  console.log(`  ✅ 成功操作: ${successfulRequests} (${((successfulRequests/responses.length)*100).toFixed(1)}%)`);
  console.log(`  ⏱️  平均响应时间: ${avgResponseTime.toFixed(2)}ms`);
  
  return {
    name: '邀请系统负载测试',
    totalRequests: responses.length,
    successfulRequests,
    avgResponseTime,
    successRate: (successfulRequests/responses.length)*100
  };
}

/**
 * 数据库性能测试
 */
async function databasePerformanceTest() {
  console.log('🗄️ 数据库性能测试');
  
  // 模拟数据库密集型操作
  const dbOperations = [
    { path: '/api/invite/history/test-user', method: 'GET' },
    { path: '/api/invite/leaderboard', method: 'GET' },
    { path: '/api/activities', method: 'GET' },
    { path: '/api/notifications', method: 'GET' }
  ];
  
  const results = [];
  const startTime = Date.now();
  
  // 高并发数据库查询
  const promises = [];
  for (let i = 0; i < PERF_CONFIG.concurrency * 2; i++) { // 增加并发数测试数据库
    for (const op of dbOperations) {
      promises.push(
        performanceRequest(`${PERF_CONFIG.baseUrl}${op.path}`, { method: op.method })
        .catch(error => error)
      );
    }
  }
  
  const responses = await Promise.all(promises);
  const endTime = Date.now();
  
  const totalTime = (endTime - startTime) / 1000;
  const successfulRequests = responses.filter(r => r.success).length;
  const avgResponseTime = responses.reduce((sum, r) => sum + r.responseTime, 0) / responses.length;
  
  console.log(`  📊 数据库查询: ${responses.length}`);
  console.log(`  ✅ 成功查询: ${successfulRequests} (${((successfulRequests/responses.length)*100).toFixed(1)}%)`);
  console.log(`  ⏱️  平均查询时间: ${avgResponseTime.toFixed(2)}ms`);
  
  return {
    name: '数据库性能测试',
    totalRequests: responses.length,
    successfulRequests,
    avgResponseTime,
    successRate: (successfulRequests/responses.length)*100
  };
}

/**
 * 内存使用测试
 */
async function memoryUsageTest() {
  console.log('💾 内存使用测试');
  
  const initialMemory = process.memoryUsage();
  console.log(`  📊 初始内存使用: ${(initialMemory.heapUsed / 1024 / 1024).toFixed(2)} MB`);
  
  // 模拟内存密集型操作
  const largeData = [];
  for (let i = 0; i < 1000; i++) {
    largeData.push({
      id: i,
      content: 'x'.repeat(1000),
      timestamp: new Date(),
      metadata: { test: true, index: i }
    });
  }
  
  const afterAllocationMemory = process.memoryUsage();
  console.log(`  📊 分配后内存使用: ${(afterAllocationMemory.heapUsed / 1024 / 1024).toFixed(2)} MB`);
  
  // 清理内存
  largeData.length = 0;
  global.gc && global.gc(); // 如果启用了--expose-gc
  
  const afterCleanupMemory = process.memoryUsage();
  console.log(`  📊 清理后内存使用: ${(afterCleanupMemory.heapUsed / 1024 / 1024).toFixed(2)} MB`);
  
  return {
    name: '内存使用测试',
    initialMemory: initialMemory.heapUsed,
    peakMemory: afterAllocationMemory.heapUsed,
    finalMemory: afterCleanupMemory.heapUsed,
    memoryIncrease: afterAllocationMemory.heapUsed - initialMemory.heapUsed
  };
}

/**
 * 执行性能测试场景
 */
async function runPerformanceScenario(scenarioName) {
  console.log(`\n⚡ 执行性能测试: ${scenarioName}`);
  
  try {
    switch (scenarioName) {
      case 'api-load-test':
        return await apiLoadTest();
      case 'content-validation-stress':
        return await contentValidationStressTest();
      case 'invitation-system-load':
        return await invitationSystemLoadTest();
      case 'database-performance':
        return await databasePerformanceTest();
      case 'memory-usage-test':
        return await memoryUsageTest();
      default:
        throw new Error(`未知的性能测试场景: ${scenarioName}`);
    }
  } catch (error) {
    console.error(`❌ 性能测试失败: ${scenarioName} - ${error.message}`);
    return { name: scenarioName, error: error.message, success: false };
  }
}

/**
 * 等待服务器启动
 */
async function waitForServer(url, timeout = 30000) {
  const start = Date.now();
  
  while (Date.now() - start < timeout) {
    try {
      await performanceRequest(url);
      return true;
    } catch (error) {
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }
  return false;
}

/**
 * 主性能测试流程
 */
async function runPerformanceTests() {
  let server = null;
  
  try {
    // 启动服务器
    console.log('🔧 启动开发服务器进行性能测试...');
    server = spawn('npm', ['run', 'dev'], {
      stdio: 'pipe',
      cwd: path.join(__dirname, '..')
    });
    
    // 等待服务器就绪
    console.log('⏳ 等待服务器就绪...');
    const isReady = await waitForServer(PERF_CONFIG.baseUrl);
    if (!isReady) {
      throw new Error('服务器启动失败');
    }
    
    console.log('✅ 服务器就绪，开始性能测试');
    
    // 执行所有性能测试场景
    const results = [];
    for (const scenarioName of PERF_CONFIG.testScenarios) {
      const result = await runPerformanceScenario(scenarioName);
      results.push(result);
      perfMetrics.scenarios.push(result);
    }
    
    // 生成性能测试报告
    console.log('\n📊 性能测试结果汇总');
    console.log('=' .repeat(60));
    
    results.forEach(result => {
      if (result.success !== false) {
        console.log(`\n🎯 ${result.name}:`);
        if (result.totalRequests) {
          console.log(`  📊 总请求数: ${result.totalRequests}`);
          console.log(`  ✅ 成功率: ${result.successRate?.toFixed(1)}%`);
          console.log(`  ⏱️  平均响应时间: ${result.avgResponseTime?.toFixed(2)}ms`);
          if (result.requestsPerSecond) {
            console.log(`  🚀 吞吐量: ${result.requestsPerSecond.toFixed(2)} req/s`);
          }
        }
        if (result.memoryIncrease) {
          console.log(`  💾 内存增长: ${(result.memoryIncrease / 1024 / 1024).toFixed(2)} MB`);
        }
      } else {
        console.log(`\n❌ ${result.name}: ${result.error}`);
      }
    });
    
    // 保存性能测试报告
    const reportData = {
      timestamp: new Date().toISOString(),
      testType: 'performance',
      config: PERF_CONFIG,
      results: results,
      summary: {
        totalScenarios: results.length,
        successfulScenarios: results.filter(r => r.success !== false).length,
        avgResponseTime: results.reduce((sum, r) => sum + (r.avgResponseTime || 0), 0) / results.length
      }
    };
    
    fs.writeFileSync(
      path.join(__dirname, '../PERFORMANCE_TEST_REPORT.json'),
      JSON.stringify(reportData, null, 2)
    );
    
    console.log('\n📄 详细报告已保存到: PERFORMANCE_TEST_REPORT.json');
    
    return results.every(r => r.success !== false);
    
  } catch (error) {
    console.error('❌ 性能测试失败:', error.message);
    return false;
  } finally {
    // 清理服务器
    if (server) {
      console.log('\n🔧 关闭开发服务器...');
      server.kill();
    }
  }
}

// 执行性能测试
if (require.main === module) {
  runPerformanceTests()
    .then(success => {
      process.exit(success ? 0 : 1);
    })
    .catch(error => {
      console.error('性能测试执行失败:', error);
      process.exit(1);
    });
}

module.exports = { runPerformanceTests };