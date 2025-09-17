/**
 * 第三方分享SDK类型声明
 */

// 微信SDK类型声明
declare global {
  interface Window {
    wx?: {
      config: (config: {
        debug: boolean
        appId: string
        timestamp: number
        nonceStr: string
        signature: string
        jsApiList: string[]
      }) => void
      ready: (callback: () => void) => void
      error: (callback: (error: any) => void) => void
      updateAppMessageShareData: (data: WeChatShareData) => void
      updateTimelineShareData: (data: WeChatShareData) => void
      onMenuShareTimeline: (data: WeChatShareData) => void
      onMenuShareAppMessage: (data: WeChatShareData) => void
    }

    // QQ SDK类型声明
    QC?: {
      init: (config: { appId: string; redirectURI: string }) => void
      Share: {
        share: (data: QQShareData, callback: (result: any) => void) => void
      }
    }

    // 钉钉SDK类型声明
    dd?: {
      config: (config: {
        agentId: string
        corpId: string
        timeStamp: number
        nonceStr: string
        signature: string
        jsApiList: string[]
      }) => void
      ready: (callback: () => void) => void
      error: (callback: (error: any) => void) => void
      biz: {
        util: {
          share: (data: DingTalkShareData) => void
        }
      }
    }
  }
}

interface WeChatShareData {
  title: string
  desc: string
  link: string
  imgUrl: string
  success?: () => void
  cancel?: () => void
  fail?: (error: any) => void
}

interface QQShareData {
  url: string
  title: string
  desc: string
  summary: string
  pics: string
  flash: string
  site: string
  style: string
  width: number
  height: number
}

interface DingTalkShareData {
  type: number
  url: string
  title: string
  content: string
  image: string
  onSuccess?: () => void
  onFail?: (error: any) => void
}

export {}