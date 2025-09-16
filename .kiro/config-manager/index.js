/**
 * 统一配置管理系统
 * Unified Configuration Management System
 * 
 * 整合所有系统的配置文件，提供统一的配置管理接口
 */

const fs = require('fs').promises;
const path = require('path');

class ConfigurationManager {
  constructor() {
    this.configPaths = {
      // 版本管理配置
      version: 'inspi-ai-platform/version.config.json',
      
      // 质量检查配置
      quality: '.kiro/quality-checks/config.json',
      
      // 样式恢复配置
      style: '.kiro/style-recovery/config.json',
      
      // 恢复点配置
      recovery: '.kiro/recovery-points/config.json',
      
      // 仪表板配置
      dashboard: '.kiro/dashboard/config.json',
      
      // 主配置文件
      main: '.kiro/config-manager/main-config.json'
    };
    
    this.configCache = new Map();
    this.configWatchers = new Map();
    this.changeListeners = new Map();
  }

  /**
   * 初始化配置管理器
   * Initialize configuration manager
   */
  async initialize() {
    try {
      console.log('🔧 初始化统一配置管理系统...');

      // 确保配置目录存在
      await fs.mkdir('.kiro/config-manager', { recursive: true });

      // 加载所有配置
      await this.loadAllConfigurations();

      // 创建主配置文件（如果不存在）
      await this.ensureMainConfig();

      // 验证配置完整性
      const validation = await this.validateAllConfigurations();
      
      if (!validation.isValid) {
        console.warn('⚠️ 配置验证发现问题:', validation.issues);
      }

      console.log('✅ 统一配置管理系统初始化完成');
      return {
        success: true,
        validation
      };

    } catch (error) {
      console.error('❌ 配置管理器初始化失败:', error.message);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * 获取配置
   * Get configuration
   */
  async getConfig(configName, key = null) {
    try {
      // 从缓存获取或加载配置
      let config = this.configCache.get(configName);
      
      if (!config) {
        config = await this.loadConfiguration(configName);
      }

      if (key) {
        return this._getNestedValue(config, key);
      }

      return config;

    } catch (error) {
      console.error(`❌ 获取配置失败 (${configName}):`, error.message);
      return null;
    }
  }

  /**
   * 设置配置
   * Set configuration
   */
  async setConfig(configName, key, value) {
    try {
      let config = this.configCache.get(configName) || {};
      
      // 设置嵌套值
      this._setNestedValue(config, key, value);
      
      // 更新缓存
      this.configCache.set(configName, config);
      
      // 保存到文件
      await this.saveConfiguration(configName, config);
      
      // 通知变更监听器
      await this._notifyConfigChange(configName, key, value);

      console.log(`✅ 配置已更新: ${configName}.${key}`);
      return {
        success: true,
        configName,
        key,
        value
      };

    } catch (error) {
      console.error(`❌ 设置配置失败 (${configName}.${key}):`, error.message);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * 加载所有配置
   * Load all configurations
   */
  async loadAllConfigurations() {
    const results = {};

    for (const [name, configPath] of Object.entries(this.configPaths)) {
      try {
        const config = await this.loadConfiguration(name);
        results[name] = {
          success: true,
          config,
          path: configPath
        };
      } catch (error) {
        results[name] = {
          success: false,
          error: error.message,
          path: configPath
        };
      }
    }

    return results;
  }

  /**
   * 加载单个配置
   * Load single configuration
   */
  async loadConfiguration(configName) {
    const configPath = this.configPaths[configName];
    
    if (!configPath) {
      throw new Error(`未知配置: ${configName}`);
    }

    try {
      const content = await fs.readFile(configPath, 'utf8');
      const config = JSON.parse(content);
      
      // 缓存配置
      this.configCache.set(configName, config);
      
      return config;

    } catch (error) {
      if (error.code === 'ENOENT') {
        // 文件不存在，创建默认配置
        const defaultConfig = this._getDefaultConfig(configName);
        await this.saveConfiguration(configName, defaultConfig);
        this.configCache.set(configName, defaultConfig);
        return defaultConfig;
      }
      throw error;
    }
  }

  /**
   * 保存配置
   * Save configuration
   */
  async saveConfiguration(configName, config) {
    const configPath = this.configPaths[configName];
    
    if (!configPath) {
      throw new Error(`未知配置: ${configName}`);
    }

    // 确保目录存在
    const dir = path.dirname(configPath);
    await fs.mkdir(dir, { recursive: true });

    // 添加元数据
    const configWithMeta = {
      ...config,
      _metadata: {
        lastUpdated: new Date().toISOString(),
        version: '1.0.0',
        managedBy: 'config-manager'
      }
    };

    // 保存文件
    await fs.writeFile(configPath, JSON.stringify(configWithMeta, null, 2));
    
    // 更新缓存
    this.configCache.set(configName, config);
  }

  /**
   * 验证所有配置
   * Validate all configurations
   */
  async validateAllConfigurations() {
    const validation = {
      isValid: true,
      issues: [],
      warnings: [],
      summary: {}
    };

    for (const configName of Object.keys(this.configPaths)) {
      try {
        const config = await this.getConfig(configName);
        const configValidation = this._validateSingleConfig(configName, config);
        
        validation.summary[configName] = configValidation;
        
        if (!configValidation.isValid) {
          validation.isValid = false;
          validation.issues.push(...configValidation.issues.map(issue => ({
            config: configName,
            ...issue
          })));
        }
        
        validation.warnings.push(...configValidation.warnings.map(warning => ({
          config: configName,
          ...warning
        })));

      } catch (error) {
        validation.isValid = false;
        validation.issues.push({
          config: configName,
          type: 'load_error',
          message: error.message
        });
      }
    }

    return validation;
  }

  /**
   * 同步配置变更
   * Sync configuration changes
   */
  async syncConfigChanges() {
    try {
      console.log('🔄 开始配置同步...');
      
      const syncResults = {
        timestamp: new Date().toISOString(),
        synced: [],
        conflicts: [],
        errors: []
      };

      // 检查每个配置文件的变更
      for (const [configName, configPath] of Object.entries(this.configPaths)) {
        try {
          // 读取文件当前内容
          const fileContent = await fs.readFile(configPath, 'utf8').catch(() => null);
          const cachedConfig = this.configCache.get(configName);

          if (fileContent && cachedConfig) {
            const fileConfig = JSON.parse(fileContent);
            
            // 比较配置
            if (JSON.stringify(fileConfig) !== JSON.stringify(cachedConfig)) {
              // 检测冲突
              const conflict = this._detectConfigConflict(configName, fileConfig, cachedConfig);
              
              if (conflict) {
                syncResults.conflicts.push(conflict);
              } else {
                // 更新缓存
                this.configCache.set(configName, fileConfig);
                syncResults.synced.push({
                  config: configName,
                  action: 'updated_from_file'
                });
              }
            }
          }

        } catch (error) {
          syncResults.errors.push({
            config: configName,
            error: error.message
          });
        }
      }

      console.log(`✅ 配置同步完成: ${syncResults.synced.length} 个更新, ${syncResults.conflicts.length} 个冲突`);
      return syncResults;

    } catch (error) {
      console.error('❌ 配置同步失败:', error.message);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * 获取配置概览
   * Get configuration overview
   */
  async getConfigurationOverview() {
    try {
      const overview = {
        timestamp: new Date().toISOString(),
        totalConfigs: Object.keys(this.configPaths).length,
        loadedConfigs: this.configCache.size,
        configs: {}
      };

      for (const [configName, configPath] of Object.entries(this.configPaths)) {
        const config = await this.getConfig(configName);
        
        overview.configs[configName] = {
          path: configPath,
          exists: config !== null,
          size: config ? Object.keys(config).length : 0,
          lastUpdated: config?._metadata?.lastUpdated || 'unknown'
        };
      }

      return overview;

    } catch (error) {
      return {
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * 导出所有配置
   * Export all configurations
   */
  async exportConfigurations(exportPath = '.kiro/config-manager/export') {
    try {
      await fs.mkdir(exportPath, { recursive: true });
      
      const exportData = {
        timestamp: new Date().toISOString(),
        version: '1.0.0',
        configurations: {}
      };

      for (const configName of Object.keys(this.configPaths)) {
        const config = await this.getConfig(configName);
        if (config) {
          exportData.configurations[configName] = config;
        }
      }

      const exportFile = path.join(exportPath, `config-export-${Date.now()}.json`);
      await fs.writeFile(exportFile, JSON.stringify(exportData, null, 2));

      console.log(`✅ 配置导出完成: ${exportFile}`);
      return {
        success: true,
        exportFile,
        configCount: Object.keys(exportData.configurations).length
      };

    } catch (error) {
      console.error('❌ 配置导出失败:', error.message);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * 添加配置变更监听器
   * Add configuration change listener
   */
  addChangeListener(configName, callback) {
    if (!this.changeListeners.has(configName)) {
      this.changeListeners.set(configName, []);
    }
    
    this.changeListeners.get(configName).push(callback);
  }

  /**
   * 移除配置变更监听器
   * Remove configuration change listener
   */
  removeChangeListener(configName, callback) {
    const listeners = this.changeListeners.get(configName);
    if (listeners) {
      const index = listeners.indexOf(callback);
      if (index > -1) {
        listeners.splice(index, 1);
      }
    }
  }

  // 私有方法

  /**
   * 确保主配置文件存在
   */
  async ensureMainConfig() {
    const mainConfigPath = this.configPaths.main;
    
    try {
      await fs.access(mainConfigPath);
    } catch {
      // 创建默认主配置
      const defaultMainConfig = {
        version: '1.0.0',
        name: 'Inspi AI Platform Configuration',
        description: '统一配置管理系统主配置文件',
        systems: {
          version: { enabled: true, priority: 1 },
          quality: { enabled: true, priority: 2 },
          style: { enabled: true, priority: 3 },
          recovery: { enabled: true, priority: 4 },
          dashboard: { enabled: true, priority: 5 }
        },
        global: {
          logLevel: 'info',
          autoSync: true,
          backupEnabled: true,
          notificationEnabled: true
        }
      };

      await this.saveConfiguration('main', defaultMainConfig);
    }
  }

  /**
   * 获取默认配置
   */
  _getDefaultConfig(configName) {
    const defaults = {
      version: {
        strategy: 'semantic',
        tagPrefix: 'v',
        autoTag: true,
        autoRelease: false
      },
      quality: {
        enabled: true,
        checkOnCommit: true,
        thresholds: {
          coverage: 80,
          complexity: 10
        }
      },
      style: {
        enabled: true,
        autoSnapshot: true,
        maxSnapshots: 20
      },
      recovery: {
        enabled: true,
        autoBackup: true,
        maxRecoveryPoints: 50
      },
      dashboard: {
        port: 3001,
        autoRefresh: 30,
        theme: 'light'
      },
      main: {
        version: '1.0.0',
        systems: {},
        global: {}
      }
    };

    return defaults[configName] || {};
  }

  /**
   * 验证单个配置
   */
  _validateSingleConfig(configName, config) {
    const validation = {
      isValid: true,
      issues: [],
      warnings: []
    };

    if (!config) {
      validation.isValid = false;
      validation.issues.push({
        type: 'missing_config',
        message: '配置文件不存在或为空'
      });
      return validation;
    }

    // 基于配置类型进行特定验证
    switch (configName) {
      case 'version':
        if (!config.strategy) {
          validation.warnings.push({
            type: 'missing_field',
            field: 'strategy',
            message: '缺少版本策略配置'
          });
        }
        break;

      case 'quality':
        if (config.thresholds && config.thresholds.coverage < 0) {
          validation.issues.push({
            type: 'invalid_value',
            field: 'thresholds.coverage',
            message: '覆盖率阈值不能为负数'
          });
          validation.isValid = false;
        }
        break;

      case 'dashboard':
        if (config.port && (config.port < 1000 || config.port > 65535)) {
          validation.issues.push({
            type: 'invalid_value',
            field: 'port',
            message: '端口号必须在1000-65535之间'
          });
          validation.isValid = false;
        }
        break;
    }

    return validation;
  }

  /**
   * 获取嵌套值
   */
  _getNestedValue(obj, key) {
    return key.split('.').reduce((current, prop) => {
      return current && current[prop] !== undefined ? current[prop] : undefined;
    }, obj);
  }

  /**
   * 设置嵌套值
   */
  _setNestedValue(obj, key, value) {
    const keys = key.split('.');
    const lastKey = keys.pop();
    
    const target = keys.reduce((current, prop) => {
      if (!current[prop] || typeof current[prop] !== 'object') {
        current[prop] = {};
      }
      return current[prop];
    }, obj);
    
    target[lastKey] = value;
  }

  /**
   * 检测配置冲突
   */
  _detectConfigConflict(configName, fileConfig, cachedConfig) {
    // 简化的冲突检测逻辑
    const fileTime = fileConfig._metadata?.lastUpdated;
    const cacheTime = cachedConfig._metadata?.lastUpdated;

    if (fileTime && cacheTime && new Date(fileTime) > new Date(cacheTime)) {
      return {
        config: configName,
        type: 'file_newer',
        message: '文件版本比缓存版本更新',
        fileTime,
        cacheTime
      };
    }

    return null;
  }

  /**
   * 通知配置变更
   */
  async _notifyConfigChange(configName, key, value) {
    const listeners = this.changeListeners.get(configName);
    
    if (listeners && listeners.length > 0) {
      const changeEvent = {
        configName,
        key,
        value,
        timestamp: new Date().toISOString()
      };

      for (const listener of listeners) {
        try {
          await listener(changeEvent);
        } catch (error) {
          console.warn(`配置变更监听器执行失败 (${configName}):`, error.message);
        }
      }
    }
  }
}

module.exports = ConfigurationManager;