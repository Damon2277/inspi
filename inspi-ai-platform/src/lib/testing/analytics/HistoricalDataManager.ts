/**
 * Historical Data Manager
 *
 * Manages the storage, retrieval, and lifecycle of test execution history data.
 * Provides efficient data access patterns for trend analysis and reporting.
 */

import { EventEmitter } from 'events';

export interface TestExecutionRecord {
  id: string;
  timestamp: Date;
  testSuite: string;
  testFile: string;
  testName: string;
  status: 'passed' | 'failed' | 'skipped';
  duration: number;
  error?: {
    message: string;
    stack?: string;
    type: string;
  };
  coverage?: {
    statements: number;
    branches: number;
    functions: number;
    lines: number;
  };
  performance?: {
    memoryUsage: number;
    cpuUsage: number;
    executionTime: number;
  };
  environment: {
    nodeVersion: string;
    platform: string;
    ci: boolean;
    branch: string;
    commit: string;
  };
  metadata?: Record<string, any>;
}

export interface TestSuiteRecord {
  id: string;
  timestamp: Date;
  suiteName: string;
  totalTests: number;
  passedTests: number;
  failedTests: number;
  skippedTests: number;
  duration: number;
  coverage: {
    statements: number;
    branches: number;
    functions: number;
    lines: number;
  };
  performance: {
    totalMemory: number;
    peakMemory: number;
    averageExecutionTime: number;
  };
  environment: {
    nodeVersion: string;
    platform: string;
    ci: boolean;
    branch: string;
    commit: string;
  };
  tests: TestExecutionRecord[];
}

export interface DataRetentionPolicy {
  maxAge: number; // days
  maxRecords: number;
  compressionThreshold: number; // days after which to compress data
  archiveThreshold: number; // days after which to archive data
}

export interface QueryOptions {
  startDate?: Date;
  endDate?: Date;
  testSuite?: string;
  testFile?: string;
  status?: 'passed' | 'failed' | 'skipped';
  branch?: string;
  limit?: number;
  offset?: number;
  sortBy?: 'timestamp' | 'duration' | 'testName';
  sortOrder?: 'asc' | 'desc';
}

export interface AggregationOptions {
  groupBy: 'day' | 'week' | 'month' | 'testSuite' | 'testFile';
  metrics: ('count' | 'duration' | 'coverage' | 'performance')[];
  startDate?: Date;
  endDate?: Date;
}

export class HistoricalDataManager extends EventEmitter {
  private storage: Map<string, TestSuiteRecord[]> = new Map();
  private testRecords: Map<string, TestExecutionRecord[]> = new Map();
  private retentionPolicy: DataRetentionPolicy;
  private compressionEnabled: boolean = true;
  private archiveEnabled: boolean = true;

  constructor(retentionPolicy?: Partial<DataRetentionPolicy>) {
    super();

    this.retentionPolicy = {
      maxAge: 90, // 90 days
      maxRecords: 100000,
      compressionThreshold: 30, // 30 days
      archiveThreshold: 60, // 60 days
      ...retentionPolicy,
    };

    // Start cleanup interval
    this.startCleanupInterval();
  }

  /**
   * Store a test suite execution record
   */
  async storeTestSuiteRecord(record: TestSuiteRecord): Promise<void> {
    const key = this.generateSuiteKey(record.suiteName);
    const records = this.storage.get(key) || [];

    records.push(record);

    // Sort by timestamp (newest first)
    records.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

    this.storage.set(key, records);

    // Store individual test records
    for (const test of record.tests) {
      await this.storeTestRecord(test);
    }

    this.emit('suiteRecordStored', record);

    // Apply retention policy
    await this.applyRetentionPolicy(key);
  }

  /**
   * Store an individual test execution record
   */
  async storeTestRecord(record: TestExecutionRecord): Promise<void> {
    const key = this.generateTestKey(record.testFile, record.testName);
    const records = this.testRecords.get(key) || [];

    records.push(record);

    // Sort by timestamp (newest first)
    records.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

    this.testRecords.set(key, records);

    this.emit('testRecordStored', record);
  }

