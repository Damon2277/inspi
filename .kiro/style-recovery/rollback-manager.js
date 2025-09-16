/**
 * Style Rollback Manager
 * 样式回滚管理器
 */

const fs = require('fs').promises;
const path = require('path');
const crypto = require('crypto');

class StyleRollbackManager {
  constructor(config) {
    this.config = config;
    this.projectRoot = config.projectRoot || process.cwd();
    this.auditLogFile = path.join(this.projectRoot, '.kiro/style-recovery/rollback-audit.json');
    this.backupDir = path.join(this.projectRoot, '.kiro/style-recovery/rollback-backups');
  }

  /**
   * 初始化回滚管理器
   */
  async initialize() {
    try {
      // 确保审计日志目录存在
      await fs.mkdir(path.dirname(this.auditLogFile), { recursive: true });
      await fs.mkdir(this.backupDir, { recursive: true });
      
      // 初始化审计日志文件
      try {
        await fs.access(this.auditLogFile);
      } catch {
        await this.saveAuditLog({ operations: [] });
      }
      
      console.log('🔄 Rollback manager initialized');
    } catch (error) {
      console.error('Failed to initialize rollback manager:', error);
      throw error;
    }
  }

  /**
   * 执行样式回滚
   */
  async rollback(snapshotId, options = {}) {
    const operationId = this.generateOperationId();
    const timestamp = new Date().toISOString();
    
    console.log(`🔄 Starting rollback to snapshot: ${snapshotId}`);
    
    try {
      // 1. 验证快照存在
      const snapshot = await this.validateSnapshot(snapshotId);
      if (!snapshot) {
        throw new Error(`Snapshot ${snapshotId} not found`);
      }

      // 2. 分析回滚影响范围
      const impactAnalysis = await this.analyzeRollbackImpact(snapshot, options);
      
      // 3. 创建当前状态备份（用于回滚的回滚）
      const backupId = await this.createPreRollbackBackup(operationId);
      
      // 4. 执行文件回滚
      const rollbackResult = await this.executeFileRollback(snapshot, impactAnalysis, options);
      
      // 5. 验证回滚结果
      const verification = await this.verifyRollback(snapshot, rollbackResult);
      
      // 6. 记录审计日志
      const auditEntry = {
        operationId,
        type: 'rollback',
        timestamp,
        snapshotId,
        backupId,
        impactAnalysis,
        rollbackResult,
        verification,
        options,
        success: verification.success,
        duration: Date.now() - new Date(timestamp).getTime()
      };
      
      await this.logRollbackOperation(auditEntry);
      
      if (verification.success) {
        console.log(`✅ Rollback to ${snapshotId} completed successfully`);
        console.log(`📊 Files restored: ${rollbackResult.filesRestored}`);
        console.log(`⚠️  Warnings: ${verification.warnings.length}`);
      } else {
        console.error(`❌ Rollback verification failed`);
        // 自动回滚到备份状态
        await this.rollbackToBackup(backupId);
      }
      
      return {
        success: verification.success,
        operationId,
        snapshotId,
        backupId,
        filesRestored: rollbackResult.filesRestored,
        warnings: verification.warnings,
        impactAnalysis,
        message: verification.success ? 'Rollback completed successfully' : 'Rollback failed and was reverted'
      };
      
    } catch (error) {
      console.error(`❌ Rollback failed:`, error);
      
      // 记录失败的审计日志
      await this.logRollbackOperation({
        operationId,
        type: 'rollback',
        timestamp,
        snapshotId,
        success: false,
        error: error.message,
        duration: Date.now() - new Date(timestamp).getTime()
      });
      
      throw error;
    }
  }

  /**
   * 验证快照存在性
   */
  async validateSnapshot(snapshotId) {
    try {
      const snapshotPath = path.join(this.projectRoot, '.kiro/style-recovery/snapshots', snapshotId);
      await fs.access(snapshotPath);
      
      // 读取快照元数据
      const metadataFile = path.join(this.projectRoot, '.kiro/style-recovery/snapshots/metadata.json');
      const metadata = JSON.parse(await fs.readFile(metadataFile, 'utf8'));
      
      return metadata.snapshots.find(s => s.id === snapshotId);
    } catch (error) {
      return null;
    }
  }

