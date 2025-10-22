/**
 * 仪式感触发器 - 核心检测系统
 */

import { RitualType, RitualIntensity, UserAction, UserContext, User } from '../types';

// 仪式感触发规则
interface RitualTriggerRule {
  actionType: string;
  conditions: TriggerCondition[];
  ritualType: RitualType;
  baseIntensity: RitualIntensity;
  cooldownMs?: number;
}

// 触发条件
interface TriggerCondition {
  type: 'user_level' | 'session_duration' | 'action_count' | 'time_since_last' | 'special_date';
  operator: 'gt' | 'lt' | 'eq' | 'gte' | 'lte';
  value: number | string | boolean;
}

// 仪式感触发器接口
export interface IRitualTrigger {
  detectRitualMoment(action: UserAction): RitualType | null;
  peekRitualType(action: UserAction): RitualType | null;
  calculateIntensity(context: UserContext): RitualIntensity;
  shouldActivate(user: User, action: UserAction, detectedType?: RitualType | null): boolean;
}

export class RitualTrigger implements IRitualTrigger {
  private triggerRules: RitualTriggerRule[] = [];
  private lastTriggered: Map<string, number> = new Map();

  constructor() {
    this.initializeDefaultRules();
  }

  /**
   * 初始化默认触发规则
   */
  private initializeDefaultRules(): void {
    this.triggerRules = [
      // 欢迎仪式 - 首次登录
      {
        actionType: 'user_login',
        conditions: [
          { type: 'session_duration', operator: 'lt', value: 60000 }, // 1分钟内
          { type: 'user_level', operator: 'eq', value: 1 } // 新用户
        ],
        ritualType: RitualType.WELCOME,
        baseIntensity: RitualIntensity.DRAMATIC,
        cooldownMs: 24 * 60 * 60 * 1000 // 24小时冷却
      },

      // 成就仪式 - 完成重要任务
      {
        actionType: 'task_completed',
        conditions: [
          { type: 'user_level', operator: 'gte', value: 1 }
        ],
        ritualType: RitualType.ACHIEVEMENT,
        baseIntensity: RitualIntensity.MODERATE,
        cooldownMs: 5 * 60 * 1000 // 5分钟冷却
      },

      // 创作仪式 - 开始新项目
      {
        actionType: 'project_created',
        conditions: [
          { type: 'user_level', operator: 'gte', value: 1 }
        ],
        ritualType: RitualType.CREATION,
        baseIntensity: RitualIntensity.MODERATE,
        cooldownMs: 10 * 60 * 1000 // 10分钟冷却
      },

      // 分享仪式 - 微博分享
      {
        actionType: 'content_shared_weibo',
        conditions: [
          { type: 'user_level', operator: 'gte', value: 2 }
        ],
        ritualType: RitualType.SHARING,
        baseIntensity: RitualIntensity.MODERATE,
        cooldownMs: 15 * 60 * 1000 // 15分钟冷却
      },

      // 分享仪式 - 邮件分享
      {
        actionType: 'content_shared_email',
        conditions: [
          { type: 'user_level', operator: 'gte', value: 2 }
        ],
        ritualType: RitualType.SHARING,
        baseIntensity: RitualIntensity.MODERATE,
        cooldownMs: 15 * 60 * 1000 // 15分钟冷却
      },

      // 里程碑仪式 - 等级提升
      {
        actionType: 'level_up',
        conditions: [
          { type: 'user_level', operator: 'gte', value: 2 }
        ],
        ritualType: RitualType.MILESTONE,
        baseIntensity: RitualIntensity.EPIC,
        cooldownMs: 60 * 60 * 1000 // 1小时冷却
      },

      // 过渡仪式 - 页面切换
      {
        actionType: 'page_transition',
        conditions: [
          { type: 'session_duration', operator: 'gt', value: 5 * 60 * 1000 } // 5分钟后
        ],
        ritualType: RitualType.TRANSITION,
        baseIntensity: RitualIntensity.SUBTLE,
        cooldownMs: 30 * 1000 // 30秒冷却
      }
    ];
  }

  /**
   * 检测是否需要触发仪式感
   */
  detectRitualMoment(action: UserAction): RitualType | null {
    const matchingRule = this.triggerRules.find(rule => 
      rule.actionType === action.type
    );

    if (!matchingRule) {
      return null;
    }

    if (this.isInCooldown(matchingRule, action.userId)) {
      return null;
    }

    return matchingRule.ritualType;
  }

  peekRitualType(action: UserAction): RitualType | null {
    const matchingRule = this.triggerRules.find(rule => 
      rule.actionType === action.type
    );

    return matchingRule?.ritualType ?? null;
  }

