/**
 * 动画仪式系统 - 创建具有仪式感的动画效果
 */

import { RitualIntensity } from '../types';

// 入场样式枚举
export enum EntranceStyle {
  FADE_IN = 'fade-in',
  SCALE_IN = 'scale-in',
  SLIDE_UP = 'slide-up',
  SLIDE_DOWN = 'slide-down',
  SPIRAL_IN = 'spiral-in',
  DIVINE_DESCENT = 'divine-descent',
  GOLDEN_EMERGENCE = 'golden-emergence'
}

// 动画配置接口
export interface AnimationConfig {
  duration: number;
  easing: string;
  delay?: number;
  iterations?: number | 'infinite';
  direction?: 'normal' | 'reverse' | 'alternate' | 'alternate-reverse';
  fillMode?: 'none' | 'forwards' | 'backwards' | 'both';
}

// 成就信息接口
export interface Achievement {
  id: string;
  type: string;
  level: number;
  title: string;
  description?: string;
  icon?: string;
  rarity?: 'common' | 'rare' | 'epic' | 'legendary';
}

// 任务信息接口
export interface Task {
  id: string;
  title: string;
  type: string;
  difficulty: 'easy' | 'medium' | 'hard' | 'expert';
  completionTime?: number;
  points?: number;
}

// 页面信息接口
export interface Page {
  id: string;
  name: string;
  type: string;
  importance?: 'low' | 'medium' | 'high' | 'critical';
}

// 动画事件接口
export interface AnimationEvent {
  type: 'start' | 'end' | 'iteration' | 'cancel';
  animationName: string;
  elapsedTime: number;
  target: Element;
}

// 性能监控接口
export interface PerformanceMetrics {
  fps: number;
  frameDrops: number;
  memoryUsage: number;
  animationCount: number;
  averageFrameTime: number;
}

export class AnimationRitualSystem {
  private activeAnimations: Map<string, Animation> = new Map();
  private performanceMonitor: PerformanceMonitor;
  private animationQueue: AnimationQueueItem[] = [];
  private isProcessingQueue = false;
  private stylesInitialized = false;
  private readonly hasDocument: boolean;
  private readonly isRealDomEnvironment: boolean;

  constructor() {
    this.hasDocument = typeof document !== 'undefined';
    this.isRealDomEnvironment = typeof window !== 'undefined' && this.hasDocument;
    this.performanceMonitor = new PerformanceMonitor(this.isRealDomEnvironment);
    if (this.hasDocument) {
      Promise.resolve().then(() => this.initializeAnimationStyles());
    }
  }

  private maybeUnref(handle: ReturnType<typeof setTimeout> | ReturnType<typeof setInterval>): void {
    if (typeof handle === 'object' && handle !== null && 'unref' in handle && typeof (handle as NodeJS.Timeout).unref === 'function') {
      (handle as NodeJS.Timeout).unref();
    }
  }

  /**
   * 初始化动画样式
   */
  private initializeAnimationStyles(): void {
    if (!this.hasDocument || this.stylesInitialized || typeof document.createElement !== 'function') {
      return;
    }

    const styleSheet = document.createElement('style');
    if (!styleSheet) {
      return;
    }

    if (typeof styleSheet.setAttribute === 'function') {
      styleSheet.setAttribute('data-ritual-animation', 'true');
    }

    if (typeof styleSheet.textContent === 'string') {
      styleSheet.textContent = this.generateAnimationCSS();
    } else {
      styleSheet.textContent = this.generateAnimationCSS();
    }

    if (document.head && typeof document.head.appendChild === 'function') {
      document.head.appendChild(styleSheet);
    }

    this.stylesInitialized = true;
  }

