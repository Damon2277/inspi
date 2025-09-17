/**
 * ShareTrackingService 单元测试
 */

import { ShareTrackingService } from '../../../../lib/invitation/services/ShareTrackingService'
import { SharePlatform } from '../../../../lib/invitation/types'
import { DatabaseService } from '../../../../lib/invitation/database'

// Mock DatabaseService
const mockDb = {
  query: jest.fn(),
  queryOne: jest.fn(),
  execute: jest.fn()
} as jest.Mocked<DatabaseService>

describe('ShareTrackingService', () => {
  let service: ShareTrackingService
  const mockInviteCodeId = 'invite-123'
  const mockPlatform = SharePlatform.WECHAT

  beforeEach(() => {
    service = new ShareTrackingService(mockDb)
    jest.clearAllMocks()
  })

  describe('trackShareEvent', () => {
    it('should record share event successfully', async () => {
      mockDb.execute.mockResolvedValue({ affectedRows: 1 })

      await service.trackShareEvent(mockInviteCodeId, mockPlatform, { source: 'button' })

      expect(mockDb.execute).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO share_events'),
        expect.arrayContaining([
          mockInviteCodeId,
          mockPlatform,
          'share',
          expect.any(Date),
          null,
          null,
          null,
          '{"source":"button"}'
        ])
      )
    })

    it('should record share event without metadata', async () => {
      mockDb.execute.mockResolvedValue({ affectedRows: 1 })

      await service.trackShareEvent(mockInviteCodeId, mockPlatform)

      expect(mockDb.execute).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO share_events'),
        expect.arrayContaining([
          mockInviteCodeId,
          mockPlatform,
          'share',
          expect.any(Date),
          null,
          null,
          null,
          null
        ])
      )
    })
  })

  describe('trackClickEvent', () => {
    it('should record click event with tracking info', async () => {
      mockDb.execute.mockResolvedValue({ affectedRows: 1 })
      const ipAddress = '192.168.1.1'
      const userAgent = 'Mozilla/5.0'
      const referrer = 'https://example.com'

      await service.trackClickEvent(mockInviteCodeId, mockPlatform, ipAddress, userAgent, referrer)

      expect(mockDb.execute).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO share_events'),
        expect.arrayContaining([
          mockInviteCodeId,
          mockPlatform,
          'click',
          expect.any(Date),
          ipAddress,
          userAgent,
          referrer,
          null
        ])
      )
    })

    it('should record click event without tracking info', async () => {
      mockDb.execute.mockResolvedValue({ affectedRows: 1 })

      await service.trackClickEvent(mockInviteCodeId, mockPlatform)

      expect(mockDb.execute).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO share_events'),
        expect.arrayContaining([
          mockInviteCodeId,
          mockPlatform,
          'click',
          expect.any(Date),
          null,
          null,
          null,
          null
        ])
      )
    })
  })

  describe('trackConversionEvent', () => {
    it('should record conversion event successfully', async () => {
      mockDb.execute.mockResolvedValue({ affectedRows: 1 })
      const inviteeId = 'user-456'

      await service.trackConversionEvent(mockInviteCodeId, mockPlatform, inviteeId)

      expect(mockDb.execute).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO share_events'),
        expect.arrayContaining([
          mockInviteCodeId,
          mockPlatform,
          'conversion',
          expect.any(Date),
          null,
          null,
          null,
          `{"inviteeId":"${inviteeId}"}`
        ])
      )
    })
  })

  describe('getShareStats', () => {
    it('should return share statistics correctly', async () => {
      const mockResults = [
        {
          platform: 'wechat',
          share_count: '5',
          click_count: '15',
          conversion_count: '3'
        },
        {
          platform: 'qq',
          share_count: '2',
          click_count: '8',
          conversion_count: '1'
        }
      ]

      mockDb.query.mockResolvedValue(mockResults)

      const stats = await service.getShareStats(mockInviteCodeId)

      expect(stats).toEqual([
        {
          inviteCodeId: mockInviteCodeId,
          platform: SharePlatform.WECHAT,
          shareCount: 5,
          clickCount: 15,
          conversionCount: 3
        },
        {
          inviteCodeId: mockInviteCodeId,
          platform: SharePlatform.QQ,
          shareCount: 2,
          clickCount: 8,
          conversionCount: 1
        }
      ])

      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringContaining('SELECT'),
        [mockInviteCodeId]
      )
    })

    it('should handle empty results', async () => {
      mockDb.query.mockResolvedValue([])

      const stats = await service.getShareStats(mockInviteCodeId)

      expect(stats).toEqual([])
    })
  })

  describe('getPlatformShareStats', () => {
    it('should return platform statistics correctly', async () => {
      const mockResult = {
        total_shares: '10',
        total_clicks: '50',
        total_conversions: '8'
      }

      mockDb.queryOne.mockResolvedValue(mockResult)

      const stats = await service.getPlatformShareStats(mockPlatform)

      expect(stats).toEqual({
        totalShares: 10,
        totalClicks: 50,
        totalConversions: 8,
        conversionRate: 16 // 8/50 * 100
      })

      expect(mockDb.queryOne).toHaveBeenCalledWith(
        expect.stringContaining('SELECT'),
        [mockPlatform]
      )
    })

    it('should return platform statistics with date range', async () => {
      const mockResult = {
        total_shares: '5',
        total_clicks: '25',
        total_conversions: '3'
      }

      mockDb.queryOne.mockResolvedValue(mockResult)

      const startDate = new Date('2024-01-01')
      const endDate = new Date('2024-01-31')

      const stats = await service.getPlatformShareStats(mockPlatform, startDate, endDate)

      expect(stats).toEqual({
        totalShares: 5,
        totalClicks: 25,
        totalConversions: 3,
        conversionRate: 12 // 3/25 * 100
      })

      expect(mockDb.queryOne).toHaveBeenCalledWith(
        expect.stringContaining('AND timestamp BETWEEN'),
        [mockPlatform, startDate, endDate]
      )
    })

    it('should handle zero clicks for conversion rate', async () => {
      const mockResult = {
        total_shares: '5',
        total_clicks: '0',
        total_conversions: '0'
      }

      mockDb.queryOne.mockResolvedValue(mockResult)

      const stats = await service.getPlatformShareStats(mockPlatform)

      expect(stats.conversionRate).toBe(0)
    })
  })

  describe('getTopSharedInvites', () => {
    it('should return top shared invites correctly', async () => {
      const mockResults = [
        {
          invite_code_id: 'invite-1',
          invite_code: 'CODE1',
          share_count: '10',
          click_count: '50',
          conversion_count: '5'
        },
        {
          invite_code_id: 'invite-2',
          invite_code: 'CODE2',
          share_count: '8',
          click_count: '40',
          conversion_count: '3'
        }
      ]

      mockDb.query.mockResolvedValue(mockResults)

      const topInvites = await service.getTopSharedInvites(10)

      expect(topInvites).toEqual([
        {
          inviteCodeId: 'invite-1',
          inviteCode: 'CODE1',
          shareCount: 10,
          clickCount: 50,
          conversionCount: 5,
          conversionRate: 10 // 5/50 * 100
        },
        {
          inviteCodeId: 'invite-2',
          inviteCode: 'CODE2',
          shareCount: 8,
          clickCount: 40,
          conversionCount: 3,
          conversionRate: 7.5 // 3/40 * 100
        }
      ])

      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringContaining('ORDER BY share_count DESC'),
        [10]
      )
    })

    it('should filter by platform when specified', async () => {
      mockDb.query.mockResolvedValue([])

      await service.getTopSharedInvites(5, mockPlatform)

      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringContaining('AND se.platform = ?'),
        [mockPlatform, 5]
      )
    })

    it('should filter by date range when specified', async () => {
      mockDb.query.mockResolvedValue([])

      const startDate = new Date('2024-01-01')
      const endDate = new Date('2024-01-31')

      await service.getTopSharedInvites(5, mockPlatform, startDate, endDate)

      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringContaining('AND se.timestamp BETWEEN'),
        [mockPlatform, startDate, endDate, 5]
      )
    })
  })

  describe('getShareTrackingDetails', () => {
    it('should return tracking details correctly', async () => {
      const mockResults = [
        {
          id: 'event-1',
          invite_code_id: mockInviteCodeId,
          platform: 'wechat',
          event_type: 'share',
          timestamp: '2024-01-01 10:00:00',
          ip_address: '192.168.1.1',
          user_agent: 'Mozilla/5.0',
          referrer: 'https://example.com',
          metadata: '{"source":"button"}'
        }
      ]

      mockDb.query.mockResolvedValue(mockResults)

      const details = await service.getShareTrackingDetails(mockInviteCodeId)

      expect(details).toEqual([
        {
          id: 'event-1',
          inviteCodeId: mockInviteCodeId,
          platform: SharePlatform.WECHAT,
          eventType: 'share',
          timestamp: new Date('2024-01-01 10:00:00'),
          ipAddress: '192.168.1.1',
          userAgent: 'Mozilla/5.0',
          referrer: 'https://example.com',
          metadata: { source: 'button' }
        }
      ])

      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringContaining('ORDER BY timestamp DESC LIMIT'),
        [mockInviteCodeId, 50]
      )
    })

    it('should filter by platform when specified', async () => {
      mockDb.query.mockResolvedValue([])

      await service.getShareTrackingDetails(mockInviteCodeId, mockPlatform, 25)

      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringContaining('AND platform = ?'),
        [mockInviteCodeId, mockPlatform, 25]
      )
    })
  })

  describe('cleanupOldTrackingData', () => {
    it('should cleanup old tracking data correctly', async () => {
      mockDb.execute.mockResolvedValue({ affectedRows: 150 })

      const deletedCount = await service.cleanupOldTrackingData(90)

      expect(deletedCount).toBe(150)
      expect(mockDb.execute).toHaveBeenCalledWith(
        'DELETE FROM share_events WHERE timestamp < ?',
        [expect.any(Date)]
      )
    })

    it('should use default retention period', async () => {
      mockDb.execute.mockResolvedValue({ affectedRows: 50 })

      await service.cleanupOldTrackingData()

      expect(mockDb.execute).toHaveBeenCalledWith(
        'DELETE FROM share_events WHERE timestamp < ?',
        [expect.any(Date)]
      )
    })

    it('should handle no affected rows', async () => {
      mockDb.execute.mockResolvedValue({})

      const deletedCount = await service.cleanupOldTrackingData(30)

      expect(deletedCount).toBe(0)
    })
  })
})