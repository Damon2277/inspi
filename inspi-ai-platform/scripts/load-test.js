/**
 * 负载测试脚本
 * 使用Artillery.js进行负载测试和性能调优
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// 测试配置
const TEST_CONFIG = {
  target: process.env.TEST_TARGET || 'http://localhost:3000',
  phases: [
    { duration: 60, arrivalRate: 1, name: 'warm-up' },
    { duration: 120, arrivalRate: 5, name: 'ramp-up' },
    { duration: 300, arrivalRate: 10, name: 'sustained-load' },
    { duration: 120, arrivalRate: 20, name: 'peak-load' },
    { duration: 60, arrivalRate: 1, name: 'cool-down' },
  ],
  payload: {
    path: path.join(__dirname, 'test-data.csv'),
    fields: ['email', 'password', 'name'],
  },
};

// 生成Artillery配置文件
function generateArtilleryConfig() {
  const config = {
    config: {
      target: TEST_CONFIG.target,
      phases: TEST_CONFIG.phases,
      defaults: {
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'Artillery Load Test',
        },
      },
      plugins: {
        'artillery-plugin-metrics-by-endpoint': {},
        'artillery-plugin-cloudwatch': {
          namespace: 'InspiAI/LoadTest',
        },
      },
      processor: path.join(__dirname, 'load-test-processor.js'),
    },
    scenarios: [
      {
        name: '主页访问',
        weight: 30,
        flow: [
          {
            get: {
              url: '/',
              capture: {
                json: '$.title',
                as: 'pageTitle',
              },
            },
          },
          {
            think: 2,
          },
        ],
      },
      {
        name: '用户注册流程',
        weight: 10,
        flow: [
          {
            post: {
              url: '/api/auth/register',
              json: {
                email: '{{ email }}',
                password: '{{ password }}',
                name: '{{ name }}',
              },
              capture: {
                json: '$.token',
                as: 'authToken',
              },
            },
          },
          {
            think: 1,
          },
        ],
      },
      {
        name: '用户登录流程',
        weight: 20,
        flow: [
          {
            post: {
              url: '/api/auth/login',
              json: {
                email: 'test@example.com',
                password: 'testpassword123',
              },
              capture: {
                json: '$.token',
                as: 'authToken',
              },
            },
          },
          {
            think: 1,
          },
          {
            get: {
              url: '/api/user/profile',
              headers: {
                Authorization: 'Bearer {{ authToken }}',
              },
            },
          },
        ],
      },
      {
        name: '创作页面访问',
        weight: 25,
        flow: [
          {
            get: {
              url: '/create',
            },
          },
          {
            think: 3,
          },
          {
            get: {
              url: '/api/templates',
            },
          },
        ],
      },
      {
        name: '社区广场浏览',
        weight: 30,
        flow: [
          {
            get: {
              url: '/square',
            },
          },
          {
            think: 2,
          },
          {
            get: {
              url: '/api/posts?page=1&limit=10',
            },
          },
          {
            think: 1,
          },
          {
            get: {
              url: '/api/posts/search?q=AI创作',
            },
          },
        ],
      },
      {
        name: '作品管理',
        weight: 15,
        flow: [
          {
            post: {
              url: '/api/auth/login',
              json: {
                email: 'test@example.com',
                password: 'testpassword123',
              },
              capture: {
                json: '$.token',
                as: 'authToken',
              },
            },
          },
          {
            get: {
              url: '/works',
              headers: {
                Authorization: 'Bearer {{ authToken }}',
              },
            },
          },
          {
            think: 2,
          },
          {
            get: {
              url: '/api/works',
              headers: {
                Authorization: 'Bearer {{ authToken }}',
              },
            },
          },
        ],
      },
      {
        name: 'AI创作功能',
        weight: 10,
        flow: [
          {
            post: {
              url: '/api/auth/login',
              json: {
                email: 'test@example.com',
                password: 'testpassword123',
              },
              capture: {
                json: '$.token',
                as: 'authToken',
              },
            },
          },
          {
            post: {
              url: '/api/ai/generate',
              headers: {
                Authorization: 'Bearer {{ authToken }}',
              },
              json: {
                type: 'text',
                prompt: '创建一个关于数学的教学内容',
                options: {
                  length: 'medium',
                  style: 'educational',
                },
              },
            },
          },
          {
            think: 5,
          },
        ],
      },
    ],
  };

  const configPath = path.join(__dirname, 'artillery-config.yml');
  const yamlContent = `# Artillery Load Test Configuration
# Generated automatically - do not edit manually

config:
  target: ${config.config.target}
  phases:
${config.config.phases.map(phase => `    - duration: ${phase.duration}
      arrivalRate: ${phase.arrivalRate}
      name: ${phase.name}`).join('\n')}
  defaults:
    headers:
      Content-Type: application/json
      User-Agent: Artillery Load Test
  plugins:
    artillery-plugin-metrics-by-endpoint: {}
  processor: ${config.config.processor}

scenarios:
${config.scenarios.map(scenario => `  - name: "${scenario.name}"
    weight: ${scenario.weight}
    flow:
${scenario.flow.map(step => {
  if (step.get) {
    return `      - get:
          url: "${step.get.url}"${step.get.headers ? `
          headers:
${Object.entries(step.get.headers).map(([key,
  value]) => `            ${key}: "${value}"`).join('\n')}` : ''}${step.get.capture ? `
          capture:
            json: "${step.get.capture.json}"
            as: "${step.get.capture.as}"` : ''}`;
  } else if (step.post) {
    return `      - post:
          url: "${step.post.url}"${step.post.headers ? `
          headers:
${Object.entries(step.post.headers).map(([key,
  value]) => `            ${key}: "${value}"`).join('\n')}` : ''}
          json:
${Object.entries(step.post.json).map(([key,
  value]) => `            ${key}: "${value}"`).join('\n')}${step.post.capture ? `
          capture:
            json: "${step.post.capture.json}"
            as: "${step.post.capture.as}"` : ''}`;
  } else if (step.think) {
    return `      - think: ${step.think}`;
  }
}).join('\n')}
`).join('')}`;

  fs.writeFileSync(configPath, yamlContent);
  return configPath;
}

// 生成测试数据
function generateTestData() {
  const testData = [];
  const domains = ['gmail.com', 'yahoo.com', 'hotmail.com', 'outlook.com'];
  const names = ['张三', '李四', '王五', '赵六', '钱七', '孙八', '周九', '吴十'];

  for (let i = 0; i < 1000; i++) {
    const name = names[Math.floor(Math.random() * names.length)];
    const domain = domains[Math.floor(Math.random() * domains.length)];
    const email = `test${i}@${domain}`;
    const password = `password${i}`;

    testData.push(`${email},${password},${name}`);
  }

  const csvContent = 'email,password,name\n' + testData.join('\n');
  const csvPath = path.join(__dirname, 'test-data.csv');
  fs.writeFileSync(csvPath, csvContent);
  
  return csvPath;
}

// 创建处理器文件
function createProcessor() {
  const processorContent = `
/**
 * Artillery测试处理器
 * 提供自定义函数和数据处理
 */

