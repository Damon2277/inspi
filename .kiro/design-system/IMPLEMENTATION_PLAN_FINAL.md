# Inspi.AI 设计系统应用实施方案 (最终版)

> 结合详细实施指导和测试最佳实践的综合方案

## 📋 方案概览

本方案结合了详细的实施指导和全面的测试策略，确保设计系统能够安全、高效地应用到 inspi-ai-platform 项目中。

**核心特点**:
- 🎯 **具体可执行** - 详细的代码示例和文件结构
- 🧪 **测试驱动** - 每个阶段都有对应的测试验证
- 🔄 **渐进式实施** - 降低风险，确保可回滚
- 📊 **质量保障** - 全面的监控和度量体系

---

## 🗓️ 实施时间线

### 阶段0：预实施准备 (20分钟)
- [ ] 0.1 当前状态基准测试和备份
- [ ] 0.2 开发环境和工具准备
- [ ] 0.3 测试环境配置
- [ ] 0.4 回滚策略确认

### 阶段1：基础设施准备 (40分钟)
- [ ] 1.1 设计系统文件集成
- [ ] 1.2 全局样式配置
- [ ] 1.3 字体资源配置
- [ ] 1.4 CSS变量系统建立
- [ ] 1.5 基础设施测试验证

### 阶段2：核心页面重构 (90分钟)
- [ ] 2.1 主页 (page.tsx) 重构
- [ ] 2.2 创建页面 (create/page.tsx) 重构
- [ ] 2.3 布局组件 (layout.tsx) 优化
- [ ] 2.4 全局样式 (globals.css) 更新
- [ ] 2.5 页面级测试验证

### 阶段3：组件系统建立 (60分钟)
- [ ] 3.1 创建可复用组件
- [ ] 3.2 建立组件库结构
- [ ] 3.3 组件文档和示例
- [ ] 3.4 组件测试验证

### 阶段4：全面测试和优化 (45分钟)
- [ ] 4.1 跨浏览器兼容性测试
- [ ] 4.2 响应式设计测试
- [ ] 4.3 性能优化和测试
- [ ] 4.4 可访问性审计
- [ ] 4.5 用户体验验证

### 阶段5：监控和文档 (25分钟)
- [ ] 5.1 监控系统建立
- [ ] 5.2 项目文档更新
- [ ] 5.3 维护指南创建
- [ ] 5.4 团队培训材料

**总预计时间**: 4.5小时

---

## 📁 文件结构规划

```
inspi-ai-platform/
├── src/
│   ├── styles/
│   │   ├── design-system.css          # 设计系统核心样式
│   │   ├── globals.css                # 全局样式入口
│   │   ├── components.css             # 组件特定样式
│   │   └── utilities.css              # 工具类样式
│   ├── components/
│   │   ├── ui/                        # UI组件库
│   │   │   ├── index.ts               # 统一导出
│   │   │   ├── GlassCard.tsx          # 玻璃拟态卡片
│   │   │   ├── Button.tsx             # 按钮组件
│   │   │   ├── IconContainer.tsx      # 图标容器
│   │   │   ├── DecorativeDivider.tsx  # 装饰性分割线
│   │   │   ├── Typography.tsx         # 字体组件
│   │   │   └── BackgroundDecorator.tsx # 背景装饰
│   │   ├── layout/                    # 布局组件
│   │   │   ├── Header.tsx             # 头部组件
│   │   │   ├── Footer.tsx             # 底部组件
│   │   │   └── PageLayout.tsx         # 页面布局
│   │   └── sections/                  # 页面区块组件
│   │       ├── HeroSection.tsx        # 英雄区块
│   │       ├── FeatureGrid.tsx        # 功能网格
│   │       └── CTASection.tsx         # 行动召唤区块
│   ├── hooks/                         # 自定义Hooks
│   │   ├── usePerformanceMonitor.ts   # 性能监控
│   │   └── useDesignSystem.ts         # 设计系统状态
│   ├── utils/                         # 工具函数
│   │   ├── designSystem.ts            # 设计系统工具
│   │   └── performance.ts             # 性能工具
│   └── app/
│       ├── layout.tsx                 # 根布局 (更新)
│       ├── page.tsx                   # 主页 (重构)
│       ├── create/
│       │   └── page.tsx               # 创建页面 (重构)
│       └── globals.css                # 全局样式入口
├── __tests__/                         # 测试文件
│   ├── components/                    # 组件测试
│   ├── pages/                         # 页面测试
│   ├── visual/                        # 视觉回归测试
│   └── performance/                   # 性能测试
└── docs/                              # 项目文档
    ├── design-system/                 # 设计系统文档
    └── implementation/                # 实施文档
```

