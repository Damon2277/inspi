/**
 * 邀请系统工具函数测试
 */

import {
  generateInviteCode,
  generateUUID,
  validateInviteCodeFormat,
  validateEmail,
  calculateExpiryDate,
  isInviteCodeExpired,
  generateInviteLink,
  parseInviteLink,
  calculateConversionRate,
  formatRewardDescription,
  generateShareText,
  detectSuspiciousIPPattern,
  calculateRiskScore,
  formatDate,
  maskEmail,
  maskPhone,
  calculatePagination,
} from '../../../lib/invitation/utils';

describe('Invitation Utils', () => {
  describe('generateInviteCode', () => {
    it('should generate code with default length 8', () => {
      const code = generateInviteCode();
      expect(code).toHaveLength(8);
      expect(/^[A-Z0-9]+$/.test(code)).toBe(true);
    });

    it('should generate code with custom length', () => {
      const code = generateInviteCode(12);
      expect(code).toHaveLength(12);
      expect(/^[A-Z0-9]+$/.test(code)).toBe(true);
    });

    it('should generate unique codes', () => {
      const codes = new Set();
      for (let i = 0; i < 100; i++) {
        codes.add(generateInviteCode());
      }
      expect(codes.size).toBe(100);
    });
  });

  describe('generateUUID', () => {
    it('should generate valid UUID format', () => {
      const uuid = generateUUID();
      expect(uuid).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);
    });

    it('should generate unique UUIDs', () => {
      const uuids = new Set();
      for (let i = 0; i < 100; i++) {
        uuids.add(generateUUID());
      }
      expect(uuids.size).toBe(100);
    });
  });

  describe('validateInviteCodeFormat', () => {
    it('should validate correct format', () => {
      expect(validateInviteCodeFormat('ABC12345')).toBe(true);
      expect(validateInviteCodeFormat('12345678')).toBe(true);
      expect(validateInviteCodeFormat('ABCDEFGH')).toBe(true);
    });

    it('should reject incorrect format', () => {
      expect(validateInviteCodeFormat('abc12345')).toBe(false); // lowercase
      expect(validateInviteCodeFormat('ABC1234')).toBe(false); // too short
      expect(validateInviteCodeFormat('ABC123456')).toBe(false); // too long
      expect(validateInviteCodeFormat('ABC123@#')).toBe(false); // special chars
    });
  });

  describe('validateEmail', () => {
    it('should validate correct email formats', () => {
      expect(validateEmail('test@example.com')).toBe(true);
      expect(validateEmail('user.name@domain.co.uk')).toBe(true);
      expect(validateEmail('user+tag@example.org')).toBe(true);
    });

    it('should reject incorrect email formats', () => {
      expect(validateEmail('invalid-email')).toBe(false);
      expect(validateEmail('@example.com')).toBe(false);
      expect(validateEmail('test@')).toBe(false);
      expect(validateEmail('test.example.com')).toBe(false);
    });
  });

  describe('calculateExpiryDate', () => {
    it('should calculate expiry date with default 6 months', () => {
      const now = new Date();
      const expiry = calculateExpiryDate();
      const expectedMonth = (now.getMonth() + 6) % 12;
      expect(expiry.getMonth()).toBe(expectedMonth);
    });

    it('should calculate expiry date with custom months', () => {
      const now = new Date();
      const expiry = calculateExpiryDate(3);
      const expectedMonth = (now.getMonth() + 3) % 12;
      expect(expiry.getMonth()).toBe(expectedMonth);
    });
  });

  describe('isInviteCodeExpired', () => {
    it('should return true for expired date', () => {
      const pastDate = new Date();
      pastDate.setDate(pastDate.getDate() - 1);
      expect(isInviteCodeExpired(pastDate)).toBe(true);
    });

    it('should return false for future date', () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 1);
      expect(isInviteCodeExpired(futureDate)).toBe(false);
    });
  });

  describe('generateInviteLink', () => {
    it('should generate correct invite link', () => {
      const link = generateInviteLink('https://example.com', 'ABC12345');
      expect(link).toBe('https://example.com/invite/ABC12345');
    });
  });

  describe('parseInviteLink', () => {
    it('should parse invite code from link', () => {
      const code = parseInviteLink('https://example.com/invite/ABC12345');
      expect(code).toBe('ABC12345');
    });

    it('should return null for invalid link', () => {
      const code = parseInviteLink('https://example.com/invalid');
      expect(code).toBeNull();
    });
  });

  describe('calculateConversionRate', () => {
    it('should calculate correct conversion rate', () => {
      expect(calculateConversionRate(25, 100)).toBe(25);
      expect(calculateConversionRate(1, 3)).toBe(33.33);
    });

    it('should handle zero total', () => {
      expect(calculateConversionRate(0, 0)).toBe(0);
    });
  });

  describe('formatRewardDescription', () => {
    it('should format AI credits reward', () => {
      const desc = formatRewardDescription('ai_credits', 10);
      expect(desc).toBe('获得 10 次AI生成机会');
    });

    it('should format badge reward', () => {
      const desc = formatRewardDescription('badge', undefined, '新手徽章');
      expect(desc).toBe('新手徽章');
    });

    it('should use default description', () => {
      const desc = formatRewardDescription('unknown');
      expect(desc).toBe('获得特殊奖励');
    });
  });

  describe('generateShareText', () => {
    it('should generate WeChat share text', () => {
      const text = generateShareText('张老师', 'wechat');
      expect(text).toContain('张老师');
      expect(text).toContain('Inspi.AI');
    });

    it('should use default template for unknown platform', () => {
      const text = generateShareText('张老师', 'unknown');
      expect(text).toContain('张老师');
      expect(text).toContain('AI好搭子');
    });
  });

  describe('detectSuspiciousIPPattern', () => {
    it('should detect suspicious pattern', () => {
      const registrations = Array(6).fill(null).map(() => ({
        ip: '192.168.1.1',
        timestamp: new Date(),
      }));

      expect(detectSuspiciousIPPattern(registrations)).toBe(true);
    });

    it('should not detect normal pattern', () => {
      const registrations = [
        { ip: '192.168.1.1', timestamp: new Date() },
        { ip: '192.168.1.2', timestamp: new Date() },
        { ip: '192.168.1.3', timestamp: new Date() },
      ];

      expect(detectSuspiciousIPPattern(registrations)).toBe(false);
    });
  });

  describe('calculateRiskScore', () => {
    it('should calculate high risk score', () => {
      const score = calculateRiskScore({
        sameIPRegistrations: 10,
        registrationSpeed: 0.5,
        userAgent: 'bot',
      });

      expect(score).toBeGreaterThan(0.5);
    });

    it('should calculate low risk score', () => {
      const score = calculateRiskScore({
        sameIPRegistrations: 1,
        registrationSpeed: 60,
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      });

      expect(score).toBeLessThan(0.3);
    });
  });

  describe('formatDate', () => {
    it('should format date with default format', () => {
      const date = new Date('2023-12-25T15:30:45');
      const formatted = formatDate(date);
      expect(formatted).toBe('2023-12-25 15:30:45');
    });

    it('should format date with custom format', () => {
      const date = new Date('2023-12-25T15:30:45');
      const formatted = formatDate(date, 'YYYY/MM/DD');
      expect(formatted).toBe('2023/12/25');
    });
  });

  describe('maskEmail', () => {
    it('should mask email correctly', () => {
      expect(maskEmail('test@example.com')).toBe('te***@example.com');
      expect(maskEmail('a@example.com')).toBe('a***@example.com');
    });
  });

  describe('maskPhone', () => {
    it('should mask phone number correctly', () => {
      expect(maskPhone('13812345678')).toBe('138****5678');
      expect(maskPhone('1234567')).toBe('123***7');
    });
  });

  describe('calculatePagination', () => {
    it('should calculate pagination correctly', () => {
      const pagination = calculatePagination(2, 10, 25);

      expect(pagination.page).toBe(2);
      expect(pagination.limit).toBe(10);
      expect(pagination.total).toBe(25);
      expect(pagination.totalPages).toBe(3);
      expect(pagination.offset).toBe(10);
      expect(pagination.hasNext).toBe(true);
      expect(pagination.hasPrev).toBe(true);
    });

    it('should handle first page', () => {
      const pagination = calculatePagination(1, 10, 25);

      expect(pagination.hasPrev).toBe(false);
      expect(pagination.hasNext).toBe(true);
    });

    it('should handle last page', () => {
      const pagination = calculatePagination(3, 10, 25);

      expect(pagination.hasPrev).toBe(true);
      expect(pagination.hasNext).toBe(false);
    });
  });
});
