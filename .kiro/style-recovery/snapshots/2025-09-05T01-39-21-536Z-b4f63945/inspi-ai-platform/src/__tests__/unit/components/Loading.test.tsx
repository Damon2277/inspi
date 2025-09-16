/**
 * Loading 组件单元测试
 */

import React from 'react'
import { render, screen } from '@testing-library/react'
import Loading from '@/components/common/Loading'
import test from 'node:test'
import test from 'node:test'
import test from 'node:test'
import test from 'node:test'
import test from 'node:test'
import test from 'node:test'
import test from 'node:test'
import test from 'node:test'
import test from 'node:test'
import test from 'node:test'
import test from 'node:test'
import { describe } from 'node:test'

describe('Loading 组件', () => {
  test('应该渲染默认的加载组件', () => {
    render(<Loading />)
    
    const spinner = screen.getByTestId('loading-spinner')
    expect(spinner).toBeInTheDocument()
    expect(spinner).toHaveClass('w-8', 'h-8', 'animate-spin')
  })

  test('应该渲染不同尺寸的加载组件', () => {
    const { rerender } = render(<Loading size="sm" />)
    let spinner = screen.getByTestId('loading-spinner')
    expect(spinner).toHaveClass('w-4', 'h-4')

    rerender(<Loading size="md" />)
    spinner = screen.getByTestId('loading-spinner')
    expect(spinner).toHaveClass('w-8', 'h-8')

    rerender(<Loading size="lg" />)
    spinner = screen.getByTestId('loading-spinner')
    expect(spinner).toHaveClass('w-12', 'h-12')
  })

  test('应该显示加载文本', () => {
    const loadingText = '正在加载...'
    render(<Loading text={loadingText} />)
    
    expect(screen.getByText(loadingText)).toBeInTheDocument()
    expect(screen.getByText(loadingText)).toHaveClass('mt-2', 'text-sm', 'text-gray-600')
  })

  test('不应该显示文本当text未提供时', () => {
    render(<Loading />)
    
    const textElement = screen.queryByText(/正在加载/)
    expect(textElement).not.toBeInTheDocument()
  })

  test('应该应用自定义className', () => {
    const customClass = 'custom-loading-class'
    render(<Loading className={customClass} />)
    
    const container = screen.getByTestId('loading-spinner').parentElement
    expect(container).toHaveClass(customClass)
  })

  test('应该包含默认的flex布局类', () => {
    render(<Loading />)
    
    const container = screen.getByTestId('loading-spinner').parentElement
    expect(container).toHaveClass('flex', 'flex-col', 'items-center', 'justify-center')
  })

  test('应该渲染旋转动画的圆形边框', () => {
    render(<Loading />)
    
    const spinner = screen.getByTestId('loading-spinner')
    const spinnerInner = spinner.firstChild
    
    expect(spinnerInner).toHaveClass(
      'w-full', 
      'h-full', 
      'border-4', 
      'border-gray-200', 
      'border-t-blue-600', 
      'rounded-full'
    )
  })

  test('应该同时显示文本和自定义className', () => {
    const loadingText = '加载中...'
    const customClass = 'my-custom-class'
    
    render(<Loading text={loadingText} className={customClass} />)
    
    expect(screen.getByText(loadingText)).toBeInTheDocument()
    
    const container = screen.getByTestId('loading-spinner').parentElement
    expect(container).toHaveClass(customClass)
  })

  test('应该处理空字符串text', () => {
    render(<Loading text="" />)
    
    // 空字符串不应该显示文本段落
    const textElement = screen.queryByText('')
    expect(textElement).not.toBeInTheDocument()
  })

  test('应该处理长文本', () => {
    const longText = '这是一个非常长的加载文本，用来测试组件是否能正确处理长文本内容'
    render(<Loading text={longText} />)
    
    expect(screen.getByText(longText)).toBeInTheDocument()
  })

  test('应该保持组件结构的一致性', () => {
    render(<Loading size="lg" text="测试文本" className="test-class" />)
    
    const container = screen.getByTestId('loading-spinner').parentElement
    const spinner = screen.getByTestId('loading-spinner')
    const text = screen.getByText('测试文本')
    
    // 验证DOM结构
    expect(container).toContainElement(spinner)
    expect(container).toContainElement(text)
    expect(container.children).toHaveLength(2) // spinner + text
  })
})