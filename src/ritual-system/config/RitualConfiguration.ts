/**
 * 仪式感配置管理系统
 */

import { RitualType, RitualIntensity } from '../types';

// 配置版本信息
export interface ConfigVersion {
  major: number;
  minor: number;
  patch: number;
  timestamp: number;
  description?: string;
}

// 颜色方案配置
export interface ColorScheme {
  primary: string;
  secondary: string;
  accent: string;
  background: string;
  surface: string;
  text: string;
  glow: string;
  gradient: string[];
}

// 排版配置
export interface TypographyConfig {
  fontFamily: string;
  fontSize: {
    xs: string;
    sm: string;
    base: string;
    lg: string;
    xl: string;
    '2xl': string;
    '3xl': string;
    '4xl': string;
    '5xl': string;
  };
  fontWeight: {
    light: number;
    normal: number;
    medium: number;
    semibold: number;
    bold: number;
  };
  lineHeight: {
    tight: number;
    normal: number;
    relaxed: number;
    loose: number;
  };
  letterSpacing: {
    tight: string;
    normal: string;
    wide: string;
    wider: string;
  };
}

// 装饰元素配置
export interface DecorativeElement {
  id: string;
  type: 'border' | 'glow' | 'particle' | 'pattern' | 'icon' | 'frame';
  styles: Record<string, string>;
  conditions?: ElementCondition[];
  priority: number;
  enabled: boolean;
}

// 元素条件
export interface ElementCondition {
  type: 'intensity' | 'ritual_type' | 'cultural_context' | 'device_capability';
  operator: 'eq' | 'gt' | 'lt' | 'gte' | 'lte' | 'in' | 'not_in';
  value: number | string | boolean | string[];
}

// 布局配置
export interface LayoutConfig {
  spacing: {
    xs: string;
    sm: string;
    md: string;
    lg: string;
    xl: string;
  };
  borderRadius: {
    sm: string;
    md: string;
    lg: string;
    xl: string;
    full: string;
  };
  shadows: {
    subtle: string;
    moderate: string;
    dramatic: string;
    epic: string;
  };
  zIndex: {
    base: number;
    overlay: number;
    modal: number;
    tooltip: number;
    notification: number;
  };
}

// 视觉强度配置
export interface VisualIntensity {
  opacity: number;
  scale: number;
  blur: number;
  brightness: number;
  saturation: number;
  animationDuration: number;
  particleCount: number;
}

// 视觉仪式配置
export interface VisualRitualConfig {
  colorScheme: ColorScheme;
  typography: TypographyConfig;
  decorativeElements: DecorativeElement[];
  layout: LayoutConfig;
  intensity: Record<RitualIntensity, VisualIntensity>;
}

// 音效配置
export interface SoundEffect {
  id: string;
  name: string;
  url: string;
  volume: number;
  duration: number;
  loop: boolean;
  fadeIn?: number;
  fadeOut?: number;
  conditions?: ElementCondition[];
}

// 环境音轨配置
export interface AmbientTrack {
  id: string;
  name: string;
  url: string;
  volume: number;
  loop: boolean;
  crossfade: boolean;
  mood: 'calm' | 'energetic' | 'mystical' | 'celebratory';
}

// 音量配置
export interface VolumeConfig {
  master: number;
  effects: number;
  ambient: number;
  ui: number;
}

// 音频仪式配置
export interface AudioRitualConfig {
  soundEffects: SoundEffect[];
  ambientMusic: AmbientTrack[];
  volume: VolumeConfig;
  spatialAudio: boolean;
  enabled: boolean;
}

// 动画配置
export interface AnimationRitualConfig {
  enabled: boolean;
  respectReducedMotion: boolean;
  defaultDuration: number;
  defaultEasing: string;
  performanceMode: 'auto' | 'high' | 'balanced' | 'low';
  maxConcurrentAnimations: number;
  frameRateTarget: number;
}

// 个性化配置
export interface PersonalizationConfig {
  enabled: boolean;
  learningEnabled: boolean;
  adaptationSpeed: 'slow' | 'medium' | 'fast';
  privacyMode: boolean;
  dataRetentionDays: number;
  customPresets: PersonalizationPreset[];
}

