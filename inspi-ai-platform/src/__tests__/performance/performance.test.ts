/**
 * 基础性能测试套件
 * 测试当前已实现功能的性能指标
 */

import { test, expect, Page } from '@playwright/test';

test.describe('基础性能测试', () => {
  let page: Page;

  test.beforeEach(async ({ browser }) => {
    page = await browser.newPage();
  });

  test.afterEach(async () => {
    await page.close();
  });

  test('首页加载性能测试', async () => {
    const startTime = Date.now();

    await page.goto('/');
    await page.waitForLoadState('networkidle');

    const loadTime = Date.now() - startTime;

    // 验证加载时间
    expect(loadTime).toBeLessThan(3000); // 3秒内加载完成

    // 验证首屏内容渲染
    await expect(page.locator('h1')).toBeVisible();

    console.log(`首页加载时间: ${loadTime}ms`);
  });

  test('基础页面导航性能测试', async () => {
    // 测试页面间导航性能
    await page.goto('/');

    const navigationStart = Date.now();
    await page.click('a[href="/create"]');
    await page.waitForLoadState('networkidle');
    const navigationTime = Date.now() - navigationStart;

    expect(navigationTime).toBeLessThan(2000); // 2秒内完成导航

    console.log(`页面导航时间: ${navigationTime}ms`);
  });

  test('API健康检查性能测试', async () => {
    const startTime = Date.now();

    const response = await page.request.get('/api/health');
    const responseTime = Date.now() - startTime;

    expect(response.status()).toBe(200);
    expect(responseTime).toBeLessThan(1000); // 1秒内响应

    console.log(`API响应时间: ${responseTime}ms`);
  });
});
