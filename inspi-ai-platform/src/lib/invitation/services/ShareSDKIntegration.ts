/**
 * 第三方分享SDK集成服务
 * 提供各平台的分享SDK集成功能
 */

import { SharePlatform, ShareContent } from '../types'

export interface ShareSDKResult {
  success: boolean
  error?: string
  shareId?: string
}

export interface ShareSDKConfig {
  appId?: string
  appKey?: string
  appSecret?: string
  redirectUri?: string
}

export abstract class BaseShareSDK {
  protected config: ShareSDKConfig

  constructor(config: ShareSDKConfig) {
    this.config = config
  }

  abstract initialize(): Promise<boolean>
  abstract share(content: ShareContent): Promise<ShareSDKResult>
  abstract isAvailable(): boolean
}

/**
 * 微信分享SDK
 */
export class WeChatShareSDK extends BaseShareSDK {
  private wx: any = null

  async initialize(): Promise<boolean> {
    try {
      // 检查是否在微信环境中
      if (typeof window === 'undefined') {
        return false
      }

      // 动态加载微信JS-SDK
      if (!window.wx) {
        await this.loadWeChatSDK()
      }

      this.wx = window.wx

      // 配置微信JS-SDK
      this.wx.config({
        debug: false,
        appId: this.config.appId,
        timestamp: Math.floor(Date.now() / 1000),
        nonceStr: this.generateNonceStr(),
        signature: await this.getSignature(),
        jsApiList: [
          'updateAppMessageShareData',
          'updateTimelineShareData',
          'onMenuShareTimeline',
          'onMenuShareAppMessage'
        ]
      })

      return new Promise((resolve) => {
        this.wx.ready(() => {
          resolve(true)
        })
        this.wx.error(() => {
          resolve(false)
        })
      })
    } catch (error) {
      console.error('WeChat SDK initialization failed:', error)
      return false
    }
  }

  async share(content: ShareContent): Promise<ShareSDKResult> {
    if (!this.wx || !this.isAvailable()) {
      return {
        success: false,
        error: 'WeChat SDK not available'
      }
    }

    try {
      const shareData = {
        title: content.title,
        desc: content.description,
        link: content.url,
        imgUrl: content.imageUrl || '',
        success: () => {
          console.log('WeChat share success')
        },
        cancel: () => {
          console.log('WeChat share cancelled')
        },
        fail: (error: any) => {
          console.error('WeChat share failed:', error)
        }
      }

      // 分享到朋友圈
      this.wx.updateTimelineShareData(shareData)
      
      // 分享给朋友
      this.wx.updateAppMessageShareData(shareData)

      return {
        success: true,
        shareId: `wechat_${Date.now()}`
      }
    } catch (error) {
      return {
        success: false,
        error: `WeChat share failed: ${error}`
      }
    }
  }

  isAvailable(): boolean {
    if (typeof window === 'undefined') return false
    
    // 检查是否在微信浏览器中
    const ua = window.navigator.userAgent.toLowerCase()
    return ua.includes('micromessenger')
  }

  private async loadWeChatSDK(): Promise<void> {
    return new Promise((resolve, reject) => {
      const script = document.createElement('script')
      script.src = 'https://res.wx.qq.com/open/js/jweixin-1.6.0.js'
      script.onload = () => resolve()
      script.onerror = () => reject(new Error('Failed to load WeChat SDK'))
      document.head.appendChild(script)
    })
  }

  private generateNonceStr(): string {
    return Math.random().toString(36).substr(2, 15)
  }

  private async getSignature(): Promise<string> {
    // 这里需要调用后端API获取签名
    // 为了演示，返回空字符串
    return ''
  }
}

/**
 * QQ分享SDK
 */
export class QQShareSDK extends BaseShareSDK {
  private qqApi: any = null

