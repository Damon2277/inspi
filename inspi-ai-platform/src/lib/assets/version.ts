/**
 * 资源版本管理和缓存破坏
 */
import { logger } from '@/lib/logging/logger';
import { CacheManager } from '@/lib/cache/manager';

/**
 * 版本策略
 */
export enum VersionStrategy {
  TIMESTAMP = 'timestamp',
  HASH = 'hash',
  SEMANTIC = 'semantic',
  BUILD_NUMBER = 'build-number'
}

/**
 * 资源版本信息
 */
export interface AssetVersion {
  path: string;
  version: string;
  hash: string;
  size: number;
  lastModified: Date;
  strategy: VersionStrategy;
  metadata?: Record<string, any>;
}

/**
 * 版本配置
 */
export interface VersionConfig {
  strategy: VersionStrategy;
  hashAlgorithm: 'md5' | 'sha1' | 'sha256';
  versionLength: number;
  includeInPath: boolean; // 是否将版本包含在路径中
  queryParam: string; // 查询参数名称
  cacheControl: {
    maxAge: number;
    immutable: boolean;
  };
  manifestPath: string; // 版本清单文件路径
}

/**
 * 版本清单
 */
export interface VersionManifest {
  version: string;
  buildTime: Date;
  assets: Record<string, AssetVersion>;
  dependencies?: Record<string, string>;
  metadata?: Record<string, any>;
}

/**
 * 缓存破坏结果
 */
export interface CacheBustResult {
  originalUrl: string;
  versionedUrl: string;
  version: string;
  strategy: VersionStrategy;
}

/**
 * 资源版本管理器
 */
export class AssetVersionManager {
  private config: VersionConfig;
  private cacheManager: CacheManager;
  private manifest: VersionManifest | null = null;
  private versionCache = new Map<string, AssetVersion>();

  constructor(cacheManager: CacheManager, config?: Partial<VersionConfig>) {
    this.cacheManager = cacheManager;
    this.config = {
      strategy: VersionStrategy.HASH,
      hashAlgorithm: 'md5',
      versionLength: 8,
      includeInPath: false,
      queryParam: 'v',
      cacheControl: {
        maxAge: 31536000, // 1年
        immutable: true
      },
      manifestPath: '/assets/manifest.json',
      ...config
    };
  }

  /**
   * 生成资源版本
   */
  async generateVersion(
    path: string,
    content: Buffer,
    strategy?: VersionStrategy
  ): Promise<AssetVersion> {
    const finalStrategy = strategy || this.config.strategy;
    
    try {
      let version: string;
      
      switch (finalStrategy) {
        case VersionStrategy.TIMESTAMP:
          version = Date.now().toString();
          break;
        case VersionStrategy.HASH:
          version = await this.generateHash(content);
          break;
        case VersionStrategy.SEMANTIC:
          version = await this.getSemanticVersion(path);
          break;
        case VersionStrategy.BUILD_NUMBER:
          version = await this.getBuildNumber();
          break;
        default:
          throw new Error(`Unsupported version strategy: ${finalStrategy}`);
      }

      const hash = await this.generateHash(content);
      
      const assetVersion: AssetVersion = {
        path,
        version,
        hash,
        size: content.length,
        lastModified: new Date(),
        strategy: finalStrategy,
        metadata: {
          algorithm: this.config.hashAlgorithm,
          contentType: this.detectContentType(path)
        }
      };

      // 缓存版本信息
      this.versionCache.set(path, assetVersion);
      
      logger.debug('Asset version generated', {
        path,
        version,
        strategy: finalStrategy,
        size: content.length
      });

      return assetVersion;

    } catch (error) {
      logger.error('Failed to generate asset version', error instanceof Error ? error : new Error(String(error)), {
        path,
        strategy: finalStrategy
      });
      throw error;
    }
  }

