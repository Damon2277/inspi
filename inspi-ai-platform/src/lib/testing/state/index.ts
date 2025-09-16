/**
 * State Management Testing Framework
 * 
 * Comprehensive state management testing utilities including
 * Zustand store testing, state consistency validation, persistence testing,
 * and concurrency testing.
 */

// Core framework
export {
  StateTestFramework,
  createStateTestFramework,
  type StateTestConfig,
  type StateStore,
  type StateTestScenario,
  type StateAction,
  type StateAssertion,
  type StateTestContext,
  type SubscriptionCall,
  type StatePerformanceMetrics,
  type StateTestResult,
  type StateAssertionResult,
  type StateTestError,
  type StateTestMetadata,
  type StatePersistenceTest,
  type PersistenceOperation,
  type PersistenceValidation,
  type StateConcurrencyTest,
  type ConcurrentOperation,
  type ConsistencyCheck,
  type StateSnapshot
} from './StateTestFramework';

// Zustand utilities
export {
  ZustandTestUtils,
  ZustandAssertions,
  type ZustandStore,
  type ZustandStoreConfig,
  type ZustandActions,
  type ZustandMiddleware,
  type ZustandPersistConfig,
  type ZustandTestBuilder,
  type ZustandStateSnapshot,
  type ZustandTestSuite
} from './ZustandTestUtils';

// Consistency testing
export {
  StateConsistencyTester,
  createConsistencyTester,
  type ConsistencyTestConfig,
  type StateInvariant,
  type StateTransition,
  type ConsistencySnapshot,
  type SnapshotMetadata,
  type ConsistencyViolation,
  type ConsistencyReport,
  type ConcurrencyTestResult
} from './StateConsistencyTester';

// Convenience functions
export const createDefaultStateTestConfig = (): StateTestConfig => ({
  timeout: 5000,
  retries: 3,
  concurrency: {
    enabled: true,
    maxConcurrentOperations: 10,
    stressTestDuration: 5000
  },
  persistence: {
    enabled: true,
    storageType: 'memory',
    testDataSize: 1000
  },
  consistency: {
    enabled: true,
    snapshotInterval: 100,
    maxSnapshots: 100
  },
  performance: {
    enabled: true,
    maxStateUpdateTime: 10,
    maxMemoryUsage: 100
  }
});

export const createDefaultConsistencyConfig = (): ConsistencyTestConfig => ({
  snapshotInterval: 100,
  maxSnapshots: 50,
  invariantChecks: true,
  transitionValidation: true,
  concurrencyTesting: true,
  performanceMonitoring: true
});

// Common test scenarios
export const CommonStateScenarios = {
  /**
   * Basic state management test scenarios
   */
  basic: <T>(store: StateStore<T>, initialState: T): StateTestScenario<T>[] => [
    {
      name: 'Initial State',
      description: 'Test that store has correct initial state',
      type: 'unit',
      store,
      initialState,
      actions: [],
      assertions: [
        {
          name: 'Initial state should match expected',
          type: 'state',
          check: (store) => {
            const state = store.getState();
            return JSON.stringify(state) === JSON.stringify(initialState);
          },
          expected: initialState,
          message: 'Initial state should match the provided initial state'
        }
      ]
    },
    {
      name: 'State Update',
      description: 'Test basic state update functionality',
      type: 'unit',
      store,
      initialState,
      actions: [
        {
          name: 'Update state',
          type: 'sync',
          execute: (store) => {
            store.setState({ ...store.getState(), updated: true } as any);
          }
        }
      ],
      assertions: [
        {
          name: 'State should be updated',
          type: 'state',
          check: (store) => {
            const state = store.getState() as any;
            return state.updated === true;
          },
          message: 'State should reflect the update'
        }
      ]
    }
  ],

  /**
   * Performance test scenarios
   */
  performance: <T>(store: StateStore<T>, initialState: T, updateCount: number = 1000): StateTestScenario<T>[] => [
    {
      name: 'Bulk Updates Performance',
      description: `Test performance of ${updateCount} state updates`,
      type: 'performance',
      store,
      initialState,
      actions: Array.from({ length: updateCount }, (_, i) => ({
        name: `Update ${i + 1}`,
        type: 'sync' as const,
        execute: (store: StateStore<T>) => {
          store.setState({ ...store.getState(), counter: i + 1 } as any);
        }
      })),
      assertions: [
        {
          name: 'Average update time should be reasonable',
          type: 'performance',
          check: (store, context) => {
            return context.performanceMetrics.averageUpdateTime < 1;
          },
          message: 'Average update time should be less than 1ms'
        }
      ]
    }
  ],

  /**
   * Concurrency test scenarios
   */
  concurrency: <T>(store: StateStore<T>, initialState: T): StateTestScenario<T>[] => [
    {
      name: 'Concurrent Updates',
      description: 'Test concurrent state updates',
      type: 'concurrency',
      store,
      initialState,
      actions: [
        {
          name: 'Concurrent update 1',
          type: 'async',
          concurrent: true,
          execute: async (store) => {
            await new Promise(resolve => setTimeout(resolve, 10));
            store.setState({ ...store.getState(), value1: 'updated1' } as any);
          }
        },
        {
          name: 'Concurrent update 2',
          type: 'async',
          concurrent: true,
          execute: async (store) => {
            await new Promise(resolve => setTimeout(resolve, 15));
            store.setState({ ...store.getState(), value2: 'updated2' } as any);
          }
        }
      ],
      assertions: [
        {
          name: 'Both updates should be applied',
          type: 'consistency',
          check: (store) => {
            const state = store.getState() as any;
            return state.value1 === 'updated1' && state.value2 === 'updated2';
          },
          message: 'Both concurrent updates should be present in final state'
        }
      ]
    }
  ],

  /**
   * Persistence test scenarios
   */
  persistence: <T>(store: StateStore<T>, initialState: T): StateTestScenario<T>[] => [
    {
      name: 'State Persistence',
      description: 'Test state persistence functionality',
      type: 'persistence',
      store,
      initialState,
      actions: [
        {
          name: 'Update state for persistence',
          type: 'sync',
          execute: (store) => {
            store.setState({ ...store.getState(), persisted: true } as any);
          }
        }
      ],
      assertions: [
        {
          name: 'State should be persisted',
          type: 'persistence',
          check: (store, context) => {
            return context.persistenceData && Object.keys(context.persistenceData).length > 0;
          },
          message: 'State should be persisted'
        }
      ]
    }
  ]
};