// 个性化预设
export interface PersonalizationPreset {
  id: string;
  name: string;
  description: string;
  ritualIntensity: RitualIntensity;
  enabledTypes: RitualType[];
  visualTheme: string;
  audioEnabled: boolean;
  animationLevel: 'minimal' | 'standard' | 'enhanced';
}

// 文化配置
export interface CulturalConfig {
  region: string;
  language: string;
  colorPreferences: string[];
  symbolPreferences: string[];
  avoidedSymbols: string[];
  textDirection: 'ltr' | 'rtl';
  dateFormat: string;
  numberFormat: string;
  culturalAdaptations: Record<string, unknown>;
}

// 性能配置
export interface PerformanceConfig {
  autoOptimization: boolean;
  fpsThreshold: number;
  memoryThreshold: number; // MB
  batteryOptimization: boolean;
  networkOptimization: boolean;
  degradationStrategy: 'graceful' | 'aggressive' | 'disabled';
  monitoringEnabled: boolean;
}

// 可访问性配置
export interface AccessibilityConfig {
  enabled: boolean;
  highContrast: boolean;
  reducedMotion: boolean;
  screenReaderSupport: boolean;
  keyboardNavigation: boolean;
  focusIndicators: boolean;
  alternativeText: boolean;
  colorBlindSupport: boolean;
  fontSize: 'small' | 'medium' | 'large' | 'extra-large';
}

// 主要仪式感配置接口
export interface RitualConfiguration {
  id: string;
  name: string;
  description?: string;
  version: ConfigVersion;
  type: RitualType;
  triggers: RitualTriggerConfig[];
  visual: VisualRitualConfig;
  audio: AudioRitualConfig;
  animation: AnimationRitualConfig;
  personalization: PersonalizationConfig;
  culturalAdaptations: CulturalConfig[];
  performanceSettings: PerformanceConfig;
  accessibility: AccessibilityConfig;
  metadata: ConfigMetadata;
}

// 触发器配置
export interface RitualTriggerConfig {
  id: string;
  actionType: string;
  conditions: ElementCondition[];
  priority: number;
  cooldownMs: number;
  enabled: boolean;
}

// 配置元数据
export interface ConfigMetadata {
  createdAt: number;
  updatedAt: number;
  createdBy: string;
  tags: string[];
  category: string;
  isDefault: boolean;
  isActive: boolean;
  usageCount: number;
  lastUsed?: number;
}

// 配置验证结果
export interface ConfigValidationResult {
  isValid: boolean;
  errors: ConfigValidationError[];
  warnings: ConfigValidationWarning[];
  suggestions: ConfigSuggestion[];
}

// 配置验证错误
export interface ConfigValidationError {
  field: string;
  message: string;
  severity: 'error' | 'warning';
  code: string;
}

// 配置验证警告
export interface ConfigValidationWarning {
  field: string;
  message: string;
  recommendation: string;
}

// 配置建议
export interface ConfigSuggestion {
  type: 'optimization' | 'accessibility' | 'performance' | 'cultural';
  message: string;
  action: string;
  impact: 'low' | 'medium' | 'high';
}

// 配置管理器类
export class RitualConfigurationManager {
  private configurations: Map<string, RitualConfiguration> = new Map();
  private activeConfiguration: RitualConfiguration | null = null;
  private configHistory: ConfigVersion[] = [];
  private validators: ConfigValidator[] = [];
  private listeners: ConfigChangeListener[] = [];

  constructor() {
    this.initializeDefaultConfigurations();
    this.setupValidators();
  }

  /**
   * 初始化默认配置
   */
  private initializeDefaultConfigurations(): void {
    const defaultConfigs = this.createDefaultConfigurations();
    defaultConfigs.forEach(config => {
      this.configurations.set(config.id, config);
    });

    // 设置默认活跃配置
    const defaultConfig = defaultConfigs.find(c => c.metadata.isDefault);
    if (defaultConfig) {
      this.activeConfiguration = defaultConfig;
    }
  }

