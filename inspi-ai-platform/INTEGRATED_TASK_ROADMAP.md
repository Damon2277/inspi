# Inspi.AI 综合开发任务路线图

**版本**: v2.0  
**更新时间**: 2025年9月17日  
**整合范围**: 用户体系 + 权限管理 + 升级提示 + 个人知识图谱

## 📊 当前完成状态

### ✅ 已完成功能
- ✅ **AI卡片生成系统**: 四种卡片类型，内容安全验证
- ✅ **卡片编辑功能**: 富文本编辑器，样式自定义，实时预览
- ✅ **图片导出功能**: PNG/JPG/SVG多格式，高清导出，批量处理
- ✅ **社交分享功能**: 8个平台支持，链接生成，二维码分享
- ✅ **功能演示页面**: 完整的功能展示和使用说明
- ✅ **后端认证API**: JWT、密码加密、用户注册登录API

### 🔄 当前开发状态
- 🔄 **任务1.1**: 用户认证界面开发 (进行中)

---

## 🚀 Phase 1: 用户体系和认证界面 (3-4周)

### 任务1.1: 用户认证界面开发 (1周)
- [x] **登录页面** (`src/app/auth/login/page.tsx`) - 已创建
- [x] **登录表单组件** (`src/components/auth/LoginForm.tsx`) - 已创建
- [x] **注册页面** (`src/app/auth/register/page.tsx`) - 已创建
- [x] **注册表单组件** (`src/components/auth/RegisterForm.tsx`) - 已创建
- [ ] **忘记密码页面** (`src/app/auth/forgot-password/page.tsx`)
- [ ] **密码重置表单** (`src/components/auth/PasswordResetForm.tsx`)
- [ ] **邮箱验证页面** (`src/app/auth/verify-email/page.tsx`)
- [ ] **微信登录集成**

### 任务1.2: 认证状态管理 (1周)
- [ ] **全局认证Hook** (`src/hooks/useAuth.ts`)
- [ ] **认证上下文提供者** (`src/contexts/AuthContext.tsx`)
- [ ] **认证路由保护** (`src/components/auth/ProtectedRoute.tsx`)
- [ ] **登录状态持久化**
- [ ] **自动令牌刷新机制**

### 任务1.3: 写入操作拦截系统 (1周)
- [ ] **操作拦截中间件** (`src/lib/auth/operation-guard.ts`)
- [ ] **登录引导弹窗** (`src/components/auth/LoginPrompt.tsx`)
- [ ] **创建操作拦截**: 尝试创建卡片时触发登录
- [ ] **编辑操作拦截**: 尝试编辑卡片时触发登录
- [ ] **复用操作拦截**: 尝试复用卡片时触发登录
- [ ] **保存操作拦截**: 尝试保存卡片时触发登录

### 任务1.4: 用户权限和配额系统 (1周)
- [ ] **用户角色管理** (`src/lib/auth/roles.ts`)
- [ ] **配额检查中间件** (`src/lib/quota/quota-checker.ts`)
- [ ] **每日配额管理**: 创建配额 + 复用配额独立计算
- [ ] **配额状态显示** (`src/components/quota/QuotaStatus.tsx`)
- [ ] **权限控制组件** (`src/components/auth/PermissionGate.tsx`)

---

## 💰 Phase 2: 订阅和支付系统 (2-3周)

### 任务2.1: 升级提示系统 (1周)
- [ ] **配额超限检测** (`src/lib/quota/quota-monitor.ts`)
- [ ] **智能升级提示** (`src/components/upgrade/UpgradePrompt.tsx`)
- [ ] **创建配额用完提示**: 突出基础版567%提升
- [ ] **复用配额用完提示**: 强调复用功能价值
- [ ] **渐进式升级引导**: 基于用户行为的智能推荐
- [ ] **A/B测试框架**: 测试不同提示文案的转化效果

### 任务2.2: 订阅套餐管理 (1周)
- [ ] **订阅数据模型** (`src/lib/models/Subscription.ts`)
- [ ] **套餐配置管理** (`src/lib/subscription/plans.ts`)
- [ ] **订阅状态管理** (`src/lib/subscription/subscription-service.ts`)
- [ ] **套餐选择页面** (`src/app/pricing/page.tsx`)
- [ ] **订阅管理页面** (`src/app/account/subscription/page.tsx`)

