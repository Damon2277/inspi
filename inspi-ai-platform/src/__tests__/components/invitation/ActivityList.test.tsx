/**
 * ActivityList 组件单元测试
 */

import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { ActivityList } from '@/components/invitation/ActivityList'
import { ActivityType, ActivityStatus } from '@/lib/invitation/types'

// Mock fetch
global.fetch = jest.fn()

// Mock date-fns
jest.mock('date-fns', () => ({
  formatDistanceToNow: jest.fn(() => '2天'),
  format: jest.fn(() => '2024年3月1日')
}))

// Mock date-fns/locale
jest.mock('date-fns/locale', () => ({
  zhCN: {}
}))

const mockActivities = [
  {
    id: 'activity-1',
    name: '春季邀请挑战',
    description: '邀请好友获得丰厚奖励',
    type: ActivityType.CHALLENGE,
    status: ActivityStatus.ACTIVE,
    startDate: new Date('2024-03-01'),
    endDate: new Date('2024-03-31'),
    rules: {
      winConditions: { type: 'top_ranks' as const, count: 10 },
      scoringRules: {
        invitePoints: 10,
        registrationPoints: 50,
        activationPoints: 100
      }
    },
    rewards: [
      {
        type: 'ai_credits' as const,
        amount: 100,
        description: '前10名奖励',
        rankRange: { min: 1, max: 10 }
      }
    ],
    targetMetrics: { totalInvites: 1000 },
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date()
  }
]

describe('ActivityList', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('应该正确渲染活动列表', async () => {
    ;(fetch as jest.Mock).mockResolvedValueOnce({
      json: async () => ({
        success: true,
        data: {
          activities: mockActivities,
          total: 1
        }
      })
    })

    render(<ActivityList />)

    await waitFor(() => {
      expect(screen.getByText('春季邀请挑战')).toBeInTheDocument()
      expect(screen.getByText('邀请好友获得丰厚奖励')).toBeInTheDocument()
      expect(screen.getByText('挑战活动')).toBeInTheDocument()
    })
  })

  it('应该显示加载状态', () => {
    ;(fetch as jest.Mock).mockImplementation(() => new Promise(() => {}))

    render(<ActivityList />)

    expect(screen.getAllByRole('generic')).toHaveLength(3) // 3个骨架屏
  })

  it('应该处理错误状态', async () => {
    ;(fetch as jest.Mock).mockResolvedValueOnce({
      json: async () => ({
        success: false,
        error: '加载失败'
      })
    })

    render(<ActivityList />)

    await waitFor(() => {
      expect(screen.getByText('加载失败')).toBeInTheDocument()
      expect(screen.getByText('重新加载')).toBeInTheDocument()
    })
  })

  it('应该显示空状态', async () => {
    ;(fetch as jest.Mock).mockResolvedValueOnce({
      json: async () => ({
        success: true,
        data: {
          activities: [],
          total: 0
        }
      })
    })

    render(<ActivityList />)

    await waitFor(() => {
      expect(screen.getByText('暂无活动')).toBeInTheDocument()
      expect(screen.getByText('目前没有可参与的邀请活动，请稍后再来查看')).toBeInTheDocument()
    })
  })

  it('应该调用活动选择回调', async () => {
    const onActivitySelect = jest.fn()
    
    ;(fetch as jest.Mock).mockResolvedValueOnce({
      json: async () => ({
        success: true,
        data: {
          activities: mockActivities,
          total: 1
        }
      })
    })

    render(<ActivityList onActivitySelect={onActivitySelect} />)

    await waitFor(() => {
      const activityCard = screen.getByText('春季邀请挑战').closest('[role="generic"]')
      if (activityCard) {
        fireEvent.click(activityCard)
      }
    })

    expect(onActivitySelect).toHaveBeenCalledWith(mockActivities[0])
  })

  it('应该调用加入活动回调', async () => {
    const onJoinActivity = jest.fn()
    
    ;(fetch as jest.Mock).mockResolvedValueOnce({
      json: async () => ({
        success: true,
        data: {
          activities: mockActivities,
          total: 1
        }
      })
    })

    render(<ActivityList onJoinActivity={onJoinActivity} />)

    await waitFor(() => {
      const joinButton = screen.getByText('立即参与')
      fireEvent.click(joinButton)
    })

    expect(onJoinActivity).toHaveBeenCalledWith('activity-1')
  })

  it('应该支持加载更多', async () => {
    ;(fetch as jest.Mock)
      .mockResolvedValueOnce({
        json: async () => ({
          success: true,
          data: {
            activities: mockActivities,
            total: 20
          }
        })
      })
      .mockResolvedValueOnce({
        json: async () => ({
          success: true,
          data: {
            activities: [{ ...mockActivities[0], id: 'activity-2', name: '第二个活动' }],
            total: 20
          }
        })
      })

    render(<ActivityList />)

    await waitFor(() => {
      expect(screen.getByText('春季邀请挑战')).toBeInTheDocument()
    })

    const loadMoreButton = screen.getByText('加载更多')
    fireEvent.click(loadMoreButton)

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledTimes(2)
      expect(fetch).toHaveBeenLastCalledWith('/api/activities?page=2&limit=10')
    })
  })

  it('应该正确显示活动状态', async () => {
    const pastActivity = {
      ...mockActivities[0],
      id: 'past-activity',
      name: '已结束活动',
      status: ActivityStatus.COMPLETED,
      endDate: new Date('2024-02-28') // 过去的日期
    }

    ;(fetch as jest.Mock).mockResolvedValueOnce({
      json: async () => ({
        success: true,
        data: {
          activities: [pastActivity],
          total: 1
        }
      })
    })

    render(<ActivityList />)

    await waitFor(() => {
      expect(screen.getByText('已结束活动')).toBeInTheDocument()
      expect(screen.getByText('已结束')).toBeInTheDocument()
      expect(screen.queryByText('立即参与')).not.toBeInTheDocument()
    })
  })

  it('应该正确显示奖励信息', async () => {
    ;(fetch as jest.Mock).mockResolvedValueOnce({
      json: async () => ({
        success: true,
        data: {
          activities: mockActivities,
          total: 1
        }
      })
    })

    render(<ActivityList />)

    await waitFor(() => {
      expect(screen.getByText('活动奖励')).toBeInTheDocument()
      expect(screen.getByText(/第1-10名.*100.*前10名奖励/)).toBeInTheDocument()
    })
  })
})