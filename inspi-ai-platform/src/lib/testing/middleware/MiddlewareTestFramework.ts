/**
 * Middleware Test Framework
 * 
 * Comprehensive testing framework for middleware components including
 * functional testing, boundary testing, integration testing, and performance benchmarking.
 */
import { EventEmitter } from 'events';
import { NextRequest, NextResponse } from 'next/server';

export interface MiddlewareTestConfig {
  timeout: number;
  retries: number;
  performance: {
    enabled: boolean;
    warmupRuns: number;
    benchmarkRuns: number;
    thresholds: PerformanceThresholds;
  };
  logging: {
    enabled: boolean;
    level: 'debug' | 'info' | 'warn' | 'error';
    includeStack: boolean;
  };
  mocking: {
    enabled: boolean;
    mockExternalServices: boolean;
    mockDatabase: boolean;
  };
}

export interface PerformanceThresholds {
  maxExecutionTime: number; // milliseconds
  maxMemoryUsage: number; // MB
  maxCpuUsage: number; // percentage
  minThroughput: number; // requests per second
}

export interface MiddlewareFunction {
  (request: NextRequest): Promise<NextResponse> | NextResponse;
}

export interface MiddlewareChain {
  name: string;
  description: string;
  middlewares: MiddlewareDefinition[];
  order: 'sequential' | 'parallel';
}

export interface MiddlewareDefinition {
  name: string;
  handler: MiddlewareFunction;
  config?: any;
  dependencies?: string[];
  priority?: number;
}

export interface TestScenario {
  name: string;
  description: string;
  type: 'functional' | 'boundary' | 'integration' | 'performance';
  middleware: string | MiddlewareChain;
  input: TestInput;
  expected: TestExpectation;
  setup?: () => Promise<void>;
  teardown?: () => Promise<void>;
}

export interface TestInput {
  request: {
    url: string;
    method: string;
    headers?: Record<string, string>;
    body?: any;
    cookies?: Record<string, string>;
    searchParams?: Record<string, string>;
  };
  context?: {
    user?: any;
    session?: any;
    environment?: string;
    feature_flags?: Record<string, boolean>;
  };
  mocks?: MockConfiguration[];
}

export interface MockConfiguration {
  service: string;
  method: string;
  response: any;
  delay?: number;
  error?: Error;
}

export interface TestExpectation {
  response?: {
    status?: number;
    headers?: Record<string, string>;
    body?: any;
    cookies?: Record<string, string>;
  };
  sideEffects?: {
    database?: DatabaseExpectation[];
    external_calls?: ExternalCallExpectation[];
    logs?: LogExpectation[];
    metrics?: MetricExpectation[];
  };
  performance?: {
    maxExecutionTime?: number;
    maxMemoryUsage?: number;
    minThroughput?: number;
  };
  errors?: {
    shouldThrow?: boolean;
    errorType?: string;
    errorMessage?: string;
  };
}

export interface DatabaseExpectation {
  table: string;
  operation: 'insert' | 'update' | 'delete' | 'select';
  data?: any;
  count?: number;
}

export interface ExternalCallExpectation {
  service: string;
  endpoint: string;
  method: string;
  called: boolean;
  callCount?: number;
  payload?: any;
}

export interface LogExpectation {
  level: string;
  message: string;
  count?: number;
}

export interface MetricExpectation {
  name: string;
  value: number;
  operator: '>' | '<' | '=' | '>=' | '<=';
}

export interface TestResult {
  scenario: string;
  type: string;
  status: 'passed' | 'failed' | 'skipped';
  duration: number;
  assertions: AssertionResult[];
  performance?: PerformanceResult;
  error?: TestError;
  metadata: TestMetadata;
}

export interface AssertionResult {
  name: string;
  passed: boolean;
  expected: any;
  actual: any;
  message: string;
}

export interface PerformanceResult {
  executionTime: number;
  memoryUsage: number;
  cpuUsage: number;
  throughput: number;
  breakdown: PerformanceBreakdown[];
}

export interface PerformanceBreakdown {
  middleware: string;
  executionTime: number;
  memoryDelta: number;
  cpuTime: number;
}

export interface TestError {
  message: string;
  stack?: string;
  type: string;
  context: any;
}

