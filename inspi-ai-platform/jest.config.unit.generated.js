/**
 * Jest配置 - UNIT测试
 * 此文件由JestConfigGenerator自动生成
 * 生成时间: 2025-09-05T09:23:47.596Z
 */

const nextJest = require('next/jest');

const createJestConfig = nextJest({
  dir: './',
});

const customJestConfig = {
  'rootDir': '/Users/apple/inspi/inspi-ai-platform',
  'testEnvironment': 'jsdom',
  'testTimeout': 10000,
  'maxWorkers': '50%',
  'verbose': true,
  'silent': false,
  'bail': false,
  'detectOpenHandles': true,
  'forceExit': true,
  'moduleNameMapper': {
    '^@/(.*)$': '<rootDir>/src/$1',
    '^~/(.*)$': '<rootDir>/$1',
    '\\.(css|less|scss|sass)$': 'identity-obj-proxy',
  },
  'setupFilesAfterEnv': [
    '<rootDir>/jest.setup.js',
    '<rootDir>/jest.setup.unit.js',
  ],
  'testPathIgnorePatterns': [
    '<rootDir>/.next/',
    '<rootDir>/node_modules/',
    '<rootDir>/coverage/',
    '<rootDir>/dist/',
    '<rootDir>/build/',
    '<rootDir>/src/__tests__/api/',
    '<rootDir>/src/__tests__/integration/',
    '<rootDir>/src/__tests__/e2e/',
    '<rootDir>/src/__tests__/performance/',
  ],
  'transformIgnorePatterns': [
    'node_modules/(?!(bson|mongodb|mongoose|d3|d3-.*|@testing-library)/)',
  ],
  'testMatch': [
    '<rootDir>/src/**/*.{test,spec}.{js,jsx,ts,tsx}',
    '<rootDir>/src/**/*.unit.{test,spec}.{js,jsx,ts,tsx}',
    '<rootDir>/src/__tests__/unit/**/*.{test,spec}.{js,jsx,ts,tsx}',
    '<rootDir>/src/__tests__/components/**/*.{test,spec}.{js,jsx,ts,tsx}',
    '<rootDir>/src/__tests__/hooks/**/*.{test,spec}.{js,jsx,ts,tsx}',
    '<rootDir>/src/__tests__/utils/**/*.{test,spec}.{js,jsx,ts,tsx}',
  ],
  'moduleFileExtensions': [
    'ts',
    'tsx',
    'js',
    'jsx',
    'json',
  ],
  'clearMocks': true,
  'restoreMocks': true,
  'resetMocks': true,
  'displayName': 'Unit Tests',
  'collectCoverage': true,
  'collectCoverageFrom': [
    'src/**/*.{js,jsx,ts,tsx}',
    '!src/**/*.d.ts',
    '!src/**/*.test.{js,jsx,ts,tsx}',
    '!src/**/*.spec.{js,jsx,ts,tsx}',
    '!src/**/*.stories.{js,jsx,ts,tsx}',
  ],
  'coverageDirectory': 'coverage/unit',
  'coverageReporters': [
    'text',
    'lcov',
    'html',
    'json',
  ],
  'coverageThreshold': {
    'global': {
      'statements': 95,
      'branches': 90,
      'functions': 95,
      'lines': 95,
    },
  },
  'coveragePathIgnorePatterns': [
    'node_modules/**',
    'coverage/**',
    '**/*.d.ts',
    '**/*.test.{js,jsx,ts,tsx}',
    '**/*.spec.{js,jsx,ts,tsx}',
    '**/*.stories.{js,jsx,ts,tsx}',
    'src/types/**',
    'src/__tests__/**',
  ],
};

module.exports = createJestConfig(customJestConfig);
