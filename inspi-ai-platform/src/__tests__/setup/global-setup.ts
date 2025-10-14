/**
 * Playwright 全局设置
 * 在所有测试开始前执行
 */

import { chromium, FullConfig } from '@playwright/test';

async function globalSetup(config: FullConfig) {
  console.log('🚀 开始全局测试设置...');

  // 启动浏览器进行预热
  const browser = await chromium.launch();
  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    // 预热应用
    console.log('🔥 预热应用...');
    await page.goto(config.projects[0].use?.baseURL || 'http://localhost:3000');
    await page.waitForLoadState('networkidle');

    // 创建测试用户（如果需要）
    console.log('👤 准备测试数据...');
    await setupTestData(page);

    // 验证关键服务可用性
    console.log('🔍 验证服务状态...');
    await verifyServices(page);

    console.log('✅ 全局设置完成');

  } catch (error) {
    console.error('❌ 全局设置失败:', error);
    throw error;
  } finally {
    await context.close();
    await browser.close();
  }
}

/**
 * 设置测试数据
 */
async function setupTestData(page: any) {
  // 这里可以添加测试数据的初始化逻辑
  // 例如：创建测试用户、初始化数据库等

  try {
    // 检查是否需要创建测试用户
    const response = await page.evaluate(async () => {
      try {
        const res = await fetch('/api/test/setup', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'create-test-user',
            user: {
              email: 'test@example.com',
              password: 'Test123456',
              name: '测试用户',
            },
          }),
        });
        return res.ok;
      } catch {
        return false;
      }
    });

    if (response) {
      console.log('✅ 测试用户创建成功');
    }
  } catch (error) {
    console.warn('⚠️ 测试数据设置跳过:', error);
  }
}

/**
 * 验证关键服务
 */
async function verifyServices(page: any) {
  const services = [
    { name: 'API健康检查', url: '/api/health' },
    { name: '数据库连接', url: '/api/health/db' },
    { name: '缓存服务', url: '/api/health/cache' },
    { name: 'AI服务', url: '/api/health/ai' },
  ];

  for (const service of services) {
    try {
      const response = await page.evaluate(async (url: string) => {
        const res = await fetch(url);
        return { status: res.status, ok: res.ok };
      }, service.url);

      if (response.ok) {
        console.log(`✅ ${service.name} 正常`);
      } else {
        console.warn(`⚠️ ${service.name} 异常 (${response.status})`);
      }
    } catch (error) {
      console.warn(`⚠️ ${service.name} 检查失败:`, error);
    }
  }
}

export default globalSetup;
