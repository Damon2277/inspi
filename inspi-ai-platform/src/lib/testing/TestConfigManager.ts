/**
 * 测试配置管理器
 * 统一管理所有测试相关的配置和环境设置
 */

import fs from 'fs';
import path from 'path';

import { env } from '@/shared/config/environment';

export interface TestConfig {
  coverage: {
    threshold: {
      statements: number;
      branches: number;
      functions: number;
      lines: number;
    };
    exclude: string[];
    include: string[];
    reporters: string[];
    directory: string;
  };

  execution: {
    timeout: number;
    maxWorkers: number | string;
    parallel: boolean;
    bail: boolean;
    verbose: boolean;
    silent: boolean;
    detectOpenHandles: boolean;
    forceExit: boolean;
  };

  reporting: {
    formats: ('html' | 'json' | 'markdown' | 'junit')[];
    outputDir: string;
    verbose: boolean;
    collectCoverageFrom: string[];
  };

  quality: {
    gates: QualityGate[];
    notifications: NotificationConfig[];
    failFast: boolean;
  };

  database: {
    mongodb: {
      uri: string;
      dbName: string;
      options: Record<string, any>;
    };
    redis: {
      url: string;
      password?: string;
      options: Record<string, any>;
    };
  };

  mocks: {
    external: boolean;
    database: boolean;
    filesystem: boolean;
    network: boolean;
  };

  environment: {
    type: 'unit' | 'integration' | 'e2e';
    variables: Record<string, string>;
    cleanup: boolean;
  };
}

export interface QualityGate {
  name: string;
  condition: QualityCondition;
  action: QualityAction;
  enabled: boolean;
}

export interface QualityCondition {
  type: 'coverage' | 'performance' | 'security' | 'flakiness';
  threshold: number;
  operator: 'gte' | 'lte' | 'eq';
  metric?: string;
}

export interface QualityAction {
  type: 'fail' | 'warn' | 'notify';
  message: string;
  webhook?: string;
}

export interface NotificationConfig {
  type: 'email' | 'slack' | 'webhook';
  enabled: boolean;
  config: Record<string, any>;
}

export class TestConfigManager {
  private static instance: TestConfigManager;
  private config: TestConfig;
  private configPath: string;

  private constructor() {
    this.configPath = path.join(process.cwd(), 'test.config.json');
    this.config = this.loadConfig();
  }

  public static getInstance(): TestConfigManager {
    if (!TestConfigManager.instance) {
      TestConfigManager.instance = new TestConfigManager();
    }
    return TestConfigManager.instance;
  }

  /**
   * 加载测试配置
   */
  private loadConfig(): TestConfig {
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
  private getDefaultConfig(): TestConfig {
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
          {
            name: 'Performance Gate',
            condition: {
              type: 'performance',
              threshold: 60000,
              operator: 'lte',
              metric: 'execution_time',
            },
            action: {
              type: 'warn',
              message: 'Test execution time exceeded threshold',
            },
            enabled: true,
          },
        ],
        notifications: [],
        failFast: false,
      },

      database: {
        mongodb: {
          uri: env.MONGODB_URI || 'mongodb://localhost:27017/test',
          dbName: 'test_db',
          options: {
            useNewUrlParser: true,
            useUnifiedTopology: true,
          },
        },
        redis: {
          url: env.REDIS_URL || 'redis://localhost:6379',
          password: env.REDIS_PASSWORD,
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
  private mergeConfigs(defaultConfig: TestConfig, userConfig: Partial<TestConfig>): TestConfig {
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
  public getConfig(): TestConfig {
    return this.config;
  }

  /**
   * 获取特定类型的配置
   */
  public getConfigForType(type: 'unit' | 'integration' | 'e2e'): TestConfig {
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
  public updateConfig(updates: Partial<TestConfig>): void {
    this.config = this.mergeConfigs(this.config, updates);
    this.saveConfig();
  }

  /**
   * 保存配置到文件
   */
  private saveConfig(): void {
    try {
      fs.writeFileSync(this.configPath, JSON.stringify(this.config, null, 2));
    } catch (error) {
      console.error('Failed to save test config:', error);
    }
  }

  /**
   * 验证配置
   */
  public validateConfig(): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

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
  public resetToDefaults(): void {
    this.config = this.getDefaultConfig();
    this.saveConfig();
  }

  /**
   * 获取Jest配置
   */
  public getJestConfig(type: 'unit' | 'integration' | 'e2e' = 'unit'): any {
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

export default TestConfigManager;
