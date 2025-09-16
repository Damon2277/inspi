/**
 * 认证API安全性测试
 * 测试认证相关API的安全性、输入验证和错误处理
 */

import { NextRequest, NextResponse } from 'next/server';
import { POST as loginHandler } from '@/app/api/auth/login/route';
import { POST as registerHandler } from '@/app/api/auth/register/route';
import { POST as verifyEmailHandler } from '@/app/api/auth/verify-email/route';

// Mock auth service
const mockAuthService = {
  loginUser: jest.fn(),
  registerUser: jest.fn(),
  verifyEmail: jest.fn(),
  generateToken: jest.fn(),
  validateToken: jest.fn()
};

jest.mock('@/lib/auth/mock-service', () => mockAuthService);

// Mock rate limiting
const mockRateLimit = jest.fn((limit: number, window: number) => 
  jest.fn((handler: any) => handler)
);

jest.mock('@/lib/auth/middleware', () => ({
  rateLimit: mockRateLimit
}));

// Mock logger
const mockLogger = {
  info: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  debug: jest.fn()
};

jest.mock('@/lib/utils/logger', () => ({
  logger: mockLogger
}));

// Helper function to create mock request
function createMockRequest(method: string, body: any, headers: Record<string, string> = {}) {
  return {
    method,
    json: jest.fn().mockResolvedValue(body),
    headers: new Map(Object.entries(headers)),
    cookies: new Map(),
    url: 'http://localhost:3000/api/auth/test'
  } as unknown as NextRequest;
}

