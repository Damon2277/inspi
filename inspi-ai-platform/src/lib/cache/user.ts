/**
 * 用户数据缓存实现
 */
import { logger } from '@/lib/logging/logger';
import { CacheManager } from './manager';
import { UserCacheStrategy } from './strategies';
import { CacheKeyGenerator, CacheKeyPrefix } from './config';
import { Cache, CacheEvict, CacheUtils } from './utils';

/**
 * 用户缓存接口
 */
export interface UserCacheData {
  id: string;
  email: string;
  name: string;
  avatar?: string;
  subscription: {
    type: 'free' | 'pro' | 'super';
    expiresAt?: Date;
    features: string[];
  };
  preferences: {
    language: string;
    theme: 'light' | 'dark';
    notifications: boolean;
    privacy: {
      profileVisible: boolean;
      worksVisible: boolean;
    };
  };
  stats: {
    worksCount: number;
    contributionScore: number;
    reusedCount: number;
    lastActiveAt: Date;
  };
  createdAt: Date;
  updatedAt: Date;
}

/**
 * 用户订阅信息
 */
export interface UserSubscription {
  userId: string;
  type: 'free' | 'pro' | 'super';
  status: 'active' | 'expired' | 'cancelled';
  startDate: Date;
  endDate?: Date;
  features: string[];
  limits: {
    dailyGenerations: number;
    maxWorks: number;
    maxReuses: number;
  };
  usage: {
    dailyGenerations: number;
    totalWorks: number;
    totalReuses: number;
    lastResetAt: Date;
  };
}

/**
 * 用户偏好设置
 */
export interface UserPreferences {
  userId: string;
  language: string;
  theme: 'light' | 'dark' | 'auto';
  notifications: {
    email: boolean;
    push: boolean;
    workUpdates: boolean;
    systemUpdates: boolean;
  };
  privacy: {
    profileVisible: boolean;
    worksVisible: boolean;
    allowReuse: boolean;
    showInRanking: boolean;
  };
  display: {
    worksPerPage: number;
    defaultView: 'grid' | 'list';
    showTutorials: boolean;
  };
  updatedAt: Date;
}

/**
 * 用户缓存服务
 */
export class UserCacheService {
  private cacheManager: CacheManager;
  private strategy: UserCacheStrategy;

  constructor(cacheManager: CacheManager) {
    this.cacheManager = cacheManager;
    this.strategy = new UserCacheStrategy(cacheManager);
  }

  /**
   * 获取用户完整信息
   */
  @Cache({ ttl: 3600, prefix: 'user:full' })
  async getUserFullInfo(userId: string): Promise<UserCacheData | null> {
    try {
      // 尝试从缓存获取
      const cached = await this.strategy.getUserInfo(userId);
      if (cached) {
        return cached;
      }

      // 缓存未命中，从数据库获取
      const userInfo = await this.fetchUserFromDatabase(userId);
      if (userInfo) {
        await this.strategy.setUserInfo(userId, userInfo);
      }

      return userInfo;
    } catch (error) {
      logger.error('Failed to get user full info', error instanceof Error ? error : new Error(String(error)), { userId });
      return null;
    }
  }

  /**
   * 获取用户基本信息
   */
  @Cache({ ttl: 1800, prefix: 'user:basic' })
  async getUserBasicInfo(userId: string): Promise<Partial<UserCacheData> | null> {
    try {
      const fullInfo = await this.getUserFullInfo(userId);
      if (!fullInfo) return null;

      // 返回基本信息
      return {
        id: fullInfo.id,
        name: fullInfo.name,
        avatar: fullInfo.avatar,
        stats: fullInfo.stats
      };
    } catch (error) {
      logger.error('Failed to get user basic info', error instanceof Error ? error : new Error(String(error)), { userId });
      return null;
    }
  }

  /**
   * 获取用户订阅信息
   */
  @Cache({ ttl: 1800, prefix: 'user:subscription' })
  async getUserSubscription(userId: string): Promise<UserSubscription | null> {
    try {
      // 尝试从缓存获取
      const cached = await this.strategy.getUserSubscription(userId);
      if (cached) {
        return cached;
      }

      // 从数据库获取
      const subscription = await this.fetchUserSubscriptionFromDatabase(userId);
      if (subscription) {
        await this.strategy.setUserSubscription(userId, subscription);
      }

      return subscription;
    } catch (error) {
      logger.error('Failed to get user subscription', error instanceof Error ? error : new Error(String(error)), { userId });
      return null;
    }
  }

