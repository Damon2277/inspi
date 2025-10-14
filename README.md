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

## 📚 文档导航

### 主要文档
- **[主应用README](inspi-ai-platform/README.md)** - Inspi.AI平台详细介绍
- **[系统架构文档](docs/ARCHITECTURE.md)** - 完整的系统架构设计
- **[开发指南](docs/DEVELOPMENT_GUIDE.md)** - 开发规范和最佳实践
- **[部署指南](docs/DEPLOYMENT_GUIDE.md)** - 部署和运维指南
- **[任务管理](MASTER_TASKS.md)** - 主任务管理文档
- **[变更日志](CHANGELOG.md)** - 项目变更历史


### 发布文档
- **[发布说明](docs/releases/)** - 版本发布说明
- **[发布模板](docs/releases/template.md)** - 发布文档模板


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
