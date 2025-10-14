/**
 * 配置加载器 - 处理配置文件的加载、缓存和热更新
 */

import {
  RitualConfiguration,
  ConfigValidationResult,
  ConfigValidationError,
  ConfigValidationWarning,
  ConfigSuggestion,
  RitualConfigurationManager
} from './RitualConfiguration';
import { RitualType } from '../types';

// 配置源类型
export enum ConfigSource {
  LOCAL_STORAGE = 'localStorage',
  SESSION_STORAGE = 'sessionStorage',
  FILE_SYSTEM = 'fileSystem',
  REMOTE_API = 'remoteApi',
  MEMORY = 'memory'
}

// 配置加载选项
export interface ConfigLoadOptions {
  source: ConfigSource;
  path?: string;
  url?: string;
  cacheEnabled?: boolean;
  cacheTTL?: number; // 缓存生存时间（毫秒）
  validateOnLoad?: boolean;
  fallbackToDefault?: boolean;
  retryAttempts?: number;
  retryDelay?: number;
}

// 配置保存选项
export interface ConfigSaveOptions {
  source: ConfigSource;
  path?: string;
  url?: string;
  backup?: boolean;
  compress?: boolean;
  encrypt?: boolean;
}

// 配置缓存项
interface ConfigCacheItem {
  config: RitualConfiguration;
  timestamp: number;
  ttl: number;
  source: ConfigSource;
  checksum: string;
}

// 配置变更事件
export interface ConfigChangeEvent {
  type: 'loaded' | 'saved' | 'updated' | 'error';
  configId: string;
  source: ConfigSource;
  timestamp: number;
  error?: Error;
  oldConfig?: RitualConfiguration;
  newConfig?: RitualConfiguration;
}

// 热更新监听器
export interface HotReloadListener {
  onConfigChanged(event: ConfigChangeEvent): void;
}

type FileWatcher = { close(): void };

export class ConfigurationLoader {
  private cache: Map<string, ConfigCacheItem> = new Map();
  private watchers: Map<string, FileWatcher> = new Map(); // 文件监听器
  private hotReloadListeners: HotReloadListener[] = [];
  private loadPromises: Map<string, Promise<RitualConfiguration>> = new Map();
  private readonly defaultConfigManager = new RitualConfigurationManager();

  constructor() {
    this.initializeStorageListeners();
  }

  private cloneConfig<T>(value: T): T {
    return typeof structuredClone === 'function'
      ? structuredClone(value)
      : (JSON.parse(JSON.stringify(value)) as T);
  }

  private maybeUnrefTimer(handle: ReturnType<typeof setTimeout> | ReturnType<typeof setInterval>): void {
    if (typeof handle === 'object' && handle !== null && 'unref' in handle && typeof (handle as NodeJS.Timeout).unref === 'function') {
      (handle as NodeJS.Timeout).unref();
    }
  }

  /**
   * 初始化存储监听器
   */
  private initializeStorageListeners(): void {
    // 监听localStorage变化
    if (typeof window !== 'undefined') {
      window.addEventListener('storage', (event) => {
        if (event.key?.startsWith('ritual-config-')) {
          const configId = event.key.replace('ritual-config-', '');
          this.handleStorageChange(configId, ConfigSource.LOCAL_STORAGE);
        }
      });
    }
  }

  /**
   * 加载配置
   */
  async loadConfiguration(configId: string, options: ConfigLoadOptions): Promise<RitualConfiguration> {
    // 检查是否已有加载中的Promise
    const existingPromise = this.loadPromises.get(configId);
    if (existingPromise) {
      return existingPromise;
    }

    const loadPromise = this.performLoad(configId, options);
    this.loadPromises.set(configId, loadPromise);

    try {
      const config = await loadPromise;
      this.loadPromises.delete(configId);
      return config;
    } catch (error) {
      this.loadPromises.delete(configId);
      throw error;
    }
  }

