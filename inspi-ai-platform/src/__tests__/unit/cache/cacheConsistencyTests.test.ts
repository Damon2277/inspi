/**
 * 缓存数据一致性测试
 * 测试缓存与数据源之间的数据一致性保证
 */

import { redis } from '@/lib/cache/redis';
import { redisManager } from '@/lib/cache/simple-redis';

// Mock dependencies
jest.mock('ioredis');
jest.mock('@/lib/utils/logger');

describe('Cache Consistency Tests', () => {
  let mockRedisClient: any;
  let consistencyManager: CacheConsistencyManager;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    
    // Mock Redis client
    mockRedisClient = {
      get: jest.fn(),
      set: jest.fn(),
      del: jest.fn(),
      exists: jest.fn(),
      expire: jest.fn(),
      ttl: jest.fn(),
      keys: jest.fn(),
      mget: jest.fn(),
      mset: jest.fn(),
      watch: jest.fn(),
      unwatch: jest.fn(),
      multi: jest.fn(),
      exec: jest.fn(),
      publish: jest.fn(),
      subscribe: jest.fn(),
      on: jest.fn(),
      isReady: true,
      status: 'ready',
      quit: jest.fn()
    };

    // Mock redisManager
    (redisManager as any).getClient = jest.fn().mockReturnValue(mockRedisClient);
    (redisManager as any).isReady = jest.fn().mockReturnValue(true);
    
    consistencyManager = new CacheConsistencyManager();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('强一致性保证', () => {
    it('应该使用分布式锁确保数据一致性', async () => {
      // Arrange
      const key = 'consistency_key';
      const lockKey = `lock:${key}`;
      const value = { id: 1, data: 'test_data', version: 1 };
      const updatedValue = { id: 1, data: 'updated_data', version: 2 };

      // Mock获取锁成功
      mockRedisClient.set.mockResolvedValueOnce('OK'); // 获取锁
      mockRedisClient.get.mockResolvedValueOnce(JSON.stringify(value));
      mockRedisClient.set.mockResolvedValueOnce('OK'); // 更新缓存
      mockRedisClient.del.mockResolvedValueOnce(1); // 释放锁

      const mockDataSource = {
        update: jest.fn().mockResolvedValue(updatedValue)
      };

      // Act
      const result = await consistencyManager.updateWithLock(
        key,
        updatedValue,
        mockDataSource.update,
        { lockTimeout: 5000 }
      );

      // Assert
      expect(mockRedisClient.set).toHaveBeenCalledWith(
        lockKey,
        expect.any(String),
        'PX',
        5000,
        'NX'
      );
      expect(mockDataSource.update).toHaveBeenCalledWith(updatedValue);
      expect(mockRedisClient.set).toHaveBeenCalledWith(key, JSON.stringify(updatedValue));
      expect(mockRedisClient.del).toHaveBeenCalledWith(lockKey);
      expect(result).toEqual(updatedValue);
    });

    it('应该处理获取锁失败的情况', async () => {
      // Arrange
      const key = 'locked_key';
      const lockKey = `lock:${key}`;
      const value = { id: 2, data: 'locked_data' };

      // Mock获取锁失败
      mockRedisClient.set.mockResolvedValue(null);

      const mockDataSource = {
        update: jest.fn()
      };

      // Act & Assert
      await expect(
        consistencyManager.updateWithLock(
          key,
          value,
          mockDataSource.update,
          { lockTimeout: 1000, retryAttempts: 2, retryDelay: 100 }
        )
      ).rejects.toThrow('Failed to acquire lock');

      expect(mockDataSource.update).not.toHaveBeenCalled();
    });

    it('应该实现锁的自动续期', async () => {
      // Arrange
      const key = 'auto_renew_key';
      const lockKey = `lock:${key}`;
      const value = { id: 3, data: 'long_operation_data' };

      mockRedisClient.set.mockResolvedValueOnce('OK'); // 获取锁
      mockRedisClient.expire.mockResolvedValue(1); // 续期锁
      mockRedisClient.del.mockResolvedValueOnce(1); // 释放锁

      const mockDataSource = {
        longOperation: jest.fn().mockImplementation(() => 
          new Promise(resolve => setTimeout(() => resolve(value), 3000))
        )
      };

      // Act
      const result = await consistencyManager.updateWithAutoRenewLock(
        key,
        value,
        mockDataSource.longOperation,
        { lockTimeout: 2000, renewInterval: 1000 }
      );

      // Assert
      expect(mockRedisClient.expire).toHaveBeenCalledWith(lockKey, 2000);
      expect(result).toEqual(value);
    });
  });

  describe('最终一致性保证', () => {
    it('应该实现异步数据同步', async () => {
      // Arrange
      const key = 'async_sync_key';
      const cacheValue = { id: 4, data: 'cache_data', timestamp: Date.now() - 1000 };
      const dbValue = { id: 4, data: 'db_data', timestamp: Date.now() };

      mockRedisClient.get.mockResolvedValue(JSON.stringify(cacheValue));
      mockRedisClient.set.mockResolvedValue('OK');

      const mockDataSource = {
        get: jest.fn().mockResolvedValue(dbValue),
        getLastModified: jest.fn().mockResolvedValue(dbValue.timestamp)
      };

      // Act
      const result = await consistencyManager.syncWithDataSource(
        key,
        mockDataSource,
        { syncInterval: 5000 }
      );

      // Assert
      expect(mockDataSource.get).toHaveBeenCalledWith(key);
      expect(mockRedisClient.set).toHaveBeenCalledWith(key, JSON.stringify(dbValue));
      expect(result.synced).toBe(true);
      expect(result.reason).toBe('data_newer_in_source');
    });

    it('应该处理数据冲突解决', async () => {
      // Arrange
      const key = 'conflict_key';
      const cacheValue = { id: 5, data: 'cache_version', version: 2, timestamp: Date.now() };
      const dbValue = { id: 5, data: 'db_version', version: 3, timestamp: Date.now() - 1000 };

      mockRedisClient.get.mockResolvedValue(JSON.stringify(cacheValue));
      mockRedisClient.set.mockResolvedValue('OK');

      const mockDataSource = {
        get: jest.fn().mockResolvedValue(dbValue)
      };

      const conflictResolver = {
        resolve: jest.fn().mockResolvedValue({
          id: 5,
          data: 'resolved_version',
          version: 4,
          timestamp: Date.now()
        })
      };

      // Act
      const result = await consistencyManager.resolveConflict(
        key,
        cacheValue,
        dbValue,
        conflictResolver.resolve
      );

      // Assert
      expect(conflictResolver.resolve).toHaveBeenCalledWith(cacheValue, dbValue);
      expect(result.resolved).toBe(true);
      expect(result.finalValue.version).toBe(4);
    });

    it('应该实现基于事件的数据同步', async () => {
      // Arrange
      const events = [
        { type: 'user_updated', userId: 'user123', timestamp: Date.now() },
        { type: 'user_deleted', userId: 'user456', timestamp: Date.now() }
      ];

      mockRedisClient.del.mockResolvedValue(1);
      mockRedisClient.set.mockResolvedValue('OK');

      const mockEventHandler = {
        handleUserUpdated: jest.fn().mockResolvedValue({ id: 'user123', name: 'Updated User' }),
        handleUserDeleted: jest.fn().mockResolvedValue(true)
      };

      // Act
      for (const event of events) {
        await consistencyManager.handleDataChangeEvent(event, mockEventHandler);
      }

      // Assert
      expect(mockEventHandler.handleUserUpdated).toHaveBeenCalledWith('user123');
      expect(mockEventHandler.handleUserDeleted).toHaveBeenCalledWith('user456');
      expect(mockRedisClient.del).toHaveBeenCalledWith('user:user456');
    });
  });

  describe('版本控制和乐观锁', () => {
    it('应该实现基于版本的乐观锁', async () => {
      // Arrange
      const key = 'versioned_key';
      const currentValue = { id: 6, data: 'current', version: 1 };
      const updateValue = { id: 6, data: 'updated', version: 2 };

      mockRedisClient.get.mockResolvedValue(JSON.stringify(currentValue));
      mockRedisClient.set.mockResolvedValue('OK');

      const mockDataSource = {
        updateWithVersion: jest.fn().mockResolvedValue(updateValue)
      };

      // Act
      const result = await consistencyManager.optimisticUpdate(
        key,
        updateValue,
        mockDataSource.updateWithVersion,
        { expectedVersion: 1 }
      );

      // Assert
      expect(mockDataSource.updateWithVersion).toHaveBeenCalledWith(updateValue, 1);
      expect(mockRedisClient.set).toHaveBeenCalledWith(key, JSON.stringify(updateValue));
      expect(result.success).toBe(true);
      expect(result.newVersion).toBe(2);
    });

    it('应该检测版本冲突', async () => {
      // Arrange
      const key = 'version_conflict_key';
      const currentValue = { id: 7, data: 'current', version: 3 };
      const updateValue = { id: 7, data: 'updated', version: 4 };

      mockRedisClient.get.mockResolvedValue(JSON.stringify(currentValue));

      const mockDataSource = {
        updateWithVersion: jest.fn()
      };

      // Act
      const result = await consistencyManager.optimisticUpdate(
        key,
        updateValue,
        mockDataSource.updateWithVersion,
        { expectedVersion: 2 } // 期望版本与实际版本不匹配
      );

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toBe('version_conflict');
      expect(result.currentVersion).toBe(3);
      expect(mockDataSource.updateWithVersion).not.toHaveBeenCalled();
    });

    it('应该支持版本冲突的自动重试', async () => {
      // Arrange
      const key = 'retry_key';
      const initialValue = { id: 8, data: 'initial', version: 1 };
      const conflictValue = { id: 8, data: 'conflict', version: 2 };
      const finalValue = { id: 8, data: 'final', version: 3 };

      mockRedisClient.get
        .mockResolvedValueOnce(JSON.stringify(initialValue))  // 第一次尝试
        .mockResolvedValueOnce(JSON.stringify(conflictValue)) // 重试时获取新版本
        .mockResolvedValueOnce(JSON.stringify(finalValue));   // 最终成功

      mockRedisClient.set.mockResolvedValue('OK');

      const mockDataSource = {
        updateWithVersion: jest.fn()
          .mockRejectedValueOnce(new Error('Version conflict'))
          .mockResolvedValueOnce(finalValue)
      };

      const retryStrategy = {
        shouldRetry: jest.fn().mockReturnValue(true),
        mergeChanges: jest.fn().mockReturnValue({ id: 8, data: 'merged', version: 3 })
      };

      // Act
      const result = await consistencyManager.optimisticUpdateWithRetry(
        key,
        { id: 8, data: 'update_attempt' },
        mockDataSource.updateWithVersion,
        retryStrategy,
        { maxRetries: 2 }
      );

      // Assert
      expect(result.success).toBe(true);
      expect(result.attempts).toBe(2);
      expect(retryStrategy.mergeChanges).toHaveBeenCalled();
    });
  });

  describe('缓存预热和数据一致性', () => {
    it('应该确保预热数据的一致性', async () => {
      // Arrange
      const keys = ['warm_key1', 'warm_key2', 'warm_key3'];
      const dbData = [
        { id: 1, data: 'db_data1', checksum: 'abc123' },
        { id: 2, data: 'db_data2', checksum: 'def456' },
        { id: 3, data: 'db_data3', checksum: 'ghi789' }
      ];

      mockRedisClient.mget.mockResolvedValue([null, null, null]); // 缓存为空
      mockRedisClient.mset.mockResolvedValue('OK');

      const mockDataSource = {
        batchGet: jest.fn().mockResolvedValue(dbData),
        getChecksums: jest.fn().mockResolvedValue(['abc123', 'def456', 'ghi789'])
      };

      // Act
      const result = await consistencyManager.consistentWarmUp(
        keys,
        mockDataSource,
        { verifyChecksums: true }
      );

      // Assert
      expect(mockDataSource.batchGet).toHaveBeenCalledWith(keys);
      expect(mockDataSource.getChecksums).toHaveBeenCalledWith(keys);
      expect(mockRedisClient.mset).toHaveBeenCalled();
      expect(result.warmedKeys).toBe(3);
      expect(result.verified).toBe(true);
    });

    it('应该检测预热过程中的数据不一致', async () => {
      // Arrange
      const keys = ['inconsistent_key'];
      const dbData = [{ id: 1, data: 'db_data', checksum: 'abc123' }];
      const expectedChecksums = ['def456']; // 不匹配的校验和

      mockRedisClient.mget.mockResolvedValue([null]);

      const mockDataSource = {
        batchGet: jest.fn().mockResolvedValue(dbData),
        getChecksums: jest.fn().mockResolvedValue(expectedChecksums)
      };

      // Act
      const result = await consistencyManager.consistentWarmUp(
        keys,
        mockDataSource,
        { verifyChecksums: true }
      );

      // Assert
      expect(result.warmedKeys).toBe(0);
      expect(result.verified).toBe(false);
      expect(result.inconsistentKeys).toEqual(['inconsistent_key']);
      expect(mockRedisClient.mset).not.toHaveBeenCalled();
    });
  });

  describe('分布式缓存一致性', () => {
    it('应该实现跨节点的缓存失效', async () => {
      // Arrange
      const key = 'distributed_key';
      const invalidationMessage = {
        type: 'invalidate',
        key,
        nodeId: 'node1',
        timestamp: Date.now()
      };

      mockRedisClient.publish.mockResolvedValue(2); // 2个订阅者
      mockRedisClient.del.mockResolvedValue(1);

      // Act
      await consistencyManager.broadcastInvalidation(key, 'node1');

      // Assert
      expect(mockRedisClient.publish).toHaveBeenCalledWith(
        'cache_invalidation',
        JSON.stringify(expect.objectContaining({
          type: 'invalidate',
          key,
          nodeId: 'node1'
        }))
      );
    });

    it('应该处理来自其他节点的失效消息', async () => {
      // Arrange
      const invalidationMessage = {
        type: 'invalidate',
        key: 'remote_key',
        nodeId: 'node2',
        timestamp: Date.now()
      };

      mockRedisClient.del.mockResolvedValue(1);

      // Act
      await consistencyManager.handleInvalidationMessage(
        JSON.stringify(invalidationMessage),
        'node1' // 当前节点ID
      );

      // Assert
      expect(mockRedisClient.del).toHaveBeenCalledWith('remote_key');
    });

    it('应该防止失效消息的循环传播', async () => {
      // Arrange
      const invalidationMessage = {
        type: 'invalidate',
        key: 'self_key',
        nodeId: 'node1', // 来自自己的消息
        timestamp: Date.now()
      };

      // Act
      await consistencyManager.handleInvalidationMessage(
        JSON.stringify(invalidationMessage),
        'node1' // 当前节点ID相同
      );

      // Assert
      expect(mockRedisClient.del).not.toHaveBeenCalled(); // 不应该处理自己的消息
    });
  });

  describe('一致性监控和修复', () => {
    it('应该检测缓存与数据源的不一致', async () => {
      // Arrange
      const keys = ['check_key1', 'check_key2'];
      const cacheData = [
        { id: 1, data: 'cache_data1', checksum: 'old_checksum1' },
        { id: 2, data: 'cache_data2', checksum: 'old_checksum2' }
      ];
      const dbData = [
        { id: 1, data: 'db_data1', checksum: 'new_checksum1' },
        { id: 2, data: 'cache_data2', checksum: 'old_checksum2' } // 一致
      ];

      mockRedisClient.mget.mockResolvedValue([
        JSON.stringify(cacheData[0]),
        JSON.stringify(cacheData[1])
      ]);

      const mockDataSource = {
        batchGet: jest.fn().mockResolvedValue(dbData)
      };

      // Act
      const inconsistencies = await consistencyManager.detectInconsistencies(
        keys,
        mockDataSource
      );

      // Assert
      expect(inconsistencies).toHaveLength(1);
      expect(inconsistencies[0].key).toBe('check_key1');
      expect(inconsistencies[0].cacheChecksum).toBe('old_checksum1');
      expect(inconsistencies[0].dbChecksum).toBe('new_checksum1');
    });

    it('应该自动修复检测到的不一致', async () => {
      // Arrange
      const inconsistencies = [
        {
          key: 'repair_key1',
          cacheData: { id: 1, data: 'old_data' },
          dbData: { id: 1, data: 'new_data' }
        },
        {
          key: 'repair_key2',
          cacheData: { id: 2, data: 'stale_data' },
          dbData: { id: 2, data: 'fresh_data' }
        }
      ];

      mockRedisClient.set.mockResolvedValue('OK');

      // Act
      const repairResult = await consistencyManager.repairInconsistencies(
        inconsistencies,
        { strategy: 'prefer_database' }
      );

      // Assert
      expect(repairResult.repairedCount).toBe(2);
      expect(mockRedisClient.set).toHaveBeenCalledTimes(2);
      expect(mockRedisClient.set).toHaveBeenCalledWith(
        'repair_key1',
        JSON.stringify({ id: 1, data: 'new_data' })
      );
      expect(mockRedisClient.set).toHaveBeenCalledWith(
        'repair_key2',
        JSON.stringify({ id: 2, data: 'fresh_data' })
      );
    });

    it('应该生成一致性检查报告', async () => {
      // Arrange
      const checkResult = {
        totalKeys: 100,
        consistentKeys: 95,
        inconsistentKeys: 5,
        errorKeys: 0,
        checkDuration: 2500
      };

      // Act
      const report = await consistencyManager.generateConsistencyReport(checkResult);

      // Assert
      expect(report.summary.consistencyRate).toBe(0.95);
      expect(report.summary.status).toBe('good');
      expect(report.recommendations).toContain('一致性率良好');
      expect(report.metrics.totalKeys).toBe(100);
      expect(report.metrics.inconsistentKeys).toBe(5);
    });
  });

  describe('事务性缓存操作', () => {
    it('应该支持多key的事务性更新', async () => {
      // Arrange
      const updates = [
        { key: 'tx_key1', value: { id: 1, data: 'tx_data1' } },
        { key: 'tx_key2', value: { id: 2, data: 'tx_data2' } }
      ];

      const mockMulti = {
        set: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue(['OK', 'OK'])
      };

      mockRedisClient.multi.mockReturnValue(mockMulti);

      const mockDataSource = {
        transactionalUpdate: jest.fn().mockResolvedValue(true)
      };

      // Act
      const result = await consistencyManager.transactionalUpdate(
        updates,
        mockDataSource.transactionalUpdate
      );

      // Assert
      expect(mockDataSource.transactionalUpdate).toHaveBeenCalledWith(updates);
      expect(mockRedisClient.multi).toHaveBeenCalled();
      expect(mockMulti.set).toHaveBeenCalledTimes(2);
      expect(mockMulti.exec).toHaveBeenCalled();
      expect(result.success).toBe(true);
    });

    it('应该在数据源事务失败时回滚缓存', async () => {
      // Arrange
      const updates = [
        { key: 'rollback_key1', value: { id: 1, data: 'rollback_data1' } }
      ];

      const mockDataSource = {
        transactionalUpdate: jest.fn().mockRejectedValue(new Error('DB transaction failed'))
      };

      // Act & Assert
      await expect(
        consistencyManager.transactionalUpdate(updates, mockDataSource.transactionalUpdate)
      ).rejects.toThrow('DB transaction failed');

      expect(mockRedisClient.multi).not.toHaveBeenCalled(); // 不应该更新缓存
    });
  });
});