---

## 🚀 详细实施步骤

### 阶段0：预实施准备

#### 0.1 当前状态基准测试

```bash
# 创建基准测试脚本
mkdir -p scripts/testing
```

**基准测试脚本** (`scripts/testing/baseline-test.js`):
```javascript
const { chromium } = require('playwright');
const fs = require('fs');

async function runBaselineTests() {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  
  // 性能基准测试
  await page.goto('http://localhost:3000');
  const performanceMetrics = await page.evaluate(() => {
    return JSON.parse(JSON.stringify(performance.getEntriesByType('navigation')[0]));
  });
  
  // 视觉基准截图
  await page.screenshot({ path: 'baseline-homepage.png', fullPage: true });
  await page.goto('http://localhost:3000/create');
  await page.screenshot({ path: 'baseline-create.png', fullPage: true });
  
  // 保存基准数据
  fs.writeFileSync('baseline-metrics.json', JSON.stringify({
    timestamp: new Date().toISOString(),
    performance: performanceMetrics,
    pages: ['/', '/create']
  }, null, 2));
  
  await browser.close();
  console.log('✅ 基准测试完成');
}

runBaselineTests().catch(console.error);
```

#### 0.2 备份和回滚点创建

```bash
# 创建当前状态的Git标签
git tag -a "pre-design-system" -m "实施设计系统前的稳定状态"

# 创建备份分支
git checkout -b backup/pre-design-system
git checkout main
```

#### 0.3 开发环境准备

**安装必要的依赖**:
```bash
cd inspi-ai-platform
npm install --save-dev @testing-library/react @testing-library/jest-dom
npm install --save-dev playwright @playwright/test
npm install --save-dev jest-environment-jsdom
```

**测试配置** (`jest.config.js`):
```javascript
module.exports = {
  testEnvironment: 'jsdom',
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  moduleNameMapping: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  collectCoverageFrom: [
    'src/components/**/*.{js,jsx,ts,tsx}',
    'src/hooks/**/*.{js,jsx,ts,tsx}',
    '!src/**/*.d.ts',
  ],
};
```

### 阶段1：基础设施准备

#### 1.1 设计系统文件集成

```bash
# 复制设计系统文件
cp .kiro/design-system/design-system.css inspi-ai-platform/src/styles/
```

#### 1.2 全局样式配置

**更新** `inspi-ai-platform/src/app/globals.css`:
```css
/* 导入设计系统 */
@import '../styles/design-system.css';

/* Next.js 特定样式 */
html,
body {
  padding: 0;
  margin: 0;
  font-family: var(--font-family);
}

a {
  color: inherit;
  text-decoration: none;
}

* {
  box-sizing: border-box;
}

/* 确保全屏背景效果 */
#__next {
  min-height: 100vh;
}

/* 移动端优化 */
@media (max-width: 768px) {
  html {
    font-size: 14px;
  }
}
```

#### 1.3 字体资源配置

**更新** `inspi-ai-platform/src/app/layout.tsx`:
```tsx
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ 
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Inspi.AI - AI驱动的教师智慧平台",
  description: "用AI激发教学创意，让每一次教学都充满魔法。智能生成教学卡片，构建个人知识图谱，与教师社区共同成长。",
  icons: {
    icon: '/api/favicon',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh-CN" className={inter.variable}>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </head>
      <body className="dot-grid-background circuit-lines" suppressHydrationWarning={true}>
        {children}
      </body>
    </html>
  );
}
```

#### 1.4 CSS变量系统建立

