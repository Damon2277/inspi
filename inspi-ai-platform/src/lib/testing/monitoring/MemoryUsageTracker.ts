import { EventEmitter } from 'events';
import * as v8 from 'v8';

export interface MemorySnapshot {
  timestamp: number;
  heapUsed: number;
  heapTotal: number;
  external: number;
  rss: number;
  arrayBuffers: number;
  heapSpaceUsed: HeapSpaceUsage[];
  heapStatistics: v8.HeapStatistics;
}

export interface HeapSpaceUsage {
  spaceName: string;
  spaceSize: number;
  spaceUsedSize: number;
  spaceAvailableSize: number;
  physicalSpaceSize: number;
}

export interface MemoryLeak {
  testId: string;
  testName: string;
  startMemory: number;
  endMemory: number;
  leakSize: number;
  leakRate: number; // bytes per second
  duration: number;
  severity: 'low' | 'medium' | 'high' | 'critical';
}

export interface MemoryAnalysis {
  totalSnapshots: number;
  timeRange: { start: number; end: number };
  memoryGrowth: number;
  averageMemoryUsage: number;
  peakMemoryUsage: number;
  memoryLeaks: MemoryLeak[];
  garbageCollectionStats: GCStats;
  recommendations: string[];
}

export interface GCStats {
  totalCollections: number;
  totalTime: number;
  averageTime: number;
  collections: GCEvent[];
}

export interface GCEvent {
  timestamp: number;
  type: string;
  duration: number;
  memoryBefore: number;
  memoryAfter: number;
  memoryFreed: number;
}

export interface TrackerOptions {
  samplingInterval: number; // ms
  leakThreshold: number; // bytes
  maxSnapshots: number;
  enableGCTracking: boolean;
  enableHeapProfiling: boolean;
}

/**
 * 内存使用跟踪分析器
 * 跟踪和分析测试过程中的内存使用情况
 */
export class MemoryUsageTracker extends EventEmitter {
  private options: TrackerOptions;
  private snapshots: MemorySnapshot[] = [];
  private gcEvents: GCEvent[] = [];
  private testMemoryMap: Map<string, { start: MemorySnapshot; end?: MemorySnapshot }> = new Map();
  private samplingInterval?: NodeJS.Timeout;
  private isTracking = false;
  private gcObserver?: any;

  constructor(options: Partial<TrackerOptions> = {}) {
    super();
    this.options = {
      samplingInterval: 500, // 500ms
      leakThreshold: 10 * 1024 * 1024, // 10MB
      maxSnapshots: 2000,
      enableGCTracking: true,
      enableHeapProfiling: false,
      ...options
    };
  }

  /**
   * 开始内存跟踪
   */
  startTracking(): void {
    if (this.isTracking) {
      return;
    }

    this.isTracking = true;

    // 开始定期采样
    this.samplingInterval = setInterval(() => {
      this.captureMemorySnapshot();
    }, this.options.samplingInterval);

    // 启用GC跟踪
    if (this.options.enableGCTracking) {
      this.enableGCTracking();
    }

    // 启用堆分析
    if (this.options.enableHeapProfiling) {
      this.enableHeapProfiling();
    }

    this.emit('tracking:started');
  }

  /**
   * 停止内存跟踪
   */
  stopTracking(): void {
    if (!this.isTracking) {
      return;
    }

    this.isTracking = false;

    if (this.samplingInterval) {
      clearInterval(this.samplingInterval);
      this.samplingInterval = undefined;
    }

    if (this.gcObserver) {
      this.gcObserver.disconnect();
      this.gcObserver = undefined;
    }

    this.emit('tracking:stopped');
  }

  /**
   * 捕获内存快照
   */
  private captureMemorySnapshot(): void {
    const memUsage = process.memoryUsage();
    const heapSpaces = v8.getHeapSpaceStatistics();
    const heapStats = v8.getHeapStatistics();

    const snapshot: MemorySnapshot = {
      timestamp: Date.now(),
      heapUsed: memUsage.heapUsed,
      heapTotal: memUsage.heapTotal,
      external: memUsage.external,
      rss: memUsage.rss,
      arrayBuffers: memUsage.arrayBuffers,
      heapSpaceUsed: heapSpaces.map(space => ({
        spaceName: space.space_name,
        spaceSize: space.space_size,
        spaceUsedSize: space.space_used_size,
        spaceAvailableSize: space.space_available_size,
        physicalSpaceSize: space.physical_space_size
      })),
      heapStatistics: heapStats
    };

    this.snapshots.push(snapshot);

    // 保持快照数量在限制内
    if (this.snapshots.length > this.options.maxSnapshots) {
      this.snapshots = this.snapshots.slice(-this.options.maxSnapshots);
    }

    this.emit('snapshot:captured', snapshot);
  }