### 任务2.3: 微信支付集成 (1周)
- [ ] **微信支付SDK集成** (`src/lib/payment/wechat-pay.ts`)
- [ ] **支付API路由** (`src/app/api/payment/wechat/route.ts`)
- [ ] **支付回调处理** (`src/app/api/payment/callback/route.ts`)
- [ ] **支付状态管理** (`src/lib/payment/payment-service.ts`)
- [ ] **支付安全验证**
- [ ] **自动续费机制**
- [ ] **订阅取消功能**

---

## 🧠 Phase 3: 个人知识图谱系统 (3-4周)

### 任务3.1: 知识图谱数据层 (1周)
- [ ] **个人图谱数据模型** (`src/lib/models/PersonalKnowledgeGraph.ts`)
- [ ] **图谱节点扩展** (`src/types/knowledgeGraph.ts` 更新)
- [ ] **卡片到节点映射** (`src/lib/knowledge-graph/card-mapper.ts`)
- [ ] **图谱数据API** (`src/app/api/knowledge-graph/personal/route.ts`)
- [ ] **图谱CRUD操作**

### 任务3.2: 自动图谱构建 (1周)
- [ ] **卡片创建监听** (`src/lib/knowledge-graph/auto-builder.ts`)
- [ ] **知识点自动识别** (基于AI内容分析)
- [ ] **关联关系推断** (智能连接相关知识点)
- [ ] **图谱增量更新**
- [ ] **复用节点标记** (区分自创和复用内容)

### 任务3.3: 图谱可视化界面 (1.5周)
- [ ] **知识图谱主页** (`src/app/knowledge-graph/page.tsx`)
- [ ] **图谱可视化组件** (`src/components/knowledge-graph/PersonalGraphViewer.tsx`)
- [ ] **多维度展示模式**:
  - [ ] 学科树形图
  - [ ] 时间轴视图
  - [ ] 难度梯度图
  - [ ] 使用热力图
  - [ ] 关系网络图
- [ ] **节点详情面板** (`src/components/knowledge-graph/NodeDetailPanel.tsx`)
- [ ] **图谱编辑工具** (拖拽、连接、删除)

### 任务3.4: 智能分析功能 (0.5周)
- [ ] **知识缺口分析** (`src/lib/knowledge-graph/gap-analyzer.ts`)
- [ ] **学习路径规划** (`src/lib/knowledge-graph/path-planner.ts`)
- [ ] **智能推荐系统** (`src/lib/knowledge-graph/recommender.ts`)
- [ ] **分析报告生成** (`src/components/knowledge-graph/AnalysisReport.tsx`)

---

## 🔧 Phase 4: 数据管理和优化 (1-2周)

### 任务4.1: 数据导出和备份 (1周)
- [ ] **图谱导出功能** (`src/lib/knowledge-graph/exporter.ts`)
- [ ] **多格式导出**: PNG、PDF、JSON
- [ ] **教学大纲生成** (`src/lib/knowledge-graph/syllabus-generator.ts`)
- [ ] **数据备份服务** (`src/lib/backup/backup-service.ts`)
- [ ] **多设备数据同步**

### 任务4.2: 性能优化和测试 (1周)
- [ ] **图谱渲染优化** (大型图谱的性能优化)
- [ ] **数据缓存策略** (Redis缓存图谱数据)
- [ ] **懒加载实现** (按需加载图谱节点)
- [ ] **单元测试完善**
- [ ] **集成测试**
- [ ] **性能测试**

---

## 📊 详细配额和权限设计

### 用户角色和配额
```
用户类型     | 创建配额  | 复用配额  | 图谱节点  | 月费    | 特殊功能
-----------|----------|----------|----------|---------|----------
免费用户    | 3/天     | 1/天     | 50个     | 0元     | 基础功能
基础版      | 20/天    | 5/天     | 无限     | 69元    | 高清导出、智能分析
专业版      | 100/天   | 50/天    | 无限     | 199元   | 品牌定制、数据导出
```

### 权限控制矩阵
```
功能模块              | 未登录 | 免费用户 | 基础版 | 专业版 | 管理员
--------------------|--------|----------|--------|--------|--------
浏览公开内容         | ✅     | ✅       | ✅     | ✅     | ✅
创建AI卡片           | ❌     | 限额     | 限额   | 限额   | 无限
复用卡片模板         | ❌     | 限额     | 限额   | 限额   | 无限
编辑保存卡片         | ❌     | ✅       | ✅     | ✅     | ✅
导出高清图片         | ❌     | ❌       | ✅     | ✅     | ✅
个人知识图谱         | ❌     | 限制     | ✅     | ✅     | ✅
智能分析推荐         | ❌     | ❌       | ✅     | ✅     | ✅
数据导出备份         | ❌     | ❌       | ❌     | ✅     | ✅
自定义品牌水印       | ❌     | ❌       | ❌     | ✅     | ✅
```