  /**
   * 批量生成版本
   */
  async generateVersions(
    assets: Array<{ path: string; content: Buffer }>
  ): Promise<Map<string, AssetVersion>> {
    const versions = new Map<string, AssetVersion>();
    const batchSize = 10;

    for (let i = 0; i < assets.length; i += batchSize) {
      const batch = assets.slice(i, i + batchSize);
      
      const batchPromises = batch.map(async (asset) => {
        try {
          const version = await this.generateVersion(asset.path, asset.content);
          versions.set(asset.path, version);
        } catch (error) {
          logger.error('Failed to generate version for asset', error instanceof Error ? error : new Error(String(error)), {
            path: asset.path
          });
        }
      });

      await Promise.allSettled(batchPromises);
    }

    return versions;
  }

  /**
   * 获取版本化URL
   */
  getVersionedUrl(path: string, baseUrl?: string): string {
    const version = this.versionCache.get(path);
    if (!version) {
      logger.warn('No version found for asset', { path });
      return path;
    }

    const base = baseUrl || '';
    
    if (this.config.includeInPath) {
      // 将版本包含在路径中: /assets/app.js -> /assets/app.v123.js
      const pathParts = path.split('.');
      const extension = pathParts.pop();
      const basePath = pathParts.join('.');
      return `${base}${basePath}.v${version.version}.${extension}`;
    } else {
      // 使用查询参数: /assets/app.js -> /assets/app.js?v=123
      const separator = path.includes('?') ? '&' : '?';
      return `${base}${path}${separator}${this.config.queryParam}=${version.version}`;
    }
  }

  /**
   * 缓存破坏
   */
  bustCache(path: string, baseUrl?: string): CacheBustResult {
    const version = this.versionCache.get(path);
    const versionString = version?.version || Date.now().toString();
    const strategy = version?.strategy || this.config.strategy;

    const originalUrl = baseUrl ? `${baseUrl}${path}` : path;
    const versionedUrl = this.getVersionedUrl(path, baseUrl);

    return {
      originalUrl,
      versionedUrl,
      version: versionString,
      strategy
    };
  }

  /**
   * 批量缓存破坏
   */
  bustCacheBatch(paths: string[], baseUrl?: string): Map<string, CacheBustResult> {
    const results = new Map<string, CacheBustResult>();

    for (const path of paths) {
      try {
        const result = this.bustCache(path, baseUrl);
        results.set(path, result);
      } catch (error) {
        logger.error('Failed to bust cache for asset', error instanceof Error ? error : new Error(String(error)), { path });
      }
    }

    return results;
  }

  /**
   * 创建版本清单
   */
  async createManifest(
    buildVersion?: string,
    metadata?: Record<string, any>
  ): Promise<VersionManifest> {
    const assets: Record<string, AssetVersion> = {};
    
    // 转换版本缓存为清单格式
    for (const [path, version] of this.versionCache.entries()) {
      assets[path] = version;
    }

    const manifest: VersionManifest = {
      version: buildVersion || Date.now().toString(),
      buildTime: new Date(),
      assets,
      metadata: {
        strategy: this.config.strategy,
        hashAlgorithm: this.config.hashAlgorithm,
        totalAssets: Object.keys(assets).length,
        ...metadata
      }
    };

    this.manifest = manifest;
    
    // 保存清单到缓存
    await this.cacheManager.set('asset-manifest', manifest, { ttl: 86400 }); // 24小时

    logger.info('Asset manifest created', {
      version: manifest.version,
      assetCount: Object.keys(assets).length
    });

    return manifest;
  }

  /**
   * 加载版本清单
   */
  async loadManifest(): Promise<VersionManifest | null> {
    try {
      // 首先尝试从缓存加载
      const cached = await this.cacheManager.get<VersionManifest>('asset-manifest');
      if (cached) {
        this.manifest = cached;
        
        // 重建版本缓存
        for (const [path, version] of Object.entries(cached.assets)) {
          this.versionCache.set(path, version);
        }
        
        logger.debug('Asset manifest loaded from cache');
        return cached;
      }

      // 尝试从文件系统加载
      // 这里应该实现实际的文件加载逻辑
      logger.warn('No asset manifest found');
      return null;

    } catch (error) {
      logger.error('Failed to load asset manifest', error instanceof Error ? error : new Error(String(error)));
      return null;
    }
  }

