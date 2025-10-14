/**
 * 配置管理系统导出
 */

import type { RitualConfiguration, ConfigVersion, ConfigMetadata } from './RitualConfiguration';
import { RitualConfigurationManager } from './RitualConfiguration';
import { RitualType, RitualIntensity } from '../types';

export {
  RitualConfigurationManager,
  RitualConfiguration,
  ConfigVersion,
  ColorScheme,
  TypographyConfig,
  DecorativeElement,
  ElementCondition,
  LayoutConfig,
  VisualIntensity,
  VisualRitualConfig,
  SoundEffect,
  AmbientTrack,
  VolumeConfig,
  AudioRitualConfig,
  AnimationRitualConfig,
  PersonalizationConfig,
  PersonalizationPreset,
  CulturalConfig,
  PerformanceConfig,
  AccessibilityConfig,
  RitualTriggerConfig,
  ConfigMetadata,
  ConfigValidationResult,
  ConfigValidationError,
  ConfigValidationWarning,
  ConfigSuggestion,
  ConfigChangeListener
} from './RitualConfiguration';

export {
  ConfigurationLoader,
  ConfigSource,
  ConfigLoadOptions,
  ConfigSaveOptions,
  ConfigChangeEvent,
  HotReloadListener
} from './ConfigurationLoader';

// 预定义的配置模板
export const CONFIG_TEMPLATES = {
  // 欢迎仪式模板
  WELCOME: {
    GENTLE: 'welcome-gentle',
    WARM: 'welcome-warm',
    GRAND: 'welcome-grand'
  },
  
  // 成就仪式模板
  ACHIEVEMENT: {
    SIMPLE: 'achievement-simple',
    CELEBRATION: 'achievement-celebration',
    EPIC: 'achievement-epic'
  },
  
  // 创作仪式模板
  CREATION: {
    INSPIRING: 'creation-inspiring',
    FOCUSED: 'creation-focused',
    MYSTICAL: 'creation-mystical'
  },
  
  // 分享仪式模板
  SHARING: {
    SOCIAL: 'sharing-social',
    PROFESSIONAL: 'sharing-professional',
    CELEBRATORY: 'sharing-celebratory'
  },
  
  // 里程碑仪式模板
  MILESTONE: {
    PERSONAL: 'milestone-personal',
    TEAM: 'milestone-team',
    LEGENDARY: 'milestone-legendary'
  },
  
  // 过渡仪式模板
  TRANSITION: {
    SMOOTH: 'transition-smooth',
    DYNAMIC: 'transition-dynamic',
    SEAMLESS: 'transition-seamless'
  }
} as const;

