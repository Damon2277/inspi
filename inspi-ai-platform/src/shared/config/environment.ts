/**
 * 环境配置管理
 * 统一管理所有环境变量和配置
 */

export const env = {
  // 应用基础配置
  NODE_ENV: process.env.NODE_ENV || 'development',
  APP_URL: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
  API_URL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api',

  // 数据库配置
  DATABASE: {
    MONGODB_URI: process.env.MONGODB_URI || 'mongodb://localhost:27017/inspi-ai-platform',
    MONGODB_DB_NAME: process.env.MONGODB_DB_NAME || 'inspi-ai-platform',
    MAX_POOL_SIZE: parseInt(process.env.DB_MAX_POOL_SIZE || '10', 10),
    SERVER_SELECTION_TIMEOUT: parseInt(process.env.DB_SERVER_SELECTION_TIMEOUT || '5000', 10),
    SOCKET_TIMEOUT: parseInt(process.env.DB_SOCKET_TIMEOUT || '45000', 10),
  },

  // Redis配置
  REDIS: {
    URL: process.env.REDIS_URL || 'redis://localhost:6379',
    PASSWORD: process.env.REDIS_PASSWORD || '',
    MAX_RETRIES: parseInt(process.env.REDIS_MAX_RETRIES || '3', 10),
    RETRY_DELAY: parseInt(process.env.REDIS_RETRY_DELAY || '1000', 10),
  },

  // JWT配置
  JWT_SECRET: process.env.JWT_SECRET || 'your-super-secret-jwt-key-here',
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '7d',
  REFRESH_TOKEN_SECRET: process.env.REFRESH_TOKEN_SECRET || 'your-refresh-token-secret-here',
  REFRESH_TOKEN_EXPIRES_IN: process.env.REFRESH_TOKEN_EXPIRES_IN || '30d',

  // AI服务配置
  AI: {
    GEMINI_API_KEY: process.env.GEMINI_API_KEY || '',
    OPENAI_API_KEY: process.env.OPENAI_API_KEY || '',
    DEEPSEEK_API_KEY: process.env.DEEPSEEK_API_KEY || '',
    PROVIDER: process.env.AI_PROVIDER || 'gemini',
    DEEPSEEK_MODEL: process.env.DEEPSEEK_MODEL || 'deepseek-chat',
    DEEPSEEK_BASE_URL: process.env.DEEPSEEK_BASE_URL || 'https://api.deepseek.com',
    SERVICE_TIMEOUT: parseInt(process.env.AI_SERVICE_TIMEOUT || '60000', 10),
    MAX_RETRIES: 3,
    RETRY_DELAY: 1000,
    DEFAULT_MODEL: 'gemini-1.5-flash',
    FALLBACK_MODEL: 'gpt-3.5-turbo',
    IMAGE_PROVIDER: process.env.AI_IMAGE_PROVIDER || 'none',
    IMAGE_API_KEY: process.env.AI_IMAGE_API_KEY || '',
    IMAGE_BASE_URL: process.env.AI_IMAGE_BASE_URL || '',
    IMAGE_MODEL: process.env.AI_IMAGE_MODEL || 'dall-e-3',
    IMAGE_DEFAULT_SIZE: process.env.AI_IMAGE_DEFAULT_SIZE || '1024x1024',
    IMAGE_ENABLE_CACHE: process.env.AI_IMAGE_ENABLE_CACHE !== 'false',
    IMAGE_STAGE_SIZE: process.env.AI_IMAGE_STAGE_SIZE || '512x512',
    IMAGE_API_KEY_HEADER: process.env.AI_IMAGE_API_KEY_HEADER || 'Authorization',
    IMAGE_RESPONSE_FORMAT: (process.env.AI_IMAGE_RESPONSE_FORMAT || 'b64_json').toLowerCase(),
    IMAGE_WATERMARK: process.env.AI_IMAGE_WATERMARK === undefined
      ? true
      : process.env.AI_IMAGE_WATERMARK === 'true',
  },

  // 邮件服务配置
  EMAIL: {
    SMTP_HOST: process.env.SMTP_HOST || 'smtp.gmail.com',
    SMTP_PORT: parseInt(process.env.SMTP_PORT || '587', 10),
    SMTP_USER: process.env.SMTP_USER || '',
    SMTP_PASS: process.env.SMTP_PASS || '',
    FROM_EMAIL: process.env.FROM_EMAIL || 'noreply@inspi-ai.com',
    FROM_NAME: process.env.FROM_NAME || 'Inspi.AI Platform',
  },

  // 功能开关
  FEATURES: {
    AI_GENERATION: process.env.FEATURE_AI_GENERATION === 'true',
    KNOWLEDGE_GRAPH: process.env.FEATURE_KNOWLEDGE_GRAPH === 'true',
    SOCIAL_FEATURES: process.env.FEATURE_SOCIAL_FEATURES === 'true',
    SUBSCRIPTION: process.env.FEATURE_SUBSCRIPTION === 'true',
    ANALYTICS: process.env.FEATURE_ANALYTICS === 'true',
  },

  // 限流配置
  RATE_LIMIT: {
    WINDOW: parseInt(process.env.RATE_LIMIT_WINDOW || '900000', 10), // 15分钟
    MAX_REQUESTS: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100', 10),
    SKIP_SUCCESSFUL: process.env.RATE_LIMIT_SKIP_SUCCESSFUL_REQUESTS === 'true',
  },

  // 缓存配置
  CACHE: {
    TTL: parseInt(process.env.CACHE_TTL || '3600', 10), // 1小时
    MAX_SIZE: parseInt(process.env.CACHE_MAX_SIZE || '100', 10),
  },

  // 安全配置
  SECURITY: {
    CORS_ORIGIN: process.env.CORS_ORIGIN || 'http://localhost:3000',
    CSRF_SECRET: process.env.CSRF_SECRET || 'your-csrf-secret',
    SESSION_SECRET: process.env.SESSION_SECRET || 'your-session-secret',
    ENCRYPTION_KEY: process.env.ENCRYPTION_KEY || 'your-32-character-encryption-key',
  },

  // 日志配置
  LOG: {
    LEVEL: process.env.LOG_LEVEL || 'info',
    SENTRY_DSN: process.env.SENTRY_DSN || '',
  },

  // 管理后台配置
  ADMIN_PANEL: {
    ENABLED: process.env.ADMIN_PANEL_ENABLED !== 'false',
    EMAIL: process.env.ADMIN_PANEL_EMAIL || 'admin@inspi.local',
    PASSWORD: process.env.ADMIN_PANEL_PASSWORD || 'change-me-now',
    NAME: process.env.ADMIN_PANEL_NAME || '系统管理员',
    SESSION_MINUTES: parseInt(process.env.ADMIN_PANEL_SESSION_MINUTES || '720', 10),
  },
} as const;

