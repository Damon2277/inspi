/**
 * 配额使用统计和管理
 */

import { QuotaType, SubscriptionUsage } from '@/shared/types/subscription';

/**
 * 配额使用统计管理器
 */
export class QuotaUsageManager {
  constructor(private userId: string) {}

  /**
   * 记录配额使用
   */
  async recordUsage(type: QuotaType, amount: number = 1, subscriptionId?: string): Promise<boolean> {
    const today = new Date().toISOString().split('T')[0];

    try {
      const response = await fetch('/api/subscription/quota/record-usage', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: this.userId,
          subscriptionId,
          type,
          amount,
          date: today,
        }),
      });

      if (response.ok) {
        const result = await response.json();
        return result.success;
      }
    } catch (error) {
      console.error('Failed to record quota usage:', error);
    }

    return false;
  }

  /**
   * 获取每日使用统计
   */
  async getDailyUsage(type: QuotaType, date?: string): Promise<number> {
    const targetDate = date || new Date().toISOString().split('T')[0];

    try {
      const response = await fetch(
        `/api/subscription/quota/daily-usage?userId=${this.userId}&type=${type}&date=${targetDate}`,
      );

      if (response.ok) {
        const result = await response.json();
        return result.usage || 0;
      }
    } catch (error) {
      console.error('Failed to get daily usage:', error);
    }

    return 0;
  }

  /**
   * 获取月度使用统计
   */
  async getMonthlyUsage(type: QuotaType, year: number, month: number): Promise<{
    totalUsage: number;
    dailyBreakdown: { date: string; usage: number }[];
    averageDaily: number;
  }> {
    try {
      const response = await fetch(
        `/api/subscription/quota/monthly-usage?userId=${this.userId}&type=${type}&year=${year}&month=${month}`,
      );

      if (response.ok) {
        const result = await response.json();
        return {
          totalUsage: result.totalUsage || 0,
          dailyBreakdown: result.dailyBreakdown || [],
          averageDaily: result.averageDaily || 0,
        };
      }
    } catch (error) {
      console.error('Failed to get monthly usage:', error);
    }

    return {
      totalUsage: 0,
      dailyBreakdown: [],
      averageDaily: 0,
    };
  }

  /**
   * 获取使用趋势分析
   */
  async getUsageTrends(days: number = 30): Promise<{
    trends: { date: string; create: number; reuse: number; export: number }[];
    growth: { create: number; reuse: number; export: number };
    predictions: { create: number; reuse: number; export: number };
  }> {
    try {
      const response = await fetch(
        `/api/subscription/quota/usage-trends?userId=${this.userId}&days=${days}`,
      );

      if (response.ok) {
        const result = await response.json();
        return {
          trends: result.trends || [],
          growth: result.growth || { create: 0, reuse: 0, export: 0 },
          predictions: result.predictions || { create: 0, reuse: 0, export: 0 },
        };
      }
    } catch (error) {
      console.error('Failed to get usage trends:', error);
    }

    return {
      trends: [],
      growth: { create: 0, reuse: 0, export: 0 },
      predictions: { create: 0, reuse: 0, export: 0 },
    };
  }

  /**
   * 重置每日配额计数
   */
  async resetDailyCounters(date?: string): Promise<boolean> {
    const targetDate = date || new Date().toISOString().split('T')[0];

    try {
      const response = await fetch('/api/subscription/quota/reset-daily', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: this.userId,
          date: targetDate,
        }),
      });

      return response.ok;
    } catch (error) {
      console.error('Failed to reset daily counters:', error);
      return false;
    }
  }

  /**
   * 获取配额使用历史
   */
  async getUsageHistory(
    startDate: string,
    endDate: string,
    type?: QuotaType,
  ): Promise<SubscriptionUsage[]> {
    try {
      const params = new URLSearchParams({
        userId: this.userId,
        startDate,
        endDate,
      });

      if (type) {
        params.append('type', type);
      }

      const response = await fetch(`/api/subscription/quota/usage-history?${params}`);

      if (response.ok) {
        const result = await response.json();
        return result.history || [];
      }
    } catch (error) {
      console.error('Failed to get usage history:', error);
    }

    return [];
  }

  /**
   * 导出使用数据
   */
  async exportUsageData(
    startDate: string,
    endDate: string,
    format: 'csv' | 'json' = 'csv',
  ): Promise<string | null> {
    try {
      const response = await fetch('/api/subscription/quota/export-usage', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: this.userId,
          startDate,
          endDate,
          format,
        }),
      });

      if (response.ok) {
        if (format === 'json') {
          const result = await response.json();
          return JSON.stringify(result.data, null, 2);
        } else {
          return await response.text();
        }
      }
    } catch (error) {
      console.error('Failed to export usage data:', error);
    }

    return null;
  }
}

