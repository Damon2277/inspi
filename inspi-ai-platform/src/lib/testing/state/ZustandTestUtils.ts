/**
 * Zustand Test Utilities
 *
 * Specialized utilities for testing Zustand stores including
 * store creation, state manipulation, and assertion helpers.
 */
import { create } from 'zustand';
import { subscribeWithSelector, persist } from 'zustand/middleware';

import { StateStore, StateTestScenario, StateAction, StateAssertion } from './StateTestFramework';

export interface ZustandStore<T> extends StateStore<T> {
  getState: () => T;
  setState: (partial: Partial<T> | ((state: T) => Partial<T>), replace?: boolean) => void;
  subscribe: (listener: (state: T, prevState: T) => void) => () => void;
  destroy: () => void;
}

export interface ZustandStoreConfig<T> {
  name?: string;
  initialState: T;
  actions?: ZustandActions<T>;
  middleware?: ZustandMiddleware[];
  devtools?: boolean;
  persist?: ZustandPersistConfig;
}

export interface ZustandActions<T> {
  [key: string]: (state: T, ...args: any[]) => Partial<T> | void;
}

export interface ZustandMiddleware {
  type: 'subscribeWithSelector' | 'persist' | 'devtools' | 'immer' | 'custom';
  config?: any;
  middleware?: any;
}

export interface ZustandPersistConfig {
  name: string;
  storage?: 'localStorage' | 'sessionStorage' | 'custom';
  partialize?: (state: any) => any;
  onRehydrateStorage?: () => void;
}

export interface ZustandTestBuilder<T> {
  withInitialState(state: T): ZustandTestBuilder<T>;
  withActions(actions: ZustandActions<T>): ZustandTestBuilder<T>;
  withMiddleware(middleware: ZustandMiddleware[]): ZustandTestBuilder<T>;
  withPersistence(config: ZustandPersistConfig): ZustandTestBuilder<T>;
  build(): ZustandStore<T>;
}

export interface ZustandStateSnapshot<T> {
  timestamp: Date;
  state: T;
  action?: string;
  args?: any[];
}

export interface ZustandTestSuite<T> {
  name: string;
  description: string;
  store: ZustandStore<T>;
  scenarios: StateTestScenario<T>[];
  setup?: () => Promise<void>;
  teardown?: () => Promise<void>;
}

export class ZustandTestUtils {
  /**
   * Create a test store with the given configuration
   */
  static createTestStore<T>(config: ZustandStoreConfig<T>): ZustandStore<T> {
    const { initialState, actions = {}, middleware = [], persist: persistConfig } = config;

    // Build the store creator function
    const storeCreator = (set: any, get: any) => ({
      ...initialState,
      ...this.createActionMethods(actions, set, get),
    });

    // Apply middleware
    let enhancedCreator = storeCreator;

    for (const mw of middleware) {
      switch (mw.type) {
        case 'subscribeWithSelector':
          enhancedCreator = subscribeWithSelector(enhancedCreator);
          break;
        case 'persist':
          if (persistConfig) {
            enhancedCreator = persist(enhancedCreator, {
              name: persistConfig.name,
              storage: this.getStorage(persistConfig.storage),
              partialize: persistConfig.partialize,
              onRehydrateStorage: persistConfig.onRehydrateStorage,
            });
          }
          break;
        case 'custom':
          if (mw.middleware) {
            enhancedCreator = mw.middleware(enhancedCreator, mw.config);
          }
          break;
      }
    }

    return create<T>(enhancedCreator as any);
  }

  /**
   * Create action methods for the store
   */
  private static createActionMethods<T>(
    actions: ZustandActions<T>,
    set: any,
    get: any,
  ): Record<string, (...args: any[]) => void> {
    const actionMethods: Record<string, (...args: any[]) => void> = {};

    Object.entries(actions).forEach(([name, action]) => {
      actionMethods[name] = (...args: any[]) => {
        const result = action(get(), ...args);
        if (result) {
          set(result);
        }
      };
    });

    return actionMethods;
  }

  /**
   * Get storage implementation
   */
  private static getStorage(storageType?: string) {
    switch (storageType) {
      case 'sessionStorage':
        return typeof window !== 'undefined' ? sessionStorage : undefined;
      case 'localStorage':
      default:
        return typeof window !== 'undefined' ? localStorage : undefined;
    }
  }

  /**
   * Create a test builder for fluent store creation
   */
  static builder<T>(): ZustandTestBuilder<T> {
    return new ZustandTestBuilderImpl<T>();
  }