  /**
   * 分析回滚影响范围
   */
  async analyzeRollbackImpact(snapshot, options = {}) {
    console.log('📊 Analyzing rollback impact...');
    
    const analysis = {
      totalFiles: Object.keys(snapshot.files).length,
      affectedFiles: [],
      riskLevel: 'low',
      estimatedImpact: {
        pages: [],
        components: [],
        globalStyles: false
      },
      warnings: []
    };

    // 分析每个文件的影响
    for (const [filePath, fileInfo] of Object.entries(snapshot.files)) {
      const currentFilePath = path.join(this.projectRoot, filePath);
      
      try {
        // 检查文件是否存在
        const currentExists = await fs.access(currentFilePath).then(() => true).catch(() => false);
        
        let changeType = 'restore';
        let currentHash = null;
        
        if (currentExists) {
          const currentContent = await fs.readFile(currentFilePath, 'utf8');
          currentHash = crypto.createHash('sha256').update(currentContent).digest('hex');
          
          if (currentHash === fileInfo.hash) {
            changeType = 'no-change';
          } else {
            changeType = 'modify';
          }
        } else {
          changeType = 'create';
        }

        const fileAnalysis = {
          path: filePath,
          changeType,
          currentHash,
          snapshotHash: fileInfo.hash,
          size: fileInfo.size,
          riskLevel: this.assessFileRisk(filePath, changeType)
        };

        analysis.affectedFiles.push(fileAnalysis);

        // 评估全局影响
        if (filePath.includes('globals.css') || filePath.includes('global')) {
          analysis.estimatedImpact.globalStyles = true;
          analysis.riskLevel = 'high';
        }

        // 识别可能受影响的页面和组件
        if (filePath.includes('page.tsx') || filePath.includes('layout.tsx')) {
          analysis.estimatedImpact.pages.push(filePath);
        }
        
        if (filePath.includes('components/')) {
          analysis.estimatedImpact.components.push(filePath);
        }

      } catch (error) {
        analysis.warnings.push(`Could not analyze file ${filePath}: ${error.message}`);
      }
    }

    // 计算整体风险级别
    const highRiskFiles = analysis.affectedFiles.filter(f => f.riskLevel === 'high').length;
    const mediumRiskFiles = analysis.affectedFiles.filter(f => f.riskLevel === 'medium').length;
    
    if (highRiskFiles > 0 || analysis.estimatedImpact.globalStyles) {
      analysis.riskLevel = 'high';
    } else if (mediumRiskFiles > 2) {
      analysis.riskLevel = 'medium';
    }

    // 添加风险警告
    if (analysis.riskLevel === 'high') {
      analysis.warnings.push('High-risk rollback: Global styles or critical files will be affected');
    }
    
    if (analysis.estimatedImpact.pages.length > 0) {
      analysis.warnings.push(`${analysis.estimatedImpact.pages.length} page(s) may be affected`);
    }

    console.log(`📊 Impact analysis complete: ${analysis.totalFiles} files, risk level: ${analysis.riskLevel}`);
    return analysis;
  }

  /**
   * 评估单个文件的风险级别
   */
  assessFileRisk(filePath, changeType) {
    // 全局样式文件 - 高风险
    if (filePath.includes('globals.css') || filePath.includes('global')) {
      return 'high';
    }
    
    // 布局文件 - 高风险
    if (filePath.includes('layout.tsx') || filePath.includes('layout.jsx')) {
      return 'high';
    }
    
    // 主页面文件 - 中等风险
    if (filePath.includes('page.tsx') || filePath.includes('page.jsx')) {
      return 'medium';
    }
    
    // 组件文件 - 中等风险
    if (filePath.includes('components/')) {
      return 'medium';
    }
    
    // 样式文件 - 中等风险
    if (filePath.endsWith('.css') || filePath.endsWith('.scss')) {
      return 'medium';
    }
    
    // 其他文件 - 低风险
    return 'low';
  }