  /**
   * 播放入场仪式动画
   */
  async playEntranceRitual(element: Element, style: EntranceStyle): Promise<void> {
    if (!element) {
      throw new Error('Element is required for entrance ritual');
    }

    const animationId = `entrance-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    try {
      this.performanceMonitor.startTracking(animationId);
      
      const config = this.getEntranceAnimationConfig(style);
      const keyframes = this.generateEntranceKeyframes(style);
      
      const animation = element.animate(keyframes, {
        duration: config.duration,
        easing: config.easing,
        delay: config.delay || 0,
        fill: 'forwards'
      });

      this.activeAnimations.set(animationId, animation);

      // 添加事件监听
      animation.addEventListener('finish', () => {
        this.onAnimationComplete(animationId, 'entrance', element);
      });

      animation.addEventListener('cancel', () => {
        this.onAnimationCancel(animationId, element);
      });

      await animation.finished;
      
    } catch (error) {
      this.logError('Entrance ritual animation failed:', error);
      throw error;
    } finally {
      this.performanceMonitor.stopTracking(animationId);
      this.activeAnimations.delete(animationId);
    }
  }

  /**
   * 播放庆祝仪式动画
   */
  async playCelebrationRitual(achievement: Achievement): Promise<void> {
    const animationId = `celebration-${achievement.id}-${Date.now()}`;
    
    try {
      this.performanceMonitor.startTracking(animationId);
      
      // 创建庆祝容器
      const container = this.createCelebrationContainer(achievement);
      this.appendToBody(container);
      const containerParent = container.parentNode;

      // 根据成就稀有度选择庆祝强度
      const intensity = this.getAchievementIntensity(achievement);
      
      // 执行多层庆祝动画
      const animationResults = await Promise.all([
        this.playParticleExplosion(container, intensity),
        this.playAchievementBadge(container, achievement),
        this.playTextCelebration(container, achievement),
        this.playSoundEffect(achievement.rarity || 'common')
      ]);

      // 等待所有动画完成
      const playableAnimations = animationResults.filter((anim): anim is Animation => !!anim && typeof (anim as Animation).finished !== 'undefined');
      await Promise.all(playableAnimations.map(anim => anim.finished));

      // 清理
      const removalTimeout = setTimeout(() => {
        const targetParent = containerParent || container.parentNode;
        if (targetParent && typeof targetParent.removeChild === 'function') {
          targetParent.removeChild(container);
        }
      }, 1000);

      this.maybeUnref(removalTimeout);

    } catch (error) {
      this.logError('Celebration ritual animation failed:', error);
      throw error;
    } finally {
      this.performanceMonitor.stopTracking(animationId);
    }
  }

  /**
   * 播放过渡仪式动画
   */
  async playTransitionRitual(from: Page, to: Page): Promise<void> {
    const animationId = `transition-${from.id}-${to.id}-${Date.now()}`;
    
    try {
      this.performanceMonitor.startTracking(animationId);
      
      const transitionType = this.getTransitionType(from, to);
      const config = this.getTransitionConfig(transitionType);
      
      // 创建过渡遮罩
      const overlay = this.createTransitionOverlay(transitionType);
      this.appendToBody(overlay);
      const overlayParent = overlay.parentNode;

      // 执行过渡动画序列
      await this.executeTransitionSequence(overlay, config);

      const targetParent = overlayParent || overlay.parentNode;
      if (targetParent && typeof targetParent.removeChild === 'function') {
        targetParent.removeChild(overlay);
      }

    } catch (error) {
      this.logError('Transition ritual animation failed:', error);
      throw error;
    } finally {
      this.performanceMonitor.stopTracking(animationId);
    }
  }

  /**
   * 播放完成仪式动画
   */
  async playCompletionRitual(task: Task): Promise<void> {
    const animationId = `completion-${task.id}-${Date.now()}`;
    
    try {
      this.performanceMonitor.startTracking(animationId);
      
      const intensity = this.getTaskCompletionIntensity(task);
      
      // 创建完成效果容器
      const container = this.createCompletionContainer(task);
      this.appendToBody(container);
      const completionParent = container.parentNode;

      // 执行完成动画序列
      const animations = [
        this.playCheckmarkAnimation(container, intensity),
        this.playSuccessGlow(container, intensity),
        this.playCompletionParticles(container, intensity)
      ];

      const resolvedAnimations = animations.filter((anim): anim is Animation => !!anim && typeof (anim as Animation).finished !== 'undefined');
      await Promise.all(resolvedAnimations.map(anim => anim.finished));

      // 延迟清理
      const cleanupTimeout = setTimeout(() => {
        const targetParent = completionParent || container.parentNode;
        if (targetParent && typeof targetParent.removeChild === 'function') {
          targetParent.removeChild(container);
        }
      }, 2000);

      this.maybeUnref(cleanupTimeout);

    } catch (error) {
      this.logError('Completion ritual animation failed:', error);
      throw error;
    } finally {
      this.performanceMonitor.stopTracking(animationId);
    }
  }

  /**
   * 获取入场动画配置
   */
  private getEntranceAnimationConfig(style: EntranceStyle): AnimationConfig {
    const configs: Record<EntranceStyle, AnimationConfig> = {
      [EntranceStyle.FADE_IN]: {
        duration: 800,
        easing: 'ease-out'
      },
      [EntranceStyle.SCALE_IN]: {
        duration: 600,
        easing: 'cubic-bezier(0.34, 1.56, 0.64, 1)'
      },
      [EntranceStyle.SLIDE_UP]: {
        duration: 700,
        easing: 'cubic-bezier(0.25, 0.46, 0.45, 0.94)'
      },
      [EntranceStyle.SLIDE_DOWN]: {
        duration: 700,
        easing: 'cubic-bezier(0.25, 0.46, 0.45, 0.94)'
      },
      [EntranceStyle.SPIRAL_IN]: {
        duration: 1200,
        easing: 'cubic-bezier(0.68, -0.55, 0.265, 1.55)'
      },
      [EntranceStyle.DIVINE_DESCENT]: {
        duration: 1500,
        easing: 'cubic-bezier(0.23, 1, 0.32, 1)'
      },
      [EntranceStyle.GOLDEN_EMERGENCE]: {
        duration: 1000,
        easing: 'cubic-bezier(0.175, 0.885, 0.32, 1.275)'
      }
    };

    return configs[style];
  }

  /**
   * 生成入场动画关键帧
   */
  private generateEntranceKeyframes(style: EntranceStyle): Keyframe[] {
    const keyframes: Record<EntranceStyle, Keyframe[]> = {
      [EntranceStyle.FADE_IN]: [
        { opacity: 0, transform: 'translateY(20px)' },
        { opacity: 1, transform: 'translateY(0)' }
      ],
      [EntranceStyle.SCALE_IN]: [
        { opacity: 0, transform: 'scale(0.3)' },
        { opacity: 1, transform: 'scale(1)' }
      ],
      [EntranceStyle.SLIDE_UP]: [
        { opacity: 0, transform: 'translateY(100%)' },
        { opacity: 1, transform: 'translateY(0)' }
      ],
      [EntranceStyle.SLIDE_DOWN]: [
        { opacity: 0, transform: 'translateY(-100%)' },
        { opacity: 1, transform: 'translateY(0)' }
      ],
      [EntranceStyle.SPIRAL_IN]: [
        { opacity: 0, transform: 'scale(0) rotate(180deg)' },
        { opacity: 0.5, transform: 'scale(0.5) rotate(90deg)', offset: 0.6 },
        { opacity: 1, transform: 'scale(1) rotate(0deg)' }
      ],
      [EntranceStyle.DIVINE_DESCENT]: [
        { 
          opacity: 0, 
          transform: 'translateY(-200px) scale(0.5)', 
          filter: 'brightness(2) blur(10px)' 
        },
        { 
          opacity: 0.7, 
          transform: 'translateY(-50px) scale(0.8)', 
          filter: 'brightness(1.5) blur(5px)', 
          offset: 0.7 
        },
        { 
          opacity: 1, 
          transform: 'translateY(0) scale(1)', 
          filter: 'brightness(1) blur(0px)' 
        }
      ],
      [EntranceStyle.GOLDEN_EMERGENCE]: [
        { 
          opacity: 0, 
          transform: 'scale(0.1)', 
          filter: 'hue-rotate(45deg) saturate(2) brightness(2)' 
        },
        { 
          opacity: 0.8, 
          transform: 'scale(1.1)', 
          filter: 'hue-rotate(20deg) saturate(1.5) brightness(1.5)', 
          offset: 0.8 
        },
        { 
          opacity: 1, 
          transform: 'scale(1)', 
          filter: 'hue-rotate(0deg) saturate(1) brightness(1)' 
        }
      ]
    };

    return keyframes[style];
  }

  /**
   * 创建庆祝容器
   */
  private createCelebrationContainer(achievement: Achievement): HTMLElement {
    const container = document.createElement('div');
    container.className = 'ritual-celebration-container';
    if (typeof container.setAttribute === 'function') {
      if (achievement.type) {
        container.setAttribute('data-achievement-type', achievement.type);
      }
      if (achievement.rarity) {
        container.setAttribute('data-achievement-rarity', achievement.rarity);
      }
    }
    const style = this.ensureElementStyle(container);
    style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100vw;
      height: 100vh;
      pointer-events: none;
      z-index: 10000;
      display: flex;
      align-items: center;
      justify-content: center;
    `;

    return container;
  }

