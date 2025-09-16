/**
 * Middleware Chain Tester Tests
 * 
 * Tests for middleware chain testing utilities including
 * chain validation, execution order testing, and integration scenarios.
 */
import { NextRequest, NextResponse } from 'next/server';
import {
  MiddlewareChainTester,
  createDefaultChainTestConfig,
  type MiddlewareDefinition,
  type MiddlewareChain,
  type IntegrationScenario
} from '../../../../lib/testing/middleware';

describe('MiddlewareChainTester', () => {
  let chainTester: MiddlewareChainTester;
  let authMiddleware: MiddlewareDefinition;
  let rateLimitMiddleware: MiddlewareDefinition;
  let corsMiddleware: MiddlewareDefinition;
  let validationMiddleware: MiddlewareDefinition;

  beforeEach(() => {
    const config = createDefaultChainTestConfig();
    chainTester = new MiddlewareChainTester(config);

    // Create test middlewares
    authMiddleware = {
      name: 'auth',
      handler: async (request: NextRequest) => {
        const authHeader = request.headers.get('authorization');
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
          return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }
        return NextResponse.next();
      },
      dependencies: [],
      priority: 1
    };

    rateLimitMiddleware = {
      name: 'rate-limit',
      handler: async (request: NextRequest) => {
        const rateLimitHeader = request.headers.get('x-rate-limit-remaining');
        if (rateLimitHeader === '0') {
          return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 });
        }
        return NextResponse.next();
      },
      dependencies: [],
      priority: 2
    };

    corsMiddleware = {
      name: 'cors',
      handler: async (request: NextRequest) => {
        const origin = request.headers.get('origin');
        const response = NextResponse.next();
        if (origin) {
          response.headers.set('access-control-allow-origin', origin);
        }
        return response;
      },
      dependencies: [],
      priority: 3
    };

    validationMiddleware = {
      name: 'validation',
      handler: async (request: NextRequest) => {
        if (request.method === 'POST') {
          try {
            const body = await request.json();
            if (!body || typeof body !== 'object') {
              return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
            }
          } catch {
            return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
          }
        }
        return NextResponse.next();
      },
      dependencies: ['auth'],
      priority: 4
    };

    // Register middlewares
    chainTester.registerMiddleware(authMiddleware);
    chainTester.registerMiddleware(rateLimitMiddleware);
    chainTester.registerMiddleware(corsMiddleware);
    chainTester.registerMiddleware(validationMiddleware);
  });

  describe('Chain Validation', () => {
    it('should validate a correct middleware chain', () => {
      const chain: MiddlewareChain = {
        name: 'valid-chain',
        description: 'A valid middleware chain',
        middlewares: [
          { name: 'rate-limit', handler: rateLimitMiddleware.handler, priority: 2 },
          { name: 'cors', handler: corsMiddleware.handler, priority: 3 },
          { name: 'auth', handler: authMiddleware.handler, priority: 1 },
          { name: 'validation', handler: validationMiddleware.handler, priority: 4 }
        ],
        order: 'sequential'
      };

      const validation = chainTester.validateChain(chain);

      expect(validation.isValid).toBe(true);
      expect(validation.issues).toHaveLength(0);
      expect(validation.recommendations).toContain('Chain configuration is valid');
    });

    it('should detect missing middleware dependencies', () => {
      const chain: MiddlewareChain = {
        name: 'invalid-chain',
        description: 'Chain with missing dependencies',
        middlewares: [
          { name: 'validation', handler: validationMiddleware.handler } // Missing 'auth' dependency
        ],
        order: 'sequential'
      };

      const validation = chainTester.validateChain(chain);

      expect(validation.isValid).toBe(false);
      expect(validation.issues).toHaveLength(1);
      expect(validation.issues[0].type).toBe('dependency');
      expect(validation.issues[0].severity).toBe('high');
      expect(validation.issues[0].description).toContain('depends on auth');
    });

    it('should detect incorrect execution order', () => {
      const chain: MiddlewareChain = {
        name: 'wrong-order-chain',
        description: 'Chain with wrong execution order',
        middlewares: [
          { name: 'validation', handler: validationMiddleware.handler, priority: 4 },
          { name: 'auth', handler: authMiddleware.handler, priority: 1 } // Should come before validation
        ],
        order: 'sequential'
      };

      const validation = chainTester.validateChain(chain);

      expect(validation.isValid).toBe(false);
      const orderIssues = validation.issues.filter(i => i.type === 'order');
      expect(orderIssues.length).toBeGreaterThan(0);
    });

    it('should detect performance issues in long chains', () => {
      const longChain: MiddlewareChain = {
        name: 'long-chain',
        description: 'Very long middleware chain',
        middlewares: Array.from({ length: 15 }, (_, i) => ({
          name: `middleware-${i}`,
          handler: async () => NextResponse.next()
        })),
        order: 'sequential'
      };

      const validation = chainTester.validateChain(longChain);

      const performanceIssues = validation.issues.filter(i => i.type === 'performance');
      expect(performanceIssues.length).toBeGreaterThan(0);
      expect(performanceIssues[0].description).toContain('quite long');
    });

    it('should detect unregistered middlewares', () => {
      const chain: MiddlewareChain = {
        name: 'unregistered-chain',
        description: 'Chain with unregistered middleware',
        middlewares: [
          { name: 'unregistered-middleware', handler: async () => NextResponse.next() }
        ],
        order: 'sequential'
      };

      const validation = chainTester.validateChain(chain);

      expect(validation.isValid).toBe(false);
      expect(validation.issues).toHaveLength(1);
      expect(validation.issues[0].type).toBe('dependency');
      expect(validation.issues[0].severity).toBe('critical');
      expect(validation.issues[0].description).toContain('is not registered');
    });
  });

  describe('Chain Execution', () => {
    it('should execute sequential middleware chain correctly', async () => {
      const chain: MiddlewareChain = {
        name: 'sequential-chain',
        description: 'Sequential execution chain',
        middlewares: [
          { name: 'cors', handler: corsMiddleware.handler },
          { name: 'rate-limit', handler: rateLimitMiddleware.handler },
          { name: 'auth', handler: authMiddleware.handler }
        ],
        order: 'sequential'
      };

      const request = new NextRequest('http://localhost:3000/api/test', {
        method: 'GET',
        headers: {
          'origin': 'https://example.com',
          'authorization': 'Bearer valid-token',
          'x-rate-limit-remaining': '10'
        }
      });

      const result = await chainTester.executeChain(chain, request);

      expect(result.success).toBe(true);
      expect(result.executionOrder).toEqual(['cors', 'rate-limit', 'auth']);
      expect(result.intermediateStates).toHaveLength(3);
      expect(result.totalExecutionTime).toBeGreaterThan(0);
    });

    it('should execute parallel middleware chain correctly', async () => {
      const chain: MiddlewareChain = {
        name: 'parallel-chain',
        description: 'Parallel execution chain',
        middlewares: [
          { name: 'cors', handler: corsMiddleware.handler },
          { name: 'rate-limit', handler: rateLimitMiddleware.handler }
        ],
        order: 'parallel'
      };

      const request = new NextRequest('http://localhost:3000/api/test', {
        method: 'GET',
        headers: {
          'origin': 'https://example.com',
          'x-rate-limit-remaining': '10'
        }
      });

      const result = await chainTester.executeChain(chain, request);

      expect(result.success).toBe(true);
      expect(result.executionOrder).toHaveLength(2);
      expect(result.executionOrder).toContain('cors');
      expect(result.executionOrder).toContain('rate-limit');
    });

    it('should handle middleware errors in chain execution', async () => {
      const errorMiddleware: MiddlewareDefinition = {
        name: 'error-middleware',
        handler: async () => {
          throw new Error('Middleware error');
        }
      };

      chainTester.registerMiddleware(errorMiddleware);

      const chain: MiddlewareChain = {
        name: 'error-chain',
        description: 'Chain with error middleware',
        middlewares: [
          { name: 'cors', handler: corsMiddleware.handler },
          { name: 'error-middleware', handler: errorMiddleware.handler }
        ],
        order: 'sequential'
      };

      const request = new NextRequest('http://localhost:3000/api/test');
      const result = await chainTester.executeChain(chain, request);

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.error?.message).toBe('Middleware error');
    });

    it('should capture intermediate states when enabled', async () => {
      const chain: MiddlewareChain = {
        name: 'state-capture-chain',
        description: 'Chain for state capture testing',
        middlewares: [
          { name: 'cors', handler: corsMiddleware.handler },
          { name: 'auth', handler: authMiddleware.handler }
        ],
        order: 'sequential'
      };

      const request = new NextRequest('http://localhost:3000/api/test', {
        headers: {
          'origin': 'https://example.com',
          'authorization': 'Bearer valid-token'
        }
      });

      const result = await chainTester.executeChain(chain, request);

      expect(result.intermediateStates).toHaveLength(2);
      
      result.intermediateStates.forEach(state => {
        expect(state.middlewareName).toBeDefined();
        expect(state.request).toBeDefined();
        expect(state.response).toBeDefined();
        expect(state.executionTime).toBeGreaterThan(0);
        expect(state.timestamp).toBeInstanceOf(Date);
      });
    });
  });

  describe('Integration Scenarios', () => {
    it('should test chain scenarios successfully', async () => {
      const chain: MiddlewareChain = {
        name: 'integration-chain',
        description: 'Integration testing chain',
        middlewares: [
          { name: 'auth', handler: authMiddleware.handler },
          { name: 'validation', handler: validationMiddleware.handler }
        ],
        order: 'sequential'
      };

      const scenarios: IntegrationScenario[] = [
        {
          name: 'Authenticated POST request',
          description: 'Test authenticated POST with validation',
          flow: [
            {
              middleware: 'auth',
              input: { authorization: 'Bearer valid-token' },
              expectedOutput: { authorized: true },
              sideEffects: []
            },
            {
              middleware: 'validation',
              input: { data: { name: 'test' } },
              expectedOutput: { valid: true },
              sideEffects: []
            }
          ],
          assertions: [
            {
              type: 'response',
              target: 'final',
              condition: { status: 200 },
              message: 'Should allow valid authenticated request'
            }
          ]
        }
      ];

      const results = await chainTester.testChainScenarios(chain, scenarios);

      expect(results).toHaveLength(1);
      expect(results[0].scenario).toBe('Authenticated POST request');
      expect(results[0].type).toBe('integration');
    });
  });

  describe('Performance Benchmarking', () => {
    it('should benchmark chain performance', async () => {
      const chain: MiddlewareChain = {
        name: 'benchmark-chain',
        description: 'Chain for performance benchmarking',
        middlewares: [
          { name: 'cors', handler: corsMiddleware.handler },
          { name: 'rate-limit', handler: rateLimitMiddleware.handler }
        ],
        order: 'sequential'
      };

      const request = new NextRequest('http://localhost:3000/api/test', {
        headers: {
          'origin': 'https://example.com',
          'x-rate-limit-remaining': '10'
        }
      });

      const benchmark = await chainTester.benchmarkChain(chain, request, 10);

      expect(benchmark.averageExecutionTime).toBeGreaterThan(0);
      expect(benchmark.minExecutionTime).toBeGreaterThan(0);
      expect(benchmark.maxExecutionTime).toBeGreaterThan(0);
      expect(benchmark.throughput).toBeGreaterThan(0);
      expect(benchmark.memoryUsage.average).toBeGreaterThanOrEqual(0);
      expect(benchmark.memoryUsage.peak).toBeGreaterThanOrEqual(0);
      expect(benchmark.bottlenecks).toHaveLength(2);
      
      // Verify bottlenecks are sorted by execution time
      if (benchmark.bottlenecks.length > 1) {
        expect(benchmark.bottlenecks[0].averageTime).toBeGreaterThanOrEqual(
          benchmark.bottlenecks[1].averageTime
        );
      }
    });

    it('should identify performance bottlenecks', async () => {
      // Create a slow middleware
      const slowMiddleware: MiddlewareDefinition = {
        name: 'slow-middleware',
        handler: async (request: NextRequest) => {
          await new Promise(resolve => setTimeout(resolve, 50));
          return NextResponse.next();
        }
      };

      chainTester.registerMiddleware(slowMiddleware);

      const chain: MiddlewareChain = {
        name: 'bottleneck-chain',
        description: 'Chain with performance bottleneck',
        middlewares: [
          { name: 'cors', handler: corsMiddleware.handler },
          { name: 'slow-middleware', handler: slowMiddleware.handler },
          { name: 'rate-limit', handler: rateLimitMiddleware.handler }
        ],
        order: 'sequential'
      };

      const request = new NextRequest('http://localhost:3000/api/test');
      const benchmark = await chainTester.benchmarkChain(chain, request, 5);

      expect(benchmark.bottlenecks).toHaveLength(3);
      
      // The slow middleware should be the top bottleneck
      const topBottleneck = benchmark.bottlenecks[0];
      expect(topBottleneck.middleware).toBe('slow-middleware');
      expect(topBottleneck.averageTime).toBeGreaterThan(40); // Should be close to 50ms
      expect(topBottleneck.percentage).toBeGreaterThan(50); // Should be majority of execution time
    });
  });

  describe('Error Handling Tests', () => {
    it('should test chain error handling scenarios', async () => {
      const chain: MiddlewareChain = {
        name: 'error-handling-chain',
        description: 'Chain for error handling tests',
        middlewares: [
          { name: 'cors', handler: corsMiddleware.handler },
          { name: 'auth', handler: authMiddleware.handler },
          { name: 'rate-limit', handler: rateLimitMiddleware.handler }
        ],
        order: 'sequential'
      };

      const request = new NextRequest('http://localhost:3000/api/test');

      const errorScenarios = [
        {
          middlewareName: 'auth',
          errorType: 'sync' as const,
          expectedBehavior: 'fail-fast' as const
        },
        {
          middlewareName: 'rate-limit',
          errorType: 'async' as const,
          expectedBehavior: 'fail-fast' as const
        }
      ];

      const results = await chainTester.testChainErrorHandling(chain, request, errorScenarios);

      expect(results).toHaveLength(2);
      
      results.forEach(result => {
        expect(result.scenario).toBeDefined();
        expect(result.success).toBe(false);
        expect(result.behavior).toBe('fail-fast');
        expect(result.error).toBeDefined();
      });
    });

    it('should handle timeout scenarios', async () => {
      const timeoutMiddleware: MiddlewareDefinition = {
        name: 'timeout-middleware',
        handler: async () => {
          return new Promise(() => {
            // Never resolves, causing timeout
          });
        }
      };

      chainTester.registerMiddleware(timeoutMiddleware);

      const chain: MiddlewareChain = {
        name: 'timeout-chain',
        description: 'Chain with timeout middleware',
        middlewares: [
          { name: 'timeout-middleware', handler: timeoutMiddleware.handler }
        ],
        order: 'sequential'
      };

      const request = new NextRequest('http://localhost:3000/api/test');

      const startTime = Date.now();
      const result = await chainTester.executeChain(chain, request);
      const endTime = Date.now();

      expect(result.success).toBe(false);
      expect(result.error?.message).toContain('timed out');
      expect(endTime - startTime).toBeLessThan(15000); // Should timeout before 15 seconds
    });
  });

  describe('Chain Composition', () => {
    it('should handle complex chain compositions', async () => {
      const loggerMiddleware: MiddlewareDefinition = {
        name: 'logger',
        handler: async (request: NextRequest) => {
          // Simulate logging
          console.log(`Request: ${request.method} ${request.url}`);
          return NextResponse.next();
        },
        priority: 0
      };

      const metricsMiddleware: MiddlewareDefinition = {
        name: 'metrics',
        handler: async (request: NextRequest) => {
          // Simulate metrics collection
          return NextResponse.next();
        },
        priority: 5
      };

      chainTester.registerMiddleware(loggerMiddleware);
      chainTester.registerMiddleware(metricsMiddleware);

      const complexChain: MiddlewareChain = {
        name: 'complex-chain',
        description: 'Complex middleware chain with multiple concerns',
        middlewares: [
          { name: 'logger', handler: loggerMiddleware.handler, priority: 0 },
          { name: 'cors', handler: corsMiddleware.handler, priority: 3 },
          { name: 'rate-limit', handler: rateLimitMiddleware.handler, priority: 2 },
          { name: 'auth', handler: authMiddleware.handler, priority: 1 },
          { name: 'validation', handler: validationMiddleware.handler, priority: 4 },
          { name: 'metrics', handler: metricsMiddleware.handler, priority: 5 }
        ],
        order: 'sequential'
      };

      const validation = chainTester.validateChain(complexChain);
      expect(validation.isValid).toBe(true);

      const request = new NextRequest('http://localhost:3000/api/test', {
        method: 'POST',
        headers: {
          'origin': 'https://example.com',
          'authorization': 'Bearer valid-token',
          'x-rate-limit-remaining': '10',
          'content-type': 'application/json'
        },
        body: JSON.stringify({ data: 'test' })
      });

      const result = await chainTester.executeChain(complexChain, request);

      expect(result.success).toBe(true);
      expect(result.executionOrder).toHaveLength(6);
      expect(result.intermediateStates).toHaveLength(6);
    });
  });

  describe('Memory and Resource Management', () => {
    it('should track memory usage during chain execution', async () => {
      const memoryIntensiveMiddleware: MiddlewareDefinition = {
        name: 'memory-intensive',
        handler: async (request: NextRequest) => {
          // Simulate memory-intensive operation
          const largeArray = new Array(10000).fill('data');
          return NextResponse.json({ processed: largeArray.length });
        }
      };

      chainTester.registerMiddleware(memoryIntensiveMiddleware);

      const chain: MiddlewareChain = {
        name: 'memory-chain',
        description: 'Chain for memory usage testing',
        middlewares: [
          { name: 'memory-intensive', handler: memoryIntensiveMiddleware.handler }
        ],
        order: 'sequential'
      };

      const request = new NextRequest('http://localhost:3000/api/test');
      const result = await chainTester.executeChain(chain, request);

      expect(result.success).toBe(true);
      expect(result.intermediateStates).toHaveLength(1);
      expect(result.intermediateStates[0].memoryUsage).toBeGreaterThan(0);
    });
  });
});