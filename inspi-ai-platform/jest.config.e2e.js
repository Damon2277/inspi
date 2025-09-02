/**
 * Jest E2E测试配置
 * 用于端到端测试，需要完整的应用环境
 */
const nextJest = require('next/jest')

const createJestConfig = nextJest({
  dir: './',
})

const e2eConfig = {
  displayName: 'E2E Tests',
  setupFilesAfterEnv: ['<rootDir>/jest.setup.e2e.js'],
  testEnvironment: 'jsdom',
  testMatch: [
    '<rootDir>/src/__tests__/e2e/**/*.{js,jsx,ts,tsx}'
  ],
  testPathIgnorePatterns: [
    '<rootDir>/.next/',
    '<rootDir>/node_modules/',
    '<rootDir>/src/__tests__/unit/',
    '<rootDir>/src/__tests__/integration/',
    '<rootDir>/src/__tests__/performance/'
  ],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  collectCoverageFrom: [
    'src/app/**/*.{js,jsx,ts,tsx}',
    'src/components/**/*.{js,jsx,ts,tsx}',
    '!src/**/*.d.ts',
    '!src/**/*.test.{js,jsx,ts,tsx}',
    '!src/**/*.spec.{js,jsx,ts,tsx}',
  ],
  coverageReporters: ['text', 'lcov', 'html'],
  coverageDirectory: 'coverage/e2e',
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80
    }
  },
  testTimeout: 60000,
  maxWorkers: 1, // E2E测试串行执行
  transformIgnorePatterns: [
    'node_modules/(?!(bson|mongodb|mongoose|d3|d3-.*)/)'
  ]
}

module.exports = createJestConfig(e2eConfig)