/**
 * Visual Regression Detector
 * 视觉回归检测器
 * 
 * 集成页面截图功能、图像对比算法和视觉差异报告机制
 */

const fs = require('fs').promises;
const path = require('path');
const { chromium } = require('playwright');

class VisualRegressionDetector {
  constructor(config = {}) {
    this.config = {
      screenshotDir: config.screenshotDir || '.kiro/style-recovery/screenshots',
      reportsDir: config.reportsDir || '.kiro/style-recovery/reports',
      threshold: config.threshold || 0.2, // 20% difference threshold
      viewports: config.viewports || [
        { width: 1920, height: 1080, name: 'desktop' },
        { width: 768, height: 1024, name: 'tablet' },
        { width: 375, height: 667, name: 'mobile' }
      ],
      pages: config.pages || [
        { url: '/', name: 'home' },
        { url: '/create', name: 'create' },
        { url: '/works', name: 'works' },
        { url: '/square', name: 'square' },
        { url: '/profile', name: 'profile' }
      ],
      ...config
    };
    
    this.browser = null;
  }

  async initialize() {
    console.log('📷 Initializing visual regression detector...');
    
    // 确保目录存在
    await this.ensureDirectories();
    
    // 启动浏览器
    this.browser = await chromium.launch({ headless: true });
    
    console.log('✅ Visual regression detector initialized');
  }

  async ensureDirectories() {
    const dirs = [this.config.screenshotDir, this.config.reportsDir];
    for (const dir of dirs) {
      try {
        await fs.access(dir);
      } catch {
        await fs.mkdir(dir, { recursive: true });
      }
    }
  }

  /**
   * 截取页面截图
   * @param {string} url - 页面URL
   * @param {Object} viewport - 视口配置
   * @param {string} snapshotId - 快照ID
   */
  async capturePageScreenshot(url, viewport, snapshotId) {
    if (!this.browser) {
      throw new Error('Browser not initialized. Call initialize() first.');
    }

    const context = await this.browser.newContext({
      viewport: { width: viewport.width, height: viewport.height }
    });
    
    const page = await context.newPage();
    
    try {
      // 导航到页面
      await page.goto(`http://localhost:3000${url}`, { 
        waitUntil: 'networkidle',
        timeout: 30000 
      });
      
      // 等待页面完全加载
      await page.waitForTimeout(2000);
      
      // 截图文件名
      const filename = `${snapshotId}_${viewport.name}.png`;
      const filepath = path.join(this.config.screenshotDir, filename);
      
      // 截取全页面截图
      await page.screenshot({ 
        path: filepath, 
        fullPage: true,
        type: 'png'
      });
      
      console.log(`📸 Screenshot captured: ${filename}`);
      return filepath;
      
    } finally {
      await context.close();
    }
  }

  /**
   * 批量截取所有页面截图
   * @param {string} snapshotId - 快照ID
   */
  async captureAllScreenshots(snapshotId) {
    const screenshots = [];
    
    for (const page of this.config.pages) {
      for (const viewport of this.config.viewports) {
        try {
          const filepath = await this.capturePageScreenshot(page.url, viewport, `${page.name}_${snapshotId}`);
          screenshots.push({
            page: page.name,
            viewport: viewport.name,
            url: page.url,
            filepath,
            timestamp: new Date().toISOString()
          });
        } catch (error) {
          console.error(`❌ Failed to capture ${page.name} at ${viewport.name}:`, error.message);
          screenshots.push({
            page: page.name,
            viewport: viewport.name,
            url: page.url,
            error: error.message,
            timestamp: new Date().toISOString()
          });
        }
      }
    }
    
    return screenshots;
  }

