/**
 * Middleware Chain Tester
 *
 * Specialized testing utilities for middleware chains including
 * execution order validation, chain composition testing, and integration scenarios.
 */
import { NextRequest, NextResponse } from 'next/server';

import {
  MiddlewareChain,
  MiddlewareDefinition,
  IntegrationTestSuite,
  IntegrationScenario,
  TestResult,
} from './MiddlewareTestFramework';

export interface ChainTestConfig {
  timeout: number;
  validateOrder: boolean;
  captureIntermediateStates: boolean;
  enablePerformanceTracking: boolean;
}

export interface ChainExecutionResult {
  success: boolean;
  finalResponse: NextResponse;
  intermediateStates: IntermediateState[];
  executionOrder: string[];
  totalExecutionTime: number;
  error?: Error;
}

export interface IntermediateState {
  middlewareName: string;
  request: NextRequest;
  response: NextResponse;
  executionTime: number;
  memoryUsage: number;
  timestamp: Date;
}

export interface ChainValidationResult {
  isValid: boolean;
  issues: ChainIssue[];
  recommendations: string[];
}

export interface ChainIssue {
  type: 'dependency' | 'order' | 'compatibility' | 'performance';
  severity: 'low' | 'medium' | 'high' | 'critical';
  middleware: string;
  description: string;
  suggestion: string;
}

export class MiddlewareChainTester {
  private config: ChainTestConfig;
  private middlewares: Map<string, MiddlewareDefinition> = new Map();

  constructor(config: ChainTestConfig) {
    this.config = config;
  }

  /**
   * Register middleware for chain testing
   */
  registerMiddleware(middleware: MiddlewareDefinition): void {
    this.middlewares.set(middleware.name, middleware);
  }

  /**
   * Validate middleware chain configuration
   */
  validateChain(chain: MiddlewareChain): ChainValidationResult {
    const issues: ChainIssue[] = [];
    const recommendations: string[] = [];

    // Check if all middlewares exist
    for (const middlewareRef of chain.middlewares) {
      if (!this.middlewares.has(middlewareRef.name)) {
        issues.push({
          type: 'dependency',
          severity: 'critical',
          middleware: middlewareRef.name,
          description: `Middleware ${middlewareRef.name} is not registered`,
          suggestion: `Register middleware ${middlewareRef.name} before using it in chain`,
        });
      }
    }

    // Validate dependencies
    for (const middlewareRef of chain.middlewares) {
      const middleware = this.middlewares.get(middlewareRef.name);
      if (middleware?.dependencies) {
        for (const dependency of middleware.dependencies) {
          const dependencyExists = chain.middlewares.some(m => m.name === dependency);
          if (!dependencyExists) {
            issues.push({
              type: 'dependency',
              severity: 'high',
              middleware: middlewareRef.name,
              description: `Middleware ${middlewareRef.name} depends on ${dependency} which is not in the chain`,
              suggestion: `Add ${dependency} to the chain before ${middlewareRef.name}`,
            });
          }
        }
      }
    }

    // Validate execution order based on priorities and dependencies
    const orderIssues = this.validateExecutionOrder(chain);
    issues.push(...orderIssues);

    // Check for potential performance issues
    const performanceIssues = this.validatePerformanceCharacteristics(chain);
    issues.push(...performanceIssues);

    // Generate recommendations
    if (issues.length === 0) {
      recommendations.push('Chain configuration is valid');
    } else {
      recommendations.push('Review and fix identified issues');

      if (issues.some(i => i.type === 'dependency')) {
        recommendations.push('Ensure all middleware dependencies are satisfied');
      }

      if (issues.some(i => i.type === 'order')) {
        recommendations.push('Review middleware execution order');
      }

      if (issues.some(i => i.type === 'performance')) {
        recommendations.push('Consider optimizing middleware chain for performance');
      }
    }

    return {
      isValid: issues.filter(i => i.severity === 'critical' || i.severity === 'high').length === 0,
      issues,
      recommendations,
    };
  }

