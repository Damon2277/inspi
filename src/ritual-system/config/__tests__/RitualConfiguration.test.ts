/**
 * 仪式感配置管理系统测试
 */

import { 
  RitualConfigurationManager, 
  RitualConfiguration, 
  ConfigChangeListener 
} from '../RitualConfiguration';
import { RitualType, RitualIntensity } from '../../types';

describe('RitualConfigurationManager', () => {
  let configManager: RitualConfigurationManager;

  beforeEach(() => {
    configManager = new RitualConfigurationManager();
  });

  afterEach(() => {
    configManager.destroy();
  });

  describe('initialization', () => {
    it('should initialize with default configurations', () => {
      const configs = configManager.getAllConfigurations();
      expect(configs.length).toBeGreaterThan(0);
      
      // 应该有所有仪式感类型的默认配置
      const types = configs.map(c => c.type);
      expect(types).toContain(RitualType.WELCOME);
      expect(types).toContain(RitualType.ACHIEVEMENT);
      expect(types).toContain(RitualType.CREATION);
    });

    it('should have an active configuration', () => {
      const activeConfig = configManager.getActiveConfiguration();
      expect(activeConfig).toBeTruthy();
      expect(activeConfig?.metadata.isDefault).toBe(true);
    });
  });

  describe('configuration management', () => {
    it('should get configuration by id', () => {
      const config = configManager.getConfiguration('welcome-default');
      expect(config).toBeTruthy();
      expect(config?.id).toBe('welcome-default');
      expect(config?.type).toBe(RitualType.WELCOME);
    });

    it('should return null for non-existent configuration', () => {
      const config = configManager.getConfiguration('non-existent');
      expect(config).toBeNull();
    });

    it('should get configurations by type', () => {
      const welcomeConfigs = configManager.getConfigurationsByType(RitualType.WELCOME);
      expect(welcomeConfigs.length).toBeGreaterThan(0);
      welcomeConfigs.forEach(config => {
        expect(config.type).toBe(RitualType.WELCOME);
      });
    });

    it('should search configurations', () => {
      const results = configManager.searchConfigurations('welcome');
      expect(results.length).toBeGreaterThan(0);
      
      const hasWelcomeInName = results.some(config => 
        config.name.toLowerCase().includes('welcome')
      );
      expect(hasWelcomeInName).toBe(true);
    });
  });

  describe('configuration CRUD operations', () => {
    const testConfig: RitualConfiguration = {
      id: 'test-config',
      name: '测试配置',
      description: '这是一个测试配置',
      version: {
        major: 1,
        minor: 0,
        patch: 0,
        timestamp: Date.now()
      },
      type: RitualType.ACHIEVEMENT,
      triggers: [],
      visual: {
        colorScheme: {
          primary: '#FFD700',
          secondary: '#FFFFFF',
          accent: '#F59E0B',
          background: '#000000',
          surface: '#1F2937',
          text: '#FFFFFF',
          glow: 'rgba(255, 215, 0, 0.3)',
          gradient: ['#FFD700', '#7C3AED']
        },
        typography: {
          fontFamily: 'Arial, sans-serif',
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
        decorativeElements: [],
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
            subtle: '0 2px 8px rgba(0,0,0,0.1)',
            moderate: '0 4px 16px rgba(0,0,0,0.2)',
            dramatic: '0 8px 32px rgba(0,0,0,0.3)',
            epic: '0 16px 64px rgba(0,0,0,0.4)'
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
      },
      audio: {
        soundEffects: [],
        ambientMusic: [],
        volume: {
          master: 0.8,
          effects: 0.7,
          ambient: 0.5,
          ui: 0.6
        },
        spatialAudio: false,
        enabled: true
      },
      animation: {
        enabled: true,
        respectReducedMotion: true,
        defaultDuration: 800,
        defaultEasing: 'ease-out',
        performanceMode: 'auto',
        maxConcurrentAnimations: 10,
        frameRateTarget: 60
      },
      personalization: {
        enabled: true,
        learningEnabled: true,
        adaptationSpeed: 'medium',
        privacyMode: false,
        dataRetentionDays: 90,
        customPresets: []
      },
      culturalAdaptations: [],
      performanceSettings: {
        autoOptimization: true,
        fpsThreshold: 45,
        memoryThreshold: 100,
        batteryOptimization: true,
        networkOptimization: true,
        degradationStrategy: 'graceful',
        monitoringEnabled: true
      },
      accessibility: {
        enabled: true,
        highContrast: false,
        reducedMotion: false,
        screenReaderSupport: true,
        keyboardNavigation: true,
        focusIndicators: true,
        alternativeText: true,
        colorBlindSupport: true,
        fontSize: 'medium'
      },
      metadata: {
        createdAt: Date.now(),
        updatedAt: Date.now(),
        createdBy: 'test',
        tags: ['test'],
        category: 'test',
        isDefault: false,
        isActive: false,
        usageCount: 0
      }
    };

    it('should add new configuration', () => {
      const result = configManager.addConfiguration(testConfig);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);

      const retrieved = configManager.getConfiguration('test-config');
      expect(retrieved).toBeTruthy();
      expect(retrieved?.name).toBe('测试配置');
    });

    it('should update existing configuration', () => {
      // 先添加配置
      configManager.addConfiguration(testConfig);

      // 更新配置
      const updates = {
        name: '更新后的测试配置',
        description: '这是更新后的描述'
      };

      const result = configManager.updateConfiguration('test-config', updates);
      expect(result.isValid).toBe(true);

      const updated = configManager.getConfiguration('test-config');
      expect(updated?.name).toBe('更新后的测试配置');
      expect(updated?.description).toBe('这是更新后的描述');
      expect(updated?.version.patch).toBe(1); // 版本应该增加
    });

    it('should not update non-existent configuration', () => {
      const result = configManager.updateConfiguration('non-existent', { name: 'test' });
      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].code).toBe('NOT_FOUND');
    });

    it('should remove configuration', () => {
      // 先添加配置
      configManager.addConfiguration(testConfig);
      expect(configManager.getConfiguration('test-config')).toBeTruthy();

      // 删除配置
      const result = configManager.removeConfiguration('test-config');
      expect(result).toBe(true);
      expect(configManager.getConfiguration('test-config')).toBeNull();
    });

    it('should not remove default configuration', () => {
      const result = configManager.removeConfiguration('welcome-default');
      expect(result).toBe(false);
      expect(configManager.getConfiguration('welcome-default')).toBeTruthy();
    });

    it('should not remove non-existent configuration', () => {
      const result = configManager.removeConfiguration('non-existent');
      expect(result).toBe(false);
    });
  });

  describe('active configuration management', () => {
    it('should set active configuration', () => {
      const result = configManager.setActiveConfiguration('achievement-default');
      expect(result).toBe(true);

      const active = configManager.getActiveConfiguration();
      expect(active?.id).toBe('achievement-default');
    });

    it('should not set non-existent configuration as active', () => {
      const result = configManager.setActiveConfiguration('non-existent');
      expect(result).toBe(false);

      // 活跃配置应该保持不变
      const active = configManager.getActiveConfiguration();
      expect(active?.id).not.toBe('non-existent');
    });

    it('should switch to default when removing active configuration', () => {
      const testConfig = {
        ...configManager.getConfiguration('achievement-default')!,
        id: 'temp-config',
        metadata: {
          ...configManager.getConfiguration('achievement-default')!.metadata,
          isDefault: false
        }
      };

      // 添加临时配置并设为活跃
      configManager.addConfiguration(testConfig);
      configManager.setActiveConfiguration('temp-config');
      expect(configManager.getActiveConfiguration()?.id).toBe('temp-config');

      // 删除活跃配置
      configManager.removeConfiguration('temp-config');

      // 应该切换到默认配置
      const active = configManager.getActiveConfiguration();
      expect(active?.metadata.isDefault).toBe(true);
    });
  });

  describe('configuration validation', () => {
    it('should validate valid configuration', () => {
      const testConfig = {
        ...configManager.getConfiguration('welcome-default')!,
        id: 'valid-config'
      };

      const result = configManager.validateConfiguration(testConfig);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject configuration without required fields', () => {
      const invalidConfig: Partial<RitualConfiguration> = {
        // 缺少必需字段
        version: { major: 1, minor: 0, patch: 0, timestamp: Date.now() }
      };

      const result = configManager.validateConfiguration(invalidConfig as RitualConfiguration);
      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      
      const requiredErrors = result.errors.filter(e => e.code === 'REQUIRED_FIELD');
      expect(requiredErrors.length).toBeGreaterThan(0);
    });

    it('should provide warnings for potential issues', () => {
      const configWithIssues = {
        ...configManager.getConfiguration('welcome-default')!,
        id: 'config-with-issues',
        audio: {
          ...configManager.getConfiguration('welcome-default')!.audio,
          volume: {
            master: 1.5, // 超出有效范围
            effects: 0.7,
            ambient: 0.5,
            ui: 0.6
          }
        }
      };

      const result = configManager.validateConfiguration(configWithIssues);
      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      
      const rangeError = result.errors.find(e => e.code === 'INVALID_RANGE');
      expect(rangeError).toBeTruthy();
    });
  });

  describe('import/export', () => {
    it('should export configuration', () => {
      const exported = configManager.exportConfiguration('welcome-default');
      expect(exported).toBeTruthy();
      expect(typeof exported).toBe('string');

      // 应该是有效的JSON
      const parsed = JSON.parse(exported!);
      expect(parsed.id).toBe('welcome-default');
    });

    it('should return null for non-existent configuration export', () => {
      const exported = configManager.exportConfiguration('non-existent');
      expect(exported).toBeNull();
    });

    it('should import valid configuration', () => {
      const testConfig = {
        ...configManager.getConfiguration('welcome-default')!,
        id: 'imported-config',
        name: '导入的配置'
      };

      const configJson = JSON.stringify(testConfig);
      const result = configManager.importConfiguration(configJson);
      
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);

      const imported = configManager.getConfiguration('imported-config');
      expect(imported).toBeTruthy();
      expect(imported?.name).toBe('导入的配置');
    });

    it('should reject invalid JSON import', () => {
      const invalidJson = '{ invalid json }';
      const result = configManager.importConfiguration(invalidJson);
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].code).toBe('INVALID_JSON');
    });
  });

  describe('change listeners', () => {
    it('should notify listeners on configuration change', () => {
      const listener: ConfigChangeListener = {
        onConfigurationChanged: jest.fn(),
        onConfigurationAdded: jest.fn(),
        onConfigurationUpdated: jest.fn(),
        onConfigurationRemoved: jest.fn()
      };

      configManager.addChangeListener(listener);

      // 切换活跃配置
      configManager.setActiveConfiguration('achievement-default');
      expect(listener.onConfigurationChanged).toHaveBeenCalled();

      // 添加配置
      const testConfig = {
        ...configManager.getConfiguration('welcome-default')!,
        id: 'listener-test-config'
      };
      configManager.addConfiguration(testConfig);
      expect(listener.onConfigurationAdded).toHaveBeenCalled();

      // 更新配置
      configManager.updateConfiguration('listener-test-config', { name: '更新的名称' });
      expect(listener.onConfigurationUpdated).toHaveBeenCalled();

      // 删除配置
      configManager.removeConfiguration('listener-test-config');
      expect(listener.onConfigurationRemoved).toHaveBeenCalled();
    });

    it('should remove listeners', () => {
      const listener: ConfigChangeListener = {
        onConfigurationChanged: jest.fn()
      };

      configManager.addChangeListener(listener);
      configManager.removeChangeListener(listener);

      // 切换配置不应该触发监听器
      configManager.setActiveConfiguration('achievement-default');
      expect(listener.onConfigurationChanged).not.toHaveBeenCalled();
    });

    it('should handle listener errors gracefully', () => {
      const faultyListener: ConfigChangeListener = {
        onConfigurationChanged: jest.fn(() => {
          throw new Error('Listener error');
        })
      };

      configManager.addChangeListener(faultyListener);

      // 应该不会抛出错误
      expect(() => {
        configManager.setActiveConfiguration('achievement-default');
      }).not.toThrow();
    });
  });

  describe('performance and suggestions', () => {
    it('should provide performance suggestions for high particle counts', () => {
      const highPerformanceConfig = {
        ...configManager.getConfiguration('welcome-default')!,
        id: 'high-performance-config',
        visual: {
          ...configManager.getConfiguration('welcome-default')!.visual,
          intensity: {
            ...configManager.getConfiguration('welcome-default')!.visual.intensity,
            [RitualIntensity.EPIC]: {
              ...configManager.getConfiguration('welcome-default')!.visual.intensity[RitualIntensity.EPIC],
              particleCount: 150 // 高粒子数量
            }
          }
        }
      };

      const result = configManager.validateConfiguration(highPerformanceConfig);
      const performanceSuggestions = result.suggestions.filter(s => s.type === 'performance');
      expect(performanceSuggestions.length).toBeGreaterThan(0);
    });

    it('should provide accessibility suggestions', () => {
      const inaccessibleConfig = {
        ...configManager.getConfiguration('welcome-default')!,
        id: 'inaccessible-config',
        accessibility: {
          ...configManager.getConfiguration('welcome-default')!.accessibility,
          enabled: false
        },
        animation: {
          ...configManager.getConfiguration('welcome-default')!.animation,
          respectReducedMotion: false
        }
      };

      const result = configManager.validateConfiguration(inaccessibleConfig);
      const accessibilitySuggestions = result.suggestions.filter(s => s.type === 'accessibility');
      expect(accessibilitySuggestions.length).toBeGreaterThan(0);
    });
  });
});
