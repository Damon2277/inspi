/**
 * Style File Monitor
 * 样式文件监控器
 */

const chokidar = require('chokidar');
const path = require('path');
const fs = require('fs').promises;

class StyleMonitor {
  constructor(config) {
    this.config = config;
    this.watcher = null;
    this.isWatching = false;
    this.changeQueue = [];
    this.debounceTimer = null;
    this.snapshotManager = null; // Will be injected
  }

  /**
   * 初始化监控器
   */
  async initialize() {
    console.log('👀 Initializing style monitor...');
    
    // 创建监控配置文件
    const configPath = path.join(this.config.projectRoot || process.cwd(), '.kiro/style-recovery/monitor-config.json');
    
    try {
      await fs.access(configPath);
    } catch {
      const defaultConfig = {
        autoSnapshot: true,
        debounceDelay: 2000,
        maxChangesBeforeSnapshot: 5,
        excludePatterns: [
          '**/*.test.*',
          '**/*.spec.*',
          '**/node_modules/**',
          '**/.git/**',
          '**/.next/**'
        ]
      };
      
      await fs.mkdir(path.dirname(configPath), { recursive: true });
      await fs.writeFile(configPath, JSON.stringify(defaultConfig, null, 2));
    }
    
    console.log('✅ Style monitor initialized');
  }

  /**
   * 设置快照管理器引用
   */
  setSnapshotManager(snapshotManager) {
    this.snapshotManager = snapshotManager;
  }

  /**
   * 开始监控文件变化
   */
  startWatching() {
    if (this.isWatching) {
      console.log('👀 Style monitor is already watching');
      return;
    }

    console.log('🚀 Starting style file monitoring...');
    
    this.watcher = chokidar.watch(this.config.watchPatterns, {
      cwd: this.config.projectRoot || process.cwd(),
      ignored: [
        '**/node_modules/**',
        '**/.git/**',
        '**/.next/**',
        '**/.kiro/**',
        '**/*.test.*',
        '**/*.spec.*'
      ],
      persistent: true,
      ignoreInitial: true
    });

    this.watcher
      .on('change', (filePath) => this.handleFileChange('change', filePath))
      .on('add', (filePath) => this.handleFileChange('add', filePath))
      .on('unlink', (filePath) => this.handleFileChange('delete', filePath))
      .on('error', (error) => {
        console.error('❌ Style monitor error:', error);
      })
      .on('ready', () => {
        this.isWatching = true;
        console.log('✅ Style monitor is now watching for changes');
      });

    return this.watcher;
  }

  /**
   * 停止监控
   */
  async stopWatching() {
    if (!this.isWatching) {
      return;
    }

    console.log('⏹️ Stopping style monitor...');
    
    if (this.watcher) {
      await this.watcher.close();
      this.watcher = null;
    }
    
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
      this.debounceTimer = null;
    }
    
