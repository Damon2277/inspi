/**
 * 测试数据库连接管理器
 * 管理测试环境中的数据库连接，包括MongoDB和Redis
 */

import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import Redis from 'ioredis';

export interface DatabaseConfig {
  mongodb: {
    uri: string;
    dbName: string;
    options: Record<string, any>;
  };
  redis: {
    url: string;
    password?: string;
    options: Record<string, any>;
  };
}

export interface DatabaseStatus {
  mongodb: {
    connected: boolean;
    uri?: string;
    dbName?: string;
  };
  redis: {
    connected: boolean;
    url?: string;
  };
}

export class TestDatabaseManager {
  private static instance: TestDatabaseManager;
  private mongoServer?: MongoMemoryServer;
  private mongoConnection?: typeof mongoose;
  private redisClient?: Redis;
  private redisServer?: any; // redis-memory-server类型
  private initialized: boolean = false;

  private constructor() {}

  public static getInstance(): TestDatabaseManager {
    if (!TestDatabaseManager.instance) {
      TestDatabaseManager.instance = new TestDatabaseManager();
    }
    return TestDatabaseManager.instance;
  }

  /**
   * 初始化数据库连接
   */
  public async initialize(config: DatabaseConfig): Promise<void> {
    if (this.initialized) {
      return;
    }

    try {
      // 初始化MongoDB
      await this.initializeMongoDB(config.mongodb);
      
      // 初始化Redis
      await this.initializeRedis(config.redis);

      this.initialized = true;
      console.log('✅ Test database connections initialized');
    } catch (error) {
      console.error('❌ Failed to initialize test databases:', error);
      throw error;
    }
  }

  /**
   * 初始化MongoDB连接
   */
  private async initializeMongoDB(config: DatabaseConfig['mongodb']): Promise<void> {
    try {
      // 如果是测试环境，使用内存数据库
      if (process.env.NODE_ENV === 'test' && !config.uri.includes('mongodb://')) {
        this.mongoServer = await MongoMemoryServer.create({
          instance: {
            dbName: config.dbName,
          },
        });
        
        const uri = this.mongoServer.getUri();
        this.mongoConnection = await mongoose.connect(uri, {
          ...config.options,
          bufferCommands: false,
        });
        
        console.log(`📦 MongoDB Memory Server started: ${uri}`);
      } else {
        // 使用真实数据库连接
        this.mongoConnection = await mongoose.connect(config.uri, config.options);
        console.log(`🔗 Connected to MongoDB: ${config.uri}`);
      }
    } catch (error) {
      console.error('Failed to initialize MongoDB:', error);
      throw error;
    }
  }

  /**
   * 初始化Redis连接
   */
  private async initializeRedis(config: DatabaseConfig['redis']): Promise<void> {
    try {
      // 如果是测试环境，尝试使用内存Redis或Mock
      if (process.env.NODE_ENV === 'test') {
        // 尝试连接到真实Redis，如果失败则使用Mock
        try {
          this.redisClient = new Redis(config.url, {
            ...config.options,
            retryDelayOnFailover: 100,
            maxRetriesPerRequest: 1,
            lazyConnect: true,
          });
          
          await this.redisClient.connect();
          console.log(`🔗 Connected to Redis: ${config.url}`);
        } catch (error) {
          console.warn('Redis connection failed, using mock Redis');
          this.redisClient = this.createMockRedis();
        }
      } else {
        this.redisClient = new Redis(config.url, config.options);
        console.log(`🔗 Connected to Redis: ${config.url}`);
      }
    } catch (error) {
      console.error('Failed to initialize Redis:', error);
      throw error;
    }
  }

  /**
   * 创建Mock Redis客户端
   */
  private createMockRedis(): any {
    const mockData = new Map<string, string>();
    
    return {
      get: jest.fn().mockImplementation((key: string) => {
        return Promise.resolve(mockData.get(key) || null);
      }),
      
      set: jest.fn().mockImplementation((key: string, value: string, ...args: any[]) => {
        mockData.set(key, value);
        return Promise.resolve('OK');
      }),
      
      del: jest.fn().mockImplementation((key: string) => {
        const existed = mockData.has(key);
        mockData.delete(key);
        return Promise.resolve(existed ? 1 : 0);
      }),
      
      exists: jest.fn().mockImplementation((key: string) => {
        return Promise.resolve(mockData.has(key) ? 1 : 0);
      }),
      
      expire: jest.fn().mockImplementation((key: string, seconds: number) => {
        // 在真实实现中，这里会设置过期时间
        return Promise.resolve(mockData.has(key) ? 1 : 0);
      }),
      
      flushall: jest.fn().mockImplementation(() => {
        mockData.clear();
        return Promise.resolve('OK');
      }),
      
      disconnect: jest.fn().mockImplementation(() => {
        return Promise.resolve();
      }),
      
      // 标记为Mock客户端
      isMock: true,
    };
  }

  /**
   * 获取MongoDB连接
   */
  public getMongoConnection(): typeof mongoose | undefined {
    return this.mongoConnection;
  }