  /**
   * Query test suite records
   */
  async queryTestSuiteRecords(
    suiteName?: string,
    options?: QueryOptions,
  ): Promise<TestSuiteRecord[]> {
    let allRecords: TestSuiteRecord[] = [];

    if (suiteName) {
      const key = this.generateSuiteKey(suiteName);
      allRecords = this.storage.get(key) || [];
    } else {
      // Get all records from all suites
      for (const records of this.storage.values()) {
        allRecords.push(...records);
      }
      // Sort by timestamp
      allRecords.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
    }

    return this.applyQueryFilters(allRecords, options);
  }

  /**
   * Query individual test records
   */
  async queryTestRecords(
    testFile?: string,
    testName?: string,
    options?: QueryOptions,
  ): Promise<TestExecutionRecord[]> {
    let allRecords: TestExecutionRecord[] = [];

    if (testFile && testName) {
      const key = this.generateTestKey(testFile, testName);
      allRecords = this.testRecords.get(key) || [];
    } else if (testFile) {
      // Get all records for a specific test file
      for (const [key, records] of this.testRecords.entries()) {
        if (key.startsWith(`${testFile}:`)) {
          allRecords.push(...records);
        }
      }
      allRecords.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
    } else {
      // Get all test records
      for (const records of this.testRecords.values()) {
        allRecords.push(...records);
      }
      allRecords.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
    }

    return this.applyTestQueryFilters(allRecords, options);
  }

  /**
   * Get aggregated data for trend analysis
   */
  async getAggregatedData(options: AggregationOptions): Promise<any[]> {
    const allSuiteRecords = await this.queryTestSuiteRecords();

    // Filter by date range
    const filteredRecords = allSuiteRecords.filter(record => {
      if (options.startDate && record.timestamp < options.startDate) return false;
      if (options.endDate && record.timestamp > options.endDate) return false;
      return true;
    });

    // Group data
    const grouped = this.groupRecords(filteredRecords, options.groupBy);

    // Calculate metrics for each group
    const aggregated = Object.entries(grouped).map(([key, records]) => {
      const metrics: any = { group: key, count: records.length };

      if (options.metrics.includes('duration')) {
        metrics.averageDuration = records.reduce((sum, r) => sum + r.duration, 0) / records.length;
        metrics.totalDuration = records.reduce((sum, r) => sum + r.duration, 0);
      }

      if (options.metrics.includes('coverage')) {
        metrics.averageCoverage = {
          statements: records.reduce((sum, r) => sum + r.coverage.statements, 0) / records.length,
          branches: records.reduce((sum, r) => sum + r.coverage.branches, 0) / records.length,
          functions: records.reduce((sum, r) => sum + r.coverage.functions, 0) / records.length,
          lines: records.reduce((sum, r) => sum + r.coverage.lines, 0) / records.length,
        };
      }

      if (options.metrics.includes('performance')) {
        metrics.averagePerformance = {
          totalMemory: records.reduce((sum, r) => sum + r.performance.totalMemory, 0) / records.length,
          peakMemory: Math.max(...records.map(r => r.performance.peakMemory)),
          averageExecutionTime: records.reduce((sum, r) => sum + r.performance.averageExecutionTime, 0) / records.length,
        };
      }

      return metrics;
    });

    return aggregated.sort((a, b) => a.group.localeCompare(b.group));
  }

