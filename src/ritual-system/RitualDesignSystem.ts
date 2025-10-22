/**
 * 仪式感设计系统 - 主要集成类
 * 整合所有子系统，提供统一的API接口
 */

import { RitualDetector } from './core/RitualDetector';
import { VisualRitualOrchestrator, RitualStyle } from './visual/VisualRitualOrchestrator';
import { AnimationRitualSystem, EntranceStyle, Achievement, Task, Page } from './animation/AnimationRitualSystem';
import { AudioRitualManager, Mood } from './audio/AudioRitualManager';
import { PersonalizedRitualEngine, UserRitualProfile, ResponseTone } from './personalization/PersonalizedRitualEngine';
import { RitualConfigurationManager } from './config/RitualConfiguration';
import { RitualType, RitualIntensity, User, UserAction } from './types';

type ShareChannel = 'weibo' | 'email' | null;

// 系统配置接口
export interface RitualSystemConfig {
  enableVisual: boolean;
  enableAudio: boolean;
  enableAnimation: boolean;
  enablePersonalization: boolean;
  performanceMode: 'low' | 'medium' | 'high' | 'auto';
  culturalAdaptation: boolean;
  accessibilityMode: boolean;
}

// 系统状态接口
export interface RitualSystemStatus {
  initialized: boolean;
  activeRituals: number;
  performanceMetrics: {
    fps: number;
    memoryUsage: number;
    activeAnimations: number;
  };
  userProfiles: number;
  configurations: number;
}

// 仪式执行结果
export interface RitualExecutionResult {
  success: boolean;
  ritualType: RitualType;
  intensity: RitualIntensity;
  duration: number;
  components: {
    visual: boolean;
    audio: boolean;
    animation: boolean;
  };
  error?: string;
  shareChannel?: 'weibo' | 'email';
}

/**
 * 仪式感设计系统主类
 * 统一管理所有仪式感相关功能
 */
export class RitualDesignSystem {
  private detector: RitualDetector;
  private visualOrchestrator: VisualRitualOrchestrator;
  private animationSystem: AnimationRitualSystem;
  private audioManager: AudioRitualManager;
  private personalizationEngine: PersonalizedRitualEngine;
  private configManager: RitualConfigurationManager;
  
  private config: RitualSystemConfig;
  private initialized = false;
  private activeRituals = 0;

  constructor(config: Partial<RitualSystemConfig> = {}) {
    this.config = {
      enableVisual: true,
      enableAudio: true,
      enableAnimation: true,
      enablePersonalization: true,
      performanceMode: 'auto',
      culturalAdaptation: true,
      accessibilityMode: false,
      ...config
    };

    this.initializeSubsystems();
  }

  private maybeUnrefTimer(handle: ReturnType<typeof setTimeout>): void {
    if (typeof handle === 'object' && handle !== null && 'unref' in handle && typeof (handle as NodeJS.Timeout).unref === 'function') {
      (handle as NodeJS.Timeout).unref();
    }
  }

  /**
   * 初始化所有子系统
   */
  private initializeSubsystems(): void {
    try {
      // 核心检测系统
      this.detector = new RitualDetector();

      // 视觉系统
      if (this.config.enableVisual) {
        this.visualOrchestrator = new VisualRitualOrchestrator();
      }

      // 动画系统
      if (this.config.enableAnimation) {
        this.animationSystem = new AnimationRitualSystem();
      }

      // 音频系统
      if (this.config.enableAudio) {
        this.audioManager = new AudioRitualManager();
      }

      // 个性化系统
      if (this.config.enablePersonalization) {
        this.personalizationEngine = new PersonalizedRitualEngine();
      }

      // 配置管理系统
      this.configManager = new RitualConfigurationManager();

      this.initialized = true;
      console.log('🎭 Ritual Design System initialized successfully');
    } catch (error) {
      console.error('Failed to initialize Ritual Design System:', error);
      throw error;
    }
  }

