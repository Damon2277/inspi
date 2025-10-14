/**
 * 数据备份和恢复系统
 * 提供用户数据的安全备份和恢复功能
 */

import { createWriteStream, createReadStream, existsSync, mkdirSync } from 'fs';
import { join } from 'path';
import { pipeline } from 'stream/promises';
import { createGzip, createGunzip } from 'zlib';

import { MongoClient, Db } from 'mongodb';

import { encryptSensitiveData, decryptSensitiveData, generateChecksum, verifyChecksum } from './encryption';

interface BackupMetadata {
  id: string;
  timestamp: Date;
  type: 'full' | 'incremental' | 'user';
  userId?: string;
  collections: string[];
  size: number;
  checksum: string;
  encrypted: boolean;
}

interface BackupOptions {
  type: 'full' | 'incremental' | 'user';
  userId?: string;
  collections?: string[];
  encrypt?: boolean;
  compress?: boolean;
}

interface RestoreOptions {
  backupId: string;
  targetUserId?: string;
  collections?: string[];
  overwrite?: boolean;
}

export class BackupManager {
  private db: Db;
  private backupDir: string;

  constructor(db: Db, backupDir: string = './backups') {
    this.db = db;
    this.backupDir = backupDir;

    // 确保备份目录存在
    if (!existsSync(backupDir)) {
      mkdirSync(backupDir, { recursive: true });
    }
  }

