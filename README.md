# Inspi.AI 教学创作平台

## 项目概述

该仓库托管 Inspi.AI 教学创作平台的源代码与文档。项目现已聚焦于主应用本身，历史的 `.kiro` 管理工具、快照与脚本均已清理，仓库结构更轻量、便于维护。

### 🏗️ 目录结构

```
inspi/
├── inspi-ai-platform/          # 主应用
│   ├── src/                    # 前后端源码
│   ├── public/                 # 静态资源与图标
│   ├── docs/                   # 应用内文档
│   └── package.json            # NPM 依赖与脚本
├── docs/                       # 额外设计与运维文档
├── README.md                   # 根级说明（本文件）
└── ...
```

## 🚀 快速开始

### 1. 环境准备

```bash
cd inspi-ai-platform
npm install

cp .env.example .env.local
# 根据需要配置 GEMINI_API_KEY、USE_MOCK_GEMINI 等环境变量
```

### 2. 本地开发

```bash
npm run dev    # 默认监听 http://localhost:3007
```

主要入口：
- **创作页**：使用“AI教学魔法师”生成可视化教学卡片
- **广场页**：浏览主题卡片，进入详情可直接复用

### 3. 常用校验

```bash
npm run lint        # ESLint 检查（仍存在部分历史 warning）
npm run type-check  # TypeScript 类型检查
```

> 提示：原 `.kiro` 目录已删除，如需质量治理脚本、请参考 `docs/quality-improvement-plan.md` 自定义方案。

## 📚 文档导航

- **[主应用 README](inspi-ai-platform/README.md)**：运行、部署、环境变量说明
- **docs/ARCHITECTURE.md**：系统架构设计与模块拆分
- **docs/quality-improvement-plan.md**：Lint 警告治理与代码健康计划
- **docs/card-experience-roadmap.md**：教学卡片体验迭代路线

## 🔄 提交流程

1. 针对改动运行 `npm run lint` / `npm run type-check`
2. 如有必要，补充或更新相关文档与测试
3. 使用 `git add` 提交变更，遵循约定式提交信息（如 `feat: ...`、`fix: ...`、`chore: ...`）

## 📞 支持与联系

- 维护者邮箱：`sundp1980@gmail.com`
- 如果在协作平台或 Issue 中提问，请附上复现步骤与期望结果

## 📄 许可证

[MIT License](LICENSE)