  /**
   * 处理用户行为，检测并执行仪式感
   */
  async processUserAction(user: User, action: UserAction): Promise<RitualExecutionResult> {
    if (!this.initialized) {
      throw new Error('Ritual Design System not initialized');
    }

    try {
      this.activeRituals++;

      // 1. 检测仪式感时刻
      const detection = await this.detector.detectRitualMoment(user, action);
      
      if (!detection.shouldTrigger) {
        return {
          success: false,
          ritualType: detection.ritualType || RitualType.WELCOME,
          intensity: detection.intensity,
          duration: 0,
          components: { visual: false, audio: false, animation: false },
          error: detection.reason,
          shareChannel: detection.ritualType === RitualType.SHARING ? this.getShareChannelFromAction(action) ?? undefined : undefined
        };
      }

      const shareChannel = this.getShareChannelFromAction(action);

      // 2. 个性化调整
      let intensity = detection.intensity;
      if (this.personalizationEngine) {
        intensity = this.personalizationEngine.adaptRitualIntensity(intensity, user);
      }

      // 3. 执行仪式感组件
      const startTime = Date.now();
      const components = { visual: false, audio: false, animation: false };

      // 并行执行各个组件
      const promises: Promise<void>[] = [];

      // 视觉效果
      if (this.visualOrchestrator && this.config.enableVisual) {
        promises.push(this.executeVisualRitual(detection.ritualType!, intensity, shareChannel).then(() => {
          components.visual = true;
        }));
      }

      // 音频效果
      if (this.audioManager && this.config.enableAudio) {
        const shouldSkipAudio = detection.ritualType === RitualType.SHARING && shareChannel === 'weibo';
        if (!shouldSkipAudio) {
          promises.push(this.executeAudioRitual(detection.ritualType!, intensity, shareChannel).then(() => {
            components.audio = true;
          }));
        }
      }

      // 动画效果
      if (this.animationSystem && this.config.enableAnimation) {
        promises.push(this.executeAnimationRitual(detection.ritualType!, intensity, action).then(() => {
          components.animation = true;
        }));
      }

      // 等待所有组件完成
      await Promise.allSettled(promises);

      const duration = Date.now() - startTime;

      // 4. 记录执行结果用于个性化学习
      if (this.personalizationEngine) {
        this.personalizationEngine.recordRitualEvent(user.id, {
          id: `ritual-${Date.now()}`,
          type: detection.ritualType!,
          intensity,
          timestamp: Date.now(),
          duration,
          userResponse: 'neutral' as ResponseTone // 默认中性，实际应该从用户交互中获取
        });
      }

      return {
        success: true,
        ritualType: detection.ritualType!,
        intensity,
        duration,
        components,
        shareChannel: detection.ritualType === RitualType.SHARING && shareChannel ? shareChannel : undefined
      };

    } catch (error) {
      console.error('Error executing ritual:', error);
      return {
        success: false,
        ritualType: RitualType.WELCOME,
        intensity: RitualIntensity.SUBTLE,
        duration: 0,
        components: { visual: false, audio: false, animation: false },
        error: (error as Error).message
      };
    } finally {
      this.activeRituals--;
    }
  }

  /**
   * 执行视觉仪式
   */
  private async executeVisualRitual(type: RitualType, intensity: RitualIntensity, shareChannel: ShareChannel): Promise<void> {
    if (!this.visualOrchestrator || !this.hasDOMSupport()) return;

    const scene = this.visualOrchestrator.createRitualScene(type, intensity, { shareChannel });
    
    // 应用视觉效果到页面元素
    const targetElement = document.body; // 或其他目标元素
    const style: RitualStyle = {
      colorTheme: this.getColorThemeForType(type, shareChannel),
      intensity,
      decorativeLevel: this.getDecorativeLevelForIntensity(intensity),
      culturalContext: this.config.culturalAdaptation ? 'neutral' : undefined,
      accessibilityMode: this.config.accessibilityMode
    };

    this.visualOrchestrator.applyRitualStyling(targetElement, style);

    // 清理场景
    const cleanupTimeout = setTimeout(() => {
      this.visualOrchestrator.cleanupScene(scene.id);
    }, scene.duration);

    this.maybeUnrefTimer(cleanupTimeout);
  }

