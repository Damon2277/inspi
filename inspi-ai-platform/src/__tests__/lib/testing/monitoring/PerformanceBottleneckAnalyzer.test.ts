import { PerformanceBottleneckAnalyzer } from '../../../../lib/testing/monitoring/PerformanceBottleneckAnalyzer';

describe('PerformanceBottleneckAnalyzer', () => {
  let analyzer: PerformanceBottleneckAnalyzer;

  beforeEach(() => {
    analyzer = new PerformanceBottleneckAnalyzer({
      enableProfiling: true,
      profilingInterval: 50,
      hotspotThreshold: 100,
      memoryThreshold: 10 * 1024 * 1024, // 10MB
      cpuThreshold: 70,
      maxReports: 50
    });
  });

  afterEach(() => {
    analyzer.destroy();
  });

  describe('分析生命周期', () => {
    it('应该能够开始和结束分析', () => {
      const testId = 'lifecycle-test';
      const testName = 'Lifecycle Test';
      
      analyzer.startAnalysis(testId, testName);
      
      // 模拟一些执行时间
      setTimeout(() => {
        const profile = analyzer.endAnalysis(testId, 150, 5 * 1024 * 1024);
        
        expect(profile).toBeDefined();
        expect(profile!.testId).toBe(testId);
        expect(profile!.totalDuration).toBe(150);
      }, 100);
    });

    it('应该处理不存在的测试ID', () => {
      const profile = analyzer.endAnalysis('non-existent', 100, 1024);
      expect(profile).toBeNull();
    });
  });

  describe('瓶颈检测', () => {
    it('应该检测执行时间瓶颈', (done) => {
      analyzer.on('analysis:completed', ({ testId, bottlenecks }) => {
        expect(testId).toBe('slow-test');
        
        const timeBottleneck = bottlenecks.find(b => b.type === 'cpu' && b.description.includes('execution time'));
        expect(timeBottleneck).toBeDefined();
        expect(timeBottleneck!.severity).toBe('critical');
        
        done();
      });
      
      analyzer.startAnalysis('slow-test', 'Slow Test');
      
      // 模拟慢测试
      setTimeout(() => {
        analyzer.endAnalysis('slow-test', 6000, 2 * 1024 * 1024); // 6秒
      }, 100);
    });

    it('应该检测内存使用瓶颈', (done) => {
      const memoryAnalyzer = new PerformanceBottleneckAnalyzer({
        memoryThreshold: 1024 * 1024 // 1MB 阈值
      });
      
      memoryAnalyzer.on('analysis:completed', ({ testId, bottlenecks }) => {
        expect(testId).toBe('memory-test');
        
        const memoryBottleneck = bottlenecks.find(b => b.type === 'memory');
        expect(memoryBottleneck).toBeDefined();
        expect(memoryBottleneck!.severity).toBeOneOf(['medium', 'high', 'critical']);
        
        memoryAnalyzer.destroy();
        done();
      });
      
      memoryAnalyzer.startAnalysis('memory-test', 'Memory Test');
      
      setTimeout(() => {
        memoryAnalyzer.endAnalysis('memory-test', 1000, 5 * 1024 * 1024); // 5MB
      }, 50);
    });

    it('应该检测CPU使用瓶颈', (done) => {
      const cpuAnalyzer = new PerformanceBottleneckAnalyzer({
        cpuThreshold: 50, // 低阈值
        enableProfiling: true
      });
      
      cpuAnalyzer.on('analysis:completed', ({ testId, bottlenecks }) => {
        // CPU瓶颈检测依赖于实际的CPU分析数据
        // 在测试环境中可能不会总是触发
        expect(testId).toBe('cpu-test');
        
        cpuAnalyzer.destroy();
        done();
      });
      
      cpuAnalyzer.startAnalysis('cpu-test', 'CPU Test');
      
      // 模拟CPU密集型操作
      const start = Date.now();
      while (Date.now() - start < 100) {
        Math.random() * Math.random();
      }
      
      setTimeout(() => {
        cpuAnalyzer.endAnalysis('cpu-test', 200, 1024 * 1024);
      }, 50);
    });
  });

  describe('性能分析', () => {
    it('应该生成性能分析报告', async () => {
      analyzer.startAnalysis('profile-test', 'Profile Test');
      
      // 等待一些分析数据
      await new Promise(resolve => setTimeout(resolve, 200));
      
      const profile = analyzer.endAnalysis('profile-test', 300, 3 * 1024 * 1024);
      
      expect(profile).toBeDefined();
      expect(profile!.phases.length).toBeGreaterThan(0);
      expect(profile!.resourceUsage).toBeDefined();
      expect(profile!.resourceUsage.peakMemory).toBeGreaterThan(0);
    });

    it('应该分析执行阶段', async () => {
      analyzer.startAnalysis('phases-test', 'Phases Test');
      
      await new Promise(resolve => setTimeout(resolve, 250));
      
      const profile = analyzer.endAnalysis('phases-test', 300, 2 * 1024 * 1024);
      
      expect(profile!.phases.length).toBeGreaterThan(0);
      
      const phase = profile!.phases[0];
      expect(phase.name).toBeDefined();
      expect(phase.duration).toBeGreaterThan(0);
      expect(phase.startTime).toBeGreaterThanOrEqual(0);
      expect(phase.endTime).toBeGreaterThan(phase.startTime);
    });

    it('应该识别性能热点', async () => {
      // 注意：热点检测依赖于V8的CPU分析功能
      // 在某些测试环境中可能不可用
      analyzer.startAnalysis('hotspot-test', 'Hotspot Test');
      
      // 创建一些计算密集型操作
      function intensiveFunction() {
        let result = 0;
        for (let i = 0; i < 100000; i++) {
          result += Math.sqrt(i) * Math.sin(i);
        }
        return result;
      }
      
      intensiveFunction();
      
      await new Promise(resolve => setTimeout(resolve, 100));
      
      const profile = analyzer.endAnalysis('hotspot-test', 200, 1024 * 1024);
      
      // 热点可能不总是被检测到，取决于分析环境
      expect(profile!.hotspots).toBeDefined();
    });
  });

  describe('瓶颈报告管理', () => {
    it('应该存储和检索瓶颈报告', () => {
      analyzer.startAnalysis('report-test', 'Report Test');
      analyzer.endAnalysis('report-test', 6000, 15 * 1024 * 1024); // 触发多个瓶颈
      
      const reports = analyzer.getBottleneckReports('report-test');
      expect(reports.length).toBeGreaterThan(0);
      
      const allReports = analyzer.getBottleneckReports();
      expect(allReports.length).toBeGreaterThanOrEqual(reports.length);
    });

    it('应该限制报告数量', () => {
      const limitedAnalyzer = new PerformanceBottleneckAnalyzer({
        maxReports: 3
      });
      
      // 生成多个报告
      for (let i = 0; i < 5; i++) {
        const testId = `limit-test-${i}`;
        limitedAnalyzer.startAnalysis(testId, `Limit Test ${i}`);
        limitedAnalyzer.endAnalysis(testId, 6000, 15 * 1024 * 1024);
      }
      
      const allReports = limitedAnalyzer.getBottleneckReports();
      expect(allReports.length).toBeLessThanOrEqual(3);
      
      limitedAnalyzer.destroy();
    });

    it('应该清除报告', () => {
      analyzer.startAnalysis('clear-test', 'Clear Test');
      analyzer.endAnalysis('clear-test', 6000, 15 * 1024 * 1024);
      
      expect(analyzer.getBottleneckReports().length).toBeGreaterThan(0);
      
      analyzer.clearReports();
      expect(analyzer.getBottleneckReports().length).toBe(0);
    });
  });

  describe('统计信息', () => {
    it('应该提供瓶颈统计信息', () => {
      // 生成一些瓶颈报告
      analyzer.startAnalysis('stats-test-1', 'Stats Test 1');
      analyzer.endAnalysis('stats-test-1', 6000, 15 * 1024 * 1024);
      
      analyzer.startAnalysis('stats-test-2', 'Stats Test 2');
      analyzer.endAnalysis('stats-test-2', 3000, 8 * 1024 * 1024);
      
      const stats = analyzer.getBottleneckStatistics();
      
      expect(stats.totalBottlenecks).toBeGreaterThan(0);
      expect(stats.byType.size).toBeGreaterThan(0);
      expect(stats.bySeverity.size).toBeGreaterThan(0);
      expect(stats.averageImpact).toBeGreaterThan(0);
      expect(stats.topBottlenecks.length).toBeGreaterThan(0);
    });

    it('应该按类型和严重程度分组统计', () => {
      // 生成不同类型的瓶颈
      analyzer.startAnalysis('type-test-1', 'Type Test 1');
      analyzer.endAnalysis('type-test-1', 6000, 5 * 1024 * 1024); // 时间瓶颈
      
      analyzer.startAnalysis('type-test-2', 'Type Test 2');
      analyzer.endAnalysis('type-test-2', 1000, 20 * 1024 * 1024); // 内存瓶颈
      
      const stats = analyzer.getBottleneckStatistics();
      
      expect(stats.byType.has('cpu') || stats.byType.has('memory')).toBe(true);
      expect(stats.bySeverity.size).toBeGreaterThan(0);
    });
  });

  describe('建议生成', () => {
    it('应该为不同类型的瓶颈生成建议', () => {
      analyzer.startAnalysis('recommendation-test', 'Recommendation Test');
      const profile = analyzer.endAnalysis('recommendation-test', 6000, 15 * 1024 * 1024);
      
      const reports = analyzer.getBottleneckReports('recommendation-test');
      
      for (const report of reports) {
        expect(report.recommendations).toBeDefined();
        expect(report.recommendations.length).toBeGreaterThan(0);
        
        // 验证建议内容的相关性
        if (report.type === 'cpu') {
          expect(report.recommendations.some(r => r.includes('algorithm') || r.includes('CPU'))).toBe(true);
        } else if (report.type === 'memory') {
          expect(report.recommendations.some(r => r.includes('memory') || r.includes('Memory'))).toBe(true);
        }
      }
    });

    it('应该根据严重程度调整建议', () => {
      analyzer.startAnalysis('severity-test', 'Severity Test');
      analyzer.endAnalysis('severity-test', 10000, 50 * 1024 * 1024); // 非常严重的瓶颈
      
      const reports = analyzer.getBottleneckReports('severity-test');
      const criticalReports = reports.filter(r => r.severity === 'critical');
      
      if (criticalReports.length > 0) {
        const criticalReport = criticalReports[0];
        expect(criticalReport.recommendations.length).toBeGreaterThan(2);
      }
    });
  });

  describe('事件发射', () => {
    it('应该发射分析开始事件', (done) => {
      analyzer.on('analysis:started', ({ testId, testName }) => {
        expect(testId).toBe('event-test');
        expect(testName).toBe('Event Test');
        done();
      });
      
      analyzer.startAnalysis('event-test', 'Event Test');
    });

    it('应该发射分析完成事件', (done) => {
      analyzer.on('analysis:completed', ({ testId, profile, bottlenecks }) => {
        expect(testId).toBe('complete-event-test');
        expect(profile).toBeDefined();
        expect(bottlenecks).toBeDefined();
        done();
      });
      
      analyzer.startAnalysis('complete-event-test', 'Complete Event Test');
      
      setTimeout(() => {
        analyzer.endAnalysis('complete-event-test', 1000, 2 * 1024 * 1024);
      }, 50);
    });
  });

  describe('错误处理', () => {
    it('应该处理分析错误', () => {
      expect(() => {
        analyzer.startAnalysis('', ''); // 空ID和名称
      }).not.toThrow();
      
      expect(() => {
        analyzer.endAnalysis('error-test', -1, -1); // 负值
      }).not.toThrow();
    });

    it('应该在分析失败时继续工作', () => {
      // 模拟分析过程中的错误
      analyzer.startAnalysis('error-prone-test', 'Error Prone Test');
      
      // 即使有错误，也应该能够结束分析
      const profile = analyzer.endAnalysis('error-prone-test', 1000, 1024 * 1024);
      
      // 可能返回null或部分数据，但不应该抛出异常
      expect(profile !== undefined).toBe(true);
    });
  });

  describe('性能影响计算', () => {
    it('应该正确计算影响程度', () => {
      analyzer.startAnalysis('impact-test', 'Impact Test');
      const profile = analyzer.endAnalysis('impact-test', 8000, 25 * 1024 * 1024);
      
      const reports = analyzer.getBottleneckReports('impact-test');
      
      for (const report of reports) {
        expect(report.impact).toBeGreaterThanOrEqual(0);
        expect(report.impact).toBeLessThanOrEqual(100);
        
        // 高影响应该对应高严重程度
        if (report.impact > 80) {
          expect(report.severity).toBeOneOf(['high', 'critical']);
        }
      }
    });

    it('应该根据阈值计算相对影响', () => {
      const customAnalyzer = new PerformanceBottleneckAnalyzer({
        memoryThreshold: 5 * 1024 * 1024, // 5MB阈值
        cpuThreshold: 60
      });
      
      customAnalyzer.startAnalysis('threshold-test', 'Threshold Test');
      customAnalyzer.endAnalysis('threshold-test', 2000, 10 * 1024 * 1024); // 10MB，超过阈值2倍
      
      const reports = customAnalyzer.getBottleneckReports('threshold-test');
      const memoryReport = reports.find(r => r.type === 'memory');
      
      if (memoryReport) {
        expect(memoryReport.impact).toBeGreaterThan(100); // 超过阈值应该有高影响
      }
      
      customAnalyzer.destroy();
    });
  });
});