/**
 * helpers.ts 工具函数单元测试
 */

import {
  cn,
  formatDate,
  formatRelativeTime,
  generateId,
  truncateText,
  isValidEmail,
  formatNumber,
  debounce,
  throttle,
  sleep,
  copyToClipboard,
  generateAvatarUrl,
  calculateReadingTime,
  formatFileSize,
} from '@/shared/utils/helpers';

// Mock navigator.clipboard
const mockClipboard = {
  writeText: jest.fn(),
};
Object.assign(navigator, {
  clipboard: mockClipboard,
});

describe('helpers.ts 工具函数', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.clearAllTimers();
  });

  describe('cn - CSS类名合并', () => {
    test('应该合并基础类名', () => {
      const result = cn('class1', 'class2');
      expect(result).toBe('class1 class2');
    });

    test('应该处理条件类名', () => {
      const result = cn('base', true && 'conditional', false && 'hidden');
      expect(result).toBe('base conditional');
    });

    test('应该处理Tailwind冲突类名', () => {
      const result = cn('p-4', 'p-2');
      expect(result).toBe('p-2'); // tailwind-merge应该保留后面的
    });

    test('应该处理空值', () => {
      const result = cn('', null, undefined, 'valid');
      expect(result).toBe('valid');
    });
  });

  describe('formatDate - 日期格式化', () => {
    test('应该格式化Date对象', () => {
      const date = new Date('2024-01-15');
      const result = formatDate(date);
      expect(result).toMatch(/2024年1月15日/);
    });

    test('应该格式化日期字符串', () => {
      const result = formatDate('2024-01-15');
      expect(result).toMatch(/2024年1月15日/);
    });

    test('应该处理无效日期', () => {
      const result = formatDate('invalid-date');
      expect(result).toMatch(/Invalid Date|NaN/);
    });
  });

  describe('formatRelativeTime - 相对时间格式化', () => {
    beforeEach(() => {
      jest.useFakeTimers();
      jest.setSystemTime(new Date('2024-01-15 12:00:00'));
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    test('应该显示"刚刚"', () => {
      const now = new Date('2024-01-15 12:00:00');
      const result = formatRelativeTime(now);
      expect(result).toBe('刚刚');
    });

    test('应该显示分钟前', () => {
      const fiveMinutesAgo = new Date('2024-01-15 11:55:00');
      const result = formatRelativeTime(fiveMinutesAgo);
      expect(result).toBe('5分钟前');
    });

    test('应该显示小时前', () => {
      const twoHoursAgo = new Date('2024-01-15 10:00:00');
      const result = formatRelativeTime(twoHoursAgo);
      expect(result).toBe('2小时前');
    });

    test('应该显示天前', () => {
      const threeDaysAgo = new Date('2024-01-12 12:00:00');
      const result = formatRelativeTime(threeDaysAgo);
      expect(result).toBe('3天前');
    });

    test('应该显示完整日期（超过30天）', () => {
      const longAgo = new Date('2023-12-01');
      const result = formatRelativeTime(longAgo);
      expect(result).toMatch(/2023年12月1日/);
    });
  });

  describe('generateId - 生成随机ID', () => {
    test('应该生成唯一ID', () => {
      const id1 = generateId();
      const id2 = generateId();

      expect(id1).toBeDefined();
      expect(id2).toBeDefined();
      expect(id1).not.toBe(id2);
    });

    test('生成的ID应该是字符串', () => {
      const id = generateId();
      expect(typeof id).toBe('string');
      expect(id.length).toBeGreaterThan(0);
    });

    test('应该包含字母和数字', () => {
      const id = generateId();
      expect(id).toMatch(/^[a-z0-9]+$/);
    });
  });

  describe('truncateText - 文本截断', () => {
    test('应该截断长文本', () => {
      const longText = 'This is a very long text that should be truncated';
      const result = truncateText(longText, 20);
      expect(result).toBe('This is a very long ...');
    });

    test('不应该截断短文本', () => {
      const shortText = 'Short text';
      const result = truncateText(shortText, 20);
      expect(result).toBe('Short text');
    });

    test('应该处理边界情况', () => {
      const text = 'Exactly twenty chars';
      const result = truncateText(text, 20);
      expect(result).toBe('Exactly twenty chars');
    });

    test('应该处理空字符串', () => {
      const result = truncateText('', 10);
      expect(result).toBe('');
    });
  });

  describe('isValidEmail - 邮箱验证', () => {
    test('应该验证有效邮箱', () => {
      const validEmails = [
        'test@example.com',
        'user.name@domain.co.uk',
        'user+tag@example.org',
        'user123@test-domain.com',
      ];

      validEmails.forEach(email => {
        expect(isValidEmail(email)).toBe(true);
      });
    });

    test('应该拒绝无效邮箱', () => {
      const invalidEmails = [
        'invalid-email',
        '@example.com',
        'user@',
        'user@.com',
        'user..name@example.com',
        'user name@example.com',
      ];

      invalidEmails.forEach(email => {
        expect(isValidEmail(email)).toBe(false);
      });
    });
  });

  describe('formatNumber - 数字格式化', () => {
    test('应该格式化小数字', () => {
      expect(formatNumber(123)).toBe('123');
      expect(formatNumber(999)).toBe('999');
    });

    test('应该格式化千位数', () => {
      expect(formatNumber(1000)).toBe('1.0k');
      expect(formatNumber(1500)).toBe('1.5k');
      expect(formatNumber(9999)).toBe('10.0k');
    });

    test('应该格式化万位数', () => {
      expect(formatNumber(10000)).toBe('1.0万');
      expect(formatNumber(15000)).toBe('1.5万');
      expect(formatNumber(100000)).toBe('10.0万');
    });

    test('应该处理零', () => {
      expect(formatNumber(0)).toBe('0');
    });
  });

  describe('debounce - 防抖函数', () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    test('应该延迟执行函数', () => {
      const mockFn = jest.fn();
      const debouncedFn = debounce(mockFn, 100);

      debouncedFn('arg1');
      expect(mockFn).not.toHaveBeenCalled();

      jest.advanceTimersByTime(100);
      expect(mockFn).toHaveBeenCalledWith('arg1');
    });

    test('应该取消之前的调用', () => {
      const mockFn = jest.fn();
      const debouncedFn = debounce(mockFn, 100);

      debouncedFn('arg1');
      debouncedFn('arg2');
      debouncedFn('arg3');

      jest.advanceTimersByTime(100);
      expect(mockFn).toHaveBeenCalledTimes(1);
      expect(mockFn).toHaveBeenCalledWith('arg3');
    });
  });

  describe('throttle - 节流函数', () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    test('应该限制函数执行频率', () => {
      const mockFn = jest.fn();
      const throttledFn = throttle(mockFn, 100);

      throttledFn('arg1');
      throttledFn('arg2');
      throttledFn('arg3');

      expect(mockFn).toHaveBeenCalledTimes(1);
      expect(mockFn).toHaveBeenCalledWith('arg1');

      jest.advanceTimersByTime(100);
      throttledFn('arg4');
      expect(mockFn).toHaveBeenCalledTimes(2);
      expect(mockFn).toHaveBeenCalledWith('arg4');
    });
  });

  describe('sleep - 延迟函数', () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    test('应该返回Promise', () => {
      const promise = sleep(100);
      expect(promise).toBeInstanceOf(Promise);
    });

    test('应该在指定时间后resolve', async () => {
      const promise = sleep(100);
      jest.advanceTimersByTime(100);
      await expect(promise).resolves.toBeUndefined();
    });
  });

  describe('copyToClipboard - 复制到剪贴板', () => {
    test('应该成功复制文本', async () => {
      mockClipboard.writeText.mockResolvedValue(undefined);

      const result = await copyToClipboard('test text');

      expect(result).toBe(true);
      expect(mockClipboard.writeText).toHaveBeenCalledWith('test text');
    });

    test('应该处理复制失败', async () => {
      mockClipboard.writeText.mockRejectedValue(new Error('Copy failed'));

      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      const result = await copyToClipboard('test text');

      expect(result).toBe(false);
      expect(consoleSpy).toHaveBeenCalled();

      consoleSpy.mockRestore();
    });
  });

  describe('generateAvatarUrl - 生成头像URL', () => {
    test('应该生成正确的头像URL', () => {
      const url = generateAvatarUrl('John Doe');
      expect(url).toBe('https://ui-avatars.com/api/?name=John%20Doe&background=random&color=fff&size=128');
    });

    test('应该处理特殊字符', () => {
      const url = generateAvatarUrl('张三');
      expect(url).toContain(encodeURIComponent('张三'));
    });

    test('应该处理空字符串', () => {
      const url = generateAvatarUrl('');
      expect(url).toBe('https://ui-avatars.com/api/?name=&background=random&color=fff&size=128');
    });
  });

  describe('calculateReadingTime - 计算阅读时间', () => {
    test('应该计算短文本的阅读时间', () => {
      const shortText = 'This is a short text with about ten words.';
      const time = calculateReadingTime(shortText);
      expect(time).toBe(1); // 应该向上取整到1分钟
    });

    test('应该计算长文本的阅读时间', () => {
      const longText = 'word '.repeat(400); // 400个单词
      const time = calculateReadingTime(longText);
      expect(time).toBe(2); // 400/200 = 2分钟
    });

    test('应该处理空文本', () => {
      const time = calculateReadingTime('');
      expect(time).toBe(0);
    });

    test('应该处理只有空格的文本', () => {
      const time = calculateReadingTime('   ');
      expect(time).toBe(1); // 向上取整
    });
  });

  describe('formatFileSize - 文件大小格式化', () => {
    test('应该格式化字节', () => {
      expect(formatFileSize(0)).toBe('0 Bytes');
      expect(formatFileSize(500)).toBe('500 Bytes');
    });

    test('应该格式化KB', () => {
      expect(formatFileSize(1024)).toBe('1 KB');
      expect(formatFileSize(1536)).toBe('1.5 KB');
    });

    test('应该格式化MB', () => {
      expect(formatFileSize(1024 * 1024)).toBe('1 MB');
      expect(formatFileSize(1024 * 1024 * 1.5)).toBe('1.5 MB');
    });

    test('应该格式化GB', () => {
      expect(formatFileSize(1024 * 1024 * 1024)).toBe('1 GB');
      expect(formatFileSize(1024 * 1024 * 1024 * 2.5)).toBe('2.5 GB');
    });
  });
});
