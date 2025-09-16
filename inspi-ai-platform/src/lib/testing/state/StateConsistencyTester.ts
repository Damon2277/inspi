/**
 * State Consistency Tester
 * 
 * Specialized testing utilities for state consistency validation including
 * state transition validation, invariant checking, and consistency monitoring.
 */
import { EventEmitter } from 'events';
import { StateStore } from './StateTestFramework';

export interface ConsistencyTestConfig {
  snapshotInterval: number;
  maxSnapshots: number;
  invariantChecks: boolean;
  transitionValidation: boolean;
  concurrencyTesting: boolean;
  performanceMonitoring: boolean;
}

export interface StateInvariant<T> {
  name: string;
  description: string;
  check: (state: T) => boolean;
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
}

export interface StateTransition<T> {
  name: string;
  from: T | ((state: T) => boolean);
  to: T | ((state: T) => boolean);
  action: string;
  validate: (fromState: T, toState: T) => boolean;
  message: string;
}

export interface ConsistencySnapshot<T> {
  id: string;
  timestamp: Date;
  state: T;
  action?: string;
  metadata: SnapshotMetadata;
}

export interface SnapshotMetadata {
  memoryUsage: number;
  subscriptionCount: number;
  operationId?: string;
  threadId?: string;
}

export interface ConsistencyViolation<T> {
  type: 'invariant' | 'transition' | 'concurrency' | 'performance';
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  timestamp: Date;
  state: T;
  previousState?: T;
  invariant?: StateInvariant<T>;
  transition?: StateTransition<T>;
  context: any;
}

export interface ConsistencyReport<T> {
  summary: {
    totalSnapshots: number;
    violationsFound: number;
    criticalViolations: number;
    consistencyScore: number;
  };
  violations: ConsistencyViolation<T>[];
  snapshots: ConsistencySnapshot<T>[];
  recommendations: string[];
}

export interface ConcurrencyTestResult<T> {
  testName: string;
  duration: number;
  operationsExecuted: number;
  consistencyViolations: ConsistencyViolation<T>[];
  finalState: T;
  stateHistory: T[];
  raceConditionsDetected: number;
}

export class StateConsistencyTester<T> extends EventEmitter {
  private config: ConsistencyTestConfig;
  private snapshots: ConsistencySnapshot<T>[] = [];
  private violations: ConsistencyViolation<T>[] = [];
  private invariants: StateInvariant<T>[] = [];
  private transitions: StateTransition<T>[] = [];
  private isMonitoring: boolean = false;

  constructor(config: ConsistencyTestConfig) {
    super();
    this.config = config;
  }

  /**
   * Register state invariants
   */
  registerInvariant(invariant: StateInvariant<T>): void {
    this.invariants.push(invariant);
    this.emit('invariantRegistered', { name: invariant.name });
  }

  /**
   * Register state transitions
   */
  registerTransition(transition: StateTransition<T>): void {
    this.transitions.push(transition);
    this.emit('transitionRegistered', { name: transition.name });
  }

  /**
   * Start monitoring store for consistency
   */
  startMonitoring(store: StateStore<T>): () => void {
    if (this.isMonitoring) {
      throw new Error('Already monitoring a store');
    }

    this.isMonitoring = true;
    this.snapshots = [];
    this.violations = [];

    // Take initial snapshot
    this.takeSnapshot(store.getState(), 'initial');

    // Subscribe to state changes
    const unsubscribe = store.subscribe((state, prevState) => {
      this.handleStateChange(state, prevState);
    });

    // Setup periodic snapshots if configured
    let snapshotInterval: NodeJS.Timeout | undefined;
    if (this.config.snapshotInterval > 0) {
      snapshotInterval = setInterval(() => {
        this.takeSnapshot(store.getState(), 'periodic');
      }, this.config.snapshotInterval);
    }

    this.emit('monitoringStarted');

    // Return cleanup function
    return () => {
      this.isMonitoring = false;
      unsubscribe();
      if (snapshotInterval) {
        clearInterval(snapshotInterval);
      }
      this.emit('monitoringStopped');
    };
  }

  /**
   * Handle state change
   */
  private handleStateChange(state: T, prevState: T): void {
    // Take snapshot
    this.takeSnapshot(state, 'stateChange', prevState);

    // Check invariants
    if (this.config.invariantChecks) {
      this.checkInvariants(state);
    }

    // Validate transitions
    if (this.config.transitionValidation) {
      this.validateTransitions(prevState, state);
    }

    this.emit('stateChanged', { state, prevState });
  }

