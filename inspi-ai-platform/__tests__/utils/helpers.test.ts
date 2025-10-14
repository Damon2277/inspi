import {
  formatDate,
  formatRelativeTime,
  generateId,
  truncateText,
  isValidEmail,
  formatNumber,
  generateAvatarUrl,
} from '@/utils/helpers';

describe('Helper Functions', () => {
  describe('formatDate', () => {
    it('formats date correctly', () => {
      const date = new Date('2024-01-15');
      const formatted = formatDate(date);
      expect(formatted).toMatch(/2024年1月15日/);
    });
  });

  describe('formatRelativeTime', () => {
    it('returns "刚刚" for very recent dates', () => {
      const now = new Date();
      expect(formatRelativeTime(now)).toBe('刚刚');
    });

    it('returns minutes for recent dates', () => {
      const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
      expect(formatRelativeTime(fiveMinutesAgo)).toBe('5分钟前');
    });
  });

  describe('generateId', () => {
    it('generates unique IDs', () => {
      const id1 = generateId();
      const id2 = generateId();
      expect(id1).not.toBe(id2);
      expect(typeof id1).toBe('string');
      expect(id1.length).toBeGreaterThan(0);
    });
  });

  describe('truncateText', () => {
    it('truncates long text', () => {
      const longText = 'This is a very long text that should be truncated';
      const truncated = truncateText(longText, 20);
      expect(truncated).toBe('This is a very long ...');
    });

    it('returns original text if shorter than max length', () => {
      const shortText = 'Short text';
      const result = truncateText(shortText, 20);
      expect(result).toBe(shortText);
    });
  });

  describe('isValidEmail', () => {
    it('validates correct email addresses', () => {
      expect(isValidEmail('test@example.com')).toBe(true);
      expect(isValidEmail('user.name@domain.co.uk')).toBe(true);
    });

    it('rejects invalid email addresses', () => {
      expect(isValidEmail('invalid-email')).toBe(false);
      expect(isValidEmail('test@')).toBe(false);
      expect(isValidEmail('@domain.com')).toBe(false);
    });
  });

  describe('formatNumber', () => {
    it('formats small numbers as-is', () => {
      expect(formatNumber(123)).toBe('123');
    });

    it('formats thousands with k suffix', () => {
      expect(formatNumber(1500)).toBe('1.5k');
    });

    it('formats ten thousands with 万 suffix', () => {
      expect(formatNumber(15000)).toBe('1.5万');
    });
  });

  describe('generateAvatarUrl', () => {
    it('generates avatar URL with encoded name', () => {
      const name = '张三';
      const url = generateAvatarUrl(name);
      expect(url).toContain('ui-avatars.com');
      expect(url).toContain(encodeURIComponent(name));
    });
  });
});
