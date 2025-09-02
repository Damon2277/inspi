/**
 * 缓存性能测试
 * 测试缓存命中率、性能提升和缓存策略效果
 */

import { CacheManager } from '@/lib/cache/manager';
import { RedisCache } from '@/lib/cache/redis';
import { UserCache } from '@/lib/cache/user';
import { WorkCache } from '@/lib/cache/work';
import { RankingCache } from '@/lib/cache/ranking';
import { KnowledgeGraphCache } from '@/lib/cache/knowledge-graph';

interface CacheTestResult {
  operation: string;
  withCache: number;
  withoutCache: number;
  improvement: number;
  hitRate: number;
}

interface CacheMetrics {
  hits: number;
  misses: number;
  hitRate: number;
  avgResponseTime: number;
  totalOperations: number;
}

class CachePerformanceTester {
  private cacheManager: CacheManager;
  private userCache: UserCache;
  private workCache: WorkCache;
  private rankingCache: RankingCache;
  private knowledgeGraphCache: KnowledgeGraphCache;
  private metrics: Map<string, CacheMetrics> = new Map();

  constructor() {
    this.cacheManager = new CacheManager();
    this.userCache = new UserCache();
    this.workCache = new WorkCache();
    this.rankingCache = new RankingCache();
    this.knowledgeGraphCache = new KnowledgeGraphCache();
  }

  async setup(): Promise<void> {
    // 清空缓存以确保测试环境干净
    await this.cacheManager.clear();
    this.resetMetrics();
  }

  private resetMetrics(): void {
    this.metrics.clear();
  }

  private updateMetrics(cacheType: string, hit: boolean, responseTime: number): void {
    const current = this.metrics.get(cacheType) || {
      hits: 0,
      misses: 0,
      hitRate: 0,
      avgResponseTime: 0,
      totalOperations: 0
    };

    if (hit) {
      current.hits++;
    } else {
      current.misses++;
    }

    current.totalOperations++;
    current.hitRate = current.hits / current.totalOperations;
    current.avgResponseTime = (current.avgResponseTime * (current.totalOperations - 1) + responseTime) / current.totalOperations;

    this.metrics.set(cacheType, current);
  }

  async testUserCachePerformance(): Promise<CacheTestResult> {
    const userId = 'test-user-123';
    const userData = {
      id: userId,
      email: 'test@example.com',
      name: 'Test User',
      subscription: { type: 'pro', expiresAt: new Date() }
    };

    // 测试无缓存性能
    const withoutCacheStart = Date.now();
    for (let i = 0; i < 100; i++) {
      // 模拟数据库查询延迟
      await new Promise(resolve => setTimeout(resolve, 10));
    }
    const withoutCacheTime = Date.now() - withoutCacheStart;

    // 预热缓存
    await this.userCache.setUser(userId, userData);

    // 测试有缓存性能
    const withCacheStart = Date.now();
    let hits = 0;
    for (let i = 0; i < 100; i++) {
      const start = Date.now();
      const cachedUser = await this.userCache.getUser(userId);
      const responseTime = Date.now() - start;
      
      if (cachedUser) {
        hits++;
        this.updateMetrics('user', true, responseTime);
      } else {
        this.updateMetrics('user', false, responseTime);
      }
    }
    const withCacheTime = Date.now() - withCacheStart;

    const improvement = ((withoutCacheTime - withCacheTime) / withoutCacheTime) * 100;
    const hitRate = hits / 100;

    return {
      operation: 'User Cache',
      withCache: withCacheTime,
      withoutCache: withoutCacheTime,
      improvement,
      hitRate
    };
  }

