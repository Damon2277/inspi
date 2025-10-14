/**
 * 生产环境配置
 * 包含数据库、Redis、缓存等生产环境专用配置
 */

export interface ProductionConfig {
  database: DatabaseConfig
  redis: RedisConfig
  cache: CacheConfig
  monitoring: MonitoringConfig
  security: SecurityConfig
  performance: PerformanceConfig
}

export interface DatabaseConfig {
  // 主数据库配置
  primary: {
    host: string
    port: number
    database: string
    username: string
    password: string
    ssl: boolean
    connectionLimit: number
    acquireTimeout: number
    timeout: number
    reconnect: boolean
    charset: string
  }

  // 只读副本配置
  replicas: Array<{
    host: string
    port: number
    database: string
    username: string
    password: string
    ssl: boolean
    weight: number // 负载权重
  }>

  // 连接池配置
  pool: {
    min: number
    max: number
    idle: number
    acquire: number
    evict: number
    handleDisconnects: boolean
  }

  // 事务配置
  transaction: {
    isolationLevel: 'READ_UNCOMMITTED' | 'READ_COMMITTED' | 'REPEATABLE_READ' | 'SERIALIZABLE'
    timeout: number
    retryLimit: number
  }
}

export interface RedisConfig {
  // Redis集群配置
  cluster: {
    nodes: Array<{
      host: string
      port: number
    }>
    options: {
      enableReadyCheck: boolean
      redisOptions: {
        password: string
        db: number
        connectTimeout: number
        commandTimeout: number
        retryDelayOnFailover: number
        maxRetriesPerRequest: number
      }
      clusterRetryDelayOnFailover: number
      clusterRetryDelayOnClusterDown: number
      clusterMaxRedirections: number
      scaleReads: 'master' | 'slave' | 'all'
    }
  }

  // 单实例配置（备用）
  standalone: {
    host: string
    port: number
    password: string
    db: number
    connectTimeout: number
    commandTimeout: number
    retryDelayOnFailover: number
    maxRetriesPerRequest: number
  }

  // 哨兵模式配置
  sentinel: {
    sentinels: Array<{
      host: string
      port: number
    }>
    name: string
    password: string
    db: number
    sentinelPassword?: string
  }
}

export interface CacheConfig {
  // 多层缓存配置
  layers: {
    // L1缓存（内存）
    memory: {
      maxSize: number // MB
      ttl: number // 秒
      checkPeriod: number
      useClones: boolean
    }

    // L2缓存（Redis）
    redis: {
      ttl: number
      keyPrefix: string
      compression: boolean
      serialization: 'json' | 'msgpack'
    }

    // L3缓存（CDN）
    cdn: {
      enabled: boolean
      provider: 'cloudflare' | 'aws' | 'aliyun'
      ttl: number
      regions: string[]
    }
  }

  // 缓存策略
  strategies: {
    writeThrough: boolean
    writeBack: boolean
    refreshAhead: boolean
    circuitBreaker: {
      enabled: boolean
      threshold: number
      timeout: number
    }
  }
}

export interface MonitoringConfig {
  // 指标收集
  metrics: {
    enabled: boolean
    interval: number
    retention: number // 天
    exporters: Array<'prometheus' | 'datadog' | 'newrelic'>
  }

  // 日志配置
  logging: {
    level: 'error' | 'warn' | 'info' | 'debug'
    format: 'json' | 'text'
    destination: 'console' | 'file' | 'elasticsearch'
    rotation: {
      enabled: boolean
      maxSize: string
      maxFiles: number
      maxAge: string
    }
  }

  // 追踪配置
  tracing: {
    enabled: boolean
    sampler: 'always' | 'never' | 'probabilistic'
    samplingRate: number
    jaegerEndpoint?: string
  }

  // 健康检查
  healthCheck: {
    enabled: boolean
    interval: number
    timeout: number
    endpoints: string[]
  }
}

export interface SecurityConfig {
  // HTTPS配置
  https: {
    enabled: boolean
    cert: string
    key: string
    ca?: string
    ciphers: string
    protocols: string[]
  }

  // 认证配置
  auth: {
    jwtSecret: string
    jwtExpiry: number
    refreshTokenExpiry: number
    bcryptRounds: number
  }

