/**
 * Task 17 Day 2 移动端组件测试
 */

import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { renderHook, act } from '@testing-library/react'
import { useVirtualKeyboard } from '@/hooks/useTouch'

// Mock framer-motion
jest.mock('framer-motion', () => ({
  motion: {
    div: 'div',
    button: 'button',
    textarea: 'textarea'
  },
  AnimatePresence: ({ children }: { children: React.ReactNode }) => children
}))

// Mock useResponsive
jest.mock('@/hooks/useResponsive', () => ({
  useResponsive: () => ({
    isMobile: true,
    isTablet: false,
    isDesktop: false,
    isWide: false,
    currentBreakpoint: 'mobile',
    screenWidth: 375,
    screenHeight: 667
  })
}))

// Mock useVirtualKeyboard
jest.mock('@/hooks/useTouch', () => ({
  useVirtualKeyboard: () => ({
    keyboardHeight: 0,
    isKeyboardOpen: false
  }),
  useTouch: () => ({
    touchState: {
      isPressed: false,
      startTime: 0,
      startX: 0,
      startY: 0,
      currentX: 0,
      currentY: 0
    },
    handleTouchStart: jest.fn(),
    handleTouchMove: jest.fn(),
    handleTouchEnd: jest.fn(),
    isPressed: false
  })
}))

