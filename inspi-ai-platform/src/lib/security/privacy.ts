/**
 * 隐私保护和数据权利管理
 * 实现GDPR合规的数据导出、删除和隐私控制
 */

import { createWriteStream } from 'fs';
import { join } from 'path';

import { Db, ObjectId } from 'mongodb';

import { decryptPersonalInfo, maskSensitiveData, secureDelete } from './encryption';

interface DataExportOptions {
  userId: string;
  format: 'json' | 'csv' | 'xml';
  includePersonalData: boolean;
  includeSensitiveData: boolean;
  dateRange?: {
    start: Date;
    end: Date;
  };
}

interface DataDeletionOptions {
  userId: string;
  deleteType: 'soft' | 'hard' | 'anonymize';
  retainPeriod?: number; // 天数
  reason?: string;
}

interface PrivacySettings {
  userId: string;
  dataProcessingConsent: boolean;
  marketingConsent: boolean;
  analyticsConsent: boolean;
  thirdPartySharing: boolean;
  dataRetentionPeriod: number;
  lastUpdated: Date;
}

export class PrivacyManager {
  private db: Db;
  private exportDir: string;

  constructor(db: Db, exportDir: string = './exports') {
    this.db = db;
    this.exportDir = exportDir;
  }

  /**
   * 导出用户数据
   */
  async exportUserData(options: DataExportOptions): Promise<string> {
    try {
      console.log(`Starting data export for user: ${options.userId}`);

      // 收集用户数据
      const userData = await this.collectUserData(options);

      // 生成导出文件
      const exportPath = await this.generateExportFile(userData, options);

      // 记录导出操作
      await this.logDataExport(options.userId, exportPath);

      console.log(`Data export completed: ${exportPath}`);
      return exportPath;

    } catch (error) {
      console.error(`Data export failed for user ${options.userId}:`, error);
      throw new Error(`Data export failed: ${error.message}`);
    }
  }

  /**
   * 删除用户数据
   */
  async deleteUserData(options: DataDeletionOptions): Promise<void> {
    try {
      console.log(`Starting data deletion for user: ${options.userId}`);

      switch (options.deleteType) {
        case 'soft':
          await this.softDeleteUserData(options);
          break;
        case 'hard':
          await this.hardDeleteUserData(options);
          break;
        case 'anonymize':
          await this.anonymizeUserData(options);
          break;
      }

      // 记录删除操作
      await this.logDataDeletion(options);

      console.log(`Data deletion completed for user: ${options.userId}`);

    } catch (error) {
      console.error(`Data deletion failed for user ${options.userId}:`, error);
      throw new Error(`Data deletion failed: ${error.message}`);
    }
  }

  /**
   * 获取用户隐私设置
   */
  async getPrivacySettings(userId: string): Promise<PrivacySettings | null> {
    try {
      const collection = this.db.collection('privacy_settings');
      return await (collection.findOne as any)({ userId });
    } catch (error) {
      console.error(`Failed to get privacy settings for user ${userId}:`, error);
      return null;
    }
  }

  /**
   * 更新用户隐私设置
   */
  async updatePrivacySettings(userId: string, settings: Partial<PrivacySettings>): Promise<void> {
    try {
      const collection = this.db.collection('privacy_settings');

      const updatedSettings = {
        ...settings,
        userId,
        lastUpdated: new Date(),
      };

      await (collection.updateOne as any)(
        { userId },
        { $set: updatedSettings },
        { upsert: true },
      );

      // 记录隐私设置变更
      await this.logPrivacySettingsChange(userId, settings);

    } catch (error) {
      console.error(`Failed to update privacy settings for user ${userId}:`, error);
      throw new Error('Failed to update privacy settings');
    }
  }

