/**
 * 个性化仪式引擎 - 根据用户偏好和行为调整仪式感体验
 */

import { RitualType, RitualIntensity, User, UserAction } from '../types';

export type ResponseTone = 'positive' | 'neutral' | 'negative' | 'skipped';

// 用户仪式档案
export interface UserRitualProfile {
  userId: string;
  preferences: {
    intensityLevel: RitualIntensity;
    enabledTypes: RitualType[];
    culturalContext: string;
    accessibilityNeeds: string[];
  };
  history: {
    triggeredRituals: RitualEvent[];
    userFeedback: FeedbackEvent[];
    engagementMetrics: EngagementMetric[];
  };
  adaptations: {
    learnedPreferences: LearnedPreference[];
    customizations: Customization[];
  };
}

// 仪式事件
export interface RitualEvent {
  id: string;
  type: RitualType;
  intensity: RitualIntensity;
  timestamp: number;
  duration: number;
  userResponse: ResponseTone;
}

// 反馈事件
export interface FeedbackEvent {
  ritualId: string;
  rating: number; // 1-5
  feedback: string;
  timestamp: number;
}

// 参与度指标
export interface EngagementMetric {
  date: string;
  ritualCount: number;
  averageRating: number;
  skipRate: number;
  completionRate: number;
}

// 学习偏好
export interface LearnedPreference {
  type: string;
  value: number;
  confidence: number; // 0-1
  lastUpdated: number;
}

// 自定义设置
export interface Customization {
  id: string;
  type: string;
  settings: Record<string, unknown>;
  createdAt: number;
}

// 仪式时刻
export interface RitualMoment {
  type: RitualType;
  intensity: RitualIntensity;
  timing: number;
  context: Record<string, unknown>;
  confidence: number;
}

// 交互数据
export interface Interaction {
  action: UserAction;
  response: InteractionResponse | null;
  timestamp: number;
  context: Record<string, unknown>;
}

export interface InteractionResponse {
  ritualType?: RitualType;
  userResponse?: ResponseTone;
  intensity?: RitualIntensity;
  rating?: number;
}

// 上下文信息
export interface Context {
  timeOfDay: number;
  dayOfWeek: number;
  sessionDuration: number;
  recentActions: UserAction[];
  deviceType: string;
  networkCondition: string;
}

export class PersonalizedRitualEngine {
  private userProfiles: Map<string, UserRitualProfile> = new Map();
  private learningEnabled = true;
  private adaptationSpeed = 0.1; // 学习速度

  constructor() {
    this.initializeEngine();
  }

  private initializeEngine(): void {
    // 初始化个性化引擎
    console.log('Personalized Ritual Engine initialized');
  }

  /**
   * 学习用户偏好
   */
  learnUserPreferences(user: User, interactions: Interaction[]): UserRitualProfile {
    let profile = this.userProfiles.get(user.id);
    
    if (!profile) {
      profile = this.createDefaultProfile(user);
      this.userProfiles.set(user.id, profile);
    }

    if (this.learningEnabled) {
      this.updatePreferencesFromInteractions(profile, interactions);
      this.analyzeEngagementPatterns(profile, interactions);
      this.adjustPersonalizationSettings(profile);
    }

    return profile;
  }

  /**
   * 适配仪式感强度
   */
  adaptRitualIntensity(baseIntensity: RitualIntensity, user: User): RitualIntensity {
    const profile = this.userProfiles.get(user.id);
    if (!profile) {
      return baseIntensity;
    }

    // 基于用户偏好调整
    const userPreference = profile.preferences.intensityLevel;
    let adaptedIntensity = Math.min(baseIntensity, userPreference);

    // 基于历史反馈调整
    const recentFeedback = this.getRecentFeedback(profile, 7); // 最近7天
    if (recentFeedback.length > 0) {
      const averageRating = recentFeedback.reduce((sum, f) => sum + f.rating, 0) / recentFeedback.length;
      
      if (averageRating < 3) {
        // 评分较低，降低强度
        adaptedIntensity = Math.max(adaptedIntensity - 1, RitualIntensity.SUBTLE);
      } else if (averageRating > 4) {
        // 评分较高，可以适当提高强度
        adaptedIntensity = Math.min(adaptedIntensity + 1, RitualIntensity.EPIC);
      }
    }

    // 基于跳过率调整
    const skipRate = this.calculateSkipRate(profile);
    if (skipRate > 0.3) {
      // 跳过率高，降低强度
      adaptedIntensity = Math.max(adaptedIntensity - 1, RitualIntensity.SUBTLE);
    }

    return adaptedIntensity;
  }