  /**
   * Get test failure patterns
   */
  async getFailurePatterns(days: number = 30): Promise<any[]> {
    const endDate = new Date();
    const startDate = new Date(endDate.getTime() - days * 24 * 60 * 60 * 1000);

    const failedTests = await this.queryTestRecords(undefined, undefined, {
      startDate,
      endDate,
      status: 'failed',
    });

    // Group by error type and message
    const patterns = new Map<string, {
      count: number;
      tests: string[];
      errorType: string;
      errorMessage: string;
      firstSeen: Date;
      lastSeen: Date;
    }>();

    for (const test of failedTests) {
      if (!test.error) continue;

      const key = `${test.error.type}:${test.error.message}`;
      const existing = patterns.get(key);

      if (existing) {
        existing.count++;
        existing.tests.push(`${test.testFile}:${test.testName}`);
        existing.lastSeen = test.timestamp > existing.lastSeen ? test.timestamp : existing.lastSeen;
      } else {
        patterns.set(key, {
          count: 1,
          tests: [`${test.testFile}:${test.testName}`],
          errorType: test.error.type,
          errorMessage: test.error.message,
          firstSeen: test.timestamp,
          lastSeen: test.timestamp,
        });
      }
    }

    return Array.from(patterns.values())
      .sort((a, b) => b.count - a.count)
      .slice(0, 20); // Top 20 failure patterns
  }

  /**
   * Get flaky test analysis
   */
  async getFlakyTests(days: number = 30, threshold: number = 0.1): Promise<any[]> {
    const endDate = new Date();
    const startDate = new Date(endDate.getTime() - days * 24 * 60 * 60 * 1000);

    const testStats = new Map<string, {
      total: number;
      failed: number;
      testFile: string;
      testName: string;
      flakiness: number;
      recentFailures: Date[];
    }>();

    const allTests = await this.queryTestRecords(undefined, undefined, {
      startDate,
      endDate,
    });

    for (const test of allTests) {
      const key = `${test.testFile}:${test.testName}`;
      const existing = testStats.get(key);

      if (existing) {
        existing.total++;
        if (test.status === 'failed') {
          existing.failed++;
          existing.recentFailures.push(test.timestamp);
        }
      } else {
        testStats.set(key, {
          total: 1,
          failed: test.status === 'failed' ? 1 : 0,
          testFile: test.testFile,
          testName: test.testName,
          flakiness: 0,
          recentFailures: test.status === 'failed' ? [test.timestamp] : [],
        });
      }
    }

    // Calculate flakiness and filter
    const flakyTests = Array.from(testStats.values())
      .map(stat => ({
        ...stat,
        flakiness: stat.total > 0 ? stat.failed / stat.total : 0,
      }))
      .filter(stat => stat.flakiness > threshold && stat.total >= 5) // At least 5 runs
      .sort((a, b) => b.flakiness - a.flakiness);

    return flakyTests;
  }

  /**
   * Export historical data
   */
  async exportData(format: 'json' | 'csv' = 'json'): Promise<string> {
    const allSuiteRecords = await this.queryTestSuiteRecords();

    if (format === 'json') {
      return JSON.stringify({
        exportDate: new Date(),
        totalRecords: allSuiteRecords.length,
        retentionPolicy: this.retentionPolicy,
        data: allSuiteRecords,
      }, null, 2);
    } else {
      // CSV format
      const headers = [
        'timestamp', 'suiteName', 'totalTests', 'passedTests', 'failedTests',
        'skippedTests', 'duration', 'coverageStatements', 'coverageBranches',
        'coverageFunctions', 'coverageLines', 'totalMemory', 'peakMemory',
        'averageExecutionTime', 'nodeVersion', 'platform', 'ci', 'branch', 'commit',
      ];

      const rows = allSuiteRecords.map(record => [
        record.timestamp.toISOString(),
        record.suiteName,
        record.totalTests,
        record.passedTests,
        record.failedTests,
        record.skippedTests,
        record.duration,
        record.coverage.statements,
        record.coverage.branches,
        record.coverage.functions,
        record.coverage.lines,
        record.performance.totalMemory,
        record.performance.peakMemory,
        record.performance.averageExecutionTime,
        record.environment.nodeVersion,
        record.environment.platform,
        record.environment.ci,
        record.environment.branch,
        record.environment.commit,
      ]);

      return [headers.join(','), ...rows.map(row => row.join(','))].join('\n');
    }
  }

