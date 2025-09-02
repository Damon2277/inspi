/**
 * 缓存系统配置
 */

export interface CacheConfig {
  redis: RedisConfig;
  memory: MemoryCacheConfig;
  strategies: CacheStrategiesConfig;
}

export interface RedisConfig {
  host: string;
  port: number;
  password?: string;
  db: number;
  cluster?: {
    enabled: boolean;
    nodes: Array<{ host: string; port: number }>;
  };
  sentinel?: {
    enabled: boolean;
    sentinels: Array<{ host: string; port: number }>;
    name: string;
  };
  options: {
    connectTimeout: number;
    lazyConnect: boolean;
    maxRetriesPerRequest: number;
    retryDelayOnFailover: number;
    enableReadyCheck: boolean;
    maxmemoryPolicy: 'allkeys-lru' | 'allkeys-lfu' | 'volatile-lru' | 'volatile-lfu';
  };
}

export interface MemoryCacheConfig {
  maxSize: number; // 最大缓存项数
  maxMemory: number; // 最大内存使用 (MB)
  ttl: number; // 默认TTL (秒)
  checkPeriod: number; // 清理检查周期 (秒)
  evictionPolicy: 'LRU' | 'LFU' | 'FIFO';
}

export interface CacheStrategiesConfig {
  user: CacheStrategyConfig;
  work: CacheStrategyConfig;
  ranking: CacheStrategyConfig;
  knowledgeGraph: CacheStrategyConfig;
  session: CacheStrategyConfig;
  api: CacheStrategyConfig;
}

export interface CacheStrategyConfig {
  enabled: boolean;
  layers: CacheLayer[];
  ttl: {
    memory: number;
    redis: number;
  };
  maxSize: {
    memory: number;
    redis: number;
  };
  warmup: {
    enabled: boolean;
    strategy: 'eager' | 'lazy' | 'scheduled';
    schedule?: string; // cron expression
  };
  invalidation: {
    strategy: 'ttl' | 'manual' | 'event-driven';
    events?: string[];
  };
}

export enum CacheLayer {
  MEMORY = 'memory',
  REDIS = 'redis',
  DATABASE = 'database'
}

export enum CacheKeyPrefix {
  USER = 'user',
  WORK = 'work',
  RANKING = 'ranking',
  KNOWLEDGE_GRAPH = 'kg',
  SESSION = 'session',
  API = 'api',
  TEMP = 'temp'
}

/**
 * 默认缓存配置
 */
export const DEFAULT_CACHE_CONFIG: CacheConfig = {
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379'),
    password: process.env.REDIS_PASSWORD,
    db: parseInt(process.env.REDIS_DB || '0'),
    cluster: {
      enabled: process.env.REDIS_CLUSTER_ENABLED === 'true',
      nodes: process.env.REDIS_CLUSTER_NODES 
        ? JSON.parse(process.env.REDIS_CLUSTER_NODES)
        : []
    },
    options: {
      connectTimeout: 10000,
      lazyConnect: true,
      maxRetriesPerRequest: 3,
      retryDelayOnFailover: 100,
      enableReadyCheck: true,
      maxmemoryPolicy: 'allkeys-lru'
    }
  },
  memory: {
    maxSize: 10000,
    maxMemory: 100, // 100MB
    ttl: 300, // 5分钟
    checkPeriod: 60, // 1分钟
    evictionPolicy: 'LRU'
  },
  strategies: {
    user: {
      enabled: true,
      layers: [CacheLayer.MEMORY, CacheLayer.REDIS],
      ttl: {
        memory: 300, // 5分钟
        redis: 3600 // 1小时
      },
      maxSize: {
        memory: 1000,
        redis: 10000
      },
      warmup: {
        enabled: true,
        strategy: 'lazy'
      },
      invalidation: {
        strategy: 'event-driven',
        events: ['user.updated', 'user.deleted']
      }
    },
    work: {
      enabled: true,
      layers: [CacheLayer.MEMORY, CacheLayer.REDIS],
      ttl: {
        memory: 600, // 10分钟
        redis: 7200 // 2小时
      },
      maxSize: {
        memory: 2000,
        redis: 20000
      },
      warmup: {
        enabled: true,
        strategy: 'scheduled',
        schedule: '0 */6 * * *' // 每6小时
      },
      invalidation: {
        strategy: 'event-driven',
        events: ['work.created', 'work.updated', 'work.deleted']
      }
    },
    ranking: {
      enabled: true,
      layers: [CacheLayer.MEMORY, CacheLayer.REDIS],
      ttl: {
        memory: 300, // 5分钟
        redis: 1800 // 30分钟
      },
      maxSize: {
        memory: 100,
        redis: 1000
      },
      warmup: {
        enabled: true,
        strategy: 'scheduled',
        schedule: '0 */1 * * *' // 每小时
      },
      invalidation: {
        strategy: 'event-driven',
        events: ['contribution.updated', 'work.created']
      }
    },
    knowledgeGraph: {
      enabled: true,
      layers: [CacheLayer.MEMORY, CacheLayer.REDIS],
      ttl: {
        memory: 1800, // 30分钟
        redis: 14400 // 4小时
      },
      maxSize: {
        memory: 500,
        redis: 5000
      },
      warmup: {
        enabled: true,
        strategy: 'eager'
      },
      invalidation: {
        strategy: 'manual'
      }
    },
    session: {
      enabled: true,
      layers: [CacheLayer.REDIS],
      ttl: {
        memory: 0, // 不使用内存缓存
        redis: 86400 // 24小时
      },
      maxSize: {
        memory: 0,
        redis: 50000
      },
      warmup: {
        enabled: false,
        strategy: 'lazy'
      },
      invalidation: {
        strategy: 'ttl'
      }
    },
    api: {
      enabled: true,
      layers: [CacheLayer.MEMORY, CacheLayer.REDIS],
      ttl: {
        memory: 60, // 1分钟
        redis: 300 // 5分钟
      },
      maxSize: {
        memory: 5000,
        redis: 50000
      },
      warmup: {
        enabled: false,
        strategy: 'lazy'
      },
      invalidation: {
        strategy: 'ttl'
      }
    }
  }
};

