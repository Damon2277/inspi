/**
 * Middleware Test Utilities
 *
 * Utility functions and helpers for middleware testing including
 * request/response mocking, assertion helpers, and test data generation.
 */
import { NextRequest, NextResponse } from 'next/server';

import {
  BoundaryTestCase,
  TestInput,
  MockConfiguration,
  MiddlewareFunction,
} from './MiddlewareTestFramework';

export class MiddlewareTestUtils {
  /**
   * Create mock NextRequest for testing
   */
  static createMockRequest(options: {
    url?: string;
    method?: string;
    headers?: Record<string, string>;
    body?: any;
    cookies?: Record<string, string>;
    searchParams?: Record<string, string>;
  } = {}): NextRequest {
    const {
      url = 'http://localhost:3000/api/test',
      method = 'GET',
      headers = {},
      body,
      cookies = {},
      searchParams = {},
    } = options;

    const requestUrl = new URL(url);

    // Add search params
    Object.entries(searchParams).forEach(([key, value]) => {
      requestUrl.searchParams.set(key, value);
    });

    const requestHeaders = new Headers(headers);

    // Add cookies
    if (Object.keys(cookies).length > 0) {
      const cookieString = Object.entries(cookies)
        .map(([key, value]) => `${key}=${value}`)
        .join('; ');
      requestHeaders.set('cookie', cookieString);
    }

    const requestInit: RequestInit = {
      method,
      headers: requestHeaders,
    };

    if (body && method !== 'GET') {
      requestInit.body = typeof body === 'string' ? body : JSON.stringify(body);
      if (!requestHeaders.has('content-type')) {
        requestHeaders.set('content-type', 'application/json');
      }
    }

    return new NextRequest(requestUrl.toString(), requestInit);
  }

  /**
   * Create mock NextResponse for testing
   */
  static createMockResponse(options: {
    status?: number;
    statusText?: string;
    headers?: Record<string, string>;
    body?: any;
    cookies?: Record<string, string>;
  } = {}): NextResponse {
    const {
      status = 200,
      statusText = 'OK',
      headers = {},
      body,
      cookies = {},
    } = options;

    let response: NextResponse;

    if (body !== undefined) {
      const bodyString = typeof body === 'string' ? body : JSON.stringify(body);
      response = new NextResponse(bodyString, {
        status,
        statusText,
        headers: {
          'content-type': 'application/json',
          ...headers,
        },
      });
    } else {
      response = new NextResponse(null, {
        status,
        statusText,
        headers,
      });
    }

    // Add cookies
    Object.entries(cookies).forEach(([key, value]) => {
      response.cookies.set(key, value);
    });

    return response;
  }

