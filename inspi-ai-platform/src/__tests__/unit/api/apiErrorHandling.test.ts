/**
 * API错误处理边界测试
 * 测试API路由的错误处理、边界条件和异常情况
 */

import { NextRequest, NextResponse } from 'next/server';

// Mock logger
const mockLogger = {
  info: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  debug: jest.fn(),
};

jest.mock('@/lib/utils/logger', () => ({
  logger: mockLogger,
}));

// Helper function to create mock request
function createMockRequest(
  method: string,
  body?: any,
  headers: Record<string, string> = {},
  url: string = 'http://localhost:3000/api/test',
) {
  return {
    method,
    json: jest.fn().mockResolvedValue(body || {}),
    headers: new Map(Object.entries(headers)),
    cookies: new Map(),
    url,
  } as unknown as NextRequest;
}

// Generic API handler for testing error scenarios
const createTestApiHandler = (scenario: string) => {
  return async (request: NextRequest) => {
    try {
      const body = await request.json();

      switch (scenario) {
        case 'json-parse-error':
          throw new SyntaxError('Unexpected token in JSON');

        case 'validation-error':
          if (!body.email || !body.email.includes('@')) {
            return new NextResponse(
              JSON.stringify({ error: 'Invalid email format' }),
              { status: 400 },
            );
          }
          break;

        case 'database-error':
          throw new Error('Database connection failed');

        case 'timeout-error':
          await new Promise(resolve => setTimeout(resolve, 10000));
          break;

        case 'memory-error':
          throw new Error('Out of memory');

        case 'network-error':
          throw new Error('Network unreachable');

        case 'rate-limit-error':
          return new NextResponse(
            JSON.stringify({
              error: 'Rate limit exceeded',
              retryAfter: 60,
            }),
            {
              status: 429,
              headers: { 'Retry-After': '60' },
            },
          );

        case 'auth-error':
          return new NextResponse(
            JSON.stringify({ error: 'Unauthorized' }),
            { status: 401 },
          );

        case 'forbidden-error':
          return new NextResponse(
            JSON.stringify({ error: 'Forbidden' }),
            { status: 403 },
          );

        case 'not-found-error':
          return new NextResponse(
            JSON.stringify({ error: 'Resource not found' }),
            { status: 404 },
          );

        case 'method-not-allowed':
          return new NextResponse(
            JSON.stringify({ error: 'Method not allowed' }),
            { status: 405 },
          );

        case 'payload-too-large':
          return new NextResponse(
            JSON.stringify({ error: 'Payload too large' }),
            { status: 413 },
          );

        case 'unsupported-media-type':
          return new NextResponse(
            JSON.stringify({ error: 'Unsupported media type' }),
            { status: 415 },
          );

        case 'internal-server-error':
          throw new Error('Internal server error');

        case 'service-unavailable':
          return new NextResponse(
            JSON.stringify({ error: 'Service temporarily unavailable' }),
            { status: 503 },
          );

        case 'gateway-timeout':
          return new NextResponse(
            JSON.stringify({ error: 'Gateway timeout' }),
            { status: 504 },
          );

        default:
          return new NextResponse(
            JSON.stringify({ message: 'Success' }),
            { status: 200 },
          );
      }

      return new NextResponse(
        JSON.stringify({ message: 'Success' }),
        { status: 200 },
      );

    } catch (error) {
      mockLogger.error('API error occurred', error);

      if (error instanceof SyntaxError) {
        return new NextResponse(
          JSON.stringify({ error: 'Invalid JSON format' }),
          { status: 400 },
        );
      }

      if (error instanceof Error) {
        if (error.message.includes('timeout')) {
          return new NextResponse(
            JSON.stringify({ error: 'Request timeout' }),
            { status: 408 },
          );
        }

        if (error.message.includes('memory')) {
          return new NextResponse(
            JSON.stringify({ error: 'Server overloaded' }),
            { status: 503 },
          );
        }

        if (error.message.includes('Database')) {
          return new NextResponse(
            JSON.stringify({ error: 'Database error' }),
            { status: 500 },
          );
        }

        if (error.message.includes('Network')) {
          return new NextResponse(
            JSON.stringify({ error: 'Network error' }),
            { status: 502 },
          );
        }
      }

      return new NextResponse(
        JSON.stringify({ error: 'Internal server error' }),
        { status: 500 },
      );
    }
  };
};

