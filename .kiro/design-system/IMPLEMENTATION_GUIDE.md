# Inspi.AI 设计系统实施指南

> 如何在项目中正确使用轻盈的未来科技感设计系统

## 🚀 快速开始

### 1. 引入设计系统

```html
<!-- 在HTML头部引入字体和样式 -->
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
<link rel="stylesheet" href=".kiro/design-system/design-system.css">
```

### 2. 基础页面结构

```html
<body class="dot-grid-background circuit-lines">
  <div class="container">
    <!-- 你的内容 -->
  </div>
</body>
```

## 📋 组件使用指南

### Glassmorphism 卡片

```html
<!-- 基础卡片 -->
<div class="glassmorphism-card">
  <div class="card-content">
    <h3 class="heading-3">卡片标题</h3>
    <p class="body-text">卡片内容</p>
  </div>
</div>

<!-- 带图标的卡片 -->
<div class="glassmorphism-card">
  <div class="card-content">
    <div class="icon-container" style="margin-bottom: 1rem;">
      <!-- SVG 图标 -->
    </div>
    <h3 class="heading-3">功能标题</h3>
    <p class="body-text">功能描述</p>
  </div>
</div>
```

### 按钮组件

```html
<!-- 主要按钮 -->
<button class="btn-primary">主要操作</button>
<a href="#" class="btn-primary">链接按钮</a>

<!-- 次要按钮 -->
<button class="btn-secondary">次要操作</button>

<!-- 不同尺寸 -->
<button class="btn-primary btn-large">大按钮</button>
<button class="btn-primary btn-small">小按钮</button>
```

### 图标容器

```html
<!-- 标准图标 -->
<div class="icon-container">
  <svg class="icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <!-- SVG 路径 -->
  </svg>
</div>

<!-- 不同尺寸 -->
<div class="icon-container icon-container-small">
  <svg class="icon"><!-- SVG --></svg>
</div>

<div class="icon-container icon-container-large">
  <svg class="icon"><!-- SVG --></svg>
</div>
```

### 字体层级

```html
<h1 class="heading-1">主标题</h1>
<h2 class="heading-2">章节标题</h2>
<h3 class="heading-3">子标题</h3>
<p class="body-text">正文内容</p>
<p class="subtitle">副标题或描述</p>

<!-- 渐变文字 -->
<h1 class="heading-1 gradient-text">渐变标题</h1>
```

### 分割线

```html
<div class="decorative-divider"></div>
```

## 🎨 自定义CSS变量

你可以通过修改CSS变量来自定义设计系统：

```css
:root {
  /* 自定义主色调 */
  --brand-orange: #FF6B35;
  --brand-magenta: #D63384;
  
  /* 自定义间距 */
  --space-custom: 20px;
  
  /* 自定义圆角 */
  --radius-custom: 16px;
}
```

## 📱 响应式最佳实践

### 移动端优化

```css
@media (max-width: 768px) {
  .your-component {
    /* 移动端样式 */
    padding: var(--space-md);
    border-radius: 16px;
  }
}
```

### 触摸友好设计

```css
.touch-target {
  min-height: 44px; /* iOS 推荐的最小触摸目标 */
  min-width: 44px;
}
```

## 🔧 与现有框架集成

### Tailwind CSS 集成

```css
/* 在 tailwind.config.js 中扩展 */
module.exports = {
  theme: {
    extend: {
      colors: {
        'brand-orange': '#FF8C00',
        'brand-magenta': '#E025B0',
      },
      fontFamily: {
        'sans': ['Inter', 'system-ui', 'sans-serif'],
      },
      borderRadius: {
        'card': '24px',
      }
    }
  }
}
```

### React 组件示例

```jsx
// Button.jsx
import React from 'react';

const Button = ({ 
  children, 
  variant = 'primary', 
  size = 'default',
  ...props 
}) => {
  const baseClass = variant === 'primary' ? 'btn-primary' : 'btn-secondary';
  const sizeClass = size === 'large' ? 'btn-large' : size === 'small' ? 'btn-small' : '';
  
  return (
    <button 
      className={`${baseClass} ${sizeClass}`}
      {...props}
    >
      {children}
    </button>
  );
};

// Card.jsx
const Card = ({ children, icon, title, description }) => {
  return (
    <div className="glassmorphism-card">
      <div className="card-content">
        {icon && (
          <div className="icon-container" style={{ marginBottom: '1rem' }}>
            {icon}
          </div>
        )}
        {title && <h3 className="heading-3">{title}</h3>}
        {description && <p className="body-text">{description}</p>}
        {children}
      </div>
    </div>
  );
};
```