// 配置验证规则
export const VALIDATION_RULES = {
  // 颜色值验证
  COLOR_REGEX: /^(#[0-9A-Fa-f]{3,8}|rgb\(|rgba\(|hsl\(|hsla\(|[a-zA-Z]+).*$/,
  
  // 音量范围
  VOLUME_RANGE: { min: 0, max: 1 },
  
  // 粒子数量限制
  PARTICLE_LIMITS: {
    low: 50,
    medium: 100,
    high: 200
  },
  
  // 动画持续时间限制（毫秒）
  ANIMATION_DURATION_LIMITS: {
    min: 100,
    max: 5000
  },
  
  // FPS阈值
  FPS_THRESHOLDS: {
    low: 30,
    medium: 45,
    high: 60
  }
} as const;

// 默认配置值
export const DEFAULT_CONFIG_VALUES = {
  // 默认颜色方案
  COLORS: {
    GOLD: '#FFD700',
    DEEP_BLUE: '#1E3A8A',
    PURPLE: '#7C3AED',
    SILVER: '#C0C0C0',
    WHITE: '#FFFFFF',
    BLACK: '#000000'
  },
  
  // 默认字体
  FONTS: {
    CEREMONIAL: 'Cinzel, serif',
    ELEGANT: 'Playfair Display, serif',
    BODY: 'Inter, sans-serif',
    MONOSPACE: 'SF Mono, Monaco, monospace'
  },
  
  // 默认动画时长
  ANIMATION_DURATIONS: {
    FAST: 300,
    NORMAL: 600,
    SLOW: 1200,
    EPIC: 2400
  },
  
  // 默认缓动函数
  EASING_FUNCTIONS: {
    EASE_OUT: 'cubic-bezier(0.25, 0.46, 0.45, 0.94)',
    EASE_IN_OUT: 'cubic-bezier(0.455, 0.03, 0.515, 0.955)',
    BOUNCE: 'cubic-bezier(0.68, -0.55, 0.265, 1.55)',
    SMOOTH: 'cubic-bezier(0.23, 1, 0.32, 1)'
  },
  
  // 默认音量设置
  VOLUME_LEVELS: {
    MASTER: 0.8,
    EFFECTS: 0.7,
    AMBIENT: 0.5,
    UI: 0.6
  }
} as const;

// 配置工具函数
export class ConfigUtils {
  /**
   * 创建基础配置模板
   */
  static createBaseConfig(id: string, name: string, type: RitualType): Partial<RitualConfiguration> {
    return {
      id,
      name,
      type,
      version: {
        major: 1,
        minor: 0,
        patch: 0,
        timestamp: Date.now()
      },
      triggers: [],
      metadata: {
        createdAt: Date.now(),
        updatedAt: Date.now(),
        createdBy: 'user',
        tags: [],
        category: 'custom',
        isDefault: false,
        isActive: false,
        usageCount: 0
      }
    };
  }
  
  /**
   * 合并配置
   */
  static mergeConfigs(base: RitualConfiguration, override: Partial<RitualConfiguration>): RitualConfiguration {
    return {
      ...base,
      ...override,
      version: {
        ...base.version,
        ...override.version,
        patch: (override.version?.patch ?? base.version.patch) + 1,
        timestamp: Date.now()
      },
      metadata: {
        ...base.metadata,
        ...override.metadata,
        updatedAt: Date.now()
      }
    };
  }
  
  /**
   * 验证颜色值
   */
  static isValidColor(color: string): boolean {
    return VALIDATION_RULES.COLOR_REGEX.test(color);
  }
  
  /**
   * 验证音量值
   */
  static isValidVolume(volume: number): boolean {
    return volume >= VALIDATION_RULES.VOLUME_RANGE.min && 
           volume <= VALIDATION_RULES.VOLUME_RANGE.max;
  }
  
  /**
   * 获取性能等级建议
   */
  static getPerformanceLevel(particleCount: number, animationCount: number): 'low' | 'medium' | 'high' {
    if (particleCount > VALIDATION_RULES.PARTICLE_LIMITS.high || animationCount > 20) {
      return 'high';
    } else if (particleCount > VALIDATION_RULES.PARTICLE_LIMITS.medium || animationCount > 10) {
      return 'medium';
    } else {
      return 'low';
    }
  }
  
  /**
   * 生成配置摘要
   */
  static generateConfigSummary(config: RitualConfiguration): string {
    const features = [];
    
    if (config.visual) features.push('视觉效果');
    if (config.audio?.enabled) features.push('音频效果');
    if (config.animation?.enabled) features.push('动画效果');
    if (config.personalization?.enabled) features.push('个性化');
    if (config.accessibility?.enabled) features.push('可访问性');
    
    return `${config.name} - 包含: ${features.join(', ')}`;
  }
  
  /**
   * 计算配置复杂度分数
   */
  static calculateComplexityScore(config: RitualConfiguration): number {
    let score = 0;
    
    // 视觉复杂度
    if (config.visual) {
      score += config.visual.decorativeElements?.length || 0;
      score += Object.keys(config.visual.intensity).length;
    }
    
    // 音频复杂度
    if (config.audio) {
      score += config.audio.soundEffects?.length || 0;
      score += config.audio.ambientMusic?.length || 0;
    }
    
    // 触发器复杂度
    score += config.triggers?.length || 0;
    
    // 文化适配复杂度
    score += config.culturalAdaptations?.length || 0;
    
    return score;
  }
}

// 配置迁移工具
export class ConfigMigration {
  /**
   * 迁移配置到新版本
   */
  static migrateToVersion(config: RitualConfiguration, targetVersion: ConfigVersion): RitualConfiguration {
    const migrated = { ...config };
    
    // 版本1.0.0到1.1.0的迁移示例
    if (config.version.major === 1 && config.version.minor === 0 && targetVersion.minor >= 1) {
      // 添加新的默认值或转换旧格式
      migrated.accessibility = migrated.accessibility || {
        enabled: true,
        highContrast: false,
        reducedMotion: false,
        screenReaderSupport: true,
        keyboardNavigation: true,
        focusIndicators: true,
        alternativeText: true,
        colorBlindSupport: true,
        fontSize: 'medium'
      };
    }
    
    migrated.version = { ...targetVersion };
    migrated.metadata.updatedAt = Date.now();
    
    return migrated;
  }
  
  /**
   * 检查是否需要迁移
   */
  static needsMigration(config: RitualConfiguration, currentVersion: ConfigVersion): boolean {
    return config.version.major < currentVersion.major ||
           (config.version.major === currentVersion.major && config.version.minor < currentVersion.minor);
  }
}

// 配置预设生成器
export class ConfigPresetGenerator {
  private static cloneConfig(config: RitualConfiguration): RitualConfiguration {
    return typeof structuredClone === 'function'
      ? structuredClone(config)
      : JSON.parse(JSON.stringify(config));
  }

  private static getBaseConfig(type: RitualType): RitualConfiguration {
    const manager = new RitualConfigurationManager();
    const base = manager.getConfigurationsByType(type)[0];
    manager.destroy();

    if (!base) {
      throw new Error(`No base configuration available for ritual type ${type}`);
    }

    return this.cloneConfig(base);
  }

  private static composeMetadata(base: ConfigMetadata, tags: string[]): ConfigMetadata {
    const timestamp = Date.now();
    return {
      ...base,
      createdAt: base.createdAt ?? timestamp,
      updatedAt: timestamp,
      createdBy: base.createdBy || 'system',
      tags: Array.from(new Set([...base.tags, ...tags])),
      category: base.category || 'preset',
      isDefault: false,
      isActive: false
    };
  }

  /**
   * 生成最小化配置
   */
  static generateMinimalConfig(type: RitualType): RitualConfiguration {
    const config = this.getBaseConfig(type);

    const subtle = config.visual?.intensity[RitualIntensity.SUBTLE];
    if (subtle) {
      Object.assign(subtle, {
        opacity: Math.min(subtle.opacity, 0.35),
        scale: 1,
        blur: 0,
        brightness: 1,
        saturation: Math.min(subtle.saturation, 0.9),
        animationDuration: Math.min(subtle.animationDuration, 280),
        particleCount: Math.min(subtle.particleCount, 6)
      });
    }

    if (config.animation) {
      Object.assign(config.animation, {
        performanceMode: 'low',
        respectReducedMotion: true,
        maxConcurrentAnimations: Math.min(config.animation.maxConcurrentAnimations, 3),
        defaultDuration: Math.min(config.animation.defaultDuration, 320)
      });
    }

    if (config.audio?.volume) {
      config.audio.volume.master = Math.min(config.audio.volume.master, 0.7);
      config.audio.volume.effects = Math.min(config.audio.volume.effects, 0.6);
    }

    config.id = `minimal-${type}`;
    config.name = `${config.name} · Minimal`;
    config.metadata = this.composeMetadata(config.metadata, ['minimal', 'low-intensity']);

    return config;
  }
  
  /**
   * 生成高性能配置
   */
  static generateHighPerformanceConfig(type: RitualType): RitualConfiguration {
    const config = this.getBaseConfig(type);

    const epic = config.visual?.intensity[RitualIntensity.EPIC];
    if (epic) {
      Object.assign(epic, {
        opacity: Math.min(1, epic.opacity + 0.1),
        scale: epic.scale + 0.05,
        brightness: epic.brightness + 0.2,
        saturation: epic.saturation + 0.2,
        animationDuration: Math.max(epic.animationDuration, 2200),
        particleCount: Math.max(epic.particleCount, 120)
      });
    }

    if (config.animation) {
      Object.assign(config.animation, {
        performanceMode: 'high',
        respectReducedMotion: false,
        defaultDuration: Math.max(config.animation.defaultDuration, 1200),
        defaultEasing: DEFAULT_CONFIG_VALUES.EASING_FUNCTIONS.BOUNCE,
        maxConcurrentAnimations: Math.max(config.animation.maxConcurrentAnimations, 20),
        frameRateTarget: 60
      });
    }

    config.id = `high-perf-${type}`;
    config.name = `${config.name} · High Performance`;
    config.metadata = this.composeMetadata(config.metadata, ['high-performance', 'epic']);

    return config;
  }
  
  /**
   * 生成可访问性优化配置
   */
  static generateAccessibleConfig(type: RitualType): RitualConfiguration {
    const config = this.getBaseConfig(type);

    if (config.animation) {
      Object.assign(config.animation, {
        respectReducedMotion: true,
        defaultDuration: Math.min(config.animation.defaultDuration, 220),
        performanceMode: 'low',
        maxConcurrentAnimations: Math.min(config.animation.maxConcurrentAnimations, 2)
      });
    }

    const subtle = config.visual?.intensity[RitualIntensity.SUBTLE];
    if (subtle) {
      subtle.opacity = Math.min(subtle.opacity, 0.4);
      subtle.particleCount = Math.min(subtle.particleCount, 6);
    }

    config.accessibility = {
      enabled: true,
      highContrast: true,
      reducedMotion: true,
      screenReaderSupport: true,
      keyboardNavigation: true,
      focusIndicators: true,
      alternativeText: true,
      colorBlindSupport: true,
      fontSize: 'large'
    };

    config.id = `accessible-${type}`;
    config.name = `${config.name} · Accessible`;
    config.metadata = this.composeMetadata(config.metadata, ['accessibility', 'inclusive']);

    return config;
  }
}