**创建** `inspi-ai-platform/src/styles/utilities.css`:
```css
/* 工具类 */
.container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 1rem;
}

.section-padding {
  padding: var(--space-3xl) 0;
}

.grid-auto-fit {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: var(--space-lg);
}

/* 动画工具类 */
.fade-in-up {
  animation: fadeInUp 0.6s ease-out;
}

.stagger-1 { animation-delay: 0.1s; }
.stagger-2 { animation-delay: 0.2s; }
.stagger-3 { animation-delay: 0.3s; }
.stagger-4 { animation-delay: 0.4s; }

/* 响应式工具类 */
.mobile-hidden {
  display: block;
}

.desktop-hidden {
  display: none;
}

@media (max-width: 768px) {
  .mobile-hidden {
    display: none;
  }
  
  .desktop-hidden {
    display: block;
  }
}
```

#### 1.5 基础设施测试

**创建测试** (`__tests__/infrastructure/design-system.test.js`):
```javascript
import { render } from '@testing-library/react';

describe('Design System Infrastructure', () => {
  test('CSS variables are loaded', () => {
    const div = document.createElement('div');
    document.body.appendChild(div);
    
    const styles = getComputedStyle(document.documentElement);
    expect(styles.getPropertyValue('--bg-primary')).toBe('#F9FAFC');
    expect(styles.getPropertyValue('--text-primary')).toBe('#111827');
    expect(styles.getPropertyValue('--brand-orange')).toBe('#FF8C00');
  });

  test('Font family is applied', () => {
    const styles = getComputedStyle(document.body);
    expect(styles.fontFamily).toContain('Inter');
  });
});
```

### 阶段2：核心页面重构

#### 2.1 主页重构

**创建组件** `src/components/ui/GlassCard.tsx`:
```tsx
import React from 'react';

interface GlassCardProps {
  children: React.ReactNode;
  className?: string;
  hover?: boolean;
}

export const GlassCard: React.FC<GlassCardProps> = ({ 
  children, 
  className = '', 
  hover = true 
}) => {
  return (
    <div className={`glassmorphism-card ${hover ? 'hover:transform hover:-translate-y-1' : ''} ${className}`}>
      <div className="card-content">
        {children}
      </div>
    </div>
  );
};
```

**创建组件** `src/components/ui/Button.tsx`:
```tsx
import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary';
  size?: 'small' | 'default' | 'large';
  children: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({
  variant = 'primary',
  size = 'default',
  children,
  className = '',
  ...props
}) => {
  const baseClass = variant === 'primary' ? 'btn-primary' : 'btn-secondary';
  const sizeClass = size === 'large' ? 'btn-large' : size === 'small' ? 'btn-small' : '';
  
  return (
    <button 
      className={`${baseClass} ${sizeClass} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
};
```

**创建组件** `src/components/ui/IconContainer.tsx`:
```tsx
import React from 'react';

interface IconContainerProps {
  children: React.ReactNode;
  size?: 'small' | 'default' | 'large';
  className?: string;
}

export const IconContainer: React.FC<IconContainerProps> = ({
  children,
  size = 'default',
  className = ''
}) => {
  const sizeClass = size === 'small' ? 'icon-container-small' : 
                   size === 'large' ? 'icon-container-large' : '';
  
  return (
    <div className={`icon-container ${sizeClass} ${className}`}>
      {children}
    </div>
  );
};
```

**创建统一导出** `src/components/ui/index.ts`:
```typescript
export { GlassCard } from './GlassCard';
export { Button } from './Button';
export { IconContainer } from './IconContainer';
```

**重构主页** `inspi-ai-platform/src/app/page.tsx`:
```tsx
'use client';

import React from 'react';
import Link from 'next/link';
import { GlassCard, Button, IconContainer } from '@/components/ui';

