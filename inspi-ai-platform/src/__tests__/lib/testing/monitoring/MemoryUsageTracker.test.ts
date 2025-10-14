import { MemoryUsageTracker } from '../../../../lib/testing/monitoring/MemoryUsageTracker';

describe('MemoryUsageTracker', () => {
  let tracker: MemoryUsageTracker;

  beforeEach(() => {
    tracker = new MemoryUsageTracker({
      samplingInterval: 50,
      leakThreshold: 1024 * 1024, // 1MB
      maxSnapshots: 100,
      enableGCTracking: true,
    });
  });

  afterEach(() => {
    tracker.destroy();
  });

  describe('跟踪生命周期', () => {
    it('应该能够启动和停止跟踪', () => {
      expect(tracker.isTracking()).toBe(false);

      tracker.startTracking();
      expect(tracker.isTracking()).toBe(true);

      tracker.stopTracking();
      expect(tracker.isTracking()).toBe(false);
    });

    it('应该能够开始和结束测试跟踪', async () => {
      tracker.startTracking();

      const testId = 'memory-test-001';
      tracker.startTest(testId);

      // 等待一些内存快照
      await new Promise(resolve => setTimeout(resolve, 150));

      const analysis = tracker.endTest(testId);

      expect(analysis).toBeDefined();
      expect(analysis!.testId).toBe(testId);
      expect(analysis!.snapshots.length).toBeGreaterThan(0);
      expect(analysis!.peakMemoryUsage).toBeGreaterThan(0);
    });
  });

  describe('内存快照收集', () => {
    it('应该收集内存快照', async () => {
      tracker.startTracking();

      const testId = 'snapshot-test';
      tracker.startTest(testId);

      await new Promise(resolve => setTimeout(resolve, 200));

      const analysis = tracker.endTest(testId);

      expect(analysis!.snapshots.length).toBeGreaterThan(2);

      const snapshot = analysis!.snapshots[0];
      expect(snapshot.timestamp).toBeDefined();
      expect(snapshot.heapUsed).toBeGreaterThan(0);
      expect(snapshot.heapTotal).toBeGreaterThan(0);
      expect(snapshot.external).toBeGreaterThanOrEqual(0);
      expect(snapshot.arrayBuffers).toBeGreaterThanOrEqual(0);
    });

    it('应该跟踪堆空间使用情况', async () => {
      tracker.startTracking();

      const testId = 'heap-test';
      tracker.startTest(testId);

      await new Promise(resolve => setTimeout(resolve, 100));

      const analysis = tracker.endTest(testId);

      expect(analysis!.heapSpaces).toBeDefined();
      expect(analysis!.heapSpaces.length).toBeGreaterThan(0);

      const heapSpace = analysis!.heapSpaces[0];
      expect(heapSpace.spaceName).toBeDefined();
      expect(heapSpace.spaceSize).toBeGreaterThan(0);
      expect(heapSpace.spaceUsedSize).toBeGreaterThan(0);
    });
  });

  describe('内存泄漏检测', () => {
    it('应该检测内存泄漏', async () => {
      const leakTracker = new MemoryUsageTracker({
        samplingInterval: 10,
        leakThreshold: 1024, // 很低的阈值
        maxSnapshots: 100,
      });

      let leakDetected = false;
      leakTracker.on('memory:leak', (leak) => {
        expect(leak.testId).toBe('leak-test');
        expect(leak.leakSize).toBeGreaterThan(0);
        leakDetected = true;
      });

      leakTracker.startTracking();
      leakTracker.startTest('leak-test');

      // 模拟内存增长
      const largeArray: any[] = [];
      for (let i = 0; i < 1000; i++) {
        largeArray.push(new Array(100).fill(i));
      }

      await new Promise(resolve => setTimeout(resolve, 100));

      leakTracker.endTest('leak-test');

      // 清理
      largeArray.length = 0;
      leakTracker.destroy();

      expect(leakDetected).toBe(true);
    });

    it('应该分析内存泄漏模式', async () => {
      tracker.startTracking();

      const testId = 'pattern-test';
      tracker.startTest(testId);

      // 创建一些对象来模拟内存使用
      const objects: any[] = [];
      for (let i = 0; i < 100; i++) {
        objects.push({ data: new Array(100).fill(i) });
      }

      await new Promise(resolve => setTimeout(resolve, 150));

      const analysis = tracker.endTest(testId);

      expect(analysis!.memoryGrowthRate).toBeDefined();
      expect(analysis!.averageMemoryUsage).toBeGreaterThan(0);

      // 清理
      objects.length = 0;
    });
  });

  describe('垃圾回收跟踪', () => {
    it('应该跟踪垃圾回收事件', async () => {
      const gcTracker = new MemoryUsageTracker({
        enableGCTracking: true,
        samplingInterval: 50,
      });

      gcTracker.startTracking();
      gcTracker.startTest('gc-test');

      // 触发垃圾回收
      if (global.gc) {
        global.gc();
      }

      await new Promise(resolve => setTimeout(resolve, 100));

      const analysis = gcTracker.endTest('gc-test');

      expect(analysis!.gcStats).toBeDefined();
      expect(analysis!.gcStats.totalCollections).toBeGreaterThanOrEqual(0);

      gcTracker.destroy();
    });

    it('应该计算垃圾回收统计', async () => {
      tracker.startTracking();

      const testId = 'gc-stats-test';
      tracker.startTest(testId);

      await new Promise(resolve => setTimeout(resolve, 100));

      const analysis = tracker.endTest(testId);

      expect(analysis!.gcStats).toBeDefined();
      expect(analysis!.gcStats.averageGCDuration).toBeGreaterThanOrEqual(0);
      expect(analysis!.gcStats.totalGCTime).toBeGreaterThanOrEqual(0);
    });
  });

  describe('统计信息', () => {
    it('应该提供准确的统计信息', async () => {
      tracker.startTracking();

      // 运行多个测试
      for (let i = 0; i < 3; i++) {
        const testId = `stats-test-${i}`;
        tracker.startTest(testId);
        await new Promise(resolve => setTimeout(resolve, 50));
        tracker.endTest(testId);
      }

      const stats = tracker.getStatistics();

      expect(stats.totalTests).toBe(3);
      expect(stats.totalSnapshots).toBeGreaterThan(0);
      expect(stats.averageMemoryUsage).toBeGreaterThan(0);
      expect(stats.peakMemoryUsage).toBeGreaterThan(0);
      expect(stats.totalLeaks).toBeGreaterThanOrEqual(0);
    });

    it('应该跟踪活动测试', () => {
      tracker.startTracking();

      tracker.startTest('active-1');
      tracker.startTest('active-2');

      const activeTests = tracker.getActiveTests();
      expect(activeTests).toContain('active-1');
      expect(activeTests).toContain('active-2');
      expect(activeTests.length).toBe(2);

      tracker.endTest('active-1');

      const updatedActiveTests = tracker.getActiveTests();
      expect(updatedActiveTests).not.toContain('active-1');
      expect(updatedActiveTests).toContain('active-2');
      expect(updatedActiveTests.length).toBe(1);
    });
  });

  describe('数据管理', () => {
    it('应该能够清除数据', async () => {
      tracker.startTracking();

      tracker.startTest('clear-test');
      await new Promise(resolve => setTimeout(resolve, 50));
      tracker.endTest('clear-test');

      expect(tracker.getAllAnalyses().length).toBe(1);

      tracker.clearData();
      expect(tracker.getAllAnalyses().length).toBe(0);
    });

    it('应该限制快照数量', async () => {
      const limitedTracker = new MemoryUsageTracker({
        maxSnapshots: 5,
        samplingInterval: 10,
      });

      limitedTracker.startTracking();
      limitedTracker.startTest('limit-test');

      // 等待足够长的时间以生成更多快照
      await new Promise(resolve => setTimeout(resolve, 100));

      const analysis = limitedTracker.endTest('limit-test');

      expect(analysis!.snapshots.length).toBeLessThanOrEqual(5);

      limitedTracker.destroy();
    });
  });

  describe('错误处理', () => {
    it('应该处理不存在的测试ID', () => {
      tracker.startTracking();

      const analysis = tracker.endTest('non-existent-test');
      expect(analysis).toBeNull();
    });

    it('应该处理重复的测试ID', () => {
      tracker.startTracking();

      tracker.startTest('duplicate-test');
      tracker.startTest('duplicate-test'); // 应该覆盖第一个

      const analysis = tracker.endTest('duplicate-test');
      expect(analysis).toBeDefined();
    });

    it('应该在未启动跟踪时安全处理操作', () => {
      expect(() => {
        tracker.startTest('test');
        tracker.endTest('test');
      }).not.toThrow();
    });
  });

  describe('事件发射', () => {
    it('应该发射测试开始事件', (done) => {
      tracker.on('test:started', (data) => {
        expect(data.testId).toBe('event-test');
        done();
      });

      tracker.startTracking();
      tracker.startTest('event-test');
    });

    it('应该发射测试完成事件', (done) => {
      tracker.on('test:completed', (analysis) => {
        expect(analysis.testId).toBe('complete-test');
        expect(analysis.snapshots.length).toBeGreaterThan(0);
        done();
      });

      tracker.startTracking();
      tracker.startTest('complete-test');

      setTimeout(() => {
        tracker.endTest('complete-test');
      }, 100);
    });

    it('应该发射内存警告事件', (done) => {
      const warningTracker = new MemoryUsageTracker({
        samplingInterval: 10,
        memoryWarningThreshold: 1024, // 很低的阈值
      });

      warningTracker.on('memory:warning', (warning) => {
        expect(warning.testId).toBe('warning-test');
        expect(warning.currentUsage).toBeGreaterThan(1024);
        warningTracker.destroy();
        done();
      });

      warningTracker.startTracking();
      warningTracker.startTest('warning-test');

      // 等待内存采样
      setTimeout(() => {
        warningTracker.endTest('warning-test');
      }, 50);
    });
  });

  describe('内存分析', () => {
    it('应该分析内存使用模式', async () => {
      tracker.startTracking();

      const testId = 'analysis-test';
      tracker.startTest(testId);

      // 模拟不同的内存使用模式
      const data: any[] = [];
      for (let i = 0; i < 50; i++) {
        data.push(new Array(100).fill(i));
        if (i % 10 === 0) {
          await new Promise(resolve => setTimeout(resolve, 20));
        }
      }

      const analysis = tracker.endTest(testId);

      expect(analysis!.memoryGrowthRate).toBeDefined();
      expect(analysis!.memoryVariance).toBeDefined();
      expect(analysis!.peakMemoryUsage).toBeGreaterThan(analysis!.initialMemoryUsage);

      // 清理
      data.length = 0;
    });

    it('应该识别内存使用异常', async () => {
      tracker.startTracking();

      const testId = 'anomaly-test';
      tracker.startTest(testId);

      // 创建内存峰值
      const spike = new Array(1000).fill(0).map(() => new Array(100).fill(0));

      await new Promise(resolve => setTimeout(resolve, 100));

      const analysis = tracker.endTest(testId);

      expect(analysis!.hasMemorySpikes).toBeDefined();
      if (analysis!.hasMemorySpikes) {
        expect(analysis!.memorySpikes.length).toBeGreaterThan(0);
      }

      // 清理
      spike.length = 0;
    });
  });
});
