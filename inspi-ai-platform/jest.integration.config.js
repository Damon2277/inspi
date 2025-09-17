/**
 * Jest配置文件 - 集成测试专用
 * 针对集成测试的特殊配置
 */

const baseConfig = require('./jest.config.js')

module.exports = {
  ...baseConfig,
  
  // 集成测试专用配置
  displayName: 'Integration Tests',
  
  // 只运行集成测试
  testMatch: [
    '<rootDir>/src/__tests__/integration/**/*.test.ts',
    '<rootDir>/src/__tests__/integration/**/*.test.tsx'
  ],
  
  // 集成测试需要更长的超时时间
  testTimeout: 60000, // 60秒
  
  // 集成测试环境变量
  setupFilesAfterEnv: [
    '<rootDir>/jest.setup.js',
    '<rootDir>/jest.integration.setup.js'
  ],
  
  // 集成测试可能需要更多内存
  maxWorkers: 2, // 限制并发数以避免资源竞争
  
  // 集成测试报告配置
  reporters: [
    'default',
    [
      'jest-html-reporters',
      {
        publicPath: './test-reports/integration',
        filename: 'integration-test-report.html',
        expand: true,
        hideIcon: false,
        pageTitle: '邀请系统集成测试报告'
      }
    ],
    [
      'jest-junit',
      {
        outputDirectory: './test-reports/integration',
        outputName: 'integration-test-results.xml',
        suiteName: 'Integration Tests'
      }
    ]
  ],
  
  // 覆盖率配置（集成测试关注端到端覆盖率）
  collectCoverage: true,
  collectCoverageFrom: [
    'src/lib/invitation/**/*.ts',
    'src/app/api/**/*.ts',
    'src/components/invitation/**/*.tsx',
    '!src/**/*.d.ts',
    '!src/**/*.test.ts',
    '!src/**/*.test.tsx'
  ],
  coverageDirectory: './test-reports/integration/coverage',
  coverageReporters: ['text', 'lcov', 'html'],
  
  // 集成测试可能需要的全局变量
  globals: {
    'ts-jest': {
      tsconfig: {
        jsx: 'react-jsx'
      }
    },
    // 集成测试环境标识
    __INTEGRATION_TEST__: true
  },
  
  // 模块映射（如果需要）
  moduleNameMapping: {
    ...baseConfig.moduleNameMapping
  },
  
  // 集成测试可能需要真实的模块而不是mock
  clearMocks: false,
  resetMocks: false,
  restoreMocks: false
}