  /**
   * 执行音频仪式
   */
  private async executeAudioRitual(type: RitualType, intensity: RitualIntensity, shareChannel: ShareChannel): Promise<void> {
    if (!this.audioManager || typeof Audio === 'undefined') return;

    // 播放仪式音效
    this.audioManager.playRitualSound(type, intensity);

    // 根据类型设置环境音乐
    const mood = this.getMoodForType(type, shareChannel);
    if (mood) {
      this.audioManager.createAmbientAtmosphere(mood);
    }
  }

  /**
   * 执行动画仪式
   */
  private async executeAnimationRitual(type: RitualType, intensity: RitualIntensity, _action: UserAction): Promise<void> {
    if (!this.animationSystem || !this.hasDOMSupport()) return;

    switch (type) {
      case RitualType.WELCOME:
        const element = document.querySelector('.ritual-target') || document.body;
        await this.animationSystem.playEntranceRitual(element, EntranceStyle.DIVINE_DESCENT);
        break;

      case RitualType.ACHIEVEMENT:
        const achievement: Achievement = {
          id: 'temp-achievement',
          type: 'task',
          level: intensity,
          title: '成就达成',
          rarity: this.getRarityForIntensity(intensity)
        };
        await this.animationSystem.playCelebrationRitual(achievement);
        break;

      case RitualType.MILESTONE:
        const task: Task = {
          id: 'temp-task',
          title: '任务完成',
          type: 'milestone',
          difficulty: this.getDifficultyForIntensity(intensity)
        };
        await this.animationSystem.playCompletionRitual(task);
        break;

      case RitualType.TRANSITION:
        const fromPage: Page = { id: 'current', name: '当前页面', type: 'normal' };
        const toPage: Page = { id: 'next', name: '下一页面', type: 'normal' };
        await this.animationSystem.playTransitionRitual(fromPage, toPage);
        break;
    }
  }

  /**
   * 获取系统状态
   */
  getSystemStatus(): RitualSystemStatus {
    return {
      initialized: this.initialized,
      activeRituals: this.activeRituals,
      performanceMetrics: {
        fps: this.animationSystem?.getPerformanceMetrics().fps || 60,
        memoryUsage: 0, // 简化实现
        activeAnimations: this.animationSystem?.getPerformanceMetrics().animationCount || 0
      },
      userProfiles: this.personalizationEngine ? 1 : 0, // 简化实现
      configurations: this.configManager?.getAllConfigurations().length || 0
    };
  }

  /**
   * 更新系统配置
   */
  updateConfig(newConfig: Partial<RitualSystemConfig>): void {
    this.config = { ...this.config, ...newConfig };
    
    // 根据新配置调整子系统
    if (!newConfig.enableAudio && this.audioManager) {
      this.audioManager.stopAllSounds();
    }
    
    if (!newConfig.enableAnimation && this.animationSystem) {
      this.animationSystem.cancelAllAnimations();
    }
  }

  /**
   * 获取用户个性化档案
   */
  getUserProfile(userId: string): UserRitualProfile | null {
    return this.personalizationEngine?.getUserProfile(userId) || null;
  }

  /**
   * 记录用户反馈
   */
  recordUserFeedback(userId: string, ritualId: string, rating: number, feedback: string): void {
    if (this.personalizationEngine) {
      this.personalizationEngine.recordUserFeedback(userId, {
        ritualId,
        rating,
        feedback,
        timestamp: Date.now()
      });
    }
  }

  /**
   * 判断当前环境是否具备DOM支持
   */
  private hasDOMSupport(): boolean {
    return typeof window !== 'undefined' && typeof document !== 'undefined';
  }

  /**
   * 获取配置管理器
   */
  getConfigurationManager(): RitualConfigurationManager {
    return this.configManager;
  }

  /**
   * 辅助方法：根据类型获取颜色主题
   */
  private getColorThemeForType(type: RitualType, shareChannel: ShareChannel): 'gold' | 'purple' | 'blue' | 'divine' {
    if (type === RitualType.SHARING) {
      if (shareChannel === 'email') {
        return 'gold';
      }
      if (shareChannel === 'weibo') {
        return 'divine';
      }
    }

    const themeMap: Record<RitualType, 'gold' | 'purple' | 'blue' | 'divine'> = {
      [RitualType.WELCOME]: 'gold',
      [RitualType.ACHIEVEMENT]: 'purple',
      [RitualType.CREATION]: 'blue',
      [RitualType.SHARING]: 'divine',
      [RitualType.MILESTONE]: 'divine',
      [RitualType.TRANSITION]: 'gold'
    };
    return themeMap[type];
  }

