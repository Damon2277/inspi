/**
 * 视觉仪式编排器 - 管理视觉元素的仪式感呈现
 */

import { RitualType, RitualIntensity } from '../types';

interface VisualOrchestratorOptions {
  autoLoadStyles?: boolean;
  styleBasePath?: string;
}

type SceneDescriptor = Partial<VisualScene> | Record<string, unknown>;

// 视觉场景配置
export interface VisualScene {
  id: string;
  type: RitualType;
  intensity: RitualIntensity;
  elements: VisualElement[];
  duration: number;
  transitions: TransitionConfig[];
}

// 视觉元素
export interface VisualElement {
  id: string;
  type: 'background' | 'border' | 'glow' | 'particles' | 'text' | 'icon' | 'frame';
  styles: CSSStyleDeclaration | Record<string, string>;
  animation?: AnimationConfig;
  position?: PositionConfig;
  timing?: TimingConfig;
}

// 仪式感样式配置
export interface RitualStyle {
  colorTheme: 'gold' | 'purple' | 'blue' | 'divine' | 'cultural' | 'neutral';
  intensity: RitualIntensity;
  decorativeLevel: 'minimal' | 'moderate' | 'ornate' | 'epic';
  culturalContext?: 'eastern' | 'western' | 'neutral';
  accessibilityMode?: boolean;
}

// 动画配置
interface AnimationConfig {
  name: string;
  duration: number;
  easing: string;
  delay?: number;
  iterations?: number | 'infinite';
  direction?: 'normal' | 'reverse' | 'alternate';
}

// 位置配置
interface PositionConfig {
  x: number | string;
  y: number | string;
  z?: number;
  anchor?: 'center' | 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
}

// 时序配置
interface TimingConfig {
  startTime: number;
  endTime?: number;
  fadeIn?: number;
  fadeOut?: number;
}

// 过渡配置
interface TransitionConfig {
  property: string;
  duration: number;
  easing: string;
  delay?: number;
}

export class VisualRitualOrchestrator {
  private activeScenes: Map<string, VisualScene> = new Map();
  private styleSheets: Map<string, CSSStyleSheet> = new Map();
  private animationFrameId: number | null = null;
  private readonly isBrowser: boolean;
  private readonly options: Required<VisualOrchestratorOptions>;

  constructor(options: VisualOrchestratorOptions = {}) {
    this.isBrowser = typeof document !== 'undefined';
    this.options = {
      autoLoadStyles: false,
      styleBasePath: '/ritual-system/visual',
      ...options
    };

    if (this.isBrowser && this.options.autoLoadStyles) {
      this.initializeStyleSheets();
    }
  }

  /**
   * 初始化样式表
   */
  private initializeStyleSheets(): void {
    if (!this.isBrowser) {
      return;
    }

    const basePath = this.options.styleBasePath.replace(/\/$/, '');
    const styleSheets = ['colors.css', 'typography.css', 'decorative-elements.css'];

    styleSheets.forEach(fileName => {
      const href = `${basePath}/${fileName}`;
      if (document.head.querySelector(`link[data-ritual-style="${href}"]`)) {
        return;
      }

      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = href;
      link.dataset.ritualStyle = href;
      document.head.appendChild(link);
    });
  }

