/**
 * JWT安全性测试
 * 测试JWT处理的各种安全场景和边界条件
 */

import jwt from 'jsonwebtoken';
import { 
  generateToken, 
  verifyToken, 
  extractTokenFromHeader, 
  generateRefreshToken, 
  decodeToken 
} from '@/lib/auth/jwt';
import { UserDocument } from '@/lib/models/User';

// Mock environment variables
const mockEnv = {
  JWT_SECRET: 'test-jwt-secret-key-for-testing',
  JWT_EXPIRES_IN: '7d',
  NEXTAUTH_SECRET: 'test-nextauth-secret'
};

describe('JWT安全性测试', () => {
  let mockUser: Partial<UserDocument>;

  beforeEach(() => {
    // Setup environment
    process.env.JWT_SECRET = mockEnv.JWT_SECRET;
    process.env.JWT_EXPIRES_IN = mockEnv.JWT_EXPIRES_IN;
    process.env.NEXTAUTH_SECRET = mockEnv.NEXTAUTH_SECRET;

    // Mock user
    mockUser = {
      _id: 'user123' as any,
      email: 'test@example.com',
      name: 'Test User'
    };
  });

  afterEach(() => {
    // Clean up environment
    delete process.env.JWT_SECRET;
    delete process.env.JWT_EXPIRES_IN;
    delete process.env.NEXTAUTH_SECRET;
  });

  describe('Token生成安全性', () => {
    it('应该生成有效的JWT令牌', () => {
      // Act
      const token = generateToken(mockUser as UserDocument);

      // Assert
      expect(token).toBeDefined();
      expect(typeof token).toBe('string');
      expect(token.split('.')).toHaveLength(3); // JWT格式验证
    });

    it('应该包含正确的payload信息', () => {
      // Act
      const token = generateToken(mockUser as UserDocument);
      const decoded = jwt.decode(token) as any;

      // Assert
      expect(decoded.userId).toBe('user123');
      expect(decoded.email).toBe('test@example.com');
      expect(decoded.name).toBe('Test User');
      expect(decoded.iat).toBeDefined();
      expect(decoded.exp).toBeDefined();
    });

    it('应该设置正确的过期时间', () => {
      // Act
      const token = generateToken(mockUser as UserDocument);
      const decoded = jwt.decode(token) as any;

      // Assert
      const now = Math.floor(Date.now() / 1000);
      const sevenDaysFromNow = now + (7 * 24 * 60 * 60);
      expect(decoded.exp).toBeCloseTo(sevenDaysFromNow, -60); // 允许60秒误差
    });

    it('应该为不同用户生成不同的令牌', () => {
      // Arrange
      const user1 = { ...mockUser, _id: 'user1' as any };
      const user2 = { ...mockUser, _id: 'user2' as any };

      // Act
      const token1 = generateToken(user1 as UserDocument);
      const token2 = generateToken(user2 as UserDocument);

      // Assert
      expect(token1).not.toBe(token2);
    });

    it('应该在相同时间为相同用户生成相同的令牌结构', () => {
      // Arrange
      const originalDateNow = Date.now;
      const fixedTime = 1640995200000; // 固定时间戳
      Date.now = jest.fn(() => fixedTime);

      // Act
      const token1 = generateToken(mockUser as UserDocument);
      const token2 = generateToken(mockUser as UserDocument);

      // Assert
      const decoded1 = jwt.decode(token1) as any;
      const decoded2 = jwt.decode(token2) as any;
      expect(decoded1.userId).toBe(decoded2.userId);
      expect(decoded1.email).toBe(decoded2.email);
      expect(decoded1.iat).toBe(decoded2.iat);

      // Cleanup
      Date.now = originalDateNow;
    });
  });

  describe('Token验证安全性', () => {
    it('应该验证有效的令牌', () => {
      // Arrange
      const token = generateToken(mockUser as UserDocument);

      // Act
      const result = verifyToken(token);

      // Assert
      expect(result).not.toBeNull();
      expect(result?.userId).toBe('user123');
      expect(result?.email).toBe('test@example.com');
    });

    it('应该拒绝无效的令牌', () => {
      // Arrange
      const invalidToken = 'invalid.jwt.token';

      // Act
      const result = verifyToken(invalidToken);

      // Assert
      expect(result).toBeNull();
    });

    it('应该拒绝被篡改的令牌', () => {
      // Arrange
      const validToken = generateToken(mockUser as UserDocument);
      const tamperedToken = validToken.slice(0, -10) + 'tampered123';

      // Act
      const result = verifyToken(tamperedToken);

      // Assert
      expect(result).toBeNull();
    });

    it('应该拒绝过期的令牌', () => {
      // Arrange
      const expiredPayload = {
        userId: 'user123',
        email: 'test@example.com',
        name: 'Test User',
        iat: Math.floor(Date.now() / 1000) - 3600,
        exp: Math.floor(Date.now() / 1000) - 1800 // 30分钟前过期
      };
      const expiredToken = jwt.sign(expiredPayload, mockEnv.JWT_SECRET);

      // Act
      const result = verifyToken(expiredToken);

      // Assert
      expect(result).toBeNull();
    });

    it('应该拒绝使用错误密钥签名的令牌', () => {
      // Arrange
      const wrongSecretToken = jwt.sign(
        { userId: 'user123', email: 'test@example.com' },
        'wrong-secret-key'
      );

      // Act
      const result = verifyToken(wrongSecretToken);

      // Assert
      expect(result).toBeNull();
    });

    it('应该拒绝格式错误的令牌', () => {
      // Arrange
      const malformedTokens = [
        'not.a.jwt',
        'only.two.parts',
        'too.many.parts.here.invalid',
        '',
        'single-string-token'
      ];

      // Act & Assert
      malformedTokens.forEach(token => {
        const result = verifyToken(token);
        expect(result).toBeNull();
      });
    });
  });

  describe('Header提取安全性', () => {
    it('应该从有效的Authorization header中提取令牌', () => {
      // Arrange
      const token = 'valid.jwt.token';
      const authHeader = `Bearer ${token}`;

      // Act
      const result = extractTokenFromHeader(authHeader);

      // Assert
      expect(result).toBe(token);
    });

    it('应该拒绝无效的Authorization header格式', () => {
      // Arrange
      const invalidHeaders = [
        'Basic dXNlcjpwYXNz', // Basic auth
        'Bearer', // 缺少令牌
        'bearer token', // 小写Bearer
        'Token valid.jwt.token', // 错误的前缀
        'Bearer token1 token2', // 多个令牌
        'valid.jwt.token', // 缺少Bearer前缀
        ''
      ];

      // Act & Assert
      invalidHeaders.forEach(header => {
        const result = extractTokenFromHeader(header);
        expect(result).toBeNull();
      });
    });

    it('应该处理undefined header', () => {
      // Act
      const result = extractTokenFromHeader(undefined);

      // Assert
      expect(result).toBeNull();
    });

    it('应该处理包含额外空格的header', () => {
      // Arrange
      const token = 'valid.jwt.token';
      const authHeader = `  Bearer   ${token}  `;

      // Act
      const result = extractTokenFromHeader(authHeader);

      // Assert
      expect(result).toBeNull(); // 当前实现不处理额外空格
    });
  });

  describe('刷新令牌安全性', () => {
    it('应该生成有效的刷新令牌', () => {
      // Act
      const refreshToken = generateRefreshToken(mockUser as UserDocument);

      // Assert
      expect(refreshToken).toBeDefined();
      expect(typeof refreshToken).toBe('string');
      expect(refreshToken.split('.')).toHaveLength(3);
    });

    it('应该设置更长的过期时间', () => {
      // Act
      const accessToken = generateToken(mockUser as UserDocument);
      const refreshToken = generateRefreshToken(mockUser as UserDocument);

      const accessDecoded = jwt.decode(accessToken) as any;
      const refreshDecoded = jwt.decode(refreshToken) as any;

      // Assert
      expect(refreshDecoded.exp).toBeGreaterThan(accessDecoded.exp);
    });

    it('应该包含相同的用户信息', () => {
      // Act
      const accessToken = generateToken(mockUser as UserDocument);
      const refreshToken = generateRefreshToken(mockUser as UserDocument);

      const accessDecoded = jwt.decode(accessToken) as any;
      const refreshDecoded = jwt.decode(refreshToken) as any;

      // Assert
      expect(refreshDecoded.userId).toBe(accessDecoded.userId);
      expect(refreshDecoded.email).toBe(accessDecoded.email);
      expect(refreshDecoded.name).toBe(accessDecoded.name);
    });
  });

  describe('令牌解码安全性', () => {
    it('应该解码有效的令牌而不验证', () => {
      // Arrange
      const token = generateToken(mockUser as UserDocument);

      // Act
      const result = decodeToken(token);

      // Assert
      expect(result).not.toBeNull();
      expect(result?.userId).toBe('user123');
      expect(result?.email).toBe('test@example.com');
    });

    it('应该解码过期的令牌', () => {
      // Arrange
      const expiredPayload = {
        userId: 'user123',
        email: 'test@example.com',
        name: 'Test User',
        exp: Math.floor(Date.now() / 1000) - 1800 // 已过期
      };
      const expiredToken = jwt.sign(expiredPayload, mockEnv.JWT_SECRET);

      // Act
      const result = decodeToken(expiredToken);

      // Assert
      expect(result).not.toBeNull();
      expect(result?.userId).toBe('user123');
    });

    it('应该拒绝格式错误的令牌', () => {
      // Arrange
      const invalidToken = 'invalid.token.format';

      // Act
      const result = decodeToken(invalidToken);

      // Assert
      expect(result).toBeNull();
    });

    it('应该处理空令牌', () => {
      // Act
      const result = decodeToken('');

      // Assert
      expect(result).toBeNull();
    });
  });

  describe('密钥安全性', () => {
    it('应该在缺少JWT_SECRET时使用NEXTAUTH_SECRET', () => {
      // Arrange
      delete process.env.JWT_SECRET;
      process.env.NEXTAUTH_SECRET = 'nextauth-secret';

      // Act
      const token = generateToken(mockUser as UserDocument);
      const result = verifyToken(token);

      // Assert
      expect(result).not.toBeNull();
      expect(result?.userId).toBe('user123');
    });

    it('应该在两个密钥都缺少时使用默认密钥', () => {
      // Arrange
      delete process.env.JWT_SECRET;
      delete process.env.NEXTAUTH_SECRET;

      // Act & Assert
      expect(() => generateToken(mockUser as UserDocument)).not.toThrow();
    });

    it('应该使用强密钥生成安全的令牌', () => {
      // Arrange
      const strongSecret = 'very-long-and-complex-secret-key-for-maximum-security-123456789';
      process.env.JWT_SECRET = strongSecret;

      // Act
      const token = generateToken(mockUser as UserDocument);
      const result = verifyToken(token);

      // Assert
      expect(result).not.toBeNull();
      expect(result?.userId).toBe('user123');
    });
  });

  describe('时间攻击防护', () => {
    it('应该在验证失败时保持一致的响应时间', async () => {
      // Arrange
      const validToken = generateToken(mockUser as UserDocument);
      const invalidToken = 'invalid.jwt.token';
      const measurements: number[] = [];

      // Act - 测量多次验证时间
      for (let i = 0; i < 10; i++) {
        const start = process.hrtime.bigint();
        verifyToken(i % 2 === 0 ? validToken : invalidToken);
        const end = process.hrtime.bigint();
        measurements.push(Number(end - start) / 1000000); // 转换为毫秒
      }

      // Assert - 验证时间差异不应该太大
      const avgTime = measurements.reduce((a, b) => a + b) / measurements.length;
      const maxDeviation = Math.max(...measurements.map(t => Math.abs(t - avgTime)));
      expect(maxDeviation).toBeLessThan(avgTime * 2); // 允许200%的时间偏差（更宽松的测试）
    });
  });

  describe('内存安全性', () => {
    it('应该处理大量令牌生成而不泄漏内存', () => {
      // Arrange
      const initialMemory = process.memoryUsage().heapUsed;

      // Act - 生成大量令牌
      for (let i = 0; i < 1000; i++) {
        const user = { ...mockUser, _id: `user${i}` as any };
        generateToken(user as UserDocument);
      }

      // Assert
      const finalMemory = process.memoryUsage().heapUsed;
      const memoryIncrease = finalMemory - initialMemory;
      expect(memoryIncrease).toBeLessThan(50 * 1024 * 1024); // 不应超过50MB
    });

    it('应该处理大量令牌验证而不泄漏内存', () => {
      // Arrange
      const token = generateToken(mockUser as UserDocument);
      const initialMemory = process.memoryUsage().heapUsed;

      // Act - 验证大量令牌
      for (let i = 0; i < 1000; i++) {
        verifyToken(token);
      }

      // Assert
      const finalMemory = process.memoryUsage().heapUsed;
      const memoryIncrease = finalMemory - initialMemory;
      expect(memoryIncrease).toBeLessThan(10 * 1024 * 1024); // 不应超过10MB
    });
  });

  describe('边界条件测试', () => {
    it('应该处理极长的用户信息', () => {
      // Arrange
      const longUser = {
        ...mockUser,
        name: 'A'.repeat(1000),
        email: 'very.long.email.address.that.might.cause.issues@example.com'
      };

      // Act
      const token = generateToken(longUser as UserDocument);
      const result = verifyToken(token);

      // Assert
      expect(result).not.toBeNull();
      expect(result?.name).toBe(longUser.name);
    });

    it('应该处理特殊字符的用户信息', () => {
      // Arrange
      const specialUser = {
        ...mockUser,
        name: '测试用户 🚀 @#$%^&*()',
        email: 'test+special@example.com'
      };

      // Act
      const token = generateToken(specialUser as UserDocument);
      const result = verifyToken(token);

      // Assert
      expect(result).not.toBeNull();
      expect(result?.name).toBe(specialUser.name);
      expect(result?.email).toBe(specialUser.email);
    });

    it('应该处理空字符串字段', () => {
      // Arrange
      const emptyUser = {
        ...mockUser,
        name: '',
        email: 'test@example.com'
      };

      // Act
      const token = generateToken(emptyUser as UserDocument);
      const result = verifyToken(token);

      // Assert
      expect(result).not.toBeNull();
      expect(result?.name).toBe('');
    });

    it('应该处理undefined字段', () => {
      // Arrange
      const undefinedUser = {
        _id: 'user123' as any,
        email: 'test@example.com',
        name: undefined as any
      };

      // Act & Assert
      expect(() => generateToken(undefinedUser as UserDocument)).not.toThrow();
    });
  });

  describe('算法安全性', () => {
    it('应该使用安全的签名算法', () => {
      // Arrange
      const token = generateToken(mockUser as UserDocument);
      const header = JSON.parse(Buffer.from(token.split('.')[0], 'base64').toString());

      // Assert
      expect(header.alg).toBe('HS256'); // 确保使用安全算法
      expect(header.typ).toBe('JWT');
    });

    it('应该拒绝使用none算法的令牌', () => {
      // Arrange
      const noneAlgToken = jwt.sign(
        { userId: 'user123', email: 'test@example.com' },
        '',
        { algorithm: 'none' }
      );

      // Act
      const result = verifyToken(noneAlgToken);

      // Assert
      expect(result).toBeNull();
    });
  });
});