# 🚀 Inspi.AI 部署指南

## 📋 部署概述

本指南涵盖 Inspi.AI 项目在不同环境下的部署方案，包括开发、测试、预发布和生产环境。

## 🏗️ 部署架构

### 生产环境架构
```mermaid
graph TB
    subgraph "负载均衡层"
        LB[负载均衡器<br/>Nginx/CloudFlare]
    end
    
    subgraph "应用层"
        APP1[Next.js App 1<br/>Port 3000]
        APP2[Next.js App 2<br/>Port 3001]
        APP3[Next.js App N<br/>Port 300N]
    end
    
    subgraph "数据层"
        MONGO[(MongoDB Cluster)]
        REDIS[(Redis Cluster)]
    end
    
    subgraph "监控层"
        DASH[项目管理仪表板<br/>Port 4000]
        MON[系统监控<br/>Prometheus/Grafana]
    end
    
    subgraph "外部服务"
        AI[Gemini AI API]
        EMAIL[邮件服务]
        STORAGE[文件存储]
    end
    
    LB --> APP1
    LB --> APP2
    LB --> APP3
    APP1 --> MONGO
    APP1 --> REDIS
    APP2 --> MONGO
    APP2 --> REDIS
    APP3 --> MONGO
    APP3 --> REDIS
    APP1 --> AI
    APP1 --> EMAIL
    APP1 --> STORAGE
    DASH --> APP1
    MON --> DASH
```

## 🔧 环境配置

### 开发环境 (Development)

#### 系统要求
- Node.js >= 18.0.0
- MongoDB >= 5.0
- Redis >= 6.0 (可选)
- Git >= 2.30.0

#### 快速启动
```bash
# 克隆项目
git clone <repository-url>
cd inspi

# 安装依赖
cd inspi-ai-platform
npm install
cd ..

# 配置环境变量
cd inspi-ai-platform
cp .env.example .env.local

# 启动服务
npm run dev

# 启动项目管理系统 (新终端)
cd ..
node .kiro/dashboard/cli.js start
```

#### 环境变量配置
```env
# .env.local
NODE_ENV=development
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=dev-secret-key

# 数据库
MONGODB_URI=mongodb://localhost:27017/inspi-ai-dev
REDIS_URL=redis://localhost:6379

# AI 服务
GEMINI_API_KEY=your-dev-api-key

# 邮件服务 (开发环境可使用测试服务)
EMAIL_FROM=dev@inspi.ai
EMAIL_SERVER_HOST=smtp.mailtrap.io
EMAIL_SERVER_PORT=2525
EMAIL_SERVER_USER=your-mailtrap-user
EMAIL_SERVER_PASSWORD=your-mailtrap-password
```

### 测试环境 (Testing)

#### Docker Compose 配置
```yaml
# docker-compose.test.yml
version: '3.8'

services:
  app:
    build:
      context: ./inspi-ai-platform
      dockerfile: Dockerfile.test
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=test
      - MONGODB_URI=mongodb://mongo:27017/inspi-ai-test
      - REDIS_URL=redis://redis:6379
    depends_on:
      - mongo
      - redis

  mongo:
    image: mongo:5.0
    ports:
      - "27017:27017"
    volumes:
      - mongo_test_data:/data/db

  redis:
    image: redis:6.2-alpine
    ports:
      - "6379:6379"

  kiro-dashboard:
    build:
      context: .
      dockerfile: .kiro/Dockerfile
    ports:
      - "4000:4000"
    depends_on:
      - app

volumes:
  mongo_test_data:
```

#### 启动测试环境
```bash
# 启动测试环境
docker-compose -f docker-compose.test.yml up -d

# 运行测试
npm run test:integration

# 清理测试环境
docker-compose -f docker-compose.test.yml down -v
```

### 预发布环境 (Staging)

#### 环境配置
```env
# .env.staging
NODE_ENV=staging
NEXTAUTH_URL=https://staging.inspi.ai
NEXTAUTH_SECRET=staging-secret-key

# 数据库 (使用云服务)
MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/inspi-ai-staging
REDIS_URL=redis://staging-redis.cache.amazonaws.com:6379

# AI 服务
GEMINI_API_KEY=your-staging-api-key

# 邮件服务
EMAIL_FROM=staging@inspi.ai
EMAIL_SERVER_HOST=smtp.sendgrid.net
EMAIL_SERVER_PORT=587
EMAIL_SERVER_USER=apikey
EMAIL_SERVER_PASSWORD=your-sendgrid-api-key
```

