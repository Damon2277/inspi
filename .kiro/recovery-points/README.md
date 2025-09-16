# 项目状态恢复和智能指导系统

## 概述

本系统是一个专门设计的项目状态恢复和智能指导系统，与现有的版本管理系统互补，专注于：

- **项目状态快照管理**：创建和管理项目配置、功能状态的快照（非Git版本）
- **智能恢复指导**：基于问题描述提供智能化的恢复建议和逐步指导
- **选择性状态恢复**：允许选择性地恢复项目的特定部分
- **恢复操作验证**：提供恢复前、中、后的验证和监控机制

## 与版本管理系统的区别

| 功能 | 版本管理系统 | 项目状态恢复系统 |
|------|-------------|-----------------|
| 主要关注 | Git版本控制、语义化版本、发布流程 | 项目状态快照、智能恢复指导 |
| 数据存储 | Git仓库、标签 | JSON快照文件 |
| 恢复粒度 | 整个代码库版本 | 选择性功能/配置恢复 |
| 智能程度 | 自动化流程 | AI驱动的问题分析和恢复建议 |
| 使用场景 | 版本发布、代码回滚 | 问题诊断、状态恢复、故障排除 |

## 系统架构

```
项目状态恢复系统
├── 状态快照管理器 (StateSnapshotManager)
│   ├── 快照创建和存储
│   ├── 快照完整性验证
│   └── 快照清理和维护
├── 智能恢复指导 (SmartRecoveryGuide)
│   ├── 问题分类和分析
│   ├── 恢复建议生成
│   └── 逐步指导创建
├── 选择性状态恢复 (SelectiveStateRecovery)
│   ├── 可恢复状态识别
│   ├── 恢复影响预览
│   └── 选择性恢复执行
├── 恢复决策树 (RecoveryDecisionTree)
│   ├── 智能决策路径分析
│   ├── 上下文感知的策略选择
│   └── 置信度评估
└── 恢复验证器 (RecoveryValidator)
    ├── 恢复前验证
    ├── 恢复过程监控
    └── 恢复后验证
```

## 核心功能

### 1. 状态快照管理

- **自动快照创建**：在关键操作前自动创建项目状态快照
- **手动快照创建**：支持用户手动创建带标记的快照
- **快照完整性验证**：使用哈希值验证快照文件完整性
- **智能清理**：自动清理过期快照，保持存储空间合理

### 2. 智能恢复指导

- **问题智能分类**：自动识别样式、功能、配置等问题类型
- **严重程度评估**：评估问题的严重程度和影响范围
- **恢复建议生成**：基于问题类型和上下文生成恢复建议
- **逐步指导创建**：提供详细的恢复操作步骤

### 3. 选择性状态恢复

- **可恢复状态识别**：分析快照中可恢复的状态类型
- **恢复影响预览**：预览恢复操作的影响范围和风险
- **选择性恢复执行**：只恢复选定的状态，不影响其他功能
- **恢复记录管理**：记录所有恢复操作的详细信息

### 4. 恢复决策树

- **智能路径分析**：基于决策树选择最优恢复路径
- **上下文感知**：考虑时间约束、风险容忍度等因素
- **策略推荐**：推荐最适合的恢复策略
- **置信度评估**：评估恢复成功的置信度

### 5. 恢复验证机制

- **恢复前验证**：检查系统状态、资源可用性、前置条件
- **恢复过程监控**：实时监控恢复过程，记录进度和问题
- **恢复后验证**：验证问题解决、系统稳定性、功能完整性
- **验证报告生成**：生成详细的验证报告和建议

## 使用方法

### CLI 命令行界面

```bash
# 创建项目状态快照
node .kiro/recovery-points/cli.js snapshot "功能开发完成前的备份"

# 列出所有快照
node .kiro/recovery-points/cli.js list

# 执行项目健康诊断
node .kiro/recovery-points/cli.js diagnose

# 恢复选定的状态
node .kiro/recovery-points/cli.js recover state-1234567890 project_config feature_auth

# 获取恢复指导
node .kiro/recovery-points/cli.js guide "样式显示异常"

# 预览恢复影响
node .kiro/recovery-points/cli.js preview state-1234567890 project_config
```

### 编程接口

```javascript
const ProjectStateRecoverySystem = require('.kiro/recovery-points');

const system = new ProjectStateRecoverySystem();

// 创建状态快照
const snapshot = await system.createStateSnapshot({
  reason: '重要功能开发前备份',
  type: 'manual'
});

// 获取恢复建议
const recommendations = await system.getRecoveryRecommendations('API接口异常');

// 执行完整恢复流程
const result = await system.executeRecoveryWithValidation('样式丢失', {
  timeConstraint: 'urgent',
  riskTolerance: 'medium'
});
```

