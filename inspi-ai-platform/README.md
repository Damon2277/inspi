# Inspi.AI 教学创作平台

面向教师的一体化教学创作与课堂展示平台，支持 AI 卡片生成、作品复用、知识图谱沉淀与订阅付费能力。本仓库聚焦 Web 端（端口 `3007`）的开发与自测场景。

## 主要能力

- **教学魔法**：每日 3 次免费生成卡片，订阅后每月 300 次额度。
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

### 关键环境变量

| 类别 | 变量 | 说明 |
|------|------|------|
| 数据库 | `MONGODB_URI` | MongoDB 连接串，示例：`mongodb://127.0.0.1:27017/inspi` |
| 认证 | `NEXTAUTH_SECRET` / `NEXTAUTH_URL` | NextAuth 鉴权所需密钥与回调地址 |
| 邮件 | `SMTP_HOST` / `SMTP_USER` / ... | 若需发送订阅通知，可配置 SMTP |
| Google 登录 | `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | 可选，支持 Google 登录 |
| AI | `GEMINI_API_KEY` | 卡片生成所需的 Gemini API Key |
| 微信支付 | `WECHAT_APP_ID`<br>`WECHAT_MCH_ID`<br>`WECHAT_API_KEY`<br>`WECHAT_NOTIFY_URL` | 正式接入微信支付时必填（需微信商户号） |
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

- 免费账户：每日 3 次生成额度，超出后触发订阅弹窗。
- 订阅账户：每月 300 次额度，按月自动续费，可随时取消。
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
