/**
 * 图片压缩和格式优化
 */
import { logger } from '@/lib/logging/logger';

/**
 * 图片格式
 */
export enum ImageFormat {
  JPEG = 'jpeg',
  PNG = 'png',
  WEBP = 'webp',
  AVIF = 'avif',
  GIF = 'gif',
  SVG = 'svg'
}

/**
 * 压缩配置
 */
export interface CompressionConfig {
  quality: number; // 0-100
  progressive?: boolean; // 渐进式JPEG
  optimizeScans?: boolean; // 优化扫描
  mozjpeg?: boolean; // 使用mozjpeg
  lossless?: boolean; // 无损压缩
  effort?: number; // 压缩努力程度 (0-6)
  nearLossless?: number; // 近无损质量 (0-100)
  smartSubsample?: boolean; // 智能子采样
}

/**
 * 调整大小配置
 */
export interface ResizeConfig {
  width?: number;
  height?: number;
  fit?: 'cover' | 'contain' | 'fill' | 'inside' | 'outside';
  position?: 'center' | 'top' | 'bottom' | 'left' | 'right';
  background?: string; // 背景色
  withoutEnlargement?: boolean; // 不放大
  kernel?: 'nearest' | 'cubic' | 'mitchell' | 'lanczos2' | 'lanczos3';
  [key: string]: unknown;
}

/**
 * 水印配置
 */
export interface WatermarkConfig {
  image?: Buffer;
  text?: string;
  position: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' | 'center';
  opacity: number; // 0-1
  margin?: number;
  fontSize?: number;
  fontColor?: string;
  [key: string]: unknown;
}

/**
 * 压缩结果
 */
export interface CompressionResult {
  buffer: Buffer;
  format: ImageFormat;
  size: number;
  width: number;
  height: number;
  quality?: number;
  compressionRatio: number;
  processingTime: number;
  metadata?: Record<string, any>;
}

/**
 * 图片压缩器
 */
export class ImageCompressor {
  private defaultConfig: CompressionConfig = {
    quality: 85,
    progressive: true,
    optimizeScans: true,
    mozjpeg: true,
    effort: 4,
    smartSubsample: true,
  };

  /**
   * 压缩图片
   */
  async compress(
    input: Buffer,
    format: ImageFormat,
    config?: Partial<CompressionConfig>,
  ): Promise<CompressionResult> {
    const startTime = Date.now();
    const finalConfig = { ...this.defaultConfig, ...config };

    try {
      // 获取原始信息
      const originalInfo = await this.getImageInfo(input);
      const originalSize = input.length;

      // 根据格式进行压缩
      let compressedBuffer: Buffer;
      let quality: number | undefined;

      switch (format) {
        case ImageFormat.JPEG:
          ({ buffer: compressedBuffer, quality } = await this.compressJPEG(input, finalConfig));
          break;
        case ImageFormat.PNG:
          compressedBuffer = await this.compressPNG(input, finalConfig);
          break;
        case ImageFormat.WEBP:
          ({ buffer: compressedBuffer, quality } = await this.compressWebP(input, finalConfig));
          break;
        case ImageFormat.AVIF:
          ({ buffer: compressedBuffer, quality } = await this.compressAVIF(input, finalConfig));
          break;
        case ImageFormat.GIF:
          compressedBuffer = await this.compressGIF(input, finalConfig);
          break;
        default:
          throw new Error(`Unsupported format: ${format}`);
      }

      const compressedSize = compressedBuffer.length;
      const compressionRatio = (originalSize - compressedSize) / originalSize;

      const result: CompressionResult = {
        buffer: compressedBuffer,
        format,
        size: compressedSize,
        width: originalInfo.width,
        height: originalInfo.height,
        quality,
        compressionRatio,
        processingTime: Date.now() - startTime,
        metadata: originalInfo.metadata,
      };

      logger.debug('Image compressed', {
        format,
        originalSize,
        compressedSize,
        compressionRatio: Math.round(compressionRatio * 100) + '%',
        processingTime: result.processingTime,
      });

      return result;

    } catch (error) {
      logger.error('Image compression failed', error instanceof Error ? error : new Error(String(error)), {
        format,
        config: finalConfig,
      });
      throw error;
    }
  }