  /**
   * 播放粒子爆发动画
   */
  private async playParticleExplosion(container: HTMLElement, intensity: RitualIntensity): Promise<Animation | null> {
    const particleCount = this.getParticleCount(intensity);
    const particles: HTMLElement[] = [];

    for (let i = 0; i < particleCount; i++) {
      const particle = document.createElement('div');
      particle.className = 'ritual-particle';
      const particleStyle = this.ensureElementStyle(particle);
      particleStyle.cssText = `
        position: absolute;
        width: 4px;
        height: 4px;
        background: var(--ritual-gold);
        border-radius: 50%;
        top: 50%;
        left: 50%;
      `;
      
      container.appendChild(particle);
      particles.push(particle);
    }

    // 为每个粒子创建随机轨迹动画
    const animations = particles.map((particle, index) => {
      const angle = (360 / particleCount) * index;
      const distance = 100 + Math.random() * 200;
      const duration = 1000 + Math.random() * 500;

      const keyframes = [
        { 
          transform: 'translate(-50%, -50%) scale(0)',
          opacity: 1 
        },
        { 
          transform: `translate(-50%, -50%) translate(${Math.cos(angle * Math.PI / 180) * distance}px, ${Math.sin(angle * Math.PI / 180) * distance}px) scale(1)`,
          opacity: 1,
          offset: 0.7
        },
        { 
          transform: `translate(-50%, -50%) translate(${Math.cos(angle * Math.PI / 180) * distance * 1.5}px, ${Math.sin(angle * Math.PI / 180) * distance * 1.5}px) scale(0)`,
          opacity: 0 
        }
      ];

      return particle.animate(keyframes, {
        duration,
        easing: 'cubic-bezier(0.25, 0.46, 0.45, 0.94)',
        fill: 'forwards'
      });
    });

    return animations[0]; // 返回第一个动画作为代表
  }

