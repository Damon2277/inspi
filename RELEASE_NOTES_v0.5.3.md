# 🚀 Inspi AI Platform 0.5.3 发布说明

**发布日期**: 2025/01/20  
**版本类型**: 问题修复版本（Patch）  
**Git标签**: `v0.5.3`

## 📋 版本概述

0.5.3 持续打磨登录体验，将完整的登录表单直接融合进登录提示弹窗，并优化蒙版与留白，确保用户在任何入口触发时都能获得一致、可用的登录流程。

## 🛠 修复与改进

- ✅ “创建专属 AI 卡片”弹窗现已直接嵌入登录表单，无需额外跳转
- ✅ 弹窗蒙版升级为浅色磨砂玻璃效果，凸显背景而不过度遮挡
- ✅ 弹窗内部栅格和间距加宽，避免文案与输入框贴边
- ✅ 登录权益列表调整为两列布局，在桌面与移动端保持一致可读性

## 🧪 回归测试

```bash
cd inspi-ai-platform
npm test -- --runTestsByPath \
  src/__tests__/components/desktop/DesktopHomePage.interactions.test.tsx \
  src/__tests__/components/desktop/DesktopNavigation.interactions.test.tsx
```

## 📦 升级指引

```bash
cd inspi-ai-platform
npm install
npm run build
```

## 🔗 相关链接

- [完整版本历史](inspi-ai-platform/VERSION_HISTORY.md)
- [问题反馈](https://github.com/your-org/inspi-ai-platform/issues)

---

感谢所有贡献者对本次持续体验优化的支持！
