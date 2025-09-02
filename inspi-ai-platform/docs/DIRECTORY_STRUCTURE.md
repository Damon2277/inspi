# 目录结构说明

## 📁 三个目录职责明确

### 1. `.kiro/specs/inspi-ai-platform/`
- **职责**: 具体项目执行规划
- **价值**: 项目任务的单一真实来源
- **内容**: 
  - `PROJECT_INDEX.md` - 目录说明和使用指南
  - `project-requirements.md` - 项目需求分析
  - `project-design.md` - 项目架构设计
  - `project-tasks.md` - inspi-ai-platform项目任务列表

### 2. `.kiro/specs/project-management-rules-enhancement/`
- **职责**: 规则体系设计规划  
- **价值**: 通用方法论制定
- **内容**: 
  - `RULES_INDEX.md` - 目录说明和设计概览
  - `rules-requirements.md` - 规则体系需求分析
  - `rules-design.md` - 规则体系架构设计
  - `rules-tasks.md` - 规则体系实施任务

### 3. `inspi-ai-platform/docs/` (精简后)
- **职责**: 实用工具和指导文档
- **价值**: 面向未来项目的通用资产
- **内容**: 核心文档 + 工具 + 模板

## 📋 当前docs目录结构

```
docs/
├── README.md              # 工具集总览 (入口文档)
├── RULES.md              # 核心执行规则
├── QUICK_REF.md          # 快速参考卡片
├── templates/            # 标准模板 (统一命名)
│   ├── issue-report.md
│   ├── daily-standup.md
│   ├── collaboration-request.md
│   ├── retrospective.md
│   └── task.md
└── scripts/              # 自动化工具
    ├── quality-gate-checker.js
    ├── task-blocker.js
    ├── team-notification.js
    └── improvement-tracker.js
```

## 🎯 命名规范

### 核心文档
- `README.md` - 入口和总览
- `RULES.md` - 执行规则
- `QUICK_REF.md` - 快速参考

### 模板文件 (统一简洁命名)
- `issue-report.md` - 问题报告
- `daily-standup.md` - 每日站会
- `collaboration-request.md` - 协作请求
- `retrospective.md` - 项目复盘
- `task.md` - 任务规划

### 脚本文件 (功能描述命名)
- `quality-gate-checker.js` - 质量门禁检查
- `task-blocker.js` - 任务阻断检测
- `team-notification.js` - 团队通知
- `improvement-tracker.js` - 持续改进跟踪

## ✅ 解决的命名问题

### 删除的重复文档
- ❌ PROJECT_EXECUTION_FRAMEWORK.md
- ❌ TASK_STATUS_MANAGEMENT.md  
- ❌ ISSUE_BLOCKING_MECHANISM.md
- ❌ PROJECT_MANAGEMENT_IMPROVEMENTS.md
- ❌ PROJECT_MANAGEMENT_GUIDELINES.md
- ❌ IMPROVEMENT_MEASURES_REPORT.md

### 统一的模板命名
- ✅ `retrospective-template.md` → `retrospective.md`
- ✅ `task-template.md` → `task.md`
- ✅ 所有模板文件使用统一的简洁命名

## 🚀 使用指南

### 新用户
1. 阅读 `README.md` (2分钟)
2. 查看 `QUICK_REF.md` (1分钟)
3. 开始使用工具

### 日常使用
- 快速查阅: `QUICK_REF.md`
- 详细规则: `RULES.md`
- 模板使用: `templates/` 目录

### 面向未来项目
- 复制 `docs/` 目录即可使用
- 零配置，开箱即用
- 统一标准，降低学习成本

---

**目标**: 命名统一，结构清晰，上下文成本最低