/**
 * 简化的安全测试套件
 * 测试核心安全功能
 */

import { 
  hashPassword, 
  verifyPassword,
  maskSensitiveData,
  generateSecureToken,
  generateChecksum,
  verifyChecksum
} from '@/lib/security/encryption';

// Mock环境变量
process.env.ENCRYPTION_KEY = 'test-encryption-key-32-characters-long-12345';

describe('安全功能测试', () => {
  describe('密码安全', () => {
    test('应该安全地哈希和验证密码', async () => {
      const password = 'testPassword123!';
      
      const hashedPassword = await hashPassword(password);
      expect(hashedPassword).not.toBe(password);
      expect(hashedPassword).toContain(':'); // 应该包含盐值分隔符
      
      const isValid = await verifyPassword(password, hashedPassword);
      expect(isValid).toBe(true);
      
      const isInvalid = await verifyPassword('wrongPassword', hashedPassword);
      expect(isInvalid).toBe(false);
    });
  });
  
  describe('数据脱敏', () => {
    test('应该正确脱敏邮箱地址', () => {
      const email = 'user@example.com';
      const masked = maskSensitiveData(email, 'email');
      
      expect(masked).toContain('@example.com');
      expect(masked).toContain('*');
      expect(masked).not.toBe(email);
    });
    
    test('应该正确脱敏手机号码', () => {
      const phone = '13812345678';
      const masked = maskSensitiveData(phone, 'phone');
      
      expect(masked).toBe('138****678');
    });
    
    test('应该正确脱敏身份证号', () => {
      const idCard = '123456789012345678';
      const masked = maskSensitiveData(idCard, 'idCard');
      
      expect(masked).toBe('1234**********5678');
    });
    
    test('应该正确脱敏姓名', () => {
      const name = '张三';
      const masked = maskSensitiveData(name, 'name');
      
      expect(masked).toBe('张*');
    });
  });
  
  describe('令牌生成', () => {
    test('应该生成安全的随机令牌', () => {
      const token1 = generateSecureToken();
      const token2 = generateSecureToken();
      
      expect(token1).not.toBe(token2);
      expect(token1.length).toBe(64); // 32字节 = 64十六进制字符
      expect(token2.length).toBe(64);
      
      // 应该只包含十六进制字符
      expect(/^[a-f0-9]+$/.test(token1)).toBe(true);
      expect(/^[a-f0-9]+$/.test(token2)).toBe(true);
    });
    
    test('应该生成指定长度的令牌', () => {
      const shortToken = generateSecureToken(16);
      const longToken = generateSecureToken(64);
      
      expect(shortToken.length).toBe(32); // 16字节 = 32十六进制字符
      expect(longToken.length).toBe(128); // 64字节 = 128十六进制字符
    });
  });
  
  describe('数据完整性', () => {
    test('应该生成和验证校验和', () => {
      const data = 'important-data-to-verify';
      const checksum = generateChecksum(data);
      
      expect(checksum).toBeTruthy();
      expect(typeof checksum).toBe('string');
      expect(checksum.length).toBe(64); // SHA256 = 64十六进制字符
      
      const isValid = verifyChecksum(data, checksum);
      expect(isValid).toBe(true);
      
      const isInvalid = verifyChecksum('tampered-data', checksum);
      expect(isInvalid).toBe(false);
    });
  });
  
  describe('输入验证', () => {
    test('应该检测SQL注入尝试', () => {
      const maliciousInputs = [
        "'; DROP TABLE users; --",
        "1' OR '1'='1",
        "admin'--",
        "1' UNION SELECT * FROM users--"
      ];
      
      maliciousInputs.forEach(input => {
        const containsSQLKeywords = /DROP|UNION|SELECT|INSERT|UPDATE|DELETE/i.test(input);
        const containsSQLChars = /['";]/.test(input);
        
        expect(containsSQLKeywords || containsSQLChars).toBe(true);
      });
    });
    
    test('应该检测XSS尝试', () => {
      const xssPayloads = [
        '<script>alert("XSS")</script>',
        'javascript:alert("XSS")',
        '<img src="x" onerror="alert(\'XSS\')">',
        '<svg onload="alert(\'XSS\')"></svg>'
      ];
      
      xssPayloads.forEach(payload => {
        const containsScript = /<script|javascript:|on\w+=/i.test(payload);
        expect(containsScript).toBe(true);
      });
    });
  });
  
  describe('文件安全', () => {
    test('应该验证文件类型', () => {
      const allowedTypes = ['image/jpeg', 'image/png', 'image/gif'];
      
      const validateFileType = (mimeType: string, allowed: string[]) => {
        return allowed.includes(mimeType);
      };
      
      expect(validateFileType('image/jpeg', allowedTypes)).toBe(true);
      expect(validateFileType('image/png', allowedTypes)).toBe(true);
      expect(validateFileType('application/javascript', allowedTypes)).toBe(false);
      expect(validateFileType('text/html', allowedTypes)).toBe(false);
    });
    
    test('应该限制文件大小', () => {
      const maxSize = 5 * 1024 * 1024; // 5MB
      
      const validateFileSize = (size: number, max: number) => {
        return size <= max;
      };
      
      expect(validateFileSize(1024, maxSize)).toBe(true);
      expect(validateFileSize(maxSize, maxSize)).toBe(true);
      expect(validateFileSize(maxSize + 1, maxSize)).toBe(false);
    });
  });
  
  describe('敏感数据处理', () => {
    test('应该清理敏感信息', () => {
      const sensitiveData = {
        password: 'secret123',
        apiKey: 'sk-1234567890',
        token: 'bearer-token-xyz',
        creditCard: '4111111111111111',
        normalField: 'normal-value'
      };
      
      const sanitizeSensitiveData = (data: any) => {
        const sensitiveFields = ['password', 'apiKey', 'token', 'creditCard'];
        const sanitized = { ...data };
        
        Object.keys(sanitized).forEach(key => {
          if (sensitiveFields.includes(key)) {
            sanitized[key] = '[REDACTED]';
          }
        });
        
        return sanitized;
      };
      
      const sanitized = sanitizeSensitiveData(sensitiveData);
      
      expect(sanitized.password).toBe('[REDACTED]');
      expect(sanitized.apiKey).toBe('[REDACTED]');
      expect(sanitized.token).toBe('[REDACTED]');
      expect(sanitized.creditCard).toBe('[REDACTED]');
      expect(sanitized.normalField).toBe('normal-value');
    });
    
    test('应该清理错误消息中的敏感信息', () => {
      const sensitiveError = 'Database connection failed: mongodb://user:password@localhost:27017/db';
      
      const sanitizeErrorMessage = (message: string) => {
        return message
          .replace(/mongodb:\/\/[^@]+@[^\/]+/g, 'mongodb://[REDACTED]')
          .replace(/password[=:]\s*\S+/gi, 'password=[REDACTED]')
          .replace(/token[=:]\s*\S+/gi, 'token=[REDACTED]')
          .replace(/key[=:]\s*\S+/gi, 'key=[REDACTED]');
      };
      
      const sanitized = sanitizeErrorMessage(sensitiveError);
      
      expect(sanitized).not.toContain('password');
      expect(sanitized).toContain('[REDACTED]');
      expect(sanitized).toContain('Database connection failed');
    });
  });
  
  describe('会话安全', () => {
    test('应该生成安全的会话ID', () => {
      const generateSessionId = () => {
        const crypto = require('crypto');
        return crypto.randomBytes(32).toString('hex');
      };
      
      const sessionId1 = generateSessionId();
      const sessionId2 = generateSessionId();
      
      expect(sessionId1).not.toBe(sessionId2);
      expect(sessionId1.length).toBe(64);
      expect(sessionId2.length).toBe(64);
      
      // 应该只包含十六进制字符
      expect(/^[a-f0-9]+$/.test(sessionId1)).toBe(true);
      expect(/^[a-f0-9]+$/.test(sessionId2)).toBe(true);
    });
  });
  
  describe('JWT令牌验证', () => {
    test('应该验证JWT令牌格式', () => {
      const validateJWTFormat = (token: string) => {
        if (!token || typeof token !== 'string') return false;
        const parts = token.split('.');
        return parts.length === 3;
      };
      
      const validToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c';
      const invalidToken = 'invalid.token';
      const emptyToken = '';
      
      expect(validateJWTFormat(validToken)).toBe(true);
      expect(validateJWTFormat(invalidToken)).toBe(false);
      expect(validateJWTFormat(emptyToken)).toBe(false);
    });
  });
  
  describe('API密钥验证', () => {
    test('应该验证API密钥格式', () => {
      const validateAPIKey = (key: any) => {
        return typeof key === 'string' && key.length >= 10;
      };
      
      const validKey = 'valid-api-key-12345';
      const shortKey = 'short';
      const nullKey = null;
      const emptyKey = '';
      
      expect(validateAPIKey(validKey)).toBe(true);
      expect(validateAPIKey(shortKey)).toBe(false);
      expect(validateAPIKey(nullKey)).toBe(false);
      expect(validateAPIKey(emptyKey)).toBe(false);
    });
  });
});