  /**
   * 启用垃圾回收跟踪
   */
  private enableGCTracking(): void {
    try {
      // 使用性能观察器跟踪GC事件
      const { PerformanceObserver } = require('perf_hooks');
      
      this.gcObserver = new PerformanceObserver((list: any) => {
        const entries = list.getEntries();
        entries.forEach((entry: any) => {
          if (entry.entryType === 'gc') {
            const memoryBefore = this.getLastSnapshot()?.heapUsed || 0;
            
            // 捕获GC后的内存快照
            setTimeout(() => {
              const memoryAfter = process.memoryUsage().heapUsed;
              
              const gcEvent: GCEvent = {
                timestamp: entry.startTime + entry.duration,
                type: this.getGCType(entry.kind),
                duration: entry.duration,
                memoryBefore,
                memoryAfter,
                memoryFreed: Math.max(0, memoryBefore - memoryAfter)
              };

              this.gcEvents.push(gcEvent);
              
              // 保持GC事件数量在限制内
              if (this.gcEvents.length > this.options.maxSnapshots) {
                this.gcEvents = this.gcEvents.slice(-this.options.maxSnapshots);
              }

              this.emit('gc:event', gcEvent);
            }, 10);
          }
        });
      });

      this.gcObserver.observe({ entryTypes: ['gc'] });
    } catch (error) {
      console.warn('Failed to enable GC tracking:', error.message);
    }
  }

  /**
   * 获取GC类型
   */
  private getGCType(kind: number): string {
    const gcTypes: { [key: number]: string } = {
      1: 'Scavenge',
      2: 'Mark-Sweep-Compact',
      4: 'Incremental Marking',
      8: 'Weak Phantom Callback Processing',
      15: 'All'
    };
    return gcTypes[kind] || `Unknown(${kind})`;
  }

  /**
   * 启用堆分析
   */
  private enableHeapProfiling(): void {
    try {
      // 定期触发堆快照分析
      setInterval(() => {
        if (this.isTracking) {
          this.analyzeHeapUsage();
        }
      }, 30000); // 每30秒分析一次
    } catch (error) {
      console.warn('Failed to enable heap profiling:', error.message);
    }
  }

  /**
   * 分析堆使用情况
   */
  private analyzeHeapUsage(): void {
    try {
      const heapStats = v8.getHeapStatistics();
      const heapSpaces = v8.getHeapSpaceStatistics();

      const analysis = {
        timestamp: Date.now(),
        heapStatistics: heapStats,
        heapSpaces: heapSpaces,
        fragmentation: this.calculateFragmentation(heapStats, heapSpaces)
      };

      this.emit('heap:analysis', analysis);
    } catch (error) {
      console.warn('Failed to analyze heap usage:', error.message);
    }
  }

  /**
   * 计算内存碎片化程度
   */
  private calculateFragmentation(heapStats: v8.HeapStatistics, heapSpaces: v8.HeapSpaceStatistics[]): number {
    const totalAllocated = heapSpaces.reduce((sum, space) => sum + space.space_used_size, 0);
    const totalAvailable = heapSpaces.reduce((sum, space) => sum + space.space_available_size, 0);
    const totalSize = heapSpaces.reduce((sum, space) => sum + space.space_size, 0);

    if (totalSize === 0) return 0;

    // 碎片化 = (总大小 - 已使用 - 可用) / 总大小
    const fragmented = totalSize - totalAllocated - totalAvailable;
    return fragmented / totalSize;
  }

  /**
   * 开始测试内存跟踪
   */
  startTestTracking(testId: string, testName: string): void {
    const snapshot = this.getLastSnapshot() || this.captureMemorySnapshotSync();
    this.testMemoryMap.set(testId, { start: snapshot });
    this.emit('test:memory:start', { testId, testName, snapshot });
  }