    this.isWatching = false;
    console.log('✅ Style monitor stopped');
  }

  /**
   * 处理文件变化
   */
  handleFileChange(eventType, filePath) {
    const change = {
      type: eventType,
      path: filePath,
      timestamp: new Date().toISOString()
    };

    console.log(`📝 Style file ${eventType}: ${filePath}`);
    
    this.changeQueue.push(change);
    
    // 防抖处理，避免频繁创建快照
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
    }
    
    this.debounceTimer = setTimeout(() => {
      this.processChangeQueue();
    }, 2000); // 2秒防抖
  }

  /**
   * 处理变化队列
   */
  async processChangeQueue() {
    if (this.changeQueue.length === 0) {
      return;
    }

    const changes = [...this.changeQueue];
    this.changeQueue = [];

    console.log(`🔄 Processing ${changes.length} style changes...`);

    try {
      // 分析变化影响
      const impact = this.analyzeChangeImpact(changes);
      
      // 根据影响程度决定是否创建快照
      if (this.shouldCreateSnapshot(impact)) {
        await this.createAutoSnapshot(changes, impact);
      }
      
      // 记录变化历史
      await this.logChanges(changes, impact);
      
    } catch (error) {
      console.error('❌ Error processing style changes:', error);
    }
  }

  /**
   * 分析变化影响
   */
  analyzeChangeImpact(changes) {
    const impact = {
      level: 'low',
      affectedFiles: new Set(),
      changeTypes: new Set(),
      criticalFiles: [],
      riskScore: 0
    };

    for (const change of changes) {
      impact.affectedFiles.add(change.path);
      impact.changeTypes.add(change.type);
      
      // 检查是否为关键文件
      if (this.isCriticalFile(change.path)) {
        impact.criticalFiles.push(change.path);
        impact.riskScore += 3;
      } else {
        impact.riskScore += 1;
      }
    }

    // 确定影响级别
    if (impact.criticalFiles.length > 0 || impact.riskScore > 5) {
      impact.level = 'high';
    } else if (impact.riskScore > 2) {
      impact.level = 'medium';
    }

    return impact;
  }

  /**
   * 检查是否为关键文件
   */
  isCriticalFile(filePath) {
    const criticalPatterns = [
      'globals.css',
      'layout.tsx',
      'page.tsx',
      'app.tsx',
      'index.css'
    ];
    
    return criticalPatterns.some(pattern => filePath.includes(pattern));
  }

  /**
   * 判断是否应该创建快照
   */
  shouldCreateSnapshot(impact) {
    // 高影响变化总是创建快照
    if (impact.level === 'high') {
      return true;
    }
    
    // 中等影响且影响多个文件时创建快照
    if (impact.level === 'medium' && impact.affectedFiles.size > 2) {
      return true;
    }
    
    // 删除操作总是创建快照
    if (impact.changeTypes.has('delete')) {
      return true;
    }
    
    return false;
  }

  /**
   * 创建自动快照
   */
  async createAutoSnapshot(changes, impact) {
    if (!this.snapshotManager) {
      console.warn('⚠️ Snapshot manager not available, skipping auto snapshot');
      return;
    }

    const description = this.generateSnapshotDescription(changes, impact);
    
    try {
      const snapshot = await this.snapshotManager.createSnapshot({
        name: `auto-${Date.now()}`,
        description,
        reason: 'auto-monitor',
        tags: ['auto', `impact-${impact.level}`],
        metadata: {
          changes: changes.length,
          affectedFiles: Array.from(impact.affectedFiles),
          riskScore: impact.riskScore
        }
      });
      
      console.log(`📸 Auto-created snapshot ${snapshot.id} due to ${impact.level} impact changes`);
      
    } catch (error) {
      console.error('❌ Failed to create auto snapshot:', error);
    }
  }

  /**
   * 生成快照描述
   */
  generateSnapshotDescription(changes, impact) {
    const fileCount = impact.affectedFiles.size;
    const changeTypes = Array.from(impact.changeTypes).join(', ');
    
    let description = `Auto snapshot: ${fileCount} files affected (${changeTypes})`;
    
    if (impact.criticalFiles.length > 0) {
      description += ` - Critical files: ${impact.criticalFiles.join(', ')}`;
    }
    
    return description;
  }

  /**
   * 记录变化历史
   */
  async logChanges(changes, impact) {
    const logPath = path.join(
      this.config.projectRoot || process.cwd(),
      '.kiro/style-recovery/change-log.json'
    );
    
    const logEntry = {
      timestamp: new Date().toISOString(),
      changes,
      impact,
      processed: true
    };
    
    try {
      let log = [];
      try {
        const content = await fs.readFile(logPath, 'utf8');
        log = JSON.parse(content);
      } catch {
        // File doesn't exist, start with empty log
      }
      
      log.unshift(logEntry);
      
      // Keep only last 1000 entries
      if (log.length > 1000) {
        log = log.slice(0, 1000);
      }
      
      await fs.mkdir(path.dirname(logPath), { recursive: true });
      await fs.writeFile(logPath, JSON.stringify(log, null, 2));
      
    } catch (error) {
      console.error('❌ Failed to log changes:', error);
    }
  }

  /**
   * 获取监控状态
   */
  getStatus() {
    return {
      isWatching: this.isWatching,
      queuedChanges: this.changeQueue.length,
      watchedPatterns: this.config.watchPatterns
    };
  }

  /**
   * 获取变化历史
   */
  async getChangeHistory(limit = 50) {
    const logPath = path.join(
      this.config.projectRoot || process.cwd(),
      '.kiro/style-recovery/change-log.json'
    );
    
    try {
      const content = await fs.readFile(logPath, 'utf8');
      const log = JSON.parse(content);
      return log.slice(0, limit);
    } catch {
      return [];
    }
  }
}

module.exports = StyleMonitor;