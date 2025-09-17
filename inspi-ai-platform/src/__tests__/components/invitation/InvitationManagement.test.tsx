/**
 * 邀请管理组件测试
 */

import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { jest } from '@jest/globals'
import InvitationManagement from '@/components/invitation/InvitationManagement'

// Mock dependencies
jest.mock('@/hooks/use-toast', () => ({
  useToast: () => ({
    toast: jest.fn()
  })
}))

jest.mock('qrcode', () => ({
  toDataURL: jest.fn().mockResolvedValue('data:image/png;base64,mock-qr-code')
}))

// Mock fetch
global.fetch = jest.fn()

const mockInviteCode = {
  id: 'invite1',
  code: 'ABC123',
  inviterId: 'user1',
  createdAt: new Date('2024-01-01'),
  expiresAt: new Date('2025-12-31'), // Future date to make it valid
  isActive: true,
  usageCount: 5,
  maxUsage: 100,
  inviteLink: 'https://example.com/invite/ABC123'
}

const mockInviteStats = {
  totalInvites: 10,
  successfulRegistrations: 8,
  activeInvitees: 6,
  totalRewardsEarned: 50,
  conversionRate: 0.8
}

describe('InvitationManagement', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    
    // Mock successful API responses
    ;(global.fetch as jest.Mock).mockImplementation((url: string) => {
      if (url.includes('/api/invite/user/')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            success: true,
            data: mockInviteCode
          })
        })
      }
      
      if (url.includes('/api/invite/stats/')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            success: true,
            data: mockInviteStats
          })
        })
      }
      
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ success: true })
      })
    })
  })

  it('should render loading state initially', () => {
    render(<InvitationManagement userId="user1" />)
    
    expect(screen.getByText('邀请管理')).toBeInTheDocument()
    // Should show loading skeleton
    expect(document.querySelector('.animate-pulse')).toBeInTheDocument()
  })

  it('should display invite code information after loading', async () => {
    render(<InvitationManagement userId="user1" />)
    
    await waitFor(() => {
      expect(screen.getByText('ABC123')).toBeInTheDocument()
    })
    
    expect(screen.getByText('我的邀请码')).toBeInTheDocument()
    expect(screen.getByText('5 / 100')).toBeInTheDocument()
    expect(screen.getByText('有效')).toBeInTheDocument()
  })

  it('should display invite statistics', async () => {
    render(<InvitationManagement userId="user1" />)
    
    await waitFor(() => {
      expect(screen.getByText('10')).toBeInTheDocument() // totalInvites
    })
    
    expect(screen.getByText('8')).toBeInTheDocument() // successfulRegistrations
    expect(screen.getByText('6')).toBeInTheDocument() // activeInvitees
    expect(screen.getByText('50')).toBeInTheDocument() // totalRewardsEarned
    expect(screen.getByText('80.0%')).toBeInTheDocument() // conversionRate
  })

  it('should handle generate new invite code', async () => {
    ;(global.fetch as jest.Mock).mockImplementation((url: string, options?: any) => {
      if (options?.method === 'POST' && url.includes('/api/invite/generate')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            success: true,
            data: { ...mockInviteCode, code: 'NEW123' }
          })
        })
      }
      
      // Default responses for other calls
      if (url.includes('/api/invite/user/')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            success: true,
            data: mockInviteCode
          })
        })
      }
      
      if (url.includes('/api/invite/stats/')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            success: true,
            data: mockInviteStats
          })
        })
      }
      
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ success: true })
      })
    })

    render(<InvitationManagement userId="user1" />)
    
    await waitFor(() => {
      expect(screen.getByText('ABC123')).toBeInTheDocument()
    })
    
    const generateButton = screen.getByText('生成新邀请码')
    fireEvent.click(generateButton)
    
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith('/api/invite/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ userId: 'user1' })
      })
    })
  })

  it('should copy invite code to clipboard', async () => {
    // Mock clipboard API
    Object.assign(navigator, {
      clipboard: {
        writeText: jest.fn().mockResolvedValue(undefined)
      }
    })

    render(<InvitationManagement userId="user1" />)
    
    await waitFor(() => {
      expect(screen.getByText('ABC123')).toBeInTheDocument()
    })
    
    const copyButtons = screen.getAllByText('复制')
    fireEvent.click(copyButtons[0]) // Copy invite code
    
    await waitFor(() => {
      expect(navigator.clipboard.writeText).toHaveBeenCalledWith('ABC123')
    })
  })

  it('should copy invite link to clipboard', async () => {
    // Mock clipboard API
    Object.assign(navigator, {
      clipboard: {
        writeText: jest.fn().mockResolvedValue(undefined)
      }
    })

    render(<InvitationManagement userId="user1" />)
    
    await waitFor(() => {
      expect(screen.getByText('ABC123')).toBeInTheDocument()
    })
    
    const copyLinkButton = screen.getByText('复制链接')
    fireEvent.click(copyLinkButton)
    
    await waitFor(() => {
      expect(navigator.clipboard.writeText).toHaveBeenCalledWith('https://example.com/invite/ABC123')
    })
  })

  it('should open share modal', async () => {
    render(<InvitationManagement userId="user1" />)
    
    await waitFor(() => {
      expect(screen.getByText('ABC123')).toBeInTheDocument()
    })
    
    const shareButton = screen.getByText('分享邀请')
    fireEvent.click(shareButton)
    
    await waitFor(() => {
      expect(screen.getByText('分享邀请')).toBeInTheDocument()
      expect(screen.getByText('微信')).toBeInTheDocument()
      expect(screen.getByText('QQ')).toBeInTheDocument()
      expect(screen.getByText('邮件')).toBeInTheDocument()
    })
  })

  it('should generate and show QR code', async () => {
    const QRCode = require('qrcode')
    
    render(<InvitationManagement userId="user1" />)
    
    await waitFor(() => {
      expect(screen.getByText('ABC123')).toBeInTheDocument()
    })
    
    const qrButton = screen.getByText('二维码')
    fireEvent.click(qrButton)
    
    await waitFor(() => {
      expect(QRCode.toDataURL).toHaveBeenCalledWith('https://example.com/invite/ABC123', {
        width: 256,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#FFFFFF'
        }
      })
    })
    
    await waitFor(() => {
      expect(screen.getByText('邀请二维码')).toBeInTheDocument()
      expect(screen.getByAltText('邀请二维码')).toBeInTheDocument()
    })
  })

  it('should handle share platform selection', async () => {
    render(<InvitationManagement userId="user1" />)
    
    await waitFor(() => {
      expect(screen.getByText('ABC123')).toBeInTheDocument()
    })
    
    // Open share modal
    const shareButton = screen.getByText('分享邀请')
    fireEvent.click(shareButton)
    
    await waitFor(() => {
      expect(screen.getByText('微信')).toBeInTheDocument()
    })
    
    // Click on email share
    const emailButton = screen.getByText('邮件')
    fireEvent.click(emailButton)
    
    // Should record share event
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith('/api/invite/share', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          inviteCodeId: 'invite1',
          platform: 'email',
          userId: 'user1'
        })
      })
    })
  })

  it('should handle no invite code state', async () => {
    ;(global.fetch as jest.Mock).mockImplementation((url: string) => {
      if (url.includes('/api/invite/user/')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            success: true,
            data: null
          })
        })
      }
      
      if (url.includes('/api/invite/stats/')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            success: true,
            data: mockInviteStats
          })
        })
      }
      
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ success: true })
      })
    })

    render(<InvitationManagement userId="user1" />)
    
    await waitFor(() => {
      expect(screen.getByText('您还没有邀请码')).toBeInTheDocument()
    })
    
    expect(screen.getByText('生成邀请码')).toBeInTheDocument()
  })

  it('should handle API errors gracefully', async () => {
    ;(global.fetch as jest.Mock).mockRejectedValue(new Error('API Error'))

    render(<InvitationManagement userId="user1" />)
    
    // Should still render the component without crashing
    await waitFor(() => {
      expect(screen.getByText('邀请管理')).toBeInTheDocument()
    })
  })

  it('should format dates correctly', async () => {
    render(<InvitationManagement userId="user1" />)
    
    await waitFor(() => {
      expect(screen.getByText('ABC123')).toBeInTheDocument()
    })
    
    // Should display formatted dates
    expect(screen.getByText(/2024年1月1日/)).toBeInTheDocument()
    expect(screen.getByText(/2024年7月1日/)).toBeInTheDocument()
  })

  it('should show correct status badge', async () => {
    render(<InvitationManagement userId="user1" />)
    
    await waitFor(() => {
      expect(screen.getByText('有效')).toBeInTheDocument()
    })
  })

  it('should show expired status for expired codes', async () => {
    const expiredInviteCode = {
      ...mockInviteCode,
      expiresAt: new Date('2023-01-01') // Past date
    }

    ;(global.fetch as jest.Mock).mockImplementation((url: string) => {
      if (url.includes('/api/invite/user/')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            success: true,
            data: expiredInviteCode
          })
        })
      }
      
      if (url.includes('/api/invite/stats/')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            success: true,
            data: mockInviteStats
          })
        })
      }
      
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ success: true })
      })
    })

    render(<InvitationManagement userId="user1" />)
    
    await waitFor(() => {
      expect(screen.getByText('已过期')).toBeInTheDocument()
    })
  })
})