  /**
   * Generate boundary test cases for common scenarios
   */
  static generateBoundaryTestCases(fieldName: string, fieldType: 'string' | 'number' | 'object' | 'array'): BoundaryTestCase[] {
    const cases: BoundaryTestCase[] = [];

    // Null values
    cases.push({
      name: `${fieldName} - null value`,
      description: `Test ${fieldName} with null value`,
      input: { [fieldName]: null },
      expectedBehavior: 'error',
      category: 'null',
    });

    // Undefined values
    cases.push({
      name: `${fieldName} - undefined value`,
      description: `Test ${fieldName} with undefined value`,
      input: { [fieldName]: undefined },
      expectedBehavior: 'error',
      category: 'undefined',
    });

    // Empty values
    switch (fieldType) {
      case 'string':
        cases.push({
          name: `${fieldName} - empty string`,
          description: `Test ${fieldName} with empty string`,
          input: { [fieldName]: '' },
          expectedBehavior: 'error',
          category: 'empty',
        });

        cases.push({
          name: `${fieldName} - whitespace only`,
          description: `Test ${fieldName} with whitespace only`,
          input: { [fieldName]: '   ' },
          expectedBehavior: 'error',
          category: 'empty',
        });

        cases.push({
          name: `${fieldName} - extremely long string`,
          description: `Test ${fieldName} with extremely long string`,
          input: { [fieldName]: 'a'.repeat(10000) },
          expectedBehavior: 'error',
          category: 'extreme',
        });

        cases.push({
          name: `${fieldName} - special characters`,
          description: `Test ${fieldName} with special characters`,
          input: { [fieldName]: '<script>alert("xss")</script>' },
          expectedBehavior: 'error',
          category: 'malformed',
        });
        break;

      case 'number':
        cases.push({
          name: `${fieldName} - zero`,
          description: `Test ${fieldName} with zero`,
          input: { [fieldName]: 0 },
          expectedBehavior: 'success',
          category: 'empty',
        });

        cases.push({
          name: `${fieldName} - negative number`,
          description: `Test ${fieldName} with negative number`,
          input: { [fieldName]: -1 },
          expectedBehavior: 'error',
          category: 'invalid',
        });

        cases.push({
          name: `${fieldName} - extremely large number`,
          description: `Test ${fieldName} with extremely large number`,
          input: { [fieldName]: Number.MAX_SAFE_INTEGER },
          expectedBehavior: 'error',
          category: 'extreme',
        });

        cases.push({
          name: `${fieldName} - NaN`,
          description: `Test ${fieldName} with NaN`,
          input: { [fieldName]: NaN },
          expectedBehavior: 'error',
          category: 'invalid',
        });

        cases.push({
          name: `${fieldName} - Infinity`,
          description: `Test ${fieldName} with Infinity`,
          input: { [fieldName]: Infinity },
          expectedBehavior: 'error',
          category: 'extreme',
        });
        break;

      case 'object':
        cases.push({
          name: `${fieldName} - empty object`,
          description: `Test ${fieldName} with empty object`,
          input: { [fieldName]: {} },
          expectedBehavior: 'error',
          category: 'empty',
        });

        cases.push({
          name: `${fieldName} - circular reference`,
          description: `Test ${fieldName} with circular reference`,
          input: (() => {
            const obj: any = { [fieldName]: {} };
            obj[fieldName].circular = obj;
            return obj;
          })(),
          expectedBehavior: 'error',
          category: 'malformed',
        });

        cases.push({
          name: `${fieldName} - deeply nested object`,
          description: `Test ${fieldName} with deeply nested object`,
          input: { [fieldName]: this.createDeeplyNestedObject(100) },
          expectedBehavior: 'error',
          category: 'extreme',
        });
        break;

      case 'array':
        cases.push({
          name: `${fieldName} - empty array`,
          description: `Test ${fieldName} with empty array`,
          input: { [fieldName]: [] },
          expectedBehavior: 'error',
          category: 'empty',
        });

        cases.push({
          name: `${fieldName} - extremely large array`,
          description: `Test ${fieldName} with extremely large array`,
          input: { [fieldName]: new Array(10000).fill('item') },
          expectedBehavior: 'error',
          category: 'extreme',
        });
        break;
    }

    return cases;
  }

  /**
   * Create deeply nested object for testing
   */
  private static createDeeplyNestedObject(depth: number): any {
    if (depth <= 0) return 'leaf';
    return { nested: this.createDeeplyNestedObject(depth - 1) };
  }

  /**
   * Generate test data for different scenarios
   */
  static generateTestData(scenario: 'valid' | 'invalid' | 'edge' | 'malicious'): any {
    switch (scenario) {
      case 'valid':
        return {
          id: '123e4567-e89b-12d3-a456-426614174000',
          name: 'Test User',
          email: 'test@example.com',
          age: 25,
          active: true,
          tags: ['user', 'test'],
          metadata: {
            created: new Date().toISOString(),
            source: 'test',
          },
        };

      case 'invalid':
        return {
          id: 'invalid-uuid',
          name: '',
          email: 'not-an-email',
          age: -5,
          active: 'not-boolean',
          tags: 'not-array',
          metadata: null,
        };

      case 'edge':
        return {
          id: '',
          name: 'a'.repeat(1000),
          email: 'test+' + 'a'.repeat(100) + '@example.com',
          age: 0,
          active: false,
          tags: [],
          metadata: {},
        };

      case 'malicious':
        return {
          id: '<script>alert("xss")</script>',
          name: '"; DROP TABLE users; --',
          email: 'test@example.com<script>alert("xss")</script>',
          age: '${process.env.SECRET}',
          active: '{{constructor.constructor("return process")().env}}',
          tags: ['<img src=x onerror=alert("xss")>'],
          metadata: {
            '__proto__': { admin: true },
            'constructor': { prototype: { admin: true } },
          },
        };

      default:
        return {};
    }
  }