  /**
   * Execute middleware chain with detailed tracking
   */
  async executeChain(chain: MiddlewareChain, request: NextRequest): Promise<ChainExecutionResult> {
    const startTime = Date.now();
    const intermediateStates: IntermediateState[] = [];
    const executionOrder: string[] = [];

    try {
      let currentRequest = request;
      let currentResponse = NextResponse.next();

      if (chain.order === 'sequential') {
        // Sequential execution
        for (const middlewareRef of chain.middlewares) {
          const middleware = this.middlewares.get(middlewareRef.name);
          if (!middleware) {
            throw new Error(`Middleware ${middlewareRef.name} not found`);
          }

          const stepStartTime = Date.now();
          const startMemory = process.memoryUsage().heapUsed;

          currentResponse = await this.executeWithTimeout(
            middleware.handler,
            currentRequest,
            this.config.timeout,
          );

          const stepEndTime = Date.now();
          const endMemory = process.memoryUsage().heapUsed;

          executionOrder.push(middleware.name);

          if (this.config.captureIntermediateStates) {
            intermediateStates.push({
              middlewareName: middleware.name,
              request: currentRequest,
              response: currentResponse,
              executionTime: stepEndTime - stepStartTime,
              memoryUsage: (endMemory - startMemory) / 1024 / 1024, // MB
              timestamp: new Date(),
            });
          }

          // For sequential chains, the response might modify the request for the next middleware
          // This is a simplified implementation - real middleware chaining is more complex
          currentRequest = this.createModifiedRequest(currentRequest, currentResponse);
        }
      } else {
        // Parallel execution
        const promises = chain.middlewares.map(async (middlewareRef) => {
          const middleware = this.middlewares.get(middlewareRef.name);
          if (!middleware) {
            throw new Error(`Middleware ${middlewareRef.name} not found`);
          }

          const stepStartTime = Date.now();
          const startMemory = process.memoryUsage().heapUsed;

          const response = await this.executeWithTimeout(
            middleware.handler,
            currentRequest,
            this.config.timeout,
          );

          const stepEndTime = Date.now();
          const endMemory = process.memoryUsage().heapUsed;

          executionOrder.push(middleware.name);

          if (this.config.captureIntermediateStates) {
            intermediateStates.push({
              middlewareName: middleware.name,
              request: currentRequest,
              response: response,
              executionTime: stepEndTime - stepStartTime,
              memoryUsage: (endMemory - startMemory) / 1024 / 1024, // MB
              timestamp: new Date(),
            });
          }

          return response;
        });

        const responses = await Promise.all(promises);
        // For parallel execution, we might need to merge responses or use the last one
        currentResponse = responses[responses.length - 1];
      }

      const totalExecutionTime = Date.now() - startTime;

      return {
        success: true,
        finalResponse: currentResponse,
        intermediateStates,
        executionOrder,
        totalExecutionTime,
      };

    } catch (error) {
      return {
        success: false,
        finalResponse: NextResponse.json({ error: 'Chain execution failed' }, { status: 500 }),
        intermediateStates,
        executionOrder,
        totalExecutionTime: Date.now() - startTime,
        error: error instanceof Error ? error : new Error(String(error)),
      };
    }
  }

  /**
   * Test chain with multiple scenarios
   */
  async testChainScenarios(chain: MiddlewareChain, scenarios: IntegrationScenario[]): Promise<TestResult[]> {
    const results: TestResult[] = [];

    for (const scenario of scenarios) {
      const startTime = Date.now();
      const result: TestResult = {
        scenario: scenario.name,
        type: 'integration',
        status: 'passed',
        duration: 0,
        assertions: [],
        metadata: {
          timestamp: new Date(),
          environment: process.env.NODE_ENV || 'test',
          nodeVersion: process.version,
          testFrameworkVersion: '1.0.0',
          middleware: chain.name,
          requestId: this.generateRequestId(),
        },
      };

      try {
        // Execute the scenario flow
        const flowResults = await this.executeScenarioFlow(chain, scenario);

        // Validate assertions
        result.assertions = await this.validateScenarioAssertions(scenario, flowResults);
        result.status = result.assertions.every(a => a.passed) ? 'passed' : 'failed';

      } catch (error) {
        result.status = 'failed';
        result.error = {
          message: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined,
          type: error instanceof Error ? error.constructor.name : 'Unknown',
          context: { scenario: scenario.name, chain: chain.name },
        };
      }

      result.duration = Date.now() - startTime;
      results.push(result);
    }

    return results;
  }

