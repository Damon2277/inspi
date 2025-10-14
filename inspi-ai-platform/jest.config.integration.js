/**
 * Jest 集成测试配置
 * 用于模块间交互测试，可能需要数据库和外部服务
 */
const nextJest = require('next/jest');

const createJestConfig = nextJest({
  dir: './',
});

const integrationConfig = {
  displayName: 'Integration Tests',
  setupFilesAfterEnv: ['<rootDir>/jest.setup.integration.js'],
  testEnvironment: 'node',
  testMatch: [
    '<rootDir>/src/__tests__/integration/**/*.{js,jsx,ts,tsx}',
    '<rootDir>/src/__tests__/api/**/*.{js,jsx,ts,tsx}',
  ],
  testPathIgnorePatterns: [
    '<rootDir>/.next/',
    '<rootDir>/node_modules/',
    '<rootDir>/src/__tests__/unit/',
    '<rootDir>/src/__tests__/e2e/',
    '<rootDir>/src/__tests__/performance/',
  ],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  collectCoverageFrom: [
    'src/lib/**/*.{js,jsx,ts,tsx}',
    'src/services/**/*.{js,jsx,ts,tsx}',
    'src/app/api/**/*.{js,jsx,ts,tsx}',
    '!src/**/*.d.ts',
    '!src/**/*.test.{js,jsx,ts,tsx}',
    '!src/**/*.spec.{js,jsx,ts,tsx}',
  ],
  coverageReporters: ['text', 'lcov', 'html'],
  coverageDirectory: 'coverage/integration',
  coverageThreshold: {
    global: {
      branches: 85,
      functions: 85,
      lines: 85,
      statements: 85,
    },
  },
  testTimeout: 30000,
  maxWorkers: 1, // 集成测试串行执行，避免数据库冲突
  transformIgnorePatterns: [
    'node_modules/(?!(bson|mongodb|mongoose|d3|d3-.*)/)',
  ],
};

module.exports = createJestConfig(integrationConfig);
