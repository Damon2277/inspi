# 🛠️ Inspi.AI 开发指南

## 📋 开发环境设置

### 系统要求
- **Node.js**: >= 18.0.0
- **npm**: >= 8.0.0 或 yarn >= 1.22.0
- **MongoDB**: >= 5.0 (本地或云端)
- **Redis**: >= 6.0 (可选，用于缓存)
- **Git**: >= 2.30.0

### 环境配置

#### 1. 克隆项目
```bash
git clone <repository-url>
cd inspi
```

#### 2. 安装依赖
```bash
# 主应用依赖
cd inspi-ai-platform
npm install

# 返回根目录
cd ..

# 安装项目管理系统依赖
npm install -g playwright  # 样式恢复系统需要
```

#### 3. 环境变量配置
```bash
# 复制环境配置模板
cd inspi-ai-platform
cp .env.example .env.local

# 编辑配置文件
nano .env.local
```

**必需的环境变量**:
```env
# 数据库配置
MONGODB_URI=mongodb://localhost:27017/inspi-ai
REDIS_URL=redis://localhost:6379

# 认证配置
NEXTAUTH_SECRET=your-secret-key
NEXTAUTH_URL=http://localhost:3000

# AI 服务配置
GEMINI_API_KEY=your-gemini-api-key

# 邮件服务配置
EMAIL_FROM=noreply@inspi.ai
EMAIL_SERVER_HOST=smtp.gmail.com
EMAIL_SERVER_PORT=587
EMAIL_SERVER_USER=your-email@gmail.com
EMAIL_SERVER_PASSWORD=your-app-password
```

#### 4. 数据库初始化
```bash
# 启动 MongoDB (如果使用本地数据库)
mongod

# 启动 Redis (如果使用本地缓存)
redis-server

# 运行数据库迁移 (如果有)
npm run db:migrate
```

## 🏗️ 项目结构

### 主应用结构
```
inspi-ai-platform/
├── src/
│   ├── app/                    # Next.js App Router
│   │   ├── (auth)/            # 认证相关页面
│   │   ├── api/               # API 路由
│   │   ├── create/            # 创作页面
│   │   ├── works/             # 作品页面
│   │   └── globals.css        # 全局样式
│   ├── components/            # React 组件
│   │   ├── auth/              # 认证组件
│   │   ├── mobile/            # 移动端组件
│   │   ├── ui/                # 通用UI组件
│   │   └── works/             # 作品相关组件
│   ├── lib/                   # 工具库
│   │   ├── ai/                # AI 服务
│   │   ├── auth/              # 认证逻辑
│   │   ├── db/                # 数据库连接
│   │   ├── email/             # 邮件服务
│   │   └── utils/             # 工具函数
│   ├── hooks/                 # React Hooks
│   ├── stores/                # 状态管理
│   ├── styles/                # 样式文件
│   └── types/                 # TypeScript 类型定义
├── public/                    # 静态资源
├── docs/                      # 应用文档
└── scripts/                   # 构建和部署脚本
```

### 项目管理系统结构
```
.kiro/
├── quality-checks/            # 质量检查系统
├── style-recovery/            # 样式恢复系统
├── recovery-points/           # 恢复点系统
├── dashboard/                 # 开发者仪表板
├── config-manager/            # 配置管理系统
├── integration-tests/         # 集成验证工具
├── specs/                     # 规范文档
└── quick-start.js            # 快速启动脚本
```

## 🔄 开发工作流

### 日常开发流程

#### 1. 开始开发
```bash
# 检查系统状态
node .kiro/integration-tests/cli.js status

# 启动开发服务器
cd inspi-ai-platform
npm run dev

# 启动项目监控 (新终端)
cd ..
node .kiro/dashboard/cli.js start
```

#### 2. 功能开发
```bash
# 创建功能分支
git checkout -b feature/your-feature-name

# 开发过程中定期检查
node .kiro/quality-checks/cli.js check

# 重要UI变更前创建样式快照
node .kiro/style-recovery/cli.js snapshot

# 重要功能变更前创建恢复点
node .kiro/recovery-points/cli.js create
```

#### 3. 代码提交
```bash
# 运行预提交检查
./scripts/pre-commit-check.sh

# 或手动运行各项检查
node .kiro/quality-checks/cli.js full-check
node .kiro/style-recovery/cli.js detect
node .kiro/integration-tests/run-tests.js

# 提交代码
git add .
git commit -m "feat: your feature description"
git push origin feature/your-feature-name
```

