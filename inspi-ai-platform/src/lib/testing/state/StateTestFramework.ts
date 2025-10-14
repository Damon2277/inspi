/**
 * State Management Test Framework
 *
 * Comprehensive testing framework for state management including
 * Zustand store testing, state consistency validation, persistence testing,
 * and concurrency testing.
 */
import { EventEmitter } from 'events';

export interface StateTestConfig {
  timeout: number;
  retries: number;
  concurrency: {
    enabled: boolean;
    maxConcurrentOperations: number;
    stressTestDuration: number;
  };
  persistence: {
    enabled: boolean;
    storageType: 'localStorage' | 'sessionStorage' | 'indexedDB' | 'memory';
    testDataSize: number;
  };
  consistency: {
    enabled: boolean;
    snapshotInterval: number;
    maxSnapshots: number;
  };
  performance: {
    enabled: boolean;
    maxStateUpdateTime: number;
    maxMemoryUsage: number;
  };
}

export interface StateStore<T = any> {
  getState: () => T;
  setState: (partial: Partial<T> | ((state: T) => Partial<T>)) => void;
  subscribe: (listener: (state: T, prevState: T) => void) => () => void;
  destroy?: () => void;
}

export interface StateTestScenario<T = any> {
  name: string;
  description: string;
  type: 'unit' | 'integration' | 'consistency' | 'persistence' | 'concurrency' | 'performance';
  store: StateStore<T>;
  initialState: T;
  actions: StateAction<T>[];
  assertions: StateAssertion<T>[];
  setup?: () => Promise<void>;
  teardown?: () => Promise<void>;
}

export interface StateAction<T = any> {
  name: string;
  type: 'sync' | 'async' | 'batch';
  execute: (store: StateStore<T>) => Promise<void> | void;
  delay?: number;
  concurrent?: boolean;
}

export interface StateAssertion<T = any> {
  name: string;
  type: 'state' | 'subscription' | 'persistence' | 'performance' | 'consistency';
  check: (store: StateStore<T>, context: StateTestContext<T>) => Promise<boolean> | boolean;
  expected?: any;
  message?: string;
}

export interface StateTestContext<T = any> {
  initialState: T;
  currentState: T;
  previousStates: T[];
  subscriptionCalls: SubscriptionCall<T>[];
  performanceMetrics: StatePerformanceMetrics;
  persistenceData?: any;
}

export interface SubscriptionCall<T = any> {
  timestamp: Date;
  state: T;
  prevState: T;
  changeType: 'update' | 'replace' | 'merge';
}

export interface StatePerformanceMetrics {
  updateTimes: number[];
  memoryUsage: number[];
  subscriptionCallCount: number;
  averageUpdateTime: number;
  peakMemoryUsage: number;
}

export interface StateTestResult<T = any> {
  scenario: string;
  type: string;
  status: 'passed' | 'failed' | 'skipped';
  duration: number;
  assertions: StateAssertionResult[];
  context: StateTestContext<T>;
  error?: StateTestError;
  metadata: StateTestMetadata;
}

export interface StateAssertionResult {
  name: string;
  type: string;
  passed: boolean;
  expected: any;
  actual: any;
  message: string;
  executionTime: number;
}

export interface StateTestError {
  message: string;
  stack?: string;
  type: string;
  context: any;
}

export interface StateTestMetadata {
  timestamp: Date;
  environment: string;
  storeType: string;
  testId: string;
}

export interface StatePersistenceTest {
  name: string;
  description: string;
  storageKey: string;
  initialData: any;
  operations: PersistenceOperation[];
  validations: PersistenceValidation[];
}

export interface PersistenceOperation {
  type: 'save' | 'load' | 'clear' | 'update';
  data?: any;
  key?: string;
  delay?: number;
}

export interface PersistenceValidation {
  type: 'exists' | 'equals' | 'contains' | 'size' | 'format';
  expected: any;
  message: string;
}

export interface StateConcurrencyTest<T = any> {
  name: string;
  description: string;
  store: StateStore<T>;
  concurrentOperations: ConcurrentOperation<T>[];
  expectedFinalState: T;
  consistencyChecks: ConsistencyCheck<T>[];
}

export interface ConcurrentOperation<T = any> {
  id: string;
  operation: (store: StateStore<T>) => Promise<void> | void;
  delay?: number;
  priority?: number;
}