  /**
   * 播放成就徽章动画
   */
  private async playAchievementBadge(container: HTMLElement, achievement: Achievement): Promise<Animation> {
    const badge = document.createElement('div');
    badge.className = 'ritual-achievement-badge';
    badge.innerHTML = `
      <div class="badge-icon">${achievement.icon || '🏆'}</div>
      <div class="badge-title">${achievement.title}</div>
    `;

    const badgeStyle = this.ensureElementStyle(badge);
    badgeStyle.cssText = `
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      background: var(--ritual-gradient-divine);
      border: 3px solid var(--ritual-gold);
      border-radius: 20px;
      padding: 2rem;
      text-align: center;
      color: white;
      font-family: var(--ritual-font-ceremonial);
      box-shadow: var(--ritual-shadow-epic);
    `;

    container.appendChild(badge);

    const keyframes = [
      { 
        opacity: 0, 
        transform: 'translate(-50%, -50%) scale(0) rotate(180deg)' 
      },
      { 
        opacity: 1, 
        transform: 'translate(-50%, -50%) scale(1.2) rotate(0deg)', 
        offset: 0.8 
      },
      { 
        opacity: 1, 
        transform: 'translate(-50%, -50%) scale(1) rotate(0deg)' 
      }
    ];

    return badge.animate(keyframes, {
      duration: 1200,
      easing: 'cubic-bezier(0.68, -0.55, 0.265, 1.55)',
      fill: 'forwards'
    });
  }

