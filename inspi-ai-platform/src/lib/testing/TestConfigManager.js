/**
 * 测试配置管理器 (JavaScript版本)
 * 统一管理所有测试相关的配置和环境设置
 */

// Try to import environment config, fallback to process.env
let env;
try {
  env = require('../../config/environment').env;
} catch (error) {
  env = process.env;
}
const fs = require('fs');
const path = require('path');

class TestConfigManager {
  constructor() {
    if (TestConfigManager.instance) {
      return TestConfigManager.instance;
    }

    this.configPath = path.join(process.cwd(), 'test.config.json');
    this.config = this.loadConfig();

    TestConfigManager.instance = this;
  }

  static getInstance() {
    if (!TestConfigManager.instance) {
      TestConfigManager.instance = new TestConfigManager();
    }
    return TestConfigManager.instance;
  }

  /**
   * 加载测试配置
   */
  loadConfig() {
    const defaultConfig = this.getDefaultConfig();

    try {
      if (fs.existsSync(this.configPath)) {
        const userConfig = JSON.parse(fs.readFileSync(this.configPath, 'utf8'));
        return this.mergeConfigs(defaultConfig, userConfig);
      }
    } catch (error) {
      console.warn('Failed to load test config, using defaults:', error);
    }

    return defaultConfig;
  }

  /**
   * 获取默认配置
   */
  getDefaultConfig() {
    return {
      coverage: {
        threshold: {
          statements: 95,
          branches: 90,
          functions: 95,
          lines: 95,
        },
        exclude: [
          'node_modules/**',
          'coverage/**',
          '**/*.d.ts',
          '**/*.test.{js,jsx,ts,tsx}',
          '**/*.spec.{js,jsx,ts,tsx}',
          '**/*.stories.{js,jsx,ts,tsx}',
          'src/types/**',
          'src/__tests__/**',
        ],
        include: [
          'src/**/*.{js,jsx,ts,tsx}',
        ],
        reporters: ['text', 'lcov', 'html', 'json'],
        directory: 'coverage',
      },

      execution: {
        timeout: 60000,
        maxWorkers: '50%',
        parallel: true,
        bail: false,
        verbose: true,
        silent: false,
        detectOpenHandles: true,
        forceExit: true,
      },

      reporting: {
        formats: ['html', 'json', 'junit'],
        outputDir: 'test-reports',
        verbose: true,
        collectCoverageFrom: [
          'src/**/*.{js,jsx,ts,tsx}',
          '!src/**/*.d.ts',
          '!src/**/*.test.{js,jsx,ts,tsx}',
          '!src/**/*.spec.{js,jsx,ts,tsx}',
          '!src/**/*.stories.{js,jsx,ts,tsx}',
        ],
      },

      quality: {
        gates: [
          {
            name: 'Coverage Gate',
            condition: {
              type: 'coverage',
              threshold: 95,
              operator: 'gte',
              metric: 'statements',
            },
            action: {
              type: 'fail',
              message: 'Coverage threshold not met',
            },
            enabled: true,
          },
        ],
        notifications: [],
        failFast: false,
      },

      database: {
        mongodb: {
          uri: env?.MONGODB_URI || 'mongodb://localhost:27017/test',
          dbName: 'test_db',
          options: {
            useNewUrlParser: true,
            useUnifiedTopology: true,
          },
        },
        redis: {
          url: env?.REDIS_URL || 'redis://localhost:6379',
          password: env?.REDIS_PASSWORD,
          options: {
            retryDelayOnFailover: 100,
            maxRetriesPerRequest: 3,
          },
        },
      },

      mocks: {
        external: true,
        database: true,
        filesystem: false,
        network: true,
      },

      environment: {
        type: 'unit',
        variables: {
          NODE_ENV: 'test',
          TEST_TIMEOUT: '30000',
          LOG_LEVEL: 'error',
        },
        cleanup: true,
      },
    };
  }