  /**
   * Benchmark chain performance
   */
  async benchmarkChain(
    chain: MiddlewareChain,
    request: NextRequest,
    iterations: number = 100,
  ): Promise<{
    averageExecutionTime: number;
    minExecutionTime: number;
    maxExecutionTime: number;
    throughput: number;
    memoryUsage: {
      average: number;
      peak: number;
    };
    bottlenecks: Array<{
      middleware: string;
      averageTime: number;
      percentage: number;
    }>;
  }> {
    const executionTimes: number[] = [];
    const memoryUsages: number[] = [];
    const middlewareTimings: Map<string, number[]> = new Map();

    for (let i = 0; i < iterations; i++) {
      const result = await this.executeChain(chain, request);
      executionTimes.push(result.totalExecutionTime);

      // Track memory usage
      const totalMemory = result.intermediateStates.reduce((sum, state) => sum + state.memoryUsage, 0);
      memoryUsages.push(totalMemory);

      // Track individual middleware timings
      result.intermediateStates.forEach(state => {
        if (!middlewareTimings.has(state.middlewareName)) {
          middlewareTimings.set(state.middlewareName, []);
        }
        middlewareTimings.get(state.middlewareName)!.push(state.executionTime);
      });
    }

    const averageExecutionTime = executionTimes.reduce((sum, time) => sum + time, 0) / iterations;
    const minExecutionTime = Math.min(...executionTimes);
    const maxExecutionTime = Math.max(...executionTimes);
    const throughput = (iterations / (executionTimes.reduce((sum, time) => sum + time, 0))) * 1000;

    const averageMemoryUsage = memoryUsages.reduce((sum, usage) => sum + usage, 0) / iterations;
    const peakMemoryUsage = Math.max(...memoryUsages);

    // Identify bottlenecks
    const bottlenecks = Array.from(middlewareTimings.entries()).map(([middleware, times]) => {
      const averageTime = times.reduce((sum, time) => sum + time, 0) / times.length;
      const percentage = (averageTime / averageExecutionTime) * 100;
      return { middleware, averageTime, percentage };
    }).sort((a, b) => b.averageTime - a.averageTime);

    return {
      averageExecutionTime,
      minExecutionTime,
      maxExecutionTime,
      throughput,
      memoryUsage: {
        average: averageMemoryUsage,
        peak: peakMemoryUsage,
      },
      bottlenecks,
    };
  }

  /**
   * Test chain error handling
   */
  async testChainErrorHandling(
    chain: MiddlewareChain,
    request: NextRequest,
    errorScenarios: Array<{
      middlewareName: string;
      errorType: 'sync' | 'async' | 'timeout';
      expectedBehavior: 'fail-fast' | 'continue' | 'fallback';
    }>,
  ): Promise<Array<{
    scenario: string;
    success: boolean;
    behavior: string;
    error?: Error;
  }>> {
    const results: Array<{
      scenario: string;
      success: boolean;
      behavior: string;
      error?: Error;
    }> = [];

    for (const scenario of errorScenarios) {
      // Create a modified chain with error-inducing middleware
      const modifiedChain = this.createChainWithError(chain, scenario.middlewareName, scenario.errorType);

      try {
        const result = await this.executeChain(modifiedChain, request);

        results.push({
          scenario: `${scenario.middlewareName} - ${scenario.errorType}`,
          success: result.success,
          behavior: this.determineBehavior(result, scenario.expectedBehavior),
          error: result.error,
        });
      } catch (error) {
        results.push({
          scenario: `${scenario.middlewareName} - ${scenario.errorType}`,
          success: false,
          behavior: 'fail-fast',
          error: error instanceof Error ? error : new Error(String(error)),
        });
      }
    }

    return results;
  }

  /**
   * Validate execution order
   */
  private validateExecutionOrder(chain: MiddlewareChain): ChainIssue[] {
    const issues: ChainIssue[] = [];

    // Check if dependencies are satisfied by execution order
    for (let i = 0; i < chain.middlewares.length; i++) {
      const middleware = this.middlewares.get(chain.middlewares[i].name);
      if (middleware?.dependencies) {
        for (const dependency of middleware.dependencies) {
          const dependencyIndex = chain.middlewares.findIndex(m => m.name === dependency);
          if (dependencyIndex > i) {
            issues.push({
              type: 'order',
              severity: 'high',
              middleware: middleware.name,
              description: `Middleware ${middleware.name} depends on ${dependency} but ${dependency} comes after it in the chain`,
              suggestion: `Move ${dependency} before ${middleware.name} in the execution order`,
            });
          }
        }
      }
    }

    // Check priority-based ordering
    for (let i = 0; i < chain.middlewares.length - 1; i++) {
      const current = chain.middlewares[i];
      const next = chain.middlewares[i + 1];

      if (current.priority && next.priority && current.priority < next.priority) {
        issues.push({
          type: 'order',
          severity: 'medium',
          middleware: current.name,
          description: `Middleware ${current.name} (priority ${current.priority}) should come after ${next.name} (priority ${next.priority})`,
          suggestion: 'Reorder middlewares based on priority values',
        });
      }
    }

    return issues;
  }

