/**
 * Jest配置生成器
 * 根据测试类型和环境动态生成Jest配置
 */

import fs from 'fs';
import path from 'path';

import { TestConfigManager } from './TestConfigManager';

export interface JestConfigOptions {
  type: 'unit' | 'integration' | 'e2e';
  coverage?: boolean;
  watch?: boolean;
  ci?: boolean;
  parallel?: boolean;
  debug?: boolean;
  updateSnapshots?: boolean;
}

export class JestConfigGenerator {
  private configManager: TestConfigManager;

  constructor() {
    this.configManager = TestConfigManager.getInstance();
  }

  /**
   * 生成Jest配置
   */
  public generateConfig(options: JestConfigOptions): any {
    const testConfig = this.configManager.getConfigForType(options.type);
    const baseConfig = this.getBaseConfig(options);
    const typeSpecificConfig = this.getTypeSpecificConfig(options.type);
    const environmentConfig = this.getEnvironmentConfig(options);
    const coverageConfig = options.coverage ? this.getCoverageConfig(options.type) : {};

    return {
      ...baseConfig,
      ...typeSpecificConfig,
      ...environmentConfig,
      ...coverageConfig,

      // 合并配置
      setupFilesAfterEnv: [
        ...baseConfig.setupFilesAfterEnv,
        ...(typeSpecificConfig.setupFilesAfterEnv || []),
      ],

      testMatch: [
        ...baseConfig.testMatch,
        ...(typeSpecificConfig.testMatch || []),
      ],

      testPathIgnorePatterns: [
        ...baseConfig.testPathIgnorePatterns,
        ...(typeSpecificConfig.testPathIgnorePatterns || []),
      ],

      moduleNameMapper: {
        ...baseConfig.moduleNameMapper,
        ...(typeSpecificConfig.moduleNameMapper || {}),
      },
    };
  }

  /**
   * 获取基础配置
   */
  private getBaseConfig(options: JestConfigOptions): any {
    const testConfig = this.configManager.getConfigForType(options.type);

    return {
      // 基础设置
      rootDir: process.cwd(),
      testEnvironment: options.type === 'unit' ? 'jsdom' : 'node',

      // 超时设置
      testTimeout: testConfig.execution.timeout,

      // 并行设置
      maxWorkers: options.ci ? 1 : testConfig.execution.maxWorkers,

      // 输出设置
      verbose: testConfig.execution.verbose,
      silent: testConfig.execution.silent,

      // 错误处理
      bail: options.ci ? true : testConfig.execution.bail,
      detectOpenHandles: testConfig.execution.detectOpenHandles,
      forceExit: testConfig.execution.forceExit,

      // 模块解析
      moduleNameMapper: {
        '^@/(.*)$': '<rootDir>/src/$1',
        '^~/(.*)$': '<rootDir>/$1',
        '\\.(css|less|scss|sass)$': 'identity-obj-proxy',
        '\\.(jpg|jpeg|png|gif|eot|otf|webp|svg|ttf|woff|woff2|mp4|webm|wav|mp3|m4a|aac|oga)$':
          '<rootDir>/src/__tests__/__mocks__/fileMock.js',
      },

      // 基础设置文件
      setupFilesAfterEnv: [
        '<rootDir>/jest.setup.js',
      ],

      // 忽略路径
      testPathIgnorePatterns: [
        '<rootDir>/.next/',
        '<rootDir>/node_modules/',
        '<rootDir>/coverage/',
        '<rootDir>/dist/',
        '<rootDir>/build/',
      ],

      // 转换忽略
      transformIgnorePatterns: [
        'node_modules/(?!(bson|mongodb|mongoose|d3|d3-.*|@testing-library)/)',
      ],

      // 基础测试匹配
      testMatch: [
        '<rootDir>/src/**/*.{test,spec}.{js,jsx,ts,tsx}',
      ],

      // 模块文件扩展名
      moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json'],

      // 清除Mock
      clearMocks: true,
      restoreMocks: true,
      resetMocks: true,
    };
  }

  /**
   * 获取类型特定配置
   */
  private getTypeSpecificConfig(type: 'unit' | 'integration' | 'e2e'): any {
    switch (type) {
      case 'unit':
        return this.getUnitTestConfig();
      case 'integration':
        return this.getIntegrationTestConfig();
      case 'e2e':
        return this.getE2ETestConfig();
      default:
        return {};
    }
  }

  /**
   * 单元测试配置
   */
  private getUnitTestConfig(): any {
    return {
      displayName: 'Unit Tests',
      testEnvironment: 'jsdom',

      setupFilesAfterEnv: [
        '<rootDir>/jest.setup.unit.js',
      ],

      testMatch: [
        '<rootDir>/src/**/*.unit.{test,spec}.{js,jsx,ts,tsx}',
        '<rootDir>/src/__tests__/unit/**/*.{test,spec}.{js,jsx,ts,tsx}',
        '<rootDir>/src/__tests__/components/**/*.{test,spec}.{js,jsx,ts,tsx}',
        '<rootDir>/src/__tests__/hooks/**/*.{test,spec}.{js,jsx,ts,tsx}',
        '<rootDir>/src/__tests__/utils/**/*.{test,spec}.{js,jsx,ts,tsx}',
      ],

      testPathIgnorePatterns: [
        '<rootDir>/src/__tests__/api/',
        '<rootDir>/src/__tests__/integration/',
        '<rootDir>/src/__tests__/e2e/',
        '<rootDir>/src/__tests__/performance/',
      ],

      // 单元测试专用环境变量
      testEnvironmentOptions: {
        url: 'http://localhost:3000',
      },
    };
  }

