/**
 * InvitationStats组件测试
 * 测试邀请统计界面的各种功能和交互
 */

import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { useToast } from '@/hooks/use-toast'
import InvitationStats from '@/components/invitation/InvitationStats'

// Mock dependencies
jest.mock('@/hooks/use-toast')
const mockToast = jest.fn()
;(useToast as jest.Mock).mockReturnValue({ toast: mockToast })

// Mock fetch
global.fetch = jest.fn()

// Mock data
const mockDetailedStats = {
  totalInvites: 25,
  successfulRegistrations: 18,
  activeInvitees: 15,
  totalRewardsEarned: 180,
  conversionRate: 0.72,
  averageActivationTime: 12.5,
  monthlyGrowth: 0.25,
  topPerformingPeriod: '2024-01',
  recentActivity: {
    newRegistrations: 5,
    newActivations: 3,
    rewardsEarned: 30
  }
}

const mockInviteHistory = [
  {
    id: '1',
    inviteeId: 'user1',
    inviteeName: '张三',
    inviteeEmail: 'zhangsan@example.com',
    registeredAt: new Date('2024-01-15T10:00:00Z'),
    isActivated: true,
    activatedAt: new Date('2024-01-16T10:00:00Z'),
    status: 'activated',
    rewardsClaimed: true,
    lastActiveAt: new Date('2024-01-20T10:00:00Z')
  },
  {
    id: '2',
    inviteeId: 'user2',
    inviteeName: '李四',
    inviteeEmail: 'lisi@example.com',
    registeredAt: new Date('2024-01-18T10:00:00Z'),
    isActivated: false,
    status: 'pending',
    rewardsClaimed: false
  }
]

const mockRewardRecords = [
  {
    id: '1',
    rewardType: 'ai_credits' as const,
    amount: 10,
    description: '邀请注册奖励',
    grantedAt: new Date('2024-01-15T10:00:00Z'),
    sourceType: 'invite_registration' as const,
    sourceDescription: '邀请注册奖励'
  },
  {
    id: '2',
    rewardType: 'badge' as const,
    badgeName: '活跃推荐者',
    description: '获得活跃推荐者徽章',
    grantedAt: new Date('2024-01-20T10:00:00Z'),
    sourceType: 'milestone' as const,
    sourceDescription: '里程碑奖励'
  }
]

const mockLeaderboard = [
  {
    rank: 1,
    userId: 'user1',
    userName: '王五',
    totalInvites: 50,
    successfulRegistrations: 40,
    conversionRate: 0.8,
    totalRewards: 400,
    badges: ['社区建设者', '活跃推荐者']
  },
  {
    rank: 2,
    userId: 'user2',
    userName: '赵六',
    totalInvites: 30,
    successfulRegistrations: 20,
    conversionRate: 0.67,
    totalRewards: 200,
    badges: ['活跃推荐者']
  }
]