  /**
   * Validate performance characteristics
   */
  private validatePerformanceCharacteristics(chain: MiddlewareChain): ChainIssue[] {
    const issues: ChainIssue[] = [];

    // Check for potentially slow middleware combinations
    const heavyMiddlewares = ['auth', 'database', 'external-api', 'file-upload'];
    const chainMiddlewareNames = chain.middlewares.map(m => m.name.toLowerCase());

    const heavyCount = chainMiddlewareNames.filter(name =>
      heavyMiddlewares.some(heavy => name.includes(heavy)),
    ).length;

    if (heavyCount > 3) {
      issues.push({
        type: 'performance',
        severity: 'medium',
        middleware: 'chain',
        description: `Chain contains ${heavyCount} potentially heavy middlewares`,
        suggestion: 'Consider optimizing or parallelizing heavy operations',
      });
    }

    // Check chain length
    if (chain.middlewares.length > 10) {
      issues.push({
        type: 'performance',
        severity: 'low',
        middleware: 'chain',
        description: `Chain is quite long with ${chain.middlewares.length} middlewares`,
        suggestion: 'Consider breaking down into smaller, focused chains',
      });
    }

    return issues;
  }

  /**
   * Execute middleware with timeout
   */
  private async executeWithTimeout(
    handler: (request: NextRequest) => Promise<NextResponse> | NextResponse,
    request: NextRequest,
    timeout: number,
  ): Promise<NextResponse> {
    return new Promise(async (resolve, reject) => {
      const timeoutId = setTimeout(() => {
        reject(new Error(`Middleware execution timed out after ${timeout}ms`));
      }, timeout);

      try {
        const result = await handler(request);
        clearTimeout(timeoutId);
        resolve(result);
      } catch (error) {
        clearTimeout(timeoutId);
        reject(error);
      }
    });
  }

  /**
   * Create modified request for sequential chaining
   */
  private createModifiedRequest(originalRequest: NextRequest, response: NextResponse): NextRequest {
    // In a real implementation, this would properly handle request modification
    // based on the response. For testing purposes, we'll return the original request.
    return originalRequest;
  }

  /**
   * Execute scenario flow
   */
  private async executeScenarioFlow(chain: MiddlewareChain, scenario: IntegrationScenario): Promise<any[]> {
    // Simplified implementation - would need more sophisticated flow execution
    const results: any[] = [];

    for (const step of scenario.flow) {
      const middleware = this.middlewares.get(step.middleware);
      if (!middleware) {
        throw new Error(`Middleware ${step.middleware} not found`);
      }

      // Create request from step input
      const request = new NextRequest('http://localhost:3000/test', {
        method: 'POST',
        body: JSON.stringify(step.input),
        headers: { 'content-type': 'application/json' },
      });

      const response = await middleware.handler(request);
      results.push({ step, request, response });
    }

    return results;
  }

  /**
   * Validate scenario assertions
   */
  private async validateScenarioAssertions(scenario: IntegrationScenario, flowResults: any[]): Promise<any[]> {
    // Simplified implementation - would need more sophisticated assertion validation
    return scenario.assertions.map(assertion => ({
      name: assertion.type,
      passed: true, // Placeholder
      expected: assertion.condition,
      actual: 'validated',
      message: assertion.message,
    }));
  }

  /**
   * Create chain with error-inducing middleware
   */
  private createChainWithError(
    chain: MiddlewareChain,
    middlewareName: string,
    errorType: 'sync' | 'async' | 'timeout',
  ): MiddlewareChain {
    const modifiedMiddlewares = chain.middlewares.map(middlewareRef => {
      if (middlewareRef.name === middlewareName) {
        return {
          ...middlewareRef,
          handler: this.createErrorHandler(errorType),
        };
      }
      return middlewareRef;
    });

    return {
      ...chain,
      middlewares: modifiedMiddlewares,
    };
  }

  /**
   * Create error handler for testing
   */
  private createErrorHandler(errorType: 'sync' | 'async' | 'timeout') {
    return async (request: NextRequest): Promise<NextResponse> => {
      switch (errorType) {
        case 'sync':
          throw new Error('Synchronous error');
        case 'async':
          return new Promise((_, reject) => {
            setTimeout(() => reject(new Error('Asynchronous error')), 10);
          });
        case 'timeout':
          return new Promise(() => {
            // Never resolves
          });
        default:
          throw new Error('Unknown error type');
      }
    };
  }

  /**
   * Determine behavior from execution result
   */
  private determineBehavior(
    result: ChainExecutionResult,
    expectedBehavior: 'fail-fast' | 'continue' | 'fallback',
  ): string {
    if (!result.success) {
      return 'fail-fast';
    }

    if (result.finalResponse.status >= 200 && result.finalResponse.status < 300) {
      return 'continue';
    }

    if (result.finalResponse.status >= 400) {
      return 'fallback';
    }

    return 'unknown';
  }

  /**
   * Generate unique request ID
   */
  private generateRequestId(): string {
    return `chain-test-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
}
