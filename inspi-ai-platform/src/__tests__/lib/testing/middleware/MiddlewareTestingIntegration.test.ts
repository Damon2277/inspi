/**
 * Middleware Testing Integration Tests
 *
 * End-to-end integration tests demonstrating the complete middleware testing system
 * including real-world scenarios, performance testing, and comprehensive reporting.
 */
import { NextRequest, NextResponse } from 'next/server';

import {
  MiddlewareTestFramework,
  MiddlewareChainTester,
  createMiddlewareTestFramework,
  createDefaultMiddlewareTestConfig,
  createDefaultChainTestConfig,
  CommonTestScenarios,
  CommonBoundaryTests,
  PerformanceTestHelpers,
  IntegrationTestHelpers,
  MiddlewareTestUtils,
  type MiddlewareDefinition,
  type MiddlewareChain,
  type TestScenario,
} from '../../../../lib/testing/middleware';

describe('Middleware Testing Integration', () => {
  let framework: MiddlewareTestFramework;
  let chainTester: MiddlewareChainTester;

  beforeEach(() => {
    const config = createDefaultMiddlewareTestConfig();
    framework = createMiddlewareTestFramework(config);

    const chainConfig = createDefaultChainTestConfig();
    chainTester = new MiddlewareChainTester(chainConfig);
  });

  afterEach(() => {
    framework.cleanup();
  });

  describe('Real-World Authentication Middleware Testing', () => {
    let authMiddleware: MiddlewareDefinition;

    beforeEach(() => {
      authMiddleware = {
        name: 'jwt-auth',
        handler: async (request: NextRequest) => {
          const authHeader = request.headers.get('authorization');

          if (!authHeader) {
            return NextResponse.json(
              { error: 'Authorization header required' },
              { status: 401 },
            );
          }

          if (!authHeader.startsWith('Bearer ')) {
            return NextResponse.json(
              { error: 'Invalid authorization format' },
              { status: 401 },
            );
          }

          const token = authHeader.substring(7);

          // Simulate JWT validation
          if (token === 'valid-jwt-token') {
            const response = NextResponse.next();
            response.headers.set('x-user-id', '12345');
            response.headers.set('x-user-role', 'admin');
            return response;
          }

          if (token === 'expired-token') {
            return NextResponse.json(
              { error: 'Token expired' },
              { status: 401 },
            );
          }

          return NextResponse.json(
            { error: 'Invalid token' },
            { status: 401 },
          );
        },
      };

      framework.registerMiddleware(authMiddleware);
      chainTester.registerMiddleware(authMiddleware);
    });

    it('should run comprehensive authentication tests', async () => {
      const authScenarios = CommonTestScenarios.authentication();

      // Add custom scenarios
      const customScenarios: TestScenario[] = [
        {
          name: 'Expired token',
          description: 'Test with expired JWT token',
          type: 'functional',
          middleware: 'jwt-auth',
          input: {
            request: {
              url: 'http://localhost:3000/api/protected',
              method: 'GET',
              headers: {
                'authorization': 'Bearer expired-token',
              },
            },
          },
          expected: {
            response: {
              status: 401,
              body: { error: 'Token expired' },
            },
          },
        },
        {
          name: 'Valid token with user context',
          description: 'Test valid token sets user context',
          type: 'functional',
          middleware: 'jwt-auth',
          input: {
            request: {
              url: 'http://localhost:3000/api/protected',
              method: 'GET',
              headers: {
                'authorization': 'Bearer valid-jwt-token',
              },
            },
          },
          expected: {
            response: {
              status: 200,
              headers: {
                'x-user-id': '12345',
                'x-user-role': 'admin',
              },
            },
          },
        },
      ];

      const allScenarios = [...authScenarios, ...customScenarios];
      const results = await framework.runFunctionalTests(allScenarios);

      expect(results.length).toBeGreaterThan(0);

      const passedTests = results.filter(r => r.status === 'passed');
      const failedTests = results.filter(r => r.status === 'failed');

      console.log(`Authentication Tests: ${passedTests.length} passed, ${failedTests.length} failed`);

      // Most tests should pass (we expect some to fail for invalid scenarios)
      expect(passedTests.length).toBeGreaterThan(failedTests.length);
    });

    it('should run boundary tests for authentication', async () => {
      const boundaryTests = [
        ...CommonBoundaryTests.stringField('authorization'),
        {
          name: 'Malformed JWT token',
          description: 'Test with malformed JWT structure',
          input: { authorization: 'Bearer not.a.jwt' },
          expectedBehavior: 'error' as const,
          category: 'malformed' as const,
        },
        {
          name: 'Extremely long token',
          description: 'Test with extremely long token',
          input: { authorization: `Bearer ${'x'.repeat(10000)}` },
          expectedBehavior: 'error' as const,
          category: 'extreme' as const,
        },
      ];

      const results = await framework.runBoundaryTests('jwt-auth', boundaryTests);

      expect(results.length).toBeGreaterThan(0);
      results.forEach(result => {
        expect(result.type).toBe('boundary');
        expect(result.assertions).toBeDefined();
      });
    });

    it('should benchmark authentication performance', async () => {
      const performanceTest = PerformanceTestHelpers.createPerformanceTest(
        'jwt-auth',
        1000,
        50, // 50ms max execution time
      );

      const results = await framework.runPerformanceBenchmarks('jwt-auth', [performanceTest]);

      expect(results).toHaveLength(1);
      expect(results[0].performance).toBeDefined();
      expect(results[0].performance?.executionTime).toBeLessThan(100);
      expect(results[0].performance?.throughput).toBeGreaterThan(10);
    });
  });

  describe('Rate Limiting Middleware Testing', () => {
    let rateLimitMiddleware: MiddlewareDefinition;
    let requestCounts: Map<string, { count: number; resetTime: number }>;

    beforeEach(() => {
      requestCounts = new Map();

      rateLimitMiddleware = {
        name: 'rate-limiter',
        handler: async (request: NextRequest) => {
          const clientIp = request.headers.get('x-forwarded-for') ||
                          request.headers.get('x-real-ip') ||
                          '127.0.0.1';

          const now = Date.now();
          const windowMs = 60000; // 1 minute
          const limit = 10;

          const clientData = requestCounts.get(clientIp) || { count: 0, resetTime: now + windowMs };

          if (now > clientData.resetTime) {
            clientData.count = 0;
            clientData.resetTime = now + windowMs;
          }

          clientData.count++;
          requestCounts.set(clientIp, clientData);

          const response = clientData.count <= limit ? NextResponse.next() :
            NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 });

          response.headers.set('x-rate-limit-limit', limit.toString());
          response.headers.set('x-rate-limit-remaining', Math.max(0, limit - clientData.count).toString());
          response.headers.set('x-rate-limit-reset', clientData.resetTime.toString());

          return response;
        },
      };

      framework.registerMiddleware(rateLimitMiddleware);
      chainTester.registerMiddleware(rateLimitMiddleware);
    });

    it('should test rate limiting scenarios', async () => {
      const rateLimitScenarios = CommonTestScenarios.rateLimiting(10, 60000);

      // Test multiple requests from same IP
      const multipleRequestScenarios: TestScenario[] = [];

      for (let i = 1; i <= 12; i++) {
        multipleRequestScenarios.push({
          name: `Request ${i} from same IP`,
          description: `Test request ${i} from same IP address`,
          type: 'functional',
          middleware: 'rate-limiter',
          input: {
            request: {
              url: 'http://localhost:3000/api/test',
              method: 'GET',
              headers: {
                'x-forwarded-for': '192.168.1.100',
              },
            },
          },
          expected: {
            response: {
              status: i <= 10 ? 200 : 429,
            },
          },
        });
      }

      const results = await framework.runFunctionalTests(multipleRequestScenarios);

      // First 10 requests should pass, next 2 should be rate limited
      const passedRequests = results.filter(r => r.status === 'passed');
      const failedRequests = results.filter(r => r.status === 'failed');

      expect(passedRequests.length).toBe(10);
      expect(failedRequests.length).toBe(2);
    });

    it('should test rate limiting with different IPs', async () => {
      const scenarios: TestScenario[] = [
        {
          name: 'Request from IP 1',
          description: 'Test request from first IP',
          type: 'functional',
          middleware: 'rate-limiter',
          input: {
            request: {
              url: 'http://localhost:3000/api/test',
              method: 'GET',
              headers: { 'x-forwarded-for': '192.168.1.1' },
            },
          },
          expected: {
            response: { status: 200 },
          },
        },
        {
          name: 'Request from IP 2',
          description: 'Test request from second IP',
          type: 'functional',
          middleware: 'rate-limiter',
          input: {
            request: {
              url: 'http://localhost:3000/api/test',
              method: 'GET',
              headers: { 'x-forwarded-for': '192.168.1.2' },
            },
          },
          expected: {
            response: { status: 200 },
          },
        },
      ];

      const results = await framework.runFunctionalTests(scenarios);

      // Both should pass as they're from different IPs
      expect(results.every(r => r.status === 'passed')).toBe(true);
    });
  });

  describe('CORS Middleware Testing', () => {
    let corsMiddleware: MiddlewareDefinition;

    beforeEach(() => {
      const allowedOrigins = ['https://example.com', 'https://app.example.com', 'http://localhost:3000'];

      corsMiddleware = {
        name: 'cors-handler',
        handler: async (request: NextRequest) => {
          const origin = request.headers.get('origin');
          const method = request.method;

          if (method === 'OPTIONS') {
            // Handle preflight request
            const response = new NextResponse(null, { status: 200 });

            if (origin && allowedOrigins.includes(origin)) {
              response.headers.set('access-control-allow-origin', origin);
            }

            response.headers.set('access-control-allow-methods', 'GET, POST, PUT, DELETE, OPTIONS');
            response.headers.set('access-control-allow-headers', 'content-type, authorization');
            response.headers.set('access-control-max-age', '86400');

            return response;
          }

          const response = NextResponse.next();

          if (origin && allowedOrigins.includes(origin)) {
            response.headers.set('access-control-allow-origin', origin);
            response.headers.set('access-control-allow-credentials', 'true');
          }

          return response;
        },
      };

      framework.registerMiddleware(corsMiddleware);
      chainTester.registerMiddleware(corsMiddleware);
    });

    it('should test CORS scenarios comprehensively', async () => {
      const corsScenarios = CommonTestScenarios.cors();

      const additionalScenarios: TestScenario[] = [
        {
          name: 'Disallowed origin',
          description: 'Test request from disallowed origin',
          type: 'functional',
          middleware: 'cors-handler',
          input: {
            request: {
              url: 'http://localhost:3000/api/test',
              method: 'GET',
              headers: { 'origin': 'https://malicious.com' },
            },
          },
          expected: {
            response: {
              status: 200,
              headers: {
                'access-control-allow-origin': undefined, // Should not be set
              },
            },
          },
        },
        {
          name: 'Complex preflight request',
          description: 'Test complex preflight with custom headers',
          type: 'functional',
          middleware: 'cors-handler',
          input: {
            request: {
              url: 'http://localhost:3000/api/test',
              method: 'OPTIONS',
              headers: {
                'origin': 'https://example.com',
                'access-control-request-method': 'PUT',
                'access-control-request-headers': 'content-type, x-custom-header',
              },
            },
          },
          expected: {
            response: {
              status: 200,
              headers: {
                'access-control-allow-origin': 'https://example.com',
                'access-control-allow-methods': 'GET, POST, PUT, DELETE, OPTIONS',
              },
            },
          },
        },
      ];

      const allScenarios = [...corsScenarios, ...additionalScenarios];
      const results = await framework.runFunctionalTests(allScenarios);

      expect(results.length).toBeGreaterThan(0);

      // Check specific CORS header validations
      results.forEach(result => {
        if (result.status === 'passed') {
          expect(result.assertions.length).toBeGreaterThan(0);
        }
      });
    });
  });

  describe('Complete Middleware Chain Integration', () => {
    let authMiddleware: MiddlewareDefinition;
    let rateLimitMiddleware: MiddlewareDefinition;
    let corsMiddleware: MiddlewareDefinition;
    let validationMiddleware: MiddlewareDefinition;

    beforeEach(() => {
      // Simplified versions for integration testing
      authMiddleware = {
        name: 'auth',
        handler: async (request: NextRequest) => {
          const authHeader = request.headers.get('authorization');
          if (!authHeader?.startsWith('Bearer ')) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
          }
          return NextResponse.next();
        },
        priority: 2,
      };

      rateLimitMiddleware = {
        name: 'rate-limit',
        handler: async (request: NextRequest) => {
          const remaining = request.headers.get('x-rate-limit-remaining');
          if (remaining === '0') {
            return NextResponse.json({ error: 'Rate limited' }, { status: 429 });
          }
          return NextResponse.next();
        },
        priority: 1,
      };

      corsMiddleware = {
        name: 'cors',
        handler: async (request: NextRequest) => {
          const response = NextResponse.next();
          const origin = request.headers.get('origin');
          if (origin) {
            response.headers.set('access-control-allow-origin', origin);
          }
          return response;
        },
        priority: 0,
      };

      validationMiddleware = {
        name: 'validation',
        handler: async (request: NextRequest) => {
          if (request.method === 'POST') {
            const contentType = request.headers.get('content-type');
            if (!contentType?.includes('application/json')) {
              return NextResponse.json({ error: 'Invalid content type' }, { status: 400 });
            }
          }
          return NextResponse.next();
        },
        dependencies: ['auth'],
        priority: 3,
      };

      [authMiddleware, rateLimitMiddleware, corsMiddleware, validationMiddleware].forEach(middleware => {
        framework.registerMiddleware(middleware);
        chainTester.registerMiddleware(middleware);
      });
    });

    it('should validate and execute complete middleware chain', async () => {
      const chain: MiddlewareChain = {
        name: 'complete-api-chain',
        description: 'Complete API middleware chain',
        middlewares: [
          { name: 'cors', handler: corsMiddleware.handler, priority: 0 },
          { name: 'rate-limit', handler: rateLimitMiddleware.handler, priority: 1 },
          { name: 'auth', handler: authMiddleware.handler, priority: 2 },
          { name: 'validation', handler: validationMiddleware.handler, priority: 3 },
        ],
        order: 'sequential',
      };

      // Validate chain
      const validation = chainTester.validateChain(chain);
      expect(validation.isValid).toBe(true);

      // Execute successful request
      const successRequest = new NextRequest('http://localhost:3000/api/users', {
        method: 'POST',
        headers: {
          'origin': 'https://example.com',
          'authorization': 'Bearer valid-token',
          'content-type': 'application/json',
          'x-rate-limit-remaining': '5',
        },
        body: JSON.stringify({ name: 'John Doe' }),
      });

      const successResult = await chainTester.executeChain(chain, successRequest);
      expect(successResult.success).toBe(true);
      expect(successResult.executionOrder).toEqual(['cors', 'rate-limit', 'auth', 'validation']);

      // Execute failing request (no auth)
      const failRequest = new NextRequest('http://localhost:3000/api/users', {
        method: 'POST',
        headers: {
          'origin': 'https://example.com',
          'content-type': 'application/json',
          'x-rate-limit-remaining': '5',
        },
        body: JSON.stringify({ name: 'John Doe' }),
      });

      const failResult = await chainTester.executeChain(chain, failRequest);
      expect(failResult.success).toBe(false);
      expect(failResult.finalResponse.status).toBe(401);
    });

    it('should run integration test suite for complete chain', async () => {
      const integrationSuite = IntegrationTestHelpers.createAuthChainTest();

      // Customize for our specific middlewares
      integrationSuite.chain.middlewares = [
        { name: 'auth', handler: authMiddleware.handler },
        { name: 'validation', handler: validationMiddleware.handler },
      ];

      const results = await chainTester.testChainScenarios(integrationSuite.chain, integrationSuite.scenarios);

      expect(results.length).toBeGreaterThan(0);
      results.forEach(result => {
        expect(result.type).toBe('integration');
      });
    });

    it('should benchmark complete chain performance', async () => {
      const chain: MiddlewareChain = {
        name: 'performance-chain',
        description: 'Chain for performance testing',
        middlewares: [
          { name: 'cors', handler: corsMiddleware.handler },
          { name: 'rate-limit', handler: rateLimitMiddleware.handler },
          { name: 'auth', handler: authMiddleware.handler },
          { name: 'validation', handler: validationMiddleware.handler },
        ],
        order: 'sequential',
      };

      const request = new NextRequest('http://localhost:3000/api/test', {
        method: 'POST',
        headers: {
          'origin': 'https://example.com',
          'authorization': 'Bearer valid-token',
          'content-type': 'application/json',
          'x-rate-limit-remaining': '10',
        },
        body: JSON.stringify({ test: 'data' }),
      });

      const benchmark = await chainTester.benchmarkChain(chain, request, 50);

      expect(benchmark.averageExecutionTime).toBeGreaterThan(0);
      expect(benchmark.throughput).toBeGreaterThan(0);
      expect(benchmark.bottlenecks).toHaveLength(4);

      // Verify all middlewares are tracked
      const middlewareNames = benchmark.bottlenecks.map(b => b.middleware);
      expect(middlewareNames).toContain('cors');
      expect(middlewareNames).toContain('rate-limit');
      expect(middlewareNames).toContain('auth');
      expect(middlewareNames).toContain('validation');
    });
  });

  describe('Comprehensive Reporting', () => {
    it('should generate comprehensive test report', async () => {
      // Run various types of tests
      const authMiddleware: MiddlewareDefinition = {
        name: 'report-auth',
        handler: async (request: NextRequest) => {
          const auth = request.headers.get('authorization');
          return auth ? NextResponse.next() : NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        },
      };

      framework.registerMiddleware(authMiddleware);

      // Functional tests
      const functionalScenarios: TestScenario[] = [
        {
          name: 'Valid auth',
          description: 'Test with valid authorization',
          type: 'functional',
          middleware: 'report-auth',
          input: {
            request: {
              url: 'http://localhost:3000/api/test',
              method: 'GET',
              headers: { 'authorization': 'Bearer token' },
            },
          },
          expected: { response: { status: 200 } },
        },
        {
          name: 'Invalid auth',
          description: 'Test without authorization',
          type: 'functional',
          middleware: 'report-auth',
          input: {
            request: {
              url: 'http://localhost:3000/api/test',
              method: 'GET',
            },
          },
          expected: { response: { status: 401 } },
        },
      ];

      // Performance tests
      const performanceScenarios: TestScenario[] = [
        PerformanceTestHelpers.createPerformanceTest('report-auth', 100, 50),
      ];

      // Boundary tests
      const boundaryTests = CommonBoundaryTests.stringField('authorization').slice(0, 3);

      // Run all tests
      const functionalResults = await framework.runFunctionalTests(functionalScenarios);
      const performanceResults = await framework.runPerformanceBenchmarks('report-auth', performanceScenarios);
      const boundaryResults = await framework.runBoundaryTests('report-auth', boundaryTests);

      const allResults = [...functionalResults, ...performanceResults, ...boundaryResults];
      const report = framework.generateReport(allResults);

      // Verify report content
      expect(report).toContain('# Middleware Test Report');
      expect(report).toContain('Total Tests:');
      expect(report).toContain('Passed:');
      expect(report).toContain('Failed:');
      expect(report).toContain('Success Rate:');
      expect(report).toContain('## Test Type Breakdown');
      expect(report).toContain('functional');
      expect(report).toContain('performance');
      expect(report).toContain('boundary');

      if (performanceResults.length > 0) {
        expect(report).toContain('## Performance Summary');
        expect(report).toContain('Execution Time:');
        expect(report).toContain('Memory Usage:');
        expect(report).toContain('Throughput:');
      }

      console.log('Generated Test Report:');
      console.log(report);
    });
  });

  describe('Error Recovery and Resilience', () => {
    it('should handle middleware failures gracefully', async () => {
      const flakyMiddleware: MiddlewareDefinition = {
        name: 'flaky',
        handler: async (request: NextRequest) => {
          const shouldFail = Math.random() < 0.3; // 30% failure rate
          if (shouldFail) {
            throw new Error('Random failure');
          }
          return NextResponse.json({ success: true });
        },
      };

      framework.registerMiddleware(flakyMiddleware);

      const scenarios: TestScenario[] = Array.from({ length: 10 }, (_, i) => ({
        name: `Flaky test ${i + 1}`,
        description: `Test flaky middleware attempt ${i + 1}`,
        type: 'functional',
        middleware: 'flaky',
        input: {
          request: {
            url: 'http://localhost:3000/api/test',
            method: 'GET',
          },
        },
        expected: {
          response: { status: 200 },
        },
      }));

      const results = await framework.runFunctionalTests(scenarios);

      // Some tests should pass, some should fail
      const passedTests = results.filter(r => r.status === 'passed');
      const failedTests = results.filter(r => r.status === 'failed');

      expect(passedTests.length + failedTests.length).toBe(10);
      expect(passedTests.length).toBeGreaterThan(0);
      expect(failedTests.length).toBeGreaterThan(0);

      // Failed tests should have error information
      failedTests.forEach(result => {
        expect(result.error).toBeDefined();
        expect(result.error?.message).toBe('Random failure');
      });
    });
  });
});
