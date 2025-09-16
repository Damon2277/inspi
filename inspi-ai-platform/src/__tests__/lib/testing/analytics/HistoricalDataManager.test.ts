/**
 * Historical Data Manager Tests
 * 
 * Comprehensive tests for the historical data management system,
 * covering data storage, retrieval, aggregation, and retention policies.
 */

import { HistoricalDataManager, TestSuiteRecord, TestExecutionRecord } from '../../../../lib/testing/analytics/HistoricalDataManager';

describe('HistoricalDataManager', () => {
  let dataManager: HistoricalDataManager;

  beforeEach(() => {
    dataManager = new HistoricalDataManager({
      maxAge: 30,
      maxRecords: 1000,
      compressionThreshold: 7,
      archiveThreshold: 14
    });
  });

  // afterEach(async () => {
  //   await dataManager.clearAllData();
  // });

  describe('Data Storage', () => {
    it('should store test suite records', async () => {
      const record = createSampleTestSuiteRecord();
      
      await dataManager.storeTestSuiteRecord(record);
      
      const stored = await dataManager.queryTestSuiteRecords(record.suiteName);
      expect(stored).toHaveLength(1);
      expect(stored[0]).toMatchObject(record);
    });

    it('should store individual test records', async () => {
      const record = createSampleTestExecutionRecord();
      
      await dataManager.storeTestRecord(record);
      
      const stored = await dataManager.queryTestRecords(record.testFile, record.testName);
      expect(stored).toHaveLength(1);
      expect(stored[0]).toMatchObject(record);
    });

    it('should emit events when storing records', async () => {
      const suiteRecordStored = jest.fn();
      const testRecordStored = jest.fn();
      
      dataManager.on('suiteRecordStored', suiteRecordStored);
      dataManager.on('testRecordStored', testRecordStored);
      
      const suiteRecord = createSampleTestSuiteRecord();
      await dataManager.storeTestSuiteRecord(suiteRecord);
      
      expect(suiteRecordStored).toHaveBeenCalledWith(suiteRecord);
      expect(testRecordStored).toHaveBeenCalledTimes(suiteRecord.tests.length);
    });

    it('should maintain chronological order', async () => {
      const records = [
        createSampleTestSuiteRecord('suite1', new Date('2024-01-01')),
        createSampleTestSuiteRecord('suite1', new Date('2024-01-03')),
        createSampleTestSuiteRecord('suite1', new Date('2024-01-02'))
      ];
      
      for (const record of records) {
        await dataManager.storeTestSuiteRecord(record);
      }
      
      const stored = await dataManager.queryTestSuiteRecords('suite1');
      expect(stored).toHaveLength(3);
      expect(stored[0].timestamp.getTime()).toBeGreaterThan(stored[1].timestamp.getTime());
      expect(stored[1].timestamp.getTime()).toBeGreaterThan(stored[2].timestamp.getTime());
    });
  });

  describe('Data Querying', () => {
    it('should query records by suite name', async () => {
      // Setup test data with recent dates
      const now = new Date();
      const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      const twoDaysAgo = new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000);
      const threeDaysAgo = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000);
      
      const records = [
        createSampleTestSuiteRecord('suite1', yesterday),
        createSampleTestSuiteRecord('suite1', twoDaysAgo),
        createSampleTestSuiteRecord('suite2', yesterday),
        createSampleTestSuiteRecord('suite2', threeDaysAgo)
      ];
      
      for (const record of records) {
        await dataManager.storeTestSuiteRecord(record);
      }
      
      const suite1Records = await dataManager.queryTestSuiteRecords('suite1');
      const suite2Records = await dataManager.queryTestSuiteRecords('suite2');
      
      expect(suite1Records).toHaveLength(2);
      expect(suite2Records).toHaveLength(2);
      expect(suite1Records.every(r => r.suiteName === 'suite1')).toBe(true);
      expect(suite2Records.every(r => r.suiteName === 'suite2')).toBe(true);
    });

    it('should query all records when no suite specified', async () => {
      const allRecords = await dataManager.queryTestSuiteRecords();
      expect(allRecords).toHaveLength(4);
    });

    it('should filter by date range', async () => {
      const startDate = new Date('2024-01-02');
      const endDate = new Date('2024-01-03');
      
      const filtered = await dataManager.queryTestSuiteRecords(undefined, {
        startDate,
        endDate
      });
      
      expect(filtered).toHaveLength(2);
      expect(filtered.every(r => r.timestamp >= startDate && r.timestamp <= endDate)).toBe(true);
    });

    it('should filter by branch', async () => {
      const records = await dataManager.queryTestSuiteRecords(undefined, {
        branch: 'main'
      });
      
      expect(records.every(r => r.environment.branch === 'main')).toBe(true);
    });

    it('should apply sorting', async () => {
      const byDuration = await dataManager.queryTestSuiteRecords(undefined, {
        sortBy: 'duration',
        sortOrder: 'asc'
      });
      
      for (let i = 1; i < byDuration.length; i++) {
        expect(byDuration[i].duration).toBeGreaterThanOrEqual(byDuration[i - 1].duration);
      }
    });

    it('should apply pagination', async () => {
      const page1 = await dataManager.queryTestSuiteRecords(undefined, {
        limit: 2,
        offset: 0
      });
      
      const page2 = await dataManager.queryTestSuiteRecords(undefined, {
        limit: 2,
        offset: 2
      });
      
      expect(page1).toHaveLength(2);
      expect(page2).toHaveLength(2);
      expect(page1[0].id).not.toBe(page2[0].id);
    });
  });

  describe('Data Aggregation', () => {
    beforeEach(async () => {
      // Setup test data with different dates
      const records = [
        createSampleTestSuiteRecord('suite1', new Date('2024-01-01'), { duration: 30, coverage: 80 }),
        createSampleTestSuiteRecord('suite1', new Date('2024-01-02'), { duration: 40, coverage: 85 }),
        createSampleTestSuiteRecord('suite2', new Date('2024-01-01'), { duration: 25, coverage: 90 }),
        createSampleTestSuiteRecord('suite2', new Date('2024-01-02'), { duration: 35, coverage: 88 })
      ];
      
      for (const record of records) {
        await dataManager.storeTestSuiteRecord(record);
      }
    });

    it('should aggregate by day', async () => {
      const aggregated = await dataManager.getAggregatedData({
        groupBy: 'day',
        metrics: ['count', 'duration']
      });
      
      expect(aggregated).toHaveLength(2);
      expect(aggregated[0].count).toBe(2);
      expect(aggregated[0].averageDuration).toBeCloseTo(27.5);
      expect(aggregated[0].totalDuration).toBeCloseTo(55);
    });

    it('should aggregate by test suite', async () => {
      const aggregated = await dataManager.getAggregatedData({
        groupBy: 'testSuite',
        metrics: ['count', 'coverage']
      });
      
      expect(aggregated).toHaveLength(2);
      
      const suite1Data = aggregated.find(a => a.group === 'suite1');
      const suite2Data = aggregated.find(a => a.group === 'suite2');
      
      expect(suite1Data?.count).toBe(2);
      expect(suite1Data?.averageCoverage.statements).toBeCloseTo(82.5);
      expect(suite2Data?.count).toBe(2);
      expect(suite2Data?.averageCoverage.statements).toBeCloseTo(89);
    });

    it('should filter aggregation by date range', async () => {
      const aggregated = await dataManager.getAggregatedData({
        groupBy: 'day',
        metrics: ['count'],
        startDate: new Date('2024-01-02'),
        endDate: new Date('2024-01-02')
      });
      
      expect(aggregated).toHaveLength(1);
      expect(aggregated[0].count).toBe(2);
    });
  });

  describe('Failure Pattern Analysis', () => {
    beforeEach(async () => {
      // Create test records with failures
      const testRecords = [
        createSampleTestExecutionRecord('test1.js', 'test1', 'failed', {
          error: { message: 'Assertion failed', type: 'AssertionError', stack: 'stack1' }
        }),
        createSampleTestExecutionRecord('test1.js', 'test2', 'failed', {
          error: { message: 'Assertion failed', type: 'AssertionError', stack: 'stack2' }
        }),
        createSampleTestExecutionRecord('test2.js', 'test3', 'failed', {
          error: { message: 'Timeout error', type: 'TimeoutError', stack: 'stack3' }
        })
      ];
      
      for (const record of testRecords) {
        await dataManager.storeTestRecord(record);
      }
    });

    it('should identify failure patterns', async () => {
      const patterns = await dataManager.getFailurePatterns(30);
      
      expect(patterns).toHaveLength(2);
      
      const assertionPattern = patterns.find(p => p.errorType === 'AssertionError');
      const timeoutPattern = patterns.find(p => p.errorType === 'TimeoutError');
      
      expect(assertionPattern?.count).toBe(2);
      expect(assertionPattern?.tests).toHaveLength(2);
      expect(timeoutPattern?.count).toBe(1);
    });

    it('should sort patterns by frequency', async () => {
      const patterns = await dataManager.getFailurePatterns(30);
      
      for (let i = 1; i < patterns.length; i++) {
        expect(patterns[i].count).toBeLessThanOrEqual(patterns[i - 1].count);
      }
    });

    it('should track first and last seen dates', async () => {
      const patterns = await dataManager.getFailurePatterns(30);
      
      for (const pattern of patterns) {
        expect(pattern.firstSeen).toBeInstanceOf(Date);
        expect(pattern.lastSeen).toBeInstanceOf(Date);
        expect(pattern.lastSeen.getTime()).toBeGreaterThanOrEqual(pattern.firstSeen.getTime());
      }
    });
  });

  describe('Flaky Test Analysis', () => {
    beforeEach(async () => {
      // Create test records with mixed results for flaky test detection
      const testRecords = [
        // Flaky test - alternating pass/fail
        createSampleTestExecutionRecord('flaky.js', 'flakyTest', 'passed'),
        createSampleTestExecutionRecord('flaky.js', 'flakyTest', 'failed'),
        createSampleTestExecutionRecord('flaky.js', 'flakyTest', 'passed'),
        createSampleTestExecutionRecord('flaky.js', 'flakyTest', 'failed'),
        createSampleTestExecutionRecord('flaky.js', 'flakyTest', 'passed'),
        
        // Stable test - always passes
        createSampleTestExecutionRecord('stable.js', 'stableTest', 'passed'),
        createSampleTestExecutionRecord('stable.js', 'stableTest', 'passed'),
        createSampleTestExecutionRecord('stable.js', 'stableTest', 'passed'),
        createSampleTestExecutionRecord('stable.js', 'stableTest', 'passed'),
        createSampleTestExecutionRecord('stable.js', 'stableTest', 'passed')
      ];
      
      for (const record of testRecords) {
        await dataManager.storeTestRecord(record);
      }
    });

    it('should identify flaky tests', async () => {
      const flakyTests = await dataManager.getFlakyTests(30, 0.3);
      
      expect(flakyTests).toHaveLength(1);
      expect(flakyTests[0].testName).toBe('flakyTest');
      expect(flakyTests[0].flakiness).toBeCloseTo(0.4);
      expect(flakyTests[0].total).toBe(5);
      expect(flakyTests[0].failed).toBe(2);
    });

    it('should filter by minimum run count', async () => {
      // Should not detect flaky tests with less than 5 runs
      const flakyTests = await dataManager.getFlakyTests(30, 0.1);
      
      const stableTest = flakyTests.find(t => t.testName === 'stableTest');
      expect(stableTest).toBeUndefined();
    });

    it('should sort by flakiness level', async () => {
      // Add another flaky test with different flakiness
      const moreRecords = [
        createSampleTestExecutionRecord('other.js', 'otherFlaky', 'passed'),
        createSampleTestExecutionRecord('other.js', 'otherFlaky', 'failed'),
        createSampleTestExecutionRecord('other.js', 'otherFlaky', 'passed'),
        createSampleTestExecutionRecord('other.js', 'otherFlaky', 'passed'),
        createSampleTestExecutionRecord('other.js', 'otherFlaky', 'passed')
      ];
      
      for (const record of moreRecords) {
        await dataManager.storeTestRecord(record);
      }
      
      const flakyTests = await dataManager.getFlakyTests(30, 0.1);
      
      expect(flakyTests).toHaveLength(2);
      expect(flakyTests[0].flakiness).toBeGreaterThanOrEqual(flakyTests[1].flakiness);
    });

    it('should track recent failures', async () => {
      const flakyTests = await dataManager.getFlakyTests(30, 0.3);
      
      expect(flakyTests[0].recentFailures).toHaveLength(2);
      expect(flakyTests[0].recentFailures.every(date => date instanceof Date)).toBe(true);
    });
  });

  describe('Data Export/Import', () => {
    beforeEach(async () => {
      const records = [
        createSampleTestSuiteRecord('suite1'),
        createSampleTestSuiteRecord('suite2')
      ];
      
      for (const record of records) {
        await dataManager.storeTestSuiteRecord(record);
      }
    });

    it('should export data in JSON format', async () => {
      const exported = await dataManager.exportData('json');
      const parsed = JSON.parse(exported);
      
      expect(parsed.data).toHaveLength(2);
      expect(parsed.totalRecords).toBe(2);
      expect(parsed.exportDate).toBeDefined();
      expect(parsed.retentionPolicy).toBeDefined();
    });

    it('should export data in CSV format', async () => {
      const exported = await dataManager.exportData('csv');
      const lines = exported.split('\n');
      
      expect(lines[0]).toContain('timestamp,suiteName,totalTests');
      expect(lines).toHaveLength(3); // Header + 2 data rows
    });

    it('should import JSON data', async () => {
      const exported = await dataManager.exportData('json');
      
      await dataManager.clearAllData();
      expect(dataManager.getStorageStats().totalSuiteRecords).toBe(0);
      
      await dataManager.importData(exported, 'json');
      expect(dataManager.getStorageStats().totalSuiteRecords).toBe(2);
    });

    it('should emit import event', async () => {
      const dataImported = jest.fn();
      dataManager.on('dataImported', dataImported);
      
      const exported = await dataManager.exportData('json');
      await dataManager.importData(exported, 'json');
      
      expect(dataImported).toHaveBeenCalledWith({
        format: 'json',
        recordCount: expect.any(Number)
      });
    });
  });

  describe('Storage Statistics', () => {
    it('should provide accurate storage statistics', async () => {
      const records = [
        createSampleTestSuiteRecord('suite1', new Date('2024-01-01')),
        createSampleTestSuiteRecord('suite2', new Date('2024-01-02'))
      ];
      
      for (const record of records) {
        await dataManager.storeTestSuiteRecord(record);
      }
      
      const stats = dataManager.getStorageStats();
      
      expect(stats.totalSuiteRecords).toBe(2);
      expect(stats.totalTestRecords).toBeGreaterThan(0);
      expect(stats.oldestRecord).toEqual(new Date('2024-01-01'));
      expect(stats.newestRecord).toEqual(new Date('2024-01-02'));
      expect(stats.storageSize).toBeGreaterThan(0);
    });

    it('should handle empty storage', () => {
      const stats = dataManager.getStorageStats();
      
      expect(stats.totalSuiteRecords).toBe(0);
      expect(stats.totalTestRecords).toBe(0);
      expect(stats.oldestRecord).toBeNull();
      expect(stats.newestRecord).toBeNull();
      expect(stats.storageSize).toBe(0);
    });
  });

  describe('Retention Policy', () => {
    it('should apply age-based retention', async () => {
      const shortRetentionManager = new HistoricalDataManager({
        maxAge: 1, // 1 day
        maxRecords: 1000
      });
      
      const oldRecord = createSampleTestSuiteRecord('suite1', new Date(Date.now() - 2 * 24 * 60 * 60 * 1000));
      const newRecord = createSampleTestSuiteRecord('suite1', new Date());
      
      await shortRetentionManager.storeTestSuiteRecord(oldRecord);
      await shortRetentionManager.storeTestSuiteRecord(newRecord);
      
      // Wait for retention policy to be applied
      await new Promise(resolve => setTimeout(resolve, 100));
      
      const stored = await shortRetentionManager.queryTestSuiteRecords('suite1');
      expect(stored).toHaveLength(1);
      expect(stored[0].id).toBe(newRecord.id);
    });

    it('should apply record count limit', async () => {
      const limitedManager = new HistoricalDataManager({
        maxAge: 365,
        maxRecords: 2
      });
      
      const records = [
        createSampleTestSuiteRecord('suite1', new Date('2024-01-01')),
        createSampleTestSuiteRecord('suite1', new Date('2024-01-02')),
        createSampleTestSuiteRecord('suite1', new Date('2024-01-03'))
      ];
      
      for (const record of records) {
        await limitedManager.storeTestSuiteRecord(record);
      }
      
      const stored = await limitedManager.queryTestSuiteRecords('suite1');
      expect(stored.length).toBeLessThanOrEqual(2);
    });

    it('should emit cleanup events', async () => {
      const recordsCleanedUp = jest.fn();
      dataManager.on('recordsCleanedUp', recordsCleanedUp);
      
      const shortRetentionManager = new HistoricalDataManager({
        maxAge: 1,
        maxRecords: 1000
      });
      
      shortRetentionManager.on('recordsCleanedUp', recordsCleanedUp);
      
      const oldRecord = createSampleTestSuiteRecord('suite1', new Date(Date.now() - 2 * 24 * 60 * 60 * 1000));
      const newRecord = createSampleTestSuiteRecord('suite1', new Date());
      
      await shortRetentionManager.storeTestSuiteRecord(oldRecord);
      await shortRetentionManager.storeTestSuiteRecord(newRecord);
      
      // Wait for cleanup
      await new Promise(resolve => setTimeout(resolve, 100));
      
      expect(recordsCleanedUp).toHaveBeenCalled();
    });
  });

  describe('Data Cleanup', () => {
    it('should clear all data', async () => {
      const records = [
        createSampleTestSuiteRecord('suite1'),
        createSampleTestSuiteRecord('suite2')
      ];
      
      for (const record of records) {
        await dataManager.storeTestSuiteRecord(record);
      }
      
      expect(dataManager.getStorageStats().totalSuiteRecords).toBe(2);
      
      await dataManager.clearAllData();
      
      expect(dataManager.getStorageStats().totalSuiteRecords).toBe(0);
    });

    it('should emit clear event', async () => {
      const dataCleared = jest.fn();
      dataManager.on('dataCleared', dataCleared);
      
      await dataManager.clearAllData();
      
      expect(dataCleared).toHaveBeenCalled();
    });
  });
});

