/**
 * 测试配置系统验证测试
 * 验证新的测试配置和管理系统是否正常工作
 */

import {
  TestConfigManager,
  TestEnvironment,
  TestDatabaseManager,
  JestConfigGenerator,
} from '@/lib/testing';

describe('Test Configuration System', () => {
  describe('TestConfigManager', () => {
    let configManager: TestConfigManager;

    beforeEach(() => {
      configManager = TestConfigManager.getInstance();
    });

    it('should create singleton instance', () => {
      const instance1 = TestConfigManager.getInstance();
      const instance2 = TestConfigManager.getInstance();
      expect(instance1).toBe(instance2);
    });

    it('should load default configuration', () => {
      const config = configManager.getConfig();

      expect(config).toBeDefined();
      expect(config.coverage.threshold.statements).toBe(95);
      expect(config.execution.timeout).toBe(60000);
      expect(config.execution.parallel).toBe(true);
    });

    it('should validate configuration', () => {
      const validation = configManager.validateConfig();

      expect(validation.valid).toBe(true);
      expect(validation.errors).toHaveLength(0);
    });

    it('should get type-specific configuration', () => {
      const unitConfig = configManager.getConfigForType('unit');
      const integrationConfig = configManager.getConfigForType('integration');
      const e2eConfig = configManager.getConfigForType('e2e');

      expect(unitConfig.execution.timeout).toBe(10000);
      expect(integrationConfig.execution.timeout).toBe(30000);
      expect(e2eConfig.execution.timeout).toBe(60000);

      expect(unitConfig.mocks.database).toBe(true);
      expect(integrationConfig.mocks.database).toBe(false);
      expect(e2eConfig.mocks.database).toBe(false);
    });

    it('should generate Jest configuration', () => {
      const jestConfig = configManager.getJestConfig('unit');

      expect(jestConfig).toBeDefined();
      expect(jestConfig.displayName).toBe('Unit Tests');
      expect(jestConfig.testEnvironment).toBe('jsdom');
      expect(jestConfig.testTimeout).toBe(10000);
      expect(jestConfig.moduleNameMapper).toBeDefined();
      expect(jestConfig.coverageThreshold).toBeDefined();
    });
  });

  describe('TestEnvironment', () => {
    let testEnvironment: TestEnvironment;

    beforeEach(() => {
      testEnvironment = TestEnvironment.getInstance();
    });

    it('should create singleton instance', () => {
      const instance1 = TestEnvironment.getInstance();
      const instance2 = TestEnvironment.getInstance();
      expect(instance1).toBe(instance2);
    });

    it('should detect environment information', () => {
      const envInfo = testEnvironment.detectEnvironment();

      expect(envInfo).toBeDefined();
      expect(envInfo.type).toMatch(/^(unit|integration|e2e)$/);
      expect(envInfo.nodeVersion).toBeDefined();
      expect(envInfo.platform).toBeDefined();
      expect(typeof envInfo.ci).toBe('boolean');
      expect(typeof envInfo.docker).toBe('boolean');
      expect(typeof envInfo.memory).toBe('number');
      expect(typeof envInfo.cpus).toBe('number');
    });

    it('should get status', () => {
      const status = testEnvironment.getStatus();

      expect(status).toBeDefined();
      expect(typeof status.initialized).toBe('boolean');
      expect(status.environment).toBeDefined();
      expect(typeof status.uptime).toBe('number');
    });
  });

  describe('TestDatabaseManager', () => {
    let dbManager: TestDatabaseManager;

    beforeEach(() => {
      dbManager = TestDatabaseManager.getInstance();
    });

    it('should create singleton instance', () => {
      const instance1 = TestDatabaseManager.getInstance();
      const instance2 = TestDatabaseManager.getInstance();
      expect(instance1).toBe(instance2);
    });

    it('should get database status', () => {
      const status = dbManager.getStatus();

      expect(status).toBeDefined();
      expect(status.mongodb).toBeDefined();
      expect(status.redis).toBeDefined();
      expect(typeof status.mongodb.connected).toBe('boolean');
      expect(typeof status.redis.connected).toBe('boolean');
    });

    it('should perform health check', async () => {
      const health = await dbManager.healthCheck();

      expect(health).toBeDefined();
      expect(typeof health.healthy).toBe('boolean');

      if (!health.healthy) {
        expect(health.message).toBeDefined();
      }
    });
  });

  describe('JestConfigGenerator', () => {
    let generator: JestConfigGenerator;

    beforeEach(() => {
      generator = new JestConfigGenerator();
    });

    it('should generate unit test configuration', () => {
      const config = generator.generateConfig({
        type: 'unit',
        coverage: true,
      });

      expect(config).toBeDefined();
      expect(config.displayName).toBe('Unit Tests');
      expect(config.testEnvironment).toBe('jsdom');
      expect(config.collectCoverage).toBe(true);
    });

    it('should generate integration test configuration', () => {
      const config = generator.generateConfig({
        type: 'integration',
        coverage: false,
      });

      expect(config).toBeDefined();
      expect(config.displayName).toBe('Integration Tests');
      expect(config.testEnvironment).toBe('node');
      expect(config.collectCoverage).toBeUndefined();
    });

    it('should generate e2e test configuration', () => {
      const config = generator.generateConfig({
        type: 'e2e',
        ci: true,
      });

      expect(config).toBeDefined();
      expect(config.displayName).toBe('E2E Tests');
      expect(config.testEnvironment).toBe('node');
      expect(config.maxWorkers).toBe(1);
      expect(config.ci).toBe(true);
    });

    it('should validate configuration', () => {
      const config = generator.generateConfig({
        type: 'unit',
        coverage: true,
      });

      const validation = generator.validateConfig(config);

      expect(validation.valid).toBe(true);
      expect(validation.errors).toHaveLength(0);
    });

    it('should detect invalid configuration', () => {
      const invalidConfig = {
        testEnvironment: '',
        testMatch: [],
        testTimeout: -1,
      };

      const validation = generator.validateConfig(invalidConfig);

      expect(validation.valid).toBe(false);
      expect(validation.errors.length).toBeGreaterThan(0);
    });

    it('should get recommended configuration', () => {
      const config = generator.getRecommendedConfig('unit');

      expect(config).toBeDefined();
      expect(config.displayName).toBe('Unit Tests');
      expect(config.collectCoverage).toBe(true);
    });
  });

  describe('Global Test Utils', () => {
    it('should have global test utilities available', () => {
      expect(global.testUtils).toBeDefined();

      if (global.testUtils) {
        expect(typeof global.testUtils.createTestId).toBe('function');
        expect(typeof global.testUtils.wait).toBe('function');
        expect(typeof global.testUtils.retry).toBe('function');
      }
    });

    it('should create unique test IDs', () => {
      if (global.testUtils?.createTestId) {
        const id1 = global.testUtils.createTestId();
        const id2 = global.testUtils.createTestId();

        expect(id1).toBeDefined();
        expect(id2).toBeDefined();
        expect(id1).not.toBe(id2);
        expect(id1).toMatch(/^test_\d+_[a-z0-9]+$/);
      }
    });

    it('should provide wait functionality', async () => {
      if (global.testUtils?.wait) {
        const start = Date.now();
        await global.testUtils.wait(100);
        const elapsed = Date.now() - start;

        expect(elapsed).toBeGreaterThanOrEqual(90);
        expect(elapsed).toBeLessThan(200);
      }
    });

    it('should provide retry functionality', async () => {
      if (global.testUtils?.retry) {
        let attempts = 0;

        const result = await global.testUtils.retry(async () => {
          attempts++;
          if (attempts < 3) {
            throw new Error('Not ready yet');
          }
          return 'success';
        }, 3, 10);

        expect(result).toBe('success');
        expect(attempts).toBe(3);
      }
    });
  });
});