  async initialize(): Promise<boolean> {
    try {
      if (typeof window === 'undefined') {
        return false
      }

      // 动态加载QQ分享SDK
      if (!window.QC) {
        await this.loadQQSDK()
      }

      this.qqApi = window.QC

      // 初始化QQ SDK
      this.qqApi.init({
        appId: this.config.appId,
        redirectURI: this.config.redirectUri
      })

      return true
    } catch (error) {
      console.error('QQ SDK initialization failed:', error)
      return false
    }
  }

  async share(content: ShareContent): Promise<ShareSDKResult> {
    if (!this.qqApi || !this.isAvailable()) {
      return {
        success: false,
        error: 'QQ SDK not available'
      }
    }

    try {
      const shareData = {
        url: content.url,
        title: content.title,
        desc: content.description,
        summary: content.description,
        pics: content.imageUrl || '',
        flash: '',
        site: 'Inspi.AI',
        style: '203',
        width: 98,
        height: 22
      }

      return new Promise((resolve) => {
        this.qqApi.Share.share(shareData, (result: any) => {
          if (result.code === 0) {
            resolve({
              success: true,
              shareId: `qq_${Date.now()}`
            })
          } else {
            resolve({
              success: false,
              error: result.msg || 'QQ share failed'
            })
          }
        })
      })
    } catch (error) {
      return {
        success: false,
        error: `QQ share failed: ${error}`
      }
    }
  }

  isAvailable(): boolean {
    if (typeof window === 'undefined') return false
    return !!window.QC
  }

  private async loadQQSDK(): Promise<void> {
    return new Promise((resolve, reject) => {
      const script = document.createElement('script')
      script.src = 'https://qzonestyle.gtimg.cn/qzone/openapi/qc_loader.js'
      script.onload = () => resolve()
      script.onerror = () => reject(new Error('Failed to load QQ SDK'))
      document.head.appendChild(script)
    })
  }
}

/**
 * 钉钉分享SDK
 */
export class DingTalkShareSDK extends BaseShareSDK {
  private dd: any = null

  async initialize(): Promise<boolean> {
    try {
      if (typeof window === 'undefined') {
        return false
      }

      // 动态加载钉钉SDK
      if (!window.dd) {
        await this.loadDingTalkSDK()
      }

      this.dd = window.dd

      // 配置钉钉SDK
      this.dd.config({
        agentId: this.config.appId,
        corpId: this.config.appKey,
        timeStamp: Math.floor(Date.now() / 1000),
        nonceStr: this.generateNonceStr(),
        signature: await this.getSignature(),
        jsApiList: [
          'biz.util.share'
        ]
      })

      return new Promise((resolve) => {
        this.dd.ready(() => {
          resolve(true)
        })
        this.dd.error(() => {
          resolve(false)
        })
      })
    } catch (error) {
      console.error('DingTalk SDK initialization failed:', error)
      return false
    }
  }

  async share(content: ShareContent): Promise<ShareSDKResult> {
    if (!this.dd || !this.isAvailable()) {
      return {
        success: false,
        error: 'DingTalk SDK not available'
      }
    }

    try {
      const shareData = {
        type: 0, // 分享网页
        url: content.url,
        title: content.title,
        content: content.description,
        image: content.imageUrl || ''
      }

      return new Promise((resolve) => {
        this.dd.biz.util.share({
          type: shareData.type,
          url: shareData.url,
          title: shareData.title,
          content: shareData.content,
          image: shareData.image,
          onSuccess: () => {
            resolve({
              success: true,
              shareId: `dingtalk_${Date.now()}`
            })
          },
          onFail: (error: any) => {
            resolve({
              success: false,
              error: error.errorMessage || 'DingTalk share failed'
            })
          }
        })
      })
    } catch (error) {
      return {
        success: false,
        error: `DingTalk share failed: ${error}`
      }
    }
  }

  isAvailable(): boolean {
    if (typeof window === 'undefined') return false
    
    // 检查是否在钉钉环境中
    const ua = window.navigator.userAgent.toLowerCase()
    return ua.includes('dingtalk')
  }

