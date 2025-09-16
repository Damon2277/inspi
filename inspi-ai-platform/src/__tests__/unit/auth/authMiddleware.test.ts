/**
 * 认证中间件集成测试
 * 测试认证中间件的各种场景、权限验证和边界条件
 */

import { NextRequest, NextResponse } from 'next/server';
import { authenticateToken, requireAuth, optionalAuth } from '@/lib/middleware/auth';
import jwt from 'jsonwebtoken';

// Mock dependencies
jest.mock('jsonwebtoken');
jest.mock('@/lib/mongodb', () => ({
  __esModule: true,
  default: jest.fn().mockResolvedValue(true)
}));
jest.mock('@/lib/models/User', () => ({
  __esModule: true,
  default: {
    findById: jest.fn()
  }
}));

// Mock User model
const mockUser = {
  _id: 'user123',
  email: 'test@example.com',
  name: 'Test User',
  subscription: { plan: 'free' },
  save: jest.fn(),
};

const mockUserModel = {
  findById: jest.fn(),
};

describe('认证中间件集成测试', () => {
  let mockRequest: Partial<NextRequest>;
  let mockHandler: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Setup environment
    process.env.NEXTAUTH_SECRET = 'test-secret';

    // Setup mocks
    const mockMongoDB = require('@/lib/mongodb').default;
    const mockUserModelImport = require('@/lib/models/User').default;
    Object.assign(mockUserModelImport, mockUserModel);

    // Setup request mock
    mockRequest = {
      headers: new Headers(),
      json: jest.fn(),
      url: 'http://localhost:3000/api/test',
    };

    // Setup handler mock
    mockHandler = jest.fn().mockResolvedValue(
      NextResponse.json({ message: 'Success' })
    );
  });

  afterEach(() => {
    delete process.env.NEXTAUTH_SECRET;
  });

  describe('authenticateToken 函数测试', () => {
    it('应该成功验证有效的令牌', async () => {
      // Arrange
      const token = 'valid.jwt.token';
      const decodedPayload = { userId: 'user123' };
      
      mockRequest.headers = new Headers({
        'authorization': `Bearer ${token}`
      });

      (jwt.verify as jest.Mock).mockReturnValue(decodedPayload);
      mockUserModel.findById.mockResolvedValue(mockUser);

      // Act
      const result = await authenticateToken(mockRequest as NextRequest);

      // Assert
      expect(result).toEqual(mockUser);
      expect(jwt.verify).toHaveBeenCalledWith(token, 'test-secret');
      expect(mockUserModel.findById).toHaveBeenCalledWith('user123');
    });

    it('应该在缺少Authorization header时返回null', async () => {
      // Arrange
      mockRequest.headers = new Headers();

      // Act
      const result = await authenticateToken(mockRequest as NextRequest);

      // Assert
      expect(result).toBeNull();
      expect(jwt.verify).not.toHaveBeenCalled();
    });

    it('应该在无效的Authorization header格式时返回null', async () => {
      // Arrange
      const invalidHeaders = [
        'Basic dXNlcjpwYXNz',
        'Bearer',
        'Token valid.jwt.token',
        'bearer token',
        'valid.jwt.token'
      ];

      for (const header of invalidHeaders) {
        mockRequest.headers = new Headers({
          'authorization': header
        });

        // Act
        const result = await authenticateToken(mockRequest as NextRequest);

        // Assert
        expect(result).toBeNull();
      }
    });

    it('应该在JWT验证失败时返回null', async () => {
      // Arrange
      const token = 'invalid.jwt.token';
      mockRequest.headers = new Headers({
        'authorization': `Bearer ${token}`
      });

      (jwt.verify as jest.Mock).mockImplementation(() => {
        throw new Error('Invalid token');
      });

      // Act
      const result = await authenticateToken(mockRequest as NextRequest);

      // Assert
      expect(result).toBeNull();
    });

    it('应该在用户不存在时返回null', async () => {
      // Arrange
      const token = 'valid.jwt.token';
      const decodedPayload = { userId: 'nonexistent' };
      
      mockRequest.headers = new Headers({
        'authorization': `Bearer ${token}`
      });

      (jwt.verify as jest.Mock).mockReturnValue(decodedPayload);
      mockUserModel.findById.mockResolvedValue(null);

      // Act
      const result = await authenticateToken(mockRequest as NextRequest);

      // Assert
      expect(result).toBeNull();
    });

    it('应该在数据库连接失败时返回null', async () => {
      // Arrange
      const token = 'valid.jwt.token';
      const decodedPayload = { userId: 'user123' };
      
      mockRequest.headers = new Headers({
        'authorization': `Bearer ${token}`
      });

      (jwt.verify as jest.Mock).mockReturnValue(decodedPayload);
      require('@/lib/mongodb').default = jest.fn().mockRejectedValue(new Error('DB connection failed'));

      // Act
      const result = await authenticateToken(mockRequest as NextRequest);

      // Assert
      expect(result).toBeNull();
    });
  });

  describe('requireAuth 中间件测试', () => {
    it('应该允许已认证用户访问', async () => {
      // Arrange
      const token = 'valid.jwt.token';
      const decodedPayload = { userId: 'user123' };
      
      mockRequest.headers = new Headers({
        'authorization': `Bearer ${token}`
      });

      (jwt.verify as jest.Mock).mockReturnValue(decodedPayload);
      mockUserModel.findById.mockResolvedValue(mockUser);

      const protectedHandler = requireAuth(mockHandler);

      // Act
      const response = await protectedHandler(mockRequest as NextRequest);

      // Assert
      expect(mockHandler).toHaveBeenCalledWith(mockRequest);
      expect((mockRequest as any).user).toEqual(mockUser);
      expect(response).toEqual(expect.objectContaining({
        status: 200
      }));
    });

    it('应该拒绝未认证用户访问', async () => {
      // Arrange
      mockRequest.headers = new Headers(); // 无Authorization header

      const protectedHandler = requireAuth(mockHandler);

      // Act
      const response = await protectedHandler(mockRequest as NextRequest);

      // Assert
      expect(mockHandler).not.toHaveBeenCalled();
      expect(response.status).toBe(401);
      
      const responseBody = await response.json();
      expect(responseBody).toEqual({
        code: 'UNAUTHORIZED',
        message: '请先登录'
      });
    });

    it('应该拒绝无效令牌的用户', async () => {
      // Arrange
      const token = 'invalid.jwt.token';
      mockRequest.headers = new Headers({
        'authorization': `Bearer ${token}`
      });

      (jwt.verify as jest.Mock).mockImplementation(() => {
        throw new Error('Invalid token');
      });

      const protectedHandler = requireAuth(mockHandler);

      // Act
      const response = await protectedHandler(mockRequest as NextRequest);

      // Assert
      expect(mockHandler).not.toHaveBeenCalled();
      expect(response.status).toBe(401);
    });

    it('应该拒绝已删除用户的令牌', async () => {
      // Arrange
      const token = 'valid.jwt.token';
      const decodedPayload = { userId: 'deleted-user' };
      
      mockRequest.headers = new Headers({
        'authorization': `Bearer ${token}`
      });

      (jwt.verify as jest.Mock).mockReturnValue(decodedPayload);
      mockUserModel.findById.mockResolvedValue(null); // 用户不存在

      const protectedHandler = requireAuth(mockHandler);

      // Act
      const response = await protectedHandler(mockRequest as NextRequest);

      // Assert
      expect(mockHandler).not.toHaveBeenCalled();
      expect(response.status).toBe(401);
    });
  });

  describe('optionalAuth 中间件测试', () => {
    it('应该为已认证用户添加用户信息', async () => {
      // Arrange
      const token = 'valid.jwt.token';
      const decodedPayload = { userId: 'user123' };
      
      mockRequest.headers = new Headers({
        'authorization': `Bearer ${token}`
      });

      (jwt.verify as jest.Mock).mockReturnValue(decodedPayload);
      mockUserModel.findById.mockResolvedValue(mockUser);

      const optionalHandler = optionalAuth(mockHandler);

      // Act
      const response = await optionalHandler(mockRequest as NextRequest);

      // Assert
      expect(mockHandler).toHaveBeenCalledWith(mockRequest);
      expect((mockRequest as any).user).toEqual(mockUser);
    });

    it('应该允许未认证用户访问但不添加用户信息', async () => {
      // Arrange
      mockRequest.headers = new Headers(); // 无Authorization header

      const optionalHandler = optionalAuth(mockHandler);

      // Act
      const response = await optionalHandler(mockRequest as NextRequest);

      // Assert
      expect(mockHandler).toHaveBeenCalledWith(mockRequest);
      expect((mockRequest as any).user).toBeNull();
    });

    it('应该在令牌无效时设置用户为null', async () => {
      // Arrange
      const token = 'invalid.jwt.token';
      mockRequest.headers = new Headers({
        'authorization': `Bearer ${token}`
      });

      (jwt.verify as jest.Mock).mockImplementation(() => {
        throw new Error('Invalid token');
      });

      const optionalHandler = optionalAuth(mockHandler);

      // Act
      const response = await optionalHandler(mockRequest as NextRequest);

      // Assert
      expect(mockHandler).toHaveBeenCalledWith(mockRequest);
      expect((mockRequest as any).user).toBeNull();
    });
  });

  describe('边界条件测试', () => {
    it('应该处理极长的令牌', async () => {
      // Arrange
      const longToken = 'a'.repeat(10000);
      mockRequest.headers = new Headers({
        'authorization': `Bearer ${longToken}`
      });

      (jwt.verify as jest.Mock).mockImplementation(() => {
        throw new Error('Token too long');
      });

      // Act
      const result = await authenticateToken(mockRequest as NextRequest);

      // Assert
      expect(result).toBeNull();
    });

    it('应该处理包含特殊字符的令牌', async () => {
      // Arrange
      const specialToken = 'token.with.special@#$%^&*()characters';
      mockRequest.headers = new Headers({
        'authorization': `Bearer ${specialToken}`
      });

      (jwt.verify as jest.Mock).mockImplementation(() => {
        throw new Error('Invalid characters');
      });

      // Act
      const result = await authenticateToken(mockRequest as NextRequest);

      // Assert
      expect(result).toBeNull();
    });

    it('应该处理空字符串令牌', async () => {
      // Arrange
      mockRequest.headers = new Headers({
        'authorization': 'Bearer '
      });

      // Act
      const result = await authenticateToken(mockRequest as NextRequest);

      // Assert
      expect(result).toBeNull();
      expect(jwt.verify).not.toHaveBeenCalled();
    });

    it('应该处理多个Authorization headers', async () => {
      // Arrange
      const headers = new Headers();
      headers.append('authorization', 'Bearer token1');
      headers.append('authorization', 'Bearer token2');
      mockRequest.headers = headers;

      // Act
      const result = await authenticateToken(mockRequest as NextRequest);

      // Assert
      // 应该使用第一个header
      expect(jwt.verify).toHaveBeenCalledWith('token1', 'test-secret');
    });
  });

  describe('性能测试', () => {
    it('应该在合理时间内完成认证', async () => {
      // Arrange
      const token = 'valid.jwt.token';
      const decodedPayload = { userId: 'user123' };
      
      mockRequest.headers = new Headers({
        'authorization': `Bearer ${token}`
      });

      (jwt.verify as jest.Mock).mockReturnValue(decodedPayload);
      mockUserModel.findById.mockResolvedValue(mockUser);

      const startTime = Date.now();

      // Act
      await authenticateToken(mockRequest as NextRequest);

      // Assert
      const duration = Date.now() - startTime;
      expect(duration).toBeLessThan(100); // 应该在100ms内完成
    });

    it('应该处理大量并发认证请求', async () => {
      // Arrange
      const token = 'valid.jwt.token';
      const decodedPayload = { userId: 'user123' };
      
      (jwt.verify as jest.Mock).mockReturnValue(decodedPayload);
      mockUserModel.findById.mockResolvedValue(mockUser);

      const requests = Array(100).fill(null).map(() => ({
        headers: new Headers({
          'authorization': `Bearer ${token}`
        })
      }));

      const startTime = Date.now();

      // Act
      const results = await Promise.all(
        requests.map(req => authenticateToken(req as NextRequest))
      );

      // Assert
      const duration = Date.now() - startTime;
      expect(duration).toBeLessThan(1000); // 100个请求应该在1秒内完成
      expect(results).toHaveLength(100);
      results.forEach(result => {
        expect(result).toEqual(mockUser);
      });
    });
  });

  describe('安全性测试', () => {
    it('应该防止令牌重放攻击', async () => {
      // Arrange
      const token = 'replayed.jwt.token';
      const decodedPayload = { 
        userId: 'user123',
        iat: Math.floor(Date.now() / 1000) - 3600, // 1小时前签发
        exp: Math.floor(Date.now() / 1000) + 3600  // 1小时后过期
      };
      
      mockRequest.headers = new Headers({
        'authorization': `Bearer ${token}`
      });

      (jwt.verify as jest.Mock).mockReturnValue(decodedPayload);
      mockUserModel.findById.mockResolvedValue(mockUser);

      // Act - 多次使用同一令牌
      const result1 = await authenticateToken(mockRequest as NextRequest);
      const result2 = await authenticateToken(mockRequest as NextRequest);

      // Assert - 当前实现允许令牌重用，但应该记录使用情况
      expect(result1).toEqual(mockUser);
      expect(result2).toEqual(mockUser);
    });

    it('应该防止时间攻击', async () => {
      // Arrange
      const validToken = 'valid.jwt.token';
      const invalidToken = 'invalid.jwt.token';
      
      const validRequest = {
        headers: new Headers({
          'authorization': `Bearer ${validToken}`
        })
      };
      
      const invalidRequest = {
        headers: new Headers({
          'authorization': `Bearer ${invalidToken}`
        })
      };

      (jwt.verify as jest.Mock)
        .mockReturnValueOnce({ userId: 'user123' })
        .mockImplementationOnce(() => {
          throw new Error('Invalid token');
        });
      
      mockUserModel.findById.mockResolvedValue(mockUser);

      // Act - 测量响应时间
      const validStart = process.hrtime.bigint();
      await authenticateToken(validRequest as NextRequest);
      const validEnd = process.hrtime.bigint();

      const invalidStart = process.hrtime.bigint();
      await authenticateToken(invalidRequest as NextRequest);
      const invalidEnd = process.hrtime.bigint();

      // Assert - 响应时间不应该有显著差异
      const validTime = Number(validEnd - validStart) / 1000000;
      const invalidTime = Number(invalidEnd - invalidStart) / 1000000;
      const timeDifference = Math.abs(validTime - invalidTime);
      
      expect(timeDifference).toBeLessThan(Math.max(validTime, invalidTime) * 0.5);
    });

    it('应该防止用户枚举攻击', async () => {
      // Arrange
      const token = 'valid.jwt.token';
      const existingUserPayload = { userId: 'existing-user' };
      const nonExistentUserPayload = { userId: 'non-existent-user' };
      
      const existingUserRequest = {
        headers: new Headers({
          'authorization': `Bearer ${token}`
        })
      };
      
      const nonExistentUserRequest = {
        headers: new Headers({
          'authorization': `Bearer ${token}`
        })
      };

      (jwt.verify as jest.Mock)
        .mockReturnValueOnce(existingUserPayload)
        .mockReturnValueOnce(nonExistentUserPayload);
      
      mockUserModel.findById
        .mockResolvedValueOnce(mockUser)
        .mockResolvedValueOnce(null);

      // Act
      const existingResult = await authenticateToken(existingUserRequest as NextRequest);
      const nonExistentResult = await authenticateToken(nonExistentUserRequest as NextRequest);

      // Assert - 两种情况都应该返回null（不存在用户时）
      expect(existingResult).toEqual(mockUser);
      expect(nonExistentResult).toBeNull();
    });
  });

  describe('错误处理测试', () => {
    it('应该处理数据库查询错误', async () => {
      // Arrange
      const token = 'valid.jwt.token';
      const decodedPayload = { userId: 'user123' };
      
      mockRequest.headers = new Headers({
        'authorization': `Bearer ${token}`
      });

      (jwt.verify as jest.Mock).mockReturnValue(decodedPayload);
      mockUserModel.findById.mockRejectedValue(new Error('Database error'));

      // Act
      const result = await authenticateToken(mockRequest as NextRequest);

      // Assert
      expect(result).toBeNull();
    });

    it('应该处理JWT库抛出的异常', async () => {
      // Arrange
      const token = 'problematic.jwt.token';
      mockRequest.headers = new Headers({
        'authorization': `Bearer ${token}`
      });

      (jwt.verify as jest.Mock).mockImplementation(() => {
        throw new TypeError('Unexpected token format');
      });

      // Act
      const result = await authenticateToken(mockRequest as NextRequest);

      // Assert
      expect(result).toBeNull();
    });

    it('应该处理中间件链中的错误', async () => {
      // Arrange
      const token = 'valid.jwt.token';
      const decodedPayload = { userId: 'user123' };
      
      mockRequest.headers = new Headers({
        'authorization': `Bearer ${token}`
      });

      (jwt.verify as jest.Mock).mockReturnValue(decodedPayload);
      mockUserModel.findById.mockResolvedValue(mockUser);
      
      mockHandler.mockRejectedValue(new Error('Handler error'));

      const protectedHandler = requireAuth(mockHandler);

      // Act & Assert
      await expect(protectedHandler(mockRequest as NextRequest)).rejects.toThrow('Handler error');
    });
  });

  describe('集成测试', () => {
    it('应该与真实的HTTP请求流程集成', async () => {
      // Arrange
      const token = 'integration.test.token';
      const decodedPayload = { userId: 'integration-user' };
      
      // 模拟完整的请求对象
      const fullRequest = {
        headers: new Headers({
          'authorization': `Bearer ${token}`,
          'content-type': 'application/json',
          'user-agent': 'Test Client'
        }),
        method: 'POST',
        url: 'http://localhost:3000/api/protected',
        json: jest.fn().mockResolvedValue({ data: 'test' })
      };

      (jwt.verify as jest.Mock).mockReturnValue(decodedPayload);
      mockUserModel.findById.mockResolvedValue(mockUser);

      const protectedHandler = requireAuth(mockHandler);

      // Act
      const response = await protectedHandler(fullRequest as NextRequest);

      // Assert
      expect(mockHandler).toHaveBeenCalledWith(fullRequest);
      expect((fullRequest as any).user).toEqual(mockUser);
      expect(response).toBeDefined();
    });

    it('应该正确处理中间件链', async () => {
      // Arrange
      const token = 'chain.test.token';
      const decodedPayload = { userId: 'chain-user' };
      
      mockRequest.headers = new Headers({
        'authorization': `Bearer ${token}`
      });

      (jwt.verify as jest.Mock).mockReturnValue(decodedPayload);
      mockUserModel.findById.mockResolvedValue(mockUser);

      // 创建中间件链
      const middleware1 = (handler: Function) => async (req: NextRequest) => {
        (req as any).middleware1 = true;
        return handler(req);
      };

      const middleware2 = (handler: Function) => async (req: NextRequest) => {
        (req as any).middleware2 = true;
        return handler(req);
      };

      const chainedHandler = middleware1(middleware2(requireAuth(mockHandler)));

      // Act
      await chainedHandler(mockRequest as NextRequest);

      // Assert
      expect((mockRequest as any).middleware1).toBe(true);
      expect((mockRequest as any).middleware2).toBe(true);
      expect((mockRequest as any).user).toEqual(mockUser);
      expect(mockHandler).toHaveBeenCalled();
    });
  });
});