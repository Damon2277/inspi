/**
 * 仪式感检测器 - 用户行为分析和仪式感时刻识别
 */

import { RitualType, RitualIntensity, UserAction, User } from '../types';
import { RitualTrigger } from './RitualTrigger';

// 仪式感检测结果
export interface RitualDetectionResult {
  shouldTrigger: boolean;
  ritualType: RitualType | null;
  intensity: RitualIntensity;
  confidence: number; // 0-1 之间的置信度
  reason: string;
  metadata?: Record<string, unknown>;
}

// 行为模式分析结果
interface BehaviorPattern {
  type: string;
  frequency: number;
  lastOccurrence: number;
  averageInterval: number;
  significance: number; // 重要性评分 0-1
}

interface UserBehaviorStats {
  totalActions: number;
  uniqueActionTypes: number;
  patterns: number;
  mostFrequentAction: string | null;
  averageSessionLength: number;
}

export class RitualDetector {
  private ritualTrigger: RitualTrigger;
  private behaviorHistory: Map<string, UserAction[]> = new Map();
  private patternCache: Map<string, BehaviorPattern[]> = new Map();

  constructor() {
    this.ritualTrigger = new RitualTrigger();
  }

  /**
   * 主要检测方法 - 分析用户行为并决定是否触发仪式感
   */
  async detectRitualMoment(
    user: User, 
    action: UserAction
  ): Promise<RitualDetectionResult> {
    // 更新用户行为历史
    this.updateBehaviorHistory(user.id, action);

    // 基础触发检测
    const ritualType = this.ritualTrigger.peekRitualType(action);
    
    if (!ritualType) {
      return {
        shouldTrigger: false,
        ritualType: null,
        intensity: RitualIntensity.SUBTLE,
        confidence: 0,
        reason: 'No matching ritual trigger found'
      };
    }

    // 检查是否应该激活
    const detectionAvailable = this.ritualTrigger.detectRitualMoment(action);
    const activationAllowed = this.ritualTrigger.shouldActivate(user, action, ritualType);

    // 计算强度
    const baseIntensity = this.ritualTrigger.calculateIntensity(user.context);

    // 分析行为模式以调整置信度
    const confidence = await this.calculateConfidence(user, action, ritualType);

    // 增强检测 - 基于行为模式的智能调整
    let enhancedResult = await this.enhanceDetection(
      user, 
      action, 
      ritualType, 
      baseIntensity, 
      confidence
    );

    if (!activationAllowed) {
      enhancedResult = {
        ...enhancedResult,
        shouldTrigger: false,
        reason: detectionAvailable
          ? 'Ritual activation conditions not met'
          : 'Ritual currently in cooldown'
      };
    }

    // 记录触发
    if (activationAllowed && enhancedResult.shouldTrigger) {
      this.ritualTrigger.recordTrigger(user.id, ritualType);
    }

    return enhancedResult;
  }

  /**
   * 更新用户行为历史
   */
  private updateBehaviorHistory(userId: string, action: UserAction): void {
    if (!this.behaviorHistory.has(userId)) {
      this.behaviorHistory.set(userId, []);
    }

    const history = this.behaviorHistory.get(userId)!;
    history.push(action);

    // 保持最近100个行为记录
    if (history.length > 100) {
      history.shift();
    }

    // 清除过期的模式缓存
    this.patternCache.delete(userId);
  }

  /**
   * 计算触发置信度
   */
  private async calculateConfidence(
    user: User, 
    action: UserAction, 
    ritualType: RitualType
  ): Promise<number> {
    let confidence = 0.5; // 基础置信度

    // 基于用户等级调整
    if (user.level >= 5) {
      confidence -= 0.1;
    } else if (user.level <= 2) {
      confidence += 0.3; // 新用户更需要仪式感
    }

    // 基于行为模式调整
    const patterns = await this.analyzeBehaviorPatterns(user.id);
    const relevantPattern = patterns.find(p => 
      this.isPatternRelevantToRitual(p, ritualType)
    );

    if (relevantPattern) {
      confidence += relevantPattern.significance * 0.3;
    }

    // 基于时间因素调整
    const timeBonus = this.calculateTimeBonus(action, ritualType);
    confidence += timeBonus;

    // 基于设备能力调整
    if (user.context.deviceCapabilities.performanceLevel === 'high') {
      confidence += 0.15;
    } else if (user.context.deviceCapabilities.performanceLevel === 'low') {
      confidence -= 0.2;
    }

    return Math.min(Math.max(confidence, 0), 1);
  }

