import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';

export interface TestResult {
  testFile: string;
  status: 'passed' | 'failed' | 'skipped';
  duration: number;
  timestamp: Date;
  coverage?: Coverage;
  errors?: TestError[];
}

export interface Coverage {
  statements: number;
  branches: number;
  functions: number;
  lines: number;
  files: Record<string, FileCoverage>;
}

export interface FileCoverage {
  statements: number;
  branches: number;
  functions: number;
  lines: number;
}

export interface TestError {
  message: string;
  stack?: string;
  location?: {
    file: string;
    line: number;
    column: number;
  };
}

export interface CacheEntry {
  testFile: string;
  sourceFiles: string[];
  sourceHashes: Record<string, string>;
  testHash: string;
  result: TestResult;
  dependencies: string[];
  createdAt: Date;
  lastUsed: Date;
  useCount: number;
}

export interface CacheStats {
  totalEntries: number;
  hitRate: number;
  totalHits: number;
  totalMisses: number;
  cacheSize: number;
  oldestEntry: Date | null;
  newestEntry: Date | null;
}

export interface CacheOptions {
  cacheDir: string;
  maxAge: number; // in milliseconds
  maxSize: number; // in bytes
  compressionEnabled: boolean;
  cleanupInterval: number; // in milliseconds
}

/**
 * 测试缓存管理器
 * 管理测试结果的缓存和复用
 */
export class TestCacheManager {
  private options: CacheOptions;
  private cache: Map<string, CacheEntry> = new Map();
  private stats: CacheStats;
  private cleanupTimer?: NodeJS.Timeout;

  constructor(options: Partial<CacheOptions> = {}) {
    this.options = {
      cacheDir: path.join(process.cwd(), '.test-cache'),
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
      maxSize: 100 * 1024 * 1024, // 100MB
      compressionEnabled: true,
      cleanupInterval: 60 * 60 * 1000, // 1 hour
      ...options
    };

    this.stats = {
      totalEntries: 0,
      hitRate: 0,
      totalHits: 0,
      totalMisses: 0,
      cacheSize: 0,
      oldestEntry: null,
      newestEntry: null
    };

    this.ensureCacheDirectory();
    this.loadCache();
    this.startCleanupTimer();
  }

  /**
   * 确保缓存目录存在
   */
  private ensureCacheDirectory(): void {
    if (!fs.existsSync(this.options.cacheDir)) {
      fs.mkdirSync(this.options.cacheDir, { recursive: true });
    }
  }

  /**
   * 生成文件哈希
   */
  private generateFileHash(filePath: string): string {
    try {
      const content = fs.readFileSync(filePath, 'utf8');
      const stats = fs.statSync(filePath);
      const hashInput = `${content}:${stats.mtime.getTime()}:${stats.size}`;
      return crypto.createHash('sha256').update(hashInput).digest('hex');
    } catch (error) {
      // 如果文件不存在或无法读取，返回空哈希
      return crypto.createHash('sha256').update('').digest('hex');
    }
  }

  /**
   * 生成缓存键
   */
  private generateCacheKey(testFile: string, sourceFiles: string[]): string {
    const keyInput = `${testFile}:${sourceFiles.sort().join(':')}`;
    return crypto.createHash('md5').update(keyInput).digest('hex');
  }

  /**
   * 检查缓存是否有效
   */
  isCacheValid(testFile: string, sourceFiles: string[], dependencies: string[] = []): boolean {
    const cacheKey = this.generateCacheKey(testFile, sourceFiles);
    const entry = this.cache.get(cacheKey);

    if (!entry) {
      return false;
    }

    // 检查缓存是否过期
    const now = new Date();
    if (now.getTime() - entry.createdAt.getTime() > this.options.maxAge) {
      this.cache.delete(cacheKey);
      return false;
    }

    // 检查测试文件是否变更
    const currentTestHash = this.generateFileHash(testFile);
    if (currentTestHash !== entry.testHash) {
      this.cache.delete(cacheKey);
      return false;
    }

    // 检查源文件是否变更
    for (const sourceFile of sourceFiles) {
      const currentHash = this.generateFileHash(sourceFile);
      const cachedHash = entry.sourceHashes[sourceFile];
      if (currentHash !== cachedHash) {
        this.cache.delete(cacheKey);
        return false;
      }
    }

    // 检查依赖文件是否变更
    for (const depFile of dependencies) {
      if (!entry.dependencies.includes(depFile)) {
        // 新增了依赖，缓存无效
        this.cache.delete(cacheKey);
        return false;
      }
    }

    // 检查是否有依赖被移除
    for (const cachedDep of entry.dependencies) {
      if (!dependencies.includes(cachedDep)) {
        // 移除了依赖，缓存无效
        this.cache.delete(cacheKey);
        return false;
      }
    }

    return true;
  }