  /**
   * 推荐仪式时刻
   */
  recommendRitualMoments(user: User, context: Context): RitualMoment[] {
    const profile = this.userProfiles.get(user.id);
    if (!profile) {
      return [];
    }

    const recommendations: RitualMoment[] = [];

    // 基于时间模式推荐
    const timeBasedRecommendations = this.getTimeBasedRecommendations(profile, context);
    recommendations.push(...timeBasedRecommendations);

    // 基于行为模式推荐
    const behaviorBasedRecommendations = this.getBehaviorBasedRecommendations(profile, context);
    recommendations.push(...behaviorBasedRecommendations);

    // 基于情境推荐
    const contextualRecommendations = this.getContextualRecommendations(profile, context);
    recommendations.push(...contextualRecommendations);

    // 按置信度排序
    return recommendations.sort((a, b) => b.confidence - a.confidence).slice(0, 5);
  }

  /**
   * 创建默认用户档案
   */
  private createDefaultProfile(user: User): UserRitualProfile {
    return {
      userId: user.id,
      preferences: {
        intensityLevel: RitualIntensity.MODERATE,
        enabledTypes: Object.values(RitualType),
        culturalContext: 'neutral',
        accessibilityNeeds: []
      },
      history: {
        triggeredRituals: [],
        userFeedback: [],
        engagementMetrics: []
      },
      adaptations: {
        learnedPreferences: [],
        customizations: []
      }
    };
  }

  /**
   * 从交互中更新偏好
   */
  private updatePreferencesFromInteractions(profile: UserRitualProfile, interactions: Interaction[]): void {
    interactions.forEach(interaction => {
      const response = interaction.response;
      if (!response) {
        return;
      }

      const userResponse: ResponseTone = response.userResponse ?? 'neutral';

      // 分析用户对不同仪式类型的反应
      if (response.ritualType) {
        this.updateTypePreference(profile, response.ritualType, userResponse);
      }

      // 分析用户对不同强度的反应
      if (typeof response.intensity === 'number') {
        this.updateIntensityPreference(profile, response.intensity as RitualIntensity, userResponse);
      }
    });
  }

  /**
   * 更新类型偏好
   */
  private updateTypePreference(profile: UserRitualProfile, ritualType: RitualType, response: ResponseTone): void {
    let preference = profile.adaptations.learnedPreferences.find(p => p.type === `type_${ritualType}`);
    
    if (!preference) {
      preference = {
        type: `type_${ritualType}`,
        value: 0.5,
        confidence: 0.1,
        lastUpdated: Date.now()
      };
      profile.adaptations.learnedPreferences.push(preference);
    }

    // 根据用户反应调整偏好值
    const adjustment = this.getResponseAdjustment(response);
    preference.value = Math.max(0, Math.min(1, preference.value + adjustment * this.adaptationSpeed));
    preference.confidence = Math.min(1, preference.confidence + 0.1);
    preference.lastUpdated = Date.now();

    // 更新启用的类型列表
    if (preference.value < 0.3 && profile.preferences.enabledTypes.includes(ritualType)) {
      profile.preferences.enabledTypes = profile.preferences.enabledTypes.filter(t => t !== ritualType);
    } else if (preference.value > 0.7 && !profile.preferences.enabledTypes.includes(ritualType)) {
      profile.preferences.enabledTypes.push(ritualType);
    }
  }