  /**
   * 辅助方法：根据强度获取装饰等级
   */
  private getDecorativeLevelForIntensity(intensity: RitualIntensity): 'minimal' | 'moderate' | 'ornate' | 'epic' {
    const levelMap: Record<RitualIntensity, 'minimal' | 'moderate' | 'ornate' | 'epic'> = {
      [RitualIntensity.SUBTLE]: 'minimal',
      [RitualIntensity.MODERATE]: 'moderate',
      [RitualIntensity.DRAMATIC]: 'ornate',
      [RitualIntensity.EPIC]: 'epic'
    };
    return levelMap[intensity];
  }

  /**
   * 辅助方法：根据类型获取心情
   */
  private getMoodForType(type: RitualType, shareChannel: ShareChannel): Mood | null {
    if (type === RitualType.SHARING) {
      if (shareChannel === 'email') {
        return Mood.CALM;
      }
      if (shareChannel === 'weibo') {
        return Mood.ENERGETIC;
      }
    }

    const moodMap: Record<RitualType, Mood | null> = {
      [RitualType.WELCOME]: Mood.CALM,
      [RitualType.ACHIEVEMENT]: Mood.CELEBRATORY,
      [RitualType.CREATION]: Mood.MYSTICAL,
      [RitualType.SHARING]: Mood.ENERGETIC,
      [RitualType.MILESTONE]: Mood.CELEBRATORY,
      [RitualType.TRANSITION]: null
    };
    return moodMap[type];
  }

  private getShareChannelFromAction(action: UserAction): ShareChannel {
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
   * 辅助方法：根据强度获取稀有度
   */
  private getRarityForIntensity(intensity: RitualIntensity): 'common' | 'rare' | 'epic' | 'legendary' {
    const rarityMap: Record<RitualIntensity, 'common' | 'rare' | 'epic' | 'legendary'> = {
      [RitualIntensity.SUBTLE]: 'common',
      [RitualIntensity.MODERATE]: 'rare',
      [RitualIntensity.DRAMATIC]: 'epic',
      [RitualIntensity.EPIC]: 'legendary'
    };
    return rarityMap[intensity];
  }

  /**
   * 辅助方法：根据强度获取难度
   */
  private getDifficultyForIntensity(intensity: RitualIntensity): 'easy' | 'medium' | 'hard' | 'expert' {
    const difficultyMap: Record<RitualIntensity, 'easy' | 'medium' | 'hard' | 'expert'> = {
      [RitualIntensity.SUBTLE]: 'easy',
      [RitualIntensity.MODERATE]: 'medium',
      [RitualIntensity.DRAMATIC]: 'hard',
      [RitualIntensity.EPIC]: 'expert'
    };
    return difficultyMap[intensity];
  }

  /**
   * 销毁系统
   */
  destroy(): void {
    if (this.detector) {
      // RitualDetector 没有 destroy 方法，但可以清理资源
    }

    if (this.visualOrchestrator) {
      this.visualOrchestrator.destroy();
    }

    if (this.animationSystem) {
      this.animationSystem.destroy();
    }

    if (this.audioManager) {
      this.audioManager.destroy();
    }

    if (this.personalizationEngine) {
      this.personalizationEngine.destroy();
    }

    if (this.configManager) {
      this.configManager.destroy();
    }

    this.initialized = false;
    console.log('🎭 Ritual Design System destroyed');
  }
}

// 导出单例实例
let ritualSystemInstance: RitualDesignSystem | null = null;

/**
 * 获取仪式感设计系统单例实例
 */
export function getRitualSystem(config?: Partial<RitualSystemConfig>): RitualDesignSystem {
  if (!ritualSystemInstance) {
    ritualSystemInstance = new RitualDesignSystem(config);
  }
  return ritualSystemInstance;
}

/**
 * 销毁单例实例
 */
export function destroyRitualSystem(): void {
  if (ritualSystemInstance) {
    ritualSystemInstance.destroy();
    ritualSystemInstance = null;
  }
}
