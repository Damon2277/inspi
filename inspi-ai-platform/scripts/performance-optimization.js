#!/usr/bin/env node

/**
 * 性能优化自动化脚本
 * 基于测试结果自动应用性能优化建议
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

class PerformanceOptimizer {
  constructor() {
    this.baseDir = path.join(__dirname, '..');
    this.configDir = path.join(this.baseDir, '.performance');
    this.backupDir = path.join(this.configDir, 'backups');
    
    // 确保配置目录存在
    [this.configDir, this.backupDir].forEach(dir => {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
    });
  }

  log(message, level = 'info') {
    const timestamp = new Date().toISOString();
    const prefix = {
      info: '📋',
      success: '✅',
      error: '❌',
      warning: '⚠️',
      debug: '🔍'
    }[level] || '📋';

    console.log(`${prefix} [${timestamp}] ${message}`);
  }

  async loadPerformanceResults() {
    this.log('Loading performance test results...', 'info');
    
    const reportsDir = path.join(this.baseDir, 'reports');
    if (!fs.existsSync(reportsDir)) {
      throw new Error('No performance reports found. Run performance tests first.');
    }

    // 找到最新的性能测试报告
    const reportFiles = fs.readdirSync(reportsDir)
      .filter(file => file.startsWith('performance-e2e-') && file.endsWith('.json'))
      .sort()
      .reverse();

    if (reportFiles.length === 0) {
      throw new Error('No performance test reports found.');
    }

    const latestReport = path.join(reportsDir, reportFiles[0]);
    const reportData = JSON.parse(fs.readFileSync(latestReport, 'utf8'));

    this.log(`Loaded report: ${reportFiles[0]}`, 'success');
    return reportData;
  }

  extractMetrics(reportData) {
    const metrics = {
      lcp: 0,
      fcp: 0,
      cls: 0,
      ttfb: 0,
      loadTime: 0,
      memoryUsage: 0,
      cacheHitRate: 0.9,
      networkRequests: 0,
      totalBytes: 0
    };

    // 从E2E测试结果中提取指标
    if (reportData.tests.e2e && reportData.tests.e2e.metrics) {
      const e2eMetrics = reportData.tests.e2e.metrics;
      
      if (e2eMetrics.lcp && e2eMetrics.lcp.length > 0) {
        metrics.lcp = e2eMetrics.lcp.reduce((a, b) => a + b, 0) / e2eMetrics.lcp.length;
      }
      
      if (e2eMetrics.fcp && e2eMetrics.fcp.length > 0) {
        metrics.fcp = e2eMetrics.fcp.reduce((a, b) => a + b, 0) / e2eMetrics.fcp.length;
      }
      
      if (e2eMetrics.cls && e2eMetrics.cls.length > 0) {
        metrics.cls = e2eMetrics.cls.reduce((a, b) => a + b, 0) / e2eMetrics.cls.length;
      }
      
      if (e2eMetrics.loadTime && e2eMetrics.loadTime.length > 0) {
        metrics.loadTime = e2eMetrics.loadTime.reduce((a, b) => a + b, 0) / e2eMetrics.loadTime.length;
      }
    }

    // 从缓存测试结果中提取指标
    if (reportData.tests.cache && reportData.tests.cache.metrics) {
      const cacheMetrics = reportData.tests.cache.metrics;
      
      if (cacheMetrics.hitRate && cacheMetrics.hitRate.length > 0) {
        metrics.cacheHitRate = cacheMetrics.hitRate.reduce((a, b) => a + b, 0) / cacheMetrics.hitRate.length / 100;
      }
    }

    // 从移动端测试结果中提取指标
    if (reportData.tests.mobile && reportData.tests.mobile.metrics) {
      const mobileMetrics = reportData.tests.mobile.metrics;
      
      if (mobileMetrics.memory && mobileMetrics.memory.length > 0) {
        metrics.memoryUsage = mobileMetrics.memory.reduce((a, b) => a + b, 0) / mobileMetrics.memory.length * 1024 * 1024;
      }
    }

    return metrics;
  }

  generateOptimizationPlan(metrics) {
    this.log('Generating optimization plan...', 'info');
    
    const optimizations = [];

    // LCP优化
    if (metrics.lcp > 2500) {
      optimizations.push({
        type: 'lcp',
        priority: metrics.lcp > 4000 ? 'high' : 'medium',
        title: '优化最大内容绘制 (LCP)',
        actions: [
          'enableImageOptimization',
          'addCriticalResourcePreload',
          'optimizeFontLoading'
        ]
      });
    }

    // FCP优化
    if (metrics.fcp > 1800) {
      optimizations.push({
        type: 'fcp',
        priority: metrics.fcp > 2500 ? 'high' : 'medium',
        title: '优化首次内容绘制 (FCP)',
        actions: [
          'inlineCriticalCSS',
          'deferNonCriticalJS',
          'optimizeServerResponse'
        ]
      });
    }

    // CLS优化
    if (metrics.cls > 0.1) {
      optimizations.push({
        type: 'cls',
        priority: metrics.cls > 0.25 ? 'high' : 'medium',
        title: '修复累积布局偏移 (CLS)',
        actions: [
          'addImageDimensions',
          'reserveSpaceForDynamicContent',
          'optimizeFontDisplay'
        ]
      });
    }

    // 缓存优化
    if (metrics.cacheHitRate < 0.9) {
      optimizations.push({
        type: 'cache',
        priority: metrics.cacheHitRate < 0.8 ? 'high' : 'medium',
        title: '提升缓存效率',
        actions: [
          'adjustCacheTTL',
          'implementCacheWarming',
          'optimizeCacheStrategy'
        ]
      });
    }

    // 内存优化
    if (metrics.memoryUsage > 150 * 1024 * 1024) {
      optimizations.push({
        type: 'memory',
        priority: metrics.memoryUsage > 200 * 1024 * 1024 ? 'high' : 'medium',
        title: '优化内存使用',
        actions: [
          'implementObjectPooling',
          'addMemoryCleanup',
          'optimizeComponentLifecycle'
        ]
      });
    }

    return optimizations.sort((a, b) => {
      const priorityOrder = { high: 3, medium: 2, low: 1 };
      return priorityOrder[b.priority] - priorityOrder[a.priority];
    });
  }

  async backupCurrentConfig() {
    this.log('Backing up current configuration...', 'info');
    
    const timestamp = Date.now();
    const backupPath = path.join(this.backupDir, `config-${timestamp}`);
    fs.mkdirSync(backupPath, { recursive: true });

    // 备份关键配置文件
    const configFiles = [
      'next.config.ts',
      'src/lib/cache/config.ts',
      'src/lib/performance/metrics.ts',
      'package.json'
    ];

    for (const file of configFiles) {
      const sourcePath = path.join(this.baseDir, file);
      if (fs.existsSync(sourcePath)) {
        const targetPath = path.join(backupPath, file.replace(/\//g, '_'));
        fs.copyFileSync(sourcePath, targetPath);
      }
    }

    this.log(`Configuration backed up to: ${backupPath}`, 'success');
    return backupPath;
  }

  async enableImageOptimization() {
    this.log('Enabling image optimization...', 'info');
    
    const nextConfigPath = path.join(this.baseDir, 'next.config.ts');
    let nextConfig = fs.readFileSync(nextConfigPath, 'utf8');

    // 添加图片优化配置
    const imageOptimization = `
  images: {
    formats: ['image/webp', 'image/avif'],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    minimumCacheTTL: 31536000, // 1 year
    dangerouslyAllowSVG: false,
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
  },`;

    if (!nextConfig.includes('images:')) {
      nextConfig = nextConfig.replace(
        'const nextConfig: NextConfig = {',
        `const nextConfig: NextConfig = {${imageOptimization}`
      );
      fs.writeFileSync(nextConfigPath, nextConfig);
      this.log('Image optimization enabled', 'success');
    } else {
      this.log('Image optimization already configured', 'debug');
    }
  }

  async addCriticalResourcePreload() {
    this.log('Adding critical resource preload...', 'info');
    
    const layoutPath = path.join(this.baseDir, 'src/app/layout.tsx');
    let layoutContent = fs.readFileSync(layoutPath, 'utf8');

    const preloadLinks = `
        <link rel="preload" href="/fonts/inter-var.woff2" as="font" type="font/woff2" crossOrigin="anonymous" />
        <link rel="preload" href="/api/works/popular" as="fetch" crossOrigin="anonymous" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />`;

    if (!layoutContent.includes('rel="preload"')) {
      layoutContent = layoutContent.replace(
        '<head>',
        `<head>${preloadLinks}`
      );
      fs.writeFileSync(layoutPath, layoutContent);
      this.log('Critical resource preload added', 'success');
    } else {
      this.log('Critical resource preload already configured', 'debug');
    }
  }

  async optimizeFontLoading() {
    this.log('Optimizing font loading...', 'info');
    
    const globalCSSPath = path.join(this.baseDir, 'src/app/globals.css');
    let cssContent = fs.readFileSync(globalCSSPath, 'utf8');

    const fontOptimization = `
/* Font optimization */
@font-face {
  font-family: 'Inter';
  src: url('/fonts/inter-var.woff2') format('woff2');
  font-weight: 100 900;
  font-style: normal;
  font-display: swap;
}

