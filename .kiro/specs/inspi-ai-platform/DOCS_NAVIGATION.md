# 项目规范文档导航 (DOCS_NAVIGATION)

> **📚 说明**: 这是项目规范文档的导航文件，用于开发团队内部的文档管理。
> 
> **🔗 项目介绍**: 如需了解项目概述、安装指南等，请查看 [`../inspi-ai-platform/README.md`](../inspi-ai-platform/README.md)

## 📋 文档职责说明

### 本文件 (规范文档导航)
- **用途**: 开发团队内部文档管理
- **受众**: 项目开发者、维护者
- **内容**: 规范文档结构、整合记录、开发流程

### 项目主README (项目介绍)
- **文件**: `../inspi-ai-platform/README.md`
- **用途**: 项目对外介绍和新人指南
- **受众**: 新开发者、外部贡献者、用户
- **内容**: 项目概述、技术栈、安装指南、API文档

## 📋 核心文档结构

### 🎯 项目规划文档
1. **`requirements.md`** - 项目需求定义
2. **`design.md`** - 系统架构设计  
3. **`tasks.md`** - 任务定义和实施计划 (单一真实来源)

### 🔧 开发指导文档
4. **`DEVELOPMENT_GUIDE.md`** - 开发规范和最佳实践 (必读)
5. **`PROJECT_STATUS.md`** - 项目状态和历史记录

## 📖 文档使用指南

### 开始新任务时
1. 阅读 `tasks.md` 了解任务定义
2. 查阅 `DEVELOPMENT_GUIDE.md` 遵循开发规范
3. 检查 `PROJECT_STATUS.md` 了解项目状态和风险

### 开发过程中
- 遵循 `DEVELOPMENT_GUIDE.md` 中的P0级规则
- 参考经验教训和问题解决方案
- 记录问题和更新项目状态

### 任务完成后
- 更新 `PROJECT_STATUS.md` 中的完成记录
- 记录经验教训和技术债务
- 为下一个任务做准备

## 🗂️ 文档整合记录

### 删除的冗余文件 (17个)
**Spec目录**:
- ~~UNIVERSAL_DEVELOPMENT_RULES.md~~ → 整合到 `DEVELOPMENT_GUIDE.md`
- ~~DEVELOPMENT_RULES_QUICK_REFERENCE.md~~ → 整合到 `DEVELOPMENT_GUIDE.md`
- ~~DEVELOPMENT_GUIDELINES.md~~ → 通用开发指导原则已整合到 `.kiro/specs/project-management-rules-enhancement/rules-design.md`
- ~~TASK_STATUS_TRACKER.md~~ → 整合到 `PROJECT_STATUS.md`
- ~~REFINED_TASKS.md~~ → 保持 `tasks.md` 作为唯一任务定义
- ~~DEVELOPMENT_WORKFLOW.md~~ → 整合到 `DEVELOPMENT_GUIDE.md`
- ~~TASK_EXECUTION_GUIDELINES.md~~ → 整合到 `DEVELOPMENT_GUIDE.md`
- ~~TASK_TEMPLATE.md~~ → 不再需要
- ~~TASK2_PLAN.md~~ → 整合到 `PROJECT_STATUS.md`

**项目根目录**:
- ~~TASK1_SELF_TEST_REPORT.md~~ → 整合到 `PROJECT_STATUS.md`
- ~~TASK2_ISSUES_ANALYSIS.md~~ → 整合到 `PROJECT_STATUS.md`
- ~~TASK3_ISSUES_ANALYSIS.md~~ → 整合到 `PROJECT_STATUS.md`
- ~~TASK3_COMPREHENSIVE_REVIEW.md~~ → 整合到 `PROJECT_STATUS.md`
- ~~TASK3_ROOT_CAUSE_ANALYSIS.md~~ → 整合到 `PROJECT_STATUS.md`
- ~~TASK3_SOLUTIONS_KNOWLEDGE_BASE.md~~ → 整合到 `DEVELOPMENT_GUIDE.md`

**最新删除 (Task 6后整合)**:
- ~~TASK4_EXECUTION_PLAN.md~~ → 任务分解方法整合到 `DEVELOPMENT_GUIDE.md`
- ~~TASK4_TECH_RESEARCH.md~~ → 技术调研模板整合到 `DEVELOPMENT_GUIDE.md`
- ~~DEVELOPMENT_README.md~~ → 内容与现有 `README.md` 重复

### 整合效果
- **文档数量**: 22个 → 5个 (-77%)
- **核心内容**: 100%保留
- **查找效率**: 显著提升
- **维护成本**: 大幅降低

## 🎯 文档维护原则

### 单一真实来源
- `tasks.md` - 唯一的任务定义文件
- `DEVELOPMENT_GUIDE.md` - 唯一的开发规范文件
- `PROJECT_STATUS.md` - 唯一的状态跟踪文件

### 内容更新规则
1. **任务变更** → 只更新 `tasks.md`
2. **开发规范变更** → 只更新 `DEVELOPMENT_GUIDE.md`
3. **项目状态变更** → 只更新 `PROJECT_STATUS.md`
4. **需求/设计变更** → 更新对应的 `requirements.md` / `design.md`

### 避免文档分散
- 不再创建新的独立分析文档
- 所有经验教训记录在 `PROJECT_STATUS.md`
- 所有开发规范记录在 `DEVELOPMENT_GUIDE.md`
- 保持文档结构的稳定性

## 🚀 快速开始

### 新团队成员
1. 阅读本 `README.md` 了解文档结构
2. 学习 `DEVELOPMENT_GUIDE.md` 掌握开发规范
3. 查看 `PROJECT_STATUS.md` 了解项目现状
4. 从 `tasks.md` 选择合适的任务开始

### 继续开发
1. 检查 `PROJECT_STATUS.md` 中的下一个任务
2. 遵循 `DEVELOPMENT_GUIDE.md` 中的开发流程
3. 更新项目状态和记录经验教训

---

**文档版本**: 2.0.0 (整合版)  
**整合完成时间**: 2024-12-27  
**维护者**: 开发团队  
**下次审查**: 每个任务完成后