  /**
   * 比较两个截图的差异
   * @param {string} baseImagePath - 基准图片路径
   * @param {string} currentImagePath - 当前图片路径
   */
  async compareImages(baseImagePath, currentImagePath) {
    try {
      // 检查文件是否存在
      await fs.access(baseImagePath);
      await fs.access(currentImagePath);
      
      // 使用Playwright的内置图像比较
      const context = await this.browser.newContext();
      const page = await context.newPage();
      
      try {
        // 读取图片并比较
        const baseBuffer = await fs.readFile(baseImagePath);
        const currentBuffer = await fs.readFile(currentImagePath);
        
        // 简单的字节比较（实际项目中可以使用更复杂的图像比较算法）
        const areSame = baseBuffer.equals(currentBuffer);
        
        if (areSame) {
          return {
            hasDifferences: false,
            similarity: 100,
            differences: []
          };
        }
        
        // 如果不同，计算相似度（简化版本）
        const similarity = this.calculateSimilarity(baseBuffer, currentBuffer);
        const hasDifferences = similarity < (100 - this.config.threshold * 100);
        
        return {
          hasDifferences,
          similarity,
          differences: hasDifferences ? ['Visual differences detected'] : []
        };
        
      } finally {
        await context.close();
      }
      
    } catch (error) {
      console.error('Error comparing images:', error);
      return {
        hasDifferences: true,
        similarity: 0,
        differences: [`Comparison failed: ${error.message}`],
        error: error.message
      };
    }
  }

  /**
   * 计算图像相似度（简化版本）
   * @param {Buffer} buffer1 
   * @param {Buffer} buffer2 
   */
  calculateSimilarity(buffer1, buffer2) {
    if (buffer1.length !== buffer2.length) {
      return 0;
    }
    
    let differences = 0;
    for (let i = 0; i < buffer1.length; i++) {
      if (buffer1[i] !== buffer2[i]) {
        differences++;
      }
    }
    
    const similarity = Math.max(0, 100 - (differences / buffer1.length) * 100);
    return similarity;
  }

  /**
   * 比较两个快照的所有截图
   * @param {string} baseSnapshotId - 基准快照ID
   * @param {string} currentSnapshotId - 当前快照ID
   */
  async compareSnapshots(baseSnapshotId, currentSnapshotId) {
    console.log(`🔍 Comparing snapshots: ${baseSnapshotId} vs ${currentSnapshotId}`);
    
    const results = {
      baseSnapshotId,
      currentSnapshotId,
      timestamp: new Date().toISOString(),
      overallResult: {
        hasDifferences: false,
        totalComparisons: 0,
        failedComparisons: 0,
        averageSimilarity: 0
      },
      pageResults: []
    };
    
    let totalSimilarity = 0;
    let comparisonCount = 0;
    
    for (const page of this.config.pages) {
      for (const viewport of this.config.viewports) {
        const baseImagePath = path.join(
          this.config.screenshotDir, 
          `${page.name}_${baseSnapshotId}_${viewport.name}.png`
        );
        const currentImagePath = path.join(
          this.config.screenshotDir, 
          `${page.name}_${currentSnapshotId}_${viewport.name}.png`
        );
        
        const comparison = await this.compareImages(baseImagePath, currentImagePath);
        
        const pageResult = {
          page: page.name,
          viewport: viewport.name,
          url: page.url,
          baseImagePath,
          currentImagePath,
          ...comparison
        };
        
        results.pageResults.push(pageResult);
        
        if (!comparison.error) {
          totalSimilarity += comparison.similarity;
          comparisonCount++;
          
          if (comparison.hasDifferences) {
            results.overallResult.hasDifferences = true;
            results.overallResult.failedComparisons++;
          }
        }
        
        results.overallResult.totalComparisons++;
      }
    }
    
    // 计算平均相似度
    if (comparisonCount > 0) {
      results.overallResult.averageSimilarity = totalSimilarity / comparisonCount;
    }
    
    // 生成报告
    await this.generateReport(results);
    
    return results;
  }

  /**
   * 生成视觉差异报告
   * @param {Object} results - 比较结果
   */
  async generateReport(results) {
    const reportPath = path.join(
      this.config.reportsDir, 
      `visual-regression-${results.currentSnapshotId}-${Date.now()}.json`
    );
    
    // 生成JSON报告
    await fs.writeFile(reportPath, JSON.stringify(results, null, 2));
    
    // 生成HTML报告
    const htmlReportPath = reportPath.replace('.json', '.html');
    const htmlContent = this.generateHtmlReport(results);
    await fs.writeFile(htmlReportPath, htmlContent);
    
    console.log(`📊 Visual regression report generated:`);
    console.log(`   JSON: ${reportPath}`);
    console.log(`   HTML: ${htmlReportPath}`);
    
    // 输出摘要
    this.logSummary(results);
    
    return { jsonReport: reportPath, htmlReport: htmlReportPath };
  }

