declare module '../lib/invitation/services/ShareSDKIntegration' {
  import type { SharePlatform, ShareContent } from '../lib/invitation/types';

  export interface ShareSDKResult {
    success: boolean;
    error?: string;
    shareId?: string;
  }

  export interface ShareSDKConfig {
    appId?: string;
    appKey?: string;
    appSecret?: string;
    redirectUri?: string;
    [key: string]: unknown;
  }

  export interface ShareSDKManager {
    initialize(): Promise<boolean>;
    isInitialized(): boolean;
    getAvailablePlatforms(): SharePlatform[];
    share(inviteCode: string, platform: SharePlatform, content: ShareContent): Promise<ShareSDKResult>;
  }
}