  // 限流配置
  rateLimit: {
    windowMs: number
    max: number
    skipSuccessfulRequests: boolean
    skipFailedRequests: boolean
    keyGenerator: string
  }

  // CORS配置
  cors: {
    origin: string[]
    methods: string[]
    allowedHeaders: string[]
    credentials: boolean
  }

  // 安全头配置
  security: {
    contentSecurityPolicy: string
    hsts: boolean
    noSniff: boolean
    xssFilter: boolean
    referrerPolicy: string
  }
}

export interface PerformanceConfig {
  // 服务器配置
  server: {
    port: number
    workers: number
    keepAliveTimeout: number
    headersTimeout: number
    maxHeaderSize: number
    bodyLimit: string
  }

  // 压缩配置
  compression: {
    enabled: boolean
    level: number
    threshold: number
    filter: string[]
  }

  // 静态资源配置
  static: {
    maxAge: number
    etag: boolean
    lastModified: boolean
    immutable: boolean
  }

  // 优化配置
  optimization: {
    enableGzip: boolean
    enableBrotli: boolean
    minifyHtml: boolean
    minifyCss: boolean
    minifyJs: boolean
    imageOptimization: boolean
  }
}

/**
 * 生产环境配置实例
 */
export const productionConfig: ProductionConfig = {
  database: {
    primary: {
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '3306', 10),
      database: process.env.DB_NAME || 'inspi_ai_prod',
      username: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      ssl: process.env.DB_SSL === 'true',
      connectionLimit: parseInt(process.env.DB_CONNECTION_LIMIT || '100', 10),
      acquireTimeout: parseInt(process.env.DB_ACQUIRE_TIMEOUT || '60000', 10),
      timeout: parseInt(process.env.DB_TIMEOUT || '60000', 10),
      reconnect: true,
      charset: 'utf8mb4',
    },

    replicas: [
      {
        host: process.env.DB_REPLICA_1_HOST || 'localhost',
        port: parseInt(process.env.DB_REPLICA_1_PORT || '3306', 10),
        database: process.env.DB_NAME || 'inspi_ai_prod',
        username: process.env.DB_REPLICA_1_USER || 'readonly',
        password: process.env.DB_REPLICA_1_PASSWORD || '',
        ssl: process.env.DB_SSL === 'true',
        weight: 1,
      },
      {
        host: process.env.DB_REPLICA_2_HOST || 'localhost',
        port: parseInt(process.env.DB_REPLICA_2_PORT || '3306', 10),
        database: process.env.DB_NAME || 'inspi_ai_prod',
        username: process.env.DB_REPLICA_2_USER || 'readonly',
        password: process.env.DB_REPLICA_2_PASSWORD || '',
        ssl: process.env.DB_SSL === 'true',
        weight: 1,
      },
    ],

    pool: {
      min: parseInt(process.env.DB_POOL_MIN || '10', 10),
      max: parseInt(process.env.DB_POOL_MAX || '100', 10),
      idle: parseInt(process.env.DB_POOL_IDLE || '10000', 10),
      acquire: parseInt(process.env.DB_POOL_ACQUIRE || '60000', 10),
      evict: parseInt(process.env.DB_POOL_EVICT || '1000', 10),
      handleDisconnects: true,
    },

    transaction: {
      isolationLevel: 'READ_COMMITTED',
      timeout: parseInt(process.env.DB_TRANSACTION_TIMEOUT || '30000', 10),
      retryLimit: parseInt(process.env.DB_TRANSACTION_RETRY_LIMIT || '3', 10),
    },
  },

  redis: {
    cluster: {
      nodes: [
        {
          host: process.env.REDIS_NODE_1_HOST || 'localhost',
          port: parseInt(process.env.REDIS_NODE_1_PORT || '7001', 10),
        },
        {
          host: process.env.REDIS_NODE_2_HOST || 'localhost',
          port: parseInt(process.env.REDIS_NODE_2_PORT || '7002', 10),
        },
        {
          host: process.env.REDIS_NODE_3_HOST || 'localhost',
          port: parseInt(process.env.REDIS_NODE_3_PORT || '7003', 10),
        },
      ],
      options: {
        enableReadyCheck: true,
        redisOptions: {
          password: process.env.REDIS_PASSWORD || '',
          db: parseInt(process.env.REDIS_DB || '0', 10),
          connectTimeout: parseInt(process.env.REDIS_CONNECT_TIMEOUT || '10000', 10),
          commandTimeout: parseInt(process.env.REDIS_COMMAND_TIMEOUT || '5000', 10),
          retryDelayOnFailover: parseInt(process.env.REDIS_RETRY_DELAY || '100', 10),
          maxRetriesPerRequest: parseInt(process.env.REDIS_MAX_RETRIES || '3', 10),
        },
        clusterRetryDelayOnFailover: 100,
        clusterRetryDelayOnClusterDown: 300,
        clusterMaxRedirections: 6,
        scaleReads: 'slave',
      },
    },

    standalone: {
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379', 10),
      password: process.env.REDIS_PASSWORD || '',
      db: parseInt(process.env.REDIS_DB || '0', 10),
      connectTimeout: parseInt(process.env.REDIS_CONNECT_TIMEOUT || '10000', 10),
      commandTimeout: parseInt(process.env.REDIS_COMMAND_TIMEOUT || '5000', 10),
      retryDelayOnFailover: parseInt(process.env.REDIS_RETRY_DELAY || '100', 10),
      maxRetriesPerRequest: parseInt(process.env.REDIS_MAX_RETRIES || '3', 10),
    },

    sentinel: {
      sentinels: [
        {
          host: process.env.REDIS_SENTINEL_1_HOST || 'localhost',
          port: parseInt(process.env.REDIS_SENTINEL_1_PORT || '26379', 10),
        },
        {
          host: process.env.REDIS_SENTINEL_2_HOST || 'localhost',
          port: parseInt(process.env.REDIS_SENTINEL_2_PORT || '26380', 10),
        },
        {
          host: process.env.REDIS_SENTINEL_3_HOST || 'localhost',
          port: parseInt(process.env.REDIS_SENTINEL_3_PORT || '26381', 10),
        },
      ],
      name: process.env.REDIS_SENTINEL_NAME || 'mymaster',
      password: process.env.REDIS_PASSWORD || '',
      db: parseInt(process.env.REDIS_DB || '0', 10),
      sentinelPassword: process.env.REDIS_SENTINEL_PASSWORD,
    },
  },

  cache: {
    layers: {
      memory: {
        maxSize: parseInt(process.env.CACHE_MEMORY_MAX_SIZE || '512', 10), // MB
        ttl: parseInt(process.env.CACHE_MEMORY_TTL || '300', 10), // 5分钟
        checkPeriod: parseInt(process.env.CACHE_MEMORY_CHECK_PERIOD || '60', 10),
        useClones: false,
      },

      redis: {
        ttl: parseInt(process.env.CACHE_REDIS_TTL || '1800', 10), // 30分钟
        keyPrefix: process.env.CACHE_REDIS_PREFIX || 'inspi:cache:',
        compression: process.env.CACHE_REDIS_COMPRESSION === 'true',
        serialization: (process.env.CACHE_REDIS_SERIALIZATION as 'json' | 'msgpack') || 'json',
      },

      cdn: {
        enabled: process.env.CACHE_CDN_ENABLED === 'true',
        provider: (process.env.CACHE_CDN_PROVIDER as 'cloudflare' | 'aws' | 'aliyun') || 'cloudflare',
        ttl: parseInt(process.env.CACHE_CDN_TTL || '3600', 10), // 1小时
        regions: (process.env.CACHE_CDN_REGIONS || 'us-east-1,eu-west-1,ap-southeast-1').split(','),
      },
    },

    strategies: {
      writeThrough: process.env.CACHE_WRITE_THROUGH === 'true',
      writeBack: process.env.CACHE_WRITE_BACK === 'true',
      refreshAhead: process.env.CACHE_REFRESH_AHEAD === 'true',
      circuitBreaker: {
        enabled: process.env.CACHE_CIRCUIT_BREAKER_ENABLED === 'true',
        threshold: parseInt(process.env.CACHE_CIRCUIT_BREAKER_THRESHOLD || '5', 10),
        timeout: parseInt(process.env.CACHE_CIRCUIT_BREAKER_TIMEOUT || '60000', 10),
      },
    },
  },

  monitoring: {
    metrics: {
      enabled: process.env.MONITORING_METRICS_ENABLED !== 'false',
      interval: parseInt(process.env.MONITORING_METRICS_INTERVAL || '15000', 10),
      retention: parseInt(process.env.MONITORING_METRICS_RETENTION || '30', 10),
      exporters: (process.env.MONITORING_METRICS_EXPORTERS || 'prometheus').split(',') as Array<'prometheus' | 'datadog' | 'newrelic'>,
    },

    logging: {
      level: (process.env.LOG_LEVEL as 'error' | 'warn' | 'info' | 'debug') || 'info',
      format: (process.env.LOG_FORMAT as 'json' | 'text') || 'json',
      destination: (process.env.LOG_DESTINATION as 'console' | 'file' | 'elasticsearch') || 'console',
      rotation: {
        enabled: process.env.LOG_ROTATION_ENABLED === 'true',
        maxSize: process.env.LOG_ROTATION_MAX_SIZE || '100m',
        maxFiles: parseInt(process.env.LOG_ROTATION_MAX_FILES || '10', 10),
        maxAge: process.env.LOG_ROTATION_MAX_AGE || '30d',
      },
    },

    tracing: {
      enabled: process.env.TRACING_ENABLED === 'true',
      sampler: (process.env.TRACING_SAMPLER as 'always' | 'never' | 'probabilistic') || 'probabilistic',
      samplingRate: parseFloat(process.env.TRACING_SAMPLING_RATE || '0.1'),
      jaegerEndpoint: process.env.JAEGER_ENDPOINT,
    },

    healthCheck: {
      enabled: process.env.HEALTH_CHECK_ENABLED !== 'false',
      interval: parseInt(process.env.HEALTH_CHECK_INTERVAL || '30000', 10),
      timeout: parseInt(process.env.HEALTH_CHECK_TIMEOUT || '5000', 10),
      endpoints: (process.env.HEALTH_CHECK_ENDPOINTS || '/health,/ready').split(','),
    },
  },

  security: {
    https: {
      enabled: process.env.HTTPS_ENABLED === 'true',
      cert: process.env.HTTPS_CERT || '',
      key: process.env.HTTPS_KEY || '',
      ca: process.env.HTTPS_CA,
      ciphers: process.env.HTTPS_CIPHERS || 'ECDHE-RSA-AES128-GCM-SHA256:ECDHE-RSA-AES256-GCM-SHA384',
      protocols: (process.env.HTTPS_PROTOCOLS || 'TLSv1.2,TLSv1.3').split(','),
    },

    auth: {
      jwtSecret: process.env.JWT_SECRET || 'your-super-secret-jwt-key',
      jwtExpiry: parseInt(process.env.JWT_EXPIRY || '3600', 10), // 1小时
      refreshTokenExpiry: parseInt(process.env.REFRESH_TOKEN_EXPIRY || '604800', 10), // 7天
      bcryptRounds: parseInt(process.env.BCRYPT_ROUNDS || '12', 10),
    },

    rateLimit: {
      windowMs: parseInt(process.env.RATE_LIMIT_WINDOW || '900000', 10), // 15分钟
      max: parseInt(process.env.RATE_LIMIT_MAX || '100', 10),
      skipSuccessfulRequests: process.env.RATE_LIMIT_SKIP_SUCCESS === 'true',
      skipFailedRequests: process.env.RATE_LIMIT_SKIP_FAILED === 'true',
      keyGenerator: process.env.RATE_LIMIT_KEY_GENERATOR || 'ip',
    },

    cors: {
      origin: (process.env.CORS_ORIGIN || 'https://inspi.ai').split(','),
      methods: (process.env.CORS_METHODS || 'GET,POST,PUT,DELETE,OPTIONS').split(','),
      allowedHeaders: (process.env.CORS_HEADERS || 'Content-Type,Authorization,X-Requested-With').split(','),
      credentials: process.env.CORS_CREDENTIALS === 'true',
    },

    security: {
      contentSecurityPolicy: process.env.CSP || "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'",
      hsts: process.env.HSTS_ENABLED !== 'false',
      noSniff: process.env.NO_SNIFF_ENABLED !== 'false',
      xssFilter: process.env.XSS_FILTER_ENABLED !== 'false',
      referrerPolicy: process.env.REFERRER_POLICY || 'strict-origin-when-cross-origin',
    },
  },

  performance: {
    server: {
      port: parseInt(process.env.PORT || '3000', 10),
      workers: parseInt(process.env.WORKERS || '0', 10), // 0 = CPU核心数
      keepAliveTimeout: parseInt(process.env.KEEP_ALIVE_TIMEOUT || '5000', 10),
      headersTimeout: parseInt(process.env.HEADERS_TIMEOUT || '60000', 10),
      maxHeaderSize: parseInt(process.env.MAX_HEADER_SIZE || '16384', 10),
      bodyLimit: process.env.BODY_LIMIT || '10mb',
    },

    compression: {
      enabled: process.env.COMPRESSION_ENABLED !== 'false',
      level: parseInt(process.env.COMPRESSION_LEVEL || '6', 10),
      threshold: parseInt(process.env.COMPRESSION_THRESHOLD || '1024', 10),
      filter: (process.env.COMPRESSION_FILTER || 'text/*,application/json,application/javascript').split(','),
    },

    static: {
      maxAge: parseInt(process.env.STATIC_MAX_AGE || '31536000', 10), // 1年
      etag: process.env.STATIC_ETAG !== 'false',
      lastModified: process.env.STATIC_LAST_MODIFIED !== 'false',
      immutable: process.env.STATIC_IMMUTABLE === 'true',
    },

    optimization: {
      enableGzip: process.env.ENABLE_GZIP !== 'false',
      enableBrotli: process.env.ENABLE_BROTLI === 'true',
      minifyHtml: process.env.MINIFY_HTML === 'true',
      minifyCss: process.env.MINIFY_CSS === 'true',
      minifyJs: process.env.MINIFY_JS === 'true',
      imageOptimization: process.env.IMAGE_OPTIMIZATION === 'true',
    },
  },
};