export interface ConsistencyCheck<T = any> {
  name: string;
  check: (states: T[]) => boolean;
  message: string;
}

export interface StateSnapshot<T = any> {
  timestamp: Date;
  state: T;
  operation: string;
  metadata: any;
}

export class StateTestFramework<T = any> extends EventEmitter {
  private config: StateTestConfig;
  private testResults: StateTestResult<T>[] = [];
  private snapshots: Map<string, StateSnapshot<T>[]> = new Map();

  constructor(config: StateTestConfig) {
    super();
    this.config = config;
  }

  /**
   * Run state test scenarios
   */
  async runTests(scenarios: StateTestScenario<T>[]): Promise<StateTestResult<T>[]> {
    const results: StateTestResult<T>[] = [];

    for (const scenario of scenarios) {
      this.emit('testStarted', { scenario: scenario.name, type: scenario.type });

      const result = await this.executeScenario(scenario);
      results.push(result);

      this.emit('testCompleted', { scenario: scenario.name, result });
    }

    this.testResults = results;
    return results;
  }

  /**
   * Execute a single test scenario
   */
  private async executeScenario(scenario: StateTestScenario<T>): Promise<StateTestResult<T>> {
    const startTime = Date.now();
    const context: StateTestContext<T> = {
      initialState: scenario.initialState,
      currentState: scenario.initialState,
      previousStates: [],
      subscriptionCalls: [],
      performanceMetrics: {
        updateTimes: [],
        memoryUsage: [],
        subscriptionCallCount: 0,
        averageUpdateTime: 0,
        peakMemoryUsage: 0,
      },
    };

    const result: StateTestResult<T> = {
      scenario: scenario.name,
      type: scenario.type,
      status: 'passed',
      duration: 0,
      assertions: [],
      context,
      metadata: {
        timestamp: new Date(),
        environment: process.env.NODE_ENV || 'test',
        storeType: this.getStoreType(scenario.store),
        testId: this.generateTestId(),
      },
    };

    try {
      // Setup
      if (scenario.setup) {
        await scenario.setup();
      }

      // Initialize store with initial state
      scenario.store.setState(scenario.initialState as any);

      // Setup subscription monitoring
      const unsubscribe = this.setupSubscriptionMonitoring(scenario.store, context);

      // Execute actions
      await this.executeActions(scenario.actions, scenario.store, context);

      // Run assertions
      result.assertions = await this.runAssertions(scenario.assertions, scenario.store, context);

      // Check if all assertions passed
      result.status = result.assertions.every(a => a.passed) ? 'passed' : 'failed';

      // Cleanup subscription
      unsubscribe();

      // Teardown
      if (scenario.teardown) {
        await scenario.teardown();
      }

    } catch (error) {
      result.status = 'failed';
      result.error = {
        message: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
        type: error instanceof Error ? error.constructor.name : 'Unknown',
        context: { scenario: scenario.name },
      };
    }

    result.duration = Date.now() - startTime;
    return result;
  }

  /**
   * Setup subscription monitoring
   */
  private setupSubscriptionMonitoring(
    store: StateStore<T>,
    context: StateTestContext<T>,
  ): () => void {
    return store.subscribe((state, prevState) => {
      context.subscriptionCalls.push({
        timestamp: new Date(),
        state,
        prevState,
        changeType: this.determineChangeType(state, prevState),
      });

      context.currentState = state;
      context.previousStates.push(prevState);
      context.performanceMetrics.subscriptionCallCount++;

      // Take snapshot if consistency checking is enabled
      if (this.config.consistency.enabled) {
        this.takeSnapshot(store, context, 'subscription');
      }
    });
  }

