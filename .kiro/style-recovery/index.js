/**
 * Style Recovery System - Main Entry Point
 * 样式恢复系统主入口
 */

const StyleSnapshotManager = require('./snapshot-manager');
const StyleMonitor = require('./style-monitor');
const VisualRegressionDetector = require('./visual-regression');
const StyleRollbackManager = require('./rollback-manager');

class StyleRecoverySystem {
  constructor(options = {}) {
    this.projectRoot = options.projectRoot || process.cwd();
    this.config = {
      snapshotDir: '.kiro/style-recovery/snapshots',
      screenshotDir: '.kiro/style-recovery/screenshots',
      watchPatterns: [
        'src/**/*.css',
        'src/**/*.scss',
        'src/**/*.tsx',
        'src/**/*.jsx',
        'src/app/globals.css',
        'src/styles/**/*'
      ],
      ...options
    };

    this.snapshotManager = new StyleSnapshotManager(this.config);
    this.styleMonitor = new StyleMonitor(this.config);
    this.visualDetector = new VisualRegressionDetector(this.config);
    this.rollbackManager = new StyleRollbackManager(this.config);
    
    // Set up cross-references
    this.styleMonitor.setSnapshotManager(this.snapshotManager);
  }

  /**
   * 初始化样式恢复系统
   */
  async initialize() {
    console.log('🎨 Initializing Style Recovery System...');
    
    await this.snapshotManager.initialize();
    await this.styleMonitor.initialize();
    await this.visualDetector.initialize();
    await this.rollbackManager.initialize();
    
    console.log('✅ Style Recovery System initialized successfully');
    return this;
  }

  /**
   * 创建样式快照
   */
  async createSnapshot(options = {}) {
    const snapshot = await this.snapshotManager.createSnapshot({
      name: options.name || `auto-${Date.now()}`,
      description: options.description || 'Automatic snapshot',
      includeScreenshots: options.includeScreenshots !== false,
      ...options
    });

    console.log(`📸 Created style snapshot: ${snapshot.id}`);
    return snapshot;
  }

  /**
   * 开始监控样式文件变化
   */
  startMonitoring() {
    return this.styleMonitor.startWatching();
  }

  /**
   * 停止监控
   */
  stopMonitoring() {
    return this.styleMonitor.stopWatching();
  }

  /**
   * 执行视觉回归检测
   */
  async runVisualRegression(baseSnapshotId, currentSnapshotId) {
    return this.visualDetector.compareSnapshots(baseSnapshotId, currentSnapshotId);
  }

  /**
   * 回滚到指定快照
   */
  async rollbackToSnapshot(snapshotId, options = {}) {
    return this.rollbackManager.rollback(snapshotId, options);
  }

  /**
   * 获取回滚历史
   */
  async getRollbackHistory(limit = 50) {
    return this.rollbackManager.getRollbackHistory(limit);
  }

  /**
   * 获取特定回滚操作详情
   */
  async getRollbackOperation(operationId) {
    return this.rollbackManager.getRollbackOperation(operationId);
  }

  /**
   * 清理旧的回滚备份
   */
  async cleanupOldBackups(maxAge) {
    return this.rollbackManager.cleanupOldBackups(maxAge);
  }

  /**
   * 获取所有快照列表
   */
  async listSnapshots() {
    return this.snapshotManager.listSnapshots();
  }

  /**
   * 获取系统状态
   */
  async getStatus() {
    const snapshots = await this.listSnapshots();
    const monitorStatus = this.styleMonitor.getStatus();
    
    return {
      isMonitoring: monitorStatus.isWatching,
      totalSnapshots: snapshots.length,
      latestSnapshot: snapshots[0] || null,
      systemHealth: 'healthy' // TODO: Implement health check
    };
  }
}

module.exports = StyleRecoverySystem;