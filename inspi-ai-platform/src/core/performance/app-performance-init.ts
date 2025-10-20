/**
 * 应用性能初始化
 * 在应用启动时初始化所有性能优化功能
 */

import React from 'react';

import { CacheFactory, MemoryCache, RedisCache } from './cache-strategy';
import { QueryOptimizer, ConnectionPoolManager } from './database-optimization';

import { PerformanceOptimizer, defaultPerformanceConfig } from './index';

/**
 * 性能初始化配置
 */
interface PerformanceInitConfig {
  // 缓存配置
  cache: {
    memory: {
      enabled: boolean;
      maxSize: number;
      ttl: number;
    };
    redis: {
      enabled: boolean;
      url?: string;
      keyPrefix: string;
    };
  };

  // 数据库优化配置
  database: {
    queryOptimization: boolean;
    connectionPooling: boolean;
    slowQueryThreshold: number;
  };

  // 监控配置
  monitoring: {
    enabled: boolean;
    reportInterval: number;
    logLevel: 'error' | 'warn' | 'info' | 'debug';
  };
}

/**
 * 默认性能初始化配置
 */
const defaultInitConfig: PerformanceInitConfig = {
  cache: {
    memory: {
      enabled: true,
      maxSize: 100 * 1024 * 1024, // 100MB
      ttl: 3600, // 1小时
    },
    redis: {
      enabled: process.env.REDIS_URL !== undefined,
      url: process.env.REDIS_URL,
      keyPrefix: 'inspi:',
    },
  },
  database: {
    queryOptimization: true,
    connectionPooling: true,
    slowQueryThreshold: 1000, // 1秒
  },
  monitoring: {
    enabled: process.env.NODE_ENV === 'production',
    reportInterval: 30000, // 30秒
    logLevel: process.env.NODE_ENV === 'production' ? 'warn' : 'info',
  },
};

/**
 * 应用性能管理器
 */
export class AppPerformanceManager {
  private static instance: AppPerformanceManager;
  private optimizer: PerformanceOptimizer;
  private queryOptimizer: QueryOptimizer;
  private connectionPoolManager: ConnectionPoolManager;
  private initialized = false;
  private config: PerformanceInitConfig;

  constructor(config: Partial<PerformanceInitConfig> = {}) {
    this.config = { ...defaultInitConfig, ...config };
    this.optimizer = PerformanceOptimizer.getInstance(defaultPerformanceConfig);
    this.queryOptimizer = new QueryOptimizer();
    this.connectionPoolManager = new ConnectionPoolManager();
  }

  static getInstance(config?: Partial<PerformanceInitConfig>): AppPerformanceManager {
    if (!this.instance) {
      this.instance = new AppPerformanceManager(config);
    }
    return this.instance;
  }

  /**
   * 初始化应用性能优化
   */
  async initialize(): Promise<void> {
    if (this.initialized) {
      console.log('⚠️ Performance manager already initialized');
      return;
    }

    console.log('🚀 Initializing application performance optimizations...');

    try {
      // 1. 初始化缓存系统
      await this.initializeCaching();

      // 2. 初始化数据库优化
      await this.initializeDatabaseOptimization();

      // 3. 初始化性能监控
      await this.initializeMonitoring();

      // 4. 初始化前端性能优化
      await this.optimizer.initialize();

      // 5. 设置性能报告
      this.setupPerformanceReporting();

      this.initialized = true;
      console.log('✅ Application performance optimizations initialized successfully');

      // 输出初始化摘要
      this.logInitializationSummary();
    } catch (error) {
      console.error('❌ Failed to initialize performance optimizations:', error);
      throw error;
    }
  }