  /**
   * Take state snapshot
   */
  private takeSnapshot(state: T, action: string, prevState?: T): void {
    const snapshot: ConsistencySnapshot<T> = {
      id: this.generateSnapshotId(),
      timestamp: new Date(),
      state: JSON.parse(JSON.stringify(state)), // Deep copy
      action,
      metadata: {
        memoryUsage: this.getMemoryUsage(),
        subscriptionCount: this.getSubscriptionCount(),
        operationId: this.generateOperationId(),
        threadId: this.getThreadId()
      }
    };

    this.snapshots.push(snapshot);

    // Limit snapshots to max count
    if (this.snapshots.length > this.config.maxSnapshots) {
      this.snapshots.shift();
    }

    this.emit('snapshotTaken', { snapshot });
  }

  /**
   * Check state invariants
   */
  private checkInvariants(state: T): void {
    for (const invariant of this.invariants) {
      try {
        const isValid = invariant.check(state);
        
        if (!isValid) {
          const violation: ConsistencyViolation<T> = {
            type: 'invariant',
            severity: invariant.severity,
            message: `Invariant violation: ${invariant.message}`,
            timestamp: new Date(),
            state: JSON.parse(JSON.stringify(state)),
            invariant,
            context: { invariantName: invariant.name }
          };

          this.violations.push(violation);
          this.emit('invariantViolation', { violation });
        }
      } catch (error) {
        this.emit('invariantCheckError', { 
          invariant: invariant.name, 
          error: error instanceof Error ? error.message : String(error)
        });
      }
    }
  }

  /**
   * Validate state transitions
   */
  private validateTransitions(fromState: T, toState: T): void {
    for (const transition of this.transitions) {
      try {
        const fromMatches = this.matchesState(fromState, transition.from);
        const toMatches = this.matchesState(toState, transition.to);

        if (fromMatches && toMatches) {
          const isValidTransition = transition.validate(fromState, toState);
          
          if (!isValidTransition) {
            const violation: ConsistencyViolation<T> = {
              type: 'transition',
              severity: 'high',
              message: `Invalid transition: ${transition.message}`,
              timestamp: new Date(),
              state: JSON.parse(JSON.stringify(toState)),
              previousState: JSON.parse(JSON.stringify(fromState)),
              transition,
              context: { transitionName: transition.name }
            };

            this.violations.push(violation);
            this.emit('transitionViolation', { violation });
          }
        }
      } catch (error) {
        this.emit('transitionCheckError', { 
          transition: transition.name, 
          error: error instanceof Error ? error.message : String(error)
        });
      }
    }
  }

  /**
   * Check if state matches condition
   */
  private matchesState(state: T, condition: T | ((state: T) => boolean)): boolean {
    if (typeof condition === 'function') {
      return condition(state);
    }
    return JSON.stringify(state) === JSON.stringify(condition);
  }

  /**
   * Test concurrent operations for consistency
   */
  async testConcurrency(
    store: StateStore<T>,
    operations: Array<() => Promise<void> | void>,
    testName: string = 'Concurrency Test'
  ): Promise<ConcurrencyTestResult<T>> {
    const startTime = Date.now();
    const initialState = store.getState();
    const stateHistory: T[] = [JSON.parse(JSON.stringify(initialState))];
    let raceConditionsDetected = 0;

    // Start monitoring
    const stopMonitoring = this.startMonitoring(store);

    // Track state changes
    const stateChangeHandler = (state: T) => {
      stateHistory.push(JSON.parse(JSON.stringify(state)));
    };

    const unsubscribe = store.subscribe(stateChangeHandler);

    try {
      // Execute operations concurrently
      const promises = operations.map(async (operation, index) => {
        try {
          await operation();
        } catch (error) {
          this.emit('concurrentOperationError', { 
            operationIndex: index, 
            error: error instanceof Error ? error.message : String(error)
          });
        }
      });

      await Promise.all(promises);

      // Wait a bit for any pending state updates
      await new Promise(resolve => setTimeout(resolve, 100));

      // Analyze for race conditions
      raceConditionsDetected = this.detectRaceConditions(stateHistory);

    } finally {
      unsubscribe();
      stopMonitoring();
    }

    const duration = Date.now() - startTime;
    const finalState = store.getState();

    return {
      testName,
      duration,
      operationsExecuted: operations.length,
      consistencyViolations: [...this.violations],
      finalState,
      stateHistory,
      raceConditionsDetected
    };
  }

  /**
   * Detect race conditions in state history
   */
  private detectRaceConditions(stateHistory: T[]): number {
    let raceConditions = 0;

    // Simple race condition detection based on rapid state changes
    for (let i = 1; i < stateHistory.length - 1; i++) {
      const prev = stateHistory[i - 1];
      const current = stateHistory[i];
      const next = stateHistory[i + 1];

      // Check for state oscillation (A -> B -> A pattern)
      if (JSON.stringify(prev) === JSON.stringify(next) && 
          JSON.stringify(prev) !== JSON.stringify(current)) {
        raceConditions++;
      }
    }

    return raceConditions;
  }

