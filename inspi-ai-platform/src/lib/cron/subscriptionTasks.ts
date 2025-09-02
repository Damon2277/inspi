/**
 * 订阅系统定时任务
 * 处理每日重置、订阅到期等定时任务
 */

import { SubscriptionService } from '../services/subscriptionService';
import { Usage } from '../models';
import { getRedisClient } from '../redis';

/**
 * 定时任务管理器
 */
export class SubscriptionCronTasks {
  /**
   * 每日使用统计重置
   */
  static async dailyUsageReset(): Promise<void> {
    try {
      console.log('Starting daily usage reset...');
      
      const today = new Date().toISOString().split('T')[0];
      
      // 重置昨天之前的使用统计
      const result = await Usage.updateMany(
        { 
          date: { $lt: today },
          $or: [
            { generations: { $gt: 0 } },
            { reuses: { $gt: 0 } }
          ]
        },
        { 
          $set: { 
            generations: 0, 
            reuses: 0 
          } 
        }
      );
      
      console.log(`Daily usage reset completed. Updated ${result.modifiedCount} records.`);
      
      // 清理相关缓存
      await this.clearUsageCache();
      
    } catch (error) {
      console.error('Daily usage reset failed:', error);
      throw error;
    }
  }

  /**
   * 检查过期订阅
   */
  static async checkExpiredSubscriptions(): Promise<number> {
    try {
      console.log('Checking expired subscriptions...');
      
      const processedCount = await SubscriptionService.processExpiredSubscriptions();
      
      if (processedCount > 0) {
        console.log(`Processed ${processedCount} expired subscriptions`);
      }
      
      return processedCount;
    } catch (error) {
      console.error('Expired subscription check failed:', error);
      throw error;
    }
  }

  /**
   * 清理过期缓存
   */
  static async cleanupExpiredCache(): Promise<void> {
    try {
      console.log('Cleaning up expired cache...');
      
      const redis = getRedisClient();
      
      // 清理过期的使用统计缓存（超过2天的）
      const twoDaysAgo = new Date();
      twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);
      const cutoffDate = twoDaysAgo.toISOString().split('T')[0];
      
      const keys = await redis.keys('usage:*');
      let deletedCount = 0;
      
      for (const key of keys) {
        const parts = key.split(':');
        if (parts.length === 3) {
          const date = parts[2];
          if (date < cutoffDate) {
            await redis.del(key);
            deletedCount++;
          }
        }
      }
      
      console.log(`Cache cleanup completed. Deleted ${deletedCount} expired cache keys`);
      
    } catch (error) {
      console.error('Cache cleanup failed:', error);
      throw error;
    }
  }

  /**
   * 清理使用统计缓存
   */
  private static async clearUsageCache(): Promise<void> {
    try {
      const redis = getRedisClient();
      
      // 清理所有使用统计缓存
      const keys = await redis.keys('usage:*');
      if (keys.length > 0) {
        await redis.del(...keys);
        console.log(`Cleared ${keys.length} usage cache keys`);
      }
      
    } catch (error) {
      console.error('Usage cache cleanup failed:', error);
      throw error;
    }
  }

  /**
   * 执行所有维护任务
   */
  static async runMaintenanceTasks(): Promise<{
    usageReset: boolean;
    expiredSubscriptions: number;
    cacheCleanup: boolean;
  }> {
    const results = {
      usageReset: false,
      expiredSubscriptions: 0,
      cacheCleanup: false
    };

    try {
      // 每日重置
      await this.dailyUsageReset();
      results.usageReset = true;
    } catch (error) {
      console.error('Daily usage reset failed:', error);
    }

    try {
      // 过期订阅检查
      results.expiredSubscriptions = await this.checkExpiredSubscriptions();
    } catch (error) {
      console.error('Expired subscription check failed:', error);
    }

    try {
      // 缓存清理
      await this.cleanupExpiredCache();
      results.cacheCleanup = true;
    } catch (error) {
      console.error('Cache cleanup failed:', error);
    }

    return results;
  }
}

export default SubscriptionCronTasks;