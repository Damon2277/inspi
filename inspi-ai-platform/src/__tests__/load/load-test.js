/**
 * 负载测试脚本
 * 使用 Artillery.js 进行负载测试
 */

const { execSync } = require('child_process')
const fs = require('fs')
const path = require('path')

// 负载测试配置
const loadTestConfig = {
  config: {
    target: process.env.TARGET_URL || 'http://localhost:3000',
    phases: [
      // 预热阶段
      {
        duration: 60,
        arrivalRate: 5,
        name: '预热阶段'
      },
      // 负载增长阶段
      {
        duration: 300,
        arrivalRate: 10,
        rampTo: 50,
        name: '负载增长阶段'
      },
      // 峰值负载阶段
      {
        duration: 600,
        arrivalRate: 100,
        name: '峰值负载阶段'
      },
      // 压力测试阶段
      {
        duration: 300,
        arrivalRate: 200,
        name: '压力测试阶段'
      },
      // 恢复阶段
      {
        duration: 120,
        arrivalRate: 10,
        name: '恢复阶段'
      }
    ],
    payload: {
      path: './test-data.csv',
      fields: ['email', 'password', 'knowledgePoint']
    },
    plugins: {
      'artillery-plugin-metrics-by-endpoint': {
        useOnlyRequestNames: true
      }
    }
  },
  scenarios: [
    {
      name: '用户注册登录流程',
      weight: 20,
      flow: [
        {
          post: {
            url: '/api/auth/register',
            json: {
              email: '{{ email }}',
              password: '{{ password }}',
              name: 'Load Test User'
            },
            capture: {
              json: '$.token',
              as: 'authToken'
            }
          }
        },
        {
          post: {
            url: '/api/auth/login',
            json: {
              email: '{{ email }}',
              password: '{{ password }}'
            },
            capture: {
              json: '$.token',
              as: 'authToken'
            }
          }
        },
        {
          get: {
            url: '/api/users/profile',
            headers: {
              Authorization: 'Bearer {{ authToken }}'
            }
          }
        }
      ]
    },
    {
      name: 'AI卡片生成流程',
      weight: 30,
      flow: [
        {
          post: {
            url: '/api/auth/login',
            json: {
              email: '{{ email }}',
              password: '{{ password }}'
            },
            capture: {
              json: '$.token',
              as: 'authToken'
            }
          }
        },
        {
          post: {
            url: '/api/magic/generate',
            headers: {
              Authorization: 'Bearer {{ authToken }}'
            },
            json: {
              knowledgePoint: '{{ knowledgePoint }}',
              cardTypes: ['concept', 'example', 'practice', 'extension']
            }
          }
        },
        {
          think: 2
        },
        {
          get: {
            url: '/api/magic/status',
            headers: {
              Authorization: 'Bearer {{ authToken }}'
            }
          }
        }
      ]
    },
    {
      name: '作品浏览流程',
      weight: 25,
      flow: [
        {
          get: {
            url: '/api/works',
            qs: {
              page: 1,
              limit: 20,
              subject: '数学'
            }
          }
        },
        {
          get: {
            url: '/api/works/{{ $randomInt(1, 100) }}'
          }
        },
        {
          get: {
            url: '/api/works/search',
            qs: {
              q: '函数',
              page: 1,
              limit: 10
            }
          }
        }
      ]
    },
    {
      name: '知识图谱操作流程',
      weight: 15,
      flow: [
        {
          post: {
            url: '/api/auth/login',
            json: {
              email: '{{ email }}',
              password: '{{ password }}'
            },
            capture: {
              json: '$.token',
              as: 'authToken'
            }
          }
        },
        {
          get: {
            url: '/api/knowledge-graph',
            headers: {
              Authorization: 'Bearer {{ authToken }}'
            }
          }
        },
        {
          post: {
            url: '/api/knowledge-graph/mount',
            headers: {
              Authorization: 'Bearer {{ authToken }}'
            },
            json: {
              workId: '{{ $randomInt(1, 100) }}',
              nodeId: 'math-functions'
            }
          }
        }
      ]
    },
    {
      name: '静态资源访问',
      weight: 10,
      flow: [
        {
          get: {
            url: '/'
          }
        },
        {
          get: {
            url: '/magic'
          }
        },
        {
          get: {
            url: '/square'
          }
        },
        {
          get: {
            url: '/knowledge-graph'
          }
        }
      ]
    }
  ]
}

