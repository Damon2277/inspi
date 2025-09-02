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
- Tailwind CSS
- Zustand (状态管理)
- React Query (数据获取)
- D3.js (知识图谱可视化)
- Framer Motion (动画)

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
│   ├── common/         # 通用组件
│   ├── auth/           # 认证相关
│   ├── magic/          # AI魔法师
│   ├── square/         # 智慧广场
│   ├── profile/        # 个人中心
│   └── subscription/   # 订阅管理
├── hooks/              # 自定义Hooks
├── lib/                # 库文件
│   ├── models/         # 数据模型
│   ├── middleware/     # 中间件
│   └── utils/          # 工具函数
├── stores/             # 状态管理
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

### 开发规范文档
- **文档导航**: 查看 [`.kiro/specs/inspi-ai-platform/DOCS_NAVIGATION.md`](.kiro/specs/inspi-ai-platform/DOCS_NAVIGATION.md)
- **详细开发规范**: 查看 [`.kiro/specs/inspi-ai-platform/DEVELOPMENT_GUIDE.md`](.kiro/specs/inspi-ai-platform/DEVELOPMENT_GUIDE.md)
- **项目状态跟踪**: 查看 [`.kiro/specs/inspi-ai-platform/PROJECT_STATUS.md`](.kiro/specs/inspi-ai-platform/PROJECT_STATUS.md)
- **任务定义**: 查看 [`.kiro/specs/inspi-ai-platform/tasks.md`](.kiro/specs/inspi-ai-platform/tasks.md)

### 代码规范
- 使用 TypeScript 进行类型检查
- 遵循 ESLint 规则
- 使用 Prettier 格式化代码
- 遵循项目开发规范 (详见上述文档)

### 提交规范
- feat: 新功能
- fix: 修复bug
- docs: 文档更新
- style: 代码格式调整
- refactor: 代码重构
- test: 测试相关
- chore: 构建过程或辅助工具的变动

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
1. **阅读本文档** - 了解项目概述和技术栈
2. **查看文档导航** - [DOCS_NAVIGATION.md](.kiro/specs/inspi-ai-platform/DOCS_NAVIGATION.md)
3. **查看开发规范** - [DEVELOPMENT_GUIDE.md](.kiro/specs/inspi-ai-platform/DEVELOPMENT_GUIDE.md)
4. **了解项目状态** - [PROJECT_STATUS.md](.kiro/specs/inspi-ai-platform/PROJECT_STATUS.md)
5. **选择任务开始** - [tasks.md](.kiro/specs/inspi-ai-platform/tasks.md)

### 文档结构
- **项目介绍** (本文件) - 项目概述、安装指南、API文档
- **规范文档** (`.kiro/specs/` 目录) - 开发规范、任务定义、项目状态

## 联系我们

邮箱: sundp1980@gmail.com