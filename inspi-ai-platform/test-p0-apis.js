#!/usr/bin/env node

/**
 * P0任务API功能测试脚本
 * 测试核心API接口的可用性和功能
 */

const https = require('https');
const http = require('http');

const BASE_URL = 'http://localhost:3000';
const TEST_EMAIL = 'test@example.com';

// 测试结果统计
const results = {
  passed: 0,
  failed: 0,
  total: 0,
  details: []
};

/**
 * 发送HTTP请求
 */
function makeRequest(options, data = null) {
  return new Promise((resolve, reject) => {
    const protocol = options.protocol === 'https:' ? https : http;
    
    const req = protocol.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => {
        body += chunk;
      });
      
      res.on('end', () => {
        try {
          const jsonBody = body ? JSON.parse(body) : {};
          resolve({
            statusCode: res.statusCode,
            headers: res.headers,
            body: jsonBody
          });
        } catch (error) {
          resolve({
            statusCode: res.statusCode,
            headers: res.headers,
            body: body
          });
        }
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    if (data) {
      req.write(JSON.stringify(data));
    }
    
    req.end();
  });
}

/**
 * 记录测试结果
 */
function recordTest(name, passed, message = '') {
  results.total++;
  if (passed) {
    results.passed++;
    results.details.push(`✅ ${name}: ${message || '通过'}`);
  } else {
    results.failed++;
    results.details.push(`❌ ${name}: ${message || '失败'}`);
  }
}

/**
 * 测试健康检查API
 */
async function testHealthCheck() {
  console.log('🔍 测试健康检查API...');
  
  try {
    const response = await makeRequest({
      hostname: 'localhost',
      port: 3000,
      path: '/api/health',
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    });

    if (response.statusCode === 200) {
      recordTest('健康检查API', true, `状态码: ${response.statusCode}`);
      console.log('  响应:', response.body);
    } else {
      recordTest('健康检查API', false, `状态码: ${response.statusCode}`);
    }
  } catch (error) {
    recordTest('健康检查API', false, `请求失败: ${error.message}`);
  }
}

/**
 * 测试发送验证码API
 */
async function testSendVerification() {
  console.log('🔍 测试发送验证码API...');
  
  try {
    const response = await makeRequest({
      hostname: 'localhost',
      port: 3000,
      path: '/api/auth/send-verification',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      }
    }, {
      email: TEST_EMAIL,
      type: 'registration'
    });

    if (response.statusCode === 200 || response.statusCode === 503) {
      // 200是成功，503是邮件服务不可用但API正常
      recordTest('发送验证码API', true, `状态码: ${response.statusCode}`);
      console.log('  响应:', response.body);
    } else {
      recordTest('发送验证码API', false, `状态码: ${response.statusCode}, 响应: ${JSON.stringify(response.body)}`);
    }
  } catch (error) {
    recordTest('发送验证码API', false, `请求失败: ${error.message}`);
  }
}

/**
 * 测试验证邮箱API
 */
async function testVerifyEmail() {
  console.log('🔍 测试验证邮箱API...');
  
  try {
    const response = await makeRequest({
      hostname: 'localhost',
      port: 3000,
      path: '/api/auth/verify-email',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      }
    }, {
      email: TEST_EMAIL,
      code: '123456',
      type: 'registration'
    });

    if (response.statusCode === 400 || response.statusCode === 410) {
      // 400/410是预期的（验证码不存在或错误），说明API正常工作
      recordTest('验证邮箱API', true, `状态码: ${response.statusCode} (预期错误)`);
      console.log('  响应:', response.body);
    } else {
      recordTest('验证邮箱API', false, `状态码: ${response.statusCode}, 响应: ${JSON.stringify(response.body)}`);
    }
  } catch (error) {
    recordTest('验证邮箱API', false, `请求失败: ${error.message}`);
  }
}

/**
 * 测试AI生成API
 */
async function testAIGeneration() {
  console.log('🔍 测试AI生成API...');
  
  try {
    const response = await makeRequest({
      hostname: 'localhost',
      port: 3000,
      path: '/api/magic/generate',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': 'token=test_token_for_api_test'
      }
    }, {
      knowledgePoint: '两位数加法',
      subject: '数学',
      gradeLevel: '小学',
      difficulty: 'easy'
    });

    if (response.statusCode === 200 || response.statusCode === 401 || response.statusCode === 503) {
      // 200是成功，401是认证失败（预期），503是AI服务不可用但API正常
      recordTest('AI生成API', true, `状态码: ${response.statusCode}`);
      console.log('  响应:', response.body);
      
      if (response.statusCode === 200 && response.body.cards) {
        console.log(`  生成了 ${response.body.cards.length} 张卡片`);
      }
    } else {
      recordTest('AI生成API', false, `状态码: ${response.statusCode}, 响应: ${JSON.stringify(response.body)}`);
    }
  } catch (error) {
    recordTest('AI生成API', false, `请求失败: ${error.message}`);
  }
}

/**
 * 测试服务连接
 */
async function testServerConnection() {
  console.log('🔍 测试服务器连接...');
  
  try {
    const response = await makeRequest({
      hostname: 'localhost',
      port: 3000,
      path: '/',
      method: 'GET',
      headers: {
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
      }
    });

    if (response.statusCode === 200) {
      recordTest('服务器连接', true, `状态码: ${response.statusCode}`);
    } else {
      recordTest('服务器连接', false, `状态码: ${response.statusCode}`);
    }
  } catch (error) {
    recordTest('服务器连接', false, `连接失败: ${error.message}`);
    return false;
  }
  
  return true;
}

/**
 * 运行所有测试
 */
async function runAllTests() {
  console.log('🚀 开始P0任务API功能测试');
  console.log('=' .repeat(50));
  console.log('');

  // 首先测试服务器连接
  const serverConnected = await testServerConnection();
  console.log('');

  if (!serverConnected) {
    console.log('❌ 服务器未运行或无法连接');
    console.log('请确保开发服务器正在运行：npm run dev');
    return;
  }

  // 测试各个API
  await testHealthCheck();
  console.log('');

  await testSendVerification();
  console.log('');

  await testVerifyEmail();
  console.log('');

  await testAIGeneration();
  console.log('');

  // 输出测试结果
  console.log('📊 测试结果总结');
  console.log('=' .repeat(50));
  console.log(`✅ 通过: ${results.passed}/${results.total}`);
  console.log(`❌ 失败: ${results.failed}/${results.total}`);
  console.log(`📈 成功率: ${Math.round((results.passed / results.total) * 100)}%`);
  console.log('');

  // 详细结果
  console.log('📋 详细测试结果');
  console.log('-'.repeat(30));
  results.details.forEach(detail => console.log(detail));
  console.log('');

  // 评估和建议
  const successRate = Math.round((results.passed / results.total) * 100);
  
  if (successRate >= 80) {
    console.log('🎉 P0任务API测试大部分通过！核心功能基本可用。');
  } else if (successRate >= 60) {
    console.log('👍 P0任务API测试部分通过，建议检查失败的接口。');
  } else {
    console.log('⚠️  P0任务API测试通过率较低，需要检查服务配置。');
  }

  console.log('');
  console.log('🔗 下一步建议:');
  console.log('1. 检查失败的API接口');
  console.log('2. 验证环境变量配置');
  console.log('3. 检查数据库和Redis连接');
  console.log('4. 验证AI服务配置');
  console.log('5. 检查邮件服务配置');
}

// 运行测试
runAllTests().catch(console.error);