  /**
   * 创建仪式感场景
   */
  createRitualScene(type: RitualType, intensity: RitualIntensity, options: { shareChannel?: 'weibo' | 'email' | null } = {}): VisualScene {
    const sceneId = `ritual-scene-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    const scene: VisualScene = {
      id: sceneId,
      type,
      intensity,
      elements: this.generateSceneElements(type, intensity, options),
      duration: this.calculateSceneDuration(type, intensity),
      transitions: this.generateTransitions(type, intensity)
    };

    this.activeScenes.set(sceneId, scene);
    return scene;
  }

  /**
   * 应用仪式感样式到元素
   */
  applyRitualStyling(element: HTMLElement, style: RitualStyle): void {
    if (!element) return;

    // 应用基础仪式感类
    element.classList.add('ritual-element');
    
    // 应用颜色主题
    element.classList.add(`ritual-theme-${style.colorTheme}`);
    
    // 应用强度相关的样式
    this.applyIntensityStyles(element, style.intensity);
    
    // 应用装饰等级
    this.applyDecorativeStyles(element, style.decorativeLevel);
    
    // 应用文化适配
    if (style.culturalContext) {
      element.classList.add(`ritual-culture-${style.culturalContext}`);
    }
    
    // 应用可访问性模式
    if (style.accessibilityMode) {
      element.classList.add('ritual-accessibility');
      this.applyAccessibilityStyles(element);
    }
  }

  /**
   * 创建动画过渡
   */
  animateTransition(from: SceneDescriptor, to: SceneDescriptor, duration: number): Animation {
    if (!this.isBrowser || typeof document.body?.animate !== 'function') {
      return this.createNoopAnimation();
    }
    const keyframes = this.generateTransitionKeyframes(from, to);
    
    const animationOptions: KeyframeAnimationOptions = {
      duration: duration * 1000,
      easing: 'cubic-bezier(0.4, 0, 0.2, 1)',
      fill: 'forwards'
    };

    // 创建动画
    const animation = document.body.animate(keyframes, animationOptions);
    
    // 添加完成回调
    animation.addEventListener('finish', () => {
      this.onTransitionComplete(from, to);
    });

    return animation;
  }

  /**
   * 生成场景元素
   */
  private generateSceneElements(type: RitualType, intensity: RitualIntensity, options: { shareChannel?: 'weibo' | 'email' | null } = {}): VisualElement[] {
    const elements: VisualElement[] = [];

    switch (type) {
      case RitualType.WELCOME:
        elements.push(...this.generateWelcomeElements(intensity));
        break;
      case RitualType.ACHIEVEMENT:
        elements.push(...this.generateAchievementElements(intensity));
        break;
      case RitualType.CREATION:
        elements.push(...this.generateCreationElements(intensity));
        break;
      case RitualType.SHARING:
        elements.push(...this.generateSharingElements(intensity, options.shareChannel));
        break;
      case RitualType.MILESTONE:
        elements.push(...this.generateMilestoneElements(intensity));
        break;
      case RitualType.TRANSITION:
        elements.push(...this.generateTransitionElements(intensity));
        break;
    }

    return elements;
  }

  /**
   * 生成欢迎仪式元素
   */
  private generateWelcomeElements(intensity: RitualIntensity): VisualElement[] {
    const elements: VisualElement[] = [];

    // 背景光效
    elements.push({
      id: 'welcome-bg-glow',
      type: 'background',
      styles: {
        background: 'var(--ritual-gradient-divine)',
        opacity: intensity >= RitualIntensity.MODERATE ? '0.1' : '0.05'
      },
      animation: {
        name: 'ritual-pulse',
        duration: 3000,
        easing: 'ease-in-out',
        iterations: 'infinite'
      }
    });

    // 装饰边框
    if (intensity >= RitualIntensity.MODERATE) {
      elements.push({
        id: 'welcome-border',
        type: 'border',
        styles: {
          border: '2px solid var(--ritual-gold)',
          borderRadius: '16px',
          boxShadow: 'var(--ritual-shadow-moderate)'
        }
      });
    }

    // 粒子效果
    if (intensity >= RitualIntensity.DRAMATIC) {
      elements.push({
        id: 'welcome-particles',
        type: 'particles',
        styles: {
          position: 'absolute',
          top: '0',
          left: '0',
          width: '100%',
          height: '100%',
          pointerEvents: 'none'
        },
        animation: {
          name: 'ritual-float',
          duration: 20000,
          easing: 'linear',
          iterations: 'infinite'
        }
      });
    }

    return elements;
  }

  /**
   * 生成成就仪式元素
   */
  private generateAchievementElements(intensity: RitualIntensity): VisualElement[] {
    const elements: VisualElement[] = [];

    // 成就光环
    elements.push({
      id: 'achievement-glow',
      type: 'glow',
      styles: {
        boxShadow: intensity >= RitualIntensity.EPIC 
          ? 'var(--ritual-shadow-epic)' 
          : 'var(--ritual-shadow-dramatic)',
        borderRadius: '50%'
      },
      animation: {
        name: 'ritual-pulse',
        duration: 2000,
        easing: 'ease-in-out',
        iterations: 3
      }
    });

    // 庆祝图标
    elements.push({
      id: 'achievement-icon',
      type: 'icon',
      styles: {
        fontSize: intensity >= RitualIntensity.EPIC ? '3rem' : '2rem',
        color: 'var(--ritual-gold)',
        textShadow: 'var(--ritual-text-shadow-glow)'
      },
      animation: {
        name: 'ritual-twinkle',
        duration: 1500,
        easing: 'ease-in-out',
        iterations: 5
      }
    });

    return elements;
  }

  /**
   * 生成创作仪式元素
   */
  private generateCreationElements(intensity: RitualIntensity): VisualElement[] {
    const elements: VisualElement[] = [];

    // 创作氛围背景
    elements.push({
      id: 'creation-atmosphere',
      type: 'background',
      styles: {
        background: 'var(--ritual-bg-ethereal)',
        opacity: '0.05',
        backgroundSize: '60px 60px'
      },
      animation: {
        name: 'ritual-float',
        duration: 30000,
        easing: 'linear',
        iterations: 'infinite'
      }
    });

    // 灵感火花
    if (intensity >= RitualIntensity.MODERATE) {
      elements.push({
        id: 'creation-sparks',
        type: 'particles',
        styles: {
          background: 'radial-gradient(2px 2px at center, var(--ritual-gold), transparent)',
          opacity: '0.7'
        },
        animation: {
          name: 'ritual-twinkle',
          duration: 2000,
          easing: 'ease-in-out',
          iterations: 'infinite'
        }
      });
    }

    return elements;
  }

  /**
   * 生成分享仪式元素
   */
  private generateSharingElements(intensity: RitualIntensity, channel: 'weibo' | 'email' | undefined | null): VisualElement[] {
    const elements: VisualElement[] = [];

    const isWeibo = channel === 'weibo';
    const isEmail = channel === 'email';

    if (isWeibo) {
      elements.push({
        id: 'sharing-radiance',
        type: 'glow',
        styles: {
          background: 'linear-gradient(135deg, rgba(255, 68, 0, 0.55), rgba(255, 199, 0, 0.45))',
          opacity: '0.45',
          filter: 'blur(22px)'
        },
        animation: {
          name: 'ritual-pulse',
          duration: 2200,
          easing: 'ease-in-out',
          iterations: 'infinite'
        }
      });

      elements.push({
        id: 'sharing-bursts',
        type: 'particles',
        styles: {
          pointerEvents: 'none',
          background: 'radial-gradient(2px 2px at center, rgba(255,255,255,0.9), transparent)',
          opacity: intensity >= RitualIntensity.DRAMATIC ? '0.85' : '0.6'
        },
        animation: {
          name: 'ritual-twinkle',
          duration: 1800,
          easing: 'ease-in-out',
          iterations: 'infinite'
        }
      });
    } else if (isEmail) {
      elements.push({
        id: 'sharing-soft-glow',
        type: 'glow',
        styles: {
          background: 'linear-gradient(145deg, rgba(255, 224, 178, 0.5), rgba(255, 239, 213, 0.6))',
          opacity: '0.35',
          filter: 'blur(18px)'
        },
        animation: {
          name: 'ritual-pulse',
          duration: 3200,
          easing: 'ease-in-out',
          iterations: 'infinite'
        }
      });

      elements.push({
        id: 'sharing-soft-petals',
        type: 'particles',
        styles: {
          pointerEvents: 'none',
          background: 'radial-gradient(2px 2px at center, rgba(255, 182, 193, 0.65), transparent)',
          opacity: intensity >= RitualIntensity.DRAMATIC ? '0.7' : '0.45'
        },
        animation: {
          name: 'ritual-float',
          duration: 4200,
          easing: 'ease-in-out',
          iterations: 'infinite'
        }
      });

      if (intensity >= RitualIntensity.MODERATE) {
        elements.push({
          id: 'sharing-encouragement-frame',
          type: 'frame',
          styles: {
            border: '3px solid rgba(255, 213, 128, 0.6)',
            borderRadius: '18px',
            padding: '1.5rem',
            background: 'rgba(255, 248, 225, 0.35)'
          }
        });
      }
    } else {
      // 默认分享光芒
      elements.push({
        id: 'sharing-radiance',
        type: 'glow',
        styles: {
          background: 'var(--ritual-gradient-celestial)',
          opacity: '0.3',
          filter: 'blur(20px)'
        },
        animation: {
          name: 'ritual-pulse',
          duration: 2500,
          easing: 'ease-in-out',
          iterations: 'infinite'
        }
      });

      if (intensity >= RitualIntensity.MODERATE) {
        elements.push({
          id: 'sharing-sparkles',
          type: 'particles',
          styles: {
            pointerEvents: 'none',
            background: 'radial-gradient(2px 2px at center, rgba(255, 255, 255, 0.8), transparent)',
            opacity: intensity >= RitualIntensity.DRAMATIC ? '0.8' : '0.5'
          },
          animation: {
            name: 'ritual-twinkle',
            duration: intensity >= RitualIntensity.DRAMATIC ? 1800 : 2400,
            easing: 'ease-in-out',
            iterations: 'infinite'
          }
        });
      }
    }

    return elements;
  }

  /**
   * 生成里程碑仪式元素
   */
  private generateMilestoneElements(intensity: RitualIntensity): VisualElement[] {
    const elements: VisualElement[] = [];

    // 史诗级装饰框架
    elements.push({
      id: 'milestone-frame',
      type: 'frame',
      styles: {
        border: '4px solid transparent',
        background: 'linear-gradient(rgba(255,255,255,0.1), rgba(255,255,255,0.1)) padding-box, var(--ritual-gradient-divine) border-box',
        borderRadius: '20px',
        padding: '2rem'
      }
    });

    // 庆祝粒子爆发
    if (intensity >= RitualIntensity.EPIC) {
      elements.push({
        id: 'milestone-celebration',
        type: 'particles',
        styles: {
          background: 'var(--ritual-pattern-celestial)',
          opacity: '0.8'
        },
        animation: {
          name: 'ritual-float',
          duration: 15000,
          easing: 'ease-out',
          iterations: 1
        }
      });
    }

    return elements;
  }

  /**
   * 生成过渡仪式元素
   */
  private generateTransitionElements(intensity: RitualIntensity): VisualElement[] {
    const elements: VisualElement[] = [];

    // 过渡遮罩
    elements.push({
      id: 'transition-overlay',
      type: 'background',
      styles: {
        background: 'var(--ritual-gradient-divine)',
        opacity: intensity >= RitualIntensity.MODERATE ? '0.1' : '0.05'
      },
      animation: {
        name: 'ritual-fade',
        duration: 800,
        easing: 'ease-in-out',
        iterations: 1
      }
    });

    return elements;
  }

  /**
   * 应用强度样式
   */
  private applyIntensityStyles(element: HTMLElement, intensity: RitualIntensity): void {
    element.classList.add(`ritual-intensity-${intensity}`);
    
    switch (intensity) {
      case RitualIntensity.SUBTLE:
        element.style.setProperty('--ritual-local-opacity', '0.3');
        element.style.setProperty('--ritual-local-scale', '1.0');
        break;
      case RitualIntensity.MODERATE:
        element.style.setProperty('--ritual-local-opacity', '0.6');
        element.style.setProperty('--ritual-local-scale', '1.02');
        break;
      case RitualIntensity.DRAMATIC:
        element.style.setProperty('--ritual-local-opacity', '0.8');
        element.style.setProperty('--ritual-local-scale', '1.05');
        break;
      case RitualIntensity.EPIC:
        element.style.setProperty('--ritual-local-opacity', '1.0');
        element.style.setProperty('--ritual-local-scale', '1.1');
        break;
    }
  }

  /**
   * 应用装饰样式
   */
  private applyDecorativeStyles(element: HTMLElement, level: string): void {
    element.classList.add(`ritual-decoration-${level}`);
    
    switch (level) {
      case 'minimal':
        element.classList.add('ritual-border');
        break;
      case 'moderate':
        element.classList.add('ritual-border', 'ritual-glow-subtle');
        break;
      case 'ornate':
        element.classList.add('ritual-border-ornate', 'ritual-glow');
        break;
      case 'epic':
        element.classList.add('ritual-frame-ornate', 'ritual-glow-dramatic', 'ritual-particles');
        break;
    }
  }

  /**
   * 应用可访问性样式
   */
  private applyAccessibilityStyles(element: HTMLElement): void {
    // 移除动画
    element.style.setProperty('animation', 'none');
    
    // 简化视觉效果
    element.style.setProperty('box-shadow', 'none');
    element.style.setProperty('text-shadow', 'none');
    
    // 确保对比度
    element.style.setProperty('filter', 'contrast(1.2)');
  }

  /**
   * 计算场景持续时间
   */
  private calculateSceneDuration(type: RitualType, intensity: RitualIntensity): number {
    const baseDuration = {
      [RitualType.WELCOME]: 3000,
      [RitualType.ACHIEVEMENT]: 2000,
      [RitualType.CREATION]: 1500,
      [RitualType.SHARING]: 2500,
      [RitualType.MILESTONE]: 4000,
      [RitualType.TRANSITION]: 800
    };

    const intensityMultiplier = {
      [RitualIntensity.SUBTLE]: 0.7,
      [RitualIntensity.MODERATE]: 1.0,
      [RitualIntensity.DRAMATIC]: 1.3,
      [RitualIntensity.EPIC]: 1.8
    };

    return baseDuration[type] * intensityMultiplier[intensity];
  }

  /**
   * 生成过渡动画
   */
  private generateTransitions(type: RitualType, intensity: RitualIntensity): TransitionConfig[] {
    const transitions: TransitionConfig[] = [];

    // 基础过渡
    transitions.push({
      property: 'opacity',
      duration: 300,
      easing: 'ease-in-out'
    });

    transitions.push({
      property: 'transform',
      duration: 500,
      easing: 'cubic-bezier(0.4, 0, 0.2, 1)'
    });

    // 根据强度添加更多过渡
    if (intensity >= RitualIntensity.MODERATE) {
      transitions.push({
        property: 'box-shadow',
        duration: 400,
        easing: 'ease-out'
      });
    }

    if (intensity >= RitualIntensity.DRAMATIC) {
      transitions.push({
        property: 'filter',
        duration: 600,
        easing: 'ease-in-out'
      });
    }

    return transitions;
  }

  /**
   * 生成过渡关键帧
   */
  private generateTransitionKeyframes(from: SceneDescriptor, to: SceneDescriptor): Keyframe[] {
    const fromType = from?.type ?? 'unknown';
    const toType = to?.type ?? 'unknown';
    const travelDistance = fromType === toType ? 10 : 20;

    return [
      {
        opacity: 0,
        transform: `scale(0.9) translateY(${travelDistance}px)`,
        filter: 'blur(5px)'
      },
      {
        opacity: 0.5,
        transform: 'scale(1.02) translateY(0)',
        filter: 'blur(2px)',
        offset: 0.6
      },
      {
        opacity: 1,
        transform: 'scale(1) translateY(0)',
        filter: 'blur(0px)'
      }
    ];
  }

  /**
   * 过渡完成回调
   */
  private onTransitionComplete(from: SceneDescriptor, to: SceneDescriptor): void {
    // 清理临时样式
    // 触发完成事件
    if (!this.isBrowser) {
      return;
    }

    const event = new CustomEvent('ritualTransitionComplete', {
      detail: { fromScene: from, toScene: to }
    });
    document.dispatchEvent(event);
  }

  /**
   * 清理场景
   */
  cleanupScene(sceneId: string): void {
    this.activeScenes.delete(sceneId);
  }

  /**
   * 获取活跃场景
   */
  getActiveScenes(): VisualScene[] {
    return Array.from(this.activeScenes.values());
  }

  /**
   * 销毁编排器
   */
  destroy(): void {
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
    }
    this.activeScenes.clear();
    this.styleSheets.clear();
  }

  /**
   * 在非浏览器环境下创建占位动画，避免调用方出现空引用
   */
  private createNoopAnimation(): Animation {
    const listenerMap = new Map<string, Set<EventListenerOrEventListenerObject>>();

    const animation: Partial<Animation> = {
      id: 'ritual-noop-animation',
      currentTime: 0,
      startTime: null,
      playbackRate: 1,
      playState: 'finished',
      effect: null,
      timeline: null,
      cancel: () => void 0,
      finish: () => void 0,
      play: () => void 0,
      pause: () => void 0,
      reverse: () => void 0,
      updatePlaybackRate: () => void 0,
      addEventListener: (type: string, listener: EventListenerOrEventListenerObject | null) => {
        if (!listener) return;
        if (!listenerMap.has(type)) {
          listenerMap.set(type, new Set());
        }
        listenerMap.get(type)!.add(listener);
      },
      removeEventListener: (type: string, listener: EventListenerOrEventListenerObject | null) => {
        if (!listener) return;
        listenerMap.get(type)?.delete(listener);
      },
      dispatchEvent: () => true
    };

    const resolved = animation as Animation;
    Object.defineProperty(resolved, 'finished', {
      value: Promise.resolve(resolved),
      configurable: true
    });
    Object.defineProperty(resolved, 'ready', {
      value: Promise.resolve(resolved),
      configurable: true
    });

    return resolved;
  }
}
