/**
 * 简化的环境配置管理
 * 用于开发环境，避免复杂的验证
 */

// 环境变量类型
export interface Environment {
  NODE_ENV: string;
  PORT: number;
  NEXT_PUBLIC_APP_URL: string;
  NEXT_PUBLIC_API_URL: string;
  MONGODB_URI: string;
  MONGODB_DB_NAME: string;
  REDIS_URL: string;
  REDIS_PASSWORD?: string;
  JWT_SECRET: string;
  JWT_EXPIRES_IN: string;
  REFRESH_TOKEN_SECRET: string;
  REFRESH_TOKEN_EXPIRES_IN: string;
  GOOGLE_CLIENT_ID: string;
  GOOGLE_CLIENT_SECRET: string;
  OAUTH_REDIRECT_URI: string;
  GEMINI_API_KEY: string;
  OPENAI_API_KEY?: string;
  AI_SERVICE_TIMEOUT: number;
  SMTP_HOST: string;
  SMTP_PORT: number;
  SMTP_USER: string;
  SMTP_PASS: string;
  FROM_EMAIL: string;
  FROM_NAME: string;
}

// 获取环境变量，提供默认值
function getEnvVar(key: string, defaultValue?: string): string {
  return process.env[key] || defaultValue || '';
}

function getEnvNumber(key: string, defaultValue: number): number {
  const value = process.env[key];
  return value ? parseInt(value, 10) : defaultValue;
}

// 简化的环境配置
export const env: Environment = {
  NODE_ENV: getEnvVar('NODE_ENV', 'development'),
  PORT: getEnvNumber('PORT', 3000),
  NEXT_PUBLIC_APP_URL: getEnvVar('NEXT_PUBLIC_APP_URL', 'http://localhost:3000'),
  NEXT_PUBLIC_API_URL: getEnvVar('NEXT_PUBLIC_API_URL', 'http://localhost:3000/api'),
  MONGODB_URI: getEnvVar('MONGODB_URI', 'mongodb://localhost:27017/inspi-ai-platform'),
  MONGODB_DB_NAME: getEnvVar('MONGODB_DB_NAME', 'inspi-ai-platform'),
  REDIS_URL: getEnvVar('REDIS_URL', 'redis://localhost:6379'),
  REDIS_PASSWORD: getEnvVar('REDIS_PASSWORD'),
  JWT_SECRET: getEnvVar('JWT_SECRET', 'development-jwt-secret-key-32-chars'),
  JWT_EXPIRES_IN: getEnvVar('JWT_EXPIRES_IN', '7d'),
  REFRESH_TOKEN_SECRET: getEnvVar('REFRESH_TOKEN_SECRET', 'development-refresh-secret-32-chars'),
  REFRESH_TOKEN_EXPIRES_IN: getEnvVar('REFRESH_TOKEN_EXPIRES_IN', '30d'),
  GOOGLE_CLIENT_ID: getEnvVar('GOOGLE_CLIENT_ID', 'development-google-client-id'),
  GOOGLE_CLIENT_SECRET: getEnvVar('GOOGLE_CLIENT_SECRET', 'development-google-client-secret'),
  OAUTH_REDIRECT_URI: getEnvVar('OAUTH_REDIRECT_URI', 'http://localhost:3000/api/auth/callback/google'),
  GEMINI_API_KEY: getEnvVar('GEMINI_API_KEY', 'development-gemini-api-key'),
  OPENAI_API_KEY: getEnvVar('OPENAI_API_KEY'),
  AI_SERVICE_TIMEOUT: getEnvNumber('AI_SERVICE_TIMEOUT', 30000),
  SMTP_HOST: getEnvVar('SMTP_HOST', 'smtp.gmail.com'),
  SMTP_PORT: getEnvNumber('SMTP_PORT', 587),
  SMTP_USER: getEnvVar('SMTP_USER', 'development@example.com'),
  SMTP_PASS: getEnvVar('SMTP_PASS', 'development-password'),
  FROM_EMAIL: getEnvVar('FROM_EMAIL', 'noreply@inspi-ai.com'),
  FROM_NAME: getEnvVar('FROM_NAME', 'Inspi.AI Platform'),
};

// 环境检查函数
export const isDevelopment = env.NODE_ENV === 'development';
export const isProduction = env.NODE_ENV === 'production';
export const isTest = env.NODE_ENV === 'test';

console.log(`✅ Simple environment configuration loaded for ${env.NODE_ENV} environment`);