describe('InvitationStats Component', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    
    // Setup default fetch responses
    ;(fetch as jest.Mock).mockImplementation((url: string) => {
      if (url.includes('/api/invite/stats/detailed/')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ success: true, data: mockDetailedStats })
        })
      }
      if (url.includes('/api/invite/history/')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ 
            success: true, 
            data: mockInviteHistory,
            pagination: { page: 1, limit: 20, total: 2, totalPages: 1 }
          })
        })
      }
      if (url.includes('/api/invite/rewards/')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ 
            success: true, 
            data: mockRewardRecords,
            pagination: { page: 1, limit: 20, total: 2, totalPages: 1 }
          })
        })
      }
      if (url.includes('/api/invite/leaderboard')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ success: true, data: mockLeaderboard })
        })
      }
      return Promise.reject(new Error('Unknown URL'))
    })
  })

  describe('Component Rendering', () => {
    test('renders loading state initially', () => {
      render(<InvitationStats userId="test-user" />)
      
      expect(screen.getByText('邀请统计')).toBeInTheDocument()
      // Check for loading skeleton
      expect(document.querySelector('.animate-pulse')).toBeInTheDocument()
    })

    test('renders detailed stats after loading', async () => {
      render(<InvitationStats userId="test-user" />)
      
      await waitFor(() => {
        expect(screen.getByText('25')).toBeInTheDocument() // totalInvites
        expect(screen.getByText('18')).toBeInTheDocument() // successfulRegistrations
        expect(screen.getByText('15')).toBeInTheDocument() // activeInvitees
        expect(screen.getByText('180')).toBeInTheDocument() // totalRewardsEarned
      })
    })

    test('renders all tab options', async () => {
      render(<InvitationStats userId="test-user" />)
      
      await waitFor(() => {
        expect(screen.getByText('数据概览')).toBeInTheDocument()
        expect(screen.getByText('邀请历史')).toBeInTheDocument()
        expect(screen.getByText('奖励记录')).toBeInTheDocument()
        expect(screen.getByText('排行榜')).toBeInTheDocument()
      })
    })
  })

  describe('Time Filter Functionality', () => {
    test('changes time filter and reloads data', async () => {
      render(<InvitationStats userId="test-user" />)
      
      await waitFor(() => {
        expect(screen.getByDisplayValue('全部时间')).toBeInTheDocument()
      })

      const timeFilter = screen.getByDisplayValue('全部时间')
      fireEvent.change(timeFilter, { target: { value: 'month' } })

      await waitFor(() => {
        expect(fetch).toHaveBeenCalledWith(
          expect.stringContaining('period=month'),
          expect.any(Object)
        )
      })
    })

    test('refresh button reloads all data', async () => {
      render(<InvitationStats userId="test-user" />)
      
      await waitFor(() => {
        expect(screen.getByText('刷新')).toBeInTheDocument()
      })

      const refreshButton = screen.getByText('刷新')
      fireEvent.click(refreshButton)

      await waitFor(() => {
        expect(fetch).toHaveBeenCalledTimes(8) // 4 initial + 4 refresh calls
      })
    })
  })

  describe('Overview Tab', () => {
    test('displays trend analysis data', async () => {
      render(<InvitationStats userId="test-user" />)
      
      await waitFor(() => {
        expect(screen.getByText('邀请趋势分析')).toBeInTheDocument()
        expect(screen.getByText('+25.0%')).toBeInTheDocument() // monthlyGrowth
        expect(screen.getByText('2024-01')).toBeInTheDocument() // topPerformingPeriod
        expect(screen.getByText('12.5 小时')).toBeInTheDocument() // averageActivationTime
      })
    })

    test('displays recent activity data', async () => {
      render(<InvitationStats userId="test-user" />)
      
      await waitFor(() => {
        expect(screen.getByText('近期活动')).toBeInTheDocument()
        expect(screen.getByText('5')).toBeInTheDocument() // newRegistrations
        expect(screen.getByText('3')).toBeInTheDocument() // newActivations
        expect(screen.getByText('30')).toBeInTheDocument() // rewardsEarned
      })
    })
  })

  describe('History Tab', () => {
    test('switches to history tab and displays data', async () => {
      render(<InvitationStats userId="test-user" />)
      
      await waitFor(() => {
        const historyTab = screen.getByText('邀请历史')
        fireEvent.click(historyTab)
      })

      await waitFor(() => {
        expect(screen.getByText('张三')).toBeInTheDocument()
        expect(screen.getByText('zhangsan@example.com')).toBeInTheDocument()
        expect(screen.getByText('李四')).toBeInTheDocument()
        expect(screen.getByText('lisi@example.com')).toBeInTheDocument()
      })
    })

    test('filters history by status', async () => {
      render(<InvitationStats userId="test-user" />)
      
      await waitFor(() => {
        const historyTab = screen.getByText('邀请历史')
        fireEvent.click(historyTab)
      })

      await waitFor(() => {
        const statusFilter = screen.getByDisplayValue('全部状态')
        fireEvent.change(statusFilter, { target: { value: 'activated' } })
      })

      // Should filter to show only activated invites
      await waitFor(() => {
        expect(screen.getByText('张三')).toBeInTheDocument()
        // 李四 should not be visible as they're not activated
      })
    })

    test('exports history data', async () => {
      // Mock blob and URL.createObjectURL
      const mockBlob = new Blob(['csv data'], { type: 'text/csv' })
      ;(fetch as jest.Mock).mockImplementationOnce(() => 
        Promise.resolve({
          ok: true,
          blob: () => Promise.resolve(mockBlob)
        })
      )

      global.URL.createObjectURL = jest.fn(() => 'mock-url')
      global.URL.revokeObjectURL = jest.fn()

      // Mock createElement and click
      const mockAnchor = {
        href: '',
        download: '',
        click: jest.fn()
      }
      jest.spyOn(document, 'createElement').mockReturnValue(mockAnchor as any)

      render(<InvitationStats userId="test-user" />)
      
      await waitFor(() => {
        const historyTab = screen.getByText('邀请历史')
        fireEvent.click(historyTab)
      })

      await waitFor(() => {
        const exportButton = screen.getByText('导出数据')
        fireEvent.click(exportButton)
      })

      await waitFor(() => {
        expect(mockAnchor.click).toHaveBeenCalled()
        expect(mockToast).toHaveBeenCalledWith({
          title: '导出成功',
          description: '邀请历史已导出'
        })
      })
    })
  })

  describe('Rewards Tab', () => {
    test('switches to rewards tab and displays data', async () => {
      render(<InvitationStats userId="test-user" />)
      
      await waitFor(() => {
        const rewardsTab = screen.getByText('奖励记录')
        fireEvent.click(rewardsTab)
      })

      await waitFor(() => {
        expect(screen.getByText('邀请注册奖励')).toBeInTheDocument()
        expect(screen.getByText('获得活跃推荐者徽章')).toBeInTheDocument()
        expect(screen.getByText('+10')).toBeInTheDocument() // AI credits amount
        expect(screen.getByText('活跃推荐者')).toBeInTheDocument() // Badge name
      })
    })

    test('exports rewards data', async () => {
      const mockBlob = new Blob(['csv data'], { type: 'text/csv' })
      ;(fetch as jest.Mock).mockImplementationOnce(() => 
        Promise.resolve({
          ok: true,
          blob: () => Promise.resolve(mockBlob)
        })
      )

      global.URL.createObjectURL = jest.fn(() => 'mock-url')
      const mockAnchor = {
        href: '',
        download: '',
        click: jest.fn()
      }
      jest.spyOn(document, 'createElement').mockReturnValue(mockAnchor as any)

      render(<InvitationStats userId="test-user" />)
      
      await waitFor(() => {
        const rewardsTab = screen.getByText('奖励记录')
        fireEvent.click(rewardsTab)
      })

      await waitFor(() => {
        const exportButton = screen.getByText('导出奖励记录')
        fireEvent.click(exportButton)
      })

      await waitFor(() => {
        expect(mockAnchor.click).toHaveBeenCalled()
        expect(mockToast).toHaveBeenCalledWith({
          title: '导出成功',
          description: '奖励记录已导出'
        })
      })
    })
  })

  describe('Leaderboard Tab', () => {
    test('switches to leaderboard tab and displays data', async () => {
      render(<InvitationStats userId="test-user" />)
      
      await waitFor(() => {
        const leaderboardTab = screen.getByText('排行榜')
        fireEvent.click(leaderboardTab)
      })

      await waitFor(() => {
        expect(screen.getByText('王五')).toBeInTheDocument()
        expect(screen.getByText('赵六')).toBeInTheDocument()
        expect(screen.getByText('50 邀请 · 40 成功')).toBeInTheDocument()
        expect(screen.getByText('30 邀请 · 20 成功')).toBeInTheDocument()
        expect(screen.getByText('80.0%')).toBeInTheDocument() // conversion rate
        expect(screen.getByText('66.7%')).toBeInTheDocument() // conversion rate
      })
    })

    test('displays rank badges correctly', async () => {
      render(<InvitationStats userId="test-user" />)
      
      await waitFor(() => {
        const leaderboardTab = screen.getByText('排行榜')
        fireEvent.click(leaderboardTab)
      })

      await waitFor(() => {
        // Check for rank numbers
        expect(screen.getByText('1')).toBeInTheDocument()
        expect(screen.getByText('2')).toBeInTheDocument()
        
        // Check for badges
        expect(screen.getByText('社区建设者')).toBeInTheDocument()
        expect(screen.getAllByText('活跃推荐者')).toHaveLength(2)
      })
    })
  })

  describe('Error Handling', () => {
    test('handles API errors gracefully', async () => {
      ;(fetch as jest.Mock).mockRejectedValueOnce(new Error('API Error'))

      render(<InvitationStats userId="test-user" />)

      await waitFor(() => {
        expect(mockToast).toHaveBeenCalledWith({
          title: '加载失败',
          description: '无法加载邀请统计数据，请稍后重试',
          variant: 'destructive'
        })
      })
    })

    test('handles export errors gracefully', async () => {
      render(<InvitationStats userId="test-user" />)
      
      await waitFor(() => {
        const historyTab = screen.getByText('邀请历史')
        fireEvent.click(historyTab)
      })

      // Mock export API error
      ;(fetch as jest.Mock).mockRejectedValueOnce(new Error('Export Error'))

      await waitFor(() => {
        const exportButton = screen.getByText('导出数据')
        fireEvent.click(exportButton)
      })

      await waitFor(() => {
        expect(mockToast).toHaveBeenCalledWith({
          title: '导出失败',
          description: '无法导出数据，请稍后重试',
          variant: 'destructive'
        })
      })
    })
  })

  describe('Empty States', () => {
    test('displays empty state for no history', async () => {
      ;(fetch as jest.Mock).mockImplementation((url: string) => {
        if (url.includes('/api/invite/history/')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ 
              success: true, 
              data: [],
              pagination: { page: 1, limit: 20, total: 0, totalPages: 0 }
            })
          })
        }
        // Return default mocks for other endpoints
        if (url.includes('/api/invite/stats/detailed/')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ success: true, data: mockDetailedStats })
          })
        }
        if (url.includes('/api/invite/rewards/')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ 
              success: true, 
              data: [],
              pagination: { page: 1, limit: 20, total: 0, totalPages: 0 }
            })
          })
        }
        if (url.includes('/api/invite/leaderboard')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ success: true, data: [] })
          })
        }
        return Promise.reject(new Error('Unknown URL'))
      })

      render(<InvitationStats userId="test-user" />)
      
      await waitFor(() => {
        const historyTab = screen.getByText('邀请历史')
        fireEvent.click(historyTab)
      })

      await waitFor(() => {
        expect(screen.getByText('暂无邀请历史记录')).toBeInTheDocument()
      })
    })

    test('displays empty state for no rewards', async () => {
      render(<InvitationStats userId="test-user" />)
      
      await waitFor(() => {
        const rewardsTab = screen.getByText('奖励记录')
        fireEvent.click(rewardsTab)
      })

      // Mock empty rewards response
      ;(fetch as jest.Mock).mockImplementationOnce(() => 
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ 
            success: true, 
            data: [],
            pagination: { page: 1, limit: 20, total: 0, totalPages: 0 }
          })
        })
      )

      // Trigger reload by changing filter
      const timeFilter = screen.getByDisplayValue('全部时间')
      fireEvent.change(timeFilter, { target: { value: 'week' } })

      await waitFor(() => {
        expect(screen.getByText('暂无奖励记录')).toBeInTheDocument()
      })
    })

    test('displays empty state for no leaderboard data', async () => {
      ;(fetch as jest.Mock).mockImplementation((url: string) => {
        if (url.includes('/api/invite/leaderboard')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ success: true, data: [] })
          })
        }
        // Return default mocks for other endpoints
        if (url.includes('/api/invite/stats/detailed/')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ success: true, data: mockDetailedStats })
          })
        }
        if (url.includes('/api/invite/history/')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ 
              success: true, 
              data: mockInviteHistory,
              pagination: { page: 1, limit: 20, total: 2, totalPages: 1 }
            })
          })
        }
        if (url.includes('/api/invite/rewards/')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ 
              success: true, 
              data: mockRewardRecords,
              pagination: { page: 1, limit: 20, total: 2, totalPages: 1 }
            })
          })
        }
        return Promise.reject(new Error('Unknown URL'))
      })

      render(<InvitationStats userId="test-user" />)
      
      await waitFor(() => {
        const leaderboardTab = screen.getByText('排行榜')
        fireEvent.click(leaderboardTab)
      })

      await waitFor(() => {
        expect(screen.getByText('暂无排行榜数据')).toBeInTheDocument()
      })
    })
  })

  describe('Data Formatting', () => {
    test('formats dates correctly', async () => {
      render(<InvitationStats userId="test-user" />)
      
      await waitFor(() => {
        const historyTab = screen.getByText('邀请历史')
        fireEvent.click(historyTab)
      })

      await waitFor(() => {
        // Check if dates are formatted in Chinese locale
        expect(screen.getByText(/注册于.*2024/)).toBeInTheDocument()
        expect(screen.getByText(/激活于.*2024/)).toBeInTheDocument()
      })
    })

    test('formats conversion rates correctly', async () => {
      render(<InvitationStats userId="test-user" />)
      
      await waitFor(() => {
        expect(screen.getByText('72.0% 转化率')).toBeInTheDocument()
      })
    })

    test('displays status badges correctly', async () => {
      render(<InvitationStats userId="test-user" />)
      
      await waitFor(() => {
        const historyTab = screen.getByText('邀请历史')
        fireEvent.click(historyTab)
      })

      await waitFor(() => {
        expect(screen.getByText('已激活')).toBeInTheDocument()
        expect(screen.getByText('待激活')).toBeInTheDocument()
      })
    })
  })
})