import mongoose from 'mongoose';
import { RedisClientType } from 'redis';

declare global {
  var mongoose: {
    conn: typeof import('mongoose') | null;
    promise: Promise<typeof import('mongoose')> | null;
  };
  
  var redis: {
    conn: RedisClientType | null;
    promise: Promise<RedisClientType> | null;
  };

  namespace NodeJS {
    interface ProcessEnv {
      MONGODB_URI: string;
      REDIS_URL: string;
      NEXTAUTH_SECRET: string;
      NEXTAUTH_URL: string;
      GOOGLE_CLIENT_ID: string;
      GOOGLE_CLIENT_SECRET: string;
      GEMINI_API_KEY: string;
      SMTP_HOST: string;
      SMTP_PORT: string;
      SMTP_USER: string;
      SMTP_PASS: string;
      NODE_ENV: 'development' | 'production' | 'test';
    }
  }
}

export {};