  /**
   * 创建默认配置集合
   */
  private createDefaultConfigurations(): RitualConfiguration[] {
    return [
      this.createWelcomeConfiguration(),
      this.createAchievementConfiguration(),
      this.createCreationConfiguration(),
      this.createSharingConfiguration(),
      this.createMilestoneConfiguration(),
      this.createTransitionConfiguration()
    ];
  }

  /**
   * 创建欢迎仪式配置
   */
  private createWelcomeConfiguration(): RitualConfiguration {
    return {
      id: 'welcome-default',
      name: '欢迎仪式 Welcome - 默认',
      description: '用户首次登录或回归时的欢迎仪式',
      version: {
        major: 1,
        minor: 0,
        patch: 0,
        timestamp: Date.now(),
        description: '初始版本'
      },
      type: RitualType.WELCOME,
      triggers: [
        {
          id: 'user-login',
          actionType: 'user_login',
          conditions: [
            { type: 'intensity', operator: 'gte', value: RitualIntensity.MODERATE }
          ],
          priority: 1,
          cooldownMs: 24 * 60 * 60 * 1000, // 24小时
          enabled: true
        }
      ],
      visual: this.createDefaultVisualConfig('gold'),
      audio: this.createDefaultAudioConfig(['welcome-chime', 'warm-harmony']),
      animation: this.createDefaultAnimationConfig(),
      personalization: this.createDefaultPersonalizationConfig(),
      culturalAdaptations: [this.createDefaultCulturalConfig()],
      performanceSettings: this.createDefaultPerformanceConfig(),
      accessibility: this.createDefaultAccessibilityConfig(),
      metadata: {
        createdAt: Date.now(),
        updatedAt: Date.now(),
        createdBy: 'system',
        tags: ['welcome', 'onboarding', 'first-time'],
        category: 'user-experience',
        isDefault: true,
        isActive: true,
        usageCount: 0
      }
    };
  }

  /**
   * 创建成就仪式配置
   */
  private createAchievementConfiguration(): RitualConfiguration {
    return {
      id: 'achievement-default',
      name: '成就仪式 - 默认',
      description: '用户完成任务或达成成就时的庆祝仪式',
      version: {
        major: 1,
        minor: 0,
        patch: 0,
        timestamp: Date.now()
      },
      type: RitualType.ACHIEVEMENT,
      triggers: [
        {
          id: 'task-completed',
          actionType: 'task_completed',
          conditions: [],
          priority: 2,
          cooldownMs: 5 * 60 * 1000, // 5分钟
          enabled: true
        }
      ],
      visual: this.createDefaultVisualConfig('purple'),
      audio: this.createDefaultAudioConfig(['success-fanfare', 'achievement-bell']),
      animation: this.createDefaultAnimationConfig(),
      personalization: this.createDefaultPersonalizationConfig(),
      culturalAdaptations: [this.createDefaultCulturalConfig()],
      performanceSettings: this.createDefaultPerformanceConfig(),
      accessibility: this.createDefaultAccessibilityConfig(),
      metadata: {
        createdAt: Date.now(),
        updatedAt: Date.now(),
        createdBy: 'system',
        tags: ['achievement', 'success', 'celebration'],
        category: 'feedback',
        isDefault: false,
        isActive: true,
        usageCount: 0
      }
    };
  }

  /**
   * 创建其他配置的占位符方法
   */
  private createCreationConfiguration(): RitualConfiguration {
    return { ...this.createAchievementConfiguration(), id: 'creation-default', type: RitualType.CREATION };
  }

  private createSharingConfiguration(): RitualConfiguration {
    return { ...this.createAchievementConfiguration(), id: 'sharing-default', type: RitualType.SHARING };
  }

  private createMilestoneConfiguration(): RitualConfiguration {
    return { ...this.createAchievementConfiguration(), id: 'milestone-default', type: RitualType.MILESTONE };
  }

  private createTransitionConfiguration(): RitualConfiguration {
    return { ...this.createAchievementConfiguration(), id: 'transition-default', type: RitualType.TRANSITION };
  }

