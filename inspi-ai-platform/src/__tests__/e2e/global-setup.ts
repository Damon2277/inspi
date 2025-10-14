/**
 * Playwright全局设置
 * 在所有E2E测试运行前执行
 */
import { chromium, FullConfig } from '@playwright/test';

async function globalSetup(config: FullConfig) {
  console.log('🚀 Starting E2E test global setup...');

  // 启动浏览器进行预热
  const browser = await chromium.launch();
  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    // 等待应用启动
    console.log('⏳ Waiting for application to be ready...');
    const baseURL = config.projects[0].use.baseURL || 'http://localhost:3000';

    // 检查应用是否可访问
    let retries = 0;
    const maxRetries = 30;

    while (retries < maxRetries) {
      try {
        const response = await page.goto(baseURL, {
          waitUntil: 'networkidle',
          timeout: 5000,
        });

        if (response && response.status() < 400) {
          console.log('✅ Application is ready!');
          break;
        }
      } catch (error) {
        retries++;
        console.log(`⏳ Attempt ${retries}/${maxRetries} - waiting for app...`);
        await page.waitForTimeout(2000);
      }
    }

    if (retries >= maxRetries) {
      throw new Error('Application failed to start within timeout period');
    }

    // 设置测试数据
    await setupTestData(page, baseURL);

    // 创建测试用户会话
    await createTestUserSession(page, baseURL);

  } catch (error) {
    console.error('❌ Global setup failed:', error);
    throw error;
  } finally {
    await context.close();
    await browser.close();
  }

  console.log('✅ E2E test global setup completed!');
}

/**
 * 设置测试数据
 */
async function setupTestData(page: any, baseURL: string) {
  console.log('📊 Setting up test data...');

  // 这里可以调用API创建测试数据
  // 或者直接操作数据库

  try {
    // 创建测试用户（如果不存在）
    await page.evaluate(async (baseURL) => {
      const response = await fetch(`${baseURL}/api/test/setup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'create_test_users',
          users: [
            {
              email: 'test@example.com',
              password: 'password123',
              name: 'Test User',
              tier: 'free',
            },
            {
              email: 'admin@example.com',
              password: 'admin123',
              name: 'Admin User',
              tier: 'admin',
              role: 'admin',
            },
          ],
        }),
      });
      return response.json();
    }, baseURL);

    console.log('✅ Test data setup completed');
  } catch (error) {
    console.warn('⚠️ Test data setup failed (this may be expected):', error.message);
  }
}

/**
 * 创建测试用户会话
 */
async function createTestUserSession(page: any, baseURL: string) {
  console.log('👤 Creating test user session...');

  try {
    // 登录测试用户
    await page.goto(`${baseURL}/auth/login`);

    // 填写登录表单
    await page.fill('[data-testid="email-input"]', 'test@example.com');
    await page.fill('[data-testid="password-input"]', 'password123');
    await page.click('[data-testid="login-button"]');

    // 等待登录完成
    await page.waitForURL(`${baseURL}/dashboard`, { timeout: 10000 });

    // 保存认证状态
    const storage = await page.context().storageState();

    // 将认证状态保存到文件，供其他测试使用
    const fs = require('fs');
    const path = require('path');

    const storageDir = path.join(process.cwd(), 'test-results', 'auth');
    if (!fs.existsSync(storageDir)) {
      fs.mkdirSync(storageDir, { recursive: true });
    }

    fs.writeFileSync(
      path.join(storageDir, 'user-session.json'),
      JSON.stringify(storage, null, 2),
    );

    console.log('✅ Test user session created');
  } catch (error) {
    console.warn('⚠️ Test user session creation failed:', error.message);
  }
}

export default globalSetup;
