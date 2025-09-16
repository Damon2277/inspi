/**
 * Jest配置文件 - 版本管理系统测试
 */

const path = require('path');

module.exports = {
  // 根目录设置为项目根目录
  rootDir: path.resolve(__dirname, '../..'),
  
  // 测试环境
  testEnvironment: 'node',
  
  // 测试文件匹配模式
  testMatch: [
    '<rootDir>/scripts/__tests__/**/*.test.js'
  ],
  
  // 忽略的测试文件
  testPathIgnorePatterns: [
    '/node_modules/',
    '/coverage/',
    '/dist/',
    '/build/'
  ],
  
  // 设置文件
  setupFilesAfterEnv: [
    '<rootDir>/scripts/__tests__/jest.setup.js'
  ],
  
  // 覆盖率收集
  collectCoverage: true,
  collectCoverageFrom: [
    'scripts/bump-version.js',
    'scripts/git-flow.js',
    'scripts/validate-commit-msg.js',
    'scripts/version-history.js',
    'scripts/version-rollback.js',
    'scripts/release-doc-generator.js',
    'scripts/deployment-verification.js',
    'scripts/deployment-rollback.js',
    'scripts/compatibility-checker.js',
    'scripts/dev-tools.js',
    '!scripts/__tests__/**',
    '!scripts/node_modules/**'
  ],
  
  // 覆盖率报告
  coverageReporters: [
    'text',
    'text-summary',
    'html',
    'lcov',
    'json'
  ],
  
  // 覆盖率输出目录
  coverageDirectory: '<rootDir>/coverage/version-management',
  
  // 覆盖率阈值
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80
    },
    './scripts/bump-version.js': {
      branches: 85,
      functions: 85,
      lines: 85,
      statements: 85
    },
    './scripts/validate-commit-msg.js': {
      branches: 90,
      functions: 90,
      lines: 90,
      statements: 90
    }
  },
  
  // 测试超时
  testTimeout: 30000,
  
  // 详细输出
  verbose: true,
  
  // 错误时停止
  bail: false,
  
  // 最大并发数
  maxConcurrency: 5,
  
  // 模块名称映射
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '^@scripts/(.*)$': '<rootDir>/scripts/$1'
  },
  
  // 全局变量
  globals: {
    'NODE_ENV': 'test'
  },
  
  // 转换忽略模式
  transformIgnorePatterns: [
    '/node_modules/(?!(some-es6-module)/)'
  ],
  
  // 清理模拟
  clearMocks: true,
  restoreMocks: true,
  resetMocks: true,
  
  // 报告器
  reporters: [
    'default'
  ],
  
  // 测试结果处理器 (暂时禁用)
  // testResultsProcessor: '<rootDir>/scripts/__tests__/test-results-processor.js'
};