  /**
   * 播放文本庆祝动画
   */
  private async playTextCelebration(container: HTMLElement, achievement: Achievement): Promise<Animation> {
    const text = document.createElement('div');
    text.className = 'ritual-celebration-text';
    const celebrationTitle = achievement.title ? `恭喜获得 ${achievement.title}!` : '恭喜获得成就！';
    text.textContent = celebrationTitle;
    
    const textStyle = this.ensureElementStyle(text);
    textStyle.cssText = `
      position: absolute;
      top: 30%;
      left: 50%;
      transform: translate(-50%, -50%);
      font-family: var(--ritual-font-ceremonial);
      font-size: 2rem;
      font-weight: bold;
      color: var(--ritual-gold);
      text-shadow: var(--ritual-text-shadow-glow);
      white-space: nowrap;
    `;

    container.appendChild(text);

    const keyframes = [
      { 
        opacity: 0, 
        transform: 'translate(-50%, -50%) translateY(50px) scale(0.5)' 
      },
      { 
        opacity: 1, 
        transform: 'translate(-50%, -50%) translateY(0) scale(1)' 
      }
    ];

    return text.animate(keyframes, {
      duration: 800,
      easing: 'cubic-bezier(0.34, 1.56, 0.64, 1)',
      delay: 300,
      fill: 'forwards'
    });
  }

  /**
   * 播放音效
   */
  private async playSoundEffect(_rarity: string): Promise<void> {
    // 这里应该集成音频系统
    // 暂时返回Promise.resolve()作为占位符
    return Promise.resolve();
  }

  /**
   * 获取成就强度
   */
  private getAchievementIntensity(achievement: Achievement): RitualIntensity {
    const rarityIntensity: Record<string, RitualIntensity> = {
      'common': RitualIntensity.SUBTLE,
      'rare': RitualIntensity.MODERATE,
      'epic': RitualIntensity.DRAMATIC,
      'legendary': RitualIntensity.EPIC
    };

    return rarityIntensity[achievement.rarity || 'common'];
  }

  /**
   * 获取粒子数量
   */
  private getParticleCount(intensity: RitualIntensity): number {
    const counts: Record<RitualIntensity, number> = {
      [RitualIntensity.SUBTLE]: 8,
      [RitualIntensity.MODERATE]: 16,
      [RitualIntensity.DRAMATIC]: 32,
      [RitualIntensity.EPIC]: 64
    };

    return counts[intensity];
  }