  /**
   * 创建默认视觉配置
   */
  private createDefaultVisualConfig(theme: string): VisualRitualConfig {
    return {
      colorScheme: {
        primary: theme === 'gold' ? '#FFD700' : theme === 'purple' ? '#7C3AED' : '#1E3A8A',
        secondary: '#FFFFFF',
        accent: '#F59E0B',
        background: '#000000',
        surface: '#1F2937',
        text: '#FFFFFF',
        glow: 'rgba(255, 215, 0, 0.3)',
        gradient: ['#FFD700', '#7C3AED', '#1E3A8A']
      },
      typography: {
        fontFamily: 'Cinzel, serif',
        fontSize: {
          xs: '0.75rem',
          sm: '0.875rem',
          base: '1rem',
          lg: '1.125rem',
          xl: '1.25rem',
          '2xl': '1.5rem',
          '3xl': '1.875rem',
          '4xl': '2.25rem',
          '5xl': '3rem'
        },
        fontWeight: {
          light: 300,
          normal: 400,
          medium: 500,
          semibold: 600,
          bold: 700
        },
        lineHeight: {
          tight: 1.25,
          normal: 1.5,
          relaxed: 1.625,
          loose: 2
        },
        letterSpacing: {
          tight: '-0.025em',
          normal: '0em',
          wide: '0.025em',
          wider: '0.05em'
        }
      },
      decorativeElements: [
        {
          id: 'golden-border',
          type: 'border',
          styles: {
            border: '2px solid #FFD700',
            borderRadius: '8px'
          },
          priority: 1,
          enabled: true
        },
        {
          id: 'divine-glow',
          type: 'glow',
          styles: {
            boxShadow: '0 0 20px rgba(255, 215, 0, 0.3)'
          },
          priority: 2,
          enabled: true
        }
      ],
      layout: {
        spacing: {
          xs: '0.25rem',
          sm: '0.5rem',
          md: '1rem',
          lg: '1.5rem',
          xl: '2rem'
        },
        borderRadius: {
          sm: '4px',
          md: '8px',
          lg: '12px',
          xl: '16px',
          full: '9999px'
        },
        shadows: {
          subtle: '0 2px 8px rgba(255, 215, 0, 0.1)',
          moderate: '0 4px 16px rgba(255, 215, 0, 0.2)',
          dramatic: '0 8px 32px rgba(255, 215, 0, 0.3)',
          epic: '0 16px 64px rgba(255, 215, 0, 0.4)'
        },
        zIndex: {
          base: 1,
          overlay: 1000,
          modal: 2000,
          tooltip: 3000,
          notification: 4000
        }
      },
      intensity: {
        [RitualIntensity.SUBTLE]: {
          opacity: 0.3,
          scale: 1.0,
          blur: 0,
          brightness: 1.0,
          saturation: 1.0,
          animationDuration: 500,
          particleCount: 8
        },
        [RitualIntensity.MODERATE]: {
          opacity: 0.6,
          scale: 1.02,
          blur: 0,
          brightness: 1.1,
          saturation: 1.1,
          animationDuration: 800,
          particleCount: 16
        },
        [RitualIntensity.DRAMATIC]: {
          opacity: 0.8,
          scale: 1.05,
          blur: 0,
          brightness: 1.2,
          saturation: 1.2,
          animationDuration: 1200,
          particleCount: 32
        },
        [RitualIntensity.EPIC]: {
          opacity: 1.0,
          scale: 1.1,
          blur: 0,
          brightness: 1.3,
          saturation: 1.3,
          animationDuration: 1800,
          particleCount: 64
        }
      }
    };
  }

  /**
   * 创建默认音频配置
   */
  private createDefaultAudioConfig(soundIds: string[]): AudioRitualConfig {
    return {
      soundEffects: soundIds.map(id => ({
        id,
        name: id.replace('-', ' '),
        url: `/assets/sounds/${id}.mp3`,
        volume: 0.7,
        duration: 2000,
        loop: false
      })),
      ambientMusic: [],
      volume: {
        master: 0.8,
        effects: 0.7,
        ambient: 0.5,
        ui: 0.6
      },
      spatialAudio: false,
      enabled: true
    };
  }