  async testWorkCachePerformance(): Promise<CacheTestResult> {
    const workId = 'test-work-123';
    const workData = {
      id: workId,
      title: 'Test Work',
      content: 'Test content',
      author: 'test-author',
      tags: ['math', 'education'],
      createdAt: new Date()
    };

    // 测试无缓存性能（模拟数据库查询）
    const withoutCacheStart = Date.now();
    for (let i = 0; i < 50; i++) {
      await new Promise(resolve => setTimeout(resolve, 20)); // 模拟较慢的数据库查询
    }
    const withoutCacheTime = Date.now() - withoutCacheStart;

    // 预热缓存
    await this.workCache.setWork(workId, workData);
    await this.workCache.setWorkList('popular', [workData]);

    // 测试有缓存性能
    const withCacheStart = Date.now();
    let hits = 0;
    for (let i = 0; i < 50; i++) {
      const start = Date.now();
      const cachedWork = await this.workCache.getWork(workId);
      const responseTime = Date.now() - start;
      
      if (cachedWork) {
        hits++;
        this.updateMetrics('work', true, responseTime);
      } else {
        this.updateMetrics('work', false, responseTime);
      }
    }
    const withCacheTime = Date.now() - withCacheStart;

    const improvement = ((withoutCacheTime - withCacheTime) / withoutCacheTime) * 100;
    const hitRate = hits / 50;

    return {
      operation: 'Work Cache',
      withCache: withCacheTime,
      withoutCache: withoutCacheTime,
      improvement,
      hitRate
    };
  }

  async testRankingCachePerformance(): Promise<CacheTestResult> {
    const rankingData = Array.from({ length: 100 }, (_, i) => ({
      userId: `user-${i}`,
      score: Math.random() * 1000,
      rank: i + 1
    }));

    // 测试无缓存性能（模拟复杂的排行榜计算）
    const withoutCacheStart = Date.now();
    for (let i = 0; i < 20; i++) {
      // 模拟复杂的排行榜计算
      await new Promise(resolve => setTimeout(resolve, 50));
    }
    const withoutCacheTime = Date.now() - withoutCacheStart;

    // 预热缓存
    await this.rankingCache.setRanking('contribution', 'daily', rankingData);

    // 测试有缓存性能
    const withCacheStart = Date.now();
    let hits = 0;
    for (let i = 0; i < 20; i++) {
      const start = Date.now();
      const cachedRanking = await this.rankingCache.getRanking('contribution', 'daily');
      const responseTime = Date.now() - start;
      
      if (cachedRanking && cachedRanking.length > 0) {
        hits++;
        this.updateMetrics('ranking', true, responseTime);
      } else {
        this.updateMetrics('ranking', false, responseTime);
      }
    }
    const withCacheTime = Date.now() - withCacheStart;

    const improvement = ((withoutCacheTime - withCacheTime) / withoutCacheTime) * 100;
    const hitRate = hits / 20;

    return {
      operation: 'Ranking Cache',
      withCache: withCacheTime,
      withoutCache: withoutCacheTime,
      improvement,
      hitRate
    };
  }

  async testKnowledgeGraphCachePerformance(): Promise<CacheTestResult> {
    const graphData = {
      nodes: Array.from({ length: 50 }, (_, i) => ({
        id: `node-${i}`,
        label: `Node ${i}`,
        type: 'concept'
      })),
      edges: Array.from({ length: 80 }, (_, i) => ({
        source: `node-${i % 50}`,
        target: `node-${(i + 1) % 50}`,
        type: 'related'
      }))
    };

    // 测试无缓存性能（模拟图数据库查询）
    const withoutCacheStart = Date.now();
    for (let i = 0; i < 30; i++) {
      await new Promise(resolve => setTimeout(resolve, 30)); // 模拟图数据库查询
    }
    const withoutCacheTime = Date.now() - withoutCacheStart;

    // 预热缓存
    await this.knowledgeGraphCache.setGraph('user-123', graphData);

    // 测试有缓存性能
    const withCacheStart = Date.now();
    let hits = 0;
    for (let i = 0; i < 30; i++) {
      const start = Date.now();
      const cachedGraph = await this.knowledgeGraphCache.getGraph('user-123');
      const responseTime = Date.now() - start;
      
      if (cachedGraph) {
        hits++;
        this.updateMetrics('knowledge-graph', true, responseTime);
      } else {
        this.updateMetrics('knowledge-graph', false, responseTime);
      }
    }
    const withCacheTime = Date.now() - withCacheStart;

    const improvement = ((withoutCacheTime - withCacheTime) / withoutCacheTime) * 100;
    const hitRate = hits / 30;

    return {
      operation: 'Knowledge Graph Cache',
      withCache: withCacheTime,
      withoutCache: withoutCacheTime,
      improvement,
      hitRate
    };
  }

