declare module '../lib/invitation/services/ShareService' {
  import type { SharePlatform, ShareContent } from '../lib/invitation/types';
  import type { ShareSDKResult } from '../lib/invitation/services/ShareSDKIntegration';

  export interface ShareEventMetadata {
    method?: string;
    [key: string]: unknown;
  }

  export class ShareService {
    constructor(config?: Record<string, unknown>);

    getAvailablePlatforms(): SharePlatform[];

    isPlatformAvailable(platform: SharePlatform): boolean;

    shareWithSDK(inviteCode: string, platform: SharePlatform): Promise<ShareSDKResult>;

    generateShareContent(inviteCode: string, platform: SharePlatform): Promise<ShareContent>;

    getPlatformShareParams(platform: SharePlatform, content: ShareContent): Record<string, string>;

    trackShareEvent(inviteCode: string, platform: SharePlatform, metadata?: ShareEventMetadata): Promise<void>;

    generateTrackingUrl(inviteCode: string, platform: SharePlatform): Promise<string>;

    generateQRCode(inviteCode: string): Promise<string>;
  }
}