// 生成测试数据
function generateTestData() {
  const testData = []
  const knowledgePoints = [
    '二次函数的图像与性质',
    '三角函数基础知识',
    '导数的概念与计算',
    '概率统计基础',
    '向量的运算',
    '数列与数学归纳法',
    '立体几何基础',
    '解析几何',
    '函数的单调性',
    '不等式的解法'
  ]
  
  for (let i = 0; i < 1000; i++) {
    testData.push({
      email: `loadtest${i}@example.com`,
      password: 'LoadTest123!',
      knowledgePoint: knowledgePoints[i % knowledgePoints.length]
    })
  }
  
  // 写入CSV文件
  const csvContent = 'email,password,knowledgePoint\n' + 
    testData.map(row => `${row.email},${row.password},"${row.knowledgePoint}"`).join('\n')
  
  fs.writeFileSync(path.join(__dirname, 'test-data.csv'), csvContent)
  console.log('✅ 测试数据生成完成: 1000条记录')
}

// 运行负载测试
function runLoadTest() {
  console.log('🚀 开始负载测试...')
  
  // 生成测试数据
  generateTestData()
  
  // 写入Artillery配置文件
  const configPath = path.join(__dirname, 'artillery-config.yml')
  const yamlContent = `
config:
  target: ${loadTestConfig.config.target}
  phases:
${loadTestConfig.config.phases.map(phase => `    - duration: ${phase.duration}
      arrivalRate: ${phase.arrivalRate}
      ${phase.rampTo ? `rampTo: ${phase.rampTo}` : ''}
      name: "${phase.name}"`).join('\n')}
  payload:
    path: "./test-data.csv"
    fields:
      - "email"
      - "password"
      - "knowledgePoint"
  plugins:
    artillery-plugin-metrics-by-endpoint:
      useOnlyRequestNames: true

scenarios:
${loadTestConfig.scenarios.map(scenario => `  - name: "${scenario.name}"
    weight: ${scenario.weight}
    flow:
${scenario.flow.map(step => {
  if (step.post) {
    return `      - post:
          url: "${step.post.url}"
          ${step.post.headers ? `headers:\n${Object.entries(step.post.headers).map(([k,v]) => `            ${k}: "${v}"`).join('\n')}` : ''}
          ${step.post.json ? `json:\n${Object.entries(step.post.json).map(([k,v]) => `            ${k}: "${v}"`).join('\n')}` : ''}
          ${step.post.capture ? `capture:\n            json: "${step.post.capture.json}"\n            as: "${step.post.capture.as}"` : ''}`
  } else if (step.get) {
    return `      - get:
          url: "${step.get.url}"
          ${step.get.headers ? `headers:\n${Object.entries(step.get.headers).map(([k,v]) => `            ${k}: "${v}"`).join('\n')}` : ''}
          ${step.get.qs ? `qs:\n${Object.entries(step.get.qs).map(([k,v]) => `            ${k}: ${v}`).join('\n')}` : ''}`
  } else if (step.think) {
    return `      - think: ${step.think}`
  }
}).join('\n')}`).join('\n')}
  `
  
  fs.writeFileSync(configPath, yamlContent)
  
  try {
    // 运行Artillery负载测试
    const result = execSync(`npx artillery run ${configPath} --output load-test-report.json`, {
      encoding: 'utf8',
      cwd: __dirname,
      timeout: 30 * 60 * 1000 // 30分钟超时
    })
    
    console.log('✅ 负载测试完成')
    console.log(result)
    
    // 生成HTML报告
    execSync(`npx artillery report load-test-report.json --output load-test-report.html`, {
      cwd: __dirname
    })
    
    console.log('📊 负载测试报告已生成: load-test-report.html')
    
    // 分析结果
    analyzeLoadTestResults()
    
  } catch (error) {
    console.error('❌ 负载测试失败:', error.message)
    throw error
  }
}