/**
 * 缓存键生成器
 */
export class CacheKeyGenerator {
  /**
   * 生成缓存键
   */
  static generate(
    prefix: CacheKeyPrefix,
    identifier: string | number,
    suffix?: string,
    version?: string
  ): string {
    const parts = [prefix, identifier];
    
    if (suffix) {
      parts.push(suffix);
    }
    
    if (version) {
      parts.push(`v${version}`);
    }
    
    return parts.join(':');
  }

  /**
   * 生成用户缓存键
   */
  static user(userId: string, suffix?: string): string {
    return this.generate(CacheKeyPrefix.USER, userId, suffix);
  }

  /**
   * 生成作品缓存键
   */
  static work(workId: string, suffix?: string): string {
    return this.generate(CacheKeyPrefix.WORK, workId, suffix);
  }

  /**
   * 生成排行榜缓存键
   */
  static ranking(type: string, period?: string): string {
    return this.generate(CacheKeyPrefix.RANKING, type, period);
  }

  /**
   * 生成知识图谱缓存键
   */
  static knowledgeGraph(graphId: string, suffix?: string): string {
    return this.generate(CacheKeyPrefix.KNOWLEDGE_GRAPH, graphId, suffix);
  }

  /**
   * 生成会话缓存键
   */
  static session(sessionId: string): string {
    return this.generate(CacheKeyPrefix.SESSION, sessionId);
  }

  /**
   * 生成API缓存键
   */
  static api(endpoint: string, params?: string): string {
    const identifier = params ? `${endpoint}:${params}` : endpoint;
    return this.generate(CacheKeyPrefix.API, identifier);
  }

  /**
   * 解析缓存键
   */
  static parse(key: string): {
    prefix: string;
    identifier: string;
    suffix?: string;
    version?: string;
  } {
    const parts = key.split(':');
    const result = {
      prefix: parts[0],
      identifier: parts[1]
    } as any;

    if (parts.length > 2) {
      const lastPart = parts[parts.length - 1];
      if (lastPart.startsWith('v')) {
        result.version = lastPart.substring(1);
        if (parts.length > 3) {
          result.suffix = parts.slice(2, -1).join(':');
        }
      } else {
        result.suffix = parts.slice(2).join(':');
      }
    }

    return result;
  }
}

/**
 * 缓存统计接口
 */
export interface CacheStats {
  memory: {
    hits: number;
    misses: number;
    hitRate: number;
    size: number;
    maxSize: number;
    memoryUsage: number; // MB
  };
  redis: {
    hits: number;
    misses: number;
    hitRate: number;
    size: number;
    memoryUsage: number; // MB
    connections: number;
  };
  overall: {
    totalHits: number;
    totalMisses: number;
    overallHitRate: number;
    totalOperations: number;
  };
}

/**
 * 缓存事件类型
 */
export enum CacheEventType {
  HIT = 'hit',
  MISS = 'miss',
  SET = 'set',
  DELETE = 'delete',
  EXPIRE = 'expire',
  EVICT = 'evict',
  CLEAR = 'clear',
  ERROR = 'error'
}

/**
 * 缓存事件
 */
export interface CacheEvent {
  type: CacheEventType;
  layer: CacheLayer;
  key: string;
  timestamp: number;
  metadata?: Record<string, any>;
}

export default DEFAULT_CACHE_CONFIG;