  /**
   * 创建默认动画配置
   */
  private createDefaultAnimationConfig(): AnimationRitualConfig {
    return {
      enabled: true,
      respectReducedMotion: true,
      defaultDuration: 800,
      defaultEasing: 'cubic-bezier(0.25, 0.46, 0.45, 0.94)',
      performanceMode: 'auto',
      maxConcurrentAnimations: 10,
      frameRateTarget: 60
    };
  }

  /**
   * 创建默认个性化配置
   */
  private createDefaultPersonalizationConfig(): PersonalizationConfig {
    return {
      enabled: true,
      learningEnabled: true,
      adaptationSpeed: 'medium',
      privacyMode: false,
      dataRetentionDays: 90,
      customPresets: []
    };
  }

  /**
   * 创建默认文化配置
   */
  private createDefaultCulturalConfig(): CulturalConfig {
    return {
      region: 'global',
      language: 'zh-CN',
      colorPreferences: ['#FFD700', '#7C3AED', '#1E3A8A'],
      symbolPreferences: ['star', 'crown', 'diamond'],
      avoidedSymbols: [],
      textDirection: 'ltr',
      dateFormat: 'YYYY-MM-DD',
      numberFormat: '1,234.56',
      culturalAdaptations: {}
    };
  }

  /**
   * 创建默认性能配置
   */
  private createDefaultPerformanceConfig(): PerformanceConfig {
    return {
      autoOptimization: true,
      fpsThreshold: 45,
      memoryThreshold: 100,
      batteryOptimization: true,
      networkOptimization: true,
      degradationStrategy: 'graceful',
      monitoringEnabled: true
    };
  }