  /**
   * 获取缓存的测试结果
   */
  getCachedResult(testFile: string, sourceFiles: string[]): TestResult | null {
    const cacheKey = this.generateCacheKey(testFile, sourceFiles);
    const entry = this.cache.get(cacheKey);

    if (!entry) {
      this.stats.totalMisses++;
      this.updateHitRate();
      return null;
    }

    // 更新使用统计
    entry.lastUsed = new Date();
    entry.useCount++;
    this.stats.totalHits++;
    this.updateHitRate();

    return entry.result;
  }

  /**
   * 缓存测试结果
   */
  cacheResult(
    testFile: string, 
    sourceFiles: string[], 
    result: TestResult, 
    dependencies: string[] = []
  ): void {
    const cacheKey = this.generateCacheKey(testFile, sourceFiles);
    
    // 生成源文件哈希
    const sourceHashes: Record<string, string> = {};
    for (const sourceFile of sourceFiles) {
      sourceHashes[sourceFile] = this.generateFileHash(sourceFile);
    }

    const testHash = this.generateFileHash(testFile);
    const now = new Date();

    const entry: CacheEntry = {
      testFile,
      sourceFiles,
      sourceHashes,
      testHash,
      result,
      dependencies,
      createdAt: now,
      lastUsed: now,
      useCount: 0
    };

    this.cache.set(cacheKey, entry);
    this.updateStats();

    // 检查缓存大小限制
    this.enforceMaxSize();
  }

  /**
   * 更新命中率
   */
  private updateHitRate(): void {
    const total = this.stats.totalHits + this.stats.totalMisses;
    this.stats.hitRate = total > 0 ? this.stats.totalHits / total : 0;
  }

  /**
   * 更新统计信息
   */
  private updateStats(): void {
    this.stats.totalEntries = this.cache.size;
    
    const entries = Array.from(this.cache.values());
    if (entries.length > 0) {
      const dates = entries.map(e => e.createdAt);
      this.stats.oldestEntry = new Date(Math.min(...dates.map(d => d.getTime())));
      this.stats.newestEntry = new Date(Math.max(...dates.map(d => d.getTime())));
    } else {
      this.stats.oldestEntry = null;
      this.stats.newestEntry = null;
    }

    // 估算缓存大小
    this.stats.cacheSize = this.estimateCacheSize();
  }

  /**
   * 估算缓存大小
   */
  private estimateCacheSize(): number {
    let size = 0;
    for (const entry of this.cache.values()) {
      // 粗略估算每个条目的大小
      size += JSON.stringify(entry).length * 2; // UTF-16编码，每字符2字节
    }
    return size;
  }

  /**
   * 强制执行最大缓存大小限制
   */
  private enforceMaxSize(): void {
    while (this.stats.cacheSize > this.options.maxSize && this.cache.size > 0) {
      // 删除最久未使用的条目
      let oldestKey: string | null = null;
      let oldestTime = Date.now();

      for (const [key, entry] of this.cache.entries()) {
        if (entry.lastUsed.getTime() < oldestTime) {
          oldestTime = entry.lastUsed.getTime();
          oldestKey = key;
        }
      }

      if (oldestKey) {
        this.cache.delete(oldestKey);
        this.updateStats();
      } else {
        break;
      }
    }
  }

  /**
   * 清理过期缓存
   */
  cleanup(): void {
    const now = new Date();
    const expiredKeys: string[] = [];

    for (const [key, entry] of this.cache.entries()) {
      if (now.getTime() - entry.createdAt.getTime() > this.options.maxAge) {
        expiredKeys.push(key);
      }
    }

    expiredKeys.forEach(key => this.cache.delete(key));
    
    if (expiredKeys.length > 0) {
      this.updateStats();
    }
  }

  /**
   * 启动清理定时器
   */
  private startCleanupTimer(): void {
    this.cleanupTimer = setInterval(() => {
      this.cleanup();
    }, this.options.cleanupInterval);
  }