  /**
   * 更新强度偏好
   */
  private updateIntensityPreference(profile: UserRitualProfile, intensity: RitualIntensity, response: ResponseTone): void {
    let preference = profile.adaptations.learnedPreferences.find(p => p.type === 'intensity_preference');
    
    if (!preference) {
      preference = {
        type: 'intensity_preference',
        value: RitualIntensity.MODERATE,
        confidence: 0.1,
        lastUpdated: Date.now()
      };
      profile.adaptations.learnedPreferences.push(preference);
    }

    const adjustment = this.getResponseAdjustment(response);

    if (adjustment > 0) {
      preference.value = Math.min(RitualIntensity.EPIC, Math.max(preference.value, intensity + 1));
    } else if (adjustment < 0) {
      preference.value = Math.max(RitualIntensity.SUBTLE, Math.min(preference.value, intensity - 1));
    } else {
      preference.value = intensity;
    }

    preference.confidence = Math.min(1, preference.confidence + 0.1);
    preference.lastUpdated = Date.now();
    
    profile.preferences.intensityLevel = Math.round(preference.value) as RitualIntensity;
  }

  /**
   * 获取反应调整值
   */
  private getResponseAdjustment(response: ResponseTone): number {
    const adjustments: Record<ResponseTone, number> = {
      positive: 1,
      neutral: 0,
      negative: -1,
      skipped: -1
    };
    
    return adjustments[response];
  }

  /**
   * 分析参与度模式
   */
  private analyzeEngagementPatterns(profile: UserRitualProfile, interactions: Interaction[]): void {
    const today = new Date().toISOString().split('T')[0];
    let todayMetric = profile.history.engagementMetrics.find(m => m.date === today);
    
    if (!todayMetric) {
      todayMetric = {
        date: today,
        ritualCount: 0,
        averageRating: 0,
        skipRate: 0,
        completionRate: 0
      };
      profile.history.engagementMetrics.push(todayMetric);
    }

    // 更新今日指标
    const todayInteractions = interactions.filter(i => 
      new Date(i.timestamp).toISOString().split('T')[0] === today
    );

    todayMetric.ritualCount = todayInteractions.length;
    
    const ratings = todayInteractions
      .map(i => i.response?.rating)
      .filter((rating): rating is number => typeof rating === 'number');
    
    if (ratings.length > 0) {
      todayMetric.averageRating = ratings.reduce((sum, r) => sum + r, 0) / ratings.length;
    }

    const skipped = todayInteractions.filter(i => i.response?.userResponse === 'skipped').length;
    todayMetric.skipRate = todayInteractions.length > 0 ? skipped / todayInteractions.length : 0;

    const completed = todayInteractions.filter(i => 
      i.response?.userResponse === 'positive' || i.response?.userResponse === 'neutral'
    ).length;
    todayMetric.completionRate = todayInteractions.length > 0 ? completed / todayInteractions.length : 0;
  }

  /**
   * 调整个性化设置
   */
  private adjustPersonalizationSettings(profile: UserRitualProfile): void {
    // 基于参与度调整设置
    const recentMetrics = profile.history.engagementMetrics.slice(-7); // 最近7天
    
    if (recentMetrics.length > 0) {
      const averageSkipRate = recentMetrics.reduce((sum, m) => sum + m.skipRate, 0) / recentMetrics.length;
      const averageRating = recentMetrics.reduce((sum, m) => sum + m.averageRating, 0) / recentMetrics.length;
      
      // 如果跳过率高或评分低，降低强度
      if (averageSkipRate > 0.4 || averageRating < 2.5) {
        profile.preferences.intensityLevel = Math.max(
          profile.preferences.intensityLevel - 1, 
          RitualIntensity.SUBTLE
        );
      }
      
      // 如果评分高且跳过率低，可以提高强度
      if (averageSkipRate < 0.1 && averageRating > 4) {
        profile.preferences.intensityLevel = Math.min(
          profile.preferences.intensityLevel + 1, 
          RitualIntensity.EPIC
        );
      }
    }
  }

  /**
   * 获取最近反馈
   */
  private getRecentFeedback(profile: UserRitualProfile, days: number): FeedbackEvent[] {
    const cutoff = Date.now() - (days * 24 * 60 * 60 * 1000);
    return profile.history.userFeedback.filter(f => f.timestamp > cutoff);
  }

  /**
   * 计算跳过率
   */
  private calculateSkipRate(profile: UserRitualProfile): number {
    const recentRituals = profile.history.triggeredRituals.slice(-20); // 最近20个仪式
    if (recentRituals.length === 0) return 0;
    
    const skipped = recentRituals.filter(r => r.userResponse === 'skipped').length;
    return skipped / recentRituals.length;
  }