export default function Home() {
  const handleCreateClick = () => {
    window.location.href = '/create';
  };

  const featureCards = [
    {
      icon: (
        <svg className="icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
        </svg>
      ),
      title: 'AI教学魔法师',
      description: '智能生成四种类型的教学创意卡片，激发无限教学灵感'
    },
    {
      icon: (
        <svg className="icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
        </svg>
      ),
      title: '智慧广场',
      description: '教师社区平台，分享和复用优秀教学资源'
    },
    {
      icon: (
        <svg className="icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
        </svg>
      ),
      title: '知识图谱',
      description: '可视化展示个人教学体系和专业发展路径'
    },
    {
      icon: (
        <svg className="icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
        </svg>
      ),
      title: '贡献度系统',
      description: '激励教师创作和分享优质教学内容'
    }
  ];

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="container section-padding text-center">
        <div className="fade-in-up">
          <h1 className="heading-1 gradient-text mb-6">
            AI驱动的教师智慧平台
          </h1>
          <h2 className="heading-2 mb-4">
            点燃您教学的热情
          </h2>
        </div>
        
        <div className="fade-in-up stagger-1">
          <p className="body-text mb-10 max-w-4xl mx-auto">
            用AI激发教学创意，让每一次教学都充满魔法。智能生成教学卡片，构建个人知识图谱，与教师社区共同成长。
          </p>
        </div>

        <div className="fade-in-up stagger-2 flex flex-col sm:flex-row gap-4 justify-center items-center mb-16">
          <Button 
            variant="primary" 
            size="large"
            onClick={handleCreateClick}
            aria-label="开始创作教学魔法 - 使用AI生成教学创意卡片"
          >
            ✨ 开始创作教学魔法
          </Button>
          <Button 
            variant="secondary" 
            size="large"
            onClick={() => window.location.href = '/square'}
            aria-label="浏览智慧广场 - 发现优秀教学创意"
          >
            🌟 浏览智慧广场
          </Button>
        </div>
      </section>

      {/* Feature Cards */}
      <section className="container section-padding">
        <div className="grid-auto-fit">
          {featureCards.map((card, index) => (
            <GlassCard key={index} className={`fade-in-up stagger-${index + 1} text-center`}>
              <IconContainer className="mx-auto mb-4">
                {card.icon}
              </IconContainer>
              <h3 className="heading-3 mb-2">{card.title}</h3>
              <p className="body-text">{card.description}</p>
            </GlassCard>
          ))}
        </div>
      </section>

      {/* CTA Section */}
      <section className="section-padding">
        <GlassCard className="container max-w-4xl mx-auto text-center">
          <h2 className="heading-2 mb-4">
            您的每一次奇思妙想，都值得被精彩呈现
          </h2>
          <p className="body-text mb-8">
            立即开始，让AI成为您教学创意的放大器
          </p>
          <Button 
            variant="primary" 
            size="large"
            onClick={handleCreateClick}
          >
            🚀 免费开始使用
          </Button>
        </GlassCard>
      </section>
    </div>
  );
}
```

#### 2.2 创建页面重构

**重构创建页面** `inspi-ai-platform/src/app/create/page.tsx`:
```tsx
import React from 'react';
import { GlassCard, Button, IconContainer } from '@/components/ui';

export default function CreatePage() {
  return (
    <div className="min-h-screen">
      <section className="container section-padding">
        <div className="max-w-4xl mx-auto text-center">
          <div className="fade-in-up">
            <h1 className="heading-1 gradient-text mb-4">
              AI教学魔法师
            </h1>
            <p className="body-text mb-8">
              智能生成教学创意卡片，激发无限教学灵感
            </p>
          </div>

          <GlassCard className="fade-in-up stagger-1 max-w-2xl mx-auto">
            <div className="text-center py-12">
              <IconContainer size="large" className="mx-auto mb-6">
                <svg className="icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </IconContainer>
              
              <h2 className="heading-2 mb-4">
                功能开发中
              </h2>
              
              <p className="body-text mb-8">
                AI教学魔法师功能正在精心开发中，即将为您带来前所未有的教学创意体验！
              </p>
              
              <div className="decorative-divider mb-8"></div>
              
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Button 
                  variant="primary"
                  onClick={() => window.location.href = '/'}
                >
                  返回首页
                </Button>
                <Button 
                  variant="secondary"
                  onClick={() => window.location.href = '/square'}
                >
                  浏览广场
                </Button>
              </div>
            </div>
          </GlassCard>
        </div>
      </section>
    </div>
  );
}
```

#### 2.5 页面级测试验证

**创建页面测试** (`__tests__/pages/home.test.tsx`):
```tsx
import { render, screen, fireEvent } from '@testing-library/react';
import Home from '@/app/page';

// Mock window.location
delete (window as any).location;
window.location = { href: '' } as any;

