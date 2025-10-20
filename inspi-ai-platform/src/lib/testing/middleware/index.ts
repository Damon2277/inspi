/**
 * Middleware Testing Framework
 *
 * Comprehensive middleware testing utilities including functional testing,
 * boundary testing, integration testing, and performance benchmarking.
 */

// Core framework
export {
  MiddlewareTestFramework,
  createMiddlewareTestFramework,
  type MiddlewareTestConfig,
  type PerformanceThresholds,
  type MiddlewareFunction,
  type MiddlewareChain,
  type MiddlewareDefinition,
  type TestScenario,
  type TestInput,
  type MockConfiguration,
  type TestExpectation,
  type DatabaseExpectation,
  type ExternalCallExpectation,
  type LogExpectation,
  type MetricExpectation,
  type TestResult,
  type AssertionResult,
  type PerformanceResult,
  type PerformanceBreakdown,
  type TestError,
  type TestMetadata,
  type BoundaryTestCase,
  type IntegrationTestSuite,
  type IntegrationScenario,
  type IntegrationStep,
  type IntegrationAssertion,
} from './MiddlewareTestFramework';

// Test utilities
export {
  MiddlewareTestUtils,
  MiddlewareAssertions,
} from './MiddlewareTestUtils';

// Chain testing
export {
  MiddlewareChainTester,
  type ChainTestConfig,
  type ChainExecutionResult,
  type IntermediateState,
  type ChainValidationResult,
  type ChainIssue,
} from './MiddlewareChainTester';

// Convenience functions
export const createDefaultMiddlewareTestConfig = (): MiddlewareTestConfig => ({
  timeout: 5000,
  retries: 3,
  performance: {
    enabled: true,
    warmupRuns: 5,
    benchmarkRuns: 100,
    thresholds: {
      maxExecutionTime: 1000, // 1 second
      maxMemoryUsage: 100, // 100 MB
      maxCpuUsage: 80, // 80%
      minThroughput: 100, // 100 req/s
    },
  },
  logging: {
    enabled: true,
    level: 'info',
    includeStack: false,
  },
  mocking: {
    enabled: true,
    mockExternalServices: true,
    mockDatabase: true,
  },
});

export const createDefaultChainTestConfig = (): ChainTestConfig => ({
  timeout: 10000,
  validateOrder: true,
  captureIntermediateStates: true,
  enablePerformanceTracking: true,
});