## 状态类型

系统支持以下状态类型的恢复：

- **project_config**: 项目配置 (package.json, 环境配置等)
- **feature_auth**: 认证功能相关文件
- **feature_ai**: AI功能相关文件
- **feature_ui**: UI功能相关文件
- **feature_cache**: 缓存功能相关文件
- **config_version**: 版本配置文件
- **config_quality-checks**: 质量检查配置文件

## 问题类型识别

系统能够智能识别以下问题类型：

- **style_issue**: 样式和UI相关问题
- **functionality_issue**: 功能和API相关问题
- **configuration_issue**: 配置和环境相关问题
- **dependency_issue**: 依赖和模块相关问题
- **data_issue**: 数据和存储相关问题
- **performance_issue**: 性能相关问题
- **build_issue**: 构建和编译相关问题

## 恢复策略

基于问题类型和上下文，系统提供以下恢复策略：

- **immediate_snapshot_recovery**: 立即从快照恢复（关键问题）
- **style_snapshot_recovery**: 样式快照恢复
- **selective_function_recovery**: 选择性功能恢复
- **config_recovery**: 配置文件恢复
- **emergency_manual_recovery**: 紧急手动恢复
- **comprehensive_diagnosis**: 综合诊断和恢复

## 验证机制

### 恢复前验证
- 系统状态检查
- 恢复计划完整性验证
- 资源可用性检查
- 前置条件验证
- 风险评估

### 恢复过程监控
- 实时步骤监控
- 进度跟踪
- 错误检测
- 性能监控

### 恢复后验证
- 问题解决验证
- 系统稳定性检查
- 功能完整性验证
- 性能影响评估
- 副作用检查

## 文件结构

```
.kiro/recovery-points/
├── index.js                      # 主系统入口
├── state-snapshot-manager.js     # 状态快照管理器
├── smart-recovery-guide.js       # 智能恢复指导
├── selective-state-recovery.js   # 选择性状态恢复
├── recovery-decision-tree.js     # 恢复决策树
├── recovery-validator.js         # 恢复验证器
├── cli.js                        # 命令行界面
├── test-selective-recovery.js    # 选择性恢复测试
├── test-recovery-guidance.js     # 恢复指导测试
├── README.md                     # 说明文档
├── snapshots/                    # 快照存储目录
│   ├── state-*.json             # 状态快照文件
│   └── snapshots-metadata.json  # 快照元数据
├── recovery-records/             # 恢复记录目录
│   └── recovery-*.json          # 恢复操作记录
└── validation-reports/           # 验证报告目录
    └── validation-report-*.json # 验证报告文件
```

## 测试

运行测试以验证系统功能：

```bash
# 测试选择性恢复机制
node .kiro/recovery-points/test-selective-recovery.js

# 测试恢复指导系统
node .kiro/recovery-points/test-recovery-guidance.js
```

## 最佳实践

1. **定期创建快照**：在重要操作前创建状态快照
2. **详细描述问题**：提供详细的问题描述以获得更准确的建议
3. **预览恢复影响**：在执行恢复前预览影响范围
4. **监控恢复过程**：关注恢复过程中的警告和错误
5. **验证恢复结果**：恢复后进行全面的功能测试
6. **记录经验教训**：记录恢复过程中的经验和改进建议

## 与现有系统集成

本系统设计为与现有版本管理系统协同工作：

- **互补功能**：版本管理处理代码版本，状态恢复处理配置和功能状态
- **数据隔离**：使用独立的存储机制，不干扰Git工作流
- **统一接口**：提供一致的CLI和编程接口
- **协同工作**：可以与Git操作结合使用，提供更全面的恢复方案

## 注意事项

1. **存储空间**：快照文件会占用存储空间，系统会自动清理旧快照
2. **权限要求**：需要读写项目文件的权限
3. **网络依赖**：某些验证功能可能需要网络连接
4. **兼容性**：设计为与现有工具链兼容，不会干扰正常开发流程

## 故障排除

如果遇到问题，请检查：

1. **权限问题**：确保有足够的文件系统权限
2. **存储空间**：确保有足够的磁盘空间存储快照
3. **文件完整性**：使用系统的完整性检查功能
4. **日志信息**：查看详细的错误日志和建议

## 贡献

欢迎提交问题报告和改进建议。系统设计为可扩展的，可以轻松添加新的恢复策略和验证规则。