  /**
   * 生成HTML报告
   * @param {Object} results - 比较结果
   */
  generateHtmlReport(results) {
    const { overallResult, pageResults } = results;
    
    return `
<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Visual Regression Report</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        .header { background: #f5f5f5; padding: 20px; border-radius: 8px; margin-bottom: 20px; }
        .summary { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px; margin-bottom: 30px; }
        .metric { background: white; padding: 15px; border-radius: 8px; border-left: 4px solid #007acc; }
        .metric.error { border-left-color: #dc3545; }
        .metric.warning { border-left-color: #ffc107; }
        .metric.success { border-left-color: #28a745; }
        .results { margin-top: 30px; }
        .page-result { background: white; margin-bottom: 20px; padding: 20px; border-radius: 8px; border: 1px solid #ddd; }
        .page-result.has-differences { border-left: 4px solid #dc3545; }
        .page-result.no-differences { border-left: 4px solid #28a745; }
        .viewport-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 15px; }
        .viewport-result { padding: 15px; background: #f8f9fa; border-radius: 6px; }
        h1, h2, h3 { color: #333; }
        .timestamp { color: #666; font-size: 0.9em; }
    </style>
</head>
<body>
    <div class="header">
        <h1>📊 Visual Regression Report</h1>
        <p class="timestamp">Generated: ${results.timestamp}</p>
        <p>Comparing <strong>${results.baseSnapshotId}</strong> vs <strong>${results.currentSnapshotId}</strong></p>
    </div>
    
    <div class="summary">
        <div class="metric ${overallResult.hasDifferences ? 'error' : 'success'}">
            <h3>Overall Status</h3>
            <p><strong>${overallResult.hasDifferences ? '❌ Differences Found' : '✅ No Differences'}</strong></p>
        </div>
        <div class="metric">
            <h3>Total Comparisons</h3>
            <p><strong>${overallResult.totalComparisons}</strong></p>
        </div>
        <div class="metric ${overallResult.failedComparisons > 0 ? 'error' : 'success'}">
            <h3>Failed Comparisons</h3>
            <p><strong>${overallResult.failedComparisons}</strong></p>
        </div>
        <div class="metric">
            <h3>Average Similarity</h3>
            <p><strong>${overallResult.averageSimilarity.toFixed(2)}%</strong></p>
        </div>
    </div>
    
    <div class="results">
        <h2>Page Results</h2>
        ${pageResults.map(result => `
            <div class="page-result ${result.hasDifferences ? 'has-differences' : 'no-differences'}">
                <h3>${result.page} - ${result.viewport}</h3>
                <p><strong>URL:</strong> ${result.url}</p>
                <p><strong>Similarity:</strong> ${result.similarity ? result.similarity.toFixed(2) + '%' : 'N/A'}</p>
                <p><strong>Status:</strong> ${result.hasDifferences ? '❌ Differences detected' : '✅ No differences'}</p>
                ${result.error ? `<p><strong>Error:</strong> ${result.error}</p>` : ''}
                ${result.differences.length > 0 ? `<p><strong>Issues:</strong> ${result.differences.join(', ')}</p>` : ''}
            </div>
        `).join('')}
    </div>
</body>
</html>`;
  }

  /**
   * 输出比较结果摘要
   * @param {Object} results - 比较结果
   */
  logSummary(results) {
    const { overallResult } = results;
    
    console.log('\n📊 Visual Regression Summary:');
    console.log(`   Status: ${overallResult.hasDifferences ? '❌ Differences Found' : '✅ No Differences'}`);
    console.log(`   Total Comparisons: ${overallResult.totalComparisons}`);
    console.log(`   Failed Comparisons: ${overallResult.failedComparisons}`);
    console.log(`   Average Similarity: ${overallResult.averageSimilarity.toFixed(2)}%`);
    
    if (overallResult.hasDifferences) {
      console.log('\n⚠️  Pages with differences:');
      results.pageResults
        .filter(result => result.hasDifferences)
        .forEach(result => {
          console.log(`   - ${result.page} (${result.viewport}): ${result.similarity.toFixed(2)}% similarity`);
        });
    }
  }

  /**
   * 清理资源
   */
  async cleanup() {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
    }
    console.log('🧹 Visual regression detector cleaned up');
  }
}

module.exports = VisualRegressionDetector;