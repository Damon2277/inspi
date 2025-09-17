/**
 * MobileInvitationManagement组件测试
 * 测试移动端邀请管理的各种功能和交互
 */

import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { useToast } from '@/hooks/use-toast'
import { useResponsive } from '@/hooks/useResponsive'
import MobileInvitationManagement from '@/components/invitation/MobileInvitationManagement'

// Mock dependencies
jest.mock('@/hooks/use-toast')
jest.mock('@/hooks/useResponsive')
const mockToast = jest.fn()
;(useToast as jest.Mock).mockReturnValue({ toast: mockToast })
;(useResponsive as jest.Mock).mockReturnValue({ 
  isMobile: true, 
  isTablet: false,
  isDesktop: false 
})

// Mock fetch
global.fetch = jest.fn()

// Mock QRCode
jest.mock('qrcode', () => ({
  toDataURL: jest.fn().mockResolvedValue('data:image/png;base64,mock-qr-code')
}))

// Mock clipboard API
Object.assign(navigator, {
  clipboard: {
    writeText: jest.fn().mockResolvedValue(undefined)
  }
})

// Mock data
const mockInviteCode = {
  id: 'invite-1',
  code: 'ABC123',
  inviterId: 'user-1',
  createdAt: new Date('2024-01-15T10:00:00Z'),
  expiresAt: new Date('2024-07-15T10:00:00Z'),
  isActive: true,
  usageCount: 5,
  maxUsage: 100,
  inviteLink: 'https://example.com/invite/ABC123'
}

const mockInviteStats = {
  totalInvites: 25,
  successfulRegistrations: 18,
  activeInvitees: 15,
  totalRewardsEarned: 180,
  conversionRate: 0.72
}

