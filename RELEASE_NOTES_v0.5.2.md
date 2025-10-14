# 🚀 Inspi AI Platform 0.5.2 发布说明

**发布日期**: 2025/01/19  
**版本类型**: 问题修复版本（Patch）  
**Git标签**: `v0.5.2`

## 📋 版本概述

0.5.2 聚焦于登录弹窗的可用性修复与体验统一，确保关键 CTA 都能正确唤起完整的登录流程。

## 🛠 修复与改进

- ✅ 登录提示弹窗改为独立模态层，新增遮罩与关闭按钮，解决内容无法操作的问题
- ✅ 顶部“登录”、首屏 CTA 及四类创作卡片统一接入新版弹窗逻辑
- ✅ 设计系统补充 `login-prompt` 样式集，保证不同屏幕尺寸的视觉一致
- ✅ 新增 `/auth/login` 页面和返回按钮组件，保证登录流程有落地页面承接
- ✅ 登录页面改为模态体验，聚焦登录与注册引导

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

感谢所有贡献者对本次修复版本的支持！