#### 部署脚本
```bash
#!/bin/bash
# deploy-staging.sh

set -e

echo "🚀 开始部署到预发布环境..."

# 构建应用
echo "📦 构建应用..."
cd inspi-ai-platform
npm ci --production
npm run build

# 运行测试
echo "🧪 运行测试..."
npm run test:ci

# 部署到服务器
echo "🚀 部署到服务器..."
rsync -avz --delete ./ staging-server:/var/www/inspi-ai/

# 重启服务
echo "🔄 重启服务..."
ssh staging-server "cd /var/www/inspi-ai && pm2 restart ecosystem.config.js"

# 验证部署
echo "✅ 验证部署..."
curl -f https://staging.inspi.ai/api/health || exit 1

echo "🎉 预发布环境部署完成！"
```

### 生产环境 (Production)

#### 系统要求
- **服务器**: 2+ CPU cores, 4GB+ RAM, 50GB+ SSD
- **数据库**: MongoDB Atlas 或自建集群
- **缓存**: Redis Cloud 或自建集群
- **CDN**: CloudFlare 或 AWS CloudFront
- **监控**: Prometheus + Grafana

#### 环境变量配置
```env
# .env.production
NODE_ENV=production
NEXTAUTH_URL=https://inspi.ai
NEXTAUTH_SECRET=super-secure-production-secret

# 数据库集群
MONGODB_URI=mongodb+srv://prod-user:secure-pass@prod-cluster.mongodb.net/inspi-ai
REDIS_URL=redis://prod-redis.cache.amazonaws.com:6379

# AI 服务
GEMINI_API_KEY=your-production-api-key

# 邮件服务
EMAIL_FROM=noreply@inspi.ai
EMAIL_SERVER_HOST=smtp.sendgrid.net
EMAIL_SERVER_PORT=587
EMAIL_SERVER_USER=apikey
EMAIL_SERVER_PASSWORD=your-production-sendgrid-key

# 监控和日志
SENTRY_DSN=https://your-sentry-dsn@sentry.io/project-id
LOG_LEVEL=info
```

## 🐳 Docker 部署

### 多阶段构建 Dockerfile
```dockerfile
# inspi-ai-platform/Dockerfile
FROM node:18-alpine AS base
WORKDIR /app
COPY package*.json ./

# 依赖安装阶段
FROM base AS deps
RUN npm ci --only=production && npm cache clean --force

# 构建阶段
FROM base AS builder
COPY . .
RUN npm ci
RUN npm run build

# 运行阶段
FROM node:18-alpine AS runner
WORKDIR /app

# 创建非root用户
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# 复制必要文件
COPY --from=deps /app/node_modules ./node_modules
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/package.json ./package.json

# 设置权限
USER nextjs

EXPOSE 3000
ENV PORT 3000
ENV NODE_ENV production

CMD ["npm", "start"]
```

### 项目管理系统 Dockerfile
```dockerfile
# .kiro/Dockerfile
FROM node:18-alpine

WORKDIR /app

# 复制项目管理系统文件
COPY .kiro/ ./kiro/
COPY package*.json ./

# 安装依赖
RUN npm install --production

# 创建非root用户
RUN addgroup --system --gid 1001 kiro
RUN adduser --system --uid 1001 kiro
USER kiro

EXPOSE 4000

CMD ["node", "kiro/dashboard/cli.js", "start", "--port", "4000"]
```

