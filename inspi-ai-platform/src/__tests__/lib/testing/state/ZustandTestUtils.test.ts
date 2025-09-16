/**
 * Zustand Test Utils Tests
 * 
 * Tests for Zustand-specific testing utilities including
 * store creation, test scenarios, and assertions.
 */
import { create } from 'zustand';
import {
  ZustandTestUtils,
  ZustandAssertions,
  type ZustandStore,
  type ZustandStoreConfig
} from '../../../../lib/testing/state';

// Mock zustand since we're in a test environment
jest.mock('zustand', () => ({
  create: jest.fn()
}));

describe('ZustandTestUtils', () => {
  let mockStore: ZustandStore<any>;

  beforeEach(() => {
    // Create a mock store implementation
    let state = { count: 0, name: 'test' };
    const listeners: Array<(state: any, prevState: any) => void> = [];

    mockStore = {
      getState: () => state,
      setState: (partial: any, replace?: boolean) => {
        const prevState = state;
        if (typeof partial === 'function') {
          const result = partial(state);
          state = replace ? result : { ...state, ...result };
        } else {
          state = replace ? partial : { ...state, ...partial };
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
      }
    };

    // Mock the create function to return our mock store
    (create as jest.Mock).mockReturnValue(mockStore);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Store Creation', () => {
    it('should create a test store with initial state', () => {
      const config: ZustandStoreConfig<any> = {
        initialState: { count: 0, name: 'test' }
      };

      const store = ZustandTestUtils.createTestStore(config);

      expect(store).toBeDefined();
      expect(store.getState).toBeDefined();
      expect(store.setState).toBeDefined();
      expect(store.subscribe).toBeDefined();
    });

    it('should create a store with actions', () => {
      const config: ZustandStoreConfig<any> = {
        initialState: { count: 0 },
        actions: {
          increment: (state) => ({ count: state.count + 1 }),
          decrement: (state) => ({ count: state.count - 1 }),
          reset: () => ({ count: 0 })
        }
      };

      const store = ZustandTestUtils.createTestStore(config);

      expect(store).toBeDefined();
      expect(create).toHaveBeenCalled();
    });

    it('should create a store with middleware', () => {
      const config: ZustandStoreConfig<any> = {
        initialState: { count: 0 },
        middleware: [
          { type: 'subscribeWithSelector' },
          { type: 'persist', config: { name: 'test-store' } }
        ]
      };

      const store = ZustandTestUtils.createTestStore(config);

      expect(store).toBeDefined();
      expect(create).toHaveBeenCalled();
    });
  });

  describe('Test Builder', () => {
    it('should build store with fluent interface', () => {
      const store = ZustandTestUtils.builder<{ count: number }>()
        .withInitialState({ count: 0 })
        .withActions({
          increment: (state) => ({ count: state.count + 1 })
        })
        .build();

      expect(store).toBeDefined();
    });

    it('should throw error if initial state is missing', () => {
      expect(() => {
        ZustandTestUtils.builder<{ count: number }>()
          .withActions({
            increment: (state) => ({ count: state.count + 1 })
          })
          .build();
      }).toThrow('Initial state is required');
    });
  });

  describe('Common Test Scenarios', () => {
    it('should create basic test scenarios', () => {
      const initialState = { count: 0, name: 'test' };
      const scenarios = ZustandTestUtils.createCommonScenarios(mockStore, initialState);

      expect(scenarios).toHaveLength(3);
      expect(scenarios[0].name).toBe('Basic State Update');
      expect(scenarios[1].name).toBe('Subscription Notifications');
      expect(scenarios[2].name).toBe('Multiple State Updates');
    });

    it('should create performance test scenarios', () => {
      const initialState = { counter: 0 };
      const scenarios = ZustandTestUtils.createPerformanceScenarios(mockStore, initialState, 500);

      expect(scenarios).toHaveLength(1);
      expect(scenarios[0].name).toBe('Bulk State Updates Performance');
      expect(scenarios[0].actions).toHaveLength(500);
    });

    it('should create concurrency test scenarios', () => {
      const initialState = { value1: null, value2: null };
      const scenarios = ZustandTestUtils.createConcurrencyScenarios(mockStore, initialState);

      expect(scenarios).toHaveLength(1);
      expect(scenarios[0].name).toBe('Concurrent State Updates');
      expect(scenarios[0].actions.some(action => action.concurrent)).toBe(true);
    });

    it('should create persistence test scenarios', () => {
      const initialState = { data: null };
      const scenarios = ZustandTestUtils.createPersistenceScenarios(mockStore, initialState, 'test-key');

      expect(scenarios).toHaveLength(1);
      expect(scenarios[0].name).toBe('State Persistence');
      expect(scenarios[0].type).toBe('persistence');
    });
  });

  describe('Action-based Scenarios', () => {
    it('should create action-based test scenarios', () => {
      const storeWithActions = {
        ...mockStore,
        increment: jest.fn(),
        decrement: jest.fn(),
        reset: jest.fn()
      };

      const initialState = { count: 0 };
      const actions = ['increment', 'decrement', 'reset'];
      const scenarios = ZustandTestUtils.createActionScenarios(storeWithActions, initialState, actions);

      expect(scenarios).toHaveLength(3);
      expect(scenarios[0].name).toBe('Action: increment');
      expect(scenarios[1].name).toBe('Action: decrement');
      expect(scenarios[2].name).toBe('Action: reset');
    });
  });

  describe('Selector Scenarios', () => {
    it('should create selector test scenarios', () => {
      const initialState = { user: { name: 'John', age: 30 } };
      const selector = (state: any) => state.user.name;
      const expectedValue = 'John';

      const scenarios = ZustandTestUtils.createSelectorScenarios(
        mockStore, 
        initialState, 
        selector, 
        expectedValue
      );

      expect(scenarios).toHaveLength(1);
      expect(scenarios[0].name).toBe('Selector Test');
    });
  });

  describe('Middleware Scenarios', () => {
    it('should create subscribeWithSelector middleware scenarios', () => {
      const initialState = { specificProp: 'initial' };
      const scenarios = ZustandTestUtils.createMiddlewareScenarios(
        mockStore, 
        initialState, 
        'subscribeWithSelector'
      );

      expect(scenarios).toHaveLength(1);
      expect(scenarios[0].name).toBe('Subscribe with Selector Middleware');
    });

    it('should create persist middleware scenarios', () => {
      const initialState = { persistTest: false };
      const scenarios = ZustandTestUtils.createMiddlewareScenarios(
        mockStore, 
        initialState, 
        'persist'
      );

      expect(scenarios).toHaveLength(1);
      expect(scenarios[0].name).toBe('Persist Middleware');
    });
  });

  describe('Stress Test Scenarios', () => {
    it('should create stress test scenarios', () => {
      const initialState = { counter: 0 };
      const config = { updateCount: 1000, concurrentSubscribers: 5 };
      const scenarios = ZustandTestUtils.createStressTestScenarios(mockStore, initialState, config);

      expect(scenarios).toHaveLength(1);
      expect(scenarios[0].name).toBe('Stress Test - High Frequency Updates');
      expect(scenarios[0].actions).toHaveLength(1000);
    });
  });

  describe('Store Spying', () => {
    it('should create spies for store methods', () => {
      const spies = ZustandTestUtils.spyOnStore(mockStore);

      expect(spies.getStateSpy).toBeDefined();
      expect(spies.setStateSpy).toBeDefined();
      expect(spies.subscribeSpy).toBeDefined();
      expect(spies.restore).toBeDefined();

      // Test that spies work
      mockStore.getState();
      mockStore.setState({ count: 1 });

      expect(spies.getStateSpy).toHaveBeenCalled();
      expect(spies.setStateSpy).toHaveBeenCalledWith({ count: 1 });

      // Cleanup
      spies.restore();
    });
  });

  describe('Mock Storage', () => {
    it('should create mock storage', () => {
      const storage = ZustandTestUtils.createMockStorage();

      expect(storage.getItem).toBeDefined();
      expect(storage.setItem).toBeDefined();
      expect(storage.removeItem).toBeDefined();
      expect(storage.clear).toBeDefined();

      // Test storage functionality
      storage.setItem('test', 'value');
      expect(storage.getItem('test')).toBe('value');
      expect(storage.length).toBe(1);

      storage.removeItem('test');
      expect(storage.getItem('test')).toBeNull();
      expect(storage.length).toBe(0);
    });

    it('should handle storage operations correctly', () => {
      const storage = ZustandTestUtils.createMockStorage();

      // Test multiple items
      storage.setItem('key1', 'value1');
      storage.setItem('key2', 'value2');
      storage.setItem('key3', 'value3');

      expect(storage.length).toBe(3);
      expect(storage.key(0)).toBe('key1');
      expect(storage.key(1)).toBe('key2');
      expect(storage.key(2)).toBe('key3');

      // Test clear
      storage.clear();
      expect(storage.length).toBe(0);
      expect(storage.getItem('key1')).toBeNull();
    });
  });
});

describe('ZustandAssertions', () => {
  let mockStore: ZustandStore<any>;

  beforeEach(() => {
    let state = { count: 0, name: 'test', active: true };
    
    mockStore = {
      getState: () => state,
      setState: (partial: any) => {
        state = { ...state, ...partial };
      },
      subscribe: () => () => {},
      destroy: () => {}
    };
  });

  describe('State Assertions', () => {
    it('should assert state equals', () => {
      const expected = { count: 0, name: 'test', active: true };
      const result = ZustandAssertions.stateEquals(mockStore, expected);
      expect(result).toBe(true);

      const different = { count: 1, name: 'test', active: true };
      const result2 = ZustandAssertions.stateEquals(mockStore, different);
      expect(result2).toBe(false);
    });

    it('should assert state contains', () => {
      const partial = { count: 0, name: 'test' };
      const result = ZustandAssertions.stateContains(mockStore, partial);
      expect(result).toBe(true);

      const wrongPartial = { count: 1, name: 'wrong' };
      const result2 = ZustandAssertions.stateContains(mockStore, wrongPartial);
      expect(result2).toBe(false);
    });
  });

  describe('Subscription Assertions', () => {
    it('should assert subscription was called', () => {
      const subscriptionCalls = [{ state: {}, prevState: {}, timestamp: new Date() }];
      const result = ZustandAssertions.subscriptionCalled(subscriptionCalls);
      expect(result).toBe(true);

      const emptyCalls: any[] = [];
      const result2 = ZustandAssertions.subscriptionCalled(emptyCalls);
      expect(result2).toBe(false);
    });

    it('should assert subscription was called specific times', () => {
      const subscriptionCalls = [
        { state: {}, prevState: {}, timestamp: new Date() },
        { state: {}, prevState: {}, timestamp: new Date() },
        { state: {}, prevState: {}, timestamp: new Date() }
      ];

      const result = ZustandAssertions.subscriptionCalledTimes(subscriptionCalls, 3);
      expect(result).toBe(true);

      const result2 = ZustandAssertions.subscriptionCalledTimes(subscriptionCalls, 2);
      expect(result2).toBe(false);
    });
  });

  describe('Performance Assertions', () => {
    it('should assert performance within threshold', () => {
      const metrics = { averageUpdateTime: 5 };
      const result = ZustandAssertions.performanceWithinThreshold(metrics, 10);
      expect(result).toBe(true);

      const result2 = ZustandAssertions.performanceWithinThreshold(metrics, 3);
      expect(result2).toBe(false);
    });
  });
});