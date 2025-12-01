# Inspi.AI 教学创作平台

面向教师的一体化教学创作与课堂展示平台，支持 AI 卡片生成、作品复用、知识图谱沉淀与订阅付费能力。本仓库聚焦 Web 端（端口 `3007`）的开发与自测场景。

## 主要能力

- **教学魔法**：每日 5 次免费生成卡片，订阅后每月 150 次额度。
- **灵感广场**：卡片复用、点赞与数据榜单。
- **个人空间**：作品管理、知识图谱可视化。
- **订阅体系**：微信扫码扣款（支持本地模拟）、自动续费与额度展示。

## 快速开始

### 环境依赖

- Node.js ≥ 18
- npm ≥ 9
- MongoDB 实例（用于订阅记录与额度统计）
- 可选：Redis 用于缓存

### 安装与启动

```bash
git clone https://github.com/Damon2277/inspi.git
cd inspi/inspi-ai-platform
npm install

cp .env.example .env.local   # 根据下表填写变量
npm run dev                   # 浏览器访问 http://localhost:3007
```

### 使用 Docker Compose 一键拉起 Mongo + 前端

如果希望由容器同时托管 Mongo 与前端（避免本机手动安装），可使用新增的开发编排：

1. 安装 Docker Desktop，并启用 `docker compose`。
2. 在 `inspi-ai-platform` 目录复制环境变量：

   ```bash
   cp .env.example .env.local
   # 如果暂时没有真实 AI Key，可设置 USE_MOCK_GEMINI=true
   # 本地调试常用：DISABLE_QUOTA_CHECK=true
   ```

3. 执行脚本启动服务（默认暴露 `http://localhost:3007`）：

   ```bash
   ./scripts/dev-stack.sh start
   ```

   - `frontend` 服务会自动 `npm install` 并运行 `npm run dev`，代码通过 volume 挂载支持热更新。
   - `mongo` 服务使用官方 `mongo:6.0`，数据保存在命名卷 `mongo-data` 中。

4. 停止与查看日志：

   ```bash
   ./scripts/dev-stack.sh stop   # 停止并清理容器
   ./scripts/dev-stack.sh logs   # 实时查看 Mongo/前端日志
   ```

如果更习惯直接使用 `docker compose`，也可以执行 `docker compose -f docker-compose.dev.yml up --build`。

### 关键环境变量

| 类别 | 变量 | 说明 |
|------|------|------|
| 数据库 | `MONGODB_URI` | MongoDB 连接串，示例：`mongodb://127.0.0.1:27017/inspi` |
| 认证 | `NEXTAUTH_SECRET` / `NEXTAUTH_URL` | NextAuth 鉴权所需密钥与回调地址 |
| 邮件 | `SMTP_HOST` / `SMTP_USER` / ... | 若需发送订阅通知，可配置 SMTP |
| Google 登录 | `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | 可选，支持 Google 登录 |
| AI | `AI_PROVIDER`（可选）<br>`GEMINI_API_KEY`<br>`DEEPSEEK_API_KEY` | `AI_PROVIDER` 默认 `gemini`；若指定 provider 的 key 缺失，系统会自动按“Gemini→DeepSeek”顺序回退到可用 key，若两个 key 都为空则进入 mock 模式 |
| 微信支付 | `WECHAT_APP_ID`<br>`WECHAT_MCH_ID`<br>`WECHAT_API_KEY`<br>`WECHAT_API_V3_KEY`<br>`WECHAT_MCH_SERIAL_NO`<br>`WECHAT_PRIVATE_KEY`<br>`WECHAT_PLATFORM_CERT`<br>`WECHAT_PLATFORM_SERIAL_NO`<br>`WECHAT_NOTIFY_URL` | 正式接入微信支付（Native 扫码）时必填，需配置商户证书、V2/V3 密钥与回调地址 |
| 本地模拟 | `WECHAT_PAY_MOCK=true` | **开发默认开启**，生成本地二维码并模拟回调 |

> 若未配置微信商户参数，系统会自动启用 Mock 模式；也可显式设置 `WECHAT_PAY_MOCK=false` 在测试环境使用真实接口。

### 常用脚本

```bash
npm run dev           # 启动开发环境 (端口 3007)
npm run type-check    # TypeScript 校验
npm run lint          # ESLint 检查
npm run test:unit     # 单元测试（Jest）
npm run test:subscription  # 仅运行订阅/额度相关用例
npm run build         # 生产打包
```

## 订阅与额度逻辑

- 免费账户：每日 5 次生成额度，超出后触发订阅弹窗。
- 订阅账户：每月 150 次额度，按月自动续费，可随时取消。
- 支付链路：
  1. `/api/subscription/subscribe` 创建订单并返回二维码（Mock 或真实微信）。
  2. 前端轮询 `/api/payment/wechat/callback?orderId=xxx` 获取状态。
  3. 微信服务器回调 `/api/payment/wechat/callback`（正式环境 XML；Mock 为 JSON/本地触发）。
- “订阅管理”页面可查看剩余额度、取消续费或再次订阅。

## 目录结构

```
src/
├── app/                      # Next.js App Router & API
│   ├── api/                  # 订阅、支付、魔法等接口
│   └── square/ …             # 页面入口
├── components/
│   ├── subscription/         # 订阅面板、额度展示
│   ├── square/               # 灵感广场组件
│   └── ...
├── lib/
│   ├── services/             # 支付、额度等业务服务
│   ├── quota/                # 配额检查工具
│   └── mongodb.ts            # 数据库连接
├── models/                   # Mongoose 模型
├── shared/                   # 类型定义与工具方法
└── __tests__/                # Jest 单元/集成测试
```

## 测试与质量

- 改动支付或额度逻辑时，建议在 `__tests__/services` 下补充单元测试。
- 提交前运行 `npm run type-check && npm run lint` 保持类型/规范一致。
- Mock 模式下会自动完成支付回调；接入真实支付时，请确保 `WECHAT_NOTIFY_URL` 暴露在公网且支持 HTTPS。

## 支持与反馈

如需扩展课堂展示、支付方式或跨端导出等能力，可在 Issue 中描述使用场景，或通过订阅管理页反馈入口提交需求。