// 分析负载测试结果
function analyzeLoadTestResults() {
  try {
    const reportPath = path.join(__dirname, 'load-test-report.json')
    if (!fs.existsSync(reportPath)) {
      console.warn('⚠️ 负载测试报告文件不存在')
      return
    }
    
    const report = JSON.parse(fs.readFileSync(reportPath, 'utf8'))
    const aggregate = report.aggregate
    
    console.log('\n📈 负载测试结果分析:')
    console.log('='.repeat(50))
    console.log(`总请求数: ${aggregate.counters['http.requests'] || 0}`)
    console.log(`成功请求: ${aggregate.counters['http.responses'] || 0}`)
    console.log(`失败请求: ${(aggregate.counters['http.requests'] || 0) - (aggregate.counters['http.responses'] || 0)}`)
    console.log(`平均响应时间: ${aggregate.latency?.mean?.toFixed(2) || 'N/A'}ms`)
    console.log(`95%响应时间: ${aggregate.latency?.p95?.toFixed(2) || 'N/A'}ms`)
    console.log(`99%响应时间: ${aggregate.latency?.p99?.toFixed(2) || 'N/A'}ms`)
    console.log(`最大响应时间: ${aggregate.latency?.max?.toFixed(2) || 'N/A'}ms`)
    console.log(`RPS (每秒请求数): ${aggregate.rates?.['http.request_rate']?.toFixed(2) || 'N/A'}`)
    
    // 性能基准检查
    const benchmarks = {
      avgResponseTime: 2000, // 2秒
      p95ResponseTime: 5000, // 5秒
      errorRate: 0.05, // 5%
      minRPS: 50 // 最小50 RPS
    }
    
    const avgResponseTime = aggregate.latency?.mean || 0
    const p95ResponseTime = aggregate.latency?.p95 || 0
    const errorRate = ((aggregate.counters['http.requests'] || 0) - (aggregate.counters['http.responses'] || 0)) / (aggregate.counters['http.requests'] || 1)
    const rps = aggregate.rates?.['http.request_rate'] || 0
    
    console.log('\n🎯 性能基准检查:')
    console.log('='.repeat(50))
    console.log(`平均响应时间: ${avgResponseTime <= benchmarks.avgResponseTime ? '✅' : '❌'} ${avgResponseTime.toFixed(2)}ms (基准: ${benchmarks.avgResponseTime}ms)`)
    console.log(`95%响应时间: ${p95ResponseTime <= benchmarks.p95ResponseTime ? '✅' : '❌'} ${p95ResponseTime.toFixed(2)}ms (基准: ${benchmarks.p95ResponseTime}ms)`)
    console.log(`错误率: ${errorRate <= benchmarks.errorRate ? '✅' : '❌'} ${(errorRate * 100).toFixed(2)}% (基准: ${benchmarks.errorRate * 100}%)`)
    console.log(`RPS: ${rps >= benchmarks.minRPS ? '✅' : '❌'} ${rps.toFixed(2)} (基准: ${benchmarks.minRPS})`)
    
    // 生成性能报告
    const performanceReport = {
      timestamp: new Date().toISOString(),
      summary: {
        totalRequests: aggregate.counters['http.requests'] || 0,
        successfulRequests: aggregate.counters['http.responses'] || 0,
        failedRequests: (aggregate.counters['http.requests'] || 0) - (aggregate.counters['http.responses'] || 0),
        avgResponseTime: avgResponseTime,
        p95ResponseTime: p95ResponseTime,
        p99ResponseTime: aggregate.latency?.p99 || 0,
        maxResponseTime: aggregate.latency?.max || 0,
        rps: rps,
        errorRate: errorRate
      },
      benchmarkResults: {
        avgResponseTime: avgResponseTime <= benchmarks.avgResponseTime,
        p95ResponseTime: p95ResponseTime <= benchmarks.p95ResponseTime,
        errorRate: errorRate <= benchmarks.errorRate,
        rps: rps >= benchmarks.minRPS
      },
      overallPass: avgResponseTime <= benchmarks.avgResponseTime && 
                   p95ResponseTime <= benchmarks.p95ResponseTime && 
                   errorRate <= benchmarks.errorRate && 
                   rps >= benchmarks.minRPS
    }
    
    fs.writeFileSync(
      path.join(__dirname, 'performance-summary.json'),
      JSON.stringify(performanceReport, null, 2)
    )
    
    console.log(`\n${performanceReport.overallPass ? '✅' : '❌'} 负载测试${performanceReport.overallPass ? '通过' : '未通过'}所有基准检查`)
    
  } catch (error) {
    console.error('❌ 分析负载测试结果失败:', error.message)
  }
}

// 主执行函数
if (require.main === module) {
  const command = process.argv[2]
  
  switch (command) {
    case 'generate-data':
      generateTestData()
      break
    case 'run':
      runLoadTest()
      break
    case 'analyze':
      analyzeLoadTestResults()
      break
    default:
      console.log('使用方法:')
      console.log('  node load-test.js generate-data  # 生成测试数据')
      console.log('  node load-test.js run           # 运行负载测试')
      console.log('  node load-test.js analyze       # 分析测试结果')
  }
}

module.exports = {
  generateTestData,
  runLoadTest,
  analyzeLoadTestResults
}