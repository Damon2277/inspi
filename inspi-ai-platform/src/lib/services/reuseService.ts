/**
 * 复用和致敬系统服务层
 */

import { ObjectId } from 'mongodb';

import User, { UserDocument } from '@/lib/models/User';
import { IWork, getWorkAuthorId } from '@/lib/models/Work';
import {
  ReuseRequest,
  ReuseResponse,
  ReusePermissionCheck,
  ReusePermission,
  Attribution,
  ReuseRecord,
  UserReuseQuota,
  ReuseLimits,
  WorkReuseInfo,
  ReuseStats,
} from '@/shared/types/reuse';
import { handleServiceError } from '@/shared/utils/standardErrorHandler';

import workService from './workService';


// 默认复用限制配置
const DEFAULT_REUSE_LIMITS: ReuseLimits = {
  dailyLimit: 10,
  monthlyLimit: 100,
  totalLimit: 1000,
  cooldownPeriod: 24, // 24小时冷却期
};

class ReuseService {
  /**
   * 检查用户复用权限
   */
  async checkReusePermission(
    userId: string,
    workId: string,
  ): Promise<ReusePermissionCheck> {
    try {
      // 1. 检查作品是否存在
      const work = await workService.getWorkById(workId);
      if (!work) {
        return {
          permission: 'denied',
          reason: '作品不存在',
          canReuse: false,
        };
      }

      // 2. 检查是否为自己的作品
      if (getWorkAuthorId(work.author) === userId) {
        return {
          permission: 'self_work',
          reason: '不能复用自己的作品',
          canReuse: false,
        };
      }

      // 3. 检查作品是否允许复用
      if (work.status !== 'published') {
        return {
          permission: 'denied',
          reason: '作品未发布，不允许复用',
          canReuse: false,
        };
      }

      // 4. 检查用户复用配额
      const quota = await this.getUserReuseQuota(userId);
      if (quota.dailyUsed >= quota.limits.dailyLimit) {
        return {
          permission: 'quota_exceeded',
          reason: '今日复用次数已达上限',
          quotaUsed: quota.dailyUsed,
          quotaLimit: quota.limits.dailyLimit,
          canReuse: false,
        };
      }

      // 5. 检查冷却期
      const lastReuse = await this.getLastReuseTime(userId, workId);
      if (lastReuse) {
        const cooldownEnd = new Date(lastReuse.getTime() + quota.limits.cooldownPeriod * 60 * 60 * 1000);
        if (new Date() < cooldownEnd) {
          return {
            permission: 'denied',
            reason: `该作品复用冷却中，请在${cooldownEnd.toLocaleString()}后重试`,
            canReuse: false,
          };
        }
      }

      return {
        permission: 'allowed',
        quotaUsed: quota.dailyUsed,
        quotaLimit: quota.limits.dailyLimit,
        canReuse: true,
      };
    } catch (error) {
      handleServiceError(error, '检查复用权限');
      return {
        permission: 'denied',
        reason: '检查复用权限时发生错误',
        canReuse: false,
      };
    }
  }

  /**
   * 执行作品复用
   */
  async reuseWork(userId: string, request: ReuseRequest): Promise<ReuseResponse> {
    try {
      // 1. 权限检查
      const permissionCheck = await this.checkReusePermission(userId, request.workId);
      if (!permissionCheck.canReuse) {
        return {
          success: false,
          message: permissionCheck.reason || '复用权限检查失败',
        };
      }

      // 2. 获取原作品
      const originalWork = await workService.getWorkById(request.workId);
      if (!originalWork) {
        return {
          success: false,
          message: '原作品不存在',
        };
      }

      // 3. 创建新作品（复制原作品内容）
      const newWorkData = {
        title: request.targetTitle || `${originalWork.title} (复用版)`,
        knowledgePoint: originalWork.knowledgePoint,
        subject: originalWork.subject,
        gradeLevel: originalWork.gradeLevel,
        cards: originalWork.cards, // 复制所有卡片
        tags: originalWork.tags,
        status: 'draft' as const, // 复用的作品默认为草稿状态
      };

      const newWork = await workService.createWork(userId, newWorkData);

      // 4. 生成归属信息
      const attribution = await this.generateAttribution(
        originalWork,
        newWork.id,
        request.reuseType,
      );

      // 5. 创建复用记录
      const reuseRecord = await this.createReuseRecord(
        userId,
        request.workId,
        newWork.id,
        attribution,
        request.reuseType,
      );

      // 6. 更新统计信息
      await Promise.all([
        this.updateReuseCount(request.workId),
        this.updateUserQuota(userId),
      ]);

      return {
        success: true,
        message: '作品复用成功',
        data: {
          newWorkId: newWork.id,
          attribution,
          reuseRecord,
        },
      };
    } catch (error) {
      handleServiceError(error, '复用作品');
      return {
        success: false,
        message: '复用作品时发生错误',
      };
    }
  }

  /**
   * 生成归属信息
   */
  private async generateAttribution(
    originalWork: any, // Using any for now to avoid type issues
    newWorkId: string,
    reuseType: 'full' | 'partial',
  ): Promise<Attribution> {
    try {
      // 获取原作者信息
      const originalAuthor = await (User.findById as any)(getWorkAuthorId(originalWork.author));

      return {
        id: new ObjectId().toString(),
        originalWorkId: originalWork._id.toString(),
        originalWorkTitle: originalWork.title,
        originalAuthorId: getWorkAuthorId(originalWork.author),
        originalAuthorName: originalAuthor?.name || '未知作者',
        reuseDate: new Date().toISOString(),
        reuseType,
      };
    } catch (error) {
      handleServiceError(error, '生成归属信息');
      throw error; // Re-throw to be handled by calling function
    }
  }

