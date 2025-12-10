# Inspi.AI Architecture Ledger

```
inspi/
├─ src/
│  ├─ app/api/magic/generate/      # 生成卡片入口，未来触发保存作品
│  ├─ app/api/works/               # 作品创建/推荐 API，是真实数据源
│  ├─ app/profile/                 # 个人中心，需消费真实作品
│  ├─ core/community/work-service.ts # 作品生命周期逻辑
│  ├─ services/wechat-pay.service.ts # 支付链路（扫码→回调）
│  └─ services/quota.service.ts    # 额度与订阅联动
├─ scripts/wechat/                 # 证书、平台密钥的自动化脚本
├─ CLAUDE.md                       # 当前文件：描述骨架与意图
└─ ...
```

## 作品生命周期蓝图
- **生成 (Generate API)**：`/api/magic/generate` 完成卡片生成后，应落地一个“保存作品”动作，将结果打包成 `Work` 输入。
- **存储 (WorkService)**：`WorkService.createWork` 是唯一写入口；所有作品数据（草稿/发布/复用）必须在此形成，成为单一真相源。
- **展示 (Profile / Square / Sharing)**：页面只消费 `GET /api/works` 或用户专属查询，不再依赖 mock。草稿、已发布、复用统一由状态字段驱动。

## 支付与额度耦合
- **Native 扫码** → `wechat-pay.service.ts` 向微信发起 V3 下单。
- **回调/通知** → `/api/payment/wechat/callback` 验签解密后调用 `QuotaService` 更新额度并记录 `PaymentTransaction`。
- **权益解锁** → 支付成功后触发订阅状态更新、作品高级功能开放。

## AI Provider 策略
- `src/core/ai/aiProvider.ts` 根据三段规则挑选服务：
  1. 尊重 `AI_PROVIDER` 指定且该 provider 的 key 可用。
  2. 若优选 provider 缺 key，则在 DeepSeek/Gemini 中挑选首个可用的 key，并记录 warning。
  3. 如果两个 key 都为空，仍回退到 Gemini，并提示必须补充 key 才能真正输出内容。
- 这样本地（通常只配置 DeepSeek）与海外环境（使用 Gemini）都能自动运行，避免因为缺 key 直接崩溃。

## 设计原则
1. **单一真相源**：所有可视化数据必须来自数据库/API；组件内部不再维护 mock 源。
2. **数据单向流**：生成 → 保存 → 展示，一个方向。页面仅监听下游事件。
3. **节奏设计（白白黑）**：输入轻、生成炸场、管理沉静；支付/复用等节点提供小幅情绪跃迁。
4. **文档同步**：架构发生调整时，立即更新本文件，保持系统记忆。

## 下一阶段
- 完成微信支付证书配置，自测 Native 扫码全链路。
- 依据新的 AI Provider 策略保障生产/本地环境 key 管理与监控。
