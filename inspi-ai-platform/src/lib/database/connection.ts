/**
 * 数据库连接管理
 * 统一的数据库连接接口
 */

import connectDB, { getConnectionStatus, disconnectDB } from '../mongodb';

/**
 * 连接到数据库
 * 这是一个统一的接口，用于连接到MongoDB
 */
export async function connectToDatabase() {
  try {
    const connection = await connectDB();
    return {
      success: true,
      connection,
      status: getConnectionStatus()
    };
  } catch (error) {
    console.error('Database connection failed:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      connection: null,
      status: getConnectionStatus()
    };
  }
}

/**
 * 断开数据库连接
 */
export async function disconnectFromDatabase() {
  try {
    await disconnectDB();
    return { success: true };
  } catch (error) {
    console.error('Database disconnection failed:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * 检查数据库连接状态
 */
export function getDatabaseStatus() {
  return getConnectionStatus();
}

/**
 * 测试数据库连接
 */
export async function testDatabaseConnection() {
  try {
    const result = await connectToDatabase();
    if (result.success) {
      return {
        status: 'healthy',
        message: 'Database connection successful',
        details: result.status
      };
    } else {
      return {
        status: 'unhealthy',
        message: 'Database connection failed',
        error: result.error
      };
    }
  } catch (error) {
    return {
      status: 'unhealthy',
      message: 'Database connection test failed',
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}