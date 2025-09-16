/**
 * Style Snapshot Manager
 * 样式快照管理器
 */

const fs = require('fs').promises;
const path = require('path');
const crypto = require('crypto');
const { glob } = require('glob');

class StyleSnapshotManager {
  constructor(config) {
    this.config = config;
    this.snapshotDir = path.join(config.projectRoot || process.cwd(), config.snapshotDir);
    this.metadataFile = path.join(this.snapshotDir, 'metadata.json');
  }

  /**
   * 初始化快照管理器
   */
  async initialize() {
    try {
      await fs.mkdir(this.snapshotDir, { recursive: true });
      
      // 确保元数据文件存在
      try {
        await fs.access(this.metadataFile);
      } catch {
        await this.saveMetadata({ snapshots: [], lastCleanup: Date.now() });
      }
      
      console.log(`📁 Snapshot directory initialized: ${this.snapshotDir}`);
    } catch (error) {
      console.error('Failed to initialize snapshot manager:', error);
      throw error;
    }
  }

  /**
   * 创建样式快照
   */
  async createSnapshot(options = {}) {
    const snapshotId = this.generateSnapshotId();
    const timestamp = new Date().toISOString();
    
    console.log(`📸 Creating snapshot ${snapshotId}...`);

    try {
      // 收集样式文件
      const styleFiles = await this.collectStyleFiles();
      
      // 计算文件哈希
      const fileHashes = await this.calculateFileHashes(styleFiles);
      
      // 创建快照数据
      const snapshot = {
        id: snapshotId,
        name: options.name || `snapshot-${snapshotId}`,
        description: options.description || 'Automatic snapshot',
        timestamp,
        isStable: options.isStable || false,
        tags: options.tags || [],
        files: fileHashes,
        metadata: {
          totalFiles: styleFiles.length,
          totalSize: this.calculateTotalSize(fileHashes),
          createdBy: options.createdBy || 'system',
          reason: options.reason || 'manual'
        }
      };

      // 保存文件内容
      await this.saveSnapshotFiles(snapshotId, styleFiles);
      
      // 更新元数据
      await this.addSnapshotToMetadata(snapshot);
      
      console.log(`✅ Snapshot ${snapshotId} created successfully`);
      return snapshot;
      
    } catch (error) {
      console.error(`❌ Failed to create snapshot ${snapshotId}:`, error);
      throw error;
    }
  }

  /**
   * 收集所有样式相关文件
   */
  async collectStyleFiles() {
    const files = [];
    
    for (const pattern of this.config.watchPatterns) {
      try {
        const matches = await glob(pattern, { 
          cwd: this.config.projectRoot || process.cwd(),
          ignore: ['node_modules/**', '.git/**', '.next/**']
        });
        
        for (const file of matches) {
          const fullPath = path.resolve(this.config.projectRoot || process.cwd(), file);
          try {
            const content = await fs.readFile(fullPath, 'utf8');
            const stats = await fs.stat(fullPath);
            
            files.push({
              path: file,
              fullPath,
              content,
              size: stats.size,
              lastModified: stats.mtime.toISOString()
            });
          } catch (error) {
            console.warn(`⚠️ Could not read file ${file}:`, error.message);
          }
        }
      } catch (error) {
        console.warn(`⚠️ Pattern ${pattern} failed:`, error.message);
      }
    }
    
    return files;
  }

  /**
   * 计算文件哈希值
   */
  async calculateFileHashes(files) {
    const hashes = {};
    
    for (const file of files) {
      const hash = crypto.createHash('sha256').update(file.content).digest('hex');
      hashes[file.path] = {
        hash,
        size: file.size,
        lastModified: file.lastModified
      };
    }
    
    return hashes;
  }

  /**
   * 保存快照文件
   */
  async saveSnapshotFiles(snapshotId, files) {
    const snapshotPath = path.join(this.snapshotDir, snapshotId);
    await fs.mkdir(snapshotPath, { recursive: true });
    
    for (const file of files) {
      const targetPath = path.join(snapshotPath, file.path);
      const targetDir = path.dirname(targetPath);
      
      await fs.mkdir(targetDir, { recursive: true });
      await fs.writeFile(targetPath, file.content, 'utf8');
    }
  }

  /**
   * 生成快照ID
   */
  generateSnapshotId() {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const random = crypto.randomBytes(4).toString('hex');
    return `${timestamp}-${random}`;
  }

  /**
   * 计算总大小
   */
  calculateTotalSize(fileHashes) {
    return Object.values(fileHashes).reduce((total, file) => total + file.size, 0);
  }

  /**
   * 添加快照到元数据
   */
  async addSnapshotToMetadata(snapshot) {
    const metadata = await this.loadMetadata();
    metadata.snapshots.unshift(snapshot);
    
    // 保持最多100个快照记录
    if (metadata.snapshots.length > 100) {
      metadata.snapshots = metadata.snapshots.slice(0, 100);
    }
    
    await this.saveMetadata(metadata);
  }

  /**
   * 加载元数据
   */
  async loadMetadata() {
    try {
      const content = await fs.readFile(this.metadataFile, 'utf8');
      return JSON.parse(content);
    } catch (error) {
      return { snapshots: [], lastCleanup: Date.now() };
    }
  }

  /**
   * 保存元数据
   */
  async saveMetadata(metadata) {
    await fs.writeFile(this.metadataFile, JSON.stringify(metadata, null, 2), 'utf8');
  }

  /**
   * 获取快照列表
   */
  async listSnapshots() {
    const metadata = await this.loadMetadata();
    return metadata.snapshots;
  }

  /**
   * 获取特定快照
   */
  async getSnapshot(snapshotId) {
    const snapshots = await this.listSnapshots();
    return snapshots.find(s => s.id === snapshotId);
  }

  /**
   * 删除快照
   */
  async deleteSnapshot(snapshotId) {
    const snapshotPath = path.join(this.snapshotDir, snapshotId);
    
    try {
      await fs.rm(snapshotPath, { recursive: true, force: true });
      
      const metadata = await this.loadMetadata();
      metadata.snapshots = metadata.snapshots.filter(s => s.id !== snapshotId);
      await this.saveMetadata(metadata);
      
      console.log(`🗑️ Snapshot ${snapshotId} deleted`);
    } catch (error) {
      console.error(`❌ Failed to delete snapshot ${snapshotId}:`, error);
      throw error;
    }
  }

  /**
   * 清理旧快照
   */
  async cleanupOldSnapshots(maxAge = 30 * 24 * 60 * 60 * 1000) { // 30 days
    const metadata = await this.loadMetadata();
    const now = Date.now();
    const cutoff = now - maxAge;
    
    const toDelete = metadata.snapshots.filter(s => {
      const snapshotTime = new Date(s.timestamp).getTime();
      return snapshotTime < cutoff && !s.isStable;
    });
    
    for (const snapshot of toDelete) {
      await this.deleteSnapshot(snapshot.id);
    }
    
    // Reload metadata after deletions and update cleanup time
    const updatedMetadata = await this.loadMetadata();
    updatedMetadata.lastCleanup = now;
    await this.saveMetadata(updatedMetadata);
    
    console.log(`🧹 Cleaned up ${toDelete.length} old snapshots`);
    return toDelete.length;
  }
}

module.exports = StyleSnapshotManager;