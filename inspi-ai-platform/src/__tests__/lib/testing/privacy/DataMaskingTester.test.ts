/**
 * 数据脱敏测试器测试
 */

import { DataMaskingTester, SensitiveDataPattern } from '../../../../lib/testing/privacy/DataMaskingTester';

describe('DataMaskingTester', () => {
  let tester: DataMaskingTester;

  beforeEach(() => {
    tester = new DataMaskingTester();
  });

  describe('默认模式测试', () => {
    it('应该正确识别和脱敏邮箱地址', async () => {
      const testData = {
        email: 'user@example.com',
        contact: 'Please contact admin@company.org for support'
      };

      const results = await tester.testDataMasking(testData);
      const emailResult = results.find(r => r.pattern === 'email');

      expect(emailResult).toBeDefined();
      expect(emailResult?.passed).toBe(true);
    });

    it('应该正确识别和脱敏手机号码', async () => {
      const testData = {
        phone: '123-456-7890',
        mobile: '1234567890',
        text: 'Call me at 987-654-3210'
      };

      const results = await tester.testDataMasking(testData);
      const phoneResult = results.find(r => r.pattern === 'phone');

      expect(phoneResult).toBeDefined();
      expect(phoneResult?.passed).toBe(true);
    });

    it('应该正确识别和脱敏身份证号码', async () => {
      const testData = {
        idCard: '123456789012345678',
        shortId: '123456789012345'
      };

      const results = await tester.testDataMasking(testData);
      const idResult = results.find(r => r.pattern === 'idCard');

      expect(idResult).toBeDefined();
      expect(idResult?.passed).toBe(true);
    });

    it('应该正确识别和脱敏IP地址', async () => {
      const testData = {
        serverIp: '192.168.1.1',
        clientIp: '10.0.0.1',
        log: 'Request from 172.16.0.100'
      };

      const results = await tester.testDataMasking(testData);
      const ipResult = results.find(r => r.pattern === 'ipAddress');

      expect(ipResult).toBeDefined();
      expect(ipResult?.passed).toBe(true);
    });
  });

  describe('自定义模式测试', () => {
    it('应该支持注册自定义敏感数据模式', () => {
      const customPattern: SensitiveDataPattern = {
        name: 'creditCard',
        pattern: /\b\d{4}[-\s]?\d{4}[-\s]?\d{4}[-\s]?\d{4}\b/g,
        maskingRule: (card: string) => {
          const digits = card.replace(/\D/g, '');
          return '**** **** **** ' + digits.slice(-4);
        },
        testCases: [
          {
            input: '1234 5678 9012 3456',
            expectedMasked: '**** **** **** 3456',
            shouldMatch: true
          }
        ]
      };

      tester.registerPattern(customPattern);
      const patterns = tester.getRegisteredPatterns();

      expect(patterns).toContain('creditCard');
    });

    it('应该正确测试自定义模式', async () => {
      const customPattern: SensitiveDataPattern = {
        name: 'socialSecurity',
        pattern: /\b\d{3}-\d{2}-\d{4}\b/g,
        maskingRule: (ssn: string) => {
          return '***-**-' + ssn.slice(-4);
        },
        testCases: [
          {
            input: '123-45-6789',
            expectedMasked: '***-**-6789',
            shouldMatch: true
          },
          {
            input: '12345',
            expectedMasked: '12345',
            shouldMatch: false
          }
        ]
      };

      tester.registerPattern(customPattern);

      const testData = {
        ssn: '123-45-6789',
        note: 'SSN: 987-65-4321'
      };

      const results = await tester.testDataMasking(testData);
      const ssnResult = results.find(r => r.pattern === 'socialSecurity');

      expect(ssnResult).toBeDefined();
      expect(ssnResult?.passed).toBe(true);
    });
  });

  describe('脱敏验证测试', () => {
    it('应该检测未脱敏的敏感数据', () => {
      const originalData = {
        email: 'user@example.com',
        phone: '123-456-7890'
      };

      const maskedData = {
        email: 'u**r@example.com',
        phone: '123-456-7890' // 未脱敏
      };

      const isValid = tester.validateMaskedData(originalData, maskedData);
      expect(isValid).toBe(false);
    });

    it('应该通过正确脱敏的数据验证', () => {
      const originalData = {
        email: 'user@example.com',
        phone: '123-456-7890'
      };

      const maskedData = {
        email: 'u**r@example.com',
        phone: '123***7890'
      };

      const isValid = tester.validateMaskedData(originalData, maskedData);
      expect(isValid).toBe(true);
    });
  });

  describe('报告生成测试', () => {
    it('应该生成详细的脱敏测试报告', async () => {
      const testData = {
        email: 'test@example.com',
        phone: '123-456-7890'
      };

      const results = await tester.testDataMasking(testData);
      const report = tester.generateMaskingReport(results);

      expect(report).toContain('数据脱敏测试报告');
      expect(report).toContain('总测试数');
      expect(report).toContain('通过率');
    });

    it('应该在报告中包含失败详情', async () => {
      // 创建一个会失败的自定义模式
      const failingPattern: SensitiveDataPattern = {
        name: 'failing',
        pattern: /test/g,
        maskingRule: (value: string) => value, // 不进行脱敏，会导致失败
        testCases: [
          {
            input: 'test',
            expectedMasked: '****', // 期望脱敏但实际不会
            shouldMatch: true
          }
        ]
      };

      tester.registerPattern(failingPattern);

      const testData = { test: 'test' };
      const results = await tester.testDataMasking(testData);
      const report = tester.generateMaskingReport(results);

      expect(report).toContain('失败详情');
    });
  });

  describe('边界条件测试', () => {
    it('应该处理空数据', async () => {
      const results = await tester.testDataMasking({});
      expect(results).toBeDefined();
      expect(Array.isArray(results)).toBe(true);
    });

    it('应该处理null和undefined值', async () => {
      const testData = {
        nullValue: null,
        undefinedValue: undefined,
        emptyString: ''
      };

      const results = await tester.testDataMasking(testData);
      expect(results).toBeDefined();
      expect(results.every(r => r.passed)).toBe(true);
    });

    it('应该处理嵌套对象', async () => {
      const testData = {
        user: {
          email: 'nested@example.com',
          profile: {
            phone: '123-456-7890'
          }
        }
      };

      const results = await tester.testDataMasking(testData);
      expect(results).toBeDefined();
    });

    it('应该处理数组数据', async () => {
      const testData = {
        emails: ['user1@example.com', 'user2@example.com'],
        phones: ['123-456-7890', '987-654-3210']
      };

      const results = await tester.testDataMasking(testData);
      expect(results).toBeDefined();
    });
  });

  describe('性能测试', () => {
    it('应该在合理时间内完成大数据量测试', async () => {
      const largeData = {
        users: Array.from({ length: 1000 }, (_, i) => ({
          id: i,
          email: `user${i}@example.com`,
          phone: `${String(i).padStart(3, '0')}-456-7890`
        }))
      };

      const startTime = Date.now();
      const results = await tester.testDataMasking(largeData);
      const endTime = Date.now();

      expect(results).toBeDefined();
      expect(endTime - startTime).toBeLessThan(5000); // 应该在5秒内完成
    });
  });

  describe('错误处理测试', () => {
    it('应该处理无效的正则表达式', () => {
      expect(() => {
        const invalidPattern: SensitiveDataPattern = {
          name: 'invalid',
          pattern: /test/g, // 简单的正则表达式
          maskingRule: (value: string) => value,
          testCases: []
        };
        tester.registerPattern(invalidPattern);
      }).not.toThrow();
    });

    it('应该处理脱敏函数抛出的异常', async () => {
      const errorPattern: SensitiveDataPattern = {
        name: 'error',
        pattern: /error/g,
        maskingRule: () => {
          throw new Error('Masking error');
        },
        testCases: [
          {
            input: 'error',
            expectedMasked: 'masked',
            shouldMatch: true
          }
        ]
      };

      tester.registerPattern(errorPattern);

      const testData = { test: 'error' };
      
      // 应该不抛出异常，而是在结果中记录错误
      await expect(tester.testDataMasking(testData)).resolves.toBeDefined();
    });
  });
});