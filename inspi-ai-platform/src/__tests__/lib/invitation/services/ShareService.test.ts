/**
 * ShareService 单元测试
 */

import { ShareService } from '../../../../lib/invitation/services/ShareService'
import { SharePlatform } from '../../../../lib/invitation/types'
import { DatabaseService } from '../../../../lib/invitation/database'

// Mock dependencies
jest.mock('../../../../lib/invitation/services/ShareContentGenerator', () => ({
  ShareContentGenerator: jest.fn().mockImplementation(() => ({
    generateShareContent: jest.fn(),
    generateQRCodeDataUrl: jest.fn(),
    getPlatformShareParams: jest.fn(),
    getSupportedPlatforms: jest.fn()
  }))
}))

jest.mock('../../../../lib/invitation/services/ShareTrackingService', () => ({
  ShareTrackingService: jest.fn().mockImplementation(() => ({
    trackShareEvent: jest.fn(),
    trackClickEvent: jest.fn(),
    getShareStats: jest.fn(),
    getTopSharedInvites: jest.fn(),
    getPlatformShareStats: jest.fn()
  }))
}))

const mockDb = {
  query: jest.fn(),
  queryOne: jest.fn(),
  execute: jest.fn()
} as jest.Mocked<DatabaseService>

describe('ShareService', () => {
  let service: ShareService
  let mockContentGenerator: any
  let mockTrackingService: any
  const mockInviteCode = 'TEST123'
  const mockInviteCodeId = 'invite-123'
  const mockPlatform = SharePlatform.WECHAT
  const mockBaseUrl = 'https://test.inspi.ai'

  beforeEach(() => {
    // Set environment variable for testing
    process.env.NEXT_PUBLIC_BASE_URL = mockBaseUrl
    
    // Get mock instances
    const { ShareContentGenerator } = require('../../../../lib/invitation/services/ShareContentGenerator')
    const { ShareTrackingService } = require('../../../../lib/invitation/services/ShareTrackingService')
    
    service = new ShareService(mockDb, mockBaseUrl)
    
    // Get the mock instances created by the service
    mockContentGenerator = (service as any).contentGenerator
    mockTrackingService = (service as any).trackingService
    
    jest.clearAllMocks()
  })

  afterEach(() => {
    delete process.env.NEXT_PUBLIC_BASE_URL
  })

  describe('generateShareContent', () => {
    it('should generate share content successfully', async () => {
      const mockContent = {
        title: 'Test Title',
        description: 'Test Description',
        url: `${mockBaseUrl}/invite/${mockInviteCode}`,
        imageUrl: '/test-image.png',
        qrCodeUrl: 'data:image/png;base64,mockqr'
      }

      mockContentGenerator.generateShareContent.mockResolvedValue(mockContent)

      const result = await service.generateShareContent(mockInviteCode, mockPlatform)

      expect(result).toMatchObject({
        title: 'Test Title',
        description: 'Test Description',
        url: expect.stringContaining(`/invite/${mockInviteCode}`),
        imageUrl: '/test-image.png'
      })

      // URL should include tracking parameters
      expect(result.url).toContain('utm_source=invite')
      expect(result.url).toContain(`utm_medium=${mockPlatform}`)
      expect(result.url).toContain('utm_campaign=user_invitation')
      expect(result.url).toContain(`ref=${mockInviteCode}`)
    })

    it('should handle content generation error', async () => {
      mockContentGenerator.generateShareContent.mockRejectedValue(new Error('Generation failed'))

      await expect(
        service.generateShareContent(mockInviteCode, mockPlatform)
      ).rejects.toThrow(`Failed to generate share content for platform ${mockPlatform}`)
    })
  })

  describe('generateQRCode', () => {
    it('should generate QR code successfully', async () => {
      const mockQRCode = 'data:image/png;base64,mockqrcode'

      mockContentGenerator.generateQRCodeDataUrl.mockResolvedValue(mockQRCode)

      const result = await service.generateQRCode(mockInviteCode)

      expect(result).toBe(mockQRCode)
      expect(mockContentGenerator.generateQRCodeDataUrl).toHaveBeenCalledWith(
        expect.stringContaining(`/invite/${mockInviteCode}`)
      )
    })

    it('should handle QR code generation error', async () => {
      mockContentGenerator.generateQRCodeDataUrl.mockRejectedValue(new Error('QR generation failed'))

      await expect(
        service.generateQRCode(mockInviteCode)
      ).rejects.toThrow('Failed to generate QR code')
    })
  })

  describe('getShareStats', () => {
    it('should return share statistics successfully', async () => {
      const mockStats = [
        {
          inviteCodeId: mockInviteCodeId,
          platform: SharePlatform.WECHAT,
          shareCount: 5,
          clickCount: 15,
          conversionCount: 3
        }
      ]

      mockTrackingService.getShareStats.mockResolvedValue(mockStats)

      const result = await service.getShareStats(mockInviteCodeId)

      expect(result).toEqual(mockStats)
      expect(mockTrackingService.getShareStats).toHaveBeenCalledWith(mockInviteCodeId)
    })

    it('should handle stats retrieval error', async () => {
      mockTrackingService.getShareStats.mockRejectedValue(new Error('Stats error'))

      await expect(
        service.getShareStats(mockInviteCodeId)
      ).rejects.toThrow('Failed to get share statistics')
    })
  })

  describe('trackShareEvent', () => {
    it('should track share event successfully', async () => {
      mockTrackingService.trackShareEvent.mockResolvedValue(undefined)

      const metadata = { source: 'button' }

      await service.trackShareEvent(mockInviteCodeId, mockPlatform, metadata)

      expect(mockTrackingService.trackShareEvent).toHaveBeenCalledWith(
        mockInviteCodeId,
        mockPlatform,
        metadata
      )
    })

    it('should not throw error when tracking fails', async () => {
      mockTrackingService.trackShareEvent.mockRejectedValue(new Error('Tracking failed'))

      // Should not throw error
      await expect(
        service.trackShareEvent(mockInviteCodeId, mockPlatform)
      ).resolves.toBeUndefined()
    })
  })

  describe('trackClickEvent', () => {
    it('should track click event successfully', async () => {
      mockTrackingService.trackClickEvent.mockResolvedValue(undefined)

      const ipAddress = '192.168.1.1'
      const userAgent = 'Mozilla/5.0'

      await service.trackClickEvent(mockInviteCodeId, mockPlatform, ipAddress, userAgent)

      expect(mockTrackingService.trackClickEvent).toHaveBeenCalledWith(
        mockInviteCodeId,
        mockPlatform,
        ipAddress,
        userAgent
      )
    })

    it('should not throw error when tracking fails', async () => {
      mockTrackingService.trackClickEvent.mockRejectedValue(new Error('Tracking failed'))

      // Should not throw error
      await expect(
        service.trackClickEvent(mockInviteCodeId, mockPlatform)
      ).resolves.toBeUndefined()
    })
  })

  describe('generateTrackingUrl', () => {
    it('should generate tracking URL with correct parameters', async () => {
      const result = await service.generateTrackingUrl(mockInviteCode, mockPlatform)

      expect(result).toContain(`${mockBaseUrl}/invite/${mockInviteCode}`)
      expect(result).toContain('utm_source=invite')
      expect(result).toContain(`utm_medium=${mockPlatform}`)
      expect(result).toContain('utm_campaign=user_invitation')
      expect(result).toContain(`ref=${mockInviteCode}`)
    })

    it('should use default base URL when env var not set', async () => {
      delete process.env.NEXT_PUBLIC_BASE_URL
      
      const result = await service.generateTrackingUrl(mockInviteCode, mockPlatform)

      expect(result).toContain(`https://inspi.ai/invite/${mockInviteCode}`)
    })
  })

  describe('getPlatformShareParams', () => {
    it('should return platform share parameters', () => {
      const mockContent = {
        title: 'Test Title',
        description: 'Test Description',
        url: 'https://test.com',
        imageUrl: 'https://test.com/image.png'
      }

      mockContentGenerator.getPlatformShareParams.mockReturnValue({
        title: 'Test Title',
        desc: 'Test Description'
      })

      const result = service.getPlatformShareParams(mockPlatform, mockContent)

      expect(mockContentGenerator.getPlatformShareParams).toHaveBeenCalledWith(
        mockPlatform,
        mockContent
      )
      expect(result).toEqual({
        title: 'Test Title',
        desc: 'Test Description'
      })
    })
  })

  describe('getSupportedPlatforms', () => {
    it('should return supported platforms', () => {
      const mockPlatforms = [SharePlatform.WECHAT, SharePlatform.QQ, SharePlatform.EMAIL]

      mockContentGenerator.getSupportedPlatforms.mockReturnValue(mockPlatforms)

      const result = service.getSupportedPlatforms()

      expect(result).toEqual(mockPlatforms)
      expect(mockContentGenerator.getSupportedPlatforms).toHaveBeenCalled()
    })
  })

  describe('getTopSharedInvites', () => {
    it('should return top shared invites successfully', async () => {
      const mockTopInvites = [
        {
          inviteCodeId: 'invite-1',
          inviteCode: 'CODE1',
          shareCount: 10,
          clickCount: 50,
          conversionCount: 5,
          conversionRate: 10
        }
      ]

      mockTrackingService.getTopSharedInvites.mockResolvedValue(mockTopInvites)

      const result = await service.getTopSharedInvites(10, mockPlatform)

      expect(result).toEqual(mockTopInvites)
      expect(mockTrackingService.getTopSharedInvites).toHaveBeenCalledWith(10, mockPlatform)
    })

    it('should return empty array on error', async () => {
      mockTrackingService.getTopSharedInvites.mockRejectedValue(new Error('Query failed'))

      const result = await service.getTopSharedInvites()

      expect(result).toEqual([])
    })
  })

  describe('getPlatformShareStats', () => {
    it('should return platform share statistics successfully', async () => {
      const mockStats = {
        totalShares: 10,
        totalClicks: 50,
        totalConversions: 5,
        conversionRate: 10
      }

      mockTrackingService.getPlatformShareStats.mockResolvedValue(mockStats)

      const startDate = new Date('2024-01-01')
      const endDate = new Date('2024-01-31')

      const result = await service.getPlatformShareStats(mockPlatform, startDate, endDate)

      expect(result).toEqual(mockStats)
      expect(mockTrackingService.getPlatformShareStats).toHaveBeenCalledWith(
        mockPlatform,
        startDate,
        endDate
      )
    })

    it('should return zero stats on error', async () => {
      mockTrackingService.getPlatformShareStats.mockRejectedValue(new Error('Query failed'))

      const result = await service.getPlatformShareStats(mockPlatform)

      expect(result).toEqual({
        totalShares: 0,
        totalClicks: 0,
        totalConversions: 0,
        conversionRate: 0
      })
    })
  })
})