  async testCacheEvictionPerformance(): Promise<{
    evictionTime: number;
    memoryReclaimed: number;
    operationsAffected: number;
  }> {
    // 填充缓存直到接近容量限制
    const testData = Array.from({ length: 1000 }, (_, i) => ({
      key: `test-key-${i}`,
      value: { data: `test-data-${i}`.repeat(100) } // 创建较大的数据
    }));

    // 写入大量数据
    const writeStart = Date.now();
    for (const item of testData) {
      await this.cacheManager.set(item.key, item.value, 3600);
    }
    const writeTime = Date.now() - writeStart;

    // 触发缓存清理
    const evictionStart = Date.now();
    await this.cacheManager.cleanup();
    const evictionTime = Date.now() - evictionStart;

    // 检查清理后的状态
    let remainingKeys = 0;
    for (const item of testData) {
      const exists = await this.cacheManager.exists(item.key);
      if (exists) remainingKeys++;
    }

    const operationsAffected = testData.length - remainingKeys;
    const memoryReclaimed = operationsAffected * 100; // 估算回收的内存

    return {
      evictionTime,
      memoryReclaimed,
      operationsAffected
    };
  }

  async testConcurrentCacheAccess(): Promise<{
    concurrentOperations: number;
    totalTime: number;
    averageResponseTime: number;
    errorRate: number;
  }> {
    const concurrentOperations = 100;
    const testKey = 'concurrent-test-key';
    const testValue = { data: 'concurrent test data' };

    // 预设数据
    await this.cacheManager.set(testKey, testValue, 3600);

    const operations: Promise<any>[] = [];
    const results: { success: boolean; time: number }[] = [];

    const totalStart = Date.now();

    // 创建并发操作
    for (let i = 0; i < concurrentOperations; i++) {
      const operation = (async () => {
        const start = Date.now();
        try {
          if (i % 3 === 0) {
            // 读操作
            await this.cacheManager.get(testKey);
          } else if (i % 3 === 1) {
            // 写操作
            await this.cacheManager.set(`${testKey}-${i}`, testValue, 3600);
          } else {
            // 删除操作
            await this.cacheManager.delete(`${testKey}-${i - 1}`);
          }
          
          const time = Date.now() - start;
          results.push({ success: true, time });
        } catch (error) {
          const time = Date.now() - start;
          results.push({ success: false, time });
        }
      })();

      operations.push(operation);
    }

    // 等待所有操作完成
    await Promise.all(operations);
    const totalTime = Date.now() - totalStart;

    const successfulOperations = results.filter(r => r.success);
    const averageResponseTime = successfulOperations.reduce((sum, r) => sum + r.time, 0) / successfulOperations.length;
    const errorRate = (results.length - successfulOperations.length) / results.length;

    return {
      concurrentOperations,
      totalTime,
      averageResponseTime,
      errorRate
    };
  }

  getMetricsSummary(): { [key: string]: CacheMetrics } {
    const summary: { [key: string]: CacheMetrics } = {};
    for (const [key, metrics] of this.metrics.entries()) {
      summary[key] = { ...metrics };
    }
    return summary;
  }
}