// 验证必需的环境变量
export function validateEnvironment() {
  const requiredVars = [
    'DATABASE.MONGODB_URI',
    'JWT_SECRET',
  ];

  // 在生产环境中需要的变量
  const productionRequiredVars = [
    'EMAIL.SMTP_HOST',
    'EMAIL.SMTP_USER',
  ];

  const configuredProvider = (env.AI.PROVIDER || 'gemini').toLowerCase();
  if (configuredProvider === 'deepseek') {
    productionRequiredVars.push('AI.DEEPSEEK_API_KEY');
  } else if (configuredProvider === 'gemini') {
    productionRequiredVars.push('AI.GEMINI_API_KEY');
  } else if (!env.AI.GEMINI_API_KEY && !env.AI.DEEPSEEK_API_KEY) {
    productionRequiredVars.push('AI.GEMINI_API_KEY or AI.DEEPSEEK_API_KEY');
  }

  const missing = requiredVars.filter(varName => {
    const keys = varName.split('.');
    let value: any = env;
    for (const key of keys) {
      value = value?.[key];
    }
    return !value;
  });

  // 在生产环境中检查额外的变量
  if (isProduction) {
    const productionMissing = productionRequiredVars.filter(varName => {
      const keys = varName.split('.');
      let value: any = env;
      for (const key of keys) {
        value = value?.[key];
      }
      return !value;
    });
    missing.push(...productionMissing);
  }

  if (missing.length > 0) {
    if (isDevelopment) {
      console.warn(`Missing environment variables (will use defaults): ${missing.join(', ')}`);
    } else {
      throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
    }
  }
}

// 开发环境检查
export const isDevelopment = env.NODE_ENV === 'development';
export const isProduction = env.NODE_ENV === 'production';
export const isTest = env.NODE_ENV === 'test';
