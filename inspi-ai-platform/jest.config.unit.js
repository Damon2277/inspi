/**
 * Jest单元测试配置
 * 专门用于运行单元测试
 */
const nextJest = require('next/jest');

const createJestConfig = nextJest({
  dir: './',
});

const customJestConfig = {
  setupFilesAfterEnv: ['<rootDir>/jest.setup.simple.js'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  testEnvironment: 'jest-environment-jsdom',
  collectCoverageFrom: [
    'src/**/*.{js,jsx,ts,tsx}',
    '!src/**/*.d.ts',
    '!src/**/*.stories.{js,jsx,ts,tsx}',
    '!src/**/__tests__/**',
    '!src/**/__mocks__/**',
    '!src/**/index.{js,ts}',
    '!src/app/**/layout.tsx',
    '!src/app/**/loading.tsx',
    '!src/app/**/error.tsx',
    '!src/app/**/not-found.tsx',
    '!src/examples/**',
  ],
  // 当前阶段仅聚焦缓存模块单元测试，后续可按需逐步放开
  testMatch: [
    '<rootDir>/src/__tests__/unit/cache/**/*.test.{js,jsx,ts,tsx}',
  ],
  testPathIgnorePatterns: [
    '<rootDir>/.next/',
    '<rootDir>/node_modules/',
    '<rootDir>/src/__tests__/integration/',
    '<rootDir>/src/__tests__/e2e/',
    '<rootDir>/src/__tests__/performance/',
    '<rootDir>/src/__tests__/unit/ai/aiPerformanceAndErrorHandling.test.ts',
    '<rootDir>/src/__tests__/unit/ai/aiResponseHandling.test.ts',
    '<rootDir>/src/__tests__/unit/ai/geminiService.test.ts',
    '<rootDir>/src/__tests__/unit/auth/authMiddleware.test.ts',
    '<rootDir>/src/__tests__/unit/api/healthCheckReliability.test.ts',
    '<rootDir>/src/__tests__/unit/subscription/quota-manager.test.ts',
  ],
  transform: {
    '^.+\\.(js|jsx|ts|tsx)$': ['babel-jest', { presets: ['next/babel'] }],
  },
  transformIgnorePatterns: [
    'node_modules/(?!(d3|d3-.*|bson|mongodb|mongoose)/)',
  ],
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],
  testTimeout: 10000,
  setupFiles: ['<rootDir>/jest.env.js'],
  // 单元测试不需要全局设置
  maxWorkers: '50%',
  // 快速失败模式
  bail: false,
  // 详细输出
  verbose: true,
  // 错误时显示完整的diff
  expand: true,
  // 强制退出
  forceExit: true,
  // 检测打开的句柄
  detectOpenHandles: true,
};

module.exports = createJestConfig(customJestConfig);
