# 🚀 Inspi.AI 项目快速开始指南

## 📋 概述

本指南将帮助您快速设置和启动 Inspi.AI 项目，包括主应用和完整的项目管理规则增强系统。

> **提示**: 当前仓库未附带 `.kiro` 项目管理规则增强系统的可执行脚本。若不补充该目录，以下涉及 `.kiro` 的步骤将被跳过或不可用，请根据需要联系维护者或使用手动流程。

## 🔧 环境要求

- Node.js 18+
- MongoDB (主应用数据库)
- Redis (可选，用于缓存)
- Git

## ⚡ 快速启动 (5分钟)

### 1. 克隆和安装

```bash
# 克隆项目
git clone <repository-url>
cd inspi

# 安装主应用依赖
cd inspi-ai-platform
npm install
cd ..
```

### 2. 配置环境

```bash
# 复制环境配置文件
cd inspi-ai-platform
cp .env.example .env.local

# 编辑配置文件 (填入必要的配置)
# 最少需要配置: MONGODB_URI, NEXTAUTH_SECRET, GEMINI_API_KEY
```

### 3. 验证系统集成

```bash
# 返回项目根目录
cd ..

# 运行系统集成验证
node .kiro/integration-tests/run-tests.js
```

如果看到 "🎉 集成测试完成！系统集成状态良好。" 说明系统配置正确。

### 4. 启动服务

```bash
# 启动主应用 (终端1)
cd inspi-ai-platform
npm run dev

# 启动项目监控仪表板 (终端2)
cd ..
node .kiro/dashboard/cli.js start
```

### 5. 访问应用

- **主应用**: http://localhost:3000
- **项目仪表板**: http://localhost:3001

## 🛠️ 开发工作流

### 日常开发命令

```bash
# 检查项目健康状态
node .kiro/integration-tests/cli.js status

# 运行质量检查
node .kiro/quality-checks/cli.js check

# 创建项目快照 (重要变更前)
node .kiro/recovery-points/cli.js create

# 创建样式快照 (UI变更前)
node .kiro/style-recovery/cli.js snapshot

# 检测视觉回归
node .kiro/style-recovery/cli.js detect
```

### 提交前检查

```bash
# 运行完整检查流程
./scripts/pre-commit-check.sh

# 或者手动运行各项检查
node .kiro/quality-checks/cli.js full-check
node .kiro/style-recovery/cli.js detect
node .kiro/integration-tests/run-tests.js
```

## 🎯 核心功能验证

### 1. 主应用功能

```bash
cd inspi-ai-platform

# 运行应用测试
npm test

# 检查API健康状态
curl http://localhost:3000/api/health
```

### 2. 项目管理系统功能

```bash
# 质量检查系统
node .kiro/quality-checks/cli.js check

# 样式恢复系统
node .kiro/style-recovery/cli.js status

# 恢复点系统
node .kiro/recovery-points/cli.js list

# 配置管理系统
node .kiro/config-manager/cli.js status

# 集成验证工具
node .kiro/integration-tests/cli.js status
```

## 🔍 故障排除

### 常见问题

#### 1. 集成测试失败
```bash
# 检查详细错误信息
node .kiro/integration-tests/cli.js status

# 查看系统日志
node .kiro/dashboard/cli.js logs
```

#### 2. 主应用启动失败
```bash
# 检查环境配置
cd inspi-ai-platform
npm run build

# 检查数据库连接
node -e "console.log(process.env.MONGODB_URI)"
```

#### 3. 项目管理工具异常
```bash
# 运行系统诊断
node .kiro/config-manager/cli.js diagnose

# 重置配置
node .kiro/config-manager/cli.js reset
```

### 获取帮助

```bash
# 查看各系统帮助信息
node .kiro/quality-checks/cli.js help
node .kiro/style-recovery/cli.js help
node .kiro/recovery-points/cli.js help
node .kiro/dashboard/cli.js help
node .kiro/config-manager/cli.js help
node .kiro/integration-tests/cli.js help
```

## 📚 下一步

### 新开发者
1. 阅读 [主项目README](README.md) 了解完整项目结构
2. 查看 [开发指南](docs/DEVELOPMENT_GUIDE.md) 了解开发规范
3. 了解 [系统架构](docs/ARCHITECTURE.md) 掌握技术架构
4. 选择 [开发任务](MASTER_TASKS.md) 开始贡献

### 项目管理者
1. 查看 [集成验证总结](.kiro/integration-tests/INTEGRATION_SUMMARY.md)
2. 了解各系统的详细文档 (在各系统的README.md中)
3. 设置定期的系统健康检查

### 运维人员
1. 了解 [部署指南](docs/DEPLOYMENT_GUIDE.md)
2. 设置监控和告警
3. 熟悉恢复和回滚流程

## 🎉 成功标志

当您看到以下状态时，说明系统已成功启动：

- ✅ 集成测试: 100% 通过
- ✅ 主应用: http://localhost:3000 可访问
- ✅ 项目仪表板: http://localhost:3001 可访问
- ✅ 所有管理工具: 响应正常
- ✅ 系统健康状态: 🟢 优秀

## 📞 支持

- **技术问题**: 查看相关系统的README文档
- **环境问题**: 运行系统诊断工具
- **联系邮箱**: sundp1980@gmail.com

---

**祝您开发愉快！** 🚀