  /**
   * 结束测试内存跟踪
   */
  endTestTracking(testId: string): void {
    const testMemory = this.testMemoryMap.get(testId);
    if (!testMemory) {
      return;
    }

    const endSnapshot = this.getLastSnapshot() || this.captureMemorySnapshotSync();
    testMemory.end = endSnapshot;

    // 检查内存泄漏
    const leak = this.detectMemoryLeak(testId, testMemory.start, endSnapshot);
    if (leak) {
      this.emit('memory:leak', leak);
    }

    this.emit('test:memory:end', { testId, startSnapshot: testMemory.start, endSnapshot });
  }

  /**
   * 同步捕获内存快照
   */
  private captureMemorySnapshotSync(): MemorySnapshot {
    const memUsage = process.memoryUsage();
    const heapSpaces = v8.getHeapSpaceStatistics();
    const heapStats = v8.getHeapStatistics();

    return {
      timestamp: Date.now(),
      heapUsed: memUsage.heapUsed,
      heapTotal: memUsage.heapTotal,
      external: memUsage.external,
      rss: memUsage.rss,
      arrayBuffers: memUsage.arrayBuffers,
      heapSpaceUsed: heapSpaces.map(space => ({
        spaceName: space.space_name,
        spaceSize: space.space_size,
        spaceUsedSize: space.space_used_size,
        spaceAvailableSize: space.space_available_size,
        physicalSpaceSize: space.physical_space_size
      })),
      heapStatistics: heapStats
    };
  }

  /**
   * 检测内存泄漏
   */
  private detectMemoryLeak(testId: string, startSnapshot: MemorySnapshot, endSnapshot: MemorySnapshot): MemoryLeak | null {
    const memoryGrowth = endSnapshot.heapUsed - startSnapshot.heapUsed;
    const duration = endSnapshot.timestamp - startSnapshot.timestamp;
    const leakRate = duration > 0 ? memoryGrowth / (duration / 1000) : 0;

    if (memoryGrowth > this.options.leakThreshold) {
      let severity: MemoryLeak['severity'] = 'low';
      
      if (memoryGrowth > this.options.leakThreshold * 5) {
        severity = 'critical';
      } else if (memoryGrowth > this.options.leakThreshold * 3) {
        severity = 'high';
      } else if (memoryGrowth > this.options.leakThreshold * 2) {
        severity = 'medium';
      }

      return {
        testId,
        testName: testId, // 简化实现
        startMemory: startSnapshot.heapUsed,
        endMemory: endSnapshot.heapUsed,
        leakSize: memoryGrowth,
        leakRate,
        duration,
        severity
      };
    }

    return null;
  }

  /**
   * 获取最后一个快照
   */
  private getLastSnapshot(): MemorySnapshot | null {
    return this.snapshots.length > 0 ? this.snapshots[this.snapshots.length - 1] : null;
  }

  /**
   * 分析内存使用情况
   */
  analyzeMemoryUsage(timeWindow?: number): MemoryAnalysis {
    const cutoffTime = timeWindow ? Date.now() - timeWindow : 0;
    const relevantSnapshots = this.snapshots.filter(s => s.timestamp > cutoffTime);
    
    if (relevantSnapshots.length === 0) {
      return {
        totalSnapshots: 0,
        timeRange: { start: 0, end: 0 },
        memoryGrowth: 0,
        averageMemoryUsage: 0,
        peakMemoryUsage: 0,
        memoryLeaks: [],
        garbageCollectionStats: {
          totalCollections: 0,
          totalTime: 0,
          averageTime: 0,
          collections: []
        },
        recommendations: []
      };
    }

    const startSnapshot = relevantSnapshots[0];
    const endSnapshot = relevantSnapshots[relevantSnapshots.length - 1];
    
    const memoryGrowth = endSnapshot.heapUsed - startSnapshot.heapUsed;
    const averageMemoryUsage = relevantSnapshots.reduce((sum, s) => sum + s.heapUsed, 0) / relevantSnapshots.length;
    const peakMemoryUsage = Math.max(...relevantSnapshots.map(s => s.heapUsed));

    // 分析内存泄漏
    const memoryLeaks = this.analyzeMemoryLeaks();

    // 分析GC统计
    const gcStats = this.analyzeGCStats(cutoffTime);

    // 生成建议
    const recommendations = this.generateRecommendations(memoryGrowth, averageMemoryUsage, peakMemoryUsage, memoryLeaks, gcStats);

    return {
      totalSnapshots: relevantSnapshots.length,
      timeRange: { start: startSnapshot.timestamp, end: endSnapshot.timestamp },
      memoryGrowth,
      averageMemoryUsage,
      peakMemoryUsage,
      memoryLeaks,
      garbageCollectionStats: gcStats,
      recommendations
    };
  }