  /**
   * 执行实际加载
   */
  private async performLoad(configId: string, options: ConfigLoadOptions): Promise<RitualConfiguration> {
    // 检查缓存
    if (options.cacheEnabled !== false) {
      const cached = this.getCachedConfig(configId);
      if (cached) {
        return cached;
      }
    }

    let config: RitualConfiguration;
    let attempts = 0;
    const maxAttempts = options.retryAttempts || 3;

    while (attempts < maxAttempts) {
      try {
        config = await this.loadFromSource(configId, options);
        break;
      } catch (error) {
        attempts++;
        if (attempts >= maxAttempts) {
          if (options.fallbackToDefault) {
            config = this.createDefaultConfig(configId);
            break;
          }
          throw error;
        }
        
        // 等待重试
        if (options.retryDelay) {
          await new Promise<void>(resolve => {
            const timer = setTimeout(resolve, options.retryDelay);
            this.maybeUnrefTimer(timer);
          });
        }
      }
    }

    // 验证配置
    if (options.validateOnLoad !== false) {
      const validation = this.validateConfig(config!);
      if (!validation.isValid) {
        throw new Error(`Configuration validation failed: ${validation.errors.map(e => e.message).join(', ')}`);
      }
    }

    // 缓存配置
    if (options.cacheEnabled !== false) {
      this.cacheConfig(configId, config!, options);
    }

    // 设置热更新监听
    this.setupHotReload(configId, options);

    // 触发加载事件
    this.notifyConfigChange({
      type: 'loaded',
      configId,
      source: options.source,
      timestamp: Date.now(),
      newConfig: config!
    });

    return config!;
  }

  /**
   * 从指定源加载配置
   */
  private async loadFromSource(configId: string, options: ConfigLoadOptions): Promise<RitualConfiguration> {
    switch (options.source) {
      case ConfigSource.LOCAL_STORAGE:
        return this.loadFromLocalStorage(configId);
      
      case ConfigSource.SESSION_STORAGE:
        return this.loadFromSessionStorage(configId);
      
      case ConfigSource.FILE_SYSTEM:
        return this.loadFromFileSystem(options.path || `configs/${configId}.json`);
      
      case ConfigSource.REMOTE_API:
        return this.loadFromRemoteApi(options.url || `/api/configs/${configId}`);
      
      case ConfigSource.MEMORY:
        return this.loadFromMemory(configId);
      
      default:
        throw new Error(`Unsupported config source: ${options.source}`);
    }
  }

  /**
   * 从localStorage加载
   */
  private async loadFromLocalStorage(configId: string): Promise<RitualConfiguration> {
    if (typeof window === 'undefined') {
      throw new Error('localStorage is not available');
    }

    const stored = localStorage.getItem(`ritual-config-${configId}`);
    if (!stored) {
      throw new Error(`Configuration not found in localStorage: ${configId}`);
    }

    try {
      return JSON.parse(stored);
    } catch (error) {
      throw new Error(`Failed to parse configuration from localStorage: ${error}`);
    }
  }

  /**
   * 从sessionStorage加载
   */
  private async loadFromSessionStorage(configId: string): Promise<RitualConfiguration> {
    if (typeof window === 'undefined') {
      throw new Error('sessionStorage is not available');
    }

    const stored = sessionStorage.getItem(`ritual-config-${configId}`);
    if (!stored) {
      throw new Error(`Configuration not found in sessionStorage: ${configId}`);
    }

    try {
      return JSON.parse(stored);
    } catch (error) {
      throw new Error(`Failed to parse configuration from sessionStorage: ${error}`);
    }
  }

  /**
   * 从文件系统加载
   */
  private async loadFromFileSystem(path: string): Promise<RitualConfiguration> {
    // 在浏览器环境中，使用fetch加载
    if (typeof window !== 'undefined') {
      const response = await fetch(path);
      if (!response.ok) {
        throw new Error(`Failed to load configuration from ${path}: ${response.statusText}`);
      }
      return response.json();
    }

    // 在Node.js环境中，使用fs模块
    if (typeof require !== 'undefined') {
      const fs = (require('fs') as typeof import('fs')).promises;
      const content = await fs.readFile(path, 'utf-8');
      return JSON.parse(content);
    }

    throw new Error('File system access not available');
  }

