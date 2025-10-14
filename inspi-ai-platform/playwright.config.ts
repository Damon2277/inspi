/**
 * Playwright端到端测试配置
 */
import { defineConfig, devices } from '@playwright/test'

/**
 * 从环境变量读取配置
 */
const config = defineConfig({
  testDir: './src/__tests__/e2e',
  
  /* 并行运行测试 */
  fullyParallel: true,
  
  /* 在CI中失败时不重试，本地开发时重试一次 */
  retries: process.env.CI ? 2 : 0,
  
  /* 在CI中选择退出并行执行 */
  workers: process.env.CI ? 1 : undefined,
  
  /* 测试报告配置 */
  reporter: [
    ['html'],
    ['json', { outputFile: 'test-results/e2e-results.json' }],
    ['junit', { outputFile: 'test-results/e2e-results.xml' }],
  ],
  
  /* 全局测试配置 */
  use: {
    /* 基础URL */
    baseURL: process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3000',
    
    /* 在失败时收集跟踪信息 */
    trace: 'on-first-retry',
    
    /* 截图配置 */
    screenshot: 'only-on-failure',
    
    /* 视频录制 */
    video: 'retain-on-failure',
    
    /* 浏览器上下文配置 */
    viewport: { width: 1280, height: 720 },
    
    /* 忽略HTTPS错误 */
    ignoreHTTPSErrors: true,
    
    /* 用户代理 */
    userAgent: 'Playwright E2E Tests',
  },

  /* 测试项目配置 */
  projects: [
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

    /* 移动端测试 */
    {
      name: 'Mobile Chrome',
      use: { ...devices['Pixel 5'] },
    },
    
    {
      name: 'Mobile Safari',
      use: { ...devices['iPhone 12'] },
    },

    /* 品牌浏览器测试 */
    {
      name: 'Microsoft Edge',
      use: { ...devices['Desktop Edge'], channel: 'msedge' },
    },
    
    {
      name: 'Google Chrome',
      use: { ...devices['Desktop Chrome'], channel: 'chrome' },
    },
  ],

  /* 本地开发服务器配置 */
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
    timeout: 120 * 1000,
  },

  /* 测试超时配置 */
  timeout: 30 * 1000,
  expect: {
    timeout: 5 * 1000,
  },

  /* 全局设置和清理 */
  globalSetup: require.resolve('./src/__tests__/e2e/global-setup.ts'),
  globalTeardown: require.resolve('./src/__tests__/e2e/global-teardown.ts'),

  /* 输出目录 */
  outputDir: 'test-results/',
  
  /* 测试匹配模式 */
  testMatch: '**/*.e2e.{js,ts}',
  
  /* 忽略的文件 */
  testIgnore: [
    '**/node_modules/**',
    '**/dist/**',
    '**/.next/**',
  ],
})

export default config