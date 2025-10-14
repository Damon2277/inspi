declare module '../lib/invitation/types' {
  export enum SharePlatform {
    WECHAT = 'wechat',
    QQ = 'qq',
    DINGTALK = 'dingtalk',
    WEWORK = 'wework',
    EMAIL = 'email',
    LINK = 'link'
  }

  export interface ShareContent {
    title: string;
    description?: string;
    url: string;
    imageUrl?: string;
    qrCodeUrl?: string;
    metadata?: Record<string, unknown>;
  }

  export interface ShareAnalyticsEvent {
    inviteCode: string;
    platform: SharePlatform;
    timestamp: number;
    metadata?: Record<string, unknown>;
  }
}
