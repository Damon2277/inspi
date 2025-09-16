/**
 * 移动端作品卡片组件测试
 */

import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MobileWorkCard } from '@/components/mobile/MobileWorkCard'
import { createWorkFixture, createUserFixture } from '@/fixtures'

// Mock触摸事件
const mockTouchEvents = {
  touchstart: jest.fn(),
  touchmove: jest.fn(),
  touchend: jest.fn(),
}

// Mock Intersection Observer
const mockIntersectionObserver = jest.fn()
mockIntersectionObserver.mockReturnValue({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn(),
})
global.IntersectionObserver = mockIntersectionObserver

// Mock作品服务
const mockWorkService = {
  reuseWork: jest.fn(),
  likeWork: jest.fn(),
  shareWork: jest.fn(),
}

jest.mock('@/lib/services/workService', () => mockWorkService)

describe('MobileWorkCard组件测试', () => {
  const mockWork = createWorkFixture({
    id: 'work-1',
    title: '二次函数教学卡片',
    description: '包含概念解释、例题演示等四种卡片类型',
    author: createUserFixture({ name: '张老师', avatar: '/avatar1.jpg' }),
    subject: '数学',
    gradeLevel: '高中',
    tags: ['函数', '二次函数', '图像'],
    stats: {
      views: 1250,
      likes: 89,
      reuses: 23,
      contributionScore: 156,
    },
    createdAt: new Date('2024-01-15'),
  })

  const defaultProps = {
    work: mockWork,
    onReuse: jest.fn(),
    onLike: jest.fn(),
    onShare: jest.fn(),
    onView: jest.fn(),
  }

  beforeEach(() => {
    jest.clearAllMocks()
    // 模拟移动设备环境
    Object.defineProperty(window, 'innerWidth', { value: 375 })
    Object.defineProperty(window, 'ontouchstart', { value: true })
  })

  describe('基础渲染', () => {
    test('应该正确渲染作品卡片', () => {
      render(<MobileWorkCard {...defaultProps} />)
      
      expect(screen.getByTestId('mobile-work-card')).toBeInTheDocument()
      expect(screen.getByText('二次函数教学卡片')).toBeInTheDocument()
      expect(screen.getByText('张老师')).toBeInTheDocument()
      expect(screen.getByText('数学 · 高中')).toBeInTheDocument()
    })

    test('应该显示作品统计信息', () => {
      render(<MobileWorkCard {...defaultProps} />)
      
      expect(screen.getByText('1.3k')).toBeInTheDocument() // 浏览量
      expect(screen.getByText('89')).toBeInTheDocument() // 点赞数
      expect(screen.getByText('23')).toBeInTheDocument() // 复用数
    })

    test('应该显示作品标签', () => {
      render(<MobileWorkCard {...defaultProps} />)
      
      expect(screen.getByText('函数')).toBeInTheDocument()
      expect(screen.getByText('二次函数')).toBeInTheDocument()
      expect(screen.getByText('图像')).toBeInTheDocument()
    })

    test('应该显示创建时间', () => {
      render(<MobileWorkCard {...defaultProps} />)
      
      expect(screen.getByText('2024-01-15')).toBeInTheDocument()
    })

    test('应该显示作者头像', () => {
      render(<MobileWorkCard {...defaultProps} />)
      
      const avatar = screen.getByAltText('张老师的头像')
      expect(avatar).toBeInTheDocument()
      expect(avatar).toHaveAttribute('src', '/avatar1.jpg')
    })
  })

  describe('触摸交互', () => {
    test('应该处理点击事件', async () => {
      render(<MobileWorkCard {...defaultProps} />)
      
      const card = screen.getByTestId('mobile-work-card')
      await userEvent.click(card)
      
      expect(defaultProps.onView).toHaveBeenCalledWith(mockWork)
    })

    test('应该处理长按事件', async () => {
      render(<MobileWorkCard {...defaultProps} />)
      
      const card = screen.getByTestId('mobile-work-card')
      
      // 模拟长按
      fireEvent.touchStart(card, {
        touches: [{ clientX: 100, clientY: 100 }],
      })
      
      // 等待长按时间
      await waitFor(() => {
        expect(screen.getByTestId('context-menu')).toBeInTheDocument()
      }, { timeout: 1000 })
      
      fireEvent.touchEnd(card)
    })

    test('应该处理滑动手势', async () => {
      render(<MobileWorkCard {...defaultProps} />)
      
      const card = screen.getByTestId('mobile-work-card')
      
      // 模拟向左滑动
      fireEvent.touchStart(card, {
        touches: [{ clientX: 200, clientY: 100 }],
      })
      
      fireEvent.touchMove(card, {
        touches: [{ clientX: 100, clientY: 100 }],
      })
      
      fireEvent.touchEnd(card)
      
      // 应该显示快捷操作
      await waitFor(() => {
        expect(screen.getByTestId('quick-actions')).toBeInTheDocument()
      })
    })

    test('应该支持双击点赞', async () => {
      render(<MobileWorkCard {...defaultProps} />)
      
      const card = screen.getByTestId('mobile-work-card')
      
      // 模拟双击
      await userEvent.dblClick(card)
      
      expect(defaultProps.onLike).toHaveBeenCalledWith(mockWork)
      expect(screen.getByTestId('like-animation')).toBeInTheDocument()
    })
  })

  describe('快捷操作', () => {
    test('应该显示快捷操作按钮', async () => {
      render(<MobileWorkCard {...defaultProps} showQuickActions={true} />)
      
      expect(screen.getByLabelText('点赞')).toBeInTheDocument()
      expect(screen.getByLabelText('复用')).toBeInTheDocument()
      expect(screen.getByLabelText('分享')).toBeInTheDocument()
      expect(screen.getByLabelText('更多')).toBeInTheDocument()
    })

    test('应该处理点赞操作', async () => {
      render(<MobileWorkCard {...defaultProps} showQuickActions={true} />)
      
      const likeButton = screen.getByLabelText('点赞')
      await userEvent.click(likeButton)
      
      expect(defaultProps.onLike).toHaveBeenCalledWith(mockWork)
      expect(mockWorkService.likeWork).toHaveBeenCalledWith('work-1')
    })

    test('应该处理复用操作', async () => {
      render(<MobileWorkCard {...defaultProps} showQuickActions={true} />)
      
      const reuseButton = screen.getByLabelText('复用')
      await userEvent.click(reuseButton)
      
      expect(defaultProps.onReuse).toHaveBeenCalledWith(mockWork)
      expect(mockWorkService.reuseWork).toHaveBeenCalledWith('work-1')
    })

    test('应该处理分享操作', async () => {
      // Mock Web Share API
      const mockShare = jest.fn().mockResolvedValue(undefined)
      Object.defineProperty(navigator, 'share', {
        value: mockShare,
        configurable: true,
      })
      
      render(<MobileWorkCard {...defaultProps} showQuickActions={true} />)
      
      const shareButton = screen.getByLabelText('分享')
      await userEvent.click(shareButton)
      
      expect(mockShare).toHaveBeenCalledWith({
        title: '二次函数教学卡片',
        text: '包含概念解释、例题演示等四种卡片类型',
        url: expect.stringContaining('/works/work-1'),
      })
    })

    test('应该在不支持Web Share API时显示分享菜单', async () => {
      // 移除Web Share API支持
      Object.defineProperty(navigator, 'share', {
        value: undefined,
        configurable: true,
      })
      
      render(<MobileWorkCard {...defaultProps} showQuickActions={true} />)
      
      const shareButton = screen.getByLabelText('分享')
      await userEvent.click(shareButton)
      
      expect(screen.getByTestId('share-menu')).toBeInTheDocument()
      expect(screen.getByText('复制链接')).toBeInTheDocument()
      expect(screen.getByText('分享到微信')).toBeInTheDocument()
    })
  })

  describe('上下文菜单', () => {
    test('应该显示上下文菜单选项', async () => {
      render(<MobileWorkCard {...defaultProps} />)
      
      const card = screen.getByTestId('mobile-work-card')
      
      // 触发长按显示菜单
      fireEvent.touchStart(card)
      await waitFor(() => {
        expect(screen.getByTestId('context-menu')).toBeInTheDocument()
      }, { timeout: 1000 })
      
      expect(screen.getByText('查看详情')).toBeInTheDocument()
      expect(screen.getByText('复用作品')).toBeInTheDocument()
      expect(screen.getByText('收藏')).toBeInTheDocument()
      expect(screen.getByText('举报')).toBeInTheDocument()
    })

    test('应该处理菜单选项点击', async () => {
      render(<MobileWorkCard {...defaultProps} />)
      
      const card = screen.getByTestId('mobile-work-card')
      
      fireEvent.touchStart(card)
      await waitFor(() => {
        expect(screen.getByTestId('context-menu')).toBeInTheDocument()
      }, { timeout: 1000 })
      
      const viewOption = screen.getByText('查看详情')
      await userEvent.click(viewOption)
      
      expect(defaultProps.onView).toHaveBeenCalledWith(mockWork)
    })

    test('应该在点击外部时关闭菜单', async () => {
      render(<MobileWorkCard {...defaultProps} />)
      
      const card = screen.getByTestId('mobile-work-card')
      
      fireEvent.touchStart(card)
      await waitFor(() => {
        expect(screen.getByTestId('context-menu')).toBeInTheDocument()
      }, { timeout: 1000 })
      
      // 点击外部
      fireEvent.click(document.body)
      
      await waitFor(() => {
        expect(screen.queryByTestId('context-menu')).not.toBeInTheDocument()
      })
    })
  })

  describe('懒加载', () => {
    test('应该支持图片懒加载', () => {
      render(<MobileWorkCard {...defaultProps} />)
      
      const avatar = screen.getByAltText('张老师的头像')
      expect(avatar).toHaveAttribute('loading', 'lazy')
    })

    test('应该在进入视口时加载内容', async () => {
      const { rerender } = render(<MobileWorkCard {...defaultProps} />)
      
      // 模拟Intersection Observer回调
      const observerCallback = mockIntersectionObserver.mock.calls[0][0]
      observerCallback([{ isIntersecting: true, target: screen.getByTestId('mobile-work-card') }])
      
      rerender(<MobileWorkCard {...defaultProps} />)
      
      await waitFor(() => {
        expect(screen.getByTestId('mobile-work-card')).toHaveClass('loaded')
      })
    })
  })

  describe('动画效果', () => {
    test('应该显示点赞动画', async () => {
      render(<MobileWorkCard {...defaultProps} />)
      
      const card = screen.getByTestId('mobile-work-card')
      await userEvent.dblClick(card)
      
      const animation = screen.getByTestId('like-animation')
      expect(animation).toBeInTheDocument()
      expect(animation).toHaveClass('animate-heart')
      
      // 动画应该在一段时间后消失
      await waitFor(() => {
        expect(screen.queryByTestId('like-animation')).not.toBeInTheDocument()
      }, { timeout: 2000 })
    })

    test('应该显示滑动动画', async () => {
      render(<MobileWorkCard {...defaultProps} />)
      
      const card = screen.getByTestId('mobile-work-card')
      
      fireEvent.touchStart(card, {
        touches: [{ clientX: 200, clientY: 100 }],
      })
      
      fireEvent.touchMove(card, {
        touches: [{ clientX: 100, clientY: 100 }],
      })
      
      expect(card).toHaveStyle('transform: translateX(-100px)')
    })

    test('应该显示加载动画', () => {
      render(<MobileWorkCard {...defaultProps} loading={true} />)
      
      expect(screen.getByTestId('skeleton-loader')).toBeInTheDocument()
      expect(screen.queryByText('二次函数教学卡片')).not.toBeInTheDocument()
    })
  })

  describe('响应式适配', () => {
    test('应该在不同屏幕尺寸下调整布局', () => {
      // 小屏幕
      Object.defineProperty(window, 'innerWidth', { value: 320 })
      const { rerender } = render(<MobileWorkCard {...defaultProps} />)
      
      expect(screen.getByTestId('mobile-work-card')).toHaveClass('compact')
      
      // 中等屏幕
      Object.defineProperty(window, 'innerWidth', { value: 768 })
      rerender(<MobileWorkCard {...defaultProps} />)
      
      expect(screen.getByTestId('mobile-work-card')).toHaveClass('normal')
    })

    test('应该在横屏时调整布局', () => {
      Object.defineProperty(window, 'innerHeight', { value: 375 })
      Object.defineProperty(window, 'innerWidth', { value: 667 })
      
      render(<MobileWorkCard {...defaultProps} />)
      
      expect(screen.getByTestId('mobile-work-card')).toHaveClass('landscape')
    })
  })

  describe('无障碍性', () => {
    test('应该提供适当的ARIA标签', () => {
      render(<MobileWorkCard {...defaultProps} />)
      
      const card = screen.getByTestId('mobile-work-card')
      expect(card).toHaveAttribute('role', 'article')
      expect(card).toHaveAttribute('aria-label', '作品：二次函数教学卡片，作者：张老师')
      
      const likeButton = screen.getByLabelText('点赞')
      expect(likeButton).toHaveAttribute('aria-pressed', 'false')
    })

    test('应该支持键盘导航', async () => {
      render(<MobileWorkCard {...defaultProps} />)
      
      const card = screen.getByTestId('mobile-work-card')
      
      // Tab键聚焦
      await userEvent.tab()
      expect(card).toHaveFocus()
      
      // Enter键激活
      await userEvent.keyboard('{Enter}')
      expect(defaultProps.onView).toHaveBeenCalledWith(mockWork)
    })

    test('应该提供屏幕阅读器支持', () => {
      render(<MobileWorkCard {...defaultProps} />)
      
      expect(screen.getByText('1250次浏览')).toHaveAttribute('aria-label', '浏览量1250次')
      expect(screen.getByText('89个赞')).toHaveAttribute('aria-label', '获得89个赞')
      expect(screen.getByText('23次复用')).toHaveAttribute('aria-label', '被复用23次')
    })
  })

  describe('性能优化', () => {
    test('应该使用虚拟化处理大量卡片', () => {
      const manyWorks = Array(1000).fill(null).map((_, i) => 
        createWorkFixture({ id: `work-${i}`, title: `作品${i}` })
      )
      
      render(
        <div data-testid="work-list">
          {manyWorks.slice(0, 10).map(work => (
            <MobileWorkCard key={work.id} work={work} {...defaultProps} />
          ))}
        </div>
      )
      
      // 应该只渲染可见的卡片
      expect(screen.getAllByTestId('mobile-work-card')).toHaveLength(10)
    })

    test('应该防抖处理快速点击', async () => {
      jest.useFakeTimers()
      
      render(<MobileWorkCard {...defaultProps} />)
      
      const likeButton = screen.getByLabelText('点赞')
      
      // 快速多次点击
      await userEvent.click(likeButton)
      await userEvent.click(likeButton)
      await userEvent.click(likeButton)
      
      // 应该防抖处理
      expect(defaultProps.onLike).toHaveBeenCalledTimes(1)
      
      jest.useRealTimers()
    })

    test('应该缓存计算结果', () => {
      const { rerender } = render(<MobileWorkCard {...defaultProps} />)
      
      // 重新渲染相同props
      rerender(<MobileWorkCard {...defaultProps} />)
      
      // 应该使用缓存的计算结果，不重新计算
      expect(screen.getByText('1.3k')).toBeInTheDocument() // 格式化的浏览量
    })
  })

  describe('错误处理', () => {
    test('应该处理图片加载失败', async () => {
      render(<MobileWorkCard {...defaultProps} />)
      
      const avatar = screen.getByAltText('张老师的头像')
      
      // 模拟图片加载失败
      fireEvent.error(avatar)
      
      await waitFor(() => {
        expect(screen.getByTestId('default-avatar')).toBeInTheDocument()
      })
    })

    test('应该处理网络错误', async () => {
      mockWorkService.likeWork.mockRejectedValue(new Error('网络错误'))
      
      render(<MobileWorkCard {...defaultProps} showQuickActions={true} />)
      
      const likeButton = screen.getByLabelText('点赞')
      await userEvent.click(likeButton)
      
      await waitFor(() => {
        expect(screen.getByText('操作失败，请重试')).toBeInTheDocument()
      })
    })

    test('应该处理数据缺失', () => {
      const incompleteWork = {
        ...mockWork,
        author: null,
        stats: null,
      }
      
      render(<MobileWorkCard {...defaultProps} work={incompleteWork} />)
      
      expect(screen.getByText('匿名用户')).toBeInTheDocument()
      expect(screen.getByText('0')).toBeInTheDocument() // 默认统计值
    })
  })
})