  /**
   * 创建复用记录
   */
  private async createReuseRecord(
    userId: string,
    originalWorkId: string,
    newWorkId: string,
    attribution: Attribution,
    reuseType: 'full' | 'partial',
  ): Promise<ReuseRecord> {
    try {
      const reuseRecord: ReuseRecord = {
        id: new ObjectId().toString(),
        originalWorkId,
        newWorkId,
        userId,
        reuseDate: new Date().toISOString(),
        status: 'completed',
        attribution,
        reuseType,
        reuseCount: 1,
      };

      // TODO: 保存到数据库
      // await this.saveReuseRecord(reuseRecord);

      return reuseRecord;
    } catch (error) {
      handleServiceError(error, '创建复用记录');
      throw error; // Re-throw to be handled by calling function
    }
  }

  /**
   * 获取用户复用配额
   */
  async getUserReuseQuota(userId: string): Promise<UserReuseQuota> {
    try {
      // TODO: 从数据库获取用户配额信息
      // 目前返回模拟数据
      const now = new Date();
      const today = now.toISOString().split('T')[0];
      const thisMonth = now.toISOString().substring(0, 7);

      return {
        userId,
        dailyUsed: 0, // TODO: 从数据库查询今日使用量
        monthlyUsed: 0, // TODO: 从数据库查询本月使用量
        totalUsed: 0, // TODO: 从数据库查询总使用量
        lastReuseDate: '', // TODO: 从数据库查询最后复用时间
        limits: DEFAULT_REUSE_LIMITS,
      };
    } catch (error) {
      handleServiceError(error, '获取用户复用配额');
      // Return default quota on error
      return {
        userId,
        dailyUsed: 0,
        monthlyUsed: 0,
        totalUsed: 0,
        lastReuseDate: '',
        limits: DEFAULT_REUSE_LIMITS,
      };
    }
  }

  /**
   * 获取最后复用时间
   */
  private async getLastReuseTime(userId: string, workId: string): Promise<Date | null> {
    try {
      // TODO: 从数据库查询最后复用时间
      // 目前返回null表示没有复用记录
      return null;
    } catch (error) {
      handleServiceError(error, '获取最后复用时间');
      return null;
    }
  }

  /**
   * 更新作品复用计数
   */
  private async updateReuseCount(workId: string): Promise<void> {
    try {
      // TODO: 更新作品的复用计数
      // await workService.incrementReuseCount(workId);
    } catch (error) {
      handleServiceError(error, '更新复用计数');
    }
  }

  /**
   * 更新用户配额使用量
   */
  private async updateUserQuota(userId: string): Promise<void> {
    try {
      // TODO: 更新用户的配额使用量
      // 包括日使用量、月使用量、总使用量
    } catch (error) {
      handleServiceError(error, '更新用户配额');
    }
  }

  /**
   * 获取作品复用信息
   */
  async getWorkReuseInfo(workId: string): Promise<WorkReuseInfo> {
    try {
      const work = await workService.getWorkById(workId);
      if (!work) {
        throw new Error('作品不存在');
      }

      // TODO: 从数据库获取复用统计信息
      const reuseStats: ReuseStats = {
        totalReuses: 0,
        uniqueReusers: 0,
        reusesByMonth: [],
        topReusers: [],
      };

      return {
        workId,
        totalReuses: 0, // TODO: 从数据库获取
        canBeReused: work.status === 'published',
        reusePermission: 'allowed', // TODO: 根据实际情况判断
        attribution: [], // TODO: 从数据库获取归属信息
        reuseStats,
      };
    } catch (error) {
      handleServiceError(error, '获取作品复用信息');
      throw error; // Re-throw to be handled by calling function
    }
  }

  /**
   * 获取用户的复用历史
   */
  async getUserReuseHistory(userId: string, page = 1, limit = 10): Promise<{
    records: ReuseRecord[];
    total: number;
    hasMore: boolean;
  }> {
    try {
      // TODO: 从数据库获取用户复用历史
      return {
        records: [],
        total: 0,
        hasMore: false,
      };
    } catch (error) {
      handleServiceError(error, '获取用户复用历史');
      return {
        records: [],
        total: 0,
        hasMore: false,
      };
    }
  }

  /**
   * 获取作品的复用历史
   */
  async getWorkReuseHistory(workId: string, page = 1, limit = 10): Promise<{
    records: ReuseRecord[];
    total: number;
    hasMore: boolean;
  }> {
    try {
      // TODO: 从数据库获取作品复用历史
      return {
        records: [],
        total: 0,
        hasMore: false,
      };
    } catch (error) {
      handleServiceError(error, '获取作品复用历史');
      return {
        records: [],
        total: 0,
        hasMore: false,
      };
    }
  }

  /**
   * 格式化归属文本
   */
  formatAttributionText(attribution: Attribution): string {
    return `本作品部分灵感来源于${attribution.originalAuthorName}的《${attribution.originalWorkTitle}》`;
  }

  /**
   * 验证复用请求
   */
  private validateReuseRequest(request: ReuseRequest): boolean {
    if (!request.workId || typeof request.workId !== 'string') {
      return false;
    }

    if (!['full', 'partial'].includes(request.reuseType)) {
      return false;
    }

    return true;
  }
}

// 导出单例实例
const reuseService = new ReuseService();
export default reuseService;