#### 4. 代码审查和合并
```bash
# 创建 Pull Request
# 等待代码审查
# 合并到主分支

# 合并后清理
git checkout main
git pull origin main
git branch -d feature/your-feature-name
```

### 测试策略

#### 单元测试
```bash
# 运行所有单元测试
cd inspi-ai-platform
npm test

# 运行特定测试文件
npm test -- --testPathPattern=components/auth

# 监听模式运行测试
npm test -- --watch

# 生成覆盖率报告
npm test -- --coverage
```

#### 集成测试
```bash
# 运行集成测试
npm run test:integration

# 运行API测试
npm run test:api

# 运行数据库测试
npm run test:db
```

#### 端到端测试
```bash
# 运行E2E测试
npm run test:e2e

# 运行特定E2E测试
npm run test:e2e -- --grep "user login"

# 调试模式运行E2E测试
npm run test:e2e:debug
```

#### 项目管理系统测试
```bash
# 运行系统集成测试
node .kiro/integration-tests/run-tests.js

# 测试特定系统
node .kiro/quality-checks/test-system.js
node .kiro/style-recovery/test-snapshot.js
node .kiro/recovery-points/test-selective-recovery.js
```

## 🎨 代码规范

### TypeScript 规范
```typescript
// 使用严格的类型定义
interface User {
  id: string;
  email: string;
  name: string;
  createdAt: Date;
}

// 使用泛型提高代码复用性
interface ApiResponse<T> {
  data: T;
  success: boolean;
  message?: string;
}

// 使用枚举定义常量
enum UserRole {
  ADMIN = 'admin',
  USER = 'user',
  MODERATOR = 'moderator'
}
```

### React 组件规范
```tsx
// 使用函数组件和 Hooks
import React, { useState, useEffect } from 'react';

interface Props {
  title: string;
  onSubmit: (data: FormData) => void;
}

export const MyComponent: React.FC<Props> = ({ title, onSubmit }) => {
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // 副作用逻辑
  }, []);

  return (
    <div className="my-component">
      <h1>{title}</h1>
      {/* 组件内容 */}
    </div>
  );
};
```

### API 路由规范
```typescript
// app/api/example/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    // 认证检查
    const session = await auth(request);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 业务逻辑
    const data = await fetchData();

    return NextResponse.json({ data, success: true });
  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}
```

### 样式规范
```css
/* 使用 Tailwind CSS 类名 */
.component {
  @apply flex items-center justify-between p-4 bg-white rounded-lg shadow-md;
}

/* 自定义样式使用 CSS 变量 */
:root {
  --primary-color: #3b82f6;
  --secondary-color: #64748b;
  --success-color: #10b981;
  --error-color: #ef4444;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .component {
    @apply flex-col space-y-2;
  }
}
```

## 🔧 调试和故障排除

### 开发工具

#### 1. 浏览器开发者工具
- **Elements**: 检查DOM结构和样式
- **Console**: 查看日志和错误信息
- **Network**: 监控网络请求
- **Application**: 检查本地存储和Service Worker

#### 2. VS Code 扩展推荐
```json
{
  "recommendations": [
    "bradlc.vscode-tailwindcss",
    "esbenp.prettier-vscode",
    "ms-vscode.vscode-typescript-next",
    "ms-vscode.vscode-json",
    "ms-playwright.playwright"
  ]
}
```

#### 3. 调试配置
```json
// .vscode/launch.json
{
  "version": "0.2.0",
  "configurations": [
    {
      "name": "Next.js: debug server-side",
      "type": "node",
      "request": "launch",
      "program": "${workspaceFolder}/inspi-ai-platform/node_modules/next/dist/bin/next-dev",
      "args": ["dev"],
      "cwd": "${workspaceFolder}/inspi-ai-platform",
      "console": "integratedTerminal",
      "skipFiles": ["<node_internals>/**"]
    }
  ]
}
```

### 常见问题解决

#### 1. 数据库连接问题
```bash
# 检查 MongoDB 连接
mongosh $MONGODB_URI

# 检查 Redis 连接
redis-cli ping

# 查看连接日志
tail -f inspi-ai-platform/logs/dev.log
```

#### 2. API 错误调试
```bash
# 查看 API 日志
tail -f inspi-ai-platform/logs/api.log

# 使用 curl 测试 API
curl -X GET http://localhost:3000/api/health \
  -H "Content-Type: application/json"

# 使用 Postman 或 Insomnia 测试复杂请求
```