  /**
   * 创建过渡遮罩
   */
  private createTransitionOverlay(transitionType: string): HTMLElement {
    const overlay = document.createElement('div');
    overlay.className = `ritual-transition-overlay ritual-transition-${transitionType}`;
    const overlayStyle = this.ensureElementStyle(overlay);
    overlayStyle.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100vw;
      height: 100vh;
      z-index: 9999;
      pointer-events: none;
      background: var(--ritual-gradient-divine);
      opacity: 0;
    `;

    return overlay;
  }

  /**
   * 获取过渡类型
   */
  private getTransitionType(from: Page, to: Page): string {
    // 根据页面重要性和类型决定过渡效果
    if (to.importance === 'critical') {
      return 'divine';
    } else if (from.type !== to.type) {
      return 'cross-fade';
    } else {
      return 'slide';
    }
  }

  /**
   * 获取过渡配置
   */
  private getTransitionConfig(transitionType: string): AnimationConfig {
    const configs: Record<string, AnimationConfig> = {
      'divine': { duration: 1200, easing: 'cubic-bezier(0.23, 1, 0.32, 1)' },
      'cross-fade': { duration: 800, easing: 'ease-in-out' },
      'slide': { duration: 600, easing: 'cubic-bezier(0.25, 0.46, 0.45, 0.94)' }
    };

    return configs[transitionType] || configs['cross-fade'];
  }

  /**
   * 执行过渡动画序列
   */
  private async executeTransitionSequence(overlay: HTMLElement, config: AnimationConfig): Promise<void> {
    // 淡入
    const fadeIn = overlay.animate([
      { opacity: 0 },
      { opacity: 0.8 }
    ], {
      duration: config.duration / 2,
      easing: config.easing,
      fill: 'forwards'
    });

    await fadeIn.finished;

    // 短暂停留
    await new Promise<void>(resolve => {
      const timer = setTimeout(resolve, 100);
      this.maybeUnref(timer);
    });

    // 淡出
    const fadeOut = overlay.animate([
      { opacity: 0.8 },
      { opacity: 0 }
    ], {
      duration: config.duration / 2,
      easing: config.easing,
      fill: 'forwards'
    });

    await fadeOut.finished;
  }

  /**
   * 创建完成容器
   */
  private createCompletionContainer(task: Task): HTMLElement {
    const container = document.createElement('div');
    container.className = 'ritual-completion-container';
    if (typeof container.setAttribute === 'function') {
      container.setAttribute('data-task-id', task.id);
      if (task.type) {
        container.setAttribute('data-task-type', task.type);
      }
    }
    const containerStyle = this.ensureElementStyle(container);
    containerStyle.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      width: 300px;
      height: 100px;
      z-index: 9998;
      pointer-events: none;
      display: flex;
      align-items: center;
      justify-content: center;
      background: rgba(0, 0, 0, 0.8);
      border-radius: 12px;
      backdrop-filter: blur(10px);
    `;

    return container;
  }

  /**
   * 播放勾选动画
   */
  private playCheckmarkAnimation(container: HTMLElement, intensity: RitualIntensity): Animation {
    const checkmark = document.createElement('div');
    checkmark.innerHTML = '✓';
    const checkmarkStyle = this.ensureElementStyle(checkmark);
    checkmarkStyle.cssText = `
      font-size: 2rem;
      color: var(--ritual-emerald);
      font-weight: bold;
      margin-right: 1rem;
    `;

    container.appendChild(checkmark);

    const keyframes = [
      { opacity: 0, transform: 'scale(0) rotate(180deg)' },
      { opacity: 1, transform: 'scale(1.2) rotate(0deg)', offset: 0.8 },
      { opacity: 1, transform: 'scale(1) rotate(0deg)' }
    ];

    const duration = intensity >= RitualIntensity.DRAMATIC ? 750 : 600;

    return checkmark.animate(keyframes, {
      duration,
      easing: 'cubic-bezier(0.68, -0.55, 0.265, 1.55)',
      fill: 'forwards'
    });
  }

  /**
   * 播放成功光效
   */
  private playSuccessGlow(container: HTMLElement, intensity: RitualIntensity): Animation {
    const glow = document.createElement('div');
    const glowStyle = this.ensureElementStyle(glow);
    const baseOpacity = intensity >= RitualIntensity.DRAMATIC ? 0.75 : 0.6;
    glowStyle.cssText = `
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      border-radius: inherit;
      background: var(--ritual-emerald-glow);
      opacity: 0;
    `;

    container.appendChild(glow);

    const keyframes = [
      { opacity: 0, transform: 'scale(1)' },
      { opacity: baseOpacity, transform: 'scale(1.1)', offset: 0.5 },
      { opacity: 0, transform: 'scale(1.2)' }
    ];

    const duration = intensity >= RitualIntensity.EPIC ? 1300 : 1000;

    return glow.animate(keyframes, {
      duration,
      easing: 'ease-out',
      fill: 'forwards'
    });
  }

