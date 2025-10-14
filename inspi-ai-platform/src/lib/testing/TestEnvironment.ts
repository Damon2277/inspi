/**
 * 测试环境检测和初始化
 * 自动检测测试环境并进行相应的初始化配置
 */

import fs from 'fs';
import path from 'path';

import { TestConfigManager } from './TestConfigManager';
import { TestDatabaseManager } from './TestDatabaseManager';

export interface EnvironmentInfo {
  type: 'unit' | 'integration' | 'e2e';
  nodeVersion: string;
  platform: string;
  ci: boolean;
  docker: boolean;
  memory: number;
  cpus: number;
}

export interface InitializationResult {
  success: boolean;
  environment: EnvironmentInfo;
  config: any;
  errors: string[];
  warnings: string[];
}

export class TestEnvironment {
  private static instance: TestEnvironment;
  private configManager: TestConfigManager;
  private dbManager: TestDatabaseManager;
  private initialized: boolean = false;

  private constructor() {
    this.configManager = TestConfigManager.getInstance();
    this.dbManager = TestDatabaseManager.getInstance();
  }

  public static getInstance(): TestEnvironment {
    if (!TestEnvironment.instance) {
      TestEnvironment.instance = new TestEnvironment();
    }
    return TestEnvironment.instance;
  }

  /**
   * 检测当前环境信息
   */
  public detectEnvironment(): EnvironmentInfo {
    const testType = this.detectTestType();

    return {
      type: testType,
      nodeVersion: process.version,
      platform: process.platform,
      ci: this.isCI(),
      docker: this.isDocker(),
      memory: process.memoryUsage().heapTotal,
      cpus: require('os').cpus().length,
    };
  }

  /**
   * 检测测试类型
   */
  private detectTestType(): 'unit' | 'integration' | 'e2e' {
    // 从环境变量检测
    if (process.env.TEST_TYPE) {
      return process.env.TEST_TYPE as 'unit' | 'integration' | 'e2e';
    }

    // 从Jest配置检测
    if (process.env.JEST_WORKER_ID) {
      const jestConfig = process.env.npm_config_argv;
      if (jestConfig) {
        try {
          const config = JSON.parse(jestConfig);
          const configFile = config.original?.find((arg: string) => arg.includes('jest.config'));
          if (configFile) {
            if (configFile.includes('unit')) return 'unit';
            if (configFile.includes('integration')) return 'integration';
            if (configFile.includes('e2e')) return 'e2e';
          }
        } catch (error) {
          // 忽略解析错误
        }
      }
    }

    // 从测试文件路径检测
    const testFile = process.env.JEST_CURRENT_TEST_FILE;
    if (testFile) {
      if (testFile.includes('/unit/') || testFile.includes('.unit.')) return 'unit';
      if (testFile.includes('/integration/') || testFile.includes('.integration.')) return 'integration';
      if (testFile.includes('/e2e/') || testFile.includes('.e2e.')) return 'e2e';
    }

    // 默认为单元测试
    return 'unit';
  }

  /**
   * 检测是否在CI环境中
   */
  private isCI(): boolean {
    return !!(
      process.env.CI ||
      process.env.CONTINUOUS_INTEGRATION ||
      process.env.BUILD_NUMBER ||
      process.env.GITHUB_ACTIONS ||
      process.env.GITLAB_CI ||
      process.env.JENKINS_URL ||
      process.env.TRAVIS ||
      process.env.CIRCLECI
    );
  }

  /**
   * 检测是否在Docker容器中
   */
  private isDocker(): boolean {
    try {
      return fs.existsSync('/.dockerenv') ||
             fs.readFileSync('/proc/1/cgroup', 'utf8').includes('docker');
    } catch (error) {
      return false;
    }
  }

  /**
   * 初始化测试环境
   */
  public async initialize(): Promise<InitializationResult> {
    const errors: string[] = [];
    const warnings: string[] = [];

    try {
      // 检测环境
      const environment = this.detectEnvironment();

      // 获取配置
      const config = this.configManager.getConfigForType(environment.type);

      // 验证配置
      const validation = this.configManager.validateConfig();
      if (!validation.valid) {
        errors.push(...validation.errors);
      }

      // 设置环境变量
      this.setupEnvironmentVariables(config, environment);

      // 初始化数据库连接（如果需要）
      if (!config.mocks.database) {
        try {
          await this.dbManager.initialize(config.database);
        } catch (error) {
          errors.push(`Database initialization failed: ${error}`);
        }
      }

      // 创建必要的目录
      this.createDirectories(config);

      // 检查系统资源
      const resourceWarnings = this.checkSystemResources(environment);
      warnings.push(...resourceWarnings);

      // 设置全局测试工具
      this.setupGlobalTestUtils(environment, config);

      this.initialized = true;

      return {
        success: errors.length === 0,
        environment,
        config,
        errors,
        warnings,
      };
    } catch (error) {
      errors.push(`Environment initialization failed: ${error}`);

      return {
        success: false,
        environment: this.detectEnvironment(),
        config: null,
        errors,
        warnings,
      };
    }
  }