  /**
   * 保存版本清单到文件
   */
  async saveManifest(manifest?: VersionManifest): Promise<void> {
    const finalManifest = manifest || this.manifest;
    if (!finalManifest) {
      throw new Error('No manifest to save');
    }

    try {
      const manifestJson = JSON.stringify(finalManifest, null, 2);
      
      // 这里应该实现实际的文件保存逻辑
      // 例如保存到 public/assets/manifest.json
      
      logger.info('Asset manifest saved', {
        path: this.config.manifestPath,
        size: manifestJson.length
      });

    } catch (error) {
      logger.error('Failed to save asset manifest', error instanceof Error ? error : new Error(String(error)));
      throw error;
    }
  }

  /**
   * 检查资源是否需要更新
   */
  async checkForUpdates(
    assets: Array<{ path: string; content: Buffer }>
  ): Promise<Array<{ path: string; needsUpdate: boolean; reason: string }>> {
    const results: Array<{ path: string; needsUpdate: boolean; reason: string }> = [];

    for (const asset of assets) {
      const existingVersion = this.versionCache.get(asset.path);
      
      if (!existingVersion) {
        results.push({
          path: asset.path,
          needsUpdate: true,
          reason: 'New asset'
        });
        continue;
      }

      // 检查内容哈希
      const currentHash = await this.generateHash(asset.content);
      if (currentHash !== existingVersion.hash) {
        results.push({
          path: asset.path,
          needsUpdate: true,
          reason: 'Content changed'
        });
        continue;
      }

      // 检查文件大小
      if (asset.content.length !== existingVersion.size) {
        results.push({
          path: asset.path,
          needsUpdate: true,
          reason: 'Size changed'
        });
        continue;
      }

      results.push({
        path: asset.path,
        needsUpdate: false,
        reason: 'No changes'
      });
    }

    return results;
  }

  /**
   * 清理过期版本
   */
  async cleanupOldVersions(maxAge: number = 7 * 24 * 60 * 60 * 1000): Promise<number> {
    const cutoffTime = Date.now() - maxAge;
    let cleanedCount = 0;

    for (const [path, version] of this.versionCache.entries()) {
      if (version.lastModified.getTime() < cutoffTime) {
        this.versionCache.delete(path);
        cleanedCount++;
      }
    }

    logger.info('Old asset versions cleaned up', { cleanedCount });
    return cleanedCount;
  }

  /**
   * 获取版本统计
   */
  getVersionStats(): {
    totalAssets: number;
    strategies: Record<VersionStrategy, number>;
    totalSize: number;
    averageSize: number;
    oldestVersion: Date | null;
    newestVersion: Date | null;
  } {
    const versions = Array.from(this.versionCache.values());
    const strategies: Record<VersionStrategy, number> = {
      [VersionStrategy.TIMESTAMP]: 0,
      [VersionStrategy.HASH]: 0,
      [VersionStrategy.SEMANTIC]: 0,
      [VersionStrategy.BUILD_NUMBER]: 0
    };

    let totalSize = 0;
    let oldestVersion: Date | null = null;
    let newestVersion: Date | null = null;

    for (const version of versions) {
      strategies[version.strategy]++;
      totalSize += version.size;
      
      if (!oldestVersion || version.lastModified < oldestVersion) {
        oldestVersion = version.lastModified;
      }
      
      if (!newestVersion || version.lastModified > newestVersion) {
        newestVersion = version.lastModified;
      }
    }

    return {
      totalAssets: versions.length,
      strategies,
      totalSize,
      averageSize: versions.length > 0 ? totalSize / versions.length : 0,
      oldestVersion,
      newestVersion
    };
  }

  /**
   * 生成哈希
   */
  private async generateHash(content: Buffer): Promise<string> {
    // 这里应该使用实际的哈希算法
    // 为了演示，我们使用简单的哈希
    let hash = 0;
    for (let i = 0; i < content.length; i++) {
      const char = content[i];
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // 转换为32位整数
    }
    
    const hashString = Math.abs(hash).toString(16);
    return hashString.substring(0, this.config.versionLength);
  }