describe('Home Page', () => {
  test('renders hero section', () => {
    render(<Home />);
    expect(screen.getByText('AI驱动的教师智慧平台')).toBeInTheDocument();
    expect(screen.getByText('点燃您教学的热情')).toBeInTheDocument();
  });

  test('renders feature cards', () => {
    render(<Home />);
    expect(screen.getByText('AI教学魔法师')).toBeInTheDocument();
    expect(screen.getByText('智慧广场')).toBeInTheDocument();
    expect(screen.getByText('知识图谱')).toBeInTheDocument();
    expect(screen.getByText('贡献度系统')).toBeInTheDocument();
  });

  test('handles create button click', () => {
    render(<Home />);
    const createButton = screen.getByText('✨ 开始创作教学魔法');
    fireEvent.click(createButton);
    expect(window.location.href).toBe('/create');
  });
});
```

### 阶段3：组件系统建立

#### 3.1 创建装饰性分割线组件

**创建组件** `src/components/ui/DecorativeDivider.tsx`:
```tsx
import React from 'react';

interface DecorativeDividerProps {
  className?: string;
}

export const DecorativeDivider: React.FC<DecorativeDividerProps> = ({ 
  className = '' 
}) => {
  return <div className={`decorative-divider ${className}`} />;
};
```

#### 3.2 创建字体组件

**创建组件** `src/components/ui/Typography.tsx`:
```tsx
import React from 'react';

interface TypographyProps {
  variant: 'h1' | 'h2' | 'h3' | 'body' | 'subtitle';
  children: React.ReactNode;
  className?: string;
  gradient?: boolean;
}

export const Typography: React.FC<TypographyProps> = ({
  variant,
  children,
  className = '',
  gradient = false
}) => {
  const baseClass = {
    h1: 'heading-1',
    h2: 'heading-2', 
    h3: 'heading-3',
    body: 'body-text',
    subtitle: 'subtitle'
  }[variant];

  const gradientClass = gradient ? 'gradient-text' : '';
  const Tag = variant === 'body' || variant === 'subtitle' ? 'p' : variant;

  return (
    <Tag className={`${baseClass} ${gradientClass} ${className}`}>
      {children}
    </Tag>
  );
};
```

#### 3.3 更新统一导出

**更新** `src/components/ui/index.ts`:
```typescript
export { GlassCard } from './GlassCard';
export { Button } from './Button';
export { IconContainer } from './IconContainer';
export { DecorativeDivider } from './DecorativeDivider';
export { Typography } from './Typography';
```

#### 3.4 组件测试验证

**创建组件测试** (`__tests__/components/ui/GlassCard.test.tsx`):
```tsx
import { render, screen } from '@testing-library/react';
import { GlassCard } from '@/components/ui/GlassCard';

describe('GlassCard', () => {
  test('renders children correctly', () => {
    render(
      <GlassCard>
        <h3>Test Title</h3>
        <p>Test content</p>
      </GlassCard>
    );
    
    expect(screen.getByText('Test Title')).toBeInTheDocument();
    expect(screen.getByText('Test content')).toBeInTheDocument();
  });

  test('applies correct CSS classes', () => {
    const { container } = render(
      <GlassCard className="custom-class">
        <p>Content</p>
      </GlassCard>
    );
    
    const card = container.firstChild;
    expect(card).toHaveClass('glassmorphism-card');
    expect(card).toHaveClass('custom-class');
  });
});
```

### 阶段4：全面测试和优化

#### 4.1 跨浏览器兼容性测试

**创建Playwright测试** (`__tests__/e2e/cross-browser.spec.ts`):
```typescript
import { test, expect } from '@playwright/test';

['chromium', 'firefox', 'webkit'].forEach(browserName => {
  test.describe(`${browserName} compatibility`, () => {
    test('homepage loads correctly', async ({ page }) => {
      await page.goto('/');
      
      // 检查关键元素
      await expect(page.locator('h1')).toContainText('AI驱动的教师智慧平台');
      
      // 检查样式是否正确应用
      const heroSection = page.locator('section').first();
      await expect(heroSection).toBeVisible();
      
      // 检查按钮是否可点击
      const createButton = page.locator('text=开始创作教学魔法');
      await expect(createButton).toBeVisible();
      await createButton.click();
      
      await expect(page).toHaveURL('/create');
    });

    test('glassmorphism effects work', async ({ page }) => {
      await page.goto('/');
      
      // 检查玻璃拟态卡片
      const cards = page.locator('.glassmorphism-card');
      await expect(cards.first()).toBeVisible();
      
      // 检查backdrop-filter支持
      const cardStyle = await cards.first().evaluate(el => 
        getComputedStyle(el).backdropFilter
      );
      
      // 如果不支持backdrop-filter，应该有降级方案
      if (cardStyle === 'none') {
        const backgroundColor = await cards.first().evaluate(el => 
          getComputedStyle(el).backgroundColor
        );
        expect(backgroundColor).not.toBe('rgba(0, 0, 0, 0)');
      }
    });
  });
});
```

#### 4.2 响应式设计测试

**创建响应式测试** (`__tests__/e2e/responsive.spec.ts`):
```typescript
import { test, expect } from '@playwright/test';