// 辅助类定义
class CacheConsistencyManager {
  private nodeId: string;

  constructor(nodeId: string = 'default_node') {
    this.nodeId = nodeId;
  }

  async updateWithLock(
    key: string,
    value: any,
    updateFn: (value: any) => Promise<any>,
    options: { lockTimeout: number; retryAttempts?: number; retryDelay?: number }
  ): Promise<any> {
    const lockKey = `lock:${key}`;
    const lockValue = `${this.nodeId}:${Date.now()}`;
    const client = redisManager.getClient();
    
    if (!client) throw new Error('Redis client not available');

    // 尝试获取锁
    let attempts = 0;
    const maxAttempts = options.retryAttempts || 3;
    
    while (attempts < maxAttempts) {
      const lockResult = await client.set(
        lockKey,
        lockValue,
        'PX',
        options.lockTimeout,
        'NX'
      );
      
      if (lockResult === 'OK') {
        try {
          // 执行更新操作
          const result = await updateFn(value);
          
          // 更新缓存
          await client.set(key, JSON.stringify(result));
          
          return result;
        } finally {
          // 释放锁
          await client.del(lockKey);
        }
      }
      
      attempts++;
      if (attempts < maxAttempts) {
        await new Promise(resolve => setTimeout(resolve, options.retryDelay || 100));
      }
    }
    
    throw new Error('Failed to acquire lock');
  }