  /**
   * 合并配置
   */
  mergeConfigs(defaultConfig, userConfig) {
    return {
      ...defaultConfig,
      ...userConfig,
      coverage: {
        ...defaultConfig.coverage,
        ...userConfig.coverage,
        threshold: {
          ...defaultConfig.coverage.threshold,
          ...userConfig.coverage?.threshold,
        },
      },
      execution: {
        ...defaultConfig.execution,
        ...userConfig.execution,
      },
      reporting: {
        ...defaultConfig.reporting,
        ...userConfig.reporting,
      },
      quality: {
        ...defaultConfig.quality,
        ...userConfig.quality,
        gates: userConfig.quality?.gates || defaultConfig.quality.gates,
      },
      database: {
        ...defaultConfig.database,
        ...userConfig.database,
        mongodb: {
          ...defaultConfig.database.mongodb,
          ...userConfig.database?.mongodb,
        },
        redis: {
          ...defaultConfig.database.redis,
          ...userConfig.database?.redis,
        },
      },
      mocks: {
        ...defaultConfig.mocks,
        ...userConfig.mocks,
      },
      environment: {
        ...defaultConfig.environment,
        ...userConfig.environment,
        variables: {
          ...defaultConfig.environment.variables,
          ...userConfig.environment?.variables,
        },
      },
    };
  }

  /**
   * 获取配置
   */
  getConfig() {
    return this.config;
  }

  /**
   * 获取特定类型的配置
   */
  getConfigForType(type) {
    const config = { ...this.config };

    // 根据测试类型调整配置
    switch (type) {
      case 'unit':
        config.execution.timeout = 10000;
        config.mocks.external = true;
        config.mocks.database = true;
        config.coverage.threshold.statements = 95;
        break;

      case 'integration':
        config.execution.timeout = 30000;
        config.mocks.external = false;
        config.mocks.database = false;
        config.coverage.threshold.statements = 85;
        break;

      case 'e2e':
        config.execution.timeout = 60000;
        config.mocks.external = false;
        config.mocks.database = false;
        config.coverage.threshold.statements = 70;
        break;
    }

    config.environment.type = type;
    return config;
  }

  /**
   * 更新配置
   */
  updateConfig(updates) {
    this.config = this.mergeConfigs(this.config, updates);
    this.saveConfig();
  }

  /**
   * 保存配置到文件
   */
  saveConfig() {
    try {
      fs.writeFileSync(this.configPath, JSON.stringify(this.config, null, 2));
    } catch (error) {
      console.error('Failed to save test config:', error);
    }
  }

  /**
   * 验证配置
   */
  validateConfig() {
    const errors = [];

    // 验证覆盖率阈值
    const { threshold } = this.config.coverage;
    if (threshold.statements < 0 || threshold.statements > 100) {
      errors.push('Coverage threshold for statements must be between 0 and 100');
    }
    if (threshold.branches < 0 || threshold.branches > 100) {
      errors.push('Coverage threshold for branches must be between 0 and 100');
    }
    if (threshold.functions < 0 || threshold.functions > 100) {
      errors.push('Coverage threshold for functions must be between 0 and 100');
    }
    if (threshold.lines < 0 || threshold.lines > 100) {
      errors.push('Coverage threshold for lines must be between 0 and 100');
    }

    // 验证执行配置
    if (this.config.execution.timeout <= 0) {
      errors.push('Execution timeout must be greater than 0');
    }

    // 验证数据库配置
    if (!this.config.database.mongodb.uri) {
      errors.push('MongoDB URI is required');
    }
    if (!this.config.database.redis.url) {
      errors.push('Redis URL is required');
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * 重置为默认配置
   */
  resetToDefaults() {
    this.config = this.getDefaultConfig();
    this.saveConfig();
  }

  /**
   * 获取Jest配置
   */
  getJestConfig(type = 'unit') {
    const config = this.getConfigForType(type);

    return {
      displayName: `${type.charAt(0).toUpperCase() + type.slice(1)} Tests`,
      testEnvironment: type === 'unit' ? 'jsdom' : 'node',
      setupFilesAfterEnv: [`<rootDir>/jest.setup.${type}.js`],
      testTimeout: config.execution.timeout,
      maxWorkers: config.execution.maxWorkers,
      verbose: config.execution.verbose,
      silent: config.execution.silent,
      detectOpenHandles: config.execution.detectOpenHandles,
      forceExit: config.execution.forceExit,
      bail: config.execution.bail,

      collectCoverageFrom: config.reporting.collectCoverageFrom,
      coverageDirectory: `${config.coverage.directory}/${type}`,
      coverageReporters: config.coverage.reporters,
      coverageThreshold: {
        global: config.coverage.threshold,
      },

      moduleNameMapper: {
        '^@/(.*)$': '<rootDir>/src/$1',
      },

      testPathIgnorePatterns: [
        '<rootDir>/.next/',
        '<rootDir>/node_modules/',
        '<rootDir>/coverage/',
      ],

      transformIgnorePatterns: [
        'node_modules/(?!(bson|mongodb|mongoose|d3|d3-.*)/)',
      ],
    };
  }
}

module.exports = { TestConfigManager };