const viewports = [
  { name: 'mobile', width: 375, height: 667 },
  { name: 'tablet', width: 768, height: 1024 },
  { name: 'desktop', width: 1920, height: 1080 }
];

viewports.forEach(viewport => {
  test.describe(`${viewport.name} responsive design`, () => {
    test.beforeEach(async ({ page }) => {
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
    });

    test('homepage layout adapts correctly', async ({ page }) => {
      await page.goto('/');
      
      // 检查标题是否可见
      const title = page.locator('h1');
      await expect(title).toBeVisible();
      
      // 检查按钮布局
      const buttons = page.locator('button');
      await expect(buttons.first()).toBeVisible();
      
      // 检查功能卡片网格
      const cards = page.locator('.glassmorphism-card');
      await expect(cards.first()).toBeVisible();
      
      // 移动端特定检查
      if (viewport.name === 'mobile') {
        // 检查按钮是否堆叠
        const buttonContainer = page.locator('button').first().locator('..');
        const flexDirection = await buttonContainer.evaluate(el => 
          getComputedStyle(el).flexDirection
        );
        expect(flexDirection).toBe('column');
      }
    });
  });
});
```

#### 4.3 性能测试

**创建性能测试** (`__tests__/performance/performance.spec.ts`):
```typescript
import { test, expect } from '@playwright/test';

test.describe('Performance Tests', () => {
  test('homepage performance metrics', async ({ page }) => {
    // 开始性能追踪
    await page.goto('/', { waitUntil: 'networkidle' });
    
    // 获取性能指标
    const performanceMetrics = await page.evaluate(() => {
      return JSON.parse(JSON.stringify(performance.getEntriesByType('navigation')[0]));
    });
    
    // 检查关键性能指标
    const loadTime = performanceMetrics.loadEventEnd - performanceMetrics.navigationStart;
    expect(loadTime).toBeLessThan(3000); // 3秒内加载完成
    
    // 检查First Contentful Paint
    const paintMetrics = await page.evaluate(() => {
      return performance.getEntriesByType('paint');
    });
    
    const fcp = paintMetrics.find(metric => metric.name === 'first-contentful-paint');
    if (fcp) {
      expect(fcp.startTime).toBeLessThan(1500); // FCP < 1.5s
    }
  });

  test('CSS and JS bundle sizes', async ({ page }) => {
    const response = await page.goto('/');
    
    // 检查响应大小
    const responseSize = (await response?.body())?.length || 0;
    expect(responseSize).toBeLessThan(500000); // HTML < 500KB
    
    // 检查资源加载
    const resources = await page.evaluate(() => {
      return performance.getEntriesByType('resource').map(resource => ({
        name: resource.name,
        size: resource.transferSize,
        type: resource.initiatorType
      }));
    });
    
    // 检查CSS文件大小
    const cssResources = resources.filter(r => r.name.includes('.css'));
    const totalCSSSize = cssResources.reduce((sum, r) => sum + (r.size || 0), 0);
    expect(totalCSSSize).toBeLessThan(100000); // CSS < 100KB
  });
});
```

#### 4.4 可访问性审计

**创建可访问性测试** (`__tests__/a11y/accessibility.spec.ts`):
```typescript
import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test.describe('Accessibility Tests', () => {
  test('homepage accessibility', async ({ page }) => {
    await page.goto('/');
    
    const accessibilityScanResults = await new AxeBuilder({ page }).analyze();
    
    expect(accessibilityScanResults.violations).toEqual([]);
  });

  test('keyboard navigation', async ({ page }) => {
    await page.goto('/');
    
    // 测试Tab键导航
    await page.keyboard.press('Tab');
    let focusedElement = await page.locator(':focus').first();
    await expect(focusedElement).toBeVisible();
    
    // 继续Tab导航到按钮
    await page.keyboard.press('Tab');
    focusedElement = await page.locator(':focus').first();
    await expect(focusedElement).toBeVisible();
    
    // 测试Enter键激活
    await page.keyboard.press('Enter');
    await expect(page).toHaveURL('/create');
  });

  test('color contrast', async ({ page }) => {
    await page.goto('/');
    
    // 检查主要文本的对比度
    const textElements = await page.locator('.heading-1, .body-text, .subtitle').all();
    
    for (const element of textElements) {
      const contrast = await element.evaluate(el => {
        const styles = getComputedStyle(el);
        const color = styles.color;
        const backgroundColor = styles.backgroundColor;
        
        // 简化的对比度检查（实际应用中需要更复杂的算法）
        return { color, backgroundColor };
      });
      
      // 确保有颜色值
      expect(contrast.color).not.toBe('');
    }
  });
});
```

### 阶段5：监控和文档

#### 5.1 性能监控系统

**创建性能监控Hook** (`src/hooks/usePerformanceMonitor.ts`):
```typescript
import { useEffect } from 'react';