  /**
   * 停止清理定时器
   */
  private stopCleanupTimer(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = undefined;
    }
  }

  /**
   * 保存缓存到磁盘
   */
  async saveCache(): Promise<void> {
    const cacheFile = path.join(this.options.cacheDir, 'test-cache.json');
    const cacheData = {
      version: '1.0.0',
      timestamp: new Date().toISOString(),
      entries: Array.from(this.cache.entries()).map(([key, entry]) => ({
        key,
        ...entry,
        createdAt: entry.createdAt.toISOString(),
        lastUsed: entry.lastUsed.toISOString(),
        result: {
          ...entry.result,
          timestamp: entry.result.timestamp.toISOString()
        }
      })),
      stats: this.stats
    };

    try {
      let content = JSON.stringify(cacheData, null, 2);
      
      if (this.options.compressionEnabled) {
        const zlib = require('zlib');
        content = zlib.gzipSync(content).toString('base64');
      }

      fs.writeFileSync(cacheFile, content, 'utf8');
    } catch (error) {
      console.warn(`Failed to save test cache: ${error.message}`);
    }
  }

  /**
   * 从磁盘加载缓存
   */
  private loadCache(): void {
    const cacheFile = path.join(this.options.cacheDir, 'test-cache.json');
    
    if (!fs.existsSync(cacheFile)) {
      return;
    }

    try {
      let content = fs.readFileSync(cacheFile, 'utf8');
      
      if (this.options.compressionEnabled) {
        try {
          const zlib = require('zlib');
          content = zlib.gunzipSync(Buffer.from(content, 'base64')).toString('utf8');
        } catch {
          // 如果解压失败，可能是未压缩的格式，直接使用
        }
      }

      const cacheData = JSON.parse(content);
      
      // 恢复缓存条目
      for (const entryData of cacheData.entries) {
        const entry: CacheEntry = {
          ...entryData,
          createdAt: new Date(entryData.createdAt),
          lastUsed: new Date(entryData.lastUsed),
          result: {
            ...entryData.result,
            timestamp: new Date(entryData.result.timestamp)
          }
        };
        
        this.cache.set(entryData.key, entry);
      }

      // 恢复统计信息
      if (cacheData.stats) {
        this.stats = {
          ...cacheData.stats,
          oldestEntry: cacheData.stats.oldestEntry ? new Date(cacheData.stats.oldestEntry) : null,
          newestEntry: cacheData.stats.newestEntry ? new Date(cacheData.stats.newestEntry) : null
        };
      }

      // 清理过期条目
      this.cleanup();
      
    } catch (error) {
      console.warn(`Failed to load test cache: ${error.message}`);
      // 如果加载失败，从空缓存开始
      this.cache.clear();
    }
  }

  /**
   * 清空缓存
   */
  clear(): void {
    this.cache.clear();
    this.stats = {
      totalEntries: 0,
      hitRate: 0,
      totalHits: 0,
      totalMisses: 0,
      cacheSize: 0,
      oldestEntry: null,
      newestEntry: null
    };
  }

  /**
   * 删除特定测试的缓存
   */
  invalidateTest(testFile: string): void {
    const keysToDelete: string[] = [];
    
    for (const [key, entry] of this.cache.entries()) {
      if (entry.testFile === testFile) {
        keysToDelete.push(key);
      }
    }

    keysToDelete.forEach(key => this.cache.delete(key));
    this.updateStats();
  }

  /**
   * 删除受影响文件的相关缓存
   */
  invalidateAffectedTests(affectedFiles: string[]): void {
    const keysToDelete: string[] = [];
    
    for (const [key, entry] of this.cache.entries()) {
      // 检查是否有受影响的源文件
      const hasAffectedSource = entry.sourceFiles.some(file => 
        affectedFiles.includes(file)
      );
      
      // 检查是否有受影响的依赖
      const hasAffectedDependency = entry.dependencies.some(file => 
        affectedFiles.includes(file)
      );

      if (hasAffectedSource || hasAffectedDependency) {
        keysToDelete.push(key);
      }
    }

    keysToDelete.forEach(key => this.cache.delete(key));
    this.updateStats();
  }

  /**
   * 获取缓存统计信息
   */
  getStats(): CacheStats {
    this.updateStats();
    return { ...this.stats };
  }

  /**
   * 获取缓存条目列表
   */
  getCacheEntries(): CacheEntry[] {
    return Array.from(this.cache.values());
  }

  /**
   * 导出缓存数据
   */
  exportCache(): any {
    return {
      version: '1.0.0',
      timestamp: new Date().toISOString(),
      options: this.options,
      entries: Array.from(this.cache.entries()),
      stats: this.stats
    };
  }

  /**
   * 导入缓存数据
   */
  importCache(data: any): void {
    this.clear();
    
    if (data.entries) {
      for (const [key, entry] of data.entries) {
        // 确保日期对象正确恢复
        const restoredEntry: CacheEntry = {
          ...entry,
          createdAt: new Date(entry.createdAt),
          lastUsed: new Date(entry.lastUsed),
          result: {
            ...entry.result,
            timestamp: new Date(entry.result.timestamp)
          }
        };
        
        this.cache.set(key, restoredEntry);
      }
    }

    this.updateStats();
  }

  /**
   * 销毁缓存管理器
   */
  destroy(): void {
    this.stopCleanupTimer();
    this.saveCache();
    this.clear();
  }
}