  async updateWithAutoRenewLock(
    key: string,
    value: any,
    updateFn: (value: any) => Promise<any>,
    options: { lockTimeout: number; renewInterval: number }
  ): Promise<any> {
    const lockKey = `lock:${key}`;
    const lockValue = `${this.nodeId}:${Date.now()}`;
    const client = redisManager.getClient();
    
    if (!client) throw new Error('Redis client not available');

    // 获取锁
    const lockResult = await client.set(
      lockKey,
      lockValue,
      'PX',
      options.lockTimeout,
      'NX'
    );
    
    if (lockResult !== 'OK') {
      throw new Error('Failed to acquire lock');
    }

    // 设置自动续期
    const renewTimer = setInterval(async () => {
      await client.expire(lockKey, options.lockTimeout);
    }, options.renewInterval);

    try {
      const result = await updateFn(value);
      await client.set(key, JSON.stringify(result));
      return result;
    } finally {
      clearInterval(renewTimer);
      await client.del(lockKey);
    }
  }

  async syncWithDataSource(
    key: string,
    dataSource: any,
    options: { syncInterval: number }
  ): Promise<any> {
    const client = redisManager.getClient();
    if (!client) return { synced: false, reason: 'redis_unavailable' };

    const cachedData = await client.get(key);
    const dbData = await dataSource.get(key);
    
    if (!cachedData) {
      await client.set(key, JSON.stringify(dbData));
      return { synced: true, reason: 'cache_empty' };
    }
    
    const cached = JSON.parse(cachedData);
    const dbLastModified = await dataSource.getLastModified(key);
    
    if (dbLastModified > cached.timestamp) {
      await client.set(key, JSON.stringify(dbData));
      return { synced: true, reason: 'data_newer_in_source' };
    }
    
    return { synced: false, reason: 'cache_up_to_date' };
  }