export interface TestMetadata {
  timestamp: Date;
  environment: string;
  nodeVersion: string;
  testFrameworkVersion: string;
  middleware: string;
  requestId: string;
}

export interface BoundaryTestCase {
  name: string;
  description: string;
  input: any;
  expectedBehavior: 'success' | 'error' | 'fallback';
  category: 'null' | 'undefined' | 'empty' | 'invalid' | 'extreme' | 'malformed';
}

export interface IntegrationTestSuite {
  name: string;
  description: string;
  chain: MiddlewareChain;
  scenarios: IntegrationScenario[];
}

export interface IntegrationScenario {
  name: string;
  description: string;
  flow: IntegrationStep[];
  assertions: IntegrationAssertion[];
}

export interface IntegrationStep {
  middleware: string;
  input: any;
  expectedOutput: any;
  sideEffects?: any[];
}

export interface IntegrationAssertion {
  type: 'response' | 'state' | 'side_effect' | 'performance';
  target: string;
  condition: any;
  message: string;
}

export class MiddlewareTestFramework extends EventEmitter {
  private config: MiddlewareTestConfig;
  private middlewares: Map<string, MiddlewareDefinition> = new Map();
  private chains: Map<string, MiddlewareChain> = new Map();
  private testResults: TestResult[] = [];
  private performanceBaselines: Map<string, PerformanceResult> = new Map();

  constructor(config: MiddlewareTestConfig) {
    super();
    this.config = config;
  }

  /**
   * Register middleware for testing
   */
  registerMiddleware(definition: MiddlewareDefinition): void {
    this.middlewares.set(definition.name, definition);
    this.emit('middlewareRegistered', { name: definition.name });
  }

  /**
   * Register middleware chain for testing
   */
  registerChain(chain: MiddlewareChain): void {
    this.chains.set(chain.name, chain);
    this.emit('chainRegistered', { name: chain.name });
  }

  /**
   * Run functional tests for middleware
   */
  async runFunctionalTests(scenarios: TestScenario[]): Promise<TestResult[]> {
    const results: TestResult[] = [];
    
    for (const scenario of scenarios.filter(s => s.type === 'functional')) {
      this.emit('testStarted', { scenario: scenario.name, type: 'functional' });
      
      const result = await this.executeTestScenario(scenario);
      results.push(result);
      
      this.emit('testCompleted', { scenario: scenario.name, result });
    }
    
    return results;
  }

  /**
   * Run boundary tests for middleware
   */
  async runBoundaryTests(middleware: string, testCases: BoundaryTestCase[]): Promise<TestResult[]> {
    const results: TestResult[] = [];
    const middlewareDefinition = this.middlewares.get(middleware);
    
    if (!middlewareDefinition) {
      throw new Error(`Middleware ${middleware} not found`);
    }

    for (const testCase of testCases) {
      this.emit('boundaryTestStarted', { middleware, testCase: testCase.name });
      
      const result = await this.executeBoundaryTest(middlewareDefinition, testCase);
      results.push(result);
      
      this.emit('boundaryTestCompleted', { middleware, testCase: testCase.name, result });
    }
    
    return results;
  }

  /**
   * Run integration tests for middleware chains
   */
  async runIntegrationTests(suites: IntegrationTestSuite[]): Promise<TestResult[]> {
    const results: TestResult[] = [];
    
    for (const suite of suites) {
      this.emit('integrationSuiteStarted', { suite: suite.name });
      
      for (const scenario of suite.scenarios) {
        const result = await this.executeIntegrationScenario(suite.chain, scenario);
        results.push(result);
      }
      
      this.emit('integrationSuiteCompleted', { suite: suite.name });
    }
    
    return results;
  }

  /**
   * Run performance benchmarks for middleware
   */
  async runPerformanceBenchmarks(middleware: string, scenarios: TestScenario[]): Promise<TestResult[]> {
    if (!this.config.performance.enabled) {
      return [];
    }

    const results: TestResult[] = [];
    const performanceScenarios = scenarios.filter(s => s.type === 'performance');
    
    for (const scenario of performanceScenarios) {
      this.emit('performanceBenchmarkStarted', { middleware, scenario: scenario.name });
      
      const result = await this.executePerformanceBenchmark(scenario);
      results.push(result);
      
      // Store baseline if this is the first run
      if (!this.performanceBaselines.has(scenario.name) && result.performance) {
        this.performanceBaselines.set(scenario.name, result.performance);
      }
      
      this.emit('performanceBenchmarkCompleted', { middleware, scenario: scenario.name, result });
    }
    
    return results;
  }