// Common middleware test scenarios
export const CommonTestScenarios = {
  /**
   * Authentication middleware test scenarios
   */
  authentication: (): TestScenario[] => [
    {
      name: 'Valid JWT token',
      description: 'Test middleware with valid JWT token',
      type: 'functional',
      middleware: 'auth',
      input: {
        request: {
          url: 'http://localhost:3000/api/protected',
          method: 'GET',
          headers: {
            'authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c',
          },
        },
      },
      expected: {
        response: {
          status: 200,
        },
      },
    },
    {
      name: 'Invalid JWT token',
      description: 'Test middleware with invalid JWT token',
      type: 'functional',
      middleware: 'auth',
      input: {
        request: {
          url: 'http://localhost:3000/api/protected',
          method: 'GET',
          headers: {
            'authorization': 'Bearer invalid-token',
          },
        },
      },
      expected: {
        response: {
          status: 401,
        },
      },
    },
    {
      name: 'Missing authorization header',
      description: 'Test middleware without authorization header',
      type: 'functional',
      middleware: 'auth',
      input: {
        request: {
          url: 'http://localhost:3000/api/protected',
          method: 'GET',
        },
      },
      expected: {
        response: {
          status: 401,
        },
      },
    },
  ],

  /**
   * Rate limiting middleware test scenarios
   */
  rateLimiting: (limit: number = 10, windowMs: number = 60000): TestScenario[] => [
    {
      name: 'Within rate limit',
      description: 'Test requests within rate limit',
      type: 'functional',
      middleware: 'rate-limit',
      input: {
        request: {
          url: 'http://localhost:3000/api/test',
          method: 'GET',
          headers: {
            'x-forwarded-for': '192.168.1.1',
          },
        },
      },
      expected: {
        response: {
          status: 200,
        },
      },
    },
    {
      name: 'Exceeding rate limit',
      description: 'Test requests exceeding rate limit',
      type: 'functional',
      middleware: 'rate-limit',
      input: {
        request: {
          url: 'http://localhost:3000/api/test',
          method: 'GET',
          headers: {
            'x-forwarded-for': '192.168.1.2',
          },
        },
      },
      expected: {
        response: {
          status: 429,
        },
      },
    },
  ],

  /**
   * CORS middleware test scenarios
   */
  cors: (): TestScenario[] => [
    {
      name: 'Same origin request',
      description: 'Test CORS with same origin',
      type: 'functional',
      middleware: 'cors',
      input: {
        request: {
          url: 'http://localhost:3000/api/test',
          method: 'GET',
          headers: {
            'origin': 'http://localhost:3000',
          },
        },
      },
      expected: {
        response: {
          status: 200,
          headers: {
            'access-control-allow-origin': 'http://localhost:3000',
          },
        },
      },
    },
    {
      name: 'Cross origin request',
      description: 'Test CORS with allowed cross origin',
      type: 'functional',
      middleware: 'cors',
      input: {
        request: {
          url: 'http://localhost:3000/api/test',
          method: 'GET',
          headers: {
            'origin': 'https://example.com',
          },
        },
      },
      expected: {
        response: {
          status: 200,
          headers: {
            'access-control-allow-origin': 'https://example.com',
          },
        },
      },
    },
    {
      name: 'Preflight request',
      description: 'Test CORS preflight request',
      type: 'functional',
      middleware: 'cors',
      input: {
        request: {
          url: 'http://localhost:3000/api/test',
          method: 'OPTIONS',
          headers: {
            'origin': 'https://example.com',
            'access-control-request-method': 'POST',
            'access-control-request-headers': 'content-type',
          },
        },
      },
      expected: {
        response: {
          status: 200,
          headers: {
            'access-control-allow-methods': 'POST',
            'access-control-allow-headers': 'content-type',
          },
        },
      },
    },
  ],

  /**
   * Request validation middleware test scenarios
   */
  validation: (): TestScenario[] => [
    {
      name: 'Valid request body',
      description: 'Test validation with valid request body',
      type: 'functional',
      middleware: 'validation',
      input: {
        request: {
          url: 'http://localhost:3000/api/users',
          method: 'POST',
          body: {
            name: 'John Doe',
            email: 'john@example.com',
            age: 30,
          },
        },
      },
      expected: {
        response: {
          status: 200,
        },
      },
    },
    {
      name: 'Invalid request body',
      description: 'Test validation with invalid request body',
      type: 'functional',
      middleware: 'validation',
      input: {
        request: {
          url: 'http://localhost:3000/api/users',
          method: 'POST',
          body: {
            name: '',
            email: 'invalid-email',
            age: -5,
          },
        },
      },
      expected: {
        response: {
          status: 400,
        },
      },
    },
  ],
};

// Common boundary test cases
export const CommonBoundaryTests = {
  /**
   * Generate boundary tests for string fields
   */
  stringField: (fieldName: string): BoundaryTestCase[] =>
    MiddlewareTestUtils.generateBoundaryTestCases(fieldName, 'string'),

  /**
   * Generate boundary tests for number fields
   */
  numberField: (fieldName: string): BoundaryTestCase[] =>
    MiddlewareTestUtils.generateBoundaryTestCases(fieldName, 'number'),

  /**
   * Generate boundary tests for object fields
   */
  objectField: (fieldName: string): BoundaryTestCase[] =>
    MiddlewareTestUtils.generateBoundaryTestCases(fieldName, 'object'),

  /**
   * Generate boundary tests for array fields
   */
  arrayField: (fieldName: string): BoundaryTestCase[] =>
    MiddlewareTestUtils.generateBoundaryTestCases(fieldName, 'array'),
};