  /**
   * 增强检测 - 智能调整仪式感参数
   */
  private async enhanceDetection(
    user: User,
    action: UserAction,
    ritualType: RitualType,
    baseIntensity: RitualIntensity,
    confidence: number
  ): Promise<RitualDetectionResult> {
    let intensity = baseIntensity;
    const shouldTrigger = confidence > 0.3; // 置信度阈值

    // 基于用户偏好的智能调整
    const userIntensityPreference = user.preferences.ritualIntensity;
    if (userIntensityPreference < intensity) {
      intensity = userIntensityPreference;
    }

    // 基于行为频率调整
    const actionFrequency = await this.getActionFrequency(user.id, action.type);
    if (actionFrequency > 10) { // 频繁操作，降低强度
      intensity = Math.max(intensity - 1, RitualIntensity.SUBTLE);
    }

    // 基于会话状态调整
    if (user.context.sessionDuration < 2 * 60 * 1000) { // 会话开始2分钟内
      intensity = Math.min(intensity + 1, RitualIntensity.EPIC);
    }

    // 特殊情况检测
    const specialContext = this.detectSpecialContext(user, action);
    if (specialContext) {
      intensity = Math.min(intensity + 1, RitualIntensity.EPIC);
      confidence = Math.min(confidence + 0.2, 1);
    }

    // 最终决策
    const finalShouldTrigger = shouldTrigger && confidence > 0.4;

    const shareChannel = this.getShareChannel(action);

    return {
      shouldTrigger: finalShouldTrigger,
      ritualType,
      intensity,
      confidence,
      reason: this.generateReason(finalShouldTrigger, confidence, ritualType),
      metadata: {
        originalIntensity: baseIntensity,
        adjustedIntensity: intensity,
        actionFrequency,
        specialContext,
        sessionDuration: user.context.sessionDuration,
        shareChannel
      }
    };
  }

  /**
   * 分析用户行为模式
   */
  private async analyzeBehaviorPatterns(userId: string): Promise<BehaviorPattern[]> {
    // 检查缓存
    if (this.patternCache.has(userId)) {
      return this.patternCache.get(userId)!;
    }

    const history = this.behaviorHistory.get(userId) || [];
    const patterns: BehaviorPattern[] = [];

    // 按行为类型分组
    const actionGroups = new Map<string, UserAction[]>();
    history.forEach(action => {
      if (!actionGroups.has(action.type)) {
        actionGroups.set(action.type, []);
      }
      actionGroups.get(action.type)!.push(action);
    });

    // 分析每种行为的模式
    actionGroups.forEach((actions, type) => {
      if (actions.length >= 2) {
        const pattern = this.calculateBehaviorPattern(type, actions);
        patterns.push(pattern);
      }
    });

    // 缓存结果
    this.patternCache.set(userId, patterns);
    
    return patterns;
  }

  /**
   * 计算单个行为模式
   */
  private calculateBehaviorPattern(type: string, actions: UserAction[]): BehaviorPattern {
    const timestamps = actions.map(a => a.timestamp).sort((a, b) => a - b);
    const intervals = [];
    
    for (let i = 1; i < timestamps.length; i++) {
      intervals.push(timestamps[i] - timestamps[i - 1]);
    }

    const averageInterval = intervals.length > 0 
      ? intervals.reduce((sum, interval) => sum + interval, 0) / intervals.length
      : 0;

    // 计算重要性评分
    let significance = 0.5;
    
    // 频率越高，重要性可能越低（除非是核心操作）
    if (actions.length > 20) {
      significance -= 0.2;
    } else if (actions.length < 5) {
      significance += 0.2;
    }

    // 最近活跃度影响重要性
    const recentActions = actions.filter(a => 
      Date.now() - a.timestamp < 24 * 60 * 60 * 1000 // 24小时内
    );
    if (recentActions.length > 0) {
      significance += 0.1;
    }

    return {
      type,
      frequency: actions.length,
      lastOccurrence: Math.max(...timestamps),
      averageInterval,
      significance: Math.min(Math.max(significance, 0), 1)
    };
  }

  /**
   * 判断行为模式是否与仪式感类型相关
   */
  private isPatternRelevantToRitual(pattern: BehaviorPattern, ritualType: RitualType): boolean {
    const relevanceMap: Record<RitualType, string[]> = {
      [RitualType.WELCOME]: ['user_login', 'session_start'],
      [RitualType.ACHIEVEMENT]: ['task_completed', 'goal_reached', 'challenge_completed'],
      [RitualType.CREATION]: ['project_created', 'content_created', 'design_started'],
      [RitualType.SHARING]: ['content_shared', 'content_shared_weibo', 'content_shared_email', 'post_published', 'collaboration_invited'],
      [RitualType.MILESTONE]: ['level_up', 'badge_earned', 'milestone_reached'],
      [RitualType.TRANSITION]: ['page_transition', 'mode_changed', 'view_switched']
    };

    return relevanceMap[ritualType]?.includes(pattern.type) || false;
  }

