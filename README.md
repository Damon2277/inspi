# Inspi.AI 项目管理规则增强系统

## 项目概述

本项目包含了完整的项目管理规则增强系统，为 Inspi.AI 教师智慧生态平台提供全面的开发流程管理、质量保证和系统监控功能。

### 🏗️ 项目结构

```
inspi/
├── inspi-ai-platform/          # 主应用平台
│   ├── src/                    # 应用源码
│   ├── scripts/                # 版本管理脚本
│   └── docs/                   # 应用文档
├── .kiro/                      # 项目管理规则增强系统
│   ├── quality-checks/         # 质量检查系统
│   ├── style-recovery/         # 样式恢复系统
│   ├── recovery-points/        # 恢复点系统
│   ├── dashboard/              # 开发者仪表板
│   ├── config-manager/         # 配置管理系统
│   ├── integration-tests/      # 集成验证工具
│   └── specs/                  # 规范文档
└── README.md                   # 本文件
```

## 🚀 快速开始

> **💡 新用户推荐**: 查看 [快速开始指南](QUICK_START.md) 获得详细的5分钟快速启动教程
>
> **提示**: 当前代码仓库未包含 `.kiro` 项目管理规则系统目录，相关脚本会自动跳过对应检查。若需要使用完整的质量/监控工具，请在本地补全 `.kiro` 资源或联系维护者获取。

### 1. 环境准备

```bash
# 安装依赖
cd inspi-ai-platform
npm install

# 配置环境变量
cp .env.example .env.local
# 编辑 .env.local 填入相应配置
```

### 2. 验证系统集成

```bash
# 运行系统集成验证
node .kiro/integration-tests/run-tests.js
```

### 3. 启动服务

```bash
# 启动主应用 (终端1)
cd inspi-ai-platform
npm run dev

# 启动项目管理系统 (终端2)
node .kiro/dashboard/cli.js start
```

### 4. 访问应用

- **主应用**: http://localhost:3000
- **项目仪表板**: http://localhost:3001

## 🛠️ 项目管理规则增强系统

### 核心系统组件

#### 1. 质量检查系统 (`.kiro/quality-checks/`)
- **代码质量监控**: 实时监控代码质量指标
- **功能完整性验证**: 自动化功能测试和验证
- **智能问题预警**: 基于模式识别的问题预警

```bash
# 运行质量检查
node .kiro/quality-checks/cli.js check

# 查看质量报告
node .kiro/quality-checks/cli.js report
```

#### 2. 样式恢复系统 (`.kiro/style-recovery/`)
- **样式快照管理**: 自动创建和管理样式快照
- **视觉回归检测**: 页面视觉变化检测和对比
- **一键样式回滚**: 快速恢复到之前的样式状态

```bash
# 创建样式快照
node .kiro/style-recovery/cli.js snapshot

# 检测视觉回归
node .kiro/style-recovery/cli.js detect

# 回滚样式
node .kiro/style-recovery/cli.js rollback
```

#### 3. 恢复点系统 (`.kiro/recovery-points/`)
- **自动恢复点管理**: 智能创建项目恢复点
- **选择性恢复机制**: 精确恢复特定功能或组件
- **恢复操作指导**: 逐步指导恢复操作

```bash
# 创建恢复点
node .kiro/recovery-points/cli.js create

# 选择性恢复
node .kiro/recovery-points/cli.js recover

# 查看恢复指导
node .kiro/recovery-points/cli.js guide
```

#### 4. 开发者仪表板 (`.kiro/dashboard/`)
- **项目健康监控**: 实时显示项目各项健康指标
- **一键操作工具**: 集成常用的项目管理操作
- **操作历史审计**: 详细记录所有操作历史

```bash
# 启动仪表板
node .kiro/dashboard/cli.js start

# 查看项目健康状态
node .kiro/dashboard/cli.js health

# 查看操作历史
node .kiro/dashboard/cli.js history
```

#### 5. 配置管理系统 (`.kiro/config-manager/`)
- **统一配置管理**: 集中管理所有系统配置
- **配置验证同步**: 自动验证和同步配置
- **配置变更通知**: 配置变更时的通知机制

```bash
# 查看配置状态
node .kiro/config-manager/cli.js status

# 同步配置
node .kiro/config-manager/cli.js sync

# 验证配置
node .kiro/config-manager/cli.js validate
```

#### 6. 集成验证工具 (`.kiro/integration-tests/`)
- **系统集成验证**: 验证各系统间的集成状态
- **数据流测试**: 测试系统间的数据流连通性
- **接口兼容性验证**: 验证系统接口的兼容性

```bash
# 运行集成测试
node .kiro/integration-tests/run-tests.js

# 查看集成状态
node .kiro/integration-tests/cli.js status

# 生成集成报告
node .kiro/integration-tests/cli.js report
```

#### 7. 版本管理系统 (`inspi-ai-platform/scripts/`)
- **自动化版本控制**: 智能版本号管理和发布
- **Git工作流集成**: 标准化的Git工作流程
- **版本回滚机制**: 安全的版本回滚功能

```bash
# 版本升级
cd inspi-ai-platform
node scripts/bump-version.js

# 查看版本历史
node scripts/version-history.js

# 版本回滚
node scripts/version-rollback.js
```

### 系统集成架构

```
项目管理规则增强系统
├── 配置管理系统 (中心配置)
│   ├── 质量检查系统
│   ├── 样式恢复系统
│   ├── 恢复点系统
│   └── 开发者仪表板
├── 版本管理系统 (独立)
├── 集成验证工具 (监控)
└── Inspi.AI 主应用
```