  /**
   * 获取Redis客户端
   */
  public getRedisClient(): Redis | undefined {
    return this.redisClient;
  }

  /**
   * 清理数据库数据
   */
  public async clearDatabases(): Promise<void> {
    try {
      // 清理MongoDB
      if (this.mongoConnection) {
        const collections = await this.mongoConnection.connection.db.collections();
        await Promise.all(
          collections.map(collection => collection.deleteMany({}))
        );
      }

      // 清理Redis
      if (this.redisClient) {
        if ((this.redisClient as any).isMock) {
          await this.redisClient.flushall();
        } else {
          await this.redisClient.flushall();
        }
      }

      console.log('🧹 Test databases cleared');
    } catch (error) {
      console.error('Failed to clear test databases:', error);
      throw error;
    }
  }

  /**
   * 获取数据库状态
   */
  public getStatus(): DatabaseStatus {
    return {
      mongodb: {
        connected: this.mongoConnection?.connection?.readyState === 1,
        uri: this.mongoServer?.getUri() || process.env.MONGODB_URI,
        dbName: this.mongoConnection?.connection?.db?.databaseName,
      },
      redis: {
        connected: this.redisClient?.status === 'ready' || !!(this.redisClient as any)?.isMock,
        url: (this.redisClient as any)?.isMock ? 'mock://redis' : process.env.REDIS_URL,
      },
    };
  }

  /**
   * 健康检查
   */
  public async healthCheck(): Promise<{ healthy: boolean; message?: string }> {
    try {
      // 检查MongoDB连接
      if (this.mongoConnection) {
        await this.mongoConnection.connection.db.admin().ping();
      }

      // 检查Redis连接
      if (this.redisClient) {
        if ((this.redisClient as any).isMock) {
          // Mock Redis总是健康的
        } else {
          await this.redisClient.ping();
        }
      }

      return { healthy: true };
    } catch (error) {
      return { 
        healthy: false, 
        message: `Database health check failed: ${error}` 
      };
    }
  }

  /**
   * 创建测试数据库快照
   */
  public async createSnapshot(name: string): Promise<void> {
    // 这里可以实现数据库快照功能
    // 对于测试环境，可能不需要实现
    console.log(`📸 Database snapshot '${name}' created (placeholder)`);
  }

  /**
   * 恢复测试数据库快照
   */
  public async restoreSnapshot(name: string): Promise<void> {
    // 这里可以实现数据库快照恢复功能
    // 对于测试环境，可能不需要实现
    console.log(`🔄 Database snapshot '${name}' restored (placeholder)`);
  }

  /**
   * 清理和关闭连接
   */
  public async cleanup(): Promise<void> {
    if (!this.initialized) {
      return;
    }

    try {
      // 关闭MongoDB连接
      if (this.mongoConnection) {
        await this.mongoConnection.disconnect();
        this.mongoConnection = undefined;
      }

      // 停止MongoDB内存服务器
      if (this.mongoServer) {
        await this.mongoServer.stop();
        this.mongoServer = undefined;
      }

      // 关闭Redis连接
      if (this.redisClient) {
        if (!(this.redisClient as any).isMock) {
          await this.redisClient.disconnect();
        }
        this.redisClient = undefined;
      }

      this.initialized = false;
      console.log('🔌 Test database connections closed');
    } catch (error) {
      console.error('Error during database cleanup:', error);
    }
  }

  /**
   * 重置数据库管理器
   */
  public async reset(): Promise<void> {
    await this.cleanup();
    this.initialized = false;
  }

  /**
   * 获取数据库统计信息
   */
  public async getStats(): Promise<{
    mongodb?: {
      collections: number;
      documents: number;
      size: number;
    };
    redis?: {
      keys: number;
      memory: number;
    };
  }> {
    const stats: any = {};

    try {
      // MongoDB统计
      if (this.mongoConnection) {
        const db = this.mongoConnection.connection.db;
        const collections = await db.collections();
        let totalDocuments = 0;
        
        for (const collection of collections) {
          const count = await collection.countDocuments();
          totalDocuments += count;
        }

        const dbStats = await db.stats();
        
        stats.mongodb = {
          collections: collections.length,
          documents: totalDocuments,
          size: dbStats.dataSize || 0,
        };
      }

      // Redis统计
      if (this.redisClient && !(this.redisClient as any).isMock) {
        const info = await this.redisClient.info('memory');
        const keyspace = await this.redisClient.info('keyspace');
        
        // 解析keyspace信息获取key数量
        const keyCount = keyspace.match(/keys=(\d+)/)?.[1] || '0';
        
        stats.redis = {
          keys: parseInt(keyCount),
          memory: 0, // 从info中解析内存使用情况
        };
      } else if ((this.redisClient as any)?.isMock) {
        stats.redis = {
          keys: 0, // Mock Redis的key数量
          memory: 0,
        };
      }
    } catch (error) {
      console.error('Failed to get database stats:', error);
    }

    return stats;
  }
}

export default TestDatabaseManager;