  /**
   * Import historical data
   */
  async importData(data: string, format: 'json' | 'csv' = 'json'): Promise<void> {
    if (format === 'json') {
      const parsed = JSON.parse(data);

      if (parsed.data && Array.isArray(parsed.data)) {
        for (const record of parsed.data) {
          // Ensure timestamp is a Date object
          const recordWithDate = {
            ...record,
            timestamp: new Date(record.timestamp),
          };
          await this.storeTestSuiteRecord(recordWithDate);
        }
      }
    } else {
      // CSV format parsing would be implemented here
      throw new Error('CSV import not yet implemented');
    }

    this.emit('dataImported', { format, recordCount: this.getTotalRecords() });
  }

  /**
   * Get storage statistics
   */
  getStorageStats(): {
    totalSuiteRecords: number;
    totalTestRecords: number;
    oldestRecord: Date | null;
    newestRecord: Date | null;
    storageSize: number;
  } {
    let totalSuiteRecords = 0;
    let totalTestRecords = 0;
    let oldestRecord: Date | null = null;
    let newestRecord: Date | null = null;

    for (const records of this.storage.values()) {
      totalSuiteRecords += records.length;

      for (const record of records) {
        if (!oldestRecord || record.timestamp < oldestRecord) {
          oldestRecord = record.timestamp;
        }
        if (!newestRecord || record.timestamp > newestRecord) {
          newestRecord = record.timestamp;
        }
      }
    }

    for (const records of this.testRecords.values()) {
      totalTestRecords += records.length;
    }

    return {
      totalSuiteRecords,
      totalTestRecords,
      oldestRecord,
      newestRecord,
      storageSize: this.calculateStorageSize(),
    };
  }

  /**
   * Clear all historical data
   */
  async clearAllData(): Promise<void> {
    this.storage.clear();
    this.testRecords.clear();
    this.emit('dataCleared');
  }

  /**
   * Private helper methods
   */
  private generateSuiteKey(suiteName: string): string {
    return `suite:${suiteName}`;
  }

  private generateTestKey(testFile: string, testName: string): string {
    return `${testFile}:${testName}`;
  }

  private applyQueryFilters(
    records: TestSuiteRecord[],
    options?: QueryOptions,
  ): TestSuiteRecord[] {
    let filtered = records;

    if (options?.startDate) {
      filtered = filtered.filter(r => r.timestamp >= options.startDate!);
    }

    if (options?.endDate) {
      filtered = filtered.filter(r => r.timestamp <= options.endDate!);
    }

    if (options?.branch) {
      filtered = filtered.filter(r => r.environment.branch === options.branch);
    }

    // Apply sorting
    if (options?.sortBy) {
      filtered.sort((a, b) => {
        let aVal: any, bVal: any;

        switch (options.sortBy) {
          case 'timestamp':
            aVal = a.timestamp.getTime();
            bVal = b.timestamp.getTime();
            break;
          case 'duration':
            aVal = a.duration;
            bVal = b.duration;
            break;
          default:
            aVal = a.suiteName;
            bVal = b.suiteName;
        }

        const result = aVal < bVal ? -1 : aVal > bVal ? 1 : 0;
        return options.sortOrder === 'desc' ? -result : result;
      });
    }

    // Apply pagination
    if (options?.offset || options?.limit) {
      const start = options.offset || 0;
      const end = options.limit ? start + options.limit : undefined;
      filtered = filtered.slice(start, end);
    }

    return filtered;
  }

