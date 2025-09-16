/**
 * 测试环境检测和初始化 (JavaScript版本)
 * 自动检测测试环境并进行相应的初始化配置
 */

const { TestConfigManager } = require('./TestConfigManager');
const fs = require('fs');
const path = require('path');
const os = require('os');

class TestEnvironment {
  constructor() {
    if (TestEnvironment.instance) {
      return TestEnvironment.instance;
    }
    
    this.configManager = TestConfigManager.getInstance();
    this.initialized = false;
    
    TestEnvironment.instance = this;
  }

  static getInstance() {
    if (!TestEnvironment.instance) {
      TestEnvironment.instance = new TestEnvironment();
    }
    return TestEnvironment.instance;
  }

  /**
   * 检测当前环境信息
   */
  detectEnvironment() {
    const testType = this.detectTestType();
    
    return {
      type: testType,
      nodeVersion: process.version,
      platform: process.platform,
      ci: this.isCI(),
      docker: this.isDocker(),
      memory: process.memoryUsage().heapTotal,
      cpus: os.cpus().length,
    };
  }

  /**
   * 检测测试类型
   */
  detectTestType() {
    // 从环境变量检测
    if (process.env.TEST_TYPE) {
      return process.env.TEST_TYPE;
    }

    // 从Jest配置检测
    if (process.env.JEST_WORKER_ID) {
      const jestConfig = process.env.npm_config_argv;
      if (jestConfig) {
        try {
          const config = JSON.parse(jestConfig);
          const configFile = config.original?.find(arg => arg.includes('jest.config'));
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

    // 默认为单元测试
    return 'unit';
  }

  /**
   * 检测是否在CI环境中
   */
  isCI() {
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
  isDocker() {
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
  async initialize() {
    const errors = [];
    const warnings = [];
    
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
  setupEnvironmentVariables(config, environment) {
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
  createDirectories(config) {
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
  checkSystemResources(environment) {
    const warnings = [];
    
    // 检查内存
    const memoryGB = environment.memory / (1024 * 1024 * 1024);
    if (memoryGB < 2) {
      warnings.push('Low memory detected. Tests may run slowly.');
    }

    // 检查CPU
    if (environment.cpus < 2) {
      warnings.push('Limited CPU cores detected. Parallel execution may be limited.');
    }

    return warnings;
  }

  /**
   * 设置全局测试工具
   */
  setupGlobalTestUtils(environment, config) {
    // 设置全局测试工具对象
    global.testUtils = {
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
      wait: (ms) => new Promise(resolve => setTimeout(resolve, ms)),
      
      // 重试函数
      retry: async (fn, maxAttempts = 3, delay = 1000) => {
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
  }

  /**
   * 清理测试环境
   */
  async cleanup() {
    if (!this.initialized) {
      return;
    }

    try {
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
  getStatus() {
    return {
      initialized: this.initialized,
      environment: this.detectEnvironment(),
      uptime: process.uptime(),
    };
  }

  /**
   * 检查环境健康状态
   */
  async healthCheck() {
    const checks = [];

    // 检查配置
    const configValidation = this.configManager.validateConfig();
    checks.push({
      name: 'Configuration',
      status: configValidation.valid ? 'pass' : 'fail',
      message: configValidation.errors.join(', '),
    });

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

module.exports = { TestEnvironment };