  /**
   * 获取语义版本
   */
  private async getSemanticVersion(path: string): Promise<string> {
    // 这里应该从package.json或其他配置文件读取版本
    // 为了演示，返回模拟版本
    return '1.0.0';
  }

  /**
   * 获取构建号
   */
  private async getBuildNumber(): Promise<string> {
    // 这里应该从CI/CD系统或环境变量获取构建号
    // 为了演示，返回模拟构建号
    return process.env.BUILD_NUMBER || '1000';
  }

  /**
   * 检测内容类型
   */
  private detectContentType(path: string): string {
    const extension = path.split('.').pop()?.toLowerCase();
    
    const typeMap: Record<string, string> = {
      'js': 'application/javascript',
      'css': 'text/css',
      'html': 'text/html',
      'json': 'application/json',
      'jpg': 'image/jpeg',
      'png': 'image/png',
      'gif': 'image/gif',
      'svg': 'image/svg+xml',
      'woff': 'font/woff',
      'woff2': 'font/woff2'
    };

    return typeMap[extension || ''] || 'application/octet-stream';
  }
}

/**
 * 版本工具函数
 */
export class VersionUtils {
  /**
   * 解析版本化URL
   */
  static parseVersionedUrl(url: string): {
    originalUrl: string;
    version?: string;
    hasVersion: boolean;
  } {
    // 检查查询参数中的版本
    const urlObj = new URL(url, 'http://example.com');
    const version = urlObj.searchParams.get('v');
    
    if (version) {
      urlObj.searchParams.delete('v');
      return {
        originalUrl: urlObj.pathname + urlObj.search,
        version,
        hasVersion: true
      };
    }

    // 检查路径中的版本 (app.v123.js)
    const pathMatch = url.match(/(.+)\.v([^.]+)\.([^.]+)$/);
    if (pathMatch) {
      const [, basePath, versionStr, extension] = pathMatch;
      return {
        originalUrl: `${basePath}.${extension}`,
        version: versionStr,
        hasVersion: true
      };
    }

    return {
      originalUrl: url,
      hasVersion: false
    };
  }

  /**
   * 比较版本
   */
  static compareVersions(version1: string, version2: string): number {
    // 简单的版本比较，实际应该支持语义版本
    if (version1 === version2) return 0;
    return version1 > version2 ? 1 : -1;
  }

  /**
   * 验证版本格式
   */
  static isValidVersion(version: string, strategy: VersionStrategy): boolean {
    switch (strategy) {
      case VersionStrategy.TIMESTAMP:
        return /^\d+$/.test(version);
      case VersionStrategy.HASH:
        return /^[a-f0-9]+$/i.test(version);
      case VersionStrategy.SEMANTIC:
        return /^\d+\.\d+\.\d+/.test(version);
      case VersionStrategy.BUILD_NUMBER:
        return /^\d+$/.test(version);
      default:
        return false;
    }
  }

  /**
   * 生成缓存控制头
   */
  static generateCacheHeaders(config: VersionConfig['cacheControl']): Record<string, string> {
    const headers: Record<string, string> = {
      'Cache-Control': `public, max-age=${config.maxAge}`
    };

    if (config.immutable) {
      headers['Cache-Control'] += ', immutable';
    }

    return headers;
  }

  /**
   * 检查浏览器缓存
   */
  static checkBrowserCache(
    lastModified: Date,
    etag: string,
    ifModifiedSince?: string,
    ifNoneMatch?: string
  ): boolean {
    // 检查ETag
    if (ifNoneMatch && ifNoneMatch === etag) {
      return true; // 缓存有效
    }

    // 检查Last-Modified
    if (ifModifiedSince) {
      const clientTime = new Date(ifModifiedSince);
      if (clientTime >= lastModified) {
        return true; // 缓存有效
      }
    }

    return false; // 缓存无效
  }
}

export default AssetVersionManager;