## 📊 系统状态监控

### 健康检查

```bash
# 快速健康检查
node .kiro/integration-tests/cli.js status

# 详细系统验证
node .kiro/integration-tests/run-tests.js
```

### 最新集成验证结果

- **验证时间**: 2025年9月5日
- **总体状态**: 🟢 优秀 (100% 通过率)
- **系统健康度**: 6/6 系统正常
- **数据流完整性**: 100% 正常
- **接口兼容性**: 100% 兼容

详细报告请查看: [集成验证总结](.kiro/integration-tests/INTEGRATION_SUMMARY.md)

## 📚 文档导航

### 主要文档
- **[主应用README](inspi-ai-platform/README.md)** - Inspi.AI平台详细介绍
- **[系统架构文档](docs/ARCHITECTURE.md)** - 完整的系统架构设计
- **[开发指南](docs/DEVELOPMENT_GUIDE.md)** - 开发规范和最佳实践
- **[部署指南](docs/DEPLOYMENT_GUIDE.md)** - 部署和运维指南
- **[任务管理](MASTER_TASKS.md)** - 主任务管理文档
- **[变更日志](CHANGELOG.md)** - 项目变更历史

### 系统文档
- **[质量检查系统](.kiro/quality-checks/README.md)** - 质量检查系统使用指南
- **[样式恢复系统](.kiro/style-recovery/README.md)** - 样式恢复系统使用指南
- **[恢复点系统](.kiro/recovery-points/README.md)** - 恢复点系统使用指南
- **[开发者仪表板](.kiro/dashboard/README.md)** - 仪表板使用指南
- **[配置管理系统](.kiro/config-manager/README.md)** - 配置管理使用指南
- **[集成验证工具](.kiro/integration-tests/README.md)** - 集成验证工具使用指南

### 发布文档
- **[发布说明](docs/releases/)** - 版本发布说明
- **[发布模板](docs/releases/template.md)** - 发布文档模板

## 🔧 开发工作流

### 日常开发流程

1. **开始开发**
   ```bash
   # 检查系统状态
   node .kiro/integration-tests/cli.js status
   
   # 启动开发环境
   cd inspi-ai-platform && npm run dev
   
   # 启动仪表板监控
   node .kiro/dashboard/cli.js start
   ```

2. **开发过程中**
   ```bash
   # 运行质量检查
   node .kiro/quality-checks/cli.js check
   
   # 创建样式快照 (重要UI变更前)
   node .kiro/style-recovery/cli.js snapshot
   
   # 创建恢复点 (重要功能变更前)
   node .kiro/recovery-points/cli.js create
   ```

3. **提交前检查**
   ```bash
   # 运行预提交检查脚本 (推荐)
   ./scripts/pre-commit-check.sh
   
   # 或者手动运行各项检查
   node .kiro/quality-checks/cli.js full-check
   node .kiro/style-recovery/cli.js detect
   node .kiro/integration-tests/run-tests.js
   ```

4. **版本发布**
   ```bash
   cd inspi-ai-platform
   
   # 版本升级
   node scripts/bump-version.js
   
   # 生成发布文档
   node scripts/release-doc-generator.js
   ```

### 问题处理流程

1. **发现问题**
   - 查看仪表板警告
   - 检查质量检查报告
   - 查看集成验证结果

2. **问题诊断**
   ```bash
   # 查看详细日志
   node .kiro/dashboard/cli.js logs
   
   # 运行系统诊断
   node .kiro/config-manager/cli.js diagnose
   ```

3. **问题修复**
   - 使用恢复点系统回滚到稳定状态
   - 使用样式恢复系统修复UI问题
   - 参考恢复指导进行修复

4. **验证修复**
   ```bash
   # 运行集成验证
   node .kiro/integration-tests/run-tests.js
   
   # 检查系统健康状态
   node .kiro/integration-tests/cli.js status
   ```

## 🎯 系统特性

### 🔍 智能监控
- 实时项目健康监控
- 自动问题检测和预警
- 全面的系统集成验证

### 🛡️ 安全保障
- 多层次的恢复机制
- 自动备份和快照
- 操作历史完整审计

### ⚡ 高效工具
- 一键操作工具集
- 自动化工作流程
- 智能配置管理

### 📊 可视化管理
- 直观的仪表板界面
- 详细的状态报告
- 清晰的操作指导

## 🤝 贡献指南

### 新团队成员入门

1. **了解项目结构** - 阅读本README文档
2. **查看开发规范** - [开发规范文档](inspi-ai-platform/.kiro/specs/inspi-ai-platform/DEVELOPMENT_GUIDE.md)
3. **熟悉工具使用** - 按照各系统README文档操作
4. **运行集成测试** - 确保环境配置正确
5. **开始开发任务** - 查看[任务管理文档](MASTER_TASKS.md)

### 开发规范

- 遵循项目代码规范
- 使用项目管理工具进行开发
- 提交前运行完整检查
- 及时更新文档

## 📞 支持与联系

- **项目邮箱**: sundp1980@gmail.com
- **文档问题**: 查看相关系统的README文档
- **技术支持**: 运行系统诊断工具获取详细信息

## 📄 许可证

[MIT License](LICENSE)

---

**最后更新**: 2025年9月5日  
**系统版本**: v1.0.0  
**集成状态**: 🟢 优秀 (100% 通过率)
