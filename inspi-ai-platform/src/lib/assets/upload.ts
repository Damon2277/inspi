/**
 * 资源上传和管理系统
 */
import { AssetType } from '@/lib/cdn/config';
import { logger } from '@/lib/logging/logger';

import { ImageOptimizer, ImageFormat } from './compression';

/**
 * 上传配置
 */
export interface UploadConfig {
  maxFileSize: number; // 字节
  allowedTypes: string[]; // MIME类型
  allowedExtensions: string[];
  uploadPath: string;
  generateThumbnails: boolean;
  thumbnailSizes: number[];
  autoOptimize: boolean;
  virusScan: boolean;
  watermark?: {
    enabled: boolean;
    text?: string;
    image?: string;
    position: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' | 'center';
    opacity: number;
  };
}

/**
 * 上传结果
 */
export interface UploadResult {
  id: string;
  originalName: string;
  fileName: string;
  path: string;
  url: string;
  size: number;
  mimeType: string;
  assetType: AssetType;
  dimensions?: { width: number; height: number };
  thumbnails?: Array<{
    size: number;
    path: string;
    url: string;
  }>;
  metadata: {
    uploadedAt: Date;
    uploadedBy?: string;
    optimized: boolean;
    originalSize?: number;
    compressionRatio?: number;
  };
}

/**
 * 上传进度
 */
export interface UploadProgress {
  id: string;
  stage: 'uploading' | 'processing' | 'optimizing' | 'completed' | 'failed';
  progress: number; // 0-100
  message: string;
  error?: string;
  [key: string]: unknown;
}

/**
 * 文件验证结果
 */
export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

/**
 * 资源上传管理器
 */
export class AssetUploadManager {
  private config: UploadConfig;
  private imageOptimizer = new ImageOptimizer();
  private uploadProgress = new Map<string, UploadProgress>();
  private uploadedAssets = new Map<string, UploadResult>();

  constructor(config?: Partial<UploadConfig>) {
    this.config = {
      maxFileSize: 10 * 1024 * 1024, // 10MB
      allowedTypes: [
        'image/jpeg',
        'image/png',
        'image/gif',
        'image/webp',
        'image/avif',
        'video/mp4',
        'video/webm',
        'audio/mp3',
        'audio/wav',
        'application/pdf',
        'text/plain',
      ],
      allowedExtensions: [
        'jpg', 'jpeg', 'png', 'gif', 'webp', 'avif',
        'mp4', 'webm', 'mp3', 'wav', 'pdf', 'txt',
      ],
      uploadPath: '/uploads',
      generateThumbnails: true,
      thumbnailSizes: [150, 300, 600],
      autoOptimize: true,
      virusScan: false,
      ...config,
    };
  }