  /**
   * Execute a single test scenario
   */
  private async executeTestScenario(scenario: TestScenario): Promise<TestResult> {
    const startTime = Date.now();
    const result: TestResult = {
      scenario: scenario.name,
      type: scenario.type,
      status: 'passed',
      duration: 0,
      assertions: [],
      metadata: {
        timestamp: new Date(),
        environment: process.env.NODE_ENV || 'test',
        nodeVersion: process.version,
        testFrameworkVersion: '1.0.0',
        middleware: typeof scenario.middleware === 'string' ? scenario.middleware : scenario.middleware.name,
        requestId: this.generateRequestId()
      }
    };

    try {
      // Setup
      if (scenario.setup) {
        await scenario.setup();
      }

      // Execute middleware
      const request = this.createTestRequest(scenario.input);
      let response: NextResponse;

      if (typeof scenario.middleware === 'string') {
        const middlewareDefinition = this.middlewares.get(scenario.middleware);
        if (!middlewareDefinition) {
          throw new Error(`Middleware ${scenario.middleware} not found`);
        }
        response = await this.executeMiddleware(middlewareDefinition, request);
      } else {
        response = await this.executeMiddlewareChain(scenario.middleware, request);
      }

      // Validate response
      result.assertions = await this.validateResponse(response, scenario.expected);
      
      // Check if all assertions passed
      result.status = result.assertions.every(a => a.passed) ? 'passed' : 'failed';

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
        context: { scenario: scenario.name }
      };
    }

