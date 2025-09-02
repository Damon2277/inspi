/**
 * 静态资源优化系统
 */
import { logger } from '@/lib/logging/logger';
import { AssetType } from '@/lib/cdn/config';

/**
 * 优化配置
 */
export interface OptimizationConfig {
  images: {
    formats: string[]; // 支持的格式
    quality: number; // 默认质量
    progressive: boolean; // 渐进式JPEG
    autoWebP: boolean; // 自动WebP转换
    autoAVIF: boolean; // 自动AVIF转换
    responsive: boolean; // 响应式图片
    lazyLoading: boolean; // 懒加载
    placeholder: 'blur' | 'empty' | 'color';
    sizes: number[]; // 响应式尺寸
  };
  videos: {
    formats: string[];
    quality: number;
    compression: boolean;
    streaming: boolean;
    thumbnail: boolean;
  };
  scripts: {
    minify: boolean;
    treeshake: boolean;
    splitting: boolean;
    compression: boolean;
  };
  styles: {
    minify: boolean;
    autoprefixer: boolean;
    purgeCSS: boolean;
    compression: boolean;
  };
  fonts: {
    preload: boolean;
    display: 'auto' | 'block' | 'swap' | 'fallback' | 'optional';
    subset: boolean;
    formats: string[];
  };
}

/**
 * 优化结果
 */
export interface OptimizationResult {
  originalSize: number;
  optimizedSize: number;
  compressionRatio: number;
  format?: string;
  quality?: number;
  dimensions?: { width: number; height: number };
  processingTime: number;
  success: boolean;
  error?: string;
}

/**
 * 资源信息
 */
export interface AssetInfo {
  path: string;
  type: AssetType;
  size: number;
  mimeType: string;
  dimensions?: { width: number; height: number };
  metadata?: Record<string, any>;
}

/**
 * 资源优化器
 */
export class AssetOptimizer {
  private config: OptimizationConfig;
  private optimizationCache = new Map<string, OptimizationResult>();

  constructor(config?: Partial<OptimizationConfig>) {
    this.config = {
      images: {
        formats: ['webp', 'avif', 'jpeg', 'png'],
        quality: 85,
        progressive: true,
        autoWebP: true,
        autoAVIF: true,
        responsive: true,
        lazyLoading: true,
        placeholder: 'blur',
        sizes: [320, 640, 768, 1024, 1280, 1920]
      },
      videos: {
        formats: ['mp4', 'webm'],
        quality: 80,
        compression: true,
        streaming: true,
        thumbnail: true
      },
      scripts: {
        minify: true,
        treeshake: true,
        splitting: true,
        compression: true
      },
      styles: {
        minify: true,
        autoprefixer: true,
        purgeCSS: true,
        compression: true
      },
      fonts: {
        preload: true,
        display: 'swap',
        subset: true,
        formats: ['woff2', 'woff']
      },
      ...config
    };
  }

