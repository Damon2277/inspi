# Inspi.AI - 教师智慧生态平台

老师的好搭子，更是您教学创意的放大器。

## 项目概述

Inspi.AI是一个AI驱动的教师智慧与IP孵化平台，旨在通过自生长生态系统激发、汇聚和传承全球教师教学智慧。

### 核心功能

- **AI教学魔法师**: 生成四种类型的教学创意卡片
- **智慧广场**: 教师作品分享与复用社区
- **个人知识图谱**: 可视化教学理念和知识体系
- **贡献度系统**: 基于创作和复用的激励机制

## 技术栈

### 前端
- Next.js 15 (React 18)
- TypeScript
- 自定义设计系统 (轻盈的未来科技感)
- Zustand (状态管理)
- React Query (数据获取)
- D3.js (知识图谱可视化)
- Framer Motion (动画)

### 设计系统
- **Glassmorphism**: 玻璃拟态效果，营造现代科技感
- **Gradient Accents**: 品牌渐变点缀 (#FF8C00 → #E025B0)
- **Clean & Minimalist**: 干净极简的设计语言
- **Responsive**: 全设备响应式支持
- **Accessible**: 符合WCAG 2.1 AA标准

### 后端
- Node.js + Express
- MongoDB + Mongoose
- Redis (缓存)
- JWT (身份验证)
- Google OAuth 2.0
- Gemini API (AI内容生成)

## 开发环境设置

### 前置要求

- Node.js 18+
- MongoDB
- Redis (可选，开发环境可跳过)

### 安装步骤

1. 克隆项目
```bash
git clone <repository-url>
cd inspi-ai-platform
```

2. 安装依赖
```bash
npm install
```

3. 配置环境变量
复制 `.env.local` 文件并填入相应的配置：

```bash
# Database
MONGODB_URI=mongodb://localhost:27017/inspi-ai
REDIS_URL=redis://localhost:6379

# Authentication
NEXTAUTH_SECRET=your-nextauth-secret-here
NEXTAUTH_URL=http://localhost:3000

# Google OAuth
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret

# Gemini AI
GEMINI_API_KEY=AIzaSyDh9Soyoe6Kp0CtN0Nz5cKULq7xu5otjnQ

# Email
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=sundp1980@gmail.com
SMTP_PASS=your-email-password

# App
NODE_ENV=development
```

4. 启动开发服务器
```bash
npm run dev
```

5. 访问应用
打开 [http://localhost:3000](http://localhost:3000)

### 设计系统测试

运行设计系统集成测试：
```bash
node scripts/design-system-test.js
```

运行组件单元测试：
```bash
npm test -- --testPathPatterns="components/ui"
```

## 项目结构

```
src/
├── app/                 # Next.js App Router
│   ├── api/            # API路由
│   ├── globals.css     # 全局样式
│   ├── layout.tsx      # 根布局
│   ├── page.tsx        # 主页
│   └── providers.tsx   # 全局Provider
├── components/         # React组件
│   ├── ui/             # 设计系统UI组件库
│   ├── common/         # 通用组件
│   ├── auth/           # 认证相关
│   ├── magic/          # AI魔法师
│   ├── square/         # 智慧广场
│   ├── profile/        # 个人中心
│   ├── subscription/   # 订阅管理
│   └── ErrorBoundary.tsx # 错误边界组件
├── hooks/              # 自定义Hooks
│   └── usePerformanceMonitor.ts # 性能监控Hook
├── lib/                # 库文件
│   ├── models/         # 数据模型
│   ├── middleware/     # 中间件
│   └── utils/          # 工具函数
├── stores/             # 状态管理
├── styles/             # 样式文件
│   ├── design-system.css # 设计系统核心样式
│   └── utilities.css   # 工具类样式
├── types/              # TypeScript类型
└── utils/              # 工具函数
```

## API端点

### 健康检查
- `GET /api/health` - 系统健康状态检查

### 认证相关 (计划中)
- `POST /api/auth/login` - 用户登录
- `POST /api/auth/register` - 用户注册
- `GET /api/auth/me` - 获取当前用户信息

### AI魔法师 (计划中)
- `POST /api/magic/generate` - 生成教学卡片
- `POST /api/magic/regenerate` - 重新生成卡片

### 作品管理 (计划中)
- `GET /api/works` - 获取作品列表
- `POST /api/works` - 创建作品
- `POST /api/works/:id/reuse` - 复用作品

## 开发指南

### 项目管理规则增强系统

本项目集成了完整的项目管理规则增强系统，提供全面的开发流程管理和质量保证：

#### 🛠️ 核心管理工具
- **[质量检查系统](../.kiro/quality-checks/README.md)**: 代码质量监控和功能验证
- **[样式恢复系统](../.kiro/style-recovery/README.md)**: 样式快照管理和视觉回归检测
- **[恢复点系统](../.kiro/recovery-points/README.md)**: 项目状态恢复和回滚机制
- **[开发者仪表板](../.kiro/dashboard/README.md)**: 项目健康监控和一键操作
- **[配置管理系统](../.kiro/config-manager/README.md)**: 统一配置管理和同步
- **[集成验证工具](../.kiro/integration-tests/README.md)**: 系统集成状态验证

#### 🚀 快速开始项目管理
```bash
# 查看项目整体状态
node ../.kiro/integration-tests/cli.js status

# 启动开发者仪表板
node ../.kiro/dashboard/cli.js start

# 运行质量检查
node ../.kiro/quality-checks/cli.js check

# 创建项目快照 (重要变更前)
node ../.kiro/recovery-points/cli.js create
```

#### 📊 系统集成状态
- **最新验证**: 2025年9月5日
- **集成状态**: 🟢 优秀 (100% 通过率)
- **系统健康**: 6/6 系统正常运行
- **详细报告**: [集成验证总结](../.kiro/integration-tests/INTEGRATION_SUMMARY.md)

### 开发规范文档
- **主项目README**: 查看 [../README.md](../README.md) - 完整项目概述
- **文档导航**: 查看 [`.kiro/specs/inspi-ai-platform/DOCS_NAVIGATION.md`](.kiro/specs/inspi-ai-platform/DOCS_NAVIGATION.md)
- **详细开发规范**: 查看 [`.kiro/specs/inspi-ai-platform/DEVELOPMENT_GUIDE.md`](.kiro/specs/inspi-ai-platform/DEVELOPMENT_GUIDE.md)
- **项目状态跟踪**: 查看 [`.kiro/specs/inspi-ai-platform/PROJECT_STATUS.md`](.kiro/specs/inspi-ai-platform/PROJECT_STATUS.md)
- **任务定义**: 查看 [`.kiro/specs/inspi-ai-platform/tasks.md`](.kiro/specs/inspi-ai-platform/tasks.md)

### 开发工作流程

#### 1. 开发前准备
```bash
# 检查系统集成状态
node ../.kiro/integration-tests/cli.js status

# 启动项目监控
node ../.kiro/dashboard/cli.js start

# 创建开发前快照
node ../.kiro/recovery-points/cli.js create --name "开发前快照"
```

#### 2. 开发过程中
```bash
# 启动开发服务器
npm run dev

# 运行质量检查 (推荐定期运行)
node ../.kiro/quality-checks/cli.js check

# 创建样式快照 (UI变更前)
node ../.kiro/style-recovery/cli.js snapshot
```

#### 3. 提交前检查
```bash
# 运行完整质量检查
node ../.kiro/quality-checks/cli.js full-check

# 检测视觉回归
node ../.kiro/style-recovery/cli.js detect

# 运行集成测试
node ../.kiro/integration-tests/run-tests.js

# 验证配置一致性
node ../.kiro/config-manager/cli.js validate
```

#### 4. 问题处理
```bash
# 查看问题详情
node ../.kiro/dashboard/cli.js health

# 恢复到稳定状态 (如需要)
node ../.kiro/recovery-points/cli.js recover

# 回滚样式变更 (如需要)
node ../.kiro/style-recovery/cli.js rollback
```

### 代码规范
- 使用 TypeScript 进行类型检查
- 遵循 ESLint 规则
- 使用 Prettier 格式化代码
- 遵循项目开发规范 (详见上述文档)
- 使用项目管理工具进行质量保证

### 提交规范
- feat: 新功能
- fix: 修复bug
- docs: 文档更新
- style: 代码格式调整
- refactor: 代码重构
- test: 测试相关
- chore: 构建过程或辅助工具的变动
- mgmt: 项目管理系统相关变更

## 部署

### 构建生产版本
```bash
npm run build
```

### 启动生产服务器
```bash
npm start
```

## 许可证

[MIT License](LICENSE)

## 开发团队

### 新团队成员入门
1. **了解整体项目** - 阅读 [主项目README](../README.md) 了解完整项目结构
2. **阅读本文档** - 了解Inspi.AI平台的技术栈和功能
3. **熟悉管理工具** - 了解项目管理规则增强系统的各个组件
4. **环境配置验证** - 运行 `node ../.kiro/integration-tests/run-tests.js` 验证环境
5. **查看文档导航** - [DOCS_NAVIGATION.md](.kiro/specs/inspi-ai-platform/DOCS_NAVIGATION.md)
6. **查看开发规范** - [DEVELOPMENT_GUIDE.md](.kiro/specs/inspi-ai-platform/DEVELOPMENT_GUIDE.md)
7. **了解项目状态** - [PROJECT_STATUS.md](.kiro/specs/inspi-ai-platform/PROJECT_STATUS.md)
8. **选择任务开始** - [tasks.md](.kiro/specs/inspi-ai-platform/tasks.md)

#### 🎯 快速验证环境
```bash
# 1. 检查系统集成状态
node ../.kiro/integration-tests/cli.js status

# 2. 启动开发环境
npm run dev

# 3. 启动项目监控 (新终端)
node ../.kiro/dashboard/cli.js start

# 4. 运行质量检查
node ../.kiro/quality-checks/cli.js check
```

如果所有检查都通过，说明环境配置正确，可以开始开发工作。

### 文档结构
- **项目介绍** (本文件) - 项目概述、安装指南、API文档
- **规范文档** (`.kiro/specs/` 目录) - 开发规范、任务定义、项目状态

## 联系我们

邮箱: sundp1980@gmail.com