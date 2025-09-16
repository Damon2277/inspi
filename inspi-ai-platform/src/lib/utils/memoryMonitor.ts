/**
 * 内存监控工具
 * 监控和优化内存使用
 */

import { logger } from './logger';

export interface MemoryStats {
  heapUsed: number;
  heapTotal: number;
  external: number;
  rss: number;
  usagePercent: number;
  timestamp: number;
}

export class MemoryMonitor {
  private static instance: MemoryMonitor;
  private monitoringInterval: NodeJS.Timeout | null = null;
  private warningThreshold = 0.85; // 85%
  private criticalThreshold = 0.95; // 95%
  private lastGCTime = 0;
  private gcCooldown = 30000; // 30秒

  static getInstance(): MemoryMonitor {
    if (!MemoryMonitor.instance) {
      MemoryMonitor.instance = new MemoryMonitor();
    }
    return MemoryMonitor.instance;
  }

  /**
   * 获取当前内存统计
   */
  getMemoryStats(): MemoryStats {
    const memUsage = process.memoryUsage();
    const usagePercent = memUsage.heapUsed / memUsage.heapTotal;

    return {
      heapUsed: memUsage.heapUsed,
      heapTotal: memUsage.heapTotal,
      external: memUsage.external,
      rss: memUsage.rss,
      usagePercent,
      timestamp: Date.now()
    };
  }

  /**
   * 格式化内存大小
   */
  formatBytes(bytes: number): string {
    const mb = bytes / (1024 * 1024);
    return `${Math.round(mb)}MB`;
  }

  /**
   * 检查内存使用情况并采取行动
   */
  checkMemoryUsage(): MemoryStats {
    const stats = this.getMemoryStats();
    
    if (stats.usagePercent >= this.criticalThreshold) {
      logger.error('Critical memory usage detected', {
        heapUsed: this.formatBytes(stats.heapUsed),
        heapTotal: this.formatBytes(stats.heapTotal),
        usagePercent: `${Math.round(stats.usagePercent * 100)}%`,
        rss: this.formatBytes(stats.rss)
      });
      
      // 强制垃圾回收
      this.forceGarbageCollection();
      
    } else if (stats.usagePercent >= this.warningThreshold) {
      logger.warn('High memory usage detected', {
        heapUsed: this.formatBytes(stats.heapUsed),
        heapTotal: this.formatBytes(stats.heapTotal),
        usagePercent: `${Math.round(stats.usagePercent * 100)}%`
      });
    }

    return stats;
  }

  /**
   * 强制垃圾回收（如果可用）
   */
  forceGarbageCollection(): void {
    const now = Date.now();
    
    // 防止频繁GC
    if (now - this.lastGCTime < this.gcCooldown) {
      return;
    }

    if (global.gc) {
      try {
        global.gc();
        this.lastGCTime = now;
        logger.info('Forced garbage collection executed');
        
        // 记录GC后的内存状态
        const afterStats = this.getMemoryStats();
        logger.info('Memory after GC', {
          heapUsed: this.formatBytes(afterStats.heapUsed),
          usagePercent: `${Math.round(afterStats.usagePercent * 100)}%`
        });
      } catch (error) {
        logger.error('Failed to force garbage collection', { error });
      }
    } else {
      logger.warn('Garbage collection not available. Start with --expose-gc flag');
    }
  }

  /**
   * 开始内存监控
   */
  startMonitoring(intervalMs = 60000): void {
    if (this.monitoringInterval) {
      this.stopMonitoring();
    }

    logger.info('Starting memory monitoring', { intervalMs });
    
    this.monitoringInterval = setInterval(() => {
      this.checkMemoryUsage();
    }, intervalMs);

    // 立即检查一次
    this.checkMemoryUsage();
  }

  /**
   * 停止内存监控
   */
  stopMonitoring(): void {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
      logger.info('Memory monitoring stopped');
    }
  }

  /**
   * 设置阈值
   */
  setThresholds(warning: number, critical: number): void {
    this.warningThreshold = warning;
    this.criticalThreshold = critical;
    logger.info('Memory thresholds updated', { warning, critical });
  }

  /**
   * 获取内存健康状态
   */
  getHealthStatus(): {
    status: 'healthy' | 'warning' | 'critical';
    stats: MemoryStats;
    message: string;
  } {
    const stats = this.getMemoryStats();
    
    if (stats.usagePercent >= this.criticalThreshold) {
      return {
        status: 'critical',
        stats,
        message: `Critical memory usage: ${Math.round(stats.usagePercent * 100)}%`
      };
    } else if (stats.usagePercent >= this.warningThreshold) {
      return {
        status: 'warning',
        stats,
        message: `High memory usage: ${Math.round(stats.usagePercent * 100)}%`
      };
    } else {
      return {
        status: 'healthy',
        stats,
        message: `Memory usage normal: ${Math.round(stats.usagePercent * 100)}%`
      };
    }
  }

  /**
   * 清理内存（手动触发优化）
   */
  cleanup(): void {
    logger.info('Manual memory cleanup initiated');
    
    // 强制垃圾回收
    this.forceGarbageCollection();
    
    // 清理可能的内存泄漏
    if (typeof global !== 'undefined') {
      // 清理全局变量中的大对象
      Object.keys(global).forEach(key => {
        if (key.startsWith('__temp_') || key.startsWith('__cache_')) {
          delete (global as any)[key];
        }
      });
    }
  }
}

// 导出单例实例
export const memoryMonitor = MemoryMonitor.getInstance();

// 在开发环境中自动启动监控
if (process.env.NODE_ENV === 'development') {
  memoryMonitor.startMonitoring(30000); // 30秒检查一次
}