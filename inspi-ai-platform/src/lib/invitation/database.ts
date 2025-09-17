/**
 * 邀请系统数据库连接和操作
 */

import { CREATE_TABLES_SQL } from './models'
import { logger } from '../utils/logger'

// 数据库连接配置
export interface DatabaseConfig {
  host: string
  port: number
  database: string
  username: string
  password: string
  connectionLimit?: number
  acquireTimeout?: number
  timeout?: number
}

// 数据库连接池接口
export interface DatabasePool {
  query<T = any>(sql: string, params?: any[]): Promise<T[]>
  execute(sql: string, params?: any[]): Promise<{ affectedRows: number; insertId?: number }>
  transaction<T>(callback: (connection: DatabaseConnection) => Promise<T>): Promise<T>
  close(): Promise<void>
}

// 数据库连接接口
export interface DatabaseConnection {
  query<T = any>(sql: string, params?: any[]): Promise<T[]>
  execute(sql: string, params?: any[]): Promise<{ affectedRows: number; insertId?: number }>
  commit(): Promise<void>
  rollback(): Promise<void>
}

// 简化的数据库实现（用于开发和测试）
export class SimpleDatabasePool implements DatabasePool {
  private config: DatabaseConfig
  private isInitialized = false

  constructor(config: DatabaseConfig) {
    this.config = config
  }

  async initialize(): Promise<void> {
    if (this.isInitialized) return

    try {
      // 创建数据库表
      await this.createTables()
      this.isInitialized = true
      logger.info('Database initialized successfully')
    } catch (error) {
      logger.error('Failed to initialize database:', error)
      throw error
    }
  }

  private async createTables(): Promise<void> {
    const tables = Object.entries(CREATE_TABLES_SQL)
    
    for (const [tableName, sql] of tables) {
      try {
        await this.execute(sql)
        logger.info(`Table ${tableName} created successfully`)
      } catch (error) {
        logger.error(`Failed to create table ${tableName}:`, error)
        throw error
      }
    }
  }

  async query<T = any>(sql: string, params?: any[]): Promise<T[]> {
    try {
      // 这里应该是实际的数据库查询实现
      // 为了演示，我们返回空数组
      logger.debug('Executing query:', { sql, params })
      return [] as T[]
    } catch (error) {
      logger.error('Query failed:', { sql, params, error })
      throw error
    }
  }

  async execute(sql: string, params?: any[]): Promise<{ affectedRows: number; insertId?: number }> {
    try {
      // 这里应该是实际的数据库执行实现
      logger.debug('Executing statement:', { sql, params })
      return { affectedRows: 1, insertId: 1 }
    } catch (error) {
      logger.error('Execute failed:', { sql, params, error })
      throw error
    }
  }

  async transaction<T>(callback: (connection: DatabaseConnection) => Promise<T>): Promise<T> {
    const connection = new SimpleConnection()
    
    try {
      const result = await callback(connection)
      await connection.commit()
      return result
    } catch (error) {
      await connection.rollback()
      throw error
    }
  }

  async close(): Promise<void> {
    logger.info('Database connection closed')
  }
}

// 简化的数据库连接实现
class SimpleConnection implements DatabaseConnection {
  async query<T = any>(sql: string, params?: any[]): Promise<T[]> {
    logger.debug('Transaction query:', { sql, params })
    return [] as T[]
  }

  async execute(sql: string, params?: any[]): Promise<{ affectedRows: number; insertId?: number }> {
    logger.debug('Transaction execute:', { sql, params })
    return { affectedRows: 1, insertId: 1 }
  }

  async commit(): Promise<void> {
    logger.debug('Transaction committed')
  }

  async rollback(): Promise<void> {
    logger.debug('Transaction rolled back')
  }
}

// 数据库工厂
export class DatabaseFactory {
  private static instance: DatabasePool | null = null

  static async createPool(config: DatabaseConfig): Promise<DatabasePool> {
    if (!this.instance) {
      this.instance = new SimpleDatabasePool(config)
      await (this.instance as SimpleDatabasePool).initialize()
    }
    return this.instance
  }

  static getInstance(): DatabasePool {
    if (!this.instance) {
      throw new Error('Database pool not initialized. Call createPool first.')
    }
    return this.instance
  }

  static async closePool(): Promise<void> {
    if (this.instance) {
      await this.instance.close()
      this.instance = null
    }
  }
}

// 数据库配置从环境变量获取
export function getDatabaseConfig(): DatabaseConfig {
  return {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '3306'),
    database: process.env.DB_NAME || 'inspi_ai',
    username: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    connectionLimit: parseInt(process.env.DB_CONNECTION_LIMIT || '10'),
    acquireTimeout: parseInt(process.env.DB_ACQUIRE_TIMEOUT || '60000'),
    timeout: parseInt(process.env.DB_TIMEOUT || '60000')
  }
}

// 数据库初始化函数
export async function initializeDatabase(): Promise<DatabasePool> {
  const config = getDatabaseConfig()
  return await DatabaseFactory.createPool(config)
}