  private async loadDingTalkSDK(): Promise<void> {
    return new Promise((resolve, reject) => {
      const script = document.createElement('script')
      script.src = 'https://g.alicdn.com/dingding/dinglogin/0.0.5/ddLogin.js'
      script.onload = () => resolve()
      script.onerror = () => reject(new Error('Failed to load DingTalk SDK'))
      document.head.appendChild(script)
    })
  }

  private generateNonceStr(): string {
    return Math.random().toString(36).substr(2, 15)
  }

  private async getSignature(): Promise<string> {
    // 这里需要调用后端API获取签名
    return ''
  }
}

/**
 * 企业微信分享SDK
 */
export class WeWorkShareSDK extends BaseShareSDK {
  private wwApi: any = null

  async initialize(): Promise<boolean> {
    try {
      if (typeof window === 'undefined') {
        return false
      }

      // 动态加载企业微信SDK
      if (!window.wx) {
        await this.loadWeWorkSDK()
      }

      this.wwApi = window.wx

      // 配置企业微信SDK
      this.wwApi.config({
        beta: true,
        debug: false,
        appId: this.config.appId,
        timestamp: Math.floor(Date.now() / 1000),
        nonceStr: this.generateNonceStr(),
        signature: await this.getSignature(),
        jsApiList: [
          'agentConfig',
          'selectExternalContact',
          'getCurExternalContact',
          'shareToExternalContact'
        ]
      })

      return new Promise((resolve) => {
        this.wwApi.ready(() => {
          resolve(true)
        })
        this.wwApi.error(() => {
          resolve(false)
        })
      })
    } catch (error) {
      console.error('WeWork SDK initialization failed:', error)
      return false
    }
  }

  async share(content: ShareContent): Promise<ShareSDKResult> {
    if (!this.wwApi || !this.isAvailable()) {
      return {
        success: false,
        error: 'WeWork SDK not available'
      }
    }

    try {
      const shareData = {
        type: 'link',
        url: content.url,
        title: content.title,
        desc: content.description,
        imgUrl: content.imageUrl || ''
      }

      return new Promise((resolve) => {
        this.wwApi.shareToExternalContact({
          type: shareData.type,
          url: shareData.url,
          title: shareData.title,
          desc: shareData.desc,
          imgUrl: shareData.imgUrl,
          success: () => {
            resolve({
              success: true,
              shareId: `wework_${Date.now()}`
            })
          },
          fail: (error: any) => {
            resolve({
              success: false,
              error: error.errMsg || 'WeWork share failed'
            })
          }
        })
      })
    } catch (error) {
      return {
        success: false,
        error: `WeWork share failed: ${error}`
      }
    }
  }

  isAvailable(): boolean {
    if (typeof window === 'undefined') return false
    
    // 检查是否在企业微信环境中
    const ua = window.navigator.userAgent.toLowerCase()
    return ua.includes('wxwork')
  }

  private async loadWeWorkSDK(): Promise<void> {
    return new Promise((resolve, reject) => {
      const script = document.createElement('script')
      script.src = 'https://res.wx.qq.com/open/js/jweixin-1.2.0.js'
      script.onload = () => resolve()
      script.onerror = () => reject(new Error('Failed to load WeWork SDK'))
      document.head.appendChild(script)
    })
  }

  private generateNonceStr(): string {
    return Math.random().toString(36).substr(2, 15)
  }

  private async getSignature(): Promise<string> {
    // 这里需要调用后端API获取签名
    return ''
  }
}

/**
 * 邮件分享服务
 */
export class EmailShareService extends BaseShareSDK {
  async initialize(): Promise<boolean> {
    return true // 邮件分享不需要初始化
  }