  /**
   * Create middleware spy for testing
   */
  static createMiddlewareSpy(implementation?: MiddlewareFunction): {
    middleware: MiddlewareFunction;
    calls: Array<{ request: NextRequest; response: NextResponse; timestamp: Date }>;
    reset: () => void;
  } {
    const calls: Array<{ request: NextRequest; response: NextResponse; timestamp: Date }> = [];

    const middleware: MiddlewareFunction = async (request: NextRequest) => {
      const timestamp = new Date();
      let response: NextResponse;

      if (implementation) {
        response = await implementation(request);
      } else {
        response = NextResponse.next();
      }

      calls.push({ request, response, timestamp });
      return response;
    };

    return {
      middleware,
      calls,
      reset: () => calls.splice(0, calls.length),
    };
  }

  /**
   * Create middleware mock with predefined responses
   */
  static createMiddlewareMock(responses: NextResponse[]): MiddlewareFunction {
    let callCount = 0;

    return async (request: NextRequest) => {
      const response = responses[callCount % responses.length];
      callCount++;
      return response;
    };
  }

  /**
   * Assert middleware execution order
   */
  static assertExecutionOrder(
    spies: Array<{ calls: any[] }>,
    expectedOrder: number[],
  ): { passed: boolean; message: string } {
    const actualOrder: number[] = [];
    const allCalls: Array<{ spyIndex: number; timestamp: Date }> = [];

    // Collect all calls with spy index
    spies.forEach((spy, index) => {
      spy.calls.forEach(call => {
        allCalls.push({ spyIndex: index, timestamp: call.timestamp });
      });
    });

    // Sort by timestamp to get execution order
    allCalls.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());

    // Extract spy indices in order
    allCalls.forEach(call => {
      if (!actualOrder.includes(call.spyIndex)) {
        actualOrder.push(call.spyIndex);
      }
    });

    const passed = JSON.stringify(actualOrder) === JSON.stringify(expectedOrder);
    const message = passed
      ? 'Middleware execution order is correct'
      : `Expected order ${expectedOrder}, got ${actualOrder}`;