interface PerformanceMetrics {
  FCP?: number;
  LCP?: number;
  FID?: number;
  CLS?: number;
}

export const usePerformanceMonitor = () => {
  useEffect(() => {
    // 监控Core Web Vitals
    const observer = new PerformanceObserver((list) => {
      const metrics: PerformanceMetrics = {};
      
      for (const entry of list.getEntries()) {
        switch (entry.entryType) {
          case 'paint':
            if (entry.name === 'first-contentful-paint') {
              metrics.FCP = entry.startTime;
            }
            break;
          case 'largest-contentful-paint':
            metrics.LCP = entry.startTime;
            break;
          case 'first-input':
            metrics.FID = entry.processingStart - entry.startTime;
            break;
          case 'layout-shift':
            if (!(entry as any).hadRecentInput) {
              metrics.CLS = (metrics.CLS || 0) + (entry as any).value;
            }
            break;
        }
      }
      
      // 发送指标到监控服务
      if (Object.keys(metrics).length > 0) {
        console.log('Performance Metrics:', metrics);
        // 这里可以发送到实际的监控服务
        // sendToAnalytics(metrics);
      }
    });
    
    observer.observe({ entryTypes: ['paint', 'largest-contentful-paint', 'first-input', 'layout-shift'] });
    
    return () => observer.disconnect();
  }, []);
};
```

#### 5.2 错误边界组件

**创建错误边界** (`src/components/ErrorBoundary.tsx`):
```tsx
import React, { Component, ErrorInfo, ReactNode } from 'react';
import { GlassCard, Button } from '@/components/ui';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Design System Error:', error, errorInfo);
    
    // 发送错误到监控服务
    // sendErrorToService(error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="container section-padding">
          <GlassCard className="max-w-2xl mx-auto text-center">
            <h2 className="heading-2 mb-4">出现了一些问题</h2>
            <p className="body-text mb-6">
              页面遇到了技术问题，我们正在努力修复。请尝试刷新页面或返回首页。
            </p>
            <div className="flex gap-4 justify-center">
              <Button 
                variant="primary"
                onClick={() => window.location.reload()}
              >
                刷新页面
              </Button>
              <Button 
                variant="secondary"
                onClick={() => window.location.href = '/'}
              >
                返回首页
              </Button>
            </div>
          </GlassCard>
        </div>
      );
    }

    return this.props.children;
  }
}
```

#### 5.3 更新项目文档

**创建README更新** (`inspi-ai-platform/README.md`):
```markdown
# Inspi.AI - AI驱动的教师智慧平台

## 设计系统

本项目使用"轻盈的未来科技感"设计系统，基于以下核心理念：