  /**
   * 获取用户偏好设置
   */
  @Cache({ ttl: 3600, prefix: 'user:preferences' })
  async getUserPreferences(userId: string): Promise<UserPreferences | null> {
    try {
      // 尝试从缓存获取
      const cached = await this.strategy.getUserPreferences(userId);
      if (cached) {
        return cached;
      }

      // 从数据库获取
      const preferences = await this.fetchUserPreferencesFromDatabase(userId);
      if (preferences) {
        await this.strategy.setUserPreferences(userId, preferences);
      }

      return preferences;
    } catch (error) {
      logger.error('Failed to get user preferences', error instanceof Error ? error : new Error(String(error)), { userId });
      return null;
    }
  }

  /**
   * 更新用户信息
   */
  @CacheEvict(['user:full:*', 'user:basic:*'])
  async updateUserInfo(userId: string, updates: Partial<UserCacheData>): Promise<boolean> {
    try {
      // 更新数据库
      const success = await this.updateUserInDatabase(userId, updates);
      
      if (success) {
        // 失效相关缓存
        await this.invalidateUserCache(userId);
        
        // 预热新数据
        await this.getUserFullInfo(userId);
      }

      return success;
    } catch (error) {
      logger.error('Failed to update user info', error instanceof Error ? error : new Error(String(error)), { userId, updates });
      return false;
    }
  }

  /**
   * 更新用户订阅
   */
  @CacheEvict(['user:subscription:*', 'user:full:*'])
  async updateUserSubscription(userId: string, subscription: Partial<UserSubscription>): Promise<boolean> {
    try {
      // 更新数据库
      const success = await this.updateUserSubscriptionInDatabase(userId, subscription);
      
      if (success) {
        // 失效订阅缓存
        await this.strategy.delete(`${userId}:subscription`);
        
        // 预热新数据
        await this.getUserSubscription(userId);
      }

      return success;
    } catch (error) {
      logger.error('Failed to update user subscription', error instanceof Error ? error : new Error(String(error)), { userId, subscription });
      return false;
    }
  }

  /**
   * 更新用户偏好设置
   */
  @CacheEvict(['user:preferences:*'])
  async updateUserPreferences(userId: string, preferences: Partial<UserPreferences>): Promise<boolean> {
    try {
      // 更新数据库
      const success = await this.updateUserPreferencesInDatabase(userId, preferences);
      
      if (success) {
        // 失效偏好设置缓存
        await this.strategy.delete(`${userId}:preferences`);
        
        // 预热新数据
        await this.getUserPreferences(userId);
      }

      return success;
    } catch (error) {
      logger.error('Failed to update user preferences', error instanceof Error ? error : new Error(String(error)), { userId, preferences });
      return false;
    }
  }

  /**
   * 检查用户是否存在
   */
  @Cache({ ttl: 600, prefix: 'user:exists' })
  async userExists(userId: string): Promise<boolean> {
    try {
      const userInfo = await this.getUserBasicInfo(userId);
      return userInfo !== null;
    } catch (error) {
      logger.error('Failed to check user existence', error instanceof Error ? error : new Error(String(error)), { userId });
      return false;
    }
  }

  /**
   * 获取用户使用限制
   */
  @Cache({ ttl: 300, prefix: 'user:limits' })
  async getUserLimits(userId: string): Promise<UserSubscription['limits'] | null> {
    try {
      const subscription = await this.getUserSubscription(userId);
      return subscription?.limits || null;
    } catch (error) {
      logger.error('Failed to get user limits', error instanceof Error ? error : new Error(String(error)), { userId });
      return null;
    }
  }

  /**
   * 获取用户当前使用情况
   */
  @Cache({ ttl: 60, prefix: 'user:usage' })
  async getUserUsage(userId: string): Promise<UserSubscription['usage'] | null> {
    try {
      const subscription = await this.getUserSubscription(userId);
      return subscription?.usage || null;
    } catch (error) {
      logger.error('Failed to get user usage', error instanceof Error ? error : new Error(String(error)), { userId });
      return null;
    }
  }

  /**
   * 批量获取用户基本信息
   */
  async getBatchUserBasicInfo(userIds: string[]): Promise<Map<string, Partial<UserCacheData>>> {
    const result = new Map<string, Partial<UserCacheData>>();
    
    // 并发获取用户信息
    const promises = userIds.map(async (userId) => {
      try {
        const userInfo = await this.getUserBasicInfo(userId);
        if (userInfo) {
          result.set(userId, userInfo);
        }
      } catch (error) {
        logger.error('Failed to get user info in batch', error instanceof Error ? error : new Error(String(error)), { userId });
      }
    });

    await Promise.all(promises);
    return result;
  }

