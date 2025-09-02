# 项目管理工具集

## 🎯 核心工具 (立即可用)

### 质量检查
```bash
npm run quality:gate:mvp        # MVP级别 (70%覆盖率)
npm run quality:gate:standard   # 标准级别 (85%覆盖率)  
npm run quality:gate:enterprise # 企业级别 (95%覆盖率)
```

### 任务管理
```bash
npm run task:check-blocking     # 检查阻断任务
```

### 团队协作
```bash
npm run team:notify task-status "任务名" "[-]" "[x]" "开发者"
npm run team:notify blocking-issue "问题标题" "描述" "严重程度"
```

### 持续改进
```bash
npm run improvement:collect     # 收集数据
npm run improvement:analyze     # 分析趋势
npm run improvement:report      # 生成报告
```

## 📋 核心规则

### 任务状态管理
```
[ ] 未开始 → [-] 进行中 → [?] 待验证 → [x] 已完成

阻断状态 (禁止进入下一任务):
[!] 存在问题  [R] 需要返工  [~] 部分完成  [P] 暂停执行
```

### 质量标准
```
MVP级别:    70% 覆盖率 | 核心功能可用
标准级别:   85% 覆盖率 | 完整功能实现  
企业级别:   95% 覆盖率 | 企业级质量
```

### 问题处理
```
发现问题 → 标记[!] → 停止新功能 → 专注修复 → 验证解决 → 继续开发
```

## 📝 模板文件

- [问题报告](templates/issue-report.md) - 标准问题报告格式
- [每日站会](templates/daily-standup.md) - 每日站会记录格式  
- [协作请求](templates/collaboration-request.md) - 团队协作请求格式
- [项目复盘](templates/retrospective.md) - 项目复盘模板
- [任务规划](templates/task.md) - 任务规划模板

## 🛠️ 自动化脚本

- `scripts/quality-gate-checker.js` - 质量门禁检查
- `scripts/task-blocker.js` - 任务阻断检测
- `scripts/team-notification.js` - 团队通知系统
- `scripts/improvement-tracker.js` - 持续改进跟踪

## 📖 文档导航

- [RULES.md](RULES.md) - 完整执行规则
- [QUICK_REF.md](QUICK_REF.md) - 快速参考卡片
- [DIRECTORY_STRUCTURE.md](DIRECTORY_STRUCTURE.md) - 目录结构说明

---

**目标**: 解决"未完成便进入下一任务"问题  
**原则**: 工具化、自动化、标准化  
**使用**: 直接运行npm脚本即可