  /**
   * 创建默认可访问性配置
   */
  private createDefaultAccessibilityConfig(): AccessibilityConfig {
    return {
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

  /**
   * 设置验证器
   */
  private setupValidators(): void {
    this.validators = [
      new ConfigStructureValidator(),
      new ConfigValueValidator(),
      new ConfigCompatibilityValidator(),
      new ConfigPerformanceValidator(),
      new ConfigAccessibilityValidator()
    ];
  }

  /**
   * 获取配置
   */
  getConfiguration(id: string): RitualConfiguration | null {
    return this.configurations.get(id) || null;
  }

  /**
   * 获取活跃配置
   */
  getActiveConfiguration(): RitualConfiguration | null {
    return this.activeConfiguration;
  }

  /**
   * 设置活跃配置
   */
  setActiveConfiguration(id: string): boolean {
    const config = this.configurations.get(id);
    if (!config) {
      return false;
    }

    const oldConfig = this.activeConfiguration;
    this.activeConfiguration = config;
    
    // 触发配置变更事件
    this.notifyConfigChange(oldConfig, config);
    
    return true;
  }

  /**
   * 添加配置
   */
  addConfiguration(config: RitualConfiguration): ConfigValidationResult {
    const normalizedConfig = this.normalizeConfiguration(config);
    const validation = this.validateConfiguration(normalizedConfig);
    
    if (validation.isValid) {
      this.configurations.set(normalizedConfig.id, normalizedConfig);
      this.notifyConfigAdd(normalizedConfig);
    }
    
    return validation;
  }

  /**
   * 更新配置
   */
  updateConfiguration(id: string, updates: Partial<RitualConfiguration>): ConfigValidationResult {
    const existing = this.configurations.get(id);
    if (!existing) {
      return {
        isValid: false,
        errors: [{ field: 'id', message: 'Configuration not found', severity: 'error', code: 'NOT_FOUND' }],
        warnings: [],
        suggestions: []
      };
    }

    const updated = this.normalizeConfiguration({ ...existing, ...updates }, existing);
    updated.version.patch++;
    updated.version.timestamp = Date.now();
    updated.metadata.updatedAt = Date.now();

    const validation = this.validateConfiguration(updated);
    
    if (validation.isValid) {
      this.configurations.set(id, updated);
      this.notifyConfigUpdate(existing, updated);
    }
    
    return validation;
  }

  /**
   * 标准化配置对象，避免外部引用导致的默认标记遗留
   */
  private normalizeConfiguration(
    config: RitualConfiguration,
    base?: RitualConfiguration
  ): RitualConfiguration {
    const now = Date.now();
    const metadataSource = (config.metadata || base?.metadata || {}) as Partial<ConfigMetadata>;
    const baseMetadata = base?.metadata;

    const metadata: ConfigMetadata = {
      createdAt: metadataSource.createdAt ?? baseMetadata?.createdAt ?? now,
      updatedAt: metadataSource.updatedAt ?? baseMetadata?.updatedAt ?? now,
      createdBy: metadataSource.createdBy ?? baseMetadata?.createdBy ?? 'system',
      category: metadataSource.category ?? baseMetadata?.category ?? 'user-defined',
      usageCount: metadataSource.usageCount ?? baseMetadata?.usageCount ?? 0,
      isDefault: baseMetadata?.isDefault ?? false,
      isActive: metadataSource.isActive ?? baseMetadata?.isActive ?? false,
      tags: [...(metadataSource.tags || baseMetadata?.tags || [])]
    };

    if (metadataSource.lastUsed || baseMetadata?.lastUsed) {
      metadata.lastUsed = metadataSource.lastUsed ?? baseMetadata?.lastUsed;
    }

    if (!base) {
      metadata.isDefault = false;
      metadata.isActive = metadataSource.isActive ?? false;
    }

    return {
      ...config,
      triggers: [...(config.triggers || [])],
      visual: { ...config.visual },
      audio: { ...config.audio },
      animation: { ...config.animation },
      personalization: { ...config.personalization },
      culturalAdaptations: [...(config.culturalAdaptations || [])],
      performanceSettings: { ...config.performanceSettings },
      accessibility: { ...config.accessibility },
      version: { ...config.version },
      metadata
    };
  }

  /**
   * 删除配置
   */
  removeConfiguration(id: string): boolean {
    const config = this.configurations.get(id);
    if (!config) {
      return false;
    }

    // 不能删除默认配置
    if (config.metadata.isDefault) {
      return false;
    }

    // 如果是活跃配置，切换到默认配置
    if (this.activeConfiguration?.id === id) {
      const defaultConfig = Array.from(this.configurations.values())
        .find(c => c.metadata.isDefault);
      this.activeConfiguration = defaultConfig || null;
    }

    this.configurations.delete(id);
    this.notifyConfigRemove(config);
    
    return true;
  }

  /**
   * 验证配置
   */
  validateConfiguration(config: RitualConfiguration): ConfigValidationResult {
    const result: ConfigValidationResult = {
      isValid: true,
      errors: [],
      warnings: [],
      suggestions: []
    };

    // 运行所有验证器
    for (const validator of this.validators) {
      const validationResult = validator.validate(config);
      result.errors.push(...validationResult.errors);
      result.warnings.push(...validationResult.warnings);
      result.suggestions.push(...validationResult.suggestions);
    }

    result.isValid = result.errors.length === 0;
    
    return result;
  }

  /**
   * 获取所有配置
   */
  getAllConfigurations(): RitualConfiguration[] {
    return Array.from(this.configurations.values());
  }

  /**
   * 按类型获取配置
   */
  getConfigurationsByType(type: RitualType): RitualConfiguration[] {
    return Array.from(this.configurations.values())
      .filter(config => config.type === type);
  }

  /**
   * 搜索配置
   */
  searchConfigurations(query: string): RitualConfiguration[] {
    const lowerQuery = query.toLowerCase();
    return Array.from(this.configurations.values())
      .filter(config => 
        config.name.toLowerCase().includes(lowerQuery) ||
        config.description?.toLowerCase().includes(lowerQuery) ||
        config.metadata.tags.some(tag => tag.toLowerCase().includes(lowerQuery))
      );
  }

  /**
   * 导出配置
   */
  exportConfiguration(id: string): string | null {
    const config = this.configurations.get(id);
    if (!config) {
      return null;
    }

    return JSON.stringify(config, null, 2);
  }

  /**
   * 导入配置
   */
  importConfiguration(configJson: string): ConfigValidationResult {
    try {
      const config: RitualConfiguration = JSON.parse(configJson);
      return this.addConfiguration(config);
    } catch (error) {
      return {
        isValid: false,
        errors: [{ 
          field: 'json', 
          message: 'Invalid JSON format', 
          severity: 'error', 
          code: 'INVALID_JSON' 
        }],
        warnings: [],
        suggestions: []
      };
    }
  }

  /**
   * 添加配置变更监听器
   */
  addChangeListener(listener: ConfigChangeListener): void {
    this.listeners.push(listener);
  }

  /**
   * 移除配置变更监听器
   */
  removeChangeListener(listener: ConfigChangeListener): void {
    const index = this.listeners.indexOf(listener);
    if (index > -1) {
      this.listeners.splice(index, 1);
    }
  }

  /**
   * 通知配置变更
   */
  private notifyConfigChange(oldConfig: RitualConfiguration | null, newConfig: RitualConfiguration): void {
    this.listeners.forEach(listener => {
      try {
        listener.onConfigurationChanged?.(oldConfig, newConfig);
      } catch (error) {
        this.logListenerError('Error in config change listener:', error);
      }
    });
  }

  /**
   * 通知配置添加
   */
  private notifyConfigAdd(config: RitualConfiguration): void {
    this.listeners.forEach(listener => {
      try {
        listener.onConfigurationAdded?.(config);
      } catch (error) {
        this.logListenerError('Error in config add listener:', error);
      }
    });
  }

  /**
   * 通知配置更新
   */
  private notifyConfigUpdate(oldConfig: RitualConfiguration, newConfig: RitualConfiguration): void {
    this.listeners.forEach(listener => {
      try {
        listener.onConfigurationUpdated?.(oldConfig, newConfig);
      } catch (error) {
        this.logListenerError('Error in config update listener:', error);
      }
    });
  }

  /**
   * 通知配置删除
   */
  private notifyConfigRemove(config: RitualConfiguration): void {
    this.listeners.forEach(listener => {
      try {
        listener.onConfigurationRemoved?.(config);
      } catch (error) {
        this.logListenerError('Error in config remove listener:', error);
      }
    });
  }

  private logListenerError(message: string, error: unknown): void {
    if (typeof process !== 'undefined' && process.env?.NODE_ENV === 'test') {
      return;
    }
    console.error(message, error);
  }

  /**
   * 销毁配置管理器
   */
  destroy(): void {
    this.configurations.clear();
    this.activeConfiguration = null;
    this.configHistory = [];
    this.validators = [];
    this.listeners = [];
  }
}

// 配置变更监听器接口
export interface ConfigChangeListener {
  onConfigurationChanged?(oldConfig: RitualConfiguration | null, newConfig: RitualConfiguration): void;
  onConfigurationAdded?(config: RitualConfiguration): void;
  onConfigurationUpdated?(oldConfig: RitualConfiguration, newConfig: RitualConfiguration): void;
  onConfigurationRemoved?(config: RitualConfiguration): void;
}

// 配置验证器基类
abstract class ConfigValidator {
  abstract validate(config: RitualConfiguration): ConfigValidationResult;
}

// 配置结构验证器
class ConfigStructureValidator extends ConfigValidator {
  validate(config: RitualConfiguration): ConfigValidationResult {
    const result: ConfigValidationResult = {
      isValid: true,
      errors: [],
      warnings: [],
      suggestions: []
    };

    // 验证必需字段
    if (!config.id) {
      result.errors.push({
        field: 'id',
        message: 'Configuration ID is required',
        severity: 'error',
        code: 'REQUIRED_FIELD'
      });
    }

    if (!config.name) {
      result.errors.push({
        field: 'name',
        message: 'Configuration name is required',
        severity: 'error',
        code: 'REQUIRED_FIELD'
      });
    }

    if (!config.type) {
      result.errors.push({
        field: 'type',
        message: 'Configuration type is required',
        severity: 'error',
        code: 'REQUIRED_FIELD'
      });
    }

    result.isValid = result.errors.length === 0;
    return result;
  }
}

// 配置值验证器
class ConfigValueValidator extends ConfigValidator {
  validate(config: RitualConfiguration): ConfigValidationResult {
    const result: ConfigValidationResult = {
      isValid: true,
      errors: [],
      warnings: [],
      suggestions: []
    };

    // 验证颜色值
    if (config.visual?.colorScheme) {
      const colors = Object.values(config.visual.colorScheme);
      colors.forEach((color, index) => {
        if (typeof color === 'string' && !this.isValidColor(color)) {
          result.warnings.push({
            field: `visual.colorScheme[${index}]`,
            message: `Invalid color format: ${color}`,
            recommendation: 'Use valid CSS color format (hex, rgb, hsl, etc.)'
          });
        }
      });
    }

    // 验证音量值
    if (config.audio?.volume) {
      Object.entries(config.audio.volume).forEach(([key, value]) => {
        if (typeof value === 'number' && (value < 0 || value > 1)) {
          result.errors.push({
            field: `audio.volume.${key}`,
            message: `Volume must be between 0 and 1, got ${value}`,
            severity: 'error',
            code: 'INVALID_RANGE'
          });
        }
      });
    }

    result.isValid = result.errors.length === 0;
    return result;
  }

  private isValidColor(color: string): boolean {
    // 简单的颜色格式验证
    const colorRegex = /^(#[0-9A-Fa-f]{3,8}|rgb\(|rgba\(|hsl\(|hsla\(|[a-zA-Z]+).*$/;
    return colorRegex.test(color);
  }
}

// 配置兼容性验证器
class ConfigCompatibilityValidator extends ConfigValidator {
  validate(config: RitualConfiguration): ConfigValidationResult {
    const result: ConfigValidationResult = {
      isValid: true,
      errors: [],
      warnings: [],
      suggestions: []
    };

    // 检查版本兼容性
    if (config.version.major > 1) {
      result.warnings.push({
        field: 'version',
        message: 'Configuration version may not be fully compatible',
        recommendation: 'Consider updating to latest configuration format'
      });
    }

    result.isValid = result.errors.length === 0;
    return result;
  }
}

// 配置性能验证器
class ConfigPerformanceValidator extends ConfigValidator {
  validate(config: RitualConfiguration): ConfigValidationResult {
    const result: ConfigValidationResult = {
      isValid: true,
      errors: [],
      warnings: [],
      suggestions: []
    };

    // 检查粒子数量
    if (config.visual?.intensity) {
      Object.entries(config.visual.intensity).forEach(([intensityLevel, settings]) => {
        if (settings.particleCount > 100) {
          result.suggestions.push({
            type: 'performance',
            message: `High particle count (${settings.particleCount}) at intensity ${intensityLevel} may impact performance`,
            action: 'Consider reducing particle count for better performance',
            impact: 'medium'
          });
        }
      });
    }

    // 检查动画数量
    if (config.animation?.maxConcurrentAnimations && config.animation.maxConcurrentAnimations > 20) {
      result.suggestions.push({
        type: 'performance',
        message: 'High concurrent animation limit may impact performance',
        action: 'Consider reducing max concurrent animations',
        impact: 'high'
      });
    }

    result.isValid = result.errors.length === 0;
    return result;
  }
}

// 配置可访问性验证器
class ConfigAccessibilityValidator extends ConfigValidator {
  validate(config: RitualConfiguration): ConfigValidationResult {
    const result: ConfigValidationResult = {
      isValid: true,
      errors: [],
      warnings: [],
      suggestions: []
    };

    // 检查可访问性设置
    if (!config.accessibility?.enabled) {
      result.suggestions.push({
        type: 'accessibility',
        message: 'Accessibility features are disabled',
        action: 'Enable accessibility features for better user experience',
        impact: 'high'
      });
    }

    if (!config.animation?.respectReducedMotion) {
      result.suggestions.push({
        type: 'accessibility',
        message: 'Reduced motion preference is not respected',
        action: 'Enable reduced motion support for accessibility',
        impact: 'medium'
      });
    }

    result.isValid = result.errors.length === 0;
    return result;
  }
}