  async share(content: ShareContent): Promise<ShareSDKResult> {
    try {
      const subject = encodeURIComponent(content.title)
      const body = encodeURIComponent(`${content.description}\n\n邀请链接: ${content.url}`)
      
      const mailtoUrl = `mailto:?subject=${subject}&body=${body}`
      
      if (typeof window !== 'undefined') {
        window.location.href = mailtoUrl
      }

      return {
        success: true,
        shareId: `email_${Date.now()}`
      }
    } catch (error) {
      return {
        success: false,
        error: `Email share failed: ${error}`
      }
    }
  }

  isAvailable(): boolean {
    return typeof window !== 'undefined'
  }
}

/**
 * 分享SDK管理器
 */
export class ShareSDKManager {
  private sdks: Map<SharePlatform, BaseShareSDK> = new Map()
  private configs: Map<SharePlatform, ShareSDKConfig> = new Map()

  constructor() {
    this.initializeConfigs()
  }

  private initializeConfigs(): void {
    // 从环境变量或配置文件加载SDK配置
    this.configs.set(SharePlatform.WECHAT, {
      appId: process.env.NEXT_PUBLIC_WECHAT_APP_ID || '',
      appSecret: process.env.WECHAT_APP_SECRET || ''
    })

    this.configs.set(SharePlatform.QQ, {
      appId: process.env.NEXT_PUBLIC_QQ_APP_ID || '',
      redirectUri: process.env.NEXT_PUBLIC_QQ_REDIRECT_URI || ''
    })

    this.configs.set(SharePlatform.DINGTALK, {
      appId: process.env.NEXT_PUBLIC_DINGTALK_AGENT_ID || '',
      appKey: process.env.NEXT_PUBLIC_DINGTALK_CORP_ID || ''
    })

    this.configs.set(SharePlatform.WEWORK, {
      appId: process.env.NEXT_PUBLIC_WEWORK_CORP_ID || '',
      appSecret: process.env.WEWORK_CORP_SECRET || ''
    })
  }

  async getSDK(platform: SharePlatform): Promise<BaseShareSDK | null> {
    if (this.sdks.has(platform)) {
      return this.sdks.get(platform)!
    }

    const config = this.configs.get(platform)
    if (!config) {
      console.warn(`No configuration found for platform: ${platform}`)
      return null
    }

    let sdk: BaseShareSDK

    switch (platform) {
      case SharePlatform.WECHAT:
        sdk = new WeChatShareSDK(config)
        break
      case SharePlatform.QQ:
        sdk = new QQShareSDK(config)
        break
      case SharePlatform.DINGTALK:
        sdk = new DingTalkShareSDK(config)
        break
      case SharePlatform.WEWORK:
        sdk = new WeWorkShareSDK(config)
        break
      case SharePlatform.EMAIL:
        sdk = new EmailShareService(config)
        break
      default:
        return null
    }

    const initialized = await sdk.initialize()
    if (initialized) {
      this.sdks.set(platform, sdk)
      return sdk
    }

    return null
  }

  async shareContent(platform: SharePlatform, content: ShareContent): Promise<ShareSDKResult> {
    const sdk = await this.getSDK(platform)
    if (!sdk) {
      return {
        success: false,
        error: `SDK not available for platform: ${platform}`
      }
    }

    if (!sdk.isAvailable()) {
      return {
        success: false,
        error: `Platform ${platform} is not available in current environment`
      }
    }

    return await sdk.share(content)
  }

  isPlatformAvailable(platform: SharePlatform): boolean {
    const sdk = this.sdks.get(platform)
    return sdk ? sdk.isAvailable() : false
  }

  getAvailablePlatforms(): SharePlatform[] {
    const platforms: SharePlatform[] = []
    
    for (const platform of Object.values(SharePlatform)) {
      if (this.isPlatformAvailable(platform)) {
        platforms.push(platform)
      }
    }

    return platforms
  }

  updateConfig(platform: SharePlatform, config: ShareSDKConfig): void {
    this.configs.set(platform, config)
    // 移除已缓存的SDK，强制重新初始化
    this.sdks.delete(platform)
  }
}