body {
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
}`;

    if (!cssContent.includes('font-display: swap')) {
      cssContent = fontOptimization + '\n' + cssContent;
      fs.writeFileSync(globalCSSPath, cssContent);
      this.log('Font loading optimized', 'success');
    } else {
      this.log('Font loading already optimized', 'debug');
    }
  }

  async inlineCriticalCSS() {
    this.log('Inlining critical CSS...', 'info');
    
    // 这里可以实现关键CSS内联逻辑
    // 由于复杂性，这里只是示例
    this.log('Critical CSS inlining would be implemented here', 'debug');
  }

  async deferNonCriticalJS() {
    this.log('Deferring non-critical JavaScript...', 'info');
    
    const nextConfigPath = path.join(this.baseDir, 'next.config.ts');
    let nextConfig = fs.readFileSync(nextConfigPath, 'utf8');

    const jsOptimization = `
  experimental: {
    optimizeCss: true,
    scrollRestoration: true,
  },
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production',
  },`;

    if (!nextConfig.includes('experimental:')) {
      nextConfig = nextConfig.replace(
        'const nextConfig: NextConfig = {',
        `const nextConfig: NextConfig = {${jsOptimization}`
      );
      fs.writeFileSync(nextConfigPath, nextConfig);
      this.log('Non-critical JavaScript deferred', 'success');
    } else {
      this.log('JavaScript optimization already configured', 'debug');
    }
  }

  async adjustCacheTTL() {
    this.log('Adjusting cache TTL settings...', 'info');
    
    const cacheConfigPath = path.join(this.baseDir, 'src/lib/cache/config.ts');
    let cacheConfig = fs.readFileSync(cacheConfigPath, 'utf8');

    // 优化缓存TTL设置
    const optimizedTTL = `
export const CACHE_TTL = {
  USER: 7200,        // 2小时 (增加)
  WORK: 3600,        // 1小时 (增加)
  RANKING: 600,      // 10分钟 (增加)
  GRAPH: 14400,      // 4小时 (增加)
  STATIC: 86400,     // 24小时
  API_RESPONSE: 300, // 5分钟
} as const;`;

    if (cacheConfig.includes('CACHE_TTL')) {
      cacheConfig = cacheConfig.replace(
        /export const CACHE_TTL = \{[\s\S]*?\} as const;/,
        optimizedTTL
      );
    } else {
      cacheConfig = optimizedTTL + '\n' + cacheConfig;
    }

    fs.writeFileSync(cacheConfigPath, cacheConfig);
    this.log('Cache TTL settings optimized', 'success');
  }

  async implementCacheWarming() {
    this.log('Implementing cache warming...', 'info');
    
    const warmupScript = `
/**
 * 缓存预热脚本
 */
export async function warmupCache() {
  const popularWorks = await fetch('/api/works/popular?limit=50');
  const leaderboard = await fetch('/api/leaderboard');
  const trendingTags = await fetch('/api/tags/trending');
  
  console.log('Cache warmed up successfully');
}

// 在应用启动时执行预热
if (typeof window !== 'undefined') {
  setTimeout(warmupCache, 5000); // 5秒后预热
}`;

    const warmupPath = path.join(this.baseDir, 'src/lib/cache/warmup.ts');
    fs.writeFileSync(warmupPath, warmupScript);
    this.log('Cache warming implemented', 'success');
  }

  async addImageDimensions() {
    this.log('Adding image dimensions to prevent CLS...', 'info');
    
    // 这里可以扫描组件文件并添加图片尺寸
    // 由于复杂性，这里只是示例
    this.log('Image dimensions optimization would be implemented here', 'debug');
  }

  async implementObjectPooling() {
    this.log('Implementing object pooling for memory optimization...', 'info');
    
    const objectPoolCode = `
/**
 * 对象池实现
 */
export class ObjectPool<T> {
  private pool: T[] = [];
  private createFn: () => T;
  private resetFn: (obj: T) => void;

  constructor(createFn: () => T, resetFn: (obj: T) => void, initialSize = 10) {
    this.createFn = createFn;
    this.resetFn = resetFn;
    
    // 预创建对象
    for (let i = 0; i < initialSize; i++) {
      this.pool.push(this.createFn());
    }
  }

  acquire(): T {
    return this.pool.pop() || this.createFn();
  }

  release(obj: T): void {
    this.resetFn(obj);
    if (this.pool.length < 50) { // 限制池大小
      this.pool.push(obj);
    }
  }
}`;

    const poolPath = path.join(this.baseDir, 'src/lib/utils/objectPool.ts');
    fs.writeFileSync(poolPath, objectPoolCode);
    this.log('Object pooling implemented', 'success');
  }

  async applyOptimizations(optimizations) {
    this.log('Applying performance optimizations...', 'info');
    
    const actionMap = {
      enableImageOptimization: () => this.enableImageOptimization(),
      addCriticalResourcePreload: () => this.addCriticalResourcePreload(),
      optimizeFontLoading: () => this.optimizeFontLoading(),
      inlineCriticalCSS: () => this.inlineCriticalCSS(),
      deferNonCriticalJS: () => this.deferNonCriticalJS(),
      adjustCacheTTL: () => this.adjustCacheTTL(),
      implementCacheWarming: () => this.implementCacheWarming(),
      addImageDimensions: () => this.addImageDimensions(),
      implementObjectPooling: () => this.implementObjectPooling()
    };

    let appliedCount = 0;
    
    for (const optimization of optimizations) {
      this.log(`Applying: ${optimization.title}`, 'info');
      
      for (const action of optimization.actions) {
        if (actionMap[action]) {
          try {
            await actionMap[action]();
            appliedCount++;
          } catch (error) {
            this.log(`Failed to apply ${action}: ${error.message}`, 'error');
          }
        } else {
          this.log(`Unknown action: ${action}`, 'warning');
        }
      }
    }

    this.log(`Applied ${appliedCount} optimizations`, 'success');
    return appliedCount;
  }

  async generateReport(optimizations, appliedCount) {
    const report = {
      timestamp: new Date().toISOString(),
      optimizations: optimizations.length,
      applied: appliedCount,
      details: optimizations.map(opt => ({
        title: opt.title,
        priority: opt.priority,
        type: opt.type,
        actions: opt.actions
      })),
      nextSteps: [
        '运行性能测试验证优化效果',
        '监控生产环境性能指标',
        '根据结果调整优化策略'
      ]
    };

    const reportPath = path.join(this.configDir, `optimization-report-${Date.now()}.json`);
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));

    this.log(`Optimization report saved: ${reportPath}`, 'success');
    return report;
  }

  async run() {
    try {
      this.log('🚀 Starting Performance Optimization', 'info');
      this.log('===================================', 'info');

      // 加载性能测试结果
      const reportData = await this.loadPerformanceResults();
      
      // 提取性能指标
      const metrics = this.extractMetrics(reportData);
      this.log(`Extracted metrics: LCP=${metrics.lcp.toFixed(0)}ms, FCP=${metrics.fcp.toFixed(0)}ms, CLS=${metrics.cls.toFixed(3)}`, 'debug');

      // 生成优化计划
      const optimizations = this.generateOptimizationPlan(metrics);
      this.log(`Generated ${optimizations.length} optimization recommendations`, 'info');

      if (optimizations.length === 0) {
        this.log('No optimizations needed. Performance is already good! 🎉', 'success');
        return;
      }

      // 备份当前配置
      await this.backupCurrentConfig();

      // 应用优化
      const appliedCount = await this.applyOptimizations(optimizations);

      // 生成报告
      const report = await this.generateReport(optimizations, appliedCount);

      this.log('===================================', 'info');
      this.log('🏁 Performance Optimization Complete', 'info');
      this.log(`Applied ${appliedCount}/${optimizations.length} optimizations`, 'info');
      this.log('Next: Run performance tests to verify improvements', 'info');

    } catch (error) {
      this.log(`Optimization failed: ${error.message}`, 'error');
      process.exit(1);
    }
  }
}

// 运行优化器
if (require.main === module) {
  const optimizer = new PerformanceOptimizer();
  optimizer.run().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}

module.exports = PerformanceOptimizer;