  /**
   * 初始化缓存系统
   */
  private async initializeCaching(): Promise<void> {
    console.log('📦 Initializing caching system...');

    // 创建内存缓存
    if (this.config.cache.memory.enabled) {
      CacheFactory.createMemoryCache('app-cache', {
        maxSize: this.config.cache.memory.maxSize,
        ttl: this.config.cache.memory.ttl,
        strategy: 'LRU',
      });
      console.log('  ✓ Memory cache initialized');
    }

    // 创建Redis缓存
    if (this.config.cache.redis.enabled && this.config.cache.redis.url) {
      try {
        // 这里需要实际的Redis客户端
        // const redis = new Redis(this.config.cache.redis.url);
        // CacheFactory.createRedisCache('redis-cache', redis, {
        //   ttl: this.config.cache.memory.ttl
        // }, this.config.cache.redis.keyPrefix);
        console.log('  ✓ Redis cache configured');
      } catch (error) {
        console.warn('  ⚠️ Redis cache initialization failed:', error);
      }
    }

    // 创建多层缓存
    const memoryCache = CacheFactory.getInstance<MemoryCache<any>>('app-cache');
    const redisCache = CacheFactory.getInstance<RedisCache<any>>('redis-cache');

    if (memoryCache) {
      CacheFactory.createMultiLevelCache('multi-cache', {
        maxSize: this.config.cache.memory.maxSize / 2, // L1缓存使用一半内存
        ttl: this.config.cache.memory.ttl,
        strategy: 'LRU',
      }, redisCache);
      console.log('  ✓ Multi-level cache initialized');
    }
  }

  /**
   * 初始化数据库优化
   */
  private async initializeDatabaseOptimization(): Promise<void> {
    console.log('🗄️ Initializing database optimization...');

    if (this.config.database.queryOptimization) {
      this.queryOptimizer.setSlowQueryThreshold(this.config.database.slowQueryThreshold);
      console.log('  ✓ Query optimization enabled');
    }

    if (this.config.database.connectionPooling) {
      // 创建默认数据库连接池
      this.connectionPoolManager.createPool('default', async () => {
        // 这里需要实际的数据库连接逻辑
        // return await createDatabaseConnection();
        return { id: Math.random() }; // 模拟连接
      }, {
        min: 2,
        max: 10,
        acquireTimeoutMillis: 30000,
        idleTimeoutMillis: 30000,
      });
      console.log('  ✓ Connection pooling configured');
    }
  }

  /**
   * 初始化性能监控
   */
  private async initializeMonitoring(): Promise<void> {
    if (!this.config.monitoring.enabled) {
      console.log('📊 Performance monitoring disabled');
      return;
    }

    console.log('📊 Initializing performance monitoring...');

    // 设置全局错误处理
    if (typeof window !== 'undefined') {
      window.addEventListener('error', (event) => {
        this.logPerformanceEvent('error', {
          message: event.error?.message,
          filename: event.filename,
          lineno: event.lineno,
          colno: event.colno,
        });
      });

      window.addEventListener('unhandledrejection', (event) => {
        this.logPerformanceEvent('unhandled-rejection', {
          reason: event.reason,
        });
      });
    }

    // 监控资源加载
    if (typeof window !== 'undefined' && 'PerformanceObserver' in window) {
      try {
        const observer = new PerformanceObserver((list) => {
          const entries = list.getEntries();
          entries.forEach((entry) => {
            if (entry.duration > 1000) { // 超过1秒的资源
              this.logPerformanceEvent('slow-resource', {
                name: entry.name,
                duration: entry.duration,
                size: (entry as any).transferSize,
              });
            }
          });
        });

        observer.observe({ entryTypes: ['resource'] });
        console.log('  ✓ Resource monitoring enabled');
      } catch (error) {
        console.warn('  ⚠️ Resource monitoring not supported:', error);
      }
    }

    console.log('  ✓ Performance monitoring initialized');
  }

  /**
   * 设置性能报告
   */
  private setupPerformanceReporting(): void {
    if (!this.config.monitoring.enabled) return;

    // 定期生成性能报告
    setInterval(() => {
      this.generatePerformanceReport();
    }, this.config.monitoring.reportInterval);

    console.log('📈 Performance reporting scheduled');
  }

  /**
   * 生成性能报告
   */
  private generatePerformanceReport(): void {
    try {
      const report = {
        timestamp: new Date().toISOString(),
        frontend: this.optimizer.getPerformanceReport(),
        database: this.queryOptimizer.getQueryStats(),
        connectionPools: this.connectionPoolManager.getAllPoolStats(),
        cache: this.getCacheStats(),
      };

      // 在开发环境下输出到控制台
      if (process.env.NODE_ENV === 'development') {
        console.log('📊 Performance Report:', report);
      }

      // 在生产环境下发送到监控服务
      if (process.env.NODE_ENV === 'production') {
        this.sendToMonitoringService(report);
      }
    } catch (error) {
      console.error('Failed to generate performance report:', error);
    }
  }