  async resolveConflict(
    key: string,
    cacheValue: any,
    dbValue: any,
    resolver: (cache: any, db: any) => Promise<any>
  ): Promise<any> {
    const resolvedValue = await resolver(cacheValue, dbValue);
    
    const client = redisManager.getClient();
    if (client) {
      await client.set(key, JSON.stringify(resolvedValue));
    }
    
    return { resolved: true, finalValue: resolvedValue };
  }

  async handleDataChangeEvent(event: any, handler: any): Promise<void> {
    const client = redisManager.getClient();
    if (!client) return;

    switch (event.type) {
      case 'user_updated':
        const updatedUser = await handler.handleUserUpdated(event.userId);
        await client.set(`user:${event.userId}`, JSON.stringify(updatedUser));
        break;
      case 'user_deleted':
        await handler.handleUserDeleted(event.userId);
        await client.del(`user:${event.userId}`);
        break;
    }
  }

  async optimisticUpdate(
    key: string,
    value: any,
    updateFn: (value: any, expectedVersion: number) => Promise<any>,
    options: { expectedVersion: number }
  ): Promise<any> {
    const client = redisManager.getClient();
    if (!client) throw new Error('Redis client not available');

    const currentData = await client.get(key);
    if (!currentData) {
      return { success: false, error: 'key_not_found' };
    }
    
    const current = JSON.parse(currentData);
    if (current.version !== options.expectedVersion) {
      return {
        success: false,
        error: 'version_conflict',
        currentVersion: current.version,
        expectedVersion: options.expectedVersion
      };
    }
    
    const result = await updateFn(value, options.expectedVersion);
    await client.set(key, JSON.stringify(result));
    
    return { success: true, newVersion: result.version };
  }

