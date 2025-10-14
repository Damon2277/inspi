/**
 * State Test Framework Tests
 *
 * Comprehensive tests for the state management testing framework including
 * Zustand store testing, consistency validation, and performance testing.
 */
import {
  StateTestFramework,
  createStateTestFramework,
  createDefaultStateTestConfig,
  StateTestUtils,
  type StateTestScenario,
  type StateStore,
} from '../../../../lib/testing/state';

describe('StateTestFramework', () => {
  let framework: StateTestFramework<any>;
  let mockStore: StateStore<any>;

  beforeEach(() => {
    const config = createDefaultStateTestConfig();
    framework = createStateTestFramework(config);

    mockStore = StateTestUtils.createMockStore({
      count: 0,
      name: 'test',
      loading: false,
      data: null,
    });
  });

  afterEach(() => {
    framework.cleanup();
  });

  describe('Basic State Testing', () => {
    it('should test initial state correctly', async () => {
      const initialState = { count: 0, name: 'test' };
      const scenarios: StateTestScenario<any>[] = [
        {
          name: 'Initial State Test',
          description: 'Test initial state',
          type: 'unit',
          store: mockStore,
          initialState,
          actions: [],
          assertions: [
            {
              name: 'Initial state should match',
              type: 'state',
              check: (store) => {
                const state = store.getState();
                return state.count === 0 && state.name === 'test';
              },
              message: 'Initial state should match expected values',
            },
          ],
        },
      ];

      const results = await framework.runTests(scenarios);

      expect(results).toHaveLength(1);
      expect(results[0].status).toBe('passed');
      expect(results[0].assertions).toHaveLength(1);
      expect(results[0].assertions[0].passed).toBe(true);
    });

    it('should test state updates correctly', async () => {
      const initialState = { count: 0 };
      const scenarios: StateTestScenario<any>[] = [
        {
          name: 'State Update Test',
          description: 'Test state updates',
          type: 'unit',
          store: mockStore,
          initialState,
          actions: [
            {
              name: 'Increment count',
              type: 'sync',
              execute: (store) => {
                const currentState = store.getState();
                store.setState({ count: currentState.count + 1 });
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
              message: 'Count should be incremented to 1',
            },
          ],
        },
      ];

      const results = await framework.runTests(scenarios);

      expect(results).toHaveLength(1);
      expect(results[0].status).toBe('passed');
      expect(results[0].assertions[0].passed).toBe(true);
    });

    it('should test subscription notifications', async () => {
      const initialState = { value: 'initial' };
      const scenarios: StateTestScenario<any>[] = [
        {
          name: 'Subscription Test',
          description: 'Test subscription notifications',
          type: 'unit',
          store: mockStore,
          initialState,
          actions: [
            {
              name: 'Update value',
              type: 'sync',
              execute: (store) => {
                store.setState({ value: 'updated' });
              },
            },
          ],
          assertions: [
            {
              name: 'Subscription should be called',
              type: 'subscription',
              check: (store, context) => {
                return context.subscriptionCalls.length > 0;
              },
              message: 'Subscription should be called on state change',
            },
          ],
        },
      ];

      const results = await framework.runTests(scenarios);

      expect(results).toHaveLength(1);
      expect(results[0].status).toBe('passed');
      expect(results[0].context.subscriptionCalls.length).toBeGreaterThan(0);
    });
  });

  describe('Async Actions', () => {
    it('should handle async actions correctly', async () => {
      const initialState = { loading: false, data: null };
      const scenarios: StateTestScenario<any>[] = [
        {
          name: 'Async Action Test',
          description: 'Test async actions',
          type: 'unit',
          store: mockStore,
          initialState,
          actions: [
            {
              name: 'Start loading',
              type: 'sync',
              execute: (store) => {
                store.setState({ loading: true });
              },
            },
            {
              name: 'Load data',
              type: 'async',
              execute: async (store) => {
                await new Promise(resolve => setTimeout(resolve, 50));
                store.setState({ loading: false, data: 'loaded' });
              },
            },
          ],
          assertions: [
            {
              name: 'Data should be loaded',
              type: 'state',
              check: (store) => {
                const state = store.getState();
                return !state.loading && state.data === 'loaded';
              },
              message: 'Data should be loaded and loading should be false',
            },
          ],
        },
      ];

      const results = await framework.runTests(scenarios);

      expect(results).toHaveLength(1);
      expect(results[0].status).toBe('passed');
      expect(results[0].assertions[0].passed).toBe(true);
    });

    it('should handle action delays', async () => {
      const initialState = { step: 0 };
      const scenarios: StateTestScenario<any>[] = [
        {
          name: 'Delayed Action Test',
          description: 'Test actions with delays',
          type: 'unit',
          store: mockStore,
          initialState,
          actions: [
            {
              name: 'First step',
              type: 'sync',
              execute: (store) => {
                store.setState({ step: 1 });
              },
            },
            {
              name: 'Delayed step',
              type: 'sync',
              delay: 100,
              execute: (store) => {
                store.setState({ step: 2 });
              },
            },
          ],
          assertions: [
            {
              name: 'Final step should be reached',
              type: 'state',
              check: (store) => {
                const state = store.getState();
                return state.step === 2;
              },
              message: 'Should reach final step after delay',
            },
          ],
        },
      ];

      const startTime = Date.now();
      const results = await framework.runTests(scenarios);
      const endTime = Date.now();

      expect(results).toHaveLength(1);
      expect(results[0].status).toBe('passed');
      expect(endTime - startTime).toBeGreaterThanOrEqual(100);
    });
  });

  describe('Performance Testing', () => {
    it('should measure performance metrics', async () => {
      const initialState = { counter: 0 };
      const updateCount = 100;

      const scenarios: StateTestScenario<any>[] = [
        {
          name: 'Performance Test',
          description: 'Test update performance',
          type: 'performance',
          store: mockStore,
          initialState,
          actions: Array.from({ length: updateCount }, (_, i) => ({
            name: `Update ${i + 1}`,
            type: 'sync' as const,
            execute: (store: StateStore<any>) => {
              store.setState({ counter: i + 1 });
            },
          })),
          assertions: [
            {
              name: 'Performance should be reasonable',
              type: 'performance',
              check: (store, context) => {
                return context.performanceMetrics.averageUpdateTime < 10;
              },
              message: 'Average update time should be reasonable',
            },
          ],
        },
      ];

      const results = await framework.runTests(scenarios);

      expect(results).toHaveLength(1);
      expect(results[0].status).toBe('passed');
      expect(results[0].context.performanceMetrics.updateTimes).toHaveLength(updateCount);
      expect(results[0].context.performanceMetrics.averageUpdateTime).toBeGreaterThan(0);
    });

    it('should track memory usage', async () => {
      const initialState = { data: [] };
      const scenarios: StateTestScenario<any>[] = [
        {
          name: 'Memory Usage Test',
          description: 'Test memory usage tracking',
          type: 'performance',
          store: mockStore,
          initialState,
          actions: [
            {
              name: 'Add large data',
              type: 'sync',
              execute: (store) => {
                const largeArray = new Array(1000).fill('data');
                store.setState({ data: largeArray });
              },
            },
          ],
          assertions: [
            {
              name: 'Memory usage should be tracked',
              type: 'performance',
              check: (store, context) => {
                return context.performanceMetrics.memoryUsage.length > 0;
              },
              message: 'Memory usage should be tracked',
            },
          ],
        },
      ];

      const results = await framework.runTests(scenarios);

      expect(results).toHaveLength(1);
      expect(results[0].context.performanceMetrics.memoryUsage.length).toBeGreaterThan(0);
    });
  });

  describe('Concurrent Actions', () => {
    it('should handle concurrent actions', async () => {
      const initialState = { value1: null, value2: null };
      const scenarios: StateTestScenario<any>[] = [
        {
          name: 'Concurrent Actions Test',
          description: 'Test concurrent actions',
          type: 'concurrency',
          store: mockStore,
          initialState,
          actions: [
            {
              name: 'Concurrent action 1',
              type: 'async',
              concurrent: true,
              execute: async (store) => {
                await new Promise(resolve => setTimeout(resolve, 50));
                store.setState({ value1: 'updated1' });
              },
            },
            {
              name: 'Concurrent action 2',
              type: 'async',
              concurrent: true,
              execute: async (store) => {
                await new Promise(resolve => setTimeout(resolve, 30));
                store.setState({ value2: 'updated2' });
              },
            },
          ],
          assertions: [
            {
              name: 'Both values should be updated',
              type: 'consistency',
              check: (store) => {
                const state = store.getState();
                return state.value1 === 'updated1' && state.value2 === 'updated2';
              },
              message: 'Both concurrent updates should be applied',
            },
          ],
        },
      ];

      const results = await framework.runTests(scenarios);

      expect(results).toHaveLength(1);
      expect(results[0].status).toBe('passed');
    });
  });

  describe('Batch Actions', () => {
    it('should handle batch actions', async () => {
      const initialState = { a: 0, b: 0, c: 0 };
      const scenarios: StateTestScenario<any>[] = [
        {
          name: 'Batch Actions Test',
          description: 'Test batch actions',
          type: 'unit',
          store: mockStore,
          initialState,
          actions: [
            {
              name: 'Batch update',
              type: 'batch',
              execute: (store) => {
                store.setState({ a: 1 });
                store.setState({ b: 2 });
                store.setState({ c: 3 });
              },
            },
          ],
          assertions: [
            {
              name: 'All values should be updated',
              type: 'state',
              check: (store) => {
                const state = store.getState();
                return state.a === 1 && state.b === 2 && state.c === 3;
              },
              message: 'All batch updates should be applied',
            },
          ],
        },
      ];

      const results = await framework.runTests(scenarios);

      expect(results).toHaveLength(1);
      expect(results[0].status).toBe('passed');
    });
  });

  describe('Error Handling', () => {
    it('should handle action errors gracefully', async () => {
      const initialState = { value: 'initial' };
      const scenarios: StateTestScenario<any>[] = [
        {
          name: 'Error Handling Test',
          description: 'Test error handling',
          type: 'unit',
          store: mockStore,
          initialState,
          actions: [
            {
              name: 'Failing action',
              type: 'sync',
              execute: () => {
                throw new Error('Test error');
              },
            },
          ],
          assertions: [],
        },
      ];

      const results = await framework.runTests(scenarios);

      expect(results).toHaveLength(1);
      expect(results[0].status).toBe('failed');
      expect(results[0].error).toBeDefined();
      expect(results[0].error?.message).toContain('Test error');
    });

    it('should handle assertion errors gracefully', async () => {
      const initialState = { value: 'initial' };
      const scenarios: StateTestScenario<any>[] = [
        {
          name: 'Assertion Error Test',
          description: 'Test assertion error handling',
          type: 'unit',
          store: mockStore,
          initialState,
          actions: [],
          assertions: [
            {
              name: 'Failing assertion',
              type: 'state',
              check: () => {
                throw new Error('Assertion error');
              },
              message: 'This assertion should fail',
            },
          ],
        },
      ];

      const results = await framework.runTests(scenarios);

      expect(results).toHaveLength(1);
      expect(results[0].status).toBe('failed');
      expect(results[0].assertions).toHaveLength(1);
      expect(results[0].assertions[0].passed).toBe(false);
      expect(results[0].assertions[0].message).toContain('Assertion error');
    });
  });

  describe('Setup and Teardown', () => {
    it('should execute setup and teardown hooks', async () => {
      let setupCalled = false;
      let teardownCalled = false;

      const initialState = { value: 'initial' };
      const scenarios: StateTestScenario<any>[] = [
        {
          name: 'Setup/Teardown Test',
          description: 'Test setup and teardown hooks',
          type: 'unit',
          store: mockStore,
          initialState,
          setup: async () => {
            setupCalled = true;
          },
          teardown: async () => {
            teardownCalled = true;
          },
          actions: [],
          assertions: [
            {
              name: 'Test should run',
              type: 'state',
              check: () => true,
              message: 'Test should run successfully',
            },
          ],
        },
      ];

      const results = await framework.runTests(scenarios);

      expect(results).toHaveLength(1);
      expect(results[0].status).toBe('passed');
      expect(setupCalled).toBe(true);
      expect(teardownCalled).toBe(true);
    });
  });

  describe('Report Generation', () => {
    it('should generate comprehensive test report', async () => {
      const initialState = { count: 0 };
      const scenarios: StateTestScenario<any>[] = [
        {
          name: 'Passing Test',
          description: 'A test that passes',
          type: 'unit',
          store: mockStore,
          initialState,
          actions: [],
          assertions: [
            {
              name: 'Should pass',
              type: 'state',
              check: () => true,
              message: 'This should pass',
            },
          ],
        },
        {
          name: 'Failing Test',
          description: 'A test that fails',
          type: 'unit',
          store: mockStore,
          initialState,
          actions: [],
          assertions: [
            {
              name: 'Should fail',
              type: 'state',
              check: () => false,
              message: 'This should fail',
            },
          ],
        },
      ];

      const results = await framework.runTests(scenarios);
      const report = framework.generateReport(results);

      expect(report).toContain('# State Management Test Report');
      expect(report).toContain('Total Tests: 2');
      expect(report).toContain('Passed: 1');
      expect(report).toContain('Failed: 1');
      expect(report).toContain('Success Rate: 50.0%');
      expect(report).toContain('## Test Type Breakdown');
      expect(report).toContain('## Failed Tests');
    });
  });

  describe('Event Emission', () => {
    it('should emit test events', async () => {
      const events: string[] = [];

      framework.on('testStarted', () => events.push('testStarted'));
      framework.on('testCompleted', () => events.push('testCompleted'));

      const initialState = { value: 'test' };
      const scenarios: StateTestScenario<any>[] = [
        {
          name: 'Event Test',
          description: 'Test event emission',
          type: 'unit',
          store: mockStore,
          initialState,
          actions: [],
          assertions: [
            {
              name: 'Should emit events',
              type: 'state',
              check: () => true,
              message: 'Should emit events',
            },
          ],
        },
      ];

      await framework.runTests(scenarios);

      expect(events).toContain('testStarted');
      expect(events).toContain('testCompleted');
    });
  });
});