  /**
   * 失效用户缓存
   */
  async invalidateUserCache(userId: string): Promise<void> {
    try {
      await this.strategy.invalidate([userId]);
      logger.info('User cache invalidated', { userId });
    } catch (error) {
      logger.error('Failed to invalidate user cache', error instanceof Error ? error : new Error(String(error)), { userId });
    }
  }

  /**
   * 预热用户缓存
   */
  async warmupUserCache(userId: string): Promise<void> {
    try {
      // 预热用户基本信息
      await this.getUserFullInfo(userId);
      
      // 预热订阅信息
      await this.getUserSubscription(userId);
      
      // 预热偏好设置
      await this.getUserPreferences(userId);
      
      logger.info('User cache warmed up', { userId });
    } catch (error) {
      logger.error('Failed to warmup user cache', error instanceof Error ? error : new Error(String(error)), { userId });
    }
  }

  /**
   * 从数据库获取用户信息
   */
  private async fetchUserFromDatabase(userId: string): Promise<UserCacheData | null> {
    // 这里应该实现实际的数据库查询
    // 暂时返回模拟数据
    return null;
  }

  /**
   * 从数据库获取用户订阅信息
   */
  private async fetchUserSubscriptionFromDatabase(userId: string): Promise<UserSubscription | null> {
    // 这里应该实现实际的数据库查询
    return null;
  }

  /**
   * 从数据库获取用户偏好设置
   */
  private async fetchUserPreferencesFromDatabase(userId: string): Promise<UserPreferences | null> {
    // 这里应该实现实际的数据库查询
    return null;
  }

  /**
   * 更新数据库中的用户信息
   */
  private async updateUserInDatabase(userId: string, updates: Partial<UserCacheData>): Promise<boolean> {
    // 这里应该实现实际的数据库更新
    return true;
  }

  /**
   * 更新数据库中的用户订阅信息
   */
  private async updateUserSubscriptionInDatabase(userId: string, subscription: Partial<UserSubscription>): Promise<boolean> {
    // 这里应该实现实际的数据库更新
    return true;
  }

  /**
   * 更新数据库中的用户偏好设置
   */
  private async updateUserPreferencesInDatabase(userId: string, preferences: Partial<UserPreferences>): Promise<boolean> {
    // 这里应该实现实际的数据库更新
    return true;
  }
}

/**
 * 用户缓存工具函数
 */
export class UserCacheUtils {
  /**
   * 生成用户缓存键
   */
  static generateUserKey(userId: string, suffix?: string): string {
    return CacheKeyGenerator.user(userId, suffix);
  }

  /**
   * 检查用户数据是否需要刷新
   */
  static shouldRefreshUserData(lastUpdated: Date, maxAge: number = 3600000): boolean {
    return Date.now() - lastUpdated.getTime() > maxAge;
  }

  /**
   * 计算用户缓存优先级
   */
  static calculateCachePriority(user: UserCacheData): number {
    let priority = 0;
    
    // 基于订阅类型
    switch (user.subscription.type) {
      case 'super':
        priority += 100;
        break;
      case 'pro':
        priority += 50;
        break;
      case 'free':
        priority += 10;
        break;
    }
    
    // 基于活跃度
    const daysSinceLastActive = (Date.now() - user.stats.lastActiveAt.getTime()) / (1000 * 60 * 60 * 24);
    if (daysSinceLastActive < 1) {
      priority += 50;
    } else if (daysSinceLastActive < 7) {
      priority += 20;
    } else if (daysSinceLastActive < 30) {
      priority += 5;
    }
    
    // 基于贡献度
    priority += Math.min(user.stats.contributionScore / 100, 50);
    
    return priority;
  }

  /**
   * 序列化用户数据用于缓存
   */
  static serializeUserData(user: UserCacheData): string {
    try {
      return JSON.stringify({
        ...user,
        createdAt: user.createdAt.toISOString(),
        updatedAt: user.updatedAt.toISOString(),
        stats: {
          ...user.stats,
          lastActiveAt: user.stats.lastActiveAt.toISOString()
        }
      });
    } catch (error) {
      logger.error('Failed to serialize user data', error instanceof Error ? error : new Error(String(error)));
      throw error;
    }
  }

  /**
   * 反序列化用户数据
   */
  static deserializeUserData(data: string): UserCacheData {
    try {
      const parsed = JSON.parse(data);
      return {
        ...parsed,
        createdAt: new Date(parsed.createdAt),
        updatedAt: new Date(parsed.updatedAt),
        stats: {
          ...parsed.stats,
          lastActiveAt: new Date(parsed.stats.lastActiveAt)
        }
      };
    } catch (error) {
      logger.error('Failed to deserialize user data', error instanceof Error ? error : new Error(String(error)));
      throw error;
    }
  }
}

export default UserCacheService;