  /**
   * 优化图片
   */
  async optimizeImage(
    input: Buffer | string,
    options?: {
      format?: string;
      quality?: number;
      width?: number;
      height?: number;
      progressive?: boolean;
    }
  ): Promise<OptimizationResult> {
    const startTime = Date.now();
    
    try {
      // 获取原始大小
      const originalSize = typeof input === 'string' 
        ? Buffer.from(input, 'base64').length 
        : input.length;

      // 这里应该使用实际的图片处理库，如 sharp
      // 为了演示，我们模拟优化过程
      const optimizedSize = Math.floor(originalSize * 0.7); // 模拟70%压缩
      const format = options?.format || 'webp';
      const quality = options?.quality || this.config.images.quality;

      const result: OptimizationResult = {
        originalSize,
        optimizedSize,
        compressionRatio: (originalSize - optimizedSize) / originalSize,
        format,
        quality,
        dimensions: options?.width && options?.height 
          ? { width: options.width, height: options.height }
          : undefined,
        processingTime: Date.now() - startTime,
        success: true
      };

      logger.debug('Image optimized', result);
      return result;

    } catch (error) {
      logger.error('Image optimization failed', error instanceof Error ? error : new Error(String(error)));
      
      return {
        originalSize: typeof input === 'string' 
          ? Buffer.from(input, 'base64').length 
          : input.length,
        optimizedSize: 0,
        compressionRatio: 0,
        processingTime: Date.now() - startTime,
        success: false,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  /**
   * 生成响应式图片
   */
  async generateResponsiveImages(
    input: Buffer | string,
    options?: {
      sizes?: number[];
      formats?: string[];
      quality?: number;
    }
  ): Promise<Array<{
    size: number;
    format: string;
    url: string;
    dimensions: { width: number; height: number };
  }>> {
    const sizes = options?.sizes || this.config.images.sizes;
    const formats = options?.formats || this.config.images.formats;
    const quality = options?.quality || this.config.images.quality;

    const results: Array<{
      size: number;
      format: string;
      url: string;
      dimensions: { width: number; height: number };
    }> = [];

    for (const size of sizes) {
      for (const format of formats) {
        try {
          const optimized = await this.optimizeImage(input, {
            format,
            quality,
            width: size,
            height: Math.floor(size * 0.75) // 假设4:3比例
          });

          if (optimized.success) {
            results.push({
              size,
              format,
              url: `optimized-${size}w.${format}`,
              dimensions: optimized.dimensions || { width: size, height: Math.floor(size * 0.75) }
            });
          }
        } catch (error) {
          logger.warn('Failed to generate responsive image', {
            size,
            format,
            error: error instanceof Error ? error.message : String(error)
          });
        }
      }
    }

    return results;
  }

  /**
   * 优化视频
   */
  async optimizeVideo(
    input: Buffer | string,
    options?: {
      format?: string;
      quality?: number;
      bitrate?: number;
      resolution?: string;
    }
  ): Promise<OptimizationResult> {
    const startTime = Date.now();
    
    try {
      const originalSize = typeof input === 'string' 
        ? Buffer.from(input, 'base64').length 
        : input.length;

      // 模拟视频优化
      const optimizedSize = Math.floor(originalSize * 0.5); // 模拟50%压缩
      const format = options?.format || 'mp4';

      const result: OptimizationResult = {
        originalSize,
        optimizedSize,
        compressionRatio: (originalSize - optimizedSize) / originalSize,
        format,
        quality: options?.quality || this.config.videos.quality,
        processingTime: Date.now() - startTime,
        success: true
      };

      logger.debug('Video optimized', result);
      return result;

    } catch (error) {
      logger.error('Video optimization failed', error instanceof Error ? error : new Error(String(error)));
      
      return {
        originalSize: typeof input === 'string' 
          ? Buffer.from(input, 'base64').length 
          : input.length,
        optimizedSize: 0,
        compressionRatio: 0,
        processingTime: Date.now() - startTime,
        success: false,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  /**
   * 优化JavaScript
   */
  async optimizeScript(
    code: string,
    options?: {
      minify?: boolean;
      treeshake?: boolean;
      target?: string;
    }
  ): Promise<OptimizationResult> {
    const startTime = Date.now();
    const originalSize = Buffer.from(code, 'utf8').length;

    try {
      let optimizedCode = code;

      // 模拟代码优化
      if (options?.minify !== false && this.config.scripts.minify) {
        // 移除注释和空白
        optimizedCode = optimizedCode
          .replace(/\/\*[\s\S]*?\*\//g, '') // 移除块注释
          .replace(/\/\/.*$/gm, '') // 移除行注释
          .replace(/\s+/g, ' ') // 压缩空白
          .trim();
      }

      if (options?.treeshake !== false && this.config.scripts.treeshake) {
        // 模拟tree shaking
        optimizedCode = optimizedCode.replace(/unused_function\(\);?/g, '');
      }

      const optimizedSize = Buffer.from(optimizedCode, 'utf8').length;

      const result: OptimizationResult = {
        originalSize,
        optimizedSize,
        compressionRatio: (originalSize - optimizedSize) / originalSize,
        processingTime: Date.now() - startTime,
        success: true
      };

      logger.debug('Script optimized', result);
      return result;

    } catch (error) {
      logger.error('Script optimization failed', error instanceof Error ? error : new Error(String(error)));
      
      return {
        originalSize,
        optimizedSize: 0,
        compressionRatio: 0,
        processingTime: Date.now() - startTime,
        success: false,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  /**
   * 优化CSS
   */
  async optimizeStylesheet(
    css: string,
    options?: {
      minify?: boolean;
      autoprefixer?: boolean;
      purge?: boolean;
      usedClasses?: string[];
    }
  ): Promise<OptimizationResult> {
    const startTime = Date.now();
    const originalSize = Buffer.from(css, 'utf8').length;

    try {
      let optimizedCSS = css;

      // 模拟CSS优化
      if (options?.minify !== false && this.config.styles.minify) {
        // 移除注释和空白
        optimizedCSS = optimizedCSS
          .replace(/\/\*[\s\S]*?\*\//g, '') // 移除注释
          .replace(/\s+/g, ' ') // 压缩空白
          .replace(/;\s*}/g, '}') // 移除最后的分号
          .trim();
      }

      if (options?.purge !== false && this.config.styles.purgeCSS && options?.usedClasses) {
        // 模拟CSS purging
        const usedClassesSet = new Set(options.usedClasses);
        const lines = optimizedCSS.split('\n');
        const purgedLines = lines.filter(line => {
          const classMatch = line.match(/\.([a-zA-Z0-9_-]+)/);
          return !classMatch || usedClassesSet.has(classMatch[1]);
        });
        optimizedCSS = purgedLines.join('\n');
      }

      const optimizedSize = Buffer.from(optimizedCSS, 'utf8').length;

      const result: OptimizationResult = {
        originalSize,
        optimizedSize,
        compressionRatio: (originalSize - optimizedSize) / originalSize,
        processingTime: Date.now() - startTime,
        success: true
      };

      logger.debug('Stylesheet optimized', result);
      return result;

    } catch (error) {
      logger.error('Stylesheet optimization failed', error instanceof Error ? error : new Error(String(error)));
      
      return {
        originalSize,
        optimizedSize: 0,
        compressionRatio: 0,
        processingTime: Date.now() - startTime,
        success: false,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  /**
   * 批量优化资源
   */
  async optimizeBatch(
    assets: Array<{
      path: string;
      content: Buffer | string;
      type: AssetType;
      options?: any;
    }>
  ): Promise<Map<string, OptimizationResult>> {
    const results = new Map<string, OptimizationResult>();
    const batchSize = 5; // 并发处理数量

    // 分批处理
    for (let i = 0; i < assets.length; i += batchSize) {
      const batch = assets.slice(i, i + batchSize);
      
      const batchPromises = batch.map(async (asset) => {
        try {
          let result: OptimizationResult;

          switch (asset.type) {
            case AssetType.IMAGE:
              result = await this.optimizeImage(asset.content, asset.options);
              break;
            case AssetType.VIDEO:
              result = await this.optimizeVideo(asset.content, asset.options);
              break;
            case AssetType.SCRIPT:
              result = await this.optimizeScript(
                typeof asset.content === 'string' ? asset.content : asset.content.toString(),
                asset.options
              );
              break;
            case AssetType.STYLESHEET:
              result = await this.optimizeStylesheet(
                typeof asset.content === 'string' ? asset.content : asset.content.toString(),
                asset.options
              );
              break;
            default:
              result = {
                originalSize: typeof asset.content === 'string' 
                  ? Buffer.from(asset.content).length 
                  : asset.content.length,
                optimizedSize: 0,
                compressionRatio: 0,
                processingTime: 0,
                success: false,
                error: 'Unsupported asset type'
              };
          }

          results.set(asset.path, result);
          
          // 缓存结果
          this.optimizationCache.set(asset.path, result);

        } catch (error) {
          logger.error('Asset optimization failed', error instanceof Error ? error : new Error(String(error)), {
            path: asset.path,
            type: asset.type
          });
          
          results.set(asset.path, {
            originalSize: 0,
            optimizedSize: 0,
            compressionRatio: 0,
            processingTime: 0,
            success: false,
            error: error instanceof Error ? error.message : String(error)
          });
        }
      });

      await Promise.allSettled(batchPromises);
    }

    return results;
  }

  /**
   * 获取优化统计
   */
  getOptimizationStats(): {
    totalAssets: number;
    totalOriginalSize: number;
    totalOptimizedSize: number;
    totalSavings: number;
    averageCompressionRatio: number;
    successRate: number;
    typeBreakdown: Record<string, {
      count: number;
      originalSize: number;
      optimizedSize: number;
      savings: number;
    }>;
  } {
    const results = Array.from(this.optimizationCache.values());
    const successful = results.filter(r => r.success);

    const totalOriginalSize = results.reduce((sum, r) => sum + r.originalSize, 0);
    const totalOptimizedSize = successful.reduce((sum, r) => sum + r.optimizedSize, 0);
    const totalSavings = totalOriginalSize - totalOptimizedSize;
    const averageCompressionRatio = successful.length > 0
      ? successful.reduce((sum, r) => sum + r.compressionRatio, 0) / successful.length
      : 0;

    return {
      totalAssets: results.length,
      totalOriginalSize,
      totalOptimizedSize,
      totalSavings,
      averageCompressionRatio,
      successRate: results.length > 0 ? (successful.length / results.length) * 100 : 0,
      typeBreakdown: {} // 这里可以按类型统计
    };
  }

  /**
   * 清理缓存
   */
  clearCache(): void {
    this.optimizationCache.clear();
    logger.info('Optimization cache cleared');
  }
}

/**
 * 资源分析器
 */
export class AssetAnalyzer {
  /**
   * 分析资源信息
   */
  static async analyzeAsset(path: string, content: Buffer): Promise<AssetInfo> {
    const size = content.length;
    const mimeType = AssetAnalyzer.getMimeType(path);
    const type = AssetAnalyzer.getAssetType(mimeType);

    const info: AssetInfo = {
      path,
      type,
      size,
      mimeType
    };

    // 如果是图片，获取尺寸信息
    if (type === AssetType.IMAGE) {
      info.dimensions = await AssetAnalyzer.getImageDimensions(content);
    }

    return info;
  }

  /**
   * 获取MIME类型
   */
  static getMimeType(path: string): string {
    const extension = path.split('.').pop()?.toLowerCase();
    
    const mimeMap: Record<string, string> = {
      'jpg': 'image/jpeg',
      'jpeg': 'image/jpeg',
      'png': 'image/png',
      'gif': 'image/gif',
      'webp': 'image/webp',
      'avif': 'image/avif',
      'svg': 'image/svg+xml',
      'mp4': 'video/mp4',
      'webm': 'video/webm',
      'mp3': 'audio/mpeg',
      'wav': 'audio/wav',
      'js': 'application/javascript',
      'css': 'text/css',
      'woff': 'font/woff',
      'woff2': 'font/woff2',
      'ttf': 'font/ttf',
      'pdf': 'application/pdf'
    };

    return mimeMap[extension || ''] || 'application/octet-stream';
  }

  /**
   * 根据MIME类型获取资源类型
   */
  static getAssetType(mimeType: string): AssetType {
    if (mimeType.startsWith('image/')) return AssetType.IMAGE;
    if (mimeType.startsWith('video/')) return AssetType.VIDEO;
    if (mimeType.startsWith('audio/')) return AssetType.AUDIO;
    if (mimeType.startsWith('font/')) return AssetType.FONT;
    if (mimeType === 'application/javascript' || mimeType === 'text/javascript') return AssetType.SCRIPT;
    if (mimeType === 'text/css') return AssetType.STYLESHEET;
    if (mimeType === 'application/pdf') return AssetType.DOCUMENT;
    
    return AssetType.OTHER;
  }

  /**
   * 获取图片尺寸
   */
  static async getImageDimensions(content: Buffer): Promise<{ width: number; height: number } | undefined> {
    try {
      // 这里应该使用实际的图片处理库来获取尺寸
      // 为了演示，返回模拟数据
      return { width: 1920, height: 1080 };
    } catch (error) {
      logger.warn('Failed to get image dimensions', { error: error instanceof Error ? error.message : String(error) });
      return undefined;
    }
  }

  /**
   * 检查资源是否需要优化
   */
  static shouldOptimize(info: AssetInfo, config: OptimizationConfig): boolean {
    // 检查文件大小阈值
    const sizeThresholds: Record<AssetType, number> = {
      [AssetType.IMAGE]: 50 * 1024, // 50KB
      [AssetType.VIDEO]: 1024 * 1024, // 1MB
      [AssetType.SCRIPT]: 10 * 1024, // 10KB
      [AssetType.STYLESHEET]: 10 * 1024, // 10KB
      [AssetType.FONT]: 100 * 1024, // 100KB
      [AssetType.AUDIO]: 500 * 1024, // 500KB
      [AssetType.DOCUMENT]: 100 * 1024, // 100KB
      [AssetType.OTHER]: 50 * 1024 // 50KB
    };

    const threshold = sizeThresholds[info.type];
    return info.size > threshold;
  }
}

export default AssetOptimizer;