### Docker Compose 生产配置
```yaml
# docker-compose.prod.yml
version: '3.8'

services:
  app:
    build:
      context: ./inspi-ai-platform
      dockerfile: Dockerfile
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
    env_file:
      - .env.production
    restart: unless-stopped
    depends_on:
      - mongo
      - redis

  kiro-dashboard:
    build:
      context: .
      dockerfile: .kiro/Dockerfile
    ports:
      - "4000:4000"
    restart: unless-stopped
    depends_on:
      - app

  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf
      - ./ssl:/etc/nginx/ssl
    depends_on:
      - app
      - kiro-dashboard
    restart: unless-stopped

  mongo:
    image: mongo:5.0
    volumes:
      - mongo_data:/data/db
    environment:
      - MONGO_INITDB_ROOT_USERNAME=admin
      - MONGO_INITDB_ROOT_PASSWORD=secure-password
    restart: unless-stopped

  redis:
    image: redis:6.2-alpine
    volumes:
      - redis_data:/data
    restart: unless-stopped

volumes:
  mongo_data:
  redis_data:
```

## ⚙️ 负载均衡配置

### Nginx 配置
```nginx
# nginx.conf
events {
    worker_connections 1024;
}

http {
    upstream app {
        server app:3000;
        # 如果有多个实例
        # server app2:3000;
        # server app3:3000;
    }

    upstream kiro {
        server kiro-dashboard:4000;
    }

    # 主应用
    server {
        listen 80;
        server_name inspi.ai www.inspi.ai;

        # HTTPS 重定向
        return 301 https://$server_name$request_uri;
    }

    server {
        listen 443 ssl http2;
        server_name inspi.ai www.inspi.ai;

        ssl_certificate /etc/nginx/ssl/cert.pem;
        ssl_certificate_key /etc/nginx/ssl/key.pem;

        # 安全头
        add_header X-Frame-Options DENY;
        add_header X-Content-Type-Options nosniff;
        add_header X-XSS-Protection "1; mode=block";

        # 静态文件缓存
        location /_next/static/ {
            proxy_pass http://app;
            expires 1y;
            add_header Cache-Control "public, immutable";
        }

        # API 路由
        location /api/ {
            proxy_pass http://app;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
        }

        # 主应用
        location / {
            proxy_pass http://app;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
        }
    }

    # 项目管理仪表板
    server {
        listen 443 ssl http2;
        server_name dashboard.inspi.ai;

        ssl_certificate /etc/nginx/ssl/cert.pem;
        ssl_certificate_key /etc/nginx/ssl/key.pem;

        location / {
            proxy_pass http://kiro;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
        }
    }
}
```

## 🔄 CI/CD 流水线

### GitHub Actions 配置
```yaml
# .github/workflows/deploy.yml
name: Deploy to Production

on:
  push:
    branches: [main]
  release:
    types: [published]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
          cache: 'npm'
          cache-dependency-path: inspi-ai-platform/package-lock.json
      
      - name: Install dependencies
        run: |
          cd inspi-ai-platform
          npm ci
      
      - name: Run tests
        run: |
          cd inspi-ai-platform
          npm run test:ci
      
      - name: Run integration tests
        run: |
          node .kiro/integration-tests/run-tests.js

  build:
    needs: test
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Docker Buildx
        uses: docker/setup-buildx-action@v2
      
      - name: Login to Container Registry
        uses: docker/login-action@v2
        with:
          registry: ghcr.io
          username: ${{ github.actor }}
          password: ${{ secrets.GITHUB_TOKEN }}
      
      - name: Build and push Docker image
        uses: docker/build-push-action@v4
        with:
          context: ./inspi-ai-platform
          push: true
          tags: |
            ghcr.io/${{ github.repository }}/app:latest
            ghcr.io/${{ github.repository }}/app:${{ github.sha }}

  deploy:
    needs: build
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'
    steps:
      - name: Deploy to production
        uses: appleboy/ssh-action@v0.1.5
        with:
          host: ${{ secrets.PROD_HOST }}
          username: ${{ secrets.PROD_USER }}
          key: ${{ secrets.PROD_SSH_KEY }}
          script: |
            cd /var/www/inspi-ai
            docker-compose pull
            docker-compose up -d
            docker system prune -f
```

## 📊 监控和日志

### 健康检查端点
```typescript
// app/api/health/route.ts
import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';

export async function GET() {
  try {
    // 检查数据库连接
    await connectDB();
    
    // 检查 Redis 连接
    // await redis.ping();
    
    // 检查外部服务
    // await checkExternalServices();
    
    return NextResponse.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      version: process.env.npm_package_version,
      uptime: process.uptime()
    });
  } catch (error) {
    return NextResponse.json(
      {
        status: 'unhealthy',
        error: error.message,
        timestamp: new Date().toISOString()
      },
      { status: 503 }
    );
  }
}
```

