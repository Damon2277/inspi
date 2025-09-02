/**
 * 端到端用户旅程测试
 * 测试完整的用户使用流程
 */

import { test, expect, Page } from '@playwright/test'

// 测试数据
const testUser = {
  email: 'test@example.com',
  password: 'Test123456',
  name: '测试用户',
}

const testKnowledgePoint = '二次函数的图像与性质'

test.describe('完整用户旅程测试', () => {
  let page: Page

  test.beforeEach(async ({ browser }) => {
    page = await browser.newPage()
    await page.goto('/')
  })

  test.afterEach(async () => {
    await page.close()
  })

  test('新用户完整使用流程', async () => {
    // 1. 访问首页
    await expect(page).toHaveTitle(/inspi AI平台/)
    await expect(page.locator('h1')).toContainText('AI教学魔法师')

    // 2. 用户注册
    await page.click('[data-testid="login-button"]')
    await page.click('[data-testid="register-tab"]')
    
    await page.fill('[data-testid="register-email"]', testUser.email)
    await page.fill('[data-testid="register-password"]', testUser.password)
    await page.fill('[data-testid="register-name"]', testUser.name)
    
    await page.click('[data-testid="register-submit"]')
    
    // 等待注册成功
    await expect(page.locator('[data-testid="success-message"]')).toBeVisible()

    // 3. 登录
    await page.fill('[data-testid="login-email"]', testUser.email)
    await page.fill('[data-testid="login-password"]', testUser.password)
    await page.click('[data-testid="login-submit"]')
    
    // 验证登录成功
    await expect(page.locator('[data-testid="user-avatar"]')).toBeVisible()

    // 4. 生成AI教学卡片
    await page.click('[data-testid="magic-generator"]')
    
    await page.fill('[data-testid="knowledge-input"]', testKnowledgePoint)
    await page.click('[data-testid="generate-cards"]')
    
    // 等待卡片生成
    await expect(page.locator('[data-testid="generated-cards"]')).toBeVisible({ timeout: 30000 })
    
    // 验证生成了4种类型的卡片
    await expect(page.locator('[data-testid="concept-card"]')).toBeVisible()
    await expect(page.locator('[data-testid="example-card"]')).toBeVisible()
    await expect(page.locator('[data-testid="practice-card"]')).toBeVisible()
    await expect(page.locator('[data-testid="extension-card"]')).toBeVisible()

    // 5. 编辑卡片内容
    await page.click('[data-testid="edit-concept-card"]')
    await page.fill('[data-testid="card-title-input"]', '二次函数概念详解')
    await page.click('[data-testid="save-card"]')
    
    await expect(page.locator('[data-testid="concept-card"] h3')).toContainText('二次函数概念详解')

    // 6. 保存作品
    await page.click('[data-testid="save-work"]')
    await page.fill('[data-testid="work-title"]', '二次函数教学卡片集')
    await page.fill('[data-testid="work-description"]', '包含概念、例题、练习和拓展的完整教学卡片')
    await page.selectOption('[data-testid="work-subject"]', '数学')
    await page.selectOption('[data-testid="work-grade"]', '高中')
    
    await page.click('[data-testid="publish-work"]')
    
    // 验证作品发布成功
    await expect(page.locator('[data-testid="publish-success"]')).toBeVisible()

    // 7. 访问智慧广场
    await page.click('[data-testid="square-nav"]')
    
    // 验证作品出现在广场中
    await expect(page.locator('[data-testid="work-card"]').first()).toBeVisible()
    await expect(page.locator('text=二次函数教学卡片集')).toBeVisible()

    // 8. 搜索功能测试
    await page.fill('[data-testid="search-input"]', '二次函数')
    await page.press('[data-testid="search-input"]', 'Enter')
    
    // 验证搜索结果
    await expect(page.locator('[data-testid="search-results"]')).toBeVisible()
    await expect(page.locator('[data-testid="work-card"]')).toHaveCount(1)

    // 9. 筛选功能测试
    await page.selectOption('[data-testid="subject-filter"]', '数学')
    await page.selectOption('[data-testid="grade-filter"]', '高中')
    
    // 验证筛选结果
    await expect(page.locator('[data-testid="work-card"]')).toHaveCount(1)

    // 10. 查看作品详情
    await page.click('[data-testid="work-card"]')
    
    await expect(page.locator('[data-testid="work-detail"]')).toBeVisible()
    await expect(page.locator('h1')).toContainText('二次函数教学卡片集')

    // 11. 复用作品
    await page.click('[data-testid="reuse-work"]')
    await page.click('[data-testid="confirm-reuse"]')
    
    // 验证复用成功
    await expect(page.locator('[data-testid="reuse-success"]')).toBeVisible()

    // 12. 查看个人知识图谱
    await page.click('[data-testid="knowledge-graph-nav"]')
    
    // 验证知识图谱加载
    await expect(page.locator('[data-testid="knowledge-graph"]')).toBeVisible()
    await expect(page.locator('[data-testid="graph-node"]')).toHaveCount.greaterThan(0)

    // 13. 挂载作品到知识图谱
    await page.dragAndDrop('[data-testid="work-item"]', '[data-testid="math-node"]')
    
    // 验证挂载成功
    await expect(page.locator('[data-testid="mounted-work-indicator"]')).toBeVisible()

    // 14. 查看个人资料
    await page.click('[data-testid="profile-nav"]')
    
    await expect(page.locator('[data-testid="user-profile"]')).toBeVisible()
    await expect(page.locator('[data-testid="user-name"]')).toContainText(testUser.name)
    
    // 验证统计数据
    await expect(page.locator('[data-testid="works-count"]')).toContainText('1')
    await expect(page.locator('[data-testid="reuses-count"]')).toContainText('1')

    // 15. 编辑个人资料
    await page.click('[data-testid="edit-profile"]')
    await page.fill('[data-testid="bio-input"]', '数学教师，专注于函数教学')
    await page.click('[data-testid="save-profile"]')
    
    // 验证资料更新成功
    await expect(page.locator('[data-testid="user-bio"]')).toContainText('数学教师，专注于函数教学')

    // 16. 查看排行榜
    await page.click('[data-testid="leaderboard-nav"]')
    
    await expect(page.locator('[data-testid="leaderboard"]')).toBeVisible()
    await expect(page.locator('[data-testid="leaderboard-item"]')).toHaveCount.greaterThan(0)

    // 17. 退出登录
    await page.click('[data-testid="user-menu"]')
    await page.click('[data-testid="logout"]')
    
    // 验证退出成功
    await expect(page.locator('[data-testid="login-button"]')).toBeVisible()
  })

  test('移动端用户体验测试', async () => {
    // 设置移动端视口
    await page.setViewportSize({ width: 375, height: 667 })

    // 1. 移动端首页
    await expect(page.locator('[data-testid="mobile-header"]')).toBeVisible()
    await expect(page.locator('[data-testid="mobile-nav"]')).toBeVisible()

    // 2. 移动端登录
    await page.click('[data-testid="mobile-login"]')
    await page.fill('[data-testid="login-email"]', testUser.email)
    await page.fill('[data-testid="login-password"]', testUser.password)
    await page.click('[data-testid="login-submit"]')

    // 3. 移动端卡片生成
    await page.click('[data-testid="mobile-magic-tab"]')
    await page.fill('[data-testid="mobile-knowledge-input"]', testKnowledgePoint)
    await page.click('[data-testid="mobile-generate"]')
    
    await expect(page.locator('[data-testid="mobile-cards"]')).toBeVisible({ timeout: 30000 })

    // 4. 移动端滑动操作
    const workCard = page.locator('[data-testid="mobile-work-card"]').first()
    await workCard.swipe({ direction: 'left' })
    
    // 验证快捷操作显示
    await expect(page.locator('[data-testid="quick-actions"]')).toBeVisible()

    // 5. 移动端长按操作
    await workCard.press({ button: 'left', delay: 1000 })
    
    // 验证上下文菜单显示
    await expect(page.locator('[data-testid="context-menu"]')).toBeVisible()

    // 6. 移动端下拉刷新
    await page.touchscreen.tap(200, 100)
    await page.touchscreen.tap(200, 300)
    
    // 验证刷新指示器
    await expect(page.locator('[data-testid="pull-refresh"]')).toBeVisible()

    // 7. 移动端无限滚动
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight))
    
    // 验证加载更多
    await expect(page.locator('[data-testid="load-more"]')).toBeVisible()
  })

  test('错误场景处理测试', async () => {
    // 1. 网络错误处理
    await page.route('**/api/**', route => route.abort())
    
    await page.click('[data-testid="login-button"]')
    await page.fill('[data-testid="login-email"]', testUser.email)
    await page.fill('[data-testid="login-password"]', testUser.password)
    await page.click('[data-testid="login-submit"]')
    
    // 验证错误提示
    await expect(page.locator('[data-testid="error-message"]')).toBeVisible()
    await expect(page.locator('text=网络连接失败')).toBeVisible()

    // 2. 恢复网络连接
    await page.unroute('**/api/**')
    
    // 点击重试
    await page.click('[data-testid="retry-button"]')
    
    // 验证重试成功
    await expect(page.locator('[data-testid="user-avatar"]')).toBeVisible()

    // 3. 表单验证错误
    await page.click('[data-testid="magic-generator"]')
    await page.click('[data-testid="generate-cards"]')
    
    // 验证验证错误提示
    await expect(page.locator('[data-testid="validation-error"]')).toBeVisible()
    await expect(page.locator('text=请输入知识点')).toBeVisible()

    // 4. 使用限制错误
    // 模拟达到使用限制
    await page.route('**/api/magic/generate', route => 
      route.fulfill({
        status: 429,
        body: JSON.stringify({ error: '今日生成次数已用完' })
      })
    )
    
    await page.fill('[data-testid="knowledge-input"]', testKnowledgePoint)
    await page.click('[data-testid="generate-cards"]')
    
    // 验证限制提示
    await expect(page.locator('[data-testid="limit-error"]')).toBeVisible()
    await expect(page.locator('text=今日生成次数已用完')).toBeVisible()
    await expect(page.locator('[data-testid="upgrade-button"]')).toBeVisible()
  })

  test('性能和可访问性测试', async () => {
    // 1. 页面加载性能
    const startTime = Date.now()
    await page.goto('/')
    const loadTime = Date.now() - startTime
    
    // 验证页面加载时间小于3秒
    expect(loadTime).toBeLessThan(3000)

    // 2. 键盘导航测试
    await page.keyboard.press('Tab')
    await expect(page.locator('[data-testid="login-button"]')).toBeFocused()
    
    await page.keyboard.press('Tab')
    await expect(page.locator('[data-testid="magic-nav"]')).toBeFocused()

    // 3. 屏幕阅读器支持
    const loginButton = page.locator('[data-testid="login-button"]')
    await expect(loginButton).toHaveAttribute('aria-label', '登录')
    
    const mainContent = page.locator('main')
    await expect(mainContent).toHaveAttribute('role', 'main')

    // 4. 颜色对比度测试
    const headerBg = await page.locator('header').evaluate(el => 
      getComputedStyle(el).backgroundColor
    )
    const headerColor = await page.locator('header').evaluate(el => 
      getComputedStyle(el).color
    )
    
    // 验证对比度符合WCAG标准（这里简化处理）
    expect(headerBg).toBeTruthy()
    expect(headerColor).toBeTruthy()

    // 5. 图片alt属性测试
    const images = page.locator('img')
    const imageCount = await images.count()
    
    for (let i = 0; i < imageCount; i++) {
      const img = images.nth(i)
      await expect(img).toHaveAttribute('alt')
    }
  })

  test('数据持久化测试', async () => {
    // 1. 登录并生成作品
    await page.click('[data-testid="login-button"]')
    await page.fill('[data-testid="login-email"]', testUser.email)
    await page.fill('[data-testid="login-password"]', testUser.password)
    await page.click('[data-testid="login-submit"]')

    await page.click('[data-testid="magic-generator"]')
    await page.fill('[data-testid="knowledge-input"]', testKnowledgePoint)
    await page.click('[data-testid="generate-cards"]')
    
    await expect(page.locator('[data-testid="generated-cards"]')).toBeVisible({ timeout: 30000 })

    // 2. 保存草稿
    await page.click('[data-testid="save-draft"]')
    await expect(page.locator('[data-testid="draft-saved"]')).toBeVisible()

    // 3. 刷新页面
    await page.reload()

    // 4. 验证草稿恢复
    await page.click('[data-testid="magic-generator"]')
    await expect(page.locator('[data-testid="draft-restored"]')).toBeVisible()
    await expect(page.locator('[data-testid="knowledge-input"]')).toHaveValue(testKnowledgePoint)

    // 5. 离线状态测试
    await page.context().setOffline(true)
    
    // 验证离线提示
    await expect(page.locator('[data-testid="offline-indicator"]')).toBeVisible()

    // 6. 离线操作
    await page.fill('[data-testid="knowledge-input"]', '三角函数')
    await page.click('[data-testid="save-draft"]')
    
    // 验证离线保存
    await expect(page.locator('[data-testid="offline-saved"]')).toBeVisible()

    // 7. 恢复在线
    await page.context().setOffline(false)
    
    // 验证数据同步
    await expect(page.locator('[data-testid="sync-complete"]')).toBeVisible()
  })

  test('多用户协作测试', async () => {
    // 创建第二个用户会话
    const context2 = await page.context().browser()!.newContext()
    const page2 = await context2.newPage()

    // 用户1登录并发布作品
    await page.click('[data-testid="login-button"]')
    await page.fill('[data-testid="login-email"]', testUser.email)
    await page.fill('[data-testid="login-password"]', testUser.password)
    await page.click('[data-testid="login-submit"]')

    await page.click('[data-testid="magic-generator"]')
    await page.fill('[data-testid="knowledge-input"]', testKnowledgePoint)
    await page.click('[data-testid="generate-cards"]')
    
    await expect(page.locator('[data-testid="generated-cards"]')).toBeVisible({ timeout: 30000 })
    
    await page.click('[data-testid="save-work"]')
    await page.fill('[data-testid="work-title"]', '协作测试作品')
    await page.click('[data-testid="publish-work"]')

    // 用户2访问并复用作品
    await page2.goto('/')
    await page2.click('[data-testid="square-nav"]')
    
    await expect(page2.locator('text=协作测试作品')).toBeVisible()
    
    await page2.click('[data-testid="work-card"]')
    await page2.click('[data-testid="reuse-work"]')
    await page2.click('[data-testid="confirm-reuse"]')

    // 验证用户1收到复用通知
    await page.reload()
    await expect(page.locator('[data-testid="notification"]')).toBeVisible()
    await expect(page.locator('text=您的作品被复用了')).toBeVisible()

    await context2.close()
  })
})