  async optimisticUpdateWithRetry(
    key: string,
    value: any,
    updateFn: (value: any, expectedVersion?: number) => Promise<any>,
    retryStrategy: any,
    options: { maxRetries: number }
  ): Promise<any> {
    let attempts = 0;
    
    while (attempts < options.maxRetries) {
      try {
        const client = redisManager.getClient();
        if (!client) throw new Error('Redis client not available');

        const currentData = await client.get(key);
        const current = currentData ? JSON.parse(currentData) : null;
        
        if (attempts > 0 && retryStrategy.shouldRetry()) {
          // 合并变更
          value = retryStrategy.mergeChanges(value, current);
        }
        
        const result = await updateFn(value, current?.version);
        await client.set(key, JSON.stringify(result));
        
        return { success: true, attempts: attempts + 1, result };
      } catch (error) {
        attempts++;
        if (attempts >= options.maxRetries) {
          throw error;
        }
      }
    }
  }

  async consistentWarmUp(
    keys: string[],
    dataSource: any,
    options: { verifyChecksums: boolean }
  ): Promise<any> {
    const client = redisManager.getClient();
    if (!client) return { warmedKeys: 0, verified: false };

    const dbData = await dataSource.batchGet(keys);
    
    if (options.verifyChecksums) {
      const expectedChecksums = await dataSource.getChecksums(keys);
      const actualChecksums = dbData.map((item: any) => item.checksum);
      
      const inconsistentKeys = keys.filter((key, index) => 
        expectedChecksums[index] !== actualChecksums[index]
      );
      
      if (inconsistentKeys.length > 0) {
        return {
          warmedKeys: 0,
          verified: false,
          inconsistentKeys
        };
      }
    }
    
    const keyValuePairs = keys.flatMap((key, index) => [
      key,
      JSON.stringify(dbData[index])
    ]);
    
    await client.mset(...keyValuePairs);
    
    return {
      warmedKeys: keys.length,
      verified: options.verifyChecksums
    };
  }

