/**
 * 状态快照管理器
 * State Snapshot Manager
 * 
 * 管理项目状态快照的创建、存储和检索
 * 与Git版本管理互补，专注于项目配置和功能状态
 */

const fs = require('fs').promises;
const path = require('path');
const crypto = require('crypto');

class StateSnapshotManager {
  constructor() {
    this.snapshotsDir = '.kiro/recovery-points/snapshots';
    this.metadataFile = '.kiro/recovery-points/snapshots-metadata.json';
    this.maxSnapshots = 50; // 最多保留50个快照
  }

  /**
   * 保存状态快照
   * Save state snapshot
   */
  async saveSnapshot(snapshot) {
    try {
      // 确保目录存在
      await this._ensureDirectoryExists();

      // 生成快照文件名
      const filename = `${snapshot.id}.json`;
      const filepath = path.join(this.snapshotsDir, filename);

      // 计算快照哈希值
      snapshot.hash = this._calculateHash(snapshot);

      // 保存快照文件
      await fs.writeFile(filepath, JSON.stringify(snapshot, null, 2));

      // 更新元数据
      await this._updateMetadata(snapshot);

      // 清理旧快照
      await this._cleanupOldSnapshots();

      console.log(`✅ 状态快照已保存: ${snapshot.id}`);
      return {
        success: true,
        snapshotId: snapshot.id,
        filepath,
        hash: snapshot.hash
      };

    } catch (error) {
      console.error('❌ 保存状态快照失败:', error.message);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * 加载状态快照
   * Load state snapshot
   */
  async loadSnapshot(snapshotId) {
    try {
      const filename = `${snapshotId}.json`;
      const filepath = path.join(this.snapshotsDir, filename);

      const content = await fs.readFile(filepath, 'utf8');
      const snapshot = JSON.parse(content);

      // 验证快照完整性
      const expectedHash = this._calculateHash(snapshot);
      if (snapshot.hash !== expectedHash) {
        throw new Error('快照文件已损坏或被篡改');
      }

      return {
        success: true,
        snapshot
      };

    } catch (error) {
      console.error(`❌ 加载状态快照失败 (${snapshotId}):`, error.message);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * 列出所有快照
   * List all snapshots
   */
  async listSnapshots() {
    try {
      const metadata = await this._loadMetadata();
      
      // 按时间倒序排列
      const snapshots = metadata.snapshots.sort((a, b) => 
        new Date(b.timestamp) - new Date(a.timestamp)
      );

      return {
        success: true,
        snapshots,
        total: snapshots.length
      };

    } catch (error) {
      console.error('❌ 列出快照失败:', error.message);
      return {
        success: false,
        error: error.message,
        snapshots: []
      };
    }
  }

  /**
   * 删除快照
   * Delete snapshot
   */
  async deleteSnapshot(snapshotId) {
    try {
      const filename = `${snapshotId}.json`;
      const filepath = path.join(this.snapshotsDir, filename);

      // 删除快照文件
      await fs.unlink(filepath);

      // 更新元数据
      const metadata = await this._loadMetadata();
      metadata.snapshots = metadata.snapshots.filter(s => s.id !== snapshotId);
      await this._saveMetadata(metadata);

      console.log(`✅ 快照已删除: ${snapshotId}`);
      return {
        success: true,
        deletedId: snapshotId
      };

    } catch (error) {
      console.error(`❌ 删除快照失败 (${snapshotId}):`, error.message);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * 获取健康状态
   * Get health status
   */
  async getHealthStatus() {
    try {
      const metadata = await this._loadMetadata();
      const now = new Date();
      const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

      const recentSnapshots = metadata.snapshots.filter(s => 
        new Date(s.timestamp) > oneDayAgo
      );

      const weeklySnapshots = metadata.snapshots.filter(s => 
        new Date(s.timestamp) > oneWeekAgo
      );

      const status = {
        totalSnapshots: metadata.snapshots.length,
        recentSnapshots: recentSnapshots.length,
        weeklySnapshots: weeklySnapshots.length,
        lastSnapshot: metadata.snapshots.length > 0 ? 
          metadata.snapshots.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))[0] : null,
        storageUsed: await this._calculateStorageUsage(),
        health: 'unknown'
      };

      // 评估健康状态
      if (status.totalSnapshots === 0) {
        status.health = 'warning';
        status.message = '没有可用的状态快照';
      } else if (status.recentSnapshots === 0) {
        status.health = 'warning';
        status.message = '最近24小时内没有创建快照';
      } else {
        status.health = 'healthy';
        status.message = '快照系统运行正常';
      }

      return status;

    } catch (error) {
      return {
        health: 'error',
        message: `健康检查失败: ${error.message}`,
        error: error.message
      };
    }
  }

  /**
   * 确保目录存在
   * Ensure directory exists
   */
  async _ensureDirectoryExists() {
    try {
      await fs.mkdir(this.snapshotsDir, { recursive: true });
    } catch (error) {
      if (error.code !== 'EEXIST') {
        throw error;
      }
    }
  }

  /**
   * 计算快照哈希值
   * Calculate snapshot hash
   */
  _calculateHash(snapshot) {
    // 创建快照副本，排除hash字段
    const snapshotCopy = { ...snapshot };
    delete snapshotCopy.hash;
    
    const content = JSON.stringify(snapshotCopy, Object.keys(snapshotCopy).sort());
    return crypto.createHash('sha256').update(content).digest('hex');
  }

  /**
   * 更新元数据
   * Update metadata
   */
  async _updateMetadata(snapshot) {
    const metadata = await this._loadMetadata();
    
    // 添加快照信息到元数据
    const snapshotInfo = {
      id: snapshot.id,
      timestamp: snapshot.timestamp,
      type: snapshot.type,
      reason: snapshot.reason,
      hash: snapshot.hash,
      size: JSON.stringify(snapshot).length,
      isAutomatic: snapshot.isAutomatic
    };

    // 移除同ID的旧记录
    metadata.snapshots = metadata.snapshots.filter(s => s.id !== snapshot.id);
    
    // 添加新记录
    metadata.snapshots.push(snapshotInfo);

    await this._saveMetadata(metadata);
  }

  /**
   * 加载元数据
   * Load metadata
   */
  async _loadMetadata() {
    try {
      const content = await fs.readFile(this.metadataFile, 'utf8');
      return JSON.parse(content);
    } catch (error) {
      if (error.code === 'ENOENT') {
        // 文件不存在，返回默认元数据
        return {
          version: '1.0.0',
          created: new Date().toISOString(),
          snapshots: []
        };
      }
      throw error;
    }
  }

  /**
   * 保存元数据
   * Save metadata
   */
  async _saveMetadata(metadata) {
    metadata.lastUpdated = new Date().toISOString();
    await fs.writeFile(this.metadataFile, JSON.stringify(metadata, null, 2));
  }

  /**
   * 清理旧快照
   * Cleanup old snapshots
   */
  async _cleanupOldSnapshots() {
    try {
      const metadata = await this._loadMetadata();
      
      if (metadata.snapshots.length <= this.maxSnapshots) {
        return; // 不需要清理
      }

      // 按时间排序，保留最新的快照
      const sortedSnapshots = metadata.snapshots.sort((a, b) => 
        new Date(b.timestamp) - new Date(a.timestamp)
      );

      const toDelete = sortedSnapshots.slice(this.maxSnapshots);
      
      for (const snapshot of toDelete) {
        await this.deleteSnapshot(snapshot.id);
      }

      console.log(`🧹 已清理 ${toDelete.length} 个旧快照`);

    } catch (error) {
      console.warn('⚠️ 清理旧快照时出现警告:', error.message);
    }
  }

  /**
   * 计算存储使用量
   * Calculate storage usage
   */
  async _calculateStorageUsage() {
    try {
      const files = await fs.readdir(this.snapshotsDir);
      let totalSize = 0;

      for (const file of files) {
        if (file.endsWith('.json')) {
          const filepath = path.join(this.snapshotsDir, file);
          const stats = await fs.stat(filepath);
          totalSize += stats.size;
        }
      }

      // 转换为可读格式
      if (totalSize < 1024) {
        return `${totalSize} B`;
      } else if (totalSize < 1024 * 1024) {
        return `${(totalSize / 1024).toFixed(1)} KB`;
      } else {
        return `${(totalSize / (1024 * 1024)).toFixed(1)} MB`;
      }

    } catch (error) {
      return 'Unknown';
    }
  }
}

module.exports = StateSnapshotManager;