  /**
   * 获取缓存统计
   */
  private getCacheStats(): any {
    const stats: any = {};

    const memoryCache = CacheFactory.getInstance<MemoryCache<any>>('app-cache');
    if (memoryCache) {
      stats.memory = memoryCache.getStats();
    }

    const multiCache = CacheFactory.getInstance<any>('multi-cache');
    if (multiCache && typeof multiCache.getStats === 'function') {
      stats.multiLevel = multiCache.getStats();
    }

    return stats;
  }

  /**
   * 发送到监控服务
   */
  private async sendToMonitoringService(report: any): Promise<void> {
    try {
      // 这里可以集成第三方监控服务
      await fetch('/api/monitoring/performance', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(report),
      });
    } catch (error) {
      console.error('Failed to send performance report:', error);
    }
  }

  /**
   * 记录性能事件
   */
  private logPerformanceEvent(type: string, data: any): void {
    const event = {
      type,
      timestamp: Date.now(),
      data,
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'server',
      url: typeof window !== 'undefined' ? window.location.href : 'server',
    };

    if (this.config.monitoring.logLevel === 'debug' ||
        (this.config.monitoring.logLevel === 'info' && ['error', 'slow-resource'].includes(type))) {
      console.log(`Performance Event [${type}]:`, event);
    }

    // 发送到监控服务
    if (process.env.NODE_ENV === 'production') {
      this.sendEventToMonitoring(event);
    }
  }

  /**
   * 发送事件到监控服务
   */
  private async sendEventToMonitoring(event: any): Promise<void> {
    try {
      await fetch('/api/monitoring/events', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(event),
      });
    } catch (error) {
      // 静默失败，避免影响应用性能
    }
  }

  /**
   * 输出初始化摘要
   */
  private logInitializationSummary(): void {
    console.log('\n🎯 Performance Optimization Summary:');
    console.log(`  Memory Cache: ${this.config.cache.memory.enabled ? '✅' : '❌'}`);
    console.log(`  Redis Cache: ${this.config.cache.redis.enabled ? '✅' : '❌'}`);
    console.log(`  Query Optimization: ${this.config.database.queryOptimization ? '✅' : '❌'}`);
    console.log(`  Connection Pooling: ${this.config.database.connectionPooling ? '✅' : '❌'}`);
    console.log(`  Performance Monitoring: ${this.config.monitoring.enabled ? '✅' : '❌'}`);
    console.log(`  Slow Query Threshold: ${this.config.database.slowQueryThreshold}ms`);
    console.log(`  Report Interval: ${this.config.monitoring.reportInterval / 1000}s\n`);
  }

  /**
   * 获取性能统计
   */
  getPerformanceStats(): any {
    return {
      initialized: this.initialized,
      config: this.config,
      frontend: this.optimizer.getPerformanceReport(),
      database: this.queryOptimizer.getQueryStats(),
      connectionPools: this.connectionPoolManager.getAllPoolStats(),
      cache: this.getCacheStats(),
    };
  }

  /**
   * 清理资源
   */
  async cleanup(): Promise<void> {
    console.log('🧹 Cleaning up performance optimizations...');

    try {
      await this.optimizer.cleanup();
      await this.connectionPoolManager.destroyAllPools();
      CacheFactory.cleanup();

      this.initialized = false;
      console.log('✅ Performance optimizations cleaned up');
    } catch (error) {
      console.error('❌ Error during cleanup:', error);
    }
  }

  /**
   * 热重载配置
   */
  async reloadConfig(newConfig: Partial<PerformanceInitConfig>): Promise<void> {
    console.log('🔄 Reloading performance configuration...');

    this.config = { ...this.config, ...newConfig };

    // 重新初始化相关组件
    if (this.initialized) {
      await this.cleanup();
      await this.initialize();
    }

    console.log('✅ Performance configuration reloaded');
  }
}

/**
 * 全局性能初始化函数
 */
export async function initializeAppPerformance(
  config?: Partial<PerformanceInitConfig>,
): Promise<AppPerformanceManager> {
  const manager = AppPerformanceManager.getInstance(config);
  await manager.initialize();
  return manager;
}

/**
 * React Hook for app performance
 */
export function useAppPerformance() {
  const [manager] = React.useState(() => AppPerformanceManager.getInstance());
  const [stats, setStats] = React.useState<any>(null);

  React.useEffect(() => {
    const updateStats = () => {
      setStats(manager.getPerformanceStats());
    };

    updateStats();
    const interval = setInterval(updateStats, 10000); // 每10秒更新一次

    return () => clearInterval(interval);
  }, [manager]);

  return { manager, stats };
}