#### 3. 前端错误调试
```bash
# 查看构建错误
npm run build

# 检查类型错误
npm run type-check

# 运行 linter
npm run lint

# 格式化代码
npm run format
```

#### 4. 项目管理系统问题
```bash
# 运行系统诊断
node .kiro/config-manager/cli.js diagnose

# 查看详细日志
node .kiro/dashboard/cli.js logs

# 重置系统配置
node .kiro/config-manager/cli.js reset
```

## 📊 性能优化

### 前端性能优化

#### 1. 代码分割
```typescript
// 动态导入组件
const LazyComponent = dynamic(() => import('./LazyComponent'), {
  loading: () => <div>Loading...</div>,
});

// 路由级别的代码分割
const HomePage = dynamic(() => import('./pages/HomePage'));
```

#### 2. 图片优化
```tsx
import Image from 'next/image';

// 使用 Next.js Image 组件
<Image
  src="/hero-image.jpg"
  alt="Hero Image"
  width={800}
  height={600}
  priority
  placeholder="blur"
  blurDataURL="data:image/jpeg;base64,..."
/>
```

#### 3. 缓存策略
```typescript
// API 响应缓存
export const revalidate = 3600; // 1 hour

// 静态生成缓存
export async function generateStaticParams() {
  // 生成静态参数
}
```

### 后端性能优化

#### 1. 数据库查询优化
```typescript
// 使用索引
await User.createIndex({ email: 1 });

// 查询优化
const users = await User.find({ status: 'active' })
  .select('name email')
  .limit(10)
  .lean();

// 聚合查询
const stats = await User.aggregate([
  { $match: { createdAt: { $gte: startDate } } },
  { $group: { _id: '$role', count: { $sum: 1 } } }
]);
```

#### 2. 缓存实现
```typescript
import Redis from 'ioredis';

const redis = new Redis(process.env.REDIS_URL);

// 缓存查询结果
async function getCachedData(key: string) {
  const cached = await redis.get(key);
  if (cached) {
    return JSON.parse(cached);
  }

  const data = await fetchFromDatabase();
  await redis.setex(key, 3600, JSON.stringify(data));
  return data;
}
```

## 🚀 部署指南

### 开发环境部署
```bash
# 启动开发服务器
npm run dev

# 启动项目管理系统
node .kiro/dashboard/cli.js start
```

### 生产环境部署
```bash
# 构建应用
npm run build

# 启动生产服务器
npm start

# 使用 PM2 管理进程
pm2 start ecosystem.config.js
```

### Docker 部署
```dockerfile
# Dockerfile
FROM node:18-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production

FROM node:18-alpine AS runner
WORKDIR /app
COPY --from=builder /app/node_modules ./node_modules
COPY . .
RUN npm run build
EXPOSE 3000
CMD ["npm", "start"]
```

```bash
# 构建和运行 Docker 容器
docker build -t inspi-ai-platform .
docker run -p 3000:3000 inspi-ai-platform
```

## 📚 学习资源

### 技术文档
- [Next.js 官方文档](https://nextjs.org/docs)
- [React 官方文档](https://react.dev)
- [TypeScript 官方文档](https://www.typescriptlang.org/docs)
- [Tailwind CSS 文档](https://tailwindcss.com/docs)
- [MongoDB 文档](https://docs.mongodb.com)

### 项目相关文档
- [系统架构文档](ARCHITECTURE.md)
- [API 文档](../inspi-ai-platform/docs/API.md)
- [部署文档](DEPLOYMENT_GUIDE.md)
- [项目管理系统文档](../.kiro/README.md)

## 🤝 贡献指南

### 提交规范
使用约定式提交格式：
```
<type>(<scope>): <description>

[optional body]

[optional footer(s)]
```

**类型**:
- `feat`: 新功能
- `fix`: 错误修复
- `docs`: 文档更新
- `style`: 代码格式调整
- `refactor`: 代码重构
- `test`: 测试相关
- `chore`: 构建过程或辅助工具的变动

**示例**:
```
feat(auth): add email verification system

- Implement email verification service
- Add verification email templates
- Update user registration flow

Closes #123
```

### 代码审查清单
- [ ] 代码符合项目规范
- [ ] 包含适当的测试
- [ ] 文档已更新
- [ ] 通过所有检查
- [ ] 性能影响已评估
- [ ] 安全性已考虑

---

**文档版本**: v1.0  
**最后更新**: 2025年9月5日  
**维护人**: 开发团队