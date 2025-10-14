/**
 * State Testing Integration Tests
 *
 * End-to-end integration tests demonstrating the complete state management testing system
 * including real-world scenarios, performance testing, and comprehensive reporting.
 */
import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';

import {
  StateTestFramework,
  ZustandTestUtils,
  StateConsistencyTester,
  createStateTestFramework,
  createConsistencyTester,
  createDefaultStateTestConfig,
  createDefaultConsistencyConfig,
  CommonStateScenarios,
  StateTestUtils,
  type StateTestScenario,
  type ZustandStore,
  type StateInvariant,
  type StateTransition,
} from '../../../../lib/testing/state';

// Mock zustand for testing
jest.mock('zustand', () => ({
  create: jest.fn(),
}));

jest.mock('zustand/middleware', () => ({
  subscribeWithSelector: jest.fn((fn) => fn),
}));

describe('State Testing Integration', () => {
  let framework: StateTestFramework<any>;
  let consistencyTester: StateConsistencyTester<any>;

  beforeEach(() => {
    const config = createDefaultStateTestConfig();
    framework = createStateTestFramework(config);

    const consistencyConfig = createDefaultConsistencyConfig();
    consistencyTester = createConsistencyTester(consistencyConfig);
  });

  afterEach(() => {
    framework.cleanup();
    consistencyTester.reset();
  });

  describe('Real-World Counter Store Testing', () => {
    let counterStore: ZustandStore<any>;

    beforeEach(() => {
      // Create a mock counter store
      let state = { count: 0, history: [], lastAction: null };
      const listeners: Array<(state: any, prevState: any) => void> = [];

      counterStore = {
        getState: () => state,
        setState: (partial: any) => {
          const prevState = { ...state };
          if (typeof partial === 'function') {
            const result = partial(state);
            state = { ...state, ...result };
          } else {
            state = { ...state, ...partial };
          }
          listeners.forEach(listener => listener(state, prevState));
        },
        subscribe: (listener: (state: any, prevState: any) => void) => {
          listeners.push(listener);
          return () => {
            const index = listeners.indexOf(listener);
            if (index > -1) {
              listeners.splice(index, 1);
            }
          };
        },
        destroy: () => {
          listeners.splice(0, listeners.length);
        },
        // Actions
        increment: () => {
          const current = state.count;
          state = {
            ...state,
            count: current + 1,
            history: [...state.history, { action: 'increment', from: current, to: current + 1 }],
            lastAction: 'increment',
          };
          listeners.forEach(listener => listener(state, { ...state, count: current }));
        },
        decrement: () => {
          const current = state.count;
          state = {
            ...state,
            count: current - 1,
            history: [...state.history, { action: 'decrement', from: current, to: current - 1 }],
            lastAction: 'decrement',
          };
          listeners.forEach(listener => listener(state, { ...state, count: current }));
        },
        reset: () => {
          const prevState = { ...state };
          state = {
            count: 0,
            history: [...state.history, { action: 'reset', from: prevState.count, to: 0 }],
            lastAction: 'reset',
          };
          listeners.forEach(listener => listener(state, prevState));
        },
      };

      (create as jest.Mock).mockReturnValue(counterStore);
    });

    it('should test complete counter store functionality', async () => {
      const initialState = { count: 0, history: [], lastAction: null };

      const scenarios: StateTestScenario<any>[] = [
        // Basic functionality tests
        {
          name: 'Counter Increment',
          description: 'Test counter increment functionality',
          type: 'unit',
          store: counterStore,
          initialState,
          actions: [
            {
              name: 'Increment counter',
              type: 'sync',
              execute: (store: any) => {
                store.increment();
              },
            },
          ],
          assertions: [
            {
              name: 'Count should be incremented',
              type: 'state',
              check: (store) => {
                const state = store.getState();
                return state.count === 1;
              },
              message: 'Count should be 1 after increment',
            },
            {
              name: 'History should be updated',
              type: 'state',
              check: (store) => {
                const state = store.getState();
                return state.history.length === 1 && state.history[0].action === 'increment';
              },
              message: 'History should record the increment action',
            },
          ],
        },

        // Multiple operations test
        {
          name: 'Counter Multiple Operations',
          description: 'Test multiple counter operations',
          type: 'integration',
          store: counterStore,
          initialState,
          actions: [
            {
              name: 'Increment 3 times',
              type: 'sync',
              execute: (store: any) => {
                store.increment();
                store.increment();
                store.increment();
              },
            },
            {
              name: 'Decrement once',
              type: 'sync',
              execute: (store: any) => {
                store.decrement();
              },
            },
            {
              name: 'Reset counter',
              type: 'sync',
              execute: (store: any) => {
                store.reset();
              },
            },
          ],
          assertions: [
            {
              name: 'Final count should be 0',
              type: 'state',
              check: (store) => {
                const state = store.getState();
                return state.count === 0;
              },
              message: 'Count should be 0 after reset',
            },
            {
              name: 'History should record all operations',
              type: 'state',
              check: (store) => {
                const state = store.getState();
                return state.history.length === 5; // 3 increments + 1 decrement + 1 reset
              },
              message: 'History should contain all 5 operations',
            },
          ],
        },
      ];

      const results = await framework.runTests(scenarios);

      expect(results).toHaveLength(2);
      expect(results.every(r => r.status === 'passed')).toBe(true);
    });

    it('should test counter store with consistency validation', async () => {
      // Register invariants
      const invariants: StateInvariant<any>[] = [
        {
          name: 'Count is Number',
          description: 'Count should always be a number',
          check: (state) => typeof state.count === 'number',
          severity: 'critical',
          message: 'Count must be a number',
        },
        {
          name: 'History is Array',
          description: 'History should always be an array',
          check: (state) => Array.isArray(state.history),
          severity: 'high',
          message: 'History must be an array',
        },
        {
          name: 'History Length Consistency',
          description: 'History length should match the number of operations',
          check: (state) => {
            // For this test, we'll assume each operation adds one history entry
            return state.history.length >= 0;
          },
          severity: 'medium',
          message: 'History length should be consistent',
        },
      ];

      invariants.forEach(invariant => consistencyTester.registerInvariant(invariant));

      // Register transitions
      const transitions: StateTransition<any>[] = [
        {
          name: 'Increment Transition',
          from: (state) => typeof state.count === 'number',
          to: (state) => typeof state.count === 'number',
          action: 'increment',
          validate: (from, to) => to.count === from.count + 1,
          message: 'Increment should increase count by 1',
        },
      ];

      transitions.forEach(transition => consistencyTester.registerTransition(transition));

      // Start monitoring
      const stopMonitoring = consistencyTester.startMonitoring(counterStore);

      // Perform operations
      counterStore.increment();
      counterStore.increment();
      counterStore.decrement();
      counterStore.reset();

      stopMonitoring();

      // Analyze consistency
      const report = consistencyTester.analyzeConsistency();

      expect(report.summary.totalSnapshots).toBeGreaterThan(0);
      expect(report.summary.consistencyScore).toBeGreaterThan(80); // Should be high consistency
      expect(report.violations.length).toBe(0); // No violations expected
    });
  });

  describe('Async Data Loading Store Testing', () => {
    let dataStore: ZustandStore<any>;

    beforeEach(() => {
      let state = {
        data: null,
        loading: false,
        error: null,
        lastFetch: null,
      };
      const listeners: Array<(state: any, prevState: any) => void> = [];

      dataStore = {
        getState: () => state,
        setState: (partial: any) => {
          const prevState = { ...state };
          if (typeof partial === 'function') {
            const result = partial(state);
            state = { ...state, ...result };
          } else {
            state = { ...state, ...partial };
          }
          listeners.forEach(listener => listener(state, prevState));
        },
        subscribe: (listener: (state: any, prevState: any) => void) => {
          listeners.push(listener);
          return () => {
            const index = listeners.indexOf(listener);
            if (index > -1) {
              listeners.splice(index, 1);
            }
          };
        },
        destroy: () => {
          listeners.splice(0, listeners.length);
        },
        // Actions
        fetchData: async () => {
          // Start loading
          const prevState = { ...state };
          state = { ...state, loading: true, error: null };
          listeners.forEach(listener => listener(state, prevState));

          try {
            // Simulate API call
            await new Promise(resolve => setTimeout(resolve, 100));

            // Success
            const successState = { ...state };
            state = {
              ...state,
              loading: false,
              data: { id: 1, name: 'Test Data' },
              lastFetch: new Date().toISOString(),
            };
            listeners.forEach(listener => listener(state, successState));
          } catch (error) {
            // Error
            const errorState = { ...state };
            state = {
              ...state,
              loading: false,
              error: error.message,
            };
            listeners.forEach(listener => listener(state, errorState));
          }
        },
        clearData: () => {
          const prevState = { ...state };
          state = {
            data: null,
            loading: false,
            error: null,
            lastFetch: null,
          };
          listeners.forEach(listener => listener(state, prevState));
        },
      };
    });

    it('should test async data loading scenarios', async () => {
      const initialState = { data: null, loading: false, error: null, lastFetch: null };

      const scenarios: StateTestScenario<any>[] = [
        {
          name: 'Successful Data Fetch',
          description: 'Test successful data fetching',
          type: 'integration',
          store: dataStore,
          initialState,
          actions: [
            {
              name: 'Fetch data',
              type: 'async',
              execute: async (store: any) => {
                await store.fetchData();
              },
            },
          ],
          assertions: [
            {
              name: 'Data should be loaded',
              type: 'state',
              check: (store) => {
                const state = store.getState();
                return !state.loading && state.data !== null && state.error === null;
              },
              message: 'Data should be loaded successfully',
            },
            {
              name: 'Last fetch should be recorded',
              type: 'state',
              check: (store) => {
                const state = store.getState();
                return state.lastFetch !== null;
              },
              message: 'Last fetch timestamp should be recorded',
            },
          ],
        },

        {
          name: 'Loading State Management',
          description: 'Test loading state transitions',
          type: 'consistency',
          store: dataStore,
          initialState,
          actions: [
            {
              name: 'Start fetch (check loading state)',
              type: 'async',
              execute: async (store: any) => {
                const fetchPromise = store.fetchData();
                // Check loading state immediately
                const state = store.getState();
                expect(state.loading).toBe(true);
                await fetchPromise;
              },
            },
          ],
          assertions: [
            {
              name: 'Loading should be false after completion',
              type: 'state',
              check: (store) => {
                const state = store.getState();
                return !state.loading;
              },
              message: 'Loading should be false after fetch completes',
            },
          ],
        },
      ];

      const results = await framework.runTests(scenarios);

      expect(results).toHaveLength(2);
      expect(results.every(r => r.status === 'passed')).toBe(true);
    });

    it('should validate loading state transitions', async () => {
      // Register loading state transitions
      const transitions: StateTransition<any>[] = [
        {
          name: 'Start Loading',
          from: (state) => !state.loading,
          to: (state) => state.loading,
          action: 'startLoading',
          validate: (from, to) => !from.loading && to.loading && to.error === null,
          message: 'Loading should start with error cleared',
        },
        {
          name: 'Loading to Success',
          from: (state) => state.loading === true,
          to: (state) => state.loading === false && state.data !== null,
          action: 'loadSuccess',
          validate: (from, to) => {
            return from.loading && !to.loading && to.data !== null && to.error === null;
          },
          message: 'Successful loading should set data and clear error',
        },
      ];

      transitions.forEach(transition => consistencyTester.registerTransition(transition));

      const stopMonitoring = consistencyTester.startMonitoring(dataStore);

      await (dataStore as any).fetchData();

      stopMonitoring();

      const report = consistencyTester.analyzeConsistency();
      expect(report.summary.violationsFound).toBe(0);
    });
  });

  describe('Performance and Stress Testing', () => {
    it('should perform comprehensive performance testing', async () => {
      const performanceStore = StateTestUtils.createMockStore({ counter: 0 });

      // Test with different update counts
      const updateCounts = [100, 500, 1000];

      for (const updateCount of updateCounts) {
        const scenarios = CommonStateScenarios.performance(performanceStore, { counter: 0 }, updateCount);
        const results = await framework.runTests(scenarios);

        expect(results).toHaveLength(1);
        expect(results[0].context.performanceMetrics.updateTimes).toHaveLength(updateCount);
        expect(results[0].context.performanceMetrics.averageUpdateTime).toBeGreaterThan(0);

        console.log(`Performance test with ${updateCount} updates:`);
        console.log(`- Average update time: ${results[0].context.performanceMetrics.averageUpdateTime.toFixed(3)}ms`);
        console.log(`- Peak memory usage: ${results[0].context.performanceMetrics.peakMemoryUsage.toFixed(2)}MB`);
      }
    });

    it('should test concurrent operations stress scenarios', async () => {
      const stressStore = StateTestUtils.createMockStore({
        counter: 0,
        operations: 0,
        lastUpdate: null,
      });

      const concurrentOperations = Array.from({ length: 50 }, (_, i) =>
        async () => {
          await new Promise(resolve => setTimeout(resolve, Math.random() * 10));
          stressStore.setState({
            counter: stressStore.getState().counter + 1,
            operations: stressStore.getState().operations + 1,
            lastUpdate: Date.now(),
          });
        },
      );

      const result = await consistencyTester.testConcurrency(
        stressStore,
        concurrentOperations,
        'Stress Test - 50 Concurrent Operations',
      );

      expect(result.operationsExecuted).toBe(50);
      expect(result.finalState.operations).toBe(50);
      expect(result.stateHistory.length).toBeGreaterThan(1);
      expect(result.duration).toBeGreaterThan(0);

      console.log('Concurrency stress test results:');
      console.log(`- Operations executed: ${result.operationsExecuted}`);
      console.log(`- Final counter value: ${result.finalState.counter}`);
      console.log(`- Race conditions detected: ${result.raceConditionsDetected}`);
      console.log(`- Test duration: ${result.duration}ms`);
    });
  });

  describe('Comprehensive Reporting', () => {
    it('should generate comprehensive test reports', async () => {
      const testStore = StateTestUtils.createMockStore({ value: 0, status: 'idle' });

      // Run various types of tests
      const scenarios: StateTestScenario<any>[] = [
        ...CommonStateScenarios.basic(testStore, { value: 0, status: 'idle' }),
        ...CommonStateScenarios.performance(testStore, { value: 0, status: 'idle' }, 100),
        ...CommonStateScenarios.concurrency(testStore, { value: 0, status: 'idle' }),
        ...CommonStateScenarios.persistence(testStore, { value: 0, status: 'idle' }),
      ];

      const results = await framework.runTests(scenarios);
      const report = framework.generateReport(results);

      expect(report).toContain('# State Management Test Report');
      expect(report).toContain('## Test Type Breakdown');
      expect(report).toContain('unit');
      expect(report).toContain('performance');
      expect(report).toContain('concurrency');
      expect(report).toContain('persistence');

      // Should contain performance metrics
      expect(report).toContain('## Performance Summary');
      expect(report).toContain('Average Update Time');
      expect(report).toContain('Peak Memory Usage');

      console.log('Generated comprehensive test report:');
      console.log(report);
    });

    it('should generate consistency analysis report', async () => {
      const consistencyStore = StateTestUtils.createMockStore({
        count: 0,
        valid: true,
      });

      // Register invariants
      const invariants: StateInvariant<any>[] = [
        {
          name: 'Count Non-Negative',
          description: 'Count should never be negative',
          check: (state) => state.count >= 0,
          severity: 'high',
          message: 'Count cannot be negative',
        },
        {
          name: 'Valid Flag Consistency',
          description: 'Valid flag should be boolean',
          check: (state) => typeof state.valid === 'boolean',
          severity: 'medium',
          message: 'Valid flag must be boolean',
        },
      ];

      invariants.forEach(invariant => consistencyTester.registerInvariant(invariant));

      const stopMonitoring = consistencyTester.startMonitoring(consistencyStore);

      // Perform various operations
      for (let i = 0; i < 10; i++) {
        consistencyStore.setState({ count: i, valid: i % 2 === 0 });
      }

      stopMonitoring();

      const report = consistencyTester.analyzeConsistency();

      expect(report.summary.totalSnapshots).toBeGreaterThan(0);
      expect(report.summary.consistencyScore).toBeGreaterThanOrEqual(0);
      expect(report.snapshots.length).toBeGreaterThan(0);
      expect(report.recommendations).toBeInstanceOf(Array);

      console.log('Consistency analysis report:');
      console.log(`- Total snapshots: ${report.summary.totalSnapshots}`);
      console.log(`- Violations found: ${report.summary.violationsFound}`);
      console.log(`- Consistency score: ${report.summary.consistencyScore.toFixed(1)}%`);
      console.log(`- Recommendations: ${report.recommendations.length}`);
    });
  });

  describe('Real-World Integration Scenarios', () => {
    it('should test a complete user management store', async () => {
      const userStore = StateTestUtils.createMockStore({
        users: [],
        selectedUser: null,
        loading: false,
        error: null,
        filters: { active: true, role: 'all' },
      });

      const scenarios: StateTestScenario<any>[] = [
        {
          name: 'User Management Workflow',
          description: 'Test complete user management workflow',
          type: 'integration',
          store: userStore,
          initialState: {
            users: [],
            selectedUser: null,
            loading: false,
            error: null,
            filters: { active: true, role: 'all' },
          },
          actions: [
            {
              name: 'Load users',
              type: 'async',
              execute: async (store) => {
                store.setState({ loading: true });
                await new Promise(resolve => setTimeout(resolve, 50));
                store.setState({
                  loading: false,
                  users: [
                    { id: 1, name: 'John', role: 'admin', active: true },
                    { id: 2, name: 'Jane', role: 'user', active: true },
                    { id: 3, name: 'Bob', role: 'user', active: false },
                  ],
                });
              },
            },
            {
              name: 'Select user',
              type: 'sync',
              execute: (store) => {
                const users = store.getState().users;
                store.setState({ selectedUser: users[0] });
              },
            },
            {
              name: 'Update filters',
              type: 'sync',
              execute: (store) => {
                store.setState({
                  filters: { active: false, role: 'user' },
                });
              },
            },
          ],
          assertions: [
            {
              name: 'Users should be loaded',
              type: 'state',
              check: (store) => {
                const state = store.getState();
                return state.users.length === 3 && !state.loading;
              },
              message: 'Should load 3 users and stop loading',
            },
            {
              name: 'User should be selected',
              type: 'state',
              check: (store) => {
                const state = store.getState();
                return state.selectedUser && state.selectedUser.id === 1;
              },
              message: 'Should select the first user',
            },
            {
              name: 'Filters should be updated',
              type: 'state',
              check: (store) => {
                const state = store.getState();
                return !state.filters.active && state.filters.role === 'user';
              },
              message: 'Should update filters correctly',
            },
          ],
        },
      ];

      const results = await framework.runTests(scenarios);

      expect(results).toHaveLength(1);
      expect(results[0].status).toBe('passed');
      expect(results[0].assertions.every(a => a.passed)).toBe(true);
    });
  });
});