  /**
   * 调整图片大小
   */
  async resize(
    input: Buffer,
    config: ResizeConfig,
  ): Promise<Buffer> {
    try {
      // 这里应该使用实际的图片处理库，如 sharp
      // 为了演示，我们返回原始buffer
      logger.debug('Image resized', config);
      return input;

    } catch (error) {
      logger.error('Image resize failed', error instanceof Error ? error : new Error(String(error)), config);
      throw error;
    }
  }

  /**
   * 添加水印
   */
  async addWatermark(
    input: Buffer,
    config: WatermarkConfig,
  ): Promise<Buffer> {
    try {
      // 这里应该使用实际的图片处理库来添加水印
      // 为了演示，我们返回原始buffer
      logger.debug('Watermark added', config);
      return input;

    } catch (error) {
      logger.error('Watermark addition failed', error instanceof Error ? error : new Error(String(error)), config);
      throw error;
    }
  }

  /**
   * 生成缩略图
   */
  async generateThumbnail(
    input: Buffer,
    sizes: number[],
    format?: ImageFormat,
  ): Promise<Array<{ size: number; buffer: Buffer; width: number; height: number }>> {
    const thumbnails: Array<{ size: number; buffer: Buffer; width: number; height: number }> = [];

    for (const size of sizes) {
      try {
        const resized = await this.resize(input, {
          width: size,
          height: size,
          fit: 'cover',
        });

        let compressed = resized;
        if (format) {
          const result = await this.compress(resized, format);
          compressed = result.buffer;
        }

        thumbnails.push({
          size,
          buffer: compressed,
          width: size,
          height: size,
        });

      } catch (error) {
        logger.error('Thumbnail generation failed', error instanceof Error ? error : new Error(String(error)), { size });
      }
    }

    return thumbnails;
  }

  /**
   * 批量压缩
   */
  async compressBatch(
    images: Array<{
      buffer: Buffer;
      format: ImageFormat;
      config?: Partial<CompressionConfig>;
    }>,
  ): Promise<CompressionResult[]> {
    const results: CompressionResult[] = [];
    const batchSize = 3; // 并发处理数量

    for (let i = 0; i < images.length; i += batchSize) {
      const batch = images.slice(i, i + batchSize);

      const batchPromises = batch.map(async (image) => {
        try {
          return await this.compress(image.buffer, image.format, image.config);
        } catch (error) {
          logger.error('Batch compression failed for image', error instanceof Error ? error : new Error(String(error)));
          throw error;
        }
      });

      const batchResults = await Promise.allSettled(batchPromises);

      batchResults.forEach((result) => {
        if (result.status === 'fulfilled') {
          results.push(result.value);
        }
      });
    }

    return results;
  }

  /**
   * 自动选择最佳格式
   */
  async selectBestFormat(
    input: Buffer,
    supportedFormats: ImageFormat[] = [ImageFormat.AVIF, ImageFormat.WEBP, ImageFormat.JPEG],
  ): Promise<{ format: ImageFormat; result: CompressionResult }> {
    const results: Array<{ format: ImageFormat; result: CompressionResult }> = [];

    // 测试每种格式的压缩效果
    for (const format of supportedFormats) {
      try {
        const result = await this.compress(input, format);
        results.push({ format, result });
      } catch (error) {
        logger.warn('Format test failed', { format, error: error instanceof Error ? error.message : String(error) });
      }
    }

    if (results.length === 0) {
      throw new Error('No supported formats available');
    }

    // 选择压缩比最好的格式
    const best = results.reduce((prev, current) =>
      current.result.compressionRatio > prev.result.compressionRatio ? current : prev,
    );

    logger.debug('Best format selected', {
      format: best.format,
      compressionRatio: Math.round(best.result.compressionRatio * 100) + '%',
      size: best.result.size,
    });

    return best;
  }

  /**
   * 压缩JPEG
   */
  private async compressJPEG(
    input: Buffer,
    config: CompressionConfig,
  ): Promise<{ buffer: Buffer; quality: number }> {
    // 这里应该使用实际的JPEG压缩库
    // 为了演示，我们模拟压缩过程
    const quality = config.quality;
    const compressionFactor = quality / 100;
    const compressedSize = Math.floor(input.length * compressionFactor);
    const compressedBuffer = Buffer.alloc(compressedSize);

    return { buffer: compressedBuffer, quality };
  }

