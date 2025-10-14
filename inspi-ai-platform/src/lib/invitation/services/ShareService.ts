/**
 * 分享服务实现
 * 提供完整的多渠道分享功能
 */

import { DatabaseService } from '../database';
import {
  SharePlatform,
  ShareContent,
  ShareStats,
} from '../types';

import { ShareContentGenerator } from './ShareContentGenerator';
import { ShareSDKManager, ShareSDKResult } from './ShareSDKIntegration';
import { ShareTrackingService } from './ShareTrackingService';

export interface IShareService {
  // 生成分享内容
  generateShareContent(inviteCode: string, platform: SharePlatform): Promise<ShareContent>

  // 生成二维码
  generateQRCode(inviteCode: string): Promise<string>

  // 获取分享统计
  getShareStats(inviteCodeId: string): Promise<ShareStats[]>

  // 记录分享事件
  trackShareEvent(inviteCodeId: string, platform: SharePlatform, metadata?: Record<string, any>): Promise<void>

  // 记录点击事件
  trackClickEvent(inviteCodeId: string, platform: SharePlatform, ipAddress?: string, userAgent?: string): Promise<void>

  // 获取分享链接追踪机制
  generateTrackingUrl(inviteCode: string, platform: SharePlatform): Promise<string>

  // 使用第三方SDK分享
  shareWithSDK(inviteCode: string, platform: SharePlatform): Promise<ShareSDKResult>

  // 检查平台是否可用
  isPlatformAvailable(platform: SharePlatform): boolean
}

export class ShareService implements IShareService {
  private contentGenerator: ShareContentGenerator;
  private trackingService: ShareTrackingService;
  private sdkManager: ShareSDKManager;

  constructor(db: DatabaseService, baseUrl?: string) {
    this.contentGenerator = new ShareContentGenerator(baseUrl);
    this.trackingService = new ShareTrackingService(db);
    this.sdkManager = new ShareSDKManager();
  }

  /**
   * 生成分享内容
   */
  async generateShareContent(inviteCode: string, platform: SharePlatform): Promise<ShareContent> {
    try {
      const content = await this.contentGenerator.generateShareContent(inviteCode, platform);

      // 为分享链接添加追踪参数
      const trackingUrl = await this.generateTrackingUrl(inviteCode, platform);
      content.url = trackingUrl;

      return content;
    } catch (error) {
      console.error('Failed to generate share content:', error);
      throw new Error(`Failed to generate share content for platform ${platform}`);
    }
  }

  /**
   * 生成二维码
   */
  async generateQRCode(inviteCode: string): Promise<string> {
    try {
      const inviteUrl = `${process.env.NEXT_PUBLIC_BASE_URL || 'https://inspi.ai'}/invite/${inviteCode}`;
      const trackingUrl = await this.generateTrackingUrl(inviteCode, SharePlatform.LINK);

      return await this.contentGenerator.generateQRCodeDataUrl(trackingUrl);
    } catch (error) {
      console.error('Failed to generate QR code:', error);
      throw new Error('Failed to generate QR code');
    }
  }

  /**
   * 获取分享统计
   */
  async getShareStats(inviteCodeId: string): Promise<ShareStats[]> {
    try {
      return await this.trackingService.getShareStats(inviteCodeId);
    } catch (error) {
      console.error('Failed to get share stats:', error);
      throw new Error('Failed to get share statistics');
    }
  }

  /**
   * 记录分享事件
   */
  async trackShareEvent(
    inviteCodeId: string,
    platform: SharePlatform,
    metadata?: Record<string, any>,
  ): Promise<void> {
    try {
      await this.trackingService.trackShareEvent(inviteCodeId, platform, metadata);
    } catch (error) {
      console.error('Failed to track share event:', error);
      // 不抛出错误，避免影响用户体验
    }
  }

  /**
   * 记录点击事件
   */
  async trackClickEvent(
    inviteCodeId: string,
    platform: SharePlatform,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<void> {
    try {
      await this.trackingService.trackClickEvent(inviteCodeId, platform, ipAddress, userAgent);
    } catch (error) {
      console.error('Failed to track click event:', error);
      // 不抛出错误，避免影响用户体验
    }
  }

  /**
   * 生成带追踪参数的分享链接
   */
  async generateTrackingUrl(inviteCode: string, platform: SharePlatform): Promise<string> {
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://inspi.ai';
    const inviteUrl = `${baseUrl}/invite/${inviteCode}`;

    // 添加追踪参数
    const trackingParams = new URLSearchParams({
      utm_source: 'invite',
      utm_medium: platform,
      utm_campaign: 'user_invitation',
      ref: inviteCode,
    });

    return `${inviteUrl}?${trackingParams.toString()}`;
  }

  /**
   * 获取平台分享参数
   */
  getPlatformShareParams(platform: SharePlatform, content: ShareContent): Record<string, string> {
    return this.contentGenerator.getPlatformShareParams(platform, content);
  }

  /**
   * 获取支持的分享平台
   */
  getSupportedPlatforms(): SharePlatform[] {
    return this.contentGenerator.getSupportedPlatforms();
  }

  /**
   * 使用第三方SDK分享
   */
  async shareWithSDK(inviteCode: string, platform: SharePlatform): Promise<ShareSDKResult> {
    try {
      // 生成分享内容
      const content = await this.generateShareContent(inviteCode, platform);

      // 使用SDK分享
      const result = await this.sdkManager.shareContent(platform, content);

      // 记录分享事件
      if (result.success) {
        // 这里需要获取inviteCodeId，简化处理
        await this.trackShareEvent('', platform, {
          shareId: result.shareId,
          sdkUsed: true,
        });
      }

      return result;
    } catch (error) {
      console.error('SDK share failed:', error);
      return {
        success: false,
        error: `SDK share failed: ${error}`,
      };
    }
  }

  /**
   * 检查平台是否可用
   */
  isPlatformAvailable(platform: SharePlatform): boolean {
    return this.sdkManager.isPlatformAvailable(platform);
  }

  /**
   * 获取当前环境可用的分享平台
   */
  getAvailablePlatforms(): SharePlatform[] {
    return this.sdkManager.getAvailablePlatforms();
  }

  /**
   * 获取热门分享链接
   */
  async getTopSharedInvites(limit: number = 10, platform?: SharePlatform): Promise<Array<{
    inviteCodeId: string
    inviteCode: string
    shareCount: number
    clickCount: number
    conversionCount: number
    conversionRate: number
  }>> {
    try {
      return await this.trackingService.getTopSharedInvites(limit, platform);
    } catch (error) {
      console.error('Failed to get top shared invites:', error);
      return [];
    }
  }

  /**
   * 获取平台分享统计
   */
  async getPlatformShareStats(platform: SharePlatform, startDate?: Date, endDate?: Date): Promise<{
    totalShares: number
    totalClicks: number
    totalConversions: number
    conversionRate: number
  }> {
    try {
      return await this.trackingService.getPlatformShareStats(platform, startDate, endDate);
    } catch (error) {
      console.error('Failed to get platform share stats:', error);
      return {
        totalShares: 0,
        totalClicks: 0,
        totalConversions: 0,
        conversionRate: 0,
      };
    }
  }
}