  /**
   * 检查数据处理合规性
   */
  async checkDataProcessingCompliance(userId: string): Promise<{
    compliant: boolean;
    issues: string[];
    recommendations: string[];
  }> {
    const issues: string[] = [];
    const recommendations: string[] = [];

    try {
      // 检查隐私设置
      const privacySettings = await this.getPrivacySettings(userId);
      if (!privacySettings) {
        issues.push('No privacy settings found');
        recommendations.push('Create privacy settings for the user');
      } else {
        if (!privacySettings.dataProcessingConsent) {
          issues.push('No data processing consent');
          recommendations.push('Obtain explicit data processing consent');
        }
      }

      // 检查数据保留期限
      const user = await this.db.collection('users').findOne({ _id: new ObjectId(userId) });
      if (user) {
        const accountAge = Date.now() - user.createdAt.getTime();
        const maxRetentionPeriod = (privacySettings?.dataRetentionPeriod || 365) * 24 * 60 * 60 * 1000;

        if (accountAge > maxRetentionPeriod) {
          issues.push('Data retention period exceeded');
          recommendations.push('Review and clean up old data or obtain renewed consent');
        }
      }

      // 检查敏感数据加密
      const hasUnencryptedSensitiveData = await this.checkUnencryptedSensitiveData(userId);
      if (hasUnencryptedSensitiveData) {
        issues.push('Unencrypted sensitive data found');
        recommendations.push('Encrypt all sensitive personal data');
      }

      return {
        compliant: issues.length === 0,
        issues,
        recommendations,
      };

    } catch (error) {
      console.error(`Compliance check failed for user ${userId}:`, error);
      return {
        compliant: false,
        issues: ['Compliance check failed'],
        recommendations: ['Review system logs and fix underlying issues'],
      };
    }
  }

  /**
   * 生成隐私报告
   */
  async generatePrivacyReport(userId: string): Promise<{
    dataCategories: string[];
    processingPurposes: string[];
    thirdPartySharing: string[];
    retentionPeriods: Record<string, number>;
    userRights: string[];
  }> {
    try {
      const userData = await this.collectUserData({
        userId,
        format: 'json',
        includePersonalData: true,
        includeSensitiveData: false,
      });

      return {
        dataCategories: [
          'Account Information',
          'Profile Data',
          'Content Created',
          'Usage Analytics',
          'Communication Records',
        ],
        processingPurposes: [
          'Service Provision',
          'User Experience Improvement',
          'Security and Fraud Prevention',
          'Legal Compliance',
          'Marketing (with consent)',
        ],
        thirdPartySharing: [
          'Google OAuth (Authentication)',
          'Email Service Provider',
          'Analytics Provider (anonymized)',
          'Cloud Storage Provider',
        ],
        retentionPeriods: {
          'Account Data': 365,
          'Content Data': 1095,
          'Analytics Data': 730,
          'Log Data': 90,
        },
        userRights: [
          'Right to Access',
          'Right to Rectification',
          'Right to Erasure',
          'Right to Data Portability',
          'Right to Restrict Processing',
          'Right to Object',
          'Right to Withdraw Consent',
        ],
      };

    } catch (error) {
      console.error(`Failed to generate privacy report for user ${userId}:`, error);
      throw new Error('Failed to generate privacy report');
    }
  }

