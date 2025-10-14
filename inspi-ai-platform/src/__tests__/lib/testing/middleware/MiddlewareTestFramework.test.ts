/**
 * Middleware Test Framework Tests
 *
 * Comprehensive tests for the middleware testing framework including
 * functional tests, boundary tests, integration tests, and performance benchmarks.
 */
import { NextRequest, NextResponse } from 'next/server';

import {
  MiddlewareTestFramework,
  createMiddlewareTestFramework,
  createDefaultMiddlewareTestConfig,
  MiddlewareTestUtils,
  MiddlewareAssertions,
  type MiddlewareDefinition,
  type TestScenario,
  type BoundaryTestCase,
  type IntegrationTestSuite,
} from '../../../../lib/testing/middleware';

describe('MiddlewareTestFramework', () => {
  let framework: MiddlewareTestFramework;
  let mockMiddleware: MiddlewareDefinition;

  beforeEach(() => {
    const config = createDefaultMiddlewareTestConfig();
    framework = createMiddlewareTestFramework(config);

    // Create mock middleware
    mockMiddleware = {
      name: 'test-middleware',
      handler: async (request: NextRequest) => {
        const url = new URL(request.url);
        if (url.pathname === '/error') {
          throw new Error('Test error');
        }
        return NextResponse.json({ message: 'success' }, { status: 200 });
      },
    };

    framework.registerMiddleware(mockMiddleware);
  });

  afterEach(() => {
    framework.cleanup();
  });

  describe('Middleware Registration', () => {
    it('should register middleware successfully', () => {
      const newMiddleware: MiddlewareDefinition = {
        name: 'new-middleware',
        handler: async () => NextResponse.next(),
      };

      expect(() => framework.registerMiddleware(newMiddleware)).not.toThrow();
    });

    it('should emit middlewareRegistered event', (done) => {
      framework.on('middlewareRegistered', (data) => {
        expect(data.name).toBe('event-middleware');
        done();
      });

      const eventMiddleware: MiddlewareDefinition = {
        name: 'event-middleware',
        handler: async () => NextResponse.next(),
      };

      framework.registerMiddleware(eventMiddleware);
    });
  });

  describe('Functional Tests', () => {
    it('should run functional tests successfully', async () => {
      const scenarios: TestScenario[] = [
        {
          name: 'Successful request',
          description: 'Test successful middleware execution',
          type: 'functional',
          middleware: 'test-middleware',
          input: {
            request: {
              url: 'http://localhost:3000/api/test',
              method: 'GET',
            },
          },
          expected: {
            response: {
              status: 200,
              body: { message: 'success' },
            },
          },
        },
      ];

      const results = await framework.runFunctionalTests(scenarios);

      expect(results).toHaveLength(1);
      expect(results[0].status).toBe('passed');
      expect(results[0].scenario).toBe('Successful request');
      expect(results[0].type).toBe('functional');
    });

    it('should handle middleware errors in functional tests', async () => {
      const scenarios: TestScenario[] = [
        {
          name: 'Error request',
          description: 'Test middleware error handling',
          type: 'functional',
          middleware: 'test-middleware',
          input: {
            request: {
              url: 'http://localhost:3000/error',
              method: 'GET',
            },
          },
          expected: {
            errors: {
              shouldThrow: true,
              errorMessage: 'Test error',
            },
          },
        },
      ];

      const results = await framework.runFunctionalTests(scenarios);

      expect(results).toHaveLength(1);
      expect(results[0].status).toBe('failed');
      expect(results[0].error).toBeDefined();
      expect(results[0].error?.message).toBe('Test error');
    });

    it('should validate response assertions', async () => {
      const scenarios: TestScenario[] = [
        {
          name: 'Response validation',
          description: 'Test response validation',
          type: 'functional',
          middleware: 'test-middleware',
          input: {
            request: {
              url: 'http://localhost:3000/api/test',
              method: 'GET',
            },
          },
          expected: {
            response: {
              status: 200,
              headers: {
                'content-type': 'application/json',
              },
            },
          },
        },
      ];

      const results = await framework.runFunctionalTests(scenarios);

      expect(results[0].assertions).toBeDefined();
      expect(results[0].assertions.length).toBeGreaterThan(0);

      const statusAssertion = results[0].assertions.find(a => a.name === 'Response status');
      expect(statusAssertion).toBeDefined();
      expect(statusAssertion?.passed).toBe(true);
    });
  });

  describe('Boundary Tests', () => {
    it('should run boundary tests for different input types', async () => {
      const testCases: BoundaryTestCase[] = [
        {
          name: 'Null input',
          description: 'Test with null input',
          input: null,
          expectedBehavior: 'error',
          category: 'null',
        },
        {
          name: 'Empty object',
          description: 'Test with empty object',
          input: {},
          expectedBehavior: 'error',
          category: 'empty',
        },
        {
          name: 'Large input',
          description: 'Test with extremely large input',
          input: { data: 'x'.repeat(10000) },
          expectedBehavior: 'error',
          category: 'extreme',
        },
      ];

      const results = await framework.runBoundaryTests('test-middleware', testCases);

      expect(results).toHaveLength(3);
      results.forEach(result => {
        expect(result.type).toBe('boundary');
        expect(result.assertions).toBeDefined();
      });
    });

    it('should generate boundary test cases automatically', () => {
      const stringCases = MiddlewareTestUtils.generateBoundaryTestCases('name', 'string');
      const numberCases = MiddlewareTestUtils.generateBoundaryTestCases('age', 'number');
      const objectCases = MiddlewareTestUtils.generateBoundaryTestCases('data', 'object');

      expect(stringCases.length).toBeGreaterThan(0);
      expect(numberCases.length).toBeGreaterThan(0);
      expect(objectCases.length).toBeGreaterThan(0);

      // Check that different categories are covered
      const categories = stringCases.map(c => c.category);
      expect(categories).toContain('null');
      expect(categories).toContain('empty');
      expect(categories).toContain('extreme');
    });
  });

  describe('Integration Tests', () => {
    it('should run integration test suites', async () => {
      // Register additional middleware for chain testing
      const authMiddleware: MiddlewareDefinition = {
        name: 'auth',
        handler: async (request: NextRequest) => {
          const authHeader = request.headers.get('authorization');
          if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
          }
          return NextResponse.next();
        },
      };

      framework.registerMiddleware(authMiddleware);

      const suite: IntegrationTestSuite = {
        name: 'Auth Integration',
        description: 'Test authentication integration',
        chain: {
          name: 'auth-chain',
          description: 'Authentication chain',
          middlewares: [
            { name: 'auth', handler: authMiddleware.handler },
            { name: 'test-middleware', handler: mockMiddleware.handler },
          ],
          order: 'sequential',
        },
        scenarios: [
          {
            name: 'Authenticated request',
            description: 'Test authenticated request flow',
            flow: [
              {
                middleware: 'auth',
                input: { authorization: 'Bearer valid-token' },
                expectedOutput: { authorized: true },
                sideEffects: [],
              },
              {
                middleware: 'test-middleware',
                input: { data: 'test' },
                expectedOutput: { message: 'success' },
                sideEffects: [],
              },
            ],
            assertions: [
              {
                type: 'response',
                target: 'final',
                condition: { status: 200 },
                message: 'Should return success for authenticated request',
              },
            ],
          },
        ],
      };

      const results = await framework.runIntegrationTests([suite]);

      expect(results).toHaveLength(1);
      expect(results[0].type).toBe('integration');
    });
  });

  describe('Performance Benchmarks', () => {
    it('should run performance benchmarks', async () => {
      const scenarios: TestScenario[] = [
        {
          name: 'Performance test',
          description: 'Test middleware performance',
          type: 'performance',
          middleware: 'test-middleware',
          input: {
            request: {
              url: 'http://localhost:3000/api/test',
              method: 'GET',
            },
          },
          expected: {
            performance: {
              maxExecutionTime: 1000,
              minThroughput: 100,
            },
          },
        },
      ];

      const results = await framework.runPerformanceBenchmarks('test-middleware', scenarios);

      expect(results).toHaveLength(1);
      expect(results[0].type).toBe('performance');
      expect(results[0].performance).toBeDefined();
      expect(results[0].performance?.executionTime).toBeGreaterThan(0);
      expect(results[0].performance?.throughput).toBeGreaterThan(0);
    });

    it('should validate performance thresholds', async () => {
      // Create a slow middleware for testing
      const slowMiddleware: MiddlewareDefinition = {
        name: 'slow-middleware',
        handler: async (request: NextRequest) => {
          await new Promise(resolve => setTimeout(resolve, 100)); // 100ms delay
          return NextResponse.json({ message: 'slow response' });
        },
      };

      framework.registerMiddleware(slowMiddleware);

      const scenarios: TestScenario[] = [
        {
          name: 'Slow performance test',
          description: 'Test slow middleware performance',
          type: 'performance',
          middleware: 'slow-middleware',
          input: {
            request: {
              url: 'http://localhost:3000/api/test',
              method: 'GET',
            },
          },
          expected: {
            performance: {
              maxExecutionTime: 50, // Threshold lower than actual execution time
              minThroughput: 1000,
            },
          },
        },
      ];

      const results = await framework.runPerformanceBenchmarks('slow-middleware', scenarios);

      expect(results[0].assertions).toBeDefined();
      const executionTimeAssertion = results[0].assertions.find(a => a.name === 'Execution time threshold');
      expect(executionTimeAssertion).toBeDefined();
      expect(executionTimeAssertion?.passed).toBe(false);
    });
  });

  describe('Test Utilities', () => {
    it('should create mock requests correctly', () => {
      const request = MiddlewareTestUtils.createMockRequest({
        url: 'http://localhost:3000/api/test',
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: { data: 'test' },
        cookies: { session: 'abc123' },
        searchParams: { filter: 'active' },
      });

      expect(request.url).toContain('/api/test');
      expect(request.method).toBe('POST');
      expect(request.headers.get('content-type')).toBe('application/json');
      expect(request.headers.get('cookie')).toContain('session=abc123');
      expect(request.url).toContain('filter=active');
    });

    it('should create mock responses correctly', () => {
      const response = MiddlewareTestUtils.createMockResponse({
        status: 201,
        statusText: 'Created',
        headers: { 'x-custom': 'value' },
        body: { id: 123 },
        cookies: { token: 'xyz789' },
      });

      expect(response.status).toBe(201);
      expect(response.statusText).toBe('Created');
      expect(response.headers.get('x-custom')).toBe('value');
      expect(response.cookies.get('token')?.value).toBe('xyz789');
    });

    it('should generate test data for different scenarios', () => {
      const validData = MiddlewareTestUtils.generateTestData('valid');
      const invalidData = MiddlewareTestUtils.generateTestData('invalid');
      const edgeData = MiddlewareTestUtils.generateTestData('edge');
      const maliciousData = MiddlewareTestUtils.generateTestData('malicious');

      expect(validData).toHaveProperty('id');
      expect(validData).toHaveProperty('name');
      expect(validData).toHaveProperty('email');

      expect(invalidData.email).toBe('not-an-email');
      expect(invalidData.age).toBe(-5);

      expect(edgeData.name).toHaveLength(1000);
      expect(edgeData.tags).toEqual([]);

      expect(maliciousData.id).toContain('<script>');
      expect(maliciousData.name).toContain('DROP TABLE');
    });

    it('should create middleware spies', async () => {
      const spy = MiddlewareTestUtils.createMiddlewareSpy(async (request) => {
        return NextResponse.json({ spied: true });
      });

      const request = MiddlewareTestUtils.createMockRequest();
      const response = await spy.middleware(request);

      expect(spy.calls).toHaveLength(1);
      expect(spy.calls[0].request).toBe(request);
      expect(spy.calls[0].response).toBe(response);
      expect(spy.calls[0].timestamp).toBeInstanceOf(Date);

      spy.reset();
      expect(spy.calls).toHaveLength(0);
    });

    it('should measure middleware performance', async () => {
      const middleware = async (request: NextRequest) => {
        await new Promise(resolve => setTimeout(resolve, 10));
        return NextResponse.json({ measured: true });
      };

      const request = MiddlewareTestUtils.createMockRequest();
      const performance = await MiddlewareTestUtils.measurePerformance(middleware, request, 10);

      expect(performance.averageTime).toBeGreaterThan(0);
      expect(performance.minTime).toBeGreaterThan(0);
      expect(performance.maxTime).toBeGreaterThan(0);
      expect(performance.totalTime).toBeGreaterThan(0);
      expect(performance.throughput).toBeGreaterThan(0);
      expect(performance.averageTime).toBeGreaterThanOrEqual(performance.minTime);
      expect(performance.maxTime).toBeGreaterThanOrEqual(performance.averageTime);
    });
  });

  describe('Middleware Assertions', () => {
    it('should assert middleware was called', async () => {
      const spy = MiddlewareTestUtils.createMiddlewareSpy();
      const request = MiddlewareTestUtils.createMockRequest();

      // Before calling
      let assertion = MiddlewareAssertions.wasCalled(spy);
      expect(assertion.passed).toBe(false);

      // After calling
      await spy.middleware(request);
      assertion = MiddlewareAssertions.wasCalled(spy);
      expect(assertion.passed).toBe(true);
    });

    it('should assert middleware was called specific number of times', async () => {
      const spy = MiddlewareTestUtils.createMiddlewareSpy();
      const request = MiddlewareTestUtils.createMockRequest();

      await spy.middleware(request);
      await spy.middleware(request);

      const assertion = MiddlewareAssertions.wasCalledTimes(spy, 2);
      expect(assertion.passed).toBe(true);

      const wrongAssertion = MiddlewareAssertions.wasCalledTimes(spy, 3);
      expect(wrongAssertion.passed).toBe(false);
    });

    it('should assert middleware was called with specific request', async () => {
      const spy = MiddlewareTestUtils.createMiddlewareSpy();
      const request = MiddlewareTestUtils.createMockRequest({
        url: 'http://localhost:3000/api/specific',
        method: 'POST',
        headers: { 'x-test': 'value' },
      });

      await spy.middleware(request);

      const assertion = MiddlewareAssertions.wasCalledWith(spy, {
        url: '/api/specific',
        method: 'POST',
        headers: { 'x-test': 'value' },
      });
      expect(assertion.passed).toBe(true);

      const wrongAssertion = MiddlewareAssertions.wasCalledWith(spy, {
        url: '/api/different',
        method: 'GET',
      });
      expect(wrongAssertion.passed).toBe(false);
    });

    it('should assert response properties', () => {
      const response = MiddlewareTestUtils.createMockResponse({
        status: 200,
        headers: { 'x-custom': 'test' },
      });

      const assertion = MiddlewareAssertions.responseHas(response, {
        status: 200,
        headers: { 'x-custom': 'test' },
      });
      expect(assertion.passed).toBe(true);

      const wrongAssertion = MiddlewareAssertions.responseHas(response, {
        status: 404,
        headers: { 'x-custom': 'wrong' },
      });
      expect(wrongAssertion.passed).toBe(false);
    });

    it('should assert execution time within threshold', () => {
      const assertion = MiddlewareAssertions.executionTimeWithin(50, 100);
      expect(assertion.passed).toBe(true);

      const wrongAssertion = MiddlewareAssertions.executionTimeWithin(150, 100);
      expect(wrongAssertion.passed).toBe(false);
    });

    it('should assert middleware throws expected error', async () => {
      const errorMiddleware = async (request: NextRequest) => {
        throw new TypeError('Custom error message');
      };

      const request = MiddlewareTestUtils.createMockRequest();

      const assertion = await MiddlewareAssertions.throwsError(errorMiddleware, request, {
        type: 'TypeError',
        message: 'Custom error message',
      });
      expect(assertion.passed).toBe(true);

      const wrongAssertion = await MiddlewareAssertions.throwsError(errorMiddleware, request, {
        type: 'ReferenceError',
        message: 'Different message',
      });
      expect(wrongAssertion.passed).toBe(false);
    });
  });

  describe('Report Generation', () => {
    it('should generate comprehensive test report', async () => {
      const scenarios: TestScenario[] = [
        {
          name: 'Test 1',
          description: 'Passing test',
          type: 'functional',
          middleware: 'test-middleware',
          input: {
            request: {
              url: 'http://localhost:3000/api/test',
              method: 'GET',
            },
          },
          expected: {
            response: { status: 200 },
          },
        },
        {
          name: 'Test 2',
          description: 'Failing test',
          type: 'functional',
          middleware: 'test-middleware',
          input: {
            request: {
              url: 'http://localhost:3000/error',
              method: 'GET',
            },
          },
          expected: {
            response: { status: 200 },
          },
        },
      ];

      const results = await framework.runFunctionalTests(scenarios);
      const report = framework.generateReport(results);

      expect(report).toContain('# Middleware Test Report');
      expect(report).toContain('Total Tests: 2');
      expect(report).toContain('Passed: 1');
      expect(report).toContain('Failed: 1');
      expect(report).toContain('Success Rate: 50.0%');
      expect(report).toContain('## Test Type Breakdown');
      expect(report).toContain('## Failed Tests');
    });
  });

  describe('Error Handling', () => {
    it('should handle middleware registration errors gracefully', () => {
      // This test ensures the framework doesn't crash on edge cases
      expect(() => {
        framework.registerMiddleware({
          name: '',
          handler: async () => NextResponse.next(),
        });
      }).not.toThrow();
    });

    it('should handle test execution timeouts', async () => {
      const timeoutMiddleware: MiddlewareDefinition = {
        name: 'timeout-middleware',
        handler: async () => {
          return new Promise(() => {
            // Never resolves, causing timeout
          });
        },
      };

      framework.registerMiddleware(timeoutMiddleware);

      const scenarios: TestScenario[] = [
        {
          name: 'Timeout test',
          description: 'Test middleware timeout',
          type: 'functional',
          middleware: 'timeout-middleware',
          input: {
            request: {
              url: 'http://localhost:3000/api/test',
              method: 'GET',
            },
          },
          expected: {
            response: { status: 200 },
          },
        },
      ];

      // This should complete within reasonable time due to timeout handling
      const startTime = Date.now();
      const results = await framework.runFunctionalTests(scenarios);
      const endTime = Date.now();

      expect(endTime - startTime).toBeLessThan(10000); // Should timeout before 10 seconds
      expect(results[0].status).toBe('failed');
    });
  });

  describe('Cleanup', () => {
    it('should cleanup resources properly', () => {
      framework.registerMiddleware({
        name: 'cleanup-test',
        handler: async () => NextResponse.next(),
      });

      expect(() => framework.cleanup()).not.toThrow();

      // After cleanup, the framework should be in a clean state
      // This is more of a smoke test to ensure cleanup doesn't crash
    });
  });
});
