/**
 * 烟雾测试 (Smoke Tests)
 * 快速验证核心功能是否正常工作
 */

import { test, expect } from '@playwright/test'

test.describe('烟雾测试 - 核心功能验证', () => {
  test('应用基础功能烟雾测试', async ({ page }) => {
    // 1. 首页加载测试
    await page.goto('/')
    await expect(page).toHaveTitle(/inspi AI平台/)
    await expect(page.locator('h1')).toBeVisible()
    
    // 2. 导航功能测试
    await expect(page.locator('[data-testid="magic-nav"]')).toBeVisible()
    await expect(page.locator('[data-testid="square-nav"]')).toBeVisible()
    await expect(page.locator('[data-testid="knowledge-graph-nav"]')).toBeVisible()
    
    // 3. 登录功能测试
    await page.click('[data-testid="login-button"]')
    await expect(page.locator('[data-testid="login-modal"]')).toBeVisible()
    
    // 4. API健康检查
    const healthResponse = await page.request.get('/api/health')
    expect(healthResponse.ok()).toBeTruthy()
    
    console.log('✅ 应用基础功能正常')
  })

  test('AI魔法师核心功能烟雾测试', async ({ page }) => {
    // 跳过登录，直接测试页面加载
    await page.goto('/magic')
    
    // 验证核心元素存在
    await expect(page.locator('[data-testid="knowledge-input"]')).toBeVisible()
    await expect(page.locator('[data-testid="card-types"]')).toBeVisible()
    await expect(page.locator('[data-testid="generate-button"]')).toBeVisible()
    
    console.log('✅ AI魔法师页面正常')
  })

  test('智慧广场核心功能烟雾测试', async ({ page }) => {
    await page.goto('/square')
    
    // 验证核心元素存在
    await expect(page.locator('[data-testid="search-input"]')).toBeVisible()
    await expect(page.locator('[data-testid="filter-panel"]')).toBeVisible()
    
    // 验证至少有内容加载
    await page.waitForSelector('[data-testid="work-card"], [data-testid="empty-state"]')
    
    console.log('✅ 智慧广场页面正常')
  })

  test('知识图谱核心功能烟雾测试', async ({ page }) => {
    await page.goto('/knowledge-graph')
    
    // 验证图谱容器存在
    await expect(page.locator('[data-testid="knowledge-graph"]')).toBeVisible()
    
    console.log('✅ 知识图谱页面正常')
  })

  test('API端点烟雾测试', async ({ page }) => {
    const endpoints = [
      '/api/health',
      '/api/health/db',
      '/api/health/cache',
    ]
    
    for (const endpoint of endpoints) {
      const response = await page.request.get(endpoint)
      expect(response.status()).toBeLessThan(500) // 不应该有服务器错误
    }
    
    console.log('✅ 核心API端点正常')
  })

  test('移动端基础功能烟雾测试', async ({ page }) => {
    // 设置移动端视口
    await page.setViewportSize({ width: 375, height: 667 })
    
    await page.goto('/')
    
    // 验证移动端导航
    await expect(page.locator('[data-testid="mobile-nav"]')).toBeVisible()
    
    // 验证响应式布局
    const header = page.locator('header')
    await expect(header).toBeVisible()
    
    console.log('✅ 移动端基础功能正常')
  })
})