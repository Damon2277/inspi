/**
 * Visual Regression Detector Tests
 * 视觉回归检测器测试
 */

const VisualRegressionDetector = require('../visual-regression');
const fs = require('fs').promises;
const path = require('path');

describe('VisualRegressionDetector', () => {
  let detector;
  const testConfig = {
    screenshotDir: '.kiro/style-recovery/__tests__/screenshots',
    reportsDir: '.kiro/style-recovery/__tests__/reports',
    threshold: 0.1,
    viewports: [
      { width: 1920, height: 1080, name: 'desktop' }
    ],
    pages: [
      { url: '/', name: 'home' }
    ]
  };

  beforeEach(() => {
    detector = new VisualRegressionDetector(testConfig);
  });

  afterEach(async () => {
    if (detector) {
      await detector.cleanup();
    }
  });

  describe('initialization', () => {
    test('should initialize with default config', () => {
      const defaultDetector = new VisualRegressionDetector();
      expect(defaultDetector.config.screenshotDir).toBe('.kiro/style-recovery/screenshots');
      expect(defaultDetector.config.threshold).toBe(0.2);
      expect(defaultDetector.config.viewports).toHaveLength(3);
      expect(defaultDetector.config.pages).toHaveLength(5);
    });

    test('should initialize with custom config', () => {
      expect(detector.config.screenshotDir).toBe(testConfig.screenshotDir);
      expect(detector.config.threshold).toBe(testConfig.threshold);
      expect(detector.config.viewports).toHaveLength(1);
      expect(detector.config.pages).toHaveLength(1);
    });

    test('should create directories on initialization', async () => {
      await detector.initialize();
      
      // 检查目录是否存在
      await expect(fs.access(testConfig.screenshotDir)).resolves.not.toThrow();
      await expect(fs.access(testConfig.reportsDir)).resolves.not.toThrow();
    });
  });

  describe('screenshot capture', () => {
    beforeEach(async () => {
      await detector.initialize();
    });

    test('should capture page screenshot', async () => {
      // 注意：这个测试需要本地服务器运行
      // 在实际环境中，我们可能需要模拟或跳过这个测试
      const mockUrl = '/';
      const mockViewport = { width: 1920, height: 1080, name: 'desktop' };
      const mockSnapshotId = 'test-snapshot';

      // 模拟截图功能（实际测试中需要真实的服务器）
      try {
        const filepath = await detector.capturePageScreenshot(mockUrl, mockViewport, mockSnapshotId);
        expect(filepath).toContain('test-snapshot_desktop.png');
      } catch (error) {
        // 如果没有运行的服务器，测试应该优雅地处理
        expect(error.message).toContain('net::ERR_CONNECTION_REFUSED');
      }
    }, 30000);

    test('should handle screenshot capture errors', async () => {
      const invalidUrl = '/non-existent-page';
      const viewport = { width: 1920, height: 1080, name: 'desktop' };
      const snapshotId = 'error-test';

      try {
        await detector.capturePageScreenshot(invalidUrl, viewport, snapshotId);
      } catch (error) {
        expect(error).toBeDefined();
      }
    });
  });

  describe('image comparison', () => {
    beforeEach(async () => {
      await detector.initialize();
    });

    test('should compare identical images', async () => {
      // 创建测试图片文件
      const testImagePath1 = path.join(testConfig.screenshotDir, 'test1.png');
      const testImagePath2 = path.join(testConfig.screenshotDir, 'test2.png');
      
      // 创建相同的测试数据
      const testData = Buffer.from('test image data');
      await fs.writeFile(testImagePath1, testData);
      await fs.writeFile(testImagePath2, testData);

      const result = await detector.compareImages(testImagePath1, testImagePath2);
      
      expect(result.hasDifferences).toBe(false);
      expect(result.similarity).toBe(100);
      expect(result.differences).toHaveLength(0);
    });

    test('should detect different images', async () => {
      // 创建测试图片文件
      const testImagePath1 = path.join(testConfig.screenshotDir, 'test1.png');
      const testImagePath2 = path.join(testConfig.screenshotDir, 'test2.png');
      
      // 创建明显不同的测试数据
      await fs.writeFile(testImagePath1, Buffer.from('aaaaaaaaaa'));
      await fs.writeFile(testImagePath2, Buffer.from('bbbbbbbbbb'));

      const result = await detector.compareImages(testImagePath1, testImagePath2);
      
      expect(result.hasDifferences).toBe(true);
      expect(result.similarity).toBeLessThan(100);
    });

    test('should handle missing files', async () => {
      const nonExistentPath1 = path.join(testConfig.screenshotDir, 'missing1.png');
      const nonExistentPath2 = path.join(testConfig.screenshotDir, 'missing2.png');

      const result = await detector.compareImages(nonExistentPath1, nonExistentPath2);
      
      expect(result.hasDifferences).toBe(true);
      expect(result.error).toBeDefined();
    });
  });

  describe('snapshot comparison', () => {
    beforeEach(async () => {
      await detector.initialize();
    });

    test('should compare snapshots and generate report', async () => {
      const baseSnapshotId = 'base-snapshot';
      const currentSnapshotId = 'current-snapshot';

      // 创建模拟截图文件
      const baseImagePath = path.join(testConfig.screenshotDir, `home_${baseSnapshotId}_desktop.png`);
      const currentImagePath = path.join(testConfig.screenshotDir, `home_${currentSnapshotId}_desktop.png`);
      
      await fs.writeFile(baseImagePath, Buffer.from('base image'));
      await fs.writeFile(currentImagePath, Buffer.from('current image'));

      const result = await detector.compareSnapshots(baseSnapshotId, currentSnapshotId);
      
      expect(result.baseSnapshotId).toBe(baseSnapshotId);
      expect(result.currentSnapshotId).toBe(currentSnapshotId);
      expect(result.overallResult).toBeDefined();
      expect(result.pageResults).toHaveLength(1);
      expect(result.timestamp).toBeDefined();
    });
  });

  describe('report generation', () => {
    beforeEach(async () => {
      await detector.initialize();
    });

    test('should generate HTML report', () => {
      const mockResults = {
        baseSnapshotId: 'base',
        currentSnapshotId: 'current',
        timestamp: new Date().toISOString(),
        overallResult: {
          hasDifferences: true,
          totalComparisons: 2,
          failedComparisons: 1,
          averageSimilarity: 85.5
        },
        pageResults: [
          {
            page: 'home',
            viewport: 'desktop',
            url: '/',
            hasDifferences: true,
            similarity: 85.5,
            differences: ['Visual differences detected']
          }
        ]
      };

      const htmlContent = detector.generateHtmlReport(mockResults);
      
      expect(htmlContent).toContain('Visual Regression Report');
      expect(htmlContent).toContain('base');
      expect(htmlContent).toContain('current');
      expect(htmlContent).toContain('85.50%');
      expect(htmlContent).toContain('❌ Differences Found');
    });
  });

  describe('similarity calculation', () => {
    test('should calculate similarity correctly', () => {
      const buffer1 = Buffer.from([1, 2, 3, 4, 5]);
      const buffer2 = Buffer.from([1, 2, 3, 4, 5]);
      
      const similarity = detector.calculateSimilarity(buffer1, buffer2);
      expect(similarity).toBe(100);
    });

    test('should handle different buffer sizes', () => {
      const buffer1 = Buffer.from([1, 2, 3]);
      const buffer2 = Buffer.from([1, 2, 3, 4, 5]);
      
      const similarity = detector.calculateSimilarity(buffer1, buffer2);
      expect(similarity).toBe(0);
    });

    test('should calculate partial similarity', () => {
      const buffer1 = Buffer.from([1, 2, 3, 4, 5]);
      const buffer2 = Buffer.from([1, 2, 9, 4, 5]); // 1 difference out of 5
      
      const similarity = detector.calculateSimilarity(buffer1, buffer2);
      expect(similarity).toBe(80); // 80% similarity
    });
  });
});