  async broadcastInvalidation(key: string, nodeId: string): Promise<void> {
    const client = redisManager.getClient();
    if (!client) return;

    const message = {
      type: 'invalidate',
      key,
      nodeId,
      timestamp: Date.now()
    };
    
    await client.publish('cache_invalidation', JSON.stringify(message));
  }

  async handleInvalidationMessage(message: string, currentNodeId: string): Promise<void> {
    const data = JSON.parse(message);
    
    // 忽略来自自己的消息
    if (data.nodeId === currentNodeId) {
      return;
    }
    
    if (data.type === 'invalidate') {
      const client = redisManager.getClient();
      if (client) {
        await client.del(data.key);
      }
    }
  }

  async detectInconsistencies(keys: string[], dataSource: any): Promise<any[]> {
    const client = redisManager.getClient();
    if (!client) return [];

    const cacheData = await client.mget(...keys);
    const dbData = await dataSource.batchGet(keys);
    
    const inconsistencies = [];
    
    for (let i = 0; i < keys.length; i++) {
      const cached = cacheData[i] ? JSON.parse(cacheData[i]) : null;
      const db = dbData[i];
      
      if (cached && db && cached.checksum !== db.checksum) {
        inconsistencies.push({
          key: keys[i],
          cacheChecksum: cached.checksum,
          dbChecksum: db.checksum,
          cacheData: cached,
          dbData: db
        });
      }
    }
    
    return inconsistencies;
  }