  /**
   * Create common test scenarios for Zustand stores
   */
  static createCommonScenarios<T>(store: ZustandStore<T>, initialState: T): StateTestScenario<T>[] {
    return [
      // Basic state update scenario
      {
        name: 'Basic State Update',
        description: 'Test basic state updates work correctly',
        type: 'unit',
        store,
        initialState,
        actions: [
          {
            name: 'Update state',
            type: 'sync',
            execute: (store) => {
              store.setState({ ...store.getState(), updated: true } as any);
            },
          },
        ],
        assertions: [
          {
            name: 'State should be updated',
            type: 'state',
            check: (store) => {
              const state = store.getState() as any;
              return state.updated === true;
            },
            message: 'State should have updated property set to true',
          },
        ],
      },

      // Subscription scenario
      {
        name: 'Subscription Notifications',
        description: 'Test that subscriptions are notified of state changes',
        type: 'unit',
        store,
        initialState,
        actions: [
          {
            name: 'Trigger state change',
            type: 'sync',
            execute: (store) => {
              store.setState({ ...store.getState(), counter: 1 } as any);
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
            message: 'Subscription should be called when state changes',
          },
        ],
      },

      // Multiple updates scenario
      {
        name: 'Multiple State Updates',
        description: 'Test multiple consecutive state updates',
        type: 'unit',
        store,
        initialState,
        actions: [
          {
            name: 'First update',
            type: 'sync',
            execute: (store) => {
              store.setState({ ...store.getState(), step: 1 } as any);
            },
          },
          {
            name: 'Second update',
            type: 'sync',
            execute: (store) => {
              store.setState({ ...store.getState(), step: 2 } as any);
            },
          },
          {
            name: 'Third update',
            type: 'sync',
            execute: (store) => {
              store.setState({ ...store.getState(), step: 3 } as any);
            },
          },
        ],
        assertions: [
          {
            name: 'Final state should be correct',
            type: 'state',
            check: (store) => {
              const state = store.getState() as any;
              return state.step === 3;
            },
            message: 'Final state should have step = 3',
          },
          {
            name: 'Should have 3 subscription calls',
            type: 'subscription',
            check: (store, context) => {
              return context.subscriptionCalls.length === 3;
            },
            message: 'Should have exactly 3 subscription calls',
          },
        ],
      },
    ];
  }

  /**
   * Create performance test scenarios
   */
  static createPerformanceScenarios<T>(
    store: ZustandStore<T>,
    initialState: T,
    updateCount: number = 1000,
  ): StateTestScenario<T>[] {
    return [
      {
        name: 'Bulk State Updates Performance',
        description: `Test performance of ${updateCount} state updates`,
        type: 'performance',
        store,
        initialState,
        actions: Array.from({ length: updateCount }, (_, i) => ({
          name: `Update ${i + 1}`,
          type: 'sync' as const,
          execute: (store: StateStore<T>) => {
            store.setState({ ...store.getState(), counter: i + 1 } as any);
          },
        })),
        assertions: [
          {
            name: 'Average update time should be reasonable',
            type: 'performance',
            check: (store, context) => {
              return context.performanceMetrics.averageUpdateTime < 1; // Less than 1ms per update
            },
            message: 'Average update time should be less than 1ms',
          },
          {
            name: 'Memory usage should be reasonable',
            type: 'performance',
            check: (store, context) => {
              return context.performanceMetrics.peakMemoryUsage < 100; // Less than 100MB
            },
            message: 'Peak memory usage should be less than 100MB',
          },
        ],
      },
    ];
  }

  /**
   * Create concurrency test scenarios
   */
  static createConcurrencyScenarios<T>(
    store: ZustandStore<T>,
    initialState: T,
  ): StateTestScenario<T>[] {
    return [
      {
        name: 'Concurrent State Updates',
        description: 'Test concurrent state updates maintain consistency',
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
            },
          },
          {
            name: 'Concurrent update 2',
            type: 'async',
            concurrent: true,
            execute: async (store) => {
              await new Promise(resolve => setTimeout(resolve, 15));
              store.setState({ ...store.getState(), value2: 'updated2' } as any);
            },
          },
          {
            name: 'Concurrent update 3',
            type: 'async',
            concurrent: true,
            execute: async (store) => {
              await new Promise(resolve => setTimeout(resolve, 5));
              store.setState({ ...store.getState(), value3: 'updated3' } as any);
            },
          },
        ],
        assertions: [
          {
            name: 'All concurrent updates should be applied',
            type: 'consistency',
            check: (store) => {
              const state = store.getState() as any;
              return state.value1 === 'updated1' &&
                     state.value2 === 'updated2' &&
                     state.value3 === 'updated3';
            },
            message: 'All concurrent updates should be present in final state',
          },
        ],
      },
    ];
  }

  /**
   * Create persistence test scenarios
   */
  static createPersistenceScenarios<T>(
    store: ZustandStore<T>,
    initialState: T,
    persistKey: string,
  ): StateTestScenario<T>[] {
    return [
      {
        name: 'State Persistence',
        description: 'Test that state is persisted and restored correctly',
        type: 'persistence',
        store,
        initialState,
        actions: [
          {
            name: 'Update state for persistence',
            type: 'sync',
            execute: (store) => {
              store.setState({ ...store.getState(), persisted: true } as any);
            },
          },
          {
            name: 'Wait for persistence',
            type: 'async',
            execute: async () => {
              await new Promise(resolve => setTimeout(resolve, 100));
            },
          },
        ],
        assertions: [
          {
            name: 'State should be persisted',
            type: 'persistence',
            check: async (store, context) => {
              // Check if state is saved to storage
              const persistedData = context.persistenceData?.[persistKey];
              return persistedData && persistedData.persisted === true;
            },
            message: 'State should be persisted to storage',
          },
        ],
      },
    ];
  }

  /**
   * Create action-based test scenarios
   */
  static createActionScenarios<T>(
    store: ZustandStore<T> & Record<string, any>,
    initialState: T,
    actions: string[],
  ): StateTestScenario<T>[] {
    return actions.map(actionName => ({
      name: `Action: ${actionName}`,
      description: `Test ${actionName} action works correctly`,
      type: 'unit',
      store,
      initialState,
      actions: [
        {
          name: `Execute ${actionName}`,
          type: 'sync',
          execute: (store) => {
            const storeWithActions = store as any;
            if (typeof storeWithActions[actionName] === 'function') {
              storeWithActions[actionName]();
            }
          },
        },
      ],
      assertions: [
        {
          name: `${actionName} should modify state`,
          type: 'state',
          check: (store, context) => {
            // Check if state changed from initial state
            const currentState = store.getState();
            return JSON.stringify(currentState) !== JSON.stringify(context.initialState);
          },
          message: `${actionName} should modify the state`,
        },
      ],
    }));
  }

  /**
   * Create selector test scenarios
   */
  static createSelectorScenarios<T, R>(
    store: ZustandStore<T>,
    initialState: T,
    selector: (state: T) => R,
    expectedValue: R,
  ): StateTestScenario<T>[] {
    return [
      {
        name: 'Selector Test',
        description: 'Test that selector returns expected value',
        type: 'unit',
        store,
        initialState,
        actions: [],
        assertions: [
          {
            name: 'Selector should return expected value',
            type: 'state',
            check: (store) => {
              const state = store.getState();
              const result = selector(state);
              return JSON.stringify(result) === JSON.stringify(expectedValue);
            },
            expected: expectedValue,
            message: 'Selector should return the expected value',
          },
        ],
      },
    ];
  }

  /**
   * Create middleware test scenarios
   */
  static createMiddlewareScenarios<T>(
    store: ZustandStore<T>,
    initialState: T,
    middlewareType: string,
  ): StateTestScenario<T>[] {
    const scenarios: StateTestScenario<T>[] = [];

    switch (middlewareType) {
      case 'subscribeWithSelector':
        scenarios.push({
          name: 'Subscribe with Selector Middleware',
          description: 'Test subscribeWithSelector middleware functionality',
          type: 'integration',
          store,
          initialState,
          actions: [
            {
              name: 'Update specific property',
              type: 'sync',
              execute: (store) => {
                store.setState({ ...store.getState(), specificProp: 'updated' } as any);
              },
            },
          ],
          assertions: [
            {
              name: 'Selective subscription should work',
              type: 'subscription',
              check: (store, context) => {
                // This would need actual selector subscription testing
                return context.subscriptionCalls.length > 0;
              },
              message: 'Selective subscription should be triggered',
            },
          ],
        });
        break;

      case 'persist':
        scenarios.push({
          name: 'Persist Middleware',
          description: 'Test persist middleware functionality',
          type: 'persistence',
          store,
          initialState,
          actions: [
            {
              name: 'Update state for persistence',
              type: 'sync',
              execute: (store) => {
                store.setState({ ...store.getState(), persistTest: true } as any);
              },
            },
          ],
          assertions: [
            {
              name: 'State should be persisted',
              type: 'persistence',
              check: (store, context) => {
                return context.persistenceData && Object.keys(context.persistenceData).length > 0;
              },
              message: 'State should be persisted by middleware',
            },
          ],
        });
        break;
    }

    return scenarios;
  }

  /**
   * Create stress test scenarios
   */
  static createStressTestScenarios<T>(
    store: ZustandStore<T>,
    initialState: T,
    config: { updateCount: number; concurrentSubscribers: number },
  ): StateTestScenario<T>[] {
    return [
      {
        name: 'Stress Test - High Frequency Updates',
        description: `Stress test with ${config.updateCount} updates and ${config.concurrentSubscribers} subscribers`,
        type: 'performance',
        store,
        initialState,
        actions: Array.from({ length: config.updateCount }, (_, i) => ({
          name: `Stress update ${i + 1}`,
          type: 'sync' as const,
          execute: (store: StateStore<T>) => {
            store.setState({
              ...store.getState(),
              stressCounter: i + 1,
              timestamp: Date.now(),
            } as any);
          },
        })),
        assertions: [
          {
            name: 'Should handle high frequency updates',
            type: 'performance',
            check: (store, context) => {
              return context.performanceMetrics.averageUpdateTime < 5; // Less than 5ms average
            },
            message: 'Should handle high frequency updates efficiently',
          },
          {
            name: 'Should maintain state consistency',
            type: 'consistency',
            check: (store) => {
              const state = store.getState() as any;
              return state.stressCounter === config.updateCount;
            },
            message: 'Should maintain state consistency under stress',
          },
        ],
      },
    ];
  }

  /**
   * Utility to spy on store methods
   */
  static spyOnStore<T>(store: ZustandStore<T>): {
    getStateSpy: jest.SpyInstance;
    setStateSpy: jest.SpyInstance;
    subscribeSpy: jest.SpyInstance;
    restore: () => void;
  } {
    const getStateSpy = jest.spyOn(store, 'getState');
    const setStateSpy = jest.spyOn(store, 'setState');
    const subscribeSpy = jest.spyOn(store, 'subscribe');

    return {
      getStateSpy,
      setStateSpy,
      subscribeSpy,
      restore: () => {
        getStateSpy.mockRestore();
        setStateSpy.mockRestore();
        subscribeSpy.mockRestore();
      },
    };
  }

  /**
   * Utility to create mock storage for testing
   */
  static createMockStorage(): Storage {
    const storage: Record<string, string> = {};

    return {
      getItem: (key: string) => storage[key] || null,
      setItem: (key: string, value: string) => {
        storage[key] = value;
      },
      removeItem: (key: string) => {
        delete storage[key];
      },
      clear: () => {
        Object.keys(storage).forEach(key => delete storage[key]);
      },
      key: (index: number) => Object.keys(storage)[index] || null,
      get length() {
        return Object.keys(storage).length;
      },
    };
  }
}