  /**
   * 从远程API加载
   */
  private async loadFromRemoteApi(url: string): Promise<RitualConfiguration> {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`Failed to load configuration from API: ${response.statusText}`);
    }

    return response.json();
  }

  /**
   * 从内存加载
   */
  private async loadFromMemory(_configId: string): Promise<RitualConfiguration> {
    // 这里可以从内存中的配置存储加载
    // 暂时抛出错误，表示未实现
    throw new Error('Memory source not implemented');
  }

  /**
   * 保存配置
   */
  async saveConfiguration(config: RitualConfiguration, options: ConfigSaveOptions): Promise<void> {
    // 创建备份
    if (options.backup) {
      await this.createBackup(config, options);
    }

    // 压缩配置
    let configData = JSON.stringify(config, null, 2);
    if (options.compress) {
      configData = this.compressConfig(configData);
    }

    // 加密配置
    if (options.encrypt) {
      configData = this.encryptConfig(configData);
    }

    // 保存到指定源
    await this.saveToSource(config.id, configData, options);

    // 更新缓存
    this.updateCache(config.id, config, options.source);

    // 触发保存事件
    this.notifyConfigChange({
      type: 'saved',
      configId: config.id,
      source: options.source,
      timestamp: Date.now(),
      newConfig: config
    });
  }

  /**
   * 保存到指定源
   */
  private async saveToSource(configId: string, configData: string, options: ConfigSaveOptions): Promise<void> {
    switch (options.source) {
      case ConfigSource.LOCAL_STORAGE:
        this.saveToLocalStorage(configId, configData);
        break;
      
      case ConfigSource.SESSION_STORAGE:
        this.saveToSessionStorage(configId, configData);
        break;
      
      case ConfigSource.FILE_SYSTEM:
        await this.saveToFileSystem(options.path || `configs/${configId}.json`, configData);
        break;
      
      case ConfigSource.REMOTE_API:
        await this.saveToRemoteApi(options.url || `/api/configs/${configId}`, configData);
        break;
      
      default:
        throw new Error(`Unsupported save source: ${options.source}`);
    }
  }

  /**
   * 保存到localStorage
   */
  private saveToLocalStorage(configId: string, configData: string): void {
    if (typeof window === 'undefined') {
      throw new Error('localStorage is not available');
    }

    localStorage.setItem(`ritual-config-${configId}`, configData);
  }

  /**
   * 保存到sessionStorage
   */
  private saveToSessionStorage(configId: string, configData: string): void {
    if (typeof window === 'undefined') {
      throw new Error('sessionStorage is not available');
    }

    sessionStorage.setItem(`ritual-config-${configId}`, configData);
  }

  /**
   * 保存到文件系统
   */
  private async saveToFileSystem(path: string, configData: string): Promise<void> {
    // 在Node.js环境中，使用fs模块
    if (typeof require !== 'undefined') {
      const fs = (require('fs') as typeof import('fs')).promises;
      const pathModule = require('path');
      
      // 确保目录存在
      const dir = pathModule.dirname(path);
      await fs.mkdir(dir, { recursive: true });
      
      await fs.writeFile(path, configData, 'utf-8');
      return;
    }

    throw new Error('File system write not available in browser environment');
  }

  /**
   * 保存到远程API
   */
  private async saveToRemoteApi(url: string, configData: string): Promise<void> {
    const response = await fetch(url, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json'
      },
      body: configData
    });

    if (!response.ok) {
      throw new Error(`Failed to save configuration to API: ${response.statusText}`);
    }
  }

  /**
   * 获取缓存的配置
   */
  private getCachedConfig(configId: string): RitualConfiguration | null {
    const cached = this.cache.get(configId);
    if (!cached) {
      return null;
    }

    // 检查TTL
    if (Date.now() - cached.timestamp > cached.ttl) {
      this.cache.delete(configId);
      return null;
    }

    return cached.config;
  }

  /**
   * 缓存配置
   */
  private cacheConfig(configId: string, config: RitualConfiguration, options: ConfigLoadOptions): void {
    const ttl = options.cacheTTL || 5 * 60 * 1000; // 默认5分钟
    const checksum = this.calculateChecksum(config);

    this.cache.set(configId, {
      config,
      timestamp: Date.now(),
      ttl,
      source: options.source,
      checksum
    });
  }

  /**
   * 更新缓存
   */
  private updateCache(configId: string, config: RitualConfiguration, source: ConfigSource): void {
    const existing = this.cache.get(configId);
    if (existing) {
      existing.config = config;
      existing.timestamp = Date.now();
      existing.checksum = this.calculateChecksum(config);
      existing.source = source;
    }
  }

  /**
   * 计算配置校验和
   */
  private calculateChecksum(config: RitualConfiguration): string {
    // 简单的校验和计算
    const str = JSON.stringify(config);
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // 转换为32位整数
    }
    return hash.toString(16);
  }

  /**
   * 设置热更新监听
   */
  private setupHotReload(configId: string, options: ConfigLoadOptions): void {
    if (options.source === ConfigSource.FILE_SYSTEM && typeof require !== 'undefined') {
      // 在Node.js环境中设置文件监听
      const fs: typeof import('fs') = require('fs');
      const path = options.path || `configs/${configId}.json`;
      
      if (!this.watchers.has(configId)) {
        const watcher = fs.watch(path, (eventType: string) => {
          if (eventType === 'change') {
            this.handleFileChange(configId, options);
          }
        });
        
        this.watchers.set(configId, watcher);
      }
    }
  }

  /**
   * 处理文件变更
   */
  private async handleFileChange(configId: string, options: ConfigLoadOptions): Promise<void> {
    try {
      const newConfig = await this.loadFromSource(configId, options);
      const oldConfig = this.getCachedConfig(configId);
      
      // 检查是否真的有变更
      if (oldConfig && this.calculateChecksum(newConfig) === this.calculateChecksum(oldConfig)) {
        return;
      }

      // 更新缓存
      this.cacheConfig(configId, newConfig, options);

      // 触发变更事件
      this.notifyConfigChange({
        type: 'updated',
        configId,
        source: options.source,
        timestamp: Date.now(),
        oldConfig,
        newConfig
      });
    } catch (error) {
      this.notifyConfigChange({
        type: 'error',
        configId,
        source: options.source,
        timestamp: Date.now(),
        error: error as Error
      });
    }
  }

  /**
   * 处理存储变更
   */
  private handleStorageChange(configId: string, source: ConfigSource): void {
    // 清除缓存，强制重新加载
    this.cache.delete(configId);
    
    this.notifyConfigChange({
      type: 'updated',
      configId,
      source,
      timestamp: Date.now()
    });
  }

  /**
   * 创建默认配置
   */
  private createDefaultConfig(configId: string): RitualConfiguration {
    const timestamp = Date.now();
    const template = this.defaultConfigManager.getConfigurationsByType(RitualType.WELCOME)[0];

    if (template) {
      const clonedTemplate = this.cloneConfig(template);
      return {
        ...clonedTemplate,
        id: configId,
        name: template.name || `Default ${configId}`,
        version: {
          ...clonedTemplate.version,
          timestamp,
          patch: 0
        },
        metadata: {
          ...clonedTemplate.metadata,
          createdAt: timestamp,
          updatedAt: timestamp,
          tags: Array.from(new Set([...clonedTemplate.metadata.tags, 'default'])),
          isDefault: true,
          isActive: false
        }
      };
    }

    const baseConfig = this.defaultConfigManager.getAllConfigurations()[0];
    if (baseConfig) {
      const clonedBase = this.cloneConfig(baseConfig);
      return {
        ...clonedBase,
        id: configId,
        name: `Default ${configId}`,
        version: {
          ...clonedBase.version,
          timestamp,
          patch: 0
        },
        metadata: {
          ...clonedBase.metadata,
          createdAt: timestamp,
          updatedAt: timestamp,
          tags: Array.from(new Set([...clonedBase.metadata.tags, 'default'])),
          isDefault: true,
          isActive: false
        }
      };
    }

    throw new Error('Unable to generate default configuration');
  }

  /**
   * 验证配置
   */
  private validateConfig(config: RitualConfiguration): ConfigValidationResult {
    // 基本验证
    const errors: ConfigValidationError[] = [];
    const warnings: ConfigValidationWarning[] = [];
    const suggestions: ConfigSuggestion[] = [];

    if (!config.id) {
      errors.push({ field: 'id', message: 'Configuration ID is required', severity: 'error', code: 'REQUIRED' });
    }

    if (!config.name) {
      errors.push({ field: 'name', message: 'Configuration name is required', severity: 'error', code: 'REQUIRED' });
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      suggestions
    };
  }

  /**
   * 创建备份
   */
  private async createBackup(config: RitualConfiguration, options: ConfigSaveOptions): Promise<void> {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupPath = `backups/${config.id}-${timestamp}.json`;
    
    if (options.source === ConfigSource.FILE_SYSTEM) {
      await this.saveToFileSystem(backupPath, JSON.stringify(config, null, 2));
    }
  }

  /**
   * 压缩配置
   */
  private compressConfig(configData: string): string {
    // 简单的压缩：移除空白字符
    return JSON.stringify(JSON.parse(configData));
  }

  /**
   * 加密配置
   */
  private encryptConfig(configData: string): string {
    // 简单的Base64编码（实际应用中应使用真正的加密）
    if (typeof btoa !== 'undefined') {
      return btoa(configData);
    }
    return configData;
  }

  /**
   * 解密配置
   */
  private decryptConfig(encryptedData: string): string {
    // 简单的Base64解码
    if (typeof atob !== 'undefined') {
      return atob(encryptedData);
    }
    return encryptedData;
  }

  /**
   * 添加热更新监听器
   */
  addHotReloadListener(listener: HotReloadListener): void {
    this.hotReloadListeners.push(listener);
  }

  /**
   * 移除热更新监听器
   */
  removeHotReloadListener(listener: HotReloadListener): void {
    const index = this.hotReloadListeners.indexOf(listener);
    if (index > -1) {
      this.hotReloadListeners.splice(index, 1);
    }
  }

  /**
   * 通知配置变更
   */
  private notifyConfigChange(event: ConfigChangeEvent): void {
    this.hotReloadListeners.forEach(listener => {
      try {
        listener.onConfigChanged(event);
      } catch (error) {
        console.error('Error in hot reload listener:', error);
      }
    });
  }

  /**
   * 清除缓存
   */
  clearCache(configId?: string): void {
    if (configId) {
      this.cache.delete(configId);
    } else {
      this.cache.clear();
    }
  }

  /**
   * 获取缓存统计
   */
  getCacheStats(): { size: number; items: Array<{ id: string; timestamp: number; source: ConfigSource }> } {
    const items = Array.from(this.cache.entries()).map(([id, item]) => ({
      id,
      timestamp: item.timestamp,
      source: item.source
    }));

    return {
      size: this.cache.size,
      items
    };
  }

  /**
   * 销毁加载器
   */
  destroy(): void {
    // 清理文件监听器
    this.watchers.forEach(watcher => {
      if (watcher && typeof watcher.close === 'function') {
        watcher.close();
      }
    });
    this.watchers.clear();

    // 清理缓存和监听器
    this.cache.clear();
    this.hotReloadListeners = [];
    this.loadPromises.clear();
  }
}