describe('MobileInvitationManagement Component', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    
    // Setup default fetch responses
    ;(fetch as jest.Mock).mockImplementation((url: string) => {
      if (url.includes('/api/invite/user/')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ success: true, data: mockInviteCode })
        })
      }
      if (url.includes('/api/invite/stats/')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ success: true, data: mockInviteStats })
        })
      }
      if (url.includes('/api/invite/generate')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ success: true, data: mockInviteCode })
        })
      }
      if (url.includes('/api/invite/share')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ success: true })
        })
      }
      return Promise.reject(new Error('Unknown URL'))
    })
  })

  describe('Component Rendering', () => {
    test('renders loading state initially', () => {
      render(<MobileInvitationManagement userId="test-user" />)
      
      expect(screen.getByText('邀请好友')).toBeInTheDocument()
      expect(document.querySelector('.animate-pulse')).toBeInTheDocument()
    })

    test('renders mobile-optimized layout after loading', async () => {
      render(<MobileInvitationManagement userId="test-user" />)
      
      await waitFor(() => {
        expect(screen.getByText('ABC123')).toBeInTheDocument()
        expect(screen.getByText('分享邀请码，一起获得奖励')).toBeInTheDocument()
      })
    })

    test('displays invitation code with mobile-friendly styling', async () => {
      render(<MobileInvitationManagement userId="test-user" />)
      
      await waitFor(() => {
        const inviteCode = screen.getByText('ABC123')
        expect(inviteCode).toBeInTheDocument()
        expect(inviteCode).toHaveClass('text-3xl', 'font-mono', 'font-bold')
      })
    })

    test('shows invitation statistics in mobile grid layout', async () => {
      render(<MobileInvitationManagement userId="test-user" />)
      
      await waitFor(() => {
        expect(screen.getByText('25')).toBeInTheDocument() // totalInvites
        expect(screen.getByText('18')).toBeInTheDocument() // successfulRegistrations
        expect(screen.getByText('总邀请数')).toBeInTheDocument()
        expect(screen.getByText('成功注册')).toBeInTheDocument()
      })
    })
  })

  describe('Mobile Interactions', () => {
    test('handles touch-friendly button interactions', async () => {
      render(<MobileInvitationManagement userId="test-user" />)
      
      await waitFor(() => {
        const copyButton = screen.getByText('复制邀请码')
        expect(copyButton).toBeInTheDocument()
        expect(copyButton.closest('button')).toHaveClass('h-12') // Touch-friendly height
      })
    })

    test('opens mobile share modal with platform options', async () => {
      render(<MobileInvitationManagement userId="test-user" />)
      
      await waitFor(() => {
        const shareButton = screen.getByText('分享邀请')
        fireEvent.click(shareButton)
      })

      await waitFor(() => {
        expect(screen.getByText('分享邀请')).toBeInTheDocument()
        expect(screen.getByText('微信')).toBeInTheDocument()
        expect(screen.getByText('QQ')).toBeInTheDocument()
        expect(screen.getByText('钉钉')).toBeInTheDocument()
        expect(screen.getByText('企业微信')).toBeInTheDocument()
        expect(screen.getByText('邮件')).toBeInTheDocument()
        expect(screen.getByText('复制链接')).toBeInTheDocument()
      })
    })

    test('displays platform descriptions in share modal', async () => {
      render(<MobileInvitationManagement userId="test-user" />)
      
      await waitFor(() => {
        const shareButton = screen.getByText('分享邀请')
        fireEvent.click(shareButton)
      })

      await waitFor(() => {
        expect(screen.getByText('分享到微信好友或朋友圈')).toBeInTheDocument()
        expect(screen.getByText('分享到QQ好友或空间')).toBeInTheDocument()
        expect(screen.getByText('通过邮件发送邀请')).toBeInTheDocument()
      })
    })

    test('generates and displays QR code in mobile-optimized modal', async () => {
      render(<MobileInvitationManagement userId="test-user" />)
      
      await waitFor(() => {
        const qrButton = screen.getByText('生成二维码')
        fireEvent.click(qrButton)
      })

      await waitFor(() => {
        expect(screen.getByText('邀请二维码')).toBeInTheDocument()
        expect(screen.getByText('保存到相册')).toBeInTheDocument()
        expect(screen.getByAltText('邀请二维码')).toBeInTheDocument()
      })
    })
  })

  describe('Copy Functionality', () => {
    test('copies invitation code to clipboard', async () => {
      render(<MobileInvitationManagement userId="test-user" />)
      
      await waitFor(() => {
        const copyButton = screen.getByText('复制邀请码')
        fireEvent.click(copyButton)
      })

      await waitFor(() => {
        expect(navigator.clipboard.writeText).toHaveBeenCalledWith('ABC123')
        expect(mockToast).toHaveBeenCalledWith({
          title: '复制成功',
          description: '邀请码已复制到剪贴板'
        })
      })
    })

    test('copies invitation link to clipboard', async () => {
      render(<MobileInvitationManagement userId="test-user" />)
      
      await waitFor(() => {
        const copyLinkButton = screen.getByText('复制链接')
        fireEvent.click(copyLinkButton)
      })

      await waitFor(() => {
        expect(navigator.clipboard.writeText).toHaveBeenCalledWith('https://example.com/invite/ABC123')
        expect(mockToast).toHaveBeenCalledWith({
          title: '复制成功',
          description: '邀请链接已复制到剪贴板'
        })
      })
    })

    test('shows visual feedback after copying', async () => {
      render(<MobileInvitationManagement userId="test-user" />)
      
      await waitFor(() => {
        const copyButton = screen.getByText('复制邀请码')
        fireEvent.click(copyButton)
      })

      // Should show check icon temporarily
      await waitFor(() => {
        expect(document.querySelector('.text-green-500')).toBeInTheDocument()
      })
    })
  })

  describe('Statistics Display', () => {
    test('shows expandable statistics section', async () => {
      render(<MobileInvitationManagement userId="test-user" />)
      
      await waitFor(() => {
        expect(screen.getByText('邀请统计')).toBeInTheDocument()
        expect(screen.getByText('展开')).toBeInTheDocument()
      })
    })

    test('expands to show additional statistics', async () => {
      render(<MobileInvitationManagement userId="test-user" />)
      
      await waitFor(() => {
        const expandButton = screen.getByText('展开')
        fireEvent.click(expandButton)
      })

      await waitFor(() => {
        expect(screen.getByText('活跃用户')).toBeInTheDocument()
        expect(screen.getByText('获得奖励')).toBeInTheDocument()
        expect(screen.getByText('转化率')).toBeInTheDocument()
        expect(screen.getByText('收起')).toBeInTheDocument()
      })
    })

    test('displays statistics in mobile-friendly grid', async () => {
      render(<MobileInvitationManagement userId="test-user" />)
      
      await waitFor(() => {
        const statsContainer = screen.getByText('25').closest('.grid')
        expect(statsContainer).toHaveClass('grid-cols-2')
      })
    })
  })

  describe('QR Code Functionality', () => {
    test('generates QR code with mobile-optimized size', async () => {
      const QRCode = require('qrcode')
      
      render(<MobileInvitationManagement userId="test-user" />)
      
      await waitFor(() => {
        const qrButton = screen.getByText('生成二维码')
        fireEvent.click(qrButton)
      })

      await waitFor(() => {
        expect(QRCode.toDataURL).toHaveBeenCalledWith(
          'https://example.com/invite/ABC123',
          expect.objectContaining({
            width: 280, // Mobile optimized width
            margin: 2
          })
        )
      })
    })

    test('provides download functionality for QR code', async () => {
      // Mock createElement and click
      const mockAnchor = {
        download: '',
        href: '',
        click: jest.fn()
      }
      jest.spyOn(document, 'createElement').mockReturnValue(mockAnchor as any)

      render(<MobileInvitationManagement userId="test-user" />)
      
      await waitFor(() => {
        const qrButton = screen.getByText('生成二维码')
        fireEvent.click(qrButton)
      })

      await waitFor(() => {
        const downloadButton = screen.getByText('保存到相册')
        fireEvent.click(downloadButton)
      })

      expect(mockAnchor.click).toHaveBeenCalled()
      expect(mockToast).toHaveBeenCalledWith({
        title: '下载成功',
        description: '二维码已保存到相册'
      })
    })
  })

  describe('Share Functionality', () => {
    test('handles email sharing', async () => {
      // Mock window.location
      delete (window as any).location
      ;(window as any).location = { href: '' }

      render(<MobileInvitationManagement userId="test-user" />)
      
      await waitFor(() => {
        const shareButton = screen.getByText('分享邀请')
        fireEvent.click(shareButton)
      })

      await waitFor(() => {
        const emailButton = screen.getByText('邮件')
        fireEvent.click(emailButton)
      })

      expect(window.location.href).toContain('mailto:')
    })

    test('handles link copying from share modal', async () => {
      render(<MobileInvitationManagement userId="test-user" />)
      
      await waitFor(() => {
        const shareButton = screen.getByText('分享邀请')
        fireEvent.click(shareButton)
      })

      await waitFor(() => {
        const linkButton = screen.getByText('复制链接')
        fireEvent.click(linkButton)
      })

      expect(navigator.clipboard.writeText).toHaveBeenCalledWith('https://example.com/invite/ABC123')
    })

    test('records share events', async () => {
      render(<MobileInvitationManagement userId="test-user" />)
      
      await waitFor(() => {
        const shareButton = screen.getByText('分享邀请')
        fireEvent.click(shareButton)
      })

      await waitFor(() => {
        const linkButton = screen.getByText('复制链接')
        fireEvent.click(linkButton)
      })

      await waitFor(() => {
        expect(fetch).toHaveBeenCalledWith('/api/invite/share', expect.objectContaining({
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            inviteCodeId: 'invite-1',
            platform: 'link',
            userId: 'test-user'
          })
        }))
      })
    })
  })

  describe('Modal Interactions', () => {
    test('closes share modal when clicking X button', async () => {
      render(<MobileInvitationManagement userId="test-user" />)
      
      await waitFor(() => {
        const shareButton = screen.getByText('分享邀请')
        fireEvent.click(shareButton)
      })

      await waitFor(() => {
        const closeButton = screen.getAllByRole('button').find(btn => 
          btn.querySelector('.h-4.w-4') // X icon
        )
        if (closeButton) fireEvent.click(closeButton)
      })

      await waitFor(() => {
        expect(screen.queryByText('分享到微信好友或朋友圈')).not.toBeInTheDocument()
      })
    })

    test('closes QR code modal when clicking X button', async () => {
      render(<MobileInvitationManagement userId="test-user" />)
      
      await waitFor(() => {
        const qrButton = screen.getByText('生成二维码')
        fireEvent.click(qrButton)
      })

      await waitFor(() => {
        const closeButton = screen.getAllByRole('button').find(btn => 
          btn.querySelector('.h-4.w-4') // X icon
        )
        if (closeButton) fireEvent.click(closeButton)
      })

      await waitFor(() => {
        expect(screen.queryByText('邀请二维码')).not.toBeInTheDocument()
      })
    })
  })

  describe('Error Handling', () => {
    test('handles API errors gracefully', async () => {
      ;(fetch as jest.Mock).mockRejectedValueOnce(new Error('API Error'))

      render(<MobileInvitationManagement userId="test-user" />)

      await waitFor(() => {
        expect(mockToast).toHaveBeenCalledWith({
          title: '加载失败',
          description: '无法加载邀请数据，请稍后重试',
          variant: 'destructive'
        })
      })
    })

    test('handles clipboard errors', async () => {
      ;(navigator.clipboard.writeText as jest.Mock).mockRejectedValueOnce(new Error('Clipboard Error'))

      render(<MobileInvitationManagement userId="test-user" />)
      
      await waitFor(() => {
        const copyButton = screen.getByText('复制邀请码')
        fireEvent.click(copyButton)
      })

      await waitFor(() => {
        expect(mockToast).toHaveBeenCalledWith({
          title: '复制失败',
          description: '无法复制到剪贴板',
          variant: 'destructive'
        })
      })
    })

    test('handles QR code generation errors', async () => {
      const QRCode = require('qrcode')
      QRCode.toDataURL.mockRejectedValueOnce(new Error('QR Error'))

      render(<MobileInvitationManagement userId="test-user" />)
      
      await waitFor(() => {
        const qrButton = screen.getByText('生成二维码')
        fireEvent.click(qrButton)
      })

      await waitFor(() => {
        expect(mockToast).toHaveBeenCalledWith({
          title: '生成失败',
          description: '无法生成二维码',
          variant: 'destructive'
        })
      })
    })
  })

  describe('Empty States', () => {
    test('displays empty state when no invitation code exists', async () => {
      ;(fetch as jest.Mock).mockImplementation((url: string) => {
        if (url.includes('/api/invite/user/')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ success: true, data: null })
          })
        }
        if (url.includes('/api/invite/stats/')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ success: true, data: mockInviteStats })
          })
        }
        return Promise.reject(new Error('Unknown URL'))
      })

      render(<MobileInvitationManagement userId="test-user" />)

      await waitFor(() => {
        expect(screen.getByText('您还没有邀请码')).toBeInTheDocument()
        expect(screen.getByText('生成邀请码')).toBeInTheDocument()
      })
    })
  })

  describe('Responsive Design', () => {
    test('uses mobile-specific styling classes', async () => {
      render(<MobileInvitationManagement userId="test-user" />)
      
      await waitFor(() => {
        expect(document.querySelector('.pb-20')).toBeInTheDocument() // Bottom padding for mobile nav
        expect(document.querySelector('.grid-cols-2')).toBeInTheDocument() // Mobile grid layout
      })
    })

    test('applies mobile-friendly animations', async () => {
      render(<MobileInvitationManagement userId="test-user" />)
      
      await waitFor(() => {
        const shareButton = screen.getByText('分享邀请')
        fireEvent.click(shareButton)
      })

      await waitFor(() => {
        expect(document.querySelector('.animate-slide-up')).toBeInTheDocument()
      })
    })
  })
})