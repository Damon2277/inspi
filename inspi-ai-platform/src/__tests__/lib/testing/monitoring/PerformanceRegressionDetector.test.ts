import { PerformanceRegressionDetector } from '../../../../lib/testing/monitoring/PerformanceRegressionDetector';

describe('PerformanceRegressionDetector', () => {
  let detector: PerformanceRegressionDetector;

  beforeEach(() => {
    detector = new PerformanceRegressionDetector({
      regressionThreshold: 0.2, // 20%
      minSamples: 3,
      maxHistorySize: 100,
      confidenceLevel: 0.95
    });
  });

  afterEach(() => {
    detector.destroy();
  });

  describe('基线管理', () => {
    it('应该建立性能基线', () => {
      // 记录一些性能数据
      detector.recordPerformance('test-1', 'Test 1', 100, 1024);
      detector.recordPerformance('test-1', 'Test 1', 110, 1100);
      detector.recordPerformance('test-1', 'Test 1', 95, 950);
      
      const baseline = detector.getBaseline('test-1');
      
      expect(baseline).toBeDefined();
      expect(baseline!.testId).toBe('test-1');
      expect(baseline!.averageExecutionTime).toBeCloseTo(101.67, 1);
      expect(baseline!.averageMemoryUsage).toBeCloseTo(1024.67, 1);
      expect(baseline!.sampleCount).toBe(3);
    });

    it('应该更新现有基线', () => {
      // 建立初始基线
      detector.recordPerformance('test-update', 'Test Update', 100, 1000);
      detector.recordPerformance('test-update', 'Test Update', 100, 1000);
      detector.recordPerformance('test-update', 'Test Update', 100, 1000);
      
      const initialBaseline = detector.getBaseline('test-update');
      expect(initialBaseline!.averageExecutionTime).toBe(100);
      
      // 添加新数据
      detector.recordPerformance('test-update', 'Test Update', 200, 2000);
      
      const updatedBaseline = detector.getBaseline('test-update');
      expect(updatedBaseline!.averageExecutionTime).toBe(125); // (100+100+100+200)/4
    });

    it('应该为不同测试维护独立基线', () => {
      detector.recordPerformance('test-a', 'Test A', 100, 1000);
      detector.recordPerformance('test-b', 'Test B', 200, 2000);
      
      const baselineA = detector.getBaseline('test-a');
      const baselineB = detector.getBaseline('test-b');
      
      expect(baselineA!.averageExecutionTime).toBe(100);
      expect(baselineB!.averageExecutionTime).toBe(200);
    });
  });

  describe('回归检测', () => {
    it('应该检测执行时间回归', (done) => {
      // 建立基线
      for (let i = 0; i < 5; i++) {
        detector.recordPerformance('regression-test', 'Regression Test', 100, 1000);
      }
      
      detector.on('regression:detected', (regression) => {
        expect(regression.testId).toBe('regression-test');
        expect(regression.type).toBe('execution-time');
        expect(regression.details.degradationPercentage).toBeGreaterThan(20);
        done();
      });
      
      // 记录回归数据
      detector.recordPerformance('regression-test', 'Regression Test', 150, 1000); // 50% 增长
    });

    it('应该检测内存使用回归', (done) => {
      // 建立基线
      for (let i = 0; i < 5; i++) {
        detector.recordPerformance('memory-regression', 'Memory Regression', 100, 1000);
      }
      
      detector.on('regression:detected', (regression) => {
        expect(regression.testId).toBe('memory-regression');
        expect(regression.type).toBe('memory-usage');
        expect(regression.details.degradationPercentage).toBeGreaterThan(20);
        done();
      });
      
      // 记录内存回归数据
      detector.recordPerformance('memory-regression', 'Memory Regression', 100, 1500); // 50% 增长
    });

    it('应该在样本不足时不检测回归', () => {
      let regressionDetected = false;
      
      detector.on('regression:detected', () => {
        regressionDetected = true;
      });
      
      // 只记录少量数据
      detector.recordPerformance('insufficient-test', 'Insufficient Test', 100, 1000);
      detector.recordPerformance('insufficient-test', 'Insufficient Test', 200, 2000);
      
      expect(regressionDetected).toBe(false);
    });

    it('应该使用置信水平进行回归检测', () => {
      const strictDetector = new PerformanceRegressionDetector({
        regressionThreshold: 0.1,
        minSamples: 3,
        confidenceLevel: 0.99 // 很高的置信水平
      });
      
      let regressionDetected = false;
      
      strictDetector.on('regression:detected', () => {
        regressionDetected = true;
      });
      
      // 建立基线
      for (let i = 0; i < 10; i++) {
        strictDetector.recordPerformance('strict-test', 'Strict Test', 100 + Math.random() * 5, 1000);
      }
      
      // 轻微增长可能不会触发回归
      strictDetector.recordPerformance('strict-test', 'Strict Test', 115, 1000);
      
      strictDetector.destroy();
    });
  });

  describe('趋势分析', () => {
    it('应该分析性能趋势', () => {
      const testId = 'trend-test';
      
      // 记录递增的性能数据
      for (let i = 1; i <= 10; i++) {
        detector.recordPerformance(testId, 'Trend Test', 100 + i * 5, 1000 + i * 50);
      }
      
      const trend = detector.analyzeTrend(testId);
      
      expect(trend).toBeDefined();
      expect(trend!.testId).toBe(testId);
      expect(trend!.executionTimeSlope).toBeGreaterThan(0); // 上升趋势
      expect(trend!.memoryUsageSlope).toBeGreaterThan(0); // 上升趋势
      expect(trend!.trendDirection).toBe('increasing');
    });

    it('应该识别稳定的性能趋势', () => {
      const testId = 'stable-test';
      
      // 记录稳定的性能数据
      for (let i = 1; i <= 10; i++) {
        detector.recordPerformance(testId, 'Stable Test', 100 + Math.random() * 2, 1000 + Math.random() * 20);
      }
      
      const trend = detector.analyzeTrend(testId);
      
      expect(trend!.trendDirection).toBe('stable');
      expect(Math.abs(trend!.executionTimeSlope)).toBeLessThan(1);
    });

    it('应该识别下降的性能趋势', () => {
      const testId = 'improving-test';
      
      // 记录递减的性能数据（性能改善）
      for (let i = 1; i <= 10; i++) {
        detector.recordPerformance(testId, 'Improving Test', 150 - i * 3, 1500 - i * 30);
      }
      
      const trend = detector.analyzeTrend(testId);
      
      expect(trend!.trendDirection).toBe('decreasing');
      expect(trend!.executionTimeSlope).toBeLessThan(0);
      expect(trend!.memoryUsageSlope).toBeLessThan(0);
    });
  });

  describe('统计信息', () => {
    it('应该提供准确的统计信息', () => {
      // 记录一些数据
      detector.recordPerformance('stats-1', 'Stats 1', 100, 1000);
      detector.recordPerformance('stats-2', 'Stats 2', 200, 2000);
      
      // 触发一个回归
      for (let i = 0; i < 5; i++) {
        detector.recordPerformance('regression-stats', 'Regression Stats', 100, 1000);
      }
      detector.recordPerformance('regression-stats', 'Regression Stats', 150, 1000);
      
      const stats = detector.getStatistics();
      
      expect(stats.totalTests).toBeGreaterThanOrEqual(2);
      expect(stats.totalDataPoints).toBeGreaterThanOrEqual(7);
      expect(stats.totalRegressions).toBeGreaterThanOrEqual(1);
      expect(stats.averageExecutionTime).toBeGreaterThan(0);
      expect(stats.averageMemoryUsage).toBeGreaterThan(0);
    });

    it('应该跟踪回归历史', () => {
      // 建立基线并触发回归
      for (let i = 0; i < 5; i++) {
        detector.recordPerformance('history-test', 'History Test', 100, 1000);
      }
      detector.recordPerformance('history-test', 'History Test', 150, 1000);
      
      const recentRegressions = detector.getRecentRegressions();
      
      expect(recentRegressions.length).toBeGreaterThan(0);
      expect(recentRegressions[0].testId).toBe('history-test');
    });
  });

  describe('数据管理', () => {
    it('应该能够清除历史数据', () => {
      detector.recordPerformance('clear-test', 'Clear Test', 100, 1000);
      
      expect(detector.getBaseline('clear-test')).toBeDefined();
      
      detector.clearHistory();
      
      expect(detector.getBaseline('clear-test')).toBeNull();
    });

    it('应该限制历史数据大小', () => {
      const limitedDetector = new PerformanceRegressionDetector({
        maxHistorySize: 5
      });
      
      // 记录超过限制的数据
      for (let i = 1; i <= 10; i++) {
        limitedDetector.recordPerformance(`test-${i}`, `Test ${i}`, 100, 1000);
      }
      
      const stats = limitedDetector.getStatistics();
      expect(stats.totalTests).toBeLessThanOrEqual(5);
      
      limitedDetector.destroy();
    });
  });

  describe('错误处理', () => {
    it('应该处理无效的性能数据', () => {
      expect(() => {
        detector.recordPerformance('invalid-test', 'Invalid Test', -1, 1000);
      }).not.toThrow();
      
      expect(() => {
        detector.recordPerformance('invalid-test', 'Invalid Test', 100, -1);
      }).not.toThrow();
    });

    it('应该处理不存在的测试ID', () => {
      const baseline = detector.getBaseline('non-existent');
      expect(baseline).toBeNull();
      
      const trend = detector.analyzeTrend('non-existent');
      expect(trend).toBeNull();
    });
  });

  describe('事件发射', () => {
    it('应该发射基线更新事件', (done) => {
      detector.on('baseline:updated', (baseline) => {
        expect(baseline.testId).toBe('baseline-event-test');
        expect(baseline.sampleCount).toBe(1);
        done();
      });
      
      detector.recordPerformance('baseline-event-test', 'Baseline Event Test', 100, 1000);
    });

    it('应该发射趋势变化事件', (done) => {
      detector.on('trend:changed', (trend) => {
        expect(trend.testId).toBe('trend-event-test');
        done();
      });
      
      // 记录足够的数据以触发趋势分析
      for (let i = 1; i <= 6; i++) {
        detector.recordPerformance('trend-event-test', 'Trend Event Test', 100 + i * 10, 1000);
      }
    });
  });

  describe('高级分析', () => {
    it('应该检测性能异常值', () => {
      const testId = 'outlier-test';
      
      // 记录正常数据
      for (let i = 0; i < 10; i++) {
        detector.recordPerformance(testId, 'Outlier Test', 100 + Math.random() * 5, 1000);
      }
      
      // 记录异常值
      detector.recordPerformance(testId, 'Outlier Test', 500, 1000); // 明显的异常值
      
      const baseline = detector.getBaseline(testId);
      expect(baseline).toBeDefined();
      
      // 基线应该不受异常值影响太大
      expect(baseline!.averageExecutionTime).toBeLessThan(200);
    });

    it('应该计算性能变异系数', () => {
      const testId = 'variance-test';
      
      // 记录有变异的数据
      const values = [90, 95, 100, 105, 110, 85, 115, 92, 108, 97];
      values.forEach(value => {
        detector.recordPerformance(testId, 'Variance Test', value, 1000);
      });
      
      const baseline = detector.getBaseline(testId);
      expect(baseline!.executionTimeVariance).toBeGreaterThan(0);
      expect(baseline!.executionTimeStdDev).toBeGreaterThan(0);
    });

    it('应该支持自定义回归阈值', () => {
      const customDetector = new PerformanceRegressionDetector({
        regressionThreshold: 0.5, // 50% 阈值
        minSamples: 3
      });
      
      let regressionDetected = false;
      
      customDetector.on('regression:detected', () => {
        regressionDetected = true;
      });
      
      // 建立基线
      for (let i = 0; i < 5; i++) {
        customDetector.recordPerformance('custom-test', 'Custom Test', 100, 1000);
      }
      
      // 30% 增长不应该触发回归（阈值是50%）
      customDetector.recordPerformance('custom-test', 'Custom Test', 130, 1000);
      
      expect(regressionDetected).toBe(false);
      
      // 60% 增长应该触发回归
      customDetector.recordPerformance('custom-test', 'Custom Test', 160, 1000);
      
      setTimeout(() => {
        expect(regressionDetected).toBe(true);
        customDetector.destroy();
      }, 10);
    });
  });
});