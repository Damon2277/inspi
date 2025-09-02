import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
    './src/hooks/**/*.{js,ts,jsx,tsx,mdx}',
    './src/lib/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      // 响应式断点配置
      screens: {
        'xs': '320px',   // 超小屏幕
        'sm': '640px',   // 小屏幕
        'md': '768px',   // 中等屏幕（平板）
        'lg': '1024px',  // 大屏幕（桌面）
        'xl': '1280px',  // 超大屏幕
        '2xl': '1536px', // 超宽屏幕
        
        // 自定义断点
        'mobile': { 'max': '767px' },
        'tablet': { 'min': '768px', 'max': '1023px' },
        'desktop': { 'min': '1024px', 'max': '1439px' },
        'wide': { 'min': '1440px' },
        
        // 高度断点
        'h-sm': { 'raw': '(max-height: 600px)' },
        'h-md': { 'raw': '(min-height: 601px) and (max-height: 900px)' },
        'h-lg': { 'raw': '(min-height: 901px)' },
      },
      
      // 移动端优化的字体大小
      fontSize: {
        'xs': ['0.75rem', { lineHeight: '1rem' }],
        'sm': ['0.875rem', { lineHeight: '1.25rem' }],
        'base': ['1rem', { lineHeight: '1.5rem' }],
        'lg': ['1.125rem', { lineHeight: '1.75rem' }],
        'xl': ['1.25rem', { lineHeight: '1.75rem' }],
        '2xl': ['1.5rem', { lineHeight: '2rem' }],
        '3xl': ['1.875rem', { lineHeight: '2.25rem' }],
        '4xl': ['2.25rem', { lineHeight: '2.5rem' }],
        '5xl': ['3rem', { lineHeight: '1' }],
        '6xl': ['3.75rem', { lineHeight: '1' }],
        
        // 移动端专用字体大小
        'mobile-xs': ['0.75rem', { lineHeight: '1rem' }],
        'mobile-sm': ['0.875rem', { lineHeight: '1.25rem' }],
        'mobile-base': ['1rem', { lineHeight: '1.5rem' }],
        'mobile-lg': ['1.125rem', { lineHeight: '1.75rem' }],
        'mobile-xl': ['1.25rem', { lineHeight: '1.75rem' }],
        'mobile-2xl': ['1.5rem', { lineHeight: '2rem' }],
      },
      
      // 触摸友好的间距
      spacing: {
        '0.5': '0.125rem',
        '1.5': '0.375rem',
        '2.5': '0.625rem',
        '3.5': '0.875rem',
        '4.5': '1.125rem',
        '5.5': '1.375rem',
        '6.5': '1.625rem',
        '7.5': '1.875rem',
        '8.5': '2.125rem',
        '9.5': '2.375rem',
        '11': '2.75rem',
        '13': '3.25rem',
        '15': '3.75rem',
        '17': '4.25rem',
        '18': '4.5rem',
        '19': '4.75rem',
        '21': '5.25rem',
        '22': '5.5rem',
        '23': '5.75rem',
        '25': '6.25rem',
        
        // 触摸目标最小尺寸
        'touch': '44px',
        'touch-sm': '40px',
        'touch-lg': '48px',
      },
      
      // 移动端优化的圆角
      borderRadius: {
        'xs': '0.125rem',
        'sm': '0.25rem',
        'md': '0.375rem',
        'lg': '0.5rem',
        'xl': '0.75rem',
        '2xl': '1rem',
        '3xl': '1.5rem',
        
        // 移动端友好的圆角
        'mobile': '8px',
        'mobile-lg': '12px',
        'mobile-xl': '16px',
      },
      
      // 移动端优化的阴影
      boxShadow: {
        'mobile': '0 2px 8px rgba(0, 0, 0, 0.1)',
        'mobile-lg': '0 4px 12px rgba(0, 0, 0, 0.15)',
        'mobile-xl': '0 8px 24px rgba(0, 0, 0, 0.2)',
        'touch': '0 2px 4px rgba(0, 0, 0, 0.1)',
        'touch-active': '0 1px 2px rgba(0, 0, 0, 0.1)',
      },
      
      // 动画和过渡
      transitionDuration: {
        '150': '150ms',
        '250': '250ms',
        '350': '350ms',
      },
      
      // Z-index 层级
      zIndex: {
        '1': '1',
        '2': '2',
        '3': '3',
        '4': '4',
        '5': '5',
        'modal': '100',
        'dropdown': '50',
        'header': '40',
        'overlay': '30',
      },
      
      // 颜色系统
      colors: {
        // 主色调
        primary: {
          50: '#eff6ff',
          100: '#dbeafe',
          200: '#bfdbfe',
          300: '#93c5fd',
          400: '#60a5fa',
          500: '#3b82f6',
          600: '#2563eb',
          700: '#1d4ed8',
          800: '#1e40af',
          900: '#1e3a8a',
        },
        
        // 灰色系统
        gray: {
          50: '#f9fafb',
          100: '#f3f4f6',
          200: '#e5e7eb',
          300: '#d1d5db',
          400: '#9ca3af',
          500: '#6b7280',
          600: '#4b5563',
          700: '#374151',
          800: '#1f2937',
          900: '#111827',
        },
        
        // 语义化颜色
        success: {
          50: '#f0fdf4',
          500: '#22c55e',
          600: '#16a34a',
        },
        warning: {
          50: '#fffbeb',
          500: '#f59e0b',
          600: '#d97706',
        },
        error: {
          50: '#fef2f2',
          500: '#ef4444',
          600: '#dc2626',
        },
      },
      
      // 移动端优化的最大宽度
      maxWidth: {
        'mobile': '100vw',
        'tablet': '768px',
        'desktop': '1024px',
        'wide': '1200px',
        'container': '1200px',
      },
      
      // 移动端优化的最小高度
      minHeight: {
        'screen-mobile': '100vh',
        'screen-safe': 'calc(100vh - env(safe-area-inset-top) - env(safe-area-inset-bottom))',
        'touch': '44px',
      },
    },
  },
  plugins: [
    // 自定义插件：移动端工具类
    function({ addUtilities, theme }) {
      const newUtilities = {
        // 触摸目标
        '.touch-target': {
          minHeight: theme('spacing.touch'),
          minWidth: theme('spacing.touch'),
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        },
        
        // 安全区域
        '.safe-area-top': {
          paddingTop: 'env(safe-area-inset-top)',
        },
        '.safe-area-bottom': {
          paddingBottom: 'env(safe-area-inset-bottom)',
        },
        '.safe-area-left': {
          paddingLeft: 'env(safe-area-inset-left)',
        },
        '.safe-area-right': {
          paddingRight: 'env(safe-area-inset-right)',
        },
        '.safe-area-inset': {
          paddingTop: 'env(safe-area-inset-top)',
          paddingBottom: 'env(safe-area-inset-bottom)',
          paddingLeft: 'env(safe-area-inset-left)',
          paddingRight: 'env(safe-area-inset-right)',
        },
        
        // 移动端滚动优化
        '.scroll-smooth': {
          scrollBehavior: 'smooth',
          '-webkit-overflow-scrolling': 'touch',
        },
        
        // 隐藏滚动条
        '.hide-scrollbar': {
          '-ms-overflow-style': 'none',
          'scrollbar-width': 'none',
          '&::-webkit-scrollbar': {
            display: 'none',
          },
        },
        
        // 移动端输入框优化
        '.mobile-input': {
          fontSize: '16px', // 防止iOS缩放
          lineHeight: '1.5',
          padding: '12px 16px',
          borderRadius: theme('borderRadius.mobile'),
          border: `2px solid ${theme('colors.gray.200')}`,
          transition: 'border-color 0.2s ease',
          '&:focus': {
            outline: 'none',
            borderColor: theme('colors.primary.500'),
            boxShadow: `0 0 0 3px ${theme('colors.primary.100')}`,
          },
        },
        
        // 移动端按钮
        '.mobile-button': {
          minHeight: theme('spacing.touch'),
          padding: '0 16px',
          borderRadius: theme('borderRadius.mobile'),
          fontSize: theme('fontSize.base[0]'),
          fontWeight: '500',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          transition: 'all 0.2s ease',
          userSelect: 'none',
          '-webkit-user-select': 'none',
          '&:active': {
            transform: 'scale(0.98)',
          },
        },
        
        // 移动端卡片
        '.mobile-card': {
          backgroundColor: theme('colors.white'),
          borderRadius: theme('borderRadius.mobile-lg'),
          padding: '16px',
          boxShadow: theme('boxShadow.mobile'),
          border: `1px solid ${theme('colors.gray.100')}`,
          transition: 'transform 0.2s ease, box-shadow 0.2s ease',
          '&:active': {
            transform: 'scale(0.98)',
            boxShadow: theme('boxShadow.touch-active'),
          },
        },
      }
      
      addUtilities(newUtilities)
    },
  ],
}

export default config