### Prometheus 监控配置
```yaml
# prometheus.yml
global:
  scrape_interval: 15s

scrape_configs:
  - job_name: 'inspi-ai-app'
    static_configs:
      - targets: ['app:3000']
    metrics_path: '/api/metrics'
    scrape_interval: 30s

  - job_name: 'kiro-dashboard'
    static_configs:
      - targets: ['kiro-dashboard:4000']
    metrics_path: '/metrics'
    scrape_interval: 30s

  - job_name: 'node-exporter'
    static_configs:
      - targets: ['node-exporter:9100']
```

### 日志配置
```typescript
// lib/logger.ts
import winston from 'winston';

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  transports: [
    new winston.transports.File({ filename: 'logs/error.log', level: 'error' }),
    new winston.transports.File({ filename: 'logs/combined.log' }),
  ],
});

if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: winston.format.simple()
  }));
}

export default logger;
```

## 🔒 安全配置

### SSL/TLS 配置
```bash
# 生成 SSL 证书 (Let's Encrypt)
certbot certonly --webroot -w /var/www/html -d inspi.ai -d www.inspi.ai

# 自动续期
echo "0 12 * * * /usr/bin/certbot renew --quiet" | crontab -
```

### 安全头配置
```typescript
// middleware.ts
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const response = NextResponse.next();

  // 安全头
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('X-XSS-Protection', '1; mode=block');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  response.headers.set(
    'Content-Security-Policy',
    "default-src 'self'; script-src 'self' 'unsafe-eval'; style-src 'self' 'unsafe-inline';"
  );

  return response;
}
```

## 🚨 故障排除

### 常见部署问题

#### 1. 构建失败
```bash
# 检查 Node.js 版本
node --version

# 清理缓存
npm cache clean --force
rm -rf node_modules package-lock.json
npm install

# 检查内存使用
NODE_OPTIONS="--max-old-space-size=4096" npm run build
```

#### 2. 数据库连接问题
```bash
# 检查数据库连接
mongosh $MONGODB_URI

# 检查网络连接
telnet mongodb-host 27017

# 查看连接日志
tail -f logs/database.log
```

#### 3. 服务启动失败
```bash
# 检查端口占用
lsof -i :3000

# 查看进程状态
pm2 status

# 查看详细日志
pm2 logs inspi-ai-app
```

### 回滚策略
```bash
#!/bin/bash
# rollback.sh

echo "🔄 开始回滚..."

# 停止当前服务
pm2 stop inspi-ai-app

# 恢复上一个版本
git checkout HEAD~1

# 重新构建
npm run build

# 重启服务
pm2 start inspi-ai-app

# 验证回滚
curl -f https://inspi.ai/api/health || echo "回滚失败"

echo "✅ 回滚完成"
```

## 📈 性能优化

### 应用层优化
```typescript
// next.config.js
/** @type {import('next').NextConfig} */
const nextConfig = {
  // 启用压缩
  compress: true,
  
  // 图片优化
  images: {
    domains: ['example.com'],
    formats: ['image/webp', 'image/avif'],
  },
  
  // 实验性功能
  experimental: {
    appDir: true,
    serverComponentsExternalPackages: ['mongoose'],
  },
  
  // 输出配置
  output: 'standalone',
};

module.exports = nextConfig;
```

### 数据库优化
```javascript
// 数据库索引
db.users.createIndex({ email: 1 }, { unique: true });
db.works.createIndex({ userId: 1, createdAt: -1 });
db.knowledge_graphs.createIndex({ userId: 1, "nodes.id": 1 });

// 连接池配置
const mongoOptions = {
  maxPoolSize: 10,
  serverSelectionTimeoutMS: 5000,
  socketTimeoutMS: 45000,
  bufferMaxEntries: 0,
};
```

---

**文档版本**: v1.0  
**最后更新**: 2025年9月5日  
**维护人**: 运维团队