  /**
   * Execute actions on the store
   */
  private async executeActions(
    actions: StateAction<T>[],
    store: StateStore<T>,
    context: StateTestContext<T>,
  ): Promise<void> {
    for (const action of actions) {
      const startTime = performance.now();

      try {
        if (action.delay) {
          await this.delay(action.delay);
        }

        if (action.type === 'batch') {
          // Execute multiple actions in batch
          await this.executeBatchAction(action, store, context);
        } else if (action.concurrent) {
          // Execute action concurrently (don't wait)
          this.executeConcurrentAction(action, store, context);
        } else {
          // Execute action synchronously
          await action.execute(store);
        }

        const endTime = performance.now();
        const executionTime = endTime - startTime;
        context.performanceMetrics.updateTimes.push(executionTime);

        // Record memory usage
        if (this.config.performance.enabled) {
          const memoryUsage = this.getMemoryUsage();
          context.performanceMetrics.memoryUsage.push(memoryUsage);
          context.performanceMetrics.peakMemoryUsage = Math.max(
            context.performanceMetrics.peakMemoryUsage,
            memoryUsage,
          );
        }

      } catch (error) {
        throw new Error(`Action "${action.name}" failed: ${error}`);
      }
    }

    // Calculate average update time
    if (context.performanceMetrics.updateTimes.length > 0) {
      context.performanceMetrics.averageUpdateTime =
        context.performanceMetrics.updateTimes.reduce((sum, time) => sum + time, 0) /
        context.performanceMetrics.updateTimes.length;
    }
  }

  /**
   * Execute batch action
   */
  private async executeBatchAction(
    action: StateAction<T>,
    store: StateStore<T>,
    context: StateTestContext<T>,
  ): Promise<void> {
    // Batch actions should be executed atomically
    const currentState = store.getState();
    let batchedUpdates: Partial<T> = {};

    // Collect all updates in batch
    const originalSetState = store.setState;
    store.setState = (partial: any) => {
      if (typeof partial === 'function') {
        const result = partial(currentState);
        batchedUpdates = { ...batchedUpdates, ...result };
      } else {
        batchedUpdates = { ...batchedUpdates, ...partial };
      }
    };

    // Execute the action
    await action.execute(store);

    // Restore original setState and apply batched updates
    store.setState = originalSetState;
    store.setState(batchedUpdates);
  }

  /**
   * Execute concurrent action
   */
  private executeConcurrentAction(
    action: StateAction<T>,
    store: StateStore<T>,
    context: StateTestContext<T>,
  ): void {
    // Execute action without waiting
    Promise.resolve(action.execute(store)).catch(error => {
      this.emit('concurrentActionError', { action: action.name, error });
    });
  }

  /**
   * Run assertions
   */
  private async runAssertions(
    assertions: StateAssertion<T>[],
    store: StateStore<T>,
    context: StateTestContext<T>,
  ): Promise<StateAssertionResult[]> {
    const results: StateAssertionResult[] = [];

    for (const assertion of assertions) {
      const startTime = performance.now();

      try {
        const passed = await assertion.check(store, context);
        const endTime = performance.now();

        results.push({
          name: assertion.name,
          type: assertion.type,
          passed,
          expected: assertion.expected,
          actual: this.getActualValue(assertion, store, context),
          message: assertion.message || (passed ? 'Assertion passed' : 'Assertion failed'),
          executionTime: endTime - startTime,
        });

      } catch (error) {
        const endTime = performance.now();

        results.push({
          name: assertion.name,
          type: assertion.type,
          passed: false,
          expected: assertion.expected,
          actual: error,
          message: `Assertion error: ${error}`,
          executionTime: endTime - startTime,
        });
      }
    }

    return results;
  }

  /**
   * Test state persistence
   */
  async testPersistence(tests: StatePersistenceTest[]): Promise<StateTestResult<any>[]> {
    const results: StateTestResult<any>[] = [];

    for (const test of tests) {
      const result = await this.executePersistenceTest(test);
      results.push(result);
    }

    return results;
  }

  /**
   * Execute persistence test
   */
  private async executePersistenceTest(test: StatePersistenceTest): Promise<StateTestResult<any>> {
    const startTime = Date.now();
    const context: StateTestContext<any> = {
      initialState: test.initialData,
      currentState: test.initialData,
      previousStates: [],
      subscriptionCalls: [],
      performanceMetrics: {
        updateTimes: [],
        memoryUsage: [],
        subscriptionCallCount: 0,
        averageUpdateTime: 0,
        peakMemoryUsage: 0,
      },
      persistenceData: {},
    };

    const result: StateTestResult<any> = {
      scenario: test.name,
      type: 'persistence',
      status: 'passed',
      duration: 0,
      assertions: [],
      context,
      metadata: {
        timestamp: new Date(),
        environment: process.env.NODE_ENV || 'test',
        storeType: 'persistence',
        testId: this.generateTestId(),
      },
    };

    try {
      // Execute persistence operations
      for (const operation of test.operations) {
        await this.executePersistenceOperation(operation, test.storageKey, context);
      }

      // Run validations
      const assertions: StateAssertionResult[] = [];
      for (const validation of test.validations) {
        const assertionResult = await this.executePersistenceValidation(
          validation,
          test.storageKey,
          context,
        );
        assertions.push(assertionResult);
      }

      result.assertions = assertions;
      result.status = assertions.every(a => a.passed) ? 'passed' : 'failed';

    } catch (error) {
      result.status = 'failed';
      result.error = {
        message: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
        type: error instanceof Error ? error.constructor.name : 'Unknown',
        context: { test: test.name },
      };
    }

    result.duration = Date.now() - startTime;
    return result;
  }