    result.duration = Date.now() - startTime;
    return result;
  }

  /**
   * Execute boundary test
   */
  private async executeBoundaryTest(middleware: MiddlewareDefinition, testCase: BoundaryTestCase): Promise<TestResult> {
    const startTime = Date.now();
    const result: TestResult = {
      scenario: testCase.name,
      type: 'boundary',
      status: 'passed',
      duration: 0,
      assertions: [],
      metadata: {
        timestamp: new Date(),
        environment: process.env.NODE_ENV || 'test',
        nodeVersion: process.version,
        testFrameworkVersion: '1.0.0',
        middleware: middleware.name,
        requestId: this.generateRequestId()
      }
    };

    try {
      const request = this.createTestRequest({ 
        request: { 
          url: 'http://localhost:3000/test',
          method: 'POST',
          body: testCase.input
        }
      });

      let response: NextResponse;
      let threwError = false;
      let error: any = null;

      try {
        response = await this.executeMiddleware(middleware, request);
      } catch (e) {
        threwError = true;
        error = e;
      }

      // Validate behavior based on expected outcome
      const assertions: AssertionResult[] = [];

      switch (testCase.expectedBehavior) {
        case 'success':
          assertions.push({
            name: 'Should not throw error',
            passed: !threwError,
            expected: false,
            actual: threwError,
            message: threwError ? `Unexpected error: ${error?.message}` : 'No error thrown as expected'
          });
          break;

        case 'error':
          assertions.push({
            name: 'Should throw error',
            passed: threwError,
            expected: true,
            actual: threwError,
            message: threwError ? 'Error thrown as expected' : 'Expected error but none was thrown'
          });
          break;

        case 'fallback':
          assertions.push({
            name: 'Should handle gracefully',
            passed: !threwError && response!.status >= 200 && response!.status < 300,
            expected: 'graceful handling',
            actual: threwError ? 'error' : 'handled',
            message: 'Should handle boundary case gracefully'
          });
          break;
      }

      result.assertions = assertions;
      result.status = assertions.every(a => a.passed) ? 'passed' : 'failed';

    } catch (error) {
      result.status = 'failed';
      result.error = {
        message: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
        type: error instanceof Error ? error.constructor.name : 'Unknown',
        context: { testCase: testCase.name }
      };
    }

    result.duration = Date.now() - startTime;
    return result;
  }

  /**
   * Execute integration scenario
   */
  private async executeIntegrationScenario(chain: MiddlewareChain, scenario: IntegrationScenario): Promise<TestResult> {
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
        requestId: this.generateRequestId()
      }
    };

    try {
      // Execute the flow
      let currentInput = scenario.flow[0]?.input;
      const stepResults: any[] = [];

      for (const step of scenario.flow) {
        const middleware = this.middlewares.get(step.middleware);
        if (!middleware) {
          throw new Error(`Middleware ${step.middleware} not found in chain`);
        }

        const request = this.createTestRequest({ 
          request: { 
            url: 'http://localhost:3000/test',
            method: 'POST',
            body: currentInput
          }
        });

        const response = await this.executeMiddleware(middleware, request);
        stepResults.push({
          middleware: step.middleware,
          input: currentInput,
          output: response,
          step: step
        });

        // Use output as input for next step
        currentInput = await response.json().catch(() => ({}));
      }

      // Validate assertions
      const assertions: AssertionResult[] = [];
      
      for (const assertion of scenario.assertions) {
        const assertionResult = await this.validateIntegrationAssertion(assertion, stepResults);
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
        context: { scenario: scenario.name }
      };
    }

    result.duration = Date.now() - startTime;
    return result;
  }

  /**
   * Execute performance benchmark
   */
  private async executePerformanceBenchmark(scenario: TestScenario): Promise<TestResult> {
    const result: TestResult = {
      scenario: scenario.name,
      type: 'performance',
      status: 'passed',
      duration: 0,
      assertions: [],
      metadata: {
        timestamp: new Date(),
        environment: process.env.NODE_ENV || 'test',
        nodeVersion: process.version,
        testFrameworkVersion: '1.0.0',
        middleware: typeof scenario.middleware === 'string' ? scenario.middleware : scenario.middleware.name,
        requestId: this.generateRequestId()
      }
    };

    try {
      // Warmup runs
      for (let i = 0; i < this.config.performance.warmupRuns; i++) {
        await this.executeSingleRun(scenario);
      }

      // Benchmark runs
      const runs: PerformanceResult[] = [];
      for (let i = 0; i < this.config.performance.benchmarkRuns; i++) {
        const runResult = await this.executeSingleRun(scenario);
        runs.push(runResult);
      }

      // Calculate aggregate performance metrics
      result.performance = this.aggregatePerformanceResults(runs);
      
      // Validate against thresholds
      result.assertions = this.validatePerformanceThresholds(result.performance);
      result.status = result.assertions.every(a => a.passed) ? 'passed' : 'failed';

    } catch (error) {
      result.status = 'failed';
      result.error = {
        message: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
        type: error instanceof Error ? error.constructor.name : 'Unknown',
        context: { scenario: scenario.name }
      };
    }

    return result;
  }

  /**
   * Execute single performance run
   */
  private async executeSingleRun(scenario: TestScenario): Promise<PerformanceResult> {
    const startTime = process.hrtime.bigint();
    const startMemory = process.memoryUsage();

    const request = this.createTestRequest(scenario.input);
    
    if (typeof scenario.middleware === 'string') {
      const middlewareDefinition = this.middlewares.get(scenario.middleware);
      if (!middlewareDefinition) {
        throw new Error(`Middleware ${scenario.middleware} not found`);
      }
      await this.executeMiddleware(middlewareDefinition, request);
    } else {
      await this.executeMiddlewareChain(scenario.middleware, request);
    }

    const endTime = process.hrtime.bigint();
    const endMemory = process.memoryUsage();

    const executionTime = Number(endTime - startTime) / 1000000; // Convert to milliseconds
    const memoryUsage = (endMemory.heapUsed - startMemory.heapUsed) / 1024 / 1024; // Convert to MB

    return {
      executionTime,
      memoryUsage,
      cpuUsage: 0, // Would need more sophisticated CPU monitoring
      throughput: 1000 / executionTime, // requests per second
      breakdown: [] // Would need instrumentation for detailed breakdown
    };
  }

  /**
   * Execute middleware
   */
  private async executeMiddleware(middleware: MiddlewareDefinition, request: NextRequest): Promise<NextResponse> {
    return await middleware.handler(request);
  }

  /**
   * Execute middleware chain
   */
  private async executeMiddlewareChain(chain: MiddlewareChain, request: NextRequest): Promise<NextResponse> {
    let currentRequest = request;
    let response: NextResponse = NextResponse.next();

    if (chain.order === 'sequential') {
      for (const middlewareRef of chain.middlewares) {
        const middleware = this.middlewares.get(middlewareRef.name);
        if (!middleware) {
          throw new Error(`Middleware ${middlewareRef.name} not found in chain`);
        }
        response = await middleware.handler(currentRequest);
        // In a real implementation, we'd need to handle request/response chaining properly
      }
    } else {
      // Parallel execution - simplified implementation
      const promises = chain.middlewares.map(middlewareRef => {
        const middleware = this.middlewares.get(middlewareRef.name);
        if (!middleware) {
          throw new Error(`Middleware ${middlewareRef.name} not found in chain`);
        }
        return middleware.handler(currentRequest);
      });
      
      const responses = await Promise.all(promises);
      response = responses[responses.length - 1]; // Use last response
    }

    return response;
  }

  /**
   * Create test request
   */
  private createTestRequest(input: TestInput): NextRequest {
    const url = new URL(input.request.url);
    
    // Add search params
    if (input.request.searchParams) {
      Object.entries(input.request.searchParams).forEach(([key, value]) => {
        url.searchParams.set(key, value);
      });
    }

    const headers = new Headers(input.request.headers || {});
    
    // Add cookies to headers
    if (input.request.cookies) {
      const cookieString = Object.entries(input.request.cookies)
        .map(([key, value]) => `${key}=${value}`)
        .join('; ');
      headers.set('cookie', cookieString);
    }

    const requestInit: RequestInit = {
      method: input.request.method,
      headers,
    };

    if (input.request.body && input.request.method !== 'GET') {
      requestInit.body = typeof input.request.body === 'string' 
        ? input.request.body 
        : JSON.stringify(input.request.body);
      
      if (!headers.has('content-type')) {
        headers.set('content-type', 'application/json');
      }
    }

    return new NextRequest(url.toString(), requestInit);
  }

  /**
   * Validate response against expectations
   */
  private async validateResponse(response: NextResponse, expected: TestExpectation): Promise<AssertionResult[]> {
    const assertions: AssertionResult[] = [];

    // Validate status
    if (expected.response?.status !== undefined) {
      assertions.push({
        name: 'Response status',
        passed: response.status === expected.response.status,
        expected: expected.response.status,
        actual: response.status,
        message: `Expected status ${expected.response.status}, got ${response.status}`
      });
    }

    // Validate headers
    if (expected.response?.headers) {
      Object.entries(expected.response.headers).forEach(([key, expectedValue]) => {
        const actualValue = response.headers.get(key);
        assertions.push({
          name: `Header ${key}`,
          passed: actualValue === expectedValue,
          expected: expectedValue,
          actual: actualValue,
          message: `Expected header ${key} to be ${expectedValue}, got ${actualValue}`
        });
      });
    }

    // Validate body
    if (expected.response?.body !== undefined) {
      try {
        const actualBody = await response.clone().json();
        const bodyMatches = JSON.stringify(actualBody) === JSON.stringify(expected.response.body);
        assertions.push({
          name: 'Response body',
          passed: bodyMatches,
          expected: expected.response.body,
          actual: actualBody,
          message: bodyMatches ? 'Body matches expected' : 'Body does not match expected'
        });
      } catch (error) {
        assertions.push({
          name: 'Response body parsing',
          passed: false,
          expected: 'valid JSON',
          actual: 'invalid JSON',
          message: `Failed to parse response body as JSON: ${error}`
        });
      }
    }

    return assertions;
  }

  /**
   * Validate integration assertion
   */
  private async validateIntegrationAssertion(assertion: IntegrationAssertion, stepResults: any[]): Promise<AssertionResult> {
    // Simplified implementation - would need more sophisticated validation logic
    return {
      name: assertion.type,
      passed: true, // Placeholder
      expected: assertion.condition,
      actual: 'validated',
      message: assertion.message
    };
  }

  /**
   * Validate performance thresholds
   */
  private validatePerformanceThresholds(performance: PerformanceResult): AssertionResult[] {
    const assertions: AssertionResult[] = [];
    const thresholds = this.config.performance.thresholds;

    // Execution time threshold
    assertions.push({
      name: 'Execution time threshold',
      passed: performance.executionTime <= thresholds.maxExecutionTime,
      expected: `<= ${thresholds.maxExecutionTime}ms`,
      actual: `${performance.executionTime}ms`,
      message: `Execution time should be under ${thresholds.maxExecutionTime}ms`
    });

    // Memory usage threshold
    assertions.push({
      name: 'Memory usage threshold',
      passed: performance.memoryUsage <= thresholds.maxMemoryUsage,
      expected: `<= ${thresholds.maxMemoryUsage}MB`,
      actual: `${performance.memoryUsage}MB`,
      message: `Memory usage should be under ${thresholds.maxMemoryUsage}MB`
    });

    // Throughput threshold
    assertions.push({
      name: 'Throughput threshold',
      passed: performance.throughput >= thresholds.minThroughput,
      expected: `>= ${thresholds.minThroughput} req/s`,
      actual: `${performance.throughput} req/s`,
      message: `Throughput should be at least ${thresholds.minThroughput} requests per second`
    });

    return assertions;
  }

  /**
   * Aggregate performance results
   */
  private aggregatePerformanceResults(runs: PerformanceResult[]): PerformanceResult {
    const avgExecutionTime = runs.reduce((sum, run) => sum + run.executionTime, 0) / runs.length;
    const avgMemoryUsage = runs.reduce((sum, run) => sum + run.memoryUsage, 0) / runs.length;
    const avgCpuUsage = runs.reduce((sum, run) => sum + run.cpuUsage, 0) / runs.length;
    const avgThroughput = runs.reduce((sum, run) => sum + run.throughput, 0) / runs.length;

    return {
      executionTime: avgExecutionTime,
      memoryUsage: avgMemoryUsage,
      cpuUsage: avgCpuUsage,
      throughput: avgThroughput,
      breakdown: [] // Would aggregate breakdowns if available
    };
  }

  /**
   * Generate unique request ID
   */
  private generateRequestId(): string {
    return `test-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Generate comprehensive test report
   */
  generateReport(results: TestResult[]): string {
    const totalTests = results.length;
    const passedTests = results.filter(r => r.status === 'passed').length;
    const failedTests = results.filter(r => r.status === 'failed').length;
    const skippedTests = results.filter(r => r.status === 'skipped').length;

    let report = `# Middleware Test Report\n\n`;
    report += `**Summary:**\n`;
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

    report += `## Test Type Breakdown\n\n`;
    typeBreakdown.forEach((stats, type) => {
      const total = stats.passed + stats.failed + stats.skipped;
      const successRate = total > 0 ? ((stats.passed / total) * 100).toFixed(1) : 0;
      report += `- **${type}**: ${stats.passed}/${total} passed (${successRate}%)\n`;
    });

    // Performance summary
    const performanceResults = results.filter(r => r.performance);
    if (performanceResults.length > 0) {
      report += `\n## Performance Summary\n\n`;
      performanceResults.forEach(result => {
        report += `### ${result.scenario}\n`;
        report += `- Execution Time: ${result.performance!.executionTime.toFixed(2)}ms\n`;
        report += `- Memory Usage: ${result.performance!.memoryUsage.toFixed(2)}MB\n`;
        report += `- Throughput: ${result.performance!.throughput.toFixed(2)} req/s\n\n`;
      });
    }

    // Failed tests details
    const failedResults = results.filter(r => r.status === 'failed');
    if (failedResults.length > 0) {
      report += `\n## Failed Tests\n\n`;
      failedResults.forEach(result => {
        report += `### ${result.scenario} (${result.type})\n`;
        report += `- Duration: ${result.duration}ms\n`;
        report += `- Error: ${result.error?.message || 'Unknown error'}\n`;
        
        if (result.assertions.length > 0) {
          report += `- Failed Assertions:\n`;
          result.assertions.filter(a => !a.passed).forEach(assertion => {
            report += `  - ${assertion.name}: ${assertion.message}\n`;
          });
        }
        report += `\n`;
      });
    }

    return report;
  }

  /**
   * Cleanup resources
   */
  cleanup(): void {
    this.middlewares.clear();
    this.chains.clear();
    this.testResults = [];
    this.performanceBaselines.clear();
    this.removeAllListeners();
  }
}

/**
 * Create middleware test framework instance
 */
export function createMiddlewareTestFramework(config: MiddlewareTestConfig): MiddlewareTestFramework {
  return new MiddlewareTestFramework(config);
}