  /**
   * 压缩PNG
   */
  private async compressPNG(
    input: Buffer,
    config: CompressionConfig,
  ): Promise<Buffer> {
    // 这里应该使用实际的PNG压缩库
    // 为了演示，我们模拟压缩过程
    const compressionFactor = config.lossless ? 0.9 : 0.7;
    const compressedSize = Math.floor(input.length * compressionFactor);
    return Buffer.alloc(compressedSize);
  }

  /**
   * 压缩WebP
   */
  private async compressWebP(
    input: Buffer,
    config: CompressionConfig,
  ): Promise<{ buffer: Buffer; quality: number }> {
    // 这里应该使用实际的WebP压缩库
    const quality = config.quality;
    const compressionFactor = config.lossless ? 0.8 : quality / 100 * 0.6;
    const compressedSize = Math.floor(input.length * compressionFactor);
    const compressedBuffer = Buffer.alloc(compressedSize);

    return { buffer: compressedBuffer, quality };
  }

  /**
   * 压缩AVIF
   */
  private async compressAVIF(
    input: Buffer,
    config: CompressionConfig,
  ): Promise<{ buffer: Buffer; quality: number }> {
    // 这里应该使用实际的AVIF压缩库
    const quality = config.quality;
    const compressionFactor = quality / 100 * 0.5; // AVIF通常有更好的压缩比
    const compressedSize = Math.floor(input.length * compressionFactor);
    const compressedBuffer = Buffer.alloc(compressedSize);

    return { buffer: compressedBuffer, quality };
  }

  /**
   * 压缩GIF
   */
  private async compressGIF(
    input: Buffer,
    config: CompressionConfig,
  ): Promise<Buffer> {
    // 这里应该使用实际的GIF压缩库
    const compressionFactor = 0.8;
    const compressedSize = Math.floor(input.length * compressionFactor);
    return Buffer.alloc(compressedSize);
  }

  /**
   * 获取图片信息
   */
  private async getImageInfo(input: Buffer): Promise<{
    width: number;
    height: number;
    format: string;
    metadata?: Record<string, any>;
  }> {
    // 这里应该使用实际的图片处理库来获取信息
    // 为了演示，返回模拟数据
    return {
      width: 1920,
      height: 1080,
      format: 'jpeg',
      metadata: {
        density: 72,
        hasAlpha: false,
        channels: 3,
      },
    };
  }
}

/**
 * 图片格式转换器
 */
export class ImageConverter {
  private compressor = new ImageCompressor();

  /**
   * 转换图片格式
   */
  async convert(
    input: Buffer,
    targetFormat: ImageFormat,
    config?: Partial<CompressionConfig>,
  ): Promise<CompressionResult> {
    return await this.compressor.compress(input, targetFormat, config);
  }

  /**
   * 批量转换
   */
  async convertBatch(
    images: Array<{
      buffer: Buffer;
      targetFormat: ImageFormat;
      config?: Partial<CompressionConfig>;
    }>,
  ): Promise<CompressionResult[]> {
    const convertTasks = images.map(image => ({
      buffer: image.buffer,
      format: image.targetFormat,
      config: image.config,
    }));

    return await this.compressor.compressBatch(convertTasks);
  }

  /**
   * 智能转换（根据浏览器支持）
   */
  async smartConvert(
    input: Buffer,
    userAgent: string,
    fallbackFormat: ImageFormat = ImageFormat.JPEG,
  ): Promise<CompressionResult> {
    const supportedFormats = this.getSupportedFormats(userAgent);

    if (supportedFormats.length === 0) {
      return await this.convert(input, fallbackFormat);
    }

    const { result } = await this.compressor.selectBestFormat(input, supportedFormats);
    return result;
  }

  /**
   * 根据User-Agent获取支持的格式
   */
  private getSupportedFormats(userAgent: string): ImageFormat[] {
    const formats: ImageFormat[] = [ImageFormat.JPEG, ImageFormat.PNG, ImageFormat.GIF];

    // 检查WebP支持
    if (this.supportsWebP(userAgent)) {
      formats.unshift(ImageFormat.WEBP);
    }

    // 检查AVIF支持
    if (this.supportsAVIF(userAgent)) {
      formats.unshift(ImageFormat.AVIF);
    }

    return formats;
  }