/**
 * 获取当前环境配置
 */
export function getConfig(): ProductionConfig {
  return productionConfig;
}

/**
 * 验证配置完整性
 */
export function validateConfig(config: ProductionConfig): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  // 验证数据库配置
  if (!config.database.primary.host) {
    errors.push('Database primary host is required');
  }

  if (!config.database.primary.username) {
    errors.push('Database primary username is required');
  }

  if (!config.database.primary.password) {
    errors.push('Database primary password is required');
  }

  // 验证Redis配置
  if (config.redis.cluster.nodes.length === 0 && !config.redis.standalone.host) {
    errors.push('Redis configuration is required (cluster or standalone)');
  }

  // 验证安全配置
  if (!config.security.auth.jwtSecret || config.security.auth.jwtSecret === 'your-super-secret-jwt-key') {
    errors.push('JWT secret must be set and should not use default value');
  }

  // 验证HTTPS配置
  if (config.security.https.enabled && (!config.security.https.cert || !config.security.https.key)) {
    errors.push('HTTPS certificate and key are required when HTTPS is enabled');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * 获取数据库连接字符串
 */
export function getDatabaseConnectionString(config: DatabaseConfig, useReplica = false): string {
  const dbConfig = useReplica && config.replicas.length > 0
    ? config.replicas[Math.floor(Math.random() * config.replicas.length)]
    : config.primary;

  const protocol = dbConfig.ssl ? 'mysql2' : 'mysql2';
  const sslParam = dbConfig.ssl ? '&ssl=true' : '';

  return `${protocol}://${dbConfig.username}:${dbConfig.password}@${dbConfig.host}:${dbConfig.port}/${dbConfig.database}?charset=utf8mb4${sslParam}`;
}

/**
 * 获取Redis连接配置
 */
export function getRedisConnectionConfig(config: RedisConfig): any {
  // 优先使用集群模式
  if (config.cluster.nodes.length > 0) {
    return {
      type: 'cluster',
      nodes: config.cluster.nodes,
      options: config.cluster.options,
    };
  }

  // 使用哨兵模式
  if (config.sentinel.sentinels.length > 0) {
    return {
      type: 'sentinel',
      sentinels: config.sentinel.sentinels,
      name: config.sentinel.name,
      password: config.sentinel.password,
      db: config.sentinel.db,
      sentinelPassword: config.sentinel.sentinelPassword,
    };
  }

  // 使用单实例模式
  return {
    type: 'standalone',
    ...config.standalone,
  };
}
