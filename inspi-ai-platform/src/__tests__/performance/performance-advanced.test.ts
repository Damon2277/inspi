/**
 * 高级性能测试套件
 * 包含负载测试、压力测试、内存泄漏检测等
 */

import { test, expect } from '@playwright/test'
import { execSync } from 'child_process'
import fs from 'fs'
import path from 'path'

// 性能测试配置
const PERFORMANCE_CONFIG = {
  target: process.env.TARGET_URL || 'http://localhost:3000',
  timeout: 60000,
  retries: 1,
  benchmarks: {
    pageLoad: 3000, // 3秒
    apiResponse: 1000, // 1秒
    memoryUsage: 100, // 100MB
    cpuUsage: 80, // 80%
    networkRequests: 50, // 最大50个请求
    bundleSize: 2048, // 2MB
    firstContentfulPaint: 2000, // 2秒
    largestContentfulPaint: 4000, // 4秒
    cumulativeLayoutShift: 0.1, // 0.1
    firstInputDelay: 100 // 100ms
  }
}

test.describe('高级性能测试', () => {
  test.beforeAll(async () => {
    console.log('🚀 开始高级性能测试...')
  })

  // 页面加载性能测试
  test('页面加载性能测试', async ({ page }) => {
    console.log('📊 测试页面加载性能...')
    
    const pages = [
      '/',
      '/magic',
      '/square',
      '/knowledge-graph',
      '/profile'
    ]
    
    const results = []
    
    for (const pagePath of pages) {
      const startTime = Date.now()
      
      // 监听性能指标
      const performanceMetrics = await page.evaluate(() => {
        return new Promise((resolve) => {
          new PerformanceObserver((list) => {
            const entries = list.getEntries()
            const metrics = {}
            
            entries.forEach((entry) => {
              if (entry.entryType === 'navigation') {
                metrics.domContentLoaded = entry.domContentLoadedEventEnd - entry.domContentLoadedEventStart
                metrics.loadComplete = entry.loadEventEnd - entry.loadEventStart
                metrics.firstByte = entry.responseStart - entry.requestStart
              }
              
              if (entry.entryType === 'paint') {
                if (entry.name === 'first-contentful-paint') {
                  metrics.firstContentfulPaint = entry.startTime
                }
                if (entry.name === 'largest-contentful-paint') {
                  metrics.largestContentfulPaint = entry.startTime
                }
              }
              
              if (entry.entryType === 'layout-shift') {
                metrics.cumulativeLayoutShift = (metrics.cumulativeLayoutShift || 0) + entry.value
              }
            })
            
            resolve(metrics)
          }).observe({ entryTypes: ['navigation', 'paint', 'layout-shift'] })
          
          // 超时保护
          setTimeout(() => resolve({}), 10000)
        })
      })
      
      await page.goto(`${PERFORMANCE_CONFIG.target}${pagePath}`)
      await page.waitForLoadState('networkidle')
      
      const endTime = Date.now()
      const loadTime = endTime - startTime
      
      // 获取Web Vitals
      const webVitals = await page.evaluate(() => {
        return new Promise((resolve) => {
          const vitals = {}
          
          // First Input Delay
          new PerformanceObserver((list) => {
            list.getEntries().forEach((entry) => {
              if (entry.entryType === 'first-input') {
                vitals.firstInputDelay = entry.processingStart - entry.startTime
              }
            })
          }).observe({ entryTypes: ['first-input'] })
          
          // Cumulative Layout Shift
          let clsValue = 0
          new PerformanceObserver((list) => {
            list.getEntries().forEach((entry) => {
              if (!entry.hadRecentInput) {
                clsValue += entry.value
              }
            })
            vitals.cumulativeLayoutShift = clsValue
          }).observe({ entryTypes: ['layout-shift'] })
          
          setTimeout(() => resolve(vitals), 5000)
        })
      })
      
      const result = {
        page: pagePath,
        loadTime,
        performanceMetrics,
        webVitals,
        passed: loadTime <= PERFORMANCE_CONFIG.benchmarks.pageLoad
      }
      
      results.push(result)
      
      console.log(`  📄 ${pagePath}: ${loadTime}ms ${result.passed ? '✅' : '❌'}`)
      
      // 验证性能基准
      expect(loadTime).toBeLessThan(PERFORMANCE_CONFIG.benchmarks.pageLoad)
    }
    
    // 生成性能报告
    generatePerformanceReport('page-load', results)
  })

  // API响应性能测试
  test('API响应性能测试', async ({ page }) => {
    console.log('🔌 测试API响应性能...')
    
    const apiEndpoints = [
      { method: 'GET', url: '/api/health' },
      { method: 'GET', url: '/api/works' },
      { method: 'GET', url: '/api/works/search?q=数学' },
      { method: 'GET', url: '/api/leaderboard' },
      { method: 'POST', url: '/api/auth/login', data: { email: 'test@example.com', password: 'password' } }
    ]
    
    const results = []
    
    for (const endpoint of apiEndpoints) {
      const startTime = Date.now()
      
      let response
      if (endpoint.method === 'GET') {
        response = await page.request.get(`${PERFORMANCE_CONFIG.target}${endpoint.url}`)
      } else if (endpoint.method === 'POST') {
        response = await page.request.post(`${PERFORMANCE_CONFIG.target}${endpoint.url}`, {
          data: endpoint.data
        })
      }
      
      const endTime = Date.now()
      const responseTime = endTime - startTime
      
      const result = {
        endpoint: `${endpoint.method} ${endpoint.url}`,
        responseTime,
        status: response.status(),
        passed: responseTime <= PERFORMANCE_CONFIG.benchmarks.apiResponse
      }
      
      results.push(result)
      
      console.log(`  🔌 ${result.endpoint}: ${responseTime}ms (${result.status}) ${result.passed ? '✅' : '❌'}`)
      
      // 验证响应时间基准
      expect(responseTime).toBeLessThan(PERFORMANCE_CONFIG.benchmarks.apiResponse)
    }
    
    generatePerformanceReport('api-response', results)
  })

  // 内存使用测试
  test('内存使用测试', async ({ page }) => {
    console.log('🧠 测试内存使用...')
    
    await page.goto(`${PERFORMANCE_CONFIG.target}/`)
    
    // 执行内存密集操作
    const memoryTests = [
      async () => {
        // 测试大量DOM操作
        await page.evaluate(() => {
          for (let i = 0; i < 1000; i++) {
            const div = document.createElement('div')
            div.innerHTML = `Test content ${i}`
            document.body.appendChild(div)
          }
        })
      },
      async () => {
        // 测试大量数据处理
        await page.evaluate(() => {
          const largeArray = new Array(100000).fill(0).map((_, i) => ({
            id: i,
            data: `Large data item ${i}`,
            timestamp: Date.now()
          }))
          
          // 模拟数据处理
          largeArray.forEach(item => {
            item.processed = true
            item.hash = btoa(item.data)
          })
        })
      },
      async () => {
        // 测试图片加载
        await page.evaluate(() => {
          for (let i = 0; i < 50; i++) {
            const img = new Image()
            img.src = `data:image/svg+xml;base64,${btoa(`<svg width="100" height="100"><rect width="100" height="100" fill="red"/></svg>`)}`
            document.body.appendChild(img)
          }
        })
      }
    ]
    
    const results = []
    
    for (let i = 0; i < memoryTests.length; i++) {
      const testName = `Memory Test ${i + 1}`
      
      // 获取测试前内存使用
      const beforeMemory = await page.evaluate(() => {
        if (performance.memory) {
          return {
            usedJSHeapSize: performance.memory.usedJSHeapSize,
            totalJSHeapSize: performance.memory.totalJSHeapSize,
            jsHeapSizeLimit: performance.memory.jsHeapSizeLimit
          }
        }
        return null
      })
      
      // 执行测试
      await memoryTests[i]()
      
      // 等待垃圾回收
      await page.waitForTimeout(1000)
      
      // 获取测试后内存使用
      const afterMemory = await page.evaluate(() => {
        if (performance.memory) {
          return {
            usedJSHeapSize: performance.memory.usedJSHeapSize,
            totalJSHeapSize: performance.memory.totalJSHeapSize,
            jsHeapSizeLimit: performance.memory.jsHeapSizeLimit
          }
        }
        return null
      })
      
      if (beforeMemory && afterMemory) {
        const memoryIncrease = (afterMemory.usedJSHeapSize - beforeMemory.usedJSHeapSize) / 1024 / 1024 // MB
        const memoryUsagePercent = (afterMemory.usedJSHeapSize / afterMemory.jsHeapSizeLimit) * 100
        
        const result = {
          test: testName,
          memoryIncrease: memoryIncrease.toFixed(2),
          memoryUsagePercent: memoryUsagePercent.toFixed(2),
          beforeMemory,
          afterMemory,
          passed: memoryIncrease <= PERFORMANCE_CONFIG.benchmarks.memoryUsage
        }
        
        results.push(result)
        
        console.log(`  🧠 ${testName}: +${result.memoryIncrease}MB (${result.memoryUsagePercent}%) ${result.passed ? '✅' : '❌'}`)
        
        // 验证内存使用基准
        expect(memoryIncrease).toBeLessThan(PERFORMANCE_CONFIG.benchmarks.memoryUsage)
      }
    }
    
    generatePerformanceReport('memory-usage', results)
  })

  // 网络请求优化测试
  test('网络请求优化测试', async ({ page }) => {
    console.log('🌐 测试网络请求优化...')
    
    const requests = []
    
    // 监听网络请求
    page.on('request', request => {
      requests.push({
        url: request.url(),
        method: request.method(),
        resourceType: request.resourceType(),
        timestamp: Date.now()
      })
    })
    
    page.on('response', response => {
      const request = requests.find(req => req.url === response.url())
      if (request) {
        request.status = response.status()
        request.size = response.headers()['content-length'] || 0
        request.responseTime = Date.now() - request.timestamp
      }
    })
    
    await page.goto(`${PERFORMANCE_CONFIG.target}/`)
    await page.waitForLoadState('networkidle')
    
    // 分析请求
    const analysis = {
      totalRequests: requests.length,
      requestsByType: {},
      averageResponseTime: 0,
      totalSize: 0,
      slowRequests: [],
      largeRequests: []
    }
    
    requests.forEach(request => {
      // 按类型分组
      analysis.requestsByType[request.resourceType] = (analysis.requestsByType[request.resourceType] || 0) + 1
      
      // 计算总大小
      analysis.totalSize += parseInt(request.size) || 0
      
      // 识别慢请求
      if (request.responseTime > 2000) {
        analysis.slowRequests.push(request)
      }
      
      // 识别大请求
      if (parseInt(request.size) > 1024 * 1024) { // 1MB
        analysis.largeRequests.push(request)
      }
    })
    
    // 计算平均响应时间
    const totalResponseTime = requests.reduce((sum, req) => sum + (req.responseTime || 0), 0)
    analysis.averageResponseTime = totalResponseTime / requests.length
    
    console.log(`  🌐 总请求数: ${analysis.totalRequests}`)
    console.log(`  🌐 平均响应时间: ${analysis.averageResponseTime.toFixed(2)}ms`)
    console.log(`  🌐 总大小: ${(analysis.totalSize / 1024 / 1024).toFixed(2)}MB`)
    console.log(`  🌐 慢请求数: ${analysis.slowRequests.length}`)
    console.log(`  🌐 大请求数: ${analysis.largeRequests.length}`)
    
    // 验证网络请求基准
    expect(analysis.totalRequests).toBeLessThan(PERFORMANCE_CONFIG.benchmarks.networkRequests)
    expect(analysis.averageResponseTime).toBeLessThan(PERFORMANCE_CONFIG.benchmarks.apiResponse)
    
    generatePerformanceReport('network-requests', analysis)
  })

  // 资源包大小测试
  test('资源包大小测试', async ({ page }) => {
    console.log('📦 测试资源包大小...')
    
    const resources = []
    
    page.on('response', async response => {
      const url = response.url()
      const contentType = response.headers()['content-type'] || ''
      
      if (url.includes('/_next/static/') || contentType.includes('javascript') || contentType.includes('css')) {
        try {
          const buffer = await response.body()
          resources.push({
            url,
            type: contentType.includes('javascript') ? 'js' : contentType.includes('css') ? 'css' : 'other',
            size: buffer.length,
            compressed: response.headers()['content-encoding'] === 'gzip'
          })
        } catch (error) {
          // 忽略无法获取body的响应
        }
      }
    })
    
    await page.goto(`${PERFORMANCE_CONFIG.target}/`)
    await page.waitForLoadState('networkidle')
    
    // 分析资源包
    const analysis = {
      totalSize: 0,
      jsSize: 0,
      cssSize: 0,
      otherSize: 0,
      compressedCount: 0,
      uncompressedCount: 0,
      largeFiles: []
    }
    
    resources.forEach(resource => {
      analysis.totalSize += resource.size
      
      if (resource.type === 'js') {
        analysis.jsSize += resource.size
      } else if (resource.type === 'css') {
        analysis.cssSize += resource.size
      } else {
        analysis.otherSize += resource.size
      }
      
      if (resource.compressed) {
        analysis.compressedCount++
      } else {
        analysis.uncompressedCount++
      }
      
      if (resource.size > 500 * 1024) { // 500KB
        analysis.largeFiles.push(resource)
      }
    })
    
    const totalSizeMB = analysis.totalSize / 1024 / 1024
    
    console.log(`  📦 总包大小: ${totalSizeMB.toFixed(2)}MB`)
    console.log(`  📦 JS大小: ${(analysis.jsSize / 1024 / 1024).toFixed(2)}MB`)
    console.log(`  📦 CSS大小: ${(analysis.cssSize / 1024 / 1024).toFixed(2)}MB`)
    console.log(`  📦 压缩文件: ${analysis.compressedCount}`)
    console.log(`  📦 未压缩文件: ${analysis.uncompressedCount}`)
    console.log(`  📦 大文件数: ${analysis.largeFiles.length}`)
    
    // 验证包大小基准
    expect(totalSizeMB).toBeLessThan(PERFORMANCE_CONFIG.benchmarks.bundleSize / 1024)
    
    generatePerformanceReport('bundle-size', analysis)
  })

  // 并发用户测试
  test('并发用户测试', async ({ browser }) => {
    console.log('👥 测试并发用户性能...')
    
    const concurrentUsers = 10
    const testDuration = 30000 // 30秒
    const results = []
    
    const userPromises = []
    
    for (let i = 0; i < concurrentUsers; i++) {
      const userPromise = (async () => {
        const context = await browser.newContext()
        const page = await context.newPage()
        
        const userResults = {
          userId: i + 1,
          actions: [],
          errors: []
        }
        
        const startTime = Date.now()
        
        try {
          while (Date.now() - startTime < testDuration) {
            // 模拟用户行为
            const actions = [
              async () => {
                const actionStart = Date.now()
                await page.goto(`${PERFORMANCE_CONFIG.target}/`)
                await page.waitForLoadState('networkidle')
                userResults.actions.push({
                  action: 'visit_home',
                  duration: Date.now() - actionStart
                })
              },
              async () => {
                const actionStart = Date.now()
                await page.goto(`${PERFORMANCE_CONFIG.target}/square`)
                await page.waitForLoadState('networkidle')
                userResults.actions.push({
                  action: 'visit_square',
                  duration: Date.now() - actionStart
                })
              },
              async () => {
                const actionStart = Date.now()
                await page.goto(`${PERFORMANCE_CONFIG.target}/magic`)
                await page.waitForLoadState('networkidle')
                userResults.actions.push({
                  action: 'visit_magic',
                  duration: Date.now() - actionStart
                })
              }
            ]
            
            const randomAction = actions[Math.floor(Math.random() * actions.length)]
            await randomAction()
            
            // 随机等待
            await page.waitForTimeout(Math.random() * 2000 + 1000)
          }
        } catch (error) {
          userResults.errors.push(error.message)
        } finally {
          await context.close()
        }
        
        return userResults
      })()
      
      userPromises.push(userPromise)
    }
    
    const allResults = await Promise.all(userPromises)
    
    // 分析结果
    const analysis = {
      totalUsers: concurrentUsers,
      totalActions: allResults.reduce((sum, user) => sum + user.actions.length, 0),
      totalErrors: allResults.reduce((sum, user) => sum + user.errors.length, 0),
      averageActionTime: 0,
      errorRate: 0
    }
    
    const allActions = allResults.flatMap(user => user.actions)
    analysis.averageActionTime = allActions.reduce((sum, action) => sum + action.duration, 0) / allActions.length
    analysis.errorRate = (analysis.totalErrors / analysis.totalActions) * 100
    
    console.log(`  👥 并发用户数: ${analysis.totalUsers}`)
    console.log(`  👥 总操作数: ${analysis.totalActions}`)
    console.log(`  👥 总错误数: ${analysis.totalErrors}`)
    console.log(`  👥 平均操作时间: ${analysis.averageActionTime.toFixed(2)}ms`)
    console.log(`  👥 错误率: ${analysis.errorRate.toFixed(2)}%`)
    
    // 验证并发性能
    expect(analysis.errorRate).toBeLessThan(5) // 错误率小于5%
    expect(analysis.averageActionTime).toBeLessThan(5000) // 平均操作时间小于5秒
    
    generatePerformanceReport('concurrent-users', analysis)
  })
})

// 生成性能报告
function generatePerformanceReport(testType: string, data: any) {
  const report = {
    testType,
    timestamp: new Date().toISOString(),
    data,
    benchmarks: PERFORMANCE_CONFIG.benchmarks
  }
  
  const reportPath = path.join(__dirname, `performance-${testType}-report.json`)
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2))
  
  console.log(`📊 性能报告已生成: performance-${testType}-report.json`)
}