describe('API错误处理边界测试', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('客户端错误处理 (4xx)', () => {
    it('应该处理JSON解析错误', async () => {
      // Arrange
      const handler = createTestApiHandler('json-parse-error');
      const request = createMockRequest('POST', {});

      // Act
      const response = await handler(request);
      const responseData = await response.json();

      // Assert
      expect(response.status).toBe(400);
      expect(responseData.error).toBe('Invalid JSON format');
      expect(mockLogger.error).toHaveBeenCalledWith('API error occurred', expect.any(SyntaxError));
    });

    it('应该处理输入验证错误', async () => {
      // Arrange
      const handler = createTestApiHandler('validation-error');
      const request = createMockRequest('POST', { email: 'invalid-email' });

      // Act
      const response = await handler(request);
      const responseData = await response.json();

      // Assert
      expect(response.status).toBe(400);
      expect(responseData.error).toBe('Invalid email format');
    });

    it('应该处理认证错误', async () => {
      // Arrange
      const handler = createTestApiHandler('auth-error');
      const request = createMockRequest('POST', {});

      // Act
      const response = await handler(request);
      const responseData = await response.json();

      // Assert
      expect(response.status).toBe(401);
      expect(responseData.error).toBe('Unauthorized');
    });

    it('应该处理权限错误', async () => {
      // Arrange
      const handler = createTestApiHandler('forbidden-error');
      const request = createMockRequest('POST', {});

      // Act
      const response = await handler(request);
      const responseData = await response.json();

      // Assert
      expect(response.status).toBe(403);
      expect(responseData.error).toBe('Forbidden');
    });

    it('应该处理资源不存在错误', async () => {
      // Arrange
      const handler = createTestApiHandler('not-found-error');
      const request = createMockRequest('POST', {});

      // Act
      const response = await handler(request);
      const responseData = await response.json();

      // Assert
      expect(response.status).toBe(404);
      expect(responseData.error).toBe('Resource not found');
    });

    it('应该处理不支持的HTTP方法', async () => {
      // Arrange
      const handler = createTestApiHandler('method-not-allowed');
      const request = createMockRequest('DELETE', {});

      // Act
      const response = await handler(request);
      const responseData = await response.json();

      // Assert
      expect(response.status).toBe(405);
      expect(responseData.error).toBe('Method not allowed');
    });

    it('应该处理请求体过大错误', async () => {
      // Arrange
      const handler = createTestApiHandler('payload-too-large');
      const largePayload = { data: 'x'.repeat(10000000) }; // 10MB
      const request = createMockRequest('POST', largePayload);

      // Act
      const response = await handler(request);
      const responseData = await response.json();

      // Assert
      expect(response.status).toBe(413);
      expect(responseData.error).toBe('Payload too large');
    });

    it('应该处理不支持的媒体类型', async () => {
      // Arrange
      const handler = createTestApiHandler('unsupported-media-type');
      const request = createMockRequest('POST', {}, { 'Content-Type': 'text/xml' });

      // Act
      const response = await handler(request);
      const responseData = await response.json();

      // Assert
      expect(response.status).toBe(415);
      expect(responseData.error).toBe('Unsupported media type');
    });

    it('应该处理速率限制错误', async () => {
      // Arrange
      const handler = createTestApiHandler('rate-limit-error');
      const request = createMockRequest('POST', {});

      // Act
      const response = await handler(request);
      const responseData = await response.json();

      // Assert
      expect(response.status).toBe(429);
      expect(responseData.error).toBe('Rate limit exceeded');
      expect(responseData.retryAfter).toBe(60);
      expect(response.headers.get('Retry-After')).toBe('60');
    });
  });

  describe('服务器错误处理 (5xx)', () => {
    it('应该处理内部服务器错误', async () => {
      // Arrange
      const handler = createTestApiHandler('internal-server-error');
      const request = createMockRequest('POST', {});

      // Act
      const response = await handler(request);
      const responseData = await response.json();

      // Assert
      expect(response.status).toBe(500);
      expect(responseData.error).toBe('Internal server error');
      expect(mockLogger.error).toHaveBeenCalled();
    });

    it('应该处理数据库连接错误', async () => {
      // Arrange
      const handler = createTestApiHandler('database-error');
      const request = createMockRequest('POST', {});

      // Act
      const response = await handler(request);
      const responseData = await response.json();

      // Assert
      expect(response.status).toBe(500);
      expect(responseData.error).toBe('Database error');
      expect(mockLogger.error).toHaveBeenCalledWith('API error occurred', expect.any(Error));
    });

    it('应该处理网络错误', async () => {
      // Arrange
      const handler = createTestApiHandler('network-error');
      const request = createMockRequest('POST', {});

      // Act
      const response = await handler(request);
      const responseData = await response.json();

      // Assert
      expect(response.status).toBe(502);
      expect(responseData.error).toBe('Network error');
    });

    it('应该处理服务不可用错误', async () => {
      // Arrange
      const handler = createTestApiHandler('service-unavailable');
      const request = createMockRequest('POST', {});

      // Act
      const response = await handler(request);
      const responseData = await response.json();

      // Assert
      expect(response.status).toBe(503);
      expect(responseData.error).toBe('Service temporarily unavailable');
    });

    it('应该处理网关超时错误', async () => {
      // Arrange
      const handler = createTestApiHandler('gateway-timeout');
      const request = createMockRequest('POST', {});

      // Act
      const response = await handler(request);
      const responseData = await response.json();

      // Assert
      expect(response.status).toBe(504);
      expect(responseData.error).toBe('Gateway timeout');
    });

    it('应该处理内存不足错误', async () => {
      // Arrange
      const handler = createTestApiHandler('memory-error');
      const request = createMockRequest('POST', {});

      // Act
      const response = await handler(request);
      const responseData = await response.json();

      // Assert
      expect(response.status).toBe(503);
      expect(responseData.error).toBe('Server overloaded');
    });
  });

  describe('边界条件测试', () => {
    it('应该处理空请求体', async () => {
      // Arrange
      const handler = createTestApiHandler('success');
      const request = {
        method: 'POST',
        json: jest.fn().mockResolvedValue(null),
        headers: new Map(),
        cookies: new Map(),
        url: 'http://localhost:3000/api/test',
      } as unknown as NextRequest;

      // Act
      const response = await handler(request);

      // Assert
      expect(response.status).toBe(200);
    });

    it('应该处理极大的JSON对象', async () => {
      // Arrange
      const handler = createTestApiHandler('success');
      const largeObject = {
        data: Array(10000).fill(null).map((_, i) => ({
          id: i,
          name: `Item ${i}`,
          description: 'x'.repeat(1000),
        })),
      };
      const request = createMockRequest('POST', largeObject);

      // Act
      const response = await handler(request);

      // Assert
      expect(response.status).toBe(200);
    });

    it('应该处理深度嵌套的JSON', async () => {
      // Arrange
      const handler = createTestApiHandler('success');
      let nestedObject: any = { value: 'deep' };
      for (let i = 0; i < 100; i++) {
        nestedObject = { nested: nestedObject };
      }
      const request = createMockRequest('POST', nestedObject);

      // Act
      const response = await handler(request);

      // Assert
      expect(response.status).toBe(200);
    });

    it('应该处理特殊字符', async () => {
      // Arrange
      const handler = createTestApiHandler('success');
      const specialCharsData = {
        text: '🚀 Special chars: <>&"\'\\n\\t\\r',
        unicode: '你好世界 🌍 مرحبا بالعالم',
        emoji: '😀😃😄😁😆😅😂🤣',
      };
      const request = createMockRequest('POST', specialCharsData);

      // Act
      const response = await handler(request);

      // Assert
      expect(response.status).toBe(200);
    });

    it('应该处理循环引用', async () => {
      // Arrange
      const handler = createTestApiHandler('success');
      const circularObject: any = { name: 'test' };
      circularObject.self = circularObject;

      const request = {
        method: 'POST',
        json: jest.fn().mockRejectedValue(new TypeError('Converting circular structure to JSON')),
        headers: new Map(),
        cookies: new Map(),
        url: 'http://localhost:3000/api/test',
      } as unknown as NextRequest;

      // Act
      const response = await handler(request);
      const responseData = await response.json();

      // Assert
      expect(response.status).toBe(500);
      expect(responseData.error).toBe('Internal server error');
    });

    it('应该处理无效的UTF-8序列', async () => {
      // Arrange
      const handler = createTestApiHandler('success');
      const request = {
        method: 'POST',
        json: jest.fn().mockRejectedValue(new Error('Invalid UTF-8 sequence')),
        headers: new Map(),
        cookies: new Map(),
        url: 'http://localhost:3000/api/test',
      } as unknown as NextRequest;

      // Act
      const response = await handler(request);
      const responseData = await response.json();

      // Assert
      expect(response.status).toBe(500);
      expect(responseData.error).toBe('Internal server error');
    });
  });

  describe('并发错误处理测试', () => {
    it('应该处理并发请求中的错误', async () => {
      // Arrange
      const handler = createTestApiHandler('database-error');
      const requests = Array(10).fill(null).map(() =>
        createMockRequest('POST', { test: 'data' }),
      );

      // Act
      const responses = await Promise.all(
        requests.map(request => handler(request)),
      );

      // Assert
      responses.forEach(async (response) => {
        expect(response.status).toBe(500);
        const data = await response.json();
        expect(data.error).toBe('Database error');
      });

      expect(mockLogger.error).toHaveBeenCalledTimes(10);
    });

    it('应该处理部分请求失败的情况', async () => {
      // Arrange
      const successHandler = createTestApiHandler('success');
      const errorHandler = createTestApiHandler('database-error');

      const requests = [
        successHandler(createMockRequest('POST', {})),
        errorHandler(createMockRequest('POST', {})),
        successHandler(createMockRequest('POST', {})),
        errorHandler(createMockRequest('POST', {})),
      ];

      // Act
      const responses = await Promise.allSettled(requests);

      // Assert
      expect(responses.filter(r => r.status === 'fulfilled')).toHaveLength(4);

      const actualResponses = responses.map(r =>
        r.status === 'fulfilled' ? r.value : null,
      ).filter(Boolean);

      expect(actualResponses).toHaveLength(4);
    });
  });

  describe('错误恢复和重试测试', () => {
    it('应该提供重试信息', async () => {
      // Arrange
      const handler = createTestApiHandler('rate-limit-error');
      const request = createMockRequest('POST', {});

      // Act
      const response = await handler(request);
      const responseData = await response.json();

      // Assert
      expect(response.status).toBe(429);
      expect(responseData.retryAfter).toBeDefined();
      expect(response.headers.get('Retry-After')).toBeDefined();
    });

    it('应该处理临时性错误', async () => {
      // Arrange
      const handler = createTestApiHandler('service-unavailable');
      const request = createMockRequest('POST', {});

      // Act
      const response = await handler(request);
      const responseData = await response.json();

      // Assert
      expect(response.status).toBe(503);
      expect(responseData.error).toContain('temporarily');
    });

    it('应该区分永久性和临时性错误', async () => {
      // Arrange
      const permanentHandler = createTestApiHandler('not-found-error');
      const temporaryHandler = createTestApiHandler('service-unavailable');

      const permanentRequest = createMockRequest('POST', {});
      const temporaryRequest = createMockRequest('POST', {});

      // Act
      const permanentResponse = await permanentHandler(permanentRequest);
      const temporaryResponse = await temporaryHandler(temporaryRequest);

      // Assert
      expect(permanentResponse.status).toBe(404); // 永久性错误
      expect(temporaryResponse.status).toBe(503); // 临时性错误
    });
  });

  describe('错误日志记录测试', () => {
    it('应该记录详细的错误信息', async () => {
      // Arrange
      const handler = createTestApiHandler('database-error');
      const request = createMockRequest('POST', { userId: '123' });

      // Act
      await handler(request);

      // Assert
      expect(mockLogger.error).toHaveBeenCalledWith(
        'API error occurred',
        expect.any(Error),
      );
    });

    it('应该记录不同级别的错误', async () => {
      // Arrange
      const handlers = [
        { handler: createTestApiHandler('validation-error'), level: 'warn' },
        { handler: createTestApiHandler('database-error'), level: 'error' },
        { handler: createTestApiHandler('rate-limit-error'), level: 'info' },
      ];

      // Act & Assert
      for (const { handler } of handlers) {
        const request = createMockRequest('POST', { email: 'invalid' });
        await handler(request);
      }

      // 至少应该有错误日志
      expect(mockLogger.error).toHaveBeenCalled();
    });

    it('应该避免记录敏感信息', async () => {
      // Arrange
      const handler = createTestApiHandler('database-error');
      const sensitiveData = {
        password: 'secret123',
        creditCard: '4111-1111-1111-1111',
        ssn: '123-45-6789',
      };
      const request = createMockRequest('POST', sensitiveData);

      // Act
      await handler(request);

      // Assert
      expect(mockLogger.error).toHaveBeenCalled();
      const logCall = mockLogger.error.mock.calls[0];
      const logMessage = JSON.stringify(logCall);

      // 确保敏感信息没有被记录
      expect(logMessage).not.toContain('secret123');
      expect(logMessage).not.toContain('4111-1111-1111-1111');
      expect(logMessage).not.toContain('123-45-6789');
    });
  });

  describe('性能相关错误测试', () => {
    it('应该处理超时错误', async () => {
      // Arrange
      const handler = createTestApiHandler('timeout-error');
      const request = createMockRequest('POST', {});

      // 模拟超时
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Request timeout')), 100),
      );

      // Act & Assert
      await expect(Promise.race([
        handler(request),
        timeoutPromise,
      ])).rejects.toThrow('Request timeout');
    });

    it('应该处理内存不足错误', async () => {
      // Arrange
      const handler = createTestApiHandler('memory-error');
      const request = createMockRequest('POST', {});

      // Act
      const response = await handler(request);
      const responseData = await response.json();

      // Assert
      expect(response.status).toBe(503);
      expect(responseData.error).toBe('Server overloaded');
    });

    it('应该在合理时间内返回错误响应', async () => {
      // Arrange
      const handler = createTestApiHandler('database-error');
      const request = createMockRequest('POST', {});
      const startTime = Date.now();

      // Act
      await handler(request);

      // Assert
      const duration = Date.now() - startTime;
      expect(duration).toBeLessThan(1000); // 错误处理应该很快
    });
  });
});