  /**
   * Analyze consistency over time
   */
  analyzeConsistency(): ConsistencyReport<T> {
    const totalSnapshots = this.snapshots.length;
    const violationsFound = this.violations.length;
    const criticalViolations = this.violations.filter(v => v.severity === 'critical').length;
    
    // Calculate consistency score (0-100)
    const consistencyScore = totalSnapshots > 0 
      ? Math.max(0, 100 - (violationsFound / totalSnapshots) * 100)
      : 100;

    const recommendations = this.generateRecommendations();

    return {
      summary: {
        totalSnapshots,
        violationsFound,
        criticalViolations,
        consistencyScore
      },
      violations: [...this.violations],
      snapshots: [...this.snapshots],
      recommendations
    };
  }

  /**
   * Generate recommendations based on violations
   */
  private generateRecommendations(): string[] {
    const recommendations: string[] = [];
    const violationTypes = new Set(this.violations.map(v => v.type));
    const severityLevels = new Set(this.violations.map(v => v.severity));

    if (violationTypes.has('invariant')) {
      recommendations.push('Review and strengthen state invariants');
      recommendations.push('Add validation before state updates');
    }

    if (violationTypes.has('transition')) {
      recommendations.push('Validate state transitions more carefully');
      recommendations.push('Consider using state machines for complex transitions');
    }

    if (violationTypes.has('concurrency')) {
      recommendations.push('Implement proper synchronization for concurrent operations');
      recommendations.push('Consider using atomic operations for critical state updates');
    }

    if (severityLevels.has('critical')) {
      recommendations.push('Address critical violations immediately');
      recommendations.push('Consider adding circuit breakers for critical state operations');
    }

    if (this.violations.length > this.snapshots.length * 0.1) {
      recommendations.push('High violation rate detected - review state management architecture');
    }

    return recommendations;
  }

  /**
   * Create common invariants for typical state patterns
   */
  static createCommonInvariants<T>(): StateInvariant<T>[] {
    return [
      {
        name: 'State Not Null',
        description: 'State should never be null or undefined',
        check: (state: T) => state != null,
        severity: 'critical',
        message: 'State is null or undefined'
      },
      {
        name: 'State Is Object',
        description: 'State should be an object',
        check: (state: T) => typeof state === 'object',
        severity: 'high',
        message: 'State is not an object'
      }
    ];
  }

  /**
   * Create common transitions for typical state patterns
   */
  static createCommonTransitions<T>(): StateTransition<T>[] {
    return [
      {
        name: 'Loading to Success',
        from: (state: any) => state.loading === true,
        to: (state: any) => state.loading === false && state.data != null,
        action: 'loadSuccess',
        validate: (from: any, to: any) => {
          return from.loading === true && to.loading === false && to.data != null;
        },
        message: 'Invalid transition from loading to success state'
      },
      {
        name: 'Loading to Error',
        from: (state: any) => state.loading === true,
        to: (state: any) => state.loading === false && state.error != null,
        action: 'loadError',
        validate: (from: any, to: any) => {
          return from.loading === true && to.loading === false && to.error != null;
        },
        message: 'Invalid transition from loading to error state'
      }
    ];
  }

  /**
   * Utility methods
   */
  private generateSnapshotId(): string {
    return `snapshot-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateOperationId(): string {
    return `op-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  private getMemoryUsage(): number {
    // Mock implementation - in real scenario would use process.memoryUsage()
    return Math.random() * 100;
  }

  private getSubscriptionCount(): number {
    // Mock implementation - would track actual subscriptions
    return Math.floor(Math.random() * 10);
  }

  private getThreadId(): string {
    // Mock implementation - would get actual thread/worker ID
    return 'main';
  }

  /**
   * Reset tester state
   */
  reset(): void {
    this.snapshots = [];
    this.violations = [];
    this.invariants = [];
    this.transitions = [];
    this.isMonitoring = false;
  }

  /**
   * Get current violations
   */
  getViolations(): ConsistencyViolation<T>[] {
    return [...this.violations];
  }

  /**
   * Get current snapshots
   */
  getSnapshots(): ConsistencySnapshot<T>[] {
    return [...this.snapshots];
  }

  /**
   * Export test data for analysis
   */
  exportData(): {
    snapshots: ConsistencySnapshot<T>[];
    violations: ConsistencyViolation<T>[];
    invariants: StateInvariant<T>[];
    transitions: StateTransition<T>[];
  } {
    return {
      snapshots: [...this.snapshots],
      violations: [...this.violations],
      invariants: [...this.invariants],
      transitions: [...this.transitions]
    };
  }
}

/**
 * Create consistency tester instance
 */
export function createConsistencyTester<T>(config: ConsistencyTestConfig): StateConsistencyTester<T> {
  return new StateConsistencyTester<T>(config);
}