  /**
   * 获取基于时间的推荐
   */
  private getTimeBasedRecommendations(profile: UserRitualProfile, context: Context): RitualMoment[] {
    const recommendations: RitualMoment[] = [];
    
    // 基于一天中的时间推荐
    if (context.timeOfDay >= 8 && context.timeOfDay <= 10) {
      // 早晨时间，推荐欢迎仪式
      recommendations.push({
        type: RitualType.WELCOME,
        intensity: RitualIntensity.MODERATE,
        timing: Date.now() + 5000, // 5秒后
        context: { reason: 'morning_greeting' },
        confidence: 0.7
      });
    }
    
    return recommendations;
  }

  /**
   * 获取基于行为的推荐
   */
  private getBehaviorBasedRecommendations(profile: UserRitualProfile, context: Context): RitualMoment[] {
    const recommendations: RitualMoment[] = [];
    
    // 基于最近行为推荐
    if (context.recentActions.some(a => a.type === 'task_completed')) {
      recommendations.push({
        type: RitualType.ACHIEVEMENT,
        intensity: profile.preferences.intensityLevel,
        timing: Date.now() + 1000,
        context: { reason: 'task_completion_pattern' },
        confidence: 0.8
      });
    }
    
    return recommendations;
  }

  /**
   * 获取基于情境的推荐
   */
  private getContextualRecommendations(profile: UserRitualProfile, context: Context): RitualMoment[] {
    const recommendations: RitualMoment[] = [];
    
    // 基于会话时长推荐
    if (context.sessionDuration > 30 * 60 * 1000) { // 超过30分钟
      recommendations.push({
        type: RitualType.TRANSITION,
        intensity: RitualIntensity.SUBTLE,
        timing: Date.now() + 10000,
        context: { reason: 'long_session_break' },
        confidence: 0.6
      });
    }
    
    return recommendations;
  }

  /**
   * 记录仪式事件
   */
  recordRitualEvent(userId: string, event: RitualEvent): void {
    const profile = this.userProfiles.get(userId);
    if (profile) {
      profile.history.triggeredRituals.push(event);
      
      // 保持历史记录在合理范围内
      if (profile.history.triggeredRituals.length > 1000) {
        profile.history.triggeredRituals = profile.history.triggeredRituals.slice(-500);
      }
    }
  }

  /**
   * 记录用户反馈
   */
  recordUserFeedback(userId: string, feedback: FeedbackEvent): void {
    const profile = this.userProfiles.get(userId);
    if (profile) {
      profile.history.userFeedback.push(feedback);
      
      // 保持反馈记录在合理范围内
      if (profile.history.userFeedback.length > 500) {
        profile.history.userFeedback = profile.history.userFeedback.slice(-250);
      }
    }
  }

  /**
   * 获取用户档案
   */
  getUserProfile(userId: string): UserRitualProfile | null {
    return this.userProfiles.get(userId) || null;
  }

  /**
   * 设置学习开关
   */
  setLearningEnabled(enabled: boolean): void {
    this.learningEnabled = enabled;
  }

  /**
   * 设置适应速度
   */
  setAdaptationSpeed(speed: number): void {
    this.adaptationSpeed = Math.max(0.01, Math.min(1, speed));
  }

  /**
   * 清除用户数据
   */
  clearUserData(userId: string): void {
    this.userProfiles.delete(userId);
  }

  /**
   * 导出用户档案
   */
  exportUserProfile(userId: string): string | null {
    const profile = this.userProfiles.get(userId);
    return profile ? JSON.stringify(profile, null, 2) : null;
  }

  /**
   * 导入用户档案
   */
  importUserProfile(profileJson: string): boolean {
    try {
      const profile: UserRitualProfile = JSON.parse(profileJson);
      this.userProfiles.set(profile.userId, profile);
      return true;
    } catch (error) {
      console.error('Failed to import user profile:', error);
      return false;
    }
  }

  /**
   * 销毁引擎
   */
  destroy(): void {
    this.userProfiles.clear();
  }
}
