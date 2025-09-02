/**
 * CDN配置和分发策略
 */
import { logger } from '@/lib/logging/logger';

/**
 * CDN提供商类型
 */
export enum CDNProvider {
  CLOUDFLARE = 'cloudflare',
  AWS_CLOUDFRONT = 'aws-cloudfront',
  AZURE_CDN = 'azure-cdn',
  GOOGLE_CDN = 'google-cdn',
  ALIYUN_CDN = 'aliyun-cdn',
  TENCENT_CDN = 'tencent-cdn'
}

/**
 * 资源类型
 */
export enum AssetType {
  IMAGE = 'image',
  VIDEO = 'video',
  AUDIO = 'audio',
  DOCUMENT = 'document',
  SCRIPT = 'script',
  STYLESHEET = 'stylesheet',
  FONT = 'font',
  OTHER = 'other'
}

/**
 * 缓存策略
 */
export interface CacheStrategy {
  maxAge: number; // 秒
  staleWhileRevalidate?: number; // 秒
  staleIfError?: number; // 秒
  mustRevalidate?: boolean;
  noCache?: boolean;
  noStore?: boolean;
  public?: boolean;
  private?: boolean;
}

/**
 * CDN配置
 */
export interface CDNConfig {
  provider: CDNProvider;
  domains: {
    primary: string;
    fallback?: string[];
    regions?: Record<string, string>; // 地区特定域名
  };
  ssl: {
    enabled: boolean;
    certificate?: string;
    minTlsVersion?: string;
  };
  compression: {
    enabled: boolean;
    algorithms: string[]; // gzip, brotli, etc.
    minSize: number; // 最小压缩文件大小
  };
  caching: {
    strategies: Record<AssetType, CacheStrategy>;
    purgeEndpoint?: string;
    purgeKey?: string;
  };
  security: {
    hotlinkProtection: boolean;
    allowedReferrers?: string[];
    ipWhitelist?: string[];
    ipBlacklist?: string[];
  };
  optimization: {
    imageOptimization: boolean;
    minification: boolean;
    http2Push: boolean;
    preload: string[]; // 预加载资源模式
  };
  monitoring: {
    enabled: boolean;
    metricsEndpoint?: string;
    alertThresholds: {
      errorRate: number;
      responseTime: number;
      bandwidth: number;
    };
  };
}

/**
 * 地理位置配置
 */
export interface GeoConfig {
  regions: {
    [region: string]: {
      cdnDomain: string;
      priority: number;
      fallbacks: string[];
    };
  };
  defaultRegion: string;
  autoDetection: boolean;
}

/**
 * 资源分发规则
 */
export interface DistributionRule {
  pattern: RegExp;
  assetType: AssetType;
  cdnDomain?: string;
  cacheStrategy?: CacheStrategy;
  transformations?: {
    resize?: { width?: number; height?: number; quality?: number };
    format?: string;
    compress?: boolean;
  };
  conditions?: {
    userAgent?: RegExp;
    country?: string[];
    device?: 'mobile' | 'desktop' | 'tablet';
  };
}

/**
 * CDN管理器
 */
export class CDNManager {
  private config: CDNConfig;
  private geoConfig: GeoConfig;
  private distributionRules: DistributionRule[] = [];
  private performanceMetrics = new Map<string, any>();

  constructor(config: CDNConfig, geoConfig?: GeoConfig) {
    this.config = config;
    this.geoConfig = geoConfig || this.getDefaultGeoConfig();
    this.initializeDistributionRules();
  }

  /**
   * 获取资源URL
   */
  getAssetUrl(
    path: string,
    options?: {
      assetType?: AssetType;
      region?: string;
      transformations?: any;
      version?: string;
    }
  ): string {
    try {
      // 确定资源类型
      const assetType = options?.assetType || this.detectAssetType(path);
      
      // 应用分发规则
      const rule = this.findMatchingRule(path, assetType);
      
      // 选择CDN域名
      const cdnDomain = this.selectCDNDomain(
        rule?.cdnDomain,
        options?.region,
        assetType
      );

      // 构建基础URL
      let url = `${this.config.ssl.enabled ? 'https' : 'http'}://${cdnDomain}`;
      
      // 添加路径
      const cleanPath = path.startsWith('/') ? path : `/${path}`;
      url += cleanPath;

      // 添加版本参数
      if (options?.version) {
        const separator = url.includes('?') ? '&' : '?';
        url += `${separator}v=${options.version}`;
      }

      // 应用转换参数
      if (rule?.transformations || options?.transformations) {
        url = this.applyTransformations(url, {
          ...rule?.transformations,
          ...options?.transformations
        });
      }

      logger.debug('Generated CDN URL', {
        originalPath: path,
        assetType,
        cdnDomain,
        finalUrl: url
      });

      return url;

    } catch (error) {
      logger.error('Failed to generate CDN URL', error instanceof Error ? error : new Error(String(error)), {
        path,
        options
      });
      
      // 返回原始路径作为fallback
      return path;
    }
  }

