/**
 * ShareContentGenerator 单元测试
 */

import { ShareContentGenerator } from '../../../../lib/invitation/services/ShareContentGenerator'
import { SharePlatform } from '../../../../lib/invitation/types'

// Mock QRCode module
jest.mock('qrcode', () => ({
  toDataURL: jest.fn(),
  toBuffer: jest.fn()
}))

describe('ShareContentGenerator', () => {
  let generator: ShareContentGenerator
  const mockBaseUrl = 'https://test.inspi.ai'
  const mockInviteCode = 'TEST123'

  beforeEach(() => {
    generator = new ShareContentGenerator(mockBaseUrl)
    jest.clearAllMocks()
  })

  describe('generateShareContent', () => {
    it('should generate WeChat share content correctly', async () => {
      const QRCode = require('qrcode')
      QRCode.toDataURL.mockResolvedValue('data:image/png;base64,mockqrcode')

      const content = await generator.generateShareContent(mockInviteCode, SharePlatform.WECHAT)

      expect(content).toMatchObject({
        title: '🎨 发现AI创作神器 - Inspi.AI',
        description: expect.stringContaining('我在使用Inspi.AI进行AI创作'),
        url: `${mockBaseUrl}/invite/${mockInviteCode}`,
        imageUrl: '/images/share/wechat-share.png',
        qrCodeUrl: 'data:image/png;base64,mockqrcode'
      })
    })

    it('should generate QQ share content correctly', async () => {
      const QRCode = require('qrcode')
      QRCode.toDataURL.mockResolvedValue('data:image/png;base64,mockqrcode')

      const content = await generator.generateShareContent(mockInviteCode, SharePlatform.QQ)

      expect(content).toMatchObject({
        title: '🚀 Inspi.AI - AI创作平台',
        description: expect.stringContaining('超好用的AI创作工具'),
        url: `${mockBaseUrl}/invite/${mockInviteCode}`,
        imageUrl: '/images/share/qq-share.png'
      })
    })

    it('should generate DingTalk share content correctly', async () => {
      const QRCode = require('qrcode')
      QRCode.toDataURL.mockResolvedValue('data:image/png;base64,mockqrcode')

      const content = await generator.generateShareContent(mockInviteCode, SharePlatform.DINGTALK)

      expect(content).toMatchObject({
        title: '📚 Inspi.AI - 教育AI创作平台',
        description: expect.stringContaining('专为教育工作者设计'),
        url: `${mockBaseUrl}/invite/${mockInviteCode}`,
        imageUrl: '/images/share/dingtalk-share.png'
      })
    })

    it('should generate WeWork share content correctly', async () => {
      const QRCode = require('qrcode')
      QRCode.toDataURL.mockResolvedValue('data:image/png;base64,mockqrcode')

      const content = await generator.generateShareContent(mockInviteCode, SharePlatform.WEWORK)

      expect(content).toMatchObject({
        title: '💼 Inspi.AI - 企业AI创作解决方案',
        description: expect.stringContaining('提升团队创作效率'),
        url: `${mockBaseUrl}/invite/${mockInviteCode}`,
        imageUrl: '/images/share/wework-share.png'
      })
    })

    it('should generate Email share content correctly', async () => {
      const QRCode = require('qrcode')
      QRCode.toDataURL.mockResolvedValue('data:image/png;base64,mockqrcode')

      const content = await generator.generateShareContent(mockInviteCode, SharePlatform.EMAIL)

      expect(content).toMatchObject({
        title: '邀请您体验Inspi.AI - AI创作平台',
        description: expect.stringContaining('您好！'),
        url: `${mockBaseUrl}/invite/${mockInviteCode}`,
        imageUrl: '/images/share/email-share.png'
      })
    })

    it('should generate Link share content correctly', async () => {
      const QRCode = require('qrcode')
      QRCode.toDataURL.mockResolvedValue('data:image/png;base64,mockqrcode')

      const content = await generator.generateShareContent(mockInviteCode, SharePlatform.LINK)

      expect(content).toMatchObject({
        title: 'Inspi.AI - AI创作平台邀请',
        description: expect.stringContaining('加入Inspi.AI'),
        url: `${mockBaseUrl}/invite/${mockInviteCode}`,
        imageUrl: '/images/share/default-share.png'
      })
    })

    it('should throw error for unsupported platform', async () => {
      await expect(
        generator.generateShareContent(mockInviteCode, 'unsupported' as SharePlatform)
      ).rejects.toThrow('Unsupported share platform: unsupported')
    })

    it('should handle QR code generation failure', async () => {
      const QRCode = require('qrcode')
      QRCode.toDataURL.mockRejectedValue(new Error('QR code generation failed'))

      await expect(
        generator.generateShareContent(mockInviteCode, SharePlatform.WECHAT)
      ).rejects.toThrow('Failed to generate QR code')
    })
  })

  describe('generateQRCodeDataUrl', () => {
    it('should generate QR code data URL correctly', async () => {
      const QRCode = require('qrcode')
      const mockDataUrl = 'data:image/png;base64,mockqrcode'
      QRCode.toDataURL.mockResolvedValue(mockDataUrl)

      const url = 'https://test.inspi.ai/invite/TEST123'
      const result = await generator.generateQRCodeDataUrl(url)

      expect(result).toBe(mockDataUrl)
      expect(QRCode.toDataURL).toHaveBeenCalledWith(url, {
        width: 200,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#FFFFFF'
        },
        errorCorrectionLevel: 'M'
      })
    })

    it('should handle QR code generation error', async () => {
      const QRCode = require('qrcode')
      QRCode.toDataURL.mockRejectedValue(new Error('Generation failed'))

      await expect(
        generator.generateQRCodeDataUrl('https://test.com')
      ).rejects.toThrow('Failed to generate QR code')
    })
  })

  describe('generateQRCodeBuffer', () => {
    it('should generate QR code buffer correctly', async () => {
      const QRCode = require('qrcode')
      const mockBuffer = Buffer.from('mock buffer')
      QRCode.toBuffer.mockResolvedValue(mockBuffer)

      const url = 'https://test.inspi.ai/invite/TEST123'
      const result = await generator.generateQRCodeBuffer(url)

      expect(result).toBe(mockBuffer)
      expect(QRCode.toBuffer).toHaveBeenCalledWith(url, {
        width: 200,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#FFFFFF'
        },
        errorCorrectionLevel: 'M'
      })
    })

    it('should handle buffer generation error', async () => {
      const QRCode = require('qrcode')
      QRCode.toBuffer.mockRejectedValue(new Error('Buffer generation failed'))

      await expect(
        generator.generateQRCodeBuffer('https://test.com')
      ).rejects.toThrow('Failed to generate QR code buffer')
    })
  })

  describe('getPlatformShareParams', () => {
    const mockContent = {
      title: 'Test Title',
      description: 'Test Description',
      url: 'https://test.com',
      imageUrl: 'https://test.com/image.png'
    }

    it('should return WeChat share parameters', () => {
      const params = generator.getPlatformShareParams(SharePlatform.WECHAT, mockContent)

      expect(params).toEqual({
        title: 'Test Title',
        desc: 'Test Description',
        link: 'https://test.com',
        imgUrl: 'https://test.com/image.png'
      })
    })

    it('should return QQ share parameters', () => {
      const params = generator.getPlatformShareParams(SharePlatform.QQ, mockContent)

      expect(params).toEqual({
        title: 'Test Title',
        desc: 'Test Description',
        share_url: 'https://test.com',
        image_url: 'https://test.com/image.png'
      })
    })

    it('should return Email share parameters', () => {
      const params = generator.getPlatformShareParams(SharePlatform.EMAIL, mockContent)

      expect(params).toEqual({
        subject: 'Test Title',
        body: 'Test Description\n\n邀请链接: https://test.com'
      })
    })

    it('should return default share parameters for other platforms', () => {
      const params = generator.getPlatformShareParams(SharePlatform.LINK, mockContent)

      expect(params).toEqual({
        title: 'Test Title',
        text: 'Test Description',
        url: 'https://test.com'
      })
    })
  })

  describe('updatePlatformTemplate', () => {
    it('should update platform template correctly', async () => {
      const newTemplate = {
        title: 'New Title',
        description: 'New Description',
        imageUrl: '/new-image.png'
      }

      generator.updatePlatformTemplate(SharePlatform.WECHAT, newTemplate)

      const QRCode = require('qrcode')
      QRCode.toDataURL.mockResolvedValue('data:image/png;base64,mockqrcode')

      const content = await generator.generateShareContent(mockInviteCode, SharePlatform.WECHAT)

      expect(content.title).toBe('New Title')
      expect(content.description).toBe('New Description')
      expect(content.imageUrl).toBe('/new-image.png')
    })
  })

  describe('getSupportedPlatforms', () => {
    it('should return all supported platforms', () => {
      const platforms = generator.getSupportedPlatforms()

      expect(platforms).toContain(SharePlatform.WECHAT)
      expect(platforms).toContain(SharePlatform.QQ)
      expect(platforms).toContain(SharePlatform.DINGTALK)
      expect(platforms).toContain(SharePlatform.WEWORK)
      expect(platforms).toContain(SharePlatform.EMAIL)
      expect(platforms).toContain(SharePlatform.LINK)
      expect(platforms).toHaveLength(6)
    })
  })

  describe('personalizeDescription', () => {
    it('should replace invite code placeholder in description', async () => {
      // Update template to include placeholder
      generator.updatePlatformTemplate(SharePlatform.WECHAT, {
        title: 'Test Title',
        description: 'Use invite code: {{inviteCode}}',
        imageUrl: '/test.png'
      })

      const QRCode = require('qrcode')
      QRCode.toDataURL.mockResolvedValue('data:image/png;base64,mockqrcode')

      const content = await generator.generateShareContent(mockInviteCode, SharePlatform.WECHAT)

      expect(content.description).toBe(`Use invite code: ${mockInviteCode}`)
    })
  })
})