// Helper functions
function createSampleTestSuiteRecord(
  suiteName: string = 'TestSuite',
  timestamp: Date = new Date(),
  overrides: any = {}
): TestSuiteRecord {
  const totalTests = overrides.totalTests || 10;
  const passedTests = overrides.passedTests || 8;
  const failedTests = overrides.failedTests || 2;
  const coverage = overrides.coverage || 85;
  
  return {
    id: `suite_${Date.now()}_${Math.random()}`,
    timestamp,
    suiteName,
    totalTests,
    passedTests,
    failedTests,
    skippedTests: 0,
    duration: overrides.duration || 30,
    coverage: {
      statements: coverage,
      branches: coverage - 5,
      functions: coverage + 5,
      lines: coverage - 2
    },
    performance: {
      totalMemory: 128,
      peakMemory: 256,
      averageExecutionTime: 1.5
    },
    environment: {
      nodeVersion: '18.0.0',
      platform: 'linux',
      ci: true,
      branch: 'main',
      commit: 'abc123'
    },
    tests: [
      createSampleTestExecutionRecord(`${suiteName}.test.js`, 'test1', 'passed'),
      createSampleTestExecutionRecord(`${suiteName}.test.js`, 'test2', 'failed')
    ]
  };
}

function createSampleTestExecutionRecord(
  testFile: string = 'test.js',
  testName: string = 'sampleTest',
  status: 'passed' | 'failed' | 'skipped' = 'passed',
  overrides: any = {}
): TestExecutionRecord {
  return {
    id: `test_${Date.now()}_${Math.random()}`,
    timestamp: new Date(),
    testSuite: 'TestSuite',
    testFile,
    testName,
    status,
    duration: 100,
    error: overrides.error,
    coverage: {
      statements: 85,
      branches: 80,
      functions: 90,
      lines: 83
    },
    performance: {
      memoryUsage: 64,
      cpuUsage: 25,
      executionTime: 100
    },
    environment: {
      nodeVersion: '18.0.0',
      platform: 'linux',
      ci: true,
      branch: 'main',
      commit: 'abc123'
    }
  };
}