  /**
   * 上传单个文件
   */
  async uploadFile(
    file: File | Buffer,
    options?: {
      originalName?: string;
      userId?: string;
      folder?: string;
      optimize?: boolean;
      generateThumbnails?: boolean;
    },
  ): Promise<UploadResult> {
    const uploadId = this.generateUploadId();

    try {
      // 初始化进度
      this.updateProgress(uploadId, {
        id: uploadId,
        stage: 'uploading',
        progress: 0,
        message: 'Starting upload...',
      });

      // 获取文件信息
      const fileInfo = await this.getFileInfo(file, options?.originalName);

      // 验证文件
      const validation = this.validateFile(fileInfo);
      if (!validation.valid) {
        throw new Error(`File validation failed: ${validation.errors.join(', ')}`);
      }

      this.updateProgress(uploadId, {
        id: uploadId,
        stage: 'uploading',
        progress: 20,
        message: 'File validated, uploading...',
      });

      // 病毒扫描
      if (this.config.virusScan) {
        await this.scanForVirus(fileInfo.buffer);
      }

      this.updateProgress(uploadId, {
        id: uploadId,
        stage: 'processing',
        progress: 40,
        message: 'Processing file...',
      });

      // 生成文件名和路径
      const fileName = this.generateFileName(fileInfo.originalName, fileInfo.extension);
      const folder = options?.folder || this.getDefaultFolder(fileInfo.assetType);
      const filePath = `${this.config.uploadPath}/${folder}/${fileName}`;

      // 保存原始文件
      await this.saveFile(fileInfo.buffer, filePath);

      let finalBuffer = fileInfo.buffer;
      let optimized = false;
      let compressionRatio: number | undefined;

      // 优化处理
      if ((options?.optimize !== false && this.config.autoOptimize) &&
          fileInfo.assetType === AssetType.IMAGE) {

        this.updateProgress(uploadId, {
          id: uploadId,
          stage: 'optimizing',
          progress: 60,
          message: 'Optimizing image...',
        });

        const optimizationResult = await this.imageOptimizer.optimize(fileInfo.buffer, {
          quality: 85,
          generateThumbnails: options?.generateThumbnails !== false && this.config.generateThumbnails
            ? this.config.thumbnailSizes
            : undefined,
        });

        finalBuffer = optimizationResult.main.buffer;
        optimized = true;
        compressionRatio = optimizationResult.main.compressionRatio;

        // 保存优化后的文件
        await this.saveFile(finalBuffer, filePath);

        // 保存缩略图
        if (optimizationResult.thumbnails) {
          for (const thumbnail of optimizationResult.thumbnails) {
            const thumbPath = `${this.config.uploadPath}/${folder}/thumbs/${thumbnail.size}_${fileName}`;
            await this.saveFile(thumbnail.buffer, thumbPath);
          }
        }
      }

      this.updateProgress(uploadId, {
        id: uploadId,
        stage: 'completed',
        progress: 100,
        message: 'Upload completed successfully',
      });

      // 创建上传结果
      const result: UploadResult = {
        id: uploadId,
        originalName: fileInfo.originalName,
        fileName,
        path: filePath,
        url: this.generateUrl(filePath),
        size: finalBuffer.length,
        mimeType: fileInfo.mimeType,
        assetType: fileInfo.assetType,
        dimensions: fileInfo.dimensions,
        thumbnails: this.config.generateThumbnails && fileInfo.assetType === AssetType.IMAGE
          ? this.config.thumbnailSizes.map(size => ({
              size,
              path: `${this.config.uploadPath}/${folder}/thumbs/${size}_${fileName}`,
              url: this.generateUrl(`${this.config.uploadPath}/${folder}/thumbs/${size}_${fileName}`),
            }))
          : undefined,
        metadata: {
          uploadedAt: new Date(),
          uploadedBy: options?.userId,
          optimized,
          originalSize: fileInfo.buffer.length,
          compressionRatio,
        },
      };

      // 缓存结果
      this.uploadedAssets.set(uploadId, result);

      logger.info('File uploaded successfully', {
        uploadId,
        fileName,
        size: result.size,
        optimized,
        compressionRatio,
      });

      return result;

    } catch (error) {
      this.updateProgress(uploadId, {
        id: uploadId,
        stage: 'failed',
        progress: 0,
        message: 'Upload failed',
        error: error instanceof Error ? error.message : String(error),
      });

      logger.error('File upload failed', error instanceof Error ? error : new Error(String(error)), {
        uploadId,
        originalName: options?.originalName,
      });

      throw error;
    }
  }

  /**
   * 批量上传文件
   */
  async uploadFiles(
    files: Array<File | Buffer>,
    options?: {
      userId?: string;
      folder?: string;
      optimize?: boolean;
      generateThumbnails?: boolean;
      maxConcurrent?: number;
    },
  ): Promise<UploadResult[]> {
    const results: UploadResult[] = [];
    const maxConcurrent = options?.maxConcurrent || 3;

    // 分批处理
    for (let i = 0; i < files.length; i += maxConcurrent) {
      const batch = files.slice(i, i + maxConcurrent);

      const batchPromises = batch.map(async (file, index) => {
        try {
          return await this.uploadFile(file, {
            ...options,
            originalName: file instanceof File ? file.name : `file_${i + index}`,
          });
        } catch (error) {
          logger.error('Batch upload failed for file', error instanceof Error ? error : new Error(String(error)), {
            index: i + index,
          });
          return null;
        }
      });

      const batchResults = await Promise.allSettled(batchPromises);

      batchResults.forEach((result) => {
        if (result.status === 'fulfilled' && result.value) {
          results.push(result.value);
        }
      });
    }

    return results;
  }

  /**
   * 获取上传进度
   */
  getUploadProgress(uploadId: string): UploadProgress | undefined {
    return this.uploadProgress.get(uploadId);
  }

  /**
   * 获取上传结果
   */
  getUploadResult(uploadId: string): UploadResult | undefined {
    return this.uploadedAssets.get(uploadId);
  }

