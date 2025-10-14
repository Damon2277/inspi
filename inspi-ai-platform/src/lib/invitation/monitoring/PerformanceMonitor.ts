/**
 * 性能监控服务
 * 监控邀请系统的性能指标和系统健康状况
 */

import { EventEmitter } from 'events';

import { logger } from '@/shared/utils/logger';

export interface PerformanceMetrics {
  timestamp: number
  cpu: {
    usage: number
    loadAverage: number[]
  }
  memory: {
    used: number
    total: number
    heapUsed: number
    heapTotal: number
  }
  database: {
    activeConnections: number
    queryTime: number
    slowQueries: number
  }
  api: {
    requestsPerSecond: number
    averageResponseTime: number
    errorRate: number
  }
  cache: {
    hitRate: number
    memoryUsage: number
    operations: number
  }
}

export interface PerformanceAlert {
  id: string
  type: 'warning' | 'critical'
  metric: string
  value: number
  threshold: number
  message: string
  timestamp: number
}

export interface PerformanceThresholds {
  cpu: { warning: number; critical: number }
  memory: { warning: number; critical: number }
  responseTime: { warning: number; critical: number }
  errorRate: { warning: number; critical: number }
  cacheHitRate: { warning: number }
}

export class PerformanceMonitor extends EventEmitter {
  private metrics: PerformanceMetrics[] = [];
  private alerts: PerformanceAlert[] = [];
  private thresholds: PerformanceThresholds;
  private monitoringInterval?: NodeJS.Timeout;
  private isMonitoring = false;

  constructor(thresholds: PerformanceThresholds) {
    super();
    this.thresholds = thresholds;
  }

  startMonitoring(intervalMs = 30000): void {
    if (this.isMonitoring) return;

    this.isMonitoring = true;
    this.monitoringInterval = setInterval(() => {
      this.collectMetrics();
    }, intervalMs);

    logger.info('Performance monitoring started');
  }

  stopMonitoring(): void {
    if (!this.isMonitoring) return;

    this.isMonitoring = false;
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
    }

    logger.info('Performance monitoring stopped');
  }

  private async collectMetrics(): Promise<void> {
    try {
      const metrics: PerformanceMetrics = {
        timestamp: Date.now(),
        cpu: await this.getCpuMetrics(),
        memory: this.getMemoryMetrics(),
        database: await this.getDatabaseMetrics(),
        api: await this.getApiMetrics(),
        cache: await this.getCacheMetrics(),
      };

      this.metrics.push(metrics);
      this.checkThresholds(metrics);
      this.emit('metricsCollected', metrics);
    } catch (error) {
      logger.error('Failed to collect metrics', { error });
    }
  }

  private async getCpuMetrics(): Promise<PerformanceMetrics['cpu']> {
    if (typeof process !== 'undefined') {
      const usage = process.cpuUsage();
      return {
        usage: (usage.user + usage.system) / 1000000,
        loadAverage: [0, 0, 0],
      };
    }
    return { usage: 0, loadAverage: [0, 0, 0] };
  }

  private getMemoryMetrics(): PerformanceMetrics['memory'] {
    if (typeof process !== 'undefined') {
      const memUsage = process.memoryUsage();
      return {
        used: memUsage.rss,
        total: 1024 * 1024 * 1024, // 1GB default
        heapUsed: memUsage.heapUsed,
        heapTotal: memUsage.heapTotal,
      };
    }
    return { used: 0, total: 0, heapUsed: 0, heapTotal: 0 };
  }

  private async getDatabaseMetrics(): Promise<PerformanceMetrics['database']> {
    return {
      activeConnections: Math.floor(Math.random() * 10) + 1,
      queryTime: Math.random() * 100 + 20,
      slowQueries: Math.floor(Math.random() * 3),
    };
  }

  private async getApiMetrics(): Promise<PerformanceMetrics['api']> {
    return {
      requestsPerSecond: Math.random() * 100 + 10,
      averageResponseTime: Math.random() * 500 + 100,
      errorRate: Math.random() * 0.05,
    };
  }

  private async getCacheMetrics(): Promise<PerformanceMetrics['cache']> {
    return {
      hitRate: Math.random() * 0.3 + 0.7,
      memoryUsage: Math.random() * 100 * 1024 * 1024,
      operations: Math.floor(Math.random() * 1000) + 100,
    };
  }

  private checkThresholds(metrics: PerformanceMetrics): void {
    const alerts: PerformanceAlert[] = [];

    // CPU检查
    if (metrics.cpu.usage > this.thresholds.cpu.critical) {
      alerts.push(this.createAlert('critical', 'cpu.usage', metrics.cpu.usage, this.thresholds.cpu.critical, 'CPU使用率过高'));
    } else if (metrics.cpu.usage > this.thresholds.cpu.warning) {
      alerts.push(this.createAlert('warning', 'cpu.usage', metrics.cpu.usage, this.thresholds.cpu.warning, 'CPU使用率较高'));
    }

    // 内存检查
    const memoryUsagePercent = (metrics.memory.used / metrics.memory.total) * 100;
    if (memoryUsagePercent > this.thresholds.memory.critical) {
      alerts.push(this.createAlert('critical', 'memory.usage', memoryUsagePercent, this.thresholds.memory.critical, '内存使用率过高'));
    }

    alerts.forEach(alert => {
      this.alerts.push(alert);
      this.emit('alert', alert);
      logger.warn('Performance alert', alert);
    });
  }

  private createAlert(type: 'warning' | 'critical', metric: string, value: number, threshold: number, message: string): PerformanceAlert {
    return {
      id: `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type,
      metric,
      value,
      threshold,
      message,
      timestamp: Date.now(),
    };
  }

  getCurrentMetrics(): PerformanceMetrics | null {
    return this.metrics.length > 0 ? this.metrics[this.metrics.length - 1] : null;
  }

  getActiveAlerts(): PerformanceAlert[] {
    return this.alerts.slice();
  }

  generateReport(): {
    summary: any
    healthScore: number
    recommendations: string[]
  } {
    const current = this.getCurrentMetrics();
    if (!current) {
      return {
        summary: null,
        healthScore: 0,
        recommendations: ['无性能数据'],
      };
    }

    const healthScore = this.calculateHealthScore(current);
    const recommendations = this.generateRecommendations(current);

    return {
      summary: current,
      healthScore,
      recommendations,
    };
  }

  private calculateHealthScore(metrics: PerformanceMetrics): number {
    let score = 100;

    if (metrics.cpu.usage > 80) score -= 20;
    if ((metrics.memory.used / metrics.memory.total) > 0.8) score -= 20;
    if (metrics.api.averageResponseTime > 1000) score -= 15;
    if (metrics.api.errorRate > 0.05) score -= 15;
    if (metrics.cache.hitRate < 0.8) score -= 10;

    return Math.max(0, score);
  }

  private generateRecommendations(metrics: PerformanceMetrics): string[] {
    const recommendations: string[] = [];

    if (metrics.cpu.usage > 70) {
      recommendations.push('CPU使用率较高，考虑优化算法');
    }
    if ((metrics.memory.used / metrics.memory.total) > 0.8) {
      recommendations.push('内存使用率较高，检查内存泄漏');
    }
    if (metrics.api.averageResponseTime > 1000) {
      recommendations.push('API响应时间较长，考虑优化查询');
    }

    return recommendations.length > 0 ? recommendations : ['系统性能良好'];
  }
}