  /**
   * 设置环境变量
   */
  private setupEnvironmentVariables(config: any, environment: EnvironmentInfo): void {
    // 基础环境变量
    process.env.NODE_ENV = 'test';
    process.env.TEST_TYPE = environment.type;
    process.env.TEST_TIMEOUT = config.execution.timeout.toString();

    // 设置自定义环境变量
    Object.entries(config.environment.variables).forEach(([key, value]) => {
      process.env[key] = value;
    });

    // CI环境特殊设置
    if (environment.ci) {
      process.env.CI = 'true';
      process.env.FORCE_COLOR = '0'; // 禁用颜色输出
    }

    // Docker环境特殊设置
    if (environment.docker) {
      process.env.DOCKER = 'true';
    }
  }

  /**
   * 创建必要的目录
   */
  private createDirectories(config: any): void {
    const directories = [
      config.coverage.directory,
      config.reporting.outputDir,
      'logs/test',
      'tmp/test',
    ];

    directories.forEach(dir => {
      const fullPath = path.join(process.cwd(), dir);
      if (!fs.existsSync(fullPath)) {
        fs.mkdirSync(fullPath, { recursive: true });
      }
    });
  }

  /**
   * 检查系统资源
   */
  private checkSystemResources(environment: EnvironmentInfo): string[] {
    const warnings: string[] = [];

    // 检查内存
    const memoryGB = environment.memory / (1024 * 1024 * 1024);
    if (memoryGB < 2) {
      warnings.push('Low memory detected. Tests may run slowly.');
    }

    // 检查CPU
    if (environment.cpus < 2) {
      warnings.push('Limited CPU cores detected. Parallel execution may be limited.');
    }

    // 检查磁盘空间
    try {
      const stats = fs.statSync(process.cwd());
      // 这里可以添加磁盘空间检查逻辑
    } catch (error) {
      warnings.push('Could not check disk space.');
    }

    return warnings;
  }

  /**
   * 设置全局测试工具
   */
  private setupGlobalTestUtils(environment: EnvironmentInfo, config: any): void {
    // 设置全局测试工具对象
    (global as any).testUtils = {
      environment,
      config,
      isUnitTest: environment.type === 'unit',
      isIntegrationTest: environment.type === 'integration',
      isE2ETest: environment.type === 'e2e',
      isCI: environment.ci,
      isDocker: environment.docker,

      // 工具函数
      createTestId: () => `test_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,

      // 等待函数
      wait: (ms: number) => new Promise(resolve => setTimeout(resolve, ms)),

      // 重试函数
      retry: async (fn: () => Promise<any>, maxAttempts: number = 3, delay: number = 1000) => {
        let lastError;
        for (let i = 0; i < maxAttempts; i++) {
          try {
            return await fn();
          } catch (error) {
            lastError = error;
            if (i < maxAttempts - 1) {
              await new Promise(resolve => setTimeout(resolve, delay));
            }
          }
        }
        throw lastError;
      },
    };

    // 设置Jest全局变量
    if (typeof jest !== 'undefined') {
      jest.setTimeout(config.execution.timeout);
    }
  }

  /**
   * 清理测试环境
   */
  public async cleanup(): Promise<void> {
    if (!this.initialized) {
      return;
    }

    try {
      // 清理数据库连接
      await this.dbManager.cleanup();

      // 清理临时文件
      const tmpDir = path.join(process.cwd(), 'tmp/test');
      if (fs.existsSync(tmpDir)) {
        fs.rmSync(tmpDir, { recursive: true, force: true });
      }

      // 重置环境变量
      delete process.env.TEST_TYPE;
      delete process.env.TEST_TIMEOUT;

      this.initialized = false;
    } catch (error) {
      console.error('Error during test environment cleanup:', error);
    }
  }

  /**
   * 获取环境状态
   */
  public getStatus(): {
    initialized: boolean;
    environment: EnvironmentInfo;
    uptime: number;
  } {
    return {
      initialized: this.initialized,
      environment: this.detectEnvironment(),
      uptime: process.uptime(),
    };
  }

  /**
   * 检查环境健康状态
   */
  public async healthCheck(): Promise<{
    healthy: boolean;
    checks: Array<{ name: string; status: 'pass' | 'fail'; message?: string }>;
  }> {
    const checks = [];

    // 检查配置
    const configValidation = this.configManager.validateConfig();
    checks.push({
      name: 'Configuration',
      status: configValidation.valid ? 'pass' : 'fail',
      message: configValidation.errors.join(', '),
    });

    // 检查数据库连接
    try {
      const dbStatus = await this.dbManager.healthCheck();
      checks.push({
        name: 'Database',
        status: dbStatus.healthy ? 'pass' : 'fail',
        message: dbStatus.message,
      });
    } catch (error) {
      checks.push({
        name: 'Database',
        status: 'fail',
        message: `Database health check failed: ${error}`,
      });
    }

    // 检查文件系统权限
    try {
      const testFile = path.join(process.cwd(), 'tmp/test/health-check.txt');
      fs.writeFileSync(testFile, 'health check');
      fs.unlinkSync(testFile);
      checks.push({
        name: 'File System',
        status: 'pass',
      });
    } catch (error) {
      checks.push({
        name: 'File System',
        status: 'fail',
        message: `File system access failed: ${error}`,
      });
    }

    const healthy = checks.every(check => check.status === 'pass');

    return { healthy, checks };
  }
}

export default TestEnvironment;