  /**
   * 删除文件
   */
  async deleteFile(uploadId: string): Promise<boolean> {
    try {
      const result = this.uploadedAssets.get(uploadId);
      if (!result) {
        throw new Error('Upload not found');
      }

      // 删除主文件
      await this.removeFile(result.path);

      // 删除缩略图
      if (result.thumbnails) {
        for (const thumbnail of result.thumbnails) {
          await this.removeFile(thumbnail.path);
        }
      }

      // 清理缓存
      this.uploadedAssets.delete(uploadId);
      this.uploadProgress.delete(uploadId);

      logger.info('File deleted successfully', { uploadId, path: result.path });
      return true;

    } catch (error) {
      logger.error('File deletion failed', error instanceof Error ? error : new Error(String(error)), { uploadId });
      return false;
    }
  }

  /**
   * 获取文件信息
   */
  private async getFileInfo(
    file: File | Buffer,
    originalName?: string,
  ): Promise<{
    buffer: Buffer;
    originalName: string;
    extension: string;
    mimeType: string;
    assetType: AssetType;
    dimensions?: { width: number; height: number };
  }> {
    let buffer: Buffer;
    let name: string;
    let mimeType: string;

    if (file instanceof File) {
      buffer = Buffer.from(await file.arrayBuffer());
      name = file.name;
      mimeType = file.type;
    } else {
      buffer = file;
      name = originalName || 'unknown';
      mimeType = this.detectMimeType(name);
    }

    const extension = this.getFileExtension(name);
    const assetType = this.getAssetType(mimeType);

    // 获取图片尺寸
    let dimensions: { width: number; height: number } | undefined;
    if (assetType === AssetType.IMAGE) {
      dimensions = await this.getImageDimensions(buffer);
    }

    return {
      buffer,
      originalName: name,
      extension,
      mimeType,
      assetType,
      dimensions,
    };
  }

  /**
   * 验证文件
   */
  private validateFile(fileInfo: {
    buffer: Buffer;
    originalName: string;
    extension: string;
    mimeType: string;
    assetType: AssetType;
  }): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // 检查文件大小
    if (fileInfo.buffer.length > this.config.maxFileSize) {
      errors.push(`File size ${fileInfo.buffer.length} exceeds maximum ${this.config.maxFileSize}`);
    }

    // 检查MIME类型
    if (!this.config.allowedTypes.includes(fileInfo.mimeType)) {
      errors.push(`MIME type ${fileInfo.mimeType} is not allowed`);
    }

    // 检查文件扩展名
    if (!this.config.allowedExtensions.includes(fileInfo.extension.toLowerCase())) {
      errors.push(`File extension ${fileInfo.extension} is not allowed`);
    }

    // 检查文件名
    if (fileInfo.originalName.length > 255) {
      errors.push('File name is too long');
    }