### 核心特性
- **Glassmorphism**: 玻璃拟态效果，营造现代科技感
- **Gradient Accents**: 品牌渐变点缀 (#FF8C00 → #E025B0)
- **Clean & Minimalist**: 干净极简的设计语言
- **Responsive**: 全设备响应式支持
- **Accessible**: 符合WCAG 2.1 AA标准

### 快速开始

```bash
# 安装依赖
npm install

# 启动开发服务器
npm run dev

# 运行测试
npm test

# 运行E2E测试
npm run test:e2e

# 性能测试
npm run test:performance
```

### 组件使用

```tsx
import { GlassCard, Button, IconContainer } from '@/components/ui';

<GlassCard>
  <IconContainer>
    <YourIcon />
  </IconContainer>
  <h3 className="heading-3">标题</h3>
  <p className="body-text">内容</p>
  <Button variant="primary">操作</Button>
</GlassCard>
```

### 性能指标

- **首次内容绘制 (FCP)**: < 1.5s
- **最大内容绘制 (LCP)**: < 2.5s
- **首次输入延迟 (FID)**: < 100ms
- **累积布局偏移 (CLS)**: < 0.1

### 浏览器支持

- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

## 开发指南

### 文件结构
```
src/
├── components/ui/     # UI组件库
├── styles/           # 样式文件
├── hooks/            # 自定义Hooks
└── utils/            # 工具函数
```

### 代码规范
- 使用TypeScript
- 遵循ESLint规则
- 组件必须有对应测试
- 新功能需要性能测试

### 测试策略
- 单元测试: Jest + Testing Library
- E2E测试: Playwright
- 视觉回归测试: Percy/Chromatic
- 性能测试: Lighthouse CI

## 部署

```bash
# 构建生产版本
npm run build

# 启动生产服务器
npm start
```

## 贡献指南

1. Fork 项目
2. 创建功能分支
3. 提交更改
4. 推送到分支
5. 创建Pull Request

## 许可证

MIT License
```

---

## 📊 实施检查清单

### 阶段0检查清单
- [ ] 基准测试完成
- [ ] 备份创建完成
- [ ] 开发环境准备就绪
- [ ] 测试工具配置完成

### 阶段1检查清单
- [ ] 设计系统CSS文件集成
- [ ] 全局样式配置正确
- [ ] 字体加载正常
- [ ] CSS变量系统工作
- [ ] 基础设施测试通过

### 阶段2检查清单
- [ ] 主页重构完成
- [ ] 创建页面重构完成
- [ ] 布局组件优化完成
- [ ] 页面测试通过
- [ ] 视觉效果符合设计规范

### 阶段3检查清单
- [ ] UI组件库创建完成
- [ ] 组件测试通过
- [ ] 组件文档完整
- [ ] 统一导出配置正确

### 阶段4检查清单
- [ ] 跨浏览器测试通过
- [ ] 响应式测试通过
- [ ] 性能测试达标
- [ ] 可访问性审计通过

### 阶段5检查清单
- [ ] 监控系统建立
- [ ] 错误边界配置
- [ ] 项目文档更新
- [ ] 团队培训完成

---

## 🎯 成功标准

### 技术标准
- [ ] 所有测试通过 (单元测试 > 80%, E2E测试 > 60%)
- [ ] 性能指标达标 (LCP < 2.5s, FID < 100ms, CLS < 0.1)
- [ ] 浏览器兼容性良好 (Chrome, Firefox, Safari, Edge)
- [ ] 可访问性评分 > 90 (WCAG 2.1 AA)

### 视觉标准
- [ ] 设计系统一致性 100%
- [ ] Glassmorphism效果正确显示
- [ ] 品牌渐变应用恰当
- [ ] 响应式设计完美适配

### 用户体验标准
- [ ] 页面加载流畅
- [ ] 交互反馈及时
- [ ] 导航直观易用
- [ ] 错误处理优雅

---

## 🚨 应急预案

### 性能问题
```javascript
// 性能降级策略
if (performanceMetrics.LCP > 2500) {
  // 禁用非关键动画
  document.body.classList.add('reduce-motion');
  // 简化视觉效果
  document.body.classList.add('performance-mode');
}
```

### 兼容性问题
```css
/* 特性检测降级 */
@supports not (backdrop-filter: blur(10px)) {
  .glassmorphism-card {
    background: rgba(255, 255, 255, 0.95);
    border: 1px solid rgba(0, 0, 0, 0.1);
  }
}
```

### 快速回滚
```bash
# 回滚到实施前状态
git reset --hard pre-design-system
git push --force-with-lease origin main
```

---

**这个综合方案结合了详细的实施指导和全面的测试策略，确保设计系统能够安全、高效地应用到你的项目中。准备开始实施吗？**