  /**
   * 创建回滚前备份
   */
  async createPreRollbackBackup(operationId) {
    const backupId = `pre-rollback-${operationId}`;
    const backupPath = path.join(this.backupDir, backupId);
    
    console.log(`💾 Creating pre-rollback backup: ${backupId}`);
    
    try {
      await fs.mkdir(backupPath, { recursive: true });
      
      // 收集当前所有样式文件
      const { glob } = require('glob');
      const files = [];
      
      for (const pattern of this.config.watchPatterns) {
        const matches = await glob(pattern, { 
          cwd: this.projectRoot,
          ignore: ['node_modules/**', '.git/**', '.next/**']
        });
        
        for (const file of matches) {
          const fullPath = path.join(this.projectRoot, file);
          try {
            const content = await fs.readFile(fullPath, 'utf8');
            files.push({ path: file, content });
          } catch (error) {
            console.warn(`⚠️ Could not backup file ${file}:`, error.message);
          }
        }
      }
      
      // 保存备份文件
      for (const file of files) {
        const targetPath = path.join(backupPath, file.path);
        const targetDir = path.dirname(targetPath);
        
        await fs.mkdir(targetDir, { recursive: true });
        await fs.writeFile(targetPath, file.content, 'utf8');
      }
      
      // 保存备份元数据
      const backupMetadata = {
        id: backupId,
        operationId,
        timestamp: new Date().toISOString(),
        totalFiles: files.length,
        purpose: 'pre-rollback-backup'
      };
      
      await fs.writeFile(
        path.join(backupPath, 'backup-metadata.json'),
        JSON.stringify(backupMetadata, null, 2),
        'utf8'
      );
      
      console.log(`💾 Pre-rollback backup created: ${files.length} files`);
      return backupId;
      
    } catch (error) {
      console.error(`❌ Failed to create pre-rollback backup:`, error);
      throw error;
    }
  }

  /**
   * 执行文件回滚
   */
  async executeFileRollback(snapshot, impactAnalysis, options = {}) {
    console.log('🔄 Executing file rollback...');
    
    const result = {
      filesRestored: 0,
      filesSkipped: 0,
      errors: []
    };

    const snapshotPath = path.join(this.projectRoot, '.kiro/style-recovery/snapshots', snapshot.id);
    
    for (const fileAnalysis of impactAnalysis.affectedFiles) {
      if (fileAnalysis.changeType === 'no-change') {
        result.filesSkipped++;
        continue;
      }

      try {
        const sourceFile = path.join(snapshotPath, fileAnalysis.path);
        const targetFile = path.join(this.projectRoot, fileAnalysis.path);
        
        // 确保目标目录存在
        const targetDir = path.dirname(targetFile);
        await fs.mkdir(targetDir, { recursive: true });
        
        // 复制文件
        const content = await fs.readFile(sourceFile, 'utf8');
        await fs.writeFile(targetFile, content, 'utf8');
        
        result.filesRestored++;
        console.log(`✅ Restored: ${fileAnalysis.path}`);
        
      } catch (error) {
        result.errors.push({
          file: fileAnalysis.path,
          error: error.message
        });
        console.error(`❌ Failed to restore ${fileAnalysis.path}:`, error.message);
      }
    }
    
    console.log(`🔄 File rollback complete: ${result.filesRestored} restored, ${result.filesSkipped} skipped, ${result.errors.length} errors`);
    return result;
  }

  /**
   * 验证回滚结果
   */
  async verifyRollback(snapshot, rollbackResult) {
    console.log('🔍 Verifying rollback...');
    
    const verification = {
      success: true,
      warnings: [],
      errors: rollbackResult.errors || []
    };

    // 验证文件哈希
    for (const [filePath, expectedFile] of Object.entries(snapshot.files)) {
      try {
        const actualPath = path.join(this.projectRoot, filePath);
        const actualContent = await fs.readFile(actualPath, 'utf8');
        const actualHash = crypto.createHash('sha256').update(actualContent).digest('hex');
        
        if (actualHash !== expectedFile.hash) {
          verification.warnings.push(`File hash mismatch: ${filePath}`);
        }
      } catch (error) {
        verification.errors.push({
          file: filePath,
          error: `Verification failed: ${error.message}`
        });
      }
    }

    // 如果有错误，标记为失败
    if (verification.errors.length > 0) {
      verification.success = false;
    }

    console.log(`🔍 Verification complete: ${verification.success ? 'SUCCESS' : 'FAILED'}`);
    return verification;
  }