  /**
   * 检查WebP支持
   */
  private supportsWebP(userAgent: string): boolean {
    // Chrome 23+, Firefox 65+, Safari 14+, Edge 18+
    return /Chrome\/([2-9]\d|[1-9]\d{2,})/.test(userAgent) ||
           /Firefox\/([6-9]\d|\d{3,})/.test(userAgent) ||
           /Safari\/([1-9]\d{2,})/.test(userAgent) ||
           /Edge\/([1-9]\d|\d{3,})/.test(userAgent);
  }

  /**
   * 检查AVIF支持
   */
  private supportsAVIF(userAgent: string): boolean {
    // Chrome 85+, Firefox 93+
    return /Chrome\/([8-9]\d|\d{3,})/.test(userAgent) ||
           /Firefox\/([9-9]\d|\d{3,})/.test(userAgent);
  }
}

/**
 * 图片优化工具
 */
export class ImageOptimizer {
  private compressor = new ImageCompressor();
  private converter = new ImageConverter();

  /**
   * 全面优化图片
   */
  async optimize(
    input: Buffer,
    options?: {
      targetFormat?: ImageFormat;
      quality?: number;
      resize?: ResizeConfig;
      watermark?: WatermarkConfig;
      generateThumbnails?: number[];
      userAgent?: string;
    },
  ): Promise<{
    main: CompressionResult;
    thumbnails?: Array<{ size: number; buffer: Buffer; width: number; height: number }>;
  }> {
    let processedBuffer = input;

    try {
      // 1. 调整大小
      if (options?.resize) {
        processedBuffer = await this.compressor.resize(processedBuffer, options.resize);
      }

      // 2. 添加水印
      if (options?.watermark) {
        processedBuffer = await this.compressor.addWatermark(processedBuffer, options.watermark);
      }

      // 3. 格式转换和压缩
      let main: CompressionResult;
      if (options?.targetFormat) {
        main = await this.converter.convert(processedBuffer, options.targetFormat, {
          quality: options.quality,
        });
      } else if (options?.userAgent) {
        main = await this.converter.smartConvert(processedBuffer, options.userAgent);
      } else {
        const { result } = await this.compressor.selectBestFormat(processedBuffer);
        main = result;
      }

      // 4. 生成缩略图
      let thumbnails: Array<{ size: number; buffer: Buffer; width: number; height: number }> | undefined;
      if (options?.generateThumbnails) {
        thumbnails = await this.compressor.generateThumbnail(
          processedBuffer,
          options.generateThumbnails,
          main.format,
        );
      }

      return { main, thumbnails };

    } catch (error) {
      logger.error('Image optimization failed', error instanceof Error ? error : new Error(String(error)), options);
      throw error;
    }
  }

  /**
   * 批量优化
   */
  async optimizeBatch(
    images: Array<{
      buffer: Buffer;
      options?: Parameters<typeof this.optimize>[1];
    }>,
  ): Promise<Array<{
    main: CompressionResult;
    thumbnails?: Array<{ size: number; buffer: Buffer; width: number; height: number }>;
  }>> {
    const results: Array<{
      main: CompressionResult;
      thumbnails?: Array<{ size: number; buffer: Buffer; width: number; height: number }>;
    }> = [];

    const batchSize = 2; // 图片优化比较耗资源，减少并发数

    for (let i = 0; i < images.length; i += batchSize) {
      const batch = images.slice(i, i + batchSize);

      const batchPromises = batch.map(async (image) => {
        try {
          return await this.optimize(image.buffer, image.options);
        } catch (error) {
          logger.error('Batch optimization failed for image', error instanceof Error ? error : new Error(String(error)));
          throw error;
        }
      });

      const batchResults = await Promise.allSettled(batchPromises);

      batchResults.forEach((result) => {
        if (result.status === 'fulfilled') {
          results.push(result.value);
        }
      });
    }

    return results;
  }
}

export default ImageCompressor;