/**
 * Implementation of ZustandTestBuilder
 */
class ZustandTestBuilderImpl<T> implements ZustandTestBuilder<T> {
  private config: Partial<ZustandStoreConfig<T>> = {};

  withInitialState(state: T): ZustandTestBuilder<T> {
    this.config.initialState = state;
    return this;
  }

  withActions(actions: ZustandActions<T>): ZustandTestBuilder<T> {
    this.config.actions = actions;
    return this;
  }

  withMiddleware(middleware: ZustandMiddleware[]): ZustandTestBuilder<T> {
    this.config.middleware = middleware;
    return this;
  }

  withPersistence(persistConfig: ZustandPersistConfig): ZustandTestBuilder<T> {
    this.config.persist = persistConfig;
    return this;
  }

  build(): ZustandStore<T> {
    if (!this.config.initialState) {
      throw new Error('Initial state is required');
    }

    return ZustandTestUtils.createTestStore(this.config as ZustandStoreConfig<T>);
  }
}

/**
 * Zustand-specific assertions
 */
export class ZustandAssertions {
  /**
   * Assert that store state equals expected value
   */
  static stateEquals<T>(store: ZustandStore<T>, expected: T): boolean {
    const actual = store.getState();
    return JSON.stringify(actual) === JSON.stringify(expected);
  }

  /**
   * Assert that store state contains expected properties
   */
  static stateContains<T>(store: ZustandStore<T>, expected: Partial<T>): boolean {
    const actual = store.getState();
    return Object.entries(expected).every(([key, value]) => {
      return (actual as any)[key] === value;
    });
  }

  /**
   * Assert that subscription was called
   */
  static subscriptionCalled(subscriptionCalls: any[]): boolean {
    return subscriptionCalls.length > 0;
  }

  /**
   * Assert that subscription was called specific number of times
   */
  static subscriptionCalledTimes(subscriptionCalls: any[], expectedTimes: number): boolean {
    return subscriptionCalls.length === expectedTimes;
  }

  /**
   * Assert that state update performance is within threshold
   */
  static performanceWithinThreshold(metrics: any, maxTime: number): boolean {
    return metrics.averageUpdateTime <= maxTime;
  }
}
