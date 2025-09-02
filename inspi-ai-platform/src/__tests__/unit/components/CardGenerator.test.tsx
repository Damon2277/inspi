/**
 * AI卡片生成器组件测试
 */

import React from 'react'
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { CardGenerator } from '@/components/magic/CardGenerator'
import { createCardSetFixture, createUserFixture } from '@/fixtures'

// Mock AI服务
const mockAIService = {
  generateCards: jest.fn(),
  regenerateCard: jest.fn(),
  validatePrompt: jest.fn(),
}

jest.mock('@/lib/ai/geminiService', () => mockAIService)

// Mock使用限制检查
const mockUsageLimit = {
  checkGenerationLimit: jest.fn(),
  updateUsage: jest.fn(),
}

jest.mock('@/lib/services/usageLimitService', () => mockUsageLimit)

// Mock用户状态
const mockUser = createUserFixture({
  id: 'user-1',
  subscription: 'pro',
  dailyGenerations: 5,
})

jest.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({
    user: mockUser,
    isAuthenticated: true,
  }),
}))

describe('CardGenerator组件测试', () => {
  const defaultProps = {
    onCardsGenerated: jest.fn(),
    onError: jest.fn(),
    maxCards: 4,
    allowRegeneration: true,
  }

  beforeEach(() => {
    jest.clearAllMocks()
    mockUsageLimit.checkGenerationLimit.mockResolvedValue({ allowed: true, remaining: 10 })
    mockAIService.validatePrompt.mockResolvedValue({ valid: true, suggestions: [] })
  })

  describe('基础渲染', () => {
    test('应该正确渲染卡片生成器界面', () => {
      render(<CardGenerator {...defaultProps} />)
      
      expect(screen.getByTestId('card-generator')).toBeInTheDocument()
      expect(screen.getByPlaceholderText('输入知识点，例如：二次函数的图像与性质')).toBeInTheDocument()
      expect(screen.getByText('生成教学卡片')).toBeInTheDocument()
    })

    test('应该显示卡片类型选择器', () => {
      render(<CardGenerator {...defaultProps} />)
      
      expect(screen.getByText('概念解释')).toBeInTheDocument()
      expect(screen.getByText('例题演示')).toBeInTheDocument()
      expect(screen.getByText('练习题目')).toBeInTheDocument()
      expect(screen.getByText('知识拓展')).toBeInTheDocument()
    })

    test('应该显示使用限制信息', () => {
      render(<CardGenerator {...defaultProps} />)
      
      expect(screen.getByText(/今日剩余生成次数/)).toBeInTheDocument()
    })

    test('应该在未登录时显示登录提示', () => {
      jest.mocked(require('@/hooks/useAuth').useAuth).mockReturnValue({
        user: null,
        isAuthenticated: false,
      })
      
      render(<CardGenerator {...defaultProps} />)
      
      expect(screen.getByText('请先登录以使用AI生成功能')).toBeInTheDocument()
      expect(screen.getByText('立即登录')).toBeInTheDocument()
    })
  })

  describe('输入验证', () => {
    test('应该验证知识点输入', async () => {
      render(<CardGenerator {...defaultProps} />)
      
      const input = screen.getByPlaceholderText('输入知识点，例如：二次函数的图像与性质')
      const generateButton = screen.getByText('生成教学卡片')
      
      // 测试空输入
      await userEvent.click(generateButton)
      expect(screen.getByText('请输入知识点')).toBeInTheDocument()
      
      // 测试过短输入
      await userEvent.type(input, '数学')
      await userEvent.click(generateButton)
      expect(screen.getByText('知识点描述过于简短，请提供更详细的信息')).toBeInTheDocument()
      
      // 测试过长输入
      const longText = 'a'.repeat(501)
      await userEvent.clear(input)
      await userEvent.type(input, longText)
      await userEvent.click(generateButton)
      expect(screen.getByText('知识点描述过长，请控制在500字以内')).toBeInTheDocument()
    })

    test('应该验证卡片类型选择', async () => {
      render(<CardGenerator {...defaultProps} />)
      
      const input = screen.getByPlaceholderText('输入知识点，例如：二次函数的图像与性质')
      const generateButton = screen.getByText('生成教学卡片')
      
      await userEvent.type(input, '二次函数的图像与性质')
      
      // 取消所有卡片类型选择
      const conceptCard = screen.getByLabelText('概念解释')
      const exampleCard = screen.getByLabelText('例题演示')
      const practiceCard = screen.getByLabelText('练习题目')
      const extensionCard = screen.getByLabelText('知识拓展')
      
      await userEvent.click(conceptCard)
      await userEvent.click(exampleCard)
      await userEvent.click(practiceCard)
      await userEvent.click(extensionCard)
      
      await userEvent.click(generateButton)
      expect(screen.getByText('请至少选择一种卡片类型')).toBeInTheDocument()
    })

    test('应该调用AI服务验证提示词', async () => {
      mockAIService.validatePrompt.mockResolvedValue({
        valid: false,
        suggestions: ['建议添加具体的学习目标', '可以包含更多背景信息'],
      })
      
      render(<CardGenerator {...defaultProps} />)
      
      const input = screen.getByPlaceholderText('输入知识点，例如：二次函数的图像与性质')
      await userEvent.type(input, '函数')
      
      await waitFor(() => {
        expect(mockAIService.validatePrompt).toHaveBeenCalledWith('函数')
      })
      
      expect(screen.getByText('建议添加具体的学习目标')).toBeInTheDocument()
      expect(screen.getByText('可以包含更多背景信息')).toBeInTheDocument()
    })
  })

  describe('使用限制检查', () => {
    test('应该检查生成限制', async () => {
      render(<CardGenerator {...defaultProps} />)
      
      const input = screen.getByPlaceholderText('输入知识点，例如：二次函数的图像与性质')
      const generateButton = screen.getByText('生成教学卡片')
      
      await userEvent.type(input, '二次函数的图像与性质')
      await userEvent.click(generateButton)
      
      await waitFor(() => {
        expect(mockUsageLimit.checkGenerationLimit).toHaveBeenCalledWith('user-1')
      })
    })

    test('应该处理生成限制超出', async () => {
      mockUsageLimit.checkGenerationLimit.mockResolvedValue({
        allowed: false,
        remaining: 0,
        resetTime: new Date(Date.now() + 3600000), // 1小时后重置
      })
      
      render(<CardGenerator {...defaultProps} />)
      
      const input = screen.getByPlaceholderText('输入知识点，例如：二次函数的图像与性质')
      const generateButton = screen.getByText('生成教学卡片')
      
      await userEvent.type(input, '二次函数的图像与性质')
      await userEvent.click(generateButton)
      
      await waitFor(() => {
        expect(screen.getByText('今日生成次数已用完')).toBeInTheDocument()
        expect(screen.getByText('升级订阅')).toBeInTheDocument()
      })
    })

    test('应该显示不同订阅等级的限制信息', () => {
      const freeUser = { ...mockUser, subscription: 'free' }
      jest.mocked(require('@/hooks/useAuth').useAuth).mockReturnValue({
        user: freeUser,
        isAuthenticated: true,
      })
      
      render(<CardGenerator {...defaultProps} />)
      
      expect(screen.getByText(/免费用户每日限制/)).toBeInTheDocument()
    })
  })

  describe('卡片生成功能', () => {
    test('应该成功生成卡片', async () => {
      const mockCards = createCardSetFixture({
        knowledgePoint: '二次函数的图像与性质',
        cards: [
          {
            type: 'concept',
            title: '二次函数概念',
            content: '二次函数是形如 f(x) = ax² + bx + c 的函数...',
          },
          {
            type: 'example',
            title: '例题演示',
            content: '求函数 f(x) = x² - 4x + 3 的顶点坐标...',
          },
        ],
      })
      
      mockAIService.generateCards.mockResolvedValue(mockCards)
      
      render(<CardGenerator {...defaultProps} />)
      
      const input = screen.getByPlaceholderText('输入知识点，例如：二次函数的图像与性质')
      const generateButton = screen.getByText('生成教学卡片')
      
      await userEvent.type(input, '二次函数的图像与性质')
      await userEvent.click(generateButton)
      
      // 应该显示加载状态
      expect(screen.getByText('AI正在生成卡片...')).toBeInTheDocument()
      expect(screen.getByTestId('loading-spinner')).toBeInTheDocument()
      
      await waitFor(() => {
        expect(mockAIService.generateCards).toHaveBeenCalledWith({
          knowledgePoint: '二次函数的图像与性质',
          cardTypes: ['concept', 'example', 'practice', 'extension'],
          userId: 'user-1',
        })
      })
      
      await waitFor(() => {
        expect(defaultProps.onCardsGenerated).toHaveBeenCalledWith(mockCards)
      })
      
      // 应该更新使用统计
      expect(mockUsageLimit.updateUsage).toHaveBeenCalledWith('user-1', 'generation')
    })

    test('应该处理生成失败', async () => {
      const error = new Error('AI服务暂时不可用')
      mockAIService.generateCards.mockRejectedValue(error)
      
      render(<CardGenerator {...defaultProps} />)
      
      const input = screen.getByPlaceholderText('输入知识点，例如：二次函数的图像与性质')
      const generateButton = screen.getByText('生成教学卡片')
      
      await userEvent.type(input, '二次函数的图像与性质')
      await userEvent.click(generateButton)
      
      await waitFor(() => {
        expect(screen.getByText('生成失败：AI服务暂时不可用')).toBeInTheDocument()
        expect(screen.getByText('重试')).toBeInTheDocument()
      })
      
      expect(defaultProps.onError).toHaveBeenCalledWith(error)
    })

    test('应该支持重试生成', async () => {
      const error = new Error('网络错误')
      mockAIService.generateCards
        .mockRejectedValueOnce(error)
        .mockResolvedValueOnce(createCardSetFixture())
      
      render(<CardGenerator {...defaultProps} />)
      
      const input = screen.getByPlaceholderText('输入知识点，例如：二次函数的图像与性质')
      const generateButton = screen.getByText('生成教学卡片')
      
      await userEvent.type(input, '二次函数的图像与性质')
      await userEvent.click(generateButton)
      
      await waitFor(() => {
        expect(screen.getByText('重试')).toBeInTheDocument()
      })
      
      const retryButton = screen.getByText('重试')
      await userEvent.click(retryButton)
      
      await waitFor(() => {
        expect(mockAIService.generateCards).toHaveBeenCalledTimes(2)
      })
    })
  })

  describe('卡片类型选择', () => {
    test('应该支持选择特定卡片类型', async () => {
      render(<CardGenerator {...defaultProps} />)
      
      const conceptCard = screen.getByLabelText('概念解释')
      const exampleCard = screen.getByLabelText('例题演示')
      
      // 只选择概念解释和例题演示
      await userEvent.click(practiceCard)
      await userEvent.click(extensionCard)
      
      const input = screen.getByPlaceholderText('输入知识点，例如：二次函数的图像与性质')
      const generateButton = screen.getByText('生成教学卡片')
      
      await userEvent.type(input, '二次函数的图像与性质')
      await userEvent.click(generateButton)
      
      await waitFor(() => {
        expect(mockAIService.generateCards).toHaveBeenCalledWith({
          knowledgePoint: '二次函数的图像与性质',
          cardTypes: ['concept', 'example'],
          userId: 'user-1',
        })
      })
    })

    test('应该显示每种卡片类型的说明', () => {
      render(<CardGenerator {...defaultProps} />)
      
      expect(screen.getByText('解释核心概念和定义')).toBeInTheDocument()
      expect(screen.getByText('提供具体例题和解答')).toBeInTheDocument()
      expect(screen.getByText('生成练习题供学生练习')).toBeInTheDocument()
      expect(screen.getByText('拓展相关知识和应用')).toBeInTheDocument()
    })

    test('应该支持全选和全不选', async () => {
      render(<CardGenerator {...defaultProps} />)
      
      const selectAllButton = screen.getByText('全选')
      const deselectAllButton = screen.getByText('全不选')
      
      await userEvent.click(deselectAllButton)
      
      expect(screen.getByLabelText('概念解释')).not.toBeChecked()
      expect(screen.getByLabelText('例题演示')).not.toBeChecked()
      expect(screen.getByLabelText('练习题目')).not.toBeChecked()
      expect(screen.getByLabelText('知识拓展')).not.toBeChecked()
      
      await userEvent.click(selectAllButton)
      
      expect(screen.getByLabelText('概念解释')).toBeChecked()
      expect(screen.getByLabelText('例题演示')).toBeChecked()
      expect(screen.getByLabelText('练习题目')).toBeChecked()
      expect(screen.getByLabelText('知识拓展')).toBeChecked()
    })
  })

  describe('高级设置', () => {
    test('应该支持难度级别设置', async () => {
      render(<CardGenerator {...defaultProps} showAdvancedOptions={true} />)
      
      const advancedToggle = screen.getByText('高级设置')
      await userEvent.click(advancedToggle)
      
      const difficultySelect = screen.getByLabelText('难度级别')
      await userEvent.selectOptions(difficultySelect, 'intermediate')
      
      const input = screen.getByPlaceholderText('输入知识点，例如：二次函数的图像与性质')
      const generateButton = screen.getByText('生成教学卡片')
      
      await userEvent.type(input, '二次函数的图像与性质')
      await userEvent.click(generateButton)
      
      await waitFor(() => {
        expect(mockAIService.generateCards).toHaveBeenCalledWith({
          knowledgePoint: '二次函数的图像与性质',
          cardTypes: ['concept', 'example', 'practice', 'extension'],
          userId: 'user-1',
          difficulty: 'intermediate',
        })
      })
    })

    test('应该支持学段设置', async () => {
      render(<CardGenerator {...defaultProps} showAdvancedOptions={true} />)
      
      const advancedToggle = screen.getByText('高级设置')
      await userEvent.click(advancedToggle)
      
      const gradeSelect = screen.getByLabelText('适用学段')
      await userEvent.selectOptions(gradeSelect, 'high-school')
      
      const input = screen.getByPlaceholderText('输入知识点，例如：二次函数的图像与性质')
      const generateButton = screen.getByText('生成教学卡片')
      
      await userEvent.type(input, '二次函数的图像与性质')
      await userEvent.click(generateButton)
      
      await waitFor(() => {
        expect(mockAIService.generateCards).toHaveBeenCalledWith(
          expect.objectContaining({
            gradeLevel: 'high-school',
          })
        )
      })
    })

    test('应该支持自定义提示词', async () => {
      render(<CardGenerator {...defaultProps} showAdvancedOptions={true} />)
      
      const advancedToggle = screen.getByText('高级设置')
      await userEvent.click(advancedToggle)
      
      const customPrompt = screen.getByLabelText('自定义提示词')
      await userEvent.type(customPrompt, '请重点关注实际应用场景')
      
      const input = screen.getByPlaceholderText('输入知识点，例如：二次函数的图像与性质')
      const generateButton = screen.getByText('生成教学卡片')
      
      await userEvent.type(input, '二次函数的图像与性质')
      await userEvent.click(generateButton)
      
      await waitFor(() => {
        expect(mockAIService.generateCards).toHaveBeenCalledWith(
          expect.objectContaining({
            customPrompt: '请重点关注实际应用场景',
          })
        )
      })
    })
  })

  describe('历史记录', () => {
    test('应该显示最近的生成历史', () => {
      const historyProps = {
        ...defaultProps,
        showHistory: true,
        recentGenerations: [
          { knowledgePoint: '一元二次方程', timestamp: new Date() },
          { knowledgePoint: '三角函数', timestamp: new Date(Date.now() - 3600000) },
        ],
      }
      
      render(<CardGenerator {...historyProps} />)
      
      expect(screen.getByText('最近生成')).toBeInTheDocument()
      expect(screen.getByText('一元二次方程')).toBeInTheDocument()
      expect(screen.getByText('三角函数')).toBeInTheDocument()
    })

    test('应该支持从历史记录快速生成', async () => {
      const historyProps = {
        ...defaultProps,
        showHistory: true,
        recentGenerations: [
          { knowledgePoint: '一元二次方程', timestamp: new Date() },
        ],
      }
      
      render(<CardGenerator {...historyProps} />)
      
      const historyItem = screen.getByText('一元二次方程')
      await userEvent.click(historyItem)
      
      const input = screen.getByPlaceholderText('输入知识点，例如：二次函数的图像与性质')
      expect(input).toHaveValue('一元二次方程')
    })

    test('应该支持清除历史记录', async () => {
      const onClearHistory = jest.fn()
      const historyProps = {
        ...defaultProps,
        showHistory: true,
        recentGenerations: [
          { knowledgePoint: '一元二次方程', timestamp: new Date() },
        ],
        onClearHistory,
      }
      
      render(<CardGenerator {...historyProps} />)
      
      const clearButton = screen.getByLabelText('清除历史')
      await userEvent.click(clearButton)
      
      expect(onClearHistory).toHaveBeenCalled()
    })
  })

  describe('响应式设计', () => {
    test('应该在移动设备上调整布局', () => {
      // 模拟移动设备
      Object.defineProperty(window, 'innerWidth', { value: 375 })
      
      render(<CardGenerator {...defaultProps} />)
      
      expect(screen.getByTestId('card-generator')).toHaveClass('mobile-layout')
    })

    test('应该在小屏幕上隐藏高级选项', () => {
      Object.defineProperty(window, 'innerWidth', { value: 375 })
      
      render(<CardGenerator {...defaultProps} showAdvancedOptions={true} />)
      
      expect(screen.queryByText('高级设置')).not.toBeInTheDocument()
    })
  })

  describe('无障碍性', () => {
    test('应该提供适当的ARIA标签', () => {
      render(<CardGenerator {...defaultProps} />)
      
      expect(screen.getByRole('main')).toHaveAttribute('aria-label', 'AI卡片生成器')
      expect(screen.getByRole('textbox')).toHaveAttribute('aria-describedby', 'knowledge-point-help')
      expect(screen.getByRole('button', { name: '生成教学卡片' })).toHaveAttribute('aria-describedby', 'generation-info')
    })

    test('应该支持键盘导航', async () => {
      render(<CardGenerator {...defaultProps} />)
      
      const input = screen.getByPlaceholderText('输入知识点，例如：二次函数的图像与性质')
      const generateButton = screen.getByText('生成教学卡片')
      
      // Tab键导航
      await userEvent.tab()
      expect(input).toHaveFocus()
      
      await userEvent.tab()
      expect(screen.getByLabelText('概念解释')).toHaveFocus()
      
      // 跳转到生成按钮
      await userEvent.keyboard('{Tab}{Tab}{Tab}{Tab}')
      expect(generateButton).toHaveFocus()
      
      // Enter键触发生成
      await userEvent.type(input, '二次函数')
      await userEvent.keyboard('{Enter}')
      
      await waitFor(() => {
        expect(mockAIService.generateCards).toHaveBeenCalled()
      })
    })

    test('应该提供屏幕阅读器支持', () => {
      render(<CardGenerator {...defaultProps} />)
      
      expect(screen.getByText('输入知识点以生成AI教学卡片')).toHaveAttribute('role', 'status')
      expect(screen.getByText('选择要生成的卡片类型')).toHaveAttribute('role', 'group')
    })
  })

  describe('性能优化', () => {
    test('应该防抖处理输入验证', async () => {
      jest.useFakeTimers()
      
      render(<CardGenerator {...defaultProps} />)
      
      const input = screen.getByPlaceholderText('输入知识点，例如：二次函数的图像与性质')
      
      // 快速输入多个字符
      await userEvent.type(input, '二次函数')
      
      // 验证应该被防抖
      expect(mockAIService.validatePrompt).not.toHaveBeenCalled()
      
      // 等待防抖时间
      act(() => {
        jest.advanceTimersByTime(500)
      })
      
      await waitFor(() => {
        expect(mockAIService.validatePrompt).toHaveBeenCalledTimes(1)
      })
      
      jest.useRealTimers()
    })

    test('应该缓存验证结果', async () => {
      render(<CardGenerator {...defaultProps} />)
      
      const input = screen.getByPlaceholderText('输入知识点，例如：二次函数的图像与性质')
      
      // 第一次输入
      await userEvent.type(input, '二次函数')
      await waitFor(() => {
        expect(mockAIService.validatePrompt).toHaveBeenCalledTimes(1)
      })
      
      // 清空后重新输入相同内容
      await userEvent.clear(input)
      await userEvent.type(input, '二次函数')
      
      // 应该使用缓存，不再调用验证
      await waitFor(() => {
        expect(mockAIService.validatePrompt).toHaveBeenCalledTimes(1)
      })
    })
  })

  describe('错误边界', () => {
    test('应该捕获组件内部错误', () => {
      const ThrowError = () => {
        throw new Error('Component error')
      }
      
      const ErrorBoundaryWrapper = ({ children }: { children: React.ReactNode }) => {
        try {
          return <>{children}</>
        } catch (error) {
          return <div>组件发生错误</div>
        }
      }
      
      render(
        <ErrorBoundaryWrapper>
          <CardGenerator {...defaultProps} />
          <ThrowError />
        </ErrorBoundaryWrapper>
      )
      
      expect(screen.getByText('组件发生错误')).toBeInTheDocument()
    })
  })
})