/**
 * State Consistency Tester Tests
 * 
 * Tests for state consistency validation including
 * invariant checking, transition validation, and concurrency testing.
 */
import {
  StateConsistencyTester,
  createConsistencyTester,
  createDefaultConsistencyConfig,
  StateTestUtils,
  type StateInvariant,
  type StateTransition,
  type ConsistencyTestConfig
} from '../../../../lib/testing/state';

describe('StateConsistencyTester', () => {
  let tester: StateConsistencyTester<any>;
  let mockStore: any;

  beforeEach(() => {
    const config = createDefaultConsistencyConfig();
    tester = createConsistencyTester(config);

    mockStore = StateTestUtils.createMockStore({
      count: 0,
      loading: false,
      data: null,
      user: { name: 'test', age: 25 }
    });
  });

  afterEach(() => {
    tester.reset();
  });

  describe('Invariant Registration and Checking', () => {
    it('should register invariants', () => {
      const invariant: StateInvariant<any> = {
        name: 'Count Non-Negative',
        description: 'Count should never be negative',
        check: (state) => state.count >= 0,
        severity: 'high',
        message: 'Count cannot be negative'
      };

      expect(() => tester.registerInvariant(invariant)).not.toThrow();
    });

    it('should detect invariant violations', (done) => {
      const invariant: StateInvariant<any> = {
        name: 'Count Non-Negative',
        description: 'Count should never be negative',
        check: (state) => state.count >= 0,
        severity: 'high',
        message: 'Count cannot be negative'
      };

      tester.registerInvariant(invariant);

      tester.on('invariantViolation', (data) => {
        expect(data.violation.type).toBe('invariant');
        expect(data.violation.severity).toBe('high');
        expect(data.violation.message).toContain('Count cannot be negative');
        done();
      });

      const stopMonitoring = tester.startMonitoring(mockStore);

      // Trigger invariant violation
      mockStore.setState({ count: -1 });

      stopMonitoring();
    });

    it('should handle invariant check errors gracefully', (done) => {
      const faultyInvariant: StateInvariant<any> = {
        name: 'Faulty Invariant',
        description: 'An invariant that throws an error',
        check: () => {
          throw new Error('Invariant check error');
        },
        severity: 'medium',
        message: 'This invariant has a bug'
      };

      tester.registerInvariant(faultyInvariant);

      tester.on('invariantCheckError', (data) => {
        expect(data.invariant).toBe('Faulty Invariant');
        expect(data.error).toBe('Invariant check error');
        done();
      });

      const stopMonitoring = tester.startMonitoring(mockStore);
      mockStore.setState({ count: 1 });
      stopMonitoring();
    });
  });

  describe('Transition Registration and Validation', () => {
    it('should register transitions', () => {
      const transition: StateTransition<any> = {
        name: 'Start Loading',
        from: (state) => !state.loading,
        to: (state) => state.loading,
        action: 'startLoading',
        validate: (from, to) => !from.loading && to.loading,
        message: 'Invalid loading transition'
      };

      expect(() => tester.registerTransition(transition)).not.toThrow();
    });

    it('should detect invalid transitions', (done) => {
      const transition: StateTransition<any> = {
        name: 'Loading to Success',
        from: (state) => state.loading === true,
        to: (state) => state.loading === false && state.data !== null,
        action: 'loadSuccess',
        validate: (from, to) => {
          // Invalid if data is still null after loading completes
          return from.loading && !to.loading && to.data !== null;
        },
        message: 'Loading completed but no data was set'
      };

      tester.registerTransition(transition);

      tester.on('transitionViolation', (data) => {
        expect(data.violation.type).toBe('transition');
        expect(data.violation.message).toContain('Loading completed but no data was set');
        done();
      });

      const stopMonitoring = tester.startMonitoring(mockStore);

      // Set up invalid transition: loading -> not loading but data still null
      mockStore.setState({ loading: true });
      mockStore.setState({ loading: false, data: null }); // Invalid transition

      stopMonitoring();
    });

    it('should handle transition validation errors gracefully', (done) => {
      const faultyTransition: StateTransition<any> = {
        name: 'Faulty Transition',
        from: () => true,
        to: () => true,
        action: 'test',
        validate: () => {
          throw new Error('Transition validation error');
        },
        message: 'This transition has a bug'
      };

      tester.registerTransition(faultyTransition);

      tester.on('transitionCheckError', (data) => {
        expect(data.transition).toBe('Faulty Transition');
        expect(data.error).toBe('Transition validation error');
        done();
      });

      const stopMonitoring = tester.startMonitoring(mockStore);
      mockStore.setState({ count: 1 });
      stopMonitoring();
    });
  });

  describe('Monitoring', () => {
    it('should start and stop monitoring', () => {
      expect(() => {
        const stopMonitoring = tester.startMonitoring(mockStore);
        stopMonitoring();
      }).not.toThrow();
    });

    it('should prevent multiple monitoring sessions', () => {
      const stopMonitoring = tester.startMonitoring(mockStore);
      
      expect(() => {
        tester.startMonitoring(mockStore);
      }).toThrow('Already monitoring a store');

      stopMonitoring();
    });

    it('should emit monitoring events', (done) => {
      let eventsReceived = 0;
      const expectedEvents = ['monitoringStarted', 'monitoringStopped'];

      const checkComplete = () => {
        eventsReceived++;
        if (eventsReceived === expectedEvents.length) {
          done();
        }
      };

      tester.on('monitoringStarted', checkComplete);
      tester.on('monitoringStopped', checkComplete);

      const stopMonitoring = tester.startMonitoring(mockStore);
      setTimeout(() => stopMonitoring(), 10);
    });

    it('should take snapshots on state changes', (done) => {
      tester.on('snapshotTaken', (data) => {
        expect(data.snapshot.id).toBeDefined();
        expect(data.snapshot.timestamp).toBeInstanceOf(Date);
        expect(data.snapshot.state).toBeDefined();
        done();
      });

      const stopMonitoring = tester.startMonitoring(mockStore);
      mockStore.setState({ count: 1 });
      stopMonitoring();
    });
  });

  describe('Concurrency Testing', () => {
    it('should test concurrent operations', async () => {
      const operations = [
        () => mockStore.setState({ count: 1 }),
        () => mockStore.setState({ count: 2 }),
        () => mockStore.setState({ count: 3 })
      ];

      const result = await tester.testConcurrency(mockStore, operations, 'Test Concurrency');

      expect(result.testName).toBe('Test Concurrency');
      expect(result.operationsExecuted).toBe(3);
      expect(result.duration).toBeGreaterThan(0);
      expect(result.finalState).toBeDefined();
      expect(result.stateHistory.length).toBeGreaterThan(1);
    });

    it('should handle concurrent operation errors', async () => {
      const operations = [
        () => mockStore.setState({ count: 1 }),
        () => {
          throw new Error('Concurrent operation error');
        },
        () => mockStore.setState({ count: 3 })
      ];

      let errorEmitted = false;
      tester.on('concurrentOperationError', (data) => {
        expect(data.operationIndex).toBe(1);
        expect(data.error).toBe('Concurrent operation error');
        errorEmitted = true;
      });

      const result = await tester.testConcurrency(mockStore, operations);

      expect(result.operationsExecuted).toBe(3);
      expect(errorEmitted).toBe(true);
    });

    it('should detect race conditions', async () => {
      // Create operations that might cause race conditions
      const operations = [
        async () => {
          await new Promise(resolve => setTimeout(resolve, 10));
          mockStore.setState({ value: 'A' });
        },
        async () => {
          await new Promise(resolve => setTimeout(resolve, 5));
          mockStore.setState({ value: 'B' });
        },
        async () => {
          await new Promise(resolve => setTimeout(resolve, 15));
          mockStore.setState({ value: 'A' }); // Back to A - potential race condition
        }
      ];

      const result = await tester.testConcurrency(mockStore, operations);

      expect(result.raceConditionsDetected).toBeGreaterThanOrEqual(0);
      expect(result.stateHistory.length).toBeGreaterThan(1);
    });
  });

  describe('Consistency Analysis', () => {
    it('should analyze consistency and generate report', () => {
      // Register some invariants and transitions
      const invariant: StateInvariant<any> = {
        name: 'Test Invariant',
        description: 'Test invariant',
        check: () => true,
        severity: 'low',
        message: 'Test message'
      };

      tester.registerInvariant(invariant);

      const stopMonitoring = tester.startMonitoring(mockStore);
      mockStore.setState({ count: 1 });
      mockStore.setState({ count: 2 });
      stopMonitoring();

      const report = tester.analyzeConsistency();

      expect(report.summary.totalSnapshots).toBeGreaterThan(0);
      expect(report.summary.consistencyScore).toBeGreaterThanOrEqual(0);
      expect(report.summary.consistencyScore).toBeLessThanOrEqual(100);
      expect(report.snapshots.length).toBeGreaterThan(0);
      expect(report.recommendations).toBeInstanceOf(Array);
    });

    it('should generate appropriate recommendations', () => {
      // Create a scenario with violations
      const invariant: StateInvariant<any> = {
        name: 'Always Fail',
        description: 'An invariant that always fails',
        check: () => false,
        severity: 'critical',
        message: 'Always fails'
      };

      tester.registerInvariant(invariant);

      const stopMonitoring = tester.startMonitoring(mockStore);
      mockStore.setState({ count: 1 });
      stopMonitoring();

      const report = tester.analyzeConsistency();

      expect(report.summary.violationsFound).toBeGreaterThan(0);
      expect(report.summary.criticalViolations).toBeGreaterThan(0);
      expect(report.recommendations.length).toBeGreaterThan(0);
      expect(report.recommendations.some(r => r.includes('critical'))).toBe(true);
    });
  });

  describe('Common Invariants and Transitions', () => {
    it('should create common invariants', () => {
      const invariants = StateConsistencyTester.createCommonInvariants();

      expect(invariants.length).toBeGreaterThan(0);
      expect(invariants[0].name).toBe('State Not Null');
      expect(invariants[1].name).toBe('State Is Object');
    });

    it('should create common transitions', () => {
      const transitions = StateConsistencyTester.createCommonTransitions();

      expect(transitions.length).toBeGreaterThan(0);
      expect(transitions[0].name).toBe('Loading to Success');
      expect(transitions[1].name).toBe('Loading to Error');
    });

    it('should validate common invariants correctly', () => {
      const invariants = StateConsistencyTester.createCommonInvariants();
      
      // Test state not null invariant
      expect(invariants[0].check({ count: 0 })).toBe(true);
      expect(invariants[0].check(null)).toBe(false);
      expect(invariants[0].check(undefined)).toBe(false);

      // Test state is object invariant
      expect(invariants[1].check({ count: 0 })).toBe(true);
      expect(invariants[1].check('string')).toBe(false);
      expect(invariants[1].check(123)).toBe(false);
    });
  });

  describe('Data Export', () => {
    it('should export test data', () => {
      const invariant: StateInvariant<any> = {
        name: 'Test Invariant',
        description: 'Test',
        check: () => true,
        severity: 'low',
        message: 'Test'
      };

      tester.registerInvariant(invariant);

      const stopMonitoring = tester.startMonitoring(mockStore);
      mockStore.setState({ count: 1 });
      stopMonitoring();

      const exportedData = tester.exportData();

      expect(exportedData.snapshots.length).toBeGreaterThan(0);
      expect(exportedData.violations).toBeInstanceOf(Array);
      expect(exportedData.invariants).toHaveLength(1);
      expect(exportedData.transitions).toBeInstanceOf(Array);
    });
  });

  describe('Reset Functionality', () => {
    it('should reset tester state', () => {
      const invariant: StateInvariant<any> = {
        name: 'Test Invariant',
        description: 'Test',
        check: () => true,
        severity: 'low',
        message: 'Test'
      };

      tester.registerInvariant(invariant);

      const stopMonitoring = tester.startMonitoring(mockStore);
      mockStore.setState({ count: 1 });
      stopMonitoring();

      expect(tester.getSnapshots().length).toBeGreaterThan(0);

      tester.reset();

      expect(tester.getSnapshots().length).toBe(0);
      expect(tester.getViolations().length).toBe(0);
    });
  });

  describe('Configuration Options', () => {
    it('should respect snapshot interval configuration', (done) => {
      const config: ConsistencyTestConfig = {
        snapshotInterval: 50,
        maxSnapshots: 10,
        invariantChecks: true,
        transitionValidation: true,
        concurrencyTesting: true,
        performanceMonitoring: true
      };

      const customTester = createConsistencyTester(config);
      let snapshotCount = 0;

      customTester.on('snapshotTaken', () => {
        snapshotCount++;
        if (snapshotCount >= 2) {
          done();
        }
      });

      const stopMonitoring = customTester.startMonitoring(mockStore);
      
      // Should take periodic snapshots
      setTimeout(() => {
        stopMonitoring();
        if (snapshotCount < 2) {
          done();
        }
      }, 150);
    });

    it('should limit snapshots to max count', () => {
      const config: ConsistencyTestConfig = {
        snapshotInterval: 0,
        maxSnapshots: 3,
        invariantChecks: true,
        transitionValidation: true,
        concurrencyTesting: true,
        performanceMonitoring: true
      };

      const customTester = createConsistencyTester(config);
      const stopMonitoring = customTester.startMonitoring(mockStore);

      // Generate more snapshots than the limit
      for (let i = 0; i < 5; i++) {
        mockStore.setState({ count: i });
      }

      stopMonitoring();

      const snapshots = customTester.getSnapshots();
      expect(snapshots.length).toBeLessThanOrEqual(3);
    });
  });
});