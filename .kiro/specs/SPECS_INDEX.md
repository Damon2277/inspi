# Kiro Specs 目录总览

## 📁 目录结构

### [inspi-ai-platform/](inspi-ai-platform/)
- **职责**: 具体项目执行规划
- **价值**: inspi-ai-platform项目任务的单一真实来源
- **文件**: 
  - `project-requirements.md` - 项目需求分析
  - `project-design.md` - 项目架构设计
  - `project-tasks.md` - 项目任务列表和状态跟踪

### [project-management-rules-enhancement/](project-management-rules-enhancement/)
- **职责**: 规则体系设计规划
- **价值**: 通用项目管理方法论制定
- **文件**: 
  - `rules-requirements.md` - 规则体系需求分析
  - `rules-design.md` - 规则体系架构设计
  - `rules-tasks.md` - 规则体系实施任务

## 🎯 职责分工

### 项目执行 vs 规则设计
```
inspi-ai-platform/          project-management-rules-enhancement/
├── 具体项目任务              ├── 通用规则设计
├── 实时状态跟踪              ├── 方法论制定  
├── 项目特定内容              ├── 架构规划
└── 执行导向                 └── 设计导向
```

### 命名规范
- **项目文件**: `project-*` 前缀 (如 `project-tasks.md`)
- **规则文件**: `rules-*` 前缀 (如 `rules-requirements.md`)
- **索引文件**: 使用具体名称避免重复 (如 `SPECS_INDEX.md`)

## 🔗 与实用工具的关系
```
.kiro/specs/                    inspi-ai-platform/docs/
├── 规划和设计                   ├── 实用工具和文档
├── 需求和任务                   ├── 可直接使用
├── 架构和方案                   ├── 面向未来项目
└── 设计导向                    └── 工具导向
```

---
**目标**: 清晰的职责分工，无命名冲突，面向未来项目可扩展