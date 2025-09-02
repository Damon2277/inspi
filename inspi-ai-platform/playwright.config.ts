import { defineConfig, devices } from '@playwright/test'

/**
 * Playwright 配置文件
 * 用于端到端测试和性能测试
 */
export default defineConfig({
  // 测试目录
  testDir: './src/__tests__/e2e',
  
  // 全局设置
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  
  // 报告配置
  reporter: [
    ['html', { outputFolder: 'playwright-report' }],
    ['json', { outputFile: 'test-results/playwright-results.json' }],
    ['junit', { outputFile: 'test-results/playwright-results.xml' }],
    ['line']
  ],
  
  // 全局配置
  use: {
    // 基础URL
    baseURL: process.env.BASE_URL || 'http://localhost:3000',
    
    // 浏览器设置
    headless: process.env.CI ? true : false,
    viewport: { width: 1280, height: 720 },
    ignoreHTTPSErrors: true,
    
    // 录制设置
    video: 'retain-on-failure',
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure',
    
    // 超时设置
    actionTimeout: 10000,
    navigationTimeout: 30000,
  },
  
  // 测试项目配置
  projects: [
    // 桌面浏览器
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
    },
    
    // 移动设备
    {
      name: 'Mobile Chrome',
      use: { ...devices['Pixel 5'] },
      testDir: './src/__tests__/mobile',
    },
    {
      name: 'Mobile Safari',
      use: { ...devices['iPhone 12'] },
      testDir: './src/__tests__/mobile',
    },
    
    // 平板设备
    {
      name: 'iPad',
      use: { ...devices['iPad Pro'] },
      testDir: './src/__tests__/mobile',
    },
    
    // 性能测试
    {
      name: 'performance',
      use: { ...devices['Desktop Chrome'] },
      testDir: './src/__tests__/performance',
      timeout: 60000, // 性能测试需要更长时间
    },
  ],
  
  // Web服务器配置
  webServer: {
    command: 'npm run start',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
    timeout: 120000,
  },
  
  // 输出目录
  outputDir: 'test-results/',
  
  // 全局设置
  globalSetup: require.resolve('./src/__tests__/setup/global-setup.ts'),
  globalTeardown: require.resolve('./src/__tests__/setup/global-teardown.ts'),
  
  // 测试超时
  timeout: 30000,
  expect: {
    timeout: 5000,
  },
})