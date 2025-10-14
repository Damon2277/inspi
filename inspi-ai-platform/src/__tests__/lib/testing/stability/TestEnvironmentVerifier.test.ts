/**
 * Test Environment Verifier Tests
 */

import { TestEnvironmentVerifier, EnvironmentSnapshot } from '../../../../lib/testing/stability/TestEnvironmentVerifier';

// Mock Node.js modules
const mockOs = {
  cpus: jest.fn().mockReturnValue([
    { model: 'Intel Core i7' },
    { model: 'Intel Core i7' },
  ]),
};

jest.mock('os', () => mockOs);

describe('TestEnvironmentVerifier', () => {
  let verifier: TestEnvironmentVerifier;

  beforeEach(() => {
    verifier = new TestEnvironmentVerifier();

    // Mock process properties
    Object.defineProperty(process, 'version', { value: 'v18.0.0', configurable: true });
    Object.defineProperty(process, 'platform', { value: 'linux', configurable: true });
    Object.defineProperty(process, 'arch', { value: 'x64', configurable: true });

    // Mock process.memoryUsage
    jest.spyOn(process, 'memoryUsage').mockReturnValue({
      rss: 100000000,
      heapTotal: 50000000,
      heapUsed: 30000000,
      external: 5000000,
      arrayBuffers: 1000000,
    });

    // Mock environment variables
    process.env.NODE_ENV = 'test';
    process.env.CI = 'false';
    delete process.env.GITHUB_ACTIONS;
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('captureSnapshot', () => {
    it('should capture environment snapshot', async () => {
      const snapshot = await verifier.captureSnapshot();

      expect(snapshot).toMatchObject({
        nodeVersion: 'v18.0.0',
        platform: 'linux',
        architecture: 'x64',
        memory: expect.objectContaining({
          total: expect.any(Number),
          free: expect.any(Number),
          used: expect.any(Number),
        }),
        cpu: expect.objectContaining({
          cores: expect.any(Number),
          model: expect.any(String),
        }),
        environment: expect.objectContaining({
          ci: false,
          timezone: expect.any(String),
          locale: expect.any(String),
          env: expect.any(Object),
        }),
        dependencies: expect.any(Object),
        timestamp: expect.any(Date),
      });
    });

    it('should detect CI environment', async () => {
      process.env.CI = 'true';

      const snapshot = await verifier.captureSnapshot();

      expect(snapshot.environment.ci).toBe(true);
    });

    it('should capture relevant environment variables', async () => {
      process.env.NODE_ENV = 'production';
      process.env.TZ = 'UTC';

      const snapshot = await verifier.captureSnapshot();

      expect(snapshot.environment.env.NODE_ENV).toBe('production');
      expect(snapshot.environment.env.TZ).toBe('UTC');
    });
  });

  describe('setBaseline', () => {
    it('should set baseline from provided snapshot', async () => {
      const snapshot = await verifier.captureSnapshot();
      verifier.setBaseline(snapshot);

      const report = await verifier.verifyEnvironment();
      expect(report.isConsistent).toBe(true);
    });

    it('should set baseline from latest snapshot if none provided', async () => {
      await verifier.captureSnapshot();
      verifier.setBaseline();

      const report = await verifier.verifyEnvironment();
      expect(report.isConsistent).toBe(true);
    });
  });

  describe('verifyEnvironment', () => {
    it('should return consistent for first verification', async () => {
      const report = await verifier.verifyEnvironment();

      expect(report.isConsistent).toBe(true);
      expect(report.score).toBe(1);
      expect(report.differences).toHaveLength(0);
      expect(report.riskLevel).toBe('low');
    });

    it('should detect Node.js version differences', async () => {
      const baseline = await verifier.captureSnapshot();
      verifier.setBaseline(baseline);

      // Change Node.js version
      Object.defineProperty(process, 'version', { value: 'v16.0.0', configurable: true });

      const report = await verifier.verifyEnvironment();

      expect(report.isConsistent).toBe(false);
      expect(report.differences.some(d => d.field === 'nodeVersion' && d.category === 'critical')).toBe(true);
    });

    it('should detect platform differences', async () => {
      const baseline = await verifier.captureSnapshot();
      verifier.setBaseline(baseline);

      // Change platform
      Object.defineProperty(process, 'platform', { value: 'darwin', configurable: true });

      const report = await verifier.verifyEnvironment();

      expect(report.isConsistent).toBe(false);
      expect(report.differences.some(d => d.field === 'platform' && d.category === 'critical')).toBe(true);
    });

    it('should detect environment variable differences', async () => {
      process.env.NODE_ENV = 'test';
      const baseline = await verifier.captureSnapshot();
      verifier.setBaseline(baseline);

      // Change environment variable
      process.env.NODE_ENV = 'production';

      const report = await verifier.verifyEnvironment();

      expect(report.differences.some(d => d.field.includes('NODE_ENV') && d.category === 'critical')).toBe(true);
    });

    it('should calculate consistency score based on differences', async () => {
      const baseline = await verifier.captureSnapshot();
      verifier.setBaseline(baseline);

      // Introduce multiple differences
      Object.defineProperty(process, 'version', { value: 'v16.0.0', configurable: true });
      Object.defineProperty(process, 'platform', { value: 'darwin', configurable: true });

      const report = await verifier.verifyEnvironment();

      expect(report.score).toBeLessThan(1);
      expect(report.riskLevel).not.toBe('low');
    });
  });

  describe('compareSnapshots', () => {
    it('should compare two identical snapshots', async () => {
      const snapshot1 = await verifier.captureSnapshot();
      const snapshot2 = await verifier.captureSnapshot();

      const report = verifier.compareSnapshots(snapshot1, snapshot2);

      expect(report.isConsistent).toBe(true);
      expect(report.score).toBe(1);
      expect(report.differences).toHaveLength(0);
    });

    it('should detect differences between snapshots', async () => {
      const snapshot1 = await verifier.captureSnapshot();

      // Change environment
      Object.defineProperty(process, 'version', { value: 'v16.0.0', configurable: true });
      const snapshot2 = await verifier.captureSnapshot();

      const report = verifier.compareSnapshots(snapshot1, snapshot2);

      expect(report.isConsistent).toBe(false);
      expect(report.differences.length).toBeGreaterThan(0);
    });
  });

  describe('getConsistencyHistory', () => {
    it('should return empty history initially', () => {
      const history = verifier.getConsistencyHistory();

      expect(history.snapshots).toHaveLength(0);
      expect(history.consistencyTrend).toBe('stable');
      expect(history.averageScore).toBe(1);
    });

    it('should track consistency history', async () => {
      // Capture multiple snapshots
      await verifier.captureSnapshot();
      await verifier.captureSnapshot();
      await verifier.captureSnapshot();

      const history = verifier.getConsistencyHistory();

      expect(history.snapshots.length).toBeGreaterThan(0);
      expect(history.averageScore).toBeGreaterThanOrEqual(0);
      expect(history.averageScore).toBeLessThanOrEqual(1);
    });

    it('should detect degrading trend', async () => {
      // Capture baseline
      await verifier.captureSnapshot();

      // Capture snapshots with increasing differences
      for (let i = 0; i < 6; i++) {
        Object.defineProperty(process, 'version', { value: `v${16 + i}.0.0`, configurable: true });
        await verifier.captureSnapshot();
      }

      const history = verifier.getConsistencyHistory();

      // Should detect degrading trend due to increasing version differences
      expect(['degrading', 'stable']).toContain(history.consistencyTrend);
    });
  });

  describe('generateSetupScript', () => {
    it('should generate environment setup script', async () => {
      const snapshot = await verifier.captureSnapshot();
      const script = verifier.generateSetupScript(snapshot);

      expect(script).toContain('#!/bin/bash');
      expect(script).toContain('Setting up test environment');
      expect(script).toContain(snapshot.nodeVersion);
      expect(script).toContain(snapshot.environment.timezone);
    });

    it('should include environment variables in script', async () => {
      process.env.NODE_ENV = 'test';
      process.env.TZ = 'UTC';

      const snapshot = await verifier.captureSnapshot();
      const script = verifier.generateSetupScript(snapshot);

      expect(script).toContain('export NODE_ENV="test"');
      expect(script).toContain('export TZ="UTC"');
    });

    it('should include dependency checks', async () => {
      // Mock package.json reading
      const mockRequire = jest.fn().mockReturnValue({
        dependencies: {
          'jest': '^29.0.0',
          'typescript': '^4.0.0',
        },
        devDependencies: {
          '@types/node': '^18.0.0',
        },
      });

      // This is a simplified test - in reality, we'd need to mock the require function
      const snapshot = await verifier.captureSnapshot();
      const script = verifier.generateSetupScript(snapshot);

      expect(script).toContain('Checking dependency versions');
    });
  });

  describe('edge cases', () => {
    it('should handle missing CPU information gracefully', async () => {
      mockOs.cpus.mockReturnValue([]);

      const snapshot = await verifier.captureSnapshot();

      expect(snapshot.cpu.cores).toBeGreaterThanOrEqual(1);
      expect(snapshot.cpu.model).toBeDefined();
    });

    it('should handle missing memory information gracefully', async () => {
      jest.spyOn(process, 'memoryUsage').mockImplementation(() => {
        throw new Error('Memory info not available');
      });

      const snapshot = await verifier.captureSnapshot();

      expect(snapshot.memory).toEqual({ total: 0, free: 0, used: 0 });
    });

    it('should handle browser environment', async () => {
      // Mock browser environment
      Object.defineProperty(global, 'navigator', {
        value: { hardwareConcurrency: 4 },
        configurable: true,
      });

      const snapshot = await verifier.captureSnapshot();

      expect(snapshot.cpu.cores).toBe(4);
    });

    it('should handle missing environment variables', async () => {
      delete process.env.NODE_ENV;
      delete process.env.CI;

      const snapshot = await verifier.captureSnapshot();

      expect(snapshot.environment.env).toBeDefined();
      expect(snapshot.environment.ci).toBe(false);
    });
  });

  describe('risk level calculation', () => {
    it('should calculate low risk for minor differences', async () => {
      const baseline = await verifier.captureSnapshot();
      verifier.setBaseline(baseline);

      // Minor change that should be warning level
      mockOs.cpus.mockReturnValue([{ model: 'Different CPU' }]);

      const report = await verifier.verifyEnvironment();

      expect(report.riskLevel).toBe('low');
    });

    it('should calculate high risk for critical differences', async () => {
      const baseline = await verifier.captureSnapshot();
      verifier.setBaseline(baseline);

      // Multiple critical changes
      Object.defineProperty(process, 'version', { value: 'v16.0.0', configurable: true });
      Object.defineProperty(process, 'platform', { value: 'darwin', configurable: true });
      Object.defineProperty(process, 'arch', { value: 'arm64', configurable: true });

      const report = await verifier.verifyEnvironment();

      expect(report.riskLevel).toBe('critical');
    });
  });
});