    return { passed, message };
  }

  /**
   * Measure middleware performance
   */
  static async measurePerformance(
    middleware: MiddlewareFunction,
    request: NextRequest,
    iterations: number = 100,
  ): Promise<{
    averageTime: number;
    minTime: number;
    maxTime: number;
    totalTime: number;
    throughput: number;
  }> {
    const times: number[] = [];

    for (let i = 0; i < iterations; i++) {
      const startTime = process.hrtime.bigint();
      await middleware(request);
      const endTime = process.hrtime.bigint();

      const executionTime = Number(endTime - startTime) / 1000000; // Convert to milliseconds
      times.push(executionTime);
    }

    const totalTime = times.reduce((sum, time) => sum + time, 0);
    const averageTime = totalTime / iterations;
    const minTime = Math.min(...times);
    const maxTime = Math.max(...times);
    const throughput = (iterations / totalTime) * 1000; // requests per second

    return {
      averageTime,
      minTime,
      maxTime,
      totalTime,
      throughput,
    };
  }

  /**
   * Validate middleware response
   */
  static validateResponse(
    response: NextResponse,
    expectations: {
      status?: number;
      headers?: Record<string, string>;
      body?: any;
      cookies?: Record<string, string>;
    },
  ): Array<{ name: string; passed: boolean; message: string }> {
    const validations: Array<{ name: string; passed: boolean; message: string }> = [];

    // Validate status
    if (expectations.status !== undefined) {
      const passed = response.status === expectations.status;
      validations.push({
        name: 'Status Code',
        passed,
        message: passed
          ? `Status code is ${expectations.status}`
          : `Expected status ${expectations.status}, got ${response.status}`,
      });
    }

    // Validate headers
    if (expectations.headers) {
      Object.entries(expectations.headers).forEach(([key, expectedValue]) => {
        const actualValue = response.headers.get(key);
        const passed = actualValue === expectedValue;
        validations.push({
          name: `Header ${key}`,
          passed,
          message: passed
            ? `Header ${key} is ${expectedValue}`
            : `Expected header ${key} to be ${expectedValue}, got ${actualValue}`,
        });
      });
    }

    // Validate cookies
    if (expectations.cookies) {
      Object.entries(expectations.cookies).forEach(([key, expectedValue]) => {
        const actualValue = response.cookies.get(key)?.value;
        const passed = actualValue === expectedValue;
        validations.push({
          name: `Cookie ${key}`,
          passed,
          message: passed
            ? `Cookie ${key} is ${expectedValue}`
            : `Expected cookie ${key} to be ${expectedValue}, got ${actualValue}`,
        });
      });
    }

    return validations;
  }

  /**
   * Create error middleware for testing error handling
   */
  static createErrorMiddleware(errorType: 'sync' | 'async' | 'timeout', message: string = 'Test error'): MiddlewareFunction {
    return async (request: NextRequest) => {
      switch (errorType) {
        case 'sync':
          throw new Error(message);

        case 'async':
          return new Promise((_, reject) => {
            setTimeout(() => reject(new Error(message)), 10);
          });

        case 'timeout':
          return new Promise(() => {
            // Never resolves, simulating timeout
          });

        default:
          throw new Error(message);
      }
    };
  }

  /**
   * Create rate limiting test scenarios
   */
  static createRateLimitingScenarios(limit: number, windowMs: number): TestInput[] {
    const scenarios: TestInput[] = [];
    const baseUrl = 'http://localhost:3000/api/test';

    // Within limit
    for (let i = 0; i < limit; i++) {
      scenarios.push({
        request: {
          url: baseUrl,
          method: 'GET',
          headers: { 'x-forwarded-for': '192.168.1.1' },
        },
      });
    }

    // Exceeding limit
    scenarios.push({
      request: {
        url: baseUrl,
        method: 'GET',
        headers: { 'x-forwarded-for': '192.168.1.1' },
      },
    });

    return scenarios;
  }

  /**
   * Create authentication test scenarios
   */
  static createAuthTestScenarios(): TestInput[] {
    return [
      // Valid token
      {
        request: {
          url: 'http://localhost:3000/api/protected',
          method: 'GET',
          headers: { 'authorization': 'Bearer valid-token-123' },
        },
      },
      // Invalid token
      {
        request: {
          url: 'http://localhost:3000/api/protected',
          method: 'GET',
          headers: { 'authorization': 'Bearer invalid-token' },
        },
      },
      // Missing token
      {
        request: {
          url: 'http://localhost:3000/api/protected',
          method: 'GET',
        },
      },
      // Malformed authorization header
      {
        request: {
          url: 'http://localhost:3000/api/protected',
          method: 'GET',
          headers: { 'authorization': 'InvalidFormat token' },
        },
      },
      // Expired token
      {
        request: {
          url: 'http://localhost:3000/api/protected',
          method: 'GET',
          headers: { 'authorization': 'Bearer expired-token' },
        },
      },
    ];
  }

  /**
   * Create CORS test scenarios
   */
  static createCORSTestScenarios(): TestInput[] {
    return [
      // Same origin
      {
        request: {
          url: 'http://localhost:3000/api/test',
          method: 'GET',
          headers: { 'origin': 'http://localhost:3000' },
        },
      },
      // Allowed origin
      {
        request: {
          url: 'http://localhost:3000/api/test',
          method: 'GET',
          headers: { 'origin': 'https://example.com' },
        },
      },
      // Disallowed origin
      {
        request: {
          url: 'http://localhost:3000/api/test',
          method: 'GET',
          headers: { 'origin': 'https://malicious.com' },
        },
      },
      // Preflight request
      {
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
    ];
  }

  /**
   * Create request validation test scenarios
   */
  static createValidationTestScenarios(): TestInput[] {
    return [
      // Valid request
      {
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
      // Missing required fields
      {
        request: {
          url: 'http://localhost:3000/api/users',
          method: 'POST',
          body: {
            name: 'John Doe',
            // Missing email and age
          },
        },
      },
      // Invalid field types
      {
        request: {
          url: 'http://localhost:3000/api/users',
          method: 'POST',
          body: {
            name: 123, // Should be string
            email: 'not-an-email',
            age: 'thirty', // Should be number
          },
        },
      },
      // Invalid field values
      {
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
    ];
  }
}

/**
 * Middleware test assertions
 */
export class MiddlewareAssertions {
  /**
   * Assert that middleware was called
   */
  static wasCalled(spy: { calls: any[] }): { passed: boolean; message: string } {
    const passed = spy.calls.length > 0;
    return {
      passed,
      message: passed ? 'Middleware was called' : 'Middleware was not called',
    };
  }

  /**
   * Assert that middleware was called specific number of times
   */
  static wasCalledTimes(spy: { calls: any[] }, expectedTimes: number): { passed: boolean; message: string } {
    const actualTimes = spy.calls.length;
    const passed = actualTimes === expectedTimes;
    return {
      passed,
      message: passed
        ? `Middleware was called ${expectedTimes} times`
        : `Expected middleware to be called ${expectedTimes} times, but was called ${actualTimes} times`,
    };
  }

  /**
   * Assert that middleware was called with specific request
   */
  static wasCalledWith(
    spy: { calls: Array<{ request: NextRequest }> },
    expectedRequest: Partial<{ url: string; method: string; headers: Record<string, string> }>,
  ): { passed: boolean; message: string } {
    const matchingCalls = spy.calls.filter(call => {
      const request = call.request;

      if (expectedRequest.url && !request.url.includes(expectedRequest.url)) {
        return false;
      }

      if (expectedRequest.method && request.method !== expectedRequest.method) {
        return false;
      }

      if (expectedRequest.headers) {
        for (const [key, value] of Object.entries(expectedRequest.headers)) {
          if (request.headers.get(key) !== value) {
            return false;
          }
        }
      }

      return true;
    });

    const passed = matchingCalls.length > 0;
    return {
      passed,
      message: passed
        ? 'Middleware was called with expected request'
        : 'Middleware was not called with expected request',
    };
  }

  /**
   * Assert that response has expected properties
   */
  static responseHas(
    response: NextResponse,
    expected: { status?: number; headers?: Record<string, string>; body?: any },
  ): { passed: boolean; message: string } {
    const failures: string[] = [];

    if (expected.status !== undefined && response.status !== expected.status) {
      failures.push(`Expected status ${expected.status}, got ${response.status}`);
    }

    if (expected.headers) {
      for (const [key, value] of Object.entries(expected.headers)) {
        const actualValue = response.headers.get(key);
        if (actualValue !== value) {
          failures.push(`Expected header ${key} to be ${value}, got ${actualValue}`);
        }
      }
    }

    const passed = failures.length === 0;
    return {
      passed,
      message: passed ? 'Response has expected properties' : failures.join('; '),
    };
  }

  /**
   * Assert that middleware execution time is within threshold
   */
  static executionTimeWithin(actualTime: number, maxTime: number): { passed: boolean; message: string } {
    const passed = actualTime <= maxTime;
    return {
      passed,
      message: passed
        ? `Execution time ${actualTime}ms is within threshold ${maxTime}ms`
        : `Execution time ${actualTime}ms exceeds threshold ${maxTime}ms`,
    };
  }

  /**
   * Assert that middleware throws expected error
   */
  static async throwsError(
    middleware: MiddlewareFunction,
    request: NextRequest,
    expectedError?: { type?: string; message?: string },
  ): Promise<{ passed: boolean; message: string }> {
    try {
      await middleware(request);
      return {
        passed: false,
        message: 'Expected middleware to throw error, but it did not',
      };
    } catch (error) {
      if (!expectedError) {
        return {
          passed: true,
          message: 'Middleware threw error as expected',
        };
      }

      const failures: string[] = [];

      if (expectedError.type && error.constructor.name !== expectedError.type) {
        failures.push(`Expected error type ${expectedError.type}, got ${error.constructor.name}`);
      }

      if (expectedError.message && error.message !== expectedError.message) {
        failures.push(`Expected error message "${expectedError.message}", got "${error.message}"`);
      }

      const passed = failures.length === 0;
      return {
        passed,
        message: passed ? 'Middleware threw expected error' : failures.join('; '),
      };
    }
  }
}
