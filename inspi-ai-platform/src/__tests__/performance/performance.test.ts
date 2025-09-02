/**
 * 性能测试套件
 * 测试应用的性能指标和优化效果
 */

import { test, expect, Page } from '@playwright/test'

test.describe('性能测试', () => {
  let page: Page

  test.beforeEach(async ({ browser }) => {
    page = await browser.newPage()
  })

  test.afterEach(async () => {
    await page.close()
  })

  test('首页加载性能测试', async () => {
    const startTime = Date.now()
    
    // 监听网络请求
    const requests: string[] = []
    page.on('request', request => {
      requests.push(request.url())
    })

    await page.goto('/')
    
    // 等待页面完全加载
    await page.waitForLoadState('networkidle')
    
    const loadTime = Date.now() - startTime
    
    // 验证加载时间
    expect(loadTime).toBeLessThan(3000) // 3秒内加载完成
    
    // 验证关键资源加载
    expect(requests.some(url => url.includes('main.js'))).toBeTruthy()
    expect(requests.some(url => url.includes('styles.css'))).toBeTruthy()
    
    // 验证首屏内容渲染
    await expect(page.locator('h1')).toBeVisible()
    await expect(page.locator('[data-testid="hero-section"]')).toBeVisible()
    
    console.log(`首页加载时间: ${loadTime}ms`)
    console.log(`网络请求数量: ${requests.length}`)
  })

  test('AI卡片生成性能测试', async () => {
    // 登录
    await page.goto('/login')
    await page.fill('[data-testid="login-email"]', 'test@example.com')
    await page.fill('[data-testid="login-password"]', 'password')
    await page.click('[data-testid="login-submit"]')

    await page.goto('/magic')
    
    const startTime = Date.now()
    
    // 输入知识点并生成卡片
    await page.fill('[data-testid="knowledge-input"]', '二次函数的图像与性质')
    await page.click('[data-testid="generate-cards"]')
    
    // 等待生成完成
    await expect(page.locator('[data-testid="generated-cards"]')).toBeVisible({ timeout: 30000 })
    
    const generateTime = Date.now() - startTime
    
    // 验证生成时间
    expect(generateTime).toBeLessThan(30000) // 30秒内生成完成
    
    // 验证生成的卡片数量
    const cardCount = await page.locator('[data-testid="card-item"]').count()
    expect(cardCount).toBe(4) // 应该生成4张卡片
    
    console.log(`AI卡片生成时间: ${generateTime}ms`)
  })

  test('知识图谱渲染性能测试', async () => {
    await page.goto('/knowledge-graph')
    
    const startTime = Date.now()
    
    // 等待图谱加载
    await expect(page.locator('[data-testid="knowledge-graph"]')).toBeVisible()
    
    // 等待节点渲染完成
    await page.waitForFunction(() => {
      const nodes = document.querySelectorAll('[data-testid="graph-node"]')
      return nodes.length > 0
    })
    
    const renderTime = Date.now() - startTime
    
    // 验证渲染时间
    expect(renderTime).toBeLessThan(5000) // 5秒内渲染完成
    
    // 验证节点数量
    const nodeCount = await page.locator('[data-testid="graph-node"]').count()
    expect(nodeCount).toBeGreaterThan(0)
    
    // 测试交互性能
    const interactionStart = Date.now()
    
    await page.click('[data-testid="graph-node"]')
    await expect(page.locator('[data-testid="node-details"]')).toBeVisible()
    
    const interactionTime = Date.now() - interactionStart
    expect(interactionTime).toBeLessThan(500) // 500ms内响应交互
    
    console.log(`知识图谱渲染时间: ${renderTime}ms`)
    console.log(`交互响应时间: ${interactionTime}ms`)
  })

  test('智慧广场滚动性能测试', async () => {
    await page.goto('/square')
    
    // 等待初始内容加载
    await expect(page.locator('[data-testid="work-card"]')).toHaveCount.greaterThan(0)
    
    const initialCardCount = await page.locator('[data-testid="work-card"]').count()
    
    // 测试滚动加载性能
    const scrollStart = Date.now()
    
    // 滚动到底部
    await page.evaluate(() => {
      window.scrollTo(0, document.body.scrollHeight)
    })
    
    // 等待新内容加载
    await page.waitForFunction((initialCount) => {
      const currentCount = document.querySelectorAll('[data-testid="work-card"]').length
      return currentCount > initialCount
    }, initialCardCount)
    
    const scrollTime = Date.now() - scrollStart
    
    // 验证滚动加载时间
    expect(scrollTime).toBeLessThan(3000) // 3秒内加载新内容
    
    const finalCardCount = await page.locator('[data-testid="work-card"]').count()
    expect(finalCardCount).toBeGreaterThan(initialCardCount)
    
    console.log(`滚动加载时间: ${scrollTime}ms`)
    console.log(`加载卡片数量: ${finalCardCount - initialCardCount}`)
  })

  test('搜索性能测试', async () => {
    await page.goto('/square')
    
    const searchInput = page.locator('[data-testid="search-input"]')
    
    // 测试搜索响应时间
    const searchStart = Date.now()
    
    await searchInput.fill('数学')
    await searchInput.press('Enter')
    
    // 等待搜索结果
    await expect(page.locator('[data-testid="search-results"]')).toBeVisible()
    
    const searchTime = Date.now() - searchStart
    
    // 验证搜索时间
    expect(searchTime).toBeLessThan(2000) // 2秒内返回结果
    
    // 验证搜索结果数量
    const resultCount = await page.locator('[data-testid="work-card"]').count()
    expect(resultCount).toBeGreaterThan(0)
    
    console.log(`搜索响应时间: ${searchTime}ms`)
    console.log(`搜索结果数量: ${resultCount}`)
  })

  test('移动端性能测试', async () => {
    // 设置移动端视口
    await page.setViewportSize({ width: 375, height: 667 })
    
    const startTime = Date.now()
    
    await page.goto('/')
    await page.waitForLoadState('networkidle')
    
    const mobileLoadTime = Date.now() - startTime
    
    // 移动端加载时间应该更快（资源优化）
    expect(mobileLoadTime).toBeLessThan(2500) // 2.5秒内加载完成
    
    // 测试触摸响应性能
    const touchStart = Date.now()
    
    await page.tap('[data-testid="mobile-nav-button"]')
    await expect(page.locator('[data-testid="mobile-menu"]')).toBeVisible()
    
    const touchTime = Date.now() - touchStart
    expect(touchTime).toBeLessThan(300) // 300ms内响应触摸
    
    console.log(`移动端加载时间: ${mobileLoadTime}ms`)
    console.log(`触摸响应时间: ${touchTime}ms`)
  })

  test('内存使用测试', async () => {
    await page.goto('/')
    
    // 获取初始内存使用
    const initialMemory = await page.evaluate(() => {
      return (performance as any).memory?.usedJSHeapSize || 0
    })
    
    // 执行一系列操作
    await page.click('[data-testid="magic-nav"]')
    await page.fill('[data-testid="knowledge-input"]', '测试知识点')
    await page.click('[data-testid="square-nav"]')
    await page.click('[data-testid="knowledge-graph-nav"]')
    
    // 获取操作后内存使用
    const finalMemory = await page.evaluate(() => {
      return (performance as any).memory?.usedJSHeapSize || 0
    })
    
    const memoryIncrease = finalMemory - initialMemory
    
    // 验证内存增长合理
    expect(memoryIncrease).toBeLessThan(50 * 1024 * 1024) // 50MB内存增长限制
    
    console.log(`初始内存: ${(initialMemory / 1024 / 1024).toFixed(2)}MB`)
    console.log(`最终内存: ${(finalMemory / 1024 / 1024).toFixed(2)}MB`)
    console.log(`内存增长: ${(memoryIncrease / 1024 / 1024).toFixed(2)}MB`)
  })

  test('网络优化测试', async () => {
    // 监听网络请求
    const requests: any[] = []
    const responses: any[] = []
    
    page.on('request', request => {
      requests.push({
        url: request.url(),
        method: request.method(),
        size: request.postDataBuffer()?.length || 0
      })
    })
    
    page.on('response', response => {
      responses.push({
        url: response.url(),
        status: response.status(),
        size: 0 // 实际项目中可以获取响应大小
      })
    })
    
    await page.goto('/')
    await page.waitForLoadState('networkidle')
    
    // 分析请求
    const jsRequests = requests.filter(r => r.url.includes('.js'))
    const cssRequests = requests.filter(r => r.url.includes('.css'))
    const imageRequests = requests.filter(r => r.url.match(/\.(jpg|jpeg|png|gif|webp)$/))
    
    // 验证资源优化
    expect(jsRequests.length).toBeLessThan(10) // JS文件数量控制
    expect(cssRequests.length).toBeLessThan(5) // CSS文件数量控制
    
    // 验证HTTP状态码
    const errorResponses = responses.filter(r => r.status >= 400)
    expect(errorResponses.length).toBe(0) // 无错误响应
    
    console.log(`总请求数: ${requests.length}`)
    console.log(`JS文件数: ${jsRequests.length}`)
    console.log(`CSS文件数: ${cssRequests.length}`)
    console.log(`图片文件数: ${imageRequests.length}`)
  })

  test('缓存效果测试', async () => {
    // 第一次访问
    const firstVisitStart = Date.now()
    await page.goto('/')
    await page.waitForLoadState('networkidle')
    const firstVisitTime = Date.now() - firstVisitStart
    
    // 第二次访问（应该使用缓存）
    const secondVisitStart = Date.now()
    await page.reload()
    await page.waitForLoadState('networkidle')
    const secondVisitTime = Date.now() - secondVisitStart
    
    // 缓存应该显著提升加载速度
    expect(secondVisitTime).toBeLessThan(firstVisitTime * 0.8) // 至少20%的提升
    
    console.log(`首次访问时间: ${firstVisitTime}ms`)
    console.log(`缓存访问时间: ${secondVisitTime}ms`)
    console.log(`性能提升: ${((firstVisitTime - secondVisitTime) / firstVisitTime * 100).toFixed(1)}%`)
  })

  test('并发用户性能测试', async () => {
    // 模拟多个并发用户
    const concurrentUsers = 5
    const promises: Promise<number>[] = []
    
    for (let i = 0; i < concurrentUsers; i++) {
      promises.push(
        (async () => {
          const context = await page.context().browser()!.newContext()
          const userPage = await context.newPage()
          
          const startTime = Date.now()
          await userPage.goto('/')
          await userPage.waitForLoadState('networkidle')
          const loadTime = Date.now() - startTime
          
          await context.close()
          return loadTime
        })()
      )
    }
    
    const loadTimes = await Promise.all(promises)
    const averageLoadTime = loadTimes.reduce((sum, time) => sum + time, 0) / loadTimes.length
    const maxLoadTime = Math.max(...loadTimes)
    
    // 验证并发性能
    expect(averageLoadTime).toBeLessThan(5000) // 平均5秒内
    expect(maxLoadTime).toBeLessThan(8000) // 最大8秒内
    
    console.log(`并发用户数: ${concurrentUsers}`)
    console.log(`平均加载时间: ${averageLoadTime.toFixed(0)}ms`)
    console.log(`最大加载时间: ${maxLoadTime}ms`)
    console.log(`加载时间分布: ${loadTimes.map(t => `${t}ms`).join(', ')}`)
  })
})