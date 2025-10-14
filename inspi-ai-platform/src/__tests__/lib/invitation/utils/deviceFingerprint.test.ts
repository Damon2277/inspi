/**
 * 设备指纹工具测试
 */

import { DeviceFingerprintGenerator, ClientDeviceInfo } from '@/lib/invitation/utils/deviceFingerprint';

describe('DeviceFingerprintGenerator', () => {
  describe('generateFingerprint', () => {
    it('should generate fingerprint from client info', () => {
      const clientInfo: ClientDeviceInfo = {
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        screenWidth: 1920,
        screenHeight: 1080,
        timezone: 'Asia/Shanghai',
        language: 'zh-CN',
        platform: 'Win32',
        cookieEnabled: true,
        colorDepth: 24,
        pixelRatio: 1,
        touchSupport: false,
        hardwareConcurrency: 8,
        maxTouchPoints: 0,
      };

      const fingerprint = DeviceFingerprintGenerator.generateFingerprint(clientInfo);

      expect(fingerprint.userAgent).toBe(clientInfo.userAgent);
      expect(fingerprint.screenResolution).toBe('1920x1080');
      expect(fingerprint.timezone).toBe('Asia/Shanghai');
      expect(fingerprint.language).toBe('zh-CN');
      expect(fingerprint.platform).toBe('Win32');
      expect(fingerprint.cookieEnabled).toBe(true);
      expect(fingerprint.hash).toBeTruthy();
      expect(fingerprint.hash).toHaveLength(64); // SHA-256 hash length
    });

    it('should handle missing client info with defaults', () => {
      const clientInfo: ClientDeviceInfo = {};

      const fingerprint = DeviceFingerprintGenerator.generateFingerprint(clientInfo);

      expect(fingerprint.userAgent).toBe('');
      expect(fingerprint.screenResolution).toBe('0x0');
      expect(fingerprint.timezone).toBeTruthy(); // Should use system default
      expect(fingerprint.language).toBe('en');
      expect(fingerprint.platform).toBe('');
      expect(fingerprint.cookieEnabled).toBe(true);
      expect(fingerprint.hash).toBeTruthy();
    });
  });

  describe('generateFromHeaders', () => {
    it('should generate fingerprint from HTTP headers', () => {
      const headers = {
        'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'accept-language': 'zh-CN,zh;q=0.9,en;q=0.8',
      };

      const fingerprint = DeviceFingerprintGenerator.generateFromHeaders(headers);

      expect(fingerprint.userAgent).toBe(headers['user-agent']);
      expect(fingerprint.language).toBe('zh');
      expect(fingerprint.platform).toBe('Windows');
      expect(fingerprint.screenResolution).toBe('0x0');
      expect(fingerprint.timezone).toBe('UTC');
      expect(fingerprint.hash).toBeTruthy();
    });

    it('should handle array headers', () => {
      const headers = {
        'user-agent': ['Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)'],
        'accept-language': ['en-US,en;q=0.9'],
      };

      const fingerprint = DeviceFingerprintGenerator.generateFromHeaders(headers);

      expect(fingerprint.userAgent).toBe('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)');
      expect(fingerprint.language).toBe('en');
      expect(fingerprint.platform).toBe('macOS');
    });

    it('should extract platform from user agent correctly', () => {
      const testCases = [
        {
          userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
          expectedPlatform: 'Windows',
        },
        {
          userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)',
          expectedPlatform: 'macOS',
        },
        {
          userAgent: 'Mozilla/5.0 (X11; Linux x86_64)',
          expectedPlatform: 'Linux',
        },
        {
          userAgent: 'Mozilla/5.0 (Linux; Android 11)',
          expectedPlatform: 'Android',
        },
        {
          userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 15_0)',
          expectedPlatform: 'iOS',
        },
        {
          userAgent: 'Mozilla/5.0 (iPad; CPU OS 15_0)',
          expectedPlatform: 'iOS',
        },
        {
          userAgent: 'Unknown Browser',
          expectedPlatform: 'Unknown',
        },
      ];

      testCases.forEach(({ userAgent, expectedPlatform }) => {
        const fingerprint = DeviceFingerprintGenerator.generateFromHeaders({
          'user-agent': userAgent,
        });
        expect(fingerprint.platform).toBe(expectedPlatform);
      });
    });
  });

  describe('validateFingerprint', () => {
    it('should validate correct fingerprint', () => {
      const clientInfo: ClientDeviceInfo = {
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
        screenWidth: 1920,
        screenHeight: 1080,
        timezone: 'Asia/Shanghai',
        language: 'zh-CN',
        platform: 'Win32',
        cookieEnabled: true,
      };

      const fingerprint = DeviceFingerprintGenerator.generateFingerprint(clientInfo);
      const isValid = DeviceFingerprintGenerator.validateFingerprint(fingerprint);

      expect(isValid).toBe(true);
    });

    it('should reject fingerprint with invalid hash', () => {
      const fingerprint = DeviceFingerprintGenerator.generateFingerprint({});
      fingerprint.hash = 'invalid_hash';

      const isValid = DeviceFingerprintGenerator.validateFingerprint(fingerprint);

      expect(isValid).toBe(false);
    });

    it('should reject fingerprint without hash', () => {
      const fingerprint = DeviceFingerprintGenerator.generateFingerprint({});
      fingerprint.hash = '';

      const isValid = DeviceFingerprintGenerator.validateFingerprint(fingerprint);

      expect(isValid).toBe(false);
    });
  });

  describe('calculateSimilarity', () => {
    it('should return 1 for identical fingerprints', () => {
      const fp1 = DeviceFingerprintGenerator.generateFingerprint({
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
        screenWidth: 1920,
        screenHeight: 1080,
        timezone: 'Asia/Shanghai',
        language: 'zh-CN',
        platform: 'Win32',
      });

      const fp2 = { ...fp1 };

      const similarity = DeviceFingerprintGenerator.calculateSimilarity(fp1, fp2);

      expect(similarity).toBe(1);
    });

    it('should return 0 for completely different fingerprints', () => {
      const fp1 = DeviceFingerprintGenerator.generateFingerprint({
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
        screenWidth: 1920,
        screenHeight: 1080,
        timezone: 'Asia/Shanghai',
        language: 'zh-CN',
        platform: 'Win32',
      });

      const fp2 = DeviceFingerprintGenerator.generateFingerprint({
        userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)',
        screenWidth: 1440,
        screenHeight: 900,
        timezone: 'America/New_York',
        language: 'en-US',
        platform: 'MacIntel',
      });

      const similarity = DeviceFingerprintGenerator.calculateSimilarity(fp1, fp2);

      expect(similarity).toBeLessThan(0.5);
    });

    it('should return partial similarity for partially matching fingerprints', () => {
      const fp1 = DeviceFingerprintGenerator.generateFingerprint({
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
        screenWidth: 1920,
        screenHeight: 1080,
        timezone: 'Asia/Shanghai',
        language: 'zh-CN',
        platform: 'Win32',
      });

      const fp2 = DeviceFingerprintGenerator.generateFingerprint({
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)', // Same
        screenWidth: 1920,
        screenHeight: 1080, // Same
        timezone: 'Asia/Shanghai', // Same
        language: 'en-US', // Different
        platform: 'MacIntel', // Different
      });

      const similarity = DeviceFingerprintGenerator.calculateSimilarity(fp1, fp2);

      expect(similarity).toBeGreaterThan(0.5);
      expect(similarity).toBeLessThan(1);
    });
  });

  describe('isSuspiciousFingerprint', () => {
    it('should flag fingerprint with missing user agent', () => {
      const fingerprint = DeviceFingerprintGenerator.generateFingerprint({
        userAgent: '',
      });

      const result = DeviceFingerprintGenerator.isSuspiciousFingerprint(fingerprint);

      expect(result.isSuspicious).toBe(true);
      expect(result.reasons).toContain('用户代理信息异常或缺失');
    });

    it('should flag fingerprint with missing screen resolution', () => {
      const fingerprint = DeviceFingerprintGenerator.generateFingerprint({
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
        screenWidth: 0,
        screenHeight: 0,
      });

      const result = DeviceFingerprintGenerator.isSuspiciousFingerprint(fingerprint);

      expect(result.isSuspicious).toBe(true);
      expect(result.reasons).toContain('屏幕分辨率信息缺失');
    });

    it('should flag fingerprint with automation tool signatures', () => {
      const suspiciousUserAgents = [
        'HeadlessChrome/91.0.4472.114',
        'PhantomJS/2.1.1',
        'Selenium/3.141.59',
        'WebDriver/1.0',
        'GoogleBot/2.1',
        'Crawler/1.0',
        'Spider/1.0',
      ];

      suspiciousUserAgents.forEach(userAgent => {
        const fingerprint = DeviceFingerprintGenerator.generateFingerprint({
          userAgent,
          screenWidth: 1920,
          screenHeight: 1080,
        });

        const result = DeviceFingerprintGenerator.isSuspiciousFingerprint(fingerprint);

        expect(result.isSuspicious).toBe(true);
        expect(result.reasons).toContain('检测到自动化工具特征');
      });
    });

    it('should flag fingerprint with abnormal screen resolution', () => {
      const abnormalResolutions = [
        { width: 50, height: 50 },
        { width: 20000, height: 15000 },
        { width: 0, height: 1080 },
        { width: 1920, height: 0 },
      ];

      abnormalResolutions.forEach(({ width, height }) => {
        const fingerprint = DeviceFingerprintGenerator.generateFingerprint({
          userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
          screenWidth: width,
          screenHeight: height,
        });

        const result = DeviceFingerprintGenerator.isSuspiciousFingerprint(fingerprint);

        expect(result.isSuspicious).toBe(true);
        expect(result.reasons).toContain('屏幕分辨率异常');
      });
    });

    it('should not flag normal fingerprint', () => {
      const fingerprint = DeviceFingerprintGenerator.generateFingerprint({
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        screenWidth: 1920,
        screenHeight: 1080,
        timezone: 'Asia/Shanghai',
        language: 'zh-CN',
        platform: 'Win32',
      });

      const result = DeviceFingerprintGenerator.isSuspiciousFingerprint(fingerprint);

      expect(result.isSuspicious).toBe(false);
      expect(result.reasons).toHaveLength(0);
    });
  });

  describe('generateClientScript', () => {
    it('should generate valid JavaScript code', () => {
      const script = DeviceFingerprintGenerator.generateClientScript();

      expect(script).toContain('function collectDeviceInfo()');
      expect(script).toContain('navigator.userAgent');
      expect(script).toContain('screen.width');
      expect(script).toContain('screen.height');
      expect(script).toContain('window.getDeviceFingerprint');
      expect(script).not.toContain('undefined');
    });

    it('should be executable JavaScript', () => {
      const script = DeviceFingerprintGenerator.generateClientScript();

      // Should not throw when evaluated
      expect(() => {


        // eslint-disable-next-line no-new-func
        new Function(script);
      }).not.toThrow();
    });
  });
});