  /**
   * 播放完成粒子
   */
  private playCompletionParticles(container: HTMLElement, intensity: RitualIntensity): Animation | null {
    if (intensity < RitualIntensity.MODERATE) {
      return null;
    }

    const particleCount = 6;
    const particles: HTMLElement[] = [];

    for (let i = 0; i < particleCount; i++) {
      const particle = document.createElement('div');
      const particleStyle = this.ensureElementStyle(particle);
      particleStyle.cssText = `
        position: absolute;
        width: 3px;
        height: 3px;
        background: var(--ritual-emerald);
        border-radius: 50%;
        top: 50%;
        left: 50%;
      `;
      
      container.appendChild(particle);
      particles.push(particle);
    }

    // 为粒子创建动画
    particles.forEach((particle, index) => {
      const angle = (360 / particleCount) * index;
      const distance = 50;

      const keyframes = [
        { 
          transform: 'translate(-50%, -50%)',
          opacity: 1 
        },
        { 
          transform: `translate(-50%, -50%) translate(${Math.cos(angle * Math.PI / 180) * distance}px, ${Math.sin(angle * Math.PI / 180) * distance}px)`,
          opacity: 0 
        }
      ];

      particle.animate(keyframes, {
        duration: 800,
        easing: 'ease-out',
        delay: 200,
        fill: 'forwards'
      });
    });

    return particles[0]?.animate([], { duration: 1000 }) || null;
  }

  /**
   * 获取任务完成强度
   */
  private getTaskCompletionIntensity(task: Task): RitualIntensity {
    const difficultyIntensity: Record<string, RitualIntensity> = {
      'easy': RitualIntensity.SUBTLE,
      'medium': RitualIntensity.MODERATE,
      'hard': RitualIntensity.DRAMATIC,
      'expert': RitualIntensity.EPIC
    };

    return difficultyIntensity[task.difficulty];
  }

  /**
   * 生成动画CSS
   */
  private generateAnimationCSS(): string {
    return `
      @keyframes ritual-fade-in {
        from { opacity: 0; transform: translateY(20px); }
        to { opacity: 1; transform: translateY(0); }
      }
      
      @keyframes ritual-scale-in {
        from { opacity: 0; transform: scale(0.3); }
        to { opacity: 1; transform: scale(1); }
      }
      
      @keyframes ritual-slide-up {
        from { opacity: 0; transform: translateY(100%); }
        to { opacity: 1; transform: translateY(0); }
      }
      
      @keyframes ritual-pulse-glow {
        0%, 100% { box-shadow: 0 0 20px var(--ritual-gold-glow); }
        50% { box-shadow: 0 0 40px var(--ritual-gold-glow), 0 0 60px var(--ritual-purple-glow); }
      }
      
      .ritual-celebration-container * {
        animation-fill-mode: forwards;
      }
      
      .ritual-completion-container {
        animation: ritual-slide-in-right 0.5s cubic-bezier(0.25, 0.46, 0.45, 0.94) forwards;
      }
      
      @keyframes ritual-slide-in-right {
        from { transform: translateX(100%); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
      }
    `;
  }

  private ensureElementStyle<T extends { style?: MutableStyle }>(element: T): MutableStyle {
    if (!element.style) {
      element.style = {
        cssText: '',
        setProperty: () => void 0,
        removeProperty: () => void 0
      };
    } else {
      if (typeof element.style.setProperty !== 'function') {
        element.style.setProperty = () => void 0;
      }
      if (typeof element.style.removeProperty !== 'function') {
        element.style.removeProperty = () => void 0;
      }
      if (typeof element.style.cssText !== 'string') {
        element.style.cssText = '';
      }
    }

    return element.style;
  }

  private appendToBody(element: HTMLElement): void {
    if (typeof document === 'undefined') {
      return;
    }

    if (document.body && typeof document.body.appendChild === 'function') {
      document.body.appendChild(element);
    }
  }

  private logError(message: string, error: unknown): void {
    if (typeof process !== 'undefined' && process.env?.NODE_ENV === 'test') {
      return;
    }
    console.error(message, error);
  }

