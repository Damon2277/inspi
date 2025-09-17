/**
 * 分享内容生成器
 * 负责生成各平台的分享内容模板和二维码
 */

import { SharePlatform, ShareContent } from '../types'
import QRCode from 'qrcode'

export interface ShareContentTemplate {
  title: string
  description: string
  imageUrl?: string
}

export class ShareContentGenerator {
  private readonly baseUrl: string
  private readonly platformTemplates: Map<SharePlatform, ShareContentTemplate>

  constructor(baseUrl: string = process.env.NEXT_PUBLIC_BASE_URL || 'https://inspi.ai') {
    this.baseUrl = baseUrl
    this.platformTemplates = new Map()
    this.initializePlatformTemplates()
  }

  /**
   * 初始化各平台分享模板
   */
  private initializePlatformTemplates(): void {
    // 微信分享模板
    this.platformTemplates.set(SharePlatform.WECHAT, {
      title: '🎨 发现AI创作神器 - Inspi.AI',
      description: '我在使用Inspi.AI进行AI创作，效果超棒！通过我的邀请链接注册，你也可以获得10次免费AI生成机会！',
      imageUrl: '/images/share/wechat-share.png'
    })

    // QQ分享模板
    this.platformTemplates.set(SharePlatform.QQ, {
      title: '🚀 Inspi.AI - AI创作平台',
      description: '超好用的AI创作工具！点击链接注册即可获得10次免费体验机会，一起来探索AI创作的无限可能！',
      imageUrl: '/images/share/qq-share.png'
    })

    // 钉钉分享模板
    this.platformTemplates.set(SharePlatform.DINGTALK, {
      title: '📚 Inspi.AI - 教育AI创作平台',
      description: '专为教育工作者设计的AI创作工具，帮助快速生成教学内容。通过邀请链接注册可获得额外使用次数！',
      imageUrl: '/images/share/dingtalk-share.png'
    })

    // 企业微信分享模板
    this.platformTemplates.set(SharePlatform.WEWORK, {
      title: '💼 Inspi.AI - 企业AI创作解决方案',
      description: '提升团队创作效率的AI工具，支持多种内容生成。邀请同事注册，共同体验AI创作的便利！',
      imageUrl: '/images/share/wework-share.png'
    })

    // 邮件分享模板
    this.platformTemplates.set(SharePlatform.EMAIL, {
      title: '邀请您体验Inspi.AI - AI创作平台',
      description: `您好！

我最近在使用Inspi.AI这个AI创作平台，觉得非常不错，想推荐给您。

Inspi.AI是一个专业的AI创作工具，可以帮助您：
• 快速生成高质量内容
• 提升创作效率
• 探索AI创作的无限可能

通过我的邀请链接注册，您可以获得10次免费AI生成机会！

期待与您一起探索AI创作的精彩世界！`,
      imageUrl: '/images/share/email-share.png'
    })

    // 链接分享模板
    this.platformTemplates.set(SharePlatform.LINK, {
      title: 'Inspi.AI - AI创作平台邀请',
      description: '加入Inspi.AI，开启AI创作之旅！通过邀请链接注册可获得10次免费体验机会。',
      imageUrl: '/images/share/default-share.png'
    })
  }

  /**
   * 生成分享内容
   */
  async generateShareContent(inviteCode: string, platform: SharePlatform): Promise<ShareContent> {
    const template = this.platformTemplates.get(platform)
    if (!template) {
      throw new Error(`Unsupported share platform: ${platform}`)
    }

    const inviteUrl = this.generateInviteUrl(inviteCode)
    const qrCodeUrl = await this.generateQRCodeDataUrl(inviteUrl)

    return {
      title: template.title,
      description: this.personalizeDescription(template.description, inviteCode),
      url: inviteUrl,
      imageUrl: template.imageUrl,
      qrCodeUrl
    }
  }

  /**
   * 生成邀请链接
   */
  private generateInviteUrl(inviteCode: string): string {
    return `${this.baseUrl}/invite/${inviteCode}`
  }

  /**
   * 个性化描述内容
   */
  private personalizeDescription(description: string, inviteCode: string): string {
    // 可以根据邀请码或用户信息进一步个性化内容
    return description.replace('{{inviteCode}}', inviteCode)
  }

  /**
   * 生成二维码数据URL
   */
  async generateQRCodeDataUrl(url: string): Promise<string> {
    try {
      const qrCodeDataUrl = await QRCode.toDataURL(url, {
        width: 200,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#FFFFFF'
        },
        errorCorrectionLevel: 'M'
      })
      return qrCodeDataUrl
    } catch (error) {
      console.error('Failed to generate QR code:', error)
      throw new Error('Failed to generate QR code')
    }
  }

  /**
   * 生成二维码图片Buffer
   */
  async generateQRCodeBuffer(url: string): Promise<Buffer> {
    try {
      const qrCodeBuffer = await QRCode.toBuffer(url, {
        width: 200,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#FFFFFF'
        },
        errorCorrectionLevel: 'M'
      })
      return qrCodeBuffer
    } catch (error) {
      console.error('Failed to generate QR code buffer:', error)
      throw new Error('Failed to generate QR code buffer')
    }
  }

  /**
   * 获取平台特定的分享参数
   */
  getPlatformShareParams(platform: SharePlatform, content: ShareContent): Record<string, string> {
    switch (platform) {
      case SharePlatform.WECHAT:
        return {
          title: content.title,
          desc: content.description,
          link: content.url,
          imgUrl: content.imageUrl || ''
        }

      case SharePlatform.QQ:
        return {
          title: content.title,
          desc: content.description,
          share_url: content.url,
          image_url: content.imageUrl || ''
        }

      case SharePlatform.EMAIL:
        return {
          subject: content.title,
          body: `${content.description}\n\n邀请链接: ${content.url}`
        }

      default:
        return {
          title: content.title,
          text: content.description,
          url: content.url
        }
    }
  }

  /**
   * 更新平台模板
   */
  updatePlatformTemplate(platform: SharePlatform, template: ShareContentTemplate): void {
    this.platformTemplates.set(platform, template)
  }

  /**
   * 获取所有支持的平台
   */
  getSupportedPlatforms(): SharePlatform[] {
    return Array.from(this.platformTemplates.keys())
  }
}