  private applyTestQueryFilters(
    records: TestExecutionRecord[],
    options?: QueryOptions,
  ): TestExecutionRecord[] {
    let filtered = records;

    if (options?.startDate) {
      filtered = filtered.filter(r => r.timestamp >= options.startDate!);
    }

    if (options?.endDate) {
      filtered = filtered.filter(r => r.timestamp <= options.endDate!);
    }

    if (options?.status) {
      filtered = filtered.filter(r => r.status === options.status);
    }

    if (options?.testSuite) {
      filtered = filtered.filter(r => r.testSuite === options.testSuite);
    }

    if (options?.testFile) {
      filtered = filtered.filter(r => r.testFile === options.testFile);
    }

    if (options?.branch) {
      filtered = filtered.filter(r => r.environment.branch === options.branch);
    }

    // Apply sorting
    if (options?.sortBy) {
      filtered.sort((a, b) => {
        let aVal: any, bVal: any;

        switch (options.sortBy) {
          case 'timestamp':
            aVal = a.timestamp.getTime();
            bVal = b.timestamp.getTime();
            break;
          case 'duration':
            aVal = a.duration;
            bVal = b.duration;
            break;
          case 'testName':
            aVal = a.testName;
            bVal = b.testName;
            break;
          default:
            aVal = a.timestamp.getTime();
            bVal = b.timestamp.getTime();
        }

        const result = aVal < bVal ? -1 : aVal > bVal ? 1 : 0;
        return options.sortOrder === 'desc' ? -result : result;
      });
    }

    // Apply pagination
    if (options?.offset || options?.limit) {
      const start = options.offset || 0;
      const end = options.limit ? start + options.limit : undefined;
      filtered = filtered.slice(start, end);
    }

    return filtered;
  }

  private groupRecords(records: TestSuiteRecord[], groupBy: string): Record<string, TestSuiteRecord[]> {
    const grouped: Record<string, TestSuiteRecord[]> = {};

    for (const record of records) {
      let key: string;

      switch (groupBy) {
        case 'day':
          key = record.timestamp.toISOString().split('T')[0];
          break;
        case 'week':
          const weekStart = new Date(record.timestamp);
          weekStart.setDate(weekStart.getDate() - weekStart.getDay());
          key = weekStart.toISOString().split('T')[0];
          break;
        case 'month':
          key = record.timestamp.toISOString().substring(0, 7);
          break;
        case 'testSuite':
          key = record.suiteName;
          break;
        default:
          key = 'all';
      }

      if (!grouped[key]) {
        grouped[key] = [];
      }
      grouped[key].push(record);
    }

    return grouped;
  }

  private async applyRetentionPolicy(key: string): Promise<void> {
    const records = this.storage.get(key) || [];
    const cutoffDate = new Date(Date.now() - this.retentionPolicy.maxAge * 24 * 60 * 60 * 1000);

    // Remove old records
    const filteredRecords = records.filter(record => record.timestamp > cutoffDate);

    // Limit number of records
    if (filteredRecords.length > this.retentionPolicy.maxRecords) {
      filteredRecords.splice(this.retentionPolicy.maxRecords);
    }

    this.storage.set(key, filteredRecords);

    if (filteredRecords.length < records.length) {
      this.emit('recordsCleanedUp', {
        key,
        removedCount: records.length - filteredRecords.length,
      });
    }
  }

  private startCleanupInterval(): void {
    // Run cleanup every hour
    setInterval(async () => {
      for (const key of this.storage.keys()) {
        await this.applyRetentionPolicy(key);
      }
    }, 60 * 60 * 1000);
  }

  private calculateStorageSize(): number {
    let size = 0;

    for (const records of this.storage.values()) {
      size += JSON.stringify(records).length;
    }

    for (const records of this.testRecords.values()) {
      size += JSON.stringify(records).length;
    }

    return size;
  }

  private getTotalRecords(): number {
    let total = 0;

    for (const records of this.storage.values()) {
      total += records.length;
    }

    return total;
  }

  private generateSuiteKey(suiteName: string): string {
    return `suite:${suiteName}`;
  }

  private generateTestKey(testFile: string, testName: string): string {
    return `${testFile}:${testName}`;
  }
}
