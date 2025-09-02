/**
 * Jest 单元测试配置
 * 专门用于单元测试，快速执行，不依赖外部服务
 */
const nextJest = require('next/jest')

const createJestConfig = nextJest({
  dir: './',
})

const unitConfig = {
  displayName: 'Unit Tests',
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  testEnvironment: 'jsdom',
  testMatch: [
    '<rootDir>/src/**/*.test.{js,jsx,ts,tsx}',
    '<rootDir>/src/__tests__/unit/**/*.{js,jsx,ts,tsx}',
    '<rootDir>/src/__tests__/components/**/*.{js,jsx,ts,tsx}',
    '<rootDir>/src/__tests__/hooks/**/*.{js,jsx,ts,tsx}',
    '<rootDir>/src/__tests__/utils/**/*.{js,jsx,ts,tsx}'
  ],
  testPathIgnorePatterns: [
    '<rootDir>/.next/',
    '<rootDir>/node_modules/',
    '<rootDir>/src/__tests__/api/',
    '<rootDir>/src/__tests__/integration/',
    '<rootDir>/src/__tests__/e2e/',
    '<rootDir>/src/__tests__/performance/',
    '<rootDir>/src/__tests__/security/'
  ],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  collectCoverageFrom: [
    'src/components/**/*.{js,jsx,ts,tsx}',
    'src/hooks/**/*.{js,jsx,ts,tsx}',
    'src/lib/**/*.{js,jsx,ts,tsx}',
    'src/utils/**/*.{js,jsx,ts,tsx}',
    '!src/**/*.d.ts',
    '!src/**/*.stories.{js,jsx,ts,tsx}',
    '!src/**/*.test.{js,jsx,ts,tsx}',
    '!src/**/*.spec.{js,jsx,ts,tsx}',
  ],
  coverageReporters: ['text', 'lcov', 'html'],
  coverageDirectory: 'coverage/unit',
  coverageThreshold: {
    global: {
      branches: 90,
      functions: 90,
      lines: 90,
      statements: 90
    }
  },
  testTimeout: 10000,
  maxWorkers: '50%',
  transformIgnorePatterns: [
    'node_modules/(?!(bson|mongodb|mongoose|d3|d3-.*)/)'
  ]
}

module.exports = createJestConfig(unitConfig)