// Performance test helpers
export const PerformanceTestHelpers = {
  /**
   * Create performance test scenario
   */
  createPerformanceTest: (
    middlewareName: string,
    requestCount: number = 1000,
    maxExecutionTime: number = 100,
  ): TestScenario => ({
    name: `${middlewareName} performance test`,
    description: `Performance test for ${middlewareName} middleware`,
    type: 'performance',
    middleware: middlewareName,
    input: {
      request: {
        url: 'http://localhost:3000/api/test',
        method: 'GET',
      },
    },
    expected: {
      performance: {
        maxExecutionTime,
        minThroughput: requestCount / (maxExecutionTime / 1000),
      },
    },
  }),

  /**
   * Create load test scenario
   */
  createLoadTest: (
    middlewareName: string,
    concurrentRequests: number = 100,
    duration: number = 60000,
  ): TestScenario => ({
    name: `${middlewareName} load test`,
    description: `Load test for ${middlewareName} middleware`,
    type: 'performance',
    middleware: middlewareName,
    input: {
      request: {
        url: 'http://localhost:3000/api/test',
        method: 'GET',
      },
    },
    expected: {
      performance: {
        maxExecutionTime: duration,
        minThroughput: concurrentRequests,
      },
    },
  }),
};

// Integration test helpers
export const IntegrationTestHelpers = {
  /**
   * Create authentication + authorization chain test
   */
  createAuthChainTest: (): IntegrationTestSuite => ({
    name: 'Authentication and Authorization Chain',
    description: 'Test authentication followed by authorization',
    chain: {
      name: 'auth-chain',
      description: 'Authentication and authorization middleware chain',
      middlewares: [
        { name: 'auth', handler: async () => NextResponse.next() },
        { name: 'authz', handler: async () => NextResponse.next() },
      ],
      order: 'sequential',
    },
    scenarios: [
      {
        name: 'Valid user with permissions',
        description: 'Test valid authenticated user with required permissions',
        flow: [
          {
            middleware: 'auth',
            input: { token: 'valid-token' },
            expectedOutput: { user: { id: '123', role: 'admin' } },
            sideEffects: [],
          },
          {
            middleware: 'authz',
            input: { user: { id: '123', role: 'admin' }, resource: 'users' },
            expectedOutput: { authorized: true },
            sideEffects: [],
          },
        ],
        assertions: [
          {
            type: 'response',
            target: 'final',
            condition: { status: 200 },
            message: 'Should allow access for authorized user',
          },
        ],
      },
    ],
  }),

  /**
   * Create rate limiting + CORS chain test
   */
  createRateLimitCorsChainTest: (): IntegrationTestSuite => ({
    name: 'Rate Limiting and CORS Chain',
    description: 'Test rate limiting followed by CORS handling',
    chain: {
      name: 'rate-cors-chain',
      description: 'Rate limiting and CORS middleware chain',
      middlewares: [
        { name: 'rate-limit', handler: async () => NextResponse.next() },
        { name: 'cors', handler: async () => NextResponse.next() },
      ],
      order: 'sequential',
    },
    scenarios: [
      {
        name: 'Cross-origin request within rate limit',
        description: 'Test cross-origin request that passes rate limiting',
        flow: [
          {
            middleware: 'rate-limit',
            input: { ip: '192.168.1.1', endpoint: '/api/test' },
            expectedOutput: { allowed: true },
            sideEffects: [],
          },
          {
            middleware: 'cors',
            input: { origin: 'https://example.com', method: 'GET' },
            expectedOutput: { corsHeaders: { 'access-control-allow-origin': 'https://example.com' } },
            sideEffects: [],
          },
        ],
        assertions: [
          {
            type: 'response',
            target: 'final',
            condition: { status: 200 },
            message: 'Should allow cross-origin request within rate limit',
          },
        ],
      },
    ],
  }),
};

const middlewareTesting = {
  MiddlewareTestFramework,
  MiddlewareTestUtils,
  MiddlewareAssertions,
  MiddlewareChainTester,
  createMiddlewareTestFramework,
  createDefaultMiddlewareTestConfig,
  createDefaultChainTestConfig,
  CommonTestScenarios,
  CommonBoundaryTests,
  PerformanceTestHelpers,
  IntegrationTestHelpers,
};

export default middlewareTesting;