  async repairInconsistencies(
    inconsistencies: any[],
    options: { strategy: string }
  ): Promise<any> {
    const client = redisManager.getClient();
    if (!client) return { repairedCount: 0 };

    let repairedCount = 0;
    
    for (const inconsistency of inconsistencies) {
      if (options.strategy === 'prefer_database') {
        await client.set(
          inconsistency.key,
          JSON.stringify(inconsistency.dbData)
        );
        repairedCount++;
      }
    }
    
    return { repairedCount };
  }

  async generateConsistencyReport(checkResult: any): Promise<any> {
    const consistencyRate = checkResult.consistentKeys / checkResult.totalKeys;
    const status = consistencyRate > 0.9 ? 'good' : 'needs_attention';
    
    const recommendations = [];
    if (consistencyRate > 0.9) {
      recommendations.push('一致性率良好');
    } else {
      recommendations.push('需要关注数据一致性问题');
    }
    
    return {
      summary: { consistencyRate, status },
      recommendations,
      metrics: {
        totalKeys: checkResult.totalKeys,
        consistentKeys: checkResult.consistentKeys,
        inconsistentKeys: checkResult.inconsistentKeys
      }
    };
  }

  async transactionalUpdate(
    updates: any[],
    dataSourceUpdateFn: (updates: any[]) => Promise<boolean>
  ): Promise<any> {
    // 先更新数据源
    await dataSourceUpdateFn(updates);
    
    // 数据源更新成功后，更新缓存
    const client = redisManager.getClient();
    if (!client) return { success: false, reason: 'redis_unavailable' };

    const multi = client.multi();
    
    updates.forEach(update => {
      multi.set(update.key, JSON.stringify(update.value));
    });
    
    await multi.exec();
    
    return { success: true };
  }
}