# 开发流程规范引擎

开发流程规范引擎是一个用于管理和自动化开发工作流程的系统，包含预提交检查、阶段门控验证和工作流程规则执行等功能。

## 功能特性

### 1. 预提交检查系统
- 自动化测试运行
- 样式一致性检查
- 功能状态验证
- 依赖关系验证
- 代码质量检查

### 2. 开发阶段门控机制
- 开发任务前置条件检查
- 任务依赖关系验证
- 阶段完成标准验证
- 多种验证类型支持（文件存在、命令执行、覆盖率等）

### 3. 工作流程规则引擎
- 基于触发器的规则执行
- 可配置的工作流程规则
- 阻塞和非阻塞规则支持
- 详细的执行报告

## 快速开始

### 安装和初始化

```bash
# 初始化工作流程规范引擎
node .kiro/workflow-rules/cli.js init
```

### 基本使用

```bash
# 运行预提交检查
node .kiro/workflow-rules/cli.js pre-commit

# 验证开发阶段门控
node .kiro/workflow-rules/cli.js stage-gate development

# 查看系统状态
node .kiro/workflow-rules/cli.js status

# 查看配置
node .kiro/workflow-rules/cli.js config --show
```

### 编程接口

```javascript
const WorkflowManager = require('./.kiro/workflow-rules');

async function example() {
  const manager = new WorkflowManager();
  await manager.initialize();
  
  // 运行预提交检查
  const preCommitResult = await manager.runPreCommitChecks();
  console.log('预提交检查结果:', preCommitResult.overall);
  
  // 验证阶段门控
  const gateResult = await manager.validateStageGate('development', {
    feature: 'my-feature'
  });
  console.log('门控验证结果:', gateResult.passed);
  
  // 执行工作流程规则
  const ruleResult = await manager.executeWorkflowRules('pre_commit', {
    files: ['src/app.js']
  });
  console.log('规则执行结果:', ruleResult.overall);
}

example().catch(console.error);
```

## 配置文件

### 预提交检查配置 (`.kiro/workflow-rules/pre-commit-config.json`)

```json
{
  "checks": {
    "runExistingTests": true,
    "checkStyleConsistency": true,
    "validateFeatureStatus": true,
    "verifyDependencies": true,
    "codeQualityCheck": true
  },
  "testCommands": {
    "unit": "npm test -- --run",
    "integration": "npm run test:integration"
  },
  "thresholds": {
    "testCoverage": 80,
    "maxWarnings": 5
  }
}
```

### 阶段门控配置 (`.kiro/workflow-rules/stage-gate-config.json`)

```json
{
  "stages": {
    "development": {
      "name": "开发阶段",
      "prerequisites": ["planning"],
      "gates": [
        {
          "id": "tasks_defined",
          "name": "任务已定义",
          "type": "file_exists",
          "target": ".kiro/specs/*/tasks.md",
          "required": true
        }
      ]
    }
  }
}
```

## 门控类型

### 文件存在检查 (`file_exists`)
检查指定文件或文件模式是否存在。

```json
{
  "type": "file_exists",
  "target": ".kiro/specs/*/requirements.md"
}
```

### 模式匹配检查 (`pattern_exists`)
使用 glob 模式检查文件是否存在。

```json
{
  "type": "pattern_exists",
  "target": "**/*.test.{js,ts}"
}
```

### 命令执行检查 (`command`)
执行命令并检查是否成功。

```json
{
  "type": "command",
  "target": "npm test -- --run"
}
```

### 覆盖率检查 (`coverage`)
检查测试覆盖率是否达到阈值。

```json
{
  "type": "coverage",
  "target": 80
}
```

## 工作流程触发器

### 预提交触发器 (`pre_commit`)
在代码提交前自动触发的检查。

### 任务开始触发器 (`task_start`)
在开始新任务时触发的验证。

### 功能完成触发器 (`feature_complete`)
在功能完成时触发的检查。

### 部署就绪触发器 (`deployment_ready`)
在准备部署时触发的验证。

## 集成示例

### Git Hooks 集成

在 `.git/hooks/pre-commit` 中添加：

```bash
#!/bin/sh
node .kiro/workflow-rules/cli.js pre-commit
exit $?
```

### CI/CD 集成

在 GitHub Actions 中使用：

```yaml
- name: 运行工作流程检查
  run: |
    node .kiro/workflow-rules/cli.js pre-commit
    node .kiro/workflow-rules/cli.js stage-gate testing
```

## 故障排除

### 常见问题

1. **配置文件未找到**
   - 运行 `node .kiro/workflow-rules/cli.js init` 初始化

2. **测试命令失败**
   - 检查 `package.json` 中的测试脚本配置
   - 确保测试依赖已安装

3. **门控验证失败**
   - 检查必需的文件是否存在
   - 验证前置条件是否满足

### 调试模式

使用 `-v` 或 `--verbose` 选项获取详细输出：

```bash
node .kiro/workflow-rules/cli.js pre-commit --verbose
```

## 扩展开发

### 添加自定义门控类型

```javascript
// 在 stage-gate-manager.js 中添加新的验证方法
async validateCustomType(gate, context) {
  // 自定义验证逻辑
  return { passed: true, message: '验证通过' };
}
```

### 添加自定义规则处理器

```javascript
// 在 workflow-rule-engine.js 中添加新的处理器
async customHandler(rule, context) {
  // 自定义规则处理逻辑
  return { passed: true, message: '规则执行成功' };
}
```

## 许可证

MIT License