    // 检查特殊字符
    if (/[<>:"/\\|?*]/.test(fileInfo.originalName)) {
      errors.push('File name contains invalid characters');
    }

    // 警告检查
    if (fileInfo.buffer.length > this.config.maxFileSize * 0.8) {
      warnings.push('File size is close to the maximum limit');
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * 病毒扫描
   */
  private async scanForVirus(buffer: Buffer): Promise<void> {
    // 这里应该集成实际的病毒扫描服务
    // 为了演示，我们模拟扫描过程
    await new Promise(resolve => setTimeout(resolve, 100));

    // 模拟检测到病毒的情况（极小概率）
    if (Math.random() < 0.001) {
      throw new Error('Virus detected in file');
    }
  }

  /**
   * 保存文件
   */
  private async saveFile(buffer: Buffer, path: string): Promise<void> {
    // 这里应该实现实际的文件保存逻辑
    // 可能保存到本地文件系统、云存储等
    logger.debug('File saved', { path, size: buffer.length });
  }

  /**
   * 删除文件
   */
  private async removeFile(path: string): Promise<void> {
    // 这里应该实现实际的文件删除逻辑
    logger.debug('File removed', { path });
  }

  /**
   * 生成文件名
   */
  private generateFileName(originalName: string, extension: string): string {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 8);
    const baseName = originalName.replace(/\.[^/.]+$/, '').replace(/[^a-zA-Z0-9]/g, '_');
    return `${baseName}_${timestamp}_${random}.${extension}`;
  }

  /**
   * 获取默认文件夹
   */
  private getDefaultFolder(assetType: AssetType): string {
    const folderMap: Record<AssetType, string> = {
      [AssetType.IMAGE]: 'images',
      [AssetType.VIDEO]: 'videos',
      [AssetType.AUDIO]: 'audio',
      [AssetType.DOCUMENT]: 'documents',
      [AssetType.SCRIPT]: 'scripts',
      [AssetType.STYLESHEET]: 'styles',
      [AssetType.FONT]: 'fonts',
      [AssetType.OTHER]: 'misc',
    };

    return folderMap[assetType] || 'misc';
  }

  /**
   * 生成URL
   */
  private generateUrl(path: string): string {
    // 这里应该根据实际的CDN配置生成URL
    return `https://cdn.example.com${path}`;
  }

  /**
   * 检测MIME类型
   */
  private detectMimeType(fileName: string): string {
    const extension = this.getFileExtension(fileName).toLowerCase();

    const mimeMap: Record<string, string> = {
      'jpg': 'image/jpeg',
      'jpeg': 'image/jpeg',
      'png': 'image/png',
      'gif': 'image/gif',
      'webp': 'image/webp',
      'avif': 'image/avif',
      'mp4': 'video/mp4',
      'webm': 'video/webm',
      'mp3': 'audio/mpeg',
      'wav': 'audio/wav',
      'pdf': 'application/pdf',
      'txt': 'text/plain',
    };

    return mimeMap[extension] || 'application/octet-stream';
  }

  /**
   * 获取文件扩展名
   */
  private getFileExtension(fileName: string): string {
    return fileName.split('.').pop() || '';
  }

  /**
   * 获取资源类型
   */
  private getAssetType(mimeType: string): AssetType {
    if (mimeType.startsWith('image/')) return AssetType.IMAGE;
    if (mimeType.startsWith('video/')) return AssetType.VIDEO;
    if (mimeType.startsWith('audio/')) return AssetType.AUDIO;
    if (mimeType === 'application/pdf') return AssetType.DOCUMENT;
    if (mimeType === 'application/javascript') return AssetType.SCRIPT;
    if (mimeType === 'text/css') return AssetType.STYLESHEET;
    if (mimeType.startsWith('font/')) return AssetType.FONT;

    return AssetType.OTHER;
  }

  /**
   * 获取图片尺寸
   */
  private async getImageDimensions(buffer: Buffer): Promise<{ width: number; height: number } | undefined> {
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
   * 生成上传ID
   */
  private generateUploadId(): string {
    return `upload_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }

  /**
   * 更新进度
   */
  private updateProgress(uploadId: string, progress: UploadProgress): void {
    this.uploadProgress.set(uploadId, progress);

    // 这里可以通过WebSocket或Server-Sent Events发送进度更新
    logger.debug('Upload progress updated', progress);
  }

  /**
   * 清理过期的上传记录
   */
  cleanup(maxAge: number = 24 * 60 * 60 * 1000): void {
    const cutoffTime = Date.now() - maxAge;

    for (const [uploadId, result] of this.uploadedAssets.entries()) {
      if (result.metadata.uploadedAt.getTime() < cutoffTime) {
        this.uploadedAssets.delete(uploadId);
        this.uploadProgress.delete(uploadId);
      }
    }

    logger.info('Upload records cleaned up', {
      remaining: this.uploadedAssets.size,
    });
  }
}

/**
 * 上传工具函数
 */
export class UploadUtils {
  /**
   * 验证文件类型
   */
  static isValidFileType(file: File, allowedTypes: string[]): boolean {
    return allowedTypes.includes(file.type);
  }

  /**
   * 格式化文件大小
   */
  static formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';

    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  /**
   * 生成文件预览URL
   */
  static generatePreviewUrl(file: File): string {
    return URL.createObjectURL(file);
  }

  /**
   * 清理预览URL
   */
  static cleanupPreviewUrl(url: string): void {
    URL.revokeObjectURL(url);
  }

  /**
   * 检查浏览器支持
   */
  static checkBrowserSupport(): {
    fileAPI: boolean;
    dragDrop: boolean;
    formData: boolean;
    progress: boolean;
  } {
    return {
      fileAPI: !!(window.File && window.FileReader && window.FileList && window.Blob),
      dragDrop: 'draggable' in document.createElement('div'),
      formData: !!window.FormData,
      progress: 'upload' in new XMLHttpRequest(),
    };
  }
}

export default AssetUploadManager;