describe('Cache Performance Tests', () => {
  let tester: CachePerformanceTester;

  beforeAll(async () => {
    tester = new CachePerformanceTester();
    await tester.setup();
  });

  beforeEach(async () => {
    await tester.setup();
  });

  test('User cache performance improvement', async () => {
    const result = await tester.testUserCachePerformance();

    expect(result.improvement).toBeGreaterThan(50); // 至少50%的性能提升
    expect(result.hitRate).toBeGreaterThan(0.95); // 95%以上的命中率
    expect(result.withCache).toBeLessThan(result.withoutCache);

    console.log('User Cache Performance:', result);
  });

  test('Work cache performance improvement', async () => {
    const result = await tester.testWorkCachePerformance();

    expect(result.improvement).toBeGreaterThan(60); // 至少60%的性能提升
    expect(result.hitRate).toBeGreaterThan(0.90); // 90%以上的命中率
    expect(result.withCache).toBeLessThan(result.withoutCache);

    console.log('Work Cache Performance:', result);
  });

  test('Ranking cache performance improvement', async () => {
    const result = await tester.testRankingCachePerformance();

    expect(result.improvement).toBeGreaterThan(70); // 至少70%的性能提升
    expect(result.hitRate).toBeGreaterThan(0.85); // 85%以上的命中率
    expect(result.withCache).toBeLessThan(result.withoutCache);

    console.log('Ranking Cache Performance:', result);
  });

  test('Knowledge graph cache performance improvement', async () => {
    const result = await tester.testKnowledgeGraphCachePerformance();

    expect(result.improvement).toBeGreaterThan(65); // 至少65%的性能提升
    expect(result.hitRate).toBeGreaterThan(0.90); // 90%以上的命中率
    expect(result.withCache).toBeLessThan(result.withoutCache);

    console.log('Knowledge Graph Cache Performance:', result);
  });

  test('Cache eviction performance', async () => {
    const result = await tester.testCacheEvictionPerformance();

    expect(result.evictionTime).toBeLessThan(5000); // 清理时间少于5秒
    expect(result.operationsAffected).toBeGreaterThan(0); // 确实清理了一些数据
    expect(result.memoryReclaimed).toBeGreaterThan(0); // 回收了内存

    console.log('Cache Eviction Performance:', result);
  });

  test('Concurrent cache access performance', async () => {
    const result = await tester.testConcurrentCacheAccess();

    expect(result.errorRate).toBeLessThan(0.05); // 错误率低于5%
    expect(result.averageResponseTime).toBeLessThan(100); // 平均响应时间少于100ms
    expect(result.totalTime).toBeLessThan(10000); // 总时间少于10秒

    console.log('Concurrent Access Performance:', result);
  });

  test('Overall cache metrics summary', async () => {
    // 运行所有缓存测试以收集指标
    await tester.testUserCachePerformance();
    await tester.testWorkCachePerformance();
    await tester.testRankingCachePerformance();
    await tester.testKnowledgeGraphCachePerformance();

    const summary = tester.getMetricsSummary();

    console.log('\n📊 Cache Performance Summary:');
    console.log('================================');

    for (const [cacheType, metrics] of Object.entries(summary)) {
      console.log(`\n${cacheType.toUpperCase()} Cache:`);
      console.log(`  Hit Rate: ${(metrics.hitRate * 100).toFixed(2)}%`);
      console.log(`  Avg Response Time: ${metrics.avgResponseTime.toFixed(2)}ms`);
      console.log(`  Total Operations: ${metrics.totalOperations}`);
      console.log(`  Hits: ${metrics.hits}, Misses: ${metrics.misses}`);

      // 验证缓存性能指标
      expect(metrics.hitRate).toBeGreaterThan(0.8); // 80%以上命中率
      expect(metrics.avgResponseTime).toBeLessThan(50); // 平均响应时间少于50ms
    }
  });

  test('Cache warming strategy effectiveness', async () => {
    // 测试缓存预热策略的效果
    const warmingStart = Date.now();

    // 模拟缓存预热
    const commonUserIds = ['user-1', 'user-2', 'user-3'];
    const commonWorkIds = ['work-1', 'work-2', 'work-3'];

    for (const userId of commonUserIds) {
      await tester['userCache'].setUser(userId, {
        id: userId,
        email: `${userId}@example.com`,
        name: `User ${userId}`
      });
    }

    for (const workId of commonWorkIds) {
      await tester['workCache'].setWork(workId, {
        id: workId,
        title: `Work ${workId}`,
        content: 'Test content'
      });
    }

    const warmingTime = Date.now() - warmingStart;

    // 测试预热后的访问性能
    const accessStart = Date.now();
    for (let i = 0; i < 50; i++) {
      const userId = commonUserIds[i % commonUserIds.length];
      const workId = commonWorkIds[i % commonWorkIds.length];
      
      await tester['userCache'].getUser(userId);
      await tester['workCache'].getWork(workId);
    }
    const accessTime = Date.now() - accessStart;

    expect(warmingTime).toBeLessThan(1000); // 预热时间少于1秒
    expect(accessTime).toBeLessThan(500); // 访问时间少于0.5秒

    console.log(`Cache Warming: ${warmingTime}ms, Access: ${accessTime}ms`);
  });
});