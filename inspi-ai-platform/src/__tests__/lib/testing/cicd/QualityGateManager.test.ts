/**
 * Tests for QualityGateManager
 */

import { QualityGateManager } from '../../../../lib/testing/cicd/QualityGateManager';
import { QualityGateConfig, TestSummary, CoverageInfo } from '../../../../lib/testing/cicd/types';

describe('QualityGateManager', () => {
  let manager: QualityGateManager;

  beforeEach(() => {
    manager = new QualityGateManager();
  });

  describe('gate registration and evaluation', () => {
    it('should register and evaluate quality gates', async () => {
      const gate: QualityGateConfig = {
        name: 'test-coverage',
        type: 'coverage',
        threshold: 80,
        operator: 'gte',
        blocking: true,
        message: 'Code coverage must be at least 80%'
      };

      manager.registerGate(gate);

      const testSummary: TestSummary = {
        total: 100,
        passed: 95,
        failed: 5,
        skipped: 0,
        duration: 30000
      };

      const coverage: CoverageInfo = {
        statements: 85,
        branches: 80,
        functions: 90,
        lines: 85
      };

      const results = await manager.evaluateGates(testSummary, coverage);

      expect(results).toHaveLength(1);
      expect(results[0].name).toBe('test-coverage');
      expect(results[0].status).toBe('passed');
      expect(results[0].value).toBe(85); // statements coverage
    });

    it('should fail gates when threshold not met', async () => {
      const gate: QualityGateConfig = {
        name: 'test-pass-rate',
        type: 'custom',
        threshold: 95,
        operator: 'gte',
        blocking: true
      };

      manager.registerGate(gate);

      const testSummary: TestSummary = {
        total: 100,
        passed: 90, // 90% pass rate, below 95% threshold
        failed: 10,
        skipped: 0,
        duration: 30000
      };

      const customMetrics = {
        'test-pass-rate': 90
      };

      const results = await manager.evaluateGates(testSummary, undefined, customMetrics);

      expect(results[0].status).toBe('failed');
      expect(results[0].blocking).toBe(true);
    });

    it('should handle different operators correctly', async () => {
      const gates: QualityGateConfig[] = [
        {
          name: 'max-duration',
          type: 'performance',
          threshold: 300000, // 5 minutes
          operator: 'lte',
          blocking: false
        },
        {
          name: 'min-coverage',
          type: 'coverage',
          threshold: 70,
          operator: 'gte',
          blocking: true
        }
      ];

      gates.forEach(gate => manager.registerGate(gate));

      const testSummary: TestSummary = {
        total: 50,
        passed: 50,
        failed: 0,
        skipped: 0,
        duration: 240000 // 4 minutes
      };

      const coverage: CoverageInfo = {
        statements: 75,
        branches: 70,
        functions: 80,
        lines: 75
      };

      const results = await manager.evaluateGates(testSummary, coverage);

      expect(results).toHaveLength(2);
      
      const durationGate = results.find(r => r.name === 'max-duration');
      expect(durationGate?.status).toBe('passed'); // 4 min <= 5 min
      
      const coverageGate = results.find(r => r.name === 'min-coverage');
      expect(coverageGate?.status).toBe('passed'); // 75% >= 70%
    });
  });

  describe('gate management', () => {
    it('should determine if pipeline can proceed', async () => {
      const blockingGate: QualityGateConfig = {
        name: 'blocking-gate',
        type: 'custom',
        threshold: 100,
        operator: 'eq',
        blocking: true
      };

      const nonBlockingGate: QualityGateConfig = {
        name: 'warning-gate',
        type: 'custom',
        threshold: 50,
        operator: 'gte',
        blocking: false
      };

      manager.registerGate(blockingGate);
      manager.registerGate(nonBlockingGate);

      const testSummary: TestSummary = {
        total: 10,
        passed: 10,
        failed: 0,
        skipped: 0,
        duration: 10000
      };

      const customMetrics = {
        'blocking-gate': 90, // Fails blocking gate
        'warning-gate': 30   // Fails non-blocking gate
      };

      await manager.evaluateGates(testSummary, undefined, customMetrics);

      expect(manager.canProceed()).toBe(false); // Blocking gate failed
      
      const failedGates = manager.getFailedGates();
      expect(failedGates).toHaveLength(2);
      
      const blockingFailedGates = manager.getBlockingFailedGates();
      expect(blockingFailedGates).toHaveLength(1);
      expect(blockingFailedGates[0].name).toBe('blocking-gate');
    });

    it('should generate comprehensive gate report', async () => {
      const gates = QualityGateManager.createDefaultGates();
      gates.forEach(gate => manager.registerGate(gate));

      const testSummary: TestSummary = {
        total: 100,
        passed: 96,
        failed: 4,
        skipped: 0,
        duration: 180000
      };

      const coverage: CoverageInfo = {
        statements: 85,
        branches: 80,
        functions: 90,
        lines: 85
      };

      const customMetrics = {
        'test-pass-rate': 96,
        'security-score': 9
      };

      await manager.evaluateGates(testSummary, coverage, customMetrics);

      const report = manager.generateReport();

      expect(report).toHaveProperty('summary');
      expect(report).toHaveProperty('gates');
      expect(report).toHaveProperty('canProceed');

      expect(report.summary.total).toBe(gates.length);
      expect(report.gates).toHaveLength(gates.length);
      expect(typeof report.canProceed).toBe('boolean');
    });
  });

  describe('default gates', () => {
    it('should create sensible default gates', () => {
      const defaultGates = QualityGateManager.createDefaultGates();

      expect(defaultGates.length).toBeGreaterThan(0);
      
      // Should have coverage gate
      const coverageGate = defaultGates.find(g => g.type === 'coverage');
      expect(coverageGate).toBeDefined();
      expect(coverageGate?.blocking).toBe(true);

      // Should have performance gate
      const performanceGate = defaultGates.find(g => g.type === 'performance');
      expect(performanceGate).toBeDefined();

      // Should have security gate
      const securityGate = defaultGates.find(g => g.type === 'security');
      expect(securityGate).toBeDefined();
      expect(securityGate?.blocking).toBe(true);
    });

    it('should load gates from configuration', () => {
      const config: QualityGateConfig[] = [
        {
          name: 'custom-gate',
          type: 'custom',
          threshold: 100,
          operator: 'eq',
          blocking: false
        }
      ];

      manager.loadGatesFromConfig(config);

      const gateConfig = manager.getGateConfig('custom-gate');
      expect(gateConfig).toBeDefined();
      expect(gateConfig?.threshold).toBe(100);
    });
  });

  describe('gate configuration management', () => {
    it('should update gate thresholds', () => {
      const gate: QualityGateConfig = {
        name: 'updateable-gate',
        type: 'coverage',
        threshold: 70,
        operator: 'gte',
        blocking: true
      };

      manager.registerGate(gate);

      const updated = manager.updateGateThreshold('updateable-gate', 85);
      expect(updated).toBe(true);

      const updatedGate = manager.getGateConfig('updateable-gate');
      expect(updatedGate?.threshold).toBe(85);
    });

    it('should toggle gate blocking status', () => {
      const gate: QualityGateConfig = {
        name: 'toggleable-gate',
        type: 'custom',
        threshold: 50,
        operator: 'gte',
        blocking: true
      };

      manager.registerGate(gate);

      const updated = manager.setGateBlocking('toggleable-gate', false);
      expect(updated).toBe(true);

      const updatedGate = manager.getGateConfig('toggleable-gate');
      expect(updatedGate?.blocking).toBe(false);
    });

    it('should return false for non-existent gates', () => {
      const updated = manager.updateGateThreshold('non-existent', 100);
      expect(updated).toBe(false);

      const toggled = manager.setGateBlocking('non-existent', false);
      expect(toggled).toBe(false);
    });
  });

  describe('coverage evaluation', () => {
    it('should evaluate different coverage types', async () => {
      const gates: QualityGateConfig[] = [
        { name: 'statements', type: 'coverage', threshold: 80, operator: 'gte', blocking: true },
        { name: 'branches', type: 'coverage', threshold: 75, operator: 'gte', blocking: true },
        { name: 'functions', type: 'coverage', threshold: 85, operator: 'gte', blocking: true },
        { name: 'lines', type: 'coverage', threshold: 80, operator: 'gte', blocking: true }
      ];

      gates.forEach(gate => manager.registerGate(gate));

      const testSummary: TestSummary = {
        total: 100,
        passed: 100,
        failed: 0,
        skipped: 0,
        duration: 30000
      };

      const coverage: CoverageInfo = {
        statements: 85,
        branches: 78,
        functions: 90,
        lines: 82
      };

      const results = await manager.evaluateGates(testSummary, coverage);

      expect(results).toHaveLength(4);
      
      const statementsResult = results.find(r => r.name === 'statements');
      expect(statementsResult?.status).toBe('passed');
      expect(statementsResult?.value).toBe(85);

      const branchesResult = results.find(r => r.name === 'branches');
      expect(branchesResult?.status).toBe('passed');
      expect(branchesResult?.value).toBe(78);
    });
  });
});