### Vue 组件示例

```vue
<!-- GlassCard.vue -->
<template>
  <div class="glassmorphism-card">
    <div class="card-content">
      <div v-if="icon" class="icon-container" style="margin-bottom: 1rem;">
        <component :is="icon" class="icon" />
      </div>
      <h3 v-if="title" class="heading-3">{{ title }}</h3>
      <p v-if="description" class="body-text">{{ description }}</p>
      <slot />
    </div>
  </div>
</template>

<script>
export default {
  name: 'GlassCard',
  props: {
    title: String,
    description: String,
    icon: Object
  }
}
</script>
```

## 🎯 常见使用场景

### 1. 功能卡片网格

```html
<div class="demo-grid">
  <div class="glassmorphism-card">
    <div class="card-content">
      <div class="icon-container">
        <!-- 图标 -->
      </div>
      <h3 class="heading-3">功能标题</h3>
      <p class="body-text">功能描述</p>
      <button class="btn-primary" style="margin-top: 1rem;">了解更多</button>
    </div>
  </div>
  <!-- 更多卡片... -->
</div>
```

### 2. Hero 区域

```html
<section class="text-center" style="padding: 4rem 2rem;">
  <h1 class="heading-1 gradient-text">AI驱动的教师智慧平台</h1>
  <p class="subtitle" style="margin: 1rem 0 2rem; font-size: 18px;">
    用AI激发教学创意，让每一次教学都充满魔法
  </p>
  <div class="flex justify-center" style="gap: 1rem;">
    <button class="btn-primary btn-large">开始创作</button>
    <button class="btn-secondary btn-large">了解更多</button>
  </div>
</section>
```

### 3. 表单设计

```html
<div class="glassmorphism-card" style="max-width: 400px;">
  <div class="card-content">
    <h3 class="heading-3 text-center">登录账户</h3>
    <div class="decorative-divider" style="margin: 1rem 0;"></div>
    
    <form>
      <div style="margin-bottom: 1rem;">
        <label class="subtitle">邮箱地址</label>
        <input type="email" style="width: 100%; padding: 0.75rem; border: 1px solid var(--gradient-border); border-radius: var(--radius-small); margin-top: 0.5rem;">
      </div>
      
      <div style="margin-bottom: 1.5rem;">
        <label class="subtitle">密码</label>
        <input type="password" style="width: 100%; padding: 0.75rem; border: 1px solid var(--gradient-border); border-radius: var(--radius-small); margin-top: 0.5rem;">
      </div>
      
      <button type="submit" class="btn-primary" style="width: 100%;">登录</button>
    </form>
  </div>
</div>
```

## ⚠️ 注意事项

### 1. 性能考虑

- `backdrop-filter` 可能影响性能，在低端设备上谨慎使用
- 大量渐变和模糊效果会增加GPU负担
- 考虑为低性能设备提供简化版本

### 2. 浏览器兼容性

- `backdrop-filter` 在较老的浏览器中不支持
- 已提供回退方案，但效果会有差异
- 建议在目标浏览器中充分测试

### 3. 可访问性

- 确保色彩对比度符合WCAG标准
- 为动画提供 `prefers-reduced-motion` 支持
- 确保键盘导航的可用性

### 4. 维护建议

- 定期检查设计系统的使用情况
- 收集用户反馈并持续改进
- 保持设计系统文档的更新

## 🔍 调试技巧

### 1. 检查CSS变量

```javascript
// 在浏览器控制台中检查CSS变量值
const root = document.documentElement;
const brandOrange = getComputedStyle(root).getPropertyValue('--brand-orange');
console.log('Brand Orange:', brandOrange);
```

### 2. 测试响应式

```css
/* 临时边框，用于调试布局 */
.debug * {
  outline: 1px solid red;
}
```

### 3. 性能监控

```javascript
// 监控渲染性能
const observer = new PerformanceObserver((list) => {
  for (const entry of list.getEntries()) {
    console.log('Paint timing:', entry.name, entry.startTime);
  }
});
observer.observe({entryTypes: ['paint']});
```

## 📚 更多资源

- [设计规范文档](./UI_DESIGN_SPECIFICATION.md)
- [组件演示页面](./design-system-demo.html)
- [CSS源码](./design-system.css)
- [Glassmorphism设计指南](https://uxdesign.cc/glassmorphism-in-user-interfaces-1f39bb1308c9)

---

**需要帮助？** 请查看设计系统文档或联系开发团队。