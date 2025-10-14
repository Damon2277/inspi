# 仪式感设计系统 - 核心检测模块

## 概述

仪式感核心检测系统是一个智能的用户行为分析和仪式感触发系统，能够识别用户操作中的关键时刻，并决定是否以及如何触发仪式感体验。

## 核心特性

- 🎯 **智能检测**: 自动识别需要仪式感的关键用户行为
- 📊 **行为分析**: 深度分析用户行为模式，提供个性化体验
- ⚡ **性能优化**: 根据设备能力自动调整仪式感强度
- 🌍 **文化适配**: 考虑用户文化背景的仪式感设计
- 🔧 **高度可配置**: 支持自定义触发规则和强度调节

## 快速开始

### 安装和导入

```typescript
import { RitualSystem, RitualType, RitualIntensity } from './ritual-system/core';

// 创建系统实例
const ritualSystem = new RitualSystem();
```

### 基础使用

```typescript
// 定义用户信息
const user = {
  id: 'user-123',
  level: 5,
  joinDate: new Date('2024-01-01'),
  lastActiveDate: new Date(),
  preferences: {
    ritualIntensity: RitualIntensity.MODERATE,
    enabledRitualTypes: [RitualType.WELCOME, RitualType.ACHIEVEMENT],
    soundEnabled: true,
    animationEnabled: true,
    reducedMotion: false
  },
  context: {
    // ... 用户上下文信息
  }
};

// 定义用户行为
const userAction = {
  type: 'task_completed',
  timestamp: Date.now(),
  userId: 'user-123',
  context: {
    taskId: 'task-456',
    difficulty: 'medium'
  }
};

// 检测仪式感时刻
const result = await ritualSystem.processUserAction(user, userAction);

if (result.shouldTrigger) {
  console.log(`触发 ${result.ritualType} 仪式感，强度: ${result.intensity}`);
  // 执行相应的仪式感效果...
}
```

## 核心组件

### 1. RitualTrigger (仪式感触发器)

负责识别和分类需要仪式感处理的用户行为。

```typescript
import { RitualTrigger } from './core/RitualTrigger';

const trigger = new RitualTrigger();

// 检测仪式感时刻
const ritualType = trigger.detectRitualMoment(userAction);

// 计算强度
const intensity = trigger.calculateIntensity(userContext);

// 判断是否激活
const shouldActivate = trigger.shouldActivate(user, userAction);
```

### 2. RitualDetector (仪式感检测器)

提供高级的行为分析和智能决策功能。

```typescript
import { RitualDetector } from './core/RitualDetector';

const detector = new RitualDetector();

// 完整的检测分析
const result = await detector.detectRitualMoment(user, userAction);

// 获取用户行为统计
const stats = detector.getUserBehaviorStats(userId);
```

## 仪式感类型

系统支持以下仪式感类型：

- **WELCOME** - 欢迎仪式（首次登录、回归等）
- **ACHIEVEMENT** - 成就仪式（完成任务、达成目标）
- **CREATION** - 创作仪式（开始新项目、创建内容）
- **SHARING** - 分享仪式（发布作品、邀请协作）
- **MILESTONE** - 里程碑仪式（等级提升、重要节点）
- **TRANSITION** - 过渡仪式（页面切换、状态变化）

## 强度等级

仪式感强度分为四个等级：

1. **SUBTLE** - 轻微（简单动画、轻微反馈）
2. **MODERATE** - 适中（标准动画、音效反馈）
3. **DRAMATIC** - 戏剧性（丰富动画、多感官反馈）
4. **EPIC** - 史诗级（完整仪式流程、最强体验）

## 配置选项

### 用户偏好设置

```typescript
interface UserPreferences {
  ritualIntensity: RitualIntensity;        // 偏好的仪式感强度
  enabledRitualTypes: RitualType[];       // 启用的仪式感类型
  soundEnabled: boolean;                  // 是否启用音效
  animationEnabled: boolean;              // 是否启用动画
  reducedMotion: boolean;                 // 是否减少动画（可访问性）
}
```

### 设备能力检测

```typescript
interface DeviceCapabilities {
  supportsAnimation: boolean;             // 是否支持动画
  supportsAudio: boolean;                 // 是否支持音频
  supportsHaptics: boolean;               // 是否支持触觉反馈
  performanceLevel: 'low' | 'medium' | 'high';  // 设备性能等级
  screenSize: 'small' | 'medium' | 'large';     // 屏幕尺寸
}
```

## 高级功能

### 自定义触发规则

```typescript
// 添加自定义触发规则
trigger.addTriggerRule({
  actionType: 'custom_achievement',
  conditions: [
    { type: 'user_level', operator: 'gte', value: 5 }
  ],
  ritualType: RitualType.ACHIEVEMENT,
  baseIntensity: RitualIntensity.DRAMATIC,
  cooldownMs: 10 * 60 * 1000  // 10分钟冷却
});

// 移除触发规则
trigger.removeTriggerRule('custom_achievement', RitualType.ACHIEVEMENT);
```

### 行为模式分析

系统会自动分析用户的行为模式，包括：

- 行为频率和间隔
- 使用习惯和偏好
- 活跃时间段
- 操作复杂度

这些分析结果会影响仪式感的触发决策和强度调节。

### 特殊上下文检测

系统能够检测特殊情况并相应调整：

- 用户注册周年纪念日
- 连续使用天数里程碑
- 特殊节日和活动
- 首次使用某功能

## 测试

运行测试套件：

```bash
npm test
```

查看测试覆盖率：

```bash
npm run test:coverage
```

## 示例

查看完整的使用示例：

```bash
npm run example:basic
```

或者查看示例文件：`src/ritual-system/examples/basic-usage.ts`

## 性能考虑

- 行为历史限制在最近100个操作
- 模式分析结果会被缓存
- 冷却机制防止过度触发
- 根据设备性能自动降级

## 可访问性

系统充分考虑了可访问性需求：

- 支持 `reducedMotion` 偏好设置
- 提供非视觉的仪式感替代方案
- 兼容屏幕阅读器
- 支持键盘导航

## 文化适配

系统支持多文化适配：

- 地区化的色彩偏好
- 文化敏感的符号选择
- 本地化的仪式感强度
- 避免文化冲突的设计

## 下一步

这是仪式感设计系统的核心检测模块。接下来的开发将包括：

1. 视觉仪式感组件库
2. 动画效果系统
3. 音频仪式管理器
4. 个性化引擎
5. 文化适配系统

## 贡献

欢迎提交 Issue 和 Pull Request 来改进这个系统！