/**
 * 响应式网格系统组件
 * 基于CSS Grid的灵活布局系统
 */

import React from 'react'
import { cn } from '@/lib/utils'
import { ResponsiveValue, getResponsiveValue } from '@/lib/responsive/breakpoints'
import { useResponsive } from '@/hooks/useResponsive'

interface GridProps {
  children: React.ReactNode
  columns?: ResponsiveValue<number>
  gap?: ResponsiveValue<string>
  className?: string
}

export const ResponsiveGrid: React.FC<GridProps> = ({
  children,
  columns = { mobile: 1, tablet: 2, desktop: 3, wide: 4, default: 3 },
  gap = { mobile: '1rem', tablet: '1.5rem', desktop: '2rem', wide: '2rem', default: '1.5rem' },
  className
}) => {
  const { currentBreakpoint } = useResponsive()
  
  const currentColumns = getResponsiveValue(columns, currentBreakpoint)
  const currentGap = getResponsiveValue(gap, currentBreakpoint)

  const gridStyle = {
    display: 'grid',
    gridTemplateColumns: `repeat(${currentColumns}, 1fr)`,
    gap: currentGap
  }

  return (
    <div 
      className={cn('responsive-grid', className)}
      style={gridStyle}
    >
      {children}
    </div>
  )
}

// 网格项组件
interface GridItemProps {
  children: React.ReactNode
  span?: ResponsiveValue<number>
  className?: string
}

export const GridItem: React.FC<GridItemProps> = ({
  children,
  span = { default: 1 },
  className
}) => {
  const { currentBreakpoint } = useResponsive()
  const currentSpan = getResponsiveValue(span, currentBreakpoint)

  const itemStyle = {
    gridColumn: `span ${currentSpan}`
  }

  return (
    <div 
      className={cn('grid-item', className)}
      style={itemStyle}
    >
      {children}
    </div>
  )
}

// 容器组件
interface ContainerProps {
  children: React.ReactNode
  maxWidth?: ResponsiveValue<string>
  padding?: ResponsiveValue<string>
  className?: string
}

export const ResponsiveContainer: React.FC<ContainerProps> = ({
  children,
  maxWidth = { 
    mobile: '100%', 
    tablet: '768px', 
    desktop: '1024px', 
    wide: '1200px', 
    default: '1024px' 
  },
  padding = { 
    mobile: '1rem', 
    tablet: '2rem', 
    desktop: '2rem', 
    wide: '2rem', 
    default: '2rem' 
  },
  className
}) => {
  const { currentBreakpoint } = useResponsive()
  
  const currentMaxWidth = getResponsiveValue(maxWidth, currentBreakpoint)
  const currentPadding = getResponsiveValue(padding, currentBreakpoint)

  const containerStyle = {
    maxWidth: currentMaxWidth,
    padding: currentPadding,
    margin: '0 auto',
    width: '100%'
  }

  return (
    <div 
      className={cn('responsive-container', className)}
      style={containerStyle}
    >
      {children}
    </div>
  )
}

// Flexbox 响应式组件
interface FlexProps {
  children: React.ReactNode
  direction?: ResponsiveValue<'row' | 'column'>
  justify?: ResponsiveValue<'flex-start' | 'center' | 'flex-end' | 'space-between' | 'space-around' | 'space-evenly'>
  align?: ResponsiveValue<'flex-start' | 'center' | 'flex-end' | 'stretch'>
  gap?: ResponsiveValue<string>
  wrap?: ResponsiveValue<'nowrap' | 'wrap' | 'wrap-reverse'>
  className?: string
}

export const ResponsiveFlex: React.FC<FlexProps> = ({
  children,
  direction = { mobile: 'column', tablet: 'row', default: 'row' },
  justify = { default: 'flex-start' },
  align = { default: 'flex-start' },
  gap = { mobile: '0.5rem', tablet: '1rem', default: '1rem' },
  wrap = { default: 'nowrap' },
  className
}) => {
  const { currentBreakpoint } = useResponsive()
  
  const currentDirection = getResponsiveValue(direction, currentBreakpoint)
  const currentJustify = getResponsiveValue(justify, currentBreakpoint)
  const currentAlign = getResponsiveValue(align, currentBreakpoint)
  const currentGap = getResponsiveValue(gap, currentBreakpoint)
  const currentWrap = getResponsiveValue(wrap, currentBreakpoint)

  const flexStyle = {
    display: 'flex',
    flexDirection: currentDirection,
    justifyContent: currentJustify,
    alignItems: currentAlign,
    gap: currentGap,
    flexWrap: currentWrap
  }

  return (
    <div 
      className={cn('responsive-flex', className)}
      style={flexStyle}
    >
      {children}
    </div>
  )
}