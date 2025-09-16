# 项目管理规则增强系统 - 快速启动指南

## 概述

本系统提供了一套完整的项目管理规则和开发流程增强工具，帮助解决开发过程中的常见问题。

## 可用系统


### 项目状态管理系统
- **描述**: 跟踪功能开发状态，防止状态混乱
- **需求**: 1.1, 1.2, 1.3, 1.4
- **路径**: `/Users/apple/inspi/.kiro/project-state`


### 样式版本控制系统
- **描述**: 管理样式快照，提供回滚功能
- **需求**: 2.1, 2.2, 2.3, 2.4
- **路径**: `/Users/apple/inspi/.kiro/style-recovery`
- **依赖**: playwright

### 开发流程规范引擎
- **描述**: 强制执行开发流程和预提交检查
- **需求**: 3.1, 3.2, 3.3
- **路径**: `/Users/apple/inspi/.kiro/workflow-rules`


### 自动化质量检查系统
- **描述**: 监控代码质量和功能完整性
- **需求**: 4.1, 4.2, 4.3, 4.4
- **路径**: `/Users/apple/inspi/.kiro/quality-checks`
- **依赖**: jest

### 项目恢复和回滚系统
- **描述**: 创建恢复点，提供智能回滚功能
- **需求**: 5.1, 5.2, 5.3, 5.4
- **路径**: `/Users/apple/inspi/.kiro/recovery-points`


### 开发者仪表板
- **描述**: 项目健康监控和一键操作工具
- **需求**: 1.1, 4.3, 4.4, 2.3, 5.1
- **路径**: `/Users/apple/inspi/.kiro/dashboard`
- **依赖**: express


## 使用方法

1. 运行环境检查:
   ```bash
   node .kiro/quick-start.js --check
   ```

2. 查看可用系统:
   ```bash
   node .kiro/quick-start.js --list
   ```

3. 启用特定系统:
   ```bash
   node .kiro/quick-start.js --enable <system-name>
   ```

4. 启用所有系统:
   ```bash
   node .kiro/quick-start.js --enable-all
   ```

## 系统要求

- Node.js >= 16.0.0
- npm 或 yarn
- Git 仓库
- 相关依赖包 (根据启用的系统而定)

## 故障排除

如果遇到问题，请：
1. 检查 Node.js 版本
2. 确保所有依赖已安装
3. 验证 Git 仓库状态
4. 查看系统日志文件

更多信息请参考主项目文档。