  /**
   * 集成测试配置
   */
  private getIntegrationTestConfig(): any {
    return {
      displayName: 'Integration Tests',
      testEnvironment: 'node',

      setupFilesAfterEnv: [
        '<rootDir>/jest.setup.integration.js',
      ],

      testMatch: [
        '<rootDir>/src/**/*.integration.{test,spec}.{js,jsx,ts,tsx}',
        '<rootDir>/src/__tests__/integration/**/*.{test,spec}.{js,jsx,ts,tsx}',
        '<rootDir>/src/__tests__/api/**/*.{test,spec}.{js,jsx,ts,tsx}',
      ],

      testPathIgnorePatterns: [
        '<rootDir>/src/__tests__/unit/',
        '<rootDir>/src/__tests__/e2e/',
        '<rootDir>/src/__tests__/components/',
        '<rootDir>/src/__tests__/hooks/',
      ],

      // 集成测试需要更长的超时时间
      testTimeout: 30000,
    };
  }

  /**
   * E2E测试配置
   */
  private getE2ETestConfig(): any {
    return {
      displayName: 'E2E Tests',
      testEnvironment: 'node',

      setupFilesAfterEnv: [
        '<rootDir>/jest.setup.e2e.js',
      ],

      testMatch: [
        '<rootDir>/src/**/*.e2e.{test,spec}.{js,jsx,ts,tsx}',
        '<rootDir>/src/__tests__/e2e/**/*.{test,spec}.{js,jsx,ts,tsx}',
      ],

      testPathIgnorePatterns: [
        '<rootDir>/src/__tests__/unit/',
        '<rootDir>/src/__tests__/integration/',
        '<rootDir>/src/__tests__/components/',
        '<rootDir>/src/__tests__/hooks/',
        '<rootDir>/src/__tests__/api/',
      ],

      // E2E测试需要最长的超时时间
      testTimeout: 60000,

      // E2E测试通常不需要并行执行
      maxWorkers: 1,
    };
  }

  /**
   * 获取环境特定配置
   */
  private getEnvironmentConfig(options: JestConfigOptions): any {
    const config: any = {};

    // CI环境配置
    if (options.ci) {
      config.ci = true;
      config.maxWorkers = 1;
      config.bail = true;
      config.verbose = false;
      config.silent = true;
      config.reporters = [
        'default',
        ['jest-junit', {
          outputDirectory: 'test-reports',
          outputName: `${options.type}-results.xml`,
        }],
      ];
    }

    // 监视模式配置
    if (options.watch) {
      config.watchman = true;
      config.watchPathIgnorePatterns = [
        '<rootDir>/node_modules/',
        '<rootDir>/.next/',
        '<rootDir>/coverage/',
      ];
    }

    // 调试模式配置
    if (options.debug) {
      config.verbose = true;
      config.silent = false;
      config.maxWorkers = 1;
      config.detectOpenHandles = true;
    }

    // 快照更新
    if (options.updateSnapshots) {
      config.updateSnapshot = true;
    }

    return config;
  }

  /**
   * 获取覆盖率配置
   */
  private getCoverageConfig(type: 'unit' | 'integration' | 'e2e'): any {
    const testConfig = this.configManager.getConfigForType(type);

    return {
      collectCoverage: true,
      collectCoverageFrom: testConfig.reporting.collectCoverageFrom,
      coverageDirectory: `${testConfig.coverage.directory}/${type}`,
      coverageReporters: testConfig.coverage.reporters,
      coverageThreshold: {
        global: testConfig.coverage.threshold,
      },
      coveragePathIgnorePatterns: testConfig.coverage.exclude,
    };
  }

  /**
   * 生成配置文件
   */
  public generateConfigFile(options: JestConfigOptions, outputPath?: string): string {
    const config = this.generateConfig(options);
    const configContent = this.generateConfigFileContent(config, options.type);

    const filePath = outputPath || path.join(process.cwd(), `jest.config.${options.type}.generated.js`);

    fs.writeFileSync(filePath, configContent);

    return filePath;
  }

  /**
   * 生成配置文件内容
   */
  private generateConfigFileContent(config: any, type: string): string {
    return `/**
 * Jest配置 - ${type.toUpperCase()}测试
 * 此文件由JestConfigGenerator自动生成
 * 生成时间: ${new Date().toISOString()}
 */

const nextJest = require('next/jest');

const createJestConfig = nextJest({
  dir: './',
});

const customJestConfig = ${JSON.stringify(config, null, 2)};

module.exports = createJestConfig(customJestConfig);
`;
  }

  /**
   * 验证配置
   */
  public validateConfig(config: any): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    // 检查必需字段
    if (!config.testEnvironment) {
      errors.push('testEnvironment is required');
    }

    if (!config.testMatch || config.testMatch.length === 0) {
      errors.push('testMatch must contain at least one pattern');
    }

    if (!config.moduleNameMapper) {
      errors.push('moduleNameMapper is required');
    }

    // 检查超时设置
    if (config.testTimeout && config.testTimeout <= 0) {
      errors.push('testTimeout must be greater than 0');
    }

    // 检查覆盖率阈值
    if (config.coverageThreshold) {
      const { global } = config.coverageThreshold;
      if (global) {
        ['statements', 'branches', 'functions', 'lines'].forEach(metric => {
          if (global[metric] && (global[metric] < 0 || global[metric] > 100)) {
            errors.push(`Coverage threshold for ${metric} must be between 0 and 100`);
          }
        });
      }
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * 获取推荐配置
   */
  public getRecommendedConfig(type: 'unit' | 'integration' | 'e2e'): any {
    const options: JestConfigOptions = {
      type,
      coverage: true,
      ci: process.env.CI === 'true',
    };

    return this.generateConfig(options);
  }
}

export default JestConfigGenerator;