  /**
   * 预加载资源
   */
  async preloadAssets(assets: Array<{
    path: string;
    assetType?: AssetType;
    priority?: 'high' | 'medium' | 'low';
  }>): Promise<void> {
    const preloadPromises = assets.map(async (asset) => {
      try {
        const url = this.getAssetUrl(asset.path, { assetType: asset.assetType });
        
        // 创建预加载链接
        const link = document.createElement('link');
        link.rel = 'preload';
        link.href = url;
        link.as = this.getPreloadAs(asset.assetType || this.detectAssetType(asset.path));
        
        if (asset.priority) {
          link.setAttribute('importance', asset.priority);
        }

        document.head.appendChild(link);
        
        logger.debug('Asset preloaded', { url, assetType: asset.assetType });
        
      } catch (error) {
        logger.error('Failed to preload asset', error instanceof Error ? error : new Error(String(error)), {
          path: asset.path
        });
      }
    });

    await Promise.allSettled(preloadPromises);
  }

  /**
   * 清除CDN缓存
   */
  async purgeCache(paths?: string[]): Promise<boolean> {
    if (!this.config.caching.purgeEndpoint || !this.config.caching.purgeKey) {
      logger.warn('CDN purge not configured');
      return false;
    }

    try {
      const response = await fetch(this.config.caching.purgeEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.config.caching.purgeKey}`
        },
        body: JSON.stringify({
          files: paths || ['/*'], // 清除所有缓存如果没有指定路径
          purge_everything: !paths
        })
      });

      if (!response.ok) {
        throw new Error(`CDN purge failed: ${response.status}`);
      }

      const result = await response.json();
      logger.info('CDN cache purged successfully', { paths, result });
      
      return true;

    } catch (error) {
      logger.error('CDN cache purge failed', error instanceof Error ? error : new Error(String(error)), { paths });
      return false;
    }
  }

  /**
   * 获取CDN性能指标
   */
  async getPerformanceMetrics(): Promise<{
    hitRate: number;
    bandwidth: number;
    requests: number;
    errors: number;
    averageResponseTime: number;
    topAssets: Array<{ path: string; requests: number; bandwidth: number }>;
  }> {
    // 这里应该调用CDN提供商的API获取实际指标
    // 为了演示，返回模拟数据
    return {
      hitRate: 85.5,
      bandwidth: 1024 * 1024 * 1024, // 1GB
      requests: 10000,
      errors: 50,
      averageResponseTime: 120,
      topAssets: [
        { path: '/images/hero.jpg', requests: 1500, bandwidth: 50 * 1024 * 1024 },
        { path: '/js/main.js', requests: 1200, bandwidth: 20 * 1024 * 1024 },
        { path: '/css/styles.css', requests: 1100, bandwidth: 15 * 1024 * 1024 }
      ]
    };
  }

  /**
   * 添加分发规则
   */
  addDistributionRule(rule: DistributionRule): void {
    this.distributionRules.push(rule);
    logger.debug('Distribution rule added', { pattern: rule.pattern.source, assetType: rule.assetType });
  }

  /**
   * 检测资源类型
   */
  private detectAssetType(path: string): AssetType {
    const extension = path.split('.').pop()?.toLowerCase();
    
    const typeMap: Record<string, AssetType> = {
      // 图片
      'jpg': AssetType.IMAGE,
      'jpeg': AssetType.IMAGE,
      'png': AssetType.IMAGE,
      'gif': AssetType.IMAGE,
      'webp': AssetType.IMAGE,
      'avif': AssetType.IMAGE,
      'svg': AssetType.IMAGE,
      
      // 视频
      'mp4': AssetType.VIDEO,
      'webm': AssetType.VIDEO,
      'avi': AssetType.VIDEO,
      'mov': AssetType.VIDEO,
      
      // 音频
      'mp3': AssetType.AUDIO,
      'wav': AssetType.AUDIO,
      'ogg': AssetType.AUDIO,
      
      // 脚本
      'js': AssetType.SCRIPT,
      'mjs': AssetType.SCRIPT,
      'ts': AssetType.SCRIPT,
      
      // 样式
      'css': AssetType.STYLESHEET,
      'scss': AssetType.STYLESHEET,
      'sass': AssetType.STYLESHEET,
      
      // 字体
      'woff': AssetType.FONT,
      'woff2': AssetType.FONT,
      'ttf': AssetType.FONT,
      'otf': AssetType.FONT,
      
      // 文档
      'pdf': AssetType.DOCUMENT,
      'doc': AssetType.DOCUMENT,
      'docx': AssetType.DOCUMENT
    };

    return typeMap[extension || ''] || AssetType.OTHER;
  }

  /**
   * 查找匹配的分发规则
   */
  private findMatchingRule(path: string, assetType: AssetType): DistributionRule | undefined {
    return this.distributionRules.find(rule => 
      rule.pattern.test(path) && rule.assetType === assetType
    );
  }

  /**
   * 选择CDN域名
   */
  private selectCDNDomain(
    ruleDomain?: string,
    region?: string,
    assetType?: AssetType
  ): string {
    // 优先使用规则指定的域名
    if (ruleDomain) {
      return ruleDomain;
    }

    // 根据地区选择域名
    if (region && this.geoConfig.regions[region]) {
      return this.geoConfig.regions[region].cdnDomain;
    }

    // 根据资源类型选择域名（如果有配置）
    if (assetType && this.config.domains.regions) {
      const typeDomain = this.config.domains.regions[assetType];
      if (typeDomain) {
        return typeDomain;
      }
    }

    // 返回主域名
    return this.config.domains.primary;
  }

  /**
   * 应用资源转换
   */
  private applyTransformations(url: string, transformations: any): string {
    if (!transformations) return url;

    const params = new URLSearchParams();
    
    // 图片转换
    if (transformations.resize) {
      if (transformations.resize.width) {
        params.append('w', transformations.resize.width.toString());
      }
      if (transformations.resize.height) {
        params.append('h', transformations.resize.height.toString());
      }
      if (transformations.resize.quality) {
        params.append('q', transformations.resize.quality.toString());
      }
    }

    if (transformations.format) {
      params.append('f', transformations.format);
    }

    if (transformations.compress) {
      params.append('compress', 'true');
    }

    if (params.toString()) {
      const separator = url.includes('?') ? '&' : '?';
      url += `${separator}${params.toString()}`;
    }

    return url;
  }

  /**
   * 获取预加载as属性
   */
  private getPreloadAs(assetType: AssetType): string {
    const asMap: Record<AssetType, string> = {
      [AssetType.IMAGE]: 'image',
      [AssetType.VIDEO]: 'video',
      [AssetType.AUDIO]: 'audio',
      [AssetType.SCRIPT]: 'script',
      [AssetType.STYLESHEET]: 'style',
      [AssetType.FONT]: 'font',
      [AssetType.DOCUMENT]: 'document',
      [AssetType.OTHER]: 'fetch'
    };

    return asMap[assetType] || 'fetch';
  }

  /**
   * 初始化分发规则
   */
  private initializeDistributionRules(): void {
    // 默认规则
    this.addDistributionRule({
      pattern: /\.(jpg|jpeg|png|gif|webp|avif)$/i,
      assetType: AssetType.IMAGE,
      transformations: {
        compress: true,
        format: 'webp'
      }
    });

    this.addDistributionRule({
      pattern: /\.(js|mjs)$/i,
      assetType: AssetType.SCRIPT,
      cacheStrategy: {
        maxAge: 31536000, // 1年
        public: true
      }
    });

    this.addDistributionRule({
      pattern: /\.css$/i,
      assetType: AssetType.STYLESHEET,
      cacheStrategy: {
        maxAge: 31536000, // 1年
        public: true
      }
    });

    this.addDistributionRule({
      pattern: /\.(woff|woff2|ttf|otf)$/i,
      assetType: AssetType.FONT,
      cacheStrategy: {
        maxAge: 31536000, // 1年
        public: true
      }
    });
  }

  /**
   * 获取默认地理配置
   */
  private getDefaultGeoConfig(): GeoConfig {
    return {
      regions: {
        'us': {
          cdnDomain: 'us-cdn.example.com',
          priority: 1,
          fallbacks: ['global-cdn.example.com']
        },
        'eu': {
          cdnDomain: 'eu-cdn.example.com',
          priority: 1,
          fallbacks: ['global-cdn.example.com']
        },
        'asia': {
          cdnDomain: 'asia-cdn.example.com',
          priority: 1,
          fallbacks: ['global-cdn.example.com']
        }
      },
      defaultRegion: 'us',
      autoDetection: true
    };
  }
}

/**
 * CDN工具函数
 */
export class CDNUtils {
  /**
   * 检测用户地区
   */
  static async detectUserRegion(): Promise<string> {
    try {
      // 使用Cloudflare的地理位置API
      const response = await fetch('https://cloudflare.com/cdn-cgi/trace');
      const text = await response.text();
      const lines = text.split('\n');
      
      for (const line of lines) {
        if (line.startsWith('loc=')) {
          const country = line.split('=')[1];
          return CDNUtils.mapCountryToRegion(country);
        }
      }
    } catch (error) {
      logger.warn('Failed to detect user region', { error: error instanceof Error ? error.message : String(error) });
    }

    return 'us'; // 默认地区
  }

  /**
   * 映射国家到地区
   */
  static mapCountryToRegion(country: string): string {
    const regionMap: Record<string, string> = {
      'US': 'us',
      'CA': 'us',
      'GB': 'eu',
      'DE': 'eu',
      'FR': 'eu',
      'CN': 'asia',
      'JP': 'asia',
      'KR': 'asia',
      'SG': 'asia'
    };

    return regionMap[country.toUpperCase()] || 'us';
  }

  /**
   * 生成缓存键
   */
  static generateCacheKey(path: string, transformations?: any): string {
    let key = path;
    
    if (transformations) {
      const params = new URLSearchParams();
      Object.entries(transformations).forEach(([k, v]) => {
        if (typeof v === 'object') {
          Object.entries(v).forEach(([subK, subV]) => {
            params.append(`${k}.${subK}`, String(subV));
          });
        } else {
          params.append(k, String(v));
        }
      });
      
      if (params.toString()) {
        key += `?${params.toString()}`;
      }
    }

    return Buffer.from(key).toString('base64').replace(/[+/=]/g, '');
  }

  /**
   * 验证CDN配置
   */
  static validateConfig(config: CDNConfig): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!config.domains.primary) {
      errors.push('Primary CDN domain is required');
    }

    if (!config.provider) {
      errors.push('CDN provider is required');
    }

    if (config.ssl.enabled && !config.domains.primary.startsWith('https://')) {
      // 检查域名是否支持HTTPS
    }

    Object.entries(config.caching.strategies).forEach(([assetType, strategy]) => {
      if (strategy.maxAge < 0) {
        errors.push(`Invalid maxAge for ${assetType}: must be >= 0`);
      }
    });

    return {
      valid: errors.length === 0,
      errors
    };
  }
}

/**
 * 默认CDN配置
 */
export const DEFAULT_CDN_CONFIG: CDNConfig = {
  provider: CDNProvider.CLOUDFLARE,
  domains: {
    primary: 'cdn.example.com',
    fallback: ['cdn2.example.com']
  },
  ssl: {
    enabled: true,
    minTlsVersion: '1.2'
  },
  compression: {
    enabled: true,
    algorithms: ['gzip', 'brotli'],
    minSize: 1024
  },
  caching: {
    strategies: {
      [AssetType.IMAGE]: {
        maxAge: 31536000, // 1年
        public: true
      },
      [AssetType.SCRIPT]: {
        maxAge: 31536000, // 1年
        public: true
      },
      [AssetType.STYLESHEET]: {
        maxAge: 31536000, // 1年
        public: true
      },
      [AssetType.FONT]: {
        maxAge: 31536000, // 1年
        public: true
      },
      [AssetType.VIDEO]: {
        maxAge: 86400, // 1天
        public: true
      },
      [AssetType.AUDIO]: {
        maxAge: 86400, // 1天
        public: true
      },
      [AssetType.DOCUMENT]: {
        maxAge: 3600, // 1小时
        public: false
      },
      [AssetType.OTHER]: {
        maxAge: 3600, // 1小时
        public: true
      }
    }
  },
  security: {
    hotlinkProtection: true,
    allowedReferrers: ['*.example.com']
  },
  optimization: {
    imageOptimization: true,
    minification: true,
    http2Push: true,
    preload: ['*.css', '*.js']
  },
  monitoring: {
    enabled: true,
    alertThresholds: {
      errorRate: 5, // 5%
      responseTime: 1000, // 1秒
      bandwidth: 1024 * 1024 * 1024 // 1GB
    }
  }
};

export default CDNManager;