  /**
   * 分析内存泄漏
   */
  private analyzeMemoryLeaks(): MemoryLeak[] {
    const leaks: MemoryLeak[] = [];
    
    for (const [testId, testMemory] of this.testMemoryMap.entries()) {
      if (testMemory.end) {
        const leak = this.detectMemoryLeak(testId, testMemory.start, testMemory.end);
        if (leak) {
          leaks.push(leak);
        }
      }
    }

    return leaks.sort((a, b) => b.leakSize - a.leakSize);
  }

  /**
   * 分析GC统计
   */
  private analyzeGCStats(cutoffTime: number): GCStats {
    const relevantGCEvents = this.gcEvents.filter(gc => gc.timestamp > cutoffTime);
    
    const totalCollections = relevantGCEvents.length;
    const totalTime = relevantGCEvents.reduce((sum, gc) => sum + gc.duration, 0);
    const averageTime = totalCollections > 0 ? totalTime / totalCollections : 0;

    return {
      totalCollections,
      totalTime,
      averageTime,
      collections: relevantGCEvents
    };
  }

  /**
   * 生成优化建议
   */
  private generateRecommendations(
    memoryGrowth: number,
    averageMemoryUsage: number,
    peakMemoryUsage: number,
    memoryLeaks: MemoryLeak[],
    gcStats: GCStats
  ): string[] {
    const recommendations: string[] = [];

    // 内存增长建议
    if (memoryGrowth > 50 * 1024 * 1024) { // 50MB
      recommendations.push('Significant memory growth detected. Consider reviewing object lifecycle management.');
    }

    // 内存泄漏建议
    if (memoryLeaks.length > 0) {
      recommendations.push(`${memoryLeaks.length} potential memory leaks detected. Review test cleanup procedures.`);
      
      const criticalLeaks = memoryLeaks.filter(l => l.severity === 'critical');
      if (criticalLeaks.length > 0) {
        recommendations.push(`${criticalLeaks.length} critical memory leaks require immediate attention.`);
      }
    }

    // GC建议
    if (gcStats.averageTime > 100) { // 100ms
      recommendations.push('High GC pause times detected. Consider optimizing object allocation patterns.');
    }

    if (gcStats.totalCollections > 100) {
      recommendations.push('Frequent garbage collections detected. Review memory allocation strategies.');
    }

    // 峰值内存建议
    if (peakMemoryUsage > 1024 * 1024 * 1024) { // 1GB
      recommendations.push('High peak memory usage detected. Consider implementing memory-efficient algorithms.');
    }

    return recommendations;
  }

  /**
   * 获取内存快照
   */
  getSnapshots(): MemorySnapshot[] {
    return [...this.snapshots];
  }

  /**
   * 获取GC事件
   */
  getGCEvents(): GCEvent[] {
    return [...this.gcEvents];
  }

  /**
   * 获取内存趋势
   */
  getMemoryTrends(timeWindow: number = 3600000): {
    timestamps: number[];
    heapUsed: number[];
    heapTotal: number[];
    rss: number[];
    external: number[];
  } {
    const cutoffTime = Date.now() - timeWindow;
    const relevantSnapshots = this.snapshots.filter(s => s.timestamp > cutoffTime);

    return {
      timestamps: relevantSnapshots.map(s => s.timestamp),
      heapUsed: relevantSnapshots.map(s => s.heapUsed),
      heapTotal: relevantSnapshots.map(s => s.heapTotal),
      rss: relevantSnapshots.map(s => s.rss),
      external: relevantSnapshots.map(s => s.external)
    };
  }

  /**
   * 重置跟踪数据
   */
  reset(): void {
    this.snapshots = [];
    this.gcEvents = [];
    this.testMemoryMap.clear();
    this.emit('tracking:reset');
  }

  /**
   * 销毁跟踪器
   */
  destroy(): void {
    this.stopTracking();
    this.reset();
    this.removeAllListeners();
  }
}