  /**
   * 处理数据主体权利请求
   */
  async handleDataSubjectRequest(request: {
    userId: string;
    requestType: 'access' | 'rectification' | 'erasure' | 'portability' | 'restriction' | 'objection';
    details: string;
    contactEmail: string;
  }): Promise<string> {
    try {
      const requestId = `dsr_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      // 记录请求
      await this.db.collection('data_subject_requests').insertOne({
        requestId,
        ...request,
        status: 'pending',
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      // 根据请求类型执行相应操作
      switch (request.requestType) {
        case 'access':
          await this.exportUserData({
            userId: request.userId,
            format: 'json',
            includePersonalData: true,
            includeSensitiveData: false,
          });
          break;

        case 'erasure':
          await this.deleteUserData({
            userId: request.userId,
            deleteType: 'soft',
            reason: 'User request for data erasure',
          });
          break;

        case 'portability':
          await this.exportUserData({
            userId: request.userId,
            format: 'json',
            includePersonalData: true,
            includeSensitiveData: true,
          });
          break;
      }

      // 更新请求状态
      await this.db.collection('data_subject_requests').updateOne(
        { requestId },
        {
          $set: {
            status: 'completed',
            completedAt: new Date(),
            updatedAt: new Date(),
          },
        },
      );

      return requestId;

    } catch (error) {
      console.error('Failed to handle data subject request:', error);
      throw new Error('Failed to process data subject request');
    }
  }

  // 私有方法

  private async collectUserData(options: DataExportOptions): Promise<any> {
    const userData: any = {};

    // 基本用户信息
    const user = await this.db.collection('users').findOne({ _id: new ObjectId(options.userId) });
    if (user) {
      userData.profile = {
        id: user._id,
        email: options.includeSensitiveData ? user.email : maskSensitiveData(user.email, 'email'),
        username: user.username,
        displayName: user.displayName,
        createdAt: user.createdAt,
        lastLoginAt: user.lastLoginAt,
      };

      // 解密个人信息（如果需要）
      if (options.includePersonalData && user.personalInfo) {
        userData.personalInfo = options.includeSensitiveData
          ? decryptPersonalInfo(user.personalInfo)
          : this.maskPersonalInfo(user.personalInfo);
      }
    }

    // 用户作品
    const works = await this.db.collection('works')
      .find({ userId: options.userId })
      .toArray();
    userData.works = works;

    // 知识图谱
    const knowledgeGraphs = await this.db.collection('knowledge_graphs')
      .find({ userId: options.userId })
      .toArray();
    userData.knowledgeGraphs = knowledgeGraphs;

    // 贡献记录
    const contributions = await this.db.collection('contribution_logs')
      .find({ userId: options.userId })
      .toArray();
    userData.contributions = contributions;

    // 隐私设置
    const privacySettings = await this.getPrivacySettings(options.userId);
    userData.privacySettings = privacySettings;

    return userData;
  }

  private async generateExportFile(userData: any, options: DataExportOptions): Promise<string> {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `user_data_export_${options.userId}_${timestamp}.${options.format}`;
    const filepath = join(this.exportDir, filename);

    switch (options.format) {
      case 'json':
        await this.writeJSONFile(filepath, userData);
        break;
      case 'csv':
        await this.writeCSVFile(filepath, userData);
        break;
      case 'xml':
        await this.writeXMLFile(filepath, userData);
        break;
    }

    return filepath;
  }

  private async writeJSONFile(filepath: string, data: any): Promise<void> {
    const fs = require('fs').promises;
    await fs.writeFile(filepath, JSON.stringify(data, null, 2), 'utf8');
  }

  private async writeCSVFile(filepath: string, data: any): Promise<void> {
    // 简化的CSV导出实现
    const csv = this.convertToCSV(data);
    const fs = require('fs').promises;
    await fs.writeFile(filepath, csv, 'utf8');
  }

  private async writeXMLFile(filepath: string, data: any): Promise<void> {
    // 简化的XML导出实现
    const xml = this.convertToXML(data);
    const fs = require('fs').promises;
    await fs.writeFile(filepath, xml, 'utf8');
  }

  private convertToCSV(data: any): string {
    // 简化的CSV转换实现
    const lines: string[] = [];

    // 添加用户基本信息
    if (data.profile) {
      lines.push('Section,Field,Value');
      Object.entries(data.profile).forEach(([key, value]) => {
        lines.push(`Profile,${key},"${value}"`);
      });
    }

    return lines.join('\n');
  }

  private convertToXML(data: any): string {
    // 简化的XML转换实现
    let xml = '<?xml version="1.0" encoding="UTF-8"?>\n<UserData>\n';

    Object.entries(data).forEach(([key, value]) => {
      xml += `  <${key}>${JSON.stringify(value)}</${key}>\n`;
    });

    xml += '</UserData>';
    return xml;
  }

  private async softDeleteUserData(options: DataDeletionOptions): Promise<void> {
    const deletedAt = new Date();
    const retainUntil = new Date();
    retainUntil.setDate(retainUntil.getDate() + (options.retainPeriod || 30));

    // 标记用户为已删除
    await this.db.collection('users').updateOne(
      { _id: new ObjectId(options.userId) },
      {
        $set: {
          deletedAt,
          retainUntil,
          deletionReason: options.reason,
        },
      },
    );

    // 标记相关数据为已删除
    const collections = ['works', 'knowledge_graphs', 'contribution_logs'];
    for (const collectionName of collections) {
      await this.db.collection(collectionName).updateMany(
        { userId: options.userId },
        { $set: { deletedAt, retainUntil } },
      );
    }
  }

  private async hardDeleteUserData(options: DataDeletionOptions): Promise<void> {
    // 永久删除用户数据
    await this.db.collection('users').deleteOne({ _id: new ObjectId(options.userId) });

    const collections = ['works', 'knowledge_graphs', 'contribution_logs', 'privacy_settings'];
    for (const collectionName of collections) {
      await this.db.collection(collectionName).deleteMany({ userId: options.userId });
    }
  }

  private async anonymizeUserData(options: DataDeletionOptions): Promise<void> {
    // 匿名化用户数据
    const anonymizedId = `anon_${Date.now()}`;

    await this.db.collection('users').updateOne(
      { _id: new ObjectId(options.userId) },
      {
        $set: {
          email: `${anonymizedId}@anonymized.local`,
          username: anonymizedId,
          displayName: 'Anonymous User',
          personalInfo: null,
          anonymizedAt: new Date(),
        },
      },
    );

    // 保留作品但匿名化作者信息
    await this.db.collection('works').updateMany(
      { userId: options.userId },
      { $set: { authorName: 'Anonymous User' } },
    );
  }

  private maskPersonalInfo(personalInfo: any): any {
    const masked: any = {};

    Object.entries(personalInfo).forEach(([key, value]) => {
      if (typeof value === 'string') {
        switch (key) {
          case 'phone':
            masked[key] = maskSensitiveData(value, 'phone');
            break;
          case 'idCard':
            masked[key] = maskSensitiveData(value, 'idCard');
            break;
          case 'realName':
            masked[key] = maskSensitiveData(value, 'name');
            break;
          default:
            masked[key] = '[MASKED]';
        }
      }
    });

    return masked;
  }

  private async checkUnencryptedSensitiveData(userId: string): Promise<boolean> {
    const user = await this.db.collection('users').findOne({ _id: new ObjectId(userId) });

    if (user && user.personalInfo) {
      // 检查是否有未加密的敏感数据
      const personalInfo = user.personalInfo;

      // 如果个人信息字段包含明文数据（不是加密格式），则认为未加密
      for (const [key, value] of Object.entries(personalInfo)) {
        if (typeof value === 'string' && !value.includes(':')) {
          // 加密数据应该包含':'分隔符
          return true;
        }
      }
    }

    return false;
  }

  private async logDataExport(userId: string, exportPath: string): Promise<void> {
    await this.db.collection('privacy_logs').insertOne({
      userId,
      action: 'data_export',
      details: { exportPath },
      timestamp: new Date(),
      ipAddress: null, // 在实际使用中应该记录IP地址
      userAgent: null,  // 在实际使用中应该记录User-Agent
    });
  }

  private async logDataDeletion(options: DataDeletionOptions): Promise<void> {
    await this.db.collection('privacy_logs').insertOne({
      userId: options.userId,
      action: 'data_deletion',
      details: {
        deleteType: options.deleteType,
        reason: options.reason,
      },
      timestamp: new Date(),
    });
  }

  private async logPrivacySettingsChange(userId: string, settings: Partial<PrivacySettings>): Promise<void> {
    await this.db.collection('privacy_logs').insertOne({
      userId,
      action: 'privacy_settings_update',
      details: settings,
      timestamp: new Date(),
    });
  }
}