module.exports = {
  // 生成随机用户数据
  generateRandomUser: function(requestParams, context, ee, next) {
    const names = ['张三', '李四', '王五', '赵六', '钱七'];
    const domains = ['gmail.com', 'yahoo.com', 'hotmail.com'];
    
    context.vars.randomEmail = \`test\${Math.floor(Math.random() * 10000)}@\${domains[Math.floor(Math.random() * domains.length)]}\`;
    context.vars.randomName = names[Math.floor(Math.random() * names.length)];
    context.vars.randomPassword = \`password\${Math.floor(Math.random() * 10000)}\`;
    
    return next();
  },

  // 记录响应时间
  logResponseTime: function(requestParams, response, context, ee, next) {
    if (response.timings) {
      console.log(\`Response time: \${response.timings.response}ms for \${requestParams.url}\`);
    }
    return next();
  },

  // 验证响应状态
  validateResponse: function(requestParams, response, context, ee, next) {
    if (response.statusCode >= 400) {
      console.error(\`Error response: \${response.statusCode} for \${requestParams.url}\`);
      ee.emit('error', new Error(\`HTTP \${response.statusCode}\`));
    }
    return next();
  },

  // 设置认证头
  setAuthHeader: function(requestParams, context, ee, next) {
    if (context.vars.authToken) {
      requestParams.headers = requestParams.headers || {};
      requestParams.headers.Authorization = \`Bearer \${context.vars.authToken}\`;
    }
    return next();
  }
};
`;

  const processorPath = path.join(__dirname, 'load-test-processor.js');
  fs.writeFileSync(processorPath, processorContent);
  return processorPath;
}

// 运行负载测试
async function runLoadTest() {
  console.log('🚀 开始负载测试...');
  
  try {
    // 检查Artillery是否安装
    try {
      execSync('npx artillery --version', { stdio: 'ignore' });
    } catch (error) {
      console.log('📦 安装Artillery...');
      execSync('npm install -g artillery', { stdio: 'inherit' });
    }

    // 生成配置文件和测试数据
    console.log('📝 生成测试配置...');
    const configPath = generateArtilleryConfig();
    const dataPath = generateTestData();
    const processorPath = createProcessor();

    console.log(`✅ 配置文件: ${configPath}`);
    console.log(`✅ 测试数据: ${dataPath}`);
    console.log(`✅ 处理器: ${processorPath}`);

    // 运行测试
    console.log('🔥 执行负载测试...');
    const reportPath = path.join(__dirname, `load-test-report-${Date.now()}.json`);
    
    const command = `npx artillery run ${configPath} --output ${reportPath}`;
    console.log(`执行命令: ${command}`);
    
    execSync(command, { stdio: 'inherit' });

    // 生成HTML报告
    console.log('📊 生成测试报告...');
    const htmlReportPath = reportPath.replace('.json', '.html');
    execSync(`npx artillery report ${reportPath} --output ${htmlReportPath}`, { stdio: 'inherit' });

    console.log(`✅ 负载测试完成！`);
    console.log(`📊 JSON报告: ${reportPath}`);
    console.log(`📊 HTML报告: ${htmlReportPath}`);

    // 分析结果
    analyzeResults(reportPath);

  } catch (error) {
    console.error('❌ 负载测试失败:', error.message);
    process.exit(1);
  }
}

// 分析测试结果
function analyzeResults(reportPath) {
  try {
    const report = JSON.parse(fs.readFileSync(reportPath, 'utf8'));
    const aggregate = report.aggregate;

    console.log('\n📈 测试结果分析:');
    console.log('==================');
    console.log(`总请求数: ${aggregate.counters['http.requests']}`);
    console.log(`成功请求: ${aggregate.counters['http.responses']}`);
    console.log(`错误数量: ${aggregate.counters['http.request_rate'] || 0}`);
    
    if (aggregate.histograms['http.response_time']) {
      const responseTime = aggregate.histograms['http.response_time'];
      console.log(`平均响应时间: ${responseTime.mean}ms`);
      console.log(`P95响应时间: ${responseTime.p95}ms`);
      console.log(`P99响应时间: ${responseTime.p99}ms`);
      console.log(`最大响应时间: ${responseTime.max}ms`);
    }

    // 性能建议
    console.log('\n💡 性能建议:');
    if (aggregate.histograms['http.response_time']?.p95 > 2000) {
      console.log('⚠️  P95响应时间超过2秒，建议优化数据库查询和缓存策略');
    }
    if (aggregate.counters['http.request_rate'] > 0.05) {
      console.log('⚠️  错误率较高，建议检查错误日志和系统资源');
    }
    if (aggregate.histograms['http.response_time']?.mean > 500) {
      console.log('⚠️  平均响应时间较慢，建议启用CDN和优化静态资源');
    }

  } catch (error) {
    console.error('分析报告失败:', error.message);
  }
}

// 清理测试文件
function cleanup() {
  const filesToClean = [
    'artillery-config.yml',
    'test-data.csv',
    'load-test-processor.js'
  ];

  filesToClean.forEach(file => {
    const filePath = path.join(__dirname, file);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
  });
}

// 主函数
async function main() {
  const args = process.argv.slice(2);
  const command = args[0];

  switch (command) {
    case 'run':
      await runLoadTest();
      break;
    case 'clean':
      cleanup();
      console.log('✅ 清理完成');
      break;
    default:
      console.log('使用方法:');
      console.log('  node load-test.js run    - 运行负载测试');
      console.log('  node load-test.js clean  - 清理测试文件');
      break;
  }
}

// 处理未捕获的异常
process.on('uncaughtException', (error) => {
  console.error('未捕获的异常:', error);
  cleanup();
  process.exit(1);
});

process.on('SIGINT', () => {
  console.log('\n🛑 测试被中断');
  cleanup();
  process.exit(0);
});

// 运行主函数
if (require.main === module) {
  main().catch(error => {
    console.error('执行失败:', error);
    cleanup();
    process.exit(1);
  });
}

module.exports = {
  runLoadTest,
  generateArtilleryConfig,
  generateTestData,
  analyzeResults,
  cleanup
};