  /**
   * 创建数据备份
   */
  async createBackup(options: BackupOptions): Promise<BackupMetadata> {
    const backupId = `backup_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const timestamp = new Date();

    try {
      console.log(`Starting ${options.type} backup: ${backupId}`);

      // 确定要备份的集合
      const collections = options.collections || await this.getCollectionsToBackup(options);

      // 创建备份数据
      const backupData = await this.collectBackupData(collections, options);

      // 生成备份文件路径
      const backupPath = join(this.backupDir, `${backupId}.json`);

      // 处理数据（加密、压缩）
      let processedData = JSON.stringify(backupData);

      if (options.encrypt) {
        processedData = encryptSensitiveData(processedData);
      }

      // 写入备份文件
      if (options.compress) {
        await this.writeCompressedBackup(backupPath + '.gz', processedData);
      } else {
        await this.writeBackup(backupPath, processedData);
      }

      // 计算校验和
      const checksum = generateChecksum(processedData);

      // 创建元数据
      const metadata: BackupMetadata = {
        id: backupId,
        timestamp,
        type: options.type,
        userId: options.userId,
        collections,
        size: processedData.length,
        checksum,
        encrypted: options.encrypt || false,
      };

      // 保存元数据
      await this.saveBackupMetadata(metadata);

      console.log(`Backup completed: ${backupId}`);
      return metadata;

    } catch (error) {
      console.error(`Backup failed: ${backupId}`, error);
      throw new Error(`Backup creation failed: ${error.message}`);
    }
  }

  /**
   * 恢复数据备份
   */
  async restoreBackup(options: RestoreOptions): Promise<void> {
    try {
      console.log(`Starting restore: ${options.backupId}`);

      // 获取备份元数据
      const metadata = await this.getBackupMetadata(options.backupId);
      if (!metadata) {
        throw new Error(`Backup not found: ${options.backupId}`);
      }

      // 读取备份数据
      const backupPath = join(this.backupDir, `${options.backupId}.json`);
      let backupData = await this.readBackup(backupPath, metadata);

      // 解密数据
      if (metadata.encrypted) {
        backupData = decryptSensitiveData(backupData);
      }

      // 验证数据完整性
      if (!verifyChecksum(backupData, metadata.checksum)) {
        throw new Error('Backup data integrity check failed');
      }

      // 解析备份数据
      const parsedData = JSON.parse(backupData);

      // 恢复数据到数据库
      await this.restoreToDatabase(parsedData, options);

      console.log(`Restore completed: ${options.backupId}`);

    } catch (error) {
      console.error(`Restore failed: ${options.backupId}`, error);
      throw new Error(`Backup restore failed: ${error.message}`);
    }
  }

  /**
   * 获取备份列表
   */
  async getBackupList(userId?: string): Promise<BackupMetadata[]> {
    try {
      const collection = this.db.collection('backup_metadata');
      const query = userId ? { userId } : {};

      const backups = await collection
        .find(query)
        .sort({ timestamp: -1 })
        .toArray();

      return backups.map(backup => ({
        id: backup.id,
        timestamp: backup.timestamp,
        type: backup.type,
        userId: backup.userId,
        collections: backup.collections,
        size: backup.size,
        checksum: backup.checksum,
        encrypted: backup.encrypted,
      }));

    } catch (error) {
      console.error('Failed to get backup list:', error);
      throw new Error('Failed to retrieve backup list');
    }
  }

  /**
   * 删除备份
   */
  async deleteBackup(backupId: string): Promise<void> {
    try {
      // 删除备份文件
      const backupPath = join(this.backupDir, `${backupId}.json`);
      const compressedPath = backupPath + '.gz';

      if (existsSync(backupPath)) {
        require('fs').unlinkSync(backupPath);
      }

      if (existsSync(compressedPath)) {
        require('fs').unlinkSync(compressedPath);
      }

      // 删除元数据
      await this.db.collection('backup_metadata').deleteOne({ id: backupId });

      console.log(`Backup deleted: ${backupId}`);

    } catch (error) {
      console.error(`Failed to delete backup: ${backupId}`, error);
      throw new Error('Failed to delete backup');
    }
  }

  /**
   * 创建用户数据备份
   */
  async createUserBackup(userId: string): Promise<BackupMetadata> {
    return this.createBackup({
      type: 'user',
      userId,
      collections: ['users', 'works', 'knowledge_graphs', 'contribution_logs'],
      encrypt: true,
      compress: true,
    });
  }

  /**
   * 恢复用户数据
   */
  async restoreUserData(userId: string, backupId: string): Promise<void> {
    return this.restoreBackup({
      backupId,
      targetUserId: userId,
      overwrite: false,
    });
  }

  /**
   * 自动备份调度
   */
  async scheduleAutoBackup(): Promise<void> {
    const now = new Date();
    const hour = now.getHours();

    // 每天凌晨2点执行全量备份
    if (hour === 2) {
      await this.createBackup({
        type: 'full',
        encrypt: true,
        compress: true,
      });
    }

    // 每6小时执行增量备份
    if (hour % 6 === 0) {
      await this.createBackup({
        type: 'incremental',
        encrypt: true,
        compress: true,
      });
    }
  }

  /**
   * 清理过期备份
   */
  async cleanupOldBackups(retentionDays: number = 30): Promise<void> {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

      const collection = this.db.collection('backup_metadata');
      const oldBackups = await collection
        .find({ timestamp: { $lt: cutoffDate } })
        .toArray();

      for (const backup of oldBackups) {
        await this.deleteBackup(backup.id);
      }

      console.log(`Cleaned up ${oldBackups.length} old backups`);

    } catch (error) {
      console.error('Failed to cleanup old backups:', error);
    }
  }

  // 私有方法

  private async getCollectionsToBackup(options: BackupOptions): Promise<string[]> {
    if (options.type === 'user' && options.userId) {
      return ['users', 'works', 'knowledge_graphs', 'contribution_logs'];
    }

    if (options.type === 'full') {
      const collections = await this.db.listCollections().toArray();
      return collections.map(col => col.name).filter(name => !name.startsWith('system.'));
    }

    // 增量备份：只备份最近修改的数据
    return ['works', 'contribution_logs', 'user_sessions'];
  }

  private async collectBackupData(collections: string[], options: BackupOptions): Promise<any> {
    const backupData: any = {};

    for (const collectionName of collections) {
      const collection = this.db.collection(collectionName);
      let query = {};

      // 用户特定备份
      if (options.type === 'user' && options.userId) {
        query = { userId: options.userId };
      }

      // 增量备份：只获取最近24小时的数据
      if (options.type === 'incremental') {
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        query = { ...query, updatedAt: { $gte: yesterday } };
      }

      const documents = await (collection.find as any)(query).toArray();
      backupData[collectionName] = documents;
    }

    return backupData;
  }

  private async writeBackup(path: string, data: string): Promise<void> {
    const fs = require('fs').promises;
    await fs.writeFile(path, data, 'utf8');
  }

  private async writeCompressedBackup(path: string, data: string): Promise<void> {
    const writeStream = createWriteStream(path);
    const gzipStream = createGzip();

    await pipeline(
      require('stream').Readable.from([data]),
      gzipStream,
      writeStream,
    );
  }

  private async readBackup(path: string, metadata: BackupMetadata): Promise<string> {
    const compressedPath = path + '.gz';

    if (existsSync(compressedPath)) {
      return this.readCompressedBackup(compressedPath);
    } else if (existsSync(path)) {
      const fs = require('fs').promises;
      return await fs.readFile(path, 'utf8');
    } else {
      throw new Error(`Backup file not found: ${path}`);
    }
  }

  private async readCompressedBackup(path: string): Promise<string> {
    const readStream = createReadStream(path);
    const gunzipStream = createGunzip();

    const data = '';
    const chunks: Buffer[] = [];

    await pipeline(
      readStream,
      gunzipStream,
      require('stream').Writable({
        write(chunk, encoding, callback) {
          chunks.push(chunk);
          callback();
        },
      }),
    );

    return Buffer.concat(chunks).toString('utf8');
  }

  private async saveBackupMetadata(metadata: BackupMetadata): Promise<void> {
    const collection = this.db.collection('backup_metadata');
    await collection.insertOne(metadata);
  }

  private async getBackupMetadata(backupId: string): Promise<BackupMetadata | null> {
    const collection = this.db.collection('backup_metadata');
    return await (collection.findOne as any)({ id: backupId });
  }

  private async restoreToDatabase(data: any, options: RestoreOptions): Promise<void> {
    const collections = options.collections || Object.keys(data);

    for (const collectionName of collections) {
      if (!data[collectionName]) continue;

      const collection = this.db.collection(collectionName);
      const documents = data[collectionName];

      if (options.overwrite) {
        // 清空集合后插入
        await (collection.deleteMany as any)({});
        if (documents.length > 0) {
          await (collection.insertMany as any)(documents);
        }
      } else {
        // 逐个检查并插入不存在的文档
        for (const doc of documents) {
          const existing = await (collection.findOne as any)({ _id: doc._id });
          if (!existing) {
            await collection.insertOne(doc);
          }
        }
      }
    }
  }
}