  /**
   * Execute persistence operation
   */
  private async executePersistenceOperation(
    operation: PersistenceOperation,
    storageKey: string,
    context: StateTestContext<any>,
  ): Promise<void> {
    if (operation.delay) {
      await this.delay(operation.delay);
    }

    switch (operation.type) {
      case 'save':
        await this.saveToStorage(storageKey, operation.data, context);
        break;
      case 'load':
        const loadedData = await this.loadFromStorage(storageKey, context);
        context.persistenceData[storageKey] = loadedData;
        break;
      case 'clear':
        await this.clearStorage(storageKey, context);
        break;
      case 'update':
        const existingData = await this.loadFromStorage(storageKey, context);
        const updatedData = { ...existingData, ...operation.data };
        await this.saveToStorage(storageKey, updatedData, context);
        break;
    }
  }

  /**
   * Execute persistence validation
   */
  private async executePersistenceValidation(
    validation: PersistenceValidation,
    storageKey: string,
    context: StateTestContext<any>,
  ): Promise<StateAssertionResult> {
    const startTime = performance.now();

    try {
      let passed = false;
      let actual: any;

      switch (validation.type) {
        case 'exists':
          actual = await this.checkStorageExists(storageKey, context);
          passed = actual === validation.expected;
          break;
        case 'equals':
          actual = await this.loadFromStorage(storageKey, context);
          passed = JSON.stringify(actual) === JSON.stringify(validation.expected);
          break;
        case 'contains':
          actual = await this.loadFromStorage(storageKey, context);
          passed = this.containsValue(actual, validation.expected);
          break;
        case 'size':
          actual = await this.getStorageSize(storageKey, context);
          passed = actual === validation.expected;
          break;
        case 'format':
          actual = await this.loadFromStorage(storageKey, context);
          passed = this.validateFormat(actual, validation.expected);
          break;
      }

      const endTime = performance.now();

      return {
        name: `Persistence ${validation.type}`,
        type: 'persistence',
        passed,
        expected: validation.expected,
        actual,
        message: validation.message,
        executionTime: endTime - startTime,
      };

    } catch (error) {
      const endTime = performance.now();

      return {
        name: `Persistence ${validation.type}`,
        type: 'persistence',
        passed: false,
        expected: validation.expected,
        actual: error,
        message: `Validation error: ${error}`,
        executionTime: endTime - startTime,
      };
    }
  }

  /**
   * Test state concurrency
   */
  async testConcurrency(tests: StateConcurrencyTest<T>[]): Promise<StateTestResult<T>[]> {
    const results: StateTestResult<T>[] = [];

    for (const test of tests) {
      const result = await this.executeConcurrencyTest(test);
      results.push(result);
    }

    return results;
  }

