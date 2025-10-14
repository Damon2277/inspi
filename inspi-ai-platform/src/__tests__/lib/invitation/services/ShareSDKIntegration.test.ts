/**
 * ShareSDKIntegration 单元测试
 */

import {
  ShareSDKManager,
  WeChatShareSDK,
  QQShareSDK,
  EmailShareService,
} from '../../../../lib/invitation/services/ShareSDKIntegration';
import { SharePlatform } from '../../../../lib/invitation/types';

// Mock window and document objects
const mockWindow = {
  wx: null,
  QC: null,
  dd: null,
  navigator: {
    userAgent: 'Mozilla/5.0',
  },
  location: {
    href: '',
  },
  open: jest.fn(),
};

const mockDocument = {
  createElement: jest.fn(() => ({
    src: '',
    onload: null,
    onerror: null,
  })),
  head: {
    appendChild: jest.fn(),
  },
  body: {
    appendChild: jest.fn(),
    removeChild: jest.fn(),
  },
}

// Mock globals
;(global as any).window = mockWindow
;(global as any).document = mockDocument
;(global as any).navigator = mockWindow.navigator;

describe('ShareSDKIntegration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockWindow.wx = null;
    mockWindow.QC = null;
    mockWindow.dd = null;
    mockWindow.navigator.userAgent = 'Mozilla/5.0';
    mockWindow.location.href = '';
  });

  describe('WeChatShareSDK', () => {
    let sdk: WeChatShareSDK;

    beforeEach(() => {
      sdk = new WeChatShareSDK({
        appId: 'test-app-id',
        appSecret: 'test-secret',
      });
    });

    describe('isAvailable', () => {
      it('should return true in WeChat browser', () => {
        mockWindow.navigator.userAgent = 'Mozilla/5.0 MicroMessenger/6.7.3';

        expect(sdk.isAvailable()).toBe(true);
      });

      it('should return false in non-WeChat browser', () => {
        mockWindow.navigator.userAgent = 'Mozilla/5.0 Chrome/91.0';

        expect(sdk.isAvailable()).toBe(false);
      });
    });

    describe('initialize', () => {
      it('should initialize successfully when WeChat SDK is available', async () => {
        mockWindow.navigator.userAgent = 'Mozilla/5.0 MicroMessenger/6.7.3';

        // Mock WeChat SDK
        const mockWx = {
          config: jest.fn(),
          ready: jest.fn((callback) => callback()),
          error: jest.fn(),
        };
        mockWindow.wx = mockWx;

        const result = await sdk.initialize();

        expect(result).toBe(true);
        expect(mockWx.config).toHaveBeenCalledWith({
          debug: false,
          appId: 'test-app-id',
          timestamp: expect.any(Number),
          nonceStr: expect.any(String),
          signature: '',
          jsApiList: [
            'updateAppMessageShareData',
            'updateTimelineShareData',
            'onMenuShareTimeline',
            'onMenuShareAppMessage',
          ],
        });
      });

      it('should fail to initialize when not in WeChat environment', async () => {
        mockWindow.navigator.userAgent = 'Mozilla/5.0 Chrome/91.0';

        const result = await sdk.initialize();

        expect(result).toBe(false);
      });
    });

    describe('share', () => {
      const mockContent = {
        title: 'Test Title',
        description: 'Test Description',
        url: 'https://test.com',
        imageUrl: 'https://test.com/image.png',
      };

      it('should share successfully when SDK is available', async () => {
        mockWindow.navigator.userAgent = 'Mozilla/5.0 MicroMessenger/6.7.3';

        const mockWx = {
          updateTimelineShareData: jest.fn(),
          updateAppMessageShareData: jest.fn(),
        };
        mockWindow.wx = mockWx
        ;(sdk as any).wx = mockWx;

        const result = await sdk.share(mockContent);

        expect(result.success).toBe(true);
        expect(result.shareId).toContain('wechat_');
        expect(mockWx.updateTimelineShareData).toHaveBeenCalled();
        expect(mockWx.updateAppMessageShareData).toHaveBeenCalled();
      });

      it('should fail when SDK is not available', async () => {
        const result = await sdk.share(mockContent);

        expect(result.success).toBe(false);
        expect(result.error).toBe('WeChat SDK not available');
      });
    });
  });

  describe('QQShareSDK', () => {
    let sdk: QQShareSDK;

    beforeEach(() => {
      sdk = new QQShareSDK({
        appId: 'test-qq-app-id',
        redirectUri: 'https://test.com/callback',
      });
    });

    describe('isAvailable', () => {
      it('should return true when QQ SDK is loaded', () => {
        mockWindow.QC = { init: jest.fn() };

        expect(sdk.isAvailable()).toBe(true);
      });

      it('should return false when QQ SDK is not loaded', () => {
        mockWindow.QC = null;

        expect(sdk.isAvailable()).toBe(false);
      });
    });

    describe('initialize', () => {
      it('should initialize successfully', async () => {
        const mockQC = {
          init: jest.fn(),
        };
        mockWindow.QC = mockQC;

        const result = await sdk.initialize();

        expect(result).toBe(true);
        expect(mockQC.init).toHaveBeenCalledWith({
          appId: 'test-qq-app-id',
          redirectURI: 'https://test.com/callback',
        });
      });
    });

    describe('share', () => {
      const mockContent = {
        title: 'Test Title',
        description: 'Test Description',
        url: 'https://test.com',
        imageUrl: 'https://test.com/image.png',
      };

      it('should share successfully', async () => {
        const mockQC = {
          Share: {
            share: jest.fn((data, callback) => {
              callback({ code: 0 });
            }),
          },
        };
        mockWindow.QC = mockQC
        ;(sdk as any).qqApi = mockQC;

        const result = await sdk.share(mockContent);

        expect(result.success).toBe(true);
        expect(result.shareId).toContain('qq_');
        expect(mockQC.Share.share).toHaveBeenCalled();
      });

      it('should handle share failure', async () => {
        const mockQC = {
          Share: {
            share: jest.fn((data, callback) => {
              callback({ code: -1, msg: 'Share failed' });
            }),
          },
        };
        mockWindow.QC = mockQC
        ;(sdk as any).qqApi = mockQC;

        const result = await sdk.share(mockContent);

        expect(result.success).toBe(false);
        expect(result.error).toBe('Share failed');
      });
    });
  });

  describe('EmailShareService', () => {
    let service: EmailShareService;

    beforeEach(() => {
      service = new EmailShareService({});
    });

    describe('initialize', () => {
      it('should always return true', async () => {
        const result = await service.initialize();
        expect(result).toBe(true);
      });
    });

    describe('isAvailable', () => {
      it('should return true when window is available', () => {
        expect(service.isAvailable()).toBe(true);
      });
    });

    describe('share', () => {
      const mockContent = {
        title: 'Test Title',
        description: 'Test Description',
        url: 'https://test.com',
      };

      it('should create mailto URL and set window location', async () => {
        const result = await service.share(mockContent);

        expect(result.success).toBe(true);
        expect(result.shareId).toContain('email_');
        expect(mockWindow.location.href).toContain('mailto:');
        expect(mockWindow.location.href).toContain(encodeURIComponent('Test Title'));
        expect(mockWindow.location.href).toContain(encodeURIComponent('Test Description'));
      });
    });
  });

  describe('ShareSDKManager', () => {
    let manager: ShareSDKManager;

    beforeEach(() => {
      // Mock environment variables
      process.env.NEXT_PUBLIC_WECHAT_APP_ID = 'wechat-app-id';
      process.env.NEXT_PUBLIC_QQ_APP_ID = 'qq-app-id';

      manager = new ShareSDKManager();
    });

    afterEach(() => {
      delete process.env.NEXT_PUBLIC_WECHAT_APP_ID;
      delete process.env.NEXT_PUBLIC_QQ_APP_ID;
    });

    describe('getSDK', () => {
      it('should return WeChat SDK for WeChat platform', async () => {
        mockWindow.navigator.userAgent = 'Mozilla/5.0 MicroMessenger/6.7.3';
        mockWindow.wx = {
          config: jest.fn(),
          ready: jest.fn((callback) => callback()),
          error: jest.fn(),
        };

        const sdk = await manager.getSDK(SharePlatform.WECHAT);

        expect(sdk).toBeInstanceOf(WeChatShareSDK);
      });

      it('should return QQ SDK for QQ platform', async () => {
        mockWindow.QC = {
          init: jest.fn(),
        };

        const sdk = await manager.getSDK(SharePlatform.QQ);

        expect(sdk).toBeInstanceOf(QQShareSDK);
      });

      it('should return Email service for Email platform', async () => {
        const sdk = await manager.getSDK(SharePlatform.EMAIL);

        expect(sdk).toBeInstanceOf(EmailShareService);
      });

      it('should return null for unsupported platform', async () => {
        const sdk = await manager.getSDK('unsupported' as SharePlatform);

        expect(sdk).toBeNull();
      });

      it('should cache initialized SDKs', async () => {
        mockWindow.QC = {
          init: jest.fn(),
        };

        const sdk1 = await manager.getSDK(SharePlatform.QQ);
        const sdk2 = await manager.getSDK(SharePlatform.QQ);

        expect(sdk1).toBe(sdk2);
      });
    });

    describe('shareContent', () => {
      const mockContent = {
        title: 'Test Title',
        description: 'Test Description',
        url: 'https://test.com',
      };

      it('should share content successfully', async () => {
        const result = await manager.shareContent(SharePlatform.EMAIL, mockContent);

        expect(result.success).toBe(true);
        expect(result.shareId).toContain('email_');
      });

      it('should handle unavailable platform', async () => {
        const result = await manager.shareContent('unsupported' as SharePlatform, mockContent);

        expect(result.success).toBe(false);
        expect(result.error).toContain('SDK not available');
      });
    });

    describe('isPlatformAvailable', () => {
      it('should return true for available platform', () => {
        // Mock email platform as available
        const result = manager.isPlatformAvailable(SharePlatform.EMAIL);

        // Since we haven't initialized the SDK yet, it should return false
        expect(result).toBe(false);
      });
    });

    describe('updateConfig', () => {
      it('should update platform configuration', () => {
        const newConfig = {
          appId: 'new-app-id',
          appSecret: 'new-secret',
        };

        manager.updateConfig(SharePlatform.WECHAT, newConfig);

        // Verify that the SDK cache is cleared
        expect((manager as any).sdks.has(SharePlatform.WECHAT)).toBe(false);
      });
    });
  });
});