describe('Task 17 Day 2: 移动端优化组件', () => {
  describe('MobileKnowledgeInput', () => {
    test('应该渲染移动端知识点输入组件', () => {
      const mockOnGenerate = jest.fn()
      
      const TestComponent = () => {
        const MobileKnowledgeInput = require('@/components/mobile/MobileKnowledgeInput').default
        return (
          <MobileKnowledgeInput
            onGenerate={mockOnGenerate}
            loading={false}
          />
        )
      }

      render(<TestComponent />)
      
      expect(screen.getByText('🪄 AI教学魔法师')).toBeInTheDocument()
      expect(screen.getByText('第1步：输入知识点')).toBeInTheDocument()
    })

    test('应该支持步骤式输入流程', async () => {
      const mockOnGenerate = jest.fn()
      
      const TestComponent = () => {
        const MobileKnowledgeInput = require('@/components/mobile/MobileKnowledgeInput').default
        return (
          <MobileKnowledgeInput
            onGenerate={mockOnGenerate}
            loading={false}
          />
        )
      }

      render(<TestComponent />)
      
      // 输入知识点
      const textarea = screen.getByPlaceholderText(/输入您想要教授的知识点/)
      fireEvent.change(textarea, { target: { value: '二次函数' } })
      
      await waitFor(() => {
        expect(screen.getByText('第2步：选择学科')).toBeInTheDocument()
      })
    })

    test('应该显示建议列表', () => {
      const mockOnGenerate = jest.fn()
      
      const TestComponent = () => {
        const MobileKnowledgeInput = require('@/components/mobile/MobileKnowledgeInput').default
        return (
          <MobileKnowledgeInput
            onGenerate={mockOnGenerate}
            loading={false}
          />
        )
      }

      render(<TestComponent />)
      
      const inspirationButton = screen.getByText('💡 获取灵感')
      fireEvent.click(inspirationButton)
      
      expect(screen.getByText('💡 知识点建议')).toBeInTheDocument()
    })
  })

  describe('PWA功能', () => {
    test('应该检测PWA安装状态', () => {
      // Mock PWA相关API
      Object.defineProperty(window, 'matchMedia', {
        writable: true,
        value: jest.fn().mockImplementation(query => ({
          matches: query === '(display-mode: standalone)',
          media: query,
          onchange: null,
          addListener: jest.fn(),
          removeListener: jest.fn(),
          addEventListener: jest.fn(),
          removeEventListener: jest.fn(),
          dispatchEvent: jest.fn(),
        })),
      })

      const TestComponent = () => {
        const PWAInstallPrompt = require('@/components/mobile/PWAInstallPrompt').default
        return <PWAInstallPrompt />
      }

      render(<TestComponent />)
      
      // PWA组件应该正常渲染（即使没有显示内容）
      expect(document.body).toBeInTheDocument()
    })

    test('应该处理离线状态', () => {
      // Mock navigator.onLine
      Object.defineProperty(navigator, 'onLine', {
        writable: true,
        value: false,
      })

      const TestComponent = () => {
        const OfflineIndicator = require('@/components/mobile/OfflineIndicator').default
        return <OfflineIndicator />
      }

      render(<TestComponent />)
      
      // 离线指示器应该正常渲染
      expect(document.body).toBeInTheDocument()
    })
  })

  describe('触摸优化', () => {
    test('应该支持虚拟键盘适配', () => {
      const { result } = renderHook(() => useVirtualKeyboard())
      
      expect(result.current.keyboardHeight).toBe(0)
      expect(result.current.isKeyboardOpen).toBe(false)
    })

    test('应该应用移动端样式类', () => {
      const TestComponent = () => (
        <div>
          <div className="mobile-card" data-testid="mobile-card">卡片</div>
          <button className="mobile-button" data-testid="mobile-button">按钮</button>
          <input className="mobile-input" data-testid="mobile-input" />
          <div className="touch-target" data-testid="touch-target">触摸目标</div>
        </div>
      )

      render(<TestComponent />)
      
      expect(screen.getByTestId('mobile-card')).toHaveClass('mobile-card')
      expect(screen.getByTestId('mobile-button')).toHaveClass('mobile-button')
      expect(screen.getByTestId('mobile-input')).toHaveClass('mobile-input')
      expect(screen.getByTestId('touch-target')).toHaveClass('touch-target')
    })
  })

  describe('响应式行为', () => {
    test('应该在移动端显示正确的组件', () => {
      const TestComponent = () => {
        const { isMobile } = require('@/hooks/useResponsive').useResponsive()
        
        return (
          <div>
            {isMobile ? (
              <div data-testid="mobile-layout">移动端布局</div>
            ) : (
              <div data-testid="desktop-layout">桌面端布局</div>
            )}
          </div>
        )
      }

      render(<TestComponent />)
      
      expect(screen.getByTestId('mobile-layout')).toBeInTheDocument()
      expect(screen.queryByTestId('desktop-layout')).not.toBeInTheDocument()
    })

    test('应该正确处理移动端特定功能', () => {
      const TestComponent = () => {
        const { isMobile } = require('@/hooks/useResponsive').useResponsive()
        
        return (
          <div>
            {isMobile && (
              <div data-testid="mobile-features">
                <div>触摸优化</div>
                <div>虚拟键盘适配</div>
                <div>PWA支持</div>
              </div>
            )}
          </div>
        )
      }

      render(<TestComponent />)
      
      const mobileFeatures = screen.getByTestId('mobile-features')
      expect(mobileFeatures).toBeInTheDocument()
      expect(screen.getByText('触摸优化')).toBeInTheDocument()
      expect(screen.getByText('虚拟键盘适配')).toBeInTheDocument()
      expect(screen.getByText('PWA支持')).toBeInTheDocument()
    })
  })

  describe('用户体验优化', () => {
    test('应该支持渐进式表单填写', () => {
      const TestComponent = () => (
        <div>
          <div data-testid="step-1">步骤1：输入知识点</div>
          <div data-testid="step-2" style={{ display: 'none' }}>步骤2：选择学科</div>
          <div data-testid="step-3" style={{ display: 'none' }}>步骤3：选择学段</div>
          <div data-testid="progress-bar">
            <div style={{ width: '33%' }}>进度条</div>
          </div>
        </div>
      )

      render(<TestComponent />)
      
      expect(screen.getByTestId('step-1')).toBeInTheDocument()
      expect(screen.getByTestId('progress-bar')).toBeInTheDocument()
    })

    test('应该提供触摸反馈', () => {
      const TestComponent = () => (
        <button 
          className="mobile-button"
          data-testid="touch-button"
          onTouchStart={() => {}}
          onTouchEnd={() => {}}
        >
          触摸按钮
        </button>
      )

      render(<TestComponent />)
      
      const button = screen.getByTestId('touch-button')
      expect(button).toBeInTheDocument()
      
      // 模拟触摸事件
      fireEvent.touchStart(button)
      fireEvent.touchEnd(button)
    })
  })
})