  /**
   * Execute concurrency test
   */
  private async executeConcurrencyTest(test: StateConcurrencyTest<T>): Promise<StateTestResult<T>> {
    const startTime = Date.now();
    const context: StateTestContext<T> = {
      initialState: test.store.getState(),
      currentState: test.store.getState(),
      previousStates: [],
      subscriptionCalls: [],
      performanceMetrics: {
        updateTimes: [],
        memoryUsage: [],
        subscriptionCallCount: 0,
        averageUpdateTime: 0,
        peakMemoryUsage: 0,
      },
    };

    const result: StateTestResult<T> = {
      scenario: test.name,
      type: 'concurrency',
      status: 'passed',
      duration: 0,
      assertions: [],
      context,
      metadata: {
        timestamp: new Date(),
        environment: process.env.NODE_ENV || 'test',
        storeType: this.getStoreType(test.store),
        testId: this.generateTestId(),
      },
    };

    try {
      // Setup subscription monitoring
      const unsubscribe = this.setupSubscriptionMonitoring(test.store, context);

      // Execute concurrent operations
      const promises = test.concurrentOperations.map(async (operation) => {
        if (operation.delay) {
          await this.delay(operation.delay);
        }
        return operation.operation(test.store);
      });

      // Wait for all operations to complete
      await Promise.all(promises);

      // Check final state
      const finalState = test.store.getState();
      const finalStateMatches = JSON.stringify(finalState) === JSON.stringify(test.expectedFinalState);

      // Run consistency checks
      const assertions: StateAssertionResult[] = [];

      // Final state assertion
      assertions.push({
        name: 'Final state matches expected',
        type: 'consistency',
        passed: finalStateMatches,
        expected: test.expectedFinalState,
        actual: finalState,
        message: finalStateMatches ? 'Final state is correct' : 'Final state does not match expected',
        executionTime: 0,
      });

      // Custom consistency checks
      for (const check of test.consistencyChecks) {
        const states = [context.initialState, ...context.previousStates, context.currentState];
        const passed = check.check(states);

        assertions.push({
          name: check.name,
          type: 'consistency',
          passed,
          expected: true,
          actual: passed,
          message: check.message,
          executionTime: 0,
        });
      }

      result.assertions = assertions;
      result.status = assertions.every(a => a.passed) ? 'passed' : 'failed';

      // Cleanup subscription
      unsubscribe();

    } catch (error) {
      result.status = 'failed';
      result.error = {
        message: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
        type: error instanceof Error ? error.constructor.name : 'Unknown',
        context: { test: test.name },
      };
    }

    result.duration = Date.now() - startTime;
    return result;
  }

  /**
   * Take state snapshot
   */
  private takeSnapshot(store: StateStore<T>, context: StateTestContext<T>, operation: string): void {
    const testId = this.generateTestId();
    const snapshots = this.snapshots.get(testId) || [];

    const snapshot: StateSnapshot<T> = {
      timestamp: new Date(),
      state: store.getState(),
      operation,
      metadata: {
        subscriptionCallCount: context.performanceMetrics.subscriptionCallCount,
        memoryUsage: this.getMemoryUsage(),
      },
    };

    snapshots.push(snapshot);

    // Limit snapshots to max count
    if (snapshots.length > this.config.consistency.maxSnapshots) {
      snapshots.shift();
    }

    this.snapshots.set(testId, snapshots);
  }

  /**
   * Storage operations (mock implementations)
   */
  private async saveToStorage(key: string, data: any, context: StateTestContext<any>): Promise<void> {
    // Mock implementation - in real scenario would use actual storage
    context.persistenceData = context.persistenceData || {};
    context.persistenceData[key] = JSON.parse(JSON.stringify(data));
  }

  private async loadFromStorage(key: string, context: StateTestContext<any>): Promise<any> {
    // Mock implementation
    return context.persistenceData?.[key] || null;
  }

  private async clearStorage(key: string, context: StateTestContext<any>): Promise<void> {
    // Mock implementation
    if (context.persistenceData) {
      delete context.persistenceData[key];
    }
  }

  private async checkStorageExists(key: string, context: StateTestContext<any>): Promise<boolean> {
    // Mock implementation
    return context.persistenceData && key in context.persistenceData;
  }

  private async getStorageSize(key: string, context: StateTestContext<any>): Promise<number> {
    // Mock implementation
    const data = context.persistenceData?.[key];
    return data ? JSON.stringify(data).length : 0;
  }

  /**
   * Utility methods
   */
  private determineChangeType(state: T, prevState: T): 'update' | 'replace' | 'merge' {
    if (typeof state === 'object' && typeof prevState === 'object') {
      const stateKeys = Object.keys(state as any);
      const prevStateKeys = Object.keys(prevState as any);

      if (stateKeys.length !== prevStateKeys.length) {
        return 'replace';
      }

      const hasNewKeys = stateKeys.some(key => !prevStateKeys.includes(key));
      return hasNewKeys ? 'replace' : 'merge';
    }

    return 'update';
  }

  private getActualValue(assertion: StateAssertion<T>, store: StateStore<T>, context: StateTestContext<T>): any {
    switch (assertion.type) {
      case 'state':
        return store.getState();
      case 'subscription':
        return context.subscriptionCalls.length;
      case 'performance':
        return context.performanceMetrics;
      case 'persistence':
        return context.persistenceData;
      case 'consistency':
        return context.previousStates.length;
      default:
        return null;
    }
  }