describe('认证API安全性测试', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('登录API安全测试', () => {
    it('应该成功处理有效的登录请求', async () => {
      // Arrange
      const validLoginData = {
        email: 'test@example.com',
        password: 'validPassword123'
      };

      mockAuthService.loginUser.mockResolvedValue({
        success: true,
        user: { id: 'user1', email: 'test@example.com', name: 'Test User' },
        token: 'valid-jwt-token',
        refreshToken: 'valid-refresh-token'
      });

      const request = createMockRequest('POST', validLoginData);

      // Act
      const response = await loginHandler(request);
      const responseData = await response.json();

      // Assert
      expect(response.status).toBe(200);
      expect(responseData).toEqual({
        message: 'Login successful',
        user: expect.objectContaining({
          id: 'user1',
          email: 'test@example.com'
        }),
        token: 'valid-jwt-token',
        refreshToken: 'valid-refresh-token'
      });
      expect(mockAuthService.loginUser).toHaveBeenCalledWith(validLoginData);
    });

    it('应该拒绝无效的邮箱格式', async () => {
      // Arrange
      const invalidEmailData = {
        email: 'invalid-email',
        password: 'validPassword123'
      };

      mockAuthService.loginUser.mockResolvedValue({
        success: false,
        error: 'Invalid email format'
      });

      const request = createMockRequest('POST', invalidEmailData);

      // Act
      const response = await loginHandler(request);
      const responseData = await response.json();

      // Assert
      expect(response.status).toBe(401);
      expect(responseData.error).toBe('Invalid email format');
    });

    it('应该拒绝空密码', async () => {
      // Arrange
      const emptyPasswordData = {
        email: 'test@example.com',
        password: ''
      };

      mockAuthService.loginUser.mockResolvedValue({
        success: false,
        error: 'Password is required'
      });

      const request = createMockRequest('POST', emptyPasswordData);

      // Act
      const response = await loginHandler(request);
      const responseData = await response.json();

      // Assert
      expect(response.status).toBe(401);
      expect(responseData.error).toBe('Password is required');
    });

    it('应该拒绝错误的凭据', async () => {
      // Arrange
      const wrongCredentials = {
        email: 'test@example.com',
        password: 'wrongPassword'
      };

      mockAuthService.loginUser.mockResolvedValue({
        success: false,
        error: 'Invalid credentials'
      });

      const request = createMockRequest('POST', wrongCredentials);

      // Act
      const response = await loginHandler(request);
      const responseData = await response.json();

      // Assert
      expect(response.status).toBe(401);
      expect(responseData.error).toBe('Invalid credentials');
    });

    it('应该处理SQL注入攻击', async () => {
      // Arrange
      const sqlInjectionData = {
        email: \"test@example.com'; DROP TABLE users; --\",
        password: 'password'
      };

      mockAuthService.loginUser.mockResolvedValue({
        success: false,
        error: 'Invalid email format'
      });

      const request = createMockRequest('POST', sqlInjectionData);

      // Act
      const response = await loginHandler(request);
      const responseData = await response.json();

      // Assert
      expect(response.status).toBe(401);
      expect(responseData.error).toBe('Invalid email format');
    });

    it('应该处理XSS攻击', async () => {
      // Arrange
      const xssData = {
        email: 'test@example.com',
        password: '<script>alert(\"xss\")</script>'
      };

      mockAuthService.loginUser.mockResolvedValue({
        success: false,
        error: 'Invalid credentials'
      });

      const request = createMockRequest('POST', xssData);

      // Act
      const response = await loginHandler(request);
      const responseData = await response.json();

      // Assert
      expect(response.status).toBe(401);
      expect(responseData.error).toBe('Invalid credentials');
    });

    it('应该处理过长的输入', async () => {
      // Arrange
      const longInputData = {
        email: 'a'.repeat(1000) + '@example.com',
        password: 'b'.repeat(1000)
      };

      mockAuthService.loginUser.mockResolvedValue({
        success: false,
        error: 'Input too long'
      });

      const request = createMockRequest('POST', longInputData);

      // Act
      const response = await loginHandler(request);
      const responseData = await response.json();

      // Assert
      expect(response.status).toBe(401);
      expect(responseData.error).toBe('Input too long');
    });

    it('应该处理JSON解析错误', async () => {
      // Arrange
      const request = {
        method: 'POST',
        json: jest.fn().mockRejectedValue(new Error('Invalid JSON')),
        headers: new Map(),
        cookies: new Map(),
        url: 'http://localhost:3000/api/auth/login'
      } as unknown as NextRequest;

      // Act
      const response = await loginHandler(request);
      const responseData = await response.json();

      // Assert
      expect(response.status).toBe(500);
      expect(responseData.error).toBe('Internal server error');
      expect(mockLogger.error).toHaveBeenCalledWith('Login API error:', expect.any(Error));
    });

    it('应该处理服务异常', async () => {
      // Arrange
      const validData = {
        email: 'test@example.com',
        password: 'password'
      };

      mockAuthService.loginUser.mockRejectedValue(new Error('Database connection failed'));

      const request = createMockRequest('POST', validData);

      // Act
      const response = await loginHandler(request);
      const responseData = await response.json();

      // Assert
      expect(response.status).toBe(500);
      expect(responseData.error).toBe('Internal server error');
      expect(mockLogger.error).toHaveBeenCalled();
    });

    it('应该应用速率限制', async () => {
      // Arrange
      const validData = {
        email: 'test@example.com',
        password: 'password'
      };

      const request = createMockRequest('POST', validData);

      // Act
      await loginHandler(request);

      // Assert
      expect(mockRateLimit).toHaveBeenCalledWith(10, 15 * 60 * 1000); // 10 requests per 15 minutes
    });
  });

  describe('注册API安全测试', () => {
    it('应该成功处理有效的注册请求', async () => {
      // Arrange
      const validRegisterData = {
        email: 'newuser@example.com',
        password: 'StrongPassword123!',
        name: 'New User'
      };

      mockAuthService.registerUser.mockResolvedValue({
        success: true,
        user: { id: 'user2', email: 'newuser@example.com', name: 'New User' },
        token: 'valid-jwt-token',
        refreshToken: 'valid-refresh-token'
      });

      const request = createMockRequest('POST', validRegisterData);

      // Act
      const response = await registerHandler(request);
      const responseData = await response.json();

      // Assert
      expect(response.status).toBe(200);
      expect(responseData).toEqual({
        message: 'Registration successful',
        user: expect.objectContaining({
          id: 'user2',
          email: 'newuser@example.com'
        }),
        token: 'valid-jwt-token',
        refreshToken: 'valid-refresh-token'
      });
    });

    it('应该拒绝弱密码', async () => {
      // Arrange
      const weakPasswordData = {
        email: 'test@example.com',
        password: '123',
        name: 'Test User'
      };

      mockAuthService.registerUser.mockResolvedValue({
        success: false,
        error: 'Password too weak'
      });

      const request = createMockRequest('POST', weakPasswordData);

      // Act
      const response = await registerHandler(request);
      const responseData = await response.json();

      // Assert
      expect(response.status).toBe(400);
      expect(responseData.error).toBe('Password too weak');
    });

    it('应该拒绝已存在的邮箱', async () => {
      // Arrange
      const duplicateEmailData = {
        email: 'existing@example.com',
        password: 'StrongPassword123!',
        name: 'Test User'
      };

      mockAuthService.registerUser.mockResolvedValue({
        success: false,
        error: 'Email already exists'
      });

      const request = createMockRequest('POST', duplicateEmailData);

      // Act
      const response = await registerHandler(request);
      const responseData = await response.json();

      // Assert
      expect(response.status).toBe(400);
      expect(responseData.error).toBe('Email already exists');
    });

    it('应该验证必填字段', async () => {
      // Arrange
      const incompleteData = {
        email: 'test@example.com'
        // 缺少password和name
      };

      mockAuthService.registerUser.mockResolvedValue({
        success: false,
        error: 'Missing required fields'
      });

      const request = createMockRequest('POST', incompleteData);

      // Act
      const response = await registerHandler(request);
      const responseData = await response.json();

      // Assert
      expect(response.status).toBe(400);
      expect(responseData.error).toBe('Missing required fields');
    });

    it('应该处理恶意用户名', async () => {
      // Arrange
      const maliciousNameData = {
        email: 'test@example.com',
        password: 'StrongPassword123!',
        name: '<script>alert(\"xss\")</script>'
      };

      mockAuthService.registerUser.mockResolvedValue({
        success: false,
        error: 'Invalid name format'
      });

      const request = createMockRequest('POST', maliciousNameData);

      // Act
      const response = await registerHandler(request);
      const responseData = await response.json();

      // Assert
      expect(response.status).toBe(400);
      expect(responseData.error).toBe('Invalid name format');
    });

    it('应该应用更严格的速率限制', async () => {
      // Arrange
      const validData = {
        email: 'test@example.com',
        password: 'StrongPassword123!',
        name: 'Test User'
      };

      const request = createMockRequest('POST', validData);

      // Act
      await registerHandler(request);

      // Assert
      expect(mockRateLimit).toHaveBeenCalledWith(5, 15 * 60 * 1000); // 5 requests per 15 minutes
    });
  });

  describe('邮箱验证API安全测试', () => {
    it('应该成功验证有效的验证码', async () => {
      // Arrange
      const validVerificationData = {
        email: 'test@example.com',
        code: '123456'
      };

      mockAuthService.verifyEmail.mockResolvedValue({
        success: true,
        message: 'Email verified successfully'
      });

      const request = createMockRequest('POST', validVerificationData);

      // Act
      const response = await verifyEmailHandler(request);
      const responseData = await response.json();

      // Assert
      expect(response.status).toBe(200);
      expect(responseData.message).toBe('Email verified successfully');
    });

    it('应该拒绝无效的验证码', async () => {
      // Arrange
      const invalidCodeData = {
        email: 'test@example.com',
        code: 'invalid'
      };

      mockAuthService.verifyEmail.mockResolvedValue({
        success: false,
        error: 'Invalid verification code'
      });

      const request = createMockRequest('POST', invalidCodeData);

      // Act
      const response = await verifyEmailHandler(request);
      const responseData = await response.json();

      // Assert
      expect(response.status).toBe(400);
      expect(responseData.error).toBe('Invalid verification code');
    });

    it('应该拒绝过期的验证码', async () => {
      // Arrange
      const expiredCodeData = {
        email: 'test@example.com',
        code: '123456'
      };

      mockAuthService.verifyEmail.mockResolvedValue({
        success: false,
        error: 'Verification code expired'
      });

      const request = createMockRequest('POST', expiredCodeData);

      // Act
      const response = await verifyEmailHandler(request);
      const responseData = await response.json();

      // Assert
      expect(response.status).toBe(400);
      expect(responseData.error).toBe('Verification code expired');
    });

    it('应该处理暴力破解尝试', async () => {
      // Arrange
      const bruteForceAttempts = Array(100).fill(null).map((_, i) => ({
        email: 'test@example.com',
        code: i.toString().padStart(6, '0')
      }));

      mockAuthService.verifyEmail.mockResolvedValue({
        success: false,
        error: 'Too many attempts'
      });

      // Act
      const responses = await Promise.all(
        bruteForceAttempts.slice(0, 10).map(data => {
          const request = createMockRequest('POST', data);
          return verifyEmailHandler(request);
        })
      );

      // Assert
      const lastResponse = responses[responses.length - 1];
      const responseData = await lastResponse.json();
      expect(responseData.error).toBe('Too many attempts');
    });
  });

  describe('通用安全测试', () => {
    it('应该设置安全响应头', async () => {
      // Arrange
      const validData = {
        email: 'test@example.com',
        password: 'password'
      };

      mockAuthService.loginUser.mockResolvedValue({
        success: true,
        user: { id: 'user1', email: 'test@example.com' },
        token: 'token'
      });

      const request = createMockRequest('POST', validData);

      // Act
      const response = await loginHandler(request);

      // Assert
      expect(response.headers.get('X-Content-Type-Options')).toBe('nosniff');
      expect(response.headers.get('X-Frame-Options')).toBe('DENY');
      expect(response.headers.get('X-XSS-Protection')).toBe('1; mode=block');
    });

    it('应该处理CORS预检请求', async () => {
      // Arrange
      const request = {
        method: 'OPTIONS',
        headers: new Map([
          ['Origin', 'https://example.com'],
          ['Access-Control-Request-Method', 'POST']
        ]),
        json: jest.fn(),
        cookies: new Map(),
        url: 'http://localhost:3000/api/auth/login'
      } as unknown as NextRequest;

      // Act
      const response = await loginHandler(request);

      // Assert
      expect(response.status).toBe(200);
      expect(response.headers.get('Access-Control-Allow-Origin')).toBeDefined();
      expect(response.headers.get('Access-Control-Allow-Methods')).toBeDefined();
    });

    it('应该验证Content-Type', async () => {
      // Arrange
      const request = createMockRequest('POST', { email: 'test@example.com' }, {
        'Content-Type': 'text/plain'
      });

      // Act
      const response = await loginHandler(request);
      const responseData = await response.json();

      // Assert
      expect(response.status).toBe(400);
      expect(responseData.error).toBe('Invalid Content-Type');
    });

    it('应该限制请求体大小', async () => {
      // Arrange
      const largeData = {
        email: 'test@example.com',
        password: 'a'.repeat(10000), // 10KB password
        extraData: 'b'.repeat(100000) // 100KB extra data
      };

      const request = createMockRequest('POST', largeData);

      // Act
      const response = await loginHandler(request);
      const responseData = await response.json();

      // Assert
      expect(response.status).toBe(413);
      expect(responseData.error).toBe('Request entity too large');
    });

    it('应该记录安全事件', async () => {
      // Arrange
      const suspiciousData = {
        email: \"'; DROP TABLE users; --\",
        password: '<script>alert(\"xss\")</script>'
      };

      mockAuthService.loginUser.mockResolvedValue({
        success: false,
        error: 'Invalid credentials'
      });

      const request = createMockRequest('POST', suspiciousData, {
        'X-Forwarded-For': '192.168.1.100',
        'User-Agent': 'Suspicious Bot'
      });

      // Act
      await loginHandler(request);

      // Assert
      expect(mockLogger.warn).toHaveBeenCalledWith(
        'Suspicious login attempt detected',
        expect.objectContaining({
          email: suspiciousData.email,
          ip: '192.168.1.100',
          userAgent: 'Suspicious Bot'
        })
      );
    });
  });

  describe('性能和可用性测试', () => {
    it('应该在合理时间内响应', async () => {
      // Arrange
      const validData = {
        email: 'test@example.com',
        password: 'password'
      };

      mockAuthService.loginUser.mockImplementation(() => 
        new Promise(resolve => 
          setTimeout(() => resolve({
            success: true,
            user: { id: 'user1', email: 'test@example.com' },
            token: 'token'
          }), 50)
        )
      );

      const request = createMockRequest('POST', validData);
      const startTime = Date.now();

      // Act
      await loginHandler(request);

      // Assert
      const duration = Date.now() - startTime;
      expect(duration).toBeLessThan(1000); // 应该在1秒内响应
    });

    it('应该处理并发请求', async () => {
      // Arrange
      const validData = {
        email: 'test@example.com',
        password: 'password'
      };

      mockAuthService.loginUser.mockResolvedValue({
        success: true,
        user: { id: 'user1', email: 'test@example.com' },
        token: 'token'
      });

      // Act
      const concurrentRequests = Array(10).fill(null).map(() => {
        const request = createMockRequest('POST', validData);
        return loginHandler(request);
      });

      const responses = await Promise.all(concurrentRequests);

      // Assert
      responses.forEach(response => {
        expect(response.status).toBe(200);
      });
    });

    it('应该处理超时情况', async () => {
      // Arrange
      const validData = {
        email: 'test@example.com',
        password: 'password'
      };

      mockAuthService.loginUser.mockImplementation(() => 
        new Promise(resolve => 
          setTimeout(() => resolve({
            success: true,
            user: { id: 'user1', email: 'test@example.com' },
            token: 'token'
          }), 10000) // 10秒延迟
        )
      );

      const request = createMockRequest('POST', validData);

      // Act & Assert
      await expect(Promise.race([
        loginHandler(request),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Timeout')), 5000)
        )
      ])).rejects.toThrow('Timeout');
    });
  });
});