---

## 🎯 关键里程碑

### 里程碑1: 用户体系完成 (第4周末)
- [ ] 用户可以注册、登录、管理账户
- [ ] 写入操作正确拦截并引导登录
- [ ] 配额系统正常工作
- [ ] 权限控制生效

### 里程碑2: 支付系统上线 (第7周末)
- [ ] 升级提示系统正常工作
- [ ] 微信支付流程完整
- [ ] 订阅管理功能可用
- [ ] 自动续费机制正常

### 里程碑3: 知识图谱发布 (第11周末)
- [ ] 个人知识图谱自动构建
- [ ] 图谱可视化界面完整
- [ ] 智能分析功能可用
- [ ] 数据导出功能正常

### 里程碑4: 系统优化完成 (第13周末)
- [ ] 所有功能测试通过
- [ ] 性能达到预期指标
- [ ] 用户体验优化完成
- [ ] 生产环境部署就绪

---

## 📈 预期成果指标

### 用户转化指标
- **注册转化率**: 从当前5%提升至15% (写入操作拦截)
- **付费转化率**: 达到8-12% (智能升级提示)
- **用户留存率**: 提升至85% (个人知识图谱粘性)
- **平均使用时长**: 提升300% (知识图谱深度使用)

### 商业价值指标
- **月收入预期**: 基于10,000月活用户，预期月收入10-15万元
- **用户生命周期价值**: 提升200% (长期订阅)
- **客户获取成本**: 降低40% (自然增长和推荐)

### 产品功能指标
- **知识图谱创建率**: >40% (注册用户)
- **图谱节点增长**: 平均每用户每月20个节点
- **升级提示转化**: 点击率>25%，支付转化>60%
- **系统性能**: 页面加载<2秒，图谱渲染<3秒

---

## 🛠️ 技术架构要点

### 前端架构
```typescript
// 全局状态管理
interface AppState {
  auth: AuthState;           // 认证状态
  quota: QuotaState;         // 配额状态
  subscription: SubState;    // 订阅状态
  knowledgeGraph: GraphState; // 图谱状态
}

// 权限控制
<PermissionGate permission="create_card">
  <CreateCardButton />
</PermissionGate>

// 配额检查
<QuotaGuard quotaType="create" onExceeded={showUpgradePrompt}>
  <CreateCardForm />
</QuotaGuard>
```

### 后端架构
```typescript
// 中间件链
Request → Auth → Quota → Permission → Business Logic → Response

// 配额检查
export const checkQuota = (type: 'create' | 'reuse') => {
  return async (req: AuthRequest, res: NextResponse) => {
    const usage = await getQuotaUsage(req.user.id, type);
    const limit = getQuotaLimit(req.user.tier, type);
    
    if (usage >= limit) {
      return NextResponse.json({
        error: 'Quota exceeded',
        upgradePrompt: getUpgradePrompt(req.user.tier, type)
      }, { status: 429 });
    }
  };
};
```

---

## 📝 开发优先级说明

### 🔥 高优先级 (必须完成)
1. **用户认证界面** - 产品基础功能
2. **写入操作拦截** - 核心转化机制
3. **配额管理系统** - 商业模式基础
4. **升级提示系统** - 付费转化关键

### ⚠️ 中优先级 (重要功能)
1. **微信支付集成** - 收入实现
2. **个人知识图谱** - 差异化竞争
3. **智能分析功能** - 增值服务

### 💡 低优先级 (优化功能)
1. **数据导出备份** - 用户便利
2. **性能优化** - 体验提升
3. **高级分析报告** - 专业功能

---

## 🎉 总结

这个综合任务路线图整合了：
- **用户认证体系**: 完整的登录注册和权限管理
- **商业化功能**: 配额限制、升级提示、微信支付
- **核心价值功能**: 个人知识图谱构建和智能分析
- **用户体验优化**: 数据管理、性能优化、界面完善

预期在13周内完成所有核心功能，实现从"AI卡片工具"到"个人知识管理平台"的产品升级，建立可持续的商业模式和用户粘性。

---

**文档状态**: ✅ 综合规划完成  
**下一步**: 继续执行任务1.1的剩余工作