  private getShareChannel(action: UserAction): 'weibo' | 'email' | null {
    switch (action.type) {
      case 'content_shared_weibo':
        return 'weibo';
      case 'content_shared_email':
        return 'email';
      default: {
        const context = action.context as Record<string, unknown> | undefined;
        if (context && typeof context.platform === 'string') {
          if (context.platform === 'weibo') {
            return 'weibo';
          }
          if (context.platform === 'email') {
            return 'email';
          }
        }
        return null;
      }
    }
  }

  /**
   * 计算时间奖励因子
   */
  private calculateTimeBonus(action: UserAction, ritualType: RitualType): number {
    const hour = new Date(action.timestamp).getHours();
    
    // 不同仪式感类型在不同时间段的适宜性
    const timePreferences: Record<RitualType, number[]> = {
      [RitualType.WELCOME]: [8, 9, 10, 18, 19, 20], // 早晨和傍晚
      [RitualType.ACHIEVEMENT]: [10, 11, 14, 15, 16], // 工作时间
      [RitualType.CREATION]: [9, 10, 11, 14, 15, 21, 22], // 创作时间
      [RitualType.SHARING]: [12, 17, 18, 19, 20], // 社交时间
      [RitualType.MILESTONE]: [16, 17, 18, 19, 20], // 成就展示时间
      [RitualType.TRANSITION]: [] // 任何时间都适合
    };

    const preferredHours = timePreferences[ritualType];
    if (preferredHours.length === 0 || preferredHours.includes(hour)) {
      return 0.1;
    }

    return 0;
  }

  /**
   * 获取行为频率
   */
  private async getActionFrequency(userId: string, actionType: string): Promise<number> {
    const history = this.behaviorHistory.get(userId) || [];
    return history.filter(action => action.type === actionType).length;
  }

  /**
   * 检测特殊上下文
   */
  private detectSpecialContext(user: User, action: UserAction): boolean {
    // 检测特殊日期（生日、节日等）
    const today = new Date();
    const userJoinDate = new Date(user.joinDate);

    // 用户注册周年
    if (today.getMonth() === userJoinDate.getMonth() && 
        today.getDate() === userJoinDate.getDate()) {
      return true;
    }

    // 检测连续使用天数里程碑
    const daysSinceJoin = Math.floor(
      (today.getTime() - userJoinDate.getTime()) / (1000 * 60 * 60 * 24)
    );

    if ([7, 30, 100, 365].includes(daysSinceJoin)) {
      return true;
    }

    // 检查动作上下文中的特殊标记
    if (action.context && typeof action.context === 'object') {
      const context = action.context as Record<string, unknown>;
      if (context['specialOccasion'] === true) {
        return true;
      }
      if (typeof context['customEvent'] === 'string') {
        return true;
      }
    }

    return false;
  }

  /**
   * 生成决策原因
   */
  private generateReason(shouldTrigger: boolean, confidence: number, ritualType: RitualType | null): string {
    if (!shouldTrigger) {
      if (confidence < 0.3) {
        return 'Confidence too low for ritual activation';
      }
      return 'Ritual conditions not met';
    }

    return `Ritual ${ritualType} triggered with ${Math.round(confidence * 100)}% confidence`;
  }

  /**
   * 获取用户行为统计
   */
  getUserBehaviorStats(userId: string): UserBehaviorStats {
    const history = this.behaviorHistory.get(userId) || [];
    const patterns = this.patternCache.get(userId) || [];

    return {
      totalActions: history.length,
      uniqueActionTypes: new Set(history.map(a => a.type)).size,
      patterns: patterns.length,
      mostFrequentAction: this.getMostFrequentAction(history),
      averageSessionLength: this.calculateAverageSessionLength(history)
    };
  }

  /**
   * 获取最频繁的行为
   */
  private getMostFrequentAction(history: UserAction[]): string | null {
    if (history.length === 0) return null;

    const actionCounts = new Map<string, number>();
    history.forEach(action => {
      actionCounts.set(action.type, (actionCounts.get(action.type) || 0) + 1);
    });

    let maxCount = 0;
    let mostFrequent = null;
    actionCounts.forEach((count, type) => {
      if (count > maxCount) {
        maxCount = count;
        mostFrequent = type;
      }
    });

    return mostFrequent;
  }

  /**
   * 计算平均会话长度
   */
  private calculateAverageSessionLength(history: UserAction[]): number {
    // 简化实现：基于行为间隔估算会话长度
    if (history.length < 2) return 0;

    const intervals = [];
    for (let i = 1; i < history.length; i++) {
      const interval = history[i].timestamp - history[i - 1].timestamp;
      if (interval < 30 * 60 * 1000) { // 30分钟内认为是同一会话
        intervals.push(interval);
      }
    }

    return intervals.length > 0 
      ? intervals.reduce((sum, interval) => sum + interval, 0) / intervals.length
      : 0;
  }
}