  /**
   * 动画完成回调
   */
  private onAnimationComplete(animationId: string, type: string, element: Element): void {
    const event = new CustomEvent('ritualAnimationComplete', {
      detail: { animationId, type, element }
    });
    document.dispatchEvent(event);
  }

  /**
   * 动画取消回调
   */
  private onAnimationCancel(animationId: string, element: Element): void {
    const event = new CustomEvent('ritualAnimationCancel', {
      detail: { animationId, element }
    });
    document.dispatchEvent(event);
  }

  /**
   * 获取性能指标
   */
  getPerformanceMetrics(): PerformanceMetrics {
    return this.performanceMonitor.getMetrics();
  }

  /**
   * 取消所有动画
   */
  cancelAllAnimations(): void {
    this.activeAnimations.forEach(animation => {
      animation.cancel();
    });
    this.activeAnimations.clear();
  }

  /**
   * 销毁动画系统
   */
  destroy(): void {
    this.cancelAllAnimations();
    this.performanceMonitor.destroy();
  }
}

// 动画队列项
interface AnimationQueueItem {
  id: string;
  type: string;
  element: Element;
  config: Record<string, unknown>;
  priority: number;
}

// 性能监控器
class PerformanceMonitor {
  private metrics: PerformanceMetrics = {
    fps: 60,
    frameDrops: 0,
    memoryUsage: 0,
    animationCount: 0,
    averageFrameTime: 16.67
  };
  
  private frameCount = 0;
  private lastFrameTime = 0;
  private animationFrameId: number | null = null;
  private fallbackInterval: ReturnType<typeof setInterval> | null = null;
  private readonly enableDetailedMonitoring: boolean;

  constructor(private readonly isDomEnvironment: boolean) {
    this.enableDetailedMonitoring = typeof requestAnimationFrame === 'function';
    this.startMonitoring();
  }

  private maybeUnref(handle: ReturnType<typeof setInterval>): void {
    if (typeof handle === 'object' && handle !== null && 'unref' in handle && typeof (handle as NodeJS.Timeout).unref === 'function') {
      (handle as NodeJS.Timeout).unref();
    }
  }

  startTracking(_animationId: string): void {
    this.metrics.animationCount++;
  }

  stopTracking(_animationId: string): void {
    this.metrics.animationCount = Math.max(0, this.metrics.animationCount - 1);
  }

  private startMonitoring(): void {
    if (this.enableDetailedMonitoring && typeof requestAnimationFrame === 'function') {
      const monitor = (timestamp: number) => {
        if (this.lastFrameTime) {
          const frameTime = timestamp - this.lastFrameTime;
          this.metrics.averageFrameTime = (this.metrics.averageFrameTime + frameTime) / 2;
          this.metrics.fps = Math.round(1000 / Math.max(1, this.metrics.averageFrameTime));

          if (frameTime > 20) { // 超过20ms认为是掉帧
            this.metrics.frameDrops++;
          }
        }

        this.lastFrameTime = timestamp;
        this.frameCount++;

        // 每秒重置掉帧计数
        if (this.frameCount % 60 === 0) {
          this.metrics.frameDrops = 0;
        }

        this.animationFrameId = requestAnimationFrame(monitor);
      };

      this.animationFrameId = requestAnimationFrame(monitor);
      return;
    }

    if (!this.isDomEnvironment) {
      this.fallbackInterval = setInterval(() => {
        this.metrics.averageFrameTime = 16.67;
        this.metrics.fps = 60;
        this.metrics.frameDrops = 0;
      }, 1000);

      this.maybeUnref(this.fallbackInterval);
    }
  }

  getMetrics(): PerformanceMetrics {
    return { ...this.metrics };
  }

  destroy(): void {
    if (this.animationFrameId !== null && typeof cancelAnimationFrame === 'function') {
      cancelAnimationFrame(this.animationFrameId);
    }

    if (this.fallbackInterval) {
      clearInterval(this.fallbackInterval);
    }
  }
}
type MutableStyle = Partial<CSSStyleDeclaration> & {
  cssText?: string;
  setProperty?: (property: string, value: string) => void;
  removeProperty?: (property: string) => void;
};