  private getStoreType(store: StateStore<T>): string {
    // Try to determine store type from constructor or properties
    if (store.constructor.name !== 'Object') {
      return store.constructor.name;
    }
    return 'Unknown';
  }

  private getMemoryUsage(): number {
    // Mock implementation - in real scenario would use process.memoryUsage()
    return Math.random() * 100;
  }

  private containsValue(obj: any, expected: any): boolean {
    if (typeof obj !== 'object' || obj === null) {
      return obj === expected;
    }

    return JSON.stringify(obj).includes(JSON.stringify(expected));
  }

  private validateFormat(data: any, format: any): boolean {
    // Simple format validation - could be extended
    if (typeof format === 'string') {
      return typeof data === format;
    }

    if (Array.isArray(format)) {
      return Array.isArray(data);
    }

    if (typeof format === 'object') {
      return typeof data === 'object' && data !== null;
    }

    return false;
  }

  private async delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private generateTestId(): string {
    return `test-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Generate comprehensive test report
   */
  generateReport(results: StateTestResult<T>[]): string {
    const totalTests = results.length;
    const passedTests = results.filter(r => r.status === 'passed').length;
    const failedTests = results.filter(r => r.status === 'failed').length;
    const skippedTests = results.filter(r => r.status === 'skipped').length;

    let report = '# State Management Test Report\n\n';
    report += '**Summary:**\n';
    report += `- Total Tests: ${totalTests}\n`;
    report += `- Passed: ${passedTests}\n`;
    report += `- Failed: ${failedTests}\n`;
    report += `- Skipped: ${skippedTests}\n`;
    report += `- Success Rate: ${totalTests > 0 ? ((passedTests / totalTests) * 100).toFixed(1) : 0}%\n\n`;

    // Test type breakdown
    const typeBreakdown = new Map<string, { passed: number; failed: number; skipped: number }>();
    results.forEach(result => {
      const stats = typeBreakdown.get(result.type) || { passed: 0, failed: 0, skipped: 0 };
      stats[result.status]++;
      typeBreakdown.set(result.type, stats);
    });

    report += '## Test Type Breakdown\n\n';
    typeBreakdown.forEach((stats, type) => {
      const total = stats.passed + stats.failed + stats.skipped;
      const successRate = total > 0 ? ((stats.passed / total) * 100).toFixed(1) : 0;
      report += `- **${type}**: ${stats.passed}/${total} passed (${successRate}%)\n`;
    });

    // Performance summary
    const performanceResults = results.filter(r => r.context.performanceMetrics.updateTimes.length > 0);
    if (performanceResults.length > 0) {
      report += '\n## Performance Summary\n\n';
      performanceResults.forEach(result => {
        const metrics = result.context.performanceMetrics;
        report += `### ${result.scenario}\n`;
        report += `- Average Update Time: ${metrics.averageUpdateTime.toFixed(2)}ms\n`;
        report += `- Peak Memory Usage: ${metrics.peakMemoryUsage.toFixed(2)}MB\n`;
        report += `- Subscription Calls: ${metrics.subscriptionCallCount}\n\n`;
      });
    }

    // Failed tests details
    const failedResults = results.filter(r => r.status === 'failed');
    if (failedResults.length > 0) {
      report += '\n## Failed Tests\n\n';
      failedResults.forEach(result => {
        report += `### ${result.scenario} (${result.type})\n`;
        report += `- Duration: ${result.duration}ms\n`;
        report += `- Error: ${result.error?.message || 'Unknown error'}\n`;

        if (result.assertions.length > 0) {
          report += '- Failed Assertions:\n';
          result.assertions.filter(a => !a.passed).forEach(assertion => {
            report += `  - ${assertion.name}: ${assertion.message}\n`;
          });
        }
        report += '\n';
      });
    }

    return report;
  }

  /**
   * Cleanup resources
   */
  cleanup(): void {
    this.testResults = [];
    this.snapshots.clear();
    this.removeAllListeners();
  }
}

/**
 * Create state test framework instance
 */
export function createStateTestFramework<T = any>(config: StateTestConfig): StateTestFramework<T> {
  return new StateTestFramework<T>(config);
}
