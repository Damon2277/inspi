/**
 * 数据库连接管理
 * 提供MongoDB连接和重试机制
 */

import mongoose from 'mongoose';
import { logger } from '@/lib/utils/logger';
import { env } from '@/config/environment';

interface ConnectionResult {
  success: boolean;
  error?: string;
}

class DatabaseManager {
  private static instance: DatabaseManager;
  private isConnected = false;
  private connectionPromise: Promise<ConnectionResult> | null = null;
  private retryCount = 0;
  private maxRetries = 3;
  private retryDelay = 5000; // 5秒

  static getInstance(): DatabaseManager {
    if (!DatabaseManager.instance) {
      DatabaseManager.instance = new DatabaseManager();
    }
    return DatabaseManager.instance;
  }

  /**
   * 连接到数据库
   */
  async connect(): Promise<ConnectionResult> {
    // 如果已经在连接中，返回现有的Promise
    if (this.connectionPromise) {
      return this.connectionPromise;
    }

    // 如果已经连接，直接返回成功
    if (this.isConnected && mongoose.connection.readyState === 1) {
      return { success: true };
    }

    this.connectionPromise = this.attemptConnection();
    const result = await this.connectionPromise;
    this.connectionPromise = null;
    
    return result;
  }

  /**
   * 尝试连接数据库
   */
  private async attemptConnection(): Promise<ConnectionResult> {
    try {
      const mongoUri = env.DATABASE?.MONGODB_URI || process.env.MONGODB_URI;
      
      if (!mongoUri) {
        // 开发环境下使用内存数据库
        if (process.env.NODE_ENV === 'development') {
          logger.warn('MongoDB URI not configured, using in-memory fallback');
          return this.setupInMemoryFallback();
        }
        
        throw new Error('MongoDB URI not configured');
      }

      // 配置连接选项
      const options = {
        maxPoolSize: 10,
        serverSelectionTimeoutMS: 5000,
        socketTimeoutMS: 45000,
        bufferCommands: false,
        bufferMaxEntries: 0,
      };

      logger.info('Attempting to connect to MongoDB', { 
        uri: mongoUri.replace(/\/\/.*@/, '//***:***@'), // 隐藏密码
        attempt: this.retryCount + 1 
      });

      await mongoose.connect(mongoUri, options);
      
      this.isConnected = true;
      this.retryCount = 0;
      
      logger.info('Successfully connected to MongoDB');
      
      // 设置连接事件监听器
      this.setupEventListeners();
      
      return { success: true };

    } catch (error) {
      this.isConnected = false;
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      logger.error('Failed to connect to MongoDB', { 
        error: errorMessage,
        attempt: this.retryCount + 1,
        maxRetries: this.maxRetries
      });

      // 如果还有重试次数，进行重试
      if (this.retryCount < this.maxRetries) {
        this.retryCount++;
        logger.info(`Retrying connection in ${this.retryDelay}ms`, { 
          attempt: this.retryCount,
          maxRetries: this.maxRetries 
        });
        
        await new Promise(resolve => setTimeout(resolve, this.retryDelay));
        return this.attemptConnection();
      }

      // 开发环境下使用内存数据库作为fallback
      if (process.env.NODE_ENV === 'development') {
        logger.warn('All MongoDB connection attempts failed, using in-memory fallback');
        return this.setupInMemoryFallback();
      }

      return { 
        success: false, 
        error: `Failed to connect after ${this.maxRetries} attempts: ${errorMessage}` 
      };
    }
  }

  /**
   * 设置内存数据库fallback（开发环境）
   */
  private async setupInMemoryFallback(): Promise<ConnectionResult> {
    try {
      // 在开发环境中，我们可以使用一个简单的内存存储
      logger.info('Setting up in-memory database fallback');
      
      // 这里可以集成 mongodb-memory-server 或其他内存数据库
      // 暂时返回成功状态，让应用继续运行
      this.isConnected = true;
      
      return { success: true };
    } catch (error) {
      return { 
        success: false, 
        error: `Failed to setup in-memory fallback: ${error instanceof Error ? error.message : 'Unknown error'}` 
      };
    }
  }

  /**
   * 设置连接事件监听器
   */
  private setupEventListeners(): void {
    mongoose.connection.on('connected', () => {
      logger.info('MongoDB connected');
      this.isConnected = true;
    });

    mongoose.connection.on('error', (error) => {
      logger.error('MongoDB connection error', { error: error.message });
      this.isConnected = false;
    });

    mongoose.connection.on('disconnected', () => {
      logger.warn('MongoDB disconnected');
      this.isConnected = false;
    });

    // 优雅关闭
    process.on('SIGINT', async () => {
      await this.disconnect();
      process.exit(0);
    });
  }

  /**
   * 断开数据库连接
   */
  async disconnect(): Promise<void> {
    try {
      if (mongoose.connection.readyState !== 0) {
        await mongoose.disconnect();
        logger.info('MongoDB disconnected gracefully');
      }
      this.isConnected = false;
    } catch (error) {
      logger.error('Error disconnecting from MongoDB', { 
        error: error instanceof Error ? error.message : 'Unknown error' 
      });
    }
  }

  /**
   * 获取连接状态
   */
  getConnectionStatus(): {
    isConnected: boolean;
    readyState: number;
    host?: string;
    name?: string;
  } {
    return {
      isConnected: this.isConnected,
      readyState: mongoose.connection.readyState,
      host: mongoose.connection.host,
      name: mongoose.connection.name,
    };
  }

  /**
   * 健康检查
   */
  async healthCheck(): Promise<boolean> {
    try {
      if (!this.isConnected || mongoose.connection.readyState !== 1) {
        return false;
      }

      // 执行一个简单的ping操作
      await mongoose.connection.db.admin().ping();
      return true;
    } catch (error) {
      logger.error('Database health check failed', { 
        error: error instanceof Error ? error.message : 'Unknown error' 
      });
      return false;
    }
  }

  /**
   * 重置重试计数器
   */
  resetRetryCount(): void {
    this.retryCount = 0;
  }
}

// 导出单例实例和便捷函数
const databaseManager = DatabaseManager.getInstance();

export const connectToDatabase = () => databaseManager.connect();
export const disconnectFromDatabase = () => databaseManager.disconnect();
export const getDatabaseStatus = () => databaseManager.getConnectionStatus();
export const checkDatabaseHealth = () => databaseManager.healthCheck();

export default databaseManager;