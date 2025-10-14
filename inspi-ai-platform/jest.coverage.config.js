/**
 * Jest覆盖率配置
 * 专门用于生成详细的测试覆盖率报告
 */
const baseConfig = require('./jest.config.js')

module.exports = {
  ...baseConfig,
  collectCoverage: true,
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
    '!src/app/**/page.tsx',
    '!src/examples/**',
    '!src/scripts/**',
  ],
  coverageDirectory: 'coverage',
  coverageReporters: [
    'text',
    'text-summary',
    'html',
    'lcov',
    'json',
    'json-summary',
  ],
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80,
    },
    // 核心模块要求更高的覆盖率
    'src/core/**/*.{js,ts}': {
      branches: 90,
      functions: 90,
      lines: 90,
      statements: 90,
    },
    // API路由要求高覆盖率
    'src/app/api/**/*.{js,ts}': {
      branches: 85,
      functions: 85,
      lines: 85,
      statements: 85,
    },
    // 共享工具要求高覆盖率
    'src/shared/**/*.{js,ts}': {
      branches: 85,
      functions: 85,
      lines: 85,
      statements: 85,
    },
  },
  // 覆盖率报告配置
  coveragePathIgnorePatterns: [
    '/node_modules/',
    '/.next/',
    '/coverage/',
    '/dist/',
    '/build/',
    '\\.d\\.ts$',
    '\\.stories\\.(js|jsx|ts|tsx)$',
    '/src/examples/',
    '/src/scripts/',
  ],
  // 详细的覆盖率输出
  verbose: true,
  // 在覆盖率低于阈值时失败
  coverageFailureThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80,
    },
  },
}