  /**
   * 回滚到备份状态
   */
  async rollbackToBackup(backupId) {
    console.log(`🔄 Rolling back to backup: ${backupId}`);
    
    const backupPath = path.join(this.backupDir, backupId);
    
    try {
      // 读取备份元数据
      const metadataPath = path.join(backupPath, 'backup-metadata.json');
      const metadata = JSON.parse(await fs.readFile(metadataPath, 'utf8'));
      
      // 恢复所有备份文件
      const { glob } = require('glob');
      const backupFiles = await glob('**/*', { 
        cwd: backupPath,
        ignore: ['backup-metadata.json']
      });
      
      for (const file of backupFiles) {
        const sourcePath = path.join(backupPath, file);
        const targetPath = path.join(this.projectRoot, file);
        
        const stats = await fs.stat(sourcePath);
        if (stats.isFile()) {
          const targetDir = path.dirname(targetPath);
          await fs.mkdir(targetDir, { recursive: true });
          
          const content = await fs.readFile(sourcePath, 'utf8');
          await fs.writeFile(targetPath, content, 'utf8');
        }
      }
      
      console.log(`✅ Rolled back to backup: ${backupFiles.length} files restored`);
      
    } catch (error) {
      console.error(`❌ Failed to rollback to backup:`, error);
      throw error;
    }
  }

  /**
   * 记录回滚操作审计日志
   */
  async logRollbackOperation(auditEntry) {
    try {
      const auditLog = await this.loadAuditLog();
      auditLog.operations.unshift(auditEntry);
      
      // 保持最多1000条记录
      if (auditLog.operations.length > 1000) {
        auditLog.operations = auditLog.operations.slice(0, 1000);
      }
      
      await this.saveAuditLog(auditLog);
      
    } catch (error) {
      console.error('Failed to log rollback operation:', error);
    }
  }

  /**
   * 加载审计日志
   */
  async loadAuditLog() {
    try {
      const content = await fs.readFile(this.auditLogFile, 'utf8');
      return JSON.parse(content);
    } catch (error) {
      return { operations: [] };
    }
  }

  /**
   * 保存审计日志
   */
  async saveAuditLog(auditLog) {
    await fs.writeFile(this.auditLogFile, JSON.stringify(auditLog, null, 2), 'utf8');
  }

  /**
   * 获取回滚历史
   */
  async getRollbackHistory(limit = 50) {
    const auditLog = await this.loadAuditLog();
    return auditLog.operations.slice(0, limit);
  }

  /**
   * 获取特定操作的详细信息
   */
  async getRollbackOperation(operationId) {
    const auditLog = await this.loadAuditLog();
    return auditLog.operations.find(op => op.operationId === operationId);
  }

  /**
   * 生成操作ID
   */
  generateOperationId() {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const random = crypto.randomBytes(4).toString('hex');
    return `rollback-${timestamp}-${random}`;
  }

  /**
   * 清理旧的备份文件
   */
  async cleanupOldBackups(maxAge = 7 * 24 * 60 * 60 * 1000) { // 7 days
    console.log('🧹 Cleaning up old rollback backups...');
    
    try {
      const backups = await fs.readdir(this.backupDir);
      const now = Date.now();
      let cleaned = 0;
      
      for (const backup of backups) {
        const backupPath = path.join(this.backupDir, backup);
        const stats = await fs.stat(backupPath);
        
        if (stats.isDirectory() && (now - stats.mtime.getTime()) > maxAge) {
          await fs.rm(backupPath, { recursive: true, force: true });
          cleaned++;
        }
      }
      
      console.log(`🧹 Cleaned up ${cleaned} old backups`);
      return cleaned;
      
    } catch (error) {
      console.error('Failed to cleanup old backups:', error);
      return 0;
    }
  }
}

module.exports = StyleRollbackManager;