// Test utilities
export const StateTestUtils = {
  /**
   * Create a mock store for testing
   */
  createMockStore: <T>(initialState: T): StateStore<T> => {
    let state = initialState;
    const listeners: Array<(state: T, prevState: T) => void> = [];

    return {
      getState: () => state,
      setState: (partial: Partial<T> | ((state: T) => Partial<T>)) => {
        const prevState = state;
        if (typeof partial === 'function') {
          const result = partial(state);
          state = { ...state, ...result };
        } else {
          state = { ...state, ...partial };
        }
        listeners.forEach(listener => listener(state, prevState));
      },
      subscribe: (listener: (state: T, prevState: T) => void) => {
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
      }
    };
  },

  /**
   * Create test data for different scenarios
   */
  createTestData: (scenario: 'simple' | 'complex' | 'nested' | 'array'): any => {
    switch (scenario) {
      case 'simple':
        return {
          id: 1,
          name: 'Test',
          active: true,
          count: 0
        };
      case 'complex':
        return {
          user: {
            id: 1,
            name: 'John Doe',
            email: 'john@example.com',
            preferences: {
              theme: 'dark',
              notifications: true
            }
          },
          data: {
            items: [],
            loading: false,
            error: null
          },
          ui: {
            sidebarOpen: false,
            modalVisible: false
          }
        };
      case 'nested':
        return {
          level1: {
            level2: {
              level3: {
                value: 'deep'
              }
            }
          }
        };
      case 'array':
        return {
          items: [
            { id: 1, name: 'Item 1' },
            { id: 2, name: 'Item 2' },
            { id: 3, name: 'Item 3' }
          ],
          selectedIds: [1, 3]
        };
      default:
        return {};
    }
  },

  /**
   * Generate stress test operations
   */
  generateStressOperations: <T>(
    store: StateStore<T>, 
    count: number
  ): Array<() => void> => {
    return Array.from({ length: count }, (_, i) => () => {
      store.setState({ 
        ...store.getState(), 
        stressCounter: i + 1,
        timestamp: Date.now()
      } as any);
    });
  },

  /**
   * Measure operation performance
   */
  measurePerformance: async <T>(
    operation: () => Promise<T> | T,
    iterations: number = 100
  ): Promise<{
    averageTime: number;
    minTime: number;
    maxTime: number;
    totalTime: number;
  }> => {
    const times: number[] = [];

    for (let i = 0; i < iterations; i++) {
      const startTime = performance.now();
      await operation();
      const endTime = performance.now();
      times.push(endTime - startTime);
    }

    const totalTime = times.reduce((sum, time) => sum + time, 0);
    const averageTime = totalTime / iterations;
    const minTime = Math.min(...times);
    const maxTime = Math.max(...times);

    return {
      averageTime,
      minTime,
      maxTime,
      totalTime
    };
  }
};

// Export default configuration
export default {
  StateTestFramework,
  ZustandTestUtils,
  StateConsistencyTester,
  createStateTestFramework,
  createConsistencyTester,
  createDefaultStateTestConfig,
  createDefaultConsistencyConfig,
  CommonStateScenarios,
  StateTestUtils
};