/**
 * 配额重置调度器（服务端使用）
 */
export class QuotaResetScheduler {
  /**
   * 重置所有用户的每日配额
   */
  static async resetAllDailyQuotas(): Promise<{
    success: boolean;
    resetCount: number;
    errors: string[];
  }> {
    try {
      const response = await fetch('/api/admin/quota/reset-all-daily', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const result = await response.json();
        return {
          success: result.success,
          resetCount: result.resetCount || 0,
          errors: result.errors || [],
        };
      }
    } catch (error) {
      console.error('Failed to reset all daily quotas:', error);
    }

    return {
      success: false,
      resetCount: 0,
      errors: ['Failed to connect to reset service'],
    };
  }

  /**
   * 清理过期的使用记录
   */
  static async cleanupExpiredRecords(daysToKeep: number = 90): Promise<{
    success: boolean;
    deletedCount: number;
  }> {
    try {
      const response = await fetch('/api/admin/quota/cleanup-records', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          daysToKeep,
        }),
      });

      if (response.ok) {
        const result = await response.json();
        return {
          success: result.success,
          deletedCount: result.deletedCount || 0,
        };
      }
    } catch (error) {
      console.error('Failed to cleanup expired records:', error);
    }

    return {
      success: false,
      deletedCount: 0,
    };
  }
}

/**
 * 配额使用分析器
 */
export class QuotaUsageAnalyzer {
  constructor(private userId: string) {}

  /**
   * 分析用户配额使用模式
   */
  async analyzeUsagePatterns(): Promise<{
    peakUsageHours: number[];
    preferredQuotaTypes: QuotaType[];
    usageConsistency: number; // 0-1, 1表示非常一致
    growthTrend: 'increasing' | 'stable' | 'decreasing';
    recommendations: string[];
  }> {
    try {
      const response = await fetch(`/api/subscription/quota/analyze-patterns?userId=${this.userId}`);

      if (response.ok) {
        const result = await response.json();
        return {
          peakUsageHours: result.peakUsageHours || [],
          preferredQuotaTypes: result.preferredQuotaTypes || [],
          usageConsistency: result.usageConsistency || 0,
          growthTrend: result.growthTrend || 'stable',
          recommendations: result.recommendations || [],
        };
      }
    } catch (error) {
      console.error('Failed to analyze usage patterns:', error);
    }

    return {
      peakUsageHours: [],
      preferredQuotaTypes: [],
      usageConsistency: 0,
      growthTrend: 'stable',
      recommendations: [],
    };
  }

  /**
   * 预测未来配额需求
   */
  async predictFutureNeeds(days: number = 30): Promise<{
    predictedUsage: Record<QuotaType, number>;
    confidence: number; // 0-1
    recommendedPlan: string;
    reasoning: string[];
  }> {
    try {
      const response = await fetch(
        `/api/subscription/quota/predict-needs?userId=${this.userId}&days=${days}`,
      );

      if (response.ok) {
        const result = await response.json();
        return {
          predictedUsage: result.predictedUsage || {},
          confidence: result.confidence || 0,
          recommendedPlan: result.recommendedPlan || 'current',
          reasoning: result.reasoning || [],
        };
      }
    } catch (error) {
      console.error('Failed to predict future needs:', error);
    }

    return {
      predictedUsage: {} as Record<QuotaType, number>,
      confidence: 0,
      recommendedPlan: 'current',
      reasoning: [],
    };
  }
}
