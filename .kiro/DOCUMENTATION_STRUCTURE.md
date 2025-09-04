# .kiro 目录文档结构说明

## 📋 目录概览

`.kiro` 目录包含项目的配置、规范、工具和历史记录，是项目管理和开发流程的核心支撑。

## 📂 目录结构

### 🎯 规范文档 (specs/)
```
.kiro/specs/
├── inspi-ai-platform/          # 主项目规范
│   ├── project-design.md       # 架构设计文档
│   ├── project-requirements.md # 需求文档
│   └── project-tasks.md        # 任务文档 → 重定向到 MASTER_TASKS.md
├── pc-ui-enhancement/          # PC端UI增强规范
│   ├── design.md              # PC端设计文档
│   ├── requirements.md        # PC端需求文档
│   └── tasks.md               # 任务文档 → 重定向到 MASTER_TASKS.md
└── project-management-rules-enhancement/  # 项目管理规则增强
    ├── design.md              # 项目管理系统设计
    ├── requirements.md        # 项目管理需求
    └── tasks.md               # 任务文档 → 重定向到 MASTER_TASKS.md
```

### 🛠️ 工具系统 (功能性目录)
```
.kiro/project-state/            # 项目状态管理系统
├── cli.ts                     # 命令行工具
├── state-manager.ts           # 状态管理器
├── project-state.json         # 项目状态数据
└── ...                        # 其他工具文件

.kiro/version-control/          # 版本控制工具
├── comprehensive-version-manager.ts
├── simple-version-manager.js
└── ...

.kiro/design-system/           # UI设计系统
├── design-system.css          # 设计系统样式
├── design-system-demo.html    # 演示页面
└── implement-design-system.js # 实施工具

.kiro/style-recovery/          # 样式恢复工具
└── style-recovery-tool.js
```

### 📊 数据和历史 (snapshots/)
```
.kiro/snapshots/               # 项目快照系统
├── files/                     # 文件快照存储
├── metadata/                  # 快照元数据
└── snapshot_*.json           # 快照索引文件

.kiro/version-history.json     # 版本历史记录
.kiro/version-config.json      # 版本控制配置
```

## 🎯 文档整合状态

### ✅ 已整合到主任务文档
所有任务相关文档已重定向到根目录的 `MASTER_TASKS.md`：

1. **inspi-ai-platform/project-tasks.md** → `MASTER_TASKS.md`
2. **pc-ui-enhancement/tasks.md** → `MASTER_TASKS.md`  
3. **project-management-rules-enhancement/tasks.md** → `MASTER_TASKS.md`

### 📚 保留的规范文档
以下文档包含重要的设计和需求信息，继续保留：

- **设计文档**: 包含架构设计、技术选型、组件设计等
- **需求文档**: 包含用户故事、验收标准、功能需求等

### 🔧 活跃的工具系统
以下目录包含正在使用的工具和系统，继续保留：

- **project-state/**: 项目状态管理和CLI工具
- **version-control/**: 版本管理工具
- **design-system/**: UI设计系统实现
- **style-recovery/**: 样式恢复工具

## 📋 使用指南

### 查看项目任务
```bash
# 查看所有任务
cat MASTER_TASKS.md

# 查看项目状态
node .kiro/project-state/cli.ts status
```

### 查看设计规范
```bash
# 主项目设计
cat .kiro/specs/inspi-ai-platform/project-design.md

# PC端设计规范
cat .kiro/specs/pc-ui-enhancement/design.md
```

### 使用工具系统
```bash
# 项目状态管理
node .kiro/project-state/cli.ts

# 版本控制
node .kiro/version-control/version-cli.js

# 样式恢复
node .kiro/style-recovery/style-recovery-tool.js
```

## 🧹 维护说明

### 定期清理
- **快照文件**: 定期清理 `.kiro/snapshots/` 中的旧快照
- **版本历史**: 压缩 `.kiro/version-history.json` 中的历史记录

### 文档同步
- 任务变更时更新 `MASTER_TASKS.md`
- 设计变更时更新对应的 `design.md`
- 需求变更时更新对应的 `requirements.md`

---

**最后更新**: 2024年1月  
**维护人**: 项目团队