# 订阅支付功能测试指南

## 实现概述

已完成国内版订阅支付系统的开发，支持微信扫码支付，定价 ¥15/月，提供每月 300 次生成额度。

## 功能架构

### 1. 数据模型
- **UserSubscription**: 用户订阅记录
- **UsageStats**: 使用统计（每日/月度）
- **PaymentTransaction**: 支付流水
- **SubscriptionLog**: 状态变更日志

### 2. 核心服务
- **QuotaService**: 额度管理服务
- **WeChatPayService**: 微信支付集成服务

### 3. API 接口
- `GET /api/subscription/status` - 获取订阅状态
- `POST /api/subscription/subscribe` - 创建订阅
- `POST /api/subscription/cancel` - 取消订阅
- `POST /api/payment/wechat/callback` - 支付回调
- `GET /api/payment/wechat/callback?orderId=xxx` - 查询支付状态

### 4. UI 组件
- **SubscriptionModal**: 支付弹窗
- **QuotaDisplay**: 额度显示
- **SubscriptionManagement**: 订阅管理页面

## 测试场景

### 场景 1：免费用户生成流程
```
测试步骤：
1. 访问创作页面 http://localhost:3007/create
2. 填写教学内容
3. 点击"开启教学魔法"生成
4. 前 3 次应正常生成
5. 第 4 次触发订阅弹窗

预期结果：
- 显示今日剩余次数
- 超出限制弹出订阅提示
- 显示微信支付二维码
```

### 场景 2：订阅购买流程
```
测试步骤：
1. 点击"立即订阅"
2. 扫描微信二维码（开发环境会模拟支付）
3. 等待支付成功提示

预期结果：
- 生成支付二维码
- 自动轮询支付状态
- 支付成功后自动关闭弹窗
- 额度更新为 300 次/月
```

### 场景 3：订阅用户使用流程
```
测试步骤：
1. 订阅成功后继续生成
2. 查看额度消耗情况
3. 访问订阅管理页面

预期结果：
- 显示月度剩余额度
- 每次生成扣减 1 次
- 显示下次扣款时间
```

### 场景 4：取消订阅流程
```
测试步骤：
1. 访问 http://localhost:3007/subscription
2. 点击"取消自动续费"
3. 确认取消

预期结果：
- 状态变为"已取消自动续费"
- 当前周期仍可使用
- 显示周期结束时间
```

## 开发环境配置

### 1. 环境变量设置
```bash
# .env.local
NODE_ENV=development
AUTO_PAY_SUCCESS=true  # 自动模拟支付成功
WECHAT_APP_ID=mock_app_id
WECHAT_MCH_ID=mock_mch_id
WECHAT_API_KEY=mock_api_key
```

### 2. MongoDB 连接（可选）
如果需要持久化测试：
```bash
# 启动 MongoDB
brew services start mongodb-community

# 或使用 Docker
docker run -d -p 27017:27017 --name mongodb mongo:latest
```

### 3. 模拟支付成功
开发环境下，设置 `AUTO_PAY_SUCCESS=true` 会在 5 秒后自动模拟支付成功。

## 测试检查清单

### 免费用户
- [ ] 每日 3 次免费额度正确显示
- [ ] 额度用尽触发订阅弹窗
- [ ] 每日 00:00 额度重置

### 订阅流程
- [ ] 生成支付二维码
- [ ] 支付状态轮询正常
- [ ] 支付成功后额度立即生效
- [ ] 订阅信息正确保存

### 订阅用户
- [ ] 月度 300 次额度正确显示
- [ ] 额度消耗正确计算
- [ ] 剩余额度警告（≤30 次）
- [ ] 月度额度用尽提示

### 订阅管理
- [ ] 订阅状态正确显示
- [ ] 套餐对比信息准确
- [ ] 取消订阅功能正常
- [ ] 下次扣款时间显示

### 错误处理
- [ ] 网络错误提示
- [ ] 支付失败处理
- [ ] 二维码过期提示
- [ ] 重复支付防护

## API 测试命令

### 获取订阅状态
```bash
curl http://localhost:3007/api/subscription/status
```

### 创建订阅（触发支付）
```bash
curl -X POST http://localhost:3007/api/subscription/subscribe \
  -H "Content-Type: application/json"
```

### 查询支付状态
```bash
curl "http://localhost:3007/api/payment/wechat/callback?orderId=INSPI1234567890"
```

### 取消订阅
```bash
curl -X POST http://localhost:3007/api/subscription/cancel \
  -H "Content-Type: application/json"
```

## 常见问题

### 1. MongoDB 连接错误
- 开发环境可忽略，使用内存数据
- 生产环境需确保 MongoDB 服务运行

### 2. 支付不成功
- 检查 AUTO_PAY_SUCCESS 环境变量
- 查看控制台是否有错误日志

### 3. 额度未更新
- 刷新页面重新获取状态
- 检查 localStorage 缓存

### 4. 订阅状态不同步
- 清除浏览器缓存
- 重新登录账号

## 生产环境部署注意事项

1. **微信支付配置**
   - 申请微信支付商户号
   - 配置支付回调 URL
   - 设置 API 密钥

2. **数据库配置**
   - 确保 MongoDB 连接稳定
   - 设置数据备份策略
   - 监控数据库性能

3. **定时任务**
   - 配置每日额度重置任务（00:00）
   - 自动续费检查任务（每日执行）
   - 宽限期处理任务

4. **监控告警**
   - 支付成功率监控
   - 额度消耗异常告警
   - 续费失败通知

## 测试数据清理

开发环境清理测试数据：
```javascript
// 在 MongoDB shell 中执行
use inspi_ai_platform;
db.usersubscriptions.deleteMany({});
db.usagestats.deleteMany({});
db.paymenttransactions.deleteMany({});
db.subscriptionlogs.deleteMany({});
```

## 联系支持

如遇到问题，请提供：
1. 错误截图
2. 控制台日志
3. 网络请求信息
4. 用户 ID 和订单号

---

**测试环境**: http://localhost:3007
**最后更新**: 2025-10-19