  /**
   * 计算仪式感强度
   */
  calculateIntensity(context: UserContext): RitualIntensity {
    let intensity = RitualIntensity.MODERATE;

    // 根据用户等级调整强度
    if (context.userLevel >= 10) {
      intensity = Math.min(intensity + 1, RitualIntensity.EPIC);
    } else if (context.userLevel <= 2) {
      intensity = Math.max(intensity - 1, RitualIntensity.SUBTLE);
    }

    // 根据会话时长调整
    if (context.sessionDuration > 30 * 60 * 1000) { // 30分钟以上
      intensity = Math.min(intensity + 1, RitualIntensity.EPIC);
    }

    // 根据用户偏好调整
    const userPreferredIntensity = context.preferences.ritualIntensity;
    if (userPreferredIntensity === RitualIntensity.SUBTLE) {
      intensity = RitualIntensity.SUBTLE;
    } else if (userPreferredIntensity >= RitualIntensity.DRAMATIC) {
      intensity = Math.min(intensity, userPreferredIntensity);
    }

    // 根据设备性能调整
    if (context.deviceCapabilities.performanceLevel === 'low') {
      intensity = Math.min(intensity, RitualIntensity.MODERATE);
    }

    return intensity;
  }

  /**
   * 判断是否应该激活仪式感
   */
  shouldActivate(user: User, action: UserAction, detectedType?: RitualType | null): boolean {
    const ritualType = detectedType ?? this.detectRitualMoment(action);
    
    if (!ritualType) {
      return false;
    }

    // 检查用户是否启用了该类型的仪式感
    if (!user.preferences.enabledRitualTypes.includes(ritualType)) {
      return false;
    }

    // 检查设备能力
    const capabilities = user.context.deviceCapabilities;
    if (!capabilities.supportsAnimation && ritualType !== RitualType.WELCOME) {
      return false;
    }

    // 检查可访问性设置
    if (user.preferences.reducedMotion && 
        [RitualType.ACHIEVEMENT, RitualType.MILESTONE].includes(ritualType)) {
      return false;
    }

    // 检查冷却时间
    const matchingRule = this.triggerRules.find(rule => rule.ritualType === ritualType && rule.actionType === action.type);
    if (matchingRule && this.isInCooldown(matchingRule, user.id)) {
      return false;
    }

    return true;
  }

  /**
   * 检查是否在冷却时间内
   */
  private isInCooldown(rule: RitualTriggerRule, userId: string): boolean {
    if (!rule.cooldownMs) {
      return false;
    }

    const key = `${userId}_${rule.ritualType}`;
    const lastTriggered = this.lastTriggered.get(key);
    
    if (!lastTriggered) {
      return false;
    }

    return Date.now() - lastTriggered < rule.cooldownMs;
  }

  /**
   * 记录触发时间
   */
  recordTrigger(userId: string, ritualType: RitualType): void {
    const key = `${userId}_${ritualType}`;
    this.lastTriggered.set(key, Date.now());
  }

  /**
   * 添加自定义触发规则
   */
  addTriggerRule(rule: RitualTriggerRule): void {
    this.triggerRules.push(rule);
  }

  /**
   * 移除触发规则
   */
  removeTriggerRule(actionType: string, ritualType: RitualType): void {
    this.triggerRules = this.triggerRules.filter(
      rule => !(rule.actionType === actionType && rule.ritualType === ritualType)
    );
  }

  /**
   * 检查触发条件是否满足
   */
  private checkConditions(conditions: TriggerCondition[], context: UserContext): boolean {
    return conditions.every(condition => {
      const value = this.getContextValue(condition.type, context);
      return this.evaluateCondition(value, condition.operator, condition.value);
    });
  }

  /**
   * 获取上下文值
   */
  private getContextValue(type: string, context: UserContext): number | string | null {
    switch (type) {
      case 'user_level':
        return context.userLevel;
      case 'session_duration':
        return context.sessionDuration;
      case 'action_count':
        return context.previousActions.length;
      case 'time_since_last':
        return Date.now() - (context.previousActions[0]?.timestamp || 0);
      case 'special_date':
        return new Date().toDateString();
      default:
        return null;
    }
  }

  /**
   * 评估条件
   */
  private evaluateCondition(actual: number | string | null, operator: string, expected: number | string | boolean): boolean {
    if (actual === null) {
      return false;
    }

    switch (operator) {
      case 'gt':
        return typeof actual === 'number' && typeof expected === 'number' && actual > expected;
      case 'lt':
        return typeof actual === 'number' && typeof expected === 'number' && actual < expected;
      case 'eq':
        return actual === expected;
      case 'gte':
        return typeof actual === 'number' && typeof expected === 'number' && actual >= expected;
      case 'lte':
        return